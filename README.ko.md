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

**자동 생성된 API 키로 LinAPI 계정을 대량 생성 — OpenAI 호환 추론 + 9Router 커넥터.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-53%20served-412991?style=for-the-badge)](https://a.linapi.net/pricing)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 빠른 시작](#-quick-start) · [🎁 무료 티어](#-free-tier--how-much-you-get) · [🤖 모델](#-models--all-53-of-them) · [🧪 API 사용하기](#-how-to-use-the-api) · [✅ 검증됨](#-verified-working--every-key-is-tested) · [🧭 작동 방식](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ 옵션](#️-cli-options) · [🛰️ 프록시](#️-behind-a-proxy) · [🐞 이슈](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ 이 도구가 존재하는 이유

LinAPI는 가입 시 **이메일 주소와 해당 메일함에서 받은 6자리 코드만** 있으면 되는 New-API 패널입니다 — Turnstile은 꺼져 있고, 카드도 필요 없으며, 새로 만든 모든 계정에는 할당량과 **일일 출석 체크** 충전금이 함께 제공됩니다. 확장의 단위는 *키 하나당 계정 하나*이므로, 이 도구는 계정을 생성하고 **모든 줄이 실제 채팅 호출을 통과한** `keys.txt`를 작성합니다 (운영자의 플릿에서 109개 키: 102개는 생성 레일에서, 7개는 검증 중에 함께 제공된 CLI로 생성됨). 이 레일의 실제 비용은 캡차가 아니라 IP별 스로틀링입니다: 워커는 하나의 출구를 고정하고, `/api/verification` 쿨다운 동안 메일함을 유지하며, 패널이 주소를 이미 알고 있다고 응답하면 메일함을 교체합니다.

## 🎁 무료 티어 — 얼마나 받을 수 있나

**새 계정은 즉시 사용 가능합니다**: 가입 시 할당량이 부여되고 토큰은 `remain_quota: 500000`으로 생성됩니다.

| 항목 | 값 |
| --- | --- |
| 카드 필요 | **아니오** |
| 캡차 | **Turnstile 꺼짐** (`GET /api/status` → `turnstile_check: false`) |
| 메일 인증 | 필요 — 받은편지함의 6자리 코드 (`email_verification: true`) |
| 가입 크레딧 | CLI로 생성한 7개 계정에서 계정 할당량 **50 000** 측정됨 (생성 레일의 초기 계정들은 77 000-90 000을 기록) |
| 일일 지급 | 출석 체크 활성화 — 도구가 모든 계정에서 `POST /api/user/checkin`을 호출 |
| 확장의 단위 | **계정 하나 = 키 하나** → `--count N`은 "N개 계정"을 의미 |

키는 계정의 토큰 목록에 있으며, 도구는 채팅이 200을 반환할 때까지 해당 토큰을 다른 그룹(`default` → `vip` → `测试`, `/api/pricing`에서 발견)에 다시 바인딩합니다.

> 💡 무료 티어는 LinAPI가 설정하며 변경될 수 있습니다. 실시간 수치는 [a.linapi.net](https://a.linapi.net)에서 확인하세요 — 그리고 도구 자체의 게이트가 판단하도록 하세요:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 모델 — 53개 전부

패널은 **53개의 모델 id**에 가격을 책정합니다 (`GET /api/pricing`). 실제 키로 라이브 **200**을 응답한 id만 나열합니다:

| 모델 ID | ✓ | 비고 |
| --- | --- | --- |
| `deepseek-v4.1-flash` | ✓ | 게이트 모델; 그룹 `default`, 비율 **0.15** |
| `deepseek-v4.1-flash-1017` | ✓ | 같은 계열, 동일 키에서 200 |
| `deepseek-v4-flash` | ✓ | 200 |
| `deepseek-v4-pro` | ✓ | 200 |

동일한 작동 키로 게이트되어 **거부됨** (키 3개, 라이브 0개): `deepseek-chat` 및 `deepseek-reasoner` → **503 `model_not_found` — "No available channel for model … under group …"**. 이는 키 문제가 아니라 패널의 채널 공백입니다 — 도구는 포기하기 전에 토큰의 그룹을 다시 바인딩합니다. 이 패널의 다른 벤더 id는 여기서 다루지 않습니다.

## 🧪 API 사용 방법

```bash
curl https://a.linapi.net/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-v4.1-flash","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 빠른 시작

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

`keys.txt`는 실제 채팅 완성이 키를 증명한 **후에만** 작성됩니다.

| 모드 | 하는 일 |
| --- | --- |
| `run` (기본) | `--count`까지 계정을 생성하고, 모든 키를 라이브 채팅으로 게이트 |
| `--verify-only` | `keys.txt`를 다시 훑어 실패한 항목을 `keys-ungated.txt`로 이동 |
| `--screen` | 프록시 목록을 패널에 대해 테스트 → `proxies.live.txt` |
| `--probe` | 환경 점검: 패널 플래그, 카탈로그, 게이트 그룹, 출구 |
| `--collect` | `accounts.json`에서 `keys.txt` 재구성 (모든 `chat_status: 200` 행) |

### 🖱️ 런처

런처는 프록시 목록, 개수, 검증 모델을 묻고 이를 `launcher.config.json`에 기억한 뒤 올바른 플래그로 CLI를 실행합니다.

## ✅ 검증됨 — 모든 키가 테스트됨

| 확인 | 결과 |
| --- | --- |
| `GET /api/status` | **200** — `LinAPI`, `email_verification: true`, `turnstile_check: false`, `checkin_enabled: true` |
| `GET /api/pricing` | **200** — **53**개 가격 책정 id; 게이트 그룹 `default`, `vip`, `测试` |
| `GET /api/verification?email=…` | **200** `{success: true}` — IP별 스로틀링이므로, 도구는 시도를 포기하는 대신 메일함을 유지하고 대기 |
| 메일함 | 코드는 `您的验证码为: <6 chars>` 형식으로 도착 (제목 `LinAPI邮箱验证邮件`); 메일에 토큰이 여러 개 있으면 `hex`와 숫자 연속을 차례로 시도 |
| `POST /api/user/register?turnstile=` | **200** |
| `POST /api/user/login?turnstile=` | **200** — `access_token` |
| `POST /api/token/` → `POST /api/token/<id>/key` | 토큰 생성됨, 평문 키 노출됨 (패널은 목록 응답에서 이를 마스킹함) |
| `POST /api/user/checkin` | **200** |
| `POST /v1/chat/completions` — 작성 전 **모든** 키에 대해 실행 | 실제 콘텐츠와 함께 **200** |
| 채팅 확인에 실패한 키 | `keys.txt`에 절대 작성되지 않음 |

## 🧭 작동 방식

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: LinAPI page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://a.linapi.net/v1/chat/completions → real content = the key is live
```

| 단계 | 호출 | 비고 |
| --- | --- | --- |
| 메일함 | emailnator gmail box → `temp.tf` 별칭 | 두 개의 메일함 id가 교체됨; 패널이 이미 아는 재활용 주소는 시도가 아니라 주소 하나를 소모 |
| 코드 요청 | `GET /api/verification?email=…` | IP별로 스로틀링 — 워커는 26초 대기하고 같은 메일함으로 재시도 |
| 가입 | `POST /api/user/register?turnstile= {username,password,email,verification_code}` | 빈 본문의 429는 메일함을 40초 동안 유지 |
| 로그인 | `POST /api/user/login?turnstile=` | `access_token` |
| 키 | `POST /api/token/ {group}` → `POST /api/token/<id>/key` | 이후 모든 호출은 `New-Api-User: <id>`를 포함 |
| 지급 | `POST /api/user/checkin` | 일일 출석 체크 |
| 확인 | `POST /v1/chat/completions` | `keys.txt` 이전에 라이브 200 필요; 실패 시 토큰은 다음 그룹에 다시 바인딩됨 |

## ⚙️ CLI 옵션

```bash
node src/cli.js [mode] [flags]
```

| 플래그 | 기본값 | 의미 |
| --- | --- | --- |
| `--count N` | 5 | 생성할 계정 (= 키) 수 |
| `--conc N` | 1 | 동시 진행 계정 (최대 16) — 워커당 하나의 출구가 고정됨 |
| `--model <id>` | `deepseek-v4.1-flash` | 라이브 게이트에 사용되는 모델 |
| `--group <name>` | 패널 기본값 | 키가 생성되는 그룹 |
| `--host <name>` | `a.linapi.net` | 패널 호스트 (동일한 레일이 이 패널의 미러에서 실행됨) |
| `--pool <file>` | `proxies.txt` | 프록시 목록 (`LINAPI_PROXIES` 환경 변수도 작동) |
| `--inbox <chain>` | `emailnator,temptf,broker` | 메일함 레일 순서 |
| `--tries N` | 2 | 계정당 시도할 출구 수 |
| `--gap MS` | 1200 | 워커 내 라운드 사이의 일시 정지 |

## 🛰️ 프록시 뒤에서

모든 요청은 풀의 출구를 통해 나갑니다 — 도구는 절대 자신의 회선에서 패널에 접속하지 않습니다. 패널은 `/api/verification`을 **IP별로** 스로틀링하므로, 워커는 계정 전체에 대해 하나의 출구를 고정하고 풀은 워커 간에 교체됩니다. 운영자의 플릿에서 측정: 8개 출구에 걸쳐 3개 계정을 동시 진행하여 **3.5분** 만에 3/3 키를 생성 (처음 두 개는 38초).

## 📄 파일

| 경로 | 내용 |
| --- | --- |
| `keys.txt` | chat-200 키, 한 줄에 하나 — git-ignored |
| `keys-ungated.txt` | 마지막 `--verify-only` 훑기에서 실패한 키 — 나중에 재시도 |
| `accounts.json` | 계정별 email / username / quota / group / chat status — git-ignored |
| `proxies.txt` | 출구 목록 — git-ignored |

## 🔌 9Router에 연결

[9Router](https://9router.com)는 자체 호스팅되는 OpenAI 호환 라우터입니다. 명령 하나로 `keys.txt`를 작동하는 콤보가 있는 프로바이더 노드로 바꿉니다:

```bash
node src/connect-9router.js
```

기본값: `--base http://localhost:20128`, `--password 123456`, `--name "LinAPI"`, `--prefix linapi`, `--base-url https://a.linapi.net/v1`.

## 🔑 키 하나로 얻는 것

| | |
| --- | --- |
| 🏢 프로바이더 | **LinAPI** — [a.linapi.net](https://a.linapi.net) |
| 🎁 프로바이더가 제공하는 것 | 키 하나당 계정 하나 — 이메일 코드 인증, 일일 출석 체크 지급, 모든 키 채팅 검증됨 |
| 🔑 키 하나로 얻는 것 | 자체 계정에 범위가 지정된 API 키 하나: 아래 엔드포인트의 53개 모델 id를 요금제 한도 내에서 사용. 할당량은 **계정**에 있으므로, 이 도구가 키당 계정 하나를 생성하는 것입니다 |
| 🌐 API 형태 | OpenAI 호환: `POST https://a.linapi.net/v1/chat/completions` |
| 🔒 데이터 | a.linapi.net과 설정한 메일함 백엔드만 접속됩니다; 키는 사용자 컴퓨터에 남습니다 |

## 🐞 이슈

패널이 가입 형태, 코드 메일 또는 그룹 목록을 변경하면, 도구는 해당 단계에서 멈추고 그 사실을 알립니다 (`--probe`가 보이는 것을 표시). 실행한 명령과 정확한 출력을 포함하여 **[이슈를 열어주세요](../../issues)**; PR을 환영합니다.

## 📄 라이선스

MIT © 2026 — [LICENSE](LICENSE) 참조.

<div align="center">

**[MIT](LICENSE)** © 2026 linapi-bulk-apikey contributors

</div>