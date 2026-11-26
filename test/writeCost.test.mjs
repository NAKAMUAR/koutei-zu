// 書き込みの量の測定（2026-11-26・Firestore の1日の書き込み上限に届いた件）。
// 本物の保存処理（makeTaskStore・normalizePriorities・planTaskUpserts・予定のまとめ）に偽の Firestore をつなぎ、
// 代表的な操作1回ごとに「書いたドキュメントの数」と「書き込みユニット（Enterprise 版は 1KiB ごとに1）」を数える。
// データは本番の規模に合わせた作りもの（進行中 300 案件・完了済みを含めて約 5,000 タスク）。
// 書き込みユニットは「書いたあとのドキュメントの大きさ」で数える（部分更新でもドキュメント全体と見る、多めの見積もり）。
// 使い方：node test/writeCost.test.mjs（REPORT=1 で表を出す）
import assert from 'node:assert/strict';
import { makeTaskStore } from '../src/lib/taskPackStore.js';
import { migrateTask, normalizePriorities, scheduleTasks } from '../src/lib/schedule.js';
import { planTaskUpserts } from '../src/lib/taskDiff.js';
import { buildScheduleSnapshot, buildAssigneePlan, sameSnapshotContent } from '../src/lib/scheduleSnapshot.js';
import { DEFAULT_SETTINGS } from '../src/lib/utils.js';

const REPORT = !!process.env.REPORT;
const KiB = 1024;
const units = (bytes) => Math.max(1, Math.ceil(bytes / KiB));

// ---------- 偽の Firestore（書いたドキュメントの数・大きさを数える） ----------
function fakeDb() {
  const docs = new Map();
  const st = { docs, writes: 0, units: 0 };
  const DEL = { __delete: true };
  class FieldPath { constructor(...segs) { this.segs = segs; } }
  const path = (...segs) => segs.slice(1).join('/');
  const doc = (db, ...segs) => ({ kind: 'doc', path: path(db, ...segs), id: segs[segs.length - 1] });
  const collection = (db, ...segs) => ({ kind: 'col', path: path(db, ...segs) });
  const snapDoc = (p) => ({ exists: () => docs.has(p), data: () => structuredClone(docs.get(p)), id: p.split('/').pop() });
  const childrenOf = (col) => Array.from(docs.keys()).filter(k => k.startsWith(col.path + '/') && !k.slice(col.path.length + 1).includes('/')).sort();
  const write = (p, data, opts) => {
    if (!opts || !opts.mergeFields) docs.set(p, structuredClone(data));
    else {
      const cur = structuredClone(docs.get(p) || {});
      opts.mergeFields.forEach(f => {
        const segs = typeof f === 'string' ? f.split('.') : f.segs;
        let src = data; segs.forEach(s => { src = src == null ? undefined : src[s]; });
        let dst = cur; segs.slice(0, -1).forEach(s => { if (!dst[s] || typeof dst[s] !== 'object') dst[s] = {}; dst = dst[s]; });
        const last = segs[segs.length - 1];
        if (src === DEL) delete dst[last]; else dst[last] = structuredClone(src);
      });
      docs.set(p, cur);
    }
    st.writes++;
    st.units += units(JSON.stringify(docs.get(p)).length);
  };
  const api = {
    db: {}, workspaceId: 'w', doc, collection, FieldPath,
    deleteField: () => DEL,
    setDoc: async (ref, data, opts) => write(ref.path, data, opts),
    getDocs: async (col) => { const ds = childrenOf(col).map(snapDoc); return { docs: ds, forEach: f => ds.forEach(f) }; },
    getDocsFromServer: async (col) => { const ds = childrenOf(col).map(snapDoc); return { docs: ds, forEach: f => ds.forEach(f) }; },
    getDocFromServer: async (ref) => snapDoc(ref.path),
    getDocFromCache: async (ref) => snapDoc(ref.path),
    onSnapshot: () => () => {},
    writeBatch: () => { const ops = []; return { set: (ref, data, opts) => ops.push([ref.path, data, opts]), commit: async () => ops.forEach(o => write(...o)) }; },
  };
  return { st, api };
}

// ---------- 作りもののデータ ----------
let seed = 1;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const COMPANIES = ['OFFICECOM', 'TANAKA', 'TAMAZEN', 'SANGETSU', 'RENOVERU', 'STADO', 'RIC', 'SOCIAL'];
const WEIGHT = [0.35, 0.2, 0.12, 0.1, 0.08, 0.06, 0.05, 0.04];
const ASSIGNEES = Array.from({ length: 14 }, (_, i) => 'Staff' + String(i + 1).padStart(2, '0'));
const pickCompany = () => { let r = rnd(), i = 0; while (i < WEIGHT.length - 1 && r > WEIGHT[i]) { r -= WEIGHT[i]; i++; } return COMPANIES[i]; };

