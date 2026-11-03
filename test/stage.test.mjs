// 進行状況（段階）・目安金額・AIで読んだ進捗の取り込みの純ロジックを Node で検証する。
// 実行: node test/stage.test.mjs
import assert from 'node:assert/strict';
import {
  computeViewpointStages, isReviewDue, calcYen, calcVND, estimateForSteps, normalizePricing,
  progressCodes, buildProgressPrompt, parseProgressReport, parseHoursText, progressTarget, invoicedTaskIds,
} from '../src/lib/stage.js';
import { splitForSupport } from '../src/lib/support.js';
import { buildAssigneeSchedule, viStepName } from '../src/lib/viSchedule.js';

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }

const NOW = new Date('2030-01-07T10:00:00');
let seq = 0;
const step = (over = {}) => ({
  id: `task-1-${++seq}-ab${String(seq).padStart(3, '0')}`, projectName: '○○邸', projectNameInternal: 'RIC.34',
  viewpointName: 'EX1-A', stepName: 'ホワイト', assignee: 'Quynh', hours: 0, completedHours: 0,
  status: 'pending', createdAt: 1, ...over,
});
const stageOf = (tasks, active = []) => computeViewpointStages(tasks, active, NOW, {}).map(e => e.stage);

test('仮登録 → 翻訳待ち → 時間計算待ち', () => {
  assert.deepEqual(stageOf([step({ tentative: true })]), ['tentative']);
  assert.deepEqual(stageOf([step()]), ['translate']);
  const tr = NOW.getTime() - 3 * 3600000;
  const res = computeViewpointStages([step({ translatedAt: tr }), step({ stepName: 'カラー' })], [], NOW, {});
  assert.equal(res[0].stage, 'estimate');
  assert.equal(res[0].translatedAt, tr);
  assert.equal(res[0].zeroIds.length, 2);
});

test('制作待ち と 制作中（開始時刻・完了時間で判定）', () => {
  const future = { scheduledStart: new Date('2030-01-08T00:00:00'), scheduledStartMin: 8 * 60 };
  const past = { scheduledStart: new Date('2030-01-07T00:00:00'), scheduledStartMin: 8 * 60 };
  const a = step({ hours: 3 });
  assert.deepEqual(stageOf([a], [{ ...a, ...future }]), ['scheduled']);
  const b = step({ hours: 3, viewpointName: 'IN1' });
  assert.deepEqual(stageOf([b], [{ ...b, ...past }]), ['producing']);
  const c = step({ hours: 3, completedHours: 1, viewpointName: 'IN2' });
  assert.deepEqual(stageOf([c], [{ ...c, ...future }]), ['producing']);
});

test('納品後に新しい回が入ると 修正中（時間が0なら翻訳待ち）', () => {
  const done = step({ hours: 3, completedHours: 3, status: 'done' });
  const fix0 = step({ stepName: '修正1', stepRoundType: 'fix' });
  const r0 = computeViewpointStages([done, fix0], [], NOW, {})[0];
  assert.equal(r0.stage, 'translate');
  assert.equal(r0.isRevision, true);
  const fix = step({ stepName: '修正1', hours: 1, stepRoundType: 'fix', viewpointName: 'IN9' });
  const done2 = step({ hours: 3, completedHours: 3, status: 'done', viewpointName: 'IN9' });
  assert.deepEqual(stageOf([done2, fix]), ['fixing']);
});

test('納品済み（確認待ち）→ 請求待ち → 請求済み', () => {
  const rv = step({ hours: 2, completedHours: 2, status: 'done', reviewState: 'waiting', reviewAt: 5, reviewDueDate: '2030-01-10' });
  const r = computeViewpointStages([rv], [], NOW, {})[0];
  assert.equal(r.stage, 'delivered');
  assert.equal(r.reviewDueDate, '2030-01-10');
  const rc = computeViewpointStages([{ ...rv, deliveryChecks: { a: true }, deliveryCheckedBy: '中村', deliveryCheckedAt: 9 }], [], NOW, {})[0];
  assert.deepEqual(rc.deliveryChecks, { a: true });
  assert.equal(rc.deliveryCheckedBy, '中村');
  assert.equal(rc.deliveryCheckedAt, 9);
  const fin = step({ hours: 2, completedHours: 2, status: 'done', viewpointName: 'IN3' });
  assert.deepEqual(stageOf([fin]), ['billing']);
  assert.deepEqual(stageOf([{ ...fin, invoiceCheckedAt: 1 }]), ['billed']);
  // 売上登録表の請求書送付日でも請求済みになる
  const ledger = { '2030-01': { rows: [{ srcRound: `step:${fin.id}`, invoiceSentDate: '2030-01-20' }] } };
  assert.equal(invoicedTaskIds(ledger).has(fin.id), true);
  assert.equal(computeViewpointStages([{ ...fin, stepAmount: 5000 }], [], NOW, ledger)[0].stage, 'billed');
  // 請求済みのあとに修正の回が終わったら、もう一度「請求待ち」
  const fix = step({ hours: 1, completedHours: 1, status: 'done', viewpointName: 'IN3', stepName: '修正1' });
  assert.deepEqual(stageOf([{ ...fin, invoiceCheckedAt: 1 }, fix]), ['billing']);
  // 仕組みを入れる前に納品済みのものは請求済み扱い
  assert.deepEqual(stageOf([{ ...fin, completedAt: new Date('2026-09-15T12:00:00').getTime() }]), ['billed']);
  assert.deepEqual(stageOf([{ ...fin, completedAt: new Date('2026-10-15T12:00:00').getTime() }]), ['billing']);
});

