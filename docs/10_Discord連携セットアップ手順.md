# Discord 連携セットアップ手順

作成: 2026-08-24 / 対象: `bot/worker.js` / 設計: `docs/08_チャット連携（外部AIエージェント）設計.md`

Discord から工程図の**案件登録**と**状況確認**ができるようにする手順書。
Telegram 版（`docs/09`）と**同じ1つの Worker・同じコード**で動く。両方を同時に使うこともできる。

- **所要時間の目安**：30〜50分（Telegram 版をすでに動かしている場合は 15分ほど）
- **費用**：0円
- **AI（Gemini）は使わない**

---

## 0. 先に知っておいてほしいこと

### Discord の Bot は「普通のチャット」を読めません

Cloudflare Worker で動く Bot は、Discord の**通常のメッセージを受け取れません**。
チャンネルの会話を読むには常時つなぎっぱなしの通信（WebSocket）が必要で、Worker はその方式に対応していないためです。

そのため Discord 版は次の形になります。

| やること | 方法 |
|---|---|
| 操作の開始 | **スラッシュコマンド**（`/new` `/status` …） |
| 選択 | **ボタン／ドロップダウン** |
| 文字の入力（案件名など） | **入力ポップアップ（モーダル）** |

**使い勝手はむしろ Discord の方が良いです。** 案件名は専用の入力窓が開くので、チャット欄に打ち込んで送信する必要がありません。

### 返事は自分にしか見えません

Bot の返答はすべて **ephemeral（本人にのみ表示）** です。サーバーの他のメンバーには案件情報が見えません。

---

## 1. 全体の流れ

| 手順 | 何をするか | 場所 |
|---|---|---|
| 1 | Bot 用の Google アカウントを作る | Google |
| 2 | そのアドレスを Firebase に登録する | Firebase |
| 3 | 工程図アプリのメンバーに追加する | 工程図アプリ |
| 4 | Discord アプリ（Bot）を作る | Discord |
| 5 | 自分のユーザーIDとサーバーIDを調べる | Discord |
| 6 | Cloudflare で Worker を作る | Cloudflare |
| 7 | KV（記憶領域）を作ってつなぐ | Cloudflare |
| 8 | 設定値（シークレット）を登録する | Cloudflare |
| 9 | コードを貼り付けて公開する | Cloudflare |
| 10 | 確認メールを送って開く | ブラウザ＋メール |
| 11 | 疎通確認する | ブラウザ |
| 12 | コマンドを登録して Discord とつなぐ | ブラウザ＋Discord |

> **Telegram 版をすでに動かしている場合**、手順1〜3・6〜7・10〜11 は完了済みです。
> **手順4・5・8（Discord 用の設定値の追加）・9（コードの貼り直し）・12 だけ**行ってください。

---

## 2. 手順1〜3：Firebase 側の準備

`docs/09_Telegram連携セットアップ手順.md` の手順1〜3 とまったく同じです。要点だけ再掲します。

1. **Bot 用の Google アカウントを作る**（例：`koutei-bot@gmail.com`）。ご自身のアドレスは使い回さない
2. **Firebase コンソール** → プロジェクト `koutei-zu` → **構築 > Authentication**
   - **Sign-in method** で「メール / パスワード」を有効にする（既存の「Google」はそのまま）
   - **Users** タブ → ユーザーを追加（手順1のアドレスとパスワード）
3. **工程図アプリ**（https://nakamuar.github.io/koutei-zu/ ）にご自身の Google アカウントでログインし、
   設定パネルの **メンバー管理** から手順1のアドレスを追加する

---

## 3. 手順4：Discord アプリ（Bot）を作る

