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
 * Builds a config object for use with MonacoEditorLanguageClientWrapper (monaco-languageclient 10.x).
 *
 * Import MonacoEditorLanguageClientWrapper directly from 'monaco-languageclient' —
 * the old 'monaco-editor-wrapper' package is deprecated and merged into monaco-languageclient.
 */
export function createUserConfig(
  config: MonacoExtendedReactConfig | MonacoEditorReactConfig
): Record<string, unknown> {
  const id = config.languageId;
  const useExtended = isMonacoExtendedReactConfig(config);

  let editorAppConfig: Record<string, unknown>;

  if (useExtended) {
    const languageConfigUrl = `/${id}-configuration.json`;
    const languageGrammarUrl = `/${id}-grammar.json`;
    const extensionContents = new Map<string, string>();
    extensionContents.set(languageConfigUrl, JSON.stringify(defaultLanguageConfig));
    extensionContents.set(languageGrammarUrl, JSON.stringify((config as MonacoExtendedReactConfig).textmateGrammar));

    editorAppConfig = {
      $type: 'extended',
      languageId: id,
      code: config.code,
      useDiffEditor: false,
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
      userConfiguration: {
        json: JSON.stringify({
          'workbench.colorTheme': 'Default Dark Modern',
          'editor.semanticHighlighting.enabled': true,
          'editor.lightbulb.enabled': true,
          'editor.guides.bracketPairsHorizontal': 'active',
        }),
      },
    };
  } else {
    editorAppConfig = {
      $type: 'classic',
      languageId: id,
      code: config.code,
      useDiffEditor: false,
      languageExtensionConfig: { id },
      languageDef: (config as MonacoEditorReactConfig).monarchGrammar,
      editorOptions: {
        'semanticHighlighting.enabled': true,
        readOnly: config.readonly,
        theme: 'vs-dark',
      },
    };
  }

  const languageClientConfig =
    typeof config.worker === 'string'
      ? {
          options: {
            $type: 'WorkerConfig',
            url: new URL(config.worker, window.location.href),
            type: 'module',
            name: `${id}-language-server-worker`,
          },
        }
      : {
          options: {
            $type: 'WorkerDirect',
            worker: config.worker,
          },
        };

  return {
    wrapperConfig: {
      editorAppConfig,
    },
    languageClientConfig,
  };
}
