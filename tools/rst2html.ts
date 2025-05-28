#!/usr/bin/env node
import fs from 'fs';

import { fileSystem, publishCmdLine } from '../src/core.js'
import { defaultDescription } from '../src/constants.js';

console.log('test rst2html with file system implementation');
fileSystem.setImplementation({
    writeFile: fs.promises.writeFile,
    readFile: fs.promises.readFile,
})

const description = `Generates (X)HTML documents from standalone reStructuredText sources.  ${defaultDescription}`;

publishCmdLine({ writerName: "html", description });
