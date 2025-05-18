import SpecializedBody from './specializedBody.js';
import MarkupError from '../markupError.js';
import { RegexpResult, ContextArray, StateInterface, ParseMethodReturnType } from '../../../types.js';

/**
 * Second and subsequent explicit markup construct. 
 */
class Explicit extends SpecializedBody {

    /** Footnotes, hyperlink targets, directives, comments. */
    public explicit_markup(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        const [nodelist, blankFinish] = this.explicit_construct(match);
        this.parent!.add(nodelist);
        this.blankFinish = blankFinish;
        return [[], nextState, []];
    }

    /** Determine which explicit construct this is, parse & return it. */
    public explicit_construct(match: any): any {
        const errors = [];
        if (this.explicit) {
            for (const [method, pattern] of this.explicit.constructs) {
                const expmatch = pattern.exec(match.result.input);
                if (expmatch) {
                    try {
                        const r = method(expmatch);
                        //                  console.log(r);
                        return r;
                    } catch (error) {
                        if (error instanceof MarkupError) {
                            const lineno = this.rstStateMachine.absLineNumber();
                            const message = error.message;
                            errors.push(this.reporter!.warning(message, [], { line: lineno }));
                            break;
                        }
                        throw error;
                    }
                }
            }
        }
        const [nodelist, blankFinish] = this.comment(match);
        return [[...nodelist, ...errors], blankFinish];
    }

    /** Anonymous hyperlink targets. */
    public anonymous(match: RegexpResult, context: ContextArray, nextState: StateInterface): any {
        const [nodelist, blankFinish] = this.anonymous_target(match);
        this.parent!.add(nodelist);
        this.blankFinish = blankFinish;
        return [[], nextState, []];
    }

    public blank = () => {
        this.invalid_input();
    };
}

Explicit.stateName = 'Explicit';

export default Explicit;
