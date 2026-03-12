import type { languages } from 'monaco-editor';

export type WorkerUrl = string;

/**
 * Generalized configuration for Monaco editor instances in Langium showcases/playground.
 */
export interface MonacoReactConfig {
  code: string;
  languageId: string;
  worker: WorkerUrl | Worker;
  readonly?: boolean;
}

/**
 * Extended config for TextMate grammar usage.
 */
export interface MonacoExtendedReactConfig extends MonacoReactConfig {
  textmateGrammar: unknown;
}

/**
 * Classic config for Monarch grammar usage.
 */
export interface MonacoEditorReactConfig extends MonacoReactConfig {
  monarchGrammar?: languages.IMonarchLanguage;
}

function isMonacoExtendedReactConfig(config: unknown): config is MonacoExtendedReactConfig {
  return (config as MonacoExtendedReactConfig).textmateGrammar !== undefined;
}

export const defaultLanguageConfig = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
    ['"', '"'],
    ["'", "'"],
  ],
  surroundingPairs: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
    ['"', '"'],
    ["'", "'"],
  ],
};

/**
 * Return type matching the new @typefox/monaco-editor-react v7+ prop shape.
 * Pass each field as a separate prop to MonacoEditorReactComp:
 *   <MonacoEditorReactComp
 *     vscodeApiConfig={config.vscodeApiConfig}
 *     editorAppConfig={config.editorAppConfig}
 *     languageClientConfig={config.languageClientConfig}
 *   />
 */
export interface UserConfig {
  vscodeApiConfig: Record<string, unknown>;
  editorAppConfig: Record<string, unknown>;
  languageClientConfig: Record<string, unknown>;
}

/**
 * Builds a config object for use with MonacoEditorLanguageClientWrapper
 * (monaco-editor-react 7.x / monaco-languageclient 10.x).
 */
export function createUserConfig(
  config: MonacoExtendedReactConfig | MonacoEditorReactConfig
): UserConfig {
  const id = config.languageId;
  const useExtended = isMonacoExtendedReactConfig(config);

  // ---- VSCode API config (global, initialized once) ----
  let vscodeApiConfig: Record<string, unknown>;

  if (useExtended) {
    const languageConfigUrl = `/${id}-configuration.json`;
    const languageGrammarUrl = `/${id}-grammar.json`;
    const extensionContents = new Map<string, string>();
    extensionContents.set(languageConfigUrl, JSON.stringify(defaultLanguageConfig));
    extensionContents.set(languageGrammarUrl, JSON.stringify((config as MonacoExtendedReactConfig).textmateGrammar));

    vscodeApiConfig = {
      $type: 'extended',
      viewsConfig: { $type: 'EditorService' },
      userConfiguration: {
        json: JSON.stringify({
          'workbench.colorTheme': 'Default Dark Modern',
          'editor.semanticHighlighting.enabled': true,
          'editor.lightbulb.enabled': true,
          'editor.guides.bracketPairsHorizontal': 'active',
        }),
      },
      extensions: [
        {
          config: {
            name: id,
            publisher: 'TypeFox',
            version: '1.0.0',
            engines: { vscode: '*' },
            contributes: {
              languages: [{ id, extensions: [`.${id}`], configuration: languageConfigUrl }],
              grammars: [{ language: id, scopeName: `source.${id}`, path: languageGrammarUrl }],
            },
          },
          filesOrContents: extensionContents,
        },
      ],
    };
  } else {
    vscodeApiConfig = {
      $type: 'classic',
      viewsConfig: { $type: 'EditorService' },
    };
  }

  // ---- Editor app config ----
  const editorAppConfig: Record<string, unknown> = {
    codeResources: {
      modified: {
        text: config.code,
        uri: `inmemory://model/1.${id}`,
        enforceLanguageId: id,
      },
    },
    useDiffEditor: false,
    editorOptions: {
      readOnly: config.readonly ?? false,
    },
  };

  if (!useExtended && (config as MonacoEditorReactConfig).monarchGrammar) {
    editorAppConfig.languageDef = {
      languageExtensionConfig: { id },
      monarchLanguage: (config as MonacoEditorReactConfig).monarchGrammar,
    };
  }

  // ---- Language client config ----
  const connectionOptions =
    typeof config.worker === 'string'
      ? {
          $type: 'WorkerConfig',
          url: new URL(config.worker, window.location.href),
          type: 'module',
          workerName: `${id}-language-server-worker`,
        }
      : {
          $type: 'WorkerDirect',
          worker: config.worker,
        };

  const languageClientConfig: Record<string, unknown> = {
    languageId: id,
    connection: { options: connectionOptions },
    clientOptions: {
      documentSelector: [{ language: id }],
    },
  };

  return { vscodeApiConfig, editorAppConfig, languageClientConfig };
}
