/**
 * @file global-system-notif.js
 * @description System/Browser notification management.
 */

window.GLOBAL_NOTIFICATIONS = window.GLOBAL_NOTIFICATIONS || {};

Object.assign(window.GLOBAL_NOTIFICATIONS, {
    /**
     * @description Show system notification.
     */
    showSystemNotification: function (notification) {
        try {
            if (!("Notification" in window)) return;

            if (Notification.permission === "granted") {
                this.createNotification(notification);
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        this.createNotification(notification);
                    }
                });
            }
        } catch (error) {
            console.error('[Global] System notification error:', error);
        }
    },

    /**
     * @description Create system notification.
     */
    createNotification: function (notification) {
        try {
            const title = notification.title || 'New Notification';
            const body = notification.body || notification.message || 'You have a new notification';

            const notif = new Notification(title, {
                body: body,
                icon: '/favicon.ico',
                tag: `notification_${notification.id || Date.now()}`,
                requireInteraction: false
            });

            notif.onclick = function () {
                window.focus();
                this.close();
                if (window.location.pathname.includes('notifications')) {
                    window.location.reload();
                } else {
                    window.location.href = '/notifications.html';
                }
            }.bind(notif);

            setTimeout(() => notif.close(), 5000);
        } catch (error) {
            console.error('[Global] Error creating notification:', error);
        }
    }
});

// Final bootstrap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.GLOBAL_NOTIFICATIONS.init) window.GLOBAL_NOTIFICATIONS.init();
    });
} else {
    if (window.GLOBAL_NOTIFICATIONS.init) window.GLOBAL_NOTIFICATIONS.init();
}
