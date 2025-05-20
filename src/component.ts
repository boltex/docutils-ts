import TransformSpec from './transformSpec.js';
import { TransformType } from './types.js';

/**
 * Base class for docutils components.
 * Extends TransformSpec, which itself extends SettingsSpec. Thus all
 * docutils components inherit numerous properties and "capabilities"
 * from this inheritance chain. All should probably be combined into
 * a single class since nothing is gained from having the inheritance
 * hierarchy.
 */
class Component extends TransformSpec {
    public supported: string[] = [];
    public componentType: string = 'random';
    public toString(): string {
        return `Component<${this.constructor.name}>`;
    }
    public getTransforms(): TransformType[] {
        return [];
    }
}

export default Component;