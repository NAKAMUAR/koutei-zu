// アプリ全体で使うモーダル（過去案件引用・終了予定超過ポップアップ）。App.jsx から分割。
import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { dateToDtLocal, dayName, fmtMD, getProjectColor, minToTime } from '../lib/utils.js';
import { EndTimeFields } from './common.jsx';

// ============ 過去案件から引用するモーダル ============
function QuoteModal({ projects, onSelect, onClose, colors, fontJP, fontDisplay }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = q
    ? projects.filter(p => [p.projectName, p.projectNameInternal, p.companyName, p.customerContact].some(v => (v || '').toLowerCase().includes(q)))
    : projects;
  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, width: '100%', maxWidth: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column', fontFamily: fontJP, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 17, margin: 0, fontWeight: 600 }}>過去案件から引用</h3>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMute, display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '14px 22px 8px' }}>
          <p style={{ fontSize: 11, color: colors.textMute, margin: '0 0 10px 0' }}>
            完了済み案件の「案件情報（社外/社内案件名・会社名・お客様担当者・担当者）」だけを引用します。視点・制作時間・優先順位・開始日時は引用しません。
          </p>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: colors.textMute, display: 'flex', pointerEvents: 'none' }}><Search size={15} /></span>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus
              placeholder="案件名・会社名・お客様担当者で検索"
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 32px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 13, outline: 'none' }} />
          </div>
        </div>
        <div style={{ overflowY: 'auto', padding: '6px 14px 16px', flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: colors.textMute, fontSize: 13, padding: 32 }}>
              {projects.length === 0 ? '完了済みの案件がまだありません。' : '一致する案件がありません。'}
            </div>
          ) : filtered.map(p => (
            <button key={p.projectName} type="button" onClick={() => onSelect(p)}
              style={{
                width: '100%', textAlign: 'left', background: '#fff', border: `1px solid ${colors.border}`,
                borderLeft: `4px solid ${getProjectColor(p.projectName)}`, borderRadius: 5, padding: '10px 12px',
                marginBottom: 8, cursor: 'pointer', fontFamily: fontJP, display: 'flex', flexDirection: 'column', gap: 4,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fbf9f4'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{p.projectNameInternal || p.projectName}</span>
                {p.projectNameInternal && <span style={{ fontSize: 11, color: colors.textMute }}>{p.projectName}</span>}
                {p.companyName && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', background: getProjectColor(p.companyName), borderRadius: 10, padding: '1px 8px' }}>{p.companyName}</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: colors.textMute, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {p.customerContact && <span>お客様: {p.customerContact}</span>}
                {p.lastAssignee && <span>担当: {p.lastAssignee}</span>}
                <span>{p.viewpointCount}視点</span>
                {p.registeredDate && <span title="案件の登録日（自動記録）">登録: {p.registeredDate.slice(5).replace('-', '/')}</span>}
                {p.lastCompletedAt > 0 && <span>最終完了: {fmtMD(new Date(p.lastCompletedAt))}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ 終了予定超過の対応ポップアップ（機能B） ============
function fmtOverdue(ms) {
  const min = Math.max(0, Math.floor(ms / 60000));
  if (min < 60) return `${min}分超過`;
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h}時間超過` : `${h}時間${m}分超過`;
}
function EndPromptModal({ viewpoints, now, settings, onComplete, onAddRevision, onDelay, onAdjustEnd, onSnooze, colors, fontJP, fontDisplay }) {
  // 展開中のアクション { key, action } と各フォーム値
  const [active, setActive] = useState(null);
  const [completeEnd, setCompleteEnd] = useState('');
  const [delayEnd, setDelayEnd] = useState('');
  const [adjustEnd, setAdjustEnd] = useState('');
  const [revName, setRevName] = useState('追加修正');
  const [revHours, setRevHours] = useState('');

  const open = (vp, action) => {
    setActive({ key: vp.key, action });
    if (action === 'complete') setCompleteEnd(dateToDtLocal(now));
    if (action === 'delay') setDelayEnd(dateToDtLocal(new Date(vp.endTs)));
    if (action === 'adjust') setAdjustEnd(dateToDtLocal(new Date(vp.endTs)));
    if (action === 'revision') { setRevName('追加修正'); setRevHours(''); }
  };
  const close = () => setActive(null);

  const btn = (bg, brd, col) => ({
    padding: '7px 12px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, fontWeight: 600,
    background: bg, border: `1px solid ${brd}`, color: col, whiteSpace: 'nowrap',
  });
  const fieldLabel = { fontSize: 11, color: colors.textMute, marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
      <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, width: '100%', maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column', fontFamily: fontJP, boxShadow: '0 12px 48px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${colors.border}` }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 17, margin: 0, fontWeight: 600, color: colors.accent }}>終了予定を過ぎた視点があります</h3>
          <p style={{ fontSize: 11, color: colors.textMute, margin: '6px 0 0 0' }}>視点ごとに対応を選んでください（「確認中」で30分後に再通知）。</p>
        </div>
        <div style={{ overflowY: 'auto', padding: '8px 16px 16px', flex: 1 }}>
          {viewpoints.map(vp => {
            const isOpen = active && active.key === vp.key;
            return (
              <div key={vp.key} style={{ border: `1px solid ${colors.border}`, borderLeft: `4px solid ${getProjectColor(vp.projectName)}`, borderRadius: 6, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{vp.projectName} ／ {vp.viewpointName}</span>
                  {vp.assignee && <span style={{ fontSize: 11, color: colors.textMute }}>担当: {vp.assignee}</span>}
                </div>
                <div style={{ fontSize: 11, color: colors.textMute, marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span>終了予定: {fmtMD(vp.endDate)}({dayName(vp.endDate)}) {minToTime(vp.endDate.getHours() * 60 + vp.endDate.getMinutes())}</span>
                  <span style={{ color: colors.accent, fontWeight: 600 }}>{fmtOverdue(now.getTime() - vp.endTs)}</span>
                  {vp.deadline && (() => {
                    const d = new Date(vp.deadline + 'T00:00:00');
                    return <span>納期: {fmtMD(d)}（{dayName(d)}）</span>;
                  })()}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => open(vp, 'complete')} style={btn(colors.progress, colors.progress, '#fff')}>① 視点完了</button>
                  <button type="button" onClick={() => open(vp, 'revision')} style={btn('#fff', colors.border, colors.text)}>② 追加修正</button>
                  <button type="button" onClick={() => open(vp, 'delay')} style={btn('#fff', colors.border, colors.text)} title="遅れて終了予定を後ろへ。差分の作業時間を加算します。">③ 遅延</button>
                  <button type="button" onClick={() => open(vp, 'adjust')} style={btn('#fff', colors.border, colors.text)} title="終了予定時間だけを直します（作業時間は加算しません・早め/遅め可）。">④ 終了予定の修正</button>
                  <button type="button" onClick={() => onSnooze(vp.key, vp.endTs)} style={btn('#fff', colors.border, colors.textMute)} title="今は確認中。30分後にもう一度通知します。">⑤ 確認中（30分後に通知）</button>
                </div>

                {isOpen && active.action === 'complete' && (
                  <div style={{ marginTop: 12, background: '#fbf9f4', borderRadius: 5, padding: 12 }}>
                    <div style={fieldLabel}>実際の終了時間</div>
                    <EndTimeFields value={completeEnd} onChange={setCompleteEnd} colors={colors} fontJP={fontJP} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button type="button" onClick={() => { onComplete(vp, completeEnd); close(); }} style={btn(colors.progress, colors.progress, '#fff')}>完了する</button>
                      <button type="button" onClick={close} style={btn('#fff', colors.border, colors.textMute)}>やめる</button>
                    </div>
                  </div>
                )}
                {isOpen && active.action === 'revision' && (
                  <div style={{ marginTop: 12, background: '#fbf9f4', borderRadius: 5, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <div>
                        <div style={fieldLabel}>ステップ名</div>
                        <input type="text" value={revName} onChange={(e) => setRevName(e.target.value)} style={{ padding: '7px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 13 }} />
                      </div>
                      <div>
                        <div style={fieldLabel}>追加時間(HH:MM)</div>
                        <input type="text" inputMode="numeric" value={revHours} onChange={(e) => setRevHours(e.target.value)} placeholder="例 02:00" style={{ width: 70, padding: '7px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 13 }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button type="button" onClick={() => { onAddRevision(vp, revName, revHours); close(); }} style={btn(colors.text, colors.text, '#fff')}>追加する</button>
                      <button type="button" onClick={close} style={btn('#fff', colors.border, colors.textMute)}>やめる</button>
                    </div>
                  </div>
                )}
                {isOpen && active.action === 'delay' && (
                  <div style={{ marginTop: 12, background: '#fbf9f4', borderRadius: 5, padding: 12 }}>
                    <div style={fieldLabel}>新しい終了予定（現在より後）</div>
                    <EndTimeFields value={delayEnd} onChange={setDelayEnd} colors={colors} fontJP={fontJP} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button type="button" onClick={() => {
                        const nt = delayEnd ? new Date(delayEnd).getTime() : 0;
                        if (!nt) { alert('日時を入力してください'); return; }
                        onDelay(vp, vp.endTs, nt); close();
                      }} style={btn(colors.text, colors.text, '#fff')}>更新する</button>
                      <button type="button" onClick={close} style={btn('#fff', colors.border, colors.textMute)}>やめる</button>
                    </div>
                  </div>
                )}
                {isOpen && active.action === 'adjust' && (
                  <div style={{ marginTop: 12, background: '#fbf9f4', borderRadius: 5, padding: 12 }}>
                    <div style={fieldLabel}>新しい終了予定時間（作業時間は変えません・早め/遅め可）</div>
                    <EndTimeFields value={adjustEnd} onChange={setAdjustEnd} colors={colors} fontJP={fontJP} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button type="button" onClick={() => {
                        const nt = adjustEnd ? new Date(adjustEnd).getTime() : 0;
                        if (!nt) { alert('日時を入力してください'); return; }
                        onAdjustEnd(vp, nt); close();
                      }} style={btn(colors.text, colors.text, '#fff')}>修正する</button>
                      <button type="button" onClick={close} style={btn('#fff', colors.border, colors.textMute)}>やめる</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { QuoteModal, EndPromptModal, fmtOverdue };
