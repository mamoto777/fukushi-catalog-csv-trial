/*
 * Service Worker(手書き。設計書§5-10)
 * - install時にアプリシェルをプリキャッシュ
 * - fetch時はcache-first(同一オリジンGETのみ)
 * - キャッシュ名にバージョンを含め、activate時に旧キャッシュを削除
 */
const CACHE_NAME = "fukushi-navi-v4";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./images/genre-walking.svg",
  "./images/genre-wheelchair.svg",
  "./images/genre-bed.svg",
  "./images/genre-mattress.svg",
  "./images/genre-transfer.svg",
  "./images/genre-bath.svg",
  "./images/genre-toilet.svg",
  "./images/genre-handrail.svg",
  "./images/genre-watch.svg",
  "./products-template.csv",
  "./products-template-simple.xlsx",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    }),
  );
});
