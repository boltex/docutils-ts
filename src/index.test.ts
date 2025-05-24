import { test, expect } from '@jest/globals';
import { core, languages } from './index.js';

const rst = `
My Header
=========

Some **bold** text and *italic* text.
`;

test('testing system 1+1=2', () => {
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
	// const get_language = languages.get_language;
	const lang = getLanguage('en');
	console.log(lang?.labels.note);
	expect(lang?.labels.note).toBe("Note");
});