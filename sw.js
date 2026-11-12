// Kidboard service worker: app shell cached for offline use, data.json always tried from the network first.
// Bump VERSION when shell files change so open boards reload to the new version.
const VERSION = "kb-5";
const SHELL = ["./", "index.html", "crypto.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== "kb-fonts").map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // Data: the page handles it (no-store fetch plus its own fallback copy).
  if (url.origin === location.origin && url.pathname.endsWith("/data.json")) return;

  // Google Fonts: cache-first in a long-lived cache.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open("kb-fonts").then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok || res.type === "opaque") c.put(e.request, res.clone());
      return res;
    }));
    return;
  }

  // App shell: cache first, refresh in the background.
  if (url.origin === location.origin) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
