// 進行中案件一覧（視点グループ・視点カード・ステップ行・請求パネル）。App.jsx から分割。
import { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../appContext.js';
import { dateToDtLocal, dayName, fmtHM, fmtMD, fmtYMD, getProjectColor, isSameDay, minToTime, parseHM, priorityColor, startOfDay } from '../../lib/utils.js';
import { compareCompanyDisplay, computeProjectOrder, elapsedHoursForSlots } from '../../lib/schedule.js';
import { Check, CheckCircle2, ChevronDown, ChevronUp, Clock, Edit2, FileText, GripVertical, PauseCircle, Plus, Trash2, User, X, Zap } from 'lucide-react';
import { ROUND_TYPES, deliveryBaseName, num as vpNum, roundTypeOf, stepDeliveryName } from '../../viewpoint/viewpointUtils.js';
import { DateTimeField, iconBtnStyle, miniBtnStyle, progressBtnStyle } from '../../components/common.jsx';

function ViewpointGroupList({ groups, allActive, sortMode, defaultCollapsed }) {
  const {
    colors, fontJP, now, caseEditMode, companyOrder, projectOrder, saveProjectOrder,
    offshoreCompanies, handleEditProject, completeProject, cancelProject,
    suspendProject, setProjectDeadline,
  } = useApp();
  // 契約形態「オフショア」の会社（お客様マスタ由来）。会社別表示で「オフショア（その他）」へ集約する。
  // 渡されない（担当者別など）場合は集約しない。
  const isOffshore = (c) => !!offshoreCompanies && offshoreCompanies.has(c || '');
  const groupKeyOf = (c) => isOffshore(c) ? 'オフショア（その他）' : (c || '');
  // 全タスクのグローバルなインデックス（移動可否判定用）
  const allSortedIds = allActive.map(t => t.id);

  // 各会社の「先頭／末尾タスク」id（会社の中での↑↓の可否判定に使う）。
  // allActive はスケジュール順（会社ごとに連続）なので、初出＝先頭・末尾から見て初出＝末尾。
  const { companyFirstIds, companyLastIds } = useMemo(() => {
    const first = new Set(), last = new Set();
    const seenF = new Set(), seenL = new Set();
    for (let i = 0; i < allActive.length; i++) {
      const c = allActive[i].companyName || '';
      if (!seenF.has(c)) { first.add(allActive[i].id); seenF.add(c); }
    }
    for (let i = allActive.length - 1; i >= 0; i--) {
      const c = allActive[i].companyName || '';
      if (!seenL.has(c)) { last.add(allActive[i].id); seenL.add(c); }
    }
    return { companyFirstIds: first, companyLastIds: last };
  }, [allActive]);

  // 案件（社外案件名）でさらにグループ化。順序は最初に現れた順。
  const projectGroups = useMemo(() => {
    const map = new Map();
    for (const g of groups) {
      const pname = g.projectName || '(案件名未設定)';
      if (!map.has(pname)) {
        map.set(pname, {
          projectName: pname,
          projectNameInternal: g.projectNameInternal || '',
          companyName: g.companyName || '',
          customerContact: g.customerContact || '',
          memo: g.memo || '',
          tentative: !!g.tentative,
          tentativeStart: g.tentativeStart || '',
          tentativeEnd: g.tentativeEnd || '',
          deadline: g.deadline || '',           // 表示・納期順ソート用＝視点ごと実効納期の最早
          projectDeadline: g.projectDeadline || '', // 全体納期（案件共通）
          viewpointGroups: [],
          registeredDate: '', // 登録日（自動記録・タスクの最早値。旧データは createdAt から導出）
          totalHours: 0,
          completedHours: 0,
          taskCount: 0,
          assigneeSet: new Set(),
          startTs: null, endTs: null,
          scheduledStart: null, scheduledStartMin: 0,
          scheduledEnd: null, scheduledEndMin: 0,
        });
      }
      const pg = map.get(pname);
      pg.viewpointGroups.push(g);
      pg.totalHours += g.totalHours;
      pg.completedHours += g.completedHours;
      pg.taskCount += g.tasks.length;
      for (const t of g.tasks) {
        const rd = t.registeredDate || (t.createdAt ? fmtYMD(new Date(t.createdAt)) : '');
        if (rd && (!pg.registeredDate || rd < pg.registeredDate)) pg.registeredDate = rd;
      }
      if (!pg.projectNameInternal && g.projectNameInternal) pg.projectNameInternal = g.projectNameInternal;
      if (!pg.companyName && g.companyName) pg.companyName = g.companyName;
      if (!pg.customerContact && g.customerContact) pg.customerContact = g.customerContact;
      if (!pg.memo && g.memo) pg.memo = g.memo;
      if (g.tentative) pg.tentative = true;
      if (!pg.tentativeStart && g.tentativeStart) pg.tentativeStart = g.tentativeStart;
      if (!pg.tentativeEnd && g.tentativeEnd) pg.tentativeEnd = g.tentativeEnd;
      // 案件の納期 ＝ 視点ごとの実効納期のうち最も早いもの（表示・納期順ソート用）
      if (g.deadline && (!pg.deadline || g.deadline < pg.deadline)) pg.deadline = g.deadline;
      // 全体納期（案件共通）はどの視点でも同じ値（最初に見つかったもの）
      if (g.projectDeadline && !pg.projectDeadline) pg.projectDeadline = g.projectDeadline;
      if (g.assignee) pg.assigneeSet.add(g.assignee);
      // 案件全体の開始＝最早の視点開始、終了＝最遅の視点終了
      if (g.scheduledStart) {
        const sTs = g.scheduledStart.getTime() + (g.scheduledStartMin || 0) * 60000;
        if (pg.startTs == null || sTs < pg.startTs) {
          pg.startTs = sTs; pg.scheduledStart = g.scheduledStart; pg.scheduledStartMin = g.scheduledStartMin;
        }
      }
      if (g.scheduledEnd) {
        const eTs = g.scheduledEnd.getTime() + (g.scheduledEndMin || 0) * 60000;
        if (pg.endTs == null || eTs > pg.endTs) {
          pg.endTs = eTs; pg.scheduledEnd = g.scheduledEnd; pg.scheduledEndMin = g.scheduledEndMin;
        }
      }
    }
    const arr = Array.from(map.values());
    // 案件内の視点は「社内視点名の数字が小さい順」で表示する（例：IN1→IN2→IN4）。
    // 数字を含まない視点は末尾（元の相対順を維持）。
    const vpNumOf = (name) => { const m = String(name || '').match(/\d+/); return m ? parseInt(m[0], 10) : Number.POSITIVE_INFINITY; };
    for (const pg of arr) {
      pg.assignees = [...pg.assigneeSet];
      pg.viewpointGroups = pg.viewpointGroups
        .map((g, i) => ({ g, i }))
        .sort((a, b) => (vpNumOf(a.g.viewpointName) - vpNumOf(b.g.viewpointName)) || (a.i - b.i))
        .map(x => x.g);
    }
    return arr;
  }, [groups]);


  // 案件の実効並び順（既定は会社ごと・手動ドラッグは会社を跨いで反映）で並べる
  const orderedProjectGroups = useMemo(() => {
    const effective = computeProjectOrder(allActive, projectOrder);
    const idx = new Map(effective.map((n, i) => [n, i]));
    const projOf = (pg) => idx.has(pg.projectName) ? idx.get(pg.projectName) : Infinity;
    return [...projectGroups].sort((a, b) => (projOf(a) - projOf(b)));
  }, [projectGroups, projectOrder, allActive]);

  // 会社ごとに「必ず1グループ」にまとめる（同じ会社が複数箇所に割れない）。
  // 会社の並びは companyOrder ベース。会社内の案件は orderedProjectGroups の相対順（優先順位・ドラッグ）を維持。
  // 納期順モード（sortMode === 'deadline'）では会社で分けず、納期の早い順の1リストにする
  const companySections = useMemo(() => {
    if (sortMode === 'deadline') {
      const sorted = [...orderedProjectGroups].sort((a, b) => {
        const da = a.deadline || '9999-12-31';
        const db = b.deadline || '9999-12-31';
        if (da !== db) return da < db ? -1 : 1;
        return 0; // 同じ納期・納期なし同士は制作順を維持（stable sort）
      });
      // 納期の日付ごとにグループ分け（sorted は納期順なので Map の挿入順＝日付順）
      const dmap = new Map();
      for (const pg of sorted) {
        const key = pg.deadline || ''; // '' = 納期未設定（最後に並ぶ）
        if (!dmap.has(key)) dmap.set(key, []);
        dmap.get(key).push(pg);
      }
      return [...dmap.entries()].map(([deadline, projects]) => ({
        companyName: '',
        deadlineGroup: deadline, // 'YYYY-MM-DD' または '' （納期未設定）
        projects,
        remaining: projects.reduce((s, pg) => s + (pg.totalHours - pg.completedHours), 0),
      }));
    }
    const map = new Map();
    for (const pg of orderedProjectGroups) {
      // 契約形態オフショアの会社は「オフショア（その他）」グループに集約（会社名は各案件カードに表示）
      const c = groupKeyOf(pg.companyName || '');
      if (!map.has(c)) map.set(c, { companyName: c, projects: [], remaining: 0 });
      const sec = map.get(c);
      sec.projects.push(pg);
      sec.remaining += (pg.totalHours - pg.completedHours);
    }
    return [...map.values()].sort((a, b) => compareCompanyDisplay(a.companyName, b.companyName, companyOrder));
  }, [orderedProjectGroups, companyOrder, sortMode, offshoreCompanies]);

  // 実際に表示される案件の並び（会社グループを連結した順）。ドラッグ並べ替えの基準にする
  const displayedProjectNames = useMemo(
    () => companySections.flatMap(s => s.projects.map(p => p.projectName)),
    [companySections]
  );

  // ドラッグ＆ドロップの状態（マウス／デスクトップ）
  const [dragSource, setDragSource] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  // 並び替え：source を target の手前に挿入した新しい順序を返す
  const computeReorder = (sourceName, targetName) => {
    const currentOrder = [...displayedProjectNames];
    if (sourceName === targetName) return currentOrder;
    const filtered = currentOrder.filter(n => n !== sourceName);
    const targetIdx = filtered.indexOf(targetName);
    if (targetIdx < 0) return [...filtered, sourceName];
    return [...filtered.slice(0, targetIdx), sourceName, ...filtered.slice(targetIdx)];
  };

  const onDragStart = (name) => (e) => {
    if (!saveProjectOrder) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', name);
    setDragSource(name);
  };
  const onDragOver = (name) => (e) => {
    if (!saveProjectOrder || !dragSource || dragSource === name) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOver !== name) setDragOver(name);
  };
  const onDrop = (name) => (e) => {
    if (!saveProjectOrder || !dragSource) return;
    e.preventDefault();
    const newOrder = computeReorder(dragSource, name);
    saveProjectOrder(newOrder);
    setDragSource(null); setDragOver(null);
  };
  const onDragEnd = () => { setDragSource(null); setDragOver(null); };

  // タッチ／スマホ向け：↑↓ボタンで1つ動かす
  const moveProject = (name, dir) => {
    if (!saveProjectOrder) return;
    const order = [...displayedProjectNames];
    const idx = order.indexOf(name);
    if (idx < 0) return;
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === order.length - 1) return;
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    const newOrder = [...order];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    saveProjectOrder(newOrder);
  };

  const [collapsed, setCollapsed] = useState(() => new Set());
  // 進行中一覧（defaultCollapsed）は標準で全案件を閉じる（データ初回到着時に1回だけ。以後は手動操作を尊重）
  const didInitCollapse = useRef(false);
  useEffect(() => {
    if (defaultCollapsed && !didInitCollapse.current && orderedProjectGroups.length > 0) {
      setCollapsed(new Set(orderedProjectGroups.map(p => p.projectName)));
      didInitCollapse.current = true;
    }
  }, [defaultCollapsed, orderedProjectGroups]);
  const toggle = (pname) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(pname)) next.delete(pname); else next.add(pname);
    return next;
  });
  const collapseAll = () => setCollapsed(new Set(orderedProjectGroups.map(p => p.projectName)));
  const expandAll = () => setCollapsed(new Set());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {orderedProjectGroups.length > 1 && (
        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: colors.textMute }}>
          <button type="button" onClick={expandAll}
            style={{ background: 'transparent', border: `1px solid ${colors.border}`, padding: '3px 10px', borderRadius: 3, cursor: 'pointer', fontFamily: fontJP, fontSize: 11, color: colors.textMute }}>
            すべて開く
          </button>
          <button type="button" onClick={collapseAll}
            style={{ background: 'transparent', border: `1px solid ${colors.border}`, padding: '3px 10px', borderRadius: 3, cursor: 'pointer', fontFamily: fontJP, fontSize: 11, color: colors.textMute }}>
            すべて閉じる
          </button>
        </div>
      )}
      {companySections.map((section) => (
        <div key={section.deadlineGroup !== undefined ? 'deadline::' + section.deadlineGroup : 'company::' + section.companyName} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {section.deadlineGroup !== undefined ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
              {(() => {
                if (!section.deadlineGroup) {
                  return (
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: colors.textMute,
                      background: '#eee', borderRadius: 12,
                      padding: '4px 14px', whiteSpace: 'nowrap',
                    }}>納期未設定</span>
                  );
                }
                const dl = new Date(section.deadlineGroup + 'T00:00:00');
                const overdue = !caseEditMode && section.deadlineGroup < fmtYMD(now);
                return (
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: '#fff',
                    background: overdue ? '#c0392b' : colors.accent, borderRadius: 12,
                    padding: '4px 14px', whiteSpace: 'nowrap',
                  }}>納期 {fmtMD(dl)}（{dayName(dl)}）{overdue ? ' 超過' : ''}</span>
                );
              })()}
              <span style={{ fontSize: 11, color: colors.textMute }}>
                {section.projects.length}案件 ・ 残 {fmtHM(Math.max(0, section.remaining))}
              </span>
            </div>
          ) : section.companyName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
              <span style={{
                fontSize: 13, fontWeight: 700, color: '#fff',
                background: getProjectColor(section.companyName), borderRadius: 12,
                padding: '4px 14px', whiteSpace: 'nowrap',
              }}>{section.companyName}</span>
              <span style={{ fontSize: 11, color: colors.textMute }}>
                {section.projects.length}案件 ・ 残 {fmtHM(Math.max(0, section.remaining))}
              </span>
            </div>
          )}
          {section.projects.map((pg, secIdx) => {
        const isCollapsed = collapsed.has(pg.projectName);
        const remaining = pg.totalHours - pg.completedHours;
        const pcolor = getProjectColor(pg.projectName);
        // 納期順モードでは並び順は納期で決まるため手動並び替えは無効
        const draggable = !!saveProjectOrder && sortMode !== 'deadline';
        const isDragSource = dragSource === pg.projectName;
        const isDragOver = dragOver === pg.projectName && dragSource && dragSource !== pg.projectName;
        const isFirstInSection = secIdx === 0;
        const isLastInSection = secIdx === section.projects.length - 1;
        // ===== 状態に応じた背景色 =====
        // 黄: 作業が始まった案件 / オレンジ: 本日納品予定（終了予定が本日） /
        // 赤: 納期（本日 or 超過）があるのに本日納品予定でない（間に合わない恐れ）
        const todayYmd = fmtYMD(now);
        const endYmd = pg.scheduledEnd ? fmtYMD(pg.scheduledEnd) : null;
        const startedTs = pg.scheduledStart ? pg.scheduledStart.getTime() + (pg.scheduledStartMin || 0) * 60000 : null;
        const started = startedTs != null && startedTs <= now.getTime();
        const dueToday = endYmd != null && endYmd === todayYmd;
        const deadlinePassed = !caseEditMode && !!pg.deadline && pg.deadline <= todayYmd;
        const atRisk = deadlinePassed && !dueToday;
        const headerBg = atRisk ? '#fbdcdc' : dueToday ? '#ffe6c9' : started ? '#fdf3a6' : '#fff';
        const nameColor = deadlinePassed ? '#c1272d' : colors.text;
        return (
          <div key={pg.projectName} data-project-name={pg.projectName} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              draggable={draggable}
              onDragStart={draggable ? onDragStart(pg.projectName) : undefined}
              onDragOver={draggable ? onDragOver(pg.projectName) : undefined}
              onDragLeave={draggable ? (() => { if (dragOver === pg.projectName) setDragOver(null); }) : undefined}
              onDrop={draggable ? onDrop(pg.projectName) : undefined}
              onDragEnd={draggable ? onDragEnd : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: headerBg, border: `1px solid ${isDragOver ? colors.accent : (atRisk ? '#c1272d' : colors.border)}`,
                borderLeft: `4px solid ${atRisk ? '#c1272d' : pcolor}`,
                padding: '10px 14px', borderRadius: 4,
                fontFamily: fontJP,
                opacity: isDragSource ? 0.5 : 1,
                boxShadow: isDragOver ? `0 0 0 2px ${colors.accent} inset` : 'none',
                transition: 'box-shadow 0.1s, border-color 0.1s',
              }}>
              {draggable && (
                <span
                  title="ドラッグして並べ替え（PC）／右側の↑↓で並べ替え（スマホ）"
                  style={{
                    cursor: 'grab', color: colors.textMute, display: 'flex', alignItems: 'center',
                    padding: '2px 1px', flexShrink: 0,
                  }}>
                  <GripVertical size={14} />
                </span>
              )}
              {/* 折りたたみ＋各バッジ＋案件名を固定幅にまとめ、案件名は見切れ表示。
                  これで案件名の長さに関わらず、以降の要素がどの案件でも同じ位置に揃う */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 300px', minWidth: 0, overflow: 'hidden' }}>
                <button type="button" onClick={() => toggle(pg.projectName)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: colors.textMute, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                  title={isCollapsed ? '展開' : '折りたたみ'}>
                  {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                {pg.tentative && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#fff', background: '#c46a16',
                    borderRadius: 2, padding: '2px 6px', flexShrink: 0,
                  }} title="仮案件（仮予定）です。編集フォームで本登録に切り替えられます">仮</span>
                )}
                {pg.tentative && (pg.tentativeStart || pg.tentativeEnd) && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: '#c46a16', flexShrink: 0, whiteSpace: 'nowrap',
                  }} title="仮案件の対応想定期間（開始予定日〜終了予定日）">
                    {pg.tentativeStart ? pg.tentativeStart.slice(5).replace('-', '/') : ''}
                    〜
                    {pg.tentativeEnd ? pg.tentativeEnd.slice(5).replace('-', '/') : ''}
                  </span>
                )}
                {(sortMode === 'deadline' || isOffshore(pg.companyName)) && pg.companyName && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: '#fff',
                    background: getProjectColor(pg.companyName), borderRadius: 10,
                    padding: '1px 8px', flexShrink: 0, maxWidth: 90, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }} title={pg.companyName}>{pg.companyName}</span>
                )}
                <span onClick={() => toggle(pg.projectName)}
                  title={pg.projectNameInternal ? `${pg.projectNameInternal}（${pg.projectName}）` : pg.projectName}
                  style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                  {pg.projectNameInternal ? (
                    <>
                      <span style={{ fontSize: 14, fontWeight: 600, color: nameColor }}>{pg.projectNameInternal}</span>
                      <span style={{ fontSize: 11, color: deadlinePassed ? '#c1272d' : colors.textMute, marginLeft: 6 }}>{pg.projectName}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 600, color: nameColor }}>{pg.projectName}</span>
                  )}
                </span>
              </div>
              {pg.customerContact && (
                <span title={`お客様: ${pg.customerContact}`} style={{ fontSize: 11, color: colors.textMute, whiteSpace: 'nowrap', flexShrink: 0, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  お客様: {pg.customerContact}
                </span>
              )}
              {pg.registeredDate && (
                <span title={`登録日 ${pg.registeredDate}（新規登録した日・自動記録）`}
                  style={{ fontSize: 10.5, color: colors.textMute, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  登録 {pg.registeredDate.slice(5).replace('-', '/')}
                </span>
              )}
              {setProjectDeadline ? (() => {
                // 案件ヘッダーで「全体納期」を直接編集（案件の全タスクに反映）。個別納期があれば各視点側が優先
                const todayYmd = fmtYMD(new Date());
                const endYmd = pg.scheduledEnd ? fmtYMD(pg.scheduledEnd) : null;
                const danger = !caseEditMode && pg.projectDeadline && (todayYmd > pg.projectDeadline || (endYmd && endYmd > pg.projectDeadline));
                const d = pg.projectDeadline ? new Date(pg.projectDeadline + 'T00:00:00') : null;
                return (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                    title="案件全体の納期（全体設定）。各視点に個別納期があればそちらが優先されます">
                    <span style={{ fontSize: 11, fontWeight: 700, color: danger ? '#c1272d' : '#7a8471' }}>全体納期{danger ? ' ⚠' : ''}</span>
                    <input type="date" value={pg.projectDeadline || ''}
                      onChange={(e) => setProjectDeadline(pg.projectName, e.target.value)}
                      style={{
                        fontFamily: fontJP, fontSize: 11, padding: '2px 4px',
                        border: `1px solid ${danger ? '#c1272d' : '#c9d4c2'}`, borderRadius: 2,
                        background: danger ? '#fbeaea' : '#eef2ea',
                        color: danger ? '#c1272d' : '#5a6a51', cursor: 'pointer',
                      }} />
                    {d && <span style={{ fontSize: 10, color: colors.textMute }}>（{dayName(d)}）</span>}
                    {pg.projectDeadline && (
                      <button type="button" title="全体納期をクリア（納期なしにする）"
                        onClick={() => setProjectDeadline(pg.projectName, '')}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMute, padding: 0, display: 'flex', alignItems: 'center' }}>
                        <X size={11} />
                      </button>
                    )}
                  </span>
                );
              })() : (pg.deadline && (() => {
                const todayYmd = fmtYMD(new Date());
                const endYmd = pg.scheduledEnd ? fmtYMD(pg.scheduledEnd) : null;
                const danger = !caseEditMode && (todayYmd > pg.deadline || (endYmd && endYmd > pg.deadline));
                const d = new Date(pg.deadline + 'T00:00:00');
                return (
                  <span title={danger ? '納期を過ぎている、または終了予定が納期を超えています（視点ごとの納期のうち最早のもの）' : '納期（視点ごとの納期のうち最早のもの）'} style={{
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                    color: danger ? '#fff' : '#7a8471',
                    background: danger ? '#c1272d' : '#eef2ea',
                    border: danger ? 'none' : '1px solid #c9d4c2',
                    borderRadius: 2, padding: '1px 7px',
                  }}>納期 {fmtMD(d)}（{dayName(d)}）{danger ? ' ⚠' : ''}</span>
                );
              })())}
              {pg.memo && (
                <span title={pg.memo} style={{
                  fontSize: 11, color: '#8a7a4a', background: '#faf5e4', border: '1px solid #e8dcb8',
                  borderRadius: 2, padding: '1px 6px',
                  maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>📝 {pg.memo}</span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.textMute, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                {/* 1段目：担当者 ＋ 予定（開始〜終了） */}
                <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
                  {pg.assignees && pg.assignees.length > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: colors.text, fontWeight: 500 }}>
                      <User size={12} /> {pg.assignees.join('・')}
                    </span>
                  )}
                  {pg.scheduledStart && pg.scheduledEnd && (
                    <span style={{ color: colors.accent, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {fmtMD(pg.scheduledStart)}（{dayName(pg.scheduledStart)}）{minToTime(pg.scheduledStartMin)}
                      {' 〜 '}
                      {fmtMD(pg.scheduledEnd)}（{dayName(pg.scheduledEnd)}）{minToTime(pg.scheduledEndMin)}
                    </span>
                  )}
                </span>
                {/* 2段目：視点・タスク・完了/全・残 */}
                <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span>{pg.viewpointGroups.length}視点</span>
                  <span>{pg.taskCount}タスク</span>
                  <span>完了 {fmtHM(pg.completedHours)} / 全 {fmtHM(pg.totalHours)}</span>
                  <span style={{ color: colors.accent, fontWeight: 600 }}>残 {fmtHM(remaining)}</span>
                </span>
              </span>
              {draggable && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button type="button"
                    onClick={() => moveProject(pg.projectName, 'up')}
                    disabled={isFirstInSection}
                    title="この案件を（会社の中で）上へ"
                    style={{
                      background: '#fff', border: `1px solid ${colors.border}`,
                      padding: '1px 4px', borderRadius: 2, cursor: isFirstInSection ? 'not-allowed' : 'pointer',
                      color: isFirstInSection ? '#ccc' : colors.textMute,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    <ChevronUp size={10} />
                  </button>
                  <button type="button"
                    onClick={() => moveProject(pg.projectName, 'down')}
                    disabled={isLastInSection}
                    title="この案件を（会社の中で）下へ"
                    style={{
                      background: '#fff', border: `1px solid ${colors.border}`,
                      padding: '1px 4px', borderRadius: 2, cursor: isLastInSection ? 'not-allowed' : 'pointer',
                      color: isLastInSection ? '#ccc' : colors.textMute,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    <ChevronDown size={10} />
                  </button>
                </div>
              )}
              {/* 操作ボタンは記号＋色のみ（視点の追加は「案件を編集」の編集フォームから行う） */}
              {handleEditProject && (
                <button type="button" onClick={() => handleEditProject(pg.projectName)}
                  style={{
                    background: '#fff', border: `1px solid ${colors.border}`,
                    padding: 6, borderRadius: 3, cursor: 'pointer',
                    fontFamily: fontJP, color: colors.textMute,
                    display: 'flex', alignItems: 'center',
                  }}
                  title="案件を編集（視点の追加・案件名/コードの変更もこの画面から）">
                  <Edit2 size={14} />
                </button>
              )}
              {completeProject && (
                <button type="button" onClick={() => completeProject(pg.projectName)}
                  style={{
                    background: colors.progress, color: '#fff',
                    border: 'none', borderRadius: 3, padding: 6,
                    cursor: 'pointer', fontFamily: fontJP,
                    display: 'flex', alignItems: 'center',
                  }}
                  title="案件完了：この案件の未完了タスクを全て完了にして完了タブへ移動">
                  <CheckCircle2 size={14} />
                </button>
              )}
              {cancelProject && (
                <button type="button" onClick={() => cancelProject(pg.projectName)}
                  style={{
                    background: '#a05252', color: '#fff',
                    border: 'none', borderRadius: 3, padding: 6,
                    cursor: 'pointer', fontFamily: fontJP,
                    display: 'flex', alignItems: 'center',
                  }}
                  title="案件中止：この案件の未完了タスクを「中止」として完了タブへ移動（実績はそのまま・後続スケジュールに影響しない）">
                  <X size={14} />
                </button>
              )}
              {suspendProject && (
                <button type="button" onClick={() => suspendProject(pg.projectName)}
                  style={{
                    background: '#b07d3c', color: '#fff',
                    border: 'none', borderRadius: 3, padding: 6,
                    cursor: 'pointer', fontFamily: fontJP,
                    display: 'flex', alignItems: 'center',
                  }}
                  title="制作中断：納品後の確認待ちなどで進行できない案件を一旦スケジュールから外す（制作再開で戻せる）">
                  <PauseCircle size={14} />
                </button>
              )}
            </div>
            {!isCollapsed && pg.viewpointGroups.map(group => (
              // 視点カードは案件ヘッダーから1段インデント（全視点同じ深さで揃える）
              <div key={group.key} style={{ marginLeft: 22 }}>
              <ViewpointCard group={group}
                allSortedIds={allSortedIds}
                companyFirstIds={companyFirstIds} companyLastIds={companyLastIds} />
              </div>
            ))}
          </div>
        );
          })}
        </div>
      ))}
    </div>
  );
}

