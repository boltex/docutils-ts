import * as references from '../transforms/references.js';
import * as frontmatter from '../transforms/frontmatter.js';
import { baseReaderTransforms } from './baseReaderTransforms.js';
import { TransformType } from "../types.js";


const supported = ['standalone'];
const transforms = '';


function getTransforms(): TransformType[] {
    const s = baseReaderTransforms;

    const r = [
        ...s,
        references.PropagateTargets,
        frontmatter.DocTitle,
        frontmatter.SectionSubTitle,
        frontmatter.DocInfo
    ];
    return r as any; // TODO : fixme!
    /*
        return readers.StandaloneReader.get_transforms(self) + [
            references.Substitutions,
            references.PropagateTargets,
            frontmatter.DocTitle,
            frontmatter.SectionSubTitle,
            frontmatter.DocInfo,
            references.AnonymousHyperlinks,
            references.IndirectHyperlinks,
            references.Footnotes,
            references.ExternalTargets,
            references.InternalTargets,
            references.DanglingReferences,
            misc.Transitions,
            ]
    */
}
export { supported, transforms, getTransforms };
