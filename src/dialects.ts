import Papa, { ParseConfig } from 'papaparse';

/**
 * Constants to match Python's csv.QUOTE_* names.
 */
export enum CSVQuote {
    MINIMAL = 'minimal',
    ALL = 'all',
    NONNUMERIC = 'non-numeric',
    NONE = 'none',
}

/**
 * Common options used by DocutilsDialect.
 */
export interface CSVOptions {
    delim?: string;
    quote?: string;
    escape?: string;
    keepspace?: boolean;
}

/**
 * Base interface that matches a CSV "dialect" conceptually.
 * These properties are mostly compatible with PapaParse's config.
 */
export interface CSVDialect {
    delimiter: string;
    quotechar: string;
    escapechar?: string;
    doublequote: boolean;
    skipinitialspace: boolean;
    strict: boolean;
    lineterminator: string;
    quoting: CSVQuote;
}

/**
 * Equivalent of Python's DocutilsDialect class.
 * Represents the dialect used for the `csv-table` directive.
 */
export class DocutilsDialect implements CSVDialect {
    delimiter = ',';
    quotechar = '"';
    doublequote = true;
    skipinitialspace = true;
    strict = true;
    lineterminator = '\n';
    quoting = CSVQuote.MINIMAL;
    escapechar?: string;

    constructor(options?: CSVOptions) {
        if (options?.delim) {
            this.delimiter = options.delim;
        }
        if (options?.keepspace) {
            this.skipinitialspace = false;
        }
        if (options?.quote) {
            this.quotechar = options.quote;
        }
        if (options?.escape) {
            this.doublequote = false;
            this.escapechar = options.escape;
        }
    }

    /**
     * Return a PapaParse configuration derived from this dialect.
     */
    toPapaConfig<T = any>(extraConfig: Partial<ParseConfig<T>> = {}): ParseConfig<T> {
        return {
            delimiter: this.delimiter,
            quoteChar: this.quotechar,
            escapeChar: this.escapechar,
            skipEmptyLines: this.skipinitialspace,
            // PapaParse does not use some options directly (strict, lineterminator, quoting),
            // but we keep them for completeness.
            ...extraConfig,
        };
    }
}

/**
 * Equivalent of Python's HeaderDialect class.
 * (Deprecated in Docutils)
 */
export class HeaderDialect implements CSVDialect {
    delimiter = ',';
    quotechar = '"';
    escapechar = '\\';
    doublequote = false;
    skipinitialspace = true;
    strict = true;
    lineterminator = '\n';
    quoting = CSVQuote.MINIMAL;

    constructor() {
        console.warn(
            'HeaderDialect is deprecated and will be removed in a future version.'
        );
    }

    toPapaConfig<T = any>(extraConfig: Partial<ParseConfig<T>> = {}): ParseConfig<T> {
        return {
            delimiter: this.delimiter,
            quoteChar: this.quotechar,
            escapeChar: this.escapechar,
            skipEmptyLines: this.skipinitialspace,
            ...extraConfig,
        };
    }
}
