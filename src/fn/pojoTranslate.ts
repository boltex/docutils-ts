import Writer from '../writers/pojo.js';
import { Document } from "../types.js";

function pojoTranslate(document: Document): {} {
    const writer = new Writer({ logger: document.logger });
    const output = writer.write(document, undefined);
    if (typeof output === 'undefined') {
        throw new Error('undefined output');
    }
    return output;

}
export { pojoTranslate };
export default pojoTranslate;
