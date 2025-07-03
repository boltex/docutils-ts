import * as _fallbackLanguageModule from "./languages/en.js";
import * as images from "./directives/images.js";
//import * as parts from "./directives/parts";
import { ApplicationError } from "../../exceptions.js";
import { Document } from "../../types.js";
import { RSTLanguage } from "./types.js";

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

export function directive(directiveName: string, document: Document, languageModule?: RSTLanguage) {
    const normName = directiveName.toLowerCase();
    const messages: any[] = [];
    const msgText = [];
    if (normName in _directives) {
        return [_directives[normName], messages];
    }
    let canonicalName;
    canonicalName = languageModule && languageModule.directives[normName];
    if (!canonicalName) {
        canonicalName = _fallbackLanguageModule.directives[normName as keyof typeof _fallbackLanguageModule.directives];
        if (canonicalName) {
            msgText.push(`Using English fallback for directive ${directiveName}`);
        } else {
            msgText.push(`Trying "${directiveName}" as canonical directive name`);
            canonicalName = normName;
        }
    }
    if (msgText) {
        const message = document.reporter.info(msgText.join('\n'), [], { line: document.currentLine });
        messages.push(message);
    }
    if (!Object.prototype.hasOwnProperty.call(directiveRegistry, canonicalName)) {
        return [undefined, messages];
    }
    // @ts-ignore
    const [modulename, classname] = directiveRegistry[canonicalName];
    const DirectiveClass = dirMap[modulename] ? dirMap[modulename][classname] : undefined;
    _directives[normName] = DirectiveClass;
    return [DirectiveClass, messages];
}

