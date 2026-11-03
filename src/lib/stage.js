// 案件の「今どの段階か」（進行状況）・目安金額・AIで読んだ進捗の取り込み — 純ロジック。
// 画面（views/StageView.jsx・views/ProgressImport.jsx・視点カードの請求パネル）と
// テスト（test/stage.test.mjs）から使う。React には依存しない。

// ============ 段階（ステージ） ============
// 視点（案件名＋視点名）ごとに、タスク（ステップ）の状態から自動で決める。
//   仮登録        … 仮案件のチェックが付いている（管理者のところで止まっている）
//   翻訳待ち      … 制作時間がまだ0で、「翻訳済み」のチェックが無い
//   時間計算待ち  … 翻訳済み。エンジニアが制作時間を出すのを待っている（2時間でアラーム）
//   制作待ち      … 制作時間が入り、スケジュールに載った（開始前）
//   制作中        … 予定の開始時刻を過ぎた、または完了時間が入った
//   修正中        … 一度納品したあとに、新しい時間（修正）が登録された
//   中断中        … 制作中断（スケジュールから外している）
//   納品済み      … スケジュールが終わり「確認待ち」（確認日、または1週間で納品完了）
//   請求待ち      … 納品完了。請求書の発行を確認する
//   請求済み      … 請求書を発行した（チェック、または売上登録表の請求書送付日）
export const STAGES = [
  { id: 'tentative', label: '仮登録', color: '#8a7a5c', hint: '管理者のところで止まっています（仮案件のチェックを外すと次へ）' },
  { id: 'translate', label: '翻訳待ち', color: '#b07d3c', hint: '工程図で直接（時間0で）登録した視点です。連携シートの『案件登録』から始めた案件は、入力シートの「翻訳済み」で管理します' },
  { id: 'estimate', label: '時間計算待ち', color: '#c1272d', hint: '工程図で直接登録した視点で、制作時間を待っています（連携シートの案件は、翻訳済みから2時間で Discord に催促が届きます）' },
  { id: 'scheduled', label: '制作待ち', color: '#3a7bd5', hint: 'スケジュールに載りました（開始前）' },
  { id: 'producing', label: '制作中', color: '#3a5a40', hint: '制作が始まっています' },
  { id: 'fixing', label: '修正中', color: '#7a4fa0', hint: '修正の時間が登録され、制作しています' },
  { id: 'suspended', label: '中断中', color: '#6b6b6b', hint: '制作中断中（スケジュールから外しています）' },
  { id: 'delivered', label: '納品済み', color: '#2f7d7d', hint: '確認日（未設定なら納品から1週間）を過ぎると納品完了になります。売上月もここで決められます' },
  { id: 'billing', label: '請求待ち', color: '#d06a00', hint: '納品完了。請求書を発行したらチェック' },
  { id: 'billed', label: '請求済み', color: '#9a9a9a', hint: '請求書を発行済み' },
];
export const STAGE_BY_ID = Object.fromEntries(STAGES.map(s => [s.id, s]));

const n = (v) => { const x = Number(v); return isFinite(x) ? x : 0; };
const vpKeyOf = (t) => `${t.projectName || ''}::${t.viewpointName || ''}`;
const startTs = (t) => (t.scheduledStart instanceof Date)
  ? t.scheduledStart.getTime() + (t.scheduledStartMin || 0) * 60000
  : null;
const endTs = (t) => (t.scheduledEnd instanceof Date)
  ? t.scheduledEnd.getTime() + (t.scheduledEndMin || 0) * 60000
  : null;

// 売上登録表（{ 'YYYY-MM': { rows } }）から「請求書送付日が入っている自動連携行」のタスクIDを集める
export function invoicedTaskIds(salesLedger) {
  const set = new Set();
  for (const m of Object.values(salesLedger || {})) {
    for (const r of ((m && m.rows) || [])) {
      const src = String(r.srcRound || '');
      if (src.startsWith('step:') && String(r.invoiceSentDate || '').trim()) set.add(src.slice(5));
    }
  }
  return set;
}

