// 工程図 Discord Bot の受付口（Cloudflare Workers で動かす）。設定手順は discord-bot/README.md。
//
// Discord の「/コマンド」は、決まった URL に届き「本当に Discord から来たか（署名）」を確かめて
// 3秒以内に返事をする必要がある。Google Apps Script は署名（ヘッダー）を読めないため、ここで受け取り、
//   1. 署名を確かめる（Discord 以外からの呼び出しは 401 で断る）
//   2. すぐに「考え中…」と返す
//   3. 中身を Apps Script（工程図Bot）へ渡す → 答えは Apps Script が Discord に直接書き込む
// という役割だけを持つ。工程図のデータには触れない。
//
// 環境変数（Cloudflare の Worker → 設定 → 変数とシークレット）:
//   DISCORD_PUBLIC_KEY … Discord Developer Portal の「PUBLIC KEY」
//   GAS_URL            … Apps Script のウェブアプリ URL（.../exec）
//   RELAY_SECRET       … Apps Script の makeRelaySecret で作った合言葉（種類は「シークレット」にする）

const DISCORD_API = 'https://discord.com/api/v10';
const MAX_AGE_SEC = 5 * 60; // これより古い署名は受け付けない（使い回し防止）

function hexToBytes(hex) {
  if (typeof hex !== 'string' || !/^([0-9a-f]{2})+$/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

async function importPublicKey(hex) {
  const raw = hexToBytes(hex);
  if (!raw) throw new Error('DISCORD_PUBLIC_KEY の形式が正しくありません');
  try {
    return await crypto.subtle.importKey('raw', raw, { name: 'Ed25519' }, false, ['verify']);
  } catch (e) {
    // 古いランタイム向けの名前
    return crypto.subtle.importKey('raw', raw, { name: 'NODE-ED25519', namedCurve: 'NODE-ED25519' }, false, ['verify']);
  }
}

async function verifyDiscordRequest(publicKeyHex, signatureHex, timestamp, body, nowSec) {
  const sig = hexToBytes(signatureHex);
  if (!sig || !/^\d+$/.test(timestamp || '')) return false;
  if (Math.abs((nowSec ?? Date.now() / 1000) - Number(timestamp)) > MAX_AGE_SEC) return false;
  const key = await importPublicKey(publicKeyHex);
  const alg = key.algorithm && key.algorithm.name === 'NODE-ED25519' ? 'NODE-ED25519' : 'Ed25519';
  return crypto.subtle.verify(alg, key, sig, new TextEncoder().encode(timestamp + body));
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

async function editOriginal(interaction, content) {
  const url = `${DISCORD_API}/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;
  await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
  });
}

// Apps Script へ中継する。Apps Script は処理を終えてから返事をするので、ここで待つ。
// 30秒を超えて Worker が止まっても、Apps Script は最後まで動いて答えを書き込む。
async function relayToGas(interaction, env) {
  let problem = '';
  try {
    const res = await fetch(env.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relay: 'discord', secret: env.RELAY_SECRET, interaction }),
      redirect: 'follow',
    });
    const text = await res.text();
    let result = null;
    try { result = JSON.parse(text); } catch (e) { /* JSON 以外（Apps Script のエラーページ等） */ }
    if (result && result.ok === true) return;
    problem = (result && result.error) || `Apps Script の応答が想定外です（${res.status}）`;
  } catch (e) {
    problem = `Apps Script に接続できません（${e && e.message ? e.message : e}）`;
  }
  await editOriginal(interaction, `工程図に問い合わせできませんでした。管理者に連絡してください。\n-# ${problem}`.slice(0, 1900));
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') return new Response('工程図 Discord Bot は動いています。', { status: 200 });
    const body = await request.text();
    let valid = false;
    try {
      valid = await verifyDiscordRequest(env.DISCORD_PUBLIC_KEY, request.headers.get('X-Signature-Ed25519'),
        request.headers.get('X-Signature-Timestamp'), body);
    } catch (e) {
      console.error('署名の確認に失敗:', e);
    }
    if (!valid) return new Response('invalid request signature', { status: 401 });

    const interaction = JSON.parse(body);
    if (interaction.type === 1) return json({ type: 1 }); // PING（Discord が URL を確かめる）
    if (interaction.type === 2) { // スラッシュコマンド
      if (!env.GAS_URL || !env.RELAY_SECRET) {
        return json({ type: 4, data: { content: 'Worker の設定（GAS_URL / RELAY_SECRET）が足りません。管理者に連絡してください。', flags: 64 } });
      }
      ctx.waitUntil(relayToGas(interaction, env));
      return json({ type: 5 }); // 「考え中…」を表示（答えは後から書き込む）
    }
    return json({ type: 4, data: { content: 'この操作には対応していません。', flags: 64 } });
  },
};
