import * as nodes from '../../../nodes.js';
import Directive from '../directive.js';
import * as directives from "../directiveConversions.js";
import { normalizeOptions } from "../roles.js"

abstract class BaseAdmonition extends Directive {

    public static finalArgumentWhitespace: boolean = true;
    public static optionSpec = {
        'class': directives.classOption,
        'name': directives.unchanged,
    };
    public static hasContent: boolean = true;
    abstract nodeClass: new (rawsource: string, children?: any, attributes?: any) => nodes.Element; // Subclasses must set this to the appropriate admonition node class.

    public run(): any[] {
        const options = normalizeOptions(this.options);
        this.assertHasContent();
        const text = this.content.join('\n');
        const admonitionNode = new this.nodeClass(text, undefined, options);
        this.addName(admonitionNode);
        [admonitionNode.source, admonitionNode.line] = this.stateMachine.getSourceAndLine(this.lineno);

        if (this.nodeClass === nodes.admonition) {
            const titleText = this.arguments[0];
            const [textnodes, messages] = this.state.inline_text(titleText, this.lineno);
            const title = new nodes.title(titleText, '', textnodes);
            [title.source, title.line] = this.stateMachine.getSourceAndLine(this.lineno);

            admonitionNode.append(title);
            if (messages.length > 0) {
                admonitionNode.extend(messages);
            }

            if (!('classes' in options)) {
                admonitionNode.attributes['classes'] = ['admonition-' + nodes.makeId(titleText)];
            }
        }

        this.state.nestedParse(this.content, this.contentOffset, admonitionNode);
        return [admonitionNode];

    }

}

export class Admonition extends BaseAdmonition {
    public static requiredArguments: number = 1;
    public nodeClass: new (rawsource: string, children?: any, attributes?: any) => nodes.admonition = nodes.admonition;
}

export class Attention extends BaseAdmonition {
    public nodeClass: new (rawsource: string, children?: any, attributes?: any) => nodes.attention = nodes.attention;
}

export class Caution extends BaseAdmonition {
    public nodeClass: new (rawsource: string, children?: any, attributes?: any) => nodes.caution = nodes.caution;
}

export class Danger extends BaseAdmonition {
    public nodeClass: new (rawsource: string, children?: any, attributes?: any) => nodes.danger = nodes.danger;
}

export class Error extends BaseAdmonition {
    public nodeClass: new (rawsource: string, children?: any, attributes?: any) => nodes.error = nodes.error;
}

export class Hint extends BaseAdmonition {
    public nodeClass: new (rawsource: string, children?: any, attributes?: any) => nodes.hint = nodes.hint;
}

export class Important extends BaseAdmonition {
    public nodeClass: new (rawsource: string, children?: any, attributes?: any) => nodes.important = nodes.important;
}

export class Note extends BaseAdmonition {
    public nodeClass: new (rawsource: string, children?: any, attributes?: any) => nodes.note = nodes.note;
}

export class Tip extends BaseAdmonition {
    public nodeClass: new (rawsource: string, children?: any, attributes?: any) => nodes.tip = nodes.tip;
}

export class Warning extends BaseAdmonition {  // NoQA: A001 (builtin shadowing)
    public nodeClass: new (rawsource: string, children?: any, attributes?: any) => nodes.warning = nodes.warning;
}
