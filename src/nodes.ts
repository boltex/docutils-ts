/**
 * Docutils document tree element class library.
 *
 * Classes in CamelCase are abstract base classes or auxiliary classes. The one
 * exception is `Text`, for a text (PCDATA) node; uppercase is used to
 * differentiate from element classes.  Classes in lower_case_with_underscores
 * are element classes, matching the XML element generic identifiers in the DTD_.
 *
 * The position of each node (the level at which it can occur) is significant and
 * is represented by abstract base classes (`Root`, `Structural`, `Body`,
 * `Inline`, etc.).  Certain transformations will be easier because we can use
 * ``isinstance(node, base_class)`` to determine the position of the node in the
 * hierarchy.
 *
 * .. _DTD: http://docutils.sourceforge.net/docs/ref/docutils.dtd
 *
 */
import Transformer from "./transformer.js";
import { ApplicationError, InvalidArgumentsError, InvalidStateError, UnimplementedError } from "./exceptions.js";
import unescape from "./utils/unescape.js";
import { checkDocumentArg, isIterable, pySplit } from "./utils.js";
import {
    Attributes,
    Document,
    ElementInterface,
    FastTraverseArg,
    HasIndent,
    NameIds,
    NodeClass,
    NodeInterface,
    QuoteattrCallback,
    ReporterInterface,
    Systemmessage,
    TextElementInterface,
    TraverseArgs,
    Visitor,
    SubstitutionNames,
    SubstitutionDefs,
    RefNames,
    RefIds,
    NameTypes,
    Ids,
    LoggerType,
    TransformType,
    PendingInterface,
} from "./types.js";
import { Settings } from "./settings.js";
import { fullyNormalizeName, whitespaceNormalizeName } from "./utils/nameUtils.js";
import { nodeBasicAttributes } from './constants.js';

const _nonIdChars = /[^a-z0-9]+/ig;
const _nonIdAtEnds = /^[-0-9]+|-+$/;
const _nonIdTranslate = {
    0x00f8: "o", // o with stroke
    0x0111: "d", // d with stroke
    0x0127: "h", // h with stroke
    0x0131: "i", // dotless i
    0x0142: "l", // l with stroke
    0x0167: "t", // t with stroke
    0x0180: "b", // b with stroke
    0x0183: "b", // b with topbar
    0x0188: "c", // c with hook
    0x018c: "d", // d with topbar
    0x0192: "f", // f with hook
    0x0199: "k", // k with hook
    0x019a: "l", // l with bar
    0x019e: "n", // n with long right leg
    0x01a5: "p", // p with hook
    0x01ab: "t", // t with palatal hook
    0x01ad: "t", // t with hook
    0x01b4: "y", // y with hook
    0x01b6: "z", // z with stroke
    0x01e5: "g", // g with stroke
    0x0225: "z", // z with hook
    0x0234: "l", // l with curl
    0x0235: "n", // n with curl
    0x0236: "t", // t with curl
    0x0237: "j", // dotless j
    0x023c: "c", // c with stroke
    0x023f: "s", // s with swash tail
    0x0240: "z", // z with swash tail
    0x0247: "e", // e with stroke
    0x0249: "j", // j with stroke
    0x024b: "q", // q with hook tail
    0x024d: "r", // r with stroke
    0x024f: "y" // y with stroke
};
const _nonIdTranslateDigraphs = {
    0x00df: "sz", // ligature sz
    0x00e6: "ae", // ae
    0x0153: "oe", // ligature oe
    0x0238: "db", // db digraph
    0x0239: "qp" // qp digraph
};

/**
 * +------+------+
 * | this | is a |
 * +------+------+
 * |ridiculous   |
 * |test         |
 * +-------------+
 */
function dupname(node: NodeInterface, name: string): void {
    /* What is the intention of this function? */
    node.attributes.dupnames.push(name);
    node.attributes.names.splice(node.attributes.names.indexOf(name), 1);
    // Assume that this method is referenced, even though it isn't; we
    // don't want to throw unnecessary system_messages.
    node.referenced = true;
}
/**
 * Escape string values that are elements of a list, for serialization.
 * @param {String} value - Value to escape.
 */
function serialEscape(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/ /g, "\\ ");
}

function pseudoQuoteattr(value: string): string {
    return `"${value}"`;
}

function setupBacklinkable(o: NodeInterface): void {
    o.addBackref = (refid: string): void => { o.attributes.backrefs.push(refid) };
}

/**
 * Convert `string` into an identifier and return it.
 *
 * Docutils identifiers will conform to the regular expression
 * ``[a-z](-?[a-z0-9]+)*``.  For CSS compatibility, identifiers (the "class"
 * and "id" attributes) should have no underscores, colons, or periods.
 * Hyphens may be used.
 *
 * - The `HTML 4.01 spec`_ defines identifiers based on SGML tokens:
 *
 *       ID and NAME tokens must begin with a letter ([A-Za-z]) and may be
 *       followed by any number of letters, digits ([0-9]), hyphens ("-"),
 *       underscores ("_"), colons (":"), and periods (".").
 *
 * - However the `CSS1 spec`_ defines identifiers based on the "name" token,
 *   a tighter interpretation ("flex" tokenizer notation; "latin1" and
 *   "escape" 8-bit characters have been replaced with entities)::
 *
 *       unicode     \\[0-9a-f]{1,4}
 *       latin1      [&iexcl;-&yuml;]
 *       escape      {unicode}|\\[ -~&iexcl;-&yuml;]
 *       nmchar      [-a-z0-9]|{latin1}|{escape}
 *       name        {nmchar}+
 *
 * The CSS1 "nmchar" rule does not include underscores ("_"), colons (":"),
 * or periods ("."), therefore "class" and "id" attributes should not contain
 * these characters. They should be replaced with hyphens ("-"). Combined
 * with HTML's requirements (the first character must be a letter; no
 * "unicode", "latin1", or "escape" characters), this results in the
 * ``[a-z](-?[a-z0-9]+)*`` pattern.
 *
 * .. _HTML 4.01 spec: http://www.w3.org/TR/html401
 * .. _CSS1 spec: http://www.w3.org/TR/REC-CSS1
 */
function makeId(strVal: string): string {
    let id = strVal.toLowerCase();
    // This is for unicode, I believe?
    //if not isinstance(id, str):
    //id = id.decode()
    // id = translate(_nonIdTranslateDigraphs);
    //id = id.translate(_nonIdTranslate);
    // get rid of non-ascii characters.
    // 'ascii' lowercase to prevent problems with turkish locale.
    //id = unicodedata.normalize('NFKD', id).
    //    encode('ascii', 'ignore').decode('ascii');
    // shrink runs of whitespace and replace by hyphen
    id = pySplit(id).join(' ').replace(_nonIdChars, '-');
    id = id.replace(_nonIdAtEnds, '');
    return id;
}

function _callDefaultVisit(node: NodeInterface): void | undefined | {} {
    // @ts-ignore
    return this.default_visit(node);
}

function _callDefaultDeparture(node: NodeInterface): void | {} | undefined {
    // @ts-ignore
    return this.default_departure(node);
}

/* This is designed to be called later, a-nd not with an object. hmm */
function _addNodeClassNames(names: string[], o: any): void {
    names.forEach((_name): void => {
        const v = `visit_${_name}`;
        if (!o[v]) {
            o[v] = _callDefaultVisit.bind(o);
        }
        const d = `depart_${_name}`;
        if (!o[d]) {
            o[d] = _callDefaultDeparture.bind(o);
        }
    });
}

const nodeClassNames = ["Text", "abbreviation", "acronym", "address",
    "admonition", "attention", "attribution", "author",
    "authors", "block_quote", "bullet_list", "caption",
    "caution", "citation", "citation_reference",
    "classifier", "colspec", "comment", "compound",
    "contact", "container", "copyright", "danger",
    "date", "decoration", "definition", "definition_list",
    "definition_list_item", "description", "docinfo",
    "doctest_block", "document", "emphasis", "entry",
    "enumerated_list", "error", "field", "field_body",
    "field_list", "field_name", "figure", "footer",
    "footnote", "footnote_reference", "generated",
    "header", "hint", "image", "important", "inline",
    "label", "legend", "line", "line_block", "list_item",
    "literal", "literal_block", "math",
    "math_block", "note", "option", "option_argument",
    "option_group", "option_list", "option_list_item",
    "option_string", "organization", "paragraph",
    "pending", "problematic", "raw", "reference",
    "revision", "row", "rubric", "section", "sidebar",
    "status", "strong", "subscript",
    "substitution_definition", "substitution_reference",
    "subtitle", "superscript", "system_message", "table",
    "target", "tbody", "term", "tgroup", "thead", "tip",
    "title", "title_reference", "topic", "transition",
    "version", "warning"];

const SkipChildren = class {
};
const StopTraversal = class {
};

class SkipNode extends Error {
}

const SkipDeparture = class {
};
const SkipSiblings = class {
};
const NodeFound = class {
};


/**
 *  "Visitor" pattern [GoF95]_ abstract superclass implementation for
 *  document tree traversals.
 *
 *  Each node class has corresponding methods, doing nothing by
 *  default; override individual methods for specific and useful
 *  behaviour.  The `dispatch_visit()` method is called by
 *  `Node.walk()` upon entering a node.  `Node.walkabout()` also calls
 *  the `dispatch_departure()` method before exiting a node.
 *
 *  The dispatch methods call "``visit_`` + node class name" or
 *  "``depart_`` + node class name", resp.
 *
 *  This is a base class for visitors whose ``visit_...`` & ``depart_...``
 *  methods should be implemented for *all* node types encountered (such as
 *  for `docutils.writers.Writer` subclasses).  Unimplemented methods will
 *  raise exceptions.
 *
 *  For sparse traversals, where only certain node types are of interest,
 *  subclass `SparseNodeVisitor` instead.  When (mostly or entirely) uniform
 *  processing is desired, subclass `GenericNodeVisitor`.
 *
 *  .. [GoF95] Gamma, Helm, Johnson, Vlissides. *Design Patterns: Elements of
 *     Reusable Object-Oriented Software*. Addison-Wesley, Reading, MA, USA,
 *     1995.
 */
class NodeVisitor {
    public document: Document;

    public optional: string[];
    protected strictVisitor: boolean | undefined | null;

