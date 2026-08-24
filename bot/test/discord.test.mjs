// Discord のインタラクションを署名込みで再現し、ウィザードを最後まで通す
import worker from './.worker.mjs';

const kv = new Map();
const STATE = {
  async get(k, type) { const v = kv.get(k); if (v === undefined) return null; return type === 'json' ? JSON.parse(v) : v; },
  async put(k, v) { kv.set(k, v); },
  async delete(k) { kv.delete(k); },
};

// --- Discord の署名鍵を用意 ---
const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const pubRaw = Buffer.from(await crypto.subtle.exportKey('raw', pair.publicKey)).toString('hex');

const env = {
  WEBHOOK_SECRET: 'SEC',
  FIREBASE_API_KEY: 'AK', FIREBASE_PROJECT_ID: 'koutei-zu', FIRESTORE_DATABASE_ID: 'default',
  WORKSPACE_ID: 'liebe-asia-team', BOT_EMAIL: 'bot@x', BOT_PASSWORD: 'p', TZ_OFFSET: '9', STATE,
  DISCORD_APP_ID: 'APP', DISCORD_PUBLIC_KEY: pubRaw, DISCORD_BOT_TOKEN: 'BT',
  DISCORD_USER_ID: '555000111', DISCORD_GUILD_ID: 'G1',
};

const posted = [];   // Bot が Discord へ送った内容（@original の書き換え / 追加メッセージ）
let committed = null, deleted = null;

globalThis.fetch = async (url, init) => {
  const u = String(url);
  const body = init?.body ? JSON.parse(init.body) : {};
  const J = (o) => new Response(JSON.stringify(o), { headers: { 'content-type': 'application/json' } });

  if (u.includes('discord.com')) {
    if (u.endsWith('/messages/@original')) posted.push({ t: 'patch', ...body });
    else if (u.includes('/webhooks/')) posted.push({ t: 'followup', ...body });
    else if (u.includes('/commands')) return J([{ name: 'new' }, { name: 'status' }]);
    return J({});
  }
  if (u.includes('identitytoolkit')) return J({ idToken: 'TOKEN' });
  if (u.includes('customerMaster')) return J({ fields: { value: { stringValue: JSON.stringify([{ company: 'TAMAZEN' }, { company: 'SUMUS' }]) } } });
  if (u.includes('employeeMaster')) return J({ fields: { value: { stringValue: JSON.stringify([{ name: 'ヤマダ' }, { name: 'タナカ' }]) } } });
  if (u.includes('stepTypeMaster')) return J({ fields: { value: { stringValue: JSON.stringify(null) } } });
  if (u.includes('botSnapshot')) return new Response('not found', { status: 404 });
  if (u.includes(':runQuery')) return J([{ document: { fields: {
    projectName:{stringValue:'A棟'}, companyName:{stringValue:'TAMAZEN'}, viewpointName:{stringValue:'EX1'},
    assignee:{stringValue:'ヤマダ'}, stepName:{stringValue:'ホワイト'}, stepOrder:{integerValue:'0'},
    hours:{integerValue:'8'}, completedHours:{doubleValue:2.5}, projectDeadline:{stringValue:'2026-08-05'},
    deadline:{nullValue:null}, status:{stringValue:'pending'} } } }]);
  if (u.includes(':commit')) {
    if (body.writes?.[0]?.delete) { deleted = body.writes.map(w => w.delete); return J({}); }
    committed = body.writes; return J({});
  }
  throw new Error('未対応のURL: ' + u);
};

// --- 署名付きでインタラクションを送る ---
const pending = [];
const exeCtx = { waitUntil: (p) => pending.push(p) };
async function send(interaction, opts = {}) {
  const bodyText = JSON.stringify(interaction);
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = Buffer.from(await crypto.subtle.sign({ name: 'Ed25519' }, pair.privateKey,
    new TextEncoder().encode(ts + bodyText))).toString('hex');
  const headers = { 'content-type': 'application/json' };
  if (!opts.badSig) { headers['x-signature-ed25519'] = sig; headers['x-signature-timestamp'] = ts; }
  else { headers['x-signature-ed25519'] = '00'.repeat(64); headers['x-signature-timestamp'] = ts; }
  const res = await worker.fetch(new Request('https://w.dev/discord', { method: 'POST', headers, body: bodyText }), env, exeCtx);
  // 遅延処理（waitUntil）を待つ
  while (pending.length) await pending.shift();
  return { status: res.status, json: res.headers.get('content-type')?.includes('json') ? await res.json() : null };
}

