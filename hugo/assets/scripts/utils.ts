import { UserConfig } from "monaco-editor-wrapper";
import { monaco } from "monaco-editor-wrapper/.";

export type WorkerUrl = string;

/**
 * Generalized configuration used with 'getMonacoEditorReactConfig' to generate a working configuration for monaco-editor-react
 */
export interface MonacoReactConfig {
    code: string,
    htmlElement: HTMLElement,
    languageId: string,
    worker: WorkerUrl | Worker,
    readonly?: boolean // whether to make the editor readonly or not (by default is false)
}

/**
 * VSCode API config, specifically for textmate usage
 */
export interface MonacoVSCodeReactConfig extends MonacoReactConfig {
    textmateGrammar: any;
}

/**
 * Editor config, specifically for monarch grammar usage
 */
export interface MonacoEditorReactConfig extends MonacoReactConfig {
    monarchGrammar?: monaco.languages.IMonarchLanguage;
}

/**
 * Helper to identify a VSCode API config, for use with TextMate
 */
function isMonacoVSCodeReactConfig(config: unknown): config is MonacoVSCodeReactConfig {
    return (config as MonacoVSCodeReactConfig).textmateGrammar !== undefined;
}

/**
 * Helper to identify an editor config (classic), for use with Monarch
 */
function isMonacoEditorReactConfig(config: unknown): config is MonacoEditorReactConfig {
    return (config as MonacoEditorReactConfig).monarchGrammar !== undefined;
}

/**
 * Default language configuration, common to most Langium DSLs
 */
export const defaultLanguageConfig = {
    "comments": {
        "lineComment": "//",
        "blockComment": ["/*", "*/"]
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
 * @param config A VSCode API or classic editor config to generate a UserConfig from
 * @returns A completed UserConfig
 */
export function createUserConfig(config: MonacoVSCodeReactConfig | MonacoEditorReactConfig): UserConfig {
    // setup extension contents
    const extensionContents = new Map<string, string>();

    // setup urls for config & grammar
    const id = config.languageId;
    const languageConfigUrl = `/${id}-configuration.json`;
    const languageGrammarUrl = `/${id}-grammar.json`;

    // set extension contents
    extensionContents.set(languageConfigUrl, JSON.stringify(defaultLanguageConfig));

    // check whether to use the VSCode API config (TM), or the classic editor config (Monarch)
    const useVscodeConfig = isMonacoVSCodeReactConfig(config);

    if (isMonacoVSCodeReactConfig(config)) {
        extensionContents.set(languageGrammarUrl, JSON.stringify(config.textmateGrammar));
    }

    // generate langium config
    return {
        htmlElement: config.htmlElement,
        wrapperConfig: {
            // have to disable this for Monarch
            // generally true otherwise (toggles using monacoVscodeApiConfig / monacoEditorConfig)
            useVscodeConfig,

            serviceConfig: {
                // the theme service & textmate services are dependent, they need to both be enabled or disabled together
                // this explicitly disables the Monarch capabilities
                // both are tied to whether we are using the VSCode config as well
                enableThemeService: useVscodeConfig,
                enableTextmateService: useVscodeConfig,

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
                debugLogging: false
            },
            // VSCode config (for TextMate grammars)
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
                            id,
                            extensions: [],
                            aliases: [
                                id
                            ],
                            configuration: `.${languageConfigUrl}`
                        }],
                        grammars: isMonacoVSCodeReactConfig(config) ? [{
                            language: id,
                            scopeName: `source.${id}`,
                            path: `.${languageGrammarUrl}`
                        }] : undefined,
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
            // Editor config (classic) (for Monarch)
            monacoEditorConfig: {
                languageExtensionConfig: {
                    id
                },
                languageDef: isMonacoEditorReactConfig(config) ? config.monarchGrammar : undefined
            }
        },
        editorConfig: {
            languageId: id,
            code: config.code,
            useDiffEditor: false,
            automaticLayout: true,
            theme: 'vs-dark',
            editorOptions: {
                readOnly: config.readonly
            }
        },
        languageClientConfig: {
            enabled: true,
            useWebSocket: false,
            // build a worker config from a worker URL string, or just copy in the entire worker
            workerConfigOptions: typeof config.worker === 'string' ? {
                url: new URL(config.worker, window.location.href),
                type: 'module',
                name: `${id}-language-server-worker`,
            } : config.worker
        }
    };
}
