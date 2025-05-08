import { nodes, parsers } from "./index.js";
import { Component } from "./components.js";
import { Input } from "./io.js";
import { Parser } from "./parser.js";
import { document } from "./nodes.js";
import { Transform } from "./transforms/index.js";
import * as universal from "./transforms/universal.js";

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
