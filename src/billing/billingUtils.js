// 帳票（見積書・発注書・請求書）の純粋ロジック・テンプレート定義
// UI を持たない関数・定数のみ。保存は storage（key: 'billingDocuments'）に JSON 配列で。

// ---- 種別 ----
export const DOC_TYPES = [
  { id: 'estimate', label: '見積書', title: '御 見 積 書', accent: '#3a3a3a', leadText: '下記のとおり、御見積り申し上げます。' },
  { id: 'order', label: '発注書', title: '発 注 書', accent: '#3a7bd5', leadText: '下記のとおり、御発注申し上げます。' },
  { id: 'invoice', label: '請求書', title: '御 請 求 書', accent: '#8bc34a', leadText: '下記のとおり、ご請求申し上げます' },
];
export function docTypeOf(id) { return DOC_TYPES.find(t => t.id === id) || DOC_TYPES[0]; }

// ---- 発行元（自社）の既定値。帳票種別ごとにテンプレ値が異なるため分けて保持 ----
export const REBEG_ESTIMATE = {
  company: '株式会社リーベグ', zip: '657-0831',
  address: '兵庫県神戸市灘区水道筋5丁目3-24 神栄ビル102',
  tel: '0798-62-1666 (代)', person: '中村', regNo: '',
};
export const REBEG_INVOICE = {
  company: '株式会社リーベグ', zip: '663-8126',
  address: '兵庫県西宮市小松北町2丁目7-4',
  tel: '0798-62-1666 (代)', person: '中村', regNo: 'T4140001034351',
};

// 請求書の振込先（備考欄の定型）
export const INVOICE_BANK_LINES = [
  '・楽天銀行',
  '・第三営業支店（253）',
  '・口座番号（7244383）',
  '・口座名義（株式会社 リーベグ CG事業部）',
];

export const NOTE_DEFAULTS = {
  estimate: 'お支払いに係る振込手数料などの諸費用は、全てお客様負担となりますのでご留意下さい。\nその他、弊社制作不備は無償対応となりますが、お客様要望の修正・変更は別途追加費用の対象となります。',
  order: 'お振込手数料などの諸費用は、全てお客様のご負担となりますのでご留意下さい。',
  invoice: '※お振込手数料などの諸費用は、全てお客様のご負担となりますのでご留意下さい。',
};

// 見積書1枚目の定型フィールド
export const ESTIMATE_FIXED = {
  productionTerms: '本書２枚目「制作条件書」に記載。\n上記未記載内容・追加事項に関しては別途費用追加。',
  paymentTerms: '納品月締め/翌月末払い',
  validity: '発行日より２週間',
};

// ---- 見積書2枚目「制作条件書」テンプレート ----
// セクションごとに行を持ち、各行は選択肢（options）＋補足（note）を編集できる
export const CONDITION_SECTIONS = [
  {
    title: '制作共通条件',
    rows: [
      { key: 'c1', label: '1. 制作内容・種類', options: ['外観制作（目線）', '外観制作（鳥瞰）', '内観制作（目線）', '内観制作（鳥瞰）'] },
      { key: 'c2', label: '2. 最終納品画素数（JPG）', options: ['2000PX', '3000PX', '4000PX', 'その他'] },
      { key: 'c3', label: '3. 制作時間帯', options: ['早朝', '昼', '夜', 'その他'] },
      { key: 'c4', label: '4. 周辺環境（区画外部分）', options: ['無し', '白色箱形状', 'G-MAP写真合成', 'その他'] },
      { key: 'c5', label: '5. 人物点景', options: ['無し', 'グレー人物点景', 'カラー人物点景', 'その他'] },
    ],
  },
  {
    title: '外観制作条件',
    rows: [
      { key: 'e1', label: '1. 前面道路', options: ['無し', '既存データ使用', '新規制作', '写真合成'] },
      { key: 'e2', label: '2. 背景（空）', options: ['無し', '既存データ使用', 'G-MAP写真合成', 'その他'] },
      { key: 'e3', label: '3. 車類', options: ['無し', '既存データ使用', '新規制作', '写真合成'] },
      { key: 'e4', label: '4. 植栽類', options: ['無し', '既存データ使用', '新規制作', '写真合成'] },
      { key: 'e5', label: '5. 内観反映・什器制作', options: ['無し', '有り（既存データ）', '有り（新規制作）', '写真合成'] },
    ],
  },
  {
    title: '内観制作条件',
    rows: [
      { key: 'i1', label: '1. 什器類', options: ['無し', '既存データ使用', '新規制作', 'その他'] },
      { key: 'i2', label: '2. 雑貨類', options: ['無し', '既存データ使用', '新規制作', 'その他'] },
      { key: 'i3', label: '3. 植栽類', options: ['無し', '既存データ使用', '新規制作', '写真合成'] },
      { key: 'i4', label: '4. 色温度', options: ['2000K', '4000K', '6000K', 'その他'] },
      { key: 'i5', label: '5. 外観反映・制作', options: ['無し', '有り（写真合成）', '有り（データ制作）', 'その他'] },
    ],
  },
];

// ---- 見積書3枚目「制作スケジュール / 工程予定表」テンプレート ----
export const SCHEDULE_PROCESS_COLUMNS = [
  { label: 'お客様 制作資料送付', party: 'client' },
  { label: '資料翻訳・作業開始', party: 'us' },
  { label: 'アングル確認パース提出', party: 'us' },
  { label: 'お客様チェックバック', party: 'client' },
  { label: '初稿パース提出', party: 'us' },
  { label: 'お客様チェックバック', party: 'client' },
  { label: '最終納品', party: 'us' },
];
export const SCHEDULE_TIME_ROWS = ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '終日'];
export const SCHEDULE_NOTE_DEFAULT = 'チェックバック及びご修正内容によって納期が前後する場合がございますので、ご了承くださいませ。';

