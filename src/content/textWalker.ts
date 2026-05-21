import { shouldSkipElement } from "../shared/domGuards";

/**
 * TreeWalker を使うのは、「対象の本文テキストだけを一筆書きで拾う」ため。
 *
 * querySelectorAll で要素単位にたどるより、テキストノードを直接抽出した方が
 * DOM 変換対象を限定しやすく、余計なラッパー挿入も避けられる。
 */
export function collectTextNodes(root: Node): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) {
        return NodeFilter.FILTER_REJECT;
      }

      if (shouldSkipElement(parent)) {
        return NodeFilter.FILTER_REJECT;
      }

      const text = node.textContent ?? "";
      if (!text.trim()) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    }
  });

  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  return nodes;
}
