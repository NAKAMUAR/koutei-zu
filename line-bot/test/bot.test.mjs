// LINE Bot（line-bot/dist/Code.gs）を、LINE・Firestore・Apps Script の偽物の上で動かして検証する。
// Apps Script は手元で動かせないため、使う機能（UrlFetchApp・PropertiesService・ScriptApp など）を再現している。
// 実行: node line-bot/test/bot.test.mjs（先に npm run build:line で Code.gs を作っておく）
process.env.TZ = 'Asia/Ho_Chi_Minh'; // appsscript.json の timeZone と同じ

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }

const code = readFileSync(new URL('../dist/Code.gs', import.meta.url), 'utf8');

// ---------- 偽の時計 ----------
let NOW = new Date(2026, 9, 20, 8, 5).getTime(); // 2026-10-20(火) 8:05
const RealDate = Date;
class FakeDate extends RealDate {
  constructor(...a) { if (a.length === 0) super(NOW); else super(...a); }
  static now() { return NOW; }
}
const at = (y, m, d, h = 8, min = 5) => { NOW = new RealDate(y, m - 1, d, h, min).getTime(); };
const ms = (y, m, d, h = 10) => new RealDate(y, m - 1, d, h).getTime();

// ---------- 偽の Firestore ----------
const toVal = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toVal) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toVal(x)])) } };
};
let seq = 0;
const task = (o) => ({ id: 't' + (++seq), status: 'pending', priority: seq, createdAt: seq, hours: 3, completedHours: 0, stepOrder: 0, completedAt: null, ...o });
const tasks = [
  task({ projectName: '渋谷マンション', companyName: 'リノべる株式会社', viewpointName: 'IN1', stepName: 'ホワイト', assignee: '山田', deadline: '2026-10-20' }),
  task({ projectName: '渋谷マンション', companyName: 'リノべる株式会社', viewpointName: 'IN1', stepName: 'カラー', stepOrder: 1, assignee: '山田', deadline: '2026-10-20' }),
  task({ projectName: '田中邸', companyName: '田中建設', viewpointName: 'IN2', assignee: 'グエン', deadline: '2026-10-19' }),
  task({ projectName: '新宿オフィス', companyName: 'オフィスコム', viewpointName: 'EX1', assignee: '佐藤', deadline: '2026-10-21', hours: 20 }),
  task({ projectName: '池袋ビル', companyName: 'SUMUS', viewpointName: 'EX2', assignee: '佐藤', projectDeadline: '2026-10-30' }),
  // 完了済み（前営業日 10/19 に完了 → 載る）
  task({ projectName: '渋谷マンション', companyName: 'リノべる株式会社', viewpointName: 'EX1', stepName: 'ホワイト', assignee: '佐藤', status: 'done', completedAt: ms(2026, 10, 19) }),
  task({ projectName: '渋谷マンション', companyName: 'リノべる株式会社', viewpointName: 'EX1', stepName: 'カラー', stepOrder: 1, assignee: '佐藤', status: 'done', completedAt: ms(2026, 10, 19, 15) }),
  // 載らない完了：前営業日より前・中止・請求専用（作業時間0）
  task({ projectName: '古い案件', viewpointName: 'IN1', assignee: '山田', status: 'done', completedAt: ms(2026, 10, 16) }),
  task({ projectName: '中止案件', viewpointName: 'IN1', assignee: '山田', status: 'done', cancelled: true, completedAt: ms(2026, 10, 19) }),
  task({ projectName: '請求だけ', viewpointName: 'IN1', assignee: '山田', status: 'done', hours: 0, completedAt: ms(2026, 10, 19) }),
];
const dataDocs = {
  settings: JSON.stringify({ morningStart: '08:00', morningEnd: '12:00', afternoonStart: '13:00', afternoonEnd: '17:00', startTime: '08:00' }),
  holidays: '[]', absences: '[]', projectOrder: '[]',
  employeeMaster: JSON.stringify([{ name: '佐藤' }, { name: '山田' }, { name: 'グエン' }]),
};
const queries = [];
const resp = (code, body) => ({ getResponseCode: () => code, getContentText: () => (typeof body === 'string' ? body : JSON.stringify(body)) });
function firestore(req) {
  if (req.url.endsWith(':runQuery')) {
    const f = JSON.parse(req.payload).structuredQuery.where.fieldFilter;
    queries.push(f.field.fieldPath);
    const hit = f.field.fieldPath === 'status'
      ? tasks.filter(t => t.status === f.value.stringValue)
      : tasks.filter(t => typeof t.completedAt === 'number' && t.completedAt >= Number(f.value.integerValue));
    return resp(200, hit.map(t => ({ document: { name: 'x/' + t.id, fields: toVal(t).mapValue.fields } })));
  }
  if (req.url.endsWith(':batchGet')) {
    return resp(200, JSON.parse(req.payload).documents.map(name => {
      const k = name.slice(name.lastIndexOf('/') + 1);
      return k in dataDocs ? { found: { name, fields: { value: { stringValue: dataDocs[k] } } } } : { missing: name };
    }));
  }
  throw new Error('unexpected ' + req.url);
}

