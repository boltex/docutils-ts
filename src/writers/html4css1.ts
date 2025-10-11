import { Document, NodeInterface } from "../types.js";
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
        if ('start' in node) {
            atts['start'] = node.attributes.start;
        }
        if ('enumtype' in node) {
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




}