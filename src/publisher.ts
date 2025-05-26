import { ApplicationError, InvalidStateError } from "./exceptions.js";
import { OptionParser, OptionParserArgs } from "./frontend.js";
import * as readers from './readers.js';
import * as writers from './writers.js';
import SettingsSpec from './settingsSpec.js';
import { Settings } from "./settings.js";
import Parser from "./parser.js";
import Writer from "./writer.js";
import Reader from "./reader.js";
import Output from "./io/output.js";
import FileInput from "./io/fileInput.js";
import FileOutput from "./io/fileOutput.js";
import Input from "./io/input.js";
import { DebugFunction, Document, InputConstructor, LoggerType } from "./types.js";

export interface SetupOptionParserArgs {
  usage?: string;
  description?: string;
  settingsSpec?: SettingsSpec;
  configSection?: string;
  defaults?: {};
}

export interface ProcessCommandLineArgs {
  argv: string[];
  usage?: string;
  description?: string;
  settingsSpec?: SettingsSpec;
  configSection?: string;
  settingsOverrides?: {};
}

export interface PublisherArgs {
  reader?: Reader;
  parser?: Parser;
  writer?: Writer;
  source?: Input;
  sourceClass?: InputConstructor;
  destination?: Output<any>;
  destinationClass?: OutputConstructor<any>;
  settings?: Settings;
  debugFn?: DebugFunction;
  debug?: boolean;
  logger: LoggerType;
}

interface OutputConstructor<T> {
  new(destination?: T, destinationPath?: string, encoding?: string, errorHandler?: string): Output<T>;
}

/*interface InputConstructor {
    new (): Input;
}
*/

/**
 * A facade encapsulating the high-level logic of a Docutils system.
 */

export class Publisher {
  public get document(): Document | undefined {
    return this._document;
  }
  private sourceClass?: InputConstructor;
  public settings?: Settings;
  private debugFn: DebugFunction;
  private reader?: Reader;
  private _document: Document | undefined;
  private parser?: Parser;
  private writer?: Writer;
  private source?: Input;
  //KM1 private sourceClass?: InputConstructor;
  private destination?: Output<string>;
  private destinationClass?: OutputConstructor<any>;
  private debug: boolean = false;

  /**
   * Create a publisher instance.
   * @param {Object} args - arguments
   * @param {Reader} args.reader - instance of StandaloneReader
   * @param {Parser} args.parser - instance of Parser
   * @param {Writer} args.writer - instance of Writer
   * @param {Source} args.source - instance of Source
   * @param {function} args.sourceClass - class for source, mutually exclusive with souce paramter
   * @param {Destination} args.destination - where the output should be written
   * @param {function} args.destinationClass - Class for destination, mutually
   *                                           exclusive with destination paramter.
   * @param {object} args.settings - Settings for docutils engine.
   * @param {function} args.debugFn - Debug function.
   */

  /* reader=None, parser=None, writer=None, source=None,
 source_class=io.FileInput, destination=None,
 destination_class=io.FileOutput, settings=None */

  private logger: LoggerType;

  public constructor(args: PublisherArgs) {
    const {
      reader, parser, writer, source, destination,
      settings, debugFn, sourceClass, destinationClass, logger,
    } = args;

    this.logger = logger;

    if (debugFn !== undefined) {
      this.debugFn = debugFn;
    } else {
      this.debugFn = this.logger.debug.bind(this.logger);

    }
    this._document = undefined;
    this.reader = reader;
    this.parser = parser;
    this.writer = writer;
    this.source = source;
    this.destination = destination;

    this.sourceClass = sourceClass || FileInput;

    this.destinationClass = destinationClass || FileOutput;
    this.settings = settings;
  }

  public setReader(readerName: string | undefined, parser?: Parser, parserName?: string): void {
    if (readerName === undefined) {
      return;
    }
    const ReaderClass = readers.getReaderClass(readerName);
    this.reader = new ReaderClass({
      parser, parserName, debug: this.debug, debugFn: this.debugFn,
      logger: this.logger,
    });
    if (this.reader !== undefined) {
      this.parser = this.reader.parser;
    }
  }

