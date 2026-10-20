#!/usr/bin/env node
'use strict';

/**
 * linapi-bulk-apikey CLI — mint LinAPI accounts, one API key per account, and
 * keep only the keys that survived a live chat call.
 *
 * Flow, per account, every panel request over one pinned exit. Your proxy list
 * is OPTIONAL: pass --pool (or the LINAPI_PROXIES env) and every request goes
 * through an exit from it; without a pool the tool connects directly.
 *   1. mailbox  emailnator gmail box (ids 3/2 rotated) → temp.tf MS alias on throttle
 *   2. code     `GET  /api/verification?email=…`  — per-IP throttled, so the
 *               mailbox is held and the wait is absorbed instead of the attempt
 *   3. register `POST /api/user/register?turnstile=` {username,password,email,verification_code}
 *   4. login    `POST /api/user/login?turnstile=`  → access_token
 *   5. account  `GET  /api/user/self`              → id + quota
 *   6. key      `POST /api/token/` {group} then `POST /api/token/<id>/key`
 *               (every later call carries `New-Api-User: <id>`)
 *   7. check-in `POST /api/user/checkin`
 *   8. gate     `POST /v1/chat/completions`        → 200 with real content = keep
 *               if the requested group is closed to fresh accounts the token is
 *               re-bound to another group from `/api/pricing` until the chat 200s
 *
 * A key is appended to `keys.txt` only *after* step 8 answers 200 — a key that
 * never passes is recorded in `accounts.json` and retried on the next run.
 *
 * Options:
 *   --count N        accounts (= keys) to mint                     [5]
 *   --conc N         accounts in flight at once, max 16            [1]
 *   --gap MS         pause between rounds inside a worker          [1200]
 *   --model <id>     model used for the live gate       [deepseek-v4.1-flash]
 *   --group <name>   token group the key is created in       ['' = panel default]
 *   --host <name>    panel host                              [a.linapi.net]
 *   --pool <file>    proxy list, one exit per line, optional (env LINAPI_PROXIES)
 *   --broker <urls>  inbox broker base URL(s), comma separated (optional rail)
 *   --inbox <chain>  mailbox rail order              [emailnator,temptf,broker]
 *   --mail-ids <l>   emailnator mailbox ids to rotate                  [3,2]
 *   --tries N        exits tried per account before giving up             [2]
 *   --timeout MS     per-request timeout                                 [60000]
 *   --verify-only    re-run every key in keys.txt through the chat gate
 *   --screen         only test the proxy list against the panel
 *   --probe          environment check: panel, exits, catalogue, groups
 *   --collect        rebuild keys.txt from accounts.json
 *   --help
 *
 * Zero dependencies. Node.js >= 18.
 */

const fs = require('fs');
const path = require('path');
const net = require('net');
const tls = require('tls');
const http = require('http');
const { URL } = require('url');

// Shipped as `<repo>/src/cli.js`; in the lab it sits in `providers/linapi/`,
// so both layouts must resolve the same root for keys.txt / accounts.json.
const ROOT = path.basename(__dirname) === 'src' ? path.resolve(__dirname, '..') : __dirname;
const KEYS_FILE = path.join(ROOT, 'keys.txt');
const UNGATED_FILE = path.join(ROOT, 'keys-ungated.txt');
const ACCOUNTS_FILE = path.join(ROOT, 'accounts.json');

const EMAILNATOR = 'https://www.emailnator.com';
const TEMPTF = 'https://temp.tf';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

// ------------------------------------------------------------------- options

const argv = process.argv.slice(2);
function arg(name, dflt) {
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const i = argv.indexOf(`--${name}`);
  if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--')) return argv[i + 1];
  return dflt;
}
const has = (name) => argv.includes(`--${name}`);
const MODES = new Set(['run', 'mint', 'gate', 'screen', 'probe', 'collect']);
const MODE = MODES.has(argv[0]) ? argv[0] : 'run';
const VERIFY_ONLY = has('verify-only') || MODE === 'gate';
const SCREEN_ONLY = has('screen') || MODE === 'screen';
const PROBE_ONLY = has('probe') || MODE === 'probe';
const COLLECT_ONLY = has('collect') || MODE === 'collect';

if (has('help') || has('h')) {
  console.log(`linapi-bulk-apikey — mint LinAPI accounts, one key each, verified by a live chat call.

  node src/cli.js --count 50         mint (a key is kept only after a chat 200)
  node src/cli.js --verify-only      re-check every key in keys.txt
  node src/cli.js --screen           test your proxy list against the panel
  node src/cli.js --probe            panel / exits / catalogue / group check
  node src/cli.js --collect          rebuild keys.txt from accounts.json
  node src/cli.js --help

  --count N      accounts to mint                                  [5]
  --conc N       accounts in flight (max 16)                       [1]
  --model <id>   model used for the live gate        [deepseek-v4.1-flash]
  --group <name> token group the key is created in          [panel default]
  --host <name>  panel host                                 [a.linapi.net]
  --pool <file>  proxy list, one exit per line, optional (env LINAPI_PROXIES)
  --inbox <c>    mailbox rail order               [emailnator,temptf,broker]
  --broker <u>   inbox broker base URL(s), comma separated

Requests go through your proxy list when one is provided (--pool / env). Without
a pool the tool connects directly.`);
  process.exit(0);
}

const COUNT = Math.max(1, parseInt(arg('count', '5'), 10) || 5);
const CONC = Math.min(16, Math.max(1, parseInt(arg('conc', arg('concurrency', '1')), 10) || 1));
const GAP_MS = Math.max(0, parseInt(arg('gap', '1200'), 10) || 0);
const TRIES = Math.max(1, parseInt(arg('tries', '2'), 10) || 2);
const TIMEOUT_MS = Math.max(5000, parseInt(arg('timeout', '60000'), 10) || 60000);
const MODEL = arg('model', 'deepseek-v4.1-flash');
const GROUP = arg('group', '');
const HOST = arg('host', 'a.linapi.net');
const BASE = `https://${HOST}`;
const BROKERS = arg('broker', 'http://127.0.0.1:9700')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const INBOX = arg('inbox', 'emailnator,temptf,broker')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const MAIL_IDS = (arg('mail-ids', '3,2').split(',').map((s) => parseInt(s.trim(), 10)).filter(Number.isFinite));
const PROXY_FILE = process.env.LINAPI_PROXIES || arg('pool', arg('proxies', 'proxies.txt'));

