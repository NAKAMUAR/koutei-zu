// 帳票の雛形スクリプト（sync/billing/Billing.gs）の純ロジックと、偽のシートでの読み込み・発行を Node で検証する。
// 実行: node sync/test/billing.test.mjs （データは架空）
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }

const src = fs.readFileSync(new URL('../billing/Billing.gs', import.meta.url), 'utf8');
function load(extra = {}) {
  const pad = (n) => String(n).padStart(2, '0');
  const g = {
    console, JSON, Math, Date, String, Number, Object, Array, parseInt, parseFloat, isFinite, encodeURIComponent,
    Utilities: {
      // 架空の環境ではベトナム時間＝UTC+7 として書く
      formatDate: (d, tz, f) => {
        const v = new Date(d.getTime() + 7 * 3600000);
        return f.replace('yyyy', v.getUTCFullYear()).replace('MM', pad(v.getUTCMonth() + 1)).replace('dd', pad(v.getUTCDate()));
      },
    },
    ...extra,
  };
  vm.createContext(g);
  vm.runInContext(src + '\n;globalThis.BL_LAYOUTS = BL_LAYOUTS;', g);
  return g;
}
const g = load();

test('タブ名から種類を決める', () => {
  assert.equal(g.blTypeOfSheetName_('新見積書（ver2025-0212）'), 'estimate');
  assert.equal(g.blTypeOfSheetName_('発注書'), 'order');
  assert.equal(g.blTypeOfSheetName_('請求書'), 'invoice');
  assert.equal(g.blTypeOfSheetName_('発行一覧'), null);
});

test('NO はアプリと同じ書き方で、同じ月の続きの番号', () => {
  const now = new Date(Date.UTC(2026, 10, 3, 3));
  assert.equal(g.blNextNo_('invoice', [], now), 'I-202611-01');
  assert.equal(g.blNextNo_('invoice', ['I-202611-01', 'I-202611-07', 'I-202610-12', 'E-202611-09', 'I-202611-03-copy'], now), 'I-202611-08');
  assert.equal(g.blNextNo_('estimate', ['E-202611-02'], now), 'E-202611-03');
});

const tasks = [
  { id: 't1', projectNameInternal: 'REN.94', projectName: 'ロイヤルパークス有明', companyName: 'リノべる株式会社', viewpointNameExternal: '外観視点①', stepName: '初稿', stepAmount: '30000', stepCompletedDate: '2026-10-20', createdAt: 1 },
  { id: 't2', projectNameInternal: 'REN.94', projectName: 'ロイヤルパークス有明', companyName: 'リノべる株式会社', viewpointName: 'IN1', stepName: '修正1', stepAmount: 5000, stepCompletedDate: '2026-10-10', createdAt: 2, invoiceCheckedAt: 99 },
  { id: 't3', projectNameInternal: 'REN.94', viewpointName: 'IN2', stepName: '初稿', stepAmount: '', createdAt: 3 },
  { id: 't4', projectNameInternal: 'SAN.27', projectName: 'RJR道修町計画', companyName: 'サンゲツ', viewpointName: 'EX1', stepDeliveryNameOverride: 'RJR_外観', stepAmount: '¥12,000', stepCompletedDate: '2026-10-28', createdAt: 4 },
];

test('金額の入った作業を案件ごとにまとめる（未請求がある案件が先）', () => {
  const ps = g.blProjectsFromTasks_(tasks);
  assert.deepEqual([...ps.map(p => p.key)], ['SAN.27', 'REN.94']);
  const ren = ps.find(p => p.key === 'REN.94');
  assert.equal(ren.tasks.length, 2, '金額が空の作業は入れない');
  assert.equal(ren.total, 35000);
  assert.equal(ren.open, 1);
  assert.equal(ps[0].total, 12000, '¥・カンマ付きも読む');
});

