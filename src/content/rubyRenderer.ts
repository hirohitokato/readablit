import type { KuromojiToken, ReadablitSettings } from "../types/readablit";

function katakanaToHiragana(value: string): string {
  return value.replace(/[\u30A1-\u30F6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

function containsKanji(value: string): boolean {
  return /\p{Script=Han}/u.test(value);
}

/**
 * ルビ表示は視認性の補助であり、原文の意味を書き換える機能ではない。
 * そのため、surface を本体に残しつつ reading だけを補助情報として重ねる。
 */
export function createRuby(surface: string, reading: string): HTMLElement {
  const ruby = document.createElement("ruby");
  ruby.appendChild(document.createTextNode(surface));

  const rt = document.createElement("rt");
  rt.textContent = katakanaToHiragana(reading);
  ruby.appendChild(rt);

  return ruby;
}

/**
 * ルビをむやみに付けると冗長になり可読性を落とすため、「漢字を含み」「読みがあり」
 * 「表層形と同一ではない」場合に限定している。
 */
export function shouldRenderRuby(token: KuromojiToken, settings: ReadablitSettings): boolean {
  return Boolean(
    settings.rubyEnabled &&
      token.surface_form &&
      containsKanji(token.surface_form) &&
      token.reading &&
      token.reading !== "*" &&
      token.surface_form !== token.reading
  );
}
