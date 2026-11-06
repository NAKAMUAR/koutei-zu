// タスクのまとめ保存（2026-11-06）。
// これまでタスクは1件＝1ドキュメントで、開き直すたびに全件（数千件）を読んでいた。Firestore の無料枠は
// 「1日に読めるドキュメントの数」で決まるため、タスクを数十個の「まとめ」（1まとめ＝1ドキュメント）に入れる。
// 全部読んでもまとめの数（既定 64）だけ、1件直してもそのまとめ1つだけ読み直す。
// 場所：workspaces/{wid}/data/taskPacks（目印：{ v: 1, packs }）と、その下の packs/{p00〜}（{ t: { タスクid: タスク } }）。
// 連携スクリプト（sync/Code.gs の taskPackOf_）・帳票スクリプト（sync/billing/Billing.gs の blTaskPackOf_）も同じ割り振りを使う。

export const TASK_PACKS_DEFAULT = 64;
// 1まとめの目安の大きさ（Firestore の1ドキュメントの上限は 1MB）。移すときにこれを超えないよう、まとめの数を増やす
export const TASK_PACK_TARGET_BYTES = 250 * 1024;

/** タスクid → まとめの名前（p00〜）。FNV-1a（32bit）の余り。スクリプト側と同じ計算 */
export function taskPackOf(id, packs = TASK_PACKS_DEFAULT) {
  const s = String(id);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const n = (h >>> 0) % packs;
  return 'p' + String(n).padStart(2, '0');
}

/** 移すときのまとめの数：既定 64。全体が大きければ1まとめが目安の大きさに収まるよう増やす */
export function packCountFor(totalBytes) {
  return Math.max(TASK_PACKS_DEFAULT, Math.ceil((Number(totalBytes) || 0) / TASK_PACK_TARGET_BYTES));
}

/** タスクの配列 → { p00: { id: task }, … }（まとめの数ぶん、空のまとめも作る） */
export function groupIntoPacks(tasks, packs) {
  const out = {};
  for (let i = 0; i < packs; i++) out['p' + String(i).padStart(2, '0')] = {};
  (tasks || []).forEach(t => {
    if (!t || !t.id) return;
    out[taskPackOf(t.id, packs)][t.id] = t;
  });
  return out;
}

/** まとめのドキュメントの中身（{ t: {...} }）の配列 → タスクの配列 */
export function tasksFromPacks(packDatas) {
  const arr = [];
  (packDatas || []).forEach(d => {
    const t = d && d.t;
    if (!t || typeof t !== 'object') return;
    Object.keys(t).forEach(id => { const v = t[id]; if (v && typeof v === 'object') arr.push(v.id ? v : { ...v, id }); });
  });
  return arr;
}
