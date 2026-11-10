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
