// sync/Code.gs の「かんたん初期設定」まわり（シート操作を伴う部分）を、偽の Google 環境で検証する。
// 実行: node sync/test/setup.test.mjs
// Apps Script は手元で動かせないため、SpreadsheetApp などを最小限の偽物に置き換えて、
// 9/28 時点の管理者シート（マスタは管理者が直した後）＋エンジニア入力シート（入力シート・記入ルール/説明）→ かんたん初期設定 →
// 転記 → 30分ごとの自動実行（自動登録）まで、偽の Firestore を相手に通して確かめる。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(here, '..', 'Code.gs'), 'utf8');

// ===== 偽の Google スプレッドシート =====
const empty = (v) => v === '' || v === null || v === undefined;
class FakeRange {
  constructor(sheet, row, col, nr, nc) { Object.assign(this, { sheet, row, col, nr, nc }); }
  getValues() {
    const out = [];
    for (let i = 0; i < this.nr; i++) {
      const r = this.sheet.rows[this.row - 1 + i] || [];
      const line = [];
      for (let j = 0; j < this.nc; j++) { const v = r[this.col - 1 + j]; line.push(empty(v) ? '' : v); }
      out.push(line);
    }
    return out;
  }
  setValues(vals) { vals.forEach((rv, i) => rv.forEach((v, j) => this.sheet.set(this.row + i, this.col + j, v))); return this; }
  setValue(v) { this.sheet.set(this.row, this.col, v); return this; }
  setNote(t) { this.sheet.notes[this.row + ',' + this.col] = t; return this; }
  setNotes(arr) { arr.forEach((rv, i) => rv.forEach((t, j) => { this.sheet.notes[(this.row + i) + ',' + (this.col + j)] = t; })); return this; }
  setFontWeight() { return this; }
  setFontSize() { return this; }
  setFontColor() { return this; }
  setBackground() { return this; }
  setWrap() { return this; }
  breakApart() { return this; }
  setVerticalAlignment() { return this; }
  setDataValidation(rule) { this.sheet.validations.push({ row: this.row, col: this.col, nr: this.nr, rule }); return this; }
  setNumberFormat(f) { this.sheet.formats.push({ row: this.row, col: this.col, f }); return this; }
}
class FakeSheet {
  // size 省略時は新規タブと同じ 1000行×26列。CSV から作ったタブなどは中身ぴったりの大きさを渡す
  constructor(name, rows = [], size) {
    this.name = name; this.rows = rows.map(r => r.slice()); this.notes = {}; this.validations = []; this.formats = []; this.frozen = 0;
    this.maxRows = size ? size.rows : 1000; this.maxCols = size ? size.cols : 26;
  }
  getMaxRows() { return this.maxRows; }
  getMaxColumns() { return this.maxCols; }
  insertRowsAfter(after, n) { this.maxRows += n; return this; }
  insertColumnsAfter(after, n) { this.maxCols += n; return this; }
  getName() { return this.name; }
  setName(n) { this.name = n; return this; }
  // セルに直接書く（スクリプトの書き込みは getRange で範囲を確かめてから来る。テストで人が下に書き足すときはシートが広がる）
  set(r, c, v) {
    this.maxRows = Math.max(this.maxRows, r); this.maxCols = Math.max(this.maxCols, c);
    while (this.rows.length < r) this.rows.push([]); const row = this.rows[r - 1]; while (row.length < c) row.push(''); row[c - 1] = v;
  }
  getLastRow() { for (let i = this.rows.length - 1; i >= 0; i--) if (this.rows[i].some(v => !empty(v))) return i + 1; return 0; }
  getLastColumn() { let m = 0; this.rows.forEach(r => { for (let j = r.length - 1; j >= 0; j--) if (!empty(r[j])) { m = Math.max(m, j + 1); break; } }); return m; }
  getRange(r, c, nr = 1, nc = 1) {
    if (r < 1 || c < 1 || r + nr - 1 > this.maxRows || c + nc - 1 > this.maxCols) {
      throw new Error('範囲の座標がシートの範囲外です（' + this.name + ' ' + r + '行' + c + '列から ' + nr + '×' + nc + '、シートは ' + this.maxRows + '×' + this.maxCols + '）');
    }
    return new FakeRange(this, r, c, nr, nc);
  }
  appendRow(arr) {
    const r = this.getLastRow() + 1;
    this.maxRows = Math.max(this.maxRows, r); this.maxCols = Math.max(this.maxCols, arr.length); // appendRow は自動で広がる
    arr.forEach((v, j) => this.set(r, j + 1, v)); return this;
  }
  getDataRange() { return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
  setFrozenRows(n) { this.frozen = n; return this; }
  setColumnWidth() { return this; }
  setRowHeight() { return this; }
  clearContents() { this.rows = []; return this; }
  clear() { this.rows = []; this.notes = {}; this.validations = []; this.formats = []; return this; }
  header(row = 1) { return (this.rows[row - 1] || []).map(v => (empty(v) ? '' : String(v))); }
}
class FakeSpreadsheet {
  constructor(name, sheets) { this.name = name; this.sheets = sheets; }
  getName() { return this.name; }
  getSheets() { return this.sheets.slice(); }
  getSheetByName(n) { return this.sheets.find(s => s.getName() === n) || null; }
  insertSheet(name, idx) { const sh = new FakeSheet(name); if (idx === undefined) this.sheets.push(sh); else this.sheets.splice(idx, 0, sh); return sh; }
  toast() {}
}

const NEW_ID = '1BjPKtiHLsYuWcyKLg8FzB4zhmhq5Y5kI8Z2JOXVJuyo';
const LEGACY_ID = '12IfXNtu67LNuqRnB6Iako0pvI1A3k1CzyQTS4F3u5fU';
// 9/28 に管理者が作った『入力シート』の見出し（1列目は会社コードのつもりで「社外案件名」と書いてある）
const INPUT_HEADERS_0928 = ['社外案件名', '案件番号', '社外案件名', 'サーバーリンク', '新規or修正', '視点', 'パターン', 'White', 'Color', 'pts', 'メモ'];
const LINK = '\\\\CG-SERVER2\\Work Folder\\2026\\2026-9\\株式会社リックデザイン(RIC)\\RIC.34';

// 9/28 に管理者が直した『会社マスタ』（表記ゆれの行は削除済み・D列は空）と『視点マスタ』（社外名の列は無い）
const COMPANIES_0928 = [
  ['REN', 'リノべる株式会社', '工程図の既定の会社順にある表記。顧客マスタの表記と違えば直す'], ['SUM', 'SUMUS', ''], ['TAMAZEN', '玉善', '要確認：工程図側が「玉善」表記なら直す'],
  ['OFFICE', 'オフィスコム', ''], ['TANAKA', '田中建設', ''], ['CG', 'CG工房', ''], ['RIC', '株式会社リックデザイン', '要確認：サーバリンクのフォルダ名から。工程図の表記に合わせる'],
  ['DESIGN', 'デザイン経営研究舎', '要確認：サーバリンクのフォルダ名から'], ['CONTE', 'CONTE', '要確認：工程図の会社名を入力'], ['SAN', '株式会社サンゲツ', '要確認：工程図の会社名を入力'],
  ['ATO', 'アトリエジグゾー', '要確認：工程図の会社名を入力'], ['GRAY', 'グレイ美術', '要確認：工程図の会社名を入力'], ['ALEG', 'ALEG', '要確認：工程図の会社名を入力'],
  ['ESAKI', 'エサキホーム', '要確認：工程図の会社名を入力'], ['WUNDER', 'ヴンダー', '要確認：工程図の会社名を入力'], ['SOCIAL', 'ソーシャルインテリア', ''], ['FRY', 'FRYGALLERY', ''],
];
const VIEWS_0928 = [['EX', '外観目線', 'パース'], ['IN', '内観目線', 'パース'], ['EXCB', '外観鳥瞰', 'パース'], ['INCB', '鳥瞰内観', 'パース'],
  ['EXM', '外観モデル', 'モデル'], ['INM', '内観モデル', 'モデル'], ['EXP', '外観写真合成', '写真合成'], ['INP', '内観写真合成', '写真合成'], ['VR', '', 'VR'], ['video', '', '動画']];
// 工程図（Firestore）の顧客マスタに最初から入っている会社（表記が少し違う「サンゲツ」を含む）
const KOUTEI_CUSTOMERS = ['リノべる株式会社', '田中建設', 'オフィスコム', 'CG工房', '玉善', 'SUMUS', 'サンゲツ'];

/** 2026-09-28 時点の管理者シート（連携・設定・使い方は 9/18 版のまま、マスタは管理者が直した後） */
function adminSheet(settings, { companies = COMPANIES_0928 } = {}) {
  const tight = (rows) => ({ rows: rows.length, cols: Math.max.apply(null, rows.map(r => r.length)) });
  const t = (name, rows) => new FakeSheet(name, rows, tight(rows));
  return new FakeSpreadsheet('工程図連携', [
    t('使い方', [['工程図連携シート の使い方'], ['このファイルは、スタッフが書く「Project Schedule」の内容を…']]),
    t('連携', [['取込キー', '状態', '工程図へ', '社内案件名', '社外案件名', 'カット名', '回', '納期', 'White時間', 'Color時間', '制作項目',
      '会社名', '区分', '種類', 'ステップ種類', '担当者', 'メモ', '対象外', '転記日時', '送信日時', '結果', '元シート行', 'サーバリンク']]),
    t('会社マスタ', [['案件コードの英字部分', '工程図の会社名', '備考', '', '工程図に登録済みの会社名（参考）', '契約']].concat(companies.map(r => r.concat(['', '', ''])))),
    t('視点マスタ', [['カット名のキーワード', '区分', '種類', '備考']].concat(VIEWS_0928.map(r => r.concat([''])))),
    t('設定', [['項目', '値', '説明']].concat(settings || [
      ['スタッフシートのファイルID', LEGACY_ID, '「Project Schedule」のURLの /d/ と /edit の間の文字列'],
      ['スタッフシートのタブ名', '案件シート(一覧)', 'スタッフが書いているタブの名前'],
      ['取込開始行', 4800, 'この行より上は取り込みません'],
      ['既定の担当者', '未割当', ''],
      ['FirebaseプロジェクトID', 'koutei-zu', ''],
      ['ワークスペースID', 'liebe-asia-team', ''],
    ])),
  ]);
}
/**
 * 2026-09-28 時点の「工程図 エンジニア入力シート」：
 * 『Untitled』（9/21 に配った旧レイアウトの書き方。17行目が旧見出し）/『入力シート』（2行目が見出し）/『記入ルール/説明』（B列に説明、9行目が記入例の見出し）
 */
function engineerFile({ withInput = true } = {}) {
  const guide = [
    ['【工程図 エンジニア入力シート】1カット＝1行。'], ['・新規／追加／修正は…'], ['・同じ案件名＋視点名…'], ['・終わったカットは…'], ['・視点名は…'], ['・制作時間は…'],
    [''], ['記入例（ここは読むだけ）'],
    ['日付', '案件', '視点', 'パターン', 'White', 'Color', 'その他', '納期', 'メモ', '完了'],
    ['9/18', 'RIC.34', 'EX1', '', 6, 4, 0, '9/30', '外観 昼景', ''],
    [''], ['↓↓↓ ここから下が入力欄です ↓↓↓'],
    [''], [''], [''], [''],
    ['入力日', '社内案件名', '視点名', 'パターン', 'ホワイト時間', 'カラー時間', 'その他時間', '納期', '備考', '完了'],
  ];
  const rules = [
    [''], ['', '【工程図 エンジニア入力シートルール】1視点（パターンも別）＝1行。'], ['', '・新規／追加／修正は…'], ['', '・同じ「案件名＋視点名」…'],
    ['', '・視点名は…'], ['', '・制作にかかる時間は…'], [''], ['', '記入例（ここは読むだけ）'],
    [''].concat(INPUT_HEADERS_0928),
    ['', 'RIC', 34, '黒中名古屋', 'EX1', 'new', 'EX1', '', 6, 4, 0, '外観 昼景'],
    ['', 'REN', 72, 'マンションパース', 'P-1', 'add', 'P-1', '', 2, 1, 0, ''],
  ];
  const sheets = [new FakeSheet('Untitled', guide, { rows: 27, cols: 10 })];
  if (withInput) sheets.push(new FakeSheet('入力シート', [[''], INPUT_HEADERS_0928]));
  sheets.push(new FakeSheet('記入ルール/説明', rules));
  return new FakeSpreadsheet('工程図 エンジニア入力シート（product schedule）', sheets);
}
/** 旧「Project Schedule」（別アカウント所有・触ってはいけない） */
function legacyFile() {
  return new FakeSpreadsheet('Project Schedule', [new FakeSheet('案件シート(一覧)', [
    ['制作合計時間'], ['入力日', '社内案件名', 'カット名', '予想時間', '予想時間', '作業完了'], ['9/1', 'REN72', 'EX1', 3, 2, false]])]);
}

/** 偽の Firestore（REST）。docs: パス → エンコード済み fields */
function fakeFirestore(customers) {
  const fs = { docs: {}, patches: [] };
  const list = customers.map((company, i) => ({ id: 'cust-' + i, company, contacts: [] }));
  fs.docs['workspaces/liebe-asia-team/data/customerMaster'] = { value: { stringValue: JSON.stringify(list) } };
  fs.customers = () => JSON.parse(fs.docs['workspaces/liebe-asia-team/data/customerMaster'].value.stringValue).map(c => c.company);
  fs.tasks = () => Object.keys(fs.docs).filter(k => k.indexOf('workspaces/liebe-asia-team/tasks/') === 0).map(k => {
    const f = fs.docs[k]; const o = {};
    Object.keys(f).forEach(n => { const v = f[n]; o[n] = 'stringValue' in v ? v.stringValue : 'integerValue' in v ? Number(v.integerValue) : 'doubleValue' in v ? v.doubleValue : 'booleanValue' in v ? v.booleanValue : null; });
    return o;
  });
  fs.fetch = (url, opt) => {
    const method = (opt && opt.method) || 'get';
    const p = decodeURIComponent(url.split('/documents/')[1].split('?')[0]);
    const res = (code, body) => ({ getResponseCode: () => code, getContentText: () => (body === undefined ? '' : JSON.stringify(body)) });
    if (method === 'get') {
      if (/\/tasks$/.test(p)) return res(200, { documents: Object.keys(fs.docs).filter(k => k.indexOf(p + '/') === 0).map(k => ({ name: k, fields: fs.docs[k] })) });
      return fs.docs[p] ? res(200, { name: p, fields: fs.docs[p] }) : res(404, { error: 'NOT_FOUND' });
    }
    const body = JSON.parse(opt.payload);
    const mask = url.indexOf('updateMask') >= 0;
    fs.docs[p] = mask ? Object.assign({}, fs.docs[p] || {}, body.fields) : body.fields;
    fs.patches.push({ path: p, mask, fields: Object.keys(body.fields) });
    return res(200, { name: p });
  };
  return fs;
}

function makeEnv({ admin, files, fetchCode = 200, openFails = [], customers = KOUTEI_CUSTOMERS }) {
  const env = { admin, files, alerts: [], triggers: [], fs: fakeFirestore(customers) };
  const ctx = { console: { log() {} } };
  ctx.SpreadsheetApp = {
    getActiveSpreadsheet: () => env.admin,
    openById: (id) => {
      if (openFails.indexOf(id) >= 0 || !env.files[id]) throw new Error('ドキュメント ' + id + ' にアクセスできません');
      return env.files[id];
    },
    newDataValidation: () => {
      const rule = {};
      const b = { requireCheckbox() { rule.type = 'checkbox'; return b; }, requireValueInList(v) { rule.type = 'list'; rule.values = v.slice(); return b; },
        requireNumberBetween(lo, hi) { rule.type = 'number'; rule.range = [lo, hi]; return b; },
        setAllowInvalid(x) { rule.allowInvalid = x; return b; }, setHelpText(t) { rule.help = t; return b; }, build() { return rule; } };
      return b;
    },
    getUi: () => ({ alert: (m) => env.alerts.push(String(m)) }),
  };
  ctx.PropertiesService = { getScriptProperties: () => ({ getProperty: () => null }) };
  ctx.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) };
  ctx.ScriptApp = {
    getOAuthToken: () => 'tok',
    getProjectTriggers: () => env.triggers.slice(),
    deleteTrigger: (t) => { env.triggers = env.triggers.filter(x => x !== t); },
    newTrigger: (fn) => {
      const t = { fn, getHandlerFunction: () => fn };
      const b = { timeBased: () => b, everyMinutes: (n) => { t.every = n; return b; }, create: () => { env.triggers.push(t); return t; } };
      return b;
    },
  };
  ctx.UrlFetchApp = {
    fetch: (url, opt) => {
      if (fetchCode !== 200) return { getResponseCode: () => fetchCode, getContentText: () => '{"error":"PERMISSION_DENIED"}' };
      return env.fs.fetch(url, opt);
    },
  };
  vm.createContext(ctx);
  const names = ['quickSetup', 'createStaffInputTab', 'transferFromStaffSheet', 'autoRun', 'readSettings_', 'readStaffRows_', 'collectSourceRows_', 'findStaffHeaderRow_',
    'hasStaffInputHeaders_', 'migrateLegacyStaffSetting_', 'readCompanyCodes_', 'fmtYMD_', 'H', 'SETTING_NOTES', 'STAFF_INPUT_COLUMNS', 'STAFF_INPUT_HINT'];
  env.g = vm.runInContext(src + '\n;({' + names.join(',') + '})', ctx);
  return env;
}
const settingsOf = (admin) => Object.fromEntries(admin.getSheetByName('設定').rows.slice(1).map(r => [r[0], r[1]]));
const ruleAt = (sheet, row, col) => { const v = sheet.validations.filter(x => x.col === col && x.row === row); return v.length ? v[v.length - 1].rule : null; };

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }
// vm で作った配列は別 realm なので、JSON で正規化してから比べる
const plain = (v) => JSON.parse(JSON.stringify(v));
const same = (actual, expected, msg) => assert.deepEqual(plain(actual), plain(expected), msg);
const CODES_0928 = COMPANIES_0928.map(r => r[0]);

