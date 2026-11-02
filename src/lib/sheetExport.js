// シート貼り付け用の書き出し（売上登録表・帳票一覧）— 純ロジック。
// 工程図で入力した内容を、Google スプレッドシートにそのまま貼れる表（タブ区切り）にする。
// 入力は工程図だけ（シートからは戻さない）。画面は views/SheetExportView.jsx。
import { DEFAULT_SETTINGS as SALES_DEFAULTS, catOf, computeRow, num } from '../sales/salesUtils.js';
import { computeTotals, docTypeOf, invoiceStatusOf } from '../billing/billingUtils.js';

export const SALES_HEADERS = ['計上月', '区分', '番号', '会社名', '担当者名', '案件名', '制作種類', '制作名', '社内外注者', '社外外注者',
  '外注金額VND', '制作金額', '消費税', '税込合計', '制作枚数', '発注着手日', '納品予定日', '納品日', '完了', '請求書送付日', '入金確認日', '備考'];

const ymOk = (ym) => /^\d{4}-\d{2}$/.test(String(ym || ''));

// 売上登録表（{ 'YYYY-MM': { rows, settings } }）→ 指定した月の範囲の行（月の古い順、月の中は区分ごとに番号）
export function salesTable(ledger, fromYm, toYm) {
  const months = Object.keys(ledger || {}).filter(ymOk).sort()
    .filter(ym => (!fromYm || ym >= fromYm) && (!toYm || ym <= toYm));
  const rows = [];
  for (const ym of months) {
    const m = ledger[ym] || {};
    const settings = { ...SALES_DEFAULTS, ...(m.settings || {}) };
    const idx = {};
    for (const r of (m.rows || [])) {
      const c = computeRow(r, settings);
      idx[r.category] = (idx[r.category] || 0) + 1;
      rows.push([ym, catOf(r.category).label, idx[r.category], r.company || '', r.person || '', r.projectName || '', r.prodType || '', r.prodName || '',
        r.inHouseOutsourcer || '', r.externalOutsourcer || '', num(r.outsourceVND) || '', num(r.prodAmount) || '', c.tax || '', c.taxIncl || '',
        num(r.sheets) || '', r.orderDate || '', r.dueDate || '', r.deliveryDate || '', r.completed ? '完了' : '',
        r.invoiceSentDate || '', r.paymentConfirmedDate || '', r.note || '']);
    }
  }
  return { headers: SALES_HEADERS, rows };
}

export const BILLING_HEADERS = ['種類', '番号', '発行日', '宛先', '件名', '小計', '消費税', '合計', '状態', '送付日', '入金日', '支払期限'];

// 帳票（見積書・発注書・請求書）→ 一覧の行。types で種類を絞る（空なら全部）。発行日の新しい順
export function billingTable(docs, types, fromYmd, toYmd) {
  const want = new Set(types && types.length ? types : ['estimate', 'order', 'invoice']);
  const list = (docs || []).filter(d => d && want.has(d.type))
    .filter(d => (!fromYmd || String(d.issueDate || '') >= fromYmd) && (!toYmd || String(d.issueDate || '') <= toYmd))
    .slice().sort((a, b) => String(b.issueDate || '').localeCompare(String(a.issueDate || '')) || (b.createdAt || 0) - (a.createdAt || 0));
  const rows = list.map(d => {
    const t = computeTotals(d);
    const tax = d.type === 'invoice' ? t.taxTotal : t.tax;
    const isInv = d.type === 'invoice';
    // 発注書の宛先は自社なので、相手（発注者＝お客様）は発行元の欄
    const party = d.type === 'order' ? ((d.from && d.from.company) || '') : ((d.to && d.to.company) || '');
    return [docTypeOf(d.type).label, d.no || '', d.issueDate || '', party, d.subject || '', t.subtotal || 0, tax || 0, t.total || 0,
      isInv ? invoiceStatusOf(d.status).label : '', isInv ? (d.sentDate || '') : '', isInv ? (d.paidDate || '') : '', isInv ? (d.paymentDeadline || '') : ''];
  });
  return { headers: BILLING_HEADERS, rows };
}

// 1セル分：タブ・改行は空白に。= + - @ で始まる文字（数字でない）は ' を付けて数式として扱われないようにする
// 番号や日付が別の形に変わらないよう、0 始まりの数字の文字にも ' を付ける
export function tsvCell(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return isFinite(v) ? String(v) : '';
  const s = String(v).replace(/[\t\r\n]+/g, ' ');
  if (/^[=+\-@]/.test(s) && isNaN(Number(s))) return `'${s}`;
  if (/^0\d+$/.test(s)) return `'${s}`;
  return s;
}
export function toTSV(headers, rows) {
  return [headers, ...rows].map(r => r.map(tsvCell).join('\t')).join('\n');
}
