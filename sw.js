/**
 * @file sw.js
 * @description Main Service Worker for Suez Bazaar PWA.
 * Combines Firebase Cloud Messaging (FCM) and caching strategies for offline support.
 */

// 1. Import existing Firebase Messaging logic
importScripts('firebase-messaging-sw.js');

// 2. Configuration
const CACHE_NAME = 'suez-bazaar-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/manifest.json',
    '/favicon.ico',
    '/images/icons/icon-192x192.png',
    '/images/icons/icon-512x512.png',
    '/style/variables.css',
    '/style/index.css',
    '/notification/page/notifications.css',
    '/assets/fontawesome/css/all.css',
    '/assets/fontawesome/webfonts/fa-solid-900.woff2',
    '/assets/fontawesome/webfonts/fa-regular-400.woff2',
    '/assets/fontawesome/webfonts/fa-brands-400.woff2',
    '/assets/libs/sweetalert2/sweetalert2.all.min.js',
    '/js/config.js',
    '/js/globalVariable.js',
    '/js/network.js',
    '/js/tools.js',
    '/js/cloudFileManager.js',
    '/notification/notification-db-manager.js',
    '/js/PRODUCT_SERVICE/serviceCategoryHelper.js',
    '/js/PRODUCT_SERVICE/productStateManager.js',
    '/js/auth/uiHelpers.js',
    '/js/auth/validators.js',
    '/js/auth/sessionManager.js',
    '/js/auth.js',
    '/notification/fcm-config.js',
    '/notification/fcm-api.js',
    '/notification/fcm-p2p-bridge.js',
    '/notification/fcm-android-bridge.js',
    '/notification/fcm-event-handlers.js',
    '/js/forms.js',
    '/pages/cardPackage/js/cardPackage.js',
    '/js/connectUsers.js',
    '/js/connectProduct.js',
    '/pages/category/categoryModal.js',
    '/notification/fcm-web-setup.js',
    '/notification/fcm-android-setup.js',
    '/notification/fcm-main-setup.js',
    '/notification/page/global-counter.js',
    '/notification/page/global-events.js',
    '/notification/page/global-system-notif.js',
    '/notification/page/notifications.js',
    '/js/index.js'
];

// 3. Install Event - Precache Static Assets
self.addEventListener('install', (event) => {
    console.log('%c[Main SW] 🛠️ Install event: Installing main service worker and caching assets...', 'color: #9e9e9e;');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('%c[Main SW] 📦 Caching App Shell...', 'color: #607d8b;');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    // Note: skipWaiting() is already called in firebase-messaging-sw.js
});

// 4. Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('%c[Main SW] ⚡ Activate event: Activating service and cleaning up old caches...', 'color: #9e9e9e;');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log(`%c[Main SW] 🗑️ Deleting old cache: ${key}`, 'color: #f44336;');
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

// 5. Fetch Event - Runtime Caching Strategies
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Strategy 1: HTML Requests (Navigation or Fragments) -> Network First, Fallback to Offline
    if (request.mode === 'navigate' || (request.method === 'GET' && request.url.includes('.html'))) {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return caches.match('/offline.html');
                })
        );
        return;
    }

    // Strategy 2: Static Assets (CSS, JS, Fonts) -> Cache First
    if (
        request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'font'
    ) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                return cachedResponse || fetch(request).then((networkResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        // only cache valid responses
                        if (networkResponse.ok) {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // Strategy 3: Images -> Cache First
    if (request.destination === 'image') {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                return cachedResponse || fetch(request).then((networkResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // Strategy 4: API / Dynamic Data -> Network First (Optional: Cache fallback)
    // For now, we leave default behavior (Network Only) for APIs to ensure freshness,
    // or implementing a specific API caching strategy if requested.
    // Given user requirements for "Offline Work", we should consider caching APIs?
    // User said "Partial offline work".
    // Let's stick to network only for APIs for correctness unless specified.
});
