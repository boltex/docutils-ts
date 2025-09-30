import StateWS from "../../../states/stateWS.js";
import NestedStateMachine from "../nestedStateMachine.js";
import * as nodes from "../../../nodes.js";
import { EOFError, InvalidArgumentsError, InvalidStateError } from "../../../exceptions.js";
import {
    Document,
    ElementInterface,
    NodeInterface,
    StateInterface,
    StateMachineFactoryFunction,
    Systemmessage,
    TransitionsArray
} from "../../../types.js";
import StringList from "../../../stringList.js";
import RSTStateMachine from "../rstStateMachine.js";
import { Explicit, InlinerInterface, NestedParseArgs, Nestedstatemachine, RstMemo } from "../types.js";
import { fullyNormalizeName } from "../../../utils/nameUtils.js";

abstract class RSTState extends StateWS {
    public get explicit(): Explicit | undefined {
        return this._explicit;
    }

    public set explicit(value: Explicit | undefined) {
        //        console.log(`explicit ${JSON.stringify(value)}`)
        this._explicit = value;
    }
    // added for us
    public static stateName: string;

    //    protected nestedSm?: StatemachineConstructor<Statemachine> = NestedStateMachine;
    //    private nestedSmCache: Statemachine[] = [];

    private _explicit?: Explicit;
    public memo?: RstMemo;
    public inliner?: InlinerInterface;
    protected parent?: ElementInterface;

    protected rstStateMachine: RSTStateMachine;
    public document?: Document;
    protected stateClasses?: string[];
    public messages: NodeInterface[] = [];

    public blankFinish?: boolean;

    /** Padding character for East Asian double-width text. */
    public doubleWidthPadChar: string = '';

    public constructor(stateMachine: RSTStateMachine, debug: boolean = false) {
        super(stateMachine, debug);
        this.logger = stateMachine.logger;
        //this.logger.silly('constructor');
        this.rstStateMachine = stateMachine;
        this.createNestedStateMachine = (): NestedStateMachine => NestedStateMachine.createStateMachine(this.rstStateMachine);
        //, undefined, this.rstStateMachine.stateFactory!.withStateClasses(["QuotedLiteralBlock"]));
        this.createIndentedStateMachine = this.createNestedStateMachine;
        this.rstStateMachine = stateMachine;
        //this.nestedSm = NestedStateMachine;
        //this.nestedSmCache = [];
        //this.stateClasses = args.stateClasses || [];
        //
        // if(this.stateClasses.length == 0) {
        //     throw new InvalidStateError('No stateClasses')
        // }
        // KM2
        // this.nestedSmKwargs = {
        //     stateFactory: this.rstStateMachine.stateFactory.withStateClasses(this.stateClasses),
        //     initialState: 'Body',
        //     debug: args && stateMachine ? stateMachine.debug : false,
        //     debugFn: args && stateMachine ? stateMachine.debugFn : console.log,
        // };
        //this.logger.silly('end constructor');
    }

    public runtimeInit(): void {
        //  this.logger.silly('runtimeInit');
        super.runtimeInit();
        const { memo } = this.rstStateMachine;
        this.memo = memo;
        if (!memo) {
            throw new Error('need memo')
        }
        this.reporter = memo!.reporter;
        this.inliner = memo!.inliner;
        this.document = memo!.document;
        this.parent = this.rstStateMachine.node;
        if (!this.reporter!.getSourceAndLine) {
            //this.reporter!.getSourceAndLine = this.rstStateMachine.getSourceAndLine;
        }
    }

    public gotoLine(absLineOffset: number): void {
        try {
            this.rstStateMachine.gotoLine(absLineOffset);
        } catch (ex) {
            /* test for eof error? */
        }
    }

    public noMatch(context: any[], transitions: TransitionsArray | undefined): [{}[], (string | StateInterface | undefined), {}[]] {
        this.reporter!.severe(`Internal error: no transition pattern match.  State: "${this.constructor.name}"; transitions: ${transitions}; context: ${context}; current line: ${this.rstStateMachine.line}.`);
        return [context, undefined, []];
    }

    public bof(): string[][] {
        return [[], []];
    }

