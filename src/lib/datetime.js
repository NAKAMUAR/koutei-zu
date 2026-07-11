// 日付・時刻ユーティリティ（App.jsx から分割）

export const fmtMD = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
export const fmtYMD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fmtYMDJP = (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
export const dayName = (d) => ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
export const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;
export const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
export const startOfDay = (d) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; };
export const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const timeToMin = (s) => {
  if (!s) return 0;
  const [h, m] = s.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const minToTime = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
// 小数時間 → "HH:MM"（分単位に丸めて表示）。制作時間・経過・残時間の表示用。
export const fmtHM = (h) => {
  const v = (h == null || isNaN(h)) ? 0 : h;
  const totalMin = Math.round(Math.max(0, v) * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};
// 読み仮名ベースの照合用に正規化する。
// 全角/半角（NFKC）・大文字小文字を揃え、カタカナ→ひらがなに統一する。
// これにより「りのべる」「リノベル」「ﾘﾉﾍﾞﾙ」などスクリプト違いを同一視できる。
// （漢字→読みの変換は読み仮名データが無いため対象外）
// "HH:MM" / "H:MM" / 素の数値（時間）→ 小数時間。入力用。無効なら NaN。
export const parseHM = (str) => {
  if (str == null) return NaN;
  const s = String(str).trim();
  if (s === '') return NaN;
  if (s.includes(':')) {
    const parts = s.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] === undefined || parts[1] === '' ? '0' : parts[1], 10);
    if (isNaN(h) || isNaN(m) || m < 0 || m >= 60) return NaN;
    return h + m / 60;
  }
  const v = parseFloat(s);
  return isNaN(v) ? NaN : v;
};

// datetime-local 値（"YYYY-MM-DDTHH:mm"）← → Date
export const dtLocalToDate = (s) => s ? new Date(s) : null;
export const dateToDtLocal = (d) => {
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export function parseYMD(s) {
  if (!s || typeof s !== 'string') return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