    [name: string]: any;

    /**
   * Create a NodeVisitor.
   * @param {nodes.document} document - document to visit
   */
    public constructor(document: Document) {
        if (!checkDocumentArg(document)) {
            throw new Error(`Invalid document arg: ${document}`);
        }
        this.document = document;
        const core = document.settings;
        this.strictVisitor = core.strictVisitor;
        this.optional = [];
    }

    /**
   * Call this."``visit_`` + node class name" with `node` as
   * parameter.  If the ``visit_...`` method does not exist, call
   * this.unknown_visit.
   */
    public dispatchVisit(node: NodeInterface): {} | undefined | void {
        const nodeName = node.tagname;
        const methodName = `visit_${nodeName}`;

        let method = (this)[methodName];
        if (!method) {
            method = this.unknownVisit;
        }
        this.document.reporter.debug(`docutils.nodes.NodeVisitor.dispatch_visit calling for ${nodeName}`);
        return method.bind(this)(node);
    }

    /*
   * Call this."``depart_`` + node class name" with `node` as
   * parameter.  If the ``depart_...`` method does not exist, call
   * this.unknown_departure.
   */
    public dispatchDeparture(node: NodeInterface): {} | undefined | void {
        const nodeName = node.tagname;
        const method = (this)[`depart_${nodeName}`] || this.unknownDeparture;
        this.document.reporter.debug(
            `docutils.nodes.NodeVisitor.dispatch_departure calling for ${node}`
        );
        return method.bind(this)(node);
    }

    /**
   * Called when entering unknown `Node` types.
   *
   * Raise an exception unless overridden.
   */
    public unknownVisit(node: NodeInterface): never | void {
        if (this.strictVisitor || !(this.optional.includes(node.tagname))) {
            throw new Error(`visiting unknown node type:${node.tagname}`);
        }
    }

    /**
   * Called before exiting unknown `Node` types.
   *
   * Raise exception unless overridden.
   */
    public unknownDeparture(node: NodeInterface): never | void {
        if (this.strictVisitor || !(this.optional.includes(node.tagname))) {
            throw new Error(`departing unknown node type: ${node.tagname}`);
        }
    }
}

/**
 * Base class for sparse traversals, where only certain node types are of
 * interest.  When ``visit_...`` & ``depart_...`` methods should be
 * implemented for *all* node types (such as for `docutils.writers.Writer`
 * subclasses), subclass `NodeVisitor` instead.
 */
class SparseNodeVisitor extends NodeVisitor {
}

/**
 *  Generic "Visitor" abstract superclass, for simple traversals.
 *
 *  Unless overridden, each ``visit_...`` method calls `default_visit()`, and
 *  each ``depart_...`` method (when using `Node.walkabout()`) calls
 *  `default_departure()`. `default_visit()` (and `default_departure()`) must
 *  be overridden in subclasses.
 *
 *  Define fully generic visitors by overriding `default_visit()` (and
 *  `default_departure()`) only. Define semi-generic visitors by overriding
 *  individual ``visit_...()`` (and ``depart_...()``) methods also.
 *
 *  `NodeVisitor.unknown_visit()` (`NodeVisitor.unknown_departure()`) should
 *  be overridden for default behavior.
 */
class GenericNodeVisitor extends NodeVisitor {
    public static nodeClassNames = [];

    public constructor(document: Document) {
        super(document);
        // document this/
        _addNodeClassNames(nodeClassNames, this);
    }

    public default_visit(node: NodeInterface) {
        throw new Error("not implemented");
    }

    public default_departure(node: NodeInterface) {
        throw new Error("not implemented");
    }
}

/**
 * Make a complete copy of a tree or branch, including element attributes.
 */
class TreeCopyVisitor extends GenericNodeVisitor {

    constructor(document: Document) {
        super(document);
        this.parentStack = [];
        this.parent = []; // starts as list but is also used as node! (see default_visit)
    }

    public getTreeCopy(): NodeInterface {
        if (this.parent.length === 0) {
            throw new ApplicationError("No tree copy available, parent stack is empty.");
        }
        return this.parent[0];
    }

    public default_visit(node: NodeInterface): void {
        /* Copy the current node, and make it the new acting parent. */
        const newnode = node.copy();
        if (Array.isArray(this.parent)) {
            // If parent is an array, normal push
            this.parent.push(newnode);
        } else {
            this.parent.append(newnode);
        }
        this.parentStack.push(this.parent);
        this.parent = newnode;
    }

    public default_departure(node: NodeInterface): void {
        /* Restore the previous acting parent. */
        if (this.parentStack.length === 0) {
            throw new ApplicationError("No parent stack available, cannot depart.");
        }
        this.parent = this.parentStack.pop() || [];
    }

}

// fixme
// GenericNodeVisitor.nodeClassNames = nodeClassNames;

/**
 * Node class.
 *
 * The base class for all docutils nodes.
 */
abstract class Node implements NodeInterface {
    public removeChild(index: number): void {
        this._children.splice(index, 1);
    }

    public append(item: NodeInterface): void {
        throw new Error('Cant append to underived Node');
    }

    public extend(...items: NodeInterface[]): void {
        throw new Error('Cant extend to underived Node');
    }

    public insert(index: number, item: NodeInterface): void {
        throw new Error('Cant append to underived Node');

    }
    public pop(i?: number): NodeInterface {
        throw new Error('Cant insert to underived Node');

    }
    public remove(item: NodeInterface): void {
        throw new Error('Cant pop to underived Node');
    }

    public index(item: NodeInterface, start?: number, stop?: number): number {
        throw new Error('Cant index to underived Node');
    }

    public previousSibling(): NodeInterface | undefined {
        throw new Error('Cant previousSibling to underived Node');
    }

    public clear(): void {
        throw new Error('Cant clear to underived Node');
        throw new Error('Cant clear to underived Node');
    }
    public replace(old: NodeInterface, newItem: NodeInterface | NodeInterface[]): void {
        throw new Error('Cant replace to underived Node');
    }
    public replaceSelf(newItem: NodeInterface | NodeInterface[]): void {
        throw new Error('Cant replaceSelf to underived Node');
    }

    public replaceAt(index: number, newItem: NodeInterface | NodeInterface[]): void {
        throw new Error('Cant replaceAt to underived Node');
    }

    public getChild(index: number): NodeInterface {
        if (index < 0 || index >= this._children.length) {
            throw new ApplicationError('index out of range');
        }
        return this._children[index];
    }
    public hasChildren(): boolean {
        return this._children.length > 0;
    }
    public getNumChildren(): number {
        return this._children.length;
    }
    public clearChildren(): void {
        this._children.length = 0;
    }
    public getChildren(): NodeInterface[] {
        return [...this._children];
    }

    protected get children(): NodeInterface[] {
        return this._children;
    }

    protected set children(value: NodeInterface[]) {
        this._children = value;
    }

    public isSetup: boolean = false;
    /**
   * List attributes which are defined for every Element-derived class
   * instance and can be safely transferred to a different node.
   */
    public basicAttributes: string[] = nodeBasicAttributes;

    /**
   * List attributes, automatically initialized to empty lists for
   * all nodes.
   */
    public listAttributes: string[] = [];

    /** List attributes that are known to the Element base class. */
    public knownAttributes: string[] = [];

    public childTextSeparator: string = "";

    public abstract emptytag(): string;

    public referenced: boolean = false;

    public names: string[] = [];

    public currentSource: string = "";

    public currentLine: number = 0;

    public rawsource: string = "";

    public tagname: string;

    public get parent(): ElementInterface {
        if (this._parent === undefined) {
            throw new ApplicationError('Attempt to access parent property of node without parent.');
        }
        return this._parent as ElementInterface;
    }

    public _parent?: NodeInterface;

    public document?: Document;

    public source: string | undefined;

    public line: number | undefined = 0;

    public classTypes: any[] = [];

    private _children: NodeInterface[] = [];

    public attributes: Attributes = {};

    /**
   * Create a node
   */
    public constructor() {
        this.tagname = this.constructor.name;
        this.classTypes = [];
        this._init();
    }

    public _init(): void {
    }


    /**
   Return the first node in the iterable returned by traverse(),
   or None if the iterable is empty.

   Parameter list is the same as of traverse.  Note that
   include_self defaults to 0, though.
   */
    public nextNode(args: TraverseArgs): NodeInterface | undefined {
        const iterable = this.traverse(args);
        if (iterable.length) {
            return iterable[0];
        }
        return undefined;
    }

    public hasClassType(classType: any): boolean {

        return this.classTypes.findIndex((c): boolean => c.prototype instanceof classType
            || c === classType) !== -1;
    }

    public isInline(): boolean {
        return this.classTypes.findIndex((c: any): boolean => c.prototype instanceof Inline || c === Inline) !== -1;
    }

    public isAdmonition(): boolean {
        return this.classTypes.findIndex(
            (c): boolean => c.prototype instanceof Admonition || c === Admonition
        ) !== -1;
    }

    public asDOM(dom: {}): {} {
        return {};
    }

    abstract pformat(indent?: string, level?: number): string;

    abstract astext(): string;

    abstract copy(): NodeInterface;

    abstract deepcopy(): NodeInterface;

    abstract _domNode(domroot: globalThis.Document): {};

    public validate(recursive?: boolean): void {
        throw new Error('Cant validate to underived Node');
    }

    public setupChild(child: NodeInterface): void {
        (child as Node)._parent = this;
        if (this.document) {
            child.document = this.document;
            if (child.source == null) {
                child.source = this.document.currentSource;
            }
            if (child.line == null) {
                child.line = this.document.currentLine;
            }
        }
        child.isSetup = true;
    }

