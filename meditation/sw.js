/* 瞑想アプリ の service worker
   方針は他アプリと同じ「ネットワーク優先」。まずネットから最新を取り、取れたものだけ控える。
   ネットがない時だけキャッシュで動く。キャッシュ優先にすると「直したのに古い画面が出る」ので、しない。
   例外は sounds/ の録音。中身が変わらない大きめのファイルなので、
   一度取ったら手元のを使い（キャッシュ優先）、更新のたびに取り直さない。 */
const VER = 'md-v48';
const SND = 'md-sounds-v1';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for(const k of await caches.keys()) if(k !== VER && k !== SND) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;
  if(url.pathname.indexOf('/sounds/') !== -1){
    e.respondWith((async () => {
      const c = await caches.open(SND);
      const hit = await c.match(req, { ignoreSearch:true });
      if(hit) return hit;
      const res = await fetch(req);
      if(res && res.ok) c.put(req, res.clone());
      return res;
    })());
    return;
  }
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
