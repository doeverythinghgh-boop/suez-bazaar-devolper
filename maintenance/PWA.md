# Progressive Web App (PWA Architecture Report)

This report provides a precise and comprehensive explanation of how PWA technology works in the Suez Bazaar project, including caching strategies, service worker management, and offline operation.

---

## 1. Core Components

### A. Manifest File (`manifest.json`)
- **Function:** Defines the application's identity to the browser and operating system.
- **Key Settings:**
    - `display: standalone`: Ensures the application appears as an independent interface without the browser toolbar.
    - `start_url: /index.html`: The application's entry point.
    - `theme_color: #007bff`: The status bar color on phones.
    - **Icons:** Includes icons in sizes (192x192) and (512x512) with `maskable` support for compatibility with various mobile platforms.

### B. Main Service Worker (`sw.js`)
The primary engine for network and cache management. It integrates notification logic with storage logic.
- **Install:** Pre-loads static assets (Precaching).
- **Activate:** Cleans up old caches to ensure the application is updated.

### C. Notification Service Worker (`firebase-messaging-sw.js`)
Exclusively responsible for receiving Push messages via Firebase in the background, even if the application is closed.

---

## 2. Caching Strategies

The application relies on different strategies depending on the request type to achieve the best balance between speed and freshness:

| File Type                          | Strategy Followed | Behavior                                                                       |
| :--------------------------------- | :---------------- | :----------------------------------------------------------------------------- |
| **HTML Pages (Navigation)**        | **Network First** | Tries the network first, and in case of failure, opens `offline.html`.         |
| **Static Assets (CSS, JS, Fonts)** | **Cache First**   | Looks in the cache first for speed, and if not present, fetches and stores it. |
| **Images (Images)**                | **Cache First**   | Images are cached to reduce data consumption and for immediate loading.        |
| **Dynamic Data (APIs)**            | **Network Only**  | To ensure data accuracy and freshness (e.g., prices and orders).               |

---

## 3. Offline Support

1. **Fallback Page:** When connection is lost and a link is attempted, the application displays the `offline.html` page previously registered in the cache.
2. **Interface Continuity:** Thanks to caching CSS and JS files, the core application interface remains functional even without internet, displaying alerts to the user regarding connection status.
3. **Local Documentation:** `IndexedDB` (via `notification-db-manager.js`) is used to save notification logs locally, allowing the user to browse them later.

---

## 4. Notification System in PWA

- **FCM Integration:** The application uses Firebase v8, which is compatible with Service Workers.
- **Foreground Reception:** Handled in `notificationSetUp.js` to display immediate internal alerts.
- **Background Reception:** Handled in `firebase-messaging-sw.js` using `onBackgroundMessage`.
- **IndexedDB Storage:** Every incoming notification is immediately saved in the `notificationsLog` store within the `bazaarAppDB` database.

---

## 5. Registration and Update Mechanism

1. Registration begins when `DOMContentLoaded` is triggered in `js/index.js`.
2. `setupFCM()` is called, which decides whether to register for Web or Android.
3. `navigator.serviceWorker.register` is used to activate `sw.js`.
4. The application supports immediate updates via `skipWaiting()` and `clients.claim()` embedded in the Service Worker files.

---

## 6. Version Management and Auto-Update

To ensure users receive the latest version of application files (CSS, JS) and avoid old cache issues, the application relies on a forced update mechanism:

### A. Version File (`version.json`)
Contains the current version number (e.g., `1.1.10`) and the date of the last update. It is updated manually or via automation tools when a new version is uploaded.

### B. Verification Mechanism (`checkAppVersionAndClearData`)
Located in the `js/tools.js` file and works as follows:
1. **Fetching:** Calls the `version.json` file with cache prevention (`?t=timestamp`).
2. **Comparison:** Compares the fetched version with the version stored in `localStorage` (`app_version`).
3. **Forced Update:** If a new version exists, the application:
    - Clears `sessionStorage` and cookies.
    - Unregisters all **Service Workers**.
    - Clears all cache files in the browser (**Cache Storage**).
    - Saves the new version and reloads the page from the server immediately.

