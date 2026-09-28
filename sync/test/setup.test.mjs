// sync/Code.gs の「かんたん初期設定」まわり（シート操作を伴う部分）を、偽の Google 環境で検証する。
// 実行: node sync/test/setup.test.mjs
// Apps Script は手元で動かせないため、SpreadsheetApp などを最小限の偽物に置き換えて、
// 9/18 時点の古い管理者シート → かんたん初期設定 → 転記の読み取り まで通して確かめる。
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
  setBackground() { return this; }
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
  set(r, c, v) { while (this.rows.length < r) this.rows.push([]); const row = this.rows[r - 1]; while (row.length < c) row.push(''); row[c - 1] = v; }
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
  clearContents() { this.rows = []; return this; }
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
const ENGINEER_HEADERS = ['入力日', '社内案件名', '視点名', 'パターン', 'ホワイト時間', 'カラー時間', 'その他時間', '納期', '備考', '完了'];

/** 2026-09-18 時点の管理者シート（旧レイアウト）を再現する */
function oldAdminSheet(settings) {
  const tight = (rows) => ({ rows: rows.length, cols: Math.max.apply(null, rows.map(r => r.length)) });
  const t = (name, rows) => new FakeSheet(name, rows, tight(rows));
  return new FakeSpreadsheet('工程図連携', [
    t('使い方', [['工程図連携シート の使い方'], ['このファイルは、スタッフが書く「Project Schedule」の内容を…']]),
    t('連携', [['取込キー', '状態', '工程図へ', '社内案件名', '社外案件名', 'カット名', '回', '納期', 'White時間', 'Color時間', '制作項目',
      '会社名', '区分', '種類', 'ステップ種類', '担当者', 'メモ', '対象外', '転記日時', '送信日時', '結果', '元シート行', 'サーバリンク']]),
    t('会社マスタ', [['案件コードの英字部分', '工程図の会社名', '備考', '', '工程図に登録済みの会社名（参考）', '契約'], ['RIC', '株式会社リックデザイン', '', '', '', '']]),
    t('視点マスタ', [['カット名のキーワード', '区分', '種類', '備考'], ['EX', '外観', 'パース', ''], ['IN', '内観', 'パース', ''], ['P', '', '写真合成', '']]),
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
/** 2026-09-21 に配った「工程図 エンジニア入力シート」（1枚目に書き方・記入例、17行目が見出し） */
function engineerFile() {
  const rows = [
    ['【工程図 エンジニア入力シート】1カット＝1行。'], ['・新規／追加／修正は…'], ['・同じ案件名＋視点名…'], ['・終わったカットは…'], ['・視点名は…'], ['・制作時間は…'],
    [''], ['記入例（ここは読むだけ）'],
    ['日付', '案件', '視点', 'パターン', 'White', 'Color', 'その他', '納期', 'メモ', '完了'],
    ['9/18', 'RIC.34', 'EX1', '', 6, 4, 0, '9/30', '外観 昼景', ''],
    ['9/18', 'RIC.34', 'EX1', 'A', 6, 4, 0, '9/30', '', ''],
    ['9/18', 'RIC.34', 'IN1', '', 5, 3.5, 1.5, '9/30', '', ''],
    ['9/19', 'REN.72', 'EX1', '', 0, 1.5, 0, '9/24', '', ''],
    ['9/19', 'REN.72', 'P-1', '', 2, 1, 0, '9/25', '', ''],
    [''], ['↓↓↓ ここから下が入力欄です ↓↓↓'],
    ENGINEER_HEADERS,
  ];
  // Drive で CSV（見出しの下に空行10行）から作ったので、27行×10列ちょうど
  return new FakeSpreadsheet('工程図 エンジニア入力シート（product schedule）', [new FakeSheet('工程図 エンジニア入力シート（product schedule）', rows, { rows: 27, cols: 10 })]);
}
/** 旧「Project Schedule」（別アカウント所有・触ってはいけない） */
function legacyFile() {
  return new FakeSpreadsheet('Project Schedule', [new FakeSheet('案件シート(一覧)', [
    ['制作合計時間'], ['入力日', '社内案件名', 'カット名', '予想時間', '予想時間', '作業完了'], ['9/1', 'REN72', 'EX1', 3, 2, false]])]);
}

function makeEnv({ admin, files, fetchCode = 200, openFails = [] }) {
  const env = { admin, files, alerts: [], fetched: [] };
  const ctx = { console };
  ctx.SpreadsheetApp = {
    getActiveSpreadsheet: () => env.admin,
    openById: (id) => {
      if (openFails.indexOf(id) >= 0 || !env.files[id]) throw new Error('ドキュメント ' + id + ' にアクセスできません');
      return env.files[id];
    },
    newDataValidation: () => {
      const rule = {};
      const b = { requireCheckbox() { rule.type = 'checkbox'; return b; }, requireValueInList(v) { rule.type = 'list'; rule.values = v; return b; },
        setAllowInvalid(x) { rule.allowInvalid = x; return b; }, build() { return rule; } };
      return b;
    },
    getUi: () => ({ alert: (m) => env.alerts.push(String(m)) }),
  };
  ctx.PropertiesService = { getScriptProperties: () => ({ getProperty: () => null }) };
  ctx.ScriptApp = { getOAuthToken: () => 'tok' };
  ctx.UrlFetchApp = {
    fetch: (url) => {
      env.fetched.push(url);
      return { getResponseCode: () => fetchCode, getContentText: () => (fetchCode === 200 ? '{"documents":[]}' : '{"error":"PERMISSION_DENIED"}') };
    },
  };
  vm.createContext(ctx);
  const names = ['quickSetup', 'createStaffInputTab', 'transferFromStaffSheet', 'readSettings_', 'readStaffRows_', 'collectSourceRows_', 'findStaffHeaderRow_',
    'hasStaffInputHeaders_', 'migrateLegacyStaffSetting_', 'H', 'SETTING_NOTES'];
  env.g = vm.runInContext(src + '\n;({' + names.join(',') + '})', ctx);
  return env;
}
const settingsOf = (admin) => Object.fromEntries(admin.getSheetByName('設定').rows.slice(1).map(r => [r[0], r[1]]));

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }

test('見出し行の検索：書き方が上にあっても17行目を見つける／旧レイアウトは「今の10列」とみなさない', () => {
  const env = makeEnv({ admin: oldAdminSheet(), files: {} });
  const eng = engineerFile().getSheets()[0];
  const old = legacyFile().getSheets()[0];
  assert.equal(env.g.findStaffHeaderRow_(eng), 17);
  assert.equal(env.g.hasStaffInputHeaders_(eng), true);
  assert.equal(env.g.findStaffHeaderRow_(old), 2);
  assert.equal(env.g.hasStaffInputHeaders_(old), false);
  assert.equal(env.g.findStaffHeaderRow_(new FakeSheet('空')), -1);
});

test('かんたん初期設定：9/18の古い管理者シートが1回で今の形になり、エンジニア入力シートにつながる', () => {
  const admin = oldAdminSheet();
  const eng = engineerFile();
  const legacy = legacyFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng, [LEGACY_ID]: legacy } });
  env.g.quickSetup();

  // 『連携』：足りなかった列が右端に足され、既存の列（旧見出し カット名 など）はそのまま
  const link = admin.getSheetByName('連携').header();
  ['パターン', '社外視点名', 'その他時間', 'お客様担当者', '元シート備考'].forEach(h => assert.ok(link.indexOf(h) >= 23, h + ' が右端に追加される'));
  assert.equal(link[5], 'カット名');
  Object.values(env.g.H).forEach(h => {
    const ok = link.indexOf(h) >= 0 || (h === '視点名' && link.indexOf('カット名') >= 0) || (h === 'ホワイト時間' && link.indexOf('White時間') >= 0) || (h === 'カラー時間' && link.indexOf('Color時間') >= 0);
    assert.ok(ok, '『連携』に ' + h + ' がある');
  });
  // 『案件マスタ』ができる／『視点マスタ』に社外名
  assert.deepEqual(admin.getSheetByName('案件マスタ').header(), ['社内案件名', '社外案件名', '会社名', 'お客様担当者', '備考']);
  const view = admin.getSheetByName('視点マスタ');
  const ext = view.header().indexOf('社外名');
  assert.ok(ext >= 0);
  assert.equal(view.rows[1][ext], '外観視点');
  // 『使い方』は今の説明に書き直される
  assert.ok(admin.getSheetByName('使い方').rows.some(r => String(r[0]).indexOf('かんたん初期設定') >= 0));

  // 『設定』：旧 Project Schedule → エンジニア入力シートへ切り替え、説明も今の文に
  const st = settingsOf(admin);
  assert.equal(st['スタッフシートのファイルID'], NEW_ID);
  assert.equal(st['スタッフシートのタブ名'], 'product schedule');
  assert.equal(st['取込開始行'], 2);
  const noteRow = admin.getSheetByName('設定').rows.find(r => r[0] === 'スタッフシートのファイルID');
  assert.equal(noteRow[2], env.g.SETTING_NOTES.fileId);

  // エンジニア入力シート：タブを増やさず、書き方つきのタブを product schedule にして使う
  assert.equal(eng.getSheets().length, 1);
  const tab = eng.getSheetByName('product schedule');
  assert.ok(tab, 'タブ名が product schedule になる');
  assert.equal(tab.notes['17,2'], '例: RIC.34（案件名＋番号）');
  assert.equal(tab.frozen, 0, '上に書き方があるときは行を固定しない');
  const v = (col) => tab.validations.find(x => x.col === col);
  assert.equal(v(4).row, 18); assert.equal(v(4).rule.type, 'list');     // パターン
  assert.equal(v(10).row, 18); assert.equal(v(10).rule.type, 'checkbox'); // 完了
  assert.ok(tab.rows.slice(0, 16).every(r => r.length <= 10), '書き方・記入例は消さない');

  // 旧 Project Schedule には一切触らない
  assert.equal(legacy.getSheets().length, 1);
  assert.equal(legacy.getSheets()[0].getName(), '案件シート(一覧)');

  // 結果は1つのダイアログで、全部 ✓
  assert.equal(env.alerts.length, 1);
  assert.ok(env.alerts[0].indexOf('✗') < 0, env.alerts[0]);
  assert.ok(env.alerts[0].indexOf('接続OK') >= 0);
  assert.ok(env.alerts[0].indexOf('準備ができました') >= 0);

  // 転記の読み取り：記入例は読まず、17行目の見出しより下だけを読む
  assert.equal(env.g.readStaffRows_(env.g.readSettings_()).length, 0);
  tab.set(18, 2, 'RIC.34'); tab.set(18, 3, 'EX1'); tab.set(18, 5, 6); tab.set(18, 6, 4);
  tab.set(19, 2, 'RIC.34'); tab.set(19, 3, 'IN1'); tab.set(19, 5, 5); tab.set(19, 10, true); // 完了は取り込まない
  const rows = env.g.collectSourceRows_(env.g.readStaffRows_(env.g.readSettings_()));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].key, 'RIC34::EX1::1');
  assert.equal(rows[0].srcRow, 18);
});

