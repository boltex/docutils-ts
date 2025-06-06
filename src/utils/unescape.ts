export default function unescape(text: string, restoreBackslashes = false, respectWhitespace = false): string {
    /*
    Return a string with nulls removed or restored to backslashes.
    Backslash-escaped spaces are also removed.
    */
    // `respect_whitespace` is ignored (since introduction 2016-12-16)if(

    if (restoreBackslashes) {
        return text.replace(/\\x00/g, '\\');
    }
    return ['\x00 ', '\x00\n', '\x00'].reduce((a, v): string => a.split(v).join(''), text || '');
}
