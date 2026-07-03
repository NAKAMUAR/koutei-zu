// 売上登録表ビュー：月切替・総合サマリー・区分タブ・編集テーブル・案件連携・印刷。
// データは 1か月 = 1 Firestore ドキュメント（salesStore、data/sales_{YYYY-MM}）。
// 月をまたいだ後勝ち上書きが起きない（保存はその月のドキュメントだけ）。
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Printer, Download } from 'lucide-react';
import { salesStore, storage } from '../firebase.js';
import {
  SALES_CATEGORIES, catOf, OUTSOURCERS, DEFAULT_SETTINGS,
  blankRow, computeRow, computeSummary, computeCategoryTotal,
  computeDeliverySummary,
  currentMonth, monthLabel, shiftMonth, num, formatYen, formatVND,
} from './salesUtils.js';

export default function SalesView({ tasks, customerMaster, now, colors, fontJP, fontDisplay }) {
  const [ledger, setLedger] = useState({});      // { ym: { rows, settings, updatedAt } }
  const [loaded, setLoaded] = useState(false);
  const [ym, setYm] = useState(currentMonth(now));
  const [activeCat, setActiveCat] = useState(SALES_CATEGORIES[0].id);

  useEffect(() => {
    const unsub = salesStore.subscribe((map) => {
      setLedger(map || {});
      setLoaded(true);
    });
    return () => unsub && unsub();
  }, []);

  // 月間 制作枚数集計：集計月（台帳の表示月とは独立）と締め日（変更可・チーム共有で保存）
  const [deliveryYm, setDeliveryYm] = useState(currentMonth(now));
  const [cutoffDay, setCutoffDay] = useState(25);
  useEffect(() => {
    const unsub = storage.subscribe('deliveryCountSettings', (val) => {
      if (!val) return;
      try {
        const o = JSON.parse(val);
        const d = parseInt(o.cutoffDay, 10);
        if (d >= 1 && d <= 31) setCutoffDay(d);
      } catch (e) {}
    });
    return () => unsub && unsub();
  }, []);
  const saveCutoffDay = (d) => {
    const v = Math.min(Math.max(parseInt(d, 10) || 25, 1), 31);
    setCutoffDay(v);
    storage.set('deliveryCountSettings', JSON.stringify({ cutoffDay: v })).catch(e => console.error('締め日の保存エラー:', e));
  };
  const deliverySummary = useMemo(
    () => computeDeliverySummary(ledger, deliveryYm, cutoffDay),
    [ledger, deliveryYm, cutoffDay]
  );

  const month = ledger[ym] || { rows: [], settings: { ...DEFAULT_SETTINGS }, updatedAt: null };
  const settings = { ...DEFAULT_SETTINGS, ...(month.settings || {}) };
  const rows = month.rows || [];

  const persistMonth = (patch) => {
    const nextMonth = { rows: month.rows || [], settings, ...month, ...patch, updatedAt: Date.now() };
    setLedger(prev => ({ ...prev, [ym]: nextMonth }));
    salesStore.set(ym, nextMonth).catch(e => console.error('売上登録表 保存エラー:', e));
  };
  const setRows = (newRows) => persistMonth({ rows: newRows });
  const setSettings = (patch) => persistMonth({ settings: { ...settings, ...patch } });

  const updRow = (id, patch) => setRows(rows.map(r => r.id === id ? { ...r, ...patch } : r));
  const addRow = (catId, prefill) => setRows([...rows, { ...blankRow(catId || activeCat), ...(prefill || {}) }]);
  const removeRow = (id) => setRows(rows.filter(r => r.id !== id));

  const summary = useMemo(() => computeSummary(rows, settings), [rows, settings]);

  // 請求・入金の漏れ検知（この月の行）：
  //  - 完了済みなのに請求書送付日が空 → 請求漏れの疑い
  //  - 請求書送付済みなのに入金確認日が空 → 入金待ち
  const billAlerts = useMemo(() => {
    const a = { noInvoice: 0, noInvoiceAmt: 0, waitingPay: 0, waitingPayAmt: 0 };
    for (const r of rows) {
      const c = computeRow(r, settings);
      const sent = String(r.invoiceSentDate || '').trim();
      const paid = String(r.paymentConfirmedDate || '').trim();
      if (r.completed && !sent) { a.noInvoice++; a.noInvoiceAmt += c.taxIncl; }
      if (sent && !paid) { a.waitingPay++; a.waitingPayAmt += c.taxIncl; }
    }
    return a;
  }, [rows, settings]);

  // 案件候補（tasksから）
  const projectOptions = useMemo(() => {
    const map = new Map();
    for (const t of (tasks || [])) {
      const p = (t.projectName || '').trim();
      if (!p || map.has(p)) continue;
      map.set(p, { projectName: p, company: t.companyName || '', person: t.customerContact || '', deliveryDate: '' });
    }
    return [...map.values()];
  }, [tasks]);

  const companyList = useMemo(() => {
    const s = new Set();
    (customerMaster || []).forEach(c => c.company && s.add(c.company));
    (tasks || []).forEach(t => t.companyName && s.add(t.companyName));
    return [...s];
  }, [customerMaster, tasks]);


  return (
    <div>
      <PrintStyles />
      {/* ヘッダー：月切替＋操作 */}
      <div className="kz-no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 700, margin: 0 }}>売上登録表</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => setYm(shiftMonth(ym, -1))} style={navBtn(colors)}><ChevronLeft size={16} /></button>
          <input type="month" value={ym} onChange={e => e.target.value && setYm(e.target.value)} style={{ padding: '6px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 14, fontWeight: 600 }} />
          <button onClick={() => setYm(shiftMonth(ym, 1))} style={navBtn(colors)}><ChevronRight size={16} /></button>
          <span style={{ fontSize: 15, fontWeight: 700, marginLeft: 8 }}>{monthLabel(ym)} 売上総合</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13 }}><Printer size={14} />印刷 / PDF</button>
          <button onClick={() => exportCsv(ym, rows, settings)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13 }}><Download size={14} />CSV</button>
        </div>
      </div>

      <div id="kz-sales-print">
        <div className="kz-print-only" style={{ display: 'none', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{monthLabel(ym)} 売上総合</div>

        {/* 総合サマリーパネル */}
        <SummaryPanel summary={summary} billAlerts={billAlerts} settings={settings} setSettings={setSettings} updatedAt={month.updatedAt} colors={colors} fontJP={fontJP} />

        {/* 区分タブ */}
        <div className="kz-no-print" style={{ display: 'flex', gap: 6, margin: '16px 0 10px', flexWrap: 'wrap' }}>
          {SALES_CATEGORIES.map(c => {
            const n = rows.filter(r => r.category === c.id).length;
            return (
              <button key={c.id} onClick={() => setActiveCat(c.id)}
                style={{ padding: '7px 12px', background: activeCat === c.id ? '#1a1a1a' : 'transparent', color: activeCat === c.id ? '#fff' : '#1a1a1a', border: `1px solid ${activeCat === c.id ? '#1a1a1a' : colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13 }}>
                {c.label}{n ? ` (${n})` : ''}
              </button>
            );
          })}
        </div>

        {/* 区分テーブル：画面は選択中の区分のみ、印刷時は行のある全区分を出す */}
        {SALES_CATEGORIES.map(c => {
          const isActive = c.id === activeCat;
          const cRows = rows.filter(r => r.category === c.id);
          if (!isActive && cRows.length === 0) return null;
          return (
            <div key={c.id} className={isActive ? undefined : 'kz-print-only'}
              style={isActive ? undefined : { display: 'none', marginTop: 14 }}>
              <CategoryTable
                category={catOf(c.id)} rows={cRows} settings={settings}
                total={computeCategoryTotal(rows, c.id, settings)}
                updRow={updRow} removeRow={removeRow} companyList={companyList}
                colors={colors} fontJP={fontJP} />
            </div>
          );
        })}

        {/* 案件から追加 / 行追加 */}
        <div className="kz-no-print" style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => addRow(activeCat)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', background: 'transparent', border: `1px dashed ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13 }}><Plus size={14} />行を追加</button>
          <select defaultValue="" onChange={e => { const o = projectOptions.find(p => p.projectName === e.target.value); if (o) addRow(activeCat, { company: o.company, projectName: o.projectName, person: o.person }); e.target.value = ''; }}
            style={{ padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 13 }}>
            <option value="">案件から行を追加（会社名・案件名・担当者）</option>
            {projectOptions.map(o => <option key={o.projectName} value={o.projectName}>{o.projectName}{o.company ? `（${o.company}）` : ''}</option>)}
          </select>
          {!loaded && <span style={{ fontSize: 12, color: colors.textMute }}>読み込み中…</span>}
        </div>

        {/* 月間 制作枚数集計（会社別・納品名ベース） */}
        <DeliveryCountPanel
          summary={deliverySummary} ym={deliveryYm} setYm={setDeliveryYm}
          cutoffDay={cutoffDay} saveCutoffDay={saveCutoffDay}
          colors={colors} fontJP={fontJP} />
      </div>

      {/* 会社名サジェスト用 datalist */}
      <datalist id="kz-company-list">{companyList.map(c => <option key={c} value={c} />)}</datalist>
    </div>
  );
}

function navBtn(colors) { return { padding: '6px 7px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', color: colors.text, display: 'flex', alignItems: 'center' }; }

// ===== 総合サマリーパネル =====
function SummaryPanel({ summary, billAlerts, settings, setSettings, updatedAt, colors, fontJP }) {
  const card = { border: `1px solid ${colors.border}`, borderRadius: 6, padding: '10px 12px', background: '#fff' };
  const head = { fontSize: 11, color: colors.textMute, marginBottom: 6, fontWeight: 600 };
  const kv = (label, val, strong) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '2px 0', fontSize: strong ? 14 : 12, fontWeight: strong ? 700 : 400 }}>
      <span style={{ color: '#555' }}>{label}</span><span>{val}</span>
    </div>
  );
  const lastStr = updatedAt ? new Date(updatedAt).toLocaleString('ja-JP') : '—';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
      {/* 合計売上 */}
      <div style={{ ...card, background: '#f5f8f3' }}>
        <div style={head}>合計売上</div>
        {kv('合計売上（税込）', formatYen(summary.totalSales), true)}
        {kv('税金・外注費・本社取分 差引後', formatYen(summary.netAfterDeduct), true)}
        {kv('消費税合計', formatYen(summary.totalTax))}
      </div>
      {/* 国内売上 */}
      <div style={card}>
        <div style={head}>国内売上</div>
        {kv('オフショア（税抜）', formatYen(summary.domestic.offshore.net))}
        {kv('オフショア（税込）', formatYen(summary.domestic.offshore.gross))}
        {kv('ラボ（税抜）', formatYen(summary.domestic.lab.net))}
        {kv('ラボ（税込）', formatYen(summary.domestic.lab.gross))}
      </div>
      {/* 国際売上 */}
      <div style={card}>
        <div style={head}>国際売上（税無し）</div>
        {kv('オフショア', formatYen(summary.intl.offshore))}
        {kv('ラボ', formatYen(summary.intl.lab))}
      </div>
      {/* 外注費用 */}
      <div style={card}>
        <div style={head}>外注費用（円換算）</div>
        {OUTSOURCERS.map(p => kv(p, formatYen(summary.outsourceByPerson[p] || 0)))}
        {Object.keys(summary.outsourceByPerson).filter(p => !OUTSOURCERS.includes(p)).map(p => kv(p, formatYen(summary.outsourceByPerson[p])))}
        {kv('外注費 合計', formatYen(summary.totalOutsourceJPY), true)}
        <div className="kz-no-print" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 11, color: '#555' }}>VND為替（1円=</span>
          <input value={settings.exchangeRate} onChange={e => setSettings({ exchangeRate: e.target.value })} style={{ width: 60, padding: '3px 5px', border: `1px solid ${colors.border}`, borderRadius: 3, fontSize: 12 }} inputMode="decimal" />
          <span style={{ fontSize: 11, color: '#555' }}>VND）</span>
        </div>
      </div>
      {/* 本社取り分 */}
      <div style={card}>
        <div style={head}>本社取り分（国内取引のみ）</div>
        <div className="kz-no-print" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: '#555' }}>手数料 円/枚</span>
          <input value={settings.hqRate} onChange={e => setSettings({ hqRate: e.target.value })} style={{ width: 60, padding: '3px 5px', border: `1px solid ${colors.border}`, borderRadius: 3, fontSize: 12 }} inputMode="numeric" />
        </div>
        {kv('枚数', summary.hqSheets)}
        {kv('手数料合計金額', formatYen(summary.hqShareTotal), true)}
      </div>
      {/* 請求・入金の漏れ検知 */}
      <div style={{ ...card, background: (billAlerts.noInvoice || billAlerts.waitingPay) ? '#fdf3ee' : '#f5f8f3' }}>
        <div style={head}>請求・入金チェック（この月）</div>
        {billAlerts.noInvoice > 0
          ? kv('請求書未送付（完了済み）', `${billAlerts.noInvoice}件 ${formatYen(billAlerts.noInvoiceAmt)}`, true)
          : kv('請求書未送付（完了済み）', 'なし')}
        {billAlerts.waitingPay > 0
          ? kv('入金待ち（送付済み）', `${billAlerts.waitingPay}件 ${formatYen(billAlerts.waitingPayAmt)}`, true)
          : kv('入金待ち（送付済み）', 'なし')}
        <div style={{ fontSize: 10, color: colors.textMute, marginTop: 4 }}>
          11.完了・12.請求書送付日・13.入金確認日から自動判定
        </div>
      </div>
      {/* 佐渡最終チェック／最終更新 */}
      <div style={{ ...card, background: '#fffbe6' }}>
        <div style={head}>佐渡 最終チェック</div>
        <label className="kz-no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!settings.finalCheck} onChange={e => setSettings({ finalCheck: e.target.checked })} />
          チェック済み
        </label>
        <div className="kz-print-only" style={{ display: 'none', fontSize: 13 }}>{settings.finalCheck ? '☑ チェック済み' : '☐ 未チェック'}</div>
        <div style={{ fontSize: 11, color: colors.textMute, marginTop: 8 }}>最終更新日時</div>
        <div style={{ fontSize: 12 }}>{lastStr}</div>
      </div>
    </div>
  );
}

