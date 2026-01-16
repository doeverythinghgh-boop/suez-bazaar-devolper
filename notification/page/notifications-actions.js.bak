/**
 * @file notifications-actions.js
 * @description Core operations (DB, Events, Permissions) for the notifications page.
 */

Object.assign(NotificationPage, {
    /**
     * @description Setup event listeners.
     */
    setupEventListeners() {
        try {
            if (this.elements.filterType) {
                this.elements.filterType.addEventListener('change', (e) => {
                    this.filters.type = e.target.value;
                    this.applyFilters();
                    this.saveSettings();
                });
            }

            if (this.elements.filterStatus) {
                this.elements.filterStatus.addEventListener('change', (e) => {
                    this.filters.status = e.target.value;
                    this.applyFilters();
                    this.saveSettings();
                });
            }

            if (this.elements.searchInput) {
                let searchTimeout;
                this.elements.searchInput.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.filters.search = e.target.value.trim();
                        this.applyFilters();
                        this.saveSettings();
                    }, 300);
                });
            }

            if (this.elements.sortSelect) {
                this.elements.sortSelect.addEventListener('change', (e) => {
                    this.filters.sortBy = e.target.value;
                    this.applyFilters();
                    this.saveSettings();
                });
            }

            if (this.elements.refreshBtn) {
                this.elements.refreshBtn.addEventListener('click', () => {
                    this.refreshNotifications();
                });
            }

            if (this.elements.autoRefreshToggle) {
                this.elements.autoRefreshToggle.addEventListener('change', (e) => {
                    this.refreshSettings.autoRefresh = e.target.checked;
                    if (this.refreshSettings.autoRefresh) {
                        this.startAutoRefresh();
                    } else {
                        this.stopAutoRefresh();
                    }
                    this.updateAutoRefreshToggle();
                    this.saveSettings();
                });
            }

            if (this.elements.markAllReadBtn) {
                this.elements.markAllReadBtn.addEventListener('click', () => {
                    this.markAllAsRead();
                });
            }

            if (this.elements.clearFiltersBtn) {
                this.elements.clearFiltersBtn.addEventListener('click', () => {
                    this.clearFilters();
                });
            }

            if (this.elements.masterToggle) {
                this.elements.masterToggle.addEventListener('change', async (e) => {
                    await this.toggleNotificationsStatus(e.target.checked);
                });
            }

            window.addEventListener('notificationLogAdded', async (event) => {
                try {
                    console.log('[Notifications Action] New notification event:', event.detail);
                    if (!this.state || !this.elements || !this.elements.list) return;
                    await this.refreshNotifications();
                    if (!document.hidden && event.detail && event.detail.type === 'received') {
                        this.showToast(window.langu('notifications_new_received'), 'info');
                    }
                } catch (innerError) {
                    console.error('[Notifications Action] Error receiving new notification:', innerError);
                }
            });

            document.addEventListener('visibilitychange', () => {
                try {
                    if (!document.hidden) this.refreshNotifications();
                } catch (innerError) {
                    console.error('[Notifications Action] Error change visibility state:', innerError);
                }
            });

            window.addEventListener('notificationDeleted', (event) => {
                console.log('[Notifications Action] Notification deleted:', event.detail.id);
                this.refreshNotifications();
            });
        } catch (error) {
            console.error('[Notifications Action] Error setting up event listeners:', error);
        }
    },

    /**
     * @description Setup global counter.
     */
    setupGlobalCounter() {
        try {
            if (window.GLOBAL_NOTIFICATIONS) {
                window.GLOBAL_NOTIFICATIONS.onCountUpdate = (count) => {
                    if (this.elements.unreadCountEl) this.elements.unreadCountEl.textContent = count;
                };
            }
        } catch (error) {
            console.error('[Notifications Action] Error setting up global counter:', error);
        }
    },

    /**
     * @description Load notifications from IndexedDB.
     */
    async loadNotifications() {
        this.setState({ isLoading: true, hasError: false });
        try {
            if (typeof initDB === 'function') await initDB();
            const notifications = await getNotificationLogs('all', 1000);
            this.setState({ notifications: notifications, isLoading: false, hasError: false });
            this.updateStats(notifications);
            this.applyFilters();
        } catch (error) {
            console.error('[Notifications Action] Error fetching notifications:', error);
            this.setState({
                isLoading: false,
                hasError: true,
                errorMessage: window.langu('notifications_error_desc')
            });
        }
    },

    /**
     * @description Refresh notifications.
     */
    async refreshNotifications() {
        try {
            if (this.state.isLoading) return;
            if (this.elements.refreshBtn) {
                this.elements.refreshBtn.classList.add('refreshing');
                setTimeout(() => this.elements.refreshBtn.classList.remove('refreshing'), 1000);
            }
            await this.loadNotifications();
        } catch (error) {
            console.error('[Notifications Action] Error refreshing notifications:', error);
        }
    },

    /**
     * @description Start auto-refresh.
     */
    startAutoRefresh() {
        try {
            this.stopAutoRefresh();
            if (this.refreshSettings.autoRefresh) {
                this.refreshSettings.refreshTimer = setInterval(() => this.refreshNotifications(), this.refreshSettings.refreshInterval);
                console.log('[Notifications Action] Auto-refresh enabled');
            }
        } catch (error) {
            console.error('[Notifications Action] Error starting auto-refresh:', error);
        }
    },

    /**
     * @description Stop auto-refresh.
     */
    stopAutoRefresh() {
        try {
            if (this.refreshSettings.refreshTimer) {
                clearInterval(this.refreshSettings.refreshTimer);
                this.refreshSettings.refreshTimer = null;
                console.log('[Notifications Action] Auto-refresh stopped');
            }
        } catch (error) {
            console.error('[Notifications Action] Error stopping auto-refresh:', error);
        }
    },

    /**
     * @description Delete a specific notification.
     */
    async deleteNotification(id, element) {
        try {
            const result = await Swal.fire({
                title: window.langu('notifications_delete_confirm_title'),
                text: window.langu('notifications_delete_confirm_text'),
                showCancelButton: true,
                buttonsStyling: false,
                customClass: {
                    popup: 'swal-modern-mini-popup',
                    title: 'swal-modern-mini-title',
                    htmlContainer: 'swal-modern-mini-text',
                    confirmButton: 'swal-modern-mini-confirm',
                    cancelButton: 'swal-modern-mini-cancel'
                },
                confirmButtonText: window.langu('alert_confirm_yes'),
                cancelButtonText: window.langu('alert_cancel_btn')
            });

            if (result.isConfirmed) {
                if (typeof deleteNotificationFromDB === 'function') await deleteNotificationFromDB(id);
                element.style.transform = 'translateX(100px)';
                element.style.opacity = '0';
                setTimeout(() => {
                    element.remove();
                    this.state.notifications = this.state.notifications.filter(n => n.id !== id);
                    this.state.filteredNotifications = this.state.filteredNotifications.filter(n => n.id !== id);
                    this.updateStats(this.state.notifications);
                    if (this.state.filteredNotifications.length === 0) this.showEmptyState();
                }, 300);
                this.showToast(window.langu('notifications_delete_success'), 'success');
            }
        } catch (error) {
            console.error('[Notifications Action] Error deleting notification:', error);
            this.showToast(window.langu('notifications_delete_fail'), 'error');
        }
    },

    /**
     * @description Mark all notifications as read.
     */
    async markAllAsRead(silent = false) {
        if (!silent) {
            const result = await Swal.fire({
                title: window.langu('notifications_mark_all_read_confirm'),
                showCancelButton: true,
                buttonsStyling: false,
                customClass: {
                    popup: 'swal-modern-mini-popup',
                    title: 'swal-modern-mini-title',
                    htmlContainer: 'swal-modern-mini-text',
                    confirmButton: 'swal-modern-mini-confirm',
                    cancelButton: 'swal-modern-mini-cancel'
                },
                confirmButtonText: window.langu('alert_confirm_yes'),
                cancelButtonText: window.langu('alert_cancel_btn')
            });
            if (!result.isConfirmed) return;
        }
        try {
            if (typeof markAllNotificationsAsReadInDB === 'function') await markAllNotificationsAsReadInDB();
            this.state.notifications.forEach(n => n.status = 'read');
            if (this.elements.list) {
                this.elements.list.querySelectorAll('.notification-item.unread, .read-status.unread').forEach(el => {
                    el.classList.remove('unread');
                    el.classList.add('read');
                    const icon = el.querySelector('i');
                    if (icon && el.classList.contains('read-status')) icon.className = 'fas fa-check-double';
                });
            }
            this.state.stats.unread = 0;
            if (this.elements.unreadCountEl) this.elements.unreadCountEl.textContent = '0';
            this.updateStats(this.state.notifications);
            if (!silent) this.showToast(window.langu('notifications_mark_all_read_success'), 'success');
        } catch (error) {
            console.error('[Notifications Action] Error marking all as read:', error);
            if (!silent) this.showToast(window.langu('unexpected_error'), 'error');
        }
    },

    /**
     * @description Initialize Master Toggle state.
     */
    initMasterToggle() {
        console.log('[Dev] 🔍 Step 1: Starting Master Toggle initialization...');
        try {
            if (this.elements.masterToggle) {
                const storedEnabled = localStorage.getItem('notifications_enabled');
                console.log(`[Dev] 🔍 [MasterToggle] Stored value in localStorage: ${storedEnabled}`);
                let isEnabled = false;

                // Check OS Permission
                // On Android, we rely more on localStorage because the native app handles permissions
                const isAndroid = !!(window.Android);
                const hasPermission = ('Notification' in window && Notification.permission === 'granted') || isAndroid;

                console.log(`[Dev] 🔍 [MasterToggle] Is system/browser permission (OS Permission) currently granted? ${hasPermission} (Platform: ${isAndroid ? 'Android' : 'Web'})`);

                if (storedEnabled === 'true' && hasPermission) {
                    console.log('[Dev] ✅ [MasterToggle] State: Enabled (matches storage and system permission)');
                    isEnabled = true;
                } else if (storedEnabled === 'true' && !hasPermission) {
                    console.warn('[Dev] ⚠️ [MasterToggle] Permission missing despite being enabled in storage.');
                    console.log('[Dev] ⚠️ [MasterToggle] State: Disabled (ignoring storage due to lack of system/browser permission)');
                    isEnabled = false;
                } else if (storedEnabled === 'false') {
                    console.log('[Dev] 🚫 [MasterToggle] State: Manually disabled in storage');
                    isEnabled = false;
                } else {
                    console.log(`[Dev] ℹ️ [MasterToggle] State: First time or undefined, relying on current permission (${hasPermission})`);
                    isEnabled = hasPermission;
                }

                console.log(`[Dev] 🔍 [MasterToggle] Final Result: Toggle will be ${isEnabled ? 'ON' : 'OFF'}`);
                this.elements.masterToggle.checked = isEnabled;
                this.updateToggleUI(isEnabled);
            }
        } catch (error) {
            console.error('[Notifications Action] Error initializing Master Toggle:', error);
        }
    },

    /**
     * @description Toggle notification status (Enable/Disable).
     */
    async toggleNotificationsStatus(isEnabled) {
        console.log(`[Dev] 🚀 Step 1: Requesting notification status change to: ${isEnabled ? 'Enable' : 'Disable'}`);
        try {
            if (isEnabled) {
                console.log('[Dev] 🚀 Step 2: Calling enableNotifications function...');
                await this.enableNotifications();
            } else {
                console.log('[Dev] 🚀 Step 2: Calling disableNotifications function...');
                await this.disableNotifications();
            }
        } catch (error) {
            console.error('[Notifications Action] Error toggling notification status:', error);
            if (this.elements.masterToggle) {
                console.log('[Dev] ❌ Change failed, reverting toggle state...');
                this.elements.masterToggle.checked = !isEnabled;
            }
        }
    },

    /**
     * @description Enable notifications.
     */
    async enableNotifications() {
        console.log('[Dev] ⚙️ Starting Enable Notifications flow...');
        try {
            if ('Notification' in window) {
                const currentPermission = Notification.permission;
                console.log(`[Dev] ⚙️ Step 1: Checking system/browser permission. Current state: ${currentPermission}`);
                if (currentPermission === 'denied') {
                    console.warn('[Dev] 🚫 System permission previously denied (Blocked at System Level)');
                    // [!IMPORTANT] BRIDGE CALL: Coordinate with Android's WebAppInterface.requestNotificationPermission.
                    if (window.Android && typeof window.Android.requestNotificationPermission === 'function') {
                        console.log('[Dev] ⚙️ Step 1-A: Android environment - Calling OS Permission Request...');
                        window.Android.requestNotificationPermission();
                        Swal.fire({
                            title: window.langu('notifications_sys_permission_required'),
                            text: window.langu('notifications_sys_permission_text'),
                            confirmButtonText: window.langu('alert_confirm_btn'),
                            buttonsStyling: false,
                            customClass: {
                                popup: 'swal-modern-mini-popup',
                                title: 'swal-modern-mini-title',
                                htmlContainer: 'swal-modern-mini-text',
                                confirmButton: 'swal-modern-mini-confirm'
                            }
                        });
                        if (this.elements.masterToggle) this.elements.masterToggle.checked = false;
                        return;
                    } else {
                        console.log('[Dev] ⚙️ Step 1-B: Web environment - Permission cannot be requested programmatically after denial.');
                        Swal.fire({
                            title: window.langu('notifications_blocked_title'),
                            html: window.langu('notifications_blocked_text'),
                            confirmButtonText: window.langu('alert_confirm_btn'),
                            buttonsStyling: false,
                            customClass: {
                                popup: 'swal-modern-mini-popup',
                                title: 'swal-modern-mini-title',
                                htmlContainer: 'swal-modern-mini-text',
                                confirmButton: 'swal-modern-mini-confirm'
                            }
                        });
                        if (this.elements.masterToggle) this.elements.masterToggle.checked = false;
                        return;
                    }
                }
            }

            // [Fix for iOS] Request Permission FIRST to preserve User Gesture
            console.log('[Dev] ⚙️ Step 2: Requesting notification permission immediately (before loading)...');

            if (typeof askForNotificationPermission === 'function') {
                await askForNotificationPermission();
            }

            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                console.log(`[Dev] ⚙️ Permission request result: ${permission}`);
                if (permission === 'denied') {
                    throw new Error('Notification permission denied by user.');
                }
            }

            console.log('[Dev] ⚙️ Step 3: Showing "Enabling" message to user...');
            Swal.fire({ title: window.langu('notifications_enabling'), allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            console.log('[Dev] ⚙️ Step 5: Calling setupFCM() to initialize token...');
            if (typeof setupFCM === 'function') {
                await setupFCM();
                console.log('[Dev] ⚙️ Step 6: setupFCM completed successfully.');

                // Inform Android app about enablement via bridge
                if (window.Android && typeof window.Android.onNotificationsEnabled === 'function') {
                    try {
                        window.Android.onNotificationsEnabled();
                        console.log('[Dev] 📱 Notified Android app that notifications are enabled.');
                    } catch (e) {
                        console.error('[Dev] ❌ Error calling onNotificationsEnabled:', e);
                    }
                }

                localStorage.setItem('notifications_enabled', 'true');
                this.updateToggleUI(true);
                Swal.fire({
                    title: window.langu('notifications_enabled_success'),
                    text: window.langu('notifications_enabled_desc'),
                    timer: 2000,
                    showConfirmButton: false,
                    buttonsStyling: false,
                    customClass: {
                        popup: 'swal-modern-mini-popup',
                        title: 'swal-modern-mini-title',
                        htmlContainer: 'swal-modern-mini-text'
                    }
                });
            } else {
                throw new Error('Notification system is currently unavailable');
            }
        } catch (error) {
            console.error('[Notifications Action] Enable failed:', error);
            console.log('[Dev] ❌ Enablement failed somewhere.');
            Swal.fire({
                title: window.langu('failed_operation_title'),
                text: error.message || window.langu('unexpected_error'),
                confirmButtonText: window.langu('alert_confirm_btn'),
                buttonsStyling: false,
                customClass: {
                    popup: 'swal-modern-mini-popup',
                    title: 'swal-modern-mini-title',
                    htmlContainer: 'swal-modern-mini-text',
                    confirmButton: 'swal-modern-mini-confirm'
                }
            });
            if (this.elements.masterToggle) this.elements.masterToggle.checked = false;
        }
    },

    /**
     * @description Disable notifications.
     */
    async disableNotifications() {
        console.log('[Dev] 🛑 Starting Disable Notifications flow...');
        try {
            console.log('[Dev] 🛑 Step 1: Requesting disable confirmation from user...');
            const result = await Swal.fire({
                title: window.langu('notifications_disable_confirm_title'),
                text: window.langu('notifications_disable_confirm_text'),
                showCancelButton: true,
                buttonsStyling: false,
                customClass: {
                    popup: 'swal-modern-mini-popup',
                    title: 'swal-modern-mini-title',
                    htmlContainer: 'swal-modern-mini-text',
                    confirmButton: 'swal-modern-mini-confirm',
                    cancelButton: 'swal-modern-mini-cancel'
                },
                confirmButtonText: window.langu('logout_confirm_btn'),
                cancelButtonText: window.langu('alert_cancel_btn')
            });

            if (result.isConfirmed) {
                console.log('[Dev] 🛑 Step 2: Confirmed. Updating storage and UI...');
                localStorage.setItem('notifications_enabled', 'false');
                this.updateToggleUI(false);
                console.log('[Dev] 🛑 Step 3: Clearing FCM tokens locally and on server...');

                // Delete token from server to ensure actual stop
                const userKey = window.userSession?.user_key;
                if (userKey && typeof deleteTokenFromServer === 'function') {
                    await deleteTokenFromServer(userKey);
                }

                // Inform Android app about disablement via bridge
                if (window.Android && typeof window.Android.onNotificationsDisabled === 'function') {
                    try {
                        window.Android.onNotificationsDisabled();
                        console.log('[Dev] 📱 Notified Android app that notifications are disabled.');
                    } catch (e) {
                        console.error('[Dev] ❌ Error calling onNotificationsDisabled:', e);
                    }
                }

                localStorage.removeItem('fcm_token');
                localStorage.removeItem('android_fcm_key');
                Swal.fire({
                    title: window.langu('notifications_disabled_success'),
                    text: window.langu('notifications_disabled_desc'),
                    timer: 2000,
                    showConfirmButton: false,
                    buttonsStyling: false,
                    customClass: {
                        popup: 'swal-modern-mini-popup',
                        title: 'swal-modern-mini-title',
                        htmlContainer: 'swal-modern-mini-text'
                    }
                });
                console.log('[Dev] 🛑 Disablement completed successfully.');
            } else {
                console.log('[Dev] 🛑 Disablement cancelled, reverting toggle state.');
                if (this.elements.masterToggle) this.elements.masterToggle.checked = true;
            }
        } catch (error) {
            console.error('[Notifications Action] Error disabling notifications:', error);
        }
    }
});

// IMPORTANT NOTE: Automatic initialization (NotificationPage.init) has been removed from here
// to ensure notifications are not considered "read" just by loading the script files.
// NotificationPage.init() is now called only when notifications.html is loaded
// inside its dedicated container, ensuring counter accuracy.
