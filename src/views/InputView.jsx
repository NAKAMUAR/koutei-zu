// 入力ビュー（新規案件登録フォーム＋進行中一覧タブ）。App.jsx から分割。
import { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../appContext.js';
import { VIEWPOINT_PRESETS, dayName, fmtHM, fmtMD, fmtYMD, getProjectColor, kanaNormalize, makeEmptyStep, makeViewpointFromPreset, minToTime, parseHM, sheetsLabel } from '../lib/utils.js';
import { computeRevisionStats, deliveryBaseName, findStepType, num as vpNum, resolveViewpointSteps, stepDeliveryName } from '../viewpoint/viewpointUtils.js';
import { computeLateRisks, groupByViewpoint, simulateFormSchedule, sortAssigneesByMaster } from '../lib/schedule.js';
import { QuoteModal } from '../components/modals.jsx';
import { AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronDown, ChevronUp, Folder, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { Combobox, DurationSelect, TimeSelect, tabStyle } from '../components/common.jsx';
import { AssigneeBoard, ReviewSection, SuspendedSection } from './input/sections.jsx';
import { ViewpointGroupList } from './input/ViewpointList.jsx';
import { CalendarView } from './CalendarView.jsx';
import { AssigneeView } from './AssigneeView.jsx';

function InputView({ form, setForm, handleSubmit, editingId, editMode, cancelEdit, selectedAssignee, setSelectedAssignee }) {
  const {
    colors, fontJP, fontDisplay,
    tasks, scheduled, settings, now, caseEditMode,
    projectOrder, projectList, projectInternalList, viewpointList,
    assigneeList, assigneeOrder, companyList, customerMaster,
    stepTypeMaster, vpDeliveryCount,
    registerDraftAndEdit,
  } = useApp();
  // お客様担当者の候補：会社名を選んでいればその会社に所属する担当者を表示
  // （会社名はひらがな/カタカナ/全半角の違いを無視して照合）
  const contactOptions = useMemo(() => {
    const rows = customerMaster || [];
    const c = kanaNormalize(form.companyName);
    // 会社名を選んでいればその会社の担当者だけ（無ければ空＝自由入力）。未選択なら全件。
    const base = c ? rows.filter(r => kanaNormalize(r.company) === c) : rows;
    const names = [];
    for (const r of base) for (const ct of (r.contacts || [])) if (ct.name) names.push(ct.name);
    return [...new Set(names)];
  }, [customerMaster, form.companyName]);
  // 契約形態が「オフショア」の会社名の集合（進行中案件一覧で「オフショア（その他）」へ集約する）
  const offshoreCompanies = useMemo(
    () => new Set((customerMaster || []).filter(c => c.contractType === 'offshore').map(c => (c.company || '').trim()).filter(Boolean)),
    [customerMaster]
  );
  // この案件の会社で金額欄を出すか。
  // 金額が入るのはオフショア案件のみ。ラボ案件は合計金額が別途決まっているため各ステップは0（金額欄なし）。
  const amountApplicable = offshoreCompanies.has((form.companyName || '').trim());
  // 制作時間（時間）からの金額デフォルト：制作時間(h) × 2,500円（税抜）
  const STEP_AMOUNT_RATE = 2500;
  // 入力ページ内の表示切替：進行中一覧 / カレンダー / 担当者別
  const [inputTab, setInputTab] = useState('list');
  // 新規案件登録フォームの折畳み（カレンダー・担当者別では既定で折畳み）
  const [formCollapsed, setFormCollapsed] = useState(false);
  // カレンダー／担当者別では折畳む。進行中一覧では現在の折畳み状態を維持（勝手に開かない）
  const switchTab = (t) => { setInputTab(t); if (t !== 'list' && !editMode) setFormCollapsed(true); };
  // 編集を開始したら自動で展開する
  useEffect(() => { if (editMode) setFormCollapsed(false); }, [editMode]);
  // カレンダー／担当者別を選んだら、その表（スケジュール表）が上端に来るようスクロール
  const tabBarRef = useRef(null);
  useEffect(() => {
    if (inputTab !== 'list' && tabBarRef.current) {
      tabBarRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [inputTab]);
  const inputStyle = {
    width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`,
    borderRadius: 4, fontFamily: fontJP, fontSize: 14, background: '#fff',
    color: colors.text, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', fontSize: 12, color: colors.textMute, marginBottom: 6, letterSpacing: '0.05em' };

  // 視点・ステップ操作ヘルパー
  const addViewpointPreset = (preset) =>
    setForm({ ...form, viewpoints: [...form.viewpoints, makeViewpointFromPreset(preset)] });
  const removeViewpoint = (vi) => setForm({ ...form, viewpoints: form.viewpoints.filter((_, idx) => idx !== vi) });
  // 視点の順番入れ替え（フォーム内で上下に移動）。隣同士を入れ替える。
  const moveViewpoint = (vi, dir) => {
    const target = vi + dir;
    if (target < 0 || target >= form.viewpoints.length) return;
    const vps = [...form.viewpoints];
    [vps[vi], vps[target]] = [vps[target], vps[vi]];
    setForm({ ...form, viewpoints: vps });
  };
  // 視点の統合：sourceVi の視点のステップを targetVi の視点の末尾へ移し、sourceVi を削除する。
  // 残すのは targetVi（視点名・社外名・内観外観・担当者・納期などは targetVi のものを採用）。
  // 移すステップは担当者を確定（source視点の担当者を焼き込み）して、target視点の担当者に化けないようにする。
  const mergeViewpoint = (targetVi, sourceVi) => {
    if (targetVi === sourceVi) return;
    const vps = form.viewpoints;
    const target = vps[targetVi];
    const source = vps[sourceVi];
    if (!target || !source) return;
    const movedSteps = (source.steps || []).map(s => ({
      ...s,
      assignee: (s.assignee || '').trim() || (source.assignee || '').trim() || '',
    }));
    const mergedTarget = { ...target, steps: [...(target.steps || []), ...movedSteps] };
    const next = [];
    for (let i = 0; i < vps.length; i++) {
      if (i === sourceVi) continue;
      next.push(i === targetVi ? mergedTarget : vps[i]);
    }
    setForm({ ...form, viewpoints: next });
  };
  const updateViewpointName = (vi, value) => {
    const vps = [...form.viewpoints];
    vps[vi] = { ...vps[vi], viewpointName: value };
    setForm({ ...form, viewpoints: vps });
  };
  const updateViewpointField = (vi, field, value) => {
    const vps = [...form.viewpoints];
    vps[vi] = { ...vps[vi], [field]: value };
    setForm({ ...form, viewpoints: vps });
  };
  const updateViewpointAssignee = (vi, value) => {
    const vps = [...form.viewpoints];
    vps[vi] = { ...vps[vi], assignee: value };
    setForm({ ...form, viewpoints: vps });
  };
  const addStep = (vi) => {
    const vps = [...form.viewpoints];
    vps[vi] = { ...vps[vi], steps: [...vps[vi].steps, makeEmptyStep()] };
    setForm({ ...form, viewpoints: vps });
  };
  // ステップ種類（プルダウン）の選択。種類IDと表示名（素の名称）を同期し、無料種類なら金額をクリアする。
  const updateStepType = (vi, si, typeId) => {
    const vps = [...form.viewpoints];
    const steps = [...vps[vi].steps];
    const t = stepTypeMaster.find(x => x.id === typeId);
    const next = { ...steps[si], stepTypeId: typeId, name: t ? t.label : steps[si].name };
    if (t && t.paid === false) next.amount = ''; // 無料は金額を反映しない
    steps[si] = next;
    vps[vi] = { ...vps[vi], steps };
    setForm({ ...form, viewpoints: vps });
  };
  const removeStep = (vi, si) => {
    const vps = [...form.viewpoints];
    vps[vi] = { ...vps[vi], steps: vps[vi].steps.filter((_, idx) => idx !== si) };
    setForm({ ...form, viewpoints: vps });
  };
  // ステップの並び替え（▲▼）。この順が登録時の stepOrder になり、呼び出し時もこの順で復元される。
  const moveStep = (vi, si, dir) => {
    const vps = [...form.viewpoints];
    const steps = [...vps[vi].steps];
    const sj = si + dir;
    if (sj < 0 || sj >= steps.length) return;
    [steps[si], steps[sj]] = [steps[sj], steps[si]];
    vps[vi] = { ...vps[vi], steps };
    setForm({ ...form, viewpoints: vps });
  };
  const updateStep = (vi, si, field, value) => {
    const vps = [...form.viewpoints];
    const steps = [...vps[vi].steps];
    steps[si] = { ...steps[si], [field]: value };
    vps[vi] = { ...vps[vi], steps };
    setForm({ ...form, viewpoints: vps });
  };
  // 制作時間の変更：金額が未入力かつ金額対象（ラボ以外）なら、制作時間×レートで金額を自動算出。
  const updateStepHours = (vi, si, value) => {
    const vps = [...form.viewpoints];
    const steps = [...vps[vi].steps];
    const cur = steps[si];
    const next = { ...cur, hours: value };
    const curType = findStepType(stepTypeMaster, cur);
    const isFree = curType && curType.paid === false;
    if (amountApplicable && !isFree && (cur.amount === '' || cur.amount == null)) {
      const h = parseHM(value);
      if (!isNaN(h) && h > 0) next.amount = String(Math.round(h * STEP_AMOUNT_RATE));
    }
    steps[si] = next;
    vps[vi] = { ...vps[vi], steps };
    setForm({ ...form, viewpoints: vps });
  };
  // ステップの完了日（年月日＋時分）。日付・時刻を別々に受け取り 'YYYY-MM-DDTHH:mm' で保存。
  const setStepCompletedDate = (vi, si, datePart, timePart) => {
    let val = '';
    if (datePart || timePart) {
      const d = datePart || fmtYMD(new Date());
      const tm = timePart || '00:00';
      val = `${d}T${tm}`;
    }
    updateStep(vi, si, 'completedDate', val);
  };

  // 開始・終了予定のプレビュー：実データ（他タスク）に混ぜて実スケジュールと同じ計算をする
  const previewSchedule = useMemo(
    () => simulateFormSchedule(form, tasks, settings, projectOrder, now),
    [form, tasks, settings, projectOrder, now]
  );

  // おすすめ担当者の提案（what-if）：担当者候補ごとに「全視点をその人に割り当てたら」で
  // 実スケジュールと同じ計算を行い、終了予定が早く納期を守れる順に提示する。
  // 計算が重いためボタンを押した時だけ実行する。
  const [assigneeSuggestions, setAssigneeSuggestions] = useState(null); // null=非表示
  useEffect(() => { setAssigneeSuggestions(null); }, [editingId]); // 対象が変わったら閉じる
  const suggestAssignees = () => {
    const candidates = [...new Set((assigneeList || []).map(a => (a || '').trim()).filter(Boolean))];
    if (candidates.length === 0) { alert('担当者の候補がありません。従業員マスタに担当者を登録してください。'); return; }
    const out = [];
    for (const a of candidates) {
      const f2 = { ...form, assignee: a, viewpoints: (form.viewpoints || []).map(vp => ({ ...vp, assignee: a })) };
      const sim = simulateFormSchedule(f2, tasks, settings, projectOrder, now);
      if (!sim || !sim.endDate) continue;
      out.push({
        assignee: a, endDate: sim.endDate, endMin: sim.endMin,
        endTs: sim.endDate.getTime() + (sim.endMin || 0) * 60000,
        violations: (sim.deadlineViolations || []).length,
      });
    }
    out.sort((x, y) => (x.violations > 0 ? 1 : 0) - (y.violations > 0 ? 1 : 0) || x.endTs - y.endTs);
    setAssigneeSuggestions(out);
  };
  const applySuggestedAssignee = (a) => {
    setForm({ ...form, assignee: a, viewpoints: (form.viewpoints || []).map(vp => ({ ...vp, assignee: a })) });
    setAssigneeSuggestions(null);
  };

  // 視点ごとの開始時間を「日付」と「時刻」に分けて扱う（datetime-localが入力しづらい環境への対策）
  const setVpManualStart = (vi, datePart, timePart) => {
    let val = '';
    if (datePart || timePart) {
      const d = datePart || fmtYMD(new Date());
      const tm = timePart || (settings.morningStart || '08:00');
      val = `${d}T${tm}`;
    }
    setForm({ ...form, viewpoints: form.viewpoints.map((vp, i) => i === vi ? { ...vp, manualStart: val } : vp) });
  };
  // 視点ごとの終了時間（作業終了予定）。日付・時刻を別々に扱う
  const setVpManualEnd = (vi, datePart, timePart) => {
    let val = '';
    if (datePart || timePart) {
      const d = datePart || fmtYMD(new Date());
      const tm = timePart || '17:00';
      val = `${d}T${tm}`;
    }
    setForm({ ...form, viewpoints: form.viewpoints.map((vp, i) => i === vi ? { ...vp, manualEnd: val } : vp) });
  };
  // 視点ごとの納期（お客様への提出日）
  const setVpDeadline = (vi, val) =>
    setForm({ ...form, viewpoints: form.viewpoints.map((vp, i) => i === vi ? { ...vp, deadline: val || '' } : vp) });

  // 案件の検索：案件名・社内案件名・会社名・お客様担当者・制作担当者・視点名・ステップ名で絞り込み
  const [searchQuery, setSearchQuery] = useState('');
  const q = searchQuery.trim().toLowerCase();
  // 完了したステップ・視点も表示するか（進行中の案件に紐づく完了分を一覧に加える）
  const [showCompleted, setShowCompleted] = useState(false);
  // 一覧の元データ：標準は進行中（active）のみ。完了表示ONなら、進行中の案件に属する
  // 完了ステップ・完了視点も加える（過去の完了案件で一覧が溢れないよう案件単位で限定）。
  const listSource = useMemo(() => {
    if (!showCompleted) return scheduled.active;
    const activeProjects = new Set(scheduled.active.map(t => t.projectName));
    const doneExtra = scheduled.done.filter(t => !t.cancelled && activeProjects.has(t.projectName));
    return [...scheduled.active, ...doneExtra];
  }, [showCompleted, scheduled.active, scheduled.done]);
  const filteredActive = useMemo(() => {
    if (!q) return listSource;
    return listSource.filter(t =>
      [t.projectName, t.projectNameInternal, t.companyName, t.customerContact, t.assignee, t.viewpointName, t.stepName, t.memo]
        .some(v => (v || '').toLowerCase().includes(q))
    );
  }, [listSource, q]);

  // 納品パース・外注の集計（①の納品集計・⑤の外注集計）。進行中案件の上部に表示する。
  const deliverySummary = useMemo(() => {
    const groups = groupByViewpoint(scheduled.active, vpDeliveryCount);
    const parseNames = [];
    let prodAmount = 0, outVND = 0;
    const offPeople = {};
    for (const g of groups) {
      const counted = g.countAsDelivery !== false;
      const n = Math.max(1, g.deliveryCount || 0);
      if (counted) for (let i = 0; i < n; i++) parseNames.push(g.viewpointCategory || g.viewpointName);
      // 金額・外注は請求の単一ソースである「ステップ」から集計する（制作履歴との二重計上を防ぐ）
      for (const t of (g.tasks || [])) {
        prodAmount += vpNum(t.stepAmount);
        const v = vpNum(t.stepOutVND);
        outVND += v;
        const ppl = [t.stepOutInHouse, t.stepOutExternal].map(s => (s || '').trim()).filter(Boolean);
        if (v && ppl.length) for (const p of ppl) offPeople[p] = (offPeople[p] || 0) + v / ppl.length;
      }
    }
    return { parseLabel: sheetsLabel(parseNames), parseCount: parseNames.length, prodAmount, outVND, offPeople };
  }, [scheduled.active, offshoreCompanies, vpDeliveryCount]);

  // 進行中案件のグループ表示：納期順（既定）／会社別（制作順）／担当者別（制作順）
  const [listGroupMode, setListGroupMode] = useState('deadline');
  // 担当者別表示のときの担当者の絞り込み（null = 全選択）
  const [selectedListAssignee, setSelectedListAssignee] = useState(null);

  // 納期（本日 or 超過）があるのに本日納品予定でない（＝間に合わない恐れ）案件を抽出。
  // 一覧では赤背景、さらにポップアップで警告する。
  const atRiskProjects = useMemo(() => {
    const todayYmd = fmtYMD(now);
    const map = new Map();
    for (const t of scheduled.active) {
      if (!t.projectName) continue;
      const e = map.get(t.projectName) || { projectName: t.projectName, projectNameInternal: t.projectNameInternal || '', deadline: '', endTs: null };
      // 実効納期＝個別（視点）＞全体（案件）
      const eff = t.deadline || t.projectDeadline || '';
      if (eff && (!e.deadline || eff < e.deadline)) e.deadline = eff;
      if (t.scheduledEnd) {
        const ts = t.scheduledEnd.getTime() + (t.scheduledEndMin || 0) * 60000;
        if (e.endTs == null || ts > e.endTs) e.endTs = ts;
      }
      map.set(t.projectName, e);
    }
    const res = [];
    for (const e of map.values()) {
      if (!e.deadline || e.deadline > todayYmd) continue; // 納期が本日 or 超過のものだけ
      const endYmd = e.endTs ? fmtYMD(new Date(e.endTs)) : null;
      if (endYmd !== todayYmd) res.push(e); // 本日納品予定でない＝間に合わない恐れ
    }
    return res.sort((a, b) => (a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0));
  }, [scheduled.active, now]);
  // ポップアップの表示制御（対象が変わったら再表示・閉じると消える）
  const [riskAck, setRiskAck] = useState(false);
  const riskKey = atRiskProjects.map(p => p.projectName).sort().join('|');
  useEffect(() => { setRiskAck(false); }, [riskKey]);

  // 予測遅延（事前警告）：納期はまだ先だが、終了予定がこのままだと納期を超える視点。
  // 赤警告（納期当日・超過）より前の段階で担当替え・優先順位変更の判断材料にする。
  const lateRisks = useMemo(() => computeLateRisks(scheduled.active, now), [scheduled.active, now]);
  const [lateRiskOpen, setLateRiskOpen] = useState(true);

  // ===== 過去案件から引用 =====
  const [quoteOpen, setQuoteOpen] = useState(false);
  // 全案件（進行中・完了とも）を案件単位（社外案件名）でまとめる。
  // 「過去案件から引用」モーダルは完了済みのみ、同名案件の呼び出しパネルは進行中も対象。
  const allProjects = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      const p = t.projectName;
      if (!p) continue;
      if (!map.has(p)) map.set(p, {
        projectName: p, projectNameInternal: '', companyName: '', customerContact: '',
        lastCompletedAt: 0, hasDone: false, hasActive: false, registeredDate: '',
        viewpoints: new Set(), lastAssignee: '', lastAssigneeStamp: -Infinity,
      });
      const e = map.get(p);
      if (t.status === 'done') e.hasDone = true;
      else e.hasActive = true;
      if (t.projectNameInternal && !e.projectNameInternal) e.projectNameInternal = t.projectNameInternal;
      if (t.companyName && !e.companyName) e.companyName = t.companyName;
      if (t.customerContact && !e.customerContact) e.customerContact = t.customerContact;
      if (t.viewpointName) e.viewpoints.add(t.viewpointName);
      if (t.completedAt && t.completedAt > e.lastCompletedAt) e.lastCompletedAt = t.completedAt;
      const rd = t.registeredDate || (t.createdAt ? fmtYMD(new Date(t.createdAt)) : '');
      if (rd && (!e.registeredDate || rd < e.registeredDate)) e.registeredDate = rd;
      const stamp = t.completedAt || t.createdAt || 0;
      if (t.assignee && stamp >= e.lastAssigneeStamp) { e.lastAssigneeStamp = stamp; e.lastAssignee = t.assignee; }
    }
    return [...map.values()]
      .map(e => ({ ...e, viewpointCount: e.viewpoints.size }))
      .sort((a, b) => b.lastCompletedAt - a.lastCompletedAt);
  }, [tasks]);
  const pastProjects = useMemo(() => allProjects.filter(e => e.hasDone), [allProjects]);

  const isFormDirty = () => {
    const f = form;
    if ((f.projectName || f.projectNameInternal || f.companyName || f.customerContact || f.assignee || f.priority || f.projectDeadline || f.projectRequestDate || '').toString().trim()) return true;
    for (const vp of (f.viewpoints || [])) {
      if ((vp.viewpointName || '').trim() || (vp.assignee || '').trim()) return true;
      if ((vp.manualStart || '').trim() || (vp.manualEnd || '').trim() || (vp.deadline || '').trim()) return true;
      if ((vp.deliveryName || '').trim()) return true;
      for (const s of (vp.steps || [])) {
        if ((s.name || '').trim() || String(s.hours ?? '').trim() || String(s.completedHours ?? '').trim()) return true;
        if (String(s.amount ?? '').trim() || (s.requestDate || '').trim()) return true;
      }
    }
    return false;
  };
  const applyQuote = (proj) => {
    setForm({
      projectName: proj.projectName || '',
      projectNameInternal: proj.projectNameInternal || '',
      companyName: proj.companyName || '',
      customerContact: proj.customerContact || '',
      assignee: proj.lastAssignee || '',
      priority: '', memo: '', tentative: false, tentativeStart: '', tentativeEnd: '',
      viewpoints: [makeViewpointFromPreset(VIEWPOINT_PRESETS[0])],
    });
    setQuoteOpen(false);
  };
  const selectQuote = async (proj) => {
    if (isFormDirty()) {
      // 入力中の内容は破棄しない：進行中タスクとして登録し、その案件の編集画面へ移行する
      if (registerDraftAndEdit) {
        const ok = await registerDraftAndEdit();
        if (ok) { setQuoteOpen(false); return; }
      }
      // 登録できなかった場合（案件名・視点未入力など）は従来どおり破棄確認
      if (!window.confirm('入力中の内容を破棄して引用しますか？')) return;
    }
    applyQuote(proj);
  };

  // ===== 過去案件の呼び出し（同名の完了案件を「追加の変更・修正」として再開） =====
  // 新規登録で社外案件名（＋社内案件名）が完了済みの過去案件と一致したら案内を出し、
  // ワンクリックで過去の視点を「修正」ステップ（種類=修正）付きでフォームへ展開する。
  // 案件名・視点名が過去と同一になるため、視点別の修正回数・修正時間の集計（完了タブ）に自動で乗る。
  const [recallState, setRecallState] = useState({ name: '', status: '' }); // status: 'applied' | 'dismissed'
  const recallMatch = useMemo(() => {
    if (editMode) return null;
    const name = (form.projectName || '').trim();
    if (!name) return null;
    // 完了・進行中を問わず同名案件を検出する（登録漏れ・二重登録の防止）
    const proj = allProjects.find(p => p.projectName === name);
    if (!proj) return null;
    // 社内案件名まで入力されている場合は一致するものだけ（同名の別案件を誤検出しない）
    const internal = (form.projectNameInternal || '').trim();
    if (internal && proj.projectNameInternal && internal !== proj.projectNameInternal) return null;
    return proj;
  }, [allProjects, form.projectName, form.projectNameInternal, editMode]);
  // 過去案件の視点別 修正実績（案内パネルの表示用）
  const recallStats = useMemo(() => {
    if (!recallMatch) return [];
    return computeRevisionStats(tasks.filter(t => (t.projectName || '') === recallMatch.projectName));
  }, [recallMatch, tasks]);
  const applyRecall = () => {
    const proj = recallMatch;
    if (!proj) return;
    const vpDirty = (form.viewpoints || []).some(vp =>
      (vp.viewpointNameExternal || '').trim() || (vp.deadline || '').trim() || (vp.assignee || '').trim() ||
      (vp.steps || []).some(s => String(s.hours ?? '').trim() || String(s.completedHours ?? '').trim()));
    if (vpDirty && !window.confirm('入力中の視点の内容を、過去案件の視点（修正）で置き換えます。よろしいですか？')) return;
    // 過去タスクから視点ごとの最新情報（社外視点名・内観/外観・担当者）とステップ構成を拾う
    const projTasks = tasks.filter(t => (t.projectName || '') === proj.projectName)
      .slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    const byVp = new Map();
    for (const t of projTasks) {
      const v = (t.viewpointName || '').trim();
      if (!v) continue;
      if (!byVp.has(v)) byVp.set(v, { viewpointName: v, viewpointNameExternal: '', viewpointCategory: '', assignee: '', steps: [] });
      const e = byVp.get(v);
      if (t.viewpointNameExternal) e.viewpointNameExternal = t.viewpointNameExternal;
      if (t.viewpointCategory) e.viewpointCategory = t.viewpointCategory;
      if (t.assignee) e.assignee = t.assignee;
      // 過去の各ステップ（＝タスク）の名称・制作時間・完了時間を控える（並びは stepOrder→createdAt）
      e.steps.push({
        order: (t.stepOrder != null ? t.stepOrder : 0),
        createdAt: t.createdAt || 0,
        stepName: (t.stepName || '').trim(),
        hours: t.hours,
        completedHours: t.completedHours,
      });
    }
    if (byVp.size === 0) { alert('過去案件に視点が見つかりませんでした'); return; }
    const viewpoints = [...byVp.values()].map(v => {
      // 過去のステップ構成を再現：制作時間・完了時間ともに復元、種類=修正（fix）
      // 種類は修正に統一する（元の種類のままだと納品として二重計上されるため。fix は納品に数えない）
      const steps = v.steps.slice()
        .sort((a, b) => (a.createdAt - b.createdAt) || (a.order - b.order))
        .filter(s => s.stepName || (s.hours != null && !isNaN(s.hours) && s.hours > 0))
        .map(s => ({
          ...makeEmptyStep(s.stepName || '修正'),
          hours: (s.hours != null && !isNaN(s.hours) && s.hours > 0) ? fmtHM(s.hours) : '',
          completedHours: (s.completedHours != null && !isNaN(s.completedHours) && s.completedHours > 0) ? fmtHM(s.completedHours) : '',
          roundType: 'fix',
        }));
      return {
        viewpointName: v.viewpointName,
        viewpointNameExternal: v.viewpointNameExternal,
        viewpointCategory: v.viewpointCategory,
        assignee: v.assignee,
        manualStart: '', manualEnd: '', deadline: '', deliveryName: '',
        steps: steps.length ? steps : [{ ...makeEmptyStep('修正'), roundType: 'fix' }],
      };
    });
    setForm(prev => ({
      ...prev,
      projectName: proj.projectName,
      projectNameInternal: (prev.projectNameInternal || '').trim() || proj.projectNameInternal || '',
      companyName: (prev.companyName || '').trim() || proj.companyName || '',
      customerContact: (prev.customerContact || '').trim() || proj.customerContact || '',
      assignee: (prev.assignee || '').trim() || proj.lastAssignee || '',
      viewpoints,
    }));
    setRecallState({ name: proj.projectName, status: 'applied' });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 32 }}>
      {quoteOpen && (
        <QuoteModal projects={pastProjects} onSelect={selectQuote} onClose={() => setQuoteOpen(false)}
          colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
      )}
      {!caseEditMode && atRiskProjects.length > 0 && !riskAck && (
        <div onClick={() => setRiskAck(true)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 8, border: '2px solid #c1272d',
              maxWidth: 460, width: '100%', maxHeight: '80vh', overflow: 'auto',
              boxShadow: '0 12px 40px rgba(0,0,0,0.3)', fontFamily: fontJP,
            }}>
            <div style={{ background: '#c1272d', color: '#fff', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15 }}>
              <AlertTriangle size={18} /> 納期に間に合わない恐れがあります
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 13, color: colors.text, marginBottom: 12 }}>
                納期が本日または超過しているのに、本日中の納品予定になっていない案件が {atRiskProjects.length} 件あります。
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {atRiskProjects.map(p => {
                  const d = new Date(p.deadline + 'T00:00:00');
                  return (
                    <div key={p.projectName} style={{ background: '#fbdcdc', border: '1px solid #e6a3a3', borderRadius: 4, padding: '8px 12px', fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: '#c1272d' }}>
                        {p.projectNameInternal ? `${p.projectNameInternal}（${p.projectName}）` : p.projectName}
                      </span>
                      <span style={{ marginLeft: 8, fontSize: 12, color: '#c1272d' }}>納期 {fmtMD(d)}（{dayName(d)}）</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <button type="button" onClick={() => setRiskAck(true)}
                  style={{
                    background: '#c1272d', color: '#fff', border: 'none', borderRadius: 4,
                    padding: '8px 18px', cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 600,
                  }}>
                  確認した
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 予測遅延の事前警告（納期はまだ先だが終了予定が超過見込みの視点）。案件編集モード中は隠す */}
      {!caseEditMode && lateRisks.length > 0 && (
        <div style={{ background: '#fdf3e7', border: '1px solid #e0b072', borderRadius: 6, padding: '10px 16px', marginBottom: 16, fontFamily: fontJP }}>
          <button type="button" onClick={() => setLateRiskOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: fontJP, width: '100%', textAlign: 'left' }}>
            <AlertTriangle size={16} color="#c46a16" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#c46a16' }}>
              納期超過の見込み {lateRisks.length}件（このままだと納期に遅れる予定の視点）
            </span>
            <span style={{ marginLeft: 'auto', color: '#c46a16', display: 'flex' }}>{lateRiskOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
          </button>
          {lateRiskOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
              {lateRisks.map((r, i) => {
                const dl = new Date(r.deadline + 'T00:00:00');
                const end = new Date(r.endYmd + 'T00:00:00');
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, background: '#fff', border: '1px solid #ecd9bd', borderRadius: 4, padding: '6px 10px' }}>
                    <span style={{ fontWeight: 600 }}>
                      {r.projectNameInternal ? `${r.projectNameInternal}（${r.projectName}）` : r.projectName}
                      {r.viewpointName ? ` ／ ${r.viewpointName}` : ''}
                    </span>
                    {r.assignee && <span style={{ color: colors.textMute, fontSize: 11 }}>担当 {r.assignee}</span>}
                    <span style={{ marginLeft: 'auto', whiteSpace: 'nowrap', color: '#8a6420' }}>
                      納期 {fmtMD(dl)}({dayName(dl)}) → 終了予定 {fmtMD(end)}({dayName(end)})
                    </span>
                    <span style={{ fontWeight: 700, color: '#c1272d', whiteSpace: 'nowrap' }}>{r.lateDays}日遅れ見込み</span>
                  </div>
                );
              })}
              <div style={{ fontSize: 11, color: '#8a6420' }}>
                担当者の変更・案件の並び替え・残業枠の追加などで解消できます（変更するとこの一覧は自動で更新されます）
              </div>
            </div>
          )}
        </div>
      )}
      <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setFormCollapsed(c => !c)}
            title={formCollapsed ? 'フォームを開く' : 'フォームを折りたたむ'}
            style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', color: colors.textMute, padding: '4px 6px', display: 'flex', alignItems: 'center' }}>
            {formCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 18, margin: 0, fontWeight: 500 }}>
            {editMode?.type === 'step'
              ? 'ステップを編集'
              : editMode?.type === 'viewpoint'
                ? `視点「${editMode.projectName} ／ ${editMode.viewpointName}」を編集`
                : editMode?.type === 'project'
                  ? `案件「${editMode.projectName}」を編集`
                  : '新規案件登録'}
          </h2>
            {/* 仮案件チェック（タイトルの右隣）。チェック時は対応想定期間も表示 */}
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              background: form.tentative ? '#fdf3e7' : '#fff', border: `1px solid ${form.tentative ? '#c46a16' : colors.border}`,
              borderRadius: 4, padding: '7px 12px', fontSize: 13, fontFamily: fontJP,
              color: form.tentative ? '#c46a16' : colors.text, fontWeight: form.tentative ? 700 : 400,
            }}>
              <input type="checkbox" checked={!!form.tentative}
                onChange={(e) => setForm({ ...form, tentative: e.target.checked })}
                style={{ width: 15, height: 15, accentColor: '#c46a16', cursor: 'pointer' }} />
              仮案件（仮予定）として登録する
            </label>
            {form.tentative && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#c46a16', fontWeight: 600, whiteSpace: 'nowrap' }}>対応想定期間</span>
                <input type="date" value={form.tentativeStart || ''}
                  onChange={(e) => setForm({ ...form, tentativeStart: e.target.value })}
                  style={{ ...inputStyle, width: 'auto', flex: '0 0 150px' }} />
                <span style={{ fontSize: 12, color: colors.textMute }}>〜</span>
                <input type="date" value={form.tentativeEnd || ''}
                  onChange={(e) => setForm({ ...form, tentativeEnd: e.target.value })}
                  style={{ ...inputStyle, width: 'auto', flex: '0 0 150px' }} />
              </div>
            )}
          </div>
          {editMode ? (
            <button onClick={cancelEdit} style={{ background: 'transparent', border: 'none', color: colors.textMute, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={14} /> 編集をやめる
            </button>
          ) : (
            <button type="button" onClick={() => setQuoteOpen(true)}
              title="完了済みの過去案件の案件情報をフォームに引用します"
              style={{
                background: '#fff', border: `1px solid ${colors.accent}`, color: colors.accent, fontWeight: 600,
                cursor: 'pointer', fontSize: 12, padding: '7px 14px', borderRadius: 4,
                display: 'flex', alignItems: 'center', gap: 6, fontFamily: fontJP,
              }}>
              <Folder size={14} /> 過去案件から引用
            </button>
          )}
        </div>

        {!formCollapsed && (<>
        {/* 共通項目（新規登録・全編集モード共通） */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>社外案件名</label>
            <input type="text" list="project-list" value={form.projectName}
              onChange={(e) => {
                const val = e.target.value;
                // 既存案件名を選んだら、その案件の会社名・社内案件名を補完する
                // （空欄のときだけ。会社が入ると「お客様担当者」候補がその会社の人に絞られる）
                const match = !editMode ? (tasks || []).find(t => (t.projectName || '') === val.trim() && val.trim()) : null;
                setForm(prev => ({
                  ...prev,
                  projectName: val,
                  ...(match ? {
                    companyName: prev.companyName || match.companyName || '',
                    projectNameInternal: prev.projectNameInternal || match.projectNameInternal || '',
                  } : {}),
                }));
              }}
              placeholder="例: 〇〇マンション" style={inputStyle} />
            <datalist id="project-list">{projectList.map(p => <option key={p} value={p} />)}</datalist>
          </div>
          <div>
            <label style={labelStyle}>社内案件名（任意）</label>
            <input type="text" list="project-internal-list" value={form.projectNameInternal}
              onChange={(e) => setForm({ ...form, projectNameInternal: e.target.value })}
              placeholder="例: TAMAZEN.58-6" style={inputStyle} />
            <datalist id="project-internal-list">{projectInternalList.map(p => <option key={p} value={p} />)}</datalist>
          </div>
          <div>
            <label style={labelStyle}>会社名</label>
            <Combobox value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })}
              options={companyList || []} placeholder="一覧から選択／入力"
              inputStyle={inputStyle} colors={colors} fontJP={fontJP} />
          </div>
          <div>
            <label style={labelStyle}>お客様担当者（任意）</label>
            <Combobox value={form.customerContact} onChange={(v) => setForm({ ...form, customerContact: v })}
              options={contactOptions} placeholder="一覧から選択／入力"
              inputStyle={inputStyle} colors={colors} fontJP={fontJP} />
          </div>
          <div>
            <label style={labelStyle}>
              {editMode ? '担当者（既定）' : 'デフォルト担当者'}
            </label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
              <Combobox value={form.assignee} onChange={(v) => setForm({ ...form, assignee: v })}
                options={assigneeList} placeholder="一覧から選択／入力"
                inputStyle={inputStyle} colors={colors} fontJP={fontJP} wrapperStyle={{ flex: 1 }} />
              {editMode?.type === 'project' && (
                <button type="button"
                  onClick={() => {
                    const a = (form.assignee || '').trim();
                    if (!a) { alert('適用する担当者名を入力してください'); return; }
                    if (!confirm(`この案件の全視点（${form.viewpoints.length}件）の担当者を「${a}」に一括変更します。よろしいですか？`)) return;
                    setForm({
                      ...form,
                      viewpoints: form.viewpoints.map(vp => ({ ...vp, assignee: a })),
                    });
                  }}
                  title="入力した担当者を、この案件の全視点に一括反映"
                  style={{
                    background: colors.accentSoft, border: `1px solid ${colors.accent}`,
                    color: colors.accent, fontWeight: 600,
                    padding: '0 10px', borderRadius: 4, cursor: 'pointer',
                    fontFamily: fontJP, fontSize: 11, whiteSpace: 'nowrap',
                  }}>
                  全視点へ適用
                </button>
              )}
              <button type="button" onClick={suggestAssignees}
                title="担当者候補ごとに全視点を割り当てた場合の終了予定を試算し、納期を守れて早く終わる順に提案します"
                style={{
                  background: 'transparent', border: `1px solid ${colors.border}`,
                  color: colors.textMute, padding: '0 10px', borderRadius: 4, cursor: 'pointer',
                  fontFamily: fontJP, fontSize: 11, whiteSpace: 'nowrap',
                }}>
                提案
              </button>
            </div>
            {assigneeSuggestions && (
              <div style={{ marginTop: 6, border: `1px solid ${colors.border}`, borderRadius: 5, background: '#fbf9f4', padding: 8 }}>
                <div style={{ fontSize: 10.5, color: colors.textMute, marginBottom: 5 }}>
                  終了予定の早い順（全視点をその担当者にした場合の試算）。クリックで適用
                </div>
                {assigneeSuggestions.length === 0 ? (
                  <div style={{ fontSize: 12, color: colors.textMute }}>試算できる候補がありません（視点に制作時間が入っているか確認してください）</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                    {assigneeSuggestions.map((s, i) => (
                      <button type="button" key={s.assignee} onClick={() => applySuggestedAssignee(s.assignee)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '5px 9px', borderRadius: 4,
                          border: `1px solid ${s.violations === 0 ? '#bcd3b0' : '#e6c6a3'}`,
                          background: '#fff', cursor: 'pointer', fontFamily: fontJP, fontSize: 12, textAlign: 'left',
                        }}>
                        <span style={{ fontWeight: 700 }}>{i === 0 ? '★ ' : ''}{s.assignee}</span>
                        <span style={{ marginLeft: 'auto', whiteSpace: 'nowrap', color: colors.textMute }}>
                          終了予定 {fmtMD(s.endDate)}({dayName(s.endDate)}) {minToTime(s.endMin)}
                        </span>
                        <span style={{ whiteSpace: 'nowrap', fontWeight: 600, fontSize: 11, color: s.violations === 0 ? '#3a5a40' : '#c1272d' }}>
                          {s.violations === 0 ? '納期内 ✓' : `納期超過 ${s.violations}視点`}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => setAssigneeSuggestions(null)}
                  style={{ marginTop: 6, background: 'transparent', border: 'none', color: colors.textMute, fontSize: 11, cursor: 'pointer', fontFamily: fontJP, padding: 0 }}>
                  閉じる
                </button>
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>依頼日（案件共通・任意）</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <input type="date" value={form.projectRequestDate || ''}
                onChange={(e) => setForm({ ...form, projectRequestDate: e.target.value })}
                style={{ ...inputStyle, flex: '1 1 150px', minWidth: 150, width: 'auto' }} />
              {form.projectRequestDate && (
                <button type="button" onClick={() => setForm({ ...form, projectRequestDate: '' })}
                  style={{ background: 'transparent', border: `1px solid ${colors.border}`, padding: '6px 10px', borderRadius: 3, fontSize: 11, color: colors.textMute, cursor: 'pointer', fontFamily: fontJP, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  クリア
                </button>
              )}
            </div>
          </div>
          <div>
            <label style={labelStyle}>全体納期（案件共通・任意）</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <input type="date" value={form.projectDeadline || ''}
                onChange={(e) => setForm({ ...form, projectDeadline: e.target.value })}
                style={{ ...inputStyle, flex: '1 1 150px', minWidth: 150, width: 'auto' }} />
              {form.projectDeadline && (
                <button type="button" onClick={() => setForm({ ...form, projectDeadline: '' })}
                  style={{ background: 'transparent', border: `1px solid ${colors.border}`, padding: '6px 10px', borderRadius: 3, fontSize: 11, color: colors.textMute, cursor: 'pointer', fontFamily: fontJP, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  クリア
                </button>
              )}
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            {previewSchedule && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, flexWrap: 'wrap' }}>
                <span style={{ color: previewSchedule.moved ? '#c46a16' : colors.accent }}>
                  開始予定: {fmtMD(previewSchedule.startDate)}({dayName(previewSchedule.startDate)}) {minToTime(previewSchedule.startMin)}
                </span>
                <ArrowRight size={14} color={colors.textMute} />
                <span style={{ color: colors.accent }}>
                  終了予定: {fmtMD(previewSchedule.endDate)}({dayName(previewSchedule.endDate)}) {minToTime(previewSchedule.endMin)}
                </span>
              </div>
            )}
            {previewSchedule?.moved && (
              <div style={{ fontSize: 11, color: '#c46a16', marginTop: 6, fontWeight: 500 }}>
                ※ 指定時刻に空きがないため、開始予定を移動しています
              </div>
            )}
            {!caseEditMode && (previewSchedule?.deadlineViolations || []).map((v, i) => {
              const dl = new Date(v.deadline + 'T00:00:00');
              return (
                <div key={i} style={{ fontSize: 11, color: colors.accent, marginTop: 6, fontWeight: 600 }}>
                  ⚠ 視点「{v.viewpointName}」の終了予定 {fmtMD(v.endDate)}({dayName(v.endDate)}) {minToTime(v.endMin)} が納期 {fmtMD(dl)}（{dayName(dl)}）を超えています
                </div>
              );
            })}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>メモ（任意・一覧の案件ヘッダーとカレンダーのツールチップに表示）</label>
            <textarea value={form.memo || ''}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
              placeholder="例: 6/20 受注確定予定。確定したら本登録に切り替える"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 40 }} />
          </div>
        </div>

        {/* 過去案件の呼び出し：同名の完了案件があれば「追加の変更・修正」として視点ごと再開できる */}
        {recallMatch && recallState.name === recallMatch.projectName && recallState.status === 'applied' && (
          <div style={{ border: '1px solid #bcd3b0', background: '#f3f8f0', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 12.5, color: '#3a5a40', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
            {recallMatch.hasActive ? '進行中案件' : '過去案件'}「{recallMatch.projectName}」の視点を過去のステップ構成（種類=修正／制作時間・完了時間を復元）で展開しました。不要な視点・ステップは削除し、必要に応じて時間を調整して登録してください。
          </div>
        )}
        {recallMatch && recallState.name !== recallMatch.projectName && (
          <div style={{ border: '1px solid #d9c78a', background: '#fdf8e7', borderRadius: 6, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <RotateCcw size={15} color="#9a7b1f" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#7a5f14' }}>
                同じ案件名の{recallMatch.hasActive ? '進行中案件' : '完了案件'}があります
              </span>
              {recallMatch.hasActive && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#3a7bd5', borderRadius: 8, padding: '1px 8px' }}>進行中</span>
              )}
              <span style={{ fontSize: 11, color: colors.textMute }}>
                {recallMatch.projectNameInternal ? `社内: ${recallMatch.projectNameInternal} ・ ` : ''}
                {recallMatch.companyName ? `${recallMatch.companyName} ・ ` : ''}
                {recallMatch.registeredDate ? `登録 ${recallMatch.registeredDate.slice(5).replace('-', '/')} ・ ` : ''}
                {recallMatch.lastCompletedAt > 0 ? `最終完了 ${fmtMD(new Date(recallMatch.lastCompletedAt))}` : ''}
              </span>
              <button type="button" title="この案内を閉じる（別案件として新規登録する）"
                onClick={() => setRecallState({ name: recallMatch.projectName, status: 'dismissed' })}
                style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMute, display: 'flex', padding: 2 }}>
                <X size={15} />
              </button>
            </div>
            {recallStats.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {recallStats.map(s => (
                  <span key={s.key} style={{ fontSize: 11, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 10, padding: '2px 9px', color: colors.text }}>
                    {s.viewpointName}
                    <span style={{ color: s.fixCount > 0 ? '#c46a16' : colors.textMute, marginLeft: 5 }}>
                      修正{s.fixCount}回{s.fixSpentH > 0 ? `・${s.fixSpentH}h` : ''}
                    </span>
                    {s.lastCompletedAt > 0 && (
                      <span style={{ color: colors.textMute, marginLeft: 5 }} title="この視点の完了日時（最終ステップの完了時刻）">
                        完了 {(() => { const d = new Date(s.lastCompletedAt); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; })()}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <button type="button" onClick={applyRecall}
                style={{
                  background: colors.text, color: '#fff', border: 'none', borderRadius: 4,
                  padding: '7px 14px', cursor: 'pointer', fontFamily: fontJP, fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                <RotateCcw size={13} /> {recallMatch.hasActive ? 'この案件へ追加・修正を登録（視点を展開）' : '過去案件を呼び出す（視点を修正として展開）'}
              </button>
              <span style={{ fontSize: 11, color: colors.textMute }}>
                {recallMatch.hasActive
                  ? '既存の視点に種類「修正」のステップを付けて展開し、進行中案件への追加の登録として登録できます（別案件として二重登録されるのを防ぎます）。'
                  : '過去の視点に種類「修正」のステップを付けて展開します。案件・視点名が過去と揃うため、完了タブの「視点別 修正集計」に自動で乗ります。'}
              </span>
            </div>
          </div>
        )}

        {/* 視点（担当タスク）の動的リスト。各視点の中にステップ */}
        <div>
            <label style={{ ...labelStyle, marginBottom: 10 }}>
              視点（担当タスク）の内訳 ・ 1案件に複数の視点を登録できます
            </label>
            <datalist id="viewpoint-list">{viewpointList.map(v => <option key={v} value={v} />)}</datalist>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {form.viewpoints.map((vp, vi) => (
                <div key={vi} style={{
                  border: `1px solid ${colors.border}`, borderRadius: 6,
                  overflow: 'hidden',
                }}>
                  {/* 視点ヘッダー（上段1行目）：社内視点名・社外視点名・内観/外観・担当者・削除 */}
                  <div style={{
                    display: 'flex', gap: 8, alignItems: 'flex-end',
                    background: '#f3efe4', padding: '10px 12px', flexWrap: 'wrap',
                  }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: colors.text,
                      background: '#fff', border: `1px solid ${colors.border}`,
                      borderRadius: 12, padding: '6px 10px', flexShrink: 0, marginBottom: 1,
                    }}>視点 {vi + 1}</span>
                    {/* 視点の順番入れ替え（上下） */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0, marginBottom: 1 }}>
                      <button type="button" onClick={() => moveViewpoint(vi, -1)} disabled={vi === 0}
                        title="この視点を上へ移動"
                        style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '1px 5px', lineHeight: 0, cursor: vi === 0 ? 'not-allowed' : 'pointer', color: vi === 0 ? '#ccc' : colors.textMute, display: 'flex' }}>
                        <ChevronUp size={13} />
                      </button>
                      <button type="button" onClick={() => moveViewpoint(vi, 1)} disabled={vi === form.viewpoints.length - 1}
                        title="この視点を下へ移動"
                        style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '1px 5px', lineHeight: 0, cursor: vi === form.viewpoints.length - 1 ? 'not-allowed' : 'pointer', color: vi === form.viewpoints.length - 1 ? '#ccc' : colors.textMute, display: 'flex' }}>
                        <ChevronDown size={13} />
                      </button>
                    </div>
                    <div style={{ flex: '1 1 160px' }}>
                      <label style={{ ...labelStyle, fontSize: 10, marginBottom: 3 }}>社内視点名</label>
                      <input type="text" list="viewpoint-list" value={vp.viewpointName}
                        onChange={(e) => updateViewpointName(vi, e.target.value)}
                        placeholder="例: 外観昼景"
                        title="社内管理用の視点名。グループ化・スケジュールに使われます"
                        style={{ ...inputStyle, padding: '8px 10px', fontSize: 14, fontWeight: 500 }} />
                    </div>
                    <div style={{ flex: '1 1 160px' }}>
                      <label style={{ ...labelStyle, fontSize: 10, marginBottom: 3 }}>社外視点名</label>
                      <input type="text" value={vp.viewpointNameExternal || ''}
                        onChange={(e) => updateViewpointField(vi, 'viewpointNameExternal', e.target.value)}
                        placeholder="お客様向け（任意）"
                        title="お客様向けの視点名。納品名のベースになります（空欄なら社内視点名）"
                        style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }} />
                    </div>
                    <div style={{ flex: '0 1 120px' }}>
                      <label style={{ ...labelStyle, fontSize: 10, marginBottom: 3 }}>内観/外観</label>
                      <select value={vp.viewpointCategory || ''}
                        onChange={(e) => updateViewpointField(vi, 'viewpointCategory', e.target.value)}
                        style={{ ...inputStyle, padding: '8px 8px', fontSize: 13, cursor: 'pointer' }}>
                        <option value="">未設定</option>
                        <option value="外観">外観</option>
                        <option value="内観">内観</option>
                      </select>
                    </div>
                    <div style={{ flex: '1 1 140px' }}>
                      <label style={{ ...labelStyle, fontSize: 10, marginBottom: 3 }}>担当者</label>
                      <Combobox value={vp.assignee || ''} onChange={(v) => updateViewpointAssignee(vi, v)}
                        options={assigneeList}
                        placeholder={form.assignee ? `既定: ${form.assignee}` : '担当者'}
                        title="この視点の担当者。空欄なら上の「デフォルト担当者」が使われます"
                        inputStyle={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }}
                        colors={colors} fontJP={fontJP} />
                    </div>
                    {/* 視点の統合：他の視点を選ぶと、その視点のステップをこの視点の末尾へ統合し、元の視点は消える */}
                    {form.viewpoints.length > 1 && (
                      <div style={{ flexShrink: 0, marginBottom: 1 }}>
                        <label style={{ ...labelStyle, fontSize: 10, marginBottom: 3 }}>統合（取り込み）</label>
                        <select value="" title="選んだ視点のステップを、この視点に統合します（元の視点は削除されます）"
                          onChange={(e) => {
                            const src = parseInt(e.target.value, 10);
                            e.target.value = '';
                            if (isNaN(src) || src === vi) return;
                            const srcName = (form.viewpoints[src]?.viewpointName || '').trim() || `視点 ${src + 1}`;
                            const dstName = (vp.viewpointName || '').trim() || `視点 ${vi + 1}`;
                            if (!window.confirm(`「${srcName}」のステップを「${dstName}」に統合します。\n元の「${srcName}」は削除されます。よろしいですか？`)) return;
                            mergeViewpoint(vi, src);
                          }}
                          style={{ ...inputStyle, padding: '8px 8px', fontSize: 12, cursor: 'pointer', width: 'auto', minWidth: 130 }}>
                          <option value="">他の視点を取り込む…</option>
                          {form.viewpoints.map((ovp, oi) => oi === vi ? null : (
                            <option key={oi} value={oi}>視点 {oi + 1}{(ovp.viewpointName || '').trim() ? `：${ovp.viewpointName}` : ''}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button type="button" onClick={() => removeViewpoint(vi)}
                      disabled={form.viewpoints.length <= 1}
                      style={{
                        background: '#fff', border: `1px solid ${colors.border}`,
                        padding: '8px 10px', borderRadius: 4, marginBottom: 1,
                        cursor: form.viewpoints.length <= 1 ? 'not-allowed' : 'pointer',
                        color: form.viewpoints.length <= 1 ? '#ccc' : colors.textMute,
                        display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: fontJP,
                      }}
                      title="この視点を削除"><Trash2 size={13} /> 視点削除</button>
                  </div>

                  {/* 上段2行目：開始時間・終了時間・個別納期（1行にまとめる） */}
                  <div style={{
                    display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
                    padding: '8px 12px', background: '#faf7ef', borderBottom: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }} title="任意・この視点の最初の未完了ステップに適用・差し込み優先">
                      <span style={{ fontSize: 11, color: colors.textMute, whiteSpace: 'nowrap', fontWeight: 600 }}>開始時間</span>
                      <input type="date" value={vp.manualStart ? vp.manualStart.split('T')[0] : ''}
                        onChange={(e) => setVpManualStart(vi, e.target.value, vp.manualStart ? (vp.manualStart.split('T')[1] || '') : '')}
                        style={{ ...inputStyle, width: 'auto', flex: '0 0 140px', padding: '6px 8px', fontSize: 12 }} />
                      <TimeSelect value={vp.manualStart ? (vp.manualStart.split('T')[1] || '') : ''}
                        onChange={(val) => setVpManualStart(vi, vp.manualStart ? vp.manualStart.split('T')[0] : '', val)}
                        colors={colors} fontJP={fontJP} allowEmpty />
                      {vp.manualStart && (
                        <button type="button" onClick={() => setVpManualStart(vi, '', '')}
                          style={{ background: 'transparent', border: `1px solid ${colors.border}`, padding: '5px 8px', borderRadius: 3, fontSize: 10, color: colors.textMute, cursor: 'pointer', fontFamily: fontJP, whiteSpace: 'nowrap', flexShrink: 0 }}>クリア</button>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }} title="任意・作業終了予定。この視点の最後の未完了ステップに適用・次のタスクはこの時刻以降に開始">
                      <span style={{ fontSize: 11, color: colors.textMute, whiteSpace: 'nowrap', fontWeight: 600 }}>終了時間</span>
                      <input type="date" value={vp.manualEnd ? vp.manualEnd.split('T')[0] : ''}
                        onChange={(e) => setVpManualEnd(vi, e.target.value, vp.manualEnd ? (vp.manualEnd.split('T')[1] || '') : '')}
                        style={{ ...inputStyle, width: 'auto', flex: '0 0 140px', padding: '6px 8px', fontSize: 12 }} />
                      <TimeSelect value={vp.manualEnd ? (vp.manualEnd.split('T')[1] || '') : ''}
                        onChange={(val) => setVpManualEnd(vi, vp.manualEnd ? vp.manualEnd.split('T')[0] : '', val)}
                        colors={colors} fontJP={fontJP} allowEmpty />
                      {vp.manualEnd && (
                        <button type="button" onClick={() => setVpManualEnd(vi, '', '')}
                          style={{ background: 'transparent', border: `1px solid ${colors.border}`, padding: '5px 8px', borderRadius: 3, fontSize: 10, color: colors.textMute, cursor: 'pointer', fontFamily: fontJP, whiteSpace: 'nowrap', flexShrink: 0 }}>クリア</button>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }} title={`任意・この視点の個別納期。未設定なら全体納期${form.projectDeadline ? `（${form.projectDeadline}）` : ''}を使用`}>
                      <span style={{ fontSize: 11, color: colors.textMute, whiteSpace: 'nowrap', fontWeight: 600 }}>個別納期</span>
                      <input type="date" value={vp.deadline || ''}
                        onChange={(e) => setVpDeadline(vi, e.target.value)}
                        style={{ ...inputStyle, width: 'auto', flex: '0 0 140px', padding: '6px 8px', fontSize: 12 }} />
                      {vp.deadline && (
                        <button type="button" onClick={() => setVpDeadline(vi, '')}
                          style={{ background: 'transparent', border: `1px solid ${colors.border}`, padding: '5px 8px', borderRadius: 3, fontSize: 10, color: colors.textMute, cursor: 'pointer', fontFamily: fontJP, whiteSpace: 'nowrap', flexShrink: 0 }}>クリア</button>
                      )}
                    </div>
                  </div>

                  {/* ステップリスト（下段）：納品名はステップごとに持つ */}
                  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {vp.steps.map((step, si) => {
                      // マスタから回数付きの表示名・納品名サフィックスを解決（配列順で連番）
                      const vpResolved = resolveViewpointSteps(vp.steps, stepTypeMaster);
                      const resolved = vpResolved[si] || { label: step.name, deliverySuffix: '', typeId: step.stepTypeId || '', paid: true };
                      const stepType = findStepType(stepTypeMaster, step);
                      const isPaid = !stepType || stepType.paid !== false; // 種類未選択・不明は有料扱い（金額欄を出す）
                      const selectValue = resolved.typeId || (step.name ? '__free__' : '');
                      const hNum = parseHM(step.hours);
                      const amtDefault = (!isNaN(hNum) && hNum > 0) ? String(Math.round(hNum * STEP_AMOUNT_RATE)) : '';
                      const vpBase = deliveryBaseName(form.projectName, vp.viewpointNameExternal || vp.viewpointName, vp.deliveryName);
                      const stepDelivery = stepDeliveryName(vpBase, resolved.deliverySuffix || step.name);
                      return (
                      <div key={si} style={{
                        display: 'flex', gap: 6, alignItems: 'flex-end',
                        background: '#fbf9f4', border: `1px solid ${colors.border}`,
                        borderRadius: 4, padding: 10, flexWrap: 'wrap',
                      }}>
                        {/* 番号バッジ ＋ 並び替え（▲▼）。並び順は登録時の順番として保存される。 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, marginBottom: 1 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <button type="button" onClick={() => moveStep(vi, si, -1)} disabled={si === 0}
                              title="このステップを上へ"
                              style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 2, padding: '0 3px', cursor: si === 0 ? 'not-allowed' : 'pointer', color: si === 0 ? '#ccc' : colors.textMute, display: 'flex', alignItems: 'center', lineHeight: 1 }}>
                              <ChevronUp size={11} />
                            </button>
                            <button type="button" onClick={() => moveStep(vi, si, 1)} disabled={si === vp.steps.length - 1}
                              title="このステップを下へ"
                              style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 2, padding: '0 3px', cursor: si === vp.steps.length - 1 ? 'not-allowed' : 'pointer', color: si === vp.steps.length - 1 ? '#ccc' : colors.textMute, display: 'flex', alignItems: 'center', lineHeight: 1 }}>
                              <ChevronDown size={11} />
                            </button>
                          </div>
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                            background: colors.text, color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 600,
                          }}>{si + 1}</div>
                        </div>
                        {/* ステップ名称（プルダウン選択式。選択肢は「マスタ」タブで編集可能） */}
                        <div style={{ flex: '0 1 150px', minWidth: 128 }}>
                          <label style={{ ...labelStyle, fontSize: 10, marginBottom: 4 }}>ステップ（種類）</label>
                          <select value={selectValue}
                            onChange={(e) => updateStepType(vi, si, e.target.value)}
                            style={{ ...inputStyle, padding: '7px 8px', fontSize: 13, cursor: 'pointer' }}
                            title="ステップの種類を選択。選択肢は「マスタ」タブのステップ設定で編集できます">
                            <option value="">選択…</option>
                            {stepTypeMaster.map(t => (
                              <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                            {selectValue === '__free__' && (
                              <option value="__free__">{step.name}（自由入力）</option>
                            )}
                          </select>
                          {/* 回数付きの解決後の名称（例：カラー変更1回目（有料））を表示 */}
                          {resolved.label && resolved.label !== step.name && (
                            <div style={{ fontSize: 10, color: colors.textMute, marginTop: 3 }}>→ {resolved.label}</div>
                          )}
                        </div>
                        {/* 納品名（ステップごと。空欄なら自動：案件名_社外視点名_納品名サフィックス。例：色付2） */}
                        <div style={{ flex: '1 1 120px', minWidth: 100 }}>
                          <label style={{ ...labelStyle, fontSize: 10, marginBottom: 4 }}>納品名</label>
                          <input type="text" value={step.deliveryName || ''}
                            onChange={(e) => updateStep(vi, si, 'deliveryName', e.target.value)}
                            placeholder={stepDelivery || '案件名_社外視点名_納品名'}
                            title="このステップの納品名。空欄なら自動（案件名_社外視点名_白色/色付…）。売上の制作名へ連携されます"
                            style={{ ...inputStyle, padding: '7px 10px', fontSize: 13 }} />
                        </div>
                        {/* 依頼日 */}
                        <div style={{ flex: '0 0 116px' }}>
                          <label style={{ ...labelStyle, fontSize: 10, marginBottom: 4 }}>依頼日</label>
                          <input type="date" value={step.requestDate || ''}
                            onChange={(e) => updateStep(vi, si, 'requestDate', e.target.value)}
                            style={{ ...inputStyle, padding: '6px 6px', fontSize: 12 }}
                            title="このステップ（納品）の依頼日。売上の発注/着手日へ連携されます" />
                        </div>
                        {/* 完了日（年月日＋時分）：1行に収める */}
                        <div style={{ flex: '0 0 auto' }}>
                          <label style={{ ...labelStyle, fontSize: 10, marginBottom: 4 }}>完了日</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
                            <input type="date" value={step.completedDate ? step.completedDate.split('T')[0] : ''}
                              onChange={(e) => setStepCompletedDate(vi, si, e.target.value, step.completedDate ? (step.completedDate.split('T')[1] || '') : '')}
                              style={{ ...inputStyle, width: 'auto', flex: '0 0 100px', padding: '6px 4px', fontSize: 12 }} />
                            <TimeSelect value={step.completedDate ? (step.completedDate.split('T')[1] || '') : ''}
                              onChange={(val) => setStepCompletedDate(vi, si, step.completedDate ? step.completedDate.split('T')[0] : '', val)}
                              colors={colors} fontJP={fontJP} allowEmpty />
                            {step.completedDate && (
                              <button type="button" onClick={() => updateStep(vi, si, 'completedDate', '')}
                                style={{ background: 'transparent', border: `1px solid ${colors.border}`, padding: '4px 6px', borderRadius: 3, fontSize: 10, color: colors.textMute, cursor: 'pointer', fontFamily: fontJP, flexShrink: 0 }}>×</button>
                            )}
                          </div>
                        </div>
                        {/* 金額（ラボ会社は対象外。無料ステップも対象外。制作時間×2,500円をデフォルト算出） */}
                        {amountApplicable && isPaid && (
                          <div style={{ flex: '0 0 86px' }}>
                            <label style={{ ...labelStyle, fontSize: 10, marginBottom: 4 }}>金額（円）</label>
                            <input type="text" inputMode="numeric" value={step.amount ?? ''}
                              onChange={(e) => updateStep(vi, si, 'amount', e.target.value)}
                              placeholder={amtDefault ? `自動 ${Number(amtDefault).toLocaleString('ja-JP')}` : '例: 30000'}
                              style={{ ...inputStyle, padding: '7px 8px', fontSize: 13, textAlign: 'right' }}
                              title="このステップ（納品）の金額（税抜）。制作時間×2,500円で自動算出（上書き可）。売上登録表へ1行連携" />
                          </div>
                        )}
                        {/* 無料ステップは金額欄なし（金額を反映しない旨を明示） */}
                        {amountApplicable && !isPaid && (
                          <div style={{ flex: '0 0 86px' }}>
                            <label style={{ ...labelStyle, fontSize: 10, marginBottom: 4 }}>金額（円）</label>
                            <div style={{ fontSize: 11, color: colors.textMute, padding: '7px 0' }}>無料</div>
                          </div>
                        )}
                        {/* 制作時間（変更すると金額を自動算出） */}
                        <div style={{ flex: '0 0 auto' }}>
                          <label style={{ ...labelStyle, fontSize: 10, marginBottom: 4 }}>制作時間</label>
                          <DurationSelect value={step.hours}
                            onChange={(val) => updateStepHours(vi, si, val)}
                            colors={colors} fontJP={fontJP} maxHours={100} />
                        </div>
                        {/* 完了時間 */}
                        <div style={{ flex: '0 0 auto' }}>
                          <label style={{ ...labelStyle, fontSize: 10, marginBottom: 4 }}>完了時間</label>
                          <DurationSelect value={step.completedHours}
                            onChange={(val) => updateStep(vi, si, 'completedHours', val)}
                            colors={colors} fontJP={fontJP} maxHours={100} />
                        </div>
                        <button type="button" onClick={() => removeStep(vi, si)}
                          disabled={vp.steps.length <= 1}
                          style={{
                            background: 'transparent', border: `1px solid ${colors.border}`,
                            padding: 7, borderRadius: 4, marginBottom: 1, flexShrink: 0,
                            cursor: vp.steps.length <= 1 ? 'not-allowed' : 'pointer',
                            color: vp.steps.length <= 1 ? '#ccc' : colors.textMute,
                            display: 'flex', alignItems: 'center',
                          }}
                          title="このステップを削除"><Trash2 size={13} /></button>
                      </div>
                      );
                    })}
                    {/* 初回依頼の合計金額：ホワイト・カラー（1回目＝回数なしの有料ステップ）の金額合計 */}
                    {amountApplicable && (() => {
                      const initialSteps = vp.steps.filter(s => {
                        const t = findStepType(stepTypeMaster, s);
                        return t && t.paid !== false && !t.numbered;
                      });
                      const total = initialSteps.reduce((sum, s) => {
                        const n = parseInt(String(s.amount ?? '').replace(/[^\d.-]/g, ''), 10);
                        return sum + (isNaN(n) ? 0 : n);
                      }, 0);
                      if (initialSteps.length === 0 || total <= 0) return null;
                      return (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                          background: colors.accentSoft, border: `1px solid ${colors.accent}`,
                          borderRadius: 4, padding: '7px 12px',
                        }}>
                          <span style={{ fontSize: 11.5, color: colors.accent, fontWeight: 700 }}>初回依頼 合計</span>
                          <span style={{ fontSize: 10.5, color: colors.textMute }}>（ホワイト＋カラー 1回目）</span>
                          <span style={{ fontSize: 14, color: colors.text, fontWeight: 700, marginLeft: 'auto' }}>¥{total.toLocaleString('ja-JP')}</span>
                        </div>
                      );
                    })()}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button type="button" onClick={() => addStep(vi)}
                        style={{
                          background: '#fff', border: `1px dashed ${colors.border}`,
                          padding: '6px 12px', borderRadius: 4, cursor: 'pointer',
                          fontFamily: fontJP, fontSize: 11, color: colors.textMute,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                        <Plus size={12} /> ステップを追加
                      </button>
                      <span style={{ fontSize: 10, color: colors.textMute }}>ステップ（種類）はプルダウンで選択。選択肢は「マスタ」タブのステップ設定で編集できます</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: colors.textMute }}>依頼項目を追加：</span>
              {VIEWPOINT_PRESETS.map(preset => (
                <button key={preset.id} type="button" onClick={() => addViewpointPreset(preset)}
                  style={{
                    background: colors.accentSoft, border: `1px solid ${colors.accent}`,
                    padding: '8px 14px', borderRadius: 4, cursor: 'pointer',
                    fontFamily: fontJP, fontSize: 12, color: colors.accent, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                  <Plus size={13} /> {preset.name}
                </button>
              ))}
              <button type="button" onClick={() => addViewpointPreset(null)}
                style={{
                  background: '#fff', border: `1px dashed ${colors.border}`,
                  padding: '8px 14px', borderRadius: 4, cursor: 'pointer',
                  fontFamily: fontJP, fontSize: 12, color: colors.textMute,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                <Plus size={13} /> 空の項目
              </button>
            </div>
            <div style={{ fontSize: 10, color: colors.textMute, marginTop: 8 }}>
              ※ 空欄の項目・ステップは登録されません ・ 制作時間は HH:MM（時:分）で入力（例 08:00・00:30）・ 制作時間0のステップは登録されません ・ 上から順に作業する想定でスケジュールされます ・ 視点は ▲▼ で並び替え、「統合（取り込み）」で他の視点のステップをこの視点にまとめられます
            </div>
          </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleSubmit}
            style={{
              padding: '10px 24px', background: colors.text, color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer',
              fontFamily: fontJP, fontSize: 14, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            {editMode ? <><Check size={16} /> 更新する</> : <><Plus size={16} /> 登録する</>}
          </button>
        </div>
        </>)}
      </section>

      {/* 表示切替：進行中一覧 / カレンダー / 担当者別 */}
      <div ref={tabBarRef} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', scrollMarginTop: 12 }}>
        {[{ id: 'list', label: '進行中一覧' }, { id: 'calendar', label: 'カレンダー' }, { id: 'assignee', label: '担当者別' }].map(t => (
          <button key={t.id} type="button" onClick={() => switchTab(t.id)}
            style={{
              padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 600,
              background: inputTab === t.id ? colors.text : 'transparent',
              color: inputTab === t.id ? '#fff' : colors.textMute,
              border: `1px solid ${inputTab === t.id ? colors.text : colors.border}`,
            }}>{t.label}</button>
        ))}
      </div>

      {inputTab === 'list' && (<>
      <section>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 18, margin: '0 0 16px 0', fontWeight: 500, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          進行中案件
          <span style={{ fontSize: 12, color: colors.textMute, fontFamily: fontJP }}>
            {q ? `${filteredActive.length} / ${scheduled.active.length}件` : `${scheduled.active.length}件 ・ 視点ごとにまとめて表示`}
          </span>
        </h2>

        {/* 表示切替＋案件の検索 */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => setListGroupMode('deadline')} style={tabStyle(listGroupMode === 'deadline', colors, fontJP)} title="納期の早い案件から表示（視点ごとの納期のうち最早のもの・納期なしは末尾・制作順）">
              納期順
            </button>
            <button type="button" onClick={() => setListGroupMode('company')} style={tabStyle(listGroupMode === 'company', colors, fontJP)} title="会社ごとに制作順で表示">
              会社別
            </button>
            <button type="button" onClick={() => setListGroupMode('assignee')} style={tabStyle(listGroupMode === 'assignee', colors, fontJP)} title="担当者ごとに制作順で表示">
              担当者別
            </button>
            <button type="button" onClick={() => setListGroupMode('board')} style={tabStyle(listGroupMode === 'board', colors, fontJP)} title="担当者ごとの進行中案件を一目で把握できるボード表示（納期の近い順）">
              担当者ボード
            </button>
          </div>
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 480 }}>
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
          {/* 完了したステップ・視点の表示切替 */}
          <button type="button" onClick={() => setShowCompleted(v => !v)}
            title="進行中の案件に紐づく完了ステップ・完了視点も一覧に表示します"
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px',
              background: showCompleted ? colors.text : '#fff', color: showCompleted ? '#fff' : colors.textMute,
              border: `1px solid ${showCompleted ? colors.text : colors.border}`, borderRadius: 20,
              cursor: 'pointer', fontFamily: fontJP, fontSize: 12,
            }}>
            {showCompleted ? <Check size={14} /> : <CheckCircle2 size={14} />}
            完了も表示
          </button>
        </div>

        {/* 納品パース・外注の集計バー（①納品集計 / ⑤外注集計） */}
        {(deliverySummary.parseCount > 0 || deliverySummary.prodAmount > 0 || deliverySummary.outVND > 0) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', background: '#fbf9f4', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '8px 14px', marginBottom: 14, fontFamily: fontJP, fontSize: 12 }}>
            <span style={{ fontWeight: 700, color: '#9c7b3c' }}>進行中の集計</span>
            <span>納品パース <b>{deliverySummary.parseCount}</b>枚{deliverySummary.parseLabel ? `（${deliverySummary.parseLabel}）` : ''}</span>
            {deliverySummary.prodAmount > 0 && <span>制作金額計 <b>¥{Math.round(deliverySummary.prodAmount).toLocaleString('ja-JP')}</b></span>}
            {deliverySummary.outVND > 0 && (
              <span>外注金額計 <b>{Math.round(deliverySummary.outVND).toLocaleString('ja-JP')}₫</b>
                {Object.keys(deliverySummary.offPeople).length > 0 && (
                  <span style={{ color: colors.textMute, marginLeft: 6 }}>
                    （{Object.entries(deliverySummary.offPeople).map(([p, v]) => `${p} ${Math.round(v).toLocaleString('ja-JP')}₫`).join(' / ')}）
                  </span>
                )}
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 10.5, color: colors.textMute }}>金額・外注は売上登録表へ自動連携されます</span>
          </div>
        )}

        {scheduled.active.length === 0 ? (
          <div style={{ background: colors.surface, border: `1px dashed ${colors.border}`, borderRadius: 6, padding: 48, textAlign: 'center', color: colors.textMute, fontSize: 13 }}>
            進行中のタスクがありません。上のフォームから登録してください。
          </div>
        ) : filteredActive.length === 0 ? (
          <div style={{ background: colors.surface, border: `1px dashed ${colors.border}`, borderRadius: 6, padding: 48, textAlign: 'center', color: colors.textMute, fontSize: 13 }}>
            「{searchQuery}」に一致する案件はありません。
          </div>
        ) : listGroupMode === 'board' ? (
          // 担当者ボード：担当者ごとの進行中案件を一目で把握できる一覧（④）
          <AssigneeBoard tasks={filteredActive} />
        ) : listGroupMode === 'assignee' ? (
          // 担当者別表示：従業員マスタの並び順で担当者ごとにまとめ、タブで絞り込みできる
          (() => {
            const listAssignees = sortAssigneesByMaster([...new Set(filteredActive.map(t => t.assignee))], assigneeOrder);
            const currentA = selectedListAssignee && listAssignees.includes(selectedListAssignee) ? selectedListAssignee : null;
            return (
              <>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  <button type="button" onClick={() => setSelectedListAssignee(null)} style={tabStyle(currentA === null, colors, fontJP)}>
                    すべて表示
                  </button>
                  {listAssignees.map(a => {
                    const ts = filteredActive.filter(t => t.assignee === a);
                    const remaining = ts.reduce((s, t) => s + Math.max(0, t.hours - (t.completedHours || 0)), 0);
                    return (
                      <button key={a} type="button" onClick={() => setSelectedListAssignee(a)} style={tabStyle(currentA === a, colors, fontJP)}>
                        {a || '（担当者未設定）'}
                        <span style={{
                          marginLeft: 6, fontSize: 10, opacity: 0.7,
                          padding: '1px 5px', borderRadius: 8,
                          background: currentA === a ? 'rgba(255,255,255,0.2)' : '#f0ebde',
                        }}>{ts.length}件 / 残{fmtHM(remaining)}</span>
                      </button>
                    );
                  })}
                </div>
                {(currentA ? [currentA] : listAssignees).map(a => {
            const aTasks = filteredActive.filter(t => t.assignee === a);
            const aTotal = aTasks.reduce((s, t) => s + t.hours, 0);
            const aDone = aTasks.reduce((s, t) => s + (t.completedHours || 0), 0);
            const aGroups = groupByViewpoint(aTasks, vpDeliveryCount);
            return (
              <section key={a} style={{ marginBottom: 28 }}>
                <div style={{
                  background: '#fbf9f4', border: `1px solid ${colors.border}`,
                  borderRadius: 6, padding: '10px 16px', marginBottom: 10,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: getProjectColor(a), color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 600, fontSize: 13, flexShrink: 0,
                  }}>{(a || '?').slice(0, 1)}</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a || '（担当者未設定）'}</div>
                  <div style={{ fontSize: 11, color: colors.textMute }}>
                    {aGroups.length}視点 ・ {aTasks.length}タスク ・ 完了 {fmtHM(aDone)} / 全 {fmtHM(aTotal)} ・
                    <span style={{ color: colors.accent, fontWeight: 600 }}> 残 {fmtHM(Math.max(0, aTotal - aDone))}</span>
                  </div>
                </div>
                <ViewpointGroupList
                  groups={aGroups}
                  allActive={filteredActive}
                  sortMode="deadline"
                  defaultCollapsed />
              </section>
            );
          })}
              </>
            );
          })()
        ) : (
          <ViewpointGroupList
            groups={groupByViewpoint(filteredActive, vpDeliveryCount)}
            allActive={filteredActive}
            sortMode={listGroupMode === 'deadline' ? 'deadline' : 'production'}
            defaultCollapsed />
        )}
      </section>

      <SuspendedSection suspended={scheduled.suspended} />

      <ReviewSection review={scheduled.review} />
      </>)}
      {inputTab === 'calendar' && <CalendarView />}
      {inputTab === 'assignee' && (
        <AssigneeView selectedAssignee={selectedAssignee} setSelectedAssignee={setSelectedAssignee} />
      )}
    </div>
  );
}


export { InputView };
