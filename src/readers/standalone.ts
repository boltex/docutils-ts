import { Reader } from "../reader.js";
import { document } from "../nodes.js";
import { Input } from "../io.js";
import { Parser } from "../parser.js";

export class StandaloneReader extends Reader {

    // Contexts this reader supports.
    static supported: string[] = ['standalone'];

}
