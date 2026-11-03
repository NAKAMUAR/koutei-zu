// 過去分の取り込み（旧「Project Schedule」→ 案件ごとに1件の完了済みタスク）を Node で検証する。
// 実行: node test/legacyImport.test.mjs （データは架空。実データはリポジトリに入れない）
import assert from 'node:assert/strict';
import { parseTSV, readLegacyRows, estimateDateFromLink, summarizeLegacy, existingCodes, legacyTask, normCode, LEGACY_ASSIGNEE, LEGACY_SOURCE, lineKey, readAssigneeTable, applyAssignees, assigneePatchesForImported } from '../src/lib/legacyImport.js';

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }

const L = (ym, tail) => `\\\\CG-SERVER2\\Work Folder\\INTERIOR REVENUE\\${ym.slice(0, 4)}\\${ym}\\${tail}`;
const head = ['', '社内案件名', '社外案件名', 'カット名', 'サーバリンク', '', '納期', '制作項目\n（Hạng mục）', '予想時間/分\n（Thời gian）', '作成済み時間', '', '', '', '', '制作完了',
  '予想時間/分\n（Thời gian）', '作成済み時間', '', '', '', '', '制作完了', '', '', '', '', '', '備考', '作業完了/作成無し'];
const row = (code, name, cut, link, w, c, done) => {
  const r = new Array(29).fill('');
  r[1] = code; r[2] = name; r[3] = cut; r[4] = link; r[8] = String(w); r[15] = String(c); r[28] = done ? 'TRUE' : 'FALSE';
  return r;
};
const q = (c) => (/[\t\n"]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
const tsv = (rows) => [['e'], ['制作合計時間', '4835'], head, ...rows].map(r => r.map(q).join('\t')).join('\n');

test('タブ区切りの読み取り（引用符・改行・タブ入りのセル）', () => {
  assert.deepEqual(parseTSV('a\t"b\nc"\t"d""e"\nf\t\t'), [['a', 'b\nc', 'd"e'], ['f', '', '']]);
});

test('フォルダ名から登録日を推定（日付→月→なし。旧シートより前は使わない）', () => {
  assert.deepEqual(estimateDateFromLink(L('2026-5', 'REN(REN.94)\\01.TRANSLATION DOC\\0522')), { date: '2026-05-22', basis: 'day' });
  assert.deepEqual(estimateDateFromLink(L('2025-6', 'add\\01.TRANSLATION DOC\\6-27')), { date: '2025-06-27', basis: 'day' });
  assert.deepEqual(estimateDateFromLink(L('2025-12', 'X\\0105')), { date: '2026-01-05', basis: 'day' }, '12月のフォルダに1月の日付→翌年');
  assert.deepEqual(estimateDateFromLink(L('2026-3', 'OFFICE\\OFFICE.82（様）')), { date: '2026-03-01', basis: 'month' });
  assert.equal(estimateDateFromLink(L('2025-1', 'X\\0105')), null, '旧シートを作る前の日付は使わない');
  assert.equal(estimateDateFromLink('\\\\server\\no-date'), null);
});

test('案件ごとにまとめる（カット・修正の回・時間・会社名・注意）', () => {
  const text = tsv([
    row('REN.94', '難波改修', 'LDK', L('2026-5', 'リノべる株式会社(RENOVERU)\\x\\0522'), 3, 2, true),
    row('REN 94', '難波改修', 'LDK', L('2026-6', 'リノべる株式会社(RENOVERU)\\x\\0603'), 0, 1.5, true),
    row('REN94', '', '洋室', L('2026-6', 'リノべる株式会社(RENOVERU)\\x'), 1, 1, false),
    row('RENOBERU.58', '別の案件', 'EX', L('2025-9', 'リノべる株式会社\\y'), 2, 2, true),
    row('KYOWA.05', '九条南', 'IN1', L('2025-10', '株式会社協和ー(KYOWA)\\z\\1003'), 1, 1, true),
    row('RICTEST.1', 'テスト', 'A', L('2026-1', 'x'), 0, 0, true),
    row('', '空の行', '', '', 0, 0, false),
  ]);
  const r = readLegacyRows(text);
  assert.equal(r.error, '');
  assert.equal(r.rows.length, 6);
  const ps = summarizeLegacy(r.rows);
  assert.deepEqual(ps.map(p => p.key), ['RENOBERU58', 'KYOWA05', 'RICTEST1', 'REN94']);
  const ren = ps.find(p => p.key === 'REN94');
  assert.equal(ren.code, 'REN.94');
  assert.equal(ren.name, '難波改修');
  assert.equal(ren.company, 'リノべる株式会社');
  assert.equal(ren.cutCount, 2);
  assert.equal(ren.rowCount, 3);
  assert.deepEqual(ren.cuts, ['LDK×2', '洋室']);
  assert.equal(ren.white, 4); assert.equal(ren.color, 4.5); assert.equal(ren.total, 8.5);
  assert.equal(ren.firstDate, '2026-05-22'); assert.equal(ren.lastDate, '2026-06-03');
  assert.equal(ren.dateBasis, 'フォルダの日付');
  assert.equal(ren.doneCount, 2);
  const old = ps.find(p => p.key === 'RENOBERU58');
  assert.equal(old.code, 'RENOBERU.58', '社内案件名は書き換えない');
  assert.equal(old.company, 'リノべる株式会社');
  assert.ok(old.notes[0].startsWith('表記ゆれの可能性'));
  const ky = ps.find(p => p.key === 'KYOWA05');
  assert.equal(ky.company, '株式会社協和ー', '会社マスタに無いコードはフォルダ名から');
  assert.ok(ky.notes.includes('会社名はフォルダ名から'));
  assert.equal(ps.find(p => p.key === 'RICTEST1').isTest, true);
});

test('見出しが無い貼り付けは理由を返す', () => {
  assert.ok(readLegacyRows('a\tb\n1\t2').error.includes('社内案件名'));
});

test('工程図にある案件の判定と、登録するタスクの中身', () => {
  const ex = existingCodes([{ projectNameInternal: 'REN.94' }, { projectName: 'X' }, { legacyKey: 'KYOWA05' }]);
  assert.ok(ex.has('REN94') && ex.has('KYOWA05'));
  assert.equal(normCode('tanaka 361'), 'TANAKA361');
  const p = summarizeLegacy(readLegacyRows(tsv([row('REN.94', '難波改修', 'LDK', L('2026-5', 'x\\0522'), 3, 2, true)])).rows)[0];
  const t = legacyTask(p, 'task-1', new Date(2026, 10, 3).getTime());
  assert.equal(t.status, 'done');
  assert.equal(t.assignee, LEGACY_ASSIGNEE);
  assert.equal(t.projectNameInternal, 'REN.94');
  assert.equal(t.projectName, '難波改修');
  assert.equal(t.hours, 5); assert.equal(t.completedHours, 5);
  assert.equal(t.registeredDate, '2026-05-22');
  assert.equal(new Date(t.createdAt).getDate(), 22);
  assert.equal(t.actualEnd, null, 'スケジュールに影響させない');
  assert.equal(t.stepRoundType, '', '納品に数えない');
  assert.equal(t.stepAmount, '', '売上に出さない');
  assert.ok(t.invoiceCheckedAt > 0, '請求済み扱い');
  assert.equal(t.legacyKey, 'REN94');
  assert.ok(t.memo.includes('カット：LDK'));
});

test('LINE の書き方から照合キーを作る', () => {
  assert.equal(lineKey('REN.050'), 'REN50');
  assert.equal(lineKey('REN,100 3F'), 'REN100');
  assert.equal(lineKey('office.153'), 'OFFICE153');
  assert.equal(lineKey('IN1'), null);
  assert.equal(lineKey('TEST3'), null);
  assert.equal(lineKey('フェンスの作成'), null);
});

test('担当者の表を読み、過去分に担当者を付ける', () => {
  const tab = [
    ['社内案件名（LINEの書き方）', '照合キー', '担当者（一番多く出た人）', 'ほかに入った人', 'サポート', '最初に出た日', '最後に出た日', '一覧に出た日数', '状態'],
    ['REN.94', 'REN94', 'Aさん', 'Bさん', '', '2026-10-02', '2026-10-10', '5', '完了'],
    ['KYOWA.5', 'KYOWA5', 'Cさん', '', 'Dさん', '2026-10-20', '2026-11-03', '9', '制作中'],
    ['X.1', 'X1', '', '', '', '', '', '', ''],
  ].map(r => r.join('\t')).join('\n');
  const { map, error } = readAssigneeTable(tab);
  assert.equal(error, '');
  assert.equal(map.size, 2);
  assert.equal(readAssigneeTable('a\tb').error.includes('照合キー'), true);
  const ps = applyAssignees(summarizeLegacy(readLegacyRows(tsv([
    row('REN.94', '難波改修', 'LDK', L('2026-5', 'x\\0522'), 3, 2, true),
    row('KYOWA05', '共和', 'LDK', L('2026-5', 'x'), 1, 1, true),
    row('SAN.1', '三', 'LDK', L('2026-5', 'x'), 1, 1, true),
  ])).rows), map);
  const ren = ps.find(p => p.key === 'REN94');
  assert.equal(ren.assigneeInfo.assignee, 'Aさん');
  assert.equal(ren.lastDate, '2026-10-10');
  const t = legacyTask(ren, 't1', Date.now());
  assert.equal(t.assignee, 'Aさん');
  assert.ok(t.memo.includes('担当（LINEの朝の一覧より）：Aさん（ほかに Bさん）'));
  assert.ok(ps.find(p => p.key === 'KYOWA05').notes.includes('LINEでは制作中（過去分にしない）'));
  assert.equal(ps.find(p => p.key === 'SAN1').assigneeInfo, undefined);
  // 取り込み済みの過去分を直す（担当者不明のものだけ）
  const tasks = [
    { id: 'a', legacySource: LEGACY_SOURCE, assignee: LEGACY_ASSIGNEE, projectNameInternal: 'REN.94', memo: 'm' },
    { id: 'b', legacySource: LEGACY_SOURCE, assignee: '直した人', projectNameInternal: 'REN.94', memo: '' },
    { id: 'c', assignee: LEGACY_ASSIGNEE, projectNameInternal: 'REN.94' },
  ];
  const patches = assigneePatchesForImported(tasks, map);
  assert.equal(patches.length, 1);
  assert.equal(patches[0].id, 'a');
  assert.equal(patches[0].patch.assignee, 'Aさん');
  assert.ok(patches[0].patch.memo.startsWith('m\n担当'));
});

console.log(`legacyImport: ${passed} tests passed`);
