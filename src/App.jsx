import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, Calendar as CalIcon, MessageSquare, Settings as SettingsIcon, Check, X, Clock, Folder, User, ChevronUp, ChevronDown, Users, CheckCircle2, RotateCcw, TrendingUp, ArrowRight } from 'lucide-react';
import { storage, signIn, signOutUser, subscribeAuth } from './firebase.js';

// ============ 定数・ユーティリティ ============
const PRIORITY_COLORS = ['#c1272d', '#d4a017', '#7a8471', '#5d4037', '#37474f'];
function priorityColor(p) {
  if (!p || p < 1) return '#9e9e9e';
  return PRIORITY_COLORS[Math.min(p - 1, PRIORITY_COLORS.length - 1)];
}

const PROJECT_PALETTE = [
  '#3a5a40', '#264653', '#bc6c25', '#5d4037',
  '#1d3557', '#6a4c93', '#37474f', '#8d6e63',
  '#4e342e', '#33691e', '#0d47a1', '#4527a0',
];
function getProjectColor(name) {
  if (!name) return '#888';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (name.charCodeAt(i) + ((hash << 5) - hash)) | 0;
  return PROJECT_PALETTE[Math.abs(hash) % PROJECT_PALETTE.length];
}

const fmtMD = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
const fmtYMD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtYMDJP = (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
const dayName = (d) => ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const startOfDay = (d) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; };
const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const timeToMin = (s) => {
  if (!s) return 0;
  const [h, m] = s.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const minToTime = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// datetime-local 値（"YYYY-MM-DDTHH:mm"）← → Date
const dtLocalToDate = (s) => s ? new Date(s) : null;
const dateToDtLocal = (d) => {
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const DEFAULT_SETTINGS = {
  morningStart: '08:00',
  morningEnd: '12:00',
  afternoonStart: '13:00',
  afternoonEnd: '17:00',
  startDate: fmtYMD(new Date()),
  startTime: '08:00',
};

function getDailySlots(settings) {
  return [
    { start: timeToMin(settings.morningStart), end: timeToMin(settings.morningEnd) },
    { start: timeToMin(settings.afternoonStart), end: timeToMin(settings.afternoonEnd) },
  ];
}
function getHoursPerDay(settings) {
  return getDailySlots(settings).reduce((s, x) => s + (x.end - x.start) / 60, 0);
}

// ============ マイグレーション ============
function migrateTask(task) {
  let priority = task.priority;
  if (typeof priority === 'string') {
    const map = { high: 1, medium: 2, low: 3 };
    priority = map[priority] || 99;
  }
  if (typeof priority !== 'number' || priority < 1) priority = 99;

  const completedHours = typeof task.completedHours === 'number' ? task.completedHours : 0;

  // taskName → viewpointName
  let viewpointName = task.viewpointName;
  if (!viewpointName && task.taskName) viewpointName = task.taskName;
  if (!viewpointName) viewpointName = '視点';

  const stepName = task.stepName || null;
  const stepOrder = (task.stepOrder !== undefined && task.stepOrder !== null) ? task.stepOrder : null;
  const manualStart = task.manualStart || null;

  const { taskName, ...rest } = task;
  return { ...rest, viewpointName, stepName, stepOrder, manualStart, priority, completedHours };
}

function normalizePriorities(tasks) {
  const active = tasks.filter(t => t.status !== 'done');
  const done = tasks.filter(t => t.status === 'done');
  const sorted = [...active].sort((a, b) => (a.priority - b.priority) || (a.createdAt - b.createdAt));
  const renumbered = sorted.map((t, i) => ({ ...t, priority: i + 1 }));
  return [...renumbered, ...done];
}

// ============ スケジューリング ============
function scheduleTasks(tasks, settings) {
  const dailySlots = getDailySlots(settings);
  const startDate = startOfDay(settings.startDate ? new Date(settings.startDate + 'T00:00:00') : new Date());
  // 起点の時刻（指定がなければ午前開始時刻）。営業時間外でも既存ロジックが自動で次の枠へ送る
  const startMinOfDay = settings.startTime ? timeToMin(settings.startTime) : dailySlots[0].start;

  const active = tasks.filter(t => t.status !== 'done');
  const done = tasks.filter(t => t.status === 'done');

  const sorted = [...active].sort((a, b) => (a.priority - b.priority) || (a.createdAt - b.createdAt));
  const cursors = {};

  const scheduled = sorted.map(task => {
    const remainingHours = Math.max(0, (task.hours || 0) - (task.completedHours || 0));

    if (!cursors[task.assignee]) {
      cursors[task.assignee] = { date: startOfDay(startDate), minOfDay: startMinOfDay };
    }
    const cursor = cursors[task.assignee];

    if (remainingHours <= 0) {
      return { ...task, scheduledStart: null, scheduledEnd: null, slots: [], remainingHours: 0 };
    }

    // 開始時間（手動指定）の処理：カーソルより未来なら、そこへジャンプ
    if (task.manualStart) {
      const ms = new Date(task.manualStart);
      if (!isNaN(ms.getTime())) {
        const msDate = startOfDay(ms);
        const msMin = ms.getHours() * 60 + ms.getMinutes();
        const cursorTime = cursor.date.getTime() + cursor.minOfDay * 60000;
        const msTime = msDate.getTime() + msMin * 60000;
        if (msTime > cursorTime) {
          cursor.date = new Date(msDate);
          cursor.minOfDay = msMin;
        }
      }
    }

    let remainingMin = remainingHours * 60;
    const slots = [];

    while (remainingMin > 0) {
      while (isWeekend(cursor.date)) {
        cursor.date = addDays(cursor.date, 1);
        cursor.minOfDay = dailySlots[0].start;
      }

      for (const ds of dailySlots) {
        if (remainingMin <= 0) break;
        if (cursor.minOfDay >= ds.end) continue;
        const slotStart = Math.max(cursor.minOfDay, ds.start);
        const available = ds.end - slotStart;
        if (available <= 0) continue;
        const use = Math.min(remainingMin, available);
        slots.push({
          date: new Date(cursor.date),
          startMin: slotStart,
          endMin: slotStart + use,
          hours: use / 60,
        });
        cursor.minOfDay = slotStart + use;
        remainingMin -= use;
      }

      if (remainingMin > 0) {
        cursor.date = addDays(cursor.date, 1);
        cursor.minOfDay = dailySlots[0].start;
      }
    }

    return {
      ...task,
      scheduledStart: slots[0].date,
      scheduledStartMin: slots[0].startMin,
      scheduledEnd: slots[slots.length - 1].date,
      scheduledEndMin: slots[slots.length - 1].endMin,
      slots, remainingHours,
    };
  });

  return { active: scheduled, done };
}

// ============ 視点ごとにグループ化 ============
function groupByViewpoint(tasks) {
  const groups = {};
  for (const task of tasks) {
    const key = `${task.assignee}::${task.projectName}::${task.viewpointName}`;
    if (!groups[key]) {
      groups[key] = {
        key,
        projectName: task.projectName,
        viewpointName: task.viewpointName,
        assignee: task.assignee,
        tasks: [],
        minPriority: task.priority,
      };
    }
    groups[key].tasks.push(task);
    if (task.priority < groups[key].minPriority) groups[key].minPriority = task.priority;
  }
  // 各グループ内：stepOrder → priority → createdAt の順
  for (const g of Object.values(groups)) {
    g.tasks.sort((a, b) => {
      const ao = a.stepOrder == null ? -1 : a.stepOrder;
      const bo = b.stepOrder == null ? -1 : b.stepOrder;
      if (ao !== bo) return ao - bo;
      return (a.priority - b.priority) || (a.createdAt - b.createdAt);
    });
    g.totalHours = g.tasks.reduce((s, t) => s + (t.hours || 0), 0);
    g.completedHours = g.tasks.reduce((s, t) => s + (t.completedHours || 0), 0);
    g.remainingHours = g.totalHours - g.completedHours;
    // 視点全体の開始～終了
    const validSlots = g.tasks.filter(t => t.scheduledStart && t.scheduledEnd);
    if (validSlots.length > 0) {
      g.scheduledStart = validSlots[0].scheduledStart;
      g.scheduledStartMin = validSlots[0].scheduledStartMin;
      const last = validSlots[validSlots.length - 1];
      g.scheduledEnd = last.scheduledEnd;
      g.scheduledEndMin = last.scheduledEndMin;
    }
  }
  return Object.values(groups).sort((a, b) => a.minPriority - b.minPriority);
}

// ============ メイン ============
export default function App() {
  const [tasks, setTasks] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('input');
  const [editingId, setEditingId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [auth, setAuth] = useState({ user: null, allowed: false, ready: false });
  const [signInError, setSignInError] = useState('');

  useEffect(() => subscribeAuth(setAuth), []);

  const makeEmptyViewpoint = () => ({
    viewpointName: '',
    steps: [
      { name: 'ホワイト', hours: '', completedHours: '' },
      { name: 'カラー', hours: '', completedHours: '' },
      { name: 'その他修正', hours: '', completedHours: '' },
    ],
  });
  const emptyForm = {
    projectName: '', assignee: '', priority: '', manualStart: '',
    // 新規登録用：視点（担当タスク）の動的リスト。各視点の中にステップ（工程）を持つ
    viewpoints: [makeEmptyViewpoint()],
    // 編集時のみ使用（単一ステップ編集）
    editViewpointName: '', editStepName: '', hours: '', completedHours: '',
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!auth.allowed) return;
    // 認証済み → リアルタイム同期を開始
    const unsubTasks = storage.subscribe('tasks', (val) => {
      let loadedTasks = [];
      if (val) {
        try { loadedTasks = JSON.parse(val); } catch (e) { }
      }
      loadedTasks = loadedTasks.map(migrateTask);
      loadedTasks = normalizePriorities(loadedTasks);
      setTasks(loadedTasks);
      setLoading(false);
    });
    const unsubSettings = storage.subscribe('settings', (val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch (e) { }
      }
    });
    return () => { unsubTasks(); unsubSettings(); };
  }, [auth.allowed]);

  const saveTasks = async (newTasks) => {
    setTasks(newTasks); // 楽観的に画面を即更新
    try { await storage.set('tasks', JSON.stringify(newTasks)); }
    catch (e) { console.error(e); }
  };

  const saveSettings = async (newSettings) => {
    setSettings(newSettings);
    try {
      const { morningStart, morningEnd, afternoonStart, afternoonEnd, startDate, startTime } = newSettings;
      await storage.set('settings', JSON.stringify({ morningStart, morningEnd, afternoonStart, afternoonEnd, startDate, startTime }));
    } catch (e) { console.error(e); }
  };

  const handleSubmit = () => {
    if (!form.projectName.trim() || !form.assignee.trim()) {
      alert('案件名・担当者を入力してください');
      return;
    }
    let priority = parseInt(form.priority, 10);
    const activeCount = tasks.filter(t => t.status !== 'done').length;
    if (isNaN(priority) || priority < 1) {
      priority = editingId ? (tasks.find(t => t.id === editingId)?.priority || activeCount + 1) : activeCount + 1;
    }

    if (editingId) {
      // 編集：単一ステップを更新（視点名・ステップ名も変更可）
      const hours = parseFloat(form.hours);
      if (isNaN(hours) || hours <= 0) { alert('制作時間を入力してください'); return; }
      const completed = form.completedHours === '' ? 0 : parseFloat(form.completedHours);
      if (isNaN(completed) || completed < 0) { alert('完了済み時間は0以上にしてください'); return; }
      if (completed > hours) { alert('完了済み時間は制作時間を超えられません'); return; }
      const vpName = form.editViewpointName.trim();
      const stepName = form.editStepName.trim();
      if (!vpName) { alert('視点名を入力してください'); return; }
      if (!stepName) { alert('ステップ名を入力してください'); return; }

      const autoDone = completed >= hours;
      const updated = tasks.map(t => t.id === editingId ? {
        ...t,
        projectName: form.projectName.trim(),
        viewpointName: vpName,
        assignee: form.assignee.trim(),
        stepName,
        hours, completedHours: completed, priority,
        manualStart: form.manualStart || null,
        status: autoDone ? 'done' : (t.status === 'done' ? 'pending' : t.status),
        completedAt: autoDone ? (t.completedAt || Date.now()) : null,
      } : t);
      setEditingId(null);
      saveTasks(normalizePriorities(updated));
    } else {
      // 新規：案件 → 複数視点 → 各視点のステップ をまとめて作成
      const baseTime = Date.now();
      const records = [];
      let seq = 0;
      for (const vp of form.viewpoints) {
        const vpName = (vp.viewpointName || '').trim();
        const hasAnyInput = vpName || vp.steps.some(s => (s.name || '').trim() || (parseFloat(s.hours) > 0));
        if (!hasAnyInput) continue; // 完全に空の視点はスキップ
        if (!vpName) { alert('内容を入力した視点には視点名も入力してください'); return; }

        let order = 0;
        let vpHasStep = false;
        for (const step of vp.steps) {
          const name = (step.name || '').trim();
          const stepHours = parseFloat(step.hours);
          if (!name && (isNaN(stepHours) || stepHours <= 0)) continue;
          if (!name) { alert(`視点「${vpName}」で時間を入力したステップには名称も入力してください`); return; }
          if (isNaN(stepHours) || stepHours <= 0) { alert(`視点「${vpName}」の「${name}」の制作時間を入力してください`); return; }
          const stepCompleted = step.completedHours === '' ? 0 : parseFloat(step.completedHours);
          if (isNaN(stepCompleted) || stepCompleted < 0) { alert(`「${name}」の完了時間が無効です`); return; }
          if (stepCompleted > stepHours) { alert(`「${name}」の完了時間が制作時間を超えています`); return; }
          const autoDone = stepCompleted >= stepHours;
          records.push({
            id: `task-${baseTime}-${seq}-${Math.random().toString(36).slice(2, 7)}`,
            projectName: form.projectName.trim(),
            viewpointName: vpName,
            stepName: name, stepOrder: order,
            assignee: form.assignee.trim(),
            priority, hours: stepHours, completedHours: stepCompleted,
            // 開始時間は一番最初の有効ステップだけに紐付ける
            manualStart: (records.length === 0 && form.manualStart) ? form.manualStart : null,
            status: autoDone ? 'done' : 'pending',
            completedAt: autoDone ? baseTime + seq : null,
            createdAt: baseTime + seq,
          });
          order++; seq++; vpHasStep = true;
        }
        if (!vpHasStep) { alert(`視点「${vpName}」に少なくとも1つのステップ（名称＋時間）を入力してください`); return; }
      }
      if (records.length === 0) { alert('少なくとも1つの視点とステップを入力してください'); return; }
      saveTasks(normalizePriorities([...tasks, ...records]));
    }
    setForm(emptyForm);
  };

  const handleEdit = (task) => {
    setForm({
      ...emptyForm,
      projectName: task.projectName,
      assignee: task.assignee,
      priority: String(task.priority),
      manualStart: task.manualStart || '',
      editViewpointName: task.viewpointName || '',
      editStepName: task.stepName || task.viewpointName || '',
      hours: String(task.hours),
      completedHours: String(task.completedHours || 0),
    });
    setEditingId(task.id);
    setView('input');
  };

  const handleAddStepToViewpoint = (group) => {
    // この視点に新しいステップを1行だけ追加できる状態でフォームを開く
    setForm({
      ...emptyForm,
      projectName: group.projectName,
      assignee: group.assignee,
      priority: String(group.minPriority),
      viewpoints: [{ viewpointName: group.viewpointName, steps: [{ name: '', hours: '', completedHours: '' }] }],
    });
    setEditingId(null);
    setView('input');
  };

  // 担当者の振り分け（視点内の全ステップを一括変更）
  const reassignViewpoint = (group, newAssignee) => {
    const na = (newAssignee || '').trim();
    if (!na) return;
    const ids = new Set(group.tasks.map(t => t.id));
    const updated = tasks.map(t => ids.has(t.id) ? { ...t, assignee: na } : t);
    saveTasks(normalizePriorities(updated));
  };

  const handleDelete = (id) => {
    if (confirm('このタスクを削除しますか？')) {
      saveTasks(normalizePriorities(tasks.filter(t => t.id !== id)));
    }
  };

  const toggleStatus = (id) => {
    const updated = tasks.map(t => {
      if (t.id !== id) return t;
      if (t.status === 'done') return { ...t, status: 'pending', completedAt: null };
      return { ...t, status: 'done', completedHours: t.hours, completedAt: Date.now() };
    });
    saveTasks(normalizePriorities(updated));
  };

  const addProgress = (id, delta) => {
    const updated = tasks.map(t => {
      if (t.id !== id) return t;
      const newCompleted = Math.min(t.hours, Math.max(0, (t.completedHours || 0) + delta));
      const autoComplete = newCompleted >= t.hours;
      return {
        ...t, completedHours: newCompleted,
        status: autoComplete ? 'done' : 'pending',
        completedAt: autoComplete ? Date.now() : null,
      };
    });
    saveTasks(normalizePriorities(updated));
  };

  const moveUp = (id) => {
    const sorted = tasks.filter(t => t.status !== 'done')
      .sort((a, b) => (a.priority - b.priority) || (a.createdAt - b.createdAt));
    const idx = sorted.findIndex(t => t.id === id);
    if (idx <= 0) return;
    const a = sorted[idx], b = sorted[idx - 1];
    const updated = tasks.map(t => {
      if (t.id === a.id) return { ...t, priority: b.priority };
      if (t.id === b.id) return { ...t, priority: a.priority };
      return t;
    });
    saveTasks(normalizePriorities(updated));
  };

  const moveDown = (id) => {
    const sorted = tasks.filter(t => t.status !== 'done')
      .sort((a, b) => (a.priority - b.priority) || (a.createdAt - b.createdAt));
    const idx = sorted.findIndex(t => t.id === id);
    if (idx < 0 || idx >= sorted.length - 1) return;
    const a = sorted[idx], b = sorted[idx + 1];
    const updated = tasks.map(t => {
      if (t.id === a.id) return { ...t, priority: b.priority };
      if (t.id === b.id) return { ...t, priority: a.priority };
      return t;
    });
    saveTasks(normalizePriorities(updated));
  };

  const changePriority = (id, newPriority) => {
    const np = parseInt(newPriority, 10);
    if (isNaN(np) || np < 1) return;
    const updated = tasks.map(t => t.id === id ? { ...t, priority: np } : t);
    saveTasks(normalizePriorities(updated));
  };

  const scheduled = useMemo(() => scheduleTasks(tasks, settings), [tasks, settings]);
  const projectList = useMemo(() => [...new Set(tasks.map(t => t.projectName))].filter(Boolean), [tasks]);
  const viewpointList = useMemo(() => [...new Set(tasks.map(t => t.viewpointName))].filter(Boolean), [tasks]);
  const assigneeList = useMemo(() => [...new Set(tasks.map(t => t.assignee))].filter(Boolean), [tasks]);
  const hoursPerDay = getHoursPerDay(settings);

  const colors = {
    bg: '#faf8f3', surface: '#ffffff', border: '#e8e3d6',
    text: '#1a1a1a', textMute: '#6b6b6b',
    accent: '#c1272d', accentSoft: '#fce8e8',
    progress: '#3a5a40',
  };
  const fontJP = "'Noto Sans JP', sans-serif";
  const fontDisplay = "'Shippori Mincho', serif";

  if (!auth.ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: colors.bg, fontFamily: fontJP, color: colors.textMute }}>
        読み込み中...
      </div>
    );
  }

  if (!auth.allowed) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: colors.bg, fontFamily: fontJP, color: colors.text, padding: 20 }}>
        <div style={{ maxWidth: 380, width: '100%', textAlign: 'center', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '40px 32px' }}>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 30, fontWeight: 700, letterSpacing: '0.05em', margin: '0 0 8px 0' }}>
            工程<span style={{ color: colors.accent }}>図</span>
          </h1>
          <p style={{ fontSize: 10, color: colors.textMute, margin: '0 0 28px 0', letterSpacing: '0.15em' }}>SCHEDULE VISUALIZER</p>
          <button
            onClick={async () => {
              setSignInError('');
              try { await signIn(); }
              catch (e) {
                if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') return;
                setSignInError('サインインに失敗しました：' + (e?.message || e));
              }
            }}
            style={{ width: '100%', padding: '12px 16px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 14, fontWeight: 500, color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"/></svg>
            Google でサインイン
          </button>
          {auth.deniedEmail && (
            <p style={{ marginTop: 18, color: colors.accent, fontSize: 12 }}>
              {auth.deniedEmail} は許可されていません。
            </p>
          )}
          {signInError && (
            <p style={{ marginTop: 18, color: colors.accent, fontSize: 12 }}>{signInError}</p>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: colors.bg, fontFamily: fontJP, color: colors.textMute }}>
        読み込み中...
      </div>
    );
  }

  const navItems = [
    { id: 'input', icon: <Plus size={15} />, label: '入力' },
    { id: 'calendar', icon: <CalIcon size={15} />, label: 'カレンダー' },
    { id: 'byAssignee', icon: <Users size={15} />, label: '担当者別' },
    { id: 'message', icon: <MessageSquare size={15} />, label: 'サマリー' },
    { id: 'done', icon: <CheckCircle2 size={15} />, label: '完了' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, fontFamily: fontJP, color: colors.text }}>
      <header style={{ borderBottom: `1px solid ${colors.border}`, background: colors.surface }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: fontDisplay, fontSize: 26, fontWeight: 700, letterSpacing: '0.05em', margin: 0, lineHeight: 1 }}>
              工程<span style={{ color: colors.accent }}>図</span>
            </h1>
            <p style={{ fontSize: 10, color: colors.textMute, margin: '6px 0 0 0', letterSpacing: '0.15em' }}>SCHEDULE VISUALIZER</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {navItems.map(item => (
              <NavButton key={item.id} active={view === item.id} onClick={() => setView(item.id)} icon={item.icon} label={item.label}
                badge={item.id === 'done' ? scheduled.done.length : null} />
            ))}
            <button onClick={() => setShowSettings(!showSettings)}
              style={{ padding: '7px 9px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', color: colors.textMute }}
              title="設定"><SettingsIcon size={15} /></button>
            <button onClick={() => signOutUser()}
              title={auth.user?.email ? `${auth.user.email} からサインアウト` : 'サインアウト'}
              style={{ padding: '6px 10px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', color: colors.textMute, fontFamily: fontJP, fontSize: 11 }}>
              サインアウト
            </button>
          </div>
        </div>

        {showSettings && (
          <div style={{ borderTop: `1px solid ${colors.border}`, background: '#fbf9f4', padding: '16px 28px' }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: colors.textMute }}>開始日時</span>
                <input type="date" value={settings.startDate}
                  onChange={(e) => saveSettings({ ...settings, startDate: e.target.value })}
                  style={{ padding: '4px 8px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 13 }} />
                <TimeSelect value={settings.startTime || '08:00'}
                  onChange={(val) => saveSettings({ ...settings, startTime: val })}
                  colors={colors} fontJP={fontJP} />
              </label>
              <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ color: colors.textMute }}>午前</span>
                <TimeSelect value={settings.morningStart} onChange={(val) => saveSettings({ ...settings, morningStart: val })} colors={colors} fontJP={fontJP} />
                <span style={{ color: colors.textMute }}>〜</span>
                <TimeSelect value={settings.morningEnd} onChange={(val) => saveSettings({ ...settings, morningEnd: val })} colors={colors} fontJP={fontJP} />
              </div>
              <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ color: colors.textMute }}>午後</span>
                <TimeSelect value={settings.afternoonStart} onChange={(val) => saveSettings({ ...settings, afternoonStart: val })} colors={colors} fontJP={fontJP} />
                <span style={{ color: colors.textMute }}>〜</span>
                <TimeSelect value={settings.afternoonEnd} onChange={(val) => saveSettings({ ...settings, afternoonEnd: val })} colors={colors} fontJP={fontJP} />
              </div>
              <span style={{ fontSize: 11, color: colors.textMute, marginLeft: 'auto' }}>1日 {hoursPerDay}時間 ・ 土日除外</span>
            </div>
          </div>
        )}
      </header>

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '28px' }}>
        {view === 'input' && (
          <InputView form={form} setForm={setForm} handleSubmit={handleSubmit} editingId={editingId}
            cancelEdit={() => { setEditingId(null); setForm(emptyForm); }}
            tasks={tasks} scheduled={scheduled}
            handleEdit={handleEdit} handleDelete={handleDelete} toggleStatus={toggleStatus}
            moveUp={moveUp} moveDown={moveDown} changePriority={changePriority} addProgress={addProgress}
            handleAddStepToViewpoint={handleAddStepToViewpoint} reassignViewpoint={reassignViewpoint}
            projectList={projectList} viewpointList={viewpointList} assigneeList={assigneeList}
            settings={settings}
            colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
        )}
        {view === 'calendar' && (
          <CalendarView scheduled={scheduled} settings={settings} colors={colors} fontDisplay={fontDisplay} />
        )}
        {view === 'byAssignee' && (
          <AssigneeView scheduled={scheduled} selectedAssignee={selectedAssignee} setSelectedAssignee={setSelectedAssignee}
            handleEdit={handleEdit} handleDelete={handleDelete} toggleStatus={toggleStatus}
            moveUp={moveUp} moveDown={moveDown} changePriority={changePriority} addProgress={addProgress}
            handleAddStepToViewpoint={handleAddStepToViewpoint} reassignViewpoint={reassignViewpoint} assigneeList={assigneeList}
            colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
        )}
        {view === 'message' && (
          <MessageView scheduled={scheduled} settings={settings} colors={colors} fontDisplay={fontDisplay} />
        )}
        {view === 'done' && (
          <DoneView scheduled={scheduled} toggleStatus={toggleStatus} handleDelete={handleDelete}
            colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '24px', color: colors.textMute, fontSize: 11, borderTop: `1px solid ${colors.border}`, marginTop: 40 }}>
        データはクラウドに保存されます ・ どの端末からでも同じ内容が表示され、チームと共有できます
      </footer>
    </div>
  );
}

