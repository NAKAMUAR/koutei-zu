// ---- line-bot/bot.js（LINE Bot 本体。Google Apps Script 上で動く）----
// LINE で決まった言葉（本日納期・今週納期・全体納期・案件一覧・スケジュール など）を受け取ると、
// Firestore の工程図データを読み、アプリと同じスケジュール計算（KouteiLib）で返信を組み立てる。
// 設定値（スクリプトプロパティ）:
//   LINE_CHANNEL_ACCESS_TOKEN … LINE Developers で発行したチャネルアクセストークン（長期）
//   REGISTER_CODE             … トーク/グループを登録するための合言葉
//   ALLOWED_IDS               … 登録済みのトーク/グループID（Bot が自動で書き込む）
//   REPORT_TARGETS            … 定時報告を送るトーク/グループID（「定時報告オン」で Bot が書き込む）
//   REPORT_HOURS              … 定時報告の時刻（例 "8" や "8,17"。「定時報告時刻 8」で Bot が書き込む）
//   REPORT_ON_HOLIDAYS        … "true" なら休業日（日曜・祝日・休みの土曜）も報告する（既定は送らない）

var BOT_CONFIG = {
  PROJECT_ID: 'koutei-zu',
  DATABASE_ID: 'default',
  WORKSPACE_ID: 'liebe-asia-team',
  MAX_MESSAGES: 5,     // LINE の1回の返信で送れる吹き出しの上限
  MAX_CHARS: 4800,     // 吹き出し1つの文字数上限（LINE の上限 5000 に余裕を持たせる）
  MAX_REGISTER_FAILS: 5, // 合言葉の失敗がこの回数を超えたら1時間受け付けない
  DEFAULT_REPORT_HOURS: '8',
  REPORT_LIST_MAX: 15,   // 定時報告の各項目に並べる最大件数（超えた分は「他N件」）
};

// ============ 受信口（LINE の Webhook） ============
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    (body.events || []).forEach(function (ev) {
      try { handleEvent_(ev); } catch (err) { console.error('イベント処理エラー:', err && err.stack ? err.stack : err); }
    });
  } catch (err) {
    console.error('受信データの解析エラー:', err && err.stack ? err.stack : err);
  }
  // 返信は LINE の Reply API で送る。ここでは工程図のデータを一切返さない。
  return ContentService.createTextOutput('OK');
}

function handleEvent_(ev) {
  var token = ev.replyToken;
  var sourceId = sourceIdOf_(ev.source);
  if (ev.type === 'join' || ev.type === 'follow') {
    reply_(token, ['工程図Botです。\n最初に「登録 合言葉」と送信して、このトークを登録してください。\n登録後に「ヘルプ」と送ると使い方を表示します。']);
    return;
  }
  if (ev.type !== 'message' || !ev.message || ev.message.type !== 'text') return;

  var text = String(ev.message.text || '').normalize('NFKC').trim();
  var compact = text.replace(/\s+/g, '');
  if (compact === '登録解除') {
    if (isAllowed_(sourceId)) removeAllowedId_(sourceId);
    setReportTarget_(sourceId, false);
    if (getReportTargets_().length === 0) removeReportTriggers_();
    reply_(token, ['このトークの登録を解除しました（定時報告も止めました）。']);
    return;
  }
  var reg = text.match(/^登録[\s:：]*(.+)$/);
  if (reg) { handleRegister_(token, sourceId, reg[1].trim()); return; }

  var cmd = parseCommand_(text);
  if (!cmd) return; // 決まった言葉以外には反応しない（グループの会話の邪魔をしない）
  if (!isAllowed_(sourceId)) {
    reply_(token, ['このトークはまだ登録されていません。\n「登録 合言葉」と送信してください。']);
    return;
  }
  if (cmd.type === 'help') { reply_(token, [helpText_()]); return; }
  if (cmd.type === 'reportOn' || cmd.type === 'reportOff' || cmd.type === 'reportStatus' || cmd.type === 'reportHours') {
    var msg;
    try { msg = handleReportSetting_(cmd, sourceId); } catch (err) {
      console.error('定時報告の設定エラー:', err && err.stack ? err.stack : err);
      msg = '定時報告の設定に失敗しました。\n（管理者向け: ' + String(err && err.message || err).slice(0, 200) + '）';
    }
    reply_(token, [msg]);
    return;
  }

  var out;
  try {
    var now = new Date();
    out = buildReply_(cmd, loadData_(cmd.type === 'report' ? { doneSince: doneFetchSince_(now) } : {}), now);
  } catch (err) {
    console.error('データ取得エラー:', err && err.stack ? err.stack : err);
    out = 'データの取得に失敗しました。時間をおいてもう一度お試しください。\n（管理者向け: ' + String(err && err.message || err).slice(0, 200) + '）';
  }
  reply_(token, splitMessages_(out));
}

function sourceIdOf_(source) {
  if (!source) return '';
  return source.groupId || source.roomId || source.userId || '';
}

