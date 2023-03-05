import { type } from "os";
import { AstNode, LangiumAST } from "../langium-utils/langium-ast";

export class StateMachineTools {
    currentState: StateMachineState;
    ast: StateMachineAstNode;   
    constructor(ast: StateMachineAstNode) {
        this.ast = ast;
        this.currentState = this.getInitialState(ast);
    }

    /**
     * get the initial state from the AST
     * @param ast The AST to get the initial state from
     * @returns 
     */
    private getInitialState(ast: StateMachineAstNode): StateMachineState {
        return ast.init.ref;
    }

    /**
     * get the next state based on the event
     * @param event The event to get the next state for
     * @returns The next state or null if no transition is defined for the event
     */
    getNextState(event: StateMachineEvent): StateMachineState | null {
        const transition = this.currentState.transitions.find(t => t.event.ref === event);
        if (transition) {
            return transition.state.ref as StateMachineState;
        }
        return null;
    }

    /**
     * Get the states from the AST
     * @param ast The AST to get the states from
     * @returns The states
     */
    getStates(): StateMachineState[] {
        return this.ast.states;
    }

    /**
     * Set the current state
     * @param state The state to set
     */
    setState(state: StateMachineState) {
        this.currentState = state
    }

    /**
     * Get the events from the AST
     * @param ast The AST to get the events from
     * @returns The events
     */
    getEvents(): StateMachineEvent[] {
        return this.ast.events;
    }

    /**
     * Change the state based on the event
     * @param event The event to change the state for
     */
    changeState(event: StateMachineEvent) {
        const nextState = this.getNextState(event);
        if (nextState) {
            this.setState(nextState);
        }
    }

    /**
     * Get the current state
     * @returns The current state
     */
    getCurrentState(): StateMachineState {
        return this.currentState;
    }

    /**
     * Check if the current state is the given state
     * @param state The state to check
     * @returns True if the current state is the given state
    */
    isCurrentState(state: StateMachineState): boolean {
        return this.currentState === state;
    }

    /**
     * Check if the event is enabled
     * @param event The event to check
     * @returns True if the event is enabled
    */
    isEventEnabled(event: StateMachineEvent): boolean {
        return !this.getNextState(event);
    }

    /**
     * Get the event by name
     * @param name The name of the event
     * @returns The event or null if no event with the given name exists
     */
    getEventByName(name: string): StateMachineEvent | null {
        return this.ast.events.find(e => e.name === name) || null;
    }

    /**
     * Get the state by name
     * @param name The name of the state
     * @returns The state or null if no state with the given name exists
     */
    getStateByName(name: string): StateMachineState | null {
        return this.ast.states.find(s => s.name === name) || null;
    }
}

export interface StateMachineAstNode extends AstNode {
    // customizations added for the StateMachine example
    events: StateMachineEvent[];
    states: StateMachineState[];
    init: InitalState;
}

// Simplified notion of a state machine event in the AST
export type StateMachineEvent = {
    name: string;
};

type InitalState = {
    ref: StateMachineState
}

// Simplified notion of a state machine state in the AST
export type StateMachineState = {
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
