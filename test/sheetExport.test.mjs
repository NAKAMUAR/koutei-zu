// シート貼り付け用の書き出し（売上登録表・帳票一覧 → タブ区切り）を Node で検証する。
// 実行: node test/sheetExport.test.mjs
import assert from 'node:assert/strict';
import { salesTable, billingTable, toTSV, tsvCell, SALES_HEADERS } from '../src/lib/sheetExport.js';
import { collectDeliveryNames } from '../src/viewpoint/salesSync.js';

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }

const ledger = {
  '2026-10': { rows: [
    { category: 'offshore_dom', company: 'リノべる株式会社', projectName: 'マンション', prodName: 'マンション_外観①白色', prodAmount: '15000', orderDate: '2026-10-03' },
    { category: 'offshore_intl', company: 'ALEG', projectName: 'Villa', prodAmount: '8000' },
  ] },
  '2026-11': { rows: [{ category: 'offshore_dom', company: 'RIC', projectName: '=危ない', prodAmount: '4000', note: '1行目\n2行目' }] },
  'bad': { rows: [{}] },
};

test('売上：月の範囲で絞り、区分ごとに番号、税込みを計算', () => {
  const t = salesTable(ledger, '2026-10', '2026-10');
  assert.equal(t.headers, SALES_HEADERS);
  assert.equal(t.rows.length, 2);
  const r = t.rows[0];
  assert.equal(r[0], '2026-10');
  assert.equal(r[1], 'オフショア国内売上');
  assert.equal(r[2], 1);
  assert.equal(r[11], 15000);
  assert.equal(r[12], 1500, '国内は消費税10%');
  assert.equal(r[13], 16500);
  assert.equal(t.rows[1][12], '', '国際は税なし');
  assert.equal(salesTable(ledger, '2026-10', '2026-11').rows.length, 3);
  assert.equal(salesTable(ledger, '', '').rows.length, 3, '月でない鍵は無視');
});

test('タブ区切り：数式に見える文字・改行・0始まりの番号を安全に', () => {
  assert.equal(tsvCell('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(tsvCell('-5'), '-5');
  assert.equal(tsvCell('a\tb\nc'), 'a b c');
  assert.equal(tsvCell('0012'), "'0012");
  assert.equal(tsvCell(null), '');
  const tsv = toTSV(['A', 'B'], [[1, '=x'], ['y', '']]);
  assert.equal(tsv, "A\tB\n1\t'=x\ny\t");
  const all = toTSV(salesTable(ledger, '2026-11', '2026-11').headers, salesTable(ledger, '2026-11', '2026-11').rows);
  assert.ok(all.includes("'=危ない"));
  assert.ok(all.includes('1行目 2行目'));
});

test('帳票：種類と発行月で絞り、合計・状態を出す（発注書の相手は発行元の欄）', () => {
  const docs = [
    { type: 'invoice', no: 'INV-1', issueDate: '2026-10-31', to: { company: 'リノべる株式会社' }, subject: '10月分', status: 'sent', sentDate: '2026-11-01',
      items: [{ qty: 1, unit: 10000, taxRate: 10 }, { qty: 2, unit: 1000, taxRate: 8 }] },
    { type: 'estimate', no: 'EST-1', issueDate: '2026-10-05', to: { company: 'ALEG' }, items: [{ qty: 1, unit: 5000 }] },
    { type: 'order', no: 'ORD-1', issueDate: '2026-09-30', to: { company: '自社' }, from: { company: 'お客様A' }, items: [] },
  ];
  const inv = billingTable(docs, ['invoice'], '2026-10-01', '2026-10-31');
  assert.equal(inv.rows.length, 1);
  const r = inv.rows[0];
  assert.deepEqual(r.slice(0, 5), ['請求書', 'INV-1', '2026-10-31', 'リノべる株式会社', '10月分']);
  assert.equal(r[5], 12000);
  assert.equal(r[6], 1000 + 160);
  assert.equal(r[7], 13160);
  assert.equal(r[8], '送付済み');
  const all = billingTable(docs, [], '', '');
  assert.equal(all.rows.length, 3);
  assert.equal(all.rows[0][1], 'INV-1', '発行日の新しい順');
  assert.equal(all.rows[2][3], 'お客様A');
  assert.equal(all.rows[1][8], '', '見積書に状態は無い');
});

test('納品名：シートから登録したタスクを取込キーごとにまとめる（手で付けた名前を優先）', () => {
  const base = { projectName: 'マンション', viewpointName: 'EX1-A', viewpointNameExternal: '外観目線視点①_パターンA' };
  const tasks = [
    { ...base, id: 'a', externalId: 'RIC34::EX1-A::1::white', stepName: 'ホワイト', stepDeliverySuffix: '白色', stepOrder: 0 },
    { ...base, id: 'b', externalId: 'RIC34::EX1-A::1::color', stepName: 'カラー', stepDeliverySuffix: '色付', stepOrder: 1 },
    { ...base, id: 'c', externalId: 'RIC34::EX1-A::2::color_fix', stepName: 'カラー修正1回目', stepDeliveryNameOverride: '特別な名前', stepOrder: 2 },
    { ...base, id: 'd', stepName: '手で足したステップ', stepOrder: 3 },
    { ...base, id: 'e', externalId: 'RIC34::EX1-A::3::white', stepName: 'ホワイト', cancelled: true },
  ];
  const out = collectDeliveryNames(tasks);
  assert.deepEqual(Object.keys(out), ['RIC34::EX1-A::1', 'RIC34::EX1-A::2']);
  assert.equal(out['RIC34::EX1-A::1'].length, 2);
  assert.ok(out['RIC34::EX1-A::1'][0].includes('外観目線視点①_パターンA'), out['RIC34::EX1-A::1'][0]);
  assert.ok(out['RIC34::EX1-A::1'][0].includes('白色'));
  assert.deepEqual(out['RIC34::EX1-A::2'], ['特別な名前']);
});

console.log(`sheetExport: ${passed} tests passed`);
