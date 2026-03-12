'use client';

import React, { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { createUserConfig } from 'langium-website-core';
import { HelloWorldGrammar, DSLInitialContent, LangiumTextMateContent } from './constants';
import { share, throttle } from './utils';
import { AstTree } from './Tree';
import { decompressFromEncodedURIComponent } from 'lz-string';
import { DefaultAstNodeLocator } from 'langium';
import { createServicesForGrammar } from 'langium/grammar';
import { generateTextMate } from 'langium-cli/textmate';
import { useSearchParams } from 'next/navigation';
import type { AstNode } from 'langium';
import Image from 'next/image';

const MonacoEditorReactComp = React.lazy(async () => {
  const { MonacoEditorReactComp } = await import('monaco-languageclient/react');
  return { default: MonacoEditorReactComp };
});

const languageUpdateDelay = 150;
let nextIdCounter = 0;
function nextId(): string { return (nextIdCounter++).toString(); }

interface OverlayState { visible: boolean; hasError: boolean; }

function PlaygroundOverlay({ state }: { state: OverlayState }) {
  if (!state.visible) return null;
  return (
    <div id="overlay" className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70">
      <div className="text-white text-xl font-mono hint">
        {state.hasError ? 'Your grammar contains errors.' : 'Loading...'}
      </div>
    </div>
  );
}

interface PlaygroundProps {
  initialGrammar: string;
  initialContent: string;
}

function PlaygroundInner({ initialGrammar, initialContent }: PlaygroundProps) {
  const langiumEditorRef = useRef<any>(null);
  const dslEditorRef = useRef<any>(null);
  const [overlay, setOverlay] = useState<OverlayState>({ visible: false, hasError: false });
  const [astNode, setAstNode] = useState<AstNode | null>(null);
  const [showTree, setShowTree] = useState(true);
  const [dslConfig, setDslConfig] = useState<Record<string, unknown> | null>(null);
  const [dslKey, setDslKey] = useState(0);
  const currentGrammarRef = useRef(initialGrammar);
  const currentContentRef = useRef(initialContent);
  const locator = useRef(new DefaultAstNodeLocator());
  const copyHintRef = useRef<HTMLDivElement>(null);
  const shareButtonRef = useRef<HTMLImageElement>(null);

  const showOverlay = useCallback((visible: boolean, hasError: boolean) => {
    setOverlay({ visible, hasError });
  }, []);

  const setupDslConfig = useCallback(async (grammarText: string, languageId: string) => {
    try {
      const { Grammar } = await createServicesForGrammar({ grammar: grammarText });
      const worker = await new Promise<Worker>((resolve, reject) => {
        const w = new Worker('/workers/userServerWorker.js');
        w.postMessage({ type: 'startWithGrammar', grammar: grammarText });
        w.onmessage = (event) => { if (event.data.type === 'lsStartedWithGrammar') resolve(w); };
        w.onerror = reject;
      });
      const textmateGrammar = JSON.parse(generateTextMate(Grammar, { id: languageId, grammar: 'UserGrammar' }));
      const config = createUserConfig({
        languageId,
        code: currentContentRef.current,
        worker,
        textmateGrammar,
      });
      setDslConfig(config);
      setDslKey((k) => k + 1);
      showOverlay(false, false);
    } catch (e) {
      console.error('Failed to setup DSL config:', e);
      showOverlay(true, true);
    }
  }, [showOverlay]);

  const onLangiumLoad = useCallback(() => {
    const lc = langiumEditorRef.current?.getEditorWrapper?.()?.getLanguageClient?.();
    if (!lc) return;
    lc.onNotification('browser/DocumentChange', async (resp: any) => {
      if (!lc.isRunning()) return;
      currentGrammarRef.current = resp.content;
      if (resp.diagnostics?.filter((d: any) => d.severity === 1).length) {
        showOverlay(true, true);
        return;
      }
      throttle(1, languageUpdateDelay, async () => {
        showOverlay(true, false);
        await setupDslConfig(resp.content, nextId());
      });
    });
  }, [showOverlay, setupDslConfig]);

  const onDslLoad = useCallback(() => {
    const lc = dslEditorRef.current?.getEditorWrapper?.()?.getLanguageClient?.();
    if (!lc) return;
    lc.onNotification('browser/DocumentChange', (resp: any) => {
      const editor = dslEditorRef.current?.getEditorWrapper?.()?.getEditor?.();
      if (editor) currentContentRef.current = editor.getValue() ?? currentContentRef.current;
      throttle(2, languageUpdateDelay, () => {
        try {
          const ast = JSON.parse(resp.content);
          setAstNode(ast);
        } catch { /* ignore */ }
      });
    });
  }, []);

  useEffect(() => {
    import('monaco-editor-workers').then(({ buildWorkerDefinition }) => {
      buildWorkerDefinition('/libs/monaco-editor-workers/workers', new URL('', window.location.href).href, false);
    });
    // Initial DSL setup
    showOverlay(true, false);
    setupDslConfig(initialGrammar, nextId());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShare = async () => {
    await share(currentGrammarRef.current, currentContentRef.current);
    if (shareButtonRef.current) shareButtonRef.current.src = '/assets/checkmark.svg';
    if (copyHintRef.current) copyHintRef.current.style.display = 'block';
    setTimeout(() => {
      if (shareButtonRef.current) shareButtonRef.current.src = '/assets/share.svg';
      if (copyHintRef.current) copyHintRef.current.style.display = 'none';
    }, 1000);
  };

  const langiumConfig = createUserConfig({
    languageId: 'langium',
    code: initialGrammar,
    worker: '/workers/langiumServerWorker.js',
    textmateGrammar: LangiumTextMateContent,
  });

  const editorStyle = { height: '100%', width: '100%' };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-emerald-langium-darker border-b border-emerald-langium text-white font-mono text-sm">
        <span>Langium Playground</span>
        <div className="flex-1" />
        <div ref={copyHintRef} className="text-sm hidden">Link was copied!</div>
        <Image
          ref={shareButtonRef}
          src="/assets/share.svg"
          alt="Share"
          title="Copy URL to this grammar and content"
          className="w-4 h-4 cursor-pointer"
          width={16} height={16}
          onClick={handleShare}
        />
        <button
          className="text-xs border border-emerald-langium px-2 py-1 rounded hover:bg-emerald-langium/20"
          onClick={() => setShowTree((v) => !v)}
          title="Toggle AST panel"
        >
          {showTree ? 'Hide AST' : 'Show AST'}
        </button>
      </div>

      {/* Editors row */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Langium Grammar Editor */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="border-b border-emerald-langium bg-emerald-langium-darker px-3 py-2 text-white font-mono text-xs">Grammar</div>
          <div className="relative flex-1">
            <PlaygroundOverlay state={overlay} />
            <Suspense fallback={<div className="flex h-full items-center justify-center text-white">Loading editor...</div>}>
              <MonacoEditorReactComp
                userConfig={langiumConfig as any}
                ref={langiumEditorRef}
                onLoad={onLangiumLoad}
                style={editorStyle}
              />
            </Suspense>
          </div>
        </div>

        {/* DSL Editor */}
        <div className="flex flex-col flex-1 min-w-0 border-l border-emerald-langium">
          <div className="border-b border-emerald-langium bg-emerald-langium-darker px-3 py-2 text-white font-mono text-xs">Program</div>
          <div className="flex-1">
            {dslConfig ? (
              <Suspense fallback={<div className="flex h-full items-center justify-center text-white">Loading editor...</div>}>
                <MonacoEditorReactComp
                  key={dslKey}
                  userConfig={dslConfig as any}
                  ref={dslEditorRef}
                  onLoad={onDslLoad}
                  style={editorStyle}
                />
              </Suspense>
            ) : (
              <div className="flex h-full items-center justify-center text-white/50 font-mono text-sm">Initializing...</div>
            )}
          </div>
        </div>

        {/* AST Tree */}
        {showTree && (
          <div className="flex flex-col w-80 min-w-0 border-l border-emerald-langium overflow-auto">
            <div className="border-b border-emerald-langium bg-emerald-langium-darker px-3 py-2 text-white font-mono text-xs">AST</div>
            <div id="ast-body" className="flex-1 p-2 text-xs text-white font-mono overflow-auto">
              {astNode ? (
                <AstTree ast={astNode} locator={locator.current} />
              ) : (
                <span className="text-white/40">No AST yet</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlaygroundPage() {
  const searchParams = useSearchParams();
  const encodedGrammar = searchParams.get('grammar');
  const encodedContent = searchParams.get('content');
  const initialGrammar = encodedGrammar ? (decompressFromEncodedURIComponent(encodedGrammar) ?? HelloWorldGrammar) : HelloWorldGrammar;
  const initialContent = encodedContent ? (decompressFromEncodedURIComponent(encodedContent) ?? DSLInitialContent) : DSLInitialContent;

  return <PlaygroundInner initialGrammar={initialGrammar} initialContent={initialContent} />;
}
