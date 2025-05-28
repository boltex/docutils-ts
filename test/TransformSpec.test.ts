import TransformSpec from '../src/transformSpec';
import { createLogger } from '../src/testUtils';
test('TransformSpec.toString()', () => {
    const ts = new TransformSpec({ logger: createLogger() });
    expect(ts.toString()).toEqual('TransformSpec<TransformSpec>');
});
