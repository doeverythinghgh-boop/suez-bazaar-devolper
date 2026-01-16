/**
 * @file notification/fcm-web-setup.js
 * @description Web-specific FCM registration and initialization.
 */

async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return false;
    try {
        console.log("[SW] Registering...");
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const registration = await navigator.serviceWorker.ready;

        if (!registration.active) {
            await new Promise((resolve) => {
                const onStateChange = () => { if (registration.active) resolve(); };
                if (registration.installing) registration.installing.addEventListener('statechange', onStateChange);
                else if (registration.waiting) registration.waiting.addEventListener('statechange', onStateChange);
                else resolve();
            });
        }
        return registration;
    } catch (err) {
        console.error("[SW] Registration failed:", err);
        return false;
    }
}

async function setupFirebaseWeb(userId) {
    console.log("[Dev] 🌏 Web FCM Setup...");
    try {
        const swReg = await registerServiceWorker();
        if (!swReg) throw new Error("SW registration failed");

        if (!window.firebase) {
            await import("../assets/libs/firebase/firebase-app-8.10.1.js");
            await import("../assets/libs/firebase/firebase-messaging-8.10.1.js");
        }

        const firebase = window.firebase;
        if (!firebase) throw new Error("Firebase load failed");

        const firebaseConfig = {
            apiKey: "AIzaSyClapclT8_4UlPvM026gmZbYCiXaiBDUYk",
            authDomain: "suze-bazaar-notifications.firebaseapp.com",
            projectId: "suze-bazaar-notifications",
            storageBucket: "suze-bazaar-notifications.firebasestorage.app",
            messagingSenderId: "983537000435",
            appId: "1:983537000435:web:92c2729c9aaf872764bc86",
            measurementId: "G-P8FMC3KR7M",
        };

        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        const messaging = firebase.messaging();

        try { messaging.useServiceWorker(swReg); isServiceWorkerUsed = true; } catch (e) { }

        const currentPermission = Notification.permission;
        if (currentPermission === "denied") {
            if (typeof Swal !== 'undefined' && !window.Android) {
                Swal.fire({ title: 'Notifications Disabled', icon: 'warning', confirmButtonText: 'OK' });
            }
            return;
        }
        if (currentPermission === "default") return;

        const VAPID_KEY = "BK1_lxS32198GdKm0Gf89yk1eEGcKvKLu9bn1sg9DhO8_eUUhRCAW5tjynKGRq4igNhvdSaR0-eL74V3ACl3AIY";
        try {
            const currentToken = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
            if (currentToken) {
                localStorage.setItem("fcm_token", currentToken);
                if (userId) {
                    await sendTokenToServer(userId, currentToken, "web");
                    localStorage.setItem('notifications_enabled', 'true');
                }
                messaging.onMessage((payload) => {
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
                            });
                        }
                    }
                });
            }
        } catch (tokenErr) { console.error("Token error:", tokenErr); }
    } catch (err) { console.error("Setup error:", err); throw err; }
}

window.setupFirebaseWeb = setupFirebaseWeb;
window.registerServiceWorker = registerServiceWorker;
