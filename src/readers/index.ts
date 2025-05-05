import { Component, utils, parsers, nodes } from "../index.js";
import { Input } from "../io.js";
import { document } from "../nodes.js";
import { Parser } from "../parsers/index.js";
import { Transform } from "../transforms/index.js";
import * as universal from "../transforms/universal.js";

import { Reader as StandaloneReader } from './standalone.js';
import { Reader as PepReader } from './pep.js';
import { Reader as DocTreeReader } from './doctree.js';

export class Reader extends Component {

    parser: Parser | null;
    /** A `parsers.Parser` instance shared by all doctrees. May be left
     * unspecified if the document source determines the parser. */

    source: Input | null = null;
    /** `docutils.io` IO object, source of input data. */

    input: string | null = null; // Assuming input is always a single string for simplicity
    /** Raw text input; either a single string or, for more complex cases,
     * a collection of strings. */ // Note: TS version simplifies this to string | null

    settings: any | null = null; // TODO : should be a Settings object
    document: nodes.document | null = null; // Added based on usage in parse() and read()

    constructor(parser: Parser | string, parser_name?: string) {
        super();

        this.component_type = 'reader';
        this.config_section = 'readers';

        this.parser = null; // Initialize parser to null

        if (typeof parser === 'string') {
            this.set_parser(parser);
        } else if (parser instanceof Parser) { // Check if it's an actual Parser instance
            this.parser = parser;
        }

        if (parser_name != null) {
            console.warn('Argument "parser_name" will be removed '
                + 'in Docutils 2.0.\n'
                + '  Specify parser name in the "parser" argument.',
            );
            if (this.parser === null) {
                this.set_parser(parser_name);
            }
        }
    }

    get_transforms(): Array<typeof Transform> {
        return super.get_transforms().concat([
            universal.Decorations,
            universal.ExposeInternals,
            universal.StripComments
        ]);
    }

    set_parser(parser_name: string): void {
        /** Set `this.parser` by name. */
        const parser_class = parsers.get_parser_class(parser_name); // Assumes get_parser_class returns a constructor
        this.parser = new parser_class();
    }


    protected get_component_transforms(): Array<typeof Transform> {
        return super.get_transforms();
    }

    public read(source: Input, parser: Parser, settings: any): document {
        // TODO: Implement the read method to parse the source and return a document object
        return new document(); // Placeholder
    }

}

/**
 * A reader which rereads an existing document tree (e.g. a deserializer).
 *
 * Often used in conjunction with `writers.UnfilteredWriter`.
 */
export class ReReader extends Reader {

    override get_transforms(): Array<typeof Transform> {
        return this.get_component_transforms();
    }

}


// Type alias for the Reader constructor
type ReaderClass = typeof Reader;

// Registry mapping lowercase names to Reader class constructors
const available_readers: Map<string, ReaderClass> = new Map([
    ['standalone', StandaloneReader],
    ['pep', PepReader],
    ['doctree', DocTreeReader]
    // ... add entries for all other imported readers ...
]);

/**
 * Return the Reader class from the pre-registered readers.
 *
 * @param reader_name The name of the reader (e.g., "standalone").
 * @returns The Reader class constructor.
 * @throws Error if the reader name is not found in the registry.
 */
export function get_reader_class(reader_name: string): ReaderClass {
    const name = reader_name.toLowerCase();
    const reader_class = available_readers.get(name);

    if (!reader_class) {
        throw new Error(`Reader "${reader_name}" not found. Available: [${Array.from(available_readers.keys()).join(', ')}]`);
    }

    return reader_class;
}