// ============ 時刻選択（時・分プルダウン） ============
// どの環境でも確実に入力できるよう、ネイティブの time 入力ではなくプルダウンを使う
function TimeSelect({ value, onChange, colors, fontJP, allowEmpty = false }) {
  const parts = value ? value.split(':') : ['', ''];
  const h = parts[0] || '';
  const m = parts[1] || '';
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const mins = ['00', '15', '30', '45'];
  // 現在の分が候補にない場合（例: 08:05）も選べるよう補完
  if (m && !mins.includes(m)) mins.push(m);
  mins.sort();

  const update = (nh, nm) => {
    if (allowEmpty && !nh && !nm) { onChange(''); return; }
    const hh = nh || '08';
    const mm = nm || '00';
    onChange(`${hh}:${mm}`);
  };
  const selectStyle = {
    padding: '6px 4px', border: `1px solid ${colors.border}`, borderRadius: 3,
    fontFamily: fontJP, fontSize: 13, background: '#fff', color: colors.text, cursor: 'pointer',
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <select value={h} onChange={(e) => update(e.target.value, m)} style={selectStyle}>
        {allowEmpty && <option value="">--</option>}
        {hours.map(hr => <option key={hr} value={hr}>{hr}</option>)}
      </select>
      <span style={{ color: colors.textMute, fontSize: 13 }}>時</span>
      <select value={m} onChange={(e) => update(h, e.target.value)} style={selectStyle}>
        {allowEmpty && <option value="">--</option>}
        {mins.map(mn => <option key={mn} value={mn}>{mn}</option>)}
      </select>
      <span style={{ color: colors.textMute, fontSize: 13 }}>分</span>
    </span>
  );
}

