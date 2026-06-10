// Firebase 初期化 & ストレージラッパー
// このファイルの firebaseConfig と WORKSPACE_ID を、ご自身の Firebase プロジェクトの値に書き換えてください。
// 詳しい手順は同梱の SETUP.md を参照してください。

import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  memoryLocalCache,
  doc, setDoc, deleteDoc, onSnapshot,
  collection, writeBatch, getDocs,
} from 'firebase/firestore';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from 'firebase/auth';

// ============ ★ ここを書き換え ★ ============
// Firebase コンソール > プロジェクトの設定 > マイアプリ > SDKの設定と構成 から取得した値を貼り付けてください
const firebaseConfig = {
  apiKey: "AIzaSyA2iQimhNq11ElsLb57qq3fuKx_3OGIcPE",
  authDomain: "koutei-zu.firebaseapp.com",
  projectId: "koutei-zu",
  storageBucket: "koutei-zu.firebasestorage.app",
  messagingSenderId: "216721910736",
  appId: "1:216721910736:web:ab54948bdb9cda9ccbe7d5"
};

// チーム共有のワークスペースID（同じIDの人同士で同じデータを共有）
// 用途や所属に応じて自由に変更してください（例: "liebe-asia-team", "tokyo-office" など）
export const WORKSPACE_ID = "liebe-asia-team";

// 許可する Gmail アドレス（ここに無い人はサインインしてもサインアウトされる）
const ALLOWED_EMAILS = ['kei.n412@gmail.com'];
// =============================================

const app = initializeApp(firebaseConfig);
// このプロジェクトの Firestore データベース名は "default"（カッコなし、Enterprise edition）。
// デフォルトの "(default)" を参照しても見つからないため、明示的に指定する。
// メモリキャッシュ：端末間で表示が乖離しないよう、毎回サーバから取得する。
const DATABASE_ID = 'default';
const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
}, DATABASE_ID);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export async function signIn() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  return signOut(auth);
}

// 認証状態の購読。callback({ user, allowed, deniedEmail, ready })
// - 未サインイン: { user: null, allowed: false, ready: true }
// - 許可ユーザー: { user: {...}, allowed: true, ready: true }
// - 非許可ユーザー: 自動サインアウト後 { user: null, allowed: false, deniedEmail, ready: true }
export function subscribeAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback({ user: null, allowed: false, ready: true });
      return;
    }
    const email = user.email || '';
    if (ALLOWED_EMAILS.includes(email)) {
      callback({
        user: { email, displayName: user.displayName, photoURL: user.photoURL },
        allowed: true,
        ready: true,
      });
    } else {
      await signOut(auth);
      callback({ user: null, allowed: false, deniedEmail: email, ready: true });
    }
  });
}

// タスク：1件 = 1 Firestore ドキュメント（複数端末での同時編集に強い）
export const tasksStore = {
  subscribe(callback, onError) {
    const colRef = collection(db, 'workspaces', WORKSPACE_ID, 'tasks');
    return onSnapshot(colRef, (snap) => {
      const arr = [];
      snap.forEach(d => arr.push(d.data()));
      callback(arr);
    }, (err) => {
      console.error('タスク購読エラー:', err);
      if (onError) onError(err);
    });
  },
  async upsert(task) {
    const ref = doc(db, 'workspaces', WORKSPACE_ID, 'tasks', task.id);
    await setDoc(ref, task);
  },
  async remove(taskId) {
    const ref = doc(db, 'workspaces', WORKSPACE_ID, 'tasks', taskId);
    await deleteDoc(ref);
  },
  // upserts: Task[], deletes: string[]
  async batch(upserts, deletes) {
    const list = upserts || [];
    const del = deletes || [];
    if (list.length === 0 && del.length === 0) return;
    // Firestore のバッチ上限（500件）を超える場合は分割
    const chunkSize = 450;
    for (let i = 0; i < list.length || i < del.length; i += chunkSize) {
      const batch = writeBatch(db);
      const upChunk = list.slice(i, i + chunkSize);
      const delChunk = del.slice(i, i + chunkSize);
      for (const t of upChunk) {
        const ref = doc(db, 'workspaces', WORKSPACE_ID, 'tasks', t.id);
        batch.set(ref, t);
      }
      for (const id of delChunk) {
        const ref = doc(db, 'workspaces', WORKSPACE_ID, 'tasks', id);
        batch.delete(ref);
      }
      await batch.commit();
    }
  },
  async listAll() {
    const colRef = collection(db, 'workspaces', WORKSPACE_ID, 'tasks');
    const snap = await getDocs(colRef);
    const arr = [];
    snap.forEach(d => arr.push(d.data()));
    return arr;
  },
};

// Claude.ai の window.storage と同じ形のAPI
export const storage = {
  async get(key) {
    return new Promise((resolve) => {
      const ref = doc(db, 'workspaces', WORKSPACE_ID, 'data', key);
      const unsub = onSnapshot(ref, (snap) => {
        unsub();
        if (!snap.exists()) resolve(null);
        else resolve({ key, value: snap.data().value, shared: true });
      }, () => resolve(null));
    });
  },
  async set(key, value) {
    const ref = doc(db, 'workspaces', WORKSPACE_ID, 'data', key);
    await setDoc(ref, { value, updatedAt: Date.now() });
    return { key, value, shared: true };
  },
  async delete(key) {
    const ref = doc(db, 'workspaces', WORKSPACE_ID, 'data', key);
    await deleteDoc(ref);
    return { key, deleted: true, shared: true };
  },
  // リアルタイム監視。チームの他のメンバーが変更したら即座に画面が更新される
  subscribe(key, callback) {
    const ref = doc(db, 'workspaces', WORKSPACE_ID, 'data', key);
    return onSnapshot(ref, (snap) => {
      callback(snap.exists() ? snap.data().value : null);
    }, (err) => {
      console.error('購読エラー:', err);
    });
  },
};