// ---------- 偽の LINE ----------
const line = { limit: 200, used: 45, members: { C1: 5 }, replies: [], pushes: [] };
function lineFetch(url, opt = {}) {
  const path = url.replace('https://api.line.me', '');
  if (path === '/v2/bot/message/reply') { line.replies.push(JSON.parse(opt.payload)); return resp(200, '{}'); }
  if (path === '/v2/bot/message/push') {
    const p = JSON.parse(opt.payload);
    line.pushes.push(p);
    line.used += line.members[p.to] || 1;
    return resp(200, '{}');
  }
  if (path === '/v2/bot/message/quota') return resp(200, { type: 'limited', value: line.limit });
  if (path === '/v2/bot/message/quota/consumption') return resp(200, { totalUsage: line.used });
  const m = path.match(/^\/v2\/bot\/(group|room)\/([^/]+)\/members\/count$/);
  if (m) return resp(200, { count: line.members[m[2]] || 2 });
  throw new Error('unexpected ' + url);
}

// ---------- 偽の Apps Script ----------
const props = { LINE_CHANNEL_ACCESS_TOKEN: 'tok', REGISTER_CODE: 'secret123' };
const cache = {};
let triggers = [];
const ctx = {
  console: { log() {}, warn() {}, error() {} },
  Date: FakeDate,
  UrlFetchApp: { fetch: lineFetch, fetchAll: (reqs) => reqs.map(firestore) },
  PropertiesService: { getScriptProperties: () => ({
    getProperty: (k) => props[k] ?? null, setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; },
  }) },
  CacheService: { getScriptCache: () => ({ get: (k) => cache[k] ?? null, put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  ContentService: { createTextOutput: (s) => ({ s }) },
  ScriptApp: {
    getOAuthToken: () => 'oauth',
    getProjectTriggers: () => triggers.slice(),
    deleteTrigger: (t) => { triggers = triggers.filter(x => x !== t); },
    newTrigger: (fn) => {
      const t = { fn, hour: null, getHandlerFunction: () => fn };
      const b = { timeBased: () => b, atHour: (h) => { t.hour = h; return b; }, nearMinute: () => b, everyDays: () => b, create: () => { triggers.push(t); return t; } };
      return b;
    },
  },
};
vm.createContext(ctx);
vm.runInContext(code, ctx);

const GROUP = { type: 'group', groupId: 'C1', userId: 'U1' };
function send(text, source = GROUP) {
  line.replies.length = 0;
  const r = ctx.doPost({ postData: { contents: JSON.stringify({ events: [{ type: 'message', replyToken: 'rt', source, message: { type: 'text', text } }] }) } });
  assert.equal(r.s, 'OK');
  return line.replies.map(p => p.messages.map(m => m.text).join('\n')).join('\n');
}
const hours = () => triggers.filter(t => t.fn === 'sendScheduledReport').map(t => t.hour).sort((a, b) => a - b);

// ---------- テスト ----------
test('未登録のトークでは定時報告をオンにできない', () => {
  assert.match(send('定時報告オン'), /まだ登録されていません/);
  assert.equal(props.REPORT_TARGETS, undefined);
});

test('登録後「定時報告オン」で送り先とトリガー（既定8時）ができ、人数ぶんの通数と残り回数を案内する', () => {
  send('登録 secret123');
  const out = send('定時報告オン');
  assert.deepEqual(JSON.parse(props.REPORT_TARGETS), ['C1']);
  assert.deepEqual(hours(), [8]);
  assert.match(out, /このトーク：オン/);
  assert.match(out, /1回の報告で使う通数：5通/);
  assert.match(out, /45 \/ 200通（残り155通 → このトークへの報告 あと約31回）/);
});

test('「定時報告時刻」で時刻を変えるとトリガーが作り直される。不正な時刻・1日4回以上は受け付けない', () => {
  send('定時報告時刻 8,17');
  assert.deepEqual(hours(), [8, 17]);
  assert.match(send('定時報告時刻 25'), /0〜23 の数字/);
  assert.match(send('定時報告時刻 6,9,12,17'), /1日3回まで/);
  assert.deepEqual(hours(), [8, 17]);
  send('定時報告時刻　８時'); // 全角・「時」付きでもOK
  assert.deepEqual(hours(), [8]);
});

test('「進捗報告」は返信（通数を使わない）で、各項目を正しく振り分ける', () => {
  const before = line.used;
  const out = send('進捗報告');
  assert.equal(line.used, before, '返信は通数に数えない');
  assert.match(out, /【工程図 進捗報告】10\/20\(火\) 08:05時点/);
  assert.match(out, /進行中 4案件・視点4/);
  assert.match(out, /■ 本日納期（1件）\n ・渋谷マンション IN1（山田） 見込み 10\/20 15:00/);
  assert.match(out, /■ 納期超過（未完了）（1件）\n ・田中邸 IN2（グエン） 納期10\/19\(月\)/);
  assert.match(out, /■ 納期に遅れる見込み（1件）\n ・新宿オフィス EX1（佐藤） 納期10\/21\(水\)→見込み/);
  assert.match(out, /■ 明日納期（1件）\n ・新宿オフィス EX1（佐藤） ※遅れ見込み/);
  assert.match(out, /■ 10\/19\(月\)以降の完了（1件）\n ・渋谷マンション EX1（佐藤） ホワイト・カラー →視点完了/);
  assert.doesNotMatch(out, /古い案件|中止案件|請求だけ/);
  assert.match(out, /■ 本日の予定（担当者別）\n ・佐藤 8\.0h：新宿オフィス EX1\n ・山田 6\.0h：渋谷マンション IN1\n ・グエン 3\.0h：田中邸 IN2/);
});

test('前営業日は休業日（日曜・休みの土曜・祝日）を飛ばしてさかのぼる', () => {
  const prev = (y, m, d) => new RealDate(ctx.previousWorkdayStart_(new RealDate(y, m - 1, d, 9))).toDateString();
  assert.equal(prev(2026, 10, 19), new RealDate(2026, 9, 16).toDateString(), '月曜 → 第3土曜は休み → 金曜');
  assert.equal(prev(2026, 10, 26), new RealDate(2026, 9, 24).toDateString(), '月曜 → 第4土曜は営業 → 土曜');
  ctx.KouteiLib.syncHolidays({ holidays: [{ date: '2026-10-19' }] });
  assert.equal(prev(2026, 10, 20), new RealDate(2026, 9, 16).toDateString(), '前日が祝日ならさらに前へ');
  ctx.KouteiLib.syncHolidays({ holidays: [] });
});

test('定時報告は登録済みの送り先へ1回だけ送り、同じ時間帯に二重送信しない', () => {
  line.pushes.length = 0;
  ctx.sendScheduledReport();
  assert.equal(line.pushes.length, 1);
  assert.equal(line.pushes[0].to, 'C1');
  assert.match(line.pushes[0].messages[0].text, /【工程図 進捗報告】/);
  assert.doesNotMatch(line.pushes[0].messages[0].text, /残りが少なく/);
  ctx.sendScheduledReport();
  assert.equal(line.pushes.length, 1);
});

test('休業日（日曜）は送らない', () => {
  at(2026, 10, 25);
  line.pushes.length = 0;
  ctx.sendScheduledReport();
  assert.equal(line.pushes.length, 0);
  at(2026, 10, 20);
});

test('残り通数が少ないと注意書きを付け、足りなければ送らない', () => {
  at(2026, 10, 21);
  line.pushes.length = 0;
  line.used = 180;
  ctx.sendScheduledReport();
  assert.equal(line.pushes.length, 1);
  assert.match(line.pushes[0].messages[0].text, /残り15通・このトークへの報告はあと約3回/);
  at(2026, 10, 22);
  line.used = 197;
  ctx.sendScheduledReport();
  assert.equal(line.pushes.length, 1, '必要5通・残り3通なので送らない');
  line.used = 45;
  at(2026, 10, 20);
});

test('完了タスクは定時報告・進捗報告のときだけ読む（ふだんの質問は未完了だけ）', () => {
  queries.length = 0;
  send('本日納期');
  assert.deepEqual(queries, ['status']);
  queries.length = 0;
  send('進捗報告');
  assert.deepEqual(queries, ['status', 'completedAt']);
});

test('「定時報告オフ」で送り先が空になるとトリガーも消える。登録解除でも報告が止まる', () => {
  send('定時報告オフ');
  assert.deepEqual(JSON.parse(props.REPORT_TARGETS), []);
  assert.deepEqual(hours(), []);
  send('定時報告オン');
  send('登録解除');
  assert.deepEqual(JSON.parse(props.REPORT_TARGETS), []);
  assert.deepEqual(hours(), []);
});

console.log(`\n${passed} tests passed`);
