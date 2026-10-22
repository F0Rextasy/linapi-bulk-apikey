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

**Bulk-create LinAPI accounts with auto-generated API keys — OpenAI-compatible inference + 9Router connector.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-53%20served-412991?style=for-the-badge)](https://a.linapi.net/pricing)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Quick start](#-quick-start) · [🎁 Free tier](#-free-tier--how-much-you-get) · [🤖 Models](#-models--all-53-of-them) · [🧪 Use the API](#-how-to-use-the-api) · [✅ Verified](#-verified-working--every-key-is-tested) · [🧭 How it works](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Options](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Issues](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Why this exists

LinAPI is a New-API panel whose sign-up needs **only an e-mail address and a 6-character code from that mailbox** — Turnstile is off, no card, and every fresh account carries quota plus a **daily check-in** top-up. The unit that scales is *one account per key*, so this tool mints accounts and writes a `keys.txt` where **every line survived a live chat call** (109 keys on the operator's fleet: 102 from the mint rail, 7 minted by the shipped CLI while it was being verified). The rail's real cost is per-IP throttling, not captcha: a worker pins one exit, holds its mailbox through `/api/verification` cooldowns, and rotates the mailbox when the panel says the address is already known.

## 🎁 Free tier — how much you get

**A fresh account is usable immediately**: registration grants quota and the token is created with `remain_quota: 500000`.

| What | Value |
| --- | --- |
| Card required | **No** |
| Captcha | **Turnstile off** (`GET /api/status` → `turnstile_check: false`) |
| Mail verification | required — 6-character code from the inbox (`email_verification: true`) |
| Sign-up credit | measured **50 000** account quota on 7 CLI-minted accounts (the mint rail's earlier accounts read 77 000-90 000) |
| Daily grant | check-in enabled — the tool calls `POST /api/user/checkin` on every account |
| The unit that scales | **one account = one key** → `--count N` is "N accounts" |

The key lives in the account's token list, and the tool re-binds that token to another group (`default` → `vip` → `测试`, discovered from `/api/pricing`) until the chat answers 200.

> 💡 The free tier is set by LinAPI and can change. Check the live numbers at [a.linapi.net](https://a.linapi.net) — and let the tool's own gate decide:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Models — all 53 of them

The panel prices **53 model ids** (`GET /api/pricing`). Only ids that answered a live **200** with a real key are listed:

| Model ID | ✓ | Notes |
| --- | --- | --- |
| `deepseek-v4.1-flash` | ✓ | the gate model; group `default`, ratio **0.15** |
| `deepseek-v4.1-flash-1017` | ✓ | same family, 200 on the same keys |
| `deepseek-v4-flash` | ✓ | 200 |
| `deepseek-v4-pro` | ✓ | 200 |

Gated and **refused**keys verified**503 `model_not_found` — "No available channel for model … under group …"**. That is a channel gap on the panel, not a key problem — the tool re-binds the token's group before it gives up. Other vendors' ids on this panel are out of scope here.

## 🧪 How to use the API

```bash
curl https://a.linapi.net/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-v4.1-flash","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 Quick start

```bash
# clone or fork this repository, then:
cd linapi-bulk-apikey

# 1) your proxy list, one per line (http://… or socks5://…) — optional, see below
printf 'http://127.0.0.1:8080\n' > proxies.txt   # optional — without it the tool runs direct

# 2) go
node src/launcher.js              # interactive
# or directly:
node src/cli.js --count 50 --conc 3
```

`keys.txt` is written **only** after a live chat completion proves the key.

| Mode | What it does |
| --- | --- |
| `run` (default) | mint accounts until `--count`, gate every key with a live chat |
| `--verify-only` | re-sweep `keys.txt`, moving anything that fails to `keys-ungated.txt` |
| `--screen` | test your proxy list against the panel → `proxies.live.txt` |
| `--probe` | environment check: panel flags, catalogue, gate groups, exits |
| `--collect` | rebuild `keys.txt` from `accounts.json` (every `chat_status: 200` row) |

### 🖱️ The launcher

The launcher asks for the proxy list, count and verification model, remembers them in `launcher.config.json`, and runs the CLI with the right flags.

## ✅ Verified working — every key is tested

> **Quality gates.** Every key here passed a live `chat-200` before it was written to `keys.txt`
> (dead keys are never shipped). Router combos follow the same rule at the model level: an entry is
> added **only if the model answers `chat-200` and can call tools** — a model without tool support,
> a dead key or a dead provider is dropped instead of added. Works with **9Router and OmniRoute**.

| Check | Result |
| --- | --- |
| `GET /api/status` | **200** — `LinAPI`, `email_verification: true`, `turnstile_check: false`, `checkin_enabled: true` |
| `GET /api/pricing` | **200** — **53** priced ids; gate groups `default`, `vip`, `测试` |
| `GET /api/verification?email=…` | **200** `{success: true}` — per-IP throttled, so the tool holds the mailbox and waits instead of dropping the attempt |
| mailbox | code arrives as `您的验证码为: <6 chars>` (subject `LinAPI邮箱验证邮件`); `hex` and digit runs are tried in turn when a mail carries more than one token |
| `POST /api/user/register?turnstile=` | **200** |
| `POST /api/user/login?turnstile=` | **200** — `access_token` |
| `POST /api/token/` → `POST /api/token/<id>/key` | token created, plaintext key revealed (the panel masks it in list responses) |
| `POST /api/user/checkin` | **200** |
| `POST /v1/chat/completions` — run for **every** key before it is written | **200** with real content |
| a key that fails its chat check | never written to `keys.txt` |

## 🧭 How it works

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: LinAPI page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://a.linapi.net/v1/chat/completions → real content = the key is live
```

| Step | Call | Notes |
| --- | --- | --- |
| mailbox | emailnator gmail box → `temp.tf` alias | two mailbox ids rotate; a recycled address the panel already knows costs one address, not the attempt |
| code request | `GET /api/verification?email=…` | throttles per IP — the worker waits 26 s and retries with the same mailbox |
| signup | `POST /api/user/register?turnstile= {username,password,email,verification_code}` | a 429 with an empty body holds the mailbox for 40 s |
| login | `POST /api/user/login?turnstile=` | `access_token` |
| key | `POST /api/token/ {group}` → `POST /api/token/<id>/key` | every later call carries `New-Api-User: <id>` |
| grant | `POST /api/user/checkin` | daily check-in |
| check | `POST /v1/chat/completions` | live 200 required before `keys.txt`; on failure the token is re-bound to the next group |

## ⚙️ CLI options

```bash
node src/cli.js [mode] [flags]
```

| Flag | Default | Meaning |
| --- | --- | --- |
| `--count N` | 5 | accounts (= keys) to mint |
| `--conc N` | 1 | accounts in flight (max 16) — one exit is pinned per worker |
| `--model <id>` | `deepseek-v4.1-flash` | model used for the live gate |
| `--group <name>` | panel default | group the key is created in |
| `--host <name>` | `a.linapi.net` | panel host (the same rail runs on mirrors of this panel) |
| `--pool <file>` | `proxies.txt` | optional proxy list (`LINAPI_PROXIES` env works too) |
| `--inbox <chain>` | `emailnator,temptf,broker` | mailbox rail order |
| `--tries N` | 2 | exits tried per account |
| `--gap MS` | 1200 | pause between rounds inside a worker |

## 🛰️ Behind a proxy

**Optional — recommended at scale (per-IP limits, bans).** The tool works without a proxy too.

- **With a pool:** pass `--pool <file>` (or set `LINAPI_PROXIES`) and every request goes through an exit from that list — a worker pins one exit for the whole account and the pool rotates between workers.
- **Without a pool:** the CLI prints `running WITHOUT a proxy (direct)` and connects directly; registration, the mail rail and the chat gate all run the same way.
- `--screen` tests the exits you have against the panel, or the direct route when you have none.

The panel throttles `/api/verification` **per IP**verified**3.5 min** (the first two in 38 s).

## 📄 Files

| Path | Contents |
| --- | --- |
| `keys.txt` | chat-200 keys, one per line — git-ignored |
| `keys-ungated.txt` | keys that failed the last `--verify-only` sweep — retry later |
| `accounts.json` | email / username / quota / group / chat status per account — git-ignored |
| `proxies.txt` | your exit list — git-ignored |

## 🔌 Connect to 9Router

[9Router](https://9router.com) is a self-hosted, OpenAI-compatible router. One command turns `keys.txt` into a provider-node with working combos:

```bash
node src/connect-9router.js
```

Defaults: `--base http://localhost:20128`, `--password 123456`, `--name "LinAPI"`, `--prefix linapi`, `--base-url https://a.linapi.net/v1`.

## 🔌 Connect to OmniRoute

[OmniRoute](https://omniroute.online) is a self-hosted, OpenAI-compatible router. One command turns `keys.txt` into a provider-node with working combos:

```bash
node src/connect-omniroute.js
```

Defaults: `--base http://localhost:20128`, `--password 123456`, `--name "LinAPI"`, `--prefix linapi`, `--base-url https://a.linapi.net/v1`.
## 🔑 What one key gets you

| | |
| --- | --- |
| 🏢 Provider | **LinAPI** — [a.linapi.net](https://a.linapi.net) |
| 🎁 What the provider gives | one account per key — e-mail code verification, daily check-in grant, every key chat-verified |
| 🔑 What one key gets you | one API key scoped to its own account: the 53 model ids on the endpoint below, at your plan's limits. The quota lives on the **account**, which is exactly why this tool creates one account per key |
| 🌐 API shape | OpenAI-compatible: `POST https://a.linapi.net/v1/chat/completions` |
| 🔒 Your data | only a.linapi.net and the inbox backend you configure are contacted; keys stay on your machine |

## 🐞 Issues

If the panel changes its sign-up shape, its code mail or its group list, the tool stops at that step and says so (`--probe` shows what it sees). **[Open an issue](../../issues)** with the command you ran and the exact output; PRs are welcome.

## 📄 License

MIT © 2026 — see [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 linapi-bulk-apikey contributors

</div>
