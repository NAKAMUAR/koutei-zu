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
 *   2. 「転記」で『連携』タブへ新しい行だけ追加し（入力日＝最初に転記した日を自動で入れる）、
 *      『案件マスタ』『会社マスタ』『視点マスタ』で 会社名・お客様担当者・区分（外観/内観）・
 *      種類（パース/写真合成/モデル）・社外視点名（外観視点①）を自動判定。記入途中の行（時間が空など）は待つ
 *   3. 人が『連携』タブで不足・紐づけ違い（お客様名・社内担当者・納期など）を直し、「工程図へ」にチェック
 *   4. 「工程図へ送信」で、チェック済みの行を工程図（Firestore）にタスクとして登録
 *      - White → 「ホワイト」、Color → 「カラー」、pts → 「人物＋添景合成」のステップ
 *      - 写真合成（P1…）・モデル（EXM1/INM1）は1ステップ（時間は合計）
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
const SHEET = { LINK: '連携', COMPANY: '会社マスタ', VIEW: '視点マスタ', PROJECT: '案件マスタ', SETTINGS: '設定', HOWTO: '使い方' };
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
};
// 旧バージョンの見出し（そのまま使えるように別名として受け付ける）
const H_ALIASES = { cut: ['カット名'], white: ['White時間'], color: ['Color時間'] };
const LINK_HEADER_ORDER = ['key', 'status', 'send', 'inputDate', 'code', 'name', 'cut', 'pattern', 'extName', 'round', 'request', 'deadline',
  'white', 'color', 'other', 'item', 'note', 'company', 'contact', 'category', 'kind', 'stepKind', 'assignee', 'memo', 'exclude',
  'transferredAt', 'sentAt', 'result', 'srcRow', 'link'];

const STATUS = { NEW: '未送信', CHECK: '要確認', UPDATED: '更新あり', SENT: '登録済み', ERROR: 'エラー', GONE: '元シートから消えた' };
const KIND = { PERS: 'パース', PHOTO: '写真合成', MODEL: 'モデル' };
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
  projectId: 'FirebaseプロジェクトID',
  workspaceId: 'ワークスペースID',
};
const SETTING_DEFAULTS = {
  fileId: '1BjPKtiHLsYuWcyKLg8FzB4zhmhq5Y5kI8Z2JOXVJuyo', // 「工程図 エンジニア入力シート」
  tabName: STAFF_TAB_DEFAULT,
  startRow: 2,
  defaultAssignee: '未割当',
  projectId: 'koutei-zu',
  workspaceId: 'liebe-asia-team',
};
const SETTING_NOTES = {
  fileId: '「工程図 エンジニア入力シート」のURLの /d/ と /edit の間の文字列',
  tabName: 'エンジニアが書くタブの名前（見出し「会社コード」「案件番号」の行より下を読みます）',
  startRow: 'この行より上は取り込みません。旧レイアウト『案件シート(一覧)』を読むときは 4800 などにする',
  defaultAssignee: '『連携』の担当者が空のときに使う名前。工程図で後から変更できます',
  projectId: '通常は変更不要',
  workspaceId: '通常は変更不要',
};

const PROP_SERVICE_ACCOUNT = 'SERVICE_ACCOUNT_JSON';

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
    note: 'EX1 外観目線① / IN1 内観目線① / EXCB1 外観鳥瞰① / INCM1 内観鳥瞰① / P1 写真合成① / EXM1 モデル（外観）/ INM1 モデル（内観）。末尾の数字＝①②…\n' +
      'EX1 ngoại thất tầm mắt ① / IN1 nội thất tầm mắt ① / EXCB1 ngoại thất chim bay ① / INCM1 nội thất chim bay ① / P1 ghép ảnh ① / EXM1 model ngoại thất / INM1 model nội thất. Số cuối = ①②…' },
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
];
const STAFF_INPUT_HEADERS = STAFF_INPUT_COLUMNS.map(c => c.label);
// 『入力シート』1行目の案内（見出しの上が空のときだけ書く）
const STAFF_INPUT_HINT = '1視点（パターン違いも別）＝1行。書き方は『' + STAFF_RULES_TAB + '』タブ ／ Mỗi góc nhìn (phương án khác cũng tách riêng) = 1 dòng. Xem cách nhập ở tab『' + STAFF_RULES_TAB + '』';
// プルダウンの選択肢
const REQUEST_OPTIONS = ['新規 / Mới', '修正 / Sửa'];
const PATTERN_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];
// 視点コード：[英字, 個数, 日本語, ベトナム語]（EX1〜EX10 のようにプルダウンに並べる。リストに無いコードも入力はできる）
const VIEW_CODES = [
  ['EX', 10, '外観目線視点', 'ngoại thất – góc nhìn ngang tầm mắt'],
  ['IN', 20, '内観目線視点', 'nội thất – góc nhìn ngang tầm mắt'],
  ['EXCB', 5, '外観鳥瞰視点', 'ngoại thất – góc nhìn chim bay'],
  ['INCM', 5, '内観鳥瞰視点', 'nội thất – góc nhìn chim bay'],
  ['P', 10, '写真合成視点', 'ghép ảnh'],
  ['EXM', 5, 'モデル作成（外観部）', 'dựng model – phần ngoại thất'],
  ['INM', 5, 'モデル作成（内観部）', 'dựng model – phần nội thất'],
];
const VIEW_CODE_OPTIONS = [].concat.apply([], VIEW_CODES.map(v => Array.from({ length: v[1] }, (_, i) => v[0] + (i + 1))));
// 時間：0〜10 は 0.5 刻み、11〜40 は 1 刻み（リストに無い数字も入力はできる）
const HOUR_OPTIONS = Array.from({ length: 21 }, (_, i) => String(i / 2)).concat(Array.from({ length: 30 }, (_, i) => String(i + 11)));

