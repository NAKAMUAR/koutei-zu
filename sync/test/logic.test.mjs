// sync/Code.gs の純ロジック（判定・レコード生成・Firestore エンコード）を Node で検証する。
// 実行: node sync/test/logic.test.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(here, '..', 'Code.gs'), 'utf8');
const ctx = { console };
vm.createContext(ctx);
// 純関数だけを使う（SpreadsheetApp 等は呼ばない）。トップレベルの const/function を取り出すため
// スクリプト末尾で必要な名前をまとめて返す。
const exportsList = ['normCode_', 'codePrefix_', 'normCut_', 'normPattern_', 'viewpointNameOf_', 'cutTokens_', 'cutNumber_', 'circled_',
  'externalViewpointName_', 'guessCompanyFromLink_', 'findProject_', 'judgeCompany_', 'judgeViewpoint_',
  'judgeStepKind_', 'requestStepKind_', 'judgeRow_', 'parseDeadline_', 'toHours_', 'collectSourceRows_', 'buildTaskRecords_', 'resolveStepLabel_',
  'resolveDeliverySuffix_', 'normalizeStepTypes_', 'staffHeaderMap_', 'mapStaffColumns_', 'joinCode_', 'fsEncodeFields_', 'fsDecodeDoc_', 'rowObjToArray_', 'arrayToRowObj_',
  'STATUS', 'KIND', 'STEP_KIND', 'DEFAULT_STEP_TYPES', 'H', 'STAFF_INPUT_HEADERS', 'STAFF_INPUT_COLUMNS', 'INITIAL_VIEW_MASTER',
  'VIEW_CODE_OPTIONS', 'HOUR_OPTIONS', 'REQUEST_OPTIONS'];
const g = vm.runInContext(src + '\n;({' + exportsList.join(',') + '})', ctx);

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }
// vm で作った配列・オブジェクトは別 realm なので JSON で正規化してから比較する
const plain = (v) => JSON.parse(JSON.stringify(v));
function eq(actual, expected) { assert.deepEqual(plain(actual), plain(expected)); }

test('案件コードの正規化と英字部分', () => {
  assert.equal(g.normCode_('Ric.34'), 'RIC34');
  assert.equal(g.normCode_('TANAKA 329'), 'TANAKA329');
  assert.equal(g.normCode_(' REN.55 '), 'REN55');
  assert.equal(g.normCode_('SAN19'), g.normCode_('SAN.19'));
  assert.equal(g.codePrefix_('RENOBERU.58'), 'RENOBERU');
  assert.equal(g.codePrefix_('CG23'), 'CG');
  assert.equal(g.codePrefix_('123'), '');
});

test('パターンの正規化と視点名（内部名）', () => {
  assert.equal(g.normPattern_('A'), 'A');
  assert.equal(g.normPattern_('Aパターン'), 'A');
  assert.equal(g.normPattern_('パターンb'), 'B');
  assert.equal(g.normPattern_('なし'), '');
  assert.equal(g.normPattern_(''), '');
  assert.equal(g.viewpointNameOf_('EX1', 'A'), 'EX1-A');
  assert.equal(g.viewpointNameOf_('EX1', ''), 'EX1');
  assert.equal(g.viewpointNameOf_(' IN2 ', 'Bパターン'), 'IN2-B');
});

test('カット名のトークン化・番号・丸数字・社外視点名', () => {
  eq(g.cutTokens_('HOTEL_IN1(D)'), ['HOTEL', 'IN', 'D']);
  eq(g.cutTokens_('CAD 1F-A'), ['CAD', 'A']); // '1F' は数字始まりなので英字トークンにならない
  eq(g.cutTokens_('A-LDK2'), ['A', 'LDK']);
  eq(g.cutTokens_('P-1'), ['P']);
  eq(g.cutTokens_('IN2,3'), ['IN']);
  assert.ok(g.cutTokens_('SẢNH-IN1').includes('IN'));
  assert.equal(g.cutNumber_('EX1'), 1);
  assert.equal(g.cutNumber_('IN12'), 12);
  assert.equal(g.cutNumber_('HOTEL_IN3(B)'), 3);
  assert.equal(g.cutNumber_('EX'), 0);
  assert.equal(g.circled_(1), '①');
  assert.equal(g.circled_(20), '⑳');
  assert.equal(g.circled_(21), '21');
  assert.equal(g.circled_(0), '');
  assert.equal(g.externalViewpointName_('外観視点', 1, ''), '外観視点①');
  assert.equal(g.externalViewpointName_('外観視点', 1, 'A'), '外観視点①_パターンA');
  assert.equal(g.externalViewpointName_('内観視点', 0, 'B'), '内観視点_パターンB');
  assert.equal(g.externalViewpointName_('', 1, 'A'), '');
});

