/**
 * 工程図（koutei-zu）連携シート用 Apps Script
 *
 * このスクリプトは「工程図連携」スプレッドシート（スタッフには共有しない別ファイル）に貼り付けて使う。
 *
 * 流れ:
 *   0. 最初に1回だけ、メニュー「0. かんたん初期設定」で 管理者シートの整備・読み込み先の切り替え・
 *      エンジニア入力シートの整備（日本語／ベトナム語の見出し・プルダウン・記入ルール）・接続テスト をまとめて行う
 *   1. エンジニアが「工程図 エンジニア入力シート」（別ファイル）の『入力シート』タブに1視点1行で書く
 *      会社コード（REN/RIC…）・案件番号・社外案件名・サーバーリンク・新規or修正・視点（EX1/IN1/EXCB1…）・
 *      パターン（A/B…）・White/Color/pts の時間・メモ
 *      （旧「product schedule」タブや旧「Project Schedule」の『案件シート(一覧)』も読める。列は見出し名で探す）
 *   2. 30分ごとの自動実行（または「転記」ボタン）で『連携』タブへ新しい行・変わった行だけ反映し（入力日＝最初に転記した日）、
 *      『案件マスタ』『会社マスタ』『視点マスタ』で 会社名・お客様担当者・区分（外観目線など）・
 *      種類（パース/写真合成/モデル/VR/動画）・社外視点名（外観目線視点①）を自動判定。記入途中の行（時間が空など）は待つ
 *   3. 自動判定がすべてできた「未送信」の行は、同じ自動実行で工程図へ自動登録（入力ミスを直す時間として25分待つ）。
 *      「要確認」「更新あり」の行は、人が『連携』タブで直して「工程図へ」にチェックすると次の自動実行（または送信ボタン）で登録
 *   4. 工程図（Firestore）にタスクとして登録
 *      - White → 「ホワイト」、Color → 「カラー」、pts → 「人物＋添景合成」のステップ
 *      - パース以外（写真合成・モデル・VR・動画）は1ステップ（時間は合計）
 *      - 『会社マスタ』にあって工程図の顧客マスタに無い会社は、顧客マスタに追加してから登録
 *      - 「修正」の行は「修正」ステップとして同じ視点に追加（有料の変更は人が「変更（有料）」に直す）
 *      - 種類（新規/追加/修正）は売上・帳票の「初回/追加/修正」として登録（金額は工程図側で入力）
 *      - 登録後の担当者・優先度・完了時間・状態は工程図側が正。シートからは上書きしない
 *      - 工程図側で削除したタスク（deletedExternalIds）は復活させない
 *
 * 認証:
 *   - 通常は、このスクリプトを実行する Google アカウント（工程図の Firebase プロジェクトのオーナー）の権限で
 *     Firestore REST API にアクセスする（ScriptApp.getOAuthToken）。Firestore ルールはこの経路には適用されない。
 *   - それが使えない環境では、メニュー「秘密鍵を設定」でサービスアカウントの鍵（JSON）を
 *     スクリプトプロパティに保存して使う（シートには書かない）。
 *
 * 設定値は『設定』タブから読む。列の位置は見出し名で探すので、『連携』タブの列の順番は変えてよい（見出しの文字は変えない）。
 */

// ============ 定数 ============
const SHEET = { LINK: '連携', REG: '案件登録', COMPANY: '会社マスタ', VIEW: '視点マスタ', PROJECT: '案件マスタ', SETTINGS: '設定', HOWTO: '使い方' };
const STAFF_TAB_DEFAULT = '入力シート';
const STAFF_RULES_TAB = '記入ルール/説明';

// 『連携』タブの見出し（列は見出し名で探す）
const H = {
  key: '取込キー', status: '状態', send: '工程図へ', inputDate: '入力日',
  code: '社内案件名', name: '社外案件名', cut: '視点名', pattern: 'パターン', extName: '社外視点名', round: '回', request: '新規or修正', deadline: '納期',
  white: 'ホワイト時間', color: 'カラー時間', other: 'その他時間', item: '制作項目', note: '元シート備考',
  company: '会社名', contact: 'お客様担当者', category: '区分', kind: '種類', stepKind: 'ステップ種類',
  assignee: '担当者', memo: 'メモ', exclude: '対象外',
  transferredAt: '転記日時', sentAt: '送信日時', result: '結果', srcRow: '元シート行', link: 'サーバリンク',
  split: '作業の分け方',
};
// 旧バージョンの見出し（そのまま使えるように別名として受け付ける）
const H_ALIASES = { cut: ['カット名'], white: ['White時間'], color: ['Color時間'] };
const LINK_HEADER_ORDER = ['key', 'status', 'send', 'inputDate', 'code', 'name', 'cut', 'pattern', 'extName', 'round', 'request', 'deadline',
  'white', 'color', 'other', 'item', 'note', 'company', 'contact', 'category', 'kind', 'stepKind', 'assignee', 'memo', 'exclude',
  'transferredAt', 'sentAt', 'result', 'srcRow', 'link', 'split'];

const STATUS = { NEW: '未送信', CHECK: '要確認', UPDATED: '更新あり', SENT: '登録済み', ERROR: 'エラー', GONE: '元シートから消えた' };
const KIND = { PERS: 'パース', PHOTO: '写真合成', MODEL: 'モデル', VR: 'VR', VIDEO: '動画' };
// パース以外の種類は1ステップで登録する：[ステップ名, 取込キーの末尾]。表に無い種類は、種類名のステップにする
const SINGLE_STEP = { '写真合成': ['写真合成', 'photo'], 'モデル': ['モデル作成', 'model'], 'VR': ['VR制作', 'vr'], '動画': ['動画制作', 'video'] };
const CATEGORY = { EX: '外観', IN: '内観' };
const STEP_KIND = { NEW: '新規', ADD: '追加', FIX: '修正（無料）', CHANGE: '変更（有料）' };
// 工程図の売上・帳票で使う「納品種類」（viewpointUtils.js の ROUND_TYPES と同じ id）
const ROUND_TYPE_BY_STEP_KIND = { '新規': 'initial', '追加': 'add', '修正（無料）': 'fix', '変更（有料）': 'fix' };
const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';

// 工程図のステップ種類マスタ（アプリ側 DEFAULT_STEP_TYPES と同じ）。工程図に保存済みのマスタがあればそちらを優先する。
const DEFAULT_STEP_TYPES = [
  { id: 'white',        label: 'ホワイト',            paid: true,  deliveryBase: '白色', numbered: false },
  { id: 'color',        label: 'カラー',              paid: true,  deliveryBase: '色付', numbered: false },
  { id: 'person_scene', label: '人物＋添景合成',       paid: true,  deliveryBase: '',     numbered: false },
  { id: 'white_fix',    label: 'ホワイト修正（無料）', paid: false, deliveryBase: '白色', numbered: true },
  { id: 'white_change', label: 'ホワイト変更（有料）', paid: true,  deliveryBase: '白色', numbered: true },
  { id: 'color_fix',    label: 'カラー修正（無料）',   paid: false, deliveryBase: '色付', numbered: true },
  { id: 'color_change', label: 'カラー変更（有料）',   paid: true,  deliveryBase: '色付', numbered: true },
];

// 『設定』タブの項目名と既定値
const SETTING_KEYS = {
  fileId: 'スタッフシートのファイルID',
  tabName: 'スタッフシートのタブ名',
  startRow: '取込開始行',
  defaultAssignee: '既定の担当者',
  assigneeWhite: '既定の担当者（ホワイト）',
  assigneeColor: '既定の担当者（カラー）',
  assigneeOther: '既定の担当者（pts）',
  assigneeSingle: '既定の担当者（写真合成・モデル・VR・動画）',
  projectId: 'FirebaseプロジェクトID',
  workspaceId: 'ワークスペースID',
  autoSend: '自動登録',
  autoWait: '自動登録の待ち時間（分）',
  notify: '時間計算の催促（Discord）',
  notifyFirst: '催促するまでの時間（時間）',
  notifyRepeat: '催促のくり返し（時間）',
  notifyHours: '催促する時間帯（ベトナム時間）',
  regMessage: '登録時の連絡文',
  calcMinutes: '制作時間の計算の期限（登録から・分）',
  interpMessage: '通訳向けの連絡文',
  manualRun: '今すぐ全部連携（チェックで実行）',
  lastAuto: '最後の自動実行',
};
const SETTING_DEFAULTS = {
  fileId: '1BjPKtiHLsYuWcyKLg8FzB4zhmhq5Y5kI8Z2JOXVJuyo', // 「工程図 エンジニア入力シート」
  tabName: STAFF_TAB_DEFAULT,
  startRow: 2,
  defaultAssignee: '未割当',
  assigneeWhite: '',
  assigneeColor: '',
  assigneeOther: '',
  assigneeSingle: '',
  projectId: 'koutei-zu',
  workspaceId: 'liebe-asia-team',
  autoSend: 'する',
  autoWait: 25,
  notify: 'する',
  notifyFirst: 2,
  notifyRepeat: 1,
  notifyHours: '8-20',
  regMessage: '{社内案件名}の資料を共有します。\n{サーバーリンク}\n\n{計算期限}までに制作時間の計算をお願いします。',
  calcMinutes: 75,
  interpMessage: '{社内案件名}（{社外案件名}）の資料の翻訳をお願いします。\n{サーバーリンク}\n視点：{視点一覧}\n{通訳へのメッセージ}\n\n翻訳が終わったら、エンジニア入力シートの「翻訳済み」にチェックしてください。',
  manualRun: false,
  lastAuto: '',
};
const SETTING_NOTES = {
  fileId: '「工程図 エンジニア入力シート」のURLの /d/ と /edit の間の文字列',
  tabName: 'エンジニアが書くタブの名前（見出し「会社コード」「案件番号」の行より下を読みます）',
  startRow: 'この行より上は取り込みません。旧レイアウト『案件シート(一覧)』を読むときは 4800 などにする',
  defaultAssignee: '『連携』の担当者が空のときに使う名前。工程図で後から変更できます',
  assigneeWhite: '『連携』（『案件登録』）の担当者が空で、その視点が初めてのとき、ホワイトの作業に付ける担当者（空なら「既定の担当者」）',
  assigneeColor: 'カラーの作業に付ける担当者（同上）',
  assigneeOther: 'pts（人物＋添景合成）の作業に付ける担当者（同上）',
  assigneeSingle: '写真合成・モデル作成・VR制作・動画制作の作業に付ける担当者（同上）',
  projectId: '通常は変更不要',
  workspaceId: '通常は変更不要',
  autoSend: '「する」：30分ごとの自動実行で、状態が「未送信」の行と「工程図へ」にチェックした行を工程図に登録（「要確認」「更新あり」はチェックするまで待つ）。「しない」：転記だけ自動',
  autoWait: '「未送信」の行は、最後に内容が変わってからこの分数がたってから自動登録する（エンジニアが入力ミスを直す時間）',
  notify: '「する」：『案件登録』で翻訳済みになってから制作時間が出ない視点を Discord で知らせる（Webhook はメニュー「Discord 通知の設定」）。「しない」：知らせない',
  notifyFirst: '翻訳済みにチェックが入ってから、この時間たっても制作時間（White・Color・pts）が空なら知らせる',
  notifyRepeat: '1回目のあとは、この時間ごとに知らせる（30分ごとの自動実行で確かめるので、最大30分ほど遅れる）',
  regMessage: '『案件登録』の「連絡文」列とメニュー「連絡文をコピー」のひな形（エンジニア向け）。使える文字：{社内案件名} {社外案件名} {サーバーリンク} {視点一覧} {視点} {パターン} {担当者} {納期} {新規or修正} {通訳へのメッセージ} {登録日時} {計算期限}（＝登録日時＋「制作時間の計算の期限」）（セルの中の改行もそのまま使えます）',
  calcMinutes: '連絡文の {計算期限} ＝『案件登録』の登録日時＋この分数（75 ＝ 1時間15分後）',
  interpMessage: '『案件登録』の「通訳向け連絡文」列のひな形。使える文字は「登録時の連絡文」と同じ。{通訳へのメッセージ} には『案件登録』の「通訳へのメッセージ」が入る',
  manualRun: 'チェックすると、その場で 案件登録→入力シート・転記・工程図への登録 をまとめて動かす（終わるとチェックは外れ、結果は「最後の自動実行」に出る）',
  notifyHours: 'この時間帯だけ知らせる（例 8-20 ＝ 8時〜20時。時刻はベトナム時間）。夜に止まっていた分は、時間帯に入ったら知らせる',
  lastAuto: '30分ごとの自動実行が最後に動いた日時と結果（自動で書き込み）',
};

const PROP_SERVICE_ACCOUNT = 'SERVICE_ACCOUNT_JSON';
// 時刻はすべてベトナム時間（appsscript.json の timeZone と同じ）。連絡文の時刻もこれで書き、2つのシートもこれに合わせる
const APP_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const APP_TIME_ZONE_ALIASES = ['Asia/Ho_Chi_Minh', 'Asia/Saigon'];
/** シートのタイムゾーンがベトナム時間でなければ直す（直したら true） */
function ensureTimeZone_(ss) {
  try {
    if (APP_TIME_ZONE_ALIASES.indexOf(ss.getSpreadsheetTimeZone()) >= 0) return false;
    ss.setSpreadsheetTimeZone(APP_TIME_ZONE);
    return true;
  } catch (e) { return false; }
}
const PROP_DISCORD = 'DISCORD_WEBHOOK_URL';

// 旧スタッフシート（「Project Schedule」の『案件シート(一覧)』）。『設定』がこれを指したままなら
// 「かんたん初期設定」でエンジニア入力シートへ切り替える（意図して旧ファイルを読む設定は触らない）
const LEGACY_STAFF_FILE_ID = '12IfXNtu67LNuqRnB6Iako0pvI1A3k1CzyQTS4F3u5fU';
const LEGACY_STAFF_TAB = '案件シート(一覧)';

// エンジニア入力シート『入力シート』の列（左からこの順。見出しは「日本語」＋改行＋「ベトナム語」の2段）
// label: 見出しの日本語（列はこの文字で始まる見出しで探す） / vi: ベトナム語 / note: 見出しの注記 / width: 列幅（文字数の目安）
// ベトナム語はここだけ直せば、見出し・注記・『記入ルール/説明』に反映される（メニュー「0. かんたん初期設定」をもう一度押す）
const STAFF_INPUT_COLUMNS = [
  { key: 'code', label: '会社コード', vi: 'Mã công ty', width: 11,
    note: 'REN・RIC など、リストから選ぶ（リストは管理者が『会社マスタ』に登録）\nChọn mã công ty (REN, RIC…) từ danh sách (quản lý đăng ký sẵn)' },
  { key: 'number', label: '案件番号', vi: 'Số dự án', width: 9,
    note: '案件の番号。数字だけ（例 34）\nSố của dự án, chỉ nhập số (VD: 34)' },
  { key: 'name', label: '社外案件名', vi: 'Tên dự án', width: 18,
    note: 'お客様の案件名（自由入力。例 マンション）\nTên dự án của khách hàng (nhập tự do, VD: マンション)' },
  { key: 'link', label: 'サーバーリンク', vi: 'Link thư mục', width: 24,
    note: '保存先フォルダのリンク（CG から始まるパス）を貼り付け\nDán đường dẫn thư mục lưu file (bắt đầu bằng CG)' },
  { key: 'request', label: '新規or修正', vi: 'Mới / Sửa', width: 11,
    note: 'その視点の初回依頼は「新規」、2回目以降はすべて「修正」\nYêu cầu lần đầu của góc nhìn: 「新規 / Mới」. Từ lần thứ 2 trở đi: 「修正 / Sửa」' },
  { key: 'cut', label: '視点', vi: 'Góc nhìn', width: 9,
    note: 'リストから選ぶ（EX1＝外観目線視点① など。一覧は『記入ルール/説明』タブ）。末尾の数字＝①②…\n' +
      'Chọn từ danh sách (EX1 = ngoại thất tầm mắt ①…, xem bảng ở tab『記入ルール/説明』). Số cuối = ①②…' },
  { key: 'pattern', label: 'パターン', vi: 'Phương án', width: 9,
    note: '同じ視点でパターン違いがあれば A・B・C…（無ければ空欄）\nNếu cùng góc nhìn có nhiều phương án: A, B, C… (không có thì để trống)' },
  { key: 'white', label: 'White', vi: 'Trắng (giờ)', width: 9, hours: true,
    note: 'ホワイトパースまでの制作時間（h）。モデル作成の行はモデル制作時間\nSố giờ làm đến phối cảnh trắng. Dòng dựng model: số giờ dựng model' },
  { key: 'color', label: 'Color', vi: 'Màu (giờ)', width: 9, hours: true,
    note: '色付きパースまでの制作時間（h）。White の時間は含めない\nSố giờ làm phối cảnh màu. Không tính số giờ White' },
  { key: 'other', label: 'pts', vi: 'Ghép ảnh (giờ)', width: 10, hours: true,
    note: '写真合成・フォトショップ作業（人物・点景など）の時間（h）\nSố giờ ghép ảnh / Photoshop (người, cây, xe…)' },
  { key: 'note', label: 'メモ', vi: 'Ghi chú', width: 30,
    note: '制作上の注意点など（自由記入）\nLưu ý khi thực hiện (nhập tự do)' },
  // ここから下は「案件登録」の流れ（管理者が登録 → 通訳が翻訳 → エンジニアが時間を出す）で使う列
  { key: 'translated', label: '翻訳済み', vi: 'Đã dịch', width: 8, checkbox: true,
    note: '通訳：資料を翻訳してエンジニアに伝えたらチェック。ここから制作時間の計算が始まります\nPhiên dịch: dịch tài liệu xong và đã truyền đạt cho kỹ sư thì đánh dấu' },
  { key: 'transAt', label: '翻訳日時', vi: 'Thời gian dịch xong', width: 14, auto: true, datetime: true,
    note: '翻訳済みにチェックした日時（自動で入る）\nThời điểm đánh dấu đã dịch (tự động)' },
  { key: 'transNote', label: '翻訳メモ', vi: 'Ghi chú dịch', width: 30,
    note: '通訳：お客様の指示の訳・注意点など\nPhiên dịch: nội dung dịch yêu cầu của khách, lưu ý…' },
  { key: 'split', label: '作業の分け方', vi: 'Cách chia công việc', width: 30,
    note: '分けて作業できるときに書く（例：White＝躯体 3h／家具1 2h／家具2 1h）\nNếu có thể chia công việc thì ghi (VD: White = khung 3h / nội thất 1 2h / nội thất 2 1h)' },
  { key: 'estimator', label: '時間入力者', vi: 'Người nhập giờ', width: 12,
    note: 'エンジニア：制作時間を決めた人の名前\nKỹ sư: tên người quyết định số giờ' },
  { key: 'estimatedAt', label: '時間入力日時', vi: 'Thời gian nhập giờ', width: 14, auto: true, datetime: true,
    note: 'White・Color・pts を書いた日時（自動で入る）\nThời điểm nhập số giờ (tự động)' },
  { key: 'total', label: '合計', vi: 'Tổng (giờ)', width: 8, auto: true,
    note: 'White＋Color＋pts（自動で計算。書かなくてよい）\nTự động tính (không cần nhập)' },
  { key: 'regNo', label: '登録No', vi: 'Mã đăng ký', width: 8, auto: true,
    note: '管理者の登録番号（自動で入る。変えない）\nMã đăng ký của quản lý (tự động, không sửa)' },
  { key: 'toInterp', label: '管理者からの連絡', vi: 'Lời nhắn từ quản lý', width: 30, auto: true,
    note: '管理者が『案件登録』に書いた通訳へのメッセージ（自動で入る）\nLời nhắn của quản lý cho phiên dịch (tự động)' },
  { key: 'delivery', label: '納品名', vi: 'Tên file giao', width: 30, auto: true,
    note: '工程図に登録されると、納品するファイルの名前が自動で入る（ステップが複数なら「 / 」区切り）\nTên file giao hàng (tự động sau khi đăng ký vào 工程図)' },
];
const STAFF_INPUT_HEADERS = STAFF_INPUT_COLUMNS.map(c => c.label);
// 『入力シート』1行目の案内（見出しの上が空のときだけ書く）
const STAFF_INPUT_HINT = '1視点（パターン違いも別）＝1行。書き方は『' + STAFF_RULES_TAB + '』タブ ／ Mỗi góc nhìn (phương án khác cũng tách riêng) = 1 dòng. Xem cách nhập ở tab『' + STAFF_RULES_TAB + '』';
// プルダウンの選択肢
const REQUEST_OPTIONS = ['新規 / Mới', '修正 / Sửa'];
const PATTERN_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];
// 視点コードのベトナム語（『記入ルール/説明』の視点コード表に使う。キーワードは『視点マスタ』の英字。無いものは日本語だけ出す）
const VIEW_VI = {
  EX: 'ngoại thất – góc nhìn ngang tầm mắt', IN: 'nội thất – góc nhìn ngang tầm mắt',
  EXCB: 'ngoại thất – góc nhìn chim bay', INCB: 'nội thất – góc nhìn chim bay', INCM: 'nội thất – góc nhìn chim bay',
  EXM: 'dựng model – phần ngoại thất', INM: 'dựng model – phần nội thất',
  EXP: 'ghép ảnh ngoại thất', INP: 'ghép ảnh nội thất', P: 'ghép ảnh', VR: 'VR', VIDEO: 'video',
};
// 視点のプルダウンに並べる番号の数（IN は多いので 20、ほかは 10。リストに無い番号も入力はできる）
const VIEW_OPTION_COUNT = { IN: 20 };
const VIEW_OPTION_COUNT_DEFAULT = 10;
// 時間：0〜10 は 0.5 刻み、11〜40 は 1 刻み（リストに無い数字も入力はできる）
const HOUR_OPTIONS = Array.from({ length: 21 }, (_, i) => String(i / 2)).concat(Array.from({ length: 30 }, (_, i) => String(i + 11)));

