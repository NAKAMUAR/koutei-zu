// sync/Code.gs の「かんたん初期設定」まわり（シート操作を伴う部分）を、偽の Google 環境で検証する。
// 実行: node sync/test/setup.test.mjs
// Apps Script は手元で動かせないため、SpreadsheetApp などを最小限の偽物に置き換えて、
// 9/28 時点の管理者シート（マスタは管理者が直した後）＋エンジニア入力シート（入力シート・記入ルール/説明）→ かんたん初期設定 →
// 転記 → 15分ごとの自動実行（自動登録）まで、偽の Firestore を相手に通して確かめる。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { taskPackOf as appTaskPackOf } from '../../src/lib/taskPacks.js';

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
  getValue() { return this.getValues()[0][0]; }
  getSheet() { return this.sheet; }
  getRow() { return this.row; }
  getLastRow() { return this.row + this.nr - 1; }
  getColumn() { return this.col; }
  getLastColumn() { return this.col + this.nc - 1; }
  setNote(t) { this.sheet.notes[this.row + ',' + this.col] = t; return this; }
  setNotes(arr) { arr.forEach((rv, i) => rv.forEach((t, j) => { this.sheet.notes[(this.row + i) + ',' + (this.col + j)] = t; })); return this; }
  setFontWeight() { return this; }
  setFontSize() { return this; }
  setFontColor() { return this; }
  setBackground() { return this; }
  setBackgrounds(arr) { this.sheet.bgs = { row: this.row, col: this.col, arr }; return this; }
  setWrap() { return this; }
  breakApart() { return this; }
  setVerticalAlignment() { return this; }
  setHorizontalAlignment() { return this; }
  clearDataValidations() { this.sheet.validations = this.sheet.validations.filter(v => !(v.col >= this.col && v.col < this.col + this.nc && v.row < this.row + this.nr && v.row + (v.nr || 1) > this.row)); return this; }
  merge() { this.sheet.merges.push([this.row, this.col, this.nr, this.nc]); return this; }
  setFormula(f) { this.sheet.formulas.push({ row: this.row, col: this.col, nr: this.nr, f }); return this; }
  setDataValidation(rule) { this.sheet.validations.push({ row: this.row, col: this.col, nr: this.nr, rule }); return this; }
  setNumberFormat(f) { this.sheet.formats.push({ row: this.row, col: this.col, f }); return this; }
  setFormulaR1C1(f) { this.sheet.formulas.push({ row: this.row, col: this.col, nr: this.nr, f }); return this; }
}
class FakeSheet {
  // size 省略時は新規タブと同じ 1000行×26列。CSV から作ったタブなどは中身ぴったりの大きさを渡す
  constructor(name, rows = [], size) {
    this.name = name; this.rows = rows.map(r => r.slice()); this.notes = {}; this.validations = []; this.formats = []; this.formulas = []; this.merges = []; this.frozen = 0;
    this.maxRows = size ? size.rows : 1000; this.maxCols = size ? size.cols : 26;
  }
  getMaxRows() { return this.maxRows; }
  getMaxColumns() { return this.maxCols; }
  // 行を差し込む（下の行を n 行ずつ下へずらす。シートの最後に足すときは大きさが増えるだけ）
  insertRowsAfter(after, n) { this.maxRows += n; if (this.rows.length > after) this.rows.splice(after, 0, ...Array.from({ length: n }, () => [])); return this; }
  insertColumnsAfter(after, n) { this.maxCols += n; return this; }
  deleteColumns(c, n) { this.maxCols -= n; return this; }
  deleteRows(r, n) { this.maxRows -= n; this.rows.splice(r - 1, n); return this; }
  setFrozenColumns(n) { this.frozenCols = n; return this; }
  setColumnWidths() { return this; }
  setTabColor() { return this; }
  // 列を差し込む（右の値を1つずつ右へずらす）
  deleteRow(r) { this.rows.splice(r - 1, 1); return this; }
  insertColumnAfter(after) { this.maxCols += 1; this.rows.forEach(r => { if (r.length > after) r.splice(after, 0, ''); }); return this; }
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
  hideColumns(c, n) { this.hidden = (this.hidden || []).concat(Array.from({ length: n || 1 }, (_, i) => c + i)); return this; }
  showColumns(c, n) { const hide = Array.from({ length: n || 1 }, (_, i) => c + i); this.hidden = (this.hidden || []).filter(x => !hide.includes(x)); return this; }
  clearContents() { this.rows = []; return this; }
  clear() { this.rows = []; this.notes = {}; this.validations = []; this.formats = []; return this; }
  header(row = 1) { return (this.rows[row - 1] || []).map(v => (empty(v) ? '' : String(v))); }
}
class FakeSpreadsheet {
  constructor(name, sheets) { this.name = name; this.sheets = sheets; }
  getName() { return this.name; }
  getId() { return 'id:' + this.name; }
  getSpreadsheetTimeZone() { return this.tz || 'America/Los_Angeles'; }
  setSpreadsheetTimeZone(z) { this.tz = z; return this; }
  getSheets() { return this.sheets.slice(); }
  getSheetByName(n) { return this.sheets.find(s => s.getName() === n) || null; }
  insertSheet(name, idx) { const sh = new FakeSheet(name); if (idx === undefined) this.sheets.push(sh); else this.sheets.splice(idx, 0, sh); return sh; }
  deleteSheet(sh) { this.sheets = this.sheets.filter(x => x !== sh); }
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
const VIEWS_0928 = [['EX', '外観目線', 'パース'], ['IN', '内観目線', 'パース'], ['EXCB', '外観鳥瞰', 'パース'], ['INCB', '内観鳥瞰', 'パース'],
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
  // まとめ保存（TASK_PACKS=1 で動かすと、工程図がまとめ保存に移った後の状態でテストする）
  const W = 'workspaces/liebe-asia-team/';
  const PACKS = W + 'data/taskPacks/packs/';
  fs.packMode = !!process.env.TASK_PACKS;
  if (fs.packMode) {
    fs.docs[W + 'data/taskPacks'] = { v: { integerValue: '1' }, packs: { integerValue: '64' } };
    for (let i = 0; i < 64; i++) fs.docs[PACKS + 'p' + String(i).padStart(2, '0')] = { t: { mapValue: { fields: {} } } };
  }
  const packOf = (id) => { let h = 0x811c9dc5; const s = String(id); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return PACKS + 'p' + String((h >>> 0) % 64).padStart(2, '0'); };
  fs.packOf = packOf;
  // タスクid → エンコード済み fields（どちらの保存のしかたでも）
  const taskFields = () => {
    const out = {};
    if (fs.packMode) Object.keys(fs.docs).filter(k => k.indexOf(PACKS) === 0).forEach(k => { const t = fs.docs[k].t.mapValue.fields || {}; Object.keys(t).forEach(id => { out[id] = t[id].mapValue.fields; }); });
    else Object.keys(fs.docs).filter(k => k.indexOf(W + 'tasks/') === 0).forEach(k => { out[k.split('/').pop()] = fs.docs[k]; });
    return out;
  };
  fs.tasks = () => Object.values(taskFields()).map(f => {
    const o = {};
    Object.keys(f).forEach(n => { const v = f[n]; o[n] = 'stringValue' in v ? v.stringValue : 'integerValue' in v ? Number(v.integerValue) : 'doubleValue' in v ? v.doubleValue : 'booleanValue' in v ? v.booleanValue : null; });
    return o;
  });
  // テスト用：工程図側でタスクを置く・直す（完了にするなど）
  fs.putTask = (id, fields) => {
    if (fs.packMode) fs.docs[packOf(id)].t.mapValue.fields[id] = { mapValue: { fields } };
    else fs.docs[W + 'tasks/' + id] = fields;
  };
  fs.setTask = (id, patch) => { const f = taskFields()[id]; Object.keys(patch).forEach(k => { f[k] = { stringValue: patch[k] }; }); };
  // updateMask のパス（t.`id`.hours など）を区切る
  const splitPath = (p) => { const out = []; let cur = '', q = false; for (let i = 0; i < p.length; i++) { const c = p[i]; if (q) { if (c === '\\') { cur += p[++i]; } else if (c === '`') q = false; else cur += c; } else if (c === '`') q = true; else if (c === '.') { out.push(cur); cur = ''; } else cur += c; } out.push(cur); return out; };
  fs.fetch = (url, opt) => {
    const method = (opt && opt.method) || 'get';
    const res = (code, body) => ({ getResponseCode: () => code, getContentText: () => (body === undefined ? '' : JSON.stringify(body)) });
    // 本物の工程図と同じく、データベース名は "default"（カッコなし）。"(default)" などを指すと 404 になる
    const db = decodeURIComponent(url.split('/databases/')[1].split('/')[0]);
    if (db !== 'default') return res(404, { error: { code: 404, message: 'The database ' + db + ' does not exist for project koutei-zu', status: 'NOT_FOUND' } });
    const p = decodeURIComponent(url.split('/documents/')[1].split('?')[0]);
    if (p.endsWith(':runQuery')) {
      // where（fieldFilter の EQUAL・IN・範囲、compositeFilter の AND）だけ
      const q = JSON.parse(opt.payload).structuredQuery;
      const base = p.replace(/:runQuery$/, '') + '/' + q.from[0].collectionId + '/';
      const val = (v) => ('stringValue' in v ? v.stringValue : 'integerValue' in v ? Number(v.integerValue) : 'booleanValue' in v ? v.booleanValue : null);
      const test = (f, doc) => {
        if (f.compositeFilter) return f.compositeFilter.filters.every(x => test(x, doc));
        const ff = f.fieldFilter; const cur = doc[ff.field.fieldPath] ? val(doc[ff.field.fieldPath]) : undefined;
        if (ff.op === 'IN') return ff.value.arrayValue.values.map(val).includes(cur);
        if (cur === undefined) return false;
        const w = val(ff.value);
        return ff.op === 'EQUAL' ? cur === w : ff.op === 'GREATER_THAN_OR_EQUAL' ? cur >= w : ff.op === 'LESS_THAN' ? cur < w : false;
      };
      const hits = Object.keys(fs.docs).filter(k => k.indexOf(base) === 0 && !k.slice(base.length).includes('/') && test(q.where, fs.docs[k]));
      fs.queries = (fs.queries || 0) + 1;
      fs.taskReads = (fs.taskReads || 0) + 1;
      fs.queryReads = (fs.queryReads || 0) + hits.length;
      return res(200, hits.length ? hits.map(k => ({ document: { name: k, fields: fs.docs[k] } })) : [{ readTime: 'x' }]);
    }
    if (method === 'get') {
      if (/\/taskPacks\/packs$/.test(p)) {
        fs.taskReads = (fs.taskReads || 0) + 1;
        return res(200, { documents: Object.keys(fs.docs).filter(k => k.indexOf(p + '/') === 0).map(k => ({ name: k, fields: fs.docs[k] })) });
      }
      if (/\/tasks$/.test(p)) fs.listAll = (fs.listAll || 0) + 1;
      if (/\/tasks$/.test(p)) return res(200, { documents: Object.keys(fs.docs).filter(k => k.indexOf(p + '/') === 0).map(k => ({ name: k, fields: fs.docs[k] })) });
      return fs.docs[p] ? res(200, { name: p, fields: fs.docs[p] }) : res(404, { error: 'NOT_FOUND' });
    }
    if (method === 'delete') { delete fs.docs[p]; fs.patches.push({ path: p, deleted: true }); return res(200, {}); }
    const body = JSON.parse(opt.payload);
    const mask = url.indexOf('updateMask') >= 0;
    if (!mask) fs.docs[p] = body.fields;
    else {
      // 本物と同じく、パスごとに：中身にあれば置き換え、無ければ消す（入れ子の t.`id`.hours も）
      const cur = JSON.parse(JSON.stringify(fs.docs[p] || {}));
      const paths = url.split('?')[1].split('&').filter(x => x.indexOf('updateMask.fieldPaths=') === 0).map(x => decodeURIComponent(x.split('=')[1]));
      paths.forEach(fp => {
        const segs = splitPath(fp);
        let src = body.fields;
        segs.forEach((sg, i) => { src = src && (i === 0 ? src[sg] : (src.mapValue && src.mapValue.fields || {})[sg]); });
        let dst = cur;
        for (let i = 0; i < segs.length - 1; i++) {
          if (!dst[segs[i]] || !dst[segs[i]].mapValue) dst[segs[i]] = { mapValue: { fields: {} } };
          dst = dst[segs[i]].mapValue.fields || (dst[segs[i]].mapValue.fields = {});
        }
        const last = segs[segs.length - 1];
        if (src === undefined) delete dst[last]; else dst[last] = src;
      });
      fs.docs[p] = cur;
    }
    fs.patches.push({ path: p, mask, fields: Object.keys(body.fields) });
    return res(200, { name: p });
  };
  return fs;
}

function makeEnv({ admin, files, fetchCode = 200, openFails = [], customers = KOUTEI_CUSTOMERS }) {
  const env = { admin, files, alerts: [], triggers: [], fs: fakeFirestore(customers), props: {}, discord: [], discordCode: 204, dialogs: [] };
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
    getUi: () => ({ alert: (m) => env.alerts.push(String(m)), showModalDialog: (h, title) => env.dialogs.push({ title, html: h.html }) }),
  };
  ctx.HtmlService = { createHtmlOutput: (html) => { const o = { html, setWidth: () => o, setHeight: () => o }; return o; } };
  ctx.PropertiesService = { getScriptProperties: () => ({
    getProperty: (k) => (k in env.props ? env.props[k] : null),
    setProperty: (k, v) => { env.props[k] = v; },
    deleteProperty: (k) => { delete env.props[k]; },
  }) };
  ctx.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) };
  ctx.ScriptApp = {
    getOAuthToken: () => 'tok',
    getProjectTriggers: () => env.triggers.slice(),
    deleteTrigger: (t) => { env.triggers = env.triggers.filter(x => x !== t); },
    newTrigger: (fn) => {
      const t = { fn, getHandlerFunction: () => fn };
      const b = { timeBased: () => b, everyMinutes: (n) => { t.every = n; return b; }, forSpreadsheet: (id) => { t.file = id; return b; }, onEdit: () => { t.onEdit = true; return b; },
        create: () => { env.triggers.push(t); return t; } };
      return b;
    },
  };
  ctx.UrlFetchApp = {
    fetch: (url, opt) => {
      if (url.indexOf('https://discord.com/') === 0) {
        env.discord.push(JSON.parse(opt.payload).content);
        return { getResponseCode: () => env.discordCode, getContentText: () => '' };
      }
      if (env.fsQuota) return { getResponseCode: () => 429, getContentText: () => '{"error":{"code":429,"message":"Quota limit exceeded","status":"RESOURCE_EXHAUSTED"}}' };
      if (fetchCode !== 200) return { getResponseCode: () => fetchCode, getContentText: () => '{"error":"PERMISSION_DENIED"}' };
      return env.fs.fetch(url, opt);
    },
  };
  vm.createContext(ctx);
  const names = ['onAdminEdit', 'renderRegMessage_', 'onStaffEdit', 'syncRegistrationsNow', 'saveDiscordWebhook_', 'inNotifyHours_', 'isReminderDue_', 'calcDeadlineOf_', 'regState_', 'REG_STATE', 'quickSetup', 'createStaffInputTab', 'transferFromStaffSheet', 'autoRun', 'readSettings_', 'readStaffRows_', 'collectSourceRows_', 'findStaffHeaderRow_',
    'hasStaffInputHeaders_', 'migrateLegacyStaffSetting_', 'readCompanyCodes_', 'fmtYMD_', 'H', 'SETTING_NOTES', 'STAFF_INPUT_COLUMNS', 'STAFF_INPUT_HINT', 'REG_DIALOG_SCRIPT', 'REG_DIALOG_COPY_FAIL', 'REG_DIALOG_READY', 'changedMessage_', 'entryFormRows_', 'submitEntryForm', 'entryFormHtml_', 'formMap_', 'formListMerge_', 'formAutoExt_', 'formAddPattern_', 'formNormalizeRows_', 'formConfirmHtml_', 'FORM_CONFIRM_SCRIPT', 'submitFormSheet', 'FORM_LC', 'FORM_KEY_COL', 'FORM_NO_COL', 'updateEntryForm', 'normRegNo_', 'formRegGroup_', 'formEnsureEditRow_', 'FORM_L', 'addWorkMinutes_', 'parseWorkHours_', 'readRegInfo_', 'ensureRegSheet_', 'deleteRegistrations', 'cancelDeleteRegistrations', 'writeScheduleToLink_', 'writeAssigneeTabs_', 'withBranchRoom_', 'FORM_BR', 'saveBranchViews', 'taskPackOf_', 'fsReadDay_', 'fsReadsToday_', 'AUTO_READ_BUDGET', 'deliveryYmd_', 'fillStaffDeliveryNames_', 'planRegDeletion_', 'deleteDialogHtml_', 'DELETE_DIALOG_SCRIPT', 'regHeaderMap_', 'fixClientContactAssignees'];
  env.g = vm.runInContext(src + '\n;({' + names.join(',') + '})', ctx);
  // テストは時刻に関係なく Discord を送る（知らせる時間帯を 0-24 に）。時間帯のテストは env.setHours で変える
  env.setHours = (h) => { const st = env.admin.getSheetByName('設定'); const r = st && st.rows.findIndex(x => x[0] === '催促する時間帯（ベトナム時間）'); if (r >= 0) st.set(r + 1, 2, h); };
  const qs = env.g.quickSetup;
  env.g = Object.assign({}, env.g, { quickSetup: () => { const r = qs(); env.setHours('0-24'); return r; } });
  return env;
}
const settingsOf = (admin) => Object.fromEntries(admin.getSheetByName('設定').rows.slice(1).map(r => [r[0], r[1]]));
const ruleAt = (sheet, row, col) => { const v = sheet.validations.filter(x => x.col === col && x.row === row); return v.length ? v[v.length - 1].rule : null; };

const inTab = (eng) => eng.getSheetByName('入力前') || eng.getSheetByName('入力シート');
const env0 = () => makeEnv({ admin: adminSheet(), files: {} });
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }
// vm で作った配列は別 realm なので、JSON で正規化してから比べる
const plain = (v) => JSON.parse(JSON.stringify(v));
const same = (actual, expected, msg) => assert.deepEqual(plain(actual), plain(expected), msg);
const CODES_0928 = COMPANIES_0928.map(r => r[0]);

test('見出し行の検索：入力シートは2行目／旧レイアウトや記入ルールのタブは「今の入力タブ」とみなさない', () => {
  const env = makeEnv({ admin: adminSheet(), files: {} });
  const eng = engineerFile();
  assert.equal(env.g.findStaffHeaderRow_(inTab(eng)), 2);
  assert.equal(env.g.hasStaffInputHeaders_(inTab(eng)), true);
  assert.equal(env.g.findStaffHeaderRow_(eng.getSheetByName('Untitled')), 17);
  assert.equal(env.g.hasStaffInputHeaders_(eng.getSheetByName('Untitled')), false, '旧レイアウト（案件番号なし）');
  const old = legacyFile().getSheets()[0];
  assert.equal(env.g.findStaffHeaderRow_(old), 2);
  assert.equal(env.g.hasStaffInputHeaders_(old), false);
  assert.equal(env.g.findStaffHeaderRow_(new FakeSheet('空')), -1);
});

