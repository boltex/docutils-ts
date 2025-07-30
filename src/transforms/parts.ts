import Transform from '../transform.js';
import * as nodes from '../nodes.js';
import {
    NodeInterface,
} from "../types.js";

/*
 * Automatically assigns numbers to the titles of document sections.
 *
 * It is possible to limit the maximum section level for which the numbers
 * are added.  For those sections that are auto-numbered, the "autonum"
 * attribute is set, informing the contents table generator that a different
 * form of the TOC should be used.
*/
export class SectNum extends Transform {

    static defaultPriority = 710;

    private maxDepth?: number;
    private startValue?: number;
    private prefix?: string;
    private suffix?: string;
    public apply(): void {
        if (!this.startNode) {
            throw new Error('SectNum transform requires a startNode.');
        }
        this.maxDepth = this.startNode.details['depth'] || null;
        this.startValue = this.startNode.details['start'] || 1;
        this.prefix = this.startNode.details['prefix'] || '';
        this.suffix = this.startNode.details['suffix'] || '';
        this.startNode.parent?.remove(this.startNode)

        if (this.document.settings.sectnumXform) {
            if (this.maxDepth === null) {
                this.maxDepth = Number.MAX_SAFE_INTEGER;
            }
            this.updateSectionNumbers(this.document);
        } else {
            // Store details for eventual section numbering by the writer
            this.document.settings.sectnumDepth = this.maxDepth;
            this.document.settings.sectnumStart = this.startValue;
            this.document.settings.sectnumPrefix = this.prefix;
            this.document.settings.sectnumSuffix = this.suffix;
        }
    }

    public updateSectionNumbers(node: NodeInterface, prefix: string[] = [], depth: number = 0): void {
        depth += 1;
        let sectnum = prefix.length ? 1 : this.startValue || 1;
        for (const child of node.getChildren()) {
            if (child instanceof nodes.section) {
                const numbers = [...prefix, String(sectnum)];
                const title = child.getChildren()[0];
                // Use &nbsp; for spacing:
                const generated = new nodes.generated(
                    '',
                    `${this.prefix}${numbers.join('.')}${this.suffix}\u00a0\u00a0\u00a0`,
                    undefined,
                    { classes: ['sectnum'] }
                );
                title.insert(0, generated);
                title.attributes['auto'] = 1;
                if (depth < (this.maxDepth ?? Number.MAX_SAFE_INTEGER)) {
                    this.updateSectionNumbers(child, numbers, depth);
                }
                sectnum += 1;
            }
        }

    }


}

/**
 * This transform generates a table of contents from the entire document tree
 * or from a single branch.  It locates "section" elements and builds them
 * into a nested bullet list, which is placed within a "topic" created by the
 * contents directive.  A title is either explicitly specified, taken from
 * the appropriate language module, or omitted (local table of contents).
 * The depth may be specified.  Two-way references between the table of
 * contents and section titles are generated (requires Writer support).
 *
 * This transform requires a startnode, which contains generation
 * options and provides the location for the generated table of contents (the
 * startnode is replaced by the table of contents "topic").
 */
export class Contents extends Transform {

    // Note: Node.attributes.ids is an array of strings
    // while document.ids is a dictionary of string to NodeInterface.

    public backlinks: string | undefined;
    public tocId?: string;

    static defaultPriority = 720;

    public apply(): void {
        console.log('Contents transform started');
        // let the writer (or output software) build the contents list?
        const tocByWriter = this.document.settings.useLatexToc || false;
        // TODO: handle "generate_oowriter_toc" setting of the "ODT" writer.
        if (tocByWriter) {
            return;
        }
        const details = this.startNode?.details;
        if (!details) {
            throw new Error('Contents transform requires startNode with details.');
        }
        let startNode: NodeInterface | undefined;
        if ('local' in details) {
            startNode = this.startNode?.parent?.parent;
            while (startNode && !(startNode instanceof nodes.section || startNode instanceof nodes.document)) {
                // find the ToC root: a direct ancestor of startNode
                startNode = startNode.parent;
            }
            if (!startNode) {
                throw new Error('No valid start node found for local ToC.');
            }

        } else {
            startNode = this.document;
        }
        this.tocId = this.startNode?.parent?.attributes.ids[0];
        if (!this.tocId) {
            throw new Error('Contents transform requires a tocId.');
        }
        this.backlinks = details.backlinks || this.document.settings.tocBacklinks;
        const contents = this.buildContents(startNode);
        if (contents instanceof nodes.bullet_list && contents.getNumChildren() > 0) {
            this.startNode?.replaceSelf(contents);
        } else if (this.startNode?.parent?.parent) {
            this.startNode.parent.parent.remove(this.startNode.parent);
        }
    }

