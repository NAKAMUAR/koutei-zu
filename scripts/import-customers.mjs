// お客様マスタ 一括登録スクリプト（ローカル実行専用）
// =====================================================================
// このスクリプトは「あなたのMac」でだけ実行します。サービスアカウント鍵を使い、
// Firestore の customerMaster に会社データを直接追記します（GitHub には何も載りません）。
//
// 使い方は scripts/README.md を参照してください。要点だけ：
//   1) Firebase コンソールでサービスアカウント鍵(JSON)を発行 → scripts/service-account.json に保存
//   2) お客様データ（タブ区切り）を scripts/customers.local.tsv に保存
//   3) npm i -D firebase-admin
//   4) node scripts/import-customers.mjs            ← まず内容確認（書き込みなし）
//      node scripts/import-customers.mjs --write    ← 実際に書き込み
//
// 列順: 会社名 / 担当者名 / 郵便番号 / 住所 / 電話番号 / メール / URL
// 鍵・データファイルは .gitignore 済み。実行後、鍵は削除して構いません。
// =====================================================================

import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const WORKSPACE_ID = 'liebe-asia-team'; // firebase.js の WORKSPACE_ID と一致させること
const DATABASE_ID = 'default';          // firebase.js の DATABASE_ID と一致させること
const KEY_PATH = process.env.SA_KEY || 'scripts/service-account.json';
const DATA_PATH = process.env.DATA || 'scripts/customers.local.tsv';
const WRITE = process.argv.includes('--write');

// ---- 貼り付けテキスト → 行×列（クォート内の改行・タブ・"" に対応） ----
function parseTabularText(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === '\t') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

let _n = 0;
const newId = (p) => `${p}-${Date.now()}-${(_n++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// ---- 1行（列配列）→ お客様マスタの会社レコード ----
function customerRowToRecord(cols) {
  const clean = (v) => { const s = (v == null ? '' : String(v)).trim(); return s === '-' || s === '−' ? '' : s; };
  const company = clean(cols[0]).split(/\n/)[0].replace(/\s*様\s*$/, '').trim();
  if (!company) return null;
  const rep = clean(cols[1]).replace(/\s+/g, ' ');
  const postalCode = clean(cols[2]).replace(/^〒/, '').trim();
  const address = clean(cols[3]).replace(/\s*\n\s*/g, ' ').trim();
  const phone = clean(cols[4]).replace(/\s*\n\s*/g, ' ').trim();
  const email = clean(cols[5]).replace(/＠/g, '@');
  let url = clean(cols[6]);
  const md = url.match(/\((https?:[^)]+)\)/);
  if (md) url = md[1];
  if (!/^https?:/.test(url)) url = url.replace(/^\[|\]$/g, '');
  const contacts = [];
  if (rep || email) contacts.push({ id: newId('cc'), name: rep, email });
  return { id: newId('cust'), company, contractType: 'labo', representative: rep, phone, postalCode, address, websiteUrl: url, contacts };
}

async function main() {
  // 入力チェック
  if (!existsSync(KEY_PATH)) {
    console.error(`✖ サービスアカウント鍵が見つかりません: ${KEY_PATH}\n  Firebase コンソール > プロジェクトの設定 > サービスアカウント > 新しい秘密鍵を生成 で取得してください。`);
    process.exit(1);
  }
  if (!existsSync(DATA_PATH)) {
    console.error(`✖ データファイルが見つかりません: ${DATA_PATH}\n  いただいた表（タブ区切り）をこのパスに保存してください。`);
    process.exit(1);
  }

  let admin;
  try {
    admin = require('firebase-admin');
  } catch {
    console.error('✖ firebase-admin が未インストールです。先に実行してください:\n  npm i -D firebase-admin');
    process.exit(1);
  }
  const { getFirestore } = require('firebase-admin/firestore');

  const serviceAccount = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
  const app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = getFirestore(app, DATABASE_ID);

  // 既存の customerMaster を読み込む（消さずに追記マージ）
  const ref = db.collection('workspaces').doc(WORKSPACE_ID).collection('data').doc('customerMaster');
  const snap = await ref.get();
  let existing = [];
  if (snap.exists) {
    try { existing = JSON.parse(snap.get('value') || '[]'); } catch { existing = []; }
  }
  const existingNames = new Set((existing || []).map(c => (c.company || '').trim()));

  // データを解析して新規レコードを作成（会社名が既存ならスキップ）
  const rows = parseTabularText(readFileSync(DATA_PATH, 'utf8'));
  const added = [];
  let skipped = 0;
  for (const cols of rows) {
    const rec = customerRowToRecord(cols);
    if (!rec) continue;
    if (existingNames.has(rec.company)) { skipped++; continue; }
    existingNames.add(rec.company);
    added.push(rec);
  }

  console.log(`既存: ${existing.length}社 / 取り込み対象（新規）: ${added.length}社 / 既登録のためスキップ: ${skipped}社`);
  console.log('--- 追加される会社（先頭20件）---');
  added.slice(0, 20).forEach((c, i) => console.log(`  ${i + 1}. ${c.company}｜担当:${c.representative || '-'}｜${c.contacts[0]?.email || '-'}`));
  if (added.length > 20) console.log(`  …ほか ${added.length - 20}社`);

  if (!WRITE) {
    console.log('\n※ これは確認モードです（書き込みしていません）。問題なければ --write を付けて再実行してください:\n  node scripts/import-customers.mjs --write');
    await app.delete();
    return;
  }
  if (added.length === 0) {
    console.log('\n追加対象がないため、書き込みは行いません。');
    await app.delete();
    return;
  }

  const merged = [...existing, ...added];
  await ref.set({ value: JSON.stringify(merged), updatedAt: Date.now() });
  console.log(`\n✔ 書き込み完了。customerMaster は ${merged.length}社になりました。`);
  console.log('  アプリを開くと（設定 > お客様マスタ）反映されています。');
  await app.delete();
}

main().catch((e) => { console.error('✖ エラー:', e); process.exit(1); });
