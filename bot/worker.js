/**
 * 工程図（koutei-zu）Telegram Bot — Cloudflare Worker
 *
 * チャットから工程図の案件を「登録」「確認」する。
 *   ① チャット → ② Firestore の読み書き → ③ チャットへ返答
 *
 * 特徴:
 *  - **AI（Gemini）を一切使わない**。登録はボタン対話式、確認はコマンド式。
 *    案件情報が外部AIサーバーへ送られることがない。
 *  - 選択肢は工程図のマスタ（お客様・担当者・ステップ種類）から自動生成するため、
 *    会社名・担当者名・ステップ種類IDが必ずマスタと一致する。
 *  - 登録前に必ず確認画面（[登録する]/[やめる]）を挟む。/undo で直前の登録を取り消せる。
 *
 * 使い方:
 *  1. Cloudflare の Workers > Edit code にこのファイルを丸ごと貼り付けて Deploy
 *  2. 環境変数（シークレット）と KV バインドを設定（下記 ENV / KV 参照）
 *  3. ブラウザで  https://<worker>.workers.dev/init/<WEBHOOK_SECRET>  を開く
 *     → Webhook 登録とコマンドメニュー登録が自動で行われる
 *  詳細な手順は docs/09_Telegram連携セットアップ手順.md を参照。
 *
 * ENV（すべて「シークレット」として登録）:
 *   TELEGRAM_TOKEN        BotFather で取得したトークン
 *   WEBHOOK_SECRET        任意のランダム文字列（Webhookの正当性確認に使う）
 *   MY_CHAT_ID            自分の Telegram chat id（この人以外は全て無視する）
 *   FIREBASE_API_KEY      Firebase の Web API キー（公開前提の値）
 *   FIREBASE_PROJECT_ID   koutei-zu
 *   FIRESTORE_DATABASE_ID default   ← ★ "(default)" ではない
 *   WORKSPACE_ID          liebe-asia-team
 *   BOT_EMAIL             Bot 用 Google アカウント
 *   BOT_PASSWORD          同パスワード
 *   TZ_OFFSET             任意。時差（時間）。未設定なら 9（日本）。ベトナム拠点なら 7
 *
 * KV バインド:
 *   STATE                 認証トークンのキャッシュ・登録の途中状態・直前の登録の記録
 */

// ============ 定数 ============

// 「今日」を判定する時差。日本 = 9、ベトナム = 7。ENV の TZ_OFFSET で上書きできる。
const DEFAULT_TZ_OFFSET = 9;

// 視点名の候補（ボタン）。直接入力もできる。
const VIEWPOINT_CHOICES = ['EX1', 'EX2', 'EX3', 'IN1', 'IN2', 'IN3'];

// 制作時間の候補（ボタン）。小数時間で持つ（工程図の hours と同じ単位）。
const HOUR_CHOICES = [1, 2, 3, 4, 6, 8, 12, 16];

// 途中状態の保持時間（秒）。この時間を過ぎると登録操作は破棄される。
const DRAFT_TTL = 1800;
// マスタのキャッシュ時間（秒）
const MASTER_TTL = 300;
// Telegram の1メッセージ上限（余裕を持たせる）
const MAX_MSG = 3800;

// ============ 汎用ユーティリティ ============
// ※ kanaNormalize / parseHM / fmtHM は工程図アプリ（src/lib/utils.js）と同じ実装。
//    アプリ側を変更したらこちらも合わせること。

/** 全角半角・大文字小文字を揃え、カタカナ→ひらがなに統一する（表記ゆれの吸収） */
function kanaNormalize(s) {
  if (s == null) return '';
  let r = String(s).normalize('NFKC').toLowerCase();
  r = r.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  return r;
}

/** "8:30" / "8.5" / "8" → 小数時間（8.5）。無効なら NaN */
function parseHM(str) {
  if (str == null) return NaN;
  const s = String(str).trim();
  if (s === '') return NaN;
  if (s.includes(':')) {
    const parts = s.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] === undefined || parts[1] === '' ? '0' : parts[1], 10);
    if (isNaN(h) || isNaN(m) || m < 0 || m >= 60) return NaN;
    return h + m / 60;
  }
  const v = parseFloat(s);
  return isNaN(v) ? NaN : v;
}

