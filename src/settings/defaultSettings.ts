import type { ReadablitSettings } from "../types/readablit";

export const settingsStorageKey = "readabilitySettings";

/**
 * デフォルト値は UI の初期値であるだけでなく、壊れた保存データを救済する基準でもある。
 *
 * 「使いやすい初期値」と「安全に巻き戻せる値」の両方を満たす必要があるため、
 * DOM を極端に崩しにくい控えめな数値を採用している。
 */
export const defaultSettings: ReadablitSettings = {
  enabled: false,
  wordSpacingEm: 0.25,
  lineHeight: 1.8,
  rubyFontSizeEm: 0.55,
  rubyEnabled: true,
  spacingEnabled: true
};
