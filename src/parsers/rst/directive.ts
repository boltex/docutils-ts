import { DirectiveError, DirectiveInterface } from "./types.js";
import { StatemachineInterface, LogLevel, OptionSpec, Options } from "../../types.js";
import Body from "./states/body.js";
import { fullyNormalizeName } from "../../utils/nameUtils.js";

/**
 * 
 * Base class for reStructuredText directives.
 * 
 * The following attributes may be set by subclasses.  They are
 * interpreted by the directive parser (which runs the directive
 * class):
 * 
 * - `required_arguments`: The number of required arguments (default:
 * 0).
 * 
 * - `optional_arguments`: The number of optional arguments (default:
 * 0).
 * 
 * - `final_argument_whitespace`: A boolean, indicating if the final
 * argument may contain whitespace (default: False).
 * 
 * - `option_spec`: A dictionary, mapping known option names to
 * conversion functions such as `int` or `float` (default: {}, no
 * options).  Several conversion functions are defined in the
 * directives/__init__.py module.
 * 
 * Option conversion functions take a single parameter, the option
 * argument (a string or ``None``), validate it and/or convert it
 * to the appropriate form.  Conversion functions may raise
 * `ValueError` and `TypeError` exceptions.
 * 
 * - `has_content`: A boolean; True if content is allowed.  Client
 * code must handle the case where content is required but not
 * supplied (an empty content list will be supplied).
 * 
 * Arguments are normally single whitespace-separated words.  The
 * final argument may contain whitespace and/or newlines if
 * `final_argument_whitespace` is True.
 * 
 * If the form of the arguments is more complex, specify only one
 * argument (either required or optional) and set
 * `final_argument_whitespace` to True; the client code must do any
 * context-sensitive parsing.
 * 
 * When a directive implementation is being run, the directive class
 * is instantiated, and the `run()` method is executed.  During
 * instantiation, the following instance variables are set:
 * 
 * - ``name`` is the directive type or name (string).
 * 
 * - ``arguments`` is the list of positional arguments (strings).
 * 
 * - ``options`` is a dictionary mapping option names (strings) to
 * values (type depends on option conversion functions; see
 * `option_spec` above).
 * 
 * - ``content`` is a list of strings, the directive content line by line.
 * 
 * - ``lineno`` is the absolute line number of the first line
 * of the directive.
 * 
 * - ``content_offset`` is the line offset of the first line of the content from
 * the beginning of the current input.  Used when initiating a nested parse.
 * 
 * - ``block_text`` is a string containing the entire directive.
 * 
 * - ``state`` is the state which called the directive function.
 * 
 * - ``state_machine`` is the state machine which controls the state which called
 * the directive function.
 * 
 * Directive functions return a list of nodes which will be inserted
 * into the document tree at the point where the directive was
 * encountered.  This can be an empty list if there is nothing to
 * insert.
 * 
 * For ordinary directives, the list must contain body elements or
 * structural elements.  Some directives are intended specifically
 * for substitution definitions, and must return a list of `Text`
 * nodes and/or inline elements (suitable for inline insertion, in
 * place of the substitution reference).  Such directives must verify
 * substitution definition context, typically using code like this::
 * 
 * if not isinstance(state, states.SubstitutionDef):
 * error = state_machine.reporter.error(
 * 'Invalid context: the "%s" directive can only be used '
 * 'within a substitution definition.' % (name),
 * nodes.literal_block(block_text, block_text), line=lineno)
 * return [error]
 * 
 *  
 */
class Directive implements DirectiveInterface {

    // * THOSE SHOULD BE STATIC
    // optionalArguments
    // requiredArguments
    // optionSpec
    // hasContent
    // finalArgumentWhitespace

    public static finalArgumentWhitespace: boolean = false;
    public static requiredArguments: number = 0;
    public static optionalArguments: number = 0;

    public static optionSpec: OptionSpec;
    public static hasContent: boolean;

    public name: string;
    public arguments: string[];
    public options: Options;
    public content: any;
    public lineno: number;
    public contentOffset: number;
    public blockText: string;
    public state: Body;
    public stateMachine: StatemachineInterface;

    public constructor(
        args: {
            name: string;
            args: string[];
            options: Options;
            content: any;
            lineno: number;
            contentOffset: number;
            blockText: string;
            state: Body;
            stateMachine: StatemachineInterface;
        }
    ) {
        this.name = args.name;
        this.arguments = args.args;
        this.options = args.options;
        this.content = args.content;
        this.lineno = args.lineno;
        this.contentOffset = args.contentOffset;
        this.blockText = args.blockText;
        this.state = args.state;
        this.stateMachine = args.stateMachine;
    }

    public run(): any[] {
        throw new DirectiveError(LogLevel.ErrorLevel, 'Must override run() in subclass.');
    }

    public debug(message: string): DirectiveError {
        return this.directiveError(LogLevel.DebugLevel, message);
    }

    public error(message: string): DirectiveError {
        return this.directiveError(LogLevel.ErrorLevel, message);
    }

    public info(message: string): DirectiveError {
        return this.directiveError(LogLevel.InfoLevel, message);
    }

    public severe(message: string): DirectiveError {
        return this.directiveError(LogLevel.SevereLevel, message);
    }

    public warning(message: string): DirectiveError {
        return this.directiveError(LogLevel.WarningLevel, message);
    }

    private directiveError(level: LogLevel, message: string): DirectiveError {
        return new DirectiveError(level, message);
    }


    public assertHasContent(): void {
        /**
         * Throw an ERROR-level DirectiveError if the directive doesn't
         * have contents.
         */
        if (!this.content || this.content.length === 0) {
            throw this.error(`Content block expected for the "${this.name}" directive; none found.`);
        }
    }

    public addName(node: any): void {
        /**
         * Append self.options['name'] to node['names'] if it exists.
         * Also normalize the name string and register it as explicit target.
         */
        if ('name' in this.options) {
            const name = fullyNormalizeName(this.options.name);
            if ('name' in node) {
                delete node['name'];
            }
            node['names'].push(name);
            this.state.document?.noteExplicitTarget(node, node);
        }
    }

}

export default Directive;
