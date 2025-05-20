import Input from './input.js';

import { InputConstructorArgs } from '../types.js';

export abstract class BrowserStreamInput extends Input {
    public constructor(args: InputConstructorArgs) {
        super(args);
    }
}
