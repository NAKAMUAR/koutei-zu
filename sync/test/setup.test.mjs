// sync/Code.gs の「かんたん初期設定」まわり（シート操作を伴う部分）を、偽の Google 環境で検証する。
// 実行: node sync/test/setup.test.mjs
// Apps Script は手元で動かせないため、SpreadsheetApp などを最小限の偽物に置き換えて、
// 9/18 時点の古い管理者シート＋9/28 時点のエンジニア入力シート（入力シート・記入ルール/説明）→ かんたん初期設定 → 転記 まで通して確かめる。
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

/** 2026-09-18 時点の管理者シート（旧レイアウト）を再現する */
function oldAdminSheet(settings) {
  const tight = (rows) => ({ rows: rows.length, cols: Math.max.apply(null, rows.map(r => r.length)) });
  const t = (name, rows) => new FakeSheet(name, rows, tight(rows));
  return new FakeSpreadsheet('工程図連携', [
    t('使い方', [['工程図連携シート の使い方'], ['このファイルは、スタッフが書く「Project Schedule」の内容を…']]),
    t('連携', [['取込キー', '状態', '工程図へ', '社内案件名', '社外案件名', 'カット名', '回', '納期', 'White時間', 'Color時間', '制作項目',
      '会社名', '区分', '種類', 'ステップ種類', '担当者', 'メモ', '対象外', '転記日時', '送信日時', '結果', '元シート行', 'サーバリンク']]),
    t('会社マスタ', [['案件コードの英字部分', '工程図の会社名', '備考', '', '工程図に登録済みの会社名（参考）', '契約'],
      ['RIC', '株式会社リックデザイン', '', '', '', ''], ['REN', 'リノべる株式会社', '', '', '', ''], ['RENOBERU', 'リノべる株式会社', '同上（表記ゆれ）', '', '', '']]),
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
      const b = { requireCheckbox() { rule.type = 'checkbox'; return b; }, requireValueInList(v) { rule.type = 'list'; rule.values = v.slice(); return b; },
        requireNumberBetween(lo, hi) { rule.type = 'number'; rule.range = [lo, hi]; return b; },
        setAllowInvalid(x) { rule.allowInvalid = x; return b; }, setHelpText(t) { rule.help = t; return b; }, build() { return rule; } };
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
    'hasStaffInputHeaders_', 'migrateLegacyStaffSetting_', 'readCompanyCodes_', 'fmtYMD_', 'H', 'SETTING_NOTES', 'STAFF_INPUT_COLUMNS', 'STAFF_INPUT_HINT'];
  env.g = vm.runInContext(src + '\n;({' + names.join(',') + '})', ctx);
  return env;
}
const settingsOf = (admin) => Object.fromEntries(admin.getSheetByName('設定').rows.slice(1).map(r => [r[0], r[1]]));
const colOf = (sheet, row, ja) => sheet.header(row).findIndex(h => h.split('\n')[0] === ja) + 1;
const ruleAt = (sheet, row, col) => { const v = sheet.validations.filter(x => x.col === col && x.row === row); return v.length ? v[v.length - 1].rule : null; };

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }
// vm で作った配列は別 realm なので、JSON で正規化してから比べる
const plain = (v) => JSON.parse(JSON.stringify(v));
const same = (actual, expected, msg) => assert.deepEqual(plain(actual), plain(expected), msg);

