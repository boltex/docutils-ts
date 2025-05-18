import FieldList from './fieldList.js';
import * as nodes from '../../../nodes.js';
import { NodeInterface } from "../../../types.js";

class ExtensionOptions extends FieldList {
    /* Parse field_list fields for extension options. */
    /* No nested parsing is done (including inline markup parsing). */

    /** Override `Body.parse_field_body` for simpler parsing. */
    public parse_field_body(indented: string[], offset: number, node: NodeInterface): void {
        const lines = [];

        for (const line of [...indented, '']) {
            if (line.trim()) {
                lines.push(line);
            } else if (lines.length) {
                const text = lines.join('\n');
                node.add(new nodes.paragraph(text, text));
                lines.length = 0;
            }
        }
    }
}

ExtensionOptions.stateName = 'ExtensionOptions';

export default ExtensionOptions;
