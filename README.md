# docutils-ts

**Docutils for TypeScript** – a TypeScript port of the core functionality of Python's [Docutils](https://docutils.sourceforge.io/) based on [Kay McCormick's original work](#-acknowledgements).

This library aims to bring [reStructuredText](https://docutils.sourceforge.io/rst.html) processing and publishing capabilities to the JavaScript/TypeScript ecosystem — useful for documentation tools, markdown-like text processing and more.

It is intended to work in a browser and in NodeJS.

It can be imported and used in your project, or used directly on the command line with its command-line utilities like **rst2html** and **rst2xml**.

## 🚦 Project Status

This project is a stabilized and functioning port of Kay McCormick's original work. Some advanced features are still being implemented.

**Current Status:**

- ✅ Core RST parsing and rendering
- ✅ HTML and XML output writers
- ✅ Command-line utilities
- 🔄 Directives (partially implemented)
- 🔄 Transformers (in progress)

Contributors are welcome to help complete the remaining features!

## ✨ Features

- **RST Parsing**: Convert reStructuredText documents into document trees
- **Multiple Output Formats**: Generate HTML, XML, and more from RST
- **Cross-Platform**: Works in both Node.js and browser environments
- **TypeScript-First**: Full type definitions for improved developer experience
- **Customizable**: Extensible architecture for custom writers and parsers
- **Command-Line Tools**: Ready-to-use utilities like `rst2html` and `rst2xml`

## Command-line Usage:

```
rst2html test.rst test.html
```

If no output provided, it will output to the terminal, so it can also be used with redirection operator.

```
rst2html test.rst > test.html
```

> 💡 **Sample Repository**: See the [docutils-ts-test](https://github.com/boltex/docutils-ts-test) repository for examples on how to include and use docutils-ts in your project.

## 📦 Installation

### NPM

```bash
npm install docutils-ts
```

### Yarn

```bash
yarn add docutils-ts
```

For command-line utilities, you may want to install globally:

```bash
npm install -g docutils-ts
```

## 🚀 Usage

### Basic Example

```ts
import { core } from "docutils-ts";

const rst = `
My Header
=========

Some **bold** text and *italic* text.
`;

const html = core.publish_string({ source: rst });
console.log(html);
```

## File I/O

JS does not have native IO - this is provided via the host. Node provides its own fs module, and web browsers of course have many other ways of getting RST input, from XMLHttpRequest/fetch to extracting text from the current document or a form input (e.g. textarea).

Further, moving the IO responsibilities up the stack ensures that deferred/asynchronous execution is handled outside of the docutils-ts module itself, improving the developer experience.

Unless you use string conversions only, you'll have to provide the file I/O implementation with the
provided `fileSystem.setImplementation` utility. (see [Usage](#nodejs-environment) below)

### Node.js Environment

When using file I/O in Node.js, you'll need to configure the file system:

```ts
import fs from "fs";
import { core } from "docutils-ts";

// Setup file system implementation
core.fileSystem.setImplementation({
  writeFile: fs.promises.writeFile,
  readFile: fs.promises.readFile,
});

// Now you can use functions that require file I/O ...
```

For instance, the frontend utilities like _rst2html_ setup the file system that way.

### Browser Environment

In browsers, you might implement file I/O differently:

```ts
import { core } from "docutils-ts";

// Example implementation using fetch
core.fileSystem.setImplementation({
  readFile: async (path) => {
    const response = await fetch(path);
    return response.text();
  },
  writeFile: async (path, content) => {
    // Handle file saving in browser context
    // (e.g., download, localStorage, or sending to server)
  },
});
```

**Note**: You can import docutils as a whole or its components separately:

```ts
import * as docutils from "docutils-ts";
const html = docutils.core.publish_string({ source: "Hello world" });
```

```ts
import { core, frontend, writers, nodes } from "docutils-ts";
const html = core.publish_string({ source: "Hello world" });
```

### Sub components usage example

All following import usage examples are valid:

```ts
import { getLanguage } from "docutils-ts/languages";
const lang = getLanguage("en");
```

```ts
import { languages } from "docutils-ts";
const lang = languages.getLanguage("en");
```

```ts
import * as docutils from "docutils-ts";
const lang = docutils.languages.getLanguage("en");
```

## 👥 Contributing

Contributions are welcome! This project aims to bring full reStructuredText capabilities to the TypeScript/JavaScript ecosystem.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `npm install`
4. Make your changes
5. Build the project: `npm run build` (or `tsc`)
6. Test your changes: `npm test`
7. Commit your changes: `git commit -m 'Add some amazing feature'`
8. Push to the branch: `git push origin feature/amazing-feature`
9. Open a Pull Request

See `TODO.md` or the [project's issues page](https://github.com/boltex/docutils-ts/issues) for features that need implementation and `SPECIFICATION.md` for design guidelines.

## 🙏 Acknowledgements

This project stands on the shoulders of:

- The late [Kay McCormick](https://github.com/kaymccormick), whose pioneering work on `docutils-js` and `docutils-typescript` in 2019 laid the essential groundwork for this project. This repository is a stabilized and enhanced continuation of her vision.
- The [Python Docutils](https://docutils.sourceforge.io/) team, who created the original implementation that this project ports to TypeScript.

## 📄 License

[MIT](./LICENSE)
