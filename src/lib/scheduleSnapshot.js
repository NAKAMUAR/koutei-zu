// 工程図の予定（スケジューラの計算結果）を、連携シートが読めるように1件のまとめにする（2026-11-06）。
// 予定はアプリが開くたびに計算するだけで保存されていないため、計算結果をこのまとめとして data/scheduleSnapshot に書く。
// 連携スクリプトはこの1件を読んで『連携』の「開始予定」「終了予定」などに入れる（全タスクを読まないので Firestore の読み取りが増えない）。

/** externalId（案件コード::視点::n回目::ステップ）→ 取込キー（前の3つ）。連携で作ったタスクでなければ '' */
export function importKeyOf(externalId) {
  const parts = String(externalId || '').split('::');
  return parts.length >= 4 ? parts.slice(0, 3).join('::') : '';
}

const tsOf = (date, min) => (date instanceof Date ? date.getTime() + (min || 0) * 60000 : null);

/**
 * スケジューラの結果（scheduleTasks の戻り値）→ { items: { 取込キー: { s, e, a, st } } }（純ロジック）
 *  s・e：開始予定・終了予定（ミリ秒）、a：担当者（「・」区切り）、st：状態（予定・作業中・保留・完了）
 */
export function buildScheduleSnapshot(scheduled) {
  const by = new Map();
  const add = (t, kind) => {
    const key = importKeyOf(t.externalId);
    if (!key) return;
    const cur = by.get(key) || { s: null, e: null, a: [], n: 0, done: 0, doing: 0, hold: 0 };
    cur.n++;
    if (kind === 'done') cur.done++;
    if (kind === 'hold') cur.hold++;
    if (kind === 'active') {
      if (t.status === 'in_progress' || t.status === 'doing') cur.doing++;
      const s = tsOf(t.scheduledStart, t.scheduledStartMin);
      const e = tsOf(t.scheduledEnd, t.scheduledEndMin);
      if (s != null && (cur.s == null || s < cur.s)) cur.s = s;
      if (e != null && (cur.e == null || e > cur.e)) cur.e = e;
    }
    const who = String(t.assignee || '').trim();
    if (who && cur.a.indexOf(who) < 0) cur.a.push(who);
    by.set(key, cur);
  };
  (scheduled.active || []).forEach(t => add(t, 'active'));
  (scheduled.suspended || []).forEach(t => add(t, 'hold'));
  (scheduled.done || []).forEach(t => add(t, 'done'));
  const items = {};
  Array.from(by.keys()).sort().forEach(k => {
    const c = by.get(k);
    const st = c.done === c.n ? '完了' : c.hold > 0 && c.hold + c.done === c.n ? '保留' : c.doing > 0 ? '作業中' : '予定';
    items[k] = { s: c.s, e: c.e, a: c.a.join('・'), st };
  });
  return { items };
}
