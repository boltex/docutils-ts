
export type _Components = 'reader' | 'parser' | 'writer' | 'input' | 'output';

import { citation, decoration, Element, footnote, reference, substitution_definition } from "./nodes.js";

import { Logger } from "./logger.js";

import { Settings } from "./settings.js";
export { Settings };

import Transformer from "./transformer.js";
import StringList from "./stringList.js";
import { InlinerInterface } from "./parsers/rst/types.js";
import Parser from "./parser.js";
import Output from "./io/output.js";
import RSTStateMachine from "./parsers/rst/rstStateMachine.js";
import Input from './io/input.js';
import Writer from "./writer.js";
import Reader from "./reader.js";

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

type LogCallback = (error?: any, level?: string, message?: string, meta?: any) => void;

export interface LeveledLogMethod {
    (message: string, callback: LogCallback): Logger;
    (message: string, meta: any, callback: LogCallback): Logger;
    (message: string, ...meta: any[]): Logger;
    (message: any): Logger;
    (infoObject: any): Logger;
}

export interface LoggerType {
    debug: LeveledLogMethod;
    silly: LeveledLogMethod;
    error: LeveledLogMethod;
    warn: LeveledLogMethod;
    info: LeveledLogMethod;
}

export interface ConfigSettings {
    [name: string]: any;
}

export type SettingsSpecType = [string | undefined, string | undefined | null, [string, string[], { [name: string]: any }][]];

export type StateType = StateInterface | string;
export interface OptionSpec {
    [optionName: string]: (arg: string) => string;
}

export interface Options {
    [optionName: string]: any;
}

export interface ParserArgs {
    inliner?: InlinerInterface;
    rfc2822?: boolean;
    debug?: boolean;
    debugFn?: DebugFunction;
    logger: LoggerType;
}
export interface WritableStream {
    write: (data: string) => void;
}

export interface GenericSettings {
    [settingName: string]: any;
}

export interface SourceLocation {
    currentSource: string;
    currentLine: number;
}

export interface HasIndent {
    indent: number;
}

export interface QuoteattrCallback {
    (arg: string): string;
}

export interface NodeInterface extends SourceLocation {
    referenced: boolean;
    names: string[];
    rawsource: string;
    /** Back-reference to the Node immediately containing this Node. */
    parent?: NodeInterface;
    /** The `document` node at the root of the tree containing this Node. */
    document?: Document;
    /** Path or description of the input source which generated this Node. */
    source?: string;
    /** The line number (1-based) of the beginning of this Node in `source`. */
    line: number | undefined;

    attributes: Attributes;

    asDOM(dom: {}): {};

    /**
     * Return an indented pseudo-XML representation, for test purposes.
     * 
     * Override in subclasses.
     */
    pformat(indent?: string, level?: number): string;

    /** Return a copy of self. */
    copy(): NodeInterface;

    /** Return a deep copy of self (also copying children). */
    deepcopy(): NodeInterface;

    /**
     * Traverse a tree of `Node` objects, calling the
     * `dispatch_visit()` method of `visitor` when entering each
     * node.  (The `walkabout()` method is similar, except it also
     * calls the `dispatch_departure()` method before exiting each
     * node.)
     * 
     * This tree traversal supports limited in-place tree
     * modifications.  Replacing one node with one or more nodes is
     * 
     * OK, as is removing an element.  However, if the node removed
     * or replaced occurs after the current node, the old node will
     * still be traversed, and any new nodes will not.
     * Within ``visit`` methods (and ``depart`` methods for
     * `walkabout()`), `TreePruningException` subclasses may be raised
     * 
     * (`SkipChildren`, `SkipSiblings`, `SkipNode`, `SkipDeparture`).
     * Parameter `visitor`: A `NodeVisitor` object, containing a
     * ``visit`` implementation for each `Node` subclass encountered.
     * Return true if we should stop the traversal.
     */
    walk(visitor: {}): boolean;

    walkabout(visitor: {}): boolean;

    tagname: string;
    classTypes: any[];
    getChild(index: number): NodeInterface;
    hasChildren(): boolean;
    getNumChildren(): number;
    clearChildren(): void;
    getChildren(): NodeInterface[];
    append(item: NodeInterface): void;
    removeChild(index: number): void;

    traverse(args: TraverseArgs): NodeInterface[];

    astext(): string;

    add(iNodes: NodeInterface[] | NodeInterface): void;

    isInline(): boolean;

    starttag(quoteattr?: QuoteattrCallback): string;

    endtag(): string;

    emptytag(): string;

    addBackref(prbid: {}): void;

