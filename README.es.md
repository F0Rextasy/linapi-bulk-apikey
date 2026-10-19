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

**Crea cuentas de LinAPI en masa con claves API autogeneradas — inferencia compatible con OpenAI + conector 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-53%20served-412991?style=for-the-badge)](https://a.linapi.net/pricing)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Inicio rápido](#-quick-start) · [🎁 Nivel gratuito](#-free-tier--how-much-you-get) · [🤖 Modelos](#-models--all-53-of-them) · [🧪 Usa la API](#-how-to-use-the-api) · [✅ Verificado](#-verified-working--every-key-is-tested) · [🧭 Cómo funciona](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Opciones](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Problemas](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>


---

## ✨ Por qué existe esto

LinAPI es un panel de New-API cuyo registro necesita **solo una dirección de correo electrónico y un código de 6 caracteres de ese buzón** — Turnstile está desactivado, no se requiere tarjeta, y cada cuenta nueva lleva cuota más una recarga de **check-in diario**. La unidad que escala es *una cuenta por clave*, así que esta herramienta acuña cuentas y escribe un `keys.txt` donde **cada línea sobrevivió a una llamada de chat en vivo** (109 claves en la flota del operador: 102 del riel de acuñación, 7 acuñadas por el CLI incluido mientras se verificaba). El costo real del riel es la limitación por IP, no el captcha: un worker fija una salida, mantiene su buzón durante los enfriamientos de `/api/verification`, y rota el buzón cuando el panel dice que la dirección ya es conocida.

## 🎁 Nivel gratuito — cuánto obtienes

**Una cuenta nueva es usable de inmediato**: el registro otorga cuota y el token se crea con `remain_quota: 500000`.

| Qué | Valor |
| --- | --- |
| Tarjeta requerida | **No** |
| Captcha | **Turnstile desactivado** (`GET /api/status` → `turnstile_check: false`) |
| Verificación por correo | requerida — código de 6 caracteres del buzón (`email_verification: true`) |
| Crédito de registro | medido **50 000** de cuota de cuenta en 7 cuentas acuñadas por CLI (las cuentas anteriores del riel de acuñación leían 77 000-90 000) |
| Concesión diaria | check-in habilitado — la herramienta llama a `POST /api/user/checkin` en cada cuenta |
| La unidad que escala | **una cuenta = una clave** → `--count N` es "N cuentas" |

La clave vive en la lista de tokens de la cuenta, y la herramienta re-vincula ese token a otro grupo (`default` → `vip` → `测试`, descubierto desde `/api/pricing`) hasta que el chat responde 200.

> 💡 El nivel gratuito lo define LinAPI y puede cambiar. Consulta los números en vivo en [a.linapi.net](https://a.linapi.net) — y deja que la propia puerta de la herramienta decida:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelos — los 53

El panel pone precio a **53 ids de modelo** (`GET /api/pricing`). Solo se listan los ids que respondieron un **200** en vivo con una clave real:

| ID de modelo | ✓ | Notas |
| --- | --- | --- |
| `deepseek-v4.1-flash` | ✓ | el modelo de la puerta; grupo `default`, ratio **0.15** |
| `deepseek-v4.1-flash-1017` | ✓ | misma familia, 200 en las mismas claves |
| `deepseek-v4-flash` | ✓ | 200 |
| `deepseek-v4-pro` | ✓ | 200 |

Con puerta y **rechazados** con las mismas claves funcionales (3 claves, 0 en vivo): `deepseek-chat` y `deepseek-reasoner` → **503 `model_not_found` — "No available channel for model … under group …"**. Eso es un vacío de canal en el panel, no un problema de clave — la herramienta re-vincula el grupo del token antes de rendirse. Los ids de otros proveedores en este panel quedan fuera del alcance aquí.

## 🧪 Cómo usar la API

```bash
curl https://a.linapi.net/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-v4.1-flash","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 Inicio rápido

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

`keys.txt` se escribe **solo** después de que una finalización de chat en vivo demuestre que la clave funciona.

| Modo | Qué hace |
| --- | --- |
| `run` (predeterminado) | acuña cuentas hasta `--count`, valida cada clave con un chat en vivo |
| `--verify-only` | re-revisa `keys.txt`, moviendo lo que falle a `keys-ungated.txt` |
| `--screen` | prueba tu lista de proxies contra el panel → `proxies.live.txt` |
| `--probe` | comprobación del entorno: indicadores del panel, catálogo, grupos de la puerta, salidas |
| `--collect` | reconstruye `keys.txt` desde `accounts.json` (cada fila con `chat_status: 200`) |

### 🖱️ El lanzador

El lanzador pide la lista de proxies, la cantidad y el modelo de verificación, los recuerda en `launcher.config.json`, y ejecuta el CLI con los flags correctos.

## ✅ Verificado funcionando — cada clave se prueba

| Comprobación | Resultado |
| --- | --- |
| `GET /api/status` | **200** — `LinAPI`, `email_verification: true`, `turnstile_check: false`, `checkin_enabled: true` |
| `GET /api/pricing` | **200** — **53** ids con precio; grupos de la puerta `default`, `vip`, `测试` |
| `GET /api/verification?email=…` | **200** `{success: true}` — limitado por IP, así que la herramienta mantiene el buzón y espera en lugar de descartar el intento |
| buzón | el código llega como `您的验证码为: <6 chars>` (asunto `LinAPI邮箱验证邮件`); se prueban `hex` y secuencias de dígitos por turno cuando un correo lleva más de un token |
| `POST /api/user/register?turnstile=` | **200** |
| `POST /api/user/login?turnstile=` | **200** — `access_token` |
| `POST /api/token/` → `POST /api/token/<id>/key` | token creado, clave en texto plano revelada (el panel la enmascara en las respuestas de listado) |
| `POST /api/user/checkin` | **200** |
| `POST /v1/chat/completions` — ejecutado para **cada** clave antes de escribirse | **200** con contenido real |
| una clave que falla su comprobación de chat | nunca se escribe en `keys.txt` |

## 🧭 Cómo funciona

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: LinAPI page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://a.linapi.net/v1/chat/completions → real content = the key is live
```

| Paso | Llamada | Notas |
| --- | --- | --- |
| buzón | buzón gmail de emailnator → alias `temp.tf` | dos ids de buzón rotan; una dirección reciclada que el panel ya conoce cuesta una dirección, no el intento |
| solicitud de código | `GET /api/verification?email=…` | limita por IP — el worker espera 26 s y reintenta con el mismo buzón |
| registro | `POST /api/user/register?turnstile= {username,password,email,verification_code}` | un 429 con cuerpo vacío mantiene el buzón durante 40 s |
| inicio de sesión | `POST /api/user/login?turnstile=` | `access_token` |
| clave | `POST /api/token/ {group}` → `POST /api/token/<id>/key` | cada llamada posterior lleva `New-Api-User: <id>` |
| concesión | `POST /api/user/checkin` | check-in diario |
| comprobación | `POST /v1/chat/completions` | se requiere 200 en vivo antes de `keys.txt`; si falla, el token se re-vincula al siguiente grupo |

## ⚙️ Opciones del CLI

```bash
node src/cli.js [mode] [flags]
```

| Flag | Predeterminado | Significado |
| --- | --- | --- |
| `--count N` | 5 | cuentas (= claves) a acuñar |
| `--conc N` | 1 | cuentas en vuelo (máx 16) — se fija una salida por worker |
| `--model <id>` | `deepseek-v4.1-flash` | modelo usado para la puerta en vivo |
| `--group <name>` | predeterminado del panel | grupo en el que se crea la clave |
| `--host <name>` | `a.linapi.net` | host del panel (el mismo riel funciona en réplicas de este panel) |
| `--pool <file>` | `proxies.txt` | lista de proxies (la variable de entorno `LINAPI_PROXIES` también funciona) |
| `--inbox <chain>` | `emailnator,temptf,broker` | orden del riel de buzones |
| `--tries N` | 2 | salidas probadas por cuenta |
| `--gap MS` | 1200 | pausa entre rondas dentro de un worker |

## 🛰️ Detrás de un proxy

Cada solicitud sale a través de una salida de tu pool — la herramienta nunca marca al panel desde tu propia línea. El panel limita `/api/verification` **por IP**, así que un worker fija una salida para toda la cuenta y el pool rota entre workers. Medido en la flota del operador: 3 cuentas en vuelo sobre 8 salidas acuñaron 3/3 claves en **3.5 min** (las dos primeras en 38 s).

## 📄 Archivos

| Ruta | Contenido |
| --- | --- |
| `keys.txt` | claves con chat-200, una por línea — ignorado por git |
| `keys-ungated.txt` | claves que fallaron la última revisión de `--verify-only` — reintentar más tarde |
| `accounts.json` | correo / usuario / cuota / grupo / estado de chat por cuenta — ignorado por git |
| `proxies.txt` | tu lista de salidas — ignorado por git |

## 🔌 Conectar con 9Router

[9Router](https://9router.com) es un router autoalojado y compatible con OpenAI. Un comando convierte `keys.txt` en un nodo proveedor con combos funcionales:

```bash
node src/connect-9router.js
```

Predeterminados: `--base http://localhost:20128`, `--password 123456`, `--name "LinAPI"`, `--prefix linapi`, `--base-url https://a.linapi.net/v1`.

## 🔑 Qué te da una clave

| | |
| --- | --- |
| 🏢 Proveedor | **LinAPI** — [a.linapi.net](https://a.linapi.net) |
| 🎁 Qué da el proveedor | una cuenta por clave — verificación por código de correo, concesión de check-in diario, cada clave verificada por chat |
| 🔑 Qué te da una clave | una clave API limitada a su propia cuenta: los 53 ids de modelo en el endpoint de abajo, a los límites de tu plan. La cuota vive en la **cuenta**, que es exactamente por lo que esta herramienta crea una cuenta por clave |
| 🌐 Forma de la API | Compatible con OpenAI: `POST https://a.linapi.net/v1/chat/completions` |
| 🔒 Tus datos | solo se contacta a a.linapi.net y al backend de buzón que configures; las claves permanecen en tu máquina |

## 🐞 Problemas

Si el panel cambia la forma de su registro, su correo de código o su lista de grupos, la herramienta se detiene en ese paso y lo indica (`--probe` muestra lo que ve). **[Abre un issue](../../issues)** con el comando que ejecutaste y la salida exacta; los PRs son bienvenidos.

## 📄 Licencia

MIT © 2026 — consulta [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 linapi-bulk-apikey contributors

</div>