/**
 * @file notification/fcm-android-bridge.js
 * @description Native Android bridge callbacks and persistent saving logic.
 */

function saveNotificationFromAndroid(notificationJson) {
    try {
        const notificationData = JSON.parse(notificationJson);
        saveNotificationBatchFromAndroid(JSON.stringify([notificationData]));
    } catch (error) {
        console.error("[Auth] Error parsing single notification:", error);
    }
}

function saveNotificationBatchFromAndroid(batchJson) {
    console.log('%c[FCM Android] 📦 Batch received:', 'color: #007bff; font-weight: bold;', batchJson);
    try {
        const notifications = JSON.parse(batchJson);
        if (!Array.isArray(notifications)) return;

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
        console.error("[FCM] Error parsing batch:", error);
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