// ------------------------------------------------------------------ helpers

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jparse = (s) => {
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
};
const maskExit = (line) => String(line || 'direct').replace(/:[^:@/]+@/, ':***@');
const randUser = () => 'r' + Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 9).padEnd(9, '0');
function randPass() {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const punct = '!@#$%^&*';
  const all = lower + upper + digits + punct;
  const pick = (set) => set[Math.floor(Math.random() * set.length)];
  const base = [pick(lower), pick(upper), pick(digits), pick(punct)];
  while (base.length < 17) base.push(pick(all));
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base.join('');
}
function say(msg) {
  console.log(`${new Date().toISOString().slice(11, 19)} ${msg}`);
}

/**
 * Candidate codes from one mail, best first: the phrase next to the code, then
 * every 6-char hex token, then the short digit runs. The caller tries them in
 * order — a mail that carries more than one token costs a retry, not the account.
 */
function extractCode(text) {
  const clean = String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
  const out = [];
  const add = (c) => {
    if (c && !out.includes(c)) out.push(c);
  };
  const near = /(?:验证码|code|Code|CODE)[^\w]{0,12}([A-Za-z0-9]{4,8})/.exec(clean);
  if (near) add(near[1]);
  for (const m of clean.match(/\b[a-fA-F0-9]{6}\b/g) || []) add(m);
  for (const c of clean.match(/\b\d{4,6}\b/g) || []) if (!/^(19|20)\d{2}$/.test(c)) add(c);
  return out;
}

function loadExits() {
  const file = path.resolve(ROOT, PROXY_FILE);
  if (!fs.existsSync(file)) {
    // No pool = DIRECT mode: a proxy is recommended at scale (per-IP limits,
    // bans), but the tool works without one. `null` is the direct sentinel.
    console.log(`no proxy list at ${PROXY_FILE} — running WITHOUT a proxy (direct). Put exits there (or pass --pool) to rotate per account.`);
    return [null];
  }
  const exits = fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#') && !s.startsWith('//'));
  if (!exits.length) {
    console.log(`${PROXY_FILE} has no usable exits — running WITHOUT a proxy (direct).`);
    return [null];
  }
  return exits;
}

// ------------------------------------------------------------------- tunnel

/** `host:port`, an http/https exit (credentials allowed), `socks5://…`, `socks4://…`. */
function parseExit(line) {
  const m = /^(?:(socks5h|socks5|socks4a|socks4|https|http):\/\/)?(?:([^:@/\s]+):([^@/\s]*)@)?([^:/\s]+):(\d{1,5})$/.exec(
    String(line || '').trim()
  );
  if (!m) return null;
  return {
    protocol: (m[1] || 'http').toLowerCase(),
    username: m[2] ? decodeURIComponent(m[2]) : null,
    password: m[3] !== undefined && m[2] ? decodeURIComponent(m[3]) : null,
    host: m[4],
    port: Number(m[5]),
  };
}

/** Reads exactly `n` bytes; anything past `n` is pushed back for the caller. */
function readExactly(sock, n, timeoutMs) {
  return new Promise((resolve, reject) => {
    if (sock.__leftover && sock.__leftover.length >= n) {
      const out = sock.__leftover.slice(0, n);
      sock.__leftover = sock.__leftover.slice(n);
      return resolve(out);
    }
    let buf = sock.__leftover || Buffer.alloc(0);
    sock.__leftover = Buffer.alloc(0);
    if (buf.length >= n) {
      const out = buf.slice(0, n);
      sock.__leftover = buf.slice(n);
      return resolve(out);
    }
    const timer = setTimeout(() => {
      sock.removeListener('data', onData);
      sock.removeListener('error', onErr);
      reject(new Error('tunnel handshake timeout'));
    }, timeoutMs);
    const onData = (d) => {
      buf = Buffer.concat([buf, d]);
      if (buf.length >= n) {
        clearTimeout(timer);
        sock.removeListener('data', onData);
        sock.removeListener('error', onErr);
        sock.__leftover = buf.slice(n);
        resolve(buf.slice(0, n));
      }
    };
    const onErr = (e) => {
      clearTimeout(timer);
      sock.removeListener('data', onData);
      reject(e);
    };
    sock.on('data', onData);
    sock.on('error', onErr);
  });
}

/** CONNECT tunnel through an http/https exit; leftover proxy bytes are unshifted. */
async function httpTunnel(exit, host, port, timeoutMs) {
  const sock = await new Promise((resolve, reject) => {
    const s =
      exit.protocol === 'https'
        ? tls.connect({ host: exit.host, port: exit.port, servername: exit.host })
        : net.connect({ host: exit.host, port: exit.port });
    s.setTimeout(timeoutMs, () => s.destroy(new Error('exit connect timeout')));
    s.once(exit.protocol === 'https' ? 'secureConnect' : 'connect', () => resolve(s));
    s.once('error', reject);
  });
  const auth =
    exit.username && exit.password
      ? `Proxy-Authorization: Basic ${Buffer.from(`${exit.username}:${exit.password}`).toString('base64')}\r\n`
      : '';
  sock.write(`CONNECT ${host}:${port} HTTP/1.1\r\nHost: ${host}:${port}\r\n${auth}\r\n`);
  const head = await new Promise((resolve, reject) => {
    let buf = Buffer.alloc(0);
    const timer = setTimeout(() => {
      sock.removeListener('data', onData);
      reject(new Error('exit CONNECT timeout'));
    }, timeoutMs);
    const onData = (d) => {
      buf = Buffer.concat([buf, d]);
      const end = buf.indexOf('\r\n\r\n');
      if (end === -1) {
        if (buf.length > 8192) {
          clearTimeout(timer);
          sock.removeListener('data', onData);
          reject(new Error('exit sent an oversized CONNECT response'));
        }
        return;
      }
      clearTimeout(timer);
      sock.removeListener('data', onData);
      sock.__leftover = buf.slice(end + 4);
      resolve(buf.slice(0, end).toString('latin1'));
    };
    sock.on('data', onData);
  });
  const line = head.split('\r\n')[0];
  if (!/^HTTP\/1\.[01] 200/.test(line)) throw new Error(`exit CONNECT refused: ${line}`);
  return sock;
}

