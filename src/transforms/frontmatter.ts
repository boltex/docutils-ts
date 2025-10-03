import * as nodes from '../nodes.js';
import Transform from '../transform.js';
import { ElementInterface, NodeInterface } from "../types.js";
import * as utils from '../utils.js';
import { fullyNormalizeName } from "../utils/nameUtils.js";
import newDocument from '../newDocument.js';
import { NoOpLogger } from '../noOpLogger.js';
import Parser from '../parsers/restructuredtext.js';

/**
 * TitlePromoter transform.
 * Base class for other transforms which promote section names to title and subtitle
 */
abstract class TitlePromoter extends Transform {

    public promoteTitle(node: NodeInterface): number | undefined {
        if (!(node instanceof nodes.Element)) {
            throw new TypeError('node must be of Element-derived type.');
        }
        // assert not (len(node) and isinstance(node[0], nodes.title))
        const [section, index] = this.candidateIndex(node);
        if (index == null || section == null) {
            return undefined;
        }
        node.updateAllAttsConcatenating(section, true, true);

        const newChildren = [
            ...section.children.slice(0, 1),
            ...node.getChildren().slice(0, index),
            ...section.children.slice(1)
        ];

        node.clearChildren();
        node.add(newChildren);
        // assert isinstance(node[0], nodes.title)
        return 1;
    }

    public promoteSubtitle(node: ElementInterface): number | undefined {
        // console.log('promoteSubtitle');
        // Type check
        const [subsection, index] = this.candidateIndex(node);

        if (index == null || subsection == null) {
            return undefined;
        }
        const subtitle: ElementInterface = new nodes.subtitle();

        // Transfer the subsection's attributes to the new subtitle
        // NOTE: Change second parameter to False to NOT replace
        //       attributes that already exist in node with those in
        //       section
        // NOTE: Remove third parameter to NOT copy the 'source'
        //       attribute from section
        subtitle.updateAllAttsConcatenating(subsection, true, true);

        // Transfer the contents of the subsection's title to the subtitle
        subtitle.add(subsection.getChild(0).getChildren());

        const newChildren = [
            node.getChild(0), // title
            subtitle,
            ...node.getChildren().slice(1, index),
            ...subsection.getChildren().slice(1)
        ];

        // Replace all children (not add to them)
        node.clearChildren();
        node.add(newChildren);

        return 1;
    }

    public candidateIndex(node: ElementInterface): [NodeInterface | null, number | null] {
        const index = node.firstChildNotMatchingClass(nodes.PreBibliographic);
        if (index == null || node.getNumChildren() > (index + 1)
            || !(node.getChild(index) instanceof nodes.section)) {
            return [null, null];
        }
        return [node.getChild(index), index];
    }
}

export class DocTitle extends TitlePromoter {

    public setMetadata(): void {
        if (!('title' in this.document.attributes)) {
            let title = this.document.settings.title;
            if (title != null) {
                this.document.attributes.title = title;
            } else if (this.document.hasChildren() && this.document.getChild(0) instanceof nodes.title) {
                this.document.attributes.title = this.document.getChild(0).astext();
            }
        }
    }

    public apply(): void {
        if (this.document.settings.doctitleXform || typeof this.document.settings.doctitleXform === 'undefined') {
            if (this.promoteTitle(this.document)) {
                this.promoteSubtitle(this.document);
            }
        }
        this.setMetadata();
    }
}
DocTitle.defaultPriority = 320;

export class SectionSubTitle extends TitlePromoter {

    public apply(): void {

        // original python
        /* 
           if not self.document.settings.setdefault('sectsubtitle_xform', True):
               return
           for section in self.document.findall(nodes.section):
               # On our way through the node tree, we are modifying it
               # but only the not-yet-visited part, so that the iterator
               # returned by findall() is not corrupted.
               self.promote_subtitle(section)
   
        */

        // first, emulate setdefault
        if (!('sectsubtitleXform' in this.document.settings)) {
            this.document.settings.sectsubtitleXform = true;
        }

        if (!this.document.settings.sectsubtitleXform) {
            return;
        }
        this.document.traverse({ condition: nodes.section }).forEach((section): void => {

            // make sure the codition was applied when getting the nodes 

            if (!(section instanceof nodes.section)) {
                throw new TypeError('SectionSubTitle transform requires a section node.');
            }

            // On our way through the node tree, we are deleting
            // sections, but we call self.promote_subtitle for those
            // sections nonetheless.  To do: Write a test case which
            // shows the problem and discuss on Docutils-develop.
            this.promoteSubtitle(section as ElementInterface);
        });
    }
}

SectionSubTitle.defaultPriority = 350;