test('見出し行の検索：入力シートは2行目／旧レイアウトや記入ルールのタブは「今の入力タブ」とみなさない', () => {
  const env = makeEnv({ admin: adminSheet(), files: {} });
  const eng = engineerFile();
  assert.equal(env.g.findStaffHeaderRow_(eng.getSheetByName('入力シート')), 2);
  assert.equal(env.g.hasStaffInputHeaders_(eng.getSheetByName('入力シート')), true);
  assert.equal(env.g.findStaffHeaderRow_(eng.getSheetByName('Untitled')), 17);
  assert.equal(env.g.hasStaffInputHeaders_(eng.getSheetByName('Untitled')), false, '旧レイアウト（案件番号なし）');
  const old = legacyFile().getSheets()[0];
  assert.equal(env.g.findStaffHeaderRow_(old), 2);
  assert.equal(env.g.hasStaffInputHeaders_(old), false);
  assert.equal(env.g.findStaffHeaderRow_(new FakeSheet('空')), -1);
});

test('かんたん初期設定：管理者シート・入力シート（2か国語・マスタからのプルダウン）・顧客マスタ・30分ごとの自動実行が1回で整う', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const legacy = legacyFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng, [LEGACY_ID]: legacy } });
  env.g.quickSetup();

  // 『連携』：足りなかった列（入力日・新規or修正 など）が右端に足され、既存の列（旧見出し カット名 など）はそのまま
  const link = admin.getSheetByName('連携').header();
  ['入力日', '新規or修正', 'パターン', '社外視点名', 'その他時間', 'お客様担当者', '元シート備考'].forEach(h => assert.ok(link.indexOf(h) >= 23, h + ' が右端に追加される'));
  assert.equal(link[5], 'カット名');
  Object.values(env.g.H).forEach(h => {
    const ok = link.indexOf(h) >= 0 || (h === '視点名' && link.indexOf('カット名') >= 0) || (h === 'ホワイト時間' && link.indexOf('White時間') >= 0) || (h === 'カラー時間' && link.indexOf('Color時間') >= 0);
    assert.ok(ok, '『連携』に ' + h + ' がある');
  });
  // 『視点マスタ』：管理者が直した行はそのまま。社外名の列（空＝区分＋視点）だけ足す。キーワードを勝手に足さない
  const view = admin.getSheetByName('視点マスタ');
  same(view.header(), ['カット名のキーワード', '区分', '種類', '備考', '社外名']);
  assert.equal(view.getLastRow(), VIEWS_0928.length + 1);
  assert.ok(view.rows.slice(1).every(r => (r[4] || '') === ''));
  // 『会社マスタ』：空いていたD列に「入力シートに出さない」（全部チェックなし）
  const company = admin.getSheetByName('会社マスタ');
  assert.equal(company.header()[3], '入力シートに出さない');
  assert.equal(company.header()[4], '工程図に登録済みの会社名（参考）', '参考欄は動かさない');
  assert.ok(company.rows.slice(1).every(r => r[3] === false));
  same(env.g.readCompanyCodes_(admin), CODES_0928);
  // 『設定』：旧 Project Schedule → 入力シートへ切り替え、自動実行の項目が増える
  const st = settingsOf(admin);
  assert.equal(st['スタッフシートのファイルID'], NEW_ID);
  assert.equal(st['スタッフシートのタブ名'], '入力シート');
  assert.equal(st['取込開始行'], 2);
  assert.equal(st['自動登録'], 'する');
  assert.equal(st['自動登録の待ち時間（分）'], 25);
  assert.ok('最後の自動実行' in st);
  // 『案件マスタ』『使い方』
  same(admin.getSheetByName('案件マスタ').header(), ['社内案件名', '社外案件名', '会社名', 'お客様担当者', '備考']);
  assert.ok(admin.getSheetByName('使い方').rows.some(r => String(r[0]).indexOf('30分ごと') >= 0));

  // エンジニア入力シート：タブは増えない。『入力シート』の見出しが2段（1列目の書き間違いは「会社コード」に直る）
  same(eng.getSheets().map(s => s.getName()), ['Untitled', '入力シート', '記入ルール/説明']);
  const tab = eng.getSheetByName('入力シート');
  same(tab.header(2), env.g.STAFF_INPUT_COLUMNS.map(c => c.label + '\n' + c.vi));
  assert.equal(tab.header(2)[0].split('\n')[0], '会社コード');
  assert.ok(/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(tab.header(2).join(' ')), 'ベトナム語が入っている');
  assert.ok(tab.notes['2,1'].indexOf('\n') > 0, '注記も2か国語');
  assert.equal(tab.rows[0][0], env.g.STAFF_INPUT_HINT, '1行目に案内');
  assert.equal(tab.frozen, 2, '見出しまで固定');
  // プルダウン（見出しの次の行から）：会社コード・視点は管理者のマスタから
  same(ruleAt(tab, 3, 1).values, CODES_0928);
  assert.equal(ruleAt(tab, 3, 2).type, 'number', '案件番号は数字だけ');
  assert.equal(ruleAt(tab, 3, 2).allowInvalid, false);
  same(ruleAt(tab, 3, 5).values, ['新規 / Mới', '修正 / Sửa']);
  assert.equal(ruleAt(tab, 3, 5).allowInvalid, false, '新規or修正はリスト以外を入れられない');
  const views = ruleAt(tab, 3, 6).values;
  ['EX1', 'IN20', 'EXCB1', 'INCB1', 'EXM1', 'INM1', 'EXP1', 'INP1', 'VR1', 'VIDEO1'].forEach(c => assert.ok(views.includes(c), '視点 ' + c));
  ['P1', 'INCM1'].forEach(c => assert.ok(!views.includes(c), c + ' は視点マスタに無いので出さない'));
  same(ruleAt(tab, 3, 7).values.slice(0, 3), ['A', 'B', 'C']);
  [8, 9, 10].forEach(c => assert.ok(ruleAt(tab, 3, c).values.includes('0.5'), '時間 ' + c));
  assert.equal(ruleAt(tab, 3, 3), null, '社外案件名は自由入力');
  assert.equal(ruleAt(tab, 3, 4), null, 'サーバーリンクは自由入力');
  // 『記入ルール/説明』は2か国語で書き直され、視点コード表は視点マスタから
  const rules = eng.getSheetByName('記入ルール/説明');
  const text = rules.rows.map(r => r.join(' ')).join('\n');
  ['【記入ルール】', 'Quy tắc', 'EX1 → 外観目線視点① ／ ngoại thất', 'EXP1 → 外観写真合成視点①', 'VIDEO1 → 動画', '新規 / Mới', 'không tính số giờ white'].forEach(w => assert.ok(text.toLowerCase().indexOf(w.toLowerCase()) >= 0, w));
  assert.ok(rules.rows.some(r => r[1] === '会社コード\nMã công ty'));
  assert.ok(!rules.rows.some(r => r.includes('new')), '古い記入例（new/add）は残らない');
  assert.equal(eng.getSheetByName('Untitled').rows[16][1], '社内案件名', '旧レイアウトのタブには触らない');
  assert.equal(legacy.getSheets().length, 1, '旧 Project Schedule には触らない');

  // 工程図の顧客マスタ：無い会社を追加。「株式会社サンゲツ」は工程図の「サンゲツ」と同じ会社とみなして二重に作らない
  const customers = env.fs.customers();
  ['株式会社リックデザイン', 'ソーシャルインテリア', 'FRYGALLERY', 'ヴンダー', 'CONTE'].forEach(c => assert.ok(customers.includes(c), c + ' を追加'));
  assert.ok(!customers.includes('株式会社サンゲツ'));
  assert.equal(customers.length, KOUTEI_CUSTOMERS.length + COMPANIES_0928.length - 7);
  // 30分ごとの自動実行が1つ
  same(env.triggers.map(t => [t.fn, t.every]), [['autoRun', 30]]);

  // 結果は1つのダイアログ
  assert.equal(env.alerts.length, 1);
  const msg = env.alerts[0];
  assert.ok(msg.indexOf('✗') < 0, msg);
  ['接続OK', '顧客マスタに 10 社を追加', '株式会社サンゲツ → 工程図では「サンゲツ」', '30分ごとの自動実行を設定しました', '準備ができました'].forEach(w => assert.ok(msg.indexOf(w) >= 0, w + '\n' + msg));

  // 転記の読み取り：見出し（2行目）より下だけを読む。会社コード＋案件番号 → RIC.34
  assert.equal(env.g.readStaffRows_(env.g.readSettings_()).length, 0);
  tab.set(3, 1, 'RIC'); tab.set(3, 2, 34); tab.set(3, 5, '新規 / Mới'); tab.set(3, 6, 'EX1'); tab.set(3, 8, 6); tab.set(3, 9, 4);
  const rows = env.g.collectSourceRows_(env.g.readStaffRows_(env.g.readSettings_()));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].code, 'RIC.34');
  assert.equal(rows[0].key, 'RIC34::EX1::1');
});

