import type { AppliedState, KuromojiToken, ReadablitSettings } from "../types/readablit";
import { MAX_TEXT_LENGTH_PER_NODE, MAX_TEXT_NODES_PER_APPLY } from "../tokenizer/tokenTypes";
import { tokenizeText } from "../tokenizer/kuromojiTokenizer";
import { createRuby, shouldRenderRuby } from "./rubyRenderer";
import { applyStyleSettings, resetStyleSettings } from "./styleManager";
import { collectTextNodes } from "./textWalker";

const defaultAppliedState: AppliedState = {
  enabled: false,
  settings: null
};

let appliedState: AppliedState = defaultAppliedState;

function isPunctuation(value: string): boolean {
  return /^[。、，．！？!?）〕］｝」』】》〉：；,.)\]}]+$/.test(value);
}

function shouldSuppressSpacing(value: string): boolean {
  return (
    !value ||
    isPunctuation(value) ||
    /^\s+$/.test(value) ||
    /^(https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/.test(value) ||
    /^[0-9０-９.,]+$/.test(value)
  );
}

function renderToken(token: KuromojiToken, settings: ReadablitSettings): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = "readability-token";

  const surface = token.surface_form ?? "";
  if (isPunctuation(surface)) {
    span.classList.add("readability-punctuation");
  }

  if (!settings.spacingEnabled || shouldSuppressSpacing(surface)) {
    span.classList.add("readability-no-spacing");
  }

  if (shouldRenderRuby(token, settings) && token.reading) {
    span.appendChild(createRuby(surface, token.reading));
  } else {
    span.textContent = surface;
  }

  return span;
}

async function transformTextNode(textNode: Text, settings: ReadablitSettings): Promise<void> {
  const originalText = textNode.textContent ?? "";
  if (!originalText.trim() || originalText.length > MAX_TEXT_LENGTH_PER_NODE) {
    return;
  }

  const tokens = await tokenizeText(originalText);
  if (!tokens.length) {
    return;
  }

  const wrapper = document.createElement("span");
  wrapper.dataset.readabilityEnhanced = "true";
  wrapper.dataset.originalText = originalText;

  const fragment = document.createDocumentFragment();
  for (const token of tokens) {
    fragment.appendChild(renderToken(token, settings));
  }

  wrapper.appendChild(fragment);
  textNode.replaceWith(wrapper);
}

function nextIdle(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => resolve(), { timeout: 150 });
      return;
    }

    window.setTimeout(resolve, 0);
  });
}

export function getAppliedState(): AppliedState {
  return appliedState;
}

/**
 * 変換は必ず「原文へ戻せる」ことを保証する。
 *
 * 直接テキストを破壊的編集せず、元文字列を data 属性へ保持しておくと、
 * reset が単純になり、ページとの相性問題が起きた際にも確実に巻き戻せる。
 */
export function resetTransform(root: ParentNode = document.body): void {
  const enhancedNodes = root.querySelectorAll<HTMLElement>("[data-readability-enhanced='true']");

  for (const node of enhancedNodes) {
    const originalText = node.dataset.originalText;
    if (originalText == null) {
      continue;
    }

    node.replaceWith(document.createTextNode(originalText));
  }

  resetStyleSettings();
  appliedState = {
    enabled: false,
    settings: null
  };
}

/**
 * 一括変換でも UI スレッドを独占しないよう、一定件数ごとにブラウザへ制御を返す。
 *
 * 「完全に最速」より「ページ操作を阻害しない」を優先することで、
 * 拡張としての体感品質を守る設計にしている。
 */
export async function applyReadabilityTransform(settings: ReadablitSettings): Promise<void> {
  resetTransform(document.body);

  if (!settings.enabled) {
    return;
  }

  applyStyleSettings(settings);

  const textNodes = collectTextNodes(document.body).slice(0, MAX_TEXT_NODES_PER_APPLY);

  for (let index = 0; index < textNodes.length; index += 1) {
    await transformTextNode(textNodes[index], settings);

    if ((index + 1) % 25 === 0) {
      await nextIdle();
    }
  }

  appliedState = {
    enabled: true,
    settings: {
      enabled: true,
      wordSpacingEm: settings.wordSpacingEm,
      lineHeight: settings.lineHeight,
      rubyFontSizeEm: settings.rubyFontSizeEm,
      rubyEnabled: settings.rubyEnabled,
      spacingEnabled: settings.spacingEnabled
    }
  };
}
