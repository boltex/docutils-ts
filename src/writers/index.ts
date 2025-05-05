import { Component } from "../index.js";
import { Output } from "../io.js";
import * as nodes from "../nodes.js";


export class Writer extends Component {

    constructor() {
        super();
    }

    public write(
        document: nodes.document,
        destination: Output
    ): string | Uint8Array {
        // TODO 
        return '';
    }
    public assemble_parts(): void {
        // TODO 
    }

}