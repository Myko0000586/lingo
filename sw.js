// Service worker — стратегия «сначала сеть» (network-first).
// Свежий код всегда подгружается при наличии интернета; кэш используется как
// запасной вариант офлайн. Это исключает «застревание» старых файлов.
const CACHE = 'lingo-v5';
const ASSETS = [
  './',
  './index.html',
  './data.js',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // только свой источник; внешние запросы (ИИ-сервер) не трогаем
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then(resp => {
        // обновляем кэш свежей копией
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
