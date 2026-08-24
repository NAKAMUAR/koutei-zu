import * as W from './.worker.mjs';
import { parseHM as appParseHM, fmtHM as appFmtHM, kanaNormalize as appKana } from '../../src/lib/utils.js';
import { resolveViewpointSteps as appResolve, DEFAULT_STEP_TYPES as appTypes } from '../../src/viewpoint/viewpointUtils.js';

let fail = 0;
const eq = (name, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { console.log(`✗ ${name}\n   worker: ${JSON.stringify(a)}\n   app   : ${JSON.stringify(b)}`); fail++; }
  else console.log(`✓ ${name}`);
};

// 1. parseHM / fmtHM がアプリと一致するか
for (const v of ['8', '8:30', '4.5', '0:45', '', 'abc', '12:00']) {
  eq(`parseHM(${JSON.stringify(v)})`, W.parseHM(v), appParseHM(v));
}
for (const v of [8, 8.5, 0, 4.25, null]) eq(`fmtHM(${v})`, W.fmtHM(v), appFmtHM(v));
for (const v of ['ﾘﾉﾍﾞﾙ', 'リノベル', 'TAMAZEN', 'たまぜん']) eq(`kana(${v})`, W.kanaNormalize(v), appKana(v));

// 2. ステップ種類の解決がアプリと一致するか（回数採番・納品名サフィックス）
eq('DEFAULT_STEP_TYPES 一致', W.DEFAULT_STEP_TYPES, appTypes);
const cases = [
  [{ stepTypeId: 'white' }, { stepTypeId: 'color' }],
  [{ stepTypeId: 'white' }, { stepTypeId: 'white_fix' }, { stepTypeId: 'white_fix' }],
  [{ stepTypeId: 'color' }, { stepTypeId: 'color_change' }, { stepTypeId: 'color_change' }, { stepTypeId: 'color_fix' }],
  [{ name: 'ホワイト' }, { name: '存在しない種類' }],
];
cases.forEach((c, i) => {
  const w = W.resolveViewpointSteps(c, appTypes).map(({ typeId, label, deliverySuffix, paid }) => ({ typeId, label, deliverySuffix, paid }));
  const a = appResolve(c, appTypes).map(({ typeId, label, deliverySuffix, paid }) => ({ typeId, label, deliverySuffix, paid }));
  eq(`resolveViewpointSteps ケース${i + 1}`, w, a);
});

// 3. buildTasks が出すフィールド集合が buildRecords と一致するか
const form = {
  companyName: 'TAMAZEN', projectName: 'A棟', viewpointName: 'EX1', assignee: 'ヤマダ',
  projectDeadline: '2026-08-05',
  steps: [{ stepTypeId: 'white', name: 'ホワイト', hours: 8 }, { stepTypeId: 'color', name: 'カラー', hours: 4.5 }],
};
const tasks = W.buildTasks(form, appTypes, 9);
const appPath = new URL('../../src/App.jsx', import.meta.url);
const src = await import('node:fs').then(m => m.readFileSync(appPath, 'utf8'));
const block = src.slice(src.indexOf('const record = {'), src.indexOf('// 完了実績（actualEnd）'));
const appFields = new Set([...block.matchAll(/^\s{12}([a-zA-Z]+):/gm)].map(m => m[1]));
// 1行に複数書かれているものを補う
for (const n of ['id','stepOrder','priority','hours','completedHours','tentativeStart','tentativeEnd']) appFields.add(n);
const wFields = new Set(Object.keys(tasks[0]));
const missing = [...appFields].filter(f => !wFields.has(f));
eq('buildRecords のフィールドを網羅', missing, []);
console.log('  Bot 独自の追加フィールド:', [...wFields].filter(f => !appFields.has(f)).join(', '));

