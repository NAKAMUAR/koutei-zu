// 工程図連携のスプレッドシートのひな形（管理者用・エンジニア用の2ファイル）を xlsx で書き出す。
// 実行: node sync/template/build-sheets.mjs  （npm run sheets:build）
//
// 見出し・ベトナム語・プルダウンの選択肢・初期マスタは sync/Code.gs の定数をそのまま読む（二重管理にしない）。
// Code.gs を偽の Apps Script 環境（定数と純関数だけ）で評価して JSON に書き出し、
// 書式（色・列幅・注記・プルダウン）は sync/template/build_sheets.py（openpyxl）で付ける。
// 出来上がり: sync/template/工程図連携_管理者用.xlsx ／ sync/template/工程図_エンジニア入力シート.xlsx
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(here, '..', 'Code.gs'), 'utf8');

// Code.gs はトップレベルで Google のサービスを呼ばない（定数と関数定義だけ）ので、空の文脈で評価できる
const ctx = { console };
vm.createContext(ctx);
const names = [
  'SHEET', 'STAFF_TAB_DEFAULT', 'STAFF_RULES_TAB', 'STAFF_RULES_TAB_ALIASES', 'H', 'LINK_HEADER_ORDER', 'LINK_HUMAN_FIELDS', 'LINK_HEADER_COLORS',
  'STATUS', 'STEP_KIND', 'SETTING_KEYS', 'SETTING_DEFAULTS', 'SETTING_NOTES',
  'STAFF_INPUT_COLUMNS', 'STAFF_INPUT_HINT', 'REQUEST_OPTIONS', 'PATTERN_OPTIONS', 'VIEW_VI', 'HOUR_OPTIONS',
  'INITIAL_COMPANY_MASTER', 'INITIAL_VIEW_MASTER', 'COMPANY_MASTER_HEADERS', 'VIEW_MASTER_HEADERS', 'VIEW_EXTERNAL_NOTE',
  'PROJECT_MASTER_HEADERS', 'STAFF_RULES_LINES', 'STAFF_RULES_EXAMPLES', 'HOWTO_LINES',
  'viewsOrDefault_', 'viewKeywords_', 'viewCodeOptions_', 'linkChoiceLists_', 'codePrefix_',
];
const g = vm.runInContext(src + '\n;({' + names.join(',') + '})', ctx);

const views = g.viewsOrDefault_([]);
const keywords = g.viewKeywords_(views);
// 『記入ルール/説明』の視点コード表（viewCodeLines_ と同じ内容を 3 列に分けたもの）
const viewCodeTable = keywords.map(k => {
  const v = views.filter(x => x.keyword === k)[0];
  const ja = v.external ? v.external + '①' : (v.category || v.kind || k);
  const vi = g.VIEW_VI[k] ? g.VIEW_VI[k] + (v.external ? ' ①' : '') : '';
  return { code: k + '1', ja, vi };
});
// エンジニアの会社コードのプルダウン（初期の会社マスタのうち「入力シートに出さない」が無いもの）
const companyCodes = [];
g.INITIAL_COMPANY_MASTER.forEach(r => { const c = g.codePrefix_(r[0]); if (c && !r[3] && companyCodes.indexOf(c) < 0) companyCodes.push(c); });

const data = {
  sheet: g.SHEET, staffTab: g.STAFF_TAB_DEFAULT, staffRulesTab: g.STAFF_RULES_TAB, staffRulesTabXlsx: g.STAFF_RULES_TAB_ALIASES[0],
  linkHeaders: g.LINK_HEADER_ORDER.map(k => ({ key: k, label: g.H[k], human: g.LINK_HUMAN_FIELDS.indexOf(k) >= 0 })),
  linkHeaderColors: g.LINK_HEADER_COLORS,
  statusOptions: Object.keys(g.STATUS).map(k => g.STATUS[k]),
  stepKindOptions: [g.STEP_KIND.NEW, g.STEP_KIND.ADD, g.STEP_KIND.FIX, g.STEP_KIND.CHANGE],
  linkChoices: g.linkChoiceLists_({ views }),
  settings: Object.keys(g.SETTING_KEYS).map(k => ({ key: k, label: g.SETTING_KEYS[k], value: g.SETTING_DEFAULTS[k], note: g.SETTING_NOTES[k] })),
  staffColumns: g.STAFF_INPUT_COLUMNS, staffHint: g.STAFF_INPUT_HINT,
  requestOptions: g.REQUEST_OPTIONS, patternOptions: g.PATTERN_OPTIONS, hourOptions: g.HOUR_OPTIONS,
  viewOptions: g.viewCodeOptions_(views), viewCodeTable, companyCodes,
  companyMaster: { headers: g.COMPANY_MASTER_HEADERS, rows: g.INITIAL_COMPANY_MASTER },
  viewMaster: { headers: g.VIEW_MASTER_HEADERS, rows: g.INITIAL_VIEW_MASTER, externalNote: g.VIEW_EXTERNAL_NOTE },
  projectMasterHeaders: g.PROJECT_MASTER_HEADERS,
  staffRulesLines: g.STAFF_RULES_LINES, staffRulesExamples: g.STAFF_RULES_EXAMPLES, howtoLines: g.HOWTO_LINES,
};

const dir = mkdtempSync(path.join(tmpdir(), 'koutei-sheets-'));
const jsonPath = path.join(dir, 'constants.json');
writeFileSync(jsonPath, JSON.stringify(data, null, 1));
const outDir = process.argv[2] || here;
const r = spawnSync('python3', ['-I', path.join(here, 'build_sheets.py'), jsonPath, outDir], { stdio: 'inherit' });
if (r.error) { console.error('python3 を実行できません（openpyxl 入りの Python 3 が必要です）:', r.error.message); process.exit(1); }
process.exit(r.status === null ? 1 : r.status);
