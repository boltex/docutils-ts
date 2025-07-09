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
        level += 1;
        const sections = node.getChildren().filter(child => child instanceof nodes.section);
        const entries: nodes.list_item[] = [];
        const depth = this.startNode?.details?.depth || Number.MAX_SAFE_INTEGER;

        let auto = false; // auto-numbered sections
        for (const section of sections) {
            const title = section.getChildren()[0];
            auto = title.attributes.auto; // May be set by SectNum.
            const entryText = this.copyAndFilter(title);
            const reference = new nodes.reference('', '', undefined, { refid: section.attributes.ids[0], entryText: entryText });
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
            this.entryText.push(new nodes.Text(node.attributes['alt']));
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