// ============ ナビボタン ============
function NavButton({ active, onClick, icon, label, badge }) {
  return (
    <button onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 12px',
        background: active ? '#1a1a1a' : 'transparent',
        color: active ? '#fff' : '#1a1a1a',
        border: `1px solid ${active ? '#1a1a1a' : '#e8e3d6'}`,
        borderRadius: 4, cursor: 'pointer',
        fontFamily: "'Noto Sans JP', sans-serif",
        fontSize: 13, fontWeight: 500,
      }}>
      {icon}{label}
      {badge != null && badge > 0 && (
        <span style={{
          background: active ? '#fff' : '#1a1a1a', color: active ? '#1a1a1a' : '#fff',
          fontSize: 10, padding: '1px 5px', borderRadius: 8, marginLeft: 2, fontWeight: 600,
        }}>{badge}</span>
      )}
    </button>
  );
}

// ============ 入力ビュー ============
function InputView({ form, setForm, handleSubmit, editingId, cancelEdit, tasks, scheduled, handleEdit, handleDelete, toggleStatus, moveUp, moveDown, changePriority, addProgress, handleAddStepToViewpoint, reassignViewpoint, projectList, viewpointList, assigneeList, settings, colors, fontJP, fontDisplay }) {
  const inputStyle = {
    width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`,
    borderRadius: 4, fontFamily: fontJP, fontSize: 14, background: '#fff',
    color: colors.text, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', fontSize: 12, color: colors.textMute, marginBottom: 6, letterSpacing: '0.05em' };

  // 視点・ステップ操作ヘルパー
  const newViewpoint = () => ({
    viewpointName: '',
    steps: [
      { name: 'ホワイト', hours: '', completedHours: '' },
      { name: 'カラー', hours: '', completedHours: '' },
      { name: 'その他修正', hours: '', completedHours: '' },
    ],
  });
  const addViewpoint = () => setForm({ ...form, viewpoints: [...form.viewpoints, newViewpoint()] });
  const removeViewpoint = (vi) => setForm({ ...form, viewpoints: form.viewpoints.filter((_, idx) => idx !== vi) });
  const updateViewpointName = (vi, value) => {
    const vps = [...form.viewpoints];
    vps[vi] = { ...vps[vi], viewpointName: value };
    setForm({ ...form, viewpoints: vps });
  };
  const addStep = (vi) => {
    const vps = [...form.viewpoints];
    vps[vi] = { ...vps[vi], steps: [...vps[vi].steps, { name: '', hours: '', completedHours: '' }] };
    setForm({ ...form, viewpoints: vps });
  };
  const removeStep = (vi, si) => {
    const vps = [...form.viewpoints];
    vps[vi] = { ...vps[vi], steps: vps[vi].steps.filter((_, idx) => idx !== si) };
    setForm({ ...form, viewpoints: vps });
  };
  const updateStep = (vi, si, field, value) => {
    const vps = [...form.viewpoints];
    const steps = [...vps[vi].steps];
    steps[si] = { ...steps[si], [field]: value };
    vps[vi] = { ...vps[vi], steps };
    setForm({ ...form, viewpoints: vps });
  };

  // 開始時間→終了予定時間のプレビュー計算（全視点・全ステップの合計時間で算出）
  const previewEnd = useMemo(() => {
    if (!form.manualStart) return null;
    const startDate = new Date(form.manualStart);
    if (isNaN(startDate.getTime())) return null;
    let totalH = 0;
    if (editingId) {
      const h = parseFloat(form.hours); if (!isNaN(h)) totalH = h;
    } else {
      for (const vp of form.viewpoints) {
        for (const s of vp.steps) { const h = parseFloat(s.hours); if (!isNaN(h)) totalH += h; }
      }
    }
    if (totalH <= 0) return null;
    const dummy = [{
      id: 'preview', priority: 1, hours: totalH, completedHours: 0,
      assignee: '_preview', status: 'pending', createdAt: 0,
      projectName: 'p', viewpointName: 'v', stepName: null, stepOrder: null,
      manualStart: form.manualStart,
    }];
    const tempSettings = { ...settings, startDate: fmtYMD(startDate) };
    const result = scheduleTasks(dummy, tempSettings);
    const t = result.active[0];
    if (!t || !t.scheduledEnd) return null;
    return { date: t.scheduledEnd, min: t.scheduledEndMin };
  }, [form.manualStart, form.hours, form.viewpoints, editingId, settings]);

  // 開始時間を「日付」と「時刻」に分けて扱う（datetime-localが入力しづらい環境への対策）
  const msDate = form.manualStart ? form.manualStart.split('T')[0] : '';
  const msTime = form.manualStart ? (form.manualStart.split('T')[1] || '') : '';
  const setManualStart = (datePart, timePart) => {
    if (!datePart && !timePart) { setForm({ ...form, manualStart: '' }); return; }
    const d = datePart || fmtYMD(new Date());
    const tm = timePart || (settings.morningStart || '08:00');
    setForm({ ...form, manualStart: `${d}T${tm}` });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32 }}>
      <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 18, margin: 0, fontWeight: 500 }}>
            {editingId ? 'ステップを編集' : '新規タスク登録'}
          </h2>
          {editingId && (
            <button onClick={cancelEdit} style={{ background: 'transparent', border: 'none', color: colors.textMute, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={14} /> 編集をやめる
            </button>
          )}
        </div>

        {/* 共通項目 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>案件名</label>
            <input type="text" list="project-list" value={form.projectName}
              onChange={(e) => setForm({ ...form, projectName: e.target.value })}
              placeholder="例: 〇〇マンション" style={inputStyle} />
            <datalist id="project-list">{projectList.map(p => <option key={p} value={p} />)}</datalist>
          </div>
          <div>
            <label style={labelStyle}>担当者</label>
            <input type="text" list="assignee-list" value={form.assignee}
              onChange={(e) => setForm({ ...form, assignee: e.target.value })}
              placeholder="例: 田中" style={inputStyle} />
            <datalist id="assignee-list">{assigneeList.map(a => <option key={a} value={a} />)}</datalist>
          </div>
          <div>
            <label style={labelStyle}>優先順位（番号・小さいほど優先）</label>
            <input type="number" min="1" step="1" value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              placeholder="未入力なら末尾に追加" style={inputStyle} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>開始時間（任意・指定すると終了予定時間を自動計算）</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <input type="date" value={msDate}
                onChange={(e) => setManualStart(e.target.value, msTime)}
                style={{ ...inputStyle, width: 'auto', flex: '0 0 160px' }} />
              <TimeSelect value={msTime}
                onChange={(val) => setManualStart(msDate, val)}
                colors={colors} fontJP={fontJP} allowEmpty />
              {form.manualStart && (
                <button type="button" onClick={() => setForm({ ...form, manualStart: '' })}
                  style={{ background: 'transparent', border: `1px solid ${colors.border}`, padding: '8px 12px', borderRadius: 3, fontSize: 11, color: colors.textMute, cursor: 'pointer' }}>
                  クリア
                </button>
              )}
              {previewEnd && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: colors.accent, fontWeight: 600 }}>
                  <ArrowRight size={14} />
                  <span>終了予定: {fmtMD(previewEnd.date)} {dayName(previewEnd.date)} {minToTime(previewEnd.min)}</span>
                </div>
              )}
            </div>
            <div style={{ fontSize: 10, color: colors.textMute, marginTop: 6 }}>
              日付・時刻を別々に選べます（時刻だけ入力した場合は本日の日付になります）
            </div>
          </div>
        </div>

        {/* 内訳エリア */}
        {editingId ? (
          // 編集：単一ステップ（視点名・ステップ名も変更可）
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
            <div>
              <label style={labelStyle}>視点名（担当タスク）</label>
              <input type="text" list="viewpoint-list" value={form.editViewpointName}
                onChange={(e) => setForm({ ...form, editViewpointName: e.target.value })}
                placeholder="例: 外観昼景" style={inputStyle} />
              <datalist id="viewpoint-list">{viewpointList.map(v => <option key={v} value={v} />)}</datalist>
            </div>
            <div>
              <label style={labelStyle}>ステップ名称</label>
              <input type="text" value={form.editStepName}
                onChange={(e) => setForm({ ...form, editStepName: e.target.value })}
                placeholder="例: ホワイト" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>制作時間（h）</label>
              <input type="number" min="0.5" step="0.5" value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                placeholder="例: 8" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>完了済み時間（h）<span style={{ color: colors.textMute, fontSize: 10 }}>※初期値は0</span></label>
              <input type="number" min="0" step="0.5" value={form.completedHours}
                onChange={(e) => setForm({ ...form, completedHours: e.target.value })}
                placeholder="0" style={inputStyle} />
            </div>
          </div>
        ) : (
          // 新規：視点（担当タスク）の動的リスト。各視点の中にステップ
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
                  {/* 視点ヘッダー */}
                  <div style={{
                    display: 'flex', gap: 10, alignItems: 'center',
                    background: '#f3efe4', padding: '10px 12px', flexWrap: 'wrap',
                  }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: colors.text,
                      background: '#fff', border: `1px solid ${colors.border}`,
                      borderRadius: 12, padding: '2px 10px', flexShrink: 0,
                    }}>視点 {vi + 1}</span>
                    <input type="text" list="viewpoint-list" value={vp.viewpointName}
                      onChange={(e) => updateViewpointName(vi, e.target.value)}
                      placeholder="視点名（例: 外観昼景）"
                      style={{ ...inputStyle, flex: '1 1 180px', padding: '8px 10px', fontSize: 14, fontWeight: 500 }} />
                    <button type="button" onClick={() => removeViewpoint(vi)}
                      disabled={form.viewpoints.length <= 1}
                      style={{
                        background: '#fff', border: `1px solid ${colors.border}`,
                        padding: '6px 10px', borderRadius: 4,
                        cursor: form.viewpoints.length <= 1 ? 'not-allowed' : 'pointer',
                        color: form.viewpoints.length <= 1 ? '#ccc' : colors.textMute,
                        display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: fontJP,
                      }}
                      title="この視点を削除"><Trash2 size={13} /> 視点削除</button>
                  </div>

                  {/* ステップリスト */}
                  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {vp.steps.map((step, si) => (
                      <div key={si} style={{
                        display: 'flex', gap: 10, alignItems: 'flex-end',
                        background: '#fbf9f4', border: `1px solid ${colors.border}`,
                        borderRadius: 4, padding: 10, flexWrap: 'wrap',
                      }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                          background: colors.text, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 600, marginBottom: 1,
                        }}>{si + 1}</div>
                        <div style={{ flex: '2 1 150px' }}>
                          <label style={{ ...labelStyle, fontSize: 10, marginBottom: 4 }}>ステップ名称</label>
                          <input type="text" value={step.name}
                            onChange={(e) => updateStep(vi, si, 'name', e.target.value)}
                            placeholder="例: ホワイト" style={{ ...inputStyle, padding: '7px 10px', fontSize: 13 }} />
                        </div>
                        <div style={{ flex: '1 1 80px' }}>
                          <label style={{ ...labelStyle, fontSize: 10, marginBottom: 4 }}>制作（h）</label>
                          <input type="number" min="0" step="0.5" value={step.hours}
                            onChange={(e) => updateStep(vi, si, 'hours', e.target.value)}
                            placeholder="0" style={{ ...inputStyle, padding: '7px 10px', fontSize: 13 }} />
                        </div>
                        <div style={{ flex: '1 1 80px' }}>
                          <label style={{ ...labelStyle, fontSize: 10, marginBottom: 4 }}>完了済（h）</label>
                          <input type="number" min="0" step="0.5" value={step.completedHours}
                            onChange={(e) => updateStep(vi, si, 'completedHours', e.target.value)}
                            placeholder="0" style={{ ...inputStyle, padding: '7px 10px', fontSize: 13 }} />
                        </div>
                        <button type="button" onClick={() => removeStep(vi, si)}
                          disabled={vp.steps.length <= 1}
                          style={{
                            background: 'transparent', border: `1px solid ${colors.border}`,
                            padding: 7, borderRadius: 4, marginBottom: 1,
                            cursor: vp.steps.length <= 1 ? 'not-allowed' : 'pointer',
                            color: vp.steps.length <= 1 ? '#ccc' : colors.textMute,
                            display: 'flex', alignItems: 'center',
                          }}
                          title="このステップを削除"><Trash2 size={13} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addStep(vi)}
                      style={{
                        alignSelf: 'flex-start', background: '#fff', border: `1px dashed ${colors.border}`,
                        padding: '6px 12px', borderRadius: 4, cursor: 'pointer',
                        fontFamily: fontJP, fontSize: 11, color: colors.textMute,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                      <Plus size={12} /> ステップを追加
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addViewpoint}
              style={{
                marginTop: 12, background: colors.accentSoft, border: `1px solid ${colors.accent}`,
                padding: '9px 16px', borderRadius: 4, cursor: 'pointer',
                fontFamily: fontJP, fontSize: 13, color: colors.accent, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <Plus size={14} /> 視点を追加
            </button>
            <div style={{ fontSize: 10, color: colors.textMute, marginTop: 8 }}>
              ※ 空欄の視点・ステップは登録されません ・ 上から順に作業する想定でスケジュールされます
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleSubmit}
            style={{
              padding: '10px 24px', background: colors.text, color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer',
              fontFamily: fontJP, fontSize: 14, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            {editingId ? <><Check size={16} /> 更新する</> : <><Plus size={16} /> 登録する</>}
          </button>
        </div>
      </section>

      <section>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 18, margin: '0 0 16px 0', fontWeight: 500, display: 'flex', alignItems: 'baseline', gap: 12 }}>
          進行中タスク
          <span style={{ fontSize: 12, color: colors.textMute, fontFamily: fontJP }}>
            {scheduled.active.length}件 ・ 視点ごとにまとめて表示
          </span>
        </h2>

        {scheduled.active.length === 0 ? (
          <div style={{ background: colors.surface, border: `1px dashed ${colors.border}`, borderRadius: 6, padding: 48, textAlign: 'center', color: colors.textMute, fontSize: 13 }}>
            進行中のタスクがありません。上のフォームから登録してください。
          </div>
        ) : (
          <ViewpointGroupList
            groups={groupByViewpoint(scheduled.active)}
            allActive={scheduled.active}
            handleEdit={handleEdit} handleDelete={handleDelete} toggleStatus={toggleStatus}
            moveUp={moveUp} moveDown={moveDown} changePriority={changePriority} addProgress={addProgress}
            handleAddStepToViewpoint={handleAddStepToViewpoint} reassignViewpoint={reassignViewpoint} assigneeList={assigneeList}
            colors={colors} fontJP={fontJP} />
        )}
      </section>
    </div>
  );
}

// ============ 視点グループリスト ============
function ViewpointGroupList({ groups, allActive, handleEdit, handleDelete, toggleStatus, moveUp, moveDown, changePriority, addProgress, handleAddStepToViewpoint, reassignViewpoint, assigneeList, colors, fontJP }) {
  // 全タスクのグローバルなインデックス（移動可否判定用）
  const allSortedIds = allActive.map(t => t.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {groups.map(group => (
        <ViewpointCard key={group.key} group={group}
          allSortedIds={allSortedIds}
          handleEdit={handleEdit} handleDelete={handleDelete} toggleStatus={toggleStatus}
          moveUp={moveUp} moveDown={moveDown} changePriority={changePriority} addProgress={addProgress}
          handleAddStepToViewpoint={handleAddStepToViewpoint} reassignViewpoint={reassignViewpoint} assigneeList={assigneeList}
          colors={colors} fontJP={fontJP} />
      ))}
    </div>
  );
}

function ViewpointCard({ group, allSortedIds, handleEdit, handleDelete, toggleStatus, moveUp, moveDown, changePriority, addProgress, handleAddStepToViewpoint, reassignViewpoint, assigneeList, colors, fontJP }) {
  const projectColor = getProjectColor(group.projectName);
  const progressPct = group.totalHours > 0 ? (group.completedHours / group.totalHours) * 100 : 0;
  const isMulti = group.tasks.some(t => t.stepName);

  const handleAssigneeChange = (val) => {
    if (val === '__new__') {
      const name = window.prompt('振り分け先の担当者名を入力してください');
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
          {/* 案件名 · 視点名 (同サイズ・大きめ) */}
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>
            {group.projectName}
            <span style={{ color: colors.textMute, fontWeight: 400, margin: '0 8px' }}>／</span>
            {group.viewpointName}
          </div>
          <div style={{ fontSize: 11, color: colors.textMute, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span>完了 {group.completedHours}h / 全 {group.totalHours}h</span>
            <span style={{ color: colors.accent, fontWeight: 600 }}>残 {group.remainingHours}h</span>
            {group.scheduledStart && (
              <span style={{ color: colors.accent, fontWeight: 500 }}>
                {fmtMD(group.scheduledStart)} {minToTime(group.scheduledStartMin)} 〜 {fmtMD(group.scheduledEnd)} {minToTime(group.scheduledEndMin)}
              </span>
            )}
          </div>
          <div style={{ height: 4, background: '#f0ebde', borderRadius: 2, overflow: 'hidden', marginTop: 6, maxWidth: 360 }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: colors.progress, transition: 'width 0.3s' }} />
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
      </div>

      {/* ステップリスト */}
      {group.tasks.map((task, idx) => {
        const globalIdx = allSortedIds.indexOf(task.id);
        return (
          <StepRow key={task.id} task={task}
            showStepLabel={isMulti}
            onEdit={() => handleEdit(task)} onDelete={() => handleDelete(task.id)} onToggle={() => toggleStatus(task.id)}
            onMoveUp={() => moveUp(task.id)} onMoveDown={() => moveDown(task.id)}
            onChangePriority={(v) => changePriority(task.id, v)}
            onAddProgress={(d) => addProgress(task.id, d)}
            canMoveUp={globalIdx > 0} canMoveDown={globalIdx < allSortedIds.length - 1}
            isLast={idx === group.tasks.length - 1}
            colors={colors} fontJP={fontJP} />
        );
      })}
    </div>
  );
}

function StepRow({ task, showStepLabel, onEdit, onDelete, onToggle, onMoveUp, onMoveDown, onChangePriority, onAddProgress, canMoveUp, canMoveDown, isLast, colors, fontJP }) {
  const [editingPriority, setEditingPriority] = useState(false);
  const [priorityInput, setPriorityInput] = useState(String(task.priority));
  useEffect(() => { setPriorityInput(String(task.priority)); }, [task.priority]);

  const commitPriority = () => {
    setEditingPriority(false);
    if (priorityInput && priorityInput !== String(task.priority)) onChangePriority(priorityInput);
  };

  const completed = task.completedHours || 0;
  const remaining = Math.max(0, task.hours - completed);
  const progressPct = task.hours > 0 ? Math.min(100, (completed / task.hours) * 100) : 0;

  const displayName = task.stepName
    ? `ステップ${(task.stepOrder ?? 0) + 1}：${task.stepName}`
    : showStepLabel ? '（ステップ未分類）' : '内容詳細';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 18px',
      borderBottom: isLast ? 'none' : `1px solid ${colors.border}`,
      background: '#fff',
    }}>
      <button onClick={onToggle}
        style={{
          width: 18, height: 18, border: `1.5px solid ${colors.border}`,
          background: 'transparent',
          borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0, flexShrink: 0,
        }}
        title="完了にする" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
          <button onClick={() => setEditingPriority(true)}
            style={{
              background: priorityColor(task.priority), color: '#fff', border: 'none', borderRadius: 3, padding: '4px 7px',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', minWidth: 28, fontFamily: fontJP,
            }}
            title="クリックして直接編集">
            #{task.priority}
          </button>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>
          {displayName}
        </div>
        <div style={{ fontSize: 11, color: colors.textMute, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} /> {completed}/{task.hours}h
            {remaining > 0 && <span style={{ color: colors.accent, fontWeight: 600, marginLeft: 4 }}>残 {remaining}h</span>}
          </span>
          {task.scheduledStart && (
            <span style={{ color: colors.accent, fontWeight: 500 }}>
              {fmtMD(task.scheduledStart)} {minToTime(task.scheduledStartMin)}
              {!isSameDay(task.scheduledStart, task.scheduledEnd)
                ? ` 〜 ${fmtMD(task.scheduledEnd)} ${minToTime(task.scheduledEndMin)}`
                : ` 〜 ${minToTime(task.scheduledEndMin)}`}
            </span>
          )}
          {task.manualStart && (
            <span style={{ fontSize: 10, padding: '1px 5px', background: '#fce8e8', color: colors.accent, borderRadius: 2 }}>
              開始時間指定あり
            </span>
          )}
        </div>
        <div style={{ height: 4, background: '#f0ebde', borderRadius: 2, overflow: 'hidden', maxWidth: 280 }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: colors.progress, transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <button onClick={() => onAddProgress(0.5)} style={progressBtnStyle(colors, fontJP)} title="完了済みに0.5h追加">+0.5h</button>
        <button onClick={() => onAddProgress(1)} style={progressBtnStyle(colors, fontJP)} title="完了済みに1h追加">+1h</button>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={onEdit} style={iconBtnStyle(colors)} title="編集"><Edit2 size={14} /></button>
        <button onClick={onDelete} style={iconBtnStyle(colors)} title="削除"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

const iconBtnStyle = (colors) => ({
  background: 'transparent', border: 'none', cursor: 'pointer',
  padding: 6, color: colors.textMute, borderRadius: 3,
  display: 'flex', alignItems: 'center',
});
const miniBtnStyle = (colors, disabled) => ({
  background: '#fff', border: `1px solid ${colors.border}`, cursor: disabled ? 'not-allowed' : 'pointer',
  padding: '1px 3px', color: disabled ? '#ccc' : colors.textMute, borderRadius: 2,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
});
const progressBtnStyle = (colors, fontJP) => ({
  background: '#fff', border: `1px solid ${colors.progress}`, color: colors.progress,
  borderRadius: 3, padding: '3px 8px', cursor: 'pointer',
  fontFamily: fontJP, fontSize: 10, fontWeight: 600,
  display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44,
});

// ============ カレンダービュー ============
function CalendarView({ scheduled, settings, colors, fontDisplay }) {
  const startDate = startOfDay(settings.startDate ? new Date(settings.startDate + 'T00:00:00') : new Date());
  const allDates = [];
  let cursor = new Date(startDate);
  let workdayCount = 0;
  while (workdayCount < 21 && allDates.length < 35) {
    if (!isWeekend(cursor)) { allDates.push(new Date(cursor)); workdayCount++; }
    cursor = addDays(cursor, 1);
  }

  const dailySlots = getDailySlots(settings);
  const morningSlot = dailySlots[0];
  const afternoonSlot = dailySlots[1];
  const morningMins = morningSlot.end - morningSlot.start;
  const afternoonMins = afternoonSlot.end - afternoonSlot.start;

  const assignees = [...new Set(scheduled.active.map(t => t.assignee))];

  const matrix = {};
  for (const task of scheduled.active) {
    for (const slot of task.slots) {
      const key = fmtYMD(slot.date);
      if (!matrix[task.assignee]) matrix[task.assignee] = {};
      if (!matrix[task.assignee][key]) matrix[task.assignee][key] = [];
      matrix[task.assignee][key].push({ task, slot });
    }
  }

  const dayCellWidth = 78;
  const morningHeight = 55;
  const afternoonHeight = 55;
  const lunchHeight = 10;
  const rowHeight = morningHeight + lunchHeight + afternoonHeight;
  const labelWidth = 100;

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
        残り時間ベース ・ ステップごとに表示 ・ 上段：午前 {settings.morningStart}〜{settings.morningEnd} ／ 下段：午後 {settings.afternoonStart}〜{settings.afternoonEnd}
      </p>

      <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'auto' }}>
        <div style={{ minWidth: labelWidth + allDates.length * dayCellWidth }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, background: '#fbf9f4' }}>
            <div style={{ width: labelWidth, padding: '10px 12px', fontSize: 11, color: colors.textMute, fontWeight: 500, flexShrink: 0, borderRight: `1px solid ${colors.border}` }}>
              担当
            </div>
            {allDates.map((d, i) => {
              const isToday = isSameDay(d, new Date());
              return (
                <div key={i} style={{
                  width: dayCellWidth, padding: '8px 4px', textAlign: 'center', flexShrink: 0,
                  borderRight: i < allDates.length - 1 ? `1px solid ${colors.border}` : 'none',
                  background: isToday ? colors.accentSoft : 'transparent',
                }}>
                  <div style={{ fontSize: 10, color: colors.textMute }}>{dayName(d)}</div>
                  <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? colors.accent : colors.text }}>
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {assignees.map((assignee, ai) => (
            <div key={assignee} style={{ display: 'flex', borderBottom: ai < assignees.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
              <div style={{
                width: labelWidth, padding: '12px', fontSize: 13, fontWeight: 500,
                flexShrink: 0, borderRight: `1px solid ${colors.border}`,
                display: 'flex', alignItems: 'center', background: '#fbf9f4',
              }}>
                {assignee}
              </div>
              {allDates.map((d, di) => {
                const key = fmtYMD(d);
                const slots = (matrix[assignee] && matrix[assignee][key]) || [];
                const isToday = isSameDay(d, new Date());
                const morningItems = slots.filter(({ slot }) => slot.startMin < morningSlot.end);
                const afternoonItems = slots.filter(({ slot }) => slot.startMin >= afternoonSlot.start);
                return (
                  <div key={di} style={{
                    width: dayCellWidth, height: rowHeight, flexShrink: 0,
                    borderRight: di < allDates.length - 1 ? `1px solid ${colors.border}` : 'none',
                    background: isToday ? '#fff8f8' : '#fff',
                    position: 'relative',
                  }}>
                    <div style={{ height: morningHeight, display: 'flex', flexDirection: 'column' }}>
                      {morningItems.map(({ task, slot }, si) => (
                        <TaskBlock key={si} task={task} slot={slot}
                          heightPct={((slot.endMin - slot.startMin) / morningMins) * 100}
                          projectColor={getProjectColor(task.projectName)} />
                      ))}
                    </div>
                    <div style={{
                      height: lunchHeight, background: '#f5f0e3',
                      borderTop: `1px dashed ${colors.border}`, borderBottom: `1px dashed ${colors.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 8, color: '#a89870',
                    }}>昼休み</div>
                    <div style={{ height: afternoonHeight, display: 'flex', flexDirection: 'column' }}>
                      {afternoonItems.map(({ task, slot }, si) => (
                        <TaskBlock key={si} task={task} slot={slot}
                          heightPct={((slot.endMin - slot.startMin) / afternoonMins) * 100}
                          projectColor={getProjectColor(task.projectName)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20, fontSize: 11, color: colors.textMute }}>
        セル内の色は案件ごと ・ 右上の #番号 が優先順位 ・ マウスオーバーで詳細表示
      </div>
    </div>
  );
}

function TaskBlock({ task, slot, heightPct, projectColor }) {
  const remaining = Math.max(0, task.hours - (task.completedHours || 0));
  const stepLabel = task.stepName ? ` - ${task.stepName}` : '';
  return (
    <div title={`#${task.priority} ${task.projectName} / ${task.viewpointName}${stepLabel}\n${minToTime(slot.startMin)}〜${minToTime(slot.endMin)} (${slot.hours}h)\n残り ${remaining}h / 全${task.hours}h${task.manualStart ? '\n※開始時間指定あり' : ''}`}
      style={{
        height: `${heightPct}%`, background: projectColor, color: '#fff',
        padding: '2px 4px', fontSize: 9, lineHeight: 1.15, overflow: 'hidden',
        position: 'relative',
      }}>
      <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {task.viewpointName}
      </div>
      <div style={{ opacity: 0.85, fontSize: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {task.stepName || minToTime(slot.startMin) + '〜'}
      </div>
      <div style={{
        position: 'absolute', top: 2, right: 2,
        background: priorityColor(task.priority), color: '#fff',
        fontSize: 8, fontWeight: 700, padding: '0 3px', borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.7)',
      }}>#{task.priority}</div>
    </div>
  );
}

// ============ 担当者別ビュー ============
function AssigneeView({ scheduled, selectedAssignee, setSelectedAssignee, handleEdit, handleDelete, toggleStatus, moveUp, moveDown, changePriority, addProgress, handleAddStepToViewpoint, reassignViewpoint, assigneeList, colors, fontJP, fontDisplay }) {
  const assignees = [...new Set(scheduled.active.map(t => t.assignee))];
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
        const groups = groupByViewpoint(tasks);

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
                    {groups.length}視点 ・ {tasks.length}タスク ・ 完了 {completedHours}h / 全 {totalHours}h ・
                    <span style={{ color: colors.accent, fontWeight: 600 }}> 残 {remainingHours}h</span>
                  </div>
                  <div style={{ height: 4, background: '#f0ebde', borderRadius: 2, overflow: 'hidden', maxWidth: 320 }}>
                    <div style={{ height: '100%', width: `${progressPct}%`, background: colors.progress, transition: 'width 0.3s' }} />
                  </div>
                </div>
              </div>
            </div>
            <ViewpointGroupList groups={groups} allActive={allActive}
              handleEdit={handleEdit} handleDelete={handleDelete} toggleStatus={toggleStatus}
              moveUp={moveUp} moveDown={moveDown} changePriority={changePriority} addProgress={addProgress}
              handleAddStepToViewpoint={handleAddStepToViewpoint} reassignViewpoint={reassignViewpoint} assigneeList={assigneeList}
              colors={colors} fontJP={fontJP} />
          </section>
        );
      })}
    </div>
  );
}

