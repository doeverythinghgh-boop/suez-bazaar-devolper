# Push Notifications and FCM Architecture

Bazaar implements a high-reliability notification system that combines standard Server-to-Client messaging with advanced Client-to-Client (P2P) logic. This system is organized into specialized modules for enhanced maintainability and clarity.

## 1. System Architecture & Modularization

The notification system is divided into two main areas: **Core Platform Tools** (for sending/receiving) and **Feature-Specific Modules** (for the UI and Page-level logic).

### Core Platform Tools (Directory: `/notification/`)
-   **`fcm-config.js`**: Central configuration engine. Manages `shouldNotify` logic, message template loading (`notification_messages.json`), and global config caching.
-   **`fcm-api.js`**: Handles all server-side communication, including token registration, deletion, and fetching delivery relations.
-   **`fcm-p2p-bridge.js`**: The orchestration layer for sending notifications. Automatically selects between Android Native Bridge and Web P2P (jsrsasign) based on the environment.
-   **`fcm-event-handlers.js`**: High-level business logic that maps internal events (purchases, step changes, item updates) to formatted notifications.
-   **`fcm-android-bridge.js`**: Dedicated interface for Android the WebView bridge. Handles inbound signals like `onAndroidFcmReceived` and `saveNotificationBatchFromAndroid`.
-   **`fcm-setup-web.js`**: Browser-specific initialization, including Service Worker registration and Firebase v8 Messaging setup.

### Notification Page Modules (Directory: `/notification/page/`)
-   **`global-counter.js`**: Manages the persistent unread counter, badge updates, and browser title synchronization across all tabs.
-   **`global-events.js`**: Listeners for database changes (`notificationLogAdded`) to trigger live UI updates.
-   **`global-system-notif.js`**: Handles browser-level system notifications (toasts/banners) for incoming messages.
-   **`actions-events.js`**: Page-level UI event listeners for filtering, searching, and sorting.
-   **`actions-data-refresh.js`**: Logic for refreshing lists, clearing filters, and bulk status updates.
-   **`actions-permissions.js`**: Comprehensive management for enabling/disabling notifications and syncronizing status with system permissions.

## 2. Firebase Cloud Messaging (FCM v1)
The project uses the modern FCM v1 API for all outgoing messages. To maintain performance and reduce server load, tokens are managed locally on the device.
- **[CRITICAL] Data-only Messages**: FCM payloads MUST omit the `notification` block. This ensures that the Android `onMessageReceived` handler is triggered in all states (Background, Killed), enabling custom sound playback and batch persistence.

## 3. Client-Side P2P Notifications
To ensure instant notifications even during high server latency, the PWA can send messages directly:
- **Authentication**: Uses a local, encrypted copy of the Firebase Service Account JSON.
- **JWT Signing**: Uses the `jsrsasign` library (localized at `assets/libs/jsrsasign/`) to sign OAuth2 tokens directly in the user's browser.
- **API Call**: POSTs directly to the Google FCM VPC endpoint.
- **[Optimization] Environment Awareness**: Web P2P is automatically disabled when `window.Android` is detected, delegating delivery to the native bridge.

## 4. Intelligence & Filtering
- **Item-Level Awareness**: The system extracts `seller_key` from order items to ensure only the relevant seller receives a "New Order" notification.
- **Template Engine**: `getMessageTemplate` (in `fcm-config.js`) replaces variables like `{{order_id}}` with live data fetched from the local state.
- **Fallback Logic**: If a specific template is missing in `notification_messages.json`, the system reverts to hardcoded safety strings.

## 5. Delivery Persistence & UI
- **IndexedDB Logging**: Every incoming notification is saved to `notificationsLog` for offline browsing.
- **Signal-driven Sync**: Now, Android flushes all pending background notifications ONLY after receiving the `onWebAppReady` signal from the Web UI.
- **Immediate Debounced Updates**: Badge updates are debounced (50ms) and can be forced immediately (`forceImmediate`) via `GLOBAL_NOTIFICATIONS.updateCounter()`.
