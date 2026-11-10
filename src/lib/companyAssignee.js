// 会社ごとの担当者（従業員マスタの companies）。
// 従業員マスタで「担当会社」を選んでおくと、その会社の案件の担当者に自動で入る。
// 連携スクリプト（sync/Code.gs の companyAssigneeOf_）も同じ決め方をする。

// 会社名の比べ方：前後の空白・「株式会社」「(株)」・空白の違いは同じ会社とみなす
function companyKey(name) {
  return String(name || '').trim()
    .replace(/株式会社|有限会社|合同会社|（株）|\(株\)|㈱/g, '')
    .replace(/[\s　]/g, '')
    .toLowerCase();
}

// その会社を担当にしている従業員の名前（従業員マスタの並び順＝先頭が主担当）
function assigneesForCompany(employeeMaster, company) {
  const k = companyKey(company);
  if (!k) return [];
  return (employeeMaster || [])
    .filter(e => e && (e.name || '').trim() && (e.companies || []).some(c => companyKey(c) === k))
    .map(e => e.name.trim());
}

export { companyKey, assigneesForCompany };
