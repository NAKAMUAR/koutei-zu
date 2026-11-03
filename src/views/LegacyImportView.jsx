// 過去分の取り込み（集計・帳票グループ）：旧「Project Schedule」の『案件シート(一覧)』を貼り付けて、
// 社内案件名ごとに1件の「完了済み（過去分）」として、毎回読み込む作業とは別の「保管庫」（data/legacy_YYYY-MM）に入れる。
// 工程図・保管庫にすでにある案件（社内案件名が同じ）は自動で外す。登録は元に戻せる。
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../appContext.js';
import { genId } from '../lib/utils.js';
import { legacyStore } from '../firebase.js';
import { applyPatchesToArchive, flattenArchive, planArchiveWrite } from '../lib/legacyArchive.js';
import LegacyArchivePanel from './LegacyArchivePanel.jsx';
import { applyAssignees, assigneePatchesForImported, existingCodes, legacyTask, lineOnlyProjects, readAssigneeTable, readLegacyRows, summarizeLegacy } from '../lib/legacyImport.js';
import { tabStyle } from '../components/common.jsx';

const FILTERS = [
  { id: 'take', label: '登録する' },
  { id: 'exists', label: '工程図・保管庫にある（外す）' },
  { id: 'notes', label: '注意あり' },
  { id: 'all', label: 'すべて' },
];

