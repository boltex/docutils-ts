import { NodeInterface, Attributes } from "./types.js";
import * as nodes from "./nodes.js";

export default {

    math_block: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.math_block => new nodes.math_block(rawsource, text, children, attributes),

    comment: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.comment => new nodes.comment(rawsource, text, children, attributes),

    literal_block: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.literal_block => new nodes.literal_block(rawsource, text, children, attributes),

    raw: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.raw => new nodes.raw(rawsource, text, children, attributes),

    address: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.address => new nodes.address(rawsource, text, children, attributes),

    doctest_block: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.doctest_block => new nodes.doctest_block(rawsource, text, children, attributes),

    paragraph: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.paragraph => new nodes.paragraph(rawsource, text, children, attributes),

    acronym: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.acronym => new nodes.acronym(rawsource, text, children, attributes),

    revision: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.revision => new nodes.revision(rawsource, text, children, attributes),

    target: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.target => new nodes.target(rawsource, text, children, attributes),

    strong: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.strong => new nodes.strong(rawsource, text, children, attributes),

    organization: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.organization => new nodes.organization(rawsource, text, children, attributes),

    term: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.term => new nodes.term(rawsource, text, children, attributes),

    abbreviation: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.abbreviation => new nodes.abbreviation(rawsource, text, children, attributes),

    label: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.label => new nodes.label(rawsource, text, children, attributes),

    footnote_reference: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.footnote_reference => new nodes.footnote_reference(rawsource, text, children, attributes),

    title: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.title => new nodes.title(rawsource, text, children, attributes),

    contact: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.contact => new nodes.contact(rawsource, text, children, attributes),

    substitution_reference: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.substitution_reference => new nodes.substitution_reference(rawsource, text, children, attributes),

    copyright: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.copyright => new nodes.copyright(rawsource, text, children, attributes),

    rubric: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.rubric => new nodes.rubric(rawsource, text, children, attributes),

    citation_reference: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.citation_reference => new nodes.citation_reference(rawsource, text, children, attributes),

    subscript: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.subscript => new nodes.subscript(rawsource, text, children, attributes),

    attribution: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.attribution => new nodes.attribution(rawsource, text, children, attributes),

    classifier: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.classifier => new nodes.classifier(rawsource, text, children, attributes),

    generated: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.generated => new nodes.generated(rawsource, text, children, attributes),

    status: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.status => new nodes.status(rawsource, text, children, attributes),

    reference: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.reference => new nodes.reference(rawsource, text, children, attributes),

    date: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.date => new nodes.date(rawsource, text, children, attributes),

    line: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.line => new nodes.line(rawsource, text, children, attributes),

    option_argument: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.option_argument => new nodes.option_argument(rawsource, text, children, attributes),

    field_name: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.field_name => new nodes.field_name(rawsource, text, children, attributes),

    subtitle: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.subtitle => new nodes.subtitle(rawsource, text, children, attributes),

    emphasis: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.emphasis => new nodes.emphasis(rawsource, text, children, attributes),

    substitution_definition: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.substitution_definition => new nodes.substitution_definition(rawsource, text, children, attributes),

    math: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.math => new nodes.math(rawsource, text, children, attributes),

    problematic: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.problematic => new nodes.problematic(rawsource, text, children, attributes),

    version: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.version => new nodes.version(rawsource, text, children, attributes),

    title_reference: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.title_reference => new nodes.title_reference(rawsource, text, children, attributes),

    author: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.author => new nodes.author(rawsource, text, children, attributes),

    superscript: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.superscript => new nodes.superscript(rawsource, text, children, attributes),

    caption: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.caption => new nodes.caption(rawsource, text, children, attributes),

    option_string: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.option_string => new nodes.option_string(rawsource, text, children, attributes),

    literal: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.literal => new nodes.literal(rawsource, text, children, attributes),

    inline: (
        rawsource?: string,
        text?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.inline => new nodes.inline(rawsource, text, children, attributes),

    list_item: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.list_item => new nodes.list_item(rawsource, children, attributes),

    option_list_item: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.option_list_item => new nodes.option_list_item(rawsource, children, attributes),

    colspec: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.colspec => new nodes.colspec(rawsource, children, attributes),

    option_list: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.option_list => new nodes.option_list(rawsource, children, attributes),

    hint: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.hint => new nodes.hint(rawsource, children, attributes),

    tip: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.tip => new nodes.tip(rawsource, children, attributes),

    table: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.table => new nodes.table(rawsource, children, attributes),

    note: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.note => new nodes.note(rawsource, children, attributes),

    caution: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.caution => new nodes.caution(rawsource, children, attributes),

    admonition: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.admonition => new nodes.admonition(rawsource, children, attributes),

    figure: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.figure => new nodes.figure(rawsource, children, attributes),

    footnote: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.footnote => new nodes.footnote(rawsource, children, attributes),

    topic: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.topic => new nodes.topic(rawsource, children, attributes),

    bullet_list: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.bullet_list => new nodes.bullet_list(rawsource, children, attributes),

    compound: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.compound => new nodes.compound(rawsource, children, attributes),

    footer: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.footer => new nodes.footer(rawsource, children, attributes),

    tbody: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.tbody => new nodes.tbody(rawsource, children, attributes),

    thead: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.thead => new nodes.thead(rawsource, children, attributes),

    field_list: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.field_list => new nodes.field_list(rawsource, children, attributes),

    definition_list: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.definition_list => new nodes.definition_list(rawsource, children, attributes),

    definition_list_item: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.definition_list_item => new nodes.definition_list_item(rawsource, children, attributes),

    decoration: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.decoration => new nodes.decoration(rawsource, children, attributes),

    error: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.error => new nodes.error(rawsource, children, attributes),

    transition: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.transition => new nodes.transition(rawsource, children, attributes),

    image: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.image => new nodes.image(rawsource, children, attributes),

    field: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.field => new nodes.field(rawsource, children, attributes),

    block_quote: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.block_quote => new nodes.block_quote(rawsource, children, attributes),

    sidebar: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.sidebar => new nodes.sidebar(rawsource, children, attributes),

    description: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.description => new nodes.description(rawsource, children, attributes),

    entry: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.entry => new nodes.entry(rawsource, children, attributes),

    section: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.section => new nodes.section(rawsource, children, attributes),

    line_block: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.line_block => new nodes.line_block(rawsource, children, attributes),

    danger: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.danger => new nodes.danger(rawsource, children, attributes),

    header: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.header => new nodes.header(rawsource, children, attributes),

    important: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.important => new nodes.important(rawsource, children, attributes),

    option: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.option => new nodes.option(rawsource, children, attributes),

    warning: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.warning => new nodes.warning(rawsource, children, attributes),

    container: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.container => new nodes.container(rawsource, children, attributes),

    field_body: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.field_body => new nodes.field_body(rawsource, children, attributes),

    legend: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.legend => new nodes.legend(rawsource, children, attributes),

    definition: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.definition => new nodes.definition(rawsource, children, attributes),

    docinfo: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.docinfo => new nodes.docinfo(rawsource, children, attributes),

    enumerated_list: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.enumerated_list => new nodes.enumerated_list(rawsource, children, attributes),

    row: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.row => new nodes.row(rawsource, children, attributes),

    tgroup: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.tgroup => new nodes.tgroup(rawsource, children, attributes),

    option_group: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.option_group => new nodes.option_group(rawsource, children, attributes),

    authors: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.authors => new nodes.authors(rawsource, children, attributes),

    attention: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.attention => new nodes.attention(rawsource, children, attributes),

    citation: (
        rawsource?: string,
        children: NodeInterface[] = [],
        attributes: Attributes = {}
    ): nodes.citation => new nodes.citation(rawsource, children, attributes),

    Text: (data: string, rawsource?: string): nodes.Text => new nodes.Text(data, rawsource)
};