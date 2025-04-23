import { normalize_language_tag, Reporter } from '../utils';
import * as en from './en';
import * as fr from './fr';
import * as es from './es';
// Add more languages as needed

interface LanguageModule {
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

export class LanguageImporter {
    private cache: Record<string, LanguageModule | undefined> = {};
    private warn_msg =
        'Language "%s" not supported: Docutils-generated text will be in English.';
    private fallback = 'en';

    constructor(private reporter?: Reporter) { }

    private check_content(module: any): void {
        if (
            typeof module.labels !== 'object' ||
            typeof module.bibliographic_fields !== 'object' ||
            !Array.isArray(module.author_separators)
        ) {
            throw new Error('Invalid module structure');
        }
    }

    public get(language_code: string): LanguageModule | undefined {
        if (this.cache[language_code]) {
            return this.cache[language_code];
        }

        for (let tag of normalize_language_tag(language_code)) {
            tag = tag.replace(/-/g, '_');
            const module = allLanguages[tag];
            if (module) {
                try {
                    this.check_content(module);
                    this.cache[language_code] = module;
                    if (this.reporter && language_code !== 'en') {
                        this.reporter.info(`Using ${tag} for language "${language_code}".`);
                    }
                    return module;
                } catch (_) { }
            }
        }

        if (this.reporter) {
            this.reporter.warning(this.warn_msg.replace('%s', language_code));
        }

        const fallbackModule = allLanguages[this.fallback];
        if (fallbackModule) {
            this.cache[language_code] = fallbackModule;
        }
        return fallbackModule;
    }
}

export const get_language = new LanguageImporter();
