import assert from 'node:assert/strict';
import { buildScheduleSnapshot, importKeyOf } from '../src/lib/scheduleSnapshot.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('externalId → 取込キー', () => {
  assert.equal(importKeyOf('REN100::INE3::1::white'), 'REN100::INE3::1');
  assert.equal(importKeyOf(''), '');
  assert.equal(importKeyOf('手で作った作業'), '');
});

test('取込キーごとに、いちばん早い開始・いちばん遅い終了・担当者・状態をまとめる', () => {
  const d = (s) => new Date(s + 'T00:00:00');
  const snap = buildScheduleSnapshot({
    active: [
      { externalId: 'A1::EX1::1::white', assignee: 'Quynh', status: 'todo', scheduledStart: d('2026-11-06'), scheduledStartMin: 480, scheduledEnd: d('2026-11-06'), scheduledEndMin: 720 },
      { externalId: 'A1::EX1::1::color', assignee: 'Linh', status: 'in_progress', scheduledStart: d('2026-11-07'), scheduledStartMin: 540, scheduledEnd: d('2026-11-07'), scheduledEndMin: 600 },
      { externalId: 'B2::IN1::1::white', assignee: 'Quynh', status: 'todo', scheduledStart: null, scheduledEnd: null },
      { assignee: 'X', status: 'todo' },
    ],
    suspended: [{ externalId: 'C3::IN1::1::white', assignee: 'Q' }],
    done: [{ externalId: 'B2::IN1::1::color', assignee: 'Quynh' }, { externalId: 'D4::EX1::1::white', assignee: 'Q' }],
  });
  const a = snap.items['A1::EX1::1'];
  assert.equal(a.s, d('2026-11-06').getTime() + 480 * 60000);
  assert.equal(a.e, d('2026-11-07').getTime() + 600 * 60000);
  assert.equal(a.a, 'Quynh・Linh');
  assert.equal(a.st, '作業中');
  assert.equal(snap.items['B2::IN1::1'].st, '予定');
  assert.equal(snap.items['B2::IN1::1'].s, null);
  assert.equal(snap.items['C3::IN1::1'].st, '保留');
  assert.equal(snap.items['D4::EX1::1'].st, '完了');
  assert.deepEqual(Object.keys(snap.items), ['A1::EX1::1', 'B2::IN1::1', 'C3::IN1::1', 'D4::EX1::1'], '並びは決まった順（変わっていないときに書き直さない）');
});

console.log('scheduleSnapshot: ' + n + ' tests passed');
