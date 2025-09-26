const CACHE_NAME = 'budget-planner-v1.2.8';
const urlsToCache = [
  '/monthly-budget-planner/',
  '/monthly-budget-planner/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});