    /**
   * Traverse a tree of `Node` objects, calling the
   * `dispatch_visit()` method of `visitor` when entering each
   * node.  (The `walkabout()` method is similar, except it also
   * calls the `dispatch_departure()` method before exiting each
   * node.)
   *
   * This tree traversal supports limited in-place tree
   * modifications.  Replacing one node with one or more nodes is
   * OK, as is removing an element.  However, if the node removed
   * or replaced occurs after the current node, the old node will
   * still be traversed, and any new nodes will not.
   *
   * Within ``visit`` methods (and ``depart`` methods for
   * `walkabout()`), `TreePruningException` subclasses may be raised
   * (`SkipChildren`, `SkipSiblings`, `SkipNode`, `SkipDeparture`).
   *
   * Parameter `visitor`: A `NodeVisitor` object, containing a
   * ``visit`` implementation for each `Node` subclass encountered.
   *
   * Return true if we should stop the traversal.
   */
    public walk(visitor: Visitor): boolean {
        let stop = false;
        visitor.document.reporter.debug("docutils.nodes.Node.walk calling dispatch_visit for fixme");
        try {
            try {
                visitor.dispatchVisit(this);
            } catch (error) {
                if (error instanceof SkipChildren || error instanceof SkipNode) {
                    return stop;
                }
                if (error instanceof SkipDeparture) {
                    // do nothing
                }
                throw error;
            }
            const children = [...this._children];
            let skipSiblings = false;
            children.forEach((child): void => {
                try {
                    if (!stop && !skipSiblings) {
                        if (child.walk(visitor)) {
                            stop = true;
                        }
                    }
                } catch (error) {
                    if (error instanceof SkipSiblings) {
                        skipSiblings = true;
                    } else {
                        throw error;
                    }
                }
            });
        } catch (error) {
            if (error instanceof StopTraversal) {
                stop = true;
            }
            throw error;
        }
        return stop;
    }

    public walkabout(visitor: Visitor): boolean {
        let callDepart = true;
        let stop = false;
        visitor.document.reporter.debug("docutils.nodes.Node.walkabout calling dispatch_visit");
        try {
            try {
                visitor.dispatchVisit(this);
            } catch (error) {
                if (error instanceof SkipNode || error instanceof SkipChildren) {
                    return stop;
                }
                if (error instanceof SkipDeparture) {
                    callDepart = false;
                } else {
                    throw error;
                }
            }

            try {
                for (const child of [...this.children]) {
                    // console.log(typeof child);
                    // console.log(Object.keys(child));
                    //console.log(`calling walkabout on ${child.tagname}`);
                    if (child.walkabout(visitor)) {
                        stop = true;
                        break;
                    }
                }
            } catch (error) {
                if (!(error instanceof SkipSiblings)) {
                    throw error;
                }
            }
        } catch (error) {
            if (error instanceof StopTraversal) {
                stop = true;
            } else {
                throw error;
            }
        }
        if (callDepart) {
            visitor.document.reporter.debug(
                `docutils.nodes.Node.walkabout calling dispatch_departure for ${this}`
            );
            visitor.dispatchDeparture(this);
        }
        return stop;
    }

    public _fastTraverse(cls: FastTraverseArg): NodeInterface[] {
        // Specialized traverse() that only supports instance checks.
        const result = [];
        if (this instanceof cls) {
            result.push(this);
        }
        const myNode = this;
        myNode._children.forEach((child): void => {
            if (typeof child === "undefined") {
                throw new Error("child is undefined");
            }
            // @ts-ignore
            if (typeof child._fastTraverse === "undefined") {
                throw new Error(`${child} does not have _fastTraverse`);
            }
            // @ts-ignore
            result.push(...child._fastTraverse(cls));
        });
        return result;
    }

    public _allTraverse(): NodeInterface[] {
        // Specialized traverse() that doesn't check for a condition.
        const result: NodeInterface[] = [];
        result.push(this);
        this._children.forEach((child): void => {
            // @ts-ignore
            result.push(...child._allTraverse());
        });
        return result;
    }

    public traverse(args: TraverseArgs): NodeInterface[] {
        const {
            condition, includeSelf = true, descend = true, siblings = false, ascend = false
        } = args;
        const mySiblings = ascend ? true : siblings;
        if (includeSelf && descend && !mySiblings) {
            if (!condition) {
                return this._allTraverse();
            }

            if ((condition.prototype instanceof Node) || condition === Node) {

                return this._fastTraverse(condition);
            }
        }
        if (typeof condition !== "undefined" && (condition.prototype instanceof Node || condition === Node)) {
            const nodeClass = condition;
            const myCondition = (node: Node, nodeClassArg: NodeClass): boolean => (
                (node instanceof nodeClassArg) || (node instanceof nodeClass)
            );
            throw new Error("unimplemented");
        }
        /*
            if isinstance(condition, (types.ClassType, type)):
                node_class = condition
                def condition(node, node_class=node_class):
                    return isinstance(node, node_class)
        */
        const r: NodeInterface[] = [];

        if (includeSelf && (condition == null || condition(this))) {
            r.push(this);
        }
        if (descend && this._children.length) {
            this._children.forEach((child): void => {
                r.push(...child.traverse({
                    includeSelf: true,
                    descend: true,
                    siblings: false,
                    ascend: false,
                    condition
                }));
            });
        }
        if (siblings || ascend) {
            let node: NodeInterface | undefined = (this as NodeInterface);
            while (node != null && node.parent != null) {
                const index = node.parent.getChildren().indexOf(node);
                node.parent.getChildren().slice(index + 1).forEach((sibling): void => {
                    r.push(...sibling.traverse({
                        includeSelf: true,
                        descend,
                        siblings: false,
                        ascend: false,
                        condition
                    }));
                });
                if (!ascend) {
                    node = undefined;
                } else {
                    node = node.parent;
                }
            }
        }
        return r;
    }

    // * NOTE : use traverse() instead of findall() for new code.

    // private *_fastFindall(cls: NodeClass): Iterable<NodeInterface> {
    //     // Specialized findall() that only supports instance checks.
    //     if (this instanceof cls) {
    //         yield this;
    //     }
    //     for (const child of this.children) {
    //         // @ts-ignore
    //         yield* child._fastFindall(cls);
    //     }
    // }

    // private *_superfastFindall(): Iterable<NodeInterface> {
    //     // Specialized findall() that doesn't check for a condition.
    //     yield this;
    //     for (const child of this.children) {
    //         // @ts-ignore
    //         yield* child._superfastFindall();
    //     }
    // }

    // public *findall(args: TraverseArgs): Iterable<NodeInterface> {
    //     let {
    //         condition, includeSelf = true, descend = true, siblings = false, ascend = false
    //     } = args;

    //     if (ascend) {
    //         siblings = true;
    //     }

    //     // Check for special argument combinations that allow using optimized versions
    //     if (includeSelf && descend && !siblings) {
    //         if (condition === null || condition === undefined) {
    //             yield* this._superfastFindall();
    //             return;
    //         } else if (typeof condition !== 'function' &&
    //             (condition.prototype instanceof Node || condition === Node)) {
    //             yield* this._fastFindall(condition);
    //             return;
    //         }
    //     }

    //     // Check if condition is a class and convert it to a function
    //     if (typeof condition !== 'function' && condition !== null && condition !== undefined) {
    //         const nodeClass = condition;
    //         const originalCondition = condition;
    //         condition = (node: NodeInterface): boolean => node instanceof nodeClass;
    //     }

    //     // Include self if requested and it matches the condition
    //     if (includeSelf && (condition === null || condition === undefined || condition(this))) {
    //         yield this;
    //     }

    //     // Process all children recursively if requested
    //     if (descend && this._children.length) {
    //         for (const child of this._children) {
    //             yield* child.findall({
    //                 condition,
    //                 includeSelf: true,
    //                 descend: true,
    //                 siblings: false,
    //                 ascend: false
    //             });
    //         }
    //     }

    //     // Process siblings and possibly ascend up the tree
    //     if (siblings || ascend) {
    //         let node: NodeInterface = this as NodeInterface;
    //         while (node.parent) {
    //             const parent = node.parent as ElementInterface;
    //             const children = parent.getChildren();
    //             let index = children.indexOf(node);

    //             // Extra check since Text nodes might have value-equality issues
    //             while (children[index] !== node) {
    //                 index = children.indexOf(node, index + 1);
    //                 if (index === -1) break;
    //             }

    //             // Process all following siblings
    //             for (const sibling of children.slice(index + 1)) {
    //                 yield* sibling.findall({
    //                     condition,
    //                     includeSelf: true,
    //                     descend,
    //                     siblings: false,
    //                     ascend: false
    //                 });
    //             }

    //             // If not ascending, stop after processing siblings
    //             if (!ascend) {
    //                 break;
    //             } else {
    //                 node = parent;
    //             }
    //         }
    //     }
    // }

    public add(iNodes: NodeInterface[] | NodeInterface): void {
        throw new UnimplementedError("");
    }


    public endtag(): string {
        return "";
    }

    public starttag(quoteattr?: QuoteattrCallback): string {
        return "";
    }

    public addBackref(prbid: {}): void {
    }

    public updateBasicAtts(dict_: Attributes): void {
        const dict2 = dict_ instanceof Node ? dict_.attributes : dict_;
        this.basicAttributes.forEach((att): void => {
            const v = att in dict2 ? dict2[att] : [];
            this.appendAttrList(att, v);
        });
    }

    public appendAttrList(attr: string, values: (string | {})[]): void {
        // List Concatenation
        values.forEach((value): void => {
            if ((this.attributes[attr].filter((v: {}): boolean => v === value)).length === 0) {
                this.attributes[attr].push(value);
            }
        });
    }

    public replaceAttr(attr: string, value: (string | {})[] | string | {}, force = true): void {
        // One or the other
        if (force || this.attributes[attr] == null) {
            this.attributes[attr] = value;
        }
    }

    public copyAttrConsistent(attr: string, value: (string | {}), replace?: boolean): void {
        if (this.attributes[attr] !== value) {
            this.replaceAttr(attr, value, replace);
        }
    }

    public updateAllAtts(
        dict_: Attributes,
        updateFun = this.copyAttrConsistent,
        replace = true,
        andSource = false
    ): void {
        const dict2 = dict_ instanceof Node ? dict_.attributes : dict_;
        // Include the source attribute when copying?
        let filterFun;
        if (andSource) {
            filterFun = this.isNotListAttribute.bind(this);
        } else {
            filterFun = this.isNotKnownAttribute.bind(this);
        }

        // Copy the basic attributes
        this.updateBasicAtts(dict2);

        // Grab other attributes in dict_ not in self except the
        // (All basic attributes should be copied already)
        const atts = Object.keys(dict2).filter(filterFun);
        atts.forEach((att): void => {
            updateFun.bind(this)(att, dict2[att], replace);
        });
    }

