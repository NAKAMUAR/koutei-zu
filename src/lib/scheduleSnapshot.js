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

const pad2 = n => String(n).padStart(2, '0');
const ymdOf = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/**
 * 担当者ごとの予定表（管理者用シートの『予定_担当者名』タブ）用に、今日から days 日ぶんの作業枠をまとめる（2026-11-06・純ロジック）。
 * 戻り値：{ from:'YYYY-MM-DD', days, rows:[{ a 担当, p 案件, v 視点, s 工程, st 状態, dl 納期, b 開始ms, e 終了ms, sl:[[日の番号, 開始分, 終了分], …] }] }
 * 連携で作ったタスクに限らず、担当者が決まっていて期間内に作業枠がある作業をすべて入れる。
 */
export function buildAssigneePlan(scheduled, now = new Date(), days = 14) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayIndex = new Map();
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    dayIndex.set(ymdOf(d), i);
  }
  const rows = [];
  (scheduled.active || []).forEach(t => {
    const a = String(t.assignee || '').trim();
    if (!a || !Array.isArray(t.slots)) return;
    const sl = [];
    t.slots.forEach(x => {
      if (!(x.date instanceof Date)) return;
      const i = dayIndex.get(ymdOf(x.date));
      if (i == null) return;
      sl.push([i, Math.round(x.startMin), Math.round(x.endMin)]);
    });
    if (!sl.length) return;
    rows.push({
      a,
      p: String(t.projectName || t.projectNameInternal || ''),
      v: String(t.viewpointName || ''),
      s: String(t.stepName || ''),
      st: t.status === 'in_progress' || t.status === 'doing' ? '作業中' : '予定',
      dl: String(t.deadline || t.projectDeadline || ''),
      b: tsOf(t.scheduledStart, t.scheduledStartMin),
      e: tsOf(t.scheduledEnd, t.scheduledEndMin),
      sl,
    });
  });
  rows.sort((x, y) => (x.a < y.a ? -1 : x.a > y.a ? 1 : (x.b || 0) - (y.b || 0)));
  return { from: ymdOf(start), days, rows };
}
