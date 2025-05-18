import read from './reader.js';
import { Settings } from "../settings.js";
import { Document } from "../types.js";

/* Recast of Publisher class to function */
/* where should reader come from? we only have one after all */
function publish(source: string, settings: Settings): Document | undefined {
    const document = read(source, settings);
    return document;
}

export default publish;
