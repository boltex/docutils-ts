import { InvalidStateError } from '../exceptions.js';
import { SettingsSpecType } from '../types.js';
import BaseWriter from '../writer.js';

/**
 * Simple internal document tree Writer, writes indented pseudo-XML.
 */
export default class pseudoxml extends BaseWriter {

    public configSection = 'pseudoxml writer';
    public configSectionDependencies = ['writers'];

    public settingsSpec: SettingsSpecType[] = [
        [
            '"Docutils pseudo-XML" Writer Options',
            null,
            [
                [
                    'Pretty-print <#text> nodes.',
                    [
                        '--detailed'
                    ],
                    {
                        action: 'store_true',
                        validator: 'frontend.validate_boolean'
                    }
                ],
            ]
        ]
    ];

    public translate(): Promise<void> {
        if (this.document === undefined) {
            throw new InvalidStateError('No document');

        }
        this.output = this.document.pformat();
        return Promise.resolve();
    }

    public supports(format: string): boolean {
        // This writer supports all format-specific elements.
        return true;
    }

}
