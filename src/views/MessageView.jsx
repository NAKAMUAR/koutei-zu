// サマリービュー（会社別の業務連絡文・本日の納品まとめ）。App.jsx から分割。
import { useState, useMemo } from 'react';
import { useApp } from '../appContext.js';
import { addDays, dayName, fmtMD, fmtYMD, fmtYMDJP, getProjectColor, isSameDay, minToTime, priorityColor, sheetsLabel, startOfDay } from '../lib/utils.js';
import { buildDoneSlots, companySequence, groupByViewpoint, sortAssigneesByMaster } from '../lib/schedule.js';
import { Check, MessageSquare, TrendingUp } from 'lucide-react';


// 案件が無くても会社別連絡文に常に表示する会社
const FORCED_COMPANIES = ['TAMAZEN', 'SUMUS'];
// 会社切替の「全社まとめ」を表す内部値（全会社の案件を1通にまとめて案件ごとに表示）
const ALL_COMPANIES = '__all__';
// 案件が無い会社の連絡文。候補からランダムで1つ選んで本文にする。
const NO_PROJECT_GREETINGS = [
  `おはようございます。
何かお手伝いできることがございましたら、いつでもお声がけくださいませ。
本日もどうぞよろしくお願い致します(bow)`,
  `おはようございます。
新規案件がございましたら、ぜひご連絡いただけますと幸いに存じます。

何卒よろしくお願い申し上げます`,
  `おはようございます。
何かお手伝いできることがございましたら、いつでもお声がけくださいませ。

本日も一日、何卒よろしくお願い致します(bow)`,
];
// 業務終了（夕方）で、案件も納品も無い会社の連絡文。候補からランダムで1つ選ぶ。
const NO_PROJECT_GREETINGS_EVENING = [
  `お疲れ様です。
本日もお世話になり、誠にありがとうございました。
引き続きよろしくお願いいたします(bow)`,
  `お疲れ様です。
本日も一日、誠にありがとうございました。
明日もどうぞよろしくお願いいたします(bow)`,
];

