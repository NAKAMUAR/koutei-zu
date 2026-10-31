// ---- line-bot/discord.js（Discord Bot：Apps Script 側）----
// Discord の「/コマンド」は Cloudflare Worker（discord-bot/worker.js）が受け取って署名を確かめ、
// { relay: 'discord', secret, interaction } の形でここ（doPost）へ中継する。
// ここで工程図を読み、答えを Discord の Webhook（interaction token）で書き込む。
// 設定値（スクリプトプロパティ）:
//   RELAY_SECRET           … Worker と共有する合言葉（makeRelaySecret で作る）
//   DISCORD_BOT_TOKEN      … コマンド登録（registerDiscordCommands）にだけ使う Bot のトークン
//   DISCORD_GUILD_ID       … 使ってよい Discord サーバーのID（複数ならカンマ区切り）
//   DISCORD_APPLICATION_ID … registerDiscordCommands が自動で書き込む
/* global KouteiLib, props_, loadData_, doneFetchSince_, projectDoneSince_, splitMessages_,
   buildDeadlineReply_, buildProjectsReply_, buildProjectDetail_, buildScheduleReply_, buildProgressReport_,
   buildWorkload_, viewpointsOf_, projectIndexer_, tsLabel_, askGemini_ */

var DISCORD_API = 'https://discord.com/api/v10';
var DISCORD_MAX_CHARS = 1900;  // Discord の1メッセージ上限 2000 字に余裕を持たせる
var DISCORD_MAX_MESSAGES = 5;

var DISCORD_COMMANDS = [
  {
    name: '納期', description: '納期が近い・過ぎている未完了の視点',
    options: [{
      type: 3, name: '範囲', description: 'いつの納期か（省略で本日）', required: false,
      choices: [
        { name: '本日', value: 'today' }, { name: '明日', value: 'tomorrow' }, { name: '今週', value: 'thisWeek' },
        { name: '来週', value: 'nextWeek' }, { name: '全体', value: 'all' },
      ],
    }],
  },
  { name: '案件一覧', description: '進行中の案件（会社別・全体納期・担当・完了見込み）' },
  {
    name: '案件', description: '案件の詳細（視点ごとの工程・担当・納期・完了見込み）',
    options: [{ type: 3, name: '名前', description: '案件名の一部（社内案件名でも可）', required: true, max_length: 100 }],
  },
  {
    name: 'スケジュール', description: '担当者別の作業予定',
    options: [
      { type: 3, name: '日', description: 'いつの予定か（省略で本日）', required: false, choices: [{ name: '本日', value: '0' }, { name: '明日', value: '1' }, { name: 'あさって', value: '2' }] },
      { type: 3, name: '担当者', description: '担当者名で絞り込み（名前の一部でOK）', required: false, max_length: 50 },
    ],
  },
  {
    name: '空き状況', description: '担当者ごとの今後の予定時間と空き時間',
    options: [{ type: 4, name: '日数', description: '今日から数える営業日数（省略で5）', required: false, min_value: 1, max_value: 14 }],
  },
  { name: '進捗報告', description: '本日納期・納期超過・遅れ見込み・最近の完了・本日の予定のまとめ' },
  {
    name: '質問', description: '工程図について自由に質問・照合（AI が工程図のデータを見て答えます）',
    options: [{ type: 3, name: '内容', description: '例：渋谷マンションは今週中に終わる？／下の予定と工程図を照合して…', required: true, max_length: 4000 }],
  },
  {
    name: '書き出し', description: '工程図の情報を CSV ファイル（Excel・スプレッドシートで開ける）で書き出す',
    options: [{
      type: 3, name: '内容', description: '書き出す内容', required: true,
      choices: [
        { name: '進行中の視点一覧', value: 'viewpoints' },
        { name: '今後2週間の予定', value: 'schedule' },
        { name: '直近30日の完了実績', value: 'done' },
      ],
    }],
  },
  { name: 'ヘルプ', description: '工程図Botの使い方' },
];

// ============ 受付（Worker からの中継） ============
function discordGuildIds_() {
  return String(props_().getProperty('DISCORD_GUILD_ID') || '').split(/[,\s]+/).filter(Boolean);
}

