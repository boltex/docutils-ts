# docutils-ts

**Docutils for TypeScript** – a TypeScript port of the core functionality of Python's [Docutils](https://docutils.sourceforge.io/), starting with `publishString()`.

This library aims to bring [reStructuredText](https://docutils.sourceforge.io/rst.html) processing and publishing capabilities to the JavaScript/TypeScript ecosystem — useful for documentation tools, markdown-like text processing and more!

> ⚠️ **Work in Progress**: This is an early-stage port and currently includes only a basic dummy version of `publishString()` for testing and scaffolding purposes.

---

## ✨ Install

```bash
npm install docutils-ts
```

## 🚀 Usage

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

Currently, this will return:

```html
<p>[docutils-ts] received: My Header...</p>
```

**Note**: You can import docutils as a whole or its components separately:

```ts
import * as docutils from "docutils-ts";
docutils.core.publish_string({ source: "Hello world" });
```

```ts
import { core, frontend, writers, nodes } from "docutils-ts";
core.publish_string({ source: "Hello world" });
```

### Sub components usage example

```ts
import { LanguageImporter } from "docutils-ts/languages";

const lang = new LanguageImporter("en");
console.log(lang.labels.note); // ➜ "Note"
```

## 📄 License

[MIT](./LICENSE)