test('かんたん初期設定：管理者シート・入力シート（2か国語・マスタからのプルダウン）・顧客マスタ・15分ごとの自動実行が1回で整う', () => {
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
  assert.equal(st['スタッフシートのタブ名'], '入力前');
  assert.equal(st['取込開始行'], 2);
  assert.equal(st['自動登録'], 'する');
  assert.equal(st['自動登録の待ち時間（分）'], 15);
  assert.ok('最後の自動実行' in st);
  // 『案件マスタ』『使い方』
  same(admin.getSheetByName('案件マスタ').header(), ['社内案件名', '社外案件名', '会社名', 'お客様担当者', '備考']);
  assert.ok(admin.getSheetByName('使い方').rows.some(r => String(r[0]).indexOf('15分ごと') >= 0));

  // エンジニア入力シート：『入力シート』は『入力前』になり、制作中・制作済みのタブができる。見出しが2段（1列目の書き間違いは「会社コード」に直る）
  same(eng.getSheets().map(s => s.getName()), ['Untitled', '入力前', '制作中', '制作済み', '記入ルール/説明']);
  same(eng.getSheetByName('制作中').header(2), inTab(eng).header(2), '制作中も同じ列');
  same(eng.getSheetByName('制作済み').header(2), inTab(eng).header(2), '制作済みも同じ列');
  const tab = inTab(eng);
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
  [8, 9, 10, 11].forEach(c => assert.ok(ruleAt(tab, 3, c).values.includes('0.5'), '時間 ' + c));
  same(tab.header(2).slice(7, 9).map(h => h.split('\n')[0]), ['White躯体', 'White家具'], 'White は躯体と家具の2列');
  assert.equal(ruleAt(tab, 3, 3), null, '社外案件名は自由入力');
  assert.equal(ruleAt(tab, 3, 4), null, 'サーバーリンクは自由入力');
  // 『記入ルール/説明』は2か国語で書き直され、視点コード表は視点マスタから
  const rules = eng.getSheetByName('記入ルール/説明');
  const text = rules.rows.map(r => r.join(' ')).join('\n');
  ['【記入ルール】', 'Quy tắc', 'EX1 → 外観目線視点① ／ ngoại thất', 'EXP1 → 外観写真合成視点①', 'VIDEO1 → 動画', '黄色の列だけ', 'Chỉ nhập vào các cột màu vàng', 'White躯体', 'Trắng – nội thất', '『制作中』', '261106', 'Ngày tự đổi'].forEach(w => assert.ok(text.toLowerCase().indexOf(w.toLowerCase()) >= 0, w));
  ['会社コード：', '案件番号：', 'サーバーリンク：', '新規or修正：'].forEach(w => assert.ok(text.indexOf(w) < 0, '管理者が入れる列の書き方は載せない：' + w));
  assert.ok(!rules.rows.some(r => r.includes('new')), '古い記入例（new/add）は残らない');
  assert.equal(eng.getSheetByName('Untitled').rows[16][1], '社内案件名', '旧レイアウトのタブには触らない');
  assert.equal(legacy.getSheets().length, 1, '旧 Project Schedule には触らない');

  // 工程図の顧客マスタ：無い会社を追加。「株式会社サンゲツ」は工程図の「サンゲツ」と同じ会社とみなして二重に作らない
  const customers = env.fs.customers();
  ['株式会社リックデザイン', 'ソーシャルインテリア', 'FRYGALLERY', 'ヴンダー', 'CONTE'].forEach(c => assert.ok(customers.includes(c), c + ' を追加'));
  assert.ok(!customers.includes('株式会社サンゲツ'));
  assert.equal(customers.length, KOUTEI_CUSTOMERS.length + COMPANIES_0928.length - 7);
  // 2つのシートのタイムゾーンはベトナム時間に合わせる
  assert.equal(admin.getSpreadsheetTimeZone(), 'Asia/Ho_Chi_Minh');
  assert.equal(eng.getSpreadsheetTimeZone(), 'Asia/Ho_Chi_Minh');
  // 15分ごとの自動実行が1つ
  same(env.triggers.map(t => [t.fn, t.every || null, t.file || null]), [['autoRun', 15, null], ['onStaffEdit', null, NEW_ID], ['onAdminEdit', null, 'id:工程図連携']],
    '15分ごとの自動実行＋入力シートの編集トリガー＋管理者シートの編集トリガー');

  // 結果は1つのダイアログ
  assert.equal(env.alerts.length, 1);
  const msg = env.alerts[0];
  assert.ok(msg.indexOf('✗') < 0, msg);
  ['接続OK', '顧客マスタに 10 社を追加', '株式会社サンゲツ → 「サンゲツ」', '15分ごとの自動実行を設定しました', '準備ができました'].forEach(w => assert.ok(msg.indexOf(w) >= 0, w + '\n' + msg));

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
    header: inTab(eng).header(2).join('|'),
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
  same(eng.getSheets().map(s => s.getName()), ['入力前', '制作中', '制作済み', 'Untitled', '記入ルール/説明']);
  const tab = inTab(eng);
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
  const tab = inTab(eng);
  same(ruleAt(tab, 3, 1).values, CODES_0928.concat(['NEWCO']));
  assert.ok(ruleAt(tab, 3, 6).values.includes('CAD1'));
  assert.equal(legacy.getSheets().length, 1, '旧 Project Schedule にはタブを作らない');

  const admin2 = adminSheet();
  const env2 = makeEnv({ admin: admin2, files: { [NEW_ID]: engineerFile(), [LEGACY_ID]: legacyFile() } });
  env2.g.createStaffInputTab();
  assert.ok(env2.alerts[0].indexOf('切り替えました') >= 0);
});

// 入力シートに行を書く補助
// 行を書く（White 1列の書き方で渡す。White躯体・White家具の2列のシートでは、White の値を躯体に入れ、家具は空にする）
const writer = (tab) => (r, vals) => {
  const split = String(tab.header(2)[8] || '').indexOf('White家具') === 0;
  const arr = split && vals.length > 8 ? vals.slice(0, 8).concat([''], vals.slice(8)) : vals;
  arr.forEach((v, j) => tab.set(r, j + 1, v));
};
const NEWR = '新規 / Mới', FIXR = '修正 / Sửa';
const isDate = (v) => Object.prototype.toString.call(v) === '[object Date]';
const linkAt = (admin) => { const link = admin.getSheetByName('連携'); const h = link.header(); return { link, h, at: (r, name) => link.rows[r - 1][h.indexOf(name)], set: (r, name, v) => link.set(r, h.indexOf(name) + 1, v) }; };

test('転記：入力シートの行が『連携』に追記され、入力日・社内案件名（RIC.34）・区分・社外視点名などが自動で入る', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const tab = inTab(eng);
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

test('15分ごとの自動実行：転記 → 15分たった「未送信」だけ自動登録、「要確認」「更新あり」はチェックしたら登録', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const put = writer(inTab(eng));
  put(3, ['RIC', 34, 'マンション', LINK, NEWR, 'EX1', '', 6, 4, 0, '']);
  put(4, ['REN', 72, '戸建て', '', NEWR, 'EXM1', '', 8, '', '', '']);
  put(5, ['RIC', 34, 'マンション', LINK, NEWR, 'EX1', '', 1, 0, 0, '']);  // 2回目なのに新規 → 要確認
  put(6, ['NEWCO', 1, 'ニュー', '', NEWR, 'IN1', '', 2, 1, 0, '']);        // 会社マスタに後から足す会社
  admin.getSheetByName('会社マスタ').set(19, 1, 'NEWCO'); admin.getSheetByName('会社マスタ').set(19, 2, 'ニューコ');
  const { at, set } = linkAt(admin);

  // 1回目：転記だけ（転記したばかりの行は15分待つ）
  let r = env.g.autoRun();
  assert.ok(r.indexOf('転記 追加4（要確認1）') >= 0, r);
  assert.ok(r.indexOf('自動登録 対象なし') >= 0, r);
  assert.equal(env.fs.tasks().length, 0);
  assert.ok(String(settingsOf(admin)['最後の自動実行']).indexOf('転記 追加4') >= 0);

  // 2回目（15分後）：変わりが無ければ転記は何もしない。未送信の3行を自動登録（要確認は待つ）
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
  // 工程図に登録した行は、入力シートの『制作中』へ移る（要確認の行は『入力前』に残る）
  const doing = eng.getSheetByName('制作中');
  const filled = (tab) => tab.rows.slice(2).filter(x => x.some(v => v !== '' && v !== false && v !== undefined && v !== null)).map(x => x[0] + '.' + x[1] + ' ' + x[5]);
  same(filled(doing), ['RIC.34 EX1', 'REN.72 EXM1', 'NEWCO.1 IN1']);
  same(filled(inTab(eng)), ['RIC.34 EX1'], '2回目なのに新規（要確認）の行は入力前に残る');
  assert.ok(r.indexOf('制作中へ3件') >= 0, r);

  // 要確認の行は、人が「工程図へ」にチェックすると次の自動実行で登録
  set(4, '工程図へ', true);
  env.g.autoRun();
  assert.equal(at(4, '状態'), '登録済み');
  assert.equal(env.fs.tasks().length, 6); // EX1（ホワイト・カラー）＋モデル作成＋NEWCO の IN1（ホワイト・カラー）＋ EX1 2回目のホワイト

  // 登録後にエンジニアが時間を直す → 更新あり（自動では送らない）＋ Discord で確認を頼む → チェックで工程図の時間を更新
  env.props.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1/abc';
  same(filled(inTab(eng)), [], '要確認の行も登録したら制作中へ');
  doing.set(3, 8, 7); // 制作中に移った RIC.34 EX1（1回目）の White躯体
  r = env.g.autoRun();
  assert.equal(at(2, '状態'), '更新あり');
  assert.ok(r.indexOf('登録後の変更 1件を Discord で確認依頼') >= 0, r);
  const cm = env.discord[env.discord.length - 1];
  assert.ok(cm.startsWith('⚠ 工程図に登録した後で'), cm);
  assert.ok(cm.includes('RIC.34 EX1（White 6→7）'), cm);
  const nDiscord = env.discord.length;
  env.g.autoRun();
  assert.equal(env.discord.length, nDiscord, '同じ変更で何度も送らない');
  const white = () => env.fs.tasks().find(t => t.externalId === 'RIC34::EX1::1::white');
  assert.equal(white().hours, 6, 'チェックするまで工程図は変えない');
  set(2, '工程図へ', true);
  env.g.autoRun();
  assert.equal(at(2, '状態'), '登録済み');
  assert.equal(white().hours, 7);
  assert.equal(env.fs.tasks().length, 6, '更新は新しいタスクを作らない');
  // 工程図で RIC.34 EX1（1回目）のタスクがすべて完了 → 『制作済み』へ。2回目（修正）は制作中のまま
  env.fs.tasks().filter(t => String(t.externalId).indexOf('RIC34::EX1::1::') === 0).forEach(t => env.fs.setTask(t.id, { status: 'done' }));
  r = env.g.autoRun();
  assert.ok(r.indexOf('制作済みへ') < 0, '完了は予定のまとめ（アプリが書く）で見る。まとめがまだ古ければ移さない：' + r);
  // アプリが完了を予定のまとめに書く → 次の自動実行で制作済みへ（タスクは読まない）
  const snapDoc = 'workspaces/liebe-asia-team/data/scheduleSnapshot';
  env.fs.docs[snapDoc] = { value: { stringValue: JSON.stringify({ updatedAt: Date.now(), items: { 'RIC34::EX1::1': { s: null, e: null, a: '', st: '完了' }, 'RIC34::EX1::2': { st: '予定' } } }) } };
  const q0 = env.fs.taskReads || 0;
  r = env.g.autoRun();
  assert.ok(r.indexOf('制作済みへ1件') >= 0, r);
  assert.equal(env.fs.taskReads || 0, q0, '完了の確認でタスクを読まない（Firestore の読み取りを使わない）');
  same(filled(eng.getSheetByName('制作済み')), ['RIC.34 EX1']);
  same(filled(doing), ['REN.72 EXM1', 'NEWCO.1 IN1', 'RIC.34 EX1']);
  r = env.g.autoRun();
  assert.ok(r.indexOf('転記 追加0・更新0') >= 0, '移しても取込キー（n回目）は変わらない：' + r);
  assert.equal(at(2, '状態'), '登録済み');
  // 人が『制作済み』から『制作中』へ戻した行は、工程図で完了のままでも自動では制作済みへ戻さない
  const doneTab = eng.getSheetByName('制作済み');
  const dIdx = doneTab.rows.findIndex((v, i) => i >= 2 && v[0] === 'RIC');
  const moved = doneTab.rows[dIdx].slice();
  doing.rows.splice(doing.rows.findIndex((v, i) => i >= 2 && v.every(x => x === '' || x === false)) >= 0 ? doing.rows.findIndex((v, i) => i >= 2 && v.every(x => x === '' || x === false)) : doing.rows.length, 0, moved);
  doneTab.deleteRow(dIdx + 1);
  assert.ok(JSON.parse(env.props.DONE_MOVED_KEYS).includes('RIC34::EX1::1'));
  r = env.g.autoRun();
  assert.ok(r.indexOf('制作済みへ') < 0, '戻した行は移さない：' + r);
  assert.ok(filled(doing).includes('RIC.34 EX1'));

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

test('案件登録 → 入力シートへ写す → 翻訳済み → 2時間で Discord 催促（以降1時間ごと）→ 時間が入ると工程図へ（担当者・納期つき）', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const st = admin.getSheetByName('設定');
  st.set(st.rows.findIndex(x => x[0] === '催促する時間帯（ベトナム時間）') + 1, 2, '0-24'); // テストはいつでも送る
  const reg = admin.getSheetByName('登録一覧');
  const rh = reg.header();
  const R = (r, name) => reg.rows[r - 1][rh.indexOf(name)];
  const setR = (r, name, v) => reg.set(r, rh.indexOf(name) + 1, v);
  ['会社コード', '案件番号', '社外案件名', 'お客様担当者', '新規or修正', '視点', 'パターン', 'サーバーリンク', '納期', '注文書', '管理者メモ'].forEach(h => assert.ok(rh.includes(h), h));
  assert.equal(admin.getSheets()[0].getName(), '案件入力', '案件入力（縦型フォーム）タブが先頭');
  assert.equal(admin.getSheets()[1].getName(), '案件登録', '案件登録タブはその次');
  assert.equal(rh[rh.indexOf('パターン') + 1], '社外視点名', '社外視点名はパターンの右');

  // 管理者が2行登録（2行目は視点が空＝記入中）
  [['RIC', 34, 'マンション', 'Quynh', NEWR, 'EX1', 'A', LINK, '2030-01-20', 'https://drive/order.pdf', '急ぎ']].forEach((vals, i) =>
    ['会社コード', '案件番号', '社外案件名', 'お客様担当者', '新規or修正', '視点', 'パターン', 'サーバーリンク', '納期', '注文書', '管理者メモ'].forEach((h, j) => setR(2 + i, h, vals[j])));
  setR(3, '会社コード', 'REN'); setR(3, '案件番号', 72);
  let msg = env.g.syncRegistrationsNow();
  assert.ok(msg.indexOf('入力シートへ写した 1件') >= 0, msg);
  assert.equal(R(2, '登録No'), 'R0001');
  assert.equal(R(2, '状態'), '翻訳待ち');
  // 社内案件名・合計は式（スクリプトは値を書かない）
  const fOf = (sheet, col) => sheet.formulas.filter(f => f.col === col).map(f => f.f).pop() || '';
  assert.ok(fOf(reg, rh.indexOf('社内案件名') + 1).indexOf('REGEXMATCH') >= 0);
  const cw = rh.indexOf('White') + 1;
  assert.equal(fOf(reg, rh.indexOf('合計') + 1), `=IF(COUNT(RC${cw},RC${cw + 1},RC${cw + 2})=0,"",SUM(RC${cw},RC${cw + 1},RC${cw + 2}))`);
  assert.equal(R(3, '状態'), '記入中');
  assert.equal(R(3, '登録No'), '');
  assert.ok(isDate(R(2, '登録日時')) && isDate(R(3, '登録日時')), '書き始めた行には登録日時が自動で入る');

  // 入力シート：必要な列と登録Noだけ（担当者・納期・注文書・管理者メモは写さない）。後から増えた列は右端に
  const tab = inTab(eng);
  const sh = tab.header(2).map(h => h.split('\n')[0]);
  ['翻訳済み', '翻訳日時', '翻訳メモ', '作業の分け方', '時間入力者', '時間入力日時', '合計', '登録No'].forEach(h => assert.ok(sh.includes(h), h));
  const S = (name) => tab.rows[2][sh.indexOf(name)];
  assert.equal(fOf(tab, sh.indexOf('合計') + 1), '=IF(COUNT(RC8,RC9,RC10,RC11)=0,"",SUM(RC8,RC9,RC10,RC11))', '入力シートの合計も式');
  same([S('会社コード'), S('案件番号'), S('社外案件名'), S('新規or修正'), S('視点'), S('パターン'), S('サーバーリンク'), S('登録No')], ['RIC', 34, 'マンション', NEWR, 'EX1', 'A', LINK, 'R0001']);
  assert.ok(!tab.rows[2].some(v => v === 'Quynh' || v === 'https://drive/order.pdf' || v === '急ぎ'), '管理者だけの情報は写さない');
  assert.equal(tab.rows[2].length, sh.indexOf('納品名') + 1, '写す列と登録No・納品名だけを書く（合計の式などには触らない）');
  assert.equal(S('納品名'), 'マンション_外観目線視点①_パターンA_' + env.g.deliveryYmd_(), '納品名は 社外案件名_社外視点名_今日の日付');
  assert.equal(R(2, '納品名'), 'マンション_外観目線視点①_パターンA_' + env.g.deliveryYmd_());
  assert.equal(tab.rows[2][sh.indexOf('合計')], '', '合計の列は書かない');
  // 時間が空なので転記はまだ（記入途中）
  env.g.transferFromStaffSheet();
  assert.equal(admin.getSheetByName('連携').getLastRow(), 1);

  // 何度動かしても二重に写さない。管理者が視点を直すと入力シートも直る
  env.g.syncRegistrationsNow();
  assert.equal(tab.getLastRow(), 3);
  setR(2, '視点', 'EX2');
  msg = env.g.syncRegistrationsNow();
  assert.ok(msg.indexOf('直した 1件') >= 0, msg);
  assert.equal(S('視点'), 'EX2');
  assert.equal(S('納品名'), 'マンション_外観目線視点②_パターンA_' + env.g.deliveryYmd_(), '自動の納品名は視点を直すと作り直す');

  // 通訳が翻訳済みにチェック → 時間計算待ち（翻訳日時が入る）
  tab.set(3, sh.indexOf('翻訳済み') + 1, true);
  tab.set(3, sh.indexOf('翻訳メモ') + 1, '昼景・植栽多め');
  env.g.syncRegistrationsNow();
  assert.equal(R(2, '状態'), '時間計算待ち');
  assert.equal(R(2, '翻訳済み'), '済');
  assert.equal(R(2, '翻訳メモ'), '昼景・植栽多め');
  assert.ok(isDate(R(2, '翻訳日時')), '翻訳日時（入力シートにも入る）');
  assert.ok(isDate(S('翻訳日時')));
  assert.equal(env.discord.length, 0, 'まだ期限（登録から1時間30分）前');

  // 連絡文の期限を過ぎても時間が空 → Webhook 未設定なら送らずに結果へ書く
  setR(2, '登録日時', new Date(Date.now() - 3 * 86400000)); // 3日前に登録した
  msg = env.g.syncRegistrationsNow();
  assert.ok(msg.indexOf('Webhook が未設定') >= 0, msg);
  assert.throws(() => env.g.saveDiscordWebhook_('https://example.com/x'));
  env.g.saveDiscordWebhook_('https://discord.com/api/webhooks/123/abc-DEF');
  msg = env.g.syncRegistrationsNow();
  assert.ok(msg.indexOf('Discord で催促 1件') >= 0, msg);
  assert.equal(env.discord.length, 1);
  assert.ok(env.discord[0].indexOf('RIC.34 マンション EX2-A（新規） お客様担当 Quynh') >= 0, env.discord[0]);
  assert.ok(env.discord[0].indexOf('期限 ') >= 0 && env.discord[0].indexOf('翻訳待ち') < 0, env.discord[0]);
  assert.equal(R(2, '催促回数'), 1);
  // すぐにはくり返さない。1時間たったらもう一度
  env.g.syncRegistrationsNow();
  assert.equal(env.discord.length, 1);
  setR(2, '最後の催促', new Date(Date.now() - 61 * 60000));
  env.g.syncRegistrationsNow();
  assert.equal(env.discord.length, 2);
  assert.equal(R(2, '催促回数'), 2);

  // エンジニアが時間と作業の分け方を書く → 時間入力済み（合計は入力シートにも入る）→ 転記でお客様担当者・納期が『連携』に入る
  tab.set(3, sh.indexOf('White') + 1, 3);
  tab.set(3, sh.indexOf('Color') + 1, 2.5);
  tab.set(3, sh.indexOf('作業の分け方') + 1, 'White＝躯体2h／家具1h');
  tab.set(3, sh.indexOf('時間入力者') + 1, 'Tú Mĩ');
  env.g.autoRun();
  assert.equal(R(2, '時間入力者'), 'Tú Mĩ');
  assert.ok(isDate(R(2, '時間入力日時')) && isDate(S('時間入力日時')), '時間入力日時が自動で入る');
  assert.equal(R(2, '状態'), '時間入力済み');
  assert.equal(R(2, '作業の分け方'), 'White＝躯体2h／家具1h');
  assert.equal(env.discord.length, 2, '時間が入ったら催促しない');
  const { at } = linkAt(admin);
  assert.equal(at(2, '社内案件名'), 'RIC.34');
  assert.equal(at(2, '担当者'), '', '『登録一覧』のお客様担当者は作業の担当者（エンジニア）に入れない');
  assert.equal(at(2, 'お客様担当者'), 'Quynh', 'お客様担当者に入る');
  assert.equal(at(2, '納期'), '2030-01-20');

  // 納品名は 社外案件名_社外視点名_今日の日付（工程図の書き出しは使わない）
  env.fs.docs['workspaces/liebe-asia-team/data/deliveryNames'] = { value: { stringValue: JSON.stringify({ 'RIC34::EX2-A::1': ['別の名前'] }) } };
  env.g.syncRegistrationsNow();
  assert.equal(R(2, '納品名'), 'マンション_外観目線視点②_パターンA_' + env.g.deliveryYmd_());
  // 日付は毎日その日に作り直す（前の日付のまま残らない）。日付で終わらない名前は人が付けた名前としてそのまま
  tab.set(3, sh.indexOf('納品名') + 1, 'マンション_外観目線視点②_パターンA_261104');
  env.g.syncRegistrationsNow();
  assert.equal(S('納品名'), 'マンション_外観目線視点②_パターンA_' + env.g.deliveryYmd_(), '前の日の日付 → 今日');
  tab.set(3, sh.indexOf('納品名') + 1, 'マンション_最終版');
  env.g.syncRegistrationsNow();
  assert.equal(S('納品名'), 'マンション_最終版');
  assert.equal(R(2, '納品名'), S('納品名'));

  // 入力シートで行が消されたら「入力シートに無い」（勝手に写し直さない）
  tab.rows[2] = [];
  env.g.syncRegistrationsNow();
  assert.equal(R(2, '状態'), '入力シートに無い');
  assert.equal(tab.getLastRow(), 2);
});

test('入力シートを編集した瞬間：翻訳済みのチェックで翻訳日時、時間を書くと時間入力日時が入る', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const tab = inTab(eng);
  const sh = tab.header(2).map(h => h.split('\n')[0]);
  const c = (name) => sh.indexOf(name) + 1;
  const put = writer(tab);
  put(3, ['RIC', 34, 'マンション', LINK, NEWR, 'EX1', '', '', '', '', '']);
  const edit = (r, col, v, nr = 1, nc = 1) => { tab.set(r, col, v); env.g.onStaffEdit({ range: tab.getRange(r, col, nr, nc) }); };
  edit(3, c('翻訳メモ'), 'メモだけ');
  assert.equal(tab.rows[2][c('翻訳日時') - 1] || '', '', '関係ない列の編集では入れない');
  edit(3, c('翻訳済み'), true);
  assert.ok(isDate(tab.rows[2][c('翻訳日時') - 1]));
  edit(3, c('White家具'), 1);
  assert.ok(isDate(tab.rows[2][c('時間入力日時') - 1]), 'White家具 だけでも時間入力日時が入る');
  edit(3, c('White躯体'), 3);
  edit(3, c('Color'), 2);
  assert.ok(isDate(tab.rows[2][c('時間入力日時') - 1]));
  edit(3, c('翻訳済み'), false);
  assert.equal(tab.rows[2][c('翻訳日時') - 1], '', 'チェックを外したら消す');
  // 見出しより上・他のタブの編集は無視
  env.g.onStaffEdit({ range: tab.getRange(1, 1) });
  env.g.onStaffEdit({ range: eng.getSheetByName('記入ルール/説明').getRange(5, 2) });
});

