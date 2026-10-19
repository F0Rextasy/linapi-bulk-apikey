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

**Массовое создание аккаунтов LinAPI с автоматически сгенерированными API-ключами — OpenAI-совместимый инференс + коннектор 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-53%20served-412991?style=for-the-badge)](https://a.linapi.net/pricing)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Быстрый старт](#-quick-start) · [🎁 Бесплатный тариф](#-free-tier--how-much-you-get) · [🤖 Модели](#-models--all-53-of-them) · [🧪 Использование API](#-how-to-use-the-api) · [✅ Проверено](#-verified-working--every-key-is-tested) · [🧭 Как это работает](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Опции](#️-cli-options) · [🛰️ Прокси](#️-behind-a-proxy) · [🐞 Проблемы](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>


---

## ✨ Зачем это нужно

LinAPI — это панель New-API, для регистрации в которой нужны **только адрес электронной почты и 6-символьный код из этого почтового ящика** — Turnstile отключён, карта не требуется, и каждый новый аккаунт получает квоту плюс пополнение через **ежедневную отметку**. Единица масштабирования — *один аккаунт на ключ*, поэтому этот инструмент создаёт аккаунты и записывает `keys.txt`, где **каждая строка прошла живой вызов чата** (109 ключей на парке оператора: 102 из конвейера создания, 7 созданы поставляемым CLI во время его проверки). Реальная стоимость конвейера — это троттлинг по IP, а не капча: воркер закрепляет один выход, удерживает свой почтовый ящик через периоды ожидания `/api/verification` и меняет ящик, когда панель сообщает, что адрес уже известен.

## 🎁 Бесплатный тариф — сколько вы получаете

**Новый аккаунт можно использовать сразу**: регистрация даёт квоту, а токен создаётся с `remain_quota: 500000`.

| Что | Значение |
| --- | --- |
| Требуется карта | **Нет** |
| Капча | **Turnstile отключён** (`GET /api/status` → `turnstile_check: false`) |
| Проверка почты | требуется — 6-символьный код из входящих (`email_verification: true`) |
| Кредит при регистрации | измерено **50 000** квоты аккаунта на 7 аккаунтах, созданных CLI (более ранние аккаунты конвейера показывали 77 000–90 000) |
| Ежедневный грант | отметка включена — инструмент вызывает `POST /api/user/checkin` для каждого аккаунта |
| Единица масштабирования | **один аккаунт = один ключ** → `--count N` означает «N аккаунтов» |

Ключ хранится в списке токенов аккаунта, и инструмент перепривязывает этот токен к другой группе (`default` → `vip` → `测试`, обнаруженным из `/api/pricing`), пока чат не ответит 200.

> 💡 Бесплатный тариф устанавливается LinAPI и может измениться. Проверяйте актуальные цифры на [a.linapi.net](https://a.linapi.net) — и пусть решение принимает собственный гейт инструмента:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Модели — все 53

Панель оценивает **53 id моделей** (`GET /api/pricing`). Перечислены только те id, которые ответили живым **200** с реальным ключом:

| ID модели | ✓ | Примечания |
| --- | --- | --- |
| `deepseek-v4.1-flash` | ✓ | гейт-модель; группа `default`, коэффициент **0.15** |
| `deepseek-v4.1-flash-1017` | ✓ | то же семейство, 200 на тех же ключах |
| `deepseek-v4-flash` | ✓ | 200 |
| `deepseek-v4-pro` | ✓ | 200 |

Отказано с рабочим ключом: `deepseek-chat` → **503 `model_not_found` — "No available channel for model deepseek-chat under group …"** (пробел в группе/канале, а не проблема с ключом). Панель также предоставляет `deepseek-reasoner`, `deepseek-v3.2` и id других поставщиков; они отсутствуют в этой таблице, потому что не проходили гейт.

## 🧪 Как использовать API

```bash
curl https://a.linapi.net/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-v4.1-flash","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 Быстрый старт

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

`keys.txt` записывается **только** после того, как живое завершение чата подтвердит ключ.

| Режим | Что делает |
| --- | --- |
| `run` (по умолчанию) | создаёт аккаунты до `--count`, проверяет каждый ключ живым чатом |
| `--verify-only` | повторно проверяет `keys.txt`, перемещая всё, что не прошло, в `keys-ungated.txt` |
| `--screen` | тестирует ваш список прокси против панели → `proxies.live.txt` |
| `--probe` | проверка окружения: флаги панели, каталог, группы гейта, выходы |
| `--collect` | пересобирает `keys.txt` из `accounts.json` (каждая строка с `chat_status: 200`) |

### 🖱️ Лаунчер

Лаунчер запрашивает список прокси, количество и модель проверки, запоминает их в `launcher.config.json` и запускает CLI с нужными флагами.

## ✅ Проверено в работе — каждый ключ протестирован

| Проверка | Результат |
| --- | --- |
| `GET /api/status` | **200** — `LinAPI`, `email_verification: true`, `turnstile_check: false`, `checkin_enabled: true` |
| `GET /api/pricing` | **200** — **53** оценённых id; группы гейта `default`, `vip`, `测试` |
| `GET /api/verification?email=…` | **200** `{success: true}` — троттлинг по IP, поэтому инструмент удерживает ящик и ждёт, а не отбрасывает попытку |
| почтовый ящик | код приходит как `您的验证码为: <6 chars>` (тема `LinAPI邮箱验证邮件`); `hex` и последовательности цифр пробуются по очереди, когда письмо содержит более одного токена |
| `POST /api/user/register?turnstile=` | **200** |
| `POST /api/user/login?turnstile=` | **200** — `access_token` |
| `POST /api/token/` → `POST /api/token/<id>/key` | токен создан, открытый ключ раскрыт (панель маскирует его в ответах списка) |
| `POST /api/user/checkin` | **200** |
| `POST /v1/chat/completions` — выполняется для **каждого** ключа перед записью | **200** с реальным содержимым |
| ключ, не прошедший проверку чатом | никогда не записывается в `keys.txt` |

## 🧭 Как это работает

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: LinAPI page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://a.linapi.net/v1/chat/completions → real content = the key is live
```

| Шаг | Вызов | Примечания |
| --- | --- | --- |
| почтовый ящик | gmail-ящик emailnator → псевдоним `temp.tf` | два id ящиков чередуются; переработанный адрес, уже известный панели, стоит одного адреса, а не попытки |
| запрос кода | `GET /api/verification?email=…` | троттлинг по IP — воркер ждёт 26 с и повторяет с тем же ящиком |
| регистрация | `POST /api/user/register?turnstile= {username,password,email,verification_code}` | 429 с пустым телом удерживает ящик на 40 с |
| вход | `POST /api/user/login?turnstile=` | `access_token` |
| ключ | `POST /api/token/ {group}` → `POST /api/token/<id>/key` | каждый последующий вызов несёт `New-Api-User: <id>` |
| грант | `POST /api/user/checkin` | ежедневная отметка |
| проверка | `POST /v1/chat/completions` | требуется живой 200 перед `keys.txt`; при неудаче токен перепривязывается к следующей группе |

## ⚙️ Опции CLI

```bash
node src/cli.js [mode] [flags]
```

| Флаг | По умолчанию | Значение |
| --- | --- | --- |
| `--count N` | 5 | аккаунтов (= ключей) для создания |
| `--conc N` | 1 | аккаунтов в работе (макс. 16) — на каждый воркер закрепляется один выход |
| `--model <id>` | `deepseek-v4.1-flash` | модель, используемая для живого гейта |
| `--group <name>` | по умолчанию панели | группа, в которой создаётся ключ |
| `--host <name>` | `a.linapi.net` | хост панели (тот же конвейер работает на зеркалах этой панели) |
| `--pool <file>` | `proxies.txt` | список прокси (также работает переменная окружения `LINAPI_PROXIES`) |
| `--inbox <chain>` | `emailnator,temptf,broker` | порядок конвейера почтовых ящиков |
| `--tries N` | 2 | выходов, пробуемых на аккаунт |
| `--gap MS` | 1200 | пауза между раундами внутри воркера |

## 🛰️ За прокси

Каждый запрос уходит через выход из вашего пула — инструмент никогда не обращается к панели с вашей собственной линии. Панель троттлит `/api/verification` **по IP**, поэтому воркер закрепляет один выход на весь аккаунт, а пул ротируется между воркерами. Измерено на парке оператора: 3 аккаунта в работе через 8 выходов создали 3/3 ключей за **3.5 мин** (первые два за 38 с).

## 📄 Файлы

| Путь | Содержимое |
| --- | --- |
| `keys.txt` | ключи с chat-200, по одному на строку — игнорируется git |
| `keys-ungated.txt` | ключи, не прошедшие последнюю проверку `--verify-only` — повторите позже |
| `accounts.json` | email / имя пользователя / квота / группа / статус чата по каждому аккаунту — игнорируется git |
| `proxies.txt` | ваш список выходов — игнорируется git |

## 🔌 Подключение к 9Router

[9Router](https://9router.com) — это самостоятельно размещаемый, OpenAI-совместимый роутер. Одна команда превращает `keys.txt` в узел-провайдер с рабочими комбинациями:

```bash
node src/connect-9router.js
```

По умолчанию: `--base http://localhost:20128`, `--password 123456`, `--name "LinAPI"`, `--prefix linapi`, `--base-url https://a.linapi.net/v1`.

## 🔑 Что даёт один ключ

| | |
| --- | --- |
| 🏢 Провайдер | **LinAPI** — [a.linapi.net](https://a.linapi.net) |
| 🎁 Что даёт провайдер | один аккаунт на ключ — проверка почты кодом, ежедневный грант за отметку, каждый ключ проверен чатом |
| 🔑 Что даёт один ключ | один API-ключ, привязанный к собственному аккаунту: 53 id моделей на указанном ниже эндпоинте, в пределах лимитов вашего тарифа. Квота живёт на **аккаунте**, и именно поэтому этот инструмент создаёт один аккаунт на ключ |
| 🌐 Форма API | OpenAI-совместимый: `POST https://a.linapi.net/v1/chat/completions` |
| 🔒 Ваши данные | связь происходит только с a.linapi.net и настроенным вами бэкендом почтового ящика; ключи остаются на вашей машине |

## 🐞 Проблемы

Если панель изменит форму регистрации, письмо с кодом или список групп, инструмент остановится на этом шаге и сообщит об этом (`--probe` показывает, что он видит). **[Откройте issue](../../issues)** с командой, которую вы запустили, и точным выводом; PR приветствуются.

## 📄 Лицензия

MIT © 2026 — см. [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 linapi-bulk-apikey contributors

</div>