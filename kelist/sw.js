const CACHE_NAME = 'kelist-v1';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './config.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Cache installation failed:', error);
                // Don't prevent installation if caching fails
                return Promise.resolve();
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
            .catch(error => {
                console.error('Service Worker: Fetch failed:', error);
                // Return a basic fallback if both cache and network fail
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
            })
    );
});
