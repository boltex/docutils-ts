import TransformSpec from '../transformSpec.js';
import { InputConstructorArgs } from "../types.js";

abstract class Input extends TransformSpec {
    public componentType: string = "input";
    public supported: string[] = [];
    private successfulEncoding: string | undefined;
    private defaultSourcePath?: string;
    private encoding?: string;
    private errorHandler?: string;
    public sourcePath?: string;
    protected source?: any;
    public constructor(
        args: InputConstructorArgs) {
        super({ logger: args.logger });
        const { source, sourcePath, encoding, errorHandler } = args;
        this.encoding = encoding;
        this.errorHandler = errorHandler;
        this.source = source;
        this.sourcePath = sourcePath;
        if (!sourcePath) {
            this.sourcePath = this.defaultSourcePath;
        }
        this.successfulEncoding = undefined;
    }

    abstract read(): Promise<any>;

    public decode(data: string): string {
        return data;
    }

    public toString(): string {
        return `Input<${this.constructor.name}>`;
    }
}

export default Input;
