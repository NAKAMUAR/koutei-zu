// 完了タスクビュー（完了一覧＋視点別修正集計）。App.jsx から分割。
import { useState, useMemo } from 'react';
import { useApp } from '../appContext.js';
import { computeRevisionStats } from '../viewpoint/viewpointUtils.js';
import { Check, CheckCircle2, ChevronDown, ChevronUp, Clock, Edit2, RotateCcw, Search, Trash2, User, X } from 'lucide-react';
import { dayName, fmtYMD, fmtYMDJP, getProjectColor, startOfDay } from '../lib/utils.js';
import { EndTimeFields, iconBtnStyle } from '../components/common.jsx';

// ============ 完了タスクビュー ============
// ============ 視点別 修正集計（完了タブ） ============
// 「①新規 → ②完成 → ③追加の変更・修正 → ④完成」の③が、視点ごとに何回・
// どれだけ時間がかかっているかを自動集計して表示する。元データは computeRevisionStats。
function RevisionStatsSection({ tasks, colors, fontJP, fontDisplay }) {
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');
  const stats = useMemo(() => computeRevisionStats(tasks), [tasks]);
  const withFix = useMemo(() => stats.filter(s => s.fixCount > 0), [stats]);
  const totalFix = withFix.reduce((s, e) => s + e.fixCount, 0);
  const totalFixH = Math.round(withFix.reduce((s, e) => s + e.fixSpentH, 0) * 10) / 10;
  const q = query.trim().toLowerCase();
  const base = showAll ? stats : withFix;
  const rows = q
    ? base.filter(s => [s.projectName, s.projectNameInternal, s.companyName, s.viewpointName].some(v => (v || '').toLowerCase().includes(q)))
    : base;
  if (stats.length === 0) return null;

  const th = { textAlign: 'left', padding: '7px 10px', fontSize: 11, color: colors.textMute, fontWeight: 600, whiteSpace: 'nowrap', borderBottom: `1px solid ${colors.border}` };
  const td = { padding: '7px 10px', fontSize: 12.5, borderBottom: `1px solid #f0ece0`, whiteSpace: 'nowrap' };
  return (
    <section style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6, marginBottom: 24, overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
          background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: fontJP, textAlign: 'left',
        }}>
        {open ? <ChevronUp size={15} color={colors.textMute} /> : <ChevronDown size={15} color={colors.textMute} />}
        <span style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 600, color: colors.text }}>視点別 修正集計</span>
        <span style={{ fontSize: 11, color: colors.textMute }}>
          全{stats.length}視点中 修正あり{withFix.length}視点 ・ 修正合計 {totalFix}回 / {totalFixH}h
          {stats.length > 0 ? ` ・ 平均 ${(Math.round((totalFix / stats.length) * 10) / 10)}回/視点` : ''}
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 340 }}>
              <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: colors.textMute, display: 'flex', pointerEvents: 'none' }}><Search size={13} /></span>
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="案件名・会社名・視点名で絞り込み"
                style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px 6px 28px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 12, outline: 'none' }} />
            </div>
            <label style={{ fontSize: 11.5, color: colors.textMute, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
              修正のない視点も表示
            </label>
          </div>
          {rows.length === 0 ? (
            <div style={{ fontSize: 12, color: colors.textMute, padding: '10px 2px' }}>
              {withFix.length === 0 && !showAll ? '修正ラウンドのある視点はまだありません。' : '一致する視点がありません。'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto', border: `1px solid ${colors.border}`, borderRadius: 5 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: fontJP }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fbf9f4' }}>
                  <tr>
                    <th style={th}>会社</th>
                    <th style={th}>案件</th>
                    <th style={th}>視点</th>
                    <th style={{ ...th, textAlign: 'right' }}>修正回数</th>
                    <th style={{ ...th, textAlign: 'right' }} title="修正ステップの時間合計。実績（完了時間）があれば実績、無ければ予定（制作時間）">修正時間</th>
                    <th style={{ ...th, textAlign: 'right' }}>追加回数</th>
                    <th style={th}>直近修正</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(s => (
                    <tr key={s.key}>
                      <td style={{ ...td, color: colors.textMute, fontSize: 11.5 }}>{s.companyName || '—'}</td>
                      <td style={td}>
                        <span style={{ fontWeight: 600 }}>{s.projectNameInternal || s.projectName}</span>
                        {s.projectNameInternal && <span style={{ fontSize: 10.5, color: colors.textMute, marginLeft: 6 }}>{s.projectName}</span>}
                      </td>
                      <td style={td}>{s.viewpointName}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: s.fixCount > 0 ? '#c46a16' : colors.textMute }}>{s.fixCount}回</td>
                      <td style={{ ...td, textAlign: 'right' }}>{s.fixSpentH > 0 ? `${s.fixSpentH}h` : '—'}</td>
                      <td style={{ ...td, textAlign: 'right', color: s.addCount > 0 ? colors.text : colors.textMute }}>{s.addCount}回</td>
                      <td style={{ ...td, fontSize: 11.5, color: colors.textMute }}>{s.lastFixAt > 0 ? fmtYMDJP(new Date(s.lastFixAt)) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function DoneView() {
  const { colors, fontJP, fontDisplay, scheduled, tasks, toggleStatus, handleDelete, setActualEnd, handleEditProject } = useApp();
  const doneTasks = [...scheduled.doneFinal].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  // 検索：案件名・社内案件名・会社名・お客様担当者・制作担当者・視点名・ステップ名・メモで絞り込み
  const [searchQuery, setSearchQuery] = useState('');
  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? doneTasks.filter(t =>
      [t.projectName, t.projectNameInternal, t.companyName, t.customerContact, t.assignee, t.viewpointName, t.stepName, t.memo]
        .some(v => (v || '').toLowerCase().includes(q)))
    : doneTasks;
  const cancelledCount = filtered.filter(t => t.cancelled).length;

  const grouped = {};
  for (const task of filtered) {
    const d = task.completedAt ? new Date(task.completedAt) : null;
    const key = d ? fmtYMD(startOfDay(d)) : '日時不明';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(task);
  }

  const totalHours = filtered.reduce((s, t) => s + t.hours, 0);
  const byAssignee = {};
  for (const t of filtered) {
    if (!byAssignee[t.assignee]) byAssignee[t.assignee] = { count: 0, hours: 0 };
    byAssignee[t.assignee].count++;
    byAssignee[t.assignee].hours += t.hours;
  }

  if (doneTasks.length === 0) {
    return (
      <div>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 20, margin: '0 0 20px 0', fontWeight: 500 }}>完了タスク</h2>
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6, padding: 48, textAlign: 'center', color: colors.textMute }}>
          <CheckCircle2 size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div>まだ完了したタスクはありません</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 20, margin: 0, fontWeight: 500 }}>完了タスク</h2>
        <span style={{ fontSize: 12, color: colors.textMute }}>
          {q ? `${filtered.length} / ${doneTasks.length}件` : `${doneTasks.length}件 完了`}{cancelledCount > 0 ? `（うち中止 ${cancelledCount}件）` : ''} ・ 合計 {totalHours}時間
        </span>
      </div>

      {/* 検索 */}
      <div style={{ position: 'relative', maxWidth: 480, marginBottom: 20 }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: colors.textMute, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
          <Search size={15} />
        </span>
        <input type="text" value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="案件名・会社名・お客様担当者・制作担当者・視点名で検索"
          style={{
            width: '100%', padding: '9px 32px 9px 32px', boxSizing: 'border-box',
            border: `1px solid ${colors.border}`, borderRadius: 4,
            fontFamily: fontJP, fontSize: 13, background: '#fff', color: colors.text, outline: 'none',
          }} />
        {searchQuery && (
          <button type="button" onClick={() => setSearchQuery('')}
            title="検索をクリア"
            style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMute,
              display: 'flex', alignItems: 'center', padding: 2,
            }}>
            <X size={15} />
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <div style={{ background: '#fff', border: `1px dashed ${colors.border}`, borderRadius: 6, padding: 48, textAlign: 'center', color: colors.textMute, fontSize: 13 }}>
          「{searchQuery}」に一致する完了タスクはありません。
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {Object.entries(byAssignee).map(([a, stat]) => (
          <div key={a} style={{
            background: '#fff', border: `1px solid ${colors.border}`,
            borderRadius: 6, padding: 14,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: getProjectColor(a), color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 600, fontSize: 13,
            }}>{a.slice(0, 1)}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{a}</div>
              <div style={{ fontSize: 11, color: colors.textMute }}>{stat.count}件 ・ {stat.hours}h</div>
            </div>
          </div>
        ))}
      </div>

      {/* 視点別 修正集計（③追加の変更・修正が何回・何時間かかっているか） */}
      <RevisionStatsSection tasks={tasks || []} colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />

      {Object.entries(grouped).map(([dateKey, dayTasks]) => {
        const d = dateKey !== '日時不明' ? new Date(dateKey + 'T00:00:00') : null;
        return (
          <section key={dateKey} style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 12, color: colors.textMute, fontWeight: 500,
              marginBottom: 8, paddingBottom: 6,
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>{d ? `${fmtYMDJP(d)} (${dayName(d)})` : '日時不明'}</span>
              <span>{dayTasks.length}件完了</span>
            </div>
            <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'hidden' }}>
              {dayTasks.map((task, idx) => (
                <DoneTaskRow key={task.id} task={task}
                  onRestore={() => toggleStatus(task.id)} onDelete={() => handleDelete(task.id)}
                  onSetActualEnd={(v) => setActualEnd(task.id, v)}
                  onEditProject={handleEditProject ? (() => handleEditProject(task.projectName)) : null}
                  isLast={idx === dayTasks.length - 1}
                  colors={colors} fontJP={fontJP} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function DoneTaskRow({ task, onRestore, onDelete, onSetActualEnd, onEditProject, isLast, colors, fontJP }) {
  const projectColor = getProjectColor(task.projectName);
  const cancelled = !!task.cancelled;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 18px',
      borderBottom: isLast ? 'none' : `1px solid ${colors.border}`,
      background: '#fbfaf6',
    }}>
      <div style={{
        width: 20, height: 20, background: cancelled ? '#a05252' : '#7a8471', borderRadius: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {cancelled ? <X size={12} color="#fff" /> : <Check size={12} color="#fff" />}
      </div>
      <div style={{ width: 4, height: 32, background: projectColor, borderRadius: 2, flexShrink: 0, opacity: 0.7 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: colors.textMute, marginBottom: 2, textDecoration: 'line-through' }}>
          {task.projectName}
          <span style={{ margin: '0 6px' }}>／</span>
          {task.viewpointName}
          {task.stepName && <><span style={{ margin: '0 6px' }}>／</span>{task.stepName}</>}
          {cancelled && (
            <span style={{
              marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#a05252',
              border: '1px solid #a05252', borderRadius: 2, padding: '1px 5px',
              textDecoration: 'none', display: 'inline-block', verticalAlign: 'middle',
            }}>中止</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: colors.textMute, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={11} /> {task.assignee}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> {task.hours}h{cancelled ? `（実績 ${task.completedHours || 0}h）` : ''}</span>
          {task.completedAt && (
            <span style={{ color: cancelled ? '#a05252' : '#7a8471' }}>
              {new Date(task.completedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} {cancelled ? '中止' : '完了'}
            </span>
          )}
        </div>
        {onSetActualEnd && (
          <div style={{ fontSize: 11, color: colors.textMute, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            <span style={{ whiteSpace: 'nowrap' }}>終了時間:</span>
            <EndTimeFields value={task.actualEnd || ''} onChange={onSetActualEnd} colors={colors} fontJP={fontJP} />
            {task.actualEnd && (
              <button type="button" onClick={() => onSetActualEnd('')}
                style={{ background: 'transparent', border: `1px solid ${colors.border}`, padding: '4px 8px', borderRadius: 3, fontSize: 10, color: colors.textMute, cursor: 'pointer', fontFamily: fontJP }}>
                クリア
              </button>
            )}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {onEditProject && <button onClick={onEditProject} style={iconBtnStyle(colors)} title="案件を編集（完了済みの情報も修正できます）"><Edit2 size={14} /></button>}
        <button onClick={onRestore} style={iconBtnStyle(colors)} title="未完了に戻す"><RotateCcw size={14} /></button>
        <button onClick={onDelete} style={iconBtnStyle(colors)} title="完全に削除"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

// ============ マスタ管理ビュー ============

export { DoneView, DoneTaskRow, RevisionStatsSection };
