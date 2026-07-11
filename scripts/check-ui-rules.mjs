#!/usr/bin/env node
// UI品質ガード：2026-07 の UI改善（点数評価に基づく改善一式）が後退していないかを検査する。
// `npm run build` の prebuild として自動実行され、違反があるとビルドが失敗する。
// ルールの背景・変更手順は CLAUDE.md の「UI品質ガード」の節を参照。
// このスクリプト自体の削除・緩和は、ユーザー（リポジトリオーナー）の明示的な指示がある場合のみ可。
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');
const errors = [];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.(jsx?|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(SRC);
const read = (p) => readFileSync(p, 'utf8');
const rel = (p) => p.slice(ROOT.length);

// ---- ルール1: alert()・confirm() 禁止（notify() / confirmDialog() を使う） ----
for (const f of files) {
  if (f.endsWith('ui/toast.jsx') || f.endsWith('ui/confirmDialog.jsx')) continue;
  const src = read(f);
  const m = src.match(/(?<![\w.])alert\s*\(/g);
  if (m) errors.push(`${rel(f)}: alert() が ${m.length} 件あります。src/ui/toast.jsx の notify() を使ってください。`);
  const c = src.match(/(?:window\.confirm|(?<![\w.$])confirm)\s*\(/g);
  if (c) errors.push(`${rel(f)}: confirm() が ${c.length} 件あります。src/ui/confirmDialog.jsx の confirmDialog() を使ってください。`);
}

// ---- ルール2: 分割済みファイルの存在（App.jsx への再統合の禁止） ----
for (const p of ['src/ui/toast.jsx', 'src/ui/controls.jsx', 'src/ui/useEscKey.js', 'src/ui/confirmDialog.jsx', 'src/ui/useMediaQuery.js', 'src/views/MemoView.jsx', 'src/lib/text.js', 'src/lib/datetime.js', 'src/lib/colors.js', 'src/lib/scheduler.js']) {
  if (!existsSync(join(ROOT, p))) errors.push(`${p} がありません。分割済みモジュールを App.jsx へ戻さないでください。`);
}

// ---- ルール3: App.jsx の構造（トースト表示・ナビのグループ化） ----
const appPath = join(SRC, 'App.jsx');
if (existsSync(appPath)) {
  const app = read(appPath);
  if (!/<ToastHost\b/.test(app)) errors.push('src/App.jsx: <ToastHost /> がルートに見当たりません（トースト通知が表示されなくなります）。');
  if (!/<NavDropdown\b/.test(app)) errors.push('src/App.jsx: <NavDropdown> が見当たりません（経理・管理のナビグループ化を維持してください）。');
  if (!/<ConfirmHost\b/.test(app)) errors.push('src/App.jsx: <ConfirmHost /> がルートに見当たりません（confirmDialog() が表示されなくなります）。');
  if (!/<GlobalSearch\b/.test(app)) errors.push('src/App.jsx: <GlobalSearch> が見当たりません（ヘッダーのグローバル検索を維持してください）。');
  if (!/useMediaQuery\(/.test(app)) errors.push('src/App.jsx: useMediaQuery() が見当たりません（狭い画面向けレイアウトを維持してください）。');
  // 最小フォント 11px ルール：fontSize: 10.5 は禁止、fontSize: 10 はロゴ下タグライン2箇所のみ許容
  if (/fontSize:\s*10\.5\b/.test(app)) errors.push('src/App.jsx: fontSize: 10.5 が再導入されています。最小 11px を維持してください。');
  const fs10 = (app.match(/fontSize:\s*10\b/g) || []).length;
  if (fs10 > 2) errors.push(`src/App.jsx: fontSize: 10 が ${fs10} 箇所あります（許容はロゴ下タグラインの2箇所のみ）。最小 11px を維持してください。`);
}

// ---- ルール4: モーダルの Esc 対応（共有部品側） ----
const controlsPath = join(SRC, 'ui/controls.jsx');
if (existsSync(controlsPath) && !/useEscKey\(/.test(read(controlsPath))) {
  errors.push('src/ui/controls.jsx: useEscKey() の呼び出しが見当たりません（モーダルの Esc 閉じを維持してください）。');
}

// ---- ルール5: スケジューラのテストが存在し、prebuild で実行されること ----
if (!existsSync(join(ROOT, 'scripts/tests/scheduler.test.mjs'))) {
  errors.push('scripts/tests/scheduler.test.mjs がありません。スケジューラの自動テストを維持してください。');
}
try {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  if (!/npm test|node --test/.test(pkg.scripts?.prebuild || '')) {
    errors.push('package.json: prebuild からテスト実行（npm test）が外されています。');
  }
} catch (e) { errors.push('package.json が読めません: ' + e.message); }

if (errors.length) {
  console.error('\n✖ UI品質ガード違反（2026-07 UI改善の後退を検出）\n');
  for (const e of errors) console.error('  - ' + e);
  console.error('\nルールの詳細は CLAUDE.md の「UI品質ガード」を参照してください。');
  console.error('意図的にデザインを戻す場合（復元フレーズ「デザイン復元：design-v1」）の手順も CLAUDE.md にあります。\n');
  process.exit(1);
}
console.log('✓ UI品質ガード: 問題なし');
