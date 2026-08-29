/* =====================================================================
   Theater の入り口（Cloudflare Worker）

   やっていること
   ・生徒に Discord でログインしてもらう
   ・その人が オンラインコミュニティ塾【ヒラ】のサーバーに「いま」いるか確かめる
   ・いれば、動画データ（videos.json など）を渡す
   ・いなければ 断る（BAN・キック・自分で抜けた、のどれでも同じ）

   だいじな点
   ・動画データは 公開の場所には置かない。private リポジトリに置き、
     この Worker だけが GitHub のトークンで取りに行く。
     こうしないと、ログイン画面を作っても データを直接ダウンロードされてしまう。
   ・ログインの証（セッション）は短くしてある（既定3時間）。
     切れるたびに Discord に確認し直すので、退塾させたら最大3時間で使えなくなる。

   Cloudflare に登録する変数（設定 → 変数とシークレット）
     DISCORD_CLIENT_ID      Discord の Application の Client ID
     DISCORD_CLIENT_SECRET  同じく Client Secret          ← シークレットで登録
     GUILD_ID               Discordサーバーの ID（1024687018543943710）
     GITHUB_OWNER           GitHub のユーザー名（yuki08173123-svg）
     GITHUB_REPO            データを置く private リポジトリ名（theater-data）
     GITHUB_TOKEN           そのリポジトリを読めるトークン        ← シークレットで登録
     SESSION_SECRET         長いランダムな文字列（何でもよい）    ← シークレットで登録
     APP_ORIGIN             アプリの場所（https://yuki08173123-svg.github.io）
     ROLE_ID                （任意）この役職の人だけ通したいときに入れる。空でよい
     SESSION_HOURS          （任意）セッションの長さ。空なら3
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
      if (path === '/me')       return cors(env, await me(url, env));
      if (path === '/data')     return cors(env, await data(url, env));
      return cors(env, json({ error: 'not_found' }, 404));
    } catch (e) {
      return cors(env, json({ error: 'server_error', detail: String(e && e.message || e) }, 500));
    }
  }
};

/* ---------- Discord へ送り出す ---------- */
function login(url, env) {
  const back = url.searchParams.get('back') || (env.APP_ORIGIN + '/study-game/theater/');
  const state = b64url(JSON.stringify({ back, n: Math.random().toString(36).slice(2) }));
  const scope = env.ROLE_ID ? 'identify guilds guilds.members.read' : 'identify guilds';
  const a = new URL('https://discord.com/oauth2/authorize');
  a.searchParams.set('client_id', env.DISCORD_CLIENT_ID);
  a.searchParams.set('redirect_uri', redirectUri(env));
  a.searchParams.set('response_type', 'code');
  a.searchParams.set('scope', scope);
  a.searchParams.set('state', state);
  /* すでに許可ずみの人は、画面が出ずにそのまま戻ってくる */
  if (url.searchParams.get('silent') === '1') a.searchParams.set('prompt', 'none');
  return Response.redirect(a.toString(), 302);
}

/* ---------- Discord から戻ってきた ---------- */
async function callback(url, env) {
  let back = env.APP_ORIGIN + '/study-game/theater/';
  try { back = JSON.parse(atob(url.searchParams.get('state').replace(/-/g,'+').replace(/_/g,'/'))).back || back; } catch (e) {}

  const err = url.searchParams.get('error');
  if (err) return Response.redirect(back + '#auth=' + encodeURIComponent(err), 302);

  const code = url.searchParams.get('code');
  if (!code) return Response.redirect(back + '#auth=no_code', 302);

  /* 1. コードを アクセストークンに引きかえる */
  const body = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    client_secret: env.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(env),
  });
  const tr = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body,
  });
  if (!tr.ok) return Response.redirect(back + '#auth=token_failed', 302);
  const tok = await tr.json();

  /* 2. いま サーバーにいるか確かめる */
  const check = await isMember(tok.access_token, env);
  if (!check.ok) return Response.redirect(back + '#auth=' + check.why, 302);

  /* 3. 短いセッションを渡す */
  const t = await sign({ id: check.id, nm: check.name, exp: Date.now() + hours(env) * 3600e3 }, env);
  return Response.redirect(back + '#auth=ok&t=' + encodeURIComponent(t), 302);
}

