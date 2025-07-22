import * as nodes from '../nodes.js';
import Transform from '../transform.js';
import { NodeInterface } from "../types.js";

// TODO : FIX NODES-ELEMENTS TO EMULATE PYTHON __setItem__ override! e.g.: setupChild on all insertion/assignments!

/**
 * Miscellaneous transforms.
 */

export class CallBack extends Transform {

    /**
     * Inserts a callback into a document. The callback is called when the
     * transform is applied, which is determined by its priority.
     *
     * For use with `nodes.pending` elements. Requires a `details['callback']`
     * entry, a bound method or function which takes one parameter: the pending
     * node. Other data can be stored in the `details` attribute or in the
     * object hosting the callback method.
     */
    public static defaultPriority = 990;

    public apply(): void {
        const pending = this.startNode as nodes.pending;
        pending.details['callback'](pending);
        pending.parent?.remove(pending);
    }
}

export class ClassAttribute extends Transform {

    /**
     * Move the "class" attribute specified in the "pending" node into the
     * next visible element.
     */
    public static defaultPriority = 210;

    public apply(): void {
        const pending = this.startNode as nodes.pending;
        let parent = pending.parent as NodeInterface;
        let child = pending as NodeInterface;

        while (parent) {
            // Check for appropriate following siblings:
            for (let index = parent.getChildren().indexOf(child) + 1; index < parent.getNumChildren(); index++) {
                const element = parent.getChild(index);
                if (element instanceof nodes.Invisible || element instanceof nodes.system_message) {
                    continue;
                }
                element.attributes.classes.push(...pending.details['class']);
                pending.parent?.remove(pending);
                return;
            }
            // At end of section or container; apply to sibling
            child = parent;
            parent = parent.parent!;
        }

        const error = this.document.reporter.error(
            `No suitable element following "${pending.details['directive']}" directive`,
            [new nodes.literal_block(pending.rawsource, pending.rawsource)],
            { line: pending.line }
        );
        pending.replaceSelf(error);
    }
}

export class Transitions extends Transform {
    /**
     * Move transitions at the end of sections up the tree. Complain
     * on transitions after a title, subtitle, meta, or decoration element,
     * at the beginning or end of the document, and after another transition.
     *
     * For example, transform this::
     *     
     *         <section>
     *             ...
     *             <transition>
     *         <section>
     *             ...
     *
     *     into this::
     *
     *         <section>
     *             ...
     *         <transition>
     *         <section>
     *             ...
     */
    public static defaultPriority = 830;

    public apply(): void {
        for (const node of this.document.traverse({ condition: nodes.transition })) {
            this.visitTransition(node);
        }
    }

    public visitTransition(node: NodeInterface): void {
        let index = node.parent?.index(node) ?? -1;
        const previousSibling = node.previousSibling();
        let msg = '';
        if (!(node.parent instanceof nodes.document || node.parent instanceof nodes.section)) {
            msg = 'Transition must be child of <document> or <section>.';
        } else if (index === 0 || previousSibling instanceof nodes.title ||
            previousSibling instanceof nodes.subtitle ||
            previousSibling instanceof nodes.meta ||
            previousSibling instanceof nodes.decoration) {
            msg = 'Document or section may not begin with a transition.';
        } else if (previousSibling instanceof nodes.transition) {
            msg = 'At least one body element must separate transitions; adjacent transitions are not allowed.';
        }
        if (msg) {
            const warning = this.document.reporter.warning(msg, undefined, { baseNode: node });
            // Check, if it is valid to insert a body element
            if (node.parent) {
                node.parent.replaceAt(index, new nodes.paragraph());
                let validationSucceeded = false;
                try {
                    node.parent.validate(false);
                    validationSucceeded = true;
                } catch (e) {
                    node.parent.replaceAt(index, node);
                }
                if (validationSucceeded) {
                    node.parent.replaceAt(index, node);
                    node.parent.insert(index + 1, warning);
                    // Adjust index to account for the inserted warning.
                    index += 1;
                }
            }
        }
        if (!(node.parent instanceof nodes.document || node.parent instanceof nodes.section)) {
            return;
        }
        if (index !== -1 && index !== (node.parent.getNumChildren() - 1)) {
            // No need to move the node.
            return;
        }
        // Node behind which the transition is to be moved.
        let sibling: NodeInterface = node;
        // While sibling is the last node of its parent.
        while (index === (sibling.parent?.getNumChildren() ?? 0) - 1) {
            sibling = sibling.parent!;
            if (sibling.parent == null) {  // sibling is the top node (document)
                // Transition at the end of document. Do not move the
                // transition up, and place a warning behind.
                const warning = this.document.reporter.warning(
                    'Document may not end with a transition.',
                    undefined,
                    { baseNode: node }
                );
                node.parent?.append(warning);
                return;
            }
        }
        // Remove the original transition node.
        node.parent?.remove(node);
        // Insert the transition after the sibling.
        sibling.parent?.insert(sibling.parent.index(sibling) + 1, node);
    }

}
