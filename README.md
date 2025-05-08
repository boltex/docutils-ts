# docutils-ts

**Docutils for TypeScript** – a TypeScript port of the core functionality of Python's [Docutils](https://docutils.sourceforge.io/), starting with `publishString()`.

This library aims to bring [reStructuredText](https://docutils.sourceforge.io/rst.html) processing and publishing capabilities to the JavaScript/TypeScript ecosystem — useful for documentation tools, markdown-like text processing and more.

It is intended to work in a browser and in NodeJS.

This library only contains the API implementation and no front-end tools nor Python Source Reader implementations.

This API is in flux, because a straight port of the docutils interfaces is not appropriate for a TS API. JS does not have native IO - this is provided via the host in some way. Node provides its own fs module, and web browsers of course have many other ways of getting RST input, from XMLHttpRequest/fetch to extracting text from the current document or a form input (e.g. textarea).

Further, moving the IO responsibilities up the stack ensures that deferred/asynchronous execution is handled outside of the docutils-ts module itself, improving the developer experience.

📝 See `SPECIFICATION.md` for detailed project goals and design decisions, and `TODO.md` for short-term planning of features implementation.

> ⚠️ **Work in Progress**: This is an early-stage port and currently includes only a basic dummy version of `publishString()` for testing and scaffolding purposes.

To contribute, modify and/or build this project yourself, clone it, and with node installed, run `npm install` to get all dependencies, and then run `tsc` to build.

**To import and use this library in your project, see the instructions below.**

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
const html = docutils.core.publish_string({ source: "Hello world" });
```

```ts
import { core, frontend, writers, nodes } from "docutils-ts";
const html = core.publish_string({ source: "Hello world" });
```

### Sub components usage example

All following import usage examples are valid:

```ts
import { get_language } from "docutils-ts/languages";
const lang = get_language("en");
```

```ts
import { languages } from "docutils-ts";
const lang = languages.get_language("en");
```

```ts
import * as docutils from "docutils-ts";
const lang = docutils.languages.get_language("en");
```

## 🙏 Acknowledgements

This project is inspired by the pioneering work of the late [Kay McCormick](https://github.com/kaymccormick), who started the `docutils-js` and `docutils-typescript` projects back in 2019. Her efforts laid the groundwork for bringing Docutils functionality to the JavaScript ecosystem.

## 📄 License

[MIT](./LICENSE)
