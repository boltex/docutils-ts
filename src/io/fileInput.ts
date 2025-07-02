import Input from './input.js';
import { fileSystem } from '../core.js'
import { InputConstructorArgs } from '../types.js';
import { normalizeLineEndings } from '../utils/unescape.js';

export default class FileInput extends Input {

    public data: string = '';

    public constructor(args: InputConstructorArgs) {
        super(args);
    }

    public async read(): Promise<string> {
        this.logger.silly('read');
        const data = await fileSystem.readFile(this.sourcePath!, { encoding: this.encoding || 'utf-8' });
        return normalizeLineEndings(data.toString());
    }

    public async readlines(): Promise<string[]> {
        this.logger.silly('readlines');
        const data = await this.read();
        if (typeof data === 'string') {
            return data.split('\n');
        } else if (Array.isArray(data)) {
            return data;
        } else {
            return Promise.reject(new Error('FileInput: source is not a string or array'));
        }
    }

}
