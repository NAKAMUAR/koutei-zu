// 過去分の取り込み（旧「Project Schedule」の『案件シート(一覧)』）— 純ロジック。
// 使い方：旧シートのタブをまるごとコピー → 「過去分の取り込み」画面に貼る →
//   ① 表を読む（見出し「社内案件名」の行を探し、列は見出し名で決める）
//   ② 社内案件名ごとに1件にまとめる（カット数・行数・White/Color 合計・推定の登録日）
//   ③ 工程図にすでにある案件（社内案件名が同じ）を外す
//   ④ 完了済み・担当者不明（過去分）のタスクとして登録する
// 旧シートには担当者・作成日時の列が無いので、登録日はサーバリンクのフォルダ名（…\2026\2026-5\…\0522）から推定する。

export const LEGACY_ASSIGNEE = '担当者不明（過去分）';
export const LEGACY_SOURCE = 'project-schedule';
// 旧シートを作った日（これより前の日付はフォルダ名の書き間違いとみなして使わない）
const MIN_YMD = '2025-06-01';

// 会社コードの英字 → 工程図の会社名（連携シートの『会社マスタ』の初期値と同じ）
const COMPANY_BY_PREFIX = {
  REN: 'リノべる株式会社', SUM: 'SUMUS', TAMAZEN: '玉善', OFFICE: 'オフィスコム', TANAKA: '田中建設', CG: 'CG工房',
  RIC: '株式会社リックデザイン', DESIGN: 'デザイン経営研究舎', CONTE: 'CONTE', SAN: '株式会社サンゲツ', ATO: 'アトリエジグゾー',
  GRAY: 'グレイ美術', ALEG: 'ALEG', ESAKI: 'エサキホーム', WUNDER: 'ヴンダー', SOCIAL: 'ソーシャルインテリア', FRY: 'FRYGALLERY',
};
// 旧シートで見つかった書き間違い・別表記 → 会社コード（会社名を決めるためだけに使う。社内案件名は書き換えない）
const PREFIX_ALIASES = {
  RENOBERU: 'REN', RENOVERU: 'REN', RREN: 'REN', OFICE: 'OFFICE', OFF: 'OFFICE', OFFFICE: 'OFFICE', TANAK: 'TANAKA', TANAKKA: 'TANAKA',
  SANGETSU: 'SAN', ESAK: 'ESAKI', CCONTE: 'CONTE', SUMUS: 'SUM', ATORIEJIGUSO: 'ATO', RICTEST: 'RIC', TAMA: 'TAMAZEN', FLY: 'FRY',
};

/** 社内案件名の照合用（大文字・記号と空白なし）：'Ren.94' / 'REN 94' → 'REN94' */
export function normCode(s) {
  return String(s || '').toUpperCase().replace(/[.\s_\-－ー　]/g, '');
}

/** タブ区切りの文字（スプレッドシートからのコピー）→ 2次元配列。"…" で囲まれたセル（改行・タブ入り）にも対応 */
export function parseTSV(text) {
  const src = String(text || '').replace(/\r\n?/g, '\n');
  const rows = [];
  let row = [], cell = '', i = 0, quoted = false;
  while (i < src.length) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i += 2; continue; }
        quoted = false; i++; continue;
      }
      cell += ch; i++; continue;
    }
    if (ch === '"' && cell === '') { quoted = true; i++; continue; }
    if (ch === '\t') { row.push(cell); cell = ''; i++; continue; }
    if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; continue; }
    cell += ch; i++;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/** 貼った表 → 旧シートの行 [{ srcRow, code, name, cut, link, white, color, done }]。見出しが見つからなければ error */
