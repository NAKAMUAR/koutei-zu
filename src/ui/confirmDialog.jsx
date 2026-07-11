// 確認ダイアログ（ブラウザ標準 confirm() の置き換え）。
// `await confirmDialog(message, opts)` で true/false を返す。
// 表示は App ルートに置いた <ConfirmHost /> が担当。Esc/キャンセルで false。
// opts: { title, confirmLabel, cancelLabel, danger }（danger=true で実行ボタンが赤になる）
import React, { useEffect, useRef, useState } from 'react';
import { useEscKey } from './useEscKey.js';

const EVENT_NAME = 'kz-confirm';

export function confirmDialog(message, opts = {}) {
  if (typeof window === 'undefined') return Promise.resolve(false);
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { message: String(message ?? ''), ...opts, resolve } }));
  });
}

export function ConfirmHost({ fontJP = "'Noto Sans JP', sans-serif", fontDisplay = "'Shippori Mincho', serif" }) {
  const [req, setReq] = useState(null);
  const confirmBtnRef = useRef(null);
  const dialogRef = useRef(null);
  const prevFocusRef = useRef(null);

  useEffect(() => {
    const onReq = (e) => {
      // すでに表示中の場合は先のダイアログをキャンセル扱いにして差し替える
      setReq(prev => { if (prev) prev.resolve(false); return e.detail; });
    };
    window.addEventListener(EVENT_NAME, onReq);
    return () => window.removeEventListener(EVENT_NAME, onReq);
  }, []);

  // 開いたら実行ボタンへフォーカス、閉じたら元の場所へ戻す
  useEffect(() => {
    if (req) {
      prevFocusRef.current = document.activeElement;
      confirmBtnRef.current?.focus();
    } else if (prevFocusRef.current) {
      try { prevFocusRef.current.focus(); } catch (e) {}
      prevFocusRef.current = null;
    }
  }, [req]);

  const close = (val) => { if (req) { req.resolve(val); setReq(null); } };
  useEscKey(() => close(false), !!req);

  // Tab をダイアログ内に閉じ込める（簡易フォーカストラップ）
  const onKeyDown = (e) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusables = dialogRef.current.querySelectorAll('button');
    if (focusables.length === 0) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  if (!req) return null;
  const danger = !!req.danger;
  return (
    <div onClick={() => close(false)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2500, padding: 16 }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={req.title || '確認'}
        onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}
        style={{ background: '#fff', border: '1px solid #e8e3d6', borderRadius: 8, padding: 24, width: '100%', maxWidth: 440, fontFamily: fontJP, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 17, margin: '0 0 12px 0', fontWeight: 600 }}>{req.title || '確認'}</h3>
        <div style={{ fontSize: 13, color: '#1a1a1a', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{req.message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
          <button type="button" onClick={() => close(false)}
            style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #e8e3d6', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, color: '#8a8578' }}>
            {req.cancelLabel || 'キャンセル'}
          </button>
          <button type="button" ref={confirmBtnRef} onClick={() => close(true)}
            style={{ padding: '8px 18px', background: danger ? '#c1272d' : '#1a1a1a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 600 }}>
            {req.confirmLabel || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