test('連絡文：ひな形から作り、同じ案件・同じ入力日の視点は1通にまとめる／管理者シートに書いたらすぐ入力シートへ写す', () => {
  const r = (o) => ({ code: 'REN', number: 50, name: '戸建て', link: '\\\\CG-SERVER2\\REN.50', cut: 'EX1', pattern: '', request: '新規 / Mới', assignee: 'Quynh', deadline: '2030-01-20', ...o });
  const tpl = '{社内案件名}の資料を共有します。\n{サーバーリンク}\n\n{計算期限}までに制作時間の計算をお願いします。';
  // 登録日時 11/3 14:00 ＋ 75分 → 11/3 15:15（まとめた行のうち一番早い登録日時から）
  const regAt = new Date(2030, 10, 3, 14, 0);
  assert.equal(env0().g.renderRegMessage_(tpl, [r({ regDate: new Date(2030, 10, 3, 14, 30) }), r({ regDate: regAt })], { calcMinutes: 75 }),
    'REN.50の資料を共有します。\n\\\\CG-SERVER2\\REN.50\n\n11/3 15:15までに制作時間の計算をお願いします。');
  assert.equal(env0().g.renderRegMessage_('{登録日時}／{計算期限}', [r({ regDate: regAt })], { calcMinutes: 90 }), '11/3 14:00／11/3 15:30');
  assert.equal(env0().g.renderRegMessage_('[{計算期限}]', [r({})], { calcMinutes: 75 }), '[]', '登録日時が無ければ空');
  assert.equal(env0().g.renderRegMessage_('{社外案件名}：{視点一覧}（{新規or修正}・納期{納期}・{不明}）', [r({}), r({ cut: 'IN2', pattern: 'A' })]), '戸建て：EX1・IN2-A（新規・納期1/20・{不明}）');

  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const reg = admin.getSheetByName('登録一覧');
  const rh = reg.header();
  const setR = (row, name, v) => reg.set(row, rh.indexOf(name) + 1, v);
  const R = (row, name) => reg.rows[row - 1][rh.indexOf(name)];
  const edit = (row) => env.g.onAdminEdit({ range: reg.getRange(row, 1, 1, rh.length) });
  // 記入途中では写さない
  setR(2, '会社コード', 'REN'); setR(2, '案件番号', 50);
  edit(2);
  assert.equal(R(2, '登録No') || '', '');
  // そろった瞬間に写す
  setR(2, '社外案件名', '戸建て'); setR(2, '新規or修正', '新規 / Mới'); setR(2, '視点', 'EX1'); setR(2, 'サーバーリンク', LINK);
  edit(2);
  assert.equal(R(2, '登録No'), 'R0001');
  assert.equal(inTab(eng).rows[2][0], 'REN', '入力シートにすぐ写る');
  // 同じ日に同じ案件の視点をもう1つ → 連絡文は1通にまとまる（ひな形の既定：資料の共有＋1時間後に計算）
  setR(3, '会社コード', 'REN'); setR(3, '案件番号', 50); setR(3, '社外案件名', '戸建て'); setR(3, '新規or修正', '新規 / Mới'); setR(3, '視点', 'IN1'); setR(3, 'サーバーリンク', LINK);
  edit(3);
  // 既定のひな形：登録日時（登録Noが付いた時刻）＋1時間30分（8〜12時・13〜17時だけ数える）を期限として書く
  const rd = R(2, '登録日時');
  assert.ok(isDate(rd));
  const lim = new Date(env.g.addWorkMinutes_(rd, 90, '8-12,13-17').getTime());
  const limText = (lim.getMonth() + 1) + '/' + lim.getDate() + ' ' + lim.getHours() + ':' + String(lim.getMinutes()).padStart(2, '0');
  assert.equal(R(2, '連絡文'), 'REN.50の資料を共有します。\n' + LINK + '\n\n' + limText + 'までに制作時間の計算をお願いします。');
  assert.equal(R(3, '連絡文'), R(2, '連絡文'));
  // 『案件登録』以外のタブの編集では動かない
  env.g.onAdminEdit({ range: admin.getSheetByName('連携').getRange(1, 1) });

  // 通訳へのメッセージ → 入力シートの「管理者からの連絡」と、通訳向け連絡文
  setR(2, '通訳へのメッセージ', '昼景・植栽多めと指示あり');
  setR(2, '今すぐ連携', true); // 手動連携のチェック
  edit(2);
  assert.equal(R(2, '今すぐ連携'), false, '終わるとチェックが外れる');
  const tab = inTab(eng);
  const sh = tab.header(2).map(h => h.split('\n')[0]);
  assert.equal(tab.rows[2][sh.indexOf('管理者からの連絡')], '昼景・植栽多めと指示あり');
  const limI = new Date(env.g.addWorkMinutes_(R(2, '登録日時'), 90, '8-12,13-17').getTime());
  const limIText = (limI.getMonth() + 1) + '/' + limI.getDate() + ' ' + limI.getHours() + ':' + String(limI.getMinutes()).padStart(2, '0');
  assert.equal(R(2, '通訳向け連絡文'), 'REN.50案件の資料を共有しますので、翻訳をお願いします。\n⇩サーバーリンク\n' + LINK + '\n\n制作時間の計算については' + limIText + 'までに記入してください。\n昼景・植栽多めと指示あり');
  assert.ok(!String(R(2, '連絡文')).includes('昼景'), 'エンジニア向けの既定の文には入れない');

  // 『設定』の「今すぐ全部連携」にチェック → 自動実行と同じ処理が動き、チェックが外れる
  const st = admin.getSheetByName('設定');
  const mr = st.rows.findIndex(x => x[0] === '今すぐ全部連携（チェックで実行）') + 1;
  assert.ok(mr > 0, '『設定』に「今すぐ全部連携」がある');
  assert.equal(ruleAt(st, mr, 2).type, 'checkbox');
  const before = settingsOf(admin)['最後の自動実行'];
  st.set(mr, 2, true);
  env.g.onAdminEdit({ range: st.getRange(mr, 2) });
  assert.equal(st.rows[mr - 1][1], false);
  assert.notEqual(settingsOf(admin)['最後の自動実行'], before, '自動実行が動いた');
});

test('催促の時間帯と判定', () => {
  const env = makeEnv({ admin: adminSheet(), files: {} });
  const at = (h, m = 0) => new Date(2030, 0, 7, h, m);
  assert.equal(env.g.inNotifyHours_(at(8), '8-20'), true);
  assert.equal(env.g.inNotifyHours_(at(20), '8-20'), false);
  assert.equal(env.g.inNotifyHours_(at(7, 59), '8:00-20:00'), false);
  assert.equal(env.g.inNotifyHours_(at(23), '22-6'), true);
  assert.equal(env.g.inNotifyHours_(at(3), ''), true);
  // 曜日ごと（2030-01-07 は月曜・01-12 は土曜・01-13 は日曜）
  const W = '8-18 / 土 8-13 / 日 なし';
  const day = (d, h, m = 0) => new Date(2030, 0, d, h, m);
  assert.equal(env.g.inNotifyHours_(day(7, 17, 59), W), true, '月曜 17:59');
  assert.equal(env.g.inNotifyHours_(day(7, 18), W), false, '月曜 18:00');
  assert.equal(env.g.inNotifyHours_(day(12, 12, 59), W), true, '土曜 12:59');
  assert.equal(env.g.inNotifyHours_(day(12, 13), W), false, '土曜 13:00');
  assert.equal(env.g.inNotifyHours_(day(12, 7, 59), W), false, '土曜 7:59');
  assert.equal(env.g.inNotifyHours_(day(13, 10), W), false, '日曜は送らない');
  assert.equal(env.g.inNotifyHours_(day(13, 10), '平日 8-18'), true, '書いていない曜日は止めない');
  assert.equal(env.g.inNotifyHours_(day(13, 10), '8-18／土日 なし'), false, '「土日」まとめ・全角の区切り');
  assert.equal(env.g.inNotifyHours_(day(9, 10), '8-18／土日 なし'), true);
  assert.equal(env.g.readSettings_().notifyHours !== undefined, true);
  const vn = (h, m = 0) => new Date(Date.UTC(2030, 0, 7, h - 7, m)); // ベトナム時間
  // 期限＝登録 10:00＋90分（8-12,13-17 だけ数える）＝ 11:30。昼休みをまたぐと延びる
  const cfg = { notifyFirst: 2, notifyRepeat: 1, calcMinutes: 90, calcHours: '8-12,13-17' };
  const now = vn(12);
  const base = { state: env.g.REG_STATE.ESTIMATE, regDate: vn(10), translatedAt: vn(10, 20) };
  assert.equal(env.g.calcDeadlineOf_(base, cfg).getTime(), vn(11, 30).getTime());
  assert.equal(env.g.isReminderDue_(base, now, cfg), true);
  assert.equal(env.g.isReminderDue_(base, vn(11, 29), cfg), false, '期限の前は送らない');
  assert.equal(env.g.isReminderDue_({ ...base, regDate: vn(11) }, vn(13, 10), cfg), false, '昼休みは数えない（期限 13:30）');
  assert.equal(env.g.isReminderDue_({ ...base, regDate: vn(11) }, vn(13, 30), cfg), true);
  assert.equal(env.g.isReminderDue_({ ...base, state: env.g.REG_STATE.TRANSLATE }, now, cfg), true, '翻訳待ちのままでも期限を過ぎたら知らせる');
  assert.equal(env.g.isReminderDue_({ ...base, notifiedAt: vn(11, 40) }, now, cfg), false);
  assert.equal(env.g.isReminderDue_({ ...base, notifiedAt: vn(11, 0) }, now, cfg), true, '期限より前の催促は数えない');
  assert.equal(env.g.isReminderDue_({ ...base, notifiedAt: vn(11, 30) }, vn(12, 30), cfg), true, '1時間ごと');
  assert.equal(env.g.isReminderDue_({ state: env.g.REG_STATE.ESTIMATE, translatedAt: vn(9, 30) }, now, cfg), true, '登録日時が無い行は翻訳済みから2時間');
  assert.equal(env.g.isReminderDue_({ ...base, state: env.g.REG_STATE.DONE }, now, cfg), false);
});

// 連絡文ダイアログ：ダイアログ内のスクリプトを偽のブラウザで動かす
async function runDialog(env, { execOk, execThrows, clipboard, click = true }) {
  const shown = {}; const listeners = []; const picked = [];
  const ta = (id) => ({ id, value: id + 'の文', focus() {}, select() { picked.push(id); }, setSelectionRange() {} });
  const els = { eng: ta('eng'), int: ta('int') };
  const btn = (act, id) => ({ getAttribute: (k) => (k === 'data-act' ? act : id), addEventListener: (ev, fn) => listeners.push({ act, id, fn }) });
  const doc = {
    getElementById: (id) => els[id] || (id.endsWith('m') ? { set textContent(v) { shown[id.slice(0, -1)] = v; } } : null),
    querySelectorAll: () => [btn('copy', 'eng'), btn('copy', 'int')],
    execCommand: () => { if (execThrows) throw new Error('blocked'); return execOk; },
  };
  const nav = clipboard === 'none' ? {} : { clipboard: { writeText: () => (clipboard === 'ok' ? Promise.resolve() : Promise.reject(new Error('NotAllowedError'))) } };
  const c = vm.createContext({ document: doc, navigator: nav });
  vm.runInContext(env.g.REG_DIALOG_SCRIPT, c);
  const atOpen = { msg: shown.eng, picked: picked.slice(), listeners: listeners.length };
  if (click) listeners.find(l => l.id === 'eng').fn();
  await new Promise(r => setTimeout(r, 0));
  return { atOpen, after: shown.eng };
}
await (async () => {
  const env = env0();
  const NG = env.g.REG_DIALOG_COPY_FAIL;
  const open = await runDialog(env, { click: false, clipboard: 'none' });
  assert.equal(open.atOpen.msg, env.g.REG_DIALOG_READY, '開いた時点で ⌘C の案内');
  same(open.atOpen.picked, ['eng'], '開いた時点でエンジニア向けの文を選んでおく');
  assert.equal(open.atOpen.listeners, 2, 'ボタンはスクリプトから付ける（onclick 属性に頼らない）');
  assert.equal((await runDialog(env, { execOk: true, clipboard: 'none' })).after, 'コピーしました', 'clipboard が無くても execCommand でコピー');
  assert.equal((await runDialog(env, { execOk: false, clipboard: 'ok' })).after, 'コピーしました', 'execCommand がだめなら clipboard API');
  assert.equal((await runDialog(env, { execOk: false, clipboard: 'deny' })).after, NG, '両方だめなら ⌘C を案内');
  assert.equal((await runDialog(env, { execThrows: true, clipboard: 'none' })).after, NG, '例外でも案内が出る');
})();
test('連絡文の画面：開いたら文を選んでおき、コピーは clipboard が無くても・拒否されても黙って止まらない', () => {});