test('かんたん初期設定は何度押しても同じ結果（列・タブが増えない）', () => {
  const admin = oldAdminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng, [LEGACY_ID]: legacyFile() } });
  env.g.quickSetup();
  const linkCols = admin.getSheetByName('連携').header().length;
  const sheetsA = admin.getSheets().map(s => s.getName()).join(',');
  env.g.quickSetup();
  assert.equal(admin.getSheetByName('連携').header().length, linkCols);
  assert.equal(admin.getSheets().map(s => s.getName()).join(','), sheetsA);
  assert.equal(eng.getSheets().length, 1);
  assert.equal(settingsOf(admin)['スタッフシートのファイルID'], NEW_ID);
});

test('意図して旧ファイルを読む設定（タブ名を product schedule にしてある等）は切り替えない', () => {
  const admin = oldAdminSheet([
    ['スタッフシートのファイルID', LEGACY_ID, ''], ['スタッフシートのタブ名', 'product schedule', ''], ['取込開始行', 2, ''],
    ['既定の担当者', '未割当', ''], ['FirebaseプロジェクトID', 'koutei-zu', ''], ['ワークスペースID', 'liebe-asia-team', ''],
  ]);
  const env = makeEnv({ admin, files: { [LEGACY_ID]: legacyFile() } });
  assert.equal(env.g.migrateLegacyStaffSetting_(admin), '');
  assert.equal(settingsOf(admin)['スタッフシートのファイルID'], LEGACY_ID);
});

