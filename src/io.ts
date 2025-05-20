import Input from './io/input.js';
import Output from './io/output.js';
import { InputConstructorArgs, LoggerType } from "./types.js";

/**
 * Direct string input. 
*/
export class StringInput extends Input {
    public constructor(args: InputConstructorArgs) {
        super(args);
        this.sourcePath = '<string>';
    }

    public read(): Promise<any> {
        return Promise.resolve(this.source);
    }
}

export class StringOutput extends Output<string> {
    public constructor(
        logger: LoggerType,
        destination?: string,
        destinationPath?: string,
        encoding?: string,
        errorHandler?: string
    ) {
        super(logger, destination, destinationPath, encoding, errorHandler);
        this.defaultDestinationPath = '<string>';
    }

    public write(data: string): string {
        // self.destination = self.encode(data) // fixme encoding
        if (Array.isArray(data)) {
            data = JSON.stringify(data);
        }
        this.destination = data;
        return this.destination;
    }
}