function handleDiscordRelay_(body) {
  var p = props_();
  var secret = p.getProperty('RELAY_SECRET');
  if (!secret || body.secret !== secret) {
    console.warn('Discord 中継: 合言葉（RELAY_SECRET）が一致しないため拒否しました');
    return { ok: false, error: '合言葉（RELAY_SECRET）が一致しません' };
  }
  var i = body.interaction || {};
  var appId = p.getProperty('DISCORD_APPLICATION_ID');
  if (!appId || i.application_id !== appId) {
    return { ok: false, error: 'アプリID が一致しません（registerDiscordCommands を実行してください）' };
  }
  if (!i.guild_id || discordGuildIds_().indexOf(i.guild_id) < 0) {
    sendDiscord_(i, { text: 'このサーバー（またはDM）では工程図Botを使えません。' });
    return { ok: true };
  }
  var out;
  try {
    out = runDiscordCommand_(i, new Date());
  } catch (err) {
    console.error('Discord コマンドエラー:', err && err.stack ? err.stack : err);
    out = err && err.userMessage ? { text: err.userMessage } : {
      markdown: true,
      text: 'データの取得に失敗しました。時間をおいてもう一度お試しください。\n-# 管理者向け: ' + escapeDiscord_(String(err && err.message || err).slice(0, 200)),
    };
  }
  sendDiscord_(i, out);
  return { ok: true };
}

function discordOptions_(i) {
  var out = {};
  ((i.data && i.data.options) || []).forEach(function (o) { out[o.name] = o.value; });
  return out;
}

// 戻り値 { text, markdown（true なら Gemini の書式をそのまま出す）, file: { name, content } }
function runDiscordCommand_(i, now) {
  var name = i.data && i.data.name;
  var o = discordOptions_(i);
  if (name === '納期') return { text: buildDeadlineReply_(o['範囲'] || 'today', loadData_(), now) };
  if (name === '案件一覧') return { text: buildProjectsReply_(loadData_()) };
  if (name === '案件') return { text: buildProjectDetail_(String(o['名前'] || ''), loadData_({ doneSince: projectDoneSince_(now) }), now) };
  if (name === 'スケジュール') {
    return { text: buildScheduleReply_({ dayOffset: Number(o['日'] || 0), assignee: String(o['担当者'] || '') }, loadData_(), now) };
  }
  if (name === '空き状況') return { text: buildWorkload_(loadData_(), now, o['日数'] || 5) };
  if (name === '進捗報告') return { text: buildProgressReport_(loadData_({ doneSince: doneFetchSince_(now) }), now) };
  if (name === '質問') {
    var q = String(o['内容'] || '');
    var ans = askGemini_(q, now);
    var quoted = q.length > 300 ? q.slice(0, 300) + '…' : q;
    return {
      markdown: true,
      text: quoted.split('\n').map(function (l) { return '> ' + escapeDiscord_(l); }).join('\n') + '\n' + ans.text
        + '\n-# AI（Gemini）の回答です。正確な一覧は /納期 /案件 などで確認できます。',
    };
  }
  if (name === '書き出し') return buildExport_(o['内容'], now);
  return { text: discordHelpText_() };
}

function discordHelpText_() {
  return [
    '【工程図Bot（Discord）の使い方】',
    '「/」を入力するとコマンドの一覧が出ます。',
    '',
    '/納期 範囲 … 本日・明日・今週・来週・全体の納期（未完了）',
    '/案件一覧 … 進行中の案件（会社別）',
    '/案件 名前 … 案件の詳細（視点ごとの工程・担当・納期・完了見込み）',
    '/スケジュール 日 担当者 … 担当者別の作業予定',
    '/空き状況 日数 … 担当者ごとの予定時間と空き時間',
    '/進捗報告 … 進捗のまとめ',
    '/質問 内容 … 自由な質問・照合（AI が工程図のデータを見て答えます）',
    '/書き出し 内容 … CSV ファイルで書き出し',
    '',
    '※工程図は見るだけです（Bot から登録・変更はしません）。',
    '※「完了見込み」はアプリと同じ計算による予定です。',
  ].join('\n');
}