test('明細：請求書は未請求だけ・見積書は全部。名前は納品名→視点＋ステップ', () => {
  const ren = g.blProjectsFromTasks_(tasks).find(p => p.key === 'REN.94');
  const inv = g.blItemsForProject_(ren, 'invoice', false);
  assert.equal(inv.length, 1);
  assert.deepEqual({ ...inv[0] }, { date: '2026-10-20', name: '外観視点① 初稿', qty: 1, unit: 30000, taskId: 't1' });
  assert.equal(g.blItemsForProject_(ren, 'invoice', true).length, 2);
  const est = g.blItemsForProject_(ren, 'estimate', false);
  assert.deepEqual([...est.map(i => i.taskId)], ['t2', 't1'], '完了日の順');
  const san = g.blProjectsFromTasks_(tasks).find(p => p.key === 'SAN.27');
  assert.equal(g.blItemsForProject_(san, 'order', false)[0].name, 'RJR_外観');
});

test('書く場所：雛形ごとの位置。明細が行数を超えたら最後の行にまとめる', () => {
  const items = Array.from({ length: 12 }, (_, i) => ({ date: '2026-10-0' + (i % 9 + 1), name: '視点' + (i + 1), qty: 1, unit: 1000 }));
  const plan = g.blPlanFill_('invoice', { company: 'リノべる株式会社', subject: '有明（REN.94）', items });
  const at = (a1) => plan.find(c => c.a1 === a1);
  assert.equal(at('B12').value, 'リノべる株式会社');
  assert.equal(at('D18').value, '有明（REN.94）');
  assert.equal(at('C30').value, '視点1');
  assert.equal(at('J30').value, 1000);
  assert.equal(at('B30').value, '2026-10-01');
  assert.ok(at('C39').value.startsWith('ほか 3件（視点10・視点11・視点12'));
  assert.equal(at('J39').value, 3000);
  assert.ok(!plan.some(c => /^M/.test(c.a1)), '金額の列（計算式）には書かない');
  const est = g.blPlanFill_('estimate', { company: 'X', subject: 'Y', items: items.slice(0, 2) });
  assert.equal(est.find(c => c.a1 === 'E11').value, 'X');
  assert.equal(est.find(c => c.a1 === 'M17').value, 'Y');
  assert.equal(est.find(c => c.a1 === 'E32').value, '視点1');
  assert.equal(est.find(c => c.a1 === 'AO33').value, 1000);
  assert.equal(est.find(c => c.a1 === 'E34').value, '', '残りの行は空にする');
  const ord = g.blPlanFill_('order', { company: 'お客様', subject: 'Z', items: [] });
  assert.equal(ord.find(c => c.a1 === 'K17').value, 'お客様', '発注書はお客様が発行元側');
  assert.ok(!ord.some(c => c.a1 === 'B12'), '発注書の宛先（リーベグ）は書き換えない');
});

test('入力を空にする場所（発行元・振込先・計算式は含めない）', () => {
  const cells = g.blInputCells_('invoice');
  ['N5', 'N7', 'B12', 'D18', 'D19', 'B30', 'C39', 'I30', 'J39'].forEach(c => assert.ok(cells.includes(c), c));
  ['M30', 'M43', 'B49', 'M17'].forEach(c => assert.ok(!cells.includes(c), c));
  assert.equal(g.blCol_('AZ'), 52);
  assert.deepEqual({ ...g.blCell_('BA4') }, { row: 4, col: 53 });
});

test('工程図の帳票一覧に入れる形（請求書は送付済み）', () => {
  const now = new Date(Date.UTC(2026, 10, 3, 3));
  const d = g.blAppDoc_('invoice', { no: 'I-202611-01', issueDate: '2026-11-03', company: 'A社', subject: 'S', items: [{ date: '2026-10-20', name: 'n', qty: 1, unit: 30000 }, { name: '', unit: 0 }], pdfUrl: 'https://drive/x' }, now);
  assert.equal(d.type, 'invoice');
  assert.equal(d.to.company, 'A社');
  assert.equal(d.items.length, 1);
  assert.equal(d.items[0].unit, '30000');
  assert.equal(d.items[0].taxRate, 10);
  assert.equal(d.status, 'sent');
  assert.equal(d.sentDate, '2026-11-03');
  assert.equal(d.source, 'sheet');
  const o = g.blAppDoc_('order', { no: 'O-1', issueDate: '2026-11-03', company: 'お客様', items: [] }, now);
  assert.equal(o.from.company, 'お客様');
  assert.equal(o.to.company, '株式会社リーベグ');
  assert.equal(o.status, undefined);
});

