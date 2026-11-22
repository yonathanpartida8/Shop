// Service worker: la app abre rápido y funciona como app instalada en Android.
const CACHE = "nothing-shop-v1";
const SHELL = ["./", "index.html", "assets/styles.css", "assets/app.js", "assets/icon.svg", "manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Nunca cachear la API (precios y stock siempre frescos) ni el config.
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.includes("nothing")) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request))
  );
});
