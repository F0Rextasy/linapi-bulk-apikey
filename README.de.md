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

**LinAPI-Konten im Bulk erstellen mit automatisch generierten API-Schlüsseln — OpenAI-kompatible Inferenz + 9Router-Connector.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-53%20served-412991?style=for-the-badge)](https://a.linapi.net/pricing)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Schnellstart](#-quick-start) · [🎁 Free-Tier](#-free-tier--how-much-you-get) · [🤖 Modelle](#-models--all-53-of-them) · [🧪 API verwenden](#-how-to-use-the-api) · [✅ Verifiziert](#-verified-working--every-key-is-tested) · [🧭 Funktionsweise](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Optionen](#️-cli-options) · [🛰️ Proxys](#️-behind-a-proxy) · [🐞 Issues](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Warum es das gibt

LinAPI ist ein New-API-Panel, dessen Registrierung **nur eine E-Mail-Adresse und einen 6-stelligen Code aus diesem Postfach** benötigt — Turnstile ist aus, keine Karte, und jedes frische Konto bringt Kontingent plus einen **täglichen Check-in**-Nachschlag mit. Die Einheit, die skaliert, ist *ein Konto pro Schlüssel*, also erzeugt dieses Tool Konten und schreibt eine `keys.txt`, in der **jede Zeile einen Live-Chat-Aufruf überlebt hat** (109 Schlüssel auf der Flotte des Betreibers: 102 aus der Mint-Rail, 7 erzeugt von der mitgelieferten CLI während ihrer Verifizierung). Die eigentlichen Kosten der Rail sind Drosselung pro IP, nicht Captcha: Ein Worker bindet einen Exit, hält sein Postfach durch die `/api/verification`-Cooldowns und rotiert das Postfach, wenn das Panel meldet, dass die Adresse bereits bekannt ist.

## 🎁 Free-Tier — wie viel du bekommst

**Ein frisches Konto ist sofort nutzbar**: Die Registrierung gewährt Kontingent, und das Token wird mit `remain_quota: 500000` erstellt.

| Was | Wert |
| --- | --- |
| Karte erforderlich | **Nein** |
| Captcha | **Turnstile aus** (`GET /api/status` → `turnstile_check: false`) |
| E-Mail-Verifizierung | erforderlich — 6-stelliger Code aus dem Postfach (`email_verification: true`) |
| Registrierungsguthaben | gemessen **50 000** Kontokontingent bei 7 CLI-erzeugten Konten (die früheren Konten der Mint-Rail zeigten 77 000-90 000) |
| Tägliche Gewährung | Check-in aktiviert — das Tool ruft `POST /api/user/checkin` für jedes Konto auf |
| Die Einheit, die skaliert | **ein Konto = ein Schlüssel** → `--count N` bedeutet „N Konten" |

Der Schlüssel lebt in der Token-Liste des Kontos, und das Tool bindet dieses Token an eine andere Gruppe (`default` → `vip` → `测试`, entdeckt aus `/api/pricing`), bis der Chat mit 200 antwortet.

> 💡 Der Free-Tier wird von LinAPI festgelegt und kann sich ändern. Prüfe die Live-Zahlen unter [a.linapi.net](https://a.linapi.net) — und lass das Gate des Tools selbst entscheiden:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelle — alle 53

Das Panel bepreist **53 Modell-IDs** (`GET /api/pricing`). Nur IDs, die mit einem echten Schlüssel live mit **200** geantwortet haben, sind aufgeführt:

| Modell-ID | ✓ | Hinweise |
| --- | --- | --- |
| `deepseek-v4.1-flash` | ✓ | das Gate-Modell; Gruppe `default`, Ratio **0.15** |
| `deepseek-v4.1-flash-1017` | ✓ | gleiche Familie, 200 mit denselben Schlüsseln |
| `deepseek-v4-flash` | ✓ | 200 |
| `deepseek-v4-pro` | ✓ | 200 |

Gated und **abgelehnt** mit denselben funktionierenden Schlüsseln (3 Schlüssel, 0 live): `deepseek-chat` und `deepseek-reasoner` → **503 `model_not_found` — „No available channel for model … under group …"**. Das ist eine Kanal-Lücke im Panel, kein Schlüsselproblem — das Tool bindet die Gruppe des Tokens neu, bevor es aufgibt. IDs anderer Anbieter auf diesem Panel sind hier nicht Gegenstand.

## 🧪 So verwendest du die API

```bash
curl https://a.linapi.net/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-v4.1-flash","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 Schnellstart

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

`keys.txt` wird **erst** geschrieben, nachdem eine Live-Chat-Vervollständigung den Schlüssel bestätigt hat.

| Modus | Was er tut |
| --- | --- |
| `run` (Standard) | Konten erzeugen bis `--count`, jeden Schlüssel mit einem Live-Chat gaten |
| `--verify-only` | `keys.txt` erneut durchsuchen und alles, was fehlschlägt, nach `keys-ungated.txt` verschieben |
| `--screen` | deine Proxy-Liste gegen das Panel testen → `proxies.live.txt` |
| `--probe` | Umgebungsprüfung: Panel-Flags, Katalog, Gate-Gruppen, Exits |
| `--collect` | `keys.txt` aus `accounts.json` neu aufbauen (jede Zeile mit `chat_status: 200`) |

### 🖱️ Der Launcher

Der Launcher fragt nach Proxy-Liste, Anzahl und Verifizierungsmodell, merkt sie sich in `launcher.config.json` und führt die CLI mit den richtigen Flags aus.

## ✅ Verifiziert funktionierend — jeder Schlüssel wird getestet

| Prüfung | Ergebnis |
| --- | --- |
| `GET /api/status` | **200** — `LinAPI`, `email_verification: true`, `turnstile_check: false`, `checkin_enabled: true` |
| `GET /api/pricing` | **200** — **53** bepreiste IDs; Gate-Gruppen `default`, `vip`, `测试` |
| `GET /api/verification?email=…` | **200** `{success: true}` — pro IP gedrosselt, daher hält das Tool das Postfach und wartet, statt den Versuch zu verwerfen |
| Postfach | Der Code kommt als `您的验证码为: <6 chars>` (Betreff `LinAPI邮箱验证邮件`); `hex`- und Ziffernfolgen werden der Reihe nach versucht, wenn eine Mail mehr als ein Token enthält |
| `POST /api/user/register?turnstile=` | **200** |
| `POST /api/user/login?turnstile=` | **200** — `access_token` |
| `POST /api/token/` → `POST /api/token/<id>/key` | Token erstellt, Klartext-Schlüssel offengelegt (das Panel maskiert ihn in Listen-Antworten) |
| `POST /api/user/checkin` | **200** |
| `POST /v1/chat/completions` — für **jeden** Schlüssel ausgeführt, bevor er geschrieben wird | **200** mit echtem Inhalt |
| ein Schlüssel, der seine Chat-Prüfung nicht besteht | wird nie in `keys.txt` geschrieben |

## 🧭 Funktionsweise

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: LinAPI page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://a.linapi.net/v1/chat/completions → real content = the key is live
```

| Schritt | Aufruf | Hinweise |
| --- | --- | --- |
| Postfach | emailnator gmail box → `temp.tf`-Alias | zwei Postfach-IDs rotieren; eine recycelte Adresse, die das Panel bereits kennt, kostet eine Adresse, nicht den Versuch |
| Code-Anfrage | `GET /api/verification?email=…` | drosselt pro IP — der Worker wartet 26 s und versucht es mit demselben Postfach erneut |
| Registrierung | `POST /api/user/register?turnstile= {username,password,email,verification_code}` | ein 429 mit leerem Body hält das Postfach 40 s lang |
| Login | `POST /api/user/login?turnstile=` | `access_token` |
| Schlüssel | `POST /api/token/ {group}` → `POST /api/token/<id>/key` | jeder spätere Aufruf trägt `New-Api-User: <id>` |
| Gewährung | `POST /api/user/checkin` | täglicher Check-in |
| Prüfung | `POST /v1/chat/completions` | Live-200 erforderlich vor `keys.txt`; bei Fehlschlag wird das Token an die nächste Gruppe neu gebunden |

## ⚙️ CLI-Optionen

```bash
node src/cli.js [mode] [flags]
```

| Flag | Standard | Bedeutung |
| --- | --- | --- |
| `--count N` | 5 | zu erzeugende Konten (= Schlüssel) |
| `--conc N` | 1 | Konten in Bearbeitung (max. 16) — pro Worker wird ein Exit gebunden |
| `--model <id>` | `deepseek-v4.1-flash` | für das Live-Gate verwendetes Modell |
| `--group <name>` | Panel-Standard | Gruppe, in der der Schlüssel erstellt wird |
| `--host <name>` | `a.linapi.net` | Panel-Host (dieselbe Rail läuft auf Mirrors dieses Panels) |
| `--pool <file>` | `proxies.txt` | Proxy-Liste (auch `LINAPI_PROXIES`-Env funktioniert) |
| `--inbox <chain>` | `emailnator,temptf,broker` | Reihenfolge der Postfach-Rail |
| `--tries N` | 2 | pro Konto versuchte Exits |
| `--gap MS` | 1200 | Pause zwischen Runden innerhalb eines Workers |

## 🛰️ Hinter einem Proxy

Jede Anfrage verlässt das System über einen Exit aus deinem Pool — das Tool wählt sich nie über deine eigene Leitung ins Panel ein. Das Panel drosselt `/api/verification` **pro IP**, daher bindet ein Worker einen Exit für das gesamte Konto, und der Pool rotiert zwischen Workern. Gemessen auf der Flotte des Betreibers: 3 Konten in Bearbeitung über 8 Exits erzeugten 3/3 Schlüssel in **3,5 min** (die ersten beiden in 38 s).

## 📄 Dateien

| Pfad | Inhalt |
| --- | --- |
| `keys.txt` | Chat-200-Schlüssel, einer pro Zeile — von Git ignoriert |
| `keys-ungated.txt` | Schlüssel, die den letzten `--verify-only`-Durchlauf nicht bestanden haben — später erneut versuchen |
| `accounts.json` | E-Mail / Benutzername / Kontingent / Gruppe / Chat-Status pro Konto — von Git ignoriert |
| `proxies.txt` | deine Exit-Liste — von Git ignoriert |

## 🔌 Mit 9Router verbinden

[9Router](https://9router.com) ist ein selbst gehosteter, OpenAI-kompatibler Router. Ein Befehl verwandelt `keys.txt` in einen Provider-Node mit funktionierenden Combos:

```bash
node src/connect-9router.js
```

Standardwerte: `--base http://localhost:20128`, `--password 123456`, `--name "LinAPI"`, `--prefix linapi`, `--base-url https://a.linapi.net/v1`.

## 🔌 Mit OmniRoute verbinden

[OmniRoute](https://omniroute.online) ist ein selbst gehosteter, OpenAI-kompatibler Router. Ein Befehl verwandelt `keys.txt` in einen Provider-Node mit funktionierenden Combos:

```bash
node src/connect-omniroute.js
```

Standardwerte: `--base http://localhost:20128`, `--password 123456`, `--name "LinAPI"`, `--prefix linapi`, `--base-url https://a.linapi.net/v1`.
## 🔑 Was ein Schlüssel dir bringt

| | |
| --- | --- |
| 🏢 Anbieter | **LinAPI** — [a.linapi.net](https://a.linapi.net) |
| 🎁 Was der Anbieter gibt | ein Konto pro Schlüssel — E-Mail-Code-Verifizierung, tägliche Check-in-Gewährung, jeder Schlüssel chat-verifiziert |
| 🔑 Was ein Schlüssel dir bringt | einen API-Schlüssel, der auf sein eigenes Konto beschränkt ist: die 53 Modell-IDs am unten stehenden Endpunkt, im Rahmen der Limits deines Tarifs. Das Kontingent liegt auf dem **Konto**, genau deshalb erstellt dieses Tool ein Konto pro Schlüssel |
| 🌐 API-Form | OpenAI-kompatibel: `POST https://a.linapi.net/v1/chat/completions` |
| 🔒 Deine Daten | nur a.linapi.net und das von dir konfigurierte Postfach-Backend werden kontaktiert; Schlüssel bleiben auf deinem Rechner |

## 🐞 Issues

Wenn das Panel seine Registrierungsform, seine Code-Mail oder seine Gruppenliste ändert, stoppt das Tool an diesem Schritt und sagt es (`--probe` zeigt, was es sieht). **[Öffne ein Issue](../../issues)** mit dem ausgeführten Befehl und der exakten Ausgabe; PRs sind willkommen.

## 📄 Lizenz

MIT © 2026 — siehe [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 linapi-bulk-apikey contributors

</div>