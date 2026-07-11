// 色ユーティリティ（App.jsx から分割）：優先度色・案件カラーパレット・パステル化

export const PRIORITY_COLORS = ['#c1272d', '#d4a017', '#7a8471', '#5d4037', '#37474f'];
export function priorityColor(p) {
  if (!p || p < 1) return '#9e9e9e';
  return PRIORITY_COLORS[Math.min(p - 1, PRIORITY_COLORS.length - 1)];
}

// 隣り合うインデックスで色相が離れるように並べた20色（白文字が読める濃色のみ）
export const PROJECT_PALETTE = [
  '#3a5a40', '#1d3557', '#bc6c25', '#6a4c93',
  '#c62828', '#00838f', '#5d4037', '#ad1457',
  '#33691e', '#0d47a1', '#e65100', '#4527a0',
  '#00695c', '#8d6e63', '#264653', '#827717',
  '#37474f', '#b71c1c', '#283593', '#4e342e',
];
// 案件名 → 色の割り当て表。タスク一覧から登録順（createdAt）に重複なく振る。
// 案件数がパレットを超えた場合のみ色が一巡して重複する。
let PROJECT_COLOR_MAP = new Map();
export function assignProjectColors(tasks) {
  const first = new Map(); // 案件名 → 最初に登録された時刻
  for (const t of (tasks || [])) {
    const p = t.projectName || '';
    if (!p) continue;
    const ca = t.createdAt || 0;
    if (!first.has(p) || ca < first.get(p)) first.set(p, ca);
  }
  const names = [...first.keys()].sort((a, b) => (first.get(a) - first.get(b)) || a.localeCompare(b, 'ja'));
  PROJECT_COLOR_MAP = new Map(names.map((n, i) => [n, PROJECT_PALETTE[i % PROJECT_PALETTE.length]]));
}
export function getProjectColor(name) {
  if (!name) return '#888';
  const assigned = PROJECT_COLOR_MAP.get(name);
  if (assigned) return assigned;
  // 割り当て表に無い名前（会社名・担当者名のアバター等）は従来どおりハッシュで決める
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (name.charCodeAt(i) + ((hash << 5) - hash)) | 0;
  return PROJECT_PALETTE[Math.abs(hash) % PROJECT_PALETTE.length];
}
// 色を白と混ぜてパステル調にする（ratio = 白の割合 0..1）。カレンダーのブロック表示用
export function pastelize(hex, ratio) {
  const h = (hex || '#888888').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const mix = (c) => Math.round(c + (255 - c) * ratio);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
