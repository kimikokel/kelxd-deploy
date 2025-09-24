const CACHE_NAME = 'kelist-v20250924-183042';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './config.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap'
];

self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
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

self.addEventListener('activate', event => {
    console.log('Service Worker: Activated');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);
    
    // Skip API requests and external requests completely
    if (requestUrl.pathname.startsWith('/api') || 
        requestUrl.hostname === '18.141.202.4' ||
        (requestUrl.hostname === 'localhost' && requestUrl.port === '3000') ||
        requestUrl.protocol === 'https:' && requestUrl.hostname === '18.141.202.4') {
        console.log('Service Worker: Skipping API/external request:', event.request.url);
        // Don't call event.respondWith() - let the browser handle it normally
        return;
    }
    
    // Only handle same-origin static resources
    if (requestUrl.origin !== self.location.origin) {
        return;
    }
    
    // Only cache static resources from same origin
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log('Service Worker: Serving from cache:', event.request.url);
                    return response;
                }
                
                console.log('Service Worker: Fetching from network:', event.request.url);
                return fetch(event.request)
                    .then(response => {
                        // Only cache successful responses
                        if (response && response.status === 200 && response.type === 'basic') {
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return response;
                    });
            })
            .catch(error => {
                console.error('Service Worker: Fetch failed:', error);
                // Return cached index.html for navigation requests
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
                // For other resources, return a proper error response
                return new Response('Service Worker: Resource unavailable', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            })
    );
});