    public buildContents(node: NodeInterface, level: number = 0): nodes.bullet_list | [] {
        console.log(`Building contents for node: ${node.constructor.name} at level ${level}`);
        level += 1;
        const sections = node.getChildren().filter(child => child instanceof nodes.section);
        const entries: nodes.list_item[] = [];
        const depth = this.startNode?.details?.depth || Number.MAX_SAFE_INTEGER;

        let auto = false; // auto-numbered sections
        for (const section of sections) {
            const title = section.getChildren()[0];
            auto = title.attributes.auto; // May be set by SectNum.
            const entryText = this.copyAndFilter(title);
            const reference = new nodes.reference('', '', entryText, { refid: section.attributes.ids[0] });
            const refId = this.document.setId(reference, undefined, 'toc-entry');
            const entry = new nodes.paragraph('', '', [reference]);
            const item = new nodes.list_item('', [entry]);

            if (this.backlinks && ['entry', 'top'].includes(this.backlinks) && !title.nextNode(
                { condition: nodes.reference }
            )) {
                if (this.backlinks === 'entry') {
                    title.attributes.refid = refId;
                } else if (this.backlinks === 'top') {
                    title.attributes.refid = this.tocId;
                }
            }

            if (level < depth) {
                const subsects = this.buildContents(section, level);
                if (subsects instanceof nodes.bullet_list) {
                    item.append(subsects);
                }
            }
            entries.push(item);
        }

        if (entries.length > 0) {
            const contentsList = new nodes.bullet_list('', entries);
            if (auto) { // auto-numbered sections
                contentsList.attributes.classes.push('auto-toc');
            }
            return contentsList;
        } else {
            return [];
        }
    }

    public copyAndFilter(node: NodeInterface): NodeInterface[] {
        // Return a copy of a title, with references, images, etc. removed.
        const visitor = new ContentsFilter(this.document);
        node.walkabout(visitor);
        return visitor.getEntryText();
    }

}

class ContentsFilter extends nodes.TreeCopyVisitor {

    public getEntryText(): NodeInterface[] {
        return this.getTreeCopy().getChildren();
    }

    public visit_citation_reference(node: nodes.citation_reference): void {
        throw new nodes.SkipNode();
    }

    public visit_footnote_reference(node: nodes.footnote_reference): void {
        throw new nodes.SkipNode();
    }

    public visit_image(node: nodes.image): void {
        if (node.attributes['alt']) {
            // this.entryText.push(new nodes.Text(node.attributes['alt']));
            this.parent.append(new nodes.Text(node.attributes['alt']));
        }
        throw new nodes.SkipNode();
    }

    public ignoreNodeButProcessChildren(node: NodeInterface): void {
        throw new nodes.SkipDeparture();
    }

    public visit_problematic(node: nodes.problematic): void {
        this.ignoreNodeButProcessChildren(node);
    }

    public visit_reference(node: nodes.reference): void {
        this.ignoreNodeButProcessChildren(node);
    }

    public visit_target(node: nodes.target): void {
        this.ignoreNodeButProcessChildren(node);
    }
}

