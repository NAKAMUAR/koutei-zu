// Discord Bot（Apps Script 側：line-bot/discord.js・gemini.js）を偽物の Apps Script・Firestore・Discord・Gemini の上で検証する。
// 実行: node line-bot/test/discord.test.mjs（先に npm run build:line で Code.gs を作っておく）
process.env.TZ = 'Asia/Ho_Chi_Minh';

import assert from 'node:assert/strict';
import { createFakeGas } from './fakeGas.mjs';

let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('  ok  ' + name); }

const ms = (y, m, d, h = 10) => new Date(y, m - 1, d, h).getTime();
let seq = 0;
const task = (o) => ({ id: 't' + (++seq), status: 'pending', priority: seq, createdAt: seq, hours: 3, completedHours: 0, stepOrder: 0, completedAt: null, ...o });
const tasks = [
  task({ projectName: '渋谷マンション', projectNameInternal: 'R-101', companyName: 'リノべる株式会社', viewpointName: 'IN1', stepName: 'ホワイト', assignee: '山田', deadline: '2026-11-02', status: 'done', completedAt: ms(2026, 10, 30) }),
  task({ projectName: '渋谷マンション', projectNameInternal: 'R-101', companyName: 'リノべる株式会社', viewpointName: 'IN1', stepName: 'カラー', stepOrder: 1, assignee: '山田', deadline: '2026-11-02', completedHours: 1 }),
  task({ projectName: '渋谷マンション', projectNameInternal: 'R-101', companyName: 'リノべる株式会社', viewpointName: 'EX1', stepName: 'ホワイト', assignee: '佐藤', projectDeadline: '2026-11-06', status: 'done', completedAt: ms(2026, 10, 29) }),
  task({ projectName: '渋谷マンション', projectNameInternal: 'R-101', companyName: 'リノべる株式会社', viewpointName: 'EX1', stepName: 'カラー', stepOrder: 1, assignee: '佐藤', projectDeadline: '2026-11-06', status: 'done', cancelled: true, completedAt: ms(2026, 10, 29) }),
  task({ projectName: '外観_A*案件', companyName: '田中建設', viewpointName: 'EX2', assignee: '佐藤', deadline: '2026-11-03', hours: 30 }),
  task({ projectName: '=SUM(A1),"x"', companyName: 'SUMUS', viewpointName: 'IN1', assignee: 'グエン', deadline: '2026-11-04' }),
  task({ projectName: '池袋ビル', companyName: 'オフィスコム', viewpointName: 'IN1', assignee: 'グエン', status: 'done', completedAt: ms(2026, 10, 10) }),
];
const dataDocs = {
  settings: JSON.stringify({ morningStart: '08:00', morningEnd: '12:00', afternoonStart: '13:00', afternoonEnd: '17:00', startTime: '08:00' }),
  holidays: '[]', absences: '[]', projectOrder: '[]',
  // 土曜（11/7 は第1土曜＝本来休み）に佐藤だけ出勤
  workdays: JSON.stringify([{ id: 'w1', date: '2026-11-07', startTime: '08:00', endTime: '12:00', assignee: '佐藤' }]),
  // 山田は 9:00〜 の稼働時間（担当者ごとの稼働時間）
  employeeMaster: JSON.stringify([
    { name: '佐藤' },
    { name: '山田', workHours: { morningStart: '09:00', morningEnd: '12:00', afternoonStart: '13:00', afternoonEnd: '17:00' } },
    { name: 'グエン' },
  ]),
};
const PROPS = { RELAY_SECRET: 's3cret', DISCORD_APPLICATION_ID: 'APP1', DISCORD_GUILD_ID: 'G1, G2', GEMINI_API_KEY: 'gk' };
const MON = new Date(2026, 10, 2, 8, 30).getTime(); // 2026-11-02(月)

function setup(over = {}) {
  return createFakeGas({ tasks, dataDocs, props: { ...PROPS, ...(over.props || {}) }, now: over.now || MON });
}
function relay(g, name, options = {}, over = {}) {
  const interaction = {
    type: 2, application_id: 'APP1', token: 'TOK', guild_id: 'G1', channel_id: 'C1',
    member: { user: { id: 'U1', username: 'kei' } },
    data: { name, options: Object.entries(options).map(([k, v]) => ({ name: k, value: v })) },
    ...over,
  };
  const out = g.ctx.doPost({ postData: { contents: JSON.stringify({ relay: 'discord', secret: over.secret ?? 's3cret', interaction }) } });
  assert.equal(out.mime, 'application/json');
  return JSON.parse(out.s);
}
const contents = (g) => g.state.discord.filter(d => d.json && d.json.content !== undefined).map(d => d.json.content);
const allText = (g) => contents(g).join('\n');

