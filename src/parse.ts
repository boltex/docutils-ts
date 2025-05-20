import newDocument from './newDocument.js';
import restParse from './fn/restructuredText.js';
import { Settings } from "./settings.js";
import { getDefaultSettings } from "./settingsHelper.js";
import { Document, LoggerType } from "./types.js";
import { NoOpLogger } from './noOpLogger.js';

export interface ParseOptions {
    logger?: LoggerType;
    settings?: Settings;
}

/**
 * Parse a REST document. This function uses getDefaualtSettings if settings parameter
 * is undefined.
 */
function parse(
    docSource: string,
    options: ParseOptions,
): Document {
    const opt = { ...(options || {}) };
    const logger = opt.logger || new NoOpLogger();
    const lSettings: Settings = opt.settings || { ...getDefaultSettings() };
    const document = newDocument({ logger, sourcePath: '' }, lSettings);
    return restParse(docSource, document, logger);
}

export { parse };
export default parse;
