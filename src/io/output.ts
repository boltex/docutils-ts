import TransformSpec from '../transformSpec.js';
import { LoggerType } from '../types.js';

abstract class Output<T> extends TransformSpec {
    public componentType: string = 'output';
    public supported: string[] = [];
    protected defaultDestinationPath?: string;
    public destinationPath?: string;
    public encoding?: string;
    public destination?: T;
    private errorHandler: string;

    public constructor(logger: LoggerType, destination?: T, destinationPath?: string, encoding?: string, errorHandler?: string) {
        super({ logger });
        if (encoding !== undefined) {
            this.encoding = encoding;
        }
        this.errorHandler = errorHandler || 'strict';
        this.destination = destination;
        this.destinationPath = destinationPath;
        if (!destinationPath) {
            this.destinationPath = this.defaultDestinationPath;
        }
    }

    public abstract write(data: string): string;

    public encode(data: string): string {
        return data; // fixme?
    }

    public toString(): string {
        return `Output<${this.constructor.name}>`;
    }
}

//Output.componentType = 'Output';
//Output.defaultDestinationPath = null;

export default Output;
