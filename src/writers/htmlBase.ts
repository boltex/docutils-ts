import { compile, TemplateFunction } from 'ejs';
import * as constants from '../constants.js';
import BaseWriter from '../writer.js';
import * as nodes from '../nodes.js';
import * as utils from '../utils.js';
import { basename } from '../utils/paths.js';
import { UnimplementedError } from '../exceptions.js';
import { Settings } from "../settings.js";
import { Document, Attributes, NodeInterface, SettingsSpecType, GenericSettings, CoreLanguage, ElementInterface } from "../types.js";
import { row, tgroup } from "../nodes.js";
import { getLanguage } from "../languages/index.js"
import { logger as baseLogger } from '../logger.js';

const logger = baseLogger.child({ 'class': 'HtmlBase' });

export interface TemplateVars {
    [varName: string]: string | (() => string) | undefined;
}

interface AttributionFormats {
    dash: string[];
    parentheses: string[];
    parens: string[];
    none: string[];
    [name: string]: string[];
}

const __version__ = '';

const defaultTemplate = `<%- headPrefix %>
<%- head %>
<%- stylesheet %>
<%- bodyPrefix %>
<%- bodyPreDocinfo %>
<%- docinfo %>
<%- body %>
<%- bodySuffix %>
`;

const template = compile(defaultTemplate, {});

/**
 *  Raise `nodes.NodeFound` if non-simple list item is encountered.
 *
 *      Here "simple" means a list item containing nothing other than a single
 *  paragraph, a simple list, or a paragraph followed by a simple list.
 *
 *      This version also checks for simple field lists and docinfo.
 */
class SimpleListChecker extends nodes.GenericNodeVisitor {
    public default_visit(node: NodeInterface): void {
        super.default_visit(node);
    }

    public default_departure(node: NodeInterface): void {
        super.default_departure(node);
    }
}
// def default_visit(self, node):
// raise nodes.NodeFound
//
// def visit_list_item(self, node):
// # print "visiting list item", node.__class__
// children = [child for child in node.children
//     if not isinstance(child, nodes.Invisible)]
// # print "has %s visible children" % len(children)
// if (children and isinstance(children[0], nodes.paragraph)
// and (isinstance(children[-1], nodes.bullet_list) or
// isinstance(children[-1], nodes.enumerated_list) or
// isinstance(children[-1], nodes.field_list))):
// children.pop()
// # print "%s children remain" % len(children)
// if len(children) <= 1:
// return
// else:
// # print "found", child.__class__, "in", node.__class__
// raise nodes.NodeFound
//
// def pass_node(self, node):
// pass
//
// def ignore_node(self, node):
// # ignore nodes that are never complex (can contain only inline nodes)
// raise nodes.SkipNode
//
// # Paragraphs and text
// visit_Text = ignore_node
// visit_paragraph = ignore_node
//
// # Lists
// visit_bullet_list = pass_node
// visit_enumerated_list = pass_node
// visit_docinfo = pass_node
//
// # Docinfo nodes:
//     visit_author = ignore_node
// visit_authors = visit_list_item
// visit_address = visit_list_item
// visit_contact = pass_node
// visit_copyright = ignore_node
// visit_date = ignore_node
// visit_organization = ignore_node
// visit_status = ignore_node
// visit_version = visit_list_item
//
// # Definition list:
//     visit_definition_list = pass_node
// visit_definition_list_item = pass_node
// visit_term = ignore_node
// visit_classifier = pass_node
// visit_definition = visit_list_item
//
// # Field list:
//     visit_field_list = pass_node
// visit_field = pass_node
// # the field body corresponds to a list item
// visit_field_body = visit_list_item
// visit_field_name = ignore_node
//
// # Invisible nodes should be ignored.
//     visit_comment = ignore_node
// visit_substitution_definition = ignore_node
// visit_target = ignore_node

/**
 * HTMLTranslator class
 */
class HTMLTranslator extends nodes.NodeVisitor {
    private xmlDeclaration: TemplateFunction = compile('<?xml version="1.0" encoding="<%=encoding%>" ?>\n');
    private doctype: string = '<!DOCTYPE html>\n';
    private doctypeMathML: string = this.doctype;
    private headPrefixTemplate: TemplateFunction = compile('<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="<%=lang%>" lang="<%=lang%>">\n<head>\n');
    private contentType: TemplateFunction = compile('<meta charset="<%=charset%>"/>\n');
    private generator: TemplateFunction = compile('<meta name="generator" content="Docutils <%=version%>: http://docutils.sourceforge.net/" />\n');

    private body: string[];
    private settings: Settings;
    private language: CoreLanguage;
    private meta: string[];
    private headPrefix: string[];
    private htmlProlog: string[];
    private compactSimple?: boolean;
    private context: any[] = [];
    private compactParagraph?: boolean;
    private bodyPreDocinfo: string[];
    private inDocumentTitle: number;
    private htmlTitle: string[];
    private title: string[];
    private sectionLevel: number;
    private initialHeaderLevel: number = -1;
    private topicClasses: string[];
    private colspecs: NodeInterface[];
    private inMailto: boolean;
    private inFootnoteList: boolean;
    private head: string[];
    private docinfo: string[];
    private attributionFormats: AttributionFormats = {
        dash: ['\u2014', ''],
        parentheses: ['(', ')'],
        parens: ['(', ')'],
        none: ['', ''],
    };
    private mathHeader: string[];
    private authorInAuthors: boolean;
    private htmlBody: string[];
    private htmlSubtitle: string[];
    private htmlHead: string[];
    private footer: string[];
    private subtitle: string[];
    private header: string[];
    private inSidebar: boolean;
    private compactFieldList: boolean;
    private inDocinfo: boolean;
    private readonly langAttribute: string = 'lang';
    private mathOutput: string = '';
    private mathOutputOptions: string[] = [];
    private fragment: string[];
    private bodySuffix: string[];
    private bodyPrefix: string[];
    private tableStyle: string = '';
    private attribution: string = '';
    private cloakEmailAddresses: boolean = true;
    private compactLists?: number;
    private compactFieldLists?: number;
    private stylesheet: string[];

    public constructor(document: Document) {
        super(document);
        this.settings = document.settings;
        const settings = this.settings;
        const langCode = settings.languageCode;
        if (langCode !== undefined) {
            this.language = getLanguage(langCode, document.reporter)!;
        } else {
            this.language = getLanguage('en', document.reporter)!;
        }
        this.meta = [this.generator({ version: constants.__version__ })];
        this.headPrefix = [];
        this.htmlProlog = [];

        let myConfig = settings;
        if (myConfig !== undefined) {
            this.cloakEmailAddresses = myConfig.cloakEmailAddresses || true;
            if (myConfig.attribution !== undefined) {
                this.attribution = myConfig.attribution;
            }
            if (myConfig.tableStyle !== undefined) {
                this.tableStyle = myConfig.tableStyle;
            }
        }
        if (myConfig && myConfig.xmlDeclaration) {
            this.headPrefix.push(this.xmlDeclaration({ encoding: settings.outputEncoding }));
        }
        this.head = this.meta.slice();
        this.stylesheet = [];
        /* fixme
           this.stylesheet = utils.getStylesheetList(settings).
           map(this.stylesheetCall.bind(this));
        */
        this.bodyPrefix = ['</head>\n<body>\n'];
        this.bodyPreDocinfo = [];
        this.docinfo = [];
        this.body = [];
        this.fragment = [];
        this.bodySuffix = ['</body>\n</html>\n'];
        this.sectionLevel = 0;
        if (myConfig) {
            if (myConfig.initialHeaderLevel !== undefined) {
                this.initialHeaderLevel = myConfig.initialHeaderLevel!;
            }
            const mathOutput = utils.pySplit(myConfig.mathOutput || '');

            this.mathOutputOptions = mathOutput.slice(1, this.mathOutput.length - 1);
            this.mathOutput = mathOutput[0].toLowerCase();
        }
        this.context = [];
        this.topicClasses = [];
        this.colspecs = [];
        this.compactParagraph = true;
        this.compactSimple = false;
        this.compactFieldList = false;
        this.inDocinfo = false;
        this.inSidebar = false;
        this.inFootnoteList = false;
        this.title = [];
        this.subtitle = [];
        this.header = [];
        this.footer = [];
        this.htmlHead = [/*this.contentType*/];
        this.htmlTitle = [];
        this.htmlSubtitle = [];
        this.htmlBody = [];
        this.inDocumentTitle = 0;
        this.inMailto = false;
        this.authorInAuthors = false;
        this.mathHeader = [];
    }


    public astext(): string {
        return [this.headPrefix, this.head, this.stylesheet, this.bodyPrefix].map((a): string => a.join('')).join('');
    }

    public encode(text: string): string {
        return text; // fixme
    }

    public cloakMailto(href: string): string {
        return href;
    }

    public cloakEmail(encoded: string): string {
        return encoded;
    }
    /**
     * Cleanse, HTML encode, and return attribute value text.
     * @param {String} text - text to cleanse
     * @param {RegExp} whitespace - regexp for matching whitespace.
     */
    public attVal(text: string, whitespace: RegExp = /[\n\r\t\v\f]/g): string {
        if (!text) {
            text = '';
        }
        let encoded = this.encode(text.replace(whitespace, ' '));
        if (this.inMailto && this.cloakEmailAddresses) {
            // Cloak at-signs ("%40") and periods with HTML entities.
            encoded = encoded.replace('%40', '&#37;&#52;&#48;');
            encoded = encoded.replace('.', '&#46;');
        }
        return encoded;
    }