// Original Python source
/*
from __future__ import annotations

__docformat__ = 'reStructuredText'

import sys
from docutils import nodes
from docutils.transforms import Transform


class SectNum(Transform):

    """
    Automatically assigns numbers to the titles of document sections.

    It is possible to limit the maximum section level for which the numbers
    are added.  For those sections that are auto-numbered, the "auto"
    attribute is set, informing the contents table generator that a different
    form of the TOC should be used.
    """

    default_priority = 710
    """Should be applied before `Contents`."""

    def apply(self) -> None:
        self.maxdepth = self.startnode.details.get('depth', None)
        self.startvalue = self.startnode.details.get('start', 1)
        self.prefix = self.startnode.details.get('prefix', '')
        self.suffix = self.startnode.details.get('suffix', '')
        self.startnode.parent.remove(self.startnode)
        if self.document.settings.sectnum_xform:
            if self.maxdepth is None:
                self.maxdepth = sys.maxsize
            self.update_section_numbers(self.document)
        else:  # store details for eventual section numbering by the writer
            self.document.settings.sectnum_depth = self.maxdepth
            self.document.settings.sectnum_start = self.startvalue
            self.document.settings.sectnum_prefix = self.prefix
            self.document.settings.sectnum_suffix = self.suffix

    def update_section_numbers(self, node, prefix=(), depth=0) -> None:
        depth += 1
        if prefix:
            sectnum = 1
        else:
            sectnum = self.startvalue
        for child in node:
            if isinstance(child, nodes.section):
                numbers = prefix + (str(sectnum),)
                title = child[0]
                # Use &nbsp; for spacing:
                generated = nodes.generated(
                    '', (self.prefix + '.'.join(numbers) + self.suffix
                         + '\u00a0' * 3),
                    classes=['sectnum'])
                title.insert(0, generated)
                title['auto'] = 1
                if depth < self.maxdepth:
                    self.update_section_numbers(child, numbers, depth)
                sectnum += 1


class Contents(Transform):

    """
    This transform generates a table of contents from the entire document tree
    or from a single branch.  It locates "section" elements and builds them
    into a nested bullet list, which is placed within a "topic" created by the
    contents directive.  A title is either explicitly specified, taken from
    the appropriate language module, or omitted (local table of contents).
    The depth may be specified.  Two-way references between the table of
    contents and section titles are generated (requires Writer support).

    This transform requires a startnode, which contains generation
    options and provides the location for the generated table of contents (the
    startnode is replaced by the table of contents "topic").
    """

    default_priority = 720

    def apply(self) -> None:
        # let the writer (or output software) build the contents list?
        toc_by_writer = getattr(self.document.settings, 'use_latex_toc', False)
        # TODO: handle "generate_oowriter_toc" setting of the "ODT" writer.
        if toc_by_writer:
            return
        details = self.startnode.details
        if 'local' in details:
            startnode = self.startnode.parent.parent
            while not (isinstance(startnode, nodes.section)
                       or isinstance(startnode, nodes.document)):
                # find the ToC root: a direct ancestor of startnode
                startnode = startnode.parent
        else:
            startnode = self.document
        self.toc_id = self.startnode.parent['ids'][0]
        if 'backlinks' in details:
            self.backlinks = details['backlinks']
        else:
            self.backlinks = self.document.settings.toc_backlinks
        contents = self.build_contents(startnode)
        if len(contents):
            self.startnode.replace_self(contents)
        else:
            self.startnode.parent.parent.remove(self.startnode.parent)

    def build_contents(self, node, level=0):
        level += 1
        sections = [sect for sect in node if isinstance(sect, nodes.section)]
        entries = []
        depth = self.startnode.details.get('depth', sys.maxsize)
        for section in sections:
            title = section[0]
            auto = title.get('auto')    # May be set by SectNum.
            entrytext = self.copy_and_filter(title)
            reference = nodes.reference('', '', refid=section['ids'][0],
                                        *entrytext)
            ref_id = self.document.set_id(reference,
                                          suggested_prefix='toc-entry')
            entry = nodes.paragraph('', '', reference)
            item = nodes.list_item('', entry)
            if (self.backlinks in ('entry', 'top')
                and title.next_node(nodes.reference) is None):
                if self.backlinks == 'entry':
                    title['refid'] = ref_id
                elif self.backlinks == 'top':
                    title['refid'] = self.toc_id
            if level < depth:
                subsects = self.build_contents(section, level)
                item += subsects
            entries.append(item)
        if entries:
            contents = nodes.bullet_list('', *entries)
            if auto:  # auto-numbered sections
                contents['classes'].append('auto-toc')
            return contents
        else:
            return []

    def copy_and_filter(self, node):
        """Return a copy of a title, with references, images, etc. removed."""
        visitor = ContentsFilter(self.document)
        node.walkabout(visitor)
        return visitor.get_entry_text()


class ContentsFilter(nodes.TreeCopyVisitor):

    def get_entry_text(self):
        return self.get_tree_copy().children

    def visit_citation_reference(self, node):
        raise nodes.SkipNode

    def visit_footnote_reference(self, node):
        raise nodes.SkipNode

    def visit_image(self, node):
        if node.hasattr('alt'):
            self.parent.append(nodes.Text(node['alt']))
        raise nodes.SkipNode

    def ignore_node_but_process_children(self, node):
        raise nodes.SkipDeparture

    visit_problematic = ignore_node_but_process_children
    visit_reference = ignore_node_but_process_children
    visit_target = ignore_node_but_process_children

*/