// tasks（全タスク）＋ scheduledActive（スケジュール計算済みの未完了タスク）→ 視点ごとの段階一覧。
// 返り値：[{ key, stage, isRevision, projectName, projectNameInternal, companyName, viewpointName,
//   viewpointNameExternal, assignees, deadline, since, translatedAt, reviewAt, reviewDueDate,
//   deliveredAt, settlementMonth, ids, pendingIds, zeroIds, reviewIds, totalHours, completedHours,
//   endTs, invoiced }]
// この仕組みを入れる前（2026年10月より前）に納品が済んだ視点は「請求済み」として扱う
// （過去の完了案件が全部「請求待ち」に並ばないように）。
export const LEGACY_BILLED_BEFORE = new Date('2026-10-01T00:00:00').getTime();
export function computeViewpointStages(tasks, scheduledActive, now, salesLedger, opts = {}) {
  const legacyBefore = opts.legacyBefore != null ? opts.legacyBefore : LEGACY_BILLED_BEFORE;
  const nowTs = now instanceof Date ? now.getTime() : Number(now) || Date.now();
  const schedById = new Map((scheduledActive || []).map(t => [t.id, t]));
  const invoiced = invoicedTaskIds(salesLedger);
  const groups = new Map();
  for (const t of (tasks || [])) {
    if (!t || !t.projectName) continue;
    const k = vpKeyOf(t);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(schedById.get(t.id) || t);
  }
  const out = [];
  for (const [key, all] of groups) {
    const steps = all.filter(t => !t.cancelled);
    if (steps.length === 0) continue; // 全部中止 → 出さない
    const pending = steps.filter(t => t.status !== 'done');
    const done = steps.filter(t => t.status === 'done');
    const first = steps[0];
    const pick = (f) => (steps.find(t => (t[f] || '').toString().trim()) || {})[f] || '';
    const e = {
      key,
      projectName: first.projectName || '',
      projectNameInternal: pick('projectNameInternal'),
      companyName: pick('companyName'),
      viewpointName: first.viewpointName || '',
      viewpointNameExternal: pick('viewpointNameExternal'),
      assignees: [...new Set((pending.length ? pending : steps).map(t => (t.assignee || '').trim()).filter(Boolean))],
      deadline: pick('deadline') || pick('projectDeadline'),
      settlementMonth: pick('settlementMonth'),
      ids: steps.map(t => t.id),
      pendingIds: pending.map(t => t.id),
      zeroIds: [],
      reviewIds: done.filter(t => t.reviewState === 'waiting').map(t => t.id),
      totalHours: steps.reduce((s, t) => s + n(t.hours), 0),
      completedHours: steps.reduce((s, t) => s + n(t.completedHours), 0),
      isRevision: false,
      translatedAt: null, reviewAt: null, reviewDueDate: '', deliveredAt: null, since: null, endTs: null,
      invoiced: false,
    };
    // 一度納品した（完了したステップがある）あとに未完了のステップがある＝修正（追加）の回
    e.isRevision = pending.length > 0 && done.length > 0;
    if (pending.length > 0) {
      const pendHours = pending.reduce((s, t) => s + n(t.hours), 0);
      const ends = pending.map(endTs).filter(v => v != null);
      e.endTs = ends.length ? Math.max(...ends) : null;
      if (pending.every(t => t.suspended)) {
        e.stage = 'suspended';
      } else if (pending.some(t => t.tentative)) {
        e.stage = 'tentative';
        e.since = Math.max(0, ...pending.map(t => n(t.createdAt)));
      } else if (pendHours <= 0) {
        e.zeroIds = pending.map(t => t.id);
        const tr = Math.max(0, ...pending.map(t => n(t.translatedAt)));
        e.translatedAt = tr || null;
        e.stage = tr ? 'estimate' : 'translate';
        e.since = tr || Math.max(0, ...pending.map(t => n(t.createdAt))) || null;
      } else {
        const starts = pending.map(startTs).filter(v => v != null);
        const firstStart = starts.length ? Math.min(...starts) : null;
        const started = pending.some(t => n(t.completedHours) > 0) || (firstStart != null && firstStart <= nowTs);
        e.stage = e.isRevision ? 'fixing' : (started ? 'producing' : 'scheduled');
        e.since = firstStart;
      }
    } else {
      e.deliveredAt = Math.max(0, ...done.map(t => {
        const ae = t.actualEnd ? new Date(t.actualEnd).getTime() : NaN;
        return isFinite(ae) ? ae : n(t.completedAt);
      })) || null;
      if (e.reviewIds.length > 0) {
        const rv = done.filter(t => t.reviewState === 'waiting');
        e.stage = 'delivered';
        e.reviewAt = Math.min(...rv.map(t => n(t.reviewAt) || nowTs));
        e.reviewDueDate = (rv.find(t => t.reviewDueDate) || {}).reviewDueDate || '';
        // 納品前チェック（確認待ちのカードで入れる）
        e.deliveryChecks = (rv.find(t => t.deliveryChecks) || {}).deliveryChecks || {};
        e.deliveryCheckedBy = (rv.find(t => t.deliveryCheckedBy) || {}).deliveryCheckedBy || '';
        e.deliveryCheckedAt = (rv.find(t => t.deliveryCheckedAt) || {}).deliveryCheckedAt || null;
        e.since = e.deliveredAt || e.reviewAt;
      } else {
        // 請求済み：まだチェックしていないステップが無い、または、その中の金額ありのステップが
        // すべて売上登録表で請求書送付済み。修正の回が増えたら、その回のぶんで再び「請求待ち」になる。
        const unchecked = steps.filter(t => !t.invoiceCheckedAt);
        const priced = unchecked.filter(t => n(t.stepAmount) > 0 || n(t.stepOutVND) > 0);
        e.invoiced = unchecked.length === 0 || (priced.length > 0 && priced.every(t => invoiced.has(t.id)))
          || (!!e.deliveredAt && e.deliveredAt < legacyBefore);
        e.stage = e.invoiced ? 'billed' : 'billing';
        e.since = e.deliveredAt;
      }
    }
    out.push(e);
  }
  const order = new Map(STAGES.map((s, i) => [s.id, i]));
  return out.sort((a, b) => (order.get(a.stage) - order.get(b.stage))
    || ((a.since || 0) - (b.since || 0))
    || a.key.localeCompare(b.key, 'ja'));
}

