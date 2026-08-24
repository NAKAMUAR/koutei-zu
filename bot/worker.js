/**
 * 工程図（koutei-zu）チャット Bot — Cloudflare Worker
 *
 * チャットから工程図の案件を「登録」「確認」する。
 *   ① チャット → ② Firestore の読み書き → ③ チャットへ返答
 *
 * **Telegram と Discord の両方に対応**（どちらか片方だけでも、両方同時でも使える）。
 * 工程図に関わるロジック（Firestore・タスク組み立て・集計・ウィザードの進行）は共通で、
 * 「チャットアプリごとの違い」は最後のアダプタ層だけに閉じ込めてある。
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
 *  3. ブラウザで疎通確認 →  /test/<WEBHOOK_SECRET>
 *  4. 使うチャットアプリごとに初期設定:
 *       Telegram →  /init/<WEBHOOK_SECRET>
 *       Discord  →  /discord-init/<WEBHOOK_SECRET>
 *  詳細な手順は docs/09_Telegram連携セットアップ手順.md /
 *                docs/10_Discord連携セットアップ手順.md を参照。
 *
 * ENV（すべて「シークレット」として登録）:
 *   ── 共通 ──
 *   WEBHOOK_SECRET        任意のランダム文字列（設定用URLの保護に使う。英数字と _ - のみ）
 *   FIREBASE_API_KEY      Firebase の Web API キー（公開前提の値）
 *   FIREBASE_PROJECT_ID   koutei-zu
 *   FIRESTORE_DATABASE_ID default   ← ★ "(default)" ではない
 *   WORKSPACE_ID          liebe-asia-team
 *   BOT_EMAIL             Bot 用 Google アカウント
 *   BOT_PASSWORD          同パスワード
 *   TZ_OFFSET             任意。時差（時間）。未設定なら 9（日本）。ベトナム拠点なら 7
 *   ── Telegram を使う場合 ──
 *   TELEGRAM_TOKEN        BotFather で取得したトークン
 *   MY_CHAT_ID            自分の Telegram chat id（この人以外は全て無視する）
 *   ── Discord を使う場合 ──
 *   DISCORD_APP_ID        アプリケーションID
 *   DISCORD_PUBLIC_KEY    公開鍵（署名の検証に使う）
 *   DISCORD_BOT_TOKEN     Bot トークン（スラッシュコマンドの登録に使う）
 *   DISCORD_USER_ID       自分の Discord ユーザーID（この人以外は全て無視する）
 *   DISCORD_GUILD_ID      任意。指定するとそのサーバーにコマンドを即時登録できる
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

// 「自分で入力する」を表す選択肢のラベルと、内部で使う値
const INPUT_LABEL = '（直接入力）';
const INPUT_VALUE = 'x';

// 途中状態の保持時間（秒）。この時間を過ぎると登録操作は破棄される。
const DRAFT_TTL = 1800;
// マスタのキャッシュ時間（秒）
const MASTER_TTL = 300;

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

/** 長い本文を、行の区切りを保ったまま limit 文字以下のかたまりに分ける */
function splitMessage(text, limit) {
  const lines = String(text).split('\n');
  const out = [];
  let buf = '';
  for (const line of lines) {
    const piece = line.length > limit ? line.slice(0, limit) : line;
    if (buf && buf.length + 1 + piece.length > limit) {
      out.push(buf);
      buf = piece;
    } else {
      buf = buf ? `${buf}\n${piece}` : piece;
    }
  }
  if (buf) out.push(buf);
  return out.length ? out : [''];
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
    return this.commit(writes);
  }

  /** タスクを一括削除 */
  async deleteTasks(ids) {
    return this.commit(ids.map((id) => ({ delete: `${this.root}/workspaces/${this.wid}/tasks/${id}` })));
  }

  commit(writes) {
    const url = `https://firestore.googleapis.com/v1/projects/${this.pid}/databases/${this.dbid}/documents:commit`;
    return this.request(url, {
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

// ============ タスクの組み立て ============

/**
 * 登録フォーム → 工程図のタスク配列（1ステップ = 1タスク）。
 * フィールド構成は工程図アプリ src/App.jsx の buildRecords と揃えること。
 */
function buildTasks(form, stepTypeMaster, tz) {
  const nowMs = Date.now();
  const today = fmtYMD(localNow(tz));
  const via = form.via || 'telegram';
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
      externalId: `${via === 'discord' ? 'dc' : 'tg'}::${nowMs}::${i}`,
      createdVia: via,
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

// ============ 登録の途中状態（KV） ============

const draftKey = (key) => `draft:${key}`;
const lastKey = (key) => `last:${key}`;

async function saveDraft(env, key, draft) {
  await env.STATE.put(draftKey(key), JSON.stringify(draft), { expirationTtl: DRAFT_TTL });
}

async function loadDraft(env, key) {
  return env.STATE.get(draftKey(key), 'json');
}

async function clearDraft(env, key) {
  await env.STATE.delete(draftKey(key));
}

// ============ 登録ウィザード（プラットフォーム非依存） ============
//
// ctx = { ui, env, key, tz, fs, masters }
//   ui … チャットアプリごとのアダプタ。ask / say / settle / promptText を持つ
//   key … 会話の識別子（Telegram は "tg:<chatId>"、Discord は "dc:<userId>"）
//
// 選択肢は opts（表示ラベルの配列）で表し、押された値は
//   - 通常の選択肢 … 配列の添字（"0" "1" …）
//   - 「（直接入力）」 … INPUT_VALUE（"x"）
// で返ってくる。この取り決めは Telegram / Discord で共通。

async function askCompany(ctx, draft) {
  if (ctx.masters.companies.length === 0) {
    await ctx.ui.say('お客様マスタに会社が登録されていません。先に工程図アプリでお客様を登録してください。');
    return;
  }
  const opts = [...ctx.masters.companies, INPUT_LABEL];
  draft.s = 'company';
  draft.opts = opts;
  await saveDraft(ctx.env, ctx.key, draft);
  await ctx.ui.ask('会社を選んでください。', opts, 'co', 2);
}

async function askViewpoint(ctx, draft) {
  const opts = [...VIEWPOINT_CHOICES, INPUT_LABEL];
  draft.s = 'viewpoint';
  draft.opts = opts;
  await saveDraft(ctx.env, ctx.key, draft);
  await ctx.ui.ask('視点名を選んでください。', opts, 'vp', 3);
}

async function askAssignee(ctx, draft) {
  const opts = [...ctx.masters.assignees, INPUT_LABEL];
  draft.s = 'assignee';
  draft.opts = opts;
  await saveDraft(ctx.env, ctx.key, draft);
  await ctx.ui.ask('担当者を選んでください。', opts, 'as', 3);
}

async function askStepType(ctx, draft) {
  const opts = ctx.masters.stepTypes.map((t) => t.label);
  draft.s = 'stepType';
  draft.opts = opts;
  await saveDraft(ctx.env, ctx.key, draft);
  const n = draft.form.steps.length + 1;
  await ctx.ui.ask(`ステップ${n} の種類を選んでください。`, opts, 'st', 2);
}

async function askHours(ctx, draft) {
  const opts = [...HOUR_CHOICES.map((h) => `${h}h`), INPUT_LABEL];
  draft.s = 'hours';
  draft.opts = opts;
  await saveDraft(ctx.env, ctx.key, draft);
  await ctx.ui.ask(`「${draft.pendingStep.name}」の制作時間を選んでください。`, opts, 'hr', 3);
}

async function askMore(ctx, draft) {
  const opts = ['ステップを追加', '納期の入力へ進む'];
  draft.s = 'more';
  draft.opts = opts;
  await saveDraft(ctx.env, ctx.key, draft);
  const done = draft.form.steps.map((s) => `${s.name} ${fmtHM(s.hours)}`).join('\n');
  await ctx.ui.ask(`現在のステップ：\n${done}\n\nステップを追加しますか？`, opts, 'more', 1);
}

async function askDeadline(ctx, draft) {
  const now = localNow(ctx.tz);
  const rows = [
    { label: `今週末（${fmtYMD(nextFriday(now, 0))}）`, value: fmtYMD(nextFriday(now, 0)) },
    { label: `来週末（${fmtYMD(nextFriday(now, 1))}）`, value: fmtYMD(nextFriday(now, 1)) },
    { label: '指定なし', value: '' },
    { label: INPUT_LABEL, value: null },
  ];
  draft.s = 'deadline';
  draft.opts = rows.map((o) => o.label);
  draft.deadlineValues = rows.map((o) => o.value);
  await saveDraft(ctx.env, ctx.key, draft);
  await ctx.ui.ask('納期を選んでください。', draft.opts, 'dl', 1);
}

async function askConfirm(ctx, draft) {
  const opts = ['登録する', 'やめる'];
  draft.s = 'confirm';
  draft.opts = opts;
  await saveDraft(ctx.env, ctx.key, draft);
  await ctx.ui.ask(previewText(draft.form), opts, 'fin', 2);
}

/** 登録を確定して Firestore に書き込む */
async function commitDraft(ctx, draft) {
  const form = draft.form;
  if (!form.steps || form.steps.length === 0) {
    await ctx.ui.settle('ステップが1件もないため登録できませんでした。');
    await clearDraft(ctx.env, ctx.key);
    return;
  }
  await ctx.ui.settle(previewText(form) + '\n\n登録中…');
  form.via = ctx.ui.kind;
  const tasks = buildTasks(form, ctx.masters.stepTypes, ctx.tz);
  try {
    await ctx.fs.commitTasks(tasks);
  } catch (e) {
    // 書き込みに失敗した場合は確認画面を出し直す（入力内容を捨てない）
    await ctx.ui.say(`登録に失敗しました：\n${String(e.message || e)}`);
    await askConfirm(ctx, draft);
    return;
  }
  await clearDraft(ctx.env, ctx.key);
  const label = `${form.projectName} / ${form.viewpointName}`;
  await ctx.env.STATE.put(
    lastKey(ctx.key),
    JSON.stringify({ ids: tasks.map((t) => t.id), label }),
    { expirationTtl: 86400 }
  );
  const total = form.steps.reduce((a, s) => a + s.hours, 0);
  await ctx.ui.say(
    [
      `登録しました：${label}（${tasks.length}ステップ・合計 ${fmtHM(total)}）`,
      '',
      'PCで工程図アプリを開いていれば、数秒で画面に反映されます。',
      '作業予定（何日の何時にやるか）の計算は、アプリを開いたときに行われます。',
      '',
      '取り消す場合は /undo',
    ].join('\n')
  );
}

/**
 * 選択肢が押されたときの共通処理。
 * prefix … 'co' | 'vp' | 'as' | 'st' | 'hr' | 'more' | 'dl' | 'fin'
 * value  … 添字の文字列、または INPUT_VALUE
 *
 * Discord では「直接入力」の分岐だけモーダルで先に処理するため、
 * ここへ来る時点で value が INPUT_VALUE になることはない（Telegram のみ）。
 */
async function advance(ctx, draft, prefix, value) {
  const opts = draft.opts || [];
  const idx = Number(value);
  const label = Number.isInteger(idx) && idx >= 0 && idx < opts.length ? opts[idx] : null;
  const stale = async () => {
    await ctx.ui.settle('この操作は期限切れです。/new からやり直してください。');
  };

  if (prefix === 'co' && draft.s === 'company') {
    if (value === INPUT_VALUE) {
      await ctx.ui.settle('会社：（直接入力）');
      await ctx.ui.promptText(ctx, draft, 'company', '会社名を入力してください。');
      return;
    }
    if (label === null) return stale();
    await ctx.ui.settle(`会社：${label}`);
    draft.form.companyName = label;
    await ctx.ui.promptText(ctx, draft, 'project', '案件名を入力してください。');
    return;
  }

  if (prefix === 'vp' && draft.s === 'viewpoint') {
    if (value === INPUT_VALUE) {
      await ctx.ui.settle('視点：（直接入力）');
      await ctx.ui.promptText(ctx, draft, 'viewpoint', '視点名を入力してください。');
      return;
    }
    if (label === null) return stale();
    await ctx.ui.settle(`視点：${label}`);
    draft.form.viewpointName = label;
    await askAssignee(ctx, draft);
    return;
  }

  if (prefix === 'as' && draft.s === 'assignee') {
    if (value === INPUT_VALUE) {
      await ctx.ui.settle('担当：（直接入力）');
      await ctx.ui.promptText(ctx, draft, 'assignee', '担当者名を入力してください。');
      return;
    }
    if (label === null) return stale();
    await ctx.ui.settle(`担当：${label}`);
    draft.form.assignee = label;
    await askStepType(ctx, draft);
    return;
  }

  if (prefix === 'st' && draft.s === 'stepType') {
    if (label === null) return stale();
    // マスタが更新されてボタンとずれた場合に備え、名称でも引き直す
    const list = ctx.masters.stepTypes;
    const type = list[idx] && list[idx].label === label ? list[idx] : list.find((t) => t.label === label);
    if (!type) {
      await ctx.ui.settle('ステップ種類が変更されたようです。/new からやり直してください。');
      await clearDraft(ctx.env, ctx.key);
      return;
    }
    await ctx.ui.settle(`ステップ：${label}`);
    // 表示名は登録時に resolveViewpointSteps が回数付きへ解決するため、ここでは素の種類を持つ
    draft.pendingStep = { stepTypeId: type.id, name: type.label };
    await askHours(ctx, draft);
    return;
  }

  if (prefix === 'hr' && draft.s === 'hours') {
    if (value === INPUT_VALUE) {
      await ctx.ui.settle('時間：（直接入力）');
      await ctx.ui.promptText(ctx, draft, 'hours', '制作時間を入力してください。（例：8 / 8:30 / 4.5）');
      return;
    }
    const h = HOUR_CHOICES[idx];
    if (!h || !draft.pendingStep) return stale();
    await ctx.ui.settle(`時間：${fmtHM(h)}`);
    draft.form.steps.push({ ...draft.pendingStep, hours: h });
    draft.pendingStep = null;
    await askMore(ctx, draft);
    return;
  }

  if (prefix === 'more' && draft.s === 'more') {
    if (label === null) return stale();
    if (idx === 0) {
      await ctx.ui.settle('ステップを追加します');
      await askStepType(ctx, draft);
      return;
    }
    await ctx.ui.settle('納期の入力へ進みます');
    await askDeadline(ctx, draft);
    return;
  }

  if (prefix === 'dl' && draft.s === 'deadline') {
    if (value === INPUT_VALUE) {
      await ctx.ui.settle('納期：（直接入力）');
      await ctx.ui.promptText(ctx, draft, 'deadline', '納期を入力してください。（例：8/5 / 2026-08-05）');
      return;
    }
    if (label === null || !draft.deadlineValues) return stale();
    const v = draft.deadlineValues[idx];
    if (v === null || v === undefined) return stale();
    await ctx.ui.settle(`納期：${v || '指定なし'}`);
    draft.form.projectDeadline = v;
    await askConfirm(ctx, draft);
    return;
  }

  if (prefix === 'fin' && draft.s === 'confirm') {
    if (idx === 1) {
      await ctx.ui.settle('登録をやめました。');
      await clearDraft(ctx.env, ctx.key);
      return;
    }
    if (idx !== 0) return stale();
    await commitDraft(ctx, draft);
    return;
  }

  // 想定外の組み合わせ（古いメッセージのボタンを押した等）
  await stale();
}

/**
 * 自由入力（テキスト）が届いたときの共通処理。
 * Telegram は次のメッセージ、Discord はモーダルの送信でここへ来る。
 * 戻り値 false = 入力が不正で、同じ入力をやり直してほしい。
 */
async function applyTextInput(ctx, draft, field, rawValue) {
  const value = String(rawValue || '').trim();

  if (field === 'company') {
    if (!value) return false;
    draft.form.companyName = value;
    await ctx.ui.promptText(ctx, draft, 'project', '案件名を入力してください。');
    return true;
  }
  if (field === 'project') {
    if (!value) return false;
    draft.form.projectName = value;
    await askViewpoint(ctx, draft);
    return true;
  }
  if (field === 'viewpoint') {
    if (!value) return false;
    draft.form.viewpointName = value;
    await askAssignee(ctx, draft);
    return true;
  }
  if (field === 'assignee') {
    if (!value) return false;
    draft.form.assignee = value;
    await askStepType(ctx, draft);
    return true;
  }
  if (field === 'hours') {
    const h = parseHM(value);
    if (isNaN(h) || h <= 0) {
      await ctx.ui.say('時間の書き方が分かりませんでした。「8」「8:30」「4.5」のように入力してください。');
      return false;
    }
    if (!draft.pendingStep) {
      await ctx.ui.say('この操作は期限切れです。/new からやり直してください。');
      return false;
    }
    draft.form.steps.push({ ...draft.pendingStep, hours: h });
    draft.pendingStep = null;
    await askMore(ctx, draft);
    return true;
  }
  if (field === 'deadline') {
    const d = parseDateInput(value, ctx.tz);
    if (!d) {
      await ctx.ui.say('日付の書き方が分かりませんでした。「8/5」「2026-08-05」のように入力してください。');
      return false;
    }
    draft.form.projectDeadline = d;
    await askConfirm(ctx, draft);
    return true;
  }
  return false;
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
    const key = `${t.companyName || ''} ${t.projectName || ''}`;
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
        const k = `${t.viewpointName || ''} ${t.assignee || ''}`;
        if (!byVp.has(k)) byVp.set(k, []);
        byVp.get(k).push(t);
      }
      for (const [k, list] of byVp) {
        const [vp, as] = k.split(' ');
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
      const k = `${t.projectName || ''} ${t.viewpointName || ''}`;
      if (!byProject.has(k)) byProject.set(k, { hours: 0, completed: 0, deadline: '' });
      const p = byProject.get(k);
      p.hours += Number(t.hours) || 0;
      p.completed += Number(t.completedHours) || 0;
      const dl = effectiveDeadline(t);
      if (dl && (!p.deadline || dl < p.deadline)) p.deadline = dl;
    }
    for (const [k, p] of byProject) {
      const [pn, vp] = k.split(' ');
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
].join('\n');

/**
 * コマンドの共通処理。ウィザードの開始・取り消し・読み取りをまとめて扱う。
 * 戻り値 true = 処理した / false = 知らないコマンド
 */
async function runCommand(ctx, cmd, arg) {
  if (cmd === 'cancel') {
    await clearDraft(ctx.env, ctx.key);
    await ctx.ui.say('入力中の操作をやめました。');
    return true;
  }
  if (cmd === 'help' || cmd === 'start') {
    await ctx.ui.say(HELP);
    return true;
  }
  if (cmd === 'new') {
    ctx.masters = ctx.masters || (await loadMasters(ctx.fs, ctx.env));
    await askCompany(ctx, { s: 'company', form: { steps: [] } });
    return true;
  }
  if (cmd === 'undo') {
    const last = await ctx.env.STATE.get(lastKey(ctx.key), 'json');
    if (!last || !last.ids || last.ids.length === 0) {
      await ctx.ui.say('取り消せる登録がありません。');
      return true;
    }
    await ctx.fs.deleteTasks(last.ids);
    await ctx.env.STATE.delete(lastKey(ctx.key));
    await ctx.ui.say(`「${last.label}」の登録を取り消しました（${last.ids.length}件）。`);
    return true;
  }
  if (cmd === 'status' || cmd === 'due' || cmd === 'who') {
    const tasks = await ctx.fs.listPendingTasks();
    if (cmd === 'status') await ctx.ui.say(cmdStatus(tasks, arg));
    else if (cmd === 'due') await ctx.ui.say(cmdDue(tasks));
    else await ctx.ui.say(cmdWho(tasks, arg));
    return true;
  }
  if (cmd === 'today') {
    const snapshot = await ctx.fs.getData('botSnapshot');
    await ctx.ui.say(cmdToday(snapshot));
    return true;
  }
  return false;
}

/** エラー内容から、よくある原因のヒントを作る */
function errorHint(msg) {
  if (msg.includes('ログイン失敗')) return '\n\n→ BOT_EMAIL / BOT_PASSWORD を確認してください。';
  if (msg.includes('403')) return '\n\n→ Bot のアドレスが工程図の「メンバー管理」に登録されているか、メール確認が済んでいるかを確認してください。';
  if (msg.includes('404')) return '\n\n→ FIREBASE_PROJECT_ID / FIRESTORE_DATABASE_ID / WORKSPACE_ID を確認してください。';
  return '';
}

// ============================================================
// Telegram アダプタ
// ============================================================

const TELEGRAM_MAX = 3800;

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
    const payload = { chat_id: chatId, text: text.slice(0, TELEGRAM_MAX) };
    if (keyboard) payload.reply_markup = { inline_keyboard: keyboard };
    return this.call('sendMessage', payload);
  }

  edit(chatId, messageId, text, keyboard) {
    return this.call('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: text.slice(0, TELEGRAM_MAX),
      reply_markup: keyboard ? { inline_keyboard: keyboard } : { inline_keyboard: [] },
    });
  }

  answer(callbackId, text) {
    return this.call('answerCallbackQuery', { callback_query_id: callbackId, text: text || '' });
  }
}

/** 選択肢 → Telegram のインラインキーボード（1行あたり cols 個） */
function telegramKeyboard(opts, prefix, cols) {
  const rows = [];
  for (let i = 0; i < opts.length; i += cols) {
    rows.push(
      opts.slice(i, i + cols).map((label, j) => ({
        text: String(label),
        callback_data: `${prefix}:${opts[i + j] === INPUT_LABEL ? INPUT_VALUE : i + j}`,
      }))
    );
  }
  return rows;
}

function telegramUI(tg, chatId, messageId) {
  return {
    kind: 'telegram',
    async ask(text, opts, prefix, cols) {
      await tg.send(chatId, text, telegramKeyboard(opts, prefix, cols));
    },
    async say(text) {
      for (const chunk of splitMessage(text, TELEGRAM_MAX)) await tg.send(chatId, chunk);
    },
    async settle(text) {
      if (messageId) await tg.edit(chatId, messageId, text, null);
      else await tg.send(chatId, text);
    },
    // Telegram は「次に送られてきたメッセージ」を待つ方式
    async promptText(ctx, draft, field, label) {
      draft.await = field;
      await saveDraft(ctx.env, ctx.key, draft);
      await tg.send(chatId, label);
    },
  };
}

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

async function handleTelegramUpdate(env, update) {
  const message = update.message;
  const callback = update.callback_query;
  const chatId = String(message?.chat?.id || callback?.message?.chat?.id || '');

  // 本人以外は完全に無視する
  if (!chatId || chatId !== String(env.MY_CHAT_ID)) return;

  const tg = new Telegram(env.TELEGRAM_TOKEN);
  const messageId = callback?.message?.message_id;
  const ctx = {
    ui: telegramUI(tg, chatId, messageId),
    env,
    key: `tg:${chatId}`,
    fs: new Firestore(env),
    tz: env.TZ_OFFSET ? Number(env.TZ_OFFSET) : DEFAULT_TZ_OFFSET,
    masters: null,
  };

  try {
    if (callback) {
      await tg.answer(callback.id);
      const draft = await loadDraft(env, ctx.key);
      if (!draft) {
        await ctx.ui.settle('（この操作は期限切れです。/new からやり直してください）');
        return;
      }
      ctx.masters = await loadMasters(ctx.fs, env);
      const [prefix, value] = String(callback.data || '').split(':');
      await advance(ctx, draft, prefix, value);
      return;
    }

    if (!message?.text) {
      if (message) await ctx.ui.say('テキストかボタン操作でお願いします。\n\n' + HELP);
      return;
    }

    const [cmd, arg] = parseCommand(message.text);
    if (cmd) {
      if (!(await runCommand(ctx, cmd, arg))) {
        await ctx.ui.say(`「/${cmd}」は分かりませんでした。\n\n${HELP}`);
      }
      return;
    }

    // 自由入力の受け取り（直前に promptText で待ち状態にしてある）
    const draft = await loadDraft(env, ctx.key);
    if (!draft || !draft.await) {
      await ctx.ui.say(HELP);
      return;
    }
    ctx.masters = await loadMasters(ctx.fs, env);
    const field = draft.await;
    draft.await = null;
    const ok = await applyTextInput(ctx, draft, field, message.text);
    if (!ok) {
      // やり直し：同じ入力をもう一度待つ
      draft.await = field;
      await saveDraft(env, ctx.key, draft);
    }
  } catch (e) {
    console.error(e);
    const msg = String(e.message || e);
    await tg.send(chatId, `エラーが発生しました：\n${msg}${errorHint(msg)}`).catch(() => {});
  }
}

// ============================================================
// Discord アダプタ
// ============================================================
//
// Discord の Bot は、Cloudflare Worker では「普通のチャットメッセージ」を受け取れない
// （常時接続の WebSocket が必要なため）。そのため
//   - 操作の入口 … スラッシュコマンド（/new /status …）
//   - 選択     … ボタン／セレクトメニュー
//   - 自由入力 … モーダル（入力ポップアップ）
// で組み立てている。返信はすべて ephemeral（本人にだけ見える）。

const DISCORD_API = 'https://discord.com/api/v10';
const DISCORD_MAX = 1900;
const EPHEMERAL = 64;

// インタラクションの種別
const D_PING = 1, D_COMMAND = 2, D_COMPONENT = 3, D_MODAL_SUBMIT = 5;
// 応答の種別
const D_PONG = 1, D_DEFER_MESSAGE = 5, D_DEFER_UPDATE = 6, D_MODAL = 9;

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

/** Discord からのリクエストであることを Ed25519 署名で検証する */
async function verifyDiscordSignature(request, publicKey, bodyText) {
  const sig = request.headers.get('x-signature-ed25519');
  const ts = request.headers.get('x-signature-timestamp');
  if (!sig || !ts || !publicKey) return false;
  const data = new TextEncoder().encode(ts + bodyText);
  for (const algo of [{ name: 'Ed25519' }, { name: 'NODE-ED25519', namedCurve: 'NODE-ED25519' }]) {
    try {
      const key = await crypto.subtle.importKey('raw', hexToBytes(publicKey), algo, false, ['verify']);
      return await crypto.subtle.verify(algo.name, key, hexToBytes(sig), data);
    } catch (e) {
      // このランタイムが対応していないアルゴリズム名 → 次を試す
    }
  }
  console.error('Ed25519 の検証に失敗しました（ランタイム非対応の可能性）');
  return false;
}

/** 選択肢 → Discord のコンポーネント。多いときはセレクトメニュー、少なければボタン */
function discordComponents(opts, prefix, cols) {
  const value = (i) => (opts[i] === INPUT_LABEL ? INPUT_VALUE : String(i));
  // ボタンは1行5個・最大5行＝25個まで。選択肢が多い場合はセレクトメニューにする
  const perRow = Math.min(Math.max(cols, 1), 5);
  if (opts.length <= 10 && Math.ceil(opts.length / perRow) <= 5) {
    const rows = [];
    for (let i = 0; i < opts.length; i += perRow) {
      rows.push({
        type: 1,
        components: opts.slice(i, i + perRow).map((label, j) => ({
          type: 2,
          // 確定系（登録する / やめる）だけ色を変える
          style: prefix === 'fin' ? (i + j === 0 ? 3 : 4) : 2,
          label: String(label).slice(0, 80),
          custom_id: `${prefix}:${value(i + j)}`,
        })),
      });
    }
    return rows;
  }
  // セレクトメニューは25件まで。溢れる場合も末尾の「（直接入力）」は必ず残す
  const shown = opts.length <= 25
    ? opts.map((label, i) => ({ label, i }))
    : [...opts.slice(0, 24).map((label, i) => ({ label, i })), { label: opts[opts.length - 1], i: opts.length - 1 }];
  return [{
    type: 1,
    components: [{
      type: 3,
      custom_id: prefix,
      placeholder: opts.length > 25 ? '選んでください（一覧は先頭24件）' : '選んでください',
      options: shown.map(({ label, i }) => ({ label: String(label).slice(0, 100), value: value(i) })),
    }],
  }];
}

/** 自由入力のモーダル定義。field ごとに何を尋ねるかを持つ */
const MODAL_FIELDS = {
  // 会社を選んだ直後は「案件名」を、会社も直接入力なら「会社名＋案件名」をまとめて尋ねる
  co: { title: '案件の登録', fields: [{ id: 'project', label: '案件名', placeholder: '例：A棟' }] },
  co_x: {
    title: '案件の登録',
    fields: [
      { id: 'company', label: '会社名', placeholder: '例：TAMAZEN' },
      { id: 'project', label: '案件名', placeholder: '例：A棟' },
    ],
  },
  viewpoint: { title: '視点名の入力', fields: [{ id: 'viewpoint', label: '視点名', placeholder: '例：EX1' }] },
  assignee: { title: '担当者の入力', fields: [{ id: 'assignee', label: '担当者名', placeholder: '例：ヤマダ' }] },
  hours: { title: '制作時間の入力', fields: [{ id: 'hours', label: '制作時間（8 / 8:30 / 4.5）', placeholder: '8' }] },
  deadline: { title: '納期の入力', fields: [{ id: 'deadline', label: '納期（8/5 / 2026-08-05）', placeholder: '8/5' }] },
};

function discordModal(kind) {
  const def = MODAL_FIELDS[kind];
  return {
    type: D_MODAL,
    data: {
      custom_id: `m:${kind}`,
      title: def.title,
      components: def.fields.map((f) => ({
        type: 1,
        components: [{
          type: 4,
          custom_id: f.id,
          label: f.label,
          style: 1,
          required: true,
          max_length: 100,
          placeholder: f.placeholder || '',
        }],
      })),
    },
  };
}

/**
 * ボタン／セレクトが押されたとき、Discord では「自由入力＝モーダル」を
 * 3秒以内に即答しなければならない。どの操作がモーダルになるかは
 * custom_id と選ばれた値だけで決まる（Firestore を読む必要がない）。
 */
function modalKindFor(prefix, value) {
  // 会社を選んだ直後は必ず案件名の入力が要る
  if (prefix === 'co') return value === INPUT_VALUE ? 'co_x' : 'co';
  if (value !== INPUT_VALUE) return null;
  return { vp: 'viewpoint', as: 'assignee', hr: 'hours', dl: 'deadline' }[prefix] || null;
}

// その選択肢が、いまウィザードのどの段階のものかの対応。
// Discord は古いメッセージのボタンが残るため、押された段階と下書きの段階が
// 一致しているかを必ず確かめてからモーダルを開く。
const STEP_OF_PREFIX = { co: 'company', vp: 'viewpoint', as: 'assignee', st: 'stepType', hr: 'hours', more: 'more', dl: 'deadline', fin: 'confirm' };

/** Discord のインタラクション用 UI アダプタ */
function discordUI(env, interaction) {
  const appId = env.DISCORD_APP_ID;
  const token = interaction.token;
  const isComponent = interaction.type === D_COMPONENT;
  let usedOriginal = false;

  const patchOriginal = (payload) =>
    fetch(`${DISCORD_API}/webhooks/${appId}/${token}/messages/@original`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  const followup = (payload) =>
    fetch(`${DISCORD_API}/webhooks/${appId}/${token}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...payload, flags: EPHEMERAL }),
    });

  // 最初の出力は「考え中…」の枠（@original）を置き換える。以降は追加メッセージ。
  // ボタン操作の場合の @original は「押されたメッセージ」なので settle 専用に取っておく。
  const out = async (payload) => {
    if (!usedOriginal && !isComponent) {
      usedOriginal = true;
      await patchOriginal(payload);
    } else {
      await followup(payload);
    }
  };

  return {
    kind: 'discord',
    async ask(text, opts, prefix, cols) {
      await out({ content: text.slice(0, DISCORD_MAX), components: discordComponents(opts, prefix, cols) });
    },
    async say(text) {
      for (const chunk of splitMessage(text, DISCORD_MAX)) await out({ content: chunk, components: [] });
    },
    async settle(text) {
      if (isComponent) {
        usedOriginal = true;
        await patchOriginal({ content: text.slice(0, DISCORD_MAX), components: [] });
      } else {
        await out({ content: text.slice(0, DISCORD_MAX), components: [] });
      }
    },
    // Discord ではモーダルで受け取るため、この経路には来ない（保険としてメッセージを出す）
    async promptText(ctx, draft, field, label) {
      draft.await = field;
      await saveDraft(ctx.env, ctx.key, draft);
      await out({ content: label, components: [] });
    },
  };
}

function discordCtx(env, interaction, userId) {
  return {
    ui: discordUI(env, interaction),
    env,
    key: `dc:${userId}`,
    fs: new Firestore(env),
    tz: env.TZ_OFFSET ? Number(env.TZ_OFFSET) : DEFAULT_TZ_OFFSET,
    masters: null,
  };
}

/** 押された選択肢を取り出す（ボタンは custom_id、セレクトメニューは values[0]） */
function discordPick(interaction) {
  const cid = String(interaction.data?.custom_id || '');
  const values = interaction.data?.values;
  if (Array.isArray(values) && values.length > 0) return [cid, String(values[0])];
  const i = cid.indexOf(':');
  return i === -1 ? [cid, ''] : [cid.slice(0, i), cid.slice(i + 1)];
}

/** 遅延応答したあとの本処理（waitUntil の中で走る） */
async function discordProcess(env, interaction, userId) {
  const ctx = discordCtx(env, interaction, userId);
  try {
    if (interaction.type === D_COMMAND) {
      const name = interaction.data?.name;
      const arg = (interaction.data?.options || []).find((o) => o.name === 'name')?.value || '';
      if (!(await runCommand(ctx, name, String(arg)))) {
        await ctx.ui.say(`「/${name}」は分かりませんでした。\n\n${HELP}`);
      }
      return;
    }

    if (interaction.type === D_COMPONENT) {
      const draft = await loadDraft(env, ctx.key);
      if (!draft) {
        await ctx.ui.settle('この操作は期限切れです。/new からやり直してください。');
        return;
      }
      ctx.masters = await loadMasters(ctx.fs, env);
      const [prefix, value] = discordPick(interaction);
      await advance(ctx, draft, prefix, value);
      return;
    }

    if (interaction.type === D_MODAL_SUBMIT) {
      const kind = String(interaction.data?.custom_id || '').slice(2); // "m:co" → "co"
      const values = {};
      for (const row of interaction.data?.components || []) {
        for (const c of row.components || []) values[c.custom_id] = c.value;
      }
      const draft = await loadDraft(env, ctx.key);
      if (!draft) {
        await ctx.ui.say('この操作は期限切れです。/new からやり直してください。');
        return;
      }
      ctx.masters = await loadMasters(ctx.fs, env);

      // 会社＋案件名（co / co_x）はまとめて受け取り、次の画面へ一気に進む
      if (kind === 'co' || kind === 'co_x') {
        if (values.company) draft.form.companyName = String(values.company).trim();
        const project = String(values.project || '').trim();
        if (!draft.form.companyName || !project) {
          await ctx.ui.say('会社名と案件名は必須です。/new からやり直してください。');
          return;
        }
        draft.form.projectName = project;
        await askViewpoint(ctx, draft);
        return;
      }

      const field = Object.keys(values)[0];
      await applyTextInput(ctx, draft, field, values[field]);
      return;
    }
  } catch (e) {
    console.error(e);
    const msg = String(e.message || e);
    await ctx.ui.say(`エラーが発生しました：\n${msg}${errorHint(msg)}`).catch(() => {});
  }
}

/**
 * Discord のインタラクション受け口。
 * 3秒以内に必ず何かを返す必要があるため、
 *   - モーダルを開く操作 … KV だけ見て即座にモーダルを返す
 *   - それ以外           … 「考え中…」を返して、本処理は waitUntil で続ける
 */
async function handleDiscord(request, env, exeCtx) {
  const bodyText = await request.text();
  if (!(await verifyDiscordSignature(request, env.DISCORD_PUBLIC_KEY, bodyText))) {
    return new Response('invalid request signature', { status: 401 });
  }
  const interaction = JSON.parse(bodyText);
  const json = (o) => Response.json(o);

  if (interaction.type === D_PING) return json({ type: D_PONG });

  // 本人以外は完全に無視する
  const userId = String(interaction.member?.user?.id || interaction.user?.id || '');
  if (!userId || userId !== String(env.DISCORD_USER_ID)) {
    return json({
      type: 4,
      data: { content: 'この Bot は登録された本人のみが利用できます。', flags: EPHEMERAL },
    });
  }

  // 「直接入力」はモーダルで受け取る。ここは Firestore を触らずに即答する。
  if (interaction.type === D_COMPONENT) {
    const [prefix, value] = discordPick(interaction);
    const kind = modalKindFor(prefix, value);
    if (kind) {
      const key = `dc:${userId}`;
      const draft = await loadDraft(env, key);
      const expired = () => json({
        type: 4,
        data: { content: 'この操作は期限切れです。/new からやり直してください。', flags: EPHEMERAL },
      });
      // 古いメッセージのボタンを押した場合（Discord ではモーダル経由の質問に
      // ボタンが残るため起こり得る）は、進行中の段階と食い違うので受け付けない
      if (!draft || draft.s !== STEP_OF_PREFIX[prefix]) return expired();
      // 会社を選んでから案件名を尋ねる場合は、選ばれた会社を先に控えておく
      if (prefix === 'co' && value !== INPUT_VALUE) {
        const idx = Number(value);
        const label = draft.opts && idx >= 0 && idx < draft.opts.length ? draft.opts[idx] : null;
        if (!label) return expired();
        draft.form.companyName = label;
      }
      await saveDraft(env, key, draft);
      return json(discordModal(kind));
    }
  }

  // 本処理は時間がかかることがあるので、先に「考え中…」を返す
  exeCtx.waitUntil(discordProcess(env, interaction, userId));
  return json(
    interaction.type === D_COMPONENT
      ? { type: D_DEFER_UPDATE }
      : { type: D_DEFER_MESSAGE, data: { flags: EPHEMERAL } }
  );
}

/** スラッシュコマンドの登録 */
async function registerDiscordCommands(env) {
  const commands = [
    { name: 'new', description: '案件を登録する', type: 1 },
    {
      name: 'status', description: '進行中の案件（案件名を指定すると詳細）', type: 1,
      options: [{ name: 'name', description: '案件名（省略可）', type: 3, required: false }],
    },
    { name: 'due', description: '納期が近い順', type: 1 },
    {
      name: 'who', description: '担当者別の残作業', type: 1,
      options: [{ name: 'name', description: '担当者名（省略可）', type: 3, required: false }],
    },
    { name: 'today', description: '今日の予定', type: 1 },
    { name: 'undo', description: '直前の登録を取り消す', type: 1 },
    { name: 'cancel', description: '入力中の操作をやめる', type: 1 },
    { name: 'help', description: '使い方', type: 1 },
  ];
  const url = env.DISCORD_GUILD_ID
    ? `${DISCORD_API}/applications/${env.DISCORD_APP_ID}/guilds/${env.DISCORD_GUILD_ID}/commands`
    : `${DISCORD_API}/applications/${env.DISCORD_APP_ID}/commands`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
    },
    body: JSON.stringify(commands),
  });
  const body = await res.json().catch(() => ({}));
  return {
    ok: res.ok,
    status: res.status,
    登録先: env.DISCORD_GUILD_ID ? `サーバー ${env.DISCORD_GUILD_ID}（即時反映）` : '全体（反映に最大1時間）',
    件数: Array.isArray(body) ? body.length : undefined,
    body: res.ok ? undefined : body,
  };
}

// ============================================================
// エントリポイント
// ============================================================

export default {
  async fetch(request, env, exeCtx) {
    const url = new URL(request.url);
    const secret = env.WEBHOOK_SECRET;

    // --- Telegram：Webhook とコマンドメニューを登録する ---
    if (secret && url.pathname === `/init/${secret}`) {
      const tg = new Telegram(env.TELEGRAM_TOKEN);
      const hook = await tg.call('setWebhook', {
        url: `${url.origin}/telegram`,
        secret_token: secret,
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

    // --- Discord：スラッシュコマンドを登録する ---
    if (secret && url.pathname === `/discord-init/${secret}`) {
      if (!env.DISCORD_APP_ID || !env.DISCORD_BOT_TOKEN) {
        return Response.json(
          { ok: false, error: 'DISCORD_APP_ID / DISCORD_BOT_TOKEN が設定されていません。' },
          { status: 400 }
        );
      }
      return Response.json({
        エンドポイントURL: `${url.origin}/discord`,
        コマンド登録: await registerDiscordCommands(env),
        次にすること: 'Discord Developer Portal の General Information にある Interactions Endpoint URL に、上の「エンドポイントURL」を設定して保存してください。',
      });
    }

    // --- 確認メールの送信：Bot アカウントの email_verified を true にするため ---
    // Firestore ルールが email_verified == true を要求するため、初回だけこれを実行し、
    // Bot 用アドレスの受信箱に届いたリンクを開く必要がある。
    if (secret && url.pathname === `/verify/${secret}`) {
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
    if (secret && url.pathname === `/test/${secret}`) {
      const result = { ok: false, 手順: {} };
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
        result.利用可能 = {
          telegram: !!(env.TELEGRAM_TOKEN && env.MY_CHAT_ID),
          discord: !!(env.DISCORD_APP_ID && env.DISCORD_PUBLIC_KEY && env.DISCORD_USER_ID),
        };
        return Response.json(result);
      } catch (e) {
        const msg = String(e.message || e);
        result.error = msg;
        const hint = errorHint(msg).replace(/^\n+→ /, '');
        if (hint) result.対処 = hint;
        return Response.json(result, { status: 500 });
      }
    }

    // --- Discord のインタラクション ---
    if (url.pathname === '/discord' && request.method === 'POST') {
      return handleDiscord(request, env, exeCtx);
    }

    // --- Telegram の Webhook ---
    if (url.pathname === '/telegram' && request.method === 'POST') {
      // Webhook の正当性確認（Telegram 以外からの呼び出しを弾く）
      if (request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
        return new Response('forbidden', { status: 403 });
      }
      const update = await request.json().catch(() => null);
      if (update) await handleTelegramUpdate(env, update);
      // Telegram には常に 200 を返す（再送ループを防ぐ）
      return new Response('ok');
    }

    return new Response('koutei-zu chat bot', { status: 200 });
  },
};
