import SpecializedBody from './specializedBody.js';
import MarkupError from '../markupError.js';
import { RegexpResult, ContextArray, StateInterface, ParseMethodReturnType } from '../../../types.js';

/**
 * Second and subsequent option_list option_list_items. 
 */
class OptionList extends SpecializedBody {

    /** Option list item. */

    public option_marker(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        let optionListItem;
        let blankFinish;
        try {
            [optionListItem, blankFinish] = this.option_list_item(match);
        } catch (error) {
            if (error instanceof MarkupError) {
                // @ts-ignore
                this.invalid_input();
            }
            throw error;
        }
        this.parent!.add(optionListItem);
        this.blankFinish = blankFinish;
        return [[], nextState, []];
    }
}

OptionList.stateName = 'OptionList';

export default OptionList;
