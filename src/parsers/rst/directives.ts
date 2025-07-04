import * as _fallbackLanguageModule from "./languages/en.js";
import * as images from "./directives/images.js";
//import * as parts from "./directives/parts";
import { ApplicationError } from "../../exceptions.js";
import { Document, NodeInterface } from "../../types.js";
import { DirectiveConstructor, RSTLanguage } from "./types.js";

const dirMap: any = {
    images
    //  , parts 
};

const directiveRegistry = {
    attention: ['admonitions', 'Attention'],
    caution: ['admonitions', 'Caution'],
    code: ['body', 'CodeBlock'],
    danger: ['admonitions', 'Danger'],
    error: ['admonitions', 'Error'],
    important: ['admonitions', 'Important'],
    note: ['admonitions', 'Note'],
    tip: ['admonitions', 'Tip'],
    hint: ['admonitions', 'Hint'],
    warning: ['admonitions', 'Warning'],
    admonition: ['admonitions', 'Admonition'],
    sidebar: ['body', 'Sidebar'],
    topic: ['body', 'Topic'],
    'line-block': ['body', 'LineBlock'],
    'parsed-literal': ['body', 'ParsedLiteral'],
    math: ['body', 'MathBlock'],
    rubric: ['body', 'Rubric'],
    epigraph: ['body', 'Epigraph'],
    highlights: ['body', 'Highlights'],
    'pull-quote': ['body', 'PullQuote'],
    compound: ['body', 'Compound'],
    container: ['body', 'Container'],
    // 'questions': ['body', 'question_list'],
    table: ['tables', 'RSTTable'],
    'csv-table': ['tables', 'CSVTable'],
    'list-table': ['tables', 'ListTable'],
    image: ['images', 'Image'],
    figure: ['images', 'Figure'],
    contents: ['parts', 'Contents'],
    sectnum: ['parts', 'Sectnum'],
    header: ['parts', 'Header'],
    footer: ['parts', 'Footer'],
    // 'footnotes': ['parts', 'footnotes'],
    // 'citations': ['parts', 'citations'],
    'target-notes': ['references', 'TargetNotes'],
    meta: ['html', 'Meta'],
    // 'imagemap': ['html', 'imagemap'],
    raw: ['misc', 'Raw'],
    include: ['misc', 'Include'],
    replace: ['misc', 'Replace'],
    unicode: ['misc', 'Unicode'],
    class: ['misc', 'Class'],
    role: ['misc', 'Role'],
    'default-role': ['misc', 'DefaultRole'],
    title: ['misc', 'Title'],
    date: ['misc', 'Date'],
    'restructuredtext-test-directive': ['misc', 'TestDirective'],
};

const _directives: any = {};

export function directive(directiveName: string, document: Document, languageModule?: RSTLanguage): [DirectiveConstructor | null, NodeInterface[]] {
    const normName = directiveName.toLowerCase();
    const messages: NodeInterface[] = [];
    const msgText: string[] = [];

    if (normName in _directives) {
        return [_directives[normName], messages];
    }

    let canonicalName;
    canonicalName = languageModule && languageModule.directives[normName];

    if (!canonicalName) {
        canonicalName = _fallbackLanguageModule.directives[normName as keyof typeof _fallbackLanguageModule.directives];
        if (canonicalName) {
            msgText.push(`Using English fallback for directive "${directiveName}"`);
        } else {
            msgText.push(`Trying "${directiveName}" as canonical directive name`);
            canonicalName = normName;
        }
    }

    if (msgText.length) {
        const message = document.reporter.info(msgText.join('\n'), [], { line: document.currentLine });
        messages.push(message);
    }

    if (!Object.prototype.hasOwnProperty.call(directiveRegistry, canonicalName)) {
        return [null, messages]; // Use null instead of undefined for consistency with Python's None
    }

    // @ts-ignore
    const [modulename, classname] = directiveRegistry[canonicalName];
    const DirectiveClass: DirectiveConstructor = dirMap[modulename] ? dirMap[modulename][classname] : null;

    if (!DirectiveClass) {
        messages.push(document.reporter.error(
            `No directive class "${classname}" in module "${modulename}" (directive "${directiveName}").`,
            [], { line: document.currentLine }
        ));
        return [null, messages];
    }

    _directives[normName] = DirectiveClass;
    return [DirectiveClass, messages];
}

// Original in python:

/*

def directive(directive_name, language_module, document):
    """
    Locate and return a directive function from its language-dependent name.
    If not found in the current language, check English.  Return None if the
    named directive cannot be found.
    """
    normname = directive_name.lower()
    messages = []
    msg_text = []
    if normname in _directives:
        return _directives[normname], messages
    canonicalname = None
    try:
        canonicalname = language_module.directives[normname]
    except AttributeError as error:
        msg_text.append('Problem retrieving directive entry from language '
                        'module %r: %s.' % (language_module, error))
    except KeyError:
        msg_text.append('No directive entry for "%s" in module "%s".'
                        % (directive_name, language_module.__name__))
    if not canonicalname:
        try:
            canonicalname = _fallback_language_module.directives[normname]
            msg_text.append('Using English fallback for directive "%s".'
                            % directive_name)
        except KeyError:
            msg_text.append('Trying "%s" as canonical directive name.'
                            % directive_name)
            # The canonical name should be an English name, but just in case:
            canonicalname = normname
    if msg_text:
        message = document.reporter.info(
            '\n'.join(msg_text), line=document.current_line)
        messages.append(message)
    try:
        modulename, classname = _directive_registry[canonicalname]
    except KeyError:
        # Error handling done by caller.
        return None, messages
    try:
        module = import_module('docutils.parsers.rst.directives.'+modulename)
    except ImportError as detail:
        messages.append(document.reporter.error(
            'Error importing directive module "%s" (directive "%s"):\n%s'
            % (modulename, directive_name, detail),
            line=document.current_line))
        return None, messages
    try:
        directive = getattr(module, classname)
        _directives[normname] = directive
    except AttributeError:
        messages.append(document.reporter.error(
            'No directive class "%s" in module "%s" (directive "%s").'
            % (classname, modulename, directive_name),
            line=document.current_line))
        return None, messages
    return directive, messages


*/