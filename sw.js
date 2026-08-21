/* 暗記クエスト の service worker
   ほうしん: 「ネットワーク优先」。
   まず ネットから 最新を とり、とれた ものを キャッシュに ひかえる。
   ネットが ない ときだけ キャッシュで うごく（オフラインでも 勉強できる）。
   キャッシュを 先に 見る 方式に すると「直したのに 古い 画面が 出る」事故に
   なる（開発中に いちど やらかした）ので、ぜったいに しない。 */
const VER = 'mq-v1';

self.addEventListener('install', e => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for(const k of await caches.keys()) if(k !== VER) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;                       // APIよびだし等は さわらない
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;             // 自分の ファイルだけ

  e.respondWith((async () => {
    try{
      const res = await fetch(req);
      if(res && res.ok){
        const cache = await caches.open(VER);
        cache.put(req, res.clone());
      }
      return res;
    }catch(err){
      const hit = await caches.match(req, { ignoreSearch: true });
      if(hit) return hit;
      throw err;
    }
  })());
});
