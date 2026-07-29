const CACHE_NAME = 'obhavo-cache-v1';
// Aynan sizning 3 ta faylingiz ro'yxati:
const ASSETS = [
  './',
  'index.html',
  'app-part1.js',
  'app-part2.js'
];

// Ilova birinchi marta ochilganda fayllarni telefon keshiga saqlash
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Internet yo'q bo'lganda fayllarni keshdan (oflayn) olib berish
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