test('サーバリンクから会社名を推定', () => {
  assert.equal(g.guessCompanyFromLink_('\\\\CG-SERVER2\\Work Folder\\INTERIOR REVENUE\\2025\\2025-6\\株式会社リックデザイン(RIC)\\株式会社リックデザイン（RIC.34_鎌倉パスタ）\\01.DOC'), '株式会社リックデザイン');
  assert.equal(g.guessCompanyFromLink_('\\\\srv\\2025\\2025-7\\リノべる株式会社（RENOBERU)\\x'), 'リノべる株式会社');
  assert.equal(g.guessCompanyFromLink_(''), '');
});

const companies = [
  { prefix: 'REN', company: 'リノべる株式会社' }, { prefix: 'RENOBERU', company: 'リノべる株式会社' },
  { prefix: 'SUM', company: 'SUMUS' }, { prefix: 'TAMAZEN', company: 'TAMAZEN' },
];
const views = [
  { keyword: 'EX', category: '外観', kind: 'パース', external: '外観視点' }, { keyword: 'IN', category: '内観', kind: 'パース', external: '内観視点' },
  { keyword: 'LDK', category: '内観', kind: 'パース', external: '内観視点' }, { keyword: 'P', category: '', kind: '写真合成', external: '写真合成' },
  { keyword: 'CAD', category: '', kind: '', external: '' },
];
const projects = [
  { key: 'RIC34', name: '鎌倉パスタ水戸エクセル', company: '株式会社リックデザイン', contact: '山田様' },
  { key: 'REN84', name: 'あみだ池ハイツ', company: '', contact: '' },
];
const masters = { companies, views, projects };

test('案件マスタの照合（表記ゆれを無視）', () => {
  assert.equal(g.findProject_('Ric.34', projects).name, '鎌倉パスタ水戸エクセル');
  assert.equal(g.findProject_('RIC 34', projects).contact, '山田様');
  assert.equal(g.findProject_('RIC.35', projects), null);
});

test('会社名の判定（案件マスタ → 会社マスタ → リンクから推定）', () => {
  eq(g.judgeCompany_('Ric.34', '', companies, projects), { company: '株式会社リックデザイン', guessed: false });
  eq(g.judgeCompany_('REN84', '', companies, projects), { company: 'リノべる株式会社', guessed: false }); // 案件マスタの会社名が空 → 会社マスタ
  eq(g.judgeCompany_('RENOBERU.58', '', companies, projects), { company: 'リノべる株式会社', guessed: false });
  eq(g.judgeCompany_('RIC.36', '\\\\s\\2025\\2025-6\\株式会社リックデザイン(RIC)\\x', companies, projects), { company: '株式会社リックデザイン', guessed: true });
  eq(g.judgeCompany_('ZZZ.1', '', companies, projects), { company: '', guessed: true });
});

test('区分・種類・社外名の判定', () => {
  eq(g.judgeViewpoint_('EX1', '建築パース新規制作', views), { category: '外観', kind: 'パース', external: '外観視点' });
  eq(g.judgeViewpoint_('HOTEL_IN1(D)', '', views), { category: '内観', kind: 'パース', external: '内観視点' });
  eq(g.judgeViewpoint_('A-LDK2', '', views), { category: '内観', kind: 'パース', external: '内観視点' });
  eq(g.judgeViewpoint_('P-1', '合成写真新規制作（Sản xuất mới ảnh ghép）', views), { category: '', kind: '写真合成', external: '写真合成' });
  eq(g.judgeViewpoint_('CAD 1F-A', '', views), { category: '', kind: '', external: '' });
  eq(g.judgeViewpoint_('area3', '', views), { category: '', kind: '', external: '' });
  eq(g.judgeViewpoint_('area3', '建築パース新規制作', views), { category: '', kind: 'パース', external: '' });
});

