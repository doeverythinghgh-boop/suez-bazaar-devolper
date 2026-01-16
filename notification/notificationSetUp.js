/**
 * @file notification/notificationSetUp.js
 * @description Main entry point for Firebase Cloud Messaging (FCM) initialization.
 * Handles environment detection (Web vs. Android) and executes appropriate setup flows,
 * including Service Worker registration, permission requests, and server-side token synchronization.
 */

// ===============================
//   Global State & Locks
// ===============================
var isSettingUpFCM = false;
var isServiceWorkerUsed = false;

/**
 * @description Checks connectivity to core Google services.
 */
async function checkGoogleConnectivity() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch('https://www.gstatic.com/generate_204', {
            mode: 'no-cors',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return true;
    } catch (e) {
        console.error("[Dev] 🌏 [Web FCM] ❌ Failed to connect to gstatic.com - access might be blocked.");
        return false;
    }
}

/**
 * @description Comprehensive cleanup utility for FCM (Hard Reset).
 */
window.resetFCM = async function () {
    console.log("%c[FCM Tool] 🧹 Starting comprehensive cleanup (Hard Reset)...", "color: #ff9800; font-weight: bold;");
    try {
        // 1. Clear tokens
        localStorage.removeItem("fcm_token");
        localStorage.removeItem("notifications_enabled");
        sessionStorage.removeItem("fcm_token_setup_done");

        // 2. Unregister Service Workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                await registration.unregister();
                console.log("[FCM Tool] Unregistered: ", registration.scope);
            }
        }

        // 3. Clear cache
        if ('caches' in window) {
            const keys = await caches.keys();
            for (let key of keys) {
                await caches.delete(key);
                console.log("[FCM Tool] Deleted cache: ", key);
            }
        }

        alert("Cleanup successful. The page will reload now.");
        window.location.reload();
    } catch (e) {
        console.error("[FCM Tool] Error during cleanup:", e);
    }
};

// ===============================
//   FCM - Main Entry Point
// ===============================

/**
 * @description Main FCM initialization function.
 * Validates user session, detects platform (Android vs Web), and delegates setup to appropriate handlers.
 * @function setupFCM
 * @async
 * @returns {Promise<void>}
 * @throws {Error} - If `setupFirebaseAndroid` or `setupFirebaseWeb` encounters a critical error.
 * @see setupFirebaseAndroid
 * @see setupFirebaseWeb
 * @see userSession
 */
