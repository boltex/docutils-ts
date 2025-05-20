import Component from "./component.js";
import { getLanguage } from "./languages/index.js";
import { Document, WriterParts } from "./types.js";
import Output from "./io/output.js";
import { InvalidStateError } from "./exceptions.js";
import Reporter from "./reporter.js";

const __version__ = '';

/**
 * Base class for all writers.
 */
export default abstract class Writer extends Component {
    public parts: WriterParts = {};
    public document?: Document;
    private language?: {};
    /**
     * Final translated form of `document` (Unicode string for text, binary
     * string for other forms); set by `translate`.
     */
    public output?: string | {};
    /**
     * `docutils.io` Output object; where to write the document.
     * Set by `write`.
     */
    private destination?: Output<string>;

    public write(document: Document, destination: Output<string> | undefined): string | {} | undefined {
        this.document = document;
        if (document !== undefined) {
            this.language = getLanguage(document.settings.languageCode, document.reporter as Reporter);
        }
        this.destination = destination;
        this.translate();
        let fn;
        if (this.destination) {
            if (typeof this.destination === 'function') {
                fn = this.destination;
            } else if (typeof this.destination.write === 'function') {
                fn = this.destination.write.bind(this.destination);
            }
        }
        if (fn !== undefined && this.output !== undefined) {
            return fn(this.output as string);
        } else {
            return this.output;
        }
    }

    public abstract translate(): void;

    public assembleParts(): void {
        if (this.document === undefined) {
            throw new InvalidStateError();
        }
        this.parts.whole = this.output as string; // TODO : fixme!
        this.parts.encoding = this.document.settings.outputEncoding;
        this.parts.version = __version__;
    }
}
