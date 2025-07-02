// ========================================
import { NodeInterface } from "./types.js";
import { xmlescape } from "./xml-escape.js";
import { Text } from "./nodes.js";

/**
 * convert a node to XML
 */
export function nodeToXml(node: NodeInterface): string {
    if (node instanceof Text) {
        const text = xmlescape(node.astext());
        return text;
    }
    if (node.hasChildren()) {
        return [node.starttag(), ...node.getChildren().map((c: NodeInterface): string => nodeToXml(c)), node.endtag()].join("");
    }
    return node.emptytag();
}