await test('合言葉（RELAY_SECRET）・アプリIDが違えば何もしない', () => {
  const g = setup();
  assert.equal(relay(g, '納期', {}, { secret: 'wrong' }).ok, false);
  assert.equal(relay(g, '納期', {}, { application_id: 'OTHER' }).ok, false);
  assert.equal(g.state.discord.length, 0);
  assert.equal(g.state.firestoreQueries.length, 0, '工程図も読まない');
});

await test('許可していないサーバー・DM では工程図を読まずに断る', () => {
  const g = setup();
  assert.equal(relay(g, '納期', {}, { guild_id: 'G9' }).ok, true);
  assert.equal(relay(g, '納期', {}, { guild_id: undefined }).ok, true);
  assert.equal(g.state.firestoreQueries.length, 0);
  assert.match(allText(g), /このサーバー（またはDM）では工程図Botを使えません/);
  assert.equal(g.state.discord[0].method, 'patch');
  assert.equal(g.state.discord[0].path, '/webhooks/APP1/TOK/messages/@original');
});

await test('/納期：考え中の返事を書き換え、案件名の記号は書式にならないようにし、通知（@メンション）は飛ばさない', () => {
  const g = setup();
  assert.equal(relay(g, '納期', { '範囲': 'thisWeek' }).ok, true);
  const d = g.state.discord[0];
  assert.equal(d.method, 'patch');
  assert.deepEqual(d.json.allowed_mentions, { parse: [] });
  assert.match(d.json.content, /^\*\*【今週納期 11\/2\(月\)〜11\/8\(日\)】3件\*\*/);
  assert.match(d.json.content, /外観\\_A\\\*案件/);
  assert.match(d.json.content, /渋谷マンション（リノべる株式会社）\n ・IN1  担当:山田/);
});

await test('アプリと同じく「土日の出勤日」「担当者ごとの稼働時間」をスケジュールに反映する', () => {
  const g = setup();
  relay(g, 'スケジュール', { '担当者': '山田' });
  assert.match(allText(g), /09:00-11:00  渋谷マンション \/ IN1 カラー/, '山田は9時開始');
  const g2 = setup();
  relay(g2, '空き状況', { '日数': 6 });
  const t = allText(g2);
  assert.match(t, /11\/2\(月\)〜11\/7\(土\)（営業日6日）/, '出勤登録のある第1土曜も営業日');
  assert.match(t, /＜佐藤＞ 予定30\.0h／空き14\.0h\n 11\/2\(月\) 予定8\.0h・空き0\.0h/);
  assert.match(t, /11\/7\(土\) 予定0\.0h・空き4\.0h/, '佐藤は土曜の午前に4時間の枠');
});

await test('/案件：一致した案件を完了済みの工程ごと読み、工程の完了日・残り時間・中止を示す', () => {
  const g = setup();
  relay(g, '案件', { '名前': 'r-101' }); // 社内案件名・大文字小文字を区別しない
  const t = allText(g);
  assert.ok(g.state.firestoreQueries.some(q => q.field === 'projectName' && q.op === 'IN' && q.value.includes('渋谷マンション')));
  assert.match(t, /\*\*【案件】渋谷マンション（リノべる株式会社）\*\*\n社内案件名 R-101｜全体納期 11\/6\(金\)｜視点 進行中1／全2/);
  assert.match(t, / ・EX1  担当:佐藤  納期11\/6\(金\)  完了（10\/29）\n    ホワイト✓10\/29 → カラー（中止）/);
  assert.match(t, / ・IN1  担当:山田  納期11\/2\(月\)  完了見込み 11\/2 11:00\n    ホワイト✓10\/30 → カラー（残り2\.0h）/);
});

await test('/案件：見つからない・候補が多すぎるときは案内する', () => {
  const g = setup();
  relay(g, '案件', { '名前': '存在しない' });
  assert.match(allText(g), /「存在しない」に一致する案件は見つかりませんでした/);
  const extra = [1, 2, 3, 4].map(i => task({ projectName: 'テスト邸' + i, viewpointName: 'IN1', assignee: '山田' }));
  const g2 = createFakeGas({ tasks: tasks.concat(extra), dataDocs, props: PROPS, now: MON });
  relay(g2, '案件', { '名前': 'てすと' }); // ひらがなでもカタカナの案件名に一致
  assert.match(allText(g2), /「てすと」に一致する案件が4件あります。もう少し詳しく指定してください。\n ・テスト邸1/);
  assert.ok(!g2.state.firestoreQueries.some(q => q.op === 'IN'), '候補が多いときは詳細を読みに行かない');
});

