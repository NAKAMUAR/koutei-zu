// ---- line-bot/gemini.js（Gemini による自由な質問・照合）----
// Gemini には工程図のデータを丸ごと渡さず、「どのデータを見るか」をツール（関数呼び出し）で選ばせる。
// ツールの中身は LINE・Discord と同じ集計（bot.js の build*_）なので、数字や日付は工程図の計算どおりになる。
// Gemini は見るだけで、工程図のデータを書き換える手段は持たない。
// 設定値（スクリプトプロパティ）:
//   GEMINI_API_KEY … Google AI Studio で発行した API キー
//   GEMINI_MODEL   … 使うモデル（省略時は BOT_CONFIG.GEMINI_DEFAULT_MODEL）
/* global BOT_CONFIG, KouteiLib, props_, loadData_, projectDoneSince_, buildDeadlineReply_, buildProjectsReply_,
   buildProjectDetail_, buildScheduleReply_, buildProgressReport_, buildWorkload_, mdw_ */

var GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/';

var GEMINI_TOOLS = [{
  functionDeclarations: [
    {
      name: 'get_deadlines',
      description: '未完了の視点（制作物）を納期で絞り込んで返す。納期を過ぎた未完了も含む（tomorrow・next_week 以外）。各視点の担当者・完了見込み（自動計算）・遅れ見込みつき。',
      parameters: {
        type: 'OBJECT',
        properties: { range: { type: 'STRING', enum: ['today', 'tomorrow', 'this_week', 'next_week', 'all'], description: 'today=本日, tomorrow=明日, this_week=今日〜今週日曜, next_week=来週月〜日, all=納期のある全件' } },
        required: ['range'],
      },
    },
    {
      name: 'get_project_list',
      description: '進行中の案件の一覧（会社別。全体納期・視点名・担当者・完了見込み）。制作中断中の案件名も含む。',
    },
    {
      name: 'get_project_detail',
      description: '案件名（の一部、社内案件名でも可）で案件を探し、視点ごとの工程（完了日・残り時間）・担当・納期・完了見込みを返す。直近60日に完了した案件も探せる。特定の案件の確認や、ユーザーが貼り付けた情報との照合に使う。',
      parameters: {
        type: 'OBJECT',
        properties: { keyword: { type: 'STRING', description: '案件名の一部。例: 渋谷' } },
        required: ['keyword'],
      },
    },
    {
      name: 'get_schedule',
      description: '指定した日の担当者別の作業予定（開始・終了時刻、案件・視点・工程）。今日から30日先まで。',
      parameters: {
        type: 'OBJECT',
        properties: {
          date: { type: 'STRING', description: '日付 YYYY-MM-DD' },
          assignee: { type: 'STRING', description: '担当者名で絞り込む（名前の一部でよい。省略で全員）' },
        },
        required: ['date'],
      },
    },
    {
      name: 'get_progress_report',
      description: '進捗のまとめ：本日納期・納期超過・納期に遅れる見込み・明日納期・前営業日以降に完了した作業・本日の担当者別の予定。',
    },
    {
      name: 'get_workload',
      description: '担当者ごとの今後の予定時間と空き時間（営業日ベース）。誰が空いているか・忙しいかの確認に使う。',
      parameters: {
        type: 'OBJECT',
        properties: { days: { type: 'INTEGER', description: '今日から数える営業日数（1〜14。既定5）' } },
      },
    },
  ],
}];

function geminiSystemPrompt_(now) {
  var L = KouteiLib;
  var ymd = L.fmtYMD(now);
  return [
    'あなたは建築CG制作チームの工程管理アプリ「工程図」の確認係です。',
    '今日は ' + ymd + '（' + mdw_(ymd) + '）、現在時刻は ' + L.minToTime(now.getHours() * 60 + now.getMinutes()) + '（ベトナム時間）です。',
    '- 工程図のデータは必ずツールで取得し、ツールの結果だけを根拠に答えてください。推測や一般論で補わないでください。',
    '- データに無いことは「工程図には見当たりません」と答えてください。',
    '- ユーザーが貼り付けた予定・納期・案件などを工程図と照合するよう求められたら、項目ごとに「一致」「相違（工程図では〜）」「工程図に無い」に分けて示してください。',
    '- 「完了見込み」はアプリの自動計算による予定で、確定ではないことを必要に応じて添えてください。',
    '- 日付は M/D(曜) の形で書いてください。',
    '- 回答はユーザーと同じ言語（日本語・ベトナム語など）で、チャットで読みやすいよう簡潔に。長い一覧は要点に絞ってください。',
    '- あなたは工程図を見ることしかできません。登録・修正・削除を頼まれたら、アプリで操作するよう案内してください。',
  ].join('\n');
}

