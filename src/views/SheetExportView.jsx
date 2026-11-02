// シート貼り付け用（集計・帳票グループ）：売上登録表・帳票一覧を表で見て、
// 「表をコピー」で Google スプレッドシートにそのまま貼り付けられるようにする。
// 入力は工程図だけ（シートで直した内容は工程図に戻らない）。
import { useEffect, useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { useApp } from '../appContext.js';
import { billingStore } from '../firebase.js';
import { migrateBillingDoc } from '../billing/billingUtils.js';
import { billingTable, salesTable, toTSV } from '../lib/sheetExport.js';
import { MonthSelect, tabStyle } from '../components/common.jsx';

const ymOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const DOC_TYPE_OPTIONS = [
  { id: 'invoice', label: '請求書' },
  { id: 'estimate', label: '見積書' },
  { id: 'order', label: '発注書' },
];

export default function SheetExportView() {
  const { colors, fontJP, fontDisplay, salesLedger, now, notify } = useApp();
  const [tab, setTab] = useState('sales');
  const [fromYm, setFromYm] = useState(() => ymOf(now));
  const [toYm, setToYm] = useState(() => ymOf(now));
  const [types, setTypes] = useState(['invoice']);
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    const unsub = billingStore.subscribe((map) => setDocs(Object.values(map || {}).map(migrateBillingDoc)));
    return () => unsub && unsub();
  }, []);

  const table = useMemo(() => {
    if (tab === 'sales') return salesTable(salesLedger, fromYm, toYm);
    const last = toYm ? `${toYm}-31` : '';
    return billingTable(docs, types, fromYm ? `${fromYm}-01` : '', last);
  }, [tab, salesLedger, docs, fromYm, toYm, types]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toTSV(table.headers, table.rows));
      notify(`${table.rows.length}行をコピーしました。スプレッドシートの貼り付けたいセルを選んで貼り付けてください`, { type: 'success' });
    } catch (e) {
      notify('コピーできませんでした。表を選んでコピーしてください', { type: 'error' });
    }
  };

  const sel = { padding: '4px 8px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 12, background: '#fff', cursor: 'pointer' };
  const th = { position: 'sticky', top: 0, background: '#eef1f5', borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, padding: '5px 8px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'left', zIndex: 1 };
  const td = { borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, padding: '4px 8px', fontSize: 12, whiteSpace: 'nowrap' };

  return (
    <section style={{ fontFamily: fontJP }}>
      <h2 style={{ fontFamily: fontDisplay, fontSize: 20, margin: '0 0 6px 0', fontWeight: 500 }}>シート貼り付け用</h2>
      <p style={{ fontSize: 12, color: colors.textMute, margin: '0 0 14px 0' }}>
        売上登録表と帳票の一覧を、スプレッドシートと同じ形の表にします。「表をコピー」を押して、スプレッドシートの貼り付けたいセル（見出しを入れたいセル）を選んで貼り付けてください。<br />
        入力・修正は工程図で行います（シートで直した内容は工程図に戻りません）。
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => setTab('sales')} style={tabStyle(tab === 'sales', colors, fontJP)}>売上登録表</button>
        <button type="button" onClick={() => setTab('billing')} style={tabStyle(tab === 'billing', colors, fontJP)}>帳票一覧</button>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12, fontSize: 12, color: colors.textMute }}>
        <span>{tab === 'sales' ? '計上月' : '発行月'}</span>
        <MonthSelect value={fromYm} now={now} onChange={setFromYm} style={sel} title="この月から" />
        <span>〜</span>
        <MonthSelect value={toYm} now={now} onChange={setToYm} style={sel} title="この月まで" />
        {tab === 'billing' && DOC_TYPE_OPTIONS.map(o => (
          <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: colors.text }}>
            <input type="checkbox" checked={types.includes(o.id)}
              onChange={(e) => setTypes(prev => e.target.checked ? [...prev, o.id] : prev.filter(x => x !== o.id))} />
            {o.label}
          </label>
        ))}
        <span style={{ marginLeft: 'auto' }}>{table.rows.length}行</span>
        <button type="button" onClick={copy} disabled={table.rows.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: table.rows.length ? colors.text : colors.textMute, color: '#fff', border: 'none', borderRadius: 4, cursor: table.rows.length ? 'pointer' : 'default', fontFamily: fontJP, fontSize: 13, fontWeight: 600 }}>
          <Copy size={14} />表をコピー（見出しつき）
        </button>
      </div>

      <div style={{ overflow: 'auto', maxHeight: '70vh', border: `1px solid ${colors.border}`, borderRadius: 4, background: '#fff' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%' }}>
          <thead>
            <tr>
              <th style={{ ...th, color: colors.textMute, textAlign: 'center' }}></th>
              {table.headers.map(h => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {table.rows.length === 0 && (
              <tr><td colSpan={table.headers.length + 1} style={{ ...td, textAlign: 'center', color: colors.textMute, padding: 30 }}>この期間のデータはありません</td></tr>
            )}
            {table.rows.map((r, i) => (
              <tr key={i}>
                <td style={{ ...td, color: colors.textMute, textAlign: 'center', background: '#f7f7f7' }}>{i + 1}</td>
                {r.map((v, j) => (
                  <td key={j} style={{ ...td, textAlign: typeof v === 'number' ? 'right' : 'left' }}>
                    {typeof v === 'number' ? v.toLocaleString('ja-JP') : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
