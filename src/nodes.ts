import { Reporter } from "./utils/index.js";
import { Transformer } from "./transformer.js";

// ========
//  Mixins
// ========

class Resolvable {
    //    resolved = 0
}

class BackLinkable {
    public backrefs: string[] = [];

    public addBackref(refid: string): void {
        this.backrefs.push(refid);
    }
}


// ====================
//  Element Categories
// ====================

class Root {
}

class Titular {
}

/**
 * Category of Node which may occur before Bibliographic Nodes.
 */
class PreBibliographic {
}

class Bibliographic {
}

class Decorative extends PreBibliographic {
}

class Structural {
}

class Body {
}

class General extends Body {
}

/** List-like elements. */
class Sequential extends Body {
}

class Admonition extends Body {
}

/** Special internal body elements.  */
class Special extends Body {
}

/** Internal elements that don't appear in output. */
class Invisible extends PreBibliographic {
}

class Part {
}

class Inline {
}

class Referential extends Resolvable {
}

class Targetable extends Resolvable {
    // referenced = 0
    // indirect_reference_name = null
    /* Holds the whitespace_normalized_name (contains mixed case) of a target.
  Required for MoinMoin/reST compatibility.
  */
}

/** Contains a `label` as its first element. */
class Labeled {
}

export class Node {

    /** 
     * Used to mimic Python’s ability to check isinstance() or issubclass() dynamically
     * e.g.: this.classTypes = [Special, BackLinkable, PreBibliographic];
     */
    public classTypes: any[] = [];

    constructor() {
        // Initialize the Node instance
    }
}

export class Element extends Node {
    constructor() {
        super();

        // Initialize the Element instance
    }
}

/**
 * The document root element.
 *
 * Do not instantiate this class directly; use
 * `docutils.utils.new_document()` instead.
 */
export class document extends Element {

    // TODO : implement the classTypes list!

    transformer: Transformer;
    reporter: Reporter;

    constructor(
    ) {
        // TODO: implement the real constructor!
        super();

        // Initialize the Document instance
        this.transformer = new Transformer(); // Placeholder for the transformer instance!
        this.reporter = new Reporter(); // Placeholder for the reporter instance!
    }
}
