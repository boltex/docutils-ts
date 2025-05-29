import Writer from '../writers/htmlBase.js';
import { Document } from "../types.js";

async function htmlTranslate(document: Document): Promise<string> {
    const writer = new Writer({ logger: document.logger });

    const output = await writer.write(document, ((r: {}): {} => r) as any); // TODO : fixme?

    if (typeof output === 'undefined') {
        throw new Error('undefined output');
    }

    return output as string;
}

export { htmlTranslate };

export default htmlTranslate;
