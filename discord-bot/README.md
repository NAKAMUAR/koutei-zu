# 工程図 Discord Bot セットアップガイド

Discord で「/納期」「/案件 渋谷」のようにコマンドを送ると、工程図の最新情報を返す仕組みです。
「/質問」では、AI（Gemini）が工程図のデータを見て、自由な質問や照合に答えます。

```
あなた ──/納期──▶ Discord ──▶ 受付口（Cloudflare Worker）──▶ 工程図Bot（Google Apps Script）──▶ 工程図（Firestore）
   ▲                                                                 │
   └──────────────────────── 答え ◀───────────────────────────────────┘
```

- **全部無料**で動きます（クレジットカード登録は不要。Gemini の注意点は下記）。
- 工程図は**見るだけ**です。Bot から登録・変更・削除はしません。
- LINE Bot と同じ「工程図Bot（Apps Script）」を使います。LINE をすでに設定済みなら、その Apps Script をそのまま使えます。

所要時間の目安：**40〜60分**（初回のみ）

---

## できること

| コマンド | 返ってくる内容 |
|---|---|
| `/納期 範囲` | 本日・明日・今週・来週・全体の納期（未完了の視点。納期超過も含む） |
| `/案件一覧` | 進行中の案件（会社別・全体納期・視点・担当・完了見込み） |
| `/案件 名前` | 案件の詳細：視点ごとの工程（完了日・残り時間・中止）・担当・納期・完了見込み。名前の一部・社内案件名・ひらがなでもOK。直近60日に完了した案件も探せます |
| `/スケジュール 日 担当者` | 本日・明日・あさっての担当者別の作業予定（担当者は省略可） |
| `/空き状況 日数` | 担当者ごとの今後の予定時間と空き時間（休日・不在・出勤日・残業を考慮） |
| `/進捗報告` | 本日納期・納期超過・遅れ見込み・最近の完了・本日の予定のまとめ |
| `/質問 内容` | **AI が工程図を見て答える**自由な質問・照合（例は下記） |
| `/書き出し 内容` | CSV ファイルで書き出し（進行中の視点一覧／今後2週間の予定／直近30日の完了実績）。Excel・スプレッドシートで開けます |
| `/ヘルプ` | 使い方 |

### /質問 の例

- `渋谷マンションは今週中に終わる？`
- `来週、手が空いている人は？`
- `山田さんの明後日の予定は？`
- 照合：お客様からのメールなどを貼り付けて
  `次の納期が工程図と合っているか確認して：渋谷マンション IN1 11/5、新宿オフィス EX2 11/10`
  → 「一致」「相違（工程図では〜）」「工程図に無い」に分けて答えます
- ベトナム語で質問すると、ベトナム語で答えます

> AI は、/納期 や /案件 と**同じ計算結果だけ**を見て答えます（工程図のデータを丸ごと渡したり、作り話で補ったりしないよう指示しています）。
> それでも AI の答えなので、大事な数字は /納期 や /案件 で確かめてください。

---

## 無料で使える範囲

| サービス | 無料の範囲 | この Bot での目安 |
|---|---|---|
| Discord | 無料 | — |
| Cloudflare Workers（受付口） | 1日 100,000回 | 1回のコマンドで1回 → **気にしなくてよい** |
| Google Apps Script | 外部への通信 1日 20,000回 | 1回のコマンドで3〜8回 → 1日 **2,500回以上** |
| Gemini API（/質問 だけ） | プロジェクトごとの上限（Google AI Studio で確認できます。目安：1分に10回前後・1日に数百〜千回程度） | 1回の質問で Gemini を2〜4回呼ぶ → 1日 **数百回**。上限を超えると「上限に達しました」と答えます |
| Firebase（Firestore の読み取り） | Spark プランなら 1日 50,000件 | LINE Bot と同じ（1回のコマンドで「未完了のタスク数＋数件」） |

### ⚠️ Gemini の無料枠についての注意

Gemini API の**無料枠では、送った内容（質問と、AI が見た工程図の案件名・担当者名など）が Google のサービス改善に使われ、人が読む場合があります**。

- 気になる場合は、Google AI Studio でそのプロジェクトの**請求（有料枠）を有効**にしてください。有料枠では改善には使われません。この使い方なら費用はごくわずかです（最初に少額の前払いが必要な場合があります）。
- `/質問` を使わないなら、Gemini の設定は不要です。ほかのコマンドは AI を使わないので、データは Google の外（Gemini）に送られません。

---