// ===== 区分テーブル =====
const COLS = [
  { key: 'idx', label: '番号', w: 36, ro: true },
  { key: 'company', label: '1.会社名', w: 130, list: 'kz-company-list' },
  { key: 'person', label: '2.担当者名', w: 100 },
  { key: 'projectName', label: '3.案件名', w: 150 },
  { key: 'prodType', label: '4.制作種類', w: 100 },
  { key: 'prodName', label: '5.制作名', w: 120 },
  { key: 'inHouseOutsourcer', label: '6.社内外注者', w: 100 },
  { key: 'externalOutsourcer', label: '6.社外外注者', w: 100 },
  { key: 'outsourceVND', label: '7.外注金額(VND)', w: 110, align: 'right' },
  { key: 'prodAmount', label: '7.制作金額', w: 100, align: 'right' },
  { key: 'tax', label: '消費税(10%)', w: 90, align: 'right', calc: true },
  { key: 'taxIncl', label: '税込合計', w: 100, align: 'right', calc: true },
  { key: 'sheets', label: '制作枚数', w: 70, align: 'right' },
  { key: 'orderDate', label: '8.発注/着手日', w: 120, type: 'date' },
  { key: 'dueDate', label: '9.納品予定日', w: 120, type: 'date' },
  { key: 'deliveryDate', label: '10.納品日', w: 120, type: 'date' },
  { key: 'completed', label: '11.完了', w: 50, type: 'check' },
  { key: 'invoiceSentDate', label: '12.請求書送付日', w: 120, type: 'date' },
  { key: 'paymentConfirmedDate', label: '13.入金確認日', w: 120, type: 'date' },
  { key: 'billRound', label: '14.請求対象回', w: 80 },
  { key: 'billAmount', label: '15.請求金額', w: 100, align: 'right' },
  { key: 'taxPayAmount', label: '16.消費税納付', w: 100, align: 'right' },
  { key: 'hqReceive', label: '17.本社受取', w: 100, align: 'right', calc: true },
  { key: 'hqStatus', label: '18.本社請求状態', w: 110 },
  { key: 'note', label: '備考', w: 140 },
];

