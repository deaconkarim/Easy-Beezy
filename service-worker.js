const CACHE_NAME = "Beezys-babies-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./style/main.css",
  "./js/application.js",
  "./js/animframe_polyfill.js",
  "./js/bind_polyfill.js",
  "./js/classlist_polyfill.js",
  "./js/game_manager.js",
  "./js/grid.js",
  "./js/html_actuator.js",
  "./js/keyboard_input_manager.js",
  "./js/local_storage_manager.js",
  "./js/tile.js",
  "./js/tile_order.js",
  "./js/howto.js",
  "./js/pwa.js",
  "./images/smile.png",
  "./images/cool.png",
  "./images/star.png",
  "./images/party.png",
  "./images/sad.png",
  "./images/tight.png",
  "./images/tiles/2.png",
  "./images/tiles/4.png",
  "./images/tiles/8.png",
  "./images/tiles/16.png",
  "./images/tiles/32.png",
  "./images/tiles/64.png",
  "./images/tiles/128.png",
  "./images/tiles/256.png",
  "./images/tiles/512.png",
  "./images/tiles/1024.png",
  "./images/tiles/2048.png",
  "./images/tiles/4096.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => cached);
    })
  );
});

