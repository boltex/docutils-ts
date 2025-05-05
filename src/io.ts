import { TransformSpec } from "./__init__.js";
import * as nodes from "./nodes.js";

export interface InputOptions {
    source?: any,
    source_path?: string,
    encoding?: string,
    error_handler?: string | null
}

export interface OutputOptions {
    destination?: any,
    destination_path?: string,
    encoding?: string | null,
    error_handler?: string | null
}

export class Input extends TransformSpec {
    // Class variables (static properties)
    static readonly component_type: string = 'input';
    static readonly default_source_path: string | null = null;

    // Instance properties
    encoding: string | 'unicode' | null;
    error_handler: string | null;
    source: any;  // Using any as it can be multiple types
    source_path: string | null;
    successful_encoding: string | null;

    // Regular expression for encoding detection
    static readonly coding_slug: RegExp = /coding[:=]\s*([-\w.]+)/;

    // Sequence of (start_bytes, encoding) tuples for encoding detection
    static readonly byte_order_marks: Array<[Uint8Array, string]> = [
        // These would need to be initialized with the equivalent of Python's BOM constants
        // You'll need a utility to create the Uint8Arrays with the right bytes
        // For now, placeholder values:
        [new Uint8Array([0xFF, 0xFE, 0x00, 0x00]), 'utf-32'],
        [new Uint8Array([0x00, 0x00, 0xFE, 0xFF]), 'utf-32'],
        [new Uint8Array([0xEF, 0xBB, 0xBF]), 'utf-8-sig'],
        [new Uint8Array([0xFE, 0xFF]), 'utf-16'],
        [new Uint8Array([0xFF, 0xFE]), 'utf-16'],
    ];

    /**
      * Constructor for Input class
      */
    constructor(
        options: InputOptions
    ) {
        super();

        /**
         * Text encoding for the input source.
         */
        this.encoding = options.encoding || 'utf-8';

        /**
         * Text decoding error handler.
         */
        this.error_handler = options.error_handler || 'strict';

        /**
         * The source of input data.
         */
        this.source = options.source;

        /**
         * A text reference to the source.
         */
        this.source_path = options.source_path || null;

        if (!options.source_path) {
            this.source_path = Input.default_source_path;
        }

        /**
         * The encoding that successfully decoded the source data.
         */
        this.successful_encoding = null;
    }

    /**
     * String representation of the instance
     */
    toString(): string {
        return `${this.constructor.name}: source=${this.source}, source_path=${this.source_path}`;
    }

    /**
     * Return input as `string`. Define in subclasses.
     */
    read(): string | any {
        throw new Error('NotImplementedError: Subclasses must implement read()');
    }

    /**
     * Decode `data` if required.
     * 
     * Return string instances unchanged (nothing to decode).
     * 
     * If `this.encoding` is null, determine encoding from data
     * or try UTF-8 and the locale's preferred encoding.
     * 
     * Provisional: encoding detection will be removed in Docutils 1.0.
     */
    decode(data: string | Uint8Array): string {
        if (this.encoding && this.encoding.toLowerCase() === 'unicode') {
            if (typeof data !== 'string') {
                throw new Error('input encoding is "unicode" but `data` is not a string instance');
            }
        }

        if (typeof data === 'string') {
            // nothing to decode
            return data;
        }

        let encoding_candidates: string[] = [];

        if (this.encoding) {
            // We believe the user/application when the encoding is explicitly given
            encoding_candidates = [this.encoding];
        } else {
            // Warning suppression in TS would be handled differently
            const data_encoding = this.determine_encoding_from_data(data);

            if (data_encoding) {
                // `data` declares its encoding with "magic comment" or BOM
                encoding_candidates = [data_encoding];
            } else {
                // Apply heuristics if the encoding is not specified
                // Start with UTF-8, because that only matches data that *IS* UTF-8
                encoding_candidates = ['utf-8'];

                // Get locale encoding (implementation would depend on your environment)
                const fallback = this.get_preferred_encoding();

                if (fallback && fallback.toLowerCase() !== 'utf-8') {
                    encoding_candidates.push(fallback);
                }
            }
        }

        if (!this.encoding && encoding_candidates[0] !== 'utf-8') {
            console.warn('Input encoding auto-detection will be removed and the encoding values null and "" become invalid in Docutils 1.0.');
        }

        let error: Error | null = null;

        for (const enc of encoding_candidates) {
            try {
                // In TypeScript, you'd use TextDecoder for decoding
                const decoder = new TextDecoder(enc, { fatal: this.error_handler === 'strict' });
                const decoded = decoder.decode(data);
                this.successful_encoding = enc;
                return decoded;
            } catch (err) {
                // Keep the error for use outside the loop
                error = err instanceof Error ? err : new Error(String(err));
            }
        }

        throw new Error(
            `Unable to decode input data. Tried the following encodings: ${encoding_candidates.map(e => `'${e}'`).join(', ')}.\n(${error ? error.toString() : 'Unknown error'})`
        );
    }

