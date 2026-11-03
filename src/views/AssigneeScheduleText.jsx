// サマリー画面の「担当者別スケジュール（ベトナム語）」：担当者と期間を選び、
// 時刻・案件・視点・作業（ベトナム語＋日本語）・時間・納期の一覧をコピーしてエンジニアに送る。
import { useMemo, useState } from 'react';
import { useApp } from '../appContext.js';
import { buildAssigneeSchedule } from '../lib/viSchedule.js';

export function AssigneeScheduleText() {
  const { colors, fontJP, scheduled, assigneeOrder, now, notify } = useApp();
  const names = useMemo(() => {
    const used = new Set((scheduled.active || []).map(t => (t.assignee || '').trim()).filter(Boolean));
    const ordered = (assigneeOrder || []).filter(n => used.has(n));
    return [...ordered, ...[...used].filter(n => !ordered.includes(n))];
  }, [scheduled.active, assigneeOrder]);
  const [who, setWho] = useState('');
  const [days, setDays] = useState(1);
  const targets = who ? [who] : names;
  const text = useMemo(() => targets
    .map(n => buildAssigneeSchedule(scheduled.active, n, now, days))
    .filter(Boolean).join('\n\n――――――――――\n\n'), [targets, scheduled.active, now, days]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); notify('コピーしました', { type: 'success' }); }
    catch (e) { notify('コピーに失敗しました', { type: 'error' }); }
  };
  const sel = { padding: '4px 8px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 12, background: '#fff', cursor: 'pointer' };
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8, fontSize: 12, color: colors.textMute }}>
        担当者
        <select value={who} onChange={(e) => setWho(e.target.value)} style={sel}>
          <option value="">全員</option>
          {names.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        期間
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={sel}>
          <option value={1}>今日</option>
          <option value={2}>今日と明日</option>
          <option value={7}>1週間</option>
        </select>
        <button type="button" onClick={copy} disabled={!text}
          style={{ marginLeft: 'auto', padding: '6px 14px', background: text ? colors.text : colors.textMute, color: '#fff', border: 'none', borderRadius: 3, cursor: text ? 'pointer' : 'default', fontSize: 12, fontWeight: 600, fontFamily: fontJP }}>
          クリップボードへコピー
        </button>
      </div>
      <textarea readOnly value={text || '（この期間の予定はありません）'}
        style={{ width: '100%', minHeight: 220, padding: 12, border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, background: '#fbf9f4', color: colors.text, resize: 'vertical', boxSizing: 'border-box' }} />
      <div style={{ fontSize: 10, color: colors.textMute, marginTop: 6 }}>
        ※ 今のスケジュールから自動で作ります（時刻は工程図の時計）。作業名はベトナム語と日本語の併記です。
      </div>
    </div>
  );
}
