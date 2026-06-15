import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { Plus, Trash2, Edit2, Calendar as CalIcon, MessageSquare, Settings as SettingsIcon, Check, X, Clock, Folder, User, ChevronUp, ChevronDown, Users, CheckCircle2, RotateCcw, TrendingUp, ArrowRight, GripVertical, Search, AlertTriangle, StickyNote } from 'lucide-react';
import { storage, tasksStore, signIn, signOutUser, subscribeAuth } from './firebase.js';

// ============ 定数・ユーティリティ ============
const PRIORITY_COLORS = ['#c1272d', '#d4a017', '#7a8471', '#5d4037', '#37474f'];
function priorityColor(p) {
  if (!p || p < 1) return '#9e9e9e';
  return PRIORITY_COLORS[Math.min(p - 1, PRIORITY_COLORS.length - 1)];
}

// 隣り合うインデックスで色相が離れるように並べた20色（白文字が読める濃色のみ）
const PROJECT_PALETTE = [
  '#3a5a40', '#1d3557', '#bc6c25', '#6a4c93',
  '#c62828', '#00838f', '#5d4037', '#ad1457',
  '#33691e', '#0d47a1', '#e65100', '#4527a0',
  '#00695c', '#8d6e63', '#264653', '#827717',
  '#37474f', '#b71c1c', '#283593', '#4e342e',
];
// 案件名 → 色の割り当て表。タスク一覧から登録順（createdAt）に重複なく振る。
// 案件数がパレットを超えた場合のみ色が一巡して重複する。
let PROJECT_COLOR_MAP = new Map();
function assignProjectColors(tasks) {
  const first = new Map(); // 案件名 → 最初に登録された時刻
  for (const t of (tasks || [])) {
    const p = t.projectName || '';
    if (!p) continue;
    const ca = t.createdAt || 0;
    if (!first.has(p) || ca < first.get(p)) first.set(p, ca);
  }
  const names = [...first.keys()].sort((a, b) => (first.get(a) - first.get(b)) || a.localeCompare(b, 'ja'));
  PROJECT_COLOR_MAP = new Map(names.map((n, i) => [n, PROJECT_PALETTE[i % PROJECT_PALETTE.length]]));
}
function getProjectColor(name) {
  if (!name) return '#888';
  const assigned = PROJECT_COLOR_MAP.get(name);
  if (assigned) return assigned;
  // 割り当て表に無い名前（会社名・担当者名のアバター等）は従来どおりハッシュで決める
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (name.charCodeAt(i) + ((hash << 5) - hash)) | 0;
  return PROJECT_PALETTE[Math.abs(hash) % PROJECT_PALETTE.length];
}
// 色を白と混ぜてパステル調にする（ratio = 白の割合 0..1）。カレンダーのブロック表示用
function pastelize(hex, ratio) {
  const h = (hex || '#888888').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const mix = (c) => Math.round(c + (255 - c) * ratio);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

const fmtMD = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
const fmtYMD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtYMDJP = (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
const dayName = (d) => ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;
// 全体共通の祝日（ベトナム等）。settings.holidays（YYYY-MM-DD の配列）から同期する。
// isNonWorkingDay は settings を受け取らない箇所が多いため、モジュール変数で保持する
// （案件色の assignProjectColors と同じパターン）。
let HOLIDAY_SET = new Set();
function syncHolidays(settings) {
  const list = (settings && settings.holidays) || [];
  HOLIDAY_SET = new Set(list.map(h => h && h.date).filter(Boolean));
}
// 第2・第4土曜は午前のみ営業
function isWorkingSaturday(d) {
  if (d.getDay() !== 6) return false;
  const week = Math.ceil(d.getDate() / 7);
  return week === 2 || week === 4;
}
function isNonWorkingDay(d) {
  if (HOLIDAY_SET.has(fmtYMD(d))) return true; // 祝日（全体共通の休み）
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
  if (!preset) return { viewpointName: '', assignee: '', manualStart: '', manualEnd: '', deadline: '', steps: [{ name: '', hours: '', completedHours: '' }] };
  return {
    viewpointName: preset.name,
    assignee: '',
    manualStart: '', // 視点ごとの開始時間指定（最初の未完了ステップに適用）
    manualEnd: '',   // 視点ごとの終了時間指定（最後の未完了ステップに適用・作業終了予定）
    deadline: '',    // 視点ごとの納期（お客様への提出日）
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
  // 追加フィールド（代表者名・住所・電話・URL、担当者の支店名・電話・メール等）は spread で維持する
  return arr.map(e => ({
    ...(e || {}),
    id: (e && e.id) || genId('cust'),
    company: (e && e.company) || '',
    contacts: Array.isArray(e && e.contacts)
      ? e.contacts.map(c => typeof c === 'string'
        ? { id: genId('cc'), name: c }
        : { ...(c || {}), id: (c && c.id) || genId('cc'), name: (c && c.name) || '' })
      : [],
  }));
}

// ===== ベトナムの祝日（候補データ） =====
// 旧暦ベースの祝日（推定・要確認）。政府が毎年、振替日を含めて公式日程を発表するため目安。
// tet=テト元日, tetDays=テト休みの目安日数, hung=フンヴオン王の命日（旧暦3月10日）
const VN_LUNAR_HOLIDAYS = {
  2025: { tet: '2025-01-29', tetDays: 5, hung: '2025-04-07' },
  2026: { tet: '2026-02-17', tetDays: 5, hung: '2026-04-26' },
  2027: { tet: '2027-02-06', tetDays: 5, hung: '2027-04-16' },
  2028: { tet: '2028-01-26', tetDays: 5, hung: '2028-04-04' },
  2029: { tet: '2029-02-13', tetDays: 5, hung: '2029-04-23' },
  2030: { tet: '2030-02-03', tetDays: 5, hung: '2030-04-12' },
};
// 指定年の祝日候補。各候補 { date:'YYYY-MM-DD', days, label, estimated }
// estimated=true は旧暦ベースで要確認（日付・日数は政府発表に合わせて編集する）
function vietnamHolidayCandidates(year) {
  const out = [
    { date: `${year}-01-01`, days: 1, label: '元日 Tết Dương lịch', estimated: false },
    { date: `${year}-04-30`, days: 1, label: '南部解放記念日 Giải phóng miền Nam', estimated: false },
    { date: `${year}-05-01`, days: 1, label: 'メーデー Quốc tế Lao động', estimated: false },
    { date: `${year}-09-02`, days: 2, label: '建国記念日 Quốc khánh', estimated: false },
  ];
  const lunar = VN_LUNAR_HOLIDAYS[year];
  if (lunar) {
    out.push({ date: lunar.tet, days: lunar.tetDays, label: 'テト（旧正月）Tết Nguyên đán', estimated: true });
    out.push({ date: lunar.hung, days: 1, label: 'フンヴオン王の命日 Giỗ Tổ Hùng Vương', estimated: true });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
// 'YYYY-MM-DD' から days 日ぶんの連続日付の配列を返す
function expandHolidayDates(startDate, days) {
  const out = [];
  const d = new Date(startDate + 'T00:00:00');
  if (isNaN(d.getTime())) return out;
  for (let i = 0; i < Math.max(1, days || 1); i++) { out.push(fmtYMD(d)); d.setDate(d.getDate() + 1); }
  return out;
}

const DEFAULT_SETTINGS = {
  morningStart: '08:00',
  morningEnd: '12:00',
  afternoonStart: '13:00',
  afternoonEnd: '17:00',
  startDate: fmtYMD(new Date()),
  startTime: '08:00',
  absences: [],
  // 全体共通の祝日（ベトナム等）。[{ id, date:'YYYY-MM-DD', label }]。土日と同じく非稼働日として扱う
  holidays: [],
  // 残業（担当者・期間・時間帯の稼働枠追加）。[{ id, assignee, startDate, endDate, startTime, endTime, label }]
  overtimes: [],
  // 会社グループの表示順（暫定の固定順）。表示順設定ページで編集可
  companyOrder: ['CG工房', 'リノべる株式会社', 'オフィスコム', '田中建設', 'SUMUS', '玉善', 'オフショア（その他）'],
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

  // 確認待ち（視点完了後の確認フェーズ）の状態
  const reviewState = task.reviewState || null;            // 'waiting' = 確認待ち
  const reviewAt = task.reviewAt || null;                  // 確認待ちに入れた時刻（ms）
  const reviewUpdatedAt = task.reviewUpdatedAt || null;    // 最終更新（修正メモ記入など）。3日でグレー・7日で自動完了の基準
  const reviewNote = task.reviewNote || '';                // 追加修正メモ

  const { taskName, ...rest } = task;
  return { ...rest, viewpointName, stepName, stepOrder, manualStart, priority, completedHours, projectNameInternal, companyName, customerContact, actualEnd, reviewState, reviewAt, reviewUpdatedAt, reviewNote };
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

// 納期（"YYYY-MM-DD"）を比較可能な数値キーに変換する。未設定・不正は最後（Infinity）。
function deadlineKey(dl) {
  if (!dl) return Infinity;
  const n = parseInt(String(dl).replace(/-/g, ''), 10);
  return isNaN(n) ? Infinity : n;
}
// タスクの実効納期（個別納期＞全体納期）の数値キー。
function effectiveDeadlineKey(t) {
  return deadlineKey(t.deadline || t.projectDeadline);
}
// 優先順位は廃止。新規案件の既定の並び順は「同じ会社の中で納期（実効）の早い順」。
// 同じ会社の進行中タスクのうち、実効納期がこの案件以前のものの件数＋0.5 を仮の priority として返す。
// （normalizePriorities が整数へ振り直す。手動ドラッグ／↑↓で上書き可能）
function deadlineInsertPriority(activeSameCompanyTasks, formDeadlineKey) {
  let before = 0;
  for (const t of activeSameCompanyTasks) {
    if (effectiveDeadlineKey(t) <= formDeadlineKey) before++;
  }
  return before + 0.5;
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

// 進行中タスク一覧の「会社グループの表示順」用ランク。
// companyOrder（settings 保存の会社名配列）に従い、未登録は名前順でオフショアの手前、未分類は最後。
function companyDisplayRank(name, companyOrder) {
  const c = (name || '').trim();
  if (c === '') return { tier: 4, idx: 0 };                  // 未分類 → 最後
  if (c === 'オフショア（その他）') return { tier: 3, idx: 0 }; // 登録会社群の最後
  const order = (companyOrder || []).map(x => (x || '').trim());
  const idx = order.indexOf(c);
  if (idx >= 0) return { tier: 1, idx };                     // companyOrder の順
  return { tier: 2, idx: 0 };                                // 未登録 → 名前順
}
function compareCompanyDisplay(a, b, companyOrder) {
  const ra = companyDisplayRank(a, companyOrder), rb = companyDisplayRank(b, companyOrder);
  if (ra.tier !== rb.tier) return ra.tier - rb.tier;
  if (ra.tier === 1) return ra.idx - rb.idx;
  return (a || '').localeCompare(b || '', 'ja');
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

// 担当者が指定時刻に休み（対応不可）かどうか。終日休み、または現在時刻が不在時間帯に入っている。
function isOnLeaveAt(assignee, when, absences) {
  const abs = dayAbsence(assignee, when, absences);
  if (abs.allDay) return true;
  const min = when.getHours() * 60 + when.getMinutes();
  return abs.intervals.some(([s, e]) => min >= s && min < e);
}

// その担当者・その日の残業時間帯。[[s,e],...]（分）
function dayOvertimeIntervals(assignee, date, overtimes) {
  const ymd = fmtYMD(date);
  const out = [];
  for (const o of (overtimes || [])) {
    if (!o || o.assignee !== assignee) continue;
    if (!o.startDate || !o.endDate) continue;
    if (ymd < o.startDate || ymd > o.endDate) continue;
    if (o.startTime && o.endTime) {
      const s = timeToMin(o.startTime), e = timeToMin(o.endTime);
      if (e > s) out.push([s, e]);
    }
  }
  return out;
}

// その担当者・その日の稼働枠（通常の営業スロット＋残業枠を重複なくマージ）
function dayWorkSlots(assignee, date, settings) {
  const base = getDaySlots(date, settings).map(s => [s.start, s.end]);
  const ot = dayOvertimeIntervals(assignee, date, settings.overtimes || []);
  const all = [...base, ...ot].sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [s, e] of all) {
    if (e <= s) continue;
    if (merged.length > 0 && s <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
    } else merged.push([s, e]);
  }
  return merged;
}

// その担当者・その日の「空いている営業時間」区間（土日・不在・予約済みを除外、残業枠を含む）
function dayFreeIntervals(assignee, date, settings, busyMap, absences) {
  if (isNonWorkingDay(date)) return [];
  const abs = dayAbsence(assignee, date, absences);
  if (abs.allDay) return [];
  const ymd = fmtYMD(date);
  const busy = (busyMap[assignee] && busyMap[assignee].get(ymd)) || [];
  const blocked = [...busy, ...abs.intervals];
  const free = [];
  for (const [s, e] of dayWorkSlots(assignee, date, settings)) {
    for (const iv of subtractBusy(s, e, blocked)) free.push(iv);
  }
  return free;
}

function scheduleTasks(tasks, settings, projectOrder, now) {
  const dailySlots = getDailySlots(settings);
  const configuredStart = startOfDay(settings.startDate ? new Date(settings.startDate + 'T00:00:00') : new Date());
  // 過去には予定を置かない：起点は「設定された開始日」と「本日」の遅い方にする
  const today = startOfDay(new Date());
  const startDate = configuredStart.getTime() < today.getTime() ? today : configuredStart;
  const startMinOfDay = settings.startTime ? timeToMin(settings.startTime) : dailySlots[0].start;
  const absences = settings.absences || [];

  const active = tasks.filter(t => t.status !== 'done');
  const done = tasks.filter(t => t.status === 'done');

  // 作業順 ＝ 案件の並び順（既定は会社ごと・手動ドラッグで会社を跨いで変更可）→ 案件内は優先順位
  // → ホワイト工程を全視点ぶん先に（視点名に関わらずホワイト優先）→ 登録順
  // 例: IN1(白/カラー)+IN2(白/カラー) → IN1白 → IN2白 → IN1カラー → IN2カラー
  const projOrder = computeProjectOrder(active, projectOrder);
  const projIdx = new Map(projOrder.map((n, i) => [n, i]));
  const projOf = (t) => projIdx.has(t.projectName || '') ? projIdx.get(t.projectName || '') : Infinity;
  const phaseOf = (t) => ((t.stepName || '').includes('ホワイト') ? 0 : 1);
  const sorted = [...active].sort((a, b) => {
    const pa = projOf(a), pb = projOf(b);
    if (pa !== pb) return pa - pb;
    return (a.priority - b.priority) || (phaseOf(a) - phaseOf(b)) || (a.createdAt - b.createdAt);
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
  // 担当者ごとの「直前にスケジュールしたタスクの終了時刻」。
  // 開始指定が無いタスクは前のタスクの終了予定に続けて並べる（手前の空き時間への穴埋めはしない）。
  // 終了予定の指定（manualEnd）もこの下限に反映される
  const lastEndByAssignee = {};

  // スケジュール用の所要時間（h）＝残作業（制作時間−完了時間）。
  // 経過時間では終了予定を膨張させない（未記録のまま時間が経っても枠は伸びない）。
  // 例: 0.5h タスクは常に 0.5h 枠で配置され、開始予定どおりに表示される。
  // 遅れの反映は「完了時の実終了時刻（actualEnd）」を入力したときだけ後続へ伝播する
  // （doneFloor / lastEndByAssignee 経由で次タスクの開始下限が後ろへずれる）。
  const effectiveDuration = (task) => {
    const fullHours = Math.max(0, task.hours || 0);
    if (fullHours <= 0) return 0;
    return Math.max(0, fullHours - (task.completedHours || 0));
  };

  // eTs 以降の空き営業時間に durationHours ぶんを詰める（予約済み・休日/不在は飛ばす）。
  // 終了予定の指定（manualEnd・開始より後の場合のみ有効）があればその時刻で打ち切る
  const fillTaskSlots = (task, eTs, durationHours) => {
    const assignee = task.assignee;
    const eDate = startOfDay(new Date(eTs));
    const eMin = Math.round((eTs - eDate.getTime()) / 60000);
    let meTs = null, meDate = null, meMin = 0;
    if (task.manualEnd) {
      const me = new Date(task.manualEnd);
      if (!isNaN(me.getTime())) {
        const ts = startOfDay(me).getTime() + (me.getHours() * 60 + me.getMinutes()) * 60000;
        if (ts > eTs) {
          meTs = ts; meDate = startOfDay(me); meMin = me.getHours() * 60 + me.getMinutes();
        }
      }
    }
    let remainingMin = Math.round(Math.max(0, durationHours) * 60);
    const slots = [];
    let date = new Date(eDate);
    let guard = 0;
    while (remainingMin > 0 && guard++ < 100000) {
      if (meDate && date.getTime() > meDate.getTime()) break; // 終了予定日を越えたら打ち切り
      const free = dayFreeIntervals(assignee, date, settings, busyMap, absences);
      const isFirst = isSameDay(date, eDate);
      const isMeDay = meDate && isSameDay(date, meDate);
      for (const [fs, feRaw] of free) {
        if (remainingMin <= 0) break;
        const fe = isMeDay ? Math.min(feRaw, meMin) : feRaw;
        const segStart = isFirst ? Math.max(fs, eMin) : fs;
        if (segStart >= fe) continue;
        const use = Math.min(remainingMin, fe - segStart);
        slots.push({ date: new Date(date), startMin: segStart, endMin: segStart + use, hours: use / 60 });
        addBusy(assignee, date, segStart, segStart + use);
        remainingMin -= use;
      }
      date = addDays(date, 1);
    }
    return { slots, meTs, meDate, meMin };
  };

  // ===== 事前パス（差し込み）=====
  // 開始指定（manualStart）のあるタスクを先に配置して時間を予約する。
  // 指定なしのタスクは後からその前後の空きに分割して入るため、
  // 例: 案件A(8〜12時)の途中に案件B(10時開始)を差し込むと A は 8〜10時＋13〜15時 に割れる。
  // 同じ視点に未配置の前工程（開始指定なし）がある場合は工程順を守るため事前予約しない
  const vkeyOf = (t) => `${t.assignee}::${t.projectName}::${t.viewpointName}`;
  const pinnedResults = new Map();
  for (const task of sorted) {
    if (!task.manualStart || (task.hours || 0) <= 0) continue;
    const ms = new Date(task.manualStart);
    if (isNaN(ms.getTime())) continue;
    const hasEarlierUnpinned = sorted.some(o =>
      o !== task && vkeyOf(o) === vkeyOf(task) && !o.manualStart &&
      (o.stepOrder ?? -1) < (task.stepOrder ?? -1)
    );
    if (hasEarlierUnpinned) continue;
    const eTs = startOfDay(ms).getTime() + (ms.getHours() * 60 + ms.getMinutes()) * 60000;
    pinnedResults.set(task.id, fillTaskSlots(task, eTs, effectiveDuration(task)));
  }

  const scheduled = sorted.map(task => {
    const fullHours = Math.max(0, task.hours || 0);
    const remainingHours = Math.max(0, fullHours - (task.completedHours || 0));

    if (fullHours <= 0) {
      return { ...task, scheduledStart: null, scheduledEnd: null, slots: [], remainingHours: 0 };
    }

    const assignee = task.assignee;
    const vkey = vkeyOf(task);
    let res;
    if (pinnedResults.has(task.id)) {
      // 開始指定あり：事前パスで予約済みの配置を使う
      res = pinnedResults.get(task.id);
    } else {
      // 最早開始可能時刻：開始時間の指定（manualStart）があればそれを優先し、
      // 起点・完了実績の下限（doneFloor）より前でも指定どおりに置く。
      // 同視点の前ステップ終了（工程順）と他タスクの占有時間は常に守る。
      let eTs = baseTsOf(assignee);
      if (lastEndByAssignee[assignee] && lastEndByAssignee[assignee] > eTs) eTs = lastEndByAssignee[assignee];
      if (task.manualStart) {
        const ms = new Date(task.manualStart);
        if (!isNaN(ms.getTime())) {
          eTs = startOfDay(ms).getTime() + (ms.getHours() * 60 + ms.getMinutes()) * 60000;
        }
      }
      if (vpLastEnd[vkey] && vpLastEnd[vkey] > eTs) eTs = vpLastEnd[vkey];
      res = fillTaskSlots(task, eTs, effectiveDuration(task));
    }
    const { slots, meTs, meDate, meMin } = res;

    if (slots.length === 0) {
      return { ...task, scheduledStart: null, scheduledEnd: null, slots: [], remainingHours };
    }
    const last = slots[slots.length - 1];
    // 終了予定の指定があれば、表示上の終了・後続の開始下限ともにその時刻にする
    let endDate = last.date, endMin = last.endMin;
    let endTs = endDate.getTime() + endMin * 60000;
    if (meTs) {
      endDate = meDate; endMin = meMin; endTs = meTs;
    }
    vpLastEnd[vkey] = Math.max(vpLastEnd[vkey] || 0, endTs);
    // 次のタスク（開始指定なし）はこのタスクの終了予定に続けて配置する
    lastEndByAssignee[assignee] = Math.max(lastEndByAssignee[assignee] || 0, endTs);
    return {
      ...task,
      scheduledStart: slots[0].date,
      scheduledStartMin: slots[0].startMin,
      scheduledEnd: endDate,
      scheduledEndMin: endMin,
      slots, remainingHours,
    };
  });

  // 確認待ち（done のうち reviewState==='waiting'）と、確認も済んだ完了（完了タブ表示用）に分ける
  const review = done.filter(t => t.reviewState === 'waiting');
  const doneFinal = done.filter(t => t.reviewState !== 'waiting');
  return { active: scheduled, done, review, doneFinal };
}

// 完了タスクのカレンダー表示用スロット：実終了時刻（actualEnd、無ければ completedAt）から
// 制作時間ぶん営業時間を遡って配置する。同担当者の完了タスク同士は重ならないよう後ろから詰める
function buildDoneSlots(doneTasks, settings) {
  const out = [];
  const busy = {};
  const addBusy = (assignee, date, s, e) => {
    if (!busy[assignee]) busy[assignee] = new Map();
    const ymd = fmtYMD(date);
    if (!busy[assignee].has(ymd)) busy[assignee].set(ymd, []);
    busy[assignee].get(ymd).push([s, e]);
  };
  const items = [];
  for (const t of doneTasks) {
    if (!(t.hours > 0)) continue;
    let end = null;
    if (t.actualEnd) { const d = new Date(t.actualEnd); if (!isNaN(d.getTime())) end = d; }
    if (!end && t.completedAt) { const d = new Date(t.completedAt); if (!isNaN(d.getTime())) end = d; }
    if (!end) continue;
    items.push({ t, end });
  }
  // 終了時刻の遅いものから後ろ詰め。同時刻完了は後工程ほど終了側に置く
  items.sort((a, b) => (b.end - a.end) || ((b.t.stepOrder || 0) - (a.t.stepOrder || 0)) || ((b.t.createdAt || 0) - (a.t.createdAt || 0)));
  for (const { t, end } of items) {
    let remainingMin = t.hours * 60;
    const slots = [];
    let date = startOfDay(end);
    const endDate = new Date(date);
    const endMin = end.getHours() * 60 + end.getMinutes();
    let guard = 0;
    while (remainingMin > 0 && guard++ < 1000) {
      const free = dayFreeIntervals(t.assignee, date, settings, busy, settings.absences || []);
      const isLast = isSameDay(date, endDate);
      for (let i = free.length - 1; i >= 0 && remainingMin > 0; i--) {
        const fs = free[i][0];
        const fe = isLast ? Math.min(free[i][1], endMin) : free[i][1];
        if (fe <= fs) continue;
        const use = Math.min(remainingMin, fe - fs);
        slots.unshift({ date: new Date(date), startMin: fe - use, endMin: fe, hours: use / 60 });
        addBusy(t.assignee, date, fe - use, fe);
        remainingMin -= use;
      }
      date = addDays(date, -1);
    }
    for (const slot of slots) out.push({ task: t, slot, done: true });
  }
  return out;
}

// 登録されている残業の最遅終了時刻（分）。カレンダーの時間軸の拡張に使う
function maxOvertimeEndMin(settings) {
  let max = 0;
  for (const o of (settings.overtimes || [])) {
    if (o && o.startTime && o.endTime) max = Math.max(max, timeToMin(o.endTime));
  }
  return max;
}

// 経過進捗（時間経過ベース）：slots のうち現在時刻 now より前の部分の合計時間（h）
function elapsedHoursForSlots(slots, now) {
  if (!slots || slots.length === 0) return 0;
  const nowTs = now.getTime();
  let h = 0;
  for (const slot of slots) {
    const dayTs = startOfDay(slot.date).getTime();
    const startTs = dayTs + slot.startMin * 60000;
    const endTs = dayTs + slot.endMin * 60000;
    if (nowTs >= endTs) h += (slot.endMin - slot.startMin) / 60;
    else if (nowTs > startTs) h += (nowTs - startTs) / 3600000;
  }
  return h;
}
// 2つの時刻の間の「営業時間（稼働時間）」を担当者ベースで合計（土日・休日・不在を除外）
function workingHoursBetweenTs(fromTs, toTs, assignee, settings) {
  if (toTs <= fromTs) return 0;
  let total = 0;
  let d = startOfDay(new Date(fromTs));
  const lastDay = startOfDay(new Date(toTs)).getTime();
  let guard = 0;
  while (d.getTime() <= lastDay && guard++ < 100000) {
    const free = dayFreeIntervals(assignee, d, settings, {}, settings.absences || []);
    const dayTs = d.getTime();
    for (const [s, e] of free) {
      const segS = dayTs + s * 60000, segE = dayTs + e * 60000;
      const lo = Math.max(segS, fromTs), hi = Math.min(segE, toTs);
      if (hi > lo) total += (hi - lo) / 3600000;
    }
    d = addDays(d, 1);
  }
  return total;
}

// タスク群（案件・視点など）の進行中タスクの最終 scheduledEnd を timestamp で返す（無ければ null）
function projectEndTs(tasks) {
  let best = null;
  for (const t of tasks) {
    if (t.status === 'done' || !t.scheduledEnd) continue;
    const ts = startOfDay(t.scheduledEnd).getTime() + (t.scheduledEndMin || 0) * 60000;
    if (best == null || ts > best) best = ts;
  }
  return best;
}

// 編集中に「フォーム由来として除外すべき既存タスクID」を集める
function formEditIds(form) {
  const s = new Set();
  for (const vp of (form.viewpoints || [])) for (const st of (vp.steps || [])) if (st.taskId) s.add(st.taskId);
  return s;
}

// フォーム内容を、スケジュール計算に使える簡易タスクレコード群へ変換（プレビュー／確認用）
function formPreviewRecords(form, defaultPriority, taskById) {
  let priority = parseInt(form.priority, 10);
  if (isNaN(priority) || priority < 1) priority = defaultPriority;
  const records = [];
  let seq = 0;
  for (const vp of (form.viewpoints || [])) {
    const vpName = (vp.viewpointName || '').trim() || '視点';
    const vpAssignee = (vp.assignee || '').trim() || (form.assignee || '').trim();
    const vpFirstIdx = records.length;
    for (const step of (vp.steps || [])) {
      const hoursStr = (step.hours === undefined || step.hours === null) ? '' : String(step.hours);
      const stepHours = hoursStr.trim() === '' ? 0 : parseFloat(hoursStr);
      if (isNaN(stepHours) || stepHours <= 0) continue; // 制作時間のあるステップのみスケジュール対象
      const completedRaw = (step.completedHours === '' || step.completedHours == null) ? 0 : parseFloat(step.completedHours);
      // 完了済みステップ（完了時間≧制作時間）は登録時に done のままになるためスケジュール対象外
      if (!isNaN(completedRaw) && completedRaw >= stepHours) continue;
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
        // 既存タスクのステップ個別の開始・終了指定を引き継ぐ（実スケジュールと同条件にする）
        manualStart: (step.taskId && taskById && taskById.get(step.taskId)?.manualStart) || null,
        manualEnd: (step.taskId && taskById && taskById.get(step.taskId)?.manualEnd) || null,
        status: 'pending',
        createdAt: 1e15 + seq, // 同優先順位の既存タスクより後ろに並べる
      });
      seq++;
    }
    // 視点ごとの開始時間・終了時間：この視点の最初／最後のレコードに登録・解除（buildRecords と同じ規則）
    if (records.length > vpFirstIdx) {
      records[vpFirstIdx].manualStart = vp.manualStart || null;
      records[records.length - 1].manualEnd = vp.manualEnd || null;
    }
  }
  return { records, priority };
}

// フォーム内容を実データに混ぜて scheduleTasks し、フォーム分の開始・終了予定と
// 納期チェック（視点の終了予定が納期を超えていないか）の結果を返す
function simulateFormSchedule(form, allTasks, settings, projectOrder, now) {
  const editIds = formEditIds(form);
  // 優先順位は廃止。プレビューも実登録と同じく「同じ会社の中で納期（実効）の早い順」で既定位置を決める。
  const companyName = (form.companyName || '').trim();
  const activeSameCompany = allTasks.filter(t => t.status !== 'done' && !editIds.has(t.id) && (t.companyName || '') === companyName);
  const dlKey = Math.min(...(form.viewpoints || []).map(v => deadlineKey((v.deadline || '').trim() || (form.projectDeadline || '').trim())));
  const defaultPriority = deadlineInsertPriority(activeSameCompany, dlKey);
  const taskById = new Map(allTasks.map(t => [t.id, t]));
  const { records } = formPreviewRecords(form, defaultPriority, taskById);
  if (records.length === 0) return null;
  // 完了タスクは編集中でも常に含める（実績＝doneFloor はフォームでは変わらないため）。
  // 除外は編集中のアクティブなレコードのみ
  const others = allTasks.filter(t => t.status === 'done' || !editIds.has(t.id));
  const result = scheduleTasks([...others, ...records], settings, projectOrder, now);
  const pids = new Set(records.map(r => r.id));
  const ps = result.active.filter(t => pids.has(t.id) && t.scheduledStart);
  if (ps.length === 0) return null;
  let sBest = null, eBest = null, sD = null, sM = 0, eD = null, eM = 0;
  // 視点ごとの最遅終了（納期チェック用）
  const vpEnds = new Map();
  for (const t of ps) {
    const sTs = t.scheduledStart.getTime() + (t.scheduledStartMin || 0) * 60000;
    const eTs = t.scheduledEnd.getTime() + (t.scheduledEndMin || 0) * 60000;
    if (sBest == null || sTs < sBest) { sBest = sTs; sD = t.scheduledStart; sM = t.scheduledStartMin; }
    if (eBest == null || eTs > eBest) { eBest = eTs; eD = t.scheduledEnd; eM = t.scheduledEndMin; }
    const cur = vpEnds.get(t.viewpointName);
    if (!cur || eTs > cur.endTs) vpEnds.set(t.viewpointName, { endTs: eTs, endDate: t.scheduledEnd, endMin: t.scheduledEndMin });
  }
  let moved = false, requested = null;
  // 視点ごとの開始指定のうち最も早いものを「指定時刻」として押し出し判定する
  let reqTs = null;
  for (const vp of (form.viewpoints || [])) {
    if (!vp.manualStart) continue;
    const ms = new Date(vp.manualStart);
    if (isNaN(ms.getTime())) continue;
    const ts = startOfDay(ms).getTime() + (ms.getHours() * 60 + ms.getMinutes()) * 60000;
    if (reqTs == null || ts < reqTs) {
      reqTs = ts;
      requested = { date: startOfDay(ms), min: ms.getHours() * 60 + ms.getMinutes() };
    }
  }
  if (reqTs != null) moved = sBest > reqTs;
  // 納期チェック：視点の終了予定（日付）が納期（日付）より後なら違反
  const deadlineViolations = [];
  for (const vp of (form.viewpoints || [])) {
    // 実効納期＝個別（視点）＞全体（案件）
    const dl = ((vp.deadline || '').trim() || (form.projectDeadline || '').trim());
    if (!dl) continue;
    const name = (vp.viewpointName || '').trim() || '視点';
    const r = vpEnds.get(name);
    if (!r) continue;
    if (fmtYMD(r.endDate) > dl) {
      deadlineViolations.push({ viewpointName: name, deadline: dl, endDate: r.endDate, endMin: r.endMin });
    }
  }
  return { startDate: sD, startMin: sM, endDate: eD, endMin: eM, moved, requested, deadlineViolations };
}

// 納期超過の新規/編集案件に対する「繰り上げ（並べ替え）提案」を算出する。
// - sameBump : 同じ担当者の案件の中だけで、納期がこの案件より遅い案件の前へ繰り上げる案（推奨）
// - globalBump: 担当者・会社をまたいで全体の先頭へ繰り上げる案（同じ担当者内で解決できない時の提案）
// それぞれ実スケジュールで再試算し、この案件の納期超過が解消する場合のみ返す（解消しなければ null）。
function computeDeadlineReorder(form, allTasks, settings, projectOrder, now) {
  const P = (form.projectName || '').trim();
  if (!P) return null;
  const editIds = formEditIds(form);
  const activeOthers = allTasks.filter(t => t.status !== 'done' && !editIds.has(t.id));
  const baseNames = computeProjectOrder(activeOthers, projectOrder);
  const namesWithP = baseNames.includes(P) ? baseNames.slice() : [...baseNames, P];

  // この案件の実効納期（フォームの視点の最早）
  const pDlKey = Math.min(...(form.viewpoints || []).map(v =>
    deadlineKey((v.deadline || '').trim() || (form.projectDeadline || '').trim())));
  // この案件の担当者集合
  const pAssignees = new Set();
  for (const v of (form.viewpoints || [])) {
    const a = (v.assignee || form.assignee || '').trim();
    if (a) pAssignees.add(a);
  }

  // 既存案件 → 担当者集合・実効納期
  const projMeta = new Map();
  for (const t of activeOthers) {
    const p = t.projectName || '';
    if (!projMeta.has(p)) projMeta.set(p, { assignees: new Set(), dlKey: Infinity });
    const m = projMeta.get(p);
    if (t.assignee) m.assignees.add(t.assignee);
    const k = effectiveDeadlineKey(t);
    if (k < m.dlKey) m.dlKey = k;
  }
  const sharesAssignee = (proj) => {
    const m = projMeta.get(proj); if (!m) return false;
    for (const a of pAssignees) if (m.assignees.has(a)) return true;
    return false;
  };

  // P を抜いて、beforeProj の直前（null なら先頭）へ挿入した完全順リスト
  const moveP = (beforeProj) => {
    const without = namesWithP.filter(n => n !== P);
    const idx = beforeProj ? without.indexOf(beforeProj) : 0;
    const at = idx < 0 ? 0 : idx;
    return [...without.slice(0, at), P, ...without.slice(at)];
  };
  const simResolves = (order) => {
    const sim = simulateFormSchedule(form, allTasks, settings, order, now);
    if (sim && (sim.deadlineViolations || []).length === 0) return sim;
    return null;
  };

  // 同じ担当者の中で、P より前にある「P より納期が遅い」最初の案件の直前へ繰り上げ
  let sameBump = null, sameTarget = null;
  for (const n of namesWithP) {
    if (n === P) break;
    if (sharesAssignee(n) && (projMeta.get(n)?.dlKey ?? Infinity) > pDlKey) { sameTarget = n; break; }
  }
  if (sameTarget) {
    const order = moveP(sameTarget);
    const sim = simResolves(order);
    if (sim) sameBump = { order, target: sameTarget, endDate: sim.endDate, endMin: sim.endMin };
  }

  // 全体の先頭へ繰り上げ（同じ担当者内で解決できない時の提案）
  let globalBump = null;
  if (!sameBump) {
    const order = moveP(null);
    const sim = simResolves(order);
    if (sim) globalBump = { order, endDate: sim.endDate, endMin: sim.endMin };
  }

  if (!sameBump && !globalBump) return null;
  return { sameBump, globalBump };
}


function sortAssigneesByMaster(names, masterNames) {
  const idx = new Map((masterNames || []).map((n, i) => [n, i]));
  return [...names].sort((a, b) => {
    const ia = idx.has(a) ? idx.get(a) : Infinity;
    const ib = idx.has(b) ? idx.get(b) : Infinity;
    return ia - ib; // 同点（両方未登録）は安定ソートで出現順を維持
  });
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
        memo: task.memo || '',
        tentative: !!task.tentative,
        tentativeStart: task.tentativeStart || '',
        tentativeEnd: task.tentativeEnd || '',
        deadline: task.deadline || '',                       // 実効納期（後で個別＞全体で確定）
        individualDeadline: task.deadline || '',             // 個別納期（視点）
        projectDeadline: task.projectDeadline || '',         // 全体納期（案件）
        tasks: [],
        minPriority: task.priority,
      };
    }
    groups[key].tasks.push(task);
    if (!groups[key].memo && task.memo) groups[key].memo = task.memo;
    if (task.tentative) groups[key].tentative = true;
    if (!groups[key].tentativeStart && task.tentativeStart) groups[key].tentativeStart = task.tentativeStart;
    if (!groups[key].tentativeEnd && task.tentativeEnd) groups[key].tentativeEnd = task.tentativeEnd;
    if (task.deadline && (!groups[key].individualDeadline || task.deadline < groups[key].individualDeadline)) groups[key].individualDeadline = task.deadline;
    if (task.projectDeadline && !groups[key].projectDeadline) groups[key].projectDeadline = task.projectDeadline;
    if (task.priority < groups[key].minPriority) groups[key].minPriority = task.priority;
  }
  // 各グループ内：stepOrder → priority → createdAt の順
  for (const g of Object.values(groups)) {
    // 実効納期＝個別（視点）＞全体（案件）
    g.deadline = g.individualDeadline || g.projectDeadline || '';
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
  // カレンダーから案件編集を開いた場合 true（入力へ遷移せず、カレンダーのすぐ下にフォームを表示）
  const [calendarEdit, setCalendarEdit] = useState(false);
  // 案件の並び順（ドラッグ＆ドロップ用）。Firestore に projectOrder として保存
  const [projectOrder, setProjectOrder] = useState([]);
  // お客様マスタ（[{ id, company, contact }]）・従業員マスタ（[{ id, name, role }]）
  const [customerMaster, setCustomerMaster] = useState([]);
  const [employeeMaster, setEmployeeMaster] = useState([]);
  // タスクメモ（[{ id, title, date, startTime, endTime, allDay, note, color, createdAt, updatedAt }]）
  const [memos, setMemos] = useState([]);
  // 完了ダイアログ（終了時間を入力して完了する）の対象
  const [completeTarget, setCompleteTarget] = useState(null);
  // 開始時間が移動する場合の確認モーダル
  const [startMoveConfirm, setStartMoveConfirm] = useState(null);
  // 現在時刻ティッカー（1分ごと更新）。経過進捗・現在時刻ライン・終了超過検知に使う
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [auth, setAuth] = useState({ user: null, allowed: false, ready: false });
  const [signInError, setSignInError] = useState('');

  useEffect(() => subscribeAuth(setAuth), []);

  // 初期表示は「パース」プリセット
  const makeEmptyViewpoint = () => makeViewpointFromPreset(VIEWPOINT_PRESETS[0]);
  const emptyForm = {
    projectName: '', projectNameInternal: '', companyName: '', customerContact: '', assignee: '', priority: '', memo: '', tentative: false, tentativeStart: '', tentativeEnd: '',
    // 案件全体の納期（全体設定）。各視点の納期（個別設定）が未設定のとき適用する
    projectDeadline: '',
    // 視点（担当タスク）の動的リスト。各視点の中にステップ（工程）を持つ。
    // 開始時間・終了時間は視点ごとに設定。納期は「全体（案件）＋個別（視点）」で、個別が優先される
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

    // 休日(holidays)・休み(absences) を旧 settings から独立キーへ一度だけ移行する。
    // （settings は1ドキュメント集中型で全体上書きのため、他設定の保存で巻き込まれて消える事故を防ぐ）
    (async () => {
      try {
        const [hRaw, aRaw, sRaw] = await Promise.all([
          storage.get('holidays'), storage.get('absences'), storage.get('settings'),
        ]);
        let legacy = {};
        if (sRaw && sRaw.value) { try { legacy = JSON.parse(sRaw.value); } catch (e) {} }
        if (!hRaw && Array.isArray(legacy.holidays) && legacy.holidays.length) {
          await storage.set('holidays', JSON.stringify(legacy.holidays));
        }
        if (!aRaw && Array.isArray(legacy.absences) && legacy.absences.length) {
          await storage.set('absences', JSON.stringify(legacy.absences));
        }
      } catch (e) { console.warn('休日・休みの移行に失敗:', e); }
    })();

    const unsubSettings = storage.subscribe('settings', (val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          // holidays/absences は専用キー（別購読）が真実の値。settings 側の旧データでは上書きしない。
          setSettings(prev => ({ ...DEFAULT_SETTINGS, ...parsed, holidays: prev.holidays || [], absences: prev.absences || [] }));
        } catch (e) { }
      }
      setSettingsLoaded(true);
    });

    // 休日（祝日）・休み（欠勤・不在）は settings から分離した専用キーを購読
    const unsubHolidays = storage.subscribe('holidays', (val) => {
      let arr = [];
      if (val) { try { const p = JSON.parse(val); if (Array.isArray(p)) arr = p; } catch (e) {} }
      syncHolidays({ holidays: arr });
      setSettings(prev => ({ ...prev, holidays: arr }));
    });
    const unsubAbsences = storage.subscribe('absences', (val) => {
      let arr = [];
      if (val) { try { const p = JSON.parse(val); if (Array.isArray(p)) arr = p; } catch (e) {} }
      setSettings(prev => ({ ...prev, absences: arr }));
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

    // タスクメモを購読
    const unsubMemos = storage.subscribe('memos', (val) => {
      if (!val) { setMemos([]); return; }
      try { const arr = JSON.parse(val); if (Array.isArray(arr)) setMemos(arr); }
      catch (e) { setMemos([]); }
    });

    return () => {
      cancelled = true;
      clearTimeout(loadTimeout);
      if (unsubTasks) unsubTasks();
      unsubSettings();
      unsubHolidays();
      unsubAbsences();
      unsubOrder();
      unsubCustomer();
      unsubEmployee();
      unsubMemos();
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
      const { morningStart, morningEnd, afternoonStart, afternoonEnd, startDate, startTime, overtimes, endPromptState, companyOrder } = newSettings;
      // 休日(holidays)・休み(absences) は巻き込み事故防止のため別ドキュメント（saveHolidays/saveAbsences）に分離。ここでは保存しない。
      await storage.set('settings', JSON.stringify({ morningStart, morningEnd, afternoonStart, afternoonEnd, startDate, startTime, overtimes: overtimes || [], endPromptState: endPromptState || {}, companyOrder: companyOrder || [] }));
    } catch (e) { console.error(e); }
  };
  // 休日（祝日）・休み（欠勤・不在）は専用キーに保存する。状態には settings 内に保持して既存の参照を維持。
  const saveHolidays = async (arr) => {
    syncHolidays({ holidays: arr });
    setSettings(prev => ({ ...prev, holidays: arr }));
    try { await storage.set('holidays', JSON.stringify(arr)); }
    catch (e) { console.error('祝日保存エラー:', e); }
  };
  const saveAbsences = async (arr) => {
    setSettings(prev => ({ ...prev, absences: arr }));
    try { await storage.set('absences', JSON.stringify(arr)); }
    catch (e) { console.error('欠勤・不在保存エラー:', e); }
  };
  // 会社の表示順を保存
  const saveCompanyOrder = (order) => {
    saveSettings({ ...settings, companyOrder: order });
  };
  // 終了超過ポップアップの制御状態（視点ごとの snooze / 表示済み終了予定）を更新
  // key は視点キー（assignee::projectName::viewpointName）
  const setEndPromptFor = (key, patch) => {
    const eps = { ...(settings.endPromptState || {}) };
    eps[key] = { ...(eps[key] || {}), ...patch };
    saveSettings({ ...settings, endPromptState: eps });
  };

  // 欠勤・休日・不在の追加／削除（専用キーへ保存）
  const addAbsence = (absence) => {
    saveAbsences([...(settings.absences || []), { ...absence, id: genId('abs') }]);
  };
  const removeAbsence = (id) => {
    saveAbsences((settings.absences || []).filter(a => a.id !== id));
  };

  // 全体共通の祝日（ベトナム等）の追加／削除。重複日付は無視する
  const addHolidays = (items) => {
    const cur = settings.holidays || [];
    const have = new Set(cur.map(h => h.date));
    const adds = [];
    for (const it of (items || [])) {
      for (const date of expandHolidayDates(it.date, it.days)) {
        if (have.has(date)) continue;
        have.add(date);
        adds.push({ id: genId('hol'), date, label: it.label || '' });
      }
    }
    if (adds.length === 0) return;
    saveHolidays([...cur, ...adds]);
  };
  const removeHoliday = (id) => {
    saveHolidays((settings.holidays || []).filter(h => h.id !== id));
  };

  // 残業（稼働枠の追加）の追加／削除
  const addOvertime = (overtime) => {
    const next = [...(settings.overtimes || []), { ...overtime, id: genId('ot') }];
    saveSettings({ ...settings, overtimes: next });
  };
  const removeOvertime = (id) => {
    saveSettings({ ...settings, overtimes: (settings.overtimes || []).filter(o => o.id !== id) });
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

  // カレンダーから担当者行を並び替え（従業員マスタの並び順を更新 → 全画面に反映）
  const reorderAssigneeFromCalendar = (srcName, targetName) => {
    if (!srcName || srcName === targetName) return;
    const si = employeeMaster.findIndex(e => e.name === srcName);
    const ti = employeeMaster.findIndex(e => e.name === targetName);
    if (si < 0 || ti < 0) {
      alert('担当者の並び替えは、従業員マスタに登録されている担当者同士でのみ行えます。\nマスタタブで従業員を登録してください。');
      return;
    }
    const src = employeeMaster[si];
    const rest = employeeMaster.filter((_, i) => i !== si);
    const t2 = rest.findIndex(e => e.name === targetName);
    saveEmployeeMaster([...rest.slice(0, t2), src, ...rest.slice(t2)]);
  };

  // カレンダーから案件の順番を並び替え：src 案件を target 案件の位置（直前）へ差し込む
  const reorderProjectFromCalendar = (srcProj, targetProj) => {
    if (!srcProj || srcProj === targetProj) return;
    const active = tasksRef.current.filter(t => t.status !== 'done');
    const effective = computeProjectOrder(active, projectOrder);
    if (!effective.includes(srcProj) || !effective.includes(targetProj)) return;
    const filtered = effective.filter(p => p !== srcProj);
    const ti = filtered.indexOf(targetProj);
    saveProjectOrder([...filtered.slice(0, ti), srcProj, ...filtered.slice(ti)]);
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

  // タスクメモの追加・更新（id が一致すれば更新、無ければ追加）
  const upsertMemo = (memo) => {
    setMemos(prev => {
      const exists = prev.some(m => m.id === memo.id);
      const next = exists ? prev.map(m => m.id === memo.id ? memo : m) : [...prev, memo];
      storage.set('memos', JSON.stringify(next)).catch(e => console.error('タスクメモ保存エラー:', e));
      return next;
    });
  };
  const deleteMemo = (id) => {
    setMemos(prev => {
      const next = prev.filter(m => m.id !== id);
      storage.set('memos', JSON.stringify(next)).catch(e => console.error('タスクメモ削除エラー:', e));
      return next;
    });
  };


  // 登録/更新のエントリ：開始時間が指定どおりに置けない場合、
  // または視点の終了予定が納期を超える場合は確認モーダルを出す
  const handleSubmit = async () => {
    if (form.projectName.trim()) {
      const sim = simulateFormSchedule(form, tasksRef.current, settings, projectOrder, new Date());
      const hasStartPin = (form.viewpoints || []).some(v => v.manualStart);
      const moved = !!(sim && sim.moved && hasStartPin);
      const violations = (sim && sim.deadlineViolations) || [];
      if (moved || violations.length > 0) {
        let reorder = null;
        if (violations.length > 0) {
          try { reorder = computeDeadlineReorder(form, tasksRef.current, settings, projectOrder, new Date()); }
          catch (e) { console.warn('並べ替え提案の算出に失敗:', e); }
        }
        setStartMoveConfirm({
          moved,
          requested: sim.requested,
          actualDate: sim.startDate,
          actualMin: sim.startMin,
          violations,
          reorder,
        });
        return; // モーダルの選択肢で performSubmit を呼ぶ
      }
    }
    await performSubmit();
  };

  // 登録/更新の本体（確認モーダルを通過したあとに実際に保存する処理）
  // opts.orderOverride: 納期超過時の繰り上げで採用する案件並び順（完全な案件名リスト）
  const performSubmit = async (opts = {}) => {
    if (!form.projectName.trim()) {
      alert('案件名を入力してください');
      return;
    }
    // 優先順位は廃止。編集時は既存の順位（form.priority）を保持し、
    // 新規登録時は「同じ会社の中で納期（実効）の早い順」の位置に挿入する（手動ドラッグ／↑↓で上書き可）。
    let priority = parseInt(form.priority, 10);
    if (isNaN(priority) || priority < 1) {
      const companyName = (form.companyName || '').trim();
      const activeSameCompany = tasks.filter(t => t.status !== 'done' && (t.companyName || '') === companyName);
      const dlKey = Math.min(...(form.viewpoints || []).map(v => deadlineKey((v.deadline || '').trim() || (form.projectDeadline || '').trim())));
      priority = deadlineInsertPriority(activeSameCompany, dlKey);
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
        const vpFirstIdx = upserts.length; // この視点のレコード開始位置（視点ごとの開始時間の適用先を探す用）
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

          // 中止済みタスクは完了時間に関わらず done のまま維持（戻すのは完了タブの「戻す」で行う）
          const isCancelled = !!existing?.cancelled;
          const status = (isCancelled || autoDone) ? 'done' : 'pending';
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
            memo: (form.memo || '').trim(),
            tentative: !!form.tentative,
            tentativeStart: form.tentative ? (form.tentativeStart || null) : null,
            tentativeEnd: form.tentative ? (form.tentativeEnd || null) : null,
            deadline: vp.deadline || null,               // 個別納期（視点）
            projectDeadline: (form.projectDeadline || '').trim() || null, // 全体納期（案件）
            // ステップ個別の開始・終了指定は維持（フォームの欄は下で先頭/末尾の未完了ステップに適用）
            manualStart: existing?.manualStart || null,
            manualEnd: existing?.manualEnd || null,
            status,
            completedAt: status === 'done' ? (existing?.completedAt || (baseTime + seq)) : null,
            createdAt: existing?.createdAt || (baseTime + seq),
          };
          // 完了実績（actualEnd）・中止フラグは編集後も維持する
          if (status === 'done' && existing?.actualEnd) record.actualEnd = existing.actualEnd;
          if (isCancelled) record.cancelled = true;
          if (existing?.externalId) record.externalId = existing.externalId;
          upserts.push(record);
          order++; seq++; vpHasStep = true;
        }
        if (!vpHasStep) { return { error: `視点「${vpName}」に少なくとも1つのステップ（名称＋時間）を入力してください` }; }
        // 視点ごとの開始時間：この視点の最初の未完了ステップに登録・解除する
        // 視点ごとの終了時間：この視点の最後の未完了ステップに登録・解除する
        // （他ステップの個別指定はそのまま維持）
        const vpRecs = upserts.slice(vpFirstIdx);
        const vpTarget = vpRecs.find(u => u.status !== 'done');
        if (vpTarget) vpTarget.manualStart = vp.manualStart || null;
        else if (vp.manualStart && vpRecs.length > 0) vpRecs[0].manualStart = vp.manualStart;
        const vpLastActive = [...vpRecs].reverse().find(u => u.status !== 'done');
        if (vpLastActive) vpLastActive.manualEnd = vp.manualEnd || null;
        else if (vp.manualEnd && vpRecs.length > 0) vpRecs[vpRecs.length - 1].manualEnd = vp.manualEnd;
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
        // 完了済みタスクも編集スコープに含める（過去案件の情報修正）
        originalTasks = tasksRef.current.filter(t =>
          t.projectName === editMode.projectName
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

      if (opts.orderOverride) saveProjectOrder(opts.orderOverride);
      setEditMode(null);
      setEditingId(null);
      setForm(emptyForm);
      setCalendarEdit(false);
      return;
    }

    // 新規登録
    const result = buildRecords(null);
    if (result.error) { alert(result.error); return; }
    const records = result.upserts;
    if (records.length === 0) { alert('少なくとも1つの視点とステップを入力してください'); return; }
    saveTasks(prev => normalizePriorities([...prev, ...records]));
    if (opts.orderOverride) saveProjectOrder(opts.orderOverride);
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
      memo: task.memo || '',
      tentative: !!task.tentative,
      tentativeStart: task.tentativeStart || '',
      tentativeEnd: task.tentativeEnd || '',
      projectDeadline: task.projectDeadline || '',
      viewpoints: [{
        viewpointName: task.viewpointName || '',
        assignee: task.assignee || '',
        manualStart: task.manualStart || '',
        manualEnd: task.manualEnd || '',
        deadline: task.deadline || '',
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

  // 案件を編集：新規登録フォームに案件全体（全視点・全ステップ、完了済み含む）を pre-populate
  const handleEditProject = (projectName, fromCalendar = false) => {
    const projectTasks = tasksRef.current.filter(t => t.projectName === projectName);
    if (projectTasks.length === 0) { alert('この案件には編集できるタスクがありません'); return; }
    // 視点ごとにグループ化（出現順）→ 各視点内は stepOrder 順
    const vpMap = new Map();
    for (const t of projectTasks) {
      const k = `${t.viewpointName}::${t.assignee}`;
      if (!vpMap.has(k)) vpMap.set(k, { viewpointName: t.viewpointName, assignee: t.assignee, steps: [] });
      vpMap.get(k).steps.push(t);
    }
    const viewpoints = Array.from(vpMap.values()).map(v => {
      const sortedSteps = v.steps.slice().sort((a, b) => (a.stepOrder ?? 0) - (b.stepOrder ?? 0));
      const firstActive = sortedSteps.find(t => t.status !== 'done');
      const lastActive = [...sortedSteps].reverse().find(t => t.status !== 'done');
      return {
        viewpointName: v.viewpointName,
        assignee: v.assignee,
        // 視点ごとの開始時間：最初の未完了ステップの指定を表示（無ければ先頭ステップ）
        manualStart: (firstActive || sortedSteps[0])?.manualStart || '',
        // 視点ごとの終了時間：最後の未完了ステップの指定を表示（無ければ末尾ステップ）
        manualEnd: (lastActive || sortedSteps[sortedSteps.length - 1])?.manualEnd || '',
        // 視点ごとの納期：この視点のタスクから（最初に見つかったもの）
        deadline: (sortedSteps.find(t => t.deadline) || {}).deadline || '',
        steps: sortedSteps.map(t => ({
          taskId: t.id,
          name: t.stepName || '',
          hours: String(t.hours),
          completedHours: String(t.completedHours || 0),
        })),
      };
    });
    const first = projectTasks[0];
    // 優先順位は進行中タスクから採用（完了済みの古い順位は使わない）
    const priorityPool = projectTasks.filter(t => t.status !== 'done');
    setForm({
      ...emptyForm,
      projectName: first.projectName,
      projectNameInternal: first.projectNameInternal || '',
      companyName: first.companyName || '',
      customerContact: first.customerContact || '',
      assignee: first.assignee,
      priority: priorityPool.length > 0 ? String(Math.min(...priorityPool.map(t => t.priority))) : '',
      memo: (projectTasks.find(t => t.memo) || {}).memo || '',
      tentative: projectTasks.some(t => t.tentative),
      tentativeStart: (projectTasks.find(t => t.tentativeStart) || {}).tentativeStart || '',
      tentativeEnd: (projectTasks.find(t => t.tentativeEnd) || {}).tentativeEnd || '',
      projectDeadline: (projectTasks.find(t => t.projectDeadline) || {}).projectDeadline || '',
      viewpoints,
    });
    setEditingId(null);
    setEditMode({ type: 'project', projectName: first.projectName });
    if (fromCalendar) {
      // カレンダーのすぐ下にインライン表示（入力タブへは遷移しない）
      setCalendarEdit(true);
    } else {
      setCalendarEdit(false);
      setView('input');
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
    // 視点追加で案件の並び順が動かないよう、既存案件の優先順位（進行中の最小）を引き継ぐ
    const activeSiblings = tasksRef.current.filter(t => t.projectName === projectName && t.status !== 'done');
    setForm({
      ...emptyForm,
      projectName: projectName || '',
      projectNameInternal: projectNameInternal || '',
      companyName: sibling?.companyName || '',
      customerContact: sibling?.customerContact || '',
      priority: activeSiblings.length ? String(Math.min(...activeSiblings.map(t => t.priority))) : '',
      memo: sibling?.memo || '',
      tentative: !!sibling?.tentative,
      tentativeStart: sibling?.tentativeStart || '',
      tentativeEnd: sibling?.tentativeEnd || '',
      projectDeadline: sibling?.projectDeadline || '',
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
    const last = tasksOfVp[tasksOfVp.length - 1];
    const viewpoints = [{
      viewpointName: group.viewpointName,
      assignee: group.assignee,
      manualStart: first.manualStart || '',
      manualEnd: last.manualEnd || '',
      deadline: (tasksOfVp.find(t => t.deadline) || {}).deadline || '',
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
      projectDeadline: group.projectDeadline || first.projectDeadline || '',
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
      projectDeadline: group.projectDeadline || '',
      // 追加ステップはこの視点の個別納期を引き継ぐ（開始・終了の指定は既存ステップ側を維持）
      viewpoints: [{ viewpointName: group.viewpointName, assignee: group.assignee, manualStart: '', manualEnd: '', deadline: group.individualDeadline || '', steps: [{ name: '', hours: '', completedHours: '' }] }],
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

  // 個別納期の変更（視点内の全ステップに一括反映）。空なら個別を解除（＝全体納期に従う）
  const setViewpointDeadline = (group, value) => {
    const dl = (value || '').trim();
    const ids = new Set(group.tasks.map(t => t.id));
    saveTasks(prev => prev.map(t => ids.has(t.id) ? { ...t, deadline: dl || null } : t));
  };

  // 全体納期（案件共通）の変更。その案件の全タスク（完了済み含む）に一括反映する。
  // 空なら全体納期なし（各視点は個別納期があればそれを使い、無ければ納期なし）
  const setProjectDeadline = (projectName, value) => {
    const dl = (value || '').trim();
    saveTasks(prev => prev.map(t => t.projectName === projectName ? { ...t, projectDeadline: dl || null } : t));
  };

  // 進行中タスクの案件ヘッダーからインラインで案件情報を編集する。
  // 対象案件の全タスク（完了済み含む）に反映し、案件が分割されないようにする。
  // 戻り値：保存したら true、バリデーションエラーなら false（呼び出し側でパネルを閉じる判定に使う）
  const saveProjectInfo = (oldProjectName, info) => {
    const newName = (info.projectName || '').trim();
    if (!newName) { alert('社外案件名を入力してください'); return false; }
    saveTasks(prev => normalizePriorities(prev.map(t =>
      t.projectName === oldProjectName
        ? {
          ...t,
          projectName: newName,
          projectNameInternal: (info.projectNameInternal || '').trim(),
          companyName: (info.companyName || '').trim(),
          customerContact: (info.customerContact || '').trim(),
          memo: (info.memo || '').trim(),
          tentative: !!info.tentative,
          tentativeStart: info.tentative ? (info.tentativeStart || null) : null,
          tentativeEnd: info.tentative ? (info.tentativeEnd || null) : null,
        }
        : t
    )));
    return true;
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
      if (t.status === 'done') return { ...t, status: 'pending', completedAt: null, cancelled: null };
      return { ...t, status: 'done', completedHours: t.hours, completedAt: Date.now(), cancelled: null };
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
    const nowMs = Date.now();
    // 完了した視点／案件は、いったん「確認待ち」へ入れる（完了タブには行かない）
    saveTasks(prev => normalizePriorities(prev.map(t =>
      idSet.has(t.id)
        ? { ...t, status: 'done', cancelled: null, completedHours: t.hours, completedAt: completedAtMs, actualEnd: ae,
            reviewState: 'waiting', reviewAt: nowMs, reviewUpdatedAt: nowMs, reviewNote: '' }
        : t
    )));
    setCompleteTarget(null);
    setView('input');
  };

  // 「案件中止」：未完了タスクを「中止」として完了タブへ移動する。
  // 実績（completedHours）はそのまま残し、actualEnd は記録しない（後続スケジュールに影響させない）
  const cancelProject = (projectName) => {
    if (!projectName) return;
    const activeTasks = scheduled.active.filter(t => t.projectName === projectName);
    if (activeTasks.length === 0) { alert('この案件には未完了のタスクがありません'); return; }
    if (!confirm(`案件「${projectName}」を中止にしますか？\n未完了のタスク ${activeTasks.length}件が「中止」として完了タブへ移動します。\n（完了タブの「戻す」で復元できます）`)) return;
    const idSet = new Set(activeTasks.map(t => t.id));
    const nowMs = Date.now();
    saveTasks(prev => normalizePriorities(prev.map(t =>
      idSet.has(t.id)
        ? { ...t, status: 'done', cancelled: true, completedAt: nowMs, actualEnd: null }
        : t
    )));
    setView('done');
  };

  // ===== 確認待ち（視点完了後の確認フェーズ）の操作（視点単位） =====
  // 確認待ちの視点グループ（案件・視点・担当者）に属するタスクか
  const reviewMatch = (t, g) =>
    t.reviewState === 'waiting' && t.projectName === g.projectName && t.viewpointName === g.viewpointName && t.assignee === g.assignee;
  // 「完了」：確認を終え、完了タブへ移す
  const finalizeReview = (g) => {
    saveTasks(prev => prev.map(t => reviewMatch(t, g) ? { ...t, reviewState: null } : t));
  };
  // 「進行中に戻す」：確認待ちから進行中へ差し戻す
  const reopenReview = (g) => {
    if (!confirm(`「${g.projectName} ／ ${g.viewpointName}」を進行中に戻しますか？`)) return;
    saveTasks(prev => normalizePriorities(prev.map(t => reviewMatch(t, g)
      ? { ...t, status: 'pending', reviewState: null, reviewAt: null, reviewUpdatedAt: null, completedAt: null, actualEnd: null }
      : t)));
  };
  // 追加修正メモの記入。最終更新時刻も更新する（3日グレー・7日自動完了の基準をリセット）
  const setReviewNote = (g, note) => {
    saveTasks(prev => prev.map(t => reviewMatch(t, g) ? { ...t, reviewNote: note, reviewUpdatedAt: Date.now() } : t));
  };
  // 確認待ちの「完了時刻」を後から修正。actualEnd を更新すると、その時刻を起点に
  // （doneFloor 経由で）担当者の残りタスクが組み直る。早く終われば前倒しされる。
  const setReviewActualEnd = (g, value) => {
    const ae = value || null;
    const nowMs = Date.now();
    saveTasks(prev => prev.map(t => reviewMatch(t, g)
      ? { ...t, actualEnd: ae, completedAt: ae ? new Date(ae).getTime() : t.completedAt, reviewUpdatedAt: nowMs }
      : t));
  };

  // ステップ単位の開始時間指定（自動スケジュールより優先）を登録・解除
  const setTaskManualStart = (id, value) => {
    saveTasks(prev => prev.map(t => t.id === id ? { ...t, manualStart: value || null } : t));
  };

  // ステップ単位の終了予定の指定を登録・解除。指定すると同担当者の後続タスクはこの時刻以降に開始
  const setTaskManualEnd = (id, value) => {
    saveTasks(prev => prev.map(t => t.id === id ? { ...t, manualEnd: value || null } : t));
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

  // ===== 終了予定超過ポップアップ（機能B・視点単位） =====
  // vp は { projectName, viewpointName, assignee } を持つオブジェクト
  // ① 視点完了（終了時間つき）
  const endPromptComplete = (vp, actualEndStr) => {
    const ae = actualEndStr || null;
    const completedAtMs = ae ? new Date(ae).getTime() : Date.now();
    const nowMs = Date.now();
    saveTasks(prev => normalizePriorities(prev.map(t =>
      (t.projectName === vp.projectName && t.viewpointName === vp.viewpointName && t.assignee === vp.assignee && t.status !== 'done')
        ? { ...t, status: 'done', cancelled: null, completedHours: t.hours, completedAt: completedAtMs, actualEnd: ae,
            reviewState: 'waiting', reviewAt: nowMs, reviewUpdatedAt: nowMs, reviewNote: '' }
        : t
    )));
    setView('input');
  };
  // ② 追加修正（この視点の最後尾にステップを追加）
  const endPromptAddRevision = (vp, stepName, hours) => {
    const projectName = vp.projectName, viewpointName = vp.viewpointName;
    const h = Math.max(0, parseFloat(hours) || 0);
    if (h <= 0) { alert('追加時間を入力してください'); return; }
    const vpTasks = tasksRef.current.filter(t => t.projectName === projectName && t.viewpointName === viewpointName && t.assignee === vp.assignee);
    if (vpTasks.length === 0) { alert('対象の視点が見つかりません'); return; }
    const ref = vpTasks.reduce((a, b) => ((b.createdAt || 0) > (a.createdAt || 0) ? b : a), vpTasks[0]);
    const maxOrder = vpTasks.reduce((m, t) => Math.max(m, t.stepOrder ?? 0), 0);
    const base = Date.now();
    const rec = {
      id: `task-${base}-${Math.random().toString(36).slice(2, 7)}`,
      projectName,
      projectNameInternal: ref.projectNameInternal || '',
      companyName: ref.companyName || '',
      customerContact: ref.customerContact || '',
      viewpointName,
      stepName: (stepName || '追加修正').trim() || '追加修正',
      stepOrder: maxOrder + 1,
      assignee: ref.assignee,
      priority: ref.priority,
      hours: h, completedHours: 0,
      manualStart: null, status: 'pending', completedAt: null, createdAt: base,
    };
    saveTasks(prev => normalizePriorities([...prev, rec]));
  };
  // ③ 遅延（この視点の最後のステップの終了時間指定を新しい終了予定へ動かし、
  //    差分の稼働時間ぶん制作時間を加算＋遅延履歴を記録）
  const endPromptDelay = (vp, currentEndTs, newEndTs) => {
    if (newEndTs <= currentEndTs) { alert('新しい終了予定は現在の終了予定より後にしてください'); return; }
    const scheduledById = new Map(scheduled.active.map(t => [t.id, t]));
    const active = tasksRef.current
      .map(t => scheduledById.get(t.id) || t)
      .filter(t => t.projectName === vp.projectName && t.viewpointName === vp.viewpointName && t.assignee === vp.assignee && t.status !== 'done' && t.scheduledEnd);
    if (active.length === 0) { alert('対象の進行中タスクがありません'); return; }
    // 終了予定を決めている最後のステップ
    const last = active.reduce((a, b) => {
      const ta = startOfDay(a.scheduledEnd).getTime() + (a.scheduledEndMin || 0) * 60000;
      const tb = startOfDay(b.scheduledEnd).getTime() + (b.scheduledEndMin || 0) * 60000;
      return tb > ta ? b : a;
    });
    // 差分の稼働時間。新しい終了予定が稼働時間外（残業なしの夜間など）の場合は0でもよく、
    // その場合は終了時間の指定だけを動かす
    const addH = workingHoursBetweenTs(currentEndTs, newEndTs, last.assignee, settings);
    const newEndStr = dateToDtLocal(new Date(newEndTs));
    const delay = { at: Date.now(), from: currentEndTs, to: newEndTs };
    saveTasks(prev => normalizePriorities(prev.map(t =>
      t.id === last.id
        ? {
          ...t,
          hours: addH > 0 ? Math.round((t.hours + addH) * 10) / 10 : t.hours,
          // 終了時間の指定を新しい終了予定へ更新する。
          // 古い指定が残っていると終了予定がその時刻に固定され、ポップアップが直後に再表示されてしまう
          manualEnd: newEndStr,
          delays: [...(t.delays || []), delay],
        }
        : t
    )));
  };
  // ④ 後で（30分スヌーズ）。key は視点キー
  const endPromptSnooze = (key, endTs) => {
    setEndPromptFor(key, { snoozedUntil: Date.now() + 30 * 60000, lastPromptedEnd: endTs });
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

  // ドラッグ＆ドロップで優先順位を変更：src を同じ会社内で target の位置（直前）へ差し込む
  const [dragTaskId, setDragTaskId] = useState(null);
  const reorderTaskPriority = (srcId, targetId) => {
    if (!srcId || srcId === targetId) return;
    const src = tasksRef.current.find(t => t.id === srcId);
    const tgt = tasksRef.current.find(t => t.id === targetId);
    if (!src || !tgt) return;
    if ((src.companyName || '') !== (tgt.companyName || '')) {
      alert('優先順位は会社ごとの番号のため、同じ会社のタスク同士でのみ並び替えできます');
      return;
    }
    saveTasks(prev => {
      const company = src.companyName || '';
      const sorted = prev.filter(t => t.status !== 'done' && (t.companyName || '') === company)
        .sort((a, b) => (a.priority - b.priority) || (a.createdAt - b.createdAt));
      const moving = sorted.find(t => t.id === srcId);
      if (!moving) return prev;
      const rest = sorted.filter(t => t.id !== srcId);
      const ti = rest.findIndex(t => t.id === targetId);
      if (ti < 0) return prev;
      const newSeq = [...rest.slice(0, ti), moving, ...rest.slice(ti)];
      const prMap = new Map(newSeq.map((t, i) => [t.id, i + 1]));
      return normalizePriorities(prev.map(t => prMap.has(t.id) ? { ...t, priority: prMap.get(t.id) } : t));
    });
  };

  // now を渡すことで「経過に応じた終了予定の自動調整」が1分ごとに再計算される
  const scheduled = useMemo(() => {
    assignProjectColors(tasks); // 案件の色割り当てを更新（登録順・重複なし）
    syncHolidays(settings);     // 全体共通の祝日（非稼働日）をモジュールに反映
    return scheduleTasks(tasks, settings, projectOrder, now);
  }, [tasks, settings, projectOrder, now]);

  // 終了予定を過ぎた視点（機能B）。1分ごとの now と endPromptState で再評価
  const overdueViewpoints = useMemo(() => {
    const byViewpoint = new Map();
    for (const t of scheduled.active) {
      if (!t.projectName) continue;
      const key = `${t.assignee}::${t.projectName}::${t.viewpointName}`;
      if (!byViewpoint.has(key)) byViewpoint.set(key, []);
      byViewpoint.get(key).push(t);
    }
    const nowTs = now.getTime();
    const eps = settings.endPromptState || {};
    const result = [];
    for (const [key, vtasks] of byViewpoint) {
      const endTs = projectEndTs(vtasks);
      if (endTs == null || endTs > nowTs) continue;
      const st = eps[key] || {};
      const snoozeActive = st.snoozedUntil && st.snoozedUntil > nowTs && st.lastPromptedEnd === endTs;
      if (snoozeActive) continue;
      const first = vtasks[0];
      // 休みの担当者は対応できないため、終了超過ポップアップを出さない
      if (isOnLeaveAt(first.assignee, now, settings.absences || [])) continue;
      result.push({
        key,
        projectName: first.projectName,
        viewpointName: first.viewpointName,
        assignee: first.assignee,
        // 実効納期＝個別（視点）＞全体（案件）
        deadline: (vtasks.find(t => t.deadline) || {}).deadline || (vtasks.find(t => t.projectDeadline) || {}).projectDeadline || '',
        tasks: vtasks, endTs, endDate: new Date(endTs),
      });
    }
    return result.sort((a, b) => a.endTs - b.endTs);
  }, [scheduled.active, now, settings.endPromptState]);

  // 確認待ちが7日間更新されなければ、自動で完了タブへ移す
  useEffect(() => {
    if (!tasksLoaded) return;
    const SEVEN = 7 * 24 * 60 * 60 * 1000;
    const nowMs = now.getTime();
    const isStale = (t) => t.reviewState === 'waiting' && t.reviewUpdatedAt && (nowMs - t.reviewUpdatedAt) >= SEVEN;
    if (!tasksRef.current.some(isStale)) return;
    saveTasks(prev => prev.map(t => isStale(t) ? { ...t, reviewState: null } : t));
  }, [now, tasksLoaded]);
  const projectList = useMemo(() => [...new Set(tasks.map(t => t.projectName))].filter(Boolean), [tasks]);
  const projectInternalList = useMemo(() => [...new Set(tasks.map(t => t.projectNameInternal))].filter(Boolean), [tasks]);
  const viewpointList = useMemo(() => [...new Set(tasks.map(t => t.viewpointName))].filter(Boolean), [tasks]);
  // 制作担当者の候補：従業員マスタ ＋ 既存タスクの担当者
  // 従業員マスタの並び順 ＝ 担当者の表示順（カレンダー・担当者別・サマリー等）
  const assigneeOrder = useMemo(() => employeeMaster.map(e => e.name).filter(Boolean), [employeeMaster]);
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
    { id: 'message', icon: <MessageSquare size={15} />, label: 'サマリー' },
    { id: 'done', icon: <CheckCircle2 size={15} />, label: '完了' },
    { id: 'master', icon: <Folder size={15} />, label: 'マスタ' },
    { id: 'memo', icon: <StickyNote size={15} />, label: 'タスクメモ' },
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
                badge={item.id === 'done' ? scheduled.doneFinal.length : null} />
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
            <div style={{ maxWidth: 1600, margin: '16px auto 0', borderTop: `1px solid ${colors.border}`, paddingTop: 12, fontSize: 11, color: colors.textMute }}>
              残業・欠勤（休日・不在）の登録は「マスタ」タブに移動しました。
            </div>
          </div>
        )}
      </header>

      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '28px' }}>
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
            moveUp={moveUp} moveDown={moveDown} changePriority={changePriority} dragTaskId={dragTaskId} onDragTask={setDragTaskId} onDropTask={reorderTaskPriority} addProgress={addProgress} setTaskHours={setTaskHours} setTaskCompletedHours={setTaskCompletedHours} setTaskManualStart={setTaskManualStart} setTaskManualEnd={setTaskManualEnd} completeProject={completeProject} cancelProject={cancelProject} completeViewpoint={completeViewpoint}
            handleAddStepToViewpoint={handleAddStepToViewpoint} reassignViewpoint={reassignViewpoint} setViewpointDeadline={setViewpointDeadline} saveProjectInfo={saveProjectInfo} setProjectDeadline={setProjectDeadline}
            finalizeReview={finalizeReview} reopenReview={reopenReview} setReviewNote={setReviewNote} setReviewActualEnd={setReviewActualEnd}
            projectList={projectList} projectInternalList={projectInternalList} viewpointList={viewpointList} assigneeList={assigneeList} assigneeOrder={assigneeOrder}
            settings={settings} now={now}
            selectedAssignee={selectedAssignee} setSelectedAssignee={setSelectedAssignee} companyOrder={settings.companyOrder || []}
            onReorderAssignee={reorderAssigneeFromCalendar} onReorderProject={reorderProjectFromCalendar}
            colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
        )}
        {view === 'calendar' && (
          <>
          <CalendarView scheduled={scheduled} settings={settings} now={now} colors={colors} fontDisplay={fontDisplay} fontJP={fontJP}
            onEditProject={(p) => handleEditProject(p, true)} assigneeOrder={assigneeOrder}
            onReorderAssignee={reorderAssigneeFromCalendar} onReorderProject={reorderProjectFromCalendar} />
          {/* カレンダーから案件編集を開いた場合、入力へ遷移せずスケジュールのすぐ下にフォームを表示 */}
          {calendarEdit && editMode && (
            <div style={{ marginTop: 24 }}>
              <InputView embedded form={form} setForm={setForm} handleSubmit={handleSubmit} editingId={editingId} editMode={editMode}
                cancelEdit={() => { setEditingId(null); setEditMode(null); setForm(emptyForm); setCalendarEdit(false); }}
                tasks={tasks} scheduled={scheduled}
                projectOrder={projectOrder} saveProjectOrder={saveProjectOrderPartial}
                companyList={companyList} customerMaster={customerMaster}
                handleEdit={handleEdit} handleEditProject={handleEditProject} handleEditViewpoint={handleEditViewpoint}
                handleAddViewpointToProject={handleAddViewpointToProject}
                handleDeleteViewpoint={handleDeleteViewpoint}
                handleDelete={handleDelete} toggleStatus={toggleStatus}
                moveUp={moveUp} moveDown={moveDown} changePriority={changePriority} dragTaskId={dragTaskId} onDragTask={setDragTaskId} onDropTask={reorderTaskPriority} addProgress={addProgress} setTaskHours={setTaskHours} setTaskCompletedHours={setTaskCompletedHours} setTaskManualStart={setTaskManualStart} setTaskManualEnd={setTaskManualEnd} completeProject={completeProject} cancelProject={cancelProject} completeViewpoint={completeViewpoint}
                handleAddStepToViewpoint={handleAddStepToViewpoint} reassignViewpoint={reassignViewpoint} setViewpointDeadline={setViewpointDeadline} saveProjectInfo={saveProjectInfo} setProjectDeadline={setProjectDeadline}
                finalizeReview={finalizeReview} reopenReview={reopenReview} setReviewNote={setReviewNote} setReviewActualEnd={setReviewActualEnd}
                projectList={projectList} projectInternalList={projectInternalList} viewpointList={viewpointList} assigneeList={assigneeList} assigneeOrder={assigneeOrder}
                settings={settings} now={now}
                colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
            </div>
          )}
          </>
        )}
        {view === 'byAssignee' && (
          <AssigneeView scheduled={scheduled} selectedAssignee={selectedAssignee} setSelectedAssignee={setSelectedAssignee} now={now} assigneeOrder={assigneeOrder}
            companyOrder={settings.companyOrder || []} companyList={companyList} saveProjectInfo={saveProjectInfo} setProjectDeadline={setProjectDeadline}
            projectOrder={projectOrder} saveProjectOrder={saveProjectOrderPartial}
            handleEdit={handleEdit} handleEditProject={handleEditProject} handleEditViewpoint={handleEditViewpoint}
            handleAddViewpointToProject={handleAddViewpointToProject}
            handleDeleteViewpoint={handleDeleteViewpoint}
            handleDelete={handleDelete} toggleStatus={toggleStatus}
            moveUp={moveUp} moveDown={moveDown} changePriority={changePriority} dragTaskId={dragTaskId} onDragTask={setDragTaskId} onDropTask={reorderTaskPriority} addProgress={addProgress} setTaskHours={setTaskHours} setTaskCompletedHours={setTaskCompletedHours} setTaskManualStart={setTaskManualStart} setTaskManualEnd={setTaskManualEnd} completeProject={completeProject} cancelProject={cancelProject} completeViewpoint={completeViewpoint}
            handleAddStepToViewpoint={handleAddStepToViewpoint} reassignViewpoint={reassignViewpoint} setViewpointDeadline={setViewpointDeadline} assigneeList={assigneeList}
            colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
        )}
        {view === 'message' && (
          <MessageView scheduled={scheduled} settings={settings} colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} assigneeOrder={assigneeOrder} />
        )}
        {view === 'done' && (
          <DoneView scheduled={scheduled} toggleStatus={toggleStatus} handleDelete={handleDelete}
            setActualEnd={setActualEnd} handleEditProject={handleEditProject}
            colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
        )}
        {view === 'master' && (
          <MasterView
            customerMaster={customerMaster} saveCustomerMaster={saveCustomerMaster}
            employeeMaster={employeeMaster} saveEmployeeMaster={saveEmployeeMaster}
            settings={settings} assigneeList={assigneeList}
            addOvertime={addOvertime} removeOvertime={removeOvertime}
            addAbsence={addAbsence} removeAbsence={removeAbsence}
            addHolidays={addHolidays} removeHoliday={removeHoliday}
            saveCompanyOrder={saveCompanyOrder}
            usedCompanies={[...new Set(tasks.map(t => (t.companyName || '').trim()).filter(Boolean))]}
            colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
        )}
        {view === 'memo' && (
          <MemoView memos={memos} upsertMemo={upsertMemo} deleteMemo={deleteMemo} now={now}
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
        <DeadlineConfirmModal
          info={startMoveConfirm}
          onCancel={() => setStartMoveConfirm(null)}
          onSubmit={async (opts) => { setStartMoveConfirm(null); await performSubmit(opts); }}
          colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
      )}

      {overdueViewpoints.length > 0 && (
        <EndPromptModal
          viewpoints={overdueViewpoints} now={now} settings={settings}
          onComplete={endPromptComplete} onAddRevision={endPromptAddRevision}
          onDelay={endPromptDelay} onSnooze={endPromptSnooze}
          colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
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

// ============ 登録確認モーダル（開始移動・納期超過＋繰り上げ提案） ============
function DeadlineConfirmModal({ info, onCancel, onSubmit, colors, fontJP, fontDisplay }) {
  const violations = info.violations || [];
  const hasViolation = violations.length > 0;
  const reorder = info.reorder || {};
  const sameBump = reorder.sameBump || null;
  const globalBump = reorder.globalBump || null;
  // 既定は「並べ替えない（検討保留）」。並び順の入れ替えはユーザーが繰り上げ案を
  // 能動的に選んで「繰り上げて登録」を押したときだけ実行する（システムが勝手に入れ替えない）。
  const [choice, setChoice] = useState('defer');

  const fmtEnd = (b) => `${fmtMD(b.endDate)}(${dayName(b.endDate)}) ${minToTime(b.endMin)}`;
  const apply = () => {
    if (choice === 'same' && sameBump) onSubmit({ orderOverride: sameBump.order });
    else if (choice === 'global' && globalBump) onSubmit({ orderOverride: globalBump.order });
    else onSubmit({});
  };

  const optStyle = (active) => ({
    display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px',
    border: `1px solid ${active ? colors.accent : colors.border}`, borderRadius: 6,
    background: active ? colors.accentSoft : '#fff', cursor: 'pointer', marginBottom: 8,
  });
  const Radio = ({ value, title, desc, accent }) => (
    <label style={optStyle(choice === value)} onClick={() => setChoice(value)}>
      <input type="radio" name="reorderChoice" checked={choice === value} onChange={() => setChoice(value)} style={{ marginTop: 3 }} />
      <span>
        <span style={{ fontSize: 13, fontWeight: 600, color: accent || colors.text }}>{title}</span>
        {desc && <span style={{ display: 'block', fontSize: 11, color: colors.textMute, marginTop: 2, lineHeight: 1.6 }}>{desc}</span>}
      </span>
    </label>
  );

  return (
    <div onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, padding: 24, width: '100%', maxWidth: 460, maxHeight: '88vh', overflowY: 'auto', fontFamily: fontJP, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 17, margin: '0 0 12px 0', fontWeight: 600 }}>
          {hasViolation ? '納期超過の確認' : 'スケジュールの確認'}
        </h3>
        <div style={{ fontSize: 13, color: colors.text }}>
          {info.moved && (
            <>
              <p style={{ margin: '0 0 10px 0', lineHeight: 1.7 }}>
                指定した開始時間{' '}
                <strong>{info.requested ? `${fmtMD(info.requested.date)}(${dayName(info.requested.date)}) ${minToTime(info.requested.min)}` : ''}</strong>{' '}
                には空きがありません。実際の開始は{' '}
                <strong style={{ color: '#c46a16' }}>{fmtMD(info.actualDate)}({dayName(info.actualDate)}) {minToTime(info.actualMin)}</strong>{' '}になります。
              </p>
            </>
          )}

          {hasViolation && (
            <>
              <p style={{ margin: '0 0 6px 0', lineHeight: 1.7, color: colors.accent, fontWeight: 600 }}>
                ⚠ 終了予定が納期を超える視点があります
              </p>
              <div style={{ margin: '0 0 14px 0' }}>
                {violations.map((v, i) => {
                  const dl = new Date(v.deadline + 'T00:00:00');
                  return (
                    <p key={i} style={{ margin: '0 0 4px 0', lineHeight: 1.7, fontSize: 12 }}>
                      視点「{v.viewpointName}」：終了予定{' '}
                      <strong style={{ color: colors.accent }}>{fmtMD(v.endDate)}({dayName(v.endDate)}) {minToTime(v.endMin)}</strong>
                      {' '}＞ 納期 {fmtMD(dl)}（{dayName(dl)}）
                    </p>
                  );
                })}
              </div>

              <p style={{ margin: '0 0 8px 0', fontSize: 12, fontWeight: 600, color: colors.textMute }}>対応を選んでください</p>

              {sameBump && (
                <Radio value="same" accent={colors.progress}
                  title="✓ 同じ担当者の中で繰り上げる（推奨）"
                  desc={`「${sameBump.target}」より前に詰めます。終了予定 ${fmtEnd(sameBump)}（納期内）／他の担当者の予定は変えません。`} />
              )}
              {globalBump && (
                <Radio value="global"
                  title="全体の先頭へ繰り上げる（要確認）"
                  desc={`終了予定 ${fmtEnd(globalBump)}（納期内）。※納期がより早い案件より前に詰めるため、他の案件の納期に影響する場合があります。`} />
              )}
              {!sameBump && !globalBump && (
                <p style={{ margin: '0 0 8px 0', fontSize: 12, color: colors.textMute, lineHeight: 1.7 }}>
                  並べ替えでは納期に間に合いません。納期の見直し・担当者の変更・制作時間の調整をご検討ください。
                </p>
              )}
              <Radio value="defer"
                title="後で検討する（このまま登録・検討保留）"
                desc="並べ替えずにこのまま登録します。納期超過の赤バッジが付くので、一覧から後で並べ替えできます。" />
            </>
          )}

          {!hasViolation && (
            <p style={{ margin: '8px 0 0 0', lineHeight: 1.7 }}>このまま登録しますか？</p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button type="button" onClick={onCancel}
            style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, color: colors.textMute }}>
            戻る
          </button>
          <button type="button" onClick={hasViolation ? apply : () => onSubmit({})}
            style={{ padding: '8px 18px', background: colors.text, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 600 }}>
            {hasViolation ? (choice === 'defer' ? 'このまま登録' : '繰り上げて登録') : 'このまま登録する'}
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

// ============ タスクメモビュー（Apple カレンダー風：スケジュール＋メモ） ============
const MEMO_COLORS = ['#c1272d', '#bc6c25', '#3a5a40', '#1d3557', '#6a4c93', '#00838f', '#ad1457', '#5d4037'];
function pad2(n) { return String(n).padStart(2, '0'); }
function todayStr(now) {
  const d = now instanceof Date ? now : new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function formatMemoDate(dateStr) {
  // 'YYYY-MM-DD' → '6月15日（月）' 形式
  const [y, m, d] = (dateStr || '').split('-').map(Number);
  if (!y || !m || !d) return dateStr || '';
  const dt = new Date(y, m - 1, d);
  const wd = ['日', '月', '火', '水', '木', '金', '土'][dt.getDay()];
  return `${m}月${d}日（${wd}）`;
}

function MemoView({ memos, upsertMemo, deleteMemo, now, colors, fontJP, fontDisplay }) {
  const blankMemo = () => ({
    id: null, title: '', date: todayStr(now), startTime: '09:00', endTime: '10:00',
    allDay: false, note: '', color: MEMO_COLORS[0],
  });
  const [editing, setEditing] = useState(null); // 編集中メモ（null=非表示）
  const [search, setSearch] = useState('');

  const today = todayStr(now);

  // 検索フィルタ → 日付・開始時刻順にソート
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = (memos || []).filter(m => {
      if (!q) return true;
      return (m.title || '').toLowerCase().includes(q) || (m.note || '').toLowerCase().includes(q);
    });
    return rows.slice().sort((a, b) => {
      if ((a.date || '') !== (b.date || '')) return (a.date || '').localeCompare(b.date || '');
      const at = a.allDay ? '' : (a.startTime || '');
      const bt = b.allDay ? '' : (b.startTime || '');
      return at.localeCompare(bt);
    });
  }, [memos, search]);

  // 日付ごとにグルーピング
  const grouped = useMemo(() => {
    const map = new Map();
    for (const m of filtered) {
      const key = m.date || '(日付なし)';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    }
    return [...map.entries()];
  }, [filtered]);

  const startNew = () => setEditing(blankMemo());
  const startEdit = (m) => setEditing({ ...m });

  const handleSave = () => {
    const e = editing;
    if (!(e.title || '').trim() && !(e.note || '').trim()) { setEditing(null); return; }
    const ts = Date.now();
    const memo = {
      ...e,
      title: (e.title || '').trim(),
      note: e.note || '',
      id: e.id || `memo_${ts}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: e.createdAt || ts,
      updatedAt: ts,
    };
    upsertMemo(memo);
    setEditing(null);
  };

  const handleDelete = () => {
    if (editing?.id) deleteMemo(editing.id);
    setEditing(null);
  };

  const inputStyle = {
    padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: 4,
    fontFamily: fontJP, fontSize: 14, color: colors.text, background: '#fff', width: '100%', boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: 11, color: colors.textMute, marginBottom: 4, display: 'block', letterSpacing: '0.04em' };

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {/* 左：アジェンダ（日付別リスト） */}
      <div style={{ flex: '1 1 460px', minWidth: 320 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '0.04em' }}>タスクメモ</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${colors.border}`, borderRadius: 4, padding: '5px 9px', background: '#fff' }}>
              <Search size={14} color={colors.textMute} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="検索"
                style={{ border: 'none', outline: 'none', fontFamily: fontJP, fontSize: 13, width: 110, color: colors.text }} />
            </div>
            <button onClick={startNew}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 500 }}>
              <Plus size={15} />新規メモ
            </button>
          </div>
        </div>

        {grouped.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.textMute, fontSize: 14, border: `1px dashed ${colors.border}`, borderRadius: 8 }}>
            <StickyNote size={32} color={colors.border} style={{ marginBottom: 12 }} />
            <div>{search ? '該当するメモがありません' : 'メモはまだありません。「新規メモ」から追加できます。'}</div>
          </div>
        ) : (
          grouped.map(([date, items]) => (
            <div key={date} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '0 0 8px 0', borderBottom: `1px solid ${colors.border}`, marginBottom: 10 }}>
                <span style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, color: date === today ? colors.accent : colors.text }}>
                  {formatMemoDate(date)}
                </span>
                {date === today && <span style={{ fontSize: 10, color: colors.accent, fontWeight: 600, letterSpacing: '0.08em' }}>今日</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(m => {
                  const selected = editing && editing.id === m.id;
                  return (
                    <div key={m.id} onClick={() => startEdit(m)}
                      style={{
                        display: 'flex', gap: 12, padding: '12px 14px', cursor: 'pointer',
                        background: selected ? colors.accentSoft : '#fff',
                        border: `1px solid ${selected ? colors.accent : colors.border}`, borderRadius: 6,
                        transition: 'border-color .12s',
                      }}>
                      {/* 時刻列 */}
                      <div style={{ width: 56, flexShrink: 0, textAlign: 'right', paddingTop: 1 }}>
                        {m.allDay ? (
                          <span style={{ fontSize: 11, color: colors.textMute, fontWeight: 600 }}>終日</span>
                        ) : (
                          <>
                            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, fontFamily: fontDisplay }}>{m.startTime || ''}</div>
                            {m.endTime && <div style={{ fontSize: 11, color: colors.textMute }}>{m.endTime}</div>}
                          </>
                        )}
                      </div>
                      {/* カラーバー */}
                      <div style={{ width: 4, borderRadius: 2, background: m.color || MEMO_COLORS[0], flexShrink: 0 }} />
                      {/* 本文 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: m.note ? 3 : 0 }}>
                          {m.title || '（無題）'}
                        </div>
                        {m.note && (
                          <div style={{ fontSize: 12, color: colors.textMute, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>
                            {m.note}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 右：編集パネル（Apple カレンダーのイベント編集風） */}
      {editing && (
        <div style={{ flex: '0 0 320px', position: 'sticky', top: 20, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, margin: 0 }}>{editing.id ? 'メモを編集' : '新規メモ'}</h3>
            <button onClick={() => setEditing(null)} title="閉じる"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMute, padding: 2, display: 'flex' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>タイトル</label>
            <input value={editing.title} autoFocus
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="予定・タスク名" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>日付</label>
            <input type="date" value={editing.date}
              onChange={(e) => setEditing({ ...editing, date: e.target.value })} style={inputStyle} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, color: colors.text, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!editing.allDay}
              onChange={(e) => setEditing({ ...editing, allDay: e.target.checked })} />
            終日
          </label>

          {!editing.allDay && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>開始</label>
                <input type="time" value={editing.startTime || ''}
                  onChange={(e) => setEditing({ ...editing, startTime: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>終了</label>
                <input type="time" value={editing.endTime || ''}
                  onChange={(e) => setEditing({ ...editing, endTime: e.target.value })} style={inputStyle} />
              </div>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>カラー</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {MEMO_COLORS.map(c => (
                <button key={c} onClick={() => setEditing({ ...editing, color: c })} title={c}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: editing.color === c ? `2px solid ${colors.text}` : '2px solid transparent',
                    boxShadow: editing.color === c ? `0 0 0 2px #fff inset` : 'none',
                  }} />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>メモ</label>
            <textarea value={editing.note}
              onChange={(e) => setEditing({ ...editing, note: e.target.value })}
              placeholder="詳細・メモを入力" rows={5}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave}
              style={{ flex: 1, padding: '9px 14px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 600 }}>
              保存
            </button>
            {editing.id && (
              <button onClick={handleDelete} title="削除"
                style={{ padding: '9px 12px', background: 'transparent', color: colors.accent, border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Trash2 size={15} />削除
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ 入力ビュー ============
function InputView({ embedded, form, setForm, handleSubmit, editingId, editMode, cancelEdit, tasks, scheduled, projectOrder, saveProjectOrder, companyList, customerMaster, handleEdit, handleEditProject, handleEditViewpoint, handleAddViewpointToProject, handleDeleteViewpoint, handleDelete, toggleStatus, moveUp, moveDown, changePriority, dragTaskId, onDragTask, onDropTask, addProgress, setTaskHours, setTaskCompletedHours, setTaskManualStart, setTaskManualEnd, completeProject, cancelProject, completeViewpoint, handleAddStepToViewpoint, reassignViewpoint, setViewpointDeadline, saveProjectInfo, setProjectDeadline, finalizeReview, reopenReview, setReviewNote, setReviewActualEnd, projectList, projectInternalList, viewpointList, assigneeList, assigneeOrder, settings, now, selectedAssignee, setSelectedAssignee, companyOrder, onReorderAssignee, onReorderProject, colors, fontJP, fontDisplay }) {
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
  // 契約形態が「オフショア」の会社名の集合（進行中タスク一覧で「オフショア（その他）」へ集約する）
  const offshoreCompanies = useMemo(
    () => new Set((customerMaster || []).filter(c => c.contractType === 'offshore').map(c => (c.company || '').trim()).filter(Boolean)),
    [customerMaster]
  );
  // 入力ページ内の表示切替：進行中一覧 / カレンダー / 担当者別
  const [inputTab, setInputTab] = useState('list');
  // 新規タスク登録フォームの折畳み（カレンダー・担当者別では既定で折畳み）
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
    () => simulateFormSchedule(form, tasks, settings, projectOrder, now),
    [form, tasks, settings, projectOrder, now]
  );

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
  const filteredActive = useMemo(() => {
    if (!q) return scheduled.active;
    return scheduled.active.filter(t =>
      [t.projectName, t.projectNameInternal, t.companyName, t.customerContact, t.assignee, t.viewpointName, t.stepName, t.memo]
        .some(v => (v || '').toLowerCase().includes(q))
    );
  }, [scheduled.active, q]);
  // 進行中タスクのグループ表示：納期順（既定）／会社別（制作順）／担当者別（制作順）
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
    if ((f.projectName || f.projectNameInternal || f.companyName || f.customerContact || f.assignee || f.priority || f.projectDeadline || '').toString().trim()) return true;
    for (const vp of (f.viewpoints || [])) {
      if ((vp.viewpointName || '').trim() || (vp.assignee || '').trim()) return true;
      if ((vp.manualStart || '').trim() || (vp.manualEnd || '').trim() || (vp.deadline || '').trim()) return true;
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
      priority: '', memo: '', tentative: false, tentativeStart: '', tentativeEnd: '',
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
      {!embedded && atRiskProjects.length > 0 && !riskAck && (
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
                  : '新規タスク登録'}
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
            <label style={labelStyle}>全体納期（案件共通・任意）</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="date" value={form.projectDeadline || ''}
                onChange={(e) => setForm({ ...form, projectDeadline: e.target.value })}
                style={{ ...inputStyle, flex: '0 0 160px', width: 'auto' }} />
              {form.projectDeadline && (
                <button type="button" onClick={() => setForm({ ...form, projectDeadline: '' })}
                  style={{ background: 'transparent', border: `1px solid ${colors.border}`, padding: '6px 10px', borderRadius: 3, fontSize: 11, color: colors.textMute, cursor: 'pointer', fontFamily: fontJP }}>
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
            {(previewSchedule?.deadlineViolations || []).map((v, i) => {
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

                  {/* 視点ごとのスケジュール設定：開始時間・終了時間・納期 */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: 6,
                    padding: '8px 12px', background: '#faf7ef', borderBottom: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: colors.textMute, whiteSpace: 'nowrap', minWidth: 64, fontWeight: 600 }}>
                        開始時間
                      </span>
                      <input type="date" value={vp.manualStart ? vp.manualStart.split('T')[0] : ''}
                        onChange={(e) => setVpManualStart(vi, e.target.value, vp.manualStart ? (vp.manualStart.split('T')[1] || '') : '')}
                        style={{ ...inputStyle, width: 'auto', flex: '0 0 150px', padding: '6px 8px', fontSize: 12 }} />
                      <TimeSelect value={vp.manualStart ? (vp.manualStart.split('T')[1] || '') : ''}
                        onChange={(val) => setVpManualStart(vi, vp.manualStart ? vp.manualStart.split('T')[0] : '', val)}
                        colors={colors} fontJP={fontJP} allowEmpty />
                      {vp.manualStart && (
                        <button type="button" onClick={() => setVpManualStart(vi, '', '')}
                          style={{ background: 'transparent', border: `1px solid ${colors.border}`, padding: '6px 10px', borderRadius: 3, fontSize: 11, color: colors.textMute, cursor: 'pointer', fontFamily: fontJP }}>
                          クリア
                        </button>
                      )}
                      <span style={{ fontSize: 10, color: colors.textMute }}>任意・この視点の最初の未完了ステップに適用・差し込み優先</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: colors.textMute, whiteSpace: 'nowrap', minWidth: 64, fontWeight: 600 }}>
                        終了時間
                      </span>
                      <input type="date" value={vp.manualEnd ? vp.manualEnd.split('T')[0] : ''}
                        onChange={(e) => setVpManualEnd(vi, e.target.value, vp.manualEnd ? (vp.manualEnd.split('T')[1] || '') : '')}
                        style={{ ...inputStyle, width: 'auto', flex: '0 0 150px', padding: '6px 8px', fontSize: 12 }} />
                      <TimeSelect value={vp.manualEnd ? (vp.manualEnd.split('T')[1] || '') : ''}
                        onChange={(val) => setVpManualEnd(vi, vp.manualEnd ? vp.manualEnd.split('T')[0] : '', val)}
                        colors={colors} fontJP={fontJP} allowEmpty />
                      {vp.manualEnd && (
                        <button type="button" onClick={() => setVpManualEnd(vi, '', '')}
                          style={{ background: 'transparent', border: `1px solid ${colors.border}`, padding: '6px 10px', borderRadius: 3, fontSize: 11, color: colors.textMute, cursor: 'pointer', fontFamily: fontJP }}>
                          クリア
                        </button>
                      )}
                      <span style={{ fontSize: 10, color: colors.textMute }}>任意・作業終了予定。この視点の最後の未完了ステップに適用・次のタスクはこの時刻以降に開始</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: colors.textMute, whiteSpace: 'nowrap', minWidth: 64, fontWeight: 600 }}>
                        納期（個別）
                      </span>
                      <input type="date" value={vp.deadline || ''}
                        onChange={(e) => setVpDeadline(vi, e.target.value)}
                        style={{ ...inputStyle, width: 'auto', flex: '0 0 150px', padding: '6px 8px', fontSize: 12 }} />
                      {vp.deadline && (
                        <button type="button" onClick={() => setVpDeadline(vi, '')}
                          style={{ background: 'transparent', border: `1px solid ${colors.border}`, padding: '6px 10px', borderRadius: 3, fontSize: 11, color: colors.textMute, cursor: 'pointer', fontFamily: fontJP }}>
                          クリア
                        </button>
                      )}
                      <span style={{ fontSize: 10, color: colors.textMute }}>
                        任意・この視点の個別納期。未設定なら全体納期{form.projectDeadline ? `（${form.projectDeadline}）` : ''}を使用
                      </span>
                    </div>
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
          進行中タスク
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
        </div>

        {scheduled.active.length === 0 ? (
          <div style={{ background: colors.surface, border: `1px dashed ${colors.border}`, borderRadius: 6, padding: 48, textAlign: 'center', color: colors.textMute, fontSize: 13 }}>
            進行中のタスクがありません。上のフォームから登録してください。
          </div>
        ) : filteredActive.length === 0 ? (
          <div style={{ background: colors.surface, border: `1px dashed ${colors.border}`, borderRadius: 6, padding: 48, textAlign: 'center', color: colors.textMute, fontSize: 13 }}>
            「{searchQuery}」に一致する案件はありません。
          </div>
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
                        }}>{ts.length}件 / 残{remaining}h</span>
                      </button>
                    );
                  })}
                </div>
                {(currentA ? [currentA] : listAssignees).map(a => {
            const aTasks = filteredActive.filter(t => t.assignee === a);
            const aTotal = aTasks.reduce((s, t) => s + t.hours, 0);
            const aDone = aTasks.reduce((s, t) => s + (t.completedHours || 0), 0);
            const aGroups = groupByViewpoint(aTasks);
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
                    {aGroups.length}視点 ・ {aTasks.length}タスク ・ 完了 {aDone}h / 全 {aTotal}h ・
                    <span style={{ color: colors.accent, fontWeight: 600 }}> 残 {aTotal - aDone}h</span>
                  </div>
                </div>
                <ViewpointGroupList
                  groups={aGroups}
                  allActive={filteredActive} now={now}
                  companyOrder={settings.companyOrder || []}
                  projectOrder={projectOrder} saveProjectOrder={saveProjectOrder}
                  handleEdit={handleEdit} handleEditProject={handleEditProject} handleEditViewpoint={handleEditViewpoint}
                  handleAddViewpointToProject={handleAddViewpointToProject}
                  handleDeleteViewpoint={handleDeleteViewpoint}
                  handleDelete={handleDelete} toggleStatus={toggleStatus}
                  moveUp={moveUp} moveDown={moveDown} changePriority={changePriority} dragTaskId={dragTaskId} onDragTask={onDragTask} onDropTask={onDropTask} addProgress={addProgress} setTaskHours={setTaskHours} setTaskCompletedHours={setTaskCompletedHours} setTaskManualStart={setTaskManualStart} setTaskManualEnd={setTaskManualEnd} completeProject={completeProject} cancelProject={cancelProject} completeViewpoint={completeViewpoint}
                  handleAddStepToViewpoint={handleAddStepToViewpoint} reassignViewpoint={reassignViewpoint} setViewpointDeadline={setViewpointDeadline} saveProjectInfo={saveProjectInfo} setProjectDeadline={setProjectDeadline} companyList={companyList} assigneeList={assigneeList} offshoreCompanies={offshoreCompanies} defaultCollapsed
                  colors={colors} fontJP={fontJP} />
              </section>
            );
          })}
              </>
            );
          })()
        ) : (
          <ViewpointGroupList
            groups={groupByViewpoint(filteredActive)}
            allActive={filteredActive} now={now}
            companyOrder={settings.companyOrder || []}
            sortMode={listGroupMode === 'deadline' ? 'deadline' : 'production'}
            projectOrder={projectOrder} saveProjectOrder={saveProjectOrder}
            handleEdit={handleEdit} handleEditProject={handleEditProject} handleEditViewpoint={handleEditViewpoint}
            handleAddViewpointToProject={handleAddViewpointToProject}
            handleDeleteViewpoint={handleDeleteViewpoint}
            handleDelete={handleDelete} toggleStatus={toggleStatus}
            moveUp={moveUp} moveDown={moveDown} changePriority={changePriority} dragTaskId={dragTaskId} onDragTask={onDragTask} onDropTask={onDropTask} addProgress={addProgress} setTaskHours={setTaskHours} setTaskCompletedHours={setTaskCompletedHours} setTaskManualStart={setTaskManualStart} setTaskManualEnd={setTaskManualEnd} completeProject={completeProject} cancelProject={cancelProject} completeViewpoint={completeViewpoint}
            handleAddStepToViewpoint={handleAddStepToViewpoint} reassignViewpoint={reassignViewpoint} setViewpointDeadline={setViewpointDeadline} saveProjectInfo={saveProjectInfo} setProjectDeadline={setProjectDeadline} companyList={companyList} assigneeList={assigneeList} offshoreCompanies={offshoreCompanies} defaultCollapsed
            colors={colors} fontJP={fontJP} />
        )}
      </section>

      <ReviewSection
        review={scheduled.review} now={now}
        finalizeReview={finalizeReview} reopenReview={reopenReview} setReviewNote={setReviewNote} setReviewActualEnd={setReviewActualEnd}
        colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
      </>)}
      {inputTab === 'calendar' && (
        <CalendarView scheduled={scheduled} settings={settings} now={now} colors={colors} fontDisplay={fontDisplay} fontJP={fontJP}
          onEditProject={handleEditProject} assigneeOrder={assigneeOrder}
          onReorderAssignee={onReorderAssignee} onReorderProject={onReorderProject} />
      )}
      {inputTab === 'assignee' && (
        <AssigneeView scheduled={scheduled} selectedAssignee={selectedAssignee} setSelectedAssignee={setSelectedAssignee} now={now} assigneeOrder={assigneeOrder}
          companyOrder={companyOrder} companyList={companyList} saveProjectInfo={saveProjectInfo} setProjectDeadline={setProjectDeadline}
          projectOrder={projectOrder} saveProjectOrder={saveProjectOrder}
          handleEdit={handleEdit} handleEditProject={handleEditProject} handleEditViewpoint={handleEditViewpoint}
          handleAddViewpointToProject={handleAddViewpointToProject}
          handleDeleteViewpoint={handleDeleteViewpoint}
          handleDelete={handleDelete} toggleStatus={toggleStatus}
          moveUp={moveUp} moveDown={moveDown} changePriority={changePriority} dragTaskId={dragTaskId} onDragTask={onDragTask} onDropTask={onDropTask} addProgress={addProgress} setTaskHours={setTaskHours} setTaskCompletedHours={setTaskCompletedHours} setTaskManualStart={setTaskManualStart} setTaskManualEnd={setTaskManualEnd} completeProject={completeProject} cancelProject={cancelProject} completeViewpoint={completeViewpoint}
          handleAddStepToViewpoint={handleAddStepToViewpoint} reassignViewpoint={reassignViewpoint} setViewpointDeadline={setViewpointDeadline} assigneeList={assigneeList}
          colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
      )}
    </div>
  );
}

// ============ 確認待ちセクション（視点完了後の確認フェーズ） ============
// 進行中タスクの下に表示。視点を完了すると、完了タブへ行く前にここへ入る。
// 追加修正があればメモを記入でき、3日更新がないとグレー、7日でアプリが自動的に完了タブへ移す。
const REVIEW_GRAY_DAYS = 3;
const REVIEW_AUTO_DONE_DAYS = 7;
function ReviewSection({ review, now, finalizeReview, reopenReview, setReviewNote, setReviewActualEnd, colors, fontJP, fontDisplay }) {
  if (!review || review.length === 0) return null;
  // 視点単位にまとめ、確認待ちのメタ情報（開始・最終更新・メモ・完了日・完了時刻）を付与
  const groups = groupByViewpoint(review).map(g => {
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

  return (
    <section>
      <h2 style={{ fontFamily: fontDisplay, fontSize: 18, margin: '0 0 4px 0', fontWeight: 500, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        確認待ち
        <span style={{ fontSize: 12, color: colors.textMute, fontFamily: fontJP }}>
          {groups.length}件 ・ 視点完了後の確認フェーズ（{REVIEW_AUTO_DONE_DAYS}日更新がなければ自動で完了へ）
        </span>
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {groups.map(g => (
          <ReviewCard key={g.key} g={g} now={now}
            finalizeReview={finalizeReview} reopenReview={reopenReview} setReviewNote={setReviewNote} setReviewActualEnd={setReviewActualEnd}
            colors={colors} fontJP={fontJP} />
        ))}
      </div>
    </section>
  );
}

function ReviewCard({ g, now, finalizeReview, reopenReview, setReviewNote, setReviewActualEnd, colors, fontJP }) {
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
            title="確認待ちをやめて進行中タスクへ戻します"
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

// ============ 案件情報インライン編集パネル ============
// 進行中タスクの案件ヘッダーから、案件情報（案件名・会社名・お客様担当者・メモ・仮案件）を
// その場で編集する。保存すると案件の全タスクへ反映される。
function ProjectInfoEditor({ pg, companyList, onSave, onCancel, colors, fontJP }) {
  const [v, setV] = useState({
    projectName: pg.projectName === '(案件名未設定)' ? '' : (pg.projectName || ''),
    projectNameInternal: pg.projectNameInternal || '',
    companyName: pg.companyName || '',
    customerContact: pg.customerContact || '',
    memo: pg.memo || '',
    tentative: !!pg.tentative,
    tentativeStart: pg.tentativeStart || '',
    tentativeEnd: pg.tentativeEnd || '',
  });
  const set = (k, val) => setV(p => ({ ...p, [k]: val }));
  const inputStyle = {
    width: '100%', padding: '8px 10px', boxSizing: 'border-box',
    border: `1px solid ${colors.border}`, borderRadius: 4,
    fontFamily: fontJP, fontSize: 13, background: '#fff', color: colors.text, outline: 'none',
  };
  const labelStyle = { display: 'block', fontSize: 11, color: colors.textMute, marginBottom: 4 };
  return (
    <div style={{
      background: '#fbf9f4', border: `1px solid ${colors.border}`,
      borderLeft: `4px solid ${getProjectColor(pg.projectName)}`, borderRadius: 4, padding: 14, marginLeft: 22,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: colors.text }}>
        案件情報を編集（この案件の全タスク・完了済み含むに反映）
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div>
          <label style={labelStyle}>社外案件名</label>
          <input type="text" value={v.projectName} onChange={(e) => set('projectName', e.target.value)} placeholder="例: 〇〇マンション" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>社内案件名（任意）</label>
          <input type="text" value={v.projectNameInternal} onChange={(e) => set('projectNameInternal', e.target.value)} placeholder="例: TAMAZEN.58-6" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>会社名</label>
          <input type="text" list="inline-company-list" value={v.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="会社名" style={inputStyle} />
          <datalist id="inline-company-list">{(companyList || []).map(c => <option key={c} value={c} />)}</datalist>
        </div>
        <div>
          <label style={labelStyle}>お客様担当者（任意）</label>
          <input type="text" value={v.customerContact} onChange={(e) => set('customerContact', e.target.value)} placeholder="お客様担当者" style={inputStyle} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>メモ（任意）</label>
          <input type="text" value={v.memo} onChange={(e) => set('memo', e.target.value)} placeholder="例: 6/20 受注確定予定" style={inputStyle} />
        </div>
      </div>
      <label style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 12,
        fontSize: 13, fontFamily: fontJP, color: v.tentative ? '#c46a16' : colors.text, fontWeight: v.tentative ? 700 : 400,
      }}>
        <input type="checkbox" checked={v.tentative} onChange={(e) => set('tentative', e.target.checked)}
          style={{ width: 15, height: 15, accentColor: '#c46a16', cursor: 'pointer' }} />
        仮案件（仮予定）として登録する
      </label>
      {v.tentative && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          <span style={{ fontSize: 12, color: '#c46a16', fontWeight: 600, whiteSpace: 'nowrap' }}>対応想定期間</span>
          <input type="date" value={v.tentativeStart} onChange={(e) => set('tentativeStart', e.target.value)}
            style={{ ...inputStyle, width: 'auto', flex: '0 0 160px' }} />
          <span style={{ fontSize: 12, color: colors.textMute }}>〜</span>
          <input type="date" value={v.tentativeEnd} onChange={(e) => set('tentativeEnd', e.target.value)}
            style={{ ...inputStyle, width: 'auto', flex: '0 0 160px' }} />
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button type="button" onClick={onCancel}
          style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.textMute }}>
          キャンセル
        </button>
        <button type="button" onClick={() => onSave(v)}
          style={{ padding: '7px 18px', background: colors.text, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Check size={14} /> 保存
        </button>
      </div>
    </div>
  );
}

// ============ 視点グループリスト ============
function ViewpointGroupList({ groups, allActive, now, companyOrder, projectOrder, saveProjectOrder, sortMode, handleEdit, handleEditProject, handleEditViewpoint, handleAddViewpointToProject, handleDeleteViewpoint, handleDelete, toggleStatus, moveUp, moveDown, changePriority, dragTaskId, onDragTask, onDropTask, addProgress, setTaskHours, setTaskCompletedHours, setTaskManualStart, setTaskManualEnd, completeProject, cancelProject, completeViewpoint, handleAddStepToViewpoint, reassignViewpoint, setViewpointDeadline, saveProjectInfo, setProjectDeadline, companyList, assigneeList, offshoreCompanies, defaultCollapsed, colors, fontJP }) {
  // 案件情報をインライン編集中の案件名（null = 非編集）
  const [editingInfo, setEditingInfo] = useState(null);
  // 契約形態「オフショア」の会社（お客様マスタ由来）。会社別表示で「オフショア（その他）」へ集約する。
  // 渡されない（担当者別など）場合は集約しない。
  const isOffshore = (c) => !!offshoreCompanies && offshoreCompanies.has(c || '');
  const groupKeyOf = (c) => isOffshore(c) ? 'オフショア（その他）' : (c || '');
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
          memo: g.memo || '',
          tentative: !!g.tentative,
          tentativeStart: g.tentativeStart || '',
          tentativeEnd: g.tentativeEnd || '',
          deadline: g.deadline || '',           // 表示・納期順ソート用＝視点ごと実効納期の最早
          projectDeadline: g.projectDeadline || '', // 全体納期（案件共通）
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
      if (!pg.memo && g.memo) pg.memo = g.memo;
      if (g.tentative) pg.tentative = true;
      if (!pg.tentativeStart && g.tentativeStart) pg.tentativeStart = g.tentativeStart;
      if (!pg.tentativeEnd && g.tentativeEnd) pg.tentativeEnd = g.tentativeEnd;
      // 案件の納期 ＝ 視点ごとの実効納期のうち最も早いもの（表示・納期順ソート用）
      if (g.deadline && (!pg.deadline || g.deadline < pg.deadline)) pg.deadline = g.deadline;
      // 全体納期（案件共通）はどの視点でも同じ値（最初に見つかったもの）
      if (g.projectDeadline && !pg.projectDeadline) pg.projectDeadline = g.projectDeadline;
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

  // 会社ごとに「必ず1グループ」にまとめる（同じ会社が複数箇所に割れない）。
  // 会社の並びは companyOrder ベース。会社内の案件は orderedProjectGroups の相対順（優先順位・ドラッグ）を維持。
  // 納期順モード（sortMode === 'deadline'）では会社で分けず、納期の早い順の1リストにする
  const companySections = useMemo(() => {
    if (sortMode === 'deadline') {
      const sorted = [...orderedProjectGroups].sort((a, b) => {
        const da = a.deadline || '9999-12-31';
        const db = b.deadline || '9999-12-31';
        if (da !== db) return da < db ? -1 : 1;
        return 0; // 同じ納期・納期なし同士は制作順を維持（stable sort）
      });
      // 納期の日付ごとにグループ分け（sorted は納期順なので Map の挿入順＝日付順）
      const dmap = new Map();
      for (const pg of sorted) {
        const key = pg.deadline || ''; // '' = 納期未設定（最後に並ぶ）
        if (!dmap.has(key)) dmap.set(key, []);
        dmap.get(key).push(pg);
      }
      return [...dmap.entries()].map(([deadline, projects]) => ({
        companyName: '',
        deadlineGroup: deadline, // 'YYYY-MM-DD' または '' （納期未設定）
        projects,
        remaining: projects.reduce((s, pg) => s + (pg.totalHours - pg.completedHours), 0),
      }));
    }
    const map = new Map();
    for (const pg of orderedProjectGroups) {
      // 契約形態オフショアの会社は「オフショア（その他）」グループに集約（会社名は各案件カードに表示）
      const c = groupKeyOf(pg.companyName || '');
      if (!map.has(c)) map.set(c, { companyName: c, projects: [], remaining: 0 });
      const sec = map.get(c);
      sec.projects.push(pg);
      sec.remaining += (pg.totalHours - pg.completedHours);
    }
    return [...map.values()].sort((a, b) => compareCompanyDisplay(a.companyName, b.companyName, companyOrder));
  }, [orderedProjectGroups, companyOrder, sortMode, offshoreCompanies]);

  // 実際に表示される案件の並び（会社グループを連結した順）。ドラッグ並べ替えの基準にする
  const displayedProjectNames = useMemo(
    () => companySections.flatMap(s => s.projects.map(p => p.projectName)),
    [companySections]
  );

  // ドラッグ＆ドロップの状態（マウス／デスクトップ）
  const [dragSource, setDragSource] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  // 並び替え：source を target の手前に挿入した新しい順序を返す
  const computeReorder = (sourceName, targetName) => {
    const currentOrder = [...displayedProjectNames];
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
    const order = [...displayedProjectNames];
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
  // 進行中一覧（defaultCollapsed）は標準で全案件を閉じる（データ初回到着時に1回だけ。以後は手動操作を尊重）
  const didInitCollapse = useRef(false);
  useEffect(() => {
    if (defaultCollapsed && !didInitCollapse.current && orderedProjectGroups.length > 0) {
      setCollapsed(new Set(orderedProjectGroups.map(p => p.projectName)));
      didInitCollapse.current = true;
    }
  }, [defaultCollapsed, orderedProjectGroups]);
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
        <div key={section.deadlineGroup !== undefined ? 'deadline::' + section.deadlineGroup : 'company::' + section.companyName} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {section.deadlineGroup !== undefined ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
              {(() => {
                if (!section.deadlineGroup) {
                  return (
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: colors.textMute,
                      background: '#eee', borderRadius: 12,
                      padding: '4px 14px', whiteSpace: 'nowrap',
                    }}>納期未設定</span>
                  );
                }
                const dl = new Date(section.deadlineGroup + 'T00:00:00');
                const overdue = section.deadlineGroup < fmtYMD(now);
                return (
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: '#fff',
                    background: overdue ? '#c0392b' : colors.accent, borderRadius: 12,
                    padding: '4px 14px', whiteSpace: 'nowrap',
                  }}>納期 {fmtMD(dl)}（{dayName(dl)}）{overdue ? ' 超過' : ''}</span>
                );
              })()}
              <span style={{ fontSize: 11, color: colors.textMute }}>
                {section.projects.length}案件 ・ 残 {section.remaining}h
              </span>
            </div>
          ) : section.companyName && (
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
        // 納期順モードでは並び順は納期で決まるため手動並び替えは無効
        const draggable = !!saveProjectOrder && sortMode !== 'deadline';
        const isDragSource = dragSource === pg.projectName;
        const isDragOver = dragOver === pg.projectName && dragSource && dragSource !== pg.projectName;
        const isFirstInSection = secIdx === 0;
        const isLastInSection = secIdx === section.projects.length - 1;
        // ===== 状態に応じた背景色 =====
        // 黄: 作業が始まった案件 / オレンジ: 本日納品予定（終了予定が本日） /
        // 赤: 納期（本日 or 超過）があるのに本日納品予定でない（間に合わない恐れ）
        const todayYmd = fmtYMD(now);
        const endYmd = pg.scheduledEnd ? fmtYMD(pg.scheduledEnd) : null;
        const startedTs = pg.scheduledStart ? pg.scheduledStart.getTime() + (pg.scheduledStartMin || 0) * 60000 : null;
        const started = startedTs != null && startedTs <= now.getTime();
        const dueToday = endYmd != null && endYmd === todayYmd;
        const deadlinePassed = !!pg.deadline && pg.deadline <= todayYmd;
        const atRisk = deadlinePassed && !dueToday;
        const headerBg = atRisk ? '#fbdcdc' : dueToday ? '#ffe6c9' : started ? '#fdf3a6' : '#fff';
        const nameColor = deadlinePassed ? '#c1272d' : colors.text;
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
                background: headerBg, border: `1px solid ${isDragOver ? colors.accent : (atRisk ? '#c1272d' : colors.border)}`,
                borderLeft: `4px solid ${atRisk ? '#c1272d' : pcolor}`,
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
              {/* 折りたたみ＋各バッジ＋案件名を固定幅にまとめ、案件名は見切れ表示。
                  これで案件名の長さに関わらず、以降の要素がどの案件でも同じ位置に揃う */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 300px', minWidth: 0, overflow: 'hidden' }}>
                <button type="button" onClick={() => toggle(pg.projectName)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: colors.textMute, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                  title={isCollapsed ? '展開' : '折りたたみ'}>
                  {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                {pg.tentative && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#fff', background: '#c46a16',
                    borderRadius: 2, padding: '2px 6px', flexShrink: 0,
                  }} title="仮案件（仮予定）です。編集フォームで本登録に切り替えられます">仮</span>
                )}
                {pg.tentative && (pg.tentativeStart || pg.tentativeEnd) && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: '#c46a16', flexShrink: 0, whiteSpace: 'nowrap',
                  }} title="仮案件の対応想定期間（開始予定日〜終了予定日）">
                    {pg.tentativeStart ? pg.tentativeStart.slice(5).replace('-', '/') : ''}
                    〜
                    {pg.tentativeEnd ? pg.tentativeEnd.slice(5).replace('-', '/') : ''}
                  </span>
                )}
                {(sortMode === 'deadline' || isOffshore(pg.companyName)) && pg.companyName && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: '#fff',
                    background: getProjectColor(pg.companyName), borderRadius: 10,
                    padding: '1px 8px', flexShrink: 0, maxWidth: 90, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }} title={pg.companyName}>{pg.companyName}</span>
                )}
                <span onClick={() => toggle(pg.projectName)}
                  title={pg.projectNameInternal ? `${pg.projectNameInternal}（${pg.projectName}）` : pg.projectName}
                  style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                  {pg.projectNameInternal ? (
                    <>
                      <span style={{ fontSize: 14, fontWeight: 600, color: nameColor }}>{pg.projectNameInternal}</span>
                      <span style={{ fontSize: 11, color: deadlinePassed ? '#c1272d' : colors.textMute, marginLeft: 6 }}>{pg.projectName}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 600, color: nameColor }}>{pg.projectName}</span>
                  )}
                </span>
              </div>
              {saveProjectInfo && (
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); setEditingInfo(editingInfo === pg.projectName ? null : pg.projectName); }}
                  title="案件情報をここで編集（案件名・社内案件名・会社名・お客様担当者・メモ・仮案件）"
                  style={{
                    background: editingInfo === pg.projectName ? colors.accentSoft : 'transparent',
                    border: `1px solid ${editingInfo === pg.projectName ? colors.accent : colors.border}`,
                    cursor: 'pointer', color: editingInfo === pg.projectName ? colors.accent : colors.textMute,
                    display: 'flex', alignItems: 'center', padding: '3px 5px', borderRadius: 3, flexShrink: 0,
                  }}>
                  <Edit2 size={12} />
                </button>
              )}
              {pg.customerContact && (
                <span title={`お客様: ${pg.customerContact}`} style={{ fontSize: 11, color: colors.textMute, whiteSpace: 'nowrap', flexShrink: 0, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  お客様: {pg.customerContact}
                </span>
              )}
              {setProjectDeadline ? (() => {
                // 案件ヘッダーで「全体納期」を直接編集（案件の全タスクに反映）。個別納期があれば各視点側が優先
                const todayYmd = fmtYMD(new Date());
                const endYmd = pg.scheduledEnd ? fmtYMD(pg.scheduledEnd) : null;
                const danger = pg.projectDeadline && (todayYmd > pg.projectDeadline || (endYmd && endYmd > pg.projectDeadline));
                const d = pg.projectDeadline ? new Date(pg.projectDeadline + 'T00:00:00') : null;
                return (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                    title="案件全体の納期（全体設定）。各視点に個別納期があればそちらが優先されます">
                    <span style={{ fontSize: 11, fontWeight: 700, color: danger ? '#c1272d' : '#7a8471' }}>全体納期{danger ? ' ⚠' : ''}</span>
                    <input type="date" value={pg.projectDeadline || ''}
                      onChange={(e) => setProjectDeadline(pg.projectName, e.target.value)}
                      style={{
                        fontFamily: fontJP, fontSize: 11, padding: '2px 4px',
                        border: `1px solid ${danger ? '#c1272d' : '#c9d4c2'}`, borderRadius: 2,
                        background: danger ? '#fbeaea' : '#eef2ea',
                        color: danger ? '#c1272d' : '#5a6a51', cursor: 'pointer',
                      }} />
                    {d && <span style={{ fontSize: 10, color: colors.textMute }}>（{dayName(d)}）</span>}
                    {pg.projectDeadline && (
                      <button type="button" title="全体納期をクリア（納期なしにする）"
                        onClick={() => setProjectDeadline(pg.projectName, '')}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMute, padding: 0, display: 'flex', alignItems: 'center' }}>
                        <X size={11} />
                      </button>
                    )}
                  </span>
                );
              })() : (pg.deadline && (() => {
                const todayYmd = fmtYMD(new Date());
                const endYmd = pg.scheduledEnd ? fmtYMD(pg.scheduledEnd) : null;
                const danger = todayYmd > pg.deadline || (endYmd && endYmd > pg.deadline);
                const d = new Date(pg.deadline + 'T00:00:00');
                return (
                  <span title={danger ? '納期を過ぎている、または終了予定が納期を超えています（視点ごとの納期のうち最早のもの）' : '納期（視点ごとの納期のうち最早のもの）'} style={{
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                    color: danger ? '#fff' : '#7a8471',
                    background: danger ? '#c1272d' : '#eef2ea',
                    border: danger ? 'none' : '1px solid #c9d4c2',
                    borderRadius: 2, padding: '1px 7px',
                  }}>納期 {fmtMD(d)}（{dayName(d)}）{danger ? ' ⚠' : ''}</span>
                );
              })())}
              {pg.memo && (
                <span title={pg.memo} style={{
                  fontSize: 11, color: '#8a7a4a', background: '#faf5e4', border: '1px solid #e8dcb8',
                  borderRadius: 2, padding: '1px 6px',
                  maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>📝 {pg.memo}</span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.textMute, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                {/* 1段目：担当者 ＋ 予定（開始〜終了） */}
                <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
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
                </span>
                {/* 2段目：視点・タスク・完了/全・残 */}
                <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span>{pg.viewpointGroups.length}視点</span>
                  <span>{pg.taskCount}タスク</span>
                  <span>完了 {pg.completedHours}h / 全 {pg.totalHours}h</span>
                  <span style={{ color: colors.accent, fontWeight: 600 }}>残 {remaining}h</span>
                </span>
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
              {/* 操作ボタンは記号＋色のみ（視点の追加は「案件を編集」の編集フォームから行う） */}
              {handleEditProject && (
                <button type="button" onClick={() => handleEditProject(pg.projectName)}
                  style={{
                    background: '#fff', border: `1px solid ${colors.border}`,
                    padding: 6, borderRadius: 3, cursor: 'pointer',
                    fontFamily: fontJP, color: colors.textMute,
                    display: 'flex', alignItems: 'center',
                  }}
                  title="案件を編集（視点の追加・案件名/コードの変更もこの画面から）">
                  <Edit2 size={14} />
                </button>
              )}
              {completeProject && (
                <button type="button" onClick={() => completeProject(pg.projectName)}
                  style={{
                    background: colors.progress, color: '#fff',
                    border: 'none', borderRadius: 3, padding: 6,
                    cursor: 'pointer', fontFamily: fontJP,
                    display: 'flex', alignItems: 'center',
                  }}
                  title="案件完了：この案件の未完了タスクを全て完了にして完了タブへ移動">
                  <CheckCircle2 size={14} />
                </button>
              )}
              {cancelProject && (
                <button type="button" onClick={() => cancelProject(pg.projectName)}
                  style={{
                    background: '#a05252', color: '#fff',
                    border: 'none', borderRadius: 3, padding: 6,
                    cursor: 'pointer', fontFamily: fontJP,
                    display: 'flex', alignItems: 'center',
                  }}
                  title="案件中止：この案件の未完了タスクを「中止」として完了タブへ移動（実績はそのまま・後続スケジュールに影響しない）">
                  <X size={14} />
                </button>
              )}
            </div>
            {editingInfo === pg.projectName && saveProjectInfo && (
              <ProjectInfoEditor pg={pg} companyList={companyList}
                onSave={(info) => { if (saveProjectInfo(pg.projectName, info)) setEditingInfo(null); }}
                onCancel={() => setEditingInfo(null)}
                colors={colors} fontJP={fontJP} />
            )}
            {!isCollapsed && pg.viewpointGroups.map(group => (
              // 視点カードは案件ヘッダーから1段インデント（全視点同じ深さで揃える）
              <div key={group.key} style={{ marginLeft: 22 }}>
              <ViewpointCard group={group} now={now}
                allSortedIds={allSortedIds}
                companyFirstIds={companyFirstIds} companyLastIds={companyLastIds}
                handleEdit={handleEdit} handleEditViewpoint={handleEditViewpoint}
                handleDeleteViewpoint={handleDeleteViewpoint}
                handleDelete={handleDelete} toggleStatus={toggleStatus}
                moveUp={moveUp} moveDown={moveDown} changePriority={changePriority} dragTaskId={dragTaskId} onDragTask={onDragTask} onDropTask={onDropTask} addProgress={addProgress} setTaskHours={setTaskHours} setTaskCompletedHours={setTaskCompletedHours} setTaskManualStart={setTaskManualStart} setTaskManualEnd={setTaskManualEnd} completeProject={completeProject} cancelProject={cancelProject} completeViewpoint={completeViewpoint}
                handleAddStepToViewpoint={handleAddStepToViewpoint} reassignViewpoint={reassignViewpoint} setViewpointDeadline={setViewpointDeadline} assigneeList={assigneeList}
                colors={colors} fontJP={fontJP} />
              </div>
            ))}
          </div>
        );
          })}
        </div>
      ))}
    </div>
  );
}

