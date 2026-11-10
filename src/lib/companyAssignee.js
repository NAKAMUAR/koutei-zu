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

export { ASSIGN_TYPES, companyKey, isOffshoreCompany, assignTypeOf, assigneesForCompany, fixedAssigneeFor };