    /**
     *      Updates all attributes from node or dictionary `dict_`.
     * 
     *      Appends the basic attributes ('ids', 'names', 'classes',
     *      'dupnames', but not 'source') and then, for all other attributes in
     *      dict_, updates the same attribute in self.  When attributes with the
     *      same identifier appear in both self and dict_ whose values aren't each
     *      lists and replace is True, the values in self are replaced with the
     *      values in dict_; if the values from self and dict_ for the given
     *      identifier are both of list type, then the two lists are concatenated
     *      and the result stored in self; otherwise, the values in self are
     *      preserved.  When and_source is True, the 'source' attribute is
     *      included in the copy.
     * 
     *      NOTE: When replace is False, and self contains a 'source' attribute,
     *      'source' is not replaced even when dict_ has a 'source'
     *      attribute, though it may still be merged into a list depending
     *      on the value of update_fun.
     */
    updateAllAttsConcatenating(dict_: {}, replace: boolean,
        andSource: boolean): void;

    nextNode(args: TraverseArgs): NodeInterface | undefined | null;

    getCustomAttr(attrName: string): undefined;

    isAdmonition(): boolean;
    isSetup: boolean;
}

export interface Attributes {
    [propName: string]: any;
}

export interface ElementInterface extends NodeInterface {
    nodeName: string;
    listAttributes: string[];
    firstChildNotMatchingClass(childClass: any | any[], start?: number, end?: number): number | undefined;
    attlist(): Attributes;
}

export interface TextElementInterface extends ElementInterface {
}

export interface SubstitutionNames {
    [name: string]: string;
}

export interface SubstitutionDefs {
    [name: string]: substitution_definition;
}

export interface RefNames {
    [refName: string]: NodeInterface[];
}

export interface RefIds {
    [refId: string]: NodeInterface[];
}


export interface NameTypes {
    [name: string]: boolean;
}

export interface Ids {
    [id: string]: NodeInterface;
}

export interface Document extends ElementInterface {
    logger: LoggerType;
    transformMessages: Systemmessage[];
    nameIds: NameIds;
    parseMessages: Systemmessage[];
    substitutionDefs: SubstitutionDefs;

    substitutionNames: SubstitutionNames;

    reporter: ReporterInterface;
    settings: Settings;
    uuid?: string;
    transformer: Transformer;

    noteTransformMessage(message: Systemmessage): void;

    noteImplicitTarget(target: NodeInterface, msgnode: NodeInterface): void;

    noteRefname(ref: reference): void;

    noteExplicitTarget(target: NodeInterface, parent?: NodeInterface): void;

    noteIndirectTarget(target: NodeInterface): void;

    setId(p: NodeInterface, msgnode?: ElementInterface): string;

    noteFootnoteRef(refnode: NodeInterface): void;

    noteSymbolFootnoteRef(refnode: NodeInterface): void;

    noteCitationRef(refnode: NodeInterface): void;

    noteAutofootnoteRef(refnode: NodeInterface): void;

    noteSubstitutionRef(subrefNode: NodeInterface, subrefText: string): void;

    noteSubstitutionDef(substitutionNode: substitution_definition, subname: string, parent: ElementInterface): void;

    noteAnonymousTarget(target: NodeInterface): void;

    noteCitation(c: citation): void;

    noteFootnote(f: footnote): void;

    noteSymbolFootnote(f: footnote): void;

    noteAutofootnote(f: footnote): void;

    getDecoration(): decoration;

    noteSource(source: string | undefined, offset: number | undefined): void;
}

export interface ReferenceResolver {
    priority: number;
}


export interface TransformSpecInterface {
    /**
     * List of functions to try to resolve unknown references.  Unknown
     * references have a 'refname' attribute which doesn't correspond to any
     * target in the document.  Called when the transforms in
     * `docutils.tranforms.references` are unable to find a correct target.  The
     * list should contain functions which will try to resolve unknown
     * references, with the following signature::
     * 
     * def reference_resolver(node):
     * '''Returns boolean: true if resolved, false if not.'''
     * 
     * If the function is able to resolve the reference, it should also remove
     * the 'refname' attribute and mark the node as resolved::
     * 
     * del node['refname']
     * node.resolved = 1
     * 
     * Each function must have a "priority" attribute which will affect the order
     * the unknown_reference_resolvers are run::
     * 
     * reference_resolver.priority = 100
     * 
     * Override in subclasses.
     */
    unknownReferenceResolvers: ReferenceResolver[];

    getTransforms(): TransformType[];
}

/** Base interface for Docutils components. */
export interface ComponentInterface extends TransformSpecInterface {
    componentType: string;
    supported: string[];