/**
 *  This transform is specific to the reStructuredText_ markup syntax;
    see "Bibliographic Fields" in the `reStructuredText Markup
    Specification`_ for a high-level description. This transform
    should be run *after* the `DocTitle` transform.

    If the document contains a field list as the first element (instances
    of `nodes.PreBibliographic` are ignored), registered bibliographic
    field names are transformed to the corresponding DTD elements,
    becoming child elements of the <docinfo> element (except for a
    dedication and/or an abstract, which become <topic> elements after
    <docinfo>).

    For example, given this document fragment after parsing::

        <document>
            <title>
                Document Title
            <field_list>
                <field>
                    <field_name>
                        Author
                    <field_body>
                        <paragraph>
                            A. Name
                <field>
                    <field_name>
                        Status
                    <field_body>
                        <paragraph>
                            $RCSfile$
            ...

    After running the bibliographic field list transform, the
    resulting document tree would look like this::

        <document>
            <title>
                Document Title
            <docinfo>
                <author>
                    A. Name
                <status>
                    frontmatter.py
            ...

    The "Status" field contained an expanded RCS keyword, which is
    normally (but optionally) cleaned up by the transform. The sole
    contents of the field body must be a paragraph containing an
    expanded RCS keyword of the form "$keyword: expansion text $". Any
    RCS keyword can be processed in any bibliographic field. The
    dollar signs and leading RCS keyword name are removed. Extra
    processing is done for the following RCS keywords:

    - "RCSfile" expands to the name of the file in the RCS or CVS
      repository, which is the name of the source file with a ",v"
      suffix appended. The transform will remove the ",v" suffix.

    - "Date" expands to the format "YYYY/MM/DD hh:mm:ss" (in the UTC
      time zone). The RCS Keywords transform will extract just the
      date itself and transform it to an ISO 8601 format date, as in
      "2000-12-31".

      (Since the source file for this text is itself stored under CVS,
      we can't show an example of the "Date" RCS keyword because we
      can't prevent any RCS keywords used in this explanation from
      being expanded. Only the "RCSfile" keyword is stable; its
      expansion text changes only if the file name changes.)

    .. _reStructuredText: https://docutils.sourceforge.io/rst.html
    .. _reStructuredText Markup Specification:
       https://docutils.sourceforge.io/docs/ref/rst/restructuredtext.html
 */
export class DocInfo extends Transform {

    /**
     * Canonical field name (lowcased) to node class name mapping for
     * bibliographic fields (field_list).
     */
    private biblioNodes: Record<string, any> = {
        author: nodes.author,
        authors: nodes.authors,
        organization: nodes.organization,
        address: nodes.address,
        contact: nodes.contact,
        version: nodes.version,
        revision: nodes.revision,
        status: nodes.status,
        date: nodes.date,
        copyright: nodes.copyright,
        dedication: nodes.topic,
        abstract: nodes.topic,
    };

    private rcsKeywordSubstitutions: [RegExp, string][] = [
        [new RegExp('\\$' + 'Date: ' +  // NoQA: ISC001
            '(\\d\\d\\d\\d)[-/](\\d\\d)[-/](\\d\\d)[ T][\\d:]+'
            + '[^$]* \\$', 'i'), '$1-$2-$3'],
        [new RegExp('\\$' + 'RCSfile: (.+),v \\$', 'i'), '$1'],
        [new RegExp('\\$[a-zA-Z]+: (.+) \\$'), '$1'],
    ];

    public apply(): void {

        if (!('docinfoXform' in this.document.settings)) {
            this.document.settings.docinfoXform = true;
        } else if (!this.document.settings.docinfoXform) {
            return;
        }
        const document = this.document;
        const index = document.firstChildNotMatchingClass(
            nodes.PreBibliographic);
        if (index == null) {
            return;
        }
        const candidate = document.getChild(index);
        if (candidate instanceof nodes.field_list) {
            const biblioindex = document.firstChildNotMatchingClass(
                (nodes.Titular, nodes.decoration, nodes.meta))!;
            const nodelist = this.extractBibliographic(candidate);
            document.removeChild(index); // untransformed field list (candidate)
            document.replaceAt(biblioindex, nodelist);
        }

    }

