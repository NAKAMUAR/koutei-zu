// マスタ「土日の出勤日」：本来休みの日（土日・祝日）に出勤する日と、その日の出勤時間帯を登録する。
// 登録した時間帯がその日の稼働枠になり、スケジュール・カレンダーに反映される（全員 or 担当者ごと）。
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../appContext.js';
import { dayName, fmtYMD, isRegularNonWorkingDay } from '../lib/utils.js';
import { TimeSelect } from '../components/common.jsx';

// 次の土曜日（今日が土曜なら今日）
function nextSaturday() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return fmtYMD(d);
}

function WorkdayManager() {
  const { colors, fontJP, settings, assigneeList, addWorkdays, removeWorkday, restoreWorkday, notify } = useApp();
  const workdays = settings?.workdays || [];
  const am = [settings?.morningStart || '08:00', settings?.morningEnd || '12:00'];
  const pm = [settings?.afternoonStart || '13:00', settings?.afternoonEnd || '17:00'];
  const PRESETS = [
    { id: 'am', label: `午前のみ（${am[0]}〜${am[1]}）`, windows: [am] },
    { id: 'pm', label: `午後のみ（${pm[0]}〜${pm[1]}）`, windows: [pm] },
    { id: 'full', label: `1日（${am[0]}〜${am[1]}・${pm[0]}〜${pm[1]}）`, windows: [am, pm] },
    { id: 'custom', label: '時間を指定する', windows: null },
  ];
  const [f, setF] = useState({ date: nextSaturday(), preset: 'full', startTime: am[0], endTime: pm[1], assignee: '', label: '' });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const submit = () => {
    if (!f.date) { notify('日付を選んでください', { type: 'error' }); return; }
    const preset = PRESETS.find(p => p.id === f.preset);
    const windows = preset.windows || [[f.startTime, f.endTime]];
    if (windows.some(([s, e]) => !s || !e || s >= e)) { notify('出勤時間帯の開始・終了を確認してください', { type: 'error' }); return; }
    addWorkdays(windows.map(([startTime, endTime]) => ({
      date: f.date, startTime, endTime, assignee: f.assignee, label: (f.label || '').trim(),
    })));
    const d = new Date(f.date + 'T00:00:00');
    notify(`${f.date}（${dayName(d)}）を出勤日に追加しました`, { type: 'success' });
    setF(p => ({ ...p, label: '' }));
  };
  const remove = (w) => {
    const removed = removeWorkday(w.id);
    notify(`${w.date} ${w.startTime}〜${w.endTime} の出勤を削除しました`, { undo: () => restoreWorkday(removed) });
  };

  const selDate = f.date ? new Date(f.date + 'T00:00:00') : null;
  const isWeekdayPick = selDate && !isNaN(selDate.getTime()) && !isRegularNonWorkingDay(selDate);
  const inputStyle = { padding: '5px 8px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 13, background: '#fff', color: colors.text };
  const todayStr = fmtYMD(new Date());
  const sorted = [...workdays].sort((x, y) => (x.date || '').localeCompare(y.date || '') || (x.startTime || '').localeCompare(y.startTime || ''));
  const upcoming = sorted.filter(w => w.date >= todayStr);
  const past = sorted.filter(w => w.date < todayStr).reverse();

  const row = (w) => {
    const d = new Date(w.date + 'T00:00:00');
    const holiday = (settings?.holidays || []).find(h => h.date === w.date);
    return (
      <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4, padding: '6px 10px', fontSize: 12, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, color: colors.text }}>{w.date}</span>
        <span style={{ color: d.getDay() === 0 ? colors.accent : colors.textMute }}>（{dayName(d)}）{holiday ? ` 祝日：${holiday.label || ''}` : ''}</span>
        <span style={{ background: '#e8f0e4', borderRadius: 10, padding: '1px 8px', color: '#3a5a40', fontWeight: 600 }}>
          出勤 {w.startTime}〜{w.endTime}
        </span>
        <span style={{ color: colors.text }}>{w.assignee || '全員'}</span>
        {w.label && <span style={{ color: colors.textMute }}>{w.label}</span>}
        <button type="button" onClick={() => remove(w)} title="削除"
          style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '3px 6px', cursor: 'pointer', color: colors.textMute, display: 'flex', alignItems: 'center' }}>
          <Trash2 size={13} />
        </button>
      </div>
    );
  };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 4 }}>土日の出勤日（休日出勤）</div>
      <div style={{ fontSize: 11, color: colors.textMute, marginBottom: 12, lineHeight: 1.6 }}>
        土日・祝日に出勤する日と、その日の出勤時間帯を登録します。登録した時間帯だけがその日の稼働時間になり、スケジュール・カレンダーに反映されます。
        担当者を選ばなければ全員の出勤日になります。同じ日に複数の時間帯を登録することもできます。
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} style={inputStyle} />
        {selDate && !isNaN(selDate.getTime()) && <span style={{ fontSize: 12, color: colors.textMute }}>（{dayName(selDate)}）</span>}
        <select value={f.preset} onChange={(e) => set('preset', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          {PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        {f.preset === 'custom' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: colors.textMute }}>
            <TimeSelect value={f.startTime} onChange={(v) => set('startTime', v)} colors={colors} fontJP={fontJP} />
            〜
            <TimeSelect value={f.endTime} onChange={(v) => set('endTime', v)} colors={colors} fontJP={fontJP} />
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <select value={f.assignee} onChange={(e) => set('assignee', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">全員</option>
          {(assigneeList || []).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input type="text" value={f.label} onChange={(e) => set('label', e.target.value)} placeholder="メモ（任意・例: 納期対応）" style={{ ...inputStyle, flex: '1 1 160px', minWidth: 120 }} />
        <button type="button" onClick={submit}
          style={{ padding: '6px 14px', background: colors.accentSoft, border: `1px solid ${colors.accent}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.accent, fontWeight: 600 }}>
          出勤日を追加
        </button>
      </div>
      {isWeekdayPick && (
        <div style={{ fontSize: 11, color: '#b26a00', marginBottom: 8 }}>
          この日は通常の出勤日です。登録すると、その日は通常の稼働時間の代わりに登録した時間帯だけで予定を組みます。
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
        {upcoming.length === 0 && <div style={{ fontSize: 12, color: colors.textMute }}>今日以降の出勤日はまだ登録されていません。</div>}
        {upcoming.map(row)}
      </div>
      {past.length > 0 && (
        <details style={{ marginTop: 14 }}>
          <summary style={{ fontSize: 12, color: colors.textMute, cursor: 'pointer' }}>過去の出勤日（{past.length}件）</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>{past.map(row)}</div>
        </details>
      )}
    </div>
  );
}

export { WorkdayManager };
