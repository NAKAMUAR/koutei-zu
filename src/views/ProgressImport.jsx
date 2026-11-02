// 進捗の取り込み（AI）：
//  ① 進行中の作業一覧と出力の形式を書いた「AIへの指示文」をコピー → LINE の会話と一緒に AI へ貼る
//  ② AI の答えをここへ貼る → 予定（今ごろ終わっているはずの時間）と比べて一覧表示
//  ③ チェックした行の完了時間を工程図に反映（元に戻す付き）
import { useMemo, useState } from 'react';
import { Copy, X } from 'lucide-react';
import { useApp } from '../appContext.js';
import { elapsedHoursForSlots } from '../lib/schedule.js';
import { buildProgressPrompt, parseProgressReport, progressCodes, progressTarget } from '../lib/stage.js';

const r1 = (v) => Math.round((Number(v) || 0) * 10) / 10;

export function ProgressImport({ onClose }) {
  const { colors, fontJP, fontDisplay, scheduled, now, assigneeList, setTaskCompletedHours, notify } = useApp();
  const [assignee, setAssignee] = useState('');
  const [answer, setAnswer] = useState('');
  const [parsed, setParsed] = useState(null);
  const [skip, setSkip] = useState(() => new Set());

  // 対象：スケジュールに載っている未完了の作業（中断中・時間0は除く）
  const active = useMemo(
    () => (scheduled.active || []).filter(t => (Number(t.hours) || 0) > 0 && !t.suspended),
    [scheduled.active]
  );
  // 番号は全作業で決める（担当者で絞っても番号は変わらない）
  const codes = useMemo(() => progressCodes(active), [active]);
  const listed = assignee ? active.filter(t => t.assignee === assignee) : active;
  const prompt = useMemo(() => buildProgressPrompt(listed, codes), [listed, codes]);
  const byId = useMemo(() => new Map(active.map(t => [t.id, t])), [active]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      notify('AIへの指示文をコピーしました。AIに貼り付けて、続けて LINE の会話を貼ってください', { type: 'success' });
    } catch (e) {
      notify('コピーできませんでした。下の枠の文字を選んでコピーしてください', { type: 'error' });
    }
  };
  const read = () => {
    const res = parseProgressReport(answer, byId, codes);
    setParsed(res);
    setSkip(new Set(res.filter(x => x.error || progressTarget(x) == null || progressTarget(x) === r1(x.task && x.task.completedHours)).map(x => x.code)));
    if (res.length === 0) notify('「#番号 | 完了時間 | 状態 | メモ」の形の行が見つかりませんでした', { type: 'error' });
  };
  const apply = () => {
    const rows = (parsed || []).filter(x => !skip.has(x.code) && !x.error && progressTarget(x) != null);
    if (rows.length === 0) { notify('反映する行がありません', { type: 'error' }); return; }
    const before = rows.map(x => ({ id: x.task.id, completed: Number(x.task.completedHours) || 0 }));
    rows.forEach(x => setTaskCompletedHours(x.task.id, progressTarget(x)));
    notify(`${rows.length}件の完了時間を反映しました`, {
      type: 'success',
      undo: () => before.forEach(b => setTaskCompletedHours(b.id, b.completed)),
    });
    onClose();
  };

  const box = { width: '100%', boxSizing: 'border-box', border: `1px solid ${colors.border}`, borderRadius: 4, padding: '8px 10px', fontFamily: fontJP, fontSize: 12, background: '#fff', color: colors.text, resize: 'vertical' };
  const stepTitle = { fontSize: 13, fontWeight: 700, margin: '14px 0 6px', color: colors.text };
  const th = { textAlign: 'left', padding: '4px 6px', fontSize: 11, color: colors.textMute, borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' };
  const td = { padding: '5px 6px', fontSize: 12, borderBottom: `1px solid ${colors.border}`, verticalAlign: 'top' };

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: 16, overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, padding: 20, width: '100%', maxWidth: 860, fontFamily: fontJP, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', margin: '24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 17, margin: 0, fontWeight: 600, flex: 1 }}>進捗の取り込み（AI）</h3>
          <button type="button" onClick={onClose} aria-label="閉じる"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMute, padding: 4 }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: 12, color: colors.textMute, margin: '6px 0 0' }}>
          LINE の会話を AI（ChatGPT・Claude など）に読ませて、決まった形で答えてもらい、その答えをここに貼ると完了時間を工程図に入れられます。
        </p>

        <div style={stepTitle}>① AIへの指示文をコピーする</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
          <label style={{ fontSize: 12, color: colors.textMute, display: 'flex', alignItems: 'center', gap: 6 }}>
            担当者
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)}
              style={{ padding: '3px 6px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 12 }}>
              <option value="">全員</option>
              {(assigneeList || []).map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <span style={{ fontSize: 11, color: colors.textMute }}>作業 {listed.length}件</span>
          <button type="button" onClick={copy}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: colors.text, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, fontWeight: 600 }}>
            <Copy size={13} />指示文をコピー
          </button>
        </div>
        <textarea readOnly value={prompt} rows={6} style={{ ...box, fontSize: 11, color: colors.textMute }} onFocus={(e) => e.target.select()} />
        <div style={{ fontSize: 11, color: colors.textMute, marginTop: 4 }}>
          AIに貼り付けたら、最後の「（ここに LINE の会話を…）」のところに LINE の会話を貼って送ってください。
        </div>

        <div style={stepTitle}>② AIの答えを貼り付ける</div>
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5}
          placeholder={'#a1b2c | 3.5 | 作業中 | 家具の差し替え待ち\n#d3e4f | 2 | 完了 |'} style={box} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <button type="button" onClick={read} disabled={!answer.trim()}
            style={{ padding: '6px 14px', background: '#fff', border: `1px solid ${colors.text}`, borderRadius: 4, cursor: answer.trim() ? 'pointer' : 'default', fontFamily: fontJP, fontSize: 12, fontWeight: 600, color: colors.text, opacity: answer.trim() ? 1 : 0.5 }}>
            読み取る
          </button>
        </div>

        {parsed && parsed.length > 0 && (
          <>
            <div style={stepTitle}>③ 内容を確かめて反映する</div>
            <div style={{ fontSize: 11, color: colors.textMute, marginBottom: 6 }}>
              「予定」は今の時刻までに終わっているはずの時間です。報告が予定より0.5時間以上少ない行は赤で表示します。反映しない行はチェックを外してください。
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 640 }}>
                <thead>
                  <tr>
                    <th style={th}>反映</th><th style={th}>作業</th><th style={th}>担当</th>
                    <th style={th}>今</th><th style={th}>報告</th><th style={th}>予定</th><th style={th}>メモ</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map(x => {
                    const t = x.task;
                    const target = progressTarget(x);
                    const expected = t ? r1((Number(t.completedHours) || 0) + elapsedHoursForSlots(t.slots, now)) : null;
                    const behind = t && target != null && expected != null && target < expected - 0.5;
                    return (
                      <tr key={x.code} style={{ opacity: x.error ? 0.6 : 1 }}>
                        <td style={td}>
                          <input type="checkbox" disabled={!!x.error || target == null} checked={!skip.has(x.code)}
                            onChange={(e) => setSkip(prev => { const s = new Set(prev); e.target.checked ? s.delete(x.code) : s.add(x.code); return s; })} />
                        </td>
                        <td style={td}>
                          <div style={{ fontSize: 10, color: colors.textMute }}>#{x.code}</div>
                          {t ? <>{t.projectNameInternal || t.projectName} ／ {t.viewpointName} ／ {t.stepName}</> : <span style={{ color: colors.accent }}>{x.error}</span>}
                        </td>
                        <td style={td}>{t ? t.assignee : ''}</td>
                        <td style={td}>{t ? `${r1(t.completedHours)}/${r1(t.hours)}h` : ''}</td>
                        <td style={{ ...td, fontWeight: 700, color: behind ? colors.accent : colors.text }}>
                          {target != null ? `${r1(target)}h` : '—'}{x.status === 'done' ? ' 完了' : ''}
                          {t && x.error && <div style={{ fontSize: 10, color: colors.accent, fontWeight: 400 }}>{x.error}</div>}
                        </td>
                        <td style={td}>{expected != null ? `${expected}h` : ''}</td>
                        <td style={{ ...td, color: colors.textMute }}>{x.memo}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button type="button" onClick={onClose}
                style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, color: colors.textMute }}>
                やめる
              </button>
              <button type="button" onClick={apply}
                style={{ padding: '8px 18px', background: colors.text, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 600 }}>
                チェックした行を反映
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
