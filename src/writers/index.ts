import { Writer } from "../writer.js";
import { HTMLBaseWriter } from './htmlBase.js';
import { POJOWriter } from './pojo.js';
import { XMLWriter } from './xml.js';


// Type alias for the Writer constructor
type WriterClass = typeof Writer;

// Registry mapping lowercase names to Writer class constructors
const available_writers: Map<string, WriterClass> = new Map([
    ['htmlbase', HTMLBaseWriter],
    ['pojo', POJOWriter],
    ['xml', XMLWriter],
    // ... add entries for all other imported writers ...
]);

export function get_writer_class(writer_name: string): WriterClass {
    const name = writer_name.toLowerCase();
    const writer_class = available_writers.get(name);

    if (!writer_class) {
        throw new Error(`Writer "${writer_name}" not found. Available: [${Array.from(available_writers.keys()).join(', ')}]`);
    }

    return writer_class;
}