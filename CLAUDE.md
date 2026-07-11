# koutei-zu（工程図アプリ）作業ルール

このファイルは作業のたびに自動で読み込まれる。**修正に着手する前に毎回必ず読むこと。** 内容が古くなったら随時このファイルを更新する。

## 必須運用ルール（毎回・例外なし）

修正を行うたびに、以下を**必ずワンセット**で実施する：

1. `npm run build` が**警告・エラーなく通る**ことを確認する
2. `npm run deploy`（= `vite build` → `gh-pages -d dist`）でデプロイする
3. **未コミット・未プッシュの変更をすべてコミットし、`git push origin main` で GitHub に反映する**
   - 過去に未コミットのまま残っている変更があれば、それも含めてコミットする
   - 作業終了時に `git status` がクリーン、かつ `git log origin/main..HEAD` が空であることを確認する
4. コミットメッセージ末尾に `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` を付ける

> デプロイ（gh-pages）と main への push は**必ずセット**。デプロイだけしてソース（main）への push を忘れると、GitHub のソースが古いまま乖離する（過去に発生済み）。

### 自動デプロイ（Stop フック）

上記 1〜3 の取りこぼしを防ぐため、`.claude/settings.json` の **Stop フック**（`.claude/hooks/deploy-on-stop.sh`）が、ターン終了時に次を自動実行する：

- カレントブランチが `main` で、**未コミットの変更がなく**、`origin/main..HEAD` に**未プッシュのコミットがある**場合 → 自動で `npm run build` → `npm run deploy` → `git push origin main` を実行する。
- 未コミットの変更が残っている場合は自動デプロイせず、コミットを促す（手動でコミットすれば次のターン終了時に自動デプロイされる）。
- `main` 以外のブランチでは何もしない。

> あくまで取りこぼし防止の保険。手動で 1〜3 を実施するのが基本。フックの確認・無効化は `/hooks` から行える。

## デザイン復元（UI改善 2026-07 のロールバック）

ユーザーから **「デザイン復元：design-v1」** というメッセージ（またはこれに準ずる「UI改善前のデザインに戻して」という明確な依頼）が来たら、以下の手順で 2026-07 の UI改善を取り消して元のデザインへ戻すこと：

- 改善前のベースライン: `ded4cf4`。UI改善は `02faebe` から始まる一連のコミット（第1弾 `02faebe`・ガード `bf70e34`・分割 `e6587da`・テスト `aa53d75`・confirm置換 `063475f`・レスポンシブ/検索 `1e009cd` とその後続。`git log --oneline ded4cf4..HEAD` で確認）。
- 手順（推奨）: `git revert --no-edit ded4cf4..HEAD` で UI改善コミット群を一括 revert する（改善後に UI改善以外の機能修正コミットが入っている場合は、そのコミットだけ revert 対象から除外する）。コンフリクトは「改善前（ded4cf4 時点）の見た目」を優先して解消する。UI品質ガード・テストも同時に取り消されるため、追加のガード解除作業は不要。
  - revert が大きく衝突する場合の代替: `git checkout ded4cf4 -- src/ scripts/ package.json` で丸ごと戻し、`src/ui/ src/views/ src/lib/ scripts/tests/`（ded4cf4 に無いファイル）を削除する。ただしこの方法は改善後に入った機能修正も消えるため、`git log --oneline ded4cf4..HEAD -- src/` で後続コミットを確認し、必要な変更は再適用すること。
- 戻した後は通常どおりビルド・デプロイ・push（上記の必須運用ルール）を実施する。
- 復元フレーズによる復元は、下記「UI品質ガード」の解除が許可される唯一のケース。

> UI改善の内容（第1弾＋第2弾）: ナビの3グループ化（経理・管理ドロップダウン）／案件編集モードのヘッダー内トグル化／alert()→トースト通知／confirm()→アプリ内確認ダイアログ／タスク削除の「元に戻す」トースト／データ更新ボタンの設定パネル移動／「登録して詳細編集へ」ボタン／Escでモーダル閉じ・フォーカス管理・aria-label／最小フォント11px化／レスポンシブ対応（900px以下でナビをメニュー化）／ヘッダーのグローバル検索／App.jsx の分割（src/ui/・src/views/・src/lib/）／スケジューラの自動テスト。

## UI品質ガード（AI・人を問わず全修正に適用）

2026-07 の UI改善（点数評価に基づく改善一式）が今後の修正で後退しないよう、`scripts/check-ui-rules.mjs` が **`npm run build` のたびに自動実行され、違反があるとビルドが失敗する**（package.json の `prebuild`）。どの AI・どの環境で修正しても、必須運用ルール1（ビルドが通ること）を守る限り必ずチェックされる。

