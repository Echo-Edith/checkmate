// Serves the service worker with the current deploy id baked in. Every deploy changes the file,
// so browsers notice the update and the old page cache is thrown away automatically.
const BUILD = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

const SOURCE = String.raw`
// Checkm8 service worker (build __BUILD__)
const BUILD = "__BUILD__";
const STATIC = "checkm8-static-v1";
const PAGES = "checkm8-pages-" + BUILD;
const OFFLINE_URL = "/offline.html";
const ENGINE = "/stockfish/";
const OFFLINE_PLAY_PATHS = ["/play"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    // Take over at once, so a new version is live as soon as it is found.
    caches.open(STATIC).then((c) => c.addAll([OFFLINE_URL, "/icon-192.png", "/icon-512.png"])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(req).then((hit) => {
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit || fresh;
    }),
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Logging out wipes the saved pages, so the next person on this device sees nothing of yours.
  if (req.method === "POST" && url.pathname === "/auth/logout") {
    event.waitUntil(caches.delete(PAGES));
    return;
  }
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    const offlinePlay = OFFLINE_PLAY_PATHS.includes(url.pathname);
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Only the play page is kept for offline play, and only when it loaded without a redirect.
          if (offlinePlay && res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => {
          if (offlinePlay) {
            const page = await caches.open(PAGES).then((c) => c.match(url.pathname));
            if (page) return page;
          }
          return caches.match(OFFLINE_URL);
        }),
    );
    return;
  }

  // Built files and the chess engine are needed to play offline.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC).then((cache) =>
        cache.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res.ok) cache.put(req, res.clone());
              return res;
            }),
        ),
      ),
    );
  } else if (url.pathname.startsWith(ENGINE) || /\.(png|svg|mp3|ogg|wav)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req, STATIC));
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Ignore bad payloads and show the default text.
  }
  const title = data.title || "Checkm8";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "checkm8",
      data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(target).catch(() => undefined);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
`;

export function GET() {
  return new Response(SOURCE.replaceAll("__BUILD__", BUILD.replace(/[^A-Za-z0-9_-]/g, "")), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
