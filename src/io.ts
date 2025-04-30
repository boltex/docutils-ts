import { TransformSpec } from ".";
import * as nodes from "./nodes";

export class Input extends TransformSpec {
    constructor() {
        super();

    }
}

export class Output extends TransformSpec {
    constructor() {
        super();

    }
}

export class FileInput extends Input {
    constructor() {
        super();
    }
}

export class FileOutput extends Output {
    constructor() {
        super();
    }
}

export class StringInput extends Input {
    constructor() {
        super();
    }
}

export class StringOutput extends Output {
    constructor() {
        super();
    }
}

/**
 * Degenerate output: write nothing.
 */
export class NullOutput extends Output {
    constructor() {
        super();
    }

    destination: undefined;

    readonly default_destination_path = 'null output'

    /**
     * Do nothing, return None.
     */
    public write(data: string | Buffer): void {
        // pass
    }


}
/**
 * Adapter for document tree input.
 *
 * The document tree must be passed in the ``source`` parameter.
 */
export class DocTreeInput extends Input {
    constructor() {
        super();
    }
    source: nodes.document;

    readonly default_source_path = 'doctree input';

    /**
     * Return the document tree.
     */
    public read(): nodes.document {
        return this.source;
    }

}