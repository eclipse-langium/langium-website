import { UserConfig } from "monaco-editor-wrapper";
import { monaco } from "monaco-editor-wrapper/.";

/**
 * Generalized configuration used with 'getMonacoEditorReactConfig' to generate a working configuration for monaco-editor-react
 */
export interface MonacoReactConfig {
    code: string,
    htmlElement: HTMLElement,
    languageGrammar: any,
    languageId: string,
    serverWorkerUrl: string,
    monarchSyntax?: monaco.languages.IMonarchLanguage
}

/**
 * Default language configuration, common to most Langium DSLs
 */
const defaultLanguageConfig = {
    "comments": {
        "lineComment": "//",
        "blockComment": [ "/*", "*/" ]
    },
    "brackets": [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"]
    ],
    "autoClosingPairs": [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"],
        ["\"", "\""],
        ["'", "'"]
    ],
    "surroundingPairs": [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"],
        ["\"", "\""],
        ["'", "'"]
    ]
};

/**
 * Generates a UserConfig for a given Langium example, which is then passed to the monaco-editor-react component
 * 
 * @param code Program text to start with
 * @param htmlElement Element to bind the editor to
 * @returns A completed UserConfig
 */
export async function createMonacoEditorReactConfig(config: MonacoReactConfig): Promise<UserConfig> {
    // setup extension contents
  const extensionContents = new Map<string, string>();

  // setup urls for config & grammar
  const id = config.languageId;
  const languageConfigUrl = `/${id}-configuration.json`;
  const languageGrammarUrl = `/${id}-grammar.json`;

  // set extension contents
  extensionContents.set(languageConfigUrl, JSON.stringify(defaultLanguageConfig));
  extensionContents.set(languageGrammarUrl, JSON.stringify(config.languageGrammar));

  // create a worker url for our LS
  const workerUrl = new URL(config.serverWorkerUrl, window.location.href);

  // generate langium config
  return {
      htmlElement: config.htmlElement,
      wrapperConfig: {
          useVscodeConfig: true,
          serviceConfig: {
              enableThemeService: true,
              enableTextmateService: true,
              enableModelService: true,
              configureEditorOrViewsServiceConfig: {
                  enableViewsService: false,
                  useDefaultOpenEditorFunction: true
              },
              configureConfigurationServiceConfig: {
                  defaultWorkspaceUri: '/tmp/'
              },
              enableKeybindingsService: true,
              enableLanguagesService: true,
              debugLogging: true
          },
          monacoVscodeApiConfig: {
              extension: {
                  name: id,
                  publisher: 'TypeFox',
                  version: '1.0.0',
                  engines: {
                      vscode: '*'
                  },
                  contributes: {
                      languages: [{
                          id: id,
                          extensions: [],
                          aliases: [
                            id
                          ],
                          configuration: `.${languageConfigUrl}`
                      }],
                      grammars: [{
                          language: id,
                          scopeName: `source.${id}`,
                          path: `.${languageGrammarUrl}`
                      }],
                      keybindings: [{
                          key: 'ctrl+p',
                          command: 'editor.action.quickCommand',
                          when: 'editorTextFocus'
                      }, {
                          key: 'ctrl+shift+c',
                          command: 'editor.action.commentLine',
                          when: 'editorTextFocus'
                      }]
                  }
              },
              extensionFilesOrContents: extensionContents,
              userConfiguration: {
                  json: `{
  "workbench.colorTheme": "Default Dark Modern",
  "editor.fontSize": 14,
  "editor.lightbulb.enabled": true,
  "editor.lineHeight": 20,
  "editor.guides.bracketPairsHorizontal": "active",
  "editor.lightbulb.enabled": true
}`
              }
          },
          monacoEditorConfig: {
            languageExtensionConfig: {
                id
            },
            languageDef: config.monarchSyntax
          }
      },
      editorConfig: {
          languageId: id,
          code: config.code,
          useDiffEditor: false,
          automaticLayout: true,
          theme: 'vs-dark'
      },
      languageClientConfig: {
          enabled: true,
          useWebSocket: false,
          workerConfigOptions: {
              url: workerUrl,
              type: 'module',
              name: `${id}-language-server-worker`,
          }
      }
  };
}
