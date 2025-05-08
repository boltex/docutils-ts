export class TransformSpec {
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

    public toString(): string {
        return `TransformSpec<${this.constructor.name}>`;
    }
}