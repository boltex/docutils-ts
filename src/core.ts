import { Parser } from "./parsers";
import { Reader } from "./readers";
import { Writer } from "./writers";
import { Node } from "./nodes";
import * as io from "./io";
import { SettingsSpec } from ".";
import { OptionParser } from "./frontend";

interface PublisherOptions {
  reader: string | Reader;
  parser: string | Parser;
  writer: string | Writer;
  source?: io.Input;
  source_class: typeof io.Input;
  destination?: any;
  destination_class: typeof io.Output;
  settings: any;

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
 * Custom error class to simulate Python's SystemExit
 */
export class ExitError extends Error {
  code: number;

  constructor(message: string, code: number = 0) {
    super(message);
    this.name = 'ExitError';
    this.code = code;
  }
}

/**
 * A facade encapsulating the high-level logic of a Docutils system.
 */
export class Publisher {

  document: Node | undefined;
  reader: Reader;
  parser: Parser;
  writer: Writer;
  source: io.Input;
  source_class: typeof io.Input;
  destination: io.Output;
  destination_class: typeof io.Output;
  settings: any;
  // private _stderr: any; // TODO ? Use console.error instead for now


  /**
   * Initial setup.
   *
   * The components `reader`, `parser`, or `writer` should all be
   * specified, either as instances or via their names.
   */
  constructor(options: PublisherOptions) {


  }


  process_programmatic_settings(
    settings_spec: any,
    settings_overrides: Record<string, any> | null,
    config_section: string
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

    if (config_section) {
      settings_spec.config_section = config_section;

      const parts = config_section.split(/\s+/);
      if (parts.length > 1 && parts[parts.length - 1] === 'application') {
        settings_spec.config_section_dependencies = ['applications'];
      }
    }

    // NOTE: This assumes `this.parser`, `this.reader`, and `this.writer` exist and conform to `SettingsSpec`
    return new OptionParser({
      components: [this.parser, this.reader, this.writer, settings_spec],
      defaults,
      read_config_files: true,
      usage,
      description
    });
  }


