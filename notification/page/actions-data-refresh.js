/**
 * @file actions-data-refresh.js
 * @description Data operations (loading, deleting, marking as read) and auto-refresh logic.
 */

Object.assign(NotificationPage, {
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
                    if (this.state.filteredNotifications.length === 0) if (typeof this.showEmptyState === 'function') this.showEmptyState();
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
    }
});
