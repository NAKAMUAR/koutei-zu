// メンバー管理（設定パネル内）。App.jsx から分割。
import { useState } from 'react';
import { useApp } from '../appContext.js';
import { memberList } from '../firebase.js';

// メンバー管理（設定パネル内）。オーナー以外のアクセス許可 Gmail を data/allowedEmails で管理する。
// Firestore ルールがこのリストを直接参照するため、追加・削除は即時に反映される。
// リスト自体の書き換えはルール上オーナーのみ可能。
function MemberSettings({ memberEmails, isOwner, colors, fontJP }) {
  const { notify, confirmDialog } = useApp();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (emails) => {
    setBusy(true);
    try { await memberList.set(emails); }
    catch (e) {
      console.error('メンバーリスト保存エラー:', e);
      notify('メンバーリストの保存に失敗しました。変更できるのはオーナーのみです。', { type: 'error' });
    }
    finally { setBusy(false); }
  };
  const add = () => {
    const email = input.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { notify('メールアドレスの形式が正しくありません', { type: 'error' }); return; }
    if (!memberEmails.includes(email)) save([...memberEmails, email]);
    setInput('');
  };
  const remove = async (email) => {
    if (!(await confirmDialog({ message: `${email} のアクセス許可を解除しますか？`, confirmLabel: '解除する' }))) return;
    save(memberEmails.filter(e => e !== email));
  };
  return (
    <div style={{ maxWidth: 1600, margin: '16px auto 0', borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>メンバー管理（アクセスを許可する Google アカウント）</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {memberEmails.length === 0 && (
          <span style={{ fontSize: 12, color: colors.textMute }}>追加メンバーはいません（オーナーのみアクセス可能）</span>
        )}
        {memberEmails.map(email => (
          <span key={email} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 10px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, fontSize: 12 }}>
            {email}
            {isOwner && (
              <button onClick={() => remove(email)} disabled={busy} title="アクセス許可を解除"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#c0392b', padding: 0, fontSize: 13, lineHeight: 1 }}>×</button>
            )}
          </span>
        ))}
        {isOwner && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') add(); }}
              placeholder="追加する Gmail アドレス"
              style={{ padding: '5px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 12, width: 210 }} />
            <button onClick={add} disabled={busy || !input.trim()}
              style={{ padding: '5px 12px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12 }}>追加</button>
          </span>
        )}
      </div>
      <div style={{ fontSize: 10.5, color: colors.textMute, marginTop: 6 }}>
        ここに追加した Google アカウントはサインインしてアプリの全データを読み書きできます。オーナー（firestore.rules に記載）は常にアクセス可能。
        ※この機能を有効にするには、最新の firestore.rules を Firebase コンソールへデプロイしてください。
      </div>
    </div>
  );
}


export { MemberSettings };
