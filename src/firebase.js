// Firebase 初期化 & ストレージラッパー
// このファイルの firebaseConfig と WORKSPACE_ID を、ご自身の Firebase プロジェクトの値に書き換えてください。
// 詳しい手順は同梱の SETUP.md を参照してください。

import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc, setDoc, deleteDoc, onSnapshot,
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
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
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