test('かんたん初期設定は何度押しても同じ結果（列・タブ・マスタの行・顧客マスタ・自動実行が増えない）', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng, [LEGACY_ID]: legacyFile() } });
  env.g.quickSetup();
  const snap = () => ({
    link: admin.getSheetByName('連携').header().length,
    sheets: admin.getSheets().map(s => s.getName()).join(','),
    view: admin.getSheetByName('視点マスタ').header().join(',') + admin.getSheetByName('視点マスタ').getLastRow(),
    company: admin.getSheetByName('会社マスタ').header().join(','),
    settings: admin.getSheetByName('設定').getLastRow(),
    eng: eng.getSheets().map(s => s.getName()).join(','),
    header: eng.getSheetByName('入力シート').header(2).join('|'),
    rules: eng.getSheetByName('記入ルール/説明').getLastRow(),
    customers: env.fs.customers().length,
    triggers: env.triggers.length,
  });
  const a = snap();
  const patches = env.fs.patches.length;
  env.g.quickSetup();
  same(snap(), a);
  assert.equal(env.fs.patches.length, patches, '2回目は顧客マスタを書き換えない');
});

test('会社マスタに表記ゆれの行があれば「入力シートに出さない」にチェックし、プルダウンから外す', () => {
  const admin = adminSheet(undefined, { companies: [['REN', 'リノべる株式会社', ''], ['RENOBERU', 'リノべる株式会社', '同上（表記ゆれ）'], ['RIC', '株式会社リックデザイン', '']] });
  const env = makeEnv({ admin, files: { [NEW_ID]: engineerFile() } });
  env.g.quickSetup();
  same(admin.getSheetByName('会社マスタ').rows.slice(1).map(r => r[3]), [false, true, false]);
  same(env.g.readCompanyCodes_(admin), ['REN', 'RIC']);
});

