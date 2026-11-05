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
 *   2. 15分ごとの自動実行（または「転記」ボタン）で『連携』タブへ新しい行・変わった行だけ反映し（入力日＝最初に転記した日）、
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
const SHEET = { LINK: '連携', REG: '登録一覧', ENTRY: '案件登録', FORM: '案件入力', COMPANY: '会社マスタ', VIEW: '視点マスタ', PROJECT: '案件マスタ', SETTINGS: '設定', HOWTO: '使い方', TRASH: '削除済み' };
// 2026-11-04：エンジニア入力シートを3つのタブに分けた。入力前（翻訳・時間がそろうまで）→ 制作中（工程図に登録してから完了まで）→ 制作済み（工程図で完了）
const STAFF_TAB_DEFAULT = '入力前';
const STAFF_TAB_DOING = '制作中';
const STAFF_TAB_DONE = '制作済み';
const STAFF_TAB_OLD = '入力シート'; // 2026-11-04 より前の入力タブの名前（『入力前』に名前を変える）
// 各タブの1行目の案内（日本語／ベトナム語）
const STAFF_TAB_HINTS = {
  '入力前': '入力前：翻訳・制作時間を入れる視点。黄色の列だけ入力（灰色は自動・管理者が入れる）。そろって15分たつと工程図に登録され『制作中』へ移ります ／ Chưa nhập xong: chỉ nhập vào các cột màu vàng (cột xám là tự động / quản lý nhập). Khi đủ thông tin 15 phút sẽ được đăng ký vào 工程図 và chuyển sang tab『制作中』',
  '制作中': '制作中：工程図に登録済みで制作中の視点（自動で移ります）。工程図で完了になると『制作済み』へ移ります ／ Đang làm: góc nhìn đã đăng ký vào 工程図 (tự động chuyển). Khi hoàn thành trên 工程図 sẽ chuyển sang tab『制作済み』',
  '制作済み': '制作済み：工程図で完了になった視点（自動で移ります。消さない）／ Đã xong: góc nhìn đã hoàn thành trên 工程図 (tự động chuyển, không xóa)',
};
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
  notifyFirst: '催促するまでの時間（登録日時が無い行だけ・翻訳済みから・時間）',
  notifyRepeat: '催促のくり返し（時間）',
  notifyHours: '催促する時間帯（ベトナム時間）',
  regMessage: '登録時の連絡文',
  calcMinutes: '制作時間の計算の期限（登録から・分）',
  calcHours: '制作時間の計算に数える時間帯（ベトナム時間）',
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
  autoWait: 15,
  notify: 'する',
  notifyFirst: 2,
  notifyRepeat: 1,
  notifyHours: '8-20',
  regMessage: '{社内案件名}の資料を共有します。\n{サーバーリンク}\n\n{計算期限}までに制作時間の計算をお願いします。',
  calcMinutes: 90,
  calcHours: '8-12,13-17',
  interpMessage: '{社内案件名}案件の資料を共有しますので、翻訳をお願いします。\n⇩サーバーリンク\n{サーバーリンク}\n\n制作時間の計算については{計算期限}までに記入してください。\n{通訳へのメッセージ}',
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
  autoSend: '「する」：15分ごとの自動実行で、状態が「未送信」の行と「工程図へ」にチェックした行を工程図に登録（「要確認」「更新あり」はチェックするまで待つ）。「しない」：転記だけ自動',
  autoWait: '「未送信」の行は、最後に内容が変わってからこの分数がたってから自動登録する（エンジニアが入力ミスを直す時間）',
  notify: '「する」：『案件登録』で翻訳済みになってから制作時間が出ない視点を Discord で知らせる（Webhook はメニュー「Discord 通知の設定」）。「しない」：知らせない',
  notifyFirst: '催促は、連絡文の {計算期限}（登録日時＋下の「制作時間の計算の期限」）を過ぎても制作時間が空なら送る。この欄は登録日時が無い行だけに使う（翻訳済みからの時間）',
  notifyRepeat: '1回目のあとは、この時間ごとに知らせる（15分ごとの自動実行で確かめるので、最大15分ほど遅れる）',
  regMessage: '『案件登録』の「連絡文」列とメニュー「連絡文をコピー」のひな形（エンジニア向け）。使える文字：{社内案件名} {社外案件名} {サーバーリンク} {視点一覧} {視点} {パターン} {担当者} {納期} {新規or修正} {通訳へのメッセージ} {登録日時} {計算期限}（＝登録日時＋「制作時間の計算の期限」）（セルの中の改行もそのまま使えます）',
  calcMinutes: '連絡文の {計算期限} ＝『登録一覧』の登録日時＋この分数（90 ＝ 1時間30分後）。下の「数える時間帯」の外（昼休み・終業後）は数えない',
  calcHours: '{計算期限} を数える時間帯（ベトナム時間）。「8-12,13-17」＝ 8〜12時と13〜17時だけ数える（12〜13時の昼休みと17時以降は数えず、次の日の8時から続きを数える）。時間帯を気にせず足すなら「0-24」',
  interpMessage: '『登録一覧』の「通訳向け連絡文」列と、『案件入力』で登録するときの確認画面のひな形。使える文字は「登録時の連絡文」と同じ。{通訳へのメッセージ} には登録のときに書いた「通訳へのメッセージ」が入る（空なら行ごと消える）',
  manualRun: 'チェックすると、その場で 案件登録→入力シート・転記・工程図への登録 をまとめて動かす（終わるとチェックは外れ、結果は「最後の自動実行」に出る）',
  notifyHours: 'この時間帯だけ知らせる（例 8-20 ＝ 8時〜20時。時刻はベトナム時間）。夜に止まっていた分は、時間帯に入ったら知らせる',
  lastAuto: '15分ごとの自動実行が最後に動いた日時と結果（自動で書き込み）',
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
  { key: 'whiteBody', label: 'White躯体', vi: 'Trắng – kết cấu (giờ)', width: 10, hours: true, input: true,
    note: '躯体（建物・外構など）のホワイトまでの制作時間（h）。モデル作成の行はモデル制作時間\nSố giờ làm phối cảnh trắng phần kết cấu (tòa nhà, ngoại cảnh…). Dòng dựng model: số giờ dựng model' },
  { key: 'whiteFurn', label: 'White家具', vi: 'Trắng – nội thất (giờ)', width: 10, hours: true, input: true,
    note: '家具・設備のホワイトまでの制作時間（h）。無ければ空欄（工程図では White躯体 と合わせて1つの White になる）\nSố giờ làm phối cảnh trắng phần đồ nội thất. Không có thì để trống (trên 工程図 sẽ cộng chung với Trắng – kết cấu)' },
  { key: 'color', label: 'Color', vi: 'Màu (giờ)', width: 9, hours: true, input: true,
    note: '色付きパースまでの制作時間（h）。White の時間は含めない\nSố giờ làm phối cảnh màu. Không tính số giờ White' },
  { key: 'other', label: 'pts', vi: 'Ghép ảnh (giờ)', width: 10, hours: true, input: true,
    note: '写真合成・フォトショップ作業（人物・点景など）の時間（h）\nSố giờ ghép ảnh / Photoshop (người, cây, xe…)' },
  { key: 'note', label: 'メモ', vi: 'Ghi chú', width: 30, input: true,
    note: '制作上の注意点など（自由記入）\nLưu ý khi thực hiện (nhập tự do)' },
  // ここから下は「案件登録」の流れ（管理者が登録 → 通訳が翻訳 → エンジニアが時間を出す）で使う列
  { key: 'translated', label: '翻訳済み', vi: 'Đã dịch', width: 8, checkbox: true, input: true,
    note: '通訳：資料を翻訳してエンジニアに伝えたらチェック。ここから制作時間の計算が始まります\nPhiên dịch: dịch tài liệu xong và đã truyền đạt cho kỹ sư thì đánh dấu' },
  { key: 'transAt', label: '翻訳日時', vi: 'Thời gian dịch xong', width: 14, auto: true, datetime: true,
    note: '翻訳済みにチェックした日時（自動で入る）\nThời điểm đánh dấu đã dịch (tự động)' },
  { key: 'transNote', label: '翻訳メモ', vi: 'Ghi chú dịch', width: 30, input: true,
    note: '通訳：お客様の指示の訳・注意点など\nPhiên dịch: nội dung dịch yêu cầu của khách, lưu ý…' },
  { key: 'split', label: '作業の分け方', vi: 'Cách chia công việc', width: 30, input: true,
    note: '分けて作業できるときに書く（例：White＝躯体 3h／家具1 2h／家具2 1h）\nNếu có thể chia công việc thì ghi (VD: White = khung 3h / nội thất 1 2h / nội thất 2 1h)' },
  { key: 'estimator', label: '時間入力者', vi: 'Người nhập giờ', width: 12, input: true,
    note: 'エンジニア：制作時間を決めた人の名前\nKỹ sư: tên người quyết định số giờ' },
  { key: 'estimatedAt', label: '時間入力日時', vi: 'Thời gian nhập giờ', width: 14, auto: true, datetime: true,
    note: 'White・Color・pts を書いた日時（自動で入る）\nThời điểm nhập số giờ (tự động)' },
  { key: 'total', label: '合計', vi: 'Tổng (giờ)', width: 8, auto: true,
    note: 'White躯体＋White家具＋Color＋pts（自動で計算。書かなくてよい）\nTự động tính (không cần nhập)' },
  { key: 'regNo', label: '登録No', vi: 'Mã đăng ký', width: 8, auto: true,
    note: '管理者の登録番号（自動で入る。変えない）\nMã đăng ký của quản lý (tự động, không sửa)' },
  { key: 'toInterp', label: '管理者からの連絡', vi: 'Lời nhắn từ quản lý', width: 30, auto: true,
    note: '管理者が『案件登録』に書いた通訳へのメッセージ（自動で入る）\nLời nhắn của quản lý cho phiên dịch (tự động)' },
  { key: 'delivery', label: '納品名', vi: 'Tên file giao', width: 30, auto: true,
    note: '納品するファイルの名前（自動）：社外案件名_社外視点名_YYMMDD。YYMMDD は納品する日に書き換えて使う\nTên file giao (tự động): Tên dự án_Tên góc nhìn_YYMMDD. Đổi YYMMDD thành ngày giao khi dùng' },
  { key: 'delReq', label: '削除依頼', vi: 'Yêu cầu xóa', width: 8, checkbox: true, input: true,
    note: '登録の間違い・二重登録などで、この行を消してほしいときにチェック。管理者が確認して消します（自分で行を消さない）\nĐánh dấu khi muốn xóa dòng này (đăng ký nhầm, trùng…). Quản lý sẽ kiểm tra và xóa (không tự xóa dòng)' },
];
const STAFF_INPUT_HEADERS = STAFF_INPUT_COLUMNS.map(c => c.label);
// 『入力シート』1行目の案内（見出しの上が空のときだけ書く）
const STAFF_INPUT_HINT = STAFF_TAB_HINTS[STAFF_TAB_DEFAULT];
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
    .addItem('案件を登録（入力画面）', 'openEntryForm')
    .addItem('『案件入力』タブを作り直す（視点マスタを変えたとき）', 'rebuildFormSheet')
    .addSeparator()
    .addItem('0. かんたん初期設定（最初に1回だけ）', 'quickSetup')
    .addSeparator()
    .addItem('案件登録を入力シートへ写す（翻訳・時間の読み戻しと催促も）', 'syncRegistrationsNow')
    .addItem('連絡文をコピー（『登録一覧』で選んだ行）', 'showRegMessage')
    .addItem('1. エンジニア入力シートから転記', 'transferFromStaffSheet')
    .addItem('2. 工程図へ送信（「工程図へ」にチェックした行）', 'sendToKoutei')
    .addItem('送信内容のプレビュー（書き込まない）', 'previewSend')
    .addSeparator()
    .addItem('自動実行（15分ごと）を今すぐ1回動かす', 'runAutoNow')
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
// 登録後の変更を Discord で知らせるときの項目名
const CHANGE_LABEL = { code: '案件', cut: '視点', pattern: 'パターン', request: '新規or修正', deadline: '納期', white: 'White', color: 'Color', other: 'pts', item: '制作項目', name: '社外案件名', split: '作業の分け方' };
/** 登録後に入力が変わった行の確認の文（Discord 用。純ロジック） */
function changedMessage_(items) {
  return ['⚠ 工程図に登録した後で、エンジニア入力シートの内容が変わりました。確認してください / Nội dung đã thay đổi sau khi đăng ký'].concat(
    items.map(x => '・' + x),
    ['管理者用シートの『連携』で内容を見て、よければ「工程図へ」にチェック（工程図の未完了の作業に反映）。そのままでよければ何もしなくてかまいません。']).join('\n');
}
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
  const changedAfterSend = []; // 工程図に登録した後で入力シートの内容が変わった行（Discord で確認を頼む）
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
      const diffs = [];
      Object.keys(fields).forEach(f => {
        if (fields[f] === undefined) return; // 入力シートに無い列（納期・制作項目など）は、人が『連携』に入れた値を保つ
        if (!sameCell_(cur[col[f] - 1], fields[f])) {
          cellUpdates.push({ row: r + 1, col: col[f], value: fields[f] });
          // 元シート行・サーバリンク・備考の変化は「内容の変更」とみなさない
          if (f !== 'srcRow' && f !== 'link' && f !== 'note') {
            changed = true;
            diffs.push((CHANGE_LABEL[f] || f) + ' ' + (trimStr_(cur[col[f] - 1]) || '空') + '→' + (trimStr_(fields[f]) || '空'));
          }
        }
      });
      const status = String(cur[col.status - 1] || '');
      if (changed) {
        updated++;
        cellUpdates.push({ row: r + 1, col: col.transferredAt, value: stamp });
        if (status === STATUS.SENT) cellUpdates.push({ row: r + 1, col: col.status, value: STATUS.UPDATED });
        if (status === STATUS.SENT || status === STATUS.UPDATED) {
          changedAfterSend.push(joinCode_(s.code, '') + ' ' + viewpointNameOf_(s.cut, s.pattern) + '（' + diffs.join('、') + '）');
        }
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
      code: s.code, name: j.name, cut: s.cut, pattern: s.pattern, extName: (ri && ri.extName) || j.extName, round: s.round, request: s.request,
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
  return { msg, added: appends.length, needCheck, updated, waitingKeys: sourceRows.waitingKeys || [], changedAfterSend };
}

/** スタッフシートを読み、必要な列だけ抜き出す。見出し名で列を探すので、新旧どのレイアウトでも読める。 */
/** White の時間：White躯体＋White家具（分ける前の『White』列だけのシートはその列） */
function staffWhite_(v, sc) {
  const at = (c) => (c ? v[c - 1] : '');
  return sc.whiteBody ? Math.round((toHours_(at(sc.whiteBody)) + toHours_(at(sc.whiteFurn))) * 100) / 100 : toHours_(at(sc.white));
}
/** 読むタブの名前（取込キーの n回目 が変わらないよう、古い順＝制作済み→制作中→入力前）。旧レイアウトのタブ名なら、そのタブだけ */
function staffTabNames_(cfg) {
  return cfg.tabName === STAFF_TAB_DEFAULT ? [STAFF_TAB_DONE, STAFF_TAB_DOING, STAFF_TAB_DEFAULT] : [cfg.tabName];
}
function readStaffRows_(cfg) {
  const ss = SpreadsheetApp.openById(cfg.fileId);
  if (!ss.getSheetByName(cfg.tabName)) throw new Error(`エンジニア入力シートにタブ「${cfg.tabName}」が見つかりません（『設定』タブのタブ名を確認するか、メニュー「0. かんたん初期設定」を実行してください）`);
  const names = staffTabNames_(cfg);
  const rows = [];
  names.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet) readStaffTab_(sheet, cfg, names.length > 1 ? name : '').forEach(r => rows.push(r));
  });
  return rows;
}
/** 1つのタブの行を読む。tabLabel があれば 元シート行 を「制作中!5」の形にする */
function readStaffTab_(sheet, cfg, tabLabel) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];

  const headerRow = findStaffHeaderRow_(sheet);
  if (headerRow < 0) throw new Error('エンジニア入力シート' + (tabLabel ? '『' + tabLabel + '』' : '') + 'に見出し（会社コード・案件番号 または 社内案件名）の行が見つかりません（先頭200行を探しました）');

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
      srcRow: tabLabel ? tabLabel + '!' + (firstDataRow + i) : firstDataRow + i,
      tab: tabLabel, row: firstDataRow + i,
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
      white: staffWhite_(v, sc),
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
    whiteBody: find(['White躯体']),
    whiteFurn: find(['White家具']),
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
    delReq: find(['削除依頼']),
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
  const missing = ['code', 'cut', 'white'].filter(k => !m[k] && !(k === 'white' && m.whiteBody));
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
 * 自動登録の対象か（15分ごとの自動実行で使う。純ロジック）。
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
    if (add.similar.length) fixCompanyMasterNames_(ss, add.similar); // 工程図を正として『会社マスタ』の表記も直す
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
    // 会社名は工程図の顧客マスタの表記に合わせる（「株式会社」・空白・記号・少しの打ち間違いの違いは同じ会社とみなす）
    const orig = trimStr_(row.company);
    const canon = resolveCompanyName_(orig, customerMaster);
    if (canon && canon !== orig) row.company = canon;
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
    if (canon && canon !== orig) warns.push('会社名「' + orig + '」は工程図の「' + canon + '」として登録');
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

// ============ 自動実行（15分ごと） ============
const AUTO_HANDLER = 'autoRun';
const AUTO_EVERY_MINUTES = 15;

/**
 * 15分ごとの自動実行（トリガーから呼ばれる）：転記 → 自動登録。
 * 入力シートに変わりが無ければ何も書かず、自動登録の対象が無ければ工程図にもアクセスしない。
 * 結果は『設定』の「最後の自動実行」に1行で残す（エラーもここに出る）。
 */
/**
 * 入力シートの行を、状態に合わせてタブ間で移す（15分ごとの自動実行の最後）。
 * 入力前 → 制作中：『連携』で工程図に登録済み（登録済み・更新あり）になった行
 * 制作中 → 制作済み：工程図のタスク（その視点・その回）がすべて完了になった行
 * 取込キー（n回目）は 制作済み→制作中→入力前 の順に数えるので、移しても変わらない。合計など式の列は書かない
 */
