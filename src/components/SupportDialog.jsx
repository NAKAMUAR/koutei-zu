// サポート（分担）：1つのステップの残り時間の一部を別の担当者へ渡す小さな画面。
// 元のステップは渡した分だけ時間が減り、サポートの担当者に「（サポート）」のステップができる。
import { useState } from 'react';
import { useApp } from '../appContext.js';
import { fmtHM, parseHM } from '../lib/utils.js';

export function SupportDialog({ task, onClose }) {
  const { colors, fontJP, fontDisplay, assigneeList, splitTaskForSupport } = useApp();
  const remaining = Math.max(0, (Number(task.hours) || 0) - (Number(task.completedHours) || 0));
  const others = (assigneeList || []).filter(a => a && a !== task.assignee);
  const [helper, setHelper] = useState(others[0] || '');
  const [hoursText, setHoursText] = useState(fmtHM(Math.round(remaining / 2 * 2) / 2 || 0.5));
  const h = parseHM(hoursText);
  const valid = helper && !isNaN(h) && h > 0 && h < remaining;

  const submit = () => {
    if (!valid) return;
    splitTaskForSupport(task.id, helper, h);
    onClose();
  };
  const field = { padding: '6px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 13, background: '#fff' };

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, padding: 22, width: '100%', maxWidth: 420, fontFamily: fontJP, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 17, margin: '0 0 6px 0', fontWeight: 600 }}>サポート（作業を分担）</h3>
        <p style={{ fontSize: 12, color: colors.textMute, margin: '0 0 14px 0' }}>
          「{task.viewpointName} ／ {task.stepName}」の残り {fmtHM(remaining)} のうち一部を、別の担当者に渡します。
          {task.assignee} さんの時間は渡した分だけ減り、渡した相手に「（サポート）」の作業ができます。
        </p>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: colors.textMute, marginBottom: 12 }}>
          サポートする人
          {others.length ? (
            <select value={helper} onChange={(e) => setHelper(e.target.value)} style={{ ...field, cursor: 'pointer' }}>
              {others.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          ) : (
            <input value={helper} onChange={(e) => setHelper(e.target.value)} placeholder="担当者名" style={field} />
          )}
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: colors.textMute }}>
          渡す時間（例 2:00 または 1.5）
          <input value={hoursText} onChange={(e) => setHoursText(e.target.value)} inputMode="numeric" style={field} />
        </label>
        <div style={{ fontSize: 12, marginTop: 8, color: valid ? colors.text : colors.accent }}>
          {valid
            ? `${task.assignee}：${fmtHM(remaining - h)} ／ ${helper}：${fmtHM(h)}（サポート）`
            : `渡す時間は 0 より大きく、残り ${fmtHM(remaining)} より少なくしてください`}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose}
            style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, color: colors.textMute }}>
            キャンセル
          </button>
          <button type="button" onClick={submit} disabled={!valid}
            style={{ padding: '8px 18px', background: valid ? colors.text : colors.textMute, color: '#fff', border: 'none', borderRadius: 4, cursor: valid ? 'pointer' : 'default', fontFamily: fontJP, fontSize: 13, fontWeight: 600 }}>
            分担する
          </button>
        </div>
      </div>
    </div>
  );
}
