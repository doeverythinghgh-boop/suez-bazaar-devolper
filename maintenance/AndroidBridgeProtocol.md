> [!NOTE]
> This file is the technical guide dedicated to explaining the communication bridges (JavaScript Interface) between the native Android application and the website, ensuring the integration of functions such as notifications, language, and user experience in a synchronized manner.

# Android Interface Bridge Protocol Documentation

The "Bazaar" application relies on a JavaScript Interface to link the web environment (`WebView`) and the native Android system. Android functions are accessed via the global `window.Android` object and the `window.Localization` object.

---

## 🏗 System Architecture & File Serving

Before diving into the bridge functions, it is crucial to understand how the Android app serves the web content:

1.  **Asset Mapping**: The app uses `WebViewAssetLoader` to map the custom URL `https://appassets.androidplatform.net/` to the device's internal storage (`/data/user/0/.../files/site`).
    *   **Implication**: The web app runs in a secure, local context, not as a `file://` URL.
2.  **Silent Update Mechanism**:
    *   The Android app has a "Silent Smart Update" system.
    *   It fetches `version.json` from the remote repository.
    *   It performs a **Granular Hash Comparison** between the local files and the remote files.
    *   **Crucial for Web Devs**: Only files with *changed* hashes are downloaded. If you update the code but not the hash in `version.json` (or vice versa), the update mechanism might fail or behave unpredictably.
    *   **Encoding**: The system handles URL decoding for Arabic filenames.

---

## 🔗 1. Web to Native (Input)
These functions are called from within the JavaScript code to affect the Android application.

### Quick Function Table
| Function                        | Object  | Parameters                    | Purpose                                                 | Call Location in Web       |
| :------------------------------ | :------ | :---------------------------- | :------------------------------------------------------ | :------------------------- |
| `onUserLoggedIn`                | Android | `userKey`                     | Inform Android of login to start FCM Token generation.  | `notificationSetUp.js`     |
| `onUserLoggedOut`               | Android | `userKey`                     | Inform Android of logout to clear tokens/subscriptions. | `notificationTools.js`     |
| `requestNotificationPermission` | Android | -                             | Request notification permission from Android (13+).     | `notificationTools.js`     |
| `onNotificationsEnabled`        | Android | -                             | Inform Android of manual notification enablement.       | `notifications-actions.js` |
| `onNotificationsDisabled`       | Android | -                             | Inform Android of manual notification disablement.      | `notifications-actions.js` |
| `onLanguageChanged`             | Android | `lang` ('ar'/'en')            | Sync native app language with web language.             | `index.js`                 |
| `checkForUpdates`               | Android | -                             | Request check for **SILENT** smart app updates.         | `index.js`                 |
| `sendNotificationsToTokensP2P`  | Android | `tokensJson`, `title`, `body` | Send direct push notification from the device (Admin).  | `notificationTools.js`     |
| `getString`                     | Local.. | `key`                         | Get a localized string from the native Android bundles. | N/A                        |

### Function Details

#### `onUserLoggedIn(userKey)`
- **Purpose**: Inform the Android app that the user has successfully logged in.
- **Native Behavior**:
    1.  Saves `userKey` in SharedPreferences.
    2.  Triggers Firebase Cloud Messaging (FCM) to generate a new token.
    3.  Injects this token into `localStorage` as `android_fcm_key` for the web to pick up.
- **Call**: Automatically in `setupFirebaseAndroid` within `notificationSetUp.js`.

#### `onUserLoggedOut(userKey)`
- **Purpose**: Inform the app of the logout.
- **Native Behavior**: Clears session data, removes `android_fcm_key`, and unsubscribes from FCM topics.
- **Call**: In the `onUserLoggedOutAndroid` function within `notificationTools.js`.

#### `requestNotificationPermission()`
- **Purpose**: Request notification permission specifically for Android 13+.
- **Native Behavior**: Triggers `PermissionManager` to show the standard OS dialog.
- **Call**: `askForNotificationPermission` function in `notificationTools.js`.