  public setWriter(writerName: string | undefined): void {
    if (writerName === undefined) {
      return;
    }
    const WriterClass = writers.getWriterClass(writerName);
    /* not setting document here, the write method takes it, which
     * is confusing */
    this.writer = new WriterClass({ logger: this.logger });
  }

  public setComponents(readerName?: string, parserName?: string, writerName?: string): void {
    if (!this.reader) {
      this.setReader(readerName, this.parser, parserName);
    }
    if (!this.parser && this.reader !== undefined) {
      if (!this.reader.parser && parserName !== undefined) {
        this.reader.setParser(parserName);
      }
      this.parser = this.reader.parser;
    }
    if (!this.writer) {
      this.setWriter(writerName);
    }
  }

  public setupOptionParser(
    args: SetupOptionParserArgs,
  ): OptionParser {
    const { usage, description, settingsSpec, configSection, defaults } = args;
    let settingsSpec2 = settingsSpec;
    if (configSection) {
      if (!settingsSpec2) {
        settingsSpec2 = new SettingsSpec();
      }
      settingsSpec2.configSection = configSection;
      const parts = configSection.split(' ');//fixme check split
      if (parts.length > 1 && parts[parts.length - 1] === 'application') {
        settingsSpec2.configSectionDependencies = ['applications'];
      }
    }
    settingsSpec2 = settingsSpec2!;
    if (!this.parser) {
      throw new ApplicationError('no parser');
    }
    if (!this.reader) {
      throw new ApplicationError('no reader');
    }
    if (!this.writer) {
      throw new ApplicationError('no writer');
    }
    if (!settingsSpec2) {
      //throw new Error('no settingsSpec');
    }

    const components: SettingsSpec[] = [this.parser, this.reader, this.writer]
    if (settingsSpec2 !== undefined) {
      components.push(settingsSpec2);
    }
    const oArgs: OptionParserArgs = { logger: this.logger, components, defaults, readConfigFiles: true, usage, description }
    const optionParser = new OptionParser(oArgs);
    return optionParser;
  }

  public process_programmatic_settings(
    settings_spec: any,
    settings_overrides: Record<string, any> | null,
    configSection?: string
  ): void {

    if (this.settings == null) {
      const defaults = settings_overrides ? { ...settings_overrides } : {};
      // Propagate exceptions by default when used programmatically:
      if (!defaults.hasOwnProperty('traceback')) {
        defaults['traceback'] = true;
      }
      this.get_settings({
        settings_spec: settings_spec,
        configSection: configSection,
        ...defaults
      });
    }
  }

  public get_settings(options: {
    usage?: string;
    description?: string;
    settingsSpec?: any;
    configSection?: string;
    [key: string]: any; // for defaults
  }): any {


    const {
      usage = undefined,
      description = undefined,
      settingsSpec = undefined,
      configSection = undefined,
      ...defaults
    } = options;

    const option_parser = this.setupOptionParser({
      usage: usage,
      description: description,
      settingsSpec: settingsSpec,
      configSection: configSection,
      ...defaults
    });

    this.settings = option_parser.getDefaultValues();
    return this.settings;
  }

  public processCommandLine(
    args: ProcessCommandLineArgs,
  ): void {
    try {
      const argParser = this.setupOptionParser({
        usage: args.usage,
        description: args.description,
      });
      let argv = args.argv;
      if (argv === undefined) {
        argv = process.argv.slice(2);
      }
      this.logger.silly('calling argParser.parseKnownArgs', { argv });
      const [settings, restArgs] = argParser.parseKnownArgs(argv);
      this.settings = argParser.checkValues(settings, restArgs);
    } catch (error) {
      if (error instanceof Error) {
        {
          console.log(error.stack);
          console.log(error.message);
        }
        throw error;
      }
    }
  }