    /**
     * Try to determine the encoding of `data` by looking *in* `data`.
     * Check for a byte order mark (BOM) or an encoding declaration.
     * 
     * Deprecated. Will be removed in Docutils 1.0.
     */
    determine_encoding_from_data(data: Uint8Array): string | null {
        console.warn('docutils.io.Input.determine_encoding_from_data() will be removed in Docutils 1.0.');

        // Check for a byte order mark
        for (const [start_bytes, encoding] of Input.byte_order_marks) {
            if (this.startsWith(data, start_bytes)) {
                return encoding;
            }
        }

        // Check for an encoding declaration pattern in first 2 lines of file
        const lines = this.splitLines(data, 2);
        for (const line of lines) {
            const match = Input.coding_slug.exec(this.bytesToString(line));
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * Return True, if the input source is connected to a TTY device.
     */
    isatty(): boolean {
        try {
            // @ts-ignore: TypeScript doesn't know about isatty
            return this.source && typeof this.source.isatty === 'function' && this.source.isatty();
        } catch (e) {
            return false;
        }
    }

    /**
     * Helper method to get preferred encoding based on locale
     * Implementation would depend on your environment
     */
    private get_preferred_encoding(): string | null {
        // This is a placeholder. In a real implementation, you'd need to
        // determine the locale's preferred encoding
        return 'utf-8';
    }

    /**
     * Helper method to check if a Uint8Array starts with another Uint8Array
     */
    private startsWith(data: Uint8Array, prefix: Uint8Array): boolean {
        if (data.length < prefix.length) {
            return false;
        }

        for (let i = 0; i < prefix.length; i++) {
            if (data[i] !== prefix[i]) {
                return false;
            }
        }

        return true;
    }

    /**
     * Helper method to split binary data into lines
     */
    private splitLines(data: Uint8Array, maxLines: number): Uint8Array[] {
        // Simple implementation - for a proper one you'd need to handle
        // different line endings
        const result: Uint8Array[] = [];
        let start = 0;

        for (let i = 0; i < data.length && result.length < maxLines; i++) {
            if (data[i] === 10) { // newline character
                result.push(data.slice(start, i));
                start = i + 1;
            }
        }

        if (start < data.length && result.length < maxLines) {
            result.push(data.slice(start));
        }

        return result;
    }

    /**
     * Helper method to convert bytes to string for regex matching
     */
    private bytesToString(bytes: Uint8Array): string {
        // Simple conversion - assumes ASCII for the coding declaration
        return new TextDecoder('ascii', { fatal: false }).decode(bytes);
    }

}

/**
 * Abstract base class for output wrappers.
 * 
 * Docutils output objects must provide a `write()` method that
 * expects and handles one argument (the output).
 * 
 * Inheriting `TransformSpec` allows output objects to add
 * "transforms" and "unknown_reference_resolvers" to the "Transformer".
 * (Optional for custom output objects since Docutils 0.19.)
 */
export class Output extends TransformSpec {
    // Class properties
    static readonly component_type: string = 'output';
    static readonly default_destination_path: string | null = null;

    // Instance properties
    encoding: string | null;
    error_handler: string;
    destination: any;  // Using any as it can be multiple types
    destination_path: string | null;

    /**
     * Constructor for Output class
     */
    constructor(options: OutputOptions) {
        super();

        /**
         * Text encoding for the output destination.
         */
        this.encoding = options.encoding || null;

        /**
         * Text encoding error handler.
         */
        this.error_handler = options.error_handler || 'strict';

        /**
         * The destination for output data.
         */
        this.destination = options.destination;

        /**
         * A text reference to the destination.
         */
        this.destination_path = options.destination_path || null;

        if (!options.destination_path) {
            this.destination_path = Output.default_destination_path;
        }
    }

    /**
     * String representation of the instance
     */
    toString(): string {
        return `${this.constructor.name}: destination=${this.destination}, destination_path=${this.destination_path}`;
    }

    /**
     * Write `data`. Define in subclasses.
     */
    write(data: string | Uint8Array): string | Uint8Array | null {
        throw new Error('NotImplementedError: Subclasses must implement write()');
    }

    /**
     * Encode and return `data`.
     * 
     * If `data` is a `Uint8Array` instance, it is returned unchanged.
     * Otherwise it is encoded with `this.encoding`.
     * 
     * Provisional: If `this.encoding` is set to the pseudo encoding name
     * "unicode", `data` must be a `string` instance and is returned unchanged.
     */
    encode(data: string | Uint8Array): string | Uint8Array {
        if (this.encoding && this.encoding.toLowerCase() === 'unicode') {
            if (typeof data !== 'string') {
                throw new Error('output encoding is "unicode" but `data` is not a string instance');
            }
            return data;
        }

        if (typeof data !== 'string') {
            // Non-string (e.g. Uint8Array) output
            return data;
        } else {
            // In a browser environment we'd use TextEncoder
            // In Node.js we could use Buffer.from(data, this.encoding)
            // For a universal solution:
            return this.encodeString(data);
        }
    }

    /**
     * Helper method to encode a string to bytes using the specified encoding
     */
    private encodeString(data: string): Uint8Array {
        // If in a browser environment:
        if (typeof TextEncoder !== 'undefined') {
            // Note: TextEncoder only supports UTF-8 in most browsers
            // This is a simplification - real implementation would need to handle different encodings
            const encoder = new TextEncoder();
            return encoder.encode(data);
        }

        // If in Node.js environment (simplified):
        // const buffer = Buffer.from(data, this.encoding || 'utf-8');
        // return new Uint8Array(buffer);

        // Fallback implementation for example purposes
        // This is a very naive implementation that only works for ASCII
        // A real implementation would need to handle encodings properly
        const bytes = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            bytes[i] = data.charCodeAt(i) & 0xff;
        }
        return bytes;
    }
}

export class FileInput extends Input {

}

export class FileOutput extends Output {

}

/**
 * Input from a `string` or `Uint8Array` instance.
 */
export class StringInput extends Input {
    // Class properties
    static readonly default_source_path: string = '<string>';