  set_source(source?: string | Buffer, source_path?: string): void {
    let effective_source_path: string | null | undefined = source_path;

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
    let output: string | null = null;

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

      this.document = this.reader.read(this.source, this.parser, this.settings);
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

        this.report_Exception(error);
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

}

export interface PublishOptions {
  source: string | Buffer; // Input source
  source_path?: string; // Path to the source file
  destination_path?: string; // Path to the destination file
  reader?: Reader | string; // Reader instance or class
  reader_name?: string; // Name of the reader (Deprecated)
  parser?: Parser | string; // Parser instance or class
  parser_name?: string; // Name of the parser (Deprecated)
  writer?: Writer | string; // Writer instance or class
  writer_name?: string; // Name of the writer (Deprecated)
  settings?: any; // Settings for the publisher
  settings_spec?: any; // Specification for settings
  settings_overrides?: any; // Overrides for settings
  config_section?: string; // Configuration section
  enable_exit_status?: boolean; // Enable exit status
}

export interface publishProgramaticallyOptions {
  source_class: typeof io.Input; // Class for the source input // TODO : Fix this type to be more specific
  source: string | Buffer; // Input source
  source_path?: string; // Path to the source file
  destination_class: typeof io.Output; // Class for the destination output // TODO : Fix this type to be more specific
  destination?: any; // First argument for fs.writeFile, string in node, URI in vscode. Not used for string output
  destination_path?: string; // Path to the destination file
  reader?: Reader | string; // Reader instance or class
  reader_name?: string; // Name of the reader (Deprecated)
  parser?: Parser | string; // Parser instance or class
  parser_name?: string; // Name of the parser (Deprecated)
  writer?: Writer | string; // Writer instance or class
  writer_name?: string; // Name of the writer (Deprecated)
  settings?: any; // Settings for the publisher
  settings_spec?: any; // Specification for settings
  settings_overrides?: any; // Overrides for settings
  config_section?: string; // Configuration section
  enable_exit_status?: boolean; // Enable exit status
}


// export function publish_string(options: any): string {
//     const input = options?.source || "";
//     return `[docutils-ts] received: ${input.slice(0, 60)}...`;
// }

/* 
 * Set up & run a `Publisher` for programmatic use with string I/O.
 *
 * Accepts a `bytes` or `str` instance as `source`.
 *
 * The output is encoded according to the `output_encoding`_ setting;
 * the return value is a `bytes` instance (unless `output_encoding`_ is
 * "unicode", cf. `docutils.io.StringOutput.write()`).
 *
 * Parameters: see `publish_programmatically()` or
 * https://docutils.sourceforge.io/docs/api/publisher.html#publish-string
 *
 * This function is provisional because in Python 3 name and behaviour
 * no longer match.
 *
 * .. _output_encoding:
 * https://docutils.sourceforge.io/docs/user/config.html#output-encoding
*/

export function publish_string(options: PublishOptions): string {

  // The "*_name" arguments are deprecated.
  _name_arg_warning(options.reader_name, options.parser_name, options.writer_name)

  // The default is set in publish_programmatically().
  const [output, _publisher] = publish_programmatically(
    {
      source_class: io.StringInput,
      destination_class: io.StringOutput,
      ...options
    })

  return output;
}

function _name_arg_warning(...name_args: Array<string | null | undefined>): void {
  const components = ['reader', 'parser', 'writer'];
  for (let i = 0; i < components.length; i++) {
    const component = components[i];
    const name_arg = name_args[i];
    if (name_arg !== null && name_arg !== undefined) {
      console.warn(`Argument "${component}_name" will be removed in ` +
        `Docutils 2.0.  Specify ${component} name ` +
        `in the "${component}" argument.`);
    }
  }
}


/**
 *     Set up & run a `Publisher` for custom programmatic use.

    Return the output (as `str` or `bytes`, depending on `destination_class`,
    writer, and the "output_encoding" setting) and the Publisher object.

    Internal:
    Applications should not call this function directly.  If it does
    seem to be necessary to call this function directly, please write to the
    Docutils-develop mailing list
    <https://docutils.sourceforge.io/docs/user/mailing-lists.html#docutils-develop>.

    Parameters:

    * `source_class` **required**: The class for dynamically created source
      objects.  Typically `io.FileInput` or `io.StringInput`.

    * `source`: Type depends on `source_class`:

      - If `source_class` is `io.FileInput`: Either a file-like object
        (must have 'read' and 'close' methods), or ``None``
        (`source_path` is opened).  If neither `source` nor
        `source_path` are supplied, `sys.stdin` is used.

      - If `source_class` is `io.StringInput` **required**:
        The input as either a `bytes` object (ensure the 'input_encoding'
        setting matches its encoding) or a `str` object.

    * `source_path`: Type depends on `source_class`:

      - `io.FileInput`: Path to the input file, opened if no `source`
        supplied.

      - `io.StringInput`: Optional.  Path to the file or name of the
        object that produced `source`.  Only used for diagnostic output.

    * `destination_class` **required**: The class for dynamically created
      destination objects.  Typically `io.FileOutput` or `io.StringOutput`.

    * `destination`: Type depends on `destination_class`:

      - `io.FileOutput`: Either a file-like object (must have 'write' and
        'close' methods), or ``None`` (`destination_path` is opened).  If
        neither `destination` nor `destination_path` are supplied,
        `sys.stdout` is used.

      - `io.StringOutput`: Not used; pass ``None``.

    * `destination_path`: Type depends on `destination_class`:

      - `io.FileOutput`: Path to the output file.  Opened if no `destination`
        supplied.

      - `io.StringOutput`: Path to the file or object which will receive the
        output; optional.  Used for determining relative paths (stylesheets,
        source links, etc.).

    * `reader`: A `docutils.readers.Reader` instance, name, or alias.
      Default: "standalone".

    * `reader_name`: Deprecated. Use `reader`.

    * `parser`: A `docutils.parsers.Parser` instance, name, or alias.
      Default: "restructuredtext".

    * `parser_name`: Deprecated. Use `parser`.

    * `writer`: A `docutils.writers.Writer` instance, name, or alias.
      Default: "pseudoxml".

    * `writer_name`: Deprecated. Use `writer`.

    * `settings`: A runtime settings (`docutils.frontend.Values`) object, for
      dotted-attribute access to runtime settings.  It's the end result of the
      `SettingsSpec`, config file, and option processing.  If `settings` is
      passed, it's assumed to be complete and no further setting/config/option
      processing is done.

    * `settings_spec`: A `docutils.SettingsSpec` subclass or object.  Provides
      extra application-specific settings definitions independently of
      components.  In other words, the application becomes a component, and
      its settings data is processed along with that of the other components.
      Used only if no `settings` specified.

    * `settings_overrides`: A dictionary containing application-specific
      settings defaults that override the defaults of other components.
      Used only if no `settings` specified.

    * `config_section`: A string, the name of the configuration file section
      for this application.  Overrides the ``config_section`` attribute
      defined by `settings_spec`.  Used only if no `settings` specified.

    * `enable_exit_status`: Boolean; enable exit status at end of processing?
 */
function publish_programmatically(options: publishProgramaticallyOptions): [string, Publisher] {

  const reader = options.reader || options.reader_name || 'standalone'
  const parser = options.parser || options.parser_name || 'restructuredtext'
  const writer = options.writer || options.writer_name || 'pseudoxml'

  const publisher = new Publisher({
    reader: reader,
    parser: parser,
    writer: writer,
    settings: options.settings,
    source_class: options.source_class,
    destination_class: options.destination_class
  });

  publisher.process_programmatic_settings(
    options.settings_spec, options.settings_overrides, options.config_section
  );

  publisher.set_source(options.source, options.source_path)
  publisher.set_destination(options.destination, options.destination_path)
  const output = publisher.publish({ enable_exit_status: options.enable_exit_status })

  return [output, publisher];
}