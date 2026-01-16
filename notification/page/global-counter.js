/**
 * @file global-counter.js
 * @description Global unread notification counter and UI badge management.
 */

window.GLOBAL_NOTIFICATIONS = {
    unreadCount: 0,
    lastOpenedTime: null,
    updateTimeout: null,
    onCountUpdate: null,

    /**
     * @description Update counter from IndexedDB (with Debounce for accuracy).
     */
    updateCounter: async function (forceImmediate = false) {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }

        const runUpdate = async () => {
            try {
                let count = 0;
                if (typeof countUnreadNotifications === 'function') {
                    count = await countUnreadNotifications();
                } else if (typeof getNotificationLogs === 'function') {
                    const allNotifications = await getNotificationLogs('all', 1000);
                    count = allNotifications.filter(n => n.status === 'unread').length;
                }

                const hasChanged = this.unreadCount !== count;
                this.unreadCount = count;

                console.log(`%c[Global] 🔔 Counter update: ${this.unreadCount} unread notifications`, 'color: #ff6b6b; font-weight: bold;');

                this.notifyCountUpdate();
                this.updateBrowserTitle();

                if (hasChanged || forceImmediate) {
                    console.log(`[Global] ✅ Counter synchronized: ${this.unreadCount} notifications`);
                }
            } catch (error) {
                console.error('[Global] Error updating counter:', error);
            } finally {
                this.updateTimeout = null;
            }
        };

        if (forceImmediate) {
            await runUpdate();
        } else {
            this.updateTimeout = setTimeout(runUpdate, 50);
        }
    },

    /**
     * @description Reset counter when opening notifications page.
     */
    resetCounter: function () {
        try {
            this.setLastOpenedTime(new Date());
            this.updateCounter(true);
        } catch (error) {
            console.error('[Global] Error resetting counter:', error);
        }
    },

    /**
     * @description Update browser title with count.
     */
    updateBrowserTitle: function () {
        try {
            const baseTitle = document.title.replace(/^\(\d+\)\s*/, '');
            if (this.unreadCount > 0) {
                document.title = `(${this.unreadCount}) ${baseTitle}`;
            } else {
                document.title = baseTitle;
            }
        } catch (error) {
            console.error('[Global] Error updating title:', error);
        }
    },

    /**
     * @description Load/Save timestamps for opening.
     */
    getLastOpenedTime: function () {
        try {
            const stored = localStorage.getItem('notifications_last_opened');
            return stored ? new Date(stored) : null;
        } catch (error) {
            return null;
        }
    },

    setLastOpenedTime: function (date) {
        try {
            this.lastOpenedTime = date;
            localStorage.setItem('notifications_last_opened', date.toISOString());
        } catch (error) {
            console.error('[Global] Error saving timestamp:', error);
        }
    },

    /**
     * @description Notify and Update UI Badge.
     */
    notifyCountUpdate: function () {
        this.updateNotificationBadge();
        if (typeof this.onCountUpdate === 'function') {
            try {
                this.onCountUpdate(this.unreadCount);
            } catch (error) {
                console.error('[Global] Callback error:', error);
            }
        }
    },

    updateNotificationBadge: function () {
        try {
            const badge = document.getElementById('notifications-badge');
            if (!badge) return;

            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'flex';
                badge.style.backgroundColor = '#dc3545';
            } else {
                badge.style.display = 'none';
            }
        } catch (error) {
            console.error('[Global] Error updating badge:', error);
        }
    },

    /**
     * @description System Initialization.
     */
    init: async function () {
        try {
            this.lastOpenedTime = this.getLastOpenedTime();
            await this.updateCounter(true);
            console.log('[Global] Notification system ready');

            if (window.Android && typeof window.Android.onWebAppReady === 'function') {
                window.Android.onWebAppReady();
            }
        } catch (error) {
            console.error('[Global] Init error:', error);
        }
    }
};
