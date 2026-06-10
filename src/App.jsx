import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Edit2, Calendar as CalIcon, MessageSquare, Settings as SettingsIcon, Check, X, Clock, Folder, User, ChevronUp, ChevronDown, Users, CheckCircle2, RotateCcw, TrendingUp, ArrowRight, GripVertical, Search } from 'lucide-react';
import { storage, tasksStore, signIn, signOutUser, subscribeAuth } from './firebase.js';

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
// 第2・第4土曜は午前のみ営業
function isWorkingSaturday(d) {
  if (d.getDay() !== 6) return false;
  const week = Math.ceil(d.getDate() / 7);
  return week === 2 || week === 4;
}
function isNonWorkingDay(d) {
  if (d.getDay() === 0) return true;
  if (d.getDay() === 6) return !isWorkingSaturday(d);
  return false;
}
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

// 依頼項目（視点）プリセット
const VIEWPOINT_PRESETS = [
  { id: 'pers', name: 'パース', steps: ['ホワイト', 'カラー', 'その他修正'] },
  { id: 'photo', name: '写真合成', steps: ['写真合成'] },
];
function makeViewpointFromPreset(preset) {
  if (!preset) return { viewpointName: '', assignee: '', steps: [{ name: '', hours: '', completedHours: '' }] };
  return {
    viewpointName: preset.name,
    assignee: '',
    steps: preset.steps.map(name => ({ name, hours: '', completedHours: '' })),
  };
}

// 会社名の候補（プルダウン用・自由入力も可）。並びは既定の表示順
const COMPANY_PRESETS = [
  'リノべる株式会社',
  '田中建設',
  'オフィスコム',
  'CG工房',
  '玉善',
  'SUMUS',
  'オフショア（その他）',
];

