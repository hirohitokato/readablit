const prefix = "[Readablit]";

/**
 * content script のログはページ側コンソールへ混ざるので、拡張由来の出力だと
 * 一目で分かる接頭辞を固定しておく。
 */
export function log(...args: unknown[]): void {
  console.log(prefix, ...args);
}

export function error(...args: unknown[]): void {
  console.error(prefix, ...args);
}
