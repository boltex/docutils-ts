import * as xml from './writers/xml.js';
import * as pojo from './writers/pojo.js';
import * as HtmlBase from './writers/htmlBase.js';
import * as Pseudoxml from './writers/pseudoxml.js';
import { WriterConstructor } from './types.js';

export function getWriterClass(readerName: string): WriterConstructor {
    if (readerName === 'xml') {
        return xml.default;
    } if (readerName === 'pojo') {
        return pojo.default;
    } if (readerName === 'html') {
        return HtmlBase.default;
    } if (readerName === 'pseudoxml') {
        return Pseudoxml.default;
    }

    throw new Error(`./writers/${readerName}.js`);
    // return require(`./writers/${readerName}.js`).default;
}

export default {
    getWriterClass,
};