function moveStaffRows_(cfg) {
  const out = { toDoing: 0, toDone: 0 };
  if (cfg.tabName !== STAFF_TAB_DEFAULT) return out;
  const file = SpreadsheetApp.openById(cfg.fileId);
  const doing = file.getSheetByName(STAFF_TAB_DOING), done = file.getSheetByName(STAFF_TAB_DONE), before = file.getSheetByName(STAFF_TAB_DEFAULT);
  if (!doing || !done || !before) return out;
  const rows = readStaffRows_(cfg);
  const keyed = collectSourceRows_(rows.map(r => Object.assign({}, r, { done: false })), new Date());
  const keyByLoc = new Map();
  keyed.forEach(k => keyByLoc.set(String(k.srcRow), k.key));
  // 記入途中の行も数えておく（n回目を合わせるため。移す対象にはならない）
  const link = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.LINK);
  const status = new Map();
  if (link && link.getLastRow() >= 2) {
    const col = headerMap_(link);
    link.getDataRange().getValues().slice(1).forEach(v => { const k = String(v[col.key - 1] || ''); if (k) status.set(k, String(v[col.status - 1] || '')); });
  }
  const toDoing = rows.filter(r => r.tab === STAFF_TAB_DEFAULT && keyByLoc.has(String(r.srcRow)) &&
    [STATUS.SENT, STATUS.UPDATED].indexOf(status.get(keyByLoc.get(String(r.srcRow)))) >= 0);
  let toDone = [];
  const doingRows = rows.filter(r => r.tab === STAFF_TAB_DOING && keyByLoc.has(String(r.srcRow)));
  // 工程図の完了を見るのは1時間に1回、制作中の案件のタスクだけ（全タスクを毎回読むと Firestore の無料枠＝1日の読み取り回数を使い切る。2026-11-05）
  const props = PropertiesService.getScriptProperties();
  const lastCheck = Number(props.getProperty(PROP_DONE_CHECKED_AT) || 0);
  if (doingRows.length && Date.now() - lastCheck >= DONE_CHECK_INTERVAL_MS) {
    props.setProperty(PROP_DONE_CHECKED_AT, String(Date.now()));
    const codes = [];
    doingRows.forEach(r => { if (r.code && codes.indexOf(r.code) < 0) codes.push(r.code); });
    const tasks = fsTasksByProjects_(getAuth_(), cfg, codes);
    const doneKeys = staffDoneKeys_(tasks);
    toDone = doingRows.filter(r => doneKeys.has(keyByLoc.get(String(r.srcRow))));
  }
  out.toDoing = moveStaffTabRows_(before, doing, toDoing.map(r => r.row));
  out.toDone = moveStaffTabRows_(doing, done, toDone.map(r => r.row));
  return out;
}
const PROP_DONE_CHECKED_AT = 'DONE_CHECKED_AT';
const DONE_CHECK_INTERVAL_MS = 55 * 60000; // 15分ごとの自動実行のうち、1時間に1回だけ
/** 社内案件名（RIC.34 など）のタスクだけを読む（projectNameInternal で絞る。30件ずつ） */
function fsTasksByProjects_(auth, cfg, codes) {
  const out = [];
  for (let i = 0; i < codes.length; i += 30) {
    const chunk = codes.slice(i, i + 30);
    fsRunQuery_(auth, cfg, { fieldFilter: { field: { fieldPath: 'projectNameInternal' }, op: 'IN', value: { arrayValue: { values: chunk.map(c => ({ stringValue: c })) } } } })
      .forEach(d => out.push(d));
  }
  return out;
}
/** 取込キーで始まる externalId のタスクだけを読む（キーごとに範囲で絞る） */
function fsTasksByKeys_(auth, cfg, keys) {
  const out = [];
  keys.forEach(k => {
    const lo = k + '::';
    fsRunQuery_(auth, cfg, { compositeFilter: { op: 'AND', filters: [
      { fieldFilter: { field: { fieldPath: 'externalId' }, op: 'GREATER_THAN_OR_EQUAL', value: { stringValue: lo } } },
      { fieldFilter: { field: { fieldPath: 'externalId' }, op: 'LESS_THAN', value: { stringValue: lo + '\uf8ff' } } },
    ] } }).forEach(d => out.push(d));
  });
  return out;
}
/** workspaces/{wid}/tasks を where で絞って読む（デコード済み。_id にドキュメントID） */
function fsRunQuery_(auth, cfg, where) {
  const url = fsBase_(cfg) + '/workspaces/' + cfg.workspaceId + ':runQuery';
  const res = fsFetch_(auth, url, 'post', { structuredQuery: { from: [{ collectionId: 'tasks' }], where } }) || [];
  return (Array.isArray(res) ? res : []).filter(x => x && x.document).map(x => {
    const d = fsDecodeDoc_(x.document);
    d._id = String(x.document.name || '').split('/').pop();
    d._raw = x.document.fields || {};
    return d;
  });
}
/** 工程図のタスク → すべて完了になった取込キー（純ロジック）。externalId ＝ 取込キー::ステップ */
function staffDoneKeys_(tasks) {
  const by = new Map();
  (tasks || []).forEach(t => {
    const ext = String(t && t.externalId || '');
    const parts = ext.split('::');
    if (parts.length < 4) return;
    const key = parts.slice(0, 3).join('::');
    if (!by.has(key)) by.set(key, true);
    if (t.status !== 'done') by.set(key, false);
  });
  const out = new Set();
  by.forEach((ok, k) => { if (ok) out.add(k); });
  return out;
}
/** from タブの rowNumbers の行を to タブの最後の行の下へ移す（見出しが同じ並びとは限らないので、見出しの名前で列を合わせる）。移した数を返す */
function moveStaffTabRows_(from, to, rowNumbers) {
  if (!rowNumbers.length) return 0;
  const fh = findStaffHeaderRow_(from), th = findStaffHeaderRow_(to);
  const fsc = ensureStaffExtraColumns_(from, fh), tsc = ensureStaffExtraColumns_(to, th);
  const fw = Math.max.apply(null, Object.keys(fsc).map(k => fsc[k]));
  const tw = Math.max.apply(null, Object.keys(tsc).map(k => tsc[k]));
  const keys = STAFF_INPUT_COLUMNS.map(d => d.key).filter(k => k !== 'total' && fsc[k] && tsc[k]);
  // to の最後に中身がある行（プルダウン・式だけの行は数えない）
  let last = th;
  const tl = to.getLastRow();
  if (tl > th) to.getRange(th + 1, 1, tl - th, tw).getValues().forEach((v, i) => { if (keys.some(k => trimStr_(v[tsc[k] - 1]) !== '' && v[tsc[k] - 1] !== false)) last = th + 1 + i; });
  const sorted = rowNumbers.slice().sort((a, b) => a - b);
  ensureSize_(to, last + sorted.length, tw);
  sorted.forEach((r, i) => {
    const v = from.getRange(r, 1, 1, fw).getValues()[0];
    keys.forEach(k => { const val = v[fsc[k] - 1]; if (val !== '' && val !== null && val !== undefined) to.getRange(last + 1 + i, tsc[k]).setValue(val); });
  });
  sorted.slice().reverse().forEach(r => from.deleteRow(r));
  return sorted.length;
}
function autoRun() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) { console.log('ほかの処理が動いているので、今回の自動実行は見送りました'); return '見送り'; }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const parts = [];
  try {
    const cfg = readSettings_();
    let waitingKeys = [];
    try {
      const pd = processPendingDeletes_(cfg);
      if (pd) parts.push('工程図から作業を削除 ' + pd + '件');
    } catch (e) {
      parts.push('工程図の削除エラー：' + String(e && e.message || e));
    }
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
      if (t.changedAfterSend && t.changedAfterSend.length) {
        const url = PropertiesService.getScriptProperties().getProperty(PROP_DISCORD);
        if (!url) parts.push('登録後の変更 ' + t.changedAfterSend.length + '件（Discord の Webhook が未設定のため、『連携』の「更新あり」を確認）');
        else {
          try { sendDiscord_(url, changedMessage_(t.changedAfterSend)); parts.push('登録後の変更 ' + t.changedAfterSend.length + '件を Discord で確認依頼'); }
          catch (e) { parts.push('登録後の変更の Discord 送信エラー：' + String(e && e.message || e)); }
        }
      }
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
    try {
      const mv = moveStaffRows_(cfg);
      if (mv.toDoing || mv.toDone) parts.push('入力シート 制作中へ' + mv.toDoing + '件・制作済みへ' + mv.toDone + '件');
    } catch (e) {
      parts.push('入力シートの移動エラー：' + String(e && e.message || e));
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

/** 15分ごとの自動実行を設定する（既にあれば作り直す。何度実行しても1つだけ） */
function installAutoTrigger_() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === AUTO_HANDLER).forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger(AUTO_HANDLER).timeBased().everyMinutes(AUTO_EVERY_MINUTES).create();
  // 入力シートの編集の瞬間に翻訳日時・時間入力日時を入れる（入力シートを開けないときは15分ごとの自動実行で入れる）
  try { installStaffEditTrigger_(readSettings_().fileId); } catch (e) { console.log('編集トリガーを設定できませんでした: ' + (e && e.message || e)); }
  // 『案件登録』に書いたらすぐ入力シートへ写す
  try { installAdminEditTrigger_(SpreadsheetApp.getActiveSpreadsheet().getId()); } catch (e) { console.log('管理者シートの編集トリガーを設定できませんでした: ' + (e && e.message || e)); }
}
function startAutoRun() {
  installAutoTrigger_();
  alertOrLog_('15分ごとの自動実行を始めました（転記＋「未送信」の行の自動登録）。\n止めるときはメニュー「自動実行を止める」。');
}
function stopAutoRun() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === STAFF_EDIT_HANDLER || t.getHandlerFunction() === ADMIN_EDIT_HANDLER).forEach(t => ScriptApp.deleteTrigger(t));
  const n = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === AUTO_HANDLER).map(t => ScriptApp.deleteTrigger(t)).length;
  alertOrLog_(n ? '15分ごとの自動実行を止めました。転記・送信はメニューから手で行えます。' : '自動実行は設定されていません。');
}

// ============ 案件登録（管理者）→ エンジニア入力シート → 翻訳 → 時間計算の催促（Discord） ============
// 流れ：
//   ① 管理者が『案件登録』タブに1視点1行で登録（社外案件名・担当者・視点・パターン・サーバーリンク・納期・注文書…）
//   ② 15分ごとの自動実行（またはメニュー）で、エンジニア入力シートへ必要な列だけ写す（注文書・管理者メモ・担当者・納期は写さない）
//   ③ 通訳が入力シートの「翻訳済み」にチェック → エンジニアが White・Color・pts と作業の分け方を書く
//   ④ 翻訳済み・時間・作業の分け方を『案件登録』に読み戻し、状態（翻訳待ち／時間計算待ち／時間入力済み）を付ける
//   ⑤ 連絡文の期限（登録日時＋計算の期限）を過ぎても時間が空なら Discord で催促（以降1時間ごと）
//   ⑥ 時間が入った行は、いつもの転記 → 自動登録で工程図へ（担当者・納期は『案件登録』から入る）
const REG_H = {
  no: '登録No', state: '状態',
  code: '会社コード', number: '案件番号', name: '社外案件名', internal: '社内案件名', assignee: '担当者', request: '新規or修正',
  cut: '視点', pattern: 'パターン', extName: '社外視点名', link: 'サーバーリンク', deadline: '納期', order: '注文書', memo: '管理者メモ',
  translated: '翻訳済み', translatedAt: '翻訳日時', transNote: '翻訳メモ', white: 'White', color: 'Color', other: 'pts', total: '合計', split: '作業の分け方',
  estimator: '時間入力者', estimatedAt: '時間入力日時',
  regDate: '登録日時', delivery: '納品名', message: '連絡文',
  manual: '今すぐ連携', copy: 'コピー', del: '削除', delReq: '削除依頼', toInterp: '通訳へのメッセージ', interpMessage: '通訳向け連絡文', copiedAt: '入力シートへ写した日時', notifiedAt: '最後の催促', notifyCount: '催促回数',
};
const REG_ORDER = ['no', 'state', 'manual', 'regDate', 'copy', 'del', 'delReq', 'code', 'number', 'name', 'internal', 'assignee', 'request', 'cut', 'pattern', 'extName', 'link', 'deadline', 'order', 'memo', 'toInterp',
  'translated', 'translatedAt', 'transNote', 'white', 'color', 'other', 'total', 'split', 'estimator', 'estimatedAt', 'copiedAt', 'notifiedAt', 'notifyCount', 'delivery', 'message', 'interpMessage'];
// 2026-11-03：管理者が書くのは『案件登録』（入力専用）。「登録」にチェックした行に登録No を付け、
// エンジニア入力シートへ写して『登録一覧』へ移す（『案件登録』からは消える）。それまでの『案件登録』は『登録一覧』に名前を変える。
const ENTRY_H = { submit: '登録', state: '状態' };
const ENTRY_ORDER = ['submit', 'state', 'code', 'number', 'name', 'internal', 'assignee', 'request', 'cut', 'pattern', 'link', 'deadline', 'order', 'memo', 'toInterp'];
const ENTRY_STATE = { DRAFT: '記入中', READY: '登録できます' };
const ENTRY_NOTES = {
  submit: '書き終えたらチェック。登録No が付いて『登録一覧』とエンジニア入力シートに載り、この行は消える（足りない項目があるとチェックが外れ、「状態」に足りない項目が出る）',
  state: '自動：記入中（足りない項目）／登録できます（「登録」にチェックで送る）',
};
// 無くても動く列（あとから足した列。初期設定・登録のときに差し込む）
const REG_OPTIONAL = ['extName', 'del', 'delReq'];
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
  del: 'この登録を消すときにチェック → 確認の画面で「削除する」。『登録一覧』・エンジニア入力シート・『連携』の行と、工程図の作業をまとめて消す（元に戻せない）。同じ視点のあとの回（2回目など）がある行は、あとの回から消す',
  delReq: '自動：エンジニアが入力シートで「削除依頼」にチェックした日時。確かめて消すなら「削除」にチェック。消さないならエンジニアにチェックを外してもらう',
  extName: 'お客様向けの視点名（工程図の社外視点名に入る）。空なら『視点マスタ』から自動（外観目線視点①_パターンA など）。『案件入力』タブで書き換えた名前が入る',
  link: '保存先フォルダのリンク', deadline: '納期（入力シートには写さない。工程図の納期に入る）', order: '注文書のファイルのリンクなど（入力シートには写さない）',
  memo: '管理者だけのメモ（入力シートには写さない）',
  translated: '自動：入力シートで通訳がチェックしたら「済」', translatedAt: '自動：入力シートで翻訳済みにチェックした日時。ここから催促の時間を数える',
  transNote: '自動：入力シートの翻訳メモ', white: '入力シートの White（躯体＋家具）。管理者が自分で時間を決めたときはここに書くと、入力シートの White躯体へすぐ入る（入力シートで直したら、こちらも入力シートの値になる）', color: '入力シートの Color。管理者が書くと入力シートへすぐ入る', other: '入力シートの pts。管理者が書くと入力シートへすぐ入る',
  total: '自動：White＋Color＋pts', split: '自動：入力シートの作業の分け方',
  estimator: '自動：入力シートの時間入力者（制作時間を決めた人）', estimatedAt: '自動：入力シートに制作時間が書かれた日時',
  regDate: '自動：書き始めた日時。会社コード・案件番号・視点・新規or修正がそろって入力シートへ写した（登録Noが付いた）ときにその日時に直す。連絡文の {登録日時} {計算期限} のもと',
  copiedAt: '自動：入力シートへ写した（直した）日時', notifiedAt: '自動：最後に Discord で催促した日時', notifyCount: '自動：催促した回数',
  manual: 'チェックすると、その行をすぐ入力シートへ写す（手動連携。終わるとチェックは外れる）',
  copy: 'チェックすると、その行の案件の連絡文（エンジニア向け・通訳向け）の画面が開く。同じ案件・同じ登録日の視点（R0001〜R0003 など）は1通にまとめて出る。文章は選んだ状態なので ⌘C（Windows は Ctrl+C）でコピーできる。チェックはすぐ外れる',
  toInterp: '通訳へのメッセージ（翻訳してほしい点・注意点など）。入力シートの「管理者からの連絡」に写り、「通訳向け連絡文」にも入る',
  interpMessage: '自動：通訳に送る連絡文（ひな形は『設定』の「通訳向けの連絡文」）。メニュー「連絡文をコピー」でコピー・Discord へ送信もできる',
  message: '自動：エンジニア・通訳に送る連絡文（ひな形は『設定』の「登録時の連絡文」）。同じ社内案件名・同じ入力日の行は1通にまとめる。メニュー「連絡文をコピー」でコピー・Discord へ送信もできる',
  delivery: '自動：納品名（社外案件名_社外視点名_YYMMDD）。入力シートの「納品名」と同じ。YYMMDD はエンジニアが納品の日に書き換えて使う',
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
  if (!sheet) {
    // 2026-11-03 より前の『案件登録』（登録No・状態…の列がある）は、そのまま『登録一覧』にする（行・列の並び・書式を保つ）
    const old = ss.getSheetByName(SHEET.ENTRY);
    if (old && old.getLastColumn() > 0 && old.getRange(1, 1, 1, old.getLastColumn()).getValues()[0].map(v => trimStr_(v)).indexOf(REG_H.no) >= 0) {
      old.setName(SHEET.REG);
      sheet = old;
    }
  }
  if (!sheet) sheet = ss.insertSheet(SHEET.REG, 0);
  const lastCol = sheet.getLastColumn();
  const first = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(v => trimStr_(v)) : [];
  if (first.filter(Boolean).length === 0) {
    ensureSize_(sheet, 1, REG_ORDER.length);
    sheet.getRange(1, 1, 1, REG_ORDER.length).setValues([REG_ORDER.map(k => REG_H[k])]);
  } else {
    // 足りない見出しは、並び順で1つ前の列のすぐ右に差し込む（社外視点名はパターンの右など。前の列が無ければ右端）
    const heads = first.slice();
    REG_ORDER.forEach((k, i) => {
      if (heads.indexOf(REG_H[k]) >= 0) return;
      let after = 0;
      for (let j = i - 1; j >= 0 && !after; j--) after = heads.indexOf(REG_H[REG_ORDER[j]]) + 1;
      if (!after || after >= heads.length) {
        ensureSize_(sheet, 1, heads.length + 1);
        sheet.getRange(1, heads.length + 1).setValue(REG_H[k]);
        heads.push(REG_H[k]);
      } else {
        sheet.insertColumnAfter(after);
        sheet.getRange(1, after + 1).setValue(REG_H[k]);
        heads.splice(after, 0, REG_H[k]);
      }
    });
  }
  if (masters) formatRegSheet_(sheet, masters, readCompanyCodes_(ss));
  return sheet;
}
/** 『登録一覧』の式（R1C1）：社内案件名（会社コード＋案件番号）と合計（White＋Color＋pts） */
function regFormulas_(rc) {
  const C = (k) => 'RC' + rc[k];
  const hrs = C('white') + ',' + C('color') + ',' + C('other');
  return {
    internal: '=IF(' + C('code') + '="","",IF(OR(' + C('number') + '="",REGEXMATCH(' + C('code') + '&"","\\d")),' + C('code') + ',' + C('code') + '&"."&' + C('number') + '))',
    total: '=IF(COUNT(' + hrs + ')=0,"",SUM(' + hrs + '))',
  };
}
function formatRegSheet_(sheet, masters, codes) {
  const rc = regHeaderMap_(sheet);
  const n = Math.max(sheet.getMaxRows(), 1000); // 式を入れるので「最後の行＋α」にはしない（押すたびに広がらないように）
  ensureSize_(sheet, n, sheet.getLastColumn());
  sheet.setFrozenRows(1);
  const dv = () => SpreadsheetApp.newDataValidation();
  const list = (values, allowInvalid) => dv().requireValueInList(values, true).setAllowInvalid(allowInvalid).build();
  REG_ORDER.forEach(k => {
    if (!rc[k]) return;
    const head = sheet.getRange(1, rc[k]);
    // 人が書く列＝黄色、自動の列＝灰色（『連携』と同じ色分け）
    head.setNote(REG_NOTES[k] || '').setFontWeight('bold').setBackground(REG_INPUT.indexOf(k) >= 0 || k === 'extName' || k === 'manual' || k === 'copy' || k === 'del' || k === 'white' || k === 'color' || k === 'other' ? '#fff2cc' : '#e6e6e6');
  });
  // 社内案件名（会社コード＋案件番号）と合計（White＋Color＋pts）は式。値はスクリプトから書かない
  const fm = regFormulas_(rc);
  sheet.getRange(2, rc.internal, n - 1, 1).setFormulaR1C1(fm.internal);
  sheet.getRange(2, rc.total, n - 1, 1).setFormulaR1C1(fm.total);
  sheet.getRange(2, rc.manual, n - 1, 1).setDataValidation(dv().requireCheckbox().build());
  sheet.getRange(2, rc.copy, n - 1, 1).setDataValidation(dv().requireCheckbox().build());
  if (rc.del) sheet.getRange(2, rc.del, n - 1, 1).setDataValidation(dv().requireCheckbox().build());
  if (rc.delReq) sheet.getRange(2, rc.delReq, n - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  if (codes && codes.length) sheet.getRange(2, rc.code, n - 1, 1).setDataValidation(list(codes, true));
  sheet.getRange(2, rc.number, n - 1, 1).setDataValidation(dv().requireNumberBetween(1, 99999).setAllowInvalid(false).build());
  sheet.getRange(2, rc.request, n - 1, 1).setDataValidation(list(REQUEST_OPTIONS, false));
  sheet.getRange(2, rc.cut, n - 1, 1).setDataValidation(list(viewCodeOptions_(masters.views), true));
  sheet.getRange(2, rc.pattern, n - 1, 1).setDataValidation(list(PATTERN_OPTIONS, true));
  sheet.getRange(2, rc.deadline, n - 1, 1).setNumberFormat('yyyy-mm-dd');
  ['translatedAt', 'estimatedAt', 'regDate', 'copiedAt', 'notifiedAt'].forEach(k => sheet.getRange(2, rc[k], n - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm'));
}
/** 入力専用の『案件登録』タブを用意して見出し・注記・プルダウンを整える（何度実行しても安全。先頭に置く） */
function ensureEntrySheet_(ss, masters) {
  let sheet = ss.getSheetByName(SHEET.ENTRY);
  if (!sheet) sheet = ss.insertSheet(SHEET.ENTRY, 0);
  const lastCol = sheet.getLastColumn();
  const first = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(v => trimStr_(v)) : [];
  const label = (k) => ENTRY_H[k] || REG_H[k];
  if (first.filter(Boolean).length === 0) {
    ensureSize_(sheet, 1, ENTRY_ORDER.length);
    sheet.getRange(1, 1, 1, ENTRY_ORDER.length).setValues([ENTRY_ORDER.map(label)]);
  } else {
    const missing = ENTRY_ORDER.filter(k => first.indexOf(label(k)) < 0);
    if (missing.length) {
      ensureSize_(sheet, 1, lastCol + missing.length);
      sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing.map(label)]);
    }
  }
  if (masters) {
    const ec = entryHeaderMap_(sheet);
    const n = Math.max(sheet.getMaxRows(), 1000);
    ensureSize_(sheet, n, sheet.getLastColumn());
    sheet.setFrozenRows(1);
    const dv = () => SpreadsheetApp.newDataValidation();
    const list = (values, allowInvalid) => dv().requireValueInList(values, true).setAllowInvalid(allowInvalid).build();
    ENTRY_ORDER.forEach(k => {
      sheet.getRange(1, ec[k]).setNote(ENTRY_NOTES[k] || REG_NOTES[k] || '').setFontWeight('bold')
        .setBackground(REG_INPUT.indexOf(k) >= 0 || k === 'submit' ? '#fff2cc' : '#e6e6e6');
    });
    const C = (k) => 'RC' + ec[k];
    sheet.getRange(2, ec.internal, n - 1, 1).setFormulaR1C1('=IF(' + C('code') + '="","",IF(OR(' + C('number') + '="",REGEXMATCH(' + C('code') + '&"","\\d")),' + C('code') + ',' + C('code') + '&"."&' + C('number') + '))');
    sheet.getRange(2, ec.submit, n - 1, 1).setDataValidation(dv().requireCheckbox().build());
    const codes = readCompanyCodes_(ss);
    if (codes && codes.length) sheet.getRange(2, ec.code, n - 1, 1).setDataValidation(list(codes, true));
    sheet.getRange(2, ec.number, n - 1, 1).setDataValidation(dv().requireNumberBetween(1, 99999).setAllowInvalid(false).build());
    sheet.getRange(2, ec.request, n - 1, 1).setDataValidation(list(REQUEST_OPTIONS, false));
    sheet.getRange(2, ec.cut, n - 1, 1).setDataValidation(list(viewCodeOptions_(masters.views), true));
    sheet.getRange(2, ec.pattern, n - 1, 1).setDataValidation(list(PATTERN_OPTIONS, true));
    sheet.getRange(2, ec.deadline, n - 1, 1).setNumberFormat('yyyy-mm-dd');
  }
  return sheet;
}
function entryHeaderMap_(sheet) {
  const lastCol = sheet.getLastColumn();
  const headers = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(v => trimStr_(v)) : [];
  const col = {};
  ENTRY_ORDER.forEach(k => { const i = headers.indexOf(ENTRY_H[k] || REG_H[k]); if (i >= 0) col[k] = i + 1; });
  const missing = ENTRY_ORDER.filter(k => !col[k]);
  if (missing.length) throw new Error('『' + SHEET.ENTRY + '』タブの見出しが見つかりません: ' + missing.map(k => ENTRY_H[k] || REG_H[k]).join('、') + '（メニュー「0. かんたん初期設定」を実行してください）');
  return col;
}
/** 入力中の行の「状態」（純ロジック）：足りない項目があれば「記入中（…が空）」 */
function entryState_(row) {
  const need = ['code', 'number', 'cut', 'request'].filter(k => !trimStr_(row[k]));
  if (need.length) return ENTRY_STATE.DRAFT + '（' + need.map(k => REG_H[k]).join('・') + 'が空）';
  return ENTRY_STATE.READY;
}
/**
 * 『案件登録』で「登録」にチェックした行を『登録一覧』の末尾へ移す（登録No・入力シートへの書き込みは、このあと syncRegistrations_ が行う）。
 * 残った行は上に詰め、「状態」を書き直す。足りない項目がある行はチェックを外す。
 * 戻り値 { moved, rejected }
 */
function intakeEntries_(ss, list, rc) {
  const ent = ss.getSheetByName(SHEET.ENTRY);
  if (!ent || ent.getLastRow() < 2) return { moved: 0, rejected: 0 };
  let ec;
  try { ec = entryHeaderMap_(ent); } catch (e) { return { moved: 0, rejected: 0 }; }
  const width = ent.getLastColumn();
  const vals = ent.getRange(2, 1, ent.getLastRow() - 1, width).getValues();
  let last = 0; // 中身がある最後の行（2行目＝0）
  vals.forEach((v, i) => { if (REG_INPUT.some(k => trimStr_(v[ec[k] - 1]) !== '') || isChecked_(v[ec.submit - 1])) last = i + 1; });
  if (!last) return { moved: 0, rejected: 0 };
  const keep = [], move = [];
  let rejected = 0;
  vals.slice(0, last).forEach(v => {
    const row = {};
    REG_INPUT.forEach(k => { row[k] = v[ec[k] - 1]; });
    if (REG_INPUT.every(k => trimStr_(row[k]) === '')) return; // 空の行（チェックだけ）は捨てる
    const state = entryState_(row);
    if (isChecked_(v[ec.submit - 1])) {
      if (state === ENTRY_STATE.READY) { move.push(row); return; }
      rejected++;
    }
    keep.push({ row, state });
  });
  // 『案件登録』を書き直す（移した行を詰める。式の列＝社内案件名には触らない）
  const n = last;
  const colValues = (fn) => { const out = []; for (let i = 0; i < n; i++) out.push([i < keep.length ? fn(keep[i]) : '']); return out; };
  REG_INPUT.forEach(k => ent.getRange(2, ec[k], n, 1).setValues(colValues(x => x.row[k])));
  ent.getRange(2, ec.state, n, 1).setValues(colValues(x => x.state));
  const off = []; for (let i = 0; i < n; i++) off.push([false]);
  ent.getRange(2, ec.submit, n, 1).setValues(off);
  if (!move.length) return { moved: 0, rejected };
  appendToRegList_(list, rc, move);
  return { moved: move.length, rejected };
}
/**
 * 『登録一覧』に行を足す。同じ案件（会社コード＋案件番号）・同じ視点（パターン違い）の行が既にあれば、その最後の行のすぐ下に差し込む
 * （修正で枚数が増えたとき EX1-A・EX1-B・EX1-C が並ぶように）。無ければ最後に書き足す。書いた行番号の配列を返す
 */
function insertRegRows_(list, rc, rows) {
  const lv = list.getLastRow() >= 2 ? list.getRange(2, 1, list.getLastRow() - 1, list.getLastColumn()).getValues() : [];
  const keyOf = (code, number, cut) => normCode_(joinCode_(code, number)) + '::' + normCut_(trimStr_(cut));
  const lastBy = new Map();
  lv.forEach((v, i) => { if (trimStr_(v[rc.cut - 1])) lastBy.set(keyOf(v[rc.code - 1], v[rc.number - 1], v[rc.cut - 1]), i + 2); });
  const tail = [], groups = new Map();
  rows.forEach((row, i) => {
    const a = lastBy.get(keyOf(row.code, row.number, row.cut));
    if (a) { if (!groups.has(a)) groups.set(a, []); groups.get(a).push(i); } else tail.push(i);
  });
  const at = new Array(rows.length);
  if (tail.length) {
    const start = appendToRegList_(list, rc, tail.map(i => rows[i]));
    tail.forEach((i, j) => { at[i] = start + j; });
  }
  const keys = rc.extName ? REG_INPUT.concat(['extName']) : REG_INPUT;
  const fm = regFormulas_(rc);
  const box = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  // 下の差し込み位置から順に（上の行番号がずれないように）
  Array.from(groups.keys()).sort((a, b) => b - a).forEach(a => {
    const idx = groups.get(a);
    list.insertRowsAfter(a, idx.length);
    const r1 = a + 1, n = idx.length;
    const width = list.getLastColumn();
    const block = idx.map(i => { const line = new Array(width).fill(''); keys.forEach(k => { if (rc[k] && rows[i][k] !== undefined) line[rc[k] - 1] = rows[i][k]; }); return line; });
    keys.filter(k => rc[k]).forEach(k => list.getRange(r1, rc[k], n, 1).setValues(block.map(line => [line[rc[k] - 1]])));
    list.getRange(r1, rc.internal, n, 1).setFormulaR1C1(fm.internal);
    list.getRange(r1, rc.total, n, 1).setFormulaR1C1(fm.total);
    ['manual', 'copy', 'del'].forEach(k => { if (rc[k]) list.getRange(r1, rc[k], n, 1).setDataValidation(box).setValues(idx.map(() => [false])); });
    idx.forEach((i, j) => { at[i] = r1 + j; });
    // 先に書いた（下にある）行の番号は、差し込んだぶんだけずれる
    for (let i = 0; i < at.length; i++) if (at[i] && at[i] > a && idx.indexOf(i) < 0) at[i] += n;
  });
  return at;
}
/** 『登録一覧』の中身がある最後の行の下へ、管理者が書く列だけを書き足す。書いた最初の行番号を返す（チェックボックス・式だけの行は数えない） */
function appendToRegList_(list, rc, rows) {
  const lv = list.getLastRow() >= 2 ? list.getRange(2, 1, list.getLastRow() - 1, list.getLastColumn()).getValues() : [];
  let lastData = 1;
  lv.forEach((v, i) => { if (trimStr_(v[rc.no - 1]) !== '' || REG_INPUT.some(k => trimStr_(v[rc[k] - 1]) !== '')) lastData = i + 2; });
  ensureSize_(list, lastData + rows.length, list.getLastColumn());
  const keys = rc.extName ? REG_INPUT.concat(['extName']) : REG_INPUT;
  // 列ごとにまとめて書く（1マスずつ書くと遅い）
  keys.filter(k => rc[k] && rows.some(row => row[k] !== undefined && trimStr_(row[k]) !== '')).forEach(k =>
    list.getRange(lastData + 1, rc[k], rows.length, 1).setValues(rows.map(row => [row[k] === undefined ? '' : row[k]])));
  return lastData + 1;
}

// ============ 入力画面（メニュー「案件を登録（入力画面）」） ============
// 2026-11-03：登録ページを縦型の入力画面にした。1案件ぶんの視点・パターンはボタンでまとめて選ぶ（新規or修正は案件で1つ）。
// 「登録」で、視点ごとに1行ずつ『登録一覧』へ書き、すぐ登録No を付けてエンジニア入力シートへ写す（『案件登録』タブは通らない）。
const ENTRY_FORM_FIELDS = ['code', 'number', 'name', 'assignee', 'link', 'deadline', 'order', 'memo', 'toInterp'];
/**
 * 入力画面の値 → 『登録一覧』に書く行の配列（純ロジック）。足りないときは { error } を返す。
 * p = { code, number, name, assignee, link, deadline('YYYY-MM-DD'), order, memo, toInterp, views: [{ cut, pattern, request }] }
 */
function entryFormRows_(p) {
  const need = [];
  if (!trimStr_(p && p.code)) need.push(REG_H.code);
  const num = String(p && p.number !== undefined ? p.number : '').trim();
  if (!num) need.push(REG_H.number);
  else if (!/^\d+$/.test(num)) return { error: '案件番号は数字だけで書いてください（例 50）' };
  const views = ((p && p.views) || []).filter(v => trimStr_(v.cut) || trimStr_(v.pattern));
  if (!views.length) need.push('視点（1つ以上）');
  views.forEach((v, i) => {
    if (!trimStr_(v.cut)) need.push((i + 1) + '行目の視点');
    if (!trimStr_(v.request)) need.push((i + 1) + '行目の新規or修正');
  });
  if (need.length) return { error: '足りない項目があります：' + need.join('・') };
  const keys = new Set();
  for (const v of views) {
    const k = normCut_(viewpointNameOf_(trimStr_(v.cut).toUpperCase(), normPattern_(v.pattern)));
    if (keys.has(k)) return { error: '同じ視点が2回あります：' + viewpointNameOf_(trimStr_(v.cut).toUpperCase(), normPattern_(v.pattern)) };
    keys.add(k);
  }
  const m = String(p.deadline || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const deadline = m ? new Date(+m[1], +m[2] - 1, +m[3]) : '';
  const base = {
    code: trimStr_(p.code).toUpperCase(), number: parseInt(num, 10), name: trimStr_(p.name), assignee: trimStr_(p.assignee),
    link: trimStr_(p.link), deadline, order: trimStr_(p.order), memo: trimStr_(p.memo), toInterp: trimStr_(p.toInterp),
  };
  return { rows: views.map(v => Object.assign({}, base, { cut: trimStr_(v.cut).toUpperCase(), pattern: normPattern_(v.pattern), request: trimStr_(v.request), extName: trimStr_(v.extName), no: trimStr_(v.no) })) };
}
/** 入力画面から呼ぶ：登録して { ok, msg, nos } を返す（名前が _ で終わる関数は google.script.run から呼べない） */
function submitEntryForm(p) {
  const res = entryFormRows_(p);
  if (res.error) return { ok: false, msg: res.error };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, msg: 'ほかの処理（15分ごとの自動実行など）が動いています。少し待ってから、もう一度「登録」を押してください' };
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const list = ensureRegSheet_(ss, null);
    const rc = regHeaderMap_(list);
    const at = insertRegRows_(list, rc, res.rows);
    const r = syncRegistrations_(new Date());
    const nos = at.map(row => trimStr_(list.getRange(row, rc.no).getValue()));
    return { ok: true, nos, msg: '登録しました：' + nos.join('・') + '（' + joinCode_(res.rows[0].code, res.rows[0].number) + '）。『登録一覧』とエンジニア入力シートに載りました' + (r && r.msg ? '\n' + r.msg : '') };
  } finally {
    lock.releaseLock();
  }
}
/**
 * 「登録Noで直す」から呼ぶ：登録No の付いた視点は『登録一覧』のその行を上書きし、付いていない視点は新しく登録する。
 * そのあと同期して、エンジニア入力シートの行も直す（名前が _ で終わる関数は google.script.run から呼べない）
 */