    public stylesheetCall(path: string): string {
        return '';
    }

    /*
     * Construct and return a start tag given a node (id & class attributes
     * are extracted), tag name, and optional attributes.
     */
    public starttag(
        node: NodeInterface,
        tagname: string = '',
        suffix: string = '\n',
        empty: boolean = false,
        attributes: Attributes = {}
    ): string {
        if (typeof suffix !== 'string') {
            throw new Error('suffix should be a string!!');
        }

        const myTagname = tagname.toLowerCase();
        const prefix: string[] = [];
        const atts: Attributes = {};
        const ids: string[] = [];
        Object.entries(attributes).forEach(([name, value]): void => {
            atts[name.toLowerCase()] = value;
        });
        const classes: string[] = [];
        const languages: string[] = [];
        // unify class arguments and move language specification
        const c: string[] = (node.attributes && node.attributes.classes) || [];
        c.splice(c.length - 1, 0, ...utils.pySplit(atts.class || ''));
        c.forEach((cls): void => {
            if (cls.substring(0, 8) === 'language-') {
                languages.splice(0, 0, cls.substring(9));
            } else if (cls.trim() && classes.indexOf(cls) === -1) {
                classes.push(cls);
            }
        });
        if (languages.length) {
            // attribute name is 'lang' in XHTML 1.0 but 'xml:lang' in 1.1
            atts[this.langAttribute] = languages[0];
        }
        if (classes.length) {
            atts.class = classes.join(' ');
        }
        //        assert 'id' not in atts
        ids.push(...(node.attributes.ids || []));
        /*      if 'ids' in atts:
                ids.extend(atts['ids'])
                del atts['ids']
                if ids:
                atts['id'] = ids[0]
                for id in ids[1:]:
                // Add empty "span" elements for additional IDs.  Note
                // that we cannot use empty "a" elements because there
                // may be targets inside of references, but nested "a"
                // elements aren't allowed in XHTML (even if they do
                // not all have a "href" attribute).
                if empty or isinstance(node,
                (nodes.bullet_list, nodes.docinfo,
                nodes.definition_list, nodes.enumerated_list,
                nodes.field_list, nodes.option_list,
                nodes.table)):
                // Insert target right in front of element.
                prefix.push('<span id="%s"></span>' % id)
                else:
                // Non-empty tag.  Place the auxiliary <span> tag
                // *inside* the element, as the first child.
                suffix += '<span id="%s"></span>' % id

        */
        const attlist = { ...atts };
        // attlist.sort()
        const parts = [myTagname];
        Object.keys(attlist).forEach((name: string): void => {
            const value: any | any[] | undefined | null = attlist[name];
            // value=None was used for boolean attributes without
            // value, but this isn't supported by XHTML.
            //            assert value is not None
            if (Array.isArray(value)) {
                parts.push(`${name.toLowerCase()}="${this.attVal(value.join(' '))}"`);
            } else {
                parts.push(`${name.toLowerCase()}="${this.attVal(value.toString())}"`);
            }
        });
        const infix = empty ? ' /' : '';
        // return ''.join(prefix) + '<%s%s>' % (' '.join(parts), infix) + suffix
        const result = `${prefix.join('')}<${parts.join(' ')}${infix}>${suffix}`;
        const badStr = '[object Object]';
        if (result.indexOf(badStr) !== -1) {
            let invalidVar = '';
            if (prefix.join('').indexOf('[object Object]') !== -1) {
                invalidVar = 'prefix';
            } else if (parts.join(' ').indexOf(badStr) !== -1) {
                // implement fixme
            } else if (infix.indexOf(badStr) !== -1) {
                // implement fixme
            } else if (suffix.indexOf(badStr) !== -1) {
                invalidVar = 'suffix';
            }
            throw new Error(`invalid object in ${invalidVar} thing ${prefix} ${parts} ${infix}`);
        }
        return result;
    }

    /**
     * Construct and return an XML-compatible empty tag.
     */
    public emptytag(node: NodeInterface, tagname: string, suffix = '\n', attributes: Attributes = {}): string {
        return this.starttag(node, tagname, suffix, true, attributes);
    }

    public setClassOnChild(node: NodeInterface, class_: string, index: number = 0): void {
    }

    public visit_Text(node: NodeInterface): void {
        const text = node.astext();
        let encoded = this.encode(text);
        if (this.inMailto && this.cloakEmailAddresses) {
            encoded = this.cloakEmail(encoded);
        }
        this.body.push(encoded);
    }

    public depart_Text(node: NodeInterface): void {

    }

    public visit_section(node: NodeInterface): void {
        this.sectionLevel += 1;
        this.body.push(
            this.starttag(node, 'div', '\n', false, { CLASS: 'section' }),
        );
    }

    public depart_section(node: NodeInterface): void {
        this.sectionLevel -= 1;
        this.body.push('</div>\n');
    }