// ============ 言葉（コマンド）の判定 ============
function parseCommand_(raw) {
  var t = String(raw || '').normalize('NFKC').trim();
  var c = t.replace(/\s+/g, '');
  if (/^(ヘルプ|使い方|つかいかた|コマンド|help|\?)$/i.test(c)) return { type: 'help' };
  if (/^(本日|今日|きょう)の?納期$/.test(c)) return { type: 'deadline', range: 'today' };
  if (/^(明日|あした)の?納期$/.test(c)) return { type: 'deadline', range: 'tomorrow' };
  if (/^今週の?納期$/.test(c)) return { type: 'deadline', range: 'thisWeek' };
  if (/^来週の?納期$/.test(c)) return { type: 'deadline', range: 'nextWeek' };
  if (/^(全体の?納期|納期一覧)$/.test(c)) return { type: 'deadline', range: 'all' };
  if (/^(案件一覧|進行中案件|案件リスト)$/.test(c)) return { type: 'projects' };
  if (/^(進捗報告|進捗|日報)$/.test(c)) return { type: 'report' };
  if (/^定時報告(オン|on|開始|する)$/i.test(c)) return { type: 'reportOn' };
  if (/^定時報告(オフ|off|停止|しない)$/i.test(c)) return { type: 'reportOff' };
  if (/^定時報告(の状態|状態|確認)?$/.test(c)) return { type: 'reportStatus' };
  var h = c.match(/^定時報告(?:の)?時刻(.*)$/);
  if (h) return { type: 'reportHours', hours: h[1] };
  var m = t.match(/^(本日|今日|きょう|明日|あした)?の?\s*スケジュール(.*)$/);
  if (m) {
    return {
      type: 'schedule',
      dayOffset: /明日|あした/.test(m[1] || '') ? 1 : 0,
      assignee: (m[2] || '').replace(/^[\s:：の]+/, '').trim(),
    };
  }
  return null;
}

function helpText_() {
  return [
    '【工程図Bot 使い方】',
    '次の言葉を送ると、工程図の最新情報をお返しします。',
    '',
    '・本日納期 … 今日が納期の案件',
    '・明日納期',
    '・今週納期 … 今週日曜までの納期',
    '・来週納期',
    '・全体納期 … 納期が決まっている全案件',
    '・案件一覧 … 進行中の案件（会社別）',
    '・スケジュール … 今日の担当者別の予定',
    '・明日のスケジュール',
    '・スケジュール 山田 … 担当者で絞り込み',
    '・進捗報告 … 定時報告と同じ内容を今すぐ表示',
    '・ヘルプ … この案内',
    '',
    '【定時報告（毎日決まった時刻に自動で送信）】',
    '・定時報告オン … このトークに送る',
    '・定時報告オフ … 止める',
    '・定時報告時刻 8 … 送る時刻（8,17 のように複数可）',
    '・定時報告 … 設定と今月の残り送信数を確認',
    '',
    '※「完了見込み」はアプリと同じ計算による予定です。',
  ].join('\n');
}

// ============ 登録（合言葉） ============
function props_() { return PropertiesService.getScriptProperties(); }

function getAllowedIds_() {
  try { return JSON.parse(props_().getProperty('ALLOWED_IDS') || '[]'); } catch (e) { return []; }
}
function isAllowed_(id) { return !!id && getAllowedIds_().indexOf(id) >= 0; }
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function addAllowedId_(id) {
  withLock_(function () {
    var ids = getAllowedIds_();
    if (ids.indexOf(id) < 0) { ids.push(id); props_().setProperty('ALLOWED_IDS', JSON.stringify(ids)); }
  });
}
function removeAllowedId_(id) {
  withLock_(function () {
    var ids = getAllowedIds_().filter(function (x) { return x !== id; });
    props_().setProperty('ALLOWED_IDS', JSON.stringify(ids));
  });
}

function handleRegister_(token, sourceId, code) {
  var expected = props_().getProperty('REGISTER_CODE');
  if (!expected) { reply_(token, ['合言葉（REGISTER_CODE）が設定されていません。管理者に連絡してください。']); return; }
  if (!sourceId) return;
  var cache = CacheService.getScriptCache();
  var failKey = 'regfail_' + sourceId;
  var fails = Number(cache.get(failKey) || 0);
  if (fails >= BOT_CONFIG.MAX_REGISTER_FAILS) {
    reply_(token, ['合言葉の入力に続けて失敗したため、1時間ほど受け付けを停止しています。']);
    return;
  }
  if (code !== expected) {
    cache.put(failKey, String(fails + 1), 3600);
    reply_(token, ['合言葉が違います。']);
    return;
  }
  cache.remove(failKey);
  addAllowedId_(sourceId);
  reply_(token, ['登録しました。\n\n' + helpText_()]);
}

