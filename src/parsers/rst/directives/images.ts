import * as nodes from '../../../nodes.js';
import Directive from '../directive.js';
import { OptionSpec } from "../../../types.js";
import * as directives from "../directiveConversions.js";
import { escape2null } from "../../../utils.js";
import StringList from "../../../stringList.js";
import { setClasses } from "../roles.js";
import { fullyNormalizeName, whitespaceNormalizeName } from "../../../utils/nameUtils.js";

class Image extends Directive {
    public static alignHValues: string[] = ['left', 'center', 'right'];
    public static alignVValues: string[] = ['top', 'middle', 'bottom'];
    public static loadingValues: string[] = ['embed', 'link', 'lazy'];
    public static alignValues: string[] = [...this.alignHValues, ...this.alignVValues];

    public static requiredArguments: number = 1;
    public static optionalArguments: number = 0;

    public static align(argument: any): string {
        return directives.choice(argument, this.alignValues);
    }

    public static loading(argument: any): string {
        return directives.choice(argument, this.loadingValues);
    }

    public static optionSpec: OptionSpec = {
        alt: directives.unchanged,
        height: directives.lengthOrUnitless,
        width: directives.lengthOrPercentageOrUnitless,
        scale: directives.percentage,
        align: this.align,
        name: directives.unchanged,
        target: directives.unchangedRequired,
        loading: this.loading,
        class: directives.classOption,
    };

    public run(): any[] {
        if (!this.arguments) {
            throw this.error(`Error in "${this.name}" directive: No image URI given.`);
        }
        if (this.options && 'align' in this.options) {

            // if (this.state instanceof SubstitutionDef) {
            if ('isSubstitutionDef' in this.state && this.state.isSubstitutionDef) {
                // Check for align_v_values.
                if (Image.alignVValues.indexOf(this.options.align) == -1) {
                    throw this.error(
                        `Error in "${this.name}" directive: "${this.options.align}" is not a valid value `
                        + `for the "align" option within a substitution `
                        + `definition.  Valid values for "align" are: "${Image.alignVValues.join('", "')}".`);
                }
            } else if (Image.alignHValues.indexOf(this.options.align) === -1) {
                throw this.error(`Error in "${this.name}" directive: "${this.options.align}" is ` +
                    `not a valid value for the "align" option.  Valid values for "align" are: "${Image.alignHValues.join('", "')}".`);
            }
        }

        const messages = [];
        const reference = directives.uri(this.arguments[0])
        this.options.uri = reference
        let referenceNode = null

        if ('target' in this.options) {
            let block = escape2null(this.options.target).split(/\n/);

            const [targetType, data] = this.state.parse_target(
                new StringList(block), this.blockText, this.lineno);
            if (targetType === 'refuri') {
                referenceNode = new nodes.reference('', '', [], { refuri: data });
            } else if (targetType === 'refname') {
                referenceNode = new nodes.reference('', '', [], {
                    refname: fullyNormalizeName(data),
                    name: whitespaceNormalizeName(data)
                });
                referenceNode.indirectReferenceName = data
                this.state.document!.noteRefname(referenceNode)
            } else {                           // malformed target
                messages.push(data)       // data is a system message
            }
            delete this.options.target;
        }

        setClasses(this.options)
        const imageNode = new nodes.image(this.blockText, [], this.options);

        // Add source and line information
        if (this.stateMachine) {
            const [source, line] = this.stateMachine.getSourceAndLine(this.lineno);
            imageNode.source = source;
            imageNode.line = line;
        }

        this.addName(imageNode)

        if (referenceNode) {
            referenceNode.append(imageNode);
            return [...messages, referenceNode];
        } else {
            return [...messages, imageNode];
        }
    }
}


class Figure extends Image {
    public static hasContent = true;

    // Only horizontal alignments for figures
    public static align(argument: any): string {
        return directives.choice(argument, Image.alignHValues);
    }

