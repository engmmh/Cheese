// Service Worker بسيط لتفعيل خاصية "تثبيت كتطبيق"
const CACHE_NAME = "recipe-book-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

// استراتيجية: الشبكة أولًا، وإن فشلت يرجع لآخر نسخة محفوظة (لو موجودة)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
