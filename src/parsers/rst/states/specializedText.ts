import Text from './text.js';
import { EOFError } from '../../../exceptions.js';
import { RegexpResult, ContextArray, StateInterface, ParseMethodReturnType } from "../../../types.js";

class SpecializedText extends Text {


    public blank(match: any, context: any[], nextState: any): any[] {
        throw new EOFError();
    }


    public underline(match: any, context: any[], nextState: any): any[] {
        throw new EOFError();
    }

    public indent(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        throw new EOFError();

    }

    public text(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        throw new EOFError();

    }

    public eof(...args: any): any[] {
        return [];
    }

}

SpecializedText.stateName = 'SpecializedText';

export default SpecializedText;
