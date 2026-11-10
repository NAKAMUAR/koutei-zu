// 連絡文・作業表からまとめて登録（案件タブ）。
// ・【案件名】ごとの連絡文を貼ると、仮案件としてまとめて登録する
// ・「A担当：2LDKA（合計49.5h）」＋「| IN1 | 3 | … |」の作業表を貼ると、1つの案件の部屋（視点）ごとの作業として登録する
// 読み取り・作業づくりは src/lib/bulkTentative.js。着手予定がある案件はその日の朝から、
// 「確認中」の案件は開始を決めずスケジュールの空いているところに入る。
import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../appContext.js';
import { Combobox } from '../../components/common.jsx';
import { buildRoomRecords, buildTentativeRecords, historyHours, parseRoomTables, parseTentativeText } from '../../lib/bulkTentative.js';
import { fixedAssigneeFor } from '../../lib/companyAssignee.js';
import { deadlineInsertPriority, deadlineKey } from '../../lib/schedule.js';

const CAT_LABEL = { 外観: '外観', 内観: '内観', '': '区分なし（枚数だけ）' };

function BulkTentativeModal({ onClose }) {
  const {
    colors, fontJP, fontDisplay, tasks, companyList, assigneeList, employeeMaster, customerMaster,
    stepTypeMaster, settings, addTasks, removeTasksByIds, notify,
  } = useApp();
  const [text, setText] = useState('');
  const [company, setCompany] = useState('');
  const [assignee, setAssignee] = useState('');
  const [hoursEdit, setHoursEdit] = useState({}); // { 外観: { white, color } } 手で直した分

  const projects = useMemo(() => parseTentativeText(text, new Date()), [text]);
  // 作業表（【案件名】が無いとき）
  const table = useMemo(() => (projects.length ? { groups: [] } : parseRoomTables(text, new Date())), [text, projects.length]);
  const isTable = !projects.length && table.groups.length > 0;
  const [projName, setProjName] = useState('');
  const [projInternal, setProjInternal] = useState('');
  const [groupAssignees, setGroupAssignees] = useState({});
  const [tableTentative, setTableTentative] = useState(false);
  const cats = useMemo(() => [...new Set(projects.flatMap(p => (p.cuts.length ? p.cuts : [{ category: '' }]).map(c => c.category)))], [projects]);
  // 1枚あたりの時間：手で直していなければ、その会社の過去の作業の目安
  const hours = useMemo(() => {
    const out = {};
    for (const c of cats) {
      const h = historyHours(tasks, company, c);
      out[c] = { white: h.white ?? '', color: h.color ?? '', ...(hoursEdit[c] || {}) };
    }
    return out;
  }, [cats, tasks, company, hoursEdit]);
  const setHour = (cat, kind, v) => setHoursEdit(prev => ({ ...prev, [cat]: { ...(prev[cat] || {}), [kind]: v } }));
  const perCut = (cat) => (Number(hours[cat]?.white) || 0) + (Number(hours[cat]?.color) || 0);
  const missingHours = cats.filter(c => perCut(c) <= 0);

  const chooseCompany = (v) => {
    const prevAuto = fixedAssigneeFor(employeeMaster, company, customerMaster);
    if (!assignee.trim() || assignee === prevAuto) setAssignee(fixedAssigneeFor(employeeMaster, v, customerMaster) || '');
    setCompany(v);
  };

  const tableAssigneeMissing = table.groups.some(g => !(groupAssignees[g.label] || '').trim());
  const canSubmitTable = isTable && projName.trim() && company.trim() && !tableAssigneeMissing;
  const canSubmit = isTable ? canSubmitTable : (projects.length > 0 && company.trim() && assignee.trim() && missingHours.length === 0);
  const submit = () => {
    if (!canSubmit) return;
    if (isTable) {
      const active = tasks.filter(t => t.status !== 'done' && (t.companyName || '') === company.trim());
      const records = buildRoomRecords(table, {
        projectName: projName, projectNameInternal: projInternal, company, assignees: groupAssignees,
        tentative: tableTentative, morningStart: settings?.morningStart, now: Date.now(),
        priority: deadlineInsertPriority(active, Infinity),
      });
      addTasks(records);
      const ids = records.map(r => r.id);
      notify(`「${projName.trim()}」に ${records.length} 部屋の作業を登録しました`, { type: 'success', undo: () => removeTasksByIds(ids) });
      onClose();
      return;
    }
    const active = tasks.filter(t => t.status !== 'done' && (t.companyName || '') === company.trim());
    const records = buildTentativeRecords(projects, {
      company, assignee, hours, stepTypeMaster, morningStart: settings?.morningStart, now: Date.now(),
      priorityOf: (p) => deadlineInsertPriority(active, deadlineKey(p.end)),
    });
    if (!records.length) { notify('登録できる作業がありません（時間を確かめてください）', { type: 'error' }); return; }
    addTasks(records);
    const ids = records.map(r => r.id);
    notify(`${projects.length} 案件（${records.length} 作業）を仮登録しました`, { type: 'success', undo: () => removeTasksByIds(ids) });
    onClose();
  };

  const input = { padding: '7px 9px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 13, boxSizing: 'border-box' };
  const label = { fontSize: 11, fontWeight: 700, color: colors.textMute, marginBottom: 4, display: 'block' };
  const fmt = (d) => (d ? d.slice(5).replace('-', '/') : '');

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, width: '100%', maxWidth: 820, maxHeight: '90vh', display: 'flex', flexDirection: 'column', fontFamily: fontJP, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 17, margin: 0, fontWeight: 600 }}>連絡文・作業表からまとめて登録</h3>
          <button type="button" onClick={onClose} title="閉じる" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMute, display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ overflowY: 'auto', padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={label}>連絡文（【案件名】ごとに 担当者様・制作枚数・着手予定・納品予定）、または部屋ごとの作業表（「A担当：2LDKA（合計49.5h）」＋「| IN1 | 3 | … |」）</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} autoFocus
              placeholder={'【〇〇様】\n担当者様：〇〇様\n制作状況：0%（確認中）\n制作枚数：外観1枚＋内観1枚\n着手予定：11/11（水）\n納品予定：11/16（月）'}
              style={{ ...input, width: '100%', resize: 'vertical', fontSize: 12 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div>
              <label style={label}>会社名</label>
              <Combobox value={company} onChange={chooseCompany} options={companyList || []} placeholder="一覧から選択／入力"
                inputStyle={{ ...input, width: '100%' }} colors={colors} fontJP={fontJP} />
            </div>
            {isTable ? (<>
              <div>
                <label style={label}>社外案件名</label>
                <input type="text" value={projName} onChange={(e) => setProjName(e.target.value)} placeholder="例: 有明" style={{ ...input, width: '100%' }} />
              </div>
              <div>
                <label style={label}>社内案件名（任意）</label>
                <input type="text" value={projInternal} onChange={(e) => setProjInternal(e.target.value)} placeholder="例: REN.94" style={{ ...input, width: '100%' }} />
              </div>
            </>) : (
              <div>
                <label style={label}>担当者（ラボ契約の担当が自動で入ります）</label>
                <Combobox value={assignee} onChange={setAssignee} options={assigneeList || []} placeholder="一覧から選択／入力"
                  inputStyle={{ ...input, width: '100%' }} colors={colors} fontJP={fontJP} />
              </div>
            )}
          </div>
          {isTable && (
            <div>
              <label style={label}>
                読み取った作業表（{table.start ? `${fmt(table.start)} ${table.startTime || ''} から` : '開始日なし：空いているところから'}、それぞれ表の順に続けて作業）
              </label>
              <div style={{ border: `1px solid ${colors.border}`, borderRadius: 5 }}>
                {table.groups.map((g, i) => (
                  <div key={g.label + i} style={{ padding: '8px 12px', borderTop: i ? `1px solid ${colors.border}` : 'none', fontSize: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{g.label}（{g.unit}）</span>
                    <span>{g.rooms.length} 部屋・計 {Math.round(g.rooms.reduce((s2, r) => s2 + r.hours, 0) * 10) / 10} 時間</span>
                    <span style={{ color: colors.textMute }}>{g.rooms[0].room}_{g.unit} 〜 {g.rooms[g.rooms.length - 1].room}_{g.unit}</span>
                    <div style={{ marginLeft: 'auto', width: 200 }}>
                      <Combobox value={groupAssignees[g.label] || ''} onChange={(v) => setGroupAssignees(prev => ({ ...prev, [g.label]: v }))}
                        options={assigneeList || []} placeholder={`${g.label}の担当者`}
                        inputStyle={{ ...input, width: '100%' }} colors={colors} fontJP={fontJP} />
                    </div>
                  </div>
                ))}
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={tableTentative} onChange={(e) => setTableTentative(e.target.checked)} />
                仮案件（仮予定）として登録する
              </label>
            </div>
          )}
          {!isTable && cats.length > 0 && (
            <div>
              <label style={label}>1枚あたりの制作時間（時間。最初はこの会社の過去の作業の目安。仮の時間なので、あとで直せます）</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {cats.map(c => (
                  <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                    <span style={{ width: 150 }}>{CAT_LABEL[c] ?? c}</span>
                    ホワイト <input type="number" min="0" step="0.5" value={hours[c]?.white ?? ''} onChange={(e) => setHour(c, 'white', e.target.value)} style={{ ...input, width: 80 }} />
                    カラー <input type="number" min="0" step="0.5" value={hours[c]?.color ?? ''} onChange={(e) => setHour(c, 'color', e.target.value)} style={{ ...input, width: 80 }} />
                    {perCut(c) <= 0 && <span style={{ color: '#c1272d', fontWeight: 600 }}>時間を入れてください</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {projects.length > 0 && (
            <div>
              <label style={label}>読み取った案件（{projects.length}件）</label>
              <div style={{ border: `1px solid ${colors.border}`, borderRadius: 5 }}>
                {projects.map((p, i) => {
                  const total = (p.cuts.length ? p.cuts : [{ category: '', count: 1 }]).reduce((s, c) => s + c.count * perCut(c.category), 0);
                  return (
                    <div key={i} style={{ padding: '8px 12px', borderTop: i ? `1px solid ${colors.border}` : 'none', fontSize: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</span>
                      {p.contact && <span style={{ color: colors.textMute }}>担当者様 {p.contact}</span>}
                      <span>{p.cuts.length ? p.cuts.map(c => `${c.category || ''}${c.count}枚`).join('＋') : '枚数不明（1枚として登録）'}</span>
                      <span style={{ marginLeft: 'auto', whiteSpace: 'nowrap', color: p.start ? colors.text : '#c46a16' }}>
                        {p.start ? `${fmt(p.start)} 着手` : '空いているところへ'}{p.end ? ` → ${fmt(p.end)} 納品` : '（納品 確認中）'}
                      </span>
                      <span style={{ whiteSpace: 'nowrap', color: colors.textMute }}>計 {Math.round(total * 10) / 10} 時間</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: '12px 22px', borderTop: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: colors.textMute }}>
            {isTable ? (!projName.trim() ? '社外案件名を入れてください' : !company.trim() ? '会社名を選んでください' : tableAssigneeMissing ? '担当ごとに担当者を選んでください' : `${table.groups.reduce((n, g) => n + g.rooms.length, 0)} 部屋の作業を登録します`) :
              !projects.length ? '【案件名】の連絡文か、部屋ごとの作業表を貼ってください' : !company.trim() ? '会社名を選んでください' : !assignee.trim() ? '担当者を選んでください' : missingHours.length ? '1枚あたりの時間を入れてください' : '仮案件として登録します（あとで「進行状況」の「仮登録を外す」で通常の案件に）'}
          </span>
          <button type="button" onClick={onClose}
            style={{ marginLeft: 'auto', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4, padding: '8px 14px', cursor: 'pointer', fontFamily: fontJP, fontSize: 12 }}>
            やめる
          </button>
          <button type="button" onClick={submit} disabled={!canSubmit}
            style={{ background: canSubmit ? colors.accent : '#ccc', border: 'none', color: '#fff', borderRadius: 4, padding: '8px 16px', cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: fontJP, fontSize: 12, fontWeight: 700 }}>
            {isTable ? '作業表を登録' : projects.length ? `${projects.length} 案件を仮登録` : '登録'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BulkTentativeModal;
