
/**
 * General position data for diagnostics
 */
type Pos = {
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

// Simplified notion of a state machine event in the AST
type StateMachineEvent = {
    name: string;
};

// Simplified notion of a state machine state in the AST
type StateMachineState = {
    name: string;
    transitions: {
        event: {
            ref: StateMachineEvent
        },
        state: {
            ref: StateMachineState
        }
    }[]
};

/**
 * Approximation of a langium AST, capturing the most relevant information
 */
export interface AstNode {
    $type: string;
    $container?: AstNode;
    $containerProperty?: string;
    $containerIndex?: number;
    $__dotID: number;

    // customizations added for the StateMachine example
    events: StateMachineEvent[];
    states: StateMachineState[];
}

// Identify an AST node by it's type & shape
function isAstNode(obj: unknown): obj is AstNode {
    return typeof obj === 'object' && obj !== null && typeof (obj as AstNode).$type === 'string';
}

export interface Reference<T extends AstNode = AstNode> {
    ref?: T;
    $ref: string
}

// Identify a ref by its type & shape as well
function isReference(obj: unknown): obj is Reference {
    return typeof obj === 'object' && obj !== null && typeof (obj as Reference).$ref === 'string';
}

// Link a given node
function linkNode(node: AstNode, root: AstNode, container?: AstNode, containerProperty?: string, containerIndex?: number): void {
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
                if (isReference(element)) {
                    // reconstruct cross ref
                    element.ref = getAstNode(root, element.$ref);
                } else if (isAstNode(element)) {
                    // another AST node we should link with proper details
                    linkNode(element, root, node, propertyName, index);
                }
            }
        } else if (isReference(item)) {
            // single reference to handle
            item.ref = getAstNode(root, item.$ref);
        } else if (isAstNode(item)) {
            // single ast node to handle
            linkNode(item, root, node, propertyName);
        }
    }
}

export function traverse(node: AstNode): AstNode[] {
    const traversal = [];
    traversal.push(node);
    for (const [propertyName, item] of Object.entries(node)) {
        if (propertyName === '$container') {
            // don't evaluate containers again (causes a recursive loop)
            continue;
        }
        if (Array.isArray(item)) {
            // Array of refs/nodes
            for (let index = 0; index < item.length; index++) {
                const element = item[index];
                if (isReference(element)) {
                    // cross ref to existing node
                    traversal.push(element);
                } else if (isAstNode(element)) {
                    // another AST node we should link with proper details
                    traversal.push(...traverse(element));
                }
            }
        } else if (isReference(item)) {
            // single reference to handle
            traversal.push(item);
        } else if (isAstNode(item)) {
            // single ast node to handle
            traversal.push(...traverse(item));
        }
    }
    return traversal;
}

export type Graph = {
    nodes: AstNode[]
    edges: Edge[]
};

export type Edge = {
    from: AstNode;
    to: AstNode;
}


/**
 * Takes a Langium AST, and produces a node & edges graph representation
 */
export function astToGraph(node: AstNode): Graph {
    let parentId = 0;

    const graph: Graph = {
        nodes: [],
        edges: []
    };

    function _astToGraph(node: AstNode): void {
        node.$__dotID = parentId;
        graph.nodes.push(node);
        for (const [propertyName, item] of Object.entries(node)) {

            if (propertyName === '$container') {
                // don't evaluate containers again (causes a recursive loop)
                continue;
            }

            if (Array.isArray(item)) {
                // Array of refs/nodes
                for (const element of item) {
                    if (isAstNode(element)) {
                        graph.edges.push({
                            from: node,
                            to: element
                        });
                        parentId++;
                        _astToGraph(element);
                    }
                }
            } if (isAstNode(item)) {
                graph.edges.push({
                    from: node,
                    to: item
                });
                parentId++;
                _astToGraph(item);
            }
        }
    }

    _astToGraph(node);

    return graph;
}

/**
 * Takes a graph representation of an AST, and outputs a concrete DOT program
 */
export function graphToDOT(graph: Graph): string {
    const prog: string[] = [
        'strict digraph {'
    ];
    for (const node of graph.nodes) {
        prog.push(node.$__dotID + ' [label="'+node.$type+'"]');
    }
    for (const edge of graph.edges) {
        prog.push(edge.from.$__dotID + ' -> ' + edge.to.$__dotID);
    }
    prog.push('}');
    return prog.join('\n');
}

// Takes the root, and a path string, traversing the root to find the node denoted by the path
function getAstNode(root: AstNode, path: string): AstNode | undefined {
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

/**
 * Takes a string corresponding to a serialized Langium AST, and returns a deserialized AST node
 * 
 * @param content String to parse & deserialize
 * @returns A Langium AST with cross-refs restored
 */
export function deserializeAST(content: string): AstNode {
    const root = JSON.parse(content);
    linkNode(root, root);
    return root;
}