function makeTasks({ activeProjects = 300, doneProjects = 500 } = {}) {
  const tasks = [];
  const base = Date.parse('2026-08-01T00:00:00Z');
  let seq = 0;
  const project = (pi, done) => {
    const company = pickCompany();
    const code = company.slice(0, 3) + (100 + pi);
    const vps = 1 + Math.floor(rnd() * 4);
    const assignee = ASSIGNEES[Math.floor(rnd() * ASSIGNEES.length)];
    for (let v = 1; v <= vps; v++) {
      const vp = (rnd() < 0.3 ? 'EXE' : 'INE') + v;
      ['ホワイト', 'カラー'].forEach((step, si) => {
        const createdAt = base + (seq++) * 60000;
        tasks.push(migrateTask({
          id: `task-${createdAt}-${seq}-${Math.floor(rnd() * 1e6).toString(36)}`,
          projectName: code, projectNameInternal: code + '_社内名', companyName: company, customerContact: '担当様',
          viewpointName: vp, viewpointNameExternal: '内観視点①_パターンA', viewpointCategory: 'interior',
          stepName: step, stepOrder: si, assignee, priority: 99, hours: 2 + Math.floor(rnd() * 8), completedHours: 0,
          memo: '', tentative: false, tentativeStart: null, tentativeEnd: null,
          deadline: '2026-12-' + String(1 + Math.floor(rnd() * 28)).padStart(2, '0'), projectDeadline: null, projectRequestDate: null,
          manualStart: null, manualEnd: null,
          status: done ? 'done' : 'pending', completedAt: done ? createdAt + 86400000 : null, createdAt, registeredDate: '2026-11-01',
          stepTypeId: si ? 'color' : 'white', stepDeliverySuffix: '', stepAmount: '', stepRequestDate: '2026-11-01', stepCompletedDate: '',
          stepDeliveryNameOverride: '', stepRoundType: 'initial', stepOutInHouse: '', stepOutExternal: '', stepOutVND: '',
          externalId: `${code}::${vp}::1::${si ? 'color' : 'white'}`,
        }));
      });
    }
  };
  for (let i = 0; i < doneProjects; i++) project(i, true);
  for (let i = 0; i < activeProjects; i++) project(doneProjects + i, false);
  return normalizePriorities(tasks);
}

// ---------- 保存（App.jsx の saveTasks と同じ形。before＝これまで、after＝直したもの） ----------
function makeApp(mode) {
  const { st, api } = fakeDb();
  const store = makeTaskStore(api);
  let mem = [];
  let persisted = new Map();
  return {
    st, store,
    async load(tasks) {
      await api.setDoc({ path: 'workspaces/w/data/taskPacks' }, { v: 1, packs: 64 });
      await store.batch(tasks, []);
      mem = normalizePriorities(tasks.map(migrateTask));
      persisted = new Map(tasks.map(t => [t.id, migrateTask(t)]));
      st.writes = 0; st.units = 0;
    },
    get tasks() { return mem; },
    async saveTasks(updater) {
      const prev = mem;
      const next = updater(prev);
      mem = next;
      let upserts;
      if (mode === 'before') {
        const prevMap = new Map(prev.map(t => [t.id, t]));
        upserts = next.filter(t => { const o = prevMap.get(t.id); return !o || JSON.stringify(o) !== JSON.stringify(t); });
      } else {
        upserts = planTaskUpserts(persisted, next, normalizePriorities);
        upserts.forEach(t => persisted.set(t.id, t));
      }
      if (upserts.length) await store.batch(upserts, []);
      return upserts.length;
    },
    // 別の端末が開き直した（保存されている値で振り直す）ときの並び
    async reopenOrder() {
      const all = await store.listAll();
      return normalizePriorities(all.map(migrateTask));
    },
  };
}

// App.jsx の endPromptComplete（終了予定を過ぎた視点の「視点完了」）と同じ書き換え
const completeViewpoint = (vp) => (prev) => normalizePriorities(prev.map(t =>
  (t.projectName === vp.projectName && t.viewpointName === vp.viewpointName && t.assignee === vp.assignee && t.status !== 'done')
    ? { ...t, status: 'done', cancelled: null, completedHours: t.hours, completedAt: 1, actualEnd: null, reviewState: 'waiting', reviewAt: 1, reviewUpdatedAt: 1, reviewNote: '' }
    : t));
