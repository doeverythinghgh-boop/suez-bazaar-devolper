# Push Notifications and FCM Architecture

Bazaar implements a high-reliability notification system that combines standard Server-to-Client messaging with advanced Client-to-Client (P2P) logic.

## 1. Firebase Cloud Messaging (FCM v1)
The project uses the modern FCM v1 API for all outgoing messages. To maintain performance and reduce server load, tokens are managed locally on the device.

### Critical Components:
- **VAPID Keys**: Ensure secure browser registration.
- **Token Management**: Handled distinctly for PWA (`fcm_token`) and Android (`android_fcm_key`) to prevent delivery conflicts.
- **`shouldNotify(stepId, role)`**: A localized logic engine in `notificationTools.js` that checks user preferences and global settings before attempting a broadcast.

## 2. Client-Side P2P Notifications [NEW]
To ensure instant notifications even during high server latency, the PWA can send messages directly:
- **Authentication**: Uses a local, encrypted copy of the Firebase Service Account JSON.
- **JWT Signing**: Uses the `jsrsasign` library (localized at `assets/libs/jsrsasign/`) to sign OAuth2 tokens directly in the user's browser.
- **API Call**: POSTs directly to the Google FCM VPC endpoint.

## 3. Intelligence & Filtering
- **Item-Level Awareness**: The system extracts `seller_key` from order items to ensure only the relevant seller receives a "New Order" notification, rather than the entire marketplace list.
- **Template Engine**: `getMessageTemplate` replaces variables like `{{order_id}}` or `{{product_name}}` with live data fetched from the local state.
- **Fallback Logic**: If a specific template is missing in `notification_messages.json`, the system reverts to hardcoded safety strings.

## 4. Delivery Persistence & UI
- **IndexedDB Logging**: Every incoming notification is saved to `notificationsLog` for offline browsing.
- **Signal-driven Sync**: Eliminated the legacy 30-second watchdog. Now, Android flushes all pending background notifications ONLY after receiving the `onWebAppReady` signal from the Web UI.
- **Immediate Debounced Updates**: Badge updates are debounced (50ms) and can be forced immediately (`forceImmediate`) to ensure zero-flicker UI updates during bulk delivery.

## 5. Android Bridge Synchronization (Signal Protocol)
Native Android flushes its `SharedPreferences` buffer into the web context via `saveNotificationFromAndroid` only when the Web App signals stability. Incoming live FCM messages are intelligently routed: if the Web view is stable, they are delivered instantly; otherwise, they wait for the next ready signal.