    // Type declaration for source
    declare source: string | Uint8Array;

    /**
     * Return the source as `string` instance.
     * 
     * Decode, if required (see `Input.decode`).
     */
    read(): string {
        return this.decode(this.source);
    }
}

/**
 * Output to a `Uint8Array` or `string` instance.
 * 
 * Provisional.
 */
export class StringOutput extends Output {
    // Class properties
    static readonly default_destination_path: string = '<string>';

    // Type declaration for destination
    declare destination: string | Uint8Array;

    /**
     * Store `data` in `this.destination`, and return it.
     * 
     * If `this.encoding` is set to the pseudo encoding name "unicode",
     * `data` must be a `string` instance and is stored/returned unchanged
     * (cf. `Output.encode`).
     * 
     * Otherwise, `data` can be a `Uint8Array` or `string` instance and is
     * stored/returned as a `Uint8Array` instance
     * (`string` data is encoded with `this.encode()`).
     * 
     * Attention: the `output_encoding` setting may affect the content
     * of the output (e.g. an encoding declaration in HTML or XML or the
     * representation of characters as LaTeX macro vs. literal character).
     */
    write(data: string | Uint8Array): string | Uint8Array {
        this.destination = this.encode(data);
        return this.destination;
    }
}

/**
 * Degenerate output: write nothing.
 */
export class NullOutput extends Output {

    destination: undefined;

    readonly default_destination_path = 'null output'

    /**
     * Do nothing, return None.
     */
    public write(data: string | Uint8Array): null {
        return null;
    }


}
/**
 * Adapter for document tree input.
 *
 * The document tree must be passed in the ``source`` parameter.
 */
export class DocTreeInput extends Input {
    constructor(options: InputOptions) {
        super(options);
    }

    // Force the type to be nodes.document as the constructor of Input class sets it to any
    source!: nodes.document;

    readonly default_source_path = 'doctree input';

    /**
     * Return the document tree.
     */
    public read(): nodes.document {
        return this.source;
    }

}