## Step 1. Discord にアプリを作る（15分）

1. https://discord.com/developers/applications を開き、**New Application** → 名前 `工程図Bot` → 作成
2. **General Information** のページで、次の2つをメモ帳に控える
   - **PUBLIC KEY**（Step 3 で使います）
3. 左メニュー **Installation**
   - **Installation Contexts**：**Guild Install** だけにチェック（User Install は外す）
   - **Install Link**：**None** にして保存
4. 左メニュー **Bot**
   - **Reset Token** → 表示されたトークンを控える（Step 2 のコマンド登録だけに使います。**他人に見せない**）
   - **Public Bot** を **オフ**（自分以外がこの Bot をサーバーに入れられないようにする）
   - 「Privileged Gateway Intents」は**すべてオフのまま**でOK
5. 左メニュー **OAuth2** → **OAuth2 URL Generator** で **`applications.commands`** にだけチェック →
   一番下の URL を開き、使いたいサーバーを選んで **認証**
6. Discord のアプリで **ユーザー設定 → 詳細設定 → 開発者モード** をオン →
   サーバー名を右クリック → **サーバーIDをコピー** して控える

---

## Step 2. 工程図Bot（Google Apps Script）を準備する（15分）

> **必ず Firebase のオーナーの Google アカウントで操作してください。**

### 2-1. Apps Script を用意する

- **LINE Bot をまだ設定していない場合**：[LINE Bot の手順書](../line-bot/README.md) の **Step 2 の 1〜6 と 8** を行います
  （`dist/Code.gs` と `appsscript.json` の貼り付け、`testCommands` での権限の承認。LINE のトークン・合言葉は不要です）
- **LINE Bot を設定済みの場合**：`コード.gs` を最新の [`line-bot/dist/Code.gs`](../line-bot/dist/Code.gs) に貼り替えて保存します

### 2-2. スクリプト プロパティを追加する

⚙️ **プロジェクトの設定** → **スクリプト プロパティ** に追加して保存：

| プロパティ | 値 |
|---|---|
| `DISCORD_BOT_TOKEN` | Step 1-4 の Bot のトークン |
| `DISCORD_GUILD_ID` | Step 1-6 のサーバーID（複数のサーバーで使うならカンマ区切り） |
| `GEMINI_API_KEY` | （/質問 を使うなら）Gemini の APIキー。https://aistudio.google.com/ →「Get API key」→「APIキーを作成」で発行 |

### 2-3. エディタで関数を実行する

エディタ上部の関数選択で選んで **実行** します（実行ログに結果が出ます）。

1. `makeRelaySecret` … Worker との合言葉を作ります。実行ログに出た**64文字の英数字を控える**（Step 3 で使います）
2. `registerDiscordCommands` … Discord のサーバーに `/納期` などのコマンドを登録します
   （「サーバー … にコマンドを登録しました」と出れば成功。登録後は `DISCORD_BOT_TOKEN` を消してもかまいません）
3. `testDiscordCommands` … Discord に送らずに、各コマンドの答えを実行ログで確認します

### 2-4. ウェブアプリとして公開する

- **初めての場合**：**デプロイ → 新しいデプロイ** → 種類 **ウェブアプリ** →
  次のユーザーとして実行：**自分**／アクセスできるユーザー：**全員** → **デプロイ** → URL（`…/exec`）を控える
- **LINE Bot で公開済みの場合**：**デプロイ → デプロイを管理** → ✏️ → バージョン：**新バージョン** → **デプロイ**
  （URL は LINE の Webhook URL と同じものです）

---

## Step 3. 受付口（Cloudflare Worker）を作る（10分）

1. https://dash.cloudflare.com/sign-up で無料アカウントを作成（クレジットカード不要）
2. 左メニュー **Workers & Pages**（コンピューティング）→ **作成** → **Worker** →
   名前を `koutei-discord` などにして **デプロイ**（最初のサンプルのままでOK）
3. **コードを編集** → 中身を全部消し、[`discord-bot/worker.js`](./worker.js) の全文を貼り付けて **デプロイ**
4. Worker の **設定 → 変数とシークレット** で次の3つを追加して **デプロイ（保存）**

   | 名前 | 種類 | 値 |
   |---|---|---|
   | `DISCORD_PUBLIC_KEY` | テキスト | Step 1-2 の PUBLIC KEY |
   | `GAS_URL` | テキスト | Step 2-4 のウェブアプリ URL |
   | `RELAY_SECRET` | **シークレット** | Step 2-3 の64文字の合言葉 |