export function readLegacyRows(text) {
  const grid = parseTSV(text);
  const clean = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const hr = grid.findIndex(r => r.some(c => clean(c) === '社内案件名') && r.some(c => clean(c).startsWith('カット名')));
  if (hr < 0) return { rows: [], error: '見出し「社内案件名」「カット名」の行が見つかりません。『案件シート(一覧)』の A1:AC9299 を選んでコピーし、貼ってください（見出しの行も入れる）' };
  const head = grid[hr].map(clean);
  const col = (pred) => head.findIndex(pred);
  const cCode = col(h => h === '社内案件名');
  const cName = col(h => h.startsWith('社外案件名'));
  const cCut = col(h => h.startsWith('カット名'));
  const cLink = col(h => h.startsWith('サーバ'));
  const est = head.map((h, i) => (h.startsWith('予想時間') ? i : -1)).filter(i => i >= 0);
  const cDone = col(h => h.startsWith('作業完了'));
  const num = (v) => { const x = parseFloat(String(v || '').replace(/,/g, '')); return isFinite(x) && x > 0 ? x : 0; };
  const rows = [];
  for (let r = hr + 1; r < grid.length; r++) {
    const v = grid[r];
    const code = clean(v[cCode]);
    if (!code) continue;
    rows.push({
      srcRow: r + 1,
      code,
      name: cName >= 0 ? clean(v[cName]) : '',
      cut: cCut >= 0 ? clean(v[cCut]) : '',
      link: cLink >= 0 ? String(v[cLink] || '').trim() : '',
      white: est[0] != null ? num(v[est[0]]) : 0,
      color: est[1] != null ? num(v[est[1]]) : 0,
      done: cDone >= 0 ? /^true$/i.test(clean(v[cDone])) : false,
    });
  }
  return { rows, error: rows.length ? '' : '見出しより下にデータの行がありません' };
}

const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const validDate = (y, m, d) => { const t = new Date(y, m - 1, d); return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d; };