// ---- 偽のシートで「読み込む」→「PDFで発行」 ----
function fakeEnv(tabName, { packs = false } = {}) {
  const cells = {};
  const formulas = {};
  // 請求書の雛形：金額の列に式がある
  for (let r = 30; r <= 39; r++) formulas['M' + r] = `=if(I${r}<>"",I${r}*J${r},)`;
  const range = (a1) => ({
    getValue: () => {
      if (a1 === 'M43') return Object.keys(cells).filter(k => /^J\d+$/.test(k)).reduce((s, k) => s + (Number(cells[k]) || 0) * (Number(cells['I' + k.slice(1)]) || 0), 0) * 1.1;
      return cells[a1] === undefined ? '' : cells[a1];
    },
    setValue: (v) => { cells[a1] = v; },
    getFormula: () => formulas[a1] || '',
    setFormula: (f) => { formulas[a1] = f; },
    clearContent: () => { delete cells[a1]; },
  });
  const sheet = { getName: () => tabName, getSheetId: () => 409914250, getRange: range };
  const log = { rows: [], getLastRow() { return this.rows.length + 1; }, appendRow(r) { this.rows.push(r); }, getRange: () => ({ getValues: () => log.rows.map(r => [r[2]]) }) };
  const props = {};
  const fetches = [];
  const dialogs = [];
  const ss = { getActiveSheet: () => sheet, getSheetByName: (n) => (n === '発行一覧' ? log : null), getId: () => 'SSID' };
  const docTasks = tasks.map(t => ({ name: 'projects/p/databases/d/documents/workspaces/w/tasks/' + t.id, fields: Object.fromEntries(Object.entries(t).filter(([k]) => k !== 'id').map(([k, v]) => [k, typeof v === 'number' ? { integerValue: String(v) } : { stringValue: v }])) }));
  const env = load({
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss, flush: () => {},
      getUi: () => ({ alert: () => 'YES', ButtonSet: { YES_NO: 1 }, Button: { YES: 'YES' }, showModalDialog: (h, t) => dialogs.push({ t, h }) }),
    },
    HtmlService: { createHtmlOutput: (h) => ({ html: h, setWidth() { return this; }, setHeight() { return this; } }) },
    PropertiesService: { getDocumentProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; }, deleteProperty: (k) => { delete props[k]; } }) },
    ScriptApp: { getOAuthToken: () => 'TOKEN' },
    UrlFetchApp: {
      fetch: (url, opt = {}) => {
        fetches.push({ url, method: opt.method || 'get', body: opt.payload });
        let body = '{}';
        if (url.includes('/tasks?')) body = JSON.stringify({ documents: docTasks });
        else if (packs && /\/data\/taskPacks$/.test(url.split('?')[0])) body = JSON.stringify({ fields: { v: { integerValue: '1' }, packs: { integerValue: '64' } } });
        else if (packs && url.includes('/data/taskPacks/packs?')) {
          const t = {};
          docTasks.forEach(d => { t[d.name.split('/').pop()] = { mapValue: { fields: d.fields } }; });
          body = JSON.stringify({ documents: [{ name: 'x/p00', fields: { t: { mapValue: { fields: t } } } }] });
        }
        else if (url.includes(':runQuery')) body = JSON.stringify([{ document: { fields: { value: { stringValue: JSON.stringify({ no: 'I-202611-04' }) } } } }, { readTime: 'x' }]);
        else if (url.includes('/export?')) return { getResponseCode: () => 200, getBlob: () => ({ setName(n) { this.name = n; return this; } }) };
        return { getResponseCode: () => 200, getContentText: () => body };
      },
    },
    DriveApp: {
      getFileById: () => ({ getParents: () => ({ hasNext: () => false }) }),
      getRootFolder: () => ({ getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => ({ createFile: (b) => ({ getUrl: () => 'https://drive.google.com/file/' + b.name }) }) }),
    },
  });
  return { env, cells, formulas, log, props, fetches, dialogs };
}

