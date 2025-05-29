#!/usr/bin/env node
import fs from 'fs';

import { fileSystem, publishCmdLine } from '../src/core.js'
import { defaultDescription } from '../src/constants.js';

fileSystem.setImplementation({
    writeFile: fs.promises.writeFile,
    readFile: fs.promises.readFile,
})

const description = `Generates (X)HTML documents from standalone reStructuredText sources.  ${defaultDescription}`;

await publishCmdLine({ writerName: "html", description });