// ============ Firestore からの読み込み ============
// opts.doneSince（ms）を渡すと、その時刻以降に完了したタスクも読む（定時報告の「完了」欄用）
function loadData_(opts) {
  opts = opts || {};
  var L = KouteiLib;
  var docsRoot = 'projects/' + BOT_CONFIG.PROJECT_ID + '/databases/' + BOT_CONFIG.DATABASE_ID + '/documents';
  var wsPath = docsRoot + '/workspaces/' + BOT_CONFIG.WORKSPACE_ID;
  var api = 'https://firestore.googleapis.com/v1/';
  var keys = ['settings', 'holidays', 'absences', 'projectOrder', 'employeeMaster'];
  var base = {
    method: 'post',
    contentType: 'application/json',
    // X-Goog-User-Project: GAS 既定のプロジェクトではなく koutei-zu の Firestore API 枠を使う
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Goog-User-Project': BOT_CONFIG.PROJECT_ID },
    muteHttpExceptions: true,
  };
  // 完了（done）のタスクはスケジュール計算に影響しないため、未完了だけを読む（読み取り件数の節約）
  var requests = [
    Object.assign({ url: api + wsPath + ':runQuery' }, base, {
      payload: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'tasks' }],
          where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'pending' } } },
        },
      }),
    }),
    Object.assign({ url: api + docsRoot + ':batchGet' }, base, {
      payload: JSON.stringify({ documents: keys.map(function (k) { return wsPath + '/data/' + k; }) }),
    }),
  ];
  if (opts.doneSince) {
    // completedAt だけの範囲条件にする（status との組み合わせは複合インデックスが要るため、状態はここで絞る）
    requests.push(Object.assign({ url: api + wsPath + ':runQuery' }, base, {
      payload: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'tasks' }],
          where: { fieldFilter: { field: { fieldPath: 'completedAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { integerValue: String(opts.doneSince) } } },
        },
      }),
    }));
  }
  var res = UrlFetchApp.fetchAll(requests);
  res.forEach(function (r) {
    if (r.getResponseCode() !== 200) {
      throw new Error('Firestore ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
    }
  });

  var rawTasks = JSON.parse(res[0].getContentText())
    .filter(function (r) { return r.document; })
    .map(function (r) { return fromFields_(r.document.fields || {}); });
  var kv = {};
  JSON.parse(res[1].getContentText()).forEach(function (r) {
    if (!r.found) return;
    var name = r.found.name;
    kv[name.slice(name.lastIndexOf('/') + 1)] = fromValue_((r.found.fields || {}).value);
  });
  var parseArr = function (key) { var v = parseJson_(kv[key]); return Array.isArray(v) ? v : []; };
  var savedSettings = parseJson_(kv.settings) || {};

  var settings = Object.assign({}, L.DEFAULT_SETTINGS, savedSettings, {
    holidays: parseArr('holidays'),
    absences: parseArr('absences'),
  });
  L.syncHolidays(settings);
  var tasks = L.normalizePriorities(rawTasks.map(L.migrateTask));
  var projectOrder = parseArr('projectOrder');
  var now = new Date();
  var scheduled = L.scheduleTasks(tasks, settings, projectOrder, now);
  // 最近の完了：中止（cancelled）と請求専用の作業時間0のステップは「作業の完了」に数えない
  var recentDone = !opts.doneSince ? [] : JSON.parse(res[2].getContentText())
    .filter(function (r) { return r.document; })
    .map(function (r) { return fromFields_(r.document.fields || {}); })
    .filter(function (t) { return t.status === 'done' && !t.cancelled && (Number(t.hours) || 0) > 0; });
  return {
    settings: settings,
    scheduled: scheduled,
    projectOrder: projectOrder,
    assigneeOrder: parseArr('employeeMaster').map(function (e) { return e && e.name; }).filter(Boolean),
    recentDone: recentDone,
    doneSince: opts.doneSince || null,
  };
}

function parseJson_(s) {
  if (typeof s !== 'string' || !s) return null;
  try { return JSON.parse(s); } catch (e) { return null; }
}

function fromFields_(fields) {
  var out = {};
  Object.keys(fields).forEach(function (k) { out[k] = fromValue_(fields[k]); });
  return out;
}
function fromValue_(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return fromFields_(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue_);
  return null;
}

// ============ 返信文の組み立て ============
function buildReply_(cmd, data, now) {
  if (cmd.type === 'deadline') return buildDeadlineReply_(cmd.range, data, now);
  if (cmd.type === 'projects') return buildProjectsReply_(data);
  if (cmd.type === 'schedule') return buildScheduleReply_(cmd, data, now);
  if (cmd.type === 'report') return buildProgressReport_(data, now);
  return helpText_();
}

function ymdOf_(s) {
  var m = String(s || '').trim().match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : '';
}
function mdw_(ymd) {
  var d = KouteiLib.parseYMD(ymd);
  return d ? (d.getMonth() + 1) + '/' + d.getDate() + '(' + KouteiLib.dayName(d) + ')' : ymd;
}
function tsLabel_(ts) {
  var d = new Date(ts);
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + KouteiLib.minToTime(d.getHours() * 60 + d.getMinutes());
}
function projectLabel_(v) {
  var name = v.projectName || v.projectNameInternal || '（案件名なし）';
  return v.companyName ? name + '（' + v.companyName + '）' : name;
}

// 未完了タスクを「案件×視点」単位にまとめる（納期は 視点の納期 ＞ 全体納期）
function viewpointsOf_(active) {
  var map = new Map();
  active.forEach(function (t) {
    var key = (t.projectName || '') + '::' + (t.viewpointName || '');
    var v = map.get(key);
    if (!v) {
      v = {
        projectName: t.projectName || '', projectNameInternal: t.projectNameInternal || '',
        companyName: t.companyName || '', viewpointName: t.viewpointName || '',
        assignees: [], deadline: '', projectDeadline: '', endTs: null,
      };
      map.set(key, v);
    }
    var dl = ymdOf_(t.deadline || t.projectDeadline);
    if (dl && (!v.deadline || dl < v.deadline)) v.deadline = dl;
    var pdl = ymdOf_(t.projectDeadline);
    if (pdl && (!v.projectDeadline || pdl < v.projectDeadline)) v.projectDeadline = pdl;
    if (t.assignee && v.assignees.indexOf(t.assignee) < 0) v.assignees.push(t.assignee);
    if (t.scheduledEnd) {
      var ts = t.scheduledEnd.getTime() + (t.scheduledEndMin || 0) * 60000;
      if (v.endTs == null || ts > v.endTs) v.endTs = ts;
    }
  });
  return Array.from(map.values());
}

