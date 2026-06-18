#!/usr/bin/env bash
# Stop フック: main に未プッシュのコミットがあれば、自動で
#   npm run build → npm run deploy（gh-pages 公開）→ git push origin main
# を実行する。CLAUDE.md の「デプロイと main への push は必ずセット」を自動化したもの。
#
# 動作条件:
#  - カレントブランチが main のときだけ動く（作業ブランチでは何もしない）
#  - 未コミットの変更があるときは自動デプロイせず、コミットを促す（block）
#  - origin/main..HEAD が空（未プッシュなし）なら何もしない
set -uo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
cd "$ROOT" 2>/dev/null || exit 0

INPUT="$(cat 2>/dev/null || true)"
# 無限ループ防止: 直前の Stop フックから継続している場合は介入しない
if printf '%s' "$INPUT" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
[ "$BRANCH" = "main" ] || exit 0

# 未コミットの変更があるならデプロイせず、コミットを促す
if ! git diff --quiet || ! git diff --cached --quiet; then
  printf '{"decision":"block","reason":"未コミットの変更があります。コミットしたうえで、CLAUDE.md の必須運用ルールに従い npm run build → npm run deploy → git push origin main を実施してください。"}'
  exit 0
fi

# origin/main を取得して未プッシュのコミットがあるか確認
git fetch origin main >/dev/null 2>&1 || true
if ! git rev-parse origin/main >/dev/null 2>&1; then
  exit 0
fi
if [ -z "$(git log origin/main..HEAD --oneline 2>/dev/null)" ]; then
  exit 0  # 未プッシュのコミットなし → 何もしない
fi

# ここまで来たら: main・クリーン・未プッシュあり → 自動でビルド/デプロイ/プッシュ
LOG=/tmp/koutei-deploy-on-stop.log
{
  echo "=== $(date) deploy-on-stop ==="
  npm run build && npm run deploy && git push origin main
} >"$LOG" 2>&1

if [ $? -eq 0 ]; then
  printf '{"systemMessage":"自動デプロイ完了: npm run deploy（gh-pages 公開）と git push origin main を実行しました。"}'
else
  printf '{"decision":"block","reason":"自動デプロイ/プッシュに失敗しました。%s を確認して手動で対応してください。"}' "$LOG"
fi
exit 0
