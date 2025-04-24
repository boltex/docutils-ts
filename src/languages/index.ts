import { normalize_language_tag, Reporter } from '../utils/index.js';
import * as en from './en.js';
import * as fr from './fr.js';
import * as es from './es.js';
// Add more languages as needed

export interface LanguageModule {
    labels: Record<string, string>;
    bibliographic_fields: Record<string, string>;
    author_separators: string[];
}

const allLanguages: Record<string, LanguageModule> = {
    en,
    fr,
    es,
    // Add more preloaded modules here
};

function check_content(module: any): void {
    if (
        typeof module.labels !== 'object' ||
        typeof module.bibliographic_fields !== 'object' ||
        !Array.isArray(module.author_separators)
    ) {
        throw new Error('Invalid module structure');
    }
}

export function get_language(
    language_code: string,
    reporter?: Reporter
): LanguageModule | undefined {
    for (let tag of normalize_language_tag(language_code)) {
        tag = tag.replace(/-/g, '_');
        const module = allLanguages[tag];
        if (module) {
            try {
                check_content(module);
                if (reporter && language_code !== 'en') {
                    reporter.info?.(`Using ${tag} for language "${language_code}".`);
                }
                return module;
            } catch (_) { }
        }
    }

    if (reporter) {
        reporter.warning?.(
            `Language "${language_code}" not supported: Docutils-generated text will be in English.`
        );
    }

    return allLanguages['en'];
}
