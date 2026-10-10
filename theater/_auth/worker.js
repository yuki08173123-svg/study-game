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

   2026-10-10 から「自習室」アプリ（/study-game/jishu/）の入り口もかねる（/room・/room/enter）。
   ログインのしくみと D1 は Theater と同じものを使う。新しく登録するものはない。
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
      if (path === '/find')     return cors(env, await find(url, env));
      if (path === '/room' || path === '/room/enter') return cors(env, await room(req, url, path, env));
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

/* ---------- 動画の中で話している言葉から探す ----------
   のぐさんの要望（2026-09-20）。タイトルや目次に無い言葉でも見つかるように、
   YouTubeの字幕（自動文字起こし）を D1 に入れておき、ここで探す。
   文字起こしは非公開リポジトリの tr/<動画ID>.json にあり、
   **この Worker が自分で読みに行く**ので、新しい鍵は要らない。
   一度に全部は入れられない（時間制限）ので、呼ばれるたびに少しずつ入れる。 */
let trReady = false;
async function ensureTr(env) {
  if (trReady) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS tr (
       vid TEXT, sec INTEGER, txt TEXT)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS tr_vid ON tr(vid)`).run();
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS trmeta (vid TEXT PRIMARY KEY, n INTEGER, at INTEGER)`).run();
  trReady = true;
}

