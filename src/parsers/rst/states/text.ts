import RSTState from './rstState.js';
import { columnWidth, isIterable } from '../../../utils.js';
import unescape from '../../../utils/unescape.js';
import * as nodes from '../../../nodes.js';
import * as RegExps from '../regExps.js';
import TransitionCorrection from '../../../transitionCorrection.js';
import UnexpectedIndentationError from '../../../error/unexpectedIndentationError.js';
import { EOFError } from '../../../exceptions.js';
import {
    NodeInterface,
    RegexpResult,
    ContextArray,
    StateInterface,
    ParseMethodReturnType,
    Patterns,
} from '../../../types.js';
import State from "../../../states/state.js";
import NestedStateMachine from "../nestedStateMachine.js";

class Text extends RSTState {
    protected initialTransitions?: (string | string[])[] = [['underline', 'Body'], ['text', 'Body']];
    public patterns: Patterns = {
        underline: new RegExp('^([!-/:-@[-`{-~])\\1* *$'),
        text: new RegExp(''),
    };

    public blank(match: RegexpResult | null, context: ContextArray, nextState: StateInterface | null): any[] {
        const [paragraph, literalNext] = this.paragraph(
            context, this.rstStateMachine.absLineNumber() - 1,
        );
        this.parent!.add(paragraph);
        if (literalNext) {
            this.parent!.add(this.literal_block());
        }

        return [[], 'Body', []];
    }

    public eof(context: ContextArray): ContextArray {
        if ((context != null && !isIterable(context)) || context.length > 0) {
            this.blank(null, context, null);
        }
        return [];
    }

    /** Definition list item. */

    public indent(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        const definitionlist = new nodes.definition_list();
        const [definitionlistitem, blankFinish1] = this.definition_list_item(context);
        let blankFinish = blankFinish1;
        definitionlist.add(definitionlistitem);
        this.parent!.add(definitionlist);
        const offset = this.rstStateMachine.lineOffset + 1;
        const [newlineOffset, blankFinish2] = this.nestedListParse(this.rstStateMachine.inputLines.slice(offset), { inputOffset: this.rstStateMachine.absLineOffset() + 1, node: definitionlist as NodeInterface, initialState: 'DefinitionList', blankFinish, blankFinishState: 'Definition', },);
        blankFinish = blankFinish2;
        this.gotoLine(newlineOffset);
        if (!blankFinish) {
            this.parent!.add(this.unindentWarning('Definition list'));
        }
        return [[], 'Body', []];
    }

    public underline(match: RegexpResult, context: ContextArray, nextState: StateInterface): any[] {
        if (!Array.isArray(context)) {
            throw new Error('Context should be array');
        }
        const lineno = this.rstStateMachine.absLineNumber();
        const title = context[0].trimEnd();
        const underline = match.result.input.trimEnd();
        const source = `${title}\n${underline}`;
        const messages = [];
        if (columnWidth(title) > underline.length) {
            if (underline.length < 4) {
                if (this.rstStateMachine.matchTitles) {
                    const msg = this.reporter!.info(
                        'Possible title underline, too short for the title.\n'
                        + "Treating it as ordinary text because it's so short.", [], { line: lineno },
                    );
                    this.parent!.add(msg);
                    throw new TransitionCorrection('text');
                }
            } else {
                const blocktext = `${context[0]}\n${this.rstStateMachine.line}`;
                const msg = this.reporter!.warning(
                    'Title underline too short.',
                    [new nodes.literal_block(blocktext, blocktext)], { line: lineno },
                );
                messages.push(msg);
            }
        }
        if (!this.rstStateMachine.matchTitles) {
            const blocktext = `${context[0]}\n${this.rstStateMachine.line}`;
            // We need get_source_and_line() here to report correctly
            const [src, srcline] = this.rstStateMachine.getSourceAndLine();
            const msg = this.reporter!.severe(
                'Unexpected section title.',
                [new nodes.literal_block(blocktext, blocktext)], { source: src, line: srcline },
            );
            this.parent!.add(messages);
            this.parent!.add(msg);
            return [[], nextState, []];
        }
        const style = underline[0];
        context.length = 0;
        this.section({
            title, source, style, lineno: lineno - 1, messages,
        });

        return [[], nextState, []];
    }

