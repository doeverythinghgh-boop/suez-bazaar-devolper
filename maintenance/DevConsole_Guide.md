# 🛠 Developer Console & Debugging Guide

This document explains how to use the built-in Developer Console and external tools to debug the Bazaar application on mobile devices and synchronize logs with a PC.

---

## 1. On-Device Developer Console (`dev-console.js`)

The application includes a specialized on-screen console for real-time mobile debugging.

### ✨ Features
1.  **Hybrid Monitoring**: Captures both **Web Logs** and **Native Android Logs** (via `LogBridge.kt`).
2.  **Mode Toggle**: Use the **Mode Button** (e.g., "Mode: All") to switch between:
    - **All**: See everything.
    - **Web**: Only `console.log` from JavaScript.
    - **Native**: Only logs from the Android Kotlin code (like `UpdateManager`).
3.  **Search & Filter**: Find specific errors or messages.
4.  **One-Click Copy**: Copy filtered logs to clipboard.
5.  **Hard Reset FCM**: Use the **"🔥 Reset FCM"** button to instantly clear Service Worker registrations, caches, and FCM tokens to solve persistent registration errors.

---

## 2. PC Synchronization & Advanced Tools

### A. Chrome Remote Debugging (Full Inspection)
1.  **Connect Device**: Connect phone via USB with Debugging enabled.
2.  **Inspect**: Open Chrome and navigate to `chrome://inspect/#devices`.
3.  **Result**: Full access to Network, Storage, and Elements.
    - **Note**: Native Android logs now appear directly in this console with the prefix `[Android]`.

### B. Android Native Logs (Logcat)
If you need to see **Native Android Logs** (e.g., from `UpdateManager` or Firebase services):
1.  Ensure you have **Android Studio** or **ADB** installed on your PC.
2.  Open the terminal on your PC and run:
    ```bash
    adb logcat -s "LogBridge" "UpdateManager" "FCM" "WebViewManager" "WebAppInterface"
    ```
3.  This will pipe the native Android logs directly to your PC screen in real-time.
    - **Note**: These same logs are automatically piped to the on-device Dev Console with the `[ANDROID]` prefix.

---

## 3. Maintenance & Updates
- If you add new bridge functions, ensure you add `console.log` statements so they appear in the dev console.
- The dev console script is located at: `js/dev-console.js`.
- It is linked in `index.html` before the main application logic.

---

> [!TIP]
> Use the **Search** feature in the dev console to filter by `[VersionCheck]` to see exactly how the silent update mechanism is behaving on the device.