const USER = { id: '555000111' };
const cmd = (name, opt) => send({ type: 2, id: 'i', token: 'TK', member: { user: USER }, data: { name, options: opt ? [{ name: 'name', value: opt }] : [] } });
const comp = (custom_id, values) => send({ type: 3, id: 'i', token: 'TK', member: { user: USER }, data: { custom_id, ...(values ? { values } : {}) } });
const modal = (custom_id, fields) => send({ type: 5, id: 'i', token: 'TK', member: { user: USER }, data: { custom_id,
  components: Object.entries(fields).map(([k, v]) => ({ type: 1, components: [{ type: 4, custom_id: k, value: v }] })) } });

const last = () => posted[posted.length - 1];
/** 直近に出たコンポーネントから label のものを押す */
const tap = (label) => {
  for (let i = posted.length - 1; i >= 0; i--) {
    const comps = posted[i].components;
    if (!comps || comps.length === 0) continue;
    for (const row of comps) {
      for (const c of row.components) {
        if (c.type === 2 && c.label === label) return comp(c.custom_id);
        if (c.type === 3) {
          const o = c.options.find(o => o.label === label);
          if (o) return comp(c.custom_id, [o.value]);
        }
      }
    }
    throw new Error(`「${label}」が見つかりません: ${JSON.stringify(comps)}`);
  }
  throw new Error('コンポーネントがありません');
};

let fail = 0;
const check = (n, c, x) => { if (c) console.log(`✓ ${n}`); else { console.log(`✗ ${n}${x ? ' — ' + x : ''}`); fail++; } };

// === 署名・認可 ===
check('PING に PONG', (await send({ type: 1 })).json?.type === 1);
check('署名が不正なら401', (await send({ type: 1 }, { badSig: true })).status === 401);
posted.length = 0;
const other = await send({ type: 2, id: 'i', token: 'TK', member: { user: { id: '999' } }, data: { name: 'status' } });
check('他人は拒否', other.json?.data?.content?.includes('本人のみ'), JSON.stringify(other.json));
check('他人の実行では何も送信しない', posted.length === 0);

// === 読み取りコマンド ===
posted.length = 0;
let r = await cmd('status');
check('/status は遅延応答（type 5・ephemeral）', r.json.type === 5 && r.json.data.flags === 64, JSON.stringify(r.json));
check('/status の本文が @original に入る', last().t === 'patch' && last().content.includes('A棟'), JSON.stringify(last()));
await cmd('status', 'A棟');
check('/status name:A棟 で詳細', last().content.includes('EX1') && last().content.includes('02:30 / 08:00'));
await cmd('due');  check('/due', last().content.includes('2026-08-05'));
await cmd('who');  check('/who', last().content.includes('ヤマダ'));
await cmd('today'); check('/today は未実装を案内', last().content.includes('まだ取得できません'));
await cmd('help'); check('/help', last().content.includes('使い方'));

// === 登録ウィザード ===
posted.length = 0;
r = await cmd('new');
check('/new で会社の選択肢', JSON.stringify(last().components).includes('TAMAZEN'), JSON.stringify(last()));

r = await tap('TAMAZEN');
check('会社選択の直後はモーダル（type 9）', r.json.type === 9, JSON.stringify(r.json).slice(0, 200));
check('モーダルは案件名を尋ねる', JSON.stringify(r.json.data).includes('案件名'));
check('モーダルは3秒以内に即答＝Firestoreを呼ばない', r.json.data.custom_id === 'm:co');

let mark = posted.length;
r = await modal('m:co', { project: 'A棟' });
check('モーダル送信は遅延応答', r.json.type === 5);
check('次は視点の選択肢', JSON.stringify(last().components).includes('EX1'), JSON.stringify(last()));

mark = posted.length;
r = await tap('EX1');
check('ボタンは type 6（元メッセージを更新）', r.json.type === 6, JSON.stringify(r.json));
check('押したメッセージが確定表示に', posted.slice(mark).some(p => p.t === 'patch' && p.content.includes('視点：EX1') && p.components.length === 0), JSON.stringify(posted.slice(mark)));
check('次の質問は追加メッセージ', posted.slice(mark).some(p => p.t === 'followup' && p.content.includes('担当者')), JSON.stringify(posted.slice(mark).map(p=>p.content)));

