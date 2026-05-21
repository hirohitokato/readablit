import { loadSettings, normalizeSettings, saveSettings } from "../settings/settingsRepository";
import { isSupportedPage } from "../shared/domGuards";
import { messageTypes, type ReadablitMessageResponse } from "../shared/messages";
import type { AppliedState, ReadablitSettings, SettingsPreset } from "../types/readablit";

const spacingPresetMap: Record<SettingsPreset, { spacingEnabled: boolean; wordSpacingEm: number }> = {
  off: { spacingEnabled: false, wordSpacingEm: 0 },
  small: { spacingEnabled: true, wordSpacingEm: 0.15 },
  medium: { spacingEnabled: true, wordSpacingEm: 0.25 },
  large: { spacingEnabled: true, wordSpacingEm: 0.4 }
};

const lineHeightPresetMap: Record<SettingsPreset, number> = {
  off: 1,
  small: 1.5,
  medium: 1.8,
  large: 2.2
};

const rubyPresetMap: Record<SettingsPreset, { rubyEnabled: boolean; rubyFontSizeEm: number }> = {
  off: { rubyEnabled: false, rubyFontSizeEm: 0.55 },
  small: { rubyEnabled: true, rubyFontSizeEm: 0.45 },
  medium: { rubyEnabled: true, rubyFontSizeEm: 0.55 },
  large: { rubyEnabled: true, rubyFontSizeEm: 0.7 }
};

function requireElement<T extends HTMLElement>(id: string, expectedType: { new (): T }): T {
  const element = document.getElementById(id);

  if (!(element instanceof expectedType)) {
    throw new Error(`UI 要素 #${id} の取得に失敗しました。`);
  }

  return element;
}

const statusElement = requireElement("status", HTMLParagraphElement);
const enabledInput = requireElement("enabled", HTMLInputElement);
const settingsGroup = requireElement("settings-group", HTMLFieldSetElement);
const spacingPresetInput = requireElement("spacingPreset", HTMLSelectElement);
const lineHeightPresetInput = requireElement("lineHeightPreset", HTMLSelectElement);
const rubyPresetInput = requireElement("rubyPreset", HTMLSelectElement);

let currentAppliedState: AppliedState = {
  enabled: false,
  settings: null
};

function setStatus(message: string): void {
  statusElement.textContent = message;

  if (!message) {
    delete statusElement.dataset.visible;
    return;
  }

  statusElement.dataset.visible = "true";
}

/**
 * 再適用判定は「見た目が同じか」でなく「実際に送る設定値が同じか」で比べる。
 * そうしておくと preset の閾値変更があっても、通信や保存の判断基準がぶれない。
 */
function settingsEqual(left: ReadablitSettings | null, right: ReadablitSettings | null): boolean {
  if (!left || !right) {
    return false;
  }

  return (
    left.enabled === right.enabled &&
    left.wordSpacingEm === right.wordSpacingEm &&
    left.lineHeight === right.lineHeight &&
    left.rubyFontSizeEm === right.rubyFontSizeEm &&
    left.rubyEnabled === right.rubyEnabled &&
    left.spacingEnabled === right.spacingEnabled
  );
}

function getSpacingPreset(settings: ReadablitSettings): SettingsPreset {
  if (!settings.spacingEnabled) {
    return "off";
  }

  if (settings.wordSpacingEm <= 0.18) {
    return "small";
  }

  if (settings.wordSpacingEm >= 0.33) {
    return "large";
  }

  return "medium";
}

function getLineHeightPreset(settings: ReadablitSettings): SettingsPreset {
  if (settings.lineHeight <= 1.25) {
    return "off";
  }

  if (settings.lineHeight <= 1.65) {
    return "small";
  }

  if (settings.lineHeight >= 2.05) {
    return "large";
  }

  return "medium";
}

function getRubyPreset(settings: ReadablitSettings): SettingsPreset {
  if (!settings.rubyEnabled) {
    return "off";
  }

  if (settings.rubyFontSizeEm <= 0.48) {
    return "small";
  }

  if (settings.rubyFontSizeEm >= 0.63) {
    return "large";
  }

  return "medium";
}

function fillForm(settings: ReadablitSettings): void {
  enabledInput.checked = settings.enabled;
  spacingPresetInput.value = getSpacingPreset(settings);
  lineHeightPresetInput.value = getLineHeightPreset(settings);
  rubyPresetInput.value = getRubyPreset(settings);
  syncEnabledState(settings.enabled);
}

