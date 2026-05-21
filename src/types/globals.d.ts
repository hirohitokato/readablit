import type { KuromojiStatic } from "./readablit";

declare global {
  interface Window {
    kuromoji?: KuromojiStatic;
    __readablitContentScriptInitialized__?: boolean;
  }
}

export {};
