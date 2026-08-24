// Telegram / Firestore / KV をすべてモックして、登録ウィザードを最初から最後まで通す
import worker from './.worker.mjs';

const kv = new Map();
const STATE = {
  async get(k, type) { const v = kv.get(k); if (v === undefined) return null; return type === 'json' ? JSON.parse(v) : v; },
  async put(k, v) { kv.set(k, v); },
  async delete(k) { kv.delete(k); },
};
const env = {
  TELEGRAM_TOKEN: 'TT', WEBHOOK_SECRET: 'SEC', MY_CHAT_ID: '8991512381',
  FIREBASE_API_KEY: 'AK', FIREBASE_PROJECT_ID: 'koutei-zu', FIRESTORE_DATABASE_ID: 'default',
  WORKSPACE_ID: 'liebe-asia-team', BOT_EMAIL: 'bot@x', BOT_PASSWORD: 'p', TZ_OFFSET: '9', STATE,
};

const sent = [];      // Bot が送った/編集したメッセージ
let committed = null; // Firestore に書かれた内容
let deleted = null;
let msgSeq = 100;

globalThis.fetch = async (url, init) => {
  const u = String(url);
  const body = init?.body ? JSON.parse(init.body) : {};
  const J = (o) => new Response(JSON.stringify(o), { headers: { 'content-type': 'application/json' } });

  if (u.includes('api.telegram.org')) {
    const method = u.split('/').pop();
    if (method === 'sendMessage') { sent.push({ t: 'send', id: ++msgSeq, text: body.text, kb: body.reply_markup?.inline_keyboard }); return J({ ok: true, result: { message_id: msgSeq } }); }
    if (method === 'editMessageText') { sent.push({ t: 'edit', id: body.message_id, text: body.text }); return J({ ok: true }); }
    return J({ ok: true });
  }
  if (u.includes('identitytoolkit')) return J({ idToken: 'TOKEN' });
  if (u.includes('customerMaster')) return J({ fields: { value: { stringValue: JSON.stringify([{ company: 'TAMAZEN' }, { company: 'SUMUS' }]) } } });
  if (u.includes('employeeMaster')) return J({ fields: { value: { stringValue: JSON.stringify([{ name: 'ヤマダ' }, { name: 'タナカ' }]) } } });
  if (u.includes('stepTypeMaster')) return J({ fields: { value: { stringValue: JSON.stringify(null) } } });
  if (u.includes('botSnapshot')) return new Response('not found', { status: 404 });
  if (u.includes(':runQuery')) return J([{ document: { fields: { projectName: { stringValue: 'A棟' }, companyName: { stringValue: 'TAMAZEN' }, viewpointName: { stringValue: 'EX1' }, assignee: { stringValue: 'ヤマダ' }, stepName: { stringValue: 'ホワイト' }, stepOrder: { integerValue: '0' }, hours: { integerValue: '8' }, completedHours: { doubleValue: 2.5 }, projectDeadline: { stringValue: '2026-08-05' }, deadline: { nullValue: null }, status: { stringValue: 'pending' } } } }]);
  if (u.includes(':commit')) {
    if (body.writes?.[0]?.delete) { deleted = body.writes.map(w => w.delete); return J({}); }
    committed = body.writes; return J({});
  }
  throw new Error('未対応のURL: ' + u);
};

const post = (update) => worker.fetch(new Request('https://w.dev/telegram', {
  method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 'SEC', 'content-type': 'application/json' },
  body: JSON.stringify(update),
}), env);

const chat = { id: 8991512381 };
const text = (t) => post({ message: { chat, text: t } });
const last = () => sent[sent.length - 1];
const tap = (label) => {
  // 直近のキーボードから label に一致するボタンを押す
  for (let i = sent.length - 1; i >= 0; i--) {
    const m = sent[i];
    if (m.t === 'send' && m.kb) {
      const btn = m.kb.flat().find(b => b.text === label);
      if (btn) return post({ callback_query: { id: 'cb', data: btn.callback_data, message: { message_id: m.id, chat } } });
      throw new Error(`ボタン「${label}」が見つかりません。候補: ${m.kb.flat().map(b => b.text).join(' / ')}`);
    }
  }
  throw new Error('キーボードがありません');
};

let fail = 0;
const check = (name, cond, extra) => { if (cond) console.log(`✓ ${name}`); else { console.log(`✗ ${name}${extra ? ' — ' + extra : ''}`); fail++; } };

// === 他人からのメッセージは無視される ===
await post({ message: { chat: { id: 999 }, text: '/status' } });
check('他人のチャットは無視', sent.length === 0);

