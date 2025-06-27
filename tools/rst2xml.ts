#!/usr/bin/env node
import fs from 'fs';

import { fileSystem, publishCmdLine } from '../src/core.js'
import { defaultDescription } from '../src/constants.js';
import { createLogger } from '../src/logger.js';

fileSystem.setImplementation({
    writeFile: fs.promises.writeFile,
    readFile: fs.promises.readFile,
})

const logger = createLogger({ level: 'debug', defaultMeta: { program: 'rst2xml' } });

const description = `Generates (X)HTML documents from standalone reStructuredText sources.  ${defaultDescription}`;

publishCmdLine({ logger, writerName: "xml", description })