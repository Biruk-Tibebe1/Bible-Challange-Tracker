const CACHE_PREFIX = "bible-challenge-";
const CACHE_VERSION = "v1";
const PAGE_CACHE = `${CACHE_PREFIX}pages-${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}static-${CACHE_VERSION}`;
const BIBLE_CACHE = `${CACHE_PREFIX}kjv-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";
const SAFE_PAGE_PATHS = new Set(["/", "/today", "/bible", "/challenge", "/challenges"]);
const SAFE_STATIC_PATHS = new Set(["/icon.png", "/icon.svg", "/manifest.webmanifest", OFFLINE_URL]);

function isSafePageUrl(url) {
  if (!SAFE_PAGE_PATHS.has(url.pathname)) return false;
  const allowedParameters = url.pathname === "/bible"
    ? new Set(["book", "chapter", "verse", "translation", "_rsc"])
    : new Set(["_rsc"]);
  return [...url.searchParams.keys()].every((key) => allowedParameters.has(key));
}

function isSafeKJVChapterUrl(url) {
  return url.pathname.startsWith("/api/bible/kjv/")
    && /^\/api\/bible\/kjv\/[a-z0-9-]+\/[1-9]\d*$/.test(url.pathname)
    && url.search === "";
}

function isNextStaticUrl(url) {
  return url.pathname.startsWith("/_next/static/");
}

function rscCacheKey(url) {
  const keyUrl = new URL(url);
  keyUrl.searchParams.delete("_rsc");
  keyUrl.searchParams.set("__offline_rsc", "1");
  return new Request(keyUrl.toString());
}

async function networkFirst(request, cacheName, cacheKey = request) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") await cache.put(cacheKey, response.clone());
    return response;
  } catch {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
    if (request.mode === "navigate") return caches.match(OFFLINE_URL);
    if (cacheName === BIBLE_CACHE) {
      return Response.json({ status: "error", message: "This KJV chapter is not available offline yet." }, { status: 503 });
    }
    return new Response("This previously visited page is not available offline yet.", { status: 503 });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icon.png", "/icon.svg", "/manifest.webmanifest"]))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && ![PAGE_CACHE, STATIC_CACHE, BIBLE_CACHE].includes(key))
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" && isSafePageUrl(url)) {
    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }

  const isRscRequest = request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
  if (isRscRequest && isSafePageUrl(url)) {
    event.respondWith(networkFirst(request, PAGE_CACHE, rscCacheKey(url)));
    return;
  }

  if (isSafeKJVChapterUrl(url)) {
    event.respondWith(networkFirst(request, BIBLE_CACHE));
    return;
  }

  if (isNextStaticUrl(url) || SAFE_STATIC_PATHS.has(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === "basic") await cache.put(request, response.clone());
      return response;
    })());
  }
});