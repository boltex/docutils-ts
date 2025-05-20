import SpecializedBody from './specializedBody.js';
import { RegexpResult, ContextArray, StateInterface, ParseMethodReturnType } from '../../../types.js';

class DefinitionList extends SpecializedBody {

    public text(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        return [[match.result.input], 'Definition', []];
    }
}

DefinitionList.stateName = 'DefinitionList';

export default DefinitionList;
