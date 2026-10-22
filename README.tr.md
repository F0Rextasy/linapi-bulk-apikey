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

**Otomatik oluşturulan API anahtarlarıyla toplu LinAPI hesabı oluşturun — OpenAI uyumlu çıkarım + 9Router bağlayıcısı.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-53%20served-412991?style=for-the-badge)](https://a.linapi.net/pricing)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Hızlı başlangıç](#-quick-start) · [🎁 Ücretsiz katman](#-free-tier--how-much-you-get) · [🤖 Modeller](#-models--all-53-of-them) · [🧪 API'yi kullanma](#-how-to-use-the-api) · [✅ Doğrulandı](#-verified-working--every-key-is-tested) · [🧭 Nasıl çalışır](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Seçenekler](#️-cli-options) · [🛰️ Proxy'ler](#️-behind-a-proxy) · [🐞 Sorunlar](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Bu neden var

LinAPI, kaydı için **yalnızca bir e-posta adresi ve o posta kutusundan gelen 6 karakterlik bir kod** gerektiren bir New-API panelidir — Turnstile kapalı, kart yok ve her yeni hesap kota artı bir **günlük giriş** takviyesi taşır. Ölçeklenen birim *anahtar başına bir hesap*tır, bu yüzden bu araç hesaplar oluşturur ve **her satırı canlı bir sohbet çağrısından geçmiş** bir `keys.txt` yazar (operatörün filosunda 109 anahtar: 102'si üretim hattından, 7'si doğrulanırken gönderilen CLI tarafından oluşturulmuş). Hattın gerçek maliyeti captcha değil, IP başına sınırlamadır: bir worker tek bir çıkışı sabitler, posta kutusunu `/api/verification` bekleme süreleri boyunca tutar ve panel adresin zaten bilindiğini söylediğinde posta kutusunu değiştirir.

## 🎁 Ücretsiz katman — ne kadar alıyorsunuz

**Yeni bir hesap hemen kullanılabilir**: kayıt kota verir ve token `remain_quota: 500000` ile oluşturulur.

| Ne | Değer |
| --- | --- |
| Kart gerekli | **Hayır** |
| Captcha | **Turnstile kapalı** (`GET /api/status` → `turnstile_check: false`) |
| Posta doğrulaması | gerekli — gelen kutusundan 6 karakterlik kod (`email_verification: true`) |
| Kayıt kredisi | 7 CLI ile oluşturulan hesapta ölçülen **50 000** hesap kotası (üretim hattının daha eski hesapları 77 000-90 000 gösteriyordu) |
| Günlük hibe | giriş etkin — araç her hesapta `POST /api/user/checkin` çağırır |
| Ölçeklenen birim | **bir hesap = bir anahtar** → `--count N` "N hesap" demektir |

Anahtar hesabın token listesinde yaşar ve araç, sohbet 200 yanıtı verene kadar o tokenı başka bir gruba (`default` → `vip` → `测试`, `/api/pricing`'den keşfedilir) yeniden bağlar.

> 💡 Ücretsiz katman LinAPI tarafından belirlenir ve değişebilir. Güncel sayıları [a.linapi.net](https://a.linapi.net) adresinden kontrol edin — ve kararı aracın kendi kapısına bırakın:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modeller — 53'ünün tamamı

Panel **53 model kimliğini** fiyatlandırır (`GET /api/pricing`). Yalnızca gerçek bir anahtarla canlı **200** yanıtı veren kimlikler listelenmiştir:

| Model Kimliği | ✓ | Notlar |
| --- | --- | --- |
| `deepseek-v4.1-flash` | ✓ | kapı modeli; grup `default`, oran **0.15** |
| `deepseek-v4.1-flash-1017` | ✓ | aynı aile, aynı anahtarlarda 200 |
| `deepseek-v4-flash` | ✓ | 200 |
| `deepseek-v4-pro` | ✓ | 200 |

Aynı çalışan anahtarlarla kapılı ve **reddedilen** (3 anahtar, 0 canlı): `deepseek-chat` ve `deepseek-reasoner` → **503 `model_not_found` — "No available channel for model … under group …"**. Bu, panelde bir kanal boşluğudur, anahtar sorunu değil — araç pes etmeden önce tokenın grubunu yeniden bağlar. Bu paneldeki diğer sağlayıcıların kimlikleri burada kapsam dışıdır.

## 🧪 API nasıl kullanılır

```bash
curl https://a.linapi.net/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-v4.1-flash","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 Hızlı başlangıç

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

`keys.txt` **yalnızca** canlı bir sohbet tamamlaması anahtarı kanıtladıktan sonra yazılır.

| Mod | Ne yapar |
| --- | --- |
| `run` (varsayılan) | `--count` değerine kadar hesap oluşturur, her anahtarı canlı bir sohbetle kapılar |
| `--verify-only` | `keys.txt` dosyasını yeniden tarar, başarısız olanları `keys-ungated.txt` dosyasına taşır |
| `--screen` | proxy listenizi panele karşı test eder → `proxies.live.txt` |
| `--probe` | ortam kontrolü: panel bayrakları, katalog, kapı grupları, çıkışlar |
| `--collect` | `accounts.json` dosyasından `keys.txt` dosyasını yeniden oluşturur (her `chat_status: 200` satırı) |

### 🖱️ Başlatıcı

Başlatıcı proxy listesini, sayıyı ve doğrulama modelini sorar, bunları `launcher.config.json` dosyasında hatırlar ve CLI'yi doğru bayraklarla çalıştırır.

## ✅ Çalıştığı doğrulandı — her anahtar test edilir

| Kontrol | Sonuç |
| --- | --- |
| `GET /api/status` | **200** — `LinAPI`, `email_verification: true`, `turnstile_check: false`, `checkin_enabled: true` |
| `GET /api/pricing` | **200** — **53** fiyatlı kimlik; kapı grupları `default`, `vip`, `测试` |
| `GET /api/verification?email=…` | **200** `{success: true}` — IP başına sınırlı, bu yüzden araç posta kutusunu tutar ve denemeyi düşürmek yerine bekler |
| posta kutusu | kod `您的验证码为: <6 chars>` olarak gelir (konu `LinAPI邮箱验证邮件`); bir posta birden fazla token taşıdığında `hex` ve rakam dizileri sırayla denenir |
| `POST /api/user/register?turnstile=` | **200** |
| `POST /api/user/login?turnstile=` | **200** — `access_token` |
| `POST /api/token/` → `POST /api/token/<id>/key` | token oluşturuldu, düz metin anahtar açığa çıktı (panel bunu liste yanıtlarında maskeler) |
| `POST /api/user/checkin` | **200** |
| `POST /v1/chat/completions` — yazılmadan önce **her** anahtar için çalıştırılır | gerçek içerikle **200** |
| sohbet kontrolünde başarısız olan bir anahtar | `keys.txt` dosyasına asla yazılmaz |

## 🧭 Nasıl çalışır

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: LinAPI page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://a.linapi.net/v1/chat/completions → real content = the key is live
```

| Adım | Çağrı | Notlar |
| --- | --- | --- |
| posta kutusu | emailnator gmail kutusu → `temp.tf` takma adı | iki posta kutusu kimliği döner; panelin zaten bildiği geri dönüştürülmüş bir adres bir adrese mal olur, denemeye değil |
| kod isteği | `GET /api/verification?email=…` | IP başına sınırlar — worker 26 sn bekler ve aynı posta kutusuyla yeniden dener |
| kayıt | `POST /api/user/register?turnstile= {username,password,email,verification_code}` | boş gövdeli bir 429, posta kutusunu 40 sn tutar |
| giriş | `POST /api/user/login?turnstile=` | `access_token` |
| anahtar | `POST /api/token/ {group}` → `POST /api/token/<id>/key` | sonraki her çağrı `New-Api-User: <id>` taşır |
| hibe | `POST /api/user/checkin` | günlük giriş |
| kontrol | `POST /v1/chat/completions` | `keys.txt` öncesinde canlı 200 gerekli; başarısızlıkta token bir sonraki gruba yeniden bağlanır |

## ⚙️ CLI seçenekleri

```bash
node src/cli.js [mode] [flags]
```

| Bayrak | Varsayılan | Anlamı |
| --- | --- | --- |
| `--count N` | 5 | oluşturulacak hesap (= anahtar) sayısı |
| `--conc N` | 1 | eşzamanlı hesap (en fazla 16) — worker başına bir çıkış sabitlenir |
| `--model <id>` | `deepseek-v4.1-flash` | canlı kapı için kullanılan model |
| `--group <name>` | panel varsayılanı | anahtarın oluşturulduğu grup |
| `--host <name>` | `a.linapi.net` | panel ana makinesi (aynı hat bu panelin yansımalarında çalışır) |
| `--pool <file>` | `proxies.txt` | proxy listesi (`LINAPI_PROXIES` ortam değişkeni de çalışır) |
| `--inbox <chain>` | `emailnator,temptf,broker` | posta kutusu hattı sırası |
| `--tries N` | 2 | hesap başına denen çıkış sayısı |
| `--gap MS` | 1200 | bir worker içindeki turlar arası bekleme |

## 🛰️ Proxy arkasında

Her istek havuzunuzdan bir çıkıştan ayrılır — araç panele asla kendi hattınızdan bağlanmaz. Panel `/api/verification` isteğini **IP başına** sınırlar, bu yüzden bir worker tüm hesap boyunca tek bir çıkışı sabitler ve havuz worker'lar arasında döner. Operatörün filosunda ölçüldü: 8 çıkış üzerinden 3 eşzamanlı hesap **3,5 dakikada** 3/3 anahtar oluşturdu (ilk ikisi 38 sn'de).

## 📄 Dosyalar

| Yol | İçerik |
| --- | --- |
| `keys.txt` | sohbet-200 anahtarları, satır başına bir tane — git tarafından yok sayılır |
| `keys-ungated.txt` | son `--verify-only` taramasında başarısız olan anahtarlar — daha sonra yeniden deneyin |
| `accounts.json` | hesap başına e-posta / kullanıcı adı / kota / grup / sohbet durumu — git tarafından yok sayılır |
| `proxies.txt` | çıkış listeniz — git tarafından yok sayılır |

## 🔌 9Router'a bağlan

[9Router](https://9router.com) kendi kendine barındırılan, OpenAI uyumlu bir yönlendiricidir. Tek bir komut `keys.txt` dosyasını çalışan kombinasyonlara sahip bir sağlayıcı düğümüne dönüştürür:

```bash
node src/connect-9router.js
```

Varsayılanlar: `--base http://localhost:20128`, `--password 123456`, `--name "LinAPI"`, `--prefix linapi`, `--base-url https://a.linapi.net/v1`.

## 🔑 Bir anahtar size ne kazandırır

| | |
| --- | --- |
| 🏢 Sağlayıcı | **LinAPI** — [a.linapi.net](https://a.linapi.net) |
| 🎁 Sağlayıcının verdikleri | anahtar başına bir hesap — e-posta kodu doğrulaması, günlük giriş hibesi, her anahtar sohbet ile doğrulanmış |
| 🔑 Bir anahtar size ne kazandırır | kendi hesabına kapsamlı bir API anahtarı: aşağıdaki uç noktadaki 53 model kimliği, planınızın sınırlarında. Kota **hesapta** yaşar, bu aracın anahtar başına bir hesap oluşturmasının nedeni tam da budur |
| 🌐 API şekli | OpenAI uyumlu: `POST https://a.linapi.net/v1/chat/completions` |
| 🔒 Verileriniz | yalnızca a.linapi.net ve yapılandırdığınız posta kutusu arka ucuna bağlanılır; anahtarlar makinenizde kalır |

## 🐞 Sorunlar

Panel kayıt şeklini, kod postasını veya grup listesini değiştirirse, araç o adımda durur ve bunu söyler (`--probe` ne gördüğünü gösterir). Çalıştırdığınız komut ve tam çıktıyla birlikte **[bir sorun açın](../../issues)**; PR'lar memnuniyetle karşılanır.

## 📄 Lisans

MIT © 2026 — bkz. [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 linapi-bulk-apikey katkıda bulunanlar

</div>