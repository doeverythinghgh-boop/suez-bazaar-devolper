/**
 * @file notification-global.js
 * @description Global variable for tracking unread notifications.
 */

/**
 * @description Global notification management object.
 * @type {object}
 */
window.GLOBAL_NOTIFICATIONS = {
    /**
     * @description Number of unread notifications.
     * @type {number}
     */
    unreadCount: 0,

    /**
     * @description Last time the user opened the notifications page.
     * @type {Date|null}
     */
    lastOpenedTime: null,

    /**
     * @description Timer for debounce process.
     * @type {number|null}
     */
    updateTimeout: null,

    /**
     * @description Callback called when the counter is updated.
     * @type {Function|null}
     */
    onCountUpdate: null,

    /**
     * @description Update counter from IndexedDB (with Debounce for accuracy).
     * @async
     * @returns {Promise<void>}
     */
    updateCounter: async function (forceImmediate = false) {
        // If there is a pending update, clear it to schedule a new one
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }

        const runUpdate = async () => {
            try {
                // Calculate unread notifications accurately using index (faster and more accurate)
                let count = 0;
                if (typeof countUnreadNotifications === 'function') {
                    count = await countUnreadNotifications();
                } else {
                    // Fallback if new function is not available
                    const allNotifications = await getNotificationLogs('all', 1000);
                    count = allNotifications.filter(n => n.status === 'unread').length;
                }

                // Update values only if changed or if update is immediate
                const hasChanged = this.unreadCount !== count;
                this.unreadCount = count;

                // Detailed log for problem tracking
                console.log(`%c[Global] 🔔 Counter update: ${this.unreadCount} unread notifications`, 'color: #ff6b6b; font-weight: bold;');

                this.notifyCountUpdate();
                this.updateBrowserTitle();

                if (hasChanged || forceImmediate) {
                    console.log(`[Global] ✅ Counter synchronized: ${this.unreadCount} notifications (Signal-based)`);
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
            // Very light debounce to group sequential operations (without blind waiting)
            this.updateTimeout = setTimeout(runUpdate, 50);
        }
    },
    /**
     * @throws {Error} - If there's an error fetching notifications from the database.
     * @see getNotificationLogs
     * @see getLastOpenedTime
     * @see notifyCountUpdate
     * @see updateBrowserTitle
     */

    /**
     * @description Reset counter to zero when opening the notifications page.
     */
    resetCounter: function () {
        try {
            this.setLastOpenedTime(new Date());
            // Note: Manually zeroing unreadCount was removed to ensure it only disappears after messages are actually loaded and modified in DB
            this.updateCounter(true);
        } catch (error) {
            console.error('[Global] Error updating last opened time:', error);
        }
    },
    /**
     * @returns {void}
     * @see setLastOpenedTime
     * @see notifyCountUpdate
     * @see updateBrowserTitle
     */

    /**
     * @description Update browser title to display the count.
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
            console.error('[Global] Error updating browser title:', error);
        }
    },
    /**
     * @returns {void}
     * @throws {Error} - If there's an error manipulating the document title.
     */

    /**
     * @description Get last opened time from localStorage.
     * @returns {Date|null}
     */
    getLastOpenedTime: function () {
        try {
            const stored = localStorage.getItem('notifications_last_opened');
            return stored ? new Date(stored) : null;
        } catch (error) {
            console.error('[Global] Error reading lastOpened:', error);
            return null;
        }
    },
    /**
     * @throws {Error} - If there's an error accessing LocalStorage.
     */

    /**
     * @description Save current opened time in localStorage.
     * @param {Date} date
     */
    setLastOpenedTime: function (date) {
        try {
            this.lastOpenedTime = date;
            localStorage.setItem('notifications_last_opened', date.toISOString());
            console.log('[Global] Opened time saved:', date.toISOString());
        } catch (error) {
            console.error('[Global] Error saving lastOpened:', error);
        }
    },
    /**
     * @throws {Error} - If there's an error saving to LocalStorage.
     */

    /**
     * @description Notify Callback of counter update and update notification badge in UI.
     */
    notifyCountUpdate: function () {
        // Always update badge based on real count (only disappears when unreadCount = 0)
        this.updateNotificationBadge();

        // Call the callback if it exists
        if (typeof this.onCountUpdate === 'function') {
            try {
                this.onCountUpdate(this.unreadCount);
            } catch (error) {
                console.error('[Global] Callback error:', error);
            }
        }
    },
    /**
     * @returns {void}
     * @throws {Error} - If an error occurs during the callback execution.
     * @see updateNotificationBadge
     */

    /**
     * @description Update notification badge on the main button.
     * @returns {void}
     */
    updateNotificationBadge: function () {
        try {
            // Use the badge actually present in index.html
            const badge = document.getElementById('notifications-badge');

            if (!badge) {
                console.warn('[Global] notification-badge element not found');
                return;
            }

            // Update content and display
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                // Show badge (flex because design relies on it for centering)
                badge.style.display = 'flex';
                // Confirm color (precautionary)
                badge.style.backgroundColor = '#dc3545';
                console.log(`%c[Global] ✅ Showing badge: ${badge.textContent}`, 'color: #28a745; font-weight: bold;');
            } else {
                // Hide badge
                badge.style.display = 'none';
                console.log('%c[Global] ⭕ Hiding badge (count = 0)', 'color: #6c757d;');
            }
        } catch (error) {
            console.error('[Global] Error updating badge:', error);
        }
    },
    /**
     * @returns {void}
     */

    /**
     * @description Initialize the global system.
     * @async
     */
    init: async function () {
        try {
            // Load last opened time
            this.lastOpenedTime = this.getLastOpenedTime();

            // Initial counter update immediately (based on current local data)
            await this.updateCounter(true);

            console.log('[Global] Notification system ready - sending stability signal to Android');

            // ✅ NEW: Notify Android that the web app is fully ready.
            // Android is now responsible for pushing pending notifications upon receiving this signal.
            // [!IMPORTANT] BRIDGE CALL: Coordinate with Android's WebAppInterface.onWebAppReady.
            if (window.Android && typeof window.Android.onWebAppReady === 'function') {
                window.Android.onWebAppReady();
            }
        } catch (error) {
            console.error('[Global] Initialization error:', error);
        }
    },
    /**
     * @returns {Promise<void>}
     * @throws {Error} - If an error occurs during initialization.
     * @see getLastOpenedTime
     * @see updateCounter
     * @see setupEventListeners
     */

    /**
     * @description Are listeners setup?
     */
    isListenersSetup: false,

    /**
     * @description Setup event listeners.
     */
    setupEventListeners: function () {
        if (this.isListenersSetup) return;
        try {
            // Listen for new notification event
            window.addEventListener('notificationLogAdded', async (event) => {
                try {
                    console.log('[Global] New notification event:', event.detail);

                    // Play notification sound only for received notifications
                    // Should be stopped when Android app is present because it works differently there
                    if (event.detail && event.detail.type === 'received' && !window.Android) {
                        if (typeof playNotificationSound === 'function') {
                            playNotificationSound();
                        }
                    }

                    // Recalculate total count from database to ensure accuracy and avoid cumulative errors
                    await this.updateCounter();

                    // Show system notification if allowed and notification is unread
                    if (event.detail.status === 'unread') {
                        this.showSystemNotification(event.detail);
                    }
                } catch (innerError) {
                    console.error('[Global] Error inside notificationLogAdded listener:', innerError);
                }
            });

            // Listen for notification status update (read/unread)
            window.addEventListener('notificationStatusUpdated', async (event) => {
                try {
                    console.log('[Global] Notification status updated:', event.detail);
                    // Recalculate total count
                    await this.updateCounter();
                } catch (innerError) {
                    console.error('[Global] Error inside notificationStatusUpdated listener:', innerError);
                }
            });
            this.isListenersSetup = true;
            console.log('[Global] ✅ Notification event listeners setup');
        } catch (error) {
            console.error('[Global] Error setting up listeners:', error);
        }
    },
    /**
     * @returns {void}
     * @see updateCounter
     * @see playNotificationSound
     * @see showSystemNotification
     */

    /**
     * @description Show system notification.
     * @param {object} notification - Notification data.
     */
    showSystemNotification: function (notification) {
        try {
            // Check for notification support and permission
            if (!("Notification" in window)) {
                console.log('[Global] Browser does not support system notifications');
                return;
            }

            if (Notification.permission === "granted") {
                this.createNotification(notification);
            } else if (Notification.permission !== "denied") {
                // Request permission if not previously denied
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
     * @returns {void}
     * @throws {Error} - If an error occurs during notification permission request or creation.
     * @see createNotification
     */

    /**
     * @description Create system notification.
     * @param {object} notification
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

            // When clicking the notification, open notifications page
            notif.onclick = function () {
                window.focus();
                this.close();
                // Can redirect user to notifications page
                if (window.location.pathname.includes('notifications')) {
                    window.location.reload();
                } else {
                    window.location.href = '/notifications.html';
                }
            }.bind(notif);

            // Close notification automatically after 5 seconds
            setTimeout(() => notif.close(), 5000);
        } catch (error) {
            console.error('[Global] Error creating system notification:', error);
        }
    },
    /**
     * @returns {void}
     */


};

// Automatically initialize the system on page load
/**
 * @description Automatically initializes the `GLOBAL_NOTIFICATIONS` object when the DOM is fully loaded.
 * This ensures the global notification system is set up as soon as possible.
 * @throws {Error} - If `GLOBAL_NOTIFICATIONS.init()` fails during execution.
 */
// Setup listeners immediately (before DOMContentLoaded) to ensure early Android events are captured
GLOBAL_NOTIFICATIONS.setupEventListeners();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        GLOBAL_NOTIFICATIONS.init();
    });
} else {
    GLOBAL_NOTIFICATIONS.init();
}