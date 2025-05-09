import { InvalidStateError } from "../exceptions";
import { OptionParser } from "../frontend";
import { document } from "../nodes.js";

// A simplistic Reporter that logs to console
export class Reporter {

    // TODO !

    public max_level: number;

    constructor() {
        this.max_level = -1;
    }

    info(message: string): void {
        console.log('[INFO]', message);
    }

    warning(message: string): void {
        console.warn('[WARNING]', message);
    }

    protected log(prefix: string, message: string): void {
        console.log(prefix, message);
    }
}

// Equivalent to the Python normalize_language_tag function
export function normalize_language_tag(tag: string): string[] {
    // Normalize the tag: lowercase and replace hyphens with underscores
    tag = tag.toLowerCase().replace(/-/g, '_');

    // Replace single character subtags (e.g., _x_) with valid BCP 47 interpretation
    tag = tag.replace(/_([a-zA-Z0-9])_/g, '_$1-');

    const subtags = tag.split('_');
    const base = subtags.shift()!;
    const combinations: string[] = [];

    // Generate all combinations of subtags from longest to shortest
    for (let i = subtags.length; i > 0; i--) {
        for (let j = 0; j <= subtags.length - i; j++) {
            const slice = subtags.slice(j, j + i);
            combinations.push([base, ...slice].join('-'));
        }
    }

    combinations.push(base);
    return combinations;
}

export function new_document(sourcePath: string, settings?: Settings): document {

    if (settings === undefined) {
        settings = new OptionParser(RSTParser.settingsSpec).get_default_values();
    }
    if (settings === undefined) {
        throw new InvalidStateError('settings should not be undefined');
    }
    const reporter = newReporter({ sourcePath }, settings);
    const attrs: { source?: string } = {};
    if (typeof sourcePath !== 'undefined') {
        attrs.source = sourcePath;
    }

    // eslint-disable-next-line new-cap
    const myDocument = new document(settings, reporter, '', [], attrs);
    myDocument.noteSource(sourcePath, -1);
    return myDocument;
}