// 担当者別ビュー。App.jsx から分割。
import { groupByViewpoint, sortAssigneesByMaster } from '../lib/schedule.js';
import { Users } from 'lucide-react';
import { tabStyle } from '../components/common.jsx';
import { fmtHM, getProjectColor } from '../lib/utils.js';
import { ViewpointGroupList } from './input/ViewpointList.jsx';
import { useApp } from '../appContext.js';

// ============ 担当者別ビュー ============
function AssigneeView({ selectedAssignee, setSelectedAssignee }) {
  const { scheduled, assigneeOrder, vpDeliveryCount, colors, fontJP, fontDisplay } = useApp();
  const assignees = sortAssigneesByMaster([...new Set(scheduled.active.map(t => t.assignee))], assigneeOrder);
  if (assignees.length === 0) {
    return (
      <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6, padding: 48, textAlign: 'center', color: colors.textMute }}>
        <Users size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
        <div>進行中のタスクがありません</div>
      </div>
    );
  }
  const current = selectedAssignee && assignees.includes(selectedAssignee) ? selectedAssignee : 'all';
  const tasksByAssignee = {};
  for (const a of assignees) {
    tasksByAssignee[a] = scheduled.active.filter(t => t.assignee === a);
  }
  const allActive = scheduled.active;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 20, margin: 0, fontWeight: 500 }}>担当者別タスク</h2>
        <span style={{ fontSize: 12, color: colors.textMute }}>{assignees.length}名 ・ 進行中{scheduled.active.length}件</span>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        <button onClick={() => setSelectedAssignee(null)} style={tabStyle(current === 'all', colors, fontJP)}>
          すべて表示
        </button>
        {assignees.map(a => {
          const tasks = tasksByAssignee[a];
          const remaining = tasks.reduce((s, t) => s + Math.max(0, t.hours - (t.completedHours || 0)), 0);
          return (
            <button key={a} onClick={() => setSelectedAssignee(a)} style={tabStyle(current === a, colors, fontJP)}>
              {a}
              <span style={{
                marginLeft: 6, fontSize: 10, opacity: 0.7,
                padding: '1px 5px', borderRadius: 8,
                background: current === a ? 'rgba(255,255,255,0.2)' : '#f0ebde',
              }}>{tasks.length}件 / 残{remaining}h</span>
            </button>
          );
        })}
      </div>

      {(current === 'all' ? assignees : [current]).map(a => {
        const tasks = tasksByAssignee[a];
        const totalHours = tasks.reduce((s, t) => s + t.hours, 0);
        const completedHours = tasks.reduce((s, t) => s + (t.completedHours || 0), 0);
        const remainingHours = totalHours - completedHours;
        const progressPct = totalHours > 0 ? (completedHours / totalHours) * 100 : 0;
        const groups = groupByViewpoint(tasks, vpDeliveryCount);

        return (
          <section key={a} style={{ marginBottom: 32 }}>
            <div style={{
              background: '#fbf9f4', border: `1px solid ${colors.border}`,
              borderRadius: 6, padding: '14px 20px', marginBottom: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: getProjectColor(a), color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 600, fontSize: 14, flexShrink: 0,
                }}>{a.slice(0, 1)}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{a}</div>
                  <div style={{ fontSize: 11, color: colors.textMute, marginBottom: 4 }}>
                    {groups.length}視点 ・ {tasks.length}タスク ・ 完了 {fmtHM(completedHours)} / 全 {fmtHM(totalHours)} ・
                    <span style={{ color: colors.accent, fontWeight: 600 }}> 残 {fmtHM(remainingHours)}</span>
                  </div>
                  <div style={{ height: 4, background: '#f0ebde', borderRadius: 2, overflow: 'hidden', maxWidth: 320 }}>
                    <div style={{ height: '100%', width: `${progressPct}%`, background: colors.progress, transition: 'width 0.3s' }} />
                  </div>
                </div>
              </div>
            </div>
            <ViewpointGroupList groups={groups} allActive={allActive} />
          </section>
        );
      })}
    </div>
  );
}


export { AssigneeView };