test('『入力シート』タブが無いときは新しく作る（記入ルールのタブや旧レイアウトのタブは流用しない）', () => {
  const admin = adminSheet();
  const eng = engineerFile({ withInput: false });
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  same(eng.getSheets().map(s => s.getName()), ['入力シート', 'Untitled', '記入ルール/説明']);
  const tab = eng.getSheetByName('入力シート');
  assert.equal(env.g.findStaffHeaderRow_(tab), 2);
  assert.equal(tab.header(2)[1], '案件番号\nSố dự án');
  assert.ok(env.alerts[0].indexOf('作りました') >= 0, env.alerts[0]);
});

test('意図して旧ファイルを読む設定（タブ名を product schedule にしてある等）は切り替えない', () => {
  const admin = adminSheet([
    ['スタッフシートのファイルID', LEGACY_ID, ''], ['スタッフシートのタブ名', 'product schedule', ''], ['取込開始行', 2, ''],
    ['既定の担当者', '未割当', ''], ['FirebaseプロジェクトID', 'koutei-zu', ''], ['ワークスペースID', 'liebe-asia-team', ''],
  ]);
  const env = makeEnv({ admin, files: { [LEGACY_ID]: legacyFile() } });
  assert.equal(env.g.migrateLegacyStaffSetting_(admin), '');
  assert.equal(settingsOf(admin)['スタッフシートのファイルID'], LEGACY_ID);
});