test('エンジニア入力シートを開けないとき：✗ と「編集権限を確認」を出し、残り（接続テスト）は続ける', () => {
  const admin = oldAdminSheet();
  const env = makeEnv({ admin, files: { [NEW_ID]: engineerFile() }, openFails: [NEW_ID] });
  env.g.quickSetup();
  const msg = env.alerts[0];
  assert.ok(msg.indexOf('✗ エンジニア入力シートを整えられませんでした') >= 0, msg);
  assert.ok(msg.indexOf('編集権限') >= 0);
  assert.ok(msg.indexOf('接続OK') >= 0, '接続テストは実行される');
  assert.ok(msg.indexOf('もう一度「0. かんたん初期設定」') >= 0);
  assert.ok(admin.getSheetByName('案件マスタ'), '管理者シートの整備は済んでいる');
});

test('工程図につながらないとき：✗ 接続に失敗 と対処（秘密鍵）を出す', () => {
  const admin = oldAdminSheet();
  const env = makeEnv({ admin, files: { [NEW_ID]: engineerFile() }, fetchCode: 403 });
  env.g.quickSetup();
  const msg = env.alerts[0];
  assert.ok(msg.indexOf('✗ 接続に失敗しました') >= 0, msg);
  assert.ok(msg.indexOf('秘密鍵を設定') >= 0);
  assert.ok(msg.indexOf('準備ができました') < 0);
});

