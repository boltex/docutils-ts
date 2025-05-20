import Directive from '../directive.js';
import * as nodes from '../../../nodes.js';

export class Contents extends Directive {
    public run(): nodes.Node[] {
        return [new nodes.comment('', 'unimplemented directive contents')];
    }
}
export class Sectnum extends Directive {
}
