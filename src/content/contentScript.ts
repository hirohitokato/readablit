import { applyReadabilityTransform, getAppliedState, resetTransform } from "./transformDom";
import { messageTypes, type ReadablitMessage, type ReadablitMessageResponse } from "../shared/messages";
import { error } from "../shared/logger";

function isReadablitMessage(message: unknown): message is ReadablitMessage {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return false;
  }

  return typeof (message as { type: unknown }).type === "string";
}

/**
 * content script は重複注入されうるので、リスナー登録は一度だけに制限する。
 *
 * popup 側では ping で存在確認するが、タブ状態や race condition を完全には消せない。
 * ページ側で自己防衛しておくことで、二重登録による多重実行を確実に避ける。
 */
if (!window.__readablitContentScriptInitialized__) {
  window.__readablitContentScriptInitialized__ = true;

  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!isReadablitMessage(message)) {
      return false;
    }

    if (message.type === messageTypes.ping) {
      sendResponse({ ok: true } satisfies ReadablitMessageResponse);
      return false;
    }

    if (message.type === messageTypes.apply) {
      void applyReadabilityTransform(message.settings)
        .then(() => {
          sendResponse({ ok: true } satisfies ReadablitMessageResponse);
        })
        .catch((applyError: unknown) => {
          error("Failed to apply readability transform", applyError);
          sendResponse({
            ok: false,
            error: String(applyError instanceof Error ? applyError.message : applyError)
          } satisfies ReadablitMessageResponse);
        });

      return true;
    }

    if (message.type === messageTypes.reset) {
      resetTransform(document.body);
      sendResponse({ ok: true } satisfies ReadablitMessageResponse);
      return false;
    }

    if (message.type === messageTypes.getState) {
      sendResponse({
        ok: true,
        state: getAppliedState()
      } satisfies ReadablitMessageResponse);
      return false;
    }

    return false;
  });
}
