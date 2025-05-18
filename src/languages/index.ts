import { CoreLanguage, ReporterInterface } from '../types.js';
import * as af from './af.js';
import * as ar from './ar.js';
import * as ca from './ca.js';
import * as cs from './cs.js';
import * as da from './da.js';
import * as de from './de.js';
import * as en from './en.js';
import * as eo from './eo.js';
import * as es from './es.js';
import * as fa from './fa.js';
import * as fi from './fi.js';
import * as fr from './fr.js';
import * as gl from './gl.js';
import * as he from './he.js';
import * as it from './it.js';
import * as ja from './ja.js';
import * as ka from './ka.js';
import * as ko from './ko.js';
import * as lt from './lt.js';
import * as lv from './lv.js';
import * as nl from './nl.js';
import * as pl from './pl.js';
import * as pt_br from './pt_br.js';
import * as ru from './ru.js';
import * as sk from './sk.js';
import * as sv from './sv.js';
import * as uk from './uk.js';
import * as zh_cn from './zh_cn.js';
import * as zh_tw from './zh_tw.js';

const allLanguages: Record<string, CoreLanguage> = {
    af,
    ar,
    ca,
    cs,
    da,
    de,
    en,
    eo,
    es,
    fa,
    fi,
    fr,
    gl,
    he,
    it,
    ja,
    ka,
    ko,
    lt,
    lv,
    nl,
    pl,
    pt_br,
    ru,
    sk,
    sv,
    uk,
    zh_cn,
    zh_tw,
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

function normalize_language_tag(tag: string): string[] {
    // Normalize the tag: lowercase and replace hyphens with underscores
    tag = tag.toLowerCase().replace(/-/g, '_');

    // Replace single character subtags (e.g., _x_) with valid BCP 47 interpretation
    tag = tag.replace(/_([a-zA-Z0-9])_/g, '_$1-');

    const subtags = tag.split('_');
    const base = subtags.shift()!;
    const combinations: string[] = [];

    // Generate all combinations of subtags from longest to shortest
    for (let i = subtags.length; i > 0; i--) {
        for (let j = 0; j <= subtags.length - i; j++) {
            const slice = subtags.slice(j, j + i);
            combinations.push([base, ...slice].join('-'));
        }
    }

    combinations.push(base);
    return combinations;
}

export function getLanguage(
    language_code: string = 'en',
    reporter?: ReporterInterface
): CoreLanguage | undefined {
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