    public extractBibliographic(fieldList: nodes.field_list): NodeInterface[] {
        const docinfo = new nodes.docinfo();
        const bibliofields = this.language!.bibliographic_fields;
        const labels = this.language!.labels;
        const topics: Record<string, NodeInterface> = {
            // dedication: undefined,
            // abstract: undefined,
        };

        for (const field of fieldList.getChildren()) {
            let normedname: string = '';
            try {
                const name = field.getChild(0).getChild(0).astext();
                normedname = fullyNormalizeName(name);
                if (!(field.getNumChildren() === 2 && normedname in bibliofields
                    && this.checkEmptyBiblioField(field, name))) {
                    throw new Error('TransformError');
                }
                const canonical = bibliofields[normedname];
                const biblioclass = this.biblioNodes[canonical];


                if (biblioclass.prototype instanceof nodes.TextElement) {
                    if (!this.checkCompoundBiblioField(field, name)) {
                        throw new Error('TransformError');
                    }
                    utils.cleanRcsKeywords(
                        field.getChild(1).getChild(0) as nodes.paragraph, this.rcsKeywordSubstitutions);
                    docinfo.append(new biblioclass('', '', field.getChild(1).getChild(0).getChildren()));
                } else if (biblioclass.prototype instanceof nodes.authors) {
                    this.extractAuthors(field, name, docinfo);
                } else if (biblioclass.prototype instanceof nodes.topic) {
                    if (topics[canonical]) {

                        field.getChild(field.getNumChildren() - 1).append(
                            this.document.reporter.warning(
                                `There can only be one "${name}" field.`, undefined, { base_node: field }
                            )
                        );

                        throw new Error('TransformError');

                    }
                    const title = new nodes.title(name, labels[canonical]);
                    title.getChild(0).rawsource = labels[canonical];
                    topics[canonical] = new biblioclass('', title, field.getChild(1).getChildren(), { classes: [canonical] });
                } else {
                    docinfo.append(new biblioclass('', undefined, field.getChild(1).getChildren()));
                }
            } catch (e) {
                if (field.getChild(field.getNumChildren() - 1).getNumChildren() === 1
                    && field.getChild(field.getNumChildren() - 1).getChild(0) instanceof nodes.paragraph) {
                    utils.cleanRcsKeywords(
                        field.getChild(field.getNumChildren() - 1).getChild(0) as nodes.paragraph, this.rcsKeywordSubstitutions);
                }
                // if normedname not in bibliofields:
                const classvalue = nodes.makeId(normedname);
                if (classvalue) {
                    field.attributes['classes'] = [...(field.attributes['classes'] ?? []), classvalue];
                }
                docinfo.append(field);
            }
        }
        const nodelist: NodeInterface[] = [];
        if (docinfo.hasChildren()) {
            nodelist.push(docinfo);
        }
        if (topics['dedication']) {
            nodelist.push(topics['dedication']);
        }
        if (topics['abstract']) {
            nodelist.push(topics['abstract']);
        }
        return nodelist;
    }


    public checkEmptyBiblioField(field: NodeInterface, name: string): boolean {
        if (field.getChild(field.getNumChildren() - 1).getNumChildren() < 1) {
            field.getChild(field.getNumChildren() - 1).append(
                this.document.reporter.warning(
                    `Cannot extract empty bibliographic field "${name}".`, undefined, { base_node: field }
                )
            );
            return false;
        }
        return true;
    }
    // Original Python 
    /*
        def check_empty_biblio_field(self, field, name) -> bool:
            if len(field[-1]) < 1:
                field[-1] += self.document.reporter.warning(
                    f'Cannot extract empty bibliographic field "{name}".',
                    base_node=field)
                return False
            return True
    */

    public checkCompoundBiblioField(field: NodeInterface, name: string): boolean {
        // Check that the `field` body contains a single paragraph
        // (i.e. it must *not* be a compound element).
        const f_body = field.getChild(field.getNumChildren() - 1);
        if (f_body.getNumChildren() === 1 && f_body.getChild(0) instanceof nodes.paragraph) {
            return true;
        }
        // Restore single author name with initial (E. Xampl) parsed as
        // enumerated list
        // https://docutils.sourceforge.io/docs/ref/rst/restructuredtext.html#enumerated-lists
        if (f_body.getChild(0) instanceof nodes.enumerated_list
            && !f_body.getChild(0).rawsource.trim().includes('\n')) {
            // parse into a dummy document and use created nodes
            const logger = new NoOpLogger();
            const _document = newDocument({ sourcePath: '*DocInfo transform*', logger: logger }, field.document!.settings);
            const parser = new Parser({ logger: logger });
            parser.parse('\\' + f_body.rawsource, _document);
            if (_document.getNumChildren() === 1 && _document.getChild(0) instanceof nodes.paragraph) {
                f_body.children = _document.getChild(0).getChildren();
                return true;
            }
        }
        // Check failed, add a warning
        const content = f_body.children
            .filter(e => !(e instanceof nodes.system_message))
            .map(e => `<${e.tagname}>`);
        f_body.append(
            this.document.reporter.warning(
                `Bibliographic field "${name}"\nmust contain ` +
                `a single <paragraph>, not ${content.length > 1 ? '[' + content.join(', ') + ']' : 'a ' + content[0]}.`,
                undefined, { base_node: field }
            )
        );
        return false;
    }

