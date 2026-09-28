// LINE Bot 用の Google Apps Script ファイル（line-bot/dist/Code.gs）を生成する。
// アプリ本体と同じスケジュール計算を使うため、src/lib・src/viewpoint の純ロジックを
// ES モジュール構文を外して1つの名前空間（KouteiLib）にまとめ、bot.js と連結する。
// `npm run build` の前に自動実行される（prebuild）。生成物はコミットし、GAS エディタへ貼り付けて使う。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

// 依存順（後のファイルが前のファイルの関数を使う）
const LIB_FILES = ['src/viewpoint/viewpointUtils.js', 'src/lib/utils.js', 'src/lib/schedule.js'];
const LIB_EXPORTS = [
  'migrateTask', 'normalizePriorities', 'scheduleTasks', 'computeProjectOrder', 'compareCompanyDisplay',
  'sortAssigneesByMaster', 'syncHolidays', 'isNonWorkingDay', 'DEFAULT_SETTINGS',
  'fmtYMD', 'parseYMD', 'addDays', 'startOfDay', 'minToTime', 'dayName',
];

function stripModuleSyntax(src, file) {
  let out = src.replace(/^import\s[^;]*?from\s+['"][^'"]+['"];?[ \t]*$/gm, '');
  out = out.replace(/^export\s*\{[\s\S]*?\};?[ \t]*$/gm, '');
  out = out.replace(/^export\s+(?=(const|function|let|class|async)\b)/gm, '');
  if (/^\s*(import|export)\b/m.test(out)) {
    throw new Error(`${file}: 変換できない import/export 構文が残っています`);
  }
  return out;
}

const libBody = LIB_FILES.map((f) => {
  const src = readFileSync(join(root, f), 'utf8');
  return `// ---- ${f} ----\n${stripModuleSyntax(src, f)}`;
}).join('\n');

const bundle = [
  '// ============================================================',
  '// 工程図 LINE Bot（Google Apps Script）',
  '// このファイルは line-bot/build.mjs が自動生成したものです。直接編集しないでください。',
  '// 使い方は line-bot/README.md を参照。',
  '// ============================================================',
  '',
  'var KouteiLib = (function () {',
  libBody,
  `return { ${LIB_EXPORTS.join(', ')} };`,
  '})();',
  '',
  readFileSync(join(here, 'bot.js'), 'utf8'),
].join('\n');

const outDir = join(here, 'dist');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'Code.gs'), bundle);
console.log('line-bot/dist/Code.gs を生成しました');
