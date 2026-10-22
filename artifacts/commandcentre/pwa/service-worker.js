/* Generated per build: cache only explicitly listed public app files. */
const CACHE_PREFIX = 'makueni-shell-';
const CACHE_NAME = CACHE_PREFIX + '__BUILD_VERSION__';
const PRECACHE = __PRECACHE_URLS__;
const ALLOWED = new Set(PRECACHE.map(path => new URL(path, self.location.origin).href));
const OFFLINE_URL = new URL('__BASE_PATH__offline.html', self.location.origin).href;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') void self.skipWaiting();
});

async function navigate(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    return await fetch(request, { signal: controller.signal });
  } catch {
    return await caches.match(OFFLINE_URL) || new Response('Connection unavailable. Reconnect to open Makueni Command Centre.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  } finally { clearTimeout(timer); }
}
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || /\/api(?:\/|$)|^\/s\//.test(url.pathname)) return;
  if (request.mode === 'navigate' && url.pathname.startsWith('__BASE_PATH__')) {
    event.respondWith(navigate(request));
    return;
  }
  if (!ALLOWED.has(url.href)) return;
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
