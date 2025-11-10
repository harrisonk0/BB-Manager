/**
 * @file sw.js
 * @description Service Worker for the BB Manager PWA.
 * This file handles caching strategies to ensure the application works offline.
 */

// A unique name for the cache, which includes a version number.
// Incrementing the version number (e.g., to 'v3') will trigger the 'activate'
// event and allow for clearing out old, outdated caches.
const CACHE_NAME = 'bb-manager-cache-v2';

// An array of essential assets that should be cached during the service worker's installation phase.
// This ensures the basic app shell can load even when offline.
const urlsToCache = [
  '/',
  '/index.html',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/favicon.ico',
  '/manifest.json'
];

/**
 * 'install' event listener.
 * This event is fired when the service worker is first installed.
 * It opens the cache and adds the core application shell files to it.
 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

/**
 * 'activate' event listener.
 * This event is fired when the service worker becomes active.
 * Its primary role here is to clean up old, unused caches to free up storage space.
 */
self.addEventListener('activate', event => {
  // A whitelist containing the name of the current cache.
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // If a cache is found that is not in the whitelist, it's an old cache and should be deleted.
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open clients (pages) immediately.
  );
});

/**
 * 'fetch' event listener.
 * This event intercepts every network request made by the application.
 * It allows us to define custom caching strategies for different types of requests.
 */
self.addEventListener('fetch', event => {
  // Strategy 1: Network-first for navigation requests.
  // This ensures the user always gets the latest version of the HTML page if they are online.
  // If the network request fails (i.e., they are offline), it falls back to the cached version.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Strategy 2: Stale-while-revalidate for other requests (JS, CSS, images, etc.).
  // This strategy provides a fast user experience by serving assets from the cache immediately.
  // In the background, it still makes a network request to fetch the latest version
  // and updates the cache for the next time the user visits.
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        // Fetch the latest version from the network in the background.
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // If the fetch is successful, update the cache with the new version.
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
            // The fetch failed (e.g., network is down). This is okay because
            // we've already served the cached response (if available).
        });

        // Return the cached response immediately if it exists, otherwise wait for the network fetch.
        return response || fetchPromise;
      });
    })
  );
});
