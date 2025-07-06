/**
 * Escapes special XML characters in a string.
 * Exactly matches Python's xml.sax.saxutils.escape behavior.
 * 
 * @param s The string to escape
 * @param entities Optional additional entities to replace
 * @returns The escaped string
 */
export function escape(s: string, entities: Record<string, string> = {}): string {
    // First replace ampersands, then < and >
    let result = s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Apply any additional entity replacements
    for (const [char, replacement] of Object.entries(entities)) {
        const regex = new RegExp(char, 'g');
        result = result.replace(regex, replacement);
    }

    return result;
}

/**
 * Quotes and escapes a string for use as an XML attribute value.
 * Exactly matches Python's xml.sax.saxutils.quoteattr behavior.
 * 
 * @param s The string to quote and escape
 * @param entities Optional additional entities to replace
 * @returns The quoted and escaped string
 */
export function quoteattr(s: string, entities: Record<string, string> = {}): string {
    // Add quote entities to the provided entities
    const allEntities = {
        ...entities,
        '"': '&quot;',
    };

    // First escape the string with all entities
    let escaped = escape(s, allEntities);

    // If the string contains single quotes but no double quotes,
    // we can use double quotes for wrapping
    if (escaped.includes("'") && !escaped.includes('"')) {
        return `"${escaped}"`;
    }

    // If the string contains double quotes but no single quotes,
    // we can use single quotes for wrapping
    if (escaped.includes('"') && !escaped.includes("'")) {
        return `'${escaped}'`;
    }

    // If we have both types of quotes or neither, prefer double quotes
    // but escape any double quotes in the string
    escaped = escaped.replace(/"/g, '&quot;');
    return `"${escaped}"`;
}