/** SOCKS5 (no-auth or user/pass) CONNECT. */
async function socks5Tunnel(exit, host, port, timeoutMs) {
  const needAuth = Boolean(exit.username);
  const sock = await new Promise((resolve, reject) => {
    const s = net.connect({ host: exit.host, port: exit.port });
    s.setTimeout(timeoutMs, () => s.destroy(new Error('exit connect timeout')));
    s.once('connect', () => resolve(s));
    s.once('error', reject);
  });
  sock.write(needAuth ? Buffer.from([5, 2, 0, 2]) : Buffer.from([5, 1, 0]));
  const greeting = await readExactly(sock, 2, timeoutMs);
  if (greeting[0] !== 5) throw new Error('socks5: bad greeting');
  if (greeting[1] === 2) {
    const u = Buffer.from(exit.username || '');
    const p = Buffer.from(exit.password || '');
    sock.write(Buffer.concat([Buffer.from([1, u.length]), u, Buffer.from([p.length]), p]));
    const auth = await readExactly(sock, 2, timeoutMs);
    if (auth[1] !== 0) throw new Error('socks5: auth rejected');
  } else if (greeting[1] !== 0) {
    throw new Error('socks5: no acceptable auth method');
  }
  const name = Buffer.from(host);
  if (name.length > 255) throw new Error('socks5: host too long');
  sock.write(Buffer.concat([Buffer.from([5, 1, 0, 3, name.length]), name, Buffer.from([port >> 8, port & 0xff])]));
  const head = await readExactly(sock, 4, timeoutMs);
  if (head[1] !== 0) throw new Error(`socks5: CONNECT refused (${head[1]})`);
  const tail = head[3] === 1 ? 4 + 2 : head[3] === 4 ? 16 + 2 : (await readExactly(sock, 1, timeoutMs))[0] + 2;
  await readExactly(sock, tail, timeoutMs);
  return sock;
}

/** SOCKS4 / SOCKS4a CONNECT. */
async function socks4Tunnel(exit, host, port, timeoutMs) {
  const sock = await new Promise((resolve, reject) => {
    const s = net.connect({ host: exit.host, port: exit.port });
    s.setTimeout(timeoutMs, () => s.destroy(new Error('exit connect timeout')));
    s.once('connect', () => resolve(s));
    s.once('error', reject);
  });
  const isV4a = exit.protocol === 'socks4a' || !/^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const ip = isV4a ? Buffer.from([0, 0, 0, 1]) : Buffer.from(host.split('.').map(Number));
  const user = Buffer.from(exit.username || '');
  const body = Buffer.concat([
    Buffer.from([4, 1, port >> 8, port & 0xff]),
    ip,
    user,
    Buffer.from([0]),
    isV4a ? Buffer.concat([Buffer.from(host), Buffer.from([0])]) : Buffer.alloc(0),
  ]);
  sock.write(body);
  const res = await readExactly(sock, 8, timeoutMs);
  if (res[1] !== 90) throw new Error(`socks4: CONNECT refused (${res[1]})`);
  return sock;
}

async function openTunnel(exit, host, port, timeoutMs) {
  if (exit.protocol === 'socks5' || exit.protocol === 'socks5h') return socks5Tunnel(exit, host, port, timeoutMs);
  if (exit.protocol === 'socks4' || exit.protocol === 'socks4a') return socks4Tunnel(exit, host, port, timeoutMs);
  return httpTunnel(exit, host, port, timeoutMs);
}

/** A raw socket straight to host:port (no proxy) — the direct-mode twin of openTunnel. */
function directConnect(host, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const sock = net.connect({ host, port });
    const t = setTimeout(() => { sock.destroy(); reject(new Error(`connect timeout (${host}:${port})`)); }, timeoutMs);
    sock.once('error', (e) => { clearTimeout(t); try { sock.destroy(); } catch {} reject(new Error(`connect failed: ${e.message}`)); });
    sock.once('connect', () => { clearTimeout(t); resolve(sock); });
  });
}

/**
 * One HTTPS request through `exitLine`. `null` (no pool was given) is direct
 * mode: the socket goes straight to the panel from this machine.
 */
