import { AstNode, LangiumAST } from "./ast-tools";


export class StateMachineAST extends LangiumAST {
    // change LangiumAST AstNode to StateMachineAstNode
    deserializeAST(content: string): StateMachineAstNode {
        const root = JSON.parse(content);
        this.linkNode(root, root);
        return root;
    }

}

export interface StateMachineAstNode extends AstNode {
    // customizations added for the StateMachine example
    events: StateMachineEvent[];
    states: StateMachineState[];
    initialState: StateMachineState;
}

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
