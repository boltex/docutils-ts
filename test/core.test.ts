import { test, expect, describe } from '@jest/globals';
import * as frontmatter from '../src/transforms/frontmatter.js';
import { newDocument } from '../src/newDocument.js';
import { getDefaultSettings } from '../src/settingsHelper.js';
import { core, languages } from '../src/index.js';

const rst = `
My Header
=========

Some **bold** text and *italic* text.
`;

// TODO : Add reals tests
describe('Some tests description', () => {

    test('testing inside test folder', () => {
        expect(1 + 1).toBe(2);
    });

    test('publish_string', async () => {
        const html = await core.publish_string({
            source: rst,
            readerName: 'standalone',
            parserName: 'restructuredtext',
            writer: undefined,
            writerName: 'html',
        });
        expect(html).toBeTruthy();
    });

    test('languages', () => {
        const getLanguage = languages.getLanguage;
        const lang = getLanguage('en');
        expect(lang?.labels.note).toBe("Note");
    });

    // More tests...
});