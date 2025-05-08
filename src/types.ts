// TODO : Fill up with types that mimic classes to prevent circular dependencies (as needed)




export type _Components = 'reader' | 'parser' | 'writer' | 'input' | 'output';

export interface TransformType {
    default_priority: number;
}

export interface TransformSpecInterface {
    /**
     * List of functions to try to resolve unknown references.  Unknown
     * references have a 'refname' attribute which doesn't correspond to any
     * target in the document.  Called when the transforms in
     * `docutils.tranforms.references` are unable to find a correct target.  The
     * list should contain functions which will try to resolve unknown
     * references, with the following signature::
     * 
     * def reference_resolver(node):
     * '''Returns boolean: true if resolved, false if not.'''
     * 
     * If the function is able to resolve the reference, it should also remove
     * the 'refname' attribute and mark the node as resolved::
     * 
     * del node['refname']
     * node.resolved = 1
     * 
     * Each function must have a "priority" attribute which will affect the order
     * the unknown_reference_resolvers are run::
     * 
     * reference_resolver.priority = 100
     * 
     * Override in subclasses.
     */
    unknown_reference_resolvers: {}[];

    get_transforms(): TransformType[];
}

export interface ComponentInterface extends TransformSpecInterface {
    component_type: string;
    supported: string[];

    /** Is `format` supported by this component?
     *
     * To be used by transforms to ask the dependent component if it supports
     * a certain input context or output format.
     */
    supports?(format: string): boolean;
}