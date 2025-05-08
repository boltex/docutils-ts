import { SettingsSpec } from './settingsSpec.js';
import { TransformSpec } from './transformSpec.js';
import { _Components } from './types.js';

/**
 * Base class for Docutils components.
 */
export class Component extends SettingsSpec {

    // * ALSO EXTEND TransformSpec with this code duplication:
    // Deprecated; for compatibility.
    static default_transforms: [] = [];

    // List of hook functions which assist in resolving references.
    // Each resolver must have a "priority" attribute.
    unknown_reference_resolvers: Array<(node: any) => boolean & { priority: number }> = [];

    // Transforms required by this class. Override in subclasses.
    get_transforms(): Array<any> {
        if ((this.constructor as typeof TransformSpec).default_transforms.length !== 0) {
            console.warn('TransformSpec: the "default_transforms" attribute will be removed in Docutils 2.0.\nUse get_transforms() method instead.');
            return (this.constructor as typeof TransformSpec).default_transforms;
        }
        return [];
    }

    // * Rest of Component from the original code
    component_type!: _Components;

    // Name of the component type ('reader', 'parser', 'writer'). Override in subclasses.

    static supported: string[] = [];
    // Name and aliases for this component.  Override in subclasses.

    get supported(): string[] {
        return (this.constructor as typeof Component).supported;
    }
    /**
     * Is `format` supported by this component?
     *
     * To be used by transforms to ask the dependent component if it supports
     * a certain input context or output format.
     */
    public supports(format: string): boolean {
        return this.supported.includes(format);
    }
}