// 『会社マスタ』『視点マスタ』が空のときに「初期設定」で入れる初期値（シート上で自由に直してよい）
// [案件コードの英字部分, 工程図の会社名, 備考, 入力シートに出さない（表記ゆれは TRUE ＝エンジニアのプルダウンに出さない）]
const INITIAL_COMPANY_MASTER = [
  ['REN', 'リノべる株式会社', '工程図の既定の会社順にある表記。顧客マスタの表記と違えば直す', false],
  ['RENOBERU', 'リノべる株式会社', '同上（表記ゆれ）', true],
  ['RENOVERU', 'リノべる株式会社', '同上（表記ゆれ）', true],
  ['SUM', 'SUMUS', '', false],
  ['SUMUS', 'SUMUS', '表記ゆれ', true],
  ['TAMAZEN', 'TAMAZEN', '要確認：工程図側が「玉善」表記なら直す', false],
  ['OFFICE', 'オフィスコム', '', false],
  ['TANAKA', '田中建設', '', false],
  ['TANAK', '田中建設', '表記ゆれ（TANAK.284 など）', true],
  ['CG', 'CG工房', '', false],
  ['RIC', '株式会社リックデザイン', '要確認：サーバリンクのフォルダ名から。工程図の表記に合わせる', false],
  ['DESIGN', 'デザイン経営研究舎', '要確認：サーバリンクのフォルダ名から', false],
  ['CONTE', '', '要確認：工程図の会社名を入力', false],
  ['SAN', '', '要確認：工程図の会社名を入力', false],
  ['ATO', '', '要確認：工程図の会社名を入力', false],
  ['GRAY', '', '要確認：工程図の会社名を入力', false],
  ['ALEG', '', '要確認：工程図の会社名を入力', false],
  ['ESAKI', '', '要確認：工程図の会社名を入力', false],
  ['WUNDER', '', '要確認：工程図の会社名を入力', false],
];
// [キーワード, 区分, 種類, 社外名, 備考]
const INITIAL_VIEW_MASTER = [
  ['EX', '外観', 'パース', '外観視点', 'EX1 → 外観視点①。先に書いた行が優先'],
  ['IN', '内観', 'パース', '内観視点', 'IN2 → 内観視点②。HOTEL_IN1(D), CAFE_IN2 なども IN として判定'],
  ['EXCB', '外観', 'パース', '外観鳥瞰視点', 'EXCB1 → 外観鳥瞰視点①'],
  ['INCM', '内観', 'パース', '内観鳥瞰視点', 'INCM1 → 内観鳥瞰視点①'],
  ['INCB', '内観', 'パース', '内観鳥瞰視点', 'INCM の書き方ゆれ'],
  ['EXM', '外観', 'モデル', '外観モデル', 'EXM1 → モデル作成（外観部）。時間の合計を1ステップ「モデル作成」で登録'],
  ['INM', '内観', 'モデル', '内観モデル', 'INM1 → モデル作成（内観部）'],
  ['LDK', '内観', 'パース', '内観視点', 'A-LDK2, 七番町ⅣT2_LDK1 など'],
  ['BED', '内観', 'パース', '内観視点', ''],
  ['LAVABO', '内観', 'パース', '内観視点', ''],
  ['KITCHEN', '内観', 'パース', '内観視点', ''],
  ['BATH', '内観', 'パース', '内観視点', ''],
  ['ENTRANCE', '内観', 'パース', '内観視点', ''],
  ['LOBBY', '内観', 'パース', '内観視点', ''],
  ['FRONT', '内観', 'パース', '内観視点', ''],
  ['CAFE', '内観', 'パース', '内観視点', ''],
  ['RESTAURANT', '内観', 'パース', '内観視点', ''],
  ['HOTEL', '内観', 'パース', '内観視点', ''],
  ['ROOM', '内観', 'パース', '内観視点', ''],
  ['WC', '内観', 'パース', '内観視点', ''],
  ['TOILET', '内観', 'パース', '内観視点', ''],
  ['P', '', '写真合成', '写真合成視点', 'P1 → 写真合成視点①（P-1 も可。制作項目に「写真」「合成」があれば自動で写真合成）'],
  ['PHOTO', '', '写真合成', '写真合成', ''],
  ['CAD', '', '', '', '要確認：CAD図の扱いは人が判断（種類が空なので「要確認」になります）'],
  ['AREA', '', '', '', '要確認：オフショア案件の area1… は人が判断'],
  ['CAM', '', '', '', '要確認'],
  ['VR', '', '', '', '要確認'],
];
const COMPANY_MASTER_HEADERS = ['案件コードの英字部分', '工程図の会社名', '備考', '入力シートに出さない'];
const COMPANY_HIDE_HEADER = COMPANY_MASTER_HEADERS[3];
const VIEW_MASTER_HEADERS = ['カット名のキーワード', '区分', '種類', '社外名', '備考'];
// 2026-09 の入力シートで増えた視点コード。既存の『視点マスタ』に無ければ「初期設定」で下に追加する
const ADDED_VIEW_KEYWORDS = ['EXCB', 'INCM', 'INCB', 'EXM', 'INM'];
const PROJECT_MASTER_HEADERS = ['社内案件名', '社外案件名', '会社名', 'お客様担当者', '備考'];