function exitRequest(exitLine, url, { method = 'GET', headers = {}, body = null, timeoutMs = TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const exit = exitLine ? parseExit(exitLine) : null;
    if (exitLine && !exit) return reject(new Error(`unparseable exit ${maskExit(exitLine)}`));
    const u = new URL(url);
    const payload =
      body === null || body === undefined ? null : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    const origin = u.hostname.endsWith('linapi.net') ? BASE : `${u.protocol}//${u.host}`;
    const hs = {
      host: u.host,
      'user-agent': UA,
      accept: 'application/json, text/plain, */*',
      'accept-encoding': 'identity',
      origin,
      referer: `${origin}/`,
      connection: 'close',
      ...headers,
    };
    if (payload) {
      hs['content-type'] = hs['content-type'] || 'application/json';
      hs['content-length'] = String(payload.length);
    }
    const head =
      `${method} ${u.pathname}${u.search} HTTP/1.1\r\n` +
      Object.entries(hs)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n') +
      '\r\n\r\n';
    let settled = false;
    const fail = (e) => {
      if (settled) return;
      settled = true;
      reject(e);
    };
    let tlsSock = null;
    const open = exit
      ? openTunnel(exit, u.hostname, Number(u.port || 443), Math.min(timeoutMs, 20000))
      : directConnect(u.hostname, Number(u.port || 443), Math.min(timeoutMs, 20000));
    open
      .then((tunnel) => {
        const leftover = tunnel.__leftover;
        tunnel.__leftover = Buffer.alloc(0);
        tunnel.pause();
        tunnel.removeAllListeners('data');
        if (leftover && leftover.length) tunnel.unshift(leftover);
        tlsSock = tls.connect({ socket: tunnel, servername: u.hostname }, () => {
          tlsSock.write(head);
          if (payload) tlsSock.write(payload);
        });
        tlsSock.setTimeout(timeoutMs, () => tlsSock.destroy(new Error('timeout')));
        let raw = Buffer.alloc(0);
        let headEnd = -1;
        let status = 0;
        let respHeaders = {};
        let closed = false;
        const finish = (text) => {
          if (settled) return;
          settled = true;
          tlsSock.destroy();
          resolve({
            status,
            headers: respHeaders,
            text,
            json: jparse(text),
            setCookie: respHeaders['set-cookie'] ? [respHeaders['set-cookie']] : [],
          });
        };
        /** `null` while the chunked body is still incomplete. */
        const dechunk = (buf) => {
          const parts = [];
          let i = 0;
          for (;;) {
            const nl = buf.indexOf('\r\n', i);
            if (nl === -1) return null;
            const size = parseInt(buf.slice(i, nl).toString('latin1').split(';')[0], 16);
            if (!Number.isFinite(size)) return null;
            if (size === 0) return Buffer.concat(parts);
            if (buf.length < nl + 2 + size + 2) return null;
            parts.push(buf.slice(nl + 2, nl + 2 + size));
            i = nl + 2 + size + 2;
          }
        };
        const pump = () => {
          if (headEnd === -1) {
            headEnd = raw.indexOf('\r\n\r\n');
            if (headEnd === -1) return;
            const headText = raw.slice(0, headEnd).toString('latin1');
            status = parseInt(headText.split('\r\n')[0].split(' ')[1] || '0', 10);
            for (const line of headText.split('\r\n').slice(1)) {
              const i = line.indexOf(':');
              if (i > 0) respHeaders[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
            }
          }
          const body = raw.slice(headEnd + 4);
          if ((respHeaders['transfer-encoding'] || '').toLowerCase().includes('chunked')) {
            const done = dechunk(body);
            if (done) finish(done.toString('utf8'));
            return;
          }
          if (respHeaders['content-length'] !== undefined) {
            const len = parseInt(respHeaders['content-length'], 10);
            if (body.length >= len) finish(body.slice(0, len).toString('utf8'));
            return;
          }
          if (closed) finish(body.toString('utf8'));
        };
        tlsSock.on('data', (d) => {
          raw = Buffer.concat([raw, d]);
          pump();
        });
        tlsSock.on('end', () => {
          closed = true;
          pump();
        });
        tlsSock.on('error', fail);
        tlsSock.on('close', () => fail(new Error('connection closed before a response')));
      })
      .catch(fail);
  });
}

/** Retrying wrapper — a dead exit hands the account to the next one in the pool. */
async function exitJson(exits, exitLine, url, opts = {}, tries = 3) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    const px = i === 0 ? exitLine : exits[(exits.indexOf(exitLine) + i * 7 + 1) % exits.length];
    try {
      const r = await exitRequest(px, url, opts);
      if (r.status === 429 || r.status >= 500) {
        last = new Error(`HTTP ${r.status} via ${maskExit(px)}: ${String(r.text).slice(0, 100)}`);
        await sleep(2500 * (i + 1));
        continue;
      }
      return r;
    } catch (e) {
      last = new Error(`${e.message} via ${maskExit(px)}`);
      await sleep(1200 * (i + 1));
    }
  }
  throw last || new Error('request failed');
}

/** Loopback service call (the inbox broker lives on your machine). */
function localJson(url, { method = 'POST', body = null, timeoutMs = 45000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload =
      body === null || body === undefined ? null : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    const req = http.request(
      {
        method,
        host: u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(payload ? { 'content-length': String(payload.length) } : {}),
        },
        timeout: timeoutMs,
      },
      (res) => {
        let t = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (t += c));
        res.on('end', () => resolve({ status: res.statusCode || 0, text: t, json: jparse(t) }));
      }
    );
    req.on('timeout', () => req.destroy(new Error('broker timeout')));
    req.on('error', reject);
    if (payload) req.write(payload);
    return req.end();
  });
}

// ------------------------------------------------------------------ mailbox

let mailStats = {};
let mailIdCursor = -1;

/**
 * Address for one account. emailnator rotates between two gmail boxes (their
 * address pools are separate, so alternating doubles the fresh supply);
 * `temp.tf` real Microsoft aliases are the spare while emailnator throttles.
 */
