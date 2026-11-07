# koutei-zu（工程図アプリ）作業ルール

このファイルは作業のたびに自動で読み込まれる。**修正に着手する前に毎回必ず読むこと。** 内容が古くなったら随時このファイルを更新する。

## 必須運用ルール（毎回・例外なし）

修正を行うたびに、以下を**必ずワンセット**で実施する：

1. `npm run build` が**警告・エラーなく通る**ことを確認する
   - build は `prebuild` で自動的に `npm run check`（ESLint）を実行する。**ESLint エラーが1件でもあればビルドは失敗する。** エラーはルールの無効化・緩和で回避せず、コードを直すこと（ルール変更が必要な場合は先に `docs/07_UI設計原則.md` を更新して理由を残す）
2. `npm run deploy`（= `vite build` → `gh-pages -d dist`）でデプロイする
3. **未コミット・未プッシュの変更をすべてコミットし、`git push origin main` で GitHub に反映する**
   - 過去に未コミットのまま残っている変更があれば、それも含めてコミットする
   - 作業終了時に `git status` がクリーン、かつ `git log origin/main..HEAD` が空であることを確認する
4. コミットメッセージ末尾に `Co-Authored-By:` 行（作業した Claude モデル名）を付ける

5. **作業用ブランチ（`claude/...` など）で作業した場合も、終わったらすぐ main に取り込んで公開まで行う**（オーナーの恒久的な許可あり・2026-10-31）
   - 手順：作業用ブランチに commit・push → `git checkout main && git pull origin main && git merge <作業用ブランチ>` → `npm test`・`npm run build` → `git push origin main` → `npm run deploy`
   - 「main に取り込んでよいか」をオーナーに毎回確認しない。取り込みで衝突した場合だけ相談する

> デプロイ（gh-pages）と main への push は**必ずセット**。デプロイだけしてソース（main）への push を忘れると、GitHub のソースが古いまま乖離する（過去に発生済み）。

## 公開リポジトリの注意

- このリポジトリは公開（GitHub Pages を無料で使うため）。**住所・振込先・口座番号などはコードに書かない**。帳票の発行元・振込先はアプリの「自社情報・振込先」（`data/billingIssuer`）にだけ保存する。

## UI・コード品質ルール（重要）

**UI・画面・操作・コード構造に関わる変更をする前に、必ず `docs/07_UI設計原則.md` を読むこと。**
2026-07 のUIレビューで導入された設計原則（ネイティブダイアログ禁止・段階的開示・モードレス・
ファイル分割の維持など10項目）がまとまっており、主要なものは ESLint で機械的に強制されている。
要点だけ挙げると：

- `alert` / `confirm` / `prompt` 禁止 → `useApp()` の `confirmDialog` / `promptDialog` / `notify` を使う（削除には `undo` を付ける）
- `<input type="datetime-local">` 禁止 → 共通 `DateTimeField` を使う
- 1ファイル 1800 行まで（App.jsx のみ 2600）。超える前に分割する
- 共有データ・ハンドラは `useApp()`（src/appContext.js）から取得。props バケツリレーに戻さない
- 新しいトップレベルビューは `React.lazy` で追加。ナビの直接表示タブは増やさない（集計系は「集計・帳票」グループへ）

## ソースの場所（重要）

- **作業対象の最新ソースはこのリポジトリ**: `/Users/nakamurakeisuke/Documents/koutei-zu`
- `~/repos/nakamuar.github.io` は別物（玄関ポータルの `index.html` のみ）。混同しない。
- リモート: `origin` = GitHub `NAKAMUAR/koutei-zu`（push 時に旧 URL からのリダイレクト警告が出るが push は成功する）
- 公開 URL: https://nakamuar.github.io/koutei-zu/

## ソース構成（2026-07 に App.jsx 1万行の単一ファイルから分割済み）

```
src/
  App.jsx            # 状態管理・Firestore購読・タスク操作ハンドラ・画面切替（これ以上肥大させない）
  appContext.js      # AppCtx / useApp()：共有データ＋ハンドラをビューへ渡すコンテキスト
  lib/
    utils.js         # 日付・時刻・色・プリセット等の純ユーティリティ
    schedule.js      # スケジューラ・マイグレーション・並び順・視点グループ化（純ロジック）
  components/
    common.jsx       # 共通UI部品（各種モーダル・トースト・TimeSelect・DateTimeField・NavButton/NavGroup・Combobox 等）
    modals.jsx       # 過去案件引用・終了予定超過ポップアップ
    MemberSettings.jsx
  views/             # 画面単位（案件=InputView・カレンダー・担当者別・サマリー・完了・マスタ・メモ）
    input/           # 案件タブの下位部品（一覧・視点カード・ステップ行・各セクション）
  billing/ sales/ project/ viewpoint/  # 帳票・売上・案件整理・視点ロジック（従来どおり）
```