const tabStyle = (active, colors, fontJP) => ({
  padding: '8px 14px',
  background: active ? '#1a1a1a' : '#fff',
  color: active ? '#fff' : '#1a1a1a',
  border: `1px solid ${active ? '#1a1a1a' : colors.border}`,
  borderRadius: 20, cursor: 'pointer',
  fontFamily: fontJP, fontSize: 13, fontWeight: 500,
  display: 'flex', alignItems: 'center',
});

// ============ メッセージビュー ============
function MessageView({ scheduled, settings, colors, fontDisplay }) {
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
            {Object.entries(weekTasksByAssignee).map(([assignee, items]) => (
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
            ))}
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

// ============ 完了タスクビュー ============
function DoneView({ scheduled, toggleStatus, handleDelete, colors, fontJP, fontDisplay }) {
  const doneTasks = [...scheduled.done].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  const grouped = {};
  for (const task of doneTasks) {
    const d = task.completedAt ? new Date(task.completedAt) : null;
    const key = d ? fmtYMD(startOfDay(d)) : '日時不明';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(task);
  }

  const totalHours = doneTasks.reduce((s, t) => s + t.hours, 0);
  const byAssignee = {};
  for (const t of doneTasks) {
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
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 20, margin: 0, fontWeight: 500 }}>完了タスク</h2>
        <span style={{ fontSize: 12, color: colors.textMute }}>
          {doneTasks.length}件 完了 ・ 合計 {totalHours}時間
        </span>
      </div>

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

function DoneTaskRow({ task, onRestore, onDelete, isLast, colors, fontJP }) {
  const projectColor = getProjectColor(task.projectName);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 18px',
      borderBottom: isLast ? 'none' : `1px solid ${colors.border}`,
      background: '#fbfaf6',
    }}>
      <div style={{
        width: 20, height: 20, background: '#7a8471', borderRadius: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Check size={12} color="#fff" />
      </div>
      <div style={{ width: 4, height: 32, background: projectColor, borderRadius: 2, flexShrink: 0, opacity: 0.7 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: colors.textMute, marginBottom: 2, textDecoration: 'line-through' }}>
          {task.projectName}
          <span style={{ margin: '0 6px' }}>／</span>
          {task.viewpointName}
          {task.stepName && <><span style={{ margin: '0 6px' }}>／</span>{task.stepName}</>}
        </div>
        <div style={{ fontSize: 11, color: colors.textMute, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={11} /> {task.assignee}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> {task.hours}h</span>
          {task.completedAt && (
            <span style={{ color: '#7a8471' }}>
              {new Date(task.completedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 完了
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={onRestore} style={iconBtnStyle(colors)} title="未完了に戻す"><RotateCcw size={14} /></button>
        <button onClick={onDelete} style={iconBtnStyle(colors)} title="完全に削除"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}