async function claimMailbox(exits, exitLine) {
  const errors = [];
  for (const rail of INBOX) {
    try {
      if (rail === 'emailnator') {
        for (let round = 0; round < 2; round++) {
          for (let i = 0; i < MAIL_IDS.length; i++) {
            mailIdCursor = (mailIdCursor + 1) % MAIL_IDS.length;
            const r = await exitJson(
              exits,
              exitLine,
              `${EMAILNATOR}/api/generate-email`,
              {
                method: 'POST',
                body: { ids: [MAIL_IDS[mailIdCursor]] },
                headers: { origin: EMAILNATOR, referer: `${EMAILNATOR}/` },
              },
              2
            );
            const raw = r.json && r.json.email;
            if (raw && raw.includes('@')) {
              const [local, dom] = raw.split('@');
              // gmail ignores dots and +tags: the plain form keeps the mailbox,
              // drops the disposable-looking alias the panel may reject
              const address =
                dom === 'gmail.com' ? `${local.split('+')[0].replace(/\./g, '')}@gmail.com` : raw;
              mailStats.emailnator = (mailStats.emailnator || 0) + 1;
              return { rail: 'emailnator', address };
            }
            errors.push(`emailnator: ${String(r.text).slice(0, 90)}`);
          }
          await sleep(1000);
        }
        continue;
      }
      if (rail === 'temptf') {
        const r = await exitJson(
          exits,
          exitLine,
          `${TEMPTF}/api/account?providers=outlook,hotmail&dot=0&plus=1`,
          {},
          2
        );
        const address = r.json && r.json.email;
        if (address && String(address).includes('@')) {
          mailStats.temptf = (mailStats.temptf || 0) + 1;
          return { rail: 'temptf', address: String(address) };
        }
        errors.push(`temptf: ${String(r.text).slice(0, 90)}`);
        continue;
      }
      if (rail === 'broker') {
        for (const base of BROKERS) {
          const r = await localJson(`${base.replace(/\/+$/, '')}/create`);
          const address = r.json && (r.json.address || r.json.email);
          if (address) {
            mailStats.broker = (mailStats.broker || 0) + 1;
            return { rail: `broker:${new URL(base).port}`, address, token: r.json.token };
          }
          errors.push(`broker ${base}: ${String(r.text).slice(0, 90)}`);
        }
        continue;
      }
      errors.push(`unknown rail ${rail}`);
    } catch (e) {
      errors.push(`${rail}: ${e.message}`);
    }
  }
  throw new Error(`no mailbox rail answered (${errors.join(' | ')})`);
}

/** Poll the claimed mailbox until the panel's verification code lands. */
async function pollCode(exits, exitLine, box, timeout_s = 150, interval = 2.5) {
  const t0 = Date.now();
  const codes = [];
  const collect = (txt) => {
    for (const c of extractCode(txt)) if (!codes.includes(c)) codes.push(c);
    return codes.length > 0;
  };
  const tried = new Set();
  while ((Date.now() - t0) / 1000 < timeout_s) {
    await sleep(interval * 1000);
    try {
      if (box.rail === 'emailnator') {
        const r = await exitJson(exits, exitLine, `${EMAILNATOR}/api/message-list`, {
          method: 'POST',
          body: { email: box.address },
          headers: { origin: EMAILNATOR, referer: `${EMAILNATOR}/` },
        }, 2);
        const msgs = Array.isArray(r.json) ? r.json : (r.json && r.json.messages) || [];
        for (const msg of msgs) {
          if (!msg || typeof msg !== 'object') continue;
          if (Number(msg.timestamp || 0) <= box.floor) continue;
          const mid = msg.id || msg.messageID;
          if (!mid || tried.has(mid)) continue;
          tried.add(mid);
          const c = await exitJson(exits, exitLine, `${EMAILNATOR}/api/message/${encodeURIComponent(mid)}`, {}, 2);
          const b = c.json;
          let txt = '';
          if (b && typeof b === 'object') {
            txt = ['content', 'html', 'body', 'text', 'subject'].map((k) => (b[k] ? String(b[k]) : '')).join(' ');
            if (!txt.trim()) txt = JSON.stringify(b);
          } else if (typeof b === 'string') txt = b;
          if (collect(`${msg.subject || ''} ${txt}`)) return codes;
        }
      } else if (box.rail === 'temptf') {
        const r = await exitJson(exits, exitLine, `${TEMPTF}/api/check`, {
          method: 'POST',
          body: { email: box.address, wait: false },
          headers: { origin: TEMPTF, referer: `${TEMPTF}/` },
        }, 2);
        const lst = Array.isArray(r.json) ? r.json : (r.json && (r.json.data || r.json.messages)) || [];
        for (const msg of lst) {
          if (!msg || typeof msg !== 'object') continue;
          const mid = String(msg.id || msg.messageId || '');
          if (mid && tried.has(mid)) continue;
          if (mid) tried.add(mid);
          const txt = ['subject', 'title', 'text', 'textBody', 'plain', 'body', 'html', 'htmlBody', 'snippet', 'preview']
            .map((k) => (msg[k] ? String(msg[k]) : ''))
            .join(' ');
          if (collect(txt)) return codes;
        }
      } else if (box.rail.startsWith('broker')) {
        const base = BROKERS.find((b) => new URL(b).port === box.rail.split(':')[1]) || BROKERS[0];
        const r = await localJson(`${base.replace(/\/+$/, '')}/list?token=${encodeURIComponent(box.token || '')}`, {
          method: 'GET',
        });
        const rows = (r.json && r.json.messages) || [];
        for (const msg of rows) {
          if (!msg || typeof msg !== 'object') continue;
          const mid = String(msg.id || '');
          if (!mid || tried.has(mid)) continue;
          tried.add(mid);
          const blob = ['subject', 'from', 'text', 'html', 'content', 'body']
            .map((k) => (msg[k] ? String(msg[k]) : ''))
            .join(' ');
          if (collect(blob)) return codes;
        }
      }
    } catch (e) {
      /* a mailbox hiccup just burns one poll */
    }
  }
  return codes;
}

// --------------------------------------------------------------------- flows

function appendKey(key) {
  fs.appendFileSync(KEYS_FILE, `${key}\n`);
}

let writeChain = Promise.resolve();
function recordAccount(rec) {
  writeChain = writeChain
    .then(() => {
      let arr = [];
      try {
        const parsed = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
        if (Array.isArray(parsed)) arr = parsed;
      } catch (e) {
        /* first record */
      }
      arr.push(rec);
      fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(arr, null, 2) + '\n');
    })
    .catch(() => {});
  return writeChain;
}

/** Token groups that actually expose the gate model (`/api/pricing`). */
async function detectGroups(exits, exitLine) {
  const cands = [];
  try {
    const r = await exitJson(exits, exitLine, `${BASE}/api/pricing`, {}, 1);
    let rows = r.json && r.json.data;
    if (rows && !Array.isArray(rows)) rows = rows.data;
    for (const row of rows || []) {
      if (!row || typeof row !== 'object') continue;
      if (String(row.model_name || '').includes(MODEL)) {
        for (const g of row.enable_groups || []) if (g && !cands.includes(g)) cands.push(g);
        break;
      }
    }
  } catch (e) {
    /* pricing is a hint, never a blocker */
  }
  for (const g of ['default', 'vip']) if (!cands.includes(g)) cands.push(g);
  if (GROUP && !cands.includes(GROUP)) cands.unshift(GROUP);
  return cands.slice(0, 5);
}

