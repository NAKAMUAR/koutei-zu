// テキスト正規化ユーティリティ（App.jsx から分割）
// ひらがな/カタカナ・全角/半角・大文字小文字の違いを無視した照合用
export const kanaNormalize = (s) => {
  if (s == null) return '';
  let r = String(s).normalize('NFKC').toLowerCase();
  // カタカナ（ァ-ヶ）→ ひらがな
  r = r.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  return r;
};
