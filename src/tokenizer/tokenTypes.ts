/**
 * 大量 DOM を一度に変換するとページ応答性を壊しやすい。
 * 上限を明示しておくことで、読みやすさ改善よりブラウザ体験を優先する。
 */
export const MAX_TEXT_NODES_PER_APPLY = 1000;
export const MAX_TEXT_LENGTH_PER_NODE = 5000;
