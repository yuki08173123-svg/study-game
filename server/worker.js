/* 暗記クエスト の AI中継サーバー（Cloudflare Worker）
   アプリからの たのみを うけとり、サーバーの中にある かぎを つけて
   Anthropic に わたす。つかう人は かぎの 入力が いらなくなる。

   Cloudflare の 画面で 2つ 設定が いる：
     1. Variables and Secrets → Secret 「ANTHROPIC_API_KEY」（Anthropicの かぎ）
     2. Bindings → KV namespace 「LIMITS」（つかった回数を おぼえる ばしょ）

   おかねの 安全弁：1日に つかえる 回数を かぎる。
   ここを こえたら Anthropic を よばずに ことわるので、1円も かからない。 */

// ── ここの 数字を かえると 使える量が かわる ───────────────
// 写真1回 ≒ 0.55円。180回/日 ≒ 月3,000円 が じょうげん。
const DAY_TOTAL  = 180;   // みんな あわせて 1日 なん回まで
const DAY_DEVICE = 8;     // 1台の 端末が 1日 なん回まで（ひとりじめ ぼうし）
// ────────────────────────────────────────────

const OK_ORIGINS = [
  'https://yuki08173123-svg.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
];

// 日本時間の「きょうの日づけ」。よあけ（0時）に 枠が もどる。
function jstDay() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function corsFor(request) {
  const origin = request.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': OK_ORIGINS.includes(origin) ? origin : OK_ORIGINS[0],
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-device-id',
  };
}

function fail(status, type, message, cors) {
  return new Response(JSON.stringify({ error: { type, message } }), {
    status, headers: { ...cors, 'content-type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const cors = corsFor(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return fail(405, 'bad_method', 'POST only', cors);

    // KV が つながっていないと 回数を かぞえられない → 安全がわに たおして ことわる
    if (!env.LIMITS) {
      return fail(500, 'no_kv',
        'サーバーの 設定が まだです（KV namespace「LIMITS」を バインドしてください）', cors);
    }

    let body;
    try { body = await request.json(); }
    catch (e) { return fail(400, 'bad_json', 'bad json', cors); }

    // ── 1日の 回数を みる ──────────────────────────
    const day = jstDay();
    const rawId = request.headers.get('x-device-id') || '';
    const devId = (rawId.replace(/[^A-Za-z0-9-]/g, '') || 'unknown').slice(0, 40);
    const totalKey = `t:${day}`;
    const devKey = `d:${devId}:${day}`;

    const [totalRaw, devRaw] = await Promise.all([
      env.LIMITS.get(totalKey),
      env.LIMITS.get(devKey),
    ]);
    const total = parseInt(totalRaw || '0', 10);
    const dev = parseInt(devRaw || '0', 10);

    if (total >= DAY_TOTAL) {
      return fail(429, 'over_quota',
        'きょうの 無料ぶんが おわりました。あしたの朝に また つかえます。', cors);
    }
    if (dev >= DAY_DEVICE) {
      return fail(429, 'over_quota',
        `この端末は きょう ${DAY_DEVICE}回 つかいました。あしたの朝に また つかえます。`, cors);
    }

    // さきに 1回ぶん つかったことに する（同時アクセスで 数字が とばないように）
    const ttl = 172800; // 2日で じどう そうじ
    await Promise.all([
      env.LIMITS.put(totalKey, String(total + 1), { expirationTtl: ttl }),
      env.LIMITS.put(devKey, String(dev + 1), { expirationTtl: ttl }),
    ]);
    // ──────────────────────────────────────────

    // りょうきんが 安い モデルに 固定し、長すぎる 出力は みとめない
    body.model = 'claude-haiku-4-5-20251001';
    // effort は Haiku 4.5 では エラーに なるので とりのぞく
    if (body.output_config) delete body.output_config.effort;
    body.max_tokens = Math.min(body.max_tokens || 1000, 8000);
    delete body.stream;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    return new Response(res.body, {
      status: res.status,
      headers: { ...cors, 'content-type': 'application/json' },
    });
  },
};
