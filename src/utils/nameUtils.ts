/**
 * Return a whitespace-normalized name.
 */
export function whitespaceNormalizeName(name: string): string {
    return name.replace(/\s+/, " ");
}

export function fullyNormalizeName(name: string): string {
    return name.toLowerCase().replace(/\s+/, " ");
}