function runGeminiTool_(name, args, getData, now) {
  var L = KouteiLib;
  args = args || {};
  if (name === 'get_deadlines') {
    var map = { today: 'today', tomorrow: 'tomorrow', this_week: 'thisWeek', next_week: 'nextWeek', all: 'all' };
    return buildDeadlineReply_(map[args.range] || 'today', getData(), now);
  }
  if (name === 'get_project_list') return buildProjectsReply_(getData());
  if (name === 'get_project_detail') return buildProjectDetail_(String(args.keyword || ''), getData(), now);
  if (name === 'get_schedule') {
    var d = L.parseYMD(String(args.date || ''));
    if (!d) return 'エラー: date は YYYY-MM-DD で指定してください。';
    var offset = Math.round((L.startOfDay(d).getTime() - L.startOfDay(now).getTime()) / 86400000);
    if (offset < 0 || offset > 30) return 'エラー: 予定を確認できるのは今日から30日先までです（過去の予定は残っていません）。';
    return buildScheduleReply_({ dayOffset: offset, assignee: String(args.assignee || '') }, getData(), now);
  }
  if (name === 'get_progress_report') return buildProgressReport_(getData(), now);
  if (name === 'get_workload') return buildWorkload_(getData(), now, args.days || 5);
  return 'エラー: 不明なツール ' + name;
}

function GeminiError_(message, userMessage) {
  var e = new Error(message);
  e.userMessage = userMessage;
  return e;
}

function callGemini_(apiKey, contents, now, noMoreTools) {
  var body = {
    systemInstruction: { parts: [{ text: geminiSystemPrompt_(now) }] },
    contents: contents,
    tools: GEMINI_TOOLS,
    generationConfig: { temperature: 0.2 },
  };
  if (noMoreTools) body.toolConfig = { functionCallingConfig: { mode: 'NONE' } };
  var model = props_().getProperty('GEMINI_MODEL') || BOT_CONFIG.GEMINI_DEFAULT_MODEL;
  var res = UrlFetchApp.fetch(GEMINI_API + encodeURIComponent(model) + ':generateContent', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': apiKey },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });
  var code = res.getResponseCode();
  if (code === 429) {
    throw GeminiError_('Gemini 429: ' + res.getContentText().slice(0, 300),
      'Gemini の利用回数の上限（無料枠）に達しました。少し時間をおくか、/納期 などの決まったコマンドをお使いください。');
  }
  if (code !== 200) {
    throw GeminiError_('Gemini ' + code + ': ' + res.getContentText().slice(0, 300),
      'Gemini に問い合わせできませんでした（エラー ' + code + '）。');
  }
  var data = JSON.parse(res.getContentText());
  var cand = data.candidates && data.candidates[0];
  if (!cand || !cand.content) {
    var reason = (data.promptFeedback && data.promptFeedback.blockReason) || (cand && cand.finishReason) || 'unknown';
    throw GeminiError_('Gemini の応答が空: ' + reason, 'Gemini が回答を返しませんでした（' + reason + '）。質問の言い方を変えてお試しください。');
  }
  return cand;
}

// 質問に答える。戻り値 { text, tools: 使ったツール名の配列 }
function askGemini_(question, now) {
  var apiKey = props_().getProperty('GEMINI_API_KEY');
  if (!apiKey) return { text: 'Gemini の APIキー（GEMINI_API_KEY）が設定されていません。管理者に連絡してください。', tools: [] };
  var cached = null;
  // 1回の質問でデータを読むのは1回だけ（ツールを何度呼ばれても Firestore の読み取りを増やさない）
  var getData = function () {
    if (!cached) cached = loadData_({ doneSince: projectDoneSince_(now) });
    return cached;
  };
  var contents = [{ role: 'user', parts: [{ text: String(question || '') }] }];
  var used = [];
  for (var round = 0; round < BOT_CONFIG.GEMINI_MAX_ROUNDS; round++) {
    var cand = callGemini_(apiKey, contents, now, round === BOT_CONFIG.GEMINI_MAX_ROUNDS - 1);
    var parts = cand.content.parts || [];
    var calls = parts.filter(function (p) { return p.functionCall; });
    if (!calls.length) {
      var text = parts.filter(function (p) { return p.text && !p.thought; }).map(function (p) { return p.text; }).join('').trim();
      return { text: text || '（回答を作れませんでした。質問の言い方を変えてお試しください）', tools: used };
    }
    // モデルの発言は署名（thoughtSignature 等）ごとそのまま戻す必要がある
    contents.push(cand.content);
    contents.push({
      role: 'user',
      parts: calls.map(function (p) {
        var fc = p.functionCall;
        used.push(fc.name);
        var result;
        try { result = runGeminiTool_(fc.name, fc.args, getData, now); } catch (err) {
          console.error('Gemini ツールエラー:', err && err.stack ? err.stack : err);
          result = 'エラー: データを取得できませんでした（' + String(err && err.message || err).slice(0, 200) + '）';
        }
        var fr = { name: fc.name, response: { result: result } };
        if (fc.id) fr.id = fc.id;
        return { functionResponse: fr };
      }),
    });
  }
  return { text: '（回答を作れませんでした。質問を短くしてお試しください）', tools: used };
}