test('見出し行の検索：入力シートは2行目／旧レイアウトや記入ルールのタブは「今の入力タブ」とみなさない', () => {
  const env = makeEnv({ admin: oldAdminSheet(), files: {} });
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

test('かんたん初期設定：古い管理者シートが1回で今の形になり、入力シートが日本語・ベトナム語の2段見出し＋プルダウンになる', () => {
  const admin = oldAdminSheet();
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
  // 『案件マスタ』ができる／『視点マスタ』に社外名と新しい視点コード
  same(admin.getSheetByName('案件マスタ').header(), ['社内案件名', '社外案件名', '会社名', 'お客様担当者', '備考']);
  const view = admin.getSheetByName('視点マスタ');
  const ext = view.header().indexOf('社外名');
  assert.ok(ext >= 0);
  assert.equal(view.rows[1][ext], '外観視点');
  assert.equal(view.rows[3][ext], '写真合成視点');
  const kws = view.rows.slice(1).map(r => r[0]);
  ['EXCB', 'INCM', 'INCB', 'EXM', 'INM'].forEach(k => assert.ok(kws.includes(k), '視点マスタに ' + k));
  const exm = view.rows.find(r => r[0] === 'EXM');
  assert.equal(exm[view.header().indexOf('種類')], 'モデル');
  assert.equal(exm[ext], '外観モデル');
  // 『会社マスタ』：空いていたD列に「入力シートに出さない」。表記ゆれの行にだけチェック
  const company = admin.getSheetByName('会社マスタ');
  assert.equal(company.header()[3], '入力シートに出さない');
  assert.equal(company.header()[4], '工程図に登録済みの会社名（参考）', '参考欄は動かさない');
  same(company.rows.slice(1).map(r => r[3]), [false, false, true]);
  same(env.g.readCompanyCodes_(admin), ['RIC', 'REN']);
  // 『使い方』は今の説明に書き直される
  assert.ok(admin.getSheetByName('使い方').rows.some(r => String(r[0]).indexOf('入力日') >= 0));

  // 『設定』：旧 Project Schedule → エンジニア入力シートの『入力シート』へ切り替え、説明も今の文に
  const st = settingsOf(admin);
  assert.equal(st['スタッフシートのファイルID'], NEW_ID);
  assert.equal(st['スタッフシートのタブ名'], '入力シート');
  assert.equal(st['取込開始行'], 2);
  const noteRow = admin.getSheetByName('設定').rows.find(r => r[0] === 'スタッフシートのファイルID');
  assert.equal(noteRow[2], env.g.SETTING_NOTES.fileId);

  // エンジニア入力シート：タブは増えない。『入力シート』の見出しが2段（1列目の書き間違いは「会社コード」に直る）
  same(eng.getSheets().map(s => s.getName()), ['Untitled', '入力シート', '記入ルール/説明']);
  const tab = eng.getSheetByName('入力シート');
  same(tab.header(2), env.g.STAFF_INPUT_COLUMNS.map(c => c.label + '\n' + c.vi));
  assert.equal(tab.header(2)[0].split('\n')[0], '会社コード');
  assert.ok(/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(tab.header(2).join(' ')), 'ベトナム語が入っている');
  assert.ok(tab.notes['2,1'].indexOf('\n') > 0, '注記も2か国語');
  assert.equal(tab.rows[0][0], env.g.STAFF_INPUT_HINT, '1行目に案内');
  assert.equal(tab.frozen, 2, '見出しまで固定');
  // プルダウン（見出しの次の行から）
  const code = ruleAt(tab, 3, 1);
  same([code.type, code.values], ['list', ['RIC', 'REN']], '会社コード＝会社マスタ（表記ゆれは出さない）');
  assert.equal(ruleAt(tab, 3, 2).type, 'number', '案件番号は数字だけ');
  assert.equal(ruleAt(tab, 3, 2).allowInvalid, false);
  same(ruleAt(tab, 3, 5).values, ['新規 / Mới', '修正 / Sửa']);
  assert.equal(ruleAt(tab, 3, 5).allowInvalid, false, '新規or修正はリスト以外を入れられない');
  assert.ok(ruleAt(tab, 3, 6).values.includes('EXCB1') && ruleAt(tab, 3, 6).values.includes('INM1'), '視点');
  same(ruleAt(tab, 3, 7).values.slice(0, 3), ['A', 'B', 'C'], 'パターン');
  [8, 9, 10].forEach(c => assert.ok(ruleAt(tab, 3, c).values.includes('0.5'), '時間 ' + c));
  assert.equal(ruleAt(tab, 3, 3), null, '社外案件名は自由入力');
  assert.equal(ruleAt(tab, 3, 4), null, 'サーバーリンクは自由入力');
  // 『記入ルール/説明』は2か国語で書き直され、記入例の見出しも入力シートと同じ2段
  const rules = eng.getSheetByName('記入ルール/説明');
  const text = rules.rows.map(r => r.join(' ')).join('\n');
  ['【記入ルール】', 'Quy tắc', 'EXCB1 → 外観鳥瞰視点①', 'INM1', '新規 / Mới', 'Không tính số giờ White'.toLowerCase()].forEach(w => assert.ok(text.toLowerCase().indexOf(w.toLowerCase()) >= 0, w));
  assert.ok(rules.rows.some(r => r[1] === '会社コード\nMã công ty'));
  assert.ok(!rules.rows.some(r => r.includes('new')), '古い記入例（new/add）は残らない');
  // 旧レイアウトの『Untitled』タブには触らない
  assert.equal(eng.getSheetByName('Untitled').rows[16][1], '社内案件名');

  // 旧 Project Schedule には一切触らない
  assert.equal(legacy.getSheets().length, 1);
  assert.equal(legacy.getSheets()[0].getName(), '案件シート(一覧)');

  // 結果は1つのダイアログで、全部 ✓
  assert.equal(env.alerts.length, 1);
  assert.ok(env.alerts[0].indexOf('✗') < 0, env.alerts[0]);
  assert.ok(env.alerts[0].indexOf('接続OK') >= 0);
  assert.ok(env.alerts[0].indexOf('準備ができました') >= 0);

  // 転記の読み取り：見出し（2行目）より下だけを読む。会社コード＋案件番号 → RIC.34
  assert.equal(env.g.readStaffRows_(env.g.readSettings_()).length, 0);
  tab.set(3, 1, 'RIC'); tab.set(3, 2, 34); tab.set(3, 5, '新規 / Mới'); tab.set(3, 6, 'EX1'); tab.set(3, 8, 6); tab.set(3, 9, 4);
  const rows = env.g.collectSourceRows_(env.g.readStaffRows_(env.g.readSettings_()));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].code, 'RIC.34');
  assert.equal(rows[0].key, 'RIC34::EX1::1');
  assert.equal(rows[0].srcRow, 3);
});