function projectIndexer_(data) {
  var order = KouteiLib.computeProjectOrder(data.scheduled.active, data.projectOrder);
  var idx = new Map(order.map(function (n, i) { return [n, i]; }));
  return function (name) { return idx.has(name) ? idx.get(name) : Infinity; };
}

function viewpointLine_(v) {
  var parts = [' ・' + (v.viewpointName || '（視点名なし）')];
  if (v.assignees.length) parts.push('担当:' + v.assignees.join('・'));
  if (v.endTs != null) {
    var late = v.deadline && KouteiLib.fmtYMD(new Date(v.endTs)) > v.deadline;
    parts.push('完了見込み ' + tsLabel_(v.endTs) + (late ? ' ※納期に遅れる見込み' : ''));
  } else {
    parts.push('完了見込み 未定');
  }
  return parts.join('  ');
}

// 視点を案件ごとにまとめて行に展開する
function projectBlocks_(vps, projIdx) {
  var groups = new Map();
  vps.forEach(function (v) {
    var k = v.projectName + '::' + v.companyName;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(v);
  });
  var keys = Array.from(groups.keys()).sort(function (a, b) {
    var ga = groups.get(a)[0], gb = groups.get(b)[0];
    return (projIdx(ga.projectName) - projIdx(gb.projectName)) || ga.projectName.localeCompare(gb.projectName, 'ja');
  });
  var lines = [];
  keys.forEach(function (k) {
    var list = groups.get(k).sort(function (a, b) { return a.viewpointName.localeCompare(b.viewpointName, 'ja', { numeric: true }); });
    lines.push('■ ' + projectLabel_(list[0]));
    list.forEach(function (v) { lines.push(viewpointLine_(v)); });
  });
  return lines;
}

function byDateBlocks_(vps, projIdx) {
  var dates = Array.from(new Set(vps.map(function (v) { return v.deadline; }))).sort();
  var lines = [];
  dates.forEach(function (d) {
    lines.push('');
    lines.push('▼ ' + mdw_(d));
    lines = lines.concat(projectBlocks_(vps.filter(function (v) { return v.deadline === d; }), projIdx));
  });
  return lines;
}

function buildDeadlineReply_(range, data, now) {
  var L = KouteiLib;
  var today = L.startOfDay(now);
  var todayYmd = L.fmtYMD(today);
  var monday = L.addDays(today, -((today.getDay() + 6) % 7));
  var from, to, title, showOverdue, multiDay;
  if (range === 'today') {
    from = to = todayYmd; title = '本日納期 ' + mdw_(todayYmd); showOverdue = true;
  } else if (range === 'tomorrow') {
    from = to = L.fmtYMD(L.addDays(today, 1)); title = '明日納期 ' + mdw_(from);
  } else if (range === 'thisWeek') {
    from = todayYmd; to = L.fmtYMD(L.addDays(monday, 6));
    title = '今週納期 ' + mdw_(from) + '〜' + mdw_(to); showOverdue = true; multiDay = true;
  } else if (range === 'nextWeek') {
    from = L.fmtYMD(L.addDays(monday, 7)); to = L.fmtYMD(L.addDays(monday, 13));
    title = '来週納期 ' + mdw_(from) + '〜' + mdw_(to); multiDay = true;
  } else {
    from = todayYmd; to = '9999-12-31'; title = '全体納期'; showOverdue = true; multiDay = true;
  }

  var projIdx = projectIndexer_(data);
  var vps = viewpointsOf_(data.scheduled.active);
  var hits = vps.filter(function (v) { return v.deadline && v.deadline >= from && v.deadline <= to; });
  var overdue = showOverdue ? vps.filter(function (v) { return v.deadline && v.deadline < todayYmd; }) : [];

  var lines = ['【' + title + '】' + hits.length + '件'];
  if (hits.length === 0) {
    lines.push('該当する未完了の案件はありません。');
  } else if (multiDay) {
    lines = lines.concat(byDateBlocks_(hits, projIdx));
  } else {
    lines = lines.concat(projectBlocks_(hits, projIdx));
  }
  if (overdue.length) {
    lines.push('');
    lines.push('【納期を過ぎている未完了】' + overdue.length + '件');
    lines = lines.concat(byDateBlocks_(overdue, projIdx));
  }
  if (range === 'all') {
    var noDeadline = vps.filter(function (v) { return !v.deadline; }).length;
    if (noDeadline) { lines.push(''); lines.push('※納期未設定の視点が ' + noDeadline + ' 件あります。'); }
  }
  return lines.join('\n');
}

