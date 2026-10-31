// Discord の受付口（discord-bot/worker.js）を検証する。本物の Ed25519 の鍵で署名を作り、
// Discord → Worker → Apps Script（偽物の上で動かす Code.gs）→ Discord の一連の流れも通す。
// 実行: node discord-bot/test/worker.test.mjs（先に npm run build:line）
process.env.TZ = 'Asia/Ho_Chi_Minh';

import assert from 'node:assert/strict';
import worker from '../worker.js';
import { createFakeGas } from '../../line-bot/test/fakeGas.mjs';

let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('  ok  ' + name); }

const toHex = (buf) => Buffer.from(buf).toString('hex');
const keys = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const PUBLIC_KEY = toHex(await crypto.subtle.exportKey('raw', keys.publicKey));
const otherKeys = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);

async function signedRequest(obj, { key = keys.privateKey, ts = String(Math.floor(Date.now() / 1000)), tamper = false } = {}) {
  const body = JSON.stringify(obj);
  const sig = toHex(await crypto.subtle.sign('Ed25519', key, new TextEncoder().encode(ts + body)));
  return new Request('https://koutei.example.workers.dev/', {
    method: 'POST',
    headers: { 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts, 'Content-Type': 'application/json' },
    body: tamper ? body.replace('納期', '案件') : body,
  });
}
const ENV = { DISCORD_PUBLIC_KEY: PUBLIC_KEY, GAS_URL: 'https://script.google.com/macros/s/X/exec', RELAY_SECRET: 's3cret' };
function makeCtx() { const waits = []; return { waits, waitUntil: (p) => waits.push(p) }; }
const command = { type: 2, application_id: 'APP1', token: 'TOK', guild_id: 'G1', data: { name: '納期', options: [] } };

// 外への通信（Apps Script・Discord）を差し替える
const calls = [];
let gasHandler = async () => new Response('{"ok":true}');
globalThis.fetch = async (url, opt = {}) => {
  calls.push({ url: String(url), method: opt.method, body: opt.body });
  if (String(url).startsWith(ENV.GAS_URL)) return gasHandler(opt);
  if (String(url).startsWith('https://discord.com/api/v10/')) return new Response('{}');
  throw new Error('unexpected ' + url);
};

await test('GET には動作確認の文字を返す', async () => {
  const res = await worker.fetch(new Request('https://x/'), ENV, makeCtx());
  assert.equal(res.status, 200);
});

await test('署名が無い・違う鍵・改ざん・古い署名は 401 で断る', async () => {
  const noSig = new Request('https://x/', { method: 'POST', body: '{"type":1}' });
  assert.equal((await worker.fetch(noSig, ENV, makeCtx())).status, 401);
  assert.equal((await worker.fetch(await signedRequest({ type: 1 }, { key: otherKeys.privateKey }), ENV, makeCtx())).status, 401);
  assert.equal((await worker.fetch(await signedRequest(command, { tamper: true }), ENV, makeCtx())).status, 401);
  const old = String(Math.floor(Date.now() / 1000) - 600);
  assert.equal((await worker.fetch(await signedRequest({ type: 1 }, { ts: old }), ENV, makeCtx())).status, 401);
  assert.equal((await worker.fetch(await signedRequest({ type: 1 }), { ...ENV, DISCORD_PUBLIC_KEY: 'zz' }, makeCtx())).status, 401);
});

await test('Discord の確認（PING）には PONG を返す', async () => {
  const res = await worker.fetch(await signedRequest({ type: 1 }), ENV, makeCtx());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { type: 1 });
});

await test('コマンドにはすぐ「考え中」を返し、裏で Apps Script に合言葉つきで中継する', async () => {
  calls.length = 0;
  const ctx = makeCtx();
  const res = await worker.fetch(await signedRequest(command), ENV, ctx);
  assert.deepEqual(await res.json(), { type: 5 });
  assert.equal(ctx.waits.length, 1);
  await Promise.all(ctx.waits);
  assert.equal(calls.length, 1, 'Apps Script が答えるので Worker は Discord に書かない');
  const sent = JSON.parse(calls[0].body);
  assert.equal(sent.relay, 'discord');
  assert.equal(sent.secret, 's3cret');
  assert.equal(sent.interaction.token, 'TOK');
});