// 『会社マスタ』『視点マスタ』が空のときに「初期設定」で入れる初期値（シート上で自由に直してよい。2026-09-28 時点の管理者シートと同じ）
// [案件コードの英字部分, 工程図の会社名, 備考, 入力シートに出さない（表記ゆれの行は TRUE ＝エンジニアのプルダウンに出さない）]
const INITIAL_COMPANY_MASTER = [
  ['REN', 'リノべる株式会社', '', false],
  ['SUM', 'SUMUS', '', false],
  ['TAMAZEN', '玉善', '', false],
  ['OFFICE', 'オフィスコム', '', false],
  ['TANAKA', '田中建設', '', false],
  ['CG', 'CG工房', '', false],
  ['RIC', '株式会社リックデザイン', '', false],
  ['DESIGN', 'デザイン経営研究舎', '', false],
  ['CONTE', 'CONTE', '', false],
  ['SAN', '株式会社サンゲツ', '', false],
  ['ATO', 'アトリエジグゾー', '', false],
  ['GRAY', 'グレイ美術', '', false],
  ['ALEG', 'ALEG', '', false],
  ['ESAKI', 'エサキホーム', '', false],
  ['WUNDER', 'ヴンダー', '', false],
  ['SOCIAL', 'ソーシャルインテリア', '', false],
  ['FRY', 'FRYGALLERY', '', false],
];
// [キーワード, 区分, 種類, 社外名, 備考]。社外名が空なら「区分＋視点」（モデルは区分のまま）を社外視点名に使う
const INITIAL_VIEW_MASTER = [
  ['EX', '外観目線', 'パース', '', 'EX1 → 外観目線視点①'],
  ['IN', '内観目線', 'パース', '', 'IN2 → 内観目線視点②'],
  ['EXCB', '外観鳥瞰', 'パース', '', ''],
  ['INCB', '内観鳥瞰', 'パース', '', ''],
  ['EXM', '外観モデル', 'モデル', '', 'White にモデル制作時間。工程図には「モデル作成」1ステップ'],
  ['INM', '内観モデル', 'モデル', '', ''],
  ['EXP', '外観写真合成', '写真合成', '', ''],
  ['INP', '内観写真合成', '写真合成', '', ''],
  ['VR', '', 'VR', '', ''],
  ['VIDEO', '', '動画', '', ''],
];
const COMPANY_MASTER_HEADERS = ['案件コードの英字部分', '工程図の会社名', '備考', '入力シートに出さない'];
const COMPANY_HIDE_HEADER = COMPANY_MASTER_HEADERS[3];
const VIEW_MASTER_HEADERS = ['カット名のキーワード', '区分', '種類', '社外名', '備考'];
const VIEW_EXTERNAL_NOTE = 'お客様向けの視点名（社外視点名）のもと。空なら「区分＋視点」（例 外観目線 → 外観目線視点①、モデルは 外観モデル①）';
const PROJECT_MASTER_HEADERS = ['社内案件名', '社外案件名', '会社名', 'お客様担当者', '備考'];

// ============ メニュー ============
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('工程図連携')
    .addItem('0. かんたん初期設定（最初に1回だけ）', 'quickSetup')
    .addSeparator()
    .addItem('案件登録を入力シートへ写す（翻訳・時間の読み戻しと催促も）', 'syncRegistrationsNow')
    .addItem('連絡文をコピー（『案件登録』で選んだ行）', 'showRegMessage')
    .addItem('1. エンジニア入力シートから転記', 'transferFromStaffSheet')
    .addItem('2. 工程図へ送信（「工程図へ」にチェックした行）', 'sendToKoutei')
    .addItem('送信内容のプレビュー（書き込まない）', 'previewSend')
    .addSeparator()
    .addItem('自動実行（30分ごと）を今すぐ1回動かす', 'runAutoNow')
    .addItem('自動実行を始める', 'startAutoRun')
    .addItem('自動実行を止める', 'stopAutoRun')
    .addSeparator()
    .addItem('工程図の会社名一覧を取り込む', 'fetchCompanyNames')
    .addItem('会社マスタの会社を工程図の顧客マスタに追加', 'addCompaniesToKoutei')
    .addItem('工程図との接続テスト', 'testConnection')
    .addItem('Discord 通知の設定（Webhook URL）', 'setDiscordWebhook')
    .addItem('Discord 通知のテスト送信', 'testDiscord')
    .addSeparator()
    .addItem('初期設定（タブ・チェックボックスを整える）', 'setupSheet')
    .addItem('エンジニア入力シートを整える（会社コードのプルダウン更新）', 'createStaffInputTab')
    .addItem('秘密鍵を設定（接続テストが失敗する場合のみ）', 'setServiceAccountKey')
    .addItem('秘密鍵を削除', 'clearServiceAccountKey')
    .addToUi();
}

// ============ 1. 転記 ============
function transferFromStaffSheet() {
  return withLock_(() => {
    const t = transfer_();
    toastOrLog_(t.msg);
    return t.msg;
  });
}

/**
 * 転記の本体。入力シートの新しい行を『連携』に足し、変わった行だけ書き換える（何も変わっていなければ何も書かない）。
 * 戻り値: { msg, added, updated, waitingKeys: 記入途中の行の取込キー }
 */
function transfer_() {
  const cfg = readSettings_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const link = ensureLinkSheet_(ss);
  const col = headerMap_(link);
  const masters = readMasters_(ss);

  const staffRows = readStaffRows_(cfg);
  const sourceRows = collectSourceRows_(staffRows);
  const regInfo = readRegInfo_(ss); // 登録No → 担当者・納期（『案件登録』から）

  const data = link.getDataRange().getValues();
  const byKey = new Map();
  for (let r = 1; r < data.length; r++) {
    const k = String(data[r][col.key - 1] || '');
    if (k) byKey.set(k, r);
  }

  const now = new Date();
  const stamp = now; // 転記日時は日時の値で書く（シートとスクリプトのタイムゾーンが違っても、自動登録の待ち時間を正しく測れる）
  const today = fmtYMD_(now);
  const appends = [];
  const cellUpdates = []; // { row(1-based), col, value }
  let updated = 0;
  const seen = new Set();
  const waiting = new Set(sourceRows.waitingKeys || []);

  sourceRows.forEach(s => {
    seen.add(s.key);
    if (byKey.has(s.key)) {
      const r = byKey.get(s.key);
      const cur = data[r];
      const fields = { code: s.code, cut: s.cut, pattern: s.pattern, request: s.request, deadline: s.deadline, white: s.white, color: s.color, other: s.other, item: s.item, note: s.note, srcRow: s.srcRow, link: s.link, split: s.split };
      if (s.name) fields.name = s.name; // スタッフシートに社外案件名があるときだけ追従（無ければ人が入れた値を保つ）
      let changed = false;
      Object.keys(fields).forEach(f => {
        if (fields[f] === undefined) return; // 入力シートに無い列（納期・制作項目など）は、人が『連携』に入れた値を保つ
        if (!sameCell_(cur[col[f] - 1], fields[f])) {
          cellUpdates.push({ row: r + 1, col: col[f], value: fields[f] });
          // 元シート行・サーバリンク・備考の変化は「内容の変更」とみなさない
          if (f !== 'srcRow' && f !== 'link' && f !== 'note') changed = true;
        }
      });
      const status = String(cur[col.status - 1] || '');
      if (changed) {
        updated++;
        cellUpdates.push({ row: r + 1, col: col.transferredAt, value: stamp });
        if (status === STATUS.SENT) cellUpdates.push({ row: r + 1, col: col.status, value: STATUS.UPDATED });
      }
      // 一度消えた行がまた出てきたら「要確認」に戻す（自動登録の前に人が見る）
      if (status === STATUS.GONE) {
        cellUpdates.push({ row: r + 1, col: col.status, value: STATUS.CHECK });
        cellUpdates.push({ row: r + 1, col: col.result, value: '入力シートから一度消えて、また出てきた行です。内容を確認して「工程図へ」にチェックしてください' });
      }
      return;
    }
    const j = judgeRow_(s, masters);
    const ri = s.regNo ? regInfo.get(s.regNo) : null;
    const rowObj = {
      key: s.key, status: j.status, send: false, inputDate: today, // 入力日＝最初に転記した日（あとの転記では変えない）
      code: s.code, name: j.name, cut: s.cut, pattern: s.pattern, extName: j.extName, round: s.round, request: s.request,
      deadline: s.deadline !== undefined ? s.deadline : (ri && trimStr_(ri.deadline) !== '' ? parseDeadline_(ri.deadline, now) : undefined),
      white: s.white, color: s.color, other: s.other, item: s.item, note: s.note,
      company: j.company, contact: j.contact, category: j.category, kind: j.kind, stepKind: j.stepKind,
      assignee: (ri && ri.assignee) || '', memo: '', exclude: false,
      transferredAt: stamp, sentAt: '', result: j.note, srcRow: s.srcRow, link: s.link, split: s.split,
    };
    appends.push(rowObjToArray_(rowObj, col));
  });

  // 入力シートから消えた行（削除・視点などの書き換え・旧レイアウトの完了チェック）に印を付ける。
  // 記入途中（時間を消して打ち直している最中など）の行は、行自体は残っているので印を付けない
  byKey.forEach((r, k) => {
    if (seen.has(k) || waiting.has(k)) return;
    const status = String(data[r][col.status - 1] || '');
    if (status === STATUS.NEW || status === STATUS.CHECK) cellUpdates.push({ row: r + 1, col: col.status, value: STATUS.GONE });
    else if (status === STATUS.SENT || status === STATUS.UPDATED) {
      cellUpdates.push({ row: r + 1, col: col.status, value: STATUS.GONE });
      cellUpdates.push({ row: r + 1, col: col.result, value: '登録済みの行が入力シートから消えました。工程図のタスクは残っているので、不要なら工程図側で削除してください' });
    }
  });

  cellUpdates.forEach(u => link.getRange(u.row, u.col).setValue(u.value));
  if (appends.length) {
    const startRow = link.getLastRow() + 1;
    ensureSize_(link, startRow + appends.length - 1, appends[0].length);
    link.getRange(startRow, 1, appends.length, appends[0].length).setValues(appends);
    applyValidations_(link, col, startRow, appends.length, masters);
  }

  const needCheck = appends.filter(a => a[col.status - 1] === STATUS.CHECK).length;
  const msg = `転記完了\n  入力シートの対象行: ${sourceRows.length}\n  新規追加: ${appends.length}（うち要確認 ${needCheck}）\n  内容更新: ${updated}` +
    (sourceRows.waiting ? `\n  記入途中で待っている行: ${sourceRows.waiting}（案件番号・新規or修正・時間がそろうと次の転記で追加）` : '');
  console.log(msg);
  return { msg, added: appends.length, needCheck, updated, waitingKeys: sourceRows.waitingKeys || [] };
}

/** スタッフシートを読み、必要な列だけ抜き出す。見出し名で列を探すので、新旧どのレイアウトでも読める。 */
function readStaffRows_(cfg) {
  const ss = SpreadsheetApp.openById(cfg.fileId);
  const sheet = ss.getSheetByName(cfg.tabName);
  if (!sheet) throw new Error(`エンジニア入力シートにタブ「${cfg.tabName}」が見つかりません（『設定』タブのタブ名を確認するか、メニュー「0. かんたん初期設定」を実行してください）`);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];

  const headerRow = findStaffHeaderRow_(sheet);
  if (headerRow < 0) throw new Error('エンジニア入力シートに見出し（会社コード・案件番号 または 社内案件名）の行が見つかりません（先頭200行を探しました）');

  const headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0].map(v => String(v || '').trim());
  const sc = staffHeaderMap_(headers);

  const firstDataRow = Math.max(headerRow + 1, cfg.startRow || 0);
  if (firstDataRow > lastRow) return [];
  const width = Math.max.apply(null, Object.keys(sc).map(k => sc[k]));
  const values = sheet.getRange(firstDataRow, 1, lastRow - firstDataRow + 1, width).getValues();

  const at = (v, c) => (c ? v[c - 1] : '');
  // 入力シートに無い列は undefined にする（転記のとき、人が『連携』に入れた値を消さないため）
  const opt = (v, c, fn) => (c ? fn(v[c - 1]) : undefined);
  const rows = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const code = joinCode_(at(v, sc.code), sc.number ? at(v, sc.number) : '');
    rows.push({
      srcRow: firstDataRow + i,
      code,
      // 案件番号の列があるのに番号が入っていない（「RIC」だけ）→ 記入途中
      noNumber: !!sc.number && !!code && !/\d/.test(code),
      name: trimStr_(at(v, sc.name)),
      cut: trimStr_(at(v, sc.cut)),
      pattern: normPattern_(at(v, sc.pattern)),
      link: trimStr_(at(v, sc.link)),
      request: opt(v, sc.request, trimStr_),
      deadlineRaw: opt(v, sc.deadline, x => x),
      item: opt(v, sc.item, trimStr_),
      note: trimStr_(at(v, sc.note)),
      white: toHours_(at(v, sc.white)),
      color: toHours_(at(v, sc.color)),
      other: toHours_(at(v, sc.other)),
      done: isChecked_(at(v, sc.done)),
      regNo: opt(v, sc.regNo, trimStr_),
      split: opt(v, sc.split, trimStr_),
    });
  }
  return rows;
}

/** 会社コード＋案件番号 → 社内案件名（'RIC' + 34 → 'RIC.34'）。番号が空、またはコードに番号まで書いてあるときはコードのまま */
function joinCode_(code, number) {
  const c = trimStr_(code);
  const n = trimStr_(number);
  if (!c || !n || /\d/.test(c)) return c;
  return c + '.' + n;
}

// 見出し行の目印（この文字で始まるセルがある行を見出しとみなす）
const STAFF_HEADER_MARKERS = ['社内案件名', '会社コード', '案件コード', '案件番号'];
/** 見出し行：A〜F列のどこかに見出しの目印（会社コード・案件番号・社内案件名）がある最初の行（先頭200行）。無ければ -1。上に書き方などがあってもよい */
function findStaffHeaderRow_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return -1;
  const probe = sheet.getRange(1, 1, Math.min(lastRow, 200), Math.min(lastCol, 6)).getValues();
  for (let r = 0; r < probe.length; r++) {
    if (probe[r].some(v => { const t = String(v || '').trim(); return STAFF_HEADER_MARKERS.some(m => t.indexOf(m) === 0); })) return r + 1;
  }
  return -1;
}

/**
 * スタッフシートの見出し配列 → 列番号（1始まり、無い列は 0）。見出しは「この文字で始まる」で探す（ベトナム語の2段目があってよい）。
 * 今のレイアウト（入力シート）: 会社コード / 案件番号 / 社外案件名 / サーバーリンク / 新規or修正 / 視点 / パターン / White / Color / pts / メモ
 * 旧レイアウト（product schedule）: 社内案件名 / 視点名 / パターン / ホワイト時間 / カラー時間 / その他時間 / 納期 / 備考 / 完了
 * 旧レイアウト（案件シート(一覧)）: 社内案件名 / 社外案件名 / カット名 / サーバリンク / 納期 / 制作項目 / 予想時間×2 / 作業完了
 */
function mapStaffColumns_(headers) {
  const hs = headers.map(h => trimStr_(h));
  const find = (list) => { for (let i = 0; i < hs.length; i++) if (list.some(p => hs[i].indexOf(p) === 0)) return i + 1; return 0; };
  const m = {
    code: find(['社内案件名', '会社コード', '案件コード']),
    number: find(['案件番号']),
    name: find(['社外案件名']),
    cut: find(['視点', 'カット名']),
    pattern: find(['パターン']),
    link: find(['サーバリンク', 'サーバーリンク']),
    request: find(['新規']),
    deadline: find(['納期']),
    item: find(['制作項目']),
    note: find(['備考', 'メモ']),
    done: find(['作業完了', '完了']),
    white: find(['ホワイト', 'White', 'WHITE']),
    color: find(['カラー', 'Color', 'COLOR']),
    other: find(['その他', '人物', 'pts', 'PTS', 'Pts']),
    translated: find(['翻訳済み']),
    transAt: find(['翻訳日時']),
    transNote: find(['翻訳メモ']),
    estimator: find(['時間入力者']),
    estimatedAt: find(['時間入力日時']),
    split: find(['作業の分け方']),
    total: find(['合計']),
    regNo: find(['登録No']),
    delivery: find(['納品名']),
    toInterp: find(['管理者からの連絡']),
  };
  // 会社コードの列の見出しが「社外案件名」になっている（社外案件名が2つあり、1つ目が案件番号のすぐ左）→ 1つ目を会社コードとみなす
  if (!m.code && m.number && m.name === m.number - 1) {
    m.code = m.name;
    m.name = 0;
    for (let i = m.number; i < hs.length; i++) if (hs[i].indexOf('社外案件名') === 0) { m.name = i + 1; break; }
  }
  // 旧レイアウト：「予想時間」が2つ（1つ目=White、2つ目=Color）
  const est = [];
  hs.forEach((h, i) => { if (h.indexOf('予想時間') === 0) est.push(i + 1); });
  if (!m.white && est[0]) m.white = est[0];
  if (!m.color && est[1]) m.color = est[1];
  return m;
}
function staffHeaderMap_(headers) {
  const m = mapStaffColumns_(headers);
  const missing = ['code', 'cut', 'white'].filter(k => !m[k]);
  if (missing.length) {
    const label = { code: '会社コード（または社内案件名）', cut: '視点（または視点名・カット名）', white: 'White（またはホワイト時間・予想時間）' };
    throw new Error('エンジニア入力シートの見出しが見つかりません: ' + missing.map(k => label[k]).join('、'));
  }
  return m;
}

/**
 * 案件コード＋視点名（パターン込み）で同じものを数え、n回目を付けて取込キーにする。
 * 完了チェック済み・記入途中（案件番号・新規or修正が空、時間がすべて0）の行は、回数には数えるが出力しない
 * （記入途中の行は、そろった後の転記で同じ取込キーのまま追加される）。戻り値の配列の waiting に記入途中の行数を入れる。
 */
function collectSourceRows_(staffRows, today) {
  const counts = new Map();
  const out = [];
  let waiting = 0;
  const waitingKeys = [];
  staffRows.forEach(r => {
    if (!r.code || !r.cut) return;
    const vpName = viewpointNameOf_(r.cut, r.pattern);
    const base = normCode_(r.code) + '::' + normCut_(vpName);
    const n = (counts.get(base) || 0) + 1;
    counts.set(base, n);
    if (r.done) return;
    if (r.noNumber || r.request === '' || (r.white <= 0 && r.color <= 0 && r.other <= 0)) { waiting++; waitingKeys.push(base + '::' + n); return; }
    out.push({
      key: base + '::' + n,
      round: n,
      srcRow: r.srcRow,
      code: r.code, name: r.name, cut: r.cut, pattern: r.pattern, link: r.link, request: r.request, item: r.item, note: r.note,
      deadline: r.deadlineRaw === undefined ? undefined : parseDeadline_(r.deadlineRaw, today || new Date()),
      white: r.white, color: r.color, other: r.other,
      regNo: r.regNo || '',
      split: r.split,
    });
  });
  out.waiting = waiting;
  out.waitingKeys = waitingKeys;
  return out;
}

