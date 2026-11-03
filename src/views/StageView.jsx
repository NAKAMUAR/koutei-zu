// 進行状況ビュー（案件タブの「進行状況」）：視点ごとに「今どの段階か」を一覧にする。
// 仮登録 → 翻訳待ち → 時間計算待ち → 制作待ち → 制作中 → 納品済み → 請求待ち → 請求済み（修正が入ると 修正中）。
// 段階はタスクの状態から自動で決まる（src/lib/stage.js）。この画面で行う操作は
//   ・仮登録を外す ・翻訳済みのチェック ・確認日 ・売上月 ・納品完了 ・請求書を発行した
// と、AIで読んだ進捗の取り込み（ProgressImport）。
import { useMemo, useState } from 'react';
import { Bot, Check, Search } from 'lucide-react';
import { useApp } from '../appContext.js';
import { fmtYMD, getProjectColor } from '../lib/utils.js';
import { STAGES, STAGE_BY_ID, computeViewpointStages } from '../lib/stage.js';
import { MonthSelect } from '../components/common.jsx';
import { ProgressImport } from './ProgressImport.jsx';

const ALARM_MS = 2 * 60 * 60 * 1000; // 時間計算待ちのアラーム（連携シートの通知と同じ 2時間）

function fmtElapsed(ms) {
  if (!(ms > 0)) return '0分';
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}分`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}時間${min % 60 ? `${min % 60}分` : ''}`;
  return `${Math.floor(h / 24)}日`;
}
function fmtMDHM(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function fmtMDDate(ymd) {
  const m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[2])}/${Number(m[3])}` : '';
}
const ymOf = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function StageView() {
  const { colors, fontJP, fontDisplay, tasks, scheduled, now, salesLedger, patchTasksByIds, notify } = useApp();
  const [filter, setFilter] = useState('open'); // 'open'（請求済み以外）/ 'all' / 段階ID
  const [q, setQ] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const entries = useMemo(
    () => computeViewpointStages(tasks, scheduled.active, now, salesLedger),
    [tasks, scheduled.active, now, salesLedger]
  );
  const counts = useMemo(() => {
    const m = new Map();
    for (const e of entries) m.set(e.stage, (m.get(e.stage) || 0) + 1);
    return m;
  }, [entries]);

  const ql = q.trim().toLowerCase();
  const shown = entries.filter(e => {
    if (filter === 'open' && e.stage === 'billed') return false;
    if (filter !== 'open' && filter !== 'all' && e.stage !== filter) return false;
    if (!ql) return true;
    return [e.projectName, e.projectNameInternal, e.companyName, e.viewpointName, e.viewpointNameExternal, ...e.assignees]
      .some(v => String(v || '').toLowerCase().includes(ql));
  });
  const byStage = STAGES.map(s => ({ stage: s, items: shown.filter(e => e.stage === s.id) })).filter(x => x.items.length > 0);
  const alarmCount = entries.filter(e => e.stage === 'estimate' && e.translatedAt && now.getTime() - e.translatedAt >= ALARM_MS).length;

  const chip = (id, label, count, color) => {
    const active = filter === id;
    return (
      <button key={id} type="button" onClick={() => setFilter(id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 14, cursor: 'pointer',
          fontFamily: fontJP, fontSize: 12, fontWeight: 600,
          background: active ? (color || colors.text) : '#fff', color: active ? '#fff' : (color || colors.text),
          border: `1px solid ${color || colors.border}`,
        }}>
        {label}<span style={{ fontSize: 11, opacity: 0.85 }}>{count}</span>
      </button>
    );
  };

  return (
    <section>
      <h2 style={{ fontFamily: fontDisplay, fontSize: 18, margin: '0 0 6px 0', fontWeight: 500, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        進行状況
        <span style={{ fontSize: 12, color: colors.textMute, fontFamily: fontJP }}>視点ごとに、今どの段階かを自動で表示します</span>
      </h2>
      {alarmCount > 0 && (
        <div style={{ margin: '8px 0 12px', padding: '8px 12px', background: colors.accentSoft, border: `1px solid ${colors.accent}`, borderRadius: 4, fontSize: 12, color: colors.accent, fontFamily: fontJP, fontWeight: 600 }}>
          翻訳済み（依頼）から2時間以上たっても制作時間が出ていない視点が {alarmCount} 件あります
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', margin: '10px 0 8px' }}>
        {chip('open', '進行中すべて', entries.filter(e => e.stage !== 'billed').length)}
        {STAGES.map(s => (counts.get(s.id) ? chip(s.id, s.label, counts.get(s.id), s.color) : null))}
        {chip('all', '請求済みも表示', entries.length)}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${colors.border}`, borderRadius: 4, background: '#fff', padding: '4px 8px', flex: '1 1 220px', maxWidth: 360 }}>
          <Search size={13} color={colors.textMute} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="案件名・社内案件名・視点・担当者で検索"
            style={{ border: 'none', outline: 'none', fontFamily: fontJP, fontSize: 12, flex: 1, minWidth: 0, background: 'transparent' }} />
        </div>
        <button type="button" onClick={() => setImportOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#fff', border: `1px solid ${colors.text}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, fontWeight: 600, color: colors.text }}>
          <Bot size={14} />進捗の取り込み（AI）
        </button>
      </div>

      {byStage.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: colors.textMute, fontFamily: fontJP, fontSize: 13, background: '#fff', border: `1px dashed ${colors.border}`, borderRadius: 4 }}>
          該当する視点はありません
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {byStage.map(({ stage, items }) => (
          <div key={stage.id}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 6, fontFamily: fontJP }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: stage.color, borderRadius: 10, padding: '2px 10px' }}>{stage.label}</span>
              <span style={{ fontSize: 12, color: colors.textMute }}>{items.length}件 ・ {stage.hint}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map(e => (
                <StageRow key={e.key} e={e} now={now} patch={patchTasksByIds} notify={notify} colors={colors} fontJP={fontJP} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {importOpen && <ProgressImport onClose={() => setImportOpen(false)} />}
    </section>
  );
}

