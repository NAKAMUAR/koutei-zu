// ---- line-bot/bot.js（LINE Bot 本体。Google Apps Script 上で動く）----
// LINE で決まった言葉（本日納期・今週納期・全体納期・案件一覧・スケジュール など）を受け取ると、
// Firestore の工程図データを読み、アプリと同じスケジュール計算（KouteiLib）で返信を組み立てる。
// 設定値（スクリプトプロパティ）:
//   LINE_CHANNEL_ACCESS_TOKEN … LINE Developers で発行したチャネルアクセストークン（長期）
//   REGISTER_CODE             … トーク/グループを登録するための合言葉
//   ALLOWED_IDS               … 登録済みのトーク/グループID（Bot が自動で書き込む）

var BOT_CONFIG = {
  PROJECT_ID: 'koutei-zu',
  DATABASE_ID: 'default',
  WORKSPACE_ID: 'liebe-asia-team',
  MAX_MESSAGES: 5,     // LINE の1回の返信で送れる吹き出しの上限
  MAX_CHARS: 4800,     // 吹き出し1つの文字数上限（LINE の上限 5000 に余裕を持たせる）
  MAX_REGISTER_FAILS: 5, // 合言葉の失敗がこの回数を超えたら1時間受け付けない
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
    reply_(token, ['このトークの登録を解除しました。']);
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

  var out;
  try {
    out = buildReply_(cmd, loadData_(), new Date());
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
    '・ヘルプ … この案内',
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
function loadData_() {
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
  var res = UrlFetchApp.fetchAll([
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
  ]);
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
  return {
    settings: settings,
    scheduled: scheduled,
    projectOrder: projectOrder,
    assigneeOrder: parseArr('employeeMaster').map(function (e) { return e && e.name; }).filter(Boolean),
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

// ============ LINE への返信 ============
function reply_(replyToken, texts) {
  var accessToken = props_().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  if (!accessToken) { console.error('LINE_CHANNEL_ACCESS_TOKEN が設定されていません'); return; }
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
  var data = loadData_();
  var now = new Date();
  ['本日納期', '今週納期', '全体納期', '案件一覧', 'スケジュール'].forEach(function (word) {
    console.log('===== ' + word + ' =====\n' + buildReply_(parseCommand_(word), data, now));
  });
}

// 登録済みのトーク/グループをすべて解除する
function clearRegisteredIds() {
  props_().setProperty('ALLOWED_IDS', '[]');
  console.log('登録をすべて解除しました');
}