test('エンジニア入力シートを開けないとき：✗ と「編集権限を確認」を出し、接続テストは続け、自動実行はまだ設定しない', () => {
  const admin = adminSheet();
  const env = makeEnv({ admin, files: { [NEW_ID]: engineerFile() }, openFails: [NEW_ID] });
  env.g.quickSetup();
  const msg = env.alerts[0];
  assert.ok(msg.indexOf('✗ エンジニア入力シートを整えられませんでした') >= 0, msg);
  assert.ok(msg.indexOf('編集権限') >= 0);
  assert.ok(msg.indexOf('接続OK') >= 0, '接続テストは実行される');
  assert.ok(msg.indexOf('もう一度「0. かんたん初期設定」') >= 0);
  assert.equal(env.triggers.length, 0);
  assert.ok(admin.getSheetByName('案件マスタ'), '管理者シートの整備は済んでいる');
});

test('工程図につながらないとき：✗ 接続に失敗 と対処（秘密鍵）を出し、顧客マスタにも自動実行にも手を付けない', () => {
  const admin = adminSheet();
  const env = makeEnv({ admin, files: { [NEW_ID]: engineerFile() }, fetchCode: 403 });
  env.g.quickSetup();
  const msg = env.alerts[0];
  assert.ok(msg.indexOf('✗ 接続に失敗しました') >= 0, msg);
  assert.ok(msg.indexOf('秘密鍵を設定') >= 0);
  assert.ok(msg.indexOf('準備ができました') < 0);
  assert.equal(env.triggers.length, 0);
  assert.equal(env.fs.patches.length, 0);
});

