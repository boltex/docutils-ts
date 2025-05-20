import { ContextArray, ParseMethodReturnType, RegexpResult, StateInterface } from '../../../types.js';
import SpecializedBody from './specializedBody.js';

/**
 * Second and subsequent lines of a line_block. 
 */
class LineBlock extends SpecializedBody {

    public blank() {
        this.invalid_input();
    }

    /** New line of line block. */
    public line_block(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        const lineno = this.rstStateMachine.absLineNumber();
        const [line, messages, blankFinish] = this.line_block_line(match, lineno);
        this.parent!.add(line);
        this.parent!.parent!.add(messages);
        this.blankFinish = blankFinish;
        return [[], nextState, []];
    }

}

LineBlock.stateName = 'LineBlock';

export default LineBlock;
