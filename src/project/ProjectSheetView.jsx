// 案件整理タブ：登録済みタスク（案件登録）を会社ごとに一覧集計する表。
// スプレッドシートの「案件情報一覧」を模した読み取り専用ビュー。
// 1行＝1カット（視点）。列：番号・社内案件名・案件名・担当者名・制作状況・カット名・ご依頼日・納品日。
// 編集は「入力」タブの案件登録／案件を編集で行う（この表は集計表示）。
import React, { useState, useMemo } from 'react';
import { Download, Printer } from 'lucide-react';

const WD = ['日', '月', '火', '水', '木', '金', '土'];
function fmtJDate(s) {
  if (!s) return '';
  const iso = String(s).includes('T') ? String(s) : `${s}T00:00:00`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(s);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`;
}

// 視点（カット）の制作状況を集約：中止 / 完了 / 進行中 / 未着手
function rowStatus(tasksOfRow) {
  const active = tasksOfRow.filter(t => !t.cancelled);
  if (active.length === 0) return '中止';
  if (active.every(t => t.status === 'done')) return '完了';
  const anyProgress = active.some(t => (t.completedHours || 0) > 0 || t.status === 'done');
  return anyProgress ? '進行中' : '未着手';
}
const STATUS_COLOR = {
  '完了': '#3a5a40', '進行中': '#b07d3c', '未着手': '#6b6b6b', '中止': '#c1272d',
};

const NO_COMPANY = '（会社名なし）';

export default function ProjectSheetView({ tasks, customerMaster, colors, fontJP, fontDisplay }) {
  const [company, setCompany] = useState('__all__');
  const [includeDone, setIncludeDone] = useState(true);

  // 1行＝1視点（カット）に集約
  const allRows = useMemo(() => {
    const groups = new Map();
    for (const t of (tasks || [])) {
      const comp = (t.companyName || '').trim() || NO_COMPANY;
      const key = [comp, t.projectName || '', t.projectNameInternal || '', t.viewpointName || '', t.assignee || ''].join('');
      if (!groups.has(key)) {
        groups.set(key, {
          company: comp,
          projectName: t.projectName || '',
          projectNameInternal: t.projectNameInternal || '',
          viewpointName: t.viewpointName || '',
          assignee: t.assignee || '',
          tasks: [],
          minPriority: t.priority ?? 99,
          minCreated: t.createdAt || 0,
        });
      }
      const g = groups.get(key);
      g.tasks.push(t);
      if ((t.priority ?? 99) < g.minPriority) g.minPriority = t.priority ?? 99;
      if ((t.createdAt || 0) < g.minCreated) g.minCreated = t.createdAt || 0;
    }
    const out = [...groups.values()].map(g => {
      const reqDates = g.tasks.map(t => (t.stepRequestDate || '').trim()).filter(Boolean).sort();
      const projReq = (g.tasks.find(t => t.projectRequestDate) || {}).projectRequestDate || '';
      const requestDate = reqDates[0] || projReq || '';
      const indiv = g.tasks.map(t => (t.deadline || '').trim()).filter(Boolean).sort()[0] || '';
      const projDl = (g.tasks.find(t => t.projectDeadline) || {}).projectDeadline || '';
      const deliveryDate = indiv || projDl || '';
      return { ...g, status: rowStatus(g.tasks), requestDate, deliveryDate };
    });
    out.sort((a, b) =>
      a.company.localeCompare(b.company, 'ja') ||
      a.minPriority - b.minPriority ||
      a.minCreated - b.minCreated ||
      a.projectName.localeCompare(b.projectName, 'ja'));
    return out;
  }, [tasks]);

  // 会社タブの並び：お客様マスタの並び順 → 出現順。データにある会社のみ。
  const companies = useMemo(() => {
    const order = new Map();
    (customerMaster || []).forEach((c, i) => { const n = (c.company || '').trim(); if (n && !order.has(n)) order.set(n, i); });
    const present = [...new Set(allRows.map(r => r.company))];
    present.sort((a, b) => {
      const ai = order.has(a) ? order.get(a) : Infinity;
      const bi = order.has(b) ? order.get(b) : Infinity;
      if (ai !== bi) return ai - bi;
      if (a === NO_COMPANY) return 1;
      if (b === NO_COMPANY) return -1;
      return a.localeCompare(b, 'ja');
    });
    return present;
  }, [allRows, customerMaster]);

  const visibleRows = useMemo(() => allRows.filter(r =>
    (company === '__all__' || r.company === company) &&
    (includeDone || r.status !== '完了')
  ), [allRows, company, includeDone]);

  const th = { border: `1px solid ${colors.border}`, padding: '7px 10px', background: '#3a3a3a', color: '#fff', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', textAlign: 'left', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' };
  const td = { border: `1px solid ${colors.border}`, padding: '6px 10px', fontSize: 12.5, background: '#fff', whiteSpace: 'nowrap' };
  const tdC = { ...td, textAlign: 'center' };

  const exportCsv = () => {
    const header = ['番号', '会社名', '社内案件名', '案件名', '担当者名', '制作状況', 'カット名', 'ご依頼日', '納品日'];
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
    visibleRows.forEach((r, i) => {
      lines.push([i + 1, r.company === NO_COMPANY ? '' : r.company, r.projectNameInternal, r.projectName, r.assignee, r.status, r.viewpointName, fmtJDate(r.requestDate), fmtJDate(r.deliveryDate)].map(esc).join(','));
    });
    const bom = '﻿';
    const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const label = company === '__all__' ? '全社' : (company === NO_COMPANY ? '会社名なし' : company);
    a.href = url;
    a.download = `案件整理_${label}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabBtn = (active) => ({
    padding: '7px 14px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12.5,
    fontWeight: active ? 700 : 500,
    background: active ? colors.text : '#fff',
    color: active ? '#fff' : colors.textMute,
    border: `1px solid ${active ? colors.text : colors.border}`,
  });

  return (
    <div style={{ fontFamily: fontJP, color: colors.text }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 700, margin: 0 }}>案件整理</h2>
        <span style={{ fontSize: 12, color: colors.textMute }}>案件登録の内容を会社ごとに一覧集計します（1行＝1カット／視点）。編集は「入力」タブから。</span>
      </div>

      {/* 会社タブ */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }} className="no-print">
        <button type="button" onClick={() => setCompany('__all__')} style={tabBtn(company === '__all__')}>すべて</button>
        {companies.map(c => (
          <button key={c} type="button" onClick={() => setCompany(c)} style={tabBtn(company === c)}>
            {c === NO_COMPANY ? '会社名なし' : c}
          </button>
        ))}
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: colors.textMute, cursor: 'pointer' }}>
          <input type="checkbox" checked={includeDone} onChange={(e) => setIncludeDone(e.target.checked)} />
          完了を含める
        </label>
        <button type="button" onClick={exportCsv} title="表示中の表をCSVで書き出す"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, background: '#fff', color: colors.text, border: `1px solid ${colors.border}` }}>
          <Download size={14} /> CSV
        </button>
        <button type="button" onClick={() => window.print()} title="印刷"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, background: '#fff', color: colors.text, border: `1px solid ${colors.border}` }}>
          <Printer size={14} /> 印刷
        </button>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, marginBottom: 6 }}>
        ・案件情報一覧{company === '__all__' ? '（全社）' : `（${company === NO_COMPANY ? '会社名なし' : company}）`}
        <span style={{ fontSize: 11, fontWeight: 400, color: colors.textMute, marginLeft: 8 }}>{visibleRows.length} 件</span>
      </div>

      <div style={{ overflowX: 'auto', border: `1px solid ${colors.border}`, borderRadius: 4 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'center', width: 48 }}>番号</th>
              {company === '__all__' && <th style={th}>会社名</th>}
              <th style={th}>社内案件名</th>
              <th style={th}>案件名</th>
              <th style={th}>担当者名</th>
              <th style={{ ...th, textAlign: 'center' }}>制作状況</th>
              <th style={th}>カット名</th>
              <th style={th}>ご依頼日</th>
              <th style={th}>納品日</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr><td style={{ ...td, textAlign: 'center', color: colors.textMute }} colSpan={company === '__all__' ? 9 : 8}>該当する案件がありません</td></tr>
            ) : visibleRows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 ? '#faf8f3' : '#fff' }}>
                <td style={{ ...tdC, color: colors.textMute }}>{i + 1}</td>
                {company === '__all__' && <td style={td}>{r.company === NO_COMPANY ? '' : r.company}</td>}
                <td style={td}>{r.projectNameInternal}</td>
                <td style={{ ...td, fontWeight: 600 }}>{r.projectName}</td>
                <td style={td}>{r.assignee}</td>
                <td style={{ ...tdC, color: STATUS_COLOR[r.status] || colors.text, fontWeight: 600 }}>{r.status}</td>
                <td style={td}>{r.viewpointName}</td>
                <td style={td}>{fmtJDate(r.requestDate)}</td>
                <td style={td}>{fmtJDate(r.deliveryDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
