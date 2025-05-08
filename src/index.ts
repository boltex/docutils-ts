/*
This is the docutils-ts package, a TypeScript port of the Docutils package.

Package Structure
=================

Modules:

- __init__.ts: Contains component base classes, exception classes, and
  Docutils version information.

- core.ts: Contains the ``Publisher`` class and ``publish_*()`` convenience
  functions.

- frontend.ts: Runtime settings (command-line interface, configuration files)
  processing, for Docutils front-ends.

- io.ts: Provides a uniform API for low-level input and output.

- nodes.ts: Docutils document tree (doctree) node class library.

- statemachine.ts: A finite state machine specialized for
  regular-expression-based text filters.

Subpackages:

- languages: Language-specific mappings of terms.

- parsers: Syntax-specific input parser modules or packages.

- readers: Context-specific input handlers which understand the data
  source and manage a parser.

- transforms: Modules used by readers and writers to modify
  the Docutils document tree.

- utils: Contains the ``Reporter`` system warning class and miscellaneous
  utilities used by readers, writers, and transforms.

  utils/urischemes.ts: Contains a complete mapping of known URI addressing
  scheme names to descriptions.

- utils/math: Contains functions for conversion of mathematical notation
  between different formats (LaTeX, MathML, text, ...).

- writers: Format-specific output translators.
 */

import * as core from './core.js';
import * as languages from './languages/index.js';
import * as utils from './utils/index.js';
import * as parsers from './parsers/index.js';
import * as readers from './readers/index.js';
import * as writers from './writers/index.js';
import * as nodes from './nodes.js';
import * as transforms from './transforms/index.js';
import { Component } from './components.js';
import { Settings } from './settings.js';
import { SettingsSpec } from './settingsSpec.js';
import { TransformSpec } from './transformSpec.js';

// Re-export all the core classes and modules
export {
    Settings, SettingsSpec, TransformSpec, Component, core, languages, utils, parsers, readers, writers, nodes, transforms
};