// メンテナンス（設定パネル内・オーナーのみ）。App.jsx から分割。
// 帳票・売上の保存方式を移行したとき（2026-07）に退避した旧データ（*_backup キー）を確認・削除する。
// 誤削除を防ぐため、退避から30日たつまで削除できず、削除は2段階で確認する（削除直後なら「元に戻す」で復元できる）。
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../appContext.js';
import { storage } from '../firebase.js';

const BACKUP_KEYS = [
  { key: 'billingDocuments_backup', label: '帳票（見積書・発注書・請求書）の旧データ' },
  { key: 'salesLedger_backup', label: '売上登録表の旧データ' },
];
const MIN_DAYS = 30;
const DAY = 86400000;

function fmtSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return Math.max(1, Math.round(bytes / 1024)) + ' KB';
}
function fmtDate(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function MaintenanceSettings({ colors, fontJP }) {
  const { notify, confirmDialog } = useApp();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(null); // { [key]: { exists, size, updatedAt, value } }
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const next = {};
    for (const b of BACKUP_KEYS) {
      const r = await storage.get(b.key);
      next[b.key] = r && r.value != null
        ? { exists: true, size: new Blob([String(r.value)]).size, updatedAt: r.updatedAt || null, value: r.value }
        : { exists: false };
    }
    setInfo(next);
  };
  const toggle = () => { const o = !open; setOpen(o); if (o) load(); };

  const remove = async (b) => {
    const it = info && info[b.key];
    if (!it || !it.exists) return;
    if (!(await confirmDialog({ title: '旧データの削除', message: `「${b.label}」（${b.key}）を削除します。\n今の帳票・売上登録表のデータには影響しません。`, confirmLabel: '次へ' }))) return;
    if (!(await confirmDialog({ title: '最終確認', message: `${b.key} を削除します。よろしいですか？`, confirmLabel: '削除する' }))) return;
    setBusy(true);
    try {
      await storage.delete(b.key);
      notify(`「${b.label}」を削除しました`, { type: 'success', undo: async () => { await storage.set(b.key, it.value); await load(); } });
      await load();
    } catch (e) {
      console.error('旧データの削除エラー:', e);
      notify('削除に失敗しました', { type: 'error' });
    } finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: 1600, margin: '16px auto 0', borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
      <button type="button" onClick={toggle}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, fontWeight: 700, color: colors.text }}>
        メンテナンス（オーナーのみ）{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: colors.textMute, marginBottom: 8 }}>
            保存方式の移行（2026-07）で退避した旧データです。今の帳票・売上登録表では使っていません。問題なく運用できていれば削除して構いません（退避から{MIN_DAYS}日たつと削除できます）。
          </div>
          {!info ? (
            <div style={{ fontSize: 12, color: colors.textMute }}>確認中…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {BACKUP_KEYS.map(b => {
                const it = info[b.key] || {};
                const days = it.updatedAt ? Math.floor((Date.now() - it.updatedAt) / DAY) : null;
                const waitDays = days == null ? 0 : Math.max(0, MIN_DAYS - days);
                const canDelete = it.exists && waitDays === 0 && !busy;
                return (
                  <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12, padding: '6px 10px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4 }}>
                    <span style={{ fontWeight: 600 }}>{b.label}</span>
                    <span style={{ color: colors.textMute, fontSize: 11 }}>{b.key}</span>
                    {it.exists ? (
                      <span style={{ color: colors.textMute, fontSize: 11 }}>
                        {fmtSize(it.size)}{it.updatedAt ? ` ・ 退避 ${fmtDate(it.updatedAt)}（${days}日前）` : ' ・ 退避日時不明'}
                      </span>
                    ) : (
                      <span style={{ color: colors.textMute, fontSize: 11 }}>ありません（削除済み）</span>
                    )}
                    {it.exists && (
                      <button type="button" onClick={() => remove(b)} disabled={!canDelete}
                        title={waitDays > 0 ? `誤削除を防ぐため、あと${waitDays}日たつと削除できます` : '旧データを削除'}
                        style={{ marginLeft: 'auto', padding: '4px 10px', background: 'transparent', border: `1px solid ${canDelete ? '#c0392b' : colors.border}`, color: canDelete ? '#c0392b' : colors.textMute, borderRadius: 4, cursor: canDelete ? 'pointer' : 'default', fontFamily: fontJP, fontSize: 11 }}>
                        {waitDays > 0 ? `あと${waitDays}日で削除できます` : '削除'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { MaintenanceSettings };
