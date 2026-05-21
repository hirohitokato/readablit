import type { KuromojiStatic, KuromojiToken, KuromojiTokenizerInstance } from "../types/readablit";
import { error } from "../shared/logger";

let tokenizerPromise: Promise<KuromojiTokenizerInstance> | null = null;
const tokenCache = new Map<string, KuromojiToken[]>();

function ensureKuromoji(): KuromojiStatic {
  const { kuromoji } = window;

  if (!kuromoji) {
    throw new Error("kuromoji.js の読み込みに失敗しました。");
  }

  return kuromoji;
}

/**
 * 形態素解析器の初期化は高コストなので、ページごとに一度だけ構築して使い回す。
 *
 * content script はページごとに独立して動くため、グローバルキャッシュではなく
 * モジュールスコープへ閉じ込めると「そのページだけの最適化」を自然に実現できる。
 * なお kuromoji 本体は UMD のグローバル公開を維持したいため、Vite へ束ねず
 * popup 側から先に注入する運用にしている。
 */
export async function getTokenizer(): Promise<KuromojiTokenizerInstance> {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      ensureKuromoji()
        .builder({
          dicPath: chrome.runtime.getURL("dict/")
        })
        .build((buildError, tokenizer) => {
          if (buildError || !tokenizer) {
            error("Failed to build tokenizer", buildError);
            reject(
              new Error(
                "形態素解析辞書の読み込みに失敗しました。拡張機能に dict/*.dat.gz が含まれているか確認してください。"
              )
            );
            return;
          }

          resolve(tokenizer);
        });
    });
  }

  return tokenizerPromise;
}

/**
 * 同一テキストが繰り返し現れるページではトークン結果を再利用する価値が高い。
 *
 * 完全一致キャッシュに限定しているのは、近似キャッシュまで始めると
 * 可読性向上の機能に対して実装複雑性が過剰になるため。
 */
export async function tokenizeText(text: string): Promise<KuromojiToken[]> {
  const cached = tokenCache.get(text);
  if (cached) {
    return cached;
  }

  const tokenizer = await getTokenizer();
  const tokens = tokenizer.tokenize(text);
  tokenCache.set(text, tokens);
  return tokens;
}
