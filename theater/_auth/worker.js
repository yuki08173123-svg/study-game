/* =====================================================================
   Theater の入り口（Cloudflare Worker）

   やっていること
   ・生徒に Discord でログインしてもらう
   ・アプリを開くたびに、その人が オンラインコミュニティ塾【ヒラ】のサーバーに
     「いま」いるかを Discord に問い合わせる
   ・いれば 動画データ（videos.json など）を渡す
   ・いなければ 断る。BAN・キック・自分で抜けた、のどれでも同じ

   だいじな点
   ・確認は「アプリを開くたび」に毎回おこなう。ためておいた通行証で通すことはしない。
     だから BAN した瞬間から、その生徒は次にアプリを開いた時点で何も見られない。
   ・動画データは 公開の場所には置かない。private リポジトリに置き、
     この Worker だけが GitHub のトークンで取りに行く。
     こうしないと、ログイン画面を作っても videos.json を直接ダウンロードされてしまう。
   ・生徒の端末に渡すのは、Discordのトークンを Worker の鍵で暗号化したものだけ。
     生徒本人にも中身は読めないし、それ単体では何にも使えない。

   Cloudflare に登録する変数（設定 → 変数とシークレット）
     DISCORD_CLIENT_ID      Discord の Application の Client ID
     DISCORD_CLIENT_SECRET  同じく Client Secret          ← シークレットで登録
     GUILD_ID               Discordサーバーの ID（1024687018543943710）
     GITHUB_OWNER           GitHub のユーザー名（yuki08173123-svg）
     GITHUB_REPO            データを置く private リポジトリ名（theater-data）
     GITHUB_TOKEN           そのリポジトリを読めるトークン        ← シークレットで登録
     SESSION_SECRET         長いランダムな文字列（何でもよい）    ← シークレットで登録
     WORKER_URL             この Worker の場所（https://xxx.workers.dev）
     APP_ORIGIN             アプリの場所（https://yuki08173123-svg.github.io）
     ROLE_ID                （任意）この役職の人だけ通したいときに入れる。空でよい
     ADMIN_ID               平山さんの Discord ユーザーID（みんなのレベル一覧を見られる人）

   Cloudflare に登録するデータベース（設定 → バインディング）
     DB                     D1 データベース。生徒の記録（見た回数・レベル）を入れる
   ===================================================================== */

const FILES = ['videos.json', 'chapters.json', 'manual.json'];

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (req.method === 'OPTIONS') return cors(env, new Response(null, { status: 204 }));
    try {
      if (path === '/login')    return login(url, env);
      if (path === '/callback') return callback(url, env);
      if (path === '/data')     return cors(env, await data(url, env));
      if (path === '/sync')     return cors(env, await sync(req, url, env));
      if (path === '/roster')   return cors(env, await roster(url, env));
      return cors(env, json({ error: 'not_found' }, 404));
    } catch (e) {
      return cors(env, json({ error: 'server_error', detail: String((e && e.message) || e) }, 500));
    }
  }
};

/* ---------- Discord へ送り出す ---------- */
function login(url, env) {
  const back = safeBack(url.searchParams.get('back'), env);
  const state = b64url(JSON.stringify({ back }));
  const scope = 'identify guilds.members.read';
  const a = new URL('https://discord.com/oauth2/authorize');
  a.searchParams.set('client_id', env.DISCORD_CLIENT_ID);
  a.searchParams.set('redirect_uri', redirectUri(env));
  a.searchParams.set('response_type', 'code');
  a.searchParams.set('scope', scope);
  a.searchParams.set('state', state);
  return Response.redirect(a.toString(), 302);
}

/* ---------- Discord から戻ってきた ---------- */
async function callback(url, env) {
  let back = appUrl(env);
  try { back = safeBack(JSON.parse(fromB64url(url.searchParams.get('state'))).back, env); } catch (e) {}

  if (url.searchParams.get('error')) return go(back, 'auth=' + url.searchParams.get('error'));
  const code = url.searchParams.get('code');
  if (!code) return go(back, 'auth=no_code');

  const tok = await tokenReq(env, { grant_type: 'authorization_code', code, redirect_uri: redirectUri(env) });
  if (!tok) return go(back, 'auth=token_failed');

  const who = await check(tok.access_token, env);
  if (!who.ok) return go(back, 'auth=' + who.why);

  const t = await pack(env, tok, who);
  return go(back, 'auth=ok&t=' + encodeURIComponent(t));
}

