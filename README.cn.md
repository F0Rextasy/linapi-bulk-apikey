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

**批量创建 LinAPI 账户并自动生成 API 密钥 — 兼容 OpenAI 的推理 + 9Router 连接器。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-53%20served-412991?style=for-the-badge)](https://a.linapi.net/pricing)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 快速开始](#-quick-start) · [🎁 免费额度](#-free-tier--how-much-you-get) · [🤖 模型](#-models--all-53-of-them) · [🧪 使用 API](#-how-to-use-the-api) · [✅ 已验证](#-verified-working--every-key-is-tested) · [🧭 工作原理](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ 选项](#️-cli-options) · [🛰️ 代理](#️-behind-a-proxy) · [🐞 问题反馈](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ 为什么会有这个项目

LinAPI 是一个 New-API 面板，其注册**只需要一个电子邮箱地址和该邮箱收到的 6 位验证码** —— Turnstile 已关闭，无需银行卡，而且每个新账户都带有额度以及**每日签到**补充。可扩展的单位是*每个密钥对应一个账户*，因此这个工具会批量创建账户并写入一个 `keys.txt`，其中**每一行都通过了一次真实的聊天调用**（运营者的集群上有 109 个密钥：102 个来自批量创建通道，7 个由随附的 CLI 在验证过程中创建）。这条通道的真正成本在于按 IP 限流，而非验证码：一个 worker 固定一个出口，在 `/api/verification` 冷却期间保持其邮箱，并在面板提示该地址已被知晓时轮换邮箱。

## 🎁 免费额度 —— 你能获得多少

**新账户可立即使用**：注册即授予额度，且令牌以 `remain_quota: 500000` 创建。

| 项目 | 值 |
| --- | --- |
| 需要银行卡 | **否** |
| 验证码 | **Turnstile 已关闭**（`GET /api/status` → `turnstile_check: false`） |
| 邮箱验证 | 必需 —— 收件箱中的 6 位验证码（`email_verification: true`） |
| 注册赠送额度 | 在 7 个 CLI 创建的账户上测得账户额度为 **50 000**（批量创建通道早期账户显示为 77 000-90 000） |
| 每日赠送 | 签到已启用 —— 工具会在每个账户上调用 `POST /api/user/checkin` |
| 可扩展的单位 | **一个账户 = 一个密钥** → `--count N` 即“N 个账户” |

密钥存在于账户的令牌列表中，工具会将该令牌重新绑定到另一个分组（`default` → `vip` → `测试`，从 `/api/pricing` 发现），直到聊天返回 200。

> 💡 免费额度由 LinAPI 设定，可能会变化。请在 [a.linapi.net](https://a.linapi.net) 查看实时数字 —— 并让工具自身的门控来决定：

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 模型 —— 全部 53 个

该面板定价了 **53 个模型 id**（`GET /api/pricing`）。此处仅列出使用真实密钥返回实时 **200** 的 id：

| 模型 ID | ✓ | 备注 |
| --- | --- | --- |
| `deepseek-v4.1-flash` | ✓ | 门控模型；分组 `default`，倍率 **0.15** |
| `deepseek-v4.1-flash-1017` | ✓ | 同系列，在相同密钥上返回 200 |
| `deepseek-v4-flash` | ✓ | 200 |
| `deepseek-v4-pro` | ✓ | 200 |

使用相同可用密钥被门控并**拒绝**（3 个密钥，0 个实时）：`deepseek-chat` 和 `deepseek-reasoner` → **503 `model_not_found` —— “No available channel for model … under group …”**。这是面板上的通道缺口，而非密钥问题 —— 工具在放弃前会重新绑定令牌的分组。此面板上其他厂商的 id 不在本文范围内。

## 🧪 如何使用 API

```bash
curl https://a.linapi.net/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-v4.1-flash","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 快速开始

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

`keys.txt` **仅在**一次实时聊天补全证明密钥有效后才会写入。

| 模式 | 作用 |
| --- | --- |
| `run`（默认） | 批量创建账户直到 `--count`，用实时聊天对每个密钥进行门控 |
| `--verify-only` | 重新扫描 `keys.txt`，将任何失败的密钥移入 `keys-ungated.txt` |
| `--screen` | 用面板测试你的代理列表 → `proxies.live.txt` |
| `--probe` | 环境检查：面板标志、目录、门控分组、出口 |
| `--collect` | 从 `accounts.json` 重建 `keys.txt`（每一行 `chat_status: 200`） |

### 🖱️ 启动器

启动器会询问代理列表、数量和验证模型，将它们记住在 `launcher.config.json` 中，并使用正确的标志运行 CLI。

## ✅ 已验证可用 —— 每个密钥都经过测试

| 检查 | 结果 |
| --- | --- |
| `GET /api/status` | **200** —— `LinAPI`、`email_verification: true`、`turnstile_check: false`、`checkin_enabled: true` |
| `GET /api/pricing` | **200** —— **53** 个定价 id；门控分组 `default`、`vip`、`测试` |
| `GET /api/verification?email=…` | **200** `{success: true}` —— 按 IP 限流，因此工具会保持邮箱并等待，而不是放弃尝试 |
| 邮箱 | 验证码以 `您的验证码为: <6 chars>` 形式到达（主题 `LinAPI邮箱验证邮件`）；当一封邮件包含多个令牌时，会依次尝试 `hex` 和数字串 |
| `POST /api/user/register?turnstile=` | **200** |
| `POST /api/user/login?turnstile=` | **200** —— `access_token` |
| `POST /api/token/` → `POST /api/token/<id>/key` | 令牌已创建，明文密钥已显示（面板在列表响应中将其掩码） |
| `POST /api/user/checkin` | **200** |
| `POST /v1/chat/completions` —— 在写入**每个**密钥前运行 | **200** 且返回真实内容 |
| 未通过聊天检查的密钥 | 绝不写入 `keys.txt` |

## 🧭 工作原理

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: LinAPI page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://a.linapi.net/v1/chat/completions → real content = the key is live
```

| 步骤 | 调用 | 备注 |
| --- | --- | --- |
| 邮箱 | emailnator gmail box → `temp.tf` 别名 | 两个邮箱 id 轮换；面板已知的回收地址只消耗一个地址，而非整个尝试 |
| 请求验证码 | `GET /api/verification?email=…` | 按 IP 限流 —— worker 等待 26 秒并用同一邮箱重试 |
| 注册 | `POST /api/user/register?turnstile= {username,password,email,verification_code}` | 空响应体的 429 会保持邮箱 40 秒 |
| 登录 | `POST /api/user/login?turnstile=` | `access_token` |
| 密钥 | `POST /api/token/ {group}` → `POST /api/token/<id>/key` | 之后每次调用都携带 `New-Api-User: <id>` |
| 赠送 | `POST /api/user/checkin` | 每日签到 |
| 检查 | `POST /v1/chat/completions` | 写入 `keys.txt` 前必须实时返回 200；失败时将令牌重新绑定到下一个分组 |

## ⚙️ CLI 选项

```bash
node src/cli.js [mode] [flags]
```

| 标志 | 默认值 | 含义 |
| --- | --- | --- |
| `--count N` | 5 | 要创建的账户数（= 密钥数） |
| `--conc N` | 1 | 并发处理的账户数（最大 16）—— 每个 worker 固定一个出口 |
| `--model <id>` | `deepseek-v4.1-flash` | 用于实时门控的模型 |
| `--group <name>` | 面板默认 | 创建密钥所在的分组 |
| `--host <name>` | `a.linapi.net` | 面板主机（同一通道可运行在此面板的镜像上） |
| `--pool <file>` | `proxies.txt` | 代理列表（`LINAPI_PROXIES` 环境变量也可用） |
| `--inbox <chain>` | `emailnator,temptf,broker` | 邮箱通道顺序 |
| `--tries N` | 2 | 每个账户尝试的出口数 |
| `--gap MS` | 1200 | worker 内各轮之间的暂停 |

## 🛰️ 在代理后面

每个请求都通过你池中的一个出口发出 —— 工具绝不会从你自己的线路直接连接面板。面板**按 IP** 对 `/api/verification` 限流，因此一个 worker 会为整个账户固定一个出口，而池在 worker 之间轮换。在运营者的集群上测得：8 个出口上并发 3 个账户，在 **3.5 分钟**内创建了 3/3 个密钥（前两个用时 38 秒）。

## 📄 文件

| 路径 | 内容 |
| --- | --- |
| `keys.txt` | 聊天返回 200 的密钥，每行一个 —— 已被 git 忽略 |
| `keys-ungated.txt` | 上次 `--verify-only` 扫描失败的密钥 —— 稍后重试 |
| `accounts.json` | 每个账户的邮箱 / 用户名 / 额度 / 分组 / 聊天状态 —— 已被 git 忽略 |
| `proxies.txt` | 你的出口列表 —— 已被 git 忽略 |

## 🔌 连接到 9Router

[9Router](https://9router.com) 是一个自托管、兼容 OpenAI 的路由器。一条命令即可将 `keys.txt` 转换为带有可用组合的 provider-node：

```bash
node src/connect-9router.js
```

默认值：`--base http://localhost:20128`、`--password 123456`、`--name "LinAPI"`、`--prefix linapi`、`--base-url https://a.linapi.net/v1`。

## 🔌 连接到 OmniRoute

[OmniRoute](https://omniroute.online) 是一个自托管、兼容 OpenAI 的路由器。一条命令即可将 `keys.txt` 转换为带有可用组合的 provider-node：

```bash
node src/connect-omniroute.js
```

默认值：`--base http://localhost:20128`、`--password 123456`、`--name "LinAPI"`、`--prefix linapi`、`--base-url https://a.linapi.net/v1`。
## 🔑 一个密钥能给你带来什么

| | |
| --- | --- |
| 🏢 提供商 | **LinAPI** —— [a.linapi.net](https://a.linapi.net) |
| 🎁 提供商提供什么 | 每个密钥一个账户 —— 邮箱验证码验证、每日签到赠送、每个密钥都经过聊天验证 |
| 🔑 一个密钥能给你带来什么 | 一个限定于其自身账户的 API 密钥：下方端点上的 53 个模型 id，受你套餐的限制。额度存在于**账户**上，这正是此工具为每个密钥创建一个账户的原因 |
| 🌐 API 形态 | 兼容 OpenAI：`POST https://a.linapi.net/v1/chat/completions` |
| 🔒 你的数据 | 仅联系 a.linapi.net 和你配置的邮箱后端；密钥保留在你的机器上 |

## 🐞 问题反馈

如果面板更改了其注册形态、验证码邮件或分组列表，工具会在该步骤停止并说明原因（`--probe` 会显示它所看到的内容）。请**[提交 issue](../../issues)**，附上你运行的命令和确切的输出；欢迎 PR。

## 📄 许可证

MIT © 2026 —— 见 [LICENSE](LICENSE)。

<div align="center">

**[MIT](LICENSE)** © 2026 linapi-bulk-apikey contributors

</div>