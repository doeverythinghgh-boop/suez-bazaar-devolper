/**
 * @file notification/fcm-p2p-bridge.js
 * @description High-level notification sending via Android or Web P2P.
 */

async function sendNotification(token, title, body) {
    if (!token || token === 'undefined' || token === 'null' || typeof token !== 'string') {
        console.error('[Notifications] Invalid token:', token);
        return { error: 'Invalid or missing token', tokenStatus: 'broken' };
    }

    const localTokens = [
        localStorage.getItem("fcm_token"),
        localStorage.getItem("android_fcm_key")
    ].filter(t => t && t !== 'undefined' && t !== 'null');

    if (localTokens.includes(token)) {
        console.warn(`%c[Notifications] 🚫 Self-notification prevented.`, 'color: #ff9800; font-weight: bold;');
        return { success: false, reason: 'self_notification_prevented' };
    }

    if (window.Android && typeof window.Android.sendNotificationsToTokensP2P === 'function') {
        console.log(`[FCM Bridge] 📱 Android P2P sending...`);
        try {
            window.Android.sendNotificationsToTokensP2P(JSON.stringify([token]), title, body);
            return { success: true, platform: 'android-p2p' };
        } catch (e) {
            console.error('[FCM Bridge] Error:', e);
            return { error: e.message };
        }
    } else if (typeof WebP2PNotification !== 'undefined') {
        console.log(`[FCM Bridge] 🌐 Web P2P sending...`);
        return await WebP2PNotification.send(token, title, body);
    }

    console.warn('[FCM] No P2P bridge available.');
    return { error: 'P2P Notification failed.' };
}

async function sendNotificationsToTokens(allTokens, title, body) {
    if (!Array.isArray(allTokens) || allTokens.length === 0) return;

    if (typeof addNotificationLog === 'function') {
        addNotificationLog({
            type: 'sent',
            title: title,
            body: body,
            timestamp: new Date(),
            status: 'read',
            relatedUser: { name: 'User' }
        }).catch(e => console.error('[Notifications] Save failed:', e));
    }

    const localTokens = [
        localStorage.getItem("fcm_token"),
        localStorage.getItem("android_fcm_key")
    ].filter(t => t && t !== 'undefined' && t !== 'null');

    const validTokens = allTokens.filter(t =>
        t && typeof t === 'string' && !localTokens.includes(t)
    );

    if (validTokens.length === 0) return;

    if (window.Android && typeof window.Android.sendNotificationsToTokensP2P === 'function') {
        try {
            window.Android.sendNotificationsToTokensP2P(JSON.stringify(validTokens), title, body);
            return;
        } catch (e) {
            console.error('[FCM Bridge] Android P2P Error:', e);
        }
    } else if (typeof WebP2PNotification !== 'undefined') {
        try {
            await WebP2PNotification.sendBatch(validTokens, title, body);
        } catch (e) {
            console.error('[FCM Bridge] Web P2P Error:', e);
        }
        return;
    }

    console.warn('[Notifications] No P2P bridge active.');
}

window.sendNotification = sendNotification;
window.sendNotificationsToTokens = sendNotificationsToTokens;
