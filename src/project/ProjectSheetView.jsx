// 案件整理タブ：登録済みタスク（案件登録）を会社ごとに一覧集計する表。
// スプレッドシートの「案件情報一覧」を模した一覧ビュー。
// 1行＝1カット（視点）。列：番号・社内案件名・案件名・担当者名・制作状況・カット名・清算月・ご依頼日・納品日。
// 清算月・ご依頼日・納品日はこの表から直接編集できる（視点内の全ステップへ反映。案件タブと同じデータ）。
//   ・ご依頼日 → 各ステップの依頼日（stepRequestDate）／・納品日 → 個別納期（deadline）
//   ・清算月   → その視点の売上行を指定した月の売上登録表へ計上（未指定なら依頼日の月）
import { useState, useMemo } from 'react';
import { Download, Printer, Plus, X } from 'lucide-react';
import { useApp } from '../appContext.js';

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

const toDateInput = (s) => {
  const str = String(s || '').trim();
  return /^\d{4}-\d{2}-\d{2}/.test(str) ? str.slice(0, 10) : '';
};

// 清算月プルダウンの候補（YYYY-MM）。現在月の前後を並べ、既存値が範囲外でも必ず含める。
const monthYmLabel = (ym) => {
  const [y, m] = String(ym).split('-');
  return `${y}年${Number(m)}月`;
};
function buildMonthOptions(now, includeValue) {
  const base = now instanceof Date ? now : new Date();
  const set = new Set();
  for (let i = -12; i <= 12; i++) {
    const dt = new Date(base.getFullYear(), base.getMonth() + i, 1);
    set.add(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
  }
  if (/^\d{4}-\d{2}$/.test(includeValue || '')) set.add(includeValue);
  return [...set].sort();
}
// 清算月セレクト（（未設定）＋ YYYY年M月 の一覧）
function MonthSelect({ value, onChange, now, style, title }) {
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} style={style} title={title}>
      <option value="">（未設定）</option>
      {buildMonthOptions(now, value).map((ym) => <option key={ym} value={ym}>{monthYmLabel(ym)}</option>)}
    </select>
  );
}

export default function ProjectSheetView({ tasks, customerMaster, colors, fontJP, fontDisplay }) {
  const { patchTasksByIds, addProjectFromSheet, companyList, assigneeList, now } = useApp();
  const [company, setCompany] = useState('__all__');
  const [includeDone, setIncludeDone] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

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
      const settlementMonth = g.tasks.map(t => (t.settlementMonth || '').trim()).filter(Boolean)[0] || '';
      const ids = g.tasks.map(t => t.id);
      return { ...g, status: rowStatus(g.tasks), requestDate, deliveryDate, settlementMonth, ids };
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
  const cellInput = { border: `1px solid ${colors.border}`, borderRadius: 3, padding: '4px 6px', fontFamily: fontJP, fontSize: 12.5, color: colors.text, background: '#fff', cursor: 'pointer', outline: 'none' };

  const exportCsv = () => {
    const header = ['番号', '会社名', '社内案件名', '案件名', '担当者名', '制作状況', 'カット名', '清算月', 'ご依頼日', '納品日'];
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
    visibleRows.forEach((r, i) => {
      lines.push([i + 1, r.company === NO_COMPANY ? '' : r.company, r.projectNameInternal, r.projectName, r.assignee, r.status, r.viewpointName, r.settlementMonth, fmtJDate(r.requestDate), fmtJDate(r.deliveryDate)].map(esc).join(','));
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
      {addOpen && (
        <AddProjectModal
          defaultCompany={company === '__all__' || company === NO_COMPANY ? '' : company}
          companyList={companyList || []} assigneeList={assigneeList || []} now={now}
          onAdd={addProjectFromSheet} onClose={() => setAddOpen(false)}
          colors={colors} fontJP={fontJP} />
      )}
      <datalist id="kz-ps-company-list">{(companyList || []).map(c => <option key={c} value={c} />)}</datalist>
      <datalist id="kz-ps-assignee-list">{(assigneeList || []).map(a => <option key={a} value={a} />)}</datalist>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 700, margin: 0 }}>案件整理</h2>
        <span style={{ fontSize: 12, color: colors.textMute }}>案件登録の内容を会社ごとに一覧集計します（1行＝1カット／視点）。清算月・ご依頼日・納品日はこの表から編集できます（清算月は売上登録へ反映）。</span>
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
        <button type="button" onClick={() => setAddOpen(true)} title="新規案件をこの表に追加する"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, fontWeight: 600, background: colors.text, color: '#fff', border: `1px solid ${colors.text}` }}>
          <Plus size={14} /> 新規案件
        </button>
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
              <th style={{ ...th, textAlign: 'center' }}>清算月</th>
              <th style={th}>ご依頼日</th>
              <th style={th}>納品日</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr><td style={{ ...td, textAlign: 'center', color: colors.textMute }} colSpan={company === '__all__' ? 10 : 9}>該当する案件がありません</td></tr>
            ) : visibleRows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 ? '#faf8f3' : '#fff' }}>
                <td style={{ ...tdC, color: colors.textMute }}>{i + 1}</td>
                {company === '__all__' && <td style={td}>{r.company === NO_COMPANY ? '' : r.company}</td>}
                <td style={td}>{r.projectNameInternal}</td>
                <td style={{ ...td, fontWeight: 600 }}>{r.projectName}</td>
                <td style={td}>{r.assignee}</td>
                <td style={{ ...tdC, color: STATUS_COLOR[r.status] || colors.text, fontWeight: 600 }}>{r.status}</td>
                <td style={td}>{r.viewpointName}</td>
                <td style={{ ...tdC, padding: '3px 6px' }}>
                  <MonthSelect value={r.settlementMonth || ''} now={now}
                    title="清算月（この視点の売上をこの月の売上登録表へ計上）"
                    onChange={(v) => patchTasksByIds(r.ids, { settlementMonth: v })} style={{ ...cellInput, width: '100%' }} />
                </td>
                <td style={{ ...td, padding: '3px 6px' }}>
                  <input type="date" value={toDateInput(r.requestDate)} title="ご依頼日（視点内の全ステップの依頼日へ反映）"
                    onChange={(e) => patchTasksByIds(r.ids, { stepRequestDate: e.target.value })} style={cellInput} />
                </td>
                <td style={{ ...td, padding: '3px 6px' }}>
                  <input type="date" value={toDateInput(r.deliveryDate)} title="納品日（視点内の全ステップの個別納期へ反映）"
                    onChange={(e) => patchTasksByIds(r.ids, { deadline: e.target.value })} style={cellInput} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== 新規案件の追加モーダル =====