function buildProjectsReply_(data) {
  var L = KouteiLib;
  var projIdx = projectIndexer_(data);
  var vps = viewpointsOf_(data.scheduled.active);
  var projects = new Map();
  vps.forEach(function (v) {
    var p = projects.get(v.projectName);
    if (!p) {
      p = { name: v.projectName || v.projectNameInternal || '（案件名なし）', key: v.projectName, company: v.companyName, vps: [] };
      projects.set(v.projectName, p);
    }
    if (!p.company && v.companyName) p.company = v.companyName;
    p.vps.push(v);
  });
  var list = Array.from(projects.values());
  var companies = Array.from(new Set(list.map(function (p) { return p.company; })))
    .sort(function (a, b) { return L.compareCompanyDisplay(a, b, data.settings.companyOrder); });

  var lines = ['【案件一覧】進行中 ' + list.length + '件'];
  if (list.length === 0) lines.push('進行中の案件はありません。');
  companies.forEach(function (c) {
    lines.push('');
    lines.push('＜' + (c || '会社未設定') + '＞');
    list.filter(function (p) { return p.company === c; })
      .sort(function (a, b) { return projIdx(a.key) - projIdx(b.key); })
      .forEach(function (p) {
        var names = p.vps.map(function (v) { return v.viewpointName; })
          .sort(function (a, b) { return a.localeCompare(b, 'ja', { numeric: true }); });
        var shown = names.slice(0, 8).join(', ') + (names.length > 8 ? ' 他' + (names.length - 8) : '');
        var assignees = Array.from(new Set([].concat.apply([], p.vps.map(function (v) { return v.assignees; }))));
        var pdl = p.vps.map(function (v) { return v.projectDeadline; }).filter(Boolean).sort()[0];
        var vdl = p.vps.map(function (v) { return v.deadline; }).filter(Boolean).sort()[0];
        var dlText = pdl ? '全体納期 ' + mdw_(pdl) : vdl ? '最短納期 ' + mdw_(vdl) : '納期 未設定';
        var ends = p.vps.map(function (v) { return v.endTs; }).filter(function (x) { return x != null; });
        lines.push('■ ' + p.name);
        lines.push('  ' + dlText + '｜視点' + names.length + '（' + shown + '）');
        var sub = [];
        if (assignees.length) sub.push('担当 ' + assignees.join('・'));
        if (ends.length) sub.push('完了見込み ' + tsLabel_(Math.max.apply(null, ends)));
        if (sub.length) lines.push('  ' + sub.join('｜'));
      });
  });
  var suspended = Array.from(new Set((data.scheduled.suspended || []).map(function (t) { return t.projectName || t.projectNameInternal; }).filter(Boolean)));
  if (suspended.length) {
    lines.push('');
    lines.push('＜制作中断中＞ ' + suspended.join('、'));
  }
  return lines.join('\n');
}

function buildScheduleReply_(cmd, data, now) {
  var L = KouteiLib;
  var target = L.addDays(L.startOfDay(now), cmd.dayOffset || 0);
  var ymd = L.fmtYMD(target);
  var byAssignee = new Map();
  data.scheduled.active.forEach(function (t) {
    (t.slots || []).forEach(function (s) {
      if (L.fmtYMD(s.date) !== ymd) return;
      var a = t.assignee || '未割当';
      if (!byAssignee.has(a)) byAssignee.set(a, []);
      byAssignee.get(a).push({ s: s.startMin, e: s.endMin, t: t });
    });
  });
  var names = L.sortAssigneesByMaster(Array.from(byAssignee.keys()), data.assigneeOrder);
  var filter = normalizeName_(cmd.assignee);
  if (filter) names = names.filter(function (n) { return normalizeName_(n).indexOf(filter) >= 0; });

  var title = (cmd.dayOffset ? '明日' : '本日') + 'のスケジュール';
  var lines = ['【' + title + '】' + mdw_(ymd) + (cmd.assignee ? '（' + cmd.assignee + '）' : '')];
  if (names.length === 0) {
    lines.push(L.isNonWorkingDay(target) ? '休業日です。予定はありません。' : '予定はありません。');
    return lines.join('\n');
  }
  names.forEach(function (n) {
    lines.push('');
    lines.push('＜' + n + '＞');
    byAssignee.get(n).sort(function (a, b) { return a.s - b.s; }).forEach(function (x) {
      var t = x.t;
      var what = (t.projectName || t.projectNameInternal || '') + ' / ' + (t.viewpointName || '') + (t.stepName ? ' ' + t.stepName : '');
      lines.push(' ' + L.minToTime(x.s) + '-' + L.minToTime(x.e) + '  ' + what);
    });
  });
  return lines.join('\n');
}

function normalizeName_(s) {
  return String(s || '').normalize('NFKC').replace(/\s+/g, '').toLowerCase()
    .replace(/[ァ-ヶ]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0x60); });
}

// 長い返信を吹き出し（最大5つ）に分ける
function splitMessages_(text) {
  var max = BOT_CONFIG.MAX_CHARS;
  var chunks = [];
  var cur = '';
  String(text).split('\n').forEach(function (line) {
    while (line.length > max) { chunks.push(cur); cur = ''; chunks.push(line.slice(0, max)); line = line.slice(max); }
    if (cur && (cur.length + 1 + line.length) > max) { chunks.push(cur); cur = line; }
    else cur = cur ? cur + '\n' + line : line;
  });
  if (cur) chunks.push(cur);
  chunks = chunks.filter(function (c) { return c.trim(); });
  if (chunks.length > BOT_CONFIG.MAX_MESSAGES) {
    chunks = chunks.slice(0, BOT_CONFIG.MAX_MESSAGES);
    var note = '\n…（長いため以降を省略しました。続きはアプリでご確認ください）';
    var last = chunks[chunks.length - 1];
    chunks[chunks.length - 1] = last.slice(0, max - note.length) + note;
  }
  return chunks.length ? chunks : ['（表示する内容がありません）'];
}

// ============ 進捗報告（定時報告・「進捗報告」コマンド共通の本文） ============
// 前営業日の0時（ms）。休業日（日曜・祝日・休みの土曜）はさかのぼって飛ばす
function previousWorkdayStart_(now) {
  var L = KouteiLib;
  var d = L.addDays(L.startOfDay(now), -1);
  for (var i = 0; i < 30 && L.isNonWorkingDay(d); i++) d = L.addDays(d, -1);
  return d.getTime();
}
// 完了タスクの読み込み範囲。祝日の判定はデータ読み込み後にしかできないため、
// テト休み＋週末も覆えるよう広めに読み、本文を作るときに前営業日以降へ絞る
function doneFetchSince_(now) {
  return KouteiLib.addDays(KouteiLib.startOfDay(now), -14).getTime();
}