## 技術スタック

- React 18 + Vite 5（JavaScript / JSX、TypeScript不使用）、インラインスタイル、lucide-react
- ESLint 9（フラット構成 `eslint.config.js`）。`npm run check` で実行、`npm run build` の前に自動実行される
- バックエンド: Firebase（Cloud Firestore + Auth）。`storage`（`workspaces/{id}/data/{key}` の汎用KV）、`tasksStore`（**2026-11-06 からタスクは「まとめ保存」**：`data/taskPacks`（目印 `{ v: 1, packs }`）の下の `packs/{p00〜}` に `{ t: { タスクid: タスク } }`。既定64まとめ＝全部読んでも64回。1件の保存はそのまとめの `t.{id}` だけ置き換え（mergeFields）。割り振り `taskPackOf`（`src/lib/taskPacks.js`）は連携スクリプト `taskPackOf_`・帳票スクリプト `blTaskPackOf_` と同じ計算。処理は `src/lib/taskPackStore.js`。目印が無ければ最初に開いたとき旧 `tasks`（1件=1ドキュメント）を一度読んで移す。旧 `tasks` は控えとして残すが、もう使わない。スクリプトは目印を見てまとめ／旧 tasks を切り替える（`fsTaskPacks_`・`fsTaskPatch_`・`fsTaskDelete_`・`fsAllPackedTasks_`）。テストは `TASK_PACKS=1` でもう一度回す）、`billingStore`（帳票1件=1ドキュメント、`data/bill_{id}`）、`salesStore`（売上1か月=1ドキュメント、`data/sales_{YYYY-MM}`）、`legacyStore`（過去分の保管庫。1か月=1ドキュメント、`data/legacy_{YYYY-MM}`。毎回読み込む tasks とは別で、「過去分の取り込み」画面を開いたときだけ読む。旧「Project Schedule」・LINE の過去分はここに入れ、tasks には入れない）
  - 帳票・売上の旧1ドキュメント集中保存（`billingDocuments` / `salesLedger`）は起動時に自動移行され、旧データは `*_backup` キーへ退避される
