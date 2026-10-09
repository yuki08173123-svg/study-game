/* ブルポ帳 の 毎朝の しらせ（Cloudflare Worker「burupo-push」）
   娘さん（セリナ・10/9）「今日のタスクがあるときは、アプリのアイコンにバッジがついたら嬉しい」。
   アプリを とじている あいだに アイコンの 数字を かえるには、外から しらせる（Web Push）しかない。

   しくみ：
     ・アプリは「日づけごとの ブルポの まいすう」だけを おくる（中身・なまえ・写真は おくらない）
     ・毎朝 6時（日本時間）に、その日の ブルポが ある 端末にだけ しらせる → アイコンに 数字＋通知
     ・きょうだいで 1台なら、人ごとの まいすうを たして 1つの 数字に
   Cloudflare の 画面で 2つ 設定が いる：
     1. Bindings → KV namespace 「PUSH」
     2. Settings → Triggers → Cron 「0 21 * * *」（UTC の 21時 ＝ 日本の 朝6時）
   かぎ（VAPID）は はじめて よばれたときに Worker が じぶんで つくって KV に しまう（人が かぎを さわらない）。 */

const OK_ORIGINS = [
  'https://yuki08173123-svg.github.io',
  'http://localhost:8162',
];
const SUBJECT = 'https://yuki08173123-svg.github.io/study-game/burupo/';
/* しらせの 行き先は、ブラウザの 会社の サーバーだけ（ほかの 場所へは おくらない） */
const PUSH_HOSTS = [/\.push\.apple\.com$/, /^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/];
const KEEP_DAYS = 120;   // これだけ アプリを ひらかなかった 端末は わすれる

const enc = s => new TextEncoder().encode(s);
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
const b64u = u => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); const b = atob(s + '='.repeat((4 - s.length % 4) % 4)); return Uint8Array.from(b, c => c.charCodeAt(0)); };
const jstDay = (ms = Date.now()) => new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10);
const hex = u => [...new Uint8Array(u)].map(x => x.toString(16).padStart(2, '0')).join('');
const idOf = async endpoint => hex(await crypto.subtle.digest('SHA-256', enc(endpoint))).slice(0, 40);

function cors(request) {
  const o = request.headers.get('Origin') || '';
  return { 'Access-Control-Allow-Origin': OK_ORIGINS.includes(o) ? o : OK_ORIGINS[0], 'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
}
const reply = (body, status, h) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { ...h, 'content-type': typeof body === 'string' ? 'text/plain' : 'application/json' } });

/* ---- VAPID（しらせる 側の かぎ）---- */
async function vapid(env) {
  let v = await env.PUSH.get('vapid', 'json');
  if (!v) {
    const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    v = { jwk: await crypto.subtle.exportKey('jwk', k.privateKey), pub: b64u(new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey))) };
    await env.PUSH.put('vapid', JSON.stringify(v));
  }
  return v;
}
async function vapidHeader(env, endpoint) {
  const v = await vapid(env);
  const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', d: v.jwk.d, x: v.jwk.x, y: v.jwk.y }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u(enc(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc(head + '.' + body)));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${v.pub}`;
}

/* ---- 中身の 暗号化（RFC 8291 / aes128gcm）---- */
async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}
async function encrypt(sub, text) {
  const uaPub = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const ua = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: ua }, as.privateKey, 256));
  const ikm = await hkdf(auth, shared, cat(enc('WebPush: info\0'), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(enc(text), new Uint8Array([2]))));
  return cat(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([asPub.length]), asPub, ct);
}
/* 1つの 端末へ しらせる。もう いない 端末（404・410）なら false */
async function send(env, sub, n) {
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { 'Authorization': await vapidHeader(env, sub.endpoint), 'TTL': '43200', 'Urgency': 'normal',
      'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream' },
    body: await encrypt(sub, JSON.stringify({ n })),
  });
  return { ok: res.ok, gone: res.status === 404 || res.status === 410, status: res.status };
}
const countFor = (rec, day) => Object.values(rec.users || {}).reduce((s, u) => s + Object.entries(u.dues || {}).reduce((a, [d, c]) => a + (d <= day ? (Number(c) || 0) : 0), 0), 0);
function okSub(sub) {
  try {
    const u = new URL(sub.endpoint);
    return u.protocol === 'https:' && PUSH_HOSTS.some(r => r.test(u.hostname)) && sub.keys && typeof sub.keys.p256dh === 'string' && typeof sub.keys.auth === 'string';
  } catch (e) { return false; }
}

export default {
  async fetch(request, env) {
    const h = cors(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (!env.PUSH) return reply('KV namespace「PUSH」をバインドしてください', 500, h);
    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && path === '/key') return reply((await vapid(env)).pub, 200, h);
    if (request.method !== 'POST') return reply('not found', 404, h);
    let j; try { j = await request.json(); } catch (e) { return reply('bad json', 400, h); }

    /* アプリから：この人の 日づけごとの まいすう */
    if (path === '/sync') {
      const sub = j.sub;
      if (!sub || !okSub(sub)) return reply('bad sub', 400, h);
      const uid = String(j.uid || 'u0').slice(0, 40);
      const dues = {};
      for (const [d, c] of Object.entries(j.dues || {}).slice(0, 80)) if (/^\d{4}-\d\d-\d\d$/.test(d) && Number(c) > 0) dues[d] = Math.min(999, Math.floor(Number(c)));
      const id = await idOf(sub.endpoint);
      const rec = (await env.PUSH.get('s:' + id, 'json')) || { users: {} };
      rec.sub = { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } };
      rec.users[uid] = { dues, at: jstDay() };
      rec.at = jstDay();
      await env.PUSH.put('s:' + id, JSON.stringify(rec));
      if (j.test) { const r = await send(env, rec.sub, countFor(rec, jstDay())); return reply(r, r.ok ? 200 : 502, h); }
      return reply({ ok: true }, 200, h);
    }
    /* アプリから：この人は しらせを やめる（ほかの 人が いなければ 端末ごと わすれる） */
    if (path === '/remove') {
      if (typeof j.endpoint !== 'string') return reply('bad', 400, h);
      const id = await idOf(j.endpoint);
      const rec = await env.PUSH.get('s:' + id, 'json');
      if (rec) {
        delete rec.users[String(j.uid || 'u0')];
        if (Object.keys(rec.users).length) await env.PUSH.put('s:' + id, JSON.stringify(rec));
        else await env.PUSH.delete('s:' + id);
      }
      return reply({ ok: true }, 200, h);
    }
    return reply('not found', 404, h);
  },

  /* 毎朝 6時（日本時間）：その日の ブルポが ある 端末にだけ しらせる */
  async scheduled(event, env, ctx) {
    const day = jstDay(), old = jstDay(Date.now() - KEEP_DAYS * 86400000);
    let cursor;
    do {
      const page = await env.PUSH.list({ prefix: 's:', cursor });
      for (const k of page.keys) {
        const rec = await env.PUSH.get(k.name, 'json');
        if (!rec || !rec.sub || (rec.at || '') < old) { await env.PUSH.delete(k.name); continue; }
        const n = countFor(rec, day);
        if (!n) continue;
        try { const r = await send(env, rec.sub, n); if (r.gone) await env.PUSH.delete(k.name); } catch (e) {}
      }
      cursor = page.list_complete ? null : page.cursor;
    } while (cursor);
  },
};
