// Firebase 初期化 & ストレージラッパー
// このファイルの firebaseConfig と WORKSPACE_ID を、ご自身の Firebase プロジェクトの値に書き換えてください。
// 詳しい手順は同梱の SETUP.md を参照してください。

import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  memoryLocalCache, persistentLocalCache, persistentMultipleTabManager,
  doc, setDoc, deleteDoc, onSnapshot, getDocFromServer, getDocFromCache,
  collection, writeBatch, getDocs, getDocsFromServer, deleteField, FieldPath,
  query, orderBy, startAt, endAt, documentId,
} from 'firebase/firestore';
import { makeTaskStore } from './lib/taskPackStore.js';
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

// オーナーの Gmail アドレス（ロックアウト防止のため、firestore.rules と同じ値をコードにも残す）。
// 追加メンバーはアプリの設定画面（メンバー管理）から登録する（data/allowedEmails に保存され、
// Firestore ルールが直接参照する）。
const OWNER_EMAILS = ['kei.n412@gmail.com'];
// =============================================

const app = initializeApp(firebaseConfig);
// このプロジェクトの Firestore データベース名は "default"（カッコなし、Enterprise edition）。
// デフォルトの "(default)" を参照しても見つからないため、明示的に指定する。
// キャッシュ（2026-11-05〜）：読んだデータをこのブラウザに残す（上限 10MB・ブラウザを閉じても残る）。
//  - オフラインでも最後に読んだ内容で開け、入力はつながったときに送られる
//  - 開き直したときは変わった分だけ読む（Firestore の1日の読み取り上限を使いすぎないため）
// 表示が古いまま書き戻さないよう、タスクの「読み込み完了」はサーバーとそろってから（tasksStore.subscribe の fromCache）。
// IndexedDB が使えないブラウザ（シークレットウィンドウの一部など）では、これまでどおりメモリだけ。
const DATABASE_ID = 'default';
const CACHE_BYTES = 10 * 1024 * 1024;
function makeDb() {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager(), cacheSizeBytes: CACHE_BYTES }),
    }, DATABASE_ID);
  } catch (e) {
    console.warn('このブラウザには保存できないため、メモリだけで動きます:', e);
    return initializeFirestore(app, { localCache: memoryLocalCache() }, DATABASE_ID);
  }
}
const db = makeDb();
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// 読み込みが長いときの原因調べ。Firestore SDK は「1日の読み取り上限（無料枠）」に達しても
// エラーを返さず再試行し続ける（＝画面が「読み込み中」のまま止まる）ため、REST で1回だけ問い合わせて確かめる。
// 戻り値: 'quota'（上限に達している） / 'ok' / 'unknown'（通信できない等）
export async function checkFirestoreQuota() {
  try {
    const headers = {};
    if (auth.currentUser) headers.Authorization = 'Bearer ' + await auth.currentUser.getIdToken();
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${DATABASE_ID}/documents/workspaces/${WORKSPACE_ID}/data/allowedEmails`;
    const res = await fetch(url, { headers });
    if (res.status === 429) return 'quota';
    return 'ok';
  } catch (e) {
    return 'unknown';
  }
}

export async function signIn() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  return signOut(auth);
}

// メンバー許可リストの読み取りプローブ。
// Firestore ルール側が data/allowedEmails の emails 配列で許可判定するため、
// 「このドキュメントを読めた」＝「ルールを通過できるメンバー」になる。
// （読めない＝permission-denied なら非メンバー）
function probeMemberAccess() {
  return new Promise((resolve) => {
    const ref = doc(db, 'workspaces', WORKSPACE_ID, 'data', 'allowedEmails');
    const unsub = onSnapshot(ref, (snap) => { unsub(); resolve(snap.exists()); }, () => resolve(false));
  });
}

// 認証状態の購読。callback({ user, allowed, deniedEmail, ready })
// - 未サインイン: { user: null, allowed: false, ready: true }
// - 許可ユーザー（オーナー or メンバー）: { user: {...}, allowed: true, ready: true }
// - 非許可ユーザー: 自動サインアウト後 { user: null, allowed: false, deniedEmail, ready: true }
export function subscribeAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback({ user: null, allowed: false, ready: true });
      return;
    }
    const email = user.email || '';
    let allowed = OWNER_EMAILS.includes(email);
    if (!allowed) allowed = await probeMemberAccess();
    if (allowed) {
      callback({
        user: { email, displayName: user.displayName, photoURL: user.photoURL, isOwner: OWNER_EMAILS.includes(email) },
        allowed: true,
        ready: true,
      });
    } else {
      await signOut(auth);
      callback({ user: null, allowed: false, deniedEmail: email, ready: true });
    }
  });
}

// メンバー許可リスト（オーナー以外の追加メンバー）。
// Firestore ルールが emails 配列を直接参照するため、他の data キーと違い
// value(JSON文字列) ではなく emails フィールドにそのまま保存する。
export const memberList = {
  subscribe(callback) {
    const ref = doc(db, 'workspaces', WORKSPACE_ID, 'data', 'allowedEmails');
    return onSnapshot(ref, (snap) => {
      const d = snap.exists() ? snap.data() : null;
      callback(Array.isArray(d?.emails) ? d.emails : []);
    }, (err) => console.error('メンバーリスト購読エラー:', err));
  },
  async set(emails) {
    const ref = doc(db, 'workspaces', WORKSPACE_ID, 'data', 'allowedEmails');
    await setDoc(ref, { emails, updatedAt: Date.now() });
  },
};

// タスク：まとめ保存（2026-11-06〜）。タスクを数十個の「まとめ」（1まとめ＝1ドキュメント）に入れる。
// 以前は1件＝1ドキュメント（workspaces/{wid}/tasks/{id}）で、開き直すたびに全件（数千件）を読んでいた。
// Firestore の無料枠は「1日に読めるドキュメントの数」なので、まとめにすると全部読んでもまとめの数（既定 64）だけになる。
//  - 目印：workspaces/{wid}/data/taskPacks（{ v: 1, packs: まとめの数, … }）
//  - まとめ：workspaces/{wid}/data/taskPacks/packs/{p00〜}（{ t: { タスクid: タスク } }）
//  - 1件の保存は、そのまとめの t.{id} だけを置き換える（mergeFields。ほかのタスクは触らない＝同時編集に強いまま）
//  - 目印が無ければ、最初に開いたときに旧 tasks を一度だけ読んでまとめへ移す（旧 tasks は消さずに残す＝控え）
// data 配下なので Firestore ルールの変更は不要。割り振り（taskPackOf）は連携スクリプト・帳票スクリプトと同じ
export const tasksStore = makeTaskStore({
  db, workspaceId: WORKSPACE_ID,
  doc, collection, setDoc, getDocs, getDocsFromServer, getDocFromServer, getDocFromCache, onSnapshot, writeBatch, deleteField, FieldPath,
});

// Claude.ai の window.storage と同じ形のAPI
export const storage = {
  // まずサーバーから読む（読んで書き戻す処理が、保存してある古い値を使わないように）。
  // オフライン・時間切れ（8秒）のときは、このブラウザに保存してある値を使う
  async get(key) {
    const ref = doc(db, 'workspaces', WORKSPACE_ID, 'data', key);
    const wrap = (snap) => (snap && snap.exists() ? { key, value: snap.data().value, updatedAt: snap.data().updatedAt || null, shared: true } : null);
    try {
      const snap = await Promise.race([
        getDocFromServer(ref),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);
      return wrap(snap);
    } catch (e) {
      try { return wrap(await getDocFromCache(ref)); } catch (e2) { return null; }
    }
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

// data コレクション内で「プレフィックス付きキー = 1件1ドキュメント」を扱う汎用ストア。
// 1ドキュメント集中型（配列を丸ごとJSON保存）の弱点（1MB上限・後勝ちで他端末の変更が消える）を
// 避けるため、帳票・売上月次はこの形で保存する。既存ルール（data/{document=**}）の範囲内。
function prefixStore(prefix) {
  const colRef = () => collection(db, 'workspaces', WORKSPACE_ID, 'data');
  const rangeQuery = () => query(colRef(), orderBy(documentId()), startAt(prefix), endAt(prefix + '\uf8ff'));
  const parse = (snap, out) => {
    const raw = snap.data().value;
    try { out[snap.id.slice(prefix.length)] = JSON.parse(raw); }
    catch (e) { console.error(`${snap.id} の読み取りに失敗:`, e); }
  };
  return {
    // callback({ [キー（プレフィックス無し）]: パース済みオブジェクト })
    subscribe(callback, onError) {
      return onSnapshot(rangeQuery(), (qs) => {
        const out = {};
        qs.forEach(d => parse(d, out));
        callback(out);
      }, (err) => {
        console.error(`${prefix}* 購読エラー:`, err);
        if (onError) onError(err);
      });
    },
    async set(key, obj) {
      const ref = doc(db, 'workspaces', WORKSPACE_ID, 'data', prefix + key);
      await setDoc(ref, { value: JSON.stringify(obj), updatedAt: Date.now() });
    },
    async remove(key) {
      await deleteDoc(doc(db, 'workspaces', WORKSPACE_ID, 'data', prefix + key));
    },
    async listAll() {
      const qs = await getDocs(rangeQuery());
      const out = {};
      qs.forEach(d => parse(d, out));
      return out;
    },
    // entries: [key, obj] の配列。旧形式からの一括移行に使う
    async setMany(entries) {
      const chunkSize = 400;
      for (let i = 0; i < entries.length; i += chunkSize) {
        const batch = writeBatch(db);
        for (const [k, v] of entries.slice(i, i + chunkSize)) {
          batch.set(doc(db, 'workspaces', WORKSPACE_ID, 'data', prefix + k), { value: JSON.stringify(v), updatedAt: Date.now() });
        }
        await batch.commit();
      }
    },
  };
}

// 帳票：1帳票 = 1ドキュメント（キー = 帳票id）
export const billingStore = prefixStore('bill_');
// 売上登録表：1か月 = 1ドキュメント（キー = 'YYYY-MM'）
export const salesStore = prefixStore('sales_');
// 過去分の保管庫：1か月 = 1ドキュメント（キー = 'YYYY-MM'、値 = 過去分の配列）。
// 毎回読み込む tasks とは別に置き、「過去分の取り込み」を開いたときだけ読む（読み込み回数を増やさないため）
export const legacyStore = prefixStore('legacy_');