function updateEntryForm(p) {
  const res = entryFormRows_(p);
  if (res.error) return { ok: false, msg: res.error };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, msg: 'ほかの処理（15分ごとの自動実行など）が動いています。少し待ってから、もう一度「登録」を押してください' };
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const list = ensureRegSheet_(ss, null);
    const rc = regHeaderMap_(list);
    const vals = list.getLastRow() >= 2 ? list.getRange(2, 1, list.getLastRow() - 1, list.getLastColumn()).getValues() : [];
    const rowOf = new Map();
    vals.forEach((v, i) => { const no = trimStr_(v[rc.no - 1]); if (no) rowOf.set(no, i); });
    const missing = res.rows.filter(r => r.no && !rowOf.has(r.no)).map(r => r.no);
    if (missing.length) return { ok: false, msg: '『登録一覧』に無い登録No があります：' + missing.join('・') + '（登録Noを入れ直して呼び出してください）' };
    const keys = (rc.extName ? REG_INPUT.concat(['extName']) : REG_INPUT);
    const fixed = [], moved = [], toApp = [];
    res.rows.filter(r => r.no).forEach(r => {
      const i = rowOf.get(r.no);
      const cur = vals[i];
      const changed = [];
      keys.forEach(k => {
        if (!rc[k]) return;
        if (k === 'toInterp' && trimStr_(r.toInterp) === '') return; // 通訳へのメッセージは空なら前のまま
        const want = r[k] === undefined ? '' : r[k];
        if (!sameCell_(cur[rc[k] - 1], want)) { list.getRange(i + 2, rc[k]).setValue(want); changed.push(k); }
      });
      if (changed.length) fixed.push(r.no);
      if (changed.some(k => ['code', 'number', 'cut', 'pattern'].indexOf(k) >= 0)) moved.push(r.no);
      if (changed.some(k => ['assignee', 'deadline'].indexOf(k) >= 0)) toApp.push(r.no);
    });
    const added = res.rows.filter(r => !r.no);
    const at = added.length ? insertRegRows_(list, rc, added) : [];
    const r = syncRegistrations_(new Date());
    const newNos = at.map(row => trimStr_(list.getRange(row, rc.no).getValue()));
    const lines = [(fixed.length ? '直しました：' + fixed.join('・') : '変わった項目はありませんでした') + (newNos.length ? '／足しました：' + newNos.join('・') : '') +
      '（' + joinCode_(res.rows[0].code, res.rows[0].number) + '）。エンジニア入力シートも直しました'];
    if (r && r.msg) lines.push(r.msg);
    if (moved.length) lines.push('※ ' + moved.join('・') + ' は会社コード・案件番号・視点・パターンを変えました。工程図に登録済みなら、工程図では別の視点として登録されるので、前の視点は工程図で消してください');
    if (toApp.length) lines.push('※ ' + toApp.join('・') + ' の担当者・納期は、工程図に登録済みなら工程図のほうも直してください（登録前ならこのまま使われます）');
    const nos = res.rows.filter(x => x.no).map(x => x.no).concat(newNos);
    return { ok: true, nos, msg: lines.join('\n') };
  } finally {
    lock.releaseLock();
  }
}
/** メニュー：縦型の入力画面を開く */
function openEntryForm() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masters = readMasters_(ss);
  const opts = {
    codes: readCompanyCodes_(ss), cuts: viewCodeOptions_(masters.views), patterns: PATTERN_OPTIONS, requests: REQUEST_OPTIONS,
  };
  const html = HtmlService.createHtmlOutput(entryFormHtml_(opts)).setWidth(480).setHeight(760);
  SpreadsheetApp.getUi().showModalDialog(html, '案件を登録');
}
// 入力画面の中で動くスクリプト（ブラウザ側）。文字列の引用符の書き間違いを防ぐため、テンプレート文字列で書く。
// 中ではバッククォート・ドル記号＋波かっこ・バックスラッシュを使わない（そのまま送るため。HTML の属性は ' で囲む）。古いブラウザでも動く書き方（var・function）にする。
const ENTRY_FORM_SCRIPT = `
var S = { order: [], pats: {} };
function el(id) { return document.getElementById(id); }
function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
function groups() {
  var g = [], m = {};
  for (var i = 0; i < CUTS.length; i++) {
    var c = CUTS[i], k = c.replace(/[0-9]+$/, "");
    if (!m[k]) { m[k] = { k: k, list: [] }; g.push(m[k]); }
    m[k].list.push(c);
  }
  return g;
}
function toggleCut(c) {
  var i = S.order.indexOf(c);
  if (i >= 0) { S.order.splice(i, 1); delete S.pats[c]; } else { S.order.push(c); S.pats[c] = [""]; }
  render();
}
function togglePat(c, p) {
  var a = (S.pats[c] || []).slice();
  if (p === "") { a = [""]; } else {
    a = a.filter(function (x) { return x !== ""; });
    var i = a.indexOf(p);
    if (i >= 0) a.splice(i, 1); else a.push(p);
    if (!a.length) a = [""];
  }
  S.pats[c] = a;
  render();
}
function buildViews(req) {
  var v = [];
  for (var i = 0; i < S.order.length; i++) {
    var c = S.order[i], a = S.pats[c] || [""];
    var ps = [""].concat(PATS).filter(function (p) { return a.indexOf(p) >= 0; });
    for (var j = 0; j < ps.length; j++) v.push({ cut: c, pattern: ps[j], request: req });
  }
  return v;
}
function label(v) { return v.cut + (v.pattern ? "-" + v.pattern : ""); }
function render() {
  var h = "", g = groups();
  for (var i = 0; i < g.length; i++) {
    h += "<div class='g'><span class='gk'>" + esc(g[i].k) + "</span>";
    for (var j = 0; j < g[i].list.length; j++) {
      var c = g[i].list[j];
      h += "<button type='button' class='b" + (S.order.indexOf(c) >= 0 ? " on" : "") + "' data-cut='" + esc(c) + "'>" + esc(c.slice(g[i].k.length) || c) + "</button>";
    }
    h += "</div>";
  }
  el("picker").innerHTML = h || "<div class='n'>『視点マスタ』に視点がありません</div>";
  var ch = "";
  for (var k = 0; k < S.order.length; k++) {
    var cc = S.order[k], a = S.pats[cc] || [""], opts = [""].concat(PATS);
    ch += "<div class='c'><b>" + esc(cc) + "</b><span class='pl'>パターン</span>";
    for (var m = 0; m < opts.length; m++) {
      ch += "<button type='button' class='p" + (a.indexOf(opts[m]) >= 0 ? " on" : "") + "' data-for='" + esc(cc) + "' data-pat='" + esc(opts[m]) + "'>" + (opts[m] ? esc(opts[m]) : "なし") + "</button>";
    }
    ch += "</div>";
  }
  el("chosen").innerHTML = ch;
  var vs = buildViews("");
  el("sum").textContent = vs.length ? "登録する視点：" + vs.map(label).join("・") + "（" + vs.length + "件）" : "視点を選んでください（番号を押すと選ばれ、もう一度押すと外れます）";
}
function show(t, ok) { var m = el("msg"); m.textContent = t; m.className = ok ? "ok" : "ng"; }
function reset() {
  ["number", "name", "link", "deadline", "order", "memo", "toInterp"].forEach(function (id) { el(id).value = ""; });
  S = { order: [], pats: {} };
  render();
}
function submit(b) {
  var p = { code: el("code").value, number: el("number").value, name: el("name").value, assignee: el("assignee").value, link: el("link").value,
    deadline: el("deadline").value, order: el("order").value, memo: el("memo").value, toInterp: el("toInterp").value, views: buildViews(el("req").value) };
  if (!p.views.length) { show("視点を1つ以上選んでください", false); return; }
  b.disabled = true;
  show("登録しています…", true);
  google.script.run.withSuccessHandler(function (r) { b.disabled = false; show(r.msg, r.ok); if (r.ok) reset(); })
    .withFailureHandler(function (e) { b.disabled = false; show((e && e.message) || String(e), false); }).submitEntryForm(p);
}
document.addEventListener("click", function (e) {
  var t = e.target;
  if (!t || !t.getAttribute) return;
  var c = t.getAttribute("data-cut");
  if (c) { toggleCut(c); return; }
  var f = t.getAttribute("data-for");
  if (f) { togglePat(f, t.getAttribute("data-pat") || ""); return; }
  if (t.id === "go") submit(t);
});
render();
`;
/** 入力画面の HTML（純ロジック）。1案件ぶんの視点・パターンをボタンでまとめて選ぶ。ボタンは onclick 属性を使わず、画面全体のクリックで受ける */
function entryFormHtml_(o) {
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const options = (list, blank) => (blank ? '<option value="">' + esc(blank) + '</option>' : '') + list.map(v => '<option value="' + esc(v) + '">' + esc(v) + '</option>').join('');
  const field = (id, label, input, note) => '<div class="f"><label for="' + id + '">' + label + '</label>' + input + (note ? '<div class="n">' + note + '</div>' : '') + '</div>';
  const text = (id, ph) => '<input id="' + id + '" type="text" placeholder="' + esc(ph || '') + '">';
  const req = '<span class="r">必須</span>';
  const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
  return '<!doctype html><html><head><meta charset="utf-8"><style>' +
    'body{font-family:sans-serif;font-size:13px;margin:0;padding:12px 16px;background:#f6f6f6;color:#222}' +
    '.f{margin-bottom:12px}label{display:block;font-weight:bold;margin-bottom:4px}' +
    'input,select,textarea{box-sizing:border-box;width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;font-size:13px;background:#fff}' +
    'textarea{height:56px;resize:vertical}.r{color:#c62828;font-weight:normal;font-size:11px;margin-left:6px}.n{color:#666;font-size:11px;margin-top:3px}' +
    'h3{margin:18px 0 8px;font-size:13px;border-top:1px solid #ddd;padding-top:12px}' +
    '.g{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin-bottom:6px}.gk{flex:0 0 52px;font-weight:bold;color:#555}' +
    '.b,.p{min-width:34px;padding:5px 8px;border:1px solid #bbb;border-radius:4px;background:#fff;cursor:pointer;font-size:13px}' +
    '.b.on,.p.on{background:#1a73e8;border-color:#1a73e8;color:#fff}' +
    '.c{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:6px 8px;margin-bottom:4px;background:#fff;border:1px solid #ddd;border-radius:4px}' +
    '.c b{flex:0 0 52px}.pl{color:#666;font-size:11px;margin-right:4px}' +
    '#sum{margin-top:10px;padding:8px;background:#e8f0fe;border-radius:4px;font-weight:bold}' +
    '.go{width:100%;margin-top:12px;padding:10px;background:#1a73e8;color:#fff;border:none;border-radius:4px;font-size:14px;font-weight:bold;cursor:pointer}.go:disabled{background:#9bbcf0}' +
    '#msg{margin-top:10px;white-space:pre-wrap}.ok{color:#2e7d32}.ng{color:#c62828}' +
    '</style></head><body>' +
    field('code', '会社コード' + req, '<select id="code">' + options(o.codes, '選んでください') + '</select>') +
    field('number', '案件番号' + req, '<input id="number" type="text" inputmode="numeric" placeholder="例 50">') +
    field('name', '社外案件名', text('name', '例 マンション')) +
    field('assignee', '担当者', text('assignee', '工程図の担当者（入力シートには写さない）')) +
    field('link', 'サーバーリンク', text('link', '保存先フォルダのリンク')) +
    field('deadline', '納期', '<input id="deadline" type="date">', '入力シートには写さない（工程図の納期に入る）') +
    field('order', '注文書', text('order', '注文書のファイルのリンクなど')) +
    field('memo', '管理者メモ', '<textarea id="memo"></textarea>', '管理者だけのメモ（入力シートには写さない）') +
    field('toInterp', '通訳へのメッセージ', '<textarea id="toInterp"></textarea>', '入力シートの「管理者からの連絡」に写る') +
    field('req', '新規or修正' + req, '<select id="req">' + options(o.requests) + '</select>', 'この案件の視点すべてに同じものが入る') +
    '<h3>視点' + req + '</h3>' +
    '<div class="n" style="margin:-4px 0 8px">番号を押すと選ばれます（もう一度押すと外れます）。選んだ視点ごとにパターンを押します（複数可。A と B を押すと2行になります）</div>' +
    '<div id="picker"></div><div id="chosen"></div><div id="sum"></div>' +
    '<button type="button" class="go" id="go">この案件を登録</button><div id="msg"></div>' +
    '<script>var CUTS=' + json(o.cuts) + ',PATS=' + json(o.patterns) + ';' + ENTRY_FORM_SCRIPT + '</script></body></html>';
}
// ============ 『案件入力』タブ（シートの中の縦型フォーム。1案件ずつ） ============
// 2026-11-04：メニューを開かなくても使えるよう、縦型の入力フォームをタブにした。
//   ① 視点を選ぶ（日本語の区分ごとに番号のチェックボックス）→ ② 登録する視点（1行ずつ：部屋名・パターン・＋・外す・社外視点名）
//   パターンは視点ごとに「＋」で足す（＋にチェック：パターンなし → A・B、A があれば次の文字）。
//   部屋名（2F など）を書くと、社外視点名の頭に付き（2F外観目線視点①）、エンジニア入力シートの視点は EXE1_2F になる。
//   部屋名に「2F,3F」と書くと、部屋ごとの行に分かれる。
//   「前回の視点を呼び出す」にチェックすると、同じ会社コード・案件番号で前回登録した視点（部屋名・パターン・社外視点名も）が入る。
//   「登録」にチェック → 通訳へのメッセージを書く小さな画面が出る →「登録する」で『登録一覧』とエンジニア入力シートへ。フォームは空に戻る。
const FORM_TITLE = '案件入力（1案件ずつ登録）';
const FORM_FIELDS = ['code', 'number', 'name', 'assignee', 'request', 'link', 'deadline', 'order', 'memo'];
const FORM_L = {
  prev: '前回の視点を呼び出す', edit: '登録Noで直す', pick: '① 視点を選ぶ', sum: '登録する視点', submit: '登録', result: '結果', list: '② 視点',
};
const FORM_COLS = 21; // A＝項目名、B〜U＝入力（視点の番号は 1〜20）
const FORM_KEY_COL = 22; // V（隠し列）：視点コード（EXE・EXE1 など）
const FORM_NO_COL = 23; // W（隠し列）：「登録Noで直す」で呼び出した行の登録No（空＝新しく足す行）
const FORM_EDIT_NOTE = '← 登録No（R0002 など。数字だけでも可）を入れると、その登録（同じ日に登録した同じ案件の視点）を呼び出します。直して「登録」にチェックすると上書きし、エンジニア入力シートも直ります。空にすると新規の登録に戻ります';
const FORM_LIST_ROWS = 40;
// ② の列：A 視点（日本語）、B:D 部屋名、E:F パターン、G ＋、H 外す、I:U 社外視点名、V 視点コード
const FORM_LC = { label: 1, room: 2, pattern: 5, plus: 7, del: 8, ext: 9 };
const FORM_FIELD_NOTES = {
  code: '必須。REN・RIC など', number: '必須。数字だけ（例 50）', assignee: '工程図の担当者（入力シートには写さない）',
  request: '必須。この案件の視点すべてに同じものが入る', deadline: '入力シートには写さない（工程図の納期に入る）',
  memo: '管理者だけのメモ（入力シートには写さない）',
};
/** 視点コード＋部屋名 → 視点（工程図・入力シートで使う名前）：'EXE1', '2F' → 'EXE1_2F' */
function formCut_(code, room) {
  const c = trimStr_(code).toUpperCase(), r = formRoom_(room);
  return r ? c + '_' + r : c;
}
function formRoom_(room) { return trimStr_(room).replace(/\s+/g, '').replace(/_/g, '-').toUpperCase(); }
/** 視点 → { code, room }（'EXE1_2F' → EXE1 と 2F） */
function formSplitCut_(cut) {
  const s = trimStr_(cut).toUpperCase();
  const m = s.match(/^([A-Z]+\d+)(?:_(.+))?$/);
  return m ? { code: m[1], room: m[2] || '' } : { code: s, room: '' };
}
/** 視点コードの日本語（'EXE1' → 外観目線①。区分が無ければコードのまま） */
function formViewLabel_(code, views) {
  const c = trimStr_(code).toUpperCase();
  const v = judgeViewpoint_(c, '', viewsOrDefault_(views));
  return v.category ? v.category + circled_(cutNumber_(c)) : c;
}
/** 社外視点名の自動の値（'EXE1', '2F', 'A' → 2F外観目線視点①_パターンA） */
function formAutoExt_(code, room, pattern, views) {
  const c = trimStr_(code).toUpperCase();
  if (!c) return '';
  const v = judgeViewpoint_(c, '', viewsOrDefault_(views));
  const base = externalViewpointName_(v.external, cutNumber_(c), pattern);
  return base ? formRoom_(room) + base : '';
}
/** 社外視点名が自動の値のままか（部屋名・パターンだけ違うものも自動とみなす。人が書き換えた名前は残す） */
function formIsAutoExt_(ext, code, views) {
  const e = trimStr_(ext).replace(/_パターン[A-Z]+$/, '');
  if (!e) return true;
  const base = formAutoExt_(code, '', '', views);
  return !!base && e.slice(-base.length) === base;
}
/** ② の行をそろえる（純ロジック）：部屋名「2F,3F」を行に分け、自動の社外視点名を付け直し、同じ視点・部屋・パターンの重複を消す */
function formNormalizeRows_(rows, views) {
  const out = [], seen = new Set();
  (rows || []).forEach(r => {
    const rooms = String(r.room || '').split(/[,、，\/／]+/).map(formRoom_);
    const list = rooms.filter(Boolean).length ? rooms.filter(Boolean) : [''];
    list.forEach((room, ri) => {
      const code = trimStr_(r.code).toUpperCase();
      const pattern = normPattern_(r.pattern);
      const key = code + '|' + room + '|' + pattern;
      if (!code || seen.has(key)) return;
      seen.add(key);
      const ext = formIsAutoExt_(r.ext, code, views) ? formAutoExt_(code, room, pattern, views) : trimStr_(r.ext);
      // 登録No（呼び出した行）は、部屋名で分けたときは最初の部屋だけが持つ（ほかは新しく足す行）
      out.push({ code, room, pattern, ext, no: ri === 0 ? trimStr_(r.no) : '' });
    });
  });
  return out;
}
/**
 * ① のチェックから ② の行を作り直す（純ロジック）。チェックが残っている視点の行はそのまま（部屋名・パターン・社外視点名を保つ）、
 * 新しくチェックした視点は1行足し、チェックを外した視点の行は消す。並びは①の順
 */
