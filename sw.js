const CACHE_NAME = 'weather-final-ultra-v1';
// Aynan sizning 3 ta faylingiz ro'yxati:
const ASSETS = [
  './',
  'index.html?v=1',
  'app-part1.js?v=1',
  'app-part2.js?v=1'
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
  // Faqat sahifa yuklash so'rovlarini (HTML) ushlab qolamiz
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => {
        // Agar internet bo'lmasa yoki yangilash (refresh) xato bersa, keshdagi index.html ni qaytaradi
        return caches.match('index.html');
      })
    );
  } else {
    // Rasmlar, JS va CSS fayllari uchun standart kesh mexanizmi
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        return cachedResponse || fetch(e.request);
      })
    );
  }
});
