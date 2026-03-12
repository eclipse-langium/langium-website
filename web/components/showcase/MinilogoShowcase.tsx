'use client';

import React, { useEffect, createRef } from 'react';
import { createUserConfig } from 'langium-website-core';
import { ColorArgs, Command, MoveArgs, examples, syntaxHighlighting } from './minilogo-tools';
import { type Diagnostic, type DocumentChangeResponse } from 'langium-ast-helper';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { UserConfig } from 'monaco-languageclient';
import Image from 'next/image';

const MonacoEditorReactComp = React.lazy(async () => {
  const { MonacoEditorReactComp } = await import('monaco-languageclient/react');
  return { default: MonacoEditorReactComp };
});

let shouldAnimate = true;

interface DrawCanvasProps { commands: Command[]; }

class DrawCanvas extends React.Component<DrawCanvasProps, DrawCanvasProps> {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  posX = 0;
  posY = 0;
  scale = 1.8;
  drawing = false;
  interval: ReturnType<typeof setInterval> | undefined;

  constructor(props: DrawCanvasProps) {
    super(props);
    this.state = { commands: props.commands };
    this.canvasRef = createRef();
  }

  componentDidMount() { this.draw(!shouldAnimate); }
  componentDidUpdate() { this.draw(!shouldAnimate); }

  init(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.stopDrawing();
    ctx.canvas.width = screen.availWidth;
    ctx.canvas.height = screen.availHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = '#333';
    for (let x = 0; x <= canvas.width; x += canvas.width / 20) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
    for (let y = 0; y <= canvas.height; y += canvas.height / 20) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
    ctx.stroke();
    ctx.scale(this.scale, this.scale);
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
        while (commands.length > 0) { this.dispatchCommand(commands.shift()!, ctx); }
        return;
      }
      this.interval = setInterval(() => {
        if (commands.length > 0) {
          this.dispatchCommand(commands.shift()!, ctx);
        } else {
          if (this.drawing) ctx.stroke();
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
      case 'move': {
        const args = command.args as MoveArgs;
        this.posX += args.x;
        this.posY += args.y;
        if (!this.drawing) context.moveTo(this.posX, this.posY);
        else context.lineTo(this.posX, this.posY);
        break;
      }
      case 'color': {
        const color = command.args as ColorArgs;
        if (color.color) context.strokeStyle = color.color;
        else context.strokeStyle = `rgb(${color.r},${color.g},${color.b})`;
        break;
      }
    }
  }

  render() { return <canvas ref={this.canvasRef} className="w-full h-full" />; }
}

interface PreviewProps { commands?: Command[]; diagnostics?: Diagnostic[]; }

class Preview extends React.Component<PreviewProps, PreviewProps> {
  constructor(props: PreviewProps) {
    super(props);
    this.state = { commands: props.commands, diagnostics: props.diagnostics };
    this.startPreview = this.startPreview.bind(this);
  }
  startPreview(commands: Command[], diagnostics: Diagnostic[]) { this.setState({ commands, diagnostics }); }
  render() {
    if (!this.state.commands) return (
      <div className="flex flex-col h-full w-full p-4 justify-start items-center my-10">
        <div className="text-white border-2 border-accent-red rounded-md p-4 text-center text-sm cursor-default">No AST found</div>
      </div>
    );
    if (this.state.diagnostics == null || (this.state.diagnostics.filter((i) => i.severity === 1).length === 0 && this.state.commands.length > 0)) {
      return <DrawCanvas commands={this.state.commands} />;
    }
    return (
      <div className="flex flex-col h-full w-full p-4 justify-start items-center my-10">
        <div className="text-white border-2 border-accent-red rounded-md p-4 text-left text-sm cursor-default">
          {this.state.diagnostics.filter((i) => i.severity === 1).map((d, i) =>
            <details key={i}><summary>{`Line ${d.range.start.line}-${d.range.end.line}: ${d.message}`}</summary><p>Source: {d.source} | Code: {d.code}</p></details>
          )}
        </div>
      </div>
    );
  }
}

interface AppState { currentExample: number; }

class MinilogoApp extends React.Component<{ langiumConfig: UserConfig }, AppState> {
  monacoEditor = React.createRef<InstanceType<typeof MonacoEditorReactComp>>();
  preview = React.createRef<Preview>();
  copyHint = React.createRef<HTMLDivElement>();
  shareButton = React.createRef<HTMLImageElement>();

