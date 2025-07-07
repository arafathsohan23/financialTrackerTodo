const CACHE_NAME = 'finance-notes-cache-v1'; // Or v2 if you make changes often
const urlsToCache = [
    '/financial-todo/',                  // Root of your app's subdirectory
    '/financial-todo/index.html',        // Main HTML file
    '/financial-todo/style.css',         // Stylesheet
    '/financial-todo/script.js',         // Main script
    '/financial-todo/manifest.json',     // The manifest itself
    '/financial-todo/icons/icon-192x192.png', // Icon
    '/financial-todo/icons/icon-512x512.png', // Icon
    // Font URLs are absolute, so they are okay as they are:
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Google+Sans:wght@400;500;700&display=swap',
    'https://fonts.googleapis.com/icon?family=Material+Icons+Outlined'
];

// Install event: Cache core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                // Using addAll - if one fails, the whole install fails.
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Failed to cache resources during install:', error);
            })
    );
    self.skipWaiting(); // Force the waiting service worker to become the active service worker
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME]; // Only keep the current cache
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim(); // Take control of uncontrolled clients (pages) immediately
});

// Fetch event: Serve cached assets or fetch from network
self.addEventListener('fetch', event => {
    // We only want to cache GET requests.
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response from Cache
                if (response) {
                    return response;
                }

                // Not in cache - fetch from network
                return fetch(event.request).then(
                    networkResponse => {
                        // Check if we received a valid response
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && !networkResponse.type.startsWith('opaque')) {
                            // Don't cache invalid or non-basic responses (like CDN opaque responses unless needed)
                            return networkResponse;
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and because we want the browser to consume the response
                        // as well as the cache consuming the response, we need
                        // to clone it so we have two streams.
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                // Cache the fetched resource
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                ).catch(error => {
                     console.error('Fetching failed:', event.request.url, error);
                     // Optional: Return a fallback offline page/resource here if needed
                     // e.g., return caches.match('/offline.html');
                     // For this app, just failing might be okay if offline.
                });
            })
    );
});