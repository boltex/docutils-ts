import Output from './output.js';
import { fileSystem } from '../core.js'

export default class FileOutput extends Output<any> {

    public async write(data: string): Promise<string> {
        if (this.destinationPath) {

            await fileSystem.writeFile(this.destinationPath, data, { encoding: 'utf-8' });

        } else {
            process.stdout.write(data);
        }
        return data;
        /*
        if(!this.opened) {
            this.open();
        }
        //const d = this.encode(data);
        try {
        if(this.destination.writable) {
        this.logger.debug(`writing data to ${this.destinationPath!}`, { value: data });
                this.destination.write(data.toString());
        } else {
        this.logger.error('stream unwritable');
        }
            //	    const contents = fs.readFileSync(this.destinationPath!, { encoding: 'utf-8'});
            //	    this.logger.silly('contents', { value: contents });
        } catch(error) {
        this.logger.error(`error ${error.message}`);
            throw error;
        }
        */
    }
}
