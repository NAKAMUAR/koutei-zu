// 連絡文からまとめて仮登録。実行: node test/bulkTentative.test.mjs
import assert from 'node:assert/strict';
import { parseTentativeText, parseCuts, parseMD, buildTentativeRecords, historyHours } from '../src/lib/bulkTentative.js';

const today = new Date(2026, 10, 10);
assert.equal(parseMD('11/11（水）', today), '2026-11-11');
assert.equal(parseMD('確認中', today), '');
assert.equal(parseMD('1/5（火）', today), '2027-01-05');
assert.deepEqual(parseCuts('外観2枚＋内観3枚'), [{ category: '外観', count: 2 }, { category: '内観', count: 3 }]);
assert.deepEqual(parseCuts('14～15枚程度'), [{ category: '', count: 15 }]);

const text = `\`\`\`
【福山市】鈴木崇司様
担当者様：安田様
進捗状況：0%（確認中）
制作枚数：外観1枚＋内観1枚
着手予定：11/10（火）
納品予定：11/12（木）
内観①を11月11日（水）までに作成いたします

【作本三奈子様邸】
担当者様：村本様
進捗状況：0%（確認中）
制作枚数：外観1枚＋内観1枚
着手予定：確認中
納品予定：確認中
\`\`\``;
const ps = parseTentativeText(text, today);
assert.equal(ps.length, 2);
assert.equal(ps[0].name, '福山市 鈴木崇司様');
assert.equal(ps[0].contact, '安田様');
assert.equal(ps[0].start, '2026-11-10');
assert.equal(ps[0].end, '2026-11-12');
assert.deepEqual(ps[0].notes, ['内観①を11月11日（水）までに作成いたします']);
assert.equal(ps[1].start, '');

const recs = buildTentativeRecords(ps, { company: '田中建設', assignee: 'Mr.Dung', hours: { 外観: { white: 3, color: 2 }, 内観: { white: 4, color: 0 } }, morningStart: '09:00', now: 1 });
// 鈴木：EX1 white+color, IN1 white（color 0h は作らない）。作本も同じ
assert.equal(recs.length, 6);
assert.deepEqual(recs.slice(0, 3).map(r => [r.viewpointName, r.stepTypeId, r.hours]), [['EX1', 'white', 3], ['EX1', 'color', 2], ['IN1', 'white', 4]]);
assert.equal(recs[0].manualStart, '2026-11-10T09:00', '着手予定のある案件は最初の作業をその日の朝から');
assert.equal(recs[1].manualStart, null);
assert.equal(recs[3].manualStart, null, '確認中は空いているところへ');
assert.ok(recs.every(r => r.tentative && r.assignee === 'Mr.Dung' && r.companyName === '田中建設'));
assert.equal(recs[0].projectDeadline, '2026-11-12');
assert.match(recs[3].memo, /着手予定：確認中/);

const hist = [1, 2, 3].flatMap(i => [
  { companyName: 'A', projectName: 'P' + i, viewpointName: 'EX1', viewpointCategory: '外観', stepTypeId: 'white', hours: i * 2 },
  { companyName: 'A', projectName: 'P' + i, viewpointName: 'EX1', viewpointCategory: '外観', stepTypeId: 'color', hours: 1 },
]);
assert.deepEqual(historyHours(hist, 'A', '外観'), { white: 4, color: 1 });
assert.deepEqual(historyHours([], 'A', '外観'), { white: null, color: null });
console.log('bulkTentative: ok');

// 部屋ごとの時間の表
import { parseRoomTables, buildRoomRecords } from '../src/lib/bulkTentative.js';
{
  const t = [
    'A担当（2LDKA）は**11/17(火) 9:30**に全件完了する見込みです。',
    '- 11/9(月)に着手し、土日は休みとしました。',
    '- 1日の作業は8:00〜12:00と13:00〜17:00の合計8時間です。',
    '**A担当：2LDKA（合計49.5h）**',
    '| 部屋 | 時間 | 累計 | 完了日時 |', '|---|---|---|---|',
    '| IN1 | 3 | 3 | 11/9(月) 11:00 |', '| IN2 | 4.5 | 7.5 | 11/9(月) 16:30 |',
    '**B担当：2LDKB（合計47h）**',
    '| 部屋 | 時間 | 累計 | 完了日時 |', '|---|---|---|---|',
    '| IN1 | 3 | 3 | 11/9(月) 11:00 |',
  ].join('\n');
  const tb = parseRoomTables(t, new Date(2026, 10, 10));
  assert.equal(tb.start, '2026-11-09');
  assert.equal(tb.startTime, '08:00');
  assert.deepEqual(tb.groups, [
    { label: 'A担当', unit: '2LDKA', rooms: [{ room: 'IN1', hours: 3 }, { room: 'IN2', hours: 4.5 }] },
    { label: 'B担当', unit: '2LDKB', rooms: [{ room: 'IN1', hours: 3 }] },
  ]);
  const rr = buildRoomRecords(tb, { projectName: '有明', projectNameInternal: 'REN.94', company: 'X', assignees: { A担当: 'Ms.A', B担当: 'Ms.B' }, now: 1 });
  assert.deepEqual(rr.map(r => [r.viewpointName, r.hours, r.assignee, r.manualStart, r.viewpointCategory]), [
    ['IN1_2LDKA', 3, 'Ms.A', '2026-11-09T08:00', '内観'], ['IN2_2LDKA', 4.5, 'Ms.A', null, '内観'], ['IN1_2LDKB', 3, 'Ms.B', '2026-11-09T08:00', '内観']]);
  assert.equal(parseRoomTables('【a】\n担当者様：b').groups.length, 0);
  console.log('parseRoomTables: ok');
}