    // Original Python
    /*
        def check_compound_biblio_field(self, field, name) -> bool:
            # Check that the `field` body contains a single paragraph
            # (i.e. it must *not* be a compound element).
            f_body = field[-1]
            if len(f_body) == 1 and isinstance(f_body[0], nodes.paragraph):
                return True
            # Restore single author name with initial (E. Xampl) parsed as
            # enumerated list
            # https://docutils.sourceforge.io/docs/ref/rst/restructuredtext.html#enumerated-lists
            if (isinstance(f_body[0], nodes.enumerated_list)
                and '\n' not in f_body.rawsource.strip()):
                # parse into a dummy document and use created nodes
                _document = utils.new_document('*DocInfo transform*',
                                            field.document.settings)
                parser = parsers.rst.Parser()
                parser.parse('\\'+f_body.rawsource, _document)
                if (len(_document.children) == 1
                    and isinstance(_document.children[0], nodes.paragraph)):
                    f_body.children = _document.children
                    return True
            # Check failed, add a warning
            content = [f'<{e.tagname}>' for e in f_body.children
                    if not isinstance(e, nodes.system_message)]
            if len(content) > 1:
                content = '[' + ', '.join(content) + ']'
            else:
                content = 'a ' + content[0]
            f_body += self.document.reporter.warning(
                        f'Bibliographic field "{name}"\nmust contain '
                        f'a single <paragraph>, not {content}.',
                        base_node=field)
            return False
    */

    public extractAuthors(field: NodeInterface, name: string, docinfo: NodeInterface): void {
        try {
            // Check class with isInstance and hasClassType methods!

        } catch (error) {


        }
    }

    // Original Python
    /*
    def extract_authors(self, field, name, docinfo):
        try:
            if len(field[1]) == 1:
                if isinstance(field[1][0], nodes.paragraph):
                    authors = self.authors_from_one_paragraph(field)
                elif isinstance(field[1][0], nodes.bullet_list):
                    authors = self.authors_from_bullet_list(field)
                else:
                    raise TransformError
            else:
                authors = self.authors_from_paragraphs(field)
            authornodes = [nodes.author('', '', *author)
                           for author in authors if author]
            if len(authornodes) >= 1:
                docinfo.append(nodes.authors('', *authornodes))
            else:
                raise TransformError
        except TransformError:
            field[-1] += self.document.reporter.warning(
                f'Cannot extract "{name}" from bibliographic field:\n'
                f'Bibliographic field "{name}" must contain either\n'
                ' a single paragraph (with author names separated by a'
                ' character from the set '
                f'"{"".join(self.language.author_separators)}"),\n'
                ' multiple paragraphs (one per author),\n'
                ' or a bullet list with one author name per item.\n'
                'Note: Leading initials can cause (mis)recognizing names '
                'as enumerated list.',
                base_node=field)
            raise
    */

    public authorsFromOneParagraph(field: NodeInterface): nodes.Text[][] { // TODO : type those parameters!
        // Check class with isInstance and hasClassType methods!
        return [];

    }
    // Original Python
    /*
    def authors_from_one_paragraph(self, field):
        """Return list of Text nodes with author names in `field`.

        Author names must be separated by one of the "autor separators"
        defined for the document language (default: ";" or ",").
        """
        # @@ keep original formatting? (e.g. ``:authors: A. Test, *et-al*``)
        text = ''.join(str(node)
                       for node in field[1].findall(nodes.Text))
        if not text:
            raise TransformError
        for authorsep in self.language.author_separators:
            # don't split at escaped `authorsep`:
            pattern = '(?<!\x00)%s' % authorsep
            authornames = re.split(pattern, text)
            if len(authornames) > 1:
                break
        authornames = (name.strip() for name in authornames)
        return [[nodes.Text(name)] for name in authornames if name]
    */

    public authorsFromBulletList(field: NodeInterface): nodes.Text[][] { // TODO : type those parameters!
        // Check class with isInstance and hasClassType methods!
        return [];

    }
    // Original Python
    /*
    def authors_from_bullet_list(self, field):
        authors = []
        for item in field[1][0]:
            if isinstance(item, nodes.comment):
                continue
            if len(item) != 1 or not isinstance(item[0], nodes.paragraph):
                raise TransformError
            authors.append(item[0].children)
        if not authors:
            raise TransformError
        return authors
    */

    public authorsFromParagraphs(field: NodeInterface): nodes.Text[][] { // TODO : type those parameters!
        // Check class with isInstance and hasClassType methods!
        return [];

    }
    // Original Python
    /*
    def authors_from_paragraphs(self, field):
        for item in field[1]:
            if not isinstance(item, (nodes.paragraph, nodes.comment)): 
                raise TransformError
        authors = [item.children for item in field[1]
                   if not isinstance(item, nodes.comment)]
        return authors

    */
}

DocInfo.defaultPriority = 340;

export { TitlePromoter };
