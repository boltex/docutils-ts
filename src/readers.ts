import Component from './component.js';
import Reader from './reader.js';
import * as standalone from './readers/standalone.js';
import { TransformType, ReaderConstructor } from "./types.js";

export class ReReader extends Reader {
    public getTransforms(): TransformType[] {
        return Component.prototype.getTransforms.call(this);
    }
}

export function getReaderClass(readerName: string): ReaderConstructor {
    if (readerName === 'standalone') {
        return standalone.default;
    }
    throw new Error(`Reader "${readerName}" not found.`);

}

export default getReaderClass;
