import { Document } from "../types.js";

import { compile, TemplateFunction } from 'ejs';
import * as HTMLBaseWriter from "./_htmlBase.js";

class Writer extends HTMLBaseWriter.HTMLBaseWriter {
    // 
    protected translatorClass: typeof HTMLTranslator = HTMLTranslator;

}

class HTMLTranslator extends HTMLBaseWriter.HTMLTranslator {
    protected doctype: string = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"' +
        ' "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n';

    protected contentTypeMathML: TemplateFunction = compile('<meta http-equiv="Content-Type" content="application/xhtml+xml; charset=<%-charset%>" />\n');

    /* * Original code:
        content_type = ('<meta http-equiv="Content-Type"'
                    ' content="text/html; charset=%s" />\n')
    content_type_mathml = ('<meta http-equiv="Content-Type"'
                           ' content="application/xhtml+xml; charset=%s" />\n')


    */
    constructor(document: Document) {
        super(document);
    }

}

export default Writer;