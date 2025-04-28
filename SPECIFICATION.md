# Specification

This document is the design specifications for the **docutils-ts** library, the TypeScript port of Docutils Python library.

## Docutils Project Model

Project components and data flow:

```text
                 +---------------------------+
                 |        Docutils:          |
                 | docutils.core.Publisher,  |
                 | docutils.core.publish_*() |
                 +---------------------------+
                  /            |            \
                 /             |             \
        1,3,5   /        6     |              \ 7
       +--------+       +-------------+       +--------+
       | READER | ----> | TRANSFORMER | ====> | WRITER |
       +--------+       +-------------+       +--------+
        /     \\                                  |
       /       \\                                 |
 2    /      4  \\                             8  |
+-------+   +--------+                        +--------+
| INPUT |   | PARSER |                        | OUTPUT |
+-------+   +--------+                        +--------+
```

The numbers above each component indicate the path a document's data takes. Double-width lines between Reader & Parser and between Transformer & Writer indicate that data sent along these paths should be standard (pure & unextended) Docutils doc trees. Single-width lines signify that internal tree extensions or completely unrelated representations are possible, but they must be supported at both ends.

## Publisher

The docutils.core module contains a "Publisher" facade class and several convenience functions: "publish_cmdline()" (for command-line front ends), "publish_file()" (for programmatic use with file-like I/O), and "publish_string()" (for programmatic use with string I/O). The Publisher class encapsulates the high-level logic of a Docutils system. The Publisher class has overall responsibility for processing, controlled by the `Publisher.publish()` method:

1. Set up internal settings (may include config files & command-line options) and I/O objects.
2. Call the Reader object to read data from the source Input object and parse the data with the Parser object. A document object is returned.
3. Set up and apply transforms via the Transformer object attached to the document.
4. Call the Writer object which translates the document to the final output format and writes the formatted data to the destination Output object. Depending on the Output object, the output may be returned from the Writer, and then from the `publish()` method.

Calling the "publish" function (or instantiating a "Publisher" object) with component names will result in default behavior. For custom behavior (customizing component settings), create custom component objects first, and pass _them_ to the Publisher or `publish_*` convenience functions.

## Readers

Readers understand the input context (where the data is coming from), send the whole input or discrete "chunks" to the parser, and provide the context to bind the chunks together back into a cohesive whole.

Each reader is a module or package exporting a "Reader" class with a "read" method. The base "Reader" class can be found in the `docutils/readers/index.ts` module.

Most Readers will have to be told what parser to use. So far (see the list of examples below), only the Python Source Reader ("PySource"; still incomplete) will be able to determine the parser on its own.

Responsibilities:

