// お客様マスタ 担当者の一括追加（ローカル実行専用）
// =====================================================================
// 既存の customerMaster に「担当者」だけを追記マージするスクリプト。
// 会社は新規作成しません（会社名で既存と突き合わせ、見つからなければ警告のみ）。
//
// 認証は import-customers.mjs と同じ：
//   (A) gcloud ログイン（推奨）: gcloud auth application-default login
//   (B) サービスアカウント鍵: scripts/service-account.json
//
// 列順: 会社名 / 担当者名 / メール / 電話番号 / Gmail(=emailのフォールバック)
//   - メールが空のとき Gmail を email として使用
//   - 既存に同一メールの担当者がいれば重複追加しない（メールが空のときは名前で重複判定）
//
// 使い方:
//   node scripts/import-contacts.mjs           ← 確認モード（書き込みなし）
//   node scripts/import-contacts.mjs --write   ← 実際に書き込み
// =====================================================================

import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const PROJECT_ID = 'koutei-zu';
const WORKSPACE_ID = 'liebe-asia-team';
const DATABASE_ID = 'default';
const KEY_PATH = process.env.SA_KEY || 'scripts/service-account.json';
const DATA_PATH = process.env.DATA || 'scripts/contacts.local.tsv';
const WRITE = process.argv.includes('--write');

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

const clean = (v) => { const s = (v == null ? '' : String(v)).trim(); return s === '-' || s === '−' ? '' : s; };
// 会社名のマッチ用に正規化（全角/半角スペース・末尾「様」を吸収）
const normCompany = (s) => clean(s).replace(/\s*様\s*$/, '').replace(/[\s　]+/g, '').toLowerCase();
const normEmail = (s) => clean(s).replace(/＠/g, '@').toLowerCase();

async function main() {
  if (!existsSync(DATA_PATH)) {
    console.error(`✖ データファイルが見つかりません: ${DATA_PATH}`);
    process.exit(1);
  }

  let admin;
  try { admin = require('firebase-admin'); }
  catch { console.error('✖ firebase-admin が未インストールです: npm i -D firebase-admin'); process.exit(1); }
  const { getFirestore } = require('firebase-admin/firestore');

  let app;
  if (existsSync(KEY_PATH)) {
    const serviceAccount = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
    app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: PROJECT_ID });
    console.log(`認証: サービスアカウント鍵（${KEY_PATH}）`);
  } else {
    app = admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
    console.log('認証: gcloud ログイン（ADC）');
  }
  const db = getFirestore(app, DATABASE_ID);

  const ref = db.collection('workspaces').doc(WORKSPACE_ID).collection('data').doc('customerMaster');
  const snap = await ref.get();
  let customers = [];
  if (snap.exists) { try { customers = JSON.parse(snap.get('value') || '[]'); } catch { customers = []; } }

  // 会社名 → customer の索引
  const byKey = new Map();
  for (const c of customers) byKey.set(normCompany(c.company), c);

  const rows = parseTabularText(readFileSync(DATA_PATH, 'utf8'));
  const unmatchedCompanies = new Set();
  const addedPerCompany = new Map();
  let added = 0, skippedDup = 0, skippedEmpty = 0;

  for (const cols of rows) {
    const company = clean(cols[0]);
    const name = clean(cols[1]);
    if (!company) continue;
    if (!name && !clean(cols[2]) && !clean(cols[3])) { skippedEmpty++; continue; }

    const cust = byKey.get(normCompany(company));
    if (!cust) { unmatchedCompanies.add(company); continue; }

    let email = clean(cols[2]).replace(/＠/g, '@');
    // メール列に複数アドレス（改行/カンマ区切り）があれば1つ目を使う
    if (/[\n,]/.test(email)) email = email.split(/[\n,]/).map(s => s.trim()).filter(Boolean)[0] || '';
    const phone = clean(cols[3]).replace(/\s*\n\s*/g, ' ');
    const gmail = clean(cols[4]).replace(/＠/g, '@');
    if (!email && gmail) email = gmail;

    // 重複判定
    const existingContacts = cust.contacts || [];
    const ne = normEmail(email);
    let dup = false;
    if (ne) {
      dup = existingContacts.some(ct => normEmail(ct.email || '') === ne);
    } else {
      dup = existingContacts.some(ct => (ct.name || '').trim() === name && !(ct.email || '').trim());
    }
    if (dup) { skippedDup++; continue; }

    cust.contacts = [...existingContacts, { id: newId('cc'), name, branchName: '', phone, email }];
    added++;
    addedPerCompany.set(cust.company, (addedPerCompany.get(cust.company) || 0) + 1);
  }

  console.log(`追加: ${added}件 / 重複スキップ: ${skippedDup}件 / 空行スキップ: ${skippedEmpty}件`);
  if (unmatchedCompanies.size) {
    console.log(`\n⚠ 既存お客様マスタに見つからなかった会社名（${unmatchedCompanies.size}件）:`);
    [...unmatchedCompanies].forEach(c => console.log(`  - ${c}`));
  }
  console.log('\n--- 会社別 追加数 ---');
  [...addedPerCompany.entries()].forEach(([k, v]) => console.log(`  ${k}: +${v}`));

  if (!WRITE) {
    console.log('\n※ 確認モードです（書き込みしていません）。問題なければ --write を付けて再実行してください。');
    await app.delete();
    return;
  }
  if (added === 0) { console.log('\n追加対象がありません。'); await app.delete(); return; }

  await ref.set({ value: JSON.stringify(customers), updatedAt: Date.now() });
  console.log(`\n✔ 書き込み完了。担当者を ${added}件 追加しました。`);
  await app.delete();
}

main().catch((e) => { console.error('✖ エラー:', e?.message || e); process.exit(1); });
