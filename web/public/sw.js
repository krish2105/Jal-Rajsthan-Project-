/* JAL offline shell.
   Field officers in Barmer and Jaisalmer lose connectivity routinely, so the
   shell and the last-seen pages must survive it. Strategy: network-first for
   navigations (fresh data wins when online), cache-first for immutable build
   assets, and a branded offline page as the final fallback. */
const VERSION = "jal-v1";
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
const OFFLINE = "/offline";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL).then((c) => c.addAll([OFFLINE, "/manifest.webmanifest", "/icon-192.png"]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // never cache auth or API traffic — a stale session or stale ledger is worse
  // than an honest failure
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match(OFFLINE)))
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|woff2?|json|mjs)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(request, copy));
            return res;
          })
      )
    );
  }
});
