import { createUserConfig, mew, mer, useWorkerFactory } from "langium-website-core/bundle";
import React, { createRef } from "react";
import { createRoot } from "react-dom/client";
import { Diagnostic, DocumentChangeResponse } from "langium-ast-helper";
import { ColorArgs, Command, MoveArgs, examples, syntaxHighlighting } from "./minilogo-tools";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";

useWorkerFactory({
  ignoreMapping: true,
  workerLoaders: {
      editorWorkerService: () => new Worker(new URL('../../libs/workers/editorWorker-es.js', window.location.href).href, { type: 'module' })
  }
});

let shouldAnimate = true;

interface PreviewProps {
  commands?: Command[];
  diagnostics?: Diagnostic[];
}

interface DrawCanvasProps {
  commands: Command[];
}

let userConfig: mew.UserConfig;

class DrawCanvas extends React.Component<DrawCanvasProps, DrawCanvasProps> {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  posX: number;
  posY: number;
  scale: number;
  drawing: boolean;
  interval: NodeJS.Timer;

  constructor(props: DrawCanvasProps) {
    super(props);
    this.state = {
      commands: props.commands,
    };
    this.canvasRef = createRef();
    this.posX = 0;
    this.posY = 0;
    this.scale = 1.8;
    this.drawing = false;
  }

  componentDidMount() {
    this.draw(!shouldAnimate);
  }

  componentDidUpdate() {
    this.draw(!shouldAnimate);
  }

  init(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.stopDrawing();
    ctx.canvas.width = screen.availWidth;
    ctx.canvas.height = screen.availHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = '#333';
    for (let x = 0; x <= canvas.width; x += canvas.width / 20) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y <= canvas.height; y += canvas.height / 20) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
    ctx.scale(this.scale, this.scale);

    // reset 
    ctx.strokeStyle = 'white';
    this.posX = 0;
    this.posY = 0;
    this.scale = 1.8;
    this.drawing = false;
  }

  draw(instant: boolean) {
    const commands = this.props.commands;
    const canvas = this.canvasRef.current;
    if (canvas && commands.length > 0) {
      const ctx = canvas.getContext('2d')!;
      this.init(canvas, ctx);
      if (instant) {
        while (commands.length > 0) {
          this.dispatchCommand(commands.shift()!, ctx);
        }
        return;
      }
      this.interval = setInterval(() => {
        if (commands.length > 0) {
          this.dispatchCommand(commands.shift()!, ctx);
        } else {
          // finish existing draw
          if (this.drawing) {
            ctx.stroke();
          }
          shouldAnimate = false;
          this.stopDrawing();
        }
      }, 1);
    }
  }

  stopDrawing() {
    this.drawing = false;
    this.posX = 0;
    this.posY = 0;
    clearInterval(this.interval);
  }

  dispatchCommand(command: Command, context: CanvasRenderingContext2D) {
    switch (command.name) {
      case 'penUp':
        this.drawing = false;
        context.stroke();
        break;
      case 'penDown':
        this.drawing = true;
        context.beginPath();
        context.moveTo(this.posX, this.posY);
        break;
      case 'move':
        let args = command.args as MoveArgs;
        this.posX += args.x;
        this.posY += args.y;
        if (!this.drawing) {
          // move, no draw
          context.moveTo(this.posX, this.posY);
        } else {
          // move & draw
          context.lineTo(this.posX, this.posY);
        }

        break;
      case 'color':
        let color = command.args as ColorArgs;
        if (color.color) {
          // literal color or hex
          context.strokeStyle = color.color;
        } else {
          context.strokeStyle = `rgb(${color.r},${color.g},${color.b})`;
        }
        break;
    }
  }

  render() {
    return <canvas ref={this.canvasRef} className="w-full h-full" />;
  }
}
class Preview extends React.Component<PreviewProps, PreviewProps> {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  constructor(props: PreviewProps) {
    super(props);
    this.state = {
      commands: props.commands,
      diagnostics: props.diagnostics,
    };
    this.canvasRef = createRef();
    this.startPreview = this.startPreview.bind(this);
  }

  startPreview(commands: Command[], diagnostics: Diagnostic[]) {
    this.setState({ commands, diagnostics });
  }

  render() {
    // check if code contains an astNode
    if (!this.state.commands) {
      // Show the exception
      return (
        <div className="flex flex-col h-full w-full p-4 justify-start items-center my-10">
          <div className="text-white border-2 border-solid border-accentRed rounded-md p-4 text-center text-sm cursor-default">
            No Ast found
          </div>
        </div>
      );
    }

    // if the code doesn't contain any errors and the diagnostics aren't warnings
    if (this.state.diagnostics == null || this.state.diagnostics.filter((i) => i.severity === 1).length == 0 && this.state.commands.length > 0) {
      return (
        <DrawCanvas commands={this.state.commands} />
      );
    }

    // Show the exception
    return (
      <div className="flex flex-col h-full w-full p-4 justify-start items-center my-10" >
        <div className="text-white border-2 border-solid border-accentRed rounded-md p-4 text-left text-sm cursor-default">
          {this.state.diagnostics.filter((i) => i.severity === 1).map((diagnostic, index) =>
            <details key={index}>
              <summary>{`Line ${diagnostic.range.start.line}-${diagnostic.range.end.line}: ${diagnostic.message}`}</summary>
              <p>Source: {diagnostic.source} | Code: {diagnostic.code}</p>
            </details>
          )}
        </div>
      </div>
    );
  }
}


