const skippedTags = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "CODE",
  "PRE",
  "KBD",
  "SAMP",
  "SVG",
  "CANVAS",
  "MATH",
  "IFRAME",
  "VIDEO",
  "AUDIO",
  "RUBY",
  "RT",
  "RP"
]);

function hasHiddenStyle(element: Element): boolean {
  const style = window.getComputedStyle(element);
  return style.display === "none" || style.visibility === "hidden";
}

/**
 * 読みやすさ補助は「本文を壊さない」ことを最優先にする。
 *
 * 入力欄・コードブロック・非表示要素・既に変換済みの領域を先に除外しておくと、
 * DOM の副作用を後から打ち消すよりも安全で、ページ互換性の事故を減らせる。
 */
export function shouldSkipElement(element: Element | null): boolean {
  if (!element) {
    return true;
  }

  if (element.closest("[data-readability-enhanced='true']")) {
    return true;
  }

  if (element.closest("[contenteditable='true'], [aria-hidden='true']")) {
    return true;
  }

  let current: Element | null = element;
  while (current) {
    if (skippedTags.has(current.tagName)) {
      return true;
    }

    if (hasHiddenStyle(current)) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
}

/**
 * activeTab ベースの拡張では、Chrome 内部ページなど注入不能な URL を
 * UI 側で早めに弾く方が、実行エラーを後段で解釈するより分かりやすい。
 */
export function isSupportedPage(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  return !(
    url.startsWith("https://chromewebstore.google.com/") ||
    url.startsWith("https://chrome.google.com/webstore") ||
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("view-source:") ||
    /\.pdf([?#].*)?$/i.test(url)
  );
}