// === Webhook シークレット不一致は 403 ===
const bad = await worker.fetch(new Request('https://w.dev/telegram', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 'WRONG' }, body: '{}' }), env);
check('シークレット不一致は403', bad.status === 403);

// === 読み取りコマンド ===
await text('/status');
check('/status が返る', last().text.includes('A棟'), last().text);
await text('/状況 A棟');
check('/状況 案件名（日本語alias）', last().text.includes('EX1') && last().text.includes('02:30 / 08:00'), last().text);
await text('/due');  check('/due', last().text.includes('2026-08-05'));
await text('/who');   check('/who', last().text.includes('ヤマダ'));
await text('/today'); check('/today は未実装を案内', last().text.includes('まだ取得できません'));
await text('/help');  check('/help', last().text.includes('工程図 Bot の使い方'));
await text('/zzz');   check('未知コマンド', last().text.includes('分かりませんでした'));

// === 登録ウィザード（全部ボタン） ===
sent.length = 0;
await text('/new');
check('会社の選択肢が出る', last().kb.flat().map(b => b.text).join(',').includes('TAMAZEN'), JSON.stringify(last().kb));
await tap('TAMAZEN');
check('案件名の入力を促す', last().text.includes('案件名'), last().text);
await text('A棟');
check('視点の選択肢', last().kb.flat().some(b => b.text === 'EX1'));
await tap('EX1');
check('担当者の選択肢', last().kb.flat().some(b => b.text === 'ヤマダ'));
await tap('ヤマダ');
check('ステップ種類の選択肢', last().kb.flat().some(b => b.text === 'ホワイト'));
await tap('ホワイト');
check('時間の選択肢', last().kb.flat().some(b => b.text === '8h'));
await tap('8h');
check('ステップ追加の確認', last().text.includes('ステップを追加しますか'), last().text);
await tap('ステップを追加');
await tap('カラー');
check('2ステップ目は直接入力もできる', last().kb.flat().some(b => b.text === '（直接入力）'));
await tap('（直接入力）');
await text('4:30');
check('直接入力の時間が反映', last().text.includes('カラー 04:30'), last().text);
await tap('納期の入力へ進む');
check('納期の選択肢', last().kb.flat().some(b => b.text.includes('今週末')), JSON.stringify(last().kb.flat().map(b=>b.text)));
await tap('（直接入力）');
await text('2026-12-05');
check('確認画面が出る', last().text.includes('この内容で登録しますか'), last().text);
check('納期が確認画面に出る', last().text.includes('2026-12-05'), last().text);
console.log('\n--- 確認画面 ---\n' + last().text + '\n');
await tap('登録する');

// === 書き込み内容の検証 ===
check('Firestore に書き込まれた', committed && committed.length === 2, JSON.stringify(committed?.length));
const docs = committed.map(w => Object.fromEntries(Object.entries(w.update.fields).map(([k, v]) => [k, Object.values(v)[0]])));
check('会社名', docs.every(d => d.companyName === 'TAMAZEN'));
check('案件名', docs.every(d => d.projectName === 'A棟'));
check('視点名', docs.every(d => d.viewpointName === 'EX1'));
check('担当者', docs.every(d => d.assignee === 'ヤマダ'));
check('納期', docs.every(d => d.projectDeadline === '2026-12-05'), JSON.stringify(docs.map(d=>d.projectDeadline)));
check('hours は小数時間(8, 4.5)', docs.map(d => Number(d.hours)).join(',') === '8,4.5', docs.map(d=>d.hours).join(','));
check('stepTypeId', docs.map(d => d.stepTypeId).join(',') === 'white,color');
check('納品名サフィックス', docs.map(d => d.stepDeliverySuffix).join(',') === '白色,色付');
check('stepOrder', docs.map(d => Number(d.stepOrder)).join(',') === '0,1');
check('priority=99', docs.every(d => Number(d.priority) === 99));
check('status=pending', docs.every(d => d.status === 'pending'));
check('書き込み先パス', committed[0].update.name.includes('/databases/default/documents/workspaces/liebe-asia-team/tasks/'), committed[0].update.name);
check('完了メッセージ', last().text.includes('登録しました'), last().text);

// === 取り消し ===
await text('/undo');
check('/undo で2件削除', deleted && deleted.length === 2, JSON.stringify(deleted));
await text('/undo');
check('2回目の/undoは何もしない', last().text.includes('取り消せる登録がありません'));

// === 中断 ===
await text('/new'); await tap('SUMUS');
await text('/cancel');
check('/cancel で中断', last().text.includes('やめました'));
await text('こんにちは');
check('中断後はヘルプ', last().text.includes('使い方'));

console.log(fail === 0 ? '\n★ シミュレーション全合格' : `\n★ ${fail}件 失敗`);
process.exit(fail ? 1 : 0);
