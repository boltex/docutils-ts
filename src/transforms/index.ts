import { Node, document } from "../nodes.js";

export class Transform {
    document: document;
    startnode: Node | null = null;
    static default_priority: number = 0;

    get default_priority(): number {
        return (this.constructor as typeof Transform).default_priority;
    }

    constructor(document: document, startnode?: Node) {
        this.document = document;
        this.startnode = startnode || null;
    }
}