/**
 * emailnator's gmail boxes recycle addresses, so a mailbox the panel has seen
 * before costs one address — never the attempt: rotate and try again.
 */
async function signUp(exits, exitLine, groups) {
  let last = null;
  for (let round = 0; round < 3; round++) {
    const res = await signUpOnce(exits, exitLine, groups);
    if (!res.collision) return res;
    last = res;
    say(`    mailbox ${res.box.address} already known to the panel, rotating`);
  }
  return last;
}

async function signUpOnce(exits, exitLine, groups) {
  const username = randUser();
  const password = randPass();
  const box = await claimMailbox(exits, exitLine);
  if (box.rail === 'emailnator') {
    try {
      const r = await exitJson(exits, exitLine, `${EMAILNATOR}/api/message-list`, {
        method: 'POST',
        body: { email: box.address },
        headers: { origin: EMAILNATOR, referer: `${EMAILNATOR}/` },
      }, 1);
      const msgs = Array.isArray(r.json) ? r.json : (r.json && r.json.messages) || [];
      box.floor = Math.max(0, ...[].concat(msgs.map((m) => Number((m && m.timestamp) || 0))));
    } catch (e) {
      box.floor = 0;
    }
  }

  // The verification endpoint throttles per IP; holding the mailbox and waiting
  // is cheaper than dropping it and re-allocating the whole attempt.
  let verified = false;
  for (let k = 0; k < 3; k++) {
    const r = await exitJson(exits, exitLine, `${BASE}/api/verification?email=${encodeURIComponent(box.address)}`, {}, 2);
    if (r.json && r.json.success) {
      verified = true;
      break;
    }
    const msg = String((r.json && r.json.message) || r.text || '');
    if (/wait/i.test(msg) || msg.includes('频繁') || r.status === 429) {
      if (k < 2) {
        say(`    verify throttle, holding ${box.address} 26 s`);
        await sleep(26000);
        continue;
      }
      return { username, password, box, error: `verify rate-limited: ${msg.slice(0, 120)}` };
    }
    const collision = /already in use|already registered|已注册/i.test(msg);
    return { username, password, box, error: `verify refused HTTP ${r.status}: ${msg.slice(0, 120)}`, collision };
  }
  if (!verified) return { username, password, box, error: 'verify refused (throttled out)' };
  await sleep(1000);

  const codes = await pollCode(exits, exitLine, box);
  if (!codes.length) return { username, password, box, error: 'no verification code arrived' };

  let reg = null;
  let holds = 0;
  for (let i = 0; i < codes.length && !(reg && reg.json && reg.json.success); ) {
    const code = codes[i];
    reg = await exitJson(
      exits,
      exitLine,
      `${BASE}/api/user/register?turnstile=`,
      { method: 'POST', body: { username, password, email: box.address, verification_code: code } },
      2
    );
    if (reg.json && reg.json.success) break;
    const blob = String(reg.text || '');
    if (/incorrect|expired|无效|验证码/i.test(blob)) {
      if (i + 1 < codes.length) say(`    panel rejected code ${code}, trying the next one`);
      i++;
      continue;
    }
    // the panel answers 429 with an empty body and outlives a short retry
    if ((reg.status === 429 || blob.trim() === '' || blob.trim() === '""') && holds < 2) {
      holds++;
      say(`    register throttled, holding ${box.address} 40 s`);
      await sleep(40000);
      continue;
    }
    break;
  }
  if (!(reg && reg.json && reg.json.success)) {
    const blob = `${String(reg && reg.text).slice(0, 140)}`;
    if (/already|已注册/i.test(blob)) return { username, password, box, error: 'email already registered', collision: true };
    if (/turnstile|captcha/i.test(blob)) return { username, password, box, error: 'captcha wall' };
    return { username, password, box, error: `register failed: ${blob}` };
  }

  await sleep(1000);
  let lg = await exitJson(exits, exitLine, `${BASE}/api/user/login?turnstile=`, {
    method: 'POST',
    body: { username, password },
  }, 2);
  let token = lg.json && lg.json.data && lg.json.data.access_token;
  if (!token) {
    lg = await exitJson(exits, exitLine, `${BASE}/api/user/login`, { method: 'POST', body: { username, password } }, 2);
    token = lg.json && lg.json.data && lg.json.data.access_token;
  }
  if (!token) return { username, password, box, error: `login failed: ${String(lg.text).slice(0, 140)}` };

  const auth = { authorization: `Bearer ${token}` };
  const me = await exitJson(exits, exitLine, `${BASE}/api/user/self`, { headers: auth });
  const data = (me.json && me.json.data) || {};
  if (data.id) auth['New-Api-User'] = String(data.id);

  const body = (group) => ({
    name: 'k1',
    remain_quota: 500000,
    expired_time: -1,
    unlimited_quota: false,
    model_limits_enabled: false,
    model_limits: '',
    allow_ips: '',
    group,
  });
  const createToken = async (group) => {
    await exitJson(exits, exitLine, `${BASE}/api/token/`, { method: 'POST', headers: auth, body: body(group) }, 2);
    const tl = await exitJson(exits, exitLine, `${BASE}/api/token/?p=0&size=10`, { headers: auth }, 2);
    let items = tl.json && tl.json.data && tl.json.data.items;
    if (!items && tl.json && Array.isArray(tl.json.data)) items = tl.json.data;
    for (const t of items || []) {
      if (t.key && !String(t.key).includes('*')) return { key: t.key, id: t.id, items };
      if (t.id) {
        const kr = await exitJson(exits, exitLine, `${BASE}/api/token/${t.id}/key`, { method: 'POST', headers: auth, body: {} }, 2);
        const kd = kr.json && kr.json.data;
        const kk = typeof kd === 'string' ? kd : kd && kd.key;
        if (kk && !String(kk).includes('*')) return { key: kk, id: t.id, items };
      }
    }
    return { key: null, id: null, items: items || [] };
  };

  let made = await createToken(groups[0] || GROUP || '');
  if (!made.key) made = await createToken('');
  if (!made.key) return { username, password, box, error: 'the panel issued no key' };

  await exitJson(exits, exitLine, `${BASE}/api/user/checkin`, { method: 'POST', headers: auth, body: {} }, 1).catch(() => {});
  return {
    username,
    password,
    box,
    uid: data.id,
    quota: data.quota,
    key: made.key,
    tid: made.id,
    items: made.items,
    auth,
  };
}

