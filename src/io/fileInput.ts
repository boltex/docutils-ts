import Input from './input.js';
import { fileSystem } from '../core.js'
import { InputConstructorArgs } from '../types.js';

export default class FileInput extends Input {

    public data: string = '';

    public constructor(args: InputConstructorArgs) {
        super(args);
    }

    public async read(): Promise<string> {

        const logger = this.logger;
        this.logger.silly('read');
        const data = await fileSystem.readFile(this.sourcePath!, { encoding: this.encoding || 'utf-8' });
        return data.toString();
        // if (this.finished) {
        //     this.logger.silly('data already read,handing off to callback');
        //     return Promise.resolve(this.data);
        // } else {
        //     // TODO : Add file support if not in browser 

        //     throw new Error('FileInput: read() not implemented');
        //     // this.logger.silly('data not read');
        //     // return new Promise((resolve, reject): void => {
        //     //     this.source.on('end', (): void => {
        //     //         try {
        //     //             logger.error('end of source');
        //     //             this.finished = true;
        //     //             this.source.close();
        //     //             logger.silly('handing off to cb');
        //     //         } catch (err) {
        //     //             reject(err);
        //     //         }
        //     //         resolve(this.data);
        //     //     });
        //     // });
        // }
    }

    public readlines(): Promise<string[]> {
        return Promise.resolve([]); // TODO : Add file support if not in browser

    }

}