test('ステップ種類の判定', () => {
  assert.equal(g.judgeStepKind_('建築パース新規制作', 1), '新規');
  assert.equal(g.judgeStepKind_('', 1), '新規');
  assert.equal(g.judgeStepKind_('', 2), '修正（無料）');
  assert.equal(g.judgeStepKind_('パース修正', 1), '修正（無料）');
  assert.equal(g.judgeStepKind_('パース変更', 1), '変更（有料）');
  assert.equal(g.judgeStepKind_('追加制作', 1), '追加');
  // 入力シートの「新規or修正」（回数より優先）
  assert.equal(g.judgeStepKind_(undefined, 1, '修正 / Sửa'), '修正（無料）');
  assert.equal(g.judgeStepKind_(undefined, 2, '新規 / Mới'), '新規');
  assert.equal(g.judgeStepKind_(undefined, 2, ''), '修正（無料）');
});

test('「新規or修正」欄の読み取り（日本語・ベトナム語・英語）', () => {
  g.REQUEST_OPTIONS.forEach(o => assert.ok(g.requestStepKind_(o), o + ' が読める'));
  assert.equal(g.requestStepKind_('新規 / Mới'), '新規');
  assert.equal(g.requestStepKind_('修正 / Sửa'), '修正（無料）');
  assert.equal(g.requestStepKind_('Mới'), '新規');
  assert.equal(g.requestStepKind_('sửa'), '修正（無料）');
  assert.equal(g.requestStepKind_('new'), '新規');
  assert.equal(g.requestStepKind_('add'), '追加');
  assert.equal(g.requestStepKind_('変更'), '変更（有料）');
  assert.equal(g.requestStepKind_(''), '');
  assert.equal(g.requestStepKind_('?'), '');
});

test('会社コード＋案件番号 → 社内案件名', () => {
  assert.equal(g.joinCode_('RIC', 34), 'RIC.34');
  assert.equal(g.joinCode_(' REN ', '72'), 'REN.72');
  assert.equal(g.joinCode_('RIC', ''), 'RIC');          // 番号が空 → 記入途中（コードのまま）
  assert.equal(g.joinCode_('RIC.34', ''), 'RIC.34');    // コードに番号まで書いてある
  assert.equal(g.joinCode_('RIC.34', 34), 'RIC.34');
  assert.equal(g.joinCode_('', 34), '');
  assert.equal(g.normCode_(g.joinCode_('Ric', 34)), 'RIC34');
});

// 初期の視点マスタ（シートに入れる値）をそのまま判定に使う
const initialViews = g.INITIAL_VIEW_MASTER.map(r => ({ keyword: r[0], category: r[1], kind: r[2], external: r[3] }));

test('入力シートの視点コード（EX・IN・EXCB・INCM・P・EXM・INM）が初期の視点マスタで判定できる', () => {
  const ext = (cut, pattern) => { const v = g.judgeViewpoint_(cut, '', initialViews); return [v.category, v.kind, g.externalViewpointName_(v.external, g.cutNumber_(cut), pattern)]; };
  eq(ext('EX1', ''), ['外観', 'パース', '外観視点①']);
  eq(ext('IN3', 'B'), ['内観', 'パース', '内観視点③_パターンB']);
  eq(ext('EXCB1', ''), ['外観', 'パース', '外観鳥瞰視点①']);
  eq(ext('INCM2', ''), ['内観', 'パース', '内観鳥瞰視点②']);
  eq(ext('INCB1', ''), ['内観', 'パース', '内観鳥瞰視点①']);
  eq(ext('P1', ''), ['', '写真合成', '写真合成視点①']);
  eq(ext('EXM1', ''), ['外観', 'モデル', '外観モデル①']);
  eq(ext('INM2', ''), ['内観', 'モデル', '内観モデル②']);
  // プルダウンの視点コードはすべて種類まで判定できる
  g.VIEW_CODE_OPTIONS.forEach(c => assert.ok(g.judgeViewpoint_(c, '', initialViews).kind, c + ' の種類が判定できる'));
  assert.ok(g.VIEW_CODE_OPTIONS.includes('EXCB1') && g.VIEW_CODE_OPTIONS.includes('INM5') && g.VIEW_CODE_OPTIONS.includes('IN20'));
  assert.equal(g.HOUR_OPTIONS[0], '0'); assert.ok(g.HOUR_OPTIONS.includes('0.5') && g.HOUR_OPTIONS.includes('40'));
});

