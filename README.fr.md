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

**Créez en masse des comptes LinAPI avec des clés API générées automatiquement — inférence compatible OpenAI + connecteur 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-53%20served-412991?style=for-the-badge)](https://a.linapi.net/pricing)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Démarrage rapide](#-quick-start) · [🎁 Offre gratuite](#-free-tier--how-much-you-get) · [🤖 Modèles](#-models--all-53-of-them) · [🧪 Utiliser l'API](#-how-to-use-the-api) · [✅ Vérifié](#-verified-working--every-key-is-tested) · [🧭 Comment ça marche](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Options](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Problèmes](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>


---

## ✨ Pourquoi cet outil existe

LinAPI est un panneau New-API dont l'inscription ne nécessite **qu'une adresse e-mail et un code à 6 caractères reçu dans cette boîte mail** — Turnstile est désactivé, aucune carte bancaire requise, et chaque nouveau compte bénéficie d'un quota ainsi que d'un **check-in quotidien** en complément. L'unité qui se met à l'échelle est *un compte par clé*, donc cet outil crée des comptes et écrit un fichier `keys.txt` où **chaque ligne a survécu à un appel de chat en direct** (109 clés sur le parc de l'opérateur : 102 issues du rail de création, 7 créées par le CLI fourni pendant sa vérification). Le vrai coût du rail est la limitation par IP, pas le captcha : un worker fixe une sortie, conserve sa boîte mail pendant les temps de refroidissement de `/api/verification`, et change de boîte mail quand le panneau indique que l'adresse est déjà connue.

## 🎁 Offre gratuite — ce que vous obtenez

**Un nouveau compte est utilisable immédiatement** : l'inscription accorde un quota et le token est créé avec `remain_quota: 500000`.

| Élément | Valeur |
| --- | --- |
| Carte requise | **Non** |
| Captcha | **Turnstile désactivé** (`GET /api/status` → `turnstile_check: false`) |
| Vérification par e-mail | requise — code à 6 caractères depuis la boîte mail (`email_verification: true`) |
| Crédit d'inscription | **50 000** de quota de compte mesuré sur 7 comptes créés par le CLI (les comptes plus anciens du rail de création affichaient 77 000-90 000) |
| Attribution quotidienne | check-in activé — l'outil appelle `POST /api/user/checkin` sur chaque compte |
| L'unité qui se met à l'échelle | **un compte = une clé** → `--count N` signifie « N comptes » |

La clé réside dans la liste de tokens du compte, et l'outil relie ce token à un autre groupe (`default` → `vip` → `测试`, découverts depuis `/api/pricing`) jusqu'à ce que le chat réponde 200.

> 💡 L'offre gratuite est définie par LinAPI et peut changer. Consultez les chiffres en direct sur [a.linapi.net](https://a.linapi.net) — et laissez la propre barrière de l'outil décider :

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modèles — les 53 au complet

Le panneau tarifie **53 identifiants de modèles** (`GET /api/pricing`). Seuls les identifiants ayant répondu un **200** en direct avec une vraie clé sont listés :

| ID du modèle | ✓ | Notes |
| --- | --- | --- |
| `deepseek-v4.1-flash` | ✓ | le modèle de la barrière ; groupe `default`, ratio **0.15** |
| `deepseek-v4.1-flash-1017` | ✓ | même famille, 200 sur les mêmes clés |
| `deepseek-v4-flash` | ✓ | 200 |
| `deepseek-v4-pro` | ✓ | 200 |

Refusé avec une clé fonctionnelle : `deepseek-chat` → **503 `model_not_found` — "No available channel for model deepseek-chat under group …"** (un manque de groupe/canal, pas un problème de clé). Le panneau expose aussi `deepseek-reasoner`, `deepseek-v3.2` et les identifiants d'autres fournisseurs ; ils sont absents de ce tableau car ils n'ont pas été testés par la barrière.

## 🧪 Comment utiliser l'API

```bash
curl https://a.linapi.net/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-v4.1-flash","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 Démarrage rapide

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

`keys.txt` n'est écrit **qu'** après qu'un appel de chat en direct a prouvé la clé.

| Mode | Ce qu'il fait |
| --- | --- |
| `run` (par défaut) | crée des comptes jusqu'à `--count`, valide chaque clé avec un chat en direct |
| `--verify-only` | re-teste `keys.txt`, déplace tout ce qui échoue vers `keys-ungated.txt` |
| `--screen` | teste votre liste de proxies contre le panneau → `proxies.live.txt` |
| `--probe` | vérification de l'environnement : indicateurs du panneau, catalogue, groupes de la barrière, sorties |
| `--collect` | reconstruit `keys.txt` depuis `accounts.json` (chaque ligne `chat_status: 200`) |

### 🖱️ Le lanceur

Le lanceur demande la liste de proxies, le nombre et le modèle de vérification, les mémorise dans `launcher.config.json`, et exécute le CLI avec les bons drapeaux.

## ✅ Vérifié fonctionnel — chaque clé est testée

| Vérification | Résultat |
| --- | --- |
| `GET /api/status` | **200** — `LinAPI`, `email_verification: true`, `turnstile_check: false`, `checkin_enabled: true` |
| `GET /api/pricing` | **200** — **53** identifiants tarifés ; groupes de la barrière `default`, `vip`, `测试` |
| `GET /api/verification?email=…` | **200** `{success: true}` — limité par IP, donc l'outil conserve la boîte mail et attend au lieu d'abandonner la tentative |
| boîte mail | le code arrive sous la forme `您的验证码为: <6 chars>` (objet `LinAPI邮箱验证邮件`) ; les suites `hex` et de chiffres sont essayées tour à tour quand un mail contient plus d'un jeton |
| `POST /api/user/register?turnstile=` | **200** |
| `POST /api/user/login?turnstile=` | **200** — `access_token` |
| `POST /api/token/` → `POST /api/token/<id>/key` | token créé, clé en clair révélée (le panneau la masque dans les réponses de liste) |
| `POST /api/user/checkin` | **200** |
| `POST /v1/chat/completions` — exécuté pour **chaque** clé avant son écriture | **200** avec du contenu réel |
| une clé qui échoue à sa vérification de chat | jamais écrite dans `keys.txt` |

## 🧭 Comment ça marche

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: LinAPI page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://a.linapi.net/v1/chat/completions → real content = the key is live
```

| Étape | Appel | Notes |
| --- | --- | --- |
| boîte mail | boîte gmail emailnator → alias `temp.tf` | deux identifiants de boîte mail alternent ; une adresse recyclée que le panneau connaît déjà coûte une adresse, pas la tentative |
| demande de code | `GET /api/verification?email=…` | limite par IP — le worker attend 26 s et réessaie avec la même boîte mail |
| inscription | `POST /api/user/register?turnstile= {username,password,email,verification_code}` | un 429 avec un corps vide conserve la boîte mail pendant 40 s |
| connexion | `POST /api/user/login?turnstile=` | `access_token` |
| clé | `POST /api/token/ {group}` → `POST /api/token/<id>/key` | chaque appel ultérieur porte `New-Api-User: <id>` |
| attribution | `POST /api/user/checkin` | check-in quotidien |
| vérification | `POST /v1/chat/completions` | un 200 en direct est requis avant `keys.txt` ; en cas d'échec le token est relié au groupe suivant |

## ⚙️ Options du CLI

```bash
node src/cli.js [mode] [flags]
```

| Drapeau | Défaut | Signification |
| --- | --- | --- |
| `--count N` | 5 | comptes (= clés) à créer |
| `--conc N` | 1 | comptes en cours (max 16) — une sortie est fixée par worker |
| `--model <id>` | `deepseek-v4.1-flash` | modèle utilisé pour la barrière en direct |
| `--group <name>` | défaut du panneau | groupe dans lequel la clé est créée |
| `--host <name>` | `a.linapi.net` | hôte du panneau (le même rail fonctionne sur les miroirs de ce panneau) |
| `--pool <file>` | `proxies.txt` | liste de proxies (la variable d'env `LINAPI_PROXIES` fonctionne aussi) |
| `--inbox <chain>` | `emailnator,temptf,broker` | ordre du rail de boîtes mail |
| `--tries N` | 2 | sorties essayées par compte |
| `--gap MS` | 1200 | pause entre les tours au sein d'un worker |

## 🛰️ Derrière un proxy

Chaque requête sort via une sortie de votre pool — l'outil ne contacte jamais le panneau depuis votre propre ligne. Le panneau limite `/api/verification` **par IP**, donc un worker fixe une sortie pour tout le compte et le pool tourne entre les workers. Mesuré sur le parc de l'opérateur : 3 comptes en cours sur 8 sorties ont créé 3/3 clés en **3,5 min** (les deux premières en 38 s).

## 📄 Fichiers

| Chemin | Contenu |
| --- | --- |
| `keys.txt` | clés avec chat-200, une par ligne — ignoré par git |
| `keys-ungated.txt` | clés ayant échoué au dernier passage `--verify-only` — à réessayer plus tard |
| `accounts.json` | e-mail / nom d'utilisateur / quota / groupe / statut de chat par compte — ignoré par git |
| `proxies.txt` | votre liste de sorties — ignoré par git |

## 🔌 Connexion à 9Router

[9Router](https://9router.com) est un routeur auto-hébergé compatible OpenAI. Une seule commande transforme `keys.txt` en nœud fournisseur avec des combos fonctionnels :

```bash
node src/connect-9router.js
```

Valeurs par défaut : `--base http://localhost:20128`, `--password 123456`, `--name "LinAPI"`, `--prefix linapi`, `--base-url https://a.linapi.net/v1`.

## 🔑 Ce qu'une clé vous apporte

| | |
| --- | --- |
| 🏢 Fournisseur | **LinAPI** — [a.linapi.net](https://a.linapi.net) |
| 🎁 Ce que le fournisseur offre | un compte par clé — vérification par code e-mail, attribution quotidienne par check-in, chaque clé vérifiée par chat |
| 🔑 Ce qu'une clé vous apporte | une clé API limitée à son propre compte : les 53 identifiants de modèles sur le point de terminaison ci-dessous, selon les limites de votre forfait. Le quota réside sur le **compte**, ce qui explique précisément pourquoi cet outil crée un compte par clé |
| 🌐 Forme de l'API | Compatible OpenAI : `POST https://a.linapi.net/v1/chat/completions` |
| 🔒 Vos données | seuls a.linapi.net et le backend de boîte mail que vous configurez sont contactés ; les clés restent sur votre machine |

## 🐞 Problèmes

Si le panneau modifie la forme de son inscription, son e-mail de code ou sa liste de groupes, l'outil s'arrête à cette étape et le signale (`--probe` montre ce qu'il voit). **[Ouvrez un ticket](../../issues)** avec la commande exécutée et la sortie exacte ; les PR sont bienvenues.

## 📄 Licence

MIT © 2026 — voir [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 linapi-bulk-apikey contributors

</div>