test('メニュー「スタッフ入力タブを作成」単体でも、旧設定なら先に切り替えてから新シートを整える', () => {
  const admin = oldAdminSheet();
  const eng = engineerFile();
  const legacy = legacyFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng, [LEGACY_ID]: legacy } });
  env.g.createStaffInputTab();
  assert.ok(eng.getSheetByName('product schedule'));
  assert.equal(legacy.getSheets().length, 1, '旧 Project Schedule にはタブを作らない');
  assert.ok(env.alerts[0].indexOf('切り替えました') >= 0);
});

test('転記：エンジニアが書いた行が、ぎりぎりの大きさの『連携』タブにも追記され、社外視点名などが自動で入る', () => {
  const admin = oldAdminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const tab = eng.getSheetByName('product schedule');
  const put = (r, vals) => vals.forEach((v, j) => tab.set(r, j + 1, v));
  put(18, ['9/28', 'RIC.34', 'EX1', '', 6, 4, 0, '10/5', '外観 昼景', '']);
  put(19, ['9/28', 'RIC.34', 'EX1', 'A', 6, 4, 0, '10/5', '', '']);
  put(20, ['9/28', 'RIC.34', 'IN2', '', 5, 3.5, 1.5, '10/5', '', '']);
  put(21, ['9/29', 'RIC.34', 'EX1', '', 0, 1.5, 0, '10/8', '色味の修正', '']);
  const msg = env.g.transferFromStaffSheet();
  assert.ok(msg.indexOf('新規追加: 4') >= 0, msg);

  const link = admin.getSheetByName('連携');
  const h = link.header();
  const at = (r, name) => link.rows[r - 1][h.indexOf(name)];
  assert.equal(link.getLastRow(), 5);
  assert.equal(at(2, '社外視点名'), '外観視点①');
  assert.equal(at(3, '社外視点名'), '外観視点①_パターンA');
  assert.equal(at(4, '社外視点名'), '内観視点②');
  assert.equal(at(2, '会社名'), '株式会社リックデザイン');   // 会社マスタの RIC から
  assert.equal(at(4, 'その他時間'), 1.5);
  assert.equal(at(5, '回'), 2);                               // 同じ RIC.34 の EX1 の2回目
  assert.equal(at(5, 'ステップ種類'), '修正（無料）');
  assert.ok(link.validations.some(v => v.col === h.indexOf('工程図へ') + 1 && v.rule.type === 'checkbox'), '「工程図へ」にチェックボックス');

  // もう一度転記しても行は増えない
  env.g.transferFromStaffSheet();
  assert.equal(link.getLastRow(), 5);
});

console.log(`\n${passed} tests passed`);