// ============ 判定（純ロジック） ============
/** 案件コード → 大文字・記号なし（'Ric.34' → 'RIC34'、'TANAKA 329' → 'TANAKA329'） */
function normCode_(s) {
  return String(s || '').toUpperCase().replace(/[.\s_\-－ー　]/g, '');
}
/** 案件コードの英字部分（'RENOBERU58' → 'RENOBERU'） */
function codePrefix_(s) {
  const m = normCode_(s).match(/^[A-Z]+/);
  return m ? m[0] : '';
}
/** カット名の正規化（大文字・空白を1つに） */
function normCut_(s) {
  return String(s || '').trim().toUpperCase().replace(/\s+/g, ' ');
}
/** パターン欄の正規化：'Aパターン' / 'パターンA' / 'a' → 'A'。'なし'・空 → '' */
function normPattern_(v) {
  const s = String(v === null || v === undefined ? '' : v).trim();
  if (!s || /^(なし|無し|無|-|－)$/.test(s)) return '';
  const m = s.replace(/パターン/g, '').trim().toUpperCase();
  return m;
}
/** 工程図の視点名（内部名）：視点名＋パターン（'EX1' + 'A' → 'EX1-A'） */
function viewpointNameOf_(cut, pattern) {
  const c = trimStr_(cut);
  const p = normPattern_(pattern);
  return p ? c + '-' + p : c;
}
/** カット名 → 英字トークン（'HOTEL_IN1(D)' → ['HOTEL','IN','D']、'CAD 1F-A' → ['CAD','A']） */
function cutTokens_(cut) {
  return normCut_(cut).split(/[^A-Z0-9]+/).filter(Boolean)
    .map(t => (t.match(/^[A-Z]+/) || [''])[0]).filter(Boolean);
}
/** カット名の番号（'EX1' → 1、'IN12' → 12、'EX' → 0）。最初に出てくる「英字＋数字」の数字部分 */
function cutNumber_(cut) {
  const m = normCut_(cut).match(/[A-Z]+(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}
/** 丸数字（1 → ①、21以上はそのまま） */
function circled_(n) {
  if (!n || n < 1) return '';
  return n <= CIRCLED.length ? CIRCLED.charAt(n - 1) : String(n);
}
/** 社外視点名：社外名＋丸数字＋パターン（'外観視点', 1, 'A' → '外観視点①_パターンA'） */
function externalViewpointName_(base, number, pattern) {
  const b = trimStr_(base);
  if (!b) return '';
  const p = normPattern_(pattern);
  return b + circled_(number) + (p ? '_パターン' + p : '');
}

/** サーバリンクのフォルダ名から会社名を推定（「…\2025-7\株式会社リックデザイン(RIC)\…」→「株式会社リックデザイン」） */
function guessCompanyFromLink_(link) {
  const segs = String(link || '').split(/[\\\/]+/).map(s => s.trim()).filter(Boolean);
  for (let i = 0; i < segs.length - 1; i++) {
    if (/^\d{4}-\d{1,2}$/.test(segs[i])) return segs[i + 1].replace(/[（(].*$/, '').trim();
  }
  return '';
}

/** 案件マスタ（社内案件名 → 社外案件名・会社名・お客様担当者）を引く。案件コードは正規化して比べる。 */
function findProject_(code, projectMaster) {
  const key = normCode_(code);
  if (!key) return null;
  return (projectMaster || []).find(p => p.key === key) || null;
}

/** 会社名の判定：案件マスタ → 会社マスタ（案件コードの英字部分）→ サーバリンクから推定（要確認） */
function judgeCompany_(code, link, companyMaster, projectMaster) {
  const pj = findProject_(code, projectMaster);
  if (pj && pj.company) return { company: pj.company, guessed: false };
  const prefix = codePrefix_(code);
  const hit = (companyMaster || []).find(m => m.prefix && m.prefix === prefix);
  if (hit && hit.company) return { company: hit.company, guessed: false };
  const g = guessCompanyFromLink_(link);
  return { company: g, guessed: true };
}

/** 区分（外観/内観）・種類（パース/写真合成）・社外名ベースの判定 */
function judgeViewpoint_(cut, item, viewMaster) {
  const it = String(item || '');
  let kind = '';
  if (/写真|合成/.test(it)) kind = KIND.PHOTO;
  else if (/パース/.test(it)) kind = KIND.PERS;
  let category = '';
  let external = '';
  const toks = cutTokens_(cut);
  for (let i = 0; i < toks.length; i++) {
    const m = (viewMaster || []).find(r => r.keyword === toks[i]);
    if (m) { category = m.category || ''; external = m.external || ''; if (!kind) kind = m.kind || ''; break; }
  }
  if (!kind && category) kind = KIND.PERS;
  return { category, kind, external };
}

/** 社外名が空のときの社外視点名のもと：区分＋「視点」（外観目線 → 外観目線視点）。モデルは区分のまま、区分が空なら空 */
function deriveExternal_(category, kind) {
  const c = trimStr_(category);
  if (!c) return '';
  return trimStr_(kind) === KIND.MODEL ? c : c + '視点';
}
/** 視点マスタ（readMasters_ の views）。空なら初期値を使う */
function viewsOrDefault_(views) {
  if (views && views.length) return views;
  return INITIAL_VIEW_MASTER.map(r => ({ keyword: r[0], category: r[1], kind: r[2], external: r[3] || deriveExternal_(r[1], r[2]) }));
}
/** 視点マスタのキーワードの並び（重複なし） */
function viewKeywords_(views) {
  const out = [];
  viewsOrDefault_(views).forEach(v => { if (v.keyword && out.indexOf(v.keyword) < 0) out.push(v.keyword); });
  return out;
}
/** エンジニアの視点プルダウン：キーワード＋番号（EX1〜EX10、IN1〜IN20 …） */
function viewCodeOptions_(views) {
  const out = [];
  viewKeywords_(views).forEach(k => {
    const n = VIEW_OPTION_COUNT[k] || VIEW_OPTION_COUNT_DEFAULT;
    for (let i = 1; i <= n; i++) out.push(k + i);
  });
  return out;
}
/** 『記入ルール/説明』の視点コード表の1行ずつ（'EX1 → 外観目線視点① ／ ngoại thất – góc nhìn ngang tầm mắt ①'） */
function viewCodeLines_(views) {
  const all = viewsOrDefault_(views);
  return viewKeywords_(views).map(k => {
    const v = all.filter(x => x.keyword === k)[0];
    const ja = v.external ? v.external + '①' : (v.category || v.kind || k);
    const vi = VIEW_VI[k] ? VIEW_VI[k] + (v.external ? ' ①' : '') : '';
    return k + '1 → ' + ja + (vi ? ' ／ ' + vi : '');
  });
}
/** 『連携』の区分・種類のプルダウン：視点マスタにある値（無ければ基本の値） */
function linkChoiceLists_(masters) {
  const views = (masters && masters.views) || [];
  const uniq = (arr) => arr.filter((x, i) => x && arr.indexOf(x) === i);
  const categories = uniq(views.map(v => v.category));
  const kinds = uniq([KIND.PERS, KIND.PHOTO, KIND.MODEL].concat(views.map(v => v.kind)));
  return { categories: categories.length ? categories : [CATEGORY.EX, CATEGORY.IN], kinds };
}

/**
 * ステップ種類：制作項目に「変更」→変更（有料）、「修正」→修正（無料）、「追加」→追加（旧レイアウト）、
 * 次に入力シートの「新規or修正」、どちらも無ければ 2回目以降→修正（無料）、それ以外→新規
 */
function judgeStepKind_(item, round, request) {
  const it = String(item || '');
  if (/変更/.test(it)) return STEP_KIND.CHANGE;
  if (/修正/.test(it)) return STEP_KIND.FIX;
  if (/追加/.test(it)) return STEP_KIND.ADD;
  const req = requestStepKind_(request);
  if (req) return req;
  if ((round || 1) >= 2) return STEP_KIND.FIX;
  return STEP_KIND.NEW;
}
/** 「新規or修正」欄 → ステップ種類（'新規 / Mới' → 新規、'修正 / Sửa' → 修正（無料）。追加・変更も受け付ける）。読めなければ '' */
function requestStepKind_(v) {
  const s = trimStr_(v).toLowerCase();
  if (!s) return '';
  if (/^(新規|new)|mới/.test(s)) return STEP_KIND.NEW;
  if (/^(追加|add)|thêm/.test(s)) return STEP_KIND.ADD;
  if (/^(変更|change)|thay đổi/.test(s)) return STEP_KIND.CHANGE;
  if (/^(修正|fix)|sửa/.test(s)) return STEP_KIND.FIX;
  return '';
}

function judgeRow_(s, masters) {
  const pj = findProject_(s.code, masters.projects);
  const name = trimStr_(s.name) || (pj ? pj.name : '');
  const contact = pj ? pj.contact : '';
  const c = judgeCompany_(s.code, s.link, masters.companies, masters.projects);
  const v = judgeViewpoint_(s.cut, s.item, masters.views);
  const extName = externalViewpointName_(v.external, cutNumber_(s.cut), s.pattern);
  const stepKind = judgeStepKind_(s.item, s.round, s.request);
  const req = requestStepKind_(s.request);
  const notes = [];
  if (!name) notes.push('社外案件名を入力してください（案件マスタに「' + s.code + '」を追加すると次回から自動。空のままなら社内案件名で登録）');
  if (!c.company) notes.push('会社名を入力してください（案件マスタか会社マスタに「' + codePrefix_(s.code) + '」を追加すると次回から自動）');
  else if (c.guessed) notes.push('会社名はサーバリンクから推定しました。確認してください');
  if (!v.kind) notes.push('種類（パース・写真合成・モデル など）を選んでください（視点マスタに「' + (cutTokens_(s.cut)[0] || s.cut) + '」を追加すると次回から自動）');
  if (!v.category && v.kind === KIND.PERS) notes.push('区分が未判定です（空のままでも送信できます）');
  // 「新規」なのに同じ案件・視点の行が前にもある → 書き間違いか、同じ依頼の二重入力のおそれ
  const newTwice = req === STEP_KIND.NEW && (s.round || 1) >= 2;
  if (newTwice) notes.push('同じ案件・視点の' + s.round + '回目ですが「新規」になっています。修正なら ステップ種類 を「修正（無料）」か「変更（有料）」に、二重入力なら「対象外」にしてください');
  if (req === STEP_KIND.FIX && (s.round || 1) === 1) notes.push('入力シートに前の行が無い「修正」です（入力シートを使う前からの案件なら問題ありません）');
  const needCheck = !name || !c.company || c.guessed || !v.kind || newTwice;
  return { name, contact, company: c.company, category: v.category, kind: v.kind, extName, stepKind, status: needCheck ? STATUS.CHECK : STATUS.NEW, note: notes.join(' / ') };
}

/** 納期セル → 'YYYY-MM-DD'（Date / 'YYYY/M/D' / 'M/D' / 'M月D日'）。M/D は今年、60日以上前なら来年扱い。 */
function parseDeadline_(v, today) {
  if (isDate_(v)) return fmtYMD_(v);
  const s = String(v || '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{4})[\/\-年.](\d{1,2})[\/\-月.](\d{1,2})/);
  if (m) return fmtYMD_(new Date(+m[1], +m[2] - 1, +m[3]));
  m = s.match(/^(\d{1,2})[\/\-月.](\d{1,2})/);
  if (m) {
    const t = today || new Date();
    let y = t.getFullYear();
    const d = new Date(y, +m[1] - 1, +m[2]);
    if (d.getTime() < t.getTime() - 60 * 86400000) y++;
    return fmtYMD_(new Date(y, +m[1] - 1, +m[2]));
  }
  return '';
}

/** 時間セル → 数値（h）。空・文字・負数は 0。 */
function toHours_(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.\-]/g, ''));
  if (isNaN(n) || n <= 0) return 0;
  return Math.round(n * 100) / 100;
}

function isChecked_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }
function isDate_(v) { return Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime()); }
function trimStr_(v) { return String(v === null || v === undefined ? '' : v).trim(); }
function sameCell_(a, b) {
  const na = (a === null || a === undefined) ? '' : a;
  const nb = (b === null || b === undefined) ? '' : b;
  if (typeof na === 'number' || typeof nb === 'number') return Number(na) === Number(nb);
  return String(na).trim() === String(nb).trim();
}
function pad2_(n) { return (n < 10 ? '0' : '') + n; }
// 日付・時刻の文字はベトナム時間で作る（Apps Script のプロジェクトの時計の設定がずれていても同じになるように）
function fmtYMD_(d) {
  if (typeof Utilities !== 'undefined') return Utilities.formatDate(d, APP_TIME_ZONE, 'yyyy-MM-dd');
  return d.getFullYear() + '-' + pad2_(d.getMonth() + 1) + '-' + pad2_(d.getDate());
}
function fmtDateTime_(d) {
  if (typeof Utilities !== 'undefined') return Utilities.formatDate(d, APP_TIME_ZONE, 'yyyy-MM-dd HH:mm');
  return fmtYMD_(d) + ' ' + pad2_(d.getHours()) + ':' + pad2_(d.getMinutes());
}
/** ベトナム時間での「その日の何分目か」（催促の時間帯の判定に使う） */
function minutesOfDayVN_(d) {
  if (typeof Utilities !== 'undefined') {
    const hm = Utilities.formatDate(d, APP_TIME_ZONE, 'H:mm').split(':');
    return parseInt(hm[0], 10) * 60 + parseInt(hm[1], 10);
  }
  return d.getHours() * 60 + d.getMinutes();
}
/** 日時セル → Date（日時の値 / 'YYYY-MM-DD HH:mm' の文字）。読めなければ null */
function parseDateTime_(v) {
  if (isDate_(v)) return v;
  const m = String(v || '').trim().match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : null;
}

// ============ タスクレコード生成（純ロジック） ============
/** 回数付きの表示名（アプリ側 resolveStepLabel と同じ）。'カラー修正（無料）', true, 2 → 'カラー修正2回目（無料）' */
function resolveStepLabel_(baseLabel, numbered, n) {
  const b = String(baseLabel || '').trim();
  if (!numbered) return b;
  const m = b.match(/^(.*?)(（[^（）]*）)?$/);
  const core = (m && m[1] != null) ? m[1] : b;
  const suf = (m && m[2]) || '';
  return core + n + '回目' + suf;
}
function resolveDeliverySuffix_(deliveryBase, n) {
  const base = String(deliveryBase || '').trim();
  if (!base) return '';
  return n > 1 ? base + n : base;
}
function normalizeStepTypes_(list) {
  if (!Array.isArray(list) || list.length === 0) return DEFAULT_STEP_TYPES.map(t => Object.assign({}, t));
  return list.map((t, i) => ({
    id: (t && t.id) || ('st-' + i),
    label: (t && t.label) || '',
    paid: t && t.paid !== undefined ? !!t.paid : true,
    deliveryBase: (t && t.deliveryBase) || '',
    numbered: !!(t && t.numbered),
  }));
}
function stepTypeIdFor_(base, stepKind) {
  if (stepKind === STEP_KIND.FIX) return base + '_fix';
  if (stepKind === STEP_KIND.CHANGE) return base + '_change';
  return base;
}
function vpKey_(projectName, viewpointName) { return String(projectName || '') + '' + String(viewpointName || ''); }

/**
 * 『連携』の1行 → 工程図タスク（1ステップ=1レコード）。
 * ctx: { now(ms), today('YYYY-MM-DD'), defaultAssignee, stepTypes, byVp: Map(vpKey→既存タスク[]), byExt: Map(externalId→既存タスク), deleted: Set(externalId) }
 * 戻り値: { records: [{ id, externalId, update, doc?, changes?, skippedDeleted? }], errors: [] }
 */
function buildTaskRecords_(row, ctx) {
  const errors = [];
  const code = trimStr_(row.code);
  const cut = trimStr_(row.cut);
  const company = trimStr_(row.company);
  const kind = trimStr_(row.kind);
  const white = toHours_(row.white);
  const color = toHours_(row.color);
  const other = toHours_(row.other);
  if (!cut) errors.push('視点名が空です');
  if (!company) errors.push('会社名が空です');
  if (!kind) errors.push('種類（パース・写真合成・モデル など）を選んでください');
  if (white <= 0 && color <= 0 && other <= 0) errors.push('White・Color・pts（ホワイト・カラー・その他）の時間がすべて0です');
  if (errors.length) return { records: [], errors };

  const projectName = trimStr_(row.name) || code;
  const projectNameInternal = code;
  const viewpointName = viewpointNameOf_(cut, row.pattern);
  const viewpointNameExternal = trimStr_(row.extName);
  const customerContact = trimStr_(row.contact);
  const category = trimStr_(row.category);
  const stepKind = trimStr_(row.stepKind) || STEP_KIND.NEW;
  const roundType = ROUND_TYPE_BY_STEP_KIND[stepKind] || 'initial';
  const deadline = trimStr_(row.deadline) || null;
  const memo = trimStr_(row.memo);
  const stepTypes = ctx.stepTypes || DEFAULT_STEP_TYPES;
  const typeById = new Map(stepTypes.map(t => [t.id, t]));

  const key = vpKey_(projectName, viewpointName);
  const vpTasks = (ctx.byVp && ctx.byVp.get(key)) || [];
  // 担当者：シート → 既存視点の担当者（最新） → 作業の種類ごとの既定（『設定』） → 既定
  let baseAssignee = trimStr_(row.assignee);
  if (!baseAssignee && vpTasks.length) {
    const latest = vpTasks.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
    baseAssignee = trimStr_(latest.assignee);
  }
  const kindAssignees = ctx.kindAssignees || {};
  const assigneeFor = (kindKey) => baseAssignee || trimStr_(kindAssignees[kindKey]) || ctx.defaultAssignee || '未割当';
  const notes = [];

  let order = vpTasks.reduce((m, t) => Math.max(m, typeof t.stepOrder === 'number' ? t.stepOrder : -1), -1) + 1;
  const typeCounts = {};
  const baseCounts = {};
  vpTasks.forEach(t => {
    const ty = typeById.get(t.stepTypeId);
    if (ty) {
      if (ty.numbered) typeCounts[ty.id] = (typeCounts[ty.id] || 0) + 1;
      if (ty.deliveryBase) baseCounts[ty.deliveryBase] = (baseCounts[ty.deliveryBase] || 0) + 1;
    }
  });

  const wants = [];
  if (kind !== KIND.PERS) {
    // パース以外（写真合成・モデル・VR・動画など）は1ステップ（時間は合計）。修正・変更の回は名前に付ける
    const single = SINGLE_STEP[kind] || [kind, 'single'];
    const suffix = stepKind === STEP_KIND.FIX ? '（修正）' : stepKind === STEP_KIND.CHANGE ? '（変更）' : '';
    wants.push({ typeId: '', name: single[0] + suffix, tag: single[1], hours: Math.round((white + color + other) * 100) / 100, kindKey: 'single' });
  } else {
    // 「作業の分け方」（White＝躯体 3h／家具1 2h …）があれば、その種類は分けた作業ごとのステップにする
    const split = parseSplit_(row.split);
    const pushKind = (kindKey, typeId, hours, kindLabel) => {
      if (hours <= 0) return;
      const parts = split[kindKey] || [];
      if (parts.length >= 2) {
        const sum = Math.round(parts.reduce((a, p) => a + p.hours, 0) * 100) / 100;
        const single = String(row.key) + '::' + typeId;
        if (ctx.byExt && ctx.byExt.get(single)) {
          notes.push(kindLabel + 'は分けずに登録済みのため「作業の分け方」は反映しません（必要なら工程図で分けてください）');
        } else if (Math.abs(sum - hours) > 0.01) {
          notes.push(kindLabel + 'の「作業の分け方」の合計（' + sum + 'h）が ' + kindLabel + ' の時間（' + hours + 'h）と合わないので、分けずに登録しました');
        } else {
          parts.forEach((p, i) => wants.push({ typeId, hours: p.hours, kindKey, part: { label: p.label, index: i + 1 } }));
          return;
        }
      }
      wants.push({ typeId, hours, kindKey });
    };
    pushKind('white', stepTypeIdFor_('white', stepKind), white, 'White');
    pushKind('color', stepTypeIdFor_('color', stepKind), color, 'Color');
    pushKind('other', 'person_scene', other, 'pts'); // 人物・点景・色分 → 人物＋添景合成
  }

  const records = [];
  let seq = 0;
  const partFirst = {}; // 分けた作業の1つ目のステップ名・納品名の接尾語（2つ目以降は同じ納品にする）
  wants.forEach(w => {
    const externalId = String(row.key) + '::' + (w.typeId || w.tag) + (w.part ? '#' + w.part.index : '');
    if (ctx.deleted && ctx.deleted.has(externalId)) { records.push({ externalId, skippedDeleted: true }); return; }
    const existing = ctx.byExt && ctx.byExt.get(externalId);
    if (existing) {
      const changes = {};
      // 工程図で「サポート（分担）」した作業（hoursLocked）は、シートの時間で戻さない
      if (existing.status !== 'done' && !existing.hoursLocked && Number(existing.hours) !== w.hours) changes.hours = w.hours;
      if (existing.hoursLocked && Number(existing.hours) !== w.hours) notes.push((existing.stepName || '作業') + 'は工程図で分担済みのため、時間はシートから更新しません');
      if ((existing.projectName || '') !== projectName) changes.projectName = projectName;
      if ((existing.projectNameInternal || '') !== projectNameInternal) changes.projectNameInternal = projectNameInternal;
      if ((existing.companyName || '') !== company) changes.companyName = company;
      if (customerContact && (existing.customerContact || '') !== customerContact) changes.customerContact = customerContact;
      if (viewpointNameExternal && (existing.viewpointNameExternal || '') !== viewpointNameExternal) changes.viewpointNameExternal = viewpointNameExternal;
      if ((existing.viewpointCategory || '') !== category) changes.viewpointCategory = category;
      if ((existing.deadline || null) !== deadline) changes.deadline = deadline;
      records.push({ id: existing.id, externalId, update: true, changes: Object.keys(changes).length ? changes : null });
      return;
    }
    const ty = w.typeId ? typeById.get(w.typeId) : null;
    let label = w.name || w.typeId;
    let deliverySuffix = '';
    const firstPart = w.part && w.part.index > 1 ? partFirst[w.typeId] : null;
    if (firstPart) {
      label = firstPart.label;
      deliverySuffix = firstPart.deliverySuffix;
    } else if (ty) {
      let n = 1;
      if (ty.numbered) { typeCounts[ty.id] = (typeCounts[ty.id] || 0) + 1; n = typeCounts[ty.id]; }
      label = resolveStepLabel_(ty.label, ty.numbered, n);
      if (ty.deliveryBase) { baseCounts[ty.deliveryBase] = (baseCounts[ty.deliveryBase] || 0) + 1; deliverySuffix = resolveDeliverySuffix_(ty.deliveryBase, baseCounts[ty.deliveryBase]); }
    }
    if (w.part && w.part.index === 1) partFirst[w.typeId] = { label, deliverySuffix };
    const stepLabel = w.part ? label + '（' + w.part.label + '）' : label;
    const createdAt = ctx.now + seq;
    const id = 'task-' + ctx.now + '-' + seq + '-' + Math.random().toString(36).slice(2, 7);
    const doc = {
      id,
      projectName, projectNameInternal, companyName: company, customerContact,
      viewpointName, viewpointNameExternal, viewpointCategory: category,
      stepName: stepLabel, stepOrder: order, assignee: assigneeFor(w.kindKey),
      priority: 99, hours: w.hours, completedHours: 0,
      memo, tentative: false, tentativeStart: null, tentativeEnd: null,
      deadline, projectDeadline: null, projectRequestDate: null,
      manualStart: null, manualEnd: null,
      status: 'pending', completedAt: null, createdAt, registeredDate: ctx.today,
      stepTypeId: ty ? ty.id : '', stepDeliverySuffix: deliverySuffix,
      stepAmount: '', stepRequestDate: ctx.today, stepCompletedDate: '', stepDeliveryNameOverride: '',
      // 納品種類（売上・帳票の「初回/追加/修正」）。金額は工程図の請求パネルで入力する
      // 分けた作業の2つ目以降は納品に数えない（納品はその種類で1回）
      stepRoundType: w.part && w.part.index > 1 ? '' : roundType, stepOutInHouse: '', stepOutExternal: '', stepOutVND: '',
      externalId,
    };
    records.push({ id, externalId, update: false, doc });
    order++; seq++;
  });
  return { records, errors, notes };
}

/**
 * 「作業の分け方」の文字 → 種類ごとの作業（純ロジック）。
 * 'White＝躯体 3h／家具1 2h／家具2 1h　Color＝外壁 2h／植栽 1h' → { white: [{label:'躯体',hours:3}, …], color: [...], other: [] }
 * 種類の書き方：White/W/ホワイト/白、Color/C/カラー/色、pts/P/人物/合成（＝ か : のあと）。種類を書かない作業は直前の種類（最初は White）
 */