    /** Is `format` supported by this component?
     *
     * To be used by transforms to ask the dependent component if it supports
     * a certain input context or output format.
     */
    supports?(format: string): boolean;
}

export enum LogLevel {
    DebugLevel = 0,
    InfoLevel,
    WarningLevel,
    SevereLevel,
    ErrorLevel,
};

export interface ReporterInterface {
    reportLevel: number;
    getSourceAndLine?: (lineno?: number) => [string, number] | undefined;

    debugFlag?: boolean;


    systemMessage(level: number, message: string | Error, children: Element[], attributes: Attributes): NodeInterface;


    attachObserver(observer: {}): void;

    debug(message: string | Error, children?: NodeInterface[], kwargs?: Attributes): NodeInterface | undefined;

    info(message: string | Error, children?: NodeInterface[], kwargs?: Attributes): NodeInterface;

    warning(message: string | Error, children?: NodeInterface[], kwargs?: Attributes): NodeInterface;

    error(message: string | Error, children?: NodeInterface[], kwargs?: Attributes): NodeInterface;

    severe(message: string | Error, children?: NodeInterface[], kwargs?: Attributes): NodeInterface;
}

export interface Statefactory {
    withStateClasses(stateClasses: (StateConstructor | string)[]): this;
    createState(stateName: string, stateMachine: StatemachineInterface): StateInterface;
    getStateClasses(): StateConstructor[];
}

export interface States {
    [stateName: string]: StateInterface;
}

export interface StatemachineInterface {
    logger: LoggerType;
    stateFactory?: Statefactory;

    createStateMachine(rstStateMachine: RSTStateMachine, initialState?: string, stateFactory?: Statefactory): StatemachineInterface;
    runtimeInit(): void;
    addState(stateClass: StateInterface): void;
    addStates(stateClasses: StateInterface[]): void;
    unlink(): void;
    run(inputLines: StringList,
        inputOffset?: number,
        runContext?: ContextKind,
        inputSource?: string,
        initialState?: string | StateInterface, ...rest: any[]): (string | {})[];
    /**
     * Return current state object; set it first if
     * `next_state` given.  Parameter `next_state`: a string,
     * the name of the next state.  Exception:
     * `UnknownStateError` raised if `next_state` unknown.
     */
    getState(nextState?: string): StateInterface;
    absLineNumber(): number;
    absLineOffset(): number | undefined;
    atBof(): boolean;
    atEof(): boolean;
    attachObserver(observer: {}): void;
    detachObserver(observer: {}): void;
    error(): void;
    getSource(lineOffset: number): string | undefined;
    getSourceAndLine(lineno: number): [string | undefined, number | undefined];
    getTextBlock(flushLeft: boolean): StringList;
    gotoLine(lineOffset: number): string | undefined;
    insertInput(inputLines: StringList, source?: string): void;
    isNextLineBlank(): boolean;
    nextLine(n: number): string | undefined;
    notifyObservers(): void;
    previousLine(n: number): string;

    hasState(stateName: string): boolean;

    getState2(stateName: string): StateInterface;
}

export interface StateInterface {
    stateName: string;
    blankFinish?: boolean;

    runtimeInit(): void;

    addInitialTransitions(): void;

    addTransitions(names: string[], transitions: Transitions): void;

    addTransition(name: string, transition: StateInterface): void;

    removeTransition(name: string): void;

    makeTransition(name: string, nextState?: {}): {}[];

    makeTransitions(nameList: string[]): ({}[] | {})[];

    transitionOrder: string[];

    bof(context: (string | {})[]): string[][];
    eof(context: (string | {})[]): string[];

    noMatch(context: any[], transitions: TransitionsArray | undefined): [{}[], (string | StateInterface | undefined), {}[]];

    unlink(): void;

    transitions: Transitions;
}


export interface StateMachineRunArgs {
    inputLines: StringList | string | string[];
    inputOffset: number;
    context?: {}[];
    inputSource?: string;
    initialState?: string;
    node?: NodeInterface;
    matchTitles?: boolean;
    document?: Document;
    inliner?: InlinerInterface;
}


export interface GetIndentedArgs {
    start?: number;
    untilBlank?: boolean;
    stripIndent?: boolean;
    blockIndent?: number;
    firstIndent?: number;
    indent?: number;
    stripTop?: boolean;
}

export interface Visitor {
    document: Document;

    dispatchVisit(node: NodeInterface): void;

    dispatchDeparture(node: NodeInterface): void;
}

export interface FastTraverseArg {
    new(): NodeInterface;
}

