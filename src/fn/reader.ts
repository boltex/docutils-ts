import parse from '../parse.js';
import { Settings } from "../settings.js";
import { Document } from '../types.js';

function read(input: string, settings: Settings): Document | undefined {
    return parse(input, { settings });
}

export default read;