// 確認待ちを「納品完了」へ自動で進める対象か：
// 確認日（reviewDueDate）があればその日になったら、無ければ最終更新から7日で。
export const REVIEW_AUTO_DONE_MS = 7 * 24 * 60 * 60 * 1000;
export function isReviewDue(t, now) {
  if (!t || t.reviewState !== 'waiting') return false;
  const d = now instanceof Date ? now : new Date(now);
  const due = String(t.reviewDueDate || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(due)) {
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return today >= due;
  }
  return !!t.reviewUpdatedAt && (d.getTime() - t.reviewUpdatedAt) >= REVIEW_AUTO_DONE_MS;
}

// ============ 目安金額（時間単価） ============
// お客様への金額：視点・パターンごとに「制作時間 × 時間単価（税抜）」。
// roundYen 単位で切り上げ、最低 minYen。外注費（VND）は「制作時間 × 外注の時間単価」を1,000ドン単位で四捨五入。
export const DEFAULT_PRICING = { unitYen: 2500, minYen: 3000, roundYen: 1000, unitVND: 0 };
export function normalizePricing(p) {
  const src = p && typeof p === 'object' ? p : {};
  const pos = (v, d) => { const x = Number(v); return isFinite(x) && x >= 0 ? x : d; };
  return {
    unitYen: pos(src.unitYen, DEFAULT_PRICING.unitYen),
    minYen: pos(src.minYen, DEFAULT_PRICING.minYen),
    roundYen: pos(src.roundYen, DEFAULT_PRICING.roundYen) || 1,
    unitVND: pos(src.unitVND, DEFAULT_PRICING.unitVND),
  };
}
export function calcYen(hours, pricing) {
  const p = normalizePricing(pricing);
  const h = n(hours);
  if (h <= 0 || p.unitYen <= 0) return 0;
  const raw = Math.round(h * p.unitYen * 100) / 100; // 小数の誤差を消してから切り上げ
  const rounded = Math.ceil(raw / p.roundYen) * p.roundYen;
  return Math.max(rounded, p.minYen);
}
export function calcVND(hours, pricing) {
  const p = normalizePricing(pricing);
  const h = n(hours);
  if (h <= 0 || p.unitVND <= 0) return 0;
  return Math.round((h * p.unitVND) / 1000) * 1000;
}
// 視点のステップ一覧 → まだ金額が入っていないステップ（＝今回の回）の目安。
// 金額は1回分をまとめて先頭のステップに入れる（売上登録表は1視点1回＝1行になる）。
export function estimateForSteps(steps, pricing) {
  const target = (steps || []).filter(t => !t.cancelled && n(t.stepAmount) <= 0 && n(t.stepOutVND) <= 0 && n(t.hours) > 0);
  const hours = Math.round(target.reduce((s, t) => s + n(t.hours), 0) * 100) / 100;
  return {
    hours,
    yen: calcYen(hours, pricing),
    vnd: calcVND(hours, pricing),
    targetIds: target.map(t => t.id),
    firstId: target.length ? target[0].id : null,
    parts: target.map(t => ({ name: t.stepName || '作業', hours: n(t.hours) })),
  };
}

