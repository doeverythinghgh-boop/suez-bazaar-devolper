/**
 * @file notifications-logic.js
 * @description منطق الفلترة، الإحصائيات، وإدارة الحالة لصفحة الإشعارات
 */

Object.assign(NotificationPage, {
    /**
     * @description تحميل الإعدادات من localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('notification_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                if (settings.filters) {
                    this.filters = { ...this.filters, ...settings.filters };
                    this.applyFilterValues();
                }
                if (settings.refreshSettings) {
                    this.refreshSettings.autoRefresh = settings.refreshSettings.autoRefresh;
                    this.updateAutoRefreshToggle();
                }
            }
        } catch (error) {
            console.warn('[Notifications Logic] خطأ في تحميل الإعدادات:', error);
        }
    },

    /**
     * @description حفظ الإعدادات في localStorage
     */
    saveSettings() {
        try {
            const settings = {
                filters: this.filters,
                refreshSettings: {
                    autoRefresh: this.refreshSettings.autoRefresh
                }
            };
            localStorage.setItem('notification_settings', JSON.stringify(settings));
        } catch (error) {
            console.warn('[Notifications Logic] خطأ في حفظ الإعدادات:', error);
        }
    },

    /**
     * @description تطبيق قيم الفلاتر على عناصر DOM
     */
    applyFilterValues() {
        try {
            if (this.elements.filterType) this.elements.filterType.value = this.filters.type;
            if (this.elements.filterStatus) this.elements.filterStatus.value = this.filters.status;
            if (this.elements.searchInput) this.elements.searchInput.value = this.filters.search;
            if (this.elements.sortSelect) this.elements.sortSelect.value = this.filters.sortBy;
        } catch (error) {
            console.error('[Notifications Logic] خطأ في تطبيق قيم الفلاتر:', error);
        }
    },

    /**
     * @description تحديث زر التحديث التلقائي
     */
    updateAutoRefreshToggle() {
        try {
            if (this.elements.autoRefreshToggle) {
                this.elements.autoRefreshToggle.checked = this.refreshSettings.autoRefresh;
                this.elements.autoRefreshToggle.nextElementSibling.textContent =
                    this.refreshSettings.autoRefresh ? 'مفعل' : 'معطل';
            }
        } catch (error) {
            console.error('[Notifications Logic] خطأ في تحديث زر التحديث التلقائي:', error);
        }
    },

    /**
     * @description تحديث إحصائيات الصفحة
     * @param {Array} notifications
     */
    updateStats(notifications) {
        try {
            const stats = {
                total: notifications.length,
                unread: notifications.filter(n => n.status === 'unread').length,
                sent: notifications.filter(n => n.type === 'sent').length,
                received: notifications.filter(n => n.type === 'received').length
            };

            this.state.stats = stats;

            if (this.elements.totalCountEl) this.elements.totalCountEl.textContent = stats.total;
            if (this.elements.unreadCountEl) this.elements.unreadCountEl.textContent = stats.unread;
            if (this.elements.sentCountEl) this.elements.sentCountEl.textContent = stats.sent;
            if (this.elements.receivedCountEl) this.elements.receivedCountEl.textContent = stats.received;

            if (window.GLOBAL_NOTIFICATIONS) {
                window.GLOBAL_NOTIFICATIONS.unreadCount = stats.unread;
                window.GLOBAL_NOTIFICATIONS.updateBrowserTitle();
                if (typeof window.GLOBAL_NOTIFICATIONS.notifyCountUpdate === 'function') {
                    window.GLOBAL_NOTIFICATIONS.notifyCountUpdate();
                }
            }
        } catch (error) {
            console.error('[Notifications Logic] خطأ في تحديث الإحصائيات:', error);
        }
    },

    /**
     * @description تطبيق الفلاتر
     */
    applyFilters() {
        try {
            let filtered = [...this.state.notifications];

            if (this.filters.type !== 'all') {
                filtered = filtered.filter(n => n.type === this.filters.type);
            }

            if (this.filters.status !== 'all') {
                filtered = filtered.filter(n => n.status === this.filters.status);
            }

            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                filtered = filtered.filter(n =>
                    (n.title && n.title.toLowerCase().includes(searchTerm)) ||
                    (n.body && n.body.toLowerCase().includes(searchTerm)) ||
                    (n.relatedUser && n.relatedUser.name && n.relatedUser.name.toLowerCase().includes(searchTerm))
                );
            }

            filtered.sort((a, b) => {
                const dateA = new Date(a.timestamp);
                const dateB = new Date(b.timestamp);
                return this.filters.sortBy === 'newest' ? dateB - dateA : dateA - dateB;
            });

            this.state.filteredNotifications = filtered;
            this.renderNotifications();
        } catch (error) {
            console.error('[Notifications Logic] خطأ في تطبيق الفلاتر:', error);
        }
    },

    /**
     * @description مسح جميع الفلاتر
     */
    clearFilters() {
        try {
            this.filters = {
                type: 'all',
                status: 'all',
                search: '',
                sortBy: 'newest'
            };
            this.applyFilterValues();
            this.applyFilters();
            this.saveSettings();
        } catch (error) {
            console.error('[Notifications Logic] خطأ في مسح الفلاتر:', error);
        }
    },

    /**
     * @description تحديث حالة الصفحة
     * @param {object} newState
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
    }
});