test('メニュー「エンジニア入力シートを整える」：会社・視点をマスタに足すとプルダウンに出る／旧設定なら先に切り替える', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const legacy = legacyFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng, [LEGACY_ID]: legacy } });
  env.g.quickSetup();
  admin.getSheetByName('会社マスタ').set(19, 1, 'NEWCO'); admin.getSheetByName('会社マスタ').set(19, 2, 'ニューコ');
  admin.getSheetByName('視点マスタ').set(12, 1, 'CAD'); admin.getSheetByName('視点マスタ').set(12, 3, 'CAD図');
  env.g.createStaffInputTab();
  const tab = eng.getSheetByName('入力シート');
  same(ruleAt(tab, 3, 1).values, CODES_0928.concat(['NEWCO']));
  assert.ok(ruleAt(tab, 3, 6).values.includes('CAD1'));
  assert.equal(legacy.getSheets().length, 1, '旧 Project Schedule にはタブを作らない');

  const admin2 = adminSheet();
  const env2 = makeEnv({ admin: admin2, files: { [NEW_ID]: engineerFile(), [LEGACY_ID]: legacyFile() } });
  env2.g.createStaffInputTab();
  assert.ok(env2.alerts[0].indexOf('切り替えました') >= 0);
});

// 入力シートに行を書く補助
const writer = (tab) => (r, vals) => vals.forEach((v, j) => tab.set(r, j + 1, v));
const NEWR = '新規 / Mới', FIXR = '修正 / Sửa';
const linkAt = (admin) => { const link = admin.getSheetByName('連携'); const h = link.header(); return { link, h, at: (r, name) => link.rows[r - 1][h.indexOf(name)], set: (r, name, v) => link.set(r, h.indexOf(name) + 1, v) }; };