function StageRow({ e, now, patch, notify, colors, fontJP }) {
  const st = STAGE_BY_ID[e.stage];
  const nowTs = now.getTime();
  const pcolor = getProjectColor(e.projectName);
  const btn = (primary) => ({
    display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
    fontFamily: fontJP, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
    background: primary ? st.color : '#fff', color: primary ? '#fff' : colors.textMute,
    border: `1px solid ${primary ? st.color : colors.border}`,
  });
  const small = { fontSize: 11, color: colors.textMute };
  const inputStyle = { padding: '3px 6px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 12, background: '#fff' };

  // 納期の見込み（制作待ち・制作中・修正中）
  const late = e.endTs && e.deadline && fmtYMD(new Date(e.endTs)) > String(e.deadline).slice(0, 10);

  let info = null;
  let actions = null;
  const monthSelect = (
    <label style={{ display: 'flex', alignItems: 'center', gap: 4, ...small }}>
      売上月
      <MonthSelect value={e.settlementMonth} now={now}
        onChange={(v) => patch(e.ids, { settlementMonth: v })}
        title="この視点の売上を計上する月（売上登録表へ反映）。空なら依頼日の月"
        style={{ ...inputStyle, cursor: 'pointer' }} />
      {!e.settlementMonth && e.deliveredAt && (
        <button type="button" onClick={() => patch(e.ids, { settlementMonth: ymOf(e.deliveredAt) })}
          style={{ ...btn(false), padding: '2px 8px', fontSize: 11 }}>納品月にする</button>
      )}
    </label>
  );

  if (e.stage === 'tentative') {
    info = <span style={small}>登録 {fmtMDHM(e.since)}</span>;
    actions = (
      <button type="button" style={btn(true)} onClick={() => patch(e.pendingIds, { tentative: false })}>
        仮登録を外す
      </button>
    );
  } else if (e.stage === 'translate' || e.stage === 'estimate') {
    const waited = e.translatedAt ? nowTs - e.translatedAt : 0;
    info = e.translatedAt
      ? <span style={{ ...small, color: waited >= ALARM_MS ? colors.accent : colors.textMute, fontWeight: waited >= ALARM_MS ? 700 : 400 }}>
          依頼 {fmtMDHM(e.translatedAt)}（{fmtElapsed(waited)}経過）
        </span>
      : <span style={small}>登録 {fmtMDHM(e.since)}</span>;
    actions = (
      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', fontFamily: fontJP, color: colors.text }}>
        <input type="checkbox" checked={!!e.translatedAt}
          onChange={(ev) => patch(e.zeroIds, { translatedAt: ev.target.checked ? Date.now() : null })} />
        翻訳済み（工程図で直接登録した視点用）
      </label>
    );
  } else if (e.stage === 'scheduled' || e.stage === 'producing' || e.stage === 'fixing') {
    info = (
      <span style={small}>
        {e.stage === 'scheduled' && e.since ? `開始予定 ${fmtMDHM(e.since)} ・ ` : ''}
        完了 {Math.round(e.completedHours * 10) / 10}/{Math.round(e.totalHours * 10) / 10}h
        {e.endTs ? ` ・ 終了予定 ${fmtMDHM(e.endTs)}` : ''}
        {late && <span style={{ color: colors.accent, fontWeight: 700 }}> ・ 納期に間に合わない見込み</span>}
      </span>
    );
  } else if (e.stage === 'delivered') {
    const okBy = e.deliveryCheckedAt && e.deliveryCheckedBy;
    const nChecked = Object.values(e.deliveryChecks || {}).filter(Boolean).length;
    info = (
      <span style={small}>
        納品 {fmtMDHM(e.deliveredAt)} ・ <span style={{ color: okBy ? colors.progress : colors.accent, fontWeight: 600 }}>
          {okBy ? `納品前チェックOK（${e.deliveryCheckedBy}）` : `納品前チェック ${nChecked}項目済み（「進行中一覧」の確認待ちで入力）`}
        </span>
      </span>
    );
    actions = (
      <>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, ...small }}>
          確認日
          <input type="date" value={e.reviewDueDate || ''} style={inputStyle}
            onChange={(ev) => patch(e.reviewIds, { reviewDueDate: ev.target.value || null })} />
        </label>
        {monthSelect}
        <button type="button" style={btn(true)} onClick={() => patch(e.reviewIds, { reviewState: null })}>
          <Check size={13} />納品完了
        </button>
      </>
    );
  } else if (e.stage === 'billing') {
    info = <span style={small}>納品 {fmtMDHM(e.deliveredAt)}{e.deliveredAt ? `（${fmtElapsed(nowTs - e.deliveredAt)}前）` : ''}</span>;
    actions = (
      <>
        {monthSelect}
        <button type="button" style={btn(true)}
          onClick={() => {
            const ids = e.ids;
            patch(ids, { invoiceCheckedAt: Date.now() });
            notify('請求済みにしました', { type: 'success', undo: () => patch(ids, { invoiceCheckedAt: null }) });
          }}>
          <Check size={13} />請求書を発行した
        </button>
      </>
    );
  } else if (e.stage === 'billed') {
    info = <span style={small}>納品 {fmtMDHM(e.deliveredAt)}{e.settlementMonth ? ` ・ 売上月 ${e.settlementMonth.replace('-', '年')}月` : ''}</span>;
  }

  return (
    <div className="kz-row" style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      background: '#fff', border: `1px solid ${colors.border}`, borderLeft: `4px solid ${pcolor}`,
      borderRadius: 4, padding: '8px 12px', fontFamily: fontJP,
    }}>
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          {e.projectNameInternal && <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{e.projectNameInternal}</span>}
          <span style={{ fontSize: e.projectNameInternal ? 11 : 13, fontWeight: e.projectNameInternal ? 400 : 700, color: e.projectNameInternal ? colors.textMute : colors.text }}>{e.projectName}</span>
          <span style={{ fontSize: 12, color: colors.text }}>／ {e.viewpointNameExternal || e.viewpointName}</span>
          {e.viewpointNameExternal && e.viewpointNameExternal !== e.viewpointName && <span style={small}>（{e.viewpointName}）</span>}
          {e.isRevision && e.stage !== 'fixing' && (
            <span style={{ fontSize: 10, color: '#fff', background: STAGE_BY_ID.fixing.color, borderRadius: 8, padding: '1px 6px' }}>修正の回</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2, alignItems: 'baseline' }}>
          {e.companyName && <span style={small}>{e.companyName}</span>}
          {e.assignees.length > 0 && <span style={small}>担当 {e.assignees.join('・')}</span>}
          {e.deadline && <span style={{ ...small, color: late ? colors.accent : colors.textMute }}>納期 {fmtMDDate(e.deadline)}</span>}
          {info}
        </div>
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}