function parseSplit_(text) {
  const out = { white: [], color: [], other: [] };
  const src = String(text || '').trim();
  if (!src) return out;
  const kindOf = (t) => {
    const k = t.toLowerCase();
    if (/^(white|w|ホワイト|白|trắng)$/.test(k)) return 'white';
    if (/^(color|colour|c|カラー|色|màu)$/.test(k)) return 'color';
    if (/^(pts|p|人物|合成|ghép ảnh|ghép)$/.test(k)) return 'other';
    return '';
  };
  let cur = 'white';
  src.split(/[／\/;；\n、,，|｜]+/).forEach(seg0 => {
    let seg = seg0.trim();
    if (!seg) return;
    const m = seg.match(/^([^=＝:：\s]+)\s*[=＝:：]\s*(.*)$/);
    if (m && kindOf(m[1])) { cur = kindOf(m[1]); seg = m[2].trim(); }
    // 1つの区切りに「種類＝」が2つ続く（'White＝躯体 3h Color＝外壁 2h'）ときも分ける
    seg.split(/\s+(?=(?:white|w|color|c|pts|p|ホワイト|カラー|白|色|人物|合成)\s*[=＝:：])/i).forEach(part0 => {
      let part = part0.trim();
      const m2 = part.match(/^([^=＝:：\s]+)\s*[=＝:：]\s*(.*)$/);
      if (m2 && kindOf(m2[1])) { cur = kindOf(m2[1]); part = m2[2].trim(); }
      const mm = part.replace(/[０-９．]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
        .match(/^(.*?)\s*(\d+(?:\.\d+)?)\s*(?:h|hr|時間|giờ)?$/i);
      if (!mm) return;
      const label = mm[1].trim();
      const hours = Math.round(parseFloat(mm[2]) * 100) / 100;
      if (label && hours > 0) out[cur].push({ label, hours });
    });
  });
  return out;
}

// ============ 2. 送信 ============
function sendToKoutei() { return withLock_(() => runSend_(false)); }
function previewSend() { return runSend_(true); }

/**
 * 自動登録の対象か（30分ごとの自動実行で使う。純ロジック）。
 * - 対象外・登録済み・元シートから消えた・エラーの行は送らない（エラーは人が直してからチェック）
 * - 「工程図へ」にチェックがある行は、人が確認済みとして送る（要確認・更新ありの行も）
 * - チェックが無くても「未送信」（自動判定がすべてできた行）は送る。ただし エンジニアが打ち直している最中の行（記入途中）と、
 *   最後に内容が変わってから waitMin 分たっていない行は次回に回す（入力ミスを直す時間をとる）
 */
function isAutoSendTarget_(row, now, waitMin, waitingKeys) {
  if (!row.key || isChecked_(row.exclude)) return false;
  if (row.status === STATUS.SENT || row.status === STATUS.GONE || row.status === STATUS.ERROR) return false;
  if (isChecked_(row.send)) return true;
  if (row.status !== STATUS.NEW) return false;
  if (waitingKeys && waitingKeys.has(String(row.key))) return false;
  const at = parseDateTime_(row.transferredAt);
  if (at && now.getTime() - at.getTime() < (waitMin || 0) * 60000) return false;
  return true;
}

/**
 * 送信の本体。opts.auto のときは自動登録の対象（isAutoSendTarget_）を送り、ダイアログは出さない。
 * それ以外は「工程図へ」にチェックした行を送る。
 */
function runSend_(dryRun, opts) {
  const auto = !!(opts && opts.auto);
  const cfg = readSettings_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const link = ensureLinkSheet_(ss);
  const col = headerMap_(link);
  const data = link.getDataRange().getValues();

  const targets = [];
  const nowDate = new Date();
  const waitingKeys = new Set((opts && opts.waitingKeys) || []);
  for (let r = 1; r < data.length; r++) {
    const row = arrayToRowObj_(data[r], col);
    if (!row.key) continue;
    if (auto) {
      if (!isAutoSendTarget_(row, nowDate, cfg.autoWait, waitingKeys)) continue;
    } else {
      if (!isChecked_(row.send) || isChecked_(row.exclude)) continue;
      if (row.status === STATUS.SENT || row.status === STATUS.GONE) continue;
    }
    targets.push({ r, row });
  }
  if (!targets.length) {
    if (!auto) alertOrLog_('送信対象がありません。\n「工程図へ」にチェックが入っていて、状態が「登録済み」以外の行が対象です。\n（登録済みの行を送り直すには、状態を「更新あり」にして「工程図へ」にチェックしてください）');
    return '対象なし';
  }

  const auth = getAuth_();
  const existing = fsListAll_(auth, cfg, 'workspaces/' + cfg.workspaceId + '/tasks');
  const deleted = new Set(parseJsonArray_(fsGetValueString_(auth, cfg, 'deletedExternalIds')));
  let customerMaster = parseJsonArray_(fsGetValueString_(auth, cfg, 'customerMaster'));
  // 送る行の会社のうち、『会社マスタ』にあって工程図の顧客マスタに無い会社は、先に顧客マスタへ追加する
  if (!dryRun) {
    const add = ensureKouteiCompanies_(auth, cfg, customerMaster, companyMasterNames_(ss).filter(n => targets.some(t => trimStr_(t.row.company) === n)));
    customerMaster = add.master;
  }
  const companies = new Set(customerMaster.map(c => trimStr_(c && c.company)).filter(Boolean));
  const stepTypes = normalizeStepTypes_(parseJsonArray_(fsGetValueString_(auth, cfg, 'stepTypeMaster')));

  const byExt = new Map();
  const byVp = new Map();
  existing.forEach(t => {
    if (t.externalId) byExt.set(t.externalId, t);
    const k = vpKey_(t.projectName, t.viewpointName);
    if (!byVp.has(k)) byVp.set(k, []);
    byVp.get(k).push(t);
  });

  const ctx = { now: nowDate.getTime(), today: fmtYMD_(nowDate), defaultAssignee: cfg.defaultAssignee, stepTypes, byVp, byExt, deleted,
    kindAssignees: { white: cfg.assigneeWhite, color: cfg.assigneeColor, other: cfg.assigneeOther, single: cfg.assigneeSingle } };
  const stamp = nowDate;
  const lines = [];
  let created = 0, updated = 0, errored = 0;

  targets.forEach(t => {
    const row = t.row;
    const label = (row.code + ' ' + viewpointNameOf_(row.cut, row.pattern) + (row.round > 1 ? '（' + row.round + '回目）' : '')).trim();
    ctx.now = Date.now();
    const built = buildTaskRecords_(row, ctx);
    if (built.errors.length) {
      errored++;
      if (!dryRun) {
        link.getRange(t.r + 1, col.status).setValue(STATUS.ERROR);
        link.getRange(t.r + 1, col.result).setValue(built.errors.join(' / '));
      }
      lines.push('✕ ' + label + ': ' + built.errors.join(' / '));
      return;
    }
    const warns = (built.notes || []).slice();
    if (companies.size && !companies.has(trimStr_(row.company))) warns.push('会社名「' + row.company + '」は工程図の顧客マスタに未登録');
    let c = 0, u = 0, s = 0;
    built.records.forEach(rec => {
      if (rec.skippedDeleted) { s++; return; }
      const path = 'workspaces/' + cfg.workspaceId + '/tasks/' + rec.id;
      if (rec.update) {
        if (rec.changes) { if (!dryRun) fsPatch_(auth, cfg, path, rec.changes, Object.keys(rec.changes)); u++; }
        return;
      }
      if (!dryRun) fsPatch_(auth, cfg, path, rec.doc, null);
      // 同じ視点の後続行（2回目など）が正しい順番・回数になるよう、作成分をコンテキストに反映
      byExt.set(rec.externalId, rec.doc);
      const k = vpKey_(rec.doc.projectName, rec.doc.viewpointName);
      if (!byVp.has(k)) byVp.set(k, []);
      byVp.get(k).push(rec.doc);
      c++;
    });
    created += c; updated += u;
    const summary = '新規' + c + '件・更新' + u + '件' + (s ? '・工程図で削除済み' + s + '件は送信せず' : '') + (warns.length ? ' ／ ' + warns.join('、') : '');
    if (!dryRun) {
      link.getRange(t.r + 1, col.status).setValue(STATUS.SENT);
      link.getRange(t.r + 1, col.send).setValue(false); // 次にチェックしたら「もう一度送ってよい」の意味になるよう外す
      link.getRange(t.r + 1, col.sentAt).setValue(stamp);
      link.getRange(t.r + 1, col.result).setValue((auto ? '自動登録：' : '') + summary);
    }
    lines.push((warns.length ? '△ ' : '○ ') + label + ': ' + summary);
  });

  const head = dryRun
    ? 'プレビュー（工程図には書き込んでいません）\n対象 ' + targets.length + ' 行：新規 ' + created + ' 件・更新 ' + updated + ' 件・エラー ' + errored + ' 行\n\n'
    : '送信完了\n対象 ' + targets.length + ' 行：新規 ' + created + ' 件・更新 ' + updated + ' 件・エラー ' + errored + ' 行\n\n';
  const msg = head + lines.slice(0, 40).join('\n') + (lines.length > 40 ? '\n…（他 ' + (lines.length - 40) + ' 行）' : '');
  console.log(msg);
  if (!auto) alertOrLog_(msg);
  return msg;
}

// ============ 自動実行（30分ごと） ============
const AUTO_HANDLER = 'autoRun';
const AUTO_EVERY_MINUTES = 30;

/**
 * 30分ごとの自動実行（トリガーから呼ばれる）：転記 → 自動登録。
 * 入力シートに変わりが無ければ何も書かず、自動登録の対象が無ければ工程図にもアクセスしない。
 * 結果は『設定』の「最後の自動実行」に1行で残す（エラーもここに出る）。
 */
function autoRun() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) { console.log('ほかの処理が動いているので、今回の自動実行は見送りました'); return '見送り'; }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const parts = [];
  try {
    const cfg = readSettings_();
    let waitingKeys = [];
    try {
      const reg = syncRegistrations_(new Date());
      if (reg.msg !== '案件登録なし') parts.push('案件登録 ' + reg.msg);
    } catch (e) {
      parts.push('案件登録エラー：' + String(e && e.message || e));
    }
    try {
      const t = transfer_();
      waitingKeys = t.waitingKeys;
      parts.push('転記 追加' + t.added + (t.needCheck ? '（要確認' + t.needCheck + '）' : '') + '・更新' + t.updated);
    } catch (e) {
      parts.push('転記エラー：' + String(e && e.message || e));
    }
    if (cfg.autoSend) {
      try {
        const res = runSend_(false, { auto: true, waitingKeys });
        parts.push(res === '対象なし' ? '自動登録 対象なし' : '自動登録 ' + res.split('\n')[1]);
      } catch (e) {
        parts.push('自動登録エラー：' + String(e && e.message || e));
      }
    } else {
      parts.push('自動登録はしない設定');
    }
  } catch (e) {
    parts.push('エラー：' + String(e && e.message || e));
  } finally {
    const line = fmtDateTime_(new Date()) + '　' + parts.join(' ／ ');
    try { writeSetting_(ss, 'lastAuto', line); } catch (e) { console.log(line); }
    lock.releaseLock();
  }
  return parts.join(' ／ ');
}

/** メニュー：自動実行を今すぐ1回動かして結果を出す */
function runAutoNow() {
  alertOrLog_('自動実行の結果\n\n' + autoRun());
}

/** 30分ごとの自動実行を設定する（既にあれば作り直す。何度実行しても1つだけ） */
function installAutoTrigger_() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === AUTO_HANDLER).forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger(AUTO_HANDLER).timeBased().everyMinutes(AUTO_EVERY_MINUTES).create();
  // 入力シートの編集の瞬間に翻訳日時・時間入力日時を入れる（入力シートを開けないときは30分ごとの自動実行で入れる）
  try { installStaffEditTrigger_(readSettings_().fileId); } catch (e) { console.log('編集トリガーを設定できませんでした: ' + (e && e.message || e)); }
  // 『案件登録』に書いたらすぐ入力シートへ写す
  try { installAdminEditTrigger_(SpreadsheetApp.getActiveSpreadsheet().getId()); } catch (e) { console.log('管理者シートの編集トリガーを設定できませんでした: ' + (e && e.message || e)); }
}
function startAutoRun() {
  installAutoTrigger_();
  alertOrLog_('30分ごとの自動実行を始めました（転記＋「未送信」の行の自動登録）。\n止めるときはメニュー「自動実行を止める」。');
}
function stopAutoRun() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === STAFF_EDIT_HANDLER || t.getHandlerFunction() === ADMIN_EDIT_HANDLER).forEach(t => ScriptApp.deleteTrigger(t));
  const n = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === AUTO_HANDLER).map(t => ScriptApp.deleteTrigger(t)).length;
  alertOrLog_(n ? '30分ごとの自動実行を止めました。転記・送信はメニューから手で行えます。' : '自動実行は設定されていません。');
}

// ============ 案件登録（管理者）→ エンジニア入力シート → 翻訳 → 時間計算の催促（Discord） ============
// 流れ：
//   ① 管理者が『案件登録』タブに1視点1行で登録（社外案件名・担当者・視点・パターン・サーバーリンク・納期・注文書…）
//   ② 30分ごとの自動実行（またはメニュー）で、エンジニア入力シートへ必要な列だけ写す（注文書・管理者メモ・担当者・納期は写さない）
//   ③ 通訳が入力シートの「翻訳済み」にチェック → エンジニアが White・Color・pts と作業の分け方を書く
//   ④ 翻訳済み・時間・作業の分け方を『案件登録』に読み戻し、状態（翻訳待ち／時間計算待ち／時間入力済み）を付ける
//   ⑤ 翻訳済みから2時間たっても時間が空なら Discord で催促（以降1時間ごと）
//   ⑥ 時間が入った行は、いつもの転記 → 自動登録で工程図へ（担当者・納期は『案件登録』から入る）
const REG_H = {
  no: '登録No', state: '状態',
  code: '会社コード', number: '案件番号', name: '社外案件名', internal: '社内案件名', assignee: '担当者', request: '新規or修正',
  cut: '視点', pattern: 'パターン', link: 'サーバーリンク', deadline: '納期', order: '注文書', memo: '管理者メモ',
  translated: '翻訳済み', translatedAt: '翻訳日時', transNote: '翻訳メモ', white: 'White', color: 'Color', other: 'pts', total: '合計', split: '作業の分け方',
  estimator: '時間入力者', estimatedAt: '時間入力日時',
  regDate: '登録日時', delivery: '納品名', message: '連絡文',
  manual: '今すぐ連携', copy: 'コピー', toInterp: '通訳へのメッセージ', interpMessage: '通訳向け連絡文', copiedAt: '入力シートへ写した日時', notifiedAt: '最後の催促', notifyCount: '催促回数',
};
const REG_ORDER = ['no', 'state', 'manual', 'regDate', 'copy', 'code', 'number', 'name', 'internal', 'assignee', 'request', 'cut', 'pattern', 'link', 'deadline', 'order', 'memo', 'toInterp',
  'translated', 'translatedAt', 'transNote', 'white', 'color', 'other', 'total', 'split', 'estimator', 'estimatedAt', 'copiedAt', 'notifiedAt', 'notifyCount', 'delivery', 'message', 'interpMessage'];
// 管理者が書く列（ほかの列は自動で入る）
const REG_INPUT = ['code', 'number', 'name', 'assignee', 'request', 'cut', 'pattern', 'link', 'deadline', 'order', 'memo', 'toInterp'];
// エンジニア入力シートへ写す列（案件登録 → 入力シート。担当者・納期・注文書・管理者メモは写さない）
const REG_COPY = ['code', 'number', 'name', 'link', 'request', 'cut', 'pattern', 'toInterp'];
const REG_STATE = { DRAFT: '記入中', TRANSLATE: '翻訳待ち', ESTIMATE: '時間計算待ち', DONE: '時間入力済み', MISSING: '入力シートに無い' };
const REG_NOTES = {
  no: '自動で入る番号。入力シートの「登録No」と同じ。消すと次の自動実行でもう一度写す（入力シートに同じ行が2つできるので注意）',
  state: '自動：記入中（会社コード・案件番号・視点・新規or修正のどれかが空）／翻訳待ち／時間計算待ち（翻訳済み・時間が空）／時間入力済み／入力シートに無い（入力シートで行が消された）',
  code: 'REN・RIC など（『会社マスタ』の英字）', number: '案件の番号（数字）', name: 'お客様の案件名（工程図の案件名）',
  internal: '自動：会社コード＋案件番号（RIC.34）', assignee: '工程図の担当者（入力シートには写さない）',
  request: 'その視点の初回は「新規」、2回目以降は「修正」', cut: 'EX1・IN2 など（『視点マスタ』のキーワード＋番号）', pattern: 'パターン違いがあれば A・B…',
  link: '保存先フォルダのリンク', deadline: '納期（入力シートには写さない。工程図の納期に入る）', order: '注文書のファイルのリンクなど（入力シートには写さない）',
  memo: '管理者だけのメモ（入力シートには写さない）',
  translated: '自動：入力シートで通訳がチェックしたら「済」', translatedAt: '自動：入力シートで翻訳済みにチェックした日時。ここから催促の時間を数える',
  transNote: '自動：入力シートの翻訳メモ', white: '自動：入力シートの White', color: '自動：入力シートの Color', other: '自動：入力シートの pts',
  total: '自動：White＋Color＋pts', split: '自動：入力シートの作業の分け方',
  estimator: '自動：入力シートの時間入力者（制作時間を決めた人）', estimatedAt: '自動：入力シートに制作時間が書かれた日時',
  regDate: '自動：書き始めた日時。会社コード・案件番号・視点・新規or修正がそろって入力シートへ写した（登録Noが付いた）ときにその日時に直す。連絡文の {登録日時} {計算期限} のもと',
  copiedAt: '自動：入力シートへ写した（直した）日時', notifiedAt: '自動：最後に Discord で催促した日時', notifyCount: '自動：催促した回数',
  manual: 'チェックすると、その行をすぐ入力シートへ写す（手動連携。終わるとチェックは外れる）',
  copy: 'チェックすると、その行の案件の連絡文（エンジニア向け・通訳向け）の画面が開く。同じ案件・同じ登録日の視点（R0001〜R0003 など）は1通にまとめて出る。文章は選んだ状態なので ⌘C（Windows は Ctrl+C）でコピーできる。チェックはすぐ外れる',
  toInterp: '通訳へのメッセージ（翻訳してほしい点・注意点など）。入力シートの「管理者からの連絡」に写り、「通訳向け連絡文」にも入る',
  interpMessage: '自動：通訳に送る連絡文（ひな形は『設定』の「通訳向けの連絡文」）。メニュー「連絡文をコピー」でコピー・Discord へ送信もできる',
  message: '自動：エンジニア・通訳に送る連絡文（ひな形は『設定』の「登録時の連絡文」）。同じ社内案件名・同じ入力日の行は1通にまとめる。メニュー「連絡文をコピー」でコピー・Discord へ送信もできる',
  delivery: '自動：工程図での納品名（工程図に登録された後に入る。ステップが複数なら「 / 」区切り）',
};

/** メニュー：『案件登録』を今すぐ入力シートへ写し、翻訳・時間を読み戻す（催促もここで送る） */
function syncRegistrationsNow() {
  return withLock_(() => {
    const r = syncRegistrations_(new Date());
    alertOrLog_('案件登録の反映\n\n' + r.msg);
    return r.msg;
  });
}

