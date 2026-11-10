// 会社ごとの担当者（ラボ契約・オフショア・サポート）。実行: node test/companyAssignee.test.mjs
import assert from 'node:assert/strict';
import { assignTypeOf, assigneesForCompany, fixedAssigneeFor } from '../src/lib/companyAssignee.js';

const cm = [{ company: '田中建設', contractType: 'labo' }, { company: 'オフィスA', contractType: 'offshore' }];
const emp = [
  { name: 'Dung', assignType: 'lab', companies: ['田中建設'] },
  { name: 'Phuong', assignType: 'offshore', companies: ['オフィスA'] },
  { name: 'Linh', assignType: 'offshore', companies: ['株式会社オフィスA'] },
  { name: 'Hai', assignType: 'support' },
  { name: 'Old', companies: ['オフィスA'] },
  { name: 'New' },
];
assert.equal(assignTypeOf(emp[4], cm), 'offshore');
assert.equal(assignTypeOf(emp[5], cm), 'support');
assert.equal(assignTypeOf({ companies: ['田中建設'] }, cm), 'lab');
assert.deepEqual(assigneesForCompany(emp, '田中建設', cm), { fixed: ['Dung'], offshore: [], support: ['Hai', 'New'] });
assert.deepEqual(assigneesForCompany(emp, 'オフィスA', cm), { fixed: [], offshore: ['Phuong', 'Linh', 'Old'], support: ['Hai', 'New'] });
assert.equal(fixedAssigneeFor(emp, '田中建設', cm), 'Dung');
assert.equal(fixedAssigneeFor(emp, 'オフィスA', cm), '', 'オフショアは自動で入れない');
assert.equal(fixedAssigneeFor(emp, '', cm), '');
console.log('companyAssignee: ok');

// 割り振り直し
import { planCompanyReassign } from '../src/lib/companyAssignee.js';
{
  const cm2 = [{ company: 'オフィスコム' }, { company: 'リノベる株式会社' }, { company: 'オフィスA', contractType: 'offshore' }];
  const emp2 = [
    { name: 'Linh', assignType: 'lab', companies: ['オフィスコム'] },
    { name: 'Huyen', assignType: 'lab', companies: ['オフィスコム'] },
    { name: 'Cong', assignType: 'lab', companies: ['リノベる株式会社'] },
    { name: 'Vu', assignType: 'support' },
  ];
  const T = (id, company, projectName, assignee, hours, extra = {}) => ({ id, companyName: company, projectName, assignee, hours, status: 'pending', createdAt: Number(id.slice(1)), ...extra });
  const tasks = [
    T('t1', 'オフィスコム', 'P1', 'Vu', 4),
    T('t2', 'オフィスコム', 'P1', 'Vu', 2),
    T('t3', 'オフィスコム', 'P2', 'Huyen', 3),   // そのまま
    T('t4', 'オフィスコム', 'P2', 'Vu', 1),      // 案件 P2 は Huyen が持っている → Huyen
    T('t5', 'オフィスコム', 'P3', '未割当', 2),
    T('t6', 'リノベる', 'R1', 'Vu', 5),          // 株式会社の有無は同じ会社
    T('t7', 'オフィスA', 'O1', 'Vu', 5),         // オフショアは触らない
    T('t8', 'リノベる', 'R1', 'Vu', 5, { status: 'in_progress' }), // 作業中は動かさない
    T('t9', 'リノベる', 'R1', 'Vu', 1, { supportOf: 't6' }),        // 分担は動かさない
    T('t10', 'オフィスコム', 'P1', 'Vu', 3, { status: 'done' }),     // 完了は触らない
  ];
  const plan = planCompanyReassign(tasks, emp2, cm2);
  const m = Object.fromEntries(plan.map(x => [x.id, x.to]));
  // P1（6h）は Linh・Huyen とも0h → 上の Linh。P2 は Huyen。P3 は空いている Huyen（Linh 6h > Huyen 4h）
  assert.deepEqual(m, { t1: 'Linh', t2: 'Linh', t4: 'Huyen', t5: 'Huyen', t6: 'Cong' });
  assert.deepEqual(planCompanyReassign(tasks, [], cm2), []);
  console.log('planCompanyReassign: ok');
}
