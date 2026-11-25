/* C1-Heft offline support: always try the network first (fresh content),
   fall back to the last saved copy when there is no connection (U-Bahn). */
const CACHE = 'c1-heft-v1';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'data/manifest.js', 'data/plan.js', 'data/seed.js', 'icons/icon-192.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {})); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  const key = url.origin + url.pathname;
  e.respondWith(fetch(req).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)).catch(() => {}); }
    return res;
  }).catch(() => caches.open(CACHE).then(c => c.match(key).then(m => m || (req.mode === 'navigate' ? c.match(url.origin + url.pathname.replace(/[^/]*$/, '') + 'index.html') : undefined)))
    .then(m => m || new Response('Çevrimdışı: bu dosya henüz kaydedilmedi.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))));
});
