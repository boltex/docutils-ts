import BaseReader from '../reader.js';
import * as references from '../transforms/references.js';
import * as frontmatter from '../transforms/frontmatter.js';
import * as misc from '../transforms/misc.js';
import * as frontend from '../frontend.js';
import { SettingsSpecType, TransformType } from '../types.js';

/* Ported from code written by David Goodger <goodger@python.org>
   by Kay McCormick <kay@kaymccormick.com>.

   Copyright: This file licensed under the MIT license.

   Standalone file StandaloneReader for the reStructuredText markup syntax.
*/

export default class StandaloneReader extends BaseReader {

    public settingsSpec: SettingsSpecType[] = [
        [
            'Standalone Reader Options',
            null,
            [
                ['Disable the promotion of a lone top-level section title to document title (and subsequent section title to document subtitle promotion; enabled by default).',
                    ['--no-doc-title'],
                    {
                        dest: 'doctitle_xform',
                        action: 'store_false',
                        default: true,
                        validator: frontend.validateBoolean
                    }
                ],
                [
                    'Disable the bibliographic field list transform (enabled by default).',
                    ['--no-doc-info'],
                    {
                        dest: 'docinfo_xform',
                        action: 'store_false',
                        default: true,
                        validator: frontend.validateBoolean
                    }
                ],
                [
                    'Activate the promotion of lone subsection titles to section subtitles (disabled by default).',
                    ['--section-subtitles'],
                    {
                        dest: 'sectsubtitle_xform',
                        action: 'store_true',
                        default: false,
                        validator: frontend.validateBoolean
                    }
                ],
                [
                    'Deactivate the promotion of lone subsection titles.',
                    ['--no-section-subtitles'],
                    {
                        dest: 'sectsubtitle_xform',
                        action: 'store_false'
                    }
                ],
            ]
        ]
    ];

    public constructor(args: any) {
        super(args);

        /** Contexts this reader supports. */
        this.supported = ['standalone'];

        /** A single document tree. */
        this.document = undefined;

        this.configSection = 'standalone reader';
        this.configSectionDependencies = ['readers'];
    }

    public getTransforms(): TransformType[] {
        const s = super.getTransforms();
        const r = [
            ...s,
            references.PropagateTargets,
            frontmatter.DocTitle,
            frontmatter.SectionSubTitle,
            frontmatter.DocInfo,
            misc.Transitions,
            // TODO : Finish and add more transforms
        ];
        return r;
    }


    /*
    def get_transforms(self):
        return super().get_transforms() + [
            references.Substitutions,
            references.PropagateTargets,
            frontmatter.DocTitle,
            frontmatter.SectionSubTitle,
            frontmatter.DocInfo,
            references.AnonymousHyperlinks,
            references.IndirectHyperlinks,
            references.Footnotes,
            references.ExternalTargets,
            refwerences.InternalTargets,
            references.DanglingReferences,
            misc.Transitions,
            ]

    */

}

export { StandaloneReader };