interface AppState {
  currentExample: number;
}
class App extends React.Component<{}, AppState> {
  monacoEditor: React.RefObject<mer.MonacoEditorReactComp>;
  preview: React.RefObject<Preview>;
  copyHint: React.RefObject<HTMLDivElement>;
  shareButton: React.RefObject<HTMLImageElement>;
  constructor(props) {
    super(props);

    // bind 'this' ref for callbacks to maintain parent context
    this.onMonacoLoad = this.onMonacoLoad.bind(this);
    this.onDocumentChange = this.onDocumentChange.bind(this);
    this.copyLink = this.copyLink.bind(this);
    this.monacoEditor = React.createRef();
    this.preview = React.createRef();
    this.copyHint = React.createRef();
    this.shareButton = React.createRef();

    this.state = {
      currentExample: 0,
    };
  }

  /**
   * Callback that is invoked when Monaco is finished loading up.
   * Can be used to safely register notification listeners, retrieve data, and the like
   *
   * @throws Error on inability to ref the Monaco component or to get the language client
   */
  onMonacoLoad() {
    // verify we can get a ref to the editor
    if (!this.monacoEditor.current) {
      throw new Error("Unable to get a reference to the Monaco Editor");
    }

    // verify we can get a ref to the language client
    const lc = this.monacoEditor.current
      ?.getEditorWrapper()
      ?.getLanguageClient();
    if (!lc) {
      throw new Error("Could not get handle to Language Client on mount");
    }
    this.monacoEditor.current.getEditorWrapper()?.getEditor()?.focus();
    // register to receive DocumentChange notifications
    lc.onNotification("browser/DocumentChange", this.onDocumentChange);
  }

  /**
   * Callback invoked when the document processed by the LS changes
   * Invoked on startup as well
   * @param resp Response data
   */
  onDocumentChange(resp: DocumentChangeResponse) {
    // decode the received Asts
    let result = JSON.parse(resp.content)
    let commands = result.$commands as Command[];
    this.preview.current?.startPreview(commands, resp.diagnostics);
  }

  setExample(example: number) {
    this.setState({ currentExample: example });
    this.monacoEditor.current?.getEditorWrapper()?.getEditor()?.setValue(examples[example].code);
    shouldAnimate = true;
  }

  async copyLink() {
    const code = this.monacoEditor.current?.getEditorWrapper()?.getEditor()?.getValue()!;
    const url = new URL("/showcase/minilogo", window.origin);
    url.searchParams.append("code", compressToEncodedURIComponent(code));

    this.copyHint.current!.style.display = "block";
    this.shareButton.current!.src = '/assets/checkmark.svg';
    setTimeout(() => {
      this.shareButton.current!.src = '/assets/share.svg';
      this.copyHint.current!.style.display = 'none';
    }, 1000);

    navigator.clipboard.writeText(window.location.href);

    await navigator.clipboard.writeText(url.toString());
  }

  componentDidMount() {
    this.shareButton.current!.addEventListener('click', this.copyLink);
  }

  render() {
    const style = {
      height: "100%",
      width: "100%",
    };

    return (
      <div className="justify-center self-center flex flex-col md:flex-row h-full w-full">
        <div className="float-left w-full h-full flex flex-col">
          <div className="border-solid border border-emeraldLangium bg-emeraldLangiumDarker flex items-center p-3 text-white font-mono ">
            <span>Editor</span>
            <select className="ml-4 bg-emeraldLangiumDarker cursor-pointer border-0 border-b invalid:bg-emeraldLangiumABitDarker" onChange={(e) => this.setExample(parseInt(e.target.value))}>
              {examples.map((example, index) => (
                <option key={index} value={index}>{example.name}</option>
              ))}
            </select>
            <div className="flex flex-row justify-end w-full h-full gap-2">
              <div className="text-sm hidden" ref={this.copyHint}>Link was copied!</div>
              <img src="/assets/share.svg" title="Copy URL to this grammar and content" className="inline w-4 h-4 cursor-pointer" ref={this.shareButton}></img>
            </div>
          </div>
          <div className="wrapper relative bg-white dark:bg-gray-900 border border-emeraldLangium h-full w-full">
            <mer.MonacoEditorReactComp
              ref={this.monacoEditor}
              onLoad={this.onMonacoLoad}
              userConfig={userConfig}
              style={style}
            />
          </div>
        </div>
        <div className="float-left w-full h-full flex flex-col" id="preview">
          <div className="border-solid border border-emeraldLangium bg-emeraldLangiumDarker flex items-center p-3 text-white font-mono ">
            <span>Preview</span>
          </div>
          <div className="border border-emeraldLangium h-full w-full">
            <Preview ref={this.preview} />
          </div>
        </div>
      </div>
    );
  }
}

export async function share(code: string): Promise<void> {
  const url = new URL("/showcase/minilogo", window.origin);
  url.searchParams.append("code", compressToEncodedURIComponent(code));
  await navigator.clipboard.writeText(url.toString());
}

// setup config & render
const url = new URL(window.location.toString());
let code = url.searchParams.get("code");
userConfig = createUserConfig({
  languageId: 'minilogo',
  code: code ? decompressFromEncodedURIComponent(code) : examples[0].code,
  worker: '../../showcase/libs/worker/minilogoServerWorker.js',
  monarchGrammar: syntaxHighlighting
});
const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<App />);
