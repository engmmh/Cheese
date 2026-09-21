// Service Worker بسيط — بدون أي تخزين مؤقت حاليًا (الموقع لسه بيتطوّر بنشاط)
// بمجرد ما التصميم يستقر، تقدر تفعّل التخزين المؤقت هنا لتحسين سرعة التحميل

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request, { cache: "no-store" }));
});