test('『登録一覧』の「コピー」列：チェックするとその案件（同じ登録日の視点をまとめて）の連絡文の画面が開き、チェックは外れる（連携は動かさない）', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const reg = admin.getSheetByName('登録一覧');
  const rh = reg.header();
  const ci = rh.indexOf('コピー') + 1;
  assert.ok(ci > 0, '「コピー」列がある');
  assert.equal(ci, 5, 'E列（登録日時のすぐ右）');
  assert.equal(ruleAt(reg, 2, ci).type, 'checkbox');
  const setR = (row, name, v) => reg.set(row, rh.indexOf(name) + 1, v);
  setR(2, '会社コード', 'REN'); setR(2, '案件番号', 50); setR(2, '社外案件名', '戸建て'); setR(2, '新規or修正', '新規 / Mới'); setR(2, '視点', 'EX1'); setR(2, 'サーバーリンク', LINK);
  env.g.onAdminEdit({ range: reg.getRange(2, 1, 1, rh.length) });
  const copiedBefore = inTab(eng).rows.length;
  setR(2, 'コピー', true);
  env.g.onAdminEdit({ range: reg.getRange(2, ci) });
  assert.equal(reg.rows[1][ci - 1], false, 'チェックは外れる');
  assert.equal(env.dialogs.length, 1, '画面が1つ開く');
  assert.equal(env.dialogs[0].title, '連絡文');
  assert.ok(env.dialogs[0].html.includes('REN.50の資料を共有します。'), 'その行の連絡文');
  assert.ok(env.dialogs[0].html.includes('data-act="copy"') && !env.dialogs[0].html.includes('onclick='), 'ボタンは onclick 属性を使わない');
  assert.equal(inTab(eng).rows.length, copiedBefore, '入力シートには何も書かない');
  // 同じ案件の2つ目の視点（R0002）と、別の案件（R0003）
  setR(3, '会社コード', 'REN'); setR(3, '案件番号', 50); setR(3, '社外案件名', '戸建て'); setR(3, '新規or修正', '新規 / Mới'); setR(3, '視点', 'IN1'); setR(3, 'サーバーリンク', LINK);
  env.g.onAdminEdit({ range: reg.getRange(3, 1, 1, rh.length) });
  setR(4, '会社コード', 'RIC'); setR(4, '案件番号', 34); setR(4, '社外案件名', 'マンション'); setR(4, '新規or修正', '新規 / Mới'); setR(4, '視点', 'EX2'); setR(4, 'サーバーリンク', LINK);
  env.g.onAdminEdit({ range: reg.getRange(4, 1, 1, rh.length) });
  same([2, 3, 4].map(r => reg.rows[r - 1][rh.indexOf('登録No')]), ['R0001', 'R0002', 'R0003']);
  // R0001 にチェック → 同じ案件・同じ登録日の EX1・IN1 が1通に。別の案件（RIC.34）は入らない
  setR(2, 'コピー', true);
  env.g.onAdminEdit({ range: reg.getRange(2, ci) });
  const html2 = env.dialogs[env.dialogs.length - 1].html;
  assert.equal((html2.match(/REN\.50案件の資料/g) || []).length, 1, '同じ案件の視点をまとめて通訳向けも1通');
  assert.ok(!html2.includes('RIC.34の資料') && !html2.includes('マンション') && !html2.includes('EX2'), '別の案件は入れない');
  assert.equal((html2.match(/REN\.50の資料を共有します。/g) || []).length, 1, 'エンジニア向けは1通');
  // R0002（2つ目の視点）にチェックしても同じ1通
  setR(3, 'コピー', true);
  env.g.onAdminEdit({ range: reg.getRange(3, ci) });
  assert.equal(env.dialogs[env.dialogs.length - 1].html, html2);
  // メニュー（選んだ行だけ）は従来どおり：R0003 だけ選べば RIC.34 だけ
  const nDialogs = env.dialogs.length;
  // 記入途中の行にチェック → 画面は出さず案内だけ
  setR(5, '会社コード', 'REN'); setR(5, 'コピー', true);
  env.g.onAdminEdit({ range: reg.getRange(5, ci) });
  assert.equal(reg.rows[4][ci - 1], false);
  assert.equal(env.dialogs.length, nDialogs);
  assert.ok(env.alerts.some(a => a.includes('そろった行がありません')), env.alerts.join('/'));
});

test('『案件登録』は入力専用：「登録」にチェックした行だけ登録No を付けて『登録一覧』と入力シートへ移し、残りは上に詰める', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  assert.equal(admin.getSheets()[1].getName(), '案件登録', '入力タブは縦型フォームの次');
  assert.equal(admin.getSheets()[2].getName(), '登録一覧');
  const ent = admin.getSheetByName('案件登録');
  const eh = ent.header();
  same(eh.slice(0, 6), ['登録', '状態', '会社コード', '案件番号', '枝番', '社外案件名']);
  assert.ok(eh.indexOf('登録No') < 0, '入力タブに登録No は無い');
  assert.equal(ruleAt(ent, 2, 1).type, 'checkbox');
  const E = (row, name, v) => ent.set(row, eh.indexOf(name) + 1, v);
  const EV = (row, name) => (ent.rows[row - 1] || [])[eh.indexOf(name)];
  const edit = (row, name) => env.g.onAdminEdit({ range: ent.getRange(row, eh.indexOf(name) + 1) });
  const fill = (row, cut, pattern) => { E(row, '会社コード', 'REN'); E(row, '案件番号', 50); E(row, '社外案件名', 'マンション'); E(row, 'お客様担当者', '武田'); E(row, '新規or修正', '新規 / Mới'); E(row, '視点', cut); E(row, 'パターン', pattern); E(row, 'サーバーリンク', LINK); };
  const staffRows = () => inTab(eng).rows.slice(2).filter(r => r.some(v => v !== '' && v !== false && v !== undefined)).length;
  const before = staffRows();
  // 書き終えただけでは送らない（状態だけ「登録できます」）
  fill(2, 'EX1', 'A'); edit(2, '視点');
  assert.equal(EV(2, '状態'), '登録できます');
  assert.equal(staffRows(), before, 'チェックするまでエンジニアには届かない');
  fill(3, 'EX2', 'B');
  E(4, '会社コード', 'REN'); E(4, '案件番号', 50); E(4, '新規or修正', '新規 / Mới'); // 視点が空
  // 足りない行にチェック → 移さずチェックを外し、足りない項目を出す
  E(4, '登録', true); edit(4, '登録');
  assert.equal(EV(4, '登録'), false);
  assert.equal(EV(4, '状態'), '記入中（視点が空）');
  // 2行にチェック → 『登録一覧』へ移り、登録No が付いて入力シートに載る。残った行は2行目へ詰まる
  E(2, '登録', true); E(3, '登録', true); edit(2, '登録');
  const reg = admin.getSheetByName('登録一覧');
  const rh = reg.header();
  const R = (row, name) => reg.rows[row - 1][rh.indexOf(name)];
  same([R(2, '登録No'), R(2, '視点'), R(2, 'パターン'), R(2, 'お客様担当者')], ['R0001', 'EX1', 'A', '武田']);
  same([R(3, '登録No'), R(3, '視点')], ['R0002', 'EX2']);
  assert.equal(R(2, '状態'), '翻訳待ち');
  assert.equal(staffRows(), before + 2, '入力シートに2行');
  assert.equal(EV(2, '視点') || '', '', '残った行（視点が空）が2行目へ');
  assert.equal(EV(2, '会社コード'), 'REN');
  assert.equal(EV(2, '状態'), '記入中（視点が空）');
  assert.equal(EV(3, '会社コード') || '', '', '3行目は空になる');
  assert.equal(EV(2, '登録'), false);
  assert.ok(String(R(2, '通訳向け連絡文')).includes('REN.50案件の資料を共有しますので') && R(3, '通訳向け連絡文') === R(2, '通訳向け連絡文'), '同じ案件・同じ日の視点は1通');
  // もう一度チェックしても二重に登録しない
  env.g.autoRun();
  assert.equal(staffRows(), before + 2);
  assert.equal(reg.rows.filter(r => /^R\d{4}$/.test(r[rh.indexOf('登録No')] || '')).length, 2);
  // Discord の確認文（純ロジック）
  assert.ok(env.g.changedMessage_(['REN.50 EX1-A（White 2→3）']).includes('・REN.50 EX1-A（White 2→3）'));
});

test('移行：前の『案件登録』（登録No の列あり）はそのまま『登録一覧』になり、新しい入力専用の『案件登録』ができる', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  // 前の形に戻す：『登録一覧』を『案件登録』という名前に、入力専用タブは消す
  admin.sheets = admin.sheets.filter(s => s.getName() !== '案件登録');
  const old = admin.getSheetByName('登録一覧'); old.setName('案件登録');
  const oh = old.header();
  old.set(2, oh.indexOf('登録No') + 1, 'R0007'); old.set(2, oh.indexOf('会社コード') + 1, 'REN'); old.set(2, oh.indexOf('視点') + 1, 'EX1');
  env.g.quickSetup();
  const reg = admin.getSheetByName('登録一覧');
  assert.ok(reg, '『登録一覧』ができた');
  assert.equal(reg.rows[1][reg.header().indexOf('登録No')], 'R0007', '前の行がそのまま残る');
  const ent = admin.getSheetByName('案件登録');
  assert.equal(ent.header()[0], '登録', '新しい『案件登録』は入力専用');
  assert.equal(admin.getSheets()[0].getName(), '案件登録');
});

test('入力画面（縦型・1案件ずつ）：足りない項目を知らせ、視点とパターンをボタンでまとめて選んで「登録」すると視点ごとに『登録一覧』へ書いてすぐ登録No を付け、入力シートへ写す', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const base = { code: 'REN', number: '50', name: 'マンション', assignee: '武田', link: LINK, deadline: '2030-11-10', order: '', memo: '', toInterp: '昼景で' };
  // 足りない・おかしい入力
  assert.ok(env.g.entryFormRows_({ ...base, code: '', views: [] }).error.includes('会社コード・視点（1つ以上）'));
  assert.ok(env.g.entryFormRows_({ ...base, number: '5a', views: [{ cut: 'EX1', request: '新規 / Mới' }] }).error.includes('数字だけ'));
  assert.ok(env.g.entryFormRows_({ ...base, views: [{ cut: 'EX1', pattern: '', request: '' }] }).error.includes('1行目の新規or修正'));
  assert.ok(env.g.entryFormRows_({ ...base, views: [{ cut: 'EX1', pattern: 'A', request: '新規 / Mới' }, { cut: 'ex1', pattern: 'a', request: '新規 / Mới' }] }).error.includes('同じ視点が2回'));
  const ok = env.g.entryFormRows_({ ...base, views: [{ cut: 'EX1', pattern: 'A', request: '新規 / Mới' }, { cut: '', pattern: '', request: '新規 / Mới' }] });
  assert.equal(ok.rows.length, 1, '視点もパターンも空の行は無視');
  assert.equal(ok.rows[0].number, 50);
  assert.ok(ok.rows[0].deadline instanceof Date || Object.prototype.toString.call(ok.rows[0].deadline) === '[object Date]');
  // 登録
  const staffRows = () => inTab(eng).rows.slice(2).filter(r => r.some(v => v !== '' && v !== false && v !== undefined)).length;
  const before = staffRows();
  const res = env.g.submitEntryForm({ ...base, views: [{ cut: 'EX1', pattern: 'A', request: '新規 / Mới' }, { cut: 'EX2', pattern: 'B', request: '新規 / Mới' }] });
  assert.equal(res.ok, true, res.msg);
  same(res.nos, ['R0001', 'R0002']);
  assert.ok(res.msg.startsWith('登録しました：R0001・R0002（REN.50）'), res.msg);
  const reg = admin.getSheetByName('登録一覧');
  const rh = reg.header();
  const R = (row, name) => reg.rows[row - 1][rh.indexOf(name)];
  same([R(2, '視点'), R(2, 'パターン'), R(2, 'お客様担当者'), R(2, '通訳へのメッセージ'), R(2, '状態')], ['EX1', 'A', '武田', '昼景で', '翻訳待ち']);
  same([R(3, '視点'), R(3, 'パターン')], ['EX2', 'B']);
  assert.equal(staffRows(), before + 2, '入力シートに2行');
  assert.ok(String(R(2, '通訳向け連絡文')).startsWith('REN.50案件の資料を共有しますので、翻訳をお願いします。') && String(R(2, '通訳向け連絡文')).endsWith('昼景で'), R(2, '通訳向け連絡文'));
  // 次の登録は続きの番号
  const res2 = env.g.submitEntryForm({ ...base, number: '51', views: [{ cut: 'IN1', pattern: '', request: '新規 / Mới' }] });
  same(res2.nos, ['R0003']);
  // 足りないときは書かない
  const res3 = env.g.submitEntryForm({ ...base, views: [] });
  assert.equal(res3.ok, false);
  assert.equal(staffRows(), before + 3);
  // 画面の HTML：ボタンは onclick を使わず、中のスクリプトは文法エラーなし
  const html = env.g.entryFormHtml_({ codes: ['REN', 'RIC'], cuts: ['EX1', 'EX2'], patterns: ['A', 'B'], requests: ['新規 / Mới', '修正 / Sửa'] });
  assert.ok(!html.includes('onclick='), 'onclick 属性を使わない');
  assert.ok(html.indexOf('<label for="code">会社コード') < html.indexOf('<label for="number">案件番号'), '項目は縦に並ぶ');
  const script = html.split('<script>')[1].split('</script>')[0];
  new vm.Script(script); // 文法エラーなら例外
  // 偽のブラウザで、視点の番号・パターンを押してから「この案件を登録」を押す
  assert.ok(html.indexOf('<label for="req">新規or修正') < html.indexOf('<h3>視点'), '新規or修正は案件で1つ');
  let sent = null; let onClick = null;
  const el = (id) => ({ id, value: id === 'code' ? 'REN' : id === 'number' ? '52' : id === 'req' ? '修正 / Sửa' : '', className: '', textContent: '', innerHTML: '', disabled: false });
  const els = {}; ['code', 'number', 'name', 'assignee', 'link', 'deadline', 'order', 'memo', 'toInterp', 'req', 'picker', 'chosen', 'sum', 'go', 'msg'].forEach(id => { els[id] = el(id); });
  const doc = { getElementById: (id) => els[id], addEventListener(ev, fn) { if (ev === 'click') onClick = fn; } };
  const gsr = { withSuccessHandler(f) { this.ok = f; return this; }, withFailureHandler(f) { this.ng = f; return this; }, submitEntryForm(p) { sent = p; this.ok({ ok: true, msg: '登録しました' }); } };
  vm.runInContext(script, vm.createContext({ document: doc, google: { script: { run: gsr } } }));
  const click = (attrs, id) => onClick({ target: { id: id || '', getAttribute: (n) => (attrs[n] === undefined ? null : attrs[n]) } });
  assert.ok(els.picker.innerHTML.includes("data-cut='EX1'") && els.picker.innerHTML.includes("data-cut='EX2'"), els.picker.innerHTML.slice(0, 120));
  assert.ok(els.sum.textContent.startsWith('視点を選んでください'));
  click({}, 'go');
  assert.equal(sent, null, '視点が無いと送らない');
  assert.ok(els.msg.textContent.includes('1つ以上'));
  click({ 'data-cut': 'EX1' }); click({ 'data-cut': 'EX2' });
  assert.ok(els.picker.innerHTML.includes("class='b on' data-cut='EX1'"), '選んだ番号は色が付く');
  assert.equal(els.sum.textContent, '登録する視点：EX1・EX2（2件）');
  click({ 'data-for': 'EX1', 'data-pat': 'B' }); click({ 'data-for': 'EX1', 'data-pat': 'A' });
  assert.equal(els.sum.textContent, '登録する視点：EX1-A・EX1-B・EX2（3件）', 'パターンは A→B の順に並ぶ');
  click({ 'data-for': 'EX2', 'data-pat': 'A' }); click({ 'data-for': 'EX2', 'data-pat': '' });
  assert.equal(els.sum.textContent, '登録する視点：EX1-A・EX1-B・EX2（3件）', '「なし」を押すとパターンが外れる');
  click({ 'data-cut': 'EX2' });
  assert.equal(els.sum.textContent, '登録する視点：EX1-A・EX1-B（2件）', 'もう一度押すと外れる');
  click({ 'data-cut': 'EX2' });
  click({}, 'go');
  assert.equal(sent.code, 'REN'); assert.equal(sent.number, '52');
  same(sent.views, [{ cut: 'EX1', pattern: 'A', request: '修正 / Sửa' }, { cut: 'EX1', pattern: 'B', request: '修正 / Sửa' }, { cut: 'EX2', pattern: '', request: '修正 / Sửa' }]);
  assert.equal(els.msg.textContent, '登録しました');
  assert.ok(els.sum.textContent.startsWith('視点を選んでください'), '登録したら選んだ視点は空に戻る');
  // 送った内容はそのままサーバー側で3行になる
  assert.equal(env.g.entryFormRows_({ ...sent, number: '53' }).rows.length, 3);
});