test('かんたん初期設定は何度押しても同じ結果（列・タブ・マスタの行が増えない）', () => {
  const admin = oldAdminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng, [LEGACY_ID]: legacyFile() } });
  env.g.quickSetup();
  const snap = () => ({
    link: admin.getSheetByName('連携').header().length,
    sheets: admin.getSheets().map(s => s.getName()).join(','),
    view: admin.getSheetByName('視点マスタ').getLastRow(),
    company: admin.getSheetByName('会社マスタ').header().join(','),
    eng: eng.getSheets().map(s => s.getName()).join(','),
    header: eng.getSheetByName('入力シート').header(2).join('|'),
    rules: eng.getSheetByName('記入ルール/説明').getLastRow(),
  });
  const a = snap();
  env.g.quickSetup();
  same(snap(), a);
  assert.equal(settingsOf(admin)['スタッフシートのファイルID'], NEW_ID);
});

test('『入力シート』タブが無いときは新しく作る（記入ルールのタブや旧レイアウトのタブは流用しない）', () => {
  const admin = oldAdminSheet();
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

test('メニュー「エンジニア入力シートを整える」単体でも、旧設定なら先に切り替えてから新シートを整える／会社を足すとプルダウンに出る', () => {
  const admin = oldAdminSheet();
  const eng = engineerFile();
  const legacy = legacyFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng, [LEGACY_ID]: legacy } });
  env.g.quickSetup();
  admin.getSheetByName('会社マスタ').set(5, 1, 'SUM'); admin.getSheetByName('会社マスタ').set(5, 2, 'SUMUS');
  env.g.createStaffInputTab();
  same(ruleAt(eng.getSheetByName('入力シート'), 3, 1).values, ['RIC', 'REN', 'SUM']);
  assert.equal(legacy.getSheets().length, 1, '旧 Project Schedule にはタブを作らない');

  const admin2 = oldAdminSheet();
  const env2 = makeEnv({ admin: admin2, files: { [NEW_ID]: engineerFile(), [LEGACY_ID]: legacyFile() } });
  env2.g.createStaffInputTab();
  assert.ok(env2.alerts[0].indexOf('切り替えました') >= 0);
});