// ============ メニュー ============
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('工程図連携')
    .addItem('0. かんたん初期設定（最初に1回だけ）', 'quickSetup')
    .addSeparator()
    .addItem('1. エンジニア入力シートから転記', 'transferFromStaffSheet')
    .addItem('2. 工程図へ送信', 'sendToKoutei')
    .addItem('送信内容のプレビュー（書き込まない）', 'previewSend')
    .addSeparator()
    .addItem('工程図の会社名一覧を取り込む', 'fetchCompanyNames')
    .addItem('工程図との接続テスト', 'testConnection')
    .addSeparator()
    .addItem('初期設定（タブ・チェックボックスを整える）', 'setupSheet')
    .addItem('エンジニア入力シートを整える（会社コードのプルダウン更新）', 'createStaffInputTab')
    .addItem('秘密鍵を設定（接続テストが失敗する場合のみ）', 'setServiceAccountKey')
    .addItem('秘密鍵を削除', 'clearServiceAccountKey')
    .addToUi();
}

// ============ 1. 転記 ============
function transferFromStaffSheet() {
  const cfg = readSettings_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const link = ensureLinkSheet_(ss);
  const col = headerMap_(link);
  const masters = readMasters_(ss);

  const staffRows = readStaffRows_(cfg);
  const sourceRows = collectSourceRows_(staffRows);

  const data = link.getDataRange().getValues();
  const byKey = new Map();
  for (let r = 1; r < data.length; r++) {
    const k = String(data[r][col.key - 1] || '');
    if (k) byKey.set(k, r);
  }

  const now = new Date();
  const stamp = fmtDateTime_(now);
  const today = fmtYMD_(now);
  const appends = [];
  const cellUpdates = []; // { row(1-based), col, value }
  let updated = 0;
  const seen = new Set();

  sourceRows.forEach(s => {
    seen.add(s.key);
    if (byKey.has(s.key)) {
      const r = byKey.get(s.key);
      const cur = data[r];
      const fields = { code: s.code, cut: s.cut, pattern: s.pattern, request: s.request, deadline: s.deadline, white: s.white, color: s.color, other: s.other, item: s.item, note: s.note, srcRow: s.srcRow, link: s.link };
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
      // 一度消えた行（時間を消して書き直した等）がまた出てきたら、内容が同じでも未送信に戻す
      if (status === STATUS.GONE) cellUpdates.push({ row: r + 1, col: col.status, value: STATUS.NEW });
      return;
    }
    const j = judgeRow_(s, masters);
    const rowObj = {
      key: s.key, status: j.status, send: false, inputDate: today, // 入力日＝最初に転記した日（あとの転記では変えない）
      code: s.code, name: j.name, cut: s.cut, pattern: s.pattern, extName: j.extName, round: s.round, request: s.request, deadline: s.deadline,
      white: s.white, color: s.color, other: s.other, item: s.item, note: s.note,
      company: j.company, contact: j.contact, category: j.category, kind: j.kind, stepKind: j.stepKind,
      assignee: '', memo: '', exclude: false,
      transferredAt: stamp, sentAt: '', result: j.note, srcRow: s.srcRow, link: s.link,
    };
    appends.push(rowObjToArray_(rowObj, col));
  });

  // 元シートから消えた（完了チェック・削除・取込開始行より上になった）未送信行に印を付ける
  byKey.forEach((r, k) => {
    if (seen.has(k)) return;
    const status = String(data[r][col.status - 1] || '');
    if (status === STATUS.NEW || status === STATUS.CHECK) cellUpdates.push({ row: r + 1, col: col.status, value: STATUS.GONE });
  });

  cellUpdates.forEach(u => link.getRange(u.row, u.col).setValue(u.value));
  if (appends.length) {
    const startRow = link.getLastRow() + 1;
    ensureSize_(link, startRow + appends.length - 1, appends[0].length);
    link.getRange(startRow, 1, appends.length, appends[0].length).setValues(appends);
    applyValidations_(link, col, startRow, appends.length);
  }

  const needCheck = appends.filter(a => a[col.status - 1] === STATUS.CHECK).length;
  const msg = `転記完了\n  入力シートの対象行: ${sourceRows.length}\n  新規追加: ${appends.length}（うち要確認 ${needCheck}）\n  内容更新: ${updated}` +
    (sourceRows.waiting ? `\n  記入途中で待っている行: ${sourceRows.waiting}（案件番号・新規or修正・時間がそろうと次の転記で追加）` : '');
  console.log(msg);
  toastOrLog_(msg);
  return msg;
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
  staffRows.forEach(r => {
    if (!r.code || !r.cut) return;
    const vpName = viewpointNameOf_(r.cut, r.pattern);
    const base = normCode_(r.code) + '::' + normCut_(vpName);
    const n = (counts.get(base) || 0) + 1;
    counts.set(base, n);
    if (r.done) return;
    if (r.noNumber || r.request === '' || (r.white <= 0 && r.color <= 0 && r.other <= 0)) { waiting++; return; }
    out.push({
      key: base + '::' + n,
      round: n,
      srcRow: r.srcRow,
      code: r.code, name: r.name, cut: r.cut, pattern: r.pattern, link: r.link, request: r.request, item: r.item, note: r.note,
      deadline: r.deadlineRaw === undefined ? undefined : parseDeadline_(r.deadlineRaw, today || new Date()),
      white: r.white, color: r.color, other: r.other,
    });
  });
  out.waiting = waiting;
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
  if (!v.kind) notes.push('種類（パース/写真合成/モデル）を選んでください');
  if (!v.category && v.kind === KIND.PERS) notes.push('区分（外観/内観）が未判定です（空のままでも送信できます）');
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
function fmtYMD_(d) { return d.getFullYear() + '-' + pad2_(d.getMonth() + 1) + '-' + pad2_(d.getDate()); }
function fmtDateTime_(d) { return fmtYMD_(d) + ' ' + pad2_(d.getHours()) + ':' + pad2_(d.getMinutes()); }

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
  if (kind !== KIND.PERS && kind !== KIND.PHOTO && kind !== KIND.MODEL) errors.push('種類は「パース」「写真合成」「モデル」のどれかを選んでください');
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
  // 担当者：シート → 既存視点の担当者（最新） → 既定
  let assignee = trimStr_(row.assignee);
  if (!assignee && vpTasks.length) {
    const latest = vpTasks.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
    assignee = trimStr_(latest.assignee);
  }
  if (!assignee) assignee = ctx.defaultAssignee || '未割当';

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
  if (kind === KIND.PHOTO || kind === KIND.MODEL) {
    // 写真合成・モデル作成は1ステップ（時間は合計）。修正・変更の回は名前に付ける
    const base = kind === KIND.PHOTO ? '写真合成' : 'モデル作成';
    const suffix = stepKind === STEP_KIND.FIX ? '（修正）' : stepKind === STEP_KIND.CHANGE ? '（変更）' : '';
    wants.push({ typeId: '', name: base + suffix, tag: kind === KIND.PHOTO ? 'photo' : 'model', hours: Math.round((white + color + other) * 100) / 100 });
  } else {
    if (white > 0) wants.push({ typeId: stepTypeIdFor_('white', stepKind), hours: white });
    if (color > 0) wants.push({ typeId: stepTypeIdFor_('color', stepKind), hours: color });
    if (other > 0) wants.push({ typeId: 'person_scene', hours: other }); // 人物・点景・色分 → 人物＋添景合成
  }

  const records = [];
  let seq = 0;
  wants.forEach(w => {
    const externalId = String(row.key) + '::' + (w.typeId || w.tag);
    if (ctx.deleted && ctx.deleted.has(externalId)) { records.push({ externalId, skippedDeleted: true }); return; }
    const existing = ctx.byExt && ctx.byExt.get(externalId);
    if (existing) {
      const changes = {};
      if (existing.status !== 'done' && Number(existing.hours) !== w.hours) changes.hours = w.hours;
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
    if (ty) {
      let n = 1;
      if (ty.numbered) { typeCounts[ty.id] = (typeCounts[ty.id] || 0) + 1; n = typeCounts[ty.id]; }
      label = resolveStepLabel_(ty.label, ty.numbered, n);
      if (ty.deliveryBase) { baseCounts[ty.deliveryBase] = (baseCounts[ty.deliveryBase] || 0) + 1; deliverySuffix = resolveDeliverySuffix_(ty.deliveryBase, baseCounts[ty.deliveryBase]); }
    }
    const createdAt = ctx.now + seq;
    const id = 'task-' + ctx.now + '-' + seq + '-' + Math.random().toString(36).slice(2, 7);
    const doc = {
      id,
      projectName, projectNameInternal, companyName: company, customerContact,
      viewpointName, viewpointNameExternal, viewpointCategory: category,
      stepName: label, stepOrder: order, assignee,
      priority: 99, hours: w.hours, completedHours: 0,
      memo, tentative: false, tentativeStart: null, tentativeEnd: null,
      deadline, projectDeadline: null, projectRequestDate: null,
      manualStart: null, manualEnd: null,
      status: 'pending', completedAt: null, createdAt, registeredDate: ctx.today,
      stepTypeId: ty ? ty.id : '', stepDeliverySuffix: deliverySuffix,
      stepAmount: '', stepRequestDate: ctx.today, stepCompletedDate: '', stepDeliveryNameOverride: '',
      // 納品種類（売上・帳票の「初回/追加/修正」）。金額は工程図の請求パネルで入力する
      stepRoundType: roundType, stepOutInHouse: '', stepOutExternal: '', stepOutVND: '',
      externalId,
    };
    records.push({ id, externalId, update: false, doc });
    order++; seq++;
  });
  return { records, errors };
}

// ============ 2. 送信 ============
function sendToKoutei() { return runSend_(false); }
function previewSend() { return runSend_(true); }

function runSend_(dryRun) {
  const cfg = readSettings_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const link = ensureLinkSheet_(ss);
  const col = headerMap_(link);
  const data = link.getDataRange().getValues();

  const targets = [];
  for (let r = 1; r < data.length; r++) {
    const row = arrayToRowObj_(data[r], col);
    if (!row.key) continue;
    if (!isChecked_(row.send) || isChecked_(row.exclude)) continue;
    if (row.status === STATUS.SENT || row.status === STATUS.GONE) continue;
    targets.push({ r, row });
  }
  if (!targets.length) {
    alertOrLog_('送信対象がありません。\n「工程図へ」にチェックが入っていて、状態が「登録済み」以外の行が対象です。\n（登録済みの行を送り直すには、状態を「更新あり」に変えてください）');
    return '対象なし';
  }

  const auth = getAuth_();
  const existing = fsListAll_(auth, cfg, 'workspaces/' + cfg.workspaceId + '/tasks');
  const deleted = new Set(parseJsonArray_(fsGetValueString_(auth, cfg, 'deletedExternalIds')));
  const customerMaster = parseJsonArray_(fsGetValueString_(auth, cfg, 'customerMaster'));
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

  const nowDate = new Date();
  const ctx = { now: nowDate.getTime(), today: fmtYMD_(nowDate), defaultAssignee: cfg.defaultAssignee, stepTypes, byVp, byExt, deleted };
  const stamp = fmtDateTime_(nowDate);
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
    const warns = [];
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
      link.getRange(t.r + 1, col.sentAt).setValue(stamp);
      link.getRange(t.r + 1, col.result).setValue(summary);
    }
    lines.push((warns.length ? '△ ' : '○ ') + label + ': ' + summary);
  });

  const head = dryRun
    ? 'プレビュー（工程図には書き込んでいません）\n対象 ' + targets.length + ' 行：新規 ' + created + ' 件・更新 ' + updated + ' 件・エラー ' + errored + ' 行\n\n'
    : '送信完了\n対象 ' + targets.length + ' 行：新規 ' + created + ' 件・更新 ' + updated + ' 件・エラー ' + errored + ' 行\n\n';
  const msg = head + lines.slice(0, 40).join('\n') + (lines.length > 40 ? '\n…（他 ' + (lines.length - 40) + ' 行）' : '');
  console.log(msg);
  alertOrLog_(msg);
  return msg;
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
    '<button onclick="google.script.run.withSuccessHandler(function(m){alert(m);google.script.host.close();}).withFailureHandler(function(e){alert(e.message||e);}).saveServiceAccountKey_(document.getElementById(\'k\').value)">保存</button>' +
    '</div>'
  ).setWidth(560).setHeight(380);
  SpreadsheetApp.getUi().showModalDialog(html, 'サービスアカウントの秘密鍵を設定');
}
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
  formatStaffInputTab_(sheet, headerRow, codes);
  writeStaffRulesTab_(staff);
  writeSetting_(ss, 'tabName', STAFF_TAB_DEFAULT);
  writeSetting_(ss, 'startRow', 2);
  const where = '「' + staff.getName() + '」';
  const head = how === 'created' ? where + 'に入力タブ『' + STAFF_TAB_DEFAULT + '』を作りました。'
    : how === 'renamed' ? where + 'の入力用タブの名前を『' + STAFF_TAB_DEFAULT + '』に合わせました。'
    : where + 'の『' + STAFF_TAB_DEFAULT + '』タブを整えました。';
  return head + '見出しを日本語・ベトナム語の2段にし、プルダウン（会社コード ' + codes.length + ' 社・新規or修正・視点・パターン・時間）を付け、『' +
    STAFF_RULES_TAB + '』タブを書き直しました。（『設定』のタブ名を「' + STAFF_TAB_DEFAULT + '」、取込開始行を 2 にしました）';
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

