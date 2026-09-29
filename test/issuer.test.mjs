// 帳票の発行元（自社）情報・振込先（src/billing/billingUtils.js）を Node で検証する。
// 住所・振込先はコードに持たず、設定（billingIssuer）か作成済みの帳票から引き継ぐ。
// 実行: node test/issuer.test.mjs
import assert from 'node:assert/strict';
import { ISSUER_COMPANY, BLANK_ISSUER_SIDE, issuerFromDocs, issuerIncomplete, blankDoc } from '../src/billing/billingUtils.js';

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }

const side = (over = {}) => ({ company: '株式会社テスト', zip: '100-0001', address: '東京都千代田区1-1', tel: '03-0000-0000', person: '山田', regNo: '', ...over });
const docs = [
  { id: 'e-old', type: 'estimate', createdAt: 1, from: side({ address: '旧住所' }) },
  { id: 'e-new', type: 'estimate', createdAt: 5, from: side({ address: '新住所' }) },
  { id: 'o1', type: 'order', createdAt: 9, from: side({ company: 'お客様', address: 'お客様の住所' }) },
  { id: 'i1', type: 'invoice', createdAt: 3, from: side({ regNo: 'T0000000000000' }), bankLines: ['・テスト銀行', '・口座番号（0000000）'] },
  { id: 'i2', type: 'invoice', createdAt: 7, from: side({ regNo: 'T0000000000000' }), bankLines: ['', ' '] },
];

test('作成済みの帳票から、見積書・請求書それぞれ一番新しい発行元を拾う（発注書は使わない）', () => {
  const got = issuerFromDocs(docs);
  assert.equal(got.estimate.address, '新住所');
  assert.equal(got.invoice.regNo, 'T0000000000000');
  assert.notEqual(got.estimate.company, 'お客様');
});

test('振込先は、中身のある一番新しい請求書から拾う', () => {
  assert.deepEqual(issuerFromDocs(docs).bankLines, ['・テスト銀行', '・口座番号（0000000）']);
});

test('発行元の住所・電話が空の帳票しか無ければ拾わない', () => {
  assert.equal(issuerFromDocs([{ type: 'estimate', from: { ...BLANK_ISSUER_SIDE } }]), null);
  assert.equal(issuerFromDocs([]), null);
  assert.equal(issuerFromDocs(null), null);
});

test('設定が無い・住所や振込先が空なら「未設定あり」', () => {
  assert.equal(issuerIncomplete(null), true);
  assert.equal(issuerIncomplete({ estimate: side(), invoice: side(), bankLines: [''] }), true);
  assert.equal(issuerIncomplete({ estimate: side(), invoice: side({ address: '' }), bankLines: ['・銀行'] }), true);
  assert.equal(issuerIncomplete({ estimate: side(), invoice: side(), bankLines: ['・銀行'] }), false);
});

test('新しい帳票には設定の発行元・振込先が入る', () => {
  const issuer = { estimate: side(), invoice: side({ regNo: 'T1' }), bankLines: ['・テスト銀行'] };
  const est = blankDoc('estimate', [], new Date(2026, 8, 29), issuer);
  assert.equal(est.from.address, '東京都千代田区1-1');
  const inv = blankDoc('invoice', [], new Date(2026, 8, 29), issuer);
  assert.equal(inv.from.regNo, 'T1');
  assert.deepEqual(inv.bankLines, ['・テスト銀行']);
  const ord = blankDoc('order', [], new Date(2026, 8, 29), issuer);
  assert.equal(ord.to.company, '株式会社テスト'); // 発注書の宛先は自社
  assert.equal(ord.from.company, '');            // 発注書の発行元はお客様（空から入力）
});

test('設定が無いときは会社名だけ入り、住所・振込先は空（コードに持たない）', () => {
  const inv = blankDoc('invoice', [], new Date(2026, 8, 29), null);
  assert.equal(inv.from.company, ISSUER_COMPANY);
  assert.equal(inv.from.address, '');
  assert.deepEqual(inv.bankLines, []);
});

console.log(`\n${passed} tests passed`);
