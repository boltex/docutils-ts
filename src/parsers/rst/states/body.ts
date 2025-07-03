import RSTState from "./rstState.js";
import * as RegExps from "../regExps.js";
import nodesFactory from '../../../nodesFactory.js';
import * as nodes from "../../../nodes.js";
import MarkupError from "../markupError.js";
import { escape2null, extractExtensionOptions, isIterable, pySplit, splitEscapedWhitespace } from "../../../utils.js";
import StringList from "../../../stringList.js";
import * as tableparser from "../tableparser.js";
import { ApplicationError, InvalidStateError } from "../../../exceptions.js";
import TransitionCorrection from "../../../transitionCorrection.js";
import * as directives from "../directives.js";
import UnexpectedIndentationError from "../../../error/unexpectedIndentationError.js";
import RSTStateMachine from "../rstStateMachine.js";
import {
    Options,
    OptionSpec,
    ContextArray,
    NodeInterface,
    ParseMethodReturnType,
    ParseResult,
    RegexpResult,
    StateInterface,
    StateType,
    IsolateTableResult,
} from "../../../types.js";
import {
    BodyState,
    ParserConstructor, DirectiveConstructor, TableData,
    RowData
} from '../types.js';
import { fullyNormalizeName } from "../../../utils/nameUtils.js";

const nonWhitespaceEscapeBefore = RegExps.nonWhitespaceEscapeBefore;
const simplename = RegExps.simplename;

// export type RowData = [number, number, number, StringList][]; // TODO : MAKE SURE THIS IS OK!

function _LoweralphaToInt(s: string): number {
    return s.charCodeAt(0) - 'a'.charCodeAt(0) + 1;
}

function _UpperalphaToInt(s: string): number {
    return s.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
}

function _LowerromanToInt(): number | never {
    throw new Error('_LowerromanToInt implementation missing');
}

function _UpperromanToInt(): number | never {
    throw new Error('_UpperromanToInt implementation missing');
}

export interface ExplicitConstructFunction {
    (match: RegExpExecArray): ParseResult;
}

type BlockMessagesBlankFinish = [StringList | string[], NodeInterface[], boolean];

export type ExplicitConstructTuple = [ExplicitConstructFunction, RegExp, RegExpExecArray];

export interface BodyPats {
    nonalphanum7bit?: string;
    alpha?: string;
    alphanum?: string;
    alphanumplus?: string;
    enum?: string;
    optname?: string;
    optarg?: string;
    shortopt?: string;
    longopt?: string;
    option?: string;
    rparen?: string;
    parens?: string;
    period?: string;
}

export interface EnumFormatInfo {
    prefix: string;
    suffix: string;
    start: number;
    end: number;
}

export interface EnumFormatInfos {
    parens: EnumFormatInfo;
    rparen: EnumFormatInfo;
    period: EnumFormatInfo;
    [name: string]: EnumFormatInfo;
}
export interface EnumSequencePats {
    arabic: string;
    loweralpha: string;
    upperalpha: string;
    lowerroman: string;
    upperroman: string;
    [name: string]: string;
}
export interface EnumConverters {
    arabic: (input: string) => number;
    loweralpha: (input: string) => number;
    upperalpha: (input: string) => number;
    lowerroman: (input: string) => number;
    upperroman: (input: string) => number;
}

export interface SequenceRegexps {
    arabic: (input: string) => RegExp;
    loweralpha: (input: string) => RegExp;
    upperalpha: (input: string) => RegExp;
    lowerroman: (input: string) => RegExp;
    upperroman: (input: string) => RegExp;
};

export interface EnumParseInfo {
    formatinfo?: EnumFormatInfos;
    formats?: string[];
    sequences?: string[];
    sequencepats?: EnumSequencePats;
    converters?: EnumConverters;
    sequenceregexps?: SequenceRegexps;
}

/**
 * Generic classifier of the first line of a block.
 */
class Body extends RSTState implements BodyState {
    private gridTableTopPat?: RegExp;
    /** Enumerated list parsing information. */
    private enum?: EnumParseInfo;
    private attribution_pattern?: RegExp;
    private simpleTableTopPat?: RegExp;
    private pats: BodyPats;
    protected initialTransitions?: (string | string[])[] = [
        "bullet",
        "enumerator",
        "field_marker",
        "option_marker",
        "doctest",
        "line_block",
        "grid_table_top",
        "simple_table_top",
        "explicit_markup",
        "anonymous",
        "line",
        "text"
    ];

    public constructor(stateMachine: RSTStateMachine, debug: boolean = false) {
        super(stateMachine, debug);

        // this.doubleWidthPadChar = tableparser.TableParser.doubleWidthPadChar

        const enum_: EnumParseInfo = {};

        enum_.formatinfo = {
            parens: {
                prefix: "\\(", suffix: "\\)", start: 1, end: 1
            },
            rparen: {
                prefix: "", suffix: "\\)", start: 0, end: -1
            },
            period: {
                prefix: "", suffix: "\\.", start: 0, end: -1
            }
        };

        enum_.formats = Object.keys(enum_.formatinfo);

        enum_.sequences = ["arabic", "loweralpha", "upperalpha",
            "lowerroman", "upperroman"];

        enum_.sequencepats = {
            arabic: "[0-9]+",
            loweralpha: "[a-z]",
            upperalpha: "[A-Z]",
            lowerroman: "[ivxlcdm]+",
            upperroman: "[IVXLCDM]+"
        };

        enum_.converters = {
            arabic: parseInt,
            loweralpha: _LoweralphaToInt,
            upperalpha: _UpperalphaToInt,
            lowerroman: _LowerromanToInt,
            upperroman: _UpperromanToInt
        };

        // @ts-ignore
        enum_.sequenceregexps = {};

        enum_.sequences.forEach((sequence): void => {
            // @ts-ignore
            enum_.sequenceregexps[sequence] = new RegExp(`${enum_.sequencepats[sequence]}$`);
        });
        this.enum = enum_;

        this.gridTableTopPat = new RegExp("\\+-[-+]+-\\+ *$");
        this.simpleTableTopPat = new RegExp("=+( +=+)+ *$");

        const pats: BodyPats = {}
        pats.nonalphanum7bit = "[!-/:-@[-`{-~]";
        pats.alpha = "[a-zA-Z]";
        pats.alphanum = "[a-zA-Z0-9]";
        pats.alphanumplus = "[a-zA-Z0-9_-]";
        pats.enum = `^(${enum_.sequences.filter((name): boolean => name !== undefined).map((name): string => enum_.sequencepats![name!]).join('|')}|#)`;
        pats.optname = `${pats.alphanum}${pats.alphanumplus}*`;
        pats.optarg = `(${pats.alpha}${pats.alphanumplus}*|<[^<>]+>)`;
        pats.shortopt = `(-|\\+)${pats.alphanum}( ?${pats.optarg})?`;
        pats.longopt = `(--|/)${pats.optname}([ =]${pats.optarg})?`;
        pats.option = `(${pats.shortopt}|${pats.longopt})`;
        this.pats = pats;

        // @ts-ignore
        enum_.formats.forEach((format): void => {
            // @ts-ignore
            pats[format] = `(${[enum_.formatinfo[format].prefix, pats.enum, enum_.formatinfo[format].suffix].join("")})`;
        });

        this.patterns = {
            bullet: new RegExp("^[-+*\\u2022\\u2023\\u2043]( +|$)"),
            enumerator: new RegExp(`^(${pats.parens}|${pats.rparen}|${pats.period})( +|$)`),
            field_marker: new RegExp("^:(?![: ])([^:\\\\]|\\\\.|:(?!([ `]|$)))*(?<! ):( +|$)"),
            grid_table_top: this.gridTableTopPat,
            option_marker: new RegExp(`^${pats.option}(, ${pats.option})*(  +| ?$)`),
            doctest: new RegExp("^>>>( +|$)"),
            line_block: new RegExp("^\\|( +|$)"),
            simple_table_top: this.simpleTableTopPat,
            explicit_markup: new RegExp("^\\.\\.( +|$)"),
            anonymous: new RegExp("^__( +|)"),
            line: new RegExp(`^(${pats.nonalphanum7bit})\\1* *$`),
            text: new RegExp(""),
        };

        this.explicit = {
            patterns: {
                target: new RegExp(`^(_|(?!_)(\`?)(?![ \`])(.+?)${nonWhitespaceEscapeBefore})(?<!(?<!\\x00):)${nonWhitespaceEscapeBefore}[ ]?:([ ]+|$)`),
                reference: new RegExp(`^((${simplename})_|\`(?![ ])(.+?)${nonWhitespaceEscapeBefore}\`_)$`), // ((?P<simple>%(simplename)s)_|`(?![ ])(?P<phrase>.+?)%(non_whitespace_escape_before)s`_)$'),
                substitution: new RegExp(`((?![ ])(.+?)${nonWhitespaceEscapeBefore}\\|)([ ]+|$)`)
            }, constructs: [
                [this.footnote.bind(this), new RegExp(`\\.\\.[ ]+\\[([0-9]+|\\#|\\#${simplename}|\\*)\\]([ ]+|$)`)],
                [this.citation.bind(this), new RegExp(`\\.\\.[ ]+\\[(${simplename})\\]([ ]+|$)`)],
                [this.hyperlink_target.bind(this), new RegExp("\\.\\.[ ]+_(?![ ]|$)")],
                [this.substitution_def.bind(this), new RegExp("\\.\\.[ ]+\\|(?![ ]|$)")],
                [this.directive.bind(this), new RegExp(`\\.\\.[ ]+(${simplename})[ ]?::([ ]+|$)`)]
            ]
        };
    }

