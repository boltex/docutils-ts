import { newDocument, pojoTranslate, getDefaultSettings } from '../../src/index';
import { createNewDocument } from '../../src/testUtils';



/* what is this supposed to test? */
test('', async () => {
    const document = createNewDocument();
    const r = await pojoTranslate(document);
    expect(r).toBeDefined();
});
