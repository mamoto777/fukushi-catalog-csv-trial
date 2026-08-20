/*
 * Service Worker(手書き。設計書§5-10)
 * - install時にアプリシェルをプリキャッシュ
 * - fetch時はcache-first(同一オリジンGETのみ)
 * - キャッシュ名にバージョンを含め、activate時に旧キャッシュを削除
 */
const CACHE_NAME = "fukushi-navi-v5";

// ジャンルアイコン・ひな形はsrc/assets/へ移動しビルド時にバンドルへ取り込まれるため、
// ハッシュ付きのビルド後パスをここで個別に列挙できない。プリキャッシュは静的配置ファイルのみとし、
// バンドルJS/CSS等は下のfetchハンドラの実行時キャッシュ(取得成功時にcache.put)で
// 初回表示時に取り込まれる(2回目以降のオフライン閲覧はそちらが担う)。
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
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