test('『案件入力』タブ（縦型フォーム）：①日本語の区分で視点にチェック→②視点ごとに部屋名・＋でパターン→「登録」で通訳へのメッセージの画面→登録／前回の視点を呼び出す', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const f = admin.getSheetByName('案件入力');
  assert.ok(f, '『案件入力』タブができる');
  assert.equal(admin.getSheets()[0].getName(), '案件入力');
  const m = JSON.parse(JSON.stringify(env.g.formMap_(f)));
  const LC = JSON.parse(JSON.stringify(env.g.FORM_LC)); const KEY = env.g.FORM_KEY_COL;
  const cell = (r, c) => (f.rows[r - 1] || [])[c - 1];
  assert.ok(!('toInterp' in m.fields) || !m.fields.toInterp, '通訳へのメッセージの欄は無い（登録のときに画面で書く）');
  assert.ok(m.fields.code < m.pick && m.pick < m.sum && m.sum < m.submit && m.submit < m.list, '上から 項目→①→登録→② の順');
  same(m.grid.map(g => g.keyword).slice(0, 3), ['EX', 'IN', 'EXCB']);
  same(m.grid.slice(0, 3).map(g => cell(g.row, 1)), ['外観目線', '内観目線', '外観鳥瞰'], '①は日本語（区分）');
  assert.ok((f.hidden || []).includes(KEY), '視点コードの列は隠す');
  const edit = (r, c, v) => { f.set(r, c, v); env.g.onAdminEdit({ range: f.getRange(r, c), source: admin }); };
  const list = () => { const out = []; for (let r = m.list1; r <= m.list2; r++) if (cell(r, KEY)) out.push({ r, label: cell(r, 1), code: cell(r, KEY), room: cell(r, LC.room) || '', pattern: cell(r, LC.pattern) || '', ext: cell(r, LC.ext) }); return out; };
  const brief = () => list().map(x => x.code + (x.room ? '_' + x.room : '') + (x.pattern ? '-' + x.pattern : '') + ':' + x.ext);
  const ex = m.grid.find(g => g.keyword === 'EX').row, inn = m.grid.find(g => g.keyword === 'IN').row;
  edit(ex, 2, true); edit(ex, 3, true); edit(inn, 4, true);
  same(brief(), ['EX1:外観目線視点①', 'EX2:外観目線視点②', 'IN3:内観目線視点③']);
  assert.equal(list()[0].label, '外観目線①', '②も日本語');
  assert.equal(cell(m.sum, 2), '外観目線①・外観目線②・内観目線③（3件）');
  // EX1 に ＋：パターンなし → A・B。もう一度 ＋ で C
  const rowOf = (code, room, p) => list().find(x => x.code === code && x.room === room && x.pattern === p).r;
  edit(rowOf('EX1', '', ''), LC.plus, true);
  same(brief().slice(0, 2), ['EX1-A:外観目線視点①_パターンA', 'EX1-B:外観目線視点①_パターンB']);
  edit(rowOf('EX1', '', 'B'), LC.plus, true);
  same(brief().slice(0, 3), ['EX1-A:外観目線視点①_パターンA', 'EX1-B:外観目線視点①_パターンB', 'EX1-C:外観目線視点①_パターンC']);
  assert.equal(cell(rowOf('EX1', '', 'C'), LC.plus), false, '＋のチェックは外れる');
  // 外す
  edit(rowOf('EX1', '', 'C'), LC.del, true);
  assert.equal(list().filter(x => x.code === 'EX1').length, 2);
  // 部屋名：EX2 に「2F,3F」→ 部屋ごとの行。社外視点名の頭に部屋名
  edit(rowOf('EX2', '', ''), LC.room, '2F,3F');
  same(brief().filter(x => x.startsWith('EX2')), ['EX2_2F:2F外観目線視点②', 'EX2_3F:3F外観目線視点②']);
  // 社外視点名を書き換え（パターンを変えても残る）
  edit(rowOf('EX1', '', 'A'), LC.ext, '南東外観');
  // ① に EX3 を足しても、直した行はそのまま
  edit(ex, 4, true);
  same(brief(), ['EX1-A:南東外観', 'EX1-B:外観目線視点①_パターンB', 'EX2_2F:2F外観目線視点②', 'EX2_3F:3F外観目線視点②', 'EX3:外観目線視点③', 'IN3:内観目線視点③']);
  edit(ex, 4, false);
  assert.equal(list().length, 5);
  assert.equal(cell(m.sum, 2), '外観目線①-A・外観目線①-B・2F 外観目線②・3F 外観目線②・内観目線③（5件）');
  // 足りない（会社コードが空）→ 画面は出さずに結果へ
  env.dialogs.length = 0;
  edit(m.submit, 2, true);
  assert.ok(String(cell(m.result, 2)).startsWith('✗ 足りない項目があります：会社コード'), cell(m.result, 2));
  assert.equal(env.dialogs.length, 0);
  assert.equal(cell(m.submit, 2), false, '登録のチェックは外れる');
  // そろえて「登録」→ 通訳へのメッセージの画面
  f.set(m.fields.code, 2, 'REN'); f.set(m.fields.number, 2, 60); f.set(m.fields.name, 2, '戸建'); f.set(m.fields.link, 2, LINK); f.set(m.fields.assignee, 2, '田中');
  f.set(m.fields.deadline, 2, new Date(2030, 10, 20));
  edit(m.submit, 2, true);
  assert.equal(env.dialogs.length, 1, '確認の画面が出る');
  const html = String(env.dialogs[0].html || env.dialogs[0]);
  assert.ok(html.includes('通訳へのメッセージ') && html.includes('2F 外観目線②（EX2_2F）'), html.slice(0, 300));
  assert.ok(!html.includes('onclick='));
  new vm.Script(html.split('<script>')[1].split('</script>')[0]);
  assert.ok(html.includes('REN.60案件の資料を共有しますので、翻訳をお願いします。'), '確認画面に通訳への連絡文（ひな形から）');
  assert.ok(!html.split('<script>')[1].includes('\\'), '画面のスクリプトにバックスラッシュが無い（文字列のまま送るため）');
  assert.equal(list().length, 5, '画面で「登録する」を押すまでは登録しない');
  const res = env.g.submitFormSheet('昼景でお願いします');
  assert.equal(res.ok, true, res.msg);
  assert.ok(String(res.interp).startsWith('REN.60案件の資料を共有しますので') && String(res.interp).endsWith('昼景でお願いします'), '登録後に通訳への連絡文を返す（画面でコピー）');
  assert.ok(String(cell(m.result, 2)).startsWith('✓ 登録しました：R0001・R0002・R0003・R0004・R0005（REN.60）'), cell(m.result, 2));
  const reg = admin.getSheetByName('登録一覧');
  const rh = reg.header();
  const R = (row, name) => reg.rows[row - 1][rh.indexOf(name)];
  same([R(2, '視点'), R(2, 'パターン'), R(2, '社外視点名'), R(2, '新規or修正'), R(2, '通訳へのメッセージ')], ['EX1', 'A', '南東外観', '新規 / Mới', '昼景でお願いします']);
  same([R(4, '視点'), R(4, 'パターン'), R(4, '社外視点名')], ['EX2_2F', '', '2F外観目線視点②']);
  const staff = inTab(eng);
  assert.ok(staff.rows.some(r => r.includes('EX2_2F')), 'エンジニア入力シートの視点は EX2_2F（コード）');
  assert.equal(env.g.readRegInfo_(admin).get('R0001').extName, '南東外観', '転記のとき『連携』の社外視点名に入る');
  assert.equal(list().length, 0, '登録したらフォームは空に戻る');
  assert.equal(cell(m.fields.code, 2), '');
  assert.equal(cell(ex, 2), false, '①のチェックも外れる');
  // 前回の視点を呼び出す
  edit(m.prev, 2, true);
  assert.ok(String(cell(m.result, 2)).includes('会社コードと案件番号'));
  f.set(m.fields.code, 2, 'REN'); f.set(m.fields.number, 2, 60);
  edit(m.prev, 2, true);
  same(brief(), ['EX1-A:南東外観', 'EX1-B:外観目線視点①_パターンB', 'EX2_2F:2F外観目線視点②', 'EX2_3F:3F外観目線視点②', 'IN3:内観目線視点③']);
  assert.equal(cell(m.fields.request, 2), '修正 / Sửa', '新規or修正は修正に');
  assert.equal(cell(m.fields.name, 2), '戸建', '社外案件名も前回から');
  assert.equal(cell(ex, 2), true, '①にもチェックが入る');
  assert.equal(cell(m.prev, 2), false);
  // 会社コード・案件番号を入れると、過去に登録した案件なら社外案件名・担当者が自動で入る（入っている欄はそのまま）
  f.set(m.fields.name, 2, ''); f.set(m.fields.assignee, 2, ''); f.set(m.fields.code, 2, ''); f.set(m.fields.number, 2, '');
  edit(m.fields.code, 2, 'ren');
  assert.equal(cell(m.fields.name, 2), '', '案件番号がまだ無いときは入れない');
  edit(m.fields.number, 2, 60);
  same([cell(m.fields.name, 2), cell(m.fields.assignee, 2)], ['戸建', '田中']);
  assert.ok(String(cell(m.result, 2)).includes('過去に登録した案件（REN.60）'), cell(m.result, 2));
  f.set(m.fields.name, 2, '別の名前'); f.set(m.fields.assignee, 2, '');
  edit(m.fields.number, 2, 60);
  same([cell(m.fields.name, 2), cell(m.fields.assignee, 2)], ['別の名前', '田中'], '入っている社外案件名は上書きしない');
  f.set(m.fields.name, 2, ''); f.set(m.fields.assignee, 2, '');
  edit(m.fields.number, 2, 99);
  same([cell(m.fields.name, 2), cell(m.fields.assignee, 2)], ['', ''], '登録したことの無い案件は何も入れない');
});

test('『案件入力』：登録Noで呼び出して直す → 『登録一覧』を上書き・足した視点は新しく登録・エンジニア入力シートも直る', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const f = admin.getSheetByName('案件入力');
  const m = JSON.parse(JSON.stringify(env.g.formMap_(f)));
  const LC = JSON.parse(JSON.stringify(env.g.FORM_LC)); const KEY = env.g.FORM_KEY_COL; const NO = env.g.FORM_NO_COL;
  const cell = (r, c) => (f.rows[r - 1] || [])[c - 1];
  assert.ok(m.edit && m.prev < m.edit && m.edit < m.pick, '「登録Noで直す」の行は「前回の視点を呼び出す」と①の間');
  assert.ok((f.hidden || []).includes(NO), '登録Noの列は隠す');
  const edit = (r, c, v) => { f.set(r, c, v); env.g.onAdminEdit({ range: f.getRange(r, c), source: admin }); };
  const list = () => { const out = []; for (let r = m.list1; r <= m.list2; r++) if (cell(r, KEY)) out.push({ r, code: cell(r, KEY), pattern: cell(r, LC.pattern) || '', no: cell(r, NO) || '' }); return out; };
  const ex = m.grid.find(g => g.keyword === 'EX').row, inn = m.grid.find(g => g.keyword === 'IN').row;
  // まず普通に登録（R0001・R0002）
  f.set(m.fields.code, 2, 'REN'); f.set(m.fields.number, 2, 70); f.set(m.fields.name, 2, '戸建'); f.set(m.fields.link, 2, LINK);
  f.set(m.fields.assignee, 2, 'Quynh');
  edit(ex, 2, true); edit(ex, 3, true);
  const r1 = env.g.submitFormSheet('昼景で');
  assert.equal(r1.ok, true, r1.msg);
  assert.equal(list().length, 0);
  const reg = admin.getSheetByName('登録一覧');
  const rh = reg.header();
  const R = (no, name) => { const row = reg.rows.find(x => x[rh.indexOf('登録No')] === no); return row ? row[rh.indexOf(name)] : undefined; };
  const staff = inTab(eng);
  const sh = staff.header(2).map(h => String(h).split('\n')[0]);
  const S = (no, name) => { const row = staff.rows.find(x => x.includes(no)); return row ? row[sh.indexOf(name)] : undefined; };
  assert.equal(S('R0002', '社外案件名'), '戸建');
  // 登録No を書き方違いで入れて呼び出す（同じ日に登録した2件が入る）
  edit(m.edit, 2, 'r1');
  assert.equal(cell(m.edit, 2), 'R0001', '登録Noの書き方をそろえる');
  same(list().map(x => x.code + ':' + x.no), ['EX1:R0001', 'EX2:R0002']);
  assert.equal(cell(m.fields.name, 2), '戸建');
  assert.equal(cell(m.fields.assignee, 2), 'Quynh');
  assert.ok(String(cell(m.result, 2)).startsWith('R0001 の登録を呼び出しました'), cell(m.result, 2));
  assert.ok(String(cell(m.sum, 2)).includes('〔R0001〕'), cell(m.sum, 2));
  // 直す：社外案件名・担当者、EX2 にパターン（＋ → A・B。B は新しく足す行）、IN1 を足す
  f.set(m.fields.name, 2, '戸建（2期）');
  f.set(m.fields.assignee, 2, 'Tú Mĩ');
  edit(list().find(x => x.code === 'EX2').r, LC.plus, true);
  same(list().map(x => x.code + '-' + x.pattern + ':' + x.no), ['EX1-:R0001', 'EX2-A:R0002', 'EX2-B:'], '＋で足したパターンは新しく足す行');
  edit(inn, 2, true);
  same(list().map(x => x.code + ':' + x.no), ['EX1:R0001', 'EX2:R0002', 'EX2:', 'IN1:'], '①で足した視点も新しく足す行');
  env.dialogs.length = 0;
  edit(m.submit, 2, true);
  const html = String(env.dialogs[0].html || env.dialogs[0]);
  assert.ok(html.includes('【修正】') && html.includes('〔R0001 を上書き〕') && html.includes('〔追加〕') && html.includes('上書きする'), html.slice(0, 400));
  const r2 = env.g.submitFormSheet('');
  assert.equal(r2.ok, true, r2.msg);
  assert.ok(r2.msg.startsWith('直しました：R0001・R0002／足しました：R0003・R0004（REN.70）'), r2.msg);
  assert.ok(r2.msg.includes('R0002 は会社コード・案件番号・視点・パターンを変えました'), r2.msg);
  assert.ok(r2.msg.includes('お客様担当者・納期は、工程図に登録済みなら'), r2.msg);
  assert.equal(R('R0001', '社外案件名'), '戸建（2期）');
  assert.equal(R('R0001', 'お客様担当者'), 'Tú Mĩ');
  assert.equal(R('R0001', '通訳へのメッセージ'), '昼景で', '通訳へのメッセージは空なら前のまま');
  assert.equal(R('R0002', 'パターン'), 'A');
  same([R('R0003', '視点'), R('R0003', 'パターン')], ['EX2', 'B']);
  assert.equal(R('R0004', '視点'), 'IN1');
  assert.equal(reg.rows.slice(1).filter(x => x[rh.indexOf('登録No')]).length, 4, '上書きなので行は増えない（足した2件だけ増える）');
  assert.equal(S('R0001', '社外案件名'), '戸建（2期）', 'エンジニア入力シートも直る');
  assert.equal(S('R0002', 'パターン'), 'A');
  assert.ok(staff.rows.some(x => x.includes('R0004')), '足した視点は入力シートにも載る');
  assert.equal(list().length, 0, '終わったらフォームは空');
  assert.equal(cell(m.edit, 2), '', '登録Noの欄も空に戻る');
  // 見つからない登録No
  edit(m.edit, 2, 'R0099');
  assert.ok(String(cell(m.result, 2)).startsWith('✗ 登録No「R0099」が『登録一覧』に見つかりません'));
  // 呼び出したあと登録Noを消すと新規に戻る
  edit(m.edit, 2, 'R0004');
  assert.ok(list().every(x => x.no));
  edit(m.edit, 2, '');
  assert.ok(list().length && list().every(x => !x.no), '新規の登録に戻る');
  // 書き方
  assert.equal(env.g.normRegNo_('12'), 'R0012');
  assert.equal(env.g.normRegNo_('R00123'), 'R0123');
  assert.equal(env.g.normRegNo_('abc'), '');
});

test('前の版の『案件入力』（登録Noで直す の行が無い）には、空いた行に足す', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const f = admin.getSheetByName('案件入力');
  const m = JSON.parse(JSON.stringify(env.g.formMap_(f)));
  f.set(m.edit, 1, ''); f.set(m.edit, 3, '');
  assert.equal(env.g.formMap_(f).edit, 0);
  env.g.quickSetup();
  assert.equal(env.g.formMap_(f).edit, m.edit, 'もう一度初期設定すると足される');
  assert.equal(f.rows[m.edit - 1][0], env.g.FORM_L.edit);
});

test('『登録一覧』に社外視点名の列が無い（前の版）ときは、パターンの右に差し込む', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const reg = admin.getSheetByName('登録一覧');
  const ci = reg.header().indexOf('社外視点名');
  reg.rows.forEach(r => { if (r.length > ci) r.splice(ci, 1); });
  reg.set(2, reg.header().indexOf('視点') + 1, 'EX9');
  reg.set(2, reg.header().indexOf('サーバーリンク') + 1, LINK);
  assert.ok(!reg.header().includes('社外視点名'));
  env.g.ensureRegSheet_(admin, null);
  const h = reg.header();
  assert.equal(h[h.indexOf('パターン') + 1], '社外視点名');
  assert.equal(reg.rows[1][h.indexOf('視点')], 'EX9');
  assert.equal(reg.rows[1][h.indexOf('サーバーリンク')], LINK, '右の列の値も一緒にずれる');
});

test('制作時間の計算の期限：8〜12時・13〜17時（ベトナム時間）だけ数えて1時間30分', () => {
  const env = makeEnv({ admin: adminSheet(), files: {} });
  const vn = (d, h, mi) => new Date(Date.UTC(2030, 10, d, h - 7, mi)); // ベトナム時間の 11/d h:mi
  const at = (x) => { const t = new Date(x.getTime() + 7 * 3600000); return (t.getUTCMonth() + 1) + '/' + t.getUTCDate() + ' ' + t.getUTCHours() + ':' + String(t.getUTCMinutes()).padStart(2, '0'); };
  const add = (d) => at(env.g.addWorkMinutes_(d, 90, '8-12,13-17'));
  assert.equal(add(vn(4, 9, 0)), '11/4 10:30', '午前はそのまま');
  assert.equal(add(vn(4, 11, 30)), '11/4 14:00', '12〜13時は数えない');
  assert.equal(add(vn(4, 12, 20)), '11/4 14:30', '昼休み中に登録 → 13時から数える');
  assert.equal(add(vn(4, 16, 30)), '11/5 9:00', '17時以降は数えず、次の日の8時から');
  assert.equal(add(vn(4, 18, 0)), '11/5 9:30', '夜に登録 → 次の日8時から');
  assert.equal(add(vn(4, 6, 0)), '11/4 9:30', '朝早く登録 → 8時から');
  assert.equal(at(env.g.addWorkMinutes_(vn(4, 18, 0), 90, '')), '11/4 19:30', '時間帯が無ければそのまま足す');
});

test('修正で枚数が増えたとき：足した EX1-C は『登録一覧』と入力シートで EX1-A・EX1-B のすぐ下に入る（別の案件・視点の行の後ろに離れない）', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const base = { code: 'REN', number: '50', name: 'マンション', assignee: '', link: LINK, deadline: '', order: '', memo: '', toInterp: '' };
  const v = (cut, pattern, no) => ({ cut, pattern, request: '新規 / Mới', no: no || '' });
  let res = env.g.submitEntryForm({ ...base, views: [v('EX1', 'A'), v('EX1', 'B'), v('IN1', '')] });
  same(res.nos, ['R0001', 'R0002', 'R0003']);
  res = env.g.submitEntryForm({ ...base, number: '51', views: [v('EX1', '')] });
  same(res.nos, ['R0004']);
  // REN.50 を直して EX1-C を足す
  res = env.g.updateEntryForm({ ...base, views: [v('EX1', 'A', 'R0001'), v('EX1', 'B', 'R0002'), v('IN1', '', 'R0003'), v('EX1', 'C')] });
  assert.equal(res.ok, true, res.msg);
  same(res.nos.slice(-1), ['R0005']);
  const reg = admin.getSheetByName('登録一覧');
  const rh = reg.header();
  const list = reg.rows.slice(1).filter(r => r[rh.indexOf('登録No')]).map(r => r[rh.indexOf('登録No')] + ' ' + r[rh.indexOf('案件番号')] + ' ' + r[rh.indexOf('視点')] + (r[rh.indexOf('パターン')] ? '-' + r[rh.indexOf('パターン')] : ''));
  same(list, ['R0001 50 EX1-A', 'R0002 50 EX1-B', 'R0005 50 EX1-C', 'R0003 50 IN1', 'R0004 51 EX1'], '『登録一覧』で A・B・C が並ぶ');
  const ci = rh.indexOf('社内案件名') + 1;
  assert.ok(reg.formulas.some(f => f.col === ci && f.row === 4), '差し込んだ行にも社内案件名の式');
  const tab = eng.getSheetByName('入力前');
  const sh = tab.header(2).map(h => h.split('\n')[0]);
  const staff = tab.rows.slice(2).filter(r => r[sh.indexOf('登録No')]).map(r => r[sh.indexOf('登録No')] + ' ' + r[sh.indexOf('視点')] + (r[sh.indexOf('パターン')] ? '-' + r[sh.indexOf('パターン')] : ''));
  same(staff, ['R0001 EX1-A', 'R0002 EX1-B', 'R0005 EX1-C', 'R0003 IN1', 'R0004 EX1'], '入力シートでも A・B・C が並ぶ');
  assert.equal(tab.rows[4][sh.indexOf('納品名')], 'マンション_外観目線視点①_パターンC_' + env.g.deliveryYmd_());
});