test('偽のシート：工程図から読み込む → PDFで発行（NO・発行日・一覧・工程図への登録・請求済み）', () => {
  const f = fakeEnv('請求書');
  const msg = f.env.blImportProject('REN.94', false);
  assert.ok(msg.includes('1件'), msg);
  assert.equal(f.cells.B12, 'リノべる株式会社');
  assert.equal(f.cells.D18, 'ロイヤルパークス有明（REN.94）');
  assert.equal(f.cells.C30, '外観視点① 初稿');
  assert.equal(f.cells.J30, 30000);
  assert.equal(f.cells.C31, '');
  assert.ok(f.props.bl_import_409914250.includes('t1'));
  f.env.blIssuePdf();
  assert.equal(f.cells.N5, 'I-202611-05', '工程図にある I-202611-04 の続き');
  assert.ok(f.cells.N7 instanceof Date, '発行日が入る');
  assert.equal(f.log.rows.length, 1);
  const row = f.log.rows[0];
  assert.equal(row[1], '請求書');
  assert.equal(row[2], 'I-202611-05');
  assert.equal(row[6], 33000, '税込の合計');
  assert.ok(row[7].includes('請求書_I-202611-05_リノべる株式会社_ロイヤルパークス有明（REN.94）.pdf'));
  assert.equal(row[9], 'REN.94');
  const bill = f.fetches.find(x => x.url.includes('/data/bill_') && x.method === 'patch');
  assert.ok(bill, '工程図の帳票一覧に登録');
  const doc = JSON.parse(JSON.parse(bill.body).fields.value.stringValue);
  assert.equal(doc.no, 'I-202611-05');
  assert.equal(doc.items[0].name, '外観視点① 初稿');
  const mark = f.fetches.filter(x => x.url.includes('/tasks/t1?updateMask.fieldPaths=invoiceCheckedAt'));
  assert.equal(mark.length, 1, '読み込んだ作業を請求済みに');
  assert.equal(f.props.bl_import_409914250, undefined, '発行したら覚えた作業を消す');
  assert.ok(f.dialogs[0].h.html.includes('PDF を開く'));
  // 入力を空にする
  f.env.blClearInputs();
  assert.equal(f.cells.N5, undefined);
  assert.equal(f.cells.C30, undefined);
  assert.ok(f.formulas.M30, '計算式は残す');
});

test('偽のシート：雛形でないタブ・明細が空なら発行しない', () => {
  const f = fakeEnv('発行一覧');
  assert.throws(() => f.env.blIssuePdf(), /見積書・発注書・請求書のタブ/);
  const g2 = fakeEnv('発注書');
  g2.env.blIssuePdf();
  assert.equal(g2.log.rows.length, 0);
  // 発注書は金額の式が4行分しか無いので、書いた行に式を足す
  g2.env.blImportProject('REN.94', false);
  assert.ok(g2.formulas.M30 && g2.formulas.M31);
});


// ---- 売上総合報告書 ----
// 本物の雛形の見出しの書き方をまねた B・C 列（区分ごとに行数を小さくしたもの）
const HEADERS = [
  '　1. オフショア国内売上（消費税有、本社取分有）',
  '　2. ラボ国内売上（ソーシャルインテリア社/消費税有、本社取分有/税込275,000円）',
  '　３.ラボ国内売上（玉善/消費税有、本社取分有/税込605,000円）',
  '　４. オフショア国際売上（消費税無、本社取分無）',
  '　5. ラボ国際売上（田中建設/消費税無/本社取分無）　',
  '　6. ラボ国際売上（リノべるRinoveru/消費税無/本社取分無）',
  '　7. ラボ国際売上（オフィスコム社_パース制作）',
  '　7. ラボ国際売上（オフィスコム社_図面作成）',
  '　8. ラボ国際売上（CG工房社）',
];
function salesBC(rowsPer = 3) {
  const bc = [['', ''], ['2026年6月分 売上総合', ''], ['', ''], ['', ''], ['', ''], ['', ''], ['売上基本情報', ''], ['区分', '番号'], ['', '']];
  HEADERS.forEach((h, i) => {
    bc.push([h, '']);
    for (let n = 1; n <= rowsPer; n++) bc.push([n === 1 ? '\nオ\nフ' : '', String(n)]);
    bc.push(['合計金額', i === 7 ? '' : '']);
    bc.push(['', '']);
  });
  return bc;
}

