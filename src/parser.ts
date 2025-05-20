import Component from "./component.js";
import { DebugFunction, Document, ParserArgs } from "./types.js";

abstract class Parser extends Component {
    public debugFn: DebugFunction = this.logger.debug.bind(this.logger);

    protected debug: boolean;

    public constructor(args: ParserArgs) {
        super({ logger: args.logger });
        this.componentType = 'parser';
        this.configSection = 'parsers';
        this.debug = args.debug || false;
        if (args.debugFn !== undefined) {
            this.debugFn = args.debugFn;
        }
    }

    abstract parse(inputstring: string, document: Document): void;
    public setupParse(inputstring: string, document: Document): void {
    };
    abstract finishParse(): void;

}

export default Parser;