// 4. 値の妥当性
eq('hours は小数時間', tasks.map(t => t.hours), [8, 4.5]);
eq('stepName は解決済みラベル', tasks.map(t => t.stepName), ['ホワイト', 'カラー']);
eq('stepDeliverySuffix', tasks.map(t => t.stepDeliverySuffix), ['白色', '色付']);
eq('stepOrder 連番', tasks.map(t => t.stepOrder), [0, 1]);
eq('createdAt 連番', tasks[1].createdAt - tasks[0].createdAt, 1);
eq('id 重複なし', new Set(tasks.map(t => t.id)).size, 2);
eq('status', tasks.map(t => t.status), ['pending', 'pending']);
eq('priority', tasks[0].priority, 99);

// 5. Firestore 型変換の往復
const round = W.fromFsFields(W.toFsFields(tasks[0]));
eq('型付きJSON往復', round, tasks[0]);
console.log('  hours=8 の型:', JSON.stringify(W.toFsValue(8)), ' hours=4.5:', JSON.stringify(W.toFsValue(4.5)));
console.log('  null:', JSON.stringify(W.toFsValue(null)), ' false:', JSON.stringify(W.toFsValue(false)));

// 6. 日付解釈
// MM/DD は「今年。すでに過ぎていれば来年」。今日の日付に依存しないよう計算して比較する
{
  const now = new Date(Date.now() + 9*3600*1000);
  const y = now.getUTCFullYear(), today = now.toISOString().slice(0,10);
  const mk = (mm,dd) => { const c = `${y}-${mm}-${dd}`; return c < today ? `${y+1}-${mm}-${dd}` : c; };
  eq('parseDateInput 8/5（未来なら今年・過去なら来年）', W.parseDateInput('8/5', 9), mk('08','05'));
  eq('parseDateInput 12/31', W.parseDateInput('12/31', 9), mk('12','31'));
}
eq('parseDateInput 2026-08-05', W.parseDateInput('2026-08-05', 9), '2026-08-05');
eq('parseDateInput 不正', W.parseDateInput('あした', 9), null);

// 7. コマンド解釈
eq('/status A棟', W.parseCommand('/status A棟'), ['status', 'A棟']);
eq('/状況 A棟', W.parseCommand('/状況 A棟'), ['status', 'A棟']);
eq('/案件', W.parseCommand('/案件'), ['new', '']);
eq('非コマンド', W.parseCommand('こんにちは'), [null, '']);

// 8. 読み取りコマンドが落ちないか
const sample = [
  { companyName:'TAMAZEN', projectName:'A棟', viewpointName:'EX1', assignee:'ヤマダ', stepName:'ホワイト', stepOrder:0, hours:8, completedHours:2, projectDeadline:'2026-08-05', deadline:null, status:'pending' },
  { companyName:'TAMAZEN', projectName:'A棟', viewpointName:'EX1', assignee:'ヤマダ', stepName:'カラー', stepOrder:1, hours:4, completedHours:0, projectDeadline:'2026-08-05', deadline:null, status:'pending' },
  { companyName:'SUMUS', projectName:'B邸', viewpointName:'IN1', assignee:'タナカ', stepName:'ホワイト', stepOrder:0, hours:6, completedHours:6, projectDeadline:null, deadline:'2026-07-30', status:'pending' },
];
for (const [n, f] of [['status一覧', () => W.cmdStatus(sample, '')], ['status詳細', () => W.cmdStatus(sample, 'A棟')], ['due', () => W.cmdDue(sample)], ['who', () => W.cmdWho(sample, '')], ['who詳細', () => W.cmdWho(sample, 'ヤマダ')], ['空', () => W.cmdStatus([], '')]]) {
  try { const r = f(); if (typeof r !== 'string' || !r) throw new Error('空の戻り値'); console.log(`✓ ${n}`); } catch (e) { console.log(`✗ ${n}: ${e.message}`); fail++; }
}
console.log('\n--- /status 出力例 ---\n' + W.cmdStatus(sample, ''));
console.log('\n--- /status A棟 ---\n' + W.cmdStatus(sample, 'A棟'));
console.log('\n--- 確認画面 ---\n' + W.previewText(form));
console.log(fail === 0 ? '\n★ 全テスト合格' : `\n★ ${fail}件 失敗`);
process.exit(fail ? 1 : 0);
