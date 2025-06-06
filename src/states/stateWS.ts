import State from './state.js';
import StateMachineWS from "../stateMachineWS.js";
import { InvalidStateError } from "../exceptions.js";
import {
    DebugFunction,
    StatemachineInterface,
    StateMachineFactoryFunction,
    RegexpResult,
    ContextArray,
    StateInterface,
    ParseMethodReturnType,
    Patterns,
} from "../types.js";

/**
 * State superclass specialized for whitespace (blank lines & indents).
 * 
 * Use this class with `StateMachineWS`.  The transitions 'blank' (for blank
 * lines) and 'indent' (for indented text blocks) are added automatically,
 * before any other transitions.  The transition method `blank()` handles
 * blank lines and `indent()` handles nested indented blocks.  Indented
 * blocks trigger a new state machine to be created by `indent()` and run.
 * The class of the state machine to be created is in `indent_sm`, and the
 * constructor keyword arguments are in the dictionary `indent_sm_kwargs`.
 * 
 * The methods `known_indent()` and `firstknown_indent()` are provided for
 * indented blocks where the indent (all lines' and first line's only,
 * respectively) is known to the transition method, along with the attributes
 * `known_indent_sm` and `known_indent_sm_kwargs`.  Neither transition method
 * is triggered automatically.
 * 
 */
class StateWS extends State {
    /**
     * The `StateMachine` class handling indented text blocks.
     *
     * If left as ``None``, `indent_sm` defaults to the value of
     * `State.nested_sm`.  Override it in subclasses to avoid the default.
     */
    //public indentSm: StatemachineConstructor<Statemachine> | undefined;
    /**
     *  Keyword arguments dictionary, passed to the `indent_sm` constructor.
     *
     * If left as ``None``, `indent_sm_kwargs` defaults to the value of
     * `State.nested_sm_kwargs`. Override it in subclasses to avoid the default.
     **/
    //public indentSmKwArgs: {} | undefined;

    /**
     *    The `StateMachine` class handling known-indented text blocks.
     *
     * If left as ``None``, `known_indent_sm` defaults to the value of
     * `indent_sm`.  Override it in subclasses to avoid the default.
     */
    //public knownIndentSm: StatemachineConstructor<Statemachine> | undefined;
    /**
     * Keyword arguments dictionary, passed to the `known_indent_sm` constructor.
     *
     * If left as ``None``, `known_indent_sm_kwargs` defaults to the value of
     * `indent_sm_kwargs`. Override it in subclasses to avoid the default.
     */
    //public knownIndentSmKwargs: StateMachineConstructorArgs | undefined;

    /** Patterns for default whitespace transitions.  May be overridden in subclasses. */
    private wsPatterns: Patterns = { blank: /^ *$/, indent: /^ +/ };

    /**
     * Default initial whitespace transitions, added before those listed in
     * `State.initial_transitions`.  May be overridden in subclasses.
     */
    private wsInitialTransitions: string[] | undefined = ['blank', 'indent'];
    //protected nestedSm: StatemachineConstructor<Statemachine> | undefined;
    private wsStateMachine: StateMachineWS;
    private debugFn: DebugFunction = (line): any => { };
    public createIndentedStateMachine: StateMachineFactoryFunction<StatemachineInterface> | undefined;
    public constructor(stateMachine: StateMachineWS, debug: boolean = false) {
        super(stateMachine, debug);
        this.wsStateMachine = stateMachine;
        /* istanbul ignore else */
        /*
        if (!this.indentSm) {
            this.indentSm = this.nestedSm;
        }*/
        /* istanbul ignore else */
        /*if (!this.indentSmKwargs) {
            this.indentSmKwargs = this.nestedSmKwargs;
        }*/
        /* istanbul ignore else */
        /*if (!this.knownIndentSm) {
            this.knownIndentSm = this.indentSm;
        }*/
        /* istanbul ignore else */
        /*if (!this.knownIndentSmKwargs) {
            this.knownIndentSmKwargs = this.indentSmKwargs;
        }*/
    }

    public addInitialTransitions(): void {
        super.addInitialTransitions();
        //this.logger.silly('addInitialTransitions');
        /* Alteration of patterns ! */
        this.patterns = { ...this.patterns, ...this.wsPatterns };
        if (this.wsInitialTransitions === undefined) {
            throw new InvalidStateError();
        }
        const [names, transitions] = this.makeTransitions(this.wsInitialTransitions);
        this.addTransitions(names, transitions);
    }

    public blank(match: RegexpResult, context: ContextArray, nextState: StateInterface): any {
        return this.nop(match, context, nextState);
    }

    public indent(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        const [indented, indent, lineOffset, blankFinish] = this.wsStateMachine.getIndented({});
        if (!this.createIndentStateMachine) {
            throw new InvalidStateError('createIndentStateMachine');
        }
        const sm = this.createIndentStateMachine();
        const results = sm.run(indented, lineOffset);
        return [context, nextState, results];
    }

    public knownIndent(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        const [indented, lineOffset, blankFinish] = this.wsStateMachine.getKnownIndented(
            { indent: match.result.index + match.result[0].length }
            // match.end(), // ORIGINAL PYTHON
        );
        if (this.createKnownIndentStateMachine === undefined) {

            throw new InvalidStateError("Need knownIndentSm");
        }

        const sm = this.createKnownIndentStateMachine();
        const results = sm.run(indented, lineOffset);
        return [context, nextState, results];
    }
    /**
     * Handle an indented text block (first line's indent known).
     *
     * Extend or override in subclasses.
     *
     * Recursively run the registered state machine for known-indent indented
     * blocks (`self.known_indent_sm`). The indent is the length of the
     * match, ``match.end()``.
     */
    public firstKnownIndent(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        const [indented, lineOffset, blankFinish] = this.wsStateMachine.getFirstKnownIndented(
            {
                indent: match.result.index + match.result[0].length,
            },
        );
        let sm: StatemachineInterface;
        if (this.createKnownIndentStateMachine !== undefined) {
            sm = this.createKnownIndentStateMachine();

            const results = sm.run(indented, lineOffset);
            return [context, nextState, results];
        } else {
            throw new InvalidStateError('createKnownIndentStateMAchine');
        }
    }
}

export default StateWS;
