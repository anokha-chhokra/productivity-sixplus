/* Commit service worker: makes the app load without a connection.
   Strategy: network first (so updates show up as soon as you are online), falling back to the cache when
   offline or when the network takes longer than 3 seconds. Bump CACHE when you add or rename files below. */
var CACHE = 'commit-v1';
var ASSETS = ['./', 'index.html', 'style.css', 'app.js', 'manifest.json', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
var NETWORK_TIMEOUT = 3000;

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) { return; }
  e.respondWith(networkFirst(req));
});

function fromCache(req) {
  return caches.match(req, { ignoreSearch: true }).then(function (hit) {
    if (hit) { return hit; }
    return req.mode === 'navigate' ? caches.match('index.html') : undefined;
  });
}

function networkFirst(req) {
  return new Promise(function (resolve) {
    var settled = false;
    function done(res) { if (!settled && res) { settled = true; resolve(res); } }

    var timer = setTimeout(function () { fromCache(req).then(done); }, NETWORK_TIMEOUT);

    fetch(req).then(function (res) {
      clearTimeout(timer);
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      done(res);
    }).catch(function () {
      clearTimeout(timer);
      fromCache(req).then(function (hit) {
        if (hit) { done(hit); } else if (!settled) { settled = true; resolve(Response.error()); }
      });
    });
  });
}