test('行の判定と状態', () => {
  const ok = g.judgeRow_({ code: 'Ric.34', cut: 'EX1', pattern: 'A', link: '', item: '', round: 1, name: '' }, masters);
  assert.equal(ok.status, g.STATUS.NEW);
  assert.equal(ok.name, '鎌倉パスタ水戸エクセル');
  assert.equal(ok.company, '株式会社リックデザイン');
  assert.equal(ok.contact, '山田様');
  assert.equal(ok.extName, '外観視点①_パターンA');
  assert.equal(ok.category, '外観');
  assert.equal(ok.stepKind, '新規');
  // スタッフシートに社外案件名があればそちらを優先
  const named = g.judgeRow_({ code: 'Ric.34', cut: 'IN2', pattern: '', link: '', item: '', round: 1, name: 'シート側の名前' }, masters);
  assert.equal(named.name, 'シート側の名前');
  assert.equal(named.extName, '内観視点②');
  // 案件マスタに無い → 社外案件名が空で要確認（会社名は会社マスタで判定できる）
  const chk = g.judgeRow_({ code: 'REN.55', cut: 'EX3', pattern: '', link: '', item: '', round: 1, name: '' }, masters);
  assert.equal(chk.status, g.STATUS.CHECK);
  assert.equal(chk.company, 'リノべる株式会社');
  assert.ok(chk.note.includes('社外案件名'));
  const chk2 = g.judgeRow_({ code: 'ZZZ.1', cut: 'CAD 1F', pattern: '', link: '', item: '', round: 1, name: '' }, masters);
  assert.equal(chk2.status, g.STATUS.CHECK);
  assert.ok(chk2.note.includes('会社名'));
  assert.ok(chk2.note.includes('種類'));
});

test('行の判定：入力シートの「新規or修正」', () => {
  const row = (round, request) => ({ code: 'Ric.34', cut: 'EX1', pattern: '', link: '', item: undefined, round, name: 'マンション', request });
  const fix = g.judgeRow_(row(2, '修正 / Sửa'), masters);
  assert.equal(fix.stepKind, '修正（無料）'); assert.equal(fix.status, g.STATUS.NEW);
  // 2回目以降なのに「新規」→ 書き間違い・二重入力のおそれで要確認
  const twice = g.judgeRow_(row(3, '新規 / Mới'), masters);
  assert.equal(twice.stepKind, '新規'); assert.equal(twice.status, g.STATUS.CHECK);
  assert.ok(twice.note.includes('3回目'));
  // 入力シートより前からの案件の「修正」は、そのまま修正（注意書きだけ）
  const first = g.judgeRow_(row(1, '修正 / Sửa'), masters);
  assert.equal(first.stepKind, '修正（無料）'); assert.equal(first.status, g.STATUS.NEW);
  assert.ok(first.note.includes('前の行が無い'));
});

test('納期の解釈', () => {
  const today = new Date(2026, 8, 18); // 2026-09-18
  assert.equal(g.parseDeadline_('6/24 ', today), '2027-06-24'); // 60日以上前 → 来年
  assert.equal(g.parseDeadline_('9/25', today), '2026-09-25');
  assert.equal(g.parseDeadline_('8/1', today), '2026-08-01'); // 60日以内の過去は今年のまま
  assert.equal(g.parseDeadline_('2026/10/3', today), '2026-10-03');
  assert.equal(g.parseDeadline_('10月3日', today), '2026-10-03');
  assert.equal(g.parseDeadline_(new Date(2026, 11, 1), today), '2026-12-01');
  assert.equal(g.parseDeadline_('未定', today), '');
  assert.equal(g.parseDeadline_('', today), '');
});

test('時間の解釈', () => {
  assert.equal(g.toHours_(1.75), 1.75);
  assert.equal(g.toHours_('0.5'), 0.5);
  assert.equal(g.toHours_(''), 0);
  assert.equal(g.toHours_(-0.5), 0);
  assert.equal(g.toHours_('abc'), 0);
});

test('入力シートの見出し → 列（今のレイアウト。日本語＋ベトナム語の2段見出しでも読める）', () => {
  const expected = { code: 1, number: 2, name: 3, link: 4, request: 5, cut: 6, pattern: 7, white: 8, color: 9, other: 10, note: 11, deadline: 0, item: 0, done: 0 };
  const plainHeaders = g.staffHeaderMap_(g.STAFF_INPUT_HEADERS);
  Object.keys(expected).forEach(k => assert.equal(plainHeaders[k], expected[k], k));
  const bilingual = g.staffHeaderMap_(g.STAFF_INPUT_COLUMNS.map(c => c.label + '\n' + c.vi));
  Object.keys(expected).forEach(k => assert.equal(bilingual[k], expected[k], k));
  // 1列目の見出しを「社外案件名」と書き間違えていても、案件番号のすぐ左なら会社コードとみなす
  const typo = g.staffHeaderMap_(['社外案件名', '案件番号', '社外案件名', 'サーバーリンク', '新規or修正', '視点', 'パターン', 'White', 'Color', 'pts', 'メモ']);
  Object.keys(expected).forEach(k => assert.equal(typo[k], expected[k], k));
});