/** 入力列のプルダウン（無い列は null） */
function staffValidation_(key, companyCodes) {
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
      return list(VIEW_CODE_OPTIONS, true, 'EX1・IN1・EXCB1・INCM1・P1・EXM1・INM1 など / Chọn mã góc nhìn');
    case 'pattern':
      return list(PATTERN_OPTIONS, true, 'パターン違いが無ければ空欄 / Không có phương án khác thì để trống');
    case 'white': case 'color': case 'other':
      return list(HOUR_OPTIONS, true, '時間（h）/ Số giờ');
    default:
      return null;
  }
}

/**
 * 見出しを「日本語＋ベトナム語」の2段にして注記・色を付け、見出しより下の入力行にプルダウンと数値書式を付ける（列は見出し名で探す）。
 * 旧レイアウト（案件番号の列が無い）のタブは見出しの文字を変えない。
 */
function formatStaffInputTab_(sheet, headerRow, companyCodes) {
  const n = 1000; // 見出しより下の入力行にプルダウン等を付ける行数
  const lastCol = Math.max(sheet.getLastColumn(), STAFF_INPUT_COLUMNS.length);
  ensureSize_(sheet, headerRow + n, lastCol);
  const sc = mapStaffColumns_(sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0]);
  const isCurrent = !!sc.number;
  const start = headerRow + 1;
  STAFF_INPUT_COLUMNS.forEach(def => {
    const c = sc[def.key];
    if (!c) return;
    const head = sheet.getRange(headerRow, c);
    if (isCurrent) head.setValue(def.label + '\n' + def.vi);
    head.setNote(def.note).setFontWeight('bold').setBackground('#dde5f0').setWrap(true).setVerticalAlignment('middle');
    sheet.setColumnWidth(c, def.width * 9);
    const rule = staffValidation_(def.key, companyCodes || []);
    if (rule) sheet.getRange(start, c, n, 1).setDataValidation(rule);
    if (def.hours) sheet.getRange(start, c, n, 1).setNumberFormat('0.##');
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
  ['', '視点：下の「視点コード」から選ぶ（①と末尾の数字は同じ。外観目線視点② → EX2）', 'Góc nhìn: chọn theo bảng「Mã góc nhìn」bên dưới (số ① = số cuối, VD: ngoại thất tầm mắt ② → EX2)'],
  ['', 'パターン：同じ視点でパターン違いがあれば A・B・C…（無ければ空欄）', 'Phương án: nếu cùng góc nhìn có nhiều phương án thì chọn A, B, C… (không có thì để trống)'],
  ['', 'White：ホワイトパースまでの制作時間（モデル作成の行はモデル制作時間）', 'White: số giờ làm đến phối cảnh trắng (dòng dựng model: số giờ dựng model)'],
  ['', 'Color：色付きパースまでの制作時間（White の時間は含めない）', 'Color: số giờ làm phối cảnh màu (không tính số giờ White)'],
  ['', 'pts：写真合成・フォトショップ作業（人物・点景など）の時間', 'pts: số giờ ghép ảnh / làm Photoshop (người, cây, xe…)'],
  ['', 'メモ：制作上の注意点など（自由記入）', 'Ghi chú: lưu ý khi thực hiện (nhập tự do)'],
  ['h', '■ 視点コード', '■ Mã góc nhìn'],
];
// 記入例（『記入ルール/説明』の最後に表で載せる。入力シートの列の順）
const STAFF_RULES_EXAMPLES = [
  ['RIC', 34, 'マンション', '\\\\CG-SERVER2\\…\\RIC.34', '新規 / Mới', 'EX1', '', 6, 4, 0, '外観 昼景 / ngoại thất ban ngày'],
  ['RIC', 34, 'マンション', '\\\\CG-SERVER2\\…\\RIC.34', '新規 / Mới', 'EX1', 'A', 6, 4, 0, 'EX1 のパターン違い / phương án khác của EX1'],
  ['RIC', 34, 'マンション', '\\\\CG-SERVER2\\…\\RIC.34', '新規 / Mới', 'IN1', '', 5, 3.5, 1.5, '人物あり → pts / có người → pts'],
  ['RIC', 34, 'マンション', '\\\\CG-SERVER2\\…\\RIC.34', '修正 / Sửa', 'EX1', '', 0, 1.5, 0, '2回目の依頼（色の修正）/ yêu cầu lần 2 (sửa màu)'],
  ['REN', 72, '戸建て', '\\\\CG-SERVER2\\…\\REN.72', '新規 / Mới', 'EXCB1', '', 5, 3, 0, '外観鳥瞰 / ngoại thất chim bay'],
  ['REN', 72, '戸建て', '\\\\CG-SERVER2\\…\\REN.72', '新規 / Mới', 'P1', '', 2, 1, 0.5, '写真合成 / ghép ảnh'],
  ['REN', 72, '戸建て', '\\\\CG-SERVER2\\…\\REN.72', '新規 / Mới', 'EXM1', '', 8, 0, 0, 'モデル作成（外観）/ dựng model ngoại thất'],
];

/** 『記入ルール/説明』タブを日本語・ベトナム語の併記で書き直す（本文はB列。A列は余白） */
function writeStaffRulesTab_(staff) {
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
  VIEW_CODES.forEach(v => push([v[0] + '1 → ' + v[2] + '① ／ ' + v[3] + ' ①'], 'ja'));
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
  lines.push('✓ 管理者シート（連携・案件マスタ・会社マスタ・視点マスタ・設定・使い方）を整えました。');
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
  lines.push(ok
    ? '準備ができました。「工程図 エンジニア入力シート」を制作メンバーに共有すれば使い始められます。'
    : '✗ の項目を直してから、もう一度「0. かんたん初期設定」を押してください（何度押しても安全です）。');
  alertOrLog_('かんたん初期設定の結果\n\n' + lines.join('\n\n'));
}

/** タブ・見出し・チェックボックス・プルダウン・使い方を整える（何度実行しても安全） */
function setupSheet() {
  setupSheet_(SpreadsheetApp.getActiveSpreadsheet());
  toastOrLog_('初期設定が完了しました。');
}
function setupSheet_(ss) {
  const link = ensureLinkSheet_(ss);
  const col = headerMap_(link);
  link.setFrozenRows(1);
  link.getRange(1, 1, 1, link.getLastColumn()).setFontWeight('bold');
  const n = Math.max(link.getLastRow() - 1, 0);
  if (n > 0) applyValidations_(link, col, 2, n);

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
  } else {
    ensureViewMasterExternalColumn_(view);
    ensureViewMasterKeywords_(view);
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
  }
  settings.getRange(1, 1, 1, 3).setFontWeight('bold');

  writeHowto_(ss);
}

