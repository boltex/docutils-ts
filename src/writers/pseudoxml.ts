import { InvalidStateError } from '../exceptions.js';
import BaseWriter from '../writer.js';

/**
 * Simple internal document tree Writer, writes indented pseudo-XML.
 */
export default class pseudoxml extends BaseWriter {

    public configSection = 'pseudoxml writer';
    public configSectionDependencies = ['writers'];

    public translate(): void {
        if (this.document === undefined) {
            throw new InvalidStateError('No document');

        }
        this.output = this.document.pformat();
    }

    public supports(format: string): boolean {
        // This writer supports all format-specific elements.
        return true;
    }

}

// * ORIGINAL PYTHON CODE
/*

"""
Simple internal document tree Writer, writes indented pseudo-XML.
"""

__docformat__ = 'reStructuredText'


from docutils import writers, frontend


class Writer(writers.Writer):

    supported = ('pseudoxml', 'pprint', 'pformat')
    """Formats this writer supports."""

    settings_spec = (
        '"Docutils pseudo-XML" Writer Options',
        None,
        (('Pretty-print <#text> nodes.',
          ['--detailed'],
          {'action': 'store_true', 'validator': frontend.validate_boolean}),
         )
        )

    config_section = 'pseudoxml writer'
    config_section_dependencies = ('writers',)

    output = None
    """Final translated form of `document`."""

    def translate(self) -> None:
        self.output = self.document.pformat()

    def supports(self, format) -> bool:
        """This writer supports all format-specific elements."""
        return True


*/