function CategoryTable({ category, rows, settings, total, updRow, removeRow, companyList, colors, fontJP }) {
  const th = { border: `1px solid ${colors.border}`, padding: '4px 6px', background: '#3a3a3a', color: '#fff', fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap', position: 'sticky', top: 0, WebkitPrintColorAdjust: 'exact' };
  const td = { border: `1px solid ${colors.border}`, padding: 0, fontSize: 11, verticalAlign: 'middle' };
  const cellInput = (align) => ({ width: '100%', border: 'none', padding: '4px 5px', fontFamily: fontJP, fontSize: 11, boxSizing: 'border-box', background: 'transparent', textAlign: align || 'left', outline: 'none' });

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, margin: '4px 0 6px' }}>{category.label}<span style={{ fontSize: 11, color: colors.textMute, fontWeight: 400, marginLeft: 8 }}>（{category.note}）</span></div>
      <div style={{ overflowX: 'auto', border: `1px solid ${colors.border}`, borderRadius: 4 }}>
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 1200 }}>
          <colgroup>
            {COLS.map(c => <col key={c.key} style={{ width: c.w }} />)}
            <col style={{ width: 36 }} />
          </colgroup>
          <thead>
            <tr>{COLS.map(c => <th key={c.key} style={th}>{c.label}</th>)}<th style={{ ...th }} className="kz-no-print"></th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={COLS.length + 1} style={{ ...td, padding: 16, textAlign: 'center', color: colors.textMute }}>この区分の行はありません。「行を追加」または「案件から行を追加」で登録してください。</td></tr>
            ) : rows.map((r, i) => {
              const c = computeRow(r, settings);
              const calcVal = { tax: c.tax, taxIncl: c.taxIncl, hqReceive: c.hqReceive };
              return (
                <tr key={r.id}>
                  {COLS.map(col => {
                    if (col.key === 'idx') return (
                      <td key={col.key} style={{ ...td, textAlign: 'center', color: colors.textMute, background: r.srcRound ? '#eef3e8' : '#faf9f5' }}
                        title={r.srcRound ? '視点（進行中案件）の制作履歴から自動連携された行です。会社名・制作名・金額・外注は視点側で編集してください（手動編集は次回同期で上書きされます）。' : undefined}>
                        {i + 1}{r.srcRound ? <div style={{ fontSize: 8, color: '#5a7a4a', fontWeight: 700 }}>自動</div> : null}
                      </td>
                    );
                    if (col.calc) return <td key={col.key} style={{ ...td, textAlign: 'right', padding: '4px 5px', background: '#f7f6f2', color: '#333' }}>{formatYen(calcVal[col.key])}</td>;
                    if (col.type === 'check') return <td key={col.key} style={{ ...td, textAlign: 'center' }}><input type="checkbox" checked={!!r[col.key]} onChange={e => updRow(r.id, { [col.key]: e.target.checked })} /></td>;
                    if (col.type === 'date') return <td key={col.key} style={td}><input type="date" value={r[col.key] || ''} onChange={e => updRow(r.id, { [col.key]: e.target.value })} style={cellInput()} /></td>;
                    return (
                      <td key={col.key} style={td}>
                        <input value={r[col.key] ?? ''} list={col.list} onChange={e => updRow(r.id, { [col.key]: e.target.value })}
                          inputMode={col.align === 'right' ? 'numeric' : undefined} style={cellInput(col.align)} />
                      </td>
                    );
                  })}
                  <td style={{ ...td, textAlign: 'center' }} className="kz-no-print">
                    <button onClick={() => removeRow(r.id)} title="削除" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#c0392b', padding: 4 }}><Trash2 size={13} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr style={{ background: '#eef3e8', WebkitPrintColorAdjust: 'exact' }}>
                <td style={{ ...td, fontWeight: 700, textAlign: 'center' }} colSpan={9}>{category.label} 合計</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, padding: '4px 5px' }}>{formatYen(total.prod)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, padding: '4px 5px' }}>{formatYen(total.tax)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, padding: '4px 5px' }}>{formatYen(total.taxIncl)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, padding: '4px 5px' }}>{total.sheets}</td>
                <td style={td} colSpan={6}></td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, padding: '4px 5px' }}>{formatYen(total.billAmount)}</td>
                <td style={td}></td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, padding: '4px 5px' }}>{formatYen(total.hqReceive)}</td>
                <td style={td} colSpan={2}></td>
                <td style={td} className="kz-no-print"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ===== 月間 制作枚数集計（会社別・納品名ベース） =====
