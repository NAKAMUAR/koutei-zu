// 共通UI部品（モーダル・時刻選択・ナビボタン・コンボボックス・ボタンスタイル）。App.jsx から分割。
import { useState, useEffect, useRef } from 'react';
import { dayName, fmtMD, fmtYMD, kanaNormalize, minToTime } from '../lib/utils.js';
import { CheckCircle2, ChevronDown, X } from 'lucide-react';

// ============ 確認モーダル（汎用） ============
function ConfirmModal({ title, children, confirmLabel, cancelLabel, onConfirm, onCancel, colors, fontJP, fontDisplay }) {
  return (
    <div onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, padding: 24, width: '100%', maxWidth: 440, fontFamily: fontJP, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 17, margin: '0 0 12px 0', fontWeight: 600 }}>{title}</h3>
        <div style={{ fontSize: 13, color: colors.text }}>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
          <button type="button" onClick={onCancel}
            style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, color: colors.textMute }}>
            {cancelLabel || 'キャンセル'}
          </button>
          <button type="button" onClick={onConfirm}
            style={{ padding: '8px 18px', background: colors.text, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 600 }}>
            {confirmLabel || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ============ 入力モーダル（prompt の代替：メッセージ＋1行入力） ============
function PromptModal({ title, message, defaultValue, placeholder, confirmLabel, cancelLabel, onSubmit, onCancel, colors, fontJP, fontDisplay }) {
  const [value, setValue] = useState(defaultValue || '');
  const inputRef = useRef(null);
  useEffect(() => { if (inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, []);
  const submit = () => onSubmit(value);
  return (
    <div onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, padding: 24, width: '100%', maxWidth: 440, fontFamily: fontJP, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 17, margin: '0 0 12px 0', fontWeight: 600 }}>{title || '入力'}</h3>
        {message && <div style={{ fontSize: 13, color: colors.text, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{message}</div>}
        <input ref={inputRef} type="text" value={value} placeholder={placeholder || ''}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 14, outline: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
          <button type="button" onClick={onCancel}
            style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, color: colors.textMute }}>
            {cancelLabel || 'キャンセル'}
          </button>
          <button type="button" onClick={submit}
            style={{ padding: '8px 18px', background: colors.text, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 600 }}>
            {confirmLabel || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ トースト通知（画面右下・自動で消える・「元に戻す」対応） ============
// notify(message, { type: 'info'|'success'|'error', undo: () => {...} }) から積まれる。
function ToastStack({ toasts, onDismiss, onUndo, colors, fontJP }) {
  if (!toasts || toasts.length === 0) return null;
  const edge = (t) => t.type === 'error' ? '#c1272d' : t.type === 'success' ? '#3a5a40' : '#6b6b6b';
  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 2100, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
      {toasts.map(t => (
        <div key={t.id}
          style={{ background: '#fff', border: `1px solid ${colors.border}`, borderLeft: `4px solid ${edge(t)}`,
            borderRadius: 6, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            fontFamily: fontJP, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 13, color: colors.text, whiteSpace: 'pre-wrap', flex: 1 }}>{t.message}</div>
          {t.undo && (
            <button type="button" onClick={() => onUndo(t)}
              style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, padding: '5px 10px',
                cursor: 'pointer', fontFamily: fontJP, fontSize: 12, fontWeight: 700, color: '#1d3557', whiteSpace: 'nowrap' }}>
              元に戻す
            </button>
          )}
          <button type="button" onClick={() => onDismiss(t.id)} title="閉じる"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMute, padding: 2, display: 'flex' }}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ============ 登録確認モーダル（開始移動・納期超過＋繰り上げ提案） ============
function DeadlineConfirmModal({ info, onCancel, onSubmit, colors, fontJP, fontDisplay }) {
  const violations = info.violations || [];
  const hasViolation = violations.length > 0;
  const reorder = info.reorder || {};
  const sameBump = reorder.sameBump || null;
  const globalBump = reorder.globalBump || null;
  // 既定は「並べ替えない（検討保留）」。並び順の入れ替えはユーザーが繰り上げ案を
  // 能動的に選んで「繰り上げて登録」を押したときだけ実行する（システムが勝手に入れ替えない）。
  const [choice, setChoice] = useState('defer');

  const fmtEnd = (b) => `${fmtMD(b.endDate)}(${dayName(b.endDate)}) ${minToTime(b.endMin)}`;
  const apply = () => {
    if (choice === 'same' && sameBump) onSubmit({ orderOverride: sameBump.order });
    else if (choice === 'global' && globalBump) onSubmit({ orderOverride: globalBump.order });
    else onSubmit({});
  };

  const optStyle = (active) => ({
    display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px',
    border: `1px solid ${active ? colors.accent : colors.border}`, borderRadius: 6,
    background: active ? colors.accentSoft : '#fff', cursor: 'pointer', marginBottom: 8,
  });
  const Radio = ({ value, title, desc, accent }) => (
    <label style={optStyle(choice === value)} onClick={() => setChoice(value)}>
      <input type="radio" name="reorderChoice" checked={choice === value} onChange={() => setChoice(value)} style={{ marginTop: 3 }} />
      <span>
        <span style={{ fontSize: 13, fontWeight: 600, color: accent || colors.text }}>{title}</span>
        {desc && <span style={{ display: 'block', fontSize: 11, color: colors.textMute, marginTop: 2, lineHeight: 1.6 }}>{desc}</span>}
      </span>
    </label>
  );

  return (
    <div onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, padding: 24, width: '100%', maxWidth: 460, maxHeight: '88vh', overflowY: 'auto', fontFamily: fontJP, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 17, margin: '0 0 12px 0', fontWeight: 600 }}>
          {hasViolation ? '納期超過の確認' : 'スケジュールの確認'}
        </h3>
        <div style={{ fontSize: 13, color: colors.text }}>
          {info.moved && (
            <>
              <p style={{ margin: '0 0 10px 0', lineHeight: 1.7 }}>
                指定した開始時間{' '}
                <strong>{info.requested ? `${fmtMD(info.requested.date)}(${dayName(info.requested.date)}) ${minToTime(info.requested.min)}` : ''}</strong>{' '}
                には空きがありません。実際の開始は{' '}
                <strong style={{ color: '#c46a16' }}>{fmtMD(info.actualDate)}({dayName(info.actualDate)}) {minToTime(info.actualMin)}</strong>{' '}になります。
              </p>
            </>
          )}

          {hasViolation && (
            <>
              <p style={{ margin: '0 0 6px 0', lineHeight: 1.7, color: colors.accent, fontWeight: 600 }}>
                ⚠ 終了予定が納期を超える視点があります
              </p>
              <div style={{ margin: '0 0 14px 0' }}>
                {violations.map((v, i) => {
                  const dl = new Date(v.deadline + 'T00:00:00');
                  return (
                    <p key={i} style={{ margin: '0 0 4px 0', lineHeight: 1.7, fontSize: 12 }}>
                      視点「{v.viewpointName}」：終了予定{' '}
                      <strong style={{ color: colors.accent }}>{fmtMD(v.endDate)}({dayName(v.endDate)}) {minToTime(v.endMin)}</strong>
                      {' '}＞ 納期 {fmtMD(dl)}（{dayName(dl)}）
                    </p>
                  );
                })}
              </div>

              <p style={{ margin: '0 0 8px 0', fontSize: 12, fontWeight: 600, color: colors.textMute }}>対応を選んでください</p>

              {sameBump && (
                <Radio value="same" accent={colors.progress}
                  title="✓ 同じ担当者の中で繰り上げる（推奨）"
                  desc={`「${sameBump.target}」より前に詰めます。終了予定 ${fmtEnd(sameBump)}（納期内）／他の担当者の予定は変えません。`} />
              )}
              {globalBump && (
                <Radio value="global"
                  title="全体の先頭へ繰り上げる（要確認）"
                  desc={`終了予定 ${fmtEnd(globalBump)}（納期内）。※納期がより早い案件より前に詰めるため、他の案件の納期に影響する場合があります。`} />
              )}
              {!sameBump && !globalBump && (
                <p style={{ margin: '0 0 8px 0', fontSize: 12, color: colors.textMute, lineHeight: 1.7 }}>
                  並べ替えでは納期に間に合いません。納期の見直し・担当者の変更・制作時間の調整をご検討ください。
                </p>
              )}
              <Radio value="defer"
                title="後で検討する（このまま登録・検討保留）"
                desc="並べ替えずにこのまま登録します。納期超過の赤バッジが付くので、一覧から後で並べ替えできます。" />
            </>
          )}

          {!hasViolation && (
            <p style={{ margin: '8px 0 0 0', lineHeight: 1.7 }}>このまま登録しますか？</p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button type="button" onClick={onCancel}
            style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, color: colors.textMute }}>
            戻る
          </button>
          <button type="button" onClick={hasViolation ? apply : () => onSubmit({})}
            style={{ padding: '8px 18px', background: colors.text, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 600 }}>
            {hasViolation ? (choice === 'defer' ? 'このまま登録' : '繰り上げて登録') : 'このまま登録する'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ 時刻選択（時・分プルダウン） ============
// どの環境でも確実に入力できるよう、ネイティブの time 入力ではなくプルダウンを使う
function TimeSelect({ value, onChange, colors, fontJP, allowEmpty = false }) {
  const parts = value ? value.split(':') : ['', ''];
  const h = parts[0] || '';
  const m = parts[1] || '';
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const mins = ['00', '15', '30', '45'];
  // 現在の分が候補にない場合（例: 08:05）も選べるよう補完
  if (m && !mins.includes(m)) mins.push(m);
  mins.sort();

  const update = (nh, nm) => {
    if (allowEmpty && !nh && !nm) { onChange(''); return; }
    const hh = nh || '08';
    const mm = nm || '00';
    onChange(`${hh}:${mm}`);
  };
  const selectStyle = {
    padding: '6px 4px', border: `1px solid ${colors.border}`, borderRadius: 3,
    fontFamily: fontJP, fontSize: 13, background: '#fff', color: colors.text, cursor: 'pointer', flexShrink: 0,
  };
  const lbl = { color: colors.textMute, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
      <select value={h} onChange={(e) => update(e.target.value, m)} style={selectStyle}>
        {allowEmpty && <option value="">--</option>}
        {hours.map(hr => <option key={hr} value={hr}>{hr}</option>)}
      </select>
      <span style={lbl}>時</span>
      <select value={m} onChange={(e) => update(h, e.target.value)} style={selectStyle}>
        {allowEmpty && <option value="">--</option>}
        {mins.map(mn => <option key={mn} value={mn}>{mn}</option>)}
      </select>
      <span style={lbl}>分</span>
    </span>
  );
}

// 所要時間（制作時間・完了時間など）を「時間」「分（5分刻み）」のプルダウンで選ぶ。
// 値は parseHM/fmtHM と同じ "HH:MM" 文字列。空（未選択）も許容する。
function DurationSelect({ value, onChange, colors, fontJP, maxHours = 24 }) {
  const v = (value == null ? '' : String(value)).trim();
  let h = '', m = '';
  if (v) {
    if (v.includes(':')) {
      const p = v.split(':');
      h = p[0] !== '' && !isNaN(parseInt(p[0], 10)) ? String(parseInt(p[0], 10)) : '';
      m = (p[1] || '').padStart(2, '0');
    } else if (!isNaN(parseInt(v, 10))) {
      h = String(parseInt(v, 10)); m = '00';
    }
  }
  const hours = Array.from({ length: maxHours + 1 }, (_, i) => String(i));
  // 範囲外の既存値（例: 30時間）も選べるよう補完
  if (h && !hours.includes(h)) hours.push(h);
  hours.sort((a, b) => Number(a) - Number(b));
  const mins = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
  // 5分刻みに無い既存値（例: 08）も選べるよう補完
  if (m && !mins.includes(m)) { mins.push(m); mins.sort(); }

  const update = (nh, nm) => {
    if (!nh && !nm) { onChange(''); return; }
    const hh = (nh || '0').padStart(2, '0');
    const mm = nm || '00';
    onChange(`${hh}:${mm}`);
  };
  const selectStyle = {
    padding: '6px 4px', border: `1px solid ${colors.border}`, borderRadius: 3,
    fontFamily: fontJP, fontSize: 13, background: '#fff', color: colors.text, cursor: 'pointer', flexShrink: 0,
  };
  const lbl = { color: colors.textMute, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
      <select value={h} onChange={(e) => update(e.target.value, m)} style={selectStyle}>
        <option value="">--</option>
        {hours.map(hr => <option key={hr} value={hr}>{hr}</option>)}
      </select>
      <span style={lbl}>時間</span>
      <select value={m} onChange={(e) => update(h, e.target.value)} style={selectStyle}>
        <option value="">--</option>
        {mins.map(mn => <option key={mn} value={mn}>{mn}</option>)}
      </select>
      <span style={lbl}>分</span>
    </span>
  );
}

// ============ ナビボタン ============
function NavButton({ active, onClick, icon, label, badge }) {  return (
    <button onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 12px',
        background: active ? '#1a1a1a' : 'transparent',
        color: active ? '#fff' : '#1a1a1a',
        border: `1px solid ${active ? '#1a1a1a' : '#e8e3d6'}`,
        borderRadius: 4, cursor: 'pointer',
        fontFamily: "'Noto Sans JP', sans-serif",
        fontSize: 13, fontWeight: 500,
      }}>
      {icon}{label}
      {badge != null && badge > 0 && (
        <span style={{
          background: active ? '#fff' : '#1a1a1a', color: active ? '#1a1a1a' : '#fff',
          fontSize: 10, padding: '1px 5px', borderRadius: 8, marginLeft: 2, fontWeight: 600,
        }}>{badge}</span>
      )}
    </button>
  );
}

// ============ ナビグループ（複数タブをまとめるドロップダウン） ============
// 「集計・帳票」のように、使用頻度の低いタブ群を1つのボタンに集約する。
// アクティブなタブがグループ内にあるときは、そのタブ名をボタンに表示して現在地を見失わせない。
function NavGroup({ label, icon, items, activeId, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);
  const activeItem = items.find(i => i.id === activeId) || null;
  const active = !!activeItem;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        title={`${label}（${items.map(i => i.label).join('・')}）`}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 12px',
          background: active ? '#1a1a1a' : 'transparent',
          color: active ? '#fff' : '#1a1a1a',
          border: `1px solid ${active ? '#1a1a1a' : '#e8e3d6'}`,
          borderRadius: 4, cursor: 'pointer',
          fontFamily: "'Noto Sans JP', sans-serif",
          fontSize: 13, fontWeight: 500,
        }}>
        {icon}
        {activeItem ? `${label}：${activeItem.label}` : label}
        <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 1500,
          background: '#fff', border: '1px solid #e8e3d6', borderRadius: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,0.14)', padding: 6,
          display: 'flex', flexDirection: 'column', gap: 2, minWidth: 168,
        }}>
          {items.map(item => (
            <button key={item.id}
              onClick={() => { onSelect(item.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', textAlign: 'left',
                background: activeId === item.id ? '#1a1a1a' : 'transparent',
                color: activeId === item.id ? '#fff' : '#1a1a1a',
                border: 'none', borderRadius: 4, cursor: 'pointer',
                fontFamily: "'Noto Sans JP', sans-serif", fontSize: 13, fontWeight: 500,
              }}>
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const iconBtnStyle = (colors) => ({
  background: 'transparent', border: 'none', cursor: 'pointer',
  padding: 6, color: colors.textMute, borderRadius: 3,
  display: 'flex', alignItems: 'center',
});
const miniBtnStyle = (colors, disabled) => ({
  background: '#fff', border: `1px solid ${colors.border}`, cursor: disabled ? 'not-allowed' : 'pointer',
  padding: '1px 3px', color: disabled ? '#ccc' : colors.textMute, borderRadius: 2,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
});
const progressBtnStyle = (colors, fontJP) => ({
  background: '#fff', border: `1px solid ${colors.progress}`, color: colors.progress,
  borderRadius: 3, padding: '3px 8px', cursor: 'pointer',
  fontFamily: fontJP, fontSize: 10, fontWeight: 600,
  display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44,
});
const tabStyle = (active, colors, fontJP) => ({
  padding: '8px 14px',
  background: active ? '#1a1a1a' : '#fff',
  color: active ? '#fff' : '#1a1a1a',
  border: `1px solid ${active ? '#1a1a1a' : colors.border}`,
  borderRadius: 20, cursor: 'pointer',
  fontFamily: fontJP, fontSize: 13, fontWeight: 500,
  display: 'flex', alignItems: 'center',
});

// ============ 終了時間の入力フィールド（日付＋時刻プルダウン） ============
// 全画面共通の日時入力（日付＋時刻プルダウン）。datetime-local は入力しづらい環境が
// あるため使用禁止（ESLintで検出）。value は 'YYYY-MM-DDTHH:mm' または ''。
// 片方だけ入力されたときは、日付=今日・時刻=defaultTime で補完する。
function DateTimeField({ value, onChange, defaultTime = '17:00', compact = false, colors, fontJP }) {
  const d = value ? value.split('T')[0] : '';
  const t = value ? (value.split('T')[1] || '') : '';
  const set = (nd, nt) => {
    if (!nd && !nt) { onChange(''); return; }
    const dd = nd || fmtYMD(new Date());
    const tt = nt || defaultTime;
    onChange(`${dd}T${tt}`);
  };
  const dateStyle = compact
    ? { padding: '2px 4px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 11 }
    : { padding: '6px 8px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 13 };
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <input type="date" value={d} onChange={(e) => set(e.target.value, t)} style={dateStyle} />
      <TimeSelect value={t || defaultTime} onChange={(val) => set(d, val)} colors={colors} fontJP={fontJP} />
    </span>
  );
}
// 旧名（終了時間の入力フィールド）。既存の呼び出し互換のため残す＝実体は DateTimeField。
const EndTimeFields = DateTimeField;

// ============ 完了ダイアログ（終了時間を入力して完了） ============
function CompleteDialog({ target, onConfirm, onCancel, colors, fontJP, fontDisplay }) {
  const [end, setEnd] = useState(target.defaultEnd || '');
  return (
    <div onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
      }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8,
          padding: 24, width: '100%', maxWidth: 420, fontFamily: fontJP,
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 17, margin: '0 0 6px 0', fontWeight: 600 }}>
          {target.label} を完了
        </h3>
        <p style={{ fontSize: 12, color: colors.textMute, margin: '0 0 16px 0', lineHeight: 1.6 }}>
          {target.ids.length}件のタスクを完了にします。<br />
          終了時間（実際に終わった時刻）を入力してください。予定どおりならそのまま、遅れた場合は実際の時刻に直してください。
        </p>
        <label style={{ display: 'block', fontSize: 12, color: colors.textMute, marginBottom: 6 }}>終了時間</label>
        <EndTimeFields value={end} onChange={setEnd} colors={colors} fontJP={fontJP} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
          <button type="button" onClick={onCancel}
            style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, color: colors.textMute }}>
            キャンセル
          </button>
          <button type="button" onClick={() => onConfirm(end)}
            style={{ padding: '8px 18px', background: colors.progress, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={15} /> 完了する
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ コンボボックス（プルダウン＋入力で候補を絞り込み・自由入力も可） ============
function Combobox({ value, onChange, options, placeholder, inputStyle, colors, fontJP, title, wrapperStyle }) {
  const [open, setOpen] = useState(false);
  // 候補リストを下に出すと画面下で見切れる場合があるため、空きが少なければ上向きに開く
  const [place, setPlace] = useState({ up: false, maxH: 300 });
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  // 入力欄の上下の空きを測り、下が狭ければ上に開く。表示高さも空きに合わせる。
  const computePlace = () => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 8;
    const above = rect.top - 8;
    const up = below < 220 && above > below;
    setPlace({ up, maxH: Math.max(140, Math.min(300, Math.floor(up ? above : below))) });
  };
  const openMenu = () => { computePlace(); setOpen(true); };
  const opts = options || [];
  // 読み仮名ベースで絞り込む：ひらがな/カタカナ/全半角/大小文字の違いを無視する。
  // 例「りのべる」と打つと「リノベル」も候補に出る。
  const v = kanaNormalize(value);
  // 入力中（候補に完全一致しない）は部分一致で絞り込み、空 or 選択済みなら全件表示
  const filtered = (value && !opts.some(o => o === value))
    ? opts.filter(o => kanaNormalize(o).includes(v))
    : opts;
  const select = (val) => { onChange(val); setOpen(false); };
  return (
    <div ref={ref} style={{ position: 'relative', ...(wrapperStyle || {}) }}>
      <input type="text" value={value || ''} title={title}
        onChange={(e) => { onChange(e.target.value); openMenu(); }}
        onFocus={openMenu}
        placeholder={placeholder}
        style={{ ...inputStyle, paddingRight: 30 }} />
      <button type="button" tabIndex={-1}
        onMouseDown={(e) => { e.preventDefault(); setOpen(o => { const n = !o; if (n) computePlace(); return n; }); }}
        title="一覧から選ぶ"
        style={{ position: 'absolute', right: 1, top: 1, bottom: 1, width: 28, background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMute, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ChevronDown size={15} />
      </button>
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', left: 0, zIndex: 50, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4, minWidth: 'max(100%, 200px)', width: 'max-content', maxWidth: 340, maxHeight: place.maxH, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', ...(place.up ? { bottom: '100%', marginBottom: 2 } : { top: '100%', marginTop: 2 }) }}>
          {filtered.map(o => (
            <div key={o} onMouseDown={(e) => { e.preventDefault(); select(o); }}
              style={{ padding: '10px 14px', fontSize: 15, fontFamily: fontJP, cursor: 'pointer', color: colors.text, background: o === value ? colors.accentSoft : '#fff', whiteSpace: 'nowrap', borderBottom: `1px solid ${colors.border}` }}
              onMouseEnter={(e) => { if (o !== value) e.currentTarget.style.background = '#f3efe4'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = o === value ? colors.accentSoft : '#fff'; }}>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


export {
  ConfirmModal, PromptModal, ToastStack, DeadlineConfirmModal, TimeSelect, DurationSelect, NavButton, NavGroup,
  iconBtnStyle, miniBtnStyle, progressBtnStyle, tabStyle,
  DateTimeField, EndTimeFields, CompleteDialog, Combobox,
};
