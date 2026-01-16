/**
 * @file global-events.js
 * @description Event listeners for global notification updates.
 */

window.GLOBAL_NOTIFICATIONS = window.GLOBAL_NOTIFICATIONS || {};

Object.assign(window.GLOBAL_NOTIFICATIONS, {
    isListenersSetup: false,

    setupEventListeners: function () {
        if (this.isListenersSetup) return;
        try {
            window.addEventListener('notificationLogAdded', async (event) => {
                try {
                    console.log('[Global] New notification:', event.detail);

                    if (event.detail && event.detail.type === 'received' && !window.Android) {
                        if (typeof playNotificationSound === 'function') {
                            playNotificationSound();
                        }
                    }

                    await this.updateCounter();

                    if (event.detail.status === 'unread') {
                        this.showSystemNotification(event.detail);
                    }
                } catch (innerError) {
                    console.error('[Global] Error in log listener:', innerError);
                }
            });

            window.addEventListener('notificationStatusUpdated', async (event) => {
                try {
                    console.log('[Global] Status updated:', event.detail);
                    await this.updateCounter();
                } catch (innerError) {
                    console.error('[Global] Error in status listener:', innerError);
                }
            });

            this.isListenersSetup = true;
            console.log('[Global] ✅ Listeners active');
        } catch (error) {
            console.error('[Global] Error setting up listeners:', error);
        }
    }
});

// Auto-run listener setup
if (window.GLOBAL_NOTIFICATIONS.setupEventListeners) {
    window.GLOBAL_NOTIFICATIONS.setupEventListeners();
}