/** サーバリンクのフォルダ名 → 推定の日付 { date:'YYYY-MM-DD', basis:'day'|'month' } か null */
export function estimateDateFromLink(link) {
  const s = String(link || '');
  const m = s.match(/[\\/](20\d\d)-(\d{1,2})[\\/]/);
  if (!m) return null;
  const y = +m[1], mo = +m[2];
  if (mo < 1 || mo > 12) return null;
  const rest = s.slice(m.index + m[0].length);
  for (const seg0 of rest.split(/[\\/]/)) {
    const seg = seg0.trim().replace(/^-+/, '').trim();
    // 「0522」「519」（月日）または「6-27」「6.27」
    const md = /^\d{3,4}$/.test(seg) ? [seg.slice(0, seg.length - 2), seg.slice(-2)] : (seg.match(/^(\d{1,2})[-.](\d{1,2})$/) || []).slice(1);
    if (md.length !== 2) continue;
    const mon = +md[0], day = +md[1];
    if (mon < 1 || mon > 12 || day < 1 || day > 31) continue;
    if (![0, 1, 11].includes(((mon - mo) % 12 + 12) % 12)) continue; // フォルダの月と同じか前後1か月
    const yy = (mo === 12 && mon === 1) ? y + 1 : (mo === 1 && mon === 12) ? y - 1 : y;
    if (!validDate(yy, mon, day)) continue;
    const d = ymd(yy, mon, day);
    if (d >= MIN_YMD) return { date: d, basis: 'day' };
  }
  const d = ymd(y, mo, 1);
  return d >= MIN_YMD ? { date: d, basis: 'month' } : null;
}
function companyFromLink(link) {
  const s = String(link || '');
  const m = s.match(/[\\/](20\d\d)-(\d{1,2})[\\/]/);
  if (!m) return '';
  const seg = s.slice(m.index + m[0].length).split(/[\\/]/)[0] || '';
  return seg.replace(/\s*[（(].*$/, '').trim();
}
const mostCommon = (arr) => {
  const c = new Map();
  for (const v of arr) if (v) c.set(v, (c.get(v) || 0) + 1);
  let best = '', n = 0;
  for (const [k, v] of c) if (v > n) { best = k; n = v; }
  return best;
};

/** 旧シートの行 → 社内案件名ごとの案件（並びは推定の登録日の古い順） */
export function summarizeLegacy(rows) {
  const groups = new Map();
  for (const r of (rows || [])) {
    const k = normCode(r.code);
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const out = [];
  for (const [key, rs] of groups) {
    const prefix = (key.match(/^[A-Z]*/) || [''])[0];
    const canon = PREFIX_ALIASES[prefix] || prefix;
    const dates = rs.map(r => estimateDateFromLink(r.link)).filter(Boolean);
    const ds = dates.map(d => d.date).sort();
    const cuts = new Map();
    for (const r of rs) if (r.cut) cuts.set(r.cut, (cuts.get(r.cut) || 0) + 1);
    const white = Math.round(rs.reduce((s, r) => s + r.white, 0) * 100) / 100;
    const color = Math.round(rs.reduce((s, r) => s + r.color, 0) * 100) / 100;
    const name = mostCommon(rs.map(r => r.name));
    const notes = [];
    if (prefix !== canon) notes.push(`表記ゆれの可能性（${prefix}→${canon}）`);
    const isTest = /TEST/.test(key);
    if (isTest) notes.push('テストの行らしい');
    if (!COMPANY_BY_PREFIX[canon]) notes.push('会社名はフォルダ名から');
    if (!name) notes.push('社外案件名なし');
    if (!ds.length) notes.push('日付が分からない');
    out.push({
      key,
      code: mostCommon(rs.map(r => r.code)),
      name,
      company: COMPANY_BY_PREFIX[canon] || mostCommon(rs.map(r => companyFromLink(r.link))),
      firstDate: ds[0] || '',
      lastDate: ds[ds.length - 1] || '',
      dateBasis: dates.some(d => d.basis === 'day') ? 'フォルダの日付' : ds.length ? 'フォルダの年月（1日として）' : 'なし',
      cutCount: cuts.size,
      rowCount: rs.length,
      cuts: [...cuts].map(([c, n]) => (n > 1 ? `${c}×${n}` : c)),
      white, color, total: Math.round((white + color) * 100) / 100,
      link: (rs.find(r => r.link) || {}).link || '',
      srcRows: rs.length > 1 ? `${rs[0].srcRow}〜${rs[rs.length - 1].srcRow}` : String(rs[0].srcRow),
      doneCount: rs.filter(r => r.done).length,
      isTest,
      notes,
    });
  }
  return out.sort((a, b) => (a.firstDate || '9999').localeCompare(b.firstDate || '9999') || a.code.localeCompare(b.code, 'ja'));
}

/** 工程図にすでにある社内案件名（社内案件名・案件名・前に取り込んだ過去分）の集合 */
export function existingCodes(tasks) {
  const set = new Set();
  for (const t of (tasks || [])) {
    for (const v of [t.projectNameInternal, t.projectName, t.legacyKey]) {
      const k = normCode(v);
      if (k) set.add(k);
    }
  }
  return set;
}

// ============ 担当者の表（LINE の朝の一覧から作った『LINEの担当者』タブ） ============
/**
 * 照合キー：先頭の「英字＋番号」を、英字は大文字・番号は先頭の0を除いて作る（'Social.06_IN3' → 'SOCIAL6'、'TANAKA 352' → 'TANAKA352'）。
 * 先頭が IN・EX・TEST の場合や番号が無い場合は null（視点の番号を案件と取り違えないため）
 */
export function lineKey(code) {
  const m = String(code || '').match(/^\s*([A-Za-z]+)\s*[.\-_ ,，]?\s*(\d+)/);
  if (!m) return null;
  const p = m[1].toUpperCase();
  if (p === 'IN' || p === 'EX' || p === 'TEST') return null;
  return p + String(parseInt(m[2], 10));
}
/**
 * 『LINEの担当者』タブを貼った表 → Map(照合キー → { assignee, others, support, first, last, active })。
 * 見出し「照合キー」「担当者…」の行を探し、列は見出し名で決める（人が直した担当者もそのまま使う）
 */
export function readAssigneeTable(text) {
  const grid = parseTSV(text);
  const clean = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const hr = grid.findIndex(r => r.some(c => clean(c) === '照合キー') && r.some(c => clean(c).startsWith('担当者')));
  const map = new Map();
  if (hr < 0) return { map, error: '見出し「照合キー」「担当者」の行が見つかりません。『LINEの担当者』タブを見出しの行から選んでコピーしてください' };
  const head = grid[hr].map(clean);
  const col = (pred) => head.findIndex(pred);
  const c = {
    key: col(h => h === '照合キー'), code: col(h => h.startsWith('社内案件名')), who: col(h => h.startsWith('担当者')),
    others: col(h => h.startsWith('ほかに')), support: col(h => h.startsWith('サポート')),
    first: col(h => h.startsWith('最初')), last: col(h => h.startsWith('最後')), state: col(h => h.startsWith('状態')),
    legacy: col(h => h.startsWith('古いシートの案件')),
  };
  const at = (r, i) => (i >= 0 ? clean(r[i]) : '');
  for (let r = hr + 1; r < grid.length; r++) {
    const v = grid[r];
    const label = at(v, c.code);
    const state = at(v, c.state);
    const who = at(v, c.who);
    if (!who || state.startsWith('対象外')) continue; // 社内マニュアルなど案件でないもの
    // 案件コードが無い行（'FRY'・'TANAKA_IN1~3' など）は 'LINE:書き方' で区別する
    const key = at(v, c.key) || lineKey(label) || (label ? `LINE:${normCode(label)}` : '');
    if (!key) continue;
    map.set(key.toUpperCase(), {
      label, assignee: who, others: at(v, c.others), support: at(v, c.support),
      first: at(v, c.first), last: at(v, c.last), active: state.startsWith('制作中'),
      inLegacy: c.legacy >= 0 ? !!at(v, c.legacy) : null,
    });
  }
  return { map, error: map.size ? '' : '担当者の入った行がありません' };
}
/** 案件（summarizeLegacy の結果）に担当者の表を重ねる。一致した案件に assigneeInfo を付けた新しい配列を返す */
export function applyAssignees(projects, map) {
  if (!map || !map.size) return projects;
  return (projects || []).map(p => {
    const k = lineKey(p.code);
    const a = k ? map.get(k) : null;
    if (!a) return p;
    const notes = p.notes.slice();
    if (a.active) notes.push('LINEでは制作中（過去分にしない）');
    return { ...p, assigneeInfo: a, notes, lastDate: a.last && a.last > (p.lastDate || '') ? a.last : p.lastDate };
  });
}
/**
 * 担当者の表にだけある案件（古いシートに無い・案件コードが無い）→ 「内容不明」の過去分（summarizeLegacy と同じ形）。
 * legacyProjects を渡せばそれと照合し、渡さなければ表の「古いシートの案件」が空のものを使う。制作中は除く
 */
export function lineOnlyProjects(map, legacyProjects) {
  if (!map || !map.size) return [];
  const known = legacyProjects ? new Set(legacyProjects.map(p => lineKey(p.code)).filter(Boolean)) : null;
  const out = [];
  for (const [key, a] of map) {
    if (a.active) continue;
    if (known ? known.has(key) : a.inLegacy !== false) continue;
    const coded = !key.startsWith('LINE:');
    const notes = [coded ? '古いシートに無い（LINE だけ）・内容は不明' : '案件コードが無い（LINE の書き方のまま）・内容は不明'];
    out.push({
      key, code: a.label || key, name: '', company: '',
      firstDate: a.first, lastDate: a.last, dateBasis: 'LINE の朝の一覧に出た日',
      cutCount: 0, rowCount: 0, cuts: [], white: 0, color: 0, total: 0, link: '', srcRows: '',
      doneCount: 0, isTest: false, notes, assigneeInfo: a, lineOnly: true,
    });
  }
  return out;
}
/** 担当者の表の内容をメモの1行にする */
function assigneeMemo(a) {
  if (!a) return '';
  const extra = [a.others ? `ほかに ${a.others}` : '', a.support ? `サポート ${a.support}` : ''].filter(Boolean).join('・');
  return `担当（LINEの朝の一覧より）：${a.assignee}${extra ? `（${extra}）` : ''}${a.first ? `／${a.first}〜${a.last}` : ''}`;
}
/**
 * 取り込み済みの過去分タスクのうち、担当者の表に一致して担当者がまだ「担当者不明（過去分）」のもの → [{ id, patch }]
 */
export function assigneePatchesForImported(tasks, map) {
  const out = [];
  if (!map || !map.size) return out;
  for (const t of (tasks || [])) {
    if (t.legacySource !== LEGACY_SOURCE || t.assignee !== LEGACY_ASSIGNEE) continue;
    const k = lineKey(t.projectNameInternal);
    const a = k ? map.get(k) : null;
    if (!a) continue;
    out.push({ id: t.id, patch: { assignee: a.assignee, memo: [t.memo || '', assigneeMemo(a)].filter(Boolean).join('\n') } });
  }
  return out;
}

/** 案件（summarizeLegacy の1件）→ 工程図のタスク（完了済み・担当者不明・請求済み扱い・スケジュールに影響しない） */
export function legacyTask(p, id, nowMs) {
  const ts = (d, h) => { if (!d) return nowMs; const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd, h, 0).getTime(); };
  const created = ts(p.firstDate, 9);
  const completed = ts(p.lastDate || p.firstDate, 18);
  const memo = [
    p.lineOnly
      ? `LINE の朝の担当一覧にだけ出ていた過去分（旧「Project Schedule」に無い。案件名・会社・時間は不明）`
      : `旧「Project Schedule」から取り込んだ過去分（${p.cutCount}カット・${p.rowCount}行）`,
    p.cuts.length ? `カット：${p.cuts.join('、')}` : '',
    `推定の登録日：${p.firstDate || '不明'}${p.lastDate && p.lastDate !== p.firstDate ? `〜${p.lastDate}` : ''}（${p.dateBasis}）`,
    p.lineOnly ? '' : `White ${p.white}h ／ Color ${p.color}h`,
    p.link ? `サーバーリンク：${p.link}` : '',
    p.srcRows ? `元シートの行：${p.srcRows}` : '',
    assigneeMemo(p.assigneeInfo),
  ].filter(Boolean).join('\n');
  const reg = p.firstDate || new Date(nowMs).toISOString().slice(0, 10);
  return {
    id,
    projectName: p.name || p.code, projectNameInternal: p.code, companyName: p.company, customerContact: '',
    projectDeadline: null, projectRequestDate: reg,
    viewpointName: p.lineOnly ? '過去分（内容不明）' : `過去分（${p.cutCount}カット）`, viewpointNameExternal: '', viewpointCategory: '',
    stepName: p.lineOnly ? '過去分（LINE のみ）' : '過去分（Project Schedule）', stepOrder: 0,
    assignee: (p.assigneeInfo && p.assigneeInfo.assignee) || LEGACY_ASSIGNEE, priority: 9999,
    hours: p.total, completedHours: p.total,
    memo,
    tentative: false, tentativeStart: null, tentativeEnd: null,
    deadline: null, manualStart: null, manualEnd: null,
    status: 'done', completedAt: completed, actualEnd: null,
    reviewState: null, reviewAt: null, reviewUpdatedAt: null, reviewNote: '',
    createdAt: created, registeredDate: reg,
    stepTypeId: '', stepRoundType: '', stepDeliverySuffix: '', stepAmount: '', stepRequestDate: reg, stepCompletedDate: p.lastDate || '',
    stepDeliveryNameOverride: '', stepOutInHouse: '', stepOutExternal: '', stepOutVND: '',
    invoiceCheckedAt: completed, // 過去分は請求済みとして扱う（進行状況の「請求待ち」に出さない）
    legacySource: LEGACY_SOURCE, legacyKey: p.key,
  };
}
