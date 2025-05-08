import { document } from "./nodes.js";
import { SettingsSpec } from "./index.js";
import { OptionParser } from "./frontend.js";
import * as io from "./io.js";
import { readers, writers } from "./index.js";
import { Parser } from "./parser.js";
import { ApplicationError, ExitError, InvalidStateError } from "./exceptions.js";
import { get_parser_class } from "./parsers/index.js";
import { Reader } from "./reader.js";
import { Writer } from "./writer.js";

export interface PublisherArgs {
  reader: string | Reader;
  parser: string | Parser;
  writer: string | Writer;
  source?: io.Input;
  source_class?: typeof io.Input;
  destination?: io.Output;
  destination_class?: typeof io.Output;
  settings?: any; // Settings;
}

interface publishOptions {
  argv?: string[],
  usage?: string,
  description?: string,
  settings_spec?: any,
  settings_overrides?: Record<string, any>,
  config_section?: string,
  enable_exit_status?: boolean,
}

/**
 * A facade encapsulating the high-level logic of a Docutils system.
 */
export class Publisher {

  document?: document;
  reader?: Reader;
  parser?: Parser;
  writer?: Writer;
  source?: io.Input;
  source_class: typeof io.Input;
  destination?: io.Output;
  destination_class: typeof io.Output;
  settings?: any; // TODO: Should be type Settings;
  // private _stderr: any; // TODO ? Use console.error instead for now

  /**
   * Initial setup.
   *
   * The components `reader`, `parser`, or `writer` should all be
   * specified, either as instances or via their names.
   */
  public constructor(args: PublisherArgs) {
    let {
      reader, parser, writer, source, destination,
      settings, source_class, destination_class
    } = args;

    // get component instances from their names:
    if (typeof reader === "string") {
      reader = new (readers.get_reader_class(reader))(parser);
    }
    if (typeof parser === "string") {
      if (reader instanceof Reader) {
        if (reader.parser == null) {
          reader.set_parser(parser);
        }
        parser = reader.parser as Parser;
      } else {
        parser = new (get_parser_class(parser))();
      }
    }
    if (typeof writer === "string") {
      writer = new (writers.get_writer_class(writer))();
    }

    this.reader = reader as Reader;
    this.parser = parser as Parser;
    this.writer = writer as Writer;
    this.source = source;
    this.destination = destination;

    this.source_class = source_class || io.FileInput;

    this.destination_class = destination_class || io.FileOutput;
    this.settings = settings;
  }

  process_programmatic_settings(
    settings_spec: any,
    settings_overrides: Record<string, any> | null,
    config_section?: string
  ): void {
    if (this.settings == null) {
      const defaults = settings_overrides ? { ...settings_overrides } : {};
      // Propagate exceptions by default when used programmatically:
      if (!defaults.hasOwnProperty('traceback')) {
        defaults['traceback'] = true;
      }
      this.get_settings({
        settings_spec: settings_spec,
        config_section: config_section,
        ...defaults
      });
    }
  }

  get_settings(options: {
    usage?: string | null;
    description?: string | null;
    settings_spec?: any;
    config_section?: string | null;
    [key: string]: any; // for defaults
  }): any {
    const {
      usage = null,
      description = null,
      settings_spec = null,
      config_section = null,
      ...defaults
    } = options;

    const option_parser = this._setup_settings_parser({
      usage: usage,
      description: description,
      settings_spec: settings_spec,
      config_section: config_section,
      ...defaults
    });

    this.settings = option_parser.get_default_values();
    return this.settings;
  }

  _setup_settings_parser(options: {
    usage?: string | null;
    description?: string | null;
    settings_spec?: SettingsSpec | null;
    config_section?: string | null;
    [key: string]: any; // includes additional defaults
  }): OptionParser {
    const {
      usage = null,
      description = null,
      settings_spec = null,
      config_section = null,
      ...defaults
    } = options;

    if (config_section && settings_spec) {
      settings_spec.config_section = config_section;

      const parts = config_section.split(/\s+/);
      if (parts.length > 1 && parts[parts.length - 1] === 'application') {
        settings_spec.config_section_dependencies = ['applications'];
      }
    }

    const componentsParam: SettingsSpec[] = [];
    if (this.parser) {
      componentsParam.push(this.parser);
    }
    if (this.reader) {
      componentsParam.push(this.reader);
    }
    if (this.writer) {
      componentsParam.push(this.writer);
    }
    if (settings_spec) {
      componentsParam.push(settings_spec);
    }

    return new OptionParser({
      components: componentsParam,
      defaults,
      read_config_files: true,
      usage,
      description
    });
  }


