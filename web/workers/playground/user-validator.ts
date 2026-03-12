/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { AstNode, DefaultDocumentValidator, DiagnosticInfo, DocumentState, DocumentValidator, LangiumDocument, LinkingErrorData, ValidationOptions } from "langium";
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
                    node: linkingError.info.container,
                    property: linkingError.info.property,
                    index: linkingError.info.index,
                    data: {
                        code: DocumentValidator.LinkingError,
                        containerType: linkingError.info.container.$type,
                        property: linkingError.info.property,
                        refText: linkingError.info.reference.$refText
                    } satisfies LinkingErrorData
                };
                diagnostics.push(this.toDiagnostic('warning', `${linkingError.message}\nIn case you want to adjust the linking rules, please consult the learning section in the Langium documentation.`, info));
            }
        }
    }
}
