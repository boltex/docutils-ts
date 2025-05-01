import * as core from './core.js';
import * as languages from './languages/index.js';
// TODO: import parsers, readers, etc.

// Define a tuple containing: help text (string), list of option strings, and a dictionary of keyword args.
type _OptionTuple = [string, string[], { [key: string]: any }];

// Define a type that can be:
// - A tuple of 3 elements
// - A tuple of 6 elements
// - A tuple of 9 elements
type _SettingsSpecTuple =
    | [string | null, string | null, _OptionTuple[]]
    | [string | null, string | null, _OptionTuple[], string | null, string | null, _OptionTuple[]]
    | [
        string | null, string | null, _OptionTuple[],
        string | null, string | null, _OptionTuple[],
        string | null, string | null, _OptionTuple[]
    ];

/**
 * Runtime setting specification base class.
 *
 * SettingsSpec subclass objects used by `docutils.frontend.OptionParser`.
 */
export class SettingsSpec {

    // Runtime settings specification. Override in subclasses.
    // This is a tuple of groups, each containing:
    // - Option group title (string or null)
    // - Description (string or null)
    // - Sequence of option tuples (help text, list of options, dictionary of keyword args)
    static settings_spec: _SettingsSpecTuple | null = null;

    // Dictionary of defaults for settings not in settings_spec.
    // Internal settings, inaccessible via CLI/config. Override in subclasses.
    static settings_defaults: { [key: string]: any } | null = null;

    // Auxiliary defaults overriding other components' settings_spec defaults.
    static settings_default_overrides: { [key: string]: any } | null = null;

    // Settings containing filesystem paths. Override in subclasses.
    // These are interpreted relative to the working directory.
    static relative_path_settings: string[] = [];

    // Name of the config file section specific to this component.
    // Lowercase, no brackets. Override in subclasses.
    static config_section: string | null = null;

    // Names of config sections to apply before config_section.
    // Ordered from general to specific. Override in subclasses.
    static config_section_dependencies: string[] | null = null;

    // Instance-level accessors
    get settings_spec(): _SettingsSpecTuple | null {
        return (this.constructor as typeof SettingsSpec).settings_spec;
    }

    set settings_spec(value: _SettingsSpecTuple | null) {
        (this.constructor as typeof SettingsSpec).settings_spec = value;
    }

    get settings_defaults(): { [key: string]: any } | null {
        return (this.constructor as typeof SettingsSpec).settings_defaults;
    }

    set settings_defaults(value: { [key: string]: any } | null) {
        (this.constructor as typeof SettingsSpec).settings_defaults = value;
    }

    get settings_default_overrides(): { [key: string]: any } | null {
        return (this.constructor as typeof SettingsSpec).settings_default_overrides;
    }

    set settings_default_overrides(value: { [key: string]: any } | null) {
        (this.constructor as typeof SettingsSpec).settings_default_overrides = value;
    }

    get relative_path_settings(): string[] {
        return (this.constructor as typeof SettingsSpec).relative_path_settings;
    }

    set relative_path_settings(value: string[]) {
        (this.constructor as typeof SettingsSpec).relative_path_settings = value;
    }

    get config_section(): string | null {
        return (this.constructor as typeof SettingsSpec).config_section;
    }

    set config_section(value: string | null) {
        (this.constructor as typeof SettingsSpec).config_section = value;
    }

    get config_section_dependencies(): string[] | null {
        return (this.constructor as typeof SettingsSpec).config_section_dependencies;
    }

    set config_section_dependencies(value: string[] | null) {
        (this.constructor as typeof SettingsSpec).config_section_dependencies = value;
    }
}

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
}

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
    component_type: any = undefined;

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

export { core, languages };

