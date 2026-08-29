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
      return cors(env, json({ error: 'not_found' }, 404));
    } catch (e) {
      return cors(env, json({ error: 'server_error', detail: String((e && e.message) || e) }, 500));
    }
  }
};

/* ---------- Discord へ送り出す ---------- */
function login(url, env) {
  const back = url.searchParams.get('back') || appUrl(env);
  const state = b64url(JSON.stringify({ back }));
  const scope = env.ROLE_ID ? 'identify guilds guilds.members.read' : 'identify guilds';
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
  try { back = JSON.parse(fromB64url(url.searchParams.get('state'))).back || back; } catch (e) {}

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
  if (!s) return json({ ok: false, error: 'need_login' }, 401);

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
    return json({ ok: false, error: who.why === 'not_member' || who.why === 'no_role' ? 'not_member' : 'need_login' }, 403);
  }

  const out = { ok: true, name: who.name };
  if (fresh) out.t = fresh;
  for (const f of FILES) {
    const r = await fetch(
      `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${f}`,
      { headers: { authorization: 'Bearer ' + env.GITHUB_TOKEN,
                   accept: 'application/vnd.github.raw', 'user-agent': 'theater-worker' } });
    if (r.ok) out[f.replace('.json', '')] = JSON.parse(await r.text());
  }
  if (!out.videos) return json({ ok: false, error: 'data_failed' }, 502);
  return json(out);
}

/* ---------- サーバーにいるか ---------- */
async function check(access, env) {
  const h = { authorization: 'Bearer ' + access };

  const ur = await fetch('https://discord.com/api/users/@me', { headers: h });
  if (ur.status === 401) return { ok: false, why: 'token_expired' };
  if (!ur.ok) return { ok: false, why: 'user_failed' };
  const u = await ur.json();
  const name = u.global_name || u.username || '';

  if (env.ROLE_ID) {
    const mr = await fetch(`https://discord.com/api/users/@me/guilds/${env.GUILD_ID}/member`, { headers: h });
    if (mr.status === 401) return { ok: false, why: 'token_expired' };
    if (!mr.ok) return { ok: false, why: 'not_member' };
    const m = await mr.json();
    if (!(m.roles || []).includes(env.ROLE_ID)) return { ok: false, why: 'no_role' };
    return { ok: true, id: u.id, name };
  }

  const gr = await fetch('https://discord.com/api/users/@me/guilds', { headers: h });
  if (gr.status === 401) return { ok: false, why: 'token_expired' };
  if (!gr.ok) return { ok: false, why: 'guilds_failed' };
  const gs = await gr.json();
  if (!Array.isArray(gs) || !gs.some(g => g.id === env.GUILD_ID)) return { ok: false, why: 'not_member' };
  return { ok: true, id: u.id, name };
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
  h.set('access-control-allow-methods', 'GET,OPTIONS');
  h.set('cache-control', 'no-store');
  return new Response(res.body, { status: res.status, headers: h });
}