test('登録の削除：エンジニアの削除依頼 →『登録一覧』に日時・Discord／管理者が「削除」→ 確認の画面 → 入力シートの行と工程図の作業だけ消す（管理者用シートはチェックが残る）→ チェックを外すと戻る（あとの回がある行は消さない）', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  env.g.saveDiscordWebhook_('https://discord.com/api/webhooks/123/abc-DEF');
  const reg = admin.getSheetByName('登録一覧');
  const rh = reg.header();
  assert.equal(rh[rh.indexOf('コピー') + 1], '削除'); assert.equal(rh[rh.indexOf('コピー') + 2], '削除依頼');
  const R = (r, name) => reg.rows[r - 1][rh.indexOf(name)];
  const setR = (r, name, v) => reg.set(r, rh.indexOf(name) + 1, v);
  const put = (r, vals) => ['会社コード', '案件番号', '社外案件名', '新規or修正', '視点', 'サーバーリンク'].forEach((h, j) => setR(r, h, vals[j]));
  put(2, ['RIC', 34, 'マンション', NEWR, 'EX1', LINK]);
  put(3, ['RIC', 34, 'マンション', NEWR, 'EX2', LINK]);
  env.g.syncRegistrationsNow();
  same([R(2, '登録No'), R(3, '登録No')], ['R0001', 'R0002']);
  const tab = inTab(eng);
  const sh = tab.header(2).map(h => h.split('\n')[0]);
  assert.ok(sh.includes('削除依頼'), '入力シートに削除依頼の列');
  const rowOf = (no) => tab.rows.findIndex(v => v[sh.indexOf('登録No')] === no) + 1;
  [['R0001', 3], ['R0002', 2]].forEach(([no, h]) => tab.set(rowOf(no), sh.indexOf('White躯体') + 1, h));
  env.g.transferFromStaffSheet();
  const { link, at } = linkAt(admin);
  same([at(2, '取込キー'), at(3, '取込キー')], ['RIC34::EX1::1', 'RIC34::EX2::1']);
  // 工程図にタスクがある（EX1 のカラーは工程図で消された記録あり）
  [['t1', 'RIC34::EX1::1::white'], ['t2', 'RIC34::EX2::1::white']].forEach(([id, ext]) => env.fs.putTask(id, { id: { stringValue: id }, externalId: { stringValue: ext } }));
  env.fs.docs['workspaces/liebe-asia-team/data/deletedExternalIds'] = { value: { stringValue: JSON.stringify(['RIC34::EX1::1::color', 'OTHER::IN1::1::white']) } };

  // エンジニアが削除依頼 → 『登録一覧』に日時・Discord で知らせる（1回だけ）。外すと消える
  tab.set(rowOf('R0001'), sh.indexOf('削除依頼') + 1, true);
  env.g.syncRegistrationsNow();
  assert.ok(isDate(R(2, '削除依頼')));
  const dm = env.discord[env.discord.length - 1];
  assert.ok(dm.startsWith('🗑') && dm.includes('R0001 RIC.34'), dm);
  const nd = env.discord.length;
  env.g.syncRegistrationsNow();
  assert.equal(env.discord.length, nd, '同じ依頼で何度も送らない');

  // 管理者が「削除」にチェック → 確認の画面（まだ何も消さない。チェックは付いたまま）
  env.dialogs.length = 0;
  setR(2, '削除', true);
  env.g.onAdminEdit({ range: reg.getRange(2, rh.indexOf('削除') + 1), source: admin });
  assert.equal(env.dialogs.length, 1);
  const html = env.dialogs[0].html;
  assert.ok(html.includes('R0001') && html.includes('削除依頼あり') && html.includes('チェックを外すと'), html.slice(0, 600));
  new vm.Script(html.split('<script>')[1].split('</script>')[0]);
  assert.ok(!html.split('<script>')[1].includes('\\'), '画面のスクリプトにバックスラッシュが無い');
  assert.equal(R(2, '削除'), true);
  // 「やめる」→ チェックが外れる
  env.g.cancelDeleteRegistrations(['R0001']);
  assert.equal(R(2, '削除'), false);
  setR(2, '削除', true);

  // 「削除する」：入力シートの行と工程図の作業だけ消す。管理者用シートの行は残る（登録一覧は削除済み・連携は対象外）
  const res = env.g.deleteRegistrations(['R0001']);
  assert.equal(res.ok, true, res.msg);
  assert.ok(res.msg.includes('削除しました：R0001') && res.msg.includes('工程図の作業 1件を削除'), res.msg);
  same([R(2, '登録No'), R(2, '状態'), R(2, '削除')], ['R0001', '削除済み', true], '『登録一覧』の行は残る');
  assert.equal(rowOf('R0001'), 0, '入力シートから消える');
  assert.ok(rowOf('R0002') > 0);
  const lh = link.header();
  const lrow = link.rows.find(v => v[lh.indexOf('取込キー')] === 'RIC34::EX1::1');
  assert.ok(lrow, '『連携』の行は残る');
  assert.equal(lrow[lh.indexOf('対象外')], true, '対象外にする');
  same(env.fs.tasks().map(t => t.externalId), ['RIC34::EX2::1::white'], '工程図の作業は消える');
  same(JSON.parse(env.fs.docs['workspaces/liebe-asia-team/data/deletedExternalIds'].value.stringValue), ['OTHER::IN1::1::white'], '消した記録からも外す（同じ視点をまた登録できる）');
  assert.ok(!('PENDING_DELETE_KEYS' in env.props));
  env.g.syncRegistrationsNow();
  assert.equal(R(2, '状態'), '削除済み', '同期しても削除済みのまま（入力シートへ写し直さない）');
  assert.equal(rowOf('R0001'), 0);
  env.g.transferFromStaffSheet();
  // 『削除済み』にバックアップ（JSON の列は隠す）
  const tr = admin.getSheetByName('削除済み');
  assert.ok(tr, '『削除済み』タブができる');
  const th = tr.header();
  const T2 = (name) => tr.rows[1][th.indexOf(name)];
  same([T2('登録No'), T2('社内案件名'), T2('視点'), T2('状態'), T2('取込キー')], ['R0001', 'RIC.34', 'EX1', '削除済み', 'RIC34::EX1::1']);
  assert.equal(JSON.parse(T2('工程図')).length, 1, '消した工程図の作業も残る');
  assert.equal(JSON.parse(T2('入力シート')).tab, '入力前');
  assert.ok((tr.hidden || []).includes(th.indexOf('登録一覧') + 1));
  // 「削除」のチェックを外す → 元に戻る（入力シートの行・工程図の作業・連携の対象外）
  setR(2, '削除', false);
  env.g.onAdminEdit({ range: reg.getRange(2, rh.indexOf('削除') + 1), source: admin });
  assert.equal(T2('状態'), '復帰済み', T2('結果'));
  assert.ok(String(T2('結果')).includes('工程図の作業 1件'), T2('結果'));
  assert.ok(rowOf('R0001') > 0, '入力シートに戻る');
  assert.equal(tab.rows[rowOf('R0001') - 1][sh.indexOf('削除依頼')], false, '削除依頼は外して戻す');
  assert.equal(reg.rows.filter(v => v[rh.indexOf('登録No')] === 'R0001').length, 1, '『登録一覧』の行は増えない');
  assert.equal(link.rows.find(v => v[lh.indexOf('取込キー')] === 'RIC34::EX1::1')[lh.indexOf('対象外')], false, '対象外を外す');
  same(env.fs.tasks().map(t => t.externalId).sort(), ['RIC34::EX1::1::white', 'RIC34::EX2::1::white'], '工程図の作業も戻る');
  env.g.syncRegistrationsNow();
  assert.notEqual(R(2, '状態'), '削除済み');
  // 『削除済み』の「復帰」からも戻せる：もう一度消して、復帰にチェック
  setR(2, '削除', true);
  assert.equal(env.g.deleteRegistrations(['R0001']).ok, true);
  assert.equal(tr.rows[2][th.indexOf('登録No')], 'R0001', '2回目の削除も残る');
  tr.set(3, th.indexOf('復帰') + 1, true);
  env.g.onAdminEdit({ range: tr.getRange(3, th.indexOf('復帰') + 1), source: admin });
  assert.equal(tr.rows[2][th.indexOf('状態')], '復帰済み', tr.rows[2][th.indexOf('結果')]);
  same([R(2, '削除'), R(2, '状態')], [false, ''], '『登録一覧』の削除も外れる');
  assert.ok(rowOf('R0001') > 0);
  // 片付け：もう一度消す
  assert.equal(env.g.deleteRegistrations(['R0001']).ok, true);

  // 同じ視点の2回目がある行（1回目）は消さない（チェックも外す）。2つ一緒なら消せる
  put(4, ['RIC', 34, 'マンション', FIXR, 'EX2', LINK]);
  env.g.syncRegistrationsNow();
  assert.equal(R(4, '登録No'), 'R0003');
  setR(3, '削除', true);
  const bad = env.g.deleteRegistrations(['R0002']);
  assert.equal(bad.ok, false);
  assert.ok(bad.msg.includes('あとの回（2回目・R0003）'), bad.msg);
  same([R(3, '状態') !== '削除済み', R(3, '削除')], [true, false], '消していない・チェックは外れる');
  const both = env.g.deleteRegistrations(['R0002', 'R0003']);
  assert.equal(both.ok, true, both.msg);
  same(reg.rows.slice(1).filter(v => v[rh.indexOf('登録No')]).map(v => v[rh.indexOf('状態')]), ['削除済み', '削除済み', '削除済み']);
  assert.equal(env.fs.tasks().length, 0);

  // 判定だけ（純ロジック）：あとの回が残る行は消さない・入力シートに無い登録は消せる
  same(plain(env.g.planRegDeletion_([{ no: 'R1', base: 'A::X' }, { no: '', base: 'A::X' }, { no: 'R3', base: 'B::Y' }], ['R1', 'R3', 'R9'])), {
    ok: [{ no: 'R3', key: 'B::Y::1' }, { no: 'R9', key: '' }], blocked: [{ no: 'R1', reason: 'あとの回（2回目）があるので、先にそちらを消してください' }] });
});

test('管理者が『登録一覧』に White・Color を書く → 入力シートの White躯体・Color へすぐ入る（登録前に書いた時間も写す）→ 時間入力済み', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const reg = admin.getSheetByName('登録一覧');
  const rh = reg.header();
  const R = (r, name) => reg.rows[r - 1][rh.indexOf(name)];
  const setR = (r, name, v) => reg.set(r, rh.indexOf(name) + 1, v);
  const put = (r, vals) => ['会社コード', '案件番号', '社外案件名', '新規or修正', '視点', 'サーバーリンク'].forEach((h, j) => setR(r, h, vals[j]));
  put(2, ['RIC', 34, 'マンション', NEWR, 'EX1', LINK]);
  put(3, ['RIC', 34, 'マンション', NEWR, 'EX2', LINK]);
  setR(3, 'White', 4); setR(3, 'Color', 2); // 登録の前に書いた時間
  env.g.syncRegistrationsNow();
  const tab = inTab(eng);
  const sh = tab.header(2).map(h => h.split('\n')[0]);
  const S = (no, name) => tab.rows[tab.rows.findIndex(v => v[sh.indexOf('登録No')] === no)][sh.indexOf(name)];
  same([S('R0002', 'White躯体'), S('R0002', 'Color')], [4, 2], '登録のときに入力シートへ写す');
  assert.equal(R(3, '状態'), '時間入力済み');
  assert.equal(R(3, 'White'), 4);
  // 登録したあとで書く → 編集の瞬間に入力シートへ
  setR(2, 'White', 3); setR(2, 'Color', 1.5);
  env.g.onAdminEdit({ range: reg.getRange(2, rh.indexOf('White') + 1, 1, 2), source: admin });
  same([S('R0001', 'White躯体'), S('R0001', 'White家具'), S('R0001', 'Color')], [3, '', 1.5]);
  assert.equal(R(2, '状態'), '時間入力済み');
  // 入力シートで直したら、入力シートが正
  const r1 = tab.rows.findIndex(v => v[sh.indexOf('登録No')] === 'R0001') + 1;
  tab.set(r1, sh.indexOf('White家具') + 1, 1);
  env.g.syncRegistrationsNow();
  assert.equal(R(2, 'White'), 4, '躯体3＋家具1');
});

test('『案件入力』の W・X に White・Color を書いて登録 →『登録一覧』と入力シートに時間が入る／前の版（登録No が W）は Z へ移す', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const f = admin.getSheetByName('案件入力');
  const m = JSON.parse(JSON.stringify(env.g.formMap_(f)));
  const LC = JSON.parse(JSON.stringify(env.g.FORM_LC));
  assert.equal(LC.white, 23); assert.equal(LC.color, 24); assert.equal(env.g.FORM_NO_COL, 26);
  const cell = (r, c) => (f.rows[r - 1] || [])[c - 1];
  same([cell(m.list, 23), cell(m.list, 24)], ['White（h）', 'Color（h）']);
  assert.ok((f.hidden || []).includes(26) && !(f.hidden || []).includes(23), '登録No は Z（隠し列）、W・X は見える');
  const edit = (r, c, v) => { f.set(r, c, v); env.g.onAdminEdit({ range: f.getRange(r, c), source: admin }); };
  const ex = m.grid.find(g => g.keyword === 'EX').row;
  edit(ex, 2, true); edit(ex, 3, true);
  f.set(m.list1, 23, 3); f.set(m.list1, 24, 2.5);
  f.set(m.fields.code, 2, 'REN'); f.set(m.fields.number, 2, 60); f.set(m.fields.name, 2, '戸建'); f.set(m.fields.link, 2, LINK);
  edit(m.list1 + 1, LC.room, ''); // ②を触っても時間は消えない
  same([cell(m.list1, 23), cell(m.list1, 24)], [3, 2.5]);
  const res = env.g.submitFormSheet('');
  assert.equal(res.ok, true, res.msg);
  const reg = admin.getSheetByName('登録一覧');
  const rh = reg.header();
  same([reg.rows[1][rh.indexOf('White')], reg.rows[1][rh.indexOf('Color')], reg.rows[1][rh.indexOf('状態')]], [3, 2.5, '時間入力済み']);
  assert.equal(reg.rows[2][rh.indexOf('White')], '', '書かなかった視点は空');
  const tab = inTab(eng);
  const sh = tab.header(2).map(h => h.split('\n')[0]);
  const row = tab.rows.find(v => v[sh.indexOf('登録No')] === 'R0001');
  same([row[sh.indexOf('White躯体')], row[sh.indexOf('Color')]], [3, 2.5]);
  // 登録Noで呼び出すと時間も出る → 直して登録すると入力シートも直る
  edit(m.edit, 2, 'R1');
  same([cell(m.list1, 23), cell(m.list1, 24), cell(m.list1, 26)], [3, 2.5, 'R0001']);
  f.set(m.list1, 23, 5);
  assert.equal(env.g.submitFormSheet('').ok, true);
  assert.equal(tab.rows.find(v => v[sh.indexOf('登録No')] === 'R0001')[sh.indexOf('White躯体')], 5);
  assert.equal(reg.rows[1][rh.indexOf('White')], 5);
  // 前の版：登録No が W（見出し「登録No（隠し列）」）→ 触ると Z へ移し、W・X は時間の欄に
  f.set(1, 26, ''); f.set(1, 23, '登録No（隠し列）');
  f.set(m.list1, 23, 'R0002'); f.set(m.list1, 26, '');
  f.hidden = [22, 23];
  edit(m.fields.memo, 2, 'x');
  same([cell(1, 23), cell(1, 26), cell(m.list1, 23), cell(m.list1, 26), cell(m.list, 23)], ['', '登録No（隠し列）', '', 'R0002', 'White（h）']);
  assert.ok(f.hidden.includes(26) && !f.hidden.includes(23));
});

test('工程図の1日の読み取り上限（429）：戻るまで工程図を読まずにシートの同期は続け、Discord で1回だけ知らせる／送るときは案件のタスクだけ読む', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  env.g.saveDiscordWebhook_('https://discord.com/api/webhooks/123/abc-DEF');
  const reg = admin.getSheetByName('登録一覧');
  const rh = reg.header();
  const setR = (r, name, v) => reg.set(r, rh.indexOf(name) + 1, v);
  ['会社コード', '案件番号', '社外案件名', '新規or修正', '視点', 'サーバーリンク', 'White', 'Color'].forEach((h, j) => setR(2, h, ['RIC', 34, 'マンション', NEWR, 'EX1', LINK, 3, 2][j]));
  env.g.syncRegistrationsNow();
  env.fsQuota = true;
  let r = env.g.autoRun();
  const { at, set } = linkAt(admin);
  assert.equal(at(2, '取込キー'), 'RIC34::EX1::1', 'シートの転記は続ける：' + r);
  set(2, '転記日時', new Date(Date.now() - 3600000));
  r = env.g.autoRun();
  assert.ok(r.includes('読み取り上限'), r);
  assert.equal(at(2, '状態'), '未送信', '上限の間は送らない');
  const quotaMsgs = () => env.discord.filter(m => m.includes('読み取り上限')).length;
  assert.equal(quotaMsgs(), 1, 'Discord で知らせる');
  env.g.autoRun();
  assert.equal(quotaMsgs(), 1, '何度も知らせない');
  assert.ok(Number(env.props.FS_QUOTA_UNTIL) > Date.now());
  // 戻った
  env.fsQuota = false;
  env.props.FS_QUOTA_UNTIL = String(Date.now() - 1000);
  env.fs.listAll = 0;
  r = env.g.autoRun();
  assert.equal(at(2, '状態'), '登録済み', r);
  assert.equal(env.fs.listAll || 0, 0, '全タスクの一覧は読まない（案件のタスクだけ runQuery で読む）');
  same(env.fs.tasks().map(t => t.externalId).sort(), ['RIC34::EX1::1::color', 'RIC34::EX1::1::white']);
});