- **Firestore は無料枠（1日の読み取り上限）で運用。** 上限に達すると SDK は黙って再試行し続け、画面が「読み込み中」で止まる。`src/components/LoadingScreen.jsx` が10秒後に REST で確かめ、上限なら「日本時間17時ごろ（夏時間は16時ごろ）に戻る」と案内する。全タスクを何度も読む処理（特に連携スクリプトの15分ごとの自動実行）を増やさないこと（2026-11-05 に上限到達）。2026-11-05 からアプリは読んだデータをブラウザに保存する（`persistentLocalCache`・上限10MB・複数タブ可。`src/firebase.js`）：オフラインでも開け、開き直しは変わった分だけ読む（ただし30分以上切れていたら Firestore の課金上は全件読み直し）。タスクの「読み込み完了」（`tasksLoaded`）はサーバーとそろってから（`fromCache` の間は表示だけ。オフライン時は保存分で開く）。`storage.get` はサーバー優先（8秒で保存分）
- ホスティング: GitHub Pages（`gh-pages` で `dist/` を公開）
- Firestore ルール（`firestore.rules`）: オーナー（ルール内に直書き）＋ `data/allowedEmails` の emails 配列に載っているメンバーのみ読み書き可。メンバーはアプリの設定パネル（メンバー管理）で編集（リストの書き換えはオーナーのみ）。**ルールを変更したら Firebase コンソールへ手動デプロイが必要。**
- スプレッドシート連携（`sync/`）: エンジニアが書く「工程図 エンジニア入力シート」の『入力シート』タブ（会社コード・案件番号・社外案件名・サーバーリンク・新規or修正・視点・パターン・White/Color/pts・メモ。見出し・プルダウン・『記入ルール/説明』は日本語／ベトナム語の併記）→ 管理者だけが見る別ファイル「工程図連携」シート（転記した日を「入力日」に記録。案件マスタ・会社マスタ・視点マスタで自動判定、人が補正）→ 工程図、という2段階。15分ごとのトリガー（`autoRun`）で転記し、自動判定がすべてできた「未送信」の行は15分待ってから自動登録（「要確認」「更新あり」は人が「工程図へ」にチェックしたら登録）。会社マスタにあって工程図の顧客マスタ（`data/customerMaster`）に無い会社は自動で追加する。`sync/Code.gs`（Apps Script）と `sync/appsscript.json` を「工程図連携」シートに貼り付けて使う。手順・仕様は `docs/08_スプレッドシート連携.md`。
  - 2026-11 から、管理者が連携シートの『案件登録』タブに書く → 入力シートへ必要な列だけ自動で写す → 通訳が「翻訳済み」 → エンジニアが時間、の流れも使える。翻訳済みから2時間で Discord 催促（Webhook はスクリプトプロパティ `DISCORD_WEBHOOK_URL`。リポジトリに書かない）。入力シートの編集トリガー `onStaffEdit` で翻訳日時・時間入力日時を入れる。
  - 2026-11-03 から、管理者タブは2つ：『案件登録』（入力専用。「登録」にチェックした行に登録Noを付けて入力シートへ写し、『登録一覧』へ移す）と『登録一覧』（状態・読み戻し・連絡文・コピー列。コード上の `SHEET.REG`）。入力専用タブは `SHEET.ENTRY`。自動実行は15分ごと・自動登録の待ち時間は15分。登録後の変更は「更新あり」＋Discord で確認依頼。
  - 2026-11-04 から、先頭に『案件入力』タブ（`SHEET.FORM`。縦型フォーム：①日本語の区分で視点の番号にチェック→②視点ごとに部屋名・＋でパターン・社外視点名→「登録」にチェックで通訳へのメッセージの確認画面→登録。部屋名つきの視点は `EXE1_2F`。「前回の視点を呼び出す」あり。会社コード・案件番号を入れると、過去に登録した案件なら空の社外案件名・担当者を自動で入れる（`formFillKnown_`）。「登録Noで直す」（`FORM_L.edit`）に登録Noを入れるとその登録＝同じ案件・同じ登録日の行を呼び出し、「登録」で `updateEntryForm` が『登録一覧』の行を上書き・足した視点は新規登録→同期でエンジニア入力シートも直る。呼び出した行の登録Noは隠し列 Z（`FORM_NO_COL`。2026-11-05 に W から移し、②の W・X は White・Color の時間＝管理者が決めたときだけ書く））。パターンが増えた行は同じ視点の行のすぐ下に差し込む（`insertRegRows_`）。『登録一覧』に「社外視点名」列（`extName`、無くても動く `REG_OPTIONAL`）を足し、転記で『連携』の社外視点名に入る。
  - 2026-11-04 から、エンジニア入力シートは3タブ：『入力前』（`STAFF_TAB_DEFAULT`。翻訳・時間を入れる）→『制作中』（『連携』で登録済み・更新ありになった行を自動で移す）→『制作済み』（工程図のその視点・回のタスクがすべて `status: 'done'` になった行を移す）。移動は `autoRun` の最後の `moveStaffRows_`。取込キーの n回目 が変わらないよう、読む順は 制作済み→制作中→入力前（`staffTabNames_`）。White は「White躯体」「White家具」の2列（工程図へは合計を1つの White で送る。`staffWhite_`）。黄色の列＝エンジニア・通訳が入力、灰色＝管理者・自動。納品名は `deliveryNameOf_`（社外案件名_社外視点名_YYMMDD。2026-11-06 から YYMMDD は今日の日付で、自動の名前は毎日その日に作り直し・『制作済み』は止める `isAutoDelivery_`）。
  - 2026-11-05 から、登録の削除：管理者は『登録一覧』の「削除」にチェック → 確認の画面 → `deleteRegistrations` が入力シート3タブの行と工程図の作業（externalId が 取込キー:: で始まる）を消す（管理者用シートの行は消さない：『登録一覧』は「削除」にチェック・状態「削除済み」、『連携』は「対象外」。チェックを外すと `restoreByNo_` で戻る）（工程図は `PENDING_DELETE_KEYS` に入れてすぐ試し、だめなら次の `autoRun` で。あとの回が残る行は消さない `planRegDeletion_`）。エンジニアは入力シートの「削除依頼」にチェック → 『登録一覧』の「削除依頼」に日時＋Discord。
  - 2026-11-05 から、『登録一覧』の White・Color・pts は管理者も書ける（編集の瞬間に入力シートの White躯体・Color・pts へ `pushRegHoursToStaff_`。入力シートに時間があれば入力シートが正）。Firestore の読み取りを減らすため、制作中→制作済みの確認は1時間に1回・制作中の案件のタスクだけ `runQuery` で読む（`fsTasksByProjects_`）。
  - 2026-11-05 から、削除した登録は管理者用シートの『削除済み』タブに残る（`trashAppend_`・工程図の作業は `trashAttachTasks_`）。「復帰」にチェックで元に戻す（`restoreDeleted_`。同じ視点のあとの回が増えていたら戻さない）。登録No は削除済みの番号も使い回さない。
  - 2026-11-05 から、連携スクリプトは全タスクを読まない（送るときも案件のタスクだけ `fsTasksForRows_`）。Firestore が 429 を返したら `FS_QUOTA_UNTIL`（太平洋時間0時＋5分）まで工程図を読みに行かず、Discord で1回知らせる（`notifyQuotaOnce_`）。
  - 2026-11-05 から、エンジニアが『入力前』に自分で足した行（登録No なし・翻訳済み か 時間あり）は同期で『登録一覧』に取り込む（`adoptStaffRows_`。申請なし・同じ視点の下・登録No を入力シートにも書く）。
  - 2026-11-05 から、視点の番号はどの区分も20まで（`VIEW_OPTION_COUNT_DEFAULT`）。Discord 通知はすべて『設定』の時間帯（既定 8-18）だけ、外の分は `DISCORD_QUEUE` に貯めて時間帯に入ったら送る（`notifyDiscord_`・`flushDiscordQueue_`）。
  - 2026-11-06 から、自動実行の最後に入力シート3タブの空の納品名を埋める（`fillStaffDeliveryNames_`。登録No の無い古い行も。社外視点名は『連携』→自動→視点名）。
  - 2026-11-06 から、一度『制作済み』へ移したキー（`DONE_MOVED_KEYS`）は、人が『制作中』へ戻したらもう自動では移さない。
  - 2026-11-06 から、アプリが計算した予定を取込キーごとにまとめて `data/scheduleSnapshot` に書き（`src/lib/useScheduleSnapshot.js`。変わったときだけ・10分に1回まで）、連携スクリプトがそれを1件読んで『連携』の「開始予定（工程図）」「終了予定（工程図）」「担当（工程図）」「工程図の状態」に入れる（`writeScheduleToLink_`）。同じまとめに今日から2週間・30分刻みの作業枠（`plan`、`buildAssigneePlan`）も入れ、管理者用シートの『予定_担当者名』タブに担当者ごとの予定表を書く（`writeAssigneeTabs_`。数式・条件付き書式なしで値と背景色だけ・タブは中身ぴったりの大きさ・まとめが変わったときだけ書き直す）。
  - 2026-11-06 から、制作中→制作済みの確認はタスクを読まず、予定のまとめ（`data/scheduleSnapshot` の「完了」）で見る（以前の1時間ごとの確認が1回約1,900件・1日4万件以上を読み、無料枠を使い切る主な原因だった）。予定のまとめは自動実行1回につき1件だけ読む（`readScheduleSnapshot_`）。スクリプトが読んだ件数を `fsFetch_` で数え（`FS_READS`・太平洋時間の日ごと）、自動の処理は1日 `AUTO_READ_BUDGET`（8,000件）まで（`fsAutoBlocked_`。超えたら Discord で1回 `notifyBudgetOnce_`。手で「登録」・削除した分は止めない）。アプリは上限のとき保存分で開き、そのことを知らせる。
  - 2026-11-06 から、『案件入力』の登録の確認画面は「登録する」を押した瞬間に通訳への連絡文をコピーする（ブラウザは押した瞬間しかコピーを許さないため。登録で時刻が変わったらもう一度試し、だめなら選んだ状態で案内。`FORM_CONFIRM_SCRIPT` の `copyPreview`）。
  - 2026-11-07 から、Discord の時間帯は曜日ごとに書ける（『設定』の「催促する時間帯」。既定 `8-18 / 土 8-13 / 日 なし`。`parseNotifyHours_`・`inNotifyHours_`）。『登録一覧』に「通知オフ」（`notifyOff`。チェックした案件＝同じ社内案件名の催促・登録後の変更・削除依頼を Discord で送らない。`notifyOffSetOf_`・`readNotifyOff_`）。エンジニア入力シートに「資料待ち」（`waiting`。チェックの間は『登録一覧』の状態が「資料待ち」・催促しない。列は右端に足される）。
  - 実際のシートへのスクリプトの設置・初期設定・動作確認の引き継ぎは `docs/09_引き継ぎ_連携スクリプトの設置.md`（設置と承認は kei.n412@gmail.com で行う）。
  - 工程図への書き込みは Firestore REST API。認証は実行アカウント（Firebase オーナー）の OAuth トークン、または サービスアカウント鍵（スクリプトプロパティに保存。**鍵ファイルはリポジトリに入れない**、`.gitignore` 済み）。Firestore ルールはこの経路に適用されないので、ルール変更は不要。
  - 同期で作るタスクは `externalId`（`案件コード::視点名(パターン込み)::n回目::ステップ種類`）を持ち、`stepRoundType`（新規→initial・追加→add・修正/変更→fix）と `viewpointNameExternal`（外観視点①_パターンA）を自動で入れる。アプリ側で削除すると `data/deletedExternalIds` に記録され、再送信しても復活しない（App.jsx の既存挙動）。
  - テスト: `node sync/test/logic.test.mjs`（判定・レコード生成の純ロジック）と `node sync/test/setup.test.mjs`（偽のシート環境で「かんたん初期設定」と転記を通す。Apps Script は手元で動かせないため、シートの大きさの上限も再現している）
  - Apps Script への反映は貼り付けのほか、`npm run gas:push`（clasp。`.claspignore` で Code.gs と appsscript.json だけ送る）でもできる。初回は `.clasp.json.example` を `.clasp.json` にしてスクリプトIDを入れ、`npm run gas:login`（手順は docs/08 の 2-9）。**`.clasp.json`・`.clasprc.json` はリポジトリに入れない**（`.gitignore` 済み）。

