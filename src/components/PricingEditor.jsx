// 目安金額の単価設定（マスタ → ステップ設定の下）。
// お客様への金額＝制作時間 × 時間単価（税抜）を「切り上げ単位」で切り上げ、最低金額以上にする。
// 外注費＝制作時間 × 外注の時間単価（VND）。0 なら外注費の目安は出さない。
import { useEffect, useState } from 'react';
import { useApp } from '../appContext.js';
import { calcYen, normalizePricing } from '../lib/stage.js';

const FIELDS = [
  { key: 'unitYen', label: '時間単価（円・税抜）', width: 110 },
  { key: 'minYen', label: '最低金額（円）', width: 100 },
  { key: 'roundYen', label: '切り上げ単位（円）', width: 100 },
  { key: 'unitVND', label: '外注の時間単価（VND）', width: 130 },
];

export function PricingEditor() {
  const { colors, fontJP, fontDisplay, pricing, savePricing, notify } = useApp();
  const [draft, setDraft] = useState(() => normalizePricing(pricing));
  useEffect(() => { setDraft(normalizePricing(pricing)); }, [pricing]);

  const commit = () => {
    const next = normalizePricing(draft);
    if (JSON.stringify(next) === JSON.stringify(normalizePricing(pricing))) return;
    savePricing(next);
    notify('単価を保存しました', { type: 'success' });
  };
  const inputStyle = { padding: '5px 8px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 13, textAlign: 'right', boxSizing: 'border-box' };
  const ex = [1, 1.3, 2, 5.5].map(h => `${h}時間 → ${calcYen(h, draft).toLocaleString('ja-JP')}円`).join(' ／ ');

  return (
    <div>
      <h2 style={{ fontFamily: fontDisplay, fontSize: 18, margin: '0 0 4px 0', fontWeight: 500 }}>目安金額の単価</h2>
      <p style={{ fontSize: 12, color: colors.textMute, margin: '0 0 14px 0' }}>
        視点カードの「制作・納品」に、視点・パターンごとの目安金額（制作時間 × 時間単価）を表示します。「この金額を入れる」を押すまで金額は変わりません。<br />
        お客様への金額はオフショアの会社だけに出ます。外注の時間単価を入れると、外注費（VND）の目安も出ます。
      </p>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {FIELDS.map(f => (
          <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: colors.textMute, fontFamily: fontJP }}>
            {f.label}
            <input inputMode="numeric" value={draft[f.key] ?? ''}
              onChange={(e) => setDraft(d => ({ ...d, [f.key]: e.target.value.replace(/[^0-9.]/g, '') }))}
              onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
              style={{ ...inputStyle, width: f.width }} />
          </label>
        ))}
      </div>
      <div style={{ fontSize: 11, color: colors.textMute, marginTop: 10, fontFamily: fontJP }}>例：{ex}</div>
    </div>
  );
}
