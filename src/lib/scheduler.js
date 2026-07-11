// スケジューラ中核ロジック（App.jsx から分割）。React 非依存の純粋ロジック。
// scripts/tests/ の自動テストの対象。挙動を変えるときはテストも更新すること。
import { fmtYMD, timeToMin, minToTime, addDays, startOfDay, isSameDay, parseYMD, fmtMD } from './datetime.js';

// 全体共通の祝日（ベトナム等）。settings.holidays（YYYY-MM-DD の配列）から同期する。
// isNonWorkingDay は settings を受け取らない箇所が多いため、モジュール変数で保持する
// （案件色の assignProjectColors と同じパターン）。
let HOLIDAY_SET = new Set();
export function syncHolidays(settings) {
  const list = (settings && settings.holidays) || [];
  HOLIDAY_SET = new Set(list.map(h => h && h.date).filter(Boolean));
}
// 第2・第4土曜は午前のみ営業
export function isWorkingSaturday(d) {
  if (d.getDay() !== 6) return false;
  const week = Math.ceil(d.getDate() / 7);
  return week === 2 || week === 4;
}
export function isNonWorkingDay(d) {
  if (HOLIDAY_SET.has(fmtYMD(d))) return true; // 祝日（全体共通の休み）
  if (d.getDay() === 0) return true;
  if (d.getDay() === 6) return !isWorkingSaturday(d);
  return false;
}
// 会社名の候補（プルダウン用・自由入力も可）。並びは既定の表示順
export const COMPANY_PRESETS = [
  'リノべる株式会社',
  '田中建設',
  'オフィスコム',
  'CG工房',
  '玉善',
  'SUMUS',
  'オフショア（その他）',
];