  set_source(source?: string | Uint8Array, source_path?: string): void {
    let effective_source_path: string | undefined = source_path;

    if (effective_source_path === null || effective_source_path === undefined) {
      // If source_path argument is not provided, fall back to the setting
      effective_source_path = this.settings._source;
    } else {
      // If source_path argument *is* provided,
      // update the corresponding setting.
      // os.fspath equivalent: In TS/JS, paths are typically strings already.
      // No direct conversion needed unless dealing with URL objects or similar.
      this.settings._source = effective_source_path;
    }

    // Instantiate the source object using the source_class constructor
    this.source = new this.source_class({
      source: source, // Pass the source string directly
      source_path: effective_source_path, // Pass the determined path
      encoding: this.settings.input_encoding,
      error_handler: this.settings.input_encoding_error_handler
    });
  }

  /**
   * Set up the destination for output.
   * 
   * @param destination - A file-like object for output
   * @param destination_path - Path to the output file
   */
  set_destination(
    destination: any = null,
    destination_path: string | null = null
  ): void {
    // Provisional: the "_destination" and "output" settings
    // are deprecated and will be ignored in Docutils 2.0.
    if (destination_path !== null) {
      this.settings.output_path = destination_path;
    } else {
      // check 'output_path' and legacy settings
      if (
        this.settings.output &&
        !this.settings.output_path
      ) {
        this.settings.output_path = this.settings.output;
      }

      if (
        this.settings.output_path &&
        this.settings._destination &&
        this.settings.output_path !== this.settings._destination
      ) {
        throw new Error(
          'The --output-path option obsoletes the ' +
          'second positional argument (DESTINATION). ' +
          'You cannot use them together.'
        );
      }

      if (this.settings.output_path === null) {
        this.settings.output_path = this.settings._destination;
      }

      if (this.settings.output_path === '-') {  // use stdout
        this.settings.output_path = null;
      }
    }

    // Update legacy settings
    this.settings._destination = this.settings.output = this.settings.output_path;

    // Create the destination object
    this.destination = new this.destination_class(
      {
        destination: destination,
        destination_path: this.settings.output_path,
        encoding: this.settings.output_encoding,
        error_handler: this.settings.output_encoding_error_handler
      }
    );
  }



  /**
   * Process command line options and arguments (if `this.settings` not
   * already set), run `this.reader` and then `this.writer`. Return
   * `this.writer`'s output.
   */
  publish(
    options: publishOptions
  ): string | Uint8Array {
    const {
      argv,
      usage,
      description,
      settings_spec,
      settings_overrides,
      config_section,
      enable_exit_status = false
    } = options;

    let exit_: boolean | null = null;
    let exit_status: number = 0;
    let output: string | Uint8Array | null = null;

    try {
      if (this.settings === null) {
        // No command line for now, skip this part and error out.
        throw new Error(
          'Command line processing is not implemented yet. '
          + 'Please provide settings directly.'
        );

        // TODO: Implement command line processing first to uncomment this part.
        // this.process_command_line(
        //   argv,
        //   usage,
        //   description,
        //   settings_spec,
        //   config_section,
        //   ...(settings_overrides || {})
        // );
      }

      this.set_io();
      this.prompt();

      if (this.reader === undefined) {
        throw new ApplicationError('Need defined reader with "read" method');
      }
      if (this.writer === undefined || this.source === undefined || this.parser === undefined) {
        throw new InvalidStateError('need Writer and source');
      }

      this.document = this.reader.read(this.source, this.parser, this.settings);

      if (this.document === undefined) {
        throw new InvalidStateError('need document');
      }
      if (this.destination === undefined) {
        throw new InvalidStateError('need destination');
      }

      this.apply_transforms();

      output = this.writer.write(this.document, this.destination);
      this.writer.assemble_parts();
    } catch (error) {
      if (error instanceof ExitError) {
        exit_ = true;
        exit_status = (error as ExitError).code;
      } else {
        if (!this.settings) {
          // Exception too early to report nicely
          throw error;
        }

        if (this.settings.traceback) {
          // Propagate exceptions?
          this.debugging_dumps();
          throw error;
        }

        this.report_Exception(error as Error);
        exit_ = true;
        exit_status = 1;
      }
    }

    this.debugging_dumps();

    if (
      enable_exit_status &&
      this.document &&
      this.document.reporter.max_level >= this.settings.exit_status_level
    ) {
      if (typeof process !== 'undefined' && process.exit) {
        process.exit(this.document.reporter.max_level + 10);
      } else {
        throw new ExitError(
          `Exit status level reached: ${this.document.reporter.max_level}`,
          this.document.reporter.max_level + 10
        );
      }
    } else if (exit_) {
      if (typeof process !== 'undefined' && process.exit) {
        process.exit(exit_status);
      } else {
        throw new ExitError(`Exiting with status: ${exit_status}`, exit_status);
      }
    }

    return output || '';
  }

  public set_io(): void {
    // TODO
  }
  public prompt(): void {
    // TODO
  }
  public apply_transforms(): void {
    // TODO
  }
  public debugging_dumps(): void {
    // TODO
  }
  public report_Exception(error: Error): void {
    // TODO
  }


}