    public nestedParse(
        inputLines: StringList,
        inputOffset: number,
        node: NodeInterface,
        matchTitles: boolean = false,
        factoryFunction?: StateMachineFactoryFunction<Nestedstatemachine>
    ): number | undefined {
        if (!this.memo || !this.memo.document) {
            throw new Error('need memo');
        }
        let fn: undefined | StateMachineFactoryFunction<Nestedstatemachine>;
        if (factoryFunction !== undefined) {
            fn = factoryFunction;
        } else if (this.createNestedStateMachine !== undefined) {
            fn = this.createNestedStateMachine;

        }
        const block = inputLines;
        if (!block) {
            throw new Error('need block');
        }

        let useDefault = 0;
        /*if (!mCopy.stateMachineClass) {
            mCopy.stateMachineClass = this.nestedSm;
            useDefault += 1;
        }
        if (!mCopy.stateMachineKwargs) {
            mCopy.stateMachineKwargs = this.nestedSmKwargs;
            useDefault += 1;
        }*/
        const blockLength = block.length;
        /*
        let stateMachine;
        if (useDefault === 2 && this.nestedSmCache.length > 0) {
            stateMachine = this.nestedSmCache.pop();
        }

  */
        if (fn === undefined) {
            throw new InvalidStateError('factoryFunction');
        }
        let stateMachine = fn();
        if (stateMachine.run === undefined) {
            throw new InvalidStateError(`stateMachine.run`);
        }
        stateMachine.run(block, inputOffset, undefined,
            undefined, undefined, node, matchTitles, this.memo);

        /*
        if (useDefault === 2) {
            this.nestedSmCache.push(stateMachine);
        } else {
            stateMachine.unlink();
        }*/
        const newOffset = stateMachine.absLineOffset();
        if (block.parent && (block.length - blockLength) !== 0) {
            this.rstStateMachine.nextLine(block.length - blockLength);
        }
        return newOffset;
    }

    public nestedListParse(block: StringList, args: NestedParseArgs): [number, boolean] {
        this.logger.debug('nestedListParse', { value: block.join('\n') });
        const myargs: NestedParseArgs = { ...args };
        if (myargs.createStateMachine !== undefined) {
            throw Error('not expecing that');
        }
        if (myargs.extraSettings == null) {
            myargs.extraSettings = {};
        }

        // if (!myargs.stateMachineClass) {
        //     myargs.stateMachineClass = this.nestedSm;
        // }
        // if (!myargs.stateMachineKwargs) {
        //     myargs.stateMachineKwargs = {...this.nestedSmKwargs};
        // }
        // Copy the initial state
        if (myargs.createStateMachine === undefined && this.createIndentedStateMachine !== undefined) {
            myargs.createStateMachine = this.createIndentedStateMachine;
        }
        if (myargs.createStateMachine === undefined) {
            throw new InvalidStateError('createStateMachine');
        }
        const stateMachine = myargs.createStateMachine() as Nestedstatemachine;

        //myargs.stateMachineArgs!.initialState = myargs.initialState;

        if (!myargs.blankFinishState) {
            myargs.blankFinishState = myargs.initialState;
        }
        if (!(stateMachine.hasState(myargs.blankFinishState))) {
            throw new InvalidArgumentsError(`invalid state ${myargs.blankFinishState}`);
        }

        stateMachine.getState2(myargs.blankFinishState!).blankFinish = myargs.blankFinish;
        // Object.keys(myargs.extraSettings).forEach((key) => {
        //     stateMachine.states[myargs.initialState][key] = myargs.extraSettings[key];
        // });
        stateMachine.run(block, myargs.inputOffset || 0,
            undefined, undefined, myargs.initialState, myargs.node, myargs.matchTitles,
            this.memo);

        this.logger.debug(`checking blank finish state of ${myargs.blankFinishState}`);

        const { blankFinish } = stateMachine.getState2(myargs.blankFinishState);
        stateMachine.unlink();
        return [stateMachine.absLineOffset() || 0, blankFinish || false];
    }