test('報告書：見出しから区分と書く行を探す', () => {
  const secs = g.blDetectSections_(salesBC(3), 1);
  assert.equal(secs.length, 9);
  assert.equal(secs[0].cat, 'offshore_dom');
  assert.equal(secs[0].headerRow, 10);
  assert.equal(secs[0].from, 11);
  assert.equal(secs[0].to, 13);
  assert.deepEqual([...secs.map(s => s.cat)], ['offshore_dom', 'lab_dom', 'lab_dom', 'offshore_intl', 'lab_intl', 'lab_intl', 'lab_intl', 'lab_intl', 'lab_intl']);
  assert.equal(g.blHeaderCompany_(HEADERS[0]), '');
  assert.equal(g.blHeaderCompany_(HEADERS[2]), '玉善');
  assert.equal(g.blHeaderCompany_(HEADERS[6]), 'オフィスコム社');
});

test('報告書：売上の行を入れる区分（会社名・図面作成・会社名の無い区分）', () => {
  const secs = g.blDetectSections_(salesBC(3), 1);
  const idx = (r) => { const s = g.blSectionFor_(r, secs); return s ? secs.indexOf(s) : -1; };
  assert.equal(idx({ category: 'offshore_dom', company: 'リノべる株式会社' }), 0, 'リノべるでもオフショア国内はオフショア国内');
  assert.equal(idx({ category: 'lab_intl', company: 'リノべる株式会社' }), 5);
  assert.equal(idx({ category: 'lab_dom', company: '玉善' }), 2);
  assert.equal(idx({ category: 'lab_dom', company: 'ソーシャルインテリア' }), 1);
  assert.equal(idx({ category: 'lab_intl', company: '田中建設株式会社' }), 4);
  assert.equal(idx({ category: 'lab_intl', company: 'オフィスコム社', prodType: '外観目線' }), 6);
  assert.equal(idx({ category: 'lab_intl', company: 'オフィスコム', prodName: '図面作成_1F' }), 7);
  assert.equal(idx({ category: 'lab_intl', company: 'ＣＧ工房社' }), 8);
  assert.equal(idx({ category: 'offshore_intl', company: 'X' }), 3);
  assert.equal(idx({ category: 'lab_intl', company: '新しい会社' }), -1, '会社名の区分が無いラボは入れない');
});

test('報告書：制作種類・制作名を雛形の選択肢に合わせる', () => {
  assert.equal(g.blProdKind_({ prodType: '外観目線', prodName: '有明_外観目線視点①_初稿' }), '建築パース');
  assert.equal(g.blProdKind_({ prodName: 'ブランズ大塚VR' }), '建築ＶＲ');
  assert.equal(g.blProdKind_({ prodType: '外観モデル' }), 'モデリング');
  assert.equal(g.blProdKind_({ prodType: '内観写真合成' }), '写真合成');
  assert.equal(g.blProdName_({ prodName: '有明_2F内観目線視点③_パターンA_修正1' }), '内観目線③');
  assert.equal(g.blProdName_({ prodName: 'X_外観鳥瞰視点②' }), '外観鳥瞰②');
  assert.equal(g.blProdName_({ prodName: 'モデル' }), '');
  const list = ['＜内観目線パース (cut tầm mắt nội thất)＞', '内観目線③ (cut tầm mắt nội thất ③)', '建築パース(Phối cảnh kiến trúc)', '建築ＶＲ(Kiến trúc VR)'];
  assert.equal(g.blFitList_('内観目線③', list), '内観目線③ (cut tầm mắt nội thất ③)');
  assert.equal(g.blFitList_('建築パース', list), '建築パース(Phối cảnh kiến trúc)');
  assert.equal(g.blFitList_('建築ＶＲ', list), '建築ＶＲ(Kiến trúc VR)');
  assert.equal(g.blFitList_('内観目線⑨', list), null, '選択肢に無い');
  assert.equal(g.blFitList_('自由', null), '自由', '選択肢の無い欄はそのまま');
  assert.equal(g.blFitList_('', list), '');
});