    public visit_abbreviation(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'abbr', ''));
    }

    public depart_abbreviation(node: NodeInterface): void {
        this.body.push('</abbr>');
    }

    public visit_acronym(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'acronym', ''));
    }

    public depart_acronym(node: NodeInterface): void {
        this.body.push('</acronym>');
    }

    public visit_address(node: NodeInterface): void {
        this.visit_docinfo_item(node, 'address', false);
        this.body.push(this.starttag(node, 'pre', '', false, { CLASS: 'address' }));
    }

    public depart_address(node: NodeInterface): void {
        this.body.push('\n</pre>\n');
        this.depart_docinfo_item();
    }

    public visit_admonition(node: NodeInterface): void {
        node.attributes.classes.splice(0, 0, 'admonition');
        this.body.push(this.starttag(node, 'div'));
    }

    public depart_admonition(node: NodeInterface): void {
        this.body.push('</div>\n');
    }

    public visit_attribution(node: NodeInterface): void {
        const [prefix, suffix] = this.attributionFormats![this.attribution];
        this.context.push(suffix);
        this.body.push(
            this.starttag(node, 'p', prefix, false, { CLASS: 'attribution' }),
        );
    }

    public depart_attribution(node: NodeInterface): void {
        this.body.push(`${this.context.pop()}</p>\n`);
    }

    public visit_author(node: NodeInterface): void {
        if (!(node.parent instanceof nodes.authors)) {
            this.visit_docinfo_item(node, 'author');
        }
        this.body.push('<p>');
    }

    public depart_author(node: NodeInterface): void {
        this.body.push('</p>');
        if (!(node.parent instanceof nodes.authors)) {
            this.body.push('\n');
        } else {
            this.depart_docinfo_item();
        }
    }

    public visit_authors(node: NodeInterface): void {
        this.visit_docinfo_item(node, 'authors');
    }

    public depart_authors(node: NodeInterface): void {
        this.depart_docinfo_item();
    }

    public visit_block_quote(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'blockquote'));
    }

    public depart_block_quote(node: NodeInterface): void {
        this.body.push('</blockquote>\n');
    }

    /*
     * Check for a simple list that can be rendered compactly.
     */
    /*
      checkSimpleList(node: NodeInterface): void {
      const visitor = new SimpleListChecker(this.document);
      try {
      node.walk(visitor);
      } catch (error) {
      if (error instanceof nodes.NodeFound) {
      return false;
      }
      throw error;
      }
      return true;

      // Compact lists
      // ------------
      // Include definition lists and field lists (in addition to ordered
      // and unordered lists) in the test if a list is "simple"  (cf. the
      }
      // html4css1.HTMLTranslator docstring and the SimpleListChecker class at
      // the end of this file).
      */

    public isCompactable(node: NodeInterface): boolean {
        // print "isCompactable %s ?" % node.__class__,
        // explicite class arguments have precedence
        if ('compact' in node.attributes.classes) {
            return true;
        }
        if ('open' in node.attributes.classes) {
            return false;
        }
        // check config setting:
        if ((node instanceof nodes.field_list
            || node instanceof nodes.definition_list)
            && !this.compactFieldLists) {
            // print "`compact-field-lists` is false"
            return false;
        }
        if ((node instanceof nodes.enumerated_list
            || node instanceof nodes.bullet_list)
            && !this.compactLists) {
            // print "`compact-lists` is false"
            return false;
        }
        // more special cases:
        if ((this.topicClasses.length === 1
            && this.topicClasses[0] === 'contents')) { // TODO: this.in_contents
            return true;
        }
        // check the list items:
        return this.checkSimpleList(node);
    }

    public visit_caption(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'p', '', false, { CLASS: 'caption' }));
    }

    public depart_caption(node: NodeInterface): void {
        this.body.push('</p>\n');
    }

    // citations
    // ---------
    // Use definition list instead of table for bibliographic references.
    // Join adjacent citation entries.

    public visit_citation(node: NodeInterface): void {
        if (!this.inFootnoteList) {
            this.body.push('<dl class="citation">\n');
        }
        this.inFootnoteList = true;
    }

    public depart_citation(node: NodeInterface): void {
        this.body.push('</dd>\n');
        if (!(node.nextNode({ descend: false, siblings: true }) instanceof nodes.citation)) {
            this.body.push('</dl>\n');
            this.inFootnoteList = false;
        }
    }

    public visit_citation_reference(node: NodeInterface): void {
        let href = '#';
        if ('refid' in node.attributes) {
            href += node.attributes.refid;
        } else if ('refame' in node.attributes) {
            href += this.document.nameIds[node.attributes.refname];
        }
        // else: // TODO system message (or already in the transform)?
        // 'Citation reference missing.'
        this.body.push(this.starttag(
            node, 'a', '[', false, { CLASS: 'citation-reference', href },
        ));
    }


    public depart_citation_reference(node: NodeInterface): void {
        this.body.push(']</a>');

        // classifier
        // ----------
        // don't insert classifier-delimiter here (done by CSS)
    }

    public visit_classifier(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'span', '', false, { CLASS: 'classifier' }));
    }

    public depart_classifier(node: NodeInterface): void {
        this.body.push('</span>');
    }

    public visit_colspec(node: NodeInterface): void {
        this.colspecs.push(node);
        // "stubs" list is an attribute of the tgroup element:
        //node.parent!.stubs.push(node.attributes.stub); fixme
    }

    public depart_colspec(node: NodeInterface): void {
        // write out <colgroup> when all colspecs are processed
        if (node.nextNode({ descend: false, siblings: true }) instanceof nodes.colspec) {
            return;
        }

        if (
            'colwidths-auto' in node.parent!.parent!.attributes.classes ||
            (
                this.settings.tableStyle &&
                this.settings.tableStyle.includes('colwidths-auto') &&
                (
                    !('colwidths-given' in node.parent!.parent!.attributes.classes)
                )
            )
        ) {
            return;
        }
        const totalWidth = this.colspecs.map((subNode): number => parseInt(subNode.attributes.colwidth, 10))
            .reduce((a, c): number => a + c);
        this.body.push(this.starttag(node, 'colgroup'));
        this.colspecs.forEach((subNode): void => {
            const colWidth = parseInt(subNode.attributes.colwidth, 10) * 100.0 / totalWidth + 0.5;
            this.body.push(this.emptytag(subNode, 'col', '', { style: `width: ${colWidth}` }));
        });
        this.body.push('</colgroup>\n');
    }

    public visit_comment(node: NodeInterface, sub: RegExp = /-(?=-)/g): void {
        // Escape double-dashes in comment text.
        this.body.push(`<!-- ${node.astext().replace(sub, '- ')} -->\n`);
        // Content already processed:
        throw new nodes.SkipNode();
    }

    public visit_compound(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'div', '\n', false, { CLASS: 'compound' }));
        if (node.getNumChildren() > 1) {
            node.getChild(0).attributes.classes.push('compound-first');
            node.getChild(node.getNumChildren() - 1).attributes.classes.push('compound-last');
            for (let i = 1; i < node.getNumChildren() - 1; i++) {
                node.getChild(i).attributes.classes.push('compound-middle');
            }
        }
    }

    public depart_compound(node: NodeInterface): void {
        this.body.push('</div>\n');
    }

    public visit_container(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'div', '\n', false, { CLASS: 'docutils container' }));
    }

    public depart_container(node: NodeInterface): void {
        this.body.push('</div>\n');
    }

    public visit_contact(node: NodeInterface): void {
        this.visit_docinfo_item(node, 'contact', false);
    }

    public depart_contact(node: NodeInterface): void {
        this.depart_docinfo_item();
    }

    public visit_copyright(node: NodeInterface): void {
        this.visit_docinfo_item(node, 'copyright');
    }

    public depart_copyright(node: NodeInterface): void {
        this.depart_docinfo_item();
    }

    public visit_date(node: NodeInterface): void {
        this.visit_docinfo_item(node, 'date');
    }

    public depart_date(node: NodeInterface): void {
        this.depart_docinfo_item();
    }

    public visit_decoration(node: NodeInterface): void {
    }

    public depart_decoration(node: NodeInterface): void {
    }

    public visit_definition(node: NodeInterface): void {
        this.body.push('</dt>\n');
        this.body.push(this.starttag(node, 'dd', ''));
    }

    public depart_definition(node: NodeInterface): void {
        this.body.push('</dd>\n');
    }

    public visit_definition_list(node: NodeInterface): void {
        if (node.attributes.classes == null) {
            node.attributes.classes = [];
        }
        const classes = node.attributes.classes;
        if (this.isCompactable(node)) {
            classes.push('simple');
        }
        this.body.push(this.starttag(node, 'dl'));
    }

    public depart_definition_list(node: NodeInterface): void {
        this.body.push('</dl>\n');
    }

    public visit_definition_list_item(node: NodeInterface): void {
        // pass class arguments, ids and names to definition term:
        node.getChild(0).attributes.classes.splice(0, 0, ...(node.attributes.classes || []));
        node.getChild(0).attributes.ids.splice(0, 0, ...(node.attributes.ids || []));
        node.getChild(0).attributes.names.splice(0, 0, ...(node.attributes.names || []));
    }

    public depart_definition_list_item(node: NodeInterface): void {
    }

    public visit_description(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'dd', ''));
    }

    public depart_description(node: NodeInterface): void {
        this.body.push('</dd>\n');
    }

    public visit_docinfo(node: NodeInterface): void {
        this.context.push(this.body.length.toString());
        let classes = 'docinfo';
        if (this.isCompactable(node)) {
            classes += ' simple';
        }
        this.body.push(this.starttag(node, 'dl', '\n', false, { CLASS: classes }));
    }

    public depart_docinfo(node: NodeInterface): void {
        this.body.push('</dl>\n');
        const start = this.context.pop()!;
        this.docinfo = this.body.slice(parseInt(start, 10));
        this.body = [];
    }

    public visit_docinfo_item(node: NodeInterface, name: string, meta: boolean = true): void {
        if (meta) {
            const metaTag = `<meta name="${name}" content="${this.attVal(node.astext())}" />\n`;
            this.addMeta(metaTag);
        }

        this.body.push(`<dt class="${name}">${this.language.labels[name]}</dt>\n`);
        this.body.push(this.starttag(node, 'dd', '', false, { CLASS: name }));
    }

    public depart_docinfo_item(): void {
        this.body.push('</dd>\n');
    }

    public visit_doctest_block(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'pre', '', false,
            { CLASS: 'code javascript doctest' }));
    }

    public depart_doctest_block(node: NodeInterface): void {
        this.body.push('\n</pre>\n');
    }

    public visit_document(node: NodeInterface): void {
        const title = ((node.attributes.title || '') || basename(node.attributes.source) || 'docutils document without title');
        this.head.push(`<title>${this.encode(title)}</title>\n`);
    }

    public depart_document(node: NodeInterface): void {
        this.headPrefix.push(this.doctype, this.headPrefixTemplate({ lang: this.settings!.languageCode }));
        this.meta.splice(0, 0, this.contentType({ charset: this.settings!.outputEncoding }));
        this.head.splice(0, 0, this.contentType({ charset: this.settings!.outputEncoding }));
        this.htmlHead.splice(this.htmlHead.length, 0, ...this.head.slice(1));
        this.bodyPrefix.push(this.starttag(node, 'div', '\n', false, { CLASS: 'document' }));
        this.fragment.push(...this.body);
        this.htmlBody.push(...this.bodyPrefix.slice(1), ...this.bodyPreDocinfo, ...this.docinfo, ...this.body, ...this.bodySuffix.slice(0, this.bodySuffix.length - 1));
    }

    /*
        # original python
        def depart_document(self, node) -> None:
            self.head_prefix.extend([self.doctype,
                                    self.head_prefix_template %
                                    {'lang': self.settings.language_code}])
            self.html_prolog.append(self.doctype)
            self.head = self.meta[:] + self.head
            if 'name="dcterms.' in ''.join(self.meta):
                self.head.append('<link rel="schema.dcterms"'
                                ' href="http://purl.org/dc/terms/"/>')
            if self.math_header:
                if self.math_output == 'mathjax':
                    self.head.extend(self.math_header)
                else:
                    self.stylesheet.extend(self.math_header)
            if (self.settings.output_encoding  # may be None
                and self.settings.output_encoding.lower() != 'unicode'):
                # skip content-type meta tag with interpolated charset value:
                self.html_head.extend(self.head[1:])
            else:
                self.html_head.extend(self.head)
            self.body_prefix.append(self.starttag(node, **self.documenttag_args))
            self.body_suffix.insert(0, f'</{self.documenttag_args["tagname"]}>\n')
            self.fragment.extend(self.body)  # self.fragment is the "naked" body
            self.html_body.extend(self.body_prefix[1:] + self.body_pre_docinfo
                                + self.docinfo + self.body
                                + self.body_suffix[:-1])
            assert not self.context, f'len(context) = {len(self.context)}'

      // javascript Experimental
      this.headPrefix.push(this.doctype, this.headPrefixTemplate({ lang: this.settings!.languageCode }));
      this.html_prolog.push(this.doctype)
      this.meta.splice(0, 0, this.content_type % this.settings.output_encoding)
      this.head.splice(0, 0, this.content_type % this.settings.output_encoding)
      if 'name="dcterms.' in ''.join(this.meta):
      this.head.push(
      '<link rel="schema.dcterms" href="http://purl.org/dc/terms/">')
      if this.math_header:
      if this.math_output == 'mathjax':
      this.head.extend(this.math_header)
      else:
      this.stylesheet.extend(this.math_header)
      // skip content-type meta tag with interpolated charset value:
      this.htmlHead.extend(this.head[1:])
      this.bodyPrefix.push(this.starttag(node, 'div', { CLASS: 'document' }))
      this.bodySuffix.insert(0, '</div>\n')
      this.fragment.extend(this.body) // this.fragment is the "naked" body
      this.htmlBody.extend(this.bodyPrefix[1:] + this.body_pre_docinfo
      + this.docinfo + this.body
      + this.body_suffix[:-1])
      //        assert not this.context, 'len(context) = %s' % len(this.context)
      }
    */

    public visit_emphasis(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'em', ''));
    }

    public depart_emphasis(node: NodeInterface): void {
        this.body.push('</em>');
    }

    public visit_entry(node: nodes.entry): void {
        const atts: Attributes = { class: [] };
        if (node.parent!.parent instanceof nodes.thead) {
            atts.class.push('head');
        }
        const ggParent = node.parent!.parent!.parent!;
        //        let stubs: any[] = ggParent.getCustomAttr('stubs');

        /*        if(stubs[node.parent!.getCustomAttr('column')]) {
            // "stubs" list is an attribute of the tgroup element
            atts.class.push('stub');
        }*/
        let tagname;
        if (atts.class.length) {
            tagname = 'th';
            atts.class = (atts.class.join(' '));
        } else {
            tagname = 'td';
            delete atts.class;
        }

        (node.parent! as nodes.row).column! += 1;
        if ('morerows' in node.attributes) {
            atts.rowspan = node.attributes.morerows + 1;
        }
        if ('morecols' in node.attributes) {
            atts.colspan = node.attributes.morecols + 1;
            (node.parent! as row).column += node.attributes.morecols;
        }
        this.body.push(this.starttag(node, tagname, '', false, atts));
        this.context.push(`</${tagname.toLowerCase()}>\n`);
        // TODO: why does the html4css1 writer insert an NBSP into empty cells?
        // if len(node: NodeInterface) == 0:              // empty cell
        //     this.body.push('&//0160;') // no-break space
    }

    public depart_entry(node: NodeInterface): void {
        this.body.push(this.context.pop()!);
    }

    public visit_enumerated_list(node: NodeInterface): void {
        const atts: Attributes = { class: [] };
        if ('start' in node.attributes) {
            atts.start = node.attributes.start;
        }
        if ('enumtype' in node.attributes) {
            atts.class.push(node.attributes.enumtype);
        }
        if (this.isCompactable(node)) {
            atts.class.push('simple');
        }
        atts.class = atts.class.join(' ');
        this.body.push(this.starttag(node, 'ol', '\n', false, atts));
    }

    public depart_enumerated_list(node: NodeInterface): void {
        this.body.push('</ol>\n');
    }

    public visit_field_list(node: NodeInterface): void {
        // Keep simple paragraphs in the field_body to enable CSS
        // rule to start body on new line if the label is too long
        let classes = 'field-list';
        if (this.isCompactable(node)) {
            classes += ' simple';
        }
        this.body.push(this.starttag(node, 'dl', '\n', false, { CLASS: classes }));
    }

    public depart_field_list(node: NodeInterface): void {
        this.body.push('</dl>\n');
    }

    public visit_field(node: NodeInterface): void {
    }

    public depart_field(node: NodeInterface): void {
    }

    // as field is ignored, pass class arguments to field-name and field-body:

    public visit_field_name(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'dt', '', false,
            { CLASS: node.parent!.attributes.classes.join(' ') }));
    }

    public depart_field_name(node: NodeInterface): void {
        this.body.push('</dt>\n');
    }

    public visit_field_body(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'dd', '', false,
            { CLASS: node.parent!.attributes.classes.join(' ') }));

        // prevent misalignment of following content if the field is empty:
        if (!node.hasChildren()) {
            this.body.push('<p></p>');
        }
    }

    public depart_field_body(node: NodeInterface): void {
        this.body.push('</dd>\n');
    }

    public visit_figure(node: NodeInterface): void {
        const atts: Attributes = { class: 'figure' };
        if (node.attributes.width) {
            atts.style = `width: ${node.attributes.width}`;
        }
        if (node.attributes.align) {
            atts.class += ` align-${node.attributes.align}`;
        }
        this.body.push(this.starttag(node, 'div', '', false, atts));
    }

    public depart_figure(node: NodeInterface): void {
        this.body.push('</div>\n');
    }

    /*
        # original python
        def visit_figure(self, node) -> None:
            atts = {'class': 'figure'}
            if node.get('width'):
                atts['style'] = 'width: %s' % node['width']
            if node.get('align'):
                atts['class'] += " align-" + node['align']
            self.body.append(self.starttag(node, 'div', **atts))

        def depart_figure(self, node) -> None:
            self.body.append('</div>\n')

      // javascript experimental
      visit_figure(node: NodeInterface): void {
        atts = {'class': 'figure'}
        if node.get('width'):
            atts['style'] = 'width: %s' % node.attributes['width']
        if node.get('align'):
            atts['class'] += " align-" + node.attributes['align']
        this.body.push(this.starttag(node, 'div', **atts))
      }

      depart_figure(node: NodeInterface): void {
        this.body.push('</div>\n')
      }

      // use HTML 5 <footer> element?
      visit_footer(node: NodeInterface): void {
        this.context.push(len(this.body))
      }

      depart_footer(node: NodeInterface): void {
        start = this.context.pop()
        footer = [this.starttag(node, 'div', { CLASS: 'footer' }),
        '<hr class="footer" />\n']
        footer.extend(this.body[start:])
        footer.push('\n</div>\n')
        this.footer.extend(footer)
        this.body_suffix[:0] = footer
        del this.body[start:]

      // footnotes
      // ---------
      // use definition list instead of table for footnote text

      // TODO: use the new HTML5 element <aside>? (Also for footnote text)
      }
    */

    public visit_footer(node: NodeInterface): void {
        this.context.push(this.body.length.toString());
    }

    public depart_footer(node: NodeInterface): void {
        const start = this.context.pop()!;

        const footer = [
            this.starttag(node, 'div', undefined, undefined, { CLASS: 'footer' }),
            '<hr class="footer" />\n',
        ];

        footer.push(...this.body.slice(parseInt(start, 10)));
        footer.push('\n</div>\n');
        this.footer.push(...footer);
        this.bodySuffix.splice(0, 0, ...footer);
        this.body.splice(parseInt(start, 10), this.body.length - parseInt(start, 10));
    }


    public visit_footnote(node: NodeInterface): void {
        if (!this.inFootnoteList) {
            const classes = `footnote ${this.settings.footnoteReferences}`;
            this.body.push(`<dl class="${classes}">\n`);
            this.inFootnoteList = true;
        }
    }

    public depart_footnote(node: NodeInterface): void {
        this.body.push('</dd>\n');
        if (!(node.nextNode({ descend: false, siblings: true }) instanceof nodes.footnote)) {
            this.body.push('</dl>\n');
            this.inFootnoteList = false;
        }
    }

    /* whoops this requires references transform!! */
    public visit_footnote_reference(node: NodeInterface): void {
        if (!node.attributes.refid) {
            console.warn('warning, no refid ( implement transforms )');
        }
        const href = `#${node.attributes.refid || ''}`;
        const classes = `footnote-reference ${this.settings.footnoteReferences}`;
        this.body.push(this.starttag(node, 'a', '', // suffix,
            false,
            { CLASS: classes, href }));
    }

    public depart_footnote_reference(node: NodeInterface): void {
        this.body.push('</a>');
    }

    // Docutils-generated text: put section numbers in a span for CSS styling:
    public visit_generated(node: NodeInterface): void {
        /* generating error */
    }

    public depart_generated(node: NodeInterface): void {
    }

    public visit_header(node: NodeInterface): void {
        this.context.push(this.body.length.toString());
    }

    public depart_header(node: NodeInterface): void {
        const start = this.context.pop()!;
        const header = [
            this.starttag(node, 'div', undefined, undefined, { CLASS: 'header' }),
        ];
        header.push(...this.body.slice(parseInt(start, 10)));
        header.push('\n<hr class="header"/>\n</div>\n');
        this.bodyPrefix.push(...header);
        this.header.push(...header);
        this.body.splice(parseInt(start, 10), this.body.length - parseInt(start, 10));
    }

    /*
        TODO : IMAGE HANDLING
          // Image types to place in an <object> element
          object_image_types = {'.swf': 'application/x-shockwave-flash'}

          visit_image(node: NodeInterface): void {
          atts = {}
          uri = node.attributes['uri']
          ext = os.path.splitext(uri)[1].lower()
          if ext in this.object_image_types:
          atts['data'] = uri
          atts['type'] = this.object_image_types[ext]
          else:
          atts['src'] = uri
          atts['alt'] = node.get('alt', uri)
          // image size
          if 'width' in node:
          atts['width'] = node.attributes['width']
          if 'height' in node:
          atts['height'] = node.attributes['height']
          if 'scale' in node:
          if (PIL and not ('width' in node and 'height' in node)
          and this.settings.file_insertion_enabled):
          imagepath = urllib.url2pathname(uri)
          try:
          img = PIL.Image.open(
          imagepath.encode(sys.getfilesystemencoding()))
          except (IOError, UnicodeEncodeError):
          pass // TODO: warn?
          else:
          this.settings.record_dependencies.add(
          imagepath.replace('\\', '/'))
          if 'width' not in atts:
          atts['width'] = '%dpx' % img.size[0]
          if 'height' not in atts:
          atts['height'] = '%dpx' % img.size[1]
          del img
          for att_name in 'width', 'height':
          if att_name in atts:
          match = re.match(r'([0-9.]+)(\S*)$', atts[att_name])
          assert match
          atts[att_name] = '%s%s' % (
          float(match.group(1)) * (float(node.attributes['scale']) / 100),
          match.group(2))
          style = []
          for att_name in 'width', 'height':
          if att_name in atts:
          if re.match(r'^[0-9.]+$', atts[att_name]):
          // Interpret unitless values as pixels.
          atts[att_name] += 'px'
          style.push('%s: %s;' % (att_name, atts[att_name]))
          del atts[att_name]
          if style:
          atts['style'] = ' '.join(style)
          if (isinstance(node.parent, nodes.TextElement) or
          (isinstance(node.parent, nodes.reference) and
          not isinstance(node.parent.parent, nodes.TextElement))):
          // Inline context or surrounded by <a>...</a>.
          suffix = ''
          else:
          suffix = '\n'
          if 'align' in node:
          atts['class'] = 'align-%s' % node.attributes['align']
          if ext in this.object_image_types:
          // do NOT use an empty tag: incorrect rendering in browsers
          this.body.push(this.starttag(node, 'object', suffix, **atts) +
          node.get('alt', uri) + '</object>' + suffix)
          else:
          this.body.push(this.emptytag(node, 'img', suffix, **atts))
          }

          depart_image(node: NodeInterface): void {
          // this.body.push(this.context.pop())
          }
          pass
    */

    public visit_inline(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'span', '', false));
    }

    public depart_inline(node: NodeInterface): void {
        this.body.push('</span>');
    }

    // footnote and citation labels:
    public visit_label(node: NodeInterface): void {
        let classes;
        if (node.parent instanceof nodes.footnote) {
            classes = this.settings.footnoteReferences;
        } else {
            classes = 'brackets';
        }
        // pass parent node to get id into starttag:
        this.body.push(this.starttag(node.parent!, 'dt', '', false, { CLASS: 'label' }));
        this.body.push(this.starttag(node, 'span', '', false, { CLASS: classes }));
        // footnote/citation backrefs:
        if (this.settings.footnoteBacklinks) {
            const backrefs = node.parent!.attributes.backrefs;
            if (backrefs.length === 1) {
                this.body.push(`<a class="fn-backref" href="//${backrefs[0]}">`);
            }
        }
    }

    public depart_label(node: NodeInterface): void {
        let backrefs = [];
        if (this.settings.footnoteBacklinks) {
            backrefs = node.parent!.attributes.backrefs;
            if (backrefs.length === 1) {
                this.body.push('</a>');
            }
        }
        this.body.push('</span>');
        if (this.settings.footnoteBacklinks && backrefs.length > 1) {
            const backlinks = backrefs.map((ref: string, i: number): string => `<a href="//${ref}">${i + 1}</a>`);
            this.body.push(`<span class="fn-backref">(${backlinks.join(',')})</span>`);
        }
        this.body.push('</dt>\n<dd>');
    }

    public visit_legend(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'div', '', false, { CLASS: 'legend' }));
    }

    public depart_legend(node: NodeInterface): void {
        this.body.push('</div>\n');
    }

    public visit_line(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'div', '', false, { CLASS: 'line' }));
        if (!node.hasChildren()) {
            this.body.push('<br />');
        }
    }

    public depart_line(node: NodeInterface): void {
        this.body.push('</div>\n');
    }

    public visit_line_block(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'div', '', false, { CLASS: 'line-block' }));
    }

    public depart_line_block(node: NodeInterface): void {
        this.body.push('</div>\n');
    }

    // inline literal
    public visit_literal(node: NodeInterface): void {
        // special case: "code" role
        const classes = node.attributes.classes || [];
        if (classes.indexOf('code') !== -1) {
            // filter 'code' from class arguments
            // fixme //node.attributes['classes'] = [cls for cls in classes if cls != 'code']
            this.body.push(this.starttag(node, 'span', '', false, { CLASS: 'docutils literal' }));
            return;
        }
        let text = node.astext();
        // remove hard line breaks (except if in a parsed-literal block)
        if (!(node.parent instanceof nodes.literal_block)) {
            text = text.replace('\n', ' ');
        }
        // Protect text like ``--an-option`` and the regular expression
        // ``[+]?(\d+(\.\d*)?|\.\d+)`` from bad line wrapping
        /* fixme
           this.wordsAndSpaces.findall(text).forEach((token): void => {
           if (token.trim() && this.inWordWrapPoint.search(token)) {
           this.body.push(`<span class="pre">${this.encode(token)}</span>`);
           } else {
           this.body.push(this.encode(token));
           }
           });
        */
        this.body.push('</span>');
        // Content already processed:
        throw new nodes.SkipNode();
    }

    public depart_literal(node: NodeInterface): void {
        // skipped unless literal element is from "code" role:
        this.body.push('</code>');
    }

    public visit_literal_block(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'pre', '', false, { CLASS: 'literal-block' }));
        if ((node.attributes.classes || []).indexOf('code') !== -1) {
            this.body.push('<code>');
        }
    }

    public depart_literal_block(node: NodeInterface): void {
        if ((node.attributes.classes || []).indexOf('code') !== -1) {
            this.body.push('</code>');
        }
        this.body.push('</pre>\n');

        // Mathematics:
        // As there is no native HTML math support, we provide alternatives
        // for the math-output: LaTeX and MathJax simply wrap the content,
        // HTML and MathML also convert the math_code.
        // HTML container
        const mathTags = {// math_output: (block, inline, class-arguments)
            mathml: ['div', '', ''],
            html: ['div', 'span', 'formula'],
            mathjax: ['div', 'span', 'math'],
            latex: ['pre', 'tt', 'math'],
        };
    }

    /*
      visit_math(node, math_env='') {
      // If the method is called from visit_math_block(), math_env != ''.

      if this.math_output not in this.math_tags:
      this.document.reporter.error(
      'math-output format "%s" not supported '
      'falling back to "latex"'% this.math_output)
      this.math_output = 'latex'
      tag = this.math_tags[this.math_output][math_env == '']
      clsarg = this.math_tags[this.math_output][2]
      // LaTeX container
      wrappers = {// math_mode: (inline, block)
      'mathml':  ('$%s$',   u'\\begin{%s}\n%s\n\\end{%s}'),
      'html':    ('$%s$',   u'\\begin{%s}\n%s\n\\end{%s}'),
      'mathjax': (r'\(%s\)', u'\\begin{%s}\n%s\n\\end{%s}'),
      'latex':   (None,     None),
      }
      wrapper = wrappers[this.math_output][math_env != '']
      if this.math_output == 'mathml' and (not this.math_output_options or
      this.math_output_options[0] == 'blahtexml'):
      wrapper = None
      // get and wrap content
      math_code = node.astext().translate(unichar2tex.uni2tex_table)
      if wrapper:
      try: // wrapper with three "%s"
      math_code = wrapper % (math_env, math_code, math_env)
      except TypeError: // wrapper with one "%s"
      math_code = wrapper % math_code
      // settings and conversion
      if this.math_output in ('latex', 'mathjax'):
      math_code = this.encode(math_code)
      if this.math_output == 'mathjax' and not this.math_header:
      try:
      this.mathjax_url = this.math_output_options[0]
      except IndexError:
      this.document.reporter.warning('No MathJax URL specified, '
      'using local fallback (see config.html)')
      // append configuration, if not already present in the URL:
      // input LaTeX with AMS, output common HTML
      if '?' not in this.mathjax_url:
      this.mathjax_url += '?config=TeX-AMS_CHTML'
      this.math_header = [this.mathjax_script % this.mathjax_url]
      elif this.math_output == 'html':
      if this.math_output_options and not this.math_header:
      this.math_header = [this.stylesheet_call(
      utils.find_file_in_dirs(s, this.settings.stylesheet_dirs))
      for s in this.math_output_options[0].split(',')]
      // TODO: fix display mode in matrices and fractions
      math2html.DocumentParameters.displaymode = (math_env != '')
      math_code = math2html.math2html(math_code)
      elif this.math_output == 'mathml':
      if  'XHTML 1' in this.doctype:
      this.doctype = this.doctype_mathml
      this.content_type = this.content_type_mathml
      converter = ' '.join(this.math_output_options).lower()
      try:
      if converter == 'latexml':
      math_code = tex2mathml_extern.latexml(math_code,
      this.document.reporter)
      elif converter == 'ttm':
      math_code = tex2mathml_extern.ttm(math_code,
      this.document.reporter)
      elif converter == 'blahtexml':
      math_code = tex2mathml_extern.blahtexml(math_code,
      inline=not(math_env),
      reporter=this.document.reporter)
      elif not converter:
      math_code = latex2mathml.tex2mathml(math_code,
      inline=not(math_env))
      else:
      this.document.reporter.error('option "%s" not supported '
      'with math-output "MathML"')
      except OSError:
      raise OSError('is "latexmlmath" in your PATH?')
      except SyntaxError, err:
      err_node = this.document.reporter.error(err, base_node=node)
      this.visit_system_message(err_node)
      this.body.push(this.starttag(node, 'p'))
      this.body.push(u','.join(err.args))
      this.body.push('</p>\n')
      this.body.push(this.starttag(node, 'pre',
      { CLASS: 'literal-block' }))
      this.body.push(this.encode(math_code))
      this.body.push('\n</pre>\n')
      this.depart_system_message(err_node)
      raise nodes.SkipNode
      // append to document body
      if tag:
      this.body.push(this.starttag(node, tag,
      suffix='\n'*bool(math_env),
      CLASS=clsarg))
      this.body.push(math_code)
      if math_env: // block mode (equation, display)
      this.body.push('\n')
      if tag:
      this.body.push('</%s>' % tag)
      if math_env:
      this.body.push('\n')
      }
      // Content already processed:
      raise nodes.SkipNode

      depart_math(node: NodeInterface): void {
      }
      pass // never reached

      visit_math_block(node: NodeInterface): void {
      // print node.astext().encode('utf8')
      math_env = pick_math_environment(node.astext())
      this.visit_math(node, math_env=math_env)
      }

      depart_math_block(node: NodeInterface): void {
      }
      pass // never reached
    */

    public visit_meta(node: ElementInterface): void {
        // Add meta tag to the head section
        this.meta.push(this.emptytag(node, 'meta', undefined, node.nonDefaultAttributes()));
    }

    public depart_meta(node: ElementInterface): void {
        // No action needed for departing meta tags
    }

    public visit_option(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'span', '', false, { CLASS: 'option' }));
    }

    public depart_option(node: NodeInterface): void {
        this.body.push('</span>');
        if (node.nextNode({ descend: false, siblings: true }) instanceof nodes.option) {
            this.body.push(', ');
        }
    }

    public visit_option_argument(node: NodeInterface): void {
        this.body.push(node.attributes.delimiter || ' ');
        this.body.push(this.starttag(node, 'var', '', false));
    }

    public depart_option_argument(node: NodeInterface): void {
        this.body.push('</var>');
    }

    public visit_option_group(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'dt', '', false));
        this.body.push('<kbd>');
    }

    public depart_option_group(node: NodeInterface): void {
        this.body.push('</kbd></dt>\n');
    }

    public visit_option_list(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'dl', '', false, { CLASS: 'option-list' }));
    }

    public depart_option_list(node: NodeInterface): void {
        this.body.push('</dl>\n');
    }

    public visit_option_list_item(node: NodeInterface): void {
        // No specific action needed for option list items
    }

    public depart_option_list_item(node: NodeInterface): void {
        // No specific action needed for departing option list items
    }

    public visit_option_string(node: NodeInterface): void {
        // No specific action needed for option strings
    }

    public depart_option_string(node: NodeInterface): void {
        // No specific action needed for departing option strings
    }

    public visit_organization(node: NodeInterface): void {
        this.visit_docinfo_item(node, 'organization', false);
    }

    public depart_organization(node: NodeInterface): void {
        this.depart_docinfo_item();
    }

    public visit_problematic(node: NodeInterface): void {
        if (typeof node.attributes.refid !== 'undefined') {
            this.body.push(`<a href="//${node.attributes.refid}">`);
            this.context.push('</a>');
        } else {
            this.context.push('');
            this.body.push(this.starttag(node, 'span', '', false, { CLASS: 'problematic' }));
        }
    }

    public depart_problematic(node: NodeInterface): void {
        this.body.push('</span>');
        this.body.push(this.context.pop()!);
    }

    public visit_raw(node: NodeInterface): void {
        if (node.attributes.format && node.attributes.format.split(' ').indexOf('html') !== -1) {
            let tagname = 'div';
            if (node.parent instanceof nodes.TextElement) {
                tagname = 'span';
            }
            if (node.attributes.classes && node.attributes.classes.length > 0) {
                this.body.push(this.starttag(node, tagname, '', false, { CLASS: node.attributes.classes.join(' ') }));
            }
            this.body.push(node.astext());
            if (node.attributes.classes && node.attributes.classes.length > 0) {
                this.body.push(`</${tagname}>`);
            }
        }
        // Keep non-HTML raw text out of output:
        throw new nodes.SkipNode();
    }

    public visit_reference(node: NodeInterface): void {
        const atts: Attributes = { class: 'reference' };
        if ('refuri' in node.attributes) {
            atts.href = node.attributes.refuri;
            if (this.settings.cloakEmailAddresses
                && atts.href.substring(0, 6) === 'mailto:') {
                atts.href = this.cloakMailto(atts.href);
                this.inMailto = true;
            }
            atts.class += ' external';
        } else {
            // assert 'refid' in node, \ 'References must have "refuri" or "refid" attribute.'
            atts.href = `#${node.attributes.refid}`;
            atts.class += ' internal';
        }

        if (!(node.parent instanceof nodes.TextElement)) {
            // assert len(node: NodeInterface) == 1 and isinstance(node.attributes[0], nodes.image)
            atts.class += ' image-reference';
        }
        this.body.push(this.starttag(node, 'a', '', false, atts));
    }

    public depart_reference(node: NodeInterface): void {
        this.body.push('</a>');
        if (!(node.parent instanceof nodes.TextElement)) {
            this.body.push('\n');
        }
        this.inMailto = false;
    }

    public visit_revision(node: NodeInterface): void {
        this.visit_docinfo_item(node, 'revision', false);
    }

    public depart_revision(node: NodeInterface): void {
        this.depart_docinfo_item();
    }

    public visit_row(node: row): void {
        this.body.push(this.starttag(node, 'tr', ''));
        node.column = 0;
    }

    public depart_row(node: NodeInterface): void {
        this.body.push('</tr>\n');
    }

    public visit_rubric(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'p', '', false, { CLASS: 'rubric' }));
    }

    public depart_rubric(node: NodeInterface): void {
        this.body.push('</p>\n');
    }

    public visit_sidebar(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'div', '', false, { CLASS: 'sidebar' }));
        this.inSidebar = true;
    }

    public depart_sidebar(node: NodeInterface): void {
        this.body.push('</div>\n');
        this.inSidebar = false;
    }

    public visit_status(node: NodeInterface): void {
        this.visit_docinfo_item(node, 'status', false);
    }

    public depart_status(node: NodeInterface): void {
        this.depart_docinfo_item();
    }

    public visit_strong(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'strong', ''));
    }

    public depart_strong(node: NodeInterface): void {
        this.body.push('</strong>');
    }

    /*
        # <sub> not allowed in <pre>
        def visit_subscript(self, node) -> None:
            if isinstance(node.parent, nodes.literal_block):
                self.body.append(self.starttag(node, 'span', '',
                                            CLASS='subscript'))
            else:
                self.body.append(self.starttag(node, 'sub', ''))

        def depart_subscript(self, node) -> None:
            if isinstance(node.parent, nodes.literal_block):
                self.body.append('</span>')
            else:
                self.body.append('</sub>')
    */

    public visit_subscript(node: NodeInterface): void {
        if (node.parent instanceof nodes.literal_block) {
            this.body.push(this.starttag(node, 'span', '', false, { CLASS: 'subscript' }));
        } else {
            this.body.push(this.starttag(node, 'sub', ''));
        }
    }

    public depart_subscript(node: NodeInterface): void {
        if (node.parent instanceof nodes.literal_block) {
            this.body.push('</span>');
        } else {
            this.body.push('</sub>');
        }
    }

    /** Internal only. */
    public visit_substitution_definition(node: NodeInterface): void {
        throw new nodes.SkipNode();
    }

    public visit_substitution_reference(node: NodeInterface): void {
        this.unimplemented_visit(node);
    }

    /**
     * h1–h6 elements must not be used to markup subheadings, subtitles,
     * alternative titles and taglines unless intended to be the heading for a
     * new section or subsection.
     * -- http://www.w3.org/TR/html51/sections.html#headings-and-sections
     */
    public visit_subtitle(node: NodeInterface): void {
        let classes: string[] = [];
        if (node.parent instanceof nodes.sidebar) {
            classes = ['sidebar-subtitle'];
        } else if (node.parent instanceof nodes.document) {
            classes = ['subtitle'];
            this.inDocumentTitle = this.body.length + 1;
        } else if (node.parent instanceof nodes.section) {
            classes = ['section-subtitle'];
        }
        this.body.push(this.starttag(node, 'p', '', false, { CLASS: classes.join(' ') }));
    }

    public depart_subtitle(node: NodeInterface): void {
        this.body.push('</p>\n');
        if (node.parent instanceof nodes.document) {
            this.subtitle = this.body.slice(this.inDocumentTitle, -1);
            this.inDocumentTitle = 0;
            this.bodyPrefix.push(...this.body);
            this.htmlSubtitle.push(...this.body);
            this.body.splice(0, this.body.length);
        }
    }

    public visit_superscript(node: NodeInterface): void {
        if (node.parent instanceof nodes.literal_block) {
            this.body.push(this.starttag(node, 'span', '', false, { CLASS: 'superscript' }));
        } else {
            this.body.push(this.starttag(node, 'sup', ''));
        }
    }

    public depart_superscript(node: NodeInterface): void {
        if (node.parent instanceof nodes.literal_block) {
            this.body.push('</span>');
        } else {
            this.body.push('</sup>');
        }
    }

    public visit_system_message(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'div', '\n', false, { CLASS: 'system-message' }));
        this.body.push('<p class="system-message-title">');
        let backrefText = '';
        if (node.attributes.backrefs.length) {
            const backrefs = node.attributes.backrefs;
            if (backrefs.length === 1) {
                backrefText = `; <em><a href="//${backrefs[0]}">backlink</a></em>`;
            } else {
                const backlinks = backrefs.map((backref: string, i: number): string => `<a href="//${backref}">${i + 1}</a>`);
                backrefText = `; <em>backlinks: ${backlinks.join(', ')}</em>`;
            }
        }
        let line;
        if (node.attributes.line != null) {
            line = `, line ${node.attributes.line}`;
        } else {
            line = '';
        }
        this.body.push(`System Message: ${node.attributes.type}/${node.attributes.level} (<span class="docutils literal">${this.encode(node.attributes.source)}</span>${line})${backrefText}</p>\n`);
    }

    public depart_system_message(node: NodeInterface): void {
        this.body.push('</div>\n');
    }

    public visit_table(node: NodeInterface): void {
        const atts: Attributes = {};
        const classes = this.tableStyle.split(',').map((cls: string): string => cls.replace(/^[ \t\n]*/, '').replace(/[ \t\n]$/, ''));
        if ('align' in node.attributes) {
            classes.push(`align-${node.attributes.align}`);
        }
        if ('width' in node.attributes) {
            atts.style = `width: ${node.attributes.width}`;
        }
        const tag = this.starttag(node, 'table', '\n', false, { CLASS: classes.join(' '), ...atts });
        this.body.push(tag);
    }

    public depart_table(node: NodeInterface): void {
        this.body.push('</table>\n');
    }

    public visit_target(node: NodeInterface): void {
        if (!(('refuri' in node.attributes) || ('refid' in node.attributes) || ('refname' in node.attributes))) {
            this.body.push(this.starttag(node, 'span', '', false, { CLASS: 'target' }));
            this.context.push('</span>');
        } else {
            this.context.push('');
        }
    }

    public depart_target(node: NodeInterface): void {
        this.body.push(this.context.pop()!);
    }

    // no hard-coded vertical alignment in table body
    public visit_tbody(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'tbody'));
    }

    public depart_tbody(node: NodeInterface): void {
        this.body.push('</tbody>\n');
    }

    public visit_term(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'dt', ''));
    }

    /**
     * Leave the end tag to `this.visit_definition()`, in case there's a classifier.
     */
    public depart_term(node: NodeInterface): void {
    }

    public visit_tgroup(node: tgroup): void {
        this.colspecs = [];
        node.stubs = [];
    }

    public depart_tgroup(node: NodeInterface): void {
    }

    public visit_thead(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'thead'));
    }

    public depart_thead(node: NodeInterface): void {
        this.body.push('</thead>\n');
    }

    public visit_title_reference(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'cite', ''));
    }

    public depart_title_reference(node: NodeInterface): void {
        this.body.push('</cite>');

        // TODO: use the new HTML5 element <aside>? (Also for footnote text)
    }

    public visit_topic(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'div', '\n', false, { CLASS: 'topic' }));
        this.topicClasses = node.attributes.classes; // fixme checkme
    }
    // TODO: replace with ::
    //   this.in_contents = 'contents' in node.attributes['classes']

    public depart_topic(node: NodeInterface): void {
        this.body.push('</div>\n');
        this.topicClasses = [];
        // TODO this.in_contents = false
    }

    public visit_transition(node: NodeInterface): void {
        this.body.push(this.emptytag(node, 'hr', '\n', { CLASS: 'docutils' }));
    }

    public depart_transition(node: NodeInterface): void {
    }

    public visit_version(node: NodeInterface): void {
        this.visit_docinfo_item(node, 'version', false);
    }

    public depart_version(node: NodeInterface): void {
        this.depart_docinfo_item();
    }

    public unimplemented_visit(node: NodeInterface): void {
        throw new UnimplementedError(`visiting unimplemented node type: ${node.tagname}`);
    }

    public visit_title(node: NodeInterface): void {
        // Only 6 section levels are supported by HTML.
        const checkId = 0; // TODO: is this a bool (false) or a counter?
        let closeTag = '</p>\n';
        if (node.parent instanceof nodes.topic) {
            this.body.push(
                this.starttag(node, 'p', '', false, { CLASS: 'topic-title first' }),
            );
        } else if (node.parent instanceof nodes.sidebar) {
            this.body.push(
                this.starttag(node, 'p', '', false, { CLASS: 'sidebar-title' }),
            );
        } else if (node.parent!.isAdmonition()) {
            this.body.push(
                this.starttag(node, 'p', '', false, { CLASS: 'admonition-title' }),
            );
        } else if (node.parent instanceof nodes.table) {
            this.body.push(
                this.starttag(node, 'caption', ''),
            );
            closeTag = '</caption>\n';
        } else if (node.parent instanceof nodes.document) {
            this.body.push(this.starttag(node, 'h1', '', false, { CLASS: 'title' }));
            closeTag = '</h1>\n';
            this.inDocumentTitle = this.body.length;
        } else {
            // assert isinstance(node.parent, nodes.section)
            const headerLevel = this.sectionLevel + this.initialHeaderLevel - 1;
            let atts: Attributes = {};
            if (node.parent!.getNumChildren() >= 2
                && node.parent!.getChild(1) instanceof nodes.subtitle) {
                atts.CLASS = 'with-subtitle';
            }
            this.body.push(
                this.starttag(node, `h${headerLevel}`, '', false, atts),
            );
            atts = {};
            if (Object.prototype.hasOwnProperty.call(node, 'refid')) {
                atts.class = 'toc-backref';
                atts.href = `#${node.attributes.refid}`;
            }
            if (Object.keys(atts).length) {
                this.body.push(this.starttag(node, 'a', '', false, atts));
                closeTag = `</a></h${headerLevel}>\n`;
            } else {
                closeTag = `</h${headerLevel}>\n`;
            }
        }
        this.context.push(closeTag);
    }

    public depart_title(node: NodeInterface): void {

        this.body.push(this.context.pop()!);
        if (this.inDocumentTitle) {
            this.title = this.body.slice(this.inDocumentTitle, this.body.length - 2);
            this.inDocumentTitle = 0;
            this.bodyPreDocinfo.push(...this.body);
            this.htmlTitle.push(...this.body);
            this.body.length = 0;
        }
    }

    public visit_bullet_list(node: NodeInterface): void {
        const atts: Attributes = {};
        const oldCompactSimple = this.compactSimple;

        this.context.push([this.compactSimple, this.compactParagraph]);
        this.compactParagraph = undefined;
        this.compactSimple = this.isCompactable(node);
        if (this.compactSimple && !oldCompactSimple) {
            atts.class = 'simple';
        }
        this.body.push(this.starttag(node, 'ul', '', false, atts));
    }

    public depart_bullet_list(node: NodeInterface): void {

        [this.compactSimple, this.compactParagraph] = this.context.pop()!;
        this.body.push('</ul>\n');
    }

    public visit_list_item(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'li', ''));
    }

    public depart_list_item(node: NodeInterface): void {
        this.body.push('</li>\n');
    }

    public visit_paragraph(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'p', ''));
    }

    public depart_paragraph(node: NodeInterface): void {
        this.body.push('</p>');
        if (!((node.parent instanceof nodes.list_item
            || node.parent instanceof nodes.entry)
            && node.parent.getNumChildren() === 1)) {
            this.body.push('\n');
        }
    }

    public passNode(node: NodeInterface): void {
    }

    public ignoreNode(node: NodeInterface): void {
        throw new nodes.SkipNode();
    }

    public addMeta(metaTag: string): void {

    }

    /** Check for a simple list that can be rendered compactly. */
    public checkSimpleList(node: NodeInterface): boolean {
        const visitor = new SimpleListChecker(this.document);
        try {
            node.walk(visitor);
        } catch (error) {
            if (error instanceof nodes.NodeFound) {
                return false;
            } else {
                throw error;
            }
        }
        return true;
    }
}

