import * as en from './languages/en.js';
import { RSTLanguage } from "./types.js";

export function getLanguage(languageCode: string): RSTLanguage | undefined {
    if (languageCode === 'en') {
        return en;
    }
    return undefined;
}
