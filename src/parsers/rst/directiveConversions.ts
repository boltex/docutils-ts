import { ValueError } from "../../exceptions.js";
import { escape2null, pySplit, splitEscapedWhitespace } from "../../utils.js";
import * as nodes from "../../nodes.js";

/**
 * Length units that are supported by the reStructuredText parser.
 *
 * Corresponds to the length units in CSS3.
 *
 * https://www.w3.org/TR/css-values-3/#lengths
 */
const CSS3_LENGTH_UNITS = ['em', 'ex', 'ch', 'rem', 'vw', 'vh', 'vmin', 'vmax',
    'cm', 'mm', 'Q', 'in', 'pt', 'pc', 'px'];

function flag(argument: string): null {
    /**
     * Check for a valid flag option (no argument) and return `null`.
     * (Directive option conversion function.)
     *
     * Raise `ValueError` if an argument is found.
     */
    if (argument && argument.trim()) {
        throw new ValueError(`no argument is allowed; "${argument}" supplied`);
    }
    return null;
}

function unchangedRequired(argument: string): string {
    /**
     * Return the argument text, unchanged.
     *
     * Directive option conversion function for options that require a value.
     *
     * Raise `ValueError` if no argument is found.
     */
    if (argument == null) {
        throw new ValueError('argument required but none supplied');
    }
    return argument; // unchanged!
}

function path(argument: string): string {
    /**
     * Return the path argument unwrapped (with newlines removed).
     * (Directive option conversion function.)
     *
     * Raise `ValueError` if no argument is found.
     */
    if (argument == null) {
        throw new ValueError('argument required but none supplied');
    } else {
        return argument.split('\n').map(s => s.trim()).join('');
    }
}

function uri(argument: string) {
    if (argument == null) {
        throw new ValueError('argument required but none supplied');
    }
    const parts = splitEscapedWhitespace(escape2null(argument));
    const uri = parts.map(part => pySplit(unescape(part)).join('')).join(' ');
    return uri;
}

function nonnegativeInt(argument: string): number {
    /**
     * Check for a nonnegative integer argument; raise `ValueError` if not.
     * (Directive option conversion function.)
     */
    const value = parseInt(argument, 10);
    if (value < 0) {
        throw new ValueError('negative value; must be positive or zero');
    }
    return value;
}

function percentage(argument: string): number {
    /**
     * Check for an integer percentage value with optional percent sign.
     * (Directive option conversion function.)
     */
    try {
        argument = argument.trim().replace(/ %$/, '');
    } catch (e) {
        // Ignore if argument is not a string
    }
    return nonnegativeInt(argument);
}

function getMeasure(argument: string, units: string[]): string | undefined {
    // Parse the measure into value and unit parts
    const match = new RegExp(`^([0-9.]+) *(${units.join('|')})$`).exec(argument);

    if (!match) {
        throw new ValueError(
            'not a positive number or measure of one of the following units:\n'
            + units.filter(u => u).join(', ')
        );
    }

    const value = parseFloat(match[1]);
    const unit = match[2];

    // Check for negative values
    if (value < 0 || !units.includes(unit)) {
        throw new ValueError(
            'not a positive number or measure of one of the following units:\n'
            + units.filter(u => u).join(', ')
        );
    }

    // Return normalized "<value><unit>" without space between them
    return `${value}${unit}`;
}

function unchanged(argument?: string): any {
    if (argument == null) {
        return '';
    } else {
        return argument;
    }
}

function lengthOrUnitless(argument: string): any {
    return getMeasure(argument, [...CSS3_LENGTH_UNITS, '']);
}

function lengthOrPercentageOrUnitless(argument: string, defaultVal = ''): any {
    try {
        return getMeasure(argument, [...CSS3_LENGTH_UNITS, '%']) || defaultVal;
    } catch (error) {
        try {
            return getMeasure(argument, ['']) + defaultVal;
        } catch (e) {
            throw error;
        }
    }

}

/**
 *  Convert the argument into a list of ID-compatible strings and return it.
 *  (Directive option conversion function.)
 * 
 *  Raise ``ValueError`` if no argument is found.
 */
function classOption(argument: string): string[] {
    if (argument == null) {
        throw new ValueError('argument required but none supplied');
    }
    const names = argument.split(/\s+/);
    const classNames: string[] = [];
    for (const name of names) {
        const className = nodes.makeId(name);
        if (!className) {
            throw new ValueError(`cannot make "${name}" into a class name`);
        }
        classNames.push(className);
    }
    return classNames;
}