await test('Apps Script が断った・つながらないときは、理由を Discord に書き込む', async () => {
  calls.length = 0;
  gasHandler = async () => new Response('{"ok":false,"error":"合言葉（RELAY_SECRET）が一致しません"}');
  let ctx = makeCtx();
  await worker.fetch(await signedRequest(command), ENV, ctx);
  await Promise.all(ctx.waits);
  const patch = calls.find(c => c.method === 'PATCH');
  assert.equal(patch.url, 'https://discord.com/api/v10/webhooks/APP1/TOK/messages/@original');
  assert.match(JSON.parse(patch.body).content, /合言葉（RELAY_SECRET）が一致しません/);
  assert.deepEqual(JSON.parse(patch.body).allowed_mentions, { parse: [] });

  calls.length = 0;
  gasHandler = async () => new Response('<html>エラー</html>');
  ctx = makeCtx();
  await worker.fetch(await signedRequest(command), ENV, ctx);
  await Promise.all(ctx.waits);
  assert.match(JSON.parse(calls.find(c => c.method === 'PATCH').body).content, /応答が想定外です/);

  calls.length = 0;
  gasHandler = async () => { throw new Error('network down'); };
  ctx = makeCtx();
  await worker.fetch(await signedRequest(command), ENV, ctx);
  await Promise.all(ctx.waits);
  assert.match(JSON.parse(calls.find(c => c.method === 'PATCH').body).content, /Apps Script に接続できません（network down）/);
  gasHandler = async () => new Response('{"ok":true}');
});

await test('Worker の設定が足りなければ、本人だけに見える形で知らせる', async () => {
  const res = await worker.fetch(await signedRequest(command), { DISCORD_PUBLIC_KEY: PUBLIC_KEY }, makeCtx());
  const j = await res.json();
  assert.equal(j.type, 4);
  assert.equal(j.data.flags, 64);
  assert.match(j.data.content, /GAS_URL \/ RELAY_SECRET/);
});

await test('通しの流れ：/納期 → Worker → Apps Script（Code.gs）→ Discord に答えが書き込まれる', async () => {
  const g = createFakeGas({
    tasks: [{ id: 't1', status: 'pending', priority: 1, createdAt: 1, hours: 2, completedHours: 0, stepOrder: 0, projectName: '渋谷マンション', companyName: 'CG工房', viewpointName: 'IN1', assignee: '山田', deadline: '2026-11-02' }],
    dataDocs: { settings: '{}', employeeMaster: '[]' },
    props: { RELAY_SECRET: 's3cret', DISCORD_APPLICATION_ID: 'APP1', DISCORD_GUILD_ID: 'G1' },
    now: new Date(2026, 10, 2, 8, 30).getTime(),
  });
  gasHandler = async (opt) => {
    const out = g.ctx.doPost({ postData: { contents: opt.body } });
    return new Response(out.s);
  };
  calls.length = 0;
  const ctx = makeCtx();
  const res = await worker.fetch(await signedRequest({ ...command, data: { name: '納期', options: [{ name: '範囲', value: 'today', type: 3 }] } }), ENV, ctx);
  assert.deepEqual(await res.json(), { type: 5 });
  await Promise.all(ctx.waits);
  assert.equal(calls.filter(c => c.url.startsWith('https://discord.com')).length, 0, 'Worker 自身はエラー表示をしない');
  const written = g.state.discord.find(d => d.method === 'patch');
  assert.match(written.json.content, /\*\*【本日納期 11\/2\(月\)】1件\*\*\n■ 渋谷マンション（CG工房）\n ・IN1  担当:山田  完了見込み 11\/2 10:00/);
});

console.log(`\n${passed} tests passed`);
