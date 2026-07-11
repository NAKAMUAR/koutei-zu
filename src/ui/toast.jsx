// トースト通知（alert() の置き換え）。
// notify(message, type) をどこからでも呼べる（type: 'warn' | 'error' | 'info'）。
// 表示は App ルートに置いた <ToastHost /> が担当する。操作をブロックしない。
import React, { useEffect, useState } from 'react';

const EVENT_NAME = 'kz-toast';
let seq = 0;

export function notify(message, type = 'warn') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, {
    detail: { id: `t${Date.now()}-${seq++}`, message: String(message ?? ''), type },
  }));
}

const TYPE_STYLES = {
  warn:  { background: '#fff8e6', border: '1px solid #e0c26a', color: '#6b5416', icon: '⚠' },
  error: { background: '#fdf0ef', border: '1px solid #d89a96', color: '#8a1f18', icon: '✕' },
  info:  { background: '#f2f6f2', border: '1px solid #a8c0a8', color: '#2f4a33', icon: '✓' },
};

const AUTO_DISMISS_MS = 7000;

export function ToastHost({ fontJP = "'Noto Sans JP', sans-serif" }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onToast = (e) => {
      const t = e.detail;
      if (!t || !t.message) return;
      setToasts(prev => [...prev.slice(-4), t]); // 最大5件まで保持
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== t.id));
      }, AUTO_DISMISS_MS);
    };
    window.addEventListener(EVENT_NAME, onToast);
    return () => window.removeEventListener(EVENT_NAME, onToast);
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', gap: 8, zIndex: 3000,
      width: 'min(520px, calc(100vw - 32px))', pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const s = TYPE_STYLES[t.type] || TYPE_STYLES.warn;
        return (
          <div key={t.id}
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            title="クリックで閉じる"
            style={{
              ...{ background: s.background, border: s.border, color: s.color },
              borderRadius: 6, padding: '10px 14px', fontFamily: fontJP, fontSize: 13,
              boxShadow: '0 6px 24px rgba(0,0,0,0.18)', cursor: 'pointer',
              display: 'flex', gap: 10, alignItems: 'flex-start', pointerEvents: 'auto',
              whiteSpace: 'pre-wrap', lineHeight: 1.5,
            }}>
            <span aria-hidden="true" style={{ fontWeight: 700, flexShrink: 0 }}>{s.icon}</span>
            <span style={{ flex: 1 }}>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
