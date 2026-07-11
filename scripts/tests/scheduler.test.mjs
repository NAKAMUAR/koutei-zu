// スケジューラ中核ロジックの自動テスト。
// `npm run build` の prebuild（scripts/check-ui-rules.mjs → node --test scripts/tests/）で毎回実行される。
// スケジューラの挙動を意図的に変えるときは、このテストも一緒に更新すること。
// 注意: scheduleTasks は「実行時の今日」を起点の下限にするため、テストは未来の月曜を基準日に使う。
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scheduleTasks, syncHolidays, isNonWorkingDay, isWorkingSaturday,
  getDaySlots, getHoursPerDay, deadlineKey, computeLateRisks,
  DEFAULT_SETTINGS, computeProjectOrder,
} from '../../src/lib/scheduler.js';
import { parseHM, fmtHM, timeToMin, minToTime, fmtYMD, addDays } from '../../src/lib/datetime.js';

// 実行日から最低1週間先の月曜日を基準にする（実行日に依存させない）
const base = new Date(); base.setHours(0, 0, 0, 0);
let mon = addDays(base, 7);
while (mon.getDay() !== 1) mon = addDays(mon, 1);
const MON = fmtYMD(mon);
const TUE = fmtYMD(addDays(mon, 1));
const WED = fmtYMD(addDays(mon, 2));
const FRI = fmtYMD(addDays(mon, 4));
const SAT = addDays(mon, 5);
// 直後の土曜が稼働日（第2・第4土曜）かどうかで「週末明け」の期待値を変える
const AFTER_WEEKEND = isWorkingSaturday(SAT) ? fmtYMD(SAT) : fmtYMD(addDays(mon, 7));
const settings = { ...DEFAULT_SETTINGS, startDate: MON, startTime: '08:00', holidays: [], absences: [], overtimes: [] };
const NOW = new Date(MON + 'T08:00:00');

const mkTask = (over = {}) => ({
  id: over.id || `t-${Math.random()}`, projectName: 'テスト案件', viewpointName: 'IN1',
  stepName: 'カラー', assignee: '担当A', priority: 1, hours: 4, completedHours: 0,
  status: 'active', createdAt: 1, ...over,
});

test('parseHM/fmtHM: "HH:MM" と小数時間の往復変換', () => {
  assert.equal(parseHM('08:00'), 8);
  assert.equal(parseHM('00:30'), 0.5);
  assert.equal(parseHM('1:15'), 1.25);
  assert.ok(Number.isNaN(parseHM('')));
  assert.equal(fmtHM(1.5), '01:30');
  assert.equal(fmtHM(parseHM('02:45')), '02:45');
});

test('timeToMin/minToTime の往復変換', () => {
  assert.equal(timeToMin('13:30'), 810);
  assert.equal(minToTime(810), '13:30');
});

test('deadlineKey: 納期順の比較キー（未設定は最後）', () => {
  assert.ok(deadlineKey('2026-07-01') < deadlineKey('2026-07-02'));
  assert.ok(deadlineKey('') > deadlineKey('2099-12-31'));
  assert.ok(deadlineKey(null) === Infinity);
});

test('休日判定: 日曜・通常土曜は休み、第2/第4土曜は稼働、登録祝日は休み', () => {
  syncHolidays({ holidays: [{ date: TUE }] }); // 基準週の火曜を祝日に
  assert.equal(isNonWorkingDay(addDays(mon, 6)), true);                 // 日曜
  assert.equal(isWorkingSaturday(new Date('2026-07-11T00:00:00')), true);  // 第2土曜
  assert.equal(isNonWorkingDay(new Date('2026-07-11T00:00:00')), false);
  assert.equal(isNonWorkingDay(new Date('2026-07-04T00:00:00')), true);    // 第1土曜
  assert.equal(isNonWorkingDay(new Date(TUE + 'T00:00:00')), true);     // 登録した祝日
  syncHolidays({ holidays: [] }); // 後続テストへ影響させない
  assert.equal(isNonWorkingDay(new Date(MON + 'T00:00:00')), false);    // 平日
});