test('中止だけの視点は出さない・中断中', () => {
  assert.deepEqual(stageOf([step({ cancelled: true, status: 'done' })]), []);
  assert.deepEqual(stageOf([step({ hours: 2, suspended: true })]), ['suspended']);
});

test('確認日を過ぎたら納品完了（無ければ7日）', () => {
  const base = { reviewState: 'waiting', reviewUpdatedAt: NOW.getTime() - 2 * 86400000 };
  assert.equal(isReviewDue({ ...base }, NOW), false);
  assert.equal(isReviewDue({ ...base, reviewUpdatedAt: NOW.getTime() - 8 * 86400000 }, NOW), true);
  assert.equal(isReviewDue({ ...base, reviewDueDate: '2030-01-07' }, NOW), true);
  assert.equal(isReviewDue({ ...base, reviewDueDate: '2030-01-08', reviewUpdatedAt: 0 }, NOW), false);
  assert.equal(isReviewDue({ reviewState: null, reviewDueDate: '2020-01-01' }, NOW), false);
});

test('目安金額：時間×2,500円、1,000円単位で切り上げ、最低3,000円', () => {
  const p = normalizePricing({});
  assert.equal(calcYen(1, p), 3000);    // 2,500 → 3,000（切り上げ）
  assert.equal(calcYen(0.5, p), 3000);  // 1,250 → 最低3,000
  assert.equal(calcYen(1.3, p), 4000);  // 3,250 → 4,000
  assert.equal(calcYen(2, p), 5000);    // 5,000 ちょうど
  assert.equal(calcYen(6, p), 15000);
  assert.equal(calcYen(0, p), 0);
  assert.equal(calcVND(2, p), 0);       // 外注単価が未設定なら0
  assert.equal(calcVND(2.5, { unitVND: 150000 }), 375000);
});

test('目安金額は金額の入っていないステップ（今回の回）だけを合計', () => {
  const steps = [
    step({ id: 'a', hours: 3, stepAmount: 8000 }),
    step({ id: 'b', stepName: '修正1', hours: 1 }),
    step({ id: 'c', stepName: '修正1カラー', hours: 0.5 }),
  ];
  const e = estimateForSteps(steps, {});
  assert.equal(e.hours, 1.5);
  assert.equal(e.yen, 4000);
  assert.equal(e.firstId, 'b');
  assert.deepEqual(e.targetIds, ['b', 'c']);
});

test('時間の書き方いろいろ', () => {
  assert.equal(parseHoursText('3.5'), 3.5);
  assert.equal(parseHoursText('3h'), 3);
  assert.equal(parseHoursText('3:30'), 3.5);
  assert.equal(parseHoursText('2時間30分'), 2.5);
  assert.equal(parseHoursText('90分'), 1.5);
  assert.equal(parseHoursText('３．５'), 3.5);
  assert.equal(parseHoursText('たくさん'), null);
});

test('AIへの指示文と、AIの出力の読み取り', () => {
  const t1 = step({ id: 'task-9-1-abcde', hours: 4, completedHours: 1 });
  const t2 = step({ id: 'task-9-2-fghij', stepName: 'カラー', hours: 3 });
  const codes = progressCodes([t1, t2]);
  assert.equal(codes.get(t1.id), 'abcde');
  const prompt = buildProgressPrompt([t1, t2], codes);
  assert.ok(prompt.includes('#abcde | RIC.34 | ○○邸 | EX1-A | ホワイト | Quynh | 4h | 1h'));
  assert.ok(prompt.includes('#番号 | 完了時間 | 状態 | メモ'));
  const byId = new Map([[t1.id, t1], [t2.id, t2]]);
  const out = parseProgressReport([
    'はい、まとめました。',
    '#abcde | 2.5 | 作業中 | 家具待ち',
    '- #FGHIJ ｜ 3 ｜ 完了 ｜',
    '#zzzzz | 1 | 作業中 |',
  ].join('\n'), byId, codes);
  assert.equal(out.length, 3);
  assert.equal(out[0].completed, 2.5);
  assert.equal(out[0].memo, '家具待ち');
  assert.equal(progressTarget(out[0]), 2.5);
  assert.equal(out[1].status, 'done');
  assert.equal(progressTarget(out[1]), 3);
  assert.ok(out[2].error);
  // 制作時間を超える完了時間は頭打ち
  assert.equal(progressTarget({ task: t1, completed: 9, status: 'doing' }), 4);
});

