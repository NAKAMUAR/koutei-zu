// 保管している過去分（data/legacy_YYYY-MM）を検索・書き出す。過去分の取り込み画面の下に出す
import { useMemo, useState } from 'react';
import { useApp } from '../appContext.js';
import { LEGACY_ASSIGNEE } from '../lib/legacyImport.js';
import { archiveToRows, rowsToCSV, rowsToTSV, searchArchive } from '../lib/legacyArchive.js';

const SHOW = 200;

export default function LegacyArchivePanel({ list }) {
  const { colors, fontJP, notify } = useApp();
  const [q, setQ] = useState('');
  const hits = useMemo(() => searchArchive(list || [], q), [list, q]);
  const stats = useMemo(() => {
    const all = list || [];
    return { all: all.length, unknown: all.filter(t => t.assignee === LEGACY_ASSIGNEE).length, hours: Math.round(all.reduce((s, t) => s + (Number(t.hours) || 0), 0)) };
  }, [list]);

  const copyTSV = async () => {
    try {
      await navigator.clipboard.writeText(rowsToTSV(archiveToRows(hits)));
      notify(`${hits.length}件をコピーしました。スプレッドシートの A1 に貼り付けてください`, { type: 'success' });
    } catch (e) {
      notify(`コピーできませんでした：${e && e.message || e}`, { type: 'error' });
    }
  };
  const downloadCSV = () => {
    const blob = new Blob([rowsToCSV(archiveToRows(hits))], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `過去分_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const th = { position: 'sticky', top: 0, background: '#eef1f5', borderBottom: `1px solid ${colors.border}`, padding: '5px 8px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'left' };
  const td = { borderBottom: `1px solid ${colors.border}`, padding: '4px 8px', fontSize: 12, verticalAlign: 'top' };
  const btn = { padding: '6px 12px', background: '#fff', color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12 };

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontSize: 13, fontWeight: 700, margin: '0 0 6px' }}>保管している過去分</div>
      {!list ? (
        <div style={{ fontSize: 12, color: colors.textMute }}>読み込み中…</div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: colors.textMute, marginBottom: 8 }}>
            {stats.all}件（担当者不明 {stats.unknown}件・合計 {stats.hours}時間）。検索した結果をスプレッドシートに貼る形でコピー、または CSV ファイルで保存できます。
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="社内案件名・案件名・会社名・担当者で検索"
              style={{ flex: '1 1 260px', padding: '6px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 12 }} />
            <button type="button" onClick={copyTSV} disabled={!hits.length} style={btn}>シート用にコピー（{hits.length}件）</button>
            <button type="button" onClick={downloadCSV} disabled={!hits.length} style={btn}>CSV で保存</button>
          </div>
          <div style={{ overflow: 'auto', maxHeight: '50vh', border: `1px solid ${colors.border}`, borderRadius: 4, background: '#fff' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 760 }}>
              <thead>
                <tr><th style={th}>社内案件名</th><th style={th}>社外案件名</th><th style={th}>会社名</th><th style={th}>担当者</th><th style={th}>推定の登録日</th><th style={th}>時間</th><th style={th}>内容</th></tr>
              </thead>
              <tbody>
                {hits.length === 0 && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: colors.textMute, padding: 20 }}>{stats.all ? '該当なし' : 'まだ保管している過去分はありません'}</td></tr>}
                {hits.slice(0, SHOW).map(t => (
                  <tr key={t.id}>
                    <td style={{ ...td, whiteSpace: 'nowrap', fontWeight: 600 }}>{t.projectNameInternal}</td>
                    <td style={td}>{t.projectName !== t.projectNameInternal ? t.projectName : ''}</td>
                    <td style={td}>{t.companyName}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{t.assignee === LEGACY_ASSIGNEE ? <span style={{ color: colors.textMute }}>不明</span> : t.assignee}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{t.registeredDate}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{t.hours || 0}h</td>
                    <td style={{ ...td, fontSize: 11 }} title={t.memo}>{t.viewpointName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hits.length > SHOW && <div style={{ fontSize: 11, color: colors.textMute, marginTop: 4 }}>先頭の {SHOW}件だけ表示しています（コピー・CSV は {hits.length}件すべて）。</div>}
        </>
      )}
    </div>
  );
}
