import Input from './io/input.js';
import Output from './io/output.js';
import { StringInput, StringOutput } from './io.js';
import { Publisher } from './publisher.js';
import { ConfigSettings, SettingsSpecType, LoggerType } from './types.js';
import Writer from './writer.js';
import Parser from './parser.js';
import Reader from './reader.js';
import { Settings } from './settings.js';
import { defaultPublisherOptions, defaultUsage, defaultDescription } from './constants.js';
import { NoOpLogger } from './noOpLogger.js';
export { Publisher };

export interface PublishStringOptions {
  source: string | Uint8Array; // Input source
  sourcePath?: string; // Path to the source file
  destinationPath?: string; // Path to the destination file
  reader?: Reader; // Reader instance or class
  readerName?: string; // Name of the reader (Deprecated)
  parser?: Parser; // Parser instance or class
  parserName?: string; // Name of the parser (Deprecated)
  writer?: Writer; // Writer instance or class
  writerName?: string; // Name of the writer (Deprecated)
  settings?: any; // Settings for the publisher
  settingsSpec?: any; // Specification for settings
  settingsOverrides?: any; // Overrides for settings
  configSection?: string; // Configuration section
  enableExitStatus?: boolean; // Enable exit status
}

export interface publishProgramaticallyOptions {
  sourceClass: any; // Class for the source input // TODO : Fix this type to be more specific
  source: string | Uint8Array; // Input source
  sourcePath?: string; // Path to the source file
  destinationClass: any; // Class for the destination output // TODO : Fix this type to be more specific
  destination?: any; // First argument for fs.writeFile, string in node, URI in vscode. Not used for string output
  destinationPath?: string; // Path to the destination file
  reader?: Reader; // Reader instance or class
  readerName?: string; // Name of the reader (Deprecated)
  parser?: Parser; // Parser instance or class
  parserName?: string; // Name of the parser (Deprecated)
  writer?: Writer; // Writer instance or class
  writerName?: string; // Name of the writer (Deprecated)
  settings?: any; // Settings for the publisher
  settingsSpec?: any; // Specification for settings
  settingsOverrides?: any; // Overrides for settings
  configSection?: string; // Configuration section
  enableExitStatus?: boolean; // Enable exit status
}


export function publish(args: any): void {
  const myArgs = { ...defaultPublisherOptions, ...args };
  const {
    reader, readerName, parser, parserName, writer, writerName,
    settings,
  } = myArgs;
  const pub = new Publisher({
    reader, parser, writer, settings, logger: myArgs.logger,
  });
  pub.setComponents(readerName, parserName, writerName);
}

export interface PublishCmdLineArgs {
  reader?: Reader;
  readerName?: string;
  parser?: Parser;
  parserName?: string;
  writer?: Writer;
  writerName?: string;
  settings?: Settings;
  settingsSpec?: SettingsSpecType[];
  settingsOverrides?: ConfigSettings;
  configSection?: string;
  enableExitStatus?: boolean;
  argv?: string[];
  usage?: string;
  description?: string;
  logger?: LoggerType;
}

/**
 *  Set up & run a `Publisher` for command-line-based file I/O (input and
 *  output file paths taken automatically from the command line).  Return the
 *  encoded string output also.
 *
 *  Parameters: see `publish_programmatically` for the remainder.
 *
 *  - `argv`: Command-line argument list to use instead of ``sys.argv[1:]``.
 *  - `usage`: Usage string, output if there's a problem parsing the command
 *    line.
 *  - `description`: Program description, output for the "--help" option
 *    (along with command-line option descriptions).
 *
 */
export function publishCmdLine(args: PublishCmdLineArgs): Promise<any> {
  checkNodeVersion();
  const _defaults = {
    readerName: 'standalone',
    parserName: 'restructuredtext',
    usage: defaultUsage,
    description: defaultDescription,
    enableExitStatus: true,
  };
  args = { ..._defaults, ...args };
  if (args.logger === undefined) {
    args.logger = new NoOpLogger();
  }
  args.logger.silly('publishCmdLine');
  const {
    reader, readerName, parser, parserName, writer, writerName,
    settings, settingsSpec, settingsOverrides, configSection,
    enableExitStatus, argv, usage, description,
  } = args;
  const pub = new Publisher({
    reader, parser, writer, settings, logger: args.logger,
  });
  pub.setComponents(readerName, parserName, writerName);
  return pub.publish({
    argv, usage, description, settingsSpec, settingsOverrides, configSection, enableExitStatus
  });
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

export async function publish_string(options: PublishStringOptions): Promise<string | Uint8Array> {
  checkNodeVersion();
  // The "*_name" arguments are deprecated.
  _name_arg_warning(options.readerName, options.parserName, options.writerName)

  // The default is set in publish_programmatically().
  const [output, _publisher] = await publish_programmatically(
    {
      sourceClass: StringInput,
      destinationClass: StringOutput,
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

    * `writer`: A `docutils.writer.Writer` instance, name, or alias.
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
async function publish_programmatically(options: publishProgramaticallyOptions): Promise<[string | Uint8Array, Publisher]> {

  checkNodeVersion();

  // TODO : Get better logger!

  const publisher = new Publisher({
    reader: options.reader,
    parser: options.parser,
    writer: options.writer,
    settings: options.settings,
    sourceClass: options.sourceClass,
    destinationClass: options.destinationClass,
    logger: new NoOpLogger()
  });

  publisher.setComponents(options.readerName, options.parserName, options.writerName)

  publisher.process_programmatic_settings(
    options.settingsSpec, options.settingsOverrides, options.configSection
  );

  publisher.setSource({ source: options.source, sourcePath: options.sourcePath })
  publisher.setDestination({ destination: options.destination, destinationPath: options.destinationPath })
  const output = await publisher.publish({ enable_exit_status: options.enableExitStatus })

  return [output, publisher];
}

function checkNodeVersion(): void {

  if (typeof process !== 'undefined' && process.versions?.node) {
    if (typeof String.prototype.replaceAll !== 'function') {
      console.error('❌ Your Node.js version does not support String.prototype.replaceAll.');
      console.error('Please upgrade to Node.js v15+.');
      process.exit(1);
    }
  }
}