    public section(args: {
        title: string; source: string; style: any | any[]; lineno: number; messages: Systemmessage[];
    }): void {
        const { source, style, title, lineno, messages } = args;
        if (this.checkSubsection({ source, style, lineno })) {
            this.newSubsection({ title, lineno, messages });
        }
    }

    /**
     * Check for a valid subsection header.  Update section data in `memo`.
     *
     * When a new section is reached that isn't a subsection of the current
     * section, set `self.parent` to the new section's parent section
     * (or the document if the new section is a top-level section).
     */
    public checkSubsection(args: { source: string; style: any | any[]; lineno: number }): boolean {
        const { source, style, lineno } = args;

        if (!this.memo || !this.parent) {
            throw new Error('Missing memo or parent');
        }

        const titleStyles = this.memo.titleStyles;
        const parentSections = this.parent.sectionHierarchy();
        const mylevel = parentSections.length; // Current section level based on hierarchy

        let level: number;

        try {
            // Check for existing title style
            level = titleStyles.findIndex(tStyle =>
                JSON.stringify(tStyle) === JSON.stringify(style)
            ) + 1;
        } catch {
            level = 0;
        }

        if (level === 0) {
            // New title style
            titleStyles.push(style);
            level = titleStyles.length;
        }

        // The new level must not be deeper than an immediate child of the current level
        if (level > mylevel + 1) {
            const styles = titleStyles.map(s => Array.isArray(s) ? s.join('/') : s).join(' ');
            this.parent.add(this.reporter!.severe(
                `Inconsistent title style: skip from level ${mylevel} to ${level}.`,
                [
                    new nodes.literal_block('', source),
                    new nodes.paragraph('', `Established title styles: ${styles}`)
                ],
                { line: lineno }
            ));
            return false;
        }

        // Update parent state
        this.memo.sectionLevel = level;

        if (level <= mylevel) {
            // New section is sibling or higher up in the section hierarchy
            this.parent = parentSections[level - 1].parent;
        }

        return true;
    }

    public title_inconsistent(sourcetext: string, lineno: number): NodeInterface {
        const error = this.reporter!.severe(
            'Title level inconsistent:', [new nodes.literal_block('', sourcetext)], { line: lineno },
        );
        return error;
    }


    public newSubsection(args: { title: string; lineno: number; messages: any[] }): void {
        const { title, lineno, messages } = args;

        const sectionNode = new nodes.section();
        this.parent!.add(sectionNode);

        const [textNodes, titleMessages] = this.inline_text(title, lineno);
        const titleNode = new nodes.title(title, '', textNodes);
        const name = fullyNormalizeName(titleNode.astext());

        sectionNode.attributes.names.push(name);
        sectionNode.add(titleNode);
        sectionNode.add(messages);
        sectionNode.add(titleMessages);

        this.document!.noteImplicitTarget(sectionNode, sectionNode);

        // Update state - this is crucial for proper nesting
        this.rstStateMachine.node = sectionNode;

        // Update .parent attribute in all states
        for (const state of Object.values(this.rstStateMachine.states)) {
            state.parent = sectionNode;
        }
    }

    public unindentWarning(nodeName: string): NodeInterface {
        const lineno = this.rstStateMachine.absLineNumber() + 1;
        return this.reporter!.warning(`${nodeName} ends without a blank line; unexpected unindent.`, [], { line: lineno });
    }

    public paragraph(lines: (string | {})[], lineno: number): any[] {
        const data = lines.join('\n').trimEnd();
        let text;
        let literalNext;
        if (/(?<!\\)(\\\\)*::$/.test(data)) {
            if (data.length === 2) {
                return [[], 1];
            }
            if (' \n'.indexOf(data[data.length - 3]) !== -1) {
                text = data.substring(0, data.length - 3).replace(/\s*$/, '');
            } else {
                text = data.substring(0, data.length - 1);
            }
            literalNext = 1;
        } else {
            text = data;
            literalNext = 0;
        }
        const r = this.inline_text(text, lineno);
        const [textnodes, messages] = r;
        const p = new nodes.paragraph(data, '', textnodes);
        let sourceAndLine = this.rstStateMachine.getSourceAndLine(lineno);
        p.source = sourceAndLine[0];
        if (sourceAndLine[1] !== undefined) {
            p.line = sourceAndLine[1];
        }
        return [[p, ...messages], literalNext];
    }

