import { Document, ElementInterface, NodeInterface } from "../types.js";
import { nodes } from "../index.js"
import { compile, TemplateFunction } from 'ejs';
import * as HTMLBaseWriter from "./_htmlBase.js";
import text from "../parsers/rst/states/text.js";

class Writer extends HTMLBaseWriter.HTMLBaseWriter {
    // 
    protected translatorClass: typeof HTMLTranslator = HTMLTranslator;

}

class HTMLTranslator extends HTMLBaseWriter.HTMLTranslator {
    protected doctype: string = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"' +
        ' "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n';

    protected contentTypeMathML: TemplateFunction = compile('<meta http-equiv="Content-Type" content="application/xhtml+xml; charset=<%-charset%>" />\n');

    /* * Original code:
        content_type = ('<meta http-equiv="Content-Type"'
                    ' content="text/html; charset=%s" />\n')
    content_type_mathml = ('<meta http-equiv="Content-Type"'
                           ' content="application/xhtml+xml; charset=%s" />\n')


    */
    constructor(document: Document) {
        super(document);
    }

    /* NOTE: visit and depart method names stay in snake case instead of camel case */

    //   def set_first_last(self, node) -> None:
    //         self.set_class_on_child(node, 'first', 0)
    //         self.set_class_on_child(node, 'last', -1)

    public setFirstLast(node: NodeInterface): void {
        this.setClassOnChild(node, 'first', 0);
        this.setClassOnChild(node, 'last', -1);
    }
    public visit_admonition(node: NodeInterface): void {
        node.attributes.classes.splice(0, 0, 'admonition');
        this.body.push(this.starttag(node, 'div'));
        this.setFirstLast(node);
    }


    // author, authors: use <br> instead of paragraphs
    public visit_author(node: NodeInterface): void {
        if (node.parent instanceof nodes.authors) {
            if (this.authorInAuthors) {
                this.body.push('\n<br />');
            }
        } else {
            this.visit_docinfo_item(node, 'author');
        }
    }

    public depart_author(node: NodeInterface): void {
        if (node.parent instanceof nodes.authors) {
            this.authorInAuthors = true;
        } else {
            this.depart_docinfo_item();
        }
    }

    public visit_authors(node: NodeInterface): void {
        this.visit_docinfo_item(node, 'authors');
        this.authorInAuthors = false; // initialize
    }

    public isCompactable(node: NodeInterface): boolean {
        return ('compact' in node.attributes.classes
            || ((!!this.settings.compactLists)
                && !('open' in node.attributes.classes)
                && (this.compactSimple
                    || ('contents' in node.parent!.attributes.classes)
                    || this.checkSimpleList(node)))
        );
    }