  public setIO(sourcePath?: string, destinationPath?: string): void {
    this.logger.silly('setIO');
    if (this.source === undefined) {
      this.setSource({ sourcePath });
    }
    if (this.destination === undefined) {
      this.setDestination({ destinationPath });
    }
    this.logger.silly('departing setIO');
  }

  public setSource(args: { source?: {}; sourcePath?: string }): void {
    this.logger.silly('setSource');
    let sourcePath = args.sourcePath;
    let source = args.source;
    if (typeof sourcePath === 'undefined') {
      sourcePath = this.settings!._source;
    } else {
      this.settings!._source = sourcePath;
    }

    try {
      const SourceClass: InputConstructor = this.sourceClass!;
      let inputEncoding: string | undefined = this.settings!.inputEncoding;

      if (SourceClass !== undefined) {
        this.source = new SourceClass({
          source,
          sourcePath,
          encoding:
            inputEncoding,
          logger: this.logger,
        });
      }
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Error && this.sourceClass) {
        throw new ApplicationError(`Unable to instantiate Source class ${this.sourceClass.constructor.name}: ${error.message}`, { error });
      }
    }
  }

  public setDestination(args: { destination?: Output<{}>; destinationPath?: string }): void {
    this.logger.silly('setDestination');
    try {
      let destinationPath = args.destinationPath;
      let destination = args.destination;
      if (destinationPath === undefined) {
        destinationPath = this.settings!._destination;
      } else {
        this.settings!._destination = destinationPath;
      }
      const DestinationClass = this.destinationClass!;
      const outputEncoding = this.settings!.outputEncoding;
      let outputEncodingErrorHandler = this.settings!.outputEncodingErrorHandler;
      this.destination = new DestinationClass(
        destination,
        destinationPath,
        outputEncoding,
        outputEncodingErrorHandler,
      );
    } catch (error: any) {
      console.log(error.message);
      this.logger.error(`Got error ${error.message}`, { stack: error.stack });
    }
  }

  public applyTransforms(): void {
    this.logger.silly('Publisher.applyTransforms');
    const document1 = this.document;
    if (document1 === undefined) {
      throw new InvalidStateError('Document undefined');
    }
    if (this.source === undefined ||
      this.reader === undefined ||
      this.reader.parser === undefined
      || this.writer === undefined || this.destination === undefined) {
      throw new InvalidStateError('Component undefined');
    }
    document1.transformer.populateFromComponents(
      this.source,
      this.reader,
      this.reader.parser,
      this.writer,
      this.destination
    );
    document1.transformer.applyTransforms();
  }

  public publish(args: any): Promise<any> {
    this.logger.silly('Publisher.publish');

    const {
      argv, usage, description, settingsSpec, settingsOverrides, configSection, enableExitStatus,
    } = args;

    if (this.settings === undefined) {
      this.processCommandLine({
        argv, usage, description, settingsSpec, configSection, settingsOverrides,
      });
    }
    this.setIO();

    if (this.reader === undefined) {
      throw new ApplicationError('Need defined reader with "read" method');
    }
    if (this.writer === undefined || this.source === undefined || this.parser === undefined) {
      throw new InvalidStateError('need Writer and source');
    }
    const writer = this.writer;
    if (this.settings! === undefined) {
      throw new InvalidStateError('need serttings');
    }
    this.logger.silly('calling read');
    return this.reader.read(
      this.source, this.parser, this.settings!)
      .then((result: any): string | {} | undefined => {
        this._document = result;
        if (this._document === undefined) {
          throw new InvalidStateError('need document');
        }
        if (this.destination === undefined) {
          throw new InvalidStateError('need destination');
        }
        this.applyTransforms();

        const output = writer.write(this._document, this.destination);
        writer.assembleParts();
        this.debuggingDumps();
        return output;
      });
  }

  public debuggingDumps(): void {
    if (this.settings!.dumpSettings) {
      process.stderr.write(JSON.stringify(this.settings!, null, 4));
    }
  }
}