    public footnote(match: RegExpExecArray): ParseResult {
        const [src, srcline] = this.rstStateMachine.getSourceAndLine();
        const [indented, indent, offset, blankFinish] = this.rstStateMachine.getFirstKnownIndented(
            { indent: match.index! + match[0].length }
        );
        const label = match[1];
        let name = fullyNormalizeName(label);
        const footnote = nodesFactory.footnote(indented.join("\n"));
        if (src !== undefined) {
            footnote.source = src;
        }
        if (srcline !== undefined) {
            footnote.line = srcline;
        }
        if (name[0] === "#") { // auto-numbered
            name = name.substring(1); // autonumber label
            footnote.attributes.auto = 1;
            if (name) {
                footnote.attributes.names.push(name);
            }
            this.document!.noteAutofootnote(footnote);
        } else if (name === "*") { // auto-symbol
            name = "";
            footnote.attributes.auto = "*";
            this.document!.noteSymbolFootnote(footnote);
        } else {
            // manually numbered
            footnote.add(nodesFactory.label("", label));
            footnote.attributes.names.push(name);
            this.document!.noteFootnote(footnote);
        }
        if (name) {
            this.document!.noteExplicitTarget(footnote, footnote);
        } else {
            this.document!.setId(footnote, footnote);
        }

        if (indented && indented.length) {
            this.nestedParse(indented, offset, footnote);
        }
        return [[footnote], blankFinish];
    }

    public citation(match: RegExpExecArray): ParseResult {
        const [src, srcline] = this.rstStateMachine.getSourceAndLine();
        const [indented, indent, offset, blankFinish] = this.rstStateMachine.getFirstKnownIndented({
            indent: match.index + match[0].length
        });
        const label = match[1];
        const name = fullyNormalizeName(label);
        const citation = nodesFactory.citation(indented.join("\n"));

        citation.source = src;
        if (srcline !== undefined) {
            citation.line = srcline;
        }
        citation.add(nodesFactory.label("", label));
        citation.attributes.names.push(name);
        this.document!.noteCitation(citation);
        this.document!.noteExplicitTarget(citation, citation);
        if (indented && indented.length) {
            this.nestedParse(indented, offset, citation);
        }
        return [[citation], blankFinish];
    }

    public hyperlink_target(match: RegExpExecArray): ParseResult {
        if (this.explicit === undefined) {
            throw new InvalidStateError('explicit undefined');
        }
        const pattern = this.explicit.patterns.target;
        const lineno = this.rstStateMachine.absLineNumber();
        const [block, indent, offset, blankFinish] = this.rstStateMachine.getFirstKnownIndented(
            {
                indent: match.index + match[0].length,
                untilBlank: true,
                stripIndent: false
            }
        );
        const blocktext = match.input.substring(0, match.index + match[0].length) + block.join("\n");
        const block2 = new StringList([]);
        block.forEach((line: string): void => {
            block2.push(escape2null(line));
        });
        let escaped = block2[0];
        let blockindex = 0;
        let targetmatch;
        while (true) {
            targetmatch = pattern.exec(escaped);
            if (targetmatch) {
                break;
            }
            blockindex += 1;
            if (blockindex === block2.length) {
                throw new MarkupError("malformed hyperlink target.");
            }
            escaped += block2[blockindex];
        }
        block2.splice(0, blockindex);
        block2[0] = (`${block2[0]} `).substring(targetmatch.index + targetmatch[0].length - escape.length + 1).trim();
        const target = this.make_target(block2, blocktext, lineno,
            targetmatch[3]);
        if (target === undefined) {
            throw new InvalidStateError('target should be defined');
        }
        return [[target], blankFinish];
    }

    public make_target(block: StringList, blockText: string, lineno: number, target_name: string): NodeInterface | undefined {
        const [targetType, data, node] = this.parse_target(block, blockText, lineno);
        // console.log(`target type if ${targetType} and data is ${data}`);
        if (targetType === "refname") {
            const target = nodesFactory.target(blockText, "", [], { refname: fullyNormalizeName(data) });
            target.indirectReferenceName = data;
            this.add_target(target_name, "", target, lineno);
            this.document!.noteIndirectTarget(target);
            return target;
        }
        if (targetType === "refuri") {
            const target = nodesFactory.target(blockText, "");
            this.add_target(target_name, data, target, lineno);
            return target;
        }
        return node;
    }

    /**
   Determine the type of reference of a target.

   :Return: A 2-tuple, one of:

   - 'refname' and the indirect reference name
   - 'refuri' and the URI
   - 'malformed' and a system_message node
   */

    public parse_target(block: StringList, blockText: string, lineno: number): [string, string, NodeInterface?] {
        if (block.length && block[block.length - 1].trim().endsWith("_")) {
            const reference = splitEscapedWhitespace(block.join(' ')).map((part): string => pySplit(unescape(part)).join('')).join(' ');
            const refname = this.is_reference(reference);
            if (refname) {
                return ["refname", refname];
            }
        }
        const refParts = splitEscapedWhitespace(block.join(" "));
        const reference = refParts.map((part): string => pySplit(unescape(part)).join("")).join(" ");
        return ["refuri", reference];
    }

    public is_reference(reference: string): string | undefined {
        if (this.explicit === undefined) {
            throw new InvalidStateError('explicit undefined');

        }
        const match = this.explicit.patterns.reference.exec(
            `^${nodes.whitespaceNormalizeName(reference)}`
        );
        if (!match) {
            return undefined;
        }
        return unescape(match[2] ? match[2] : match[3]);
    }

    public add_target(targetname: string, refuri: string, target: NodeInterface, lineno: number): void {
        target.line = lineno;
        if (targetname) {
            const name = fullyNormalizeName(unescape(targetname));
            target.attributes.names.push(name);
            if (refuri) {
                const uri = this.inliner!.adjustUri(refuri);
                if (uri) {
                    target.attributes.refuri = uri;
                } else {
                    throw new ApplicationError(`problem with URI: ${refuri}`);
                }
            }
            this.document!.noteExplicitTarget(target, this.parent);
        } else {
            // # anonymous target
            if (refuri) {
                target.attributes.refuri = refuri;
            }
            target.attributes.anonymous = 1;
            this.document!.noteAnonymousTarget(target);
        }
    }

