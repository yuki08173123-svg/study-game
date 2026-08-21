/* 暗記クエスト の AI中継サーバー（Cloudflare Worker）
   アプリからの たのみを うけとり、サーバーの中にある かぎを つけて
   Anthropic に わたす。つかう人は かぎの 入力が いらなくなる。
   かぎは 画面の Variables and Secrets に ANTHROPIC_API_KEY として おく。 */
export default {
  async fetch(request, env) {
    // 本ばん（GitHub Pages）と、手もとの ためし用（localhost）だけ ゆるす
    const OK_ORIGINS = [
      'https://yuki08173123-svg.github.io',
      'http://localhost:8000',
      'http://127.0.0.1:8000',
    ];
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': OK_ORIGINS.includes(origin) ? origin : OK_ORIGINS[0],
      'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST')    return new Response('POST only', { status: 405, headers: cors });

    let body;
    try { body = await request.json(); }
    catch (e) { return new Response('bad json', { status: 400, headers: cors }); }

    // りょうきんが 安い モデルに 固定し、長すぎる 出力は みとめない
    body.model = 'claude-haiku-4-5-20251001';
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