test('報告書：行が足りない・区分が無い行は分けて返す。1行の値（日付・金額・完了・備考）', () => {
  const secs = g.blDetectSections_(salesBC(2), 1);
  const rows = [
    { category: 'lab_dom', company: '玉善', projectName: 'A', prodAmount: '10000', deliveryDate: '2026-10-03' },
    { category: 'lab_dom', company: '玉善', projectName: 'B', prodAmount: '10000', deliveryDate: '2026-10-01' },
    { category: 'lab_dom', company: '玉善', projectName: 'C', prodAmount: '10000', deliveryDate: '2026-10-05' },
    { category: 'lab_intl', company: '新しい会社', projectName: 'D' },
  ];
  const plan = g.blPlanSales_(rows, secs);
  assert.deepEqual([...plan.placed.map(p => p.row.projectName)], ['B', 'A'], '納品日の順');
  assert.equal(plan.placed[0].sheetRow, secs[2].from);
  assert.equal(plan.overflow[0].projectName, 'C');
  assert.equal(plan.unplaced[0].projectName, 'D');
  const v = g.blSalesValues_({ company: 'リノべる株式会社', person: '井上様', projectName: '有明', prodType: '内観目線', prodName: '有明_内観目線視点⑬_初稿', prodAmount: '28000', outsourceVND: '', orderDate: '2026-09-04', deliveryDate: '2026-09-11', note: 'メモ' }, (col, value) => (col === 8 && value ? null : value));
  assert.equal(v[4], 'リノべる株式会社');
  assert.equal(v[7], '建築パース');
  assert.equal(v[12], 28000);
  assert.equal(v[11], '');
  assert.equal(v[15].getMonth(), 8);
  assert.equal(v[17].getDate(), 11);
  assert.equal(v[18], '納品済');
  assert.equal(v[16], '', '予定日が無ければ空');
  assert.ok(v[28].includes('メモ') && v[28].includes('制作名：有明_内観目線視点⑬_初稿'), '選択肢に無い制作名は備考へ');
  const v2 = g.blSalesValues_({ company: '知らない会社', prodName: '外観目線視点①' }, (col, value) => (col === 4 ? null : value));
  assert.equal(v2[4], '');
  assert.ok(v2[28].includes('会社名：知らない会社'));
  assert.equal(g.blSalesTabName_('2026-11'), '売上総合報告書(2026.11月分)');
  assert.equal(g.blSalesTitle_('2026-01'), '2026年1月分 売上総合');
});

