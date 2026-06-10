/**
 * 工程図（koutei-zu）スプレッドシート → Firestore 同期
 *
 * 機能:
 *  - 案件シートの 3832 行目以降の AD 列(チェックボックス)=FALSE の行を取得
 *  - 社外案件名(C列)/社内案件名(B列)/視点名(D列)/制作時間(J+Q)/担当者(H列) を抽出
 *  - externalId = `${正規化案件コード}::${視点名}` で重複防止
 *  - 既存タスクは hours/projectName/projectNameInternal のみ更新（priority/completedHours/assignee 等は維持）
 *  - シートから消えた既存タスクは残す（自動削除しない）
 *  - 結果を Firestore workspaces/${WORKSPACE_ID}/data/tasks に書き戻す
 *
 * 使い方:
 *  1. スプレッドシートのメニュー: 拡張機能 > Apps Script
 *  2. 既存コードを全消ししてこのファイルを貼り付け
 *  3. CONFIG を必要に応じて編集
 *  4. 関数 `syncSheetToKouteiZu` を選んで実行（初回は権限承認が必要）
 *  5. 任意で「トリガー > 時間主導型」を設定（例: 毎時／毎朝）
 */

// ============ CONFIG ============
const CONFIG = {
  FIREBASE_API_KEY: 'AIzaSyA2iQimhNq11ElsLb57qq3fuKx_3OGIcPE',
  PROJECT_ID: 'koutei-zu',
  WORKSPACE_ID: 'liebe-asia-team',
  DATA_KEY: 'tasks',

  // 対象シートの名前（空なら最初のシート）
  SHEET_NAME: '',

  // データ範囲（1-indexed）
  ROW_START: 3832,
  ROW_END: 0,        // 0 なら自動検出（最終行まで）

  // 列番号（1-indexed）
  COL_INTERNAL: 2,   // B: 社内案件名（案件コード）
  COL_EXTERNAL: 3,   // C: 社外案件名
  COL_VIEW: 4,       // D: 視点名
  COL_WHITE: 10,     // J: White 時間
  COL_COLOR: 17,     // Q: Color 時間
  COL_ASSIGNEE: 8,   // H: 担当者
  COL_CHECKBOX: 30,  // AD: 完了チェック

  DEFAULT_ASSIGNEE: '未割当',
};

// ============ メイン ============
function syncSheetToKouteiZu() {
  const start = Date.now();
  const idToken = signInAnonymously_();
  const existing = readFirestoreTasks_(idToken);
  const deletedIds = readDeletedIds_(idToken);
  const sheetRows = readSheetRows_();

  const { merged, added, updated, skippedDeleted, keptOnlyInApp } =
    mergeTasks_(existing, sheetRows, deletedIds);

  writeFirestoreTasks_(idToken, merged);

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  const summary =
    `同期完了 (${elapsed}s)\n` +
    `  シート対象行   : ${sheetRows.length}\n` +
    `  新規追加       : ${added}\n` +
    `  更新           : ${updated}\n` +
    `  削除済みでスキップ: ${skippedDeleted}（工程図で削除済み、シートに残っているが復活させない）\n` +
    `  アプリ側のみ   : ${keptOnlyInApp}（シート外の手動タスクとして保持）\n` +
    `  合計タスク数   : ${merged.length}`;
  console.log(summary);
  return summary;
}

/** 工程図側で削除されたタスクの externalId リストをすべて消去
 * （= 全てを再同期で復活させたい時に使う） */
function clearDeletedList() {
  const idToken = signInAnonymously_();
  writeRawDoc_(idToken, 'deletedExternalIds', { value: '[]' });
  const msg = '削除済みリストをクリアしました。次回同期で全件が復活対象になります。';
  console.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { /* トリガー実行時はUI無し */ }
}

