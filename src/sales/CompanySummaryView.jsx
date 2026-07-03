// 会社別集計タブ：会社×月のマトリクス表（1年分）。
// 売上登録表の全月データを横断し、指標（納品枚数・金額など）と月の基準
// （納品月＝締め日式 / 台帳月）を切り替えて集計する。印刷・CSV出力対応。
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Printer, Download } from 'lucide-react';
import { salesStore, storage } from '../firebase.js';
import {
  COMPANY_METRICS, companyMetricOf, computeCompanyMatrix, formatYen,
} from './salesUtils.js';

export default function CompanySummaryView({ now, colors, fontJP, fontDisplay }) {
  const [ledger, setLedger] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [metricId, setMetricId] = useState('count');
  const [basis, setBasis] = useState('delivery');
  const [cutoffDay, setCutoffDay] = useState(25);

  useEffect(() => {
    const unsub = salesStore.subscribe((map) => { setLedger(map || {}); setLoaded(true); });
    return () => unsub && unsub();
  }, []);

  // 締め日は売上登録表の「月間 制作枚数」パネルと共有（deliveryCountSettings）
  useEffect(() => {
    const unsub = storage.subscribe('deliveryCountSettings', (val) => {
      if (!val) return;
      try {
        const d = parseInt(JSON.parse(val).cutoffDay, 10);
        if (d >= 1 && d <= 31) setCutoffDay(d);
      } catch (e) {}
    });
    return () => unsub && unsub();
  }, []);

  const metric = companyMetricOf(metricId);
  // 指標を切り替えたら推奨の月基準に合わせる（その後手動で変更可）
  const changeMetric = (id) => { setMetricId(id); setBasis(companyMetricOf(id).defaultBasis); };

  const matrix = useMemo(
    () => computeCompanyMatrix(ledger, year, metricId, basis, cutoffDay),
    [ledger, year, metricId, basis, cutoffDay]
  );

  const fmt = (v) => {
    if (!v) return '';
    return metric.money ? formatYen(v) : v.toLocaleString('ja-JP');
  };
  const basisText = basis === 'delivery'
    ? `納品月（締め日${cutoffDay}日：前月${Math.min(cutoffDay + 1, 31)}日〜当月${cutoffDay}日）`
    : '台帳月（売上登録表の月）';

  const th = { border: `1px solid ${colors.border}`, padding: '5px 8px', background: '#3a3a3a', color: '#fff', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', WebkitPrintColorAdjust: 'exact' };
  const td = { border: `1px solid ${colors.border}`, padding: '5px 8px', fontSize: 12, background: '#fff', whiteSpace: 'nowrap' };
  const tdNum = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const groupLabel = { offshore: 'オフショア', lab: 'ラボ' };

  const groupSection = (gid) => {
    const items = matrix.groups[gid] || [];
    if (items.length === 0) return null;
    const gt = matrix.groupTotals[gid];
    return (
      <React.Fragment key={gid}>
        <tr>
          <td colSpan={14} style={{ ...td, background: '#eef3e8', fontWeight: 700, WebkitPrintColorAdjust: 'exact' }}>{groupLabel[gid]}</td>
        </tr>
        {items.map(row => (
          <tr key={row.company}>
            <td style={{ ...td, position: 'sticky', left: 0 }}>{row.company}</td>
            {row.values.map((v, i) => <td key={i} style={tdNum}>{fmt(v)}</td>)}
            <td style={{ ...tdNum, fontWeight: 700, background: '#faf9f5' }}>{fmt(row.total)}</td>
          </tr>
        ))}
        <tr>
          <td style={{ ...td, fontWeight: 700, textAlign: 'right', position: 'sticky', left: 0, background: '#f7f6f2' }}>{groupLabel[gid]} 合計</td>
          {gt.values.map((v, i) => <td key={i} style={{ ...tdNum, fontWeight: 700, background: '#f7f6f2' }}>{fmt(v)}</td>)}
          <td style={{ ...tdNum, fontWeight: 700, background: '#f0ede3' }}>{fmt(gt.total)}</td>
        </tr>
      </React.Fragment>
    );
  };

  const empty = matrix.groups.offshore.length === 0 && matrix.groups.lab.length === 0;

  return (
    <div>
      <PrintStyles />
      <div className="kz-no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 700, margin: 0 }}>会社別集計</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => setYear(y => y - 1)} style={navBtn(colors)}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: 15, fontWeight: 700, minWidth: 64, textAlign: 'center' }}>{year}年</span>
          <button onClick={() => setYear(y => y + 1)} style={navBtn(colors)}><ChevronRight size={16} /></button>
        </div>
        <select value={metricId} onChange={e => changeMetric(e.target.value)}
          style={{ padding: '7px 9px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 13, fontWeight: 600, background: '#fff' }}>
          {COMPANY_METRICS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <select value={basis} onChange={e => setBasis(e.target.value)}
          title="行を何月に数えるかの基準。納品月＝納品日を締め日方式で割り当て（納品日の無い行は対象外）／台帳月＝売上登録表の月"
          style={{ padding: '7px 9px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 12, background: '#fff' }}>
          <option value="delivery">納品月（締め日{cutoffDay}日）</option>
          <option value="ledger">台帳月</option>
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13 }}><Printer size={14} />印刷 / PDF</button>
          <button onClick={() => exportMatrixCsv(matrix, year, metric, basisText)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13 }}><Download size={14} />CSV</button>
        </div>
      </div>

      <div id="kz-company-print">
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
          {year}年 会社別 {metric.label}
          <span style={{ fontSize: 11, color: colors.textMute, fontWeight: 400, marginLeft: 10 }}>基準：{basisText}</span>
        </div>
        {!loaded ? (
          <div style={{ color: colors.textMute, fontSize: 13, padding: 24 }}>読み込み中…</div>
        ) : empty ? (
          <div style={{ color: colors.textMute, fontSize: 13, padding: 40, textAlign: 'center', border: `1px dashed ${colors.border}`, borderRadius: 6 }}>
            {year}年の集計対象データがありません。売上登録表に行を登録すると自動で集計されます。
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: `1px solid ${colors.border}`, borderRadius: 4 }}>
            <table style={{ borderCollapse: 'collapse', minWidth: 1100 }}>
              <thead>
                <tr>
                  <th style={{ ...th, minWidth: 180, textAlign: 'left', position: 'sticky', left: 0 }}>会社名</th>
                  {matrix.months.map(m => <th key={m} style={th}>{Number(m.slice(5))}月</th>)}
                  <th style={{ ...th, minWidth: 90 }}>年間合計</th>
                </tr>
              </thead>
              <tbody>
                {groupSection('offshore')}
                {groupSection('lab')}
                <tr style={{ background: '#f0ede3', WebkitPrintColorAdjust: 'exact' }}>
                  <td style={{ ...td, background: 'transparent', fontWeight: 700, textAlign: 'right', position: 'sticky', left: 0 }}>総合計</td>
                  {matrix.grand.values.map((v, i) => <td key={i} style={{ ...tdNum, background: 'transparent', fontWeight: 700 }}>{fmt(v)}</td>)}
                  <td style={{ ...tdNum, background: 'transparent', fontWeight: 700 }}>{fmt(matrix.grand.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <div style={{ fontSize: 11, color: colors.textMute, marginTop: 6 }}>
          {metricId === 'count'
            ? '納品枚数は納品名（制作名）のユニーク数（月内で同じ納品名の行は1枚。納品名が空の行は1行=1枚）。'
            : metricId === 'outsourceJPY'
              ? '外注費は各行の属する台帳月のVND為替レートで円換算。'
              : ''}
          {basis === 'delivery' ? ' 納品日が未入力の行は集計対象外です。' : ''}
          オフショア/ラボは行の売上区分から自動分類。実績のない会社は表示されません。
        </div>
      </div>
    </div>
  );
}

function navBtn(colors) {
  return { padding: '6px 7px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', color: colors.text, display: 'flex', alignItems: 'center' };
}

// Excel での数式実行（CSVインジェクション）対策（SalesView と同じ方針）
function csvSafe(v) {
  const s = String(v ?? '');
  return /^[=+\-@]/.test(s) && isNaN(Number(s)) ? `'${s}` : s;
}

function exportMatrixCsv(matrix, year, metric, basisText) {
  const groupLabel = { offshore: 'オフショア', lab: 'ラボ' };
  const lines = [];
  lines.push([`${year}年 会社別 ${metric.label}`, `基準：${basisText}`].map(v => `"${csvSafe(v).replace(/"/g, '""')}"`).join(','));
  const headers = ['区分', '会社名', ...matrix.months.map(m => `${Number(m.slice(5))}月`), '年間合計'];
  lines.push(headers.map(v => `"${csvSafe(v).replace(/"/g, '""')}"`).join(','));
  const pushRow = (g, name, values, total) => {
    lines.push([g, name, ...values, total].map(v => `"${csvSafe(v).replace(/"/g, '""')}"`).join(','));
  };
  for (const gid of ['offshore', 'lab']) {
    for (const row of matrix.groups[gid]) pushRow(groupLabel[gid], row.company, row.values, row.total);
    if (matrix.groups[gid].length > 0) {
      const gt = matrix.groupTotals[gid];
      pushRow(groupLabel[gid], `${groupLabel[gid]} 合計`, gt.values, gt.total);
    }
  }
  pushRow('', '総合計', matrix.grand.values, matrix.grand.total);
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `会社別集計_${year}_${metric.label}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function PrintStyles() {
  return (
    <style>{`
      @media print {
        body { margin: 0 !important; }
        body * { visibility: hidden !important; }
        #kz-company-print, #kz-company-print * { visibility: visible !important; }
        #kz-company-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; }
        .kz-no-print { display: none !important; }
      }
      @page { size: A4 landscape; margin: 8mm; }
    `}</style>
  );
}
