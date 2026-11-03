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
function fakeEnv(tabName) {
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

console.log(`billing: ${passed} tests passed`);