test('スタッフシートの見出し → 列（旧レイアウト product schedule）', () => {
  const m = g.staffHeaderMap_(['入力日', '社内案件名', '視点名', 'パターン', 'ホワイト時間', 'カラー時間', 'その他時間', '納期', '備考', '完了']);
  assert.equal(m.code, 2); assert.equal(m.cut, 3); assert.equal(m.pattern, 4);
  assert.equal(m.white, 5); assert.equal(m.color, 6); assert.equal(m.other, 7);
  assert.equal(m.deadline, 8); assert.equal(m.note, 9); assert.equal(m.done, 10);
  assert.equal(m.name, 0); assert.equal(m.link, 0); assert.equal(m.item, 0); assert.equal(m.number, 0); assert.equal(m.request, 0);
});

test('スタッフシートの見出し → 列（旧レイアウト：予想時間は1つ目White・2つ目Color）', () => {
  const headers = ['', '社内案件名', '社外案件名', 'カット名', 'サーバリンク', '', '納期', '制作項目 （Hạng mục）', '予想時間/分 （Thời gian）', '作成済み時間',
    '開始日/時間', '開始日/時間', '終了日/時間', '終了日/時間', '制作完了', '予想時間/分 （Thời gian）', '作成済み時間', '', '', '', '', '', '', '', '', '', '', '備考 （Ghi chú）', '作業完了/作成無し'];
  const m = g.staffHeaderMap_(headers);
  assert.equal(m.code, 2); assert.equal(m.name, 3); assert.equal(m.cut, 4); assert.equal(m.link, 5);
  assert.equal(m.deadline, 7); assert.equal(m.item, 8); assert.equal(m.white, 9); assert.equal(m.color, 16); assert.equal(m.done, 29);
  assert.equal(m.note, 28); assert.equal(m.other, 0); assert.equal(m.pattern, 0);
  assert.throws(() => g.staffHeaderMap_(['x', 'y']), /見出しが見つかりません/);
});

test('取込キー：同じ案件＋視点（パターン込み）は n回目、完了済みは数えるが出力しない', () => {
  const rows = [
    { srcRow: 10, code: 'Ric.34', name: '鎌倉パスタ', cut: 'EX1', pattern: '', link: '', deadlineRaw: '6/24', item: '', note: '', white: 8, color: 3.5, other: 0, done: true },
    { srcRow: 11, code: 'RIC34', name: '鎌倉パスタ', cut: 'EX1', pattern: '', link: '', deadlineRaw: '', item: '', note: '', white: 3.5, color: 0, other: 0, done: false },
    { srcRow: 12, code: 'Ric.34', name: '鎌倉パスタ', cut: 'EX1', pattern: 'A', link: '', deadlineRaw: '', item: '', note: '', white: 4, color: 2, other: 1, done: false },
    { srcRow: 13, code: 'Ric.34', name: '鎌倉パスタ', cut: 'IN1', pattern: '', link: '', deadlineRaw: '', item: '', note: '', white: 0, color: 1.5, other: 0, done: false },
    { srcRow: 14, code: '', name: '', cut: 'EX9', pattern: '', link: '', deadlineRaw: '', item: '', note: '', white: 1, color: 1, other: 0, done: false },
  ];
  const out = g.collectSourceRows_(rows, new Date(2026, 8, 18));
  assert.equal(out.length, 3);
  assert.equal(out[0].key, 'RIC34::EX1::2');
  assert.equal(out[0].round, 2);
  assert.equal(out[1].key, 'RIC34::EX1-A::1'); // パターンAは別の視点として1回目
  assert.equal(out[1].pattern, 'A');
  assert.equal(out[2].key, 'RIC34::IN1::1');
});

