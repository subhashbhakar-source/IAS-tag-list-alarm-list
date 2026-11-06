// Offline cache for IAS Alarm & Tag Finder (GitHub Pages / any https host).
// The page holds all data (encrypted), so caching index.html is enough to work with no signal.
const CACHE = 'ias-tag-finder-v2';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f =>
    fetch(f, { cache: 'reload' }).then(r => { if (r.ok) return c.put(f, r); }).catch(() => {})
  ))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Network first (so a new build is picked up when online); cached copy when offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const isPage = e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html');
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request).then(r => r || (isPage ? caches.match('./index.html') : undefined)))
  );
});