function shortVp_(v) {
  var s = (v.projectName || v.projectNameInternal || '（案件名なし）') + ' ' + (v.viewpointName || '');
  return v.assignees && v.assignees.length ? s + '（' + v.assignees.join('・') + '）' : s;
}

function reportSection_(lines, title, list, fmt) {
  var max = BOT_CONFIG.REPORT_LIST_MAX;
  lines.push('');
  lines.push(title + '（' + list.length + '件）');
  if (list.length === 0) { lines.push(' なし'); return; }
  list.slice(0, max).forEach(function (x) { lines.push(' ・' + fmt(x)); });
  if (list.length > max) lines.push(' 他' + (list.length - max) + '件');
}

function buildProgressReport_(data, now) {
  var L = KouteiLib;
  var today = L.startOfDay(now);
  var todayYmd = L.fmtYMD(today);
  var tomorrowYmd = L.fmtYMD(L.addDays(today, 1));
  var projIdx = projectIndexer_(data);
  var vps = viewpointsOf_(data.scheduled.active).sort(function (a, b) {
    return (a.deadline || '9999').localeCompare(b.deadline || '9999')
      || (projIdx(a.projectName) - projIdx(b.projectName))
      || a.viewpointName.localeCompare(b.viewpointName, 'ja', { numeric: true });
  });
  var endYmd = function (v) { return v.endTs == null ? '' : L.fmtYMD(new Date(v.endTs)); };
  var isLate = function (v) { return !!(v.deadline && endYmd(v) && endYmd(v) > v.deadline); };
  var projectCount = new Set(vps.map(function (v) { return v.projectName; })).size;

  var lines = [
    '【工程図 進捗報告】' + mdw_(todayYmd) + ' ' + L.minToTime(now.getHours() * 60 + now.getMinutes()) + '時点',
    '進行中 ' + projectCount + '案件・視点' + vps.length,
  ];
  reportSection_(lines, '■ 本日納期', vps.filter(function (v) { return v.deadline === todayYmd; }), function (v) {
    return shortVp_(v) + ' 見込み ' + (v.endTs == null ? '未定' : tsLabel_(v.endTs)) + (isLate(v) ? ' ※遅れ見込み' : '');
  });
  reportSection_(lines, '■ 納期超過（未完了）', vps.filter(function (v) { return v.deadline && v.deadline < todayYmd; }), function (v) {
    return shortVp_(v) + ' 納期' + mdw_(v.deadline);
  });
  reportSection_(lines, '■ 納期に遅れる見込み', vps.filter(function (v) { return v.deadline > todayYmd && isLate(v); }), function (v) {
    return shortVp_(v) + ' 納期' + mdw_(v.deadline) + '→見込み' + mdw_(endYmd(v));
  });
  reportSection_(lines, '■ 明日納期', vps.filter(function (v) { return v.deadline === tomorrowYmd; }), function (v) {
    return shortVp_(v) + (isLate(v) ? ' ※遅れ見込み' : '');
  });

  // 前営業日以降の完了（ステップを案件×視点にまとめる）
  var since = previousWorkdayStart_(now);
  var activeKeys = new Set(vps.map(function (v) { return v.projectName + '::' + v.viewpointName; }));
  var doneMap = new Map();
  (data.recentDone || []).filter(function (t) { return Number(t.completedAt) >= since; })
    .sort(function (a, b) { return (a.completedAt - b.completedAt) || ((a.stepOrder || 0) - (b.stepOrder || 0)); })
    .forEach(function (t) {
      var key = (t.projectName || '') + '::' + (t.viewpointName || '');
      var g = doneMap.get(key);
      if (!g) {
        g = { projectName: t.projectName, projectNameInternal: t.projectNameInternal, viewpointName: t.viewpointName, assignees: [], steps: [] };
        doneMap.set(key, g);
      }
      if (t.assignee && g.assignees.indexOf(t.assignee) < 0) g.assignees.push(t.assignee);
      if (t.stepName && g.steps.indexOf(t.stepName) < 0) g.steps.push(t.stepName);
      g.finished = !activeKeys.has(key);
    });
  reportSection_(lines, '■ ' + mdw_(L.fmtYMD(new Date(since))) + '以降の完了', Array.from(doneMap.values()), function (g) {
    return shortVp_(g) + (g.steps.length ? ' ' + g.steps.join('・') : '') + (g.finished ? ' →視点完了' : '');
  });

  // 本日の担当者別の予定（概要）
  var plan = new Map();
  data.scheduled.active.forEach(function (t) {
    (t.slots || []).forEach(function (s) {
      if (L.fmtYMD(s.date) !== todayYmd) return;
      var a = t.assignee || '未割当';
      if (!plan.has(a)) plan.set(a, { min: 0, first: Infinity, items: [] });
      var p = plan.get(a);
      p.min += s.endMin - s.startMin;
      var label = (t.projectName || t.projectNameInternal || '') + ' ' + (t.viewpointName || '');
      var item = p.items.find(function (x) { return x.label === label; });
      if (!item) p.items.push({ label: label, start: s.startMin });
      else if (s.startMin < item.start) item.start = s.startMin;
    });
  });
  var names = L.sortAssigneesByMaster(Array.from(plan.keys()), data.assigneeOrder);
  lines.push('');
  lines.push('■ 本日の予定（担当者別）');
  if (names.length === 0) lines.push(L.isNonWorkingDay(today) ? ' 本日は休業日です' : ' 予定なし');
  names.forEach(function (n) {
    var p = plan.get(n);
    var items = p.items.sort(function (a, b) { return a.start - b.start; }).map(function (x) { return x.label; });
    var shown = items.slice(0, 4).join(' → ') + (items.length > 4 ? ' 他' + (items.length - 4) + '件' : '');
    lines.push(' ・' + n + ' ' + (p.min / 60).toFixed(1) + 'h：' + shown);
  });

  lines.push('');
  lines.push('詳しくは「本日納期」「スケジュール」などと送ると確認できます。');
  return lines.join('\n');
}

