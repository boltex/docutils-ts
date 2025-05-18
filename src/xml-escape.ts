export function xmlescape(string: string, ignore?: string): string {
    var pattern;

    const map: Record<string, string> = {
        '>': '&gt;'
        , '<': '&lt;'
        , "'": '&apos;'
        , '"': '&quot;'
        , '&': '&amp;'
    }

    if (string === null || string === undefined) throw new Error('xmlescape: string is null or undefined');

    ignore = (ignore || '').replace(/[^&"<>\']/g, '');
    pattern = '([&"<>\'])'.replace(new RegExp('[' + ignore + ']', 'g'), '');

    return string.replace(new RegExp(pattern, 'g'), function (str, item: string) {
        return map[item];
    })
};
