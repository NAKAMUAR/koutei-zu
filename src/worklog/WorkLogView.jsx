import React, { useState, useMemo } from 'react';
import { Clipboard, Trash2, Link as LinkIcon, Plus } from 'lucide-react';

// 実績（作業時間）一覧
// 7列のタブ区切りデータ（社内案件名 / 社外案件名 / カット名 / サーバリンク / 制作合計時間 / 白色時間 / 色付時間）を
// 貼り付けて一括取込し、案件ごと・全体で作業時間を集計・記録する。
//
// 工程スケジューラ本体（tasks/視点）とは独立した記録。保存は storage KV の 'workLogs' キー。

const COLUMNS = ['社内案件名', '社外案件名', 'カット名', 'サーバリンク', '制作合計時間', '白色時間', '色付時間'];

// 数値パース：空・非数値は 0
function num(v) {
  const n = parseFloat(String(v == null ? '' : v).trim());
  return Number.isFinite(n) ? n : 0;
}

// 時間表示：0 は空欄、整数はそのまま、小数は不要な 0 を落とす
function fmtH(n) {
  if (!n) return '';
  return String(Math.round(n * 100) / 100);
}
function fmtTotal(n) {
  if (!n) return '0';
  return String(Math.round(n * 100) / 100);
}

// 簡易ID
function genId() { return `wl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

// 貼り付けテキスト（TSV）をレコード配列に変換する。
// ・行はタブ区切り。先頭行が見出し（1列目が「社内案件名」）なら読み飛ばす。
// ・列順は COLUMNS のとおり。足りない列は空として扱う。
// ・社内案件名・社外案件名・カット名・サーバリンクのすべてが空の行は無視する。
export function parseWorkLogText(text) {
  const out = [];
  const lines = String(text || '').split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = line.split('\t');
    const internalName = (cells[0] || '').trim();
    if (internalName === '社内案件名') continue; // 見出し行
    const externalName = (cells[1] || '').trim();
    const cutName = (cells[2] || '').trim();
    const serverLink = (cells[3] || '').trim();
    if (!internalName && !externalName && !cutName && !serverLink) continue;
    out.push({
      id: genId(),
      internalName,
      externalName,
      cutName,
      serverLink,
      totalH: num(cells[4]),
      whiteH: num(cells[5]),
      colorH: num(cells[6]),
      createdAt: Date.now(),
    });
  }
  return out;
}

export default function WorkLogView({ workLogs = [], addWorkLogs, deleteWorkLog, clearWorkLogs, colors, fontJP, fontDisplay }) {
  const [pasteText, setPasteText] = useState('');
  const [groupBy, setGroupBy] = useState('internalName'); // 'internalName' | 'externalName' | 'none'

  const handleImport = () => {
    const parsed = parseWorkLogText(pasteText);
    if (parsed.length === 0) {
      alert('取り込めるデータがありませんでした。タブ区切り（スプレッドシートからのコピー）で貼り付けてください。');
      return;
    }
    addWorkLogs(parsed);
    setPasteText('');
    alert(`${parsed.length} 件を取り込みました。`);
  };

  // 合計
  const grand = useMemo(() => {
    return workLogs.reduce((acc, r) => {
      acc.totalH += r.totalH || 0; acc.whiteH += r.whiteH || 0; acc.colorH += r.colorH || 0;
      return acc;
    }, { totalH: 0, whiteH: 0, colorH: 0 });
  }, [workLogs]);

  // グループ集計（登録順を保つ）
  const groups = useMemo(() => {
    if (groupBy === 'none') return null;
    const map = new Map();
    for (const r of workLogs) {
      const key = (groupBy === 'externalName' ? r.externalName : r.internalName) || '（未設定）';
      if (!map.has(key)) map.set(key, { key, count: 0, totalH: 0, whiteH: 0, colorH: 0 });
      const g = map.get(key);
      g.count += 1; g.totalH += r.totalH || 0; g.whiteH += r.whiteH || 0; g.colorH += r.colorH || 0;
    }
    return [...map.values()];
  }, [workLogs, groupBy]);

  const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: colors.textMute, borderBottom: `2px solid ${colors.border}`, whiteSpace: 'nowrap' };
  const thR = { ...th, textAlign: 'right' };
  const td = { padding: '7px 10px', fontSize: 12, borderBottom: `1px solid ${colors.border}`, verticalAlign: 'top' };
  const tdR = { ...td, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '8px 4px', fontFamily: fontJP, color: colors.text }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 700, margin: 0 }}>実績（作業時間）</h2>
        <span style={{ fontSize: 12, color: colors.textMute }}>{workLogs.length} 件</span>
      </div>
      <p style={{ fontSize: 12, color: colors.textMute, margin: '0 0 16px 0', lineHeight: 1.7 }}>
        スプレッドシートやExcelの表（社内案件名／社外案件名／カット名／サーバリンク／制作合計時間／白色時間／色付時間）を
        そのままコピーして下の欄に貼り付け、「取り込む」を押すと一覧に追加されます。見出し行が含まれていても自動でスキップします。
      </p>

      {/* 貼り付け取込 */}
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clipboard size={14} /> 貼り付けて一括取込
        </div>
        <div style={{ fontSize: 10, color: colors.textMute, marginBottom: 8 }}>
          列の順番：{COLUMNS.join(' ／ ')}（タブ区切り）
        </div>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={`例）\nREN55\t金宝堂様\tEX19\t\\\\Cg-server\\...\t7\t4\t3`}
          style={{
            width: '100%', minHeight: 120, boxSizing: 'border-box', resize: 'vertical',
            fontFamily: 'monospace', fontSize: 12, padding: 10, borderRadius: 4,
            border: `1px solid ${colors.border}`, background: '#fff', color: colors.text,
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleImport}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: colors.accent, color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP }}>
            <Plus size={14} /> 取り込む
          </button>
          <button onClick={() => setPasteText('')}
            style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMute, fontSize: 12, padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP }}>
            欄をクリア
          </button>
        </div>
      </div>

      {/* 集計 */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { label: '制作合計時間', val: grand.totalH, accent: true },
          { label: '白色時間', val: grand.whiteH },
          { label: '色付時間', val: grand.colorH },
        ].map(c => (
          <div key={c.label} style={{ flex: '1 1 160px', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: colors.textMute }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.accent ? colors.accent : colors.text, fontVariantNumeric: 'tabular-nums' }}>
              {fmtTotal(c.val)}<span style={{ fontSize: 12, fontWeight: 600, color: colors.textMute, marginLeft: 3 }}>h</span>
            </div>
          </div>
        ))}
      </div>

      {/* グループ集計切替 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: colors.textMute }}>集計の単位：</span>
        {[
          { id: 'internalName', label: '社内案件名' },
          { id: 'externalName', label: '社外案件名' },
          { id: 'none', label: '集計しない' },
        ].map(o => (
          <button key={o.id} onClick={() => setGroupBy(o.id)}
            style={{
              fontSize: 12, padding: '5px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: fontJP,
              border: `1px solid ${groupBy === o.id ? colors.accent : colors.border}`,
              background: groupBy === o.id ? colors.accent : 'transparent',
              color: groupBy === o.id ? '#fff' : colors.textMute, fontWeight: groupBy === o.id ? 700 : 500,
            }}>
            {o.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {workLogs.length > 0 && (
          <button onClick={() => { if (confirm('実績データをすべて削除します。よろしいですか？')) clearWorkLogs(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: `1px solid ${colors.border}`, color: '#b04444', fontSize: 11, padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP }}>
            <Trash2 size={12} /> 全件削除
          </button>
        )}
      </div>

      {/* グループ別小計 */}
      {groups && groups.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: 24, border: `1px solid ${colors.border}`, borderRadius: 8 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 520 }}>
            <thead>
              <tr>
                <th style={th}>{groupBy === 'externalName' ? '社外案件名' : '社内案件名'}</th>
                <th style={thR}>件数</th>
                <th style={thR}>制作合計</th>
                <th style={thR}>白色</th>
                <th style={thR}>色付</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.key}>
                  <td style={{ ...td, fontWeight: 600 }}>{g.key}</td>
                  <td style={tdR}>{g.count}</td>
                  <td style={{ ...tdR, fontWeight: 700, color: colors.accent }}>{fmtTotal(g.totalH)}</td>
                  <td style={tdR}>{fmtH(g.whiteH)}</td>
                  <td style={tdR}>{fmtH(g.colorH)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 明細一覧 */}
      <div style={{ overflowX: 'auto', border: `1px solid ${colors.border}`, borderRadius: 8 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
          <thead>
            <tr>
              <th style={th}>社内案件名</th>
              <th style={th}>社外案件名</th>
              <th style={th}>カット名</th>
              <th style={th}>サーバリンク</th>
              <th style={thR}>制作合計</th>
              <th style={thR}>白色</th>
              <th style={thR}>色付</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {workLogs.length === 0 && (
              <tr><td style={{ ...td, color: colors.textMute, textAlign: 'center' }} colSpan={8}>まだ実績がありません。上の欄に貼り付けて取り込んでください。</td></tr>
            )}
            {workLogs.map(r => (
              <tr key={r.id}>
                <td style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.internalName}</td>
                <td style={td}>{r.externalName}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.cutName}</td>
                <td style={{ ...td, maxWidth: 380 }}>
                  {r.serverLink ? (
                    <span title={r.serverLink} style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 4, color: colors.textMute, wordBreak: 'break-all', fontSize: 11 }}>
                      <LinkIcon size={12} style={{ flex: '0 0 auto', marginTop: 2 }} />
                      <span style={{ overflowWrap: 'anywhere' }}>{r.serverLink}</span>
                    </span>
                  ) : null}
                </td>
                <td style={{ ...tdR, fontWeight: 700, color: colors.accent }}>{fmtTotal(r.totalH)}</td>
                <td style={tdR}>{fmtH(r.whiteH)}</td>
                <td style={tdR}>{fmtH(r.colorH)}</td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <button onClick={() => deleteWorkLog(r.id)} title="この行を削除"
                    style={{ background: 'transparent', border: 'none', color: colors.textMute, cursor: 'pointer', padding: 2 }}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {workLogs.length > 0 && (
            <tfoot>
              <tr>
                <td style={{ ...td, fontWeight: 700 }} colSpan={4}>合計</td>
                <td style={{ ...tdR, fontWeight: 800, color: colors.accent }}>{fmtTotal(grand.totalH)}</td>
                <td style={{ ...tdR, fontWeight: 700 }}>{fmtH(grand.whiteH)}</td>
                <td style={{ ...tdR, fontWeight: 700 }}>{fmtH(grand.colorH)}</td>
                <td style={td}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