/** 『案件登録』タブを用意して見出し・注記・プルダウンを整える（何度実行しても安全） */
function ensureRegSheet_(ss, masters) {
  let sheet = ss.getSheetByName(SHEET.REG);
  if (!sheet) sheet = ss.insertSheet(SHEET.REG, 0);
  const lastCol = sheet.getLastColumn();
  const first = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(v => trimStr_(v)) : [];
  if (first.filter(Boolean).length === 0) {
    ensureSize_(sheet, 1, REG_ORDER.length);
    sheet.getRange(1, 1, 1, REG_ORDER.length).setValues([REG_ORDER.map(k => REG_H[k])]);
  } else {
    const missing = REG_ORDER.filter(k => first.indexOf(REG_H[k]) < 0);
    if (missing.length) {
      ensureSize_(sheet, 1, lastCol + missing.length);
      sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing.map(k => REG_H[k])]);
    }
  }
  if (masters) formatRegSheet_(sheet, masters, readCompanyCodes_(ss));
  return sheet;
}
function formatRegSheet_(sheet, masters, codes) {
  const rc = regHeaderMap_(sheet);
  const n = Math.max(sheet.getMaxRows(), 1000); // 式を入れるので「最後の行＋α」にはしない（押すたびに広がらないように）
  ensureSize_(sheet, n, sheet.getLastColumn());
  sheet.setFrozenRows(1);
  const dv = () => SpreadsheetApp.newDataValidation();
  const list = (values, allowInvalid) => dv().requireValueInList(values, true).setAllowInvalid(allowInvalid).build();
  REG_ORDER.forEach(k => {
    const head = sheet.getRange(1, rc[k]);
    // 人が書く列＝黄色、自動の列＝灰色（『連携』と同じ色分け）
    head.setNote(REG_NOTES[k] || '').setFontWeight('bold').setBackground(REG_INPUT.indexOf(k) >= 0 || k === 'manual' || k === 'copy' ? '#fff2cc' : '#e6e6e6');
  });
  // 社内案件名（会社コード＋案件番号）と合計（White＋Color＋pts）は式。値はスクリプトから書かない
  const C = (k) => 'RC' + rc[k];
  sheet.getRange(2, rc.internal, n - 1, 1).setFormulaR1C1('=IF(' + C('code') + '="","",IF(OR(' + C('number') + '="",REGEXMATCH(' + C('code') + '&"","\\d")),' + C('code') + ',' + C('code') + '&"."&' + C('number') + '))');
  const hrs = C('white') + ',' + C('color') + ',' + C('other');
  sheet.getRange(2, rc.total, n - 1, 1).setFormulaR1C1('=IF(COUNT(' + hrs + ')=0,"",SUM(' + hrs + '))');
  sheet.getRange(2, rc.manual, n - 1, 1).setDataValidation(dv().requireCheckbox().build());
  sheet.getRange(2, rc.copy, n - 1, 1).setDataValidation(dv().requireCheckbox().build());
  if (codes && codes.length) sheet.getRange(2, rc.code, n - 1, 1).setDataValidation(list(codes, true));
  sheet.getRange(2, rc.number, n - 1, 1).setDataValidation(dv().requireNumberBetween(1, 99999).setAllowInvalid(false).build());
  sheet.getRange(2, rc.request, n - 1, 1).setDataValidation(list(REQUEST_OPTIONS, false));
  sheet.getRange(2, rc.cut, n - 1, 1).setDataValidation(list(viewCodeOptions_(masters.views), true));
  sheet.getRange(2, rc.pattern, n - 1, 1).setDataValidation(list(PATTERN_OPTIONS, true));
  sheet.getRange(2, rc.deadline, n - 1, 1).setNumberFormat('yyyy-mm-dd');
  ['translatedAt', 'estimatedAt', 'regDate', 'copiedAt', 'notifiedAt'].forEach(k => sheet.getRange(2, rc[k], n - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm'));
}
function regHeaderMap_(sheet) {
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(v => trimStr_(v));
  const col = {};
  Object.keys(REG_H).forEach(k => { const i = headers.indexOf(REG_H[k]); if (i >= 0) col[k] = i + 1; });
  const missing = Object.keys(REG_H).filter(k => !col[k]);
  if (missing.length) throw new Error('『' + SHEET.REG + '』タブの見出しが見つかりません: ' + missing.map(k => REG_H[k]).join('、') + '（メニュー「初期設定」を実行してください）');
  return col;
}

/** 『案件登録』の1行（列名→値）＋入力シートの値 → 状態（純ロジック） */
function regState_(r) {
  if (!trimStr_(r.code) || !trimStr_(r.number) || !trimStr_(r.cut) || !trimStr_(r.request)) return REG_STATE.DRAFT;
  if (r.missing) return REG_STATE.MISSING;
  if (toHours_(r.white) + toHours_(r.color) + toHours_(r.other) > 0) return REG_STATE.DONE;
  return r.translated ? REG_STATE.ESTIMATE : REG_STATE.TRANSLATE;
}
/** 催促の時間帯（'8-20' / '8:00-20:00'）に now が入っているか。空・読めないときは常に true */
function inNotifyHours_(now, spec) {
  const m = String(spec || '').replace(/[〜～~]/g, '-').match(/^\s*(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*$/);
  if (!m) return true;
  const cur = minutesOfDayVN_(now);
  const from = +m[1] * 60 + +(m[2] || 0);
  const to = +m[3] * 60 + +(m[4] || 0);
  return from <= to ? (cur >= from && cur < to) : (cur >= from || cur < to);
}
/**
 * 催促する行か（純ロジック）。時間計算待ちで、翻訳済みから first 時間たち、
 * まだ催促していない／前の催促から repeat 時間たった（5分の余裕）行。
 */
function isReminderDue_(r, now, cfg) {
  if (r.state !== REG_STATE.ESTIMATE) return false;
  const tr = parseDateTime_(r.translatedAt);
  if (!tr) return false;
  const H = 3600000;
  if (now.getTime() - tr.getTime() < cfg.notifyFirst * H) return false;
  const last = parseDateTime_(r.notifiedAt);
  if (!last || last.getTime() < tr.getTime()) return true; // 翻訳済みを付け直したら数え直す
  return now.getTime() - last.getTime() >= cfg.notifyRepeat * H - 5 * 60000;
}
/** 催促のメッセージ（日本語・ベトナム語）。items: [{ label, hours }] */
function reminderMessage_(items, cfg) {
  const lines = ['⏰ 制作時間の計算をお願いします / Vui lòng nhập số giờ dự kiến (White / Color / pts)'];
  items.forEach(it => lines.push('・' + it.label + ' … 翻訳済みから ' + it.hours + '時間 / đã ' + it.hours + ' giờ'));
  if (cfg && cfg.fileId) lines.push('入力先 / Nhập tại: https://docs.google.com/spreadsheets/d/' + cfg.fileId + '/edit');
  return lines.join('\n');
}
function regLabel_(r) {
  const req = String(r.request || '').indexOf('修正') === 0 ? '修正' : '新規';
  return [joinCode_(r.code, r.number), trimStr_(r.name), viewpointNameOf_(r.cut, r.pattern)].filter(Boolean).join(' ') +
    '（' + req + '）' + (trimStr_(r.assignee) ? ' 担当 ' + trimStr_(r.assignee) : '');
}
function nextRegNo_(rows, col) {
  let max = 0;
  rows.forEach(r => { const m = String(r[col.no - 1] || '').match(/(\d+)/); if (m) max = Math.max(max, parseInt(m[1], 10)); });
  return function () { max++; return 'R' + ('000' + max).slice(-4); };
}

/**
 * 『案件登録』⇄ エンジニア入力シート の同期と、時間計算の催促。
 * 戻り値: { msg, copied, updated, estimate, reminded, missing }
 */
function syncRegistrations_(now) {
  const cfg = readSettings_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reg = ss.getSheetByName(SHEET.REG);
  if (!reg || reg.getLastRow() < 2) return { msg: '案件登録なし', copied: 0, updated: 0, estimate: 0, reminded: 0, missing: 0 };
  const rc = regHeaderMap_(reg);
  const data = reg.getDataRange().getValues();

  const staffFile = SpreadsheetApp.openById(cfg.fileId);
  const staff = staffFile.getSheetByName(cfg.tabName);
  if (!staff) throw new Error('エンジニア入力シートにタブ「' + cfg.tabName + '」が見つかりません');
  const hr = findStaffHeaderRow_(staff);
  if (hr < 0) throw new Error('エンジニア入力シートに見出しの行が見つかりません');
  const sc = ensureStaffExtraColumns_(staff, hr);
  const width = Math.max.apply(null, Object.keys(sc).map(k => sc[k]));
  const sLast = staff.getLastRow();
  const sVals = sLast > hr ? staff.getRange(hr + 1, 1, sLast - hr, width).getValues() : [];
  const byNo = new Map();
  const keyByNo = new Map(); // 登録No → 取込キー（『連携』の行・工程図の externalId の先頭と同じ）
  const counts = new Map();
  let lastData = hr; // 最後に中身がある行（プルダウンだけの行は数えない）
  sVals.forEach((v, i) => {
    const no = sc.regNo ? trimStr_(v[sc.regNo - 1]) : '';
    if (no) byNo.set(no, { row: hr + 1 + i, v });
    const code = joinCode_(v[sc.code - 1], sc.number ? v[sc.number - 1] : '');
    const cut = trimStr_(v[sc.cut - 1]);
    if (code && cut) {
      const base = normCode_(code) + '::' + normCut_(viewpointNameOf_(cut, sc.pattern ? v[sc.pattern - 1] : ''));
      const n = (counts.get(base) || 0) + 1;
      counts.set(base, n);
      if (no) keyByNo.set(no, base + '::' + n);
    }
    if (['code', 'number', 'cut', 'white', 'regNo'].some(k => sc[k] && trimStr_(v[sc[k] - 1]) !== '')) lastData = hr + 1 + i;
  });

  const deliveryNames = readDeliveryNames_(cfg);
  const next = nextRegNo_(data.slice(1), rc);
  const regUpdates = []; // { row, col, value }
  const staffUpdates = [];
  const appends = [];
  const due = [];
  let copied = 0, updated = 0, estimate = 0, missing = 0;
  const setReg = (r, k, value) => { if (!sameCell_(data[r][rc[k] - 1], value)) { regUpdates.push({ row: r + 1, col: rc[k], value }); data[r][rc[k] - 1] = value; } };

  for (let r = 1; r < data.length; r++) {
    const get = (k) => data[r][rc[k] - 1];
    if (REG_INPUT.every(k => trimStr_(get(k)) === '')) continue;
    const row = {};
    Object.keys(rc).forEach(k => { row[k] = get(k); });
    if (trimStr_(row.regDate) === '') setReg(r, 'regDate', now); // 書き始めた日時（登録Noが付いたときに直す）
    const draft = regState_(row) === REG_STATE.DRAFT;
    if (draft) { setReg(r, 'state', REG_STATE.DRAFT); continue; }

    let no = trimStr_(row.no);
    let srow = null; // 入力シートの行の値（配列）
    if (!no) {
      no = next();
      setReg(r, 'no', no);
      setReg(r, 'copiedAt', now);
      setReg(r, 'regDate', now); // 登録日時＝入力シートへ写した（登録Noが付いた）日時
      const arr = new Array(width).fill('');
      REG_COPY.forEach(k => { if (sc[k]) arr[sc[k] - 1] = k === 'pattern' ? normPattern_(row[k]) : (k === 'number' ? row[k] : trimStr_(row[k])); });
      arr[sc.regNo - 1] = no;
      appends.push(arr);
      srow = arr;
      copied++;
    } else if (byNo.has(no)) {
      const hit = byNo.get(no);
      srow = hit.v;
      let changed = false;
      REG_COPY.forEach(k => {
        if (!sc[k]) return;
        const want = k === 'pattern' ? normPattern_(row[k]) : (k === 'number' ? row[k] : trimStr_(row[k]));
        if (!sameCell_(srow[sc[k] - 1], want)) { staffUpdates.push({ row: hit.row, col: sc[k], value: want }); changed = true; }
      });
      if (changed) { setReg(r, 'copiedAt', now); updated++; }
    } else {
      row.missing = true;
    }

    if (srow) {
      const sv = (k) => (sc[k] ? srow[sc[k] - 1] : '');
      const srcRow = byNo.has(no) ? byNo.get(no).row : null; // 入力シートの行番号（今回追加した行は null）
      const putStaff = (k, value) => { if (srcRow && sc[k] && !sameCell_(srow[sc[k] - 1], value)) staffUpdates.push({ row: srcRow, col: sc[k], value }); };
      const st = readStaffStamps_(srow, sc, now);
      row.translated = st.translated;
      row.white = sv('white'); row.color = sv('color'); row.other = sv('other');
      setReg(r, 'translated', st.translated ? '済' : '');
      ['white', 'color', 'other'].forEach(k => setReg(r, k, toHours_(row[k]) || ''));
      setReg(r, 'split', trimStr_(sv('split')));
      setReg(r, 'transNote', trimStr_(sv('transNote')));
      setReg(r, 'estimator', trimStr_(sv('estimator')));
      // 入力シートの自動列（編集の瞬間に入らなかったときの保険：ここで入れる）
      putStaff('transAt', st.transAt || '');
      putStaff('estimatedAt', st.estimatedAt || '');
      setReg(r, 'translatedAt', st.transAt || '');
      setReg(r, 'estimatedAt', st.estimatedAt || '');
      row.translatedAt = st.transAt || '';
      // 納品名（工程図に登録された後）
      const names = deliveryNames && keyByNo.has(no) ? deliveryNames[keyByNo.get(no)] : null;
      if (names) {
        const text = names.join(' / ');
        setReg(r, 'delivery', text);
        putStaff('delivery', text);
      }
    }
    row.state = regState_(row);
    setReg(r, 'state', row.state);
    if (row.state === REG_STATE.MISSING) missing++;
    if (row.state === REG_STATE.ESTIMATE) {
      estimate++;
      if (isReminderDue_(row, now, cfg)) {
        const tr = parseDateTime_(row.translatedAt);
        due.push({ r, label: regLabel_(row), hours: Math.floor((now.getTime() - tr.getTime()) / 3600000), count: parseInt(row.notifyCount, 10) || 0 });
      }
    }
  }

  // 連絡文（同じ社内案件名・同じ入力日の行は1通にまとめる）
  const msgOpts = regMessageOpts_(cfg, ss);
  const groups = new Map();
  for (let r = 1; r < data.length; r++) {
    const row = {};
    Object.keys(rc).forEach(k => { row[k] = data[r][rc[k] - 1]; });
    if (regState_(row) === REG_STATE.DRAFT) continue;
    const k = regGroupKey_(row);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push({ r, row });
  }
  groups.forEach(list => {
    const text = renderRegMessage_(cfg.regMessage, list.map(x => x.row), msgOpts);
    const interp = renderRegMessage_(cfg.interpMessage, list.map(x => x.row), msgOpts);
    list.forEach(x => { setReg(x.r, 'message', text); setReg(x.r, 'interpMessage', interp); });
  });

  // 入力シートへの書き込み（追加は最後に中身がある行の下へ）
  staffUpdates.forEach(u => staff.getRange(u.row, u.col).setValue(u.value));
  if (appends.length) {
    // 写す列と登録Noだけを書く（行ごと書くと、合計などの式を消してしまう）
    const start = lastData + 1;
    ensureSize_(staff, start + appends.length - 1, width);
    const cols = REG_COPY.map(k => sc[k]).concat([sc.regNo]).filter(Boolean);
    appends.forEach((arr, i) => cols.forEach(c => { if (arr[c - 1] !== '') staff.getRange(start + i, c).setValue(arr[c - 1]); }));
  }

  // 催促（Discord）
  let reminded = 0, remindNote = '';
  if (due.length) {
    const url = PropertiesService.getScriptProperties().getProperty(PROP_DISCORD);
    if (!cfg.notify) remindNote = '催促 ' + due.length + '件（「しない」設定）';
    else if (!url) remindNote = '催促 ' + due.length + '件（Discord の Webhook が未設定。メニュー「Discord 通知の設定」）';
    else if (!inNotifyHours_(now, cfg.notifyHours)) remindNote = '催促 ' + due.length + '件（時間帯の外なので待つ）';
    else {
      sendDiscord_(url, reminderMessage_(due, cfg));
      due.forEach(d => { setReg(d.r, 'notifiedAt', now); setReg(d.r, 'notifyCount', d.count + 1); });
      reminded = due.length;
      remindNote = 'Discord で催促 ' + reminded + '件';
    }
  }
  regUpdates.forEach(u => reg.getRange(u.row, u.col).setValue(u.value));

  const msg = '入力シートへ写した ' + copied + '件・直した ' + updated + '件・時間計算待ち ' + estimate + '件' +
    (missing ? '・入力シートに無い ' + missing + '件' : '') + (remindNote ? '・' + remindNote : '');
  console.log(msg);
  return { msg, copied, updated, estimate, reminded, missing };
}

/**
 * 入力シートの1行 → 翻訳済み・翻訳日時・合計・時間入力日時（純ロジック）。
 * 翻訳日時：チェックがあって日時が空なら now、チェックが外れたら空。時間入力日時：時間が入っていて空なら now、時間が全部空なら空。
 */
function readStaffStamps_(v, sc, now) {
  const at = (k) => (sc[k] ? v[sc[k] - 1] : '');
  const translated = isChecked_(at('translated'));
  const total = Math.round((toHours_(at('white')) + toHours_(at('color')) + toHours_(at('other'))) * 100) / 100;
  const tr = parseDateTime_(at('transAt'));
  const es = parseDateTime_(at('estimatedAt'));
  return {
    translated, total,
    transAt: translated ? (tr || now) : null,
    estimatedAt: total > 0 ? (es || now) : null,
  };
}

/**
 * エンジニア入力シートを編集した瞬間に動く（「かんたん初期設定」「自動実行を始める」で設定するトリガー）。
 * 翻訳済みにチェック → 翻訳日時、時間を書く → 時間入力日時 をその場で入れる（合計は式）。
 * このトリガーは入力シートのファイルで動くので、管理者シートの『設定』は読まない。
 */
function onStaffEdit(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.range.getSheet();
    const hr = findStaffHeaderRow_(sheet);
    if (hr < 0 || e.range.getLastRow() <= hr) return;
    const lastCol = sheet.getLastColumn();
    const sc = mapStaffColumns_(sheet.getRange(hr, 1, 1, lastCol).getValues()[0]);
    if (!sc.number || !sc.translated || !sc.transAt || !sc.estimatedAt) return; // 今のレイアウトの入力タブだけ
    const watch = ['translated', 'white', 'color', 'other'].map(k => sc[k]).filter(Boolean);
    const c1 = e.range.getColumn(), c2 = e.range.getLastColumn();
    if (!watch.some(c => c >= c1 && c <= c2)) return;
    const r1 = Math.max(e.range.getRow(), hr + 1), r2 = e.range.getLastRow();
    const width = Math.max.apply(null, Object.keys(sc).map(k => sc[k]));
    const vals = sheet.getRange(r1, 1, r2 - r1 + 1, width).getValues();
    const now = new Date();
    vals.forEach((v, i) => {
      const st = readStaffStamps_(v, sc, now);
      const put = (k, value) => { if (sc[k] && !sameCell_(v[sc[k] - 1], value)) sheet.getRange(r1 + i, sc[k]).setValue(value); };
      put('transAt', st.transAt || '');
      put('estimatedAt', st.estimatedAt || '');
    });
  } catch (err) {
    console.log('onStaffEdit: ' + (err && err.message || err));
  }
}
const STAFF_EDIT_HANDLER = 'onStaffEdit';
/** 入力シートの編集トリガーを設定する（既にあれば作り直す。何度実行しても1つだけ） */
function installStaffEditTrigger_(fileId) {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === STAFF_EDIT_HANDLER).forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger(STAFF_EDIT_HANDLER).forSpreadsheet(fileId).onEdit().create();
}

/** 連絡文をまとめる単位：社内案件名＋入力日（同じ日に登録した同じ案件の視点は1通） */
function regGroupKey_(row) {
  const d = parseDateTime_(row.regDate);
  return normCode_(joinCode_(row.code, row.number)) + '::' + (d ? fmtYMD_(d) : '');
}
/**
 * 連絡文のひな形 → 文（純ロジック）。rows は同じ案件の行（1行目の値を使い、{視点一覧} は全行の視点）。
 * 使える文字：{社内案件名} {社外案件名} {サーバーリンク} {視点一覧} {視点} {パターン} {担当者} {納期} {新規or修正}
 *   {通訳へのメッセージ} {登録日時} {計算期限}（＝登録日時＋opts.calcMinutes 分）。opts.fmt で日時の書き方を変えられる
 */
function renderRegMessage_(template, rows, opts) {
  const list = (rows || []).filter(Boolean);
  if (!list.length) return '';
  const first = list[0];
  const o = opts || {};
  const fmtDT = o.fmt || ((d) => (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + pad2_(d.getMinutes()));
  // 登録日時：まとめた行のうち一番早いもの。{計算期限} ＝ 登録日時＋calcMinutes 分
  const regs = list.map(r => parseDateTime_(r.regDate)).filter(Boolean).sort((a, b) => a - b);
  const reg = regs.length ? regs[0] : null;
  const mins = o.calcMinutes != null && isFinite(o.calcMinutes) ? o.calcMinutes : 75;
  const dl = parseDateTime_(first.deadline);
  const links = [];
  list.forEach(r => { const l = trimStr_(r.link); if (l && links.indexOf(l) < 0) links.push(l); });
  const views = list.map(r => viewpointNameOf_(r.cut, r.pattern)).filter(Boolean);
  const vals = {
    '社内案件名': joinCode_(first.code, first.number),
    '社外案件名': trimStr_(first.name),
    'サーバーリンク': links.join('\n'),
    '視点一覧': views.join('・'),
    '視点': viewpointNameOf_(first.cut, ''),
    'パターン': normPattern_(first.pattern),
    '担当者': trimStr_(first.assignee),
    '納期': dl ? (dl.getMonth() + 1) + '/' + dl.getDate() : trimStr_(first.deadline),
    '新規or修正': String(first.request || '').indexOf('修正') === 0 ? '修正' : '新規',
    '通訳へのメッセージ': list.map(r => trimStr_(r.toInterp)).filter((v, i, a) => v && a.indexOf(v) === i).join('\n'),
    '登録日時': reg ? fmtDT(reg) : '',
    '計算期限': reg ? fmtDT(new Date(reg.getTime() + mins * 60000)) : '',
  };
  return String(template || '').replace(/\{([^{}]+)\}/g, (m, k) => (k in vals ? vals[k] : m)).replace(/\n{3,}/g, '\n\n').trim();
}

/** 連絡文の日時はベトナム時間で「11/3 15:15」の形にする（シートのタイムゾーンの設定に関係なく） */
function regMessageOpts_(cfg, ss) {
  const fmt = typeof Utilities !== 'undefined' ? (d) => Utilities.formatDate(d, APP_TIME_ZONE, 'M/d H:mm') : null;
  return { calcMinutes: cfg.calcMinutes, fmt };
}

// 連絡文ダイアログの中で動くスクリプト。
// Apps Script のダイアログは入れ子の iframe で、クリップボードへの書き込みの許可が無い（allow に clipboard-write が無い）。
// 2026-11-03：「コピー」を押しても何も起きなかった。そこで
//   ・ボタンは onclick 属性ではなく、読み込み後に addEventListener で付ける
//   ・開いた時点でエンジニア向けの文章を選んだ状態にし、⌘C／Ctrl+C だけでコピーできるようにする（ボタンが効かなくても使える）
//   ・コピーは押した操作の中で execCommand("copy") → clipboard API の順に試し、だめなら ⌘C を案内する（黙って止まらない）
const REG_DIALOG_COPY_FAIL = '自動でコピーできませんでした。文章を選んだ状態にしたので ⌘C（Windows は Ctrl+C）でコピーしてください';
const REG_DIALOG_READY = '文章を選んだ状態です。⌘C（Windows は Ctrl+C）でもコピーできます';
const REG_DIALOG_SCRIPT =
  'function msg(id,t){var m=document.getElementById(id+"m");if(m)m.textContent=t;}' +
  'function pick(t){try{t.focus();t.select();t.setSelectionRange(0,t.value.length);}catch(e){}}' +
  'function copyText(id){var t=document.getElementById(id);var ng=' + JSON.stringify(REG_DIALOG_COPY_FAIL) + ';' +
  'pick(t);var ok=false;try{ok=document.execCommand("copy");}catch(e){ok=false;}' +
  'if(ok){msg(id,"コピーしました");return;}' +
  'try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t.value).then(function(){msg(id,"コピーしました");},function(){msg(id,ng);});return;}}catch(e){}' +
  'msg(id,ng);}' +
  'function sendText(id){msg(id,"送信中…");google.script.run.withSuccessHandler(function(){msg(id,"Discord に送りました");})' +
  '.withFailureHandler(function(e){msg(id,e.message||e);}).sendTextToDiscord(document.getElementById(id).value);}' +
  'var bs=document.querySelectorAll("button[data-act]");for(var i=0;i<bs.length;i++){(function(b){b.addEventListener("click",function(){' +
  'var id=b.getAttribute("data-id");if(b.getAttribute("data-act")==="copy"){copyText(id);}else{sendText(id);}});})(bs[i]);}' +
  'var e0=document.getElementById("eng");if(e0){pick(e0);msg("eng",' + JSON.stringify(REG_DIALOG_READY) + ');}';

/** メニュー：『案件登録』で選んだ行の連絡文を出す（コピー・Discord へ送信） */
function showRegMessage() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  if (!sheet || sheet.getName() !== SHEET.REG) { alertOrLog_('『' + SHEET.REG + '』タブで、連絡文を出したい行（複数可）を選んでから押してください。'); return; }
  const range = sheet.getActiveRange();
  const r1 = Math.max(2, range.getRow()), r2 = range.getLastRow();
  if (r2 < r1) { alertOrLog_('見出しより下の行を選んでください。'); return; }
  const rows = [];
  for (let r = r1; r <= r2; r++) rows.push(r);
  showRegMessageRows_(ss, sheet, rows, false);
}
/**
 * 『案件登録』の行（行番号の配列）の連絡文の画面を出す（メニュー「連絡文をコピー」と「コピー」列のチェックから呼ぶ）。
 * 文は「連絡文」列と同じく、同じ案件・同じ登録日の行を1通にまとめる。
 * wholeCase=true（「コピー」列）のときは、選んだ行と同じ案件・同じ登録日の行をシート全体から集める
 * （R0001 にチェックしても、同じ日に登録した R0002・R0003 の視点も入った1通になる）。
 */
function showRegMessageRows_(ss, sheet, rowNumbers, wholeCase) {
  const cfg = readSettings_();
  const rc = regHeaderMap_(sheet);
  const last = sheet.getLastRow();
  if (last < 2) { alertOrLog_('選んだ行に、会社コード・案件番号・視点・新規or修正がそろった行がありません。'); return; }
  const all = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
  const rowObj = (v) => { const row = {}; Object.keys(rc).forEach(k => { row[k] = v[rc[k] - 1]; }); return row; };
  const picked = rowNumbers.filter(r => r >= 2 && r <= last).map(r => rowObj(all[r - 2])).filter(row => regState_(row) !== REG_STATE.DRAFT);
  let target = picked;
  if (wholeCase && picked.length) {
    const keys = new Set(picked.map(regGroupKey_));
    target = all.map(rowObj).filter(row => regState_(row) !== REG_STATE.DRAFT && keys.has(regGroupKey_(row)));
  }
  const groups = new Map();
  target.forEach(row => {
    const k = regGroupKey_(row);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(row);
  });
  const msgOpts = regMessageOpts_(cfg, ss);
  const join = (tpl) => [...groups.values()].map(list => renderRegMessage_(tpl, list, msgOpts)).filter(Boolean).join('\n\n――――――\n\n');
  const text = join(cfg.regMessage);
  const interp = join(cfg.interpMessage);
  if (!text) { alertOrLog_('選んだ行に、会社コード・案件番号・視点・新規or修正がそろった行がありません。'); return; }
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const hasDiscord = !!PropertiesService.getScriptProperties().getProperty(PROP_DISCORD);
  const box = (id, title, body) =>
    '<div style="margin-bottom:12px"><div style="font-weight:bold;margin-bottom:4px">' + title + '</div>' +
    '<textarea id="' + id + '" style="width:100%;height:150px;font-size:13px">' + esc(body) + '</textarea>' +
    '<div style="margin-top:6px;display:flex;gap:8px">' +
    '<button type="button" data-act="copy" data-id="' + id + '">コピー</button>' +
    (hasDiscord ? '<button type="button" data-act="send" data-id="' + id + '">Discord へ送る</button>' : '') +
    '<span id="' + id + 'm" style="color:#2e7d32;align-self:center"></span></div></div>';
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;font-size:13px">' +
    box('eng', 'エンジニア向け', text) + box('int', '通訳向け', interp) +
    '<p style="color:#666;font-size:12px">ひな形は『設定』の「登録時の連絡文」「通訳向けの連絡文」で変えられます。ここで直してからコピー・送信してもかまいません。</p></div>' +
    '<script>' + REG_DIALOG_SCRIPT + '</script>'
  ).setWidth(560).setHeight(520);
  SpreadsheetApp.getUi().showModalDialog(html, '連絡文');
}
/** 画面から呼ぶ（名前が _ で終わる関数は google.script.run から呼べない） */
function sendTextToDiscord(text) { return sendTextToDiscord_(text); }
function sendTextToDiscord_(text) {
  const url = PropertiesService.getScriptProperties().getProperty(PROP_DISCORD);
  if (!url) throw new Error('Discord の Webhook が未設定です（メニュー「Discord 通知の設定」）');
  if (!trimStr_(text)) throw new Error('文が空です');
  sendDiscord_(url, text);
  return 'ok';
}

/**
 * 管理者用シートを編集した瞬間に動く（「かんたん初期設定」「自動実行を始める」で設定するトリガー）。
 * 『案件登録』で会社コード・案件番号・視点・新規or修正がそろった行を書いたら、すぐ入力シートへ写す
 * （ほかの処理が動いていれば見送り、30分ごとの自動実行で写す）。
 */