- 帳票の雛形（スプレッドシート「雛形」の見積書・発注書・請求書）で書いて PDF で発行するスクリプトは `sync/billing/Billing.gs`（雛形のファイルに貼る。Code.gs とは別のプロジェクト）。工程図の案件から明細を読み込み、発行すると Drive の「工程図_帳票PDF」に保存・『発行一覧』に記録・工程図の帳票一覧（`data/bill_*`、`pdfUrl`）に登録・請求書は作業を請求済みにする。書き込む位置は `BL_LAYOUTS`。売上総合報告書は『売上総合報告書（雛形）』タブから月のタブを作り、アプリの売上登録表（`data/sales_YYYY-MM`）の行を見出しで見つけた区分へ流し込む（`blDetectSections_`・`blSectionFor_`）。手順は `docs/10_帳票の雛形とPDF発行.md`、テストは `node sync/test/billing.test.mjs`。

## 確認のしかた

- `npm run check`（ESLint）→ `npm run build` の順で必ず通す（build が check を自動実行する）。
- UIに触れた場合は `npm run preview` でログイン画面が描画されることを最低限確認する（モジュールレベルのクラッシュ検出）。
- スケジューラ等の純粋ロジックは `src/lib/` に分離済みなので、node スクリプトから直接 import して検証できる。
- `npm test` で sync のテストとアプリの純ロジックのテスト（`test/salesLink.test.mjs`：請求書⇄売上の紐付け、`test/workdays.test.mjs`：土日の出勤日の稼働枠、`test/assigneeHours.test.mjs`：担当者ごとの稼働時間とスケジュール配置、`test/issuer.test.mjs`：帳票の発行元・振込先の引き継ぎ、`test/stage.test.mjs`：進行状況・目安金額・AI進捗の取り込み、`test/sheetExport.test.mjs`：シート貼り付け用の書き出し・納品名、`test/legacyImport.test.mjs`：過去分の取り込み、`test/scheduleSnapshot.test.mjs`：予定のまとめ）をまとめて実行する。関係する箇所を触ったら必ず通す。
- 大きな改修は機能ごとに `npm run build` を挟みながら進める。

## 主要コマンド

```bash
npm run dev      # 開発サーバ
npm run check    # ESLint（UI設計原則の機械チェック）
npm run build    # 本番ビルド（check を自動実行。デプロイ前に必ず）
npm run deploy   # ビルド→gh-pages公開
npm test         # sync とアプリの純ロジックのテスト
# 仕上げに必ず:
git add -A && git commit -m "..." && git push origin main
```

### 自動デプロイ（Stop フック）

必須運用ルール 1〜3 の取りこぼしを防ぐため、`.claude/settings.json` の **Stop フック**（`.claude/hooks/deploy-on-stop.sh`）が、ターン終了時に次を自動実行する：

- カレントブランチが `main` で、**未コミットの変更がなく**、`origin/main..HEAD` に**未プッシュのコミットがある**場合 → 自動で `npm run build` → `npm run deploy` → `git push origin main` を実行する。
- 未コミットの変更が残っている場合は自動デプロイせず、コミットを促す（手動でコミットすれば次のターン終了時に自動デプロイされる）。
- `main` 以外のブランチでは何もしない。

> あくまで取りこぼし防止の保険。手動で 1〜3 を実施するのが基本。フックの確認・無効化は `/hooks` から行える。