function unicodeCode(code: string): string {
    /**
     * Convert a Unicode character code to a Unicode character.
     * (Directive option conversion function.)
     * * Codes may be decimal numbers, hexadecimal numbers (prefixed by `0x`,
     *   `x`, `\x`, `U+`, `u`, or `\u`; e.g. `U+262E`), or XML-style
     *   numeric character entities (e.g. `&#x262E;`).  Other text remains as-is.
     * * Raise `ValueError` for illegal Unicode code values.
     */
    try {
        if (/^\d+$/.test(code)) { // decimal number
            return String.fromCharCode(parseInt(code, 10));
        } else {
            const match = code.match(/(?:0x|x|\\x|U\+?|\\u)([0-9a-f]+)$/i) ||
                code.match(/&#x([0-9a-f]+);$/i);
            if (match) { // hex number
                const value = match[1];
                return String.fromCharCode(parseInt(value, 16));
            } else { // other text
                return code;
            }
        }
    } catch (e) {
        throw new ValueError(`code too large (${e})`);
    }
}

function singleCharOrUnicode(argument: string): string {
    /**
     * A single character is returned as-is.  Unicode character codes are
     * converted as in `unicodeCode`.  (Directive option conversion function.)
     */
    const char = unicodeCode(argument);
    if (char.length > 1) {
        throw new ValueError(`${char} invalid; must be a single character or a Unicode code`);
    }
    return char;
}

function singleCharOrWhitespaceOrUnicode(argument: string): string {
    /**
     * As with `singleCharOrUnicode`, but "tab" and "space" are also supported.
     * (Directive option conversion function.)
     */
    if (argument === 'tab') {
        return '\t';
    } else if (argument === 'space') {
        return ' ';
    } else {
        return singleCharOrUnicode(argument);
    }
}

function positiveInt(argument: string): number {
    /**
     * Converts the argument into an integer.  Raises `ValueError` for negative,
     * zero, or non-integer values.  (Directive option conversion function.)
     */
    const value = parseInt(argument, 10);
    if (value < 1) {
        throw new ValueError('negative or zero value; must be positive');
    }
    return value;
}

function positiveIntList(argument: string): number[] {
    /**
     * Converts a space- or comma-separated list of values into a Python list
     * of integers.
     * (Directive option conversion function.)
     *
     * Raises `ValueError` for non-positive-integer values.
     */
    const entries = argument.includes(',') ? argument.split(',') : argument.split(/\s+/);
    return entries.map(entry => positiveInt(entry));
}

function encoding(argument: string): string {
    /**
     * Verifies the encoding argument by lookup.
     * (Directive option conversion function.)
     *
     * Raises `ValueError` for unknown encodings.
     */
    try {
        // Just check if valid, but return original argument
        new TextDecoder(argument);
        return argument;
    } catch (e) {
        throw new ValueError(`unknown encoding: "${argument}"`);
    }
}

/*
 * Directive option utility function, supplied to enable options whose
 * argument must be a member of a finite set of possible values (must be
 * lower case).  A custom conversion function must be written to use it.  For
 * example::
 *
 *     from docutils.parsers.rst import directives
 *
 *     def yesno(argument):
 *         return directives.choice(argument, ('yes', 'no'))
 *
 * Raise ``ValueError`` if no argument is found or if the argument's value is
 * not valid (not an entry in the supplied list).
 */
function formatValues(values: string[]): string {
    if (values.length === 0) return '';
    if (values.length === 1) return `"${values[0]}"`;

    const allButLast = values.slice(0, -1).map(v => `"${v}"`).join(', ');
    const last = values[values.length - 1];
    return `${allButLast}, or "${last}"`;
}

function choice(argument: string, values: string[]): string {
    // Check if argument is undefined/null (Python raises AttributeError)
    if (argument == null) {
        throw new ValueError(`must supply an argument; choose from ${formatValues(values)}`);
    }

    try {
        const value = argument.toLowerCase().trim();
        if (values.indexOf(value) !== -1) {
            return value;
        } else {
            throw new ValueError(`"${argument}" unknown; choose from ${formatValues(values)}`);
        }
    } catch (e) {
        // In case argument is not a string (similar to Python's AttributeError)
        if (e instanceof TypeError) {
            throw new ValueError(`must supply an argument; choose from ${formatValues(values)}`);
        }
        throw e;
    }
}

export {
    flag,
    unchangedRequired,
    unchanged,
    path,
    uri,
    nonnegativeInt,
    percentage,
    lengthOrUnitless,
    lengthOrPercentageOrUnitless,
    classOption,
    unicodeCode,
    singleCharOrUnicode,
    singleCharOrWhitespaceOrUnicode,
    positiveInt,
    positiveIntList,
    encoding,
    choice
};


// Original Python code for reference:

/*

def flag(argument: str) -> None:
    """
    Check for a valid flag option (no argument) and return ``None``.
    (Directive option conversion function.)

    Raise ``ValueError`` if an argument is found.
    """
    if argument and argument.strip():
        raise ValueError('no argument is allowed; "%s" supplied' % argument)
    else:
        return None


def unchanged_required(argument: str) -> str:
    """
    Return the argument text, unchanged.

    Directive option conversion function for options that require a value.

    Raise ``ValueError`` if no argument is found.
    """
    if argument is None:
        raise ValueError('argument required but none supplied')
    else:
        return argument  # unchanged!


def unchanged(argument: str) -> str:
    """
    Return the argument text, unchanged.
    (Directive option conversion function.)

    No argument implies empty string ("").
    """
    if argument is None:
        return ''
    else:
        return argument  # unchanged!


def path(argument: str) -> str:
    """
    Return the path argument unwrapped (with newlines removed).
    (Directive option conversion function.)

    Raise ``ValueError`` if no argument is found.
    """
    if argument is None:
        raise ValueError('argument required but none supplied')
    else:
        return ''.join(s.strip() for s in argument.splitlines())


def uri(argument: str) -> str:
    """
    Return the URI argument with unescaped whitespace removed.
    (Directive option conversion function.)

    Raise ``ValueError`` if no argument is found.
    """
    if argument is None:
        raise ValueError('argument required but none supplied')
    else:
        parts = split_escaped_whitespace(escape2null(argument))
        return ' '.join(''.join(nodes.unescape(part).split())
                        for part in parts)


def nonnegative_int(argument: str) -> int:
    """
    Check for a nonnegative integer argument; raise ``ValueError`` if not.
    (Directive option conversion function.)
    """
    value = int(argument)
    if value < 0:
        raise ValueError('negative value; must be positive or zero')
    return value


def percentage(argument: str) -> int:
    """
    Check for an integer percentage value with optional percent sign.
    (Directive option conversion function.)
    """
    try:
        argument = argument.rstrip(' %')
    except AttributeError:
        pass
    return nonnegative_int(argument)


CSS3_LENGTH_UNITS = ('em', 'ex', 'ch', 'rem', 'vw', 'vh', 'vmin', 'vmax',
                     'cm', 'mm', 'Q', 'in', 'pt', 'pc', 'px')
"""Length units that are supported by the reStructuredText parser.

Corresponds to the `length units in CSS3`__.

__ https://www.w3.org/TR/css-values-3/#lengths
"""

length_units = [*CSS3_LENGTH_UNITS]
"""Deprecated, will be removed in Docutils 0.24 or equivalent."""


def get_measure(argument, units):
    """
    Check for a positive argument of one of the `units`.

    Return a normalized string of the form "<value><unit>"
    (without space inbetween).

    To be called from directive option conversion functions.
    """
    value, unit = nodes.parse_measure(argument)
    if value < 0 or unit not in units:
        raise ValueError(
            'not a positive number or measure of one of the following units:\n'
            + ', '.join(u for u in units if u))
    return f'{value}{unit}'


def length_or_unitless(argument: str) -> str:
    return get_measure(argument, CSS3_LENGTH_UNITS + ('',))


def length_or_percentage_or_unitless(argument, default=''):
    """
    Return normalized string of a length or percentage unit.
    (Directive option conversion function.)

    Add <default> if there is no unit. Raise ValueError if the argument is not
    a positive measure of one of the valid CSS units (or without unit).

    >>> length_or_percentage_or_unitless('3 pt')
    '3pt'
    >>> length_or_percentage_or_unitless('3%', 'em')
    '3%'
    >>> length_or_percentage_or_unitless('3')
    '3'
    >>> length_or_percentage_or_unitless('3', 'px')
    '3px'
    """
    try:
        return get_measure(argument, CSS3_LENGTH_UNITS + ('%',))
    except ValueError as error:
        try:
            return get_measure(argument, ['']) + default
        except ValueError:
            raise error


def class_option(argument: str) -> list[str]:
    """
    Convert the argument into a list of ID-compatible strings and return it.
    (Directive option conversion function.)

    Raise ``ValueError`` if no argument is found.
    """
    if argument is None:
        raise ValueError('argument required but none supplied')
    names = argument.split()
    class_names = []
    for name in names:
        class_name = nodes.make_id(name)
        if not class_name:
            raise ValueError('cannot make "%s" into a class name' % name)
        class_names.append(class_name)
    return class_names


unicode_pattern = re.compile(
    r'(?:0x|x|\\x|U\+?|\\u)([0-9a-f]+)$|&#x([0-9a-f]+);$', re.IGNORECASE)


def unicode_code(code):
    r"""
    Convert a Unicode character code to a Unicode character.
    (Directive option conversion function.)

    Codes may be decimal numbers, hexadecimal numbers (prefixed by ``0x``,
    ``x``, ``\x``, ``U+``, ``u``, or ``\u``; e.g. ``U+262E``), or XML-style
    numeric character entities (e.g. ``&#x262E;``).  Other text remains as-is.

    Raise ValueError for illegal Unicode code values.
    """
    try:
        if code.isdigit():                  # decimal number
            return chr(int(code))
        else:
            match = unicode_pattern.match(code)
            if match:                       # hex number
                value = match.group(1) or match.group(2)
                return chr(int(value, 16))
            else:                           # other text
                return code
    except OverflowError as detail:
        raise ValueError('code too large (%s)' % detail)


def single_char_or_unicode(argument: str) -> str:
    """
    A single character is returned as-is.  Unicode character codes are
    converted as in `unicode_code`.  (Directive option conversion function.)
    """
    char = unicode_code(argument)
    if len(char) > 1:
        raise ValueError('%r invalid; must be a single character or '
                         'a Unicode code' % char)
    return char


def single_char_or_whitespace_or_unicode(argument: str) -> str:
    """
    As with `single_char_or_unicode`, but "tab" and "space" are also supported.
    (Directive option conversion function.)
    """
    if argument == 'tab':
        char = '\t'
    elif argument == 'space':
        char = ' '
    else:
        char = single_char_or_unicode(argument)
    return char


def positive_int(argument: str) -> int:
    """
    Converts the argument into an integer.  Raises ValueError for negative,
    zero, or non-integer values.  (Directive option conversion function.)
    """
    value = int(argument)
    if value < 1:
        raise ValueError('negative or zero value; must be positive')
    return value


def positive_int_list(argument: str) -> list[int]:
    """
    Converts a space- or comma-separated list of values into a Python list
    of integers.
    (Directive option conversion function.)

    Raises ValueError for non-positive-integer values.
    """
    if ',' in argument:
        entries = argument.split(',')
    else:
        entries = argument.split()
    return [positive_int(entry) for entry in entries]


def encoding(argument: str) -> str:
    """
    Verifies the encoding argument by lookup.
    (Directive option conversion function.)

    Raises ValueError for unknown encodings.
    """
    try:
        codecs.lookup(argument)
    except LookupError:
        raise ValueError('unknown encoding: "%s"' % argument)
    return argument


def choice(argument, values):
    """
    Directive option utility function, supplied to enable options whose
    argument must be a member of a finite set of possible values (must be
    lower case).  A custom conversion function must be written to use it.  For
    example::

        from docutils.parsers.rst import directives

        def yesno(argument: str):
            return directives.choice(argument, ('yes', 'no'))

    Raise ``ValueError`` if no argument is found or if the argument's value is
    not valid (not an entry in the supplied list).
    """
    try:
        value = argument.lower().strip()
    except AttributeError:
        raise ValueError('must supply an argument; choose from %s'
                         % format_values(values))
    if value in values:
        return value
    else:
        raise ValueError('"%s" unknown; choose from %s'
                         % (argument, format_values(values)))


def format_values(values) -> str:
    return '%s, or "%s"' % (', '.join('"%s"' % s for s in values[:-1]),
                            values[-1])


def value_or(values: Sequence[str], other: type) -> Callable:
    """
    Directive option conversion function.

    The argument can be any of `values` or `argument_type`.
    """
    def auto_or_other(argument: str):
        if argument in values:
            return argument
        else:
            return other(argument)
    return auto_or_other


def parser_name(argument: str) -> type[parsers.Parser]:
    """
    Return a docutils parser whose name matches the argument.
    (Directive option conversion function.)

    Return `None`, if the argument evaluates to `False`.
    Raise `ValueError` if importing the parser module fails.
    """
    if not argument:
        return None
    try:
        return parsers.get_parser_class(argument)
    except ImportError as err:
        raise ValueError(str(err))

*/