function onAdminEdit(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.range.getSheet();
    // 『設定』の「今すぐ全部連携」にチェック → 自動実行と同じ処理をその場で動かし、チェックを外す
    if (sheet.getName() === SHEET.SETTINGS) {
      const labels = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues().map(r => trimStr_(r[0]));
      const row = labels.indexOf(SETTING_KEYS.manualRun) + 1;
      if (!row || e.range.getRow() > row || e.range.getLastRow() < row || !isChecked_(sheet.getRange(row, 2).getValue())) return;
      try { autoRun(); } finally { sheet.getRange(row, 2).setValue(false); }
      return;
    }
    if (sheet.getName() !== SHEET.REG || e.range.getLastRow() < 2) return;
    const rc = regHeaderMap_(sheet);
    const r1 = Math.max(2, e.range.getRow()), r2 = e.range.getLastRow();
    const vals = sheet.getRange(r1, 1, r2 - r1 + 1, sheet.getLastColumn()).getValues();
    // 「コピー」にチェックした行 → チェックを外して連絡文の画面を出す（ロックも連携も要らない）
    if (rc.copy && e.range.getColumn() <= rc.copy && e.range.getLastColumn() >= rc.copy) {
      const copyRows = [];
      vals.forEach((v, i) => { if (isChecked_(v[rc.copy - 1])) copyRows.push(r1 + i); });
      if (copyRows.length) {
        copyRows.forEach(r => sheet.getRange(r, rc.copy).setValue(false));
        showRegMessageRows_(e.source || SpreadsheetApp.getActiveSpreadsheet(), sheet, copyRows, true);
        return;
      }
    }
    // 「今すぐ連携」にチェックした行（手動連携）
    const manualRows = [];
    vals.forEach((v, i) => { if (isChecked_(v[rc.manual - 1])) manualRows.push(r1 + i); });
    const ready = manualRows.length > 0 || vals.some(v => {
      const row = {};
      Object.keys(rc).forEach(k => { row[k] = v[rc[k] - 1]; });
      return regState_(row) !== REG_STATE.DRAFT;
    });
    if (!ready) return;
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(manualRows.length ? 20000 : 3000)) return;
    try {
      const res = syncRegistrations_(new Date());
      if (manualRows.length) toastOrLog_('手動連携：' + res.msg);
    } finally {
      manualRows.forEach(r => sheet.getRange(r, rc.manual).setValue(false));
      lock.releaseLock();
    }
  } catch (err) {
    console.log('onAdminEdit: ' + (err && err.message || err));
  }
}
const ADMIN_EDIT_HANDLER = 'onAdminEdit';
function installAdminEditTrigger_(ssId) {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === ADMIN_EDIT_HANDLER).forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger(ADMIN_EDIT_HANDLER).forSpreadsheet(ssId).onEdit().create();
}

/** 工程図が書き出した納品名（data/deliveryNames：取込キー → 納品名の配列）。読めなければ null（納品名の表示だけ見送る） */
function readDeliveryNames_(cfg) {
  try {
    const s = fsGetValueString_(getAuth_(), cfg, 'deliveryNames');
    const v = s ? JSON.parse(s) : {};
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch (e) {
    console.log('納品名を読めませんでした: ' + (e && e.message || e));
    return null;
  }
}

/** 『案件登録』の 登録No → { assignee, deadline }（転記のとき『連携』の担当者・納期に入れる） */
function readRegInfo_(ss) {
  const reg = ss.getSheetByName(SHEET.REG);
  const map = new Map();
  if (!reg || reg.getLastRow() < 2) return map;
  let rc;
  try { rc = regHeaderMap_(reg); } catch (e) { return map; }
  reg.getDataRange().getValues().slice(1).forEach(v => {
    const no = trimStr_(v[rc.no - 1]);
    if (no) map.set(no, { assignee: trimStr_(v[rc.assignee - 1]), deadline: v[rc.deadline - 1] });
  });
  return map;
}

// ============ Discord ============
/** Discord の Webhook へ送る（2000文字の上限があるので分けて送る） */
function sendDiscord_(url, text) {
  const chunks = [];
  let buf = '';
  String(text).split('\n').forEach(line => {
    if ((buf + '\n' + line).length > 1900) { if (buf) chunks.push(buf); buf = line.slice(0, 1900); }
    else buf = buf ? buf + '\n' + line : line;
  });
  if (buf) chunks.push(buf);
  chunks.forEach(c => {
    const res = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify({ content: c }), muteHttpExceptions: true });
    const code = res.getResponseCode();
    if (code >= 300) throw new Error('Discord への送信に失敗しました（' + code + '）: ' + String(res.getContentText()).slice(0, 200));
  });
}
function isDiscordWebhook_(url) {
  return /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+/.test(trimStr_(url));
}
/** メニュー：Discord の Webhook URL を保存する（スクリプトプロパティに保存。シートには書かない） */
function setDiscordWebhook() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt('Discord 通知の設定',
    'Discord の通知を送りたいチャンネルの「連携サービス」→「ウェブフック」→「ウェブフックURLをコピー」で写した URL を貼り付けてください。\n' +
    '（URL はこのスクリプトの中にだけ保存され、シートには書かれません。空のまま OK を押すと削除します）', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  alertOrLog_(saveDiscordWebhook_(res.getResponseText()));
}
function saveDiscordWebhook_(text) {
  const url = trimStr_(text);
  const props = PropertiesService.getScriptProperties();
  if (!url) { props.deleteProperty(PROP_DISCORD); return 'Discord の Webhook を削除しました。催促は送られません。'; }
  if (!isDiscordWebhook_(url)) throw new Error('Discord の Webhook URL ではないようです（https://discord.com/api/webhooks/… で始まる URL を貼ってください）');
  props.setProperty(PROP_DISCORD, url);
  return '保存しました。メニュー「Discord 通知のテスト送信」で届くか確かめてください。';
}
/** メニュー：Discord にテストのメッセージを送る */
function testDiscord() {
  const url = PropertiesService.getScriptProperties().getProperty(PROP_DISCORD);
  if (!url) { alertOrLog_('Discord の Webhook が未設定です。メニュー「Discord 通知の設定」で URL を貼り付けてください。'); return; }
  try {
    sendDiscord_(url, '✅ 工程図連携シートからのテスト送信です / Tin nhắn thử từ bảng liên kết 工程図');
    alertOrLog_('Discord に送りました。チャンネルに届いているか確かめてください。');
  } catch (e) {
    alertOrLog_(String(e && e.message || e));
  }
}

/** 手で押した転記・送信と自動実行が同時に動かないようにする */
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    const msg = 'ほかの処理（30分ごとの自動実行など）が動いています。少し待ってから、もう一度押してください。';
    alertOrLog_(msg);
    return msg;
  }
  try { return fn(); } finally { lock.releaseLock(); }
}

// ============ 工程図の顧客マスタ ============
/** 『会社マスタ』B列「工程図の会社名」（重複なし・空は除く） */
function companyMasterNames_(ss) {
  const out = [];
  readMasters_(ss).companies.forEach(c => { if (c.company && out.indexOf(c.company) < 0) out.push(c.company); });
  return out;
}
/** 会社名の比べ方：全角半角・大文字小文字・空白・「株式会社」などの違いを無視したキー */
function companyKey_(name) {
  return String(name || '').normalize('NFKC').replace(/株式会社|有限会社|合同会社|\(株\)|\(有\)/g, '').replace(/\s+/g, '').toLowerCase();
}
/**
 * names のうち、工程図の顧客マスタ（customerMaster）に無い会社を追加して保存する。
 * 表記だけ違う会社（「株式会社サンゲツ」と「サンゲツ」など）は二重に作らず、similar に入れて返す。
 * 戻り値: { master: 追加後の顧客マスタ, added: [会社名], similar: [{ name, existing }] }
 */
function ensureKouteiCompanies_(auth, cfg, master, names) {
  const plan = planCompanyAdditions_(master, names);
  if (plan.added.length) {
    const next = master.concat(plan.added.map((company, i) => ({
      id: 'cust-' + Date.now() + '-' + i + Math.random().toString(36).slice(2, 6), company, contacts: [],
    })));
    fsPatch_(auth, cfg, 'workspaces/' + cfg.workspaceId + '/data/customerMaster', { value: JSON.stringify(next), updatedAt: Date.now() }, null);
    return { master: next, added: plan.added, similar: plan.similar };
  }
  return { master, added: [], similar: plan.similar };
}
/** 顧客マスタに足す会社を決める（純ロジック） */
function planCompanyAdditions_(master, names) {
  const exact = new Set((master || []).map(c => trimStr_(c && c.company)).filter(Boolean));
  const byKey = {};
  (master || []).forEach(c => { const n = trimStr_(c && c.company); if (n) byKey[companyKey_(n)] = n; });
  const added = [];
  const similar = [];
  (names || []).forEach(n => {
    const name = trimStr_(n);
    if (!name || exact.has(name) || added.indexOf(name) >= 0) return;
    const hit = byKey[companyKey_(name)];
    if (hit) { if (!similar.some(x => x.name === name)) similar.push({ name, existing: hit }); return; }
    added.push(name);
  });
  return { added, similar };
}
/** メニュー：『会社マスタ』の会社を工程図の顧客マスタに追加する */
function addCompaniesToKoutei() {
  alertOrLog_(syncCompaniesToKoutei_(SpreadsheetApp.getActiveSpreadsheet()).text);
}
function syncCompaniesToKoutei_(ss) {
  const cfg = readSettings_();
  const auth = getAuth_();
  const master = parseJsonArray_(fsGetValueString_(auth, cfg, 'customerMaster'));
  const res = ensureKouteiCompanies_(auth, cfg, master, companyMasterNames_(ss));
  const lines = [];
  lines.push(res.added.length ? '工程図の顧客マスタに ' + res.added.length + ' 社を追加しました：' + res.added.join('、') : '『会社マスタ』の会社は、すべて工程図の顧客マスタにあります。');
  if (res.similar.length) {
    lines.push('表記が少し違う会社があります（二重登録を避けるため追加していません。『会社マスタ』B列を工程図の表記に合わせてください）：');
    res.similar.forEach(x => lines.push('   ' + x.name + ' → 工程図では「' + x.existing + '」'));
  }
  return { ok: true, added: res.added, similar: res.similar, text: lines.join('\n') };
}

// ============ 補助メニュー ============
function fetchCompanyNames() {
  const cfg = readSettings_();
  const auth = getAuth_();
  const master = parseJsonArray_(fsGetValueString_(auth, cfg, 'customerMaster'));
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET.COMPANY) || ss.insertSheet(SHEET.COMPANY);
  const rows = master.map(c => [trimStr_(c && c.company), (c && c.contractType) === 'offshore' ? 'オフショア' : (c && c.contractType) ? String(c.contractType) : '']);
  sheet.getRange(1, 5, 1, 2).setValues([['工程図に登録済みの会社名（参考）', '契約']]).setFontWeight('bold');
  if (sheet.getLastRow() > 1) sheet.getRange(2, 5, sheet.getLastRow() - 1, 2).clearContent();
  if (rows.length) sheet.getRange(2, 5, rows.length, 2).setValues(rows);
  toastOrLog_('工程図の会社名を ' + rows.length + ' 件、会社マスタの E 列に書き出しました。B 列の会社名はこの表記に合わせてください。');
}

function testConnection() {
  alertOrLog_(checkConnection_().text);
}
/** 工程図（Firestore）に接続できるか確かめる。{ ok, text } を返す（ダイアログは出さない） */
function checkConnection_() {
  const cfg = readSettings_();
  try {
    const auth = getAuth_();
    const docs = fsListAll_(auth, cfg, 'workspaces/' + cfg.workspaceId + '/tasks', 1);
    return { ok: true, text: '接続OK（認証方式: ' + (auth.mode === 'service-account' ? 'サービスアカウントの秘密鍵' : 'このGoogleアカウントの権限') + '）\n工程図のタスクを読み取れました（先頭 ' + docs.length + ' 件を確認）。' };
  } catch (e) {
    return { ok: false, text: '接続に失敗しました。\n\n' + String(e && e.message || e) + '\n\n対処:\n1) このスクリプトを実行しているGoogleアカウントが、工程図のFirebaseプロジェクト（' + cfg.projectId + '）のオーナーまたは編集者か確認\n2) それでも失敗する場合は、メニュー「秘密鍵を設定」でサービスアカウントの鍵を登録（手順書を参照）' };
  }
}

function setServiceAccountKey() {
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;font-size:13px">' +
    '<p>Firebase コンソール → プロジェクトの設定 → サービスアカウント → 「新しい秘密鍵の生成」でダウンロードした JSON ファイルの中身を、そのまま貼り付けてください。</p>' +
    '<p>鍵はこのスクリプトの「スクリプトプロパティ」にだけ保存され、シートには書き込まれません。</p>' +
    '<textarea id="k" style="width:100%;height:220px"></textarea><br>' +
    '<button onclick="google.script.run.withSuccessHandler(function(m){alert(m);google.script.host.close();}).withFailureHandler(function(e){alert(e.message||e);}).saveServiceAccountKey(document.getElementById(\'k\').value)">保存</button>' +
    '</div>'
  ).setWidth(560).setHeight(380);
  SpreadsheetApp.getUi().showModalDialog(html, 'サービスアカウントの秘密鍵を設定');
}
/** 画面（ダイアログ）から呼ぶ：名前が _ で終わる関数は google.script.run から呼べないため、別名を用意する */
function saveServiceAccountKey(text) { return saveServiceAccountKey_(text); }
function saveServiceAccountKey_(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { throw new Error('JSON として読めません。ダウンロードしたファイルの中身をそのまま貼り付けてください。'); }
  if (!obj.client_email || !obj.private_key) throw new Error('client_email / private_key が含まれていません。サービスアカウントの鍵ファイルか確認してください。');
  PropertiesService.getScriptProperties().setProperty(PROP_SERVICE_ACCOUNT, JSON.stringify({ client_email: obj.client_email, private_key: obj.private_key }));
  CacheService.getScriptCache().remove('sa_token');
  return '保存しました（' + obj.client_email + '）。メニュー「工程図との接続テスト」で確認してください。';
}
function clearServiceAccountKey() {
  PropertiesService.getScriptProperties().deleteProperty(PROP_SERVICE_ACCOUNT);
  CacheService.getScriptCache().remove('sa_token');
  toastOrLog_('秘密鍵を削除しました。以後はこのGoogleアカウントの権限で接続します。');
}

/** メニュー：エンジニア入力シートを整える（会社コードのプルダウンも『会社マスタ』から作り直す。読み込み先が旧ファイルのままなら先に切り替える） */
function createStaffInputTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const moved = migrateLegacyStaffSetting_(ss);
  alertOrLog_((moved ? moved + '\n\n' : '') + ensureStaffInputTab_(ss) + '\n\n列: ' + STAFF_INPUT_HEADERS.join(' / '));
}

/**
 * エンジニア入力シートの『入力シート』『記入ルール/説明』タブを整え、結果の文を返す（何度実行しても安全）。
 * - 『入力シート』タブがあればそれを使う（無ければ、今の列構成の見出しを持つ別名のタブを『入力シート』にする。それも無ければ作る）
 * - 見出しを「日本語＋ベトナム語」の2段にし、注記・プルダウン（会社コード・新規or修正・視点・パターン・時間）を付ける
 * - 『記入ルール/説明』タブを日本語・ベトナム語の併記で書き直す
 * - 『設定』のタブ名・取込開始行を合わせる
 */
function ensureStaffInputTab_(ss) {
  const cfg = readSettings_();
  const staff = SpreadsheetApp.openById(cfg.fileId);
  ensureTimeZone_(staff); // 翻訳日時・時間入力日時もベトナム時間で
  let sheet = staff.getSheetByName(STAFF_TAB_DEFAULT);
  let how = 'existing';
  if (!sheet) {
    // 旧レイアウトのタブ（product schedule・予想時間など）や記入例のタブは使わない。今の列がそろった見出しを持つタブだけを使う
    const reuse = staff.getSheets().filter(sh => sh.getName() !== STAFF_RULES_TAB && hasStaffInputHeaders_(sh))[0];
    if (reuse) { reuse.setName(STAFF_TAB_DEFAULT); sheet = reuse; how = 'renamed'; }
    else { sheet = staff.insertSheet(STAFF_TAB_DEFAULT, 0); how = 'created'; }
  }
  if (sheet.getLastRow() === 0) {
    ensureSize_(sheet, 2, STAFF_INPUT_HEADERS.length);
    sheet.getRange(2, 1, 1, STAFF_INPUT_HEADERS.length).setValues([STAFF_INPUT_HEADERS]);
  }
  const headerRow = findStaffHeaderRow_(sheet);
  if (headerRow < 0) throw new Error('「' + staff.getName() + '」の『' + STAFF_TAB_DEFAULT + '』タブに見出し（会社コード・案件番号）の行が見つかりません');
  const codes = readCompanyCodes_(ss);
  const views = readMasters_(ss).views;
  formatStaffInputTab_(sheet, headerRow, { codes, views: viewCodeOptions_(views) });
  writeStaffRulesTab_(staff, views);
  writeSetting_(ss, 'tabName', STAFF_TAB_DEFAULT);
  writeSetting_(ss, 'startRow', 2);
  const where = '「' + staff.getName() + '」';
  const head = how === 'created' ? where + 'に入力タブ『' + STAFF_TAB_DEFAULT + '』を作りました。'
    : how === 'renamed' ? where + 'の入力用タブの名前を『' + STAFF_TAB_DEFAULT + '』に合わせました。'
    : where + 'の『' + STAFF_TAB_DEFAULT + '』タブを整えました。';
  return head + '見出しを日本語・ベトナム語の2段にし、プルダウン（会社コード ' + codes.length + ' 社・新規or修正・視点 ' + viewKeywords_(views).join('/') + '・パターン・時間）を付け、『' +
    STAFF_RULES_TAB + '』タブを書き直しました。（『設定』のタブ名を「' + STAFF_TAB_DEFAULT + '」、取込開始行を 2 にしました）';
}

/**
 * 今のレイアウトの入力シートに、後から増えた列（翻訳済み・翻訳メモ・作業の分け方・合計・登録No）が無ければ右端に足す。
 * 既存の列は動かさない。戻り値は列番号の対応（mapStaffColumns_ と同じ形）
 */
function ensureStaffExtraColumns_(sheet, headerRow) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  let sc = mapStaffColumns_(sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0]);
  const missing = STAFF_INPUT_COLUMNS.filter(d => !sc[d.key]);
  if (!missing.length) return sc;
  ensureSize_(sheet, headerRow, lastCol + missing.length);
  sheet.getRange(headerRow, lastCol + 1, 1, missing.length).setValues([missing.map(d => d.label + '\n' + d.vi)]);
  return mapStaffColumns_(sheet.getRange(headerRow, 1, 1, lastCol + missing.length).getValues()[0]);
}

/** そのタブに、今の列構成（会社コード・案件番号・視点・White など）の見出し行があるか */
function hasStaffInputHeaders_(sheet) {
  const row = findStaffHeaderRow_(sheet);
  if (row < 0) return false;
  const m = mapStaffColumns_(sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0]);
  return !!(m.code && m.number && m.cut && m.white);
}

/** 『会社マスタ』の案件コードの英字部分（「入力シートに出さない」にチェックが無いもの）＝ エンジニアの会社コードのプルダウン */
function readCompanyCodes_(ss) {
  const sh = ss.getSheetByName(SHEET.COMPANY);
  if (!sh || sh.getLastRow() < 2) return [];
  const vals = sh.getRange(1, 1, sh.getLastRow(), Math.max(sh.getLastColumn(), 1)).getValues();
  const headers = vals[0].map(v => trimStr_(v));
  const cCode = headers.indexOf(COMPANY_MASTER_HEADERS[0]);
  const cHide = headers.indexOf(COMPANY_HIDE_HEADER);
  if (cCode < 0) return [];
  const out = [];
  vals.slice(1).forEach(r => {
    const code = codePrefix_(r[cCode]);
    if (code && !(cHide >= 0 && isChecked_(r[cHide])) && out.indexOf(code) < 0) out.push(code);
  });
  return out;
}

/** 入力列のプルダウン（無い列は null）。choices: { codes: 会社コード[], views: 視点コード[] } */
function staffValidation_(key, choices) {
  const companyCodes = (choices && choices.codes) || [];
  const viewOptions = (choices && choices.views && choices.views.length) ? choices.views : viewCodeOptions_([]);
  const dv = () => SpreadsheetApp.newDataValidation();
  const list = (values, allowInvalid, help) => dv().requireValueInList(values, true).setAllowInvalid(allowInvalid).setHelpText(help).build();
  switch (key) {
    case 'code':
      return companyCodes.length ? list(companyCodes, true, 'リストから選んでください（無い会社は管理者へ）/ Chọn từ danh sách (nếu không có, báo quản lý)') : null;
    case 'number':
      return dv().requireNumberBetween(1, 99999).setAllowInvalid(false).setHelpText('数字だけを入力してください（例 34）/ Chỉ nhập số (VD: 34)').build();
    case 'request':
      return list(REQUEST_OPTIONS, false, '初回依頼は「新規」、2回目以降は「修正」/ Lần đầu: Mới, từ lần 2: Sửa');
    case 'cut':
      return list(viewOptions, true, 'リストから選ぶ（一覧は『記入ルール/説明』）/ Chọn mã góc nhìn từ danh sách');
    case 'pattern':
      return list(PATTERN_OPTIONS, true, 'パターン違いが無ければ空欄 / Không có phương án khác thì để trống');
    case 'white': case 'color': case 'other':
      return list(HOUR_OPTIONS, true, '時間（h）/ Số giờ');
    case 'translated':
      return dv().requireCheckbox().build();
    default:
      return null;
  }
}

/**
 * 見出しを「日本語＋ベトナム語」の2段にして注記・色を付け、見出しより下の入力行にプルダウンと数値書式を付ける（列は見出し名で探す）。
 * 旧レイアウト（案件番号の列が無い）のタブは見出しの文字を変えない。
 */
function formatStaffInputTab_(sheet, headerRow, choices) {
  const n = 1000; // 見出しより下の入力行にプルダウン等を付ける行数
  const lastCol = Math.max(sheet.getLastColumn(), STAFF_INPUT_COLUMNS.length);
  ensureSize_(sheet, headerRow + n, lastCol);
  let sc = mapStaffColumns_(sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0]);
  const isCurrent = !!sc.number;
  if (isCurrent) sc = ensureStaffExtraColumns_(sheet, headerRow);
  const start = headerRow + 1;
  STAFF_INPUT_COLUMNS.forEach(def => {
    const c = sc[def.key];
    if (!c) return;
    const head = sheet.getRange(headerRow, c);
    if (isCurrent) head.setValue(def.label + '\n' + def.vi);
    head.setNote(def.note).setFontWeight('bold').setBackground('#dde5f0').setWrap(true).setVerticalAlignment('middle');
    sheet.setColumnWidth(c, def.width * 9);
    const rule = staffValidation_(def.key, choices);
    if (rule) sheet.getRange(start, c, n, 1).setDataValidation(rule);
    if (def.hours) sheet.getRange(start, c, n, 1).setNumberFormat('0.##');
    // 合計は式（White＋Color＋pts）。値はスクリプトから書かない
    if (def.key === 'total' && sc.white && sc.color && sc.other) {
      const refs = 'RC' + sc.white + ',RC' + sc.color + ',RC' + sc.other;
      sheet.getRange(start, c, n, 1).setFormulaR1C1('=IF(COUNT(' + refs + ')=0,"",SUM(' + refs + '))');
    }
    if (def.datetime) sheet.getRange(start, c, n, 1).setNumberFormat('yyyy-mm-dd hh:mm');
    if (def.auto) { head.setBackground('#e6e6e6'); sheet.getRange(start, c, n, 1).setBackground('#f3f3f3'); }
  });
  if (isCurrent) sheet.setRowHeight(headerRow, 42);
  // 見出しの上が空なら1行の案内を書く（書き方の本文は『記入ルール/説明』タブ）
  if (headerRow >= 2 && sheet.getRange(headerRow - 1, 1, 1, lastCol).getValues()[0].every(v => trimStr_(v) === '')) {
    sheet.getRange(headerRow - 1, 1).setValue(STAFF_INPUT_HINT).setFontColor('#555555');
  }
  if (headerRow <= 3) sheet.setFrozenRows(headerRow); // 上に長い書き方がある旧レイアウトは固定しない（画面が埋まるため）
}