await tap('ヤマダ');
check('ステップ種類', JSON.stringify(last().components).includes('ホワイト'));
await tap('ホワイト');
check('時間の選択肢', JSON.stringify(last().components).includes('8h'));
await tap('8h');
check('ステップ追加の確認', last().content.includes('ステップを追加しますか'), last().content);

// 2ステップ目は直接入力モーダルを使う
await tap('ステップを追加');
await tap('カラー');
r = await tap('（直接入力）');
check('時間の直接入力はモーダル', r.json.type === 9 && r.json.data.custom_id === 'm:hours', JSON.stringify(r.json).slice(0,150));
await modal('m:hours', { hours: '4:30' });
check('直接入力の時間が反映', last().content.includes('カラー 04:30'), last().content);

await tap('納期の入力へ進む');
check('納期の選択肢', JSON.stringify(last().components).includes('今週末'));
r = await tap('（直接入力）');
check('納期の直接入力はモーダル', r.json.data.custom_id === 'm:deadline');
await modal('m:deadline', { deadline: '2026-12-05' });
check('確認画面', last().content.includes('この内容で登録しますか'), last().content);
check('確認画面に納期', last().content.includes('2026-12-05'));
check('登録/やめる のボタン', JSON.stringify(last().components).includes('登録する'));

await tap('登録する');

// === 書き込み内容 ===
check('Firestore へ2件書き込み', committed?.length === 2, String(committed?.length));
const docs = committed.map(w => Object.fromEntries(Object.entries(w.update.fields).map(([k, v]) => [k, Object.values(v)[0]])));
check('会社名', docs.every(d => d.companyName === 'TAMAZEN'));
check('案件名', docs.every(d => d.projectName === 'A棟'));
check('視点名', docs.every(d => d.viewpointName === 'EX1'));
check('担当者', docs.every(d => d.assignee === 'ヤマダ'));
check('納期', docs.every(d => d.projectDeadline === '2026-12-05'), JSON.stringify(docs.map(d=>d.projectDeadline)));
check('hours は小数時間(8, 4.5)', docs.map(d => Number(d.hours)).join(',') === '8,4.5', docs.map(d=>d.hours).join(','));
check('stepTypeId', docs.map(d => d.stepTypeId).join(',') === 'white,color');
check('納品名サフィックス', docs.map(d => d.stepDeliverySuffix).join(',') === '白色,色付');
check('createdVia=discord', docs.every(d => d.createdVia === 'discord'), docs[0].createdVia);
check('externalId は dc:: 始まり', docs.every(d => String(d.externalId).startsWith('dc::')), docs[0].externalId);
check('書き込み先パス', committed[0].update.name.includes('/databases/default/documents/workspaces/liebe-asia-team/tasks/'));
check('完了メッセージ', posted.some(p => p.content?.includes('登録しました')));

// === 取り消し ===
mark = posted.length;
await cmd('undo');
check('/undo で2件削除', deleted?.length === 2, JSON.stringify(deleted));
await cmd('undo');
check('2回目は何もしない', last().content.includes('取り消せる登録がありません'));

// === 中断・期限切れ ===
await cmd('new'); await cmd('cancel');
check('/cancel', last().content.includes('やめました'));
mark = posted.length;
r = await comp('vp:0');
check('下書きが無いボタンは期限切れ扱い', posted.slice(mark).some(p => p.content?.includes('期限切れ')), JSON.stringify(posted.slice(mark)));

// === 古いボタンを押した場合（Discord ではモーダル経由の質問にボタンが残る） ===
await cmd('new');                       // 下書きは 'company' の段階
r = await comp('hr:x');                 // 「時間の直接入力」の古いボタンを押す
check('段階が違うボタンはモーダルを開かない', r.json.type === 4 && r.json.data.content.includes('期限切れ'), JSON.stringify(r.json));
r = await comp('dl:x');
check('納期の古いボタンも同様', r.json.type === 4, JSON.stringify(r.json));
r = await tap('TAMAZEN');               // 正しい段階のボタンは通る
check('正しい段階のボタンはモーダルが開く', r.json.type === 9, JSON.stringify(r.json).slice(0,120));
await cmd('cancel');

console.log(fail === 0 ? '\n★ Discord シミュレーション全合格' : `\n★ ${fail}件 失敗`);
process.exit(fail ? 1 : 0);