test('エンジニアが入力シート『入力前』で足した行（登録No なし）は『登録一覧』に取り込む（同じ視点の下・登録No を付ける・書きかけは待つ）', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const reg = admin.getSheetByName('登録一覧');
  const rh = reg.header();
  const R = (r, name) => reg.rows[r - 1][rh.indexOf(name)];
  const setR = (r, name, v) => reg.set(r, rh.indexOf(name) + 1, v);
  const put = (r, vals) => ['会社コード', '案件番号', '社外案件名', 'お客様担当者', '新規or修正', '視点', 'パターン', 'サーバーリンク'].forEach((h, j) => setR(r, h, vals[j]));
  put(2, ['REN', 94, 'ロイヤルパークス有明', '井戸澤様', FIXR, 'IN4', 'A', LINK]);
  setR(2, '納期', new Date(2030, 0, 20));
  put(3, ['REN', 94, 'ロイヤルパークス有明', '井戸澤様', FIXR, 'IN4', 'B', LINK]);
  put(4, ['RIC', 34, 'マンション', '', NEWR, 'EX1', '', LINK]);
  env.g.syncRegistrationsNow();
  same([R(2, '登録No'), R(3, '登録No'), R(4, '登録No')], ['R0001', 'R0002', 'R0003']);
  const tab = inTab(eng);
  const sh = tab.header(2).map(h => h.split('\n')[0]);
  const C = (name) => sh.indexOf(name) + 1;
  // エンジニアが B の下に C を足す（まだ書きかけ：時間も翻訳済みも無い）
  const rowB = tab.rows.findIndex(v => v[C('登録No') - 1] === 'R0002') + 1;
  const newRow = tab.getLastRow() + 1;
  [['会社コード', 'REN'], ['案件番号', 94], ['社外案件名', 'ロイヤルパークス有明'], ['サーバーリンク', LINK], ['新規or修正', FIXR], ['視点', 'IN4'], ['パターン', 'C']].forEach(([h, v]) => tab.set(newRow, C(h), v));
  env.g.syncRegistrationsNow();
  assert.equal(tab.rows[newRow - 1][C('登録No') - 1] || '', '', '書きかけ（翻訳済みも時間も無い）は取り込まない');
  tab.set(newRow, C('翻訳済み'), true); tab.set(newRow, C('Color'), 0.5);
  const msg = env.g.syncRegistrationsNow();
  assert.ok(msg.includes('入力シートで足した行を取り込み 1件'), msg);
  assert.equal(tab.rows[newRow - 1][C('登録No') - 1], 'R0004', '入力シートの行に登録No');
  assert.ok(rowB > 0);
  // 『登録一覧』では INE4-B のすぐ下（RIC.34 の前）に入る。担当者は同じ案件の前の登録から
  same([R(4, '登録No'), R(4, '視点'), R(4, 'パターン'), R(4, 'お客様担当者'), R(4, '管理者メモ'), R(5, '登録No')], ['R0004', 'IN4', 'C', '井戸澤様', 'エンジニア入力シートで追加', 'R0003']);
  assert.equal(R(4, 'Color'), 0.5);
  assert.equal(R(4, '社外視点名'), '内観目線視点④_パターンC', '社外視点名も入る');
  assert.equal(String(R(4, '納期')), String(new Date(2030, 0, 20)), '納期は同じ案件の前の登録から');
  assert.equal(R(4, '状態'), '時間入力済み');
  assert.equal(tab.rows[newRow - 1][C('納品名') - 1], 'ロイヤルパークス有明_内観目線視点④_パターンC_' + env.g.deliveryYmd_(), '納品名も入る');
  // 何度動かしても二重にしない
  env.g.syncRegistrationsNow();
  assert.equal(reg.rows.filter(v => v[rh.indexOf('パターン')] === 'C').length, 1);
  assert.equal(tab.rows.filter(v => v[C('パターン') - 1] === 'C').length, 1);
});

test('Discord は知らせる時間帯（既定 8-18）の中だけ。外の通知は貯めて、時間帯に入ったら自動実行でまとめて送る', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  assert.equal(env.g.readSettings_().notifyHours, '0-24');
  env.setHours(new Date(2026, 7, 18)); // シートが「8-18」を日付にしてしまったとき
  assert.equal(env.g.readSettings_().notifyHours, '8-18', '日付になっても 8-18 として読む');
  env.setHours('0-24');
  env.g.saveDiscordWebhook_('https://discord.com/api/webhooks/123/abc-DEF');
  const reg = admin.getSheetByName('登録一覧');
  const rh = reg.header();
  const setR = (r, name, v) => reg.set(r, rh.indexOf(name) + 1, v);
  ['会社コード', '案件番号', '社外案件名', '新規or修正', '視点', 'サーバーリンク'].forEach((h, j) => setR(2, h, ['RIC', 34, 'マンション', NEWR, 'EX1', LINK][j]));
  env.g.syncRegistrationsNow();
  env.setHours('0-0'); // 時間帯の外
  const tab = inTab(eng);
  const sh = tab.header(2).map(h => h.split('\n')[0]);
  tab.set(3, sh.indexOf('削除依頼') + 1, true);
  const n0 = env.discord.length;
  const msg = env.g.syncRegistrationsNow();
  assert.equal(env.discord.length, n0, '時間帯の外は送らない');
  assert.ok(msg.includes('時間帯に入ったら'), msg);
  assert.equal(JSON.parse(env.props.DISCORD_QUEUE).length, 1);
  env.g.autoRun();
  assert.equal(env.discord.length, n0, 'まだ時間帯の外');
  env.setHours('0-24');
  const r = env.g.autoRun();
  assert.ok(r.includes('時間帯の外の通知 1件'), r);
  assert.ok(env.discord[env.discord.length - 1].includes('削除依頼'), '貯めた通知を送る');
  assert.ok(!('DISCORD_QUEUE' in env.props));
});

test('納品名：登録No の無い古い行（制作中・制作済み）にも入れる。社外視点名は『連携』→ 視点コードから自動 → 視点名そのもの。入っている名前は変えない', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const done = eng.getSheetByName('制作済み');
  const sh = done.header(2).map(h => h.split('\n')[0]);
  const C = (name) => sh.indexOf(name) + 1;
  const put = (r, o) => Object.keys(o).forEach(h => done.set(r, C(h), o[h]));
  put(3, { '会社コード': 'REN', '案件番号': 100, '社外案件名': '王子PJ', '視点': 'IN1', '新規or修正': NEWR, 'White躯体': 2 });
  put(4, { '会社コード': 'REN', '案件番号': 100, '社外案件名': '王子PJ', '視点': 'IN2', '新規or修正': NEWR, 'White躯体': 2 });
  put(5, { '会社コード': 'CG', '案件番号': 36, '社外案件名': '深沢', '視点': 'House1', '新規or修正': NEWR, 'White躯体': 2 });
  put(6, { '会社コード': 'REN', '案件番号': 100, '社外案件名': '王子PJ', '視点': 'IN1', '新規or修正': FIXR, 'Color': 1 });
  put(7, { '会社コード': 'REN', '案件番号': 100, '社外案件名': '王子PJ', '視点': 'IN3', '新規or修正': NEWR, 'White躯体': 1, '納品名': '手で付けた名前' });
  // 『連携』で人が社外視点名を直した行（REN100::IN2::1）
  const { link } = linkAt(admin);
  const lh = link.header();
  link.set(2, lh.indexOf('取込キー') + 1, 'REN100::IN2::1');
  link.set(2, lh.indexOf('社外視点名') + 1, 'リビング');
  const n = env.g.fillStaffDeliveryNames_(env.g.readSettings_(), admin);
  assert.equal(n, 4);
  const D = (r) => done.rows[r - 1][C('納品名') - 1];
  same([D(3), D(4), D(5), D(6), D(7)], ['王子PJ_内観目線視点①_' + env.g.deliveryYmd_(), '王子PJ_リビング_' + env.g.deliveryYmd_(), '深沢_House1_' + env.g.deliveryYmd_(), '王子PJ_内観目線視点①_' + env.g.deliveryYmd_(), '手で付けた名前']);
  assert.equal(env.g.fillStaffDeliveryNames_(env.g.readSettings_(), admin), 0, '2回目は何もしない');
  // 日付が変わったら：『制作済み』は止める（納品した日のまま）・ほかのタブは今日の日付に作り直す
  done.set(3, C('納品名'), '王子PJ_内観目線視点①_261101');
  const before = eng.getSheetByName('入力前');
  const bh = before.header(2).map(h => h.split('\n')[0]);
  const B = (name) => bh.indexOf(name) + 1;
  [['会社コード', 'REN'], ['案件番号', 100], ['社外案件名', '王子PJ'], ['視点', 'IN5'], ['新規or修正', NEWR], ['登録No', 'R9999'], ['納品名', '王子PJ_内観目線視点⑤_261101']].forEach(([h, v]) => before.set(3, B(h), v));
  env.g.fillStaffDeliveryNames_(env.g.readSettings_(), admin);
  assert.equal(D(3), '王子PJ_内観目線視点①_261101', '制作済みは日付を止める');
  assert.equal(before.rows[2][B('納品名') - 1], '王子PJ_内観目線視点⑤_' + env.g.deliveryYmd_(), '入力前・制作中は毎日その日の日付');
});

test('工程図の予定：アプリが書いた data/scheduleSnapshot を1件読んで、『連携』の開始予定・終了予定・担当・状態に入れる', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const { link, at } = linkAt(admin);
  const lh = link.header();
  ['開始予定（工程図）', '終了予定（工程図）', '担当（工程図）', '工程図の状態'].forEach(h => assert.ok(lh.includes(h), h + ' の列'));
  link.set(2, lh.indexOf('取込キー') + 1, 'REN100::INE3::1');
  link.set(3, lh.indexOf('取込キー') + 1, 'REN100::INE4::1');
  const s = new Date(2026, 10, 6, 9, 0).getTime(), e = new Date(2026, 10, 7, 15, 30).getTime();
  env.fs.docs['workspaces/liebe-asia-team/data/scheduleSnapshot'] = { value: { stringValue: JSON.stringify({ updatedAt: s, items: { 'REN100::INE3::1': { s, e, a: 'Quynh・Linh', st: '作業中' } } }) } };
  const g0 = env.fs.gets || 0;
  const r = env.g.writeScheduleToLink_(env.g.readSettings_(), admin);
  assert.equal(r.rows, 1);
  same([at(2, '開始予定（工程図）').getTime(), at(2, '終了予定（工程図）').getTime(), at(2, '担当（工程図）'), at(2, '工程図の状態')], [s, e, 'Quynh・Linh', '作業中']);
  same([at(3, '開始予定（工程図）'), at(3, '工程図の状態')], ['', ''], 'まとめに無い行は空');
  // 上限の間は読まない
  env.props.FS_QUOTA_UNTIL = String(Date.now() + 3600000);
  assert.equal(env.g.writeScheduleToLink_(env.g.readSettings_(), admin).skipped, true);
  assert.ok(g0 >= 0);
});

test('担当者ごとの予定表：plan から『予定_担当者名』タブを作り、2週間×30分の枠に色を塗る（同じまとめなら書き直さない）', () => {
  const admin = adminSheet();
  const env = makeEnv({ admin, files: { [NEW_ID]: engineerFile() } });
  const now = new Date(2026, 10, 6, 9, 0).getTime();
  const snap = { updatedAt: now, plan: { from: '2026-11-06', days: 14, rows: [
    { a: 'Quynh', p: 'REN100', v: 'IN1', s: 'ホワイト', st: '作業中', dl: '2026-11-10', b: now, e: now + 3600000, sl: [[0, 480, 600], [3, 780, 840]] },
    { a: 'Linh', p: 'SAN27', v: 'EX1', s: 'カラー', st: '予定', dl: '', b: now, e: now, sl: [[1, 480, 510]] },
  ] } };
  const r = env.g.writeAssigneeTabs_(admin, snap);
  same([r.tabs, r.rows, r.skipped], [2, 2, false]);
  const q = admin.getSheetByName('予定_Quynh');
  assert.ok(q && admin.getSheetByName('予定_Linh'));
  const perDay = (1020 - 480) / 30; // 8:00〜17:00
  same([q.getMaxColumns(), q.getMaxRows(), q.frozen, q.frozenCols], [7 + 14 * perDay, 6, 3, 7], '中身ぴったりの大きさ');
  same(q.rows[3].slice(0, 3), ['REN100', 'IN1', 'ホワイト']);
  same([q.rows[1][7], q.rows[2][7]], ['11/6（金）', '8']);
  const bg = q.bgs.arr;
  assert.equal(bg[3][7], '#78909c', '8:00 は作業中のホワイト');
  assert.notEqual(bg[3][7 + 4], '#78909c', '10:00 からは空き');
  assert.equal(bg[3][7 + 3 * perDay + 10], '#78909c', '4日目の 13:00');
  // 同じまとめなら書き直さない
  assert.equal(env.g.writeAssigneeTabs_(admin, snap).skipped, true);
  // Linh の予定がなくなったら、タブは残して「予定なし」
  const snap2 = { updatedAt: now + 1, plan: { from: '2026-11-06', days: 14, rows: [snap.plan.rows[0]] } };
  env.g.writeAssigneeTabs_(admin, snap2);
  assert.equal(admin.getSheetByName('予定_Linh').rows[3][0], '今日から2週間の予定はありません');
});

test('連携スクリプトの読み取りの目安：読んだ件数を数え、今日の目安を超えたら自動の登録は待つ（手で登録した分は止めない）', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  env.g.saveDiscordWebhook_('https://discord.com/api/webhooks/123/abc-DEF');
  const reg = admin.getSheetByName('登録一覧');
  const rh = reg.header();
  const setR = (r, name, v) => reg.set(r, rh.indexOf(name) + 1, v);
  ['会社コード', '案件番号', '社外案件名', '新規or修正', '視点', 'サーバーリンク', 'White', 'Color'].forEach((h, j) => setR(2, h, ['RIC', 34, 'マンション', NEWR, 'EX1', LINK, 3, 2][j]));
  env.g.syncRegistrationsNow();
  const n0 = env.g.fsReadsToday_();
  env.g.autoRun();
  assert.ok(env.g.fsReadsToday_() > n0, '読んだ件数を数える');
  const { at, set } = linkAt(admin);
  set(2, '転記日時', new Date(Date.now() - 3600000));
  env.props.FS_READS = JSON.stringify({ day: env.g.fsReadDay_(), n: env.g.AUTO_READ_BUDGET });
  const q0 = env.fs.taskReads || 0;
  const r = env.g.autoRun();
  assert.ok(r.includes('目安'), r);
  assert.equal(at(2, '状態'), '未送信', '目安を超えたら自動では送らない');
  assert.equal(env.fs.taskReads || 0, q0, '工程図のタスクを読まない');
  assert.equal(env.discord.filter(m => m.includes('目安')).length, 1, 'Discord で1回知らせる');
  env.g.autoRun();
  assert.equal(env.discord.filter(m => m.includes('目安')).length, 1, '何度も知らせない');
  // 次の日（太平洋時間）になれば戻る
  env.props.FS_READS = JSON.stringify({ day: '2000-01-01', n: 99999 });
  env.g.autoRun();
  assert.equal(at(2, '状態'), '登録済み');
});

test('タスクのまとめ保存：スクリプトの割り振りはアプリと同じ／まとめ保存なら旧 tasks に読み書きしない', () => {
  const taskPackOf = appTaskPackOf;
  const admin = adminSheet();
  const env = makeEnv({ admin, files: { [NEW_ID]: engineerFile() } });
  for (let i = 0; i < 500; i++) assert.equal(env.g.taskPackOf_('task_' + i + '_x', 64), taskPackOf('task_' + i + '_x', 64));
  assert.equal(env.g.taskPackOf_('abc', 123), taskPackOf('abc', 123));
  if (!env.fs.packMode) return;
  env.g.quickSetup();
  const reg = admin.getSheetByName('登録一覧');
  const rh = reg.header();
  ['会社コード', '案件番号', '社外案件名', '新規or修正', '視点', 'サーバーリンク', 'White', 'Color'].forEach((h, j) => reg.set(2, rh.indexOf(h) + 1, ['RIC', 34, 'マンション', NEWR, 'EX1', LINK, 3, 2][j]));
  env.g.syncRegistrationsNow();
  env.g.autoRun();
  const { at, set } = linkAt(admin);
  set(2, '転記日時', new Date(Date.now() - 3600000));
  env.g.autoRun();
  assert.equal(at(2, '状態'), '登録済み');
  same(env.fs.tasks().map(t => t.externalId).sort(), ['RIC34::EX1::1::color', 'RIC34::EX1::1::white']);
  assert.equal(Object.keys(env.fs.docs).filter(k => k.indexOf('/tasks/') >= 0).length, 0, '旧 tasks には書かない');
  const white = env.fs.tasks().find(t => t.externalId === 'RIC34::EX1::1::white');
  assert.ok(env.fs.docs[env.fs.packOf(white.id)].t.mapValue.fields[white.id], 'アプリと同じまとめに入る');
});

test('『案件入力』の登録の確認画面：「登録する」を押した瞬間に通訳への連絡文をコピーする（登録で時刻が変わったら選び直す）', () => {
  const env = makeEnv({ admin: adminSheet(), files: { [NEW_ID]: engineerFile() } });
  const html = env.g.formConfirmHtml_({ title: 'TANAKA.342', request: '新規', views: ['内観目線③（INE3）'], preview: '連絡文 13:21まで' });
  assert.ok(html.includes('「登録する」と同時にコピー'));
  const script = html.split('<script>')[1].split('</script>')[0];
  const run = ({ interp, execOk = true }) => {
    const log = [];
    const mk = (id) => ({ id, value: '', textContent: '', className: '', disabled: false, style: {}, handlers: {},
      addEventListener(ev, f) { this.handlers[ev] = f; }, focus() {}, select() { log.push('select:' + this.value); } });
    const els = { preview: mk('preview'), toInterp: mk('toInterp'), go: mk('go'), cancel: mk('cancel'), msg: mk('msg') };
    els.preview.value = '連絡文 13:21まで';
    let success = null;
    const runner = { withSuccessHandler(f) { success = f; return runner; }, withFailureHandler() { return runner; }, submitFormSheet() { log.push('submit'); } };
    const doc = { getElementById: (id) => els[id], execCommand: (c) => { log.push('copy:' + els.preview.value); return execOk; } };
    vm.runInContext(script, vm.createContext({ document: doc, navigator: {}, google: { script: { run: runner, host: { close() {} } } }, String }));
    els.go.handlers.click();
    assert.deepEqual(log.filter(x => x.startsWith('copy') || x === 'submit').slice(0, 2), ['copy:連絡文 13:21まで', 'submit'], 'サーバーへ送る前（押した瞬間）にコピー');
    assert.equal(els.msg.textContent.startsWith('通訳への連絡文をコピーしました。'), execOk, els.msg.textContent);
    success({ ok: true, msg: '登録しました：R0001', interp });
    return { log, msg: els.msg.textContent };
  };
  const same1 = run({ interp: '連絡文 13:21まで' });
  assert.ok(same1.msg.includes('コピーしました（そのまま貼り付けできます）'), same1.msg);
  const changed = run({ interp: '連絡文 13:25まで', execOk: true });
  assert.ok(changed.log.includes('copy:連絡文 13:25まで'), '時刻が変わったらもう一度コピー');
  const blocked = run({ interp: '連絡文 13:25まで', execOk: false });
  assert.ok(blocked.msg.includes('コピーし直してください'), blocked.msg);
});