// ============ AIで読んだ進捗の取り込み ============
// 作業ごとの短い番号（#xxxxx）。タスクIDの末尾5文字。重なったときは8文字に伸ばす。
export function progressCodes(tasks) {
  const list = (tasks || []).filter(t => t && t.id);
  const short = (t, len) => String(t.id).replace(/[^0-9a-zA-Z]/g, '').slice(-len).toLowerCase();
  const count = new Map();
  for (const t of list) { const c = short(t, 5); count.set(c, (count.get(c) || 0) + 1); }
  const map = new Map();
  for (const t of list) {
    const c5 = short(t, 5);
    map.set(t.id, count.get(c5) > 1 ? short(t, 10) : c5);
  }
  return map; // taskId → code
}

const fmtH = (h) => {
  const v = Math.round(n(h) * 100) / 100;
  return `${v}h`;
};

// AI（ChatGPT など）に渡す指示文。LINE の会話を貼る場所を最後に置く。
export function buildProgressPrompt(activeTasks, codes) {
  const rows = (activeTasks || []).map(t => [
    `#${codes.get(t.id)}`, t.projectNameInternal || '-', t.projectName || '-', t.viewpointName || '-',
    t.stepName || '-', t.assignee || '-', fmtH(t.hours), fmtH(t.completedHours),
  ].join(' | '));
  return [
    'あなたは建築CG制作チームの進捗を整理するアシスタントです。',
    'このあとに貼り付ける LINE の会話履歴（日本語とベトナム語が混ざることがあります）から、下の「作業一覧」にある各作業の最新の進み具合を読み取ってください。',
    '',
    '## 出力のルール',
    '- 1行に1作業。次の形式の行だけを出力する（前置き・説明・見出し・コードブロックは書かない）',
    '  #番号 | 完了時間 | 状態 | メモ',
    '- #番号：作業一覧の番号をそのまま書く。作業一覧に無い作業は書かない',
    '- 完了時間：その作業で終わった時間の合計（時間の数字だけ。30分は0.5）。「半分」「8割」などしか無いときは制作時間に掛けて計算する',
    '- 状態：「作業中」「完了」「未着手」のどれか（xong・done・完成 は「完了」）',
    '- メモ：遅れ・質問・トラブルなど管理者が知るべきことを短く。無ければ空にする',
    '- 会話に出てこない作業は書かない。推測で数字を作らない',
    '',
    '## 出力の例',
    '#a1b2c | 3.5 | 作業中 | 家具の差し替え待ち',
    '#d3e4f | 2 | 完了 |',
    '',
    '## 作業一覧（#番号 | 社内案件名 | 案件名 | 視点 | 作業 | 担当 | 制作時間 | 今の完了時間）',
    ...rows,
    '',
    '## 会話履歴',
    '（ここに LINE の会話をそのまま貼り付けてください）',
  ].join('\n');
}

