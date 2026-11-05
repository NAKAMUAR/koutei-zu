import { useEffect, useState } from 'react';
import { checkFirestoreQuota } from '../firebase.js';

// 起動時の「読み込み中...」画面。
// 長く続くときは原因を調べて、Firestore の1日の読み取り上限（無料枠）に達しているならそう表示する
// （上限に達すると SDK は黙って再試行し続けるので、何も出さないと理由がわからないまま止まって見える）。
const SLOW_MS = 10000;

export function LoadingScreen({ colors, fontJP }) {
  const [state, setState] = useState('loading'); // loading | quota | slow
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      const r = await checkFirestoreQuota();
      if (alive) setState(r === 'quota' ? 'quota' : 'slow');
    }, SLOW_MS);
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  const wrap = { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: colors.bg, fontFamily: fontJP, color: colors.textMute, padding: 20 };
  if (state === 'loading') return <div style={wrap}>読み込み中...</div>;

  const reload = (
    <button
      onClick={() => window.location.reload()}
      style={{ marginTop: 20, padding: '8px 18px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, color: colors.text }}>
      再読み込み
    </button>
  );
  return (
    <div style={wrap}>
      <div style={{ maxWidth: 460, width: '100%', textAlign: 'center', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '32px 28px', color: colors.text, fontSize: 13, lineHeight: 1.8 }}>
        {state === 'quota' ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, color: colors.accent, marginBottom: 12 }}>今日の読み込みの上限に達しました</div>
            <div>データベースの無料枠（1日に読める量）を使い切ったため、いまはデータを読み込めません。</div>
            <div>上限は毎日 <b>日本時間 17時ごろ</b>（夏時間の時期は16時ごろ）に戻ります。それ以降に開き直してください。</div>
            <div style={{ marginTop: 8, color: colors.textMute, fontSize: 12 }}>データは消えていません。</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>読み込みに時間がかかっています</div>
            <div>通信状況を確認して、再読み込みしてください。</div>
          </>
        )}
        {reload}
      </div>
    </div>
  );
}
