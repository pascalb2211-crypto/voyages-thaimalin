/* Service worker : mini-guide Plages (Thaï Malin). Change VERSION à chaque mise à jour du guide. */
const VERSION = "plages-v24";
const PAGES = Array.from({length: 23}, (_, i) => `pages/p${String(i + 1).padStart(2, "0")}.webp`).filter(u => u !== "pages/p17.webp").concat(["pages/p17-haut.webp", "pages/p17-bas.webp"].concat(["clair","nuageux","pluie","orage","aube","couchant","nuit"].map(m => `bg/${m}.webp`)));
const CORE = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(CORE);
    // Les pages sont mises en cache une par une : un échec n'empêche pas l'installation.
    await Promise.all(PAGES.map(u => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION && k.startsWith("plages-")).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return; // liens externes : réseau normal
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("index.html")));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});
