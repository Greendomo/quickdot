const CACHE_NAME = "quickdot-cache-v57";
const APP_SHELL = [
  "./",
  "./index.html",
  "./admin.html",
  "./health.html",
  "./styles.css",
  "./base.css",
  "./layout.css",
  "./panels.css",
  "./controls.css",
  "./entries.css",
  "./dialogs.css",
  "./responsive.css",
  "./constants.js",
  "./dates.js",
  "./i18n.js",
  "./migrations.js",
  "./state.js",
  "./dom.js",
  "./core.js",
  "./storage.js",
  "./sync.js",
  "./entries.js",
  "./render-shell.js",
  "./render-entries.js",
  "./render-logs.js",
  "./render.js",
  "./app-events.js",
  "./app.js",
  "./supabase-config.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => {
          const fallback = requestUrl.pathname.endsWith("/admin.html")
            ? "./admin.html"
            : requestUrl.pathname.endsWith("/health.html")
              ? "./health.html"
              : "./index.html";
          return caches.match(fallback);
        }),
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
