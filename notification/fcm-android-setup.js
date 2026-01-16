/**
 * @file notification/fcm-android-setup.js
 * @description Android-specific FCM initialization sequence.
 */

async function setupFirebaseAndroid(userId) {
    console.log("[Dev] 📱 Android FCM Setup...");
    const existingToken = localStorage.getItem("android_fcm_key");

    if (!existingToken) {
        try {
            if (window.Android && typeof window.Android.onUserLoggedIn === "function") {
                window.Android.onUserLoggedIn(userId);
            }
        } catch (e) {
            console.error("Android bridge error:", e);
        }

        await waitForFcmKey(async (newToken) => {
            await sendTokenToServer(userId, newToken, "android");
            localStorage.setItem('notifications_enabled', 'true');
        }, 10000);
    } else {
        localStorage.setItem('notifications_enabled', 'true');
    }
}

window.setupFirebaseAndroid = setupFirebaseAndroid;