// 手動実行用：メニューに「同期を実行」ボタンを追加
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('工程図同期')
    .addItem('Firestore に同期', 'syncSheetToKouteiZu')
    .addItem('シートだけプレビュー（書き込まない）', 'dryRun')
    .addSeparator()
    .addItem('削除済みリストをクリア（全件復活）', 'clearDeletedList')
    .addToUi();
}

function dryRun() {
  const rows = readSheetRows_();
  const sample = rows.slice(0, 5).map(r => `  ${r.externalId}  ${r.projectName}  ${r.hours}h`).join('\n');
  const msg = `シート抽出件数: ${rows.length}\n先頭5件:\n${sample}`;
  console.log(msg);
  SpreadsheetApp.getUi().alert(msg);
}

// ============ シート読み取り ============
function readSheetRows_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = CONFIG.SHEET_NAME ? ss.getSheetByName(CONFIG.SHEET_NAME) : ss.getSheets()[0];
  if (!sheet) throw new Error('シートが見つかりません: ' + CONFIG.SHEET_NAME);

  const lastRow = CONFIG.ROW_END || sheet.getLastRow();
  if (lastRow < CONFIG.ROW_START) return [];

  const numRows = lastRow - CONFIG.ROW_START + 1;
  const numCols = Math.max(CONFIG.COL_CHECKBOX, CONFIG.COL_COLOR);
  const values = sheet.getRange(CONFIG.ROW_START, 1, numRows, numCols).getValues();

  const tasks = [];
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const internalCode = trimStr_(row[CONFIG.COL_INTERNAL - 1]);
    const externalName = trimStr_(row[CONFIG.COL_EXTERNAL - 1]);
    const view = trimStr_(row[CONFIG.COL_VIEW - 1]);
    const checked = row[CONFIG.COL_CHECKBOX - 1];
    if (!internalCode || !view) continue;            // 案件コード or 視点なし → 無視
    if (checked === true || checked === 'TRUE') continue; // 完了済みは無視

    const whiteHours = toNumber_(row[CONFIG.COL_WHITE - 1]);
    const colorHours = toNumber_(row[CONFIG.COL_COLOR - 1]);
    const assignee = trimStr_(row[CONFIG.COL_ASSIGNEE - 1]) || CONFIG.DEFAULT_ASSIGNEE;

    tasks.push({
      externalId: buildExternalId_(internalCode, view),
      projectNameInternal: internalCode,
      projectName: externalName || internalCode,
      viewpointName: view,
      assignee,
      hours: whiteHours + colorHours,
      whiteHours,
      colorHours,
      sourceRow: CONFIG.ROW_START + i,
    });
  }
  return tasks;
}

function buildExternalId_(code, view) {
  const norm = String(code).replace(/[.\s]/g, '').toUpperCase();
  const v = String(view).trim();
  return `${norm}::${v}`;
}

