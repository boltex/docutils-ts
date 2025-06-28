import SpecializedBody from './specializedBody.js';
import { RegexpResult, ContextArray, StateInterface, ParseMethodReturnType } from '../../../types.js';

class BulletList extends SpecializedBody {
    public bullet(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        if (match.result.input[0] !== this.parent!.attributes.bullet) {
            this.invalid_input();
        }
        const [listitem, blankFinish] = this.list_item(match.result.index + match.result[0].length);
        this.parent!.add(listitem);
        this.blankFinish = blankFinish;
        return [[], nextState, []];
    }
}

BulletList.stateName = 'BulletList';
export default BulletList;
