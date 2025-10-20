import { NodeInterface } from '../../../index.js';
import * as nodes from '../../../nodes.js';
import { OptionSpec } from '../../../types.js';
import { Lexer, NumberLines, Token } from '../../../utils/codeAnalyzer.js';
import Directive from '../directive.js';
import * as directives from "../directiveConversions.js";
import { normalizeOptions } from '../roles.js';




abstract class BasePseudoSection extends Directive {
    public static requiredArguments: number = 1;
    public static optionalArguments: number = 0;
    public static finalArgumentWhitespace: boolean = true;
    public static optionSpec: OptionSpec = {
        'class': directives.classOption,
        'name': directives.unchanged
    };
    public static hasContent: boolean = true;

    abstract nodeClass: new (rawsource: string, children?: any, attributes?: any) => nodes.Element; // Subclasses must set this to the appropriate admonition node class.

    /** Node class to be used (must be set in subclasses). */

    public run(): NodeInterface[] {
        console.log('In BasePseudoSection, name of class is ', this.nodeClass.name);
        if (!this.stateMachine.matchTitles
            || !(this.stateMachine.node instanceof nodes.sidebar)) {
            throw this.error(`The "${this.name}" directive may not be used within topics or body elements.`);
        }
        this.assertHasContent();
        let titles: any[] = [];
        let messages: any[] = [];
        if (this.arguments) {  // title (in sidebars optional)
            const titleText = this.arguments[0];
            const [textnodes, moreMessages] = this.state.inline_text(titleText, this.lineno);
            titles.push(new nodes.title(titleText, '', textnodes));
            // Sidebar uses this code.
            if ('subtitle' in this.options) {
                const [subtitleNodes, moreSubtitleMessages] = this.state.inline_text(this.options['subtitle'], this.lineno);
                titles.push(new nodes.subtitle(this.options['subtitle'], '', subtitleNodes));
                messages.push(...moreSubtitleMessages);
            }
        }
        const text = this.content.join('\n');
        const node = new this.nodeClass(text, ...titles, ...messages);

        node.attributes['classes'] = [...(node.attributes['classes'] ?? []), ...(this.options['class'] || [])];

        [node.source, node.line] = this.stateMachine.getSourceAndLine(this.lineno);
        this.addName(node);
        if (text) {
            this.state.nestedParse(this.content, this.contentOffset, node);
        }
        return [node];
    }

}

export class Topic extends BasePseudoSection {
    nodeClass = nodes.topic;
}

export class Sidebar extends BasePseudoSection {
    nodeClass = nodes.sidebar;

    public static requiredArguments: number = 0;
    public static optionalArguments: number = 1;
    public static optionSpec: OptionSpec = {
        'subtitle': directives.unchangedRequired
    };

    public run(): NodeInterface[] {
        if (this.stateMachine.node instanceof nodes.sidebar) {
            throw this.error(`The "${this.name}" directive may not be used within a sidebar element.`);
        }
        if ('subtitle' in this.options && !this.arguments.length) {
            throw this.error('The "subtitle" option may not be used without a title.');
        }

        return super.run();
    }
}

/**
 * Legacy directive for line blocks.
 *
 * Use is deprecated in favour of the line block syntax,
 * cf. `parsers.rst.states.Body.line_block()`.
 */
export class LineBlock extends Directive {

    public static optionSpec: OptionSpec = {
        'class': directives.classOption,
        'name': directives.unchanged
    }
    public static hasContent: boolean = true;

    public run(): NodeInterface[] {
        this.assertHasContent();
        console.log('In LineBlock directive');
        const block = new nodes.line_block('', undefined, { classes: this.options.class || [] });
        [block.source, block.line] = this.stateMachine.getSourceAndLine(this.lineno);
        this.addName(block);
        const node_list: NodeInterface[] = [block];
        for (const [i, line_text] of this.content.entries()) {
            const [text_nodes, messages] = this.state.inline_text(line_text.strip(), this.lineno + this.contentOffset);
            const line = new nodes.line(line_text, '', text_nodes);
            line.source = block.source;
            line.line = block.line + i;
            if (line_text.strip()) {
                line.indent = line_text.length - line_text.lstrip().length;
            }
            block.append(line);
            node_list.push(...messages);
            this.contentOffset += 1;
        }
        this.state.nest_line_block_lines(block);
        return node_list;
    }

}

export class ParsedLiteral extends Directive {

    public static optionSpec: OptionSpec = {
        'class': directives.classOption,
        'name': directives.unchanged
    }
    public static hasContent: boolean = true;

    public run(): NodeInterface[] {
        console.log('In ParsedLiteral directive');
        const options = normalizeOptions(this.options);
        this.assertHasContent();
        const text = this.content.join('\n');
        const [textNodes, messages] = this.state.inline_text(text, this.lineno);
        const node = new nodes.literal_block(text, '', ...textNodes, ...options);
        node.line = this.contentOffset + 1;
        this.addName(node);
        return [node, ...messages];
    }

}