// App.jsx の confirmComplete（進行中一覧の「案件完了」）と同じ書き換え
const completeProject = (projectName) => (prev) => normalizePriorities(prev.map(t =>
  (t.projectName === projectName && t.status !== 'done')
    ? { ...t, status: 'done', cancelled: null, completedHours: t.hours, completedAt: 1, actualEnd: null, reviewState: 'waiting', reviewAt: 1, reviewUpdatedAt: 1, reviewNote: '' }
    : t));

/** 優先順位の高い（並びの上の）進行中の案件から順に n 件 */
function topProjects(tasks, n) {
  const act = tasks.filter(t => t.status !== 'done' && t.companyName === 'OFFICECOM').sort((a, b) => a.priority - b.priority);
  const out = [];
  act.forEach(t => { if (!out.includes(t.projectName)) out.push(t.projectName); });
  return out.slice(0, n);
}
const sameOrder = (a, b) => {
  const key = (arr) => arr.filter(t => t.status !== 'done').map(t => `${t.id}:${t.priority}`).sort().join('|');
  return key(a) === key(b);
};

const rows = [];
let n = 0;
const test = async (name, fn) => { await fn(); n++; if (!REPORT) console.log('  ok  ' + name); };

const BASE = makeTasks();
const packBytes = (st) => Array.from(st.docs.entries()).filter(([k]) => k.includes('/packs/')).map(([, v]) => JSON.stringify(v).length);

for (const mode of ['before', 'after']) {
  const label = mode === 'before' ? '直す前' : '直した後';
  // 1. 視点完了 1回（並びの上の案件の1視点）
  await test(`${label}：視点完了1回`, async () => {
    const app = makeApp(mode); await app.load(BASE);
    const p = topProjects(app.tasks, 1)[0];
    const t = app.tasks.find(x => x.projectName === p && x.status !== 'done');
    const cnt = await app.saveTasks(completeViewpoint(t));
    rows.push([label, '視点完了 1回', cnt, app.st.writes, app.st.units]);
    assert.ok(sameOrder(app.tasks, await app.reopenOrder()), '開き直したときの並びが画面と同じ');
  });
  // 並べ替え（App.jsx の「この位置へ移す」と同じ：会社の中で 1..n を振り直す）。完了のあとでも並びが正しく残るか
  await test(`${label}：完了のあと、下の作業をいちばん上へ移す`, async () => {
    const app = makeApp(mode); await app.load(BASE);
    const p = topProjects(app.tasks, 1)[0];
    await app.saveTasks(completeProject(p));
    const act = app.tasks.filter(t => t.status !== 'done' && t.companyName === 'OFFICECOM').sort((a, b) => a.priority - b.priority);
    const moving = act[act.length - 1];
    const seq = [moving, ...act.filter(t => t.id !== moving.id)];
    const prMap = new Map(seq.map((t, i) => [t.id, i + 1]));
    await app.saveTasks(prev => normalizePriorities(prev.map(t => prMap.has(t.id) ? { ...t, priority: prMap.get(t.id) } : t)));
    const again = await app.reopenOrder();
    assert.equal(again.find(t => t.id === moving.id).priority, 1, '開き直してもいちばん上');
    assert.ok(sameOrder(app.tasks, again), '開き直したときの並びが画面と同じ');
  });
  // 2. 案件完了 1回
  await test(`${label}：案件完了1回`, async () => {
    const app = makeApp(mode); await app.load(BASE);
    const p = topProjects(app.tasks, 1)[0];
    const cnt = await app.saveTasks(completeProject(p));
    rows.push([label, '案件完了 1回', cnt, app.st.writes, app.st.units]);
    assert.ok(sameOrder(app.tasks, await app.reopenOrder()), '開き直したときの並びが画面と同じ');
  });
  // 3. 今日のように 40 回続けて完了（視点完了と案件完了を交互）
  await test(`${label}：完了を40回続ける`, async () => {
    const app = makeApp(mode); await app.load(BASE);
    let cnt = 0;
    for (let i = 0; i < 40; i++) {
      const p = topProjects(app.tasks, 1)[0];
      if (i % 2) cnt += await app.saveTasks(completeProject(p));
      else { const t = app.tasks.find(x => x.projectName === p && x.status !== 'done'); cnt += await app.saveTasks(completeViewpoint(t)); }
    }
    rows.push([label, '完了を40回続ける', cnt, app.st.writes, app.st.units]);
    assert.ok(sameOrder(app.tasks, await app.reopenOrder()), '開き直したときの並びが画面と同じ');
  });
}