    /**
     * Return 2 lists: nodes (text and inline elements), and system_messages.
     */
    public inline_text(text: string, lineno: number): [NodeInterface[], Systemmessage[]] {
        const [nodes, messages] = this.inliner!.parse(text, { lineno, memo: this.memo, parent: this.parent! });
        return [nodes, messages];
    }
}

export default RSTState;


// Original Python 
/*

class RSTState(StateWS):

    """
    reStructuredText State superclass.

    Contains methods used by all State subclasses.
    """

    nested_sm = NestedStateMachine
    nested_sm_cache = []

    def __init__(self, state_machine, debug=False) -> None:
        self.nested_sm_kwargs = {'state_classes': state_classes,
                                 'initial_state': 'Body'}
        StateWS.__init__(self, state_machine, debug)

    def runtime_init(self) -> None:
        StateWS.runtime_init(self)
        memo = self.state_machine.memo
        self.memo = memo
        self.reporter = memo.reporter
        self.inliner = memo.inliner
        self.document = memo.document
        self.parent = self.state_machine.node
        # enable the reporter to determine source and source-line
        if not hasattr(self.reporter, 'get_source_and_line'):
            self.reporter.get_source_and_line = self.state_machine.get_source_and_line  # noqa:E501

    def goto_line(self, abs_line_offset) -> None:
        """
        Jump to input line `abs_line_offset`, ignoring jumps past the end.
        """
        try:
            self.state_machine.goto_line(abs_line_offset)
        except EOFError:
            pass

    def no_match(self, context, transitions):
        """
        Override `StateWS.no_match` to generate a system message.

        This code should never be run.
        """
        self.reporter.severe(
            'Internal error: no transition pattern match.  State: "%s"; '
            'transitions: %s; context: %s; current line: %r.'
            % (self.__class__.__name__, transitions, context,
               self.state_machine.line))
        return context, None, []

    def bof(self, context):
        """Called at beginning of file."""
        return [], []

    def nested_parse(self, block, input_offset, node, match_titles=False,
                     state_machine_class=None, state_machine_kwargs=None):
        """
        Create a new StateMachine rooted at `node` and run it over the input
        `block`.
        """
        use_default = 0
        if state_machine_class is None:
            state_machine_class = self.nested_sm
            use_default += 1
        if state_machine_kwargs is None:
            state_machine_kwargs = self.nested_sm_kwargs
            use_default += 1
        block_length = len(block)

        state_machine = None
        if use_default == 2:
            try:
                state_machine = self.nested_sm_cache.pop()
            except IndexError:
                pass
        if not state_machine:
            state_machine = state_machine_class(debug=self.debug,
                                                **state_machine_kwargs)
        state_machine.run(block, input_offset, memo=self.memo,
                          node=node, match_titles=match_titles)
        if use_default == 2:
            self.nested_sm_cache.append(state_machine)
        else:
            state_machine.unlink()
        new_offset = state_machine.abs_line_offset()
        # No `block.parent` implies disconnected -- lines aren't in sync:
        if block.parent and (len(block) - block_length) != 0:
            # Adjustment for block if modified in nested parse:
            self.state_machine.next_line(len(block) - block_length)
        return new_offset

    def nested_list_parse(self, block, input_offset, node, initial_state,
                          blank_finish,
                          blank_finish_state=None,
                          extra_settings={},
                          match_titles=False,
                          state_machine_class=None,
                          state_machine_kwargs=None):
        """
        Create a new StateMachine rooted at `node` and run it over the input
        `block`. Also keep track of optional intermediate blank lines and the
        required final one.
        """
        if state_machine_class is None:
            state_machine_class = self.nested_sm
        if state_machine_kwargs is None:
            state_machine_kwargs = self.nested_sm_kwargs.copy()
        state_machine_kwargs['initial_state'] = initial_state
        state_machine = state_machine_class(debug=self.debug,
                                            **state_machine_kwargs)
        if blank_finish_state is None:
            blank_finish_state = initial_state
        state_machine.states[blank_finish_state].blank_finish = blank_finish
        for key, value in extra_settings.items():
            setattr(state_machine.states[initial_state], key, value)
        state_machine.run(block, input_offset, memo=self.memo,
                          node=node, match_titles=match_titles)
        blank_finish = state_machine.states[blank_finish_state].blank_finish
        state_machine.unlink()
        return state_machine.abs_line_offset(), blank_finish

    def section(self, title, source, style, lineno, messages) -> None:
        """Check for a valid subsection and create one if it checks out."""
        if self.check_subsection(source, style, lineno):
            self.new_subsection(title, lineno, messages)

    def check_subsection(self, source, style, lineno) -> bool:
        """
        Check for a valid subsection header.  Update section data in `memo`.

        When a new section is reached that isn't a subsection of the current
        section, set `self.parent` to the new section's parent section
        (or the document if the new section is a top-level section).
        """
        title_styles = self.memo.title_styles
        parent_sections = self.parent.section_hierarchy()
        # current section level: (0 document, 1 section, 2 subsection, ...)
        mylevel = len(parent_sections)
        # Determine the level of the new section:
        try:  # check for existing title style
            level = title_styles.index(style) + 1
        except ValueError:  # new title style
            title_styles.append(style)
            level = len(title_styles)
        # The new level must not be deeper than an immediate child
        # of the current level:
        if level > mylevel + 1:
            styles = " ".join("/".join(s for s in style)
                              for style in title_styles)
            self.parent += self.reporter.severe(
                'Inconsistent title style:'
                f' skip from level {mylevel} to {level}.',
                nodes.literal_block('', source),
                nodes.paragraph('', f'Established title styles: {styles}'),
                line=lineno)
            return False
        # Update parent state:
        self.memo.section_level = level
        if level <= mylevel:
            # new section is sibling or higher up in the section hierarchy
            self.parent = parent_sections[level-1].parent
        return True

    def title_inconsistent(self, sourcetext, lineno):
        # Ignored. Will be removed in Docutils 2.0.
        error = self.reporter.severe(
            'Title level inconsistent:', nodes.literal_block('', sourcetext),
            line=lineno)
        return error

    def new_subsection(self, title, lineno, messages):
        """Append new subsection to document tree."""
        section_node = nodes.section()
        self.parent += section_node
        textnodes, title_messages = self.inline_text(title, lineno)
        titlenode = nodes.title(title, '', *textnodes)
        name = normalize_name(titlenode.astext())
        section_node['names'].append(name)
        section_node += titlenode
        section_node += messages
        section_node += title_messages
        self.document.note_implicit_target(section_node, section_node)
        # Update state:
        self.state_machine.node = section_node
        # Also update the ".parent" attribute in all states.
        # This is a bit violent, but the state classes copy their .parent from
        # state_machine.node on creation, so we need to update them. We could
        # also remove RSTState.parent entirely and replace references to it
        # with statemachine.node, but that might break code downstream of
        # docutils.
        for s in self.state_machine.states.values():
            s.parent = section_node

    def paragraph(self, lines, lineno):
        """
        Return a list (paragraph & messages) & a boolean: literal_block next?
        """
        data = '\n'.join(lines).rstrip()
        if re.search(r'(?<!\\)(\\\\)*::$', data):
            if len(data) == 2:
                return [], 1
            elif data[-3] in ' \n':
                text = data[:-3].rstrip()
            else:
                text = data[:-1]
            literalnext = 1
        else:
            text = data
            literalnext = 0
        textnodes, messages = self.inline_text(text, lineno)
        p = nodes.paragraph(data, '', *textnodes)
        p.source, p.line = self.state_machine.get_source_and_line(lineno)
        return [p] + messages, literalnext

    def inline_text(self, text, lineno):
        """
        Return 2 lists: nodes (text and inline elements), and system_messages.
        """
        nodes, messages = self.inliner.parse(text, lineno,
                                             self.memo, self.parent)
        return nodes, messages

    def unindent_warning(self, node_name):
        # the actual problem is one line below the current line
        lineno = self.state_machine.abs_line_number() + 1
        return self.reporter.warning('%s ends without a blank line; '
                                     'unexpected unindent.' % node_name,
                                     line=lineno)
*/