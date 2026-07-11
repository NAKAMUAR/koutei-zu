// カレンダービュー（担当者×日付のスケジュール表）。App.jsx から分割。
import { useState, useRef, useLayoutEffect } from 'react';
import { addDays, dayName, fmtMD, fmtYMD, fmtYMDJP, getDailySlots, getHoursPerDay, getProjectColor, isNonWorkingDay, isSameDay, minToTime, pastelize, priorityColor, startOfDay } from '../lib/utils.js';
import { buildDoneSlots, computeFreeHours, dayAbsence, dayOvertimeIntervals, dayWorkSlots, maxOvertimeEndMin, sortAssigneesByMaster, subtractBusy } from '../lib/schedule.js';
import { Calendar as CalIcon, GripVertical } from 'lucide-react';
import { tabStyle } from '../components/common.jsx';


// ============ カレンダービュー ============
function CalendarView({ scheduled, settings, now, colors, fontDisplay, onEditProject, fontJP, assigneeOrder, onReorderAssignee, onReorderProject, onReassignViewpoint }) {
  // ドラッグ＆ドロップ並び替え：担当者行（左端ラベル）と案件（タスクブロック）
  const [rowDrag, setRowDrag] = useState(null);
  const [rowDragOver, setRowDragOver] = useState(null);
  const [projDrag, setProjDrag] = useState(null);
  // 視点ブロックを別の担当者の行（ラベル）へドロップして担当者を付け替える
  const [vpDrag, setVpDrag] = useState(null); // { projectName, viewpointName, assignee }
  // 担当者ラベルセルのドラッグ＆ドロップ props（表示順の入れ替え＋視点の担当者付け替え）を共通化
  const labelActive = (assignee) => rowDragOver === assignee &&
    ((rowDrag && rowDrag !== assignee) || (vpDrag && vpDrag.assignee !== assignee && !!onReassignViewpoint));
  const labelDnD = (assignee) => ({
    draggable: !!onReorderAssignee,
    onDragStart: onReorderAssignee ? ((e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', assignee); setRowDrag(assignee); }) : undefined,
    onDragEnd: () => { setRowDrag(null); setRowDragOver(null); setVpDrag(null); },
    onDragOver: (e) => {
      const canRow = rowDrag && rowDrag !== assignee && onReorderAssignee;
      const canVp = vpDrag && vpDrag.assignee !== assignee && onReassignViewpoint;
      if (canRow || canVp) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (rowDragOver !== assignee) setRowDragOver(assignee); }
    },
    onDragLeave: () => { if (rowDragOver === assignee) setRowDragOver(null); },
    onDrop: (e) => {
      e.preventDefault();
      if (vpDrag && vpDrag.assignee !== assignee && onReassignViewpoint) {
        onReassignViewpoint(vpDrag.projectName, vpDrag.viewpointName, vpDrag.assignee, assignee);
      } else if (rowDrag && rowDrag !== assignee && onReorderAssignee) {
        onReorderAssignee(rowDrag, assignee);
      }
      setRowDrag(null); setRowDragOver(null); setVpDrag(null);
    },
    title: onReassignViewpoint
      ? '案件ブロックをここ（担当者名）へドロップすると、その視点の担当者を変更します' + (onReorderAssignee ? '／ドラッグで担当者の表示順を変更' : '')
      : (onReorderAssignee ? 'ドラッグして担当者の表示順を変更（従業員マスタの並びに反映）' : undefined),
  });
  const today = startOfDay(new Date());
  // 表示モード：1日 / 週間 / 月間 / 全期間（従来のスクロール表示）
  const [viewMode, setViewMode] = useState('scroll');
  const [anchor, setAnchor] = useState(today);
  // 空き時間サマリー（担当者×営業日の空き h）の開閉
  const [freeOpen, setFreeOpen] = useState(false);

  // モードごとに表示する営業日の列を決める
  const allDates = [];
  if (viewMode === 'day') {
    let d = startOfDay(anchor);
    while (isNonWorkingDay(d)) d = addDays(d, 1);
    allDates.push(d);
  } else if (viewMode === 'week') {
    // 週間表示は今週から3週間分の営業日（横タイムライン形式）
    const dow = (anchor.getDay() + 6) % 7; // 月曜=0
    const mon = addDays(startOfDay(anchor), -dow);
    for (let i = 0; i < 21; i++) {
      const d = addDays(mon, i);
      if (!isNonWorkingDay(d)) allDates.push(d);
    }
  } else if (viewMode === 'month') {
    const y = anchor.getFullYear(), m = anchor.getMonth();
    for (let d = startOfDay(new Date(y, m, 1)); d.getMonth() === m; d = addDays(d, 1)) {
      if (!isNonWorkingDay(d)) allDates.push(new Date(d));
    }
  } else {
    // 全期間：過去〜未来の営業日を並べる。過去も遡って確認できるようにする。
    // 初期スクロール位置は「今日」を左端にする（下の useLayoutEffect）。左へスクロールすると過去が見える。
    const PAST_DAYS = 60; // 過去に表示する営業日数（約3か月）
    const past = [];
    let back = addDays(new Date(today), -1);
    let pcount = 0;
    while (pcount < PAST_DAYS) {
      if (!isNonWorkingDay(back)) { past.unshift(new Date(back)); pcount++; }
      back = addDays(back, -1);
    }
    for (const d of past) allDates.push(d);
    // 今日以降の営業日。
    let cursor = new Date(today);
    let count = 0;
    while (count < 72) {
      if (!isNonWorkingDay(cursor)) { allDates.push(new Date(cursor)); count++; }
      cursor = addDays(cursor, 1);
    }
  }
  const todayIndex = allDates.findIndex(d => isSameDay(d, today));
  // 全期間ビューで左端に置く列＝今日。今日が休み（土日・祝日）で一覧に無いときは
  // 「今日以降の最初の営業日」を左端にする（次の営業日を表示）。
  const leftEdgeIndex = todayIndex >= 0
    ? todayIndex
    : Math.max(0, allDates.findIndex(d => d.getTime() >= today.getTime()));

  // ナビゲーション（1日・週間・月間モード）
  const goStep = (dir) => {
    if (viewMode === 'day') {
      let d = addDays(startOfDay(anchor), dir);
      while (isNonWorkingDay(d)) d = addDays(d, dir);
      setAnchor(d);
    } else if (viewMode === 'week') {
      setAnchor(addDays(startOfDay(anchor), dir * 7));
    } else if (viewMode === 'month') {
      setAnchor(startOfDay(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1)));
    }
  };
  const rangeLabel = viewMode === 'day'
    ? `${fmtYMDJP(allDates[0])}（${dayName(allDates[0])}）`
    : viewMode === 'week'
      ? `${fmtMD(allDates[0])}（${dayName(allDates[0])}）〜 ${fmtMD(allDates[allDates.length - 1])}（${dayName(allDates[allDates.length - 1])}）`
      : viewMode === 'month'
        ? `${anchor.getFullYear()}年${anchor.getMonth() + 1}月`
        : '';

  const dailySlots = getDailySlots(settings);
  const morningSlot = dailySlots[0];
  const afternoonSlot = dailySlots[1];
  const morningHours = (morningSlot.end - morningSlot.start) / 60;
  const afternoonHours = (afternoonSlot.end - afternoonSlot.start) / 60;
  const hoursPerDay = getHoursPerDay(settings);

  const assignees = sortAssigneesByMaster([...new Set([...scheduled.active.map(t => t.assignee), ...scheduled.done.map(t => t.assignee)])], assigneeOrder);

  const matrix = {};
  for (const task of scheduled.active) {
    for (const slot of task.slots) {
      const key = fmtYMD(slot.date);
      if (!matrix[task.assignee]) matrix[task.assignee] = {};
      if (!matrix[task.assignee][key]) matrix[task.assignee][key] = [];
      matrix[task.assignee][key].push({ task, slot });
    }
  }
  // 完了タスクもグレーで表示（実終了時刻から遡って配置）。
  // ただし「当日（今日）以降」のスロットは表示しない。完了操作を当日に行うと、
  // 実終了時刻が未入力のとき完了時刻＝今日になり、当日にスライバーが残るため。
  const doneTodayStart = now ? startOfDay(now).getTime() : Infinity;
  for (const item of buildDoneSlots(scheduled.done, settings)) {
    if (item.slot.date.getTime() >= doneTodayStart) continue;
    const key = fmtYMD(item.slot.date);
    if (!matrix[item.task.assignee]) matrix[item.task.assignee] = {};
    if (!matrix[item.task.assignee][key]) matrix[item.task.assignee][key] = [];
    matrix[item.task.assignee][key].push(item);
  }
  // 各セル内のタスクは開始時刻順に
  for (const a in matrix) {
    for (const k in matrix[a]) {
      matrix[a][k].sort((x, y) => x.slot.startMin - y.slot.startMin);
    }
  }

  // 列幅：全期間=240px・週間=200px・月間=110px（横スクロール）、1日=画面幅に合わせる
  const labelWidth = 110;
  const isFlexWidth = viewMode === 'day';
  const dayCellWidth = viewMode === 'month' ? 110 : viewMode === 'week' ? 200 : 240;
  const colWidth = isFlexWidth ? `calc((100% - ${labelWidth}px) / ${allDates.length})` : dayCellWidth;
  const rowHeight = viewMode === 'day' ? 150 : 100;
  // 列が狭い月間はブロックを案件名1行のコンパクト表示にする
  const compact = viewMode === 'month';
  // 簡易表示：全期間グリッドで同一視点のステップを1ブロックに統合する（ステップの垣根なし）
  const simpleMode = viewMode === 'simple';
  // 同一案件・同一視点のスロット群を「開始～終了予定（最早～最遅）」「制作時間の合計」に統合する
  const mergeByViewpoint = (items) => {
    if (!items || items.length === 0) return items || [];
    const groups = new Map();
    for (const it of items) {
      const key = `${it.task.projectName}|${it.task.viewpointName}|${it.done ? 'd' : 'a'}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(it);
    }
    const out = [];
    for (const arr of groups.values()) {
      const startMin = Math.min(...arr.map(x => x.slot.startMin));
      const endMin = Math.max(...arr.map(x => x.slot.endMin));
      const hours = arr.reduce((s, x) => s + (x.slot.hours || 0), 0);
      const rep = arr.reduce((a, b) => ((b.task.priority ?? 999) < (a.task.priority ?? 999) ? b : a), arr[0]);
      out.push({ task: rep.task, slot: { startMin, endMin, hours }, done: rep.done });
    }
    out.sort((a, b) => a.slot.startMin - b.slot.startMin);
    return out;
  };

  // 初期スクロール位置を「今日が左端」に設定（全期間・月間のみ。モード/期間の切替時に再設定）
  // 同じモード／期間の間は一度だけ実行し、以後はユーザーのスクロール位置を尊重する。
  // 初回はタスク未ロード（担当者0件で領域未描画）のことがあるため、データ到着後に再実行できるよう
  // assignees 件数なども依存に含め、didScrollKey で「同一モード/期間で1回だけ」を担保する。
  const scrollRef = useRef(null);
  const todayCellRef = useRef(null); // 全期間/月間グリッドの「今日（または翌営業日）」列ヘッダー
  const didScrollKey = useRef('');
  // useLayoutEffect ＝ 描画前に scrollLeft を確定（タブ表示直後のチラつき防止）。
  // 実際の列位置（offsetLeft）を読むことで強制リフローし、scrollWidth 未確定でも確実に反映させる。
  // タブ切替で再マウントされた直後にも効くよう rAF でも再設定する。
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const key = `${viewMode}|${fmtYMD(anchor)}`;
    if (isFlexWidth) { el.scrollLeft = 0; didScrollKey.current = key; return; }
    if (didScrollKey.current === key) return; // この モード/期間 では設定済み
    const apply = () => {
      const cell = todayCellRef.current;
      const target = cell ? Math.max(0, cell.offsetLeft - labelWidth) : leftEdgeIndex * dayCellWidth;
      el.scrollLeft = target;
    };
    apply();
    requestAnimationFrame(apply);
    didScrollKey.current = key;
  }, [viewMode, anchor, isFlexWidth, leftEdgeIndex, dayCellWidth, allDates.length, assignees.length]);

  // 現在時刻の縦ライン位置（今日の列の中の横位置）
  let nowLineX = null;
  if (now && todayIndex >= 0 && !isNonWorkingDay(now)) {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let frac;
    if (nowMin <= morningSlot.start) frac = 0;
    else if (nowMin < morningSlot.end) frac = (nowMin - morningSlot.start) / (morningSlot.end - morningSlot.start) * 0.5;
    else if (nowMin < afternoonSlot.start) frac = 0.5;
    else if (nowMin < afternoonSlot.end) frac = 0.5 + (nowMin - afternoonSlot.start) / (afternoonSlot.end - afternoonSlot.start) * 0.5;
    else frac = 1;
    nowLineX = isFlexWidth
      ? `calc(${labelWidth}px + (100% - ${labelWidth}px) * ${(todayIndex + frac) / allDates.length})`
      : labelWidth + (todayIndex + frac) * dayCellWidth;
  }

  if (assignees.length === 0) {
    return (
      <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6, padding: 48, textAlign: 'center', color: colors.textMute }}>
        <CalIcon size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
        <div>進行中のタスクがありません</div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontFamily: fontDisplay, fontSize: 20, margin: '0 0 8px 0', fontWeight: 500 }}>
        スケジュール表
      </h2>
      <p style={{ fontSize: 12, color: colors.textMute, margin: '0 0 20px 0' }}>
        残り時間ベース ・ ステップごとに表示 ・ 1日 {hoursPerDay}h（{settings.morningStart}〜{settings.morningEnd} / {settings.afternoonStart}〜{settings.afternoonEnd}）
      </p>

      <style>{`
        .compact-scroll { scrollbar-width: thin; scrollbar-color: #cdc4a8 transparent; }
        .compact-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .compact-scroll::-webkit-scrollbar-thumb { background: #cdc4a8; border-radius: 3px; }
        .compact-scroll::-webkit-scrollbar-thumb:hover { background: #b8ad8e; }
        .compact-scroll::-webkit-scrollbar-track { background: transparent; }
        .compact-scroll::-webkit-scrollbar-corner { background: transparent; }
      `}</style>

      {/* 表示モード切替＋期間ナビゲーション */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {[['day', '1日'], ['week', '週間'], ['month', '月間'], ['scroll', '全期間'], ['simple', '簡易表示']].map(([m, label]) => (
          <button key={m} type="button"
            onClick={() => { setViewMode(m); setAnchor(today); }}
            style={tabStyle(viewMode === m, colors, fontJP)}>
            {label}
          </button>
        ))}
        {(viewMode === 'day' || viewMode === 'week' || viewMode === 'month') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => goStep(-1)}
              style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '6px 12px', cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.text }}>
              ‹ {viewMode === 'day' ? '前日' : viewMode === 'week' ? '前週' : '前月'}
            </button>
            <button type="button" onClick={() => setAnchor(today)}
              style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '6px 12px', cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.text }}>
              今日
            </button>
            <button type="button" onClick={() => goStep(1)}
              style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '6px 12px', cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.text }}>
              {viewMode === 'day' ? '翌日' : viewMode === 'week' ? '翌週' : '翌月'} ›
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginLeft: 6 }}>{rangeLabel}</span>
          </div>
        )}
        <button type="button" onClick={() => setFreeOpen(o => !o)}
          title="担当者ごとの空き時間（今後の営業日）を一覧表示します。新しい案件を誰に振れるかの判断に使えます"
          style={{ ...tabStyle(freeOpen, colors, fontJP), marginLeft: 'auto' }}>
          空き時間
        </button>
      </div>

      {/* 空き時間サマリー：担当者×営業日の空き時間（h）。休日・不在・残業枠を考慮 */}
      {freeOpen && (() => {
        const dayCount = 10;
        const fh = computeFreeHours(scheduled.active, settings, assignees, now || new Date(), dayCount);
        const cellBg = (h, cap) => {
          if (h <= 0.01) return '#f0ede5';
          const ratio = Math.min(1, h / Math.max(cap, 1));
          return `rgba(90, 140, 90, ${0.12 + ratio * 0.38})`;
        };
        const fmtH = (h) => h <= 0.01 ? '-' : (Math.round(h * 10) / 10).toString();
        return (
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 6, background: '#fff', padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
              空き時間（今後{dayCount}営業日・単位 h）
              <span style={{ fontSize: 10.5, color: colors.textMute, fontWeight: 400, marginLeft: 8 }}>
                スケジュール済みの予定・休日・不在・残業枠を反映。「-」は空きなし
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ border: `1px solid ${colors.border}`, padding: '4px 10px', background: '#f7f6f2', textAlign: 'left', minWidth: 90 }}>担当者</th>
                    {fh.days.map((d, i) => (
                      <th key={i} style={{ border: `1px solid ${colors.border}`, padding: '4px 8px', background: isSameDay(d, now || new Date()) ? '#fdf3e7' : '#f7f6f2', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {fmtMD(d)}({dayName(d)})
                      </th>
                    ))}
                    <th style={{ border: `1px solid ${colors.border}`, padding: '4px 8px', background: '#f7f6f2', fontWeight: 700 }}>合計</th>
                  </tr>
                </thead>
                <tbody>
                  {assignees.map(a => {
                    const vals = fh.byAssignee[a] || [];
                    const total = vals.reduce((s, v) => s + v, 0);
                    return (
                      <tr key={a}>
                        <td style={{ border: `1px solid ${colors.border}`, padding: '4px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}>{a}</td>
                        {vals.map((h, i) => (
                          <td key={i} style={{ border: `1px solid ${colors.border}`, padding: '4px 8px', textAlign: 'right', background: cellBg(h, hoursPerDay), fontVariantNumeric: 'tabular-nums' }}>
                            {fmtH(h)}
                          </td>
                        ))}
                        <td style={{ border: `1px solid ${colors.border}`, padding: '4px 8px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {fmtH(total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {viewMode === 'day' ? (() => {
        // 1日表示：時間が横に流れるタイムライン形式（30分刻みの時間軸 × 担当者行）
        // 残業が登録されている場合は時間軸を残業の最遅終了まで延長する
        const dayDate = allDates[0];
        const ymd = fmtYMD(dayDate);
        const dayStart = morningSlot.start, dayEnd = Math.max(afternoonSlot.end, maxOvertimeEndMin(settings));
        const totalMin = dayEnd - dayStart;
        const halfHours = [];
        for (let m = dayStart; m < dayEnd; m += 30) halfHours.push(m);
        const timeColW = `calc((100% - ${labelWidth}px) / ${halfHours.length})`;
        const rowH = 88;
        let dayNowFrac = null;
        if (now && isSameDay(dayDate, now)) {
          const nm = now.getHours() * 60 + now.getMinutes();
          if (nm >= dayStart && nm <= dayEnd) dayNowFrac = (nm - dayStart) / totalMin;
        }
        const lunchLeft = ((morningSlot.end - dayStart) / totalMin) * 100;
        const lunchWidth = ((afternoonSlot.start - morningSlot.end) / totalMin) * 100;
        return (
          <div className="compact-scroll" style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'auto' }}>
            <div style={{ minWidth: 760, position: 'relative' }}>
              {dayNowFrac != null && (
                <div title={`現在時刻 ${minToTime(now.getHours() * 60 + now.getMinutes())}`} style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: `calc(${labelWidth}px + (100% - ${labelWidth}px) * ${dayNowFrac})`,
                  width: 2, background: colors.accent, zIndex: 4, pointerEvents: 'none',
                }}>
                  <div style={{ position: 'absolute', top: 0, left: -4, width: 10, height: 10, borderRadius: '50%', background: colors.accent }} />
                </div>
              )}
              {/* 時間ヘッダー（30分刻み） */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, background: '#fbf9f4' }}>
                <div style={{
                  width: labelWidth, padding: '10px 12px', fontSize: 11, color: colors.textMute, fontWeight: 500,
                  flexShrink: 0, borderRight: `1px solid ${colors.border}`, boxSizing: 'border-box',
                  position: 'sticky', left: 0, zIndex: 3, background: '#fbf9f4',
                }}>担当</div>
                {halfHours.map((m, i) => (
                  <div key={m} style={{
                    width: timeColW, flexShrink: 0, padding: '8px 0 6px', fontSize: 10, color: colors.textMute,
                    boxSizing: 'border-box',
                    borderRight: i < halfHours.length - 1 ? `1px ${(m + 30) % 60 === 0 ? 'solid' : 'dashed'} ${colors.border}` : 'none',
                  }}>
                    <span style={{ paddingLeft: 4 }}>{minToTime(m)}</span>
                  </div>
                ))}
              </div>
              {/* 担当者行（ブロックは開始〜終了の位置に横配置） */}
              {assignees.map((assignee, ai) => {
                const items = (matrix[assignee] && matrix[assignee][ymd]) || [];
                const abs = dayAbsence(assignee, dayDate, settings.absences || []);
                const absLabel = (settings.absences || []).find(x => x && x.assignee === assignee && x.startDate <= ymd && x.endDate >= ymd && x.label)?.label || '';
                return (
                  <div key={assignee} style={{ display: 'flex', borderBottom: ai < assignees.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                    <div
                      {...labelDnD(assignee)}
                      style={{
                        width: labelWidth, padding: '12px 8px', fontSize: 13, fontWeight: 500,
                        flexShrink: 0, borderRight: `1px solid ${colors.border}`,
                        display: 'flex', alignItems: 'center', gap: 5, background: '#fbf9f4',
                        boxSizing: 'border-box', position: 'sticky', left: 0, zIndex: 3,
                        boxShadow: labelActive(assignee)
                          ? `0 0 0 2px ${colors.accent} inset` : '2px 0 4px rgba(0,0,0,0.04)',
                        opacity: rowDrag === assignee ? 0.5 : 1,
                        cursor: onReorderAssignee ? 'grab' : 'default',
                      }}>
                      {onReorderAssignee && <GripVertical size={12} style={{ color: colors.textMute, flexShrink: 0 }} />}
                      {assignee}
                    </div>
                    <div style={{ flex: 1, position: 'relative', height: rowH, background: '#fff' }}>
                      {/* 30分グリッド線 */}
                      {halfHours.map((m, i) => i > 0 && (
                        <div key={m} style={{
                          position: 'absolute', top: 0, bottom: 0,
                          left: `${((m - dayStart) / totalMin) * 100}%`, width: 1,
                          background: m % 60 === 0 ? '#ece4d2' : '#f5f0e3',
                        }} />
                      ))}
                      {/* 昼休み */}
                      <div style={{
                        position: 'absolute', top: 0, bottom: 0,
                        left: `${lunchLeft}%`, width: `${lunchWidth}%`,
                        background: 'repeating-linear-gradient(45deg, #f3efe4, #f3efe4 4px, #faf7ee 4px, #faf7ee 8px)',
                      }} />
                      {/* 定時後（この担当者の残業枠が無い時間帯）は薄いストライプ */}
                      {dayEnd > afternoonSlot.end && subtractBusy(afternoonSlot.end, dayEnd, dayOvertimeIntervals(assignee, dayDate, settings.overtimes || [])).map(([s, e], k) => (
                        <div key={'ah' + k} style={{
                          position: 'absolute', top: 0, bottom: 0,
                          left: `${((s - dayStart) / totalMin) * 100}%`, width: `${((e - s) / totalMin) * 100}%`,
                          background: 'repeating-linear-gradient(45deg, #f3efe4, #f3efe4 4px, #faf7ee 4px, #faf7ee 8px)',
                        }} />
                      ))}
                      {/* 終日不在 */}
                      {abs.allDay && (
                        <div title={absLabel ? `休み（${absLabel}）` : '休み'} style={{
                          position: 'absolute', inset: 0, zIndex: 2,
                          background: 'repeating-linear-gradient(45deg, #e3e3e0, #e3e3e0 5px, #efefec 5px, #efefec 10px)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#8a8a82', fontWeight: 700, fontSize: 13,
                        }}>休{absLabel && <span style={{ fontSize: 10, fontWeight: 500 }}>（{absLabel}）</span>}</div>
                      )}
                      {/* 時間帯不在 */}
                      {!abs.allDay && abs.intervals.map(([s, e], k) => {
                        const cs = Math.max(s, dayStart), ce = Math.min(e, dayEnd);
                        if (ce <= cs) return null;
                        return (
                          <div key={k} title={absLabel ? `不在（${absLabel}）` : '不在'} style={{
                            position: 'absolute', top: 0, bottom: 0, zIndex: 2,
                            left: `${((cs - dayStart) / totalMin) * 100}%`, width: `${((ce - cs) / totalMin) * 100}%`,
                            background: 'repeating-linear-gradient(45deg, #e3e3e0, #e3e3e0 4px, #efefec 4px, #efefec 8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#8a8a82', fontSize: 9, fontWeight: 600, overflow: 'hidden',
                          }}>{absLabel || '不在'}</div>
                        );
                      })}
                      {/* タスクブロック */}
                      {items.map(({ task, slot, done }, si) => {
                        const s = Math.max(slot.startMin, dayStart), e = Math.min(slot.endMin, dayEnd);
                        if (e <= s) return null;
                        return (
                          <TaskBlock key={si} task={task} slot={slot} done={done}
                            projectColor={getProjectColor(task.projectName)}
                            timeline={{ left: `${((s - dayStart) / totalMin) * 100}%`, width: `${((e - s) / totalMin) * 100}%` }}
                            projDrag={projDrag} onProjDragStart={onReorderProject ? setProjDrag : null} onDropProject={onReorderProject} onVpDragStart={onReassignViewpoint ? setVpDrag : null} vpDrag={vpDrag} onReassign={onReassignViewpoint}
                            onClick={onEditProject && (() => onEditProject(task.projectName))} />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })() : (
      <div ref={scrollRef} className="compact-scroll" style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'auto' }}>
        <div style={{ minWidth: isFlexWidth ? undefined : labelWidth + allDates.length * dayCellWidth, position: 'relative' }}>
          {nowLineX != null && (
            <div title={`現在時刻 ${minToTime(now.getHours() * 60 + now.getMinutes())}`} style={{
              position: 'absolute', top: 0, bottom: 0, left: nowLineX, width: 2,
              background: colors.accent, zIndex: 4, pointerEvents: 'none',
            }}>
              <div style={{ position: 'absolute', top: 0, left: -4, width: 10, height: 10, borderRadius: '50%', background: colors.accent }} />
            </div>
          )}
          <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, background: '#fbf9f4' }}>
            <div style={{
              width: labelWidth, padding: '10px 12px', fontSize: 11, color: colors.textMute, fontWeight: 500,
              flexShrink: 0, borderRight: `1px solid ${colors.border}`, boxSizing: 'border-box',
              position: 'sticky', left: 0, zIndex: 3, background: '#fbf9f4',
              boxShadow: '2px 0 4px rgba(0,0,0,0.04)',
            }}>
              担当
            </div>
            {allDates.map((d, i) => {
              const isToday = isSameDay(d, new Date());
              return (
                <div key={i} ref={i === leftEdgeIndex ? todayCellRef : null} style={{
                  width: colWidth, padding: '6px 4px 2px', textAlign: 'center', flexShrink: 0,
                  borderRight: i < allDates.length - 1 ? `1px solid ${colors.border}` : 'none',
                  background: isToday ? colors.accentSoft : 'transparent',
                  boxSizing: 'border-box',
                }}>
                  <div style={{ fontSize: 10, color: colors.textMute }}>
                    {d.getMonth() + 1}/{d.getDate()} ({dayName(d)})
                  </div>
                  <div style={{ display: 'flex', fontSize: 9, color: colors.textMute, marginTop: 2 }}>
                    <span style={{ width: '50%', borderRight: `1px dashed ${colors.border}`, boxSizing: 'border-box' }}>午前</span>
                    <span style={{ width: '50%', boxSizing: 'border-box' }}>午後</span>
                  </div>
                </div>
              );
            })}
          </div>

          {assignees.map((assignee, ai) => (
            <div key={assignee} style={{ display: 'flex', borderBottom: ai < assignees.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
              <div
                {...labelDnD(assignee)}
                style={{
                width: labelWidth, padding: '12px 8px', fontSize: 13, fontWeight: 500,
                flexShrink: 0, borderRight: `1px solid ${colors.border}`,
                display: 'flex', alignItems: 'center', gap: 5, background: '#fbf9f4',
                boxSizing: 'border-box',
                position: 'sticky', left: 0, zIndex: 3,
                boxShadow: labelActive(assignee)
                  ? `0 0 0 2px ${colors.accent} inset`
                  : '2px 0 4px rgba(0,0,0,0.04)',
                opacity: rowDrag === assignee ? 0.5 : 1,
                cursor: onReorderAssignee ? 'grab' : 'default',
              }}>
                {onReorderAssignee && <GripVertical size={12} style={{ color: colors.textMute, flexShrink: 0 }} />}
                {assignee}
              </div>
              {allDates.map((d, di) => {
                const key = fmtYMD(d);
                const slots = (matrix[assignee] && matrix[assignee][key]) || [];
                const morningRaw = slots.filter(({ slot }) => slot.startMin < morningSlot.end);
                const afternoonRaw = slots.filter(({ slot }) => slot.startMin >= afternoonSlot.start);
                // 簡易表示は同一視点のステップを1ブロックに統合
                const morningItems = simpleMode ? mergeByViewpoint(morningRaw) : morningRaw;
                const afternoonItems = simpleMode ? mergeByViewpoint(afternoonRaw) : afternoonRaw;
                // 午後の枠時間（残業を含む）。残業ぶんブロックが溢れないよう高さの分母にする
                const pmCapMin = dayWorkSlots(assignee, d, settings).reduce((s, [a, b]) => s + Math.max(0, b - Math.max(a, afternoonSlot.start)), 0);
                const pmHours = Math.max(afternoonHours, pmCapMin / 60);
                const isToday = isSameDay(d, new Date());
                const isWorkSat = d.getDay() === 6;
                // 休日・不在
                const abs = isNonWorkingDay(d) ? { allDay: false, intervals: [] } : dayAbsence(assignee, d, settings.absences || []);
                const absLabel = (settings.absences || []).find(x => x && x.assignee === assignee && x.startDate <= fmtYMD(d) && x.endDate >= fmtYMD(d) && x.label)?.label || '';
                const overlayRects = [];
                if (!abs.allDay) {
                  for (const [s, e] of abs.intervals) {
                    const ms = Math.max(s, morningSlot.start), me = Math.min(e, morningSlot.end);
                    if (me > ms) overlayRects.push({ left: '0%', width: '50%', top: ((ms - morningSlot.start) / (morningSlot.end - morningSlot.start) * 100) + '%', height: ((me - ms) / (morningSlot.end - morningSlot.start) * 100) + '%' });
                    const as = Math.max(s, afternoonSlot.start), ae = Math.min(e, afternoonSlot.end);
                    if (ae > as) overlayRects.push({ left: '50%', width: '50%', top: ((as - afternoonSlot.start) / (afternoonSlot.end - afternoonSlot.start) * 100) + '%', height: ((ae - as) / (afternoonSlot.end - afternoonSlot.start) * 100) + '%' });
                  }
                }
                return (
                  <div key={di} style={{
                    width: colWidth, height: rowHeight, flexShrink: 0,
                    borderRight: di < allDates.length - 1 ? `1px solid ${colors.border}` : 'none',
                    background: isToday ? '#fff8f8' : '#fff',
                    position: 'relative',
                    boxSizing: 'border-box',
                    display: 'flex', flexDirection: 'row',
                  }}>
                    <div style={{ width: '50%', display: 'flex', flexDirection: 'column', borderRight: `1px dashed ${colors.border}`, boxSizing: 'border-box' }}>
                      {morningItems.map(({ task, slot, done }, si) => (
                        <TaskBlock key={si} task={task} slot={slot} done={done} compact={compact} simple={simpleMode}
                          heightPct={(slot.hours / morningHours) * 100}
                          projectColor={getProjectColor(task.projectName)}
                          separator={si === 0 ? null : (morningItems[si - 1].task.projectName !== task.projectName ? 'strong' : 'weak')}
                          projDrag={projDrag} onProjDragStart={onReorderProject ? setProjDrag : null} onDropProject={onReorderProject} onVpDragStart={(!simpleMode && onReassignViewpoint) ? setVpDrag : null} vpDrag={vpDrag} onReassign={simpleMode ? null : onReassignViewpoint}
                          onClick={onEditProject && (() => onEditProject(task.projectName))} />
                      ))}
                    </div>
                    <div style={{ width: '50%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
                      background: isWorkSat ? 'repeating-linear-gradient(45deg, #f5f0e3, #f5f0e3 4px, #fbf9f4 4px, #fbf9f4 8px)' : 'transparent',
                    }}>
                      {!isWorkSat && afternoonItems.map(({ task, slot, done }, si) => (
                        <TaskBlock key={si} task={task} slot={slot} done={done} compact={compact} simple={simpleMode}
                          heightPct={(slot.hours / pmHours) * 100}
                          projectColor={getProjectColor(task.projectName)}
                          separator={si === 0 ? null : (afternoonItems[si - 1].task.projectName !== task.projectName ? 'strong' : 'weak')}
                          projDrag={projDrag} onProjDragStart={onReorderProject ? setProjDrag : null} onDropProject={onReorderProject} onVpDragStart={(!simpleMode && onReassignViewpoint) ? setVpDrag : null} vpDrag={vpDrag} onReassign={simpleMode ? null : onReassignViewpoint}
                          onClick={onEditProject && (() => onEditProject(task.projectName))} />
                      ))}
                    </div>
                    {/* 休日・不在のグレー表示 */}
                    {abs.allDay && (
                      <div title={absLabel ? `休み（${absLabel}）` : '休み'} style={{
                        position: 'absolute', inset: 0, zIndex: 2,
                        background: 'repeating-linear-gradient(45deg, #e3e3e0, #e3e3e0 5px, #efefec 5px, #efefec 10px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        color: '#8a8a82', fontWeight: 700, fontSize: 13,
                      }}>
                        休{absLabel && <span style={{ fontSize: 10, fontWeight: 500 }}>（{absLabel}）</span>}
                      </div>
                    )}
                    {!abs.allDay && overlayRects.map((r, k) => (
                      <div key={k} title={absLabel ? `不在（${absLabel}）` : '不在'} style={{
                        position: 'absolute', left: r.left, width: r.width, top: r.top, height: r.height, zIndex: 2,
                        background: 'repeating-linear-gradient(45deg, #e3e3e0, #e3e3e0 4px, #efefec 4px, #efefec 8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#8a8a82', fontSize: 9, fontWeight: 600, boxSizing: 'border-box', overflow: 'hidden',
                      }}>
                        {absLabel || '不在'}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      )}

      <div style={{ marginTop: 20, fontSize: 11, color: colors.textMute }}>
        セル内の色は案件ごと（パステル・「ホワイト」工程は1段階薄い色） ・ 右上の #番号 が優先順位 ・ 斜線ストライプ＋「仮」は仮案件 ・ グレーの実線ブロックは完了済（「済」）／中止（「止」、実終了時刻から遡って表示） ・ グレーの斜線は休日・不在 ・ マウスオーバーで詳細表示 ・ クリックで案件編集フォームを開く（完了済みの案件も編集可） ・ ブロックを同じ担当者の行内でドラッグ＆ドロップすると案件の順番（優先順位）を変更 ・ ブロックを別の担当者の行（ブロックや担当者名の上）へドロップするとその視点の担当者を変更 ・ 左端の担当者名をドラッグ＆ドロップで担当者の表示順を変更 ・「簡易表示」タブは視点内のステップをまとめ、視点ごとに1ブロック（社内案件名＋視点名／社外案件名／開始〜終了予定）で表示
      </div>
    </div>
  );
}

function TaskBlock({ task, slot, heightPct, projectColor, done, onClick, compact, simple, separator, projDrag, onProjDragStart, onDropProject, onVpDragStart, vpDrag, onReassign, timeline }) {
  const [projHover, setProjHover] = useState(false);
  // 案件の並び替えドラッグは進行中ブロックのみ（完了・中止のグレーは対象外）
  const canDragProject = !!onDropProject && !done;
  // 担当者付け替え（視点を別担当者の行へドロップ）も進行中ブロックのみ
  const canDrag = (!!onDropProject || !!onVpDragStart) && !done;
  // このブロックをドロップ先にできるか（進行中のみ）。別担当者の視点がドラッグ中なら付け替え、同担当者なら並び替え。
  const canBeDropTarget = !done && (!!onDropProject || !!onReassign);
  const reassignHere = vpDrag && onReassign && vpDrag.assignee !== task.assignee;
  const reorderHere = projDrag && onDropProject && projDrag !== task.projectName && (!vpDrag || vpDrag.assignee === task.assignee);
  // パステル表示：通常ステップは基本パステル、「ホワイト」工程はさらに1段階薄く。完了は薄いグレー
  const isWhiteStep = !done && (task.stepName || '').includes('ホワイト');
  const blockBg = done ? '#d4d4cd' : pastelize(projectColor, isWhiteStep ? 0.82 : 0.6);
  const blockText = '#3f3b32';
  const remaining = Math.max(0, task.hours - (task.completedHours || 0));
  const stepLabel = task.stepName ? ` - ${task.stepName}` : '';
  const internal = task.projectNameInternal || '';
  const external = task.projectName || '';
  const nameLine = `${internal || external}${internal && external ? ` (${external})` : ''} / ${task.viewpointName}${stepLabel}`;
  let aeStr = '';
  if (done && task.actualEnd) {
    const d = new Date(task.actualEnd);
    if (!isNaN(d.getTime())) aeStr = `${d.getMonth() + 1}/${d.getDate()} ${minToTime(d.getHours() * 60 + d.getMinutes())}`;
  }
  const cancelled = !!task.cancelled;
  const tentative = !done && !!task.tentative;
  const effDeadline = task.deadline || task.projectDeadline || ''; // 実効納期＝個別＞全体
  const memoLine = (effDeadline ? `\n納期 ${(() => { const d = new Date(effDeadline + 'T00:00:00'); return isNaN(d.getTime()) ? effDeadline : `${d.getMonth() + 1}/${d.getDate()}`; })()}` : '') + (task.memo ? `\n📝 ${task.memo}` : '');
  const completed = task.completedHours || 0;
  // ブロック1〜2行目と同じ「社内案件名＋視点名」「開始〜終了予定」をツールチップ先頭に置き、
  // さらに社外案件名・進捗（制作済み/予定/残り）を続ける。
  const internalLine = `${internal || external} / ${task.viewpointName}${stepLabel}`;
  const startEndLine = `${minToTime(slot.startMin)}〜${minToTime(slot.endMin)}`;
  const title = simple
    ? `${internalLine}${internal && external ? `\n${external}` : ''}\n${startEndLine}\n計 ${slot.hours}h${onClick ? '\nクリックで案件を編集' : ''}`
    : done
    ? `【${cancelled ? '中止' : '完了'}】${nameLine}\n${startEndLine} (${slot.hours}h)${aeStr ? `\n実終了 ${aeStr}` : ''}${memoLine}${onClick ? '\nクリックで案件を編集（終了時間の実績は完了タブで）' : '\n※終了時間（実績）は完了タブで編集できます'}`
    : `${internalLine}`
      + (internal && external ? `\n${external}` : '')
      + `\n${startEndLine}`
      + `\n制作済み ${completed}h / 予定 ${task.hours}h / 残り ${remaining}h`
      + memoLine
      + (tentative ? '\n※仮案件' : '')
      + (task.manualStart ? '\n※開始時間指定あり' : '')
      + (task.manualEnd ? '\n※終了予定指定あり' : '')
      + (task.delays && task.delays.length ? `\n※遅延履歴あり（${task.delays.length}回）` : '')
      + (onClick ? '\nクリックで案件を編集' : '')
      + (canDragProject ? '\nドラッグで案件の順番を変更' : '')
      + (onVpDragStart ? '\n別の担当者名の上にドロップで担当者を変更' : '');
  return (
    <div title={title}
      onClick={onClick || undefined}
      draggable={canDrag}
      onDragStart={canDrag ? ((e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', task.projectName); if (onProjDragStart) onProjDragStart(task.projectName); if (onVpDragStart) onVpDragStart({ projectName: task.projectName, viewpointName: task.viewpointName, assignee: task.assignee }); }) : undefined}
      onDragEnd={canDrag ? (() => { if (onProjDragStart) onProjDragStart(null); if (onVpDragStart) onVpDragStart(null); }) : undefined}
      onDragOver={canBeDropTarget ? ((e) => { if (reassignHere || reorderHere) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (!projHover) setProjHover(true); } }) : undefined}
      onDragLeave={canBeDropTarget ? (() => { if (projHover) setProjHover(false); }) : undefined}
      onDrop={canBeDropTarget ? ((e) => {
        e.preventDefault(); e.stopPropagation(); setProjHover(false);
        if (reassignHere) onReassign(vpDrag.projectName, vpDrag.viewpointName, vpDrag.assignee, task.assignee);
        else if (reorderHere) onDropProject(projDrag, task.projectName);
        if (onProjDragStart) onProjDragStart(null);
        if (onVpDragStart) onVpDragStart(null);
      }) : undefined}
      style={{
        background: blockBg, color: blockText,
        // 仮案件は斜線ストライプを重ねて区別する（パステル地でも見えるよう薄い濃色）
        backgroundImage: tentative ? 'repeating-linear-gradient(45deg, rgba(110,100,80,0.16) 0, rgba(110,100,80,0.16) 4px, transparent 4px, transparent 9px)' : 'none',
        fontSize: 10, lineHeight: 1.25, overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        // 案件並び替えドラッグ中の視覚フィードバック
        opacity: projDrag && projDrag === task.projectName ? 0.55 : 1,
        outline: projHover && projDrag && projDrag !== task.projectName ? `2px solid ${'#c1272d'}` : 'none',
        outlineOffset: -2,
        ...(timeline ? {
          // 横タイムライン配置（1日表示）：開始〜終了の位置に絶対配置
          position: 'absolute', left: timeline.left, width: `calc(${timeline.width} - 2px)`,
          top: 5, bottom: 5, borderRadius: 3, padding: '3px 6px',
          border: '1px solid rgba(255,255,255,0.9)', boxSizing: 'border-box',
        } : {
          height: `${heightPct}%`, minHeight: 0, padding: '3px 5px', position: 'relative',
          // 上に重なるブロックとの切れ目：案件が替わる位置は太い白線、同一案件のステップ間は細い線
          boxShadow: separator === 'strong' ? 'inset 0 2px 0 #ffffff'
            : separator === 'weak' ? 'inset 0 1px 0 rgba(255,255,255,0.6)' : 'none',
        }),
      }}>
      {compact ? (
        // 月間表示などの狭い列：案件名1行のみ（詳細はツールチップ）
        <div style={{ fontSize: 8, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 14 }}>
          {internal || external || task.viewpointName}
        </div>
      ) : timeline ? (
        // 1日表示（横タイムライン）：社内案件名／社外案件名／視点名を縦に表示
        <>
          {internal && (
            <div style={{ fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 18 }}>
              {internal}
            </div>
          )}
          {external && (
            <div style={{ fontSize: 9, opacity: 0.85, whiteSpace: 'normal', wordBreak: 'break-word', paddingRight: internal ? 0 : 18 }}>
              {external}
            </div>
          )}
          <div style={{ fontSize: 9, fontWeight: 500, opacity: 0.95, whiteSpace: 'normal', overflow: 'hidden', wordBreak: 'break-word', paddingRight: (external || internal) ? 0 : 18 }}>
            {task.viewpointName}
          </div>
        </>
      ) : (
        // 全期間・簡易表示：1行目＝社内案件名＋視点名、2行目＝社外案件名、3行目＝開始〜終了予定
        <>
          <div style={{ fontSize: 10, fontWeight: 700, whiteSpace: 'normal', overflow: 'hidden', wordBreak: 'break-word', paddingRight: 18 }}>
            {internal || external}
            <span style={{ fontWeight: 500 }}> / {task.viewpointName}</span>
          </div>
          {internal && external && (
            <div style={{ fontSize: 9, opacity: 0.8, whiteSpace: 'normal', wordBreak: 'break-word' }}>
              {external}
            </div>
          )}
          <div style={{ fontSize: 9, fontWeight: 500, opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {minToTime(slot.startMin)}〜{minToTime(slot.endMin)}
          </div>
        </>
      )}
      <div style={{
        position: 'absolute', top: 2, right: 2,
        background: done ? (cancelled ? '#a05252' : '#7d7d76') : (tentative ? '#c46a16' : priorityColor(task.priority)), color: '#fff',
        fontSize: 8, fontWeight: 700, padding: '0 3px', borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.7)',
      }}>{done ? (cancelled ? '止' : '済') : (tentative ? `仮#${task.priority}` : `#${task.priority}`)}</div>
    </div>
  );
}


export { CalendarView, TaskBlock };
