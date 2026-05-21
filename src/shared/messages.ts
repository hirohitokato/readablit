import type { AppliedState, ReadablitSettings } from "../types/readablit";

/**
 * 文字列リテラルを散在させると popup と content script の片方だけが更新されやすい。
 * メッセージ名を一元管理して、通信契約の破綻を型と import で防ぐ。
 */
export const messageTypes = {
  apply: "APPLY_READABILITY_SETTINGS",
  reset: "RESET_READABILITY_TRANSFORM",
  ping: "__READABLIT_PING__",
  getState: "GET_READABILITY_STATE"
} as const;

export type ReadablitMessage =
  | {
      type: typeof messageTypes.apply;
      settings: ReadablitSettings;
    }
  | {
      type: typeof messageTypes.reset;
    }
  | {
      type: typeof messageTypes.ping;
    }
  | {
      type: typeof messageTypes.getState;
    };

export type ReadablitMessageResponse =
  | {
      ok: true;
      state?: AppliedState;
    }
  | {
      ok: false;
      error: string;
    };
