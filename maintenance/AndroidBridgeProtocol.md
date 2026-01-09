> [!NOTE]
> This file is the technical guide dedicated to explaining the communication bridges (JavaScript Interface) between the native Android application and the website, ensuring the integration of functions such as notifications, language, and user experience in a synchronized manner.

# Android Interface Bridge Protocol Documentation

The "Bazaar" application relies on a JavaScript Interface to link the web environment (WebView) and the native Android system. Android functions are accessed via the global `window.Android` object and the `window.Localization` object.

---

## 🔗 1. Web to Native
These functions are called from within the JavaScript code to affect the Android application.

### Quick Function Table
| Function                        | Parameters                    | Purpose                                                 | Call Location in Web       |
| :------------------------------ | :---------------------------- | :------------------------------------------------------ | :------------------------- |
| `onUserLoggedIn`                | `userKey`                     | Inform Android of login to start FCM Token generation.  | `notificationSetUp.js`     |
| `onUserLoggedOut`               | `userKey`                     | Inform Android of logout to clear tokens/subscriptions. | `notificationTools.js`     |
| `requestNotificationPermission` | -                             | Request notification permission from Android (13+).     | `notificationTools.js`     |
| `onNotificationsEnabled`        | -                             | Inform Android of manual notification enablement.       | `notifications-actions.js` |
| `onNotificationsDisabled`       | -                             | Inform Android of manual notification disablement.      | `notifications-actions.js` |
| `onLanguageChanged`             | `lang` ('ar'/'en')            | Sync native app language with web language.             | `index.js`                 |
| `checkForUpdates`               | -                             | Request check for **SILENT** smart app updates.         | `index.js`                 |
| `sendNotificationsToTokensP2P`  | `tokensJson`, `title`, `body` | Send direct push notification from the device.          | `notificationTools.js`     |

### Function Details
#### `onUserLoggedIn(userKey)`
- **Purpose**: Inform the Android app that the user has successfully logged in.
- **Effect**: The app starts the Firebase Cloud Messaging (FCM) token generation and storage process.
- **Call**: Automatically in `setupFirebaseAndroid` within `notificationSetUp.js`.

#### `onUserLoggedOut(userKey)`
- **Purpose**: Inform the app of the logout.
- **Effect**: The app clears session data and stops receiving notifications associated with this user.
- **Call**: In the `onUserLoggedOutAndroid` function within `notificationTools.js`.

#### `requestNotificationPermission()`
- **Purpose**: Request notification permission from the Android system (especially for versions 13 and above).
- **Call**: `askForNotificationPermission` function in `notificationTools.js`.

#### `checkForUpdates()`
- **Purpose**: Triggers the internal **Silent Smart Update Mechanism**.
- **Behavior**: The app checks GitHub for updates. If found, it downloads them immediately in the background without any UI dialogs or user interruption.
- **Developer Tracking**: Progress is logged in Android Studio Logcat with the prefix `[Dev]`.
- **Note**: This is independent of the Google Play Store update process.

#### `sendNotificationsToTokensP2P(tokensJson, title, body)`
- **Purpose**: Send direct push notifications from the device without going through the server in certain cases.
- **Parameters**: 
  - `tokensJson`: Array of tokens in JSON String format.
  - `title`: Notification title.
  - `body`: Notification body text.
- **Call**: `sendNotificationsToTokens` function in `notificationTools.js`.

#### `onLanguageChanged(lang)`
- **Available on**: Both `window.Android` and `window.Localization`.
- **Purpose**: Inform the Android app of a language change to update its interfaces and store the preference locally.
- **Parameters**: `lang` (String): The new language code (`'ar'` or `'en'`).
- **Call**: Automatically called when the language is changed in the `toggleAppLanguage` function within `index.js`.

---

## 📡 2. Native to Web
These functions are called from the Android code (Java/Kotlin) to interact with the web interface.

### `saveNotificationFromAndroid(notificationJson)`
- **Purpose**: Receive notification data that reached the device and save it in the browser's local log.
- **Parameters**: A JSON string containing the message data.
- **Location**: Defined globally in `notificationTools.js`.
- **Logic**: Parses the JSON and calls `addNotificationLog` to save it in IndexedDB.

### `showNotificationsModal()`
- **Purpose**: Open the notifications screen directly within the web application.
- **Usage**: Usually called when the user clicks a notification in the Android notification bar to open the appropriate interface.

---

## 🛠 3. FCM Lifecycle in Android
1. User opens the app -> Check for `android_fcm_key` in `localStorage`.
2. If it doesn't exist -> `window.Android.onUserLoggedIn` is called.
3. Android app generates the token -> Injects it into the browser's `localStorage`.
4. Web waits for the token via the `waitForFcmKey` function in `notificationSetUp.js`.
5. Once received, it is sent to the server via `sendTokenToServer` to link it to the user account.

---

## 💾 4. Shared Storage Keys
The Android developer must handle these keys in `localStorage`:

- `android_fcm_key`: The token placed by Android for the web to read.
- `notifications_enabled`: ('true'/'false') Current notification status.
- `app_language`: ('ar'/'en') Selected language.
- `theme`: ('dark'/'light') Selected theme.

---

## 🎨 5. UI Adjustments in Android Environment
When `window.Android` is detected (native app environment), the web performs:
1. **Hide PWA Install**: Prevent web app installation prompts (since the user is already in the native app).
2. **Mute Sound**: Disable `playNotificationSound()` in the web because Android handles sound and vibration natively.
3. **Link Adjustments**: Open external links in the default browser instead of the WebView.

---

## 🛡 6. Code Safety & Integrity (ProGuard/R8)
To ensure the communication bridge remains functional in the production release (signed APK), the project implements strict ProGuard/R8 rules.

### Why is this necessary?
During the build process, Android Studio uses R8 to minify and obfuscate the code. Without protection, R8 might:
1.  **Remove** methods that appear "unused" (since they are called from JavaScript, not from native Kotlin code).
2.  **Rename** classes and methods, making it impossible for JavaScript to find them.

### Protection Rules
The following rules in `app/proguard-rules.pro` protect the integrity of the bridge:
- **`@JavascriptInterface` protection**: Every method with this annotation is kept and not renamed.
- **Class Protection**: Classes like `WebAppInterface` and `LocalizationManager` are explicitly preserved to maintain their identity during the build.

---

## 💡 Technical Notes for Developers
- **Interface Objects**: The app registers two main interfaces:
    - `window.Android`: General system functions.
    - `window.Localization`: Specifically for language synchronization.
- **Interface Check**: Always check for the interface's existence before calling:
  ```javascript
  if (window.Android && typeof window.Android.functionName === 'function') {
      // Call Android
  }
  ```
- **Compatibility**: These functions depend on defining `WebView.addJavascriptInterface` in the Android code.
- **Debugging**: Debugging messages appear in the Android Logcat with the prefix `[FCM Android]` or `[Dev]`.
