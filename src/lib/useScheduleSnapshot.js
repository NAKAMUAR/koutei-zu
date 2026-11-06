import { useEffect, useRef } from 'react';
import { storage } from '../firebase.js';
import { buildScheduleSnapshot } from './scheduleSnapshot.js';

const KEY = 'scheduleSnapshot';
const MIN_INTERVAL_MS = 10 * 60000; // 書くのは変わったときだけ・多くても10分に1回

/**
 * 計算した予定を data/scheduleSnapshot に書く（連携シートの『連携』に予定を出すため。2026-11-06）。
 * サーバーとそろってから（tasksLoaded）だけ。中身が変わっていなければ書かない。
 */
export function useScheduleSnapshot(scheduled, tasksLoaded) {
  const last = useRef({ json: null, at: 0, timer: null });
  useEffect(() => {
    if (!tasksLoaded || !scheduled) return undefined;
    const json = JSON.stringify(buildScheduleSnapshot(scheduled).items);
    const st = last.current;
    if (json === st.json) return undefined;
    const write = () => {
      st.timer = null;
      st.json = json;
      st.at = Date.now();
      storage.set(KEY, JSON.stringify({ updatedAt: Date.now(), items: JSON.parse(json) })).catch(() => { st.json = null; });
    };
    if (st.timer) clearTimeout(st.timer);
    const wait = Math.max(0, st.at + MIN_INTERVAL_MS - Date.now());
    st.timer = setTimeout(write, Math.max(wait, 5000));
    return () => { if (st.timer) { clearTimeout(st.timer); st.timer = null; } };
  }, [scheduled, tasksLoaded]);
}