    public substitution_def(match: RegExpExecArray): ParseResult {
        if (this.explicit === undefined) {
            throw new InvalidStateError('explicit undefined');
        }
        const pattern = this.explicit.patterns.substitution;
        const [src, srcline] = this.rstStateMachine.getSourceAndLine();
        const matchEnd = match.index + match[0].length;
        let myBlankFinish;
        const [block, indent,
            offset, blankFinish] = this.rstStateMachine.getFirstKnownIndented({ indent: matchEnd, stripIndent: false });

        myBlankFinish = blankFinish;
        let myOffset = offset;
        // unuseD? fixme
        const blockText = (match.input.substring(0, matchEnd) + block.join("\n"));
        block.disconnect();
        let escaped = escape2null(block[0].trimEnd());
        let blockIndex = 0;
        let subDefMatch!: RegExpExecArray; // Would throw if not initialized in the while loop below.
        let done = false;
        while (!done) {
            subDefMatch = pattern.exec(escaped)!;
            if (subDefMatch) {
                done = true;
            } else {
                blockIndex += 1;
                try {
                    escaped = `${escaped} ${escape2null(block[blockIndex].trim())}`;
                } catch (error) {
                    throw new MarkupError("malformed substitution definition.");
                }
            }
        }

        const subDefMatchEnd = subDefMatch.index + subDefMatch[0].length;
        block.splice(0, blockIndex);// strip out the substitution marker
        const tmpLine = `${block[0].trim()} `;
        block[0] = tmpLine.substring(subDefMatchEnd - escaped.length - 1, tmpLine.length - 1);
        if (!block[0]) {
            block.splice(0, 1);
            myOffset += 1;
        }
        while (block.length && !block[block.length - 1].trim()) {
            block.pop();
        }

        const subname = subDefMatch[2];
        const substitutionNode: nodes.substitution_definition = nodesFactory.substitution_definition(blockText);
        substitutionNode.source = src;
        if (srcline !== undefined) {
            substitutionNode.line = srcline;
        }
        if (!block.length) {
            const msg = this.reporter!.warning(
                `Substitution definition "${subname}" missing contents.`,
                [nodesFactory.literal_block(blockText, blockText)],
                { source: src, line: srcline }
            );
            return [[msg], myBlankFinish];
        }
        block[0] = block[0].trim();
        substitutionNode.attributes.names.push(
            nodes.whitespaceNormalizeName(subname)
        );
        const [newAbsOffset, blankFinish2] = this.nestedListParse(block, { inputOffset: myOffset, node: substitutionNode, initialState: "SubstitutionDef", blankFinish: myBlankFinish });
        myBlankFinish = blankFinish2;
        let i = 0;
        substitutionNode.getChildren().slice().forEach((node): void => {
            // this is a mixin check!!
            if (!(node.isInline()
                || node instanceof nodes.Text)) {
                this.parent!.add(substitutionNode.getChild(0));
                substitutionNode.removeChild(i);
            } else {
                i += 1;
            }
        });
        const result = substitutionNode.traverse({ condition: nodes.Element }).map((node: NodeInterface): ParseResult | undefined => {
            if (this.disallowedInsideSubstitutionDefinitions(node)) {

                const pformat = nodesFactory.literal_block("", node.pformat().trimEnd());

                const msg = this.reporter!.error(
                    `Substitution definition contains illegal element <${node.tagname}>:`,
                    [pformat, nodesFactory.literal_block(blockText, blockText)],
                    { source: src, line: srcline }
                );
                return [[msg], blankFinish];
            }
            return undefined;
        }).filter((x: ParseResult | undefined): boolean => x !== undefined);
        if (result.length) {
            return result[0]!;
        }
        if (!substitutionNode.hasChildren()) {
            const msg = this.reporter!.warning(
                `Substitution definition "${subname}" empty or invalid.`,
                [nodesFactory.literal_block(blockText, blockText)],
                { source: src, line: srcline }
            );
            return [[msg], blankFinish];
        }
        this.document!.noteSubstitutionDef(
            substitutionNode, subname, this.parent!
        );
        return [[substitutionNode], blankFinish];
    }

    public disallowedInsideSubstitutionDefinitions(node: NodeInterface): boolean {

        if (((node.attributes && node.attributes.ids && node.attributes.ids.length) || node instanceof nodes.reference
            || node instanceof nodes.footnote_reference) && node.attributes.auto) {
            return true;
        }
        return false;
    }

    /** Returns a 2-tuple: list of nodes, and a "blank finish" boolean. */
    public directive(match: RegExpExecArray, optionPresets: any): ParseResult {
        const typeName = match[1];
        if (typeof typeName === "undefined") {
            throw new Error("need typename");
        }

        let language = this.memo && this.memo.language;
        const [directiveClass, messages] = directives.directive(
            typeName, this.document!, language
        );
        this.parent!.add(messages);
        if (directiveClass) {
            return this.runDirective(
                directiveClass, match, typeName, optionPresets
            );
        }
        return this.unknown_directive(typeName);
    }

    /**
   * Parse a directive then run its directive function.
   *
   * Parameters:
   *
   * - `directive`: The class implementing the directive.  Must be
   * a subclass of `rst.Directive`.
   *
   * - `match`: A regular expression match object which matched the first
   * line of the directive.
   *
   * - `typeName`: The directive name, as used in the source text.
   *
   * - `option_presets`: A dictionary of preset options, defaults for the
   * directive options.  Currently, only an "alt" option is passed by
   * substitution definitions (value: the substitution name), which may
   * be used by an embedded image directive.
   *
   * Returns a 2-tuple: list of nodes, and a "blank finish" boolean.
   **/

    public runDirective(directiveClass: DirectiveConstructor, match: RegExpExecArray, typeName: string, option_presets: any): ParseResult {
        /*        if isinstance(directive, (FunctionType, MethodType)):
                  from docutils.parsers.rst import convert_directive_function
                  directive = convert_directive_function(directive)
        */
        const lineno = this.rstStateMachine.absLineNumber();
        const initialLineOffset = this.rstStateMachine.lineOffset;
        const [indented, indent, lineOffset, blankFinish] = this.rstStateMachine.getFirstKnownIndented(
            {
                indent: match.index + match[0].length,
                stripTop: false
            }
        );
        const blockText = this.rstStateMachine.inputLines.slice(
            initialLineOffset, this.rstStateMachine.lineOffset + 1
        ).join('\n');
        let args: string[] = [];
        let options: Options | undefined;
        let content: StringList | undefined;
        let contentOffset: number;
        /*        try {*/

        [args, options, content, contentOffset] = this.parseDirectiveBlock(
            indented,
            lineOffset,
            directiveClass,
            option_presets
        );
        /*        } catch (error) {
                if (error instanceof MarkupError) {
                    const err = this.reporter!.error(`Error in "${typeName}" directive:\n${error.args.join(' ')}`,
                                                    [nodesFactory.literal_block(blockText, blockText)],
                                                    { line: lineno });
                    return [[err], blankFinish];
                }
            }
            */
        const directiveInstance = new directiveClass(
            {
                name: typeName,
                args: args,
                options: options!,
                content: content!,
                lineno: lineno,
                contentOffset: contentOffset,
                blockText: blockText,
                state: this,
                stateMachine: this.rstStateMachine
            }
        );
        let result;
        try {
            result = directiveInstance.run();
        } catch (error) {
            let level = 3; // Default error level
            let msg = 'Unknown error occurred';

            // Check if it's the expected error type
            if (error && typeof error === 'object' && 'level' in error && 'msg' in error) {
                level = (error as any).level;
                msg = (error as any).msg;
            } else if (error instanceof Error) {
                msg = error.message;
            }

            const msgNode = this.reporter!.systemMessage(
                level, msg, [], { line: lineno }
            );
            msgNode.add(nodesFactory.literal_block(blockText, blockText));
            result = [msgNode];
        }
        /*        assert isinstance(result, list), \
              'Directive "%s" must return a list of nodes.' % typeName
              for i in range(len(result)):
              assert isinstance(result[i], nodes.Node), \
              ('Directive "%s" returned non-Node object (index %s): %r'
              % (typeName, i, result[i]))
    */
        return [result,
            blankFinish || this.rstStateMachine.isNextLineBlank()];
    }