async function setupFCM() {
    if (isSettingUpFCM) {
        console.log('[Dev] 📡 [FCM] Setup is already in progress. Skipping...');
        return;
    }
    isSettingUpFCM = true;

    console.log('[Dev] 📡 [FCM] Starting notification system setup (setupFCM)...');

    const MAX_RETRIES = 3;
    let attempt = 0;
    let success = false;

    while (attempt < MAX_RETRIES && !success) {
        attempt++;
        try {
            // Validate user session
            if (!userSession || !userSession.user_key) {
                console.warn("[FCM] No logged-in user found — aborting operation.");
                break; // No point in retrying if no user
            }
            const currentUserId = userSession.user_key;
            console.log(`[Dev] 📡 [FCM] Attempt #${attempt}: User identified (user_key: ${currentUserId}).`);

            // Check if this is a fresh setup after version change
            const lastVersionCheck = localStorage.getItem('last_version_check_time');
            if (lastVersionCheck) {
                const timeSinceCheck = Date.now() - parseInt(lastVersionCheck);
                if (timeSinceCheck < 10000) { // Within 10 seconds of version check/reload
                    console.log('%c[FCM] 🔄 Version update or recent reload detected - re-initializing FCM',
                        'color: #ff9800; font-weight: bold;');
                }
            }

            // Priority: Android setup
            if (window.Android && typeof window.Android.onUserLoggedIn === "function") {
                console.log('[Dev] 📡 [FCM] Android environment (WebView) detected.');
                await setupFirebaseAndroid(currentUserId);
                success = true;
            } else {
                console.log('[Dev] 📡 [FCM] Web environment (Browser) detected.');
                await setupFirebaseWeb(currentUserId);
                // setupFirebaseWeb should throw if it fails critically to trigger retry
                success = true;
            }

            if (success) {
                sessionStorage.setItem("fcm_token_setup_done", "1");
                console.log(`[Dev] 📡 [FCM] ✅ setupFCM completed successfully on attempt #${attempt}.`);
            }
        } catch (error) {
            console.error(`[FCM] ❌ Failure on attempt #${attempt}:`, error);
            if (attempt < MAX_RETRIES) {
                const delay = attempt * 3000; // 3s, 6s...
                console.log(`[FCM] ⏳ Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error("[FCM] 💥 Exhausted all attempts. Notification initialization failed.");
            }
        }
    }
    isSettingUpFCM = false;
}



// ===============================
//   1) Service Worker Registrar
// ===============================

/**
 * @description Registers the Firebase Messaging Service Worker.
 * Checks for browser support and handles HTTP/HTTPS warnings.
 * @function registerServiceWorker
 * @async
 * @returns {Promise<ServiceWorkerRegistration|boolean>} - Registration object on success, or `false` on failure.
 */
async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
    }

    // تحذير عند العمل بدون HTTPS
    const isLocalhost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (location.protocol !== "https:" && !isLocalhost) {
        console.warn("[FCM] تنبيه: الموقع يعمل عبر HTTP. قد يفشل تسجيل Service Worker إلا إذا تم تكوين المتصفح للسماح بذلك.");
        // لن نوقف التنفيذ هنا، سنترك المتصفح يقرر ما إذا كان سيقبل التسجيل أم لا
    }

    try {
        console.log("%c[SW] 🚀 Step 1: Starting Service Worker registration...", "color: #2196F3; font-weight: bold;");
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        console.log("%c[SW] ✅ Step 2: sw.js registration request sent successfully.", "color: #4CAF50;");

        // Wait for Service Worker to be fully ready
        console.log("%c[SW] ⏳ Step 3: Waiting for Service Worker readiness...", "color: #FF9800;");
        const registration = await navigator.serviceWorker.ready;

        // Ensure an active service worker exists
        if (!registration.active) {
            console.log("%c[SW] ⏳ Step 4: Service worker not currently active, waiting programmatically...", "color: #FF9800;");
            await new Promise((resolve) => {
                const onStateChange = () => {
                    if (registration.active) {
                        resolve();
                    }
                };
                if (registration.installing) {
                    registration.installing.addEventListener('statechange', onStateChange);
                } else if (registration.waiting) {
                    registration.waiting.addEventListener('statechange', onStateChange);
                } else {
                    resolve();
                }
            });
        }

        console.log(`%c[SW] 🎉 Step 5: Service Worker is fully ready and active (Status: ${registration.active ? "Active" : "Unknown"}).`, "color: #4CAF50; font-weight: bold;");
        return registration;
    } catch (err) {
        console.error("%c[SW] ❌ Failed to register or prepare service worker:", "color: #f44336; font-weight: bold;", err);
        return false;
    }
}



// ===============================
//   2) FCM for Android WebView
// ===============================

/**
 * @description Initializes FCM specifically for Android (WebView).
 * Communicates with the Native Android Interface to request a token, waits for it, then syncs it to the server.
 * @function setupFirebaseAndroid
 * @async
 * @returns {Promise<void>}
 * @param {string} userId - The unique identifier of the user.
 * @throws {Error} - If `waitForFcmKey` or `sendTokenToServer` encounters an error.
 * @see waitForFcmKey
 * @see sendTokenToServer
 * @see userSession
 */
async function setupFirebaseAndroid(userId) {
    console.log("[Dev] 📱 [Android FCM] Starting Android FCM initialization...");

    const existingToken = localStorage.getItem("android_fcm_key");

    if (!existingToken) {
        console.log("[Dev] 📱 [Android FCM] Step 1: No locally saved token found.");
        console.log("[Dev] 📱 [Android FCM] Step 2: Requesting token from system via window.Android.onUserLoggedIn...");

        // Request token from WebView
        try {
            // [!IMPORTANT] BRIDGE CALL: Coordinate with Android's WebAppInterface.onUserLoggedIn.
            console.log(`[Dev] 📱 [Android FCM] Calling window.Android.onUserLoggedIn for user: ${userId}`);
            window.Android.onUserLoggedIn(userId);
        } catch (e) {
            console.error("[Android FCM] Error calling onUserLoggedIn:", e);
        }

        // Wait for token storage from the system
        console.log("[Dev] 📱 [Android FCM] Step 3: Waiting for FCM token from Android app (waitForFcmKey)...");
        await waitForFcmKey(async (newToken) => {
            console.log("[Dev] 📱 [Android FCM] Step 4: Token received from system successfully.");
            console.log("[Dev] 📱 [Android FCM] Step 5: Syncing new token with server...");
            await sendTokenToServer(userId, newToken, "android");
            // Auto-enable notifications in UI upon first success
            console.log("[Dev] 📱 [Android FCM] Step 6: Token received and synced. Enabling notifications in UI.");
            localStorage.setItem('notifications_enabled', 'true');
        }, 10000); // timeout

    } else {
        console.log("[Current State] 📱 [Android FCM] Token already exists locally (Session Active).");
        console.log("[FCM Bridge] 📱 [Android FCM] Token: ", existingToken.substring(0, 10) + "...");
        // ✅ Addition: Ensure notifications are enabled in UI if token exists (useful on re-login)
        console.log("[FCM Bridge] 📱 [Android FCM] Syncing state: Notifications enabled.");
        localStorage.setItem('notifications_enabled', 'true');
    }
}



// ===============================
//   3) FCM for Web Browsers
// ===============================

/**
 * @description Initializes FCM for Web environment (Browsers).
 * Steps: Service Worker registration, Firebase library import, App initialization,
 * Permission request, Token retrieval, and server synchronization.
 * @function setupFirebaseWeb
 * @async
 * @returns {Promise<void>}
 * @param {string} userId - The unique identifier of the user.
 * @throws {Error} - If Firebase libraries fail to load, permissions are denied, or token operations fail.
 * @see registerServiceWorker
 * @see addNotificationLog
 * @see sendTokenToServer
 * @see userSession
 */
async function setupFirebaseWeb(userId) {
    console.log("[Dev] 🌏 [Web FCM] Starting Web FCM initialization...");

    try {
        const isSecureContext = window.isSecureContext;
        console.log("[Dev] 🌏 [Web FCM] 🔍 Starting diagnostic check: ", {
            online: navigator.onLine,
            protocol: location.protocol,
            ua: navigator.userAgent,
            secureContext: isSecureContext,
            hostname: location.hostname
        });

        if (!isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
            console.error("[Dev] 🌏 [Web FCM] ❌ Security Alert: Browser does not consider this environment secure (Insecure Context). FCM will only work on HTTPS or localhost.");
        }

        // Check Google access
        const googleAccess = await checkGoogleConnectivity();
        if (!googleAccess) {
            console.warn("[Dev] 🌏 [Web FCM] ⚠️ Alert: Cannot reach Google services. getToken might fail.");
        }

        // SW Registration
        console.log("%c[Web FCM] 🏗️ Step 1: Registering Service Worker...", "color: #9c27b0; font-weight: bold;");
        const swReg = await registerServiceWorker();
        if (!swReg) {
            const errorMsg = "[Web FCM] ❌ Service Worker registration failed - cannot proceed.";
            console.error(`%c${errorMsg}`, "color: #f44336; font-weight: bold;");
            throw new Error(errorMsg);
        }
        console.log("%c[Web FCM] ✅ Registration successful.", "color: #4CAF50;");

        // Dynamic Firebase Import
        if (!window.firebase) {
            console.log("%c[Web FCM] 🏗️ Step 2: Loading external Firebase libraries (Core & Messaging)...", "color: #9c27b0; font-weight: bold;");
            await import("../assets/libs/firebase/firebase-app-8.10.1.js");
            console.log("%c[Web FCM] - firebase-app loaded.", "color: #795548;");
            await import("../assets/libs/firebase/firebase-messaging-8.10.1.js");
            console.log("%c[Web FCM] - firebase-messaging loaded.", "color: #795548;");
        }

        const firebase = window.firebase;
        if (!firebase) {
            const errorMsg = "[Web FCM] ❌ Failed to load Firebase library after attempt.";
            console.error(`%c${errorMsg}`, "color: #f44336; font-weight: bold;");
            throw new Error(errorMsg);
        }
        console.log("%c[Web FCM] ✅ Firebase object ready in window.", "color: #4CAF50;");

        // Firebase Configuration
        console.log("%c[Web FCM] 🏗️ Step 3: Initializing Firebase App with custom settings...", "color: #9c27b0; font-weight: bold;");
        const firebaseConfig = {
            apiKey: "AIzaSyClapclT8_4UlPvM026gmZbYCiXaiBDUYk",
            authDomain: "suze-bazaar-notifications.firebaseapp.com",
            projectId: "suze-bazaar-notifications",
            storageBucket: "suze-bazaar-notifications.firebasestorage.app",
            messagingSenderId: "983537000435",
            appId: "1:983537000435:web:92c2729c9aaf872764bc86",
            measurementId: "G-P8FMC3KR7M",
        };

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("%c[Web FCM] ✅ Firebase App created (Initializing Done).", "color: #4CAF50;");
        } else {
            console.log("[Web FCM] Firebase app already active, using existing instance.");
        }
        const messaging = firebase.messaging();

        // Link Service Worker to Messaging (Required in v8)
        console.log("%c[Web FCM] 🏗️ Step 4: Linking Service Worker to Messaging object...", "color: #2196F3; font-weight: bold;");
        try {
            messaging.useServiceWorker(swReg);
            isServiceWorkerUsed = true;
            console.log("%c[Web FCM] ✅ Connection Established.", "color: #4CAF50;");
        } catch (linkErr) {
            console.warn("[Web FCM] ⚠️ Link warning (might already be linked):", linkErr.message);
        }

        // 5. Check Permission Status
        let currentPermission = Notification.permission;
        console.log(`%c[Web FCM] 🔍 Step 6: Checking current permission state (Notification.permission): ${currentPermission}`, "color: #ffc107; font-weight: bold;");

        if (currentPermission === "denied") {
            const errorMsg = "[Web FCM] 🛑 Permission previously denied from browser/system settings.";
            console.error(`%c${errorMsg}`, "color: #f44336; font-weight: bold;");

            // Show guide alert to user (only in web browser context)
            if (typeof Swal !== 'undefined' && !window.Android) {
                Swal.fire({
                    title: 'Notifications Disabled',
                    html: `You have disabled notifications for this app in your system settings.<br>To receive alerts, please enable them from <b>Browser Settings</b> or <b>Device Settings</b> and restart.`,
                    icon: 'warning',
                    confirmButtonText: 'OK'
                });
            }
            return;
        }

        if (currentPermission === "default") {
            console.warn("%c[Web FCM] ⚠️ Permissions are in 'default' state. Skipping automatic request to prevent block on iOS/Safari.", "color: #ff9800;");
            console.log("%c[Web FCM] 💡 User must manually enable notifications from Settings page (User Gesture Required).", "color: #03a9f4;");
            return;
        }

        // If we reached here, permission is 'granted'
        console.log("%c[Web FCM] ✅ Step 6: Permission granted. Proceeding to fetch token.", "color: #4CAF50;");


        // Fetch FCM token (without blind waiting)
        console.log("%c[Web FCM] 🏗️ Step 7: Fetching unique token from Google FCM servers...", "color: #9c27b0; font-weight: bold;");

        const VAPID_KEY = "BK1_lxS32198GdKm0Gf89yk1eEGcKvKLu9bn1sg9DhO8_eUUhRCAW5tjynKGRq4igNhvdSaR0-eL74V3ACl3AIY";

        try {
            console.log("%c[Web FCM] - Calling messaging.getToken...", "color: #795548;");
            const currentToken = await messaging.getToken({
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swReg
            });

            if (currentToken) {
                console.log(`%c[Web FCM] ✅ Step 8: Token received successfully: ${currentToken.substring(0, 15)}...`, "color: #4CAF50; font-weight: bold;");
                const savedToken = localStorage.getItem("fcm_token");

                if (savedToken !== currentToken) {
                    console.log("%c[Web FCM] 🔄 Step 9: Token is new/different, updating locally...", "color: #2196F3; font-weight: bold;");
                    localStorage.setItem("fcm_token", currentToken);
                } else {
                    console.log("[Web FCM] Token matches existing value - no local update needed.");
                }

                // Sync token with server
                console.log("%c[Web FCM] 🏗️ Step 10: Syncing token with database via server...", "color: #9c27b0; font-weight: bold;");
                if (userId) {
                    await sendTokenToServer(userId, currentToken, "web");
                    localStorage.setItem('notifications_enabled', 'true');
                    console.log("%c[Web FCM] ✅ Server sync confirmed.", "color: #4CAF50;");
                } else {
                    console.warn("[Web FCM] ⚠️ Sync halted: userId unavailable.");
                }

                // [NEW] Step 8: Listen for foreground messages
                // Ensures message is received and saved to DB even if app is open
                messaging.onMessage((payload) => {
                    console.log('%c[FCM Web] 📩 Foreground message received:', 'color: #00bcd4; font-weight: bold;', payload);

                    // Extract data (FCM v1 usually places it in payload.notification or payload.data)
                    const { title, body } = payload.notification || payload.data || {};

                    if (title || body) {
                        if (typeof addNotificationLog === 'function') {
                            addNotificationLog({
                                messageId: payload.messageId || `fg_${Date.now()}`,
                                type: 'received',
                                title: title,
                                body: body,
                                timestamp: new Date(),
                                status: 'unread',
                                relatedUser: { key: 'system', name: 'System' },
                                payload: payload.data
                            }).then(() => {
                                console.log('[FCM Web] Foreground notification saved to DB.');
                            }).catch(err => {
                                console.error('[FCM Web] Failed to save foreground notification:', err);
                            });
                        }
                    }
                });

                console.log("[Dev] 🌏 [Web FCM] 🎉 Initialization completed successfully.");
            } else {
                console.warn("[Dev] 🌏 [Web FCM] ❓ Connected successfully but Google returned empty token.");
            }
        } catch (tokenErr) {
            // Ignore push service error as requested
            if (tokenErr.message && tokenErr.message.includes("push service error")) {
                console.warn("[Dev] 🌏 [Web FCM] ⚠️ Ignoring recurring push service error.");
            } else {
                console.error("[Dev] 🌏 [Web FCM] ❌ Failed to get token:", tokenErr.message);
                throw tokenErr;
            }
        }

    } catch (err) {
        // Ignore AbortError: Registration failed - push service error
        if (err.message && err.message.includes("push service error")) {
            console.warn("[FCM Web] ⚠️ Ignoring expected push service AbortError.");
        } else {
            console.error("[FCM Web] 💥 Unexpected error in setupFirebaseWeb:", err);
            throw err; // Escalate error for retry
        }
    }
}



// ===============================
//   Utility: Wait for Android Token
// ===============================

/**
 * @description Object to store pending promises waiting for Android token
 */
window._fcmTokenResolvers = [];

/**
 * @description Callback invoked by Android app upon receiving token
 * @param {string} token 
 */
window.onAndroidFcmReceived = function (token) {
    if (token) {
        console.log("[Bridge] 📱 Token received from Android via direct signal");
        localStorage.setItem("android_fcm_key", token);
        // Resolve all pending promises
        const resolvers = window._fcmTokenResolvers;
        window._fcmTokenResolvers = [];
        resolvers.forEach(resolve => resolve(token));
    }
};

function waitForFcmKey(callback, timeout = 15000) {
    return new Promise((resolve, reject) => {
        const token = localStorage.getItem("android_fcm_key");

        if (token) {
            if (callback) callback(token);
            return resolve(token);
        }

        // إضافة الوعد للقائمة المنتظرة
        window._fcmTokenResolvers.push((t) => {
            if (callback) callback(t);
            resolve(t);
        });

        // timeout for safety in case Android fails completely
        setTimeout(() => {
            if (!localStorage.getItem("android_fcm_key")) {
                console.warn("[Android FCM] Token retrieval failed via signal (Timeout)");
                reject("timeout");
            }
        }, timeout);
    });
}
