// Esc キーでモーダル等を閉じるための共通フック
import { useEffect } from 'react';

export function useEscKey(handler, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof handler !== 'function') return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      handler(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handler, enabled]);
}