/* ---------- サーバーにいるか ---------- */
async function isMember(access, env) {
  const h = { authorization: 'Bearer ' + access };

  const ur = await fetch('https://discord.com/api/users/@me', { headers: h });
  if (!ur.ok) return { ok: false, why: 'user_failed' };
  const u = await ur.json();
  const name = u.global_name || u.username || '';

  if (env.ROLE_ID) {
    /* 役職まで見る場合 */
    const mr = await fetch(`https://discord.com/api/users/@me/guilds/${env.GUILD_ID}/member`, { headers: h });
    if (!mr.ok) return { ok: false, why: 'not_member' };
    const m = await mr.json();
    if (!(m.roles || []).includes(env.ROLE_ID)) return { ok: false, why: 'no_role' };
    return { ok: true, id: u.id, name };
  }

  const gr = await fetch('https://discord.com/api/users/@me/guilds', { headers: h });
  if (!gr.ok) return { ok: false, why: 'guilds_failed' };
  const gs = await gr.json();
  if (!Array.isArray(gs) || !gs.some(g => g.id === env.GUILD_ID)) return { ok: false, why: 'not_member' };
  return { ok: true, id: u.id, name };
}

/* ---------- いまのセッションを見る ---------- */
async function me(url, env) {
  const s = await verify(url.searchParams.get('t'), env);
  if (!s) return json({ ok: false }, 401);
  return json({ ok: true, name: s.nm || '', exp: s.exp });
}

/* ---------- 動画データを渡す ---------- */
async function data(url, env) {
  const s = await verify(url.searchParams.get('t'), env);
  if (!s) return json({ ok: false, error: 'unauthorized' }, 401);

  const out = {};
  for (const f of FILES) {
    const r = await fetch(
      `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${f}`,
      { headers: {
          authorization: 'Bearer ' + env.GITHUB_TOKEN,
          accept: 'application/vnd.github.raw',
          'user-agent': 'theater-worker',
      } }
    );
    if (r.ok) out[f.replace('.json', '')] = JSON.parse(await r.text());
  }
  if (!out.videos) return json({ ok: false, error: 'data_failed' }, 502);
  return json({ ok: true, ...out });
}

/* ---------- 小道具 ---------- */
const hours = env => Math.max(1, Math.min(24, parseInt(env.SESSION_HOURS || '3', 10) || 3));
const redirectUri = env => (env.WORKER_URL || '').replace(/\/+$/, '') + '/callback';

function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
function cors(env, res) {
  const h = new Headers(res.headers);
  h.set('access-control-allow-origin', env.APP_ORIGIN || '*');
  h.set('access-control-allow-methods', 'GET,OPTIONS');
  h.set('access-control-allow-headers', 'content-type');
  h.set('cache-control', 'no-store');
  return new Response(res.body, { status: res.status, headers: h });
}
const b64url = s => btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');

async function hmacKey(env) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(env.SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function sign(payload, env) {
  const p = b64url(JSON.stringify(payload));
  const k = await hmacKey(env);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(p));
  return p + '.' + b64url(String.fromCharCode(...new Uint8Array(sig)));
}
async function verify(t, env) {
  if (!t || t.indexOf('.') < 0) return null;
  const [p, sig] = t.split('.');
  const k = await hmacKey(env);
  const want = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(p));
  if (b64url(String.fromCharCode(...new Uint8Array(want))) !== sig) return null;
  let o; try { o = JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/'))); } catch (e) { return null; }
  if (!o || !o.exp || o.exp < Date.now()) return null;
  return o;
}
