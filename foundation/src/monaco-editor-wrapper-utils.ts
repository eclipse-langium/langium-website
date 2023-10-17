import { languages } from "monaco-editor";
import getKeybindingsServiceOverride from '@codingame/monaco-vscode-keybindings-service-override';
import { EditorAppConfigClassic, EditorAppConfigExtended, LanguageClientConfig, UserConfig } from "monaco-editor-wrapper";

export type WorkerUrl = string;

/**
 * Generalized configuration used with 'getMonacoEditorReactConfig' to generate a working configuration for monaco-editor-react
 */
export interface MonacoReactConfig {
    code: string,
    languageId: string,
    worker: WorkerUrl | Worker,
    readonly?: boolean // whether to make the editor readonly or not (by default is false)
}

/**
 * Extended config, specifically for textmate usage
 */
export interface MonacoExtendedReactConfig extends MonacoReactConfig {
    textmateGrammar: any;
}

/**
 * Editor config, specifically for monarch grammar usage
 */
export interface MonacoEditorReactConfig extends MonacoReactConfig {
    monarchGrammar?: languages.IMonarchLanguage;
}

/**
 * Helper to identify a Extended config, for use with TextMate
 */
function isMonacoExtendedReactConfig(config: unknown): config is MonacoExtendedReactConfig {
    return (config as MonacoExtendedReactConfig).textmateGrammar !== undefined;
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
 * @param config A Extended or classic editor config to generate a UserConfig from
 * @returns A completed UserConfig
 */
export function createUserConfig(config: MonacoExtendedReactConfig | MonacoEditorReactConfig): UserConfig {
    // setup urls for config & grammar
    const id = config.languageId;

    // check whether to use extended config (Textmate) or the classic editor config (Monarch)
    let editorAppConfig: EditorAppConfigClassic | EditorAppConfigExtended;
    const useExtendedConfig = isMonacoExtendedReactConfig(config);
    if (useExtendedConfig) {
        // setup extension contents
        const languageConfigUrl = `/${id}-configuration.json`;
        const languageGrammarUrl = `/${id}-grammar.json`;
        const extensionContents = new Map<string, string>();
        extensionContents.set(languageConfigUrl, JSON.stringify(defaultLanguageConfig));
        extensionContents.set(languageGrammarUrl, JSON.stringify(config.textmateGrammar));

        editorAppConfig = {
            $type: 'extended',
            languageId: id,
            code: config.code,
            useDiffEditor: false,
            extensions: [{
                config: {
                    name: id,
                    publisher: 'TypeFox',
                    version: '1.0.0',
                    engines: {
                        vscode: '*'
                    },
                    contributes: {
                        languages: [{
                            id: id,
                            extensions: [ `.${id}` ],
                            configuration: languageConfigUrl
                        }],
                        grammars: [{
                            language: id,
                            scopeName: `source.${id}`,
                            path: languageGrammarUrl
                        }]
                    }
                },
                filesOrContents: extensionContents,
            }],                
            userConfiguration: {
                json: JSON.stringify({
                    'workbench.colorTheme': 'Default Dark Modern',
                    'editor.semanticHighlighting.enabled': true,
                    'editor.lightbulb.enabled': true,
                    'editor.guides.bracketPairsHorizontal': 'active'
                })
            }
        };
    } else {
        editorAppConfig = {
            $type: 'classic',
            languageId: id,
            code: config.code,
            useDiffEditor: false,
            languageExtensionConfig: { id },
            languageDef: config.monarchGrammar,
            editorOptions: {
                'semanticHighlighting.enabled': true,
                readOnly: config.readonly,
                theme: 'vs-dark'
            }
        };
    }

    let languageClientConfig: LanguageClientConfig;
    if (typeof config.worker === 'string') {
        languageClientConfig = {
            options: {
                $type: 'WorkerConfig',
                url: new URL(config.worker, window.location.href),
                type: 'module',
                name: `${id}-language-server-worker`,
            }
        };
    } else {
        languageClientConfig = {
            options: {
                $type: 'WorkerDirect',
                worker: config.worker
            }
        };
    }

    // generate user config for langium based language
    const userConfig: UserConfig = {
        wrapperConfig: {
            serviceConfig: {
                // only use keyboard service in addition to the default services from monaco-editor-wrapper
                userServices: {
                    ...getKeybindingsServiceOverride()
                },
                debugLogging: true
            },
            editorAppConfig
        },
        languageClientConfig
    }
    return userConfig;
}
