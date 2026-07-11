# koutei-zu（工程図アプリ）作業ルール

このファイルは作業のたびに自動で読み込まれる。**修正に着手する前に毎回必ず読むこと。** 内容が古くなったら随時このファイルを更新する。

## 必須運用ルール（毎回・例外なし）

修正を行うたびに、以下を**必ずワンセット**で実施する：

1. `npm run build` が**警告・エラーなく通る**ことを確認する
   - build は `prebuild` で自動的に `npm run check`（ESLint）を実行する。**ESLint エラーが1件でもあればビルドは失敗する。** エラーはルールの無効化・緩和で回避せず、コードを直すこと（ルール変更が必要な場合は先に `docs/07_UI設計原則.md` を更新して理由を残す）
2. `npm run deploy`（= `vite build` → `gh-pages -d dist`）でデプロイする
3. **未コミット・未プッシュの変更をすべてコミットし、`git push origin main` で GitHub に反映する**
   - 過去に未コミットのまま残っている変更があれば、それも含めてコミットする
   - 作業終了時に `git status` がクリーン、かつ `git log origin/main..HEAD` が空であることを確認する
4. コミットメッセージ末尾に `Co-Authored-By:` 行（作業した Claude モデル名）を付ける

> デプロイ（gh-pages）と main への push は**必ずセット**。デプロイだけしてソース（main）への push を忘れると、GitHub のソースが古いまま乖離する（過去に発生済み）。

## UI・コード品質ルール（重要）

**UI・画面・操作・コード構造に関わる変更をする前に、必ず `docs/07_UI設計原則.md` を読むこと。**
2026-07 のUIレビューで導入された設計原則（ネイティブダイアログ禁止・段階的開示・モードレス・
ファイル分割の維持など10項目）がまとまっており、主要なものは ESLint で機械的に強制されている。
要点だけ挙げると：

- `alert` / `confirm` / `prompt` 禁止 → `useApp()` の `confirmDialog` / `promptDialog` / `notify` を使う（削除には `undo` を付ける）
- `<input type="datetime-local">` 禁止 → 共通 `DateTimeField` を使う
- 1ファイル 1800 行まで（App.jsx のみ 2600）。超える前に分割する
- 共有データ・ハンドラは `useApp()`（src/appContext.js）から取得。props バケツリレーに戻さない
- 新しいトップレベルビューは `React.lazy` で追加。ナビの直接表示タブは増やさない（集計系は「集計・帳票」グループへ）

## ソースの場所（重要）

- **作業対象の最新ソースはこのリポジトリ**: `/Users/nakamurakeisuke/Documents/koutei-zu`
- `~/repos/nakamuar.github.io` は別物（玄関ポータルの `index.html` のみ）。混同しない。
- リモート: `origin` = GitHub `NAKAMUAR/koutei-zu`（push 時に旧 URL からのリダイレクト警告が出るが push は成功する）
- 公開 URL: https://nakamuar.github.io/koutei-zu/

## ソース構成（2026-07 に App.jsx 1万行の単一ファイルから分割済み）

```
src/
  App.jsx            # 状態管理・Firestore購読・タスク操作ハンドラ・画面切替（これ以上肥大させない）
  appContext.js      # AppCtx / useApp()：共有データ＋ハンドラをビューへ渡すコンテキスト
  lib/
    utils.js         # 日付・時刻・色・プリセット等の純ユーティリティ
    schedule.js      # スケジューラ・マイグレーション・並び順・視点グループ化（純ロジック）
  components/
    common.jsx       # 共通UI部品（各種モーダル・トースト・TimeSelect・DateTimeField・NavButton/NavGroup・Combobox 等）
    modals.jsx       # 過去案件引用・終了予定超過ポップアップ
    MemberSettings.jsx
  views/             # 画面単位（案件=InputView・カレンダー・担当者別・サマリー・完了・マスタ・メモ）
    input/           # 案件タブの下位部品（一覧・視点カード・ステップ行・各セクション）
  billing/ sales/ project/ viewpoint/  # 帳票・売上・案件整理・視点ロジック（従来どおり）
```

## 技術スタック

- React 18 + Vite 5（JavaScript / JSX、TypeScript不使用）、インラインスタイル、lucide-react
- ESLint 9（フラット構成 `eslint.config.js`）。`npm run check` で実行、`npm run build` の前に自動実行される
- バックエンド: Firebase（Cloud Firestore + Auth）。`storage`（`workspaces/{id}/data/{key}` の汎用KV）、`tasksStore`（タスク1件=1ドキュメント）、`billingStore`（帳票1件=1ドキュメント、`data/bill_{id}`）、`salesStore`（売上1か月=1ドキュメント、`data/sales_{YYYY-MM}`）
  - 帳票・売上の旧1ドキュメント集中保存（`billingDocuments` / `salesLedger`）は起動時に自動移行され、旧データは `*_backup` キーへ退避される
- ホスティング: GitHub Pages（`gh-pages` で `dist/` を公開）
- Firestore ルール（`firestore.rules`）: オーナー（ルール内に直書き）＋ `data/allowedEmails` の emails 配列に載っているメンバーのみ読み書き可。メンバーはアプリの設定パネル（メンバー管理）で編集（リストの書き換えはオーナーのみ）。**ルールを変更したら Firebase コンソールへ手動デプロイが必要。**
- `sync/Code.gs` の `AIza...` は公開前提の Firebase Web API キー（秘密情報ではない）。本物の秘密（service-account 等）は `.gitignore` 済み。

## 確認のしかた

- `npm run check`（ESLint）→ `npm run build` の順で必ず通す（build が check を自動実行する）。
- UIに触れた場合は `npm run preview` でログイン画面が描画されることを最低限確認する（モジュールレベルのクラッシュ検出）。
- スケジューラ等の純粋ロジックは `src/lib/` に分離済みなので、node スクリプトから直接 import して検証できる。
- 大きな改修は機能ごとに `npm run build` を挟みながら進める。

## 主要コマンド

```bash
npm run dev      # 開発サーバ
npm run check    # ESLint（UI設計原則の機械チェック）
npm run build    # 本番ビルド（check を自動実行。デプロイ前に必ず）
npm run deploy   # ビルド→gh-pages公開
# 仕上げに必ず:
git add -A && git commit -m "..." && git push origin main
```

### 自動デプロイ（Stop フック）

必須運用ルール 1〜3 の取りこぼしを防ぐため、`.claude/settings.json` の **Stop フック**（`.claude/hooks/deploy-on-stop.sh`）が、ターン終了時に次を自動実行する：

- カレントブランチが `main` で、**未コミットの変更がなく**、`origin/main..HEAD` に**未プッシュのコミットがある**場合 → 自動で `npm run build` → `npm run deploy` → `git push origin main` を実行する。
- 未コミットの変更が残っている場合は自動デプロイせず、コミットを促す（手動でコミットすれば次のターン終了時に自動デプロイされる）。
- `main` 以外のブランチでは何もしない。

> あくまで取りこぼし防止の保険。手動で 1〜3 を実施するのが基本。フックの確認・無効化は `/hooks` から行える。
