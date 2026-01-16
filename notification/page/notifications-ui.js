/**
 * @file notifications-ui.js
 * @description UI functions for the notifications page (rendering, formatting, messages).
 */

Object.assign(NotificationPage, {
    /**
     * @description Update the toggle switch UI (texts) based on state.
     * @param {boolean} isEnabled 
     */
    updateToggleUI(isEnabled) {
        if (!this.elements.toggleTitle || !this.elements.toggleDesc) return;

        if (isEnabled) {
            this.elements.toggleTitle.textContent = window.langu('notification_enabled_title');
            this.elements.toggleTitle.style.color = 'var(--text-color-dark)';
            this.elements.toggleDesc.textContent = window.langu('notification_enabled_desc');
        } else {
            this.elements.toggleTitle.textContent = window.langu('notification_disabled_title');
            this.elements.toggleTitle.style.color = 'var(--text-color-medium)';
            this.elements.toggleDesc.textContent = window.langu('notification_disabled_desc');
        }
    },

    /**
     * @description Render notifications in the UI (WhatsApp-style layout).
     */
    renderNotifications() {
        try {
            if (!this.elements.list) return;

            // Show/hide different states
            if (this.state.isLoading) {
                this.showLoading();
                return;
            }

            if (this.state.hasError) {
                this.showError();
                return;
            }

            if (this.state.filteredNotifications.length === 0) {
                this.showEmptyState();
                return;
            }

            // Hide states
            this.hideAllStates();

            // Clear the list
            this.elements.list.innerHTML = '';

            let lastDateString = '';

            this.state.filteredNotifications.forEach(notification => {
                const date = new Date(notification.timestamp);
                const locale = window.app_language === 'ar' ? 'ar-EG' : 'en-US';
                const dateString = date.toLocaleDateString(locale, {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                });

                // Add date divider if different from previous
                if (dateString !== lastDateString) {
                    const divider = document.createElement('div');
                    divider.className = 'date-divider';
                    divider.innerHTML = `<span>${dateString}</span>`;
                    this.elements.list.appendChild(divider);
                    lastDateString = dateString;
                }

                const notificationElement = this.createNotificationElement(notification);
                this.elements.list.appendChild(notificationElement);
            });
        } catch (error) {
            console.error('[Notifications UI] Error rendering notifications:', error);
            this.showError(window.langu('notifications_init_error'));
        }
    },

    /**
     * @description Create a notification element (Chat bubble design).
     * @param {object} notification
     * @returns {HTMLElement}
     */
    createNotificationElement(notification) {
        try {
            const element = document.createElement('div');
            const typeClass = notification.type === 'sent' ? 'sent' : 'received';
            element.className = `notification-item ${typeClass}`;
            element.dataset.id = notification.id;

            const date = new Date(notification.timestamp);
            const locale = window.app_language === 'ar' ? 'ar-EG' : 'en-US';
            const timeString = date.toLocaleTimeString(locale, {
                hour: '2-digit', minute: '2-digit', hour12: true
            });

            const senderName = notification.type === 'sent' ? window.langu('notifications_sender_you') :
                (notification.relatedUser && notification.relatedUser.name ? notification.relatedUser.name : window.langu('notifications_sender_user'));

            const statusClass = notification.status === 'read' ? 'read' : 'unread';
            const statusIcon = notification.status === 'read' ? 'fa-check-double' : 'fa-check';

            element.innerHTML = `
                <div class="notification-header">
                    <span class="sender-name">${this.escapeHtml(senderName)}</span>
                </div>
                <div class="notification-body">
                    <p>${this.escapeHtml(notification.body || notification.title || '')}</p>
                </div>
                <div class="notification-meta">
                    <span class="notification-time">${timeString}</span>
                    <span class="read-status ${statusClass}" title="${window.langu('notifications_status_tooltip')}">
                        <i class="fas ${statusIcon}"></i>
                    </span>
                    <button class="delete-notification-btn" title="${window.langu('notifications_delete_tooltip')}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;

            // Add delete event listener
            const deleteBtn = element.querySelector('.delete-notification-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteNotification(notification.id, element);
                });
            }

            return element;
        } catch (error) {
            console.error('[Notifications UI] Error creating notification element:', error);
            const errDiv = document.createElement('div');
            errDiv.textContent = window.langu('notifications_init_error');
            return errDiv;
        }
    },

    /**
     * @description Show loading state.
     */
    showLoading() {
        this.hideAllStates();
        if (this.elements.loadingState) {
            this.elements.loadingState.style.display = 'block';
        }
        if (this.elements.list) {
            this.elements.list.style.display = 'none';
        }
    },

    /**
     * @description Show error state.
     * @param {string} [message]
     */
    showError(message) {
        this.hideAllStates();
        if (this.elements.errorState) {
            this.elements.errorState.style.display = 'block';
            if (message && this.elements.errorState.querySelector('.error-message')) {
                this.elements.errorState.querySelector('.error-message').textContent = message;
            }
        }
        if (this.elements.list) {
            this.elements.list.style.display = 'none';
        }
    },

    /**
     * @description Show empty state.
     */
    showEmptyState() {
        this.hideAllStates();
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'block';
        }
        if (this.elements.list) {
            this.elements.list.style.display = 'none';
        }
    },

    /**
     * @description Hide all states.
     */
    hideAllStates() {
        if (this.elements.loadingState) this.elements.loadingState.style.display = 'none';
        if (this.elements.errorState) this.elements.errorState.style.display = 'none';
        if (this.elements.emptyState) this.elements.emptyState.style.display = 'none';
        if (this.elements.list) this.elements.list.style.display = 'block';
    },

    /**
     * @description Show toast message.
     * @param {string} message
     * @param {string} type
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                    'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close">&times;</button>
        `;

        document.body.appendChild(toast);

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.remove();
        });

        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
    },

    /**
     * @description Format time ago since event.
     * @param {Date} date
     * @returns {string}
     */
    formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffDay > 0) return window.langu('time_days_ago').replace('{n}', diffDay);
        if (diffHour > 0) return window.langu('time_hours_ago').replace('{n}', diffHour);
        if (diffMin > 0) return window.langu('time_minutes_ago').replace('{n}', diffMin);
        return window.langu('time_now');
    },

    /**
     * @description Escape HTML to prevent injection.
     * @param {string} text
     * @returns {string}
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
