import { monaco } from "@typefox/monaco-editor-react/.";
import { AstNode } from "../langium-utils/langium-ast";

export class StateMachineTools {
    currentState: StateMachineState;
    ast: StateMachineAstNode;   
    constructor(ast: StateMachineAstNode) {
        this.ast = ast;
        // get the initial state from the AST
        this.currentState = ast.init.ref;
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

export const syntaxHighlighting = {
    keywords: [
      "actions",
      "commands",
      "end",
      "events",
      "initialState",
      "state",
      "statemachine",
    ],
  
    // The main tokenizer for our languages
    tokenizer: {
      root: [
        // identifiers and keywords
        [
          /[a-z_$][\w$]*/,
          {
            cases: {
              "@keywords": "keyword",
              "@default": "identifier",
            },
          },
        ],
  
        // whitespace
        { include: "@whitespace" },
      ],
  
      comment: [
        [/[^\/*]+/, "comment"],
        [/\/\*/, "comment", "@push"], // nested comment
        ["\\*/", "comment", "@pop"],
        [/[\/*]/, "comment"],
      ],
  
      whitespace: [
        [/[ \t\r\n]+/, "white"],
        [/\/\*/, "comment", "@comment"],
        [/\/\/.*$/, "comment"],
      ],
    },
  } as monaco.languages.IMonarchLanguage;
  
export const defaultText = `// Create your own statemachine here!
statemachine TrafficLight

events
    switchCapacity
    next

initialState PowerOff

state PowerOff
    switchCapacity => RedLight
end

state RedLight
    switchCapacity => PowerOff
    next => GreenLight
end

state YellowLight
    switchCapacity => PowerOff
    next => RedLight
end

state GreenLight
    switchCapacity => PowerOff
    next => YellowLight
end`;