/**
 * @file notification/fcm-main-setup.js
 * @description Main entry point for FCM initialization.
 */

var isSettingUpFCM = false;
var isServiceWorkerUsed = false;

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
        console.error("[Dev] 🌏 Failed to connect to gstatic.com");
        return false;
    }
}

window.resetFCM = async function () {
    console.log("%c[FCM Tool] Cleanup...", "color: #ff9800; font-weight: bold;");
    try {
        localStorage.removeItem("fcm_token");
        localStorage.removeItem("notifications_enabled");
        sessionStorage.removeItem("fcm_token_setup_done");
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let r of registrations) await r.unregister();
        }
        if ('caches' in window) {
            const keys = await caches.keys();
            for (let k of keys) await caches.delete(k);
        }
        alert("Cleanup successful.");
        window.location.reload();
    } catch (e) { console.error("Cleanup error:", e); }
};

async function setupFCM() {
    // 🛑 BLOCK GUEST: Do not run FCM setup for guests (neither Web nor Android)
    if (userSession && userSession.user_key === 'guest_user') {
        console.log("[FCM] Guest user detected. Skipping FCM setup.");
        return;
    }

    if (isSettingUpFCM) return;
    isSettingUpFCM = true;

    const MAX_RETRIES = 3;
    let attempt = 0;
    let success = false;

    while (attempt < MAX_RETRIES && !success) {
        attempt++;
        try {
            if (typeof userSession === 'undefined' || !userSession.user_key) break;
            const currentUserId = userSession.user_key;

            if (window.Android && typeof window.Android.onUserLoggedIn === "function") {
                await setupFirebaseAndroid(currentUserId);
                success = true;
            } else {
                await setupFirebaseWeb(currentUserId);
                success = true;
            }

            if (success) sessionStorage.setItem("fcm_token_setup_done", "1");
        } catch (error) {
            console.error(`[FCM] Attempt #${attempt} failed:`, error);
            if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, attempt * 3000));
        }
    }
    isSettingUpFCM = false;
}

window.setupFCM = setupFCM;
window.checkGoogleConnectivity = checkGoogleConnectivity;