守るべきルール（＝チェック内容）：

1. **alert()・confirm() 禁止** — 通知は `src/ui/toast.jsx` の `notify(message, type, opts)`、確認は `src/ui/confirmDialog.jsx` の `await confirmDialog(message, opts)` を使う（危険操作は `danger: true`・ボタンラベルは操作名にする）
2. **分割済みモジュールを App.jsx へ再統合しない** — `src/ui/`（toast・controls・useEscKey・confirmDialog・useMediaQuery）、`src/views/MemoView.jsx`、`src/lib/`（text・datetime・colors・scheduler）を維持
3. **App.jsx の構造維持** — ルートに `<ToastHost />` と `<ConfirmHost />`、ナビは `<NavDropdown>` による経理・管理のグループ化、ヘッダーの `<GlobalSearch>`、`useMediaQuery()` による狭幅レイアウトを維持
4. **最小フォント 11px** — App.jsx で `fontSize: 10.5` 禁止、`fontSize: 10` はロゴ下タグライン2箇所のみ許容
5. **モーダルの Esc 閉じ** — `src/ui/controls.jsx` の `useEscKey()` を維持。新しいモーダルを作るときも `useEscKey(onCancel)`・`role="dialog"` を入れる
6. **スケジューラのテスト維持** — `scripts/tests/scheduler.test.mjs` と package.json の prebuild からのテスト実行（`npm test`）を維持。スケジューラ（`src/lib/scheduler.js`）の挙動を意図的に変えるときはテストも更新する

> `scripts/check-ui-rules.mjs` 自体の削除・緩和は禁止。例外は (a) ユーザーが明示的に指示した場合、(b) 復元フレーズ「デザイン復元：design-v1」による正式なデザイン復元の場合のみ。新しい UI 上の約束事ができたら、このガードにルールを**追加**していくのは歓迎。

## ソースの場所（重要）

- **作業対象の最新ソースはこのリポジトリ**: `/Users/nakamurakeisuke/Documents/koutei-zu`（`src/App.jsx` ほぼ単一ファイル）
- `~/repos/nakamuar.github.io` は別物（玄関ポータルの `index.html` のみ）。混同しない。
- リモート: `origin` = GitHub `NAKAMUAR/koutei-zu`（push 時に旧 URL からのリダイレクト警告が出るが push は成功する）
- 公開 URL: https://nakamuar.github.io/koutei-zu/

## 技術スタック

- React 18 + Vite 5（JavaScript / JSX、TypeScript不使用）、インラインスタイル、lucide-react
- ソース構成: `src/App.jsx`（メインビュー群）＋ `src/lib/`（scheduler=スケジューラ純粋ロジック・datetime・colors・text）＋ `src/ui/`（toast・confirmDialog・controls・useEscKey・useMediaQuery）＋ `src/views/MemoView.jsx` ＋ billing/ sales/ project/ viewpoint/
- テスト: `npm test`（= `node --test scripts/tests/`）。`npm run build` の prebuild で UI品質ガードとともに毎回自動実行される
- バックエンド: Firebase（Cloud Firestore + Auth）。`storage`（`workspaces/{id}/data/{key}` の汎用KV）、`tasksStore`（タスク1件=1ドキュメント）、`billingStore`（帳票1件=1ドキュメント、`data/bill_{id}`）、`salesStore`（売上1か月=1ドキュメント、`data/sales_{YYYY-MM}`）
  - 帳票・売上の旧1ドキュメント集中保存（`billingDocuments` / `salesLedger`）は起動時に自動移行され、旧データは `*_backup` キーへ退避される
- ホスティング: GitHub Pages（`gh-pages` で `dist/` を公開）
- Firestore ルール（`firestore.rules`）: オーナー（ルール内に直書き）＋ `data/allowedEmails` の emails 配列に載っているメンバーのみ読み書き可。メンバーはアプリの設定パネル（メンバー管理）で編集（リストの書き換えはオーナーのみ）。**ルールを変更したら Firebase コンソールへ手動デプロイが必要。**
- `sync/Code.gs` の `AIza...` は公開前提の Firebase Web API キー（秘密情報ではない）。本物の秘密（service-account 等）は `.gitignore` 済み。

## 確認のしかた

- ビルド検証のほか、スケジューラ等の純粋ロジックは `/tmp` に純粋関数を切り出した node スクリプトを書いて検証すると速い。
- 大きな改修は機能ごとに `npm run build` を挟みながら進める。

## 主要コマンド

```bash
npm run dev      # 開発サーバ
npm run build    # 本番ビルド（デプロイ前に必ず）
npm run deploy   # ビルド→gh-pages公開
# 仕上げに必ず:
git add -A && git commit -m "..." && git push origin main
```
