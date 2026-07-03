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

// ---- 月間 制作枚数集計（会社別・納品名ベース）----
// 納品月は締め日方式：納品日が締め日（cutoffDay）以前ならその月、締め日より後なら翌月。
// 例）締め日25 → 5/26〜6/25 が「6月分」、6/26〜7/25 が「7月分」。
export function deliveryMonthOf(dateStr, cutoffDay) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr || '').trim());
  if (!m) return null;
  let y = Number(m[1]), mo = Number(m[2]);
  const d = Number(m[3]);
  const cd = Math.min(Math.max(parseInt(cutoffDay, 10) || 25, 1), 31);
  if (d > cd) { mo += 1; if (mo > 12) { mo = 1; y += 1; } }
  return `${y}-${pad2(mo)}`;
}

// 全月の売上行を横断して、指定した納品月（ym）の会社別枚数を集計する。
// 枚数は「納品名（制作名）のユニーク数」ベース。同じ納品名の行（例：同一パースの修正）は1枚に数える。
// 納品名が空の行は判別できないため1行=1枚で数える。制作枚数（入力値）の合計も併記する。
// 返り値：{ groups: { offshore: Item[], lab: Item[] }, groupTotals, grand, missingDate }
//   Item = { company, count, sheets, rows }
export function computeDeliverySummary(ledger, ym, cutoffDay) {
  const byCompany = new Map(); // company → { group, names:Set, unnamed, sheets, rows }
  let missingDate = 0; // その月の台帳にあるのに納品日が未入力の行（集計対象外の注意喚起用）
  for (const [ledgerYm, monthData] of Object.entries(ledger || {})) {
    for (const r of (monthData?.rows || [])) {
      const dm = deliveryMonthOf(r.deliveryDate, cutoffDay);
      if (!dm) {
        if (ledgerYm === ym) missingDate++;
        continue;
      }
      if (dm !== ym) continue;
      const company = (r.company || '').trim() || '（会社名未入力）';
      const group = catOf(r.category).group; // 'offshore' | 'lab'
      if (!byCompany.has(company)) byCompany.set(company, { group, names: new Set(), unnamed: 0, sheets: 0, rows: 0 });
      const e = byCompany.get(company);
      e.rows++;
      e.sheets += num(r.sheets);
      const name = (r.prodName || '').trim();
      if (name) e.names.add(name); else e.unnamed++;
    }
  }
  const groups = { offshore: [], lab: [] };
  for (const [company, e] of byCompany) {
    (groups[e.group] || groups.lab).push({ company, count: e.names.size + e.unnamed, sheets: e.sheets, rows: e.rows });
  }
  for (const g of Object.values(groups)) g.sort((a, b) => b.count - a.count || a.company.localeCompare(b.company, 'ja'));
  const totalOf = (arr) => arr.reduce((s, x) => ({ count: s.count + x.count, sheets: s.sheets + x.sheets, rows: s.rows + x.rows }), { count: 0, sheets: 0, rows: 0 });
  const groupTotals = { offshore: totalOf(groups.offshore), lab: totalOf(groups.lab) };
  const grand = totalOf([groupTotals.offshore, groupTotals.lab]);
  return { groups, groupTotals, grand, missingDate };
}

// ---- 会社別集計（会社×月のマトリクス。会社別集計タブ用）----
// 集計できる指標。money=金額表示、defaultBasis=推奨の月割り当て基準
//   basis 'delivery' … 納品日を締め日方式で納品月に割り当て（納品日の無い行は対象外）
//   basis 'ledger'   … 行が属する台帳（売上登録表）の月
export const COMPANY_METRICS = [
  { id: 'count', label: '納品枚数（納品名ベース）', money: false, defaultBasis: 'delivery' },
  { id: 'sheets', label: '制作枚数（入力値）', money: false, defaultBasis: 'delivery' },
  { id: 'prod', label: '制作金額（税抜）', money: true, defaultBasis: 'ledger' },
  { id: 'taxIncl', label: '税込合計', money: true, defaultBasis: 'ledger' },
  { id: 'bill', label: '請求金額', money: true, defaultBasis: 'ledger' },
  { id: 'outsourceJPY', label: '外注費（円換算）', money: true, defaultBasis: 'ledger' },
];
export function companyMetricOf(id) { return COMPANY_METRICS.find(m => m.id === id) || COMPANY_METRICS[0]; }

// 指定年の 会社×月 マトリクスを集計する。
// 返り値：{ months: ['YYYY-01'…'YYYY-12'], groups: { offshore: Row[], lab: Row[] }, groupTotals, grand }
//   Row = { company, values: number[12], total }
// 納品枚数（count）は納品名のユニーク数ベース（月内で同じ納品名は1枚。納品名が空の行は1行=1枚）。
// 金額系は各行の属する台帳月の settings（為替レート等）で換算する。
export function computeCompanyMatrix(ledger, year, metricId, basis, cutoffDay) {
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${pad2(i + 1)}`);
  const mIndex = new Map(months.map((m, i) => [m, i]));
  const byCompany = new Map(); // company → { group, names: Set[12], vals: number[12] }
  for (const [ledgerYm, monthData] of Object.entries(ledger || {})) {
    const settings = { ...DEFAULT_SETTINGS, ...(monthData?.settings || {}) };
    for (const r of (monthData?.rows || [])) {
      const ym = basis === 'delivery' ? deliveryMonthOf(r.deliveryDate, cutoffDay) : ledgerYm;
      if (!ym || !mIndex.has(ym)) continue;
      const mi = mIndex.get(ym);
      const company = (r.company || '').trim() || '（会社名未入力）';
      const group = catOf(r.category).group; // 'offshore' | 'lab'
      if (!byCompany.has(company)) {
        byCompany.set(company, { group, names: months.map(() => new Set()), vals: months.map(() => 0) });
      }
      const e = byCompany.get(company);
      if (metricId === 'count') {
        const name = (r.prodName || '').trim();
        if (name) e.names[mi].add(name); else e.vals[mi] += 1;
      } else if (metricId === 'sheets') {
        e.vals[mi] += num(r.sheets);
      } else if (metricId === 'bill') {
        e.vals[mi] += num(r.billAmount);
      } else {
        const c = computeRow(r, settings);
        if (metricId === 'prod') e.vals[mi] += c.prod;
        else if (metricId === 'taxIncl') e.vals[mi] += c.taxIncl;
        else if (metricId === 'outsourceJPY') e.vals[mi] += c.outsourceJPY;
      }
    }
  }
  const groups = { offshore: [], lab: [] };
  for (const [company, e] of byCompany) {
    const values = e.vals.map((v, i) => v + (metricId === 'count' ? e.names[i].size : 0));
    const total = values.reduce((s, v) => s + v, 0);
    if (total === 0) continue; // 選択年に実績の無い会社は出さない
    (groups[e.group] || groups.lab).push({ company, values, total });
  }
  for (const g of Object.values(groups)) g.sort((a, b) => b.total - a.total || a.company.localeCompare(b.company, 'ja'));
  const sumRows = (rows) => {
    const values = months.map((_, i) => rows.reduce((s, r) => s + r.values[i], 0));
    return { values, total: values.reduce((s, v) => s + v, 0) };
  };
  const groupTotals = { offshore: sumRows(groups.offshore), lab: sumRows(groups.lab) };
  const grand = sumRows([...groups.offshore, ...groups.lab]);
  return { months, groups, groupTotals, grand };
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
