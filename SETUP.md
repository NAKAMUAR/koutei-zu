# 工程図 セットアップガイド

「言の葉」と同じく GitHub Pages に公開します。データは Firebase（無料）に保存されるので、PC・スマホ・タブレットのどこからでも同じ内容が見られ、チームでも共有できます。

所要時間の目安：**30〜45分**（初回のみ）

---

## 📋 全体の流れ

1. **Firebase の準備**（15分）：データ保存先を作る
2. **GitHub の準備**（10分）：公開先のリポジトリを作る
3. **ローカルでの作業**（10分）：Firebase の設定値を貼り付け、動作確認、公開

---

## Phase 1: Firebase の準備

### 1-1. Firebase プロジェクトを作る

1. https://console.firebase.google.com/ にGoogleアカウントでログイン
2. 「**プロジェクトを追加**」をクリック
3. プロジェクト名: `koutei-zu`（任意の名前でOK）
4. Google アナリティクス: **無効でOK**（必要なら有効でも可）
5. 「プロジェクトを作成」→ しばらく待つ → 「続行」

### 1-2. Web アプリを登録

1. プロジェクトのトップ画面で **`</>`（Web）アイコン** をクリック
2. アプリのニックネーム: `koutei-zu-web`
3. 「Firebase Hosting も設定する」は **チェックしない**
4. 「アプリを登録」
5. 表示される `firebaseConfig` の **コード全体をメモ帳などにコピーして保存**
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
   ※ 後で使います
6. 「コンソールに進む」

### 1-3. Firestore Database を有効化

1. 左メニュー「**構築 > Firestore Database**」
2. 「データベースの作成」をクリック
3. ロケーション: **`asia-northeast1`（東京）** を選択
4. モード: **本番環境モード** を選択 → 「作成」
5. データベースが作成されたら、上部の「**ルール**」タブを開く
6. 内容をすべて削除し、以下を貼り付け：
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /workspaces/{workspaceId}/data/{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
7. 「公開」をクリック

### 1-4. 匿名認証を有効化

1. 左メニュー「**構築 > Authentication**」
2. 「始める」をクリック
3. 「Sign-in method」タブを開く
4. プロバイダー一覧から「**匿名**」をクリック
5. 「有効にする」をオンにして「保存」

✅ **Firebase 側の準備は完了です**

---

## Phase 2: GitHub の準備

### 2-1. リポジトリを作成

1. https://github.com/new にアクセス
2. Repository name: `koutei-zu`（言の葉と同じ命名感覚）
3. **Public** を選択（GitHub Pages の無料利用には必要）
4. 「Add a README file」にチェック
5. 「Create repository」

### 2-2. GitHub Pages の準備

リポジトリのページで：
1. 上部の「**Settings**」タブ
2. 左メニュー「**Pages**」
3. Source: **Deploy from a branch**
4. Branch: **gh-pages**（まだ存在しなくてOK、後で自動で作られる）
5. Folder: **/ (root)**
6. 「Save」（gh-pages ブランチがまだ無くてエラーが出ても問題ありません）

---

## Phase 3: ローカルでの作業

Macのターミナルを開いてください。

### 3-1. プロジェクトを準備

```bash
# 好きな場所に移動（例: ~/Documents）
cd ~/Documents

# リポジトリをクローン
git clone https://github.com/nakamuar/koutei-zu.git
cd koutei-zu
```

ダウンロードした `koutei-zu` フォルダの中身（`src/`, `package.json` など）を、いま clone した `koutei-zu` フォルダの中に **すべてコピー** してください。

Finder で行う場合：
- ダウンロードしたフォルダの中身を全選択 → コピー
- `~/Documents/koutei-zu/` を開いて貼り付け（README は上書きでOK）

### 3-2. Firebase 設定を貼り付け

`src/firebase.js` をテキストエディタ（VS Code 推奨）で開きます。

ファイル先頭に近い部分の `firebaseConfig = { ... }` の中身を、Phase 1-2 でメモした自分の値に書き換えてください。

また、`WORKSPACE_ID` も自由に決めてください：
```js
export const WORKSPACE_ID = "liebe-asia-team";  // ← チーム名など
```

### 3-3. リポジトリ名と vite.config.js を合わせる

リポジトリ名を `koutei-zu` 以外にした場合は、`vite.config.js` の base を変更：
```js
base: '/あなたのリポジトリ名/',
```

### 3-4. 動作確認

```bash
npm install
npm run dev
```

ブラウザで http://localhost:5173 が開けば成功。タスクを登録して、画面を再読み込みしてもデータが残っていれば Firebase 接続もOKです。

### 3-5. 公開！

```bash
# 動作確認用サーバーを止める（Ctrl+C）
# Git にコミット & プッシュ
git add .
git commit -m "Initial deploy"
git push

# GitHub Pages へデプロイ
npm run deploy
```

1〜2分待ってから https://nakamuar.github.io/koutei-zu/ にアクセス。
工程図が表示されれば完了です 🎉

---

## 🔄 今後の使い方

### 機能を追加・修正したいとき

```bash
cd ~/Documents/koutei-zu
# ファイルを編集
npm run dev   # ローカルで確認
git add . && git commit -m "変更内容" && git push
npm run deploy   # 公開を更新
```

### チームに共有するとき

URL をそのまま共有するだけです：
https://nakamuar.github.io/koutei-zu/

同じワークスペースIDを使っているメンバー全員が、同じデータを見られます。
誰かがタスクを追加すると、他のメンバーの画面にも即座に反映されます。

---

## ⚠️ セキュリティについての注意

現在の設定では「URLを知っている人」なら誰でもアクセス・編集できます。
社外秘の情報を入れる場合は、以下のどちらかをご検討ください：

- ワークスペースIDを推測しづらいランダムな文字列にする（例: `liebe-9k2m-xq4p`）
- 後から Google ログイン認証を追加して、特定のメールアドレスだけ許可する

ご希望があれば、別途お手伝いします。

---

## 💡 困ったとき

| 症状 | 対処 |
|---|---|
| `npm install` でエラー | Node.js を https://nodejs.org/ から最新版にする |
| 画面が真っ白 | ブラウザの「開発者ツール > Console」のエラーを確認。だいたい firebase.js の設定値の貼り間違い |
| 「読み込み中...」のまま | Firestore のルールが正しく公開されているか、匿名認証が有効か再確認 |
| GitHub Pages が 404 | リポジトリ名と vite.config.js の `base` が一致しているか確認 |

セットアップで詰まった場合、エラーメッセージのスクリーンショットを共有してください。