/**
 * Parse and mark up content of a code block.
 *
 * Configuration setting: syntax_highlight
 *    Highlight Code content with Pygments?
 *    Possible values: ('long', 'short', 'none')
 */
export class CodeBlock extends Directive {

    public static optionalArguments: number = 1;
    public static optionSpec: OptionSpec = {
        'class': directives.classOption,
        'name': directives.unchanged,
        'number-lines': directives.unchanged  // integer or None
    }
    public static hasContent: boolean = true;

    public run(): NodeInterface[] {
        this.assertHasContent();
        console.log('In CodeBlock directive');
        const options = normalizeOptions(this.options);
        const language = this.arguments[0] || '';
        const classes = ['code', language, ...options.classes];

        // set up lexical analyzer
        let tokens: Generator<Token>;
        try {
            tokens = Lexer(this.content.join('\n'), language, this.state.document!.settings.syntaxHighlight);
        } catch (error) {
            if (this.state.document?.settings?.reportLevel && this.state.document?.settings?.reportLevel > 2) {
                // don't report warnings -> insert without syntax highlight
                tokens = Lexer(this.content.join('\n'), language, 'none');
            } else {
                throw this.warning(error as string);
            }
        }

        if ('number-lines' in options) {
            // optional argument `startline`, defaults to 1
            const startline = parseInt(options['number-lines'] || '1', 10);
            const endline = startline + this.content.length;
            // add linenumber filter:
            tokens = NumberLines(tokens, startline, endline);
        }

        // Note: literal_block extends 'FixedTextElement' for which the constructor is:
        // constructor(rawsource?: string, text?: string, children: NodeInterface[] = [], attributes: Attributes = {}) {
        const node = new nodes.literal_block(this.content.join('\n'), undefined, undefined, { classes: classes });

        this.addName(node);

        // if called from "include", set the source
        if ('source' in options) {
            node.attributes['source'] = options['source'];
        }
        // analyze content and add nodes for every token
        for (const [classes, value] of tokens) {
            if (classes) {
                node.add(new nodes.inline(value, value, undefined, { classes: classes }));
            } else {
                // insert as Text to decrease the verbosity of the output
                node.add(new nodes.Text(value));
            }
        }

        return [node];
    }

}

// Original Python
/*
class CodeBlock(Directive):
    """Parse and mark up content of a code block.

    Configuration setting: syntax_highlight
       Highlight Code content with Pygments?
       Possible values: ('long', 'short', 'none')

    """
    optional_arguments = 1
    option_spec = {'class': directives.class_option,
                   'name': directives.unchanged,
                   'number-lines': directives.unchanged  # integer or None
                   }
    has_content = True

    def run(self):
        self.assert_has_content()
        if self.arguments:
            language = self.arguments[0]
        else:
            language = ''
        options = normalize_options(self.options)
        classes = ['code']
        if language:
            classes.append(language)
        if 'classes' in options:
            classes.extend(options['classes'])

        # set up lexical analyzer
        try:
            tokens = Lexer('\n'.join(self.content), language,
                           self.state.document.settings.syntax_highlight)
        except LexerError as error:
            if self.state.document.settings.report_level > 2:
                # don't report warnings -> insert without syntax highlight
                tokens = Lexer('\n'.join(self.content), language, 'none')
            else:
                raise self.warning(error)

        if 'number-lines' in options:
            # optional argument `startline`, defaults to 1
            try:
                startline = int(options['number-lines'] or 1)
            except ValueError:
                raise self.error(':number-lines: with non-integer start value')
            endline = startline + len(self.content)
            # add linenumber filter:
            tokens = NumberLines(tokens, startline, endline)

        node = nodes.literal_block('\n'.join(self.content), classes=classes)
        self.add_name(node)
        # if called from "include", set the source
        if 'source' in options:
            node.attributes['source'] = options['source']
        # analyze content and add nodes for every token
        for classes, value in tokens:
            if classes:
                node += nodes.inline(value, value, classes=classes)
            else:
                # insert as Text to decrease the verbosity of the output
                node += nodes.Text(value)

        return [node]

*/





/*
class MathBlock(Directive):

    option_spec = {'class': directives.class_option,
                   'name': directives.unchanged,
                   # TODO: Add Sphinx' ``mathbase.py`` option 'nowrap'?
                   # 'nowrap': directives.flag,
                   }
    has_content = True

    def run(self):
        options = normalize_options(self.options)
        self.assert_has_content()
        # join lines, separate blocks
        content = '\n'.join(self.content).split('\n\n')
        _nodes = []
        for block in content:
            if not block:
                continue
            node = nodes.math_block(self.block_text, block, **options)
            (node.source,
             node.line) = self.state_machine.get_source_and_line(self.lineno)
            self.add_name(node)
            _nodes.append(node)
        return _nodes

*/

