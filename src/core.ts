import * as io from "./io.js";
import { Reader } from "./reader.js";
import { Parser } from "./parser.js";
import { Publisher } from "./publisher.js";
import { Writer } from "./writer.js";

export interface PublishStringOptions {
  source: string | Uint8Array; // Input source
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
  source: string | Uint8Array; // Input source
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

export function publish_string(options: PublishStringOptions): string | Uint8Array {

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
function publish_programmatically(options: publishProgramaticallyOptions): [string | Uint8Array, Publisher] {

  const reader = options.reader || options.reader_name || 'standalone'
  const parser = options.parser || options.parser_name || 'restructuredtext'
  const writer = options.writer || options.writer_name || 'xml'

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