import BaseReader from '../reader.js';
import * as references from '../transforms/references.js';
import * as frontmatter from '../transforms/frontmatter.js';

/* Ported from code written by David Goodger <goodger@python.org>
   by Kay McCormick <kay@kaymccormick.com>.

   Copyright: This file licensed under the MIT license.

   Standalone file StandaloneReader for the reStructuredText markup syntax.
*/

export default class StandaloneReader extends BaseReader {
    public constructor(args: any) {
        super(args);

        /** Contexts this reader supports. */
        this.supported = ['standalone'];

        /** A single document tree. */
        this.document = undefined;

        this.configSection = 'standalone reader';
        this.configSectionDependencies = ['readers'];
    }

    public getTransforms(): any[] {
        const s = super.getTransforms();
        const r = [
            ...s,
            references.PropagateTargets,
            frontmatter.DocTitle,
            frontmatter.SectionSubTitle,
            frontmatter.DocInfo
        ];
        return r;
    }

}

export { StandaloneReader };
