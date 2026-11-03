// サポート（分担）の純ロジック：1つのステップの残り時間の一部を別の担当者へ渡す。
// 元のステップ：制作時間を渡した分だけ減らし、hoursLocked を付ける（シートから送り直しても時間を戻さない）。
// 新しいステップ：同じ案件・視点・種類で担当者だけ別。「（サポート）」を付け、売上・納品には数えない。
export function splitForSupport(task, helper, hours, newId, nowMs) {
  const h = Math.round((Number(hours) || 0) * 100) / 100;
  const total = Number(task && task.hours) || 0;
  const done = Number(task && task.completedHours) || 0;
  const name = String(helper || '').trim();
  if (!task || !name || !(h > 0) || h >= total - done) return null;
  const original = { ...task, hours: Math.round((total - h) * 100) / 100, hoursLocked: true };
  const support = {
    ...task,
    id: newId,
    assignee: name,
    hours: h,
    completedHours: 0,
    status: 'pending',
    stepName: `${task.stepName || '作業'}（サポート）`,
    stepOrder: (typeof task.stepOrder === 'number' ? task.stepOrder : 0) + 0.5,
    supportOf: task.id,
    externalId: null,
    hoursLocked: null,
    manualStart: null, manualEnd: null,
    completedAt: null, actualEnd: null,
    reviewState: null, reviewAt: null, reviewUpdatedAt: null, reviewNote: '',
    stepRoundType: '', stepAmount: '', stepOutVND: '', stepDeliveryNameOverride: '',
    createdAt: nowMs,
  };
  return { original, support };
}
