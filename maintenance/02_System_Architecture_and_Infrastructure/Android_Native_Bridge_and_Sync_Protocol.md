# Android Native Bridge and Sync Protocol

Bazaar utilizes a dedicated bridge to communicate with the native Android application, providing features beyond standard web capabilities.

## 1. The Javascript Interface (`window.Android`)
The native app injects the `Android` object into the web context, enabling two-way communication.

### Web to Native Directives:
- `onUserLoggedIn(token)`: Passes the FCM token to the native system.
- `checkForUpdates()`: Triggers the native update manager.
- `requestNotificationPermission()`: Launches system-level permission dialogs.
- `onLanguageChanged(lang)`: Syncs the application language with `androidLang.json`.
- `onWebAppReady()`: Signal from Web indicating full stability, triggering immediate delivery of pending notifications.

## 2. The Localization Interface (`window.Localization`)
Used for maintaining high-quality native UI translations and system slogas.
- `getString(key)`: Fetches a string from the native merging engine.
- `updateSplashSlogans(json)`: (Signal-based) Web pushes the latest taglines and slogans to native storage. This ensures the native splash screen stays updated with the web's branding on every launch.

### Native to Web Callbacks:
- `saveNotificationFromAndroid(data)`: Forwards incoming FCM messages to the web context. If the WebView isn't ready, the native app stores them in `SharedPreferences` and flushes them upon `onPageFinished`.
- `onNativeLog(tag, msg)`: Pipes native Android Logcat messages into the web developer console (`[ANDROID]` prefix).

## 2. Silent Update Mechanism
- **Asset Loader**: Uses `WebViewAssetLoader` for high-speed local asset delivery.
- **Version Control**: Relies on `version.json` for granular hash comparison.
- **Conflict Prevention**: Uses a silent sync strategy that avoids blocking the user while updating background assets or translation files.

## 3. FCM Lifecycle in Android (Signal-based)
1. Web requests FCM key via bridge.
2. Native fetches/refreshes FCM token.
3. Native calls `window.onAndroidFcmReceived(token)` to push the token directly to the Web promise.
4. If Web isn't ready, Native falls back to injecting into `localStorage` under `android_fcm_key` as a recovery mechanism.
5. Web uses this key for all subsequent server-side targeting.

## 4. Device Adjustments
- **Geolocation**: Native Android intercepts `navigator.geolocation` requests for accuracy.
- **Links**: External links are forced into the system browser to prevent exiting the main app shell.
- **PWA UI**: Custom CSS hides "Install App" prompts when the app detects it's running inside the native WebView.

## 5. Security & Stability
- **ProGuard Rules**: Critical `@JavascriptInterface` methods are protected from obfuscation to maintain bridge naming integrity.
- **LogBridge**: A unified logging system that allows remote debugging of on-device native events via Chrome Remote Inspect.