    /**
   Updates all attributes from node or dictionary `dict_`.

   Appends the basic attributes ('ids', 'names', 'classes',
   'dupnames', but not 'source') and then, for all other attributes in
   dict_, updates the same attribute in self.  When attributes with the
   same identifier appear in both self and dict_ whose values aren't each
   lists and replace is True, the values in self are replaced with the
   values in dict_; if the values from self and dict_ for the given
   identifier are both of list type, then the two lists are concatenated
   and the result stored in self; otherwise, the values in self are
   preserved.  When and_source is True, the 'source' attribute is
   included in the copy.

   NOTE: When replace is False, and self contains a 'source' attribute,
   'source' is not replaced even when dict_ has a 'source'
   attribute, though it may still be merged into a list depending
   on the value of update_fun.
   */
    public updateAllAttsConcatenating(dict_: Attributes, replace: boolean = true, andSource: boolean = false): void {
        this.updateAllAtts(dict_, this.copyAttrConcatenate, replace,
            andSource);
    }

    /**
   Returns True if and only if the given attribute is NOT one of the
   basic list attributes defined for all Elements.
   */
    public isNotListAttribute(attr: string): boolean {
        return !(attr in this.listAttributes);
    }

    /**
   Returns True if and only if the given attribute is NOT recognized by
   this class.
   */
    public isNotKnownAttribute(attr: string): boolean {
        return !(attr in this.knownAttributes);
    }

    public copyAttrConcatenate(attr: string, value: string | string[], replace?: boolean): void {
        /*
          """
          If attr is an attribute of self and both self[attr] and value are
          lists, concatenate the two sequences, setting the result to
          self[attr].  If either self[attr] or value are non-sequences and
          replace is True or self[attr] is None, replace self[attr] with value.
              Otherwise, do nothing.
              """ */
        if (this.attributes[attr] !== value) {
            if (Array.isArray(this.attributes[attr]) && Array.isArray(value)) {
                this.appendAttrList(attr, value);
            } else {
                this.replaceAttr(attr, value, replace);
            }
        }
    }

    public getCustomAttr(attrName: string): undefined {
        return undefined;
    }
}

/*
 * `Element` is the superclass to all specific elements.
 *  Elements contain attributes and child nodes.  Elements emulate
 *  dictionaries for attributes, indexing by attribute name (a string).  To
 *  set the attribute 'att' to 'value', do::
 *
 *      element['att'] = 'value'
 *
 *  There are two special attributes: 'ids' and 'names'.  Both are
 *  lists of unique identifiers, and names serve as human interfaces
 *  to IDs.  Names are case- and whitespace-normalized (see the
 *  fully_normalize_name() function), and IDs conform to the regular
 *  expression ``[a-z](-?[a-z0-9]+)*`` (see the make_id() function).
 *
 *  Elements also emulate lists for child nodes (element nodes and/or text
 *  nodes), indexing by integer.  To get the first child node, use::
 *
 *      element[0]
 *
 *  Elements may be constructed using the ``+=`` operator.  To add one new
 *  child node to element, do::
 *
 *      element += node
 *
 *  This is equivalent to ``element.append(node: NodeInterface)``.
 *
 *  To add a list of multiple child nodes at once, use the same ``+=``
 *  operator::
 *
 *      element += [node1, node2]
 *
 *  This is equivalent to ``element.extend([node1, node2])``.
 *
 * @extends module:nodes~Node
 * 
 * ******************** ORIGINAL OVERRIDEN METHODS ********************
 * 
    def __getitem__(self, key: str | int | slice) -> Any:
        if isinstance(key, str):
            return self.attributes[key]
        elif isinstance(key, int):
            return self.children[key]
        elif isinstance(key, slice):
            assert key.step in (None, 1), 'cannot handle slice with stride'
            return self.children[key.start:key.stop]
        else:
            raise TypeError('element index must be an integer, a slice, or '
                            'an attribute name string')

    def __setitem__(self, key, item) -> None:
        if isinstance(key, str):
            self.attributes[str(key)] = item
        elif isinstance(key, int):
            self.setup_child(item)
            self.children[key] = item
        elif isinstance(key, slice):
            assert key.step in (None, 1), 'cannot handle slice with stride'
            for node in item:
                self.setup_child(node)
            self.children[key.start:key.stop] = item
        else:
            raise TypeError('element index must be an integer, a slice, or '
                            'an attribute name string')

    def __delitem__(self, key: str | int | slice) -> None:
        if isinstance(key, str):
            del self.attributes[key]
        elif isinstance(key, int):
            del self.children[key]
        elif isinstance(key, slice):
            assert key.step in (None, 1), 'cannot handle slice with stride'
            del self.children[key.start:key.stop]
        else:
            raise TypeError('element index must be an integer, a simple 

 * 
 */
class Element extends Node implements ElementInterface {
    public nodeName: any;


    /**
   * A list of class-specific attributes that should not be copied with the
   * standard attributes when replacing a node.
   *
   * NOTE: Derived classes should override this value to prevent any of its
   * attributes being copied by adding to the value in its parent class.
   */
    public localAttributes: string[] = ["backrefs"];


    /**
   * The element generic identifier. If None, it is set as an instance
   * attribute to the name of the class.
   */
    public tagname: string = "";

    // Note: Node.attributes.ids is an array of strings
    // while document.ids is a dictionary of string to NodeInterface.
    public attributes: Attributes;


    /**
   * Create element.
   * @classdesc Abstracts a docutils Element.
   * @extends module:nodes~Node
   */
    public constructor(rawsource?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super();
        this.nodeName = Symbol.for("Element");
        children.forEach((child): void => this.append(child));
        this.attributes = {};
        this.listAttributes.forEach((x): void => {
            this.attributes[x] = [];
        });
        Object.keys(attributes).forEach((att): void => {
            const value: string | string[] = attributes[att];
            const attKey = att.toLowerCase();

            /* This if path never taken... why? FIXME */
            if (attKey in this.listAttributes) {
                if (!isIterable(value)) {
                    throw new Error();
                }

                const a: string[] = Array.isArray(value) ? value : [value];
                this.attributes[attKey] = [...a];
            } else {
                this.attributes[attKey] = value;
            }
        });
        this.tagname = this.constructor.name;
    }

    public _init(): void {
        super._init();
        /* List attributes which are defined for every Element-derived class
       instance and can be safely transferred to a different node. */
        this.basicAttributes = ["ids", "classes", "names", "dupnames"];
        /*
      "A list of class-specific attributes that should not be copied with the
      standard attributes when replacing a node.

      NOTE: Derived classes should override this value to prevent any of its
      attributes being copied by adding to the value in its parent class.
    */
        this.localAttributes = ["backrefs"];

        /* List attributes, automatically initialized to empty lists
       for all nodes. */
        this.listAttributes = [...this.basicAttributes, ...this.localAttributes];

        /* List attributes that are known to the Element base class. */
        this.knownAttributes = [...this.listAttributes, "source", "rawsource"];

        /* The element generic identifier. If None, it is set as an
       instance attribute to the name of the class. */
        // this.tagname = undefined; (already set in Node.constructor)

        /* Separator for child nodes, used by `astext()` method. */
        this.childTextSeparator = "\n\n";
    }


    public _domNode(domroot: globalThis.Document): HTMLElement {

        const element = domroot.createElement(this.tagname);
        const l = this.attlist();
        Object.keys(l).forEach((attribute): void => {
            const value: string | string[] = l[attribute];
            let myVal: string;
            if (Array.isArray(value)) {
                myVal = value.map((v): string => serialEscape(v.toString())).join(" ");
            } else {
                myVal = value.toString();
            }
            element.setAttribute(attribute, myVal);
        });
        this.children.forEach((child): void => {
            element.appendChild((child as Element)._domNode(domroot));
        });
        return element;
    }

    public emptytag(): string {
        return `<${[this.tagname, ...Object.entries(this.attlist())
            .map(([n, v]): string => `${n}="${v}"`)].join(" ")}/>`;
    }


    public astext(): string {
        return this.children.map((x): string => x.astext()).join(this.childTextSeparator);
    }

    public append(item: NodeInterface): void {
        this.setupChild(item);
        this.children.push(item);
    }

    public extend(...items: NodeInterface[]): void {
        items.forEach(this.append.bind(this));
    }

    public insert(index: number, item: NodeInterface | NodeInterface[]): void {
        if (item instanceof Node) {
            this.setupChild(item);
            this.children.splice(index, 0, item);
        } else if (item !== null && item !== undefined && Array.isArray(item)) {
            for (const child of item) {
                if (!(child instanceof Node)) {
                    throw new InvalidArgumentsError("item must be a Node or an array of Nodes");
                }
                this.setupChild(child);
            }
            // If item is an array, insert all items at index.
            this.children.splice(index, 0, ...item);
        }
    }

    public pop(i: number = -1): NodeInterface {
        return this.children.splice(i, 1)[0];
    }

    public remove(item: NodeInterface): void {
        const index = this.children.indexOf(item);
        if (index === -1) {
            throw new ApplicationError(`Node ${item} not found in children`);
        }
        this.children.splice(index, 1);
    }

    public index(item: NodeInterface, start: number = 0, stop: number = Number.MAX_SAFE_INTEGER): number {
        /**
       Return the index of the first occurrence of `item` in the
       children list, starting at `start` and stopping before `stop`.
       If `item` is not found, raise an error.
       */
        const index = this.children.indexOf(item, start);
        if (index === -1 || index >= stop) {
            throw new ApplicationError(`Node ${item} not found in children between ${start} and ${stop}`);
        }
        return index;
    }

    public previousSibling(): NodeInterface | undefined {
        /**
       Return preceding sibling node or ``None``.
       */
        try {
            const i = this.parent.index(this);
            return i > 0 ? this.parent.getChild(i - 1) : undefined;
        } catch (error) {
            return undefined;
        }
    }

    public clear(): void {
        this.children.length = 0;
    }