await test('工程図を読めないときは、管理者向けの理由を小さく添えて知らせる', () => {
  const g = setup();
  g.state.firestoreFail = true;
  relay(g, '案件一覧');
  assert.match(allText(g), /^データの取得に失敗しました。時間をおいてもう一度お試しください。\n-# 管理者向け: Firestore 403: \{"error":"PERMISSION\\_DENIED\\_\\\*x\\\*"\}$/);
});

await test('長い答えは2000字以内に分けて、続きを追加メッセージで送る', () => {
  const many = Array.from({ length: 120 }, (_, i) => task({ projectName: '大量案件' + i, companyName: 'CG工房', viewpointName: 'IN' + i, assignee: '佐藤', deadline: '2026-11-03', hours: 0.5 }));
  const g = createFakeGas({ tasks: tasks.concat(many), dataDocs, props: PROPS, now: MON });
  relay(g, '納期', { '範囲': 'all' });
  const c = contents(g);
  assert.ok(c.length >= 3);
  assert.ok(c.every(x => x.length <= 2000));
  assert.equal(g.state.discord[0].method, 'patch');
  assert.ok(g.state.discord.slice(1).every(d => d.method === 'post' && d.path === '/webhooks/APP1/TOK'));
});

await test('/書き出し：CSV を添付する（BOM・カンマや引用符の囲み・数式として実行されない対策）', () => {
  const g = setup();
  relay(g, '書き出し', { '内容': 'viewpoints' });
  const file = g.state.discord.find(d => d.multipart);
  assert.ok(file, 'ファイル付きの追加メッセージ');
  assert.equal(file.method, 'post');
  const pj = JSON.parse(file.multipart.payload_json);
  assert.equal(pj.attachments[0].filename, 'koutei_viewpoints_2026-11-02.csv');
  const csv = file.multipart['files[0]'].data;
  assert.equal(file.multipart['files[0]'].charset, 'UTF-8');
  assert.ok(csv.startsWith('﻿会社,社外案件名,社内案件名,視点,担当,未完了の工程,残り作業(h),納期,全体納期,完了見込み,納期遅れ見込み\r\n'));
  assert.match(csv, /SUMUS,"'=SUM\(A1\),""x""",,IN1,グエン/);
  assert.match(csv, /リノべる株式会社,渋谷マンション,R-101,IN1,山田,カラー,2\.0,2026-11-02,,2026-11-02 11:00,/);
  assert.match(allText(g), /【書き出し】進行中の視点一覧（3件）/);
});

await test('/書き出し：予定は日付・担当者順、完了実績は中止を除く', () => {
  const g = setup();
  relay(g, '書き出し', { '内容': 'schedule' });
  const csv = g.state.discord.find(d => d.multipart).multipart['files[0]'].data;
  const rows = csv.replace('﻿', '').trim().split('\r\n');
  assert.equal(rows[0], '日付,曜日,担当,開始,終了,時間(h),会社,社外案件名,視点,工程');
  assert.equal(rows[1], '2026-11-02,月,佐藤,08:00,12:00,4.0,田中建設,外観_A*案件,EX2,');
  assert.ok(rows.some(r => r.startsWith('2026-11-02,月,山田,09:00,11:00,2.0,')));
  const g2 = setup();
  relay(g2, '書き出し', { '内容': 'done' });
  const done = g2.state.discord.find(d => d.multipart).multipart['files[0]'].data;
  assert.match(done, /2026-10-29,佐藤,リノべる株式会社,渋谷マンション,R-101,EX1,ホワイト,3\.0/);
  assert.doesNotMatch(done, /カラー/, '中止した工程は入らない');
  assert.match(done, /池袋ビル/, '30日以内');
});

await test('/質問：Gemini がツールで工程図を見てから答える（データは1回だけ読み、署名ごと会話を戻す）', () => {
  const g = setup();
  g.state.gemini = (body, n) => {
    if (n === 1) {
      return { body: { candidates: [{ content: { role: 'model', parts: [
        { functionCall: { name: 'get_deadlines', args: { range: 'this_week' }, id: 'c1' }, thoughtSignature: 'SIG' },
        { functionCall: { name: 'get_project_detail', args: { keyword: '渋谷' }, id: 'c2' } },
      ] } }] } };
    }
    return { body: { candidates: [{ content: { role: 'model', parts: [{ text: '考え中', thought: true }, { text: '**渋谷マンション IN1** は本日 11:00 完了見込みです。' }] } }] } };
  };
  relay(g, '質問', { '内容': '渋谷は今週終わる？\n@everyone' });
  const [first, second] = g.state.geminiRequests;
  assert.equal(first.key, 'gk');
  assert.match(first.url, /models\/gemini-flash-latest:generateContent$/);
  assert.match(first.body.systemInstruction.parts[0].text, /今日は 2026-11-02（11\/2\(月\)）/);
  assert.equal(first.body.tools[0].functionDeclarations.length, 6);
  assert.equal(second.body.contents[1].parts[0].thoughtSignature, 'SIG');
  const fr = second.body.contents[2].parts;
  assert.equal(fr[0].functionResponse.id, 'c1');
  assert.match(fr[0].functionResponse.response.result, /【今週納期 11\/2\(月\)〜11\/8\(日\)】3件/);
  assert.match(fr[1].functionResponse.response.result, /【案件】渋谷マンション/);
  assert.equal(g.state.firestoreQueries.filter(q => q.field === 'status').length, 1, '工程図の読み込みは1回');
  const t = allText(g);
  assert.match(t, /^> 渋谷は今週終わる？\n> @everyone\n\*\*渋谷マンション IN1\*\* は本日 11:00 完了見込みです。\n-# AI（Gemini）の回答です。/);
  assert.doesNotMatch(t, /考え中/);
  assert.deepEqual(g.state.discord[0].json.allowed_mentions, { parse: [] });
});

await test('/質問：無料枠の上限・キー未設定・往復の上限でも分かりやすく答える', () => {
  const g = setup();
  g.state.gemini = () => ({ code: 429, body: '{"error":"quota"}' });
  relay(g, '質問', { '内容': 'x' });
  assert.match(allText(g), /Gemini の利用回数の上限（無料枠）に達しました/);
  const g2 = setup({ props: { GEMINI_API_KEY: '' } });
  relay(g2, '質問', { '内容': 'x' });
  assert.match(allText(g2), /GEMINI_API_KEY）が設定されていません/);
  const g3 = setup();
  g3.state.gemini = (body) => (body.toolConfig
    ? { body: { candidates: [{ content: { role: 'model', parts: [{ text: 'まとめ' }] } }] } }
    : { body: { candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'get_project_list', args: {} } }] } }] } });
  relay(g3, '質問', { '内容': 'x' });
  assert.equal(g3.state.geminiRequests.length, 4);
  assert.deepEqual(g3.state.geminiRequests[3].body.toolConfig, { functionCallingConfig: { mode: 'NONE' } });
  assert.match(allText(g3), /まとめ/);
});