function formListMerge_(codes, current, views) {
  const out = [];
  codes.forEach(c => {
    const mine = (current || []).filter(r => trimStr_(r.code).toUpperCase() === c);
    if (mine.length) mine.forEach(r => out.push(r));
    else out.push({ code: c, room: '', pattern: '', ext: '' });
  });
  return formNormalizeRows_(out, views);
}
/** 「＋」：その視点（同じ部屋）にパターンを1つ足す（純ロジック）。パターンなしなら A・B にする */
function formAddPattern_(rows, i) {
  const r = rows[i];
  const same = rows.filter(x => x.code === r.code && x.room === r.room);
  const used = same.map(x => x.pattern).filter(Boolean);
  const nextFree = () => PATTERN_OPTIONS.find(p => used.indexOf(p) < 0);
  if (!r.pattern) { const p = nextFree(); if (!p) return rows; r.pattern = p; used.push(p); }
  const p = nextFree();
  if (!p) return rows;
  let last = i;
  rows.forEach((x, j) => { if (x.code === r.code && x.room === r.room) last = j; });
  rows.splice(last + 1, 0, { code: r.code, room: r.room, pattern: p, ext: '' });
  return rows;
}
/** 『案件入力』タブの各行の場所を A列（項目名）と V列（視点コード）から探す */
function formMap_(sheet) {
  const n = Math.min(sheet.getMaxRows(), 300);
  const width = Math.min(sheet.getMaxColumns(), FORM_NO_COL);
  const vals = sheet.getRange(1, 1, n, width).getValues();
  const a = vals.map(r => trimStr_(r[0]));
  const key = vals.map(r => trimStr_(r[FORM_KEY_COL - 1]));
  const at = (label) => a.indexOf(label) + 1;
  const m = { fields: {}, grid: [] };
  FORM_FIELDS.forEach(k => { m.fields[k] = at(REG_H[k]); });
  Object.keys(FORM_L).forEach(k => { m[k] = at(FORM_L[k]); });
  m.width = width;
  if (!m.pick || !m.sum || !m.list || !m.submit || width < FORM_KEY_COL) throw new Error('『' + SHEET.FORM + '』タブの形が崩れています。メニュー「『案件入力』タブを作り直す」を実行してください');
  for (let r = m.pick + 1; r < m.sum; r++) if (key[r - 1]) m.grid.push({ row: r, keyword: key[r - 1] });
  m.list1 = m.list + 1;
  m.list2 = Math.min(m.list + FORM_LIST_ROWS, n);
  return m;
}
/** 『案件入力』タブを作る。rebuild なら中身を消して作り直す（視点マスタを変えたとき） */
function ensureFormSheet_(ss, masters, rebuild) {
  let sheet = ss.getSheetByName(SHEET.FORM);
  if (sheet && !rebuild && trimStr_(sheet.getRange(1, 1).getValue()) === FORM_TITLE) { formEnsureEditRow_(sheet); return sheet; }
  if (!sheet) sheet = ss.insertSheet(SHEET.FORM, 0);
  const views = viewsOrDefault_(masters.views);
  const keywords = viewKeywords_(masters.views);
  const total = 2 + FORM_FIELDS.length + 2 + 1 + keywords.length + 1 + 3 + 1 + 1 + FORM_LIST_ROWS;
  ensureSize_(sheet, total, FORM_NO_COL);
  const all = sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns());
  all.breakApart(); all.clearDataValidations(); sheet.clear();
  const dv = () => SpreadsheetApp.newDataValidation();
  const box = () => dv().requireCheckbox().build();
  const list = (values, allowInvalid) => dv().requireValueInList(values, true).setAllowInvalid(allowInvalid).build();
  const span = (r, c1, c2) => sheet.getRange(r, c1, 1, c2 - c1 + 1).merge();
  const wide = (r, c) => span(r, c, FORM_COLS);
  const label = (r, text, bg) => sheet.getRange(r, 1).setValue(text).setFontWeight('bold').setBackground(bg || '#f3f3f3');
  sheet.setColumnWidth(1, 150);
  for (let c = 2; c <= FORM_COLS; c++) sheet.setColumnWidth(c, 34);
  sheet.getRange(1, 1).setValue(FORM_TITLE).setFontWeight('bold').setFontSize(14);
  sheet.getRange(2, 1).setValue('上から書いて、①で視点の番号にチェック。②で視点ごとに部屋名・パターン（＋で足す）を直し、最後に「登録」にチェック（通訳へのメッセージはそのとき書きます）。')
    .setFontColor('#666666');
  wide(2, 1);
  let r = 3;
  FORM_FIELDS.forEach(k => {
    label(r, REG_H[k], '#fff2cc');
    wide(r, 2);
    if (FORM_FIELD_NOTES[k]) sheet.getRange(r, 1).setNote(FORM_FIELD_NOTES[k]);
    r++;
  });
  const F = (k) => 3 + FORM_FIELDS.indexOf(k);
  const codes = readCompanyCodes_(ss);
  if (codes && codes.length) sheet.getRange(F('code'), 2).setDataValidation(list(codes, true));
  sheet.getRange(F('number'), 2).setDataValidation(dv().requireNumberBetween(1, 99999).setAllowInvalid(false).build());
  sheet.getRange(F('request'), 2).setDataValidation(list(REQUEST_OPTIONS, false)).setValue(REQUEST_OPTIONS[0]);
  sheet.getRange(F('deadline'), 2).setNumberFormat('yyyy-mm-dd');
  label(r, FORM_L.prev);
  sheet.getRange(r, 2).setDataValidation(box()).setValue(false);
  sheet.getRange(r, 3).setValue('← チェックすると、同じ会社コード・案件番号で前回登録した視点（部屋名・パターン・社外視点名も）が入り、新規or修正は「修正」になる').setFontColor('#666666');
  wide(r, 3);
  r++;
  label(r, FORM_L.edit, '#fce5cd');
  sheet.getRange(r, 3).setValue(FORM_EDIT_NOTE).setFontColor('#666666');
  wide(r, 3);
  r++;
  // ① 視点を選ぶ：見出しの行に番号、区分（日本語）ごとにチェックボックス。V列に視点コード（隠し列）
  label(r, FORM_L.pick, '#d9ead3');
  const nums = []; for (let i = 1; i < FORM_COLS; i++) nums.push(i);
  sheet.getRange(r, 2, 1, FORM_COLS - 1).setValues([nums]).setFontWeight('bold').setHorizontalAlignment('center').setBackground('#d9ead3');
  sheet.getRange(r, 1).setNote('番号にチェックすると②に1行できる。外すと②の行も消える');
  r++;
  keywords.forEach(k => {
    const v = views.find(x => x.keyword === k) || {};
    label(r, v.category || k);
    sheet.getRange(r, FORM_KEY_COL).setValue(k);
    const n = Math.min(VIEW_OPTION_COUNT[k] || VIEW_OPTION_COUNT_DEFAULT, FORM_COLS - 1);
    sheet.getRange(r, 2, 1, n).setDataValidation(box()).setValues([new Array(n).fill(false)]);
    if (n < FORM_COLS - 1) sheet.getRange(r, n + 2, 1, FORM_COLS - 1 - n).setBackground('#eeeeee');
    r++;
  });
  r++;
  const sumRow = r, submitRow = r + 1, resultRow = r + 2, listRow = r + 4;
  label(sumRow, FORM_L.sum, '#cfe2f3');
  wide(sumRow, 2);
  sheet.getRange(sumRow, 2).setValue('（①で視点を選ぶと、ここに出ます）').setFontWeight('bold');
  label(submitRow, FORM_L.submit, '#cfe2f3');
  sheet.getRange(submitRow, 2).setDataValidation(box()).setValue(false);
  sheet.getRange(submitRow, 3).setValue('← 確かめたらチェック。通訳へのメッセージを書く画面が出て、「登録する」で『登録一覧』とエンジニア入力シートに載る').setFontColor('#666666');
  wide(submitRow, 3);
  label(resultRow, FORM_L.result);
  wide(resultRow, 2);
  sheet.getRange(resultRow, 2).setWrap(true);
  // ② 視点（1行ずつ）
  label(listRow, FORM_L.list, '#d9ead3');
  const head = (c, t) => sheet.getRange(listRow, c).setValue(t).setFontWeight('bold').setBackground('#d9ead3');
  head(FORM_LC.room, '部屋名'); span(listRow, FORM_LC.room, FORM_LC.pattern - 1);
  head(FORM_LC.pattern, 'パターン'); span(listRow, FORM_LC.pattern, FORM_LC.plus - 1);
  head(FORM_LC.plus, '＋'); head(FORM_LC.del, '外す');
  head(FORM_LC.ext, '社外視点名（自動。お客様の呼び方が違うときだけ書き換える）'); wide(listRow, FORM_LC.ext);
  sheet.getRange(listRow, 1).setNote('①から自動でできる。部屋名（2F など）は社外視点名の頭に付き、入力シートの視点は EXE1_2F になる。「2F,3F」と書くと部屋ごとの行に分かれる。' +
    '＋にチェックでその視点にパターンを足す（なし → A・B）。外すにチェックでその行を消す');
  sheet.getRange(listRow, FORM_LC.plus).setNote('チェックすると、その視点（同じ部屋）にパターンを1つ足す。パターンなしなら A と B の2行になる');
  for (let i = listRow + 1; i <= listRow + FORM_LIST_ROWS; i++) {
    span(i, FORM_LC.room, FORM_LC.pattern - 1);
    span(i, FORM_LC.pattern, FORM_LC.plus - 1);
    wide(i, FORM_LC.ext);
  }
  sheet.getRange(listRow + 1, FORM_LC.pattern, FORM_LIST_ROWS, 1).setDataValidation(list(PATTERN_OPTIONS, true));
  sheet.getRange(1, FORM_KEY_COL).setValue('視点コード（隠し列）');
  sheet.hideColumns(FORM_KEY_COL);
  sheet.getRange(1, FORM_NO_COL).setValue('登録No（隠し列）');
  sheet.hideColumns(FORM_NO_COL);
  return sheet;
}
/**
 * 前の版の『案件入力』に「登録Noで直す」の行と登録No の隠し列を足す（作り直さずに。書きかけの内容は消さない）。
 * 「前回の視点を呼び出す」のすぐ下の空いた行を使う
 */
function formEnsureEditRow_(sheet) {
  const n = Math.min(sheet.getMaxRows(), 300);
  const a = sheet.getRange(1, 1, n, 1).getValues().map(r => trimStr_(r[0]));
  if (sheet.getMaxColumns() < FORM_NO_COL) {
    ensureSize_(sheet, sheet.getMaxRows(), FORM_NO_COL);
    sheet.getRange(1, FORM_NO_COL).setValue('登録No（隠し列）');
    sheet.hideColumns(FORM_NO_COL);
  }
  if (a.indexOf(FORM_L.edit) >= 0) return;
  const prev = a.indexOf(FORM_L.prev) + 1;
  if (!prev || a[prev] !== '') return; // 空いた行が無い形は「作り直す」で直す
  sheet.getRange(prev + 1, 1).setValue(FORM_L.edit).setFontWeight('bold').setBackground('#fce5cd');
  sheet.getRange(prev + 1, 3).setValue(FORM_EDIT_NOTE).setFontColor('#666666');
}
/** 『案件入力』の項目・①・② を読む */
function formRead_(sheet, m) {
  const w = m.width || FORM_KEY_COL;
  const top = sheet.getRange(1, 1, m.list2, w).getValues();
  const cell = (r, c) => (c <= w ? top[r - 1][c - 1] : '');
  const fields = {};
  FORM_FIELDS.forEach(k => { fields[k] = m.fields[k] ? cell(m.fields[k], 2) : ''; });
  const edit = m.edit ? trimStr_(cell(m.edit, 2)) : '';
  const codes = [];
  m.grid.forEach(g => { for (let c = 2; c <= FORM_COLS; c++) if (isChecked_(cell(g.row, c))) codes.push(g.keyword + (c - 1)); });
  const rows = [];
  for (let r = m.list1; r <= m.list2; r++) {
    const code = trimStr_(cell(r, FORM_KEY_COL)).toUpperCase();
    if (!code) continue;
    rows.push({ code, room: trimStr_(cell(r, FORM_LC.room)), pattern: normPattern_(cell(r, FORM_LC.pattern)), ext: trimStr_(cell(r, FORM_LC.ext)),
      plus: isChecked_(cell(r, FORM_LC.plus)), del: isChecked_(cell(r, FORM_LC.del)), no: trimStr_(cell(r, FORM_NO_COL)) });
  }
  return { fields, codes, rows, edit };
}
/** ② の表示用の名前（2F 外観目線①-A） */
function formRowLabel_(r, views) {
  return (r.room ? r.room + ' ' : '') + formViewLabel_(r.code, views) + (r.pattern ? '-' + r.pattern : '');
}
function formWriteList_(sheet, m, rows, views) {
  const n = m.list2 - m.list1 + 1;
  const out = [], keys = [], nos = [];
  for (let i = 0; i < n; i++) {
    const v = rows[i];
    const line = new Array(FORM_COLS).fill('');
    if (v) {
      line[FORM_LC.label - 1] = formViewLabel_(v.code, views);
      line[FORM_LC.room - 1] = v.room;
      line[FORM_LC.pattern - 1] = v.pattern;
      line[FORM_LC.plus - 1] = false;
      line[FORM_LC.del - 1] = false;
      line[FORM_LC.ext - 1] = v.ext;
    }
    out.push(line);
    keys.push([v ? v.code : '']);
    nos.push([v ? (v.no || '') : '']);
  }
  const k = Math.min(rows.length, n);
  const boxes = sheet.getRange(m.list1, FORM_LC.plus, n, 2);
  boxes.clearDataValidations();
  if (k) sheet.getRange(m.list1, FORM_LC.plus, k, 2).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  sheet.getRange(m.list1, 1, n, FORM_COLS).setValues(out);
  sheet.getRange(m.list1, FORM_KEY_COL, n, 1).setValues(keys);
  if ((m.width || 0) >= FORM_NO_COL) sheet.getRange(m.list1, FORM_NO_COL, n, 1).setValues(nos);
  const fixing = rows.some(r => r.no);
  sheet.getRange(m.sum, 2).setValue(rows.length
    ? rows.map(r => formRowLabel_(r, views) + (fixing ? (r.no ? '〔' + r.no + '〕' : '〔追加〕') : '')).join('・') + '（' + rows.length + '件）' + (fixing ? '　※〔登録No〕は上書き・〔追加〕は新しく登録' : '')
    : '（①で視点を選ぶと、ここに出ます）');
}
function formSetGrid_(sheet, m, codes) {
  const want = new Set((codes || []).map(c => trimStr_(c).toUpperCase()));
  m.grid.forEach(g => {
    const n = Math.min(VIEW_OPTION_COUNT[g.keyword] || VIEW_OPTION_COUNT_DEFAULT, FORM_COLS - 1);
    const vals = []; for (let i = 1; i <= n; i++) vals.push(want.has(g.keyword + i));
    sheet.getRange(g.row, 2, 1, n).setValues([vals]);
  });
}
function formResult_(sheet, m, msg) { if (m.result) sheet.getRange(m.result, 2).setValue(msg); }
/** フォームを空に戻す（会社コードも消す。新規or修正は「新規」に） */
function formClear_(sheet, m, views) {
  FORM_FIELDS.forEach(k => { if (m.fields[k]) sheet.getRange(m.fields[k], 2).setValue(k === 'request' ? REQUEST_OPTIONS[0] : ''); });
  if (m.edit) sheet.getRange(m.edit, 2).setValue('');
  formSetGrid_(sheet, m, []);
  formWriteList_(sheet, m, [], views);
}
/** 前回の視点（純ロジック）：『登録一覧』の行 [{code, number, cut, pattern, extName, regDate, name, link, assignee}] から、同じ案件のいちばん新しい登録日の行 */
function formPrevious_(regRows, code, number) {
  const key = normCode_(joinCode_(code, number));
  const mine = (regRows || []).filter(r => trimStr_(r.cut) && normCode_(joinCode_(r.code, r.number)) === key);
  if (!mine.length) return null;
  let best = '';
  mine.forEach(r => { const g = regGroupKey_(r); if (g > best) best = g; });
  const rows = mine.filter(r => regGroupKey_(r) === best);
  return { rows, date: best.split('::')[1] || '' };
}
function formLoadPrevious_(ss, sheet, m, views) {
  const f = formRead_(sheet, m).fields;
  sheet.getRange(m.prev, 2).setValue(false);
  if (!trimStr_(f.code) || !trimStr_(f.number)) { formResult_(sheet, m, '前回の視点を呼び出すには、先に会社コードと案件番号を入れてください'); return; }
  const list = ss.getSheetByName(SHEET.REG);
  const regRows = [];
  if (list && list.getLastRow() >= 2) {
    const rc = regHeaderMap_(list);
    list.getRange(2, 1, list.getLastRow() - 1, list.getLastColumn()).getValues().forEach(v => {
      const o = {}; Object.keys(rc).forEach(k => { o[k] = v[rc[k] - 1]; }); regRows.push(o);
    });
  }
  const prev = formPrevious_(regRows, f.code, f.number);
  if (!prev) { formResult_(sheet, m, '前回の登録が見つかりません（' + joinCode_(trimStr_(f.code).toUpperCase(), f.number) + '）。会社コード・案件番号を確かめてください'); return; }
  const rows = formNormalizeRows_(prev.rows.map(r => { const s = formSplitCut_(r.cut); return { code: s.code, room: s.room, pattern: r.pattern, ext: r.extName }; }), views);
  formSetGrid_(sheet, m, rows.map(r => r.code));
  formWriteList_(sheet, m, rows, views);
  sheet.getRange(m.fields.request, 2).setValue(REQUEST_OPTIONS[1]);
  const first = prev.rows[0];
  ['name', 'link', 'assignee'].forEach(k => { if (m.fields[k] && !trimStr_(f[k]) && trimStr_(first[k])) sheet.getRange(m.fields[k], 2).setValue(first[k]); });
  formResult_(sheet, m, '前回（' + prev.date + ' 登録）の視点を入れました：' + rows.map(r => formRowLabel_(r, views)).join('・') + '（' + rows.length + '件）。新規or修正は「修正」にしました');
}
/**
 * 過去に登録した案件の社外案件名・担当者（純ロジック）。『登録一覧』の一番新しい登録を優先し、
 * 無い項目は『連携』の行（下ほど新しい）から探す。見つからない項目は ''
 */
