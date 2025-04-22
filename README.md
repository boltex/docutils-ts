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
import { publishString } from "docutils-ts";

const rst = `
My Header
=========

Some **bold** text and *italic* text.
`;

const html = publishString(rst);
console.log(html);
```

Currently, this will return:

```html
<p>[docutils-ts] received: My Header...</p>
```

## 📄 License

[MIT](./LICENSE)
