// 視点（依頼項目）の制作履歴 → 売上登録表への自動同期ロジック（純粋関数）。
//
// 方針：
//  - 制作ラウンドのうち「金額（制作金額 or 外注金額）が入っているもの」を売上行へ反映する。
//  - 生成行は srcVp（視点キー）・srcRound（ラウンドID）で識別。手動行（src 無し）は一切触らない。
//  - 既存の生成行は source 所有フィールドのみ更新し、ユーザが編集する項目
//    （区分・納品日・請求/入金・備考・枚数など）は保持する。
//  - ラウンドが消えた生成行は削除する（＝視点から金額を消すと売上行も消える）。
//  - 月は「ラウンドの日付（依頼日）の月」。日付が無ければ fallbackMonth。

import { blankRow } from '../sales/salesUtils.js';
import {
  normalizeHistory, computeRoundNames, deliveryBaseName, classifyProdType,
  viewpointKey, isOffshoreCompany, num, roundTypeOf, stepDeliveryName,
} from './viewpointUtils.js';

// source が所有し、同期のたびに上書きするフィールド。
const SOURCE_FIELDS = [
  'company', 'person', 'projectName', 'prodType', 'prodName',
  'prodAmount', 'inHouseOutsourcer', 'externalOutsourcer', 'outsourceVND', 'orderDate',
];

function categoryForCompany(company, customerMaster) {
  return isOffshoreCompany(company, customerMaster) ? 'offshore_dom' : 'lab_dom';
}

// tasks → 売上連携すべきラウンドの一覧。
// [{ srcVp, srcRound, month, category, fields }]
export function collectSalesSyncRows(tasks, customerMaster) {
  const vpMap = new Map();
  for (const t of (tasks || [])) {
    if (t.cancelled) continue; // 中止案件は売上に出さない
    const key = viewpointKey(t.projectName, t.viewpointName);
    if (!vpMap.has(key)) {
      vpMap.set(key, {
        key,
        projectName: t.projectName || '',
        viewpointName: t.viewpointName || '',
        viewpointNameExternal: t.viewpointNameExternal || '',
        viewpointCategory: t.viewpointCategory || '',
        companyName: t.companyName || '',
        customerContact: t.customerContact || '',
        history: normalizeHistory(t.prodHistory),
        deliveryNameOverride: t.deliveryNameOverride || '',
      });
    } else {
      const e = vpMap.get(key);
      const h = normalizeHistory(t.prodHistory);
      if (h.length > e.history.length) e.history = h; // 複製ずれ対策：最長を採用
      if (!e.companyName && t.companyName) e.companyName = t.companyName;
      if (!e.customerContact && t.customerContact) e.customerContact = t.customerContact;
      if (!e.deliveryNameOverride && t.deliveryNameOverride) e.deliveryNameOverride = t.deliveryNameOverride;
      if (!e.viewpointNameExternal && t.viewpointNameExternal) e.viewpointNameExternal = t.viewpointNameExternal;
      if (!e.viewpointCategory && t.viewpointCategory) e.viewpointCategory = t.viewpointCategory;
    }
  }

  const out = [];

  // (1) 視点の制作履歴（カードの「制作・納品」で入れた追加・修正・外注など）→ 1ラウンド1行
  for (const vp of vpMap.values()) {
    const base = deliveryBaseName(vp.projectName, vp.viewpointNameExternal || vp.viewpointName, vp.deliveryNameOverride);
    const named = computeRoundNames(vp.history, base);
    const category = categoryForCompany(vp.companyName, customerMaster);
    const prodType = vp.viewpointCategory || classifyProdType(vp.viewpointName);
    for (const r of named) {
      const hasMoney = num(r.amount) > 0 || num(r.outVND) > 0;
      if (!hasMoney) continue;
      const month = /^\d{4}-\d{2}/.test(r.date || '') ? r.date.slice(0, 7) : null;
      out.push({
        srcVp: vp.key,
        srcRound: r.id,
        month,
        category,
        roundType: roundTypeOf(r.type).id,
        fields: {
          company: vp.companyName,
          person: vp.customerContact,
          projectName: vp.projectName,
          prodType,
          prodName: r.deliveryName,
          prodAmount: r.amount === '' || r.amount == null ? '' : String(r.amount),
          inHouseOutsourcer: r.outInHouse || '',
          externalOutsourcer: r.outExternal || '',
          outsourceVND: r.outVND === '' || r.outVND == null ? '' : String(r.outVND),
          orderDate: r.date || '',
        },
      });
    }
  }

  // (2) ステップごとの金額（登録/編集フォームで入れた金額）→ 1ステップ1行。
  //     納品名は「納品名＋ステップ名」。金額の入ったステップのみ売上行にする。
  for (const t of (tasks || [])) {
    if (t.cancelled) continue;
    if (num(t.stepAmount) <= 0) continue;
    const vp = vpMap.get(viewpointKey(t.projectName, t.viewpointName));
    const extName = (vp && vp.viewpointNameExternal) || t.viewpointNameExternal || t.viewpointName;
    const base = deliveryBaseName(t.projectName, extName, vp ? vp.deliveryNameOverride : (t.deliveryNameOverride || ''));
    const date = t.stepRequestDate || t.projectRequestDate || '';
    const month = /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : null;
    const deliveryDate = /^\d{4}-\d{2}-\d{2}/.test(t.stepCompletedDate || '') ? t.stepCompletedDate.slice(0, 10) : '';
    out.push({
      srcVp: viewpointKey(t.projectName, t.viewpointName),
      srcRound: `step:${t.id}`,
      month,
      category: categoryForCompany(t.companyName, customerMaster),
      roundType: 'step',
      // 完了日（納品日）も source 所有にする（このステップ行限定）
      ownFields: [...SOURCE_FIELDS, 'deliveryDate'],
      fields: {
        company: t.companyName || '',
        person: t.customerContact || '',
        projectName: t.projectName || '',
        prodType: t.viewpointCategory || classifyProdType(t.viewpointName),
        prodName: (t.stepDeliveryNameOverride || '').trim() || stepDeliveryName(base, t.stepName),
        prodAmount: String(t.stepAmount),
        inHouseOutsourcer: '',
        externalOutsourcer: '',
        outsourceVND: '',
        orderDate: date,
        deliveryDate,
      },
    });
  }
  return out;
}

