import * as nodes from '../../../nodes.js';
import Directive from '../directive.js';
import { NodeInterface } from "../../../types.js";
import { lengthOrPercentageOrUnitless, lengthOrUnitless, unchanged } from "../directiveConversions.js";
import SubstitutionDef from "../states/substitutionDef.js";
import { escape2null } from "../../../utils.js";
import StringList from "../../../stringList.js";
import { setClasses } from "../roles.js";
import { uri } from "../directives.js";
import { fullyNormalizeName, whitespaceNormalizeName } from "../../../nodeUtils.js";

const directives: any = {};

class Image extends Directive {
    private finalArgumentWhitespace?: boolean;
    private alignHValues: string[] = ['left', 'center', 'right'];
    private alignVValues: string[] = ['top', 'middle', 'bottom'];
    ;

    private alignValues: string[] = [...this.alignHValues, ...this.alignVValues];
    /*    public constructor(args: { name: string; args: string[]; options: Options; content: any; lineno: number; contentOffset: number; blockText: StringList; state: Body; stateMachine: Statemachine }) {
            super(args);
        }
    */
    public align(argument: {}): {} | {}[] {
        return directives.choice(argument);
    }

    private addName(imageNode: NodeInterface): void {

    }

    public run(): any[] {
        if (!this.arguments) {
            throw new Error('');
        }
        if (this.options && 'align' in this.options) {
            if (this.state instanceof SubstitutionDef) {
                // Check for align_v_values.
                if (this.alignVValues.indexOf(this.options.align) == -1) {
                    throw this.error(
                        `Error in "${this.name}" directive: "${this.options.align}" is not a valid value '
                        'for the "align" option within a substitution '
                        'definition.  Valid values for "align" are: "${this.alignVValues.join('", "')}".`);
                }
            } else if (this.alignHValues.indexOf(this.options.align) === -1) {
                throw this.error(`Error in "${this.name}" directive: "${this.options.align}" is ` +
                    `not a valid value for the "align" option.  Valid values for "align" are: "${this.alignHValues.join('", "')}".`);
            }
        }

        const messages = [];
        const reference = uri(this.arguments[0])
        this.options.uri = reference
        let referenceNode = null
        if ('target' in this.options) {
            let blockStr: string = escape2null(this.options.target
                .split(/\n/));
            let block = blockStr.split(/\n/);
            const [targetType, data] = this.state.parse_target(
                new StringList(block), this.blockText, this.lineno);
            let referenceNode;
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
            setClasses(this.options)
            const imageNode = new nodes.image(this.blockText, [], this.options);
            this.addName(imageNode)
            if (referenceNode) {
                referenceNode.append(imageNode);

                return [...messages, referenceNode];
            } else {
                return [...messages, imageNode];
            }
        }
        return [];
    }
}
Image.optionSpec = {
    alt: unchanged,
    height: lengthOrUnitless,
    width: lengthOrPercentageOrUnitless,
    scale: directives.percentage,
    // @ts-ignore 
    align: Image.align, // TODO : fix this!
    name: unchanged,
    target: directives.unchanged_required,
    class: directives.class_option,
};
class Figure extends Image {
}

export { Image, Figure };