/** 旧バージョンの視点マスタ（社外名の列が無い）に「社外名」列を足し、EX/IN/P の初期値を入れる */
function ensureViewMasterExternalColumn_(view) {
  const lastCol = view.getLastColumn();
  const headers = view.getRange(1, 1, 1, lastCol).getValues()[0].map(v => trimStr_(v));
  if (headers.indexOf('社外名') >= 0) return;
  const c = lastCol + 1;
  ensureSize_(view, 1, c);
  view.getRange(1, c).setValue('社外名').setFontWeight('bold');
  const last = view.getLastRow();
  if (last < 2) return;
  const kw = view.getRange(2, 1, last - 1, 1).getValues().map(r => normCut_(r[0]).replace(/[^A-Z]/g, ''));
  const byKw = {};
  INITIAL_VIEW_MASTER.forEach(r => { byKw[r[0]] = r[3]; });
  const vals = kw.map(k => [byKw[k] || '']);
  view.getRange(2, c, vals.length, 1).setValues(vals);
}

/** 旧バージョンの視点マスタに、入力シートで増えた視点コード（EXCB・INCM・EXM・INM など）が無ければ下に追加する（既にある行は変えない） */
function ensureViewMasterKeywords_(view) {
  const lastCol = view.getLastColumn();
  const headers = view.getRange(1, 1, 1, lastCol).getValues()[0].map(v => trimStr_(v));
  const cKw = headers.indexOf(VIEW_MASTER_HEADERS[0]);
  if (cKw < 0) return;
  const last = view.getLastRow();
  const have = last >= 2 ? view.getRange(2, cKw + 1, last - 1, 1).getValues().map(r => normCut_(r[0]).replace(/[^A-Z]/g, '')) : [];
  const add = INITIAL_VIEW_MASTER.filter(r => ADDED_VIEW_KEYWORDS.indexOf(r[0]) >= 0 && have.indexOf(r[0]) < 0).map(r => {
    const row = new Array(lastCol).fill('');
    VIEW_MASTER_HEADERS.forEach((h, i) => { const c = headers.indexOf(h); if (c >= 0) row[c] = r[i]; });
    return row;
  });
  if (!add.length) return;
  ensureSize_(view, last + add.length, lastCol);
  view.getRange(last + 1, 1, add.length, lastCol).setValues(add);
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

function applyValidations_(sheet, col, startRow, numRows) {
  const checkbox = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  const list = (values) => SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(true).build();
  sheet.getRange(startRow, col.send, numRows, 1).setDataValidation(checkbox);
  sheet.getRange(startRow, col.exclude, numRows, 1).setDataValidation(checkbox);
  sheet.getRange(startRow, col.category, numRows, 1).setDataValidation(list([CATEGORY.EX, CATEGORY.IN]));
  sheet.getRange(startRow, col.kind, numRows, 1).setDataValidation(list([KIND.PERS, KIND.PHOTO, KIND.MODEL]));
  sheet.getRange(startRow, col.stepKind, numRows, 1).setDataValidation(list([STEP_KIND.NEW, STEP_KIND.ADD, STEP_KIND.FIX, STEP_KIND.CHANGE]));
  sheet.getRange(startRow, col.status, numRows, 1).setDataValidation(list([STATUS.NEW, STATUS.CHECK, STATUS.UPDATED, STATUS.SENT, STATUS.ERROR, STATUS.GONE]));
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
  cfg.projectId = trimStr_(cfg.projectId);
  cfg.workspaceId = trimStr_(cfg.workspaceId);
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
    if (keyword) views.push({ keyword, category: trimStr_(r['区分']), kind: trimStr_(r['種類']), external: trimStr_(r['社外名']) });
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
  '■ エンジニアが書く場所',
  '「工程図 エンジニア入力シート」の『入力シート』タブ。書き方は同じファイルの『記入ルール/説明』タブ（日本語・ベトナム語の併記。メニュー「0. かんたん初期設定」で整います）。',
  '列: 会社コード（REN・RIC…）/ 案件番号 / 社外案件名 / サーバーリンク / 新規or修正 / 視点（EX1・IN1・EXCB1・INCM1・P1・EXM1・INM1）/ パターン（A・B…）/ White / Color / pts / メモ',
  '1視点（パターン違いも別）1行。依頼のたびに行を足します。会社コード＋案件番号は「RIC.34」のように1つの社内案件名として扱います。',
  '会社コードのプルダウンは『会社マスタ』から作ります（「入力シートに出さない」にチェックした行は出ません）。会社を足したらメニュー「エンジニア入力シートを整える」を押してください。',
  '',
  '■ 毎日の流れ（管理者）',
  '1. メニュー「工程図連携」→「1. エンジニア入力シートから転記」。『連携』タブに新しい行が追加され、「入力日」に転記した日が自動で入ります（既にある行は上書きしません）。',
  '   会社コード・案件番号・新規or修正・視点・時間がそろっていない行は「記入途中」として待ち、そろった後の転記で追加されます。',
  '2. 状態が「要確認」の行の 社外案件名・会社名・区分・種類 を直し、必要なら 納期・お客様担当者・担当者・メモ を入れる。',
  '3. 工程図に登録したい行の「工程図へ」にチェック。',
  '4. メニュー「工程図連携」→「2. 工程図へ送信」。状態が「登録済み」になれば完了。',
  '   → 工程図でスケジュールが自動生成されます。金額（売上・見積・請求）は工程図の請求パネルで入力します。',
  '',
  '■ 自動判定のしくみ',
  '・社外案件名：入力シートの社外案件名。空なら『案件マスタ』で社内案件名（RIC.34）から引きます。お客様担当者・会社名も『案件マスタ』から（無ければ『会社マスタ』で会社コードから会社名だけ判定）。',
  '・区分（外観/内観）・種類（パース/写真合成/モデル）・社外視点名：『視点マスタ』で視点コードの英字から引きます。EX1 → 外観視点①、EXCB2 → 外観鳥瞰視点②、パターンAなら「外観視点①_パターンA」。',
  '・ステップ種類：入力シートの「新規or修正」から（新規 → 新規、修正 → 修正（無料））。有料の変更・追加は人が「変更（有料）」「追加」に直します。',
  '  同じ案件＋視点の2回目以降なのに「新規」の行は「要確認」になります（書き間違い・二重入力のおそれ）。',
  '・登録されるステップ：White → ホワイト、Color → カラー、pts → 人物＋添景合成。写真合成（P1…）・モデル（EXM1・INM1）は1ステップ（時間は合計）。',
  '・売上・帳票の「初回/追加/修正」は、ステップ種類（新規→初回、追加→追加、修正・変更→修正）から自動で入ります。',
  '',
  '■ 列の見方（『連携』タブ）',
  '・自動で入る列：取込キー・状態・入力日（最初に転記した日。あとで変わりません）・社内案件名・視点名・パターン・回・新規or修正・各時間・元シート備考（メモ）・転記日時（最後に内容が変わった日時）・送信日時・結果・元シート行・サーバリンク',
  '・人が直す列：工程図へ・社外案件名・社外視点名・納期・会社名・お客様担当者・区分・種類・ステップ種類・担当者・メモ・対象外（自動判定の結果が入り、次の転記で上書きされません）',
  '・状態：未送信 / 要確認（会社名・種類などが未確定）/ 更新あり（登録後にエンジニア側が変わった）/ 登録済み / エラー / 元シートから消えた',
  '',
  '■ 登録後のルール',
  '・担当者・優先度・完了時間・完了状態は工程図側が正。シートからは上書きしません。',
  '・「更新あり」の行をもう一度送信すると、未完了ステップの時間と案件名・会社名・区分・納期・社外視点名だけ更新します。',
  '・工程図側で削除したタスクは、再送信しても復活しません。',
  '',
  '■ 初回だけ',
  '・メニュー「0. かんたん初期設定」を押す（管理者シートの整備・読み込み先の切り替え・エンジニア入力シートの整備・接続テストをまとめて行います）。',
  '・続けて「工程図の会社名一覧を取り込む」を押し、『会社マスタ』の表記を工程図に合わせる。',
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
function fsBase_(cfg) {
  return 'https://firestore.googleapis.com/v1/projects/' + cfg.projectId + '/databases/(default)/documents';
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
  if (code === 404 && method === 'get') return null;
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
