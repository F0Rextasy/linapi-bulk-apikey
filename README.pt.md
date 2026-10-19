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

**Crie contas LinAPI em massa com chaves de API geradas automaticamente — inferência compatível com OpenAI + conector 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-53%20served-412991?style=for-the-badge)](https://a.linapi.net/pricing)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Início rápido](#-quick-start) · [🎁 Nível gratuito](#-free-tier--how-much-you-get) · [🤖 Modelos](#-models--all-53-of-them) · [🧪 Use a API](#-how-to-use-the-api) · [✅ Verificado](#-verified-working--every-key-is-tested) · [🧭 Como funciona](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Opções](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Problemas](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>


---

## ✨ Por que isto existe

LinAPI é um painel New-API cujo cadastro exige **apenas um endereço de e-mail e um código de 6 caracteres dessa caixa de entrada** — o Turnstile está desativado, não há cartão, e toda conta nova carrega cota mais um reforço de **check-in diário**. A unidade que escala é *uma conta por chave*, então esta ferramenta cria contas e grava um `keys.txt` onde **cada linha sobreviveu a uma chamada de chat ao vivo** (109 chaves na frota do operador: 102 do trilho de criação, 7 criadas pela CLI fornecida enquanto era verificada). O custo real do trilho é o throttling por IP, não o captcha: um worker fixa uma saída, mantém sua caixa de entrada durante os cooldowns de `/api/verification`, e rotaciona a caixa de entrada quando o painel diz que o endereço já é conhecido.

## 🎁 Nível gratuito — quanto você recebe

**Uma conta nova é utilizável imediatamente**: o registro concede cota e o token é criado com `remain_quota: 500000`.

| O quê | Valor |
| --- | --- |
| Cartão exigido | **Não** |
| Captcha | **Turnstile desativado** (`GET /api/status` → `turnstile_check: false`) |
| Verificação por e-mail | obrigatória — código de 6 caracteres da caixa de entrada (`email_verification: true`) |
| Crédito de cadastro | medido **50 000** de cota de conta em 7 contas criadas pela CLI (as contas anteriores do trilho de criação liam 77 000-90 000) |
| Concessão diária | check-in ativado — a ferramenta chama `POST /api/user/checkin` em cada conta |
| A unidade que escala | **uma conta = uma chave** → `--count N` é "N contas" |

A chave fica na lista de tokens da conta, e a ferramenta re-vincula esse token a outro grupo (`default` → `vip` → `测试`, descoberto em `/api/pricing`) até o chat responder 200.

> 💡 O nível gratuito é definido pela LinAPI e pode mudar. Confira os números ao vivo em [a.linapi.net](https://a.linapi.net) — e deixe o próprio gate da ferramenta decidir:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelos — todos os 53

O painel precifica **53 ids de modelo** (`GET /api/pricing`). Apenas os ids que responderam um **200** ao vivo com uma chave real estão listados:

| ID do modelo | ✓ | Notas |
| --- | --- | --- |
| `deepseek-v4.1-flash` | ✓ | o modelo do gate; grupo `default`, ratio **0.15** |
| `deepseek-v4.1-flash-1017` | ✓ | mesma família, 200 nas mesmas chaves |
| `deepseek-v4-flash` | ✓ | 200 |
| `deepseek-v4-pro` | ✓ | 200 |

Recusado com uma chave funcional: `deepseek-chat` → **503 `model_not_found` — "No available channel for model deepseek-chat under group …"** (uma lacuna de grupo/canal, não um problema de chave). O painel também expõe `deepseek-reasoner`, `deepseek-v3.2` e ids de outros fornecedores; eles estão ausentes desta tabela porque não foram testados no gate.

## 🧪 Como usar a API

```bash
curl https://a.linapi.net/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-v4.1-flash","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 Início rápido

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

`keys.txt` é gravado **somente** depois que uma conclusão de chat ao vivo comprova a chave.

| Modo | O que faz |
| --- | --- |
| `run` (padrão) | cria contas até `--count`, testa cada chave com um chat ao vivo |
| `--verify-only` | re-varre `keys.txt`, movendo o que falhar para `keys-ungated.txt` |
| `--screen` | testa sua lista de proxies contra o painel → `proxies.live.txt` |
| `--probe` | verificação de ambiente: flags do painel, catálogo, grupos do gate, saídas |
| `--collect` | reconstrói `keys.txt` a partir de `accounts.json` (toda linha com `chat_status: 200`) |

### 🖱️ O launcher

O launcher pergunta a lista de proxies, a contagem e o modelo de verificação, memoriza-os em `launcher.config.json`, e executa a CLI com as flags corretas.

## ✅ Verificado funcionando — toda chave é testada

| Verificação | Resultado |
| --- | --- |
| `GET /api/status` | **200** — `LinAPI`, `email_verification: true`, `turnstile_check: false`, `checkin_enabled: true` |
| `GET /api/pricing` | **200** — **53** ids precificados; grupos do gate `default`, `vip`, `测试` |
| `GET /api/verification?email=…` | **200** `{success: true}` — com throttling por IP, então a ferramenta mantém a caixa de entrada e espera em vez de descartar a tentativa |
| caixa de entrada | o código chega como `您的验证码为: <6 chars>` (assunto `LinAPI邮箱验证邮件`); `hex` e sequências de dígitos são tentados por vez quando um e-mail carrega mais de um token |
| `POST /api/user/register?turnstile=` | **200** |
| `POST /api/user/login?turnstile=` | **200** — `access_token` |
| `POST /api/token/` → `POST /api/token/<id>/key` | token criado, chave em texto simples revelada (o painel a mascara nas respostas de listagem) |
| `POST /api/user/checkin` | **200** |
| `POST /v1/chat/completions` — executado para **toda** chave antes de ser gravada | **200** com conteúdo real |
| uma chave que falha na verificação de chat | nunca gravada em `keys.txt` |

## 🧭 Como funciona

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: LinAPI page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://a.linapi.net/v1/chat/completions → real content = the key is live
```

| Etapa | Chamada | Notas |
| --- | --- | --- |
| caixa de entrada | caixa gmail do emailnator → alias `temp.tf` | dois ids de caixa de entrada rotacionam; um endereço reciclado que o painel já conhece custa um endereço, não a tentativa |
| solicitação de código | `GET /api/verification?email=…` | faz throttling por IP — o worker espera 26 s e tenta novamente com a mesma caixa de entrada |
| cadastro | `POST /api/user/register?turnstile= {username,password,email,verification_code}` | um 429 com corpo vazio mantém a caixa de entrada por 40 s |
| login | `POST /api/user/login?turnstile=` | `access_token` |
| chave | `POST /api/token/ {group}` → `POST /api/token/<id>/key` | toda chamada posterior carrega `New-Api-User: <id>` |
| concessão | `POST /api/user/checkin` | check-in diário |
| verificação | `POST /v1/chat/completions` | 200 ao vivo exigido antes de `keys.txt`; em caso de falha o token é re-vinculado ao próximo grupo |

## ⚙️ Opções da CLI

```bash
node src/cli.js [mode] [flags]
```

| Flag | Padrão | Significado |
| --- | --- | --- |
| `--count N` | 5 | contas (= chaves) a criar |
| `--conc N` | 1 | contas em andamento (máx 16) — uma saída é fixada por worker |
| `--model <id>` | `deepseek-v4.1-flash` | modelo usado para o gate ao vivo |
| `--group <name>` | padrão do painel | grupo no qual a chave é criada |
| `--host <name>` | `a.linapi.net` | host do painel (o mesmo trilho roda em espelhos deste painel) |
| `--pool <file>` | `proxies.txt` | lista de proxies (a variável de ambiente `LINAPI_PROXIES` também funciona) |
| `--inbox <chain>` | `emailnator,temptf,broker` | ordem do trilho de caixas de entrada |
| `--tries N` | 2 | saídas tentadas por conta |
| `--gap MS` | 1200 | pausa entre rodadas dentro de um worker |

## 🛰️ Atrás de um proxy

Toda requisição sai por uma saída do seu pool — a ferramenta nunca disca para o painel a partir da sua própria linha. O painel faz throttling de `/api/verification` **por IP**, então um worker fixa uma saída para a conta inteira e o pool rotaciona entre workers. Medido na frota do operador: 3 contas em andamento sobre 8 saídas criaram 3/3 chaves em **3,5 min** (as duas primeiras em 38 s).

## 📄 Arquivos

| Caminho | Conteúdo |
| --- | --- |
| `keys.txt` | chaves com chat-200, uma por linha — ignorado pelo git |
| `keys-ungated.txt` | chaves que falharam na última varredura `--verify-only` — tente novamente depois |
| `accounts.json` | e-mail / nome de usuário / cota / grupo / status do chat por conta — ignorado pelo git |
| `proxies.txt` | sua lista de saídas — ignorado pelo git |

## 🔌 Conectar ao 9Router

[9Router](https://9router.com) é um roteador auto-hospedado e compatível com OpenAI. Um comando transforma `keys.txt` em um nó de provedor com combos funcionais:

```bash
node src/connect-9router.js
```

Padrões: `--base http://localhost:20128`, `--password 123456`, `--name "LinAPI"`, `--prefix linapi`, `--base-url https://a.linapi.net/v1`.

## 🔑 O que uma chave te dá

| | |
| --- | --- |
| 🏢 Provedor | **LinAPI** — [a.linapi.net](https://a.linapi.net) |
| 🎁 O que o provedor dá | uma conta por chave — verificação por código de e-mail, concessão de check-in diário, toda chave verificada por chat |
| 🔑 O que uma chave te dá | uma chave de API limitada à sua própria conta: os 53 ids de modelo no endpoint abaixo, nos limites do seu plano. A cota fica na **conta**, que é exatamente por isso que esta ferramenta cria uma conta por chave |
| 🌐 Formato da API | Compatível com OpenAI: `POST https://a.linapi.net/v1/chat/completions` |
| 🔒 Seus dados | apenas a.linapi.net e o backend de caixa de entrada que você configurar são contatados; as chaves ficam na sua máquina |

## 🐞 Problemas

Se o painel mudar o formato do cadastro, o e-mail de código ou a lista de grupos, a ferramenta para nessa etapa e avisa (`--probe` mostra o que ela vê). **[Abra uma issue](../../issues)** com o comando que você executou e a saída exata; PRs são bem-vindos.

## 📄 Licença

MIT © 2026 — veja [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 linapi-bulk-apikey contributors

</div>