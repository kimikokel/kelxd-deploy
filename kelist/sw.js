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
    
    // Don't intercept API requests - let them go directly to the network
    if (requestUrl.pathname.startsWith('/api') || 
        requestUrl.hostname === '18.141.202.4' ||
        requestUrl.hostname === 'localhost' && requestUrl.port === '3000') {
        console.log('Service Worker: Skipping API request:', event.request.url);
        return; // Let the request go through normally
    }
    
    // Only cache static resources
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log('Service Worker: Serving from cache:', event.request.url);
                    return response;
                }
                
                console.log('Service Worker: Fetching from network:', event.request.url);
                return fetch(event.request).then(response => {
                    // Don't cache if not a successful response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clone the response
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
            .catch(error => {
                console.error('Service Worker: Fetch failed:', error);
                // Return cached index.html for navigation requests
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
                // For other resources, just fail gracefully
                return new Response('', {
                    status: 408,
                    statusText: 'Network request failed'
                });
            })
    );
});