    public text(match: any, context: string[], nextState: State): any[] {
        const startline = this.rstStateMachine.absLineNumber() - 1;
        let block;
        let msg;
        try {
            block = this.rstStateMachine.getTextBlock(true);
        } catch (error) {
            if (error instanceof UnexpectedIndentationError) {

                block = error.block;
                const src = error.source;
                const srcline = error.lineno;
                msg = this.reporter!.error('Unexpected indentation.', [],
                    { source: src, line: srcline });
            } else {
                throw error;
            }
        }
        const lines = [context, ...(block || [])];
        const [pelems, literalNext] = this.paragraph(lines, startline);
        this.parent!.add(pelems);
        if (msg) {
            this.parent!.add(msg);
        }
        if (literalNext) {
            try {
                this.rstStateMachine.nextLine();
            } catch (error) {
                if (error instanceof EOFError) {
                    /* do nothing */
                } else {
                    throw error;
                }
            }
            this.parent!.add(this.literal_block());
        }
        return [[], nextState, []];
    }

    /** Return a list of nodes. */
    public literal_block(): NodeInterface[] {
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
        literalBlock.source = source;
        literalBlock.line = line;
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
            false,
            (): NestedStateMachine => NestedStateMachine.createStateMachine(this.rstStateMachine, 'QuotedLiteralBlock', this.rstStateMachine.stateFactory!.withStateClasses(['QuotedLiteralBlock'])));

        if (newAbsOffset !== undefined) {
            this.gotoLine(newAbsOffset);
        }
        return parentNode.getChildren();
    }

    public definition_list_item(termline: string[]): [NodeInterface, boolean] {
        const [indented, indent, lineOffset, blankFinish] = this.rstStateMachine.getIndented({});
        const itemnode = new nodes.definition_list_item(
            [...termline, ...indented].join('\b'),
        );
        const lineno = this.rstStateMachine.absLineNumber() - 1;
        [itemnode.source, itemnode.line] = this.rstStateMachine.getSourceAndLine(lineno);
        const [termlist, messages] = this.term(termline, lineno);
        itemnode.add(termlist);
        const definition = new nodes.definition('', messages);
        itemnode.add(definition);
        if (termline[0].endsWith('::')) {
            definition.add(this.reporter!.info(
                'Blank line missing before literal block (after the "::")? '
                + 'Interpreted as a definition list item.', [],
                { line: lineno + 1 },
            ));
        }
        this.nestedParse(indented, lineOffset, definition);
        return [itemnode, blankFinish];
    }

    public term(lines: any[], lineno: number): [NodeInterface[], NodeInterface[]] {
        const [textNodes, messages] = this.inline_text(lines[0], lineno);
        const termNode = new nodes.term(lines[0]);
        //     [termNode.source,
        //     termNode.line] = this.rstStateMachine.getSourceAndLine(lineno)
        const nodeList = [termNode];
        textNodes.forEach((node): void => {
            if (node instanceof nodes.Text) {
                const parts = node.astext().split(RegExps.classifierDelimiterRegexp);
                if (parts.length === 1) {
                    nodeList[nodeList.length - 1].add(node);
                } else {
                    const text = parts[0].trimEnd();
                    const textnode = new nodes.Text(unescape(text, true));
                    nodeList[nodeList.length - 1].add(textnode as NodeInterface);
                    parts.slice(1).forEach((part): void => {
                        nodeList.push(
                            new nodes.classifier(unescape(part, false), part),
                        );
                    });
                }
            } else {
                nodeList[nodeList.length - 1].add(node);
            }
        });
        return [nodeList, messages];
    }
}
Text.stateName = 'Text';
export default Text;
