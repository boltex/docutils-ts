import { TransformSpec } from ".";
import * as nodes from "./nodes";

export interface InputOptions {
    source?: any,
    source_path?: string,
    encoding?: string,
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
        this.source_path = options.source_path;

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

export class Output extends TransformSpec {
    constructor() {
        super();

    }
}

export class FileInput extends Input {
    constructor(options: InputOptions) {
        super(options);
    }
}

export class FileOutput extends Output {
    constructor() {
        super();
    }
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

export class StringOutput extends Output {
    constructor() {
        super();
    }
}

/**
 * Degenerate output: write nothing.
 */
export class NullOutput extends Output {
    constructor() {
        super();
    }

    destination: undefined;

    readonly default_destination_path = 'null output'

    /**
     * Do nothing, return None.
     */
    public write(data: string | Buffer): void {
        // pass
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
    source: nodes.document;

    readonly default_source_path = 'doctree input';

    /**
     * Return the document tree.
     */
    public read(): nodes.document {
        return this.source;
    }

}