// タスク保存の差分（2026-11-26）。Firestore の1日の書き込み上限（無料枠）に届かないよう、保存するタスクを減らす。
//
// 優先順位（priority）は会社ごとに 1..n へ振り直している（normalizePriorities）。ある作業を完了にすると、
// 同じ会社のそれより後ろの作業がすべて1つずつ繰り上がるため、これまでは数百件のタスクが「変わった」として
// 書き込まれ、64個のまとめ（1まとめ＝1ドキュメント）がほぼ全部書き直されていた（2026-11-26 に上限到達）。
//
// ところが、読むときはどの画面も normalizePriorities を通すので、保存しておく priority は「並び順が同じになる値」
// であれば何でもよい（実際に視点の削除では、振り直した priority を保存していない）。
// そこで、priority 以外が変わったタスクだけを書き、そのうえで「保存されている値で振り直したときに、
// 画面と同じ並び順になるか」を確かめ、ずれるタスクだけ priority も書く。

const withoutPriority = (t) => JSON.stringify({ ...t, priority: 0 });

/**
 * 書き込むタスクを選ぶ（純ロジック）。
 * @param {Map<string, object>} persisted 保存されているタスク（id → タスク。migrateTask 済み・振り直し前）
 * @param {object[]} newTasks 保存したい画面のタスク（normalizePriorities 済み）
 * @param {(tasks: object[]) => object[]} normalize normalizePriorities
 * @returns {object[]} 書き込むタスク（newTasks の要素そのもの）
 */
export function planTaskUpserts(persisted, newTasks, normalize) {
  const write = new Map();
  for (const t of newTasks) {
    const old = persisted.get(t.id);
    if (!old || withoutPriority(old) !== withoutPriority(t)) write.set(t.id, t);
  }
  // 保存されるはずの状態（書くタスクは新しい値、ほかは保存されている priority）を振り直し、画面の priority と比べる。
  // ずれたタスクは priority も書く。書くたびに必ず1件以上増えるので、多くてもタスクの数の回数で止まる
  for (let round = 0; round <= newTasks.length; round++) {
    const stored = newTasks.map(t => (write.has(t.id) ? t : { ...t, priority: persisted.get(t.id).priority }));
    const prio = new Map(normalize(stored).map(t => [t.id, t.priority]));
    let added = 0;
    for (const t of newTasks) {
      if (write.has(t.id) || t.status === 'done') continue;
      if (prio.get(t.id) !== t.priority) { write.set(t.id, t); added++; }
    }
    if (added === 0) break;
  }
  return newTasks.filter(t => write.has(t.id));
}
