import { RegexpResult, ContextArray, StateInterface, ParseMethodReturnType } from '../../../types.js';
import SpecializedBody from './specializedBody.js';

/**
 * Second and subsequent field_list fields. 
 */
class FieldList extends SpecializedBody {
    /** Field list field. */
    public field_marker(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        const [field, blankFinish] = this.field(match);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.parent!.add(field);
        this.blankFinish = blankFinish;
        return [[], nextState, []];
    }
}

FieldList.stateName = 'FieldList';

export default FieldList;
