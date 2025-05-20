import Input from './input.js';
// import fs from 'fs'; // TODO : Add file support if not in browser 
import { InputConstructorArgs } from '../types.js';

export default class FileInput extends Input {
    public finished: boolean = false;
    public data: string = '';
    public constructor(args: InputConstructorArgs) {
        super(args);
        this.logger.debug(`creating read stream ${args.sourcePath!}`);
        // TODO : Add file support if not in browser 
        // this.source = fs.createReadStream(args.sourcePath!, { fd: args.sourcePath ? undefined : 0, encoding: 'utf-8' });
        // this.source.on('data', (chunk: string): void => {
        //     this.data += chunk;
        // });
        // this.source.on('end', (): void => {
        //     this.source.close();
        //     this.finished = true;
        // });
    }

    public read(): Promise<any> {
        const logger = this.logger;
        this.logger.silly('read');
        if (this.finished) {
            this.logger.silly('data already read,handing off to callback');
            return Promise.resolve(this.data);
        } else {
            // TODO : Add file support if not in browser 

            throw new Error('FileInput: read() not implemented');
            // this.logger.silly('data not read');
            // return new Promise((resolve, reject): void => {
            //     this.source.on('end', (): void => {
            //         try {
            //             logger.error('end of source');
            //             this.finished = true;
            //             this.source.close();
            //             logger.silly('handing off to cb');
            //         } catch (err) {
            //             reject(err);
            //         }
            //         resolve(this.data);
            //     });
            // });
        }
    }
}