test('偽のシート：雛形から月の報告書を作り、売上登録表の行を流し込む', () => {
  const bc = salesBC(3);
  const grid = {}; // 'r,c' → 値（雛形）
  bc.forEach((r, i) => { grid[(i + 1) + ',2'] = r[0]; grid[(i + 1) + ',3'] = r[1]; });
  grid['11,4'] = '古い会社'; grid['11,12'] = 99999; grid['11,13'] = '=L11*0.1'; // 雛形に残っていた記入と計算式
  const lists = { 4: ['リノべる株式会社', '玉善'], 8: ['内観目線① (cut tầm mắt nội thất ①)'], 18: ['確認待ち', '納品済'] };
  function makeSheet(name, cells) {
    const sh = {
      name, cells,
      getName: () => sh.name, setName(n) { sh.name = n; return sh; }, getSheetId: () => 1,
      getLastRow: () => bc.length,
      copyTo(ss) { const c = makeSheet(sh.name + ' のコピー', { ...sh.cells }); ss.sheets.push(c); return c; },
      getRange(r, c, nr = 1, nc = 1) {
        if (typeof r === 'string') { const m = r.match(/^([A-Z]+)(\d+)$/); return sh.getRange(Number(m[2]), g.blCol_(m[1])); }
        return {
          getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => sh.cells[(r + i) + ',' + (c + j)] ?? '')),
          setValues: (vals) => vals.forEach((row, i) => row.forEach((v, j) => { sh.cells[(r + i) + ',' + (c + j)] = v; })),
          setValue: (v) => { sh.cells[r + ',' + c] = v; },
          clearContent: () => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) delete sh.cells[(r + i) + ',' + (c + j)]; },
          getDataValidation: () => (lists[c] ? { getCriteriaType: () => 'VALUE_IN_LIST', getCriteriaValues: () => [lists[c], true] } : null),
        };
      },
    };
    return sh;
  }
  const tpl = makeSheet('売上総合報告書（雛形）', grid);
  const ss = { sheets: [tpl], getSheetByName(n) { return this.sheets.find(x => x.name === n) || null; }, deleteSheet(x) { this.sheets = this.sheets.filter(y => y !== x); }, setActiveSheet() {} };
  const month = { rows: [
    { category: 'offshore_dom', company: 'リノべる株式会社', person: '井上様', projectName: 'ロイヤルパークス有明', prodType: '内観目線', prodName: '有明_内観目線視点①_初稿', prodAmount: '28000', orderDate: '2026-10-04', deliveryDate: '2026-10-11' },
    { category: 'lab_dom', company: '玉善', projectName: '守山区', prodAmount: '', deliveryDate: '' },
    { category: 'lab_intl', company: '新しい会社', projectName: 'X' },
  ] };
  const env = load({
    SpreadsheetApp: { DataValidationCriteria: { VALUE_IN_LIST: 'VALUE_IN_LIST' } },
    ScriptApp: { getOAuthToken: () => 'T' },
    UrlFetchApp: { fetch: (url) => ({ getResponseCode: () => (url.endsWith('sales_2026-10') ? 200 : 404), getContentText: () => JSON.stringify({ fields: { value: { stringValue: JSON.stringify(month) } } }) }) },
  });
  const msg = env.blBuildSalesReport_(ss, tpl, '2026-10', () => true);
  const sh = ss.getSheetByName('売上総合報告書(2026.10月分)');
  assert.ok(sh, msg);
  assert.equal(sh.cells['2,2'], '2026年10月分 売上総合');
  assert.ok(sh.cells['4,24'] instanceof Date, '最終更新日時（X4）');
  assert.equal(sh.cells['4,23'], false, '最終チェック（W4）は外す');
  assert.equal(sh.cells['11,4'], 'リノべる株式会社', '雛形の古い記入は消して書く');
  assert.equal(sh.cells['11,12'], 28000);
  assert.equal(sh.cells['11,13'], '=L11*0.1', '計算式の列は残す');
  assert.equal(sh.cells['11,8'], '内観目線① (cut tầm mắt nội thất ①)');
  assert.equal(sh.cells['11,18'], '納品済');
  assert.equal(sh.cells['12,4'], undefined, '2行目以降は空');
  const tamaRow = g.blDetectSections_(bc, 1)[2].from;
  assert.equal(sh.cells[tamaRow + ',4'], '玉善');
  assert.equal(sh.cells[tamaRow + ',18'], '確認待ち');
  assert.equal(tpl.cells['11,4'], '古い会社', '雛形そのものは変えない');
  assert.ok(msg.includes('3行のうち 2行'), msg);
  assert.ok(msg.includes('入れる区分が見つからなかった 1行'), msg);
  // 作り直し：確認で「いいえ」なら何もしない
  assert.equal(env.blBuildSalesReport_(ss, tpl, '2026-10', () => false), '');
  // データの無い月は空の報告書
  const msg2 = env.blBuildSalesReport_(ss, tpl, '2026-12', () => true);
  assert.ok(msg2.includes('データがありません'), msg2);
});

test('工程図がまとめ保存のとき：まとめから作業を読み、請求済みはそのまとめの t.{id}.invoiceCheckedAt だけ書く', () => {
  const f = fakeEnv('請求書', { packs: true });
  const msg = f.env.blImportProject('REN.94', false);
  assert.ok(msg.includes('1件'), msg);
  f.env.blIssuePdf();
  assert.equal(f.fetches.filter(x => x.url.includes('/tasks')).length, 0, '旧 tasks は読み書きしない');
  const mark = f.fetches.filter(x => x.method === 'patch' && x.url.includes('/data/taskPacks/packs/'));
  assert.equal(mark.length, 1);
  assert.ok(decodeURIComponent(mark[0].url).includes('updateMask.fieldPaths=t.t1.invoiceCheckedAt'), mark[0].url);
  assert.ok(JSON.parse(mark[0].body).fields.t.mapValue.fields.t1.mapValue.fields.invoiceCheckedAt);
});

console.log(`billing: ${passed} tests passed`);