/** 小数時間 → "08:30" */
function fmtHM(h) {
  const v = (h == null || isNaN(h)) ? 0 : h;
  const totalMin = Math.round(Math.max(0, v) * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** 時差を考慮した「今」の Date（UTC の Date に時差を足したもの。getUTC* で読む） */
function localNow(tz) {
  return new Date(Date.now() + tz * 3600 * 1000);
}

/** Date → "YYYY-MM-DD"（getUTC* で読むので localNow と組で使う） */
function fmtYMD(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

function addDays(d, n) {
  return new Date(d.getTime() + n * 86400000);
}

/** "8/5" "2026-08-05" "8-5" → "YYYY-MM-DD"。解釈できなければ null */
function parseDateInput(text, tz) {
  const s = String(text || '').trim().replace(/[／.]/g, '/');
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return `${m[1]}-${String(+m[2]).padStart(2, '0')}-${String(+m[3]).padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const now = localNow(tz);
    const mm = +m[1];
    const dd = +m[2];
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    // 月日だけの指定は「今年」。すでに過ぎていれば来年として扱う
    let y = now.getUTCFullYear();
    const cand = `${y}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    if (cand < fmtYMD(now)) y += 1;
    return `${y}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  }
  return null;
}

/** 次の金曜（今日が金曜なら今日） */
function nextFriday(d, weeksAhead) {
  const dow = d.getUTCDay(); // 0=日
  const diff = (5 - dow + 7) % 7;
  return addDays(d, diff + weeksAhead * 7);
}

function rand5() {
  return Math.random().toString(36).slice(2, 7);
}

/** 長すぎるメッセージを切り詰める */
function clip(text) {
  if (text.length <= MAX_MSG) return text;
  return text.slice(0, MAX_MSG) + '\n…（以下省略）';
}

// ============ ステップ種類の解決（工程図 src/viewpoint/viewpointUtils.js と同じ） ============

function findStepType(master, step) {
  const list = master || [];
  if (!step) return null;
  const id = step.stepTypeId;
  if (id) {
    const byId = list.find((t) => t.id === id);
    if (byId) return byId;
  }
  const nm = (step.name || step.stepName || '').trim();
  if (nm) {
    const byName = list.find((t) => (t.label || '').trim() === nm);
    if (byName) return byName;
  }
  return null;
}

/** 例: resolveStepLabel('カラー変更（有料）', true, 1) → 'カラー変更1回目（有料）' */
function resolveStepLabel(baseLabel, numbered, n) {
  const b = (baseLabel || '').trim();
  if (!numbered) return b;
  const m = b.match(/^(.*?)(（[^（）]*）)?$/);
  const core = (m && m[1] != null) ? m[1] : b;
  const suf = (m && m[2]) || '';
  return `${core}${n}回目${suf}`;
}

function resolveDeliverySuffix(deliveryBase, deliveryNumber) {
  const base = (deliveryBase || '').trim();
  if (!base) return '';
  return deliveryNumber > 1 ? `${base}${deliveryNumber}` : base;
}

/** 視点内のステップ配列に「回数付き表示名」「納品名サフィックス」を割り当てる */
function resolveViewpointSteps(steps, master) {
  const typeCounts = {};
  const baseCounts = {};
  return (steps || []).map((s) => {
    const t = findStepType(master, s);
    if (!t) {
      return { typeId: '', label: (s && (s.name || s.stepName) || '').trim(), deliverySuffix: '', paid: true };
    }
    let n = 1;
    if (t.numbered) {
      typeCounts[t.id] = (typeCounts[t.id] || 0) + 1;
      n = typeCounts[t.id];
    }
    let bn = 0;
    if (t.deliveryBase) {
      baseCounts[t.deliveryBase] = (baseCounts[t.deliveryBase] || 0) + 1;
      bn = baseCounts[t.deliveryBase];
    }
    return {
      typeId: t.id,
      label: resolveStepLabel(t.label, t.numbered, n),
      deliverySuffix: resolveDeliverySuffix(t.deliveryBase, bn),
      paid: !!t.paid,
    };
  });
}

// ============ Telegram API ============

class Telegram {
  constructor(token) {
    this.base = `https://api.telegram.org/bot${token}`;
  }

  async call(method, payload) {
    const res = await fetch(`${this.base}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!json.ok) console.error(`Telegram ${method} 失敗:`, JSON.stringify(json));
    return json;
  }

  send(chatId, text, keyboard) {
    const payload = { chat_id: chatId, text: clip(text) };
    if (keyboard) payload.reply_markup = { inline_keyboard: keyboard };
    return this.call('sendMessage', payload);
  }

  edit(chatId, messageId, text, keyboard) {
    const payload = { chat_id: chatId, message_id: messageId, text: clip(text) };
    payload.reply_markup = keyboard ? { inline_keyboard: keyboard } : { inline_keyboard: [] };
    return this.call('editMessageText', payload);
  }

  answer(callbackId, text) {
    return this.call('answerCallbackQuery', { callback_query_id: callbackId, text: text || '' });
  }
}

/** 選択肢の配列 → インラインキーボード（1行あたり cols 個） */
function grid(items, prefix, cols) {
  const rows = [];
  for (let i = 0; i < items.length; i += cols) {
    rows.push(
      items.slice(i, i + cols).map((label, j) => ({
        text: String(label),
        callback_data: `${prefix}:${i + j}`,
      }))
    );
  }
  return rows;
}

// ============ Firestore ============

class Firestore {
  constructor(env) {
    this.env = env;
    this.pid = env.FIREBASE_PROJECT_ID;
    this.dbid = env.FIRESTORE_DATABASE_ID || 'default';
    this.wid = env.WORKSPACE_ID;
    this.root = `projects/${this.pid}/databases/${this.dbid}/documents`;
    this.base = `https://firestore.googleapis.com/v1/${this.root}`;
    this.token = null;
  }

  /** Bot アカウントでサインインして idToken を得る（KV に55分キャッシュ） */
  async auth() {
    if (this.token) return this.token;
    const cached = await this.env.STATE.get('idToken');
    if (cached) {
      this.token = cached;
      return cached;
    }
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.env.FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: this.env.BOT_EMAIL,
          password: this.env.BOT_PASSWORD,
          returnSecureToken: true,
        }),
      }
    );
    const json = await res.json();
    if (!json.idToken) {
      throw new Error(`Firebase ログイン失敗: ${json.error?.message || JSON.stringify(json)}`);
    }
    this.token = json.idToken;
    await this.env.STATE.put('idToken', json.idToken, { expirationTtl: 3300 });
    return json.idToken;
  }

  async request(url, init) {
    const token = await this.auth();
    let res = await fetch(url, {
      ...init,
      headers: { ...(init && init.headers), authorization: `Bearer ${token}` },
    });
    // トークン切れ（401/403）なら1度だけ再ログインして再試行
    if (res.status === 401 || res.status === 403) {
      this.token = null;
      await this.env.STATE.delete('idToken');
      const fresh = await this.auth();
      res = await fetch(url, {
        ...init,
        headers: { ...(init && init.headers), authorization: `Bearer ${fresh}` },
      });
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Firestore ${res.status}: ${body.slice(0, 300)}`);
    }
    return res.json();
  }

  /** data/{key}（値は JSON 文字列を value フィールドに入れた二重構造） */
  async getData(key) {
    const url = `${this.base}/workspaces/${this.wid}/data/${encodeURIComponent(key)}`;
    try {
      const doc = await this.request(url, { method: 'GET' });
      const raw = doc.fields?.value?.stringValue;
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      if (String(e.message).includes('404')) return null;
      throw e;
    }
  }

  /** 未完了タスクを取得（status == 'pending'） */
  async listPendingTasks() {
    const url = `${this.base}/workspaces/${this.wid}:runQuery`;
    const body = {
      structuredQuery: {
        from: [{ collectionId: 'tasks' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'status' },
            op: 'EQUAL',
            value: { stringValue: 'pending' },
          },
        },
      },
    };
    const rows = await this.request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const out = [];
    for (const row of rows || []) {
      if (!row.document) continue;
      out.push(fromFsFields(row.document.fields || {}));
    }
    // 制作中断（suspended）はアプリでも進行中一覧から除外されるので合わせる
    return out.filter((t) => !t.suspended);
  }

  /** タスクを一括書き込み（1案件ぶんを原子的に） */
  async commitTasks(tasks) {
    const writes = tasks.map((t) => ({
      update: {
        name: `${this.root}/workspaces/${this.wid}/tasks/${t.id}`,
        fields: toFsFields(t),
      },
    }));
    return this.request(`https://firestore.googleapis.com/v1/projects/${this.pid}/databases/${this.dbid}/documents:commit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ writes }),
    });
  }

  /** タスクを一括削除 */
  async deleteTasks(ids) {
    const writes = ids.map((id) => ({ delete: `${this.root}/workspaces/${this.wid}/tasks/${id}` }));
    return this.request(`https://firestore.googleapis.com/v1/projects/${this.pid}/databases/${this.dbid}/documents:commit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ writes }),
    });
  }
}

// --- Firestore の型付きJSON ↔ 素のJSON 変換 ---

function fromFsValue(v) {
  if (v == null) return null;
  if ('nullValue' in v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFsValue);
  if ('mapValue' in v) return fromFsFields(v.mapValue.fields || {});
  return null;
}

function fromFsFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields || {})) out[k] = fromFsValue(v);
  return out;
}

function toFsValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    if (!isFinite(v)) return { nullValue: null };
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFsValue) } };
  if (typeof v === 'object') return { mapValue: { fields: toFsFields(v) } };
  return { nullValue: null };
}

function toFsFields(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) out[k] = toFsValue(v);
  return out;
}

// ============ マスタ ============

async function loadMasters(fs, env) {
  const cached = await env.STATE.get('masters', 'json');
  if (cached) return cached;
  const [customer, employee, stepTypes] = await Promise.all([
    fs.getData('customerMaster'),
    fs.getData('employeeMaster'),
    fs.getData('stepTypeMaster'),
  ]);
  const masters = {
    companies: (Array.isArray(customer) ? customer : [])
      .map((c) => (c && c.company ? String(c.company).trim() : ''))
      .filter(Boolean),
    assignees: (Array.isArray(employee) ? employee : [])
      .map((e) => (e && e.name ? String(e.name).trim() : ''))
      .filter(Boolean),
    stepTypes: (Array.isArray(stepTypes) && stepTypes.length ? stepTypes : DEFAULT_STEP_TYPES).map((t, i) => ({
      id: (t && t.id) || `st-${i}`,
      label: (t && t.label) || '',
      paid: t && t.paid !== undefined ? !!t.paid : true,
      deliveryBase: (t && t.deliveryBase) || '',
      numbered: !!(t && t.numbered),
    })),
  };
  await env.STATE.put('masters', JSON.stringify(masters), { expirationTtl: MASTER_TTL });
  return masters;
}

// マスタが未設定のときの既定値（工程図アプリの DEFAULT_STEP_TYPES と同じ）
const DEFAULT_STEP_TYPES = [
  { id: 'white', label: 'ホワイト', paid: true, deliveryBase: '白色', numbered: false },
  { id: 'color', label: 'カラー', paid: true, deliveryBase: '色付', numbered: false },
  { id: 'person_scene', label: '人物＋添景合成', paid: true, deliveryBase: '', numbered: false },
  { id: 'white_fix', label: 'ホワイト修正（無料）', paid: false, deliveryBase: '白色', numbered: true },
  { id: 'white_change', label: 'ホワイト変更（有料）', paid: true, deliveryBase: '白色', numbered: true },
  { id: 'color_fix', label: 'カラー修正（無料）', paid: false, deliveryBase: '色付', numbered: true },
  { id: 'color_change', label: 'カラー変更（有料）', paid: true, deliveryBase: '色付', numbered: true },
];

// ============ タスクの組み立て ============

/**
 * 登録フォーム → 工程図のタスク配列（1ステップ = 1タスク）。
 * フィールド構成は工程図アプリ src/App.jsx の buildRecords と揃えること。
 */
function buildTasks(form, stepTypeMaster, tz) {
  const nowMs = Date.now();
  const today = fmtYMD(localNow(tz));
  const resolved = resolveViewpointSteps(form.steps, stepTypeMaster);
  const tasks = [];
  form.steps.forEach((s, i) => {
    const r = resolved[i] || { typeId: '', label: s.name || '', deliverySuffix: '' };
    tasks.push({
      id: `task-${nowMs}-${i}-${rand5()}`,
      projectName: form.projectName,
      projectNameInternal: '',
      companyName: form.companyName,
      customerContact: '',
      viewpointName: form.viewpointName,
      viewpointNameExternal: '',
      viewpointCategory: '',
      stepName: r.label,
      stepOrder: i,
      stepTypeId: r.typeId,
      stepDeliverySuffix: r.deliverySuffix,
      assignee: form.assignee,
      // 優先順位は末尾。アプリが読み込み時に会社ごとへ振り直す（normalizePriorities）
      priority: 99,
      // hours は「小数時間」。8時間 = 8、4時間30分 = 4.5（分ではない）
      hours: s.hours,
      completedHours: 0,
      memo: '',
      tentative: false,
      tentativeStart: null,
      tentativeEnd: null,
      deadline: null,
      projectDeadline: form.projectDeadline || null,
      projectRequestDate: today,
      manualStart: null,
      manualEnd: null,
      status: 'pending',
      completedAt: null,
      createdAt: nowMs + i,
      registeredDate: today,
      // 金額はアプリの案件フォームで入力する（オフショア案件のみ）。Bot からは空で登録する
      stepAmount: '',
      stepRequestDate: today,
      stepCompletedDate: '',
      stepDeliveryNameOverride: '',
      stepRoundType: '',
      stepOutInHouse: '',
      stepOutExternal: '',
      stepOutVND: '',
      externalId: `tg::${nowMs}::${i}`,
      createdVia: 'telegram',
    });
  });
  return tasks;
}

/** 確認画面の本文 */
function previewText(form) {
  const total = form.steps.reduce((a, s) => a + s.hours, 0);
  const lines = [
    '【この内容で登録しますか？】',
    '',
    `会社　：${form.companyName}`,
    `案件　：${form.projectName}`,
    `納期　：${form.projectDeadline || '（指定なし）'}`,
    '',
    `─ ${form.viewpointName}（担当：${form.assignee}）`,
  ];
  for (const s of form.steps) lines.push(`   ${s.name}　${fmtHM(s.hours)}`);
  lines.push('', `合計　：${fmtHM(total)}`);
  return lines.join('\n');
}

// ============ 登録ウィザード（ボタン対話式） ============

const draftKey = (chatId) => `draft:${chatId}`;
const lastKey = (chatId) => `last:${chatId}`;

async function saveDraft(env, chatId, draft) {
  await env.STATE.put(draftKey(chatId), JSON.stringify(draft), { expirationTtl: DRAFT_TTL });
}

async function loadDraft(env, chatId) {
  return env.STATE.get(draftKey(chatId), 'json');
}

async function clearDraft(env, chatId) {
  await env.STATE.delete(draftKey(chatId));
}

/** 会社を尋ねる（登録の開始） */
async function askCompany(tg, env, chatId, masters) {
  if (masters.companies.length === 0) {
    await tg.send(chatId, 'お客様マスタに会社が登録されていません。先に工程図アプリでお客様を登録してください。');
    return;
  }
  const opts = [...masters.companies, '（直接入力）'];
  const draft = { s: 'company', opts, form: { steps: [] } };
  await saveDraft(env, chatId, draft);
  await tg.send(chatId, '会社を選んでください。', grid(opts, 'co', 2));
}

async function askViewpoint(tg, env, chatId, draft) {
  const opts = [...VIEWPOINT_CHOICES, '（直接入力）'];
  draft.s = 'viewpoint';
  draft.opts = opts;
  await saveDraft(env, chatId, draft);
  await tg.send(chatId, '視点名を選んでください。', grid(opts, 'vp', 3));
}

async function askAssignee(tg, env, chatId, draft, masters) {
  const opts = [...masters.assignees, '（直接入力）'];
  draft.s = 'assignee';
  draft.opts = opts;
  await saveDraft(env, chatId, draft);
  await tg.send(chatId, '担当者を選んでください。', grid(opts, 'as', 3));
}

async function askStepType(tg, env, chatId, draft, masters) {
  const opts = masters.stepTypes.map((t) => t.label);
  draft.s = 'stepType';
  draft.opts = opts;
  await saveDraft(env, chatId, draft);
  const n = draft.form.steps.length + 1;
  await tg.send(chatId, `ステップ${n} の種類を選んでください。`, grid(opts, 'st', 2));
}

async function askHours(tg, env, chatId, draft) {
  const opts = [...HOUR_CHOICES.map((h) => `${h}h`), '（直接入力）'];
  draft.s = 'hours';
  draft.opts = opts;
  await saveDraft(env, chatId, draft);
  await tg.send(chatId, `「${draft.pendingStep.name}」の制作時間を選んでください。`, grid(opts, 'hr', 3));
}

async function askMore(tg, env, chatId, draft) {
  draft.s = 'more';
  await saveDraft(env, chatId, draft);
  const done = draft.form.steps.map((s) => `${s.name} ${fmtHM(s.hours)}`).join('\n');
  await tg.send(chatId, `現在のステップ：\n${done}\n\nステップを追加しますか？`, [
    [{ text: 'ステップを追加', callback_data: 'more:add' }],
    [{ text: '納期の入力へ進む', callback_data: 'more:next' }],
  ]);
}

async function askDeadline(tg, env, chatId, draft, tz) {
  const now = localNow(tz);
  const opts = [
    { label: `今週末（${fmtYMD(nextFriday(now, 0))}）`, value: fmtYMD(nextFriday(now, 0)) },
    { label: `来週末（${fmtYMD(nextFriday(now, 1))}）`, value: fmtYMD(nextFriday(now, 1)) },
    { label: '指定なし', value: '' },
    { label: '（直接入力）', value: null },
  ];
  draft.s = 'deadline';
  draft.opts = opts.map((o) => o.label);
  draft.deadlineValues = opts.map((o) => o.value);
  await saveDraft(env, chatId, draft);
  await tg.send(chatId, '納期を選んでください。', grid(draft.opts, 'dl', 1));
}

async function askConfirm(tg, env, chatId, draft) {
  draft.s = 'confirm';
  await saveDraft(env, chatId, draft);
  await tg.send(chatId, previewText(draft.form), [
    [
      { text: '登録する', callback_data: 'ok' },
      { text: 'やめる', callback_data: 'cancel' },
    ],
  ]);
}

// ============ 確認コマンド（読み取り） ============

/** 案件の実効納期（視点個別 ＞ 案件全体）。未設定は末尾 */
function effectiveDeadline(t) {
  return t.deadline || t.projectDeadline || '';
}

/** タスク配列 → 案件ごとの集計 */
function groupProjects(tasks) {
  const map = new Map();
  for (const t of tasks) {
    const key = `${t.companyName || ''} ${t.projectName || ''}`;
    if (!map.has(key)) {
      map.set(key, {
        companyName: t.companyName || '(会社未設定)',
        projectName: t.projectName || '(案件名なし)',
        hours: 0,
        completed: 0,
        deadline: '',
        assignees: new Set(),
        tasks: [],
      });
    }
    const p = map.get(key);
    p.hours += Number(t.hours) || 0;
    p.completed += Number(t.completedHours) || 0;
    if (t.assignee) p.assignees.add(t.assignee);
    const dl = effectiveDeadline(t);
    if (dl && (!p.deadline || dl < p.deadline)) p.deadline = dl;
    p.tasks.push(t);
  }
  return [...map.values()];
}

function cmdStatus(tasks, arg) {
  if (tasks.length === 0) return '進行中の案件はありません。';
  let projects = groupProjects(tasks);

  if (arg) {
    const q = kanaNormalize(arg);
    projects = projects.filter((p) => kanaNormalize(p.projectName).includes(q));
    if (projects.length === 0) return `「${arg}」に一致する進行中の案件は見つかりませんでした。`;
    // 該当案件は視点・ステップまで詳しく出す
    const out = [];
    for (const p of projects) {
      out.push(`■ ${p.projectName}（${p.companyName}）`);
      out.push(`　納期：${p.deadline || '未設定'}　進捗：${fmtHM(p.completed)} / ${fmtHM(p.hours)}`);
      const byVp = new Map();
      for (const t of p.tasks) {
        const k = `${t.viewpointName || ''} ${t.assignee || ''}`;
        if (!byVp.has(k)) byVp.set(k, []);
        byVp.get(k).push(t);
      }
      for (const [k, list] of byVp) {
        const [vp, as] = k.split(' ');
        list.sort((a, b) => (a.stepOrder ?? 0) - (b.stepOrder ?? 0));
        out.push(`　─ ${vp || '(視点名なし)'}（担当：${as || '未割当'}）`);
        for (const t of list) {
          const done = Number(t.completedHours) || 0;
          const h = Number(t.hours) || 0;
          out.push(`　　　${t.stepName || '(名称なし)'}　${fmtHM(done)} / ${fmtHM(h)}`);
        }
      }
      out.push('');
    }
    return out.join('\n').trimEnd();
  }

  // 一覧：会社ごとにまとめる
  projects.sort((a, b) => a.companyName.localeCompare(b.companyName) || a.projectName.localeCompare(b.projectName));
  const out = [`進行中の案件：${projects.length}件`, ''];
  let company = null;
  for (const p of projects) {
    if (p.companyName !== company) {
      company = p.companyName;
      out.push(`■ ${company}`);
    }
    const rest = Math.max(0, p.hours - p.completed);
    out.push(`　${p.projectName}　残 ${fmtHM(rest)} / ${fmtHM(p.hours)}　納期 ${p.deadline || '未設定'}`);
  }
  out.push('', '詳しく見る： /status 案件名');
  return out.join('\n');
}

function cmdDue(tasks) {
  if (tasks.length === 0) return '進行中の案件はありません。';
  const all = groupProjects(tasks);
  const projects = all.filter((p) => p.deadline);
  const none = all.filter((p) => !p.deadline);
  projects.sort((a, b) => a.deadline.localeCompare(b.deadline));
  const out = ['納期が近い順：', ''];
  for (const p of projects) {
    const rest = Math.max(0, p.hours - p.completed);
    out.push(`${p.deadline}　${p.projectName}（${p.companyName}）　残 ${fmtHM(rest)}`);
  }
  if (none.length > 0) {
    out.push('', `納期未設定：${none.length}件`);
    for (const p of none) out.push(`　${p.projectName}（${p.companyName}）`);
  }
  return out.join('\n');
}

function cmdWho(tasks, arg) {
  if (tasks.length === 0) return '進行中の案件はありません。';
  const map = new Map();
  for (const t of tasks) {
    const name = t.assignee || '未割当';
    if (!map.has(name)) map.set(name, { hours: 0, completed: 0, tasks: [] });
    const a = map.get(name);
    a.hours += Number(t.hours) || 0;
    a.completed += Number(t.completedHours) || 0;
    a.tasks.push(t);
  }

  if (arg) {
    const q = kanaNormalize(arg);
    const hit = [...map.entries()].find(([name]) => kanaNormalize(name).includes(q));
    if (!hit) return `「${arg}」に一致する担当者は見つかりませんでした。`;
    const [name, a] = hit;
    const out = [`■ ${name}　残 ${fmtHM(Math.max(0, a.hours - a.completed))}`, ''];
    const byProject = new Map();
    for (const t of a.tasks) {
      const k = `${t.projectName || ''} ${t.viewpointName || ''}`;
      if (!byProject.has(k)) byProject.set(k, { hours: 0, completed: 0, deadline: '' });
      const p = byProject.get(k);
      p.hours += Number(t.hours) || 0;
      p.completed += Number(t.completedHours) || 0;
      const dl = effectiveDeadline(t);
      if (dl && (!p.deadline || dl < p.deadline)) p.deadline = dl;
    }
    for (const [k, p] of byProject) {
      const [pn, vp] = k.split(' ');
      out.push(`${pn} / ${vp}　残 ${fmtHM(Math.max(0, p.hours - p.completed))}　納期 ${p.deadline || '未設定'}`);
    }
    return out.join('\n');
  }

  const rows = [...map.entries()].sort((a, b) => (b[1].hours - b[1].completed) - (a[1].hours - a[1].completed));
  const out = ['担当者別の残作業：', ''];
  for (const [name, a] of rows) {
    out.push(`${name}　残 ${fmtHM(Math.max(0, a.hours - a.completed))} / ${fmtHM(a.hours)}`);
  }
  out.push('', '詳しく見る： /who 担当者名');
  return out.join('\n');
}

function cmdToday(snapshot) {
  if (!snapshot) {
    return [
      '今日の予定はまだ取得できません。',
      '',
      '終了予定や当日の作業予定は、工程図アプリが計算した結果を保存する仕組み',
      '（予定メモ）が必要です。まだアプリ側に未実装のため、この機能は使えません。',
      '',
      '現在使えるのは /status /due /who です。',
    ].join('\n');
  }
  const at = snapshot.generatedAt ? new Date(snapshot.generatedAt).toISOString().slice(0, 16).replace('T', ' ') : '不明';
  const rows = snapshot.today || [];
  if (rows.length === 0) return `今日の予定はありません。（${at} 時点）`;
  const out = [`今日の予定（${at} 時点）：`, ''];
  for (const r of rows) {
    out.push(`${r.from}-${r.to}　${r.assignee}　${r.projectName} / ${r.viewpointName} / ${r.stepName}`);
  }
  if (snapshot.staleSince) {
    out.push('', '※ この後に登録された案件は、まだ予定に反映されていません（アプリを開くと再計算されます）。');
  }
  return out.join('\n');
}

const HELP = [
  '工程図 Bot の使い方',
  '',
  '■ 登録',
  '/new … 案件を登録（ボタンで選んでいくだけ）',
  '/undo … 直前の登録を取り消し',
  '',
  '■ 確認',
  '/status … 進行中の案件一覧',
  '/status 案件名 … その案件の詳細',
  '/due … 納期が近い順',
  '/who … 担当者別の残作業',
  '/who 担当者名 … その人の内訳',
  '/today … 今日の予定',
  '',
  '■ その他',
  '/cancel … 入力中の操作をやめる',
  '/help … この画面',
  '',
  '日本語のコマンド（/案件 /状況 /納期 /担当 /今日 /取消 /ヘルプ）も使えます。',
].join('\n');

// ============ ルーティング ============

/** 受け取ったテキスト → [コマンド, 引数] */
function parseCommand(text) {
  const t = String(text || '').trim();
  if (!t.startsWith('/')) return [null, ''];
  const sp = t.indexOf(' ');
  const head = (sp === -1 ? t : t.slice(0, sp)).slice(1);
  const arg = sp === -1 ? '' : t.slice(sp + 1).trim();
  // @BotName 付き（グループでの呼び出し）を除去
  const cmd = head.split('@')[0];
  const alias = {
    案件: 'new', 登録: 'new', 状況: 'status', 一覧: 'status', 納期: 'due',
    担当: 'who', 今日: 'today', 取消: 'undo', ヘルプ: 'help', 中止: 'cancel',
  };
  return [alias[cmd] || cmd.toLowerCase(), arg];
}

async function handleText(ctx, text) {
  const { tg, env, fs, chatId, tz } = ctx;
  const [cmd, arg] = parseCommand(text);

  // --- コマンド ---
  if (cmd) {
    if (cmd === 'cancel') {
      await clearDraft(env, chatId);
      await tg.send(chatId, '入力中の操作をやめました。');
      return;
    }
    if (cmd === 'help' || cmd === 'start') {
      await tg.send(chatId, HELP);
      return;
    }
    if (cmd === 'new') {
      const masters = await loadMasters(fs, env);
      await askCompany(tg, env, chatId, masters);
      return;
    }
    if (cmd === 'undo') {
      const last = await env.STATE.get(lastKey(chatId), 'json');
      if (!last || !last.ids || last.ids.length === 0) {
        await tg.send(chatId, '取り消せる登録がありません。');
        return;
      }
      await fs.deleteTasks(last.ids);
      await env.STATE.delete(lastKey(chatId));
      await tg.send(chatId, `「${last.label}」の登録を取り消しました（${last.ids.length}件）。`);
      return;
    }
    if (cmd === 'status' || cmd === 'due' || cmd === 'who') {
      const tasks = await fs.listPendingTasks();
      if (cmd === 'status') await tg.send(chatId, cmdStatus(tasks, arg));
      else if (cmd === 'due') await tg.send(chatId, cmdDue(tasks));
      else await tg.send(chatId, cmdWho(tasks, arg));
      return;
    }
    if (cmd === 'today') {
      const snapshot = await fs.getData('botSnapshot');
      await tg.send(chatId, cmdToday(snapshot));
      return;
    }
    await tg.send(chatId, `「/${cmd}」は分かりませんでした。\n\n${HELP}`);
    return;
  }

  // --- 入力待ち（直接入力）の受け取り ---
  const draft = await loadDraft(env, chatId);
  if (!draft || !draft.await) {
    await tg.send(chatId, HELP);
    return;
  }
  const masters = await loadMasters(fs, env);
  const value = text.trim();

  if (draft.await === 'company') {
    draft.form.companyName = value;
    draft.s = 'project';
    draft.await = 'project';
    await saveDraft(env, chatId, draft);
    await tg.send(chatId, '案件名を入力してください。');
    return;
  }
  if (draft.await === 'project') {
    draft.form.projectName = value;
    draft.await = null;
    await askViewpoint(tg, env, chatId, draft);
    return;
  }
  if (draft.await === 'viewpoint') {
    draft.form.viewpointName = value;
    draft.await = null;
    await askAssignee(tg, env, chatId, draft, masters);
    return;
  }
  if (draft.await === 'assignee') {
    draft.form.assignee = value;
    draft.await = null;
    await askStepType(tg, env, chatId, draft, masters);
    return;
  }
  if (draft.await === 'hours') {
    const h = parseHM(value);
    if (isNaN(h) || h <= 0) {
      await tg.send(chatId, '時間の書き方が分かりませんでした。「8」「8:30」「4.5」のように入力してください。');
      return;
    }
    draft.form.steps.push({ ...draft.pendingStep, hours: h });
    draft.pendingStep = null;
    draft.await = null;
    await askMore(tg, env, chatId, draft);
    return;
  }
  if (draft.await === 'deadline') {
    const d = parseDateInput(value, tz);
    if (!d) {
      await tg.send(chatId, '日付の書き方が分かりませんでした。「8/5」「2026-08-05」のように入力してください。');
      return;
    }
    draft.form.projectDeadline = d;
    draft.await = null;
    await askConfirm(tg, env, chatId, draft);
    return;
  }
}

async function handleCallback(ctx, cb) {
  const { tg, env, fs, chatId, tz } = ctx;
  const data = String(cb.data || '');
  const messageId = cb.message?.message_id;
  await tg.answer(cb.id);

  const draft = await loadDraft(env, chatId);
  if (!draft) {
    if (messageId) await tg.edit(chatId, messageId, '（この操作は期限切れです。/new からやり直してください）');
    return;
  }
  const masters = await loadMasters(fs, env);
  const [kind, rawIdx] = data.split(':');
  const idx = Number(rawIdx);
  const pick = (arr) => (Number.isInteger(idx) && idx >= 0 && idx < arr.length ? arr[idx] : null);

  // 選んだ内容を元のメッセージに反映してボタンを消す（履歴が読みやすくなる）
  const settle = async (label) => {
    if (messageId) await tg.edit(chatId, messageId, label, null);
  };

  if (kind === 'co' && draft.s === 'company') {
    const v = pick(draft.opts);
    if (v === null) return;
    if (v === '（直接入力）') {
      await settle('会社：（直接入力）');
      draft.await = 'company';
      await saveDraft(env, chatId, draft);
      await tg.send(chatId, '会社名を入力してください。');
      return;
    }
    await settle(`会社：${v}`);
    draft.form.companyName = v;
    draft.s = 'project';
    draft.await = 'project';
    await saveDraft(env, chatId, draft);
    await tg.send(chatId, '案件名を入力してください。');
    return;
  }

  if (kind === 'vp' && draft.s === 'viewpoint') {
    const v = pick(draft.opts);
    if (v === null) return;
    if (v === '（直接入力）') {
      await settle('視点：（直接入力）');
      draft.await = 'viewpoint';
      await saveDraft(env, chatId, draft);
      await tg.send(chatId, '視点名を入力してください。');
      return;
    }
    await settle(`視点：${v}`);
    draft.form.viewpointName = v;
    await askAssignee(tg, env, chatId, draft, masters);
    return;
  }

  if (kind === 'as' && draft.s === 'assignee') {
    const v = pick(draft.opts);
    if (v === null) return;
    if (v === '（直接入力）') {
      await settle('担当：（直接入力）');
      draft.await = 'assignee';
      await saveDraft(env, chatId, draft);
      await tg.send(chatId, '担当者名を入力してください。');
      return;
    }
    await settle(`担当：${v}`);
    draft.form.assignee = v;
    await askStepType(tg, env, chatId, draft, masters);
    return;
  }

  if (kind === 'st' && draft.s === 'stepType') {
    const v = pick(draft.opts);
    if (v === null) return;
    // マスタが更新されてボタンとずれた場合に備え、名称でも引き直す
    const type = masters.stepTypes[idx] && masters.stepTypes[idx].label === v
      ? masters.stepTypes[idx]
      : masters.stepTypes.find((t) => t.label === v);
    if (!type) {
      await settle('ステップ種類が変更されたようです。/new からやり直してください。');
      await clearDraft(env, chatId);
      return;
    }
    await settle(`ステップ：${v}`);
    // 表示名は登録時に resolveViewpointSteps が回数付きへ解決するため、ここでは素の種類を持つ
    draft.pendingStep = { stepTypeId: type.id, name: type.label };
    await askHours(tg, env, chatId, draft);
    return;
  }

  if (kind === 'hr' && draft.s === 'hours') {
    const v = pick(draft.opts);
    if (v === null) return;
    if (v === '（直接入力）') {
      await settle('時間：（直接入力）');
      draft.await = 'hours';
      await saveDraft(env, chatId, draft);
      await tg.send(chatId, '制作時間を入力してください。（例：8 / 8:30 / 4.5）');
      return;
    }
    const h = HOUR_CHOICES[idx];
    if (!h || !draft.pendingStep) {
      await settle('操作が期限切れです。/new からやり直してください。');
      await clearDraft(env, chatId);
      return;
    }
    await settle(`時間：${fmtHM(h)}`);
    draft.form.steps.push({ ...draft.pendingStep, hours: h });
    draft.pendingStep = null;
    await askMore(tg, env, chatId, draft);
    return;
  }

  if (kind === 'more' && draft.s === 'more') {
    if (rawIdx === 'add') {
      await settle('ステップを追加します');
      await askStepType(tg, env, chatId, draft, masters);
      return;
    }
    await settle('納期の入力へ進みます');
    await askDeadline(tg, env, chatId, draft, tz);
    return;
  }

  if (kind === 'dl' && draft.s === 'deadline') {
    const label = pick(draft.opts);
    if (label === null || !draft.deadlineValues) return;
    const v = draft.deadlineValues[idx];
    if (v === null || v === undefined) {
      await settle('納期：（直接入力）');
      draft.await = 'deadline';
      await saveDraft(env, chatId, draft);
      await tg.send(chatId, '納期を入力してください。（例：8/5 / 2026-08-05）');
      return;
    }
    await settle(`納期：${v || '指定なし'}`);
    draft.form.projectDeadline = v;
    await askConfirm(tg, env, chatId, draft);
    return;
  }

  if (kind === 'cancel') {
    await settle('登録をやめました。');
    await clearDraft(env, chatId);
    return;
  }

  if (kind === 'ok' && draft.s === 'confirm') {
    const form = draft.form;
    if (!form.steps || form.steps.length === 0) {
      await settle('ステップが1件もないため登録できませんでした。');
      await clearDraft(env, chatId);
      return;
    }
    await settle(previewText(form) + '\n\n登録中…');
    const tasks = buildTasks(form, masters.stepTypes, tz);
    try {
      await fs.commitTasks(tasks);
    } catch (e) {
      // 書き込みに失敗した場合は確認画面を出し直す（入力内容を捨てない）
      await tg.send(chatId, `登録に失敗しました：\n${String(e.message || e)}`);
      await askConfirm(tg, env, chatId, draft);
      return;
    }
    await clearDraft(env, chatId);
    const label = `${form.projectName} / ${form.viewpointName}`;
    await env.STATE.put(
      lastKey(chatId),
      JSON.stringify({ ids: tasks.map((t) => t.id), label }),
      { expirationTtl: 86400 }
    );
    const total = form.steps.reduce((a, s) => a + s.hours, 0);
    await tg.send(
      chatId,
      [
        `登録しました：${label}（${tasks.length}ステップ・合計 ${fmtHM(total)}）`,
        '',
        'PCで工程図アプリを開いていれば、数秒で画面に反映されます。',
        '作業予定（何日の何時にやるか）の計算は、アプリを開いたときに行われます。',
        '',
        '取り消す場合は /undo',
      ].join('\n')
    );
    return;
  }

  // 想定外の組み合わせ（古いメッセージのボタンを押した等）
  if (messageId) await tg.edit(chatId, messageId, '（この操作は期限切れです。/new からやり直してください）');
}

// ============ エントリポイント ============

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- 初期設定：Webhook とコマンドメニューを登録する ---
    if (url.pathname === `/init/${env.WEBHOOK_SECRET}`) {
      const tg = new Telegram(env.TELEGRAM_TOKEN);
      const hook = await tg.call('setWebhook', {
        url: `${url.origin}/telegram`,
        secret_token: env.WEBHOOK_SECRET,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true,
      });
      const cmds = await tg.call('setMyCommands', {
        commands: [
          { command: 'new', description: '案件を登録する' },
          { command: 'status', description: '進行中の案件（/status 案件名 で詳細）' },
          { command: 'due', description: '納期が近い順' },
          { command: 'who', description: '担当者別の残作業' },
          { command: 'today', description: '今日の予定' },
          { command: 'undo', description: '直前の登録を取り消す' },
          { command: 'cancel', description: '入力中の操作をやめる' },
          { command: 'help', description: '使い方' },
        ],
      });
      return Response.json({ setWebhook: hook, setMyCommands: cmds });
    }

    // --- 確認メールの送信：Bot アカウントの email_verified を true にするため ---
    // Firestore ルールが email_verified == true を要求するため、初回だけこれを実行し、
    // Bot 用アドレスの受信箱に届いたリンクを開く必要がある。
    if (url.pathname === `/verify/${env.WEBHOOK_SECRET}`) {
      try {
        const fs = new Firestore(env);
        const token = await fs.auth();
        const res = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${env.FIREBASE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: token }),
          }
        );
        const json = await res.json();
        if (json.error) throw new Error(json.error.message);
        return Response.json({
          ok: true,
          宛先: json.email || env.BOT_EMAIL,
          次にすること: 'このアドレスの受信箱を開き、Firebase からの確認メールのリンクをクリックしてください。その後 /test/<WEBHOOK_SECRET> で確認できます。',
        });
      } catch (e) {
        return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
      }
    }

    // --- 接続テスト：ログイン・メール確認・メンバー登録・読み取りを順に確かめる ---
    if (url.pathname === `/test/${env.WEBHOOK_SECRET}`) {
      const result = { ok: false,手順: {} };
      try {
        const fs = new Firestore(env);
        const token = await fs.auth();
        result.手順['1_ログイン'] = 'OK';

        const look = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ idToken: token }),
          }
        ).then((r) => r.json());
        const verified = !!look.users?.[0]?.emailVerified;
        result.手順['2_メール確認済み'] = verified ? 'OK' : 'まだです';
        if (!verified) {
          result.error = 'Bot アカウントのメール確認が済んでいません。/verify/<WEBHOOK_SECRET> を開いて確認メールを送り、リンクをクリックしてください。';
          return Response.json(result, { status: 400 });
        }

        const masters = await loadMasters(fs, env);
        result.手順['3_マスタの読み取り'] = 'OK';
        const tasks = await fs.listPendingTasks();
        result.手順['4_タスクの読み取り'] = 'OK';
        result.ok = true;
        result.会社数 = masters.companies.length;
        result.担当者数 = masters.assignees.length;
        result.ステップ種類数 = masters.stepTypes.length;
        result.進行中タスク数 = tasks.length;
        return Response.json(result);
      } catch (e) {
        const msg = String(e.message || e);
        result.error = msg;
        if (msg.includes('ログイン失敗')) result.対処 = 'BOT_EMAIL / BOT_PASSWORD を確認してください。';
        else if (msg.includes('403')) result.対処 = 'Bot のアドレスを工程図アプリの「メンバー管理」に追加してください。';
        else if (msg.includes('404')) result.対処 = 'FIREBASE_PROJECT_ID / FIRESTORE_DATABASE_ID / WORKSPACE_ID を確認してください。';
        return Response.json(result, { status: 500 });
      }
    }

    if (url.pathname !== '/telegram' || request.method !== 'POST') {
      return new Response('koutei-zu telegram bot', { status: 200 });
    }

    // Webhook の正当性確認（Telegram 以外からの呼び出しを弾く）
    if (request.headers.get('x-telegram-bot-api-secret-token') !== env.WEBHOOK_SECRET) {
      return new Response('forbidden', { status: 403 });
    }

    const update = await request.json().catch(() => null);
    if (!update) return new Response('ok');

    const message = update.message;
    const callback = update.callback_query;
    const chatId = String(message?.chat?.id || callback?.message?.chat?.id || '');

    // 本人以外は完全に無視する
    if (!chatId || chatId !== String(env.MY_CHAT_ID)) return new Response('ok');

    const tg = new Telegram(env.TELEGRAM_TOKEN);
    const ctx = {
      tg,
      env,
      fs: new Firestore(env),
      chatId,
      tz: env.TZ_OFFSET ? Number(env.TZ_OFFSET) : DEFAULT_TZ_OFFSET,
    };

    try {
      if (callback) await handleCallback(ctx, callback);
      else if (message?.text) await handleText(ctx, message.text);
      else if (message) await tg.send(chatId, 'テキストかボタン操作でお願いします。\n\n' + HELP);
    } catch (e) {
      console.error(e);
      const msg = String(e.message || e);
      let hint = '';
      if (msg.includes('ログイン失敗')) hint = '\n\n→ BOT_EMAIL / BOT_PASSWORD を確認してください。';
      else if (msg.includes('403')) hint = '\n\n→ Bot のアドレスが工程図の「メンバー管理」に登録されているか、メール確認が済んでいるかを確認してください。';
      else if (msg.includes('404')) hint = '\n\n→ FIREBASE_PROJECT_ID / FIRESTORE_DATABASE_ID / WORKSPACE_ID を確認してください。';
      await tg.send(chatId, `エラーが発生しました：\n${msg}${hint}`).catch(() => {});
    }

    // Telegram には常に 200 を返す（再送ループを防ぐ）
    return new Response('ok');
  },
};
