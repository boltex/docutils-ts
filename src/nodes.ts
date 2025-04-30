export class Node {
    constructor() {
        // Initialize the Node instance
    }
}


export class Element extends Node {
    constructor() {
        super();
    }
}

/**
 * The document root element.
 *
 * Do not instantiate this class directly; use
 * `docutils.utils.new_document()` instead.
 */
export class document extends Element {
    constructor() {
        super();

        // Initialize the Document instance
    }
}