1. [Discord Developer Portal](https://discord.com/developers/applications) を開く
2. 右上の **New Application** → 名前を入力（例：`工程図`）→ 作成
3. 左メニュー **General Information** で次の2つを控える
   - **APPLICATION ID**
   - **PUBLIC KEY**
4. 左メニュー **Bot** → **Reset Token**（または Token の Copy）で**ボットトークン**を控える
   - 一度しか表示されないので、その場でコピーしてください
   - このページの「MESSAGE CONTENT INTENT」などは**オンにする必要はありません**（通常メッセージは読まないため）
5. 左メニュー **OAuth2** → **URL Generator**
   - SCOPES で **`bot`** と **`applications.commands`** にチェック
   - BOT PERMISSIONS は **何もチェックしなくて構いません**（返答は ephemeral で送るため）
   - 下に出てくる URL をコピーしてブラウザで開き、**自分のサーバーに追加**する
   - サーバーを持っていない場合は、Discord で自分専用のサーバーを新規作成してください

**メモ欄**

- APPLICATION ID： `______________________`
- PUBLIC KEY： `______________________`
- BOT TOKEN： `______________________`

---

## 4. 手順5：自分のユーザーIDとサーバーIDを調べる

1. Discord の **設定 → 詳細設定 → 開発者モード** を**オン**にする
2. 自分のアイコンを右クリック → **ユーザーIDをコピー**
3. サーバー名を右クリック → **サーバーIDをコピー**

**メモ欄**

- DISCORD_USER_ID： `______________________`
- DISCORD_GUILD_ID： `______________________`

> サーバーIDは省略できますが、指定するとコマンドが**即座に使えるようになります**（省略した場合、Discord 全体への反映に最大1時間かかります）。**指定することを強くおすすめします。**

---

## 5. 手順6〜7：Cloudflare の Worker と KV

`docs/09` の手順6〜7 と同じです。**Telegram 版をすでに作っている場合は、その Worker をそのまま使ってください。**

1. [Cloudflare ダッシュボード](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Worker**
   - 名前を付けて（例：`koutei-zu-bot`）**Deploy**
   - できた URL（`https://....workers.dev`）を控える
2. **Storage & Databases** → **KV** → **Create** で名前空間を作る（例：`koutei-bot-state`）
3. Worker → **Settings** → **Bindings** → **Add** → **KV namespace**
   - **Variable name（変数名）**：`STATE` ← ★この名前でないと動きません

**メモ欄**

- Worker の URL： `______________________`

---

## 6. 手順8：設定値（シークレット）を登録する

Worker → **Settings** → **Variables and Secrets** → **Add**。**種類は必ず「Secret」**を選んでください。

### 共通（Telegram 版で登録済みならそのまま）

| 名前 | 入れる値 |
|---|---|
| `WEBHOOK_SECRET` | 自分で決めるランダムな文字列（**半角英数字と `_` `-` のみ**、30文字程度） |
| `FIREBASE_API_KEY` | `AIzaSyA2iQimhNq11ElsLb57qq3fuKx_3OGIcPE` |
| `FIREBASE_PROJECT_ID` | `koutei-zu` |
| `FIRESTORE_DATABASE_ID` | `default`　← ★ `(default)` ではありません |
| `WORKSPACE_ID` | `liebe-asia-team` |
| `BOT_EMAIL` | 手順1のアドレス |
| `BOT_PASSWORD` | 手順1のパスワード |
| `TZ_OFFSET` | `9`（日本時間。ベトナム拠点の時刻で登録日を扱いたい場合は `7`） |

### Discord 用（今回追加するもの）

| 名前 | 入れる値 |
|---|---|
| `DISCORD_APP_ID` | 手順4の APPLICATION ID |
| `DISCORD_PUBLIC_KEY` | 手順4の PUBLIC KEY |
| `DISCORD_BOT_TOKEN` | 手順4の BOT TOKEN |
| `DISCORD_USER_ID` | 手順5のユーザーID |
| `DISCORD_GUILD_ID` | 手順5のサーバーID（省略可・指定推奨） |

> Telegram を使わない場合、`TELEGRAM_TOKEN` と `MY_CHAT_ID` は**登録不要**です。

---

## 7. 手順9：コードを貼り付けて公開する

1. Worker の **Edit code** を開く
2. 表示されているコードを**全部消す**
3. `bot/worker.js` の中身を全部コピーして貼り付ける
   - https://github.com/NAKAMUAR/koutei-zu/blob/main/bot/worker.js
4. **Deploy**

> **Telegram 版をすでに動かしている場合も、この貼り直しが必要です**（Discord 対応が入った新しいコードのため）。Telegram 側の動作は変わりません。

---

## 8. 手順10〜11：Firebase の疎通確認

`docs/09` の手順10〜11 と同じです。**Telegram 版で確認済みならスキップできます。**

1. ブラウザで `<WORKER_URL>/verify/<WEBHOOK_SECRET>` を開く
   → Bot 用アドレスの受信箱に届いた**確認メールのリンクをクリック**する
2. ブラウザで `<WORKER_URL>/test/<WEBHOOK_SECRET>` を開く

成功すると次のように出ます。

```json
{
  "ok": true,
  "手順": {
    "1_ログイン": "OK",
    "2_メール確認済み": "OK",
    "3_マスタの読み取り": "OK",
    "4_タスクの読み取り": "OK"
  },
  "会社数": 12,
  "担当者数": 8,
  "ステップ種類数": 7,
  "進行中タスク数": 43,
  "利用可能": { "telegram": false, "discord": true }
}
```

最後の `利用可能` で、**どのチャットアプリの設定が揃っているか**が確認できます。

---

## 9. 手順12：コマンドを登録して Discord とつなぐ

### 9-1. スラッシュコマンドを登録する

ブラウザで次のURLを開きます。

```
<WORKER_URL>/discord-init/<WEBHOOK_SECRET>
```

次のように返ってきます。

```json
{
  "エンドポイントURL": "https://koutei-zu-bot.example.workers.dev/discord",
  "コマンド登録": {
    "ok": true,
    "登録先": "サーバー 123456789（即時反映）",
    "件数": 8
  },
  "次にすること": "Discord Developer Portal の General Information にある Interactions Endpoint URL に、上の「エンドポイントURL」を設定して保存してください。"
}
```

**「エンドポイントURL」をコピーしてください。**

### 9-2. Discord 側にエンドポイントを教える

1. [Discord Developer Portal](https://discord.com/developers/applications) → 作ったアプリ → **General Information**
2. **INTERACTIONS ENDPOINT URL** の欄に、9-1 でコピーした URL（`https://.../discord`）を貼る
3. **Save Changes**

保存時に Discord から**確認の通信**が飛びます。ここで保存できれば署名の検証が正しく動いている証拠です。

> **保存に失敗する場合**は `DISCORD_PUBLIC_KEY` の値を確認してください（PUBLIC KEY であって、BOT TOKEN ではありません）。

### 9-3. 動作確認

Discord で自分のサーバーを開き、チャット欄に `/` を入力してください。
`new` `status` `due` `who` `today` `undo` `cancel` `help` が候補に出れば成功です。

`/help` を実行して、使い方が返ってきたら完了です。

---

## 10. 使い方

### 登録：`/new`

あとは**ボタンとポップアップだけ**で進みます。

```
/new
  ↓
会社を選んでください          [TAMAZEN] [SUMUS] [（直接入力）]
  ↓ TAMAZEN を押す
┌── 入力ポップアップ ──┐
│ 案件名  [ A棟        ] │      ← ここだけ文字入力
└─────────────────┘
  ↓ 送信
視点名を選んでください        [EX1] [EX2] [EX3] [IN1] [IN2] [IN3] [（直接入力）]
担当者を選んでください        [ヤマダ] [タナカ] [（直接入力）]
ステップ1 の種類              [ホワイト] [カラー] [ホワイト修正（無料）] …
「ホワイト」の制作時間         [1h] [2h] [3h] [4h] [6h] [8h] [12h] [16h] [（直接入力）]
ステップを追加しますか？       [ステップを追加] [納期の入力へ進む]
納期を選んでください           [今週末(2026-08-28)] [来週末(2026-09-04)] [指定なし] [（直接入力）]
  ↓
【この内容で登録しますか？】
会社　：TAMAZEN
案件　：A棟
納期　：2026-08-28
─ EX1（担当：ヤマダ）
   ホワイト　08:00
   カラー　04:30
合計　：12:30
                     [登録する] [やめる]
```

- **選択肢は工程図のマスタから自動生成されます。** 会社名・担当者名・ステップ種類が必ずアプリの値と一致し、打ち間違いが起きません
- 「（直接入力）」を選ぶと入力ポップアップが開きます
- 制作時間の直接入力は `8` `8:30` `4.5` のいずれでもOK
- 納期の直接入力は `8/5` `2026-08-05` のいずれでもOK
  - **`8/5` のように月日だけ書いた場合、今年の日付がすでに過ぎていれば来年として解釈します。** 確認画面に解決後の日付が出るので、必ずそこで確認してください
- 途中でやめたいときは `/cancel`。30分放置すると入力内容は破棄されます

### 取り消し：`/undo`

直前に登録した案件を丸ごと削除します（24時間以内）。

### 確認

| コマンド | 内容 |
|---|---|
| `/status` | 進行中の案件一覧（会社別・残時間・納期） |
| `/status name:A棟` | その案件の詳細（視点・ステップごとの進捗） |
| `/due` | 納期が近い順 |
| `/who` | 担当者別の残作業 |
| `/who name:ヤマダ` | その人の案件内訳 |
| `/today` | 今日の予定（※下記参照） |
| `/help` | 使い方 |

> `/status` と `/who` は、コマンドを選んだあと **name** の欄に入力すると絞り込めます。

### `/today` について

**現在は使えません。** 「何日の何時に作業するか」という予定は工程図アプリが画面を開くたびに計算しているもので、データとして保存されていないためです（設計書 4-1）。

使えるようにするには、アプリ側に「計算結果を保存する仕組み」を追加する必要があります（設計書 改善案①・第3段階）。

---

## 11. 登録後の動き

- **PCで工程図アプリを開いていれば、数秒で画面に案件が出ます**
- 優先順位は自動で会社ごとの末尾に入ります。並べ替えたいときはアプリでドラッグしてください
- **作業予定（何日の何時にやるか）の計算は、アプリを開いたときに行われます**
- 金額はBotからは登録しません。オフショア案件の金額はアプリの案件フォームで入力してください
- Discord から登録したタスクには `createdVia: "discord"` の目印が付きます

---

## 12. うまく動かないときの確認表

| 症状 | 確認すること |
|---|---|
| Developer Portal でエンドポイントURLを保存できない | `DISCORD_PUBLIC_KEY` が PUBLIC KEY か（BOT TOKEN ではない）。Worker がデプロイ済みか。URL の末尾が `/discord` か |
| `/` を打ってもコマンドが出てこない | 手順9-1 の `/discord-init` を実行したか。`DISCORD_GUILD_ID` を指定していない場合は最大1時間かかります。Bot をサーバーに招待したか（手順4-5） |
| 「アプリケーションが応答しませんでした」 | Worker のログ（Cloudflare の Logs）を確認。多くは Firebase 側の設定ミスです。まず `<WORKER_URL>/test/<WEBHOOK_SECRET>` を開いてください |
| 「この Bot は登録された本人のみが利用できます」 | `DISCORD_USER_ID` が自分のIDと一致しているか（開発者モードでコピーした数字） |
| 「エラーが発生しました：Firestore 403」 | Bot のアドレスがメンバー管理に入っているか。メール確認が済んでいるか |
| 「エラーが発生しました：Firestore 404」 | `FIRESTORE_DATABASE_ID` が `default` になっているか |
| 「Firebase ログイン失敗」 | `BOT_EMAIL` / `BOT_PASSWORD`。Bot のパスワードを変えた場合はここも直す |
| 会社や担当者の選択肢が出ない | 工程図アプリのお客様マスタ・担当者マスタが空。アプリで登録してください |
| マスタを直したのに選択肢に反映されない | 選択肢は5分間キャッシュされます。5分待つか、Worker を再デプロイしてください |
| ボタンを押しても「期限切れです」 | 30分以上放置した入力です。`/new` からやり直してください |
| 会社が26件以上あって一部が選べない | ドロップダウンは25件までのため、先頭24件＋「（直接入力）」が表示されます。一覧に無い会社は「（直接入力）」で入力してください（**工程図のマスタと同じ表記にすること**） |

原因が分からないときは、まず **`<WORKER_URL>/test/<WEBHOOK_SECRET>`** を開いてください。どの段階で失敗しているか分かります。

---

## 13. 安全に使うために

| 項目 | 内容 |
|---|---|
| 誰が使えるか | `DISCORD_USER_ID` の本人だけ。他の人がコマンドを実行しても拒否されます |
| 他のメンバーに見えるか | **見えません。** 返答はすべて ephemeral（本人にのみ表示） |
| なりすまし対策 | Discord からの通信であることを **Ed25519 署名**で毎回検証しています |
| 秘密情報の置き場所 | Cloudflare の「Secret」のみ。**GitHub には絶対に入れないでください** |
| 外部AIへの送信 | **ありません。** Gemini などのAIは一切使っていません |
| Bot ができること | 工程図のデータの読み書きのみ（メンバーと同じ権限） |

### 定期的に確認したいこと

- Bot アカウントのパスワードを変えたら、Cloudflare の `BOT_PASSWORD` も更新する
- 使わなくなったら、工程図アプリの**メンバー管理からアドレスを削除**する（それだけで一切アクセスできなくなります）
- Discord の BOT TOKEN が漏れた場合は Developer Portal で **Reset Token** し、`DISCORD_BOT_TOKEN` を更新する

---

## 14. 技術メモ（開発者向け）

- コード：`bot/worker.js`（1ファイル・依存なし・ビルド不要）。**Telegram と Discord で共通**
  - 工程図に関わるロジック（Firestore・`buildTasks`・集計・ウィザードの進行）は共通
  - 違いは末尾の「アダプタ層」だけ（`telegramUI` / `discordUI`）
- エンドポイント
  | パス | 用途 |
  |---|---|
  | `POST /discord` | Discord のインタラクション受け口 |
  | `POST /telegram` | Telegram の Webhook |
  | `GET /discord-init/<secret>` | スラッシュコマンドの登録 |
  | `GET /init/<secret>` | Telegram の Webhook 登録 |
  | `GET /verify/<secret>` | Bot アカウントへ確認メールを送る |
  | `GET /test/<secret>` | ログイン〜読み取りの疎通確認 |
- **Discord の3秒ルール**への対応
  - 自由入力（モーダル）は 3秒以内に即答する必要があるため、`modalKindFor()` が
    **custom_id と選ばれた値だけ**で判定する（Firestore を読まない）
  - それ以外は「考え中…」を返し、本処理は `ctx.waitUntil()` で継続する
- Ed25519 の検証は `Ed25519` → `NODE-ED25519` の順に試す（ランタイムの差異を吸収）
- ドロップダウンは25件まで。溢れる場合も末尾の「（直接入力）」は必ず残す
- タスクのフィールド構成は `src/App.jsx` の `buildRecords` と揃えてある。
  **アプリ側のスキーマを変えたら `buildTasks` も更新すること**
- `hours` は**小数時間**（8時間 = `8`、4時間30分 = `4.5`）。分ではない

---

## 改訂履歴

| 版 | 日付 | 内容 |
|---|---|---|
| 1.0 | 2026-08-24 | 初版（ボタン＋モーダル方式・AI不使用） |
