import TransformSpec from '../transformSpec.js';
import { LoggerType, OutputConstructorArgs } from '../types.js';

abstract class Output<T> extends TransformSpec {
    public componentType: string = 'output';
    public supported: string[] = [];
    protected defaultDestinationPath?: string;
    public destinationPath?: string;
    public encoding?: string;
    public destination?: T;
    private errorHandler: string;

    public constructor(args: OutputConstructorArgs<T>) {
        super({ logger: args.logger });
        if (args.encoding !== undefined) {
            this.encoding = args.encoding;
        }
        this.errorHandler = args.errorHandler || 'strict';
        this.destination = args.destination;
        this.destinationPath = args.destinationPath;
        if (!args.destinationPath) {
            this.destinationPath = this.defaultDestinationPath;
        }
    }

    public abstract write(data: string): Promise<any>;

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