/* 非公開リポジトリのファイルを読む（/data と同じやり方） */
async function ghFile(env, path) {
  const r = await fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`,
    { headers: { authorization: 'Bearer ' + env.GITHUB_TOKEN,
                 accept: 'application/vnd.github.raw', 'user-agent': 'theater-worker' } });
  if (!r.ok) return null;
  try { return JSON.parse(await r.text()); } catch (e) { return null; }
}

/* まだ入れていない動画を、1回につき数本だけ入れる */
async function fillTr(env, want) {
  const list = await ghFile(env, 'tr/index.json');
  if (!list || !Array.isArray(list.ids)) return { done: 0, total: 0 };
  const have = await env.DB.prepare('SELECT vid FROM trmeta').all();
  const set = new Set(((have && have.results) || []).map(r => r.vid));
  const todo = list.ids.filter(id => !set.has(id));
  let n = 0;
  for (const id of todo.slice(0, want)) {
    const d = await ghFile(env, 'tr/' + id + '.json');
    if (!d || !Array.isArray(d.c)) continue;
    const st = [];
    for (const [sec, txt] of d.c)
      st.push(env.DB.prepare('INSERT INTO tr (vid, sec, txt) VALUES (?,?,?)').bind(id, sec, txt));
    st.push(env.DB.prepare('INSERT OR REPLACE INTO trmeta (vid, n, at) VALUES (?,?,?)')
      .bind(id, d.c.length, Date.now()));
    await env.DB.batch(st);
    n++;
  }
  /* expect ＝ 本当は何本ぶん入る予定か（字幕を取りおえていない分も含む） */
  return { done: set.size + n, total: Math.max(+list.expect || 0, list.ids.length) };
}

async function find(url, env) {
  if (!env.DB) return json({ ok: false, error: 'no_db' }, 503);
  const r = await whoOf(url, env);
  if (r.bad) return r.bad;
  await ensureTr(env);

  /* まだ入れ終わっていなければ、少しだけ入れてから探す */
  const st = await fillTr(env, url.searchParams.get('fill') === '0' ? 0 : 6);

  const q = String(url.searchParams.get('q') || '').trim().slice(0, 40);
  if (!q) return json({ ok: true, list: [], ready: st });

  const rows = await env.DB.prepare(
    `SELECT vid, sec, txt FROM tr WHERE txt LIKE ? ESCAPE '\\' ORDER BY vid, sec LIMIT 60`)
    .bind('%' + q.replace(/[\\%_]/g, c => '\\' + c) + '%').all();

  return json({ ok: true, q, ready: st, list: (rows && rows.results) || [] });
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

/* =====================================================================
   自習室（2026-10-10）
   Zoom の自習室の代わり。映像は流さず、「いま誰が・何を・何分やっているか」をみんなで見る。
   ・/room/enter … Discord で塾生かをたしかめて、30分だけ使える「入室券」をわたす。
                   自習室は15〜20秒ごとに呼ばれるので、毎回 Discord に聞くと断られる。
                   だから Discord に聞くのは入室券を出すときだけにする。
   ・/room       … 入室券で呼ぶ。自分の席を書きこみ（POST）、みんなの席と動きを返す。
   ・決まった間隔（15/25/50分）ごとに「続けていますか？」の確認がある。
     確認の時間を10分すぎても押さないと、自動で退室になる（記録は確認の時間まで）。
   ===================================================================== */
const R_GRACE  = 10 * 60000;        /* 確認の時間をすぎてから自動で退室させるまで */
const R_BREAK  = 30 * 60000;        /* 休憩がこれより長いと退室 */
const R_STALE  = 3 * 3600000;       /* 3時間なにも届かない席は片づける */
const R_TICKET = 30 * 60000;        /* 入室券の有効期間 */
const R_CHEER  = 3 * 60000;         /* 同じ人への👏は3分に1回まで */
const R_IVL    = [15, 25, 50];

let roomReady = false;
async function ensureRoom(env) {
  if (roomReady) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS seat (
       id TEXT PRIMARY KEY, name TEXT, sid TEXT, subj TEXT, memo TEXT, goal INTEGER,
       start INTEGER, brk INTEGER, st TEXT, stat INTEGER, chk INTEGER, ivl INTEGER,
       beat INTEGER, cheers INTEGER DEFAULT 0, gl INTEGER DEFAULT 0)`).run();
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS rlog (
       sid TEXT PRIMARY KEY, id TEXT, name TEXT, subj TEXT, memo TEXT, done TEXT,
       start INTEGER, fin INTEGER, mins INTEGER, day TEXT, auto INTEGER DEFAULT 0)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS rlog_day ON rlog(day)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS rfeed (at INTEGER, kind TEXT, d TEXT)`).run();
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS rcheer (fr TEXT, too TEXT, at INTEGER, PRIMARY KEY (fr, too))`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS rnote (k INTEGER PRIMARY KEY, txt TEXT, at INTEGER)`).run();
  roomReady = true;
}

async function room(req, url, path, env) {
  if (!env.DB) return json({ ok: false, error: 'no_db' }, 503);

  /* 入室券をもらう（ここだけ Discord に聞く。通行証が古ければ新しくする） */
  if (path === '/room/enter') {
    const s = await unpack(env, url.searchParams.get('t'));
    if (!s) return json({ ok: false, error: 'need_login', why: 'bad_token' }, 401);
    let who = await check(s.a, env), fresh = null;
    if (!who.ok && who.why === 'token_expired' && s.r) {
      const tok = await tokenReq(env, { grant_type: 'refresh_token', refresh_token: s.r });
      if (tok) { who = await check(tok.access_token, env); if (who.ok) fresh = await pack(env, tok, who); }
    }
    if (!who.ok) {
      if (who.why === 'not_member' || who.why === 'no_role') return json({ ok: false, error: 'not_member' }, 403);
      if (who.why === 'busy' || String(who.why).indexOf('check_failed') === 0)
        return json({ ok: false, error: 'busy', why: who.why }, 503);
      return json({ ok: false, error: 'need_login', why: who.why }, 401);
    }
    const admin = !!(env.ADMIN_ID && who.id === env.ADMIN_ID);
    const k = await ticketMake(env, { i: who.id, n: who.name, a: admin ? 1 : 0, x: Date.now() + R_TICKET });
    const out = { ok: true, k, me: who.id, name: who.name, admin };
    if (fresh) out.t = fresh;
    return json(out);
  }

  const tk = await ticketRead(env, url.searchParams.get('k'));
  if (!tk) return json({ ok: false, error: 'need_enter' }, 401);
  await ensureRoom(env);

  const now = Date.now();
  let b = {};
  if (req.method === 'POST') {
    const tx = await req.text();
    if (tx.length > 4000) return json({ ok: false, error: 'too_big' }, 413);
    try { b = JSON.parse(tx) || {}; } catch (e) {}
  }
  await roomSweep(env, now);

  const out = { ok: true, now };
  if (b.cheer) out.cheer = await roomCheer(env, tk, String(b.cheer).slice(0, 32), now);
  if (tk.a && typeof b.say === 'string') await roomSay(env, tk, b.say, now);
  if (b.s && typeof b.s === 'object') out.mine = await roomSeat(env, tk, b.s, now);
  return json(Object.assign(out, await roomLook(env, tk, now)));
}

/* 席にいる時間のうち、休憩をのぞいた「勉強した時間」 */
const studied = (s, at) =>
  Math.max(0, at - s.start - (s.brk || 0) - (s.st === 'break' ? Math.max(0, at - s.stat) : 0));
const rDay = t => new Date(t + 9 * 3600000).toISOString().slice(0, 10);   /* 日本の日付 */
const rFeed = (env, at, kind, d) =>
  env.DB.prepare('INSERT INTO rfeed (at, kind, d) VALUES (?,?,?)').bind(at, kind, JSON.stringify(d)).run();

/* 席を片づけて記録に残す */
async function roomEnd(env, seat, at, done, auto) {
  const mins = Math.floor(studied(seat, at) / 60000);
  await env.DB.prepare(
    `INSERT INTO rlog (sid, id, name, subj, memo, done, start, fin, mins, day, auto)
     VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(sid) DO NOTHING`
  ).bind(seat.sid, seat.id, seat.name, seat.subj, seat.memo, String(done || '').slice(0, 200),
         seat.start, at, mins, rDay(seat.start), auto ? 1 : 0).run();
  await env.DB.prepare('DELETE FROM seat WHERE id = ? AND sid = ?').bind(seat.id, seat.sid).run();
  await rFeed(env, Date.now(), auto ? 'auto' : 'end', { n: seat.name, s: seat.subj, m: mins });
  return mins;
}

/* 確認がない席・長すぎる休憩・止まった席を、自動で退室にする */
async function roomSweep(env, now) {
  const q = await env.DB.prepare('SELECT * FROM seat').all();
  for (const s of (q && q.results) || []) {
    const due = Math.max(s.chk || 0, s.start) + (s.ivl || 25) * 60000;
    if (s.st === 'break' && now > s.stat + R_BREAK) await roomEnd(env, s, s.stat, '', 1);
    else if (s.st !== 'break' && now > due + R_GRACE) await roomEnd(env, s, due, '', 1);
    else if (now - (s.beat || 0) > R_STALE) await roomEnd(env, s, Math.min(due, now), '', 1);
  }
  if (Math.random() < 0.05) {
    await env.DB.prepare('DELETE FROM rfeed WHERE at < ?').bind(now - 2 * 86400000).run();
    await env.DB.prepare('DELETE FROM rcheer WHERE at < ?').bind(now - 86400000).run();
  }
}

/* 自分の席を書きこむ（はじめる・続ける・休憩・おわる） */
async function roomSeat(env, tk, s, now) {
  const sid = String(s.sid || '').slice(0, 24);
  if (!sid) return { error: 'no_sid' };
  const cl = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(+v || 0)));
  const start = cl(s.start, now - 12 * 3600000, now);
  const n = {
    id: tk.i, name: String(tk.n || '').slice(0, 32), sid,
    subj: String(s.subj || '').slice(0, 10), memo: String(s.memo || '').slice(0, 40),
    goal: cl(s.goal, 0, 720), start, brk: cl(s.brk, 0, now - start),
    st: s.st === 'break' ? 'break' : 'study', stat: cl(s.stat, start, now),
    chk: cl(s.chk, start, now), ivl: R_IVL.includes(+s.ivl) ? +s.ivl : 25, beat: now
  };

  const cur = await env.DB.prepare('SELECT * FROM seat WHERE id = ?').bind(tk.i).first();
  if (!cur || cur.sid !== sid) {
    /* もう片づけられた席（自動で退室・別の端末でおわった）なら、その結果を返す */
    const old = await env.DB.prepare('SELECT mins, auto, fin FROM rlog WHERE sid = ?').bind(sid).first();
    if (old) return { gone: true, mins: old.mins, auto: !!old.auto, fin: old.fin };
    /* 別の端末で前の席が残っていたら、それはおわりにする */
    if (cur) await roomEnd(env, cur, now, '', 0);
  }

  if (s.end) {
    const mins = await roomEnd(env, cur && cur.sid === sid ? Object.assign({}, cur, n) : n, now,
                               s.done, 0);
    return { ended: true, mins };
  }

  const fresh = !cur || cur.sid !== sid;
  const gl = fresh ? 0 : cur.gl;
  await env.DB.prepare(
    `INSERT INTO seat (id, name, sid, subj, memo, goal, start, brk, st, stat, chk, ivl, beat, cheers, gl)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, sid=excluded.sid, subj=excluded.subj,
       memo=excluded.memo, goal=excluded.goal, start=excluded.start, brk=excluded.brk, st=excluded.st,
       stat=excluded.stat, chk=excluded.chk, ivl=excluded.ivl, beat=excluded.beat`
  ).bind(n.id, n.name, n.sid, n.subj, n.memo, n.goal, n.start, n.brk, n.st, n.stat, n.chk, n.ivl,
         n.beat, gl).run();
  if (fresh) {
    await env.DB.prepare('UPDATE seat SET cheers = 0, gl = 0 WHERE id = ?').bind(n.id).run();
    await rFeed(env, now, 'start', { n: n.name, s: n.subj, g: n.goal });
  }
  if (n.goal && !gl && studied(n, now) >= n.goal * 60000) {
    await env.DB.prepare('UPDATE seat SET gl = 1 WHERE id = ?').bind(n.id).run();
    await rFeed(env, now, 'goal', { n: n.name, s: n.subj, g: n.goal });
  }
  return { ok: true };
}

/* 👏 を送る */
async function roomCheer(env, tk, to, now) {
  if (to === tk.i) return 'self';
  const seat = await env.DB.prepare('SELECT name FROM seat WHERE id = ?').bind(to).first();
  if (!seat) return 'gone';
  const last = await env.DB.prepare('SELECT at FROM rcheer WHERE fr = ? AND too = ?').bind(tk.i, to).first();
  if (last && now - last.at < R_CHEER) return 'wait';
  await env.DB.prepare(
    `INSERT INTO rcheer (fr, too, at) VALUES (?,?,?) ON CONFLICT(fr, too) DO UPDATE SET at=excluded.at`
  ).bind(tk.i, to, now).run();
  await env.DB.prepare('UPDATE seat SET cheers = cheers + 1 WHERE id = ?').bind(to).run();
  await rFeed(env, now, 'cheer', { n: tk.n, t: seat.name, h: tk.a ? 1 : 0 });
  return 'ok';
}

/* 平山さんから みんなへのひとこと（空なら消す） */
async function roomSay(env, tk, txt, now) {
  txt = String(txt).trim().slice(0, 80);
  if (!txt) { await env.DB.prepare('DELETE FROM rnote WHERE k = 1').run(); return; }
  await env.DB.prepare(
    `INSERT INTO rnote (k, txt, at) VALUES (1,?,?) ON CONFLICT(k) DO UPDATE SET txt=excluded.txt, at=excluded.at`
  ).bind(txt, now).run();
  await rFeed(env, now, 'say', { n: tk.n, x: txt });
}

/* みんなの席・今日の記録・動き を返す */
async function roomLook(env, tk, now) {
  const seats = await env.DB.prepare(
    `SELECT id, name, subj, memo, goal, start, brk, st, stat, chk, ivl, cheers FROM seat ORDER BY start`).all();
  const today = await env.DB.prepare(
    `SELECT id, name, SUM(mins) AS mins, MAX(fin) AS fin, COUNT(*) AS n FROM rlog
     WHERE day = ? GROUP BY id ORDER BY fin DESC LIMIT 100`).bind(rDay(now)).all();
  const feed = await env.DB.prepare(
    'SELECT at, kind, d FROM rfeed WHERE at > ? ORDER BY at DESC LIMIT 40').bind(now - 86400000).all();
  const note = await env.DB.prepare('SELECT txt, at FROM rnote WHERE k = 1').first();
  return {
    me: tk.i, admin: !!tk.a, day: rDay(now),
    seats: (seats && seats.results) || [],
    today: (today && today.results) || [],
    feed: ((feed && feed.results) || []).map(f => {
      let d = {}; try { d = JSON.parse(f.d); } catch (e) {}
      return Object.assign(d, { at: f.at, k: f.kind });
    }),
    note: note && now - note.at < 6 * 3600000 ? note : null
  };
}

/* 入室券（中身は見えてもよいが、Worker の鍵がないと作れない・書きかえられない） */
async function roomKey(env) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode('room:' + env.SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function ticketMake(env, o) {
  const body = b64url(unescape(encodeURIComponent(JSON.stringify(o))));
  const sig = await crypto.subtle.sign('HMAC', await roomKey(env), new TextEncoder().encode(body));
  return body + '.' + b64url(bin(new Uint8Array(sig)));
}
async function ticketRead(env, k) {
  if (!k || k.indexOf('.') < 0) return null;
  try {
    const [body, sig] = k.split('.');
    const raw = new Uint8Array([...fromB64url(sig)].map(c => c.charCodeAt(0)));
    const ok = await crypto.subtle.verify('HMAC', await roomKey(env), raw, new TextEncoder().encode(body));
    if (!ok) return null;
    const o = JSON.parse(decodeURIComponent(escape(fromB64url(body))));
    return o && o.x > Date.now() ? o : null;
  } catch (e) { return null; }
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
