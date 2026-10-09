/* ブルポ帳 の service worker
   方針:「ネットワーク優先」。まずネットから最新をとり、とれたものをキャッシュに控える。
   ネットがないときだけキャッシュで動く。キャッシュを先に見る方式にすると
   「直したのに古い画面が出る」事故になるので、ぜったいにしない。 */
const VER = 'bp-v5';
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

/* 毎朝の しらせ（v4）：サーバーから「きょうの まいすう」が とどいたら、アイコンに 数字を つけて 通知を だす。
   iPhone・iPad では、とどいたら かならず 通知を だす きまり（だまって 数字だけは できない） */
self.addEventListener('push', e => {
  let d = {};
  try{ d = e.data ? e.data.json() : {}; }catch(err){}
  const n = Number(d.n) || 0;
  e.waitUntil((async () => {
    try{ if(self.navigator.setAppBadge) await (n ? self.navigator.setAppBadge(n) : self.navigator.clearAppBadge()); }catch(err){}
    await self.registration.showNotification('ブルポ帳', {
      body: d.body || (n ? `きょうの ブルポが ${n}まい あるよ` : 'きょうの ブルポは ないよ'),
      tag: 'today', renotify: true, icon: 'icon-192.png', badge: 'icon-192.png', data: { url: './' },
    });
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
    for(const c of cs){ if('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  })());
});
