import { SubstitutionDefLike } from "./stateTypes.js";
import Body from './body.js';
import { EOFError } from '../../../exceptions.js';
import * as nodes from '../../../nodes.js';
import * as RegExps from '../regExps.js';
import {
    NodeInterface,
    StateInterface,
    RegexpResult,
    ContextArray,
    ParseMethodReturnType,
    Patterns,
} from "../../../types.js";

/**
 * Parser for the contents of a substitution_definition element. 
 */
class SubstitutionDef extends Body implements SubstitutionDefLike {
    public readonly isSubstitutionDef = true as const;
    protected initialTransitions?: (string | string[])[] = ['embedded_directive', 'text'];;
    public patterns: Patterns = {
        embedded_directive: new RegExp(`(${RegExps.simplename})::( +|$)`),
        text: new RegExp(''),
    };

    /** Return a list of nodes. */

    public literal_block(match: {}, context: string[], nextState: StateInterface): NodeInterface[] {
        const [indented, indent, offset, blankFinish] = this.rstStateMachine.getIndented({});
        while (indented && indented.length && !indented[indented.length - 1].trim()) {
            indented.trimEnd();
        }
        if (!indented || !indented.length) {
            return this.quoted_literal_block();
        }
        const data = indented.join('\n');
        const literalBlock = new nodes.literal_block(data, data);
        const [source, line] = this.rstStateMachine.getSourceAndLine(offset + 1);
        if (source !== undefined) {
            literalBlock.source = source;
        }
        if (line !== undefined) {
            literalBlock.line = line;
        }
        const nodelist: NodeInterface[] = [literalBlock];
        if (!blankFinish) {
            nodelist.push(this.unindentWarning('Literal block'));
        }
        return nodelist;
    }

    public quoted_literal_block(): NodeInterface[] {
        const absLineOffset = this.rstStateMachine.absLineOffset();
        const offset = this.rstStateMachine.lineOffset;
        const parentNode = new nodes.Element();
        const newAbsOffset = this.nestedParse(
            this.rstStateMachine.inputLines.slice(offset),
            absLineOffset,
            parentNode,
            false)
        // stateMachineKwargs: {
        //     stateFactory: this.rstStateMachine.stateFactory!.withStateClasses(['QuotedLiteralBlock']),
        //     initialState: 'QuotedLiteralBlock',
        // },

        this.gotoLine(newAbsOffset!);
        return parentNode.getChildren();
    }

    public embedded_directive(match: RegexpResult, context: ContextArray, nextState: StateInterface): void {
        const [nodelist, blankFinish] = this.directive(
            match.result,
            { alt: this.parent!.attributes.names[0] },
        );
        this.parent!.add(nodelist);
        if (!this.rstStateMachine.atEof()) {
            this.blankFinish = blankFinish;
        }
        throw new EOFError();
    }

    public text(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        if (!this.rstStateMachine.atEof()) {
            this.blankFinish = this.rstStateMachine.isNextLineBlank();
        }
        throw new EOFError();
    }
}

SubstitutionDef.stateName = 'SubstitutionDef';

export default SubstitutionDef;
