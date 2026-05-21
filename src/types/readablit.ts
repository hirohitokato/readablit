/**
 * 拡張機能全体で共有する設定形状をここへ集約する。
 *
 * ポップアップ、ストレージ、コンテンツスクリプトが同じ意味の値を別定義で持つと、
 * 「UI では有効だが DOM 変換では無効」といった食い違いが起きやすい。
 * そのため、設定の契約を単一ファイルに寄せて型で固定する。
 */
export interface ReadablitSettings {
  enabled: boolean;
  wordSpacingEm: number;
  lineHeight: number;
  rubyFontSizeEm: number;
  rubyEnabled: boolean;
  spacingEnabled: boolean;
}

/**
 * 現在のタブへ実際に適用されている状態。
 *
 * 保存済み設定と適用済み設定は別概念で、ページ遷移や再読込の影響を受ける。
 * その差を明示的に扱うため、UI 上の設定値とは別の型として切り分ける。
 */
export interface AppliedState {
  enabled: boolean;
  settings: ReadablitSettings | null;
}

export type SettingsPreset = "off" | "small" | "medium" | "large";

/**
 * kuromoji.js が返すトークンのうち、この拡張で使う最小限の項目だけを型にする。
 *
 * ライブラリ全体の巨大な型定義を自前で持つより、実際に読むキーだけを制約した方が
 * 拡張の責務がぶれず、将来 tokenizer 実装を差し替える際の影響も小さくて済む。
 */
export interface KuromojiToken {
  surface_form?: string;
  reading?: string;
}

export interface KuromojiTokenizerInstance {
  tokenize(text: string): KuromojiToken[];
}

export interface KuromojiBuilder {
  build(
    callback: (error: Error | null, tokenizer?: KuromojiTokenizerInstance) => void
  ): void;
}

export interface KuromojiStatic {
  builder(options: { dicPath: string }): KuromojiBuilder;
}