// ============ メッセージビュー ============
function MessageView() {
  const { colors, fontJP, fontDisplay, scheduled, settings, assigneeOrder, vpDeliveryCount, notify } = useApp();
  const today = startOfDay(new Date());
  const weekEnd = addDays(today, 7);

  const todayTasks = [];
  for (const task of scheduled.active) {
    for (const slot of task.slots) {
      if (isSameDay(slot.date, today)) todayTasks.push({ task, slot });
    }
  }
  todayTasks.sort((a, b) => a.slot.startMin - b.slot.startMin);

  const weekTasksByAssignee = {};
  for (const task of scheduled.active) {
    for (const slot of task.slots) {
      if (slot.date >= today && slot.date <= weekEnd) {
        if (!weekTasksByAssignee[task.assignee]) weekTasksByAssignee[task.assignee] = [];
        if (!weekTasksByAssignee[task.assignee].find(t => t.task.id === task.id)) {
          weekTasksByAssignee[task.assignee].push({ task });
        }
      }
    }
  }

  const topTasks = [...scheduled.active]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5);

  const allEnds = scheduled.active.map(t => t.scheduledEnd).filter(Boolean);
  const finalEnd = allEnds.length > 0 ? new Date(Math.max(...allEnds.map(d => d.getTime()))) : null;

  const totalHours = scheduled.active.reduce((s, t) => s + t.hours, 0);
  const completedHours = scheduled.active.reduce((s, t) => s + (t.completedHours || 0), 0);
  const remainingHours = totalHours - completedHours;
  const overallProgress = totalHours > 0 ? (completedHours / totalHours) * 100 : 0;

  const remainingByAssignee = {};
  for (const task of scheduled.active) {
    const r = Math.max(0, task.hours - (task.completedHours || 0));
    remainingByAssignee[task.assignee] = (remainingByAssignee[task.assignee] || 0) + r;
  }

  const Section = ({ icon, title, children }) => (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{
        fontFamily: fontDisplay, fontSize: 15, fontWeight: 500,
        margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8,
        paddingBottom: 8, borderBottom: `1px solid ${colors.border}`,
      }}>
        <span style={{ fontSize: 18 }}>{icon}</span>{title}
      </h3>
      {children}
    </div>
  );

  // 担当者ごとの「案件1行表示」用テキスト生成
  const circledNumber = (n) => (n >= 1 && n <= 20) ? String.fromCharCode(0x2460 + n - 1) : `(${n})`;
  const assigneeMessage = useMemo(() => {
    const byAssignee = new Map();
    for (const task of scheduled.active) {
      const a = (task.assignee || '').trim();
      if (!a) continue;
      if (!byAssignee.has(a)) byAssignee.set(a, []);
      const list = byAssignee.get(a);
      // 案件識別子: 社内案件名があればそちら、無ければ社外案件名
      const id = (task.projectNameInternal && task.projectNameInternal.trim()) || task.projectName || '';
      if (id && !list.includes(id)) list.push(id);
    }
    const header = '@All \n本日の案件スケジュールを送りますので、各自担当案件のすべて確認とスケジュール報告をお願いします。';
    const sections = [];
    for (const [assignee, projects] of byAssignee.entries()) {
      if (projects.length === 0) continue;
      const lines = [assignee, ...projects.map((p, i) => `${circledNumber(i + 1)}${p}`)];
      sections.push(lines.join('\n'));
    }
    return [header, ...sections].join('\n\n');
  }, [scheduled.active]);
  const [msgCopied, setMsgCopied] = useState(false);
  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(assigneeMessage);
      setMsgCopied(true);
      setTimeout(() => setMsgCopied(false), 1500);
    } catch (e) { notify('コピーに失敗しました: ' + e, { type: 'error' }); }
  };

  // ===== 会社別 業務連絡文（挨拶文形式） =====
  const allGroups = useMemo(() => groupByViewpoint(scheduled.active, vpDeliveryCount), [scheduled.active, vpDeliveryCount]);
  // 完了タスクの「着手日」復元：actualEnd から制作時間ぶん遡った最早スロット日（タスクID→Date）
  const doneStartByTask = useMemo(() => {
    const m = new Map();
    for (const { task, slot } of buildDoneSlots(scheduled.done, settings)) {
      const cur = m.get(task.id);
      if (cur == null || slot.date.getTime() < cur.getTime()) m.set(task.id, slot.date);
    }
    return m;
  }, [scheduled.done, settings]);
  // 会社一覧（スケジュール順）
  const companies = useMemo(() => {
    const seq = companySequence(scheduled.active);
    const set = [...new Set(scheduled.active.map(t => t.companyName || ''))];
    const sorted = set.sort((a, b) => {
      const sa = seq.has(a) ? seq.get(a) : Infinity, sb = seq.has(b) ? seq.get(b) : Infinity;
      return sa - sb;
    });
    // 案件の有無に関わらず常に表示する会社を末尾に追加（既にあれば重複させない）
    for (const fc of FORCED_COMPANIES) if (!sorted.includes(fc)) sorted.push(fc);
    return sorted;
  }, [scheduled.active]);
  const [msgCompany, setMsgCompany] = useState(null);
  const [msgMode, setMsgMode] = useState('morning'); // 'morning'=業務開始 / 'evening'=業務終了
  // 既定は「全社まとめ」。個別会社を選べば従来どおりその会社だけの連絡文になる。
  const curCompany = (msgCompany !== null && (msgCompany === ALL_COMPANIES || companies.includes(msgCompany))) ? msgCompany : ALL_COMPANIES;

  const fmtDateDow = (d) => `${fmtMD(d)}(${dayName(d)})`;
  const buildCompanyMessage = (company, mode = 'morning') => {
    const evening = mode === 'evening';
    const isAll = company === ALL_COMPANIES;
    const matchCompany = (c) => isAll || (c || '') === company;
    // 案件（projectName）ごとに、スケジュール順（scheduled.active の並び）で1エントリ
    const projectsInOrder = [];
    const seen = new Set();
    for (const t of scheduled.active) {
      if (!matchCompany(t.companyName)) continue;
      const p = t.projectName || '(案件名未設定)';
      if (!seen.has(p)) { seen.add(p); projectsInOrder.push(p); }
    }
    // ===== 本日納品分（納品済み）を案件ごとに集計 =====
    const todayYmd = fmtYMD(new Date());
    const deliveryDateOf = (t) => {
      if (t.actualEnd) { const d = new Date(t.actualEnd); if (!isNaN(d.getTime())) return d; }
      if (t.completedAt) { const d = new Date(t.completedAt); if (!isNaN(d.getTime())) return d; }
      return null;
    };
    const deliveredMap = new Map(); // 案件名 → 完了タスク配列（本日納品・中止除く）
    const deliveredOrder = [];
    for (const t of scheduled.done) {
      if (!matchCompany(t.companyName) || t.cancelled) continue;
      const dd = deliveryDateOf(t);
      if (!dd || fmtYMD(dd) !== todayYmd) continue;
      const p = t.projectName || '(案件名未設定)';
      if (!deliveredMap.has(p)) { deliveredMap.set(p, []); deliveredOrder.push(p); }
      deliveredMap.get(p).push(t);
    }

    // 案件も本日納品も無い会社（例：TAMAZEN / SUMUS で当日タスクなし）は、挨拶文をランダムで返す
    if (projectsInOrder.length === 0 && deliveredOrder.length === 0) {
      const pool = evening ? NO_PROJECT_GREETINGS_EVENING : NO_PROJECT_GREETINGS;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    const lines = evening
      ? ['お疲れ様です。', '本日の業務の進捗結果および作業予定は以下の通りです。', '']
      : ['お世話になっております。', '本日の業務を開始いたします。', '各案件の進捗および作業予定は以下の通りです。', ''];
    if (projectsInOrder.length > 0) lines.push('■作業予定');
    let i = 0;
    for (const p of projectsInOrder) {
      i++;
      const vpGroups = allGroups.filter(g => g.projectName === p && matchCompany(g.companyName));
      const total = vpGroups.reduce((s, g) => s + g.totalHours, 0);
      const done = vpGroups.reduce((s, g) => s + g.completedHours, 0);
      const pct = total > 0 ? Math.round(done / total * 100) : 0;
      const status = pct >= 100 ? '（完了）' : (pct > 0 ? '（制作中）' : '');
      const contact = (vpGroups.find(g => g.customerContact) || {}).customerContact || '';
      // 制作枚数：視点（依頼項目）を外観(EX)／内観(IN)に分類し、各分類の視点数を「分類N枚」で
      // 例）視点 EX2, EX1, EX3, IN → 「外観3枚+内観1枚」
      const sheets = sheetsLabel(vpGroups.map(g => g.viewpointName));
      // 着手・納期：案件内の最早開始～最遅終了
      let sTs = null, eTs = null, sD = null, eD = null;
      for (const g of vpGroups) {
        if (g.scheduledStart) { const ts = g.scheduledStart.getTime() + (g.scheduledStartMin || 0) * 60000; if (sTs == null || ts < sTs) { sTs = ts; sD = g.scheduledStart; } }
        if (g.scheduledEnd) { const ts = g.scheduledEnd.getTime() + (g.scheduledEndMin || 0) * 60000; if (eTs == null || ts > eTs) { eTs = ts; eD = g.scheduledEnd; } }
      }
      lines.push(`【${circledNumber(i)}${p}】`);
      if (contact) lines.push(`担当者様：${contact}ご担当`);
      lines.push(`進捗状況：${pct}%${status}`);
      if (sheets) lines.push(`制作枚数：${sheets}`);
      if (sD) lines.push(`着手予定：${fmtDateDow(sD)}`);
      if (eD) lines.push(`納期予定：${fmtDateDow(eD)}`);
      lines.push('');
    }
    // ===== ■納品済み（本日納品分） =====
    if (deliveredOrder.length > 0) {
      lines.push('■納品済み');
      for (const p of deliveredOrder) {
        const dtasks = deliveredMap.get(p);
        const contact = (dtasks.find(t => t.customerContact) || {}).customerContact || '';
        // 制作枚数：作業予定と同じく外観(EX)／内観(IN)の視点数で集計
        const sheets = sheetsLabel([...new Set(dtasks.map(t => (t.viewpointName || '').trim()).filter(Boolean))]);
        // 納品日＝実終了日の最遅、着手日＝復元スロットの最早（無ければ納品日）
        let delTs = null, delD = null, stTs = null, stD = null;
        for (const t of dtasks) {
          const dd = deliveryDateOf(t);
          if (dd && (delTs == null || dd.getTime() > delTs)) { delTs = dd.getTime(); delD = dd; }
          const sd = doneStartByTask.get(t.id);
          if (sd && (stTs == null || sd.getTime() < stTs)) { stTs = sd.getTime(); stD = sd; }
        }
        if (!stD) stD = delD;
        lines.push(`【${p}】`);
        if (contact) lines.push(`担当者様：${contact}ご担当`);
        lines.push('進捗状況：100%（納品済み）');
        if (sheets) lines.push(`制作枚数：${sheets}`);
        if (stD) lines.push(`着手予定：${fmtDateDow(stD)}`);
        if (delD) lines.push(`納期予定：${fmtDateDow(delD)}`);
        lines.push('');
      }
    }
    lines.push(evening ? '本日もありがとうございました(bow)' : '以上になります、本日もよろしくお願いいたします');
    return lines.join('\n');
  };
  const companyText = useMemo(() => curCompany !== undefined ? buildCompanyMessage(curCompany, msgMode) : '', [curCompany, msgMode, allGroups, scheduled.active, scheduled.done, doneStartByTask]);
  const [companyCopied, setCompanyCopied] = useState(false);
  const copyCompanyText = async () => {
    try {
      await navigator.clipboard.writeText(companyText);
      setCompanyCopied(true);
      setTimeout(() => setCompanyCopied(false), 1500);
    } catch (e) { notify('コピーに失敗しました: ' + e, { type: 'error' }); }
  };
  const companyLabel = (c) => c || '（会社未設定）';

  if (scheduled.active.length === 0) {
    return (
      <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6, padding: 48, textAlign: 'center', color: colors.textMute }}>
        <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
        <div>進行中のタスクがありません</div>
      </div>
    );
  }

  const renderTaskLabel = (task) => (
    <>
      <span style={{ fontWeight: 500 }}>{task.projectName}</span>
      <span style={{ color: colors.textMute, margin: '0 4px' }}>／</span>
      <span style={{ fontWeight: 500 }}>{task.viewpointName}</span>
      {task.stepName && (
        <>
          <span style={{ color: colors.textMute, margin: '0 4px' }}>／</span>
          <span style={{ color: colors.textMute }}>{task.stepName}</span>
        </>
      )}
    </>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 20, margin: 0, fontWeight: 500 }}>進捗サマリー</h2>
        <span style={{ fontSize: 12, color: colors.textMute }}>
          {today.getFullYear()}年{today.getMonth() + 1}月{today.getDate()}日 ({dayName(today)}) 時点
        </span>
      </div>

      {/* 会社別 業務連絡文（挨拶文形式） */}
      <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6, padding: 24, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 16, margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={16} /> 業務連絡文（全社まとめ／会社別）
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* 業務開始（朝）／業務終了（夕）の切替 */}
            <div style={{ display: 'flex', border: `1px solid ${colors.border}`, borderRadius: 4, overflow: 'hidden' }}>
              {[{ id: 'morning', label: '業務開始（朝）' }, { id: 'evening', label: '業務終了（夕）' }].map(m => (
                <button key={m.id} type="button" onClick={() => setMsgMode(m.id)}
                  style={{
                    padding: '7px 12px', border: 'none', cursor: 'pointer', fontFamily: fontJP, fontSize: 12,
                    background: msgMode === m.id ? colors.text : '#fff',
                    color: msgMode === m.id ? '#fff' : colors.text, fontWeight: msgMode === m.id ? 600 : 400,
                  }}>
                  {m.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={copyCompanyText}
              style={{ padding: '8px 16px', background: companyCopied ? colors.progress : colors.text, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              {companyCopied ? <><Check size={15} /> コピーしました</> : <>{curCompany === ALL_COMPANIES ? '連絡文をコピー' : 'この会社の連絡文をコピー'}</>}
            </button>
          </div>
        </div>
        {/* 会社の切り替え（全社まとめ＋個別会社） */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {[ALL_COMPANIES, ...companies].map(c => (
            <button key={c || '__none__'} type="button" onClick={() => setMsgCompany(c)}
              style={{
                padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12,
                border: `1px solid ${c === curCompany ? colors.text : colors.border}`,
                background: c === curCompany ? colors.text : '#fff',
                color: c === curCompany ? '#fff' : colors.text, fontWeight: c === curCompany ? 600 : 400,
              }}>
              {c === ALL_COMPANIES ? '全社まとめ' : companyLabel(c)}
            </button>
          ))}
        </div>
        <textarea readOnly value={companyText}
          onFocus={(e) => e.target.select()}
          style={{
            width: '100%', minHeight: 320, boxSizing: 'border-box', resize: 'vertical',
            border: `1px solid ${colors.border}`, borderRadius: 4, padding: 14,
            fontFamily: fontJP, fontSize: 13, lineHeight: 1.7, color: colors.text, background: '#fbf9f4', whiteSpace: 'pre-wrap',
          }} />
        <div style={{ fontSize: 10, color: colors.textMute, marginTop: 8 }}>
          ※ 「全社まとめ」は全会社の案件を1通にまとめて案件ごとに表示します（会社を選ぶとその会社だけ） ・ 「業務開始（朝）／業務終了（夕）」で挨拶文を切り替えます ・ 制作枚数は視点(依頼項目)を外観(EX)／内観(IN)で分類した件数です ・ 「■納品済み」は本日納品分（実終了日が本日の完了案件）を表示します
        </div>
      </div>

      <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6, padding: 28 }}>
        <div style={{
          background: '#fbf9f4', borderRadius: 4, padding: 16, marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <TrendingUp size={24} color={colors.progress} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 12, color: colors.textMute, marginBottom: 4 }}>全体進捗</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <span style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 700 }}>{completedHours}h</span>
              <span style={{ fontSize: 13, color: colors.textMute }}>/ {totalHours}h ({overallProgress.toFixed(1)}%)</span>
              <span style={{ marginLeft: 'auto', fontSize: 13, color: colors.accent, fontWeight: 600 }}>残 {remainingHours}h</span>
            </div>
            <div style={{ height: 6, background: '#f0ebde', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${overallProgress}%`, background: colors.progress, transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>

        <Section icon="💬" title="担当者ごとの案件メッセージ（コピー用）">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button onClick={copyMessage}
              style={{
                padding: '6px 14px',
                background: msgCopied ? colors.progress : colors.text,
                color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: "'Noto Sans JP', sans-serif",
              }}>
              {msgCopied ? '✓ コピーしました' : 'クリップボードへコピー'}
            </button>
          </div>
          <textarea readOnly value={assigneeMessage}
            style={{
              width: '100%', minHeight: 240,
              padding: 12, border: `1px solid ${colors.border}`, borderRadius: 4,
              fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6,
              background: '#fbf9f4', color: colors.text, resize: 'vertical', boxSizing: 'border-box',
            }} />
          <div style={{ fontSize: 10, color: colors.textMute, marginTop: 6 }}>
            ※ 進行中案件から自動生成。案件識別子は「社内案件名」を優先（無ければ社外案件名）。表示順は登録順。
          </div>
        </Section>

        <Section icon="📅" title="本日のタスク">
          {todayTasks.length === 0 ? (
            <p style={{ color: colors.textMute, fontSize: 13, margin: 0 }}>本日割り当てられているタスクはありません。</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayTasks.map(({ task, slot }, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, flexWrap: 'wrap' }}>
                  <span style={{
                    background: priorityColor(task.priority), color: '#fff',
                    padding: '2px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700, minWidth: 24, textAlign: 'center',
                  }}>#{task.priority}</span>
                  <span style={{ width: 4, height: 20, background: getProjectColor(task.projectName), borderRadius: 2 }} />
                  <span style={{ minWidth: 60, color: colors.textMute, fontSize: 12 }}>{task.assignee}</span>
                  <span>{renderTaskLabel(task)}</span>
                  <span style={{ marginLeft: 'auto', color: colors.textMute, fontSize: 11 }}>
                    {minToTime(slot.startMin)}〜{minToTime(slot.endMin)} ({slot.hours}h)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {topTasks.length > 0 && (
          <Section icon="🔥" title="優先度の高いタスク（上位5件）">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topTasks.map((task, i) => {
                const remaining = Math.max(0, task.hours - (task.completedHours || 0));
                return (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, flexWrap: 'wrap' }}>
                    <span style={{
                      background: priorityColor(task.priority), color: '#fff',
                      padding: '2px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700, minWidth: 24, textAlign: 'center',
                    }}>#{task.priority}</span>
                    <span style={{ width: 4, height: 20, background: getProjectColor(task.projectName), borderRadius: 2 }} />
                    <span>{renderTaskLabel(task)}</span>
                    <span style={{ color: colors.textMute, fontSize: 11 }}>/ {task.assignee}</span>
                    <span style={{ color: colors.textMute, fontSize: 11 }}>残 {remaining}h</span>
                    <span style={{ marginLeft: 'auto', color: colors.accent, fontWeight: 500, fontSize: 12 }}>
                      {task.scheduledStart ? `${fmtMD(task.scheduledStart)} ${minToTime(task.scheduledStartMin)}` : '-'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        <Section icon="📊" title="今週の予定（担当者別）">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {sortAssigneesByMaster(Object.keys(weekTasksByAssignee), assigneeOrder).map((assignee) => { const items = weekTasksByAssignee[assignee]; return (
              <div key={assignee} style={{ background: '#fbf9f4', borderRadius: 4, padding: 14 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{assignee}</span>
                  <span style={{ fontSize: 10, color: colors.textMute, fontWeight: 400 }}>
                    残 {remainingByAssignee[assignee] || 0}h
                  </span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {items.map(({ task }, i) => {
                    const r = Math.max(0, task.hours - (task.completedHours || 0));
                    return (
                      <li key={i} style={{ fontSize: 11, color: colors.text, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          background: priorityColor(task.priority), color: '#fff',
                          padding: '0 4px', borderRadius: 2, fontSize: 9, fontWeight: 700,
                        }}>#{task.priority}</span>
                        <span>{task.viewpointName}{task.stepName ? `（${task.stepName}）` : ''}</span>
                        <span style={{ color: colors.textMute }}>(残{r}h)</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ); })}
          </div>
        </Section>

        {finalEnd && (
          <Section icon="⏰" title="全タスク完了予測">
            <div style={{ background: colors.accentSoft, padding: 16, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 12, color: colors.textMute, marginBottom: 4 }}>現在のペースで進めた場合</div>
                <div style={{ fontFamily: fontDisplay, fontSize: 22, color: colors.accent, fontWeight: 700 }}>
                  {fmtYMDJP(finalEnd)} ({dayName(finalEnd)})
                </div>
              </div>
              <div style={{ fontSize: 11, color: colors.textMute, textAlign: 'right' }}>
                残 {remainingHours}時間 / {scheduled.active.length}タスク
              </div>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}


export { MessageView };
