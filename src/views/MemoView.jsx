// タスクメモビュー（Apple カレンダー風：スケジュール＋メモ）。App.jsx から分割。
import { useState, useMemo } from 'react';
import { useApp } from '../appContext.js';
import { Bell, BellOff, Plus, Search, StickyNote, Trash2, X } from 'lucide-react';

// ============ タスクメモビュー（Apple カレンダー風：スケジュール＋メモ） ============
const MEMO_COLORS = ['#c1272d', '#bc6c25', '#3a5a40', '#1d3557', '#6a4c93', '#00838f', '#ad1457', '#5d4037'];
function pad2(n) { return String(n).padStart(2, '0'); }
function todayStr(now) {
  const d = now instanceof Date ? now : new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function formatMemoDate(dateStr) {
  // 'YYYY-MM-DD' → '6月15日（月）' 形式
  const [y, m, d] = (dateStr || '').split('-').map(Number);
  if (!y || !m || !d) return dateStr || '';
  const dt = new Date(y, m - 1, d);
  const wd = ['日', '月', '火', '水', '木', '金', '土'][dt.getDay()];
  return `${m}月${d}日（${wd}）`;
}

function MemoView() {
  const { colors, fontJP, fontDisplay, memos, upsertMemo, deleteMemo, now } = useApp();
  const blankMemo = () => ({
    id: null, title: '', date: todayStr(now), startTime: '09:00', endTime: '10:00',
    allDay: false, note: '', color: MEMO_COLORS[0],
  });
  const [editing, setEditing] = useState(null); // 編集中メモ（null=非表示）
  const [search, setSearch] = useState('');
  // 通知許可の状態（'granted'/'default'/'denied'/'unsupported'）
  const [notifPerm, setNotifPerm] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'));
  const requestNotif = async () => {
    if (typeof Notification === 'undefined') { setNotifPerm('unsupported'); return; }
    try { const p = await Notification.requestPermission(); setNotifPerm(p); } catch (e) {}
  };

  const today = todayStr(now);

  // 検索フィルタ → 日付・開始時刻順にソート
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = (memos || []).filter(m => {
      if (!q) return true;
      return (m.title || '').toLowerCase().includes(q) || (m.note || '').toLowerCase().includes(q);
    });
    return rows.slice().sort((a, b) => {
      if ((a.date || '') !== (b.date || '')) return (a.date || '').localeCompare(b.date || '');
      const at = a.allDay ? '' : (a.startTime || '');
      const bt = b.allDay ? '' : (b.startTime || '');
      return at.localeCompare(bt);
    });
  }, [memos, search]);

  // 日付ごとにグルーピング
  const grouped = useMemo(() => {
    const map = new Map();
    for (const m of filtered) {
      const key = m.date || '(日付なし)';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    }
    return [...map.entries()];
  }, [filtered]);

  const startNew = () => setEditing(blankMemo());
  const startEdit = (m) => setEditing({ ...m });

  const handleSave = () => {
    const e = editing;
    if (!(e.title || '').trim() && !(e.note || '').trim()) { setEditing(null); return; }
    const ts = Date.now();
    const memo = {
      ...e,
      title: (e.title || '').trim(),
      note: e.note || '',
      id: e.id || `memo_${ts}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: e.createdAt || ts,
      updatedAt: ts,
    };
    upsertMemo(memo);
    setEditing(null);
  };

  const handleDelete = () => {
    if (editing?.id) deleteMemo(editing.id);
    setEditing(null);
  };

  const inputStyle = {
    padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: 4,
    fontFamily: fontJP, fontSize: 14, color: colors.text, background: '#fff', width: '100%', boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: 11, color: colors.textMute, marginBottom: 4, display: 'block', letterSpacing: '0.04em' };

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {/* 左：アジェンダ（日付別リスト） */}
      <div style={{ flex: '1 1 460px', minWidth: 320 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '0.04em' }}>タスクメモ</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* 通知の有効化 */}
            {notifPerm === 'granted' ? (
              <span title="このブラウザでメモの通知が有効です（アプリを開いている間に通知します）"
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 12, color: colors.progress, fontWeight: 600 }}>
                <Bell size={14} /> 通知ON
              </span>
            ) : notifPerm === 'denied' ? (
              <span title="ブラウザの設定で通知がブロックされています。サイトの通知を許可に変更してください。"
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 12, color: colors.textMute }}>
                <BellOff size={14} /> 通知ブロック中
              </span>
            ) : notifPerm === 'unsupported' ? null : (
              <button onClick={requestNotif} title="メモの開始時刻に通知します（アプリを開いている間）"
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', background: '#fff', color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, fontWeight: 500 }}>
                <Bell size={14} /> 通知を有効にする
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${colors.border}`, borderRadius: 4, padding: '5px 9px', background: '#fff' }}>
              <Search size={14} color={colors.textMute} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="検索"
                style={{ border: 'none', outline: 'none', fontFamily: fontJP, fontSize: 13, width: 110, color: colors.text }} />
            </div>
            <button onClick={startNew}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 500 }}>
              <Plus size={15} />新規メモ
            </button>
          </div>
        </div>

        {grouped.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.textMute, fontSize: 14, border: `1px dashed ${colors.border}`, borderRadius: 8 }}>
            <StickyNote size={32} color={colors.border} style={{ marginBottom: 12 }} />
            <div>{search ? '該当するメモがありません' : 'メモはまだありません。「新規メモ」から追加できます。'}</div>
          </div>
        ) : (
          grouped.map(([date, items]) => (
            <div key={date} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '0 0 8px 0', borderBottom: `1px solid ${colors.border}`, marginBottom: 10 }}>
                <span style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, color: date === today ? colors.accent : colors.text }}>
                  {formatMemoDate(date)}
                </span>
                {date === today && <span style={{ fontSize: 10, color: colors.accent, fontWeight: 600, letterSpacing: '0.08em' }}>今日</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(m => {
                  const selected = editing && editing.id === m.id;
                  return (
                    <div key={m.id} onClick={() => startEdit(m)}
                      style={{
                        display: 'flex', gap: 12, padding: '12px 14px', cursor: 'pointer',
                        background: selected ? colors.accentSoft : '#fff',
                        border: `1px solid ${selected ? colors.accent : colors.border}`, borderRadius: 6,
                        transition: 'border-color .12s',
                      }}>
                      {/* 時刻列 */}
                      <div style={{ width: 56, flexShrink: 0, textAlign: 'right', paddingTop: 1 }}>
                        {m.allDay ? (
                          <span style={{ fontSize: 11, color: colors.textMute, fontWeight: 600 }}>終日</span>
                        ) : (
                          <>
                            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, fontFamily: fontDisplay }}>{m.startTime || ''}</div>
                            {m.endTime && <div style={{ fontSize: 11, color: colors.textMute }}>{m.endTime}</div>}
                          </>
                        )}
                      </div>
                      {/* カラーバー */}
                      <div style={{ width: 4, borderRadius: 2, background: m.color || MEMO_COLORS[0], flexShrink: 0 }} />
                      {/* 本文 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: m.note ? 3 : 0 }}>
                          {m.title || '（無題）'}
                        </div>
                        {m.note && (
                          <div style={{ fontSize: 12, color: colors.textMute, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>
                            {m.note}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 右：編集パネル（Apple カレンダーのイベント編集風） */}
      {editing && (
        <div style={{ flex: '0 0 320px', position: 'sticky', top: 20, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, margin: 0 }}>{editing.id ? 'メモを編集' : '新規メモ'}</h3>
            <button onClick={() => setEditing(null)} title="閉じる"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMute, padding: 2, display: 'flex' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>タイトル</label>
            <input value={editing.title} autoFocus
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="予定・タスク名" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>日付</label>
            <input type="date" value={editing.date}
              onChange={(e) => setEditing({ ...editing, date: e.target.value })} style={inputStyle} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, color: colors.text, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!editing.allDay}
              onChange={(e) => setEditing({ ...editing, allDay: e.target.checked })} />
            終日
          </label>

          {!editing.allDay && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>開始</label>
                <input type="time" value={editing.startTime || ''}
                  onChange={(e) => setEditing({ ...editing, startTime: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>終了</label>
                <input type="time" value={editing.endTime || ''}
                  onChange={(e) => setEditing({ ...editing, endTime: e.target.value })} style={inputStyle} />
              </div>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>カラー</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {MEMO_COLORS.map(c => (
                <button key={c} onClick={() => setEditing({ ...editing, color: c })} title={c}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: editing.color === c ? `2px solid ${colors.text}` : '2px solid transparent',
                    boxShadow: editing.color === c ? `0 0 0 2px #fff inset` : 'none',
                  }} />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>メモ</label>
            <textarea value={editing.note}
              onChange={(e) => setEditing({ ...editing, note: e.target.value })}
              placeholder="詳細・メモを入力" rows={5}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave}
              style={{ flex: 1, padding: '9px 14px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 600 }}>
              保存
            </button>
            {editing.id && (
              <button onClick={handleDelete} title="削除"
                style={{ padding: '9px 12px', background: 'transparent', color: colors.accent, border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Trash2 size={15} />削除
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export { MemoView, MEMO_COLORS, pad2, todayStr, formatMemoDate };
