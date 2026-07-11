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

- 対象コミット: `02faebe`（UI改善一式：ナビ整理・トースト通知・段階登録・操作性の磨き込み）
- 改善前のベースライン: `ded4cf4`
- 手順（推奨）: `git revert --no-edit 02faebe` を実行し、コンフリクトが出たら「改善前（ded4cf4 時点）の見た目」を優先して解消する。
  - revert が大きく衝突する場合の代替: `git checkout ded4cf4 -- src/` で src を丸ごと戻す。ただしこの方法は 02faebe より後に入った src の機能修正も消えるため、`git log --oneline 02faebe..HEAD -- src/` で後続コミットを確認し、必要な変更は再適用すること。
- 戻した後は通常どおりビルド・デプロイ・push（上記の必須運用ルール）を実施する。

> UI改善の内容: ナビの3グループ化（経理・管理ドロップダウン）／案件編集モードのヘッダー内トグル化／alert()→トースト通知／データ更新ボタンの設定パネル移動／「登録して詳細編集へ」ボタン／Escでモーダル閉じ／最小フォント11px化／App.jsx の部分分割（src/ui/・src/views/・src/lib/）。

## ソースの場所（重要）

- **作業対象の最新ソースはこのリポジトリ**: `/Users/nakamurakeisuke/Documents/koutei-zu`（`src/App.jsx` ほぼ単一ファイル）
- `~/repos/nakamuar.github.io` は別物（玄関ポータルの `index.html` のみ）。混同しない。
- リモート: `origin` = GitHub `NAKAMUAR/koutei-zu`（push 時に旧 URL からのリダイレクト警告が出るが push は成功する）
- 公開 URL: https://nakamuar.github.io/koutei-zu/

## 技術スタック

- React 18 + Vite 5（JavaScript / JSX、TypeScript不使用）、インラインスタイル、lucide-react
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