function ViewpointCard({ group, now, allSortedIds, companyFirstIds, companyLastIds, handleEdit, handleEditViewpoint, handleDeleteViewpoint, handleDelete, toggleStatus, moveUp, moveDown, changePriority, dragTaskId, onDragTask, onDropTask, addProgress, setTaskHours, setTaskCompletedHours, setTaskManualStart, setTaskManualEnd, completeProject, completeViewpoint, handleAddStepToViewpoint, reassignViewpoint, setViewpointDeadline, assigneeList, colors, fontJP }) {
  const projectColor = getProjectColor(group.projectName);
  const progressPct = group.totalHours > 0 ? (group.completedHours / group.totalHours) * 100 : 0;
  // 経過進捗（時間経過ベース・表示用）
  const elapsedHours = now ? group.tasks.reduce((s, t) => s + elapsedHoursForSlots(t.slots, now), 0) : 0;
  const elapsedPct = group.totalHours > 0 ? Math.min(100, (elapsedHours / group.totalHours) * 100) : 0;
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
            <span style={{ color: '#9c8e5e' }}>経過 {elapsedHours.toFixed(1)}h / 全 {group.totalHours}h</span>
            <span>完了 {group.completedHours}h</span>
            <span style={{ color: colors.accent, fontWeight: 600 }}>残 {group.remainingHours}h</span>
            {group.scheduledStart && (
              <span style={{ color: colors.accent, fontWeight: 500 }}>
                {fmtMD(group.scheduledStart)} {minToTime(group.scheduledStartMin)} 〜 {fmtMD(group.scheduledEnd)} {minToTime(group.scheduledEndMin)}
              </span>
            )}
            {(() => {
              const todayYmd = fmtYMD(new Date());
              const endYmd = group.scheduledEnd ? fmtYMD(group.scheduledEnd) : null;
              // 実効納期＝個別＞全体（group.deadline は集約済み）。危険判定は実効で行う
              const danger = group.deadline && (todayYmd > group.deadline || (endYmd && endYmd > group.deadline));
              const indiv = group.individualDeadline || '';
              const proj = group.projectDeadline || '';
              const inherited = !indiv && !!proj; // 個別なし＝全体納期を継承
              const dl = group.deadline ? new Date(group.deadline + 'T00:00:00') : null;
              // 読み取り専用フォールバック（ハンドラ未配線時）
              if (!setViewpointDeadline) {
                if (!group.deadline) return null;
                return (
                  <span title={danger ? 'この視点の納期を過ぎている、または終了予定が納期を超えています' : 'この視点の納期'} style={{
                    fontSize: 10, fontWeight: 700,
                    color: danger ? '#fff' : '#7a8471',
                    background: danger ? '#c1272d' : '#eef2ea',
                    border: danger ? 'none' : '1px solid #c9d4c2',
                    borderRadius: 2, padding: '1px 7px',
                  }}>納期 {fmtMD(dl)}（{dayName(dl)}）{danger ? ' ⚠' : ''}</span>
                );
              }
              return (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  title="この視点の個別納期。空にすると全体納期（案件共通）に従います。変更は視点内の全ステップに即反映されます">
                  <span style={{ fontSize: 10, fontWeight: 700, color: danger ? '#c1272d' : '#7a8471' }}>納期（個別）{danger ? ' ⚠' : ''}</span>
                  <input type="date" value={indiv}
                    onChange={(e) => setViewpointDeadline(group, e.target.value)}
                    style={{
                      fontFamily: fontJP, fontSize: 11, padding: '2px 4px',
                      border: `1px solid ${danger ? '#c1272d' : '#c9d4c2'}`, borderRadius: 2,
                      background: danger ? '#fbeaea' : '#eef2ea',
                      color: danger ? '#c1272d' : '#5a6a51', cursor: 'pointer',
                    }} />
                  {indiv && (
                    <button type="button" title="個別納期をクリア（全体納期に従う）"
                      onClick={() => setViewpointDeadline(group, '')}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMute, padding: 0, display: 'flex', alignItems: 'center' }}>
                      <X size={11} />
                    </button>
                  )}
                  {inherited && dl && (
                    <span style={{ fontSize: 10, color: danger ? '#c1272d' : colors.textMute }}>
                      全体 {fmtMD(dl)}（{dayName(dl)}）を適用中
                    </span>
                  )}
                </span>
              );
            })()}
          </div>
          {/* 進捗バー：経過進捗（薄色）の上に実績（濃色）を重ねる */}
          <div style={{ position: 'relative', height: 5, background: '#f0ebde', borderRadius: 2, overflow: 'hidden', marginTop: 6, maxWidth: 360 }}>
            <div style={{ position: 'absolute', inset: 0, width: `${elapsedPct}%`, background: '#d8cfa6', transition: 'width 0.3s' }} title={`経過 ${elapsedHours.toFixed(1)}h`} />
            <div style={{ position: 'absolute', inset: 0, width: `${progressPct}%`, background: colors.progress, transition: 'width 0.3s' }} title={`完了 ${group.completedHours}h`} />
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
          <StepRow key={task.id} task={task} now={now}
            showStepLabel={isMulti}
            onEdit={() => handleEdit(task)} onDelete={() => handleDelete(task.id)} onToggle={() => toggleStatus(task.id)}
            onMoveUp={() => moveUp(task.id)} onMoveDown={() => moveDown(task.id)}
            onChangePriority={(v) => changePriority(task.id, v)}
            dragTaskId={dragTaskId} onDragTask={onDragTask} onDropTask={onDropTask}
            onAddProgress={(d) => addProgress(task.id, d)}
            onSetHours={(h) => setTaskHours(task.id, h)}
            onSetCompletedHours={(c) => setTaskCompletedHours(task.id, c)}
            onSetManualStart={setTaskManualStart ? ((v) => setTaskManualStart(task.id, v)) : null}
            onSetManualEnd={setTaskManualEnd ? ((v) => setTaskManualEnd(task.id, v)) : null}
            canMoveUp={companyFirstIds ? !companyFirstIds.has(task.id) : globalIdx > 0}
            canMoveDown={companyLastIds ? !companyLastIds.has(task.id) : globalIdx < allSortedIds.length - 1}
            isLast={idx === group.tasks.length - 1}
            colors={colors} fontJP={fontJP} />
        );
      })}
    </div>
  );
}

