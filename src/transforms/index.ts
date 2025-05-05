import { Node, document } from "../nodes.js";

export class Transform {
    document: document;
    startnode: Node | null = null;

    constructor(document: document, startnode?: Node) {
        this.document = document;
        this.startnode = startnode || null;
    }
}