/**
 * @file actions-permissions.js
 * @description Notification permission management and Master Toggle logic.
 */

Object.assign(NotificationPage, {
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
                const isAndroid = !!(window.Android);
                const hasPermission = ('Notification' in window && Notification.permission === 'granted') || isAndroid;

                console.log(`[Dev] 🔍 [MasterToggle] OS Permission granted? ${hasPermission} (Platform: ${isAndroid ? 'Android' : 'Web'})`);

                if (storedEnabled === 'true' && hasPermission) {
                    isEnabled = true;
                } else if (storedEnabled === 'true' && !hasPermission) {
                    console.warn('[Dev] ⚠️ [MasterToggle] Permission missing despite being enabled in storage.');
                    isEnabled = false;
                } else if (storedEnabled === 'false') {
                    isEnabled = false;
                } else {
                    isEnabled = hasPermission;
                }

                console.log(`[Dev] 🔍 [MasterToggle] Final Result: Toggle will be ${isEnabled ? 'ON' : 'OFF'}`);
                this.elements.masterToggle.checked = isEnabled;
                if (typeof this.updateToggleUI === 'function') this.updateToggleUI(isEnabled);
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
                await this.enableNotifications();
            } else {
                await this.disableNotifications();
            }
        } catch (error) {
            console.error('[Notifications Action] Error toggling notification status:', error);
            if (this.elements.masterToggle) {
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
                if (currentPermission === 'denied') {
                    if (window.Android && typeof window.Android.requestNotificationPermission === 'function') {
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

            if (typeof askForNotificationPermission === 'function') {
                await askForNotificationPermission();
            }

            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                if (permission === 'denied') {
                    throw new Error('Notification permission denied by user.');
                }
            }

            Swal.fire({ title: window.langu('notifications_enabling'), allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            if (typeof setupFCM === 'function') {
                await setupFCM();
                if (window.Android && typeof window.Android.onNotificationsEnabled === 'function') {
                    try {
                        window.Android.onNotificationsEnabled();
                    } catch (e) {
                        console.error('[Dev] ❌ Error calling onNotificationsEnabled:', e);
                    }
                }

                localStorage.setItem('notifications_enabled', 'true');
                if (typeof this.updateToggleUI === 'function') this.updateToggleUI(true);
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
                localStorage.setItem('notifications_enabled', 'false');
                if (typeof this.updateToggleUI === 'function') this.updateToggleUI(false);

                const userKey = window.userSession?.user_key;
                if (userKey && typeof deleteTokenFromServer === 'function') {
                    await deleteTokenFromServer(userKey);
                }

                if (window.Android && typeof window.Android.onNotificationsDisabled === 'function') {
                    try {
                        window.Android.onNotificationsDisabled();
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
            } else {
                if (this.elements.masterToggle) this.elements.masterToggle.checked = true;
            }
        } catch (error) {
            console.error('[Notifications Action] Error disabling notifications:', error);
        }
    }
});
