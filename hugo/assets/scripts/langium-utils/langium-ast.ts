
/**
 * Provides utilities for deserializing Langium ASTs
 */
export class LangiumAST {
    // Identify an AST node by it's type & shape
    isReference(obj: unknown): obj is Reference {
        return typeof obj === 'object' && obj !== null && typeof (obj as Reference).$ref === 'string';
    }

    // Identify a ref by its type & shape as well
    isAstNode(obj: unknown): obj is AstNode {
        return typeof obj === 'object' && obj !== null && typeof (obj as AstNode).$type === 'string';
    }

    // Takes the root, and a path string, traversing the root to find the node denoted by the path
    getAstNode(root: AstNode, path: string): AstNode | undefined {
        if (!path.startsWith('#')) {
            // this isn't something we can decode, skip
            return undefined;
        }

        // break up path segments for traversal
        const segments = path.substring(1).split('/');

        return segments.reduce((previousValue, currentValue) => {
            if (!previousValue || currentValue.length === 0) {
                // no root or nothing else to check, return what we have so far
                return previousValue;
            }
            const propertyIndex = currentValue.indexOf('@');
            if (propertyIndex > 0) {
                // Array part of path to extract
                const property = currentValue.substring(0, propertyIndex);
                // get array index using prop
                const arrayIndex = parseInt(currentValue.substring(propertyIndex + 1));
                // find array with prop & return via index
                const array = (previousValue as unknown as Record<string, AstNode[]>)[property];
                return array?.[arrayIndex];
            }
            // instead, index one farther down the tree using the current value
            return (previousValue as unknown as Record<string, AstNode>)[currentValue];
        }, root);
    }


    // Link a given node
    linkNode(node: AstNode, root: AstNode, container?: AstNode, containerProperty?: string, containerIndex?: number): void {
        // set container details, if any (undefined for root)
        node.$containerProperty = containerProperty;
        node.$containerIndex = containerIndex;
        node.$container = container;

        // iterate over all props in this node
        for (const [propertyName, item] of Object.entries(node)) {

            if (propertyName === '$container') {
                // don't evaluate containers again (causes a recursive loop)
                continue;
            }

            if (Array.isArray(item)) {
                // Array of refs/nodes
                for (let index = 0; index < item.length; index++) {
                    const element = item[index];
                    if (this.isReference(element)) {
                        // reconstruct cross ref
                        element.ref = this.getAstNode(root, element.$ref);
                    } else if (this.isAstNode(element)) {
                        // another AST node we should link with proper details
                        this.linkNode(element, root, node, propertyName, index);
                    }
                }
            } else if (this.isReference(item)) {
                // single reference to handle
                item.ref = this.getAstNode(root, item.$ref);
            } else if (this.isAstNode(item)) {
                // single ast node to handle
                this.linkNode(item, root, node, propertyName);
            }
        }
    }

    // link given ast
    linkAst(root: AstNode): void {
        this.linkNode(root, root);
    }

    /**
    * Takes a string corresponding to a serialized Langium AST, and returns a deserialized AST node
    * 
    * @param content String to parse & deserialize
    * @returns A Langium AST with cross-refs restored
    */
    deserializeAST(content: string): AstNode {
        const root = JSON.parse(content);
        this.linkNode(root, root);
        return root;
    }
}

/**
 * General position data for diagnostics
 */
export type Pos = {
    character: number;
    line: number;
}

/**
 * Diagnostics that can be returned in a DocumentChange response
 */
export type Diagnostic = {
    // general string-based code for this diagnostic (like 'linking-error')
    code: string;
    // user-friendly diagnostic message
    message: string;
    // start -> end range of the diagnostic
    range: {
        start: Pos;
        end: Pos;
    }
    // severity code
    severity: number;
    // source language by string
    source: string;
};

/**
 * Response for a DocumentChange notification
 */
export type DocumentChangeResponse = {
    uri: string;
    content: string;
    diagnostics: Diagnostic[];
};

/**
* Approximation of a langium AST, capturing the most relevant information
*/
export interface AstNode {
    $type: string;
    $container?: AstNode;
    $containerProperty?: string;
    $containerIndex?: number;
}

export interface Reference<T extends AstNode = AstNode> {
    ref?: T;
    $ref: string
}