import Directive from '../directive.js';
import * as nodes from '../../../nodes.js';
import { OptionSpec } from "../../../types.js";
import * as directives from "../directiveConversions.js";
import StringList from "../../../stringList.js";
import { fullyNormalizeName } from "../../../utils/nameUtils.js";
import * as parts from "../../../transforms/parts.js";
import * as languages from "../../../languages/index.js";

export class Contents extends Directive {
    public static backlinksValues: string[] = ['top', 'entry', 'none'];

    public static optionalArguments: number = 1;
    public static finalArgumentWhitespace: boolean = true;

    public static backlinks(argument: any): string | null {
        const value = directives.choice(argument, Contents.backlinksValues);
        return value === 'none' ? null : value;
    }

    public static optionSpec: OptionSpec = {
        depth: directives.nonnegativeInt,
        local: directives.flag,
        backlinks: Contents.backlinks,
        class: directives.classOption
    };

    public run(): nodes.Node[] {
        // Check if we're in a valid context
        if (!(this.stateMachine?.matchTitles ||
            this.stateMachine?.node instanceof nodes.sidebar)) {
            throw this.error(`The "${this.name}" directive may not be used within ` +
                `topics or body elements.`);
        }

        const document = this.stateMachine.document!;
        const language = languages.getLanguage(document.settings.languageCode, document.reporter)!;
        const languageModule = { labels: { contents: 'Contents' } }; // Placeholder

        let title: nodes.title | null = null;
        const messages: nodes.Node[] = [];

        if (this.arguments && this.arguments.length > 0) {
            const titleText = this.arguments[0];
            // Implementation of inline_text would be needed
            const textNodes: nodes.Node[] = [new nodes.Text(titleText)];
            title = new nodes.title(titleText, '', textNodes);
        } else {
            if ('local' in this.options) {
                title = null;
            } else {
                title = new nodes.title('', language.labels['contents']);
            }
        }

        const topic = new nodes.topic('', [], { classes: ['contents'] });

        if (this.options.class) {
            topic.attributes.classes = (topic.attributes.classes || []).concat(this.options.class);
        }

        // Set source and line information
        if (this.stateMachine) {
            const [source, line] = this.stateMachine.getSourceAndLine(this.lineno);
            topic.source = source;
            topic.line = line! - 1;
        }

        if ('local' in this.options) {
            topic.attributes.classes.push('local');
        }

        let name: string;
        if (title) {
            name = title.astext();
            topic.append(title);
        } else {
            name = languageModule.labels.contents;
        }

        name = fullyNormalizeName(name);
        if (!document.hasName(name)) {
            topic.attributes.names = (topic.attributes.names || []).concat([name]);
        }
        document.noteImplicitTarget(topic);

        const pending = new nodes.pending(parts.Contents, undefined, this.blockText);
        pending.details = { ...this.options };
        document.notePending(pending);
        topic.append(pending);

        return [topic, ...messages];
    }
}

// Original Python source
/*

class Contents(Directive):

    """
    Table of contents.

    The table of contents is generated in two passes: initial parse and
    transform.  During the initial parse, a 'pending' element is generated
    which acts as a placeholder, storing the TOC title and any options
    internally.  At a later stage in the processing, the 'pending' element is
    replaced by a 'topic' element, a title and the table of contents proper.
    """

    backlinks_values = ('top', 'entry', 'none')

    def backlinks(arg):
        value = directives.choice(arg, Contents.backlinks_values)
        if value == 'none':
            return None
        else:
            return value

    optional_arguments = 1
    final_argument_whitespace = True
    option_spec = {'depth': directives.nonnegative_int,
                   'local': directives.flag,
                   'backlinks': backlinks,
                   'class': directives.class_option}

    def run(self):
        if not (self.state_machine.match_titles
                or isinstance(self.state_machine.node, nodes.sidebar)):
            raise self.error('The "%s" directive may not be used within '
                             'topics or body elements.' % self.name)
        document = self.state_machine.document
        language = languages.get_language(document.settings.language_code,
                                          document.reporter)
        if self.arguments:
            title_text = self.arguments[0]
            text_nodes, messages = self.state.inline_text(title_text,
                                                          self.lineno)
            title = nodes.title(title_text, '', *text_nodes)
        else:
            messages = []
            if 'local' in self.options:
                title = None
            else:
                title = nodes.title('', language.labels['contents'])
        topic = nodes.topic(classes=['contents'])
        topic['classes'] += self.options.get('class', [])
        # the latex2e writer needs source and line for a warning:
        topic.source, topic.line = self.state_machine.get_source_and_line()
        topic.line -= 1
        if 'local' in self.options:
            topic['classes'].append('local')
        if title:
            name = title.astext()
            topic += title
        else:
            name = language.labels['contents']
        name = nodes.fully_normalize_name(name)
        if not document.has_name(name):
            topic['names'].append(name)
        document.note_implicit_target(topic)
        pending = nodes.pending(parts.Contents, rawsource=self.block_text)
        pending.details.update(self.options)
        document.note_pending(pending)
        topic += pending
        return [topic] + messages

*/

export class Sectnum extends Directive {
    public static optionSpec: OptionSpec = {
        depth: directives.nonnegativeInt,
        start: directives.nonnegativeInt,
        prefix: directives.unchangedRequired,
        suffix: directives.unchangedRequired
    };

    public run(): nodes.Node[] {
        const pending = new nodes.pending(parts.SectNum);
        pending.details = { ...this.options };
        this.state.document?.notePending(pending);
        return [pending];
    }
}

export class Header extends Directive {
    public static hasContent: boolean = true;

    public run(): nodes.Node[] {
        this.assertHasContent();
        const header = this.stateMachine.document!.getDecoration().getHeader();
        this.state.nestedParse(
            new StringList(this.content || []),
            this.contentOffset,
            header
        );
        return [];
    }
}

export class Footer extends Directive {
    public static hasContent: boolean = true;

    public run(): nodes.Node[] {
        this.assertHasContent();
        const footer = this.stateMachine.document!.getDecoration().getFooter();
        this.state.nestedParse(
            new StringList(this.content || []),
            this.contentOffset,
            footer
        );
        return [];
    }
}