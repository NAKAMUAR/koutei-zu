// 土日の出勤日（マスタ「土日の出勤日」）のスケジュール反映を Node で検証する。
// 実行: node test/workdays.test.mjs
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, fmtYMD, isNonWorkingDay, isValidWorkday, syncHolidays, syncWorkdays } from '../src/lib/utils.js';
import { scheduleTasks, dayWorkSlots } from '../src/lib/schedule.js';

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }

// 2030-01-04 は金曜、05 は第1土曜（休み）、06 は日曜、07 は月曜
const FRI = '2030-01-04', SAT = '2030-01-05', SUN = '2030-01-06', MON = '2030-01-07';
const day = (s) => new Date(s + 'T00:00:00');
const base = { ...DEFAULT_SETTINGS, startDate: FRI, startTime: '08:00', absences: [], overtimes: [], holidays: [], workdays: [] };
const withWd = (workdays) => { const s = { ...base, workdays }; syncWorkdays(s); syncHolidays(s); return s; };

let seq = 0;
const task = (assignee, hours) => ({
  id: `t${++seq}`, assignee, projectName: `案件${assignee}`, viewpointName: 'EX1', stepName: 'ホワイト',
  hours, completedHours: 0, priority: 1, status: 'pending', createdAt: seq,
});
const slotsOf = (res, assignee) => res.active.filter(t => t.assignee === assignee)
  .flatMap(t => t.slots.map(s => [fmtYMD(s.date), s.startMin, s.endMin]));

test('出勤日の入力チェック', () => {
  assert.equal(isValidWorkday({ date: SAT, startTime: '09:00', endTime: '12:00' }), true);
  assert.equal(isValidWorkday({ date: SAT, startTime: '12:00', endTime: '09:00' }), false);
  assert.equal(isValidWorkday({ date: '', startTime: '09:00', endTime: '12:00' }), false);
});

test('登録が無ければ土日は休み（従来どおり）', () => {
  const s = withWd([]);
  assert.equal(isNonWorkingDay(day(SAT)), true);
  assert.deepEqual(dayWorkSlots('Aさん', day(SAT), s), []);
  const res = scheduleTasks([task('Aさん', 12)], s, [], day(FRI));
  assert.deepEqual(slotsOf(res, 'Aさん'), [[FRI, 480, 720], [FRI, 780, 1020], [MON, 480, 720]]);
});

test('全員の出勤日：登録した時間帯だけ稼働し、予定が土曜に入る', () => {
  const s = withWd([{ id: 'w1', date: SAT, startTime: '09:00', endTime: '12:00', assignee: '' }]);
  assert.equal(isNonWorkingDay(day(SAT)), false);
  assert.deepEqual(dayWorkSlots('Aさん', day(SAT), s), [[540, 720]]);
  const res = scheduleTasks([task('Aさん', 12)], s, [], day(FRI));
  assert.deepEqual(slotsOf(res, 'Aさん'), [[FRI, 480, 720], [FRI, 780, 1020], [SAT, 540, 720], [MON, 480, 540]]);
});

test('担当者を指定した出勤日：その人だけ稼働し、他の人は休みのまま', () => {
  const s = withWd([{ id: 'w1', date: SUN, startTime: '13:00', endTime: '17:00', assignee: 'Bさん' }]);
  assert.deepEqual(dayWorkSlots('Bさん', day(SUN), s), [[780, 1020]]);
  assert.deepEqual(dayWorkSlots('Aさん', day(SUN), s), []);
  const res = scheduleTasks([task('Aさん', 10), task('Bさん', 10)], s, [], day(FRI));
  assert.deepEqual(slotsOf(res, 'Aさん'), [[FRI, 480, 720], [FRI, 780, 1020], [MON, 480, 600]]);
  assert.deepEqual(slotsOf(res, 'Bさん'), [[FRI, 480, 720], [FRI, 780, 1020], [SUN, 780, 900]]);
});

test('同じ日に複数の時間帯（午前・午後）を登録できる', () => {
  const s = withWd([
    { id: 'w1', date: SAT, startTime: '08:00', endTime: '12:00', assignee: '' },
    { id: 'w2', date: SAT, startTime: '13:00', endTime: '17:00', assignee: '' },
  ]);
  assert.deepEqual(dayWorkSlots('Aさん', day(SAT), s), [[480, 720], [780, 1020]]);
});

test('祝日に出勤日を登録すると、その日は出勤（登録が優先）', () => {
  const s = { ...withWd([{ id: 'w1', date: MON, startTime: '08:00', endTime: '12:00', assignee: '' }]), holidays: [{ id: 'h', date: MON, label: '祝日' }] };
  syncHolidays(s);
  assert.equal(isNonWorkingDay(day(MON)), false);
  assert.deepEqual(dayWorkSlots('Aさん', day(MON), s), [[480, 720]]);
});

syncWorkdays({}); syncHolidays({});
console.log(`workdays: ${passed} passed`);
