import { UserConfig, WorkerConfigOptions, WorkerConfigDirect, EditorAppConfigClassic, EditorAppConfigVscodeApi } from "monaco-editor-wrapper";
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

    // setup language client config options (direct or via url)
    let languageClientConfigOptions: WorkerConfigOptions | WorkerConfigDirect;
    if (typeof config.worker === 'string') {
        // prepare LS from a url
        languageClientConfigOptions = {
            $type: "WorkerConfig",
            url: new URL(config.worker, window.location.href),
            type: 'module',
            name: `${id}-language-server-worker`,
        };
    } else {
        // prepare LS from a pre-configured worker
        languageClientConfigOptions = {
            $type: "WorkerDirect",
            worker: config.worker
        };
    }

    // setup app config
    let editorAppConfig: EditorAppConfigClassic | EditorAppConfigVscodeApi;

    // shared config from both the classic & vscode configs
    const sharedConfig = {
        code: config.code,
        languageId: id,
        useDiffEditor: false
    };

    if (useVscodeConfig) {
        // vscode config
        editorAppConfig = {
            ...sharedConfig,
            $type: 'vscodeApi',
            extension: {
                name: id,
                publisher: 'TypeFox',
                contributes: {
                    languages: [{
                        id,
                        extensions: [],
                        aliases: [id],
                        configuration: `.${languageConfigUrl}`
                    }],
                    grammars: isMonacoVSCodeReactConfig(config) ? [{
                        language: id,
                        scopeName: `source.${id}`,
                        path: `.${languageGrammarUrl}`
                    }] : undefined
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
        };
    } else {
        // classic config
        editorAppConfig = {
            ...sharedConfig,
            $type: 'classic',
            automaticLayout: true,
            theme: 'vs-dark',
            editorOptions: {
                readOnly: config.readonly,
            },
            languageExtensionConfig: {
                id
            },
            languageDef: config.monarchGrammar,
        };
    }

    // generate langium config
    const userConfig: UserConfig = {
        htmlElement: config.htmlElement,
        wrapperConfig: {
            serviceConfig: {
                // the theme service & textmate services are dependent, they need to both be enabled or disabled together
                // this explicitly disables the Monarch capabilities
                // both are tied to whether we are using the VSCode config as well
                enableThemeService: useVscodeConfig,
                enableTextmateService: useVscodeConfig,

                enableModelService: true,
                configureEditorOrViewsServiceConfig: {
                    enableViewsService: false,
                },
                configureConfigurationServiceConfig: {
                    defaultWorkspaceUri: '/tmp/'
                },
                enableKeybindingsService: true,
                enableLanguagesService: true,
                debugLogging: false
            },
            editorAppConfig
        },
        languageClientConfig: {
            options: languageClientConfigOptions
        }
    };
    return userConfig;
}