await test('Gemini のツール：過去や30日より先の予定は断り、日付で予定を返す', () => {
  const g = setup();
  const getData = () => g.ctx.loadData_();
  assert.match(g.ctx.runGeminiTool_('get_schedule', { date: '2026-11-01' }, getData, new Date(MON)), /今日から30日先まで/);
  assert.match(g.ctx.runGeminiTool_('get_schedule', { date: '2026-11-03', assignee: '佐藤' }, getData, new Date(MON)), /^【明日のスケジュール】11\/3\(火\)（佐藤）\n\n＜佐藤＞\n 08:00-12:00  外観_A\*案件 \/ EX2/);
  assert.match(g.ctx.runGeminiTool_('get_schedule', { date: '2026-11-05' }, getData, new Date(MON)), /^【11\/5\(木\)のスケジュール】11\/5\(木\)/);
});

await test('registerDiscordCommands：Bot トークンでアプリIDを調べ、各サーバーにコマンドを一括登録する（名前は Discord の規則どおり）', () => {
  const g = setup({ props: { DISCORD_APPLICATION_ID: '', DISCORD_BOT_TOKEN: 'BT' } });
  g.ctx.registerDiscordCommands();
  assert.equal(g.props.DISCORD_APPLICATION_ID, 'APP1');
  const puts = g.state.discord.filter(d => d.method === 'put');
  assert.deepEqual(puts.map(p => p.path), ['/applications/APP1/guilds/G1/commands', '/applications/APP1/guilds/G2/commands']);
  assert.ok(g.state.discord.every(d => d.auth === 'Bot BT'));
  const NAME = /^[-_\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]{1,32}$/u;
  for (const c of puts[0].json) {
    assert.match(c.name, NAME, c.name);
    assert.equal(c.name, c.name.toLowerCase());
    assert.ok(c.description.length >= 1 && c.description.length <= 100, c.name);
    for (const o of c.options || []) {
      assert.match(o.name, NAME, o.name);
      assert.ok(o.description.length <= 100);
      assert.ok(!o.choices || o.choices.length <= 25);
    }
  }
});

await test('makeRelaySecret：64桁の合言葉を作り、2回目以降は同じ値を使う', () => {
  const g = setup({ props: { RELAY_SECRET: '' } });
  g.ctx.makeRelaySecret();
  const s = g.props.RELAY_SECRET;
  assert.match(s, /^[0-9a-f]{64}$/);
  g.ctx.makeRelaySecret();
  assert.equal(g.props.RELAY_SECRET, s);
});

await test('LINE の Webhook は今までどおり受け付ける（中継と取り違えない）', () => {
  const g = setup();
  const out = g.ctx.doPost({ postData: { contents: JSON.stringify({ events: [] }) } });
  assert.equal(out.s, 'OK');
  assert.equal(g.state.discord.length, 0);
});

console.log(`\n${passed} tests passed`);
