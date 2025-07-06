import Writer from '../writers/pojo.js';
import { Document } from "../types.js";

async function pojoTranslate(document: Document): Promise<string | Record<string, any>> {
    const writer = new Writer({ logger: document.logger });
    const output = await writer.write(document, undefined);
    if (typeof output === 'undefined') {
        throw new Error('undefined output');
    }
    return output;

}
export { pojoTranslate };
export default pojoTranslate;