/* ---------- 動画データを渡す（毎回たしかめる） ---------- */
async function data(url, env) {
  let s = await unpack(env, url.searchParams.get('t'));
  if (!s) return json({ ok: false, error: 'need_login', why: 'bad_token' }, 401);

  /* いま サーバーにいるか、Discord に聞く。ここを毎回やるのが肝 */
  let who = await check(s.a, env);
  let fresh = null;

  if (!who.ok && who.why === 'token_expired' && s.r) {
    const tok = await tokenReq(env, { grant_type: 'refresh_token', refresh_token: s.r });
    if (tok) {
      who = await check(tok.access_token, env);
      if (who.ok) fresh = await pack(env, tok, who);
    }
  }
  if (!who.ok) {
    /* not_member ＝ BAN・キック・退出。アプリ側はこれを見て中身を消す */
    if (who.why === 'not_member' || who.why === 'no_role')
      return json({ ok: false, error: 'not_member', why: who.why }, 403);
    /* こんでいる・一時的な不調。ここで締め出すと ふつうの塾生が困るので、消させない */
    if (who.why === 'busy' || String(who.why).indexOf('check_failed') === 0)
      return json({ ok: false, error: 'busy', why: who.why }, 503);
    /* 通行証が古い。入りなおしてもらう */
    return json({ ok: false, error: 'need_login', why: who.why }, 401);
  }

  const out = { ok: true, name: who.name, me: who.id,
                admin: !!(env.ADMIN_ID && who.id === env.ADMIN_ID) };
  if (fresh) out.t = fresh;
  for (const f of FILES) {
    const r = await fetch(
      `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${f}`,
      { headers: { authorization: 'Bearer ' + env.GITHUB_TOKEN,
                   accept: 'application/vnd.github.raw', 'user-agent': 'theater-worker' } });
    if (r.ok) out[f.replace('.json', '')] = JSON.parse(await r.text());
  }
  if (!out.videos) return json({ ok: false, error: 'busy', why: 'data_failed' }, 502);
  return json(out);
}

/* ---------- 生徒の記録をあずかる ----------
   端末を変えても、スマホとiPadでも、同じレベルになるようにするため。
   中身の合体（見た回数は多い方を採る）はアプリ側でやっているので、
   ここは「その人の最新の記録を1つ持っておく」だけの役。 */
let tableReady = false;
async function ensureTable(env) {
  if (tableReady) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS rec (
       id TEXT PRIMARY KEY, name TEXT, data TEXT,
       lv INTEGER DEFAULT 1, exp INTEGER DEFAULT 0,
       views INTEGER DEFAULT 0, seen INTEGER DEFAULT 0, outs INTEGER DEFAULT 0,
       at INTEGER DEFAULT 0)`).run();
  tableReady = true;
}

/* 通行証をたしかめて「いま塾生か」を返す。/data と同じ確認を通す */
async function whoOf(url, env) {
  const s = await unpack(env, url.searchParams.get('t'));
  if (!s) return { bad: json({ ok: false, error: 'need_login', why: 'bad_token' }, 401) };
  const who = await check(s.a, env);
  if (who.ok) return { who };
  if (who.why === 'not_member' || who.why === 'no_role')
    return { bad: json({ ok: false, error: 'not_member' }, 403) };
  if (who.why === 'busy' || String(who.why).indexOf('check_failed') === 0)
    return { bad: json({ ok: false, error: 'busy', why: who.why }, 503) };
  return { bad: json({ ok: false, error: 'need_login', why: who.why }, 401) };
}

async function sync(req, url, env) {
  if (!env.DB) return json({ ok: false, error: 'no_db' }, 503);
  const r = await whoOf(url, env);
  if (r.bad) return r.bad;
  await ensureTable(env);

  if (req.method === 'GET') {
    const row = await env.DB.prepare('SELECT data FROM rec WHERE id = ?').bind(r.who.id).first();
    let rec = null;
    if (row && row.data) { try { rec = JSON.parse(row.data); } catch (e) {} }
    return json({ ok: true, rec });
  }

  if (req.method !== 'POST') return json({ ok: false, error: 'bad_method' }, 405);

  const body = await req.text();
  if (body.length > 1000000) return json({ ok: false, error: 'too_big' }, 413);
  let b = null;
  try { b = JSON.parse(body); } catch (e) {}
  if (!b || !b.rec) return json({ ok: false, error: 'bad_body' }, 400);

  const st = b.stat || {};
  await env.DB.prepare(
    `INSERT INTO rec (id, name, data, lv, exp, views, seen, outs, at)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name, data=excluded.data, lv=excluded.lv, exp=excluded.exp,
       views=excluded.views, seen=excluded.seen, outs=excluded.outs, at=excluded.at`
  ).bind(
    r.who.id,
    String(b.rec.name || r.who.name || '').slice(0, 32),
    JSON.stringify(b.rec),
    +st.lv || 1, +st.exp || 0, +st.views || 0, +st.seen || 0, +st.outs || 0,
    Date.now()
  ).run();

  return json({ ok: true });
}

/* 平山さんだけが見られる、みんなのレベル一覧 */
async function roster(url, env) {
  if (!env.DB) return json({ ok: false, error: 'no_db' }, 503);
  const r = await whoOf(url, env);
  if (r.bad) return r.bad;
  if (!env.ADMIN_ID || r.who.id !== env.ADMIN_ID)
    return json({ ok: false, error: 'not_admin' }, 403);
  await ensureTable(env);
  const q = await env.DB.prepare(
    'SELECT name, lv, exp, views, seen, outs, at FROM rec ORDER BY exp DESC, at DESC LIMIT 500').all();
  return json({ ok: true, list: (q && q.results) || [] });
}

/* ---------- サーバーにいるか ----------
   「参加中サーバーの一覧」ではなく「このサーバーのメンバーか」を直接きく。
   一覧のほうは連続で呼ぶと Discord に断られるため（ログイン直後に必ず2回呼ぶので当たる）。 */
async function check(access, env) {
  const r = await fetch(
    `https://discord.com/api/users/@me/guilds/${env.GUILD_ID}/member`,
    { headers: { authorization: 'Bearer ' + access } });

  if (r.status === 401) return { ok: false, why: 'token_expired' };
  if (r.status === 404) return { ok: false, why: 'not_member' };   /* BAN・キック・退出 */
  if (r.status === 403) return { ok: false, why: 'not_member' };
  if (r.status === 429) return { ok: false, why: 'busy' };         /* こんでいるだけ。締め出さない */
  if (!r.ok)            return { ok: false, why: 'check_failed_' + r.status };

  const m = await r.json();
  if (env.ROLE_ID && !(m.roles || []).includes(env.ROLE_ID)) return { ok: false, why: 'no_role' };
  const u = m.user || {};
  return { ok: true, id: u.id, name: u.global_name || u.username || '' };
}

