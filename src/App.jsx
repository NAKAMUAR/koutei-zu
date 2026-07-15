// アプリ本体：状態管理・Firestore購読・タスク操作ハンドラ・画面切替。
// 各ビュー・部品・ロジックは src/lib, src/components, src/views に分割済み。
// ============ メイン ============
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AppCtx } from './appContext.js';
import { COMPANY_PRESETS, DEFAULT_SETTINGS, VIEWPOINT_PRESETS, assignProjectColors, dateToDtLocal, expandHolidayDates, fmtHM, fmtYMD, genId, getHoursPerDay, kanaNormalize, makeEmptyStep, makeViewpointFromPreset, normalizeCustomerMaster, parseHM, startOfDay, syncHolidays } from './lib/utils.js';
import { DEFAULT_STEP_TYPES, deliveryBaseName, findStepType, normalizeHistory, normalizeStepTypes, num as vpNum, resolveViewpointSteps, roundTypeOf, stepDeliveryName } from './viewpoint/viewpointUtils.js';
import { billingStore, memberList, salesStore, signIn, signOutUser, storage, subscribeAuth, tasksStore } from './firebase.js';
import { computeDeadlineReorder, computeProjectOrder, deadlineInsertPriority, deadlineKey, isOnLeaveAt, latestActualEnd, migrateTask, normalizePriorities, projectEndTs, scheduleTasks, simulateFormSchedule, workingHoursBetweenTs } from './lib/schedule.js';
import { collectSalesSyncRows, reconcileLedger } from './viewpoint/salesSync.js';
import { blankDoc, blankItem } from './billing/billingUtils.js';
import { CheckCircle2, ClipboardList, FileText, Folder, MessageSquare, Plus, RotateCcw, Settings as SettingsIcon, StickyNote, Table, TrendingUp } from 'lucide-react';
import { CompleteDialog, ConfirmModal, DeadlineConfirmModal, NavButton, NavGroup, PromptModal, TimeSelect, ToastStack } from './components/common.jsx';
import { MemberSettings } from './components/MemberSettings.jsx';
import { InputView } from './views/InputView.jsx';
import { EndPromptModal } from './components/modals.jsx';
// 毎日使う「案件」タブ以外のビューは、開いたときに読み込む（初回ロードを軽くする）
const MessageView = lazy(() => import('./views/MessageView.jsx').then(m => ({ default: m.MessageView })));
const DoneView = lazy(() => import('./views/DoneView.jsx').then(m => ({ default: m.DoneView })));
const MasterView = lazy(() => import('./views/MasterView.jsx').then(m => ({ default: m.MasterView })));
const MemoView = lazy(() => import('./views/MemoView.jsx').then(m => ({ default: m.MemoView })));
const BillingView = lazy(() => import('./billing/BillingView.jsx'));
const SalesView = lazy(() => import('./sales/SalesView.jsx'));
const ProjectSheetView = lazy(() => import('./project/ProjectSheetView.jsx'));
const CompanySummaryView = lazy(() => import('./sales/CompanySummaryView.jsx'));
export default function App() {
  const [tasks, setTasks] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  // tasks と settings の両方が Firestore から最初の値を受け取ったか
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  // データベース手動更新（再取得）の状態
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [view, setView] = useState('input');
  const [editingId, setEditingId] = useState(null);
  // 編集モード：{ type: 'step'|'viewpoint'|'project', ... }（フォーム上部の見出し・保存スコープを切替）
  const [editMode, setEditMode] = useState(null);
  // 進行中一覧から編集を開いたとき、編集終了後に元の案件の位置へ戻すための案件名
  const editReturnProject = useRef(null);
  // 編集が終わって（保存／キャンセル）editMode が null に戻ったら、元の案件ヘッダーへスクロールして戻す
  useEffect(() => {
    if (editMode !== null) return;
    const name = editReturnProject.current;
    if (!name || typeof document === 'undefined') return;
    editReturnProject.current = null;
    // 一覧の再描画・レイアウト確定後にスクロールする
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = document.querySelector(`[data-project-name="${(window.CSS && CSS.escape) ? CSS.escape(name) : name}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
  }, [editMode]);
  // 案件の並び順（ドラッグ＆ドロップ用）。Firestore に projectOrder として保存
  const [projectOrder, setProjectOrder] = useState([]);
  // お客様マスタ（[{ id, company, contact }]）・従業員マスタ（[{ id, name, role }]）
  const [customerMaster, setCustomerMaster] = useState([]);
  const [employeeMaster, setEmployeeMaster] = useState([]);
  // ステップ種類マスタ（新規案件のステップ・プルダウンの選択肢）。「マスタ」タブで編集可能。
  const [stepTypeMaster, setStepTypeMaster] = useState(() => DEFAULT_STEP_TYPES.map(t => ({ ...t })));
  // 売上登録表（自動同期用）。null=未ロード, {}=空。視点の制作履歴から売上行を生成する。
  const [salesLedgerSync, setSalesLedgerSync] = useState(null);
  // メンバー許可リスト（オーナー以外にアクセスを許可する Gmail。設定画面から編集）
  const [memberEmails, setMemberEmails] = useState([]);
  // タスクメモ（[{ id, title, date, startTime, endTime, allDay, note, color, createdAt, updatedAt }]）
  const [memos, setMemos] = useState([]);
  // 完了ダイアログ（終了時間を入力して完了する）の対象
  const [completeTarget, setCompleteTarget] = useState(null);
  // 開始時間が移動する場合の確認モーダル
  const [startMoveConfirm, setStartMoveConfirm] = useState(null);
  // 現在時刻ティッカー（1分ごと更新）。経過進捗・現在時刻ライン・終了超過検知に使う
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);


  // タスクメモの通知：開始時刻（終日は朝の始業時刻）が来たらOS通知＋アプリ内バナーを出す。
  // アプリを開いている間のみ。プッシュ基盤が無いため、タブを閉じている間は通知できない。
  const [memoToasts, setMemoToasts] = useState([]); // [{ id, title, body }]
  const notifiedMemoRef = useRef(new Set());        // 通知済みキー（重複防止）
  const lastNotifyTickRef = useRef(null);           // 前回チェック時刻（初回は過去分を鳴らさない）
  useEffect(() => {
    const nowTs = now.getTime();
    const prev = lastNotifyTickRef.current;
    lastNotifyTickRef.current = nowTs;
    if (prev == null) return; // 初回ティックでは過去メモを鳴らさない
    const canNotify = typeof Notification !== 'undefined' && Notification.permission === 'granted';
    for (const m of (memos || [])) {
      if (!m || !m.date) continue;
      const hhmm = m.allDay ? (settings.morningStart || '08:00') : (m.startTime || '');
      if (!hhmm) continue;
      const ts = new Date(`${m.date}T${hhmm}:00`).getTime();
      if (isNaN(ts) || !(ts > prev && ts <= nowTs)) continue;
      const key = `${m.id}@${m.date}T${hhmm}`;
      if (notifiedMemoRef.current.has(key)) continue;
      notifiedMemoRef.current.add(key);
      const title = (m.title || '').trim() || 'タスクメモ';
      const body = `${m.allDay ? '終日' : hhmm}${m.note ? ' ・ ' + m.note : ''}`;
      if (canNotify) { try { new Notification(title, { body, tag: key }); } catch (e) {} }
      const toastId = key + ':' + Date.now();
      setMemoToasts(prev2 => [...prev2, { id: toastId, title, body }]);
      setTimeout(() => setMemoToasts(prev2 => prev2.filter(t => t.id !== toastId)), 12000);
    }
  }, [now, memos, settings.morningStart]);
  // ============ ダイアログ・トースト（ネイティブ alert/confirm/prompt の代替） ============
  // confirmDialog('メッセージ') → Promise<boolean>。promptDialog({...}) → Promise<string|null>。
  // notify('メッセージ', { type, undo }) → 右下トースト（undo を渡すと「元に戻す」ボタン付き）。
  const [confirmState, setConfirmState] = useState(null); // { message, title?, confirmLabel?, cancelLabel?, resolve }
  const confirmDialog = (opts) => new Promise((resolve) => {
    const o = typeof opts === 'string' ? { message: opts } : (opts || {});
    setConfirmState({ ...o, resolve });
  });
  const closeConfirm = (result) => setConfirmState(s => { if (s) s.resolve(result); return null; });
  const [promptState, setPromptState] = useState(null); // { message, title?, defaultValue?, resolve }
  const promptDialog = (opts) => new Promise((resolve) => {
    const o = typeof opts === 'string' ? { message: opts } : (opts || {});
    setPromptState({ ...o, resolve });
  });
  const closePrompt = (result) => setPromptState(s => { if (s) s.resolve(result); return null; });
  const [toasts, setToasts] = useState([]); // { id, message, type, undo }
  const toastTimersRef = useRef(new Map());
  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const tm = toastTimersRef.current.get(id);
    if (tm) { clearTimeout(tm); toastTimersRef.current.delete(id); }
  };
  const notify = (message, opts = {}) => {
    const id = genId('toast');
    setToasts(prev => [...prev, { id, message, type: opts.type || 'info', undo: opts.undo || null }]);
    const ttl = opts.duration || (opts.undo ? 8000 : opts.type === 'error' ? 6000 : 3500);
    toastTimersRef.current.set(id, setTimeout(() => dismissToast(id), ttl));
  };
  const undoToast = async (t) => {
    dismissToast(t.id);
    try { await t.undo(); notify('元に戻しました', { type: 'success' }); }
    catch (e) { notify('元に戻せませんでした: ' + (e?.message || e), { type: 'error' }); }
  };

  const [showSettings, setShowSettings] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [auth, setAuth] = useState({ user: null, allowed: false, ready: false });
  const [signInError, setSignInError] = useState('');

  useEffect(() => subscribeAuth(setAuth), []);

  // 初期表示は「パース」プリセット
  const makeEmptyViewpoint = () => makeViewpointFromPreset(VIEWPOINT_PRESETS[0]);
  const emptyForm = {
    projectName: '', projectNameInternal: '', companyName: '', customerContact: '', assignee: '', priority: '', memo: '', tentative: false, tentativeStart: '', tentativeEnd: '',
    // 案件全体の依頼日（案件共通）。ステップに個別の依頼日が無いとき売上の発注/着手日に使う
    projectRequestDate: '',
    // 案件全体の納期（全体設定）。各視点の納期（個別設定）が未設定のとき適用する
    projectDeadline: '',
    // 視点（担当タスク）の動的リスト。各視点の中にステップ（工程）を持つ。
    // 開始時間・終了時間は視点ごとに設定。納期は「全体（案件）＋個別（視点）」で、個別が優先される
    viewpoints: [makeEmptyViewpoint()],
  };
  const [form, setForm] = useState(emptyForm);

  // 常に最新の tasks を参照するための ref（複数端末の同時編集で書き込み元になる）
  const tasksRef = useRef([]);

  useEffect(() => {
    if (!auth.allowed) return;
    let cancelled = false;
    let unsubTasks = null;

    // 購読を先に開始（マイグレーションの完了を待たない＝ローディングで止まらない）
    unsubTasks = tasksStore.subscribe(
      (arr) => {
        const migrated = arr.map(migrateTask);
        const normalized = normalizePriorities(migrated);
        setTasks(normalized);
        tasksRef.current = normalized;
        setTasksLoaded(true);
      },
      () => { setTasksLoaded(true); }
    );

    // セーフティ：何らかの理由で onSnapshot が発火しない場合の保険
    const loadTimeout = setTimeout(() => setTasksLoaded(true), 15000);

    // レガシー：旧 1ドキュメント保存（workspaces/{wid}/data/tasks）から
    //          新サブコレクション（workspaces/{wid}/tasks/{taskId}）へ並行で移行
    (async () => {
      try {
        const legacy = await storage.get('tasks');
        if (cancelled) return;
        if (legacy && legacy.value) {
          let arr = [];
          try { arr = JSON.parse(legacy.value); } catch (e) {}
          if (Array.isArray(arr) && arr.length > 0) {
            const existing = await tasksStore.listAll();
            if (cancelled) return;
            if (existing.length === 0) {
              await tasksStore.batch(arr.map(migrateTask), []);
            }
            if (cancelled) return;
            await storage.delete('tasks');
          }
        }
      } catch (e) { console.error('タスク移行エラー:', e); }
    })();

    // 休日(holidays)・休み(absences) を旧 settings から独立キーへ一度だけ移行する。
    // （settings は1ドキュメント集中型で全体上書きのため、他設定の保存で巻き込まれて消える事故を防ぐ）
    (async () => {
      try {
        const [hRaw, aRaw, sRaw] = await Promise.all([
          storage.get('holidays'), storage.get('absences'), storage.get('settings'),
        ]);
        let legacy = {};
        if (sRaw && sRaw.value) { try { legacy = JSON.parse(sRaw.value); } catch (e) {} }
        if (!hRaw && Array.isArray(legacy.holidays) && legacy.holidays.length) {
          await storage.set('holidays', JSON.stringify(legacy.holidays));
        }
        if (!aRaw && Array.isArray(legacy.absences) && legacy.absences.length) {
          await storage.set('absences', JSON.stringify(legacy.absences));
        }
      } catch (e) { console.warn('休日・休みの移行に失敗:', e); }
    })();

    const unsubSettings = storage.subscribe('settings', (val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          // holidays/absences は専用キー（別購読）が真実の値。settings 側の旧データでは上書きしない。
          setSettings(prev => ({ ...DEFAULT_SETTINGS, ...parsed, holidays: prev.holidays || [], absences: prev.absences || [] }));
        } catch (e) { }
      }
      setSettingsLoaded(true);
    });

    // 休日（祝日）・休み（欠勤・不在）は settings から分離した専用キーを購読
    const unsubHolidays = storage.subscribe('holidays', (val) => {
      let arr = [];
      if (val) { try { const p = JSON.parse(val); if (Array.isArray(p)) arr = p; } catch (e) {} }
      syncHolidays({ holidays: arr });
      setSettings(prev => ({ ...prev, holidays: arr }));
    });
    const unsubAbsences = storage.subscribe('absences', (val) => {
      let arr = [];
      if (val) { try { const p = JSON.parse(val); if (Array.isArray(p)) arr = p; } catch (e) {} }
      setSettings(prev => ({ ...prev, absences: arr }));
    });

    // 案件並び順（ドラッグ＆ドロップで並び替えた順序）を購読
    const unsubOrder = storage.subscribe('projectOrder', (val) => {
      if (!val) { setProjectOrder([]); return; }
      try {
        const arr = JSON.parse(val);
        if (Array.isArray(arr)) setProjectOrder(arr);
      } catch (e) { setProjectOrder([]); }
    });

    // お客様マスタ・従業員マスタを購読
    const unsubCustomer = storage.subscribe('customerMaster', (val) => {
      if (!val) { setCustomerMaster([]); return; }
      try { const arr = JSON.parse(val); setCustomerMaster(normalizeCustomerMaster(arr)); }
      catch (e) { setCustomerMaster([]); }
    });
    const unsubEmployee = storage.subscribe('employeeMaster', (val) => {
      if (!val) { setEmployeeMaster([]); return; }
      try { const arr = JSON.parse(val); if (Array.isArray(arr)) setEmployeeMaster(arr); }
      catch (e) { setEmployeeMaster([]); }
    });
    // ステップ種類マスタを購読（未保存なら既定の6種類を使う）
    const unsubStepTypes = storage.subscribe('stepTypeMaster', (val) => {
      if (!val) { setStepTypeMaster(DEFAULT_STEP_TYPES.map(t => ({ ...t }))); return; }
      try { const arr = JSON.parse(val); setStepTypeMaster(normalizeStepTypes(arr)); }
      catch (e) { setStepTypeMaster(DEFAULT_STEP_TYPES.map(t => ({ ...t }))); }
    });

    // タスクメモを購読
    const unsubMemos = storage.subscribe('memos', (val) => {
      if (!val) { setMemos([]); return; }
      try { const arr = JSON.parse(val); if (Array.isArray(arr)) setMemos(arr); }
      catch (e) { setMemos([]); }
    });

    // 売上登録表を購読（視点の制作履歴 → 売上行の自動同期に使う）。1か月=1ドキュメント。
    const unsubSalesLedger = salesStore.subscribe((map) => {
      setSalesLedgerSync(map || {});
    });

    // メンバー許可リスト（設定画面のメンバー管理用）
    const unsubMembers = memberList.subscribe(setMemberEmails);

    // レガシー：帳票（billingDocuments）・売上（salesLedger）の1ドキュメント集中保存から
    //          1件1ドキュメント（bill_*/sales_*）へ一度だけ移行する。
    //          旧データは *_backup キーに退避してから元キーを削除（再移行ループを防ぐ）。
    (async () => {
      try {
        const legacyBilling = await storage.get('billingDocuments');
        if (cancelled) return;
        if (legacyBilling && legacyBilling.value) {
          let arr = [];
          try { arr = JSON.parse(legacyBilling.value); } catch (e) {}
          if (Array.isArray(arr) && arr.length > 0) {
            const existing = await billingStore.listAll();
            if (cancelled) return;
            if (Object.keys(existing).length === 0) {
              await billingStore.setMany(arr.filter(d => d && d.id).map(d => [d.id, d]));
            }
            if (cancelled) return;
            await storage.set('billingDocuments_backup', legacyBilling.value);
          }
          await storage.delete('billingDocuments');
        }
      } catch (e) { console.error('帳票データ移行エラー:', e); }
    })();
    (async () => {
      try {
        const legacySales = await storage.get('salesLedger');
        if (cancelled) return;
        if (legacySales && legacySales.value) {
          let obj = null;
          try { obj = JSON.parse(legacySales.value); } catch (e) {}
          if (obj && typeof obj === 'object' && Object.keys(obj).length > 0) {
            const existing = await salesStore.listAll();
            if (cancelled) return;
            if (Object.keys(existing).length === 0) {
              await salesStore.setMany(Object.entries(obj).filter(([ym]) => /^\d{4}-\d{2}$/.test(ym)));
            }
            if (cancelled) return;
            await storage.set('salesLedger_backup', legacySales.value);
          }
          await storage.delete('salesLedger');
        }
      } catch (e) { console.error('売上データ移行エラー:', e); }
    })();

    return () => {
      cancelled = true;
      clearTimeout(loadTimeout);
      if (unsubTasks) unsubTasks();
      unsubSettings();
      unsubHolidays();
      unsubAbsences();
      unsubOrder();
      unsubCustomer();
      unsubEmployee();
      unsubStepTypes();
      unsubMemos();
      unsubSalesLedger();
      unsubMembers();
    };
  }, [auth.allowed]);

  // tasks と settings の両方が最初の同期完了 → 読み込み終了
  useEffect(() => {
    if (tasksLoaded && settingsLoaded) setLoading(false);
  }, [tasksLoaded, settingsLoaded]);

  // 視点の制作履歴 → 売上登録表の自動同期。
  // 金額（制作金額 or 外注金額）の入ったラウンドを売上行へ反映する。生成行は src で識別し、
  // 手動行は触らない。差分があるときだけ書き込む（idempotent なのでループしない）。
  useEffect(() => {
    if (!auth.allowed || !tasksLoaded || salesLedgerSync == null) return;
    const handle = setTimeout(() => {
      try {
        const syncRows = collectSalesSyncRows(tasksRef.current, customerMaster);
        const fallbackMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const { ledger, changed, changedMonths } = reconcileLedger(salesLedgerSync, syncRows, fallbackMonth);
        if (changed) {
          setSalesLedgerSync(ledger);
          // 変更のあった月のドキュメントだけ書き込む（他の月を巻き込まない）
          for (const ymKey of changedMonths) {
            salesStore.set(ymKey, ledger[ymKey]).catch(e => console.error('売上自動同期エラー:', e));
          }
        }
      } catch (e) { console.error('売上自動同期に失敗:', e); }
    }, 800);
    return () => clearTimeout(handle);
    // tasks の中身が変わるたびに再評価（参照は tasksRef を使うので tasks を依存に入れる）
  }, [tasks, customerMaster, salesLedgerSync, auth.allowed, tasksLoaded]);

  // 制作履歴(prodHistory) → ステップ（請求の元データ）への一度きりの自動移行。
  // 請求情報をステップに一本化したため、過去に制作履歴へ入れたラウンドを請求専用ステップへ写し取る。
  //  - 非破壊：prodHistory は削除しない（既存データは残す）。
  //  - 冪等：作成ステップに migratedFromRound=round.id を付け、同じ視点で既に移行済みのラウンドは飛ばす。
  //          → 何度ロードしても重複を作らない。移行対象が無ければ書き込みもしない（ループしない）。
  //  - 作成ステップは hours=0/completedHours=0・status='done'（スケジュールに出さない・請求専用）。
  const migrationDone = useRef(false);
  useEffect(() => {
    if (!auth.allowed || !tasksLoaded) return;
    if (migrationDone.current) return;
    const handle = setTimeout(() => {
      try {
        const all = tasksRef.current || [];
        // 視点キー → その視点のタスク群
        const byVp = new Map();
        for (const t of all) {
          const key = `${t.assignee}::${t.projectName}::${t.viewpointName}`;
          if (!byVp.has(key)) byVp.set(key, []);
          byVp.get(key).push(t);
        }
        const baseTime = Date.now();
        let seq = 0;
        const newSteps = [];
        // 既に移行済みのラウンドIDは「全タスク横断」で集める。
        // 移行ステップは assignee='' で作るため視点グループ（assignee::案件::視点）が
        // 元タスクと別キーになる。グループ単位で見るとリロードのたびに重複生成してしまうため、
        // 冪等性は全体集合で担保する。
        const migratedIds = new Set(all.map(t => t.migratedFromRound).filter(Boolean));
        for (const [, group] of byVp) {
          // 履歴は複製ずれ対策で最長を採用（metaFromGroup と同じ流儀）
          let history = [];
          for (const t of group) {
            const h = normalizeHistory(t.prodHistory);
            if (h.length > history.length) history = h;
          }
          if (history.length === 0) continue;
          // 既存ステップの最大 stepOrder（請求専用ステップは末尾に積む）
          let maxOrder = -1;
          for (const t of group) {
            const o = (t.stepOrder == null) ? -1 : t.stepOrder;
            if (o > maxOrder) maxOrder = o;
          }
          // テンプレ（案件・視点メタ）として最初のタスクを使う
          const tpl = group[0];
          for (const r of history) {
            if (migratedIds.has(r.id)) continue; // 冪等：移行済みは飛ばす
            maxOrder += 1;
            const id = `task-mig-${baseTime}-${seq}-${Math.random().toString(36).slice(2, 7)}`;
            newSteps.push({
              id,
              projectName: tpl.projectName || '',
              projectNameInternal: tpl.projectNameInternal || '',
              companyName: tpl.companyName || '',
              customerContact: tpl.customerContact || '',
              viewpointName: tpl.viewpointName || '',
              viewpointNameExternal: tpl.viewpointNameExternal || '',
              viewpointCategory: tpl.viewpointCategory || '',
              stepName: (r.memo || '').trim() || `${roundTypeOf(r.type).short}制作`,
              stepOrder: maxOrder,
              assignee: '',           // 0時間なのでスケジュールに影響しない
              priority: tpl.priority || 99,
              hours: 0, completedHours: 0,
              memo: '',
              tentative: false, tentativeStart: null, tentativeEnd: null,
              deadline: tpl.deadline || null,
              projectDeadline: tpl.projectDeadline || null,
              projectRequestDate: tpl.projectRequestDate || null,
              manualStart: null, manualEnd: null,
              status: 'done',         // 請求専用：未対応の作業として出さない
              completedAt: baseTime + seq,
              createdAt: baseTime + seq,
              // 請求情報（ステップへ写し取り）
              stepAmount: (r.amount === '' || r.amount == null) ? '' : String(r.amount),
              stepRequestDate: r.date || '',
              stepCompletedDate: '',
              stepDeliveryNameOverride: (r.memo || '').trim(),
              stepRoundType: roundTypeOf(r.type).id,
              stepOutInHouse: r.outInHouse || '',
              stepOutExternal: r.outExternal || '',
              stepOutVND: (r.outVND === '' || r.outVND == null) ? '' : String(r.outVND),
              // 冪等キー（prodHistory は残す＝非破壊）
              migratedFromRound: r.id,
            });
            migratedIds.add(r.id); // 同一ラウンドの二重生成を防ぐ（複数担当グループ対策）
            seq += 1;
          }
        }
        migrationDone.current = true; // 走るのは一度きり
        if (newSteps.length === 0) return; // 移行対象なし → 書き込まない
        saveTasks(prev => normalizePriorities([...prev, ...newSteps]));
      } catch (e) { console.error('制作履歴→ステップ移行に失敗:', e); migrationDone.current = true; }
    }, 1200);
    return () => clearTimeout(handle);
  }, [auth.allowed, tasksLoaded]);

  // データベース（Firestore）から最新データを手動で再取得して反映する。
  // アプリ更新直後などにタスクが一時的に消えて見える場合の復旧用。購読は維持したまま、
  // サーバの最新値を即座に読み直して画面へ反映する（ローカルの変更を消すことはしない）。
  const refreshData = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const [rawTasks, sVal, hVal, aVal, oVal, cVal, eVal, mVal] = await Promise.all([
        tasksStore.listAll(),
        storage.get('settings'), storage.get('holidays'), storage.get('absences'),
        storage.get('projectOrder'), storage.get('customerMaster'),
        storage.get('employeeMaster'), storage.get('memos'),
      ]);
      const parseArr = (v) => {
        if (!v || !v.value) return [];
        try { const p = JSON.parse(v.value); return Array.isArray(p) ? p : []; } catch (e) { return []; }
      };
      // タスク
      const normalized = normalizePriorities((rawTasks || []).map(migrateTask));
      setTasks(normalized);
      tasksRef.current = normalized;
      setTasksLoaded(true);
      // 休日・休み（専用キー）
      const holidays = parseArr(hVal);
      const absences = parseArr(aVal);
      syncHolidays({ holidays });
      // 設定（holidays/absences は専用キーの値で上書き）
      if (sVal && sVal.value) {
        try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(sVal.value), holidays, absences }); }
        catch (e) { setSettings(prev => ({ ...prev, holidays, absences })); }
      } else {
        setSettings(prev => ({ ...prev, holidays, absences }));
      }
      setSettingsLoaded(true);
      // 並び順・マスタ・メモ
      setProjectOrder(parseArr(oVal));
      setCustomerMaster(cVal && cVal.value ? (() => { try { return normalizeCustomerMaster(JSON.parse(cVal.value)); } catch (e) { return []; } })() : []);
      setEmployeeMaster(parseArr(eVal));
      setMemos(parseArr(mVal));
      setLastSync(new Date());
    } catch (e) {
      console.error('データ更新エラー:', e);
      notify('データの更新に失敗しました。通信状況を確認して、もう一度お試しください。\n' + (e?.message || e), { type: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  // 差分書き込み：updater が返した newTasks と現在の tasksRef を比較し、
  // 変更・追加されたタスクだけを per-doc で Firestore に書き込む。
  // 「ローカルに無い＝相手端末で追加されたタスク」を勝手に削除しないので、
  // 端末間で表示が乖離しない（明示削除は removeTask を使う）。
  const saveTasks = async (updater) => {
    const prev = tasksRef.current;
    const newTasks = typeof updater === 'function' ? updater(prev) : updater;
    setTasks(newTasks); // 楽観的に画面を即更新
    tasksRef.current = newTasks;

    const prevMap = new Map(prev.map(t => [t.id, t]));
    const upserts = [];
    for (const t of newTasks) {
      const old = prevMap.get(t.id);
      if (!old || JSON.stringify(old) !== JSON.stringify(t)) upserts.push(t);
    }
    if (upserts.length === 0) return;
    try { await tasksStore.batch(upserts, []); }
    catch (e) { console.error('タスク保存エラー:', e); }
  };

  const removeTask = async (id) => {
    const filtered = tasksRef.current.filter(t => t.id !== id);
    setTasks(filtered);
    tasksRef.current = filtered;
    try { await tasksStore.remove(id); }
    catch (e) { console.error('タスク削除エラー:', e); }
  };

  // 削除の取り消し（トーストの「元に戻す」）：削除したタスクを復元し、
  // シート由来IDの削除記録（deletedExternalIds）も取り消す
  const restoreTasks = async (list) => {
    if (!list || list.length === 0) return;
    const eids = list.filter(t => t.externalId).map(t => t.externalId);
    if (eids.length > 0) {
      try {
        const current = await storage.get('deletedExternalIds');
        const arr = (current && current.value) ? JSON.parse(current.value) : [];
        const next = arr.filter(e => !eids.includes(e));
        if (next.length !== arr.length) await storage.set('deletedExternalIds', JSON.stringify(next));
      } catch (e) { console.warn('削除済みリストの復元に失敗:', e); }
    }
    await saveTasks(prev => normalizePriorities([...prev, ...list]));
  };

  const saveSettings = async (newSettings) => {
    setSettings(newSettings);
    try {
      const { morningStart, morningEnd, afternoonStart, afternoonEnd, startDate, startTime, overtimes, endPromptState, companyOrder } = newSettings;
      // 休日(holidays)・休み(absences) は巻き込み事故防止のため別ドキュメント（saveHolidays/saveAbsences）に分離。ここでは保存しない。
      await storage.set('settings', JSON.stringify({ morningStart, morningEnd, afternoonStart, afternoonEnd, startDate, startTime, overtimes: overtimes || [], endPromptState: endPromptState || {}, companyOrder: companyOrder || [] }));
    } catch (e) { console.error(e); }
  };
  // 休日（祝日）・休み（欠勤・不在）は専用キーに保存する。状態には settings 内に保持して既存の参照を維持。
  const saveHolidays = async (arr) => {
    syncHolidays({ holidays: arr });
    setSettings(prev => ({ ...prev, holidays: arr }));
    try { await storage.set('holidays', JSON.stringify(arr)); }
    catch (e) { console.error('祝日保存エラー:', e); }
  };
  const saveAbsences = async (arr) => {
    setSettings(prev => ({ ...prev, absences: arr }));
    try { await storage.set('absences', JSON.stringify(arr)); }
    catch (e) { console.error('欠勤・不在保存エラー:', e); }
  };
  // 会社の表示順を保存
  const saveCompanyOrder = (order) => {
    saveSettings({ ...settings, companyOrder: order });
  };
  // 終了超過ポップアップの制御状態（視点ごとの snooze / 表示済み終了予定）を更新
  // key は視点キー（assignee::projectName::viewpointName）
  const setEndPromptFor = (key, patch) => {
    const eps = { ...(settings.endPromptState || {}) };
    eps[key] = { ...(eps[key] || {}), ...patch };
    saveSettings({ ...settings, endPromptState: eps });
  };

  // 欠勤・休日・不在の追加／削除（専用キーへ保存）
  const addAbsence = (absence) => {
    saveAbsences([...(settings.absences || []), { ...absence, id: genId('abs') }]);
  };
  const removeAbsence = (id) => {
    saveAbsences((settings.absences || []).filter(a => a.id !== id));
  };

  // 全体共通の祝日（ベトナム等）の追加／削除。重複日付は無視する
  const addHolidays = (items) => {
    const cur = settings.holidays || [];
    const have = new Set(cur.map(h => h.date));
    const adds = [];
    for (const it of (items || [])) {
      for (const date of expandHolidayDates(it.date, it.days)) {
        if (have.has(date)) continue;
        have.add(date);
        adds.push({ id: genId('hol'), date, label: it.label || '' });
      }
    }
    if (adds.length === 0) return;
    saveHolidays([...cur, ...adds]);
  };
  const removeHoliday = (id) => {
    saveHolidays((settings.holidays || []).filter(h => h.id !== id));
  };

  // 残業（稼働枠の追加）の追加／削除
  const addOvertime = (overtime) => {
    const next = [...(settings.overtimes || []), { ...overtime, id: genId('ot') }];
    saveSettings({ ...settings, overtimes: next });
  };
  const removeOvertime = (id) => {
    saveSettings({ ...settings, overtimes: (settings.overtimes || []).filter(o => o.id !== id) });
  };

  // 案件並び順の保存（楽観的に即反映 → Firestore 上書き → 他端末同期）
  const saveProjectOrder = async (newOrder) => {
    setProjectOrder(newOrder);
    try { await storage.set('projectOrder', JSON.stringify(newOrder)); }
    catch (e) { console.error('案件並び順保存エラー:', e); }
  };

  // 担当者別など「一部の案件しか見えていないビュー」からの並べ替え用。
  // 見えている案件（visibleNewOrder）の新しい順を、全体の projectOrder に
  // マージする（見えていない案件は位置を保持）。
  const saveProjectOrderPartial = (visibleNewOrder) => {
    const visibleSet = new Set(visibleNewOrder);
    const active = tasksRef.current.filter(t => t.status !== 'done');
    // 現在の実効的な全体順（既定は会社ごと・手動分は反映済み）
    const currentFull = computeProjectOrder(active, projectOrder);
    let vi = 0;
    const merged = currentFull.map(n => (visibleSet.has(n) && vi < visibleNewOrder.length) ? visibleNewOrder[vi++] : n);
    while (vi < visibleNewOrder.length) merged.push(visibleNewOrder[vi++]);
    saveProjectOrder(merged);
  };

  // カレンダーから担当者行を並び替え（従業員マスタの並び順を更新 → 全画面に反映）
  const reorderAssigneeFromCalendar = (srcName, targetName) => {
    if (!srcName || srcName === targetName) return;
    const si = employeeMaster.findIndex(e => e.name === srcName);
    const ti = employeeMaster.findIndex(e => e.name === targetName);
    if (si < 0 || ti < 0) {
      notify('担当者の並び替えは、従業員マスタに登録されている担当者同士でのみ行えます。\nマスタタブで従業員を登録してください。', { type: 'error' });
      return;
    }
    const src = employeeMaster[si];
    const rest = employeeMaster.filter((_, i) => i !== si);
    const t2 = rest.findIndex(e => e.name === targetName);
    saveEmployeeMaster([...rest.slice(0, t2), src, ...rest.slice(t2)]);
  };

  // カレンダーから案件の順番を並び替え：src 案件を target 案件の位置（直前）へ差し込む
  const reorderProjectFromCalendar = (srcProj, targetProj) => {
    if (!srcProj || srcProj === targetProj) return;
    const active = tasksRef.current.filter(t => t.status !== 'done');
    const effective = computeProjectOrder(active, projectOrder);
    if (!effective.includes(srcProj) || !effective.includes(targetProj)) return;
    const filtered = effective.filter(p => p !== srcProj);
    const ti = filtered.indexOf(targetProj);
    saveProjectOrder([...filtered.slice(0, ti), srcProj, ...filtered.slice(ti)]);
  };

  // カレンダーから視点（案件×視点）の担当者を付け替える：
  // ブロックを別の担当者の行へドロップしたときに、その視点の進行中案件の担当者を変更する。
  const reassignViewpointFromCalendar = (projectName, viewpointName, fromAssignee, toAssignee) => {
    const na = (toAssignee || '').trim();
    if (!na || na === fromAssignee) return;
    saveTasks(prev => normalizePriorities(prev.map(t =>
      (t.projectName === projectName && t.viewpointName === viewpointName && t.assignee === fromAssignee && t.status !== 'done')
        ? { ...t, assignee: na } : t
    )));
  };

  // マスタの保存（楽観的に即反映 → Firestore 上書き → 他端末同期）
  const saveCustomerMaster = async (arr) => {
    setCustomerMaster(arr);
    try { await storage.set('customerMaster', JSON.stringify(arr)); }
    catch (e) { console.error('お客様マスタ保存エラー:', e); }
  };
  const saveEmployeeMaster = async (arr) => {
    setEmployeeMaster(arr);
    try { await storage.set('employeeMaster', JSON.stringify(arr)); }
    catch (e) { console.error('従業員マスタ保存エラー:', e); }
  };
  const saveStepTypeMaster = async (arr) => {
    const norm = normalizeStepTypes(arr);
    setStepTypeMaster(norm);
    try { await storage.set('stepTypeMaster', JSON.stringify(norm)); }
    catch (e) { console.error('ステップ種類マスタ保存エラー:', e); }
  };

  // 案件登録/更新時、フォームで新しく入力された担当者を従業員マスタへ自動追加する。
  // これにより次回以降の担当者候補や表示順（カレンダー等）に反映され、毎回マスタへ手入力する必要がなくなる。
  const syncAssigneesToMaster = (records) => {
    const existing = new Set(employeeMaster.map(e => (e.name || '').trim()).filter(Boolean));
    const additions = [];
    const seen = new Set();
    for (const r of (records || [])) {
      const name = (r.assignee || '').trim();
      if (!name || existing.has(name) || seen.has(name)) continue;
      seen.add(name);
      additions.push({ id: genId('emp'), name, role: '' });
    }
    if (additions.length > 0) saveEmployeeMaster([...employeeMaster, ...additions]);
  };

  // 案件登録/更新時、フォームで初めて入力されたお客様担当者をお客様マスタへ自動追加する。
  // 会社が指定されていればその会社の担当者として、未指定なら会社名が空のエントリへ登録する。
  // 既に同じ会社の担当者として存在する場合は何もしない（会社名はカナ・全半角の違いを無視して照合）。
  const syncCustomerContactToMaster = (company, contact) => {
    const name = (contact || '').trim();
    if (!name) return;
    const comp = (company || '').trim();
    const compKey = kanaNormalize(comp);
    const rows = customerMaster || [];
    const idx = comp
      ? rows.findIndex(r => kanaNormalize(r.company) === compKey)
      : rows.findIndex(r => !((r.company || '').trim()));
    if (idx >= 0) {
      const has = (rows[idx].contacts || []).some(ct => (ct.name || '').trim() === name);
      if (has) return; // 既存の担当者 → 何もしない
      const next = rows.map((r, i) => i === idx
        ? { ...r, contacts: [...(r.contacts || []), { id: genId('cc'), name }] }
        : r);
      saveCustomerMaster(next);
    } else {
      // 該当する会社エントリが無い → 新規作成して担当者を登録
      saveCustomerMaster([...rows, { id: genId('cust'), company: comp, contacts: [{ id: genId('cc'), name }] }]);
    }
  };

  // 会社名の統合（冪等・該当が無ければ何もしない）：
  // 「株式会社オフィスコム」を「オフィスコム」に統一する。Firestore 上の既存データに対して
  // ブラウザ側で一度きり移行する（タスクの会社名・お客様マスタ・会社の表示順を書き換える）。
  useEffect(() => {
    if (loading) return;
    const OLD = '株式会社オフィスコム';
    const NEW = 'オフィスコム';

    // 1) タスクの会社名
    if (tasksRef.current.some(t => (t.companyName || '') === OLD)) {
      saveTasks(prev => prev.map(t => (t.companyName || '') === OLD ? { ...t, companyName: NEW } : t));
    }

    // 2) お客様マスタ（NEW が既にあれば担当者を統合して OLD を削除、無ければ会社名を改名）
    if (customerMaster.some(c => c.company === OLD)) {
      const oldEntry = customerMaster.find(c => c.company === OLD);
      const target = customerMaster.find(c => c.company === NEW);
      let next;
      if (target) {
        const seen = new Set();
        const mergedContacts = [...(target.contacts || []), ...((oldEntry && oldEntry.contacts) || [])]
          .filter(ct => {
            const k = (ct.name || '').trim();
            if (!k) return true;            // 名前が空の行はそのまま残す
            if (seen.has(k)) return false;  // 同名は重複として除去
            seen.add(k); return true;
          });
        next = customerMaster
          .filter(c => c.company !== OLD)
          .map(c => c.company === NEW ? { ...c, contacts: mergedContacts } : c);
      } else {
        next = customerMaster.map(c => c.company === OLD ? { ...c, company: NEW } : c);
      }
      saveCustomerMaster(next);
    }

    // 3) 会社の表示順（OLD を NEW に置換して重複を除去）
    const order = settings.companyOrder || [];
    if (order.includes(OLD)) {
      const replaced = order.map(n => n === OLD ? NEW : n);
      saveCompanyOrder(replaced.filter((n, i) => replaced.indexOf(n) === i));
    }
  }, [loading, tasks, customerMaster, settings.companyOrder]);

  // 制作時間0のステップ（タスク）を一度だけ削除する（起動時クリーンアップ）。
  // 「制作時間0のステップは登録不可」に合わせ、既存データに残る0時間ステップを掃除する。
  const didCleanupZeroHours = useRef(false);
  useEffect(() => {
    if (!tasksLoaded || didCleanupZeroHours.current) return;
    didCleanupZeroHours.current = true;
    const zeroIds = tasksRef.current
      .filter(t => { const h = Number(t.hours); return isNaN(h) || h <= 0; })
      .map(t => t.id);
    if (zeroIds.length === 0) return;
    const idSet = new Set(zeroIds);
    const remaining = tasksRef.current.filter(t => !idSet.has(t.id));
    setTasks(remaining);
    tasksRef.current = remaining;
    tasksStore.batch([], zeroIds).catch(e => console.error('制作時間0ステップ削除エラー:', e));
  }, [tasksLoaded]);

  // 一度きりのデータ補正：案件「REN.39」の各ステップの完了時間を制作時間と同じ値にする。
  // （過去に入れた REN.39 の完了時間が全て0になっていたため。冪等：一致していれば対象外）
  const didFixREN39Completed = useRef(false);
  useEffect(() => {
    if (!tasksLoaded || didFixREN39Completed.current) return;
    didFixREN39Completed.current = true;
    // 区切り・大文字小文字の違いを吸収して「REN.39 / REN-39 / REN 39 / ren39」を同一視
    const norm = (s) => (s || '').toString().replace(/[\s._-]/g, '').toUpperCase();
    const isTarget = (t) => norm(t.projectName) === 'REN39' || norm(t.projectNameInternal) === 'REN39';
    const patched = tasksRef.current
      .filter(t => isTarget(t))
      .filter(t => { const h = Number(t.hours) || 0; const c = Number(t.completedHours) || 0; return h > 0 && c !== h; })
      .map(t => ({ ...t, completedHours: Number(t.hours) || 0 }));
    if (patched.length === 0) return;
    const patchMap = new Map(patched.map(p => [p.id, p]));
    const next = tasksRef.current.map(t => patchMap.get(t.id) || t);
    setTasks(next);
    tasksRef.current = next;
    tasksStore.batch(patched, []).catch(e => console.error('REN.39 完了時間補正エラー:', e));
  }, [tasksLoaded]);

  // タスクメモの追加・更新（id が一致すれば更新、無ければ追加）
  const upsertMemo = (memo) => {
    setMemos(prev => {
      const exists = prev.some(m => m.id === memo.id);
      const next = exists ? prev.map(m => m.id === memo.id ? memo : m) : [...prev, memo];
      storage.set('memos', JSON.stringify(next)).catch(e => console.error('タスクメモ保存エラー:', e));
      return next;
    });
  };
  const deleteMemo = (id) => {
    const memo = (memos || []).find(m => m.id === id) || null;
    setMemos(prev => {
      const next = prev.filter(m => m.id !== id);
      storage.set('memos', JSON.stringify(next)).catch(e => console.error('タスクメモ削除エラー:', e));
      return next;
    });
    if (memo) notify(`メモ「${(memo.title || '').trim() || '無題'}」を削除しました`, { undo: () => upsertMemo(memo) });
  };


  // 登録/更新のエントリ：開始時間が指定どおりに置けない場合、
  // または視点の終了予定が納期を超える場合は確認モーダルを出す
  const handleSubmit = async () => {
    if (form.projectName.trim()) {
      const sim = simulateFormSchedule(form, tasksRef.current, settings, projectOrder, new Date());
      const hasStartPin = (form.viewpoints || []).some(v => v.manualStart);
      const moved = !!(sim && sim.moved && hasStartPin);
      const violations = (sim && sim.deadlineViolations) || [];
      if (moved || violations.length > 0) {
        let reorder = null;
        if (violations.length > 0) {
          try { reorder = computeDeadlineReorder(form, tasksRef.current, settings, projectOrder, new Date()); }
          catch (e) { console.warn('並べ替え提案の算出に失敗:', e); }
        }
        setStartMoveConfirm({
          moved,
          requested: sim.requested,
          actualDate: sim.startDate,
          actualMin: sim.startMin,
          violations,
          reorder,
        });
        return; // モーダルの選択肢で performSubmit を呼ぶ
      }
    }
    await performSubmit();
  };

  // 登録/更新の本体（確認モーダルを通過したあとに実際に保存する処理）
  // opts.orderOverride: 納期超過時の繰り上げで採用する案件並び順（完全な案件名リスト）
  const performSubmit = async (opts = {}) => {
    if (!form.projectName.trim()) {
      notify('案件名を入力してください', { type: 'error' });
      return false;
    }
    // 優先順位は廃止。編集時は既存の順位（form.priority）を保持し、
    // 新規登録時は「同じ会社の中で納期（実効）の早い順」の位置に挿入する（手動ドラッグ／↑↓で上書き可）。
    let priority = parseInt(form.priority, 10);
    if (isNaN(priority) || priority < 1) {
      const companyName = (form.companyName || '').trim();
      const activeSameCompany = tasks.filter(t => t.status !== 'done' && (t.companyName || '') === companyName);
      const dlKey = Math.min(...(form.viewpoints || []).map(v => deadlineKey((v.deadline || '').trim() || (form.projectDeadline || '').trim())));
      priority = deadlineInsertPriority(activeSameCompany, dlKey);
    }

    // フォーム → タスクレコード化（編集モード共通の前処理）
    // 各 step に taskId があれば既存タスクと紐付け、無ければ新規
    const buildRecords = (originalById) => {
      const upserts = [];
      const baseTime = Date.now();
      let seq = 0;
      // 金額が入るのはオフショア案件のみ（ラボ案件は各ステップ金額を0＝空に固定）。
      const amountApplicable = offshoreCompanies.has((form.companyName || '').trim());
      for (const vp of form.viewpoints) {
        const vpName = (vp.viewpointName || '').trim();
        const vpAssignee = (vp.assignee || '').trim() || form.assignee.trim();
        const hasAnyInput = vpName || vp.steps.some(s => (s.name || '').trim() || (parseHM(s.hours) > 0));
        if (!hasAnyInput) continue;
        if (!vpName) { return { error: '内容を入力した視点には視点名も入力してください' }; }

        let order = 0;
        let vpHasStep = false;
        const vpFirstIdx = upserts.length; // この視点のレコード開始位置（視点ごとの開始時間の適用先を探す用）
        // ステップ種類マスタから、回数付きの表示名・納品名サフィックスを解決（配列順で連番）
        const vpResolved = resolveViewpointSteps(vp.steps, stepTypeMaster);
        for (let stepIdx = 0; stepIdx < vp.steps.length; stepIdx++) {
          const step = vp.steps[stepIdx];
          const resolved = vpResolved[stepIdx] || { label: (step.name || '').trim(), deliverySuffix: '', typeId: '', paid: true };
          const name = (resolved.label || step.name || '').trim();
          const hoursStr = step.hours === undefined || step.hours === null ? '' : String(step.hours);
          const hoursEmpty = hoursStr.trim() === '';
          const stepHours = hoursEmpty ? 0 : parseHM(hoursStr);
          // 制作時間0のステップは登録しない（空欄ステップと同様にスキップ）。
          // 名称（種類）だけ選んで時間未入力のステップも、ここで除外して登録対象にしない。
          if (isNaN(stepHours) || stepHours <= 0) continue;
          // 制作時間を入力したのに種類（名称）が未選択のステップは登録できない
          if (!name) { return { error: `視点「${vpName}」で制作時間を入力したステップには種類（ステップ名）を選択してください` }; }
          const stepCompleted = step.completedHours === '' ? 0 : parseHM(step.completedHours);
          if (isNaN(stepCompleted) || stepCompleted < 0) { return { error: `「${name}」の完了時間が無効です` }; }
          if (stepCompleted > stepHours) { return { error: `「${name}」の完了時間が制作時間を超えています` }; }
          const autoDone = stepHours > 0 && stepCompleted >= stepHours;
          // ステップごとの担当者（未指定なら視点の担当者→デフォルト担当者）
          const stepAssignee = (step.assignee || '').trim() || vpAssignee;
          if (!stepAssignee) { return { error: `視点「${vpName}」の「${name}」の担当者を入力してください` }; }

          const existing = step.taskId && originalById ? originalById.get(step.taskId) : null;
          const id = existing ? existing.id : `task-${baseTime}-${seq}-${Math.random().toString(36).slice(2, 7)}`;

          // 中止済みタスクは完了時間に関わらず done のまま維持（戻すのは完了タブの「戻す」で行う）
          const isCancelled = !!existing?.cancelled;
          const status = (isCancelled || autoDone) ? 'done' : 'pending';
          // 登録日（新規は今日・編集は最初の登録日を維持）。依頼日が未指定ならこの日付を自動反映する。
          const regDate = existing?.registeredDate || fmtYMD(new Date(baseTime));
          const record = {
            id,
            projectName: form.projectName.trim(),
            projectNameInternal: (form.projectNameInternal || '').trim(),
            companyName: (form.companyName || '').trim(),
            customerContact: (form.customerContact || '').trim(),
            viewpointName: vpName,
            viewpointNameExternal: (vp.viewpointNameExternal || '').trim(),
            viewpointCategory: (vp.viewpointCategory || '').trim(),
            stepName: name, stepOrder: order,
            assignee: stepAssignee,
            priority, hours: stepHours, completedHours: stepCompleted,
            memo: (form.memo || '').trim(),
            tentative: !!form.tentative,
            tentativeStart: form.tentative ? (form.tentativeStart || null) : null,
            tentativeEnd: form.tentative ? (form.tentativeEnd || null) : null,
            deadline: vp.deadline || null,               // 個別納期（視点）
            projectDeadline: (form.projectDeadline || '').trim() || null, // 全体納期（案件）
            projectRequestDate: (form.projectRequestDate || '').trim() || null, // 依頼日（案件共通）
            // ステップ個別の開始・終了指定は維持（フォームの欄は下で先頭/末尾の未完了ステップに適用）
            manualStart: existing?.manualStart || null,
            manualEnd: existing?.manualEnd || null,
            status,
            completedAt: status === 'done' ? (existing?.completedAt || (baseTime + seq)) : null,
            createdAt: existing?.createdAt || (baseTime + seq),
            // 登録日（自動記録・編集しても最初の登録日を維持）。案件の登録日はタスクの最早値
            registeredDate: regDate,
            // ステップ種類（プルダウン選択のマスタID）と納品名サフィックス（白色/色付/色付2…）
            stepTypeId: resolved.typeId || (step.stepTypeId === '__free__' ? '' : step.stepTypeId) || '',
            stepDeliverySuffix: resolved.deliverySuffix || '',
            // ステップごとの金額・依頼日・完了日（ステップ＝納品単位。売上へ1ステップ1行で連携）
            // 金額が入るのはオフショア案件のみ。ラボ案件（amountApplicable=false）は0（空）に固定。
            // 無料ステップ（種類が無料）も金額を反映しない（空に固定）。
            stepAmount: (!amountApplicable || resolved.paid === false) ? '' : ((step.amount === undefined || step.amount === null) ? '' : String(step.amount).trim()),
            stepRequestDate: (step.requestDate || '').trim() || regDate,
            stepCompletedDate: (step.completedDate || '').trim(),
            stepDeliveryNameOverride: (step.deliveryName || '').trim(),
            // ステップごとの請求情報（種類・外注）。請求はステップが唯一の元データ。
            // 種類は空（''）＝納品に数えない。納品種類（初回/追加）は請求パネルで明示的に設定する。
            stepRoundType: (step.roundType || '').trim(),
            stepOutInHouse: (step.outInHouse || '').trim(),
            stepOutExternal: (step.outExternal || '').trim(),
            stepOutVND: (step.outVND === undefined || step.outVND === null) ? '' : String(step.outVND).trim(),
          };
          // 完了実績（actualEnd）・中止フラグは編集後も維持する
          if (status === 'done' && existing?.actualEnd) record.actualEnd = existing.actualEnd;
          if (isCancelled) record.cancelled = true;
          if (existing?.externalId) record.externalId = existing.externalId;
          upserts.push(record);
          order++; seq++; vpHasStep = true;
        }
        if (!vpHasStep) { return { error: `視点「${vpName}」に少なくとも1つのステップ（名称＋時間）を入力してください` }; }
        // 視点ごとの開始時間：この視点の最初の未完了ステップに登録・解除する
        // 視点ごとの終了時間：この視点の最後の未完了ステップに登録・解除する
        // （他ステップの個別指定はそのまま維持）
        const vpRecs = upserts.slice(vpFirstIdx);
        const vpTarget = vpRecs.find(u => u.status !== 'done');
        if (vpTarget) vpTarget.manualStart = vp.manualStart || null;
        else if (vp.manualStart && vpRecs.length > 0) vpRecs[0].manualStart = vp.manualStart;
        const vpLastActive = [...vpRecs].reverse().find(u => u.status !== 'done');
        if (vpLastActive) vpLastActive.manualEnd = vp.manualEnd || null;
        else if (vp.manualEnd && vpRecs.length > 0) vpRecs[vpRecs.length - 1].manualEnd = vp.manualEnd;

        // 視点メタ（制作履歴・納品名上書き・集計フラグ）の引き継ぎ。
        // 制作履歴（カードの追加・修正・外注）はそのまま保持し、ステップ金額は上の各レコードに保存済み。
        let existingMeta = null;
        if (originalById) {
          for (const s of vp.steps) {
            if (s.taskId && originalById.has(s.taskId)) { existingMeta = originalById.get(s.taskId); break; }
          }
        }
        const vpHistory = normalizeHistory(existingMeta?.prodHistory);
        // 納品名（上書き）：フォーム値（編集時は既存値が初期表示される）。空なら自動（案件名_視点名）。
        // add-step フローでは vp.deliveryName 未定義＝既存ステップは別レコードで保持されるため空でよい。
        const deliveryOverride = (vp.deliveryName ?? '').toString().trim() || (vp.deliveryName === undefined ? (existingMeta?.deliveryNameOverride || '') : '');
        for (const rec of upserts.slice(vpFirstIdx)) {
          if (vpHistory.length) rec.prodHistory = vpHistory;
          if (deliveryOverride) rec.deliveryNameOverride = deliveryOverride;
          if (existingMeta && existingMeta.countAsDelivery === false) rec.countAsDelivery = false;
        }
      }
      return { upserts };
    };

    if (editMode) {
      // 編集スコープに含まれる既存タスクを抽出（編集モードに応じて）
      let originalTasks = [];
      if (editMode.type === 'step') {
        const t = tasksRef.current.find(x => x.id === editMode.taskId);
        if (t) originalTasks = [t];
      } else if (editMode.type === 'viewpoint') {
        originalTasks = tasksRef.current.filter(t =>
          t.projectName === editMode.projectName &&
          t.viewpointName === editMode.viewpointName &&
          t.assignee === editMode.assignee &&
          t.status !== 'done'
        );
      } else if (editMode.type === 'project') {
        // 完了済みタスクも編集スコープに含める（過去案件の情報修正）
        originalTasks = tasksRef.current.filter(t =>
          t.projectName === editMode.projectName
        );
      }
      const originalById = new Map(originalTasks.map(t => [t.id, t]));

      const result = buildRecords(originalById);
      if (result.error) { notify(result.error, { type: 'error' }); return; }
      const upserts = result.upserts;
      if (upserts.length === 0) { notify('少なくとも1つの視点とステップを入力してください', { type: 'error' }); return; }

      // スコープ内で「元あったが form に残っていない」タスクは削除
      const keptIds = new Set(upserts.filter(u => originalById.has(u.id)).map(u => u.id));
      const deletedIds = originalTasks.filter(t => !keptIds.has(t.id)).map(t => t.id);
      if (deletedIds.length > 0) {
        if (!(await confirmDialog({ title: 'ステップの削除', message: `${deletedIds.length}件のステップが削除されます。よろしいですか？`, confirmLabel: '削除して保存' }))) return;
      }

      // シート由来タスクの削除を deletedExternalIds に記録
      try {
        const eids = originalTasks.filter(t => deletedIds.includes(t.id) && t.externalId).map(t => t.externalId);
        if (eids.length > 0) {
          const current = await storage.get('deletedExternalIds');
          const list = (current && current.value) ? JSON.parse(current.value) : [];
          let changed = false;
          for (const eid of eids) { if (!list.includes(eid)) { list.push(eid); changed = true; } }
          if (changed) await storage.set('deletedExternalIds', JSON.stringify(list));
        }
      } catch (e) { console.warn('削除済みリストの更新に失敗:', e); }

      const upsertMap = new Map(upserts.map(t => [t.id, t]));
      const deletedSet = new Set(deletedIds);
      const merged = tasksRef.current
        .filter(t => !deletedSet.has(t.id))
        .map(t => upsertMap.has(t.id) ? upsertMap.get(t.id) : t);
      for (const t of upserts) {
        if (!tasksRef.current.find(x => x.id === t.id)) merged.push(t);
      }

      // === 案件名の統一処理（全編集モード共通） ===
      // 編集スコープ外で「旧案件名」を持つタスク（他視点・完了済み）も新名へ揃え、
      // 「視点編集／ステップ編集から案件名を変えた時に案件が分割される」のを防ぐ
      let finalUpserts = upserts;
      let finalMerged = merged;
      const oldProjectName = editMode.projectName;
      const newProjectName = form.projectName.trim();
      const newProjectInternal = (form.projectNameInternal || '').trim();
      const newCompany = (form.companyName || '').trim();
      const newContact = (form.customerContact || '').trim();
      const upsertIds = new Set(upserts.map(u => u.id));
      const needsRename = merged.filter(t => {
        if (upsertIds.has(t.id)) return false;
        if (t.projectName !== oldProjectName) return false;
        return t.projectName !== newProjectName
          || (t.projectNameInternal || '') !== newProjectInternal
          || (t.companyName || '') !== newCompany
          || (t.customerContact || '') !== newContact;
      });

      if (needsRename.length > 0) {
        // 視点編集／ステップ編集から案件名を変えた場合は、スコープ外への影響を確認
        if (editMode.type !== 'project') {
          const activeOut = needsRename.filter(t => t.status !== 'done').length;
          const doneOut = needsRename.length - activeOut;
          const detail = doneOut > 0
            ? `${needsRename.length}件（他視点アクティブ ${activeOut}件・完了済み ${doneOut}件）`
            : `他の視点 ${activeOut}件`;
          const ok = await confirmDialog({
            title: '案件名の変更',
            message: `案件名（または案件コード）を変更すると、\n` +
              `この案件の全タスク（${detail}）にも反映されます。\n` +
              `よろしいですか？`,
            confirmLabel: '変更する',
          });
          if (!ok) return;
        }
        const renames = needsRename.map(t => ({ ...t, projectName: newProjectName, projectNameInternal: newProjectInternal, companyName: newCompany, customerContact: newContact }));
        const renameMap = new Map(renames.map(r => [r.id, r]));
        finalMerged = merged.map(t => renameMap.get(t.id) || t);
        finalUpserts = [...upserts, ...renames];
      }

      const normalized = normalizePriorities(finalMerged);
      setTasks(normalized);
      tasksRef.current = normalized;
      syncAssigneesToMaster(finalUpserts);
      syncCustomerContactToMaster(newCompany, newContact);
      try { await tasksStore.batch(finalUpserts, deletedIds); }
      catch (e) { console.error('編集保存エラー:', e); notify('保存に失敗しました：' + (e?.message || e), { type: 'error' }); }

      if (opts.orderOverride) saveProjectOrder(opts.orderOverride);
      setEditMode(null);
      setEditingId(null);
      setForm(emptyForm);
      return true;
    }

    // 新規登録
    const result = buildRecords(null);
    if (result.error) { notify(result.error, { type: 'error' }); return false; }
    const records = result.upserts;
    if (records.length === 0) { notify('少なくとも1つの視点とステップを入力してください', { type: 'error' }); return false; }
    saveTasks(prev => normalizePriorities([...prev, ...records]));
    syncAssigneesToMaster(records);
    syncCustomerContactToMaster(form.companyName, form.customerContact);
    if (opts.orderOverride) saveProjectOrder(opts.orderOverride);
    setForm(emptyForm);
    return true;
  };

  // 「過去案件から引用」時に入力中の下書きを破棄しないための処理。
  // 入力中の内容を進行中タスクとして登録（保存）し、その案件の編集画面を開く。
  // 登録できた場合は true を返す（案件名未入力・視点未入力などで登録できない場合は false）。
  const registerDraftAndEdit = async () => {
    const projName = (form.projectName || '').trim();
    if (!projName) {
      notify('入力中の案件名がないため、進行中タスクとして登録できません。案件名を入力してください。', { type: 'error' });
      return false;
    }
    // performSubmit を直接呼び、スケジュール調整モーダルを挟まずそのまま保存する
    const ok = await performSubmit();
    if (ok) handleEditProject(projName);
    return ok;
  };

  // ステップを編集：新規登録フォームと同じ複数視点フォームに、そのステップを1視点・1ステップとして pre-populate
  const handleEdit = (task) => {
    setForm({
      ...emptyForm,
      projectName: task.projectName,
      projectNameInternal: task.projectNameInternal || '',
      companyName: task.companyName || '',
      customerContact: task.customerContact || '',
      assignee: task.assignee,
      priority: String(task.priority),
      memo: task.memo || '',
      tentative: !!task.tentative,
      tentativeStart: task.tentativeStart || '',
      tentativeEnd: task.tentativeEnd || '',
      projectDeadline: task.projectDeadline || '',
      projectRequestDate: task.projectRequestDate || '',
      viewpoints: [{
        viewpointName: task.viewpointName || '',
        assignee: task.assignee || '',
        manualStart: task.manualStart || '',
        // 終了時間指定が無くても、完了済みなら実終了時刻（actualEnd）を終了時間に反映する
        manualEnd: task.manualEnd || task.actualEnd || '',
        deadline: task.deadline || '',
        steps: [{
          taskId: task.id,
          name: task.stepName || task.viewpointName || '',
          assignee: task.assignee || '',
          hours: fmtHM(task.hours),
          completedHours: fmtHM(task.completedHours || 0),
        }],
      }],
    });
    setEditingId(null);
    setEditMode({ type: 'step', taskId: task.id, projectName: task.projectName, viewpointName: task.viewpointName, assignee: task.assignee });
    editReturnProject.current = task.projectName; // 編集後に元の位置へ戻す
    setView('input');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 案件を編集：新規登録フォームに案件全体（全視点・全ステップ、完了済み含む）を pre-populate
  const handleEditProject = (projectName) => {
    const projectTasks = tasksRef.current.filter(t => t.projectName === projectName);
    if (projectTasks.length === 0) { notify('この案件には編集できるタスクがありません', { type: 'error' }); return; }
    // 視点ごとにグループ化（出現順）→ 各視点内は stepOrder 順
    const vpMap = new Map();
    for (const t of projectTasks) {
      // 視点名のみでグループ化（ステップごとに担当者が異なってもまとめて編集できる）
      const k = t.viewpointName;
      if (!vpMap.has(k)) vpMap.set(k, { viewpointName: t.viewpointName, steps: [] });
      vpMap.get(k).steps.push(t);
    }
    const viewpoints = Array.from(vpMap.values()).map(v => {
      const sortedSteps = v.steps.slice().sort((a, b) => (a.stepOrder ?? 0) - (b.stepOrder ?? 0));
      const firstActive = sortedSteps.find(t => t.status !== 'done');
      const lastActive = [...sortedSteps].reverse().find(t => t.status !== 'done');
      // 視点の既定担当者：全ステップが同じならその担当者、混在なら空（ステップごとの値を使う）
      const vpAssignees = [...new Set(sortedSteps.map(t => t.assignee).filter(Boolean))];
      return {
        viewpointName: v.viewpointName,
        viewpointNameExternal: (sortedSteps.find(t => t.viewpointNameExternal) || {}).viewpointNameExternal || '',
        viewpointCategory: (sortedSteps.find(t => t.viewpointCategory) || {}).viewpointCategory || '',
        assignee: vpAssignees.length === 1 ? vpAssignees[0] : '',
        // 視点ごとの開始時間：最初の未完了ステップの指定を表示（無ければ先頭ステップ）
        manualStart: (firstActive || sortedSteps[0])?.manualStart || '',
        // 視点ごとの終了時間：終了時間指定を優先。指定が無く、かつ全ステップ完了済みなら
        // 実終了時刻（actualEnd）の最遅を反映する（未完了ステップが残る視点は実績で埋めない）
        manualEnd: lastActive
          ? (lastActive.manualEnd || '')
          : ((sortedSteps[sortedSteps.length - 1])?.manualEnd || latestActualEnd(sortedSteps) || ''),
        // 視点ごとの納期：この視点のタスクから（最初に見つかったもの）
        deadline: (sortedSteps.find(t => t.deadline) || {}).deadline || '',
        // 納品名（上書き）を復元
        deliveryName: (sortedSteps.find(t => t.deliveryNameOverride) || {}).deliveryNameOverride || '',
        steps: sortedSteps.map(t => ({
          taskId: t.id,
          name: t.stepName || '',
          stepTypeId: t.stepTypeId || (findStepType(stepTypeMaster, { name: t.stepName }) || {}).id || '',
          assignee: t.assignee || '',
          hours: fmtHM(t.hours),
          completedHours: fmtHM(t.completedHours || 0),
          amount: t.stepAmount ?? '',
          requestDate: t.stepRequestDate || '',
          completedDate: t.stepCompletedDate || '',
          deliveryName: t.stepDeliveryNameOverride || '',
          roundType: t.stepRoundType || '',
          outInHouse: t.stepOutInHouse || '',
          outExternal: t.stepOutExternal || '',
          outVND: t.stepOutVND ?? '',
        })),
      };
    });
    const first = projectTasks[0];
    // 優先順位は進行中案件から採用（完了済みの古い順位は使わない）
    const priorityPool = projectTasks.filter(t => t.status !== 'done');
    setForm({
      ...emptyForm,
      projectName: first.projectName,
      projectNameInternal: first.projectNameInternal || '',
      companyName: first.companyName || '',
      customerContact: first.customerContact || '',
      assignee: first.assignee,
      priority: priorityPool.length > 0 ? String(Math.min(...priorityPool.map(t => t.priority))) : '',
      memo: (projectTasks.find(t => t.memo) || {}).memo || '',
      tentative: projectTasks.some(t => t.tentative),
      tentativeStart: (projectTasks.find(t => t.tentativeStart) || {}).tentativeStart || '',
      tentativeEnd: (projectTasks.find(t => t.tentativeEnd) || {}).tentativeEnd || '',
      projectDeadline: (projectTasks.find(t => t.projectDeadline) || {}).projectDeadline || '',
      projectRequestDate: (projectTasks.find(t => t.projectRequestDate) || {}).projectRequestDate || '',
      viewpoints,
    });
    setEditingId(null);
    setEditMode({ type: 'project', projectName: first.projectName });
    editReturnProject.current = first.projectName; // 編集後に元の位置へ戻す
    setView('input');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 視点を削除（ぶら下がる全ステップ＝アクティブ＋完了済みを一括削除）
  const handleDeleteViewpoint = async (group) => {
    if (!group) return;
    const targets = tasksRef.current.filter(t =>
      t.projectName === group.projectName &&
      t.viewpointName === group.viewpointName &&
      t.assignee === group.assignee
    );
    if (targets.length === 0) return;
    const activeCount = targets.filter(t => t.status !== 'done').length;
    const doneCount = targets.length - activeCount;
    const detail = doneCount > 0
      ? `${targets.length}件（アクティブ ${activeCount}件・完了済み ${doneCount}件）`
      : `${activeCount}件`;
    const msg = `視点「${group.projectName} ／ ${group.viewpointName}」を削除しますか？\n` +
      `ぶら下がっているステップ ${detail} も一緒に削除されます。\n` +
      `（削除直後ならトーストの「元に戻す」で復元できます）`;
    if (!(await confirmDialog({ title: '視点の削除', message: msg, confirmLabel: '削除する' }))) return;

    // シート由来タスクの削除を deletedExternalIds に記録（次回同期で復活させない）
    try {
      const eids = targets.filter(t => t.externalId).map(t => t.externalId);
      if (eids.length > 0) {
        const current = await storage.get('deletedExternalIds');
        const list = (current && current.value) ? JSON.parse(current.value) : [];
        let changed = false;
        for (const eid of eids) {
          if (!list.includes(eid)) { list.push(eid); changed = true; }
        }
        if (changed) await storage.set('deletedExternalIds', JSON.stringify(list));
      }
    } catch (e) { console.warn('削除済みリストの更新に失敗:', e); }

    const deletedIds = targets.map(t => t.id);
    const deletedSet = new Set(deletedIds);
    const deletedDocs = targets.map(t => ({ ...t }));
    const merged = tasksRef.current.filter(t => !deletedSet.has(t.id));
    const normalized = normalizePriorities(merged);
    setTasks(normalized);
    tasksRef.current = normalized;
    try { await tasksStore.batch([], deletedIds); }
    catch (e) { console.error('視点削除エラー:', e); notify('削除に失敗しました：' + (e?.message || e), { type: 'error' }); return; }
    notify(`視点「${group.viewpointName}」を削除しました（${deletedDocs.length}件）`, { undo: () => restoreTasks(deletedDocs) });
  };

  // 案件に新しい視点を追加（新規登録フォームを案件名・コード入りで開く）
  const handleAddViewpointToProject = (projectName, projectNameInternal) => {
    // 同じ案件の既存タスクから会社名・お客様担当者を引き継ぐ
    const sibling = tasksRef.current.find(t => t.projectName === projectName);
    // 視点追加で案件の並び順が動かないよう、既存案件の優先順位（進行中の最小）を引き継ぐ
    const activeSiblings = tasksRef.current.filter(t => t.projectName === projectName && t.status !== 'done');
    setForm({
      ...emptyForm,
      projectName: projectName || '',
      projectNameInternal: projectNameInternal || '',
      companyName: sibling?.companyName || '',
      customerContact: sibling?.customerContact || '',
      priority: activeSiblings.length ? String(Math.min(...activeSiblings.map(t => t.priority))) : '',
      memo: sibling?.memo || '',
      tentative: !!sibling?.tentative,
      tentativeStart: sibling?.tentativeStart || '',
      tentativeEnd: sibling?.tentativeEnd || '',
      projectDeadline: sibling?.projectDeadline || '',
      projectRequestDate: sibling?.projectRequestDate || '',
      viewpoints: [makeEmptyViewpoint()],
    });
    setEditingId(null);
    setEditMode(null);
    setView('input');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 視点まるごとを編集（同じ案件・視点名・担当者のアクティブタスクをフォームに展開）
  const handleEditViewpoint = (group) => {
    const tasksOfVp = tasksRef.current.filter(t =>
      t.projectName === group.projectName &&
      t.viewpointName === group.viewpointName &&
      t.assignee === group.assignee &&
      t.status !== 'done'
    ).slice().sort((a, b) => (a.stepOrder ?? 0) - (b.stepOrder ?? 0));
    if (tasksOfVp.length === 0) { notify('この視点には編集できるタスクがありません', { type: 'error' }); return; }
    const first = tasksOfVp[0];
    const last = tasksOfVp[tasksOfVp.length - 1];
    const viewpoints = [{
      viewpointName: group.viewpointName,
      viewpointNameExternal: group.viewpointNameExternal || (tasksOfVp.find(t => t.viewpointNameExternal) || {}).viewpointNameExternal || '',
      viewpointCategory: group.viewpointCategory || (tasksOfVp.find(t => t.viewpointCategory) || {}).viewpointCategory || '',
      assignee: group.assignee,
      manualStart: first.manualStart || '',
      manualEnd: last.manualEnd || '',
      deadline: (tasksOfVp.find(t => t.deadline) || {}).deadline || '',
      deliveryName: group.deliveryNameOverride || '',
      steps: tasksOfVp.map(t => ({
        taskId: t.id,
        name: t.stepName || '',
        stepTypeId: t.stepTypeId || (findStepType(stepTypeMaster, { name: t.stepName }) || {}).id || '',
        assignee: t.assignee || '',
        hours: fmtHM(t.hours),
        completedHours: fmtHM(t.completedHours || 0),
        amount: t.stepAmount ?? '',
        requestDate: t.stepRequestDate || '',
        completedDate: t.stepCompletedDate || '',
        deliveryName: t.stepDeliveryNameOverride || '',
        roundType: t.stepRoundType || '',
        outInHouse: t.stepOutInHouse || '',
        outExternal: t.stepOutExternal || '',
        outVND: t.stepOutVND ?? '',
      })),
    }];
    setForm({
      ...emptyForm,
      projectName: group.projectName,
      projectNameInternal: group.projectNameInternal || '',
      companyName: group.companyName || first.companyName || '',
      customerContact: group.customerContact || first.customerContact || '',
      assignee: group.assignee,
      priority: String(group.minPriority || first.priority),
      projectDeadline: group.projectDeadline || first.projectDeadline || '',
      projectRequestDate: first.projectRequestDate || '',
      viewpoints,
    });
    setEditingId(null);
    setEditMode({ type: 'viewpoint', projectName: group.projectName, viewpointName: group.viewpointName, assignee: group.assignee });
    editReturnProject.current = group.projectName; // 編集後に元の位置へ戻す
    setView('input');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddStepToViewpoint = (group) => {
    // この視点に新しいステップを1行だけ追加できる状態でフォームを開く
    setForm({
      ...emptyForm,
      projectName: group.projectName,
      projectNameInternal: group.projectNameInternal || '',
      companyName: group.companyName || '',
      customerContact: group.customerContact || '',
      assignee: group.assignee,
      priority: String(group.minPriority),
      projectDeadline: group.projectDeadline || '',
      projectRequestDate: (group.tasks?.find(t => t.projectRequestDate) || {}).projectRequestDate || '',
      // 追加ステップはこの視点の個別納期を引き継ぐ（開始・終了の指定は既存ステップ側を維持）
      viewpoints: [{ viewpointName: group.viewpointName, viewpointNameExternal: group.viewpointNameExternal || '', viewpointCategory: group.viewpointCategory || '', assignee: group.assignee, manualStart: '', manualEnd: '', deadline: group.individualDeadline || '', deliveryName: group.deliveryNameOverride || '', steps: [makeEmptyStep()] }],
    });
    setEditingId(null);
    setEditMode(null);
    setView('input');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 担当者の振り分け（視点内の全ステップを一括変更）
  const reassignViewpoint = (group, newAssignee) => {
    const na = (newAssignee || '').trim();
    if (!na) return;
    const ids = new Set(group.tasks.map(t => t.id));
    saveTasks(prev => normalizePriorities(prev.map(t => ids.has(t.id) ? { ...t, assignee: na } : t)));
  };

  // 個別納期の変更（視点内の全ステップに一括反映）。空なら個別を解除（＝全体納期に従う）
  const setViewpointDeadline = (group, value) => {
    const dl = (value || '').trim();
    const ids = new Set(group.tasks.map(t => t.id));
    saveTasks(prev => prev.map(t => ids.has(t.id) ? { ...t, deadline: dl || null } : t));
  };

  // 視点メタ（制作履歴・納品名上書き・納品集計フラグ・外注など）の更新。
  // 視点内の全ステップ（タスク）に複製保存する（deadline と同じ流儀）。
  const setViewpointMeta = (group, patch) => {
    const ids = new Set(group.tasks.map(t => t.id));
    const clean = { ...patch };
    if ('prodHistory' in clean) clean.prodHistory = normalizeHistory(clean.prodHistory);
    saveTasks(prev => prev.map(t => ids.has(t.id) ? { ...t, ...clean } : t));
  };

  // 1ステップ（タスク）単位の請求情報更新（種類・依頼日・金額・外注・納品名など）。
  // 請求はステップが唯一の元データ。カードの「制作・納品」パネルから個別に編集する。
  const setStepMeta = (task, patch) => {
    saveTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...patch } : t));
  };

  // 複数タスク（=案件整理の1行＝1視点に属する全ステップ）へ同じ値を一括反映する。
  // 案件整理タブの 清算月・ご依頼日・納品日 のインライン編集で使う（1回の保存にまとめる）。
  const patchTasksByIds = (ids, patch) => {
    const idSet = new Set(ids || []);
    if (idSet.size === 0) return;
    saveTasks(prev => prev.map(t => idSet.has(t.id) ? { ...t, ...patch } : t));
  };

  // 案件整理タブからの新規案件追加。
  // 案件登録フォーム（InputView）を通さず、この表の1行（=1カット/視点）に相当する
  // タスクを1件だけ作成する軽量な登録。制作時間は既定 1:00（省略時）でスケジュール可能な
  // 有効タスクにする。清算月・ご依頼日（依頼日）・納品日（個別納期）もそのまま保存する。
  // 戻り値：作成したら true、バリデーションエラーなら false。
  const addProjectFromSheet = (info) => {
    const projectName = (info.projectName || '').trim();
    const viewpointName = (info.viewpointName || '').trim();
    if (!projectName) { notify('案件名を入力してください', { type: 'error' }); return false; }
    if (!viewpointName) { notify('カット名（視点名）を入力してください', { type: 'error' }); return false; }
    const hours = parseHM(String(info.hours ?? '').trim() || '1:00');
    if (isNaN(hours) || hours <= 0) { notify('制作時間を正しく入力してください（例: 1:30 または 1.5）', { type: 'error' }); return false; }
    const companyName = (info.companyName || '').trim();
    const assignee = (info.assignee || '').trim();
    const requestDate = (info.requestDate || '').trim();
    const deadline = (info.deliveryDate || '').trim();
    const settlementMonth = (info.settlementMonth || '').trim();
    const baseTime = Date.now();
    const regDate = fmtYMD(new Date(baseTime));
    const activeSameCompany = tasksRef.current.filter(t => t.status !== 'done' && (t.companyName || '') === companyName);
    const priority = deadlineInsertPriority(activeSameCompany, deadlineKey(deadline));
    const record = {
      id: `task-${baseTime}-0-${Math.random().toString(36).slice(2, 7)}`,
      projectName,
      projectNameInternal: (info.projectNameInternal || '').trim(),
      companyName,
      customerContact: (info.customerContact || '').trim(),
      viewpointName, viewpointNameExternal: '', viewpointCategory: '',
      stepName: '制作', stepOrder: 0,
      assignee,
      priority, hours, completedHours: 0,
      memo: '', tentative: false, tentativeStart: null, tentativeEnd: null,
      deadline: deadline || null,
      projectDeadline: null,
      projectRequestDate: requestDate || null,
      manualStart: null, manualEnd: null,
      status: 'pending', completedAt: null, createdAt: baseTime,
      registeredDate: regDate,
      stepTypeId: '', stepDeliverySuffix: '',
      stepAmount: '',
      stepRequestDate: requestDate || regDate,
      stepCompletedDate: '', stepDeliveryNameOverride: '',
      stepRoundType: '', stepOutInHouse: '', stepOutExternal: '', stepOutVND: '',
      settlementMonth: settlementMonth || '',
    };
    saveTasks(prev => normalizePriorities([...prev, record]));
    notify('新規案件を追加しました', { type: 'success' });
    return true;
  };

  // 見積書／発注書を視点のステップ（請求の元データ）から自動作成して帳票へ保存し、帳票ビューへ遷移する。
  const createBillingFromViewpoint = async (group, docType) => {
    try {
      const docs = Object.values(await billingStore.listAll());
      // 発行元（自社）情報・振込先の設定を反映
      let issuer = null;
      try {
        const raw = await storage.get('billingIssuer');
        if (raw && raw.value) issuer = JSON.parse(raw.value);
      } catch (e) {}
      const doc = blankDoc(docType, docs, new Date(), issuer);
      // 宛先（御中）：見積はお客様、発注は発注先（既定リーベグのまま）。お客様情報を反映。
      const cm = (customerMaster || []).find(c => (c.company || '').trim() === (group.companyName || '').trim());
      if (docType === 'estimate') {
        doc.to = { ...doc.to, company: group.companyName || '', zip: cm?.zip || '', address: cm?.address || '', tel: cm?.tel || '', rep: group.customerContact || '' };
      }
      doc.subject = `${group.projectName || ''}${group.viewpointName ? ' ' + group.viewpointName : ''}`.trim();
      // 制作金額のあるステップを明細化（無ければ空明細1行）。
      const base = group.deliveryBaseName || deliveryBaseName(group.projectName, group.viewpointNameExternal || group.viewpointName, group.deliveryNameOverride);
      const moneySteps = (group.tasks || []).filter(t => vpNum(t.stepAmount) > 0);
      const items = moneySteps.map(t => {
        const it = blankItem(docType);
        const rtId = (t.stepRoundType || '').trim() || 'initial';
        const name = (t.stepDeliveryNameOverride || '').trim() || stepDeliveryName(base, t.stepDeliverySuffix || t.stepName);
        it.name = `${name}（${roundTypeOf(rtId).label}）`;
        it.qty = '1';
        it.unit = String(vpNum(t.stepAmount));
        return it;
      });
      while (items.length < 3) items.push(blankItem(docType));
      doc.items = items;
      await billingStore.set(doc.id, doc);
      setView('billing');
    } catch (e) {
      console.error('帳票の自動作成に失敗:', e);
      notify('帳票の作成に失敗しました', { type: 'error' });
    }
  };

  // 全体納期（案件共通）の変更。その案件の全タスク（完了済み含む）に一括反映する。
  // 空なら全体納期なし（各視点は個別納期があればそれを使い、無ければ納期なし）
  const setProjectDeadline = (projectName, value) => {
    const dl = (value || '').trim();
    saveTasks(prev => prev.map(t => t.projectName === projectName ? { ...t, projectDeadline: dl || null } : t));
  };

  // 進行中案件の案件ヘッダーからインラインで案件情報を編集する。
  // 対象案件の全タスク（完了済み含む）に反映し、案件が分割されないようにする。
  // 戻り値：保存したら true、バリデーションエラーなら false（呼び出し側でパネルを閉じる判定に使う）
  const saveProjectInfo = (oldProjectName, info) => {
    const newName = (info.projectName || '').trim();
    if (!newName) { notify('社外案件名を入力してください', { type: 'error' }); return false; }
    saveTasks(prev => normalizePriorities(prev.map(t =>
      t.projectName === oldProjectName
        ? {
          ...t,
          projectName: newName,
          projectNameInternal: (info.projectNameInternal || '').trim(),
          companyName: (info.companyName || '').trim(),
          customerContact: (info.customerContact || '').trim(),
          memo: (info.memo || '').trim(),
          tentative: !!info.tentative,
          tentativeStart: info.tentative ? (info.tentativeStart || null) : null,
          tentativeEnd: info.tentative ? (info.tentativeEnd || null) : null,
        }
        : t
    )));
    return true;
  };

  const handleDelete = async (id) => {
    const task = tasksRef.current.find(t => t.id === id);
    const deletedDoc = task ? { ...task } : null;
    // シート由来タスクは削除済みリストに記録 → 次回同期で復活させない
    if (task && task.externalId) {
      try {
        const current = await storage.get('deletedExternalIds');
        const list = (current && current.value) ? JSON.parse(current.value) : [];
        if (!list.includes(task.externalId)) {
          list.push(task.externalId);
          await storage.set('deletedExternalIds', JSON.stringify(list));
        }
      } catch (e) {
        console.warn('削除済みリストの更新に失敗:', e);
      }
    }
    await removeTask(id);
    if (deletedDoc) {
      const label = deletedDoc.stepName || deletedDoc.viewpointName || 'タスク';
      notify(`ステップ「${label}」を削除しました`, { undo: () => restoreTasks([deletedDoc]) });
    }
  };

  const toggleStatus = (id) => {
    saveTasks(prev => normalizePriorities(prev.map(t => {
      if (t.id !== id) return t;
      if (t.status === 'done') return { ...t, status: 'pending', completedAt: null, cancelled: null };
      return { ...t, status: 'done', completedHours: t.hours, completedAt: Date.now(), cancelled: null };
    })));
  };

  const addProgress = (id, delta) => {
    saveTasks(prev => normalizePriorities(prev.map(t => {
      if (t.id !== id) return t;
      const newCompleted = Math.min(t.hours, Math.max(0, (t.completedHours || 0) + delta));
      const autoComplete = t.hours > 0 && newCompleted >= t.hours;
      return {
        ...t, completedHours: newCompleted,
        status: autoComplete ? 'done' : 'pending',
        completedAt: autoComplete ? Date.now() : null,
      };
    })));
  };

  const setTaskHours = (id, hours) => {
    if (isNaN(hours) || hours < 0) return;
    saveTasks(prev => normalizePriorities(prev.map(t => {
      if (t.id !== id) return t;
      const cappedCompleted = Math.min(hours, t.completedHours || 0);
      const autoDone = hours > 0 && cappedCompleted >= hours;
      return {
        ...t, hours,
        completedHours: cappedCompleted,
        status: autoDone ? 'done' : (t.status === 'done' ? 'pending' : t.status),
        completedAt: autoDone ? (t.completedAt || Date.now()) : null,
      };
    })));
  };
  // 予定終了時刻（スケジュール上の最遅の終了）を datetime-local 文字列で返す
  const plannedEndDtLocal = (tasksOfTarget) => {
    let best = null;
    for (const t of tasksOfTarget) {
      if (!t.scheduledEnd) continue;
      const ts = t.scheduledEnd.getTime() + (t.scheduledEndMin || 0) * 60000;
      if (best == null || ts > best) best = ts;
    }
    return dateToDtLocal(best == null ? new Date() : new Date(best));
  };

  // 「視点完了」：終了時間を入力する完了ダイアログを開く
  const completeViewpoint = (group) => {
    if (!group || !group.tasks) return;
    const activeTasks = group.tasks.filter(t => t.status !== 'done');
    if (activeTasks.length === 0) { notify('この視点には未完了のタスクがありません', { type: 'error' }); return; }
    setCompleteTarget({
      kind: 'viewpoint',
      label: `視点「${group.projectName} ／ ${group.viewpointName}」`,
      ids: activeTasks.map(t => t.id),
      defaultEnd: plannedEndDtLocal(activeTasks),
    });
  };

  // 「案件完了」：終了時間を入力する完了ダイアログを開く
  const completeProject = (projectName) => {
    if (!projectName) return;
    const activeTasks = scheduled.active.filter(t => t.projectName === projectName);
    if (activeTasks.length === 0) { notify('この案件には未完了のタスクがありません', { type: 'error' }); return; }
    setCompleteTarget({
      kind: 'project',
      label: `案件「${projectName}」`,
      ids: activeTasks.map(t => t.id),
      defaultEnd: plannedEndDtLocal(activeTasks),
    });
  };

  // 完了ダイアログで「完了する」：選択タスクを完了にし、終了時間（実績）を記録
  const confirmComplete = (actualEndStr) => {
    if (!completeTarget) return;
    const idSet = new Set(completeTarget.ids);
    const ae = actualEndStr || null;
    const completedAtMs = ae ? new Date(ae).getTime() : Date.now();
    const nowMs = Date.now();
    // 完了した視点／案件は、いったん「確認待ち」へ入れる（完了タブには行かない）
    saveTasks(prev => normalizePriorities(prev.map(t =>
      idSet.has(t.id)
        ? { ...t, status: 'done', cancelled: null, completedHours: t.hours, completedAt: completedAtMs, actualEnd: ae,
            reviewState: 'waiting', reviewAt: nowMs, reviewUpdatedAt: nowMs, reviewNote: '' }
        : t
    )));
    setCompleteTarget(null);
    setView('input');
  };

  // 「案件中止」：未完了タスクを「中止」として完了タブへ移動する。
  // 実績（completedHours）はそのまま残し、actualEnd は記録しない（後続スケジュールに影響させない）
  const cancelProject = async (projectName) => {
    if (!projectName) return;
    const activeTasks = scheduled.active.filter(t => t.projectName === projectName);
    if (activeTasks.length === 0) { notify('この案件には未完了のタスクがありません', { type: 'error' }); return; }
    if (!(await confirmDialog({ title: '案件の中止', message: `案件「${projectName}」を中止にしますか？\n未完了のタスク ${activeTasks.length}件が「中止」として完了タブへ移動します。\n（完了タブの「戻す」で復元できます）`, confirmLabel: '中止にする' }))) return;
    const idSet = new Set(activeTasks.map(t => t.id));
    const nowMs = Date.now();
    saveTasks(prev => normalizePriorities(prev.map(t =>
      idSet.has(t.id)
        ? { ...t, status: 'done', cancelled: true, completedAt: nowMs, actualEnd: null }
        : t
    )));
    setView('done');
  };

  // 「制作中断」：お客様へ納品後の確認待ちなどで進行できない案件を、一旦スケジュールから外す。
  // 未完了タスクに suspended フラグを立てるだけ（完了にはしない・実績はそのまま）。
  // 「制作中断」一覧へ移り、制作再開でいつでも進行中（スケジュール）へ戻せる。
  const suspendProject = async (projectName) => {
    if (!projectName) return;
    const activeTasks = scheduled.active.filter(t => t.projectName === projectName);
    if (activeTasks.length === 0) { notify('この案件には未完了のタスクがありません', { type: 'error' }); return; }
    if (!(await confirmDialog({ title: '制作中断', message: `案件「${projectName}」を制作中断にしますか？\nスケジュールから一旦外れ、「制作中断」一覧へ移動します。\n（制作再開でいつでも進行中へ戻せます）`, confirmLabel: '中断する' }))) return;
    const idSet = new Set(activeTasks.map(t => t.id));
    const nowMs = Date.now();
    saveTasks(prev => prev.map(t =>
      idSet.has(t.id) ? { ...t, suspended: true, suspendedAt: nowMs } : t
    ));
  };

  // 「制作再開」：制作中断を解除し、進行中（スケジュール）へ戻す。
  const resumeProject = (projectName) => {
    if (!projectName) return;
    const idSet = new Set(scheduled.suspended.filter(t => t.projectName === projectName).map(t => t.id));
    if (idSet.size === 0) return;
    saveTasks(prev => normalizePriorities(prev.map(t =>
      idSet.has(t.id) ? { ...t, suspended: null, suspendedAt: null } : t
    )));
  };

  // ===== 確認待ち（視点完了後の確認フェーズ）の操作（視点単位） =====
  // 確認待ちの視点グループ（案件・視点・担当者）に属するタスクか
  const reviewMatch = (t, g) =>
    t.reviewState === 'waiting' && t.projectName === g.projectName && t.viewpointName === g.viewpointName && t.assignee === g.assignee;
  // 「完了」：確認を終え、完了タブへ移す
  const finalizeReview = (g) => {
    saveTasks(prev => prev.map(t => reviewMatch(t, g) ? { ...t, reviewState: null } : t));
  };
  // 「進行中に戻す」：確認待ちから進行中へ差し戻す
  const reopenReview = async (g) => {
    if (!(await confirmDialog({ message: `「${g.projectName} ／ ${g.viewpointName}」を進行中に戻しますか？`, confirmLabel: '進行中に戻す' }))) return;
    saveTasks(prev => normalizePriorities(prev.map(t => reviewMatch(t, g)
      ? { ...t, status: 'pending', reviewState: null, reviewAt: null, reviewUpdatedAt: null, completedAt: null, actualEnd: null }
      : t)));
  };
  // 追加修正メモの記入。最終更新時刻も更新する（3日グレー・7日自動完了の基準をリセット）
  const setReviewNote = (g, note) => {
    saveTasks(prev => prev.map(t => reviewMatch(t, g) ? { ...t, reviewNote: note, reviewUpdatedAt: Date.now() } : t));
  };
  // 確認待ちの「完了時刻」を後から修正。actualEnd を更新すると、その時刻を起点に
  // （doneFloor 経由で）担当者の残りタスクが組み直る。早く終われば前倒しされる。
  const setReviewActualEnd = (g, value) => {
    const ae = value || null;
    const nowMs = Date.now();
    saveTasks(prev => prev.map(t => reviewMatch(t, g)
      ? { ...t, actualEnd: ae, completedAt: ae ? new Date(ae).getTime() : t.completedAt, reviewUpdatedAt: nowMs }
      : t));
  };

  // ステップ単位の開始時間指定（自動スケジュールより優先）を登録・解除
  const setTaskManualStart = (id, value) => {
    saveTasks(prev => prev.map(t => t.id === id ? { ...t, manualStart: value || null } : t));
  };

  // ステップ単位の終了予定の指定を登録・解除。指定すると同担当者の後続タスクはこの時刻以降に開始
  const setTaskManualEnd = (id, value) => {
    saveTasks(prev => prev.map(t => t.id === id ? { ...t, manualEnd: value || null } : t));
  };

  // ステップ単位の担当者変更（その1ステップだけ別の担当者へ振り分ける）。
  // 視点内の他ステップと担当者が分かれた場合は、担当者ごとに別の視点カードへ分割表示される。
  const setTaskAssignee = (id, newAssignee) => {
    const na = (newAssignee || '').trim();
    if (!na) return;
    saveTasks(prev => normalizePriorities(prev.map(t => t.id === id ? { ...t, assignee: na } : t)));
  };

  // 完了タブで終了時間（実績）を後から編集
  const setActualEnd = (id, value) => {
    const ae = value || null;
    saveTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const completedAt = ae ? new Date(ae).getTime() : t.completedAt;
      return { ...t, actualEnd: ae, completedAt };
    }));
  };

  // ===== 終了予定超過ポップアップ（機能B・視点単位） =====
  // vp は { projectName, viewpointName, assignee } を持つオブジェクト
  // ① 視点完了（終了時間つき）
  const endPromptComplete = (vp, actualEndStr) => {
    const ae = actualEndStr || null;
    const completedAtMs = ae ? new Date(ae).getTime() : Date.now();
    const nowMs = Date.now();
    saveTasks(prev => normalizePriorities(prev.map(t =>
      (t.projectName === vp.projectName && t.viewpointName === vp.viewpointName && t.assignee === vp.assignee && t.status !== 'done')
        ? { ...t, status: 'done', cancelled: null, completedHours: t.hours, completedAt: completedAtMs, actualEnd: ae,
            reviewState: 'waiting', reviewAt: nowMs, reviewUpdatedAt: nowMs, reviewNote: '' }
        : t
    )));
    setView('input');
  };
  // ② 追加修正（この視点の最後尾にステップを追加）
  const endPromptAddRevision = (vp, stepName, hours) => {
    const projectName = vp.projectName, viewpointName = vp.viewpointName;
    const h = Math.max(0, parseHM(hours) || 0);
    if (h <= 0) { notify('追加時間を入力してください', { type: 'error' }); return; }
    const vpTasks = tasksRef.current.filter(t => t.projectName === projectName && t.viewpointName === viewpointName && t.assignee === vp.assignee);
    if (vpTasks.length === 0) { notify('対象の視点が見つかりません', { type: 'error' }); return; }
    const ref = vpTasks.reduce((a, b) => ((b.createdAt || 0) > (a.createdAt || 0) ? b : a), vpTasks[0]);
    const maxOrder = vpTasks.reduce((m, t) => Math.max(m, t.stepOrder ?? 0), 0);
    const base = Date.now();
    const rec = {
      id: `task-${base}-${Math.random().toString(36).slice(2, 7)}`,
      projectName,
      projectNameInternal: ref.projectNameInternal || '',
      companyName: ref.companyName || '',
      customerContact: ref.customerContact || '',
      viewpointName,
      stepName: (stepName || '追加修正').trim() || '追加修正',
      stepOrder: maxOrder + 1,
      assignee: ref.assignee,
      priority: ref.priority,
      hours: h, completedHours: 0,
      manualStart: null, status: 'pending', completedAt: null, createdAt: base,
      registeredDate: fmtYMD(new Date(base)),
    };
    saveTasks(prev => normalizePriorities([...prev, rec]));
  };
  // ③ 遅延（この視点の最後のステップの終了時間指定を新しい終了予定へ動かし、
  //    差分の稼働時間ぶん制作時間を加算＋遅延履歴を記録）
  const endPromptDelay = (vp, currentEndTs, newEndTs) => {
    if (newEndTs <= currentEndTs) { notify('新しい終了予定は現在の終了予定より後にしてください', { type: 'error' }); return; }
    const scheduledById = new Map(scheduled.active.map(t => [t.id, t]));
    const active = tasksRef.current
      .map(t => scheduledById.get(t.id) || t)
      .filter(t => t.projectName === vp.projectName && t.viewpointName === vp.viewpointName && t.assignee === vp.assignee && t.status !== 'done' && t.scheduledEnd);
    if (active.length === 0) { notify('対象の進行中案件がありません', { type: 'error' }); return; }
    // 終了予定を決めている最後のステップ
    const last = active.reduce((a, b) => {
      const ta = startOfDay(a.scheduledEnd).getTime() + (a.scheduledEndMin || 0) * 60000;
      const tb = startOfDay(b.scheduledEnd).getTime() + (b.scheduledEndMin || 0) * 60000;
      return tb > ta ? b : a;
    });
    // 差分の稼働時間。新しい終了予定が稼働時間外（残業なしの夜間など）の場合は0でもよく、
    // その場合は終了時間の指定だけを動かす
    const addH = workingHoursBetweenTs(currentEndTs, newEndTs, last.assignee, settings);
    const newEndStr = dateToDtLocal(new Date(newEndTs));
    const delay = { at: Date.now(), from: currentEndTs, to: newEndTs };
    saveTasks(prev => normalizePriorities(prev.map(t =>
      t.id === last.id
        ? {
          ...t,
          hours: addH > 0 ? Math.round((t.hours + addH) * 10) / 10 : t.hours,
          // 終了時間の指定を新しい終了予定へ更新する。
          // 古い指定が残っていると終了予定がその時刻に固定され、ポップアップが直後に再表示されてしまう
          manualEnd: newEndStr,
          delays: [...(t.delays || []), delay],
        }
        : t
    )));
  };
  // ④ 終了予定時間の修正（遅延とは別：作業時間を加算せず・遅延履歴も残さず、
  //    終了予定の指定（manualEnd）だけを新しい時刻に直す。前倒し＝早め／遅め どちらも可）
  const endPromptAdjustEnd = (vp, newEndTs) => {
    if (!newEndTs) { notify('新しい終了予定時間を入力してください', { type: 'error' }); return; }
    const scheduledById = new Map(scheduled.active.map(t => [t.id, t]));
    const active = tasksRef.current
      .map(t => scheduledById.get(t.id) || t)
      .filter(t => t.projectName === vp.projectName && t.viewpointName === vp.viewpointName && t.assignee === vp.assignee && t.status !== 'done' && t.scheduledEnd);
    if (active.length === 0) { notify('対象の進行中案件がありません', { type: 'error' }); return; }
    // 終了予定を決めている最後のステップ
    const last = active.reduce((a, b) => {
      const ta = startOfDay(a.scheduledEnd).getTime() + (a.scheduledEndMin || 0) * 60000;
      const tb = startOfDay(b.scheduledEnd).getTime() + (b.scheduledEndMin || 0) * 60000;
      return tb > ta ? b : a;
    });
    const newEndStr = dateToDtLocal(new Date(newEndTs));
    saveTasks(prev => normalizePriorities(prev.map(t =>
      t.id === last.id ? { ...t, manualEnd: newEndStr } : t
    )));
  };
  // ⑤ 確認中（30分後に通知）＝30分スヌーズ。key は視点キー
  const endPromptSnooze = (key, endTs) => {
    setEndPromptFor(key, { snoozedUntil: Date.now() + 30 * 60000, lastPromptedEnd: endTs });
  };

  const setTaskCompletedHours = (id, completed) => {
    if (isNaN(completed) || completed < 0) return;
    saveTasks(prev => normalizePriorities(prev.map(t => {
      if (t.id !== id) return t;
      const capped = Math.min(t.hours, completed);
      const autoDone = t.hours > 0 && capped >= t.hours;
      return {
        ...t, completedHours: capped,
        status: autoDone ? 'done' : (t.status === 'done' ? 'pending' : t.status),
        completedAt: autoDone ? (t.completedAt || Date.now()) : null,
      };
    })));
  };

  const moveUp = (id) => {
    saveTasks(prev => {
      const target = prev.find(t => t.id === id);
      if (!target) return prev;
      const company = target.companyName || '';
      // 並べ替えは「同じ会社の中だけ」で行う
      const sorted = prev.filter(t => t.status !== 'done' && (t.companyName || '') === company)
        .sort((a, b) => (a.priority - b.priority) || (a.createdAt - b.createdAt));
      const idx = sorted.findIndex(t => t.id === id);
      if (idx <= 0) return prev;
      const a = sorted[idx], b = sorted[idx - 1];
      return normalizePriorities(prev.map(t => {
        if (t.id === a.id) return { ...t, priority: b.priority };
        if (t.id === b.id) return { ...t, priority: a.priority };
        return t;
      }));
    });
  };

  const moveDown = (id) => {
    saveTasks(prev => {
      const target = prev.find(t => t.id === id);
      if (!target) return prev;
      const company = target.companyName || '';
      // 並べ替えは「同じ会社の中だけ」で行う
      const sorted = prev.filter(t => t.status !== 'done' && (t.companyName || '') === company)
        .sort((a, b) => (a.priority - b.priority) || (a.createdAt - b.createdAt));
      const idx = sorted.findIndex(t => t.id === id);
      if (idx < 0 || idx >= sorted.length - 1) return prev;
      const a = sorted[idx], b = sorted[idx + 1];
      return normalizePriorities(prev.map(t => {
        if (t.id === a.id) return { ...t, priority: b.priority };
        if (t.id === b.id) return { ...t, priority: a.priority };
        return t;
      }));
    });
  };

  const changePriority = (id, newPriority) => {
    const np = parseInt(newPriority, 10);
    if (isNaN(np) || np < 1) return;
    saveTasks(prev => normalizePriorities(prev.map(t => t.id === id ? { ...t, priority: np } : t)));
  };

  // ドラッグ＆ドロップで優先順位を変更：src を同じ会社内で target の位置（直前）へ差し込む
  const [dragTaskId, setDragTaskId] = useState(null);
  const reorderTaskPriority = (srcId, targetId) => {
    if (!srcId || srcId === targetId) return;
    const src = tasksRef.current.find(t => t.id === srcId);
    const tgt = tasksRef.current.find(t => t.id === targetId);
    if (!src || !tgt) return;
    if ((src.companyName || '') !== (tgt.companyName || '')) {
      notify('優先順位は会社ごとの番号のため、同じ会社のタスク同士でのみ並び替えできます', { type: 'error' });
      return;
    }
    saveTasks(prev => {
      const company = src.companyName || '';
      const sorted = prev.filter(t => t.status !== 'done' && (t.companyName || '') === company)
        .sort((a, b) => (a.priority - b.priority) || (a.createdAt - b.createdAt));
      const moving = sorted.find(t => t.id === srcId);
      if (!moving) return prev;
      const rest = sorted.filter(t => t.id !== srcId);
      const ti = rest.findIndex(t => t.id === targetId);
      if (ti < 0) return prev;
      const newSeq = [...rest.slice(0, ti), moving, ...rest.slice(ti)];
      const prMap = new Map(newSeq.map((t, i) => [t.id, i + 1]));
      return normalizePriorities(prev.map(t => prMap.has(t.id) ? { ...t, priority: prMap.get(t.id) } : t));
    });
  };

  // now を渡すことで「経過に応じた終了予定の自動調整」が1分ごとに再計算される
  const scheduled = useMemo(() => {
    assignProjectColors(tasks); // 案件の色割り当てを更新（登録順・重複なし）
    syncHolidays(settings);     // 全体共通の祝日（非稼働日）をモジュールに反映
    return scheduleTasks(tasks, settings, projectOrder, now);
  }, [tasks, settings, projectOrder, now]);

  // 終了予定を過ぎた視点（機能B）。1分ごとの now と endPromptState で再評価
  const overdueViewpoints = useMemo(() => {
    const byViewpoint = new Map();
    for (const t of scheduled.active) {
      if (!t.projectName) continue;
      const key = `${t.assignee}::${t.projectName}::${t.viewpointName}`;
      if (!byViewpoint.has(key)) byViewpoint.set(key, []);
      byViewpoint.get(key).push(t);
    }
    const nowTs = now.getTime();
    const eps = settings.endPromptState || {};
    const result = [];
    for (const [key, vtasks] of byViewpoint) {
      const endTs = projectEndTs(vtasks);
      if (endTs == null || endTs > nowTs) continue;
      const st = eps[key] || {};
      const snoozeActive = st.snoozedUntil && st.snoozedUntil > nowTs && st.lastPromptedEnd === endTs;
      if (snoozeActive) continue;
      const first = vtasks[0];
      // 休みの担当者は対応できないため、終了超過ポップアップを出さない
      if (isOnLeaveAt(first.assignee, now, settings.absences || [])) continue;
      result.push({
        key,
        projectName: first.projectName,
        viewpointName: first.viewpointName,
        assignee: first.assignee,
        // 実効納期＝個別（視点）＞全体（案件）
        deadline: (vtasks.find(t => t.deadline) || {}).deadline || (vtasks.find(t => t.projectDeadline) || {}).projectDeadline || '',
        tasks: vtasks, endTs, endDate: new Date(endTs),
      });
    }
    return result.sort((a, b) => a.endTs - b.endTs);
  }, [scheduled.active, now, settings.endPromptState]);

  // 確認待ちが7日間更新されなければ、自動で完了タブへ移す
  useEffect(() => {
    if (!tasksLoaded) return;
    const SEVEN = 7 * 24 * 60 * 60 * 1000;
    const nowMs = now.getTime();
    const isStale = (t) => t.reviewState === 'waiting' && t.reviewUpdatedAt && (nowMs - t.reviewUpdatedAt) >= SEVEN;
    if (!tasksRef.current.some(isStale)) return;
    saveTasks(prev => prev.map(t => isStale(t) ? { ...t, reviewState: null } : t));
  }, [now, tasksLoaded]);
  const projectList = useMemo(() => [...new Set(tasks.map(t => t.projectName))].filter(Boolean), [tasks]);
  const projectInternalList = useMemo(() => [...new Set(tasks.map(t => t.projectNameInternal))].filter(Boolean), [tasks]);
  const viewpointList = useMemo(() => [...new Set(tasks.map(t => t.viewpointName))].filter(Boolean), [tasks]);
  // 視点ごとの納品回数（project::viewpoint → 納品種類ステップ数）。
  // 全タスク（active+done＝移行済みの請求専用ステップ含む）を横断して数える。担当者非依存。
  // groupByViewpoint へ渡すと active のみの集合でも正しい納品回数が出る。
  const vpDeliveryCount = useMemo(() => {
    const m = new Map();
    for (const t of tasks) {
      const rt = (t.stepRoundType || '').trim();
      if (!rt) continue;
      if (!roundTypeOf(rt).isDelivery) continue;
      const k = `${t.projectName || ''}::${t.viewpointName || ''}`;
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [tasks]);
  // 制作担当者の候補：従業員マスタ ＋ 既存タスクの担当者
  // 従業員マスタの並び順 ＝ 担当者の表示順（カレンダー・担当者別・サマリー等）
  const assigneeOrder = useMemo(() => employeeMaster.map(e => e.name).filter(Boolean), [employeeMaster]);
  const assigneeList = useMemo(
    () => [...new Set([...employeeMaster.map(e => e.name), ...tasks.map(t => t.assignee)])].filter(Boolean),
    [tasks, employeeMaster]
  );
  // 候補に出す会社名：お客様マスタ ＋ 登録済みの会社 ＋ 既定リスト（重複は除く）
  const companyList = useMemo(() => {
    const used = tasks.map(t => t.companyName).filter(Boolean);
    const fromMaster = customerMaster.map(c => c.company).filter(Boolean);
    return [...new Set([...fromMaster, ...used, ...COMPANY_PRESETS])];
  }, [tasks, customerMaster]);
  // 契約形態「オフショア」の会社名集合（視点パネルの金額欄・帳票連携の出し分けに使う）
  const offshoreCompanies = useMemo(
    () => new Set((customerMaster || []).filter(c => c.contractType === 'offshore').map(c => (c.company || '').trim()).filter(Boolean)),
    [customerMaster]
  );
  const hoursPerDay = getHoursPerDay(settings);

  const colors = {
    bg: '#faf8f3', surface: '#ffffff', border: '#e8e3d6',
    text: '#1a1a1a', textMute: '#6b6b6b',
    accent: '#c1272d', accentSoft: '#fce8e8',
    progress: '#3a5a40',
  };
  const fontJP = "'Noto Sans JP', sans-serif";
  const fontDisplay = "'Shippori Mincho', serif";

  if (!auth.ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: colors.bg, fontFamily: fontJP, color: colors.textMute }}>
        読み込み中...
      </div>
    );
  }

  if (!auth.allowed) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: colors.bg, fontFamily: fontJP, color: colors.text, padding: 20 }}>
        <div style={{ maxWidth: 380, width: '100%', textAlign: 'center', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '40px 32px' }}>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 30, fontWeight: 700, letterSpacing: '0.05em', margin: '0 0 8px 0' }}>
            工程<span style={{ color: colors.accent }}>図</span>
          </h1>
          <p style={{ fontSize: 10, color: colors.textMute, margin: '0 0 28px 0', letterSpacing: '0.15em' }}>SCHEDULE VISUALIZER</p>
          <button
            onClick={async () => {
              setSignInError('');
              try { await signIn(); }
              catch (e) {
                if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') return;
                setSignInError('サインインに失敗しました：' + (e?.message || e));
              }
            }}
            style={{ width: '100%', padding: '12px 16px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 14, fontWeight: 500, color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"/></svg>
            Google でサインイン
          </button>
          {auth.deniedEmail && (
            <p style={{ marginTop: 18, color: colors.accent, fontSize: 12 }}>
              {auth.deniedEmail} は許可されていません。
            </p>
          )}
          {signInError && (
            <p style={{ marginTop: 18, color: colors.accent, fontSize: 12 }}>{signInError}</p>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: colors.bg, fontFamily: fontJP, color: colors.textMute }}>
        読み込み中...
      </div>
    );
  }

  // ビュー・カード類が useApp()（src/appContext.js）で参照する共有データ＋タスク操作ハンドラ。
  // コンポーネント固有の値（form・group・task など）は従来どおり props で渡す。
  const appValue = {
    // UIテーマ
    colors, fontJP, fontDisplay,
    // 共有データ
    tasks, scheduled, settings, now, memos,
    projectOrder, projectList, projectInternalList, viewpointList,
    assigneeList, assigneeOrder, companyList, customerMaster, employeeMaster,
    stepTypeMaster, vpDeliveryCount, offshoreCompanies,
    companyOrder: settings.companyOrder || [],
    usedCompanies: [...new Set(tasks.map(t => (t.companyName || '').trim()).filter(Boolean))],
    dragTaskId,
    // タスク・案件・視点の操作
    handleEdit, handleEditProject, handleEditViewpoint, handleAddViewpointToProject,
    handleDeleteViewpoint, handleDelete, toggleStatus, moveUp, moveDown, changePriority,
    addProgress, setTaskHours, setTaskCompletedHours, setTaskManualStart, setTaskManualEnd,
    setTaskAssignee, completeProject, cancelProject, suspendProject, completeViewpoint,
    handleAddStepToViewpoint, reassignViewpoint, setViewpointDeadline, setViewpointMeta,
    setStepMeta, patchTasksByIds, addProjectFromSheet, createBillingFromViewpoint, saveProjectInfo, setProjectDeadline,
    finalizeReview, reopenReview, setReviewNote, setReviewActualEnd, resumeProject,
    registerDraftAndEdit, setActualEnd,
    onDragTask: setDragTaskId, onDropTask: reorderTaskPriority,
    saveProjectOrder: saveProjectOrderPartial,
    onReorderAssignee: reorderAssigneeFromCalendar,
    onReorderProject: reorderProjectFromCalendar,
    onReassignViewpoint: reassignViewpointFromCalendar,
    // マスタ管理
    saveCustomerMaster, saveEmployeeMaster, saveStepTypeMaster,
    addOvertime, removeOvertime, addAbsence, removeAbsence, addHolidays, removeHoliday,
    saveCompanyOrder,
    // タスクメモ
    upsertMemo, deleteMemo,
    // ダイアログ・トースト
    confirmDialog, promptDialog, notify,
  };

  // 毎日使うタブは直接表示、経理・集計系は「集計・帳票」ドロップダウンへ集約
  const navItems = [
    { id: 'input', icon: <Plus size={15} />, label: '案件' },
    { id: 'message', icon: <MessageSquare size={15} />, label: 'サマリー' },
    { id: 'done', icon: <CheckCircle2 size={15} />, label: '完了' },
    { id: 'memo', icon: <StickyNote size={15} />, label: 'タスクメモ' },
    { id: 'master', icon: <Folder size={15} />, label: 'マスタ' },
  ];
  const reportNavItems = [
    { id: 'billing', icon: <FileText size={15} />, label: '帳票' },
    { id: 'sales', icon: <Table size={15} />, label: '売上登録' },
    { id: 'projectSheet', icon: <ClipboardList size={15} />, label: '案件整理' },
    { id: 'companySummary', icon: <TrendingUp size={15} />, label: '会社別集計' },
  ];

  return (
    <AppCtx.Provider value={appValue}>
    <div style={{ minHeight: '100vh', background: colors.bg, fontFamily: fontJP, color: colors.text }}>
      <header style={{ borderBottom: `1px solid ${colors.border}`, background: colors.surface }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: fontDisplay, fontSize: 26, fontWeight: 700, letterSpacing: '0.05em', margin: 0, lineHeight: 1 }}>
              工程<span style={{ color: colors.accent }}>図</span>
            </h1>
            <p style={{ fontSize: 10, color: colors.textMute, margin: '6px 0 0 0', letterSpacing: '0.15em' }}>SCHEDULE VISUALIZER</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {navItems.map(item => (
              <NavButton key={item.id} active={view === item.id} onClick={() => setView(item.id)} icon={item.icon} label={item.label}
                badge={item.id === 'done' ? scheduled.doneFinal.length : null} />
            ))}
            <NavGroup label="集計・帳票" icon={<FileText size={15} />} items={reportNavItems}
              activeId={view} onSelect={setView} />
            <style>{`
              @keyframes kz-spin { to { transform: rotate(360deg); } }
              /* ホバーで現れる副次操作（▲▼・削除・鉛筆アイコンなど）。
                 タッチ端末（hover無し）では常時表示してタップ可能にする */
              .kz-row .kz-hover-reveal { opacity: 0; transition: opacity 0.12s; }
              .kz-row:hover .kz-hover-reveal, .kz-row:focus-within .kz-hover-reveal { opacity: 1; }
              @media (hover: none) { .kz-row .kz-hover-reveal { opacity: 1; } }
              /* インライン編集できる値（点線ボタン）：ホバーで鉛筆アイコンを表示 */
              .kz-inline-edit .kz-pencil { opacity: 0; transition: opacity 0.12s; margin-left: 3px; }
              .kz-inline-edit:hover .kz-pencil { opacity: 0.9; }
              @media (hover: none) { .kz-inline-edit .kz-pencil { opacity: 0.55; } }
            `}</style>
            <button onClick={refreshData} disabled={refreshing}
              title={lastSync
                ? `データベースから最新データを再取得（最終更新 ${String(lastSync.getHours()).padStart(2, '0')}:${String(lastSync.getMinutes()).padStart(2, '0')}）`
                : 'データベースから最新データを再取得します（更新後にデータが表示されないときに押してください）'}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: refreshing ? 'default' : 'pointer', color: colors.textMute, fontFamily: fontJP, fontSize: 11, opacity: refreshing ? 0.6 : 1 }}>
              <RotateCcw size={14} style={{ animation: refreshing ? 'kz-spin 0.8s linear infinite' : 'none' }} />
              {refreshing ? '更新中…' : 'データ更新'}
            </button>
            <button onClick={() => setShowSettings(!showSettings)}
              style={{ padding: '7px 9px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', color: colors.textMute }}
              title="設定"><SettingsIcon size={15} /></button>
            <button onClick={() => signOutUser()}
              title={auth.user?.email ? `${auth.user.email} からサインアウト` : 'サインアウト'}
              style={{ padding: '6px 10px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', color: colors.textMute, fontFamily: fontJP, fontSize: 11 }}>
              サインアウト
            </button>
          </div>
        </div>

        {showSettings && (
          <div style={{ borderTop: `1px solid ${colors.border}`, background: '#fbf9f4', padding: '16px 28px' }}>
            <div style={{ maxWidth: 1600, margin: '0 auto', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: colors.textMute }}>開始日時</span>
                <input type="date" value={settings.startDate}
                  onChange={(e) => saveSettings({ ...settings, startDate: e.target.value })}
                  style={{ padding: '4px 8px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 13 }} />
                <TimeSelect value={settings.startTime || '08:00'}
                  onChange={(val) => saveSettings({ ...settings, startTime: val })}
                  colors={colors} fontJP={fontJP} />
              </label>
              <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ color: colors.textMute }}>午前</span>
                <TimeSelect value={settings.morningStart} onChange={(val) => saveSettings({ ...settings, morningStart: val })} colors={colors} fontJP={fontJP} />
                <span style={{ color: colors.textMute }}>〜</span>
                <TimeSelect value={settings.morningEnd} onChange={(val) => saveSettings({ ...settings, morningEnd: val })} colors={colors} fontJP={fontJP} />
              </div>
              <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ color: colors.textMute }}>午後</span>
                <TimeSelect value={settings.afternoonStart} onChange={(val) => saveSettings({ ...settings, afternoonStart: val })} colors={colors} fontJP={fontJP} />
                <span style={{ color: colors.textMute }}>〜</span>
                <TimeSelect value={settings.afternoonEnd} onChange={(val) => saveSettings({ ...settings, afternoonEnd: val })} colors={colors} fontJP={fontJP} />
              </div>
              <span style={{ fontSize: 11, color: colors.textMute, marginLeft: 'auto' }}>1日 {hoursPerDay}時間 ・ 土日除外</span>
            </div>
            <MemberSettings memberEmails={memberEmails} isOwner={!!auth.user?.isOwner} colors={colors} fontJP={fontJP} />
            <div style={{ maxWidth: 1600, margin: '16px auto 0', borderTop: `1px solid ${colors.border}`, paddingTop: 12, fontSize: 11, color: colors.textMute }}>
              残業・欠勤（休日・不在）の登録は「マスタ」タブに移動しました。
            </div>
          </div>
        )}
      </header>

      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '28px' }}>
        <Suspense fallback={<div style={{ padding: 60, textAlign: 'center', color: colors.textMute, fontFamily: fontJP, fontSize: 13 }}>読み込み中...</div>}>
        {view === 'input' && (
          <InputView form={form} setForm={setForm} handleSubmit={handleSubmit}
            editingId={editingId} editMode={editMode}
            cancelEdit={() => { setEditingId(null); setEditMode(null); setForm(emptyForm); }}
            selectedAssignee={selectedAssignee} setSelectedAssignee={setSelectedAssignee} />
        )}
        {view === 'message' && <MessageView />}
        {view === 'done' && <DoneView />}
        {view === 'master' && <MasterView />}
        {view === 'memo' && <MemoView />}
        {view === 'billing' && (
          <BillingView customerMaster={customerMaster} tasks={tasks} now={now}
            colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
        )}
        {view === 'sales' && (
          <SalesView tasks={tasks} customerMaster={customerMaster} now={now}
            onEditProject={handleEditProject}
            colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
        )}
        {view === 'projectSheet' && (
          <ProjectSheetView tasks={tasks} customerMaster={customerMaster}
            colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
        )}
        {view === 'companySummary' && (
          <CompanySummaryView tasks={tasks} now={now}
            colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
        )}
        </Suspense>
      </main>

      {confirmState && (
        <ConfirmModal title={confirmState.title || '確認'}
          confirmLabel={confirmState.confirmLabel} cancelLabel={confirmState.cancelLabel}
          onConfirm={() => closeConfirm(true)} onCancel={() => closeConfirm(false)}
          colors={colors} fontJP={fontJP} fontDisplay={fontDisplay}>
          <div style={{ whiteSpace: 'pre-wrap' }}>{confirmState.message}</div>
        </ConfirmModal>
      )}

      {promptState && (
        <PromptModal title={promptState.title} message={promptState.message}
          defaultValue={promptState.defaultValue} placeholder={promptState.placeholder}
          confirmLabel={promptState.confirmLabel} cancelLabel={promptState.cancelLabel}
          onSubmit={(v) => closePrompt(v)} onCancel={() => closePrompt(null)}
          colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} onUndo={undoToast} colors={colors} fontJP={fontJP} />

      {completeTarget && (
        <CompleteDialog
          target={completeTarget}
          onConfirm={confirmComplete}
          onCancel={() => setCompleteTarget(null)}
          colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
      )}

      {startMoveConfirm && (
        <DeadlineConfirmModal
          info={startMoveConfirm}
          onCancel={() => setStartMoveConfirm(null)}
          onSubmit={async (opts) => { setStartMoveConfirm(null); await performSubmit(opts); }}
          colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
      )}

      {overdueViewpoints.length > 0 && (
        <EndPromptModal
          viewpoints={overdueViewpoints} now={now} settings={settings}
          onComplete={endPromptComplete} onAddRevision={endPromptAddRevision}
          onDelay={endPromptDelay} onAdjustEnd={endPromptAdjustEnd} onSnooze={endPromptSnooze}
          colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
      )}

      {/* タスクメモ通知のアプリ内バナー（右上・数秒で消える） */}
      {memoToasts.length > 0 && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
          {memoToasts.map(t => (
            <div key={t.id} onClick={() => setMemoToasts(prev => prev.filter(x => x.id !== t.id))}
              style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderLeft: `4px solid ${colors.accent}`, borderRadius: 6, padding: '12px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', cursor: 'pointer', fontFamily: fontJP }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.accent, fontWeight: 700, marginBottom: 4 }}>
                <StickyNote size={13} /> タスクメモ
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 2 }}>{t.title}</div>
              <div style={{ fontSize: 12, color: colors.textMute, whiteSpace: 'pre-wrap' }}>{t.body}</div>
            </div>
          ))}
        </div>
      )}

    </div>
    </AppCtx.Provider>
  );
}

