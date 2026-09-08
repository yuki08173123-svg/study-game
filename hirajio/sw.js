// ヒラジオ：アプリの骨組みだけをキャッシュする。
// episodes.json は常にネット優先（新しい回をすぐ出すため）。音声は素通し（iOSの範囲リクエストと相性が悪いため）。
const CACHE = 'hirajio-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.endsWith('.mp3')) return;
  if (url.pathname.endsWith('episodes.json') || url.pathname.endsWith('members.json') || url.pathname.endsWith('version.json')) {
    e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(url.pathname, cp)); return r; })
      .catch(() => caches.match(url.pathname)));
    return;
  }
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(r => r || fetch(e.request).then(res => {
    const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return res;
  })));
});