#### `checkForUpdates()`
- **Purpose**: Triggers the internal **Silent Smart Update Mechanism**.
- **Native Behavior**:
    1.  Fetches remote `version.json` using a timestamp cache-buster (`?v=...`) to ensure freshness from GitHub.
    2.  Compares `remoteHash` vs `localHash` for every file.
    3.  Downloads *only* changed files to internal storage.
    4.  Updates `local_manifest_json` upon success.
- **Note**: This process is invisible to the user (no UI) unless errors occur.

#### `sendNotificationsToTokensP2P(tokensJson, title, body)`
- **Purpose**: Send direct push notifications from the device (likely for Admin panels).
- **Native Behavior**: Uses bundled Firebase Admin SDK credentials to send a message via FCM v1 API.

#### `onLanguageChanged(lang)`
- **Available on**: Both `window.Android` and `window.Localization`.
- **Purpose**: Syncs the generic "Preparing..." and "Loading..." screens of the Android app to the selected language.
- **Native Behavior**: Updates `LocalizationManager` and persists preference to `SharedPreferences`.

---

## 📡 2. Native to Web (Output)
These functions are called from the Android code (Java/Kotlin) to interact with the web interface.

### `saveNotificationFromAndroid(notificationJson)`
- **Trigger**: Real-time arrival of an FCM message while the app is in the foreground.
- **Native Logic**: `MainActivity` intercepts the `LocalBroadcast` and calls this JS function.
- **Web Logic**: Parses JSON and saves to IndexedDB via `notificationTools.js`.

### `showNotificationsModal()`
- **Trigger**: User clicks a system notification in the status bar.
- **Native Logic**: `NotificationHandler` waits for the page to load, then calls this function.
- **Web Logic**: Opens the notification UI overlay.

---

## 🔄 3. FCM Lifecycle (Full Loop)
This is typically how the token exchange happens between web and native:
1.  **Web**: User opens the app -> Checks for `android_fcm_key` in `localStorage`.
2.  **Web**: If missing, calls `window.Android.onUserLoggedIn(userKey)`.
3.  **Native**: Generates FCM token -> Writes it to `localStorage.setItem('android_fcm_key', token)`.
4.  **Web**: Loops/Waits for the key to appear (via `waitForFcmKey` in `notificationSetUp.js`).
5.  **Web**: Once received, sends the token to the server (`/api/tokens`) to register the device.

---

## 🌍 4. Geolocation & Permissions
The Android app includes a `GeolocationHandler` that intercepts web geolocation requests:
- When the web calls `navigator.geolocation.getCurrentPosition`.
- The native app intercepts this and checks for `ACCESS_FINE_LOCATION` Android permission.
- It shows the system permission prompt if needed, then relays the GPS data back to the web.

---

## 🎨 5. CSS & UI Adjustments in Android
When `window.Android` is detected, the web app should:
1.  **Hide PWA Install**: The user is already in the native app.
2.  **Mute Web Sounds**: The Android `MyFirebaseMessagingService` generates custom PCM 3-pulse beeps natively; web sounds should be disabled to avoid echo.
3.  **External Links**: Links should be handled carefully; the native `WebViewManager` intercepts non-http schemes (mailto, tel) but standard links might open inside the view unless `target="_blank"` forces an external browser intent in some configurations.

---

## 🛡 6. Code Safety (ProGuard/R8)
**Critical for Developers**: The bridge relies on methods annotated with `@JavascriptInterface`.
If you add *new* methods to the bridge in `WebAppInterface.kt`, you MUST ensure they are preserved in `proguard-rules.pro`, otherwise, the release build will strip them, causing the bridge to fail silently.

---

## 💾 7. Shared Storage Keys (LocalStorage)
The Android app reads/writes these specific keys:
- `android_fcm_key`: Written by Android (Token), Read by Web.
- `notifications_enabled`: Read by Android to sync state.
- `app_language`: Read by Android.
- `theme`: Read by Android.

---

## 💡 8. Technical Notes & Debugging
- **Interface Check**: Always check for availability before calling:
  ```javascript
  if (window.Android && typeof window.Android.functionName === 'function') {
      window.Android.functionName();
  }
  ```
- **Logcat Filters**:
  To see logs from the native side in Android Studio Logcat, filter for:
  - `[FCM Android]`: Notification flow.
  - `[Dev]`: General development logs (updates, file copy).