// 案件整理タブから、この表の1行（=1カット/視点）に相当する案件を1件だけ登録する。
// 収集項目：会社名・社内案件名・案件名（必須）・担当者名・カット名（必須）・制作時間・清算月・ご依頼日・納品日。
function AddProjectModal({ defaultCompany, now, onAdd, onClose, colors, fontJP }) {
  const [d, setD] = useState({
    companyName: defaultCompany || '', projectNameInternal: '', projectName: '', customerContact: '',
    assignee: '', viewpointName: 'パース', hours: '1:00',
    settlementMonth: '', requestDate: '', deliveryDate: '',
  });
  const set = (k, v) => setD(prev => ({ ...prev, [k]: v }));
  const submit = () => { if (onAdd(d)) onClose(); };
  const label = { fontSize: 11, color: colors.textMute, marginBottom: 3, display: 'block' };
  const input = (props) => ({ padding: '7px 9px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 13, color: colors.text, background: '#fff', boxSizing: 'border-box', width: '100%', ...props });
  const section = { fontSize: 12, fontWeight: 700, color: colors.text, borderBottom: `1px solid ${colors.border}`, paddingBottom: 4, margin: '14px 0 10px' };
  const field = (lb, key, type, listId) => (
    <div>
      <label style={label}>{lb}</label>
      {type === 'date'
        ? <input type="date" value={d[key] || ''} onChange={e => set(key, e.target.value)} style={input()} />
        : type === 'month'
          ? <input type="month" value={d[key] || ''} onChange={e => set(key, e.target.value)} style={input()} />
          : <input value={d[key] ?? ''} onChange={e => set(key, e.target.value)} style={input()} list={listId}
              onKeyDown={e => { if (e.key === 'Enter') submit(); }} />}
    </div>
  );
  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, width: '100%', maxWidth: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column', fontFamily: fontJP, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>新規案件を追加</h3>
          <span style={{ fontSize: 11, color: colors.textMute }}>この表に1行（1カット/視点）を追加します</span>
          <button type="button" onClick={onClose} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMute, display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ overflowY: 'auto', padding: '4px 20px 16px', flex: 1 }}>
          <div style={section}>案件情報</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {field('会社名', 'companyName', 'text', 'kz-ps-company-list')}
            {field('社内案件名', 'projectNameInternal')}
            {field('案件名（必須）', 'projectName')}
            {field('担当者名', 'assignee', 'text', 'kz-ps-assignee-list')}
            {field('カット名（視点名・必須）', 'viewpointName')}
            {field('制作時間（例 1:30）', 'hours')}
          </div>
          <div style={section}>清算・日付</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <div>
              <label style={label}>清算月</label>
              <MonthSelect value={d.settlementMonth} now={now}
                onChange={(v) => set('settlementMonth', v)} style={input({ cursor: 'pointer' })} />
            </div>
            {field('ご依頼日', 'requestDate', 'date')}
            {field('納品日', 'deliveryDate', 'date')}
          </div>
          <div style={{ fontSize: 11, color: colors.textMute, marginTop: 10, lineHeight: 1.6 }}>
            制作時間を省略すると 1:00 で登録します。詳細な工程・金額は「案件」タブの案件を編集から追記できます。
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" onClick={onClose}
            style={{ marginLeft: 'auto', padding: '8px 16px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, color: colors.textMute }}>
            キャンセル
          </button>
          <button type="button" onClick={submit}
            style={{ padding: '8px 20px', background: colors.text, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 600 }}>
            追加する
          </button>
        </div>
      </div>
    </div>
  );
}