// ============ 定時報告の設定（送り先・時刻・トリガー） ============
var REPORT_HANDLER = 'sendScheduledReport';

function getReportTargets_() {
  try { return JSON.parse(props_().getProperty('REPORT_TARGETS') || '[]'); } catch (e) { return []; }
}
function setReportTarget_(id, on) {
  if (!id) return;
  withLock_(function () {
    var ids = getReportTargets_().filter(function (x) { return x !== id; });
    if (on) ids.push(id);
    props_().setProperty('REPORT_TARGETS', JSON.stringify(ids));
  });
}
// "8" / "8,17" / "8時、17時" → [8, 17]。不正なら null（量が増えすぎないよう1日3回まで）
function parseHours_(s) {
  var parts = String(s || '').normalize('NFKC').replace(/時/g, '').split(/[,、・\s]+/).filter(Boolean);
  if (parts.length === 0 || parts.length > 3) return null;
  var hours = [];
  for (var i = 0; i < parts.length; i++) {
    if (!/^\d{1,2}$/.test(parts[i])) return null;
    var h = Number(parts[i]);
    if (h > 23) return null;
    if (hours.indexOf(h) < 0) hours.push(h);
  }
  return hours.sort(function (a, b) { return a - b; });
}
function getReportHours_() {
  return parseHours_(props_().getProperty('REPORT_HOURS') || BOT_CONFIG.DEFAULT_REPORT_HOURS) || [Number(BOT_CONFIG.DEFAULT_REPORT_HOURS)];
}
function reportTriggers_() {
  return ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === REPORT_HANDLER; });
}
function removeReportTriggers_() {
  reportTriggers_().forEach(function (t) { ScriptApp.deleteTrigger(t); });
}
// GAS の時刻トリガーは「指定した時刻の前後15分ほど」に動く
function installReportTriggers_() {
  withLock_(function () {
    removeReportTriggers_();
    getReportHours_().forEach(function (h) {
      ScriptApp.newTrigger(REPORT_HANDLER).timeBased().atHour(h).nearMinute(0).everyDays(1).create();
    });
  });
}
function ensureReportTriggers_() {
  if (reportTriggers_().length !== getReportHours_().length) installReportTriggers_();
}

function handleReportSetting_(cmd, sourceId) {
  if (cmd.type === 'reportOn') {
    setReportTarget_(sourceId, true);
    ensureReportTriggers_();
    return 'このトークに定時報告を送ります。\n\n' + reportStatusText_(sourceId);
  }
  if (cmd.type === 'reportOff') {
    setReportTarget_(sourceId, false);
    if (getReportTargets_().length === 0) removeReportTriggers_();
    return 'このトークへの定時報告を止めました。';
  }
  if (cmd.type === 'reportHours') {
    var hours = parseHours_(cmd.hours);
    if (!hours) return '時刻は 0〜23 の数字で、1日3回まで指定できます。\n例：定時報告時刻 8\n例：定時報告時刻 8,17';
    props_().setProperty('REPORT_HOURS', hours.join(','));
    if (getReportTargets_().length) installReportTriggers_();
    return '定時報告の時刻を変更しました（全トーク共通）。\n\n' + reportStatusText_(sourceId);
  }
  return reportStatusText_(sourceId);
}

function reportStatusText_(sourceId) {
  var on = getReportTargets_().indexOf(sourceId) >= 0;
  var hours = getReportHours_();
  var holidays = props_().getProperty('REPORT_ON_HOLIDAYS') === 'true';
  var lines = [
    '【定時報告の設定】',
    'このトーク：' + (on ? 'オン' : 'オフ'),
    '送信時刻：毎日 ' + hours.map(function (h) { return h + '時ごろ'; }).join('・') + (holidays ? '' : '（休業日は送りません）'),
  ];
  var need = recipientCount_(sourceId);
  lines.push('1回の報告で使う通数：' + need + '通（このトークの人数）');
  var q = getQuota_();
  if (!q) {
    lines.push('今月の送信数：取得できませんでした');
  } else if (q.limit == null) {
    lines.push('今月の送信数：' + q.used + '通（上限なしのプラン）');
  } else {
    var remaining = Math.max(0, q.limit - q.used);
    lines.push('今月の送信数：' + q.used + ' / ' + q.limit + '通（残り' + remaining + '通 → このトークへの報告 あと約' + Math.floor(remaining / need) + '回）');
  }
  lines.push('');
  lines.push('※「進捗報告」と送ると、同じ内容を通数を使わずに今すぐ見られます。');
  return lines.join('\n');
}

