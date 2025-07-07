import Transform from '../transform.js';
import * as nodes from '../nodes.js';

/*
 * Automatically assigns numbers to the titles of document sections.

 * It is possible to limit the maximum section level for which the numbers
 * are added.  For those sections that are auto-numbered, the "autonum"
 * attribute is set, informing the contents table generator that a different
 * form of the TOC should be used.
 
*/
export class SectNum extends Transform {
    private start?: number;
    private maxDepth?: number;
    private startValue?: number;
    private prefix?: number;
    public apply(): void {
        const s = this.startNode;
        // @ts-ignore
        this.maxDepth = s.details.attributes.depth || null;
        // @ts-ignore
        this.startValue = s.start || 1;
        this.prefix = this.start;
    }
}
SectNum.defaultPriority = 710;
// Original Python code from docutils.transforms.parts.SectNum
/*

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

*/

export class Contents extends Transform {
    private local?: boolean;
    private className?: string;
    public apply(): void {
        const s = this.startNode;
        // @ts-ignore
        this.local = s.details.attributes.local || false;
        // @ts-ignore
        this.className = s.details.attributes.class || '';
    }
}
Contents.defaultPriority = 720;
// Original Python code from docutils.transforms.parts.Contents
/* 

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

*/


/**
 *     Link anonymous references to targets.  Given::
 * 
 *         <paragraph>
 *             <reference anonymous="1">
 *                 internal
 *             <reference anonymous="1">
 *                 external
 *         <target anonymous="1" ids="id1">
 *         <target anonymous="1" ids="id2" refuri="http://external">
 * 
 *     Corresponding references are linked via "refid" or resolved via "refuri"::
 * 
 *         <paragraph>
 *             <reference anonymous="1" refid="id1">
 *                 text
 *             <reference anonymous="1" refuri="http://external">
 *                 external
 *         <target anonymous="1" ids="id1">
 *         <target anonymous="1" ids="id2" refuri="http://external">
 *  
 */

class AnonymousHyperlinks extends Transform {
    public apply(): void {
        const anonymousRefs = [];
        const anonymousTargets = [];
        this.document.traverse({ condition: nodes.reference }).forEach((node): void => {
            if (node.attributes.anonymous) {
                anonymousRefs.push(node);
            }
        });
    }
}
AnonymousHyperlinks.defaultPriority = 440;

