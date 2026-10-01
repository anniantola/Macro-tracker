const CACHE_NAME = "macro-tracker-v3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("macro-tracker-") && name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const request = event.request;

  if (request.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html").then((cached) => {
        const update = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              event.waitUntil(
                caches.open(CACHE_NAME)
                  .then((cache) => cache.put("./index.html", copy))
              );
            }
            return response;
          })
          .catch(() => null);

        if (cached) {
          event.waitUntil(update);
          return cached;
        }

        return update.then((response) => {
          if (response) return response;
          return caches.match("./index.html");
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }

        const copy = response.clone();

        event.waitUntil(
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, copy))
        );

        return response;
      });
    })
  );
});