test('「通知オフ」にした案件は Discord で催促・削除依頼を知らせない／「資料待ち」の行は状態が資料待ちになり催促しない', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  env.g.saveDiscordWebhook_('https://discord.com/api/webhooks/123/abc-DEF');
  const reg = admin.getSheetByName('登録一覧');
  const rh = reg.header();
  assert.ok(rh.indexOf('通知オフ') >= 0, '『登録一覧』に「通知オフ」の列');
  const tab = inTab(eng);
  const sh = tab.rows[1].map(h => String(h).split('\n')[0]);
  assert.ok(sh.indexOf('資料待ち') >= 0, 'エンジニア入力シートに「資料待ち」の列');
  const setR = (r, name, v) => reg.set(r, rh.indexOf(name) + 1, v);
  const R = (r, name) => reg.rows[r - 1][rh.indexOf(name)];
  [[2, 'EX1'], [3, 'EX2']].forEach(([r, cut]) => ['会社コード', '案件番号', '社外案件名', '新規or修正', '視点', 'サーバーリンク'].forEach((h, j) => setR(r, h, ['RIC', 34, 'マンション', NEWR, cut, LINK][j])));
  env.g.syncRegistrationsNow();
  [2, 3].forEach(r => setR(r, '登録日時', new Date(Date.now() - 3 * 86400000)));
  // 通知オフ（1行にチェックすると同じ案件の行すべて）
  setR(2, '通知オフ', true);
  let msg = env.g.syncRegistrationsNow();
  assert.equal(env.discord.length, 0, '通知オフの案件は催促しない：' + msg);
  // エンジニアの削除依頼も知らせない（日時は入る）
  const rowOf = (cut) => tab.rows.findIndex(x => x[sh.indexOf('視点')] === cut) + 1;
  tab.set(rowOf('EX2'), sh.indexOf('削除依頼') + 1, true);
  env.g.syncRegistrationsNow();
  assert.ok(R(3, '削除依頼') instanceof Date || String(R(3, '削除依頼')) !== '');
  assert.equal(env.discord.length, 0);
  tab.set(rowOf('EX2'), sh.indexOf('削除依頼') + 1, false);
  // 外すと催促が届く
  setR(2, '通知オフ', false);
  env.g.syncRegistrationsNow();
  assert.equal(env.discord.length, 1);
  assert.ok(env.discord[0].includes('EX1') && env.discord[0].includes('EX2'));
  // 資料待ちにチェック → 状態「資料待ち」・催促しない
  tab.set(rowOf('EX1'), sh.indexOf('資料待ち') + 1, true);
  [2, 3].forEach(r => setR(r, '最後の催促', new Date(Date.now() - 2 * 3600000)));
  env.g.syncRegistrationsNow();
  assert.equal(R(2, '状態'), '資料待ち');
  assert.equal(env.discord.length, 2);
  assert.ok(!env.discord[1].includes('EX1-') && !/EX1（/.test(env.discord[1]) && env.discord[1].includes('EX2'), env.discord[1]);
  tab.set(rowOf('EX1'), sh.indexOf('資料待ち') + 1, false);
  env.g.syncRegistrationsNow();
  assert.notEqual(R(2, '状態'), '資料待ち', '外すと元の状態');
});

test('枝番（部屋・建物）：『案件入力』で枝番を書くと②の視点すべての部屋名になり、同じ案件の中で 2F視点①・3F視点① と分かれる（日本語の A棟 も可）', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const f = admin.getSheetByName('案件入力');
  const m = JSON.parse(JSON.stringify(env.g.formMap_(f)));
  const LC = JSON.parse(JSON.stringify(env.g.FORM_LC)); const KEY = env.g.FORM_KEY_COL;
  const cell = (r, c) => (f.rows[r - 1] || [])[c - 1];
  assert.ok(m.fields.branch === m.fields.number + 1, '枝番は案件番号のすぐ下');
  const edit = (r, c, v) => { f.set(r, c, v); env.g.onAdminEdit({ range: f.getRange(r, c), source: admin }); };
  const list = () => { const out = []; for (let r = m.list1; r <= m.list2; r++) if (cell(r, KEY)) out.push({ r, code: cell(r, KEY), room: cell(r, LC.room) || '', ext: cell(r, LC.ext) }); return out; };
  const brief = () => list().map(x => x.code + (x.room ? '_' + x.room : '') + ':' + x.ext);
  const inn = m.grid.find(g => g.keyword === 'IN').row;
  // 先に枝番 → 選んだ視点に付く
  edit(m.fields.branch, 2, '2F');
  edit(inn, 2, true); edit(inn, 3, true);
  same(brief(), ['IN1_2F:2F内観目線視点①', 'IN2_2F:2F内観目線視点②']);
  // あとから枝番を直すと、②の部屋名もそろう
  edit(m.fields.branch, 2, '3F');
  same(brief(), ['IN1_3F:3F内観目線視点①', 'IN2_3F:3F内観目線視点②']);
  // 人が別の部屋名にした行はそのまま
  const rowOf = (code) => list().find(x => x.code === code).r;
  edit(rowOf('IN2'), LC.room, 'ロビー');
  edit(m.fields.branch, 2, '2F');
  same(brief(), ['IN1_2F:2F内観目線視点①', 'IN2_ロビー:ロビー内観目線視点②']);
  edit(rowOf('IN2'), LC.room, '2F');
  ['code', 'number', 'name', 'link'].forEach((k, j) => f.set(m.fields[k], 2, ['OFFICE', 55, 'オフィス', LINK][j]));
  edit(m.submit, 2, true);
  let res = env.g.submitFormSheet('');
  assert.equal(res.ok, true, res.msg);
  const reg = admin.getSheetByName('登録一覧');
  const rh = reg.header();
  const R = (row, name) => reg.rows[row - 1][rh.indexOf(name)];
  same([R(2, '会社コード'), R(2, '案件番号'), R(2, '枝番'), R(2, '視点'), R(2, '社外視点名')], ['OFFICE', 55, '2F', 'IN1_2F', '2F内観目線視点①'], '案件はそのまま（別の案件にしない）');
  assert.equal(cell(m.fields.branch, 2), '', '登録したら枝番も空に');
  // 別の枝番（3F）でも 視点① から。A棟（日本語）も使える
  // 枝番が2つ以上：書いたとたんに「枝番ごとの視点」の画面が開き、全部の枝番の視点を1つの画面で選ぶ
  env.dialogs.length = 0;
  edit(m.fields.branch, 2, '3F,A棟');
  const SEL = env.g.FORM_BR.sel1;
  assert.equal(cell(m.fields.branch, env.g.FORM_BR.label1), '枝番と視点を画面で選ぶ →', '枝番の右に画面を開くチェック');
  assert.equal(env.dialogs.length, 1, '枝番を2つ以上書くと画面が開く');
  const dh = String(env.dialogs[0].html || env.dialogs[0]);
  assert.ok(dh.includes('"3F"') && dh.includes('"A棟"') && dh.includes('内観目線'), '画面に全部の枝番と区分');
  new vm.Script(dh.split('<script>')[1].split('</script>')[0]);
  assert.ok(!dh.split('<script>')[1].includes('\\'), '画面のスクリプトにバックスラッシュが無い');
  // 画面の動き（偽の DOM）：A棟の 内観目線1・2 を押して「3F と同じ」…「決定」で saveBranchViews に枝番ごとの視点が届く
  {
    const made = [];
    const node = (tag) => { const n = { tag, children: [], className: '', textContent: '', handlers: {}, disabled: false, type: '',
      appendChild(c) { this.children.push(c); return c; }, addEventListener(ev, fn) { this.handlers[ev] = fn; },
      set innerHTML(v) { this.children = []; } }; made.push(n); return n; };
    const els = { list: node('div'), msg: node('div'), go: node('button'), cancel: node('button'), room: node('input'), addRoom: node('button') };
    els.room.value = '';
    let sent = null;
    const run = { withSuccessHandler() { return run; }, withFailureHandler() { return run; }, saveBranchViews(o, r) { sent = o; sentRooms = r; } };
    let sentRooms = null;
    vm.runInContext(dh.split('<script>')[1].split('</script>')[0], vm.createContext({ document: { getElementById: (id) => els[id], createElement: node }, google: { script: { run, host: { close() {} } } }, String, JSON }));
    const buttons = () => { const out = []; const walk = (n) => { if (n.tag === 'button') out.push(n); n.children.forEach(walk); }; walk(els.list); return out; };
    const blocks = () => els.list.children;
    const numIn = (bi, label, i) => { const row = blocks()[bi].children.find(c => c.children && c.children[0] && c.children[0].textContent === label); return row.children[i]; };
    numIn(1, '内観目線', 1).handlers.click();
    numIn(1, '内観目線', 2).handlers.click();
    numIn(0, '内観目線', 1).handlers.click();
    assert.ok(buttons().some(b => b.textContent === '3F と同じにする'), '2つ目からは「前の枝番と同じにする」');
    // 同じ画面で枝番を足す（「b棟, 4f」→ B棟・4F）。足した枝番は前の枝番の視点から始まる
    els.room.value = 'b棟、4f';
    els.addRoom.handlers.click();
    assert.equal(els.room.value, '', '追加したら入力欄は空に');
    assert.equal(blocks().length, 4, '枝番が4つに');
    numIn(3, '内観目線', 3).handlers.click(); // 4F だけ 内観目線3 も
    // 枝番を消す
    blocks()[0].children[0].children[0].children.find(b => b.textContent === '枝番を消す').handlers.click();
    assert.equal(blocks().length, 3);
    els.go.handlers.click();
    same(JSON.parse(JSON.stringify(sent)), { 'A棟': ['IN1', 'IN2'], 'B棟': ['IN1', 'IN2'], '4F': ['IN1', 'IN2', 'IN3'] });
    same(JSON.parse(JSON.stringify(sentRooms)), ['A棟', 'B棟', '4F'], '画面の枝番の並びも届く');
  }
  ['code', 'number', 'name', 'link'].forEach((k, j) => f.set(m.fields[k], 2, ['OFFICE', 55, 'オフィス', LINK][j]));
  // 画面で「決定」：3F は 視点①、A棟 は 視点①②
  let sv = env.g.saveBranchViews({ '3F': ['IN1'], 'A棟': ['IN1', 'IN2'] });
  assert.equal(sv.ok, true);
  same(brief(), ['IN1_3F:3F内観目線視点①', 'IN1_A棟:A棟内観目線視点①', 'IN2_A棟:A棟内観目線視点②']);
  same([cell(inn, 2), cell(inn, 3)], [true, true], '①はどれかの枝番にある視点にチェック');
  assert.ok(String(cell(m.result, 2)).includes('3F 1件・A棟 2件'), cell(m.result, 2));
  // ①で新しくチェックした視点は全部の枝番に、外した視点は全部の枝番から
  edit(inn, 4, true);
  same(brief(), ['IN1_3F:3F内観目線視点①', 'IN3_3F:3F内観目線視点③', 'IN1_A棟:A棟内観目線視点①', 'IN2_A棟:A棟内観目線視点②', 'IN3_A棟:A棟内観目線視点③']);
  edit(inn, 4, false);
  same(brief(), ['IN1_3F:3F内観目線視点①', 'IN1_A棟:A棟内観目線視点①', 'IN2_A棟:A棟内観目線視点②'], '画面で選んだ枝番ごとの違いは残る');
  // チェックでもう一度画面を開ける。いまの選択が入っている
  env.dialogs.length = 0;
  edit(m.fields.branch, SEL, true);
  assert.equal(env.dialogs.length, 1);
  assert.ok(String(env.dialogs[0].html || env.dialogs[0]).includes('"A棟":["IN1","IN2"]'), 'いまの選択が画面に入る');
  assert.equal(cell(m.fields.branch, SEL), false, 'チェックは外れる');
  // 枝番を一覧から消すと、その枝番の行も消える
  edit(m.fields.branch, 2, 'A棟,3F,B棟');
  sv = env.g.saveBranchViews({ 'A棟': ['IN1', 'IN2'], '3F': ['IN1'], 'B棟': [] });
  same(brief(), ['IN1_A棟:A棟内観目線視点①', 'IN2_A棟:A棟内観目線視点②', 'IN1_3F:3F内観目線視点①'], '枝番の順に並ぶ');
  // 画面で足した・消した枝番は、シートの「枝番」にも入る
  sv = env.g.saveBranchViews({ '3F': ['IN1'], 'A棟': ['IN1', 'IN2'], 'C棟': ['IN1'] }, ['3F', 'A棟', 'C棟']);
  assert.equal(cell(m.fields.branch, 2), '3F,A棟,C棟', '画面で足した枝番がシートに');
  same(brief(), ['IN1_3F:3F内観目線視点①', 'IN1_A棟:A棟内観目線視点①', 'IN2_A棟:A棟内観目線視点②', 'IN1_C棟:C棟内観目線視点①']);
  sv = env.g.saveBranchViews({ '3F': ['IN1'], 'A棟': ['IN1', 'IN2'] }, ['3F', 'A棟']);
  assert.equal(cell(m.fields.branch, 2), '3F,A棟', '画面で消した枝番はシートからも');
  same(brief(), ['IN1_3F:3F内観目線視点①', 'IN1_A棟:A棟内観目線視点①', 'IN2_A棟:A棟内観目線視点②'], '消した枝番の行も消える');
  edit(m.submit, 2, true);
  res = env.g.submitFormSheet('');
  assert.equal(res.ok, true, res.msg);
  const cuts = reg.rows.slice(1).map(r => r[rh.indexOf('視点')]).filter(Boolean);
  same(cuts.slice().sort(), ['IN1_2F', 'IN1_3F', 'IN1_A棟', 'IN2_2F', 'IN2_A棟']);
  const brOf = (cut) => reg.rows.find(r => r[rh.indexOf('視点')] === cut)[rh.indexOf('枝番')];
  same([brOf('IN1_3F'), brOf('IN2_A棟')], ['3F', 'A棟'], '『登録一覧』の枝番は行ごとにその枝番');
  assert.equal(cell(m.fields.branch, SEL), false, '登録したら画面を開くチェックも外れる');
  // 前回の視点を呼び出す：枝番を書くとその枝番の視点だけ
  f.set(m.fields.code, 2, 'OFFICE'); f.set(m.fields.number, 2, 55); f.set(m.fields.branch, 2, '2F');
  edit(m.prev, 2, true);
  same(brief(), ['IN1_2F:2F内観目線視点①', 'IN2_2F:2F内観目線視点②']);
  // 転記：取込キーは同じ案件（OFFICE55）の中で枝番ごとに別の視点（どれも1回目）
  const staff = inTab(eng);
  const sh = staff.rows[1].map(h => String(h).split('\n')[0]);
  assert.ok(sh.indexOf('枝番') < 0, 'エンジニア入力シートに枝番の列は足さない（視点が IN1_2F になる）');
  staff.rows.forEach((row, i) => { if (i >= 2 && row[sh.indexOf('視点')]) { staff.set(i + 1, sh.indexOf('Color') + 1, 1); } });
  env.g.transferFromStaffSheet();
  const link = admin.getSheetByName('連携');
  const keys = link.rows.slice(1).map(r => r[0]).filter(Boolean).sort();
  same(keys, ['OFFICE55::IN1_2F::1', 'OFFICE55::IN1_3F::1', 'OFFICE55::IN1_A棟::1', 'OFFICE55::IN2_2F::1', 'OFFICE55::IN2_A棟::1']);
});

test('枝番：『案件登録』タブの枝番は、部屋名の無い視点にだけ付く', () => {
  const g = makeEnv({ admin: adminSheet(), files: {} }).g;
  same(JSON.parse(JSON.stringify(g.withBranchRoom_({ cut: 'INE1', branch: 'B棟' }))).cut, 'INE1_B棟');
  same(JSON.parse(JSON.stringify(g.withBranchRoom_({ cut: 'INE1_2F', branch: 'B棟' }))).cut, 'INE1_2F');
  same(JSON.parse(JSON.stringify(g.withBranchRoom_({ cut: 'INE1', branch: '' }))).cut, 'INE1');
});

test('お客様担当者：『登録一覧』の「担当者」はお客様の担当者。前の見出しは「お客様担当者」に書き換え、工程図の作業の担当者には入れない／入ってしまった名前を直す', () => {
  const admin = adminSheet();
  const eng = engineerFile();
  const env = makeEnv({ admin, files: { [NEW_ID]: eng } });
  env.g.quickSetup();
  const reg = admin.getSheetByName('登録一覧');
  // 前の版の見出し（担当者）に戻しておく → 初期設定・読み込みで「お客様担当者」に直る
  const hi = reg.header().indexOf('お客様担当者');
  assert.ok(hi >= 0, '見出しは「お客様担当者」');
  reg.set(1, hi + 1, '担当者');
  assert.equal(env.g.regHeaderMap_(reg).assignee, hi + 1, '前の見出しでも読める');
  env.g.quickSetup();
  assert.equal(reg.header()[hi], 'お客様担当者', '初期設定で見出しを書き換える');
  assert.equal(reg.header().filter(h => h === 'お客様担当者').length, 1, '列は増えない');
  const rh = reg.header();
  const setR = (r, name, v) => reg.set(r, rh.indexOf(name) + 1, v);
  ['会社コード', '案件番号', '社外案件名', 'お客様担当者', '新規or修正', '視点', 'サーバーリンク'].forEach((h, j) => setR(2, h, ['RIC', 34, 'マンション', '竹内様', NEWR, 'EX1', LINK][j]));
  env.g.syncRegistrationsNow();
  const tab = inTab(eng);
  const sh = tab.header(2).map(h => h.split('\n')[0]);
  tab.set(3, sh.indexOf('White躯体') + 1, 2);
  env.g.transferFromStaffSheet();
  const { at } = linkAt(admin);
  same([at(2, '担当者'), at(2, 'お客様担当者')], ['', '竹内様'], '『連携』では お客様担当者 に入る');
  // 『登録一覧』のお客様担当者を直すと、次の転記で『連携』も直る
  setR(2, 'お客様担当者', '竹内 様');
  env.g.transferFromStaffSheet();
  assert.equal(linkAt(admin).at(2, 'お客様担当者'), '竹内 様');

  // 前の版で入ってしまった分を直す：『連携』の担当者・工程図の作業・予定のまとめ・『予定_竹内 様』タブ
  const link = admin.getSheetByName('連携');
  const lh = link.header();
  link.set(2, lh.indexOf('担当者') + 1, '竹内 様');
  link.set(2, lh.indexOf('お客様担当者') + 1, '');
  [['t1', '竹内 様', 'pending'], ['t2', '竹内 様', 'done'], ['t3', 'Mr.Dung', 'pending'], ['t4', '上田', 'pending']].forEach(([id, who, st]) =>
    env.fs.putTask(id, { id: { stringValue: id }, assignee: { stringValue: who }, status: { stringValue: st }, customerContact: { stringValue: '' } }));
  env.fs.docs['workspaces/liebe-asia-team/data/employeeMaster'] = { value: { stringValue: JSON.stringify([{ name: 'Mr.Dung' }, { name: '上田' }]) } };
  setR(3, 'お客様担当者', '上田'); // 社員マスタにある名前は直さない
  env.fs.docs['workspaces/liebe-asia-team/data/scheduleSnapshot'] = { value: { stringValue: JSON.stringify({ updatedAt: 1, items: { 'RIC34::EX1::1': { a: '竹内 様・Mr.Dung' } }, plan: { from: '2026-11-10', days: 14, rows: [{ a: '竹内 様', p: 'RIC.34' }] } }) } };
  admin.insertSheet('予定_竹内 様');
  admin.insertSheet('予定_Mr.Dung');
  const msg = env.g.fixClientContactAssignees();
  assert.ok(msg.includes('工程図の作業：2件'), msg);
  const tk = (id) => env.fs.tasks().find(t => t.id === id);
  same([tk('t1').assignee, tk('t1').customerContact, tk('t2').assignee, tk('t3').assignee, tk('t4').assignee], ['未割当', '竹内 様', '未割当', 'Mr.Dung', '上田']);
  same([linkAt(admin).at(2, '担当者'), linkAt(admin).at(2, 'お客様担当者')], ['', '竹内 様']);
  const snap = JSON.parse(env.fs.docs['workspaces/liebe-asia-team/data/scheduleSnapshot'].value.stringValue);
  same([snap.items['RIC34::EX1::1'].a, snap.plan.rows[0].a], ['未割当・Mr.Dung', '未割当']);
  same([!!admin.getSheetByName('予定_竹内 様'), !!admin.getSheetByName('予定_Mr.Dung')], [false, true], 'お客様の名前の予定表タブだけ消す');
  assert.equal(env.discord.length, 0, 'Discord には送らない');
});

console.log(`\n${passed} tests passed`);