/**
 * Class for writing HTML
 *  
 */
class HTMLBaseWriter extends BaseWriter {
    private visitorAttributes: string[] = ['headPrefix', 'head', 'stylesheet', 'bodyPrefix', 'bodyPreDocinfo', 'docinfo', 'body',
        'bodySuffix', 'title', ' subtitle', 'header', 'footer', 'meta', 'fragment', 'htmlProlog', 'htmlHead', 'htmlTitle', 'htmlSubtitle',
        'htmlBody'];
    /*    private defaultTemplateContent: any;*/
    private visitor?: HTMLTranslator;
    /*    private attr: any;*/
    private translatorClass: typeof HTMLTranslator = HTMLTranslator;
    private template: TemplateFunction = template;

    public configSection = 'html base writer'  // overwrite in subclass
    public configSectionDependencies = ['writers', 'html writers'];

    public settingsDefaults: GenericSettings = {
        outputEncodingErrorHandler: 'xmlcharrefreplace',
    };
    public settingsSpec: SettingsSpecType[] = [
        [
            "HTML-Specific Options",
            null,
            [
                [
                    "Specify the template file (UTF-8 encoded).  Default is \"/local/home/jade/docutils-dev/docutils-monorepo/venv/lib/python3.7/site-packages/docutils/writers/html4css1/template.txt\".",
                    [
                        "--template"
                    ],
                    {
                        "default": "/local/home/jade/docutils-dev/docutils-monorepo/venv/lib/python3.7/site-packages/docutils/writers/html4css1/template.txt",
                        "metavar": "<file>"
                    }
                ],
                [
                    "Comma separated list of stylesheet URLs. Overrides previous --stylesheet and --stylesheet-path settings.",
                    [
                        "--stylesheet"
                    ],
                    {
                        "metavar": "<URL[,URL,...]>",
                        "overrides": "stylesheet_path",
                        "validator": "validate_comma_separated_list"
                    }
                ],
                [
                    "Comma separated list of stylesheet paths. Relative paths are expanded if a matching file is found in the --stylesheet-dirs. With --link-stylesheet, the path is rewritten relative to the output HTML file. Default: \"html4css1.css\"",
                    [
                        "--stylesheet-path"
                    ],
                    {
                        "metavar": "<file[,file,...]>",
                        "overrides": "stylesheet",
                        "validator": "validate_comma_separated_list",
                        "default": [
                            "html4css1.css"
                        ]
                    }
                ],
                [
                    "Embed the stylesheet(s) in the output HTML file.  The stylesheet files must be accessible during processing. This is the default.",
                    [
                        "--embed-stylesheet"
                    ],
                    {
                        "default": 1,
                        "action": "store_true",
                        "validator": "validate_boolean"
                    }
                ],
                [
                    "Link to the stylesheet(s) in the output HTML file. Default: embed stylesheets.",
                    [
                        "--link-stylesheet"
                    ],
                    {
                        "dest": "embed_stylesheet",
                        "action": "store_false"
                    }
                ],
                [
                    "Comma-separated list of directories where stylesheets are found. Used by --stylesheet-path when expanding relative path arguments. Default: \"['.', '/local/home/jade/docutils-dev/docutils-monorepo/venv/lib/python3.7/site-packages/docutils/writers/html4css1', '/local/home/jade/docutils-dev/docutils-monorepo/venv/lib/python3.7/site-packages/docutils/writers/html5_polyglot']\"",
                    [
                        "--stylesheet-dirs"
                    ],
                    {
                        "metavar": "<dir[,dir,...]>",
                        "validator": "validate_comma_separated_list",
                        "default": [
                            ".",
                            "/local/home/jade/docutils-dev/docutils-monorepo/venv/lib/python3.7/site-packages/docutils/writers/html4css1",
                            "/local/home/jade/docutils-dev/docutils-monorepo/venv/lib/python3.7/site-packages/docutils/writers/html5_polyglot"
                        ]
                    }
                ],
                [
                    "Specify the initial header level.  Default is 1 for \"<h1>\".  Does not affect document title & subtitle (see --no-doc-title).",
                    [
                        "--initial-header-level"
                    ],
                    {
                        "choices": [
                            "1",
                            "2",
                            "3",
                            "4",
                            "5",
                            "6"
                        ],
                        "default": "1",
                        "metavar": "<level>"
                    }
                ],
                [
                    "Specify the maximum width (in characters) for one-column field names.  Longer field names will span an entire row of the table used to render the field list.  Default is 14 characters.  Use 0 for \"no limit\".",
                    [
                        "--field-name-limit"
                    ],
                    {
                        "default": 14,
                        "metavar": "<level>",
                        "validator": "validate_nonnegative_int"
                    }
                ],
                [
                    "Specify the maximum width (in characters) for options in option lists.  Longer options will span an entire row of the table used to render the option list.  Default is 14 characters.  Use 0 for \"no limit\".",
                    [
                        "--option-limit"
                    ],
                    {
                        "default": 14,
                        "metavar": "<level>",
                        "validator": "validate_nonnegative_int"
                    }
                ],
                [
                    "Format for footnote references: one of \"superscript\" or \"brackets\".  Default is \"brackets\".",
                    [
                        "--footnote-references"
                    ],
                    {
                        "choices": [
                            "superscript",
                            "brackets"
                        ],
                        "default": "brackets",
                        "metavar": "<format>",
                        "overrides": "trim_footnote_reference_space"
                    }
                ],
                [
                    "Format for block quote attributions: one of \"dash\" (em-dash prefix), \"parentheses\"/\"parens\", or \"none\".  Default is \"dash\".",
                    [
                        "--attribution"
                    ],
                    {
                        "choices": [
                            "dash",
                            "parentheses",
                            "parens",
                            "none"
                        ],
                        "default": "dash",
                        "metavar": "<format>"
                    }
                ],
                [
                    "Remove extra vertical whitespace between items of \"simple\" bullet lists and enumerated lists.  Default: enabled.",
                    [
                        "--compact-lists"
                    ],
                    {
                        "default": 1,
                        "action": "store_true",
                        "validator": "validate_boolean"
                    }
                ],
                [
                    "Disable compact simple bullet and enumerated lists.",
                    [
                        "--no-compact-lists"
                    ],
                    {
                        "dest": "compact_lists",
                        "action": "store_false"
                    }
                ],
                [
                    "Remove extra vertical whitespace between items of simple field lists.  Default: enabled.",
                    [
                        "--compact-field-lists"
                    ],
                    {
                        "default": 1,
                        "action": "store_true",
                        "validator": "validate_boolean"
                    }
                ],
                [
                    "Disable compact simple field lists.",
                    [
                        "--no-compact-field-lists"
                    ],
                    {
                        "dest": "compact_field_lists",
                        "action": "store_false"
                    }
                ],
                [
                    "Added to standard table classes. Defined styles: \"borderless\". Default: \"\"",
                    [
                        "--table-style"
                    ],
                    {
                        "default": ""
                    }
                ],
                [
                    "Math output format, one of \"MathML\", \"HTML\", \"MathJax\" or \"LaTeX\". Default: \"HTML math.css\"",
                    [
                        "--math-output"
                    ],
                    {
                        "default": "HTML math.css"
                    }
                ],
                [
                    "Omit the XML declaration.  Use with caution.",
                    [
                        "--no-xml-declaration"
                    ],
                    {
                        "dest": "xml_declaration",
                        "default": 1,
                        "action": "store_false",
                        "validator": "validate_boolean"
                    }
                ],
                [
                    "Obfuscate email addresses to confuse harvesters while still keeping email links usable with standards-compliant browsers.",
                    [
                        "--cloak-email-addresses"
                    ],
                    {
                        "action": "store_true",
                        "validator": "validate_boolean"
                    }
                ]
            ]
        ]
    ];