// 全月の売上行から、納品日を締め日方式で納品月に割り当てて会社別に枚数を数える。
// 集計月・締め日はこのパネル内で変更できる（締め日はチーム共有で保存）。
function DeliveryCountPanel({ summary, ym, setYm, cutoffDay, saveCutoffDay, colors, fontJP }) {
  const th = { border: `1px solid ${colors.border}`, padding: '5px 10px', background: '#3a3a3a', color: '#fff', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', WebkitPrintColorAdjust: 'exact' };
  const td = { border: `1px solid ${colors.border}`, padding: '5px 10px', fontSize: 12, background: '#fff' };
  const tdNum = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const groupLabel = { offshore: 'オフショア', lab: 'ラボ' };
  // 集計期間の説明（例：締め日25 → 前月26日〜当月25日）
  const periodText = cutoffDay >= 31
    ? '当月1日〜末日'
    : `前月${cutoffDay + 1}日〜当月${cutoffDay}日`;
  const groupRows = (gid) => {
    const items = summary.groups[gid] || [];
    const gt = summary.groupTotals[gid];
    return (
      <React.Fragment key={gid}>
        <tr>
          <td colSpan={4} style={{ ...td, background: '#eef3e8', fontWeight: 700, fontSize: 12, WebkitPrintColorAdjust: 'exact' }}>{groupLabel[gid]}</td>
        </tr>
        {items.length === 0 ? (
          <tr><td colSpan={4} style={{ ...td, color: colors.textMute, textAlign: 'center' }}>この月の納品はありません</td></tr>
        ) : items.map(it => (
          <tr key={it.company}>
            <td style={td}>{it.company}</td>
            <td style={tdNum}>{it.count}</td>
            <td style={tdNum}>{it.sheets || ''}</td>
            <td style={tdNum}>{it.rows}</td>
          </tr>
        ))}
        {items.length > 0 && (
          <tr>
            <td style={{ ...td, fontWeight: 700, textAlign: 'right' }}>{groupLabel[gid]} 合計</td>
            <td style={{ ...tdNum, fontWeight: 700 }}>{gt.count}</td>
            <td style={{ ...tdNum, fontWeight: 700 }}>{gt.sheets || ''}</td>
            <td style={{ ...tdNum, fontWeight: 700 }}>{gt.rows}</td>
          </tr>
        )}
      </React.Fragment>
    );
  };
  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>月間 制作枚数（会社別・納品名ベース）</span>
        <div className="kz-no-print" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => setYm(shiftMonth(ym, -1))} style={navBtn(colors)}><ChevronLeft size={14} /></button>
          <input type="month" value={ym} onChange={e => e.target.value && setYm(e.target.value)}
            style={{ padding: '5px 7px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 13, fontWeight: 600 }} />
          <button onClick={() => setYm(shiftMonth(ym, 1))} style={navBtn(colors)}><ChevronRight size={14} /></button>
        </div>
        <div className="kz-no-print" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#555' }}>
          締め日
          <input value={cutoffDay} onChange={e => saveCutoffDay(e.target.value)} inputMode="numeric"
            style={{ width: 36, padding: '4px 5px', border: `1px solid ${colors.border}`, borderRadius: 3, fontSize: 12, textAlign: 'center' }} />
          日（{periodText} を {monthLabel(ym)} として集計）
        </div>
        <span className="kz-print-only" style={{ display: 'none', fontSize: 12 }}>
          {monthLabel(ym)}（{periodText}・締め日{cutoffDay}日）
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 560 }}>
          <thead>
            <tr>
              <th style={{ ...th, minWidth: 220, textAlign: 'left' }}>会社名</th>
              <th style={th} title="納品名（制作名）のユニーク数。同じ納品名の行（修正など）は1枚に数える">納品枚数（納品名）</th>
              <th style={th} title="行に入力された「制作枚数」の合計">制作枚数（入力値）</th>
              <th style={th} title="集計対象になった売上行の数">対象行数</th>
            </tr>
          </thead>
          <tbody>
            {groupRows('offshore')}
            {groupRows('lab')}
            <tr style={{ background: '#f0ede3', WebkitPrintColorAdjust: 'exact' }}>
              <td style={{ ...td, background: 'transparent', fontWeight: 700, textAlign: 'right' }}>総合計</td>
              <td style={{ ...tdNum, background: 'transparent', fontWeight: 700 }}>{summary.grand.count}</td>
              <td style={{ ...tdNum, background: 'transparent', fontWeight: 700 }}>{summary.grand.sheets || ''}</td>
              <td style={{ ...tdNum, background: 'transparent', fontWeight: 700 }}>{summary.grand.rows}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: colors.textMute, marginTop: 6 }}>
        納品日（10.納品日）が入力された行のみ集計します。区分（オフショア/ラボ）は行の売上区分から判定。
        {summary.missingDate > 0 && (
          <span style={{ color: '#c0392b', fontWeight: 600 }}> ※{monthLabel(ym)}の台帳に納品日未入力の行が{summary.missingDate}件あります（集計対象外）。</span>
        )}
      </div>
    </div>
  );
}

