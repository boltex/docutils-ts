import { Parser } from "../parser.js";
import { RestructuredtextParser } from "./restructuredtext.js";

// Type alias for the Parser constructor
type ParserClass = typeof Parser;

// Registry mapping lowercase names to Parser class constructors
const available_parsers: Map<string, ParserClass> = new Map([
    ['restructuredtext', RestructuredtextParser],
    // ... add entries for all other imported parsers ...
]);

export function get_parser_class(parser_name: string): ParserClass {
    const name = parser_name.toLowerCase();
    const parser_class = available_parsers.get(name);

    if (!parser_class) {
        throw new Error(`Parser "${parser_name}" not found. Available: [${Array.from(available_parsers.keys()).join(', ')}]`);
    }

    return parser_class;
}