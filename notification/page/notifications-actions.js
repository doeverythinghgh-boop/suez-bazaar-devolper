/**
 * @file notifications-actions.js
 * @description العمليات الأساسية (DB, Events, Permissions) لصفحة الإشعارات
 */

Object.assign(NotificationPage, {
    /**
     * @description إعداد مستمعي الأحداث
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
                    console.log('[Notifications Action] حدث إشعار جديد:', event.detail);
                    if (!this.state || !this.elements || !this.elements.list) return;
                    await this.refreshNotifications();
                    if (!document.hidden && event.detail && event.detail.type === 'received') {
                        this.showToast(window.langu('notifications_new_received'), 'info');
                    }
                } catch (innerError) {
                    console.error('[Notifications Action] خطأ عند استقبال إشعار جديد:', innerError);
                }
            });

            document.addEventListener('visibilitychange', () => {
                try {
                    if (!document.hidden) this.refreshNotifications();
                } catch (innerError) {
                    console.error('[Notifications Action] خطأ عند تغيير حالة الظهور:', innerError);
                }
            });

            window.addEventListener('notificationDeleted', (event) => {
                console.log('[Notifications Action] تم حذف إشعار:', event.detail.id);
                this.refreshNotifications();
            });
        } catch (error) {
            console.error('[Notifications Action] خطأ في إعداد مستمعي الأحداث:', error);
        }
    },

    /**
     * @description إعداد العداد العالمي
     */
    setupGlobalCounter() {
        try {
            if (window.GLOBAL_NOTIFICATIONS) {
                window.GLOBAL_NOTIFICATIONS.onCountUpdate = (count) => {
                    if (this.elements.unreadCountEl) this.elements.unreadCountEl.textContent = count;
                };
            }
        } catch (error) {
            console.error('[Notifications Action] خطأ في إعداد العداد العالمي:', error);
        }
    },

    /**
     * @description تحميل الإشعارات من IndexedDB
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
            console.error('[Notifications Action] خطأ في جلب الإشعارات:', error);
            this.setState({
                isLoading: false,
                hasError: true,
                errorMessage: window.langu('notifications_error_desc')
            });
        }
    },

    /**
     * @description تحديث الإشعارات
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
            console.error('[Notifications Action] خطأ في تحديث الإشعارات:', error);
        }
    },

    /**
     * @description بدء التحديث التلقائي
     */
    startAutoRefresh() {
        try {
            this.stopAutoRefresh();
            if (this.refreshSettings.autoRefresh) {
                this.refreshSettings.refreshTimer = setInterval(() => this.refreshNotifications(), this.refreshSettings.refreshInterval);
                console.log('[Notifications Action] تم تفعيل التحديث التلقائي');
            }
        } catch (error) {
            console.error('[Notifications Action] خطأ في تشغيل التحديث التلقائي:', error);
        }
    },

    /**
     * @description إيقاف التحديث التلقائي
     */
    stopAutoRefresh() {
        try {
            if (this.refreshSettings.refreshTimer) {
                clearInterval(this.refreshSettings.refreshTimer);
                this.refreshSettings.refreshTimer = null;
                console.log('[Notifications Action] تم إيقاف التحديث التلقائي');
            }
        } catch (error) {
            console.error('[Notifications Action] خطأ في إيقاف التحديث التلقائي:', error);
        }
    },

    /**
     * @description حذف إشعار محدد
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
            console.error('[Notifications Action] خطأ في حذف الإشعار:', error);
            this.showToast(window.langu('notifications_delete_fail'), 'error');
        }
    },

    /**
     * @description تحديد جميع الإشعارات كمقروءة
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
            console.error('[Notifications Action] خطأ في تحديد الكل كمقروء:', error);
            if (!silent) this.showToast(window.langu('unexpected_error'), 'error');
        }
    },

    /**
     * @description تهيئة حالة مفتاح التحكم الرئيسي
     */
    initMasterToggle() {
        console.log('[Dev] 🔍 الخطوة 1: بدء تهيئة مفتاح التحكم الرئيسي للإشعارات...');
        try {
            if (this.elements.masterToggle) {
                const storedEnabled = localStorage.getItem('notifications_enabled');
                console.log(`[Dev] 🔍 [MasterToggle] القيمة المخزنة في localStorage هي: ${storedEnabled}`);
                let isEnabled = false;

                // فحص إذن النظام (OS Permission)
                // في الأندرويد، نعتمد أكثر على localStorage لأن التطبيق الأصلي يدير الأذونات
                const isAndroid = !!(window.Android);
                const hasPermission = ('Notification' in window && Notification.permission === 'granted') || isAndroid;

                console.log(`[Dev] 🔍 [MasterToggle] هل إذن المتصفح/النظام (OS Permission) ممنوح حالياً؟ ${hasPermission} (المنصة: ${isAndroid ? 'Android' : 'Web'})`);

                if (storedEnabled === 'true' && hasPermission) {
                    console.log('[Dev] ✅ [MasterToggle] الحالة: مفعل (مطابق للتخزين وإذن النظام)');
                    isEnabled = true;
                } else if (storedEnabled === 'true' && !hasPermission) {
                    console.warn('[Dev] ⚠️ [MasterToggle] الإذن مفقود بالرغم من ضبط التفعيل في التخزين.');
                    console.log('[Dev] ⚠️ [MasterToggle] الحالة: معطل (تجاهل التخزين بسبب نقص إذن النظام/المتصفح)');
                    isEnabled = false;
                } else if (storedEnabled === 'false') {
                    console.log('[Dev] 🚫 [MasterToggle] الحالة: معطل يدوياً من التخزين');
                    isEnabled = false;
                } else {
                    console.log(`[Dev] ℹ️ [MasterToggle] الحالة: أول مرة أو غير محددة، الاعتماد على الإذن الحالي (${hasPermission})`);
                    isEnabled = hasPermission;
                }

                console.log(`[Dev] 🔍 [MasterToggle] النتيجة النهائية: المفتاح سيكون ${isEnabled ? 'ON' : 'OFF'}`);
                this.elements.masterToggle.checked = isEnabled;
                this.updateToggleUI(isEnabled);
            }
        } catch (error) {
            console.error('[Notifications Action] خطأ في تهيئة مفتاح التحكم:', error);
        }
    },

    /**
     * @description تبديل حالة الإشعارات (تفعيل/تعطيل)
     */
    async toggleNotificationsStatus(isEnabled) {
        console.log(`[Dev] 🚀 الخطوة 1: طلب تغيير حالة الإشعارات إلى: ${isEnabled ? 'تفعيل' : 'تعطيل'}`);
        try {
            if (isEnabled) {
                console.log('[Dev] 🚀 الخطوة 2: استدعاء دالة enableNotifications...');
                await this.enableNotifications();
            } else {
                console.log('[Dev] 🚀 الخطوة 2: استدعاء دالة disableNotifications...');
                await this.disableNotifications();
            }
        } catch (error) {
            console.error('[Notifications Action] خطأ في تبديل حالة الإشعارات:', error);
            if (this.elements.masterToggle) {
                console.log('[Dev] ❌ فشل التغيير، إعادة حالة المفتاح...');
                this.elements.masterToggle.checked = !isEnabled;
            }
        }
    },

    /**
     * @description تفعيل الإشعارات
     */
    async enableNotifications() {
        console.log('[Dev] ⚙️ بدء عملية التفعيل (Enable Notifications)...');
        try {
            if ('Notification' in window) {
                const currentPermission = Notification.permission;
                console.log(`[Dev] ⚙️ الخطوة 1: فحص إذن المتصفح/النظام (System Permission). الحالة الحالية: ${currentPermission}`);
                if (currentPermission === 'denied') {
                    console.warn('[Dev] 🚫 إذن النظام مرفوض مسبقاً (Blocked at System Level)');
                    // [!IMPORTANT] BRIDGE CALL: Coordinate with Android's WebAppInterface.requestNotificationPermission.
                    if (window.Android && typeof window.Android.requestNotificationPermission === 'function') {
                        console.log('[Dev] ⚙️ الخطوة 1-A: بيئة أندرويد - جاري استدعاء طلب إذن النظام (OS Permission Request)...');
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
                        console.log('[Dev] ⚙️ الخطوة 1-B: بيئة ويب - لا يمكن طلب الإذن برمجياً بعد الرفض.');
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

            console.log('[Dev] ⚙️ الخطوة 2: إظهار رسالة جاري التفعيل للمستخدم...');
            Swal.fire({ title: window.langu('notifications_enabling'), allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            // طلب الصلاحيات (يدعم الويب وأندرويد)
            console.log('[Dev] ⚙️ الخطوة 3: طلب إذن الإشعارات (askForNotificationPermission)...');
            if (typeof askForNotificationPermission === 'function') {
                await askForNotificationPermission();
            } else if ('Notification' in window) {
                await Notification.requestPermission();
            }

            console.log('[Dev] ⚙️ الخطوة 5: استدعاء setupFCM() لبدء تهيئة التوكن...');
            if (typeof setupFCM === 'function') {
                await setupFCM();
                console.log('[Dev] ⚙️ الخطوة 6: تم اكتمال setupFCM بنجاح.');

                // إبلاغ تطبيق أندرويد بالتفعيل عبر الجسر البرمجي
                if (window.Android && typeof window.Android.onNotificationsEnabled === 'function') {
                    try {
                        window.Android.onNotificationsEnabled();
                        console.log('[Dev] 📱 تم إبلاغ تطبيق أندرويد بتفعيل الإشعارات.');
                    } catch (e) {
                        console.error('[Dev] ❌ خطأ في استدعاء onNotificationsEnabled:', e);
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
                throw new Error('نظام الإشعارات غير متوفر حالياً');
            }
        } catch (error) {
            console.error('[Notifications Action] فشل التفعيل:', error);
            console.log('[Dev] ❌ فشل التفعيل في مكان ما.');
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
     * @description تعطيل الإشعارات
     */
    async disableNotifications() {
        console.log('[Dev] 🛑 بدء عملية التعطيل (Disable Notifications)...');
        try {
            console.log('[Dev] 🛑 الخطوة 1: طلب تأكيد التعطيل من المستخدم...');
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
                console.log('[Dev] 🛑 الخطوة 2: تم التأكيد. جاري تحديث التخزين والواجهة...');
                localStorage.setItem('notifications_enabled', 'false');
                this.updateToggleUI(false);
                console.log('[Dev] 🛑 الخطوة 3: مسح توكنات FCM المحفوظة محلياً وعلى السيرفر...');

                // حذف التوكن من السيرفر لضمان التوقف الفعلي
                const userKey = window.userSession?.user_key;
                if (userKey && typeof deleteTokenFromServer === 'function') {
                    await deleteTokenFromServer(userKey);
                }

                // إبلاغ تطبيق أندرويد بالتعطيل عبر الجسر البرمجي
                if (window.Android && typeof window.Android.onNotificationsDisabled === 'function') {
                    try {
                        window.Android.onNotificationsDisabled();
                        console.log('[Dev] 📱 تم إبلاغ تطبيق أندرويد بتعطيل الإشعارات.');
                    } catch (e) {
                        console.error('[Dev] ❌ خطأ في استدعاء onNotificationsDisabled:', e);
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
                console.log('[Dev] 🛑 تم الانتهاء من التعطيل بنجاح.');
            } else {
                console.log('[Dev] 🛑 تم إلغاء التعطيل، استعادة حالة المفتاح.');
                if (this.elements.masterToggle) this.elements.masterToggle.checked = true;
            }
        } catch (error) {
            console.error('[Notifications Action] خطأ في تعطيل الإشعارات:', error);
        }
    }
});

// ملاحظة هامة: تم إزالة التهيئة التلقائية (NotificationPage.init) من هنا
// لضمان عدم اعتبار الإشعارات "مقروءة" بمجرد تحميل ملفات الجافاسكريبت.
// يتم استدعاء NotificationPage.init() الآن فقط عند تحميل ملف notifications.html
// داخل الحاوية المخصصة له، مما يضمن دقة العداد.