/** The gate: a key is live only when the model answers 200 with real output. */
async function chatGate(exits, exitLine, key, model = MODEL) {
  const messages = [{ role: 'user', content: 'Reply with just "ok"' }];
  let last = { ok: false, status: 0, text: '', error: '' };
  for (let t = 0; t < 2; t++) {
    try {
      const r = await exitJson(
        exits,
        exitLine,
        `${BASE}/v1/chat/completions`,
        {
          method: 'POST',
          headers: { authorization: `Bearer ${key}` },
          body: { model, messages, max_tokens: 512 },
          timeoutMs: Math.max(TIMEOUT_MS, 95000),
        },
        2
      );
      const j = r.json;
      const choice = j && j.choices && j.choices[0];
      const msg = (choice && choice.message) || {};
      const text = `${msg.content || ''}${msg.reasoning_content || ''}`.trim();
      const completion = ((j && j.usage) || {}).completion_tokens || 0;
      if (text.length > 0 || completion > 0) {
        return { ok: true, status: r.status, text: text.slice(0, 60), error: '' };
      }
      last = {
        ok: false,
        status: r.status,
        text: '',
        error: r.status === 200 ? 'empty completion' : String(r.text).slice(0, 160),
      };
      // stream fallback: some ids only answer through the SSE path
      const rs = await exitJson(
        exits,
        exitLine,
        `${BASE}/v1/chat/completions`,
        {
          method: 'POST',
          headers: { authorization: `Bearer ${key}`, accept: 'text/event-stream' },
          body: { model, messages, max_tokens: 512, stream: true },
          timeoutMs: Math.max(TIMEOUT_MS, 95000),
        },
        2
      );
      if (typeof rs.text === 'string' && rs.text.trim().startsWith('data:')) {
        const acc = rs.text
          .split(/\r?\n/)
          .filter((l) => l.startsWith('data:') && !l.includes('[DONE]'))
          .map((l) => {
            const p = jparse(l.slice(5).trim());
            const c = p && p.choices && p.choices[0];
            const d = (c && (c.delta || c.message)) || {};
            return `${d.content || ''}${d.reasoning_content || ''}`;
          })
          .join('');
        if (acc.trim()) return { ok: true, status: rs.status, text: acc.trim().slice(0, 60), error: '' };
      }
    } catch (e) {
      last = { ok: false, status: 0, text: '', error: e.message };
    }
    await sleep(2000);
  }
  return last;
}

/** Re-bind the token to a group the model actually serves for fresh accounts. */
async function bindGroup(exits, exitLine, acct, groups, key) {
  for (const g of groups) {
    if (g === (groups[0] || '')) continue;
    const row = (acct.items || []).find((t) => t.id === acct.tid) || { id: acct.tid };
    await exitJson(
      exits,
      exitLine,
      `${BASE}/api/token/`,
      { method: 'PUT', headers: acct.auth, body: { ...row, group: g } },
      2
    ).catch(() => {});
    const gate = await chatGate(exits, exitLine, key);
    if (gate.ok) return { gate, group: g };
  }
  return { gate: null, group: null };
}

async function mintOne(exits, startExit, index, groups) {
  for (let attempt = 0; attempt < TRIES; attempt++) {
    const exitLine = attempt === 0 ? startExit : exits[(exits.indexOf(startExit) + attempt * 3 + 1) % exits.length];
    try {
      const acct = await signUp(exits, exitLine, groups);
      if (acct.error) {
        say(`  ✗ #${index + 1} ${acct.error}`);
        continue;
      }
      let gate = await chatGate(exits, exitLine, acct.key);
      let group = groups[0] || GROUP || '';
      if (!gate.ok) {
        const bound = await bindGroup(exits, exitLine, acct, groups, acct.key);
        if (bound.gate) {
          gate = bound.gate;
          group = bound.group;
        }
      }
      const rec = {
        index: index + 1,
        username: acct.username,
        password: acct.password,
        email: acct.box.address,
        mailbox: acct.box.rail,
        uid: acct.uid,
        quota: acct.quota,
        api_key: acct.key,
        group,
        model: MODEL,
        chat_status: gate.status,
        chat: gate.text,
        chat_error: gate.error,
        exit: maskExit(exitLine),
        verdict: gate.ok ? 'LIVE' : 'key-no-chat',
        at: new Date().toISOString(),
      };
      await recordAccount(rec);
      if (!gate.ok) {
        say(`  ✗ #${index + 1} ${acct.username}: key ${acct.key.slice(0, 8)}… failed the gate (HTTP ${gate.status}) ${gate.error}`);
        continue;
      }
      appendKey(acct.key);
      say(`  ✓ #${index + 1} ${acct.username} → ${acct.key.slice(0, 8)}…  quota ${acct.quota}  group ${group}  chat ${gate.status} ${gate.text}`);
      return rec;
    } catch (e) {
      say(`  ✗ #${index + 1} attempt ${attempt + 1} via ${maskExit(exitLine)}: ${e.message}`);
      await sleep(1500 * (attempt + 1));
    }
  }
  await recordAccount({ index: index + 1, verdict: 'failed', at: new Date().toISOString() });
  return null;
}

// --------------------------------------------------------------------- modes

