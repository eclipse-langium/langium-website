import { AstNode, AstNodeDescription, AstUtils, DefaultDocumentValidator, DefaultLinker, DiagnosticInfo, DocumentState, DocumentValidator, LangiumDocument, LinkingError, LinkingErrorData, ReferenceInfo, ValidationOptions } from "langium";
import { LangiumServices } from "langium/lsp";
import { Diagnostic } from "vscode-languageserver";

export class PlaygroundValidator extends DefaultDocumentValidator {
    constructor(services: LangiumServices) {
        super(services);
    }
    protected override processLinkingErrors(document: LangiumDocument, diagnostics: Diagnostic[], _options: ValidationOptions): void {
        for (const reference of document.references) {
            const linkingError = reference.error;
            if (linkingError) {
                const info: DiagnosticInfo<AstNode, string> = {
                    node: linkingError.container,
                    property: linkingError.property,
                    index: linkingError.index,
                    data: {
                        code: DocumentValidator.LinkingError,
                        containerType: linkingError.container.$type,
                        property: linkingError.property,
                        refText: linkingError.reference.$refText
                    } satisfies LinkingErrorData
                };
                diagnostics.push(this.toDiagnostic('warning', `${linkingError.message}\nIn case you want to adjust the linking rules, please consult the learning section in the Langium documentation.`, info));
            }
        }
    }
};