// ===== ベトナムの祝日（候補データ） =====
// 旧暦ベースの祝日（推定・要確認）。政府が毎年、振替日を含めて公式日程を発表するため目安。
// tet=テト元日, tetDays=テト休みの目安日数, hung=フンヴオン王の命日（旧暦3月10日）
export const VN_LUNAR_HOLIDAYS = {
  2025: { tet: '2025-01-29', tetDays: 5, hung: '2025-04-07' },
  2026: { tet: '2026-02-17', tetDays: 5, hung: '2026-04-26' },
  2027: { tet: '2027-02-06', tetDays: 5, hung: '2027-04-16' },
  2028: { tet: '2028-01-26', tetDays: 5, hung: '2028-04-04' },
  2029: { tet: '2029-02-13', tetDays: 5, hung: '2029-04-23' },
  2030: { tet: '2030-02-03', tetDays: 5, hung: '2030-04-12' },
};
// 指定年の祝日候補。各候補 { date:'YYYY-MM-DD', days, label, estimated }
// estimated=true は旧暦ベースで要確認（日付・日数は政府発表に合わせて編集する）
export function vietnamHolidayCandidates(year) {
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
export function expandHolidayDates(startDate, days) {
  const out = [];
  const d = new Date(startDate + 'T00:00:00');
  if (isNaN(d.getTime())) return out;
  for (let i = 0; i < Math.max(1, days || 1); i++) { out.push(fmtYMD(d)); d.setDate(d.getDate() + 1); }
  return out;
}
export const DEFAULT_SETTINGS = {
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

export function getDailySlots(settings) {
  return [
    { start: timeToMin(settings.morningStart), end: timeToMin(settings.morningEnd) },
    { start: timeToMin(settings.afternoonStart), end: timeToMin(settings.afternoonEnd) },
  ];
}
// その日の営業スロット（土曜は午前のみ）
export function getDaySlots(d, settings) {
  const all = getDailySlots(settings);
  if (d.getDay() === 6) return [all[0]];
  return all;
}
export function getDayWorkingHours(d, settings) {
  return getDaySlots(d, settings).reduce((s, x) => s + (x.end - x.start) / 60, 0);
}
export function getHoursPerDay(settings) {
  return getDailySlots(settings).reduce((s, x) => s + (x.end - x.start) / 60, 0);
}
// 納期（"YYYY-MM-DD"）を比較可能な数値キーに変換する。未設定・不正は最後（Infinity）。
export function deadlineKey(dl) {
  if (!dl) return Infinity;
  const n = parseInt(String(dl).replace(/-/g, ''), 10);
  return isNaN(n) ? Infinity : n;
}
// タスクの実効納期（個別納期＞全体納期）の数値キー。
export function effectiveDeadlineKey(t) {
  return deadlineKey(t.deadline || t.projectDeadline);
}
// 優先順位は廃止。新規案件の既定の並び順は「同じ会社の中で納期（実効）の早い順」。
// 同じ会社の進行中案件のうち、実効納期がこの案件以前のものの件数＋0.5 を仮の priority として返す。
// （normalizePriorities が整数へ振り直す。手動ドラッグ／↑↓で上書き可能）
export function deadlineInsertPriority(activeSameCompanyTasks, formDeadlineKey) {
  let before = 0;
  for (const t of activeSameCompanyTasks) {
    if (effectiveDeadlineKey(t) <= formDeadlineKey) before++;
  }
  return before + 0.5;
}

// 会社のランク（小さいほど上）。プリセットの並び順を基準にし、
// 「オフショア（その他）」と会社未設定は常に最後に回す。
export function companyRank(name) {
  const c = name || '';
  if (c === 'オフショア（その他）') return 9000; // 必ず一番下
  if (!c) return 8000;                            // 会社未設定
  const idx = COMPANY_PRESETS.indexOf(c);
  if (idx >= 0) return idx;                       // プリセットの並び順
  return 7000;                                    // プリセット外の会社
}

// 進行中案件一覧の「会社グループの表示順」用ランク。
// companyOrder（settings 保存の会社名配列）に従い、未登録は名前順でオフショアの手前、未分類は最後。
export function companyDisplayRank(name, companyOrder) {
  const c = (name || '').trim();
  if (c === '') return { tier: 4, idx: 0 };                  // 未分類 → 最後
  if (c === 'オフショア（その他）') return { tier: 3, idx: 0 }; // 登録会社群の最後
  const order = (companyOrder || []).map(x => (x || '').trim());
  const idx = order.indexOf(c);
  if (idx >= 0) return { tier: 1, idx };                     // companyOrder の順
  return { tier: 2, idx: 0 };                                // 未登録 → 名前順
}
export function compareCompanyDisplay(a, b, companyOrder) {
  const ra = companyDisplayRank(a, companyOrder), rb = companyDisplayRank(b, companyOrder);
  if (ra.tier !== rb.tier) return ra.tier - rb.tier;
  if (ra.tier === 1) return ra.idx - rb.idx;
  return (a || '').localeCompare(b || '', 'ja');
}

// 会社の並び順（スケジュール・表示の会社の登場順）を決める。
// ランク順 → 同ランクは最初に登録された会社から（createdAt 昇順）。
export function companySequence(activeTasks) {
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
export function computeProjectOrder(activeTasks, projectOrder) {
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
export function subtractBusy(start, end, blocked) {
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
export function dayAbsence(assignee, date, absences) {
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
export function isOnLeaveAt(assignee, when, absences) {
  const abs = dayAbsence(assignee, when, absences);
  if (abs.allDay) return true;
  const min = when.getHours() * 60 + when.getMinutes();
  return abs.intervals.some(([s, e]) => min >= s && min < e);
}

// その担当者・その日の残業時間帯。[[s,e],...]（分）
export function dayOvertimeIntervals(assignee, date, overtimes) {
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
export function dayWorkSlots(assignee, date, settings) {
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
export function dayFreeIntervals(assignee, date, settings, busyMap, absences) {
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

export function scheduleTasks(tasks, settings, projectOrder, now) {
  const dailySlots = getDailySlots(settings);
  const configuredStart = startOfDay(settings.startDate ? new Date(settings.startDate + 'T00:00:00') : new Date());
  // 過去には予定を置かない：起点は「設定された開始日」と「本日」の遅い方にする
  const today = startOfDay(new Date());
  const startDate = configuredStart.getTime() < today.getTime() ? today : configuredStart;
  const startMinOfDay = settings.startTime ? timeToMin(settings.startTime) : dailySlots[0].start;
  const absences = settings.absences || [];

  // 制作中断（suspended）：お客様へ納品後など、進行できず一旦スケジュールから外す案件。
  // 完了ではないが active からも除外し、カレンダー・担当者別・進行中一覧に出さない。
  const active = tasks.filter(t => t.status !== 'done' && !t.suspended);
  const suspended = tasks.filter(t => t.status !== 'done' && t.suspended);
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
    // 当日以降に終えた完了タスクは、カレンダー上で当日に表示しない方針に合わせ、
    // 当日の着手下限（遅れ反映）にも使わない。これにより完了ブロックを隠した跡に
    // 空白が残らず、当日の予定が前詰め（朝から）で配置される。
    if (startOfDay(ae).getTime() >= today.getTime()) continue;
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
  return { active: scheduled, done, review, doneFinal, suspended };
}

// 予測遅延の事前検知：終了予定（スケジューラ計算）が実効納期（個別＞全体）を超える見込みの
// 視点を抽出する。納期が本日以前のものは既存の赤警告（間に合わない恐れ）が担当するため、
// ここでは「納期はまだ先なのに、このままだと超過する」ものだけを返す（早期警告）。
export function computeLateRisks(activeScheduled, now) {
  const todayYmd = fmtYMD(now);
  const map = new Map(); // `${案件}::${視点}` → 集計
  for (const t of activeScheduled) {
    const dl = (t.deadline || t.projectDeadline || '').trim();
    if (!dl || !t.scheduledEnd) continue;
    const key = `${t.projectName || ''}::${t.viewpointName || ''}`;
    const endTs = t.scheduledEnd.getTime() + (t.scheduledEndMin || 0) * 60000;
    const e = map.get(key) || {
      projectName: t.projectName || '', projectNameInternal: t.projectNameInternal || '',
      viewpointName: t.viewpointName || '', assignee: t.assignee || '', deadline: dl, endTs: 0,
    };
    if (endTs > e.endTs) { e.endTs = endTs; e.assignee = t.assignee || e.assignee; }
    if (dl < e.deadline) e.deadline = dl;
    map.set(key, e);
  }
  const out = [];
  for (const e of map.values()) {
    if (e.deadline <= todayYmd) continue; // 本日・超過分は赤警告側
    const endYmd = fmtYMD(new Date(e.endTs));
    if (endYmd <= e.deadline) continue;
    const lateDays = Math.round((parseYMD(endYmd).getTime() - parseYMD(e.deadline).getTime()) / 86400000);
    out.push({ ...e, endYmd, lateDays });
  }
  return out.sort((a, b) => b.lateDays - a.lateDays || (a.deadline < b.deadline ? -1 : 1));
}

// 担当者×営業日の空き時間（h）を集計する（カレンダーの空き時間サマリー用）。
// スケジュール済みスロットを予約として引き、休日・不在・残業枠も考慮する
// （dayFreeIntervals と同じ規則）。numDays ぶんの営業日を今日から数える。
export function computeFreeHours(activeScheduled, settings, assignees, now, numDays) {
  const busyMap = {};
  for (const t of activeScheduled) {
    for (const slot of (t.slots || [])) {
      const a = t.assignee || '';
      if (!busyMap[a]) busyMap[a] = new Map();
      const ymd = fmtYMD(slot.date);
      if (!busyMap[a].has(ymd)) busyMap[a].set(ymd, []);
      busyMap[a].get(ymd).push([slot.startMin, slot.endMin]);
    }
  }
  const days = [];
  let d = startOfDay(now);
  let guard = 0;
  while (days.length < numDays && guard++ < 120) {
    if (!isNonWorkingDay(d)) days.push(new Date(d));
    d = addDays(d, 1);
  }
  const absences = settings.absences || [];
  const byAssignee = {};
  for (const a of assignees) {
    byAssignee[a] = days.map(day => {
      const free = dayFreeIntervals(a, day, settings, busyMap, absences);
      return free.reduce((s, [fs, fe]) => s + (fe - fs), 0) / 60;
    });
  }
  return { days, byAssignee };
}

// 視点（ステップ群）の完了実績（actualEnd）のうち最も遅い時刻を返す。
// 編集フォームの「終了時間」を、終了時間指定が無くても完了済みの実終了時刻で埋めるために使う。
export function latestActualEnd(steps) {
  let latest = '';
  for (const t of (steps || [])) {
    if (!t.actualEnd) continue;
    if (!latest || new Date(t.actualEnd).getTime() > new Date(latest).getTime()) latest = t.actualEnd;
  }
  return latest;
}

// 完了タスクのカレンダー表示用スロット：実終了時刻（actualEnd、無ければ completedAt）から
// 制作時間ぶん営業時間を遡って配置する。同担当者の完了タスク同士は重ならないよう後ろから詰める
export function buildDoneSlots(doneTasks, settings) {
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
export function maxOvertimeEndMin(settings) {
  let max = 0;
  for (const o of (settings.overtimes || [])) {
    if (o && o.startTime && o.endTime) max = Math.max(max, timeToMin(o.endTime));
  }
  return max;
}

// 経過進捗（時間経過ベース）：slots のうち現在時刻 now より前の部分の合計時間（h）
export function elapsedHoursForSlots(slots, now) {
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
export function workingHoursBetweenTs(fromTs, toTs, assignee, settings) {
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

// タスク群（案件・視点など）の進行中案件の最終 scheduledEnd を timestamp で返す（無ければ null）
export function projectEndTs(tasks) {
  let best = null;
  for (const t of tasks) {
    if (t.status === 'done' || !t.scheduledEnd) continue;
    const ts = startOfDay(t.scheduledEnd).getTime() + (t.scheduledEndMin || 0) * 60000;
    if (best == null || ts > best) best = ts;
  }
  return best;
}