function StepRow({ task, now, showStepLabel, onEdit, onDelete, onToggle, onMoveUp, onMoveDown, onChangePriority, dragTaskId, onDragTask, onDropTask, onAddProgress, onSetHours, onSetCompletedHours, onSetManualStart, onSetManualEnd, canMoveUp, canMoveDown, isLast, colors, fontJP }) {
  const [editingPriority, setEditingPriority] = useState(false);
  const [priorityInput, setPriorityInput] = useState(String(task.priority));
  const [dragHover, setDragHover] = useState(false);
  const [editingStart, setEditingStart] = useState(false);
  const [startInput, setStartInput] = useState('');
  const [editingEnd, setEditingEnd] = useState(false);
  const [endInput, setEndInput] = useState('');
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

  // 開始時間指定の編集を開始（既定値：現在の指定 → 無ければ現在のスケジュール開始）
  const openStartEditor = () => {
    let init = task.manualStart || '';
    if (!init && task.scheduledStart) {
      init = dateToDtLocal(new Date(startOfDay(task.scheduledStart).getTime() + (task.scheduledStartMin || 0) * 60000));
    }
    setStartInput(init);
    setEditingStart(true);
  };
  const commitStart = () => {
    setEditingStart(false);
    if (!onSetManualStart) return;
    if ((startInput || '') !== (task.manualStart || '')) onSetManualStart(startInput || '');
  };

  // 終了予定指定の編集を開始（既定値：現在の指定 → 無ければ現在のスケジュール終了）
  const openEndEditor = () => {
    let init = task.manualEnd || '';
    if (!init && task.scheduledEnd) {
      init = dateToDtLocal(new Date(startOfDay(task.scheduledEnd).getTime() + (task.scheduledEndMin || 0) * 60000));
    }
    setEndInput(init);
    setEditingEnd(true);
  };
  const commitEnd = () => {
    setEditingEnd(false);
    if (!onSetManualEnd) return;
    if ((endInput || '') !== (task.manualEnd || '')) onSetManualEnd(endInput || '');
  };

  const completed = task.completedHours || 0;
  const remaining = Math.max(0, task.hours - completed);
  const progressPct = task.hours > 0 ? Math.min(100, (completed / task.hours) * 100) : 0;
  const elapsed = now ? elapsedHoursForSlots(task.slots, now) : 0;
  const elapsedPct = task.hours > 0 ? Math.min(100, (elapsed / task.hours) * 100) : 0;
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
    <div
      onDragOver={(e) => { if (onDropTask && dragTaskId && dragTaskId !== task.id) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (!dragHover) setDragHover(true); } }}
      onDragLeave={() => { if (dragHover) setDragHover(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setDragHover(false);
        const src = e.dataTransfer.getData('text/plain') || dragTaskId;
        if (src && onDropTask) onDropTask(src, task.id);
        if (onDragTask) onDragTask(null);
      }}
      style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 18px',
      borderBottom: isLast ? 'none' : `1px solid ${colors.border}`,
      background: '#fff',
      opacity: dragTaskId === task.id ? 0.5 : 1,
      boxShadow: dragHover && dragTaskId && dragTaskId !== task.id ? `0 0 0 2px ${colors.accent} inset` : 'none',
    }}>
      {onDropTask && (
        <span draggable
          onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', task.id); if (onDragTask) onDragTask(task.id); }}
          onDragEnd={() => { if (onDragTask) onDragTask(null); }}
          title="ドラッグして優先順位を変更（同じ会社内の好きな位置へ）"
          style={{ cursor: 'grab', color: colors.textMute, display: 'flex', flexShrink: 0 }}>
          <GripVertical size={13} />
        </span>
      )}
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
          <span style={{ color: '#9c8e5e' }} title="時間経過ベースの自動進捗">経過 {elapsed.toFixed(1)}h / 全 {task.hours}h</span>
          {task.scheduledStart && (
            <span style={{ color: colors.accent, fontWeight: 500 }}>
              {fmtMD(task.scheduledStart)} {minToTime(task.scheduledStartMin)}
              {!isSameDay(task.scheduledStart, task.scheduledEnd)
                ? ` 〜 ${fmtMD(task.scheduledEnd)} ${minToTime(task.scheduledEndMin)}`
                : ` 〜 ${minToTime(task.scheduledEndMin)}`}
            </span>
          )}
          {editingStart ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="datetime-local" value={startInput} autoFocus
                onChange={(e) => setStartInput(e.target.value)}
                onBlur={commitStart}
                onKeyDown={(e) => { if (e.key === 'Enter') commitStart(); if (e.key === 'Escape') setEditingStart(false); }}
                style={{ padding: '2px 4px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 11 }} />
              <button type="button" onMouseDown={(e) => { e.preventDefault(); setStartInput(''); setEditingStart(false); if (onSetManualStart && task.manualStart) onSetManualStart(''); }}
                style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '2px 6px', fontSize: 10, color: colors.textMute, cursor: 'pointer', fontFamily: fontJP }}>
                解除
              </button>
            </span>
          ) : task.manualStart ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '1px 5px', background: '#fce8e8', color: colors.accent, borderRadius: 2 }}>
              <button type="button" onClick={onSetManualStart ? openStartEditor : undefined}
                title="クリックで開始時間指定を変更（自動スケジュールより優先）"
                style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit', fontSize: 'inherit', fontFamily: fontJP, cursor: onSetManualStart ? 'pointer' : 'default', fontWeight: 600 }}>
                開始指定 {(() => { const d = new Date(task.manualStart); return isNaN(d.getTime()) ? task.manualStart : `${d.getMonth() + 1}/${d.getDate()} ${minToTime(d.getHours() * 60 + d.getMinutes())}`; })()}
              </button>
              {onSetManualStart && (
                <button type="button" onClick={() => onSetManualStart('')}
                  title="開始時間指定を解除（自動スケジュールに戻す）"
                  style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', fontSize: 11, lineHeight: 1 }}>
                  ×
                </button>
              )}
            </span>
          ) : onSetManualStart ? (
            <button type="button" onClick={openStartEditor}
              title="このステップの開始時間を指定（自動スケジュールより優先・登録/解除可能）"
              style={{ background: 'transparent', border: `1px dashed ${colors.border}`, borderRadius: 2, padding: '1px 5px', fontSize: 10, color: colors.textMute, cursor: 'pointer', fontFamily: fontJP }}>
              ＋開始指定
            </button>
          ) : null}
          {editingEnd ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="datetime-local" value={endInput} autoFocus
                onChange={(e) => setEndInput(e.target.value)}
                onBlur={commitEnd}
                onKeyDown={(e) => { if (e.key === 'Enter') commitEnd(); if (e.key === 'Escape') setEditingEnd(false); }}
                style={{ padding: '2px 4px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 11 }} />
              <button type="button" onMouseDown={(e) => { e.preventDefault(); setEndInput(''); setEditingEnd(false); if (onSetManualEnd && task.manualEnd) onSetManualEnd(''); }}
                style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '2px 6px', fontSize: 10, color: colors.textMute, cursor: 'pointer', fontFamily: fontJP }}>
                解除
              </button>
            </span>
          ) : task.manualEnd ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '1px 5px', background: '#e8eefc', color: '#4a6da8', borderRadius: 2 }}>
              <button type="button" onClick={onSetManualEnd ? openEndEditor : undefined}
                title="クリックで終了予定の指定を変更（同じ担当者の次のタスクはこの時刻以降に開始）"
                style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit', fontSize: 'inherit', fontFamily: fontJP, cursor: onSetManualEnd ? 'pointer' : 'default', fontWeight: 600 }}>
                終了指定 {(() => { const d = new Date(task.manualEnd); return isNaN(d.getTime()) ? task.manualEnd : `${d.getMonth() + 1}/${d.getDate()} ${minToTime(d.getHours() * 60 + d.getMinutes())}`; })()}
              </button>
              {onSetManualEnd && (
                <button type="button" onClick={() => onSetManualEnd('')}
                  title="終了予定の指定を解除（自動スケジュールに戻す）"
                  style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', fontSize: 11, lineHeight: 1 }}>
                  ×
                </button>
              )}
            </span>
          ) : onSetManualEnd ? (
            <button type="button" onClick={openEndEditor}
              title="このステップの終了予定を指定（同じ担当者の次のタスクはこの時刻以降に開始・登録/解除可能）"
              style={{ background: 'transparent', border: `1px dashed ${colors.border}`, borderRadius: 2, padding: '1px 5px', fontSize: 10, color: colors.textMute, cursor: 'pointer', fontFamily: fontJP }}>
              ＋終了指定
            </button>
          ) : null}
          {task.delays && task.delays.length > 0 && (
            <span title={`遅延 ${task.delays.length}回`} style={{ fontSize: 10, padding: '1px 5px', background: '#fde0c8', color: '#9a5a12', borderRadius: 2, fontWeight: 600 }}>
              遅延履歴あり（{task.delays.length}）
            </span>
          )}
        </div>
        <div style={{ position: 'relative', height: 5, background: '#f0ebde', borderRadius: 2, overflow: 'hidden', maxWidth: 280 }}>
          <div style={{ position: 'absolute', inset: 0, width: `${elapsedPct}%`, background: '#d8cfa6', transition: 'width 0.3s' }} title={`経過 ${elapsed.toFixed(1)}h`} />
          <div style={{ position: 'absolute', inset: 0, width: `${progressPct}%`, background: colors.progress, transition: 'width 0.3s' }} title={`完了 ${completed}h`} />
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
function CalendarView({ scheduled, settings, now, colors, fontDisplay, onEditProject, fontJP, assigneeOrder, onReorderAssignee, onReorderProject }) {
  // ドラッグ＆ドロップ並び替え：担当者行（左端ラベル）と案件（タスクブロック）
  const [rowDrag, setRowDrag] = useState(null);
  const [rowDragOver, setRowDragOver] = useState(null);
  const [projDrag, setProjDrag] = useState(null);
  const today = startOfDay(new Date());
  // 表示モード：1日 / 週間 / 月間 / 全期間（従来のスクロール表示）
  const [viewMode, setViewMode] = useState('scroll');
  const [anchor, setAnchor] = useState(today);

  // モードごとに表示する営業日の列を決める
  const allDates = [];
  if (viewMode === 'day') {
    let d = startOfDay(anchor);
    while (isNonWorkingDay(d)) d = addDays(d, 1);
    allDates.push(d);
  } else if (viewMode === 'week') {
    // 週間表示は今週から3週間分の営業日（横タイムライン形式）
    const dow = (anchor.getDay() + 6) % 7; // 月曜=0
    const mon = addDays(startOfDay(anchor), -dow);
    for (let i = 0; i < 21; i++) {
      const d = addDays(mon, i);
      if (!isNonWorkingDay(d)) allDates.push(d);
    }
  } else if (viewMode === 'month') {
    const y = anchor.getFullYear(), m = anchor.getMonth();
    for (let d = startOfDay(new Date(y, m, 1)); d.getMonth() === m; d = addDays(d, 1)) {
      if (!isNonWorkingDay(d)) allDates.push(new Date(d));
    }
  } else {
    // 全期間：今日（休みなら翌営業日）を先頭に、未来の営業日を並べる。
    // 先頭＝今日 なので、初期表示で必ず左端が今日になる（過去日は表示しない）。
    let cursor = new Date(today);
    let count = 0;
    while (count < 72) {
      if (!isNonWorkingDay(cursor)) { allDates.push(new Date(cursor)); count++; }
      cursor = addDays(cursor, 1);
    }
  }
  const todayIndex = allDates.findIndex(d => isSameDay(d, today));
  // 全期間ビューで左端に置く列＝今日。今日が休み（土日・祝日）で一覧に無いときは
  // 「今日以降の最初の営業日」を左端にする（次の営業日を表示）。
  const leftEdgeIndex = todayIndex >= 0
    ? todayIndex
    : Math.max(0, allDates.findIndex(d => d.getTime() >= today.getTime()));

  // ナビゲーション（1日・週間・月間モード）
  const goStep = (dir) => {
    if (viewMode === 'day') {
      let d = addDays(startOfDay(anchor), dir);
      while (isNonWorkingDay(d)) d = addDays(d, dir);
      setAnchor(d);
    } else if (viewMode === 'week') {
      setAnchor(addDays(startOfDay(anchor), dir * 7));
    } else if (viewMode === 'month') {
      setAnchor(startOfDay(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1)));
    }
  };
  const rangeLabel = viewMode === 'day'
    ? `${fmtYMDJP(allDates[0])}（${dayName(allDates[0])}）`
    : viewMode === 'week'
      ? `${fmtMD(allDates[0])}（${dayName(allDates[0])}）〜 ${fmtMD(allDates[allDates.length - 1])}（${dayName(allDates[allDates.length - 1])}）`
      : viewMode === 'month'
        ? `${anchor.getFullYear()}年${anchor.getMonth() + 1}月`
        : '';

  const dailySlots = getDailySlots(settings);
  const morningSlot = dailySlots[0];
  const afternoonSlot = dailySlots[1];
  const morningHours = (morningSlot.end - morningSlot.start) / 60;
  const afternoonHours = (afternoonSlot.end - afternoonSlot.start) / 60;
  const hoursPerDay = getHoursPerDay(settings);

  const assignees = sortAssigneesByMaster([...new Set([...scheduled.active.map(t => t.assignee), ...scheduled.done.map(t => t.assignee)])], assigneeOrder);

  const matrix = {};
  for (const task of scheduled.active) {
    for (const slot of task.slots) {
      const key = fmtYMD(slot.date);
      if (!matrix[task.assignee]) matrix[task.assignee] = {};
      if (!matrix[task.assignee][key]) matrix[task.assignee][key] = [];
      matrix[task.assignee][key].push({ task, slot });
    }
  }
  // 完了タスクもグレーで表示（実終了時刻から遡って配置）
  for (const item of buildDoneSlots(scheduled.done, settings)) {
    const key = fmtYMD(item.slot.date);
    if (!matrix[item.task.assignee]) matrix[item.task.assignee] = {};
    if (!matrix[item.task.assignee][key]) matrix[item.task.assignee][key] = [];
    matrix[item.task.assignee][key].push(item);
  }
  // 各セル内のタスクは開始時刻順に
  for (const a in matrix) {
    for (const k in matrix[a]) {
      matrix[a][k].sort((x, y) => x.slot.startMin - y.slot.startMin);
    }
  }

  // 列幅：全期間=240px・週間=200px・月間=110px（横スクロール）、1日=画面幅に合わせる
  const labelWidth = 110;
  const isFlexWidth = viewMode === 'day';
  const dayCellWidth = viewMode === 'month' ? 110 : viewMode === 'week' ? 200 : 240;
  const colWidth = isFlexWidth ? `calc((100% - ${labelWidth}px) / ${allDates.length})` : dayCellWidth;
  const rowHeight = viewMode === 'day' ? 150 : 100;
  // 列が狭い月間はブロックを案件名1行のコンパクト表示にする
  const compact = viewMode === 'month';

  // 初期スクロール位置を「今日が左端」に設定（全期間・月間のみ。モード/期間の切替時に再設定）
  // 同じモード／期間の間は一度だけ実行し、以後はユーザーのスクロール位置を尊重する。
  // 初回はタスク未ロード（担当者0件で領域未描画）のことがあるため、データ到着後に再実行できるよう
  // assignees 件数なども依存に含め、didScrollKey で「同一モード/期間で1回だけ」を担保する。
  const scrollRef = useRef(null);
  const todayCellRef = useRef(null); // 全期間/月間グリッドの「今日（または翌営業日）」列ヘッダー
  const didScrollKey = useRef('');
  // useLayoutEffect ＝ 描画前に scrollLeft を確定（タブ表示直後のチラつき防止）。
  // 実際の列位置（offsetLeft）を読むことで強制リフローし、scrollWidth 未確定でも確実に反映させる。
  // タブ切替で再マウントされた直後にも効くよう rAF でも再設定する。
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const key = `${viewMode}|${fmtYMD(anchor)}`;
    if (isFlexWidth) { el.scrollLeft = 0; didScrollKey.current = key; return; }
    if (didScrollKey.current === key) return; // この モード/期間 では設定済み
    const apply = () => {
      const cell = todayCellRef.current;
      const target = cell ? Math.max(0, cell.offsetLeft - labelWidth) : leftEdgeIndex * dayCellWidth;
      el.scrollLeft = target;
    };
    apply();
    requestAnimationFrame(apply);
    didScrollKey.current = key;
  }, [viewMode, anchor, isFlexWidth, leftEdgeIndex, dayCellWidth, allDates.length, assignees.length]);

  // 現在時刻の縦ライン位置（今日の列の中の横位置）
  let nowLineX = null;
  if (now && todayIndex >= 0 && !isNonWorkingDay(now)) {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let frac;
    if (nowMin <= morningSlot.start) frac = 0;
    else if (nowMin < morningSlot.end) frac = (nowMin - morningSlot.start) / (morningSlot.end - morningSlot.start) * 0.5;
    else if (nowMin < afternoonSlot.start) frac = 0.5;
    else if (nowMin < afternoonSlot.end) frac = 0.5 + (nowMin - afternoonSlot.start) / (afternoonSlot.end - afternoonSlot.start) * 0.5;
    else frac = 1;
    nowLineX = isFlexWidth
      ? `calc(${labelWidth}px + (100% - ${labelWidth}px) * ${(todayIndex + frac) / allDates.length})`
      : labelWidth + (todayIndex + frac) * dayCellWidth;
  }

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

      {/* 表示モード切替＋期間ナビゲーション */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {[['day', '1日'], ['week', '週間'], ['month', '月間'], ['scroll', '全期間']].map(([m, label]) => (
          <button key={m} type="button"
            onClick={() => { setViewMode(m); setAnchor(today); }}
            style={tabStyle(viewMode === m, colors, fontJP)}>
            {label}
          </button>
        ))}
        {viewMode !== 'scroll' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => goStep(-1)}
              style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '6px 12px', cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.text }}>
              ‹ {viewMode === 'day' ? '前日' : viewMode === 'week' ? '前週' : '前月'}
            </button>
            <button type="button" onClick={() => setAnchor(today)}
              style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '6px 12px', cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.text }}>
              今日
            </button>
            <button type="button" onClick={() => goStep(1)}
              style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '6px 12px', cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.text }}>
              {viewMode === 'day' ? '翌日' : viewMode === 'week' ? '翌週' : '翌月'} ›
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginLeft: 6 }}>{rangeLabel}</span>
          </div>
        )}
      </div>

      {viewMode === 'day' ? (() => {
        // 1日表示：時間が横に流れるタイムライン形式（30分刻みの時間軸 × 担当者行）
        // 残業が登録されている場合は時間軸を残業の最遅終了まで延長する
        const dayDate = allDates[0];
        const ymd = fmtYMD(dayDate);
        const dayStart = morningSlot.start, dayEnd = Math.max(afternoonSlot.end, maxOvertimeEndMin(settings));
        const totalMin = dayEnd - dayStart;
        const halfHours = [];
        for (let m = dayStart; m < dayEnd; m += 30) halfHours.push(m);
        const timeColW = `calc((100% - ${labelWidth}px) / ${halfHours.length})`;
        const rowH = 88;
        let dayNowFrac = null;
        if (now && isSameDay(dayDate, now)) {
          const nm = now.getHours() * 60 + now.getMinutes();
          if (nm >= dayStart && nm <= dayEnd) dayNowFrac = (nm - dayStart) / totalMin;
        }
        const lunchLeft = ((morningSlot.end - dayStart) / totalMin) * 100;
        const lunchWidth = ((afternoonSlot.start - morningSlot.end) / totalMin) * 100;
        return (
          <div className="compact-scroll" style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'auto' }}>
            <div style={{ minWidth: 760, position: 'relative' }}>
              {dayNowFrac != null && (
                <div title={`現在時刻 ${minToTime(now.getHours() * 60 + now.getMinutes())}`} style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: `calc(${labelWidth}px + (100% - ${labelWidth}px) * ${dayNowFrac})`,
                  width: 2, background: colors.accent, zIndex: 4, pointerEvents: 'none',
                }}>
                  <div style={{ position: 'absolute', top: 0, left: -4, width: 10, height: 10, borderRadius: '50%', background: colors.accent }} />
                </div>
              )}
              {/* 時間ヘッダー（30分刻み） */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, background: '#fbf9f4' }}>
                <div style={{
                  width: labelWidth, padding: '10px 12px', fontSize: 11, color: colors.textMute, fontWeight: 500,
                  flexShrink: 0, borderRight: `1px solid ${colors.border}`, boxSizing: 'border-box',
                  position: 'sticky', left: 0, zIndex: 3, background: '#fbf9f4',
                }}>担当</div>
                {halfHours.map((m, i) => (
                  <div key={m} style={{
                    width: timeColW, flexShrink: 0, padding: '8px 0 6px', fontSize: 10, color: colors.textMute,
                    boxSizing: 'border-box',
                    borderRight: i < halfHours.length - 1 ? `1px ${(m + 30) % 60 === 0 ? 'solid' : 'dashed'} ${colors.border}` : 'none',
                  }}>
                    <span style={{ paddingLeft: 4 }}>{minToTime(m)}</span>
                  </div>
                ))}
              </div>
              {/* 担当者行（ブロックは開始〜終了の位置に横配置） */}
              {assignees.map((assignee, ai) => {
                const items = (matrix[assignee] && matrix[assignee][ymd]) || [];
                const abs = dayAbsence(assignee, dayDate, settings.absences || []);
                const absLabel = (settings.absences || []).find(x => x && x.assignee === assignee && x.startDate <= ymd && x.endDate >= ymd && x.label)?.label || '';
                return (
                  <div key={assignee} style={{ display: 'flex', borderBottom: ai < assignees.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                    <div
                      draggable={!!onReorderAssignee}
                      onDragStart={onReorderAssignee ? ((e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', assignee); setRowDrag(assignee); }) : undefined}
                      onDragEnd={onReorderAssignee ? (() => { setRowDrag(null); setRowDragOver(null); }) : undefined}
                      onDragOver={onReorderAssignee ? ((e) => { if (rowDrag && rowDrag !== assignee) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (rowDragOver !== assignee) setRowDragOver(assignee); } }) : undefined}
                      onDragLeave={onReorderAssignee ? (() => { if (rowDragOver === assignee) setRowDragOver(null); }) : undefined}
                      onDrop={onReorderAssignee ? ((e) => { e.preventDefault(); if (rowDrag && rowDrag !== assignee) onReorderAssignee(rowDrag, assignee); setRowDrag(null); setRowDragOver(null); }) : undefined}
                      title={onReorderAssignee ? 'ドラッグして担当者の表示順を変更（従業員マスタの並びに反映）' : undefined}
                      style={{
                        width: labelWidth, padding: '12px 8px', fontSize: 13, fontWeight: 500,
                        flexShrink: 0, borderRight: `1px solid ${colors.border}`,
                        display: 'flex', alignItems: 'center', gap: 5, background: '#fbf9f4',
                        boxSizing: 'border-box', position: 'sticky', left: 0, zIndex: 3,
                        boxShadow: rowDragOver === assignee && rowDrag && rowDrag !== assignee
                          ? `0 0 0 2px ${colors.accent} inset` : '2px 0 4px rgba(0,0,0,0.04)',
                        opacity: rowDrag === assignee ? 0.5 : 1,
                        cursor: onReorderAssignee ? 'grab' : 'default',
                      }}>
                      {onReorderAssignee && <GripVertical size={12} style={{ color: colors.textMute, flexShrink: 0 }} />}
                      {assignee}
                    </div>
                    <div style={{ flex: 1, position: 'relative', height: rowH, background: '#fff' }}>
                      {/* 30分グリッド線 */}
                      {halfHours.map((m, i) => i > 0 && (
                        <div key={m} style={{
                          position: 'absolute', top: 0, bottom: 0,
                          left: `${((m - dayStart) / totalMin) * 100}%`, width: 1,
                          background: m % 60 === 0 ? '#ece4d2' : '#f5f0e3',
                        }} />
                      ))}
                      {/* 昼休み */}
                      <div style={{
                        position: 'absolute', top: 0, bottom: 0,
                        left: `${lunchLeft}%`, width: `${lunchWidth}%`,
                        background: 'repeating-linear-gradient(45deg, #f3efe4, #f3efe4 4px, #faf7ee 4px, #faf7ee 8px)',
                      }} />
                      {/* 定時後（この担当者の残業枠が無い時間帯）は薄いストライプ */}
                      {dayEnd > afternoonSlot.end && subtractBusy(afternoonSlot.end, dayEnd, dayOvertimeIntervals(assignee, dayDate, settings.overtimes || [])).map(([s, e], k) => (
                        <div key={'ah' + k} style={{
                          position: 'absolute', top: 0, bottom: 0,
                          left: `${((s - dayStart) / totalMin) * 100}%`, width: `${((e - s) / totalMin) * 100}%`,
                          background: 'repeating-linear-gradient(45deg, #f3efe4, #f3efe4 4px, #faf7ee 4px, #faf7ee 8px)',
                        }} />
                      ))}
                      {/* 終日不在 */}
                      {abs.allDay && (
                        <div title={absLabel ? `休み（${absLabel}）` : '休み'} style={{
                          position: 'absolute', inset: 0, zIndex: 2,
                          background: 'repeating-linear-gradient(45deg, #e3e3e0, #e3e3e0 5px, #efefec 5px, #efefec 10px)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#8a8a82', fontWeight: 700, fontSize: 13,
                        }}>休{absLabel && <span style={{ fontSize: 10, fontWeight: 500 }}>（{absLabel}）</span>}</div>
                      )}
                      {/* 時間帯不在 */}
                      {!abs.allDay && abs.intervals.map(([s, e], k) => {
                        const cs = Math.max(s, dayStart), ce = Math.min(e, dayEnd);
                        if (ce <= cs) return null;
                        return (
                          <div key={k} title={absLabel ? `不在（${absLabel}）` : '不在'} style={{
                            position: 'absolute', top: 0, bottom: 0, zIndex: 2,
                            left: `${((cs - dayStart) / totalMin) * 100}%`, width: `${((ce - cs) / totalMin) * 100}%`,
                            background: 'repeating-linear-gradient(45deg, #e3e3e0, #e3e3e0 4px, #efefec 4px, #efefec 8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#8a8a82', fontSize: 9, fontWeight: 600, overflow: 'hidden',
                          }}>{absLabel || '不在'}</div>
                        );
                      })}
                      {/* タスクブロック */}
                      {items.map(({ task, slot, done }, si) => {
                        const s = Math.max(slot.startMin, dayStart), e = Math.min(slot.endMin, dayEnd);
                        if (e <= s) return null;
                        return (
                          <TaskBlock key={si} task={task} slot={slot} done={done}
                            projectColor={getProjectColor(task.projectName)}
                            timeline={{ left: `${((s - dayStart) / totalMin) * 100}%`, width: `${((e - s) / totalMin) * 100}%` }}
                            projDrag={projDrag} onProjDragStart={onReorderProject ? setProjDrag : null} onDropProject={onReorderProject}
                            onClick={onEditProject && (() => onEditProject(task.projectName))} />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })() : viewMode === 'week' ? (() => {
        // 週間表示（3週間）：1日表示と同じ横タイムライン形式を日数分つなげる
        // 残業が登録されている場合は1日の時間軸を残業の最遅終了まで延長する
        const dayStart = morningSlot.start, dayEnd = Math.max(afternoonSlot.end, maxOvertimeEndMin(settings));
        const totalMin = dayEnd - dayStart;
        const dayW = dayCellWidth; // 1日あたりの幅(px)・横スクロール
        const rowH = 88;
        const lunchLeftPct = ((morningSlot.end - dayStart) / totalMin) * 100;
        const lunchWidthPct = ((afternoonSlot.start - morningSlot.end) / totalMin) * 100;
        let nowX = null;
        if (now && todayIndex >= 0 && !isNonWorkingDay(now)) {
          const nm = now.getHours() * 60 + now.getMinutes();
          const frac = nm <= dayStart ? 0 : nm >= dayEnd ? 1 : (nm - dayStart) / totalMin;
          nowX = labelWidth + todayIndex * dayW + frac * dayW;
        }
        return (
          <div ref={scrollRef} className="compact-scroll" style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'auto' }}>
            <div style={{ minWidth: labelWidth + allDates.length * dayW, position: 'relative' }}>
              {nowX != null && (
                <div title={`現在時刻 ${minToTime(now.getHours() * 60 + now.getMinutes())}`} style={{
                  position: 'absolute', top: 0, bottom: 0, left: nowX, width: 2,
                  background: colors.accent, zIndex: 4, pointerEvents: 'none',
                }}>
                  <div style={{ position: 'absolute', top: 0, left: -4, width: 10, height: 10, borderRadius: '50%', background: colors.accent }} />
                </div>
              )}
              {/* 日付ヘッダー */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, background: '#fbf9f4' }}>
                <div style={{
                  width: labelWidth, padding: '10px 12px', fontSize: 11, color: colors.textMute, fontWeight: 500,
                  flexShrink: 0, borderRight: `1px solid ${colors.border}`, boxSizing: 'border-box',
                  position: 'sticky', left: 0, zIndex: 3, background: '#fbf9f4',
                  boxShadow: '2px 0 4px rgba(0,0,0,0.04)',
                }}>担当</div>
                {allDates.map((d, i) => {
                  const isToday = isSameDay(d, new Date());
                  return (
                    <div key={i} style={{
                      width: dayW, flexShrink: 0, textAlign: 'center', padding: '8px 4px 6px',
                      fontSize: 10, color: colors.textMute, boxSizing: 'border-box',
                      background: isToday ? colors.accentSoft : 'transparent',
                      borderRight: i < allDates.length - 1 ? `1px solid ${colors.border}` : 'none',
                    }}>
                      {d.getMonth() + 1}/{d.getDate()} ({dayName(d)})
                    </div>
                  );
                })}
              </div>
              {/* 担当者行 */}
              {assignees.map((assignee, ai) => (
                <div key={assignee} style={{ display: 'flex', borderBottom: ai < assignees.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                  <div
                    draggable={!!onReorderAssignee}
                    onDragStart={onReorderAssignee ? ((e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', assignee); setRowDrag(assignee); }) : undefined}
                    onDragEnd={onReorderAssignee ? (() => { setRowDrag(null); setRowDragOver(null); }) : undefined}
                    onDragOver={onReorderAssignee ? ((e) => { if (rowDrag && rowDrag !== assignee) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (rowDragOver !== assignee) setRowDragOver(assignee); } }) : undefined}
                    onDragLeave={onReorderAssignee ? (() => { if (rowDragOver === assignee) setRowDragOver(null); }) : undefined}
                    onDrop={onReorderAssignee ? ((e) => { e.preventDefault(); if (rowDrag && rowDrag !== assignee) onReorderAssignee(rowDrag, assignee); setRowDrag(null); setRowDragOver(null); }) : undefined}
                    title={onReorderAssignee ? 'ドラッグして担当者の表示順を変更（従業員マスタの並びに反映）' : undefined}
                    style={{
                      width: labelWidth, padding: '12px 8px', fontSize: 13, fontWeight: 500,
                      flexShrink: 0, borderRight: `1px solid ${colors.border}`,
                      display: 'flex', alignItems: 'center', gap: 5, background: '#fbf9f4',
                      boxSizing: 'border-box', position: 'sticky', left: 0, zIndex: 3,
                      boxShadow: rowDragOver === assignee && rowDrag && rowDrag !== assignee
                        ? `0 0 0 2px ${colors.accent} inset` : '2px 0 4px rgba(0,0,0,0.04)',
                      opacity: rowDrag === assignee ? 0.5 : 1,
                      cursor: onReorderAssignee ? 'grab' : 'default',
                    }}>
                    {onReorderAssignee && <GripVertical size={12} style={{ color: colors.textMute, flexShrink: 0 }} />}
                    {assignee}
                  </div>
                  <div style={{ display: 'flex', position: 'relative', height: rowH }}>
                    {/* 日セル（背景・昼休み/土曜午後・不在） */}
                    {allDates.map((d, di) => {
                      const isToday = isSameDay(d, new Date());
                      const isWorkSat = d.getDay() === 6;
                      const abs = dayAbsence(assignee, d, settings.absences || []);
                      const absLabel = (settings.absences || []).find(x => x && x.assignee === assignee && x.startDate <= fmtYMD(d) && x.endDate >= fmtYMD(d) && x.label)?.label || '';
                      return (
                        <div key={di} style={{
                          width: dayW, flexShrink: 0, boxSizing: 'border-box', position: 'relative',
                          borderRight: di < allDates.length - 1 ? `1px solid ${colors.border}` : 'none',
                          background: isToday ? '#fff8f8' : '#fff',
                        }}>
                          {/* 昼休み（土曜は午後すべて休み） */}
                          <div style={{
                            position: 'absolute', top: 0, bottom: 0,
                            left: `${lunchLeftPct}%`,
                            width: isWorkSat ? `${100 - lunchLeftPct}%` : `${lunchWidthPct}%`,
                            background: 'repeating-linear-gradient(45deg, #f3efe4, #f3efe4 4px, #faf7ee 4px, #faf7ee 8px)',
                          }} />
                          {/* 定時後（この担当者の残業枠が無い時間帯）は薄いストライプ */}
                          {!isWorkSat && dayEnd > afternoonSlot.end && subtractBusy(afternoonSlot.end, dayEnd, dayOvertimeIntervals(assignee, d, settings.overtimes || [])).map(([s, e], k) => (
                            <div key={'ah' + k} style={{
                              position: 'absolute', top: 0, bottom: 0,
                              left: `${((s - dayStart) / totalMin) * 100}%`, width: `${((e - s) / totalMin) * 100}%`,
                              background: 'repeating-linear-gradient(45deg, #f3efe4, #f3efe4 4px, #faf7ee 4px, #faf7ee 8px)',
                            }} />
                          ))}
                          {abs.allDay && (
                            <div title={absLabel ? `休み（${absLabel}）` : '休み'} style={{
                              position: 'absolute', inset: 0, zIndex: 2,
                              background: 'repeating-linear-gradient(45deg, #e3e3e0, #e3e3e0 5px, #efefec 5px, #efefec 10px)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#8a8a82', fontWeight: 700, fontSize: 12,
                            }}>休{absLabel && <span style={{ fontSize: 9, fontWeight: 500 }}>（{absLabel}）</span>}</div>
                          )}
                          {!abs.allDay && abs.intervals.map(([s, e], k) => {
                            const cs = Math.max(s, dayStart), ce = Math.min(e, dayEnd);
                            if (ce <= cs) return null;
                            return (
                              <div key={k} title={absLabel ? `不在（${absLabel}）` : '不在'} style={{
                                position: 'absolute', top: 0, bottom: 0, zIndex: 2,
                                left: `${((cs - dayStart) / totalMin) * 100}%`, width: `${((ce - cs) / totalMin) * 100}%`,
                                background: 'repeating-linear-gradient(45deg, #e3e3e0, #e3e3e0 4px, #efefec 4px, #efefec 8px)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#8a8a82', fontSize: 9, fontWeight: 600, overflow: 'hidden',
                              }}>{absLabel || '不在'}</div>
                            );
                          })}
                        </div>
                      );
                    })}
                    {/* タスクブロック（開始〜終了の位置に横配置） */}
                    {allDates.map((d, di) => {
                      const items = (matrix[assignee] && matrix[assignee][fmtYMD(d)]) || [];
                      return items.map(({ task, slot, done }, si) => {
                        const s = Math.max(slot.startMin, dayStart), e = Math.min(slot.endMin, dayEnd);
                        if (e <= s) return null;
                        return (
                          <TaskBlock key={`${di}-${si}`} task={task} slot={slot} done={done}
                            projectColor={getProjectColor(task.projectName)}
                            timeline={{
                              left: `${di * dayW + ((s - dayStart) / totalMin) * dayW}px`,
                              width: `${((e - s) / totalMin) * dayW}px`,
                            }}
                            projDrag={projDrag} onProjDragStart={onReorderProject ? setProjDrag : null} onDropProject={onReorderProject}
                            onClick={onEditProject && (() => onEditProject(task.projectName))} />
                        );
                      });
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })() : (
      <div ref={scrollRef} className="compact-scroll" style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'auto' }}>
        <div style={{ minWidth: isFlexWidth ? undefined : labelWidth + allDates.length * dayCellWidth, position: 'relative' }}>
          {nowLineX != null && (
            <div title={`現在時刻 ${minToTime(now.getHours() * 60 + now.getMinutes())}`} style={{
              position: 'absolute', top: 0, bottom: 0, left: nowLineX, width: 2,
              background: colors.accent, zIndex: 4, pointerEvents: 'none',
            }}>
              <div style={{ position: 'absolute', top: 0, left: -4, width: 10, height: 10, borderRadius: '50%', background: colors.accent }} />
            </div>
          )}
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
                <div key={i} ref={i === leftEdgeIndex ? todayCellRef : null} style={{
                  width: colWidth, padding: '6px 4px 2px', textAlign: 'center', flexShrink: 0,
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
              <div
                draggable={!!onReorderAssignee}
                onDragStart={onReorderAssignee ? ((e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', assignee); setRowDrag(assignee); }) : undefined}
                onDragEnd={onReorderAssignee ? (() => { setRowDrag(null); setRowDragOver(null); }) : undefined}
                onDragOver={onReorderAssignee ? ((e) => { if (rowDrag && rowDrag !== assignee) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (rowDragOver !== assignee) setRowDragOver(assignee); } }) : undefined}
                onDragLeave={onReorderAssignee ? (() => { if (rowDragOver === assignee) setRowDragOver(null); }) : undefined}
                onDrop={onReorderAssignee ? ((e) => { e.preventDefault(); if (rowDrag && rowDrag !== assignee) onReorderAssignee(rowDrag, assignee); setRowDrag(null); setRowDragOver(null); }) : undefined}
                title={onReorderAssignee ? 'ドラッグして担当者の表示順を変更（従業員マスタの並びに反映）' : undefined}
                style={{
                width: labelWidth, padding: '12px 8px', fontSize: 13, fontWeight: 500,
                flexShrink: 0, borderRight: `1px solid ${colors.border}`,
                display: 'flex', alignItems: 'center', gap: 5, background: '#fbf9f4',
                boxSizing: 'border-box',
                position: 'sticky', left: 0, zIndex: 3,
                boxShadow: rowDragOver === assignee && rowDrag && rowDrag !== assignee
                  ? `0 0 0 2px ${colors.accent} inset`
                  : '2px 0 4px rgba(0,0,0,0.04)',
                opacity: rowDrag === assignee ? 0.5 : 1,
                cursor: onReorderAssignee ? 'grab' : 'default',
              }}>
                {onReorderAssignee && <GripVertical size={12} style={{ color: colors.textMute, flexShrink: 0 }} />}
                {assignee}
              </div>
              {allDates.map((d, di) => {
                const key = fmtYMD(d);
                const slots = (matrix[assignee] && matrix[assignee][key]) || [];
                const morningItems = slots.filter(({ slot }) => slot.startMin < morningSlot.end);
                const afternoonItems = slots.filter(({ slot }) => slot.startMin >= afternoonSlot.start);
                // 午後の枠時間（残業を含む）。残業ぶんブロックが溢れないよう高さの分母にする
                const pmCapMin = dayWorkSlots(assignee, d, settings).reduce((s, [a, b]) => s + Math.max(0, b - Math.max(a, afternoonSlot.start)), 0);
                const pmHours = Math.max(afternoonHours, pmCapMin / 60);
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
                    width: colWidth, height: rowHeight, flexShrink: 0,
                    borderRight: di < allDates.length - 1 ? `1px solid ${colors.border}` : 'none',
                    background: isToday ? '#fff8f8' : '#fff',
                    position: 'relative',
                    boxSizing: 'border-box',
                    display: 'flex', flexDirection: 'row',
                  }}>
                    <div style={{ width: '50%', display: 'flex', flexDirection: 'column', borderRight: `1px dashed ${colors.border}`, boxSizing: 'border-box' }}>
                      {morningItems.map(({ task, slot, done }, si) => (
                        <TaskBlock key={si} task={task} slot={slot} done={done} compact={compact}
                          heightPct={(slot.hours / morningHours) * 100}
                          projectColor={getProjectColor(task.projectName)}
                          separator={si === 0 ? null : (morningItems[si - 1].task.projectName !== task.projectName ? 'strong' : 'weak')}
                          projDrag={projDrag} onProjDragStart={onReorderProject ? setProjDrag : null} onDropProject={onReorderProject}
                          onClick={onEditProject && (() => onEditProject(task.projectName))} />
                      ))}
                    </div>
                    <div style={{ width: '50%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
                      background: isWorkSat ? 'repeating-linear-gradient(45deg, #f5f0e3, #f5f0e3 4px, #fbf9f4 4px, #fbf9f4 8px)' : 'transparent',
                    }}>
                      {!isWorkSat && afternoonItems.map(({ task, slot, done }, si) => (
                        <TaskBlock key={si} task={task} slot={slot} done={done} compact={compact}
                          heightPct={(slot.hours / pmHours) * 100}
                          projectColor={getProjectColor(task.projectName)}
                          separator={si === 0 ? null : (afternoonItems[si - 1].task.projectName !== task.projectName ? 'strong' : 'weak')}
                          projDrag={projDrag} onProjDragStart={onReorderProject ? setProjDrag : null} onDropProject={onReorderProject}
                          onClick={onEditProject && (() => onEditProject(task.projectName))} />
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
      )}

      <div style={{ marginTop: 20, fontSize: 11, color: colors.textMute }}>
        セル内の色は案件ごと（パステル・「ホワイト」工程は1段階薄い色） ・ 右上の #番号 が優先順位 ・ 斜線ストライプ＋「仮」は仮案件 ・ グレーの実線ブロックは完了済（「済」）／中止（「止」、実終了時刻から遡って表示） ・ グレーの斜線は休日・不在 ・ マウスオーバーで詳細表示 ・ クリックで案件編集フォームを開く（完了済みの案件も編集可） ・ ブロックをドラッグ＆ドロップで案件の順番を変更 ・ 左端の担当者名をドラッグ＆ドロップで担当者の表示順を変更
      </div>
    </div>
  );
}

function TaskBlock({ task, slot, heightPct, projectColor, done, onClick, compact, separator, projDrag, onProjDragStart, onDropProject, timeline }) {
  const [projHover, setProjHover] = useState(false);
  // 案件の並び替えドラッグは進行中ブロックのみ（完了・中止のグレーは対象外）
  const canDragProject = !!onDropProject && !done;
  // パステル表示：通常ステップは基本パステル、「ホワイト」工程はさらに1段階薄く。完了は薄いグレー
  const isWhiteStep = !done && (task.stepName || '').includes('ホワイト');
  const blockBg = done ? '#d4d4cd' : pastelize(projectColor, isWhiteStep ? 0.82 : 0.6);
  const blockText = '#3f3b32';
  const remaining = Math.max(0, task.hours - (task.completedHours || 0));
  const stepLabel = task.stepName ? ` - ${task.stepName}` : '';
  const internal = task.projectNameInternal || '';
  const external = task.projectName || '';
  const nameLine = `${internal || external}${internal && external ? ` (${external})` : ''} / ${task.viewpointName}${stepLabel}`;
  let aeStr = '';
  if (done && task.actualEnd) {
    const d = new Date(task.actualEnd);
    if (!isNaN(d.getTime())) aeStr = `${d.getMonth() + 1}/${d.getDate()} ${minToTime(d.getHours() * 60 + d.getMinutes())}`;
  }
  const cancelled = !!task.cancelled;
  const tentative = !done && !!task.tentative;
  const effDeadline = task.deadline || task.projectDeadline || ''; // 実効納期＝個別＞全体
  const memoLine = (effDeadline ? `\n納期 ${(() => { const d = new Date(effDeadline + 'T00:00:00'); return isNaN(d.getTime()) ? effDeadline : `${d.getMonth() + 1}/${d.getDate()}`; })()}` : '') + (task.memo ? `\n📝 ${task.memo}` : '');
  const title = done
    ? `【${cancelled ? '中止' : '完了'}】${nameLine}\n${minToTime(slot.startMin)}〜${minToTime(slot.endMin)} (${slot.hours}h)${aeStr ? `\n実終了 ${aeStr}` : ''}${memoLine}${onClick ? '\nクリックで案件を編集（終了時間の実績は完了タブで）' : '\n※終了時間（実績）は完了タブで編集できます'}`
    : `${tentative ? '【仮】' : ''}#${task.priority} ${nameLine}\n${minToTime(slot.startMin)}〜${minToTime(slot.endMin)} (${slot.hours}h)\n残り ${remaining}h / 全${task.hours}h${memoLine}${task.manualStart ? '\n※開始時間指定あり' : ''}${task.manualEnd ? '\n※終了予定指定あり' : ''}${task.delays && task.delays.length ? `\n※遅延履歴あり（${task.delays.length}回）` : ''}${onClick ? '\nクリックで案件を編集' : ''}${canDragProject ? '\nドラッグで案件の順番を変更' : ''}`;
  return (
    <div title={title}
      onClick={onClick || undefined}
      draggable={canDragProject}
      onDragStart={canDragProject ? ((e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', task.projectName); if (onProjDragStart) onProjDragStart(task.projectName); }) : undefined}
      onDragEnd={canDragProject ? (() => { if (onProjDragStart) onProjDragStart(null); }) : undefined}
      onDragOver={canDragProject ? ((e) => { if (projDrag && projDrag !== task.projectName) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (!projHover) setProjHover(true); } }) : undefined}
      onDragLeave={canDragProject ? (() => { if (projHover) setProjHover(false); }) : undefined}
      onDrop={canDragProject ? ((e) => { e.preventDefault(); setProjHover(false); if (projDrag && projDrag !== task.projectName) onDropProject(projDrag, task.projectName); if (onProjDragStart) onProjDragStart(null); }) : undefined}
      style={{
        background: blockBg, color: blockText,
        // 仮案件は斜線ストライプを重ねて区別する（パステル地でも見えるよう薄い濃色）
        backgroundImage: tentative ? 'repeating-linear-gradient(45deg, rgba(110,100,80,0.16) 0, rgba(110,100,80,0.16) 4px, transparent 4px, transparent 9px)' : 'none',
        fontSize: 10, lineHeight: 1.25, overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        // 案件並び替えドラッグ中の視覚フィードバック
        opacity: projDrag && projDrag === task.projectName ? 0.55 : 1,
        outline: projHover && projDrag && projDrag !== task.projectName ? `2px solid ${'#c1272d'}` : 'none',
        outlineOffset: -2,
        ...(timeline ? {
          // 横タイムライン配置（1日表示）：開始〜終了の位置に絶対配置
          position: 'absolute', left: timeline.left, width: `calc(${timeline.width} - 2px)`,
          top: 5, bottom: 5, borderRadius: 3, padding: '3px 6px',
          border: '1px solid rgba(255,255,255,0.9)', boxSizing: 'border-box',
        } : {
          height: `${heightPct}%`, minHeight: 0, padding: '3px 5px', position: 'relative',
          // 上に重なるブロックとの切れ目：案件が替わる位置は太い白線、同一案件のステップ間は細い線
          boxShadow: separator === 'strong' ? 'inset 0 2px 0 #ffffff'
            : separator === 'weak' ? 'inset 0 1px 0 rgba(255,255,255,0.6)' : 'none',
        }),
      }}>
      {compact ? (
        // 月間表示などの狭い列：案件名1行のみ（詳細はツールチップ）
        <div style={{ fontSize: 8, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 14 }}>
          {internal || external || task.viewpointName}
        </div>
      ) : (
        <>
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
        </>
      )}
      <div style={{
        position: 'absolute', top: 2, right: 2,
        background: done ? (cancelled ? '#a05252' : '#7d7d76') : (tentative ? '#c46a16' : priorityColor(task.priority)), color: '#fff',
        fontSize: 8, fontWeight: 700, padding: '0 3px', borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.7)',
      }}>{done ? (cancelled ? '止' : '済') : (tentative ? `仮#${task.priority}` : `#${task.priority}`)}</div>
    </div>
  );
}

// ============ 担当者別ビュー ============
function AssigneeView({ scheduled, selectedAssignee, setSelectedAssignee, now, assigneeOrder, companyOrder, companyList, saveProjectInfo, setProjectDeadline, projectOrder, saveProjectOrder, handleEdit, handleEditProject, handleEditViewpoint, handleAddViewpointToProject, handleDeleteViewpoint, handleDelete, toggleStatus, moveUp, moveDown, changePriority, dragTaskId, onDragTask, onDropTask, addProgress, setTaskHours, setTaskCompletedHours, setTaskManualStart, setTaskManualEnd, completeProject, cancelProject, completeViewpoint, handleAddStepToViewpoint, reassignViewpoint, setViewpointDeadline, assigneeList, colors, fontJP, fontDisplay }) {
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
            <ViewpointGroupList groups={groups} allActive={allActive} now={now}
              companyOrder={companyOrder}
              projectOrder={projectOrder} saveProjectOrder={saveProjectOrder}
              handleEdit={handleEdit} handleEditProject={handleEditProject} handleEditViewpoint={handleEditViewpoint}
              handleAddViewpointToProject={handleAddViewpointToProject}
              handleDeleteViewpoint={handleDeleteViewpoint}
              handleDelete={handleDelete} toggleStatus={toggleStatus}
              moveUp={moveUp} moveDown={moveDown} changePriority={changePriority} dragTaskId={dragTaskId} onDragTask={onDragTask} onDropTask={onDropTask} addProgress={addProgress} setTaskHours={setTaskHours} setTaskCompletedHours={setTaskCompletedHours} setTaskManualStart={setTaskManualStart} setTaskManualEnd={setTaskManualEnd} completeProject={completeProject} cancelProject={cancelProject} completeViewpoint={completeViewpoint}
              handleAddStepToViewpoint={handleAddStepToViewpoint} reassignViewpoint={reassignViewpoint} setViewpointDeadline={setViewpointDeadline} saveProjectInfo={saveProjectInfo} setProjectDeadline={setProjectDeadline} companyList={companyList} assigneeList={assigneeList}
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

// 視点名リスト → 「外観N枚+内観M枚」形式の制作枚数ラベル（EX→外観, IN→内観, それ以外は視点名）。
// 各視点（依頼項目）を1枚と数え、分類ごとに件数を集計する。
function sheetsLabel(viewpointNames) {
  const counts = new Map();
  const order = [];
  for (const raw of (viewpointNames || [])) {
    const vn = (raw || '').trim();
    if (!vn) continue;
    const u = vn.toUpperCase();
    const label = u.startsWith('EX') ? '外観' : u.startsWith('IN') ? '内観' : vn;
    if (!counts.has(label)) { counts.set(label, 0); order.push(label); }
    counts.set(label, counts.get(label) + 1);
  }
  const rank = (l) => l === '外観' ? 0 : l === '内観' ? 1 : 2;
  return order.slice()
    .sort((a, b) => (rank(a) - rank(b)) || (order.indexOf(a) - order.indexOf(b)))
    .map(l => `${l}${counts.get(l)}枚`)
    .join('+');
}

// 案件が無くても会社別連絡文に常に表示する会社
const FORCED_COMPANIES = ['TAMAZEN', 'SUMUS'];
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
function MessageView({ scheduled, settings, colors, fontJP, fontDisplay, assigneeOrder }) {
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
  const curCompany = (msgCompany !== null && companies.includes(msgCompany)) ? msgCompany : (companies[0] ?? '');

  const fmtDateDow = (d) => `${fmtMD(d)}(${dayName(d)})`;
  const buildCompanyMessage = (company, mode = 'morning') => {
    const evening = mode === 'evening';
    // この会社の案件を、スケジュール順（scheduled.active の並び）で
    const projectsInOrder = [];
    const seen = new Set();
    for (const t of scheduled.active) {
      if ((t.companyName || '') !== company) continue;
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
      if ((t.companyName || '') !== company || t.cancelled) continue;
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
      const vpGroups = allGroups.filter(g => (g.companyName || '') === company && g.projectName === p);
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
              {companyCopied ? <><Check size={15} /> コピーしました</> : <>この会社の連絡文をコピー</>}
            </button>
          </div>
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
          ※ 「業務開始（朝）／業務終了（夕）」で挨拶文を切り替えます ・ 会社を選ぶとその会社の案件だけの連絡文になります ・ 制作枚数は視点(依頼項目)を外観(EX)／内観(IN)で分類した件数です ・ 「■納品済み」は本日納品分（実終了日が本日の完了案件）を表示します ・ 案件が無い会社は挨拶文をランダム表示します
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

// ============ 完了タスクビュー ============
function DoneView({ scheduled, toggleStatus, handleDelete, setActualEnd, handleEditProject, colors, fontJP, fontDisplay }) {
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
function MasterView({ customerMaster, saveCustomerMaster, employeeMaster, saveEmployeeMaster, settings, assigneeList, addOvertime, removeOvertime, addAbsence, removeAbsence, addHolidays, removeHoliday, saveCompanyOrder, usedCompanies, colors, fontJP, fontDisplay }) {
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
  const setCompanyField = (cid, field, val) => setCustomers(cs => cs.map(c => c.id === cid ? { ...c, [field]: val } : c));
  const addContact = (cid) => commitCustomers(customers.map(c => c.id === cid ? { ...c, contacts: [...(c.contacts || []), { id: newId('cc'), name: '' }] } : c));
  const removeContact = (cid, ctid) => commitCustomers(customers.map(c => c.id === cid ? { ...c, contacts: (c.contacts || []).filter(ct => ct.id !== ctid) } : c));
  const setContactField = (cid, ctid, field, val) => setCustomers(cs => cs.map(c => c.id === cid ? { ...c, contacts: (c.contacts || []).map(ct => ct.id === ctid ? { ...ct, [field]: val } : ct) } : c));
  const commitCustomersNow = () => saveCustomerMaster(customers);

  // 従業員マスタ
  const addEmployee = () => { const next = [...employees, { id: newId('emp'), name: '', role: '' }]; setEmployees(next); saveEmployeeMaster(next); };
  const setEmployeeField = (id, field, val) => setEmployees(es => es.map(e => e.id === id ? { ...e, [field]: val } : e));
  const commitEmployees = () => saveEmployeeMaster(employees);
  const removeEmployee = (id) => { const next = employees.filter(e => e.id !== id); setEmployees(next); saveEmployeeMaster(next); };
  // 並び順の変更（この順がカレンダー・担当者別・サマリーの表示順になる）
  const moveEmployee = (id, dir) => {
    const i = employees.findIndex(e => e.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= employees.length) return;
    const next = [...employees];
    [next[i], next[j]] = [next[j], next[i]];
    setEmployees(next);
    saveEmployeeMaster(next);
  };
  // ドラッグ＆ドロップで並び替え（つまみ部分をドラッグ → 行へドロップ）
  const [empDragSrc, setEmpDragSrc] = useState(null);
  const [empDragOver, setEmpDragOver] = useState(null);
  const reorderEmployees = (srcId, targetId) => {
    if (!srcId || srcId === targetId) return;
    const src = employees.find(e => e.id === srcId);
    if (!src) return;
    const rest = employees.filter(e => e.id !== srcId);
    const ti = rest.findIndex(e => e.id === targetId);
    const next = ti < 0 ? [...rest, src] : [...rest.slice(0, ti), src, ...rest.slice(ti)];
    setEmployees(next);
    saveEmployeeMaster(next);
  };

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
          {customers.map(c => {
            // 会社情報の入力欄（ラベル＋テキスト）
            const companyField = (label, field, placeholder, span = 1, type = 'text') => (
              <div style={{ gridColumn: `span ${span}` }}>
                <div style={labelStyle}>{label}</div>
                <input type={type} value={c[field] || ''}
                  onChange={(e) => setCompanyField(c.id, field, e.target.value)}
                  onBlur={commitCustomersNow}
                  placeholder={placeholder} style={inputStyle} />
              </div>
            );
            return (
            <div key={c.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'hidden' }}>
              {/* 会社名ヘッダー */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#f3efe4', padding: '10px 12px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.textMute, flexShrink: 0 }}>会社</span>
                <input type="text" value={c.company || ''}
                  onChange={(e) => setCompanyField(c.id, 'company', e.target.value)}
                  onBlur={commitCustomersNow}
                  placeholder="例: リノべる株式会社"
                  style={{ ...inputStyle, flex: 1, fontWeight: 600 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.textMute, flexShrink: 0 }}>契約形態</span>
                <select value={c.contractType || 'labo'}
                  onChange={(e) => commitCustomers(customers.map(x => x.id === c.id ? { ...x, contractType: e.target.value } : x))}
                  title="ラボ＝会社名でグループ表示／オフショア＝進行中タスク一覧で「オフショア（その他）」に集約（会社名は各案件に表示）"
                  style={{ ...inputStyle, width: 'auto', flex: '0 0 120px', fontWeight: 600 }}>
                  <option value="labo">ラボ</option>
                  <option value="offshore">オフショア</option>
                </select>
                <button type="button" onClick={() => removeCompany(c.id)}
                  style={{ ...delBtnStyle, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', fontSize: 11, fontFamily: fontJP }}
                  title="この会社を削除">
                  <Trash2 size={13} /> 会社削除
                </button>
              </div>
              {/* 会社情報 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: 12, borderBottom: `1px solid ${colors.border}`, background: '#fbfaf6' }}>
                {companyField('代表者名', 'representative', '例: 山田 太郎')}
                {companyField('電話番号（代表）', 'phone', '例: 052-123-4567', 1, 'tel')}
                {companyField('郵便番号', 'postalCode', '例: 460-0008')}
                {companyField('住所', 'address', '例: 愛知県名古屋市中区栄1-2-3', 3)}
                {companyField('ホームページURL', 'websiteUrl', '例: https://example.co.jp', 3, 'url')}
                {companyField('支店住所１', 'branchAddress1', '', 2)}
                {companyField('支店電話番号１', 'branchPhone1', '', 1, 'tel')}
                {companyField('支店住所２', 'branchAddress2', '', 2)}
                {companyField('支店電話番号２', 'branchPhone2', '', 1, 'tel')}
              </div>
              {/* 担当者リスト */}
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(c.contacts || []).length === 0 && (
                  <div style={{ fontSize: 11, color: colors.textMute }}>担当者が未登録です。</div>
                )}
                {(c.contacts || []).length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr 1.4fr 34px', gap: 8, paddingLeft: 8 }}>
                    <div style={labelStyle}>担当者名</div>
                    <div style={labelStyle}>支店名</div>
                    <div style={labelStyle}>電話番号</div>
                    <div style={labelStyle}>メールアドレス</div>
                    <div />
                  </div>
                )}
                {(c.contacts || []).map(ct => (
                  <div key={ct.id} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr 1.4fr 34px', gap: 8, alignItems: 'center', paddingLeft: 8 }}>
                    <input type="text" value={ct.name || ''}
                      onChange={(e) => setContactField(c.id, ct.id, 'name', e.target.value)}
                      onBlur={commitCustomersNow}
                      placeholder="例: 山田様" style={inputStyle} />
                    <input type="text" value={ct.branchName || ''}
                      onChange={(e) => setContactField(c.id, ct.id, 'branchName', e.target.value)}
                      onBlur={commitCustomersNow}
                      placeholder="例: 名古屋支店" style={inputStyle} />
                    <input type="tel" value={ct.phone || ''}
                      onChange={(e) => setContactField(c.id, ct.id, 'phone', e.target.value)}
                      onBlur={commitCustomersNow}
                      placeholder="例: 090-1234-5678" style={inputStyle} />
                    <input type="text" value={ct.email || ''}
                      onChange={(e) => setContactField(c.id, ct.id, 'email', e.target.value)}
                      onBlur={commitCustomersNow}
                      placeholder="例: yamada@example.co.jp" style={inputStyle} />
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
            );
          })}
        </div>
        <button type="button" onClick={addCompany} style={{ ...addBtnStyle, marginTop: 16 }}>
          <Plus size={14} /> 会社を追加
        </button>
      </section>

      {/* 従業員マスタ */}
      <section style={cardStyle}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 18, margin: '0 0 4px 0', fontWeight: 500 }}>従業員マスタ</h2>
        <p style={{ fontSize: 12, color: colors.textMute, margin: '0 0 16px 0' }}>
          制作担当者（従業員）を登録します。案件入力時の「担当者」の候補に表示されます。<br />
          ここでの並び順が、カレンダー・担当者別・サマリーの担当者の表示順になります（つまみをドラッグ＆ドロップ、または▲▼で変更）。
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '0 2px' }}>
            <div style={{ width: 48, flexShrink: 0, ...labelStyle }}>順</div>
            <div style={{ flex: '1 1 0', ...labelStyle }}>氏名</div>
            <div style={{ flex: '1 1 0', ...labelStyle }}>役割・備考</div>
            <div style={{ width: 34, flexShrink: 0 }} />
          </div>
          {employees.length === 0 && (
            <div style={{ fontSize: 12, color: colors.textMute, padding: '8px 2px' }}>
              まだ登録がありません。「＋ 従業員を追加」から登録してください。
            </div>
          )}
          {employees.map((e, ei) => (
            <div key={e.id}
              onDragOver={(ev) => { if (empDragSrc && empDragSrc !== e.id) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; if (empDragOver !== e.id) setEmpDragOver(e.id); } }}
              onDragLeave={() => { if (empDragOver === e.id) setEmpDragOver(null); }}
              onDrop={(ev) => { ev.preventDefault(); if (empDragSrc) reorderEmployees(empDragSrc, e.id); setEmpDragSrc(null); setEmpDragOver(null); }}
              style={{
                display: 'flex', gap: 10, alignItems: 'center',
                borderRadius: 4, padding: 2,
                opacity: empDragSrc === e.id ? 0.5 : 1,
                boxShadow: empDragOver === e.id && empDragSrc && empDragSrc !== e.id ? `0 0 0 2px ${colors.accent} inset` : 'none',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 48, flexShrink: 0 }}>
                <span draggable
                  onDragStart={(ev) => { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', e.id); setEmpDragSrc(e.id); }}
                  onDragEnd={() => { setEmpDragSrc(null); setEmpDragOver(null); }}
                  title="ドラッグして並び替え"
                  style={{ cursor: 'grab', color: colors.textMute, display: 'flex' }}>
                  <GripVertical size={14} />
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button type="button" onClick={() => moveEmployee(e.id, -1)} disabled={ei === 0}
                    style={{
                      background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 2,
                      padding: '1px 4px', cursor: ei === 0 ? 'not-allowed' : 'pointer',
                      color: ei === 0 ? '#ccc' : colors.textMute,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }} title="上へ（表示順を前にする）">
                    <ChevronUp size={11} />
                  </button>
                  <button type="button" onClick={() => moveEmployee(e.id, 1)} disabled={ei === employees.length - 1}
                    style={{
                      background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 2,
                      padding: '1px 4px', cursor: ei === employees.length - 1 ? 'not-allowed' : 'pointer',
                      color: ei === employees.length - 1 ? '#ccc' : colors.textMute,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }} title="下へ（表示順を後にする）">
                    <ChevronDown size={11} />
                  </button>
                </div>
              </div>
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

      {/* 残業の登録（稼働枠の追加） */}
      <section style={cardStyle}>
        <OvertimeManager
          overtimes={settings?.overtimes || []} assigneeList={assigneeList}
          settings={settings}
          onAdd={addOvertime} onRemove={removeOvertime}
          colors={colors} fontJP={fontJP} />
      </section>

      {/* 欠勤・休日・不在の登録（対応不可日） */}
      <section style={cardStyle}>
        <AbsenceManager
          absences={settings?.absences || []} assigneeList={assigneeList}
          onAdd={addAbsence} onRemove={removeAbsence}
          colors={colors} fontJP={fontJP} />
      </section>

      {/* ベトナムの祝日（全体共通の休み） */}
      <section style={cardStyle}>
        <HolidayManager
          holidays={settings?.holidays || []}
          onAdd={addHolidays} onRemove={removeHoliday}
          colors={colors} fontJP={fontJP} />
      </section>

      {/* 会社の表示順設定 */}
      <CompanyOrderView
        companyOrder={settings?.companyOrder || []} saveCompanyOrder={saveCompanyOrder}
        usedCompanies={usedCompanies || []}
        colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
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

// ============ 残業の登録（担当者ごとの稼働枠追加） ============
function OvertimeManager({ overtimes, assigneeList, settings, onAdd, onRemove, colors, fontJP }) {
  const todayStr = fmtYMD(new Date());
  const defaultStart = settings?.afternoonEnd || '17:00';
  const [o, setO] = useState({ assignee: '', startDate: todayStr, endDate: todayStr, startTime: defaultStart, endTime: '19:00', label: '' });
  const set = (k, v) => setO(p => ({ ...p, [k]: v }));
  const submit = () => {
    if (!o.assignee) { alert('担当者を選択してください'); return; }
    if (!o.startDate || !o.endDate) { alert('開始日・終了日を入力してください'); return; }
    if (o.endDate < o.startDate) { alert('終了日は開始日以降にしてください'); return; }
    if (!o.startTime || !o.endTime || o.startTime >= o.endTime) { alert('残業の時間帯が正しくありません'); return; }
    onAdd({
      assignee: o.assignee, startDate: o.startDate, endDate: o.endDate,
      startTime: o.startTime, endTime: o.endTime,
      label: (o.label || '').trim(),
    });
    setO(p => ({ ...p, label: '' }));
  };
  const inputStyle = { padding: '5px 8px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 13, background: '#fff', color: colors.text };
  const sorted = [...overtimes].sort((x, y) => (y.startDate || '').localeCompare(x.startDate || ''));
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 4 }}>残業の登録（稼働枠の追加）</div>
      <div style={{ fontSize: 11, color: colors.textMute, marginBottom: 10 }}>
        担当者を選んで対応時間を追加します（例: 通常 {settings?.morningStart || '08:00'}〜{settings?.morningEnd || '12:00'}＋{settings?.afternoonStart || '13:00'}〜{settings?.afternoonEnd || '17:00'} ＋ 残業 17:00〜19:00）。追加した時間帯はスケジュール・カレンダーの稼働枠に反映されます。
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <select value={o.assignee} onChange={(e) => set('assignee', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">担当者を選択</option>
          {(assigneeList || []).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input type="date" value={o.startDate} onChange={(e) => set('startDate', e.target.value)} style={inputStyle} />
        <span style={{ fontSize: 12, color: colors.textMute }}>〜</span>
        <input type="date" value={o.endDate} onChange={(e) => set('endDate', e.target.value)} style={inputStyle} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: colors.textMute }}>
          残業
          <TimeSelect value={o.startTime} onChange={(v) => set('startTime', v)} colors={colors} fontJP={fontJP} />
          〜
          <TimeSelect value={o.endTime} onChange={(v) => set('endTime', v)} colors={colors} fontJP={fontJP} />
        </span>
        <input type="text" value={o.label} onChange={(e) => set('label', e.target.value)} placeholder="メモ（例: 納期対応）" style={{ ...inputStyle, flex: '1 1 140px', minWidth: 120 }} />
        <button type="button" onClick={submit}
          style={{ padding: '6px 14px', background: colors.accentSoft, border: `1px solid ${colors.accent}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.accent, fontWeight: 600 }}>
          追加
        </button>
      </div>
      {sorted.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map(ot => (
            <div key={ot.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4, padding: '6px 10px', fontSize: 12, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: colors.text }}>{ot.assignee}</span>
              <span style={{ color: colors.textMute }}>
                {ot.startDate}{ot.endDate !== ot.startDate ? ` 〜 ${ot.endDate}` : ''}
              </span>
              <span style={{ background: '#e8f0e4', borderRadius: 10, padding: '1px 8px', color: '#3a5a40', fontWeight: 600 }}>
                残業 {ot.startTime}〜{ot.endTime}
              </span>
              {ot.label && <span style={{ color: colors.textMute }}>{ot.label}</span>}
              <button type="button" onClick={() => onRemove(ot.id)} title="削除"
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

// ============ 欠勤・休日・不在の登録 ============
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
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 4 }}>欠勤・休日・不在の登録（対応不可日）</div>
      <div style={{ fontSize: 11, color: colors.textMute, marginBottom: 10 }}>
        対象者のカレンダー・スケジュールから対応不可の日（終日）または時間帯を除外します。カレンダーには「休／不在」と表示されます。
      </div>
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

// ============ ベトナムの祝日（全体共通の休み） ============
function HolidayManager({ holidays, onAdd, onRemove, colors, fontJP }) {
  const years = Object.keys(VN_LUNAR_HOLIDAYS).map(Number).sort((a, b) => a - b);
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(years.includes(thisYear) ? thisYear : years[0]);
  const [cands, setCands] = useState([]);
  const [manual, setManual] = useState({ date: fmtYMD(new Date()), label: '' });
  const have = new Set((holidays || []).map(h => h.date));
  const inputStyle = { padding: '5px 8px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 13, background: '#fff', color: colors.text };

  const showCandidates = () => setCands(vietnamHolidayCandidates(year));
  const setCand = (i, k, v) => setCands(prev => prev.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
  const sorted = [...(holidays || [])].sort((x, y) => (x.date || '').localeCompare(y.date || ''));
  const fmtDateJP = (ymd) => { const d = new Date(ymd + 'T00:00:00'); return isNaN(d.getTime()) ? '' : `${fmtMD(d)}（${dayName(d)}）`; };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 4 }}>ベトナムの祝日（全体共通の休み）</div>
      <div style={{ fontSize: 11, color: colors.textMute, marginBottom: 10 }}>
        登録した日は全担当者の非稼働日（土日と同じ扱い）になり、スケジュール・カレンダーから除外されます。
        テト（旧正月）・フンヴオン王の命日は旧暦ベースで政府が毎年公式日程を発表するため「要確認」です。日付・日数を編集してから追加してください。
      </div>

      {/* 年ごとの候補を取り込む */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <select value={year} onChange={(e) => { setYear(Number(e.target.value)); setCands([]); }} style={{ ...inputStyle, cursor: 'pointer' }}>
          {years.map(y => <option key={y} value={y}>{y}年</option>)}
        </select>
        <button type="button" onClick={showCandidates}
          style={{ padding: '6px 14px', background: '#fff', border: `1px solid ${colors.accent}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.accent, fontWeight: 600 }}>
          {year}年の祝日候補を表示
        </button>
        {cands.length > 0 && (
          <button type="button" onClick={() => onAdd(cands)}
            style={{ padding: '6px 14px', background: colors.accentSoft, border: `1px solid ${colors.accent}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.accent, fontWeight: 600 }}>
            候補をまとめて追加
          </button>
        )}
      </div>

      {cands.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, background: '#fbf9f4', border: `1px solid ${colors.border}`, borderRadius: 4, padding: 10 }}>
          {cands.map((c, i) => {
            const added = expandHolidayDates(c.date, c.days).every(d => have.has(d));
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                <input type="date" value={c.date} onChange={(e) => setCand(i, 'date', e.target.value)} style={inputStyle} />
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: colors.textMute }}>
                  <input type="number" min={1} max={14} value={c.days}
                    onChange={(e) => setCand(i, 'days', Math.max(1, parseInt(e.target.value, 10) || 1))}
                    style={{ ...inputStyle, width: 56 }} /> 日間
                </span>
                <span style={{ color: colors.text }}>{c.label}</span>
                {c.estimated && <span style={{ fontSize: 10, color: '#fff', background: '#c46a16', borderRadius: 8, padding: '1px 6px' }}>要確認</span>}
                {added
                  ? <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.textMute }}>登録済み</span>
                  : <button type="button" onClick={() => onAdd([c])}
                      style={{ marginLeft: 'auto', padding: '4px 10px', background: colors.accentSoft, border: `1px solid ${colors.accent}`, borderRadius: 3, cursor: 'pointer', fontFamily: fontJP, fontSize: 11, color: colors.accent, fontWeight: 600 }}>
                      追加
                    </button>}
              </div>
            );
          })}
        </div>
      )}

      {/* 手動で1日追加 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <input type="date" value={manual.date} onChange={(e) => setManual(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
        <input type="text" value={manual.label} onChange={(e) => setManual(p => ({ ...p, label: e.target.value }))} placeholder="名称（任意・例: 臨時休業）" style={{ ...inputStyle, flex: '1 1 160px', minWidth: 120 }} />
        <button type="button" onClick={() => { if (manual.date) { onAdd([{ date: manual.date, days: 1, label: (manual.label || '').trim() }]); setManual(p => ({ ...p, label: '' })); } }}
          style={{ padding: '6px 14px', background: colors.accentSoft, border: `1px solid ${colors.accent}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.accent, fontWeight: 600 }}>
          手動で追加
        </button>
      </div>

      {/* 登録済み一覧 */}
      {sorted.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map(h => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4, padding: '6px 10px', fontSize: 12, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: colors.text }}>{h.date}</span>
              <span style={{ color: colors.textMute }}>{fmtDateJP(h.date)}</span>
              {h.label && <span style={{ color: colors.textMute }}>{h.label}</span>}
              <button type="button" onClick={() => onRemove(h.id)} title="削除"
                style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '3px 6px', cursor: 'pointer', color: colors.textMute, display: 'flex', alignItems: 'center' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: colors.textMute }}>まだ祝日が登録されていません。</div>
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

// ============ 終了予定超過の対応ポップアップ（機能B） ============
function fmtOverdue(ms) {
  const min = Math.max(0, Math.floor(ms / 60000));
  if (min < 60) return `${min}分超過`;
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h}時間超過` : `${h}時間${m}分超過`;
}
function EndPromptModal({ viewpoints, now, settings, onComplete, onAddRevision, onDelay, onSnooze, colors, fontJP, fontDisplay }) {
  // 展開中のアクション { key, action } と各フォーム値
  const [active, setActive] = useState(null);
  const [completeEnd, setCompleteEnd] = useState('');
  const [delayEnd, setDelayEnd] = useState('');
  const [revName, setRevName] = useState('追加修正');
  const [revHours, setRevHours] = useState('');

  const open = (vp, action) => {
    setActive({ key: vp.key, action });
    if (action === 'complete') setCompleteEnd(dateToDtLocal(now));
    if (action === 'delay') setDelayEnd(dateToDtLocal(new Date(vp.endTs)));
    if (action === 'revision') { setRevName('追加修正'); setRevHours(''); }
  };
  const close = () => setActive(null);

  const btn = (bg, brd, col) => ({
    padding: '7px 12px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, fontWeight: 600,
    background: bg, border: `1px solid ${brd}`, color: col, whiteSpace: 'nowrap',
  });
  const fieldLabel = { fontSize: 11, color: colors.textMute, marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
      <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, width: '100%', maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column', fontFamily: fontJP, boxShadow: '0 12px 48px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${colors.border}` }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 17, margin: 0, fontWeight: 600, color: colors.accent }}>終了予定を過ぎた視点があります</h3>
          <p style={{ fontSize: 11, color: colors.textMute, margin: '6px 0 0 0' }}>視点ごとに対応を選んでください（「後で」で30分後に再表示）。</p>
        </div>
        <div style={{ overflowY: 'auto', padding: '8px 16px 16px', flex: 1 }}>
          {viewpoints.map(vp => {
            const isOpen = active && active.key === vp.key;
            return (
              <div key={vp.key} style={{ border: `1px solid ${colors.border}`, borderLeft: `4px solid ${getProjectColor(vp.projectName)}`, borderRadius: 6, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{vp.projectName} ／ {vp.viewpointName}</span>
                  {vp.assignee && <span style={{ fontSize: 11, color: colors.textMute }}>担当: {vp.assignee}</span>}
                </div>
                <div style={{ fontSize: 11, color: colors.textMute, marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span>終了予定: {fmtMD(vp.endDate)}({dayName(vp.endDate)}) {minToTime(vp.endDate.getHours() * 60 + vp.endDate.getMinutes())}</span>
                  <span style={{ color: colors.accent, fontWeight: 600 }}>{fmtOverdue(now.getTime() - vp.endTs)}</span>
                  {vp.deadline && (() => {
                    const d = new Date(vp.deadline + 'T00:00:00');
                    return <span>納期: {fmtMD(d)}（{dayName(d)}）</span>;
                  })()}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => open(vp, 'complete')} style={btn(colors.progress, colors.progress, '#fff')}>① 視点完了</button>
                  <button type="button" onClick={() => open(vp, 'revision')} style={btn('#fff', colors.border, colors.text)}>② 追加修正</button>
                  <button type="button" onClick={() => open(vp, 'delay')} style={btn('#fff', colors.border, colors.text)}>③ 遅延</button>
                  <button type="button" onClick={() => onSnooze(vp.key, vp.endTs)} style={btn('#fff', colors.border, colors.textMute)}>④ 後で</button>
                </div>

                {isOpen && active.action === 'complete' && (
                  <div style={{ marginTop: 12, background: '#fbf9f4', borderRadius: 5, padding: 12 }}>
                    <div style={fieldLabel}>実際の終了時間</div>
                    <EndTimeFields value={completeEnd} onChange={setCompleteEnd} colors={colors} fontJP={fontJP} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button type="button" onClick={() => { onComplete(vp, completeEnd); close(); }} style={btn(colors.progress, colors.progress, '#fff')}>完了する</button>
                      <button type="button" onClick={close} style={btn('#fff', colors.border, colors.textMute)}>やめる</button>
                    </div>
                  </div>
                )}
                {isOpen && active.action === 'revision' && (
                  <div style={{ marginTop: 12, background: '#fbf9f4', borderRadius: 5, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <div>
                        <div style={fieldLabel}>ステップ名</div>
                        <input type="text" value={revName} onChange={(e) => setRevName(e.target.value)} style={{ padding: '7px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 13 }} />
                      </div>
                      <div>
                        <div style={fieldLabel}>追加時間(h)</div>
                        <input type="number" min="0" step="0.5" value={revHours} onChange={(e) => setRevHours(e.target.value)} placeholder="例: 2" style={{ width: 70, padding: '7px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 13 }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button type="button" onClick={() => { onAddRevision(vp, revName, revHours); close(); }} style={btn(colors.text, colors.text, '#fff')}>追加する</button>
                      <button type="button" onClick={close} style={btn('#fff', colors.border, colors.textMute)}>やめる</button>
                    </div>
                  </div>
                )}
                {isOpen && active.action === 'delay' && (
                  <div style={{ marginTop: 12, background: '#fbf9f4', borderRadius: 5, padding: 12 }}>
                    <div style={fieldLabel}>新しい終了予定（現在より後）</div>
                    <EndTimeFields value={delayEnd} onChange={setDelayEnd} colors={colors} fontJP={fontJP} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button type="button" onClick={() => {
                        const nt = delayEnd ? new Date(delayEnd).getTime() : 0;
                        if (!nt) { alert('日時を入力してください'); return; }
                        onDelay(vp, vp.endTs, nt); close();
                      }} style={btn(colors.text, colors.text, '#fff')}>更新する</button>
                      <button type="button" onClick={close} style={btn('#fff', colors.border, colors.textMute)}>やめる</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============ 会社の表示順設定ページ（機能③） ============
function CompanyOrderView({ companyOrder, saveCompanyOrder, usedCompanies, colors, fontJP, fontDisplay }) {
  const order = (companyOrder || []).map(c => (c || '').trim()).filter(Boolean);
  // タスクに存在するが未登録の会社
  const unregistered = usedCompanies.filter(c => !order.includes(c)).sort((a, b) => a.localeCompare(b, 'ja'));
  const [newName, setNewName] = useState('');
  const [dragSrc, setDragSrc] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const move = (name, dir) => {
    const idx = order.indexOf(name);
    if (idx < 0) return;
    const sw = dir === 'up' ? idx - 1 : idx + 1;
    if (sw < 0 || sw >= order.length) return;
    const next = [...order];
    [next[idx], next[sw]] = [next[sw], next[idx]];
    saveCompanyOrder(next);
  };
  const reorder = (src, target) => {
    if (src === target) return;
    const filtered = order.filter(n => n !== src);
    const ti = filtered.indexOf(target);
    const next = ti < 0 ? [...filtered, src] : [...filtered.slice(0, ti), src, ...filtered.slice(ti)];
    saveCompanyOrder(next);
  };
  const add = (name) => {
    const n = (name || '').trim();
    if (!n) return;
    if (order.includes(n)) { alert('すでに登録されています'); return; }
    saveCompanyOrder([...order, n]);
    setNewName('');
  };
  const remove = (name) => saveCompanyOrder(order.filter(n => n !== name));

  const rowBase = {
    display: 'flex', alignItems: 'center', gap: 10, background: '#fff',
    border: `1px solid ${colors.border}`, borderRadius: 5, padding: '9px 12px',
  };
  const miniBtn = (disabled) => ({
    background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 2, padding: '1px 5px',
    cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? '#ccc' : colors.textMute, display: 'flex',
  });

  return (
    <div style={{ maxWidth: 620 }}>
      <h2 style={{ fontFamily: fontDisplay, fontSize: 20, margin: '0 0 6px 0', fontWeight: 500 }}>会社の表示順</h2>
      <p style={{ fontSize: 12, color: colors.textMute, margin: '0 0 18px 0' }}>
        進行中タスク・担当者別の「会社グループ」の上からの並び順を設定します。ドラッグまたは↑↓で並び替え。
        スケジュール計算（カレンダー等）には影響しません。
      </p>

      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: 18, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>並び順（登録済み）</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {order.length === 0 && <div style={{ fontSize: 12, color: colors.textMute }}>登録された会社がありません。</div>}
          {order.map((c, i) => (
            <div key={c}
              draggable
              onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragSrc(c); }}
              onDragOver={(e) => { if (dragSrc && dragSrc !== c) { e.preventDefault(); setDragOver(c); } }}
              onDrop={(e) => { e.preventDefault(); if (dragSrc) reorder(dragSrc, c); setDragSrc(null); setDragOver(null); }}
              onDragEnd={() => { setDragSrc(null); setDragOver(null); }}
              style={{
                ...rowBase,
                opacity: dragSrc === c ? 0.5 : 1,
                boxShadow: dragOver === c && dragSrc && dragSrc !== c ? `0 0 0 2px ${colors.accent} inset` : 'none',
              }}>
              <span style={{ cursor: 'grab', color: colors.textMute, display: 'flex' }}><GripVertical size={14} /></span>
              <span style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: getProjectColor(c), color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
              }}>{i + 1}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{c}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button type="button" onClick={() => move(c, 'up')} disabled={i === 0} style={miniBtn(i === 0)} title="上へ"><ChevronUp size={11} /></button>
                  <button type="button" onClick={() => move(c, 'down')} disabled={i === order.length - 1} style={miniBtn(i === order.length - 1)} title="下へ"><ChevronDown size={11} /></button>
                </div>
                <button type="button" onClick={() => remove(c)} title="リストから外す"
                  style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 3, padding: 6, cursor: 'pointer', color: colors.textMute, display: 'flex' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(newName); }}
            placeholder="会社名を入力（まだ案件が無い会社も登録可）"
            style={{ flex: 1, padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 13, boxSizing: 'border-box' }} />
          <button type="button" onClick={() => add(newName)}
            style={{ background: colors.accentSoft, border: `1px solid ${colors.accent}`, color: colors.accent, fontWeight: 600, padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
            <Plus size={14} /> 会社を追加
          </button>
        </div>
      </div>

      {unregistered.length > 0 && (
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>未登録の会社（案件に存在）</div>
          <div style={{ fontSize: 11, color: colors.textMute, marginBottom: 10 }}>
            並び順に未登録のため、登録済みの後ろ（オフショアより前・名前順）に表示されます。「登録」で並び順に加えられます。
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unregistered.map(c => (
              <div key={c} style={rowBase}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: getProjectColor(c), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>—</span>
                <span style={{ fontSize: 13 }}>{c}</span>
                <span style={{ fontSize: 10, color: colors.textMute, background: '#eceae3', borderRadius: 8, padding: '1px 7px' }}>未登録</span>
                <button type="button" onClick={() => add(c)} title="並び順に登録"
                  style={{ marginLeft: 'auto', background: '#fff', border: `1px solid ${colors.accent}`, color: colors.accent, fontWeight: 600, padding: '5px 12px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12 }}>
                  登録
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
