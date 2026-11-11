// 担当レーン：担当者ごとに横1行（レーン）で作業の予定を並べ、
// 視点（依頼項目）をドラッグして別の担当者へ移せる画面。
// 移した結果はその場でスケジュールを計算し直して見せ、「まとめて保存」を押すまで保存しない
// （何件動かしても書き込みは保存の1回だけ＝Firestore の書き込み上限に届きにくい）。
import { useMemo, useState } from 'react';
import { useApp } from '../../appContext.js';
import { dayAbsence, groupByViewpoint, scheduleTasks, sortAssigneesByMaster } from '../../lib/schedule.js';
import { addDays, dayName, fmtMD, fmtYMD, getDailySlots, getProjectColor, isNonWorkingDay, minToTime, startOfDay } from '../../lib/utils.js';

const DAY_W = 132;      // 1日の幅（px）
const LABEL_W = 190;    // 担当者名の列の幅
const LANE_H = 64;      // レーンの高さ
const DAYS_AHEAD = 21;  // 今日から何日先まで並べるか（休みの日は除く）

const ymdOf = (d) => (d ? fmtYMD(d) : '');

function AssigneeLanes({ tasks: visibleTasks }) {
  const {
    tasks: allTasks, scheduled, settings, projectOrder, now, assigneeOrder, employeeMaster,
    vpDeliveryCount, colors, fontJP, fontDisplay, patchTasksEach, notify,
  } = useApp();

  // 移動の予定：{ 視点のキー: 移動先の担当者 }（保存するまで Firestore には書かない）
  const [pending, setPending] = useState({});
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState({});
  const [dragKey, setDragKey] = useState(null);
  const [overLane, setOverLane] = useState(null);

  // 今表示している（検索で絞った）作業を、元の担当者ごとの視点にまとめる
  const groups = useMemo(() => groupByViewpoint(visibleTasks || [], vpDeliveryCount), [visibleTasks, vpDeliveryCount]);
  const groupByKey = useMemo(() => new Map(groups.map(g => [g.key, g])), [groups]);
  const keyByTaskId = useMemo(() => {
    const m = new Map();
    for (const g of groups) for (const t of g.tasks) m.set(t.id, g.key);
    return m;
  }, [groups]);

  // 移動を反映した仮のスケジュール（動かしていなければ今の予定をそのまま使う）
  const pendingKeys = Object.keys(pending).filter(k => groupByKey.has(k) && pending[k] !== groupByKey.get(k).assignee);
  const preview = useMemo(() => {
    const newAssignee = new Map();
    for (const [k, to] of Object.entries(pending)) {
      const g = groupByKey.get(k);
      if (!g || g.assignee === to) continue;
      for (const t of g.tasks) newAssignee.set(t.id, to);
    }
    if (newAssignee.size === 0) return scheduled.active;
    const patched = allTasks.map(t => (newAssignee.has(t.id) ? { ...t, assignee: newAssignee.get(t.id) } : t));
    return scheduleTasks(patched, settings, projectOrder, now).active;
  }, [pending, allTasks, scheduled, settings, projectOrder, now, groupByKey]);

  const visibleIds = useMemo(() => new Set((visibleTasks || []).map(t => t.id)), [visibleTasks]);
  const previewVisible = preview.filter(t => visibleIds.has(t.id));

  // 並べる日：今日から、休みの日を除いて。ただし作業が入っている休みの日（出勤日など）は出す
  const slotDays = new Set();
  for (const t of previewVisible) for (const s of (t.slots || [])) slotDays.add(ymdOf(s.date));
  const days = [];
  const today = startOfDay(now);
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = addDays(today, i);
    if (!isNonWorkingDay(d) || slotDays.has(fmtYMD(d))) days.push(d);
  }
  const dayIndex = new Map(days.map((d, i) => [fmtYMD(d), i]));

  // 1日の横幅に当てる時間帯（残業で延びた日もはみ出さないよう、作業の最遅・最早に合わせて広げる）
  const daily = getDailySlots(settings);
  let dayStart = daily[0].start, dayEnd = daily[daily.length - 1].end;
  for (const t of previewVisible) for (const s of (t.slots || [])) {
    if (s.startMin < dayStart) dayStart = s.startMin;
    if (s.endMin > dayEnd) dayEnd = s.endMin;
  }
  const xOf = (dayIdx, min) => dayIdx * DAY_W + ((min - dayStart) / (dayEnd - dayStart)) * DAY_W;

  // レーン：従業員マスタの人 ＋ 作業を持っている人
  const lanes = sortAssigneesByMaster(
    [...new Set([...(employeeMaster || []).map(e => (e.name || '').trim()), ...previewVisible.map(t => t.assignee)].filter(Boolean))],
    assigneeOrder,
  );

  // レーンごとのブロック（視点ごと。日をまたぐ作業は日ごとの切れ端になる）
  const lanesData = lanes.map(name => {
    const mine = previewVisible.filter(t => t.assignee === name);
    const byKey = new Map();
    let remaining = 0, lastEnd = null;
    for (const t of mine) {
      remaining += Math.max(0, (t.hours || 0) - (t.completedHours || 0));
      const key = keyByTaskId.get(t.id);
      if (!key) continue;
      if (!byKey.has(key)) byKey.set(key, { key, segs: [], end: null });
      const b = byKey.get(key);
      for (const s of (t.slots || [])) {
        const di = dayIndex.get(ymdOf(s.date));
        if (di == null) continue;
        b.segs.push({ left: xOf(di, s.startMin), width: Math.max(4, xOf(di, s.endMin) - xOf(di, s.startMin)), sort: di * 10000 + s.startMin });
      }
      if (t.scheduledEnd) {
        const ts = t.scheduledEnd.getTime() + (t.scheduledEndMin || 0) * 60000;
        if (!b.end || ts > b.end.ts) b.end = { ts, date: t.scheduledEnd, min: t.scheduledEndMin || 0 };
        if (!lastEnd || ts > lastEnd.ts) lastEnd = { ts, date: t.scheduledEnd, min: t.scheduledEndMin || 0 };
      }
    }
    const blocks = [...byKey.values()].map(b => {
      const g = groupByKey.get(b.key);
      const dl = g.deadline || '';
      const late = !!(dl && b.end && ymdOf(b.end.date) > dl);
      b.segs.sort((x, y) => x.sort - y.sort);
      return { ...b, g, late, moved: pendingKeys.includes(b.key) };
    });
    const absentDays = days.map((d, i) => ({ i, abs: dayAbsence(name, d, settings.absences) })).filter(x => x.abs.allDay);
    return { name, blocks, remaining, lastEnd, absentDays };
  });

  const selKeys = Object.keys(selected).filter(k => selected[k] && groupByKey.has(k));
  const trackW = days.length * DAY_W;

  const moveKeys = (keys, to) => {
    const ks = keys.filter(k => groupByKey.has(k));
    if (!ks.length) return;
    setHistory(h => [...h, pending]);
    setPending(p => {
      const next = { ...p };
      for (const k of ks) {
        if (groupByKey.get(k).assignee === to) delete next[k];
        else next[k] = to;
      }
      return next;
    });
    setSelected({});
  };
  const currentAssigneeOf = (k) => pending[k] || groupByKey.get(k)?.assignee;
  const onDropLane = (e, to) => {
    e.preventDefault();
    setOverLane(null);
    const k = dragKey;
    setDragKey(null);
    if (!k) return;
    const keys = selected[k] ? selKeys : [k];
    moveKeys(keys.filter(x => currentAssigneeOf(x) !== to), to);
  };
  const undo = () => {
    if (!history.length) return;
    setPending(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
  };
  const discard = () => { setPending({}); setHistory([]); setSelected({}); };
  const save = () => {
    const patches = [], reverse = [];
    for (const k of pendingKeys) {
      const g = groupByKey.get(k);
      for (const t of g.tasks) {
        patches.push({ id: t.id, patch: { assignee: pending[k] } });
        reverse.push({ id: t.id, patch: { assignee: t.assignee } });
      }
    }
    if (!patches.length) return;
    patchTasksEach(patches);
    const n = pendingKeys.length;
    discard();
    notify(`${n}件の視点の担当者をまとめて変更しました`, { type: 'success', undo: () => patchTasksEach(reverse) });
  };

  const fmtEnd = (e) => (e ? `${fmtMD(e.date)}(${dayName(e.date)}) ${minToTime(e.min)}` : '―');
  const btn = (primary) => ({
    minHeight: 36, padding: '0 14px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12,
    border: `1px solid ${primary ? colors.accent : colors.border}`,
    background: primary ? colors.accent : '#fff', color: primary ? '#fff' : colors.text, fontWeight: primary ? 700 : 400,
  });

  return (
    <div style={{ fontFamily: fontJP, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: colors.textMute, maxWidth: 640 }}>
          視点のブロックをドラッグして、別の担当者のレーンに落とすと担当を移せます。クリックで複数選び、「選択した作業をここへ」でまとめて移すこともできます。
          移した結果はすぐに予定に反映されますが、<b style={{ color: colors.text }}>「まとめて保存」を押すまで保存されません。</b>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12 }}>選択中 <b>{selKeys.length}</b> 件</span>
          <button type="button" style={btn(false)} disabled={!selKeys.length} onClick={() => setSelected({})}>選択を解除</button>
          <button type="button" style={btn(false)} disabled={!history.length} onClick={undo}>元に戻す</button>
          <button type="button" style={btn(false)} disabled={!pendingKeys.length} onClick={discard}>変更を取り消す</button>
          <button type="button" style={btn(true)} disabled={!pendingKeys.length} onClick={save}>変更 {pendingKeys.length} 件をまとめて保存</button>
        </div>
      </div>

      {/* 凡例（原則4：ドラッグできることを画面上の文字でも示す） */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 11, color: colors.textMute }}>
        <span>■ 色＝案件</span>
        <span style={{ color: '#c1272d' }}>赤枠＝視点の納期を過ぎる</span>
        <span style={{ color: '#9c5a12' }}>点線枠＝移動したが未保存</span>
        <span>太枠＝選択中</span>
        <span>灰色の日＝休み（従業員設定の欠勤・休日）</span>
      </div>

      <div style={{ overflowX: 'auto', border: `1px solid ${colors.border}`, borderRadius: 6, background: '#fff' }}>
        <div style={{ width: LABEL_W + trackW }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, background: '#fbf9f4', position: 'sticky', top: 0 }}>
            <div style={{ width: LABEL_W, flex: 'none', padding: '8px 12px', boxSizing: 'border-box', fontSize: 11, fontWeight: 700, color: colors.textMute }}>担当者</div>
            {days.map(d => (
              <div key={fmtYMD(d)} style={{ width: DAY_W, flex: 'none', boxSizing: 'border-box', padding: '8px 6px', fontSize: 11, fontWeight: 700, borderLeft: `1px solid ${colors.border}`, color: isNonWorkingDay(d) ? colors.textMute : colors.text }}>
                {fmtMD(d)}({dayName(d)})
              </div>
            ))}
          </div>

          {lanesData.map(L => (
            <div key={L.name}
              onDragOver={(e) => { e.preventDefault(); if (overLane !== L.name) setOverLane(L.name); }}
              onDrop={(e) => onDropLane(e, L.name)}
              style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, background: overLane === L.name ? '#fff4ec' : 'transparent' }}>
              <div style={{ width: LABEL_W, flex: 'none', boxSizing: 'border-box', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'center' }}>
                <div style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: 14 }}>{L.name}</div>
                <div style={{ fontSize: 11, color: colors.textMute }}>残 {Math.round(L.remaining * 10) / 10}h ・ 終了 {fmtEnd(L.lastEnd)}</div>
                {selKeys.length > 0 && (
                  <button type="button" onClick={() => moveKeys(selKeys.filter(k => currentAssigneeOf(k) !== L.name), L.name)}
                    style={{ alignSelf: 'flex-start', minHeight: 28, padding: '0 8px', fontSize: 11, fontFamily: fontJP, cursor: 'pointer', borderRadius: 4, border: `1px solid ${colors.accent}`, background: '#fff', color: colors.accent, fontWeight: 700 }}>
                    選択した作業をここへ
                  </button>
                )}
              </div>
              <div style={{
                position: 'relative', width: trackW, height: LANE_H, flex: 'none',
                backgroundImage: `repeating-linear-gradient(to right, transparent 0 ${DAY_W - 1}px, ${colors.border} ${DAY_W - 1}px ${DAY_W}px)`,
              }}>
                {L.absentDays.map(x => (
                  <div key={x.i} aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: x.i * DAY_W, width: DAY_W - 1, background: '#eeebe4' }} />
                ))}
                {L.blocks.map(b => b.segs.map((s, i) => {
                  const sel = !!selected[b.key];
                  const color = getProjectColor(b.g.projectName);
                  return (
                    <button key={`${b.key}-${i}`} type="button" draggable
                      title={`${b.g.projectName}／${b.g.viewpointName}（終了 ${fmtEnd(b.end)}${b.g.deadline ? `・納期 ${b.g.deadline}` : ''}）`}
                      onClick={() => setSelected(p => ({ ...p, [b.key]: !p[b.key] }))}
                      onDragStart={(e) => { setDragKey(b.key); try { e.dataTransfer.setData('text/plain', b.key); e.dataTransfer.effectAllowed = 'move'; } catch { /* 一部のブラウザ */ } }}
                      onDragEnd={() => { setDragKey(null); setOverLane(null); }}
                      style={{
                        position: 'absolute', top: 10, height: LANE_H - 20, left: s.left + 1, width: Math.max(4, s.width - 2),
                        boxSizing: 'border-box', padding: s.width > 40 ? '2px 4px' : 0, overflow: 'hidden', cursor: 'grab',
                        textAlign: 'left', fontFamily: fontJP, fontSize: 10, lineHeight: 1.25, color: colors.text,
                        background: `${color}22`, borderRadius: 4,
                        border: sel ? `2px solid ${colors.text}` : b.late ? '2px solid #c1272d' : b.moved ? '1.5px dashed #9c5a12' : `1px solid ${color}`,
                      }}>
                      {i === 0 && s.width > 40 && (
                        <>
                          <b>{b.g.projectNameInternal || b.g.projectName}</b><br />{b.g.viewpointName}
                        </>
                      )}
                    </button>
                  );
                }))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {pendingKeys.length > 0 && (
        <div style={{ background: '#fbf9f4', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '10px 14px', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <b>保存前の変更（{pendingKeys.length}件）</b>
          {pendingKeys.map(k => {
            const g = groupByKey.get(k);
            return <div key={k}>{g.projectNameInternal || g.projectName}／{g.viewpointName}：{g.assignee} → <b>{pending[k]}</b></div>;
          })}
        </div>
      )}
    </div>
  );
}

export { AssigneeLanes };