test('番号が重なったら長くする', () => {
  const a = { id: 'task-1-1-xxxxx' }, b = { id: 'task-2-2-xxxxx' };
  const codes = progressCodes([a, b]);
  assert.notEqual(codes.get(a.id), codes.get(b.id));
});

console.log(`stage: ${passed} tests passed`);

// ---- サポート（分担） ----
{
  const t = { id: 't1', assignee: 'Quynh', hours: 6, completedHours: 1, stepName: 'ホワイト', stepOrder: 0, externalId: 'RIC34::EX1::1::white', stepRoundType: 'initial', stepAmount: '15000', projectName: 'X', viewpointName: 'EX1', status: 'pending' };
  const r = splitForSupport(t, 'Tú Mĩ', 2, 't2', 5);
  assert.equal(r.original.hours, 4);
  assert.equal(r.original.hoursLocked, true);
  assert.equal(r.support.assignee, 'Tú Mĩ');
  assert.equal(r.support.hours, 2);
  assert.equal(r.support.completedHours, 0);
  assert.equal(r.support.stepName, 'ホワイト（サポート）');
  assert.equal(r.support.stepOrder, 0.5);
  assert.equal(r.support.externalId, null, 'シートの行とは結び付けない');
  assert.equal(r.support.stepRoundType, '', '納品に数えない');
  assert.equal(r.support.stepAmount, '', '売上に出さない');
  assert.equal(r.support.supportOf, 't1');
  assert.equal(splitForSupport(t, 'Tú Mĩ', 5, 't2', 5), null, '残り（5h）以上は渡せない');
  assert.equal(splitForSupport(t, '', 1, 't2', 5), null);
  assert.equal(splitForSupport(t, 'A', 0, 't2', 5), null);
  console.log('  ok  サポート（分担）');
}

// ---- 担当者別スケジュール文（ベトナム語） ----
{
  assert.equal(viStepName('ホワイト'), 'Trắng / ホワイト');
  assert.equal(viStepName('カラー修正2回目（無料）'), 'Màu (sửa) / カラー修正2回目（無料）');
  assert.equal(viStepName('ホワイト（サポート）'), 'Trắng – hỗ trợ / ホワイト（サポート）');
  assert.equal(viStepName('打合せ'), '打合せ');
  const d = (s) => new Date(s + 'T00:00:00');
  const active = [
    { id: 'a', assignee: 'Quynh', projectNameInternal: 'RIC.34', projectName: 'マンション', viewpointName: 'EX1-A', stepName: 'ホワイト', deadline: '2030-01-09',
      slots: [{ date: d('2030-01-07'), startMin: 480, endMin: 720 }, { date: d('2030-01-08'), startMin: 780, endMin: 900 }] },
    { id: 'b', assignee: 'Quynh', projectName: '戸建て', viewpointName: 'IN1', stepName: 'カラー', slots: [{ date: d('2030-01-07'), startMin: 780, endMin: 840 }] },
    { id: 'c', assignee: '他の人', projectName: 'X', viewpointName: 'EX1', stepName: 'ホワイト', slots: [{ date: d('2030-01-07'), startMin: 480, endMin: 600 }] },
  ];
  const text = buildAssigneeSchedule(active, 'Quynh', d('2030-01-07'), 1);
  assert.ok(text.startsWith('📅 Lịch làm việc / 作業予定 – Quynh'));
  assert.ok(text.includes('【07/01 (T2) / 1/7(月)】'));
  assert.ok(text.includes('08:00–12:00  RIC.34 マンション ／ EX1-A ／ Trắng / ホワイト  4h ⏰ hạn/納期 09/01'));
  assert.ok(text.includes('13:00–14:00  戸建て ／ IN1 ／ Màu / カラー  1h'));
  assert.ok(!text.includes('他の人') && !text.includes('1/8'), '1日分・本人だけ');
  assert.ok(text.endsWith('Tổng / 合計: 5h'));
  assert.ok(buildAssigneeSchedule(active, 'Quynh', d('2030-01-07'), 7).includes('1/8(火)'));
  assert.equal(buildAssigneeSchedule(active, 'だれも', d('2030-01-07'), 7), '');
  console.log('  ok  担当者別スケジュール文（ベトナム語）');
}