export class MathBlock extends Directive {

    public static optionSpec: OptionSpec = {
        'class': directives.classOption,
        'name': directives.unchanged,
        // TODO: Add Sphinx' ``mathbase.py`` option 'nowrap'?
        // 'nowrap': directives.flag,
    };
    hasContent = true;

    public run(): NodeInterface[] {
        const options = normalizeOptions(this.options);
        this.assertHasContent();
        console.log('In MathBlock directive');
        // join lines, separate blocks
        const content = this.content.join('\n').split('\n\n');
        const _nodes: NodeInterface[] = [];
        for (const block of content) {
            if (!block) {
                continue;
            }
            const node = new nodes.math_block(this.blockText, block, ...options);
            [node.source, node.line] = this.stateMachine.getSourceAndLine(this.lineno);
            this.addName(node);
            _nodes.push(node);
        }
        return _nodes;
    }

}

/*
class Rubric(Directive):

    required_arguments = 1
    optional_arguments = 0
    final_argument_whitespace = True
    option_spec = {'class': directives.class_option,
                   'name': directives.unchanged}

    def run(self):
        options = normalize_options(self.options)
        rubric_text = self.arguments[0]
        textnodes, messages = self.state.inline_text(rubric_text, self.lineno)
        rubric = nodes.rubric(rubric_text, '', *textnodes, **options)
        self.add_name(rubric)
        return [rubric] + messages

*/

export class Rubric extends Directive {

    public static requiredArguments: number = 1;
    public static optionalArguments: number = 0;
    public static finalArgumentWhitespace: boolean = true;
    public static optionSpec: OptionSpec = {
        'class': directives.classOption,
        'name': directives.unchanged
    };

    public run(): NodeInterface[] {
        const options = normalizeOptions(this.options);
        console.log('In Rubric directive');
        const rubricText = this.arguments[0];
        const [textnodes, messages] = this.state.inline_text(rubricText, this.lineno);
        const rubric = new nodes.rubric(rubricText, '', textnodes, options);
        this.addName(rubric);
        return [rubric, ...messages];
    }

}

class BlockQuote extends Directive {

    public static hasContent: boolean = true;
    public classes: string[] = [];

    public run(): NodeInterface[] {
        this.assertHasContent();
        console.log('In BlockQuote directive, classes: ', this.classes);
        const elements = this.state.block_quote(this.content, this.contentOffset);
        for (const element of elements) {
            if (element instanceof nodes.block_quote) {
                element.attributes['classes'] = [...(element.attributes['classes'] ?? []), ...this.classes];
            }
        }
        return elements;
    }
}

export class Epigraph extends BlockQuote {
    public static classes = ['epigraph'];
}

export class Highlights extends BlockQuote {
    public static classes = ['highlights'];
}

export class PullQuote extends BlockQuote {
    public static classes = ['pull-quote'];
}

export class Compound extends Directive {

    public static optionSpec: OptionSpec = {
        'class': directives.classOption,
        'name': directives.unchanged
    }
    public static hasContent: boolean = true;

    public run(): NodeInterface[] {
        this.assertHasContent();
        console.log('In Compound directive');
        const text = this.content.join('\n');
        const node = new nodes.compound(text);
        node.attributes['classes'] = [...(node.attributes['classes'] ?? []), ...(this.options['class'] || [])];
        [node.source, node.line] = this.stateMachine.getSourceAndLine(this.lineno);
        this.addName(node);
        this.state.nestedParse(this.content, this.contentOffset, node);
        return [node];
    }
}

export class Container extends Directive {

    public static optionalArguments: number = 1;
    public static finalArgumentWhitespace: boolean = true;
    public static optionSpec: OptionSpec = {
        'name': directives.unchanged
    };
    public static hasContent: boolean = true;

    public run(): NodeInterface[] {
        this.assertHasContent();
        console.log('In Container directive');
        const text = this.content.join('\n');
        let classes: string[] = [];
        try {
            if (this.arguments && this.arguments.length) {
                classes = directives.classOption(this.arguments[0]);
            } else {
                classes = [];
            }
        } catch (error) {
            throw this.error(`Invalid class attribute value for "${this.name}" directive: "${this.arguments[0]}"`);
        }
        const node = new nodes.container(text);
        node.attributes['classes'] = [...(node.attributes['classes'] ?? []), ...classes];
        [node.source, node.line] = this.stateMachine.getSourceAndLine(this.lineno);
        this.addName(node);
        this.state.nestedParse(this.content, this.contentOffset, node);
        return [node];
    }
}