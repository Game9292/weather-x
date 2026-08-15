const CACHE_NAME = 'obhavo-cache-v7';
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
