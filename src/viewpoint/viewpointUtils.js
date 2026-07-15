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

export const ROUND_TYPES = [
  { id: 'initial', label: '初回（新規制作）', short: '初回', isDelivery: true, color: '#3a7bd5' },
  { id: 'add', label: '追加制作', short: '追加', isDelivery: true, color: '#b07d3c' },
  { id: 'fix', label: '修正制作', short: '修正', isDelivery: false, color: '#7a8471' },
];
export function roundTypeOf(id) { return ROUND_TYPES.find(t => t.id === id) || ROUND_TYPES[1]; }

let _seq = 0;
export function genRoundId() {
  _seq = (_seq + 1) % 1000000;
  return `rd_${Date.now()}_${_seq}_${Math.random().toString(36).slice(2, 6)}`;
}

export function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }

export function blankRound(type = 'add', date = '') {
  return { id: genRoundId(), type, date, amount: '', outInHouse: '', outExternal: '', outVND: '', memo: '' };
}

// 任意の配列を制作ラウンド配列に正規化（欠損キーを補う・不正値を除去）。
export function normalizeHistory(arr) {
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
export function deliveryBaseName(projectName, viewpointName, override) {
  const ov = (override || '').trim();
  if (ov) return ov;
  const p = (projectName || '').trim();
  const v = (viewpointName || '').trim();
  if (p && v) return `${p}_${v}`;
  return p || v || '';
}

// 納品ラウンド数（初回・追加の合計。修正は数えない）。
export function deliveryCount(history) {
  return (history || []).reduce((n, r) => n + (roundTypeOf(r.type).isDelivery ? 1 : 0), 0);
}

// 連番付きの納品名。1回目は素の名前、2回目以降は末尾に通し番号を付ける。
// 例：〇〇案件_視点1色付きパース → （追加で）〇〇案件_視点1色付きパース2
export function deliveryNameForNumber(baseName, number) {
  return number > 1 ? `${baseName}${number}` : baseName;
}

// 履歴を配列順（時系列）に走査し、各ラウンドへ納品連番と納品名を割り当てる。
// 初回・追加は番号を1つ進め、修正は直前の納品番号を引き継ぐ（同じ納品の修正のため）。
export function computeRoundNames(history, baseName) {
  let counter = 0;
  return (history || []).map(r => {
    const t = roundTypeOf(r.type);
    if (t.isDelivery) counter += 1;
    const number = counter === 0 ? 1 : counter;
    return { ...r, type: t.id, number, isDelivery: t.isDelivery, deliveryName: deliveryNameForNumber(baseName, number) };
  });
}

// 視点の「現在の納品名」（最新の納品ラウンドの名前）。履歴が無ければベース名。
export function currentDeliveryName(history, baseName) {
  const c = deliveryCount(history);
  return deliveryNameForNumber(baseName, c > 1 ? c : 1);
}

// ステップの納品名 ＝「納品名＋ステップ名」（例：〇〇案件_視点1_ホワイト）。
// 既にステップ名がベース名で始まっていれば二重付与しない。
export function stepDeliveryName(baseName, stepName) {
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
export const DEFAULT_STEP_TYPES = [
  { id: 'white',        label: 'ホワイト',            paid: true,  deliveryBase: '白色', numbered: false },
  { id: 'color',        label: 'カラー',              paid: true,  deliveryBase: '色付', numbered: false },
  { id: 'person_scene', label: '人物＋添景合成',       paid: true,  deliveryBase: '',     numbered: false },
  { id: 'white_fix',    label: 'ホワイト修正（無料）', paid: false, deliveryBase: '白色', numbered: true },
  { id: 'white_change', label: 'ホワイト変更（有料）', paid: true,  deliveryBase: '白色', numbered: true },
  { id: 'color_fix',    label: 'カラー修正（無料）',   paid: false, deliveryBase: '色付', numbered: true },
  { id: 'color_change', label: 'カラー変更（有料）',   paid: true,  deliveryBase: '色付', numbered: true },
];

// マスタを正規化（欠損フィールドを補完）。保存/読込時に使う。
export function normalizeStepTypes(list) {
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
export function resolveStepLabel(baseLabel, numbered, n) {
  const b = (baseLabel || '').trim();
  if (!numbered) return b;
  const m = b.match(/^(.*?)(（[^（）]*）)?$/);
  const core = (m && m[1] != null) ? m[1] : b;
  const suf = (m && m[2]) || '';
  return `${core}${n}回目${suf}`;
}

// 納品名の連番サフィックス。1つ目はベースそのまま、2つ目以降は末尾に通し番号。
// 例：resolveDeliverySuffix('色付', 1) → '色付'、resolveDeliverySuffix('色付', 2) → '色付2'
export function resolveDeliverySuffix(deliveryBase, deliveryNumber) {
  const base = (deliveryBase || '').trim();
  if (!base) return '';
  return deliveryNumber > 1 ? `${base}${deliveryNumber}` : base;
}

// ステップ（フォーム値 or タスク）→ 対応するマスタ種類。stepTypeId 優先、無ければ名称一致で探す。
export function findStepType(master, step) {
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
export function resolveViewpointSteps(steps, master) {
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
export function classifyProdType(viewpointName) {
  const u = (viewpointName || '').trim().toUpperCase();
  if (u.startsWith('EX')) return '外観';
  if (u.startsWith('IN')) return '内観';
  return '';
}

// 視点キー（担当者非依存）。案件名と視点名で一意化する。
export function viewpointKey(projectName, viewpointName) {
  return `${projectName || ''} ${viewpointName || ''}`;
}

// 会社がオフショア契約かどうか。
export function isOffshoreCompany(company, customerMaster) {
  const name = (company || '').trim();
  if (!name) return false;
  return (customerMaster || []).some(c => (c.company || '').trim() === name && c.contractType === 'offshore');
}

// 会社の売上区分エリア（国内 or 国際）。お客様マスタの salesArea='intl' なら国際、既定は国内。
export function salesAreaOfCompany(company, customerMaster) {
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
export function computeEstimateVariance(tasks, groupBy, year) {
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
export const REVISION_LATER_MS = 30 * 60 * 1000;
export function isRevisionStep(task, vpFirstCreatedAt) {
  const rt = ((task && task.stepRoundType) || '').trim();
  if (rt) return rt === 'fix';
  if (!((task && task.stepName) || '').includes('修正')) return false;
  return ((task && task.createdAt) || 0) - (vpFirstCreatedAt || 0) > REVISION_LATER_MS;
}

// ステップ（修正・追加ラウンド）の帰属月（'YYYY-MM'）。
// 完了日（stepCompletedDate）＞ 完了時刻（completedAt）＞ 依頼日（stepRequestDate）＞ 登録時刻 の順。
// 売上登録の月間集計と突き合わせるために使う。
export function revisionMonthOf(task) {
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
export function computeRevisionStats(tasks, opts = {}) {
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
export function metaFromGroup(group) {
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
