import * as core from './core.js';
import * as languages from './languages/index.js';
import * as utils from './utils/index.js';
import * as parsers from './parsers/index.js';
import * as readers from './readers/index.js';
import * as writers from './writers/index.js';
import * as nodes from './nodes.js';
import * as transforms from './transforms/index.js';
import { SettingsSpec, TransformSpec, Component } from './__init__.js';

// Re-export all the core classes and modules
export {
    SettingsSpec, TransformSpec, Component, core, languages, utils, parsers, readers, writers, nodes, transforms
};