// 4. 予定のまとめ（data/scheduleSnapshot）。1回の大きさ × 何回書くか
const NOW = new Date('2026-11-26T10:00:00');
const scheduled = scheduleTasks(BASE, { ...DEFAULT_SETTINGS, startDate: '2026-11-26' }, [], NOW);
const snapJson = JSON.stringify({ items: buildScheduleSnapshot(scheduled).items, plan: buildAssigneePlan(scheduled, NOW) });
const snapUnits = units(Buffer.byteLength(JSON.stringify({ updatedAt: Date.now(), ...JSON.parse(snapJson) }), 'utf8') + 40);
const OPEN = 10; // 同時に開いている画面の数（仮）
// 直す前：どの画面も、開いたとき（5秒後）と作業が変わるたびに書く。直した後：サーバーと同じなら書かない・直した画面だけが書く
rows.push(['直す前', '画面を開く 1回', '-', 1, snapUnits]);
rows.push(['直した後', '画面を開く 1回', '-', 0, 0]);
rows.push(['直す前', `作業を直したあとの予定のまとめ（画面${OPEN}個）`, '-', OPEN, OPEN * snapUnits]);
rows.push(['直した後', `作業を直したあとの予定のまとめ（画面${OPEN}個）`, '-', 1, snapUnits]);

await test('予定のまとめ：保存してある中身と同じなら書かない（updatedAt は見ない）', async () => {
  const stored = JSON.stringify({ updatedAt: 123, ...JSON.parse(snapJson) });
  assert.equal(sameSnapshotContent(stored, snapJson), true);
  const changed = JSON.parse(snapJson); changed.items['X::Y::1'] = { s: 1, e: 2, a: 'Q', st: '予定' };
  assert.equal(sameSnapshotContent(stored, JSON.stringify(changed)), false);
  assert.equal(sameSnapshotContent('こわれた', snapJson), false);
});

// 5. シートからの連携1回（連携スクリプトの fsTaskPatch_。1作業＝そのまとめ1つの部分更新。今回は変えていない）
{
  const app = makeApp('after'); await app.load(BASE);
  const avg = packBytes(app.st).reduce((a, b) => a + b, 0) / 64;
  const perTask = units(avg);
  rows.push(['（変更なし）', 'シートから1視点（2作業）を登録', 2, 2, 2 * perTask]);
}

// 6. 終了予定を過ぎた視点の「確認中」（settings 1件を書く）。期限切れの「確認中」が 300 件たまっている場合
{
  const old = {};
  for (let i = 0; i < 300; i++) old[`Staff${i % 14}::P${i}::INE1`] = { snoozedUntil: 1, lastPromptedEnd: 1764100000000 + i };
  const base = { morningStart: '08:00', morningEnd: '12:00', afternoonStart: '13:00', afternoonEnd: '17:00', startDate: '2026-11-26', startTime: '08:00', overtimes: [], companyOrder: COMPANIES };
  const size = (eps) => units(Buffer.byteLength(JSON.stringify(JSON.stringify({ ...base, endPromptState: eps })), 'utf8'));
  rows.push(['直す前', '「確認中」1回（期限切れ300件）', '-', 1, size({ ...old, 'Staff1::P1::INE2': { snoozedUntil: Date.now() + 3600000, lastPromptedEnd: 1 } })]);
  rows.push(['直した後', '「確認中」1回（期限切れ300件）', '-', 1, size({ 'Staff1::P1::INE2': { snoozedUntil: Date.now() + 3600000, lastPromptedEnd: 1 } })]);
}

await test('直した後の方が少ない', async () => {
  const get = (who, what) => rows.find(r => r[0] === who && r[1] === what)[4];
  ['視点完了 1回', '案件完了 1回', '完了を40回続ける'].forEach(w => assert.ok(get('直した後', w) * 5 < get('直す前', w), w));
});

if (REPORT) {
  const app = makeApp('after'); await app.load(BASE);
  const pb = packBytes(app.st);
  console.log(`タスク ${BASE.length} 件（進行中 ${BASE.filter(t => t.status !== 'done').length} 件）・まとめ 64 個・1まとめ平均 ${(pb.reduce((a, b) => a + b, 0) / pb.length / KiB).toFixed(1)} KiB`);
  console.log('| 時点 | 操作 | 書いたタスク | 書いたドキュメント | 書き込みユニット |');
  console.log('|---|---|---|---|---|');
  rows.forEach(r => console.log('| ' + r.join(' | ') + ' |'));
} else {
  console.log('writeCost: ' + n + ' tests passed');
}