test('転記：入力シートの行が『連携』に追記され、入力日・社内案件名（RIC.34）・区分・社外視点名などが自動で入る', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const tab = eng.getSheetByName('入力シート');
  const put = writer(tab);
  put(3, ['RIC', 34, 'マンション', LINK, NEWR, 'EX1', '', 6, 4, 0, '外観 昼景']);
  put(4, ['RIC', 34, 'マンション', LINK, NEWR, 'EX1', 'A', 6, 4, 0, '']);
  put(5, ['RIC', 34, 'マンション', LINK, NEWR, 'IN2', '', 5, 3.5, 1.5, '']);
  put(6, ['RIC', 34, 'マンション', LINK, FIXR, 'EX1', '', 0, 1.5, 0, '色味の修正']);
  put(7, ['REN', 72, '戸建て', '', NEWR, 'EXM1', '', 8, '', '', '']);
  put(8, ['RIC', 35, '', '', NEWR, 'EXCB1', '', '', '', '', '']);        // 時間がまだ → 待つ
  put(9, ['RIC', '', '', '', NEWR, 'IN1', '', 3, '', '', '']);           // 案件番号がまだ → 待つ
  put(10, ['RIC', 34, 'マンション', '', '', 'IN5', '', 2, '', '', '']); // 新規or修正がまだ → 待つ
  put(11, ['RIC', 34, 'マンション', LINK, NEWR, 'EX1', '', 1, 0, 0, '']); // EX1 の3回目なのに「新規」→ 要確認
  put(12, ['FRY', 3, 'ギャラリー', '', NEWR, 'EXP1', '', 2, 0, 1, '']);
  const msg = env.g.transferFromStaffSheet();
  assert.ok(msg.indexOf('新規追加: 7') >= 0, msg);
  assert.ok(msg.indexOf('記入途中で待っている行: 3') >= 0, msg);

  const { link, h, at, set } = linkAt(admin);
  const today = env.g.fmtYMD_(new Date());
  assert.equal(link.getLastRow(), 8);
  for (let r = 2; r <= 8; r++) assert.equal(at(r, '入力日'), today, r + '行目の入力日');
  assert.equal(Object.prototype.toString.call(at(2, '転記日時')), '[object Date]', '転記日時は日時の値');
  assert.equal(at(2, '社内案件名'), 'RIC.34');
  assert.equal(at(2, '社外案件名'), 'マンション');
  assert.equal(at(2, '区分'), '外観目線');
  assert.equal(at(2, '社外視点名'), '外観目線視点①');
  assert.equal(at(2, '状態'), '未送信');
  assert.equal(at(2, '元シート備考'), '外観 昼景');
  assert.equal(at(2, 'サーバリンク'), LINK);
  assert.equal(at(3, '社外視点名'), '外観目線視点①_パターンA');
  assert.equal(at(4, '社外視点名'), '内観目線視点②');
  assert.equal(at(2, '会社名'), '株式会社リックデザイン');
  assert.equal(at(4, 'その他時間'), 1.5);
  assert.equal(at(5, '回'), 2);
  assert.equal(at(5, '新規or修正'), FIXR);
  assert.equal(at(5, 'ステップ種類'), '修正（無料）');
  assert.equal(at(6, '社内案件名'), 'REN.72');
  assert.equal(at(6, '種類'), 'モデル');
  assert.equal(at(6, '区分'), '外観モデル');
  assert.equal(at(6, '社外視点名'), '外観モデル①');
  assert.equal(at(6, '会社名'), 'リノべる株式会社');
  assert.equal(at(7, '回'), 3);
  assert.equal(at(7, '状態'), '要確認');
  assert.ok(String(at(7, '結果')).indexOf('3回目') >= 0);
  assert.equal(at(8, '種類'), '写真合成');
  assert.equal(at(8, '社外視点名'), '外観写真合成視点①');
  assert.equal(at(8, '会社名'), 'FRYGALLERY');
  const listAt = (name) => link.validations.filter(v => v.col === h.indexOf(name) + 1).pop().rule.values;
  assert.ok(listAt('区分').includes('外観鳥瞰') && listAt('種類').includes('動画'), '区分・種類のプルダウンは視点マスタから');

  // 人が『連携』に入れた納期・入力日は、次の転記で消えない。入力シートの時間が変わったら更新される
  set(2, '納期', '2026-10-10');
  set(2, '入力日', '2026-09-01');
  tab.set(3, 8, 7);
  env.g.transferFromStaffSheet();
  assert.equal(at(2, '納期'), '2026-10-10');
  assert.equal(at(2, '入力日'), '2026-09-01');
  assert.equal(at(2, 'White時間'), 7);
  assert.equal(link.getLastRow(), 8, '行は増えない');

  // 時間を消して打ち直している最中（記入途中）は「消えた」にしない
  tab.set(4, 8, ''); tab.set(4, 9, ''); tab.set(4, 10, '');
  env.g.transferFromStaffSheet();
  assert.equal(at(3, '状態'), '未送信');
  // 行ごと消すと「元シートから消えた」、また書くと人が確認する「要確認」に戻る
  put(4, ['', '', '', '', '', '', '', '', '', '', '']);
  env.g.transferFromStaffSheet();
  assert.equal(at(3, '状態'), '元シートから消えた');
  put(4, ['RIC', 34, 'マンション', LINK, NEWR, 'EX1', 'A', 6, 4, 0, '']);
  env.g.transferFromStaffSheet();
  assert.equal(at(3, '状態'), '要確認');

  // 記入途中だった行がそろうと、次の転記で追加される（入力日はその日）
  tab.set(8, 8, 3);
  const msg2 = env.g.transferFromStaffSheet();
  assert.ok(msg2.indexOf('新規追加: 1') >= 0, msg2);
  assert.equal(at(9, '社内案件名'), 'RIC.35');
  assert.equal(at(9, '社外視点名'), '外観鳥瞰視点①');
  assert.equal(at(9, '入力日'), today);
});

