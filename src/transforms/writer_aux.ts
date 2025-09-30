import Transform from '../transform.js';
import * as languages from "../languages/index.js";
import { nodes } from '../index.js';

/**
 * Transform specific admonitions, like this:
 *
 *     <note>
 *         <paragraph>
 *              Note contents ...
 *
 * into generic admonitions, like this::
 *
 *     <admonition classes="note">
 *         <title>
 *             Note
 *         <paragraph>
 *             Note contents ...
 *
 * The admonition title is localized.
 */
export class Admonitions extends Transform {

    public apply(): void {
        const language = languages.getLanguage(this.document.settings.languageCode, this.document.reporter)!;

        for (const node of this.document.traverse({ condition: nodes.Admonition })) {
            const nodeName = (node.constructor as any).name;
            // Set class, so that we know what node this admonition came from.
            (node.attributes.classes as string[]).push(nodeName);
            if (!(node instanceof nodes.admonition)) {
                // Specific admonition.  Transform into a generic admonition.
                const admonition = new nodes.admonition(node.rawsource, node.children, { ...node.attributes });
                const title = new nodes.title('', language.labels[nodeName]);
                admonition.insert(0, title);
                node.replaceSelf(admonition);
            }

        }
    }

}

Admonitions.defaultPriority = 920;

// Original python:
/*
"""
Auxiliary transforms mainly to be used by Writer components.

This module is called "writer_aux" because otherwise there would be
conflicting imports like this one::

    from docutils import writers
    from docutils.transforms import writers
"""
from __future__ import annotations

__docformat__ = 'reStructuredText'

from docutils import nodes, languages
from docutils.transforms import Transform


class Admonitions(Transform):

    """
    Transform specific admonitions, like this:

        <note>
            <paragraph>
                 Note contents ...

    into generic admonitions, like this::

        <admonition classes="note">
            <title>
                Note
            <paragraph>
                Note contents ...

    The admonition title is localized.
    """

    default_priority = 920

    def apply(self) -> None:
        language = languages.get_language(self.document.settings.language_code,
                                          self.document.reporter)
        for node in self.document.findall(nodes.Admonition):
            node_name = node.__class__.__name__
            # Set class, so that we know what node this admonition came from.
            node['classes'].append(node_name)
            if not isinstance(node, nodes.admonition):
                # Specific admonition.  Transform into a generic admonition.
                admonition = nodes.admonition(node.rawsource, *node.children,
                                              **node.attributes)
                title = nodes.title('', language.labels[node_name])
                admonition.insert(0, title)
                node.replace_self(admonition)

*/