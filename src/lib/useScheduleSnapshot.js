import { useEffect, useRef } from 'react';
import { storage } from '../firebase.js';
import { buildScheduleSnapshot, buildAssigneePlan, sameSnapshotContent } from './scheduleSnapshot.js';

const KEY = 'scheduleSnapshot';
const MIN_INTERVAL_MS = 10 * 60000; // 書くのは変わったときだけ・多くても10分に1回
const LOCAL_EDIT_MS = 2 * 60000;     // この画面で作業を直してから2分以内なら、この画面が先に書く

// この画面でタスクを保存した時刻（App.jsx の saveTasks が知らせる）
let lastLocalEdit = 0;
export function markLocalTaskEdit() { lastLocalEdit = Date.now(); }

/**
 * 計算した予定を data/scheduleSnapshot に書く（連携シートの『連携』に予定を出すため。2026-11-06）。
 * サーバーとそろってから（tasksLoaded）だけ。中身が変わっていなければ書かない。
 *
 * 2026-11-26：まとめは 100KB 前後あり、書くたびにその大きさぶんの書き込みユニット（1KiB で1）を使う。
 * これまでは開いている画面が全部、開いたときと作業が変わるたびに同じ中身を書いていた。そこで：
 *  - 書く前にサーバーの中身を読み、同じなら書かない（読み取りは 4KiB で1なので、書くより安い）
 *  - 作業を直した画面は5秒後、ほかの画面は1〜3分後（画面ごとにばらす）に確かめる＝たいてい直した画面だけが書く
 */
export function useScheduleSnapshot(scheduled, tasksLoaded) {
  const last = useRef({ json: null, pending: null, at: 0, timer: null });
  // 画面を閉じるときだけ待ちを止める（予定は1分ごとに計算し直すので、そのたびに止めると書けなくなる）
  useEffect(() => () => { const st = last.current; if (st.timer) clearTimeout(st.timer); st.timer = null; }, []);
  useEffect(() => {
    if (!tasksLoaded || !scheduled) return;
    // items：『連携』の開始・終了予定など、plan：担当者ごとの予定表（今日から2週間の作業枠）
    const json = JSON.stringify({ items: buildScheduleSnapshot(scheduled).items, plan: buildAssigneePlan(scheduled) });
    const st = last.current;
    if (json === st.json || (st.timer && json === st.pending)) return;
    const write = async () => {
      st.timer = null;
      st.pending = null;
      st.at = Date.now();
      try {
        const cur = await storage.get(KEY);
        st.json = json;
        if (cur && cur.value && sameSnapshotContent(cur.value, json)) return;
        await storage.set(KEY, JSON.stringify({ updatedAt: Date.now(), ...JSON.parse(json) }));
      } catch (e) { st.json = null; }
    };
    if (st.timer) clearTimeout(st.timer);
    const mine = Date.now() - lastLocalEdit < LOCAL_EDIT_MS;
    const settle = mine ? 5000 : 60000 + Math.floor(Math.random() * 120000);
    const wait = Math.max(0, st.at + MIN_INTERVAL_MS - Date.now());
    st.pending = json;
    st.timer = setTimeout(write, Math.max(wait, settle));
  }, [scheduled, tasksLoaded]);
}
