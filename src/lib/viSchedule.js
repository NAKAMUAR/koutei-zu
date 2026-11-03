// 担当者別スケジュール文（ベトナム語＋日本語の併記）— 純ロジック。
// サマリー画面でコピーして、エンジニアの LINE / Discord に貼る。
const VI_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const JP_DAYS = ['日', '月', '火', '水', '木', '金', '土'];
// ステップ名 → ベトナム語（先に長いものから当てる）
const VI_STEPS = [
  ['人物＋添景合成', 'Ghép người & cảnh'], ['モデル作成', 'Dựng model'], ['写真合成', 'Ghép ảnh'], ['動画制作', 'Video'], ['VR制作', 'VR'],
  ['ホワイト', 'Trắng'], ['カラー', 'Màu'], ['修正', 'Sửa'], ['変更', 'Thay đổi'],
];
export function viStepName(jp) {
  const s = String(jp || '');
  const hit = VI_STEPS.find(([k]) => s.includes(k));
  let vi = hit ? hit[1] : '';
  if (vi && /修正|変更/.test(s) && !/^(修正|変更)/.test(hit[0])) vi += /修正/.test(s) ? ' (sửa)' : ' (thay đổi)';
  if (vi && s.includes('サポート')) vi += ' – hỗ trợ';
  return vi ? `${vi} / ${s}` : s;
}
const pad = (n) => String(n).padStart(2, '0');
const hm = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const r1 = (v) => Math.round(v * 10) / 10;

// activeScheduled（スケジュール計算済みの未完了タスク）→ 担当者の days 日分の予定文
export function buildAssigneeSchedule(activeScheduled, assignee, fromDate, days) {
  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const end = new Date(start.getTime() + days * 86400000);
  const byDay = new Map();
  for (const t of (activeScheduled || [])) {
    if ((t.assignee || '') !== assignee) continue;
    for (const s of (t.slots || [])) {
      const d = s.date instanceof Date ? s.date : new Date(s.date);
      if (d < start || d >= end) continue;
      const k = dayKey(d);
      if (!byDay.has(k)) byDay.set(k, { date: d, lines: [] });
      byDay.get(k).lines.push({ startMin: s.startMin, endMin: s.endMin, t });
    }
  }
  if (byDay.size === 0) return '';
  const lastDay = new Date(end.getTime() - 86400000);
  const md = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  const out = [`📅 Lịch làm việc / 作業予定 – ${assignee}`, days > 1 ? `(${md(start)} – ${md(lastDay)})` : `(${md(start)})`];
  let total = 0;
  for (const k of [...byDay.keys()].sort()) {
    const { date, lines } = byDay.get(k);
    out.push('', `【${md(date)} (${VI_DAYS[date.getDay()]}) / ${date.getMonth() + 1}/${date.getDate()}(${JP_DAYS[date.getDay()]})】`);
    lines.sort((a, b) => a.startMin - b.startMin);
    for (const { startMin, endMin, t } of lines) {
      const h = (endMin - startMin) / 60;
      total += h;
      const pj = (t.projectNameInternal || '').trim() || t.projectName || '';
      const name = t.projectNameInternal && t.projectName ? `${pj} ${t.projectName}` : pj;
      const dl = String(t.deadline || t.projectDeadline || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
      const dlText = dl ? ` ⏰ hạn/納期 ${dl[3]}/${dl[2]}` : '';
      out.push(`${hm(startMin)}–${hm(endMin)}  ${name} ／ ${t.viewpointName || ''} ／ ${viStepName(t.stepName)}  ${r1(h)}h${dlText}`);
    }
  }
  out.push('', `Tổng / 合計: ${r1(total)}h`);
  return out.join('\n');
}