test('30分ごとの自動実行：転記 → 25分たった「未送信」だけ自動登録、「要確認」「更新あり」はチェックしたら登録', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const put = writer(eng.getSheetByName('入力シート'));
  put(3, ['RIC', 34, 'マンション', LINK, NEWR, 'EX1', '', 6, 4, 0, '']);
  put(4, ['REN', 72, '戸建て', '', NEWR, 'EXM1', '', 8, '', '', '']);
  put(5, ['RIC', 34, 'マンション', LINK, NEWR, 'EX1', '', 1, 0, 0, '']);  // 2回目なのに新規 → 要確認
  put(6, ['NEWCO', 1, 'ニュー', '', NEWR, 'IN1', '', 2, 1, 0, '']);        // 会社マスタに後から足す会社
  admin.getSheetByName('会社マスタ').set(19, 1, 'NEWCO'); admin.getSheetByName('会社マスタ').set(19, 2, 'ニューコ');
  const { at, set } = linkAt(admin);

  // 1回目：転記だけ（転記したばかりの行は25分待つ）
  let r = env.g.autoRun();
  assert.ok(r.indexOf('転記 追加4（要確認1）') >= 0, r);
  assert.ok(r.indexOf('自動登録 対象なし') >= 0, r);
  assert.equal(env.fs.tasks().length, 0);
  assert.ok(String(settingsOf(admin)['最後の自動実行']).indexOf('転記 追加4') >= 0);

  // 2回目（30分後）：変わりが無ければ転記は何もしない。未送信の3行を自動登録（要確認は待つ）
  const hourAgo = new Date(Date.now() - 60 * 60000);
  for (let i = 2; i <= 5; i++) set(i, '転記日時', hourAgo);
  r = env.g.autoRun();
  assert.ok(r.indexOf('転記 追加0・更新0') >= 0, r);
  assert.ok(r.indexOf('対象 3 行') >= 0, r);
  assert.equal(at(2, '状態'), '登録済み'); assert.equal(at(2, '工程図へ'), false); assert.ok(String(at(2, '結果')).indexOf('自動登録：') === 0);
  assert.equal(at(3, '状態'), '登録済み');
  assert.equal(at(4, '状態'), '要確認');
  assert.equal(at(5, '状態'), '登録済み');
  const tasks = env.fs.tasks();
  const ex1 = tasks.filter(t => t.projectNameInternal === 'RIC.34');
  same(ex1.map(t => t.stepName).sort(), ['カラー', 'ホワイト']);
  assert.equal(ex1[0].viewpointCategory, '外観目線');
  assert.equal(ex1[0].viewpointNameExternal, '外観目線視点①');
  assert.equal(ex1[0].companyName, '株式会社リックデザイン');
  const model = tasks.filter(t => t.projectNameInternal === 'REN.72');
  same(model.map(t => [t.stepName, t.hours]), [['モデル作成', 8]]);
  assert.ok(env.fs.customers().includes('ニューコ'), '会社マスタに後から足した会社は、登録の前に顧客マスタへ追加');

  // 要確認の行は、人が「工程図へ」にチェックすると次の自動実行で登録
  set(4, '工程図へ', true);
  env.g.autoRun();
  assert.equal(at(4, '状態'), '登録済み');
  assert.equal(env.fs.tasks().length, 6); // EX1（ホワイト・カラー）＋モデル作成＋NEWCO の IN1（ホワイト・カラー）＋ EX1 2回目のホワイト

  // 登録後にエンジニアが時間を直す → 更新あり（自動では送らない）→ チェックで工程図の時間を更新
  eng.getSheetByName('入力シート').set(3, 8, 7);
  env.g.autoRun();
  assert.equal(at(2, '状態'), '更新あり');
  const white = () => env.fs.tasks().find(t => t.externalId === 'RIC34::EX1::1::white');
  assert.equal(white().hours, 6, 'チェックするまで工程図は変えない');
  set(2, '工程図へ', true);
  env.g.autoRun();
  assert.equal(at(2, '状態'), '登録済み');
  assert.equal(white().hours, 7);
  assert.equal(env.fs.tasks().length, 6, '更新は新しいタスクを作らない');

  // 『設定』の自動登録を「しない」にすると転記だけ
  const st = admin.getSheetByName('設定');
  const row = st.rows.findIndex(x => x[0] === '自動登録') + 1;
  st.set(row, 2, 'しない');
  put(7, ['RIC', 34, 'マンション', LINK, NEWR, 'IN3', '', 2, 1, 0, '']);
  env.g.autoRun();
  set(6, '転記日時', hourAgo);
  r = env.g.autoRun();
  assert.ok(r.indexOf('自動登録はしない設定') >= 0, r);
  assert.equal(at(6, '状態'), '未送信');
});

console.log(`\n${passed} tests passed`);