    public unknown_directive(typeName: string): ParseResult {
        const lineno = this.rstStateMachine.absLineNumber();
        const [indented,
            indent,
            offset,
            blankFinish] = this.rstStateMachine.getFirstKnownIndented({ indent: 0, stripIndent: false });
        const text = indented.join("\n");
        const error = this.reporter!.error(
            `Unknown directive type "${typeName}".`,
            [nodesFactory.literal_block(text, text)], { line: lineno }
        );
        return [[error], blankFinish];
    }

    public comment(match: RegexpResult): ParseResult {
        const matchEnd = match.result.index + match.result[0].length;
        if (!match.result.input.substring(matchEnd).trim()
            && this.rstStateMachine.isNextLineBlank()) { // # an empty comment?
            return [[nodesFactory.comment()], true]; // "A tiny but practical wart."
        }
        const [indented,
            indent, offset,
            blankFinish] = this.rstStateMachine.getFirstKnownIndented({ indent: matchEnd });
        while (indented && indented.length && !indented[indented.length - 1].trim()) {
            indented.trimEnd();
        }
        const text = indented.join("\n");
        return [[nodesFactory.comment(text, text)], blankFinish];
    }

    /** Footnotes, hyperlink targets, directives, comments. */

    public explicit_markup(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        const r = this.explicit_construct(match);
        if (!isIterable(r)) {
            throw new Error("");
        }
        const [nodelist, blankFinish] = r;
        this.parent!.add(nodelist);
        this.explicit_list(blankFinish);
        return [[], nextState, []];
    }

    /** Determine which explicit construct this is, parse & return it. */

    public explicit_construct(match: RegexpResult): ParseResult {
        if (this.explicit === undefined) {
            throw new InvalidStateError('explicit undefined');
        }
        const errors = [];
        if (Object.keys(this.explicit).length === 0) {
            throw new Error(`invalid state!`);
        }
        if (this.explicit.constructs === undefined
            || this.explicit.constructs.map === undefined) {
            throw new Error('invalid state');
        }
        const r = this.explicit.constructs.map(
            ([method, pattern]): ExplicitConstructTuple => [method, pattern, pattern.exec(match.result.input)!]
        );
        const r2 = r
            .find((x: ExplicitConstructTuple): boolean => x[2] && x[0] !== undefined);
        if (r2) {
            const [method, pattern, expmatch] = r2;
            try {
                // direct return of method result - returns ParseResult
                return method(expmatch);
            } catch (error) {
                if (error instanceof MarkupError) {
                    const lineno = this.rstStateMachine.absLineNumber();
                    const message = error.message;//args ? error.args.join(" ") : "";
                    errors.push(this.reporter!.warning(message, [], { line: lineno }));
                } else {
                    throw error;
                }
            }
        }

        const [nodelist, blankFinish] = this.comment(match);
        return [[...nodelist, ...errors], blankFinish];
    }

    /**
     * Create a nested state machine for a series of explicit markup
     * constructs (including anonymous hyperlink targets).
     */
    public explicit_list(blankFinish: boolean): void {
        const offset = this.rstStateMachine.lineOffset + 1; // next line
        const [newlineOffset, blankFinish1] = this.nestedListParse(
            this.rstStateMachine.inputLines.slice(offset),
            {
                inputOffset: this.rstStateMachine.absLineOffset() + 1,
                node: this.parent,
                initialState: "Explicit",
                blankFinish,
                matchTitles: this.rstStateMachine.matchTitles,
            });
        this.gotoLine(newlineOffset);
        if (!blankFinish1) {
            this.parent!.add(this.unindentWarning("Explicit markup"));
        }
    }

    /** Anonymous hyperlink targets. */
    public anonymous(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        const [nodelist, blankFinish] = this.anonymous_target(match);
        this.parent!.add(nodelist);
        this.explicit_list(blankFinish);
        return [[], nextState, []];
    }

    public anonymous_target(match: RegexpResult): ParseResult {
        const lineno = this.rstStateMachine.absLineNumber();
        const [block, indent, offset, blankFinish] = this.rstStateMachine.getFirstKnownIndented({
            indent: match.result.index + match.result[0].length,
            untilBlank: true
        });
        const blocktext = match.result.input.substring(0, match.result.index + match.result[0].length) + block.join("\n");
        const blockLines: string[] = [];
        block.forEach((line: string): void => {
            blockLines.push(escape2null(line));
        });
        const block2 = new StringList(blockLines);

        const target = this.make_target(block2, blocktext, lineno, "");
        return [target !== undefined ? [target] : [], blankFinish];
    }

    public indent(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        const [indented, indent, lineOffset, blankFinish] = this.rstStateMachine.getIndented({});
        if (indented === undefined) {
            throw new Error();
        }
        const elements = this.block_quote(indented, lineOffset);
        this.parent!.add(elements);
        if (!blankFinish) {
            this.parent!.add(this.unindentWarning("Block quote"));
        }
        return [context, nextState, []];
    }

    public block_quote(indented: StringList, lineOffset: number): NodeInterface[] {
        if (!indented) {
            throw new Error();
        }
        const elements = [];
        while (indented && indented.length) {
            const [blockquoteLines,
                attributionLines,
                attributionOffset,
                outIndented,
                newLineOffset] = this.split_attribution(indented, lineOffset);
            const blockquote = nodesFactory.block_quote();
            indented = outIndented!;
            this.nestedParse(blockquoteLines!, lineOffset, blockquote);
            elements.push(blockquote);
            if (attributionLines) { // fixme

                const [attribution, messages] = this.parse_attribution(attributionLines, attributionOffset!);
                blockquote.add(attribution);
                elements.push(...messages);
            }
            lineOffset = newLineOffset!;
            while (indented && indented.length && !indented[0]) {
                indented = indented.slice(1);
                lineOffset += 1;
            }
        }
        return elements;
    }

    public split_attribution(indented: StringList, lineOffset: number): [StringList | undefined, StringList | undefined, number | undefined, StringList | undefined, number | undefined] {
        this.attribution_pattern = new RegExp("(---?(?!-)|\\u2014) *(?=[^ \\n])");
        let blank;
        let nonblankSeen = false;
        for (let i = 0; i < indented.length; i += 1) {
            const line = indented[i].trimEnd();
            if (line) {
                if (nonblankSeen && blank === i - 1) {
                    const match = this.attribution_pattern.exec(line);
                    if (match) {
                        const [attributionEnd, indent] = this.check_attribution(indented, i);
                        if (attributionEnd) {
                            const aLines = indented.slice(i, attributionEnd);
                            aLines.trimLeft(match.index + match[0].length, undefined, 1);
                            aLines.trimLeft(indent, 1);
                            return [
                                indented.slice(0, i), aLines,
                                i, indented.slice(attributionEnd),
                                lineOffset + attributionEnd
                            ];
                        }
                    }
                }
                nonblankSeen = true;
            } else {
                blank = i;
            }
        }
        return [indented, undefined, undefined, undefined, undefined];
    }

    public check_attribution(indented: StringList, attributionStart: any): any {
        let indent = null;
        let i;
        for (i = attributionStart + 1; i < indented.length; i += 1) {
            const line = indented[i].trimEnd();
            if (!line) {
                break;
            }
            if (indent == null) {
                indent = line.length - line.trimLeft().length;
            } else if ((line.length - line.lstrip().length) !== indent) {
                return [null, null]; // bad shape; not an attribution
            }
        }
        if (i === indented.length) {
            i += 1;
        }
        return [i, indent || 0];
    }