export interface TraverseArgs {
    condition?: any;
    includeSelf?: boolean;
    descend?: boolean;
    siblings?: boolean;
    ascend?: boolean;
}


export interface WhitespaceStatemachine extends StatemachineInterface {
    getIndented(labeled: GetIndentedArgs): [StringList, number, number, boolean];

    getKnownIndented(labeled: GetIndentedArgs): [StringList, number, boolean];

    getFirstKnownIndented(args: GetIndentedArgs): [StringList, number, number, boolean];
}

export interface TransformerInterface {
    document: Document;

    /**
     * apply the transforms
     */
    applyTransforms(): void;

    /**
     * Store multiple transforms, with default priorities.
     * @param {Array} transformList - Array of transform classes (not instances).
     */
    addTransforms(transformList: TransformType[]): void;

    /**
     * 
     * Return a string, `priority` combined with `self.serialno`.
     * 
     * This ensures FIFO order on transforms with identical priority.
     */
    getPriorityString(class_: {}, priority: number): string;

    addPending(pending: NodeInterface, priority: number): void;
}
export interface DebugFunction {
    (line: string): void;
}

export interface SourceArgs {
    source: {};
    sourcePath: string;
    encoding: string;
}

export interface CoreLanguage {
    labels: Record<string, string>;
    bibliographic_fields: Record<string, string>;
    author_separators: string[];
}
export interface Systemmessage extends NodeInterface {
}

export interface NameIds {
    [name: string]: string | undefined;
}

export interface ObserverCallback {
    (source?: string, lineno?: number): void;
}

export interface Transitions {
    [name: string]: [RegExp, TransitionFunction, string];
}

export interface ReadCallback<T> {
    (error: Error | undefined | {}, output: T | undefined): void;
}


export interface ReadInputCallback<T> {
    (error: Error | undefined | {}, output: T | undefined): void;
}

export interface TransformType {
    defaultPriority: number;
    new(document: Document, startNode?: NodeInterface | null): TransformType;
    apply(kwargs?: any): void;
}

export interface Components {
    [componentName: string]: ComponentInterface;
}

export interface TransformInterface {
    apply(kwargs?: any): void;
}

export interface TransitionsArray {
    [index: number]: string | string[];
    length: number;
}

export interface TransitionFunction {
    (arg: any, context: any[], nextState: any): any;
}

export interface ParserConsructor {
    new(args: ParserArgs): Parser;
}

export interface WriterParts {
    [partName: string]: string | undefined;
}

export interface NodeClass {
    new(): NodeInterface;
}

export interface WriteFunction {
    (): {};
}

export interface Destination extends Output<string>, WriteFunction {

}

export interface StateMachineConstructorArgs {
    stateFactory?: Statefactory;
    initialState?: string;
    debug?: boolean;
    debugFn?: DebugFunction;
    logger: LoggerType;
}

export interface CreateStateMachineFunction<T> {
    (args: StateMachineConstructorArgs): T;
}


export interface StateMachineFactoryFunction<T> {
    (): T;
}

export type ContextKind = string[] | {}[];

export type ParseResult2 = any[];
export type ParseMethodReturnType = [ContextArray, StateType, ParseResult2]
export type ParseResult = [NodeInterface[], boolean];
export type IsolateTableResult = [StringList, NodeInterface[], boolean]
export interface StateConstructor {
    stateName?: string;
}

export interface RegexpResult {
    pattern: RegExp;
    result: RegExpExecArray;
    input: string;
}

export type ContextArray = string[];

export interface Patterns {
    [patternName: string]: RegExp;
}
export interface InputConstructorArgs {
    source?: {};
    sourcePath?: string;
    encoding?: string;
    errorHandler?: string;
    logger: LoggerType;
}
export interface InputConstructor {
    new(args: InputConstructorArgs): Input;
}

export interface OutputConstructorArgs<T> {
    logger: LoggerType,
    destination?: T,
    destinationPath?: string,
    encoding?: string,
    errorHandler?: string
}
export interface OutputConstructor<T> {
    new(args: OutputConstructorArgs<T>): Output<T>;
}

export interface WriterConstructor {
    new(args: { logger: LoggerType }): Writer;
}

export interface ReaderConstructorArgs {
    parser?: Parser;
    parseFn?: ParseFunction;
    parserName?: string;
    debugFn?: DebugFunction;
    debug?: boolean;
    logger: LoggerType;
}

export interface ReaderConstructor {
    new(args: ReaderConstructorArgs): Reader;

}
export interface ParseFunction {
    (source: string, settings?: Settings): Document;
}

