// タスクの保存（まとめ保存）。Firestore の関数は firebase.js から渡す（テストでは偽物を渡す）。説明は firebase.js の tasksStore の上
import { TASK_PACKS_DEFAULT, taskPackOf, packCountFor, groupIntoPacks, tasksFromPacks } from './taskPacks.js';

export function makeTaskStore(api) {
  const { db, workspaceId: WORKSPACE_ID, doc, collection, setDoc, getDocs, getDocsFromServer, getDocFromServer, getDocFromCache, onSnapshot, writeBatch, deleteField, FieldPath } = api;
  const tasksCol = () => collection(db, 'workspaces', WORKSPACE_ID, 'tasks');
  const packMetaRef = () => doc(db, 'workspaces', WORKSPACE_ID, 'data', 'taskPacks');
  const packsCol = () => collection(db, 'workspaces', WORKSPACE_ID, 'data', 'taskPacks', 'packs');
  const packRef = (p) => doc(db, 'workspaces', WORKSPACE_ID, 'data', 'taskPacks', 'packs', p);

  let packInfo = null; // Promise<{ packs } | null>（null＝まだ確かめられない：上限・オフライン）
  async function migrateToPacks() {
    const snap = await getDocsFromServer(tasksCol());
    const tasks = [];
    snap.forEach(d => { const t = d.data(); tasks.push(t.id ? t : { ...t, id: d.id }); });
    const bytes = tasks.reduce((sum, t) => sum + JSON.stringify(t).length, 0);
    const packs = packCountFor(bytes * 1.2);
    const groups = groupIntoPacks(tasks, packs);
    const names = Object.keys(groups);
    for (let i = 0; i < names.length; i += 8) {
      const batch = writeBatch(db);
      names.slice(i, i + 8).forEach(p => batch.set(packRef(p), { t: groups[p], updatedAt: Date.now() }));
      await batch.commit();
    }
    await setDoc(packMetaRef(), { v: 1, packs, count: tasks.length, migratedAt: Date.now() });
    console.info(`タスク ${tasks.length} 件をまとめ ${packs} 個へ移しました`);
    return { packs };
  }
  function ensurePacks() {
    if (packInfo) return packInfo;
    packInfo = (async () => {
      let meta = null;
      try {
        meta = await getDocFromServer(packMetaRef());
      } catch (e) {
        try { meta = await getDocFromCache(packMetaRef()); } catch (e2) { meta = null; }
        if (!meta || !meta.exists()) return null; // サーバーで確かめられない（上限・オフライン）
      }
      if (meta.exists() && meta.data().v === 1) return { packs: Number(meta.data().packs) || TASK_PACKS_DEFAULT };
      return migrateToPacks();
    })().then(r => { if (!r) packInfo = null; return r; }, e => { packInfo = null; throw e; });
    return packInfo;
  }
  async function needPacks() {
    const info = await ensurePacks();
    if (!info) throw new Error('データベースに接続できないため保存できません（読み込みの上限・オフライン）。しばらくしてからもう一度お試しください');
    return info;
  }

    return {
    subscribe(callback, onError) {
      let unsub = null;
      let stopped = false;
      const emit = (snap, fromPacks) => {
        const arr = [];
        if (fromPacks) arr.push(...tasksFromPacks(snap.docs.map(d => d.data())));
        else snap.forEach(d => arr.push(d.data()));
        callback(arr, { fromCache: snap.metadata.fromCache });
      };
      const fail = (err) => {
        console.error('タスク購読エラー:', err);
        if (onError) onError(err);
      };
      ensurePacks().catch(e => { console.error('タスクのまとめを用意できませんでした:', e); return null; }).then(info => {
        if (stopped) return;
        // まとめが確かめられないとき（上限・オフラインで目印も保存されていない）は、旧 tasks の保存分で表示だけする
        // includeMetadataChanges：保存分（fromCache）→ サーバーとそろった、の切り替わりも受け取る
        unsub = info
          ? onSnapshot(packsCol(), { includeMetadataChanges: true }, (snap) => emit(snap, true), fail)
          : onSnapshot(tasksCol(), { includeMetadataChanges: true }, (snap) => emit(snap, false), fail);
      });
      return () => { stopped = true; if (unsub) unsub(); };
    },
    async upsert(task) {
      await this.batch([task], []);
    },
    async remove(taskId) {
      await this.batch([], [taskId]);
    },
    // upserts: Task[], deletes: string[]。まとめごとに1回の書き込み（そのまとめの t.{id} だけを置き換える・消す）
    async batch(upserts, deletes) {
      const list = upserts || [];
      const del = deletes || [];
      if (list.length === 0 && del.length === 0) return;
      const { packs } = await needPacks();
      const by = new Map(); // まとめ → { data, fields }
      const at = (id) => {
        const p = taskPackOf(id, packs);
        if (!by.has(p)) by.set(p, { data: {}, fields: [] });
        return by.get(p);
      };
      for (const t of list) { const g = at(t.id); g.data[t.id] = t; g.fields.push(new FieldPath('t', t.id)); }
      for (const id of del) { const g = at(id); g.data[id] = deleteField(); g.fields.push(new FieldPath('t', id)); }
      const entries = Array.from(by.entries());
      // 1回のまとめ書き込みは 10MB まで。まとめ8個ずつに分ける
      for (let i = 0; i < entries.length; i += 8) {
        const batch = writeBatch(db);
        entries.slice(i, i + 8).forEach(([p, g]) => {
          batch.set(packRef(p), { t: g.data, updatedAt: Date.now() }, { mergeFields: [...g.fields, 'updatedAt'] });
        });
        await batch.commit();
      }
    },
    async listAll() {
      const info = await ensurePacks();
      if (!info) {
        const snap = await getDocs(tasksCol());
        const arr = [];
        snap.forEach(d => arr.push(d.data()));
        return arr;
      }
      const snap = await getDocs(packsCol());
      return tasksFromPacks(snap.docs.map(d => d.data()));
    },
  };

}
