<div align="center">

```
██╗     ██╗███╗   ██╗ █████╗ ██████╗ ██╗
██║     ██║████╗  ██║██╔══██╗██╔══██╗██║
██║     ██║██╔██╗ ██║███████║██████╔╝██║
██║     ██║██║╚██╗██║██╔══██║██╔═══╝ ██║
███████╗██║██║ ╚████║██║  ██║██║     ██║
╚══════╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝     ╚═╝
```

# linapi-bulk-apikey

**自動生成されたAPIキーでLinAPIアカウントを一括作成 — OpenAI互換の推論 + 9Routerコネクタ。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-53%20served-412991?style=for-the-badge)](https://a.linapi.net/pricing)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 クイックスタート](#-quick-start) · [🎁 無料枠](#-free-tier--how-much-you-get) · [🤖 モデル](#-models--all-53-of-them) · [🧪 APIの使い方](#-how-to-use-the-api) · [✅ 検証済み](#-verified-working--every-key-is-tested) · [🧭 仕組み](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ オプション](#️-cli-options) · [🛰️ プロキシ](#️-behind-a-proxy) · [🐞 問題報告](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ これが存在する理由

LinAPIはNew-APIパネルで、サインアップには**メールアドレスとそのメールボックスに届く6文字のコードだけ**が必要です — Turnstileはオフ、カード不要、そして新規アカウントにはすべてクォータと**毎日のチェックイン**による追加付与が付いてきます。スケールする単位は*1アカウントにつき1キー*なので、このツールはアカウントを作成し、**すべての行が実際のチャット呼び出しを通過した**`keys.txt`を書き出します（運用者の環境では109キー: 102はミントレールから、7は検証中に同梱のCLIで作成）。このレールの実際のコストはcaptchaではなくIPごとのスロットリングです。ワーカーは1つの出口を固定し、`/api/verification`のクールダウン中もメールボックスを保持し、パネルがアドレスを既知と判断した場合はメールボックスをローテーションします。

## 🎁 無料枠 — どれだけ得られるか

**新規アカウントはすぐに使用可能です**: 登録でクォータが付与され、トークンは`remain_quota: 500000`で作成されます。

| 項目 | 値 |
| --- | --- |
| カード必須 | **いいえ** |
| Captcha | **Turnstileオフ** (`GET /api/status` → `turnstile_check: false`) |
| メール認証 | 必須 — 受信トレイに届く6文字のコード (`email_verification: true`) |
| 登録クレジット | CLIで作成した7アカウントで**50 000**のアカウントクォータを計測（ミントレールの以前のアカウントは77 000〜90 000） |
| 毎日の付与 | チェックイン有効 — ツールはすべてのアカウントで`POST /api/user/checkin`を呼び出します |
| スケールする単位 | **1アカウント = 1キー** → `--count N`は「Nアカウント」を意味します |

キーはアカウントのトークンリストに存在し、ツールはチャットが200を返すまでそのトークンを別のグループ（`default` → `vip` → `测试`、`/api/pricing`から検出）に再バインドします。

> 💡 無料枠はLinAPIによって設定され、変更される可能性があります。最新の数値は[a.linapi.net](https://a.linapi.net)で確認してください — そしてツール自身のゲートに判断させてください:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 モデル — 全53個

パネルは**53個のモデルID**に価格を設定しています（`GET /api/pricing`）。実際のキーでライブの**200**を返したIDのみを掲載しています:

| モデルID | ✓ | 備考 |
| --- | --- | --- |
| `deepseek-v4.1-flash` | ✓ | ゲートモデル; グループ`default`、レシオ**0.15** |
| `deepseek-v4.1-flash-1017` | ✓ | 同じファミリー、同じキーで200 |
| `deepseek-v4-flash` | ✓ | 200 |
| `deepseek-v4-pro` | ✓ | 200 |

同じ有効なキーでゲートされ、**拒否**されました（3キー、ライブ0）: `deepseek-chat`と`deepseek-reasoner` → **503 `model_not_found` — "No available channel for model … under group …"**。これはキーの問題ではなくパネル側のチャネルギャップです — ツールは諦める前にトークンのグループを再バインドします。このパネル上の他ベンダーのIDはここでは対象外です。

## 🧪 APIの使い方

```bash
curl https://a.linapi.net/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-v4.1-flash","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 クイックスタート

```bash
# clone or fork this repository, then:
cd linapi-bulk-apikey

# 1) your proxy list, one per line (http://… or socks5://…)
printf 'http://127.0.0.1:8080\n' > proxies.txt

# 2) go
node src/launcher.js              # interactive
# or directly:
node src/cli.js --count 50 --conc 3
```

`keys.txt`は、ライブのチャット補完がキーを証明した**後にのみ**書き出されます。

| モード | 動作 |
| --- | --- |
| `run` (デフォルト) | `--count`までアカウントを作成し、すべてのキーをライブチャットでゲート |
| `--verify-only` | `keys.txt`を再スイープし、失敗したものを`keys-ungated.txt`に移動 |
| `--screen` | プロキシリストをパネルに対してテスト → `proxies.live.txt` |
| `--probe` | 環境チェック: パネルフラグ、カタログ、ゲートグループ、出口 |
| `--collect` | `accounts.json`から`keys.txt`を再構築（すべての`chat_status: 200`行） |

### 🖱️ ランチャー

ランチャーはプロキシリスト、カウント、検証モデルを尋ね、それらを`launcher.config.json`に記憶し、適切なフラグでCLIを実行します。

## ✅ 検証済み — すべてのキーがテストされています

| チェック | 結果 |
| --- | --- |
| `GET /api/status` | **200** — `LinAPI`、`email_verification: true`、`turnstile_check: false`、`checkin_enabled: true` |
| `GET /api/pricing` | **200** — **53**個の価格設定済みID; ゲートグループ`default`、`vip`、`测试` |
| `GET /api/verification?email=…` | **200** `{success: true}` — IPごとにスロットリングされるため、ツールは試行を諦めるのではなくメールボックスを保持して待機します |
| メールボックス | コードは`您的验证码为: <6 chars>`として届きます（件名`LinAPI邮箱验证邮件`）; メールに複数のトークンが含まれる場合は`hex`と数字列が順に試されます |
| `POST /api/user/register?turnstile=` | **200** |
| `POST /api/user/login?turnstile=` | **200** — `access_token` |
| `POST /api/token/` → `POST /api/token/<id>/key` | トークン作成、平文キーが開示（パネルはリスト応答でマスクします） |
| `POST /api/user/checkin` | **200** |
| `POST /v1/chat/completions` — 書き出し前に**すべての**キーに対して実行 | 実際のコンテンツで**200** |
| チャットチェックに失敗したキー | `keys.txt`に書き出されることはありません |

## 🧭 仕組み

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: LinAPI page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://a.linapi.net/v1/chat/completions → real content = the key is live
```

| ステップ | 呼び出し | 備考 |
| --- | --- | --- |
| メールボックス | emailnator gmail box → `temp.tf`エイリアス | 2つのメールボックスIDがローテーション; パネルが既に知っているリサイクルアドレスは試行ではなく1アドレスを消費 |
| コード要求 | `GET /api/verification?email=…` | IPごとにスロットリング — ワーカーは26秒待機し、同じメールボックスで再試行 |
| サインアップ | `POST /api/user/register?turnstile= {username,password,email,verification_code}` | 空ボディの429はメールボックスを40秒保持 |
| ログイン | `POST /api/user/login?turnstile=` | `access_token` |
| キー | `POST /api/token/ {group}` → `POST /api/token/<id>/key` | 以降のすべての呼び出しに`New-Api-User: <id>`を付与 |
| 付与 | `POST /api/user/checkin` | 毎日のチェックイン |
| チェック | `POST /v1/chat/completions` | `keys.txt`の前にライブ200が必須; 失敗時はトークンを次のグループに再バインド |

## ⚙️ CLIオプション

```bash
node src/cli.js [mode] [flags]
```

| フラグ | デフォルト | 意味 |
| --- | --- | --- |
| `--count N` | 5 | 作成するアカウント数（= キー数） |
| `--conc N` | 1 | 同時実行アカウント数（最大16） — ワーカーごとに1つの出口を固定 |
| `--model <id>` | `deepseek-v4.1-flash` | ライブゲートに使用するモデル |
| `--group <name>` | パネルのデフォルト | キーを作成するグループ |
| `--host <name>` | `a.linapi.net` | パネルホスト（同じレールがこのパネルのミラーでも動作） |
| `--pool <file>` | `proxies.txt` | プロキシリスト（`LINAPI_PROXIES`環境変数も可） |
| `--inbox <chain>` | `emailnator,temptf,broker` | メールボックスレールの順序 |
| `--tries N` | 2 | アカウントごとに試す出口数 |
| `--gap MS` | 1200 | ワーカー内のラウンド間の一時停止 |

## 🛰️ プロキシの背後で

すべてのリクエストはプールの出口を通って出ていきます — ツールがあなた自身の回線からパネルに接続することはありません。パネルは`/api/verification`を**IPごとに**スロットリングするため、ワーカーはアカウント全体で1つの出口を固定し、プールはワーカー間でローテーションします。運用者の環境での計測: 8つの出口で3アカウントを同時実行し、**3.5分**で3/3キーを作成（最初の2つは38秒）。

## 📄 ファイル

| パス | 内容 |
| --- | --- |
| `keys.txt` | chat-200キー、1行に1つ — git-ignored |
| `keys-ungated.txt` | 最後の`--verify-only`スイープで失敗したキー — 後で再試行 |
| `accounts.json` | アカウントごとのemail / username / quota / group / chat status — git-ignored |
| `proxies.txt` | あなたの出口リスト — git-ignored |

## 🔌 9Routerに接続

[9Router](https://9router.com)はセルフホスト型のOpenAI互換ルーターです。1つのコマンドで`keys.txt`を動作するコンボを持つプロバイダーノードに変換します:

```bash
node src/connect-9router.js
```

デフォルト: `--base http://localhost:20128`、`--password 123456`、`--name "LinAPI"`、`--prefix linapi`、`--base-url https://a.linapi.net/v1`。

## 🔑 1つのキーで得られるもの

| | |
| --- | --- |
| 🏢 プロバイダー | **LinAPI** — [a.linapi.net](https://a.linapi.net) |
| 🎁 プロバイダーが提供するもの | 1アカウントにつき1キー — メールコード認証、毎日のチェックイン付与、すべてのキーがチャット検証済み |
| 🔑 1つのキーで得られるもの | 自身のアカウントにスコープされた1つのAPIキー: 以下のエンドポイントの53個のモデルID、あなたのプランの制限内で。クォータは**アカウント**に存在するため、このツールが1キーにつき1アカウントを作成するのです |
| 🌐 API形式 | OpenAI互換: `POST https://a.linapi.net/v1/chat/completions` |
| 🔒 あなたのデータ | a.linapi.netと設定した受信トレイバックエンドのみが接触されます; キーはあなたのマシンに留まります |

## 🐞 問題報告

パネルがサインアップの形式、コードメール、またはグループリストを変更した場合、ツールはそのステップで停止し、その旨を報告します（`--probe`でツールが見ているものを表示）。実行したコマンドと正確な出力を添えて**[issueを開いてください](../../issues)**; PRも歓迎します。

## 📄 ライセンス

MIT © 2026 — [LICENSE](LICENSE)を参照。

<div align="center">

**[MIT](LICENSE)** © 2026 linapi-bulk-apikey contributors

</div>