// "3.5" / "3h" / "3:30" / "3時間30分" / "90分" → 時間（数値）。読めなければ null
export function parseHoursText(s) {
  const str = String(s == null ? '' : s).trim()
    .replace(/[０-９．：]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  if (!str) return null;
  let m = str.match(/^(\d+):(\d{1,2})$/);
  if (m) return Number(m[1]) + Number(m[2]) / 60;
  m = str.match(/^(\d+(?:\.\d+)?)\s*(?:時間|h|hr|hrs|giờ)\s*(?:(\d+)\s*(?:分|m|min|phút))?$/i);
  if (m) return Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0);
  m = str.match(/^(\d+)\s*(?:分|m|min|phút)$/i);
  if (m) return Number(m[1]) / 60;
  m = str.match(/^(\d+(?:\.\d+)?)$/);
  if (m) return Number(m[1]);
  return null;
}
function parseStatusText(s) {
  const str = String(s == null ? '' : s).trim().toLowerCase();
  if (!str) return '';
  if (/完了|完成|済|done|finish|xong|hoàn thành/.test(str)) return 'done';
  if (/未着手|未|not|chưa/.test(str)) return 'todo';
  if (/作業中|進行|中|doing|wip|đang/.test(str)) return 'doing';
  return '';
}

// AI の出力 → 取り込み候補。tasksById は進行中のタスク、codes は progressCodes の結果。
// 返り値：[{ code, task, completed, status, memo, error }]（同じ作業が複数行あれば最後の行を使う）
export function parseProgressReport(text, tasksById, codes) {
  const byCode = new Map();
  for (const [id, code] of (codes || new Map())) byCode.set(code, id);
  const results = new Map();
  const lines = String(text || '').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.replace(/^[\s>*\-・`]+/, '').trim();
    const m = line.match(/^#\s*([0-9a-zA-Z]{4,12})\s*[|｜]\s*(.*)$/);
    if (!m) continue;
    const code = m[1].toLowerCase();
    const cols = m[2].split(/[|｜]/).map(s => s.trim());
    const id = byCode.get(code);
    const task = id ? (tasksById.get(id) || null) : null;
    const completed = parseHoursText(cols[0]);
    const status = parseStatusText(cols[1]);
    const memo = cols.slice(2).join(' | ').trim();
    let error = '';
    if (!task) error = '作業一覧に無い番号です（指示文を作り直してから読ませてください）';
    else if (completed == null && status !== 'done') error = '完了時間が読み取れません';
    results.set(code, { code, task, completed, status, memo, error });
  }
  return [...results.values()];
}

// 取り込み候補 → 反映する完了時間（制作時間で頭打ち。「完了」は制作時間ちょうど）
export function progressTarget(entry) {
  if (!entry || !entry.task) return null;
  const hours = n(entry.task.hours);
  if (entry.status === 'done') return hours;
  if (entry.completed == null) return null;
  return Math.min(hours, Math.max(0, Math.round(entry.completed * 100) / 100));
}
