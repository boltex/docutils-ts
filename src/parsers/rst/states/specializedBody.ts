import Body from './body.js';
import { EOFError } from '../../../exceptions.js';
import {
    RegexpResult,
    ContextArray,
    StateInterface,
    ParseMethodReturnType,
} from '../../../types.js';

class SpecializedBody extends Body {

    public indent(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        return this.invalid_input();
    }


    public bullet(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        return this.invalid_input();
    }


    public enumerator(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        return this.invalid_input();
    }


    public field_marker(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        return this.invalid_input();
    }


    public option_marker(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        return this.invalid_input();
    }


    public doctest(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        return this.invalid_input();
    }


    public line_block(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        return this.invalid_input();
    }


    public grid_table_top(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        return this.invalid_input();
    }


    public simple_table_top(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        return this.invalid_input();
    }


    public explicit_markup(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        return this.invalid_input();
    }


    public anonymous(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        return this.invalid_input();
    }


    public line(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        return this.invalid_input();
    }


    public text(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        return this.invalid_input();
    }

    public invalid_input(match?: RegexpResult, context?: ContextArray, nextState?: StateInterface): ParseMethodReturnType {
        this.rstStateMachine.previousLine();
        throw new EOFError();
    }
}
SpecializedBody.stateName = 'SpecializedBody';
//SpecializedBody.constructor.stateName = 'SpecializedBody';
export default SpecializedBody;