// ============ CSV 書き出し ============
function csvCell_(v) {
  var s = v == null ? '' : String(v);
  // 表計算ソフトで数式として実行されないよう、= + - @ で始まる文字（数値以外）には ' を付ける
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCsv_(rows) {
  // 先頭の BOM で Excel でも文字化けしない
  return '\uFEFF' + rows.map(function (r) { return r.map(csvCell_).join(','); }).join('\r\n') + '\r\n';
}

function buildExport_(kind, now) {
  var L = KouteiLib;
  var ymd = L.fmtYMD(now);
  var rows, title, file;
  if (kind === 'viewpoints') {
    var data = loadData_();
    var projIdx = projectIndexer_(data);
    var vps = viewpointsOf_(data.scheduled.active).sort(function (a, b) {
      return (a.deadline || '9999').localeCompare(b.deadline || '9999') || (projIdx(a.projectName) - projIdx(b.projectName))
        || a.viewpointName.localeCompare(b.viewpointName, 'ja', { numeric: true });
    });
    rows = [['会社', '社外案件名', '社内案件名', '視点', '担当', '未完了の工程', '残り作業(h)', '納期', '全体納期', '完了見込み', '納期遅れ見込み']];
    vps.forEach(function (v) {
      var late = v.deadline && v.endTs != null && L.fmtYMD(new Date(v.endTs)) > v.deadline;
      rows.push([v.companyName, v.projectName, v.projectNameInternal, v.viewpointName, v.assignees.join('・'), v.pendingSteps.join('・'),
        v.remainingHours.toFixed(1), v.deadline, v.projectDeadline, v.endTs == null ? '' : L.fmtYMD(new Date(v.endTs)) + ' ' + tsLabel_(v.endTs).split(' ')[1],
        late ? '遅れ見込み' : '']);
    });
    var suspended = data.scheduled.suspended || [];
    viewpointsOf_(suspended).forEach(function (v) {
      rows.push([v.companyName, v.projectName, v.projectNameInternal, v.viewpointName, v.assignees.join('・'), v.pendingSteps.join('・'),
        '', v.deadline, v.projectDeadline, '制作中断中', '']);
    });
    title = '進行中の視点一覧（' + vps.length + '件' + (suspended.length ? '＋制作中断中' : '') + '）';
    file = 'koutei_viewpoints_' + ymd + '.csv';
  } else if (kind === 'schedule') {
    var sd = loadData_();
    var end = L.fmtYMD(L.addDays(L.startOfDay(now), 13));
    rows = [['日付', '曜日', '担当', '開始', '終了', '時間(h)', '会社', '社外案件名', '視点', '工程']];
    var items = [];
    sd.scheduled.active.forEach(function (t) {
      (t.slots || []).forEach(function (s) {
        var d = L.fmtYMD(s.date);
        if (d < ymd || d > end) return;
        items.push({ d: d, s: s, t: t });
      });
    });
    var order = new Map(L.sortAssigneesByMaster(Array.from(new Set(items.map(function (x) { return x.t.assignee || ''; }))), sd.assigneeOrder)
      .map(function (n, idx) { return [n, idx]; }));
    items.sort(function (a, b) { return a.d.localeCompare(b.d) || (order.get(a.t.assignee || '') - order.get(b.t.assignee || '')) || (a.s.startMin - b.s.startMin); });
    items.forEach(function (x) {
      rows.push([x.d, L.dayName(x.s.date), x.t.assignee || '', L.minToTime(x.s.startMin), L.minToTime(x.s.endMin), ((x.s.endMin - x.s.startMin) / 60).toFixed(1),
        x.t.companyName || '', x.t.projectName || x.t.projectNameInternal || '', x.t.viewpointName || '', x.t.stepName || '']);
    });
    title = '今後2週間の予定（' + (rows.length - 1) + '行）';
    file = 'koutei_schedule_' + ymd + '.csv';
  } else if (kind === 'done') {
    var since = L.addDays(L.startOfDay(now), -30).getTime();
    var dd = loadData_({ doneSince: since });
    var done = dd.recentDone.slice().sort(function (a, b) { return (Number(a.completedAt) || 0) - (Number(b.completedAt) || 0); });
    rows = [['完了日', '担当', '会社', '社外案件名', '社内案件名', '視点', '工程', '作業時間(h)']];
    done.forEach(function (t) {
      rows.push([L.fmtYMD(new Date(Number(t.completedAt))), t.assignee || '', t.companyName || '', t.projectName || '', t.projectNameInternal || '',
        t.viewpointName || '', t.stepName || '', (Number(t.hours) || 0).toFixed(1)]);
    });
    title = '直近30日の完了実績（' + done.length + '件・中止を除く）';
    file = 'koutei_done_' + ymd + '.csv';
  } else {
    return { text: '書き出す内容を選んでください。' };
  }
  return { text: '【書き出し】' + title + '\nファイルは Excel やGoogle スプレッドシートで開けます。', file: { name: file, content: toCsv_(rows) } };
}

// ============ Discord への書き込み ============
// 工程図の文字（案件名など）に含まれる * _ ~ ` | などを、Discord の書式として解釈させない
function escapeDiscord_(s) {
  return String(s).replace(/([\\*_~`|])/g, '\\$1').replace(/^([#>-])/gm, '\\$1');
}
function formatForDiscord_(text) {
  return escapeDiscord_(text).replace(/^(【[^\n]*)$/gm, '**$1**');
}

function discordFetch_(method, path, payload, botToken) {
  var params = { method: method, muteHttpExceptions: true };
  if (botToken) params.headers = { Authorization: 'Bot ' + botToken };
  if (payload && payload.files) {
    params.payload = payload.files;
  } else if (payload) {
    params.contentType = 'application/json';
    params.payload = JSON.stringify(payload);
  }
  var res = UrlFetchApp.fetch(DISCORD_API + path, params);
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Discord ' + method.toUpperCase() + ' ' + path.replace(/\/webhooks\/\d+\/[^/]+/, '/webhooks/…') + ' → ' + code + ': ' + res.getContentText().slice(0, 300));
  }
  return code === 204 ? null : JSON.parse(res.getContentText() || 'null');
}

// 考え中（deferred）の返事を答えに書き換え、長ければ続きを追加で送る。ファイルは最後に添付する
function sendDiscord_(i, out) {
  var hook = '/webhooks/' + i.application_id + '/' + i.token;
  var text = out.markdown ? String(out.text) : formatForDiscord_(out.text);
  var chunks = splitMessages_(text, DISCORD_MAX_CHARS, DISCORD_MAX_MESSAGES);
  var noPing = { parse: [] }; // @everyone などで通知が飛ばないようにする
  try {
    discordFetch_('patch', hook + '/messages/@original', { content: chunks[0], allowed_mentions: noPing });
    for (var k = 1; k < chunks.length; k++) discordFetch_('post', hook, { content: chunks[k], allowed_mentions: noPing });
    if (out.file) {
      var blob = Utilities.newBlob('', 'text/csv', out.file.name).setDataFromString(out.file.content, 'UTF-8');
      discordFetch_('post', hook, {
        files: {
          payload_json: JSON.stringify({ allowed_mentions: noPing, attachments: [{ id: 0, filename: out.file.name }] }),
          'files[0]': blob,
        },
      });
    }
  } catch (err) {
    console.error('Discord への書き込みエラー:', err && err.stack ? err.stack : err);
  }
}

// ============ 管理用（GAS エディタから手動実行） ============
// Worker と共有する合言葉を作る。実行ログに出た値を Cloudflare の RELAY_SECRET に貼る
function makeRelaySecret() {
  var p = props_();
  var s = p.getProperty('RELAY_SECRET');
  if (!s) {
    s = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
    p.setProperty('RELAY_SECRET', s);
  }
  console.log('RELAY_SECRET（Cloudflare の Worker に同じ値を設定してください）:\n' + s);
}

// Discord サーバーに「/納期」などのコマンドを登録する（コマンドを変えたときも再実行）
function registerDiscordCommands() {
  var token = props_().getProperty('DISCORD_BOT_TOKEN');
  var guilds = discordGuildIds_();
  if (!token || !guilds.length) throw new Error('スクリプトプロパティに DISCORD_BOT_TOKEN と DISCORD_GUILD_ID を設定してください');
  var app = discordFetch_('get', '/applications/@me', null, token);
  props_().setProperty('DISCORD_APPLICATION_ID', app.id);
  guilds.forEach(function (g) {
    discordFetch_('put', '/applications/' + app.id + '/guilds/' + g + '/commands', DISCORD_COMMANDS, token);
    console.log('サーバー ' + g + ' にコマンドを登録しました: ' + DISCORD_COMMANDS.map(function (c) { return '/' + c.name; }).join(' '));
  });
}

// Discord に送らずに、各コマンドの答えを実行ログで確認する（Gemini は GEMINI_API_KEY があるときだけ）
function testDiscordCommands() {
  var now = new Date();
  var cmd = function (name, options) {
    return { data: { name: name, options: Object.keys(options || {}).map(function (k) { return { name: k, value: options[k] }; }) } };
  };
  [
    cmd('納期', { '範囲': 'thisWeek' }), cmd('案件一覧'), cmd('空き状況', { '日数': 3 }), cmd('進捗報告'),
    cmd('書き出し', { '内容': 'viewpoints' }),
  ].concat(props_().getProperty('GEMINI_API_KEY') ? [cmd('質問', { '内容': '今週納期で遅れそうな案件はある？' })] : [])
    .forEach(function (i) {
      var out = runDiscordCommand_(i, now);
      console.log('===== /' + i.data.name + ' =====\n' + out.text + (out.file ? '\n[添付] ' + out.file.name + '（' + out.file.content.split('\r\n').length + '行）' : ''));
    });
}
