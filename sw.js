// Telefon xotirasidagi barcha eski keshni majburlab tozalash
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// So'rovlarni keshga yo'naltirmay, to'g'ridan-to'g'ri internetdan olish
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});
