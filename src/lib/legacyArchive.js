// 過去分の保管庫（data/legacy_YYYY-MM）の純ロジック。
// 過去分は毎回読み込む作業（tasks）とは別に、月ごとにまとめて保存する。
import { LEGACY_ASSIGNEE } from './legacyImport.js';

/** 保管する形：空・null の項目を落として小さくする */
export function compactTask(t) {
  const out = {};
  for (const [k, v] of Object.entries(t || {})) {
    if (v === null || v === undefined || v === '' || v === false) continue;
    out[k] = v;
  }
  return out;
}

/** どの月に入れるか（登録日の年月。無ければ 'unknown'） */
export function archiveMonth(t) {
  const d = String((t && (t.registeredDate || t.projectRequestDate)) || '');
  return /^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : 'unknown';
}

/** { 'YYYY-MM': [過去分] } → 1つの配列（登録日の新しい順） */
export function flattenArchive(byMonth) {
  const out = [];
  for (const arr of Object.values(byMonth || {})) if (Array.isArray(arr)) out.push(...arr);
  return out.sort((a, b) => String(b.registeredDate || '').localeCompare(String(a.registeredDate || '')) || String(a.projectNameInternal || '').localeCompare(String(b.projectNameInternal || ''), 'ja'));
}

/**
 * 保管庫に足す・直す。byMonth（今の保管庫）と items（足す／直す過去分。id で上書き）から、
 * 書き換える月だけの { 'YYYY-MM': 新しい配列 } と、元に戻す用の { 'YYYY-MM': 前の配列 | null } を返す
 */
export function planArchiveWrite(byMonth, items) {
  const cur = byMonth || {};
  const changed = {};
  const before = {};
  for (const raw of (items || [])) {
    const t = compactTask(raw);
    const m = archiveMonth(t);
    if (!(m in changed)) {
      changed[m] = (cur[m] || []).slice();
      before[m] = cur[m] ? cur[m] : null;
    }
    const i = changed[m].findIndex(x => x.id === t.id);
    if (i >= 0) changed[m][i] = t; else changed[m].push(t);
  }
  return { changed, before };
}

/** 保管庫の過去分のうち、担当者の表に一致して担当者不明のもの → 直した過去分の配列（patches は assigneePatchesForImported の結果） */
export function applyPatchesToArchive(list, patches) {
  const m = new Map((patches || []).map(p => [p.id, p.patch]));
  return (list || []).filter(t => m.has(t.id)).map(t => ({ ...t, ...m.get(t.id) }));
}

/** 書き出し（スプレッドシートに貼れるタブ区切り・CSV） */
const COLS = [
  ['社内案件名', t => t.projectNameInternal], ['社外案件名', t => (t.projectName !== t.projectNameInternal ? t.projectName : '')],
  ['会社名', t => t.companyName], ['担当者', t => (t.assignee === LEGACY_ASSIGNEE ? '不明' : t.assignee)],
  ['推定の登録日', t => t.registeredDate], ['完了日', t => t.stepCompletedDate], ['時間', t => t.hours],
  ['内容', t => t.viewpointName], ['メモ', t => t.memo],
];
export function archiveToRows(list) {
  return [COLS.map(c => c[0]), ...(list || []).map(t => COLS.map(c => { const v = c[1](t); return v == null ? '' : String(v); }))];
}
export function rowsToTSV(rows) {
  return rows.map(r => r.map(c => (/[\t\n"]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join('\t')).join('\n');
}
export function rowsToCSV(rows) {
  return '﻿' + rows.map(r => r.map(c => (/[,\n"]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\r\n');
}

/** 検索（社内案件名・社外案件名・会社名・担当者のどれかに含む） */
export function searchArchive(list, q) {
  const s = String(q || '').trim().toLowerCase();
  if (!s) return list || [];
  return (list || []).filter(t => [t.projectNameInternal, t.projectName, t.companyName, t.assignee].some(v => String(v || '').toLowerCase().includes(s)));
}
