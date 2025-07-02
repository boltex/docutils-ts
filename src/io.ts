import Input from './io/input.js';
import Output from './io/output.js';
import { InputConstructorArgs, OutputConstructorArgs } from "./types.js";
import { normalizeLineEndings } from './utils/unescape.js';

/**
 * Direct string input. 
*/
export class StringInput extends Input {
    public constructor(args: InputConstructorArgs) {
        super(args);
        this.sourcePath = '<string>';
    }

    public read(): Promise<string> {
        return Promise.resolve(normalizeLineEndings(this.source));
    }
    public readlines(): Promise<string[]> {
        if (typeof this.source === 'string') {
            return Promise.resolve(this.source.split('\n'));
        } else if (Array.isArray(this.source)) {
            return Promise.resolve(this.source);
        } else {
            return Promise.reject(new Error('StringInput: source is not a string or array'));
        }
    }
}

export class StringOutput extends Output<string> {
    public constructor(
        args: OutputConstructorArgs<string>
    ) {
        super(args);
        this.defaultDestinationPath = '<string>';
    }

    public async write(data: string): Promise<string> {
        // self.destination = self.encode(data) // fixme encoding
        if (Array.isArray(data)) {
            data = JSON.stringify(data);
        }
        this.destination = data;
        return this.destination;
    }
}
