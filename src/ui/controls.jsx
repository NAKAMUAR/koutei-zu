// 共有UI部品（App.jsx から分割）：確認モーダル・時刻/所要時間プルダウン・ナビボタン・コンボボックス
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useEscKey } from './useEscKey.js';
import { kanaNormalize } from '../lib/text.js';

// ============ 確認モーダル（汎用） ============
function ConfirmModal({ title, children, confirmLabel, cancelLabel, onConfirm, onCancel, colors, fontJP, fontDisplay }) {
  useEscKey(onCancel);
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
          fontSize: 11, padding: '1px 5px', borderRadius: 8, marginLeft: 2, fontWeight: 600,
        }}>{badge}</span>
      )}
    </button>
  );
}

// ナビのドロップダウン（経理・管理などのグループ）。中の画面を選択中はボタン自体が反転する。
function NavDropdown({ label, icon, items, view, setView }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const activeItem = items.find(i => i.id === view);
  const active = !!activeItem;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        title={`${label}メニュー：${items.map(i => i.label).join('・')}`}
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
        {icon}{activeItem ? `${label}：${activeItem.label}` : label}
        <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 1500,
          background: '#fff', border: '1px solid #e8e3d6', borderRadius: 6,
          boxShadow: '0 8px 28px rgba(0,0,0,0.14)', padding: 6, minWidth: 170,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {items.map(item => (
            <button key={item.id} onClick={() => { setView(item.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                background: view === item.id ? '#1a1a1a' : 'transparent',
                color: view === item.id ? '#fff' : '#1a1a1a',
                border: 'none', borderRadius: 4, cursor: 'pointer',
                fontFamily: "'Noto Sans JP', sans-serif", fontSize: 13, textAlign: 'left',
              }}>
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      )}
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

export { ConfirmModal, TimeSelect, DurationSelect, NavButton, NavDropdown, Combobox };