// ============ LINE の送信数（無料枠）・送信 ============
function lineToken_() {
  var t = props_().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  if (!t) console.error('LINE_CHANNEL_ACCESS_TOKEN が設定されていません');
  return t;
}
function lineGet_(path) {
  var token = lineToken_();
  if (!token) return null;
  var res = UrlFetchApp.fetch('https://api.line.me' + path, { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    console.warn('LINE 取得エラー ' + path + ':', res.getResponseCode(), res.getContentText());
    return null;
  }
  return JSON.parse(res.getContentText());
}
// { limit: 月の上限（無制限なら null）, used: 今月の使用数 }。取得できなければ null
function getQuota_() {
  var q = lineGet_('/v2/bot/message/quota');
  var u = lineGet_('/v2/bot/message/quota/consumption');
  if (!q || !u) return null;
  return { limit: q.type === 'limited' ? Number(q.value) : null, used: Number(u.totalUsage) || 0 };
}
// Bot から送るメッセージは「送り先の人数」で数えられる（グループなら参加人数ぶん）
function recipientCount_(id) {
  var path = /^C/.test(id) ? '/v2/bot/group/' + id + '/members/count'
    : /^R/.test(id) ? '/v2/bot/room/' + id + '/members/count' : null;
  if (!path) return 1;
  var r = lineGet_(path);
  return r && Number(r.count) > 0 ? Number(r.count) : 1;
}
function push_(to, texts) {
  var token = lineToken_();
  if (!token) return false;
  var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({
      to: to,
      messages: texts.slice(0, BOT_CONFIG.MAX_MESSAGES).map(function (t) { return { type: 'text', text: t }; }),
    }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    console.error('LINE 送信エラー:', res.getResponseCode(), res.getContentText());
    return false;
  }
  return true;
}

// 時刻トリガーから呼ばれる。データの読み込みに失敗したら例外のまま終わらせ、
// Google からオーナーへ失敗のお知らせメールが届くようにする
function sendScheduledReport() {
  var L = KouteiLib;
  var targets = getReportTargets_().filter(isAllowed_);
  if (targets.length === 0) { console.log('定時報告の送り先がありません'); return; }
  var now = new Date();
  var slotKey = L.fmtYMD(now) + '-' + now.getHours();
  if (props_().getProperty('LAST_REPORT_SLOT') === slotKey) { console.log('この時間帯の報告は送信済みです'); return; }

  var data = loadData_({ doneSince: doneFetchSince_(now) });
  if (L.isNonWorkingDay(L.startOfDay(now)) && props_().getProperty('REPORT_ON_HOLIDAYS') !== 'true') {
    console.log('休業日のため定時報告を送りません');
    return;
  }
  props_().setProperty('LAST_REPORT_SLOT', slotKey);
  var text = buildProgressReport_(data, now);
  var q = getQuota_();
  var remaining = q && q.limit != null ? q.limit - q.used : Infinity;
  targets.forEach(function (id) {
    var need = recipientCount_(id);
    if (need > remaining) {
      console.warn('今月の送信可能数が足りないため送りません: ' + id + '（必要' + need + '通・残り' + remaining + '通）');
      return;
    }
    var after = remaining - need;
    var body = text;
    if (after !== Infinity && after < need * 5) {
      body += '\n\n※今月のLINE送信可能数の残りが少なくなっています（残り' + after + '通・このトークへの報告はあと約' + Math.floor(after / need) + '回）。';
    }
    if (push_(id, splitMessages_(body))) remaining = after;
  });
}

// ============ LINE への返信 ============
function reply_(replyToken, texts) {
  var accessToken = lineToken_();
  if (!accessToken) return;
  if (!replyToken) return;
  var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + accessToken },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: texts.slice(0, BOT_CONFIG.MAX_MESSAGES).map(function (t) { return { type: 'text', text: t }; }),
    }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    console.error('LINE 返信エラー:', res.getResponseCode(), res.getContentText());
  }
}

// ============ 管理用（GAS エディタから手動実行） ============
// 初回はこれを実行して権限を承認し、実行ログで返信内容を確認する（LINE には送らない）
function testCommands() {
  var now = new Date();
  var data = loadData_({ doneSince: doneFetchSince_(now) });
  ['本日納期', '今週納期', '全体納期', '案件一覧', 'スケジュール', '進捗報告'].forEach(function (word) {
    console.log('===== ' + word + ' =====\n' + buildReply_(parseCommand_(word), data, now));
  });
  // 定時報告で使う「時刻トリガー」の権限もここで承認してもらう
  console.log('定時報告のトリガー数: ' + reportTriggers_().length);
}

// 定時報告をすぐに1回送る（動作確認用。LINE の送信数を使う）
function sendReportNow() {
  props_().deleteProperty('LAST_REPORT_SLOT');
  sendScheduledReport();
}

// 定時報告の時刻トリガーを作り直す／止める（ふだんは LINE の「定時報告オン/オフ」で自動）
function setupReportTrigger() {
  installReportTriggers_();
  console.log('定時報告のトリガーを設定しました: ' + getReportHours_().map(function (h) { return h + '時'; }).join('・'));
}
function stopReportTrigger() {
  removeReportTriggers_();
  console.log('定時報告のトリガーを止めました');
}

// 登録済みのトーク/グループをすべて解除する
function clearRegisteredIds() {
  props_().setProperty('ALLOWED_IDS', '[]');
  console.log('登録をすべて解除しました');
}
