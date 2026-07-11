// 共通ユーティリティ（色・日付・時刻・プリセット・マスタ正規化など）。App.jsx から分割。
import { DEFAULT_STEP_TYPES } from '../viewpoint/viewpointUtils.js';

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
// 小数時間 → "HH:MM"（分単位に丸めて表示）。制作時間・経過・残時間の表示用。
const fmtHM = (h) => {
  const v = (h == null || isNaN(h)) ? 0 : h;
  const totalMin = Math.round(Math.max(0, v) * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};
// 読み仮名ベースの照合用に正規化する。
// 全角/半角（NFKC）・大文字小文字を揃え、カタカナ→ひらがなに統一する。
// これにより「りのべる」「リノベル」「ﾘﾉﾍﾞﾙ」などスクリプト違いを同一視できる。
// （漢字→読みの変換は読み仮名データが無いため対象外）
const kanaNormalize = (s) => {
  if (s == null) return '';
  let r = String(s).normalize('NFKC').toLowerCase();
  // カタカナ（ァ-ヶ）→ ひらがな
  r = r.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  return r;
};
// "HH:MM" / "H:MM" / 素の数値（時間）→ 小数時間。入力用。無効なら NaN。
const parseHM = (str) => {
  if (str == null) return NaN;
  const s = String(str).trim();
  if (s === '') return NaN;
  if (s.includes(':')) {
    const parts = s.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] === undefined || parts[1] === '' ? '0' : parts[1], 10);
    if (isNaN(h) || isNaN(m) || m < 0 || m >= 60) return NaN;
    return h + m / 60;
  }
  const v = parseFloat(s);
  return isNaN(v) ? NaN : v;
};

// datetime-local 値（"YYYY-MM-DDTHH:mm"）← → Date
const dtLocalToDate = (s) => s ? new Date(s) : null;
const dateToDtLocal = (d) => {
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// 依頼項目（視点）プリセット
// プリセットのステップは種類マスタのID（DEFAULT_STEP_TYPES の id）で指定する。
const VIEWPOINT_PRESETS = [
  { id: 'pers', name: 'パース', steps: ['white', 'color'] },
  { id: 'photo', name: '写真合成', steps: [{ name: '写真合成' }] },
];
// ステップ1件分の空テンプレート（種類・外注などの請求情報を含む）。
// stepTypeId: ステップ種類マスタの選択ID（プルダウン）。name は表示・検証用の素の名称。
function makeEmptyStep(name = '', stepTypeId = '') {
  return {
    name, stepTypeId, hours: '', completedHours: '',
    amount: '', requestDate: '', completedDate: '', deliveryName: '',
    // 種類（初回/追加/修正）・外注情報（社内外注者/社外外注者/外注VND）。請求はステップが唯一の元データ。
    roundType: '', outInHouse: '', outExternal: '', outVND: '',
  };
}
// プリセットのステップ定義（種類ID文字列 or {name} or {typeId}）→ 空ステップに変換。
function makeStepFromPreset(entry) {
  if (typeof entry === 'string') {
    const t = DEFAULT_STEP_TYPES.find(x => x.id === entry);
    return t ? makeEmptyStep(t.label, t.id) : makeEmptyStep(entry);
  }
  if (entry && entry.typeId) {
    const t = DEFAULT_STEP_TYPES.find(x => x.id === entry.typeId);
    return t ? makeEmptyStep(t.label, t.id) : makeEmptyStep((entry.name || ''));
  }
  return makeEmptyStep((entry && entry.name) || '');
}
function makeViewpointFromPreset(preset) {
  if (!preset) return { viewpointName: '', viewpointNameExternal: '', viewpointCategory: '', assignee: '', manualStart: '', manualEnd: '', deadline: '', deliveryName: '', steps: [makeEmptyStep()] };
  return {
    viewpointName: preset.name,
    viewpointNameExternal: '', // 社外視点名（お客様向け・納品名のベース）
    viewpointCategory: '',     // 内観/外観（制作種類）
    assignee: '',
    manualStart: '', // 視点ごとの開始時間指定（最初の未完了ステップに適用）
    manualEnd: '',   // 視点ごとの終了時間指定（最後の未完了ステップに適用・作業終了予定）
    deadline: '',    // 視点ごとの納期（お客様への提出日）
    deliveryName: '', // 納品名（納品用の視点名）の手動上書き。空なら自動（案件名_視点名）
    // ステップごとに金額・依頼日・完了日・種類・外注を持つ（ステップ＝納品単位。売上へ1ステップ1行で連携）
    // 種類は既定で空（''＝納品に数えない）。納品種類（初回/追加）はカードの請求パネルで明示的に設定する。
    steps: preset.steps.map(makeStepFromPreset),
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

export {
  PRIORITY_COLORS, priorityColor, PROJECT_PALETTE, assignProjectColors, getProjectColor, pastelize,
  fmtMD, fmtYMD, fmtYMDJP, dayName, isWeekend, syncHolidays, isWorkingSaturday, isNonWorkingDay,
  addDays, startOfDay, isSameDay, timeToMin, minToTime, fmtHM, kanaNormalize, parseHM,
  dtLocalToDate, dateToDtLocal, VIEWPOINT_PRESETS, makeEmptyStep, makeStepFromPreset, makeViewpointFromPreset,
  COMPANY_PRESETS, genId, normalizeCustomerMaster, VN_LUNAR_HOLIDAYS, vietnamHolidayCandidates, expandHolidayDates,
  DEFAULT_SETTINGS, getDailySlots, getDaySlots, getDayWorkingHours, getHoursPerDay, parseYMD, sheetsLabel,
};
