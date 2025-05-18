import Parser from '../parser.js';
import RestructuredTextParser from './restructuredtext.js';
import { ParserConsructor } from "../types.js";

function getParserClass(parserName: string): ParserConsructor {
    if (parserName === 'restructuredtext') {
        return RestructuredTextParser;
    }
    throw new Error('');
    //    return require(`./${parserName}.js`).default;
}

export default {
    getParserClass,
    Parser,
};
