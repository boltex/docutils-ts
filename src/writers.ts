import * as xml from './writers/xml.js';
import * as pojo from './writers/pojo.js';
import * as HtmlBase from './writers/htmlBase.js';
import * as Pseudoxml from './writers/pseudoxml.js';
import { WriterConstructor } from './types.js';

export function getWriterClass(writerName: string): WriterConstructor {
    if (writerName === 'xml') {
        return xml.default;
    } if (writerName === 'pojo') {
        return pojo.default;
    } if (writerName === 'html') {
        return HtmlBase.default;
    } if (writerName === 'html4') {
        return HtmlBase.default;
    } if (writerName === 'xhtml10') {
        return HtmlBase.default;
    } if (writerName === 'pseudoxml') {
        return Pseudoxml.default;
    } if (writerName === 'pprint') {
        return Pseudoxml.default;
    } if (writerName === 'pformat') {
        return Pseudoxml.default;
    }

    throw new Error(`./writers/${writerName}.js`);
    // return require(`./writers/${writerName}.js`).default;
}

export default {
    getWriterClass,
};
