import { Component } from "..";
import { Output } from "../io";
import * as nodes from "../nodes";


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