test('取込キー：記入途中の行（案件番号・新規or修正が空、時間がすべて0）は数えるが出力せず、そろえば同じキーで出る', () => {
  const r = (srcRow, code, cut, request, white, extra) => Object.assign({ srcRow, code, name: 'マンション', cut, pattern: '', link: '', request, deadlineRaw: undefined, item: undefined, note: '', white, color: 0, other: 0, done: false }, extra);
  const rows = [
    r(3, 'RIC.34', 'EX1', '新規 / Mới', 6),
    r(4, 'RIC.34', 'EX1', '修正 / Sửa', 0),                       // 時間がまだ → 待つ（回数には数える）
    r(5, 'RIC.34', 'EX1', '修正 / Sửa', 1),                       // 3回目
    r(6, 'RIC', 'IN1', '新規 / Mới', 3, { noNumber: true }),       // 案件番号がまだ
    r(7, 'RIC.34', 'IN1', '', 3),                                  // 新規or修正がまだ
  ];
  const out = g.collectSourceRows_(rows, new Date(2026, 8, 28));
  eq(out.map(o => o.key), ['RIC34::EX1::1', 'RIC34::EX1::3']);
  assert.equal(out.waiting, 3);
  assert.equal(out[1].request, '修正 / Sửa');
  assert.equal(out[0].deadline, undefined, '納期の列が無ければ undefined（『連携』の値を消さない）');
  rows[1].white = 2;
  const again = g.collectSourceRows_(rows, new Date(2026, 8, 28));
  eq(again.map(o => o.key), ['RIC34::EX1::1', 'RIC34::EX1::2', 'RIC34::EX1::3']);
  assert.equal(again.waiting, 2);
});

const baseCtx = () => ({ now: 1700000000000, today: '2026-09-18', defaultAssignee: '未割当', stepTypes: g.DEFAULT_STEP_TYPES, byVp: new Map(), byExt: new Map(), deleted: new Set() });

test('レコード生成：パース新規 → ホワイト＋カラー＋人物＋添景合成（納品種類は初回）', () => {
  const row = { key: 'RIC34::EX1-A::1', code: 'Ric.34', name: '鎌倉パスタ水戸', cut: 'EX1', pattern: 'A', extName: '外観視点①_パターンA', round: 1, deadline: '2026-10-01',
    white: 8, color: 3.5, other: 1, company: '株式会社リックデザイン', contact: '山田様', category: '外観', kind: 'パース', stepKind: '新規', assignee: '', memo: 'm' };
  const r = g.buildTaskRecords_(row, baseCtx());
  eq(r.errors, []);
  assert.equal(r.records.length, 3);
  const [w, c, o] = r.records.map(x => x.doc);
  assert.equal(w.stepName, 'ホワイト'); assert.equal(w.stepTypeId, 'white'); assert.equal(w.hours, 8); assert.equal(w.stepOrder, 0); assert.equal(w.stepDeliverySuffix, '白色');
  assert.equal(c.stepName, 'カラー'); assert.equal(c.stepTypeId, 'color'); assert.equal(c.hours, 3.5); assert.equal(c.stepOrder, 1); assert.equal(c.stepDeliverySuffix, '色付');
  assert.equal(o.stepName, '人物＋添景合成'); assert.equal(o.stepTypeId, 'person_scene'); assert.equal(o.hours, 1); assert.equal(o.stepOrder, 2); assert.equal(o.stepDeliverySuffix, '');
  assert.equal(w.projectName, '鎌倉パスタ水戸'); assert.equal(w.projectNameInternal, 'Ric.34'); assert.equal(w.companyName, '株式会社リックデザイン'); assert.equal(w.customerContact, '山田様');
  assert.equal(w.viewpointName, 'EX1-A'); assert.equal(w.viewpointNameExternal, '外観視点①_パターンA'); assert.equal(w.viewpointCategory, '外観'); assert.equal(w.deadline, '2026-10-01');
  assert.equal(w.assignee, '未割当'); assert.equal(w.priority, 99); assert.equal(w.status, 'pending'); assert.equal(w.completedHours, 0);
  assert.equal(w.registeredDate, '2026-09-18'); assert.equal(w.stepRequestDate, '2026-09-18');
  assert.equal(w.stepRoundType, 'initial'); assert.equal(c.stepRoundType, 'initial'); assert.equal(w.stepAmount, '');
  assert.equal(w.externalId, 'RIC34::EX1-A::1::white'); assert.equal(c.externalId, 'RIC34::EX1-A::1::color'); assert.equal(o.externalId, 'RIC34::EX1-A::1::person_scene');
  assert.ok(w.id.startsWith('task-'));
  assert.equal(w.memo, 'm');
});

