import Component from "./component.js";
import * as universal from "./transforms/universal.js";
import parsers from "./parsers/index.js";
import newDocument from "./newDocument.js";
import {
    DebugFunction,
    Document,
    ParserConsructor,
    TransformType,
    ReaderConstructorArgs,
    ParseFunction,
} from "./types.js";
import { Settings } from "./settings.js";
import Parser from "./parser.js";
import Input from "./io/input.js";
import { InvalidStateError } from "./exceptions.js";

interface HandleDocumentCallback {
    (error: Error | undefined | {}, document: Document | undefined): void;
}

export default class Reader extends Component {
    public componentType: string = 'reader';
    public document?: Document;
    protected parseFn?: ParseFunction;
    private settings?: Settings;
    protected source: Input | undefined;
    protected input: string | string[] = '';
    public parser?: Parser;
    private debug: boolean = false;
    private debugFn?: DebugFunction;
    public getTransforms(): TransformType[] {

        return [...super.getTransforms(), universal.Decorations as any]; // TODO : fixme !
        //               universal.ExportInternals, universal.StripComments ];

    }

    public constructor(
        args: ReaderConstructorArgs,
    ) {
        super({ logger: args.logger });
        const { parser, parseFn, parserName } = args;
        this.componentType = 'reader';
        this.configSection = 'readers';
        if (parser !== undefined) {
            this.parser = parser;
        }
        if (parseFn !== undefined) {
            this.parseFn = parseFn;
        }

        if (args.debugFn) {
            this.debugFn = args.debugFn;
        }
        if (args.debug) {
            this.debug = args.debug || false;
        }
        if (parser === undefined) {
            if (parserName) {
                this.setParser(parserName);
            }
        }
        this.source = undefined;
        this.input = '';
    }

    public setParser(parserName: string): void {
        const ParserClass: ParserConsructor = parsers.getParserClass(parserName);
        this.parser = new ParserClass({
            debug: this.debug,
            debugFn: this.debugFn,
            logger: this.logger,
        });
    }

    /**
      * Magic read method::
      *
      *   test123
      *
      */
    public read(source: Input, parser: Parser, settings: Settings): Promise<Document> {
        this.source = source;
        if (!this.parser) {
            this.parser = parser;
        }
        this.settings = settings;
        if (!this.source) {
            throw new Error('Need source');
        }
        this.logger.silly('calling read on source');

        return this.source.read().then((input): Document => {
            this.input = input;
            this.parse();
            return this.document!;
        });
    }

    /* read method without callbcks and other junk */
    public read2(input: string, settings: Settings): Document | undefined {
        this.input = input;
        this.settings = settings;
        this.parse();
        return this.document;
    }


    /* Delegates to this.parser, providing arguments
       based on instance variables */
    public parse(): void {
        const input = Array.isArray(this.input) ? this.input.join('') : this.input;

        if (this.parser) {
            const document = this.newDocument();
            this.parser.parse(input, document);
            this.document = document;
            if (this.input === undefined) {
                throw new Error(`need input, i have ${this.input}`);
            }
        } else if (this.parseFn !== undefined) {
            const document = this.parseFn(input);
            this.document = document;
        } else {
            throw new InvalidStateError();
        }
        //this.document!.currentSource = '';
        //this.document!.currentLine = 0;
    }

    public newDocument(): Document {
        if (!this.settings) {
            throw new InvalidStateError("need settings");
        }
        const document = newDocument(
            {
                logger: this.logger,
                sourcePath: this.source && this.source.sourcePath || '',
            },
            this.settings);
        return document;
    }
}

export { Reader }