5. Worker の URL（`https://koutei-discord.○○○.workers.dev`）をコピー
6. Discord Developer Portal の **General Information** → **INTERACTIONS ENDPOINT URL** に貼り付けて **Save Changes**
   - 保存できれば、Discord から Worker への接続確認（署名の確認）が通っています

---

## Step 4. 使い始める

サーバーのチャンネルで `/` を入力すると、工程図Bot のコマンドが出ます。まずは `/ヘルプ` や `/納期` を試してください。

- **使える人やチャンネルを絞りたいとき**：Discord の **サーバー設定 → 連携サービス → 工程図Bot** で、
  コマンドごとに使えるロール・チャンネルを設定できます（Bot 側の設定は不要です）
- 答えはチャンネルの全員に見えます。

---

## 更新するとき

- **工程図Bot（Apps Script）**：`コード.gs` を最新の `line-bot/dist/Code.gs` に貼り替え →
  **デプロイを管理** → ✏️ → **新バージョン** → **デプロイ**（URL は変わりません）
- **コマンドの種類が増えた・変わったとき**：上に加えて `registerDiscordCommands` を再実行
- **受付口（Worker）**：`worker.js` が変わったときだけ、Cloudflare で貼り替えてデプロイ

---

## 困ったとき

| 症状 | 確認すること |
|---|---|
| INTERACTIONS ENDPOINT URL を保存できない | Worker の `DISCORD_PUBLIC_KEY` が正しいか（General Information の PUBLIC KEY）／Worker をデプロイしたか |
| 「/」を押してもコマンドが出ない | `registerDiscordCommands` を実行したか／Step 1-5 でサーバーに入れたか／Discord を再読み込み（Ctrl+R） |
| 「アプリケーションが応答しませんでした」 | INTERACTIONS ENDPOINT URL が Worker の URL か／Cloudflare の Worker の「ログ」にエラーが無いか |
| 「合言葉（RELAY_SECRET）が一致しません」 | Worker の `RELAY_SECRET` と、Apps Script の `RELAY_SECRET`（`makeRelaySecret` の実行ログ）が同じか |
| 「アプリID が一致しません」 | Apps Script で `registerDiscordCommands` を実行したか |
| 「このサーバー（またはDM）では工程図Botを使えません」 | `DISCORD_GUILD_ID` がそのサーバーのIDか |
| 「Apps Script の応答が想定外です」 | ウェブアプリの「アクセスできるユーザー」が **全員** か／Code.gs を貼り替えたあと **新バージョン** でデプロイしたか |
| 「データの取得に失敗しました（Firestore 403 …）」 | [LINE Bot の手順書](../line-bot/README.md) の「困ったとき」と同じ（オーナーのアカウントで作ったか・権限の承認） |
| /質問 で「上限に達しました」 | Gemini の無料枠の上限です。少し待つか、/納期 などを使う |
| /質問 で「Gemini に問い合わせできませんでした（エラー 404）」 | モデル名が古くなった可能性。スクリプト プロパティ `GEMINI_MODEL` に AI Studio で使えるモデル名（例：`gemini-flash-latest`）を入れる |

---

## 仕組み（参考）

- **なぜ受付口（Worker）が要るのか**：Discord は「本当に Discord から来たか」を確かめる署名を付けて送り、
  **3秒以内**の返事と、署名が違うときの「401」の返事を求めます。Apps Script はこの署名を読めず、3秒以内に答えられないこともあるため、
  Worker が署名を確かめてすぐ「考え中…」と返し、中身を Apps Script に渡します（答えは Apps Script が Discord に書き込みます）。
- Apps Script は Worker を `RELAY_SECRET` で確かめ、さらに `DISCORD_APPLICATION_ID`（自分のアプリか）と `DISCORD_GUILD_ID`（許可したサーバーか）を確認してから工程図を読みます。
- `/質問` では、Gemini に「どのデータを見るか」だけを選ばせ（関数呼び出し）、データは /納期 などと同じ計算で作って渡します。
  Gemini はデータを書き換える手段を持ちません。
- ファイル：
  - `worker.js` … 受付口（Cloudflare Worker）
  - `../line-bot/discord.js` … Apps Script 側の Discord 処理（コマンド・CSV・書き込み・コマンド登録）
  - `../line-bot/gemini.js` … /質問（Gemini）
  - `test/worker.test.mjs`・`../line-bot/test/discord.test.mjs` … テスト（`npm test` に含まれる）