  constructor(props: { langiumConfig: UserConfig }) {
    super(props);
    this.onMonacoLoad = this.onMonacoLoad.bind(this);
    this.onDocumentChange = this.onDocumentChange.bind(this);
    this.copyLink = this.copyLink.bind(this);
    this.state = { currentExample: 0 };
  }

  onMonacoLoad() {
    const lc = (this.monacoEditor.current as any)?.getEditorWrapper?.()?.getLanguageClient?.();
    if (!lc) return;
    lc.onNotification('browser/DocumentChange', this.onDocumentChange);
  }

  onDocumentChange(resp: DocumentChangeResponse) {
    const result = JSON.parse(resp.content);
    const commands = result.$commands as Command[];
    this.preview.current?.startPreview(commands, resp.diagnostics);
  }

  setExample(example: number) {
    this.setState({ currentExample: example });
    (this.monacoEditor.current as any)?.getEditorWrapper?.()?.getEditor?.()?.setValue(examples[example].code);
    shouldAnimate = true;
  }

  async copyLink() {
    const code = (this.monacoEditor.current as any)?.getEditorWrapper?.()?.getEditor?.()?.getValue() ?? '';
    const url = new URL('/showcase/minilogo', window.origin);
    url.searchParams.append('code', compressToEncodedURIComponent(code));
    if (this.copyHint.current) this.copyHint.current.style.display = 'block';
    if (this.shareButton.current) this.shareButton.current.src = '/assets/checkmark.svg';
    setTimeout(() => {
      if (this.shareButton.current) this.shareButton.current.src = '/assets/share.svg';
      if (this.copyHint.current) this.copyHint.current.style.display = 'none';
    }, 1000);
    await navigator.clipboard.writeText(url.toString());
  }

  render() {
    const style = { height: '100%', width: '100%' };
    return (
      <div className="justify-center self-center flex flex-col md:flex-row h-full w-full">
        <div className="float-left w-full h-full flex flex-col">
          <div className="border border-emerald-langium bg-emerald-langium-darker flex items-center p-3 text-white font-mono">
            <span>Editor</span>
            <select className="ml-4 bg-emerald-langium-darker cursor-pointer border-0 border-b" onChange={(e) => this.setExample(parseInt(e.target.value))}>
              {examples.map((example, index) => <option key={index} value={index}>{example.name}</option>)}
            </select>
            <div className="flex flex-row justify-end w-full h-full gap-2 items-center">
              <div className="text-sm hidden" ref={this.copyHint}>Link was copied!</div>
              <Image src="/assets/share.svg" alt="Copy URL" title="Copy URL to this example" className="inline w-4 h-4 cursor-pointer" width={16} height={16} ref={this.shareButton} onClick={this.copyLink} />
            </div>
          </div>
          <div className="wrapper relative bg-white dark:bg-gray-900 border border-emerald-langium h-full w-full">
            <React.Suspense fallback={<div className="flex h-full items-center justify-center text-white">Loading editor...</div>}>
              <MonacoEditorReactComp
                userConfig={this.props.langiumConfig as any}
                ref={this.monacoEditor as any}
                onLoad={this.onMonacoLoad}
                style={style}
              />
            </React.Suspense>
          </div>
        </div>
        <div className="float-left w-full h-full flex flex-col" id="preview">
          <div className="border border-emerald-langium bg-emerald-langium-darker flex items-center p-3 text-white font-mono">Preview</div>
          <div className="border border-emerald-langium h-full w-full">
            <Preview ref={this.preview} />
          </div>
        </div>
      </div>
    );
  }
}

export default function MinilogoShowcase() {
  useEffect(() => {
    import('monaco-editor-workers').then(({ buildWorkerDefinition }) => {
      buildWorkerDefinition('/libs/monaco-editor-workers/workers', new URL('', window.location.href).href, false);
    });
  }, []);

  const url = new URL(window.location.toString());
  const code = url.searchParams.get('code');
  const config = createUserConfig({
    languageId: 'minilogo',
    code: code ? decompressFromEncodedURIComponent(code) : examples[0].code,
    worker: '/workers/minilogoServerWorker.js',
    monarchGrammar: syntaxHighlighting,
  }) as unknown as UserConfig;

  return <MinilogoApp langiumConfig={config} />;
}
