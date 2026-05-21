import { defaultSettings, settingsStorageKey } from "../settings/defaultSettings";

/**
 * 初回インストール時だけ既定設定を投入し、ユーザー設定の上書きは避ける。
 *
 * 拡張更新時にも onInstalled は発火するため、「常に初期値を書き込む」設計にすると
 * 更新のたびにユーザー体験を壊してしまう。
 */
chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(settingsStorageKey);

  if (!current[settingsStorageKey]) {
    await chrome.storage.sync.set({
      [settingsStorageKey]: defaultSettings
    });
  }
});
