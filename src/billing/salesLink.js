// 請求書 ⇄ 売上登録表の紐付け（純ロジック）。
// 請求書ドキュメントの salesRowIds（紐付けた売上行の id）をもとに、
//   ・紐付け候補の売上行を探す（宛先会社名＋発行月±1か月、件名と同じ案件名の行）
//   ・請求書のステータス（送付済み・入金済み）→ 売上行の 請求書送付日・入金確認日 を「空のときだけ」埋める（請求書 → 売上 の一方向）
//   ・紐付けた売上行の税込合計と請求書合計の突合
// を行う。ledger は売上登録表 { 'YYYY-MM': { rows, settings } }。
import { kanaNormalize } from '../lib/utils.js';
import { computeRow, DEFAULT_SETTINGS, shiftMonth } from '../sales/salesUtils.js';
import { computeTotals } from './billingUtils.js';

const norm = (s) => kanaNormalize(String(s || '').trim()).replace(/\s+/g, '');
const monthOfDate = (d) => (/^\d{4}-\d{2}/.test(String(d || '')) ? String(d).slice(0, 7) : '');

// 会社名が同じか（全角半角・カナ・空白・「株式会社」の有無を無視）
export function sameCompany(a, b) {
  const strip = (s) => norm(s).replace(/株式会社|有限会社|合同会社|\(株\)|\(有\)/g, '');
  const x = strip(a), y = strip(b);
  return !!x && x === y;
}

// id → { ym, row } の索引
export function indexSalesRows(ledger) {
  const map = new Map();
  for (const [ym, month] of Object.entries(ledger || {})) {
    for (const row of ((month && month.rows) || [])) if (row && row.id) map.set(row.id, { ym, row });
  }
  return map;
}

// 紐付け候補：宛先会社名が同じで発行月±1か月の行 ＋ 件名と同じ案件名の行（±2か月）＋ 紐付け済みの行。
// 並び：紐付け済み → 件名と同じ案件 → 月の新しい順。返り値 [{ ym, row, linked, sameProject }]
export function salesLinkCandidates(ledger, doc) {
  const ids = new Set((doc && doc.salesRowIds) || []);
  const baseYm = monthOfDate(doc && doc.issueDate);
  const near = (ym, n) => {
    if (!baseYm) return true;
    for (let d = -n; d <= n; d++) if (shiftMonth(baseYm, d) === ym) return true;
    return false;
  };
  const company = doc && doc.to && doc.to.company;
  const subject = norm(doc && doc.subject);
  const out = [];
  for (const [ym, month] of Object.entries(ledger || {})) {
    for (const row of ((month && month.rows) || [])) {
      if (!row || !row.id) continue;
      const linked = ids.has(row.id);
      const sameProject = !!subject && norm(row.projectName) === subject;
      const byCompany = near(ym, 1) && sameCompany(row.company, company);
      if (linked || (sameProject && near(ym, 2)) || byCompany) out.push({ ym, row, linked, sameProject });
    }
  }
  const rank = (c) => (c.linked ? 0 : c.sameProject ? 1 : 2);
  out.sort((a, b) => rank(a) - rank(b) || b.ym.localeCompare(a.ym) || String(a.row.projectName || '').localeCompare(String(b.row.projectName || ''), 'ja'));
  return out;
}

// 請求書のステータス → 紐付けた売上行の日付（空のときだけ埋める）。
// 返り値 { months: { ym: 更新後の月データ }, filled: 埋めた項目数, kept: 既に別の日付が入っていて残した項目数 }
export function applyInvoiceToSales(ledger, doc) {
  const result = { months: {}, filled: 0, kept: 0 };
  if (!doc || doc.type !== 'invoice') return result;
  const ids = new Set(doc.salesRowIds || []);
  if (!ids.size) return result;
  const status = doc.status || 'draft';
  const sent = (status === 'sent' || status === 'paid') ? String(doc.sentDate || '').trim() : '';
  const paid = status === 'paid' ? String(doc.paidDate || '').trim() : '';
  if (!sent && !paid) return result;
  for (const [ym, month] of Object.entries(ledger || {})) {
    const rows = (month && month.rows) || [];
    let changed = false;
    const next = rows.map(row => {
      if (!row || !ids.has(row.id)) return row;
      const patch = {};
      const fill = (key, value) => {
        if (!value) return;
        const cur = String(row[key] || '').trim();
        if (!cur) { patch[key] = value; result.filled++; } else if (cur !== value) result.kept++;
      };
      fill('invoiceSentDate', sent);
      fill('paymentConfirmedDate', paid);
      if (!Object.keys(patch).length) return row;
      changed = true;
      return { ...row, ...patch };
    });
    if (changed) result.months[ym] = { ...month, rows: next, updatedAt: Date.now() };
  }
  return result;
}

// 紐付けた売上行の税込合計と請求書合計。一致しなければ mismatch: true（行が無ければ突合しない）
export function compareLinkedTotal(ledger, doc) {
  const idx = indexSalesRows(ledger);
  let salesTotal = 0, count = 0, missing = 0;
  for (const id of ((doc && doc.salesRowIds) || [])) {
    const hit = idx.get(id);
    if (!hit) { missing++; continue; }
    const settings = { ...DEFAULT_SETTINGS, ...((ledger[hit.ym] && ledger[hit.ym].settings) || {}) };
    salesTotal += computeRow(hit.row, settings).taxIncl;
    count++;
  }
  const invoiceTotal = doc ? computeTotals(doc).total : 0;
  return { count, missing, salesTotal, invoiceTotal, mismatch: count > 0 && Math.round(salesTotal) !== Math.round(invoiceTotal) };
}
