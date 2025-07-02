import * as nodes from '../../../nodes.js';
import Directive from '../directive.js';
import { OptionSpec } from "../../../types.js";
import * as directives from "../directiveConversions.js";
import { escape2null } from "../../../utils.js";
import StringList from "../../../stringList.js";
import { setClasses } from "../roles.js";
import { fullyNormalizeName, whitespaceNormalizeName } from "../../../utils/nameUtils.js";

class Image extends Directive {
    private static alignHValues: string[] = ['left', 'center', 'right'];
    private static alignVValues: string[] = ['top', 'middle', 'bottom'];
    private static loadingValues: string[] = ['embed', 'link', 'lazy'];
    private static alignValues: string[] = [...this.alignHValues, ...this.alignVValues];

    public requiredArguments: number = 1;
    public optionalArguments: number = 0;

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



// Original Python
/*

class Image(Directive):

    align_h_values = ('left', 'center', 'right')
    align_v_values = ('top', 'middle', 'bottom')
    align_values = align_v_values + align_h_values
    loading_values = ('embed', 'link', 'lazy')

    def align(argument):
        # This is not callable as `self.align()`.  We cannot make it a
        # staticmethod because we're saving an unbound method in
        # option_spec below.
        return directives.choice(argument, Image.align_values)

    def loading(argument):
        # This is not callable as `self.loading()` (see above).
        return directives.choice(argument, Image.loading_values)

    required_arguments = 1
    optional_arguments = 0
    final_argument_whitespace = True
    option_spec = {'alt': directives.unchanged,
                   'height': directives.length_or_unitless,
                   'width': directives.length_or_percentage_or_unitless,
                   'scale': directives.percentage,
                   'align': align,
                   'target': directives.unchanged_required,
                   'loading': loading,
                   'class': directives.class_option,
                   'name': directives.unchanged}

    def run(self):
        if 'align' in self.options:
            if isinstance(self.state, states.SubstitutionDef):
                # Check for align_v_values.
                if self.options['align'] not in self.align_v_values:
                    raise self.error(
                        'Error in "%s" directive: "%s" is not a valid value '
                        'for the "align" option within a substitution '
                        'definition.  Valid values for "align" are: "%s".'
                        % (self.name, self.options['align'],
                           '", "'.join(self.align_v_values)))
            elif self.options['align'] not in self.align_h_values:
                raise self.error(
                    'Error in "%s" directive: "%s" is not a valid value for '
                    'the "align" option.  Valid values for "align" are: "%s".'
                    % (self.name, self.options['align'],
                       '", "'.join(self.align_h_values)))
        messages = []
        reference = directives.uri(self.arguments[0])
        self.options['uri'] = reference
        reference_node = None
        if 'target' in self.options:
            block = states.escape2null(
                self.options['target']).splitlines()
            block = list(block)
            target_type, data = self.state.parse_target(
                block, self.block_text, self.lineno)
            if target_type == 'refuri':
                reference_node = nodes.reference(refuri=data)
            elif target_type == 'refname':
                reference_node = nodes.reference(
                    refname=fully_normalize_name(data),
                    name=whitespace_normalize_name(data))
                reference_node.indirect_reference_name = data
                self.state.document.note_refname(reference_node)
            else:                           # malformed target
                messages.append(data)       # data is a system message
            del self.options['target']


        options = normalize_options(self.options)
        image_node = nodes.image(self.block_text, **options)
        (image_node.source,
         image_node.line) = self.state_machine.get_source_and_line(self.lineno)
        self.add_name(image_node)
        if reference_node:
            reference_node += image_node
            return messages + [reference_node]
        else:
            return messages + [image_node]



*/

class Figure extends Image {
    // 
}

export { Image, Figure };