// 『記入ルール/説明』タブの本文。[種類, 日本語, ベトナム語]。種類: title=表題 / h=見出し / 空=本文（日本語の下にベトナム語）
const STAFF_RULES_LINES = [
  ['title', '【記入ルール】工程図 エンジニア入力シート', '【Quy tắc nhập liệu】Bảng nhập của kỹ sư (工程図)'],
  ['h', '■ 基本', '■ Cơ bản'],
  ['', '・『入力シート』タブの2行目（見出し）より下に、1視点＝1行で書きます。同じ視点のパターン違い（A・B…）も別の行です。',
    '・Nhập vào tab『入力シート』, bên dưới dòng tiêu đề (dòng 2): mỗi góc nhìn = 1 dòng. Phương án khác (A, B…) của cùng góc nhìn cũng là 1 dòng riêng.'],
  ['', '・依頼が来るたびに新しい行を足します。過去の行は消したり書き換えたりしないでください。',
    '・Mỗi lần có yêu cầu thì thêm 1 dòng mới. Không xóa hoặc sửa các dòng cũ.'],
  ['', '・時間は h（時間）で、リストから選びます（0.5 刻み）。リストに無い時間は数字を直接入力できます。',
    '・Thời gian tính bằng giờ (h), chọn từ danh sách (bước 0.5). Nếu không có trong danh sách thì nhập số trực tiếp.'],
  ['', '・会社コード・案件番号・新規or修正・視点・時間（White / Color / pts のどれか）がそろった行から、管理者に届きます。',
    '・Dòng có đủ Mã công ty, Số dự án, Mới / Sửa, Góc nhìn và giờ (White / Color / pts) sẽ được gửi đến quản lý.'],
  ['h', '■ 各列の書き方', '■ Cách nhập từng cột'],
  ['', '会社コード：REN・RIC など、リストから選ぶ（リストに無い会社は管理者に連絡）', 'Mã công ty: chọn REN, RIC… từ danh sách (nếu không có, liên hệ quản lý)'],
  ['', '案件番号：数字だけ（例 34）。会社コードと合わせて「RIC.34」として扱います', 'Số dự án: chỉ nhập số (VD: 34). Ghép với mã công ty thành「RIC.34」'],
  ['', '社外案件名：お客様の案件名を自由入力（例 マンション）', 'Tên dự án: tên dự án của khách hàng, nhập tự do (VD: マンション)'],
  ['', 'サーバーリンク：保存先フォルダのリンク（CG から始まるパス）を貼り付け', 'Link thư mục: dán đường dẫn thư mục lưu file (bắt đầu bằng CG)'],
  ['', '新規or修正：その視点の初回依頼は「新規」、2回目以降はすべて「修正」', 'Mới / Sửa: yêu cầu lần đầu của góc nhìn đó chọn「新規 / Mới」, từ lần thứ 2 trở đi chọn「修正 / Sửa」'],
  ['', '視点：下の「視点コード」から選ぶ（①と末尾の数字は同じ。外観目線視点② → EX2）。表に無い視点は管理者に連絡', 'Góc nhìn: chọn theo bảng「Mã góc nhìn」bên dưới (số ① = số cuối, VD: ngoại thất tầm mắt ② → EX2). Nếu không có, liên hệ quản lý'],
  ['', 'パターン：同じ視点でパターン違いがあれば A・B・C…（無ければ空欄）', 'Phương án: nếu cùng góc nhìn có nhiều phương án thì chọn A, B, C… (không có thì để trống)'],
  ['', 'White：ホワイトパースまでの制作時間（モデル作成の行はモデル制作時間）', 'White: số giờ làm đến phối cảnh trắng (dòng dựng model: số giờ dựng model)'],
  ['', 'Color：色付きパースまでの制作時間（White の時間は含めない）', 'Color: số giờ làm phối cảnh màu (không tính số giờ White)'],
  ['', 'pts：写真合成・フォトショップ作業（人物・点景など）の時間', 'pts: số giờ ghép ảnh / làm Photoshop (người, cây, xe…)'],
  ['', 'メモ：制作上の注意点など（自由記入）', 'Ghi chú: lưu ý khi thực hiện (nhập tự do)'],
  ['', '翻訳済み：通訳が資料を翻訳してエンジニアに伝えたらチェック（翻訳日時は自動で入ります）', 'Đã dịch: phiên dịch đánh dấu khi đã dịch tài liệu và truyền đạt cho kỹ sư (thời gian tự động ghi)'],
  ['', '翻訳メモ：通訳がお客様の指示の訳・注意点を書く', 'Ghi chú dịch: phiên dịch ghi nội dung dịch yêu cầu của khách, lưu ý'],
  ['', '作業の分け方：分けて作業できるときに書く（例 White＝躯体 3h／家具1 2h／家具2 1h）。工程図ではこの作業ごとに分かれます。分けた時間の合計は White などの時間と同じにしてください',
    'Cách chia công việc: ghi khi có thể chia việc (VD: White = khung 3h / nội thất 1 2h / nội thất 2 1h). 工程図 sẽ chia theo từng việc. Tổng giờ phải bằng giờ White…'],
  ['', '時間入力者：制作時間を決めた人の名前（時間入力日時・合計は自動で入ります）', 'Người nhập giờ: tên người quyết định số giờ (thời gian nhập và tổng tự động ghi)'],
  ['', '登録No：管理者が登録した行に自動で入ります。変えないでください', 'Mã đăng ký: tự động có ở dòng do quản lý đăng ký. Không sửa'],
  ['', '納品名：工程図に登録されると、納品するファイルの名前が自動で入ります。納品のときはこの名前を使ってください', 'Tên file giao: tự động có sau khi đăng ký vào 工程図. Khi giao hàng, hãy dùng tên này'],
  ['', '管理者からの連絡：管理者から通訳へのメッセージ（翻訳してほしい点・注意点）が自動で入ります。通訳は必ず読んでください', 'Lời nhắn từ quản lý: lời nhắn của quản lý cho phiên dịch (tự động). Phiên dịch hãy đọc kỹ'],
  ['', '※ 管理者が登録した行（登録No あり）は、会社コード〜パターンが自動で入ります。翻訳済みから2時間たっても時間が空だと Discord で催促が届きます',
    '※ Dòng do quản lý đăng ký (có Mã đăng ký) sẽ tự điền từ Mã công ty đến Phương án. Nếu 2 giờ sau khi dịch xong vẫn chưa có số giờ, sẽ có nhắc nhở qua Discord'],
  ['h', '■ 視点コード', '■ Mã góc nhìn'],
];
// 記入例（『記入ルール/説明』の最後に表で載せる。入力シートの列の順）
const STAFF_RULES_EXAMPLES = [
  ['RIC', 34, 'マンション', '\\\\CG-SERVER2\\…\\RIC.34', '新規 / Mới', 'EX1', '', 6, 4, 0, '外観 昼景 / ngoại thất ban ngày'],
  ['RIC', 34, 'マンション', '\\\\CG-SERVER2\\…\\RIC.34', '新規 / Mới', 'EX1', 'A', 6, 4, 0, 'EX1 のパターン違い / phương án khác của EX1'],
  ['RIC', 34, 'マンション', '\\\\CG-SERVER2\\…\\RIC.34', '新規 / Mới', 'IN1', '', 5, 3.5, 1.5, '人物あり → pts / có người → pts'],
  ['RIC', 34, 'マンション', '\\\\CG-SERVER2\\…\\RIC.34', '修正 / Sửa', 'EX1', '', 0, 1.5, 0, '2回目の依頼（色の修正）/ yêu cầu lần 2 (sửa màu)'],
  ['REN', 72, '戸建て', '\\\\CG-SERVER2\\…\\REN.72', '新規 / Mới', 'EXCB1', '', 5, 3, 0, '外観鳥瞰 / ngoại thất chim bay'],
  ['REN', 72, '戸建て', '\\\\CG-SERVER2\\…\\REN.72', '新規 / Mới', 'EXP1', '', 2, 1, 0.5, '外観写真合成 / ghép ảnh ngoại thất'],
  ['REN', 72, '戸建て', '\\\\CG-SERVER2\\…\\REN.72', '新規 / Mới', 'EXM1', '', 8, 0, 0, 'モデル作成（外観）/ dựng model ngoại thất'],
];

/** 『記入ルール/説明』タブを日本語・ベトナム語の併記で書き直す（本文はB列。A列は余白） */
function writeStaffRulesTab_(staff, views) {
  let sh = staff.getSheetByName(STAFF_RULES_TAB);
  if (!sh) sh = staff.insertSheet(STAFF_RULES_TAB, Math.min(1, staff.getSheets().length));
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart(); // 手で結合したセルがあっても書けるように
  sh.clear();
  const width = STAFF_INPUT_COLUMNS.length;
  const cells = []; // { row, values, style }
  let r = 2;
  const push = (values, style) => { cells.push({ row: r, values, style }); r++; };
  STAFF_RULES_LINES.forEach(l => {
    if (l[0] === 'title') { push([l[1]], 'title'); push([l[2]], 'titleVi'); r++; return; }
    if (l[0] === 'h') { if (r > 5) r++; push([l[1] + ' ／ ' + l[2].replace(/^■\s*/, '')], 'h'); return; }
    push([l[1]], 'ja'); push(['   ' + l[2]], 'vi');
  });
  viewCodeLines_(views).forEach(l => push([l], 'ja'));
  r++;
  push(['■ 記入例（読むだけ。実際の入力は『' + STAFF_TAB_DEFAULT + '』タブへ） ／ Ví dụ (chỉ để xem, nhập thật ở tab『' + STAFF_TAB_DEFAULT + '』)'], 'h');
  push(STAFF_INPUT_COLUMNS.map(c => c.label + '\n' + c.vi), 'tableHead');
  STAFF_RULES_EXAMPLES.forEach(e => push(e, 'table'));

  ensureSize_(sh, r, width + 1);
  cells.forEach(c => {
    const range = sh.getRange(c.row, 2, 1, c.values.length);
    range.setValues([c.values]);
    if (c.style === 'title') range.setFontWeight('bold').setFontSize(14);
    else if (c.style === 'titleVi') range.setFontSize(12).setFontColor('#555555');
    else if (c.style === 'h') range.setFontWeight('bold').setFontColor('#1a4f8b');
    else if (c.style === 'vi') range.setFontColor('#666666');
    else if (c.style === 'tableHead') range.setFontWeight('bold').setBackground('#dde5f0').setWrap(true).setVerticalAlignment('middle');
    else if (c.style === 'table') range.setBackground('#f7f9fc');
  });
  sh.setColumnWidth(1, 24);
  STAFF_INPUT_COLUMNS.forEach((def, i) => sh.setColumnWidth(i + 2, def.width * 9));
  sh.setFrozenRows(0);
}

/**
 * 『設定』が旧「Project Schedule」の『案件シート(一覧)』を指したままなら、エンジニア入力シートへ切り替える。
 * 切り替えたときは説明の文を、何もしなかったときは '' を返す。
 */
function migrateLegacyStaffSetting_(ss) {
  const cfg = readSettings_();
  if (trimStr_(cfg.fileId) !== LEGACY_STAFF_FILE_ID || trimStr_(cfg.tabName) !== LEGACY_STAFF_TAB) return '';
  writeSetting_(ss, 'fileId', SETTING_DEFAULTS.fileId, true);
  writeSetting_(ss, 'tabName', STAFF_TAB_DEFAULT, true);
  writeSetting_(ss, 'startRow', 2, true);
  return '『設定』の読み込み先を、旧「Project Schedule」から「工程図 エンジニア入力シート」に切り替えました。';
}

/**
 * メニュー「0. かんたん初期設定」：最初に1回押すだけで、
 * 管理者シートの整備 → 読み込み先の切り替え → エンジニア入力タブの整備 → 工程図との接続テスト をまとめて行う。
 * 途中で失敗しても残りは続け、最後に結果を1つのダイアログで出す（何度押しても安全）。
 */
function quickSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lines = [];
  let ok = true;
  setupSheet_(ss);
  lines.push('✓ 管理者シート（案件登録・連携・案件マスタ・会社マスタ・視点マスタ・設定・使い方）を整えました。');
  const moved = migrateLegacyStaffSetting_(ss);
  if (moved) lines.push('✓ ' + moved);
  try {
    lines.push('✓ ' + ensureStaffInputTab_(ss));
  } catch (e) {
    ok = false;
    lines.push('✗ エンジニア入力シートを整えられませんでした：' + String(e && e.message || e) +
      '\n   → このGoogleアカウントに「工程図 エンジニア入力シート」の編集権限があるか確認してください。');
  }
  const conn = checkConnection_();
  if (!conn.ok) ok = false;
  lines.push((conn.ok ? '✓ ' : '✗ ') + conn.text);
  if (conn.ok) {
    try {
      const co = syncCompaniesToKoutei_(ss);
      lines.push((co.similar.length ? '△ ' : '✓ ') + co.text);
    } catch (e) {
      ok = false;
      lines.push('✗ 工程図の顧客マスタに会社を追加できませんでした：' + String(e && e.message || e));
    }
  }
  if (ok) {
    try {
      installAutoTrigger_();
      lines.push('✓ 30分ごとの自動実行を設定しました（入力シートに変わりがあれば転記し、' +
        (readSettings_().autoSend ? '状態が「未送信」の行は工程図に自動登録します。「要確認」の行は直して「工程図へ」にチェックすると次の自動実行で登録されます）。' : '自動登録は『設定』で「しない」になっているので転記だけです）。'));
    } catch (e) {
      ok = false;
      lines.push('✗ 30分ごとの自動実行を設定できませんでした：' + String(e && e.message || e));
    }
  } else {
    lines.push('・30分ごとの自動実行は、✗ が無くなってから設定します。');
  }
  lines.push(ok
    ? '準備ができました。「工程図 エンジニア入力シート」を制作メンバーに共有すれば使い始められます（このファイルは共有しない）。'
    : '✗ の項目を直してから、もう一度「0. かんたん初期設定」を押してください（何度押しても安全です）。');
  alertOrLog_('かんたん初期設定の結果\n\n' + lines.join('\n\n'));
}

/** タブ・見出し・チェックボックス・プルダウン・使い方を整える（何度実行しても安全） */
function setupSheet() {
  setupSheet_(SpreadsheetApp.getActiveSpreadsheet());
  toastOrLog_('初期設定が完了しました。');
}
function setupSheet_(ss) {
  ensureTimeZone_(ss); // シートの時刻をベトナム時間に
  const link = ensureLinkSheet_(ss);
  const col = headerMap_(link);
  link.setFrozenRows(1);
  link.getRange(1, 1, 1, link.getLastColumn()).setFontWeight('bold');

  const company = ss.getSheetByName(SHEET.COMPANY) || ss.insertSheet(SHEET.COMPANY);
  if (company.getLastRow() === 0) {
    const rows = [COMPANY_MASTER_HEADERS].concat(INITIAL_COMPANY_MASTER);
    ensureSize_(company, rows.length, COMPANY_MASTER_HEADERS.length);
    company.getRange(1, 1, rows.length, COMPANY_MASTER_HEADERS.length).setValues(rows);
  }
  ensureCompanyHideColumn_(company);
  company.setFrozenRows(1);
  company.getRange(1, 1, 1, Math.max(company.getLastColumn(), COMPANY_MASTER_HEADERS.length)).setFontWeight('bold');

  const view = ss.getSheetByName(SHEET.VIEW) || ss.insertSheet(SHEET.VIEW);
  if (view.getLastRow() === 0) {
    const rows = [VIEW_MASTER_HEADERS].concat(INITIAL_VIEW_MASTER);
    ensureSize_(view, rows.length, VIEW_MASTER_HEADERS.length);
    view.getRange(1, 1, rows.length, VIEW_MASTER_HEADERS.length).setValues(rows);
    view.getRange(1, 4).setNote(VIEW_EXTERNAL_NOTE);
  } else {
    ensureViewMasterExternalColumn_(view);
  }
  view.setFrozenRows(1);
  view.getRange(1, 1, 1, Math.max(view.getLastColumn(), VIEW_MASTER_HEADERS.length)).setFontWeight('bold');

  const project = ss.getSheetByName(SHEET.PROJECT) || ss.insertSheet(SHEET.PROJECT);
  if (project.getLastRow() === 0) {
    ensureSize_(project, 1, PROJECT_MASTER_HEADERS.length);
    project.getRange(1, 1, 1, PROJECT_MASTER_HEADERS.length).setValues([PROJECT_MASTER_HEADERS]);
    project.getRange(1, 1, 1, PROJECT_MASTER_HEADERS.length).setNotes([[
      'スタッフが書く社内案件名（例 RIC.34）。大文字小文字・点・空白は無視して照合', 'お客様向けの案件名（工程図の案件名になる）',
      '工程図の会社名（空なら会社マスタで判定）', '工程図のお客様担当者（任意）', '']]);
    [22, 32, 22, 16, 30].forEach((w, i) => project.setColumnWidth(i + 1, w * 8));
  }
  project.setFrozenRows(1);
  project.getRange(1, 1, 1, Math.max(project.getLastColumn(), PROJECT_MASTER_HEADERS.length)).setFontWeight('bold');

  const settings = ss.getSheetByName(SHEET.SETTINGS) || ss.insertSheet(SHEET.SETTINGS);
  if (settings.getLastRow() === 0) {
    const rows = [['項目', '値', '説明']];
    Object.keys(SETTING_KEYS).forEach(k => rows.push([SETTING_KEYS[k], SETTING_DEFAULTS[k], SETTING_NOTES[k]]));
    ensureSize_(settings, rows.length, 3);
    settings.getRange(1, 1, rows.length, 3).setValues(rows);
  } else {
    // 後から増えた項目（自動登録など）を下に足す（既にある項目の値は変えない）
    const have = settings.getRange(1, 1, settings.getLastRow(), 1).getValues().map(r => trimStr_(r[0]));
    Object.keys(SETTING_KEYS).forEach(k => { if (have.indexOf(SETTING_KEYS[k]) < 0) settings.appendRow([SETTING_KEYS[k], SETTING_DEFAULTS[k], SETTING_NOTES[k]]); });
  }
  const cAuto = settings.getRange(1, 1, settings.getLastRow(), 1).getValues().map(r => trimStr_(r[0])).indexOf(SETTING_KEYS.autoSend) + 1;
  if (cAuto) settings.getRange(cAuto, 2).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['する', 'しない'], true).build());
  const cNotify = settings.getRange(1, 1, settings.getLastRow(), 1).getValues().map(r => trimStr_(r[0])).indexOf(SETTING_KEYS.notify) + 1;
  if (cNotify) settings.getRange(cNotify, 2).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['する', 'しない'], true).build());
  const cManual = settings.getRange(1, 1, settings.getLastRow(), 1).getValues().map(r => trimStr_(r[0])).indexOf(SETTING_KEYS.manualRun) + 1;
  if (cManual) settings.getRange(cManual, 2).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  settings.getRange(1, 1, 1, 3).setFontWeight('bold');

  // 『連携』の既存行のプルダウン（区分・種類は視点マスタから作るので、マスタを整えた後に付ける）
  const masters = readMasters_(ss);
  const n = Math.max(link.getLastRow() - 1, 0);
  if (n > 0) applyValidations_(link, col, 2, n, masters);
  // 『案件登録』（管理者が案件を登録するタブ。会社コード・視点のプルダウンもマスタから作る）
  ensureRegSheet_(ss, masters);

  writeHowto_(ss);
}

/** 視点マスタに「社外名」列が無ければ右端に足す（中身は空＝「区分＋視点」を使う。お客様向けの呼び方を変えたい行だけ書く） */
function ensureViewMasterExternalColumn_(view) {
  const lastCol = view.getLastColumn();
  const headers = view.getRange(1, 1, 1, lastCol).getValues()[0].map(v => trimStr_(v));
  if (headers.indexOf('社外名') >= 0) return;
  const c = lastCol + 1;
  ensureSize_(view, 1, c);
  view.getRange(1, c).setValue('社外名').setFontWeight('bold').setNote(VIEW_EXTERNAL_NOTE);
}

/** 会社マスタに「入力シートに出さない」列（チェックボックス）を用意する。旧バージョンのシートでは、備考が「表記ゆれ」の行にチェックを入れる */
function ensureCompanyHideColumn_(company) {
  const lastCol = Math.max(company.getLastColumn(), 1);
  const headers = company.getRange(1, 1, 1, lastCol).getValues()[0].map(v => trimStr_(v));
  let c = headers.indexOf(COMPANY_HIDE_HEADER) + 1;
  const last = company.getLastRow();
  if (!c) {
    // 4列目（D列）が見出しも中身も空ならそこを使う（右の E・F 列は「工程図の会社名一覧を取り込む」の参考欄）。空でなければ右端に足す
    const dEmpty = trimStr_(headers[3]) === '' && (last < 2 || company.getRange(2, 4, last - 1, 1).getValues().every(r => trimStr_(r[0]) === ''));
    c = dEmpty ? 4 : lastCol + 1;
    ensureSize_(company, Math.max(last, 1), c);
    company.getRange(1, c).setValue(COMPANY_HIDE_HEADER)
      .setNote('チェックした会社コードは、エンジニア入力シートの「会社コード」のプルダウンに出しません（表記ゆれ用の行など）。変えたらメニュー「エンジニア入力シートを整える」を押す');
    const cNote = headers.indexOf(COMPANY_MASTER_HEADERS[2]);
    if (last >= 2) {
      const notes = cNote >= 0 ? company.getRange(2, cNote + 1, last - 1, 1).getValues() : [];
      const vals = [];
      for (let i = 0; i < last - 1; i++) vals.push([/表記ゆれ/.test(String((notes[i] || [''])[0]))]);
      company.getRange(2, c, vals.length, 1).setValues(vals);
    }
  }
  const rows = Math.max(last, 1) + 100;
  ensureSize_(company, rows, c);
  company.getRange(2, c, rows - 1, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
}

// ============ シート補助 ============
/** シートの行数・列数が足りなければ増やす（シートの大きさを超える範囲への書き込みは Apps Script でエラーになるため） */
function ensureSize_(sheet, rows, cols) {
  const mr = sheet.getMaxRows();
  const mc = sheet.getMaxColumns();
  if (rows > mr) sheet.insertRowsAfter(mr, rows - mr);
  if (cols > mc) sheet.insertColumnsAfter(mc, cols - mc);
}

function ensureLinkSheet_(ss) {
  let sheet = ss.getSheetByName(SHEET.LINK);
  if (!sheet) sheet = ss.insertSheet(SHEET.LINK, 0);
  const lastCol = sheet.getLastColumn();
  const first = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(v => trimStr_(v)) : [];
  const has = (k) => first.indexOf(H[k]) >= 0 || (H_ALIASES[k] || []).some(a => first.indexOf(a) >= 0);
  const missing = LINK_HEADER_ORDER.filter(k => !has(k));
  if (first.filter(Boolean).length === 0) {
    ensureSize_(sheet, 1, LINK_HEADER_ORDER.length);
    sheet.getRange(1, 1, 1, LINK_HEADER_ORDER.length).setValues([LINK_HEADER_ORDER.map(k => H[k])]);
  } else if (missing.length) {
    // 足りない見出しは右端に追加する（既存の列は動かさない）
    ensureSize_(sheet, 1, lastCol + missing.length);
    sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing.map(k => H[k])]);
  }
  return sheet;
}