    public translate(): void {
        this.visitor = new this.translatorClass(this.document!);
        const visitor = this.visitor;
        if (!visitor) {
            throw new Error();
        }
        this.document!.walkabout(visitor);
        const o: Record<string, any> = {};
        this.visitorAttributes.forEach((attr): void => {

            (this as Record<string, any>)[attr] = visitor[attr];
            if (!Object.prototype.hasOwnProperty.call(visitor, attr)) {
                logger.warn(`unknown visitor attribute ${attr}`);
            }
            o[attr] = visitor[attr] ? visitor[attr].join('') : undefined;
        });
        this.output = this.template!(o);
    }

    public applyTemplate(): string {
        /*        const templateContent = this.defaultTemplateContent;*/
        /*        template_file = open(this.document.settings.template, 'rb')
                  template = unicode(template_file.read(), 'utf-8')
                  template_file.close()
                  subs = this.interpolation_dict()
                  return template % subs
        */
        return template(this.templateVars());
    }

    public templateVars(): TemplateVars {
        const vars: TemplateVars = {};
        const settings = this.document!.settings;
        const obj = Object.getOwnPropertyDescriptor(this, "test");
        const x = obj ? obj.value : '';
        console.warn(x);
        this.visitorAttributes.forEach((attr): void => {
            vars[attr] = ((this as any)[attr] || [].join('').trim());
        });
        vars.encoding = settings.outputEncoding;
        vars.version = __version__;
        return vars;
    }

    public assembleParts(): void {
        super.assembleParts();
        this.visitorAttributes.forEach((part): void => {
            this.parts[part] = ((this as Record<string, any>)[part] || []).join('');
        });
        logger.silly('HtmlBase.assembleParts');
    }
}

export default HTMLBaseWriter;