    public replace(old: NodeInterface, newItem: NodeInterface | NodeInterface[]): void {
        /**
       Replace one child `Node` with another child or children.
       */
        const index = this.children.indexOf(old);
        if (index === -1) {
            throw new ApplicationError(`Node ${old} not found in children`);
        }
        if (newItem instanceof Node) {
            this.setupChild(newItem as Node);
            this.children[index] = newItem;
        } else if (newItem !== null && newItem !== undefined && Array.isArray(newItem)) {
            newItem.forEach((item): void => {
                if (!(item instanceof Node)) {
                    throw new InvalidArgumentsError("newItem must be a Node or an array of Nodes");
                }
                this.setupChild(item);
            });
            this.children.splice(index, 1, ...newItem);
        }
    }

    public replaceSelf(newItem: NodeInterface | NodeInterface[]): void {
        /**
       Replace `self` node with `new`, where `new` is a node or a
       list of nodes.
       */
        let update: NodeInterface | NodeInterface[] | null = newItem;
        if (!Array.isArray(newItem)) {
            // `new` is a single node; update first child.
            try {
                update = newItem.getChildren()[0];
            } catch (error) {
                update = null;
            }
        }
        if (update instanceof Element) {
            update.updateBasicAtts(this);
        } else {
            // `update` is a Text node or `new` is an empty list.
            // Assert that we aren't losing any attributes.
            this.basicAttributes.forEach((att): void => {
                if (this.attributes[att]) {
                    throw new ApplicationError(`Losing "${att}" attribute: ${this.attributes[att]}`);
                }
            });
        }
        this.parent.replace(this, newItem);
    }

    public replaceAt(index: number, newItem: NodeInterface | NodeInterface[]): void {
        /**
       Replace child at `index` with `new`, where `new` is a node or a
       list of nodes.
       */
        if (index < 0 || index >= this.children.length) {
            throw new ApplicationError(`Index ${index} out of range for children`);
        }
        if (newItem instanceof Node) {
            this.setupChild(newItem);
            this.children[index] = newItem;
        } else if (Array.isArray(newItem)) {
            newItem.forEach((item): void => {
                if (!(item instanceof Node)) {
                    throw new InvalidArgumentsError("newItem must be a Node or an array of Nodes");
                }
                this.setupChild(item);
            });
            this.children.splice(index, 1, ...newItem);
        } else {
            throw new InvalidArgumentsError("newItem must be a Node or an array of Nodes");
        }
    }

    public add(item: NodeInterface[] | NodeInterface): void {
        if (Array.isArray(item)) {
            this.extend(...item);
        } else {
            this.append(item);
        }
    }

    public setupChild(child: NodeInterface): void {
        if (!(child instanceof Node)) {
            throw new InvalidArgumentsError(`Expecting node instance ${child}`);
        }

        if (!child) {
            throw new InvalidArgumentsError("need child");
        }

        child._parent = this;
        if (this.document) {
            child.document = this.document;
            if (typeof child.source === "undefined") {
                child.source = this.document.currentSource;
            }
            if (typeof child.line === "undefined") {
                child.line = this.document.currentLine;
            }
        }
    }

    public starttag(quoteAttr?: QuoteattrCallback): string {
        const q = quoteAttr || pseudoQuoteattr;

        const parts = [this.tagname];
        const attlist = this.attlist();
        Object.keys(attlist).forEach((name): void => {
            const value: string | string[] = attlist[name];

            let myVal = value;
            let gotPart = false;
            if (myVal === undefined) {
                parts.push(`${name}="True"`);
                gotPart = true;
            } else if (Array.isArray(myVal)) {
                const values = myVal.map((v: string): string => serialEscape(v.toString()));
                myVal = values.join(" ");
            } else {
                myVal = value.toString();
            }
            if (!gotPart) {
                myVal = q(myVal);
                parts.push(`${name}=${myVal}`);
            }
        });
        return `<${parts.join(" ")}>`;
    }

    public endtag(): string {
        return `</${this.tagname}>`;
    }

    public attlist(): Attributes {
        const attlist = this.nonDefaultAttributes();
        const sortedEntries = Object.entries(attlist).sort((a, b) => a[0].localeCompare(b[0]));
        const sortedAttlist: Attributes = {};
        for (const [key, value] of sortedEntries) {
            sortedAttlist[key] = value;
        }
        return sortedAttlist;
    }

    public nonDefaultAttributes(): Attributes {
        const atts: Attributes = {};
        Object.entries(this.attributes).forEach(([key, value]): void => {
            if (this.isNotDefault(key)) {
                atts[key] = value;
            }
        });
        return atts;
    }

    public isNotDefault(key: string): boolean {
        if (Array.isArray(this.attributes[key])
            && this.attributes[key].length === 0
            && this.listAttributes.includes(key)) {
            return false;
        }
        return true;
    }

    /*
     Return the index of the first child whose class does *not* match.

     Parameters:

     - `childclass`: A `Node` subclass to skip, or a tuple of `Node`
     classes. If a tuple, none of the classes may match.
     - `start`: Initial index to check.
     - `end`: Initial index to *not* check.
  */
    public firstChildNotMatchingClass(childClass: any | any[], start = 0, end = this.children.length): number | undefined {
        const myChildClass = Array.isArray(childClass) ? childClass : [childClass];
        const r = this.children.slice(start,
            Math.min(this.children.length, end))
            .findIndex((child, index): boolean => {
                if (myChildClass.findIndex((c): boolean => {
                    // if (typeof child === 'undefined') {
                    //     throw new Error(`child should not be undefined, index ${index}`);
                    // }
                    if (child instanceof c
                        || (this.children[index].classTypes.filter(

                            ((c2): boolean => c2.prototype instanceof c || c2 === c)
                        ))
                            .length) {
                        return true;
                    }
                    return false;
                }) === -1) {
                    return true;
                }
                return false;
            });

        if (r !== -1) {
            return r;
        }
        return undefined;
    }

    public pformat(indent = '    ', level = 0): string {
        return `${indent.repeat(level)}${this.starttag()}\n${this.children.map((c): string => c.pformat(indent, level + 1)).join("")}`;
    }

    public copy(): NodeInterface {
        const ctor = this.constructor as new (
            rawsource?: string,
            children?: NodeInterface[],
            attributes?: Attributes
        ) => NodeInterface;

        const obj = new ctor(this.rawsource, [], this.attributes);
        obj.document = this.document;
        obj.source = this.source;
        obj.line = this.line;
        return obj;
    }

    public deepcopy(): NodeInterface {
        const copy = this.copy();
        copy.extend(...this.children.map((child): NodeInterface => child.deepcopy()));
        return copy;
    }


    /*
    Update basic attributes ('ids', 'names', 'classes',
    'dupnames', but not 'source') from node or dictionary `dict_`.
  */

    /*
  For each element in values, if it does not exist in self[attr], append
  it.

  NOTE: Requires self[attr] and values to be sequence type and the
  former should specifically be a list.
*/

    /*
  If self[attr] does not exist or force is True or omitted, set
  self[attr] to value, otherwise do nothing.
*/

    /*
  If replace is true or this.attributes[attr] is null, replace
  this.attributes[attr] with value.  Otherwise, do nothing.
*/

    /*
  Updates all attributes from node or dictionary `dict_`.

    Appends the basic attributes ('ids', 'names', 'classes',
    'dupnames', but not 'source') and then, for all other attributes in
    dict_, updates the same attribute in self.  When attributes with the
    same identifier appear in both self and dict_, the two values are
    merged based on the value of update_fun.  Generally, when replace is
    True, the values in self are replaced or merged with the values in
    dict_; otherwise, the values in self may be preserved or merged.  When
    and_source is True, the 'source' attribute is included in the copy.

    NOTE: When replace is False, and self contains a 'source' attribute,
          'source' is not replaced even when dict_ has a 'source'
          attribute, though it may still be merged into a list depending
          on the value of update_fun.
    NOTE: It is easier to call the update-specific methods then to pass
          the update_fun method to this function.
*/
    /** Note that this Element has been referenced by its name
   `name` or id `id`. */
    public noteReferencedBy(name: string, id: string): void {
        this.referenced = true;
        const byName = this.attributes.expect_referenced_by_name[name];
        const byId = this.attributes.expect_referenced_by_name[id];
        if (byName != null) {
            byName.referenced = true;
        }
        if (byId != null) {
            byId.referenced = 1;
        }
    }


    public validate(recursive = true): void {
        // not implemented for now.
    }

}


// ====================
//  Element Categories
// ====================
//
// See https://docutils.sourceforge.io/docs/ref/doctree.html#element-hierarchy.

/**
 * Element at the root of a document tree.
 */
class Root {
}

/**
 * Structural elements
 */
class Structural {
}

/**
 * Structural subelements are children of Structural elements.
 *
 * Most Structural elements accept only specific SubStructural elements.
 */
class SubStructural {
}

/**
 * Bibliographic Elements (displayed document meta-data).
 */
class Bibliographic {
}

/**
 * Body elements
 */
class Body {
}

/**
 * Admonitions (distinctive and self-contained notices).
 */
class Admonition extends Body {
}

/**
 * List-like body elements.
 */
class Sequential extends Body {
}

/**
 * Miscellaneous body elements.
 */
class General extends Body {
}

/**
 * Special internal body elements.
 */
class Special extends Body {
}

/**
 * Body Subelements always occur within specific parent elements.
 */
class Part {
}

/**
 * Decorative elements (`header` and `footer`).
 * 
 * Children of `decoration`.
 */
class Decorative {
}

/**
 * Inline elements contain text data and possibly other inline elements.
 */
class Inline {
}


// Orthogonal categories and Mixins
// ================================

/**
 * Elements which may occur before Bibliographic Elements.
 */
class PreBibliographic {
}

/** 
 * Internal elements that don't appear in output. 
 */
class Invisible extends PreBibliographic {
}

/**
 * Contains a `label` as its first element.
 */
class Labeled {
}

class Resolvable {
    resolved = false;
}

/**
 * Mixin for Elements that accept a "backrefs" attribute.
 */
class BackLinkable {
    public backrefs: string[] = [];

    public addBackref(refid: string): void {
        this.backrefs.push(refid);
    }
}
/**
 * Elements holding a cross-reference (outgoing hyperlink).
 */
class Referential extends Resolvable {
}

/**
 * Cross-reference targets (incoming hyperlink).
 */
class Targetable extends Resolvable {
    referenced = 0;
    indirectReferenceName?: string;
    /*
        Holds the whitespace_normalized_name (contains mixed case) of a target.
        Required for MoinMoin/reST compatibility.
    */
}

