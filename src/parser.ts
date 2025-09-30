import Component from "./component.js";
import { DebugFunction, Document, ParserArgs, SettingsSpecType, TransformType } from "./types.js";
import * as frontend from './frontend.js';

abstract class Parser extends Component {
    public debugFn: DebugFunction = this.logger.debug.bind(this.logger);
    protected debug: boolean;

    public settingsSpec: SettingsSpecType[] = [
        [
            'Generic Parser Options',
            null,
            [
                ['Disable directives that insert the contents of an external file; replaced with a "warning" system message.',
                    ['--no-file-insertion'],
                    {
                        'action': 'store_false', 'default': true,
                        'dest': 'file_insertion_enabled',
                        'validator': frontend.validateBoolean
                    }
                ],
                ['Enable directives that insert the contents of an external file. (default)',
                    ['--file-insertion-enabled'],
                    { 'action': 'store_true' }],
                ['Disable the "raw" directive; replaced with a "warning" system message.',
                    ['--no-raw'],
                    {
                        'action': 'store_false', 'default': true, 'dest': 'raw_enabled',
                        'validator': frontend.validateBoolean
                    }],
                ['Enable the "raw" directive. (default)',
                    ['--raw-enabled'],
                    { 'action': 'store_true' }],
                ['Maximal number of characters in an input line. Default 10 000.',
                    ['--line-length-limit'],
                    {
                        'metavar': '<length>', 'type': 'int', 'default': 10_000,
                        'validator': frontend.validateNonnegativeInt
                    }],
                ['Validate the document tree after parsing.',
                    ['--validate'],
                    {
                        'action': 'store_true',
                        'validator': frontend.validateBoolean
                    }],
                ['Do not validate the document tree. (default)',
                    ['--no-validation'],
                    { 'action': 'store_false', 'dest': 'validate' }],
            ]

        ]
    ]

    public componentType: string = 'parser';
    public configSection: string = 'parsers';
    public document: Document | undefined; // setup in setupParse()
    public inputstring: string = '';

    public constructor(args: ParserArgs) {
        super({ logger: args.logger });
        this.componentType = 'parser';
        this.configSection = 'parsers';
        this.debug = args.debug || false;
        if (args.debugFn !== undefined) {
            this.debugFn = args.debugFn;
        }
    }

    public getTransforms(): TransformType[] {
        return [...super.getTransforms()]; // TODO : add universal.Validate
        //               universal.Validate ];
    }

    abstract parse(inputstring: string, document: Document): void;
    public setupParse(inputstring: string, document: Document): void {
        this.inputstring = inputstring;
        // provide fallbacks in case the document has only generic settings

        // document.settings.setdefault('file_insertion_enabled', false)
        if (document.settings.fileInsertionEnabled === undefined) {
            document.settings.fileInsertionEnabled = 0;
        }
        // document.settings.setdefault('raw_enabled', false)
        if (document.settings.rawEnabled === undefined) {
            document.settings.rawEnabled = 0;
        }
        // document.settings.setdefault('line_length_limit', 10_000)
        if (document.settings.lineLengthLimit === undefined) {
            document.settings.lineLengthLimit = 10_000;
        }

        this.document = document
        document.reporter.attachObserver(document.noteParseMessage.bind(document));
    }


    /**
     * Finalize parse details.  Call at end of `this.parse()`.
     */
    public finishParse(): void {
        if (!this.document) {
            throw new Error('no document to finish');
        }
        this.document.reporter.detachObserver(
            this.document.noteParseMessage.bind(this.document)
        );
    }

}

export default Parser;
