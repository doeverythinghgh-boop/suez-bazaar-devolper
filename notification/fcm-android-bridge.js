/**
 * @file notification/fcm-android-bridge.js
 * @description Native Android bridge callbacks and persistent saving logic.
 */

function saveNotificationFromAndroid(notificationJson) {
    console.log('%c[Dev] 📥 Single notification received from Android', 'color: #6c757d; font-weight: bold;');
    console.log('[Dev] Raw JSON string:', notificationJson);

    try {
        const notificationData = JSON.parse(notificationJson);
        console.log('%c[Dev] ✅ JSON parsed successfully', 'color: #28a745;', notificationData);
        saveNotificationBatchFromAndroid(JSON.stringify([notificationData]));
    } catch (error) {
        console.error('%c[Dev] ❌ JSON Parse Error - Single Notification', 'color: #dc3545; font-weight: bold;');
        console.error('[Dev] Error details:', error.message);
        console.error('[Dev] Problematic JSON string:', notificationJson);
        console.error('[Dev] Common causes:');
        console.error('  1. Unescaped double quotes (") in notification body');
        console.error('  2. Unescaped backslashes (\\) in text');
        console.error('  3. Newline characters (\\n) not properly escaped');
        console.error('[Dev] Solution: Check NotificationHandler.kt escape logic (lines 141-146)');
    }
}

function saveNotificationBatchFromAndroid(batchJson) {
    console.log('%c[FCM Android] 📦 Batch received:', 'color: #007bff; font-weight: bold;', batchJson);
    console.log('[Dev] Batch size (chars):', batchJson.length);

    try {
        const notifications = JSON.parse(batchJson);
        console.log('%c[Dev] ✅ Batch JSON parsed successfully', 'color: #28a745;', `${notifications.length} notifications`);

        if (!Array.isArray(notifications)) {
            console.error('%c[Dev] ❌ Invalid batch format: Expected array', 'color: #dc3545; font-weight: bold;');
            return;
        }

        if (typeof addNotificationLog !== 'function') {
            console.error("[Auth] addNotificationLog not found.");
            return;
        }

        const promises = notifications.map(notif => {
            const uniqueSuffix = Math.random().toString(36).substring(2, 7);
            const fallbackId = `android_${Date.now()}_${uniqueSuffix}`;

            return addNotificationLog({
                messageId: notif.messageId || fallbackId,
                type: 'received',
                title: notif.title || 'Bazaar',
                body: notif.body || '',
                timestamp: notif.timestamp ? new Date(notif.timestamp) : new Date(),
                status: 'unread',
                relatedUser: { key: 'admin', name: 'Admin' },
                payload: notif,
            });
        });

        Promise.all(promises).then(() => {
            console.log(`%c[FCM] ✅ Saved ${notifications.length} notifications`, 'color: #28a745; font-weight: bold;');
            if (window.GLOBAL_NOTIFICATIONS) {
                window.GLOBAL_NOTIFICATIONS.updateCounter(true);
            }
        }).catch(err => {
            console.error("[FCM] Error saving batch:", err);
        });
    } catch (error) {
        console.error('%c[Dev] ❌ JSON Parse Error - Batch', 'color: #dc3545; font-weight: bold;');
        console.error('[Dev] Error details:', error.message);
        console.error('[Dev] Problematic JSON string:', batchJson);
        console.error('[Dev] First 200 chars:', batchJson.substring(0, 200));
        console.error('[Dev] Common causes:');
        console.error('  1. Unescaped double quotes (") in notification body');
        console.error('  2. Unescaped backslashes (\\) in text');
        console.error('  3. Newline characters (\\n) not properly escaped');
        console.error('  4. Invalid JSON array structure');
        console.error('[Dev] Solution: Check NotificationHandler.kt escape logic (lines 180-185)');
    }
}

async function askForNotificationPermission() {
    try {
        if (window.Android && typeof window.Android.requestNotificationPermission === "function") {
            console.log("[Dev] 📱 Requesting permission from Android...");
            window.Android.requestNotificationPermission();
        }
    } catch (error) {
        console.error('[Notifications] Error:', error);
    }
}

function onUserLoggedOutAndroid() {
    try {
        if (window.Android && typeof window.Android.onUserLoggedOut === "function") {
            const userKey = (typeof userSession !== 'undefined') ? userSession.user_key : '';
            window.Android.onUserLoggedOut(userKey);
            localStorage.removeItem("android_fcm_key");
            console.log("[Auth] Android key deleted.");
        }
    } catch (error) {
        console.error('[Auth] Error in Android logout:', error);
    }
}

window._fcmTokenResolvers = [];

window.onAndroidFcmReceived = function (token) {
    if (token) {
        console.log("[Bridge] 📱 Token received from Android");
        localStorage.setItem("android_fcm_key", token);
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
        window._fcmTokenResolvers.push((t) => {
            if (callback) callback(t);
            resolve(t);
        });
        setTimeout(() => {
            if (!localStorage.getItem("android_fcm_key")) {
                console.warn("[Android FCM] Timeout");
                reject("timeout");
            }
        }, timeout);
    });
}

window.saveNotificationFromAndroid = saveNotificationFromAndroid;
window.saveNotificationBatchFromAndroid = saveNotificationBatchFromAndroid;
window.askForNotificationPermission = askForNotificationPermission;
window.onUserLoggedOutAndroid = onUserLoggedOutAndroid;
window.waitForFcmKey = waitForFcmKey;
window.onAndroidFcmReceived = onAndroidFcmReceived;
