# Android Native Bridge and Sync Protocol

> [!CAUTION]
> **CRITICAL SYNCHRONIZATION WARNING**
> These bridge functions are the backbone of the Hybrid architecture. Any modification, renaming, or deletion of functions that interact with `window.Android` or `window.Localization` MUST be coordinated simultaneously with the Android project (`suez-bazaar`). Fail to do so will result in broken native features and potential app instability. IF YOU CANNOT SYNC BOTH PROJECTS, STOP MODIFICATION IMMEDIATELY.

The Suez Bazaar application follows a **Hybrid Architecture**, where a native Android shell hosts a WebView for the web front-end. To ensure a seamless experience, a stable communication bridge and synchronization protocol are implemented.

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
- `saveNotificationFromAndroid(json)`: (Individual) Forwards a single incoming FCM message.
- `saveNotificationBatchFromAndroid(jsonArray)`: (Batch Sync) Delivers multiple queued notifications at once, usually triggered after `onWebAppReady`. This prevents ID collisions and ensures counter accuracy during cold starts.
- `onNativeLog(tag, msg)`: Pipes native Android Logcat messages into the web developer console (`[ANDROID]` prefix).

## 3. Global Scope Exposure (Critical)
To ensure the Android bridge can successfully "find" and call JavaScript functions, all core bridge handlers MUST be explicitly attached to the `window` object in `notification/fcm-android-bridge.js`.
- **Reasoning**: The Android `evaluateJavascript` environment often requires functions to be in the global scope, especially when called from background threads or different contexts.
- **Affected Functions**: `saveNotificationFromAndroid`, `saveNotificationBatchFromAndroid`, `shouldNotify`, etc.

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

---

## 6. Standards for New Bridge Implementations
To maintain the integrity of the Hybrid Bridge, all new functions must follow these standards:

### A. Web-to-Native Coordination
1.  **Sync-Requirement**: Never implement a bridge call (`window.Android.X`) unless the corresponding method exists in the Android Kotlin code.
2.  **Safety Checks**: Always wrap bridge calls in a check to ensure the environment is ready:
    ```javascript
    if (window.Android && typeof window.Android.newFunction === 'function') {
        window.Android.newFunction(params);
    }
    ```
3.  **JSDoc Documentation**: Every function calling the bridge must have a mandatory JSDoc warning:
    ```javascript
    /**
     * [!IMPORTANT] BRIDGE CALL: Coordinate with Android WebAppInterface.kt.
     */
    ```

### B. Protection from Obfuscation
The web build system (`build.js`) uses `javascript-obfuscator`. To ensure the bridge remains functional:
1.  **Global Scope**: Never use `let` or `const` in the global scope for bridge-related variables; use `var`.
2.  **Global Preservation**: The build script is configured with `renameGlobals: false`. Do not change this setting as it ensures `window.Android` calls remain literal and traceable.

### C. Maintenance Updates
- Any new bridge interaction must be documented in this file (`Android_Native_Bridge_and_Sync_Protocol.md`) under the relevant section.
