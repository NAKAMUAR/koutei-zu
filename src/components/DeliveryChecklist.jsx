// 納品前のチェック項目。
//  ・DeliveryChecklist：確認待ちのカードに出すチェック欄（視点の確認待ちステップ全部に保存）
//    全部チェックして「OKを出した人」を選ぶと、OK の日時を記録する
//  ・ChecklistEditor：マスタ（ステップ・単価）でチェック項目を編集する
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '../appContext.js';

export const DEFAULT_DELIVERY_CHECKLIST = [
  '納品名（ファイル名）を確認した',
  '修正指示をすべて反映した',
  '画像のサイズ・形式を確認した',
  '社内チェックでOKが出た',
];
export function normalizeChecklist(v) {
  const arr = Array.isArray(v) ? v.map(x => String(x || '').trim()).filter(Boolean) : [];
  return arr.length ? [...new Set(arr)] : DEFAULT_DELIVERY_CHECKLIST.slice();
}
const fmt = (ts) => {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function DeliveryChecklist({ tasks }) {
  const { colors, fontJP, deliveryChecklist, patchTasksByIds, assigneeList } = useApp();
  const items = normalizeChecklist(deliveryChecklist);
  const ids = (tasks || []).map(t => t.id);
  const first = (tasks || []).find(t => t.deliveryChecks) || {};
  const checks = first.deliveryChecks || {};
  const by = ((tasks || []).find(t => t.deliveryCheckedBy) || {}).deliveryCheckedBy || '';
  const at = ((tasks || []).find(t => t.deliveryCheckedAt) || {}).deliveryCheckedAt || null;
  const done = items.filter(it => checks[it]).length;
  const all = done === items.length;

  const save = (nextChecks, nextBy) => {
    const ok = items.every(it => nextChecks[it]) && !!nextBy;
    patchTasksByIds(ids, { deliveryChecks: nextChecks, deliveryCheckedBy: nextBy || null, deliveryCheckedAt: ok ? (at || Date.now()) : null });
  };
  return (
    <div style={{ marginTop: 10, padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: 4, background: all && by ? '#eef6ee' : '#fffdf6', fontFamily: fontJP }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>納品前チェック</span>
        <span style={{ fontSize: 11, color: all && by ? colors.progress : colors.textMute }}>
          {done}/{items.length}{all && by && at ? ` ・ ${by} さんがOK（${fmt(at)}）` : ''}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
        {items.map(it => (
          <label key={it} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', color: colors.text }}>
            <input type="checkbox" checked={!!checks[it]} onChange={(e) => save({ ...checks, [it]: e.target.checked }, by)} />
            {it}
          </label>
        ))}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.textMute, marginTop: 6 }}>
        OKを出した人
        <select value={by} onChange={(e) => save(checks, e.target.value)}
          style={{ padding: '2px 6px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 12, background: '#fff', cursor: 'pointer' }}>
          <option value="">（選ぶ）</option>
          {(assigneeList || []).map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>
    </div>
  );
}

export function ChecklistEditor() {
  const { colors, fontJP, fontDisplay, deliveryChecklist, saveDeliveryChecklist, notify } = useApp();
  const [draft, setDraft] = useState(() => normalizeChecklist(deliveryChecklist));
  useEffect(() => { setDraft(normalizeChecklist(deliveryChecklist)); }, [deliveryChecklist]);
  const commit = (next) => {
    const norm = normalizeChecklist(next);
    if (JSON.stringify(norm) === JSON.stringify(normalizeChecklist(deliveryChecklist))) return;
    saveDeliveryChecklist(norm);
    notify('納品前チェックの項目を保存しました', { type: 'success' });
  };
  const input = { padding: '5px 8px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 13, flex: 1, minWidth: 0 };
  return (
    <div>
      <h2 style={{ fontFamily: fontDisplay, fontSize: 18, margin: '0 0 4px 0', fontWeight: 500 }}>納品前チェックの項目</h2>
      <p style={{ fontSize: 12, color: colors.textMute, margin: '0 0 12px 0' }}>
        「確認待ち」のカード（視点を完了したあと）に出るチェック項目です。全部チェックして「OKを出した人」を選ぶと、OK の日時が残ります。
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 560 }}>
        {draft.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input value={it} onChange={(e) => setDraft(d => d.map((x, j) => j === i ? e.target.value : x))}
              onBlur={() => commit(draft)} style={input} />
            <button type="button" title="この項目を削除" onClick={() => { const next = draft.filter((_, j) => j !== i); setDraft(next); commit(next); }}
              style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '4px 6px', cursor: 'pointer', color: colors.textMute }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setDraft(d => [...d, ''])}
        style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.text }}>
        <Plus size={13} />項目を追加
      </button>
    </div>
  );
}