    public visit_citation(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'table', undefined, undefined, { 'CLASS': 'docutils citation', frame: "void", rules: "none" }));
        this.body.push('<colgroup><col class="label" /><col /></colgroup>\n' +
            '<tbody valign="top">\n' +
            '<tr>');
        this.footnoteBackrefs(node);
    }

    public depart_citation(node: NodeInterface): void {
        this.body.push('</td></tr>\n' +
            '</tbody>\n</table>\n');
    }

    public visit_citation_reference(node: NodeInterface): void {
        let href = '#';
        if ('refid' in node) {
            href += node['refid'];
        } else if ('refname' in node) {
            href += this.document.nameIds[node.attributes.refname];
        }
        this.body.push(this.starttag(node, 'a', undefined, undefined, { href, classes: ['citation-reference'] }));
    }

    public depart_citation_reference(node: NodeInterface): void {
        this.body.push(']</a>');
    }

    public visit_classifier(node: NodeInterface): void {
        this.body.push(' <span class="classifier-delimiter">:</span> ');
        this.body.push(this.starttag(node, 'span', '', undefined, { 'CLASS': 'classifier' }));
    }

    public depart_classifier(node: NodeInterface): void {
        this.body.push('</span>');
        this.depart_term(node);  // close the <dt> after last classifier
    }

    public visit_compound(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'div', undefined, undefined, { 'CLASS': 'compound' }));
        if (node.children && node.children.length > 1) {
            node.children[0].attributes.classes.push('compound-first');
            node.children[node.children.length - 1].attributes.classes.push('compound-last');
            for (let i = 1; i < node.children.length - 1; i++) {
                node.children[i].attributes.classes.push('compound-middle');
            }
        }
    }

    public depart_compound(node: NodeInterface): void {
        this.body.push('</div>\n');
    }

    public visit_definition(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'dd', ''));
        this.setFirstLast(node);
    }

    public depart_definition(node: NodeInterface): void {
        this.body.push('</dd>\n');
    }

    public visit_definition_list(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'dl', undefined, undefined, { 'CLASS': 'docutils' }));
    }

    public depart_definition_list(node: NodeInterface): void {
        this.body.push('</dl>\n');
    }

    public visit_definition_list_item(node: NodeInterface): void {
        // pass
    }

    public depart_definition_list_item(node: NodeInterface): void {
        // pass
    }

    public visit_description(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'td', ''));
        this.setFirstLast(node);
    }

    public depart_description(node: NodeInterface): void {
        this.body.push('</td>');
    }

    public visit_docinfo(node: NodeInterface): void {
        this.context.push(this.body.length);
        this.body.push(this.starttag(node, 'table', undefined, undefined, { 'CLASS': 'docinfo', frame: "void", rules: "none" }));
        this.body.push('<col class="docinfo-name" />\n' +
            '<col class="docinfo-content" />\n' +
            '<tbody valign="top">\n');
        this.inDocinfo = true;
    }

    public depart_docinfo(node: NodeInterface): void {
        this.body.push('</tbody>\n</table>\n');
        this.inDocinfo = false;
        const start = this.context.pop();
        this.docinfo = this.body.slice(start);
        this.body = [];
    }

    public visit_docinfo_item(node: NodeInterface, name: string, meta: boolean = true): void {
        if (meta) {
            const metaTag = `<meta name="${name}" content="${this.attVal(node.astext())}" />\n`;
            this.meta.push(metaTag);
        }
        this.body.push(this.starttag(node, 'tr', ''));
        this.body.push(`<th class="docinfo-name">${this.language.labels[name]}:</th>\n<td>`);
        if (node.children && node.children.length > 0) {
            if (node.children[0] instanceof nodes.Element) {
                node.children[0].attributes.classes.push('first');
            }
            if (node.children[node.children.length - 1] instanceof nodes.Element) {
                node.children[node.children.length - 1].attributes.classes.push('last');
            }
        }
    }

    public depart_docinfo_item(): void {
        this.body.push('</td></tr>\n');
    }

    public visit_doctest_block(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'pre', undefined, undefined, { 'CLASS': 'doctest-block' }));
    }

    public depart_doctest_block(node: NodeInterface): void {
        this.body.push('\n</pre>\n');
    }

    public visit_entry(node: NodeInterface): void {
        super.visit_entry(node as nodes.entry);
        if (node.children.length === 0) {
            this.body.push('&nbsp;');
        }
    }

    public depart_entry(node: NodeInterface): void {
        this.body.push(this.context.pop());
    }

    public visit_enumerated_list(node: NodeInterface): void {
        /*
        The 'start' attribute does not conform to HTML 4.01's strict.dtd, but
        cannot be emulated in CSS1 (HTML 5 reincludes it).
        */
        const atts: { [key: string]: string | number } = {};
        if ('start' in node.attributes) {
            atts['start'] = node.attributes.start;
        }
        if ('enumtype' in node.attributes) {
            atts['class'] = node.attributes.enumtype;
        }
        // @@@ To do: prefix, suffix. How? Change prefix/suffix to a
        // single "format" attribute? Use CSS2?
        const oldCompactSimple = this.compactSimple;
        this.context.push([this.compactSimple, this.compactP]);
        this.compactP = undefined;
        this.compactSimple = this.isCompactable(node);
        if (this.compactSimple && !oldCompactSimple) {
            atts['class'] = ((atts['class'] || '') + ' simple').trim();
        }
        this.body.push(this.starttag(node, 'ol', undefined, undefined, atts));
    }

    public depart_enumerated_list(node: NodeInterface): void {
        [this.compactSimple, this.compactP] = this.context.pop() as [boolean, boolean | undefined];
        this.body.push('</ol>\n');
    }

    public visit_field(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'tr', '', undefined, { 'CLASS': 'field' }));
    }

    public depart_field(node: NodeInterface): void {
        this.body.push('</tr>\n');
    }

    public visit_field_body(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'td', '', undefined, { 'CLASS': 'field-body' }));
        this.setClassOnChild(node, 'first', 0);
        const field = node.parent!;
        if (this.compactFieldList
            || field instanceof nodes.docinfo
            || field.index(field) === field.parent!.children.length - 1) {
            // If we are in a compact list, the docinfo, or if this is
            // the last field of the field list, do not add vertical
            // space after last element.
            this.setClassOnChild(node, 'last', -1);
        }
    }

    public depart_field_body(node: NodeInterface): void {
        this.body.push('</td>\n');
    }

    public visit_field_list(node: NodeInterface): void {
        this.context.push([this.compactFieldList, this.compactP]);
        this.compactP = undefined;
        if ('compact' in node.attributes.classes) {
            this.compactFieldList = true;
        } else if (this.settings.compactFieldLists && !('open' in node.attributes.classes)) {
            this.compactFieldList = true;
        }
        if (this.compactFieldList) {
            for (const field of node.children) {
                const fieldBody = field.children[field.children.length - 1];
                if (fieldBody instanceof nodes.field_body) {
                    const children = fieldBody.children.filter(n => !(n instanceof nodes.Invisible));
                    if (!(children.length === 0
                        || (children.length === 1
                            && (children[0] instanceof nodes.paragraph
                                || children[0] instanceof nodes.line_block)))) {
                        this.compactFieldList = false;
                        break;
                    }
                } else {
                    throw new Error("Expected field_body node");
                }
            }
        }
        this.body.push(this.starttag(node, 'table', undefined, undefined, { frame: 'void', rules: 'none', 'CLASS': 'docutils-field-list' }));

        this.body.push('<col class="field-name" />\n' +
            '<col class="field-body" />\n' +
            '<tbody valign="top">\n');
    }

    public depart_field_list(node: NodeInterface): void {
        this.body.push('</tbody>\n</table>\n');
        [this.compactFieldList, this.compactP] = this.context.pop() as [boolean, boolean | undefined];
    }

    public visit_field_name(node: NodeInterface): void {
        const atts: { [key: string]: string | number } = {};
        if (this.inDocinfo) {
            atts['class'] = 'docinfo-name';
        } else {
            atts['class'] = 'field-name';
        }
        if (this.settings.fieldNameLimit
            && node.astext().length > this.settings.fieldNameLimit) {
            atts['colspan'] = 2;
            this.context.push('</tr>\n' +
                this.starttag(node.parent!, 'tr', '', undefined, { 'CLASS': 'field' }) +
                '<td>&nbsp;</td>');
        } else {
            this.context.push('');
        }
        this.body.push(this.starttag(node, 'th', '', undefined, atts));
    }

    public depart_field_name(node: NodeInterface): void {
        this.body.push(':</th>');
        this.body.push(this.context.pop()!);
    }

    public visit_footnote(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'table', undefined, undefined,
            { 'CLASS': 'docutils footnote', frame: "void", rules: "none" }));
        this.body.push('<colgroup><col class="label" /><col /></colgroup>\n' +
            '<tbody valign="top">\n' +
            '<tr>');
        this.footnoteBackrefs(node);
    }

    public footnoteBackrefs(node: NodeInterface): void {
        const backlinks: string[] = [];
        const backrefs = node.attributes['backrefs'];
        if (this.settings.footnoteBacklinks && backrefs && backrefs.length > 0) {
            if (backrefs.length === 1) {
                this.context.push('');
                this.context.push('</a>');
                this.context.push(`<a class="fn-backref" href="#${backrefs[0]}">`);
            } else {
                for (let i = 0; i < backrefs.length; i++) {
                    backlinks.push(`<a class="fn-backref" href="#${backrefs[i]}">${i + 1}</a>`);
                }
                this.context.push(`<em>(${backlinks.join(', ')})</em> `);
                this.context.push('');
                this.context.push('');
            }
        } else {
            this.context.push('');
            this.context.push('');
            this.context.push('');
        }
        // If the node does not only consist of a label.
        if (node.children && node.children.length > 1) {
            // If there are preceding backlinks, we do not set class
            // 'first', because we need to retain the top-margin.
            if (!backlinks.length) {
                node.children[1].attributes['classes'].push('first');
            }
            node.children[node.children.length - 1].attributes['classes'].push('last');
        }
    }

    public depart_footnote(node: NodeInterface): void {
        this.body.push('</td></tr>\n' +
            '</tbody>\n</table>\n');
    }

    public visit_footnote_reference(node: NodeInterface): void {
        let href = '#' + node.attributes['refid'];
        let format = this.settings.footnoteReferences;
        let suffix: string;
        if (format === 'brackets') {
            suffix = '[';
            this.context.push(']');
        } else {
            if (format !== 'superscript') {
                throw new Error("Expected footnote_references to be 'brackets' or 'superscript'");
            }
            suffix = '<sup>';
            this.context.push('</sup>');
        }
        this.body.push(this.starttag(node, 'a', suffix, undefined,
            { 'CLASS': 'footnote-reference', 'href': href }));
    }

    public depart_footnote_reference(node: NodeInterface): void {
        this.body.push(this.context.pop() + '</a>');
    }

    public visit_generated(node: NodeInterface): void {
        // pass
    }

    // use table for footnote text,
    // context added in footnote_backrefs.
    public visit_label(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'td', `${this.context.pop()}[`, undefined, { 'CLASS': 'label' }));
    }

    public depart_label(node: NodeInterface): void {
        this.body.push(`]${this.context.pop()}</td><td>${this.context.pop()}`);
    }

    public visit_list_item(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'li', ''));
        if (node.children && node.children.length > 0) {
            node.children[0].attributes['classes'].push('first');
        }
    }

    public depart_list_item(node: NodeInterface): void {
        this.body.push('</li>\n');
    }

    public visit_literal(node: NodeInterface): void {
        // special case: "code" role
        const classes = node.attributes['classes'];
        if (classes.includes('code')) {
            // filter 'code' from class arguments
            node.attributes['classes'] = classes.filter((cls: string) => cls !== 'code');
            this.body.push(this.starttag(node, 'code', ''));
            return;
        }
        this.body.push(
            this.starttag(node, 'tt', '', undefined, { 'CLASS': 'docutils literal' }));
        const text = node.astext();
        for (const token of text.match(this.wordsAndSpaces) || []) {
            if (token.trim()) {
                // Protect text like "--an-option" and the regular expression
                // ``[+]?(\d+(\.\d*)?|\.\d+)`` from bad line wrapping
                if (this.inWordWrapPoint.test(token)) {
                    this.body.push('<span class="pre">' + this.encode(token) + '</span>');
                } else {
                    this.body.push(this.encode(token));
                }
            } else if (token === '\n' || token === ' ') {
                // Allow breaks at whitespace:
                this.body.push(token);
            } else {
                // Protect runs of multiple spaces; the last space can wrap:
                this.body.push('&nbsp;'.repeat(token.length - 1) + ' ');
            }
        }
        this.body.push('</tt>');
        // Content already processed:
        throw new nodes.SkipNode();
    }

    public depart_literal(node: NodeInterface): void {
        // skipped unless literal element is from "code" role:
        this.body.push('</code>');
    }

    // add newline after wrapper tags, don't use <code> for code
    public visit_literal_block(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'pre', undefined, undefined, { 'CLASS': 'literal-block' }));
    }

    public depart_literal_block(node: NodeInterface): void {
        this.body.push('\n</pre>\n');
    }


    // use table for option list
    public visit_option_group(node: NodeInterface): void {
        const atts: { [key: string]: string | number } = {};
        if (this.settings.optionLimit
            && node.astext().length > this.settings.optionLimit) {
            atts['colspan'] = 2;
            this.context.push('</tr>\n<tr><td>&nbsp;</td>');
        } else {
            this.context.push('');
        }
        this.body.push(
            this.starttag(node, 'td', undefined, undefined, { 'CLASS': 'option-group', ...atts }));
        this.body.push('<kbd>');
        this.context.push(0); // count number of options
    }

    public depart_option_group(node: NodeInterface): void {
        this.context.pop();
        this.body.push('</kbd></td>\n');
        this.body.push(this.context.pop());
    }

    public visit_option_list(node: NodeInterface): void {
        this.body.push(
            this.starttag(node, 'table', undefined, undefined, { 'CLASS': 'docutils option-list', frame: "void", rules: "none" }));
        this.body.push('<col class="option" />\n'
            + '<col class="description" />\n'
            + '<tbody valign="top">\n');
    }

    public depart_option_list(node: NodeInterface): void {
        this.body.push('</tbody>\n</table>\n');
    }

    public visit_option_list_item(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'tr', ''));
    }

    public depart_option_list_item(node: NodeInterface): void {
        this.body.push('</tr>\n');
    }

    /* Original code:

    # Omit <p> tags to produce visually compact lists (less vertical
    # whitespace) as CSS styling requires CSS2.
    def should_be_compact_paragraph(self, node) -> bool:
        """
        Determine if the <p> tags around paragraph ``node`` can be omitted.
        """
        if (isinstance(node.parent, nodes.document)
            or isinstance(node.parent, nodes.compound)):
            # Never compact paragraphs in document or compound.
            return False
        for key, value in node.attlist():
            if (node.is_not_default(key)
                and not (key == 'classes'
                         and value in ([], ['first'],
                                       ['last'], ['first', 'last']))):
                # Attribute which needs to survive.
                return False
        first = isinstance(node.parent[0], nodes.label)  # skip label
        for child in node.parent.children[first:]:
            # only first paragraph can be compact
            if isinstance(child, nodes.Invisible):
                continue
            if child is node:
                break
            return False
        parent_length = len([n for n in node.parent if not isinstance(
            n, (nodes.Invisible, nodes.label))])
        if (self.compact_simple
            or self.compact_field_list
            or self.compact_p and parent_length == 1):
            return True
        return False

    */

    // Omit <p> tags to produce visually compact lists (less vertical
    // whitespace) as CSS styling requires CSS2.
    public shouldBeCompactParagraph(node: ElementInterface): boolean {
        /*
            Determine if the <p> tags around paragraph ``node`` can be omitted.
        */
        if (node.parent instanceof nodes.document
            || node.parent instanceof nodes.compound) {
            // Never compact paragraphs in document or compound.
            return false;
        }
        for (const [key, value] of Object.entries(node.attlist())) {
            if (node.isNotDefault(key)
                && !(key === 'classes'
                    && (Array.isArray(value) && (
                        value.length === 0 ||
                        (value.length === 1 && value[0] === 'first') ||
                        (value.length === 1 && value[0] === 'last') ||
                        (value.length === 2 && value.includes('first') && value.includes('last'))
                    )))) {
                // Attribute which needs to survive.
                return false;
            }
        }
        const first = node.parent!.children[0] instanceof nodes.label ? 1 : 0;  // skip label
        for (const child of node.parent!.children.slice(first)) {
            // only first paragraph can be compact
            if (child instanceof nodes.Invisible) {
                continue;
            }
            if (child === node) {
                break;
            }
            return false;
        }
        const parent_length = node.parent!.children.filter(n => !(n instanceof nodes.Invisible || n instanceof nodes.label)).length;
        if (this.compactSimple
            || this.compactFieldList
            || this.compactP && parent_length === 1) {
            return true;
        }
        return false;

    }

    public visit_paragraph(node: ElementInterface): void {
        if (this.shouldBeCompactParagraph(node)) {
            this.context.push('');
        } else {
            this.body.push(this.starttag(node, 'p', ''));
            this.context.push('</p>\n');
        }
    }

    public depart_paragraph(node: NodeInterface): void {
        this.body.push(this.context.pop());
        this.reportMessages(node);
    }

    public visit_sidebar(node: NodeInterface): void {
        this.body.push(
            this.starttag(node, 'div', undefined, undefined, { 'CLASS': 'sidebar' }));
        this.setFirstLast(node);
        this.inSidebar = true;
    }

    public depart_sidebar(node: NodeInterface): void {
        this.body.push('</div>\n');
        this.inSidebar = false;
    }

    public visit_subscript(node: NodeInterface): void {
        if (node.parent instanceof nodes.literal_block) {
            this.body.push(this.starttag(node, 'span', '', undefined,
                { 'CLASS': 'subscript' }));
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

    // Use <h*> for subtitles (deprecated in HTML 5)
    public visit_subtitle(node: NodeInterface): void {
        if (node.parent instanceof nodes.sidebar) {
            this.body.push(this.starttag(node, 'p', '', undefined, { 'CLASS': 'sidebar-subtitle' }));
            this.context.push('</p>\n');
        } else if (node.parent instanceof nodes.document) {
            this.body.push(this.starttag(node, 'h2', '', undefined, { 'CLASS': 'subtitle' }));
            this.context.push('</h2>\n');
            this.inDocumentTitle = this.body.length;
        } else if (node.parent instanceof nodes.section) {
            const tag = 'h' + (this.sectionLevel + this.initialHeaderLevel - 1);
            this.body.push(
                this.starttag(node, tag, '', undefined, { 'CLASS': 'section-subtitle' })
                + this.starttag({ attributes: {} } as NodeInterface, 'span', '', undefined, { 'CLASS': 'section-subtitle' }));
            this.context.push(`</span></${tag}>\n`);
        }
    }

    public depart_subtitle(node: NodeInterface): void {
        this.body.push(this.context.pop());
        if (this.inDocumentTitle) {
            this.subtitle = this.body.slice(this.inDocumentTitle, -1);
            this.inDocumentTitle = 0;
            this.bodyPreDocinfo.push(...this.body);
            this.htmlSubtitle.push(...this.body);
            this.body = [];

        }
    }

    public visit_system_message(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'div', '\n', false, { CLASS: 'system-message' }));
        this.body.push('<p class="system-message-title">');
        let backrefText = '';
        if (node.attributes.backrefs && node.attributes.backrefs.length) {
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
        this.body.push(`System Message: ${node.attributes.type}/${node.attributes.level} (<tt class="docutils">${this.encode(node.attributes.source)}</tt>${line})${backrefText}</p>\n`);
    }

    public depart_system_message(node: NodeInterface): void {
        this.body.push('</div>\n');
    }

    public visit_table(node: NodeInterface): void {
        this.context.push(this.compactP);
        this.compactP = true;
        const atts: { [key: string]: string | number } = { border: 1 };
        const classes = ['docutils', this.settings.tableStyle || ''];
        if ('align' in node.attributes) {
            classes.push('align-' + node.attributes.align);
        }
        if ('width' in node) {
            const width = node.attributes.width;
            if (width.length > 0 && '0123456789.'.includes(width[width.length - 1])) {  // unitless value
                node.attributes.width += 'px';  // add default length unit
            }
            atts['style'] = `width: ${node.attributes.width}`;
        }
        this.body.push(
            this.starttag(node, 'table', undefined, undefined, { CLASS: classes.join(' '), ...atts }));
    }

    public depart_table(node: NodeInterface): void {
        this.compactP = this.context.pop() as boolean;
        this.body.push('</table>\n');
    }

    // hard-coded vertical alignment
    public visit_tbody(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'tbody', undefined, undefined, { valign: 'top' }));
    }

    public depart_tbody(node: NodeInterface): void {
        this.body.push('</tbody>\n');
    }

    // no special handling of "details" in definition list
    public visit_term(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'dt', '', undefined,
            { 'CLASS': (node.parent ? node.parent.attributes.classes.join(' ') : ''), 'ID': (node.parent ? node.parent.attributes.ids.join(' ') : '') }));
    }

    public depart_term(node: NodeInterface): void {
        // Nest (optional) classifier(s) in the <dt> element
        if (node.nextNode(
            {
                condition: nodes.classifier,
                descend: false,
                siblings: true
            }

        )) {
            return; // skip (depart_classifier() calls this function again)
        }
        this.body.push('</dt>\n');
    }

    // hard-coded vertical alignment
    public visit_thead(node: NodeInterface): void {
        this.body.push(this.starttag(node, 'thead', undefined, undefined, { valign: 'bottom' }));
    }

    public depart_thead(node: NodeInterface): void {
        this.body.push('</thead>\n');
    }

    // auxiliary method, called by visit_title()
    // "with-subtitle" class, no ARIA roles
    public sectionTitleTags(node: NodeInterface): [string, string] {
        const classes: string[] = [];
        const h_level = this.sectionLevel + this.initialHeaderLevel - 1;
        if (node.parent && node.parent.children.length >= 2 && node.parent.children[1] instanceof nodes.subtitle) {
            classes.push('with-subtitle');
        }
        if (h_level > 6) {
            classes.push('h' + h_level);
        }
        const tagname = 'h' + Math.min(h_level, 6);
        let start_tag = this.starttag(node, tagname, '', undefined, classes.length ? { classes } : undefined);
        let close_tag: string;
        if (node.attributes['refid']) {
            const atts: { [key: string]: string } = {};
            atts['class'] = 'toc-backref';
            atts['href'] = '#' + node.attributes['refid'];
            start_tag += this.starttag({ attributes: {} } as NodeInterface, 'a', '', undefined, atts);
            close_tag = '</a></' + tagname + '>\n';
        } else {
            close_tag = '</' + tagname + '>\n';
        }
        return [start_tag, close_tag];
    }

}


export default Writer;