export default function LegacyImportView() {
  const { colors, fontJP, fontDisplay, tasks, notify, confirmDialog, importLegacyTasks, removeTasksByIds, patchTasksEach } = useApp();
  const [text, setText] = useState('');
  const [assigneeText, setAssigneeText] = useState(''); // 『LINEの担当者』タブ（任意）
  const [assigneeMap, setAssigneeMap] = useState(null);
  const [parsed, setParsed] = useState(null); // { projects, error, rowCount }
  const [skip, setSkip] = useState(() => new Set());
  const [filter, setFilter] = useState('take');

  // 保管庫（開いたときに1回だけ読む）
  const [archive, setArchive] = useState(null); // { 'YYYY-MM': [過去分] }
  const [archiveError, setArchiveError] = useState('');
  useEffect(() => {
    let alive = true;
    legacyStore.listAll().then(v => { if (alive) setArchive(v || {}); }).catch(e => { if (alive) { setArchive({}); setArchiveError(String(e && e.message || e)); } });
    return () => { alive = false; };
  }, []);
  const archiveList = useMemo(() => flattenArchive(archive), [archive]);
  // 保管庫へ書く（changed：{ 月: 新しい配列 }）。before の値（null は消す）で元に戻せる
  const writeArchive = async (changed) => {
    await legacyStore.setMany(Object.entries(changed));
    setArchive(prev => ({ ...(prev || {}), ...changed }));
  };
  const restoreArchive = async (before) => {
    for (const [m, v] of Object.entries(before)) {
      if (v) await legacyStore.set(m, v); else await legacyStore.remove(m);
    }
    setArchive(prev => { const n = { ...(prev || {}) }; for (const [m, v] of Object.entries(before)) { if (v) n[m] = v; else delete n[m]; } return n; });
  };
  // 毎回読み込む作業（tasks）に残っている過去分（以前の取り込み）→ 保管庫へ移せる
  const legacyInTasks = useMemo(() => tasks.filter(t => t.legacySource), [tasks]);
  const moveToArchive = async () => {
    const items = legacyInTasks;
    const { changed, before } = planArchiveWrite(archive, items);
    await writeArchive(changed);
    await removeTasksByIds(items.map(t => t.id));
    notify(`過去分 ${items.length}件を保管庫へ移しました`, {
      type: 'success',
      undo: async () => { await importLegacyTasks(items); await restoreArchive(before); },
    });
  };

  const existing = useMemo(() => existingCodes([...tasks, ...archiveList]), [tasks, archiveList]);
  const read = () => {
    // 担当者の表（任意）
    let map = null;
    if (assigneeText.trim()) {
      const a = readAssigneeTable(assigneeText);
      if (a.error) { setParsed({ projects: [], error: a.error, rowCount: 0 }); return; }
      map = a.map;
    }
    setAssigneeMap(map);
    if (!text.trim()) {
      // 担当者の表だけ：取り込み済みの過去分に担当者を反映する
      setParsed({ projects: lineOnlyProjects(map, null), error: '', rowCount: 0, onlyAssignees: true });
      setSkip(new Set());
      setAssigneeText('');
      return;
    }
    const r = readLegacyRows(text);
    if (r.error) { setParsed({ projects: [], error: r.error, rowCount: 0 }); return; }
    const legacy = summarizeLegacy(r.rows);
    // 古いシートの案件＋（表があれば）LINE にだけある案件を「内容不明」として末尾に足す
    const projects = [...applyAssignees(legacy, map), ...lineOnlyProjects(map, legacy)];
    setParsed({ projects, error: '', rowCount: r.rows.length });
    // 最初から外すもの：テストらしい案件・LINE では制作中の案件（工程図にある案件は判定で外れる）
    setSkip(new Set(projects.filter(p => p.isTest || (p.assigneeInfo && p.assigneeInfo.active)).map(p => p.key)));
    setText(''); setAssigneeText(''); // 大きな文字は残さない
  };
  const importedPatches = useMemo(() => assigneePatchesForImported([...tasks, ...archiveList], assigneeMap), [tasks, archiveList, assigneeMap]);
  const applyImported = async () => {
    const taskIds = new Set(tasks.map(t => t.id));
    const inTasks = importedPatches.filter(x => taskIds.has(x.id));
    const inArchive = importedPatches.filter(x => !taskIds.has(x.id));
    const beforeTasks = inTasks.map(x => { const t = tasks.find(y => y.id === x.id); return { id: x.id, patch: { assignee: t.assignee, memo: t.memo } }; });
    if (inTasks.length) patchTasksEach(inTasks);
    const { changed, before } = planArchiveWrite(archive, applyPatchesToArchive(archiveList, inArchive));
    if (inArchive.length) await writeArchive(changed);
    notify(`取り込み済みの過去分 ${importedPatches.length}件に担当者を反映しました`, {
      type: 'success',
      undo: async () => { if (inTasks.length) patchTasksEach(beforeTasks); if (inArchive.length) await restoreArchive(before); },
    });
  };
  const list = (parsed && parsed.projects) || [];
  const isExisting = (p) => existing.has(p.key);
  const willTake = (p) => !isExisting(p) && !skip.has(p.key);
  const counts = {
    all: list.length,
    exists: list.filter(isExisting).length,
    take: list.filter(willTake).length,
    notes: list.filter(p => p.notes.length).length,
  };
  const shown = list.filter(p => (filter === 'take' ? willTake(p) : filter === 'exists' ? isExisting(p) : filter === 'notes' ? p.notes.length > 0 : true));

  const doImport = async () => {
    const targets = list.filter(willTake);
    if (!targets.length) { notify('登録する案件がありません', { type: 'error' }); return; }
    const ok = await confirmDialog({
      title: '過去分の登録',
      message: `${targets.length}件の案件を「完了済み（過去分）」として保管庫に登録します。担当者が分からないものは「担当者不明（過去分）」になります。\n（工程図にすでにある ${counts.exists}件は登録しません。登録したあとも「元に戻す」で取り消せます）`,
      confirmLabel: '登録する',
    });
    if (!ok) return;
    const now = Date.now();
    const newTasks = targets.map(p => legacyTask(p, genId('task'), now));
    const { changed, before } = planArchiveWrite(archive, newTasks);
    try {
      await writeArchive(changed);
    } catch (e) {
      notify(`保管庫に書き込めませんでした：${e && e.message || e}`, { type: 'error' });
      return;
    }
    notify(`${newTasks.length}件の過去分を保管庫に登録しました（この画面の下の「保管している過去分」で見られます）`, {
      type: 'success',
      undo: () => restoreArchive(before),
    });
    setParsed(null);
  };

  const th = { position: 'sticky', top: 0, background: '#eef1f5', borderBottom: `1px solid ${colors.border}`, padding: '5px 8px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'left', zIndex: 1 };
  const td = { borderBottom: `1px solid ${colors.border}`, padding: '4px 8px', fontSize: 12, verticalAlign: 'top' };

  return (
    <section style={{ fontFamily: fontJP }}>
      <h2 style={{ fontFamily: fontDisplay, fontSize: 20, margin: '0 0 6px 0', fontWeight: 500 }}>過去分の取り込み</h2>
      <p style={{ fontSize: 12, color: colors.textMute, margin: '0 0 14px 0', lineHeight: 1.7 }}>
        旧「Project Schedule」の『案件シート(一覧)』を、<b>社内案件名ごとに1件</b>の「完了済み」として登録します。<br />
        ・過去分は、毎回読み込む作業とは別の<b>保管庫</b>（月ごとにまとめて保存）に入れます。この画面を開いたときだけ読むので、アプリが重くならず、Firebase の無料枠も減りません。案件・完了タブなどには出ず、この画面の下で検索・書き出しができます。<br />
        ・旧シートには担当者・作成日時が無いため、担当者は「担当者不明（過去分）」、登録日はサーバリンクのフォルダ名（…\2026-5\…\0522 など）から推定します。担当者の表（LINE の朝の担当一覧から作ったもの）を一緒に貼ると、一致した案件に担当者が付きます。<br />
        ・LINE で「制作中」の案件は、最初からチェックを外してあります（今の作業なので過去分にしない）。<br />
        ・工程図にすでにある案件（社内案件名が同じ）と、テストらしい案件は登録しません。請求は済んだものとして扱います（進行状況の「請求待ち」には出ません）。
      </p>

      {archiveError && (
        <div style={{ padding: 10, background: colors.accentSoft, color: colors.accent, borderRadius: 4, fontSize: 12, margin: '0 0 10px' }}>保管庫を読めませんでした：{archiveError}</div>
      )}
      {legacyInTasks.length > 0 && archive && (
        <div style={{ margin: '0 0 14px', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 4, background: '#fff8ec', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 12 }}>
          <span>以前に取り込んだ過去分 <b>{legacyInTasks.length}件</b> が、毎回読み込む作業の中に残っています。保管庫へ移すと、アプリを開いたときの読み込みが減ります。</span>
          <button type="button" onClick={moveToArchive}
            style={{ marginLeft: 'auto', padding: '6px 14px', background: colors.text, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, fontWeight: 600 }}>
            保管庫へ移す
          </button>
        </div>
      )}

      {!parsed && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, margin: '0 0 6px' }}>① 旧シートをコピーして貼り付ける</div>
          <div style={{ fontSize: 12, color: colors.textMute, marginBottom: 6 }}>
            旧シートの『案件シート(一覧)』タブを開き、左上のセル番地の欄（名前ボックス）に <b>A1:AC9299</b> と入れて Enter → コピー（⌘＋C）→ 下の枠に貼り付け（⌘＋V）→「読み取る」。<br />
            （列が多いのでタブ全体ではなく A〜AC 列だけをコピーします。貼り付けに数秒かかることがあります）
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="ここに貼り付け"
            style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${colors.border}`, borderRadius: 4, padding: 8, fontFamily: 'monospace', fontSize: 11 }} />
          <div style={{ fontSize: 13, fontWeight: 700, margin: '12px 0 6px' }}>（任意）担当者の表を貼り付ける</div>
          <div style={{ fontSize: 12, color: colors.textMute, marginBottom: 6 }}>
            管理者用シートの『LINEの担当者（10月）』タブ（LINE の朝の担当一覧から作った表）を、見出しの行から全部選んでコピーして貼ると、一致した案件に担当者が付きます。<br />
            ここだけ貼って「読み取る」と、すでに取り込んだ過去分の担当者を直せます。
          </div>
          <textarea value={assigneeText} onChange={(e) => setAssigneeText(e.target.value)} rows={3} placeholder="（任意）『LINEの担当者』タブを貼り付け"
            style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${colors.border}`, borderRadius: 4, padding: 8, fontFamily: 'monospace', fontSize: 11 }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <button type="button" onClick={read} disabled={!text.trim() && !assigneeText.trim()}
              style={{ padding: '7px 16px', background: (text.trim() || assigneeText.trim()) ? colors.text : colors.textMute, color: '#fff', border: 'none', borderRadius: 4, cursor: (text.trim() || assigneeText.trim()) ? 'pointer' : 'default', fontFamily: fontJP, fontSize: 13, fontWeight: 600 }}>
              読み取る
            </button>
          </div>
        </>
      )}

      {parsed && parsed.error && (
        <div style={{ padding: 12, background: colors.accentSoft, color: colors.accent, borderRadius: 4, fontSize: 13, margin: '10px 0' }}>
          {parsed.error}
          <div><button type="button" onClick={() => setParsed(null)} style={{ marginTop: 8, padding: '4px 10px', fontFamily: fontJP }}>貼り直す</button></div>
        </div>
      )}

      {parsed && !parsed.error && assigneeMap && (
        <div style={{ margin: '4px 0 14px', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 4, background: '#f6faf6', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 12 }}>
          <span>担当者の表：{assigneeMap.size}件 ／ すでに取り込んだ過去分のうち、担当者を直せるもの <b>{importedPatches.length}件</b></span>
          <button type="button" onClick={applyImported} disabled={!importedPatches.length}
            style={{ marginLeft: 'auto', padding: '6px 14px', background: importedPatches.length ? colors.progress : colors.textMute, color: '#fff', border: 'none', borderRadius: 4, cursor: importedPatches.length ? 'pointer' : 'default', fontFamily: fontJP, fontSize: 12, fontWeight: 600 }}>
            取り込み済みの過去分に担当者を反映
          </button>
          {parsed.onlyAssignees && <button type="button" onClick={() => setParsed(null)} style={tabStyle(false, colors, fontJP)}>戻る</button>}
        </div>
      )}

      {parsed && !parsed.error && (!parsed.onlyAssignees || list.length > 0) && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, margin: '4px 0 6px' }}>② 内容を確かめる</div>
          <div style={{ fontSize: 12, color: colors.text, marginBottom: 8 }}>
            {parsed.onlyAssignees ? 'LINE にだけある案件（内容不明）' : `${parsed.rowCount.toLocaleString('ja-JP')}行`} → 案件 {counts.all}件 ／ 工程図・保管庫にある {counts.exists}件（登録しない）／ <b>登録する {counts.take}件</b> ／ 注意あり {counts.notes}件
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {FILTERS.map(f => (
              <button key={f.id} type="button" onClick={() => setFilter(f.id)} style={tabStyle(filter === f.id, colors, fontJP)}>
                {f.label}（{counts[f.id]}）
              </button>
            ))}
            <button type="button" onClick={() => setParsed(null)} style={{ ...tabStyle(false, colors, fontJP), marginLeft: 'auto' }}>貼り直す</button>
          </div>
          <div style={{ overflow: 'auto', maxHeight: '60vh', border: `1px solid ${colors.border}`, borderRadius: 4, background: '#fff' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={th}>登録</th><th style={th}>社内案件名</th><th style={th}>社外案件名</th><th style={th}>会社名</th>
                  <th style={th}>推定の登録日</th><th style={th}>担当者</th><th style={th}>カット／行</th><th style={th}>合計</th><th style={th}>判定・注意</th>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 && <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: colors.textMute, padding: 24 }}>該当なし</td></tr>}
                {shown.map(p => {
                  const ex = isExisting(p);
                  return (
                    <tr key={p.key} style={{ opacity: ex ? 0.55 : 1 }}>
                      <td style={td}>
                        <input type="checkbox" disabled={ex} checked={willTake(p)}
                          onChange={(e) => setSkip(prev => { const s = new Set(prev); e.target.checked ? s.delete(p.key) : s.add(p.key); return s; })} />
                      </td>
                      <td style={{ ...td, whiteSpace: 'nowrap', fontWeight: 600 }}>{p.code}</td>
                      <td style={td}>{p.name || <span style={{ color: colors.textMute }}>（なし）</span>}</td>
                      <td style={td}>{p.company}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        {p.firstDate || '不明'}{p.lastDate && p.lastDate !== p.firstDate ? ` 〜 ${p.lastDate}` : ''}
                        <div style={{ fontSize: 10, color: colors.textMute }}>{p.dateBasis}</div>
                      </td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        {p.assigneeInfo ? p.assigneeInfo.assignee : <span style={{ color: colors.textMute }}>不明</span>}
                        {p.assigneeInfo && (p.assigneeInfo.others || p.assigneeInfo.support) && (
                          <div style={{ fontSize: 10, color: colors.textMute }}>{[p.assigneeInfo.others, p.assigneeInfo.support && `サポート ${p.assigneeInfo.support}`].filter(Boolean).join('・')}</div>
                        )}
                      </td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }} title={p.cuts.join('、')}>{p.cutCount}／{p.rowCount}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap', textAlign: 'right' }}>{p.total}h</td>
                      <td style={{ ...td, fontSize: 11 }}>
                        {ex && <div style={{ color: colors.progress, fontWeight: 600 }}>工程図・保管庫にあり（登録しない）</div>}
                        {p.notes.map(n => <div key={n} style={{ color: '#b07d3c' }}>{n}</div>)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, margin: '14px 0 6px' }}>③ 登録する</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: colors.textMute }}>「表記ゆれの可能性」は会社名を決めるためだけに使い、社内案件名は旧シートのまま登録します。</span>
            <button type="button" onClick={doImport} disabled={counts.take === 0 || !archive}
              style={{ marginLeft: 'auto', padding: '9px 18px', background: counts.take && archive ? colors.text : colors.textMute, color: '#fff', border: 'none', borderRadius: 4, cursor: counts.take && archive ? 'pointer' : 'default', fontFamily: fontJP, fontSize: 13, fontWeight: 600 }}>
              {archive ? `${counts.take}件を完了済みで登録` : '保管庫を読み込み中…'}
            </button>
          </div>
        </>
      )}

      {!parsed && <LegacyArchivePanel list={archive ? archiveList : null} />}
    </section>
  );
}
