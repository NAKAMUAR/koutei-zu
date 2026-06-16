# お客様マスタ 一括登録（ローカル実行・GitHub不使用）

`scripts/import-customers.mjs` は、**あなたのMacだけ**で実行して Firestore の
お客様マスタ（`customerMaster`）に会社データを直接追記するスクリプトです。
お客様の個人情報（PII）も鍵も **GitHub には一切載りません**（すべて `.gitignore` 済み）。

- 既存データは消しません（**追記マージ**。会社名が既に登録済みの行はスキップ）
- 列順：`会社名 / 担当者名 / 郵便番号 / 住所 / 電話番号 / メール / URL`
- 担当者名・メールは「お客様担当者」として登録されます

## 手順

### 1. サービスアカウント鍵を発行
1. Firebase コンソール → プロジェクト `koutei-zu` を開く
2. ⚙️ プロジェクトの設定 → **サービス アカウント** タブ
3. **新しい秘密鍵を生成** → ダウンロードしたJSONを `scripts/service-account.json` に保存

> この鍵はDB全権を持つ秘密情報です。リポジトリには入りません（`.gitignore`済み）。
> 取り込みが終わったら、コンソールの同じ画面で鍵を**削除（無効化）**して構いません。

### 2. お客様データを保存
いただいた表（タブ区切りのまま）を `scripts/customers.local.tsv` に保存します。
- Excel／スプレッドシートからコピーした内容をそのまま貼り付けて保存すればOK
- 1行＝1社、列はタブ区切り

### 3. 依存をインストール
```bash
npm i -D firebase-admin
```

### 4. まず確認（書き込みなし）
```bash
node scripts/import-customers.mjs
```
追加される会社の件数・一覧が表示されます（この時点ではDBに書き込みません）。

### 5. 問題なければ書き込み
```bash
node scripts/import-customers.mjs --write
```
完了後、アプリの **設定 → お客様マスタ** を開くと反映されています。

## 補足
- ファイルのパスを変えたい場合は環境変数で指定できます：
  ```bash
  SA_KEY=path/to/key.json DATA=path/to/data.tsv node scripts/import-customers.mjs --write
  ```
- `WORKSPACE_ID` / `DATABASE_ID` は `src/firebase.js` の値（`liebe-asia-team` / `default`）に合わせてあります。変更している場合はスクリプト冒頭の定数も合わせてください。
- アプリ側（設定 → お客様マスタ → 「一括インポート（貼り付け）」）でも同じ取り込みができます。こちらはブラウザのログインで直接書き込むため、鍵は不要です。