// 既存 ledger に同期行をマージ。
// ledger: { 'YYYY-MM': { rows, settings, updatedAt } }
// 返り値：{ ledger, changed }
export function reconcileLedger(ledger, syncRows, fallbackMonth) {
  // ディープコピー
  const next = {};
  for (const [ym, m] of Object.entries(ledger || {})) {
    next[ym] = { ...m, rows: (m.rows || []).map(r => ({ ...r })) };
  }

  // 既存の生成行を索引化：srcRound → { ym, id }
  const index = new Map();
  for (const [ym, m] of Object.entries(next)) {
    for (const r of (m.rows || [])) {
      if (r.srcRound) index.set(r.srcRound, { ym, id: r.id });
    }
  }

  const wanted = new Set();
  let changed = false;

  for (const sr of syncRows) {
    wanted.add(sr.srcRound);
    const existing = index.get(sr.srcRound);
    if (existing) {
      const row = next[existing.ym].rows.find(r => r.id === existing.id);
      if (!row) continue;
      for (const k of (sr.ownFields || SOURCE_FIELDS)) {
        const v = sr.fields[k] ?? '';
        if ((row[k] ?? '') !== v) { row[k] = v; changed = true; }
      }
      if (row.srcVp !== sr.srcVp) { row.srcVp = sr.srcVp; changed = true; }
    } else {
      const ym = sr.month || fallbackMonth;
      if (!next[ym]) next[ym] = { rows: [], settings: null, updatedAt: Date.now() };
      next[ym].rows.push({ ...blankRow(sr.category), ...sr.fields, srcVp: sr.srcVp, srcRound: sr.srcRound });
      changed = true;
    }
  }

  // 不要になった生成行を削除
  for (const m of Object.values(next)) {
    const before = (m.rows || []).length;
    m.rows = (m.rows || []).filter(r => !r.srcRound || wanted.has(r.srcRound));
    if (m.rows.length !== before) changed = true;
  }

  if (changed) {
    for (const ym of Object.keys(next)) next[ym].updatedAt = Date.now();
  }
  return { ledger: next, changed };
}