test('転記：入力シートの行が『連携』に追記され、入力日（転記した日）・社内案件名（RIC.34）・社外視点名などが自動で入る', () => {
  const admin = oldAdminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const tab = eng.getSheetByName('入力シート');
  const put = (r, vals) => vals.forEach((v, j) => tab.set(r, j + 1, v));
  const NEW = '新規 / Mới', FIX = '修正 / Sửa';
  put(3, ['RIC', 34, 'マンション', LINK, NEW, 'EX1', '', 6, 4, 0, '外観 昼景']);
  put(4, ['RIC', 34, 'マンション', LINK, NEW, 'EX1', 'A', 6, 4, 0, '']);
  put(5, ['RIC', 34, 'マンション', LINK, NEW, 'IN2', '', 5, 3.5, 1.5, '']);
  put(6, ['RIC', 34, 'マンション', LINK, FIX, 'EX1', '', 0, 1.5, 0, '色味の修正']);
  put(7, ['REN', 72, '戸建て', '', NEW, 'EXM1', '', 8, '', '', '']);
  put(8, ['RIC', 35, '', '', NEW, 'EXCB1', '', '', '', '', '']);        // 時間がまだ → 待つ
  put(9, ['RIC', '', '', '', NEW, 'IN1', '', 3, '', '', '']);           // 案件番号がまだ → 待つ
  put(10, ['RIC', 34, 'マンション', '', '', 'IN5', '', 2, '', '', '']); // 新規or修正がまだ → 待つ
  put(11, ['RIC', 34, 'マンション', LINK, NEW, 'EX1', '', 1, 0, 0, '']); // EX1 の3回目なのに「新規」→ 要確認
  const msg = env.g.transferFromStaffSheet();
  assert.ok(msg.indexOf('新規追加: 6') >= 0, msg);
  assert.ok(msg.indexOf('記入途中で待っている行: 3') >= 0, msg);

  const link = admin.getSheetByName('連携');
  const h = link.header();
  const at = (r, name) => link.rows[r - 1][h.indexOf(name)];
  const today = env.g.fmtYMD_(new Date());
  assert.equal(link.getLastRow(), 7);
  for (let r = 2; r <= 7; r++) assert.equal(at(r, '入力日'), today, r + '行目の入力日');
  assert.equal(at(2, '社内案件名'), 'RIC.34');
  assert.equal(at(2, '社外案件名'), 'マンション');
  assert.equal(at(2, '社外視点名'), '外観視点①');
  assert.equal(at(2, '状態'), '未送信');
  assert.equal(at(2, '元シート備考'), '外観 昼景');
  assert.equal(at(2, 'サーバリンク'), LINK);
  assert.equal(at(3, '社外視点名'), '外観視点①_パターンA');
  assert.equal(at(4, '社外視点名'), '内観視点②');
  assert.equal(at(2, '会社名'), '株式会社リックデザイン');   // 会社マスタの RIC から
  assert.equal(at(4, 'その他時間'), 1.5);
  assert.equal(at(5, '回'), 2);                               // 同じ RIC.34 の EX1 の2回目
  assert.equal(at(5, '新規or修正'), FIX);
  assert.equal(at(5, 'ステップ種類'), '修正（無料）');
  assert.equal(at(6, '社内案件名'), 'REN.72');
  assert.equal(at(6, '種類'), 'モデル');
  assert.equal(at(6, '社外視点名'), '外観モデル①');
  assert.equal(at(6, '会社名'), 'リノべる株式会社');
  assert.equal(at(7, '回'), 3);
  assert.equal(at(7, '状態'), '要確認');
  assert.ok(String(at(7, '結果')).indexOf('3回目') >= 0);
  assert.ok(link.validations.some(v => v.col === h.indexOf('工程図へ') + 1 && v.rule.type === 'checkbox'), '「工程図へ」にチェックボックス');
  assert.ok(link.validations.some(v => v.col === h.indexOf('種類') + 1 && v.rule.values.includes('モデル')), '種類にモデル');

  // 人が『連携』に入れた納期・入力日は、次の転記で消えない。入力シートの時間が変わったら更新される
  link.set(2, h.indexOf('納期') + 1, '2026-10-10');
  link.set(2, h.indexOf('入力日') + 1, '2026-09-01');
  tab.set(3, 8, 7);
  env.g.transferFromStaffSheet();
  assert.equal(at(2, '納期'), '2026-10-10');
  assert.equal(at(2, '入力日'), '2026-09-01');
  assert.equal(at(2, 'White時間'), 7);
  assert.equal(link.getLastRow(), 7, '行は増えない');

  // 時間を消すと「元シートから消えた」、同じ値を書き直すと未送信に戻る
  tab.set(4, 8, ''); tab.set(4, 9, ''); tab.set(4, 10, '');
  env.g.transferFromStaffSheet();
  assert.equal(at(3, '状態'), '元シートから消えた');
  tab.set(4, 8, 6); tab.set(4, 9, 4); tab.set(4, 10, 0);
  env.g.transferFromStaffSheet();
  assert.equal(at(3, '状態'), '未送信');

  // 記入途中だった行がそろうと、次の転記で追加される（入力日はその日）
  tab.set(8, 8, 3);
  const msg2 = env.g.transferFromStaffSheet();
  assert.ok(msg2.indexOf('新規追加: 1') >= 0, msg2);
  assert.equal(at(8, '社内案件名'), 'RIC.35');
  assert.equal(at(8, '社外視点名'), '外観鳥瞰視点①');
  assert.equal(at(8, '入力日'), today);
});

console.log(`\n${passed} tests passed`);