async function screen(exits) {
  say(`screening ${exits.filter(Boolean).length || 'direct'} exit(s) against ${HOST}`);
  const live = [];
  let cursor = 0;
  const workers = Array.from({ length: CONC }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= exits.length) return;
      const exitLine = exits[i];
      try {
        const r = await exitRequest(exitLine, `${BASE}/api/status`, { timeoutMs: 25000 });
        if (r.status === 200) {
          if (exitLine) live.push(exitLine); // nothing to screen in direct mode
          say(`  ✓ ${maskExit(exitLine)} ${r.status}`);
        } else {
          say(`  ✗ ${maskExit(exitLine)} ${r.status}`);
        }
      } catch (e) {
        say(`  ✗ ${maskExit(exitLine)} ${e.message}`);
      }
    }
  });
  await Promise.all(workers);
  fs.writeFileSync(path.join(ROOT, 'proxies.live.txt'), live.join('\n') + (live.length ? '\n' : ''));
  say(`screen done: ${live.length}/${exits.filter(Boolean).length || 'direct'} live → proxies.live.txt`);
}

async function probe(exits) {
  const exitLine = exits[0];
  const st = await exitJson(exits, exitLine, `${BASE}/api/status`, {}, 2);
  const d = (st.json && st.json.data) || {};
  say(`panel ${HOST} · sys=${d.system_name || d.systemName || '?'} · mail=${d.email_verification} turnstile=${d.turnstile_check} checkin=${d.checkin_enabled}`);
  const models = await exitJson(exits, exitLine, `${BASE}/api/pricing`, {}, 2);
  let rows = models.json && models.json.data;
  if (rows && !Array.isArray(rows)) rows = rows.data;
  const modelIds = new Set();
  for (const row of rows || []) {
    const name = row && (row.model_name || row.model);
    if (name) modelIds.add(String(name));
  }
  say(`catalogue: ${modelIds.size || '?'} model id(s) priced`);
  const groups = await detectGroups(exits, exitLine);
  say(`gate ${MODEL} → groups: ${groups.join(', ') || '(none discovered)'}`);
  let live = 0;
  for (const ex of exits) {
    try {
      const r = await exitRequest(ex, `${BASE}/api/status`, { timeoutMs: 20000 });
      if (r.status === 200) live++;
    } catch (e) {
      /* dead exit */
    }
  }
  say(`exits: ${live}/${exits.filter(Boolean).length || 'direct'} reach ${HOST}`);
  if (fs.existsSync(KEYS_FILE)) {
    const keys = fs.readFileSync(KEYS_FILE, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    say(`keys.txt: ${keys.length} key(s) — run --verify-only to re-test them`);
  } else {
    say('keys.txt: not present yet');
  }
}

async function verifyOnly(exits) {
  if (!fs.existsSync(KEYS_FILE)) {
    console.error(`! ${path.basename(KEYS_FILE)} not found — nothing to verify`);
    process.exit(2);
  }
  const keys = fs
    .readFileSync(KEYS_FILE, 'utf8')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  say(`re-checking ${keys.length} key(s) with model ${MODEL}`);
  const live = [];
  const dead = [];
  for (let i = 0; i < keys.length; i++) {
    const exitLine = exits[i % exits.length];
    try {
      const gate = await chatGate(exits, exitLine, keys[i]);
      if (gate.ok) {
        live.push(keys[i]);
        say(`  ✓ ${keys[i].slice(0, 8)}… ${gate.status} ${gate.text}`);
      } else {
        dead.push(keys[i]);
        say(`  ✗ ${keys[i].slice(0, 8)}… HTTP ${gate.status} ${gate.error}`);
      }
    } catch (e) {
      dead.push(keys[i]);
      say(`  ✗ ${keys[i].slice(0, 8)}… ${e.message}`);
    }
  }
  fs.writeFileSync(KEYS_FILE, live.join('\n') + (live.length ? '\n' : ''));
  if (dead.length) fs.writeFileSync(UNGATED_FILE, dead.join('\n') + '\n');
  say(`verify done: ${live.length} live, ${dead.length} dead`);
}

async function collect() {
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    console.error(`! ${path.basename(ACCOUNTS_FILE)} not found — nothing to collect`);
    process.exit(2);
  }
  const rows = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
  const keys = [...new Set(rows.filter((r) => r.chat_status === 200 && r.api_key).map((r) => r.api_key))];
  fs.writeFileSync(KEYS_FILE, keys.join('\n') + (keys.length ? '\n' : ''));
  say(`collect done: ${keys.length} chat-200 key(s) → keys.txt`);
}

async function mint(exits, groups) {
  say(
    `minting ${COUNT} account(s), conc ${CONC}, model ${MODEL}, group ${GROUP || '(auto)'}, ` +
      `${exits.filter(Boolean).length || 'direct'} exit(s), inbox ${INBOX.join('→')}, bind groups [${groups.join(', ')}]`
  );
  let cursor = 0;
  let ok = 0;
  let failed = 0;
  const workers = Array.from({ length: CONC }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= COUNT) return;
      const rec = await mintOne(exits, exits[i % exits.length], i, groups);
      if (rec && rec.verdict === 'LIVE') ok++;
      else failed++;
      if (GAP_MS) await sleep(GAP_MS);
    }
  });
  await Promise.all(workers);
  await writeChain;
  const rails = Object.entries(mailStats)
    .map(([k, v]) => `${k} ${v}`)
    .join(', ');
  say(`done: ${ok} live key(s), ${failed} failed — keys.txt${rails ? ` · mailbox: ${rails}` : ''}`);
  if (!ok) process.exitCode = 1;
}

(async () => {
  const exits = loadExits();
  if (SCREEN_ONLY) return screen(exits);
  if (PROBE_ONLY) return probe(exits);
  if (COLLECT_ONLY) return collect();
  if (VERIFY_ONLY) return verifyOnly(exits);
  const groups = await detectGroups(exits, exits[0]);
  return mint(exits, groups);
})().catch((e) => {
  console.error('[fatal]', e.message);
  process.exit(1);
});
