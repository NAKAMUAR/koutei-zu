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

> **即時反映は毎回必須（ユーザー指示・2026-06）**: どのセッション（ローカル / Claude Code on the web の作業ブランチ含む）でも、修正のたびに必ず `npm run deploy` を実行して本番（https://nakamuar.github.io/koutei-zu/）へ即時反映する。作業ブランチ運用の場合でも、ソースは指定ブランチへ push しつつ、デプロイ（gh-pages 公開）は毎回行う。デプロイ可否を都度確認しない。

> **CI 自動デプロイ（GitHub Actions・2026-06）**: `.github/workflows/deploy.yml` により **main への push で自動ビルド＆ gh-pages 公開**される（`peaceiris/actions-gh-pages`、`GITHUB_TOKEN` 使用、Pages は従来どおり `gh-pages` ブランチ配信）。
> - **ローカル作業（main へ直接 push）**: push すれば CI が自動デプロイするので、手元の `npm run deploy` は省略可（手元から即時反映したい場合は実行してもよい）。
> - **Claude Code on the web の作業ブランチ**: CI は main 限定トリガーのため作業ブランチ push では動かない。**マージ前に即時反映が必要なので、従来どおり `npm run deploy` を手元（セッション内）で必ず実行する**こと。
> - GitHub 側設定: Settings → Pages の Source は「Deploy from a branch: `gh-pages` / root」のまま（変更不要）。Actions の workflow permissions は read/write 必要（`permissions: contents: write` を workflow で明示済み）。

## ソースの場所（重要）

- **作業対象の最新ソースはこのリポジトリ**: `/Users/nakamurakeisuke/Documents/koutei-zu`（`src/App.jsx` ほぼ単一ファイル）
- `~/repos/nakamuar.github.io` は別物（玄関ポータルの `index.html` のみ）。混同しない。
- リモート: `origin` = GitHub `NAKAMUAR/koutei-zu`（push 時に旧 URL からのリダイレクト警告が出るが push は成功する）
- 公開 URL: https://nakamuar.github.io/koutei-zu/

## 技術スタック

- React 18 + Vite 5（JavaScript / JSX、TypeScript不使用）、インラインスタイル、lucide-react
- バックエンド: Firebase（Cloud Firestore + Auth）。`storage`（`workspaces/{id}/data/{key}` の汎用KV）と `tasksStore`（タスク1件=1ドキュメント）
- ホスティング: GitHub Pages（`gh-pages` で `dist/` を公開）
- Firestore ルール（`firestore.rules`）は許可メールのみ読み書き可。`data/{document=**}` で任意キー許可。
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