    /** Enumerated List Item */
    public enumerator(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {

        const [format, sequence, text, ordinal]: [string, string, string, number] = this.parseEnumerator(match);

        if (!this.isEnumeratedListItem(ordinal, sequence, format)) {
            throw new TransitionCorrection("text");
        }
        const enumlist = nodesFactory.enumerated_list();
        this.parent!.add(enumlist);
        if (sequence === "#") {
            enumlist.enumtype = "arabic";
        } else {
            enumlist.enumtype = sequence;
        }
        enumlist.prefix = this.enum!.formatinfo![format].prefix;
        enumlist.suffix = this.enum!.formatinfo![format].suffix;
        if (ordinal !== 1) {
            enumlist.start = ordinal;
            const msg = this.reporter!.info(
                `Enumerated list start value not ordinal-1: "${text}" (ordinal ${ordinal})`
            );
            this.parent!.add(msg);
        }
        const [listitem, blankFinish1] = this.list_item(match.result.index + match.result[0].length);
        let blankFinish = blankFinish1;
        enumlist.add(listitem);
        const offset = this.rstStateMachine.lineOffset + 1; // next line
        const [newlineOffset, blankFinish2] = this.nestedListParse(this.rstStateMachine.inputLines.slice(offset), { inputOffset: this.rstStateMachine.absLineOffset() + 1, node: enumlist, initialState: "EnumeratedList", blankFinish, extraSettings: { lastordinal: ordinal, format, auto: sequence === "#" } });
        blankFinish = blankFinish2;
        this.gotoLine(newlineOffset);
        if (!blankFinish) {
            this.parent!.add(this.unindentWarning("Enumerated list"));
        }
        return [[], nextState, []];
    }

    public parse_attribution(indented: string[], lineOffset: number): [NodeInterface, NodeInterface[]] {
        const text = indented.join("\n").trimEnd();
        const lineno = this.rstStateMachine.absLineNumber() + lineOffset;
        const [textnodes, messages] = this.inline_text(text, lineno);
        const anode = nodesFactory.attribution(text, "", textnodes);
        const [source, line] = this.rstStateMachine.getSourceAndLine(lineno);
        anode.source = source;
        if (line !== undefined) {
            anode.line = line;
        }
        return [anode, messages];
    }

    public bullet(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        const bulletlist = nodesFactory.bullet_list();
        let sourceAndLine = this.rstStateMachine.getSourceAndLine();
        bulletlist.source = sourceAndLine[0];
        if (sourceAndLine[1] !== undefined) {
            bulletlist.line = sourceAndLine[1];
        }
        if (!this.parent) {
            throw new Error("no parent");
        }

        this.parent.add(bulletlist);
        bulletlist.attributes.bullet = match.result[0].substring(0, 1);

        const [i, blankFinish1] = this.list_item(
            match.pattern.lastIndex + match.result[0].length
        ); /* -1 ? */
        let blankFinish = blankFinish1;
        if (!i) {
            throw new Error("no node");
        }

        bulletlist.append(i);
        const offset = this.rstStateMachine.lineOffset + 1;
        const [newLineOffset, blankFinish2] = this.nestedListParse(this.rstStateMachine.inputLines.slice(offset), { inputOffset: this.rstStateMachine.absLineOffset() + 1, node: bulletlist, initialState: "BulletList", blankFinish });
        blankFinish = blankFinish2;
        this.gotoLine(newLineOffset);
        if (!blankFinish) {
            this.parent.add(this.unindentWarning("Bullet list"));
        }
        return [[], nextState, []];
    }

    public list_item(indent: number): [NodeInterface, boolean] {
        //      console.log(`in list_item (indent=${indent})`);
        if (indent == null) {
            throw new Error("Need indent");
        }

        let indented;
        let lineOffset;
        let blankFinish;
        let outIndent;
        if (this.rstStateMachine.line.length > indent) {
            //          console.log(`get known indentd`);
            [indented, lineOffset, blankFinish] = this.rstStateMachine.getKnownIndented({ indent });
        } else {
            [indented, outIndent, lineOffset, blankFinish] = (
                this.rstStateMachine.getFirstKnownIndented({ indent }));
        }
        const listitem = nodesFactory.list_item(indented.join("\n"));
        if (indented && indented.length) { // fixme equivalent?
            this.nestedParse(indented,
                lineOffset,
                listitem
            );
        }
        return [listitem, blankFinish];
    }

    /**
     * Construct and return the next enumerated list item marker, and an
     * auto-enumerator ("#" instead of the regular enumerator).
     *
     * Return ``None`` for invalid (out of range) ordinals.
     */
    public make_enumerator(ordinal: number, sequence: string, format: string): [string, string] | undefined {
        /*
        let enumerator: string|undefined;
            if(sequence === '#') {
                enumerator = '#'
            else if(sequence === 'arabic') {
                enumerator = ordinal.toString();
            }else {
                if(sequence.endsWith('alpha')) {
                    if(ordinal > 26) {
                        return undefined;
                    }
                //  enumerator = chr(ordinal + ord('a') - 1)
                } else if(sequence.endsWith('roman')) {
                try {
                    try:
                        enumerator = roman.toRoman(ordinal)
                    except roman.RomanError:
                        return None
                else:                       # shouldn't happen
                    raise ParserError('unknown enumerator sequence: "%s"'
                                      % sequence)
                if sequence.startswith('lower'):
                    enumerator = enumerator.lower()
                elif sequence.startswith('upper'):
                    enumerator = enumerator.upper()
                else:                       # shouldn't happen
                    raise ParserError('unknown enumerator sequence: "%s"'
                                      % sequence)
            formatinfo = self.enum.formatinfo[format]
            next_enumerator = (formatinfo.prefix + enumerator + formatinfo.suffix
                               + ' ')
            auto_enumerator = formatinfo.prefix + '#' + formatinfo.suffix + ' '
            return next_enumerator, auto_enumerator
        */
        return undefined;
    }

    /**
     * Transition function for field_maker. Performs a nested list parse.
     */
    public field_marker(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        const fieldList = nodesFactory.field_list();
        this.parent!.add(fieldList);
        const [field, blankFinish1] = this.field(match);
        let blankFinish = blankFinish1;
        fieldList.add(field);
        const offset = this.rstStateMachine.lineOffset + 1;
        const [newlineOffset, blankFinish2] = this.nestedListParse(
            this.rstStateMachine.inputLines.slice(offset),
            {
                inputOffset: this.rstStateMachine.absLineOffset() + 1,
                node: fieldList,
                initialState: "FieldList",
                blankFinish,
            });
        blankFinish = blankFinish2;
        this.gotoLine(newlineOffset);
        if (!blankFinish) {
            this.parent!.add(this.unindentWarning("Field list"));
        }
        return [[], nextState, []];
    }

    public field(match: RegexpResult): [NodeInterface, boolean] {
        const name = this.parse_field_marker(match);
        const [src, srcline] = this.rstStateMachine.getSourceAndLine();
        const lineno = this.rstStateMachine.absLineNumber();
        const [indented, indent, lineOffset, blankFinish] = this.rstStateMachine.getFirstKnownIndented(
            { indent: match.result.index + match.result[0].length }
        );
        const fieldNode = nodesFactory.field();
        fieldNode.source = src;
        if (srcline !== undefined) {
            fieldNode.line = srcline;

        }
        const [nameNodes, nameMessages] = this.inline_text(name, lineno);
        fieldNode.add(nodesFactory.field_name(name, "", nameNodes, {}));
        const fieldBody = nodesFactory.field_body(
            indented.join("\n"), nameMessages, {}
        );
        fieldNode.add(fieldBody);
        if (indented && indented.length) {
            this.parse_field_body(indented, lineOffset, fieldBody);
        }
        return [fieldNode, blankFinish];
    }

    /** Extract & return field name from a field marker match. */

    public parse_field_marker(match: RegexpResult): string {
        let field = match.result[0].substring(1);
        field = field.substring(0, field.lastIndexOf(":"));
        return field;
    }

    public parse_field_body(indented: StringList, offset: number, node: NodeInterface): void {
        this.nestedParse(indented, offset, node);
    }

    /** Option list item. */

    public option_marker(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        const optionlist = nodesFactory.option_list();
        const [source, line] = this.rstStateMachine.getSourceAndLine();
        let listitem: NodeInterface;
        let blankFinish;
        try {
            [listitem, blankFinish] = this.option_list_item(match);
        } catch (error) {
            if (error instanceof MarkupError) {
                // This shouldn't happen; pattern won't match.
                const msg = this.reporter!.error(`Invalid option list marker: ${error}`);
                this.parent!.add(msg);
                const [indented, indent, lineOffset, blankFinish2] = this.rstStateMachine.getFirstKnownIndented({
                    indent: match.result.index + match.result[0].length
                });
                blankFinish = blankFinish2;
                const elements = this.block_quote(indented, lineOffset);
                this.parent!.add(elements);
                if (!blankFinish) {
                    this.parent!.add(this.unindentWarning("Option list"));
                }
                return [[], nextState, []];
            }
            throw error;
        }
        this.parent!.add(optionlist);
        optionlist.add(listitem);
        const offset = this.rstStateMachine.lineOffset + 1; // next line
        const [newlineOffset, blankFinish3] = this.nestedListParse(this.rstStateMachine.inputLines.slice(offset), { inputOffset: this.rstStateMachine.absLineOffset() + 1, node: optionlist, initialState: "OptionList", blankFinish });
        blankFinish = blankFinish3;
        this.gotoLine(newlineOffset);
        if (!blankFinish) {
            this.parent!.add(this.unindentWarning("Option list"));
        }
        return [[], nextState, []];
    }

    public option_list_item(match: RegexpResult): [NodeInterface, boolean] {
        const offset = this.rstStateMachine.absLineOffset();
        const options = this.parse_option_marker(match);
        const [indented, indent, lineOffset, blankFinish] = this.rstStateMachine.getFirstKnownIndented(
            { indent: match.result.index + match.result[0].length }
        );
        if (!indented || !indented.length) { //  not an option list item
            this.gotoLine(offset);
            throw new TransitionCorrection("text");
        }
        const optionGroup = nodesFactory.option_group("", options);
        const description = nodesFactory.description(indented.join("\n"));
        const optionListItem = nodesFactory.option_list_item("", [optionGroup,
            description]);
        if (indented && indented.length) {
            this.nestedParse(indented,
                lineOffset,
                description
            );
        }
        return [optionListItem, blankFinish];
    }

    /**
     * Return a list of `node.option` and `node.option_argument` objects,
     * parsed from an option marker match.
     *
     * :Exception: `MarkupError` for invalid option markers.
     */
    public parse_option_marker(match: RegexpResult): NodeInterface[] {
        const optlist: NodeInterface[] = [];
        const optionstrings: string[] = match.result[0].trimEnd().split(", ");
        optionstrings.forEach((optionstring): void => {
            const tokens = optionstring.split(/s+/);
            let delimiter = " ";
            const firstopt = tokens[0].split("=", 2);
            if (firstopt.length > 1) {
                // "--opt=value" form
                tokens.splice(0, 1, ...firstopt); // fixme check
                delimiter = "=";
            } else if (tokens[0].length > 2
                && ((tokens[0].indexOf("-") === 0
                    && tokens[0].indexOf("--") !== 0)
                    || tokens[0].indexOf("+") === 0)) {
                // "-ovalue" form
                tokens.splice(0, 1, tokens[0].substring(0, 2), tokens[0].substring(2));
                delimiter = "";
            }
            if ((tokens.length > 1) && (tokens[1].startsWith("<")
                && tokens[-1].endsWith(">"))) {
                // "-o <value1 value2>" form; join all values into one token
                tokens.splice(1, tokens.length, tokens.slice(1).join(""));
            }
            if ((tokens.length > 0) && (tokens.length <= 2)) {
                const option = nodesFactory.option(optionstring);
                option.add(nodesFactory.option_string(tokens[0], tokens[0]));
                if (tokens.length > 1) {
                    option.add(nodesFactory.option_argument(tokens[1], tokens[1],
                        [], { delimiter }));
                }
                optlist.push(option);
            } else {
                throw new MarkupError(`wrong number of option tokens (=${tokens.length}), should be 1 or 2: "${optionstring}"`);
            }
        });
        return optlist;
    }

    public doctest(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        const data = this.rstStateMachine.getTextBlock().join("\n");
        // TODO: prepend class value ['pycon'] (Python Console)
        // parse with `directives.body.CodeBlock` (returns literal-block
        // with class "code" and syntax highlight markup).
        this.parent!.add(nodesFactory.doctest_block(data, data));
        return [[], nextState, []];
    }

    /** First line of a line block. */

    public line_block(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        const block = nodesFactory.line_block();
        this.parent!.add(block);
        const lineno = this.rstStateMachine.absLineNumber();
        const [line, messages, blankFinish1] = this.line_block_line(match, lineno);
        let blankFinish = blankFinish1;
        block.add(line);
        this.parent!.add(messages);
        if (!blankFinish) {
            const offset = this.rstStateMachine.lineOffset + 1; // next line
            const [newLineOffset, blankFinish2] = this.nestedListParse(this.rstStateMachine.inputLines.slice(offset), { inputOffset: this.rstStateMachine.absLineOffset() + 1, node: block, initialState: "LineBlock", blankFinish: false });
            blankFinish = blankFinish2;
            this.gotoLine(newLineOffset);
        }
        if (!blankFinish) {
            this.parent!.add(this.reporter!.warning(
                "Line block ends without a blank line.", [],
                { line: lineno + 1 }
            ));
        }
        if (block.hasChildren()) {
            const child = block.getChild(0);
            // is null something we'll get here?? fixme
            if (child.attributes.indent == null) {
                child.attributes.indent = 0;
            }
            this.nest_line_block_lines(block);
        }
        return [[], nextState, []];
    }

    /** Return one line element of a line_block. */

    public line_block_line(match: RegexpResult, lineno: number): [NodeInterface, NodeInterface[], boolean] {
        const [indented, indent, lineOffset, blankFinish] = this
            .rstStateMachine.getFirstKnownIndented(
                {
                    indent: match.result.index + match.result[0].length,
                    untilBlank: true
                }
            );
        const text = indented.join("\n");
        const [textNodes, messages] = this.inline_text(text, lineno);
        const line = nodesFactory.line(text, "", textNodes);
        if (match.result.input.trimEnd() !== "|") {
            line.indent = match.result[1].length - 1;
        }

        return [line, messages, blankFinish];
    }

    public nest_line_block_lines(block: NodeInterface): void {
        for (let i = 1; i < block.getNumChildren(); i += 1) {
            const child = block.getChild(i) as nodes.line;
            if (child.indent === undefined && i !== 0) {
                child.indent = (block.getChild(i - 1) as nodes.line).indent;
            }
        }
        this.nest_line_block_segment(block);
    }

    public nest_line_block_segment(block: NodeInterface): void {
        const indents: number[] = [];
        let least: number | undefined;
        for (let i = 0; i < block.getNumChildren(); i += 1) {
            const child = block.getChild(i) as nodes.line;
            const indent = child.indent;
            if (least === undefined || indent < least) {
                least = indent;
            }
            indents.push(child.indent);
        }
        const newItems: NodeInterface[] = [];
        let newBlock = nodesFactory.line_block();
        for (let i = 0; i < block.getNumChildren(); i += 1) {
            const item = block.getChild(i) as nodes.line;
            if (item.indent > least!) {
                newBlock.add(item);
            } else {
                if (newBlock.hasChildren()) {
                    this.nest_line_block_segment(newBlock);
                    newItems.push(newBlock);
                    newBlock = nodesFactory.line_block();
                }
                newItems.push(item);
            }
        }
        if (newBlock.hasChildren()) {
            this.nest_line_block_segment(newBlock);
            newItems.push(newBlock);
        }

        for (let i = 0; i < newItems.length; i += 1) {
            block.append(newItems[i]);
        }
    }

    /** Top border of a full table. */

    public grid_table_top(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        return this.table_top(match, context, nextState,
            this.isolate_grid_table.bind(this),
            tableparser.GridTableParser);
    }

    /** Top border of a simple table. */

    public simple_table_top(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        return this.table_top(match, context, nextState,
            this.isolate_simple_table.bind(this),
            tableparser.SimpleTableParser);
    }

    /* Top border of a generic table. */

    public table_top(
        match: RegexpResult,
        context: ContextArray,
        nextState: StateType,
        isolate_function: () => IsolateTableResult,
        parser_class: ParserConstructor
    ): ParseMethodReturnType {
        const [nodelist, blankFinish] = this.table(isolate_function, parser_class);
        this.parent!.add(nodelist);
        if (!blankFinish) {
            const msg = this.reporter!.warning(
                "Blank line required after table.", [],
                { line: this.rstStateMachine.absLineNumber() + 1 }
            );
            this.parent!.add(msg);
        }
        return [[], nextState, []];
    }

    /** Parse a table. */
    public table(isolateFunction: () => IsolateTableResult,
        parserClass: ParserConstructor): ParseResult {
        const r = isolateFunction();
        if (!isIterable(r)) {
            throw new Error();
        }
        const [block, messages, blankFinish]: IsolateTableResult = r;
        let nodelist;
        if (block && block.length) {
            try {
                const parser = new parserClass();
                const tabledata = parser.parse(block);
                const tableline = (this.rstStateMachine.absLineNumber() - block.length + 1);
                const table = this.build_table(tabledata, tableline);
                nodelist = [table, ...messages];
            } catch (error) {
                if (error instanceof tableparser.TableMarkupError) {
                    nodelist = [...this.malformed_table(block, error.message,
                        error.offset), ...messages];
                } else {
                    throw error;
                }
            }
        } else {
            nodelist = messages;
        }
        return [nodelist, blankFinish];
    }

    public isolate_grid_table(): IsolateTableResult {
        const messages = [];
        let block;
        let blankFinish = 1;
        try {
            block = this.rstStateMachine.getTextBlock(true);
        } catch (error) {
            if (error instanceof UnexpectedIndentationError) {
                //                const block2 = error.block;
                const src = error.source;
                const srcline = error.lineno;
                messages.push(this.reporter!.error("Unexpected indentation.", [],
                    { source: src, line: srcline }));
                blankFinish = 0;
            }
        }

        if (!block) {
            throw new Error();
        }

        block.disconnect();
        // for East Asian chars:
        block.padDoubleWidth(this.doubleWidthPadChar!);
        const width = block[0].trim().length;
        for (let i = 0; i < block.length; i += 1) {
            block[i] = block[i].trim();
            if (block[i][0] !== "+" && block[i][0] !== "|") { // check left edge
                blankFinish = 0;
                this.rstStateMachine.previousLine(block.length - i);
                block.splice(i, block.length - i);
                break;
            }
        }
        if (!this.gridTableTopPat!.test(block[block.length - 1])) { // find bottom
            blankFinish = 0;
            // from second-last to third line of table:
            let myBreak = false;
            for (let i = block.length - 2; i >= 1; i -= 1) { // fixme test
                // for i in range(len(block) - 2, 1, -1):
                if (this.gridTableTopPat!.test(block[i])) {
                    this.rstStateMachine.previousLine(block.length - i + 1);
                    block.splice(i + 1, block.length - (i + 1));
                    myBreak = true;
                    break;
                }
            }
            if (!myBreak) {
                messages.push(...this.malformed_table(block));
                return [new StringList([]), messages, blankFinish ? true : false];
            }
        }

        for (let i = 0; i < block.length; i += 1) { // check right edge
            if (block[i].length !== width || !/[+|]/.test(block[i][block[i].length - 1])) {
                messages.push(...this.malformed_table(block));
                return [new StringList([]), messages, blankFinish ? true : false];
            }
        }
        return [block, messages, blankFinish ? true : false];
    }

    public isolate_simple_table(): IsolateTableResult {
        const start = this.rstStateMachine.lineOffset;
        const lines = this.rstStateMachine.inputLines;
        const limit = lines.length - 1;
        const toplen = lines[start].trim().length;
        const patternMatch = RegExps.simpleTableBorderPat.exec.bind(RegExps.simpleTableBorderPat);
        let found = 0;
        let foundAt: number;
        let i = start + 1;
        let myBreak = false;
        let end = 0;
        while (i <= limit) {
            const line = lines[i];
            const match = patternMatch(line);
            if (match) {
                if (line.trim().length !== toplen) {
                    this.rstStateMachine.nextLine(i - start);
                    const messages = this.malformed_table(
                        lines.slice(start, i + 1),
                        "Bottom/header table border does not match top border."
                    );
                    return [new StringList([]), messages, i === limit || !lines[i + 1].trim()];
                }
                found += 1;
                foundAt = i;
                if (found === 2 || i === limit || !lines[i + 1].trim()) {
                    end = i;
                    myBreak = true;
                }
            }
            i += 1;
        }
        let block;
        if (!myBreak) {
            // reached end of input_lines
            let extra;
            if (found) {
                extra = " or no blank line after table bottom";
                this.rstStateMachine.nextLine(foundAt! - start);
                block = lines.slice(start, foundAt! + 1);
            } else {
                extra = "";
                this.rstStateMachine.nextLine(i - start - 1);
                block = lines.slice(start);
            }
            const messages = this.malformed_table(
                block, `No bottom table border found${extra}`
            );
            return [new StringList([]), messages, !extra];
        }
        this.rstStateMachine.nextLine(end! - start);
        block = lines.slice(start, end! + 1);
        // for East Asian chars:
        block.padDoubleWidth(this.doubleWidthPadChar!);
        return [block, [], end === limit || !lines[end! + 1].trim()];
    }

    public malformed_table(block: StringList, detail: string = "", offset: number = 0): NodeInterface[] {
        block.replace(this.doubleWidthPadChar, "");
        const data = block.join("\n");
        let message = "Malformed table.";
        const startline = this.rstStateMachine.absLineNumber() - block.length + 1;
        if (detail) {
            message += `\n${detail}`;
        }
        const error = this.reporter!.error(
            message,
            [nodesFactory.literal_block(data, data)],
            { line: startline + offset }
        );
        return [error];
    }

    public build_table(tabledata: TableData, tableline: number, stubColumns: number = 0, widths?: string): nodes.table {
        const [colwidths, headRows, bodyrows] = tabledata;
        console.warn(headRows);
        const table = nodesFactory.table();
        if (widths === "auto") {
            table.attributes.classes.push("colwidths-auto");
        } else if (widths) { // : # "grid" or list of integers
            table.attributes.classes.push(["colwidths-given"]);
        }
        const tgroup = nodesFactory.tgroup("", [], { cols: colwidths.length });
        table.add(tgroup);
        colwidths.forEach((colwidth: number): void => {
            const colspec = nodesFactory.colspec("", [], { colwidth });
            if (stubColumns) {
                colspec.attributes.stub = 1;
                stubColumns -= 1;
            }
            tgroup.add(colspec);
        });
        if (headRows && headRows.length) {
            const thead = nodesFactory.thead("", [], {});
            tgroup.add(thead);

            headRows.map((row: RowData): nodes.row => this.buildTableRow(row, tableline)).forEach((row: nodes.row): void => thead.add(row));
        }
        const tbody = nodesFactory.tbody();
        tgroup.add(tbody);

        bodyrows.forEach((row: RowData): void => {
            console.warn(row);
        });


        bodyrows.map((row: RowData): nodes.row => this.buildTableRow(row, tableline)).forEach((row: nodes.row): void => tbody.add(row));
        return table;
    }

    public buildTableRow(rowdata: RowData, tableline: number): nodes.row {
        const row = nodesFactory.row("", [], {});

        rowdata.filter((x): boolean => x !== undefined).forEach(([morerows, morecols, offset, cellblock]): void => {
            const attributes: Record<string, any> = {};
            if (morerows) {
                attributes.morerows = morerows;
            }
            if (morecols) {
                attributes.morecols = morecols;
            }
            const entry = nodesFactory.entry("", [], attributes);
            row.add(entry);
            if (cellblock.join("")) {
                this.nestedParse(
                    cellblock,
                    tableline + offset,
                    entry
                );
            }
        });
        return row;
    }

    public line(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        if (this.rstStateMachine.matchTitles) {
            return [[match.input], "Line", []];
        }
        if (match.result.input.trim() === "::") {
            throw new TransitionCorrection("text");
        } else if (match.result.input.trim().length < 4) {
            const msg = this.reporter!.info(
                "Unexpected possible title overline or transition.\n"
                + "Treating it as ordinary text because it's so short.", [],
                { line: this.rstStateMachine.absLineNumber() }
            );
            this.parent!.add(msg);
            throw new TransitionCorrection("text");
        } else {
            const blocktext = this.rstStateMachine.line;
            const msg = this.reporter!.severe(
                "Unexpected section title or transition.",
                [nodesFactory.literal_block(blocktext, blocktext)],
                { line: this.rstStateMachine.absLineNumber() }
            );
            this.parent!.add(msg);
            return [[], nextState, []];
        }
    }


    public text(match: RegexpResult, context: ContextArray, nextState: StateInterface): ParseMethodReturnType {
        if (match.input === undefined) {
            throw new Error("");
        }

        return [[match.input], "Text", []];
    }

    private isEnumeratedListItem(ordinal: number, sequence: string, format: string): boolean {
        return false;
    }

    /**
 *         Analyze an enumerator and return the results.

        :Return:
            - the enumerator format ('period', 'parens', or 'rparen'),
            - the sequence used ('arabic', 'loweralpha', 'upperroman', etc.),
            - the text of the enumerator, stripped of formatting, and
            - the ordinal value of the enumerator ('a' -> 1, 'ii' -> 2, etc.;
              ``None`` is returned for invalid enumerator text).

        The enumerator format has already been determined by the regular
        expression match. If `expected_sequence` is given, that sequence is
        tried first. If not, we check for Roman numeral 1. This way,
        single-character Roman numerals (which are also alphabetical) can be
        matched. If no sequence has been matched, all sequences are checked in
        order.
 */
    private parseEnumerator(match: RegexpResult): [string, string, string, number] {

        return ['', '', '', 0];
    }

    private parseDirectiveBlock(
        indented: StringList,
        lineOffset: number,
        directive: DirectiveConstructor,
        option_presets: Options
    ): [string[], Options, StringList, number] {
        const optionSpec = directive.optionSpec;
        const hasContent = directive.hasContent;
        if (indented && indented.length && !indented[0].trim()) {
            indented.trimStart();
        }
        while (indented && indented.length && !indented[indented.length - 1].trim()) {
            indented.trimEnd();
        }
        let argBlock: StringList = new StringList([]);
        let content: StringList;
        let contentOffset: number;
        let i = 0;
        if (indented && indented.length && (!directive.requiredArguments
            || directive.optionalArguments
            || optionSpec)) {
            i = indented.findIndex(line => !line.trim());
            if (i === -1) {
                i = indented.length;
            }
            argBlock = indented.slice(0, i);
            content = indented.slice(i + 1);
            contentOffset = lineOffset + i + 1;
        } else {
            content = indented;
            contentOffset = lineOffset;
        }
        let options: Options | undefined;
        if (optionSpec && Object.keys(optionSpec).length) {
            [options, argBlock] = this.parseDirectiveOptions(option_presets,
                optionSpec, argBlock);
        } else {
            options = {};
        }
        if (argBlock.length && !(directive.requiredArguments || directive.optionalArguments)) {
            content = new StringList([...argBlock, ...indented.slice(i)]);
            contentOffset = lineOffset;
            argBlock = new StringList([]);
        }
        while (content.length && !content[0].trim()) {
            content.trimStart();
            contentOffset += 1;
        }

        let args: string[] = [];
        if (directive.requiredArguments || directive.optionalArguments) {
            args = this.parseDirectiveArguments(directive, argBlock);
        }
        if (content.length && !hasContent) {
            throw new MarkupError('no content permitted');
        }

        return [args, options!, content, contentOffset];
    }

    // Python equivalent:
    /*
    def parse_directive_block(self, indented, line_offset, directive,
                              option_presets):
        option_spec = directive.option_spec
        has_content = directive.has_content
        if indented and not indented[0].strip():
            indented.trim_start()
            line_offset += 1
        while indented and not indented[-1].strip():
            indented.trim_end()
        if indented and (directive.required_arguments
                         or directive.optional_arguments
                         or option_spec):
            for i, line in enumerate(indented):
                if not line.strip():
                    break
            else:
                i += 1
            arg_block = indented[:i]
            content = indented[i+1:]
            content_offset = line_offset + i + 1
        else:
            content = indented
            content_offset = line_offset
            arg_block = []
        if option_spec:
            options, arg_block = self.parse_directive_options(
                option_presets, option_spec, arg_block)
        else:
            options = {}
        if arg_block and not (directive.required_arguments
                              or directive.optional_arguments):
            content = arg_block + indented[i:]
            content_offset = line_offset
            arg_block = []
        while content and not content[0].strip():
            content.trim_start()
            content_offset += 1
        if directive.required_arguments or directive.optional_arguments:
            arguments = self.parse_directive_arguments(
                directive, arg_block)
        else:
            arguments = []
        if content and not has_content:
            raise MarkupError('no content permitted')
        return arguments, options, content, content_offset
    */

    private parseDirectiveOptions(option_presets: Options, optionSpec: OptionSpec, argBlock: StringList): [Options | undefined, StringList] {
        let options: Options = { ...option_presets };
        let optBlock: StringList;

        let i = argBlock.findIndex((line): boolean => this.patterns.field_marker.test(line));
        if (i !== -1) {
            optBlock = argBlock.slice(i);
            argBlock = argBlock.slice(0);
        } else {
            i = argBlock.length;
            optBlock = new StringList([]);
        }
        if (optBlock.length) {
            const [success, data] = this.parseExtensionOptions(optionSpec, optBlock);
            if (success) {
                options = { ...options, data };
            } else {
                throw new MarkupError(data.toString());
            }
            return [options, argBlock];
        }
        return [undefined, new StringList([])];
    }

    // Original Python
    /*

    def parse_directive_options(self, option_presets, option_spec, arg_block):
        options = option_presets.copy()
        for i, line in enumerate(arg_block):
            if re.match(Body.patterns['field_marker'], line):
                opt_block = arg_block[i:]
                arg_block = arg_block[:i]
                break
        else:
            opt_block = []
        if opt_block:
            success, data = self.parse_extension_options(option_spec,
                                                            opt_block)
            if success:                 # data is a dict of options
                options.update(data)
            else:                       # data is an error string
                raise MarkupError(data)
        return options, arg_block

    */



    /**
   Parse `datalines` for a field list containing extension options
   matching `option_spec`.

   :Parameters:
   - `option_spec`: a mapping of option name to conversion
   function, which should raise an exception on bad input.
   - `datalines`: a list of input strings.

   :Return:
   - Success value, 1 or 0.
   - An option dictionary on success, an error string on failure.
   */
    private parseExtensionOptions(optionSpec: OptionSpec, datalines: StringList): [boolean, Options | string] {
        const node = nodesFactory.field_list();
        const [newlineOffset, blankFinish] = this.nestedListParse(datalines, { inputOffset: 0, node, initialState: "ExtensionOptions", blankFinish: true });
        if (newlineOffset !== datalines.length) { // incomplete parse of block
            return [false, "invalid option block"];
        }
        let options: Options | undefined;
        try {
            options = extractExtensionOptions(node, optionSpec);
        } catch (error) {
        }

        return [true, options!];
        /*          return 0, 'option data incompletely parsed'

   */

        return [false, {}];
    }

    private parseDirectiveArguments(directive: DirectiveConstructor, argBlock: StringList): string[] {
        const required = directive.requiredArguments;
        const optional = directive.optionalArguments;
        const argText = argBlock.join('\n');
        let args: string[] = pySplit(argText);
        if (args.length < required) {
            throw new MarkupError(`${required} argument(s) required, ${args.length} supplied`);
        } else if (args.length > required + optional) {
            if (directive.finalArgumentWhitespace) {
                args = pySplit(argText, required + optional - 1);
            } else {
                throw new MarkupError(
                    `maximum ${required + optional} argument(s) allowed, ${args.length} supplied`);
            }
        }
        return args;
    }

}

Body.stateName = "Body";
export default Body;
