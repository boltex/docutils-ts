import RSTState from './rstState.js';
import * as RegExps from '../regExps.js';
import { escapeRegExp } from '../../../utils.js';
import * as nodes from '../../../nodes.js';
import { EOFError } from '../../../exceptions.js';
import {
    RegexpResult,
    ContextArray,
    StateInterface,
    ParseMethodReturnType,
    Patterns,
} from "../../../types.js";

/**
 * Nested parse handler for quoted (unindented) literal blocks.
 * 
 * Special-purpose.  Not for inclusion in `state_classes`.
 */
class QuotedLiteralBlock extends RSTState {
    private initial_lineno?: number;
    protected initialTransitions?: (string | string[])[] = ['initial_quoted', 'text'];
    public patterns: Patterns = {
        initial_quoted: new RegExp(`(${RegExps.nonalphanum7bit})`),
        text: new RegExp(''),
    };

    public blank(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        if (context.length) {
            throw new EOFError();
        } else {
            return [context, nextState, []];
        }
    }

    public eof(context: ContextArray): ContextArray {
        if (context.length) {
            const [src, srcline] = this.rstStateMachine.getSourceAndLine(
                this.initial_lineno,
            );
            const text = context.join('\n');
            const literalBlock = new nodes.literal_block(text, text);
            literalBlock.source = src;
            literalBlock.line = srcline;
            this.parent!.add(literalBlock);
        } else {
            this.parent!.add(this.reporter!.warning(
                'Literal block expected; none found.', [],
                { line: this.rstStateMachine.absLineNumber() },
            ));
            // # src not available, because statemachine.input_lines is empty
            this.rstStateMachine.previousLine();
        }
        this.parent!.add(this.messages);
        return [];
    }

    public indent(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        // assert context, ('QuotedLiteralBlock.indent: context should not '
        // 'be empty!')
        this.messages.push(
            this.reporter!.error('Unexpected indentation.', [],
                { line: this.rstStateMachine.absLineNumber() }),
        );
        this.rstStateMachine.previousLine();
        throw new EOFError();
    }

    /** Match arbitrary quote character on the first line only. */
    public initial_quoted(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {

        this.removeTransition('initial_quoted');
        const quote = match.result.input[0];
        const pattern = new RegExp(escapeRegExp(quote));

        // # New transition matches consistent quotes only:
        this.addTransition('quoted',
            [pattern, this.quoted.bind(this),
                this.constructor.name]);
        // eslint-disable-next-line @typescript-eslint/camelcase
        this.initial_lineno = this.rstStateMachine.absLineNumber();
        return [[match.result.input], nextState, []];
    }

    /** Match consistent quotes on subsequent lines. */
    public quoted(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        context.push(match.result.input);
        return [context, nextState, []];
    }

    public text(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        if (context.length) {
            this.messages.push(
                this.reporter!.error('Inconsistent literal block quoting.',
                    [], { line: this.rstStateMachine.absLineNumber() }),
            );
            this.rstStateMachine.previousLine();
        }
        throw new EOFError();
    }
}

QuotedLiteralBlock.stateName = 'QuotedLiteralBlock';

export default QuotedLiteralBlock;
