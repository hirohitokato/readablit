import type { ReadablitSettings } from "../types/readablit";

const styleElementId = "readablit-style";
const rootClassName = "readability-enhanced-root";

function ensureStyleElement(): HTMLStyleElement {
  const existing = document.getElementById(styleElementId);
  if (existing instanceof HTMLStyleElement) {
    return existing;
  }

  const style = document.createElement("style");
  style.id = styleElementId;
  style.textContent = `
    :root {
      --readability-line-height: 1.8;
      --readability-word-spacing: 0.25em;
      --readability-ruby-font-size: 0.55em;
    }

    .${rootClassName} {
      line-height: var(--readability-line-height) !important;
    }

    [data-readability-enhanced="true"] {
      line-height: var(--readability-line-height) !important;
    }

    .readability-token {
      display: inline;
      margin-inline-end: var(--readability-word-spacing);
    }

    .readability-token.readability-no-spacing {
      margin-inline-end: 0;
    }

    .readability-token.readability-punctuation {
      margin-inline-end: 0.05em;
    }

    .readability-token ruby rt {
      font-size: var(--readability-ruby-font-size);
      line-height: 1;
      user-select: none;
    }
  `;

  document.documentElement.appendChild(style);
  return style;
}

/**
 * スタイルは inline style を各ノードへばら撒かず、CSS 変数へ集約して調整する。
 *
 * これにより、設定変更時に多数のノードを書き換えずに済み、再適用コストと
 * ページ側スタイルとの衝突点を最小化できる。
 */
export function applyStyleSettings(settings: ReadablitSettings): void {
  ensureStyleElement();
  document.documentElement.classList.add(rootClassName);
  document.documentElement.style.setProperty("--readability-line-height", String(settings.lineHeight));
  document.documentElement.style.setProperty("--readability-word-spacing", `${settings.wordSpacingEm}em`);
  document.documentElement.style.setProperty("--readability-ruby-font-size", `${settings.rubyFontSizeEm}em`);
}

export function resetStyleSettings(): void {
  document.documentElement.classList.remove(rootClassName);
  document.documentElement.style.removeProperty("--readability-line-height");
  document.documentElement.style.removeProperty("--readability-word-spacing");
  document.documentElement.style.removeProperty("--readability-ruby-font-size");
}