test('getDaySlots: 土曜は午前スロットのみ・平日は午前+午後', () => {
  assert.equal(getDaySlots(SAT, settings).length, 1);
  assert.equal(getDaySlots(mon, settings).length, 2);
  assert.equal(getHoursPerDay(settings), 8); // 8-12 + 13-17
});

test('scheduleTasks: 4時間タスクは初日の午前+α に収まり、営業時間内に配置される', () => {
  const { active } = scheduleTasks([mkTask({ hours: 4 })], settings, [], NOW);
  const t = active[0];
  assert.equal(fmtYMD(t.scheduledStart), MON);
  assert.equal(t.scheduledStartMin, timeToMin('08:00'));
  assert.equal(fmtYMD(t.scheduledEnd), MON);
  assert.equal(t.scheduledEndMin, timeToMin('12:00')); // 午前4時間ちょうど
});

test('scheduleTasks: 同一担当者のタスクは順番に連結され、週末を跨いで翌営業日へ送られる', () => {
  const tasks = [
    mkTask({ id: 'a', hours: 8, priority: 1, createdAt: 1 }), // 月曜まるごと
    mkTask({ id: 'b', hours: 8, priority: 2, createdAt: 2, viewpointName: 'IN2' }), // 火曜
    mkTask({ id: 'c', hours: 8 * 3, priority: 3, createdAt: 3, viewpointName: 'IN3' }), // 水木金
    mkTask({ id: 'd', hours: 2, priority: 4, createdAt: 4, viewpointName: 'IN4' }), // 週末明け
  ];
  const { active } = scheduleTasks(tasks, settings, [], NOW);
  const byId = Object.fromEntries(active.map(t => [t.id, t]));
  assert.equal(fmtYMD(byId.a.scheduledEnd), MON);
  assert.equal(fmtYMD(byId.b.scheduledStart), TUE);
  assert.equal(fmtYMD(byId.c.scheduledEnd), FRI);
  assert.equal(fmtYMD(byId.d.scheduledStart), AFTER_WEEKEND); // 土日はスキップ（稼働土曜なら土曜）
});

test('scheduleTasks: 完了済み時間ぶんだけ残り枠が縮む', () => {
  const { active } = scheduleTasks([mkTask({ hours: 4, completedHours: 3 })], settings, [], NOW);
  assert.equal(active[0].remainingHours, 1);
  assert.equal(active[0].scheduledEndMin, timeToMin('09:00'));
});

test('scheduleTasks: 欠勤日はスキップされる', () => {
  const s2 = { ...settings, absences: [{ id: 'x', assignee: '担当A', startDate: MON, endDate: MON, allDay: true }] };
  const { active } = scheduleTasks([mkTask({ hours: 4 })], s2, [], NOW);
  assert.equal(fmtYMD(active[0].scheduledStart), TUE); // 月曜欠勤→火曜開始
});

test('computeLateRisks: 納期より終了予定が遅いタスクを検出する', () => {
  const tasks = [
    mkTask({ id: 'ok', hours: 4, deadline: FRI, priority: 1 }),
    mkTask({ id: 'late', hours: 8 * 10, deadline: WED, priority: 2, viewpointName: 'IN9' }),
  ];
  const { active } = scheduleTasks(tasks, settings, [], NOW);
  const risks = computeLateRisks(active, NOW);
  const names = risks.map(r => r.viewpointName);
  assert.ok(names.includes('IN9'));
  assert.ok(!names.includes('IN1'));
});

test('computeProjectOrder: 進行中案件が並び順に含まれる', () => {
  const tasks = [mkTask({ projectName: 'A案件' }), mkTask({ projectName: 'B案件', viewpointName: 'IN2' })];
  const order = computeProjectOrder(tasks, []);
  assert.ok(order.includes('A案件') && order.includes('B案件'));
});