- Get input text from the source I/O.
- Pass the input text to the parser, along with a fresh [document tree](#document-tree) root.

Examples:

- Standalone (Raw/Plain): Just read a text file and process it. The reader needs to be told which parser to use.

- The "Standalone Reader" has been implemented in module `docutils.readers.standalone`.

- Email: [RFC-822](https://tools.ietf.org/html/rfc822.html) headers, quoted excerpts, signatures, MIME parts.

- Wiki: Global reference lookups of "wiki links" incorporated into transforms. (CamelCase only or unrestricted?) Lazy indentation?

- Web Page: As standalone, but recognize meta fields as meta tags. Support for templates of some sort? (After `<body>`, before `</body>`?)

- FAQ: Structured "question & answer(s)" constructs.

- Compound document: Merge chapters into a book. Master manifest file?

## Parsers

Parsers analyze their input and produce a Docutils [document tree](#document-tree). They don't know or care anything about the source or destination of the data.

Each input parser is a module or package exporting a "Parser" class with a "parse" method. The base "Parser" class can be found in the `docutils/parsers/index.ts` module.

Responsibilities: Given raw input text and a doctree root node, populate the doctree by parsing the input text.

Example: The only parser implemented so far is for the reStructuredText markup. It is implemented in the `docutils/parsers/rst/` package.

The development and integration of other parsers is possible and encouraged.

## Transformer

The Transformer class, in `docutils/transforms/index.ts`, stores transforms and applies them to documents. A transformer object is attached to every new document tree. The [Publisher](#publisher) calls `Transformer.apply_transforms()` to apply all stored transforms to the document tree. Transforms change the document tree from one form to another, add to the tree, or prune it. Transforms resolve references and footnote numbers, process interpreted text, and do other context-sensitive processing.

Some transforms are specific to components (Readers, Parser, Writers, Input, Output). Standard component-specific transforms are specified in the `default_transforms` attribute of component classes. After the Reader has finished processing, the [Publisher](#publisher) calls `Transformer.populate_from_components()` with a list of components and all default transforms are stored.

Each transform is a class in a module in the `docutils/transforms/` package, a subclass of `docutils.tranforms.Transform`. Transform classes each have a `default_priority` attribute which is used by the Transformer to apply transforms in order (low to high). The default priority can be overridden when adding transforms to the Transformer object.

Transformer responsibilities:

- Apply transforms to the document tree, in priority order.
- Store a mapping of component type name ('reader', 'writer', etc.) to component objects. - These are used by certain transforms (such as "components.Filter") to determine suitability.

Transform responsibilities:

- Modify a doctree in-place, either purely transforming one structure into another, or adding new structures based on the doctree and/or external data.

Examples of transforms (in the `docutils/transforms/` package):

- frontmatter.DocInfo: Conversion of document metadata (bibliographic information).
- references.AnonymousHyperlinks: Resolution of anonymous references to corresponding targets.
- parts.Contents: Generates a table of contents for a document.
- document.Merger: Combining multiple populated doctrees into one. (Not yet implemented or fully understood.)
- document.Splitter: Splits a document into a tree-structure of subdocuments, perhaps by section. It will have to transform references appropriately. (Neither implemented not remotely understood.)
- components.Filter: Includes or excludes elements which depend on a specific Docutils component.

## Writers

Writers produce the final output (HTML, XML, TeX, etc.). Writers translate the internal [document tree](#document-tree) structure into the final data format, possibly running Writer-specific [transforms](#transformer) first.

By the time the document gets to the Writer, it should be in final form. The Writer's job is simply (and only) to translate from the Docutils doctree structure to the target format. Some small transforms may be required, but they should be local and format-specific.

Each writer is a module or package exporting a "Writer" class with a "write" method. The base "Writer" class can be found in the `docutils/writers/index.ts` module.

Responsibilities:

- Translate doctree(s) into specific output formats.
  - Transform references into format-native forms.
- Write the translated output to the destination I/O.

Examples:

- XML: Various forms, such as:
  - Docutils XML (an expression of the internal document tree, implemented as `docutils.writers.docutils_xml`).
  - DocBook (being implemented in the Docutils sandbox).
- HTML (XHTML 1.4 transitional implemented as `docutils.writers.html4css1`).
- PDF (a ReportLabs interface is being developed in the Docutils sandbox).
- LaTeX (implemented as `docutils.writers.latex2e`).
- Docutils-native pseudo-XML (implemented as `docutils.writers.pseudoxml`, used for testing).
- Plain text
- reStructuredText?

## Input/Output

I/O classes provide a uniform API for low-level input and output. Subclasses will exist for a variety of input/output mechanisms. However, they can be considered an implementation detail. Most applications should be satisfied using one of the convenience functions associated with the [Publisher](#publisher).

Responsibilities:

- Read data from the input source (Input objects) or write data to the output destination (Output objects).

Examples of input sources:

- A single file on disk or a stream (implemented as `docutils.io.FileInput`).
- Python strings, as received from a client application (implemented as `docutils.io.StringInput`).

Examples of output destinations:

- A single file on disk or a stream (implemented as `docutils.io.FileOutput`).
- A tree of directories and files on disk.
- A Python string, returned to a client application (implemented as `docutils.io.StringOutput`).
- No output; useful for programmatic applications where only a portion of the normal output is to be used (implemented as `docutils.io.NullOutput`).
- A single tree-shaped data structure in memory.
- Some other set of data structures in memory.

# Docutils Package Structure

- Package "docutils".

  - Module "index.ts" contains: class "Component", a base class for Docutils components; class "SettingsSpec", a base class for specifying runtime settings (used by docutils.frontend); and class "TransformSpec", a base class for specifying transforms.

  - Module "docutils.core" contains facade class "Publisher" and convenience functions. See [Publisher](#publisher) above.

  - Module "docutils.frontend" provides runtime settings support, for programmatic use and front-end tools (including configuration file support, and command-line argument and option processing).

  - Module "docutils.io" provides a uniform API for low-level input and output. See [Input/Output](#inputoutput) above.

  - Module "docutils.nodes" contains the Docutils document tree element class library plus tree-traversal Visitor pattern base classes. See [Document Tree](#document-tree) below.

  - Module "docutils.statemachine" contains a finite state machine specialized for regular-expression-based text filters and parsers. The reStructuredText parser implementation is based on this module.

  - Module "docutils.urischemes" contains a mapping of known URI schemes ("http", "ftp", "mail", etc.).

  - Module "docutils.utils" contains utility functions and classes, including a logger class ("Reporter"; see [Error Handling](#error-handling) below).

  - Package "docutils.parsers": markup [parsers](#parsers).

    - Function "get_parser_class(parser_name)" returns a parser module by name. Class "Parser" is the base class of specific parsers. (`docutils/parsers/index.ts`)
    - Package "docutils.parsers.rst": the reStructuredText parser.
    - Alternate markup parsers may be added.

    See [Parsers](#parsers) above.

  - Package "docutils.readers": context-aware input readers.

    - Function "get_reader_class(reader_name)" returns a reader module by name or alias. Class "Reader" is the base class of specific readers. (`docutils/readers/index.ts`)
    - Module "docutils.readers.standalone" reads independent document files.
    - Module "docutils.readers.pep" reads PEPs (Python Enhancement Proposals).
    - Module "docutils.readers.doctree" is used to re-read a previously stored document tree for reprocessing.
    - Readers to be added for: Python source code (structure & docstrings), email, FAQ, and perhaps Wiki and others.

    See [Readers](#readers) above.

  - Package "docutils.writers": output format writers.

    - Function "get_writer_class(writer_name)" returns a writer module by name. Class "Writer" is the base class of specific writers. (`docutils/writers/index.ts`)
    - Package "docutils.writers.html4css1" is a simple HyperText Markup Language document tree writer for HTML 4.01 and CSS1.
    - Package "docutils.writers.pep_html" generates HTML from reStructuredText PEPs.
    - Package "docutils.writers.s5_html" generates S5/HTML slide shows.
    - Package "docutils.writers.latex2e" writes LaTeX.
    - Package "docutils.writers.newlatex2e" also writes LaTeX; it is a new implementation.
    - Module "docutils.writers.docutils_xml" writes the internal document tree in XML form.
    - Module "docutils.writers.pseudoxml" is a simple internal document tree writer; it writes indented pseudo-XML.
    - Module "docutils.writers.null" is a do-nothing writer; it is used for specialized purposes such as storing the internal document tree.
    - Writers to be added: HTML 3.2 or 4.01-loose, XML (various forms, such as DocBook), PDF, plaintext, reStructuredText, and perhaps others.

    Subpackages of "docutils.writers" contain modules and data files (such as stylesheets) that support the individual writers.

    See [Writers](#writers) above.

  - Package "docutils.transforms": tree transform classes.

    - Class "Transformer" stores transforms and applies them to document trees. (`docutils/transforms/index.ts`)
    - Class "Transform" is the base class of specific transforms. (`docutils/transforms/index.ts`)
    - Each module contains related transform classes.

    See [Transforms](#transformer) above.

  - Package "docutils.languages": Language modules contain language-dependent strings and mappings. They are named for their language identifier converting dashes to underscores.

    - Function "get_language(language_code)", returns matching language module. (`docutils/languages/index.ts`)
    - Modules: en.ts (English), de.ts (German), fr.ts (French), it.ts (Italian), sk.ts (Slovak), sv.ts (Swedish).
    - Other languages to be added.

# Document Tree

A single intermediate data structure is used internally by Docutils, in the interfaces between components; it is defined in the `docutils.nodes` module. It is not required that this data structure be used _internally_ by any of the components, just _between_ components as outlined in the diagram in the [Docutils Project Model](#docutils-project-model) above.

Custom node types are allowed, provided that either (a) a transform converts them to standard Docutils nodes before they reach the Writer proper, or (b) the custom node is explicitly supported by certain Writers, and is wrapped in a filtered "pending" node. The HTML `<meta>` tag is an example of condition (b); it is supported by the HTML Writer but not by others. The reStructuredText "meta" directive creates a "pending" node, which contains knowledge that the embedded "meta" node can only be handled by HTML-compatible writers. The "pending" node is resolved by the `docutils.transforms.components.Filter` transform, which checks that the calling writer supports HTML; if it doesn't, the "pending" node (and enclosed "meta" node) is removed from the document.

The document tree data structure is similar to a DOM tree, but with specific node names (classes) instead of DOM's generic nodes. The schema is documented in an XML DTD (eXtensible Markup Language Document Type Definition), which comes in two parts:

- the Docutils Generic DTD, [docutils.dtd](https://docutils.sourceforge.io/docs/ref/docutils.dtd), and
- the OASIS Exchange Table Model, [soextbl.dtd](https://docutils.sourceforge.io/docs/ref/soextblx.dtd).

The DTD defines a rich set of elements, suitable for many input and output formats. The DTD retains all information necessary to reconstruct the original input text, or a reasonable facsimile thereof.

See The [Docutils Document Tree](https://docutils.sourceforge.io/docs/ref/doctree.html) for details (incomplete).

# Error Handling

When the parser encounters an error in markup, it inserts a system message (DTD element "system_message"). There are five levels of system messages:

- Level-0, "DEBUG": an internal reporting issue. There is no effect on the processing. Level-0 system messages are handled separately from the others.
- Level-1, "INFO": a minor issue that can be ignored. There is little or no effect on the processing. Typically level-1 system messages are not reported.
- Level-2, "WARNING": an issue that should be addressed. If ignored, there may be minor problems with the output. Typically level-2 system messages are reported but do not halt processing.
- Level-3, "ERROR": a major issue that should be addressed. If ignored, the output will contain unpredictable errors. Typically level-3 system messages are reported but do not halt processing.
- Level-4, "SEVERE": a critical error that must be addressed. Typically level-4 system messages are turned into exceptions which do halt processing. If ignored, the output will contain severe errors.

Although the initial message levels were devised independently, they have a strong correspondence to VMS error condition severity levels; the names in quotes for levels 1 through 4 were borrowed from VMS. Error handling has since been influenced by the log4j project.