// ---- ID・日付 ----
export function genDocId() {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function pad2(n) { return String(n).padStart(2, '0'); }
export function todayStr(now) {
  const d = now instanceof Date ? now : new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
// 'YYYY-MM-DD' → '2026/04/01（水）'
const WD = ['日', '月', '火', '水', '木', '金', '土'];
export function formatJDate(dateStr) {
  const [y, m, d] = (dateStr || '').split('-').map(Number);
  if (!y || !m || !d) return dateStr || '';
  const dt = new Date(y, m - 1, d);
  return `${y}/${pad2(m)}/${pad2(d)}（${WD[dt.getDay()]}）`;
}

// 連番採番：同種別・同年月（no が「プレフィックス-YYYYMM-」で始まるもの）の最大連番＋1。
// 月が変わると 01 に戻る。複製で付く「-copy」は末尾が数字でないため連番に影響しない。
export function nextDocNo(docs, type, now) {
  const ym = todayStr(now).replace(/-/g, '').slice(0, 6);
  const prefix = { estimate: 'E', order: 'O', invoice: 'I' }[type] || 'D';
  const head = `${prefix}-${ym}-`;
  let maxSeq = 0;
  for (const d of (docs || [])) {
    if (d.type !== type || !String(d.no || '').startsWith(head)) continue;
    const m = String(d.no).slice(head.length).match(/^(\d+)$/);
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  return `${head}${pad2(maxSeq + 1)}`;
}

// ---- 金額 ----
export function formatYen(n) {
  const v = Math.round(Number(n) || 0);
  return '¥' + v.toLocaleString('ja-JP');
}
export function lineAmount(item) {
  const q = parseFloat(item.qty);
  const u = parseFloat(item.unit);
  const qn = isNaN(q) ? 0 : q;
  const un = isNaN(u) ? 0 : u;
  return Math.round(qn * un);
}

// 種別ごとの合計計算。
// 請求書は軽減税率対応（項目ごと 8% / 10%）。見積・発注は一律 10%。
export function computeTotals(doc) {
  const items = doc.items || [];
  if (doc.type === 'invoice') {
    let base8 = 0, base10 = 0;
    for (const it of items) {
      const amt = lineAmount(it);
      if (Number(it.taxRate) === 8) base8 += amt; else base10 += amt;
    }
    const tax8 = Math.floor(base8 * 0.08);
    const tax10 = Math.floor(base10 * 0.10);
    const subtotal = base8 + base10;
    const taxTotal = tax8 + tax10;
    return { base8, base10, tax8, tax10, subtotal, taxTotal, total: subtotal + taxTotal };
  }
  const subtotal = items.reduce((s, it) => s + lineAmount(it), 0);
  const tax = Math.floor(subtotal * 0.10);
  return { subtotal, tax, total: subtotal + tax };
}

// ---- 空の項目・空ドキュメント ----
export function blankItem(type) {
  const it = { id: genDocId(), name: '', qty: '', unit: '' };
  if (type === 'invoice') { it.date = ''; it.taxRate = 10; it.reduced = false; }
  return it;
}

export function blankDoc(type, docs, now) {
  const base = {
    id: genDocId(),
    type,
    no: nextDocNo(docs || [], type, now),
    issueDate: todayStr(now),
    subject: '',
    // 御中（宛先）側
    to: { company: '', honorific: '御中', zip: '', address: '', tel: '', rep: '' },
    // 発行元（自社）側
    from: type === 'invoice' ? { ...REBEG_INVOICE } : { ...REBEG_ESTIMATE },
    items: [blankItem(type), blankItem(type), blankItem(type)],
    note: NOTE_DEFAULTS[type] || '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  if (type === 'estimate') {
    base.productionTerms = ESTIMATE_FIXED.productionTerms;
    base.paymentTerms = ESTIMATE_FIXED.paymentTerms;
    base.validity = ESTIMATE_FIXED.validity;
    base.conditions = {}; // { [rowKey]: { selected: number|null, note: '' } }
    base.schedule = blankSchedule();
    base.angles = { exteriorLabel: '', exterior: '', interior: '' };
  }
  if (type === 'order') {
    // 発注書は「御中」=発注先（既定: リーベグ）、発行元=発注者（お客様, 署名捺印欄あり）
    base.to = { company: '株式会社リーベグ', honorific: '御中', zip: '', address: '', tel: '', rep: '' };
    base.from = { company: '', zip: '', address: '', tel: '', person: '', regNo: '', rep: '' };
  }
  if (type === 'invoice') {
    base.paymentDeadline = '';
    base.bankLines = [...INVOICE_BANK_LINES];
  }
  return base;
}

export function blankSchedule() {
  return {
    projectName: '',
    content: '建築CGパース',
    overview: '',
    conditions: '',
    special: '',
    columns: SCHEDULE_PROCESS_COLUMNS.map(c => ({ label: c.label, party: c.party, date: '', times: {} })),
    note: SCHEDULE_NOTE_DEFAULT,
    specialRule: '',
  };
}

// 見積書は4ページ、発注書・請求書は1ページ
export function pageCountOf(doc) {
  return doc.type === 'estimate' ? 4 : 1;
}