test('レコード生成：追加 → 通常ステップ＋納品種類は追加', () => {
  const row = { key: 'RIC34::EX2::1', code: 'Ric.34', name: 'X', cut: 'EX2', pattern: '', extName: '', round: 1, deadline: '', white: 2, color: 1, other: 0, company: 'X', contact: '', category: '外観', kind: 'パース', stepKind: '追加', assignee: '', memo: '' };
  const r = g.buildTaskRecords_(row, baseCtx());
  assert.equal(r.records.length, 2);
  assert.equal(r.records[0].doc.stepTypeId, 'white'); assert.equal(r.records[0].doc.stepRoundType, 'add');
});

test('レコード生成：写真合成は1ステップ（時間は合計）', () => {
  const row = { key: 'RIC35::P-1::1', code: 'Ric.35', name: 'ディアモール', cut: 'P-1', pattern: '', extName: '写真合成①', round: 1, deadline: '', white: 0, color: 3.5, other: 0.5, company: 'X', contact: '', category: '', kind: '写真合成', stepKind: '新規', assignee: '田中', memo: '' };
  const r = g.buildTaskRecords_(row, baseCtx());
  assert.equal(r.records.length, 1);
  const d = r.records[0].doc;
  assert.equal(d.stepName, '写真合成'); assert.equal(d.stepTypeId, ''); assert.equal(d.hours, 4); assert.equal(d.assignee, '田中'); assert.equal(d.deadline, null);
  assert.equal(d.viewpointName, 'P-1'); assert.equal(d.viewpointNameExternal, '写真合成①');
  assert.equal(d.externalId, 'RIC35::P-1::1::photo');
});

test('レコード生成：モデル作成は1ステップ（時間は合計）、写真合成・モデルの修正回は名前に（修正）', () => {
  const row = { key: 'REN72::EXM1::1', code: 'REN.72', name: '戸建て', cut: 'EXM1', pattern: '', extName: '外観モデル①', round: 1, deadline: '', white: 8, color: 0, other: 0.5, company: 'X', contact: '', category: '外観', kind: 'モデル', stepKind: '新規', assignee: '', memo: '' };
  const r = g.buildTaskRecords_(row, baseCtx());
  eq(r.errors, []);
  assert.equal(r.records.length, 1);
  const d = r.records[0].doc;
  assert.equal(d.stepName, 'モデル作成'); assert.equal(d.stepTypeId, ''); assert.equal(d.hours, 8.5); assert.equal(d.viewpointCategory, '外観');
  assert.equal(d.externalId, 'REN72::EXM1::1::model'); assert.equal(d.stepRoundType, 'initial');
  const fix = g.buildTaskRecords_(Object.assign({}, row, { key: 'REN72::EXM1::2', round: 2, stepKind: '修正（無料）' }), baseCtx());
  assert.equal(fix.records[0].doc.stepName, 'モデル作成（修正）'); assert.equal(fix.records[0].doc.stepRoundType, 'fix');
  const photoFix = g.buildTaskRecords_(Object.assign({}, row, { key: 'REN72::P1::2', cut: 'P1', kind: '写真合成', stepKind: '修正（無料）' }), baseCtx());
  assert.equal(photoFix.records[0].doc.stepName, '写真合成（修正）'); assert.equal(photoFix.records[0].externalId, 'REN72::P1::2::photo');
});

test('レコード生成：2回目は修正ステップとして既存視点に続く（順番・回数・担当者を引き継ぐ、納品種類は修正）', () => {
  const c = baseCtx();
  const existing = [
    { id: 't1', projectName: '鎌倉パスタ', viewpointName: 'EX1', stepTypeId: 'white', stepOrder: 0, assignee: '佐藤', createdAt: 1, status: 'done', hours: 8, externalId: 'RIC34::EX1::1::white' },
    { id: 't2', projectName: '鎌倉パスタ', viewpointName: 'EX1', stepTypeId: 'color', stepOrder: 1, assignee: '佐藤', createdAt: 2, status: 'pending', hours: 3.5, externalId: 'RIC34::EX1::1::color' },
  ];
  existing.forEach(t => { c.byExt.set(t.externalId, t); const k = t.projectName + '' + t.viewpointName; if (!c.byVp.has(k)) c.byVp.set(k, []); c.byVp.get(k).push(t); });
  const row = { key: 'RIC34::EX1::2', code: 'Ric.34', name: '鎌倉パスタ', cut: 'EX1', pattern: '', extName: '外観視点①', round: 2, deadline: '', white: 1, color: 0.5, other: 0, company: 'X', contact: '', category: '外観', kind: 'パース', stepKind: '修正（無料）', assignee: '', memo: '' };
  const r = g.buildTaskRecords_(row, c);
  assert.equal(r.records.length, 2);
  const [w, col] = r.records.map(x => x.doc);
  assert.equal(w.stepName, 'ホワイト修正1回目（無料）'); assert.equal(w.stepTypeId, 'white_fix'); assert.equal(w.stepOrder, 2); assert.equal(w.stepDeliverySuffix, '白色2');
  assert.equal(col.stepName, 'カラー修正1回目（無料）'); assert.equal(col.stepOrder, 3); assert.equal(col.stepDeliverySuffix, '色付2');
  assert.equal(w.assignee, '佐藤');
  assert.equal(w.stepRoundType, 'fix');
});

