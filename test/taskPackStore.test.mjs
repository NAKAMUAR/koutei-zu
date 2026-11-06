// タスクのまとめ保存（src/lib/taskPackStore.js）を、偽の Firestore で確かめる
import assert from 'node:assert/strict';
import { makeTaskStore } from '../src/lib/taskPackStore.js';
import { taskPackOf } from '../src/lib/taskPacks.js';

let n = 0;
const test = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };

/** 偽の Firestore。docs: パス → データ。reads に読んだドキュメントの数を数える */
function fakeDb({ offline = false } = {}) {
  const docs = new Map();
  const listeners = [];
  const st = { docs, reads: 0, writes: 0, offline };
  const DEL = { __delete: true };
  class FieldPath { constructor(...segs) { this.segs = segs; } }
  const path = (...segs) => segs.slice(1).join('/'); // 先頭は db
  const doc = (db, ...segs) => ({ kind: 'doc', path: path(db, ...segs), id: segs[segs.length - 1] });
  const collection = (db, ...segs) => ({ kind: 'col', path: path(db, ...segs) });
  const snapDoc = (p) => ({ exists: () => docs.has(p), data: () => structuredClone(docs.get(p)), id: p.split('/').pop() });
  const childrenOf = (col) => Array.from(docs.keys()).filter(k => k.startsWith(col.path + '/') && !k.slice(col.path.length + 1).includes('/')).sort();
  const snapCol = (col, fromCache = false) => {
    const ks = childrenOf(col);
    const ds = ks.map(snapDoc);
    return { docs: ds, forEach: (f) => ds.forEach(f), metadata: { fromCache } };
  };
  const notify = () => listeners.forEach(l => { st.reads += childrenOf(l.col).length; l.cb(snapCol(l.col)); });
  const write = (p, data, opts) => {
    st.writes++;
    if (!opts || !opts.mergeFields) { docs.set(p, structuredClone(data)); return; }
    const cur = structuredClone(docs.get(p) || {});
    opts.mergeFields.forEach(f => {
      const segs = typeof f === 'string' ? f.split('.') : f.segs;
      let src = data; segs.forEach(s => { src = src == null ? undefined : src[s]; });
      let dst = cur; segs.slice(0, -1).forEach(s => { if (!dst[s] || typeof dst[s] !== 'object') dst[s] = {}; dst = dst[s]; });
      const last = segs[segs.length - 1];
      if (src === DEL) delete dst[last]; else dst[last] = structuredClone(src);
    });
    docs.set(p, cur);
  };
  const api = {
    db: 'db', workspaceId: 'w', doc, collection, FieldPath, deleteField: () => DEL,
    setDoc: async (ref, data, opts) => { write(ref.path, data, opts); notify(); },
    getDocFromServer: async (ref) => { if (st.offline) throw new Error('offline'); st.reads++; return snapDoc(ref.path); },
    getDocFromCache: async () => { throw new Error('not cached'); },
    getDocs: async (col) => { st.reads += Math.max(1, childrenOf(col).length); return snapCol(col); },
    getDocsFromServer: async (col) => { if (st.offline) throw new Error('offline'); st.reads += Math.max(1, childrenOf(col).length); return snapCol(col); },
    onSnapshot: (col, opts, cb) => { const l = { col, cb }; listeners.push(l); st.reads += childrenOf(col).length; cb(snapCol(col, st.offline)); return () => listeners.splice(listeners.indexOf(l), 1); },
    writeBatch: () => { const ops = []; return { set: (ref, data, opts) => ops.push([ref.path, data, opts]), commit: async () => { ops.forEach(o => write(...o)); notify(); } }; },
  };
  return { api, st };
}
const old = (st, n) => { for (let i = 0; i < n; i++) st.docs.set('workspaces/w/tasks/t' + i, { id: 't' + i, hours: i, projectName: 'P' + (i % 7) }); };
const wait = () => new Promise(r => setTimeout(r, 0));

await test('初めて開いたとき：旧 tasks を一度だけ読んで、まとめ（64個）へ移す（旧 tasks は控えとして残す）', async () => {
  const { api, st } = fakeDb();
  old(st, 1000);
  const store = makeTaskStore(api);
  let got = null;
  store.subscribe((arr) => { got = arr; });
  await wait(); await wait();
  assert.equal(got.length, 1000);
  assert.deepEqual(st.docs.get('workspaces/w/data/taskPacks').v, 1);
  assert.equal(st.docs.get('workspaces/w/data/taskPacks').packs, 64);
  assert.ok(st.docs.has('workspaces/w/tasks/t5'), '旧 tasks は残す');
  const p = 'workspaces/w/data/taskPacks/packs/' + taskPackOf('t5');
  assert.equal(st.docs.get(p).t.t5.hours, 5);
});

await test('2回目からは：全部読んでも まとめの数（64）＋目印 だけ', async () => {
  const { api, st } = fakeDb();
  old(st, 3000);
  await makeTaskStore(api).listAll();
  st.reads = 0;
  const store = makeTaskStore(api);
  let got = null;
  store.subscribe((arr) => { got = arr; });
  await wait(); await wait();
  assert.equal(got.length, 3000);
  assert.equal(st.reads, 1 + 64, '3000件でも 65 回の読み取り');
});

await test('保存：そのまとめの1件だけを置き換え・消す（ほかのタスクはそのまま・消した項目は残らない）', async () => {
  const { api, st } = fakeDb();
  old(st, 50);
  const store = makeTaskStore(api);
  await store.listAll();
  const p = (id) => st.docs.get('workspaces/w/data/taskPacks/packs/' + taskPackOf(id));
  await store.batch([{ id: 't1', hours: 9 }, { id: 'new1', hours: 2, note: 'x' }], ['t2']);
  assert.deepEqual(p('t1').t.t1, { id: 't1', hours: 9 }, 'まるごと置き換え（projectName は消える）');
  assert.equal(p('new1').t.new1.note, 'x');
  assert.equal(p('t2').t.t2, undefined, '消す');
  assert.equal(p('t3').t.t3.hours, 3, 'ほかはそのまま');
  await store.remove('new1');
  assert.equal(p('new1').t.new1, undefined);
  const all = await store.listAll();
  assert.equal(all.length, 49);
});

await test('上限・オフラインで確かめられないとき：旧 tasks の保存分で表示し、保存はしない（まとめと食い違わないように）', async () => {
  const { api, st } = fakeDb({ offline: true });
  old(st, 10);
  const store = makeTaskStore(api);
  let got = null, meta = null;
  store.subscribe((arr, m) => { got = arr; meta = m; });
  await wait(); await wait();
  assert.equal(got.length, 10);
  assert.equal(meta.fromCache, true);
  await assert.rejects(() => store.batch([{ id: 't1', hours: 1 }], []), /保存できません/);
  assert.ok(!st.docs.has('workspaces/w/data/taskPacks'), 'まだ移さない');
  st.offline = false;
  await store.batch([{ id: 't1', hours: 1 }], []);
  assert.equal(st.docs.get('workspaces/w/data/taskPacks').v, 1, 'つながったら移してから保存');
});

console.log(`taskPackStore: ${n} tests passed`);
