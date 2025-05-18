import SpecializedText from './specializedText.js';
import { RegexpResult, ContextArray, StateInterface, ParseMethodReturnType } from '../../../types.js';

class Definition extends SpecializedText {

    public eof(context: ContextArray): ContextArray {
        this.rstStateMachine.previousLine(2);
        return [];
    }

    public indent(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        const [itemNode, blankFinish] = this.definition_list_item(context);
        this.parent!.add(itemNode);
        this.blankFinish = blankFinish;
        return [[], 'DefinitionList', []];
    }
}

Definition.stateName = 'Definition';

export default Definition;