/**
 * Title, sub-title, or informal heading (rubric).
 */
class Titular {
}

/**
 * An element which directly contains text.
 *
 * Its children are all `Text` or `Inline` subclass nodes.  You can
 * check whether an element's context is inline simply by checking whether
 * its immediate parent is a `TextElement` instance (including subclasses).
 * This is handy for nodes like `image` that can appear both inline and as
 *  standalone body elements.
 * 
 * If passing children to `__init__()`, make sure to set `text` to
 * ``''`` or some other suitable value.
 */
class TextElement extends Element implements TextElementInterface {
    public constructor(
        rawsource: string = '',
        text: string = '',
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ) {
        if (Array.isArray(text) && text.length > 0) {
            throw new InvalidArgumentsError("text should not be an array");
        }

        if (text) {
            // If text has content, create a Text node and add it as first child
            const textnode = new Text(text);
            super(rawsource, [textnode, ...children], attributes);
        } else {
            // Otherwise just use the children as-is
            super(rawsource, children, attributes);
        }
    }

    // in TypeScript with positional parameters, you'll need to override the copy method in TextElement
    public copy(): NodeInterface {
        const ctor = this.constructor as new (
            rawsource?: string,
            text?: string,
            children?: NodeInterface[],
            attributes?: Attributes
        ) => NodeInterface;

        const obj = new ctor(this.rawsource, '', [], this.attributes);
        obj.document = this.document;
        obj.source = this.source;
        obj.line = this.line;
        return obj;
    }

}

/**
 * An element which directly contains preformatted text.
 */
class FixedTextElement extends TextElement {
    constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.attributes["xml:space"] = "preserve";
    }
}

// =================================
//  Concrete Document Tree Elements
// =================================
//
// See https://docutils.sourceforge.io/docs/ref/doctree.html#element-reference

// Decorative Elements
// ===================


class header extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Decorative];
    }
}
class footer extends Element {
    public constructor(rawsource?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, children, attributes);
        this.classTypes = [Decorative];
    }
}

// Structural Subelements
// ======================

/**
 * Title of `document`, `section`, `topic` and generic `admonition`.
 */
class title extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Titular, PreBibliographic, SubStructural];
    }
}

/**
 * Sub-title of `document`, `section` and `sidebar`.
 */
class subtitle extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Titular, PreBibliographic, SubStructural];
    }
}

/**
 * Container for "invisible" bibliographic data, or meta-data.
 */
class meta extends Element {
    public constructor(rawsource?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, children, attributes);
        this.classTypes = [PreBibliographic, SubStructural];
    }
}

/**
 * Container for displayed document meta-data.
 */
class docinfo extends Element {
    public constructor(rawsource?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, children, attributes);
        this.classTypes = [PreBibliographic, SubStructural];
    }
}

/**
 * Container for `header` and `footer`.
 */
class decoration extends Element {
    public constructor(rawsource?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, children, attributes);
        this.classTypes = [PreBibliographic, SubStructural];
    }

    public getHeader(): NodeInterface {
        if (!this.children.length || !(this.children[0] instanceof header)) {
            this.children.splice(0, 0, new header());
        }
        return this.children[0];
    }

    public getFooter(): NodeInterface {
        if (!this.children.length || !(this.children[this.children.length - 1] instanceof footer)) {
            this.add(new footer());
        }
        return this.children[this.children.length - 1];
    }
}

/**
 * Transitions are breaks between untitled text parts.
 *
 * https://docutils.sourceforge.io/docs/ref/doctree.html#transition
 */
class transition extends Element {

    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [SubStructural];
    }
}

// Structural Elements
// ===================

/**
 * Topics are non-recursive, mini-sections.
 *
 * https://docutils.sourceforge.io/docs/ref/doctree.html#topic
 */
class topic extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Structural];
    }
}


/**
 * Sidebars__ are like parallel documents providing related material.
 *
 * A sidebar is typically offset by a border and "floats" to the side
 * of the page
 *
 * https://docutils.sourceforge.io/docs/ref/doctree.html#sidebar
 */
class sidebar extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Structural];
    }
}

/**
 * Document section__. The main unit of hierarchy.
 *
 * https://docutils.sourceforge.io/docs/ref/doctree.html#section
 */
class section extends Element {
    public constructor(rawsource?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, children, attributes);
        this.classTypes = [Structural];
    }
}

// Root Element
// ============

/**
 * The document root element.
 *
 * Do not instantiate this class directly; use
 * `docutils.utils.new_document()` instead.
 */
class document extends Element implements Document {
    public settings: Settings;

    public reporter: ReporterInterface;

    public decoration?: decoration;

    public transformMessages: Systemmessage[];

    public parseMessages: Systemmessage[];

    public transformer: Transformer;

    public substitutionDefs: SubstitutionDefs;

    public substitutionNames: SubstitutionNames;

    public citationRefs: RefNames;

    private citations: NodeInterface[];

    private footnoteRefs: RefNames;

    private autofootnoteRefs: NodeInterface[];

    private symbolFootnotes: NodeInterface[];

    private footnotes: NodeInterface[];

    private symbolFootnoteRefs: NodeInterface[];

    private indirectTargets: NodeInterface[];

    private autofootnotes: NodeInterface[];

    private refIds: RefIds;

    private refNames: RefNames;

    public nameIds: NameIds;

    public ids: Ids;

    /** Keeps track of how many IDs we’ve emitted for each prefix. */
    private idCounter: Map<string, number> = new Map();

    private nameTypes: NameTypes;

    private idStart: number;

    private autofootnoteStart: number;

    private symbolFootnoteStart: number;
    private idPrefix: string = "";
    private autoIdPrefix: string = "%";
    public logger: LoggerType;

    /** Private constructor */
    public constructor(
        settings: Settings,
        reporter: ReporterInterface,
        logger: LoggerType,
        rawsource?: string,
        children?: NodeInterface[],
        attributes?: Attributes,
    ) {
        super(rawsource, children, attributes);
        this.classTypes = [Root];
        this.logger = logger;
        this.tagname = "document";
        this.settings = settings;
        this.reporter = reporter;
        this.indirectTargets = [];
        this.substitutionDefs = {};
        this.substitutionNames = {};
        this.refNames = {};
        this.refIds = {};
        this.nameIds = {};
        this.nameTypes = {};
        this.ids = {};
        this.footnoteRefs = {};
        this.citationRefs = {};
        this.autofootnotes = [];
        this.autofootnoteRefs = [];
        this.symbolFootnotes = [];
        this.symbolFootnoteRefs = [];
        this.footnotes = [];
        this.citations = [];
        this.autofootnoteStart = 1;
        this.symbolFootnoteStart = 0;
        this.idStart = 1;
        this.parseMessages = [];
        this.transformMessages = [];
        this.transformer = new Transformer(this, logger);
        this.decoration = undefined;
        this.document = this;
    }

    public setId(node: NodeInterface, msgnode?: NodeInterface, suggestedPrefix: string = ''): string {
        // If node already has IDs, register them and check for duplicates
        if (node.attributes.ids.length > 0) {
            const id = node.attributes.ids[node.attributes.ids.length - 1];
            for (const myId of node.attributes.ids) {
                if (!(myId in this.ids)) {
                    this.ids[myId] = node;
                }
                if (this.ids[myId] !== node) {
                    const msg = this.reporter.error(
                        `Duplicate ID: "${myId}" used by ${this.ids[myId].starttag()} and ${node.starttag()}`
                    );
                    if (msgnode !== undefined && msg !== undefined) {
                        msgnode.add(msg);
                    }
                }
            }
            return id;
        }

        // Generate and set ID
        let baseId = '';
        let id = '';

        // Try to create ID from node names
        for (const name of node.attributes.names) {
            if (this.idPrefix) {  // allow names starting with numbers
                baseId = makeId('x' + name).substring(1);
            } else {
                baseId = makeId(name);
            }
            id = this.idPrefix + baseId;
            if (baseId && !(id in this.ids)) {
                break;
            }
        }

        // If no suitable ID found from names, generate one
        if (!baseId || (id in this.ids)) {
            let prefix;
            if (baseId && this.autoIdPrefix.endsWith('%')) {
                // Disambiguate name-derived ID
                prefix = id + '-';
            } else {
                prefix = this.idPrefix + this.autoIdPrefix;
                if (prefix.endsWith('%')) {
                    prefix = `${prefix.slice(0, -1)}${suggestedPrefix || makeId(node.tagname)}-`;
                }
            }

            // Keep incrementing counter until unique ID found
            while (true) {
                const count = (this.idCounter.get(prefix) || 0) + 1;
                this.idCounter.set(prefix, count);
                id = `${prefix}${count}`;
                if (!(id in this.ids)) break;
            }
        }

        node.attributes.ids.push(id);
        this.ids[id] = node;
        return id;
    }

    public setNameIdMap(node: NodeInterface, id: string, msgnode?: NodeInterface, explicit?: boolean): void {
        node.attributes.names.forEach((name: string): void => {
            if (name in this.nameIds) {
                this.setDuplicateNameId(node, id, name, msgnode, explicit);
            } else {
                this.nameIds[name] = id;
                this.nameTypes[name] = explicit || false;
            }
        });
    }

    public setDuplicateNameId(node: NodeInterface, id: string, name: string, msgnode?: NodeInterface, explicit?: boolean): void {
        const oldId = this.nameIds[name];
        const oldExplicit = this.nameTypes[name];
        this.nameTypes[name] = oldExplicit || explicit || false;
        let oldNode;
        if (explicit) {
            if (oldExplicit) {
                let level = 2;
                if (oldId != null) {
                    oldNode = this.ids[oldId];
                    if ("refuri" in node.attributes) {
                        const { refuri } = node.attributes;
                        if (oldNode.attributes.names.length
                            && "refuri" in oldNode.attributes
                            && oldNode.attributes.refuri === refuri) {
                            level = 1; // just inform if refuri's identical
                        }
                    }
                    if (level > 1) {
                        dupname(oldNode, name);
                        // worth seeing if the same behavior can be obtained
                        // via deletion
                        this.nameIds[name] = undefined;
                    }
                }
                const msg = this.reporter.systemMessage(
                    level, `Duplicate explicit target name: "${name}".`,
                    [], { backrefs: [id], base_node: node }
                );
                if (msgnode != null) {
                    msgnode.add(msg);
                }
                dupname(node, name);
            } else {
                this.nameIds[name] = id;
                if (oldId != null) {
                    oldNode = this.ids[oldId];
                    dupname(oldNode, name);
                }
            }
        } else {
            if (oldId != null && !oldExplicit) {
                this.nameIds[name] = undefined;
                oldNode = this.ids[oldId];
                dupname(oldNode, name);
            }
            dupname(node, name);
        }
        if (!explicit || (!oldExplicit && oldId != null)) {
            const msg = this.reporter.info(
                `Duplicate implicit target name: "${name}".`, [],
                { backrefs: [id], base_node: node }
            );
            if (msgnode != null) {
                msgnode.add(msg);
            }
        }
    }

