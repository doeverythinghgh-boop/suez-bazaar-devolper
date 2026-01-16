# Push Notifications and FCM Architecture

Bazaar implements a high-reliability notification system that combines standard Server-to-Client messaging with advanced Client-to-Client (P2P) logic.

## 1. Firebase Cloud Messaging (FCM v1)
The project uses the modern FCM v1 API for all outgoing messages. To maintain performance and reduce server load, tokens are managed locally on the device.
- **[CRITICAL] Data-only Messages**: FCM payloads MUST omit the `notification` block. This ensures that the Android `onMessageReceived` handler is triggered in all states (Background, Killed), enabling custom sound playback and batch persistence.

### Critical Components:
- **VAPID Keys**: Ensure secure browser registration.
- **Token Management**: Handled distinctly for PWA (`fcm_token`) and Android (`android_fcm_key`) to prevent delivery conflicts.
- **`shouldNotify(stepId, role)`**: A localized logic engine in `notificationTools.js` that checks user preferences and global settings before attempting a broadcast.

## 2. Client-Side P2P Notifications [NEW]
To ensure instant notifications even during high server latency, the PWA can send messages directly:
- **Authentication**: Uses a local, encrypted copy of the Firebase Service Account JSON.
- **JWT Signing**: Uses the `jsrsasign` library (localized at `assets/libs/jsrsasign/`) to sign OAuth2 tokens directly in the user's browser.
- **API Call**: POSTs directly to the Google FCM VPC endpoint.
- **[Optimization] Environment Awareness**: Web P2P is automatically disabled when `window.Android` is detected to save resources, delegating delivery to the native bridge.

## 3. Intelligence & Filtering
- **Item-Level Awareness**: The system extracts `seller_key` from order items to ensure only the relevant seller receives a "New Order" notification, rather than the entire marketplace list.
- **Template Engine**: `getMessageTemplate` replaces variables like `{{order_id}}` or `{{product_name}}` with live data fetched from the local state.
- **Fallback Logic**: If a specific template is missing in `notification_messages.json`, the system reverts to hardcoded safety strings.

## 4. Delivery Persistence & UI
- **IndexedDB Logging**: Every incoming notification is saved to `notificationsLog` for offline browsing.
- **Signal-driven Sync**: Eliminated the legacy 30-second watchdog. Now, Android flushes all pending background notifications ONLY after receiving the `onWebAppReady` signal from the Web UI.
- **Immediate Debounced Updates**: Badge updates are debounced (50ms) and can be forced immediately (`forceImmediate`) to ensure zero-flicker UI updates during bulk delivery.

Native Android flushes its `SharedPreferences` buffer into the web context via `saveNotificationBatchFromAndroid` only when the Web App signals stability via `onWebAppReady()`. 

**Bridge Function Exports (window scope):**
Critical persistence functions in `notificationTools.js` (e.g., `saveNotificationFromAndroid`, `saveNotificationBatchFromAndroid`) are explicitly attached to the `window` object. This is essential for the Android WebView's `evaluateJavascript` bridge to reach these functions.
