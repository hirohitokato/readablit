import { defaultSettings, settingsStorageKey } from "./defaultSettings";
import type { ReadablitSettings } from "../types/readablit";

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const next = Number(value);

  if (!Number.isFinite(next)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, next));
}

/**
 * ストレージはユーザー更新や将来の互換変更で不正値が混ざりうる前提で扱う。
 *
 * 保存時にも読み込み時にも同じ正規化を通すことで、UI・ストレージ・適用処理の
 * どこを経由しても必ず同じ設定レンジへ収束するようにしている。
 */
export function normalizeSettings(raw: Partial<ReadablitSettings> = {}): ReadablitSettings {
  return {
    enabled: raw.enabled === true,
    wordSpacingEm: clampNumber(raw.wordSpacingEm, 0, 1, defaultSettings.wordSpacingEm),
    lineHeight: clampNumber(raw.lineHeight, 1, 3, defaultSettings.lineHeight),
    rubyFontSizeEm: clampNumber(raw.rubyFontSizeEm, 0.3, 1, defaultSettings.rubyFontSizeEm),
    rubyEnabled: raw.rubyEnabled !== false,
    spacingEnabled: raw.spacingEnabled !== false
  };
}

export async function loadSettings(): Promise<ReadablitSettings> {
  const result = await chrome.storage.sync.get(settingsStorageKey);
  return normalizeSettings(result[settingsStorageKey] as Partial<ReadablitSettings> | undefined);
}

export async function saveSettings(settings: ReadablitSettings): Promise<ReadablitSettings> {
  const normalized = normalizeSettings(settings);

  await chrome.storage.sync.set({
    [settingsStorageKey]: normalized
  });

  return normalized;
}