    public hasName(name: string): boolean {
        return Object.keys(this.nameIds).includes(name);
    }

    public noteImplicitTarget(target: NodeInterface, msgnode?: NodeInterface): void {
        const id = this.setId(target, msgnode);
        this.setNameIdMap(target, id, msgnode);
    }

    public noteExplicitTarget(target: NodeInterface, msgnode?: NodeInterface): void {
        const id = this.setId(target, msgnode);
        this.setNameIdMap(target, id, msgnode, true);
    }

    public noteRefname(node: NodeInterface): void {
        if (node === undefined || node.attributes.refname === undefined) {
            throw new InvalidStateError();
        }
        const a = [node];
        if (this.refNames[node.attributes.refname]) {
            this.refNames[node.attributes.refname].push(node);
        } else {
            this.refNames[node.attributes.refname] = a;
        }
    }

    public noteRefId(node: NodeInterface): void | never {
        if (node === undefined || node.attributes.refid === undefined) {
            throw new InvalidStateError();
        }
        const a = [node];
        if (this.refIds[node.attributes.refid]) {
            this.refIds[node.attributes.refid].push(node);
        } else {
            this.refIds[node.attributes.refid] = a;
        }
    }

    public noteIndirectTarget(target: NodeInterface): void {
        this.indirectTargets.push(target);
        // check this fixme
        if (target.names) {
            this.noteRefname(target);
        }
    }

    public noteAnonymousTarget(target: NodeInterface): void {
        this.setId(target);
    }

    public noteAutofootnote(footnote: NodeInterface): void {
        this.setId(footnote);
        this.autofootnotes.push(footnote);
    }

    public noteAutofootnoteRef(ref: NodeInterface): void {
        this.setId(ref);
        this.autofootnoteRefs.push(ref);
    }

    public noteSymbolFootnote(footnote: NodeInterface): void {
        this.setId(footnote);
        this.symbolFootnotes.push(footnote);
    }

    public noteSymbolFootnoteRef(ref: NodeInterface): void {
        this.setId(ref);
        this.symbolFootnoteRefs.push(ref);
    }

    public noteFootnote(footnote: NodeInterface): void {
        this.setId(footnote);
        this.footnotes.push(footnote);
    }

    public noteFootnoteRef(ref: NodeInterface): void {
        if (ref === undefined || ref.attributes.refname === undefined) {
            throw new InvalidStateError();
        }
        this.setId(ref);
        const a = [ref];
        if (this.footnoteRefs[ref.attributes.refname]) {
            this.footnoteRefs[ref.attributes.refname].push(ref);
        } else {
            this.footnoteRefs[ref.attributes.refname] = a;
        }
        this.noteRefname(ref);
    }

    public noteCitation(citation: NodeInterface): void {
        this.citations.push(citation);
    }

    public noteCitationRef(ref: NodeInterface): void | never {
        if (ref === undefined || ref.attributes.refname === undefined) {
            throw new InvalidStateError();
        }
        this.setId(ref);
        if (this.citationRefs[ref.attributes.refname]) {
            this.citationRefs[ref.attributes.refname].push(ref);
        } else {
            this.citationRefs[ref.attributes.refname] = [ref];
        }
        this.noteRefname(ref);
    }

    public noteSubstitutionDef(subdef: substitution_definition, defName: string, msgnode: NodeInterface): void {
        const name = whitespaceNormalizeName(defName);
        if (Object.keys(this.substitutionDefs).includes(name)) {
            const msg = this.reporter.error(`Duplicate substitution definition name: "${name}".`, [],
                { baseNode: subdef });
            if (msgnode != null && msg !== undefined) {
                msgnode.add(msg);
            }
            const oldnode = this.substitutionDefs[name];
            dupname(oldnode, name);
        }
        this.substitutionDefs[name] = subdef;
        this.substitutionNames[fullyNormalizeName(name)] = name;
    }

    public noteSubstitutionRef(subref: NodeInterface, refname: string): void {
        subref.attributes.refname = whitespaceNormalizeName(refname);
    }

    public notePending(pending: PendingInterface, priority?: number): void {
        this.transformer.addPending(pending, priority);
    }

    public noteParseMessage(message: Systemmessage): void {
        this.parseMessages.push(message);
    }

    public noteTransformMessage(message: Systemmessage): void {
        this.transformMessages.push(message);
    }

    public noteSource(source: string, offset: number): void {
        this.currentSource = source;
        if (offset === undefined) {
            this.currentLine = offset;
        } else {
            this.currentLine = offset + 1;
        }
    }

    public copy(): NodeInterface {
        const ctor = this.constructor as new (
            settings: Settings,
            reporter: ReporterInterface,
            logger: LoggerType,
            rawsource?: string,
            children?: NodeInterface[],
            attributes?: Attributes
        ) => NodeInterface;

        const obj = new ctor(
            this.settings,
            this.reporter,
            this.logger,
            this.rawsource,
            [],
            this.attributes
        );
        obj.source = this.source;
        obj.line = this.line;
        return obj;
    }

    public getDecoration(): decoration {
        if (!this.decoration) {
            this.decoration = new decoration();
            const index = this.firstChildNotMatchingClass(Titular);
            if (index === undefined) {
                this.append(this.decoration);
            } else {
                this.insert(index, this.decoration)
            }
        }
        return this.decoration;
    }
}

// Bibliographic Elements
// ======================
class author extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Bibliographic];
    }
}

class organization extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Bibliographic];
    }
}

class address extends FixedTextElement {

    public constructor(...args: any[]) {
        super(...args);
        this.classTypes = [Bibliographic];
    }
}

class contact extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Bibliographic];
    }
}

class version extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Bibliographic];
    }
}

class revision extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Bibliographic];
    }
}

class status extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Bibliographic];
    }
}

class date extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Bibliographic];
    }
}

class copyright extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Bibliographic];
    }
}

/**
 * Container for author information for documents with multiple authors.
 */
class authors extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Bibliographic];
    }
}

// Body Elements
// =============
//
// General
// -------
//
// Miscellaneous Body Elements and related Body Subelements (Part)

class paragraph extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [General];
    }
}

class rubric extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [General, Titular];
    }
}

class compound extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [General];
    }
}

class container extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [General];
    }
}

class attribution extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Part];
    }
}

class block_quote extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [General];
    }
}

class reference extends TextElement {
    public resolved: boolean = false;
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [General, Inline, Referential];
    }
}

// Lists
// -----
//
// Lists (Sequential) and related Body Subelements (Part)

class list_item extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Part];
    }
}

class bullet_list extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Sequential];
    }
}


class enumerated_list extends Element {
    // TODO : USE ATTRIBUTES FOR THOSE PROPS! (see body.ts !)
    public start?: number;
    public suffix?: string;
    public prefix?: string;
    public enumtype: string = '';

    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Sequential];
    }
}

class term extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Part];
    }
}

class classifier extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Part];
    }
}

/**
 * Definition of a `term` in a `definition_list`.
 */
class definition extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Part];
    }
}

class definition_list_item extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Part];
    }
}

/**
 * List of terms and their definitions.
 *
 * Can be used for glossaries or dictionaries, to describe or
 * classify things, for dialogues, or to itemize subtopics.
 */
class definition_list extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Sequential];
    }
}

class field_name extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Part];
    }
}

class field_body extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Part];
    }
}

class field extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Part, Bibliographic];
    }
}

/**
 * List of label & data pairs.
 *
 * Typically rendered as a two-column list.
 * Also used for extension syntax or special processing.
 */
class field_list extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Sequential];
    }
}

/**
 * A literal command-line option. Typically monospaced.
 */
class option_string extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Part];
    }
}

/**
 * Placeholder text for option arguments.
 */
class option_argument extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Part];
    }

    // fixme test this
    public astext(): string {
        const r = super.astext();
        return (this.attributes.delimiter || " ") + r;
    }
}

/**
 * Option element in an `option_list_item`.
 *
 * Groups an option string with zero or more option argument placeholders.
 */
class option extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Part];
        this.childTextSeparator = ""; // fixme test this
    }
}

/**
 * Groups together one or more `option` elements, all synonyms.
 */
class option_group extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Part];
        this.childTextSeparator = ", ";
    }
}

/**
 * Describtion of a command-line option.
 */
class description extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Part];
    }
}

/**
 * Container for a pair of `option_group` and `description` elements.
 */
class option_list_item extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Part];
        this.childTextSeparator = "  ";
    }
}

/**
 * Two-column list of command-line options and descriptions.
 */
class option_list extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Sequential];
    }
}

// Pre-formatted text blocks
// -------------------------

class literal_block extends FixedTextElement {
    public constructor(...args: any[]) {
        super(...args);
        this.classTypes = [General];
    }
}

class doctest_block extends FixedTextElement {
    public constructor(...args: any[]) {
        super(...args);
        this.classTypes = [General];
    }
}
/**
 * Mathematical notation (display formula).
 */
class math_block extends FixedTextElement {
    public constructor(...args: any[]) {
        super(...args);
        this.classTypes = [General];
    }
}

/**
 * Single line of text in a `line_block`.
 */
class line extends TextElement implements HasIndent {
    public indent: number = 0;
    public _init(): void {
        super._init();
        this.classTypes = [Part];
    }
}

/**
 * Sequence of lines and nested line blocks.
 */
class line_block extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [General];
    }
}

// Admonitions
// -----------
// distinctive and self-contained notices

















