import Body from './body.js';
import { EOFError } from '../../../exceptions.js';
import {
    RegexpResult,
    ContextArray,
    StateInterface,
    ParseMethodReturnType,
} from '../../../types.js';

class SpecializedBody extends Body {
    // @ts-ignore
    public indent(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        // @ts-ignore
        this.invalid_input();
    }

    // @ts-ignore
    public bullet(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        // @ts-ignore
        this.invalid_input();
    }

    // @ts-ignore
    public enumerator(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        // @ts-ignore
        this.invalid_input();
    }

    // @ts-ignore
    public field_marker(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        // @ts-ignore
        this.invalid_input();
    }

    // @ts-ignore
    public option_marker(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        // @ts-ignore
        this.invalid_input();
    }

    // @ts-ignore
    public doctest(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        // @ts-ignore
        this.invalid_input();
    }

    // @ts-ignore
    public line_block(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        // @ts-ignore
        this.invalid_input();
    }

    // @ts-ignore
    public grid_table_top(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        // @ts-ignore
        this.invalid_input();
    }

    // @ts-ignore
    public simple_table_top(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        // @ts-ignore
        this.invalid_input();
    }

    // @ts-ignore
    public explicit_markup(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        // @ts-ignore
        this.invalid_input();
    }

    // @ts-ignore
    public anonymous(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        // @ts-ignore
        this.invalid_input();
    }

    // @ts-ignore
    public line(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        // @ts-ignore
        this.invalid_input();
    }

    // @ts-ignore
    public text(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        // @ts-ignore
        this.invalid_input();
    }

    public invalid_input(match?: RegexpResult, context?: ContextArray, nextState?: StateInterface): ParseMethodReturnType {
        this.rstStateMachine.previousLine();
        throw new EOFError();
    }
}
SpecializedBody.stateName = 'SpecializedBody';
//SpecializedBody.constructor.stateName = 'SpecializedBody';
export default SpecializedBody;
