/**
 * Lexical analysis of formal languages (i.e. code) using  highlight.js instead of Pygments.
 */


export type SyntaxHighlightMode = 'long' | 'short' | 'none';
export type Token = [string[], string]; // [classes, value]


export class LexerError extends Error { }


// --- Lexer generator (plain text version) ----------------------------------


/**
* Generator that yields `[classes, value]` tuples.
* This placeholder version simply yields the entire code as plain text,
* ignoring the language and syntaxHighlight arguments.
*/
export function* Lexer(
    code: string,
    language: string | undefined,
    syntaxHighlight: SyntaxHighlightMode = 'long'
): Generator<Token> {
    // Always yield the text as a single token without classes.
    yield [[], code];
}


// --- NumberLines filter ----------------------------------------------------


/**
* Insert linenumber-tokens at the start of every code line.
*
* Arguments
*
*    tokens    -- iterable of ``(classes, value)`` tuples
*    startline -- first line number
*    endline   -- last line number
*
* Iterating over an instance yields the tokens with a
* ``(['ln'], '<the line number>')`` token added for every code line.
* Multi-line tokens are split.
*/
export function* NumberLines(
    tokens: Generator<Token>,
    startLine = 1,
    endLine = 1
): Generator<Token> {
    let lineno = startLine;
    const padWidth = String(endLine).length;
    const fmt = (n: number) => n.toString().padStart(padWidth, ' ') + ' ';

    // Emit first line number
    yield [['ln'], fmt(lineno)];

    for (const [classes, value] of tokens) {
        const lines = value.split('\n');

        // All but last line (preserve newlines)
        for (let i = 0; i < lines.length - 1; i++) {
            yield [classes, lines[i] + '\n'];
            lineno++;
            yield [['ln'], fmt(lineno)];
        }

        // Last line (no extra line number unless another newline follows)
        if (lines.length > 0) {
            yield [classes, lines[lines.length - 1]];
        }
    }
}

//Original Python
/*
"""Lexical analysis of formal languages (i.e. code) using Pygments."""

from __future__ import annotations

__docformat__ = 'reStructuredText'

try:
    import pygments
    from pygments.lexers import get_lexer_by_name
    from pygments.formatters.html import _get_ttype_class
    with_pygments = True
except ImportError:
    with_pygments = False

from docutils import ApplicationError

# Filter the following token types from the list of class arguments:
unstyled_tokens = ['token',  # Token (base token type)
                   'text',   # Token.Text
                   '']       # short name for Token and Text
# (Add, e.g., Token.Punctuation with ``unstyled_tokens += 'punctuation'``.)


class LexerError(ApplicationError):
    pass


class Lexer:
    """Parse `code` lines and yield "classified" tokens.

    Arguments

      code       -- string of source code to parse,
      language   -- formal language the code is written in,
      tokennames -- either 'long', 'short', or 'none' (see below).

    Merge subsequent tokens of the same token-type.

    Iterating over an instance yields the tokens as ``(tokentype, value)``
    tuples. The value of `tokennames` configures the naming of the tokentype:

      'long':  downcased full token type name,
      'short': short name defined by pygments.token.STANDARD_TYPES
               (= class argument used in pygments html output),
      'none':  skip lexical analysis.
    """

    def __init__(self, code, language, tokennames='short') -> None:
        """
        Set up a lexical analyzer for `code` in `language`.
        """
        self.code = code
        self.language = language
        self.tokennames = tokennames
        self.lexer = None
        # get lexical analyzer for `language`:
        if language in ('', 'text') or tokennames == 'none':
            return
        if not with_pygments:
            raise LexerError('Cannot analyze code. '
                             'Pygments package not found.')
        try:
            self.lexer = get_lexer_by_name(self.language)
        except pygments.util.ClassNotFound:
            raise LexerError('Cannot analyze code. '
                             'No Pygments lexer found for "%s".' % language)
        # self.lexer.add_filter('tokenmerge')
        # Since version 1.2. (released Jan 01, 2010) Pygments has a
        # TokenMergeFilter. # ``self.merge(tokens)`` in __iter__ could
        # be replaced by ``self.lexer.add_filter('tokenmerge')`` in __init__.
        # However, `merge` below also strips a final newline added by pygments.
        #
        # self.lexer.add_filter('tokenmerge')

    def merge(self, tokens):
        """Merge subsequent tokens of same token-type.

           Also strip the final newline (added by pygments).
        """
        tokens = iter(tokens)
        (lasttype, lastval) = next(tokens)
        for ttype, value in tokens:
            if ttype is lasttype:
                lastval += value
            else:
                yield lasttype, lastval
                (lasttype, lastval) = (ttype, value)
        lastval = lastval.removesuffix('\n')
        if lastval:
            yield lasttype, lastval

    def __iter__(self):
        """Parse self.code and yield "classified" tokens.
        """
        if self.lexer is None:
            yield [], self.code
            return
        tokens = pygments.lex(self.code, self.lexer)
        for tokentype, value in self.merge(tokens):
            if self.tokennames == 'long':  # long CSS class args
                classes = str(tokentype).lower().split('.')
            else:  # short CSS class args
                classes = [_get_ttype_class(tokentype)]
            classes = [cls for cls in classes if cls not in unstyled_tokens]
            yield classes, value


class NumberLines:
    """Insert linenumber-tokens at the start of every code line.

    Arguments

       tokens    -- iterable of ``(classes, value)`` tuples
       startline -- first line number
       endline   -- last line number

    Iterating over an instance yields the tokens with a
    ``(['ln'], '<the line number>')`` token added for every code line.
    Multi-line tokens are split."""

    def __init__(self, tokens, startline, endline) -> None:
        self.tokens = tokens
        self.startline = startline
        # pad linenumbers, e.g. endline == 100 -> fmt_str = '%3d '
        self.fmt_str = f'%{len(str(endline))}d '

    def __iter__(self):
        lineno = self.startline
        yield ['ln'], self.fmt_str % lineno
        for ttype, value in self.tokens:
            lines = value.split('\n')
            for line in lines[:-1]:
                yield ttype, line + '\n'
                lineno += 1
                yield ['ln'], self.fmt_str % lineno
            yield ttype, lines[-1]


*/