class Text extends Node {
    public pformat(indent = '    ', level = 0): string {

        const indentStr = indent.repeat(level);
        const lines = this.astext().split('\n').map(line => `${indentStr}${line}`);

        if (lines.length === 0) {
            return '';
        }

        return `${lines.join('\n')}\n`;

    }

    public copy(): NodeInterface {

        const ctor = this.constructor as new (
            data: string,
            rawsource?: string,
        ) => NodeInterface;

        const obj = new ctor(this.data, this.rawsource);
        return obj;
    }

    public deepcopy(): NodeInterface {
        return this.copy();
    }

    public walk(visitor: Visitor): boolean {
        throw new Error("Method not implemented.");
    }

    private data: string;

    public constructor(data: string, rawsource = "") {
        super();
        if (typeof data === "undefined") {
            throw new Error("data should not be undefined");
        }

        this.rawsource = rawsource;
        this.data = data;
        this.children = [];
    }

    public _domNode(domroot: globalThis.Document): any {
        return domroot.createTextNode(this.data);
    }

    public astext(): string {
        return unescape(this.data);
    }

    public toString(): string {
        return this.astext();
    }

    public toSource(): string {
        return this.toString();
    }

    public add(iNodes: NodeInterface[] | NodeInterface): void {
        throw new UnimplementedError("");
    }

    public emptytag(): string {
        return "";
    }
}



export interface TransformerInterface {
    addPending(pending: NodeInterface, priority: number): void;
}









class attention extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Admonition];
    }
}


class caution extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Admonition];
    }
}

class danger extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Admonition];
    }
}

class error extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Admonition];
    }
}

class important extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Admonition];
    }
}

class note extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Admonition];
    }
}

class tip extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Admonition];
    }
}

class hint extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Admonition];
    }
}

class warning extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Admonition];
    }
}

class admonition extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [General, BackLinkable, Labeled, Targetable];
    }
}

class comment extends FixedTextElement {
    public constructor(...args: any[]) {
        super(...args);
        this.classTypes = [Special, Invisible, Inline, Targetable];
    }
}

class substitution_definition extends TextElement {
    public constructor(...args: any[]) {
        super(...args);
        this.classTypes = [Special, Invisible];
    }
}

class target extends TextElement {
    public indirectReferenceName: string = "";
    public constructor(...args: any[]) {
        super(...args);
        this.classTypes = [Special, Invisible, Inline, Targetable];
    }
}

class footnote extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [General, BackLinkable, Labeled, Targetable];
    }
}

class citation extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [General, BackLinkable, Labeled, Targetable];
    }
}

class label extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Part];
    }
}

class figure extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [General];
    }
}

class caption extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Part];
    }
}

class legend extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Part];
    }
}

class table extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [General];
    }
}

class tgroup extends Element {
    public stubs?: {}[];
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Part];
    }
}

class colspec extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Part];
    }
}

class thead extends Element {

    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Part];
    }
}

class tbody extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Part];
    }
}

class row extends Element {
    public column?: number;
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Part];
    }
}

class entry extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [Part];
    }
}

class system_message extends Element implements Systemmessage {
    public constructor(message: string, children: NodeInterface[], attributes: Attributes) {
        super((attributes.rawsource || ""),
            (message ? [new paragraph("", message), ...children] : children),
            attributes);
        setupBacklinkable(this);
        this.classTypes = [Special, BackLinkable, PreBibliographic];
    }
}

/**
 *  The "pending" element is used to encapsulate a pending operation: the
 *  operation (transform), the point at which to apply it, and any data it
 *  requires.  Only the pending operation's location within the document is
 *  stored in the public document tree (by the "pending" object itself); the
 *  operation and its data are stored in the "pending" object's internal
 *  instance attributes.
 *
 *  For example, say you want a table of contents in your reStructuredText
 *  document.  The easiest way to specify where to put it is from within the
 *  document, with a directive::
 *
 *      .. contents::
 *
 *  But the "contents" directive can't do its work until the entire document
 *  has been parsed and possibly transformed to some extent.  So the directive
 *  code leaves a placeholder behind that will trigger the second phase of its
 *  processing, something like this::
 *
 *      <pending ...public attributes...> + internal attributes
 *
 *  Use `document.note_pending()` so that the
 *  `docutils.transforms.Transformer` stage of processing can run all pending
 *  transforms.
 */
class pending extends Element {
    public details: Record<string, any>;

    public transform: TransformType;

    public constructor(
        transform: TransformType,
        details?: {},
        rawsource = "",
        children?: NodeInterface[],
        attributes?: Attributes
    ) {
        super(rawsource, children, attributes);
        /** The `docutils.transforms.Transform` class implementing the pending
     operation. */
        this.transform = transform;

        /** Detail data (dictionary) required by the pending operation. */
        this.details = details || {};
    }

    public pformat(indent = '    ', level = 0): string {
        const internals: string[] = [
            '.. internal attributes:',
            `     .transform: ${this.transform.constructor.name}`,
            '     .details:'
        ];
        const details = Object.entries(this.details).sort();
        for (const [key, value] of details) {
            if (value instanceof Node) {
                internals.push(`${' '.repeat(7)}${key}:`);
                internals.push(...value.pformat().split('\n').map(line => `${' '.repeat(9)}${line}`));
            } else if (Array.isArray(value) && value.length > 0 && value[0] instanceof Node) {
                internals.push(`${' '.repeat(7)}${key}:`);
                for (const v of (value as NodeInterface[])) {
                    internals.push(...v.pformat().split('\n').map(line => `${' '.repeat(9)}${line}`));
                }
            } else {
                internals.push(`${' '.repeat(7)}${key}: ${value?.toString()}`);
            }
        }
        return super.pformat(indent, level)
            + internals.map(line => `${indent.repeat(level)}    ${line}\n`).join('');
    }

    /*

    def pformat(self, indent: str = '    ', level: int = 0) -> str:
        internals = ['.. internal attributes:',
                     '     .transform: %s.%s' % (self.transform.__module__,
                                                 self.transform.__name__),
                     '     .details:']
        details = sorted(self.details.items())
        for key, value in details:
            if isinstance(value, Node):
                internals.append('%7s%s:' % ('', key))
                internals.extend(['%9s%s' % ('', line)
                                  for line in value.pformat().splitlines()])
            elif (value
                  and isinstance(value, list)
                  and isinstance(value[0], Node)):
                internals.append('%7s%s:' % ('', key))
                for v in value:
                    internals.extend(['%9s%s' % ('', line)
                                      for line in v.pformat().splitlines()])
            else:
                internals.append('%7s%s: %r' % ('', key, value))
        return (Element.pformat(self, indent, level)
                + ''.join(('    %s%s\n' % (indent * level, line))
                          for line in internals))

    */


    public copy(): NodeInterface {
        const ctor = this.constructor as new (
            transform: TransformType,
            details?: {},
            rawsource?: string,
            children?: NodeInterface[],
            attributes?: Attributes
        ) => NodeInterface;

        const obj = new ctor(
            this.transform,
            this.details,
            this.rawsource,
            [],
            this.attributes
        );
        obj.document = this.document;
        obj.source = this.source;
        obj.line = this.line;
        return obj;
    }

}

class raw extends FixedTextElement {
    public constructor(...args: any[]) {
        super(...args);
        this.classTypes = [Special, Inline, PreBibliographic];
    }
}

// =================
//  Inline Elements
// =================
class emphasis extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Inline];
    }
}

class strong extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Inline];
    }
} // Inline

class literal extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Inline];
    }
} // Inline

class footnote_reference extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [General, Inline, Referential];
    }
} // General, Inline, Referential
class citation_reference extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [General, Inline, Referential];
    }
} // General, Inline, Referential
class substitution_reference extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Inline];
    }
} // General, Inline, Referential
class title_reference extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Inline];
    }
} // General, Inline, Referential

class abbreviation extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Inline];
    }
}

class acronym extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Inline];
    }
}

class superscript extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Inline];
    }
}

class subscript extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Inline];
    }
}

class math extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Inline];
    }
}

class image extends Element {
    public constructor(rawsource?: string, children?: NodeInterface[], attributes?: Attributes) {
        super(rawsource, children, attributes);
        this.classTypes = [General, Inline];
    }

    public astext(): string {
        return Array.isArray(this.attributes.alt) ? this.attributes.alt.join(' ') : this.attributes.alt || "";
    }
}

class inline extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Inline];
    }
}

class problematic extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Inline];
    }
}

class generated extends TextElement {
    public constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        super(rawsource, text, children, attributes);
        this.classTypes = [Inline];
    }
}

// ========================================
//  Auxiliary Classes, Functions, and Data

export {
    Node, whitespaceNormalizeName, NodeVisitor, GenericNodeVisitor, TreeCopyVisitor,
    SparseNodeVisitor, Element, TextElement,
    Text, abbreviation, acronym, address, admonition, attention,
    attribution, author, authors, block_quote, bullet_list, caption,
    caution, citation, citation_reference, classifier, colspec, comment,
    compound, contact, container, copyright, danger, date, decoration,
    definition, definition_list, definition_list_item, description,
    docinfo, doctest_block, document, emphasis, entry, enumerated_list,
    error, field, field_body, field_list, field_name, figure, footer,
    footnote, footnote_reference, generated, header, hint, image,
    important, inline, label, legend, line, line_block, list_item,
    literal, literal_block, math, math_block, meta, note, option,
    option_argument, option_group, option_list, option_list_item,
    option_string, organization, paragraph, pending, problematic, raw,
    reference, revision, row, rubric, section, sidebar, status, strong,
    subscript, substitution_definition, substitution_reference, subtitle,
    superscript, system_message, table, target, tbody, term, tgroup,
    thead, tip, title, title_reference, topic, transition, version,
    warning,

    Root, Titular, PreBibliographic, Bibliographic,
    Decorative, Structural, Body, General, Sequential,
    Admonition, Special, Invisible, Part, Inline, Referential, Targetable, Labeled,
    _addNodeClassNames,

    SkipChildren,
    StopTraversal,
    SkipNode,
    SkipDeparture,
    SkipSiblings,
    FixedTextElement,
    NodeFound,
    makeId,
};
