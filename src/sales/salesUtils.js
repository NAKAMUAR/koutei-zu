// 売上登録表の純粋ロジック・定義。
// 保存：salesStore（1か月 = 1 Firestore ドキュメント、data/sales_{YYYY-MM}）。
//   MonthData = { rows: Row[], settings: { exchangeRate, hqRate, finalCheck }, updatedAt }

// ---- 区分（売上カテゴリ）----
// tax: 消費税の有無 / hqShare: 本社取り分の有無（国内取引のみ） / intl: 国際売上か
export const SALES_CATEGORIES = [
  { id: 'offshore_dom', label: 'オフショア国内売上', note: '消費税有・本社取分有', tax: true, hqShare: true, intl: false, group: 'offshore', area: 'domestic' },
  { id: 'offshore_intl', label: 'オフショア国際売上', note: '税無し', tax: false, hqShare: false, intl: true, group: 'offshore', area: 'intl' },
  { id: 'lab_dom', label: 'ラボ国内売上', note: '消費税有・本社取分有', tax: true, hqShare: true, intl: false, group: 'lab', area: 'domestic' },
  { id: 'lab_intl', label: 'ラボ国際売上', note: '税無し', tax: false, hqShare: false, intl: true, group: 'lab', area: 'intl' },
];
export function catOf(id) { return SALES_CATEGORIES.find(c => c.id === id) || SALES_CATEGORIES[0]; }

// 外注費用の集計対象者（サマリーの列）。必要に応じて編集。
export const OUTSOURCERS = ['Quynh', 'ĐẶNG THỊ TÚ MĨ', '中村'];

export const DEFAULT_SETTINGS = {
  exchangeRate: 165, // 1円 = 165VND（外注金額VND ÷ レート = 円）。実態に合わせて編集可。
  hqRate: 200,       // 本社取り分（1枚あたり円）
  finalCheck: false, // 佐渡 最終チェック
};

// ---- ID・日付 ----
function pad2(n) { return String(n).padStart(2, '0'); }
export function genRowId() { return `srow_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
export function currentMonth(now) {
  const d = now instanceof Date ? now : new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
export function monthLabel(ym) {
  const [y, m] = (ym || '').split('-');
  if (!y || !m) return ym || '';
  return `${y}年${Number(m)}月分`;
}
export function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

// ---- 数値 ----
export function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
export function formatYen(v) { return '¥' + Math.round(num(v)).toLocaleString('ja-JP'); }
export function formatVND(v) { const n = Math.round(num(v)); return n ? n.toLocaleString('ja-JP') + ' ₫' : ''; }

// ---- 行 ----
export function blankRow(categoryId) {
  return {
    id: genRowId(),
    category: categoryId,
    company: '', person: '', projectName: '', prodType: '', prodName: '',
    inHouseOutsourcer: '', externalOutsourcer: '',
    outsourceVND: '',     // 外注金額（VND表記）
    prodAmount: '',       // 制作金額（円・税抜）
    sheets: '',           // 制作枚数（本社取り分の算定）
    orderDate: '', dueDate: '', deliveryDate: '',
    completed: false,
    invoiceSentDate: '', paymentConfirmedDate: '',
    billRound: '',        // 14. 請求対象回
    billAmount: '',       // 15. 請求金額
    taxPayAmount: '',     // 16. 消費税納付金額
    hqStatus: '',         // 18. 本社への請求状態
    note: '',
  };
}

// 行ごとの自動計算。settings は { exchangeRate, hqRate }
export function computeRow(row, settings) {
  const cat = catOf(row.category);
  const prod = num(row.prodAmount);
  const tax = cat.tax ? Math.floor(prod * 0.10) : 0;       // 消費税(10%)
  const taxIncl = prod + tax;                               // 税込合計金額
  const rate = num(settings.exchangeRate) || 1;
  const outsourceJPY = Math.round(num(row.outsourceVND) / rate); // 外注費(円換算)
  const hqReceive = cat.hqShare ? Math.round(num(row.sheets) * num(settings.hqRate)) : 0; // 本社受取金額
  return { cat, prod, tax, taxIncl, outsourceJPY, hqReceive };
}

// ---- 月次サマリー（全区分横断）----
export function computeSummary(rows, settings) {
  const sum = {
    totalSales: 0,        // 合計売上（税込）
    totalTax: 0,          // 消費税合計
    totalOutsourceJPY: 0, // 外注費合計（円）
    hqShareTotal: 0,      // 本社取り分合計
    hqSheets: 0,          // 本社取り分の対象枚数（国内のみ）
    domestic: { offshore: { net: 0, gross: 0 }, lab: { net: 0, gross: 0 } },
    intl: { offshore: 0, lab: 0 },
    outsourceByPerson: {}, // { name: 円 }
  };
  for (const name of OUTSOURCERS) sum.outsourceByPerson[name] = 0;

  for (const row of rows || []) {
    const c = computeRow(row, settings);
    sum.totalSales += c.taxIncl;
    sum.totalTax += c.tax;
    sum.totalOutsourceJPY += c.outsourceJPY;
    sum.hqShareTotal += c.hqReceive;
    if (c.cat.hqShare) sum.hqSheets += num(row.sheets);

    if (!c.cat.intl) {
      const bucket = c.cat.group === 'lab' ? sum.domestic.lab : sum.domestic.offshore;
      bucket.net += c.prod;
      bucket.gross += c.taxIncl;
    } else {
      if (c.cat.group === 'lab') sum.intl.lab += c.prod; else sum.intl.offshore += c.prod;
    }

    // 外注費は社内/社外の外注者名で按分（同名の人に積む）
    const people = [row.inHouseOutsourcer, row.externalOutsourcer].map(s => (s || '').trim()).filter(Boolean);
    if (people.length && c.outsourceJPY) {
      const share = Math.round(c.outsourceJPY / people.length);
      for (const p of people) {
        if (!(p in sum.outsourceByPerson)) sum.outsourceByPerson[p] = 0;
        sum.outsourceByPerson[p] += share;
      }
    }
  }
  // 合計売上（税金・外注費・本社取り分の差引後）
  sum.netAfterDeduct = sum.totalSales - sum.totalTax - sum.totalOutsourceJPY - sum.hqShareTotal;
  return sum;
}

// 区分ごとの合計（区分タブ下の合計行用）
export function computeCategoryTotal(rows, categoryId, settings) {
  const filtered = (rows || []).filter(r => r.category === categoryId);
  let prod = 0, tax = 0, taxIncl = 0, sheets = 0, outsourceJPY = 0, hqReceive = 0, billAmount = 0;
  for (const r of filtered) {
    const c = computeRow(r, settings);
    prod += c.prod; tax += c.tax; taxIncl += c.taxIncl;
    outsourceJPY += c.outsourceJPY; hqReceive += c.hqReceive;
    sheets += num(r.sheets); billAmount += num(r.billAmount);
  }
  return { count: filtered.length, prod, tax, taxIncl, sheets, outsourceJPY, hqReceive, billAmount };
}