    public static figwidthValue(argument: any): string {
        if (typeof argument === "string" && argument.toLowerCase() === "image") {
            return "image";
        } else {
            // Default unit is px
            return directives.lengthOrPercentageOrUnitless(argument, "px");
        }
    }

    public static optionSpec: OptionSpec = {
        ...Image.optionSpec,
        figwidth: Figure.figwidthValue,
        figclass: directives.classOption,
        figname: directives.unchanged,
        align: Figure.align,
    };

    public run(): any[] {
        // Extract and remove figure-specific options
        const figwidth = this.options?.figwidth ? this.options.figwidth : undefined;
        if (figwidth !== undefined) delete this.options.figwidth;
        const figclasses = this.options?.figclass ? this.options.figclass : undefined;
        if (figclasses !== undefined) delete this.options.figclass;
        const figname = this.options?.figname ? this.options.figname : undefined;
        if (figname !== undefined) delete this.options.figname;
        const align = this.options?.align ? this.options.align : undefined;
        if (align !== undefined) delete this.options.align;

        // Run the Image directive logic
        const imageResults = super.run();
        const imageNode = imageResults.find((n: any) => n instanceof nodes.image || n instanceof nodes.system_message);

        if (!imageNode || imageNode instanceof nodes.system_message) {
            return [imageNode];
        }

        // Create the figure node and set source/line info
        const figureNode = new nodes.figure('', [imageNode]);
        if (this.stateMachine) {
            const [source, line] = this.stateMachine.getSourceAndLine(this.lineno);
            figureNode.source = source;
            figureNode.line = line;
        }

        // Handle figwidth
        if (figwidth === "image") {
            // TODO: Implement image size reading if possible when a PIL equivalent is available
            // figureNode.width = ...;
        } else if (figwidth !== undefined) {
            figureNode.attributes.width = figwidth;
        }

        // Handle figclass
        if (figclasses) {
            figureNode.attributes.classes = (figureNode.attributes.classes || []).concat(figclasses);
        }

        // Handle figname
        if (figname) {
            figureNode.names = (figureNode.names || []);
            figureNode.names.push(fullyNormalizeName(figname));
            this.state.document?.noteExplicitTarget?.(figureNode, figureNode);
        }

        // Handle align
        if (align) {
            figureNode.attributes.align = align;
        }

        // Handle content (caption and legend)
        if (this.content && this.content.length > 0) {
            // Create anonymous container for parsing
            const node = new nodes.Element();

            // Parse the content
            this.state.nestedParse(
                new StringList(this.content),
                this.contentOffset,
                node
            );

            // Process each child node
            const nodeChildren = node.getChildren();
            let outsideIndex = 0;
            for (let i = 0; i < nodeChildren.length; i++) {
                outsideIndex = i;
                const child = nodeChildren[i];

                // Skip temporary nodes that will be removed by transforms
                if (child instanceof nodes.target || child instanceof nodes.pending) {
                    figureNode.add(child);
                    continue;
                }

                // Handle paragraph as caption
                if (child instanceof nodes.paragraph) {
                    const caption = new nodes.caption(child.rawsource, '', child.getChildren());
                    if (child.source) caption.source = child.source;
                    if (child.line !== undefined) caption.line = child.line;
                    figureNode.add(caption);
                    break;
                }

                // Handle empty comment
                if (child instanceof nodes.comment && child.getNumChildren() === 0) {
                    break;
                }

                // Error if not a paragraph or empty comment
                const error = this.stateMachine.reporter.error(
                    'Figure caption must be a paragraph or empty comment.',
                    [new nodes.literal_block(this.blockText, this.blockText)],
                    { line: this.lineno }
                );
                return [figureNode, error];
            }

            // Add remaining content as legend if any
            if (node.getNumChildren() > (outsideIndex + 1)) {
                const legendChildren = node.getChildren().slice(outsideIndex + 1);
                const legend = new nodes.legend('', [...legendChildren]);
                figureNode.add(legend);
            }
        }

        return [figureNode];
    }

}

export { Image, Figure };
