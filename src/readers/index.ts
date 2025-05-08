import { StandaloneReader } from './standalone.js';
import { Reader } from "../reader.js";

// Type alias for the Reader constructor
type ReaderClass = typeof Reader;

// Registry mapping lowercase names to Reader class constructors
const available_readers: Map<string, ReaderClass> = new Map([
    ['standalone', StandaloneReader],
    // ... add entries for all other imported readers ...
]);

export function get_reader_class(reader_name: string): ReaderClass {
    const name = reader_name.toLowerCase();
    const reader_class = available_readers.get(name);

    if (!reader_class) {
        throw new Error(`Reader "${reader_name}" not found. Available: [${Array.from(available_readers.keys()).join(', ')}]`);
    }

    return reader_class;
}