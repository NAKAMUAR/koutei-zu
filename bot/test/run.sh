#!/bin/sh
# bot/worker.js のテストを実行する。
#   sh bot/test/run.sh
#
# worker.js は Cloudflare へ貼り付ける1ファイル構成のため、内部の関数を export していない。
# テスト用に export を追記したコピー（.worker.mjs）を作ってから読み込む。
set -e
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cp "$DIR/../worker.js" "$DIR/.worker.mjs"
cat >> "$DIR/.worker.mjs" <<'EXPORTS'
export { parseHM, fmtHM, kanaNormalize, parseDateInput, resolveViewpointSteps, buildTasks,
  cmdStatus, cmdDue, cmdWho, toFsValue, fromFsValue, toFsFields, fromFsFields, previewText,
  parseCommand, DEFAULT_STEP_TYPES, discordComponents, modalKindFor, splitMessage, discordModal, MODAL_FIELDS };
EXPORTS

fail=0
for t in logic telegram discord; do
  printf '%-10s ' "$t"
  if node "$DIR/$t.test.mjs" > "$DIR/.$t.out" 2>&1; then
    echo '合格'
  else
    echo '失敗'
    cat "$DIR/.$t.out"
    fail=1
  fi
done
rm -f "$DIR/.worker.mjs" "$DIR"/.*.out
[ $fail -eq 0 ] && echo '★ すべて合格'
exit $fail