function formKnownProject_(regRows, linkRows, code, number) {
  const key = normCode_(joinCode_(code, number));
  const out = { name: '', assignee: '' };
  if (!trimStr_(code) || !trimStr_(number)) return out;
  const mine = (regRows || []).filter(r => normCode_(joinCode_(r.code, r.number)) === key)
    .map((r, i) => ({ r, i, g: regGroupKey_(r) }))
    .sort((a, b) => (a.g < b.g ? 1 : a.g > b.g ? -1 : b.i - a.i));
  const links = (linkRows || []).filter(r => normCode_(r.code) === key).reverse();
  ['name', 'assignee'].forEach(k => {
    const hit = mine.find(x => trimStr_(x.r[k]));
    if (hit) { out[k] = trimStr_(hit.r[k]); return; }
    const l = links.find(r => trimStr_(r[k]));
    if (l) out[k] = trimStr_(l[k]);
  });
  return out;
}
/** 会社コード・案件番号を入れたとき：過去に登録した案件なら、空の社外案件名・担当者を入れる */
function formFillKnown_(ss, sheet, m) {
  const f = formRead_(sheet, m).fields;
  if (!trimStr_(f.code) || !trimStr_(f.number)) return;
  const empty = ['name', 'assignee'].filter(k => m.fields[k] && !trimStr_(f[k]));
  if (!empty.length) return;
  let linkRows = [];
  const link = ss.getSheetByName(SHEET.LINK);
  if (link && link.getLastRow() >= 2) {
    try {
      const col = headerMap_(link);
      linkRows = link.getRange(2, 1, link.getLastRow() - 1, link.getLastColumn()).getValues()
        .map(v => ({ code: v[col.code - 1], name: v[col.name - 1], assignee: v[col.assignee - 1] }));
    } catch (e) { linkRows = []; }
  }
  const known = formKnownProject_(formRegRows_(ss), linkRows, f.code, f.number);
  const filled = [];
  empty.forEach(k => { if (known[k]) { sheet.getRange(m.fields[k], 2).setValue(known[k]); filled.push(REG_H[k] + '「' + known[k] + '」'); } });
  if (filled.length) formResult_(sheet, m, '過去に登録した案件（' + joinCode_(trimStr_(f.code).toUpperCase(), f.number) + '）なので、' + filled.join('・') + 'を入れました');
}
/** 登録No の書き方をそろえる（'r2'・'2'・'R0002' → 'R0002'）。読めなければ '' */
function normRegNo_(v) {
  const m = trimStr_(v).toUpperCase().match(/^R?\s*0*(\d{1,6})$/);
  return m ? 'R' + ('000' + m[1]).slice(-Math.max(4, m[1].length)) : '';
}
/** 『登録一覧』の行（列名 → 値。row＝シートの行番号） */
function formRegRows_(ss) {
  const list = ss.getSheetByName(SHEET.REG);
  const out = [];
  if (!list || list.getLastRow() < 2) return out;
  const rc = regHeaderMap_(list);
  list.getRange(2, 1, list.getLastRow() - 1, list.getLastColumn()).getValues().forEach((v, i) => {
    const o = { row: i + 2 }; Object.keys(rc).forEach(k => { o[k] = v[rc[k] - 1]; }); out.push(o);
  });
  return out;
}
/** 登録No → その登録（同じ案件・同じ日に登録した行）。純ロジック。見つからなければ null */
function formRegGroup_(regRows, no) {
  const hit = (regRows || []).find(r => trimStr_(r.no) === no);
  if (!hit) return null;
  const g = regGroupKey_(hit);
  const rows = regRows.filter(r => trimStr_(r.no) && trimStr_(r.cut) && regGroupKey_(r) === g);
  return { hit, rows, date: g.split('::')[1] || '' };
}
/** 「登録Noで直す」：その登録をフォームに呼び出す（空にしたら新規に戻す） */
function formLoadByNo_(ss, sheet, m, views) {
  const raw = trimStr_(sheet.getRange(m.edit, 2).getValue());
  if (!raw) {
    const d = formRead_(sheet, m);
    formWriteList_(sheet, m, d.rows.map(r => Object.assign({}, r, { no: '' })), views);
    formResult_(sheet, m, '登録No を消したので、新規の登録に戻しました（②の視点は新しく登録されます）');
    return;
  }
  const no = normRegNo_(raw);
  const g = no ? formRegGroup_(formRegRows_(ss), no) : null;
  if (!g) { formResult_(sheet, m, '✗ 登録No「' + raw + '」が『登録一覧』に見つかりません'); return; }
  sheet.getRange(m.edit, 2).setValue(no);
  const h = g.hit;
  FORM_FIELDS.forEach(k => {
    if (!m.fields[k]) return;
    let v = h[k];
    if (k === 'deadline' && v instanceof Date) v = fmtYMD_(v);
    sheet.getRange(m.fields[k], 2).setValue(v === undefined || v === null ? '' : v);
  });
  const rows = formNormalizeRows_(g.rows.map(r => { const sp = formSplitCut_(r.cut); return { code: sp.code, room: sp.room, pattern: r.pattern, ext: r.extName, no: trimStr_(r.no) }; }), views);
  formSetGrid_(sheet, m, rows.map(r => r.code));
  formWriteList_(sheet, m, rows, views);
  formResult_(sheet, m, no + ' の登録を呼び出しました（' + joinCode_(trimStr_(h.code).toUpperCase(), h.number) + '・' + g.date + ' 登録の ' + rows.length + '件：' + rows.map(r => r.no).join('・') + '）。\n' +
    '直して「登録」にチェックすると上書きし、エンジニア入力シートも直ります。①で足した視点は新しく登録します。外した視点は『登録一覧』に残ります（消すときは『登録一覧』の行を消す）');
}
/** フォームの値 → submitEntryForm に渡す形 */
function formPayload_(d, toInterp) {
  const f = d.fields;
  const deadline = f.deadline instanceof Date ? fmtYMD_(f.deadline) : trimStr_(f.deadline).replace(/\//g, '-');
  return {
    code: f.code, number: f.number, name: f.name, assignee: f.assignee, link: f.link, deadline, order: f.order, memo: f.memo, toInterp: trimStr_(toInterp),
    views: d.rows.map(r => ({ cut: formCut_(r.code, r.room), pattern: r.pattern, request: f.request, extName: r.ext, no: r.no || '' })),
  };
}
/** 「登録」にチェック：足りなければ結果に出す。そろっていれば通訳へのメッセージを書く画面を出す */
function formSubmit_(sheet, m, views) {
  const d = formRead_(sheet, m);
  sheet.getRange(m.submit, 2).setValue(false);
  const check = entryFormRows_(formPayload_(d, ''));
  if (check.error) { formResult_(sheet, m, '✗ ' + check.error); return; }
  formResult_(sheet, m, '通訳へのメッセージの画面で「登録する」を押してください');
  let preview = '';
  try {
    const cfg = readSettings_();
    const now = new Date();
    preview = renderRegMessage_(cfg.interpMessage, check.rows.map(r => Object.assign({}, r, { regDate: now, toInterp: '' })), regMessageOpts_(cfg));
  } catch (e) { preview = ''; }
  const html = HtmlService.createHtmlOutput(formConfirmHtml_({
    preview,
    title: joinCode_(trimStr_(d.fields.code).toUpperCase(), d.fields.number) + (trimStr_(d.fields.name) ? '（' + trimStr_(d.fields.name) + '）' : ''),
    request: trimStr_(d.fields.request), editing: d.rows.some(r => r.no),
    views: d.rows.map(r => (r.no ? '〔' + r.no + ' を上書き〕' : (d.rows.some(x => x.no) ? '〔追加〕' : '')) + formRowLabel_(r, views) + '（' + viewpointNameOf_(formCut_(r.code, r.room), r.pattern) + '）'),
  })).setWidth(480).setHeight(640);
  SpreadsheetApp.getUi().showModalDialog(html, d.rows.some(r => r.no) ? '登録の修正の確認' : '登録の確認');
}
/** 確認画面から呼ぶ：通訳へのメッセージを付けて登録する（名前が _ で終わる関数は google.script.run から呼べない） */
function submitFormSheet(toInterp) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET.FORM);
  const m = formMap_(sheet);
  const views = readMasters_(ss).views;
  const payload = formPayload_(formRead_(sheet, m), toInterp);
  const res = payload.views.some(v => v.no) ? updateEntryForm(payload) : submitEntryForm(payload);
  if (res.ok) {
    formClear_(sheet, m, views);
    // 『登録一覧』に入った通訳向け連絡文（確認画面でそのままコピーできるように返す）
    try {
      const list = ss.getSheetByName(SHEET.REG);
      const rc = regHeaderMap_(list);
      const vals = list.getRange(2, 1, list.getLastRow() - 1, list.getLastColumn()).getValues();
      const hit = vals.find(v => trimStr_(v[rc.no - 1]) === res.nos[0]);
      res.interp = hit ? String(hit[rc.interpMessage - 1] || '') : '';
    } catch (e) { res.interp = ''; }
  }
  formResult_(sheet, m, (res.ok ? '✓ ' : '✗ ') + res.msg);
  return res;
}
// 確認画面の中で動くスクリプト。中ではバッククォート・ドル記号＋波かっこ・バックスラッシュを使わない
const FORM_CONFIRM_SCRIPT = `
function el(id) { return document.getElementById(id); }
var NL = String.fromCharCode(10);
var BASE = el("preview").value;
function refresh() { var t = el("toInterp").value.trim(); el("preview").value = t ? BASE + NL + t : BASE; }
el("toInterp").addEventListener("input", refresh);
el("cancel").addEventListener("click", function () { google.script.host.close(); });
el("go").addEventListener("click", function () {
  var b = el("go");
  b.disabled = true; el("cancel").disabled = true;
  el("msg").className = ""; el("msg").textContent = "登録しています…";
  google.script.run.withSuccessHandler(function (r) {
    el("msg").className = r.ok ? "ok" : "ng"; el("msg").textContent = r.msg;
    if (r.ok) {
      b.style.display = "none"; el("toInterp").disabled = true;
      el("cancel").textContent = "閉じる"; el("cancel").disabled = false;
      var p = el("preview");
      if (r.interp) p.value = r.interp;
      p.focus(); p.select();
      var copied = false;
      try { copied = document.execCommand("copy"); } catch (e) { copied = false; }
      el("msg").textContent = r.msg + (copied ? NL + "通訳への連絡文をコピーしました。" : NL + "通訳への連絡文を選んであるので、⌘C（Windows は Ctrl+C）でコピーできます。");
    } else { b.disabled = false; el("cancel").disabled = false; }
  }).withFailureHandler(function (e) {
    el("msg").className = "ng"; el("msg").textContent = (e && e.message) || String(e); b.disabled = false; el("cancel").disabled = false;
  }).submitFormSheet(el("toInterp").value);
});
el("toInterp").focus();
`;
/** 確認画面の HTML（純ロジック） */
function formConfirmHtml_(o) {
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return '<!doctype html><html><head><meta charset="utf-8"><style>' +
    'body{font-family:sans-serif;font-size:13px;margin:0;padding:12px 16px;color:#222}' +
    'h4{margin:0 0 6px;font-size:14px}ul{margin:4px 0 12px;padding-left:18px;max-height:130px;overflow:auto}' +
    'label{display:block;font-weight:bold;margin-bottom:4px}textarea{box-sizing:border-box;width:100%;height:72px;padding:8px;border:1px solid #ccc;border-radius:4px;font-size:13px}.pv{height:150px;background:#f6f6f6;font-size:12px}' +
    '.n{color:#666;font-size:11px;margin-top:3px}.btns{display:flex;gap:8px;margin-top:14px}' +
    'button{flex:1;padding:10px;border-radius:4px;font-size:14px;cursor:pointer;border:1px solid #ccc;background:#fff}#go{background:#1a73e8;color:#fff;border:none;font-weight:bold}button:disabled{opacity:.6}' +
    '#msg{margin-top:10px;white-space:pre-wrap}.ok{color:#2e7d32}.ng{color:#c62828}' +
    '</style></head><body>' +
    '<h4>' + (o.editing ? '【修正】' : '') + esc(o.title) + '（' + esc(o.request) + '）</h4>' +
    (o.editing ? '<div class="n" style="margin-bottom:6px">登録No の付いた視点は上書きし、エンジニア入力シートも直します。通訳へのメッセージは空なら前のまま</div>' : '') +
    '<div>' + (o.editing ? '直す視点' : '登録する視点') + '（' + o.views.length + '件）</div><ul>' + o.views.map(v => '<li>' + esc(v) + '</li>').join('') + '</ul>' +
    '<label for="toInterp">通訳へのメッセージ（追加で伝えること）</label><textarea id="toInterp" placeholder="翻訳してほしい点・注意点など（無ければ空のまま）"></textarea>' +
    '<div class="n">入力シートの「管理者からの連絡」に写り、下の連絡文の最後にも入ります</div>' +
    '<label for="preview" style="margin-top:12px">通訳への連絡文（登録するとコピーできます）</label><textarea id="preview" class="pv" readonly>' + esc(o.preview || '') + '</textarea>' +
    '<div class="n">ひな形は『設定』の「通訳向けの連絡文」。制作時間の計算の期限は、登録の時刻＋1時間30分（12〜13時と17時以降は数えない）</div>' +
    '<div class="btns"><button type="button" id="cancel">やめる</button><button type="button" id="go">' + (o.editing ? '上書きする' : '登録する') + '</button></div><div id="msg"></div>' +
    '<script>' + FORM_CONFIRM_SCRIPT + '</script></body></html>';
}
/** 『案件入力』タブを編集したとき（onAdminEdit から） */
function onFormEdit_(ss, sheet, range) {
  // 前の版のタブ（「登録Noで直す」の行・登録No の隠し列が無い）は、ここで足す（列が無いと上書きのつもりが新規になるため）
  if (sheet.getMaxColumns() < FORM_NO_COL) formEnsureEditRow_(sheet);
  const m = formMap_(sheet);
  if (!m.edit) { formEnsureEditRow_(sheet); Object.assign(m, formMap_(sheet)); }
  const r1 = range.getRow(), r2 = range.getLastRow();
  const hit = (row) => row && r1 <= row && row <= r2;
  const views = readMasters_(ss).views;
  if (hit(m.submit) && isChecked_(sheet.getRange(m.submit, 2).getValue())) { formSubmit_(sheet, m, views); return; }
  if (hit(m.prev) && isChecked_(sheet.getRange(m.prev, 2).getValue())) { formLoadPrevious_(ss, sheet, m, views); return; }
  if (m.edit && hit(m.edit) && range.getColumn() <= 2 && range.getLastColumn() >= 2) { formLoadByNo_(ss, sheet, m, views); return; }
  if ((hit(m.fields.code) || hit(m.fields.number)) && range.getColumn() <= 2 && range.getLastColumn() >= 2) { formFillKnown_(ss, sheet, m); return; }
  if (m.grid.some(g => hit(g.row))) {
    const d = formRead_(sheet, m);
    formWriteList_(sheet, m, formListMerge_(d.codes, d.rows, views), views);
    return;
  }
  if (r2 >= m.list1 && r1 <= m.list2) {
    // ② を直したとき：外す・＋ を反映し、部屋名を分け、社外視点名を付け直す。①のチェックもそろえる
    const d = formRead_(sheet, m);
    let rows = d.rows.filter(r => !r.del);
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].plus) { rows[i].plus = false; rows = formAddPattern_(rows, i); }
    }
    rows = formNormalizeRows_(rows, views);
    formWriteList_(sheet, m, rows, views);
    formSetGrid_(sheet, m, rows.map(r => r.code));
  }
}
/** メニュー：『案件入力』タブを作り直す（視点マスタを変えたとき。書きかけの内容は消える） */
function rebuildFormSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureFormSheet_(ss, readMasters_(ss), true);
  toastOrLog_('『' + SHEET.FORM + '』タブを作り直しました');
}
function regHeaderMap_(sheet) {
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(v => trimStr_(v));
  const col = {};
  Object.keys(REG_H).forEach(k => { const i = headers.indexOf(REG_H[k]); if (i >= 0) col[k] = i + 1; });
  const missing = Object.keys(REG_H).filter(k => !col[k] && REG_OPTIONAL.indexOf(k) < 0);
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
 * 制作時間の計算の期限（純ロジック）＝ 連絡文の {計算期限} と同じ：登録日時＋calcMinutes 分（calcHours の時間帯だけ数える）。
 * 登録日時が無い行は、翻訳済みの日時＋notifyFirst 時間。どちらも無ければ null
 */
function calcDeadlineOf_(r, cfg) {
  const reg = parseDateTime_(r.regDate);
  if (reg) {
    const mins = cfg.calcMinutes != null && isFinite(cfg.calcMinutes) ? cfg.calcMinutes : 90;
    return cfg.calcHours ? addWorkMinutes_(reg, mins, cfg.calcHours) : new Date(reg.getTime() + mins * 60000);
  }
  const tr = parseDateTime_(r.translatedAt);
  return tr ? new Date(tr.getTime() + (cfg.notifyFirst || 2) * 3600000) : null;
}
/**
 * 催促する行か（純ロジック）。翻訳待ち・時間計算待ちのまま、連絡文の期限（calcDeadlineOf_）を過ぎ、
 * まだ催促していない／前の催促から repeat 時間たった（5分の余裕）行。
 */
function isReminderDue_(r, now, cfg) {
  if (r.state !== REG_STATE.ESTIMATE && r.state !== REG_STATE.TRANSLATE) return false;
  const due = calcDeadlineOf_(r, cfg);
  if (!due || now.getTime() < due.getTime()) return false;
  const last = parseDateTime_(r.notifiedAt);
  const tr = parseDateTime_(r.translatedAt);
  if (!last || last.getTime() < due.getTime()) return true;
  if (tr && last.getTime() < tr.getTime()) return true; // 翻訳済みを付け直したら数え直す
  return now.getTime() - last.getTime() >= cfg.notifyRepeat * 3600000 - 5 * 60000;
}
/** 催促のメッセージ（日本語・ベトナム語）。items: [{ label, due（期限の文字）, waiting（翻訳待ちなら true） }] */
function reminderMessage_(items, cfg) {
  const lines = ['⏰ 制作時間の計算の期限を過ぎています / Đã quá hạn nhập số giờ dự kiến (White / Color / pts)'];
  items.forEach(it => lines.push('・' + it.label + ' … 期限 ' + it.due + ' / hạn ' + it.due + (it.waiting ? '（まだ翻訳待ち / chưa dịch xong）' : '')));
  if (cfg && cfg.fileId) lines.push('入力先 / Nhập tại: https://docs.google.com/spreadsheets/d/' + cfg.fileId + '/edit');
  return lines.join('\n');
}
function regLabel_(r) {
  const req = String(r.request || '').indexOf('修正') === 0 ? '修正' : '新規';
  return [joinCode_(r.code, r.number), trimStr_(r.name), viewpointNameOf_(r.cut, r.pattern)].filter(Boolean).join(' ') +
    '（' + req + '）' + (trimStr_(r.assignee) ? ' 担当 ' + trimStr_(r.assignee) : '');
}
function nextRegNo_(rows, col, extraNos) {
  let max = 0;
  rows.forEach(r => { const m = String(r[col.no - 1] || '').match(/(\d+)/); if (m) max = Math.max(max, parseInt(m[1], 10)); });
  (extraNos || []).forEach(no => { const m = String(no || '').match(/(\d+)/); if (m) max = Math.max(max, parseInt(m[1], 10)); }); // 削除済みの番号も使い回さない
  return function () { max++; return 'R' + ('000' + max).slice(-4); };
}

/**
 * 『案件登録』⇄ エンジニア入力シート の同期と、時間計算の催促。
 * 戻り値: { msg, copied, updated, estimate, reminded, missing }
 */
/** 納品名（純ロジック）：社外案件名_社外視点名_YYMMDD（YYMMDD はエンジニアが納品の日に書き換える）。空の部分は飛ばす */
function deliveryNameOf_(row, views) {
  const cut = formSplitCut_(row.cut);
  const ext = trimStr_(row.extName) || formAutoExt_(cut.code, cut.room, row.pattern, views);
  return [trimStr_(row.name), ext, 'YYMMDD'].filter(Boolean).join('_');
}
function syncRegistrations_(now) {
  const cfg = readSettings_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reg = ss.getSheetByName(SHEET.REG);
  if (!reg) return { msg: '案件登録なし', copied: 0, updated: 0, estimate: 0, reminded: 0, missing: 0 };
  const rc = regHeaderMap_(reg);
  const intake = intakeEntries_(ss, reg, rc);
  if (reg.getLastRow() < 2) return { msg: intake.rejected ? '登録できない行 ' + intake.rejected + '件（足りない項目あり）' : '案件登録なし', copied: 0, updated: 0, estimate: 0, reminded: 0, missing: 0 };
  const data = reg.getDataRange().getValues();

  const staffFile = SpreadsheetApp.openById(cfg.fileId);
  const staff = staffFile.getSheetByName(cfg.tabName);
  if (!staff) throw new Error('エンジニア入力シートにタブ「' + cfg.tabName + '」が見つかりません');
  // 入力前・制作中・制作済みの3つのタブ（古い順に数えて n回目 を決める）。登録No はどのタブにあっても探す。新しい行は入力前へ
  const tabs = staffTabNames_(cfg).map(name => staffFile.getSheetByName(name)).filter(Boolean).map(sheet => {
    const hr = findStaffHeaderRow_(sheet);
    if (hr < 0) throw new Error('エンジニア入力シート『' + sheet.getName() + '』に見出しの行が見つかりません');
    const tsc = ensureStaffExtraColumns_(sheet, hr);
    const w = Math.max.apply(null, Object.keys(tsc).map(k => tsc[k]));
    const last = sheet.getLastRow();
    return { sheet, hr, sc: tsc, width: w, vals: last > hr ? sheet.getRange(hr + 1, 1, last - hr, w).getValues() : [] };
  });
  const before = tabs.find(t => t.sheet.getName() === staff.getName());
  const hr = before.hr;
  const sc = before.sc;
  const width = before.width;
  const byNo = new Map();
  const keyByNo = new Map(); // 登録No → 取込キー（『連携』の行・工程図の externalId の先頭と同じ）
  const counts = new Map();
  let lastData = hr; // 入力前タブで最後に中身がある行（プルダウンだけの行は数えない）
  tabs.forEach(t => {
    const tsc = t.sc;
    t.vals.forEach((v, i) => {
      const no = tsc.regNo ? trimStr_(v[tsc.regNo - 1]) : '';
      if (no) byNo.set(no, { sheet: t.sheet, sc: tsc, row: t.hr + 1 + i, v });
      const code = joinCode_(v[tsc.code - 1], tsc.number ? v[tsc.number - 1] : '');
      const cut = trimStr_(v[tsc.cut - 1]);
      if (code && cut) {
        const base = normCode_(code) + '::' + normCut_(viewpointNameOf_(cut, tsc.pattern ? v[tsc.pattern - 1] : ''));
        const n = (counts.get(base) || 0) + 1;
        counts.set(base, n);
        if (no) keyByNo.set(no, base + '::' + n);
      }
      if (t === before && ['code', 'number', 'cut', 'white', 'regNo'].some(k => tsc[k] && trimStr_(v[tsc[k] - 1]) !== '')) lastData = t.hr + 1 + i;
    });
  });
  const views = readMasters_(ss).views;

  const next = nextRegNo_(data.slice(1), rc, trashNos_(ss));
  const regUpdates = []; // { row, col, value }
  const staffUpdates = [];
  const appends = [];
  const due = [];
  let copied = 0, updated = 0, estimate = 0, missing = 0;
  const delReqs = []; // 新しく届いた削除依頼（Discord で知らせる）
  const setReg = (r, k, value) => { if (!rc[k]) return; if (!sameCell_(data[r][rc[k] - 1], value)) { regUpdates.push({ row: r + 1, col: rc[k], value }); data[r][rc[k] - 1] = value; } };

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
    let ssc = sc; // その行があるタブの列の対応
    if (!no) {
      no = next();
      setReg(r, 'no', no);
      setReg(r, 'copiedAt', now);
      setReg(r, 'regDate', now); // 登録日時＝入力シートへ写した（登録Noが付いた）日時
      const arr = new Array(width).fill('');
      REG_COPY.forEach(k => { if (sc[k]) arr[sc[k] - 1] = k === 'pattern' ? normPattern_(row[k]) : (k === 'number' ? row[k] : trimStr_(row[k])); });
      arr[sc.regNo - 1] = no;
      if (sc.delivery) arr[sc.delivery - 1] = deliveryNameOf_(row, views);
      // 管理者が『登録一覧』に時間を書いていれば、入力シートにも入れる（White は White躯体へ）
      regHoursCols_(sc).forEach(x => { const h = toHours_(row[x.k]); if (h > 0) arr[x.c - 1] = h; });
      appends.push(arr);
      srow = arr;
      copied++;
    } else if (byNo.has(no)) {
      const hit = byNo.get(no);
      srow = hit.v;
      ssc = hit.sc;
      let changed = false;
      REG_COPY.forEach(k => {
        if (!ssc[k]) return;
        const want = k === 'pattern' ? normPattern_(row[k]) : (k === 'number' ? row[k] : trimStr_(row[k]));
        if (!sameCell_(srow[ssc[k] - 1], want)) { staffUpdates.push({ sheet: hit.sheet, row: hit.row, col: ssc[k], value: want }); changed = true; }
      });
      if (changed) { setReg(r, 'copiedAt', now); updated++; }
    } else {
      row.missing = true;
    }

    if (srow) {
      const sv = (k) => (ssc[k] ? srow[ssc[k] - 1] : '');
      const hit = byNo.has(no) ? byNo.get(no) : null; // 入力シートの行（今回追加した行は null）
      const putStaff = (k, value) => { if (hit && ssc[k] && !sameCell_(srow[ssc[k] - 1], value)) staffUpdates.push({ sheet: hit.sheet, row: hit.row, col: ssc[k], value }); };
      // 管理者が『登録一覧』に時間を書き、入力シートの時間がまだ空なら、入力シートへ入れる（入っていれば入力シートが正）
      if (hit && staffWhite_(srow, ssc) + toHours_(sv('color')) + toHours_(sv('other')) === 0) {
        regHoursCols_(ssc).forEach(x => { const h = toHours_(row[x.k]); if (h > 0) { staffUpdates.push({ sheet: hit.sheet, row: hit.row, col: x.c, value: h }); srow[x.c - 1] = h; } });
      }
      const st = readStaffStamps_(srow, ssc, now);
      row.translated = st.translated;
      row.white = staffWhite_(srow, ssc); row.color = sv('color'); row.other = sv('other');
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
      // 納品名（社外案件名_社外視点名_YYMMDD）
      // 空、または YYMMDD のまま（エンジニアが日付を書いていない）なら、案件名・視点を直したときに合わせて作り直す
      const dn = deliveryNameOf_(row, views);
      const curDn = trimStr_(sv('delivery'));
      const useDn = curDn === '' || /YYMMDD$/.test(curDn) ? dn : curDn;
      putStaff('delivery', useDn);
      setReg(r, 'delivery', useDn);
      // 削除依頼（エンジニアが入力シートでチェック）→『登録一覧』に依頼の日時。外したら消す
      if (rc.delReq && ssc.delReq) {
        const want = isChecked_(sv('delReq'));
        const cur = row.delReq;
        if (want && trimStr_(cur) === '') { setReg(r, 'delReq', now); delReqs.push(no + ' ' + regLabel_(row)); }
        else if (!want && trimStr_(cur) !== '') setReg(r, 'delReq', '');
      }
    }
    row.state = regState_(row);
    setReg(r, 'state', row.state);
    if (row.state === REG_STATE.MISSING) missing++;
    if (row.state === REG_STATE.ESTIMATE) estimate++;
    if (isReminderDue_(row, now, cfg)) {
      const d = calcDeadlineOf_(row, cfg);
      due.push({
        r, label: regLabel_(row), count: parseInt(row.notifyCount, 10) || 0, waiting: row.state === REG_STATE.TRANSLATE,
        due: (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + pad2_(d.getMinutes()),
      });
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
  staffUpdates.forEach(u => u.sheet.getRange(u.row, u.col).setValue(u.value));
  if (appends.length) {
    // 写す列と登録Noだけを書く（行ごと書くと、合計などの式を消してしまう）。続いた列はまとめて書く
    const cols = REG_COPY.map(k => sc[k]).concat([sc.regNo, sc.delivery], regHoursCols_(sc).map(x => x.c)).filter(Boolean).sort((a, b) => a - b);
    const segs = [];
    cols.forEach(c => { const g = segs[segs.length - 1]; if (g && g[g.length - 1] === c - 1) g.push(c); else segs.push([c]); });
    const writeRows = (start, list) => list.forEach((arr, i) => segs.forEach(g => {
      if (g.every(c => arr[c - 1] === '')) return;
      staff.getRange(start + i, g[0], 1, g.length).setValues([g.map(c => arr[c - 1])]);
    }));
    // 同じ案件・同じ視点（パターン違い）の行が入力前にあれば、そのすぐ下に差し込む（A・B・C が並ぶように）。無ければ最後へ
    const keyOf = (v) => normCode_(joinCode_(v[sc.code - 1], sc.number ? v[sc.number - 1] : '')) + '::' + normCut_(trimStr_(v[sc.cut - 1]));
    const lastBy = new Map();
    before.vals.forEach((v, i) => { if (trimStr_(v[sc.cut - 1])) lastBy.set(keyOf(v), hr + 1 + i); });
    const tail = [], groups = new Map();
    appends.forEach(arr => { const a = lastBy.get(keyOf(arr)); if (a) { if (!groups.has(a)) groups.set(a, []); groups.get(a).push(arr); } else tail.push(arr); });
    if (tail.length) { ensureSize_(staff, lastData + tail.length, width); writeRows(lastData + 1, tail); }
    const totalF = staffTotalFormula_(sc);
    Array.from(groups.keys()).sort((a, b) => b - a).forEach(a => {
      const list = groups.get(a);
      staff.insertRowsAfter(a, list.length);
      writeRows(a + 1, list);
      if (totalF && sc.total) staff.getRange(a + 1, sc.total, list.length, 1).setFormulaR1C1(totalF);
      ['translated', 'delReq'].forEach(k => { if (sc[k]) staff.getRange(a + 1, sc[k], list.length, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build()).setValues(list.map(() => [false])); });
    });
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
  // 削除依頼（Discord）
  if (delReqs.length) {
    const url = PropertiesService.getScriptProperties().getProperty(PROP_DISCORD);
    if (url && cfg.notify) {
      try { sendDiscord_(url, delRequestMessage_(delReqs)); remindNote += (remindNote ? '・' : '') + '削除依頼 ' + delReqs.length + '件を Discord で知らせた'; }
      catch (e) { remindNote += (remindNote ? '・' : '') + '削除依頼の Discord 送信エラー：' + String(e && e.message || e); }
    } else remindNote += (remindNote ? '・' : '') + '削除依頼 ' + delReqs.length + '件';
  }
  // 『登録一覧』は列ごとにまとめて書く（変えた行の範囲だけ。1マスずつ書くと遅い）
  const byCol = new Map();
  regUpdates.forEach(u => { if (!byCol.has(u.col)) byCol.set(u.col, []); byCol.get(u.col).push(u.row); });
  byCol.forEach((rowsOfCol, col) => {
    const r1 = Math.min.apply(null, rowsOfCol), r2 = Math.max.apply(null, rowsOfCol);
    const vals = [];
    for (let r = r1; r <= r2; r++) vals.push([data[r - 1][col - 1]]);
    reg.getRange(r1, col, vals.length, 1).setValues(vals);
  });

  const msg = (intake.moved ? '登録 ' + intake.moved + '件・' : '') + (intake.rejected ? '登録できない行 ' + intake.rejected + '件（足りない項目あり）・' : '') +
    '入力シートへ写した ' + copied + '件・直した ' + updated + '件・時間計算待ち ' + estimate + '件' +
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
  const total = Math.round((staffWhite_(v, sc) + toHours_(at('color')) + toHours_(at('other'))) * 100) / 100;
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
    const watch = ['translated', 'white', 'whiteBody', 'whiteFurn', 'color', 'other'].map(k => sc[k]).filter(Boolean);
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
  const mins = o.calcMinutes != null && isFinite(o.calcMinutes) ? o.calcMinutes : 90;
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
    '計算期限': reg ? fmtDT(o.calcHours ? addWorkMinutes_(reg, mins, o.calcHours) : new Date(reg.getTime() + mins * 60000)) : '',
  };
  return String(template || '').replace(/\{([^{}]+)\}/g, (m, k) => (k in vals ? vals[k] : m)).replace(/\n{3,}/g, '\n\n').trim();
}
/** 「8-12,13-17」→ [[480,720],[780,1020]]（その日の0時からの分）。読めなければ [] */
function parseWorkHours_(spec) {
  const out = [];
  String(spec || '').split(/[,、，]/).forEach(part => {
    const m = part.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*[-〜~ー]\s*(\d{1,2})(?::(\d{2}))?$/);
    if (!m) return;
    const a = +m[1] * 60 + (+m[2] || 0), b = +m[3] * 60 + (+m[4] || 0);
    if (b > a) out.push([a, b]);
  });
  return out.sort((x, y) => x[0] - y[0]);
}
/**
 * date から、決めた時間帯（ベトナム時間）の中だけを数えて mins 分たった時刻（純ロジック）。
 * 例 '8-12,13-17' で 11:30 ＋90分 → 12時まで30分・13時から60分 → 14:00。16:30 ＋90分 → 17時まで30分・次の日8時から60分 → 9:00
 */
function addWorkMinutes_(date, mins, spec) {
  const wins = parseWorkHours_(spec);
  if (!wins.length) return new Date(date.getTime() + mins * 60000);
  const OFF = 7 * 3600000; // ベトナム時間（UTC+7、夏時間なし）
  const DAY = 86400000;
  let t = date.getTime(), left = Math.max(0, mins) * 60000;
  for (let guard = 0; guard < 400; guard++) {
    const day0 = Math.floor((t + OFF) / DAY) * DAY - OFF; // その日（ベトナム時間）の0時
    for (const w of wins) {
      const s = day0 + w[0] * 60000, e = day0 + w[1] * 60000;
      if (t >= e) continue;
      const from = Math.max(t, s);
      if (left <= e - from) return new Date(from + left);
      left -= e - from;
      t = e;
    }
    t = day0 + DAY;
  }
  return new Date(t);
}

/** 連絡文の日時はベトナム時間で「11/3 15:15」の形にする（シートのタイムゾーンの設定に関係なく） */
function regMessageOpts_(cfg, ss) {
  const fmt = typeof Utilities !== 'undefined' ? (d) => Utilities.formatDate(d, APP_TIME_ZONE, 'M/d H:mm') : null;
  return { calcMinutes: cfg.calcMinutes, calcHours: cfg.calcHours, fmt };
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
 * （ほかの処理が動いていれば見送り、15分ごとの自動実行で写す）。
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
    // 『案件入力』（縦型フォーム）
    if (sheet.getName() === SHEET.TRASH) { onTrashEdit_(e.source || SpreadsheetApp.getActiveSpreadsheet(), sheet, e.range); return; }
    if (sheet.getName() === SHEET.FORM) { onFormEdit_(e.source || SpreadsheetApp.getActiveSpreadsheet(), sheet, e.range); return; }
    // 『案件登録』（入力専用）：「登録」にチェック → 登録して『登録一覧』へ移す。それ以外は「状態」だけ直す
    if (sheet.getName() === SHEET.ENTRY) {
      if (e.range.getLastRow() < 2) return;
      const ec = entryHeaderMap_(sheet);
      const e1 = Math.max(2, e.range.getRow()), e2 = e.range.getLastRow();
      const ev = sheet.getRange(e1, 1, e2 - e1 + 1, sheet.getLastColumn()).getValues();
      if (ev.some(v => isChecked_(v[ec.submit - 1]))) {
        const lock = LockService.getScriptLock();
        if (!lock.tryLock(20000)) { toastOrLog_('ほかの処理が動いています。少し待ってから、もう一度チェックしてください'); sheet.getRange(e1, ec.submit, e2 - e1 + 1, 1).setValues(ev.map(() => [false])); return; }
        try { toastOrLog_('登録：' + syncRegistrations_(new Date()).msg); } finally { lock.releaseLock(); }
        return;
      }
      ev.forEach((v, i) => {
        const row = {};
        REG_INPUT.forEach(k => { row[k] = v[ec[k] - 1]; });
        const st = REG_INPUT.every(k => trimStr_(row[k]) === '') ? '' : entryState_(row);
        if (!sameCell_(v[ec.state - 1], st)) sheet.getRange(e1 + i, ec.state).setValue(st);
      });
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
    // White・Color・pts を管理者が書いた → 入力シートの行へすぐ書く（このあとの同期で『登録一覧』と入力シートがそろう）
    const hourCols = ['white', 'color', 'other'].map(k => rc[k]).filter(Boolean);
    if (hourCols.some(c => c >= e.range.getColumn() && c <= e.range.getLastColumn())) {
      try { pushRegHoursToStaff_(vals.map(v => ({ no: v[rc.no - 1], white: v[rc.white - 1], color: v[rc.color - 1], other: v[rc.other - 1] }))); }
      catch (err) { console.log('pushRegHoursToStaff_: ' + (err && err.message || err)); }
    }
    // 「削除」にチェックした行 → チェックを外して確認の画面を出す（「削除する」を押すまで何も消さない）
    if (rc.del && e.range.getColumn() <= rc.del && e.range.getLastColumn() >= rc.del) {
      const delRows = [];
      vals.forEach((v, i) => { if (isChecked_(v[rc.del - 1])) delRows.push({ r: r1 + i, v }); });
      if (delRows.length) {
        delRows.forEach(x => sheet.getRange(x.r, rc.del).setValue(false));
        showDeleteDialog_(rc, delRows.map(x => x.v));
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
    if (no) map.set(no, { assignee: trimStr_(v[rc.assignee - 1]), deadline: v[rc.deadline - 1], extName: rc.extName ? trimStr_(v[rc.extName - 1]) : '' });
  });
  return map;
}

// ============ 登録の削除（2026-11-05） ============
// 管理者：『登録一覧』の「削除」にチェック → 確認の画面 →「削除する」で、『登録一覧』・エンジニア入力シート（3タブ）・『連携』の行を消し、
// 工程図の作業（externalId が 取込キー:: で始まるタスク）を消す。工程図の削除は「消す予定」（スクリプトのプロパティ）に入れてすぐ試し、
// できなければ（画面を押した人に工程図の権限が無いなど）次の自動実行で消す。
// エンジニア：入力シートの「削除依頼」にチェック → 『登録一覧』の「削除依頼」に日時が入り、Discord で知らせる。消すのは管理者。
const PROP_PENDING_DELETES = 'PENDING_DELETE_KEYS';
/**
 * 消してよいかの判定（純ロジック）。entries＝入力シートの行を古い順（制作済み→制作中→入力前）に並べたもの [{ no, base }]。
 * 同じ案件・視点の n回目 は上から数えるので、あとの回が残る行を消すと回数がずれる → あとの回から消す。
 * 戻り値 { ok: [{ no, key }], blocked: [{ no, reason }] }（key は入力シートに無い登録なら ''）
 */
function planRegDeletion_(entries, nos) {
  const want = new Set(nos);
  const rounds = new Map(); // base → [{ no, n }]
  const where = new Map(); // no → { base, n }
  (entries || []).forEach(e => {
    if (!e.base) return;
    const list = rounds.get(e.base) || [];
    list.push({ no: e.no || '', n: list.length + 1 });
    rounds.set(e.base, list);
    if (e.no) where.set(e.no, { base: e.base, n: list.length });
  });
  const ok = [], blocked = [];
  nos.forEach(no => {
    const w = where.get(no);
    if (!w) { ok.push({ no, key: '' }); return; }
    const later = rounds.get(w.base).filter(x => x.n > w.n && !want.has(x.no));
    if (later.length) blocked.push({ no, reason: 'あとの回（' + later.map(x => x.n + '回目' + (x.no ? '・' + x.no : '')).join('、') + '）があるので、先にそちらを消してください' });
    else ok.push({ no, key: w.base + '::' + w.n });
  });
  return { ok, blocked };
}
/** 『登録一覧』の White・Color・pts → 入力シートの列（White は White躯体。分ける前の入力シートは White） */
function regHoursCols_(sc) {
  return [{ k: 'white', c: sc.whiteBody || sc.white }, { k: 'color', c: sc.color }, { k: 'other', c: sc.other }].filter(x => x.c);
}
/**
 * 管理者が『登録一覧』の White・Color・pts を書いた（直した）とき：その登録の入力シートの行へすぐ書く（White家具は空にする）。
 * rows＝[{ no, white, color, other }]。書いた行数
 */
function pushRegHoursToStaff_(rows) {
  const list = (rows || []).filter(r => trimStr_(r.no));
  if (!list.length) return 0;
  const cfg = readSettings_();
  const file = SpreadsheetApp.openById(cfg.fileId);
  let n = 0;
  staffTabNames_(cfg).map(name => file.getSheetByName(name)).filter(Boolean).forEach(sheet => {
    const hr = findStaffHeaderRow_(sheet);
    if (hr < 0 || sheet.getLastRow() <= hr) return;
    const sc = mapStaffColumns_(sheet.getRange(hr, 1, 1, sheet.getLastColumn()).getValues()[0]);
    if (!sc.regNo) return;
    const nos = sheet.getRange(hr + 1, sc.regNo, sheet.getLastRow() - hr, 1).getValues().map(v => trimStr_(v[0]));
    list.forEach(r => {
      const i = nos.indexOf(trimStr_(r.no));
      if (i < 0) return;
      const row = hr + 1 + i;
      regHoursCols_(sc).forEach(x => sheet.getRange(row, x.c).setValue(toHours_(r[x.k]) || ''));
      if (sc.whiteBody && sc.whiteFurn) sheet.getRange(row, sc.whiteFurn).setValue('');
      n++;
    });
  });
  return n;
}
/** 削除依頼の Discord 文（純ロジック） */
function delRequestMessage_(lines) {
  return '🗑 エンジニア入力シートで削除依頼がありました（' + lines.length + '件）。『登録一覧』で確かめて、消すなら「削除」にチェックしてください\n' + lines.map(l => '・' + l).join('\n');
}
const DELETE_DIALOG_SCRIPT = `
function el(id) { return document.getElementById(id); }
el("cancel").addEventListener("click", function () { google.script.host.close(); });
el("go").addEventListener("click", function () {
  var b = el("go");
  b.disabled = true; el("cancel").disabled = true;
  el("msg").className = ""; el("msg").textContent = "削除しています…";
  google.script.run.withSuccessHandler(function (r) {
    el("msg").className = r.ok ? "ok" : "ng"; el("msg").textContent = r.msg;
    b.style.display = "none"; el("cancel").textContent = "閉じる"; el("cancel").disabled = false;
  }).withFailureHandler(function (e) {
    el("msg").className = "ng"; el("msg").textContent = (e && e.message) || String(e); b.disabled = false; el("cancel").disabled = false;
  }).deleteRegistrations(JSON.parse(el("nos").value));
});
`;
/** 削除の確認画面の HTML（純ロジック）。items＝[{ no, label, state, req }] */
function deleteDialogHtml_(items) {
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const nos = items.map(x => x.no);
  return '<!doctype html><html><head><meta charset="utf-8"><style>' +
    'body{font-family:sans-serif;font-size:13px;margin:0;padding:12px 16px;color:#222}ul{margin:6px 0 10px;padding-left:18px;max-height:180px;overflow:auto}' +
    '.warn{background:#fdecea;border:1px solid #f5c2c0;border-radius:6px;padding:8px 10px;margin:8px 0}' +
    '.row{display:flex;gap:8px;margin-top:12px}button{flex:1;padding:10px;font-size:14px;border-radius:6px;border:1px solid #ccc;background:#fff;cursor:pointer}' +
    '#go{background:#d93025;border-color:#d93025;color:#fff}#go:disabled{opacity:.5}#msg{margin-top:10px;white-space:pre-wrap}.ok{color:#188038}.ng{color:#d93025}' +
    '</style></head><body>' +
    '<div>次の登録（' + items.length + '件）を削除します。</div><ul>' +
    items.map(x => '<li>' + esc(x.no) + '　' + esc(x.label) + (x.state ? '（' + esc(x.state) + '）' : '') + (x.req ? '　<b>削除依頼あり</b>' : '') + '</li>').join('') + '</ul>' +
    '<div class="warn">『登録一覧』・エンジニア入力シート・『連携』の行と、工程図の作業がまとめて消えます。元に戻せません。</div>' +
    '<input type="hidden" id="nos" value="' + esc(JSON.stringify(nos)) + '">' +
    '<div class="row"><button id="cancel">やめる</button><button id="go">削除する</button></div><div id="msg"></div>' +
    '<script>' + DELETE_DIALOG_SCRIPT + '</script></body></html>';
}
function showDeleteDialog_(rc, rows) {
  const items = [];
  const skipped = [];
  rows.forEach(v => {
    const row = {};
    Object.keys(rc).forEach(k => { row[k] = v[rc[k] - 1]; });
    const no = trimStr_(row.no);
    if (!no) { skipped.push(1); return; }
    items.push({ no, label: regLabel_(row), state: trimStr_(row.state), req: trimStr_(row.delReq) !== '' });
  });
  if (!items.length) { toastOrLog_('登録No の無い行は消せません（その行はそのまま消してください）'); return; }
  const html = HtmlService.createHtmlOutput(deleteDialogHtml_(items)).setWidth(460).setHeight(Math.min(520, 260 + items.length * 22));
  SpreadsheetApp.getUi().showModalDialog(html, '登録の削除');
}
/** 確認画面の「削除する」。nos＝登録No の配列。戻り値 { ok, msg } */
function deleteRegistrations(nos) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, msg: 'ほかの処理が動いています。少し待ってから、もう一度「削除」にチェックしてください' };
  try {
    const cfg = readSettings_();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const want = (nos || []).map(trimStr_).filter(Boolean);
    if (!want.length) return { ok: false, msg: '消す登録がありません' };
    // 入力シート（古い順）の行
    const staffFile = SpreadsheetApp.openById(cfg.fileId);
    const entries = [];
    const rowsByNo = new Map(); // no → [{ sheet, row }]
    staffTabNames_(cfg).map(name => staffFile.getSheetByName(name)).filter(Boolean).forEach(sheet => {
      const hr = findStaffHeaderRow_(sheet);
      if (hr < 0 || sheet.getLastRow() <= hr) return;
      const sc = mapStaffColumns_(sheet.getRange(hr, 1, 1, sheet.getLastColumn()).getValues()[0]);
      const w = Math.max.apply(null, Object.keys(sc).map(k => sc[k]));
      sheet.getRange(hr + 1, 1, sheet.getLastRow() - hr, w).getValues().forEach((v, i) => {
        const no = sc.regNo ? trimStr_(v[sc.regNo - 1]) : '';
        const code = joinCode_(v[sc.code - 1], sc.number ? v[sc.number - 1] : '');
        const cut = trimStr_(v[sc.cut - 1]);
        const base = code && cut ? normCode_(code) + '::' + normCut_(viewpointNameOf_(cut, sc.pattern ? v[sc.pattern - 1] : '')) : '';
        entries.push({ no, base });
        if (no && want.indexOf(no) >= 0) { if (!rowsByNo.has(no)) rowsByNo.set(no, []); rowsByNo.get(no).push({ sheet, row: hr + 1 + i, backup: { tab: sheet.getName(), vals: rowToJson_(v, sc) } }); }
      });
    });
    const plan = planRegDeletion_(entries, want);
    const okNos = plan.ok.map(x => x.no);
    const keys = plan.ok.map(x => x.key).filter(Boolean);
    // 消す前に『削除済み』へ残す（登録一覧・入力シート・連携の行。工程図の作業は消したときに足す）
    if (okNos.length) {
      const regS = ss.getSheetByName(SHEET.REG);
      const regRows = new Map();
      if (regS && regS.getLastRow() >= 2) {
        const rc0 = regHeaderMap_(regS);
        regS.getRange(2, 1, regS.getLastRow() - 1, regS.getLastColumn()).getValues().forEach(v => { const no = trimStr_(v[rc0.no - 1]); if (no) regRows.set(no, { o: rowToJson_(v, rc0), v: v, rc: rc0 }); });
      }
      const linkRows = new Map();
      const linkS = ss.getSheetByName(SHEET.LINK);
      if (keys.length && linkS && linkS.getLastRow() >= 2) {
        const col0 = headerMap_(linkS);
        linkS.getRange(2, 1, linkS.getLastRow() - 1, linkS.getLastColumn()).getValues().forEach(v => { const k = trimStr_(v[col0.key - 1]); if (k && keys.indexOf(k) >= 0) linkRows.set(k, rowToJson_(v, col0)); });
      }
      trashAppend_(ss, plan.ok.map(x => {
        const rr = regRows.get(x.no);
        const sr = (rowsByNo.get(x.no) || [])[0];
        return {
          no: x.no, key: x.key,
          internal: rr ? joinCode_(rr.v[rr.rc.code - 1], rr.v[rr.rc.number - 1]) : '',
          cut: rr ? viewpointNameOf_(rr.v[rr.rc.cut - 1], rr.v[rr.rc.pattern - 1]) : '',
          reg: rr ? rr.o : null, staff: sr ? sr.backup : null, link: x.key ? linkRows.get(x.key) || null : null,
        };
      }));
    }
    // 入力シートの行（シートごとに下から）
    const bySheet = new Map();
    okNos.forEach(no => (rowsByNo.get(no) || []).forEach(x => { if (!bySheet.has(x.sheet)) bySheet.set(x.sheet, []); bySheet.get(x.sheet).push(x.row); }));
    bySheet.forEach((list, sheet) => list.sort((a, b) => b - a).forEach(r => sheet.deleteRow(r)));
    // 『連携』の行
    let linkDeleted = 0;
    const link = ss.getSheetByName(SHEET.LINK);
    if (keys.length && link && link.getLastRow() >= 2) {
      const col = headerMap_(link);
      const kv = link.getRange(2, col.key, link.getLastRow() - 1, 1).getValues();
      const del = [];
      kv.forEach((v, i) => { if (keys.indexOf(trimStr_(v[0])) >= 0) del.push(i + 2); });
      del.sort((a, b) => b - a).forEach(r => link.deleteRow(r));
      linkDeleted = del.length;
    }
    // 『登録一覧』の行
    const reg = ss.getSheetByName(SHEET.REG);
    if (reg && reg.getLastRow() >= 2 && okNos.length) {
      const rc = regHeaderMap_(reg);
      const nv = reg.getRange(2, rc.no, reg.getLastRow() - 1, 1).getValues();
      const del = [];
      nv.forEach((v, i) => { if (okNos.indexOf(trimStr_(v[0])) >= 0) del.push(i + 2); });
      del.sort((a, b) => b - a).forEach(r => reg.deleteRow(r));
    }
    // 工程図の作業：消す予定に入れて、すぐ試す（できなければ次の自動実行で）
    let fsNote = '';
    if (keys.length) {
      const props = PropertiesService.getScriptProperties();
      const pending = parseJsonArray_(props.getProperty(PROP_PENDING_DELETES));
      keys.forEach(k => { if (pending.indexOf(k) < 0) pending.push(k); });
      props.setProperty(PROP_PENDING_DELETES, JSON.stringify(pending));
      try { fsNote = '工程図の作業 ' + processPendingDeletes_(cfg) + '件を削除'; }
      catch (e) { fsNote = '工程図の作業は次の自動実行（15分以内）で削除します'; console.log('deleteRegistrations: ' + (e && e.message || e)); }
    }
    const parts = [];
    if (okNos.length) parts.push('削除しました：' + okNos.join('・') + '（入力シート ' + Array.from(bySheet.values()).reduce((a, l) => a + l.length, 0) + '行・連携 ' + linkDeleted + '行' + (fsNote ? '・' + fsNote : '') + '）');
    plan.blocked.forEach(b => parts.push('✗ ' + b.no + '：' + b.reason));
    return { ok: !plan.blocked.length, msg: parts.join('\n') };
  } finally {
    lock.releaseLock();
  }
}
/** 消す予定の取込キーの作業を工程図から消す（deletedExternalIds からも外して、同じ視点をまた登録できるようにする）。消した件数 */
function processPendingDeletes_(cfg) {
  const props = PropertiesService.getScriptProperties();
  const keys = parseJsonArray_(props.getProperty(PROP_PENDING_DELETES));
  if (!keys.length) return 0;
  const auth = getAuth_();
  const hit = (ext) => keys.some(k => String(ext || '').indexOf(k + '::') === 0);
  const tasks = fsTasksByKeys_(auth, cfg, keys);
  let n = 0;
  const byKey = new Map(); // 取込キー → 消した作業（『削除済み』に残して、復帰で作り直す）
  tasks.forEach(t => {
    const id = t._id || t.id;
    if (!id || !hit(t.externalId)) return;
    const k = keys.find(x => String(t.externalId).indexOf(x + '::') === 0);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push({ id, fields: t._raw || fsEncodeFields_(t) });
  });
  try { trashAttachTasks_(SpreadsheetApp.getActiveSpreadsheet(), byKey); } catch (e) { console.log('trashAttachTasks_: ' + (e && e.message || e)); }
  byKey.forEach(list => list.forEach(d => {
    fsFetch_(auth, fsBase_(cfg) + '/workspaces/' + cfg.workspaceId + '/tasks/' + encodeURIComponent(d.id), 'delete');
    n++;
  }));
  const deleted = parseJsonArray_(fsGetValueString_(auth, cfg, 'deletedExternalIds'));
  const rest = deleted.filter(x => !hit(x));
  if (rest.length !== deleted.length) fsPatch_(auth, cfg, 'workspaces/' + cfg.workspaceId + '/data/deletedExternalIds', { value: JSON.stringify(rest) }, ['value']);
  props.deleteProperty(PROP_PENDING_DELETES);
  return n;
}

// ============ 削除済み（バックアップと復帰。管理者用シートだけ。2026-11-05） ============
// 「削除する」で消す前に、『登録一覧』・入力シート・『連携』の行を『削除済み』タブに残す（工程図の作業は消したときに足す）。
// 『削除済み』の「復帰」にチェックすると、その行を元の場所（入力シートは元のタブの下）に戻し、工程図の作業も作り直す。
const TRASH_H = ['削除日時', '登録No', '社内案件名', '視点', '状態', '復帰', '結果', '取込キー', '登録一覧', '入力シート', '連携', '工程図'];
const TRASH_C = { at: 1, no: 2, internal: 3, cut: 4, state: 5, restore: 6, result: 7, key: 8, reg: 9, staff: 10, link: 11, tasks: 12 };
const TRASH_STATE = { DELETED: '削除済み', RESTORED: '復帰済み' };
/** セルの値 ⇄ JSON（日付は { $d: ISO } にして戻せるように） */
function cellToJson_(v) { return Object.prototype.toString.call(v) === '[object Date]' ? { $d: v.toISOString() } : v; }
function cellFromJson_(v) { return v && typeof v === 'object' && v.$d ? new Date(v.$d) : v; }
function rowToJson_(v, cols) { const o = {}; Object.keys(cols).forEach(k => { if (cols[k]) o[k] = cellToJson_(v[cols[k] - 1]); }); return o; }
function ensureTrashSheet_(ss) {
  let sh = ss.getSheetByName(SHEET.TRASH);
  if (sh) return sh;
  sh = ss.insertSheet(SHEET.TRASH);
  ensureSize_(sh, 1000, TRASH_H.length);
  sh.getRange(1, 1, 1, TRASH_H.length).setValues([TRASH_H]).setFontWeight('bold').setBackground('#e6e6e6');
  sh.getRange(1, TRASH_C.restore).setBackground('#fff2cc').setNote('戻したい行にチェック。『登録一覧』・エンジニア入力シート・『連携』の行と、工程図の作業を元に戻す（結果は「結果」に出る）');
  sh.getRange(2, TRASH_C.restore, 999, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  sh.getRange(2, TRASH_C.at, 999, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  sh.setFrozenRows(1);
  sh.hideColumns(TRASH_C.key, TRASH_H.length - TRASH_C.key + 1); // バックアップの中身（JSON）は隠す
  return sh;
}
/** 『削除済み』の登録No（登録No を使い回さないため） */
function trashNos_(ss) {
  const sh = ss.getSheetByName(SHEET.TRASH);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, TRASH_C.no, sh.getLastRow() - 1, 1).getValues().map(v => trimStr_(v[0])).filter(Boolean);
}
function trashAppend_(ss, items) {
  if (!items.length) return;
  const sh = ensureTrashSheet_(ss);
  const nos = sh.getLastRow() >= 2 ? sh.getRange(2, TRASH_C.no, sh.getLastRow() - 1, 1).getValues() : [];
  let last = 1;
  nos.forEach((v, i) => { if (trimStr_(v[0])) last = i + 2; });
  ensureSize_(sh, last + items.length, TRASH_H.length);
  const now = new Date();
  sh.getRange(last + 1, 1, items.length, TRASH_H.length).setValues(items.map(x => [now, x.no, x.internal, x.cut, TRASH_STATE.DELETED, false, '', x.key || '',
    JSON.stringify(x.reg || null), JSON.stringify(x.staff || null), JSON.stringify(x.link || null), '[]']));
}
/** 工程図から消した作業（Firestore の fields のまま）を、同じ取込キーのいちばん下の削除済みの行に足す */
function trashAttachTasks_(ss, byKey) {
  const sh = ss.getSheetByName(SHEET.TRASH);
  if (!sh || sh.getLastRow() < 2) return;
  const vals = sh.getRange(2, 1, sh.getLastRow() - 1, TRASH_H.length).getValues();
  byKey.forEach((docs, key) => {
    for (let i = vals.length - 1; i >= 0; i--) {
      if (trimStr_(vals[i][TRASH_C.key - 1]) !== key || vals[i][TRASH_C.state - 1] !== TRASH_STATE.DELETED) continue;
      const cur = parseJsonArray_(vals[i][TRASH_C.tasks - 1]);
      sh.getRange(i + 2, TRASH_C.tasks).setValue(JSON.stringify(cur.concat(docs)));
      return;
    }
  });
}
/** 『削除済み』の1行を元に戻す。戻り値 { ok, msg } */
function restoreDeleted_(ss, row) {
  const sh = ss.getSheetByName(SHEET.TRASH);
  const v = sh.getRange(row, 1, 1, TRASH_H.length).getValues()[0];
  if (v[TRASH_C.state - 1] !== TRASH_STATE.DELETED) return { ok: false, msg: 'もう戻してあります' };
  const no = trimStr_(v[TRASH_C.no - 1]);
  const key = trimStr_(v[TRASH_C.key - 1]);
  const parse = (c) => { try { return JSON.parse(v[c - 1] || 'null'); } catch (e) { return null; } };
  const regB = parse(TRASH_C.reg), staffB = parse(TRASH_C.staff), linkB = parse(TRASH_C.link);
  const tasksB = parseJsonArray_(v[TRASH_C.tasks - 1]);
  const cfg = readSettings_();
  const reg = ss.getSheetByName(SHEET.REG);
  const rc = regHeaderMap_(reg);
  // 同じ登録No が『登録一覧』にある・同じ視点のあとの回がもうある → 戻さない（回数がずれるため）
  if (reg.getLastRow() >= 2 && reg.getRange(2, rc.no, reg.getLastRow() - 1, 1).getValues().some(x => trimStr_(x[0]) === no)) return { ok: false, msg: '登録No ' + no + ' が『登録一覧』にもうあります' };
  const file = SpreadsheetApp.openById(cfg.fileId);
  if (staffB && key) {
    const base = key.replace(/::\d+$/, ''), n = parseInt(key.split('::').pop(), 10);
    let count = 0;
    staffTabNames_(cfg).map(name => file.getSheetByName(name)).filter(Boolean).forEach(s => {
      const hr = findStaffHeaderRow_(s);
      if (hr < 0 || s.getLastRow() <= hr) return;
      const sc = mapStaffColumns_(s.getRange(hr, 1, 1, s.getLastColumn()).getValues()[0]);
      const w = Math.max.apply(null, Object.keys(sc).map(k => sc[k]));
      s.getRange(hr + 1, 1, s.getLastRow() - hr, w).getValues().forEach(x => {
        const code = joinCode_(x[sc.code - 1], sc.number ? x[sc.number - 1] : '');
        const cut = trimStr_(x[sc.cut - 1]);
        if (code && cut && normCode_(code) + '::' + normCut_(viewpointNameOf_(cut, sc.pattern ? x[sc.pattern - 1] : '')) === base) count++;
      });
    });
    if (count + 1 !== n) return { ok: false, msg: '同じ視点の登録がそのあとに増えた（または減った）ので、回数がずれるため戻せません（今 ' + count + '件・戻す行は' + n + '回目）' };
  }
  // 入力シート：元のタブの、中身がある最後の行の下へ
  if (staffB && staffB.vals) {
    const s = file.getSheetByName(staffB.tab) || file.getSheetByName(cfg.tabName);
    const hr = findStaffHeaderRow_(s);
    const sc = ensureStaffExtraColumns_(s, hr);
    const w = Math.max.apply(null, Object.keys(sc).map(k => sc[k]));
    let last = hr;
    if (s.getLastRow() > hr) s.getRange(hr + 1, 1, s.getLastRow() - hr, w).getValues().forEach((x, i) => { if (['code', 'number', 'cut', 'regNo'].some(k => sc[k] && trimStr_(x[sc[k] - 1]) !== '')) last = hr + 1 + i; });
    const r = last + 1;
    ensureSize_(s, r, w);
    Object.keys(staffB.vals).forEach(k => { if (sc[k] && k !== 'total') s.getRange(r, sc[k]).setValue(k === 'delReq' ? false : cellFromJson_(staffB.vals[k])); });
    const f = staffTotalFormula_(sc);
    if (f && sc.total) s.getRange(r, sc.total).setFormulaR1C1(f);
    ['translated', 'delReq'].forEach(k => { if (sc[k]) s.getRange(r, sc[k]).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build()); });
  }
  // 『登録一覧』：中身がある最後の行の下へ
  if (regB) {
    const lv = reg.getLastRow() >= 2 ? reg.getRange(2, 1, reg.getLastRow() - 1, reg.getLastColumn()).getValues() : [];
    let last = 1;
    lv.forEach((x, i) => { if (trimStr_(x[rc.no - 1]) !== '' || REG_INPUT.some(k => trimStr_(x[rc[k] - 1]) !== '')) last = i + 2; });
    const r = last + 1;
    ensureSize_(reg, r, reg.getLastColumn());
    const skip = ['internal', 'total', 'manual', 'copy', 'del', 'delReq'];
    Object.keys(regB).forEach(k => { if (rc[k] && skip.indexOf(k) < 0) reg.getRange(r, rc[k]).setValue(cellFromJson_(regB[k])); });
    const fm = regFormulas_(rc);
    reg.getRange(r, rc.internal).setFormulaR1C1(fm.internal);
    reg.getRange(r, rc.total).setFormulaR1C1(fm.total);
    ['manual', 'copy', 'del'].forEach(k => { if (rc[k]) reg.getRange(r, rc[k]).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build()).setValue(false); });
  }
  // 『連携』：いちばん下へ
  let linkNote = '';
  if (linkB) {
    const link = ss.getSheetByName(SHEET.LINK);
    const col = headerMap_(link);
    const o = {};
    Object.keys(linkB).forEach(k => { o[k] = cellFromJson_(linkB[k]); });
    const arr = rowObjToArray_(o, col);
    const r = link.getLastRow() + 1;
    ensureSize_(link, r, arr.length);
    link.getRange(r, 1, 1, arr.length).setValues([arr]);
    linkNote = '・連携 1行';
  }
  // 工程図：消す予定から外し、消した作業を作り直す
  const props = PropertiesService.getScriptProperties();
  const pending = parseJsonArray_(props.getProperty(PROP_PENDING_DELETES));
  if (key && pending.indexOf(key) >= 0) {
    const rest = pending.filter(k => k !== key);
    if (rest.length) props.setProperty(PROP_PENDING_DELETES, JSON.stringify(rest)); else props.deleteProperty(PROP_PENDING_DELETES);
  }
  let made = 0, fsNote = '';
  if (tasksB.length) {
    try {
      const auth = getAuth_();
      tasksB.forEach(d => { fsFetch_(auth, fsBase_(cfg) + '/workspaces/' + cfg.workspaceId + '/tasks/' + encodeURIComponent(d.id), 'patch', { fields: d.fields }); made++; });
      fsNote = '・工程図の作業 ' + made + '件';
    } catch (e) {
      fsNote = '・工程図の作業は戻せませんでした（' + String(e && e.message || e).slice(0, 120) + '）';
    }
  }
  const msg = fmtDateTime_(new Date()) + ' に戻しました（登録一覧' + (staffB ? '・入力シート『' + staffB.tab + '』' : '') + linkNote + fsNote + '）';
  sh.getRange(row, TRASH_C.state).setValue(TRASH_STATE.RESTORED);
  sh.getRange(row, TRASH_C.result).setValue(msg);
  return { ok: !/戻せませんでした/.test(fsNote), msg };
}
/** 『削除済み』を編集したとき：「復帰」にチェックした行を戻し、チェックを外す */
function onTrashEdit_(ss, sheet, range) {
  if (range.getColumn() > TRASH_C.restore || range.getLastColumn() < TRASH_C.restore) return;
  const r1 = Math.max(2, range.getRow()), r2 = range.getLastRow();
  if (r2 < r1) return;
  const vals = sheet.getRange(r1, TRASH_C.restore, r2 - r1 + 1, 1).getValues();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) { toastOrLog_('ほかの処理が動いています。少し待ってから、もう一度チェックしてください'); return; }
  try {
    vals.forEach((v, i) => {
      if (!isChecked_(v[0])) return;
      const row = r1 + i;
      let res;
      try { res = restoreDeleted_(ss, row); } catch (e) { res = { ok: false, msg: String(e && e.message || e) }; }
      sheet.getRange(row, TRASH_C.restore).setValue(false);
      if (!res.ok) sheet.getRange(row, TRASH_C.result).setValue('✗ ' + res.msg);
      toastOrLog_((res.ok ? '復帰：' : '戻せません：') + res.msg);
    });
  } finally {
    lock.releaseLock();
  }
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
    const msg = 'ほかの処理（15分ごとの自動実行など）が動いています。少し待ってから、もう一度押してください。';
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
/** 近さを比べる用のキー：companyKey_ に加えて「様」「御中」・記号（・.,、。-_ など）も無視する */
function companyLooseKey_(name) {
  return companyKey_(name).replace(/\(株\)|\(有\)|様$|御中$/g, '').replace(/[・.,、。\-_'"()\[\]（）「」]/g, '');
}
/** 文字の違いの数（編集距離） */
function editDistance_(a, b) {
  const m = a.length, n = b.length;
  let prev = [];
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
/**
 * 会社名 → 工程図の顧客マスタの表記（純ロジック。工程図を正とする）。
 * ① そのまま一致 ② 「株式会社」・全角半角・空白などの違いだけ ③ 記号・「様」の違い
 * ④ 片方がもう片方を含む（3文字以上）⑤ 1〜2文字の打ち間違い（8割以上同じ）。
 * ③〜⑤ は候補が1社に決まるときだけ使う。見つからなければ null
 */
function resolveCompanyName_(name, master) {
  const n = trimStr_(name);
  if (!n) return null;
  const list = (master || []).map(c => trimStr_(c && c.company)).filter(Boolean);
  if (list.indexOf(n) >= 0) return n;
  const k = companyKey_(n);
  const strict = list.filter(x => companyKey_(x) === k);
  if (strict.length) return strict[0];
  const lk = companyLooseKey_(n);
  if (!lk) return null;
  const one = (arr) => (arr.length === 1 ? arr[0] : null);
  const loose = one(list.filter(x => companyLooseKey_(x) === lk));
  if (loose) return loose;
  const contains = one(list.filter(x => { const y = companyLooseKey_(x); return Math.min(y.length, lk.length) >= 3 && (y.indexOf(lk) >= 0 || lk.indexOf(y) >= 0); }));
  if (contains) return contains;
  if (lk.length < 4) return null;
  const close = list.map(x => { const y = companyLooseKey_(x); return { x, r: 1 - editDistance_(lk, y) / Math.max(lk.length, y.length) }; })
    .filter(o => o.r >= 0.8).sort((a, b) => b.r - a.r);
  return close.length && (close.length === 1 || close[0].r > close[1].r) ? close[0].x : null;
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
  const added = [];
  const similar = [];
  (names || []).forEach(n => {
    const name = trimStr_(n);
    if (!name || exact.has(name) || added.indexOf(name) >= 0) return;
    const hit = resolveCompanyName_(name, master);
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
    // 工程図を正とし、『会社マスタ』の「工程図の会社名」を工程図の表記に書き換える
    const fixed = fixCompanyMasterNames_(ss, res.similar);
    lines.push('表記が少し違う会社は、工程図の表記に合わせました（『会社マスタ』を ' + fixed + ' か所直しました）：');
    res.similar.forEach(x => lines.push('   ' + x.name + ' → 「' + x.existing + '」'));
  }
  return { ok: true, added: res.added, similar: res.similar, text: lines.join('\n') };
}

/** 『会社マスタ』の「工程図の会社名」列で、similar（[{ name, existing }]）の name を existing に書き換える。直した数を返す */
function fixCompanyMasterNames_(ss, similar) {
  const sheet = ss.getSheetByName(SHEET.COMPANY);
  if (!sheet || sheet.getLastRow() < 2) return 0;
  const head = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(v => trimStr_(v));
  const c = head.indexOf('工程図の会社名') + 1;
  if (!c) return 0;
  const vals = sheet.getRange(2, c, sheet.getLastRow() - 1, 1).getValues();
  let n = 0;
  vals.forEach((v, i) => {
    const hit = similar.find(x => x.name === trimStr_(v[0]));
    if (hit) { sheet.getRange(i + 2, c).setValue(hit.existing); n++; }
  });
  return n;
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
  // 2026-11-04 より前の『入力シート』は、そのまま『入力前』にする
  if (!sheet && staff.getSheetByName(STAFF_TAB_OLD)) { sheet = staff.getSheetByName(STAFF_TAB_OLD); sheet.setName(STAFF_TAB_DEFAULT); how = 'renamed'; }
  if (!sheet) {
    // 旧レイアウトのタブ（product schedule・予想時間など）や記入例のタブは使わない。今の列がそろった見出しを持つタブだけを使う
    const reuse = staff.getSheets().filter(sh => [STAFF_RULES_TAB, STAFF_TAB_DOING, STAFF_TAB_DONE].indexOf(sh.getName()) < 0 && hasStaffInputHeaders_(sh))[0];
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
  // 制作中・制作済みのタブ（入力前と同じ列。行は自動で移る）
  [STAFF_TAB_DOING, STAFF_TAB_DONE].forEach((name, i) => {
    let tab = staff.getSheetByName(name);
    if (!tab) {
      const at = staff.getSheets().map(sh => sh.getName()).indexOf(STAFF_TAB_DEFAULT) + 1 + i;
      tab = staff.insertSheet(name, at);
    }
    if (tab.getLastRow() === 0 || findStaffHeaderRow_(tab) < 0) {
      const head = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
      ensureSize_(tab, 2, head.length);
      tab.getRange(2, 1, 1, head.length).setValues([head]);
    }
    formatStaffInputTab_(tab, findStaffHeaderRow_(tab), { codes, views: viewCodeOptions_(views) });
  });
  writeStaffRulesTab_(staff, views);
  writeSetting_(ss, 'tabName', STAFF_TAB_DEFAULT);
  writeSetting_(ss, 'startRow', 2);
  const where = '「' + staff.getName() + '」';
  const head = how === 'created' ? where + 'に入力タブ『' + STAFF_TAB_DEFAULT + '』を作りました。'
    : how === 'renamed' ? where + 'の入力用タブの名前を『' + STAFF_TAB_DEFAULT + '』に合わせました。'
    : where + 'の『' + STAFF_TAB_DEFAULT + '』タブを整えました。';
  return head + '『' + STAFF_TAB_DOING + '』『' + STAFF_TAB_DONE + '』タブも用意し、見出しを日本語・ベトナム語の2段にし、プルダウン（会社コード ' + codes.length + ' 社・新規or修正・視点 ' + viewKeywords_(views).join('/') + '・パターン・時間）を付け、『' +
    STAFF_RULES_TAB + '』タブを書き直しました。（『設定』のタブ名を「' + STAFF_TAB_DEFAULT + '」、取込開始行を 2 にしました）';
}

/**
 * 今のレイアウトの入力シートに、後から増えた列（翻訳済み・翻訳メモ・作業の分け方・合計・登録No）が無ければ右端に足す。
 * 既存の列は動かさない。戻り値は列番号の対応（mapStaffColumns_ と同じ形）
 */
function ensureStaffExtraColumns_(sheet, headerRow) {
  let lastCol = Math.max(sheet.getLastColumn(), 1);
  let sc = mapStaffColumns_(sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0]);
  // 2026-11-04：White を「White躯体」「White家具」に分けた。前の『White』列は White躯体 にして、そのすぐ右に White家具 を差し込む
  if (sc.white && !sc.whiteBody && sc.number) {
    const body = STAFF_INPUT_COLUMNS.find(d => d.key === 'whiteBody');
    const furn = STAFF_INPUT_COLUMNS.find(d => d.key === 'whiteFurn');
    sheet.getRange(headerRow, sc.white).setValue(body.label + '\n' + body.vi);
    sheet.insertColumnAfter(sc.white);
    sheet.getRange(headerRow, sc.white + 1).setValue(furn.label + '\n' + furn.vi);
    lastCol = Math.max(sheet.getLastColumn(), 1);
    sc = mapStaffColumns_(sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0]);
  }
  const missing = STAFF_INPUT_COLUMNS.filter(d => !sc[d.key]);
  if (!missing.length) return sc;
  ensureSize_(sheet, headerRow, lastCol + missing.length);
  sheet.getRange(headerRow, lastCol + 1, 1, missing.length).setValues([missing.map(d => d.label + '\n' + d.vi)]);
  return mapStaffColumns_(sheet.getRange(headerRow, 1, 1, lastCol + missing.length).getValues()[0]);
}

/** 入力シートの合計の式（R1C1）：White躯体＋White家具＋Color＋pts（分ける前は White＋Color＋pts）。列が足りなければ '' */
function staffTotalFormula_(sc) {
  if (!(sc.whiteBody || sc.white) || !sc.color || !sc.other) return '';
  const refs = (sc.whiteBody ? 'RC' + sc.whiteBody + ',RC' + sc.whiteFurn : 'RC' + sc.white) + ',RC' + sc.color + ',RC' + sc.other;
  return '=IF(COUNT(' + refs + ')=0,"",SUM(' + refs + '))';
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
    case 'white': case 'whiteBody': case 'whiteFurn': case 'color': case 'other':
      return list(HOUR_OPTIONS, true, '時間（h）/ Số giờ');
    case 'translated': case 'delReq':
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
    // 黄色＝エンジニア・通訳が入力する列、灰色＝自動・管理者が入れる列（触らない）
    head.setNote(def.note).setFontWeight('bold').setBackground(def.input ? '#fff2cc' : '#e6e6e6').setWrap(true).setVerticalAlignment('middle');
    sheet.getRange(start, c, n, 1).setBackground(def.input ? null : '#f3f3f3');
    sheet.setColumnWidth(c, def.width * 9);
    const rule = staffValidation_(def.key, choices);
    if (rule) sheet.getRange(start, c, n, 1).setDataValidation(rule);
    if (def.hours) sheet.getRange(start, c, n, 1).setNumberFormat('0.##');
    // 合計は式（White＋Color＋pts）。値はスクリプトから書かない
    if (def.key === 'total' && staffTotalFormula_(sc)) sheet.getRange(start, c, n, 1).setFormulaR1C1(staffTotalFormula_(sc));
    if (def.datetime) sheet.getRange(start, c, n, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  });
  if (isCurrent) sheet.setRowHeight(headerRow, 42);
  // 見出しの上に1行の案内を書く（タブごとの説明。書き方の本文は『記入ルール/説明』タブ）
  const hint = STAFF_TAB_HINTS[sheet.getName()];
  const above = headerRow >= 2 ? sheet.getRange(headerRow - 1, 1, 1, lastCol).getValues()[0] : null;
  if (above && (hint || above.every(v => trimStr_(v) === ''))) {
    const old = trimStr_(above[0]);
    if (hint && (old === '' || old.indexOf('1視点') === 0 || Object.keys(STAFF_TAB_HINTS).some(k => old === STAFF_TAB_HINTS[k]))) sheet.getRange(headerRow - 1, 1).setValue(hint).setFontColor('#555555');
    else if (!hint && old === '') sheet.getRange(headerRow - 1, 1).setValue(STAFF_INPUT_HINT).setFontColor('#555555');
  }
  if (headerRow <= 3) sheet.setFrozenRows(headerRow); // 上に長い書き方がある旧レイアウトは固定しない（画面が埋まるため）
}

// 『記入ルール/説明』タブの本文。[種類, 日本語, ベトナム語]。種類: title=表題 / h=見出し / 空=本文（日本語の下にベトナム語）
const STAFF_RULES_LINES = [
  ['title', '【記入ルール】工程図 エンジニア入力シート', '【Quy tắc nhập liệu】Bảng nhập của kỹ sư (工程図)'],
  ['h', '■ 基本', '■ Cơ bản'],
  ['', '・黄色の列だけ入力します。灰色の列（会社コード・案件番号・視点・パターン・登録No・納品名など）は管理者が登録したもの・自動で入るものなので、触らないでください。',
    '・Chỉ nhập vào các cột màu vàng. Các cột màu xám (Mã công ty, Số dự án, Góc nhìn, Phương án, Mã đăng ký, Tên file giao…) do quản lý đăng ký hoặc tự động điền, không được sửa.'],
  ['', '・管理者が登録すると『入力前』タブに1視点＝1行で入ります。行を足したり消したりしないでください。',
    '・Khi quản lý đăng ký, mỗi góc nhìn = 1 dòng sẽ xuất hiện ở tab『入力前』. Không thêm hoặc xóa dòng.'],
  ['', '・時間は h（時間）で、リストから選びます（0.5 刻み）。リストに無い時間は数字を直接入力できます。',
    '・Thời gian tính bằng giờ (h), chọn từ danh sách (bước 0.5). Nếu không có trong danh sách thì nhập số trực tiếp.'],
  ['h', '■ タブの流れ', '■ Luồng các tab'],
  ['', '『入力前』：翻訳・制作時間を入れる視点。時間がそろって15分たつと、工程図に登録されて『制作中』へ自動で移ります。',
    '『入力前』(Chưa nhập xong): góc nhìn cần dịch và nhập số giờ. Khi đủ số giờ 15 phút, sẽ tự động đăng ký vào 工程図 và chuyển sang『制作中』.'],
  ['', '『制作中』：工程図に登録済みで制作中の視点。工程図で完了になると『制作済み』へ自動で移ります。',
    '『制作中』(Đang làm): góc nhìn đã đăng ký vào 工程図. Khi hoàn thành trên 工程図 sẽ tự động chuyển sang『制作済み』.'],
  ['', '『制作済み』：工程図で完了になった視点（記録として残します。消さないでください）。',
    '『制作済み』(Đã xong): góc nhìn đã hoàn thành trên 工程図 (lưu lại làm hồ sơ, không xóa).'],
  ['h', '■ 黄色の列の書き方', '■ Cách nhập các cột màu vàng'],
  ['', '翻訳済み：通訳が資料を翻訳してエンジニアに伝えたらチェック（翻訳日時は自動で入ります）', 'Đã dịch: phiên dịch đánh dấu khi đã dịch tài liệu và truyền đạt cho kỹ sư (thời gian tự động ghi)'],
  ['', '翻訳メモ：通訳がお客様の指示の訳・注意点を書く（「管理者からの連絡」も必ず読む）', 'Ghi chú dịch: phiên dịch ghi nội dung dịch yêu cầu của khách, lưu ý (hãy đọc kỹ「Lời nhắn từ quản lý」)'],
  ['', 'White躯体：躯体（建物・外構など）のホワイトまでの制作時間（モデル作成の行はモデル制作時間）', 'Trắng – kết cấu: số giờ làm phối cảnh trắng phần kết cấu (tòa nhà, ngoại cảnh…) (dòng dựng model: số giờ dựng model)'],
  ['', 'White家具：家具・設備のホワイトまでの制作時間（無ければ空欄）', 'Trắng – nội thất: số giờ làm phối cảnh trắng phần đồ nội thất (không có thì để trống)'],
  ['', 'Color：色付きパースまでの制作時間（White の時間は含めない）', 'Màu: số giờ làm phối cảnh màu (không tính số giờ Trắng)'],
  ['', 'pts：写真合成・フォトショップ作業（人物・点景など）の時間', 'Ghép ảnh: số giờ ghép ảnh / làm Photoshop (người, cây, xe…)'],
  ['', 'メモ：制作上の注意点など（自由記入）', 'Ghi chú: lưu ý khi thực hiện (nhập tự do)'],
  ['', '作業の分け方：分けて作業できるときに書く（例 White＝躯体 3h／家具1 2h）。工程図ではこの作業ごとに分かれます。分けた時間の合計は White などの時間と同じにしてください',
    'Cách chia công việc: ghi khi có thể chia việc (VD: White = kết cấu 3h / nội thất 1 2h). 工程図 sẽ chia theo từng việc. Tổng giờ phải bằng số giờ Trắng…'],
  ['', '時間入力者：制作時間を決めた人の名前（時間入力日時・合計は自動で入ります）', 'Người nhập giờ: tên người quyết định số giờ (thời gian nhập và tổng tự động ghi)'],
  ['', '削除依頼：登録の間違い・二重登録などで行を消してほしいときにチェック。管理者が確認して消します（行は自分で消さない）',
    'Yêu cầu xóa: đánh dấu khi muốn xóa dòng (đăng ký nhầm, trùng…). Quản lý sẽ kiểm tra và xóa (không tự xóa dòng)'],
  ['h', '■ 納品名', '■ Tên file giao'],
  ['', '納品名は自動で入ります（社外案件名_社外視点名_YYMMDD）。YYMMDD を納品する日（例 261104）に書き換えて使ってください。',
    'Tên file giao được tự động điền (Tên dự án_Tên góc nhìn_YYMMDD). Khi dùng, hãy đổi YYMMDD thành ngày giao (VD: 261104).'],
  ['', '※ 連絡文の期限を過ぎても時間が空だと Discord で催促が届きます', '※ Nếu quá hạn trong tin nhắn mà vẫn chưa có số giờ, sẽ có nhắc nhở qua Discord'],
  ['h', '■ 視点コードの読み方（灰色の「視点」列）', '■ Cách đọc mã góc nhìn (cột「Góc nhìn」màu xám)'],
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
  lines.push('✓ 管理者シート（案件登録・登録一覧・連携・案件マスタ・会社マスタ・視点マスタ・設定・使い方）を整えました。');
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
      lines.push('✓ ' + co.text);
    } catch (e) {
      ok = false;
      lines.push('✗ 工程図の顧客マスタに会社を追加できませんでした：' + String(e && e.message || e));
    }
  }
  if (ok) {
    try {
      installAutoTrigger_();
      lines.push('✓ 15分ごとの自動実行を設定しました（入力シートに変わりがあれば転記し、' +
        (readSettings_().autoSend ? '状態が「未送信」の行は工程図に自動登録します。「要確認」の行は直して「工程図へ」にチェックすると次の自動実行で登録されます）。' : '自動登録は『設定』で「しない」になっているので転記だけです）。'));
    } catch (e) {
      ok = false;
      lines.push('✗ 15分ごとの自動実行を設定できませんでした：' + String(e && e.message || e));
    }
  } else {
    lines.push('・15分ごとの自動実行は、✗ が無くなってから設定します。');
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
  ensureEntrySheet_(ss, masters);
  ensureFormSheet_(ss, masters, false);

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
  cfg.calcHours = trimStr_(cfg.calcHours);
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
  '0. いちばん手軽なのは『案件入力』タブ（縦型のフォーム）。上から案件の項目を書き、①で視点（外観目線・内観目線…）の番号にチェックすると②に1行ずつ並びます。②では視点ごとに部屋名（2F など。「2F,3F」で部屋ごとの行に）・パターン（＋で足す）・社外視点名を直せます。「前回の視点を呼び出す」にチェックすると、同じ案件で前回登録した視点が入ります。登録した内容を直すときは「登録Noで直す」に登録No（R0002 など）を入れると、その登録が呼び出されます。直して「登録」にチェックすると上書きし、エンジニア入力シートも直ります（①で足した視点は新しく登録）。最後に「登録」にチェックすると通訳へのメッセージを書く画面が出て、「登録する」で『登録一覧』とエンジニア入力シートに載ります（入力シートの視点は EXE1_2F のようなコード）。',
  '   メニュー「工程図連携 → 案件を登録（入力画面）」の小さな画面からも、同じように登録できます。',
  '1. 管理者がこのファイルの『案件登録』タブ（入力専用）に1視点1行で書く：会社コード・案件番号・社外案件名・担当者・新規or修正・視点・パターン・サーバーリンク・納期・注文書・管理者メモ（黄色い見出しの列）。「状態」に足りない項目が出ます。',
  '2. 書き終えたら「登録」にチェックします。登録No（R0001…）が付き、エンジニア入力シートへ 会社コード・案件番号・社外案件名・サーバーリンク・新規or修正・視点・パターン と「登録No」だけを写し、行は『登録一覧』へ移ります（『案件登録』からは消え、次の案件を書ける）。担当者・納期・注文書・管理者メモは入力シートへ写しません。足りない項目があるとチェックが外れます。',
  '3. 通訳が入力シートの「翻訳済み」にチェック（訳は「翻訳メモ」へ。「翻訳日時」は自動）→ エンジニアが White・Color・pts と「作業の分け方」「時間入力者」を書く（「時間入力日時」「合計」は自動）。',
  '4. 翻訳済み・時間・作業の分け方は『登録一覧』の灰色の列に読み戻され、「状態」が 翻訳待ち → 時間計算待ち → 時間入力済み と進みます。',
  '5. 連絡文の期限（登録日時＋「制作時間の計算の期限」）を過ぎても時間が空なら Discord で催促し、以降1時間ごとにくり返します（『設定』で時間・時間帯を変えられます。Webhook はメニュー「Discord 通知の設定」）。',
  '6. 時間が入った行は『連携』へ転記され、最後に変わってから15分たつと工程図に登録されます（新しい行だけ追加）。『登録一覧』の担当者・納期が工程図に入ります。登録した後でエンジニアが時間などを直したら、状態を「更新あり」にして Discord で確認を頼みます（自動では書き換えない。よければ『連携』の「工程図へ」にチェック）。',
  '7. 工程図で決まった納品名（ファイル名）は、『登録一覧』と入力シートの「納品名」列に自動で表示されます（工程図で納品名を直すと、次の自動実行で追従）。',
  '・「連絡文」列に、エンジニア・通訳へ送る文が自動で入ります（同じ案件・同じ入力日の視点は1通）。行を選んでメニュー「連絡文をコピー」を押すと、コピーや Discord への送信ができます。文面は『設定』の「登録時の連絡文」で変えられます。',
  '・手動連携：『登録一覧』の「今すぐ連携」にチェックすると、その行をすぐ入力シートへ写します。『設定』の「今すぐ全部連携」にチェックすると、案件登録→入力シート・転記・工程図への登録をまとめてその場で動かします（どちらも終わるとチェックは外れます）。',
  '・通訳へのメッセージ：『登録一覧』（または登録前の『案件登録』）の「通訳へのメッセージ」に書くと、入力シートの「管理者からの連絡」に写り、「通訳向け連絡文」（ひな形は『設定』の「通訳向けの連絡文」）にも入ります。メニュー「連絡文をコピー」では、エンジニア向けと通訳向けの2つを出します。',
  '・「作業の分け方」（例 White＝躯体 3h／家具1 2h／家具2 1h）が書いてあると、工程図ではその作業ごとのステップ（ホワイト（躯体）…）に分けて登録します。分けた時間の合計が White などの時間と合わないときは分けずに登録し、「結果」に書きます。',
  '・担当者：『登録一覧』（『連携』）の担当者 → その視点の前回の担当者 → 『設定』の「既定の担当者（ホワイト／カラー／pts／写真合成・モデル・VR・動画）」→「既定の担当者」の順に決まります。',
  '・工程図で「サポート（分担）」した作業は、シートから送り直しても時間を戻しません。',
  '・『案件登録』で会社コード・視点などを直すと、入力シートの行も直ります。入力シートの行を消すと、状態が「入力シートに無い」になります（もう一度写したいときは登録Noを消す）。',
  '',
  '■ エンジニアが書く場所',
  '「工程図 エンジニア入力シート」の『入力シート』タブ。書き方は同じファイルの『記入ルール/説明』タブ（日本語・ベトナム語の併記。メニュー「0. かんたん初期設定」で整います）。',
  '列: 会社コード（REN・RIC…）/ 案件番号 / 社外案件名 / サーバーリンク / 新規or修正 / 視点（『視点マスタ』のキーワード＋番号。EX1・IN1・EXCB1…）/ パターン（A・B…）/ White / Color / pts / メモ / 翻訳済み / 翻訳日時 / 翻訳メモ / 作業の分け方 / 時間入力者 / 時間入力日時 / 合計 / 登録No / 納品名',
  '1視点（パターン違いも別）1行。依頼のたびに行を足します。会社コード＋案件番号は「RIC.34」のように1つの社内案件名として扱います。',
  '会社コード・視点のプルダウンは『会社マスタ』『視点マスタ』から作ります。マスタを変えたらメニュー「エンジニア入力シートを整える」を押してください。',
  '',
  '■ 自動で動くこと（15分ごと）',
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
  '・メニュー「0. かんたん初期設定」を押す（管理者シートの整備・読み込み先の切り替え・エンジニア入力シートの整備・接続テスト・顧客マスタへの会社の追加・15分ごとの自動実行の設定をまとめて行います）。',
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