/** 『連携』の見出し行 → { フィールド名: 列番号(1始まり) }（旧見出しも別名として受け付ける） */
function headerMap_(sheet) {
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(v => trimStr_(v));
  const col = {};
  Object.keys(H).forEach(k => {
    let i = headers.indexOf(H[k]);
    if (i < 0) (H_ALIASES[k] || []).some(a => { i = headers.indexOf(a); return i >= 0; });
    if (i >= 0) col[k] = i + 1;
  });
  const missing = Object.keys(H).filter(k => !col[k]);
  if (missing.length) throw new Error('『連携』タブの見出しが見つかりません: ' + missing.map(k => H[k]).join('、') + '（メニュー「初期設定」を実行してください）');
  return col;
}

function rowObjToArray_(obj, col) {
  const width = Math.max.apply(null, Object.keys(col).map(k => col[k]));
  const arr = new Array(width).fill('');
  Object.keys(col).forEach(k => { if (obj[k] !== undefined) arr[col[k] - 1] = obj[k]; });
  return arr;
}
function arrayToRowObj_(arr, col) {
  const obj = {};
  Object.keys(col).forEach(k => { const v = arr[col[k] - 1]; obj[k] = (v === null || v === undefined) ? '' : v; });
  if (obj.key) obj.key = String(obj.key);
  if (obj.status) obj.status = String(obj.status);
  obj.round = Number(obj.round) || 1;
  if (isDate_(obj.deadline)) obj.deadline = fmtYMD_(obj.deadline);
  return obj;
}

function applyValidations_(sheet, col, startRow, numRows, masters) {
  const choices = linkChoiceLists_(masters);
  const checkbox = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  const list = (values) => SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(true).build();
  sheet.getRange(startRow, col.send, numRows, 1).setDataValidation(checkbox);
  sheet.getRange(startRow, col.exclude, numRows, 1).setDataValidation(checkbox);
  sheet.getRange(startRow, col.category, numRows, 1).setDataValidation(list(choices.categories));
  sheet.getRange(startRow, col.kind, numRows, 1).setDataValidation(list(choices.kinds));
  sheet.getRange(startRow, col.stepKind, numRows, 1).setDataValidation(list([STEP_KIND.NEW, STEP_KIND.ADD, STEP_KIND.FIX, STEP_KIND.CHANGE]));
  sheet.getRange(startRow, col.status, numRows, 1).setDataValidation(list([STATUS.NEW, STATUS.CHECK, STATUS.UPDATED, STATUS.SENT, STATUS.ERROR, STATUS.GONE]));
  sheet.getRange(startRow, col.transferredAt, numRows, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  sheet.getRange(startRow, col.sentAt, numRows, 1).setNumberFormat('yyyy-mm-dd hh:mm');
}

function readSettings_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET.SETTINGS);
  const cfg = Object.assign({}, SETTING_DEFAULTS);
  if (sheet && sheet.getLastRow() > 1) {
    const rows = sheet.getRange(1, 1, sheet.getLastRow(), 2).getValues();
    rows.forEach(r => {
      const label = trimStr_(r[0]);
      const val = r[1];
      Object.keys(SETTING_KEYS).forEach(k => { if (SETTING_KEYS[k] === label && trimStr_(val) !== '') cfg[k] = val; });
    });
  }
  cfg.fileId = trimStr_(cfg.fileId);
  cfg.tabName = trimStr_(cfg.tabName);
  cfg.startRow = parseInt(cfg.startRow, 10) || 0;
  cfg.defaultAssignee = trimStr_(cfg.defaultAssignee) || '未割当';
  ['assigneeWhite', 'assigneeColor', 'assigneeOther', 'assigneeSingle'].forEach(k => { cfg[k] = trimStr_(cfg[k]); });
  cfg.projectId = trimStr_(cfg.projectId);
  cfg.workspaceId = trimStr_(cfg.workspaceId);
  cfg.autoSend = !/^(しない|いいえ|off|no|false)$/i.test(trimStr_(cfg.autoSend));
  cfg.autoWait = Math.max(0, parseFloat(cfg.autoWait) || 0);
  cfg.notify = !/^(しない|いいえ|off|no|false)$/i.test(trimStr_(cfg.notify));
  cfg.notifyFirst = Math.max(0, parseFloat(cfg.notifyFirst) || 0) || 2;
  cfg.notifyRepeat = Math.max(0.5, parseFloat(cfg.notifyRepeat) || 1);
  cfg.notifyHours = trimStr_(cfg.notifyHours);
  cfg.regMessage = String(cfg.regMessage || '').trim() ? String(cfg.regMessage) : SETTING_DEFAULTS.regMessage;
  cfg.interpMessage = String(cfg.interpMessage || '').trim() ? String(cfg.interpMessage) : SETTING_DEFAULTS.interpMessage;
  cfg.calcMinutes = Math.max(0, parseFloat(cfg.calcMinutes));
  if (!isFinite(cfg.calcMinutes)) cfg.calcMinutes = SETTING_DEFAULTS.calcMinutes;
  if (!cfg.fileId) throw new Error('『設定』タブの「スタッフシートのファイルID」が空です');
  return cfg;
}
/** 『設定』タブの1項目を書き換える（無ければ行を足す）。withNote なら説明の列も今の文に直す */
function writeSetting_(ss, key, value, withNote) {
  const sheet = ss.getSheetByName(SHEET.SETTINGS) || ss.insertSheet(SHEET.SETTINGS);
  const label = SETTING_KEYS[key];
  const last = sheet.getLastRow();
  if (last >= 1) {
    const labels = sheet.getRange(1, 1, last, 1).getValues().map(r => trimStr_(r[0]));
    const i = labels.indexOf(label);
    if (i >= 0) {
      sheet.getRange(i + 1, 2).setValue(value);
      if (withNote) sheet.getRange(i + 1, 3).setValue(SETTING_NOTES[key] || '');
      return;
    }
  }
  sheet.appendRow([label, value, SETTING_NOTES[key] || '']);
}

/** マスタ3種を見出し名で読む（列の順番が変わっても追従） */
function readMasters_(ss) {
  const table = (name) => {
    const sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return [];
    const vals = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
    const headers = vals[0].map(v => trimStr_(v));
    return vals.slice(1).map(r => { const o = {}; headers.forEach((h, i) => { if (h) o[h] = r[i]; }); return o; });
  };
  const companies = [];
  table(SHEET.COMPANY).forEach(r => {
    const prefix = codePrefix_(r['案件コードの英字部分']);
    const company = trimStr_(r['工程図の会社名']);
    if (prefix && company) companies.push({ prefix, company });
  });
  const views = [];
  table(SHEET.VIEW).forEach(r => {
    const keyword = normCut_(r['カット名のキーワード']).replace(/[^A-Z]/g, '');
    const category = trimStr_(r['区分']);
    const kind = trimStr_(r['種類']);
    if (keyword) views.push({ keyword, category, kind, external: trimStr_(r['社外名']) || deriveExternal_(category, kind) });
  });
  const projects = [];
  table(SHEET.PROJECT).forEach(r => {
    const key = normCode_(r['社内案件名']);
    if (key) projects.push({ key, name: trimStr_(r['社外案件名']), company: trimStr_(r['会社名']), contact: trimStr_(r['お客様担当者']) });
  });
  return { companies, views, projects };
}

function parseJsonArray_(s) {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}
function toastOrLog_(msg) {
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, '工程図連携', 10); } catch (e) { console.log(msg); }
}
function alertOrLog_(msg) {
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { console.log(msg); }
}

// 『使い方』タブの本文（初期設定で毎回書き直す＝スクリプトと説明がずれない）
const HOWTO_LINES = [
  '工程図連携シート の使い方',
  '',
  'このファイルは、エンジニアが書く「工程図 エンジニア入力シート」の内容を工程図（koutei-zu）に登録するための管理者用シートです。',
  'エンジニア（入力シートを書く人）には共有しないでください。共有しなければ、このファイルは入力シート側から見えません（会社名・担当者などの紐づけ情報を含みます）。',
  '同じファイルの中でタブを隠す方法は、編集できる人なら誰でも再表示できるため使いません。',
  '',
  '■ 案件の登録（管理者）→ 翻訳（通訳）→ 制作時間（エンジニア）',
  '1. 管理者がこのファイルの『案件登録』タブに1視点1行で書く：会社コード・案件番号・社外案件名・担当者・新規or修正・視点・パターン・サーバーリンク・納期・注文書・管理者メモ（黄色い見出しの列）。',
  '2. 会社コード・案件番号・視点・新規or修正がそろった時点ですぐ（うまくいかないときも30分ごとの自動実行か、メニュー「案件登録を入力シートへ写す」で）、エンジニア入力シートへ 会社コード・案件番号・社外案件名・サーバーリンク・新規or修正・視点・パターン と「登録No」だけを写します。担当者・納期・注文書・管理者メモは写しません。',
  '3. 通訳が入力シートの「翻訳済み」にチェック（訳は「翻訳メモ」へ。「翻訳日時」は自動）→ エンジニアが White・Color・pts と「作業の分け方」「時間入力者」を書く（「時間入力日時」「合計」は自動）。',
  '4. 翻訳済み・時間・作業の分け方は『案件登録』の灰色の列に読み戻され、「状態」が 翻訳待ち → 時間計算待ち → 時間入力済み と進みます。',
  '5. 翻訳済みになってから2時間たっても時間が空なら Discord で催促し、以降1時間ごとにくり返します（『設定』で時間・時間帯を変えられます。Webhook はメニュー「Discord 通知の設定」）。',
  '6. 時間が入った行は、いつもどおり『連携』へ転記され、工程図に登録されます。『案件登録』の担当者・納期が工程図に入ります。',
  '7. 工程図で決まった納品名（ファイル名）は、『案件登録』と入力シートの「納品名」列に自動で表示されます（工程図で納品名を直すと、次の自動実行で追従）。',
  '・「連絡文」列に、エンジニア・通訳へ送る文が自動で入ります（同じ案件・同じ入力日の視点は1通）。行を選んでメニュー「連絡文をコピー」を押すと、コピーや Discord への送信ができます。文面は『設定』の「登録時の連絡文」で変えられます。',
  '・手動連携：『案件登録』の「今すぐ連携」にチェックすると、その行をすぐ入力シートへ写します。『設定』の「今すぐ全部連携」にチェックすると、案件登録→入力シート・転記・工程図への登録をまとめてその場で動かします（どちらも終わるとチェックは外れます）。',
  '・通訳へのメッセージ：『案件登録』の「通訳へのメッセージ」に書くと、入力シートの「管理者からの連絡」に写り、「通訳向け連絡文」（ひな形は『設定』の「通訳向けの連絡文」）にも入ります。メニュー「連絡文をコピー」では、エンジニア向けと通訳向けの2つを出します。',
  '・「作業の分け方」（例 White＝躯体 3h／家具1 2h／家具2 1h）が書いてあると、工程図ではその作業ごとのステップ（ホワイト（躯体）…）に分けて登録します。分けた時間の合計が White などの時間と合わないときは分けずに登録し、「結果」に書きます。',
  '・担当者：『案件登録』（『連携』）の担当者 → その視点の前回の担当者 → 『設定』の「既定の担当者（ホワイト／カラー／pts／写真合成・モデル・VR・動画）」→「既定の担当者」の順に決まります。',
  '・工程図で「サポート（分担）」した作業は、シートから送り直しても時間を戻しません。',
  '・『案件登録』で会社コード・視点などを直すと、入力シートの行も直ります。入力シートの行を消すと、状態が「入力シートに無い」になります（もう一度写したいときは登録Noを消す）。',
  '',
  '■ エンジニアが書く場所',
  '「工程図 エンジニア入力シート」の『入力シート』タブ。書き方は同じファイルの『記入ルール/説明』タブ（日本語・ベトナム語の併記。メニュー「0. かんたん初期設定」で整います）。',
  '列: 会社コード（REN・RIC…）/ 案件番号 / 社外案件名 / サーバーリンク / 新規or修正 / 視点（『視点マスタ』のキーワード＋番号。EX1・IN1・EXCB1…）/ パターン（A・B…）/ White / Color / pts / メモ / 翻訳済み / 翻訳日時 / 翻訳メモ / 作業の分け方 / 時間入力者 / 時間入力日時 / 合計 / 登録No / 納品名',
  '1視点（パターン違いも別）1行。依頼のたびに行を足します。会社コード＋案件番号は「RIC.34」のように1つの社内案件名として扱います。',
  '会社コード・視点のプルダウンは『会社マスタ』『視点マスタ』から作ります。マスタを変えたらメニュー「エンジニア入力シートを整える」を押してください。',
  '',
  '■ 自動で動くこと（30分ごと）',
  '1. 入力シートに新しい行・変わった行があれば『連携』タブに反映します（変わりが無ければ何もしません）。新しい行の「入力日」には転記した日が入ります。',
  '   会社コード・案件番号・新規or修正・視点・時間がそろっていない行は「記入途中」として待ちます。',
  '2. 状態が「未送信」（自動判定がすべてできた行）で、最後に変わってから『設定』の待ち時間（25分）がたった行を、工程図に自動登録します。',
  '   『会社マスタ』にあって工程図の顧客マスタに無い会社は、先に顧客マスタへ追加します。',
  '3. 結果は『設定』の「最後の自動実行」に出ます。',
  '',
  '■ 人がすること（管理者）',
  '・状態が「要確認」の行：「結果」列の理由を見て、社外案件名・会社名・区分・種類・ステップ種類 などを直し、「工程図へ」にチェック → 次の自動実行で登録されます（すぐ登録したいときはメニュー「2. 工程図へ送信」）。',
  '・状態が「更新あり」の行（登録後にエンジニアが時間などを直した）：内容を見て「工程図へ」にチェック → 工程図の未完了ステップの時間などを更新します。',
  '・状態が「エラー」の行：理由を直して「工程図へ」にチェックし、メニュー「2. 工程図へ送信」。',
  '・必要に応じて 納期・お客様担当者・担当者（社内担当者）・メモ を入れる（登録前に入れたものが工程図に入ります）。工程図に入れない行は「対象外」にチェック。',
  '・金額（売上・見積・請求）は工程図の請求パネルで入力します。',
  '・自動登録を止めたいとき：『設定』の「自動登録」を「しない」にする（転記だけ自動）。自動実行そのものを止めるときはメニュー「自動実行を止める」。',
  '',
  '■ 自動判定のしくみ',
  '・社外案件名：入力シートの社外案件名。空なら『案件マスタ』で社内案件名（RIC.34）から引きます。お客様担当者・会社名も『案件マスタ』から（無ければ『会社マスタ』で会社コードから会社名だけ判定）。',
  '・区分・種類・社外視点名：『視点マスタ』で視点コードの英字から引きます。社外名が空なら「区分＋視点」＋丸数字（EX1 → 外観目線視点①、パターンAなら「外観目線視点①_パターンA」。モデルは 外観モデル①）。',
  '・ステップ種類：入力シートの「新規or修正」から（新規 → 新規、修正 → 修正（無料））。有料の変更・追加は人が「変更（有料）」「追加」に直します。',
  '  同じ案件＋視点の2回目以降なのに「新規」の行は「要確認」になります（書き間違い・二重入力のおそれ）。',
  '・登録されるステップ：White → ホワイト、Color → カラー、pts → 人物＋添景合成。写真合成は「写真合成」、モデルは「モデル作成」、VR は「VR制作」、動画は「動画制作」の1ステップ（時間は合計）。',
  '・売上・帳票の「初回/追加/修正」は、ステップ種類（新規→初回、追加→追加、修正・変更→修正）から自動で入ります。',
  '',
  '■ 列の見方（『連携』タブ）',
  '・自動で入る列：取込キー・状態・入力日（最初に転記した日。あとで変わりません）・社内案件名・視点名・パターン・回・新規or修正・各時間・元シート備考（メモ）・転記日時（最後に内容が変わった日時）・送信日時・結果・元シート行・サーバリンク',
  '・人が直す列：工程図へ・社外案件名・社外視点名・納期・会社名・お客様担当者・区分・種類・ステップ種類・担当者・メモ・対象外（自動判定の結果が入り、次の転記で上書きされません）',
  '・状態：未送信（自動登録を待っている）/ 要確認 / 更新あり / 登録済み / エラー / 元シートから消えた（登録済みの行が消えた場合、工程図のタスクは残ります）',
  '・登録が済むと「工程図へ」のチェックは外れます（次にチェックすると「もう一度送ってよい」の意味になります）。',
  '',
  '■ 登録後のルール',
  '・担当者・優先度・完了時間・完了状態は工程図側が正。シートからは上書きしません。',
  '・「更新あり」の行を送ると、未完了ステップの時間と案件名・会社名・区分・納期・社外視点名だけ更新します。',
  '・工程図側で削除したタスクは、再送信しても復活しません。',
  '',
  '■ 初回だけ',
  '・メニュー「0. かんたん初期設定」を押す（管理者シートの整備・読み込み先の切り替え・エンジニア入力シートの整備・接続テスト・顧客マスタへの会社の追加・30分ごとの自動実行の設定をまとめて行います）。',
  '・「工程図 エンジニア入力シート」だけを制作メンバーに「編集者」で共有する（このファイルは共有しない）。',
  '・接続テストが失敗する場合は手順書（docs/08_スプレッドシート連携.md）の「秘密鍵を設定」を行う。',
  '・『案件マスタ』に、よく使う社内案件名 → 社外案件名・会社名・お客様担当者 を登録しておくと「要確認」が減ります。',
];
function writeHowto_(ss) {
  const sh = ss.getSheetByName(SHEET.HOWTO) || ss.insertSheet(SHEET.HOWTO);
  sh.clearContents();
  ensureSize_(sh, HOWTO_LINES.length, 1);
  sh.getRange(1, 1, HOWTO_LINES.length, 1).setValues(HOWTO_LINES.map(l => [l]));
  sh.getRange(1, 1).setFontWeight('bold').setFontSize(14);
  HOWTO_LINES.forEach((l, i) => { if (l.indexOf('■') === 0) sh.getRange(i + 1, 1).setFontWeight('bold'); });
  sh.setColumnWidth(1, 960);
}

// ============ 認証 ============
function getAuth_() {
  const sa = PropertiesService.getScriptProperties().getProperty(PROP_SERVICE_ACCOUNT);
  if (sa) return { token: serviceAccountToken_(JSON.parse(sa)), mode: 'service-account' };
  return { token: ScriptApp.getOAuthToken(), mode: 'user' };
}

/** サービスアカウント鍵 → アクセストークン（JWT を署名して交換。50分キャッシュ） */
function serviceAccountToken_(sa) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('sa_token');
  if (cached) return cached;
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Utilities.base64EncodeWebSafe(JSON.stringify(o)).replace(/=+$/, '');
  const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  });
  const sig = Utilities.base64EncodeWebSafe(Utilities.computeRsaSha256Signature(unsigned, sa.private_key)).replace(/=+$/, '');
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + sig },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) throw new Error('サービスアカウントのトークン取得に失敗: ' + res.getContentText().slice(0, 300));
  const token = JSON.parse(res.getContentText()).access_token;
  cache.put('sa_token', token, 3000);
  return token;
}

// ============ Firestore REST ============
// 工程図の Firestore データベース名は "default"（カッコなし・Enterprise edition）。src/firebase.js の DATABASE_ID と同じ。
// 標準の "(default)" を指すと「The database (default) does not exist」の 404 になる（2026-11-03 の設置で発覚）。
const FIRESTORE_DATABASE_ID = 'default';
function fsBase_(cfg) {
  return 'https://firestore.googleapis.com/v1/projects/' + cfg.projectId + '/databases/' + FIRESTORE_DATABASE_ID + '/documents';
}
function fsFetch_(auth, url, method, body) {
  const res = UrlFetchApp.fetch(url, {
    method: method,
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + auth.token },
    payload: body ? JSON.stringify(body) : undefined,
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code === 404 && method === 'get') {
    // 「ドキュメントが無い」は null。データベースそのものが無い 404 は接続の誤りなので、空として扱わずにエラーにする
    const text404 = res.getContentText();
    if (/database .* does not exist/i.test(text404)) throw new Error('工程図のデータベースが見つかりません（プロジェクト ' + url.split('/projects/')[1].split('/')[0] + '・データベース ' + FIRESTORE_DATABASE_ID + '）: ' + text404.slice(0, 300));
    return null;
  }
  if (code >= 300) throw new Error('Firestore ' + method.toUpperCase() + ' ' + code + ': ' + res.getContentText().slice(0, 500));
  const text = res.getContentText();
  return text ? JSON.parse(text) : {};
}
/** コレクションの全ドキュメント（デコード済み）。limit を渡すと先頭だけ。 */
function fsListAll_(auth, cfg, collectionPath, limit) {
  const docs = [];
  let pageToken = '';
  do {
    const size = limit ? Math.min(limit, 300) : 300;
    const url = fsBase_(cfg) + '/' + collectionPath + '?pageSize=' + size + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    const j = fsFetch_(auth, url, 'get') || {};
    (j.documents || []).forEach(d => docs.push(fsDecodeDoc_(d)));
    pageToken = j.nextPageToken || '';
    if (limit && docs.length >= limit) break;
  } while (pageToken);
  return docs;
}
/** workspaces/{wid}/data/{key} の value（JSON文字列）を返す。無ければ null。 */
function fsGetValueString_(auth, cfg, key) {
  const d = fsFetch_(auth, fsBase_(cfg) + '/workspaces/' + cfg.workspaceId + '/data/' + key, 'get');
  if (!d) return null;
  const f = fsDecodeDoc_(d);
  return (f.value === undefined || f.value === null) ? null : String(f.value);
}
/** ドキュメントを作成／部分更新。maskFields を渡すとその項目だけ更新する。 */
function fsPatch_(auth, cfg, docPath, fields, maskFields) {
  let url = fsBase_(cfg) + '/' + docPath;
  if (maskFields && maskFields.length) url += '?' + maskFields.map(f => 'updateMask.fieldPaths=' + encodeURIComponent(f)).join('&');
  return fsFetch_(auth, url, 'patch', { fields: fsEncodeFields_(fields) });
}
function fsEncodeFields_(obj) {
  const out = {};
  Object.keys(obj).forEach(k => { out[k] = fsEncodeValue_(obj[k]); });
  return out;
}
function fsEncodeValue_(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsEncodeValue_) } };
  if (typeof v === 'object') return { mapValue: { fields: fsEncodeFields_(v) } };
  return { stringValue: String(v) };
}
function fsDecodeDoc_(d) {
  const out = {};
  const fields = (d && d.fields) || {};
  Object.keys(fields).forEach(k => { out[k] = fsDecodeValue_(fields[k]); });
  return out;
}
function fsDecodeValue_(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return !!v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(fsDecodeValue_);
  if ('mapValue' in v) return fsDecodeDoc_(v.mapValue);
  return null;
}
