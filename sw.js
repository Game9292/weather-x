const CACHE_NAME = 'obhavo-cache-v1';
// Oflayn rejimda saqlanishi kerak bo'lgan barcha fayllaringiz ro'yxati:
const ASSETS = [
  'index.html',
  'style.css',
  'script.js'
];

// Fayllarni keshga saqlash
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Internet yo'q bo'lsa, fayllarni keshdan olib berish
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // Agar keshda bo'lsa keshdan beradi, bo'lmasa internetdan qidiradi
      return cachedResponse || fetch(e.request).catch(() => {
        // Agar ob-havo API so'rovi muvaffaqiyatsiz tugasa, eski keshni qaytaradi
        return caches.match('index.html');
      });
    })
  );
});