// 視点の「制作・納品」パネル：納品名（自動/上書き）・納品集計・制作履歴（初回/追加/修正の依頼日）・
// オフショア金額・外注情報。売上登録表へは自動同期（金額の入ったラウンドが売上行になる）。
function ViewpointMetaPanel({ group, isOffshore }) {
  const { colors, fontJP, setViewpointMeta, setStepMeta, createBillingFromViewpoint } = useApp();
  const [open, setOpen] = useState(false);
  const base = group.deliveryBaseName || deliveryBaseName(group.projectName, group.viewpointNameExternal || group.viewpointName, group.deliveryNameOverride);
  const countAs = group.countAsDelivery !== false;
  // 請求の元データはステップ（タスク）。視点内の全ステップを1行ずつ表示する。
  const steps = group.tasks || [];

  const update = (patch) => setViewpointMeta && setViewpointMeta(group, patch);
  const updateStep = (task, patch) => setStepMeta && setStepMeta(task, patch);

  const totalAmount = steps.reduce((s, t) => s + vpNum(t.stepAmount), 0);
  const totalVND = steps.reduce((s, t) => s + vpNum(t.stepOutVND), 0);
  const yen = (v) => '¥' + Math.round(v).toLocaleString('ja-JP');

  const inputBase = { fontFamily: fontJP, fontSize: 11, padding: '3px 5px', border: `1px solid ${colors.border}`, borderRadius: 3, background: '#fff', color: colors.text, boxSizing: 'border-box' };
  const labelStyle = { fontSize: 9.5, color: colors.textMute, marginBottom: 2, fontWeight: 600 };

  return (
    <div style={{ borderTop: `1px dashed ${colors.border}`, background: '#fdfcf8' }}>
      {/* サマリー行（クリックで展開） */}
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px', cursor: 'pointer', flexWrap: 'wrap', fontFamily: fontJP }}>
        {open ? <ChevronUp size={13} color={colors.textMute} /> : <ChevronDown size={13} color={colors.textMute} />}
        <span style={{ fontSize: 11, fontWeight: 700, color: '#9c7b3c' }}>制作・納品</span>
        <span style={{ fontSize: 11.5, color: colors.text, fontWeight: 600 }} title="納品名（自動）">
          納品名: {group.deliveryName || base || '—'}
        </span>
        {group.deliveryCount > 1 && (
          <span style={{ fontSize: 10, color: '#fff', background: '#b07d3c', borderRadius: 10, padding: '1px 7px' }}>納品{group.deliveryCount}回</span>
        )}
        {steps.length > 0 && <span style={{ fontSize: 10.5, color: colors.textMute }}>ステップ {steps.length}件</span>}
        {totalAmount > 0 && <span style={{ fontSize: 10.5, color: '#3a7bd5', fontWeight: 600 }}>金額 {yen(totalAmount)}</span>}
        {totalVND > 0 && <span style={{ fontSize: 10.5, color: '#7a8471' }}>外注 {Math.round(totalVND).toLocaleString('ja-JP')}₫</span>}
        {!countAs && <span style={{ fontSize: 10, color: '#b00', border: '1px solid #e6b3b3', borderRadius: 3, padding: '0 5px' }}>集計対象外</span>}
      </div>

      {open && (
        <div style={{ padding: '4px 18px 14px', fontFamily: fontJP }}>
          {/* 納品名の上書き＋集計チェック */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ minWidth: 240, flex: '1 1 240px' }}>
              <div style={labelStyle}>納品名（自動：案件名_視点名。空欄で自動、入力で上書き）</div>
              <input value={group.deliveryNameOverride || ''} placeholder={base || '（自動）'}
                onChange={(e) => update({ deliveryNameOverride: e.target.value })}
                style={{ ...inputBase, width: '100%', fontSize: 12 }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, cursor: 'pointer', paddingBottom: 3 }}
              title="売上などの『納品パース』集計に含めるか">
              <input type="checkbox" checked={countAs} onChange={(e) => update({ countAsDelivery: e.target.checked })} />
              納品パースとして集計する
            </label>
          </div>

          {/* ステップごとの請求情報（種類・依頼日・金額・外注・納品名）。請求はステップが唯一の元データ。 */}
          <div style={{ ...labelStyle, fontSize: 10.5, marginBottom: 4 }}>
            ステップごとの請求（種類・依頼日・金額・外注。金額や外注VNDを入力すると売上登録表へ自動連携されます。ステップの追加・削除は「ステップ追加／視点編集」で行います）
          </div>
          {steps.length === 0 ? (
            <div style={{ fontSize: 11, color: colors.textMute, padding: '4px 0 8px' }}>ステップがありません。</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {steps.map(t => {
                const rawType = (t.stepRoundType || '').trim();
                const rt = rawType ? roundTypeOf(rawType) : null;
                const autoName = stepDeliveryName(base, t.stepDeliverySuffix || t.stepName);
                return (
                  <div key={t.id} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4, padding: '6px 8px' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: rt ? '#fff' : colors.textMute, background: rt ? rt.color : '#eee', borderRadius: 8, padding: '2px 7px', alignSelf: 'center' }} title={t.stepName || ''}>{rt ? rt.short : '—'}</span>
                    <div>
                      <div style={labelStyle}>種類</div>
                      <select value={rawType} onChange={(e) => updateStep(t, { stepRoundType: e.target.value })} style={{ ...inputBase, cursor: 'pointer' }}>
                        <option value="">—（納品に数えない）</option>
                        {ROUND_TYPES.map(rtype => <option key={rtype.id} value={rtype.id}>{rtype.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={labelStyle}>依頼日</div>
                      <input type="date" value={t.stepRequestDate || ''} onChange={(e) => updateStep(t, { stepRequestDate: e.target.value })} style={{ ...inputBase, cursor: 'pointer' }} />
                    </div>
                    {/* 金額はオフショア案件のみ。ラボ案件は合計金額が別途決まっているため0（欄なし） */}
                    {isOffshore && (
                    <div>
                      <div style={labelStyle}>金額（円・税抜）</div>
                      <input value={t.stepAmount ?? ''} inputMode="numeric" placeholder="0" onChange={(e) => updateStep(t, { stepAmount: e.target.value })} style={{ ...inputBase, width: 90, textAlign: 'right' }} />
                    </div>
                    )}
                    <div>
                      <div style={labelStyle}>社内外注者</div>
                      <input value={t.stepOutInHouse || ''} onChange={(e) => updateStep(t, { stepOutInHouse: e.target.value })} style={{ ...inputBase, width: 90 }} />
                    </div>
                    <div>
                      <div style={labelStyle}>社外外注者</div>
                      <input value={t.stepOutExternal || ''} onChange={(e) => updateStep(t, { stepOutExternal: e.target.value })} style={{ ...inputBase, width: 90 }} />
                    </div>
                    <div>
                      <div style={labelStyle}>外注金額(VND)</div>
                      <input value={t.stepOutVND ?? ''} inputMode="numeric" placeholder="0" onChange={(e) => updateStep(t, { stepOutVND: e.target.value })} style={{ ...inputBase, width: 100, textAlign: 'right' }} />
                    </div>
                    <div style={{ flex: '1 1 120px', minWidth: 100 }}>
                      <div style={labelStyle}>納品名 / メモ</div>
                      <input value={t.stepDeliveryNameOverride || ''} placeholder={autoName} onChange={(e) => updateStep(t, { stepDeliveryNameOverride: e.target.value })} style={{ ...inputBase, width: '100%' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 帳票連携 */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {isOffshore && createBillingFromViewpoint && (
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => createBillingFromViewpoint(group, 'estimate')}
                  style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', background: '#fff', border: '1px solid #3a7bd5', borderRadius: 3, cursor: 'pointer', fontFamily: fontJP, fontSize: 11, color: '#3a7bd5', fontWeight: 600 }}>
                  <FileText size={11} />見積作成
                </button>
                <button type="button" onClick={() => createBillingFromViewpoint(group, 'order')}
                  style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', background: '#fff', border: '1px solid #3a7bd5', borderRadius: 3, cursor: 'pointer', fontFamily: fontJP, fontSize: 11, color: '#3a7bd5', fontWeight: 600 }}>
                  <FileText size={11} />発注作成
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ViewpointCard({ group, allSortedIds, companyFirstIds, companyLastIds }) {
  const {
    colors, fontJP, now, caseEditMode, assigneeList, offshoreCompanies,
    handleEdit, handleEditViewpoint, handleDeleteViewpoint, handleDelete, toggleStatus,
    moveUp, moveDown, changePriority, dragTaskId, onDragTask, onDropTask, addProgress,
    setTaskHours, setTaskCompletedHours, setTaskManualStart, setTaskManualEnd, setTaskAssignee,
    completeViewpoint, handleAddStepToViewpoint, reassignViewpoint, setViewpointDeadline,
    promptDialog,
  } = useApp();
  const projectColor = getProjectColor(group.projectName);
  const progressPct = group.totalHours > 0 ? (group.completedHours / group.totalHours) * 100 : 0;
  // 経過進捗（時間経過ベース・表示用）
  const elapsedHours = now ? group.tasks.reduce((s, t) => s + elapsedHoursForSlots(t.slots, now), 0) : 0;
  // 実働（制作時間）＝完了済み＋時間経過。残時間はこれを差し引く。
  const workedHours = Math.min(group.totalHours, group.completedHours + elapsedHours);
  const remainingHours = Math.max(0, group.totalHours - group.completedHours - elapsedHours);
  const elapsedPct = group.totalHours > 0 ? Math.min(100, (workedHours / group.totalHours) * 100) : 0;
  const isMulti = group.tasks.some(t => t.stepName);

  const handleAssigneeChange = async (val) => {
    if (val === '__new__') {
      const name = await promptDialog({ title: '担当者の変更', message: '振り分け先の担当者名を入力してください' });
      if (name && name.trim()) reassignViewpoint(group, name.trim());
    } else if (val && val !== group.assignee) {
      reassignViewpoint(group, val);
    }
  };
  const otherAssignees = (assigneeList || []).filter(a => a && a !== group.assignee);

  return (
    <div style={{
      background: '#fff', border: `1px solid ${colors.border}`,
      borderRadius: 6, overflow: 'hidden',
    }}>
      {/* 視点ヘッダー */}
      <div style={{
        background: '#fbf9f4', padding: '14px 18px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        <div style={{ width: 5, alignSelf: 'stretch', background: projectColor, borderRadius: 2 }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          {/* 案件コード（社内案件名）· 視点名 を主表示（同サイズ・大きめ） */}
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>
            {group.projectNameInternal || group.projectName}
            <span style={{ color: colors.textMute, fontWeight: 400, margin: '0 8px' }}>／</span>
            {group.viewpointName}
            {group.viewpointCategory && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: group.viewpointCategory === '外観' ? '#3a7bd5' : '#7a8471', borderRadius: 10, padding: '1px 7px', marginLeft: 8, verticalAlign: 'middle' }}>{group.viewpointCategory}</span>
            )}
            {group.viewpointNameExternal && (
              <span style={{ fontSize: 11, color: colors.textMute, fontWeight: 400, marginLeft: 8 }}>（社外: {group.viewpointNameExternal}）</span>
            )}
          </div>
          {group.projectNameInternal && group.projectName && (
            <div style={{ fontSize: 11, color: colors.textMute, marginBottom: 4 }}>
              {group.projectName}
            </div>
          )}
          <div style={{ fontSize: 11, color: colors.textMute, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {group.companyName && (
              <span style={{
                fontSize: 10, fontWeight: 600, color: '#fff',
                background: getProjectColor(group.companyName), borderRadius: 10,
                padding: '1px 8px',
              }}>{group.companyName}</span>
            )}
            {group.customerContact && <span>担当: {group.customerContact}</span>}
            <span style={{ color: '#9c8e5e' }}>制作時間 {fmtHM(workedHours)} / 制作予定時間 {fmtHM(group.totalHours)}</span>
            <span>完了 {fmtHM(group.completedHours)}</span>
            <span style={{ color: colors.accent, fontWeight: 600 }}>残 {fmtHM(remainingHours)}</span>
            {group.scheduledStart && (
              <span style={{ color: colors.accent, fontWeight: 500 }}>
                {fmtMD(group.scheduledStart)} {minToTime(group.scheduledStartMin)} 〜 {fmtMD(group.scheduledEnd)} {minToTime(group.scheduledEndMin)}
              </span>
            )}
            {(() => {
              const todayYmd = fmtYMD(new Date());
              const endYmd = group.scheduledEnd ? fmtYMD(group.scheduledEnd) : null;
              // 実効納期＝個別＞全体（group.deadline は集約済み）。危険判定は実効で行う
              const danger = !caseEditMode && group.deadline && (todayYmd > group.deadline || (endYmd && endYmd > group.deadline));
              const indiv = group.individualDeadline || '';
              const proj = group.projectDeadline || '';
              const inherited = !indiv && !!proj; // 個別なし＝全体納期を継承
              const dl = group.deadline ? new Date(group.deadline + 'T00:00:00') : null;
              // 読み取り専用フォールバック（ハンドラ未配線時）
              if (!setViewpointDeadline) {
                if (!group.deadline) return null;
                return (
                  <span title={danger ? 'この視点の納期を過ぎている、または終了予定が納期を超えています' : 'この視点の納期'} style={{
                    fontSize: 10, fontWeight: 700,
                    color: danger ? '#fff' : '#7a8471',
                    background: danger ? '#c1272d' : '#eef2ea',
                    border: danger ? 'none' : '1px solid #c9d4c2',
                    borderRadius: 2, padding: '1px 7px',
                  }}>納期 {fmtMD(dl)}（{dayName(dl)}）{danger ? ' ⚠' : ''}</span>
                );
              }
              return (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  title="この視点の個別納期。空にすると全体納期（案件共通）に従います。変更は視点内の全ステップに即反映されます">
                  <span style={{ fontSize: 10, fontWeight: 700, color: danger ? '#c1272d' : '#7a8471' }}>納期（個別）{danger ? ' ⚠' : ''}</span>
                  <input type="date" value={indiv}
                    onChange={(e) => setViewpointDeadline(group, e.target.value)}
                    style={{
                      fontFamily: fontJP, fontSize: 11, padding: '2px 4px',
                      border: `1px solid ${danger ? '#c1272d' : '#c9d4c2'}`, borderRadius: 2,
                      background: danger ? '#fbeaea' : '#eef2ea',
                      color: danger ? '#c1272d' : '#5a6a51', cursor: 'pointer',
                    }} />
                  {indiv && (
                    <button type="button" title="個別納期をクリア（全体納期に従う）"
                      onClick={() => setViewpointDeadline(group, '')}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMute, padding: 0, display: 'flex', alignItems: 'center' }}>
                      <X size={11} />
                    </button>
                  )}
                  {inherited && dl && (
                    <span style={{ fontSize: 10, color: danger ? '#c1272d' : colors.textMute }}>
                      全体 {fmtMD(dl)}（{dayName(dl)}）を適用中
                    </span>
                  )}
                </span>
              );
            })()}
          </div>
          {/* 進捗バー：経過進捗（薄色）の上に実績（濃色）を重ねる */}
          <div style={{ position: 'relative', height: 5, background: '#f0ebde', borderRadius: 2, overflow: 'hidden', marginTop: 6, maxWidth: 360 }}>
            <div style={{ position: 'absolute', inset: 0, width: `${elapsedPct}%`, background: '#d8cfa6', transition: 'width 0.3s' }} title={`制作時間 ${fmtHM(workedHours)}`} />
            <div style={{ position: 'absolute', inset: 0, width: `${progressPct}%`, background: colors.progress, transition: 'width 0.3s' }} title={`完了 ${group.completedHours}h`} />
          </div>
        </div>

        {/* 担当者の振り分けドロップダウン */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <User size={13} color={colors.textMute} />
          <select value={group.assignee}
            onChange={(e) => handleAssigneeChange(e.target.value)}
            style={{
              padding: '6px 8px', border: `1px solid ${colors.border}`, borderRadius: 3,
              fontFamily: fontJP, fontSize: 12, background: '#fff', color: colors.text,
              cursor: 'pointer', maxWidth: 130,
            }}
            title="担当者を変更（視点内のステップ全体を振り分け）">
            <option value={group.assignee}>{group.assignee}</option>
            {otherAssignees.map(a => <option key={a} value={a}>{a}</option>)}
            <option value="__new__">＋ 新しい担当者…</option>
          </select>
        </div>

        {handleEditViewpoint && (
          <button onClick={() => handleEditViewpoint(group)}
            style={{
              background: '#fff', border: `1px solid ${colors.border}`,
              padding: '6px 10px', borderRadius: 3, cursor: 'pointer',
              fontFamily: fontJP, fontSize: 11, color: colors.textMute,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
            title="この視点を編集（視点名・担当者・ステップを一括編集）">
            <Edit2 size={12} /> 視点編集
          </button>
        )}
        <button onClick={() => handleAddStepToViewpoint(group)}
          style={{
            background: '#fff', border: `1px solid ${colors.border}`,
            padding: '6px 10px', borderRadius: 3, cursor: 'pointer',
            fontFamily: fontJP, fontSize: 11, color: colors.textMute,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
          title="この視点に新しいステップを追加">
          <Plus size={12} /> ステップ追加
        </button>
        {completeViewpoint && (
          <button onClick={() => completeViewpoint(group)}
            style={{
              background: colors.progress, color: '#fff',
              border: 'none', borderRadius: 3, padding: '6px 12px',
              cursor: 'pointer', fontFamily: fontJP, fontSize: 11, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
            title="この視点の未完了タスクを全て完了にする">
            <CheckCircle2 size={13} /> 視点完了
          </button>
        )}
        {handleDeleteViewpoint && (
          <button onClick={() => handleDeleteViewpoint(group)}
            style={{
              background: '#fff', border: `1px solid ${colors.accent}`,
              padding: '6px 10px', borderRadius: 3, cursor: 'pointer',
              fontFamily: fontJP, fontSize: 11, color: colors.accent, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
            title="この視点とぶら下がる全ステップを削除（取り消せません）">
            <Trash2 size={12} /> 視点削除
          </button>
        )}
      </div>

      {/* 制作・納品パネル（納品名・制作履歴・金額・外注） */}
      <ViewpointMetaPanel group={group}
        isOffshore={!!offshoreCompanies && offshoreCompanies.has(group.companyName || '')} />

      {/* ステップリスト */}
      {group.tasks.map((task, idx) => {
        const globalIdx = allSortedIds.indexOf(task.id);
        return (
          <StepRow key={task.id} task={task} now={now}
            showStepLabel={isMulti}
            onEdit={() => handleEdit(task)} onDelete={() => handleDelete(task.id)} onToggle={() => toggleStatus(task.id)}
            onMoveUp={() => moveUp(task.id)} onMoveDown={() => moveDown(task.id)}
            onChangePriority={(v) => changePriority(task.id, v)}
            dragTaskId={dragTaskId} onDragTask={onDragTask} onDropTask={onDropTask}
            onAddProgress={(d) => addProgress(task.id, d)}
            onSetHours={(h) => setTaskHours(task.id, h)}
            onSetCompletedHours={(c) => setTaskCompletedHours(task.id, c)}
            onSetManualStart={setTaskManualStart ? ((v) => setTaskManualStart(task.id, v)) : null}
            onSetManualEnd={setTaskManualEnd ? ((v) => setTaskManualEnd(task.id, v)) : null}
            onSetAssignee={setTaskAssignee ? ((a) => setTaskAssignee(task.id, a)) : null}
            assigneeList={assigneeList}
            canMoveUp={companyFirstIds ? !companyFirstIds.has(task.id) : globalIdx > 0}
            canMoveDown={companyLastIds ? !companyLastIds.has(task.id) : globalIdx < allSortedIds.length - 1}
            isLast={idx === group.tasks.length - 1}
            colors={colors} fontJP={fontJP} />
        );
      })}
    </div>
  );
}

function StepRow({ task, now, showStepLabel, onEdit, onDelete, onToggle, onMoveUp, onMoveDown, onChangePriority, dragTaskId, onDragTask, onDropTask, onAddProgress, onSetHours, onSetCompletedHours, onSetManualStart, onSetManualEnd, onSetAssignee, assigneeList, canMoveUp, canMoveDown, isLast, colors, fontJP }) {
  const { notify, promptDialog, confirmDialog } = useApp();
  const [editingPriority, setEditingPriority] = useState(false);
  const [priorityInput, setPriorityInput] = useState(String(task.priority));
  const [dragHover, setDragHover] = useState(false);
  const [editingStart, setEditingStart] = useState(false);
  const [startInput, setStartInput] = useState('');
  const [editingEnd, setEditingEnd] = useState(false);
  const [endInput, setEndInput] = useState('');
  const [customHours, setCustomHours] = useState('');
  const [editingTotalHours, setEditingTotalHours] = useState(false);
  const [editingCompletedHours, setEditingCompletedHours] = useState(false);
  const [totalHoursInput, setTotalHoursInput] = useState(fmtHM(task.hours));
  const [completedHoursInput, setCompletedHoursInput] = useState(fmtHM(task.completedHours || 0));
  const [copiedDelivery, setCopiedDelivery] = useState(''); // コピー済みフィードバック（コピーした文字列）
  useEffect(() => { setPriorityInput(String(task.priority)); }, [task.priority]);
  useEffect(() => { setTotalHoursInput(fmtHM(task.hours)); }, [task.hours]);
  useEffect(() => { setCompletedHoursInput(fmtHM(task.completedHours || 0)); }, [task.completedHours]);

  const commitCustomHours = () => {
    const v = parseHM(customHours);
    if (!isNaN(v) && v !== 0) onAddProgress(v);
    setCustomHours('');
  };

  const commitPriority = () => {
    setEditingPriority(false);
    if (priorityInput && priorityInput !== String(task.priority)) onChangePriority(priorityInput);
  };

  const commitTotalHours = () => {
    setEditingTotalHours(false);
    const v = parseHM(totalHoursInput);
    if (!isNaN(v) && v >= 0 && v !== task.hours && onSetHours) onSetHours(v);
    else setTotalHoursInput(fmtHM(task.hours));
  };

  const commitCompletedHours = () => {
    setEditingCompletedHours(false);
    const v = parseHM(completedHoursInput);
    if (!isNaN(v) && v >= 0 && v !== (task.completedHours || 0) && onSetCompletedHours) onSetCompletedHours(v);
    else setCompletedHoursInput(fmtHM(task.completedHours || 0));
  };

  // 納品名をクリップボードへコピー（クリックで使う）
  const copyDelivery = async (text) => {
    const t = (text || '').trim();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      setCopiedDelivery(t);
      setTimeout(() => setCopiedDelivery(c => (c === t ? '' : c)), 1500);
    } catch (e) { notify('コピーに失敗しました: ' + e, { type: 'error' }); }
  };

  // 開始時間指定の編集を開始（既定値：現在の指定 → 無ければ現在のスケジュール開始）
  const openStartEditor = () => {
    let init = task.manualStart || '';
    if (!init && task.scheduledStart) {
      init = dateToDtLocal(new Date(startOfDay(task.scheduledStart).getTime() + (task.scheduledStartMin || 0) * 60000));
    }
    setStartInput(init);
    setEditingStart(true);
  };
  const commitStart = () => {
    setEditingStart(false);
    if (!onSetManualStart) return;
    if ((startInput || '') !== (task.manualStart || '')) onSetManualStart(startInput || '');
  };

  // 終了予定指定の編集を開始（既定値：現在の指定 → 無ければ現在のスケジュール終了）
  const openEndEditor = () => {
    let init = task.manualEnd || '';
    if (!init && task.scheduledEnd) {
      init = dateToDtLocal(new Date(startOfDay(task.scheduledEnd).getTime() + (task.scheduledEndMin || 0) * 60000));
    }
    setEndInput(init);
    setEditingEnd(true);
  };
  const commitEnd = () => {
    setEditingEnd(false);
    if (!onSetManualEnd) return;
    if ((endInput || '') !== (task.manualEnd || '')) onSetManualEnd(endInput || '');
  };

  const completed = task.completedHours || 0;
  const elapsed = now ? elapsedHoursForSlots(task.slots, now) : 0;
  // 実働（制作時間）＝完了済み入力＋時間経過ぶんの自動進捗。残時間・納期はこれを差し引く。
  const worked = Math.min(task.hours, completed + elapsed);
  const remaining = Math.max(0, task.hours - completed - elapsed);
  const progressPct = task.hours > 0 ? Math.min(100, (completed / task.hours) * 100) : 0;
  const elapsedPct = task.hours > 0 ? Math.min(100, (worked / task.hours) * 100) : 0;
  const numStyle = {
    background: 'transparent', border: `1px dashed ${colors.border}`, color: 'inherit',
    padding: '0 6px', borderRadius: 3, cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 600,
    minWidth: 24,
  };
  const numInputStyle = {
    width: 52, padding: '1px 3px', textAlign: 'right',
    border: `1px solid ${colors.border}`, borderRadius: 3,
    fontFamily: fontJP, fontSize: 11,
  };

  const displayName = task.stepName
    ? `ステップ${(task.stepOrder ?? 0) + 1}：${task.stepName}`
    : showStepLabel ? '（ステップ未分類）' : '内容詳細';

  return (
    <div
      className="kz-row"
      onDragOver={(e) => { if (onDropTask && dragTaskId && dragTaskId !== task.id) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (!dragHover) setDragHover(true); } }}
      onDragLeave={() => { if (dragHover) setDragHover(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setDragHover(false);
        const src = e.dataTransfer.getData('text/plain') || dragTaskId;
        if (src && onDropTask) onDropTask(src, task.id);
        if (onDragTask) onDragTask(null);
      }}
      style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      padding: '12px 18px',
      borderBottom: isLast ? 'none' : `1px solid ${colors.border}`,
      background: '#fff',
      opacity: dragTaskId === task.id ? 0.5 : 1,
      boxShadow: dragHover && dragTaskId && dragTaskId !== task.id ? `0 0 0 2px ${colors.accent} inset` : 'none',
    }}>
      {onDropTask && (
        <span draggable
          onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', task.id); if (onDragTask) onDragTask(task.id); }}
          onDragEnd={() => { if (onDragTask) onDragTask(null); }}
          title="ドラッグして優先順位を変更（同じ会社内の好きな位置へ）"
          style={{ cursor: 'grab', color: colors.textMute, display: 'flex', flexShrink: 0 }}>
          <GripVertical size={13} />
        </span>
      )}
      <button onClick={onToggle}
        style={{
          width: 18, height: 18, border: `1.5px solid ${task.status === 'done' ? colors.progress : colors.border}`,
          background: task.status === 'done' ? colors.progress : 'transparent',
          borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0, flexShrink: 0, color: '#fff',
        }}
        title={task.status === 'done' ? '未完了に戻す' : '完了にする'}>
        {task.status === 'done' && <Check size={12} />}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <div className="kz-hover-reveal" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button onClick={onMoveUp} disabled={!canMoveUp} style={miniBtnStyle(colors, !canMoveUp)} title="上へ">
            <ChevronUp size={11} />
          </button>
          <button onClick={onMoveDown} disabled={!canMoveDown} style={miniBtnStyle(colors, !canMoveDown)} title="下へ">
            <ChevronDown size={11} />
          </button>
        </div>
        {editingPriority ? (
          <input type="number" min="1" value={priorityInput}
            onChange={(e) => setPriorityInput(e.target.value)} onBlur={commitPriority}
            onKeyDown={(e) => { if (e.key === 'Enter') commitPriority(); if (e.key === 'Escape') { setEditingPriority(false); setPriorityInput(String(task.priority)); } }}
            autoFocus
            style={{
              width: 40, padding: '4px 6px', textAlign: 'center',
              border: `1px solid ${priorityColor(task.priority)}`, borderRadius: 3,
              fontFamily: fontJP, fontSize: 12, fontWeight: 700, color: priorityColor(task.priority),
            }} />
        ) : (
          <button onClick={() => setEditingPriority(true)} className="kz-inline-edit"
            style={{
              background: priorityColor(task.priority), color: '#fff', border: 'none', borderRadius: 3, padding: '4px 7px',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', minWidth: 28, fontFamily: fontJP,
              display: 'inline-flex', alignItems: 'center',
            }}
            title="クリックして優先順位を直接編集">
            #{task.priority}<Edit2 size={9} className="kz-pencil" />
          </button>
        )}
      </div>

      <div style={{ flex: '1 1 200px', minWidth: 180 }}>
        {(() => {
          const vpBase = deliveryBaseName(task.projectName, task.viewpointNameExternal || task.viewpointName, task.deliveryNameOverride);
          const stepDelivery = (task.stepDeliveryNameOverride || '').trim() || stepDeliveryName(vpBase, task.stepDeliverySuffix || task.stepName);
          // 社内視点名ベースの納品名（併記用）。社外視点名が別にある場合のみ差分が出る。
          const vpBaseInternal = deliveryBaseName(task.projectName, task.viewpointName, task.deliveryNameOverride);
          const stepDeliveryInternal = (task.stepDeliveryNameOverride || '').trim() || stepDeliveryName(vpBaseInternal, task.stepDeliverySuffix || task.stepName);
          const amt = vpNum(task.stepAmount);
          const cd = task.stepCompletedDate || '';
          const cdStr = cd ? `${cd.split('T')[0]}${cd.split('T')[1] ? ' ' + cd.split('T')[1] : ''}` : '';
          return (
            <>
              {/* ステップ名 ＋ 納品名を同じ行・右横に（同じ大きさ）。狭い画面でのみ折り返す */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: task.status === 'done' ? colors.textMute : 'inherit', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                  {displayName}
                </span>
                {task.status === 'done' && <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: colors.progress, borderRadius: 8, padding: '1px 7px', textDecoration: 'none' }}>完了</span>}
                {stepDelivery && (
                  <span style={{ fontSize: 13 }} title="納品名（社外視点名ベース／社内視点名ベースを併記）">
                    納品名:{' '}
                    <button type="button" onClick={() => copyDelivery(stepDelivery)}
                      title="クリックでコピー"
                      style={{ background: 'transparent', border: 'none', padding: 0, margin: 0, font: 'inherit', color: '#9c7b3c', fontWeight: 600, cursor: 'pointer' }}>
                      {stepDelivery}
                    </button>
                    {stepDeliveryInternal && stepDeliveryInternal !== stepDelivery && (
                      <>
                        <span style={{ color: colors.textMute }}> ／ </span>
                        <button type="button" onClick={() => copyDelivery(stepDeliveryInternal)}
                          title="クリックでコピー（社内視点名ベース）"
                          style={{ background: 'transparent', border: 'none', padding: 0, margin: 0, font: 'inherit', color: colors.textMute, cursor: 'pointer' }}>
                          {stepDeliveryInternal}
                        </button>
                      </>
                    )}
                    {copiedDelivery && (copiedDelivery === stepDelivery || copiedDelivery === stepDeliveryInternal) && (
                      <span style={{ color: colors.progress, fontWeight: 600, marginLeft: 6 }}>✓ コピーしました</span>
                    )}
                  </span>
                )}
              </div>
              {(task.stepRequestDate || cdStr || amt > 0) && (
                <div style={{ fontSize: 10.5, color: colors.textMute, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                  {task.stepRequestDate && <span>依頼 {task.stepRequestDate}</span>}
                  {cdStr && <span>完了 {cdStr}</span>}
                  {amt > 0 && <span style={{ color: '#3a7bd5', fontWeight: 600 }}>¥{Math.round(amt).toLocaleString('ja-JP')}</span>}
                </div>
              )}
            </>
          );
        })()}
        <div style={{ fontSize: 11, color: colors.textMute, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
          {onSetAssignee && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
              title="このステップの担当者を変更（このステップだけ別の担当者へ。担当者ごとに視点カードが分かれます）">
              <User size={11} />
              <select value={task.assignee || ''}
                onChange={async (e) => {
                  const v = e.target.value;
                  if (v === '__new__') {
                    const name = await promptDialog({ title: '担当者の変更', message: '担当者名を入力してください' });
                    if (name && name.trim()) onSetAssignee(name.trim());
                  } else if (v && v !== task.assignee) {
                    onSetAssignee(v);
                  }
                }}
                style={{ padding: '1px 4px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 11, background: '#fff', color: colors.text, cursor: 'pointer', maxWidth: 120 }}>
                <option value={task.assignee}>{task.assignee || '（担当者未設定）'}</option>
                {(assigneeList || []).filter(a => a && a !== task.assignee).map(a => <option key={a} value={a}>{a}</option>)}
                <option value="__new__">＋ 新しい担当者…</option>
              </select>
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Clock size={11} style={{ marginRight: 2 }} />
            {editingCompletedHours ? (
              <input type="text" inputMode="numeric" value={completedHoursInput}
                onChange={(e) => setCompletedHoursInput(e.target.value)}
                onBlur={commitCompletedHours}
                onKeyDown={(e) => { if (e.key === 'Enter') commitCompletedHours(); if (e.key === 'Escape') { setEditingCompletedHours(false); setCompletedHoursInput(fmtHM(task.completedHours || 0)); } }}
                autoFocus style={numInputStyle} />
            ) : (
              <button type="button" onClick={() => setEditingCompletedHours(true)} className="kz-inline-edit"
                style={{ ...numStyle, display: 'inline-flex', alignItems: 'center' }} title="クリックで完了済み時間を編集（HH:MM）">
                {fmtHM(completed)}<Edit2 size={9} className="kz-pencil" />
              </button>
            )}
            /
            {editingTotalHours ? (
              <input type="text" inputMode="numeric" value={totalHoursInput}
                onChange={(e) => setTotalHoursInput(e.target.value)}
                onBlur={commitTotalHours}
                onKeyDown={(e) => { if (e.key === 'Enter') commitTotalHours(); if (e.key === 'Escape') { setEditingTotalHours(false); setTotalHoursInput(fmtHM(task.hours)); } }}
                autoFocus style={numInputStyle} />
            ) : (
              <button type="button" onClick={() => setEditingTotalHours(true)} className="kz-inline-edit"
                style={{ ...numStyle, display: 'inline-flex', alignItems: 'center' }} title="クリックで制作予定時間を編集（HH:MM）">
                {fmtHM(task.hours)}<Edit2 size={9} className="kz-pencil" />
              </button>
            )}
            {remaining > 0 && <span style={{ color: colors.accent, fontWeight: 600, marginLeft: 4 }}>残 {fmtHM(remaining)}</span>}
          </span>
          <span style={{ color: '#9c8e5e' }} title="完了済み＋時間経過ベースの自動進捗">制作時間 {fmtHM(worked)} / 制作予定時間 {fmtHM(task.hours)}</span>
          {task.scheduledStart && (
            <span style={{ color: colors.accent, fontWeight: 500 }}>
              {fmtMD(task.scheduledStart)} {minToTime(task.scheduledStartMin)}
              {!isSameDay(task.scheduledStart, task.scheduledEnd)
                ? ` 〜 ${fmtMD(task.scheduledEnd)} ${minToTime(task.scheduledEndMin)}`
                : ` 〜 ${minToTime(task.scheduledEndMin)}`}
            </span>
          )}
          {editingStart ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <DateTimeField value={startInput} onChange={setStartInput} defaultTime="08:00" compact colors={colors} fontJP={fontJP} />
              <button type="button" onClick={commitStart}
                style={{ background: colors.text, color: '#fff', border: 'none', borderRadius: 3, padding: '2px 8px', fontSize: 10, cursor: 'pointer', fontFamily: fontJP, fontWeight: 600 }}>
                確定
              </button>
              <button type="button" onClick={() => { setStartInput(''); setEditingStart(false); if (onSetManualStart && task.manualStart) onSetManualStart(''); }}
                style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '2px 6px', fontSize: 10, color: colors.textMute, cursor: 'pointer', fontFamily: fontJP }}>
                解除
              </button>
            </span>
          ) : task.manualStart ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '1px 5px', background: '#fce8e8', color: colors.accent, borderRadius: 2 }}>
              <button type="button" onClick={onSetManualStart ? openStartEditor : undefined}
                title="クリックで開始時間指定を変更（自動スケジュールより優先）"
                style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit', fontSize: 'inherit', fontFamily: fontJP, cursor: onSetManualStart ? 'pointer' : 'default', fontWeight: 600 }}>
                開始指定 {(() => { const d = new Date(task.manualStart); return isNaN(d.getTime()) ? task.manualStart : `${d.getMonth() + 1}/${d.getDate()} ${minToTime(d.getHours() * 60 + d.getMinutes())}`; })()}
              </button>
              {onSetManualStart && (
                <button type="button" onClick={() => onSetManualStart('')}
                  title="開始時間指定を解除（自動スケジュールに戻す）"
                  style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', fontSize: 11, lineHeight: 1 }}>
                  ×
                </button>
              )}
            </span>
          ) : onSetManualStart ? (
            <button type="button" onClick={openStartEditor}
              title="このステップの開始時間を指定（自動スケジュールより優先・登録/解除可能）"
              style={{ background: 'transparent', border: `1px dashed ${colors.border}`, borderRadius: 2, padding: '1px 5px', fontSize: 10, color: colors.textMute, cursor: 'pointer', fontFamily: fontJP }}>
              ＋開始指定
            </button>
          ) : null}
          {onSetManualStart && (
            <button type="button"
              onClick={async () => {
                if (await confirmDialog({ title: '今から割り込み', message: 'この工程を「今」から開始（割り込み）します。\n同じ担当者で作業中の案件は、現在時刻の前後に自動で分割されます。よろしいですか？', confirmLabel: '割り込み開始' })) {
                  onSetManualStart(dateToDtLocal(new Date()));
                }
              }}
              title="現在時刻を開始時間に設定して割り込み開始（作業中の案件は前半・後半に自動分割される）"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: colors.accentSoft, border: `1px solid ${colors.accent}`, borderRadius: 2, padding: '1px 6px', fontSize: 10, color: colors.accent, cursor: 'pointer', fontFamily: fontJP, fontWeight: 600 }}>
              <Zap size={10} /> 今から割り込み
            </button>
          )}
          {editingEnd ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <DateTimeField value={endInput} onChange={setEndInput} defaultTime="17:00" compact colors={colors} fontJP={fontJP} />
              <button type="button" onClick={commitEnd}
                style={{ background: colors.text, color: '#fff', border: 'none', borderRadius: 3, padding: '2px 8px', fontSize: 10, cursor: 'pointer', fontFamily: fontJP, fontWeight: 600 }}>
                確定
              </button>
              <button type="button" onClick={() => { setEndInput(''); setEditingEnd(false); if (onSetManualEnd && task.manualEnd) onSetManualEnd(''); }}
                style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '2px 6px', fontSize: 10, color: colors.textMute, cursor: 'pointer', fontFamily: fontJP }}>
                解除
              </button>
            </span>
          ) : task.manualEnd ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '1px 5px', background: '#e8eefc', color: '#4a6da8', borderRadius: 2 }}>
              <button type="button" onClick={onSetManualEnd ? openEndEditor : undefined}
                title="クリックで終了予定の指定を変更（同じ担当者の次のタスクはこの時刻以降に開始）"
                style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit', fontSize: 'inherit', fontFamily: fontJP, cursor: onSetManualEnd ? 'pointer' : 'default', fontWeight: 600 }}>
                終了指定 {(() => { const d = new Date(task.manualEnd); return isNaN(d.getTime()) ? task.manualEnd : `${d.getMonth() + 1}/${d.getDate()} ${minToTime(d.getHours() * 60 + d.getMinutes())}`; })()}
              </button>
              {onSetManualEnd && (
                <button type="button" onClick={() => onSetManualEnd('')}
                  title="終了予定の指定を解除（自動スケジュールに戻す）"
                  style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', fontSize: 11, lineHeight: 1 }}>
                  ×
                </button>
              )}
            </span>
          ) : onSetManualEnd ? (
            <button type="button" onClick={openEndEditor}
              title="このステップの終了予定を指定（同じ担当者の次のタスクはこの時刻以降に開始・登録/解除可能）"
              style={{ background: 'transparent', border: `1px dashed ${colors.border}`, borderRadius: 2, padding: '1px 5px', fontSize: 10, color: colors.textMute, cursor: 'pointer', fontFamily: fontJP }}>
              ＋終了指定
            </button>
          ) : null}
          {task.delays && task.delays.length > 0 && (
            <span title={`遅延 ${task.delays.length}回`} style={{ fontSize: 10, padding: '1px 5px', background: '#fde0c8', color: '#9a5a12', borderRadius: 2, fontWeight: 600 }}>
              遅延履歴あり（{task.delays.length}）
            </span>
          )}
        </div>
        <div style={{ position: 'relative', height: 5, background: '#f0ebde', borderRadius: 2, overflow: 'hidden', maxWidth: 280 }}>
          <div style={{ position: 'absolute', inset: 0, width: `${elapsedPct}%`, background: '#d8cfa6', transition: 'width 0.3s' }} title={`制作時間 ${fmtHM(worked)}`} />
          <div style={{ position: 'absolute', inset: 0, width: `${progressPct}%`, background: colors.progress, transition: 'width 0.3s' }} title={`完了 ${fmtHM(completed)}`} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <button onClick={() => onAddProgress(0.5)} style={progressBtnStyle(colors, fontJP)} title="完了済みに0.5h追加">+0.5h</button>
        <button onClick={() => onAddProgress(1)} style={progressBtnStyle(colors, fontJP)} title="完了済みに1h追加">+1h</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <input type="text" inputMode="numeric" value={customHours}
          onChange={(e) => setCustomHours(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commitCustomHours(); }}
          placeholder="HH:MM"
          title="進めた時間（HH:MM 例 00:30）を入力してEnter / 追加"
          style={{
            width: 52, padding: '4px 5px', textAlign: 'right',
            border: `1px solid ${colors.border}`, borderRadius: 3,
            fontFamily: fontJP, fontSize: 11,
          }} />
        <button onClick={commitCustomHours} style={progressBtnStyle(colors, fontJP)} title="入力した時間を完了済みに加算">追加</button>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {/* ステップ単体の編集は「視点編集」に統合（視点編集で各ステップを一括編集できる） */}
        <button onClick={onDelete} className="kz-hover-reveal" style={iconBtnStyle(colors)} title="削除（直後なら「元に戻す」で復元可）"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

export { ViewpointGroupList, ViewpointMetaPanel, ViewpointCard, StepRow };
