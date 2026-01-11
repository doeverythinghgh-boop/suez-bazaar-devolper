# Developer Tools Console and Debugging Guide

Bazaar provides professional-grade debugging tools integrated directly into the application to facilitate troubleshooting on physical devices.

## 1. On-Device Developer Console (`dev-console.js`)
Accessible via a hidden gesture or button, the integrated console provides:
- **Hybrid Logging**: Simultaneous monitoring of Web (JS) and Native (Android) events.
- **Filtered Modes**: Switch between "All", "Web only", or "Native only" logs.
- **Reset FCM**: A "nuclear option" button that triggers `window.resetFCM()`, wiping all notification tokens and forcing a fresh registration.
- **Clipboard Management**: One-click copying of session logs for easy sharing with the development team.

## 2. Universal Logging Bridge
Common tags to look for in logs:
- `[ANDROID]`: Messages originating from the native Android shell.
- `[VERSIONCHECK]`: Details regarding silent updates and hash comparisons.
- `[FCM]`: Registration status, token acquisition, and message delivery logs.
- `[ROUTING]`: Logs from the `LOADER_REGISTRY` regarding container transitions.

## 3. Remote PC Synchronization
For advanced debugging, developers should use:
- **Chrome Remote Inspect**: Connect a device via USB and go to `chrome://inspect/#devices`. This provides the full Chrome DevTools experience (Network tab, DOM inspector, Console) for the on-device WebView.
- **Android Logcat**: Use `adb logcat -s "LogBridge"` to see prioritized native logs that bypass the web console.

## 4. Debugging Scenarios
- **Notification Failure**: Check for the `notifications_enabled` value in `localStorage` and ensure the `fcm_token` exists.
- **Update Issues**: Monitor the Console for `[VersionMismatch]` logs during startup to see which specific file failed the hash verification.
- **Bridge Failure**: If `window.Android` is undefined, verify that the `@JavascriptInterface` ProGuard rules were applied during the last native build.

## 5. Testing Best Practices
- **PWA Testing**: Use Incognito or Guest mode to avoid cache pollution.
- **Production Debugging**: Emulate the `dist` environment locally using a simple HTTP server (e.g., `npx serve dist`) to verify that obfuscation didn't break any global references.