// ============ マージロジック（重複防止 + 削除尊重） ============
function mergeTasks_(existing, sheetTasks, deletedIds) {
  const sheetById = new Map();
  sheetTasks.forEach(t => sheetById.set(t.externalId, t));

  const existingIds = new Set();
  existing.forEach(t => { if (t.externalId) existingIds.add(t.externalId); });

  let added = 0;
  let updated = 0;
  let skippedDeleted = 0;
  let keptOnlyInApp = 0;
  const merged = [];

  // 1) 既存タスク群: シートに同じ externalId があれば更新、なければそのまま残す
  existing.forEach(t => {
    if (t.externalId && sheetById.has(t.externalId)) {
      const s = sheetById.get(t.externalId);
      merged.push({
        ...t,
        // シート由来で上書きする項目
        projectName: s.projectName,
        projectNameInternal: s.projectNameInternal,
        viewpointName: s.viewpointName,
        hours: s.hours,
        whiteHours: s.whiteHours,
        colorHours: s.colorHours,
        sourceRow: s.sourceRow,
        // 以下は維持: priority / completedHours / assignee / status / manualStart / stepName / stepOrder / createdAt / id
      });
      updated++;
    } else {
      merged.push(t);
      if (t.externalId) keptOnlyInApp++;
    }
  });

  // 2) シートにあって既存にないもの → 削除済みでなければ新規追加
  sheetTasks.forEach(s => {
    if (existingIds.has(s.externalId)) return;       // 既存にあれば既に処理済み
    if (deletedIds.has(s.externalId)) {              // ユーザーが工程図側で削除済み
      skippedDeleted++;
      return;
    }
    merged.push({
      id: Utilities.getUuid(),
      externalId: s.externalId,
      projectName: s.projectName,
      projectNameInternal: s.projectNameInternal,
      viewpointName: s.viewpointName,
      assignee: s.assignee,
      hours: s.hours,
      whiteHours: s.whiteHours,
      colorHours: s.colorHours,
      completedHours: 0,
      priority: 99,
      status: 'pending',
      stepName: null,
      stepOrder: null,
      manualStart: null,
      createdAt: Date.now(),
      sourceRow: s.sourceRow,
    });
    added++;
  });

  return { merged, added, updated, skippedDeleted, keptOnlyInApp };
}

// ============ Firebase 認証（匿名サインイン） ============
function signInAnonymously_() {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${CONFIG.FIREBASE_API_KEY}`;
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ returnSecureToken: true }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) {
    throw new Error('匿名サインイン失敗: ' + res.getContentText());
  }
  return JSON.parse(res.getContentText()).idToken;
}

// ============ Firestore 読み書き ============
function readFirestoreTasks_(idToken) {
  const valueStr = readRawValueString_(idToken, CONFIG.DATA_KEY);
  if (!valueStr) return [];
  try {
    const parsed = JSON.parse(valueStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('既存タスクのJSONパース失敗。空配列として続行: ' + e);
    return [];
  }
}

function readDeletedIds_(idToken) {
  const valueStr = readRawValueString_(idToken, 'deletedExternalIds');
  if (!valueStr) return new Set();
  try {
    const arr = JSON.parse(valueStr);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    console.warn('削除済みリストのJSONパース失敗。空集合として続行: ' + e);
    return new Set();
  }
}

function writeFirestoreTasks_(idToken, tasks) {
  writeRawDoc_(idToken, CONFIG.DATA_KEY, { value: JSON.stringify(tasks) });
}

function readRawValueString_(idToken, key) {
  const url = firestoreDocUrl_(key);
  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + idToken },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() === 404) return null;
  if (res.getResponseCode() >= 300) {
    throw new Error(`Firestore 読み込み失敗 (${key}): ` + res.getContentText());
  }
  const doc = JSON.parse(res.getContentText());
  return doc.fields && doc.fields.value && doc.fields.value.stringValue || null;
}

function writeRawDoc_(idToken, key, payload) {
  const url = firestoreDocUrl_(key) +
    '?updateMask.fieldPaths=value&updateMask.fieldPaths=updatedAt';
  const body = {
    fields: {
      value: { stringValue: payload.value },
      updatedAt: { integerValue: String(Date.now()) },
    },
  };
  const res = UrlFetchApp.fetch(url, {
    method: 'patch',
    headers: { Authorization: 'Bearer ' + idToken },
    contentType: 'application/json',
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) {
    throw new Error(`Firestore 書き込み失敗 (${key}): ` + res.getContentText());
  }
}

function firestoreDocUrl_(key) {
  return `https://firestore.googleapis.com/v1/projects/${CONFIG.PROJECT_ID}` +
    `/databases/(default)/documents/workspaces/${CONFIG.WORKSPACE_ID}` +
    `/data/${key}`;
}

// ============ ユーティリティ ============
function trimStr_(v) { return (v == null ? '' : String(v)).trim(); }
function toNumber_(v) { const n = Number(v); return isFinite(n) ? n : 0; }