function readForm(): ReadablitSettings {
  const spacingPreset = spacingPresetMap[spacingPresetInput.value as SettingsPreset];
  const rubyPreset = rubyPresetMap[rubyPresetInput.value as SettingsPreset];

  return normalizeSettings({
    enabled: enabledInput.checked,
    wordSpacingEm: spacingPreset.wordSpacingEm,
    lineHeight: lineHeightPresetMap[lineHeightPresetInput.value as SettingsPreset],
    rubyFontSizeEm: rubyPreset.rubyFontSizeEm,
    rubyEnabled: rubyPreset.rubyEnabled,
    spacingEnabled: spacingPreset.spacingEnabled
  });
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * content script は必要になった時だけ注入し、activeTab 権限の範囲に閉じ込める。
 *
 * manifest で常駐 content_scripts を宣言すると host permissions を広げやすいため、
 * ここではユーザー操作に紐づいた明示注入を維持している。
 */
async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: messageTypes.ping });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["vendor/kuromoji.js", "content/contentScript.js"]
    });
  }
}

async function sendMessageToTab(
  tabId: number,
  message: Parameters<typeof chrome.tabs.sendMessage>[1]
): Promise<ReadablitMessageResponse | undefined> {
  return chrome.tabs.sendMessage(tabId, message) as Promise<ReadablitMessageResponse | undefined>;
}

async function applySettingsToTab(settings: ReadablitSettings): Promise<void> {
  const tab = await getActiveTab();
  if (!tab?.id || !isSupportedPage(tab.url)) {
    throw new Error("このページでは拡張機能を適用できません。Chrome内部ページやPDFでは利用できません。");
  }

  await ensureContentScript(tab.id);

  const response = await sendMessageToTab(tab.id, {
    type: messageTypes.apply,
    settings
  });

  if (!response?.ok) {
    throw new Error(response?.error ?? "ページへの適用に失敗しました。");
  }

  currentAppliedState = {
    enabled: true,
    settings
  };
}

async function resetTabTransform(): Promise<void> {
  const tab = await getActiveTab();
  if (!tab?.id || !isSupportedPage(tab.url)) {
    throw new Error("このページでは解除できません。");
  }

  await ensureContentScript(tab.id);
  const response = await sendMessageToTab(tab.id, { type: messageTypes.reset });
  if (!response?.ok) {
    throw new Error(response?.error ?? "ページ表示の解除に失敗しました。");
  }

  currentAppliedState = {
    enabled: false,
    settings: null
  };
}

async function loadTabState(): Promise<void> {
  const tab = await getActiveTab();
  if (!tab?.id || !isSupportedPage(tab.url)) {
    currentAppliedState = {
      enabled: false,
      settings: null
    };
    return;
  }

  await ensureContentScript(tab.id);
  const response = await sendMessageToTab(tab.id, {
    type: messageTypes.getState
  });

  currentAppliedState =
    response?.ok && response.state
      ? response.state
      : {
          enabled: false,
          settings: null
        };
}

function syncEnabledState(enabled: boolean): void {
  settingsGroup.disabled = !enabled;
}

async function handleEnabledToggle(): Promise<void> {
  const draft = readForm();
  syncEnabledState(draft.enabled);

  try {
    if (draft.enabled) {
      await applySettingsToTab(draft);
      await saveSettings(draft);
      setStatus("");
    } else {
      await resetTabTransform();
      await saveSettings(draft);
      setStatus("");
    }
  } catch (toggleError: unknown) {
    enabledInput.checked = !enabledInput.checked;
    syncEnabledState(enabledInput.checked);
    setStatus(String(toggleError instanceof Error ? toggleError.message : toggleError));
  }
}

async function handleParameterChange(): Promise<void> {
  const draft = readForm();
  syncEnabledState(draft.enabled);

  if (!draft.enabled) {
    return;
  }

  if (currentAppliedState.enabled && settingsEqual(currentAppliedState.settings, draft)) {
    return;
  }

  try {
    await applySettingsToTab(draft);
    await saveSettings(draft);
    setStatus("");
  } catch (applyError: unknown) {
    setStatus(String(applyError instanceof Error ? applyError.message : applyError));
  }
}

enabledInput.addEventListener("change", () => {
  void handleEnabledToggle();
});

spacingPresetInput.addEventListener("change", () => {
  void handleParameterChange();
});

lineHeightPresetInput.addEventListener("change", () => {
  void handleParameterChange();
});

rubyPresetInput.addEventListener("change", () => {
  void handleParameterChange();
});

void Promise.all([loadSettings(), loadTabState()])
  .then(([settings]) => {
    fillForm(settings);
    setStatus("");
  })
  .catch((loadError: unknown) => {
    const message = loadError instanceof Error ? loadError.message : String(loadError);
    setStatus(`設定の読み込みに失敗しました: ${message}`);
  });
