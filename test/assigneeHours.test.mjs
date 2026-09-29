// 担当者ごとの稼働時間（src/lib/utils.js・src/lib/schedule.js）を Node で検証する。
// 実行: node test/assigneeHours.test.mjs
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, fmtYMD, isValidWorkHours, withAssigneeHours, getDailySlots, getDaySlots } from '../src/lib/utils.js';
import { scheduleTasks, dayWorkSlots } from '../src/lib/schedule.js';

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }

// 過去日付は「今日」に丸められるので、十分先の月曜日から並べる
const START = '2030-01-07';
const base = { ...DEFAULT_SETTINGS, startDate: START, startTime: '08:00', absences: [], overtimes: [] };
const VN = { morningStart: '10:00', morningEnd: '14:00', afternoonStart: '15:00', afternoonEnd: '19:00' };
const master = [{ id: 'e1', name: 'Aさん' }, { id: 'e2', name: 'Bさん', workHours: VN }];

let seq = 0;
const task = (assignee, hours, over = {}) => ({
  id: `t${++seq}`, assignee, projectName: `案件${assignee}`, viewpointName: 'EX1', stepName: 'ホワイト',
  hours, completedHours: 0, priority: 1, status: 'pending', createdAt: seq, ...over,
});
const tasks = [task('Aさん', 6), task('Aさん', 5), task('Bさん', 6), task('Bさん', 5)];
const slotsOf = (res, assignee) => res.active.filter(t => t.assignee === assignee)
  .map(t => t.slots.map(s => [fmtYMD(s.date), s.startMin, s.endMin]));

test('稼働時間の妥当性チェック', () => {
  assert.equal(isValidWorkHours(VN), true);
  assert.equal(isValidWorkHours({ ...VN, morningEnd: '15:30' }), false); // 午前終了が午後開始より後
  assert.equal(isValidWorkHours({ ...VN, afternoonEnd: '' }), false);
  assert.equal(isValidWorkHours({ ...VN, morningStart: '9時' }), false);
  assert.equal(isValidWorkHours(null), false);
});

test('従業員マスタに稼働時間が無ければ settings をそのまま返す', () => {
  assert.equal(withAssigneeHours(base, [{ name: 'Aさん' }]), base);
  assert.equal(withAssigneeHours(base, [{ name: 'Aさん', workHours: { ...VN, afternoonEnd: '' } }]), base);
  assert.equal(withAssigneeHours(base, null), base);
});

test('稼働時間のある担当者だけ assigneeHours にまとめる', () => {
  const s = withAssigneeHours(base, master);
  assert.deepEqual(Object.keys(s.assigneeHours), ['Bさん']);
  assert.equal(s.morningStart, base.morningStart); // 全体の稼働時間は変えない
});

test('担当者を渡すとその人の稼働枠、渡さなければ全体の枠', () => {
  const s = withAssigneeHours(base, master);
  assert.deepEqual(getDailySlots(s, 'Bさん'), [{ start: 600, end: 840 }, { start: 900, end: 1140 }]);
  assert.deepEqual(getDailySlots(s, 'Aさん'), getDailySlots(base));
  assert.deepEqual(getDailySlots(s), getDailySlots(base));
  const saturday = new Date(2030, 0, 12);
  assert.deepEqual(getDaySlots(saturday, s, 'Bさん'), [{ start: 600, end: 840 }]); // 土曜は午前のみ
});

test('残業は担当者の稼働枠に足してまとめる', () => {
  const s = withAssigneeHours({ ...base, overtimes: [{ id: 'o1', assignee: 'Bさん', startDate: START, endDate: START, startTime: '19:00', endTime: '21:00' }] }, master);
  assert.deepEqual(dayWorkSlots('Bさん', new Date(2030, 0, 7), s), [[600, 840], [900, 1260]]);
  assert.deepEqual(dayWorkSlots('Bさん', new Date(2030, 0, 8), s), [[600, 840], [900, 1140]]);
});

test('稼働時間を設定していない担当者の配置は変更前と同じ', () => {
  const before = scheduleTasks(tasks, base, [], new Date());
  const after = scheduleTasks(tasks, withAssigneeHours(base, master), [], new Date());
  assert.deepEqual(slotsOf(after, 'Aさん'), slotsOf(before, 'Aさん'));
});

test('稼働時間を設定した担当者は、その時間内にだけ配置される', () => {
  const res = scheduleTasks(tasks, withAssigneeHours(base, master), [], new Date());
  const all = slotsOf(res, 'Bさん').flat();
  assert.ok(all.length > 0);
  for (const [, s, e] of all) {
    const inMorning = s >= 600 && e <= 840;
    const inAfternoon = s >= 900 && e <= 1140;
    assert.ok(inMorning || inAfternoon, `枠外に配置された: ${s}-${e}`);
  }
  // 1日目は 10:00 から始まり、合計 11h を 8h/日で詰めると2日目に続く
  assert.deepEqual(all[0], [START, 600, 840]);
  assert.equal(all[all.length - 1][0], '2030-01-08');
  const hours = all.reduce((sum, [, s, e]) => sum + (e - s) / 60, 0);
  assert.equal(hours, 11);
});

test('終日の不在の日には配置しない（担当者の稼働時間があっても）', () => {
  const s = withAssigneeHours({ ...base, absences: [{ id: 'a1', assignee: 'Bさん', startDate: START, endDate: START, allDay: true }] }, master);
  const res = scheduleTasks(tasks, s, [], new Date());
  const days = new Set(slotsOf(res, 'Bさん').flat().map(([d]) => d));
  assert.equal(days.has(START), false);
  assert.equal(days.has('2030-01-08'), true);
});

console.log(`\n${passed} tests passed`);