### C. Verification Frequency
This check is performed in two cases:
1. Upon every page load or refresh (DOMContentLoaded).
2. A periodic check every hour (1 hour) to ensure updates even if the application is open for long periods.

---

## 7. Installation & Security Standards

For the "Install App" option to appear to the user, the following criteria must be met:
- **HTTPS:** The site must run over a secure protocol (except for `localhost`).
- **Manifest:** Presence of a complete `manifest.json` file (as shown in Section 1).
- **Service Worker:** Presence of a registered SW containing a handler for `fetch` events.

## 8. Cross-Platform Handling

The application intelligently handles the two different execution environments:

### A. Android WebView Environment
- The application does not use Firebase JS libraries directly but relies on the `window.Android` interface.
- The token is requested from the native system via `window.Android.onUserLoggedIn`.
- The token is received in `localStorage` via the `waitForFcmKey` function.

### B. Web Browsers (Chrome, Safari, Edge)
- Firebase v8 libraries are loaded dynamically when needed.
- Permission is requested via `Notification.requestPermission()`.
- **VAPID** keys are used to secure the notification receiving process.

### C. Direct Notification Sending (Web P2P) [NEW]
The PWA can send notifications directly to recipients without a central server:
- **Authentication**: Uses a local copy of `suzebazaar_notifications_firebase_adminsdk.json` to generate OAuth2 Access Tokens.
- **Signing**: Uses the `jsrsasign` library (localized at `assets/libs/jsrsasign/`) for client-side JWT signing.
- **API**: Communicates directly with the `https://fcm.googleapis.com/v1/projects/suze-bazaar-notifications/messages:send` endpoint.
- **Module**: Handled by `notification-p2p-web.js`.

## 9. Troubleshooting

For developers, these steps can be followed when PWA features fail:

1. **Check Service Worker:** Via Chrome DevTools -> Application -> Service Workers. Ensure it is "Activated and Running".
2. **Check Token Logs:** Ensure `fcm_token` (for Web) or `android_fcm_key` (for Android) appears in `localStorage`.
3. **Network Errors:** If fetching `version.json` or `notification_config.json` fails due to connection issues, the application will rely on stored local copies.
4. **Programming Tips Support:** If notifications do not appear, ensure that the `notifications_enabled` status in `localStorage` is not `false`.

## 10. App Installation & Welcome Flow

The Bazaar project uses a smart system to encourage users to install the application to ensure a better user experience and notification stability.

### A. Triggering Mechanism
- The `beforeinstallprompt` event is captured and stored in the global variable `deferredPrompt`.
- Upon application load (`window.load`) and after 3 seconds, `checkAndShowInstallPrompt` is called.
- It is checked whether the user is browsing via mobile and whether the application is already installed (Standalone Mode).

### B. "Choose the Right Method for You" Window
A custom `SweetAlert2` window appears displaying two options:
1.  **Google Play**: A direct link to the Google Play Store for Android users.
2.  **App Store (PWA Style)**: An "Install App" button that uses PWA logic.

### C. Smart Installation Logic (triggerPWAInstall)
- **For Supporting Browsers**: `deferredPrompt.prompt()` is called to show the official browser installation window.
- **For iOS Users**: Since Apple does not support the automatic trigger event, an instruction window is displayed showing manual installation steps (Share button > Add to Home Screen).
- **Fallback Redirect**: If an installation request is unavailable, the user is redirected directly to the welcome page.

### D. Welcome and Benefits Page (`pages/welcome.html`)
Whether the user chooses to install from the store or via the browser, they are eventually directed to the `showWelcomeAndThanksPage` function:
- The main application header (`index-app-header`) is hidden.
- The `pages/welcome.html` page is loaded and displayed in full screen (`fixed position`).
- This page aims to introduce the user to Suez Bazaar features and thank them for joining.

---
> [!TIP]
> When testing PWA locally, it is preferred to use "Incognito" or "Guest" mode to avoid cache interference from previous sessions, and always remember to clear the cache from the "Application" tab when making radical changes to `sw.js`.
