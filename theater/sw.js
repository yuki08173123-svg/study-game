/* Theater の service worker
   ほうしん:「ネットワーク優先」。まずネットから最新をとり、とれたものをキャッシュに控える。
   ネットがないときだけキャッシュで動く。キャッシュを先に見る方式にすると
   「直したのに古い画面が出る」事故になるので、ぜったいにしない。
   動画は YouTube から流すので、ここではキャッシュしない（同じサイトのファイルだけ扱う）。 */
const VER = 'th-v33';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for(const k of await caches.keys()) if(k !== VER) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;
  e.respondWith((async () => {
    try{
      const res = await fetch(req);
      if(res && res.ok){ const c = await caches.open(VER); c.put(req, res.clone()); }
      return res;
    }catch(err){
      const hit = await caches.match(req, { ignoreSearch:true });
      if(hit) return hit;
      throw err;
    }
  })());
});
