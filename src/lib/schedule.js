// スケジューリング・マイグレーション・並び順・視点グループ化のロジック。App.jsx から分割。
// ============ マイグレーション ============
import { COMPANY_PRESETS, addDays, fmtYMD, getDailySlots, getDaySlots, isNonWorkingDay, isSameDay, parseHM, parseYMD, startOfDay, timeToMin } from './utils.js';
import { deliveryBaseName, deliveryNameForNumber, metaFromGroup, roundTypeOf } from '../viewpoint/viewpointUtils.js';
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
// 同じ会社の進行中案件のうち、実効納期がこの案件以前のものの件数＋0.5 を仮の priority として返す。
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

// 進行中案件一覧の「会社グループの表示順」用ランク。
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
function computeLateRisks(activeScheduled, now) {
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
function computeFreeHours(activeScheduled, settings, assignees, now, numDays) {
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
function latestActualEnd(steps) {
  let latest = '';
  for (const t of (steps || [])) {
    if (!t.actualEnd) continue;
    if (!latest || new Date(t.actualEnd).getTime() > new Date(latest).getTime()) latest = t.actualEnd;
  }
  return latest;
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

// タスク群（案件・視点など）の進行中案件の最終 scheduledEnd を timestamp で返す（無ければ null）
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
      const stepHours = hoursStr.trim() === '' ? 0 : parseHM(hoursStr);
      if (isNaN(stepHours) || stepHours <= 0) continue; // 制作時間のあるステップのみスケジュール対象
      const completedRaw = (step.completedHours === '' || step.completedHours == null) ? 0 : parseHM(step.completedHours);
      // 完了済みステップ（完了時間≧制作時間）は登録時に done のままになるためスケジュール対象外
      if (!isNaN(completedRaw) && completedRaw >= stepHours) continue;
      const stepAssignee = (step.assignee || '').trim() || vpAssignee;
      records.push({
        id: `__preview-${seq}`,
        projectName: (form.projectName || '').trim(),
        companyName: (form.companyName || '').trim(),
        viewpointName: vpName,
        assignee: stepAssignee,
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
// 第2引数 vpDeliveryCount（任意）：project::viewpoint → 納品ステップ数 の Map。
// 渡されると「視点の全タスク（active+done＝移行済みの請求専用ステップ含む）」を横断した
// 正確な納品回数を使う。未指定ならグループ内（＝渡された tasks 範囲）のみで数える。
function groupByViewpoint(tasks, vpDeliveryCount) {
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
        viewpointNameExternal: task.viewpointNameExternal || '',
        viewpointCategory: task.viewpointCategory || '',
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
    if (!groups[key].viewpointNameExternal && task.viewpointNameExternal) groups[key].viewpointNameExternal = task.viewpointNameExternal;
    if (!groups[key].viewpointCategory && task.viewpointCategory) groups[key].viewpointCategory = task.viewpointCategory;
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
    // 視点メタ（制作履歴・納品名・集計フラグ）。タスクに複製保存されたものを集約。
    const meta = metaFromGroup(g);
    g.prodHistory = meta.history;
    g.deliveryNameOverride = meta.deliveryNameOverride;
    g.countAsDelivery = meta.countAsDelivery;
    // 納品名のベースは「社外視点名」優先（無ければ社内視点名）
    const base = deliveryBaseName(g.projectName, g.viewpointNameExternal || g.viewpointName, meta.deliveryNameOverride);
    g.deliveryBaseName = base;
    // 納品回数＝納品種類（初回/追加）のステップ数。種類が空（''）や修正(fix)は数えない。
    // vpDeliveryCount があれば視点の全タスク（移行済みの完了ステップ含む）を横断した値を使う。
    const pvKey = `${g.projectName || ''}::${g.viewpointName || ''}`;
    const dcnt = vpDeliveryCount
      ? (vpDeliveryCount.get(pvKey) || 0)
      : g.tasks.filter(t => { const rt = (t.stepRoundType || '').trim(); return rt && roundTypeOf(rt).isDelivery; }).length;
    g.deliveryCount = dcnt;
    g.deliveryName = deliveryNameForNumber(base, dcnt > 1 ? dcnt : 1);
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


export {
  migrateTask, normalizePriorities, deadlineKey, effectiveDeadlineKey, deadlineInsertPriority,
  companyRank, companyDisplayRank, compareCompanyDisplay, companySequence, computeProjectOrder,
  scheduleTasks, computeLateRisks, computeFreeHours, latestActualEnd, buildDoneSlots, maxOvertimeEndMin,
  subtractBusy, dayAbsence, isOnLeaveAt, dayOvertimeIntervals, dayWorkSlots,
  elapsedHoursForSlots, workingHoursBetweenTs, projectEndTs, formEditIds, formPreviewRecords,
  simulateFormSchedule, computeDeadlineReorder, sortAssigneesByMaster, groupByViewpoint,
};
