// 請求書 ⇄ 売上登録表の紐付け（src/billing/salesLink.js）を Node で検証する。
// 実行: node test/salesLink.test.mjs
import assert from 'node:assert/strict';
import { sameCompany, indexSalesRows, salesLinkCandidates, applyInvoiceToSales, compareLinkedTotal } from '../src/billing/salesLink.js';

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }

const row = (id, over = {}) => ({
  id, category: 'lab_dom', company: '株式会社リックデザイン', projectName: 'マンション', prodAmount: '100000',
  invoiceSentDate: '', paymentConfirmedDate: '', ...over,
});
const ledger = () => ({
  '2026-08': { rows: [row('r-aug', { projectName: '別案件' })], settings: {} },
  '2026-09': { rows: [row('r1'), row('r2', { prodAmount: '50000' }), row('r-other', { company: '田中建設', projectName: '倉庫' })], settings: {} },
  '2026-10': { rows: [row('r-oct', { company: 'サンゲツ', projectName: 'マンション' })], settings: {} },
  '2026-12': { rows: [row('r-far', { projectName: '別案件' })], settings: {} },
});
const invoice = (over = {}) => ({
  type: 'invoice', status: 'draft', issueDate: '2026-09-30', subject: 'マンション',
  to: { company: 'リックデザイン' }, items: [{ qty: 1, unit: 150000, taxRate: 10 }], salesRowIds: [], ...over,
});

test('会社名は「株式会社」・全角半角・空白の違いを無視して比べる', () => {
  assert.equal(sameCompany('株式会社リックデザイン', 'リックデザイン'), true);
  assert.equal(sameCompany('リック デザイン', 'リックデザイン'), true);
  assert.equal(sameCompany('(株)ﾘｯｸﾃﾞｻﾞｲﾝ', 'リックデザイン'), true);
  assert.equal(sameCompany('リックデザイン', '田中建設'), false);
  assert.equal(sameCompany('', ''), false);
});

test('売上行の索引は id → 月と行', () => {
  const idx = indexSalesRows(ledger());
  assert.equal(idx.get('r2').ym, '2026-09');
  assert.equal(idx.get('r-oct').row.company, 'サンゲツ');
  assert.equal(idx.has('nothing'), false);
});

test('紐付け候補：同じ会社（±1か月）・同じ案件名（±2か月）・紐付け済み、の順に並ぶ', () => {
  const cands = salesLinkCandidates(ledger(), invoice({ salesRowIds: ['r-far'] }));
  const ids = cands.map(c => c.row.id);
  assert.deepEqual(ids, ['r-far', 'r-oct', 'r1', 'r2', 'r-aug']);
  assert.equal(cands[0].linked, true);
  assert.equal(cands.find(c => c.row.id === 'r-oct').sameProject, true);
  assert.equal(ids.includes('r-other'), false); // 別の会社・別の案件は出さない
});

test('紐付け候補：同じ会社でも発行月から2か月以上離れた行は出さない', () => {
  const ids = salesLinkCandidates(ledger(), invoice()).map(c => c.row.id);
  assert.equal(ids.includes('r-far'), false);
});

test('下書きの請求書は売上行を変えない', () => {
  const res = applyInvoiceToSales(ledger(), invoice({ salesRowIds: ['r1'], sentDate: '2026-10-01' }));
  assert.deepEqual(res.months, {});
  assert.equal(res.filled, 0);
});

test('送付済み：紐付けた行の請求書送付日だけを埋め、変わった月だけ返す', () => {
  const res = applyInvoiceToSales(ledger(), invoice({ status: 'sent', sentDate: '2026-10-01', paidDate: '2026-10-20', salesRowIds: ['r1', 'r2'] }));
  assert.deepEqual(Object.keys(res.months), ['2026-09']);
  const rows = res.months['2026-09'].rows;
  assert.equal(rows.find(r => r.id === 'r1').invoiceSentDate, '2026-10-01');
  assert.equal(rows.find(r => r.id === 'r1').paymentConfirmedDate, ''); // 入金済みではないので入金日は入れない
  assert.equal(rows.find(r => r.id === 'r-other').invoiceSentDate, '');  // 紐付けていない行は変えない
  assert.equal(res.filled, 2);
});

test('入金済み：空の日付だけ埋め、すでに別の日付がある項目は残す', () => {
  const lg = ledger();
  lg['2026-09'].rows[0].invoiceSentDate = '2026-09-28';
  const res = applyInvoiceToSales(lg, invoice({ status: 'paid', sentDate: '2026-10-01', paidDate: '2026-10-20', salesRowIds: ['r1'] }));
  const r1 = res.months['2026-09'].rows.find(r => r.id === 'r1');
  assert.equal(r1.invoiceSentDate, '2026-09-28');
  assert.equal(r1.paymentConfirmedDate, '2026-10-20');
  assert.equal(res.filled, 1);
  assert.equal(res.kept, 1);
});

test('同じ内容で2回保存しても2回目は何も書かない（冪等）', () => {
  const lg = ledger();
  const doc = invoice({ status: 'paid', sentDate: '2026-10-01', paidDate: '2026-10-20', salesRowIds: ['r1'] });
  const first = applyInvoiceToSales(lg, doc);
  const second = applyInvoiceToSales({ ...lg, ...first.months }, doc);
  assert.deepEqual(second.months, {});
  assert.equal(second.filled, 0);
});

test('見積書・発注書は売上行を変えない', () => {
  const res = applyInvoiceToSales(ledger(), invoice({ type: 'estimate', status: 'paid', sentDate: '2026-10-01', paidDate: '2026-10-20', salesRowIds: ['r1'] }));
  assert.deepEqual(res.months, {});
});

test('金額の突合：紐付けた行の税込合計と請求書合計', () => {
  // r1 10万＋r2 5万 の税込 = 165,000。請求書は 15万＋税10% = 165,000
  const ok = compareLinkedTotal(ledger(), invoice({ salesRowIds: ['r1', 'r2'] }));
  assert.equal(ok.count, 2);
  assert.equal(ok.salesTotal, 165000);
  assert.equal(ok.invoiceTotal, 165000);
  assert.equal(ok.mismatch, false);
  const ng = compareLinkedTotal(ledger(), invoice({ salesRowIds: ['r1', 'gone'] }));
  assert.equal(ng.missing, 1);
  assert.equal(ng.mismatch, true);
  assert.equal(compareLinkedTotal(ledger(), invoice()).mismatch, false); // 行が無ければ突合しない
});

console.log(`\n${passed} tests passed`);