/* ---------- Discord のトークンをもらう ---------- */
async function tokenReq(env, extra) {
  const body = new URLSearchParams(Object.assign({
    client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET,
  }, extra));
  const r = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
  if (!r.ok) return null;
  return r.json();
}

/* ---------- 生徒に渡す包み（中身は Worker の鍵でしか開かない） ---------- */
async function pack(env, tok, who) {
  const plain = JSON.stringify({ a: tok.access_token, r: tok.refresh_token || '', id: who.id });
  const key = await aesKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain));
  return b64url(bin(iv)) + '.' + b64url(bin(new Uint8Array(buf)));
}
async function unpack(env, t) {
  if (!t || t.indexOf('.') < 0) return null;
  try {
    const [i, c] = t.split('.');
    const key = await aesKey(env);
    const iv = new Uint8Array([...fromB64url(i)].map(ch => ch.charCodeAt(0)));
    const ct = new Uint8Array([...fromB64url(c)].map(ch => ch.charCodeAt(0)));
    const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(buf));
  } catch (e) { return null; }
}
async function aesKey(env) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(env.SESSION_SECRET));
  return crypto.subtle.importKey('raw', h, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/* ---------- 小道具 ---------- */
const appUrl = env => (env.APP_ORIGIN || '').replace(/\/+$/, '') + '/study-game/theater/';
/* 戻り先は かならず このアプリの中。よそのサイトを指定されても無視する
   （ここを素通しにすると、細工したリンクで通行証を持ち出されてしまう） */
const safeBack = (b, env) => {
  const o = (env.APP_ORIGIN || '').replace(/\/+$/, '');
  return (b && o && String(b).indexOf(o + '/') === 0) ? String(b) : appUrl(env);
};
const redirectUri = env => (env.WORKER_URL || '').replace(/\/+$/, '') + '/callback';
const go = (back, hash) => Response.redirect(back + '#' + hash, 302);
const bin = u8 => String.fromCharCode.apply(null, u8);
const b64url = s => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = s => atob(String(s).replace(/-/g, '+').replace(/_/g, '/'));

function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status,
    headers: { 'content-type': 'application/json; charset=utf-8' } });
}
function cors(env, res) {
  const h = new Headers(res.headers);
  h.set('access-control-allow-origin', env.APP_ORIGIN || '*');
  h.set('access-control-allow-methods', 'GET,POST,OPTIONS');
  h.set('access-control-allow-headers', 'content-type');
  h.set('cache-control', 'no-store');
  return new Response(res.body, { status: res.status, headers: h });
}
