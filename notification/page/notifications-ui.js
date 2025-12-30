/**
 * @file notifications-ui.js
 * @description وظائف واجهة المستخدم لصفحة الإشعارات (رسم، تنسيق، رسائل)
 */

Object.assign(NotificationPage, {
    /**
     * @description تحديث واجهة مفتاح التحكم (النصوص) بناءً على الحالة
     * @param {boolean} isEnabled 
     */
    updateToggleUI(isEnabled) {
        if (!this.elements.toggleTitle || !this.elements.toggleDesc) return;

        if (isEnabled) {
            this.elements.toggleTitle.textContent = 'الإشعارات مفعلة';
            this.elements.toggleTitle.style.color = 'var(--text-color-dark)';
            this.elements.toggleDesc.textContent = 'ستصلك تنبيهات الرسائل وتحديثات طلباتك فور صدورها.';
        } else {
            this.elements.toggleTitle.textContent = 'تفعيل الإشعارات';
            this.elements.toggleTitle.style.color = 'var(--text-color-medium)';
            this.elements.toggleDesc.textContent = 'قم بالتفعيل لاستلام تنبيهات الرسائل والتحديثات الخاصة بطلباتك.';
        }
    },

    /**
     * @description عرض الإشعارات في واجهة المستخدم (تخطيط واتساب)
     */
    renderNotifications() {
        try {
            if (!this.elements.list) return;

            // إظهار/إخفاء الحالات المختلفة
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

            // إخفاء الحالات
            this.hideAllStates();

            // تنظيف القائمة
            this.elements.list.innerHTML = '';

            let lastDateString = '';

            this.state.filteredNotifications.forEach(notification => {
                const date = new Date(notification.timestamp);
                const dateString = date.toLocaleDateString('ar-EG', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                });

                // إضافة فاصل التاريخ إذا اختلف عن السابق
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
            console.error('[Notifications UI] خطأ في رسم الإشعارات:', error);
            this.showError('حدث خطأ أثناء عرض الإشعارات');
        }
    },

    /**
     * @description إنشاء عنصر إشعار (تصميم فقاعة المحادثة)
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
            const timeString = date.toLocaleTimeString('ar-EG', {
                hour: '2-digit', minute: '2-digit', hour12: true
            });

            const senderName = notification.type === 'sent' ? 'أنت' :
                (notification.relatedUser && notification.relatedUser.name ? notification.relatedUser.name : 'مستخدم');

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
                    <span class="read-status ${statusClass}" title="تغيير الحالة">
                        <i class="fas ${statusIcon}"></i>
                    </span>
                    <button class="delete-notification-btn" title="حذف الرسالة">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;

            // إضافة مستمع حدث للحذف
            const deleteBtn = element.querySelector('.delete-notification-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteNotification(notification.id, element);
                });
            }

            return element;
        } catch (error) {
            console.error('[Notifications UI] خطأ في إنشاء عنصر الإشعار:', error);
            const errDiv = document.createElement('div');
            errDiv.textContent = 'خطأ في عرض الإشعار';
            return errDiv;
        }
    },

    /**
     * @description إظهار حالة التحميل
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
     * @description إظهار حالة الخطأ
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
     * @description إظهار حالة فارغة
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
     * @description إخفاء جميع الحالات
     */
    hideAllStates() {
        if (this.elements.loadingState) this.elements.loadingState.style.display = 'none';
        if (this.elements.errorState) this.elements.errorState.style.display = 'none';
        if (this.elements.emptyState) this.elements.emptyState.style.display = 'none';
        if (this.elements.list) this.elements.list.style.display = 'block';
    },

    /**
     * @description إظهار رسالة toast
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
     * @description تنسيق الوقت منذ الحدث
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

        if (diffDay > 0) return `قبل ${diffDay} يوم`;
        if (diffHour > 0) return `قبل ${diffHour} ساعة`;
        if (diffMin > 0) return `قبل ${diffMin} دقيقة`;
        return 'الآن';
    },

    /**
     * @description حماية النص من HTML Injection
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