// 簡易ID
function genId(p) { return `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

// お客様マスタを「会社ごとに担当者をまとめた」形 [{ id, company, contacts:[{id,name}] }] に正規化。
// 旧フラット形式 [{ id, company, contact }] も会社ごとにグループ化して変換する（後方互換）。
function normalizeCustomerMaster(arr) {
  if (!Array.isArray(arr)) return [];
  const isFlat = arr.some(e => e && typeof e.contact === 'string' && !Array.isArray(e.contacts));
  if (isFlat) {
    const map = new Map();
    for (const e of arr) {
      const company = (e && e.company) || '';
      if (!map.has(company)) map.set(company, { id: genId('cust'), company, contacts: [] });
      if (e && e.contact) map.get(company).contacts.push({ id: genId('cc'), name: e.contact });
    }
    return [...map.values()];
  }
  return arr.map(e => ({
    id: (e && e.id) || genId('cust'),
    company: (e && e.company) || '',
    contacts: Array.isArray(e && e.contacts)
      ? e.contacts.map(c => typeof c === 'string'
        ? { id: genId('cc'), name: c }
        : { id: (c && c.id) || genId('cc'), name: (c && c.name) || '' })
      : [],
  }));
}

const DEFAULT_SETTINGS = {
  morningStart: '08:00',
  morningEnd: '12:00',
  afternoonStart: '13:00',
  afternoonEnd: '17:00',
  startDate: fmtYMD(new Date()),
  startTime: '08:00',
  absences: [],
};

function getDailySlots(settings) {
  return [
    { start: timeToMin(settings.morningStart), end: timeToMin(settings.morningEnd) },
    { start: timeToMin(settings.afternoonStart), end: timeToMin(settings.afternoonEnd) },
  ];
}
// その日の営業スロット（土曜は午前のみ）
function getDaySlots(d, settings) {
  const all = getDailySlots(settings);
  if (d.getDay() === 6) return [all[0]];
  return all;
}
function getDayWorkingHours(d, settings) {
  return getDaySlots(d, settings).reduce((s, x) => s + (x.end - x.start) / 60, 0);
}
function getHoursPerDay(settings) {
  return getDailySlots(settings).reduce((s, x) => s + (x.end - x.start) / 60, 0);
}

function parseYMD(s) {
  if (!s || typeof s !== 'string') return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function prevBusinessDay(d) {
  const r = startOfDay(d);
  do { r.setDate(r.getDate() - 1); } while (isNonWorkingDay(r));
  return r;
}
// 営業日数を厳密に間にカウント（from・to は含まない）
function countBusinessDaysBetween(fromYMD, toYMD) {
  const from = parseYMD(fromYMD);
  const to = parseYMD(toYMD);
  if (!from || !to || from >= to) return 0;
  let count = 0;
  const cur = new Date(from);
  cur.setDate(cur.getDate() + 1);
  while (cur < to) {
    if (!isNonWorkingDay(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
// 期間中の総作業可能時間（土曜は午前のみ）
function workingHoursBetween(fromYMD, toYMD, settings) {
  const from = parseYMD(fromYMD);
  const to = parseYMD(toYMD);
  if (!from || !to || from >= to) return 0;
  let hours = 0;
  const cur = new Date(from);
  cur.setDate(cur.getDate() + 1);
  while (cur < to) {
    if (!isNonWorkingDay(cur)) hours += getDayWorkingHours(cur, settings);
    cur.setDate(cur.getDate() + 1);
  }
  return hours;
}
// 担当者ごとに優先度順で時間をカスケード加算
function advanceTasksByAssignee(tasks, hoursPerAssignee) {
  if (hoursPerAssignee <= 0) return tasks;
  const byAssignee = {};
  for (const t of tasks) {
    if (t.status === 'done') continue;
    if (!byAssignee[t.assignee]) byAssignee[t.assignee] = [];
    byAssignee[t.assignee].push(t);
  }
  for (const a in byAssignee) {
    byAssignee[a].sort((x, y) => (x.priority - y.priority) || (x.createdAt - y.createdAt));
  }
  const updates = new Map();
  for (const list of Object.values(byAssignee)) {
    let remaining = hoursPerAssignee;
    for (const t of list) {
      if (remaining <= 0) break;
      const cap = (t.hours || 0) - (t.completedHours || 0);
      if (cap <= 0) continue;
      const use = Math.min(cap, remaining);
      const newCompleted = (t.completedHours || 0) + use;
      const done = newCompleted >= (t.hours || 0);
      updates.set(t.id, {
        ...t,
        completedHours: newCompleted,
        status: done ? 'done' : t.status,
        completedAt: done ? Date.now() : t.completedAt,
      });
      remaining -= use;
    }
  }
  return tasks.map(t => updates.get(t.id) || t);
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

  const projectNameInternal = task.projectNameInternal || '';
  const companyName = task.companyName || '';
  const customerContact = task.customerContact || '';
  // 実際の終了時刻（"YYYY-MM-DDTHH:mm"）。完了時に記録し、遅れた場合は後続を後ろ倒しする
  const actualEnd = task.actualEnd || null;

  const { taskName, ...rest } = task;
  return { ...rest, viewpointName, stepName, stepOrder, manualStart, priority, completedHours, projectNameInternal, companyName, customerContact, actualEnd };
}

// 優先順位は「会社ごと」に 1 から採番する（会社の中だけで順位を持つ）
function normalizePriorities(tasks) {
  const active = tasks.filter(t => t.status !== 'done');
  const done = tasks.filter(t => t.status === 'done');
  // 会社ごとにグループ化し、各会社内で (priority → createdAt) 順に 1..n を振り直す
  const byCompany = new Map();
  for (const t of active) {
    const c = t.companyName || '';
    if (!byCompany.has(c)) byCompany.set(c, []);
    byCompany.get(c).push(t);
  }
  const renumbered = [];
  for (const list of byCompany.values()) {
    list.sort((a, b) => (a.priority - b.priority) || (a.createdAt - b.createdAt));
    list.forEach((t, i) => renumbered.push({ ...t, priority: i + 1 }));
  }
  return [...renumbered, ...done];
}

// 会社のランク（小さいほど上）。プリセットの並び順を基準にし、
// 「オフショア（その他）」と会社未設定は常に最後に回す。
function companyRank(name) {
  const c = name || '';
  if (c === 'オフショア（その他）') return 9000; // 必ず一番下
  if (!c) return 8000;                            // 会社未設定
  const idx = COMPANY_PRESETS.indexOf(c);
  if (idx >= 0) return idx;                       // プリセットの並び順
  return 7000;                                    // プリセット外の会社
}

// 会社の並び順（スケジュール・表示の会社の登場順）を決める。
// ランク順 → 同ランクは最初に登録された会社から（createdAt 昇順）。
function companySequence(activeTasks) {
  const first = new Map();
  for (const t of activeTasks) {
    const c = t.companyName || '';
    const ca = t.createdAt || 0;
    if (!first.has(c) || ca < first.get(c)) first.set(c, ca);
  }
  const companies = [...first.keys()].sort((a, b) => {
    const ra = companyRank(a), rb = companyRank(b);
    if (ra !== rb) return ra - rb;
    return (first.get(a) || 0) - (first.get(b) || 0);
  });
  return new Map(companies.map((c, i) => [c, i]));
}

// 案件（社外案件名）の実効的な並び順を返す。
// 既定は「会社ごとにまとめた順（会社ランク → 案件内の最小優先順位 → 登録順）」。
// projectOrder（手動ドラッグの並び）が指定された案件は、その並びを優先（会社を跨いで移動可）。
function computeProjectOrder(activeTasks, projectOrder) {
  const companySeq = companySequence(activeTasks);
  const meta = new Map();
  for (const t of activeTasks) {
    const p = t.projectName || '';
    if (!meta.has(p)) meta.set(p, { company: t.companyName || '', minPri: Infinity, minCreated: Infinity });
    const m = meta.get(p);
    const pr = (typeof t.priority === 'number') ? t.priority : Infinity;
    const cr = (typeof t.createdAt === 'number') ? t.createdAt : Infinity;
    if (pr < m.minPri) m.minPri = pr;
    if (cr < m.minCreated) m.minCreated = cr;
    if (!m.company && t.companyName) m.company = t.companyName;
  }
  const projects = [...meta.keys()];
  const seqOf = (p) => { const c = meta.get(p).company; return companySeq.has(c) ? companySeq.get(c) : Infinity; };
  // 既定（会社ごとにまとめた）順
  const canonical = projects.slice().sort((a, b) => {
    const sa = seqOf(a), sb = seqOf(b);
    if (sa !== sb) return sa - sb;
    const ma = meta.get(a), mb = meta.get(b);
    return (ma.minPri - mb.minPri) || (ma.minCreated - mb.minCreated) || a.localeCompare(b, 'ja');
  });
  // 手動指定された案件を、その「位置」に新しい順序で差し込む（未指定の案件は既定の位置を保持）
  const orderIdx = new Map((projectOrder || []).map((n, i) => [n, i]));
  const manualSeq = projects.filter(p => orderIdx.has(p)).sort((a, b) => orderIdx.get(a) - orderIdx.get(b));
  let mi = 0;
  return canonical.map(p => (orderIdx.has(p) && mi < manualSeq.length) ? manualSeq[mi++] : p);
}

// ============ スケジューリング ============
// [start,end) から blocked 区間（[s,e) の配列）を引いた空き区間を返す
function subtractBusy(start, end, blocked) {
  if (!blocked || blocked.length === 0) return [[start, end]];
  const ov = blocked.filter(([s, e]) => e > start && s < end).sort((a, b) => a[0] - b[0]);
  const free = [];
  let cur = start;
  for (const [s, e] of ov) {
    const bs = Math.max(s, start), be = Math.min(e, end);
    if (bs > cur) free.push([cur, bs]);
    cur = Math.max(cur, be);
  }
  if (cur < end) free.push([cur, end]);
  return free;
}

// その担当者・その日の不在情報。{ allDay, intervals:[[s,e],...] }
function dayAbsence(assignee, date, absences) {
  const ymd = fmtYMD(date);
  let allDay = false;
  const intervals = [];
  for (const a of (absences || [])) {
    if (!a || a.assignee !== assignee) continue;
    if (!a.startDate || !a.endDate) continue;
    if (ymd < a.startDate || ymd > a.endDate) continue;
    if (a.allDay) allDay = true;
    else if (a.startTime && a.endTime) intervals.push([timeToMin(a.startTime), timeToMin(a.endTime)]);
  }
  return { allDay, intervals };
}

// その担当者・その日の「空いている営業時間」区間（土日・不在・予約済みを除外）
function dayFreeIntervals(assignee, date, settings, busyMap, absences) {
  if (isNonWorkingDay(date)) return [];
  const abs = dayAbsence(assignee, date, absences);
  if (abs.allDay) return [];
  const ymd = fmtYMD(date);
  const busy = (busyMap[assignee] && busyMap[assignee].get(ymd)) || [];
  const blocked = [...busy, ...abs.intervals];
  const free = [];
  for (const s of getDaySlots(date, settings)) {
    for (const iv of subtractBusy(s.start, s.end, blocked)) free.push(iv);
  }
  return free;
}

function scheduleTasks(tasks, settings, projectOrder) {
  const dailySlots = getDailySlots(settings);
  const configuredStart = startOfDay(settings.startDate ? new Date(settings.startDate + 'T00:00:00') : new Date());
  // 過去には予定を置かない：起点は「設定された開始日」と「本日」の遅い方にする
  const today = startOfDay(new Date());
  const startDate = configuredStart.getTime() < today.getTime() ? today : configuredStart;
  const startMinOfDay = settings.startTime ? timeToMin(settings.startTime) : dailySlots[0].start;
  const absences = settings.absences || [];

  const active = tasks.filter(t => t.status !== 'done');
  const done = tasks.filter(t => t.status === 'done');

  // 作業順 ＝ 案件の並び順（既定は会社ごと・手動ドラッグで会社を跨いで変更可）→ 案件内は優先順位 → 登録順
  const projOrder = computeProjectOrder(active, projectOrder);
  const projIdx = new Map(projOrder.map((n, i) => [n, i]));
  const projOf = (t) => projIdx.has(t.projectName || '') ? projIdx.get(t.projectName || '') : Infinity;
  const sorted = [...active].sort((a, b) => {
    const pa = projOf(a), pb = projOf(b);
    if (pa !== pb) return pa - pb;
    return (a.priority - b.priority) || (a.createdAt - b.createdAt);
  });

  // 完了タスクの実終了時刻（担当者ごとの最遅）→ その担当者の着手可能の下限（遅れを反映）
  const doneFloor = {};
  for (const t of done) {
    if (!t.actualEnd) continue;
    const ae = new Date(t.actualEnd);
    if (isNaN(ae.getTime())) continue;
    const ts = startOfDay(ae).getTime() + (ae.getHours() * 60 + ae.getMinutes()) * 60000;
    if (!doneFloor[t.assignee] || ts > doneFloor[t.assignee]) doneFloor[t.assignee] = ts;
  }
  const baseTsOf = (assignee) => {
    const base = startDate.getTime() + startMinOfDay * 60000;
    return (doneFloor[assignee] && doneFloor[assignee] > base) ? doneFloor[assignee] : base;
  };

  // 担当者ごとの予約済み区間（インターバル方式）。busyMap[assignee] = Map(ymd -> [[s,e],...])
  const busyMap = {};
  const addBusy = (assignee, date, s, e) => {
    if (!busyMap[assignee]) busyMap[assignee] = new Map();
    const ymd = fmtYMD(date);
    if (!busyMap[assignee].has(ymd)) busyMap[assignee].set(ymd, []);
    busyMap[assignee].get(ymd).push([s, e]);
  };
  // 同じ視点（担当者+案件+視点名）の前ステップ終了時刻。工程順を守るための下限
  const vpLastEnd = {};

  const scheduled = sorted.map(task => {
    const fullHours = Math.max(0, task.hours || 0);
    // 【0】スケジュール枠は当初の制作時間で固定（completedHours は残時間表示のみ）
    const durationHours = fullHours;
    const remainingHours = Math.max(0, fullHours - (task.completedHours || 0));

    if (durationHours <= 0) {
      return { ...task, scheduledStart: null, scheduledEnd: null, slots: [], remainingHours: 0 };
    }

    const assignee = task.assignee;
    // 最早開始可能時刻 = max(起点/完了下限, manualStart, 同視点の前ステップ終了)
    let eTs = baseTsOf(assignee);
    if (task.manualStart) {
      const ms = new Date(task.manualStart);
      if (!isNaN(ms.getTime())) {
        const mts = startOfDay(ms).getTime() + (ms.getHours() * 60 + ms.getMinutes()) * 60000;
        if (mts > eTs) eTs = mts;
      }
    }
    const vkey = `${assignee}::${task.projectName}::${task.viewpointName}`;
    if (vpLastEnd[vkey] && vpLastEnd[vkey] > eTs) eTs = vpLastEnd[vkey];

    const eDate = startOfDay(new Date(eTs));
    const eMin = Math.round((eTs - eDate.getTime()) / 60000);

    // eTs 以降の空き営業時間を前から順に埋める（予約済み・休日/不在は飛ばす＝穴埋め/バックフィル）
    let remainingMin = durationHours * 60;
    const slots = [];
    let date = new Date(eDate);
    let guard = 0;
    while (remainingMin > 0 && guard++ < 100000) {
      const free = dayFreeIntervals(assignee, date, settings, busyMap, absences);
      const isFirst = isSameDay(date, eDate);
      for (const [fs, fe] of free) {
        if (remainingMin <= 0) break;
        const segStart = isFirst ? Math.max(fs, eMin) : fs;
        if (segStart >= fe) continue;
        const use = Math.min(remainingMin, fe - segStart);
        slots.push({ date: new Date(date), startMin: segStart, endMin: segStart + use, hours: use / 60 });
        addBusy(assignee, date, segStart, segStart + use);
        remainingMin -= use;
      }
      date = addDays(date, 1);
    }

    if (slots.length === 0) {
      return { ...task, scheduledStart: null, scheduledEnd: null, slots: [], remainingHours };
    }
    const last = slots[slots.length - 1];
    vpLastEnd[vkey] = last.date.getTime() + last.endMin * 60000;
    return {
      ...task,
      scheduledStart: slots[0].date,
      scheduledStartMin: slots[0].startMin,
      scheduledEnd: last.date,
      scheduledEndMin: last.endMin,
      slots, remainingHours,
    };
  });

  return { active: scheduled, done };
}

// 編集中に「フォーム由来として除外すべき既存タスクID」を集める
function formEditIds(form) {
  const s = new Set();
  for (const vp of (form.viewpoints || [])) for (const st of (vp.steps || [])) if (st.taskId) s.add(st.taskId);
  return s;
}

// フォーム内容を、スケジュール計算に使える簡易タスクレコード群へ変換（プレビュー／確認用）
function formPreviewRecords(form, activeCount) {
  let priority = parseInt(form.priority, 10);
  if (isNaN(priority) || priority < 1) priority = activeCount + 1;
  const records = [];
  let seq = 0;
  for (const vp of (form.viewpoints || [])) {
    const vpName = (vp.viewpointName || '').trim() || '視点';
    const vpAssignee = (vp.assignee || '').trim() || (form.assignee || '').trim();
    for (const step of (vp.steps || [])) {
      const hoursStr = (step.hours === undefined || step.hours === null) ? '' : String(step.hours);
      const stepHours = hoursStr.trim() === '' ? 0 : parseFloat(hoursStr);
      if (isNaN(stepHours) || stepHours <= 0) continue; // 制作時間のあるステップのみスケジュール対象
      const completedRaw = (step.completedHours === '' || step.completedHours == null) ? 0 : parseFloat(step.completedHours);
      records.push({
        id: `__preview-${seq}`,
        projectName: (form.projectName || '').trim(),
        companyName: (form.companyName || '').trim(),
        viewpointName: vpName,
        assignee: vpAssignee,
        priority,
        hours: stepHours,
        completedHours: isNaN(completedRaw) ? 0 : completedRaw,
        stepOrder: seq,
        manualStart: (records.length === 0 && form.manualStart) ? form.manualStart : null,
        status: 'pending',
        createdAt: 1e15 + seq, // 同優先順位の既存タスクより後ろに並べる
      });
      seq++;
    }
  }
  return { records, priority };
}

// フォーム内容を実データに混ぜて scheduleTasks し、フォーム分の開始・終了予定を返す
function simulateFormSchedule(form, allTasks, settings, projectOrder) {
  const editIds = formEditIds(form);
  const activeCount = allTasks.filter(t => t.status !== 'done' && !editIds.has(t.id)).length;
  const { records } = formPreviewRecords(form, activeCount);
  if (records.length === 0) return null;
  const others = allTasks.filter(t => t.status !== 'done' && !editIds.has(t.id));
  const result = scheduleTasks([...others, ...records], settings, projectOrder);
  const pids = new Set(records.map(r => r.id));
  const ps = result.active.filter(t => pids.has(t.id) && t.scheduledStart);
  if (ps.length === 0) return null;
  let sBest = null, eBest = null, sD = null, sM = 0, eD = null, eM = 0;
  for (const t of ps) {
    const sTs = t.scheduledStart.getTime() + (t.scheduledStartMin || 0) * 60000;
    const eTs = t.scheduledEnd.getTime() + (t.scheduledEndMin || 0) * 60000;
    if (sBest == null || sTs < sBest) { sBest = sTs; sD = t.scheduledStart; sM = t.scheduledStartMin; }
    if (eBest == null || eTs > eBest) { eBest = eTs; eD = t.scheduledEnd; eM = t.scheduledEndMin; }
  }
  let moved = false, requested = null;
  if (form.manualStart) {
    const ms = new Date(form.manualStart);
    if (!isNaN(ms.getTime())) {
      requested = { date: startOfDay(ms), min: ms.getHours() * 60 + ms.getMinutes() };
      const reqTs = requested.date.getTime() + requested.min * 60000;
      moved = sBest > reqTs;
    }
  }
  return { startDate: sD, startMin: sM, endDate: eD, endMin: eM, moved, requested };
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
        projectNameInternal: task.projectNameInternal || '',
        companyName: task.companyName || '',
        customerContact: task.customerContact || '',
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
  // tasks と settings の両方が Firestore から最初の値を受け取ったか
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [view, setView] = useState('input');
  const [editingId, setEditingId] = useState(null);
  // 編集モード：{ type: 'step'|'viewpoint'|'project', ... }（フォーム上部の見出し・保存スコープを切替）
  const [editMode, setEditMode] = useState(null);
  // 案件の並び順（ドラッグ＆ドロップ用）。Firestore に projectOrder として保存
  const [projectOrder, setProjectOrder] = useState([]);
  // お客様マスタ（[{ id, company, contact }]）・従業員マスタ（[{ id, name, role }]）
  const [customerMaster, setCustomerMaster] = useState([]);
  const [employeeMaster, setEmployeeMaster] = useState([]);
  // 完了ダイアログ（終了時間を入力して完了する）の対象
  const [completeTarget, setCompleteTarget] = useState(null);
  // 開始時間が移動する場合の確認モーダル
  const [startMoveConfirm, setStartMoveConfirm] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [auth, setAuth] = useState({ user: null, allowed: false, ready: false });
  const [signInError, setSignInError] = useState('');

  useEffect(() => subscribeAuth(setAuth), []);

  // 初期表示は「パース」プリセット
  const makeEmptyViewpoint = () => makeViewpointFromPreset(VIEWPOINT_PRESETS[0]);
  const emptyForm = {
    projectName: '', projectNameInternal: '', companyName: '', customerContact: '', assignee: '', priority: '', manualStart: '',
    // 視点（担当タスク）の動的リスト。各視点の中にステップ（工程）を持つ
    viewpoints: [makeEmptyViewpoint()],
  };
  const [form, setForm] = useState(emptyForm);

  // 常に最新の tasks を参照するための ref（複数端末の同時編集で書き込み元になる）
  const tasksRef = useRef([]);

  useEffect(() => {
    if (!auth.allowed) return;
    let cancelled = false;
    let unsubTasks = null;

    // 購読を先に開始（マイグレーションの完了を待たない＝ローディングで止まらない）
    unsubTasks = tasksStore.subscribe(
      (arr) => {
        const migrated = arr.map(migrateTask);
        const normalized = normalizePriorities(migrated);
        setTasks(normalized);
        tasksRef.current = normalized;
        setTasksLoaded(true);
      },
      () => { setTasksLoaded(true); }
    );

    // セーフティ：何らかの理由で onSnapshot が発火しない場合の保険
    const loadTimeout = setTimeout(() => setTasksLoaded(true), 15000);

    // レガシー：旧 1ドキュメント保存（workspaces/{wid}/data/tasks）から
    //          新サブコレクション（workspaces/{wid}/tasks/{taskId}）へ並行で移行
    (async () => {
      try {
        const legacy = await storage.get('tasks');
        if (cancelled) return;
        if (legacy && legacy.value) {
          let arr = [];
          try { arr = JSON.parse(legacy.value); } catch (e) {}
          if (Array.isArray(arr) && arr.length > 0) {
            const existing = await tasksStore.listAll();
            if (cancelled) return;
            if (existing.length === 0) {
              await tasksStore.batch(arr.map(migrateTask), []);
            }
            if (cancelled) return;
            await storage.delete('tasks');
          }
        }
      } catch (e) { console.error('タスク移行エラー:', e); }
    })();

    const unsubSettings = storage.subscribe('settings', (val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch (e) { }
      }
      setSettingsLoaded(true);
    });

    // 案件並び順（ドラッグ＆ドロップで並び替えた順序）を購読
    const unsubOrder = storage.subscribe('projectOrder', (val) => {
      if (!val) { setProjectOrder([]); return; }
      try {
        const arr = JSON.parse(val);
        if (Array.isArray(arr)) setProjectOrder(arr);
      } catch (e) { setProjectOrder([]); }
    });

    // お客様マスタ・従業員マスタを購読
    const unsubCustomer = storage.subscribe('customerMaster', (val) => {
      if (!val) { setCustomerMaster([]); return; }
      try { const arr = JSON.parse(val); setCustomerMaster(normalizeCustomerMaster(arr)); }
      catch (e) { setCustomerMaster([]); }
    });
    const unsubEmployee = storage.subscribe('employeeMaster', (val) => {
      if (!val) { setEmployeeMaster([]); return; }
      try { const arr = JSON.parse(val); if (Array.isArray(arr)) setEmployeeMaster(arr); }
      catch (e) { setEmployeeMaster([]); }
    });

    return () => {
      cancelled = true;
      clearTimeout(loadTimeout);
      if (unsubTasks) unsubTasks();
      unsubSettings();
      unsubOrder();
      unsubCustomer();
      unsubEmployee();
    };
  }, [auth.allowed]);

  // tasks と settings の両方が最初の同期完了 → 読み込み終了
  useEffect(() => {
    if (tasksLoaded && settingsLoaded) setLoading(false);
  }, [tasksLoaded, settingsLoaded]);

  // 差分書き込み：updater が返した newTasks と現在の tasksRef を比較し、
  // 変更・追加されたタスクだけを per-doc で Firestore に書き込む。
  // 「ローカルに無い＝相手端末で追加されたタスク」を勝手に削除しないので、
  // 端末間で表示が乖離しない（明示削除は removeTask を使う）。
  const saveTasks = async (updater) => {
    const prev = tasksRef.current;
    const newTasks = typeof updater === 'function' ? updater(prev) : updater;
    setTasks(newTasks); // 楽観的に画面を即更新
    tasksRef.current = newTasks;

    const prevMap = new Map(prev.map(t => [t.id, t]));
    const upserts = [];
    for (const t of newTasks) {
      const old = prevMap.get(t.id);
      if (!old || JSON.stringify(old) !== JSON.stringify(t)) upserts.push(t);
    }
    if (upserts.length === 0) return;
    try { await tasksStore.batch(upserts, []); }
    catch (e) { console.error('タスク保存エラー:', e); }
  };

  const removeTask = async (id) => {
    const filtered = tasksRef.current.filter(t => t.id !== id);
    setTasks(filtered);
    tasksRef.current = filtered;
    try { await tasksStore.remove(id); }
    catch (e) { console.error('タスク削除エラー:', e); }
  };

  const saveSettings = async (newSettings) => {
    setSettings(newSettings);
    try {
      const { morningStart, morningEnd, afternoonStart, afternoonEnd, startDate, startTime, lastAdvancedDate, absences } = newSettings;
      await storage.set('settings', JSON.stringify({ morningStart, morningEnd, afternoonStart, afternoonEnd, startDate, startTime, lastAdvancedDate, absences: absences || [] }));
    } catch (e) { console.error(e); }
  };

  // 休日・不在の追加／削除
  const addAbsence = (absence) => {
    const next = [...(settings.absences || []), { ...absence, id: genId('abs') }];
    saveSettings({ ...settings, absences: next });
  };
  const removeAbsence = (id) => {
    saveSettings({ ...settings, absences: (settings.absences || []).filter(a => a.id !== id) });
  };

  // 案件並び順の保存（楽観的に即反映 → Firestore 上書き → 他端末同期）
  const saveProjectOrder = async (newOrder) => {
    setProjectOrder(newOrder);
    try { await storage.set('projectOrder', JSON.stringify(newOrder)); }
    catch (e) { console.error('案件並び順保存エラー:', e); }
  };

  // 担当者別など「一部の案件しか見えていないビュー」からの並べ替え用。
  // 見えている案件（visibleNewOrder）の新しい順を、全体の projectOrder に
  // マージする（見えていない案件は位置を保持）。
  const saveProjectOrderPartial = (visibleNewOrder) => {
    const visibleSet = new Set(visibleNewOrder);
    const active = tasksRef.current.filter(t => t.status !== 'done');
    // 現在の実効的な全体順（既定は会社ごと・手動分は反映済み）
    const currentFull = computeProjectOrder(active, projectOrder);
    let vi = 0;
    const merged = currentFull.map(n => (visibleSet.has(n) && vi < visibleNewOrder.length) ? visibleNewOrder[vi++] : n);
    while (vi < visibleNewOrder.length) merged.push(visibleNewOrder[vi++]);
    saveProjectOrder(merged);
  };

  // マスタの保存（楽観的に即反映 → Firestore 上書き → 他端末同期）
  const saveCustomerMaster = async (arr) => {
    setCustomerMaster(arr);
    try { await storage.set('customerMaster', JSON.stringify(arr)); }
    catch (e) { console.error('お客様マスタ保存エラー:', e); }
  };
  const saveEmployeeMaster = async (arr) => {
    setEmployeeMaster(arr);
    try { await storage.set('employeeMaster', JSON.stringify(arr)); }
    catch (e) { console.error('従業員マスタ保存エラー:', e); }
  };


  // 登録/更新のエントリ：開始時間が指定どおりに置けない場合は確認モーダルを出す
  const handleSubmit = async () => {
    if (form.projectName.trim() && form.manualStart) {
      const sim = simulateFormSchedule(form, tasksRef.current, settings, projectOrder);
      if (sim && sim.moved) {
        setStartMoveConfirm({
          requested: sim.requested,
          actualDate: sim.startDate,
          actualMin: sim.startMin,
        });
        return; // モーダルの「登録する」で performSubmit を呼ぶ
      }
    }
    await performSubmit();
  };

  // 登録/更新の本体（確認モーダルを通過したあとに実際に保存する処理）
  const performSubmit = async () => {
    if (!form.projectName.trim()) {
      alert('案件名を入力してください');
      return;
    }
    let priority = parseInt(form.priority, 10);
    const activeCount = tasks.filter(t => t.status !== 'done').length;
    if (isNaN(priority) || priority < 1) {
      priority = activeCount + 1;
    }

    // フォーム → タスクレコード化（編集モード共通の前処理）
    // 各 step に taskId があれば既存タスクと紐付け、無ければ新規
    const buildRecords = (originalById) => {
      const upserts = [];
      const baseTime = Date.now();
      let seq = 0;
      for (const vp of form.viewpoints) {
        const vpName = (vp.viewpointName || '').trim();
        const vpAssignee = (vp.assignee || '').trim() || form.assignee.trim();
        const hasAnyInput = vpName || vp.steps.some(s => (s.name || '').trim() || (parseFloat(s.hours) > 0));
        if (!hasAnyInput) continue;
        if (!vpName) { return { error: '内容を入力した視点には視点名も入力してください' }; }
        if (!vpAssignee) { return { error: `視点「${vpName}」の担当者を入力してください` }; }

        let order = 0;
        let vpHasStep = false;
        for (const step of vp.steps) {
          const name = (step.name || '').trim();
          const hoursStr = step.hours === undefined || step.hours === null ? '' : String(step.hours);
          const hoursEmpty = hoursStr.trim() === '';
          const stepHours = hoursEmpty ? 0 : parseFloat(hoursStr);
          if (!name && hoursEmpty) continue;
          if (!name) { return { error: `視点「${vpName}」で時間を入力したステップには名称も入力してください` }; }
          if (isNaN(stepHours) || stepHours < 0) { return { error: `視点「${vpName}」の「${name}」の制作時間は0以上にしてください` }; }
          const stepCompleted = step.completedHours === '' ? 0 : parseFloat(step.completedHours);
          if (isNaN(stepCompleted) || stepCompleted < 0) { return { error: `「${name}」の完了時間が無効です` }; }
          if (stepCompleted > stepHours) { return { error: `「${name}」の完了時間が制作時間を超えています` }; }
          const autoDone = stepHours > 0 && stepCompleted >= stepHours;

          const existing = step.taskId && originalById ? originalById.get(step.taskId) : null;
          const id = existing ? existing.id : `task-${baseTime}-${seq}-${Math.random().toString(36).slice(2, 7)}`;

          const record = {
            id,
            projectName: form.projectName.trim(),
            projectNameInternal: (form.projectNameInternal || '').trim(),
            companyName: (form.companyName || '').trim(),
            customerContact: (form.customerContact || '').trim(),
            viewpointName: vpName,
            stepName: name, stepOrder: order,
            assignee: vpAssignee,
            priority, hours: stepHours, completedHours: stepCompleted,
            // 開始時間は最初の有効ステップのみに紐付ける
            manualStart: (upserts.length === 0 && form.manualStart) ? form.manualStart : null,
            status: autoDone ? 'done' : 'pending',
            completedAt: autoDone ? (existing?.completedAt || (baseTime + seq)) : null,
            createdAt: existing?.createdAt || (baseTime + seq),
          };
          if (existing?.externalId) record.externalId = existing.externalId;
          upserts.push(record);
          order++; seq++; vpHasStep = true;
        }
        if (!vpHasStep) { return { error: `視点「${vpName}」に少なくとも1つのステップ（名称＋時間）を入力してください` }; }
      }
      return { upserts };
    };

    if (editMode) {
      // 編集スコープに含まれる既存タスクを抽出（編集モードに応じて）
      let originalTasks = [];
      if (editMode.type === 'step') {
        const t = tasksRef.current.find(x => x.id === editMode.taskId);
        if (t) originalTasks = [t];
      } else if (editMode.type === 'viewpoint') {
        originalTasks = tasksRef.current.filter(t =>
          t.projectName === editMode.projectName &&
          t.viewpointName === editMode.viewpointName &&
          t.assignee === editMode.assignee &&
          t.status !== 'done'
        );
      } else if (editMode.type === 'project') {
        originalTasks = tasksRef.current.filter(t =>
          t.projectName === editMode.projectName && t.status !== 'done'
        );
      }
      const originalById = new Map(originalTasks.map(t => [t.id, t]));

      const result = buildRecords(originalById);
      if (result.error) { alert(result.error); return; }
      const upserts = result.upserts;
      if (upserts.length === 0) { alert('少なくとも1つの視点とステップを入力してください'); return; }

      // スコープ内で「元あったが form に残っていない」タスクは削除
      const keptIds = new Set(upserts.filter(u => originalById.has(u.id)).map(u => u.id));
      const deletedIds = originalTasks.filter(t => !keptIds.has(t.id)).map(t => t.id);
      if (deletedIds.length > 0) {
        if (!confirm(`${deletedIds.length}件のステップが削除されます。よろしいですか？`)) return;
      }

      // シート由来タスクの削除を deletedExternalIds に記録
      try {
        const eids = originalTasks.filter(t => deletedIds.includes(t.id) && t.externalId).map(t => t.externalId);
        if (eids.length > 0) {
          const current = await storage.get('deletedExternalIds');
          const list = (current && current.value) ? JSON.parse(current.value) : [];
          let changed = false;
          for (const eid of eids) { if (!list.includes(eid)) { list.push(eid); changed = true; } }
          if (changed) await storage.set('deletedExternalIds', JSON.stringify(list));
        }
      } catch (e) { console.warn('削除済みリストの更新に失敗:', e); }

      const upsertMap = new Map(upserts.map(t => [t.id, t]));
      const deletedSet = new Set(deletedIds);
      const merged = tasksRef.current
        .filter(t => !deletedSet.has(t.id))
        .map(t => upsertMap.has(t.id) ? upsertMap.get(t.id) : t);
      for (const t of upserts) {
        if (!tasksRef.current.find(x => x.id === t.id)) merged.push(t);
      }

      // === 案件名の統一処理（全編集モード共通） ===
      // 編集スコープ外で「旧案件名」を持つタスク（他視点・完了済み）も新名へ揃え、
      // 「視点編集／ステップ編集から案件名を変えた時に案件が分割される」のを防ぐ
      let finalUpserts = upserts;
      let finalMerged = merged;
      const oldProjectName = editMode.projectName;
      const newProjectName = form.projectName.trim();
      const newProjectInternal = (form.projectNameInternal || '').trim();
      const newCompany = (form.companyName || '').trim();
      const newContact = (form.customerContact || '').trim();
      const upsertIds = new Set(upserts.map(u => u.id));
      const needsRename = merged.filter(t => {
        if (upsertIds.has(t.id)) return false;
        if (t.projectName !== oldProjectName) return false;
        return t.projectName !== newProjectName
          || (t.projectNameInternal || '') !== newProjectInternal
          || (t.companyName || '') !== newCompany
          || (t.customerContact || '') !== newContact;
      });

      if (needsRename.length > 0) {
        // 視点編集／ステップ編集から案件名を変えた場合は、スコープ外への影響を確認
        if (editMode.type !== 'project') {
          const activeOut = needsRename.filter(t => t.status !== 'done').length;
          const doneOut = needsRename.length - activeOut;
          const detail = doneOut > 0
            ? `${needsRename.length}件（他視点アクティブ ${activeOut}件・完了済み ${doneOut}件）`
            : `他の視点 ${activeOut}件`;
          const ok = confirm(
            `案件名（または案件コード）を変更すると、\n` +
            `この案件の全タスク（${detail}）にも反映されます。\n` +
            `よろしいですか？`
          );
          if (!ok) return;
        }
        const renames = needsRename.map(t => ({ ...t, projectName: newProjectName, projectNameInternal: newProjectInternal, companyName: newCompany, customerContact: newContact }));
        const renameMap = new Map(renames.map(r => [r.id, r]));
        finalMerged = merged.map(t => renameMap.get(t.id) || t);
        finalUpserts = [...upserts, ...renames];
      }

      const normalized = normalizePriorities(finalMerged);
      setTasks(normalized);
      tasksRef.current = normalized;
      try { await tasksStore.batch(finalUpserts, deletedIds); }
      catch (e) { console.error('編集保存エラー:', e); alert('保存に失敗しました：' + (e?.message || e)); }

      setEditMode(null);
      setEditingId(null);
      setForm(emptyForm);
      return;
    }

    // 新規登録
    const result = buildRecords(null);
    if (result.error) { alert(result.error); return; }
    const records = result.upserts;
    if (records.length === 0) { alert('少なくとも1つの視点とステップを入力してください'); return; }
    saveTasks(prev => normalizePriorities([...prev, ...records]));
    setForm(emptyForm);
  };

  // ステップを編集：新規登録フォームと同じ複数視点フォームに、そのステップを1視点・1ステップとして pre-populate
  const handleEdit = (task) => {
    setForm({
      ...emptyForm,
      projectName: task.projectName,
      projectNameInternal: task.projectNameInternal || '',
      companyName: task.companyName || '',
      customerContact: task.customerContact || '',
      assignee: task.assignee,
      priority: String(task.priority),
      manualStart: task.manualStart || '',
      viewpoints: [{
        viewpointName: task.viewpointName || '',
        assignee: task.assignee || '',
        steps: [{
          taskId: task.id,
          name: task.stepName || task.viewpointName || '',
          hours: String(task.hours),
          completedHours: String(task.completedHours || 0),
        }],
      }],
    });
    setEditingId(null);
    setEditMode({ type: 'step', taskId: task.id, projectName: task.projectName, viewpointName: task.viewpointName, assignee: task.assignee });
    setView('input');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 案件を編集：新規登録フォームに案件全体（全視点・全ステップ）を pre-populate
  const handleEditProject = (projectName) => {
    const projectTasks = tasksRef.current.filter(t => t.projectName === projectName && t.status !== 'done');
    if (projectTasks.length === 0) { alert('この案件には編集できるタスクがありません'); return; }
    // 視点ごとにグループ化（出現順）→ 各視点内は stepOrder 順
    const vpMap = new Map();
    for (const t of projectTasks) {
      const k = `${t.viewpointName}::${t.assignee}`;
      if (!vpMap.has(k)) vpMap.set(k, { viewpointName: t.viewpointName, assignee: t.assignee, steps: [] });
      vpMap.get(k).steps.push(t);
    }
    const viewpoints = Array.from(vpMap.values()).map(v => ({
      viewpointName: v.viewpointName,
      assignee: v.assignee,
      steps: v.steps
        .slice()
        .sort((a, b) => (a.stepOrder ?? 0) - (b.stepOrder ?? 0))
        .map(t => ({
          taskId: t.id,
          name: t.stepName || '',
          hours: String(t.hours),
          completedHours: String(t.completedHours || 0),
        })),
    }));
    const first = projectTasks[0];
    setForm({
      ...emptyForm,
      projectName: first.projectName,
      projectNameInternal: first.projectNameInternal || '',
      companyName: first.companyName || '',
      customerContact: first.customerContact || '',
      assignee: first.assignee,
      priority: String(Math.min(...projectTasks.map(t => t.priority))),
      manualStart: first.manualStart || '',
      viewpoints,
    });
    setEditingId(null);
    setEditMode({ type: 'project', projectName: first.projectName });
    setView('input');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 視点を削除（ぶら下がる全ステップ＝アクティブ＋完了済みを一括削除）
  const handleDeleteViewpoint = async (group) => {
    if (!group) return;
    const targets = tasksRef.current.filter(t =>
      t.projectName === group.projectName &&
      t.viewpointName === group.viewpointName &&
      t.assignee === group.assignee
    );
    if (targets.length === 0) return;
    const activeCount = targets.filter(t => t.status !== 'done').length;
    const doneCount = targets.length - activeCount;
    const detail = doneCount > 0
      ? `${targets.length}件（アクティブ ${activeCount}件・完了済み ${doneCount}件）`
      : `${activeCount}件`;
    const msg = `視点「${group.projectName} ／ ${group.viewpointName}」を削除しますか？\n` +
      `ぶら下がっているステップ ${detail} も一緒に削除されます。\n` +
      `この操作は取り消せません。`;
    if (!confirm(msg)) return;

    // シート由来タスクの削除を deletedExternalIds に記録（次回同期で復活させない）
    try {
      const eids = targets.filter(t => t.externalId).map(t => t.externalId);
      if (eids.length > 0) {
        const current = await storage.get('deletedExternalIds');
        const list = (current && current.value) ? JSON.parse(current.value) : [];
        let changed = false;
        for (const eid of eids) {
          if (!list.includes(eid)) { list.push(eid); changed = true; }
        }
        if (changed) await storage.set('deletedExternalIds', JSON.stringify(list));
      }
    } catch (e) { console.warn('削除済みリストの更新に失敗:', e); }

    const deletedIds = targets.map(t => t.id);
    const deletedSet = new Set(deletedIds);
    const merged = tasksRef.current.filter(t => !deletedSet.has(t.id));
    const normalized = normalizePriorities(merged);
    setTasks(normalized);
    tasksRef.current = normalized;
    try { await tasksStore.batch([], deletedIds); }
    catch (e) { console.error('視点削除エラー:', e); alert('削除に失敗しました：' + (e?.message || e)); }
  };

  // 案件に新しい視点を追加（新規登録フォームを案件名・コード入りで開く）
  const handleAddViewpointToProject = (projectName, projectNameInternal) => {
    // 同じ案件の既存タスクから会社名・お客様担当者を引き継ぐ
    const sibling = tasksRef.current.find(t => t.projectName === projectName);
    setForm({
      ...emptyForm,
      projectName: projectName || '',
      projectNameInternal: projectNameInternal || '',
      companyName: sibling?.companyName || '',
      customerContact: sibling?.customerContact || '',
      viewpoints: [makeEmptyViewpoint()],
    });
    setEditingId(null);
    setEditMode(null);
    setView('input');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 視点まるごとを編集（同じ案件・視点名・担当者のアクティブタスクをフォームに展開）
  const handleEditViewpoint = (group) => {
    const tasksOfVp = tasksRef.current.filter(t =>
      t.projectName === group.projectName &&
      t.viewpointName === group.viewpointName &&
      t.assignee === group.assignee &&
      t.status !== 'done'
    ).slice().sort((a, b) => (a.stepOrder ?? 0) - (b.stepOrder ?? 0));
    if (tasksOfVp.length === 0) { alert('この視点には編集できるタスクがありません'); return; }
    const first = tasksOfVp[0];
    const viewpoints = [{
      viewpointName: group.viewpointName,
      assignee: group.assignee,
      steps: tasksOfVp.map(t => ({
        taskId: t.id,
        name: t.stepName || '',
        hours: String(t.hours),
        completedHours: String(t.completedHours || 0),
      })),
    }];
    setForm({
      ...emptyForm,
      projectName: group.projectName,
      projectNameInternal: group.projectNameInternal || '',
      companyName: group.companyName || first.companyName || '',
      customerContact: group.customerContact || first.customerContact || '',
      assignee: group.assignee,
      priority: String(group.minPriority || first.priority),
      manualStart: first.manualStart || '',
      viewpoints,
    });
    setEditingId(null);
    setEditMode({ type: 'viewpoint', projectName: group.projectName, viewpointName: group.viewpointName, assignee: group.assignee });
    setView('input');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddStepToViewpoint = (group) => {
    // この視点に新しいステップを1行だけ追加できる状態でフォームを開く
    setForm({
      ...emptyForm,
      projectName: group.projectName,
      projectNameInternal: group.projectNameInternal || '',
      companyName: group.companyName || '',
      customerContact: group.customerContact || '',
      assignee: group.assignee,
      priority: String(group.minPriority),
      viewpoints: [{ viewpointName: group.viewpointName, assignee: group.assignee, steps: [{ name: '', hours: '', completedHours: '' }] }],
    });
    setEditingId(null);
    setEditMode(null);
    setView('input');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 担当者の振り分け（視点内の全ステップを一括変更）
  const reassignViewpoint = (group, newAssignee) => {
    const na = (newAssignee || '').trim();
    if (!na) return;
    const ids = new Set(group.tasks.map(t => t.id));
    saveTasks(prev => normalizePriorities(prev.map(t => ids.has(t.id) ? { ...t, assignee: na } : t)));
  };

  const handleDelete = async (id) => {
    if (!confirm('このタスクを削除しますか？')) return;
    const task = tasksRef.current.find(t => t.id === id);
    // シート由来タスクは削除済みリストに記録 → 次回同期で復活させない
    if (task && task.externalId) {
      try {
        const current = await storage.get('deletedExternalIds');
        const list = (current && current.value) ? JSON.parse(current.value) : [];
        if (!list.includes(task.externalId)) {
          list.push(task.externalId);
          await storage.set('deletedExternalIds', JSON.stringify(list));
        }
      } catch (e) {
        console.warn('削除済みリストの更新に失敗:', e);
      }
    }
    await removeTask(id);
  };

  const toggleStatus = (id) => {
    saveTasks(prev => normalizePriorities(prev.map(t => {
      if (t.id !== id) return t;
      if (t.status === 'done') return { ...t, status: 'pending', completedAt: null };
      return { ...t, status: 'done', completedHours: t.hours, completedAt: Date.now() };
    })));
  };

  const addProgress = (id, delta) => {
    saveTasks(prev => normalizePriorities(prev.map(t => {
      if (t.id !== id) return t;
      const newCompleted = Math.min(t.hours, Math.max(0, (t.completedHours || 0) + delta));
      const autoComplete = t.hours > 0 && newCompleted >= t.hours;
      return {
        ...t, completedHours: newCompleted,
        status: autoComplete ? 'done' : 'pending',
        completedAt: autoComplete ? Date.now() : null,
      };
    })));
  };

  const setTaskHours = (id, hours) => {
    if (isNaN(hours) || hours < 0) return;
    saveTasks(prev => normalizePriorities(prev.map(t => {
      if (t.id !== id) return t;
      const cappedCompleted = Math.min(hours, t.completedHours || 0);
      const autoDone = hours > 0 && cappedCompleted >= hours;
      return {
        ...t, hours,
        completedHours: cappedCompleted,
        status: autoDone ? 'done' : (t.status === 'done' ? 'pending' : t.status),
        completedAt: autoDone ? (t.completedAt || Date.now()) : null,
      };
    })));
  };
  // 予定終了時刻（スケジュール上の最遅の終了）を datetime-local 文字列で返す
  const plannedEndDtLocal = (tasksOfTarget) => {
    let best = null;
    for (const t of tasksOfTarget) {
      if (!t.scheduledEnd) continue;
      const ts = t.scheduledEnd.getTime() + (t.scheduledEndMin || 0) * 60000;
      if (best == null || ts > best) best = ts;
    }
    return dateToDtLocal(best == null ? new Date() : new Date(best));
  };

  // 「視点完了」：終了時間を入力する完了ダイアログを開く
  const completeViewpoint = (group) => {
    if (!group || !group.tasks) return;
    const activeTasks = group.tasks.filter(t => t.status !== 'done');
    if (activeTasks.length === 0) { alert('この視点には未完了のタスクがありません'); return; }
    setCompleteTarget({
      kind: 'viewpoint',
      label: `視点「${group.projectName} ／ ${group.viewpointName}」`,
      ids: activeTasks.map(t => t.id),
      defaultEnd: plannedEndDtLocal(activeTasks),
    });
  };

  // 「案件完了」：終了時間を入力する完了ダイアログを開く
  const completeProject = (projectName) => {
    if (!projectName) return;
    const activeTasks = scheduled.active.filter(t => t.projectName === projectName);
    if (activeTasks.length === 0) { alert('この案件には未完了のタスクがありません'); return; }
    setCompleteTarget({
      kind: 'project',
      label: `案件「${projectName}」`,
      ids: activeTasks.map(t => t.id),
      defaultEnd: plannedEndDtLocal(activeTasks),
    });
  };

  // 完了ダイアログで「完了する」：選択タスクを完了にし、終了時間（実績）を記録
  const confirmComplete = (actualEndStr) => {
    if (!completeTarget) return;
    const idSet = new Set(completeTarget.ids);
    const ae = actualEndStr || null;
    const completedAtMs = ae ? new Date(ae).getTime() : Date.now();
    saveTasks(prev => normalizePriorities(prev.map(t =>
      idSet.has(t.id)
        ? { ...t, status: 'done', completedHours: t.hours, completedAt: completedAtMs, actualEnd: ae }
        : t
    )));
    setCompleteTarget(null);
    setView('done');
  };

  // 完了タブで終了時間（実績）を後から編集
  const setActualEnd = (id, value) => {
    const ae = value || null;
    saveTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const completedAt = ae ? new Date(ae).getTime() : t.completedAt;
      return { ...t, actualEnd: ae, completedAt };
    }));
  };

  const setTaskCompletedHours = (id, completed) => {
    if (isNaN(completed) || completed < 0) return;
    saveTasks(prev => normalizePriorities(prev.map(t => {
      if (t.id !== id) return t;
      const capped = Math.min(t.hours, completed);
      const autoDone = t.hours > 0 && capped >= t.hours;
      return {
        ...t, completedHours: capped,
        status: autoDone ? 'done' : (t.status === 'done' ? 'pending' : t.status),
        completedAt: autoDone ? (t.completedAt || Date.now()) : null,
      };
    })));
  };

  const moveUp = (id) => {
    saveTasks(prev => {
      const target = prev.find(t => t.id === id);
      if (!target) return prev;
      const company = target.companyName || '';
      // 並べ替えは「同じ会社の中だけ」で行う
      const sorted = prev.filter(t => t.status !== 'done' && (t.companyName || '') === company)
        .sort((a, b) => (a.priority - b.priority) || (a.createdAt - b.createdAt));
      const idx = sorted.findIndex(t => t.id === id);
      if (idx <= 0) return prev;
      const a = sorted[idx], b = sorted[idx - 1];
      return normalizePriorities(prev.map(t => {
        if (t.id === a.id) return { ...t, priority: b.priority };
        if (t.id === b.id) return { ...t, priority: a.priority };
        return t;
      }));
    });
  };

  const moveDown = (id) => {
    saveTasks(prev => {
      const target = prev.find(t => t.id === id);
      if (!target) return prev;
      const company = target.companyName || '';
      // 並べ替えは「同じ会社の中だけ」で行う
      const sorted = prev.filter(t => t.status !== 'done' && (t.companyName || '') === company)
        .sort((a, b) => (a.priority - b.priority) || (a.createdAt - b.createdAt));
      const idx = sorted.findIndex(t => t.id === id);
      if (idx < 0 || idx >= sorted.length - 1) return prev;
      const a = sorted[idx], b = sorted[idx + 1];
      return normalizePriorities(prev.map(t => {
        if (t.id === a.id) return { ...t, priority: b.priority };
        if (t.id === b.id) return { ...t, priority: a.priority };
        return t;
      }));
    });
  };

  const changePriority = (id, newPriority) => {
    const np = parseInt(newPriority, 10);
    if (isNaN(np) || np < 1) return;
    saveTasks(prev => normalizePriorities(prev.map(t => t.id === id ? { ...t, priority: np } : t)));
  };

  const scheduled = useMemo(() => scheduleTasks(tasks, settings, projectOrder), [tasks, settings, projectOrder]);
  const projectList = useMemo(() => [...new Set(tasks.map(t => t.projectName))].filter(Boolean), [tasks]);
  const projectInternalList = useMemo(() => [...new Set(tasks.map(t => t.projectNameInternal))].filter(Boolean), [tasks]);
  const viewpointList = useMemo(() => [...new Set(tasks.map(t => t.viewpointName))].filter(Boolean), [tasks]);
  // 制作担当者の候補：従業員マスタ ＋ 既存タスクの担当者
  const assigneeList = useMemo(
    () => [...new Set([...employeeMaster.map(e => e.name), ...tasks.map(t => t.assignee)])].filter(Boolean),
    [tasks, employeeMaster]
  );
  // 候補に出す会社名：お客様マスタ ＋ 登録済みの会社 ＋ 既定リスト（重複は除く）
  const companyList = useMemo(() => {
    const used = tasks.map(t => t.companyName).filter(Boolean);
    const fromMaster = customerMaster.map(c => c.company).filter(Boolean);
    return [...new Set([...fromMaster, ...used, ...COMPANY_PRESETS])];
  }, [tasks, customerMaster]);
  const hoursPerDay = getHoursPerDay(settings);

  const todayYMD = fmtYMD(new Date());
  const pendingAdvanceDays = useMemo(() => {
    if (!settings.lastAdvancedDate) return 0;
    return countBusinessDaysBetween(settings.lastAdvancedDate, todayYMD);
  }, [settings.lastAdvancedDate, todayYMD]);
  const pendingAdvanceHours = useMemo(() => {
    if (!settings.lastAdvancedDate) return 0;
    return workingHoursBetween(settings.lastAdvancedDate, todayYMD, settings);
  }, [settings.lastAdvancedDate, todayYMD, settings]);
  const todayUncredited = settings.lastAdvancedDate
    ? parseYMD(settings.lastAdvancedDate) < parseYMD(todayYMD)
    : false;
  const todayWorkingHours = getDayWorkingHours(new Date(), settings);

  // 初回起動時：lastAdvancedDate を「前営業日」に初期化（過去分を遡って勝手に反映しない）
  useEffect(() => {
    if (loading || !auth.allowed) return;
    if (!settings.lastAdvancedDate) {
      saveSettings({ ...settings, lastAdvancedDate: fmtYMD(prevBusinessDay(new Date())) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, auth.allowed, settings.lastAdvancedDate]);

  const advanceByHours = (hours) => {
    if (hours <= 0) return;
    saveTasks(prev => normalizePriorities(advanceTasksByAssignee(prev, hours)));
  };
  const applyPendingAdvance = () => {
    if (pendingAdvanceHours > 0) advanceByHours(pendingAdvanceHours);
    saveSettings({ ...settings, lastAdvancedDate: fmtYMD(prevBusinessDay(new Date())) });
  };
  const skipPendingAdvance = () => {
    saveSettings({ ...settings, lastAdvancedDate: fmtYMD(prevBusinessDay(new Date())) });
  };
  const advanceToday = () => {
    advanceByHours(todayWorkingHours);
    saveSettings({ ...settings, lastAdvancedDate: todayYMD });
  };

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
    { id: 'master', icon: <Folder size={15} />, label: 'マスタ' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, fontFamily: fontJP, color: colors.text }}>
      <header style={{ borderBottom: `1px solid ${colors.border}`, background: colors.surface }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
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
            <div style={{ maxWidth: 1600, margin: '0 auto', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
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
            <div style={{ maxWidth: 1600, margin: '16px auto 0', borderTop: `1px solid ${colors.border}`, paddingTop: 16 }}>
              <AbsenceManager
                absences={settings.absences || []} assigneeList={assigneeList}
                onAdd={addAbsence} onRemove={removeAbsence}
                colors={colors} fontJP={fontJP} />
            </div>
          </div>
        )}
      </header>

      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '28px' }}>
        <AdvanceBar
          pendingDays={pendingAdvanceDays}
          pendingHours={pendingAdvanceHours}
          todayUncredited={todayUncredited}
          todayWorkingHours={todayWorkingHours}
          lastAdvancedDate={settings.lastAdvancedDate}
          onApply={applyPendingAdvance}
          onSkip={skipPendingAdvance}
          onAdvanceToday={advanceToday}
          colors={colors}
          fontJP={fontJP}
        />
        {view === 'input' && (
          <InputView form={form} setForm={setForm} handleSubmit={handleSubmit} editingId={editingId} editMode={editMode}
            cancelEdit={() => { setEditingId(null); setEditMode(null); setForm(emptyForm); }}
            tasks={tasks} scheduled={scheduled}
            projectOrder={projectOrder} saveProjectOrder={saveProjectOrderPartial}
            companyList={companyList} customerMaster={customerMaster}
            handleEdit={handleEdit} handleEditProject={handleEditProject} handleEditViewpoint={handleEditViewpoint}
            handleAddViewpointToProject={handleAddViewpointToProject}
            handleDeleteViewpoint={handleDeleteViewpoint}
            handleDelete={handleDelete} toggleStatus={toggleStatus}
            moveUp={moveUp} moveDown={moveDown} changePriority={changePriority} addProgress={addProgress} setTaskHours={setTaskHours} setTaskCompletedHours={setTaskCompletedHours} completeProject={completeProject} completeViewpoint={completeViewpoint}
            handleAddStepToViewpoint={handleAddStepToViewpoint} reassignViewpoint={reassignViewpoint}
            projectList={projectList} projectInternalList={projectInternalList} viewpointList={viewpointList} assigneeList={assigneeList}
            settings={settings}
            colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
        )}
        {view === 'calendar' && (
          <CalendarView scheduled={scheduled} settings={settings} colors={colors} fontDisplay={fontDisplay} />
        )}
        {view === 'byAssignee' && (
          <AssigneeView scheduled={scheduled} selectedAssignee={selectedAssignee} setSelectedAssignee={setSelectedAssignee}
            projectOrder={projectOrder} saveProjectOrder={saveProjectOrderPartial}
            handleEdit={handleEdit} handleEditProject={handleEditProject} handleEditViewpoint={handleEditViewpoint}
            handleAddViewpointToProject={handleAddViewpointToProject}
            handleDeleteViewpoint={handleDeleteViewpoint}
            handleDelete={handleDelete} toggleStatus={toggleStatus}
            moveUp={moveUp} moveDown={moveDown} changePriority={changePriority} addProgress={addProgress} setTaskHours={setTaskHours} setTaskCompletedHours={setTaskCompletedHours} completeProject={completeProject} completeViewpoint={completeViewpoint}
            handleAddStepToViewpoint={handleAddStepToViewpoint} reassignViewpoint={reassignViewpoint} assigneeList={assigneeList}
            colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
        )}
        {view === 'message' && (
          <MessageView scheduled={scheduled} settings={settings} colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
        )}
        {view === 'done' && (
          <DoneView scheduled={scheduled} toggleStatus={toggleStatus} handleDelete={handleDelete}
            setActualEnd={setActualEnd}
            colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
        )}
        {view === 'master' && (
          <MasterView
            customerMaster={customerMaster} saveCustomerMaster={saveCustomerMaster}
            employeeMaster={employeeMaster} saveEmployeeMaster={saveEmployeeMaster}
            colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
        )}
      </main>

      {completeTarget && (
        <CompleteDialog
          target={completeTarget}
          onConfirm={confirmComplete}
          onCancel={() => setCompleteTarget(null)}
          colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
      )}

      {startMoveConfirm && (
        <ConfirmModal
          title="開始時間が移動します"
          colors={colors} fontJP={fontJP} fontDisplay={fontDisplay}
          confirmLabel="このまま登録する"
          cancelLabel="戻る"
          onConfirm={async () => { setStartMoveConfirm(null); await performSubmit(); }}
          onCancel={() => setStartMoveConfirm(null)}>
          <p style={{ margin: '0 0 10px 0', lineHeight: 1.7 }}>
            指定した開始時間{' '}
            <strong>
              {startMoveConfirm.requested
                ? `${fmtMD(startMoveConfirm.requested.date)}(${dayName(startMoveConfirm.requested.date)}) ${minToTime(startMoveConfirm.requested.min)}`
                : ''}
            </strong>{' '}
            には空きがありません。
          </p>
          <p style={{ margin: 0, lineHeight: 1.7 }}>
            実際の開始は{' '}
            <strong style={{ color: '#c46a16' }}>
              {fmtMD(startMoveConfirm.actualDate)}({dayName(startMoveConfirm.actualDate)}) {minToTime(startMoveConfirm.actualMin)}
            </strong>{' '}
            になります。このまま登録しますか？
          </p>
        </ConfirmModal>
      )}

    </div>
  );
}

// ============ 確認モーダル（汎用） ============
function ConfirmModal({ title, children, confirmLabel, cancelLabel, onConfirm, onCancel, colors, fontJP, fontDisplay }) {
  return (
    <div onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, padding: 24, width: '100%', maxWidth: 440, fontFamily: fontJP, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 17, margin: '0 0 12px 0', fontWeight: 600 }}>{title}</h3>
        <div style={{ fontSize: 13, color: colors.text }}>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
          <button type="button" onClick={onCancel}
            style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, color: colors.textMute }}>
            {cancelLabel || 'キャンセル'}
          </button>
          <button type="button" onClick={onConfirm}
            style={{ padding: '8px 18px', background: colors.text, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 600 }}>
            {confirmLabel || 'OK'}
          </button>
        </div>
      </div>
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
function InputView({ form, setForm, handleSubmit, editingId, editMode, cancelEdit, tasks, scheduled, projectOrder, saveProjectOrder, companyList, customerMaster, handleEdit, handleEditProject, handleEditViewpoint, handleAddViewpointToProject, handleDeleteViewpoint, handleDelete, toggleStatus, moveUp, moveDown, changePriority, addProgress, setTaskHours, setTaskCompletedHours, completeProject, completeViewpoint, handleAddStepToViewpoint, reassignViewpoint, projectList, projectInternalList, viewpointList, assigneeList, settings, colors, fontJP, fontDisplay }) {
  // お客様担当者の候補：会社名を選んでいればその会社の担当者を優先表示
  const contactOptions = useMemo(() => {
    const rows = customerMaster || [];
    const c = (form.companyName || '').trim();
    const matched = c ? rows.filter(r => (r.company || '') === c) : [];
    const base = matched.length ? matched : rows;
    const names = [];
    for (const r of base) for (const ct of (r.contacts || [])) if (ct.name) names.push(ct.name);
    return [...new Set(names)];
  }, [customerMaster, form.companyName]);
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
  const updateViewpointName = (vi, value) => {
    const vps = [...form.viewpoints];
    vps[vi] = { ...vps[vi], viewpointName: value };
    setForm({ ...form, viewpoints: vps });
  };
  const updateViewpointAssignee = (vi, value) => {
    const vps = [...form.viewpoints];
    vps[vi] = { ...vps[vi], assignee: value };
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

  // 開始・終了予定のプレビュー：実データ（他タスク）に混ぜて実スケジュールと同じ計算をする
  const previewSchedule = useMemo(
    () => simulateFormSchedule(form, tasks, settings, projectOrder),
    [form, tasks, settings, projectOrder]
  );

  // 開始時間を「日付」と「時刻」に分けて扱う（datetime-localが入力しづらい環境への対策）
  const msDate = form.manualStart ? form.manualStart.split('T')[0] : '';
  const msTime = form.manualStart ? (form.manualStart.split('T')[1] || '') : '';
  const setManualStart = (datePart, timePart) => {
    if (!datePart && !timePart) { setForm({ ...form, manualStart: '' }); return; }
    const d = datePart || fmtYMD(new Date());
    const tm = timePart || (settings.morningStart || '08:00');
    setForm({ ...form, manualStart: `${d}T${tm}` });
  };

  // 案件の検索：案件名・社内案件名・会社名・お客様担当者・制作担当者・視点名・ステップ名で絞り込み
  const [searchQuery, setSearchQuery] = useState('');
  const q = searchQuery.trim().toLowerCase();
  const filteredActive = useMemo(() => {
    if (!q) return scheduled.active;
    return scheduled.active.filter(t =>
      [t.projectName, t.projectNameInternal, t.companyName, t.customerContact, t.assignee, t.viewpointName, t.stepName]
        .some(v => (v || '').toLowerCase().includes(q))
    );
  }, [scheduled.active, q]);

  // ===== 過去案件から引用 =====
  const [quoteOpen, setQuoteOpen] = useState(false);
  // 完了済みタスクを含む案件を、案件単位（社外案件名）でまとめる
  const pastProjects = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      const p = t.projectName;
      if (!p) continue;
      if (!map.has(p)) map.set(p, {
        projectName: p, projectNameInternal: '', companyName: '', customerContact: '',
        lastCompletedAt: 0, hasDone: false, viewpoints: new Set(), lastAssignee: '', lastAssigneeStamp: -Infinity,
      });
      const e = map.get(p);
      if (t.status === 'done') e.hasDone = true;
      if (t.projectNameInternal && !e.projectNameInternal) e.projectNameInternal = t.projectNameInternal;
      if (t.companyName && !e.companyName) e.companyName = t.companyName;
      if (t.customerContact && !e.customerContact) e.customerContact = t.customerContact;
      if (t.viewpointName) e.viewpoints.add(t.viewpointName);
      if (t.completedAt && t.completedAt > e.lastCompletedAt) e.lastCompletedAt = t.completedAt;
      const stamp = t.completedAt || t.createdAt || 0;
      if (t.assignee && stamp >= e.lastAssigneeStamp) { e.lastAssigneeStamp = stamp; e.lastAssignee = t.assignee; }
    }
    return [...map.values()].filter(e => e.hasDone)
      .map(e => ({ ...e, viewpointCount: e.viewpoints.size }))
      .sort((a, b) => b.lastCompletedAt - a.lastCompletedAt);
  }, [tasks]);

  const isFormDirty = () => {
    const f = form;
    if ((f.projectName || f.projectNameInternal || f.companyName || f.customerContact || f.assignee || f.priority || f.manualStart || '').toString().trim()) return true;
    for (const vp of (f.viewpoints || [])) {
      if ((vp.viewpointName || '').trim() || (vp.assignee || '').trim()) return true;
      for (const s of (vp.steps || [])) {
        if ((s.name || '').trim() || String(s.hours ?? '').trim() || String(s.completedHours ?? '').trim()) return true;
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
      priority: '', manualStart: '',
      viewpoints: [makeViewpointFromPreset(VIEWPOINT_PRESETS[0])],
    });
    setQuoteOpen(false);
  };
  const selectQuote = (proj) => {
    if (isFormDirty() && !window.confirm('入力中の内容を破棄して引用しますか？')) return;
    applyQuote(proj);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32 }}>
      {quoteOpen && (
        <QuoteModal projects={pastProjects} onSelect={selectQuote} onClose={() => setQuoteOpen(false)}
          colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
      )}
      <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 18, margin: 0, fontWeight: 500 }}>
            {editMode?.type === 'step'
              ? 'ステップを編集'
              : editMode?.type === 'viewpoint'
                ? `視点「${editMode.projectName} ／ ${editMode.viewpointName}」を編集`
                : editMode?.type === 'project'
                  ? `案件「${editMode.projectName}」を編集`
                  : '新規タスク登録'}
          </h2>
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

        {/* 共通項目（新規登録・全編集モード共通） */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>社外案件名</label>
            <input type="text" list="project-list" value={form.projectName}
              onChange={(e) => setForm({ ...form, projectName: e.target.value })}
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
              {!editMode && <span style={{ color: colors.textMute, fontSize: 10 }}>※視点ごとに上書き可</span>}
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
            </div>
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
            </div>
            {previewSchedule?.moved && (
              <div style={{ fontSize: 11, color: '#c46a16', marginTop: 6, fontWeight: 500 }}>
                ※ 指定時刻に空きがないため、開始予定を移動しています
              </div>
            )}
            <div style={{ fontSize: 10, color: colors.textMute, marginTop: 6 }}>
              日付・時刻を別々に選べます（時刻だけ入力した場合は本日の日付になります） ・ 開始/終了は他タスクを含めた実際のスケジュールです
            </div>
          </div>
        </div>

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
                    <Combobox value={vp.assignee || ''} onChange={(v) => updateViewpointAssignee(vi, v)}
                      options={assigneeList}
                      placeholder={form.assignee ? `担当者（既定: ${form.assignee}）` : '担当者'}
                      title="この視点の担当者。空欄なら上の「デフォルト担当者」が使われます"
                      inputStyle={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }}
                      colors={colors} fontJP={fontJP} wrapperStyle={{ flex: '1 1 150px' }} />
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
              ※ 空欄の項目・ステップは登録されません ・ 制作時間は0でも登録できます ・ 上から順に作業する想定でスケジュールされます
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
      </section>

      <section>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 18, margin: '0 0 16px 0', fontWeight: 500, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          進行中タスク
          <span style={{ fontSize: 12, color: colors.textMute, fontFamily: fontJP }}>
            {q ? `${filteredActive.length} / ${scheduled.active.length}件` : `${scheduled.active.length}件 ・ 視点ごとにまとめて表示`}
          </span>
        </h2>

        {/* 案件の検索 */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
        </div>

        {scheduled.active.length === 0 ? (
          <div style={{ background: colors.surface, border: `1px dashed ${colors.border}`, borderRadius: 6, padding: 48, textAlign: 'center', color: colors.textMute, fontSize: 13 }}>
            進行中のタスクがありません。上のフォームから登録してください。
          </div>
        ) : filteredActive.length === 0 ? (
          <div style={{ background: colors.surface, border: `1px dashed ${colors.border}`, borderRadius: 6, padding: 48, textAlign: 'center', color: colors.textMute, fontSize: 13 }}>
            「{searchQuery}」に一致する案件はありません。
          </div>
        ) : (
          <ViewpointGroupList
            groups={groupByViewpoint(filteredActive)}
            allActive={filteredActive}
            projectOrder={projectOrder} saveProjectOrder={saveProjectOrder}
            handleEdit={handleEdit} handleEditProject={handleEditProject} handleEditViewpoint={handleEditViewpoint}
            handleAddViewpointToProject={handleAddViewpointToProject}
            handleDeleteViewpoint={handleDeleteViewpoint}
            handleDelete={handleDelete} toggleStatus={toggleStatus}
            moveUp={moveUp} moveDown={moveDown} changePriority={changePriority} addProgress={addProgress} setTaskHours={setTaskHours} setTaskCompletedHours={setTaskCompletedHours} completeProject={completeProject} completeViewpoint={completeViewpoint}
            handleAddStepToViewpoint={handleAddStepToViewpoint} reassignViewpoint={reassignViewpoint} assigneeList={assigneeList}
            colors={colors} fontJP={fontJP} />
        )}
      </section>
    </div>
  );
}

// ============ 視点グループリスト ============
function ViewpointGroupList({ groups, allActive, projectOrder, saveProjectOrder, handleEdit, handleEditProject, handleEditViewpoint, handleAddViewpointToProject, handleDeleteViewpoint, handleDelete, toggleStatus, moveUp, moveDown, changePriority, addProgress, setTaskHours, setTaskCompletedHours, completeProject, completeViewpoint, handleAddStepToViewpoint, reassignViewpoint, assigneeList, colors, fontJP }) {
  // 全タスクのグローバルなインデックス（移動可否判定用）
  const allSortedIds = allActive.map(t => t.id);

  // 各会社の「先頭／末尾タスク」id（会社の中での↑↓の可否判定に使う）。
  // allActive はスケジュール順（会社ごとに連続）なので、初出＝先頭・末尾から見て初出＝末尾。
  const { companyFirstIds, companyLastIds } = useMemo(() => {
    const first = new Set(), last = new Set();
    const seenF = new Set(), seenL = new Set();
    for (let i = 0; i < allActive.length; i++) {
      const c = allActive[i].companyName || '';
      if (!seenF.has(c)) { first.add(allActive[i].id); seenF.add(c); }
    }
    for (let i = allActive.length - 1; i >= 0; i--) {
      const c = allActive[i].companyName || '';
      if (!seenL.has(c)) { last.add(allActive[i].id); seenL.add(c); }
    }
    return { companyFirstIds: first, companyLastIds: last };
  }, [allActive]);

  // 案件（社外案件名）でさらにグループ化。順序は最初に現れた順。
  const projectGroups = useMemo(() => {
    const map = new Map();
    for (const g of groups) {
      const pname = g.projectName || '(案件名未設定)';
      if (!map.has(pname)) {
        map.set(pname, {
          projectName: pname,
          projectNameInternal: g.projectNameInternal || '',
          companyName: g.companyName || '',
          customerContact: g.customerContact || '',
          viewpointGroups: [],
          totalHours: 0,
          completedHours: 0,
          taskCount: 0,
          assigneeSet: new Set(),
          startTs: null, endTs: null,
          scheduledStart: null, scheduledStartMin: 0,
          scheduledEnd: null, scheduledEndMin: 0,
        });
      }
      const pg = map.get(pname);
      pg.viewpointGroups.push(g);
      pg.totalHours += g.totalHours;
      pg.completedHours += g.completedHours;
      pg.taskCount += g.tasks.length;
      if (!pg.projectNameInternal && g.projectNameInternal) pg.projectNameInternal = g.projectNameInternal;
      if (!pg.companyName && g.companyName) pg.companyName = g.companyName;
      if (!pg.customerContact && g.customerContact) pg.customerContact = g.customerContact;
      if (g.assignee) pg.assigneeSet.add(g.assignee);
      // 案件全体の開始＝最早の視点開始、終了＝最遅の視点終了
      if (g.scheduledStart) {
        const sTs = g.scheduledStart.getTime() + (g.scheduledStartMin || 0) * 60000;
        if (pg.startTs == null || sTs < pg.startTs) {
          pg.startTs = sTs; pg.scheduledStart = g.scheduledStart; pg.scheduledStartMin = g.scheduledStartMin;
        }
      }
      if (g.scheduledEnd) {
        const eTs = g.scheduledEnd.getTime() + (g.scheduledEndMin || 0) * 60000;
        if (pg.endTs == null || eTs > pg.endTs) {
          pg.endTs = eTs; pg.scheduledEnd = g.scheduledEnd; pg.scheduledEndMin = g.scheduledEndMin;
        }
      }
    }
    const arr = Array.from(map.values());
    for (const pg of arr) pg.assignees = [...pg.assigneeSet];
    return arr;
  }, [groups]);


  // 案件の実効並び順（既定は会社ごと・手動ドラッグは会社を跨いで反映）で並べる
  const orderedProjectGroups = useMemo(() => {
    const effective = computeProjectOrder(allActive, projectOrder);
    const idx = new Map(effective.map((n, i) => [n, i]));
    const projOf = (pg) => idx.has(pg.projectName) ? idx.get(pg.projectName) : Infinity;
    return [...projectGroups].sort((a, b) => (projOf(a) - projOf(b)));
  }, [projectGroups, projectOrder, allActive]);

  // 会社ごとのセクション（連続する同一会社の案件を1グループに）にまとめる
  const companySections = useMemo(() => {
    const sections = [];
    let cur = null;
    for (const pg of orderedProjectGroups) {
      const c = pg.companyName || '';
      if (!cur || cur.companyName !== c) {
        cur = { companyName: c, projects: [], remaining: 0 };
        sections.push(cur);
      }
      cur.projects.push(pg);
      cur.remaining += (pg.totalHours - pg.completedHours);
    }
    return sections;
  }, [orderedProjectGroups]);

  // ドラッグ＆ドロップの状態（マウス／デスクトップ）
  const [dragSource, setDragSource] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  // 並び替え：source を target の手前に挿入した新しい順序を返す
  const computeReorder = (sourceName, targetName) => {
    const currentOrder = orderedProjectGroups.map(p => p.projectName);
    if (sourceName === targetName) return currentOrder;
    const filtered = currentOrder.filter(n => n !== sourceName);
    const targetIdx = filtered.indexOf(targetName);
    if (targetIdx < 0) return [...filtered, sourceName];
    return [...filtered.slice(0, targetIdx), sourceName, ...filtered.slice(targetIdx)];
  };

  const onDragStart = (name) => (e) => {
    if (!saveProjectOrder) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', name);
    setDragSource(name);
  };
  const onDragOver = (name) => (e) => {
    if (!saveProjectOrder || !dragSource || dragSource === name) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOver !== name) setDragOver(name);
  };
  const onDrop = (name) => (e) => {
    if (!saveProjectOrder || !dragSource) return;
    e.preventDefault();
    const newOrder = computeReorder(dragSource, name);
    saveProjectOrder(newOrder);
    setDragSource(null); setDragOver(null);
  };
  const onDragEnd = () => { setDragSource(null); setDragOver(null); };

  // タッチ／スマホ向け：↑↓ボタンで1つ動かす
  const moveProject = (name, dir) => {
    if (!saveProjectOrder) return;
    const order = orderedProjectGroups.map(p => p.projectName);
    const idx = order.indexOf(name);
    if (idx < 0) return;
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === order.length - 1) return;
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    const newOrder = [...order];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    saveProjectOrder(newOrder);
  };

  const [collapsed, setCollapsed] = useState(() => new Set());
  const toggle = (pname) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(pname)) next.delete(pname); else next.add(pname);
    return next;
  });
  const collapseAll = () => setCollapsed(new Set(orderedProjectGroups.map(p => p.projectName)));
  const expandAll = () => setCollapsed(new Set());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {orderedProjectGroups.length > 1 && (
        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: colors.textMute }}>
          <button type="button" onClick={expandAll}
            style={{ background: 'transparent', border: `1px solid ${colors.border}`, padding: '3px 10px', borderRadius: 3, cursor: 'pointer', fontFamily: fontJP, fontSize: 11, color: colors.textMute }}>
            すべて開く
          </button>
          <button type="button" onClick={collapseAll}
            style={{ background: 'transparent', border: `1px solid ${colors.border}`, padding: '3px 10px', borderRadius: 3, cursor: 'pointer', fontFamily: fontJP, fontSize: 11, color: colors.textMute }}>
            すべて閉じる
          </button>
        </div>
      )}
      {companySections.map((section) => (
        <div key={'company::' + section.companyName} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {section.companyName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
              <span style={{
                fontSize: 13, fontWeight: 700, color: '#fff',
                background: getProjectColor(section.companyName), borderRadius: 12,
                padding: '4px 14px', whiteSpace: 'nowrap',
              }}>{section.companyName}</span>
              <span style={{ fontSize: 11, color: colors.textMute }}>
                {section.projects.length}案件 ・ 残 {section.remaining}h
              </span>
            </div>
          )}
          {section.projects.map((pg, secIdx) => {
        const isCollapsed = collapsed.has(pg.projectName);
        const remaining = pg.totalHours - pg.completedHours;
        const pcolor = getProjectColor(pg.projectName);
        const draggable = !!saveProjectOrder;
        const isDragSource = dragSource === pg.projectName;
        const isDragOver = dragOver === pg.projectName && dragSource && dragSource !== pg.projectName;
        const isFirstInSection = secIdx === 0;
        const isLastInSection = secIdx === section.projects.length - 1;
        return (
          <div key={pg.projectName} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              draggable={draggable}
              onDragStart={draggable ? onDragStart(pg.projectName) : undefined}
              onDragOver={draggable ? onDragOver(pg.projectName) : undefined}
              onDragLeave={draggable ? (() => { if (dragOver === pg.projectName) setDragOver(null); }) : undefined}
              onDrop={draggable ? onDrop(pg.projectName) : undefined}
              onDragEnd={draggable ? onDragEnd : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#fff', border: `1px solid ${isDragOver ? colors.accent : colors.border}`,
                borderLeft: `4px solid ${pcolor}`,
                padding: '10px 14px', borderRadius: 4,
                fontFamily: fontJP,
                opacity: isDragSource ? 0.5 : 1,
                boxShadow: isDragOver ? `0 0 0 2px ${colors.accent} inset` : 'none',
                transition: 'box-shadow 0.1s, border-color 0.1s',
              }}>
              {draggable && (
                <span
                  title="ドラッグして並べ替え（PC）／右側の↑↓で並べ替え（スマホ）"
                  style={{
                    cursor: 'grab', color: colors.textMute, display: 'flex', alignItems: 'center',
                    padding: '2px 1px', flexShrink: 0,
                  }}>
                  <GripVertical size={14} />
                </span>
              )}
              <button type="button" onClick={() => toggle(pg.projectName)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: colors.textMute, display: 'flex', alignItems: 'center' }}
                title={isCollapsed ? '展開' : '折りたたみ'}>
                {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
              {pg.projectNameInternal ? (
                <>
                  <span style={{ fontSize: 14, fontWeight: 600, color: colors.text, cursor: 'pointer' }} onClick={() => toggle(pg.projectName)}>{pg.projectNameInternal}</span>
                  <span style={{ fontSize: 11, color: colors.textMute, cursor: 'pointer' }} onClick={() => toggle(pg.projectName)}>{pg.projectName}</span>
                </>
              ) : (
                <span style={{ fontSize: 14, fontWeight: 600, color: colors.text, cursor: 'pointer' }} onClick={() => toggle(pg.projectName)}>{pg.projectName}</span>
              )}
              {pg.customerContact && (
                <span style={{ fontSize: 11, color: colors.textMute, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  お客様: {pg.customerContact}
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.textMute, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
                {pg.assignees && pg.assignees.length > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: colors.text, fontWeight: 500 }}>
                    <User size={12} /> {pg.assignees.join('・')}
                  </span>
                )}
                {pg.scheduledStart && pg.scheduledEnd && (
                  <span style={{ color: colors.accent, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {fmtMD(pg.scheduledStart)}（{dayName(pg.scheduledStart)}）{minToTime(pg.scheduledStartMin)}
                    {' 〜 '}
                    {fmtMD(pg.scheduledEnd)}（{dayName(pg.scheduledEnd)}）{minToTime(pg.scheduledEndMin)}
                  </span>
                )}
                <span>{pg.viewpointGroups.length}視点</span>
                <span>{pg.taskCount}タスク</span>
                <span>完了 {pg.completedHours}h / 全 {pg.totalHours}h</span>
                <span style={{ color: colors.accent, fontWeight: 600 }}>残 {remaining}h</span>
              </span>
              {draggable && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button type="button"
                    onClick={() => moveProject(pg.projectName, 'up')}
                    disabled={isFirstInSection}
                    title="この案件を（会社の中で）上へ"
                    style={{
                      background: '#fff', border: `1px solid ${colors.border}`,
                      padding: '1px 4px', borderRadius: 2, cursor: isFirstInSection ? 'not-allowed' : 'pointer',
                      color: isFirstInSection ? '#ccc' : colors.textMute,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    <ChevronUp size={10} />
                  </button>
                  <button type="button"
                    onClick={() => moveProject(pg.projectName, 'down')}
                    disabled={isLastInSection}
                    title="この案件を（会社の中で）下へ"
                    style={{
                      background: '#fff', border: `1px solid ${colors.border}`,
                      padding: '1px 4px', borderRadius: 2, cursor: isLastInSection ? 'not-allowed' : 'pointer',
                      color: isLastInSection ? '#ccc' : colors.textMute,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    <ChevronDown size={10} />
                  </button>
                </div>
              )}
              {handleEditProject && (
                <button type="button" onClick={() => handleEditProject(pg.projectName)}
                  style={{
                    background: '#fff', border: `1px solid ${colors.border}`,
                    padding: '6px 10px', borderRadius: 3, cursor: 'pointer',
                    fontFamily: fontJP, fontSize: 11, color: colors.textMute,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                  title="案件名・案件コードを編集">
                  <Edit2 size={12} /> 案件を編集
                </button>
              )}
              {handleAddViewpointToProject && (
                <button type="button" onClick={() => handleAddViewpointToProject(pg.projectName, pg.projectNameInternal)}
                  style={{
                    background: colors.accentSoft, border: `1px solid ${colors.accent}`,
                    padding: '6px 10px', borderRadius: 3, cursor: 'pointer',
                    fontFamily: fontJP, fontSize: 11, color: colors.accent, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                  title="この案件に新しい視点を追加（新規登録フォームを案件名入りで開く）">
                  <Plus size={12} /> 視点を追加
                </button>
              )}
              {completeProject && (
                <button type="button" onClick={() => completeProject(pg.projectName)}
                  style={{
                    background: colors.progress, color: '#fff',
                    border: 'none', borderRadius: 3, padding: '6px 12px',
                    cursor: 'pointer', fontFamily: fontJP, fontSize: 11, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                  title="この案件の未完了タスクを全て完了にして完了タブへ移動">
                  <CheckCircle2 size={13} /> 案件完了
                </button>
              )}
            </div>
            {!isCollapsed && pg.viewpointGroups.map(group => (
              <ViewpointCard key={group.key} group={group}
                allSortedIds={allSortedIds}
                companyFirstIds={companyFirstIds} companyLastIds={companyLastIds}
                handleEdit={handleEdit} handleEditViewpoint={handleEditViewpoint}
                handleDeleteViewpoint={handleDeleteViewpoint}
                handleDelete={handleDelete} toggleStatus={toggleStatus}
                moveUp={moveUp} moveDown={moveDown} changePriority={changePriority} addProgress={addProgress} setTaskHours={setTaskHours} setTaskCompletedHours={setTaskCompletedHours} completeProject={completeProject} completeViewpoint={completeViewpoint}
                handleAddStepToViewpoint={handleAddStepToViewpoint} reassignViewpoint={reassignViewpoint} assigneeList={assigneeList}
                colors={colors} fontJP={fontJP} />
            ))}
          </div>
        );
          })}
        </div>
      ))}
    </div>
  );
}

function ViewpointCard({ group, allSortedIds, companyFirstIds, companyLastIds, handleEdit, handleEditViewpoint, handleDeleteViewpoint, handleDelete, toggleStatus, moveUp, moveDown, changePriority, addProgress, setTaskHours, setTaskCompletedHours, completeProject, completeViewpoint, handleAddStepToViewpoint, reassignViewpoint, assigneeList, colors, fontJP }) {
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
          {/* 案件コード（社内案件名）· 視点名 を主表示（同サイズ・大きめ） */}
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>
            {group.projectNameInternal || group.projectName}
            <span style={{ color: colors.textMute, fontWeight: 400, margin: '0 8px' }}>／</span>
            {group.viewpointName}
          </div>
          {group.projectNameInternal && group.projectName && (
            <div style={{ fontSize: 11, color: colors.textMute, marginBottom: 4 }}>
              {group.projectName}
            </div>
          )}
          <div style={{ fontSize: 11, color: colors.textMute, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {group.companyName && (
              <span style={{
                fontSize: 10, fontWeight: 600, color: '#fff',
                background: getProjectColor(group.companyName), borderRadius: 10,
                padding: '1px 8px',
              }}>{group.companyName}</span>
            )}
            {group.customerContact && <span>担当: {group.customerContact}</span>}
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

        {handleEditViewpoint && (
          <button onClick={() => handleEditViewpoint(group)}
            style={{
              background: '#fff', border: `1px solid ${colors.border}`,
              padding: '6px 10px', borderRadius: 3, cursor: 'pointer',
              fontFamily: fontJP, fontSize: 11, color: colors.textMute,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
            title="この視点を編集（視点名・担当者・ステップを一括編集）">
            <Edit2 size={12} /> 視点編集
          </button>
        )}
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
        {completeViewpoint && (
          <button onClick={() => completeViewpoint(group)}
            style={{
              background: colors.progress, color: '#fff',
              border: 'none', borderRadius: 3, padding: '6px 12px',
              cursor: 'pointer', fontFamily: fontJP, fontSize: 11, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
            title="この視点の未完了タスクを全て完了にする">
            <CheckCircle2 size={13} /> 視点完了
          </button>
        )}
        {handleDeleteViewpoint && (
          <button onClick={() => handleDeleteViewpoint(group)}
            style={{
              background: '#fff', border: `1px solid ${colors.accent}`,
              padding: '6px 10px', borderRadius: 3, cursor: 'pointer',
              fontFamily: fontJP, fontSize: 11, color: colors.accent, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
            title="この視点とぶら下がる全ステップを削除（取り消せません）">
            <Trash2 size={12} /> 視点削除
          </button>
        )}
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
            onSetHours={(h) => setTaskHours(task.id, h)}
            onSetCompletedHours={(c) => setTaskCompletedHours(task.id, c)}
            canMoveUp={companyFirstIds ? !companyFirstIds.has(task.id) : globalIdx > 0}
            canMoveDown={companyLastIds ? !companyLastIds.has(task.id) : globalIdx < allSortedIds.length - 1}
            isLast={idx === group.tasks.length - 1}
            colors={colors} fontJP={fontJP} />
        );
      })}
    </div>
  );
}

function AdvanceBar({ pendingDays, pendingHours, todayUncredited, todayWorkingHours, lastAdvancedDate, onApply, onSkip, onAdvanceToday, colors, fontJP }) {
  if (pendingDays <= 0 && !todayUncredited) return null;
  const btnPrimary = {
    padding: '6px 14px', background: colors.accent, color: '#fff',
    border: 'none', borderRadius: 3, cursor: 'pointer',
    fontFamily: fontJP, fontSize: 12, fontWeight: 600,
  };
  const btnGhost = {
    padding: '6px 12px', background: 'transparent', color: colors.textMute,
    border: `1px solid ${colors.border}`, borderRadius: 3, cursor: 'pointer',
    fontFamily: fontJP, fontSize: 12,
  };
  return (
    <div style={{
      background: '#fff8ec', border: `1px solid ${colors.border}`,
      borderRadius: 4, padding: '12px 16px', marginBottom: 20,
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    }}>
      {pendingDays > 0 ? (
        <>
          <span style={{ fontSize: 12, color: colors.text }}>
            前回（{lastAdvancedDate}）から <strong>{pendingDays}営業日</strong> 経過しています。
            担当者ごとに <strong>{pendingHours}h</strong> を反映しますか？
          </span>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <button onClick={onApply} style={btnPrimary}>反映する</button>
            <button onClick={onSkip} style={btnGhost}>今回はスキップ</button>
          </div>
        </>
      ) : (
        <>
          <span style={{ fontSize: 12, color: colors.text }}>
            今日（{fmtYMD(new Date())}）の進捗 <strong>{todayWorkingHours}h</strong> を担当者ごとに反映できます。
          </span>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <button onClick={onAdvanceToday} style={btnPrimary}>今日分を進める</button>
          </div>
        </>
      )}
    </div>
  );
}

function StepRow({ task, showStepLabel, onEdit, onDelete, onToggle, onMoveUp, onMoveDown, onChangePriority, onAddProgress, onSetHours, onSetCompletedHours, canMoveUp, canMoveDown, isLast, colors, fontJP }) {
  const [editingPriority, setEditingPriority] = useState(false);
  const [priorityInput, setPriorityInput] = useState(String(task.priority));
  const [customHours, setCustomHours] = useState('');
  const [editingTotalHours, setEditingTotalHours] = useState(false);
  const [editingCompletedHours, setEditingCompletedHours] = useState(false);
  const [totalHoursInput, setTotalHoursInput] = useState(String(task.hours));
  const [completedHoursInput, setCompletedHoursInput] = useState(String(task.completedHours || 0));
  useEffect(() => { setPriorityInput(String(task.priority)); }, [task.priority]);
  useEffect(() => { setTotalHoursInput(String(task.hours)); }, [task.hours]);
  useEffect(() => { setCompletedHoursInput(String(task.completedHours || 0)); }, [task.completedHours]);

  const commitCustomHours = () => {
    const v = parseFloat(customHours);
    if (!isNaN(v) && v !== 0) onAddProgress(v);
    setCustomHours('');
  };

  const commitPriority = () => {
    setEditingPriority(false);
    if (priorityInput && priorityInput !== String(task.priority)) onChangePriority(priorityInput);
  };

  const commitTotalHours = () => {
    setEditingTotalHours(false);
    const v = parseFloat(totalHoursInput);
    if (!isNaN(v) && v >= 0 && v !== task.hours && onSetHours) onSetHours(v);
    else setTotalHoursInput(String(task.hours));
  };

  const commitCompletedHours = () => {
    setEditingCompletedHours(false);
    const v = parseFloat(completedHoursInput);
    if (!isNaN(v) && v >= 0 && v !== (task.completedHours || 0) && onSetCompletedHours) onSetCompletedHours(v);
    else setCompletedHoursInput(String(task.completedHours || 0));
  };

  const completed = task.completedHours || 0;
  const remaining = Math.max(0, task.hours - completed);
  const progressPct = task.hours > 0 ? Math.min(100, (completed / task.hours) * 100) : 0;
  const numStyle = {
    background: 'transparent', border: `1px dashed ${colors.border}`, color: 'inherit',
    padding: '0 6px', borderRadius: 3, cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 600,
    minWidth: 24,
  };
  const numInputStyle = {
    width: 44, padding: '1px 3px', textAlign: 'right',
    border: `1px solid ${colors.border}`, borderRadius: 3,
    fontFamily: fontJP, fontSize: 11,
  };

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
          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Clock size={11} style={{ marginRight: 2 }} />
            {editingCompletedHours ? (
              <input type="number" min="0" step="0.5" value={completedHoursInput}
                onChange={(e) => setCompletedHoursInput(e.target.value)}
                onBlur={commitCompletedHours}
                onKeyDown={(e) => { if (e.key === 'Enter') commitCompletedHours(); if (e.key === 'Escape') { setEditingCompletedHours(false); setCompletedHoursInput(String(task.completedHours || 0)); } }}
                autoFocus style={numInputStyle} />
            ) : (
              <button type="button" onClick={() => setEditingCompletedHours(true)} style={numStyle} title="クリックで完了済み時間を編集">
                {completed}
              </button>
            )}
            /
            {editingTotalHours ? (
              <input type="number" min="0" step="0.5" value={totalHoursInput}
                onChange={(e) => setTotalHoursInput(e.target.value)}
                onBlur={commitTotalHours}
                onKeyDown={(e) => { if (e.key === 'Enter') commitTotalHours(); if (e.key === 'Escape') { setEditingTotalHours(false); setTotalHoursInput(String(task.hours)); } }}
                autoFocus style={numInputStyle} />
            ) : (
              <button type="button" onClick={() => setEditingTotalHours(true)} style={numStyle} title="クリックで制作時間を編集">
                {task.hours}
              </button>
            )}
            h
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <input type="number" step="0.5" value={customHours}
          onChange={(e) => setCustomHours(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commitCustomHours(); }}
          placeholder="h"
          title="進めた時間（h）を入力してEnter / 追加"
          style={{
            width: 44, padding: '4px 5px', textAlign: 'right',
            border: `1px solid ${colors.border}`, borderRadius: 3,
            fontFamily: fontJP, fontSize: 11,
          }} />
        <button onClick={commitCustomHours} style={progressBtnStyle(colors, fontJP)} title="入力した時間を完了済みに加算">追加</button>
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
  // 今日を基準に「過去30営業日 + 今日 + 未来42営業日」の範囲を表示。
  // 今日を初期スクロールの左端に置き、左スクロールで過去、右スクロールで未来を見られるようにする。
  const today = startOfDay(new Date());
  const pastDates = [];
  {
    let cursor = new Date(today);
    let count = 0;
    while (count < 30) {
      cursor = addDays(cursor, -1);
      if (!isNonWorkingDay(cursor)) { pastDates.unshift(new Date(cursor)); count++; }
    }
  }
  const futureDates = [];
  {
    let cursor = new Date(today);
    let count = 0;
    while (count < 42 && futureDates.length < 70) {
      if (!isNonWorkingDay(cursor)) { futureDates.push(new Date(cursor)); count++; }
      cursor = addDays(cursor, 1);
    }
  }
  const allDates = [...pastDates, ...futureDates];
  const todayIndex = pastDates.length; // futureDates の先頭＝今日

  const dailySlots = getDailySlots(settings);
  const morningSlot = dailySlots[0];
  const afternoonSlot = dailySlots[1];
  const morningHours = (morningSlot.end - morningSlot.start) / 60;
  const afternoonHours = (afternoonSlot.end - afternoonSlot.start) / 60;
  const hoursPerDay = getHoursPerDay(settings);

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
  // 各セル内のタスクは開始時刻順に
  for (const a in matrix) {
    for (const k in matrix[a]) {
      matrix[a][k].sort((x, y) => x.slot.startMin - y.slot.startMin);
    }
  }

  const dayCellWidth = 240;
  const rowHeight = 100;
  const labelWidth = 110;

  // 初期スクロール位置を「今日が左端」に設定（コンテナ幅・dayCellWidth に応じて scrollLeft をセット）
  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // ラベル列分を考慮しつつ、今日のセル左端に合わせる
    el.scrollLeft = todayIndex * dayCellWidth;
    // 依存を todayIndex のみにし、リサイズ・データ更新では再スクロールしない（ユーザーのスクロール位置を保つ）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <div ref={scrollRef} className="compact-scroll" style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'auto' }}>
        <div style={{ minWidth: labelWidth + allDates.length * dayCellWidth }}>
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
                <div key={i} style={{
                  width: dayCellWidth, padding: '6px 4px 2px', textAlign: 'center', flexShrink: 0,
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
              <div style={{
                width: labelWidth, padding: '12px', fontSize: 13, fontWeight: 500,
                flexShrink: 0, borderRight: `1px solid ${colors.border}`,
                display: 'flex', alignItems: 'center', background: '#fbf9f4',
                boxSizing: 'border-box',
                position: 'sticky', left: 0, zIndex: 2,
                boxShadow: '2px 0 4px rgba(0,0,0,0.04)',
              }}>
                {assignee}
              </div>
              {allDates.map((d, di) => {
                const key = fmtYMD(d);
                const slots = (matrix[assignee] && matrix[assignee][key]) || [];
                const morningItems = slots.filter(({ slot }) => slot.startMin < morningSlot.end);
                const afternoonItems = slots.filter(({ slot }) => slot.startMin >= afternoonSlot.start);
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
                    width: dayCellWidth, height: rowHeight, flexShrink: 0,
                    borderRight: di < allDates.length - 1 ? `1px solid ${colors.border}` : 'none',
                    background: isToday ? '#fff8f8' : '#fff',
                    position: 'relative',
                    boxSizing: 'border-box',
                    display: 'flex', flexDirection: 'row',
                  }}>
                    <div style={{ width: '50%', display: 'flex', flexDirection: 'column', borderRight: `1px dashed ${colors.border}`, boxSizing: 'border-box' }}>
                      {morningItems.map(({ task, slot }, si) => (
                        <TaskBlock key={si} task={task} slot={slot}
                          heightPct={(slot.hours / morningHours) * 100}
                          projectColor={getProjectColor(task.projectName)} />
                      ))}
                    </div>
                    <div style={{ width: '50%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
                      background: isWorkSat ? 'repeating-linear-gradient(45deg, #f5f0e3, #f5f0e3 4px, #fbf9f4 4px, #fbf9f4 8px)' : 'transparent',
                    }}>
                      {!isWorkSat && afternoonItems.map(({ task, slot }, si) => (
                        <TaskBlock key={si} task={task} slot={slot}
                          heightPct={(slot.hours / afternoonHours) * 100}
                          projectColor={getProjectColor(task.projectName)} />
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

      <div style={{ marginTop: 20, fontSize: 11, color: colors.textMute }}>
        セル内の色は案件ごと ・ 右上の #番号 が優先順位 ・ グレーの斜線は休日・不在 ・ マウスオーバーで詳細表示
      </div>
    </div>
  );
}

function TaskBlock({ task, slot, heightPct, projectColor }) {
  const remaining = Math.max(0, task.hours - (task.completedHours || 0));
  const stepLabel = task.stepName ? ` - ${task.stepName}` : '';
  const internal = task.projectNameInternal || '';
  const external = task.projectName || '';
  return (
    <div title={`#${task.priority} ${internal || external}${internal && external ? ` (${external})` : ''} / ${task.viewpointName}${stepLabel}\n${minToTime(slot.startMin)}〜${minToTime(slot.endMin)} (${slot.hours}h)\n残り ${remaining}h / 全${task.hours}h${task.manualStart ? '\n※開始時間指定あり' : ''}`}
      style={{
        height: `${heightPct}%`, minHeight: 0, background: projectColor, color: '#fff',
        padding: '3px 5px', fontSize: 10, lineHeight: 1.25, overflow: 'hidden',
        position: 'relative',
      }}>
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
function AssigneeView({ scheduled, selectedAssignee, setSelectedAssignee, projectOrder, saveProjectOrder, handleEdit, handleEditProject, handleEditViewpoint, handleAddViewpointToProject, handleDeleteViewpoint, handleDelete, toggleStatus, moveUp, moveDown, changePriority, addProgress, setTaskHours, setTaskCompletedHours, completeProject, completeViewpoint, handleAddStepToViewpoint, reassignViewpoint, assigneeList, colors, fontJP, fontDisplay }) {
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
              projectOrder={projectOrder} saveProjectOrder={saveProjectOrder}
              handleEdit={handleEdit} handleEditProject={handleEditProject} handleEditViewpoint={handleEditViewpoint}
              handleAddViewpointToProject={handleAddViewpointToProject}
              handleDeleteViewpoint={handleDeleteViewpoint}
              handleDelete={handleDelete} toggleStatus={toggleStatus}
              moveUp={moveUp} moveDown={moveDown} changePriority={changePriority} addProgress={addProgress} setTaskHours={setTaskHours} setTaskCompletedHours={setTaskCompletedHours} completeProject={completeProject} completeViewpoint={completeViewpoint}
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
function MessageView({ scheduled, settings, colors, fontJP, fontDisplay }) {
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
    } catch (e) { alert('コピーに失敗しました: ' + e); }
  };

  // ===== 会社別 業務連絡文（挨拶文形式） =====
  const allGroups = useMemo(() => groupByViewpoint(scheduled.active), [scheduled.active]);
  // 会社一覧（スケジュール順）
  const companies = useMemo(() => {
    const seq = companySequence(scheduled.active);
    const set = [...new Set(scheduled.active.map(t => t.companyName || ''))];
    return set.sort((a, b) => {
      const sa = seq.has(a) ? seq.get(a) : Infinity, sb = seq.has(b) ? seq.get(b) : Infinity;
      return sa - sb;
    });
  }, [scheduled.active]);
  const [msgCompany, setMsgCompany] = useState(null);
  const curCompany = (msgCompany !== null && companies.includes(msgCompany)) ? msgCompany : (companies[0] ?? '');

  const fmtDateDow = (d) => `${fmtMD(d)}(${dayName(d)})`;
  const buildCompanyMessage = (company) => {
    // この会社の案件を、スケジュール順（scheduled.active の並び）で
    const projectsInOrder = [];
    const seen = new Set();
    for (const t of scheduled.active) {
      if ((t.companyName || '') !== company) continue;
      const p = t.projectName || '(案件名未設定)';
      if (!seen.has(p)) { seen.add(p); projectsInOrder.push(p); }
    }
    const lines = [
      'お世話になっております。',
      '本日の業務を開始いたします。',
      '各案件の進捗および作業予定は以下の通りです。',
      '',
      '■作業予定',
    ];
    let i = 0;
    for (const p of projectsInOrder) {
      i++;
      const vpGroups = allGroups.filter(g => (g.companyName || '') === company && g.projectName === p);
      const total = vpGroups.reduce((s, g) => s + g.totalHours, 0);
      const done = vpGroups.reduce((s, g) => s + g.completedHours, 0);
      const pct = total > 0 ? Math.round(done / total * 100) : 0;
      const status = pct >= 100 ? '（完了）' : (pct > 0 ? '（制作中）' : '');
      const contact = (vpGroups.find(g => g.customerContact) || {}).customerContact || '';
      // 制作枚数：視点（依頼項目）ごとのステップ数を「視点名N枚」で
      const sheets = vpGroups
        .filter(g => g.viewpointName)
        .map(g => `${g.viewpointName}${g.tasks.length}枚`)
        .join('+');
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
    lines.push('以上になります、本日もよろしくお願いいたします');
    return lines.join('\n');
  };
  const companyText = useMemo(() => curCompany !== undefined ? buildCompanyMessage(curCompany) : '', [curCompany, allGroups, scheduled.active]);
  const [companyCopied, setCompanyCopied] = useState(false);
  const copyCompanyText = async () => {
    try {
      await navigator.clipboard.writeText(companyText);
      setCompanyCopied(true);
      setTimeout(() => setCompanyCopied(false), 1500);
    } catch (e) { alert('コピーに失敗しました: ' + e); }
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
            <MessageSquare size={16} /> 会社別 業務連絡文
          </h3>
          <button type="button" onClick={copyCompanyText}
            style={{ padding: '8px 16px', background: companyCopied ? colors.progress : colors.text, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            {companyCopied ? <><Check size={15} /> コピーしました</> : <>この会社の連絡文をコピー</>}
          </button>
        </div>
        {/* 会社の切り替え */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {companies.map(c => (
            <button key={c || '__none__'} type="button" onClick={() => setMsgCompany(c)}
              style={{
                padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12,
                border: `1px solid ${c === curCompany ? colors.text : colors.border}`,
                background: c === curCompany ? colors.text : '#fff',
                color: c === curCompany ? '#fff' : colors.text, fontWeight: c === curCompany ? 600 : 400,
              }}>
              {companyLabel(c)}
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
          ※ 会社を選ぶと、その会社の案件だけの連絡文になります ・ 制作枚数は「視点（依頼項目）ごとのステップ数」で集計しています
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
            ※ 進行中タスクから自動生成。案件識別子は「社内案件名」を優先（無ければ社外案件名）。表示順は登録順。
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
function DoneView({ scheduled, toggleStatus, handleDelete, setActualEnd, colors, fontJP, fontDisplay }) {
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
                  onSetActualEnd={(v) => setActualEnd(task.id, v)}
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

function DoneTaskRow({ task, onRestore, onDelete, onSetActualEnd, isLast, colors, fontJP }) {
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
        <button onClick={onRestore} style={iconBtnStyle(colors)} title="未完了に戻す"><RotateCcw size={14} /></button>
        <button onClick={onDelete} style={iconBtnStyle(colors)} title="完全に削除"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

// ============ マスタ管理ビュー ============
function MasterView({ customerMaster, saveCustomerMaster, employeeMaster, saveEmployeeMaster, colors, fontJP, fontDisplay }) {
  // ローカル下書き（入力中の値）。props が更新されたら同期する
  const [customers, setCustomers] = useState(customerMaster);
  const [employees, setEmployees] = useState(employeeMaster);
  useEffect(() => { setCustomers(customerMaster); }, [customerMaster]);
  useEffect(() => { setEmployees(employeeMaster); }, [employeeMaster]);

  const newId = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // お客様マスタ（会社ごとに担当者をまとめる）
  const commitCustomers = (next) => { setCustomers(next); saveCustomerMaster(next); };
  const addCompany = () => commitCustomers([...customers, { id: newId('cust'), company: '', contacts: [{ id: newId('cc'), name: '' }] }]);
  const removeCompany = (cid) => commitCustomers(customers.filter(c => c.id !== cid));
  const setCompanyName = (cid, val) => setCustomers(cs => cs.map(c => c.id === cid ? { ...c, company: val } : c));
  const addContact = (cid) => commitCustomers(customers.map(c => c.id === cid ? { ...c, contacts: [...(c.contacts || []), { id: newId('cc'), name: '' }] } : c));
  const removeContact = (cid, ctid) => commitCustomers(customers.map(c => c.id === cid ? { ...c, contacts: (c.contacts || []).filter(ct => ct.id !== ctid) } : c));
  const setContactName = (cid, ctid, val) => setCustomers(cs => cs.map(c => c.id === cid ? { ...c, contacts: (c.contacts || []).map(ct => ct.id === ctid ? { ...ct, name: val } : ct) } : c));
  const commitCustomersNow = () => saveCustomerMaster(customers);

  // 従業員マスタ
  const addEmployee = () => { const next = [...employees, { id: newId('emp'), name: '', role: '' }]; setEmployees(next); saveEmployeeMaster(next); };
  const setEmployeeField = (id, field, val) => setEmployees(es => es.map(e => e.id === id ? { ...e, [field]: val } : e));
  const commitEmployees = () => saveEmployeeMaster(employees);
  const removeEmployee = (id) => { const next = employees.filter(e => e.id !== id); setEmployees(next); saveEmployeeMaster(next); };

  const inputStyle = {
    width: '100%', padding: '8px 10px', boxSizing: 'border-box',
    border: `1px solid ${colors.border}`, borderRadius: 4,
    fontFamily: fontJP, fontSize: 13, background: '#fff', color: colors.text, outline: 'none',
  };
  const labelStyle = { fontSize: 11, color: colors.textMute, marginBottom: 4, letterSpacing: '0.05em' };
  const addBtnStyle = {
    background: colors.accentSoft, border: `1px solid ${colors.accent}`,
    padding: '8px 14px', borderRadius: 4, cursor: 'pointer',
    fontFamily: fontJP, fontSize: 12, color: colors.accent, fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 6,
  };
  const delBtnStyle = {
    background: 'transparent', border: `1px solid ${colors.border}`,
    padding: 8, borderRadius: 4, cursor: 'pointer', color: colors.textMute,
    display: 'flex', alignItems: 'center', flexShrink: 0,
  };
  const cardStyle = {
    background: colors.surface, border: `1px solid ${colors.border}`,
    borderRadius: 6, padding: 24, marginBottom: 28,
  };

  return (
    <div style={{ maxWidth: 880 }}>
      {/* お客様マスタ（会社ごとに担当者をぶら下げる） */}
      <section style={cardStyle}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 18, margin: '0 0 4px 0', fontWeight: 500 }}>お客様マスタ</h2>
        <p style={{ fontSize: 12, color: colors.textMute, margin: '0 0 16px 0' }}>
          会社ごとに、お客様担当者を複数登録できます。案件入力時の「会社名」「お客様担当者」の候補に表示されます（会社を選ぶとその会社の担当者が出ます）。
        </p>

        {customers.length === 0 && (
          <div style={{ fontSize: 12, color: colors.textMute, padding: '4px 2px 12px' }}>
            まだ登録がありません。「＋ 会社を追加」から登録してください。
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {customers.map(c => (
            <div key={c.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'hidden' }}>
              {/* 会社名ヘッダー */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#f3efe4', padding: '10px 12px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.textMute, flexShrink: 0 }}>会社</span>
                <input type="text" value={c.company || ''}
                  onChange={(e) => setCompanyName(c.id, e.target.value)}
                  onBlur={commitCustomersNow}
                  placeholder="例: リノべる株式会社"
                  style={{ ...inputStyle, flex: 1, fontWeight: 600 }} />
                <button type="button" onClick={() => removeCompany(c.id)}
                  style={{ ...delBtnStyle, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', fontSize: 11, fontFamily: fontJP }}
                  title="この会社を削除">
                  <Trash2 size={13} /> 会社削除
                </button>
              </div>
              {/* 担当者リスト */}
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(c.contacts || []).length === 0 && (
                  <div style={{ fontSize: 11, color: colors.textMute }}>担当者が未登録です。</div>
                )}
                {(c.contacts || []).map(ct => (
                  <div key={ct.id} style={{ display: 'flex', gap: 10, alignItems: 'center', paddingLeft: 8 }}>
                    <span style={{ fontSize: 11, color: colors.textMute, flexShrink: 0 }}>担当者</span>
                    <input type="text" value={ct.name || ''}
                      onChange={(e) => setContactName(c.id, ct.id, e.target.value)}
                      onBlur={commitCustomersNow}
                      placeholder="例: 山田様" style={{ ...inputStyle, flex: 1 }} />
                    <button type="button" onClick={() => removeContact(c.id, ct.id)} style={delBtnStyle} title="この担当者を削除">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addContact(c.id)}
                  style={{ alignSelf: 'flex-start', background: '#fff', border: `1px dashed ${colors.border}`, padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 11, color: colors.textMute, display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
                  <Plus size={12} /> 担当者を追加
                </button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addCompany} style={{ ...addBtnStyle, marginTop: 16 }}>
          <Plus size={14} /> 会社を追加
        </button>
      </section>

      {/* 従業員マスタ */}
      <section style={cardStyle}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 18, margin: '0 0 4px 0', fontWeight: 500 }}>従業員マスタ</h2>
        <p style={{ fontSize: 12, color: colors.textMute, margin: '0 0 16px 0' }}>
          制作担当者（従業員）を登録します。案件入力時の「担当者」の候補に表示されます。
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '0 2px' }}>
            <div style={{ flex: '1 1 0', ...labelStyle }}>氏名</div>
            <div style={{ flex: '1 1 0', ...labelStyle }}>役割・備考</div>
            <div style={{ width: 34, flexShrink: 0 }} />
          </div>
          {employees.length === 0 && (
            <div style={{ fontSize: 12, color: colors.textMute, padding: '8px 2px' }}>
              まだ登録がありません。「＋ 従業員を追加」から登録してください。
            </div>
          )}
          {employees.map(e => (
            <div key={e.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="text" value={e.name || ''}
                onChange={(ev) => setEmployeeField(e.id, 'name', ev.target.value)}
                onBlur={commitEmployees}
                placeholder="例: 田中" style={{ ...inputStyle, flex: '1 1 0' }} />
              <input type="text" value={e.role || ''}
                onChange={(ev) => setEmployeeField(e.id, 'role', ev.target.value)}
                onBlur={commitEmployees}
                placeholder="例: パース担当 / 主任" style={{ ...inputStyle, flex: '1 1 0' }} />
              <button type="button" onClick={() => removeEmployee(e.id)} style={delBtnStyle} title="この行を削除">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addEmployee} style={{ ...addBtnStyle, marginTop: 14 }}>
          <Plus size={14} /> 従業員を追加
        </button>
      </section>
    </div>
  );
}

// ============ 終了時間の入力フィールド（日付＋時刻プルダウン） ============
function EndTimeFields({ value, onChange, colors, fontJP }) {
  const d = value ? value.split('T')[0] : '';
  const t = value ? (value.split('T')[1] || '') : '';
  const set = (nd, nt) => {
    if (!nd && !nt) { onChange(''); return; }
    const dd = nd || fmtYMD(new Date());
    const tt = nt || '17:00';
    onChange(`${dd}T${tt}`);
  };
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <input type="date" value={d} onChange={(e) => set(e.target.value, t)}
        style={{ padding: '6px 8px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 13 }} />
      <TimeSelect value={t || '17:00'} onChange={(val) => set(d, val)} colors={colors} fontJP={fontJP} />
    </span>
  );
}

// ============ 完了ダイアログ（終了時間を入力して完了） ============
function CompleteDialog({ target, onConfirm, onCancel, colors, fontJP, fontDisplay }) {
  const [end, setEnd] = useState(target.defaultEnd || '');
  return (
    <div onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
      }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8,
          padding: 24, width: '100%', maxWidth: 420, fontFamily: fontJP,
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 17, margin: '0 0 6px 0', fontWeight: 600 }}>
          {target.label} を完了
        </h3>
        <p style={{ fontSize: 12, color: colors.textMute, margin: '0 0 16px 0', lineHeight: 1.6 }}>
          {target.ids.length}件のタスクを完了にします。<br />
          終了時間（実際に終わった時刻）を入力してください。予定どおりならそのまま、遅れた場合は実際の時刻に直してください。
        </p>
        <label style={{ display: 'block', fontSize: 12, color: colors.textMute, marginBottom: 6 }}>終了時間</label>
        <EndTimeFields value={end} onChange={setEnd} colors={colors} fontJP={fontJP} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
          <button type="button" onClick={onCancel}
            style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, color: colors.textMute }}>
            キャンセル
          </button>
          <button type="button" onClick={() => onConfirm(end)}
            style={{ padding: '8px 18px', background: colors.progress, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={15} /> 完了する
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ コンボボックス（プルダウン＋入力で候補を絞り込み・自由入力も可） ============
function Combobox({ value, onChange, options, placeholder, inputStyle, colors, fontJP, title, wrapperStyle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const opts = options || [];
  const v = (value || '').toLowerCase();
  // 入力中（候補に完全一致しない）は部分一致で絞り込み、空 or 選択済みなら全件表示
  const filtered = (value && !opts.some(o => o === value))
    ? opts.filter(o => (o || '').toLowerCase().includes(v))
    : opts;
  const select = (val) => { onChange(val); setOpen(false); };
  return (
    <div ref={ref} style={{ position: 'relative', ...(wrapperStyle || {}) }}>
      <input type="text" value={value || ''} title={title}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={{ ...inputStyle, paddingRight: 30 }} />
      <button type="button" tabIndex={-1}
        onMouseDown={(e) => { e.preventDefault(); setOpen(o => !o); }}
        title="一覧から選ぶ"
        style={{ position: 'absolute', right: 1, top: 1, bottom: 1, width: 28, background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMute, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ChevronDown size={15} />
      </button>
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4, marginTop: 2, maxHeight: 220, overflowY: 'auto', boxShadow: '0 6px 20px rgba(0,0,0,0.14)' }}>
          {filtered.map(o => (
            <div key={o} onMouseDown={(e) => { e.preventDefault(); select(o); }}
              style={{ padding: '8px 12px', fontSize: 13, fontFamily: fontJP, cursor: 'pointer', color: colors.text, background: o === value ? colors.accentSoft : '#fff' }}
              onMouseEnter={(e) => { if (o !== value) e.currentTarget.style.background = '#f3efe4'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = o === value ? colors.accentSoft : '#fff'; }}>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ 休日・不在の登録 ============
function AbsenceManager({ absences, assigneeList, onAdd, onRemove, colors, fontJP }) {
  const todayStr = fmtYMD(new Date());
  const [a, setA] = useState({ assignee: '', startDate: todayStr, endDate: todayStr, allDay: true, startTime: '13:00', endTime: '17:00', label: '' });
  const set = (k, v) => setA(p => ({ ...p, [k]: v }));
  const submit = () => {
    if (!a.assignee) { alert('担当者を選択してください'); return; }
    if (!a.startDate || !a.endDate) { alert('開始日・終了日を入力してください'); return; }
    if (a.endDate < a.startDate) { alert('終了日は開始日以降にしてください'); return; }
    if (!a.allDay && a.startTime >= a.endTime) { alert('不在の時間帯が正しくありません'); return; }
    onAdd({
      assignee: a.assignee, startDate: a.startDate, endDate: a.endDate,
      allDay: !!a.allDay,
      startTime: a.allDay ? '' : a.startTime,
      endTime: a.allDay ? '' : a.endTime,
      label: (a.label || '').trim(),
    });
    setA(p => ({ ...p, label: '' }));
  };
  const inputStyle = { padding: '5px 8px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 13, background: '#fff', color: colors.text };
  const sorted = [...absences].sort((x, y) => (y.startDate || '').localeCompare(x.startDate || ''));
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 10 }}>休日・不在の登録</div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <select value={a.assignee} onChange={(e) => set('assignee', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">担当者を選択</option>
          {(assigneeList || []).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input type="date" value={a.startDate} onChange={(e) => set('startDate', e.target.value)} style={inputStyle} />
        <span style={{ fontSize: 12, color: colors.textMute }}>〜</span>
        <input type="date" value={a.endDate} onChange={(e) => set('endDate', e.target.value)} style={inputStyle} />
        <label style={{ fontSize: 12, color: colors.text, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={a.allDay} onChange={(e) => set('allDay', e.target.checked)} /> 終日
        </label>
        {!a.allDay && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: colors.textMute }}>
            不在
            <TimeSelect value={a.startTime} onChange={(v) => set('startTime', v)} colors={colors} fontJP={fontJP} />
            〜
            <TimeSelect value={a.endTime} onChange={(v) => set('endTime', v)} colors={colors} fontJP={fontJP} />
          </span>
        )}
        <input type="text" value={a.label} onChange={(e) => set('label', e.target.value)} placeholder="メモ（例: 有給・午後休）" style={{ ...inputStyle, flex: '1 1 140px', minWidth: 120 }} />
        <button type="button" onClick={submit}
          style={{ padding: '6px 14px', background: colors.accentSoft, border: `1px solid ${colors.accent}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.accent, fontWeight: 600 }}>
          追加
        </button>
      </div>
      {sorted.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map(ab => (
            <div key={ab.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4, padding: '6px 10px', fontSize: 12, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: colors.text }}>{ab.assignee}</span>
              <span style={{ color: colors.textMute }}>
                {ab.startDate}{ab.endDate !== ab.startDate ? ` 〜 ${ab.endDate}` : ''}
              </span>
              <span style={{ background: '#eceae3', borderRadius: 10, padding: '1px 8px', color: colors.text }}>
                {ab.allDay ? '終日休み' : `不在 ${ab.startTime}〜${ab.endTime}`}
              </span>
              {ab.label && <span style={{ color: colors.textMute }}>{ab.label}</span>}
              <button type="button" onClick={() => onRemove(ab.id)} title="削除"
                style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '3px 6px', cursor: 'pointer', color: colors.textMute, display: 'flex', alignItems: 'center' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ 過去案件から引用するモーダル ============
function QuoteModal({ projects, onSelect, onClose, colors, fontJP, fontDisplay }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = q
    ? projects.filter(p => [p.projectName, p.projectNameInternal, p.companyName, p.customerContact].some(v => (v || '').toLowerCase().includes(q)))
    : projects;
  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, width: '100%', maxWidth: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column', fontFamily: fontJP, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 17, margin: 0, fontWeight: 600 }}>過去案件から引用</h3>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMute, display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '14px 22px 8px' }}>
          <p style={{ fontSize: 11, color: colors.textMute, margin: '0 0 10px 0' }}>
            完了済み案件の「案件情報（社外/社内案件名・会社名・お客様担当者・担当者）」だけを引用します。視点・制作時間・優先順位・開始日時は引用しません。
          </p>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: colors.textMute, display: 'flex', pointerEvents: 'none' }}><Search size={15} /></span>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus
              placeholder="案件名・会社名・お客様担当者で検索"
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 32px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 13, outline: 'none' }} />
          </div>
        </div>
        <div style={{ overflowY: 'auto', padding: '6px 14px 16px', flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: colors.textMute, fontSize: 13, padding: 32 }}>
              {projects.length === 0 ? '完了済みの案件がまだありません。' : '一致する案件がありません。'}
            </div>
          ) : filtered.map(p => (
            <button key={p.projectName} type="button" onClick={() => onSelect(p)}
              style={{
                width: '100%', textAlign: 'left', background: '#fff', border: `1px solid ${colors.border}`,
                borderLeft: `4px solid ${getProjectColor(p.projectName)}`, borderRadius: 5, padding: '10px 12px',
                marginBottom: 8, cursor: 'pointer', fontFamily: fontJP, display: 'flex', flexDirection: 'column', gap: 4,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fbf9f4'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{p.projectNameInternal || p.projectName}</span>
                {p.projectNameInternal && <span style={{ fontSize: 11, color: colors.textMute }}>{p.projectName}</span>}
                {p.companyName && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', background: getProjectColor(p.companyName), borderRadius: 10, padding: '1px 8px' }}>{p.companyName}</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: colors.textMute, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {p.customerContact && <span>お客様: {p.customerContact}</span>}
                {p.lastAssignee && <span>担当: {p.lastAssignee}</span>}
                <span>{p.viewpointCount}視点</span>
                {p.lastCompletedAt > 0 && <span>最終完了: {fmtMD(new Date(p.lastCompletedAt))}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
