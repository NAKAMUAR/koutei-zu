import assert from 'node:assert/strict';
import { taskPackOf, packCountFor, groupIntoPacks, tasksFromPacks, TASK_PACKS_DEFAULT } from '../src/lib/taskPacks.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('タスクid → まとめの名前（いつも同じ・p00〜p63 に散らばる）', () => {
  assert.equal(taskPackOf('task_abc'), taskPackOf('task_abc'));
  const used = new Set();
  for (let i = 0; i < 2000; i++) used.add(taskPackOf('task_' + i));
  assert.equal(used.size, TASK_PACKS_DEFAULT, 'すべてのまとめに散らばる');
});

test('まとめの数：既定 64・大きければ増やす', () => {
  assert.equal(packCountFor(1000), 64);
  assert.equal(packCountFor(30 * 1024 * 1024), 123);
});

test('まとめに分けて、戻すと同じタスクになる', () => {
  const tasks = Array.from({ length: 300 }, (_, i) => ({ id: 't' + i, hours: i }));
  const packs = groupIntoPacks(tasks, 64);
  assert.equal(Object.keys(packs).length, 64);
  const back = tasksFromPacks(Object.values(packs).map(t => ({ t })));
  assert.deepEqual(back.map(t => t.id).sort(), tasks.map(t => t.id).sort());
  assert.deepEqual(tasksFromPacks([{ t: { x1: { hours: 1 } } }, {}, null]), [{ hours: 1, id: 'x1' }]);
});

console.log(`taskPacks: ${n} tests passed`);
