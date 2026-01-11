# PWA Service Workers and Offline Strategies

The Bazaar Progressive Web App (PWA) architecture ensures high availability, speed, and reliable notifications across all modern browsers.

## 1. Manifest & Identity (`manifest.json`)
- **Mode**: `standalone` (removes browser toolbar).
- **Start URL**: `/index.html`.
- **Identity**: Defines icons (192x192, 512x512) and theme colors for phone status bars.

## 2. Service Worker Dual-Engine
- **`sw.js`**: Main engine for asset caching and fetch interception.
- **`firebase-messaging-sw.js`**: Exclusively handles background Push notifications using Firebase v8.

## 3. Caching Strategies
| File Type | Strategy | Behavior |
| :--- | :--- | :--- |
| **HTML Navigation** | **Network First** | Tries network; falls back to `offline.html`. |
| **Static Assets (JS/CSS)** | **Cache First** | Immediate loading from cache; periodic refresh. |
| **Images** | **Cache First** | Local storage to save mobile data. |
| **API Data** | **Network Only** | Ensures live data for prices/orders. |

## 4. Offline Functionality
- **`offline.html`**: A standalone fallback page with self-contained translation logic.
- **IndexedDB**: Uses `bazaarAppDB` via `notification-db-manager.js` to store the last 50 notification logs for offline viewing.
- **Connection Indicators**: Real-time alerts inform the user when they are browsing in offline mode.

## 5. FCM Implementation in PWA
- **Token Exchange**: VAPID keys secure the registration process.
- **Ready State**: The system waits for `navigator.serviceWorker.ready` before initializing Firebase to prevent "No Active SW" errors.
- **Persistence**: Incoming messages are immediately saved to IndexedDB to ensure the unread badge count remains accurate even after app restarts.

## 6. Version Management & Forced Update
The `checkAppVersionAndClearData` tool in `js/tools.js` monitors `version.json`. If a mismatch is detected:
1. `localStorage` and `sessionStorage` are cleared (except Android keys).
2. All Active Service Workers are unregistered.
3. Cache Storage is wiped.
4. The page is reloaded to force 100% fresh assets.
