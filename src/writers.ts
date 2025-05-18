import * as xml from './writers/xml.js';
import * as pojo from './writers/pojo.js';
import * as HtmlBase from './writers/htmlBase.js';
import { WriterConstructor } from './types.js';

export function getWriterClass(readerName: string): WriterConstructor {
    if (readerName === 'xml') {
        return xml.default;
    } if (readerName === 'pojo') {
        return pojo.default;
    } if (readerName === 'html') {
        return HtmlBase.default;
    }

    throw new Error('');
    // return require(`./writers/${readerName}.js`).default;
}

export default {
    getWriterClass,
};
