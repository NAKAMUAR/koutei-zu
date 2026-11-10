// 連絡文からまとめて仮登録（案件タブの「連絡文からまとめて仮登録」）。
// 【案件名】で始まる塊ごとに、担当者様・制作状況・カット数／制作枚数・着手予定・納品予定を読み取り、
// 仮案件（tentative）の作業を作る。着手予定がある案件はその日の朝から始め（manualStart）、
// 「確認中」の案件は開始を決めずスケジュールの空いているところに入れる。
import { makeStepFromPreset } from './utils.js';
import { resolveViewpointSteps } from '../viewpoint/viewpointUtils.js';

const z2h = (s) => String(s || '').replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));

// 「11/11（水）」→ 'YYYY-MM-DD'。「確認中」など日付が無ければ ''。年は今日に近い方
function parseMD(text, today) {
  const m = z2h(text).match(/(\d{1,2})\s*[/月]\s*(\d{1,2})/);
  if (!m) return '';
  const mo = Number(m[1]), d = Number(m[2]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return '';
  const t = today instanceof Date ? today : new Date(today);
  let y = t.getFullYear();
  if (mo < t.getMonth() + 1 - 6) y++;
  else if (mo > t.getMonth() + 1 + 6) y--;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// 「外観1枚＋内観1枚」→ [{category:'外観',count:1},{category:'内観',count:1}]、「14～15枚程度」→ [{category:'',count:15}]
function parseCuts(text) {
  const s = z2h(text);
  const out = [];
  const re = /(外観|内観)\s*(\d+)\s*枚?/g;
  let m;
  while ((m = re.exec(s))) out.push({ category: m[1], count: Number(m[2]) });
  if (out.length) return out;
  const nums = (s.match(/\d+/g) || []).map(Number).filter(n => n > 0);
  return nums.length ? [{ category: '', count: Math.max(...nums) }] : [];
}

const FIELD_RE = /^(担当者様?|担当|制作状況|進捗状況|カット数|制作枚数|枚数|着手予定|納品予定)\s*[：:]\s*(.*)$/;

// 連絡文 → [{ name, contact, status, cuts, start, end, notes }]
function parseTentativeText(text, today = new Date()) {
  const out = [];
  let cur = null;
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^```/.test(line)) continue;
    if (line.startsWith('【')) {
      // 【福山市】鈴木崇司様 → 福山市 鈴木崇司様
      const name = line.replace(/【/g, '').replace(/】/g, ' ').replace(/\s+/g, ' ').trim();
      cur = { name, contact: '', status: '', cuts: [], cutsText: '', start: '', end: '', startText: '', endText: '', notes: [] };
      out.push(cur);
      continue;
    }
    if (!cur) continue;
    const f = line.match(FIELD_RE);
    if (!f) { cur.notes.push(line); continue; }
    const [, key, val] = f;
    if (key.startsWith('担当')) cur.contact = val.trim();
    else if (key === '制作状況' || key === '進捗状況') cur.status = val.trim();
    else if (key === '着手予定') { cur.startText = val.trim(); cur.start = parseMD(val, today); }
    else if (key === '納品予定') { cur.endText = val.trim(); cur.end = parseMD(val, today); }
    else { cur.cutsText = val.trim(); cur.cuts = parseCuts(val); }
  }
  return out;
}

// 過去の作業から、1枚（視点）あたりのホワイト・カラーの時間の目安（中央値）を出す。
// 同じ会社・同じ区分 → 同じ会社 → 全体 の順で、3件以上あるものを使う。無ければ null
function historyHours(tasks, company, category) {
  const median = (arr) => { if (arr.length < 3) return null; const a = [...arr].sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
  const pick = (filter) => {
    const per = { white: new Map(), color: new Map() };
    for (const t of (tasks || [])) {
      if (!filter(t)) continue;
      const kind = t.stepTypeId === 'white' ? 'white' : t.stepTypeId === 'color' ? 'color' : null;
      const h = Number(t.hours) || 0;
      if (!kind || h <= 0) continue;
      const k = `${t.projectName}::${t.viewpointName}`;
      per[kind].set(k, (per[kind].get(k) || 0) + h);
    }
    return { white: median([...per.white.values()]), color: median([...per.color.values()]) };
  };
  const c = (company || '').trim();
  const tries = [
    t => (t.companyName || '').trim() === c && category && (t.viewpointCategory || '') === category,
    t => (t.companyName || '').trim() === c,
    () => true,
  ];
  const res = { white: null, color: null };
  for (const f of tries) {
    const r = pick(f);
    if (res.white == null) res.white = r.white;
    if (res.color == null) res.color = r.color;
    if (res.white != null && res.color != null) break;
  }
  return res;
}

// 読み取った案件 → 作業（タスク）。opts: { company, assignee, hours: { 外観|内観|'': { white, color } }, stepTypeMaster, morningStart, now, priorityOf(project) }
function buildTentativeRecords(projects, opts) {
  const now = opts.now || Date.now();
  const regDate = new Date(now);
  const reg = `${regDate.getFullYear()}-${String(regDate.getMonth() + 1).padStart(2, '0')}-${String(regDate.getDate()).padStart(2, '0')}`;
  const records = [];
  let seq = 0;
  for (const p of projects) {
    const counter = {};
    let firstOfProject = true;
    for (const cut of (p.cuts.length ? p.cuts : [{ category: '', count: 1 }])) {
      const h = (opts.hours && opts.hours[cut.category]) || {};
      for (let i = 0; i < cut.count; i++) {
        const prefix = cut.category === '外観' ? 'EX' : cut.category === '内観' ? 'IN' : '視点';
        counter[prefix] = (counter[prefix] || 0) + 1;
        const vpName = `${prefix}${counter[prefix]}`;
        const steps = ['white', 'color'].map(makeStepFromPreset);
        const resolved = resolveViewpointSteps(steps, opts.stepTypeMaster);
        let order = 0;
        steps.forEach((s, si) => {
          const kind = si === 0 ? 'white' : 'color';
          const hours = Number(h[kind]) || 0;
          if (hours <= 0) return;
          const r = resolved[si] || {};
          records.push({
            id: `task-${now}-${seq}-${Math.random().toString(36).slice(2, 7)}`,
            projectName: p.name, projectNameInternal: '',
            companyName: (opts.company || '').trim(), customerContact: p.contact || '',
            viewpointName: vpName, viewpointNameExternal: '', viewpointCategory: cut.category || '',
            stepName: r.label || s.name, stepOrder: order++,
            assignee: (opts.assignee || '').trim(),
            priority: opts.priorityOf ? opts.priorityOf(p) : 9999,
            hours, completedHours: 0,
            memo: [p.status && `制作状況：${p.status}`, p.cutsText && `枚数：${p.cutsText}`, !p.start && p.startText && `着手予定：${p.startText}`, !p.end && p.endText && `納品予定：${p.endText}`, ...p.notes].filter(Boolean).join(' ／ '),
            tentative: true, tentativeStart: p.start || null, tentativeEnd: p.end || null,
            deadline: null, projectDeadline: p.end || null, projectRequestDate: null,
            manualStart: firstOfProject && p.start ? `${p.start}T${opts.morningStart || '09:00'}` : null,
            manualEnd: null, status: 'pending', completedAt: null,
            createdAt: now + seq, registeredDate: reg,
            stepTypeId: r.typeId || s.stepTypeId || '', stepDeliverySuffix: r.deliverySuffix || '',
            stepAmount: '', stepRequestDate: reg, stepCompletedDate: '', stepDeliveryNameOverride: '',
            stepRoundType: '', stepOutInHouse: '', stepOutExternal: '', stepOutVND: '',
          });
          seq++;
          firstOfProject = false;
        });
      }
    }
  }
  return records;
}

// 部屋ごとの時間の表（「A担当：2LDKA（合計49.5h）」の下に「| IN1 | 3 | … |」）→
// { start: 'YYYY-MM-DD', startTime: 'HH:MM', groups: [{ label: 'A担当', unit: '2LDKA', rooms: [{ room: 'IN1', hours: 3 }] }] }
function parseRoomTables(text, today = new Date()) {
  const lines = String(text || '').split(/\r?\n/).map(l => z2h(l).replace(/\*\*/g, '').trim());
  const groups = [];
  let cur = null;
  let start = '';
  let startTime = '';
  for (const line of lines) {
    if (!line) continue;
    if (!start) {
      const m = line.match(/(\d{1,2}\s*\/\s*\d{1,2})[^。、]{0,8}着手/);
      if (m) start = parseMD(m[1], today);
    }
    if (!startTime) {
      const t = line.match(/作業は\s*(\d{1,2}):(\d{2})/);
      if (t) startTime = `${t[1].padStart(2, '0')}:${t[2]}`;
    }
    if (line.startsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      const h = parseFloat(cells[1]);
      if (cur && cells[0] && !/^-+$/.test(cells[0]) && !isNaN(h) && h > 0) cur.rooms.push({ room: cells[0], hours: h });
      continue;
    }
    const g = line.match(/^([^：:|]{1,20})[：:]\s*([^（(]+?)\s*[（(]\s*合計/);
    if (g) { cur = { label: g[1].trim(), unit: g[2].trim(), rooms: [] }; groups.push(cur); }
  }
  return { start, startTime, groups: groups.filter(x => x.rooms.length) };
}

// 表 → 作業。部屋ごとに1つの視点（IN1_2LDKA）・1つの作業（制作）。グループごとに表の順で続けて作業する。
// opts: { projectName, projectNameInternal, company, assignees: { [label]: name }, tentative, morningStart, now, priority }
function buildRoomRecords(table, opts) {
  const now = opts.now || Date.now();
  const d = new Date(now);
  const reg = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const records = [];
  let seq = 0;
  for (const g of table.groups) {
    g.rooms.forEach((r, i) => {
      const vpName = g.unit ? `${r.room}_${g.unit}` : r.room;
      records.push({
        id: `task-${now}-${seq}-${Math.random().toString(36).slice(2, 7)}`,
        projectName: (opts.projectName || '').trim(), projectNameInternal: (opts.projectNameInternal || '').trim(),
        companyName: (opts.company || '').trim(), customerContact: '',
        viewpointName: vpName, viewpointNameExternal: '', viewpointCategory: /^IN/i.test(r.room) ? '内観' : /^EX/i.test(r.room) ? '外観' : '',
        stepName: '制作', stepOrder: 0,
        assignee: ((opts.assignees || {})[g.label] || '').trim(),
        priority: opts.priority ?? 9999,
        hours: r.hours, completedHours: 0,
        memo: `${g.label}（${g.unit}）の${i + 1}番目`,
        tentative: !!opts.tentative, tentativeStart: null, tentativeEnd: null,
        deadline: null, projectDeadline: null, projectRequestDate: null,
        manualStart: i === 0 && table.start ? `${table.start}T${table.startTime || opts.morningStart || '09:00'}` : null,
        manualEnd: null, status: 'pending', completedAt: null,
        // 表の順に並ぶよう、作った順に少しずつずらす
        createdAt: now + seq, registeredDate: reg,
        stepTypeId: '', stepDeliverySuffix: '',
        stepAmount: '', stepRequestDate: reg, stepCompletedDate: '', stepDeliveryNameOverride: '',
        stepRoundType: '', stepOutInHouse: '', stepOutExternal: '', stepOutVND: '',
      });
      seq++;
    });
  }
  return records;
}

export { parseRoomTables, buildRoomRecords, parseMD, parseCuts, parseTentativeText, historyHours, buildTentativeRecords };
