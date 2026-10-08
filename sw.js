const CACHE = 'jt-v7.1';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// network-first dengan batas waktu 2,5 s: sinyal lemah → langsung pakai cache,
// unduhan versi baru tetap berjalan di latar belakang untuk pembukaan berikutnya
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // kurs online lewat jaringan langsung
  const net = fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; });
  e.waitUntil(net.catch(() => {}));
  e.respondWith(new Promise(resolve => {
    let done = false;
    const fromCache = () => caches.match(e.request).then(r => r || caches.match('index.html'));
    const t = setTimeout(() => fromCache().then(r => { if (r && !done) { done = true; resolve(r); } }), 2500);
    net.then(r => { if (!done) { done = true; clearTimeout(t); resolve(r); } })
       .catch(() => fromCache().then(r => { if (!done) { done = true; clearTimeout(t); resolve(r || Response.error()); } }));
  }));
});