test('レコード生成：登録済みは更新（未完了の時間・案件名・会社名・区分・納期・社外視点名だけ）', () => {
  const c = baseCtx();
  const existing = [
    { id: 't1', projectName: '旧名', projectNameInternal: 'Ric.34', viewpointName: 'EX1', viewpointNameExternal: '', stepTypeId: 'white', stepOrder: 0, assignee: '佐藤', createdAt: 1, status: 'done', hours: 8, companyName: 'X', viewpointCategory: '外観', deadline: null, externalId: 'RIC34::EX1::1::white' },
    { id: 't2', projectName: '旧名', projectNameInternal: 'Ric.34', viewpointName: 'EX1', viewpointNameExternal: '', stepTypeId: 'color', stepOrder: 1, assignee: '佐藤', createdAt: 2, status: 'pending', hours: 3.5, companyName: 'X', viewpointCategory: '外観', deadline: null, externalId: 'RIC34::EX1::1::color' },
  ];
  existing.forEach(t => c.byExt.set(t.externalId, t));
  const row = { key: 'RIC34::EX1::1', code: 'Ric.34', name: '新名', cut: 'EX1', pattern: '', extName: '外観視点①', round: 1, deadline: '2026-10-01', white: 9, color: 4, other: 0, company: 'X', contact: '', category: '外観', kind: 'パース', stepKind: '新規', assignee: '', memo: '' };
  const r = g.buildTaskRecords_(row, c);
  assert.equal(r.records.length, 2);
  assert.equal(r.records[0].update, true);
  eq(r.records[0].changes, { projectName: '新名', viewpointNameExternal: '外観視点①', deadline: '2026-10-01' }); // done の時間は変えない
  eq(r.records[1].changes, { hours: 4, projectName: '新名', viewpointNameExternal: '外観視点①', deadline: '2026-10-01' });
});

test('レコード生成：工程図で削除済みは送らない／必須チェック', () => {
  const c = baseCtx();
  c.deleted.add('RIC34::EX1::1::white');
  const row = { key: 'RIC34::EX1::1', code: 'Ric.34', name: '', cut: 'EX1', pattern: '', extName: '', round: 1, deadline: '', white: 8, color: 0, other: 0, company: 'X', contact: '', category: '', kind: 'パース', stepKind: '新規', assignee: '', memo: '' };
  const r = g.buildTaskRecords_(row, c);
  assert.equal(r.records.length, 1);
  assert.equal(r.records[0].skippedDeleted, true);
  const bad = g.buildTaskRecords_({ key: 'k', code: 'A1', cut: '', white: 0, color: 0, other: 0, company: '', kind: '' }, c);
  assert.ok(bad.errors.length >= 3);
  assert.equal(bad.records.length, 0);
});

test('Firestore の値エンコード／デコードが往復する', () => {
  const doc = { a: 'x', b: 1, c: 1.5, d: true, e: null, f: [1, 'y'], g: { h: 'z' } };
  const enc = g.fsEncodeFields_(doc);
  eq(enc.b, { integerValue: '1' });
  eq(enc.c, { doubleValue: 1.5 });
  eq(enc.e, { nullValue: null });
  eq(g.fsDecodeDoc_({ fields: enc }), doc);
});

test('連携行 ⇄ 配列の変換は見出し位置に従う', () => {
  const col = {}; Object.keys(g.H).forEach((k, i) => { col[k] = i + 1; });
  const arr = g.rowObjToArray_({ key: 'K', status: '未送信', send: false, round: 2 }, col);
  assert.equal(arr[col.key - 1], 'K'); assert.equal(arr[col.round - 1], 2);
  const back = g.arrayToRowObj_(arr, col);
  assert.equal(back.key, 'K'); assert.equal(back.round, 2); assert.equal(back.send, false);
});

console.log(`\n${passed} tests passed`);
