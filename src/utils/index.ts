// A simplistic Reporter that logs to console
export class Reporter {
    info(message: string): void {
        console.log('[INFO]', message);
    }

    warning(message: string): void {
        console.warn('[WARNING]', message);
    }

    protected log(prefix: string, message: string): void {
        console.log(prefix, message);
    }
}

// Equivalent to the Python normalize_language_tag function
export function normalize_language_tag(tag: string): string[] {
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
