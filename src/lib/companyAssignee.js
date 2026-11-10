// 会社ごとの担当者（従業員マスタの assignType・companies）。
// 担当の形は3つ：
//   lab      … ラボ契約の会社の担当（人員固定）。選んだ会社の案件の担当者に自動で入る
//   offshore … オフショアの会社の担当（個別依頼）。自動では入れず、担当者の候補・「提案」で先に出す
//   support  … サポート（全会社対応）。会社は選ばず、どの会社でも候補に出す
// 連携スクリプト（sync/Code.gs の companyAssigneeOf_）も同じ決め方をする（自動で入るのはラボ契約だけ）。

const ASSIGN_TYPES = [
  { id: 'lab', label: 'ラボ契約', note: '人員固定。選んだ会社の案件に自動で入る' },
  { id: 'offshore', label: 'オフショア', note: '個別依頼。選んだ会社の案件で候補の先頭に出る（自動では入らない）' },
  { id: 'support', label: 'サポート', note: '全会社対応。どの会社でも候補に出る' },
];

// 会社名の比べ方：前後の空白・「株式会社」「(株)」・空白の違いは同じ会社とみなす
function companyKey(name) {
  return String(name || '').trim()
    .replace(/株式会社|有限会社|合同会社|（株）|\(株\)|㈱/g, '')
    .replace(/[\s　]/g, '')
    .toLowerCase();
}

// お客様マスタの契約形態（未設定はラボ）
function isOffshoreCompany(customerMaster, company) {
  const k = companyKey(company);
  return !!k && (customerMaster || []).some(c => c && c.contractType === 'offshore' && companyKey(c.company) === k);
}

// 従業員の担当の形。未設定なら：会社を選んでいればその会社の契約形態（すべてオフショアならオフショア、ほかはラボ契約）、
// 会社が無ければサポート
function assignTypeOf(e, customerMaster) {
  if (e && ASSIGN_TYPES.some(t => t.id === e.assignType)) return e.assignType;
  const cs = (e && e.companies) || [];
  if (!cs.length) return 'support';
  return cs.every(c => isOffshoreCompany(customerMaster, c)) ? 'offshore' : 'lab';
}

// 会社ごとの担当者（従業員マスタの並び順＝先頭が主担当）
//   fixed     … ラボ契約でその会社を選んでいる人（自動で入る）
//   offshore  … オフショアでその会社を選んでいる人
//   support   … サポートの人
function assigneesForCompany(employeeMaster, company, customerMaster) {
  const out = { fixed: [], offshore: [], support: [] };
  const k = companyKey(company);
  for (const e of (employeeMaster || [])) {
    const name = ((e && e.name) || '').trim();
    if (!name) continue;
    const type = assignTypeOf(e, customerMaster);
    if (type === 'support') { out.support.push(name); continue; }
    if (k && (e.companies || []).some(c => companyKey(c) === k)) out[type === 'lab' ? 'fixed' : 'offshore'].push(name);
  }
  return out;
}

// 会社を選んだときに自動で入れる担当者（ラボ契約の主担当。いなければ ''）
function fixedAssigneeFor(employeeMaster, company, customerMaster) {
  return assigneesForCompany(employeeMaster, company, customerMaster).fixed[0] || '';
}

// 今の担当分けで、未完了の作業の担当者を割り振り直す計画を作る（従業員マスタの「割り振り直す」ボタン）。
// ・対象はラボ契約の担当がいる会社の未完了の作業だけ（オフショアの会社・担当未設定の会社は触らない）
// ・すでにその会社のラボ契約の担当になっている作業はそのまま
// ・作業中（in_progress / doing）の作業と、サポートで分担した作業（supportOf）は動かさない
// ・同じ案件の作業は同じ人へ。案件に担当の人がすでにいればその人、いなければ残り時間の少ない人へ
// 戻り値 [{ id, from, to, company, projectName, hours }]
function planCompanyReassign(tasks, employeeMaster, customerMaster) {
  const remain = (t) => Math.max(0, (Number(t.hours) || 0) - (Number(t.completedHours) || 0));
  const open = (tasks || []).filter(t => t && t.status !== 'done');
  const load = new Map();
  for (const t of open) {
    const a = (t.assignee || '').trim();
    load.set(a, (load.get(a) || 0) + remain(t));
  }
  const fixedCache = new Map();
  const fixedOf = (company) => {
    const k = companyKey(company);
    if (!fixedCache.has(k)) fixedCache.set(k, assigneesForCompany(employeeMaster, company, customerMaster).fixed);
    return fixedCache.get(k);
  };
  const movable = (t) => !t.supportOf && t.status !== 'in_progress' && t.status !== 'doing';
  // 案件ごとにまとめる（会社＋社外案件名）。古い案件から順に決める
  const projects = new Map();
  for (const t of open) {
    const fixed = fixedOf(t.companyName);
    if (!fixed.length) continue;
    const pk = companyKey(t.companyName) + '::' + (t.projectName || '');
    if (!projects.has(pk)) projects.set(pk, { fixed, tasks: [], first: Infinity });
    const p = projects.get(pk);
    p.tasks.push(t);
    p.first = Math.min(p.first, Number(t.createdAt) || 0);
  }
  const out = [];
  for (const p of [...projects.values()].sort((a, b) => a.first - b.first)) {
    const moving = p.tasks.filter(t => movable(t) && !p.fixed.includes((t.assignee || '').trim()));
    if (!moving.length) continue;
    // 案件の中で担当の人がすでに持っている時間
    const own = new Map();
    for (const t of p.tasks) {
      const a = (t.assignee || '').trim();
      if (p.fixed.includes(a)) own.set(a, (own.get(a) || 0) + remain(t) + 1e-6);
    }
    const to = own.size
      ? [...own.entries()].sort((x, y) => y[1] - x[1] || p.fixed.indexOf(x[0]) - p.fixed.indexOf(y[0]))[0][0]
      : [...p.fixed].sort((x, y) => (load.get(x) || 0) - (load.get(y) || 0) || p.fixed.indexOf(x) - p.fixed.indexOf(y))[0];
    for (const t of moving) {
      const from = (t.assignee || '').trim();
      const h = remain(t);
      load.set(from, (load.get(from) || 0) - h);
      load.set(to, (load.get(to) || 0) + h);
      out.push({ id: t.id, from, to, company: t.companyName || '', projectName: t.projectName || '', hours: h });
    }
  }
  return out;
}

export { planCompanyReassign, ASSIGN_TYPES, companyKey, isOffshoreCompany, assignTypeOf, assigneesForCompany, fixedAssigneeFor };