// CSV 出力
// Excel での数式実行（CSVインジェクション）対策：
// 先頭が = + - @ の「数値でない」文字列には ' を付けて数式として解釈されないようにする
function csvSafe(v) {
  const s = String(v ?? '');
  return /^[=+\-@]/.test(s) && isNaN(Number(s)) ? `'${s}` : s;
}
function exportCsv(ym, rows, settings) {
  const headers = ['区分', '番号', '会社名', '担当者名', '案件名', '制作種類', '制作名', '社内外注者', '社外外注者', '外注金額VND', '制作金額', '消費税', '税込合計', '制作枚数', '発注着手日', '納品予定日', '納品日', '完了', '請求書送付日', '入金確認日', '請求対象回', '請求金額', '消費税納付', '本社受取', '本社請求状態', '備考'];
  const lines = [headers.join(',')];
  let idx = {};
  for (const r of rows) {
    const c = computeRow(r, settings);
    idx[r.category] = (idx[r.category] || 0) + 1;
    const vals = [catOf(r.category).label, idx[r.category], r.company, r.person, r.projectName, r.prodType, r.prodName, r.inHouseOutsourcer, r.externalOutsourcer, num(r.outsourceVND), num(r.prodAmount), c.tax, c.taxIncl, num(r.sheets), r.orderDate, r.dueDate, r.deliveryDate, r.completed ? '完了' : '', r.invoiceSentDate, r.paymentConfirmedDate, r.billRound, num(r.billAmount), num(r.taxPayAmount), c.hqReceive, r.hqStatus, r.note];
    lines.push(vals.map(v => `"${csvSafe(v).replace(/"/g, '""')}"`).join(','));
  }
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `売上登録表_${ym}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function PrintStyles() {
  return (
    <style>{`
      @media print {
        body { margin: 0 !important; }
        body * { visibility: hidden !important; }
        #kz-sales-print, #kz-sales-print * { visibility: visible !important; }
        #kz-sales-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; }
        .kz-no-print { display: none !important; }
        .kz-print-only { display: block !important; }
        #kz-sales-print input { border: none !important; }
      }
      @page { size: A4 landscape; margin: 8mm; }
    `}</style>
  );
}
