// ============================================================
// 工程図 LINE Bot（Google Apps Script）
// このファイルは line-bot/build.mjs が自動生成したものです。直接編集しないでください。
// 使い方は line-bot/README.md を参照。
// ============================================================

var KouteiLib = (function () {
// ---- src/viewpoint/viewpointUtils.js ----
// 視点（依頼項目）メタデータの純粋ロジック。
// 制作履歴・納品名・オフショア金額・外注情報を扱う。UI を持たない関数のみ。
//
// データの持ち方：視点メタは「視点内の全ステップ（タスク）に複製保存」する。
// 既存の deadline / projectDeadline と同じ流儀（renameは全タスクへ波及するためキー孤立が起きない）。
// 視点メタを持つタスクのフィールド：
//   prodHistory:        制作ラウンドの配列（後述）
//   deliveryNameOverride: 納品名の手動上書き（空なら自動）
//   countAsDelivery:    納品パース集計の対象か（既定 true）
//
// 制作ラウンド（prodHistory の各要素）：
//   { id, type:'initial'|'add'|'fix', date:'YYYY-MM-DD',
//     amount: 金額(円・税抜) , outInHouse, outExternal, outVND: 外注金額(VND), memo }

const ROUND_TYPES = [
  { id: 'initial', label: '初回（新規制作）', short: '初回', isDelivery: true, color: '#3a7bd5' },
  { id: 'add', label: '追加制作', short: '追加', isDelivery: true, color: '#b07d3c' },
  { id: 'fix', label: '修正制作', short: '修正', isDelivery: false, color: '#7a8471' },
];
function roundTypeOf(id) { return ROUND_TYPES.find(t => t.id === id) || ROUND_TYPES[1]; }

let _seq = 0;
function genRoundId() {
  _seq = (_seq + 1) % 1000000;
  return `rd_${Date.now()}_${_seq}_${Math.random().toString(36).slice(2, 6)}`;
}

function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }

function blankRound(type = 'add', date = '') {
  return { id: genRoundId(), type, date, amount: '', outInHouse: '', outExternal: '', outVND: '', memo: '' };
}

// 任意の配列を制作ラウンド配列に正規化（欠損キーを補う・不正値を除去）。
function normalizeHistory(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(r => r && typeof r === 'object').map(r => ({
    id: r.id || genRoundId(),
    type: roundTypeOf(r.type).id,
    date: r.date || '',
    amount: r.amount ?? '',
    outInHouse: r.outInHouse || '',
    outExternal: r.outExternal || '',
    outVND: r.outVND ?? '',
    memo: r.memo || '',
  }));
}

// 納品名のベース（案件名_視点名）。override があればそれを優先。
function deliveryBaseName(projectName, viewpointName, override) {
  const ov = (override || '').trim();
  if (ov) return ov;
  const p = (projectName || '').trim();
  const v = (viewpointName || '').trim();
  if (p && v) return `${p}_${v}`;
  return p || v || '';
}

// 納品ラウンド数（初回・追加の合計。修正は数えない）。
function deliveryCount(history) {
  return (history || []).reduce((n, r) => n + (roundTypeOf(r.type).isDelivery ? 1 : 0), 0);
}

// 連番付きの納品名。1回目は素の名前、2回目以降は末尾に通し番号を付ける。
// 例：〇〇案件_視点1色付きパース → （追加で）〇〇案件_視点1色付きパース2
function deliveryNameForNumber(baseName, number) {
  return number > 1 ? `${baseName}${number}` : baseName;
}

// 履歴を配列順（時系列）に走査し、各ラウンドへ納品連番と納品名を割り当てる。
// 初回・追加は番号を1つ進め、修正は直前の納品番号を引き継ぐ（同じ納品の修正のため）。
function computeRoundNames(history, baseName) {
  let counter = 0;
  return (history || []).map(r => {
    const t = roundTypeOf(r.type);
    if (t.isDelivery) counter += 1;
    const number = counter === 0 ? 1 : counter;
    return { ...r, type: t.id, number, isDelivery: t.isDelivery, deliveryName: deliveryNameForNumber(baseName, number) };
  });
}

// 視点の「現在の納品名」（最新の納品ラウンドの名前）。履歴が無ければベース名。
function currentDeliveryName(history, baseName) {
  const c = deliveryCount(history);
  return deliveryNameForNumber(baseName, c > 1 ? c : 1);
}

// ステップの納品名 ＝「納品名＋ステップ名」（例：〇〇案件_視点1_ホワイト）。
// 既にステップ名がベース名で始まっていれば二重付与しない。
function stepDeliveryName(baseName, stepName) {
  const base = (baseName || '').trim();
  const sn = (stepName || '').trim();
  if (!base) return sn;
  if (!sn) return base;
  if (sn === base || sn.startsWith(base + '_') || sn.startsWith(base)) return sn;
  return `${base}_${sn}`;
}

// ============ ステップ種類マスタ（プルダウン選択式） ============
// 新規案件のステップはこのマスタから選ぶ。マスタは「マスタ」タブで編集可能。
//   id:           安定ID（マスタ編集後も既存ステップと紐付く）
//   label:        表示名（（有料）/（無料）などを含む素の名称。回数はここには入れない）
//   paid:         有料か（true=金額欄を表示 / false=無料・金額欄なし）
//   deliveryBase: 納品名のベース（例：白色・色付）。同じベースを持つステップで連番を共有する
//   numbered:     回数（1回目・2回目…）を付けるか（修正・変更で true）
const DEFAULT_STEP_TYPES = [
  { id: 'white',        label: 'ホワイト',            paid: true,  deliveryBase: '白色', numbered: false },
  { id: 'color',        label: 'カラー',              paid: true,  deliveryBase: '色付', numbered: false },
  { id: 'person_scene', label: '人物＋添景合成',       paid: true,  deliveryBase: '',     numbered: false },
  { id: 'white_fix',    label: 'ホワイト修正（無料）', paid: false, deliveryBase: '白色', numbered: true },
  { id: 'white_change', label: 'ホワイト変更（有料）', paid: true,  deliveryBase: '白色', numbered: true },
  { id: 'color_fix',    label: 'カラー修正（無料）',   paid: false, deliveryBase: '色付', numbered: true },
  { id: 'color_change', label: 'カラー変更（有料）',   paid: true,  deliveryBase: '色付', numbered: true },
];

// マスタを正規化（欠損フィールドを補完）。保存/読込時に使う。
function normalizeStepTypes(list) {
  if (!Array.isArray(list) || list.length === 0) return DEFAULT_STEP_TYPES.map(t => ({ ...t }));
  return list.map((t, i) => ({
    id: (t && t.id) || `st-${i}`,
    label: (t && t.label) || '',
    paid: t && t.paid !== undefined ? !!t.paid : true,
    deliveryBase: (t && t.deliveryBase) || '',
    numbered: !!(t && t.numbered),
  }));
}

// 回数付きの表示名。例：resolveStepLabel('カラー変更（有料）', true, 1) → 'カラー変更1回目（有料）'
// 末尾の（…）の前に「N回目」を差し込む。（…）が無ければ末尾に付ける。
function resolveStepLabel(baseLabel, numbered, n) {
  const b = (baseLabel || '').trim();
  if (!numbered) return b;
  const m = b.match(/^(.*?)(（[^（）]*）)?$/);
  const core = (m && m[1] != null) ? m[1] : b;
  const suf = (m && m[2]) || '';
  return `${core}${n}回目${suf}`;
}

// 納品名の連番サフィックス。1つ目はベースそのまま、2つ目以降は末尾に通し番号。
// 例：resolveDeliverySuffix('色付', 1) → '色付'、resolveDeliverySuffix('色付', 2) → '色付2'
function resolveDeliverySuffix(deliveryBase, deliveryNumber) {
  const base = (deliveryBase || '').trim();
  if (!base) return '';
  return deliveryNumber > 1 ? `${base}${deliveryNumber}` : base;
}

// ステップ（フォーム値 or タスク）→ 対応するマスタ種類。stepTypeId 優先、無ければ名称一致で探す。
function findStepType(master, step) {
  const list = master || [];
  if (!step) return null;
  const id = step.stepTypeId;
  if (id) { const byId = list.find(t => t.id === id); if (byId) return byId; }
  const nm = (step.name || step.stepName || '').trim();
  if (nm) { const byName = list.find(t => (t.label || '').trim() === nm); if (byName) return byName; }
  return null;
}

// 視点内のステップ配列を解決：各ステップに「回数付き表示名」「納品名サフィックス」を割り当てる。
// 回数は同じ種類（type.id）ごと、納品連番は同じ deliveryBase ごとに、配列順で 1 から数える。
// 戻り値は steps と同じ並びの [{ typeId, label, deliverySuffix, paid, type }]。
function resolveViewpointSteps(steps, master) {
  const typeCounts = {};
  const baseCounts = {};
  return (steps || []).map(s => {
    const t = findStepType(master, s);
    if (!t) return { typeId: '', label: (s && (s.name || s.stepName) || '').trim(), deliverySuffix: '', paid: true, type: null };
    let n = 1;
    if (t.numbered) { typeCounts[t.id] = (typeCounts[t.id] || 0) + 1; n = typeCounts[t.id]; }
    let bn = 0;
    if (t.deliveryBase) { baseCounts[t.deliveryBase] = (baseCounts[t.deliveryBase] || 0) + 1; bn = baseCounts[t.deliveryBase]; }
    return {
      typeId: t.id,
      label: resolveStepLabel(t.label, t.numbered, n),
      deliverySuffix: resolveDeliverySuffix(t.deliveryBase, bn),
      paid: !!t.paid,
      type: t,
    };
  });
}

// 視点名 → 制作種類（EX→外観 / IN→内観 / それ以外は空）。売上の「制作種類」へ流す。
function classifyProdType(viewpointName) {
  const u = (viewpointName || '').trim().toUpperCase();
  if (u.startsWith('EX')) return '外観';
  if (u.startsWith('IN')) return '内観';
  return '';
}

// 視点キー（担当者非依存）。案件名と視点名で一意化する。
function viewpointKey(projectName, viewpointName) {
  return `${projectName || ''} ${viewpointName || ''}`;
}

// 会社がオフショア契約かどうか。
function isOffshoreCompany(company, customerMaster) {
  const name = (company || '').trim();
  if (!name) return false;
  return (customerMaster || []).some(c => (c.company || '').trim() === name && c.contractType === 'offshore');
}

// 会社の売上区分エリア（国内 or 国際）。お客様マスタの salesArea='intl' なら国際、既定は国内。
function salesAreaOfCompany(company, customerMaster) {
  const name = (company || '').trim();
  if (!name) return 'domestic';
  const c = (customerMaster || []).find(x => (x.company || '').trim() === name);
  return c && c.salesArea === 'intl' ? 'intl' : 'domestic';
}

// 見積時間（制作時間 hours）と実績（完了時間 completedHours）の乖離を集計する。
// 対象：完了済み（status==='done'）かつ 予定・実績とも時間が入っているステップ。
// groupBy: 'company'（会社別）| 'assignee'（担当者別）| 'prodType'（制作種類別）
// year: 西暦（数値）を渡すと完了日（actualEnd > completedAt > stepCompletedDate）がその年の
//       ステップだけに絞る。null なら全期間。
// 返り値：[{ key, count, plannedH, actualH, diffH, ratio }]（|乖離時間| の大きい順）
function computeEstimateVariance(tasks, groupBy, year) {
  const doneDateOf = (t) => t.actualEnd || t.completedAt || t.stepCompletedDate || '';
  const keyOf = (t) => {
    if (groupBy === 'assignee') return (t.assignee || '').trim() || '（担当者未設定）';
    if (groupBy === 'prodType') return (t.viewpointCategory || '').trim() || classifyProdType(t.viewpointName) || 'その他';
    return (t.companyName || '').trim() || '（会社名未入力）';
  };
  const map = new Map();
  for (const t of (tasks || [])) {
    if (t.status !== 'done') continue;
    const planned = num(t.hours), actual = num(t.completedHours);
    if (planned <= 0 || actual <= 0) continue;
    if (year != null) {
      const d = String(doneDateOf(t));
      const y = parseInt(d.slice(0, 4), 10);
      if (y !== year) continue;
    }
    const key = keyOf(t);
    if (!map.has(key)) map.set(key, { key, count: 0, plannedH: 0, actualH: 0 });
    const e = map.get(key);
    e.count++;
    e.plannedH += planned;
    e.actualH += actual;
  }
  const out = [...map.values()].map(e => ({
    ...e,
    plannedH: Math.round(e.plannedH * 10) / 10,
    actualH: Math.round(e.actualH * 10) / 10,
    diffH: Math.round((e.actualH - e.plannedH) * 10) / 10,
    ratio: e.plannedH > 0 ? Math.round((e.actualH / e.plannedH) * 100) : null,
  }));
  out.sort((a, b) => Math.abs(b.diffH) - Math.abs(a.diffH) || b.count - a.count);
  return out;
}

// ===== 視点別の修正集計 =====
// 「①新規 → ②完成 → ③追加の変更・修正 → ④完成」の③が、視点ごとに
// 何回・何時間かかっているかを集計するための純粋ロジック。
//
// ステップが「修正」ラウンドかどうかの判定：
// - stepRoundType が設定済みならそれに従う（'fix' ＝修正）。
// - 未設定の古いデータは「ステップ名に『修正』を含み、視点の初回登録から
//   一定時間（既定30分）より後に追加された」ものを修正とみなす。
//   （初回登録時のプリセット「その他修正」を修正ラウンドに誤カウントしないため。
//    同一登録のステップは createdAt がほぼ同時刻＝バッチ内なので窓で区別できる）
const REVISION_LATER_MS = 30 * 60 * 1000;
function isRevisionStep(task, vpFirstCreatedAt) {
  const rt = ((task && task.stepRoundType) || '').trim();
  if (rt) return rt === 'fix';
  if (!((task && task.stepName) || '').includes('修正')) return false;
  return ((task && task.createdAt) || 0) - (vpFirstCreatedAt || 0) > REVISION_LATER_MS;
}

// ステップ（修正・追加ラウンド）の帰属月（'YYYY-MM'）。
// 完了日（stepCompletedDate）＞ 完了時刻（completedAt）＞ 依頼日（stepRequestDate）＞ 登録時刻 の順。
// 売上登録の月間集計と突き合わせるために使う。
function revisionMonthOf(task) {
  const ymOfMs = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const cd = ((task && task.stepCompletedDate) || '').trim();
  if (/^\d{4}-\d{2}/.test(cd)) return cd.slice(0, 7);
  if (task && task.completedAt) return ymOfMs(task.completedAt);
  const rq = ((task && task.stepRequestDate) || '').trim();
  if (/^\d{4}-\d{2}/.test(rq)) return rq.slice(0, 7);
  if (task && task.createdAt) return ymOfMs(task.createdAt);
  return '';
}

// 視点（案件名×視点名・担当者非依存）ごとに修正回数・修正時間・修正金額を集計する。
// 中止（cancelled）は除外。修正時間は実績（completedHours）があれば実績、無ければ予定（hours）。
// 修正金額はステップの制作金額（stepAmount）の合計（0円＝無償修正の切り分け用）。
// opts.month（'YYYY-MM'）を渡すと、その月に帰属する（revisionMonthOf）修正・追加ラウンド
// だけを数える（売上登録の月間集計との連携用。視点の判定用 firstCreatedAt は全期間から取る）。
// 返り値（修正回数の多い順 → 修正時間の多い順）：
//   [{ key, projectName, projectNameInternal, companyName, viewpointName,
//      stepCount, fixCount, addCount, fixPlannedH, fixActualH, fixSpentH, fixAmount,
//      firstCreatedAt, lastFixAt, lastCompletedAt }]
//   lastCompletedAt: 視点完了日時（完了済みステップの最遅完了時刻・ms。未完了なら0）。
function computeRevisionStats(tasks, opts = {}) {
  const month = (opts && opts.month) || null;
  const map = new Map();
  for (const t of (tasks || [])) {
    if (!t || t.cancelled) continue;
    const p = (t.projectName || '').trim();
    const v = (t.viewpointName || '').trim();
    if (!p || !v) continue;
    const key = viewpointKey(p, v);
    if (!map.has(key)) {
      map.set(key, { key, projectName: p, viewpointName: v, projectNameInternal: '', companyName: '', tasks: [] });
    }
    const e = map.get(key);
    if (!e.projectNameInternal && t.projectNameInternal) e.projectNameInternal = t.projectNameInternal;
    if (!e.companyName && t.companyName) e.companyName = t.companyName;
    e.tasks.push(t);
  }
  const r1 = (n) => Math.round(n * 10) / 10;
  // 完了済みステップの完了時刻（ms）。実終了時刻（actualEnd）優先・無ければ completedAt。
  const completionMs = (t) => {
    if (!t || t.status !== 'done') return 0;
    if (t.actualEnd) { const d = new Date(t.actualEnd).getTime(); if (!isNaN(d)) return d; }
    return t.completedAt || 0;
  };
  const out = [];
  for (const e of map.values()) {
    const first = e.tasks.reduce((m, t) => Math.min(m, t.createdAt || Infinity), Infinity);
    const firstCreatedAt = Number.isFinite(first) ? first : 0;
    // 視点完了日時：この視点の完了済みステップのうち最も遅い完了時刻（月フィルタとは独立）
    let lastCompletedAt = 0;
    for (const t of e.tasks) { const ms = completionMs(t); if (ms > lastCompletedAt) lastCompletedAt = ms; }
    let fixCount = 0, addCount = 0, fixPlannedH = 0, fixActualH = 0, fixSpentH = 0, fixAmount = 0, lastFixAt = 0;
    for (const t of e.tasks) {
      if (month && revisionMonthOf(t) !== month) continue;
      if (((t.stepRoundType || '').trim()) === 'add') addCount++;
      if (!isRevisionStep(t, firstCreatedAt)) continue;
      fixCount++;
      const planned = num(t.hours), actual = num(t.completedHours);
      fixPlannedH += planned;
      fixActualH += actual;
      fixSpentH += actual > 0 ? actual : planned;
      fixAmount += num(t.stepAmount);
      const stamp = t.completedAt || t.createdAt || 0;
      if (stamp > lastFixAt) lastFixAt = stamp;
    }
    out.push({
      key: e.key, projectName: e.projectName, projectNameInternal: e.projectNameInternal,
      companyName: e.companyName, viewpointName: e.viewpointName,
      stepCount: e.tasks.length, fixCount, addCount,
      fixPlannedH: r1(fixPlannedH), fixActualH: r1(fixActualH), fixSpentH: r1(fixSpentH),
      fixAmount: Math.round(fixAmount),
      firstCreatedAt, lastFixAt, lastCompletedAt,
    });
  }
  out.sort((a, b) => b.fixCount - a.fixCount || b.fixSpentH - a.fixSpentH || (a.key < b.key ? -1 : 1));
  return out;
}

// 視点グループ（groupByViewpoint の結果）からメタを取り出す。
// グループの代表タスク群から、最も情報量の多い履歴・上書き名・集計フラグを拾う。
function metaFromGroup(group) {
  const tasks = (group && group.tasks) || [];
  let history = [];
  let override = '';
  let countAsDelivery = true;
  let countSet = false;
  for (const t of tasks) {
    const h = normalizeHistory(t.prodHistory);
    if (h.length > history.length) history = h;
    if (!override && t.deliveryNameOverride) override = t.deliveryNameOverride;
    if (typeof t.countAsDelivery === 'boolean' && !countSet) { countAsDelivery = t.countAsDelivery; countSet = true; }
  }
  return { history, deliveryNameOverride: override, countAsDelivery };
}

// ---- src/lib/utils.js ----
// 共通ユーティリティ（色・日付・時刻・プリセット・マスタ正規化など）。App.jsx から分割。


// ============ 定数・ユーティリティ ============
const PRIORITY_COLORS = ['#c1272d', '#d4a017', '#7a8471', '#5d4037', '#37474f'];
function priorityColor(p) {
  if (!p || p < 1) return '#9e9e9e';
  return PRIORITY_COLORS[Math.min(p - 1, PRIORITY_COLORS.length - 1)];
}

// 隣り合うインデックスで色相が離れるように並べた20色（白文字が読める濃色のみ）
const PROJECT_PALETTE = [
  '#3a5a40', '#1d3557', '#bc6c25', '#6a4c93',
  '#c62828', '#00838f', '#5d4037', '#ad1457',
  '#33691e', '#0d47a1', '#e65100', '#4527a0',
  '#00695c', '#8d6e63', '#264653', '#827717',
  '#37474f', '#b71c1c', '#283593', '#4e342e',
];
// 案件名 → 色の割り当て表。タスク一覧から登録順（createdAt）に重複なく振る。
// 案件数がパレットを超えた場合のみ色が一巡して重複する。
let PROJECT_COLOR_MAP = new Map();
function assignProjectColors(tasks) {
  const first = new Map(); // 案件名 → 最初に登録された時刻
  for (const t of (tasks || [])) {
    const p = t.projectName || '';
    if (!p) continue;
    const ca = t.createdAt || 0;
    if (!first.has(p) || ca < first.get(p)) first.set(p, ca);
  }
  const names = [...first.keys()].sort((a, b) => (first.get(a) - first.get(b)) || a.localeCompare(b, 'ja'));
  PROJECT_COLOR_MAP = new Map(names.map((n, i) => [n, PROJECT_PALETTE[i % PROJECT_PALETTE.length]]));
}
function getProjectColor(name) {
  if (!name) return '#888';
  const assigned = PROJECT_COLOR_MAP.get(name);
  if (assigned) return assigned;
  // 割り当て表に無い名前（会社名・担当者名のアバター等）は従来どおりハッシュで決める
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (name.charCodeAt(i) + ((hash << 5) - hash)) | 0;
  return PROJECT_PALETTE[Math.abs(hash) % PROJECT_PALETTE.length];
}
// 色を白と混ぜてパステル調にする（ratio = 白の割合 0..1）。カレンダーのブロック表示用
function pastelize(hex, ratio) {
  const h = (hex || '#888888').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const mix = (c) => Math.round(c + (255 - c) * ratio);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

const fmtMD = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
const fmtYMD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtYMDJP = (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
const dayName = (d) => ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;
// 全体共通の祝日（ベトナム等）。settings.holidays（YYYY-MM-DD の配列）から同期する。
// isNonWorkingDay は settings を受け取らない箇所が多いため、モジュール変数で保持する
// （案件色の assignProjectColors と同じパターン）。
let HOLIDAY_SET = new Set();
function syncHolidays(settings) {
  const list = (settings && settings.holidays) || [];
  HOLIDAY_SET = new Set(list.map(h => h && h.date).filter(Boolean));
}
// 第2・第4土曜は午前のみ営業
function isWorkingSaturday(d) {
  if (d.getDay() !== 6) return false;
  const week = Math.ceil(d.getDate() / 7);
  return week === 2 || week === 4;
}
function isNonWorkingDay(d) {
  if (HOLIDAY_SET.has(fmtYMD(d))) return true; // 祝日（全体共通の休み）
  if (d.getDay() === 0) return true;
  if (d.getDay() === 6) return !isWorkingSaturday(d);
  return false;
}
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const startOfDay = (d) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; };
const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const timeToMin = (s) => {
  if (!s) return 0;
  const [h, m] = s.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const minToTime = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
// 小数時間 → "HH:MM"（分単位に丸めて表示）。制作時間・経過・残時間の表示用。
const fmtHM = (h) => {
  const v = (h == null || isNaN(h)) ? 0 : h;
  const totalMin = Math.round(Math.max(0, v) * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};
// 読み仮名ベースの照合用に正規化する。
// 全角/半角（NFKC）・大文字小文字を揃え、カタカナ→ひらがなに統一する。
// これにより「りのべる」「リノベル」「ﾘﾉﾍﾞﾙ」などスクリプト違いを同一視できる。
// （漢字→読みの変換は読み仮名データが無いため対象外）
const kanaNormalize = (s) => {
  if (s == null) return '';
  let r = String(s).normalize('NFKC').toLowerCase();
  // カタカナ（ァ-ヶ）→ ひらがな
  r = r.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  return r;
};
// "HH:MM" / "H:MM" / 素の数値（時間）→ 小数時間。入力用。無効なら NaN。
const parseHM = (str) => {
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
};

// datetime-local 値（"YYYY-MM-DDTHH:mm"）← → Date
const dtLocalToDate = (s) => s ? new Date(s) : null;
const dateToDtLocal = (d) => {
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// 依頼項目（視点）プリセット
// プリセットのステップは種類マスタのID（DEFAULT_STEP_TYPES の id）で指定する。
const VIEWPOINT_PRESETS = [
  { id: 'pers', name: 'パース', steps: ['white', 'color'] },
  { id: 'photo', name: '写真合成', steps: [{ name: '写真合成' }] },
];
// ステップ1件分の空テンプレート（種類・外注などの請求情報を含む）。
// stepTypeId: ステップ種類マスタの選択ID（プルダウン）。name は表示・検証用の素の名称。
function makeEmptyStep(name = '', stepTypeId = '') {
  return {
    name, stepTypeId, hours: '', completedHours: '',
    amount: '', requestDate: '', completedDate: '', deliveryName: '',
    // 種類（初回/追加/修正）・外注情報（社内外注者/社外外注者/外注VND）。請求はステップが唯一の元データ。
    roundType: '', outInHouse: '', outExternal: '', outVND: '',
  };
}
// プリセットのステップ定義（種類ID文字列 or {name} or {typeId}）→ 空ステップに変換。
function makeStepFromPreset(entry) {
  if (typeof entry === 'string') {
    const t = DEFAULT_STEP_TYPES.find(x => x.id === entry);
    return t ? makeEmptyStep(t.label, t.id) : makeEmptyStep(entry);
  }
  if (entry && entry.typeId) {
    const t = DEFAULT_STEP_TYPES.find(x => x.id === entry.typeId);
    return t ? makeEmptyStep(t.label, t.id) : makeEmptyStep((entry.name || ''));
  }
  return makeEmptyStep((entry && entry.name) || '');
}
function makeViewpointFromPreset(preset) {
  if (!preset) return { viewpointName: '', viewpointNameExternal: '', viewpointCategory: '', assignee: '', manualStart: '', manualEnd: '', deadline: '', deliveryName: '', steps: [makeEmptyStep()] };
  return {
    viewpointName: preset.name,
    viewpointNameExternal: '', // 社外視点名（お客様向け・納品名のベース）
    viewpointCategory: '',     // 内観/外観（制作種類）
    assignee: '',
    manualStart: '', // 視点ごとの開始時間指定（最初の未完了ステップに適用）
    manualEnd: '',   // 視点ごとの終了時間指定（最後の未完了ステップに適用・作業終了予定）
    deadline: '',    // 視点ごとの納期（お客様への提出日）
    deliveryName: '', // 納品名（納品用の視点名）の手動上書き。空なら自動（案件名_視点名）
    // ステップごとに金額・依頼日・完了日・種類・外注を持つ（ステップ＝納品単位。売上へ1ステップ1行で連携）
    // 種類は既定で空（''＝納品に数えない）。納品種類（初回/追加）はカードの請求パネルで明示的に設定する。
    steps: preset.steps.map(makeStepFromPreset),
  };
}

// 会社名の候補（プルダウン用・自由入力も可）。並びは既定の表示順
const COMPANY_PRESETS = [
  'リノべる株式会社',
  '田中建設',
  'オフィスコム',
  'CG工房',
  '玉善',
  'SUMUS',
  'オフショア（その他）',
];

// 簡易ID
function genId(p) { return `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

// お客様マスタを「会社ごとに担当者をまとめた」形 [{ id, company, contacts:[{id,name}] }] に正規化。
// 旧フラット形式 [{ id, company, contact }] も会社ごとにグループ化して変換する（後方互換）。
function normalizeCustomerMaster(arr) {
  if (!Array.isArray(arr)) return [];
  const isFlat = arr.some(e => e && typeof e.contact === 'string' && !Array.isArray(e.contacts));
  if (isFlat) {
    const map = new Map();
    for (const e of arr) {
      const company = (e && e.company) || '';
      if (!map.has(company)) map.set(company, { id: genId('cust'), company, contacts: [] });
      if (e && e.contact) map.get(company).contacts.push({ id: genId('cc'), name: e.contact });
    }
    return [...map.values()];
  }
  // 追加フィールド（代表者名・住所・電話・URL、担当者の支店名・電話・メール等）は spread で維持する
  return arr.map(e => ({
    ...(e || {}),
    id: (e && e.id) || genId('cust'),
    company: (e && e.company) || '',
    contacts: Array.isArray(e && e.contacts)
      ? e.contacts.map(c => typeof c === 'string'
        ? { id: genId('cc'), name: c }
        : { ...(c || {}), id: (c && c.id) || genId('cc'), name: (c && c.name) || '' })
      : [],
  }));
}

// ===== ベトナムの祝日（候補データ） =====
// 旧暦ベースの祝日（推定・要確認）。政府が毎年、振替日を含めて公式日程を発表するため目安。
// tet=テト元日, tetDays=テト休みの目安日数, hung=フンヴオン王の命日（旧暦3月10日）
const VN_LUNAR_HOLIDAYS = {
  2025: { tet: '2025-01-29', tetDays: 5, hung: '2025-04-07' },
  2026: { tet: '2026-02-17', tetDays: 5, hung: '2026-04-26' },
  2027: { tet: '2027-02-06', tetDays: 5, hung: '2027-04-16' },
  2028: { tet: '2028-01-26', tetDays: 5, hung: '2028-04-04' },
  2029: { tet: '2029-02-13', tetDays: 5, hung: '2029-04-23' },
  2030: { tet: '2030-02-03', tetDays: 5, hung: '2030-04-12' },
};
// 指定年の祝日候補。各候補 { date:'YYYY-MM-DD', days, label, estimated }
// estimated=true は旧暦ベースで要確認（日付・日数は政府発表に合わせて編集する）
function vietnamHolidayCandidates(year) {
  const out = [
    { date: `${year}-01-01`, days: 1, label: '元日 Tết Dương lịch', estimated: false },
    { date: `${year}-04-30`, days: 1, label: '南部解放記念日 Giải phóng miền Nam', estimated: false },
    { date: `${year}-05-01`, days: 1, label: 'メーデー Quốc tế Lao động', estimated: false },
    { date: `${year}-09-02`, days: 2, label: '建国記念日 Quốc khánh', estimated: false },
  ];
  const lunar = VN_LUNAR_HOLIDAYS[year];
  if (lunar) {
    out.push({ date: lunar.tet, days: lunar.tetDays, label: 'テト（旧正月）Tết Nguyên đán', estimated: true });
    out.push({ date: lunar.hung, days: 1, label: 'フンヴオン王の命日 Giỗ Tổ Hùng Vương', estimated: true });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
// 'YYYY-MM-DD' から days 日ぶんの連続日付の配列を返す
function expandHolidayDates(startDate, days) {
  const out = [];
  const d = new Date(startDate + 'T00:00:00');
  if (isNaN(d.getTime())) return out;
  for (let i = 0; i < Math.max(1, days || 1); i++) { out.push(fmtYMD(d)); d.setDate(d.getDate() + 1); }
  return out;
}

const DEFAULT_SETTINGS = {
  morningStart: '08:00',
  morningEnd: '12:00',
  afternoonStart: '13:00',
  afternoonEnd: '17:00',
  startDate: fmtYMD(new Date()),
  startTime: '08:00',
  absences: [],
  // 全体共通の祝日（ベトナム等）。[{ id, date:'YYYY-MM-DD', label }]。土日と同じく非稼働日として扱う
  holidays: [],
  // 残業（担当者・期間・時間帯の稼働枠追加）。[{ id, assignee, startDate, endDate, startTime, endTime, label }]
  overtimes: [],
  // 会社グループの表示順（暫定の固定順）。表示順設定ページで編集可
  companyOrder: ['CG工房', 'リノべる株式会社', 'オフィスコム', '田中建設', 'SUMUS', '玉善', 'オフショア（その他）'],
};

function getDailySlots(settings) {
  return [
    { start: timeToMin(settings.morningStart), end: timeToMin(settings.morningEnd) },
    { start: timeToMin(settings.afternoonStart), end: timeToMin(settings.afternoonEnd) },
  ];
}
// その日の営業スロット（土曜は午前のみ）
function getDaySlots(d, settings) {
  const all = getDailySlots(settings);
  if (d.getDay() === 6) return [all[0]];
  return all;
}
function getDayWorkingHours(d, settings) {
  return getDaySlots(d, settings).reduce((s, x) => s + (x.end - x.start) / 60, 0);
}
function getHoursPerDay(settings) {
  return getDailySlots(settings).reduce((s, x) => s + (x.end - x.start) / 60, 0);
}

function parseYMD(s) {
  if (!s || typeof s !== 'string') return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
// 視点名リスト → 「外観N枚+内観M枚」形式の制作枚数ラベル（EX→外観, IN→内観, それ以外は視点名）。
// 各視点（依頼項目）を1枚と数え、分類ごとに件数を集計する。
function sheetsLabel(viewpointNames) {
  const counts = new Map();
  const order = [];
  for (const raw of (viewpointNames || [])) {
    const vn = (raw || '').trim();
    if (!vn) continue;
    const u = vn.toUpperCase();
    const label = u.startsWith('EX') ? '外観' : u.startsWith('IN') ? '内観' : vn;
    if (!counts.has(label)) { counts.set(label, 0); order.push(label); }
    counts.set(label, counts.get(label) + 1);
  }
  const rank = (l) => l === '外観' ? 0 : l === '内観' ? 1 : 2;
  return order.slice()
    .sort((a, b) => (rank(a) - rank(b)) || (order.indexOf(a) - order.indexOf(b)))
    .map(l => `${l}${counts.get(l)}枚`)
    .join('+');
}



// ---- src/lib/schedule.js ----
// スケジューリング・マイグレーション・並び順・視点グループ化のロジック。App.jsx から分割。
// ============ マイグレーション ============


function migrateTask(task) {
  let priority = task.priority;
  if (typeof priority === 'string') {
    const map = { high: 1, medium: 2, low: 3 };
    priority = map[priority] || 99;
  }
  if (typeof priority !== 'number' || priority < 1) priority = 99;

  const completedHours = typeof task.completedHours === 'number' ? task.completedHours : 0;

  // taskName → viewpointName
  let viewpointName = task.viewpointName;
  if (!viewpointName && task.taskName) viewpointName = task.taskName;
  if (!viewpointName) viewpointName = '視点';

  const stepName = task.stepName || null;
  const stepOrder = (task.stepOrder !== undefined && task.stepOrder !== null) ? task.stepOrder : null;
  const manualStart = task.manualStart || null;

  const projectNameInternal = task.projectNameInternal || '';
  const companyName = task.companyName || '';
  const customerContact = task.customerContact || '';
  // 実際の終了時刻（"YYYY-MM-DDTHH:mm"）。完了時に記録し、遅れた場合は後続を後ろ倒しする
  const actualEnd = task.actualEnd || null;

  // 確認待ち（視点完了後の確認フェーズ）の状態
  const reviewState = task.reviewState || null;            // 'waiting' = 確認待ち
  const reviewAt = task.reviewAt || null;                  // 確認待ちに入れた時刻（ms）
  const reviewUpdatedAt = task.reviewUpdatedAt || null;    // 最終更新（修正メモ記入など）。3日でグレー・7日で自動完了の基準
  const reviewNote = task.reviewNote || '';                // 追加修正メモ

  const { taskName, ...rest } = task;
  return { ...rest, viewpointName, stepName, stepOrder, manualStart, priority, completedHours, projectNameInternal, companyName, customerContact, actualEnd, reviewState, reviewAt, reviewUpdatedAt, reviewNote };
}

// 優先順位は「会社ごと」に 1 から採番する（会社の中だけで順位を持つ）
function normalizePriorities(tasks) {
  const active = tasks.filter(t => t.status !== 'done');
  const done = tasks.filter(t => t.status === 'done');
  // 会社ごとにグループ化し、各会社内で (priority → createdAt) 順に 1..n を振り直す
  const byCompany = new Map();
  for (const t of active) {
    const c = t.companyName || '';
    if (!byCompany.has(c)) byCompany.set(c, []);
    byCompany.get(c).push(t);
  }
  const renumbered = [];
  for (const list of byCompany.values()) {
    list.sort((a, b) => (a.priority - b.priority) || (a.createdAt - b.createdAt));
    list.forEach((t, i) => renumbered.push({ ...t, priority: i + 1 }));
  }
  return [...renumbered, ...done];
}

// 納期（"YYYY-MM-DD"）を比較可能な数値キーに変換する。未設定・不正は最後（Infinity）。
function deadlineKey(dl) {
  if (!dl) return Infinity;
  const n = parseInt(String(dl).replace(/-/g, ''), 10);
  return isNaN(n) ? Infinity : n;
}
// タスクの実効納期（個別納期＞全体納期）の数値キー。
function effectiveDeadlineKey(t) {
  return deadlineKey(t.deadline || t.projectDeadline);
}
// 優先順位は廃止。新規案件の既定の並び順は「同じ会社の中で納期（実効）の早い順」。
// 同じ会社の進行中案件のうち、実効納期がこの案件以前のものの件数＋0.5 を仮の priority として返す。
// （normalizePriorities が整数へ振り直す。手動ドラッグ／↑↓で上書き可能）
function deadlineInsertPriority(activeSameCompanyTasks, formDeadlineKey) {
  let before = 0;
  for (const t of activeSameCompanyTasks) {
    if (effectiveDeadlineKey(t) <= formDeadlineKey) before++;
  }
  return before + 0.5;
}

// 会社のランク（小さいほど上）。プリセットの並び順を基準にし、
// 「オフショア（その他）」と会社未設定は常に最後に回す。
function companyRank(name) {
  const c = name || '';
  if (c === 'オフショア（その他）') return 9000; // 必ず一番下
  if (!c) return 8000;                            // 会社未設定
  const idx = COMPANY_PRESETS.indexOf(c);
  if (idx >= 0) return idx;                       // プリセットの並び順
  return 7000;                                    // プリセット外の会社
}

// 進行中案件一覧の「会社グループの表示順」用ランク。
// companyOrder（settings 保存の会社名配列）に従い、未登録は名前順でオフショアの手前、未分類は最後。
function companyDisplayRank(name, companyOrder) {
  const c = (name || '').trim();
  if (c === '') return { tier: 4, idx: 0 };                  // 未分類 → 最後
  if (c === 'オフショア（その他）') return { tier: 3, idx: 0 }; // 登録会社群の最後
  const order = (companyOrder || []).map(x => (x || '').trim());
  const idx = order.indexOf(c);
  if (idx >= 0) return { tier: 1, idx };                     // companyOrder の順
  return { tier: 2, idx: 0 };                                // 未登録 → 名前順
}
function compareCompanyDisplay(a, b, companyOrder) {
  const ra = companyDisplayRank(a, companyOrder), rb = companyDisplayRank(b, companyOrder);
  if (ra.tier !== rb.tier) return ra.tier - rb.tier;
  if (ra.tier === 1) return ra.idx - rb.idx;
  return (a || '').localeCompare(b || '', 'ja');
}

// 会社の並び順（スケジュール・表示の会社の登場順）を決める。
// ランク順 → 同ランクは最初に登録された会社から（createdAt 昇順）。
function companySequence(activeTasks) {
  const first = new Map();
  for (const t of activeTasks) {
    const c = t.companyName || '';
    const ca = t.createdAt || 0;
    if (!first.has(c) || ca < first.get(c)) first.set(c, ca);
  }
  const companies = [...first.keys()].sort((a, b) => {
    const ra = companyRank(a), rb = companyRank(b);
    if (ra !== rb) return ra - rb;
    return (first.get(a) || 0) - (first.get(b) || 0);
  });
  return new Map(companies.map((c, i) => [c, i]));
}

// 案件（社外案件名）の実効的な並び順を返す。
// 既定は「会社ごとにまとめた順（会社ランク → 案件内の最小優先順位 → 登録順）」。
// projectOrder（手動ドラッグの並び）が指定された案件は、その並びを優先（会社を跨いで移動可）。
function computeProjectOrder(activeTasks, projectOrder) {
  const companySeq = companySequence(activeTasks);
  const meta = new Map();
  for (const t of activeTasks) {
    const p = t.projectName || '';
    if (!meta.has(p)) meta.set(p, { company: t.companyName || '', minPri: Infinity, minCreated: Infinity });
    const m = meta.get(p);
    const pr = (typeof t.priority === 'number') ? t.priority : Infinity;
    const cr = (typeof t.createdAt === 'number') ? t.createdAt : Infinity;
    if (pr < m.minPri) m.minPri = pr;
    if (cr < m.minCreated) m.minCreated = cr;
    if (!m.company && t.companyName) m.company = t.companyName;
  }
  const projects = [...meta.keys()];
  const seqOf = (p) => { const c = meta.get(p).company; return companySeq.has(c) ? companySeq.get(c) : Infinity; };
  // 既定（会社ごとにまとめた）順
  const canonical = projects.slice().sort((a, b) => {
    const sa = seqOf(a), sb = seqOf(b);
    if (sa !== sb) return sa - sb;
    const ma = meta.get(a), mb = meta.get(b);
    return (ma.minPri - mb.minPri) || (ma.minCreated - mb.minCreated) || a.localeCompare(b, 'ja');
  });
  // 手動指定された案件を、その「位置」に新しい順序で差し込む（未指定の案件は既定の位置を保持）
  const orderIdx = new Map((projectOrder || []).map((n, i) => [n, i]));
  const manualSeq = projects.filter(p => orderIdx.has(p)).sort((a, b) => orderIdx.get(a) - orderIdx.get(b));
  let mi = 0;
  return canonical.map(p => (orderIdx.has(p) && mi < manualSeq.length) ? manualSeq[mi++] : p);
}

// ============ スケジューリング ============
// [start,end) から blocked 区間（[s,e) の配列）を引いた空き区間を返す
function subtractBusy(start, end, blocked) {
  if (!blocked || blocked.length === 0) return [[start, end]];
  const ov = blocked.filter(([s, e]) => e > start && s < end).sort((a, b) => a[0] - b[0]);
  const free = [];
  let cur = start;
  for (const [s, e] of ov) {
    const bs = Math.max(s, start), be = Math.min(e, end);
    if (bs > cur) free.push([cur, bs]);
    cur = Math.max(cur, be);
  }
  if (cur < end) free.push([cur, end]);
  return free;
}

// その担当者・その日の不在情報。{ allDay, intervals:[[s,e],...] }
function dayAbsence(assignee, date, absences) {
  const ymd = fmtYMD(date);
  let allDay = false;
  const intervals = [];
  for (const a of (absences || [])) {
    if (!a || a.assignee !== assignee) continue;
    if (!a.startDate || !a.endDate) continue;
    if (ymd < a.startDate || ymd > a.endDate) continue;
    if (a.allDay) allDay = true;
    else if (a.startTime && a.endTime) intervals.push([timeToMin(a.startTime), timeToMin(a.endTime)]);
  }
  return { allDay, intervals };
}

// 担当者が指定時刻に休み（対応不可）かどうか。終日休み、または現在時刻が不在時間帯に入っている。
function isOnLeaveAt(assignee, when, absences) {
  const abs = dayAbsence(assignee, when, absences);
  if (abs.allDay) return true;
  const min = when.getHours() * 60 + when.getMinutes();
  return abs.intervals.some(([s, e]) => min >= s && min < e);
}

// その担当者・その日の残業時間帯。[[s,e],...]（分）
function dayOvertimeIntervals(assignee, date, overtimes) {
  const ymd = fmtYMD(date);
  const out = [];
  for (const o of (overtimes || [])) {
    if (!o || o.assignee !== assignee) continue;
    if (!o.startDate || !o.endDate) continue;
    if (ymd < o.startDate || ymd > o.endDate) continue;
    if (o.startTime && o.endTime) {
      const s = timeToMin(o.startTime), e = timeToMin(o.endTime);
      if (e > s) out.push([s, e]);
    }
  }
  return out;
}

// その担当者・その日の稼働枠（通常の営業スロット＋残業枠を重複なくマージ）
function dayWorkSlots(assignee, date, settings) {
  const base = getDaySlots(date, settings).map(s => [s.start, s.end]);
  const ot = dayOvertimeIntervals(assignee, date, settings.overtimes || []);
  const all = [...base, ...ot].sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [s, e] of all) {
    if (e <= s) continue;
    if (merged.length > 0 && s <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
    } else merged.push([s, e]);
  }
  return merged;
}

// その担当者・その日の「空いている営業時間」区間（土日・不在・予約済みを除外、残業枠を含む）
function dayFreeIntervals(assignee, date, settings, busyMap, absences) {
  if (isNonWorkingDay(date)) return [];
  const abs = dayAbsence(assignee, date, absences);
  if (abs.allDay) return [];
  const ymd = fmtYMD(date);
  const busy = (busyMap[assignee] && busyMap[assignee].get(ymd)) || [];
  const blocked = [...busy, ...abs.intervals];
  const free = [];
  for (const [s, e] of dayWorkSlots(assignee, date, settings)) {
    for (const iv of subtractBusy(s, e, blocked)) free.push(iv);
  }
  return free;
}

function scheduleTasks(tasks, settings, projectOrder, now) {
  const dailySlots = getDailySlots(settings);
  const configuredStart = startOfDay(settings.startDate ? new Date(settings.startDate + 'T00:00:00') : new Date());
  // 過去には予定を置かない：起点は「設定された開始日」と「本日」の遅い方にする
  const today = startOfDay(new Date());
  const startDate = configuredStart.getTime() < today.getTime() ? today : configuredStart;
  const startMinOfDay = settings.startTime ? timeToMin(settings.startTime) : dailySlots[0].start;
  const absences = settings.absences || [];

  // 制作中断（suspended）：お客様へ納品後など、進行できず一旦スケジュールから外す案件。
  // 完了ではないが active からも除外し、カレンダー・担当者別・進行中一覧に出さない。
  const active = tasks.filter(t => t.status !== 'done' && !t.suspended);
  const suspended = tasks.filter(t => t.status !== 'done' && t.suspended);
  const done = tasks.filter(t => t.status === 'done');

  // 作業順 ＝ 案件の並び順（既定は会社ごと・手動ドラッグで会社を跨いで変更可）→ 案件内は優先順位
  // → ホワイト工程を全視点ぶん先に（視点名に関わらずホワイト優先）→ 登録順
  // 例: IN1(白/カラー)+IN2(白/カラー) → IN1白 → IN2白 → IN1カラー → IN2カラー
  const projOrder = computeProjectOrder(active, projectOrder);
  const projIdx = new Map(projOrder.map((n, i) => [n, i]));
  const projOf = (t) => projIdx.has(t.projectName || '') ? projIdx.get(t.projectName || '') : Infinity;
  const phaseOf = (t) => ((t.stepName || '').includes('ホワイト') ? 0 : 1);
  const sorted = [...active].sort((a, b) => {
    const pa = projOf(a), pb = projOf(b);
    if (pa !== pb) return pa - pb;
    return (a.priority - b.priority) || (phaseOf(a) - phaseOf(b)) || (a.createdAt - b.createdAt);
  });

  // 完了タスクの実終了時刻（担当者ごとの最遅）→ その担当者の着手可能の下限（遅れを反映）
  const doneFloor = {};
  for (const t of done) {
    if (!t.actualEnd) continue;
    const ae = new Date(t.actualEnd);
    if (isNaN(ae.getTime())) continue;
    // 当日以降に終えた完了タスクは、カレンダー上で当日に表示しない方針に合わせ、
    // 当日の着手下限（遅れ反映）にも使わない。これにより完了ブロックを隠した跡に
    // 空白が残らず、当日の予定が前詰め（朝から）で配置される。
    if (startOfDay(ae).getTime() >= today.getTime()) continue;
    const ts = startOfDay(ae).getTime() + (ae.getHours() * 60 + ae.getMinutes()) * 60000;
    if (!doneFloor[t.assignee] || ts > doneFloor[t.assignee]) doneFloor[t.assignee] = ts;
  }
  const baseTsOf = (assignee) => {
    const base = startDate.getTime() + startMinOfDay * 60000;
    return (doneFloor[assignee] && doneFloor[assignee] > base) ? doneFloor[assignee] : base;
  };

  // 担当者ごとの予約済み区間（インターバル方式）。busyMap[assignee] = Map(ymd -> [[s,e],...])
  const busyMap = {};
  const addBusy = (assignee, date, s, e) => {
    if (!busyMap[assignee]) busyMap[assignee] = new Map();
    const ymd = fmtYMD(date);
    if (!busyMap[assignee].has(ymd)) busyMap[assignee].set(ymd, []);
    busyMap[assignee].get(ymd).push([s, e]);
  };
  // 同じ視点（担当者+案件+視点名）の前ステップ終了時刻。工程順を守るための下限
  const vpLastEnd = {};
  // 担当者ごとの「直前にスケジュールしたタスクの終了時刻」。
  // 開始指定が無いタスクは前のタスクの終了予定に続けて並べる（手前の空き時間への穴埋めはしない）。
  // 終了予定の指定（manualEnd）もこの下限に反映される
  const lastEndByAssignee = {};

  // スケジュール用の所要時間（h）＝残作業（制作時間−完了時間）。
  // 経過時間では終了予定を膨張させない（未記録のまま時間が経っても枠は伸びない）。
  // 例: 0.5h タスクは常に 0.5h 枠で配置され、開始予定どおりに表示される。
  // 遅れの反映は「完了時の実終了時刻（actualEnd）」を入力したときだけ後続へ伝播する
  // （doneFloor / lastEndByAssignee 経由で次タスクの開始下限が後ろへずれる）。
  const effectiveDuration = (task) => {
    const fullHours = Math.max(0, task.hours || 0);
    if (fullHours <= 0) return 0;
    return Math.max(0, fullHours - (task.completedHours || 0));
  };

  // eTs 以降の空き営業時間に durationHours ぶんを詰める（予約済み・休日/不在は飛ばす）。
  // 終了予定の指定（manualEnd・開始より後の場合のみ有効）があればその時刻で打ち切る
  const fillTaskSlots = (task, eTs, durationHours) => {
    const assignee = task.assignee;
    const eDate = startOfDay(new Date(eTs));
    const eMin = Math.round((eTs - eDate.getTime()) / 60000);
    let meTs = null, meDate = null, meMin = 0;
    if (task.manualEnd) {
      const me = new Date(task.manualEnd);
      if (!isNaN(me.getTime())) {
        const ts = startOfDay(me).getTime() + (me.getHours() * 60 + me.getMinutes()) * 60000;
        if (ts > eTs) {
          meTs = ts; meDate = startOfDay(me); meMin = me.getHours() * 60 + me.getMinutes();
        }
      }
    }
    let remainingMin = Math.round(Math.max(0, durationHours) * 60);
    const slots = [];
    let date = new Date(eDate);
    let guard = 0;
    while (remainingMin > 0 && guard++ < 100000) {
      if (meDate && date.getTime() > meDate.getTime()) break; // 終了予定日を越えたら打ち切り
      const free = dayFreeIntervals(assignee, date, settings, busyMap, absences);
      const isFirst = isSameDay(date, eDate);
      const isMeDay = meDate && isSameDay(date, meDate);
      for (const [fs, feRaw] of free) {
        if (remainingMin <= 0) break;
        const fe = isMeDay ? Math.min(feRaw, meMin) : feRaw;
        const segStart = isFirst ? Math.max(fs, eMin) : fs;
        if (segStart >= fe) continue;
        const use = Math.min(remainingMin, fe - segStart);
        slots.push({ date: new Date(date), startMin: segStart, endMin: segStart + use, hours: use / 60 });
        addBusy(assignee, date, segStart, segStart + use);
        remainingMin -= use;
      }
      date = addDays(date, 1);
    }
    return { slots, meTs, meDate, meMin };
  };

  // ===== 事前パス（差し込み）=====
  // 開始指定（manualStart）のあるタスクを先に配置して時間を予約する。
  // 指定なしのタスクは後からその前後の空きに分割して入るため、
  // 例: 案件A(8〜12時)の途中に案件B(10時開始)を差し込むと A は 8〜10時＋13〜15時 に割れる。
  // 同じ視点に未配置の前工程（開始指定なし）がある場合は工程順を守るため事前予約しない
  const vkeyOf = (t) => `${t.assignee}::${t.projectName}::${t.viewpointName}`;
  const pinnedResults = new Map();
  for (const task of sorted) {
    if (!task.manualStart || (task.hours || 0) <= 0) continue;
    const ms = new Date(task.manualStart);
    if (isNaN(ms.getTime())) continue;
    const hasEarlierUnpinned = sorted.some(o =>
      o !== task && vkeyOf(o) === vkeyOf(task) && !o.manualStart &&
      (o.stepOrder ?? -1) < (task.stepOrder ?? -1)
    );
    if (hasEarlierUnpinned) continue;
    const eTs = startOfDay(ms).getTime() + (ms.getHours() * 60 + ms.getMinutes()) * 60000;
    pinnedResults.set(task.id, fillTaskSlots(task, eTs, effectiveDuration(task)));
  }

  const scheduled = sorted.map(task => {
    const fullHours = Math.max(0, task.hours || 0);
    const remainingHours = Math.max(0, fullHours - (task.completedHours || 0));

    if (fullHours <= 0) {
      return { ...task, scheduledStart: null, scheduledEnd: null, slots: [], remainingHours: 0 };
    }

    const assignee = task.assignee;
    const vkey = vkeyOf(task);
    let res;
    if (pinnedResults.has(task.id)) {
      // 開始指定あり：事前パスで予約済みの配置を使う
      res = pinnedResults.get(task.id);
    } else {
      // 最早開始可能時刻：開始時間の指定（manualStart）があればそれを優先し、
      // 起点・完了実績の下限（doneFloor）より前でも指定どおりに置く。
      // 同視点の前ステップ終了（工程順）と他タスクの占有時間は常に守る。
      let eTs = baseTsOf(assignee);
      if (lastEndByAssignee[assignee] && lastEndByAssignee[assignee] > eTs) eTs = lastEndByAssignee[assignee];
      if (task.manualStart) {
        const ms = new Date(task.manualStart);
        if (!isNaN(ms.getTime())) {
          eTs = startOfDay(ms).getTime() + (ms.getHours() * 60 + ms.getMinutes()) * 60000;
        }
      }
      if (vpLastEnd[vkey] && vpLastEnd[vkey] > eTs) eTs = vpLastEnd[vkey];
      res = fillTaskSlots(task, eTs, effectiveDuration(task));
    }
    const { slots, meTs, meDate, meMin } = res;

    if (slots.length === 0) {
      return { ...task, scheduledStart: null, scheduledEnd: null, slots: [], remainingHours };
    }
    const last = slots[slots.length - 1];
    // 終了予定の指定があれば、表示上の終了・後続の開始下限ともにその時刻にする
    let endDate = last.date, endMin = last.endMin;
    let endTs = endDate.getTime() + endMin * 60000;
    if (meTs) {
      endDate = meDate; endMin = meMin; endTs = meTs;
    }
    vpLastEnd[vkey] = Math.max(vpLastEnd[vkey] || 0, endTs);
    // 次のタスク（開始指定なし）はこのタスクの終了予定に続けて配置する
    lastEndByAssignee[assignee] = Math.max(lastEndByAssignee[assignee] || 0, endTs);
    return {
      ...task,
      scheduledStart: slots[0].date,
      scheduledStartMin: slots[0].startMin,
      scheduledEnd: endDate,
      scheduledEndMin: endMin,
      slots, remainingHours,
    };
  });

  // 確認待ち（done のうち reviewState==='waiting'）と、確認も済んだ完了（完了タブ表示用）に分ける
  const review = done.filter(t => t.reviewState === 'waiting');
  const doneFinal = done.filter(t => t.reviewState !== 'waiting');
  return { active: scheduled, done, review, doneFinal, suspended };
}

// 予測遅延の事前検知：終了予定（スケジューラ計算）が実効納期（個別＞全体）を超える見込みの
// 視点を抽出する。納期が本日以前のものは既存の赤警告（間に合わない恐れ）が担当するため、
// ここでは「納期はまだ先なのに、このままだと超過する」ものだけを返す（早期警告）。
function computeLateRisks(activeScheduled, now) {
  const todayYmd = fmtYMD(now);
  const map = new Map(); // `${案件}::${視点}` → 集計
  for (const t of activeScheduled) {
    const dl = (t.deadline || t.projectDeadline || '').trim();
    if (!dl || !t.scheduledEnd) continue;
    const key = `${t.projectName || ''}::${t.viewpointName || ''}`;
    const endTs = t.scheduledEnd.getTime() + (t.scheduledEndMin || 0) * 60000;
    const e = map.get(key) || {
      projectName: t.projectName || '', projectNameInternal: t.projectNameInternal || '',
      viewpointName: t.viewpointName || '', assignee: t.assignee || '', deadline: dl, endTs: 0,
    };
    if (endTs > e.endTs) { e.endTs = endTs; e.assignee = t.assignee || e.assignee; }
    if (dl < e.deadline) e.deadline = dl;
    map.set(key, e);
  }
  const out = [];
  for (const e of map.values()) {
    if (e.deadline <= todayYmd) continue; // 本日・超過分は赤警告側
    const endYmd = fmtYMD(new Date(e.endTs));
    if (endYmd <= e.deadline) continue;
    const lateDays = Math.round((parseYMD(endYmd).getTime() - parseYMD(e.deadline).getTime()) / 86400000);
    out.push({ ...e, endYmd, lateDays });
  }
  return out.sort((a, b) => b.lateDays - a.lateDays || (a.deadline < b.deadline ? -1 : 1));
}

// 担当者×営業日の空き時間（h）を集計する（カレンダーの空き時間サマリー用）。
// スケジュール済みスロットを予約として引き、休日・不在・残業枠も考慮する
// （dayFreeIntervals と同じ規則）。numDays ぶんの営業日を今日から数える。
function computeFreeHours(activeScheduled, settings, assignees, now, numDays) {
  const busyMap = {};
  for (const t of activeScheduled) {
    for (const slot of (t.slots || [])) {
      const a = t.assignee || '';
      if (!busyMap[a]) busyMap[a] = new Map();
      const ymd = fmtYMD(slot.date);
      if (!busyMap[a].has(ymd)) busyMap[a].set(ymd, []);
      busyMap[a].get(ymd).push([slot.startMin, slot.endMin]);
    }
  }
  const days = [];
  let d = startOfDay(now);
  let guard = 0;
  while (days.length < numDays && guard++ < 120) {
    if (!isNonWorkingDay(d)) days.push(new Date(d));
    d = addDays(d, 1);
  }
  const absences = settings.absences || [];
  const byAssignee = {};
  for (const a of assignees) {
    byAssignee[a] = days.map(day => {
      const free = dayFreeIntervals(a, day, settings, busyMap, absences);
      return free.reduce((s, [fs, fe]) => s + (fe - fs), 0) / 60;
    });
  }
  return { days, byAssignee };
}

// 視点（ステップ群）の完了実績（actualEnd）のうち最も遅い時刻を返す。
// 編集フォームの「終了時間」を、終了時間指定が無くても完了済みの実終了時刻で埋めるために使う。
function latestActualEnd(steps) {
  let latest = '';
  for (const t of (steps || [])) {
    if (!t.actualEnd) continue;
    if (!latest || new Date(t.actualEnd).getTime() > new Date(latest).getTime()) latest = t.actualEnd;
  }
  return latest;
}

// 完了タスクのカレンダー表示用スロット：実終了時刻（actualEnd、無ければ completedAt）から
// 制作時間ぶん営業時間を遡って配置する。同担当者の完了タスク同士は重ならないよう後ろから詰める
function buildDoneSlots(doneTasks, settings) {
  const out = [];
  const busy = {};
  const addBusy = (assignee, date, s, e) => {
    if (!busy[assignee]) busy[assignee] = new Map();
    const ymd = fmtYMD(date);
    if (!busy[assignee].has(ymd)) busy[assignee].set(ymd, []);
    busy[assignee].get(ymd).push([s, e]);
  };
  const items = [];
  for (const t of doneTasks) {
    if (!(t.hours > 0)) continue;
    let end = null;
    if (t.actualEnd) { const d = new Date(t.actualEnd); if (!isNaN(d.getTime())) end = d; }
    if (!end && t.completedAt) { const d = new Date(t.completedAt); if (!isNaN(d.getTime())) end = d; }
    if (!end) continue;
    items.push({ t, end });
  }
  // 終了時刻の遅いものから後ろ詰め。同時刻完了は後工程ほど終了側に置く
  items.sort((a, b) => (b.end - a.end) || ((b.t.stepOrder || 0) - (a.t.stepOrder || 0)) || ((b.t.createdAt || 0) - (a.t.createdAt || 0)));
  for (const { t, end } of items) {
    let remainingMin = t.hours * 60;
    const slots = [];
    let date = startOfDay(end);
    const endDate = new Date(date);
    const endMin = end.getHours() * 60 + end.getMinutes();
    let guard = 0;
    while (remainingMin > 0 && guard++ < 1000) {
      const free = dayFreeIntervals(t.assignee, date, settings, busy, settings.absences || []);
      const isLast = isSameDay(date, endDate);
      for (let i = free.length - 1; i >= 0 && remainingMin > 0; i--) {
        const fs = free[i][0];
        const fe = isLast ? Math.min(free[i][1], endMin) : free[i][1];
        if (fe <= fs) continue;
        const use = Math.min(remainingMin, fe - fs);
        slots.unshift({ date: new Date(date), startMin: fe - use, endMin: fe, hours: use / 60 });
        addBusy(t.assignee, date, fe - use, fe);
        remainingMin -= use;
      }
      date = addDays(date, -1);
    }
    for (const slot of slots) out.push({ task: t, slot, done: true });
  }
  return out;
}

// 登録されている残業の最遅終了時刻（分）。カレンダーの時間軸の拡張に使う
function maxOvertimeEndMin(settings) {
  let max = 0;
  for (const o of (settings.overtimes || [])) {
    if (o && o.startTime && o.endTime) max = Math.max(max, timeToMin(o.endTime));
  }
  return max;
}

// 経過進捗（時間経過ベース）：slots のうち現在時刻 now より前の部分の合計時間（h）
function elapsedHoursForSlots(slots, now) {
  if (!slots || slots.length === 0) return 0;
  const nowTs = now.getTime();
  let h = 0;
  for (const slot of slots) {
    const dayTs = startOfDay(slot.date).getTime();
    const startTs = dayTs + slot.startMin * 60000;
    const endTs = dayTs + slot.endMin * 60000;
    if (nowTs >= endTs) h += (slot.endMin - slot.startMin) / 60;
    else if (nowTs > startTs) h += (nowTs - startTs) / 3600000;
  }
  return h;
}
// 2つの時刻の間の「営業時間（稼働時間）」を担当者ベースで合計（土日・休日・不在を除外）
function workingHoursBetweenTs(fromTs, toTs, assignee, settings) {
  if (toTs <= fromTs) return 0;
  let total = 0;
  let d = startOfDay(new Date(fromTs));
  const lastDay = startOfDay(new Date(toTs)).getTime();
  let guard = 0;
  while (d.getTime() <= lastDay && guard++ < 100000) {
    const free = dayFreeIntervals(assignee, d, settings, {}, settings.absences || []);
    const dayTs = d.getTime();
    for (const [s, e] of free) {
      const segS = dayTs + s * 60000, segE = dayTs + e * 60000;
      const lo = Math.max(segS, fromTs), hi = Math.min(segE, toTs);
      if (hi > lo) total += (hi - lo) / 3600000;
    }
    d = addDays(d, 1);
  }
  return total;
}

// タスク群（案件・視点など）の進行中案件の最終 scheduledEnd を timestamp で返す（無ければ null）
function projectEndTs(tasks) {
  let best = null;
  for (const t of tasks) {
    if (t.status === 'done' || !t.scheduledEnd) continue;
    const ts = startOfDay(t.scheduledEnd).getTime() + (t.scheduledEndMin || 0) * 60000;
    if (best == null || ts > best) best = ts;
  }
  return best;
}

// 編集中に「フォーム由来として除外すべき既存タスクID」を集める
function formEditIds(form) {
  const s = new Set();
  for (const vp of (form.viewpoints || [])) for (const st of (vp.steps || [])) if (st.taskId) s.add(st.taskId);
  return s;
}

// フォーム内容を、スケジュール計算に使える簡易タスクレコード群へ変換（プレビュー／確認用）
function formPreviewRecords(form, defaultPriority, taskById) {
  let priority = parseInt(form.priority, 10);
  if (isNaN(priority) || priority < 1) priority = defaultPriority;
  const records = [];
  let seq = 0;
  for (const vp of (form.viewpoints || [])) {
    const vpName = (vp.viewpointName || '').trim() || '視点';
    const vpAssignee = (vp.assignee || '').trim() || (form.assignee || '').trim();
    const vpFirstIdx = records.length;
    for (const step of (vp.steps || [])) {
      const hoursStr = (step.hours === undefined || step.hours === null) ? '' : String(step.hours);
      const stepHours = hoursStr.trim() === '' ? 0 : parseHM(hoursStr);
      if (isNaN(stepHours) || stepHours <= 0) continue; // 制作時間のあるステップのみスケジュール対象
      const completedRaw = (step.completedHours === '' || step.completedHours == null) ? 0 : parseHM(step.completedHours);
      // 完了済みステップ（完了時間≧制作時間）は登録時に done のままになるためスケジュール対象外
      if (!isNaN(completedRaw) && completedRaw >= stepHours) continue;
      const stepAssignee = (step.assignee || '').trim() || vpAssignee;
      records.push({
        id: `__preview-${seq}`,
        projectName: (form.projectName || '').trim(),
        companyName: (form.companyName || '').trim(),
        viewpointName: vpName,
        assignee: stepAssignee,
        priority,
        hours: stepHours,
        completedHours: isNaN(completedRaw) ? 0 : completedRaw,
        stepOrder: seq,
        // 既存タスクのステップ個別の開始・終了指定を引き継ぐ（実スケジュールと同条件にする）
        manualStart: (step.taskId && taskById && taskById.get(step.taskId)?.manualStart) || null,
        manualEnd: (step.taskId && taskById && taskById.get(step.taskId)?.manualEnd) || null,
        status: 'pending',
        createdAt: 1e15 + seq, // 同優先順位の既存タスクより後ろに並べる
      });
      seq++;
    }
    // 視点ごとの開始時間・終了時間：この視点の最初／最後のレコードに登録・解除（buildRecords と同じ規則）
    if (records.length > vpFirstIdx) {
      records[vpFirstIdx].manualStart = vp.manualStart || null;
      records[records.length - 1].manualEnd = vp.manualEnd || null;
    }
  }
  return { records, priority };
}

// フォーム内容を実データに混ぜて scheduleTasks し、フォーム分の開始・終了予定と
// 納期チェック（視点の終了予定が納期を超えていないか）の結果を返す
function simulateFormSchedule(form, allTasks, settings, projectOrder, now) {
  const editIds = formEditIds(form);
  // 優先順位は廃止。プレビューも実登録と同じく「同じ会社の中で納期（実効）の早い順」で既定位置を決める。
  const companyName = (form.companyName || '').trim();
  const activeSameCompany = allTasks.filter(t => t.status !== 'done' && !editIds.has(t.id) && (t.companyName || '') === companyName);
  const dlKey = Math.min(...(form.viewpoints || []).map(v => deadlineKey((v.deadline || '').trim() || (form.projectDeadline || '').trim())));
  const defaultPriority = deadlineInsertPriority(activeSameCompany, dlKey);
  const taskById = new Map(allTasks.map(t => [t.id, t]));
  const { records } = formPreviewRecords(form, defaultPriority, taskById);
  if (records.length === 0) return null;
  // 完了タスクは編集中でも常に含める（実績＝doneFloor はフォームでは変わらないため）。
  // 除外は編集中のアクティブなレコードのみ
  const others = allTasks.filter(t => t.status === 'done' || !editIds.has(t.id));
  const result = scheduleTasks([...others, ...records], settings, projectOrder, now);
  const pids = new Set(records.map(r => r.id));
  const ps = result.active.filter(t => pids.has(t.id) && t.scheduledStart);
  if (ps.length === 0) return null;
  let sBest = null, eBest = null, sD = null, sM = 0, eD = null, eM = 0;
  // 視点ごとの最遅終了（納期チェック用）
  const vpEnds = new Map();
  for (const t of ps) {
    const sTs = t.scheduledStart.getTime() + (t.scheduledStartMin || 0) * 60000;
    const eTs = t.scheduledEnd.getTime() + (t.scheduledEndMin || 0) * 60000;
    if (sBest == null || sTs < sBest) { sBest = sTs; sD = t.scheduledStart; sM = t.scheduledStartMin; }
    if (eBest == null || eTs > eBest) { eBest = eTs; eD = t.scheduledEnd; eM = t.scheduledEndMin; }
    const cur = vpEnds.get(t.viewpointName);
    if (!cur || eTs > cur.endTs) vpEnds.set(t.viewpointName, { endTs: eTs, endDate: t.scheduledEnd, endMin: t.scheduledEndMin });
  }
  let moved = false, requested = null;
  // 視点ごとの開始指定のうち最も早いものを「指定時刻」として押し出し判定する
  let reqTs = null;
  for (const vp of (form.viewpoints || [])) {
    if (!vp.manualStart) continue;
    const ms = new Date(vp.manualStart);
    if (isNaN(ms.getTime())) continue;
    const ts = startOfDay(ms).getTime() + (ms.getHours() * 60 + ms.getMinutes()) * 60000;
    if (reqTs == null || ts < reqTs) {
      reqTs = ts;
      requested = { date: startOfDay(ms), min: ms.getHours() * 60 + ms.getMinutes() };
    }
  }
  if (reqTs != null) moved = sBest > reqTs;
  // 納期チェック：視点の終了予定（日付）が納期（日付）より後なら違反
  const deadlineViolations = [];
  for (const vp of (form.viewpoints || [])) {
    // 実効納期＝個別（視点）＞全体（案件）
    const dl = ((vp.deadline || '').trim() || (form.projectDeadline || '').trim());
    if (!dl) continue;
    const name = (vp.viewpointName || '').trim() || '視点';
    const r = vpEnds.get(name);
    if (!r) continue;
    if (fmtYMD(r.endDate) > dl) {
      deadlineViolations.push({ viewpointName: name, deadline: dl, endDate: r.endDate, endMin: r.endMin });
    }
  }
  return { startDate: sD, startMin: sM, endDate: eD, endMin: eM, moved, requested, deadlineViolations };
}

// 納期超過の新規/編集案件に対する「繰り上げ（並べ替え）提案」を算出する。
// - sameBump : 同じ担当者の案件の中だけで、納期がこの案件より遅い案件の前へ繰り上げる案（推奨）
// - globalBump: 担当者・会社をまたいで全体の先頭へ繰り上げる案（同じ担当者内で解決できない時の提案）
// それぞれ実スケジュールで再試算し、この案件の納期超過が解消する場合のみ返す（解消しなければ null）。
function computeDeadlineReorder(form, allTasks, settings, projectOrder, now) {
  const P = (form.projectName || '').trim();
  if (!P) return null;
  const editIds = formEditIds(form);
  const activeOthers = allTasks.filter(t => t.status !== 'done' && !editIds.has(t.id));
  const baseNames = computeProjectOrder(activeOthers, projectOrder);
  const namesWithP = baseNames.includes(P) ? baseNames.slice() : [...baseNames, P];

  // この案件の実効納期（フォームの視点の最早）
  const pDlKey = Math.min(...(form.viewpoints || []).map(v =>
    deadlineKey((v.deadline || '').trim() || (form.projectDeadline || '').trim())));
  // この案件の担当者集合
  const pAssignees = new Set();
  for (const v of (form.viewpoints || [])) {
    const a = (v.assignee || form.assignee || '').trim();
    if (a) pAssignees.add(a);
  }

  // 既存案件 → 担当者集合・実効納期
  const projMeta = new Map();
  for (const t of activeOthers) {
    const p = t.projectName || '';
    if (!projMeta.has(p)) projMeta.set(p, { assignees: new Set(), dlKey: Infinity });
    const m = projMeta.get(p);
    if (t.assignee) m.assignees.add(t.assignee);
    const k = effectiveDeadlineKey(t);
    if (k < m.dlKey) m.dlKey = k;
  }
  const sharesAssignee = (proj) => {
    const m = projMeta.get(proj); if (!m) return false;
    for (const a of pAssignees) if (m.assignees.has(a)) return true;
    return false;
  };

  // P を抜いて、beforeProj の直前（null なら先頭）へ挿入した完全順リスト
  const moveP = (beforeProj) => {
    const without = namesWithP.filter(n => n !== P);
    const idx = beforeProj ? without.indexOf(beforeProj) : 0;
    const at = idx < 0 ? 0 : idx;
    return [...without.slice(0, at), P, ...without.slice(at)];
  };
  const simResolves = (order) => {
    const sim = simulateFormSchedule(form, allTasks, settings, order, now);
    if (sim && (sim.deadlineViolations || []).length === 0) return sim;
    return null;
  };

  // 同じ担当者の中で、P より前にある「P より納期が遅い」最初の案件の直前へ繰り上げ
  let sameBump = null, sameTarget = null;
  for (const n of namesWithP) {
    if (n === P) break;
    if (sharesAssignee(n) && (projMeta.get(n)?.dlKey ?? Infinity) > pDlKey) { sameTarget = n; break; }
  }
  if (sameTarget) {
    const order = moveP(sameTarget);
    const sim = simResolves(order);
    if (sim) sameBump = { order, target: sameTarget, endDate: sim.endDate, endMin: sim.endMin };
  }

  // 全体の先頭へ繰り上げ（同じ担当者内で解決できない時の提案）
  let globalBump = null;
  if (!sameBump) {
    const order = moveP(null);
    const sim = simResolves(order);
    if (sim) globalBump = { order, endDate: sim.endDate, endMin: sim.endMin };
  }

  if (!sameBump && !globalBump) return null;
  return { sameBump, globalBump };
}


function sortAssigneesByMaster(names, masterNames) {
  const idx = new Map((masterNames || []).map((n, i) => [n, i]));
  return [...names].sort((a, b) => {
    const ia = idx.has(a) ? idx.get(a) : Infinity;
    const ib = idx.has(b) ? idx.get(b) : Infinity;
    return ia - ib; // 同点（両方未登録）は安定ソートで出現順を維持
  });
}

// ============ 視点ごとにグループ化 ============
// 第2引数 vpDeliveryCount（任意）：project::viewpoint → 納品ステップ数 の Map。
// 渡されると「視点の全タスク（active+done＝移行済みの請求専用ステップ含む）」を横断した
// 正確な納品回数を使う。未指定ならグループ内（＝渡された tasks 範囲）のみで数える。
function groupByViewpoint(tasks, vpDeliveryCount) {
  const groups = {};
  for (const task of tasks) {
    const key = `${task.assignee}::${task.projectName}::${task.viewpointName}`;
    if (!groups[key]) {
      groups[key] = {
        key,
        projectName: task.projectName,
        projectNameInternal: task.projectNameInternal || '',
        companyName: task.companyName || '',
        customerContact: task.customerContact || '',
        viewpointName: task.viewpointName,
        viewpointNameExternal: task.viewpointNameExternal || '',
        viewpointCategory: task.viewpointCategory || '',
        assignee: task.assignee,
        memo: task.memo || '',
        tentative: !!task.tentative,
        tentativeStart: task.tentativeStart || '',
        tentativeEnd: task.tentativeEnd || '',
        deadline: task.deadline || '',                       // 実効納期（後で個別＞全体で確定）
        individualDeadline: task.deadline || '',             // 個別納期（視点）
        projectDeadline: task.projectDeadline || '',         // 全体納期（案件）
        tasks: [],
        minPriority: task.priority,
      };
    }
    groups[key].tasks.push(task);
    if (!groups[key].memo && task.memo) groups[key].memo = task.memo;
    if (task.tentative) groups[key].tentative = true;
    if (!groups[key].tentativeStart && task.tentativeStart) groups[key].tentativeStart = task.tentativeStart;
    if (!groups[key].tentativeEnd && task.tentativeEnd) groups[key].tentativeEnd = task.tentativeEnd;
    if (task.deadline && (!groups[key].individualDeadline || task.deadline < groups[key].individualDeadline)) groups[key].individualDeadline = task.deadline;
    if (task.projectDeadline && !groups[key].projectDeadline) groups[key].projectDeadline = task.projectDeadline;
    if (!groups[key].viewpointNameExternal && task.viewpointNameExternal) groups[key].viewpointNameExternal = task.viewpointNameExternal;
    if (!groups[key].viewpointCategory && task.viewpointCategory) groups[key].viewpointCategory = task.viewpointCategory;
    if (task.priority < groups[key].minPriority) groups[key].minPriority = task.priority;
  }
  // 各グループ内：stepOrder → priority → createdAt の順
  for (const g of Object.values(groups)) {
    // 実効納期＝個別（視点）＞全体（案件）
    g.deadline = g.individualDeadline || g.projectDeadline || '';
    g.tasks.sort((a, b) => {
      const ao = a.stepOrder == null ? -1 : a.stepOrder;
      const bo = b.stepOrder == null ? -1 : b.stepOrder;
      if (ao !== bo) return ao - bo;
      return (a.priority - b.priority) || (a.createdAt - b.createdAt);
    });
    g.totalHours = g.tasks.reduce((s, t) => s + (t.hours || 0), 0);
    g.completedHours = g.tasks.reduce((s, t) => s + (t.completedHours || 0), 0);
    g.remainingHours = g.totalHours - g.completedHours;
    // 視点メタ（制作履歴・納品名・集計フラグ）。タスクに複製保存されたものを集約。
    const meta = metaFromGroup(g);
    g.prodHistory = meta.history;
    g.deliveryNameOverride = meta.deliveryNameOverride;
    g.countAsDelivery = meta.countAsDelivery;
    // 納品名のベースは「社外視点名」優先（無ければ社内視点名）
    const base = deliveryBaseName(g.projectName, g.viewpointNameExternal || g.viewpointName, meta.deliveryNameOverride);
    g.deliveryBaseName = base;
    // 納品回数＝納品種類（初回/追加）のステップ数。種類が空（''）や修正(fix)は数えない。
    // vpDeliveryCount があれば視点の全タスク（移行済みの完了ステップ含む）を横断した値を使う。
    const pvKey = `${g.projectName || ''}::${g.viewpointName || ''}`;
    const dcnt = vpDeliveryCount
      ? (vpDeliveryCount.get(pvKey) || 0)
      : g.tasks.filter(t => { const rt = (t.stepRoundType || '').trim(); return rt && roundTypeOf(rt).isDelivery; }).length;
    g.deliveryCount = dcnt;
    g.deliveryName = deliveryNameForNumber(base, dcnt > 1 ? dcnt : 1);
    // 視点全体の開始～終了
    const validSlots = g.tasks.filter(t => t.scheduledStart && t.scheduledEnd);
    if (validSlots.length > 0) {
      g.scheduledStart = validSlots[0].scheduledStart;
      g.scheduledStartMin = validSlots[0].scheduledStartMin;
      const last = validSlots[validSlots.length - 1];
      g.scheduledEnd = last.scheduledEnd;
      g.scheduledEndMin = last.scheduledEndMin;
    }
  }
  return Object.values(groups).sort((a, b) => a.minPriority - b.minPriority);
}




return { migrateTask, normalizePriorities, scheduleTasks, computeProjectOrder, compareCompanyDisplay, sortAssigneesByMaster, syncHolidays, isNonWorkingDay, DEFAULT_SETTINGS, fmtYMD, parseYMD, addDays, startOfDay, minToTime, dayName };
})();

// ---- line-bot/bot.js（LINE Bot 本体。Google Apps Script 上で動く）----
// LINE で決まった言葉（本日納期・今週納期・全体納期・案件一覧・スケジュール など）を受け取ると、
// Firestore の工程図データを読み、アプリと同じスケジュール計算（KouteiLib）で返信を組み立てる。
// 設定値（スクリプトプロパティ）:
//   LINE_CHANNEL_ACCESS_TOKEN … LINE Developers で発行したチャネルアクセストークン（長期）
//   REGISTER_CODE             … トーク/グループを登録するための合言葉
//   ALLOWED_IDS               … 登録済みのトーク/グループID（Bot が自動で書き込む）

var BOT_CONFIG = {
  PROJECT_ID: 'koutei-zu',
  DATABASE_ID: 'default',
  WORKSPACE_ID: 'liebe-asia-team',
  MAX_MESSAGES: 5,     // LINE の1回の返信で送れる吹き出しの上限
  MAX_CHARS: 4800,     // 吹き出し1つの文字数上限（LINE の上限 5000 に余裕を持たせる）
  MAX_REGISTER_FAILS: 5, // 合言葉の失敗がこの回数を超えたら1時間受け付けない
};

// ============ 受信口（LINE の Webhook） ============
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    (body.events || []).forEach(function (ev) {
      try { handleEvent_(ev); } catch (err) { console.error('イベント処理エラー:', err && err.stack ? err.stack : err); }
    });
  } catch (err) {
    console.error('受信データの解析エラー:', err && err.stack ? err.stack : err);
  }
  // 返信は LINE の Reply API で送る。ここでは工程図のデータを一切返さない。
  return ContentService.createTextOutput('OK');
}

function handleEvent_(ev) {
  var token = ev.replyToken;
  var sourceId = sourceIdOf_(ev.source);
  if (ev.type === 'join' || ev.type === 'follow') {
    reply_(token, ['工程図Botです。\n最初に「登録 合言葉」と送信して、このトークを登録してください。\n登録後に「ヘルプ」と送ると使い方を表示します。']);
    return;
  }
  if (ev.type !== 'message' || !ev.message || ev.message.type !== 'text') return;

  var text = String(ev.message.text || '').normalize('NFKC').trim();
  var compact = text.replace(/\s+/g, '');
  if (compact === '登録解除') {
    if (isAllowed_(sourceId)) removeAllowedId_(sourceId);
    reply_(token, ['このトークの登録を解除しました。']);
    return;
  }
  var reg = text.match(/^登録[\s:：]*(.+)$/);
  if (reg) { handleRegister_(token, sourceId, reg[1].trim()); return; }

  var cmd = parseCommand_(text);
  if (!cmd) return; // 決まった言葉以外には反応しない（グループの会話の邪魔をしない）
  if (!isAllowed_(sourceId)) {
    reply_(token, ['このトークはまだ登録されていません。\n「登録 合言葉」と送信してください。']);
    return;
  }
  if (cmd.type === 'help') { reply_(token, [helpText_()]); return; }

  var out;
  try {
    out = buildReply_(cmd, loadData_(), new Date());
  } catch (err) {
    console.error('データ取得エラー:', err && err.stack ? err.stack : err);
    out = 'データの取得に失敗しました。時間をおいてもう一度お試しください。\n（管理者向け: ' + String(err && err.message || err).slice(0, 200) + '）';
  }
  reply_(token, splitMessages_(out));
}

function sourceIdOf_(source) {
  if (!source) return '';
  return source.groupId || source.roomId || source.userId || '';
}

// ============ 言葉（コマンド）の判定 ============
function parseCommand_(raw) {
  var t = String(raw || '').normalize('NFKC').trim();
  var c = t.replace(/\s+/g, '');
  if (/^(ヘルプ|使い方|つかいかた|コマンド|help|\?)$/i.test(c)) return { type: 'help' };
  if (/^(本日|今日|きょう)の?納期$/.test(c)) return { type: 'deadline', range: 'today' };
  if (/^(明日|あした)の?納期$/.test(c)) return { type: 'deadline', range: 'tomorrow' };
  if (/^今週の?納期$/.test(c)) return { type: 'deadline', range: 'thisWeek' };
  if (/^来週の?納期$/.test(c)) return { type: 'deadline', range: 'nextWeek' };
  if (/^(全体の?納期|納期一覧)$/.test(c)) return { type: 'deadline', range: 'all' };
  if (/^(案件一覧|進行中案件|案件リスト)$/.test(c)) return { type: 'projects' };
  var m = t.match(/^(本日|今日|きょう|明日|あした)?の?\s*スケジュール(.*)$/);
  if (m) {
    return {
      type: 'schedule',
      dayOffset: /明日|あした/.test(m[1] || '') ? 1 : 0,
      assignee: (m[2] || '').replace(/^[\s:：の]+/, '').trim(),
    };
  }
  return null;
}

function helpText_() {
  return [
    '【工程図Bot 使い方】',
    '次の言葉を送ると、工程図の最新情報をお返しします。',
    '',
    '・本日納期 … 今日が納期の案件',
    '・明日納期',
    '・今週納期 … 今週日曜までの納期',
    '・来週納期',
    '・全体納期 … 納期が決まっている全案件',
    '・案件一覧 … 進行中の案件（会社別）',
    '・スケジュール … 今日の担当者別の予定',
    '・明日のスケジュール',
    '・スケジュール 山田 … 担当者で絞り込み',
    '・ヘルプ … この案内',
    '',
    '※「完了見込み」はアプリと同じ計算による予定です。',
  ].join('\n');
}

// ============ 登録（合言葉） ============
function props_() { return PropertiesService.getScriptProperties(); }

function getAllowedIds_() {
  try { return JSON.parse(props_().getProperty('ALLOWED_IDS') || '[]'); } catch (e) { return []; }
}
function isAllowed_(id) { return !!id && getAllowedIds_().indexOf(id) >= 0; }
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function addAllowedId_(id) {
  withLock_(function () {
    var ids = getAllowedIds_();
    if (ids.indexOf(id) < 0) { ids.push(id); props_().setProperty('ALLOWED_IDS', JSON.stringify(ids)); }
  });
}
function removeAllowedId_(id) {
  withLock_(function () {
    var ids = getAllowedIds_().filter(function (x) { return x !== id; });
    props_().setProperty('ALLOWED_IDS', JSON.stringify(ids));
  });
}

function handleRegister_(token, sourceId, code) {
  var expected = props_().getProperty('REGISTER_CODE');
  if (!expected) { reply_(token, ['合言葉（REGISTER_CODE）が設定されていません。管理者に連絡してください。']); return; }
  if (!sourceId) return;
  var cache = CacheService.getScriptCache();
  var failKey = 'regfail_' + sourceId;
  var fails = Number(cache.get(failKey) || 0);
  if (fails >= BOT_CONFIG.MAX_REGISTER_FAILS) {
    reply_(token, ['合言葉の入力に続けて失敗したため、1時間ほど受け付けを停止しています。']);
    return;
  }
  if (code !== expected) {
    cache.put(failKey, String(fails + 1), 3600);
    reply_(token, ['合言葉が違います。']);
    return;
  }
  cache.remove(failKey);
  addAllowedId_(sourceId);
  reply_(token, ['登録しました。\n\n' + helpText_()]);
}

// ============ Firestore からの読み込み ============
function loadData_() {
  var L = KouteiLib;
  var docsRoot = 'projects/' + BOT_CONFIG.PROJECT_ID + '/databases/' + BOT_CONFIG.DATABASE_ID + '/documents';
  var wsPath = docsRoot + '/workspaces/' + BOT_CONFIG.WORKSPACE_ID;
  var api = 'https://firestore.googleapis.com/v1/';
  var keys = ['settings', 'holidays', 'absences', 'projectOrder', 'employeeMaster'];
  var base = {
    method: 'post',
    contentType: 'application/json',
    // X-Goog-User-Project: GAS 既定のプロジェクトではなく koutei-zu の Firestore API 枠を使う
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Goog-User-Project': BOT_CONFIG.PROJECT_ID },
    muteHttpExceptions: true,
  };
  // 完了（done）のタスクはスケジュール計算に影響しないため、未完了だけを読む（読み取り件数の節約）
  var res = UrlFetchApp.fetchAll([
    Object.assign({ url: api + wsPath + ':runQuery' }, base, {
      payload: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'tasks' }],
          where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'pending' } } },
        },
      }),
    }),
    Object.assign({ url: api + docsRoot + ':batchGet' }, base, {
      payload: JSON.stringify({ documents: keys.map(function (k) { return wsPath + '/data/' + k; }) }),
    }),
  ]);
  res.forEach(function (r) {
    if (r.getResponseCode() !== 200) {
      throw new Error('Firestore ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
    }
  });

  var rawTasks = JSON.parse(res[0].getContentText())
    .filter(function (r) { return r.document; })
    .map(function (r) { return fromFields_(r.document.fields || {}); });
  var kv = {};
  JSON.parse(res[1].getContentText()).forEach(function (r) {
    if (!r.found) return;
    var name = r.found.name;
    kv[name.slice(name.lastIndexOf('/') + 1)] = fromValue_((r.found.fields || {}).value);
  });
  var parseArr = function (key) { var v = parseJson_(kv[key]); return Array.isArray(v) ? v : []; };
  var savedSettings = parseJson_(kv.settings) || {};

  var settings = Object.assign({}, L.DEFAULT_SETTINGS, savedSettings, {
    holidays: parseArr('holidays'),
    absences: parseArr('absences'),
  });
  L.syncHolidays(settings);
  var tasks = L.normalizePriorities(rawTasks.map(L.migrateTask));
  var projectOrder = parseArr('projectOrder');
  var now = new Date();
  var scheduled = L.scheduleTasks(tasks, settings, projectOrder, now);
  return {
    settings: settings,
    scheduled: scheduled,
    projectOrder: projectOrder,
    assigneeOrder: parseArr('employeeMaster').map(function (e) { return e && e.name; }).filter(Boolean),
  };
}

function parseJson_(s) {
  if (typeof s !== 'string' || !s) return null;
  try { return JSON.parse(s); } catch (e) { return null; }
}

function fromFields_(fields) {
  var out = {};
  Object.keys(fields).forEach(function (k) { out[k] = fromValue_(fields[k]); });
  return out;
}
function fromValue_(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return fromFields_(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue_);
  return null;
}

// ============ 返信文の組み立て ============
function buildReply_(cmd, data, now) {
  if (cmd.type === 'deadline') return buildDeadlineReply_(cmd.range, data, now);
  if (cmd.type === 'projects') return buildProjectsReply_(data);
  if (cmd.type === 'schedule') return buildScheduleReply_(cmd, data, now);
  return helpText_();
}

function ymdOf_(s) {
  var m = String(s || '').trim().match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : '';
}
function mdw_(ymd) {
  var d = KouteiLib.parseYMD(ymd);
  return d ? (d.getMonth() + 1) + '/' + d.getDate() + '(' + KouteiLib.dayName(d) + ')' : ymd;
}
function tsLabel_(ts) {
  var d = new Date(ts);
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + KouteiLib.minToTime(d.getHours() * 60 + d.getMinutes());
}
function projectLabel_(v) {
  var name = v.projectName || v.projectNameInternal || '（案件名なし）';
  return v.companyName ? name + '（' + v.companyName + '）' : name;
}

// 未完了タスクを「案件×視点」単位にまとめる（納期は 視点の納期 ＞ 全体納期）
function viewpointsOf_(active) {
  var map = new Map();
  active.forEach(function (t) {
    var key = (t.projectName || '') + '::' + (t.viewpointName || '');
    var v = map.get(key);
    if (!v) {
      v = {
        projectName: t.projectName || '', projectNameInternal: t.projectNameInternal || '',
        companyName: t.companyName || '', viewpointName: t.viewpointName || '',
        assignees: [], deadline: '', projectDeadline: '', endTs: null,
      };
      map.set(key, v);
    }
    var dl = ymdOf_(t.deadline || t.projectDeadline);
    if (dl && (!v.deadline || dl < v.deadline)) v.deadline = dl;
    var pdl = ymdOf_(t.projectDeadline);
    if (pdl && (!v.projectDeadline || pdl < v.projectDeadline)) v.projectDeadline = pdl;
    if (t.assignee && v.assignees.indexOf(t.assignee) < 0) v.assignees.push(t.assignee);
    if (t.scheduledEnd) {
      var ts = t.scheduledEnd.getTime() + (t.scheduledEndMin || 0) * 60000;
      if (v.endTs == null || ts > v.endTs) v.endTs = ts;
    }
  });
  return Array.from(map.values());
}

function projectIndexer_(data) {
  var order = KouteiLib.computeProjectOrder(data.scheduled.active, data.projectOrder);
  var idx = new Map(order.map(function (n, i) { return [n, i]; }));
  return function (name) { return idx.has(name) ? idx.get(name) : Infinity; };
}

function viewpointLine_(v) {
  var parts = [' ・' + (v.viewpointName || '（視点名なし）')];
  if (v.assignees.length) parts.push('担当:' + v.assignees.join('・'));
  if (v.endTs != null) {
    var late = v.deadline && KouteiLib.fmtYMD(new Date(v.endTs)) > v.deadline;
    parts.push('完了見込み ' + tsLabel_(v.endTs) + (late ? ' ※納期に遅れる見込み' : ''));
  } else {
    parts.push('完了見込み 未定');
  }
  return parts.join('  ');
}

// 視点を案件ごとにまとめて行に展開する
function projectBlocks_(vps, projIdx) {
  var groups = new Map();
  vps.forEach(function (v) {
    var k = v.projectName + '::' + v.companyName;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(v);
  });
  var keys = Array.from(groups.keys()).sort(function (a, b) {
    var ga = groups.get(a)[0], gb = groups.get(b)[0];
    return (projIdx(ga.projectName) - projIdx(gb.projectName)) || ga.projectName.localeCompare(gb.projectName, 'ja');
  });
  var lines = [];
  keys.forEach(function (k) {
    var list = groups.get(k).sort(function (a, b) { return a.viewpointName.localeCompare(b.viewpointName, 'ja', { numeric: true }); });
    lines.push('■ ' + projectLabel_(list[0]));
    list.forEach(function (v) { lines.push(viewpointLine_(v)); });
  });
  return lines;
}

function byDateBlocks_(vps, projIdx) {
  var dates = Array.from(new Set(vps.map(function (v) { return v.deadline; }))).sort();
  var lines = [];
  dates.forEach(function (d) {
    lines.push('');
    lines.push('▼ ' + mdw_(d));
    lines = lines.concat(projectBlocks_(vps.filter(function (v) { return v.deadline === d; }), projIdx));
  });
  return lines;
}

function buildDeadlineReply_(range, data, now) {
  var L = KouteiLib;
  var today = L.startOfDay(now);
  var todayYmd = L.fmtYMD(today);
  var monday = L.addDays(today, -((today.getDay() + 6) % 7));
  var from, to, title, showOverdue, multiDay;
  if (range === 'today') {
    from = to = todayYmd; title = '本日納期 ' + mdw_(todayYmd); showOverdue = true;
  } else if (range === 'tomorrow') {
    from = to = L.fmtYMD(L.addDays(today, 1)); title = '明日納期 ' + mdw_(from);
  } else if (range === 'thisWeek') {
    from = todayYmd; to = L.fmtYMD(L.addDays(monday, 6));
    title = '今週納期 ' + mdw_(from) + '〜' + mdw_(to); showOverdue = true; multiDay = true;
  } else if (range === 'nextWeek') {
    from = L.fmtYMD(L.addDays(monday, 7)); to = L.fmtYMD(L.addDays(monday, 13));
    title = '来週納期 ' + mdw_(from) + '〜' + mdw_(to); multiDay = true;
  } else {
    from = todayYmd; to = '9999-12-31'; title = '全体納期'; showOverdue = true; multiDay = true;
  }

  var projIdx = projectIndexer_(data);
  var vps = viewpointsOf_(data.scheduled.active);
  var hits = vps.filter(function (v) { return v.deadline && v.deadline >= from && v.deadline <= to; });
  var overdue = showOverdue ? vps.filter(function (v) { return v.deadline && v.deadline < todayYmd; }) : [];

  var lines = ['【' + title + '】' + hits.length + '件'];
  if (hits.length === 0) {
    lines.push('該当する未完了の案件はありません。');
  } else if (multiDay) {
    lines = lines.concat(byDateBlocks_(hits, projIdx));
  } else {
    lines = lines.concat(projectBlocks_(hits, projIdx));
  }
  if (overdue.length) {
    lines.push('');
    lines.push('【納期を過ぎている未完了】' + overdue.length + '件');
    lines = lines.concat(byDateBlocks_(overdue, projIdx));
  }
  if (range === 'all') {
    var noDeadline = vps.filter(function (v) { return !v.deadline; }).length;
    if (noDeadline) { lines.push(''); lines.push('※納期未設定の視点が ' + noDeadline + ' 件あります。'); }
  }
  return lines.join('\n');
}

function buildProjectsReply_(data) {
  var L = KouteiLib;
  var projIdx = projectIndexer_(data);
  var vps = viewpointsOf_(data.scheduled.active);
  var projects = new Map();
  vps.forEach(function (v) {
    var p = projects.get(v.projectName);
    if (!p) {
      p = { name: v.projectName || v.projectNameInternal || '（案件名なし）', key: v.projectName, company: v.companyName, vps: [] };
      projects.set(v.projectName, p);
    }
    if (!p.company && v.companyName) p.company = v.companyName;
    p.vps.push(v);
  });
  var list = Array.from(projects.values());
  var companies = Array.from(new Set(list.map(function (p) { return p.company; })))
    .sort(function (a, b) { return L.compareCompanyDisplay(a, b, data.settings.companyOrder); });

  var lines = ['【案件一覧】進行中 ' + list.length + '件'];
  if (list.length === 0) lines.push('進行中の案件はありません。');
  companies.forEach(function (c) {
    lines.push('');
    lines.push('＜' + (c || '会社未設定') + '＞');
    list.filter(function (p) { return p.company === c; })
      .sort(function (a, b) { return projIdx(a.key) - projIdx(b.key); })
      .forEach(function (p) {
        var names = p.vps.map(function (v) { return v.viewpointName; })
          .sort(function (a, b) { return a.localeCompare(b, 'ja', { numeric: true }); });
        var shown = names.slice(0, 8).join(', ') + (names.length > 8 ? ' 他' + (names.length - 8) : '');
        var assignees = Array.from(new Set([].concat.apply([], p.vps.map(function (v) { return v.assignees; }))));
        var pdl = p.vps.map(function (v) { return v.projectDeadline; }).filter(Boolean).sort()[0];
        var vdl = p.vps.map(function (v) { return v.deadline; }).filter(Boolean).sort()[0];
        var dlText = pdl ? '全体納期 ' + mdw_(pdl) : vdl ? '最短納期 ' + mdw_(vdl) : '納期 未設定';
        var ends = p.vps.map(function (v) { return v.endTs; }).filter(function (x) { return x != null; });
        lines.push('■ ' + p.name);
        lines.push('  ' + dlText + '｜視点' + names.length + '（' + shown + '）');
        var sub = [];
        if (assignees.length) sub.push('担当 ' + assignees.join('・'));
        if (ends.length) sub.push('完了見込み ' + tsLabel_(Math.max.apply(null, ends)));
        if (sub.length) lines.push('  ' + sub.join('｜'));
      });
  });
  var suspended = Array.from(new Set((data.scheduled.suspended || []).map(function (t) { return t.projectName || t.projectNameInternal; }).filter(Boolean)));
  if (suspended.length) {
    lines.push('');
    lines.push('＜制作中断中＞ ' + suspended.join('、'));
  }
  return lines.join('\n');
}

function buildScheduleReply_(cmd, data, now) {
  var L = KouteiLib;
  var target = L.addDays(L.startOfDay(now), cmd.dayOffset || 0);
  var ymd = L.fmtYMD(target);
  var byAssignee = new Map();
  data.scheduled.active.forEach(function (t) {
    (t.slots || []).forEach(function (s) {
      if (L.fmtYMD(s.date) !== ymd) return;
      var a = t.assignee || '未割当';
      if (!byAssignee.has(a)) byAssignee.set(a, []);
      byAssignee.get(a).push({ s: s.startMin, e: s.endMin, t: t });
    });
  });
  var names = L.sortAssigneesByMaster(Array.from(byAssignee.keys()), data.assigneeOrder);
  var filter = normalizeName_(cmd.assignee);
  if (filter) names = names.filter(function (n) { return normalizeName_(n).indexOf(filter) >= 0; });

  var title = (cmd.dayOffset ? '明日' : '本日') + 'のスケジュール';
  var lines = ['【' + title + '】' + mdw_(ymd) + (cmd.assignee ? '（' + cmd.assignee + '）' : '')];
  if (names.length === 0) {
    lines.push(L.isNonWorkingDay(target) ? '休業日です。予定はありません。' : '予定はありません。');
    return lines.join('\n');
  }
  names.forEach(function (n) {
    lines.push('');
    lines.push('＜' + n + '＞');
    byAssignee.get(n).sort(function (a, b) { return a.s - b.s; }).forEach(function (x) {
      var t = x.t;
      var what = (t.projectName || t.projectNameInternal || '') + ' / ' + (t.viewpointName || '') + (t.stepName ? ' ' + t.stepName : '');
      lines.push(' ' + L.minToTime(x.s) + '-' + L.minToTime(x.e) + '  ' + what);
    });
  });
  return lines.join('\n');
}

function normalizeName_(s) {
  return String(s || '').normalize('NFKC').replace(/\s+/g, '').toLowerCase()
    .replace(/[ァ-ヶ]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0x60); });
}

// 長い返信を吹き出し（最大5つ）に分ける
function splitMessages_(text) {
  var max = BOT_CONFIG.MAX_CHARS;
  var chunks = [];
  var cur = '';
  String(text).split('\n').forEach(function (line) {
    while (line.length > max) { chunks.push(cur); cur = ''; chunks.push(line.slice(0, max)); line = line.slice(max); }
    if (cur && (cur.length + 1 + line.length) > max) { chunks.push(cur); cur = line; }
    else cur = cur ? cur + '\n' + line : line;
  });
  if (cur) chunks.push(cur);
  chunks = chunks.filter(function (c) { return c.trim(); });
  if (chunks.length > BOT_CONFIG.MAX_MESSAGES) {
    chunks = chunks.slice(0, BOT_CONFIG.MAX_MESSAGES);
    var note = '\n…（長いため以降を省略しました。続きはアプリでご確認ください）';
    var last = chunks[chunks.length - 1];
    chunks[chunks.length - 1] = last.slice(0, max - note.length) + note;
  }
  return chunks.length ? chunks : ['（表示する内容がありません）'];
}

// ============ LINE への返信 ============
function reply_(replyToken, texts) {
  var accessToken = props_().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  if (!accessToken) { console.error('LINE_CHANNEL_ACCESS_TOKEN が設定されていません'); return; }
  if (!replyToken) return;
  var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + accessToken },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: texts.slice(0, BOT_CONFIG.MAX_MESSAGES).map(function (t) { return { type: 'text', text: t }; }),
    }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    console.error('LINE 返信エラー:', res.getResponseCode(), res.getContentText());
  }
}

// ============ 管理用（GAS エディタから手動実行） ============
// 初回はこれを実行して権限を承認し、実行ログで返信内容を確認する（LINE には送らない）
function testCommands() {
  var data = loadData_();
  var now = new Date();
  ['本日納期', '今週納期', '全体納期', '案件一覧', 'スケジュール'].forEach(function (word) {
    console.log('===== ' + word + ' =====\n' + buildReply_(parseCommand_(word), data, now));
  });
}

// 登録済みのトーク/グループをすべて解除する
function clearRegisteredIds() {
  props_().setProperty('ALLOWED_IDS', '[]');
  console.log('登録をすべて解除しました');
}
