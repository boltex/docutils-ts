import { Settings } from "./settings.js";

const defaultErrorEncodingErrorHandler = 'backslashreplace';

/**
 * Default settings.
 * This *is* useful because of the complex manner in which docutils-python
 * collects and sets defaults, via an imported command argument parser.
 *
 * Defaults from various components have been extracted and placed into the
 * default export which is your basic Object container.
 */
const defaultSettings: Settings = {
    tocBacklinks: 'entry',
    footnoteBacklinks: true,
    reportLevel: 2,
    haltLevel: 4,
    exitStatusLevel: 5,
    debug: false,
    traceback: null,
    inputEncodingErrorHandler: 'strict',
    outputEncoding: 'utf-8',
    outputEncodingErrorHandler: 'strict',
    errorEncodingErrorHandler: defaultErrorEncodingErrorHandler,
    errorEncoding: 'utf-8',
    languageCode: 'en',
    recordDependencies: null,
    idPrefix: '',
    autoIdPrefix: 'id',
    dumpSettings: null,
    dumpInternals: null,
    dumpTransforms: null,
    dumpPseudoXml: null,
    strictVisitor: null,
    warningStream: undefined,
    // html writer
    mathOutput: 'HTML math.css',
    initialHeaderLevel: 1,
    tableStyle: '',
};
export default defaultSettings;
