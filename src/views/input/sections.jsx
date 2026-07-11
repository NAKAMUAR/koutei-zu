// 入力ビューのセクション（制作中断・確認待ち・案件情報編集・担当者ボード）。App.jsx から分割。
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../appContext.js';
import { addDays, dayName, fmtHM, fmtMD, fmtYMD, getProjectColor, minToTime } from '../../lib/utils.js';
import { Check, ChevronDown, ChevronUp, PauseCircle, PlayCircle, User } from 'lucide-react';
import { groupByViewpoint, sortAssigneesByMaster } from '../../lib/schedule.js';

// ============ 制作中断セクション ============
// 納品後の確認待ちなどで進行できない案件を、一旦スケジュールから外して表示する。
// 「制作再開」でいつでも進行中（スケジュール）へ戻せる。完了ではないので完了タブには入らない。
function SuspendedSection({ suspended }) {
  const { colors, fontJP, fontDisplay, resumeProject } = useApp();
  const [collapsed, setCollapsed] = useState(() => new Set());
  const toggle = (p) => setCollapsed(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });
  if (!suspended || suspended.length === 0) return null;

  // 案件ごとにまとめる
  const byProject = [];
  const pmap = new Map();
  for (const t of suspended) {
    const p = t.projectName || '(案件名未設定)';
    if (!pmap.has(p)) {
      const e = { projectName: p, projectNameInternal: t.projectNameInternal || '', companyName: t.companyName || '', tasks: [] };
      pmap.set(p, e); byProject.push(e);
    }
    pmap.get(p).tasks.push(t);
  }
  // 中断日時の新しい順
  for (const e of byProject) {
    let suspendedAt = 0;
    let totalHours = 0, completedHours = 0;
    const vps = new Set();
    for (const t of e.tasks) {
      if (t.suspendedAt && t.suspendedAt > suspendedAt) suspendedAt = t.suspendedAt;
      totalHours += Math.max(0, t.hours || 0);
      completedHours += Math.max(0, t.completedHours || 0);
      vps.add(t.viewpointName);
    }
    e.suspendedAt = suspendedAt || null;
    e.remaining = Math.max(0, totalHours - completedHours);
    e.viewpointNames = [...vps];
  }
  byProject.sort((a, b) => (b.suspendedAt || 0) - (a.suspendedAt || 0));

  const fmtDate = (ms) => ms ? new Date(ms).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : '';

  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontFamily: fontDisplay, fontSize: 18, margin: '0 0 4px 0', fontWeight: 500, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        制作中断
        <span style={{ fontSize: 12, color: colors.textMute, fontFamily: fontJP }}>
          {byProject.length}件 ・ 納品後の確認待ちなどで一旦スケジュールから外した案件（制作再開で戻せます）
        </span>
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
        {byProject.map(pg => {
          const isCollapsed = collapsed.has(pg.projectName);
          const pcolor = getProjectColor(pg.projectName);
          return (
            <div key={pg.projectName} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* 案件ヘッダー（クリックで折りたたみ） */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#fbf6ee', border: `1px solid ${colors.border}`, borderLeft: `4px solid ${pcolor}`,
                padding: '10px 14px', borderRadius: 4, fontFamily: fontJP,
              }}>
                <button type="button" onClick={() => toggle(pg.projectName)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: colors.textMute, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                  title={isCollapsed ? '展開' : '折りたたみ'}>
                  {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                <span style={{ color: '#b07d3c', display: 'flex', alignItems: 'center', flexShrink: 0 }} title="制作中断中">
                  <PauseCircle size={15} />
                </span>
                <span onClick={() => toggle(pg.projectName)}
                  title={pg.projectNameInternal ? `${pg.projectNameInternal}（${pg.projectName}）` : pg.projectName}
                  style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                  {pg.projectNameInternal ? (
                    <>
                      <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{pg.projectNameInternal}</span>
                      <span style={{ fontSize: 12, color: colors.textMute, marginLeft: 6 }}>{pg.projectName}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{pg.projectName}</span>
                  )}
                  {pg.companyName && <span style={{ fontSize: 12, color: colors.textMute, marginLeft: 8 }}>{pg.companyName}</span>}
                </span>
                <span style={{ fontSize: 11, color: colors.textMute, flexShrink: 0 }}>
                  {pg.viewpointNames.length}視点 ・ 残 {fmtHM(pg.remaining)}{pg.suspendedAt ? ` ・ ${fmtDate(pg.suspendedAt)} 中断` : ''}
                </span>
                <button type="button" onClick={() => resumeProject(pg.projectName)}
                  style={{
                    background: colors.progress, color: '#fff', border: 'none', borderRadius: 3,
                    padding: '5px 10px', cursor: 'pointer', fontFamily: fontJP, fontSize: 12,
                    display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                  }}
                  title="制作再開：この案件を進行中（スケジュール）へ戻す">
                  <PlayCircle size={14} />制作再開
                </button>
              </div>
              {!isCollapsed && (
                <div style={{ marginLeft: 22, fontFamily: fontJP, fontSize: 12, color: colors.textMute, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {pg.viewpointNames.map(v => (
                    <span key={v} style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '3px 8px' }}>{v}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============ 確認待ちセクション（視点完了後の確認フェーズ） ============
// 進行中案件の下に表示。視点を完了すると、完了タブへ行く前にここへ入る。
// 追加修正があればメモを記入でき、3日更新がないとグレー、7日でアプリが自動的に完了タブへ移す。
const REVIEW_GRAY_DAYS = 3;
const REVIEW_AUTO_DONE_DAYS = 7;
function ReviewSection({ review }) {
  const { colors, fontJP, fontDisplay, vpDeliveryCount } = useApp();
  // 案件ごとの折りたたみ状態（進行中案件一覧と同じ形式）
  const [collapsed, setCollapsed] = useState(() => new Set());
  const toggle = (p) => setCollapsed(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });
  // 標準では全案件を閉じた状態にする（データ初回到着時に1回だけ。以後は手動操作を尊重）
  const didInitCollapse = useRef(false);
  // 視点単位にまとめ、確認待ちのメタ情報（開始・最終更新・メモ・完了日・完了時刻）を付与
  const groups = groupByViewpoint(review || [], vpDeliveryCount).map(g => {
    let reviewAt = Infinity, reviewUpdatedAt = 0, completedAt = 0, reviewNote = '', actualEnd = '';
    for (const t of g.tasks) {
      if (t.reviewAt && t.reviewAt < reviewAt) reviewAt = t.reviewAt;
      if (t.reviewUpdatedAt && t.reviewUpdatedAt > reviewUpdatedAt) reviewUpdatedAt = t.reviewUpdatedAt;
      if (t.completedAt && t.completedAt > completedAt) completedAt = t.completedAt;
      if (!reviewNote && t.reviewNote) reviewNote = t.reviewNote;
      if (!actualEnd && t.actualEnd) actualEnd = t.actualEnd;
    }
    return { ...g, reviewAt: reviewAt === Infinity ? null : reviewAt, reviewUpdatedAt: reviewUpdatedAt || null, completedAt: completedAt || null, reviewNote, actualEnd };
  });
  // 最終更新が古い順（＝自動完了が近い順）に並べる
  groups.sort((a, b) => (a.reviewUpdatedAt || 0) - (b.reviewUpdatedAt || 0));

  // 同じ案件ごとにまとめる（並びは上の順を保持）
  const byProject = [];
  const pmap = new Map();
  for (const g of groups) {
    const p = g.projectName || '(案件名未設定)';
    if (!pmap.has(p)) {
      const e = { projectName: p, projectNameInternal: g.projectNameInternal || '', companyName: g.companyName || '', items: [] };
      pmap.set(p, e); byProject.push(e);
    }
    pmap.get(p).items.push(g);
  }

  // 標準で全案件を閉じる（初回のみ）
  useEffect(() => {
    if (!didInitCollapse.current && byProject.length > 0) {
      setCollapsed(new Set(byProject.map(p => p.projectName)));
      didInitCollapse.current = true;
    }
  }, [byProject.length]);

  // フックの後で早期リターン（0件→表示なし）。フック数を常に一定に保つ。
  if (!review || review.length === 0) return null;

  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontFamily: fontDisplay, fontSize: 18, margin: '0 0 4px 0', fontWeight: 500, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        確認待ち
        <span style={{ fontSize: 12, color: colors.textMute, fontFamily: fontJP }}>
          {groups.length}件 ・ 視点完了後の確認フェーズ（{REVIEW_AUTO_DONE_DAYS}日更新がなければ自動で完了へ）
        </span>
      </h2>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button type="button" onClick={() => setCollapsed(new Set(byProject.map(p => p.projectName)))}
          style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.textMute }}>
          <ChevronDown size={13} />全て閉じる
        </button>
        <button type="button" onClick={() => setCollapsed(new Set())}
          style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.textMute }}>
          <ChevronUp size={13} />全て開く
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
        {byProject.map(pg => {
          const isCollapsed = collapsed.has(pg.projectName);
          const pcolor = getProjectColor(pg.projectName);
          return (
            <div key={pg.projectName} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* 案件ヘッダー（クリックで折りたたみ） */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#fff', border: `1px solid ${colors.border}`, borderLeft: `4px solid ${pcolor}`,
                padding: '10px 14px', borderRadius: 4, fontFamily: fontJP,
              }}>
                <button type="button" onClick={() => toggle(pg.projectName)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: colors.textMute, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                  title={isCollapsed ? '展開' : '折りたたみ'}>
                  {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                <span onClick={() => toggle(pg.projectName)}
                  title={pg.projectNameInternal ? `${pg.projectNameInternal}（${pg.projectName}）` : pg.projectName}
                  style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                  {pg.projectNameInternal ? (
                    <>
                      <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{pg.projectNameInternal}</span>
                      <span style={{ fontSize: 12, color: colors.textMute, marginLeft: 6 }}>{pg.projectName}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{pg.projectName}</span>
                  )}
                </span>
                <span style={{ fontSize: 11, color: colors.textMute, flexShrink: 0 }}>{pg.items.length}視点 確認待ち</span>
              </div>
              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginLeft: 22 }}>
                  {pg.items.map(g => (
                    <ReviewCard key={g.key} g={g} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReviewCard({ g }) {
  const { colors, fontJP, now, finalizeReview, reopenReview, setReviewNote, setReviewActualEnd } = useApp();
  const [note, setNote] = useState(g.reviewNote || '');
  // 他端末などで g.reviewNote が更新されたら、編集中でなければ追従
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setNote(g.reviewNote || ''); }, [g.reviewNote, focused]);

  const DAY = 24 * 60 * 60 * 1000;
  const base = g.reviewUpdatedAt || g.reviewAt || g.completedAt || now.getTime();
  const daysSinceUpdate = Math.floor((now.getTime() - base) / DAY);
  const gray = daysSinceUpdate >= REVIEW_GRAY_DAYS;
  const daysLeft = Math.max(0, REVIEW_AUTO_DONE_DAYS - daysSinceUpdate);
  const pcolor = getProjectColor(g.projectName);

  const saveNote = () => {
    setFocused(false);
    if ((note || '') !== (g.reviewNote || '')) setReviewNote(g, note);
  };

  return (
    <div style={{
      background: gray ? '#f1f0ec' : '#fff',
      border: `1px solid ${colors.border}`,
      borderLeft: `4px solid ${gray ? '#b9b6ad' : pcolor}`,
      borderRadius: 4, padding: '12px 14px', fontFamily: fontJP,
      opacity: gray ? 0.7 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#fff',
          background: gray ? '#9aa295' : '#c46a16', borderRadius: 10, padding: '2px 8px', flexShrink: 0,
        }}>確認待ち</span>
        {g.projectNameInternal
          ? (<><span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{g.projectNameInternal}</span>
              <span style={{ fontSize: 11, color: colors.textMute }}>{g.projectName}</span></>)
          : (<span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{g.projectName}</span>)}
        <span style={{ fontSize: 12, color: colors.text }}>／ {g.viewpointName}</span>
        {g.assignee && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: colors.textMute }}>
            <User size={12} /> {g.assignee}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.textMute, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: gray ? colors.textMute : colors.accent }}>あと {daysLeft} 日で自動完了</span>
        </span>
      </div>

      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 11, color: colors.textMute, whiteSpace: 'nowrap' }}>完了時刻</label>
        <input type="datetime-local"
          value={g.actualEnd || ''}
          onChange={(e) => setReviewActualEnd(g, e.target.value)}
          style={{
            padding: '6px 8px', border: `1px solid ${colors.border}`, borderRadius: 4,
            fontFamily: fontJP, fontSize: 12, background: '#fff', color: colors.text, outline: 'none',
          }} />
        <span style={{ fontSize: 10, color: colors.textMute }}>直すとこの時刻を起点に、担当者の残りスケジュールが組み直ります（早く終われば前倒し）</span>
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={saveNote}
          placeholder="追加修正があれば記入（保存すると確認待ちの期限がリセットされます）"
          rows={2}
          style={{
            flex: '1 1 320px', minWidth: 220, resize: 'vertical',
            padding: '8px 10px', boxSizing: 'border-box',
            border: `1px solid ${colors.border}`, borderRadius: 4,
            fontFamily: fontJP, fontSize: 13, background: '#fff', color: colors.text, outline: 'none',
          }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button type="button" onClick={() => finalizeReview(g)}
            title="確認を終えて完了タブへ移します"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: colors.accent, color: '#fff', border: 'none', borderRadius: 4,
              padding: '8px 14px', cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            }}>
            <Check size={14} /> 完了
          </button>
          <button type="button" onClick={() => reopenReview(g)}
            title="確認待ちをやめて進行中案件へ戻します"
            style={{
              background: 'transparent', color: colors.textMute, border: `1px solid ${colors.border}`, borderRadius: 4,
              padding: '6px 12px', cursor: 'pointer', fontFamily: fontJP, fontSize: 12, whiteSpace: 'nowrap',
            }}>
            進行中に戻す
          </button>
        </div>
      </div>
    </div>
  );
}


// ============ 視点グループリスト ============
// 担当者ボード（④）：担当者ごとの進行中案件を一目で把握する一覧。
// 各担当者を1列のカードにし、視点（依頼項目）を納期の近い順にコンパクト表示する。
function AssigneeBoard({ tasks }) {
  const { colors, fontJP, now, assigneeOrder, vpDeliveryCount, caseEditMode } = useApp();
  const todayYmd = fmtYMD(now);
  const soonYmd = fmtYMD(addDays(now, 2));
  const assignees = sortAssigneesByMaster([...new Set((tasks || []).map(t => t.assignee))], assigneeOrder);

  // 納期・終了予定から緊急度を判定して色を返す。
  // 案件編集モード中は納期の警告（超過・本日・間近の色/バッジ）を隠す。
  const urgency = (g) => {
    if (caseEditMode) return { level: 'none', color: colors.border, bg: '#fff', label: '' };
    const dl = g.deadline || '';
    const endYmd = g.scheduledEnd ? fmtYMD(g.scheduledEnd) : null;
    if (dl && (todayYmd > dl || (endYmd && endYmd > dl))) return { level: 'over', color: '#c1272d', bg: '#fbeaea', label: '納期超過' };
    if (dl && dl === todayYmd) return { level: 'today', color: '#d9822b', bg: '#fdf0e2', label: '本日納期' };
    if (dl && dl <= soonYmd) return { level: 'soon', color: '#caa20a', bg: '#fbf7e0', label: '納期間近' };
    return { level: 'none', color: colors.border, bg: '#fff', label: '' };
  };

  if (assignees.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, fontFamily: fontJP }}>
      {assignees.map(a => {
        const aTasks = (tasks || []).filter(t => t.assignee === a);
        const groups = groupByViewpoint(aTasks, vpDeliveryCount);
        // 緊急度→納期→終了予定 の順に並べる
        const rank = { over: 0, today: 1, soon: 2, none: 3 };
        const sorted = groups.map(g => ({ g, u: urgency(g) }))
          .sort((x, y) => (rank[x.u.level] - rank[y.u.level])
            || ((x.g.deadline || '9999') < (y.g.deadline || '9999') ? -1 : 1));
        const remaining = aTasks.reduce((s, t) => s + Math.max(0, (t.hours || 0) - (t.completedHours || 0)), 0);
        const overCount = sorted.filter(s => s.u.level === 'over').length;
        const todayCount = sorted.filter(s => s.u.level === 'today').length;
        const deliveries = groups.reduce((s, g) => s + (g.countAsDelivery !== false ? Math.max(1, g.deliveryCount || 0) : 0), 0);

        return (
          <section key={a} style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* 担当者ヘッダー */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', background: '#fbf9f4', borderBottom: `1px solid ${colors.border}` }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: getProjectColor(a), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{(a || '?').slice(0, 1)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a || '（担当者未設定）'}</div>
                <div style={{ fontSize: 10.5, color: colors.textMute }}>{groups.length}視点 ・ 残 {fmtHM(remaining)} ・ 納品{deliveries}</div>
              </div>
              {overCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#c1272d', borderRadius: 10, padding: '2px 7px' }}>超過{overCount}</span>}
              {todayCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#d9822b', borderRadius: 10, padding: '2px 7px' }}>本日{todayCount}</span>}
            </div>
            {/* 視点リスト */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sorted.length === 0 ? (
                <div style={{ padding: '12px', fontSize: 11.5, color: colors.textMute }}>進行中の案件はありません。</div>
              ) : sorted.map(({ g, u }) => {
                const rem = Math.max(0, (g.totalHours || 0) - (g.completedHours || 0));
                const dl = g.deadline ? new Date(g.deadline + 'T00:00:00') : null;
                return (
                  <div key={g.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px 7px 8px', borderBottom: `1px solid ${colors.bg}`, borderLeft: `3px solid ${u.color}`, background: u.level === 'over' ? u.bg : '#fff' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        title={`${g.projectNameInternal || g.projectName} ／ ${g.viewpointName}`}>
                        {(g.projectNameInternal || g.projectName)} <span style={{ color: colors.textMute, fontWeight: 400 }}>／ {g.viewpointName}</span>
                      </div>
                      <div style={{ fontSize: 10, color: colors.textMute, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {g.companyName && <span>{g.companyName}</span>}
                        <span style={{ color: colors.accent, fontWeight: 600 }}>残 {fmtHM(rem)}</span>
                        {g.scheduledEnd && <span>{fmtMD(g.scheduledEnd)} {minToTime(g.scheduledEndMin)} 完了予定</span>}
                      </div>
                    </div>
                    {dl && (
                      <span style={{ flexShrink: 0, fontSize: 9.5, fontWeight: 700, color: u.level === 'none' ? '#7a8471' : '#fff', background: u.level === 'none' ? '#eef2ea' : u.color, borderRadius: 3, padding: '2px 6px', whiteSpace: 'nowrap' }}
                      title={u.label || 'この視点の納期'}>
                        {fmtMD(dl)}({dayName(dl)})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}


export { SuspendedSection, ReviewSection, ReviewCard, AssigneeBoard, REVIEW_GRAY_DAYS, REVIEW_AUTO_DONE_DAYS };
