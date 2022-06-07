import { useEffect, useRef } from "react";
import { MonacoLanguageClientWrapper, getMonacoCss } from 'monaco-editor-comp/bundle';
import { buildWorkerDefinition } from "monaco-editor-workers";
buildWorkerDefinition('./assets/monaco-editor-workers/workers', window.location.href, false);

const style = document.createElement('style');
style.innerHTML = getMonacoCss();
document.head.appendChild(style);

export interface LangiumEditorProps {

}

export const LangiumEditor: React.FC<LangiumEditorProps> = () => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const client = new MonacoLanguageClientWrapper("id");
        const editorConfig = client.getEditorConfig();
        editorConfig.codeOriginal = [ `{
    "$schema": "http://json.schemastore.org/coffeelint",
    "line_endings": "unix"
}`, 'json' ];
        editorConfig.theme = 'vs-dark';
        editorConfig.webSocketOptions.wsHost = "localhost";
        editorConfig.webSocketOptions.wsPort = 3000;
        editorConfig.webSocketOptions.wsPath = "sampleServer";
        editorConfig.useLanguageClient = true;
        
        client.startEditor(ref.current!);
        const listener = () => client.updateLayout();
        window.addEventListener('resize', listener);
        return () => window.removeEventListener('resize', listener);
    }, []);
    return <div ref={ref} className="langium-editor"/>;
};