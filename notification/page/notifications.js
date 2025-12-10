/**
 * @file notifications.js
 * @description منطق صفحة عرض الإشعارات
 */

// كائن إدارة صفحة الإشعارات
const NotificationPage = {
    /**
     * @description البيانات الحالية للصفحة
     * @type {object}
     */
    state: {
        notifications: [],
        filteredNotifications: [],
        isLoading: false,
        hasError: false,
        errorMessage: '',
        totalCount: 0,
        stats: {
            total: 0,
            unread: 0,
            sent: 0,
            received: 0
        }
    },

    /**
     * @description إعدادات التصفية
     * @type {object}
     */
    filters: {
        type: 'all',        // all, sent, received
        status: 'all',      // all, read, unread
        search: '',         // نص البحث
        sortBy: 'newest'    // newest, oldest
    },

    /**
     * @description إعدادات التحديث
     * @type {object}
     */
    refreshSettings: {
        autoRefresh: true,
        refreshInterval: 30000, // 30 ثانية
        refreshTimer: null
    },

    /**
     * @description عناصر DOM
     * @type {object}
     */
    elements: {},

    /**
     * @description تهيئة الصفحة
     * @async
     */
    async init() {
        console.log('[Notifications] تهيئة صفحة الإشعارات...');

        try {
            // تهيئة عناصر DOM
            this.initElements();

            // تحميل الإعدادات المحفوظة
            this.loadSettings();

            // إعداد مستمعي الأحداث
            this.setupEventListeners();

            // إعداد العداد العالمي
            this.setupGlobalCounter();

            // تحديث العداد العالمي عند فتح الصفحة
            if (window.GLOBAL_NOTIFICATIONS) {
                window.GLOBAL_NOTIFICATIONS.resetCounter();
            }

            // تحميل الإشعارات الأولى
            await this.loadNotifications();

            // جعل جميع الإشعارات مقروءة تلقائياً عند فتح الصفحة
            await this.markAllAsRead(true);



            // بدء التحديث التلقائي
            this.startAutoRefresh();

            console.log('[Notifications] تم تهيئة الصفحة بنجاح');
        } catch (error) {
            console.error('[Notifications] خطأ في التهيئة:', error);
            this.showError('خطأ في تهيئة صفحة الإشعارات');
        }
    },

    /**
     * @description تهيئة عناصر DOM
     */
    initElements() {
        this.elements = {
            // الحاويات
            container: document.getElementById('notifications-container'),
            list: document.getElementById('notifications-list'),
            stats: document.getElementById('notifications-stats'),
            emptyState: document.getElementById('empty-state'),
            loadingState: document.getElementById('loading-state'),
            errorState: document.getElementById('error-state'),

            // أدوات التحكم
            filterType: document.getElementById('filter-type'),
            filterStatus: document.getElementById('filter-status'),
            searchInput: document.getElementById('search-input'),
            sortSelect: document.getElementById('sort-select'),
            refreshBtn: document.getElementById('refresh-btn'),
            autoRefreshToggle: document.getElementById('auto-refresh-toggle'),
            markAllReadBtn: document.getElementById('mark-all-read-btn'),
            clearFiltersBtn: document.getElementById('clear-filters-btn'),

            // الإحصائيات
            totalCountEl: document.getElementById('total-count'),
            unreadCountEl: document.getElementById('unread-count'),
            sentCountEl: document.getElementById('sent-count'),
            receivedCountEl: document.getElementById('received-count')
        };
    },

    /**
     * @description تحميل الإعدادات من localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('notification_settings');
            if (saved) {
                const settings = JSON.parse(saved);

                // تطبيق الإعدادات
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
            console.warn('[Notifications] خطأ في تحميل الإعدادات:', error);
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
            console.warn('[Notifications] خطأ في حفظ الإعدادات:', error);
        }
    },

    /**
     * @description تطبيق قيم الفلاتر على عناصر DOM
     */
    applyFilterValues() {
        if (this.elements.filterType) {
            this.elements.filterType.value = this.filters.type;
        }
        if (this.elements.filterStatus) {
            this.elements.filterStatus.value = this.filters.status;
        }
        if (this.elements.searchInput) {
            this.elements.searchInput.value = this.filters.search;
        }
        if (this.elements.sortSelect) {
            this.elements.sortSelect.value = this.filters.sortBy;
        }
    },

    /**
     * @description تحديث زر التحديث التلقائي
     */
    updateAutoRefreshToggle() {
        if (this.elements.autoRefreshToggle) {
            this.elements.autoRefreshToggle.checked = this.refreshSettings.autoRefresh;
            this.elements.autoRefreshToggle.nextElementSibling.textContent =
                this.refreshSettings.autoRefresh ? 'مفعل' : 'معطل';
        }
    },

    /**
     * @description إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // أحداث التصفية
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
            // بحث فوري مع debounce
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

        // أحداث الأزرار
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

        // حدث إضافة إشعار جديد
        window.addEventListener('notificationLogAdded', async (event) => {
            console.log('[Notifications] حدث إشعار جديد:', event.detail);
            // إعادة تحميل البيانات من قاعدة البيانات بدلاً من الإضافة المباشرة
            // لتجنب التكرار (لأن notification-global.js يستمع لنفس الحدث)
            await this.refreshNotifications();

            // إظهار toast فقط للإشعارات المستلمة (received) وليس المرسلة (sent)
            if (!document.hidden && event.detail && event.detail.type === 'received') {
                this.showToast('تم استقبال إشعار جديد', 'info');
            }
        });

        // تحديث عند عودة الصفحة للتركيز
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshNotifications();
            }
        });
    },

    /**
     * @description إعداد العداد العالمي
     */
    setupGlobalCounter() {
        if (window.GLOBAL_NOTIFICATIONS) {
            window.GLOBAL_NOTIFICATIONS.onCountUpdate = (count) => {
                if (this.elements.unreadCountEl) {
                    this.elements.unreadCountEl.textContent = count;
                }
            };
        }
    },

    /**
     * @description تحميل الإشعارات من IndexedDB
     * @async
     */
    async loadNotifications() {
        this.setState({ isLoading: true, hasError: false });

        try {
            // التأكد من تهيئة قاعدة البيانات
            if (typeof initDB === 'function') {
                await initDB();
            }

            // جلب الإشعارات
            const notifications = await getNotificationLogs('all', 1000);

            // تحديث الحالة
            this.setState({
                notifications: notifications,
                isLoading: false,
                hasError: false
            });

            // تحديث الإحصائيات
            this.updateStats(notifications);

            // تطبيق الفلاتر
            this.applyFilters();

        } catch (error) {
            console.error('[Notifications] خطأ في جلب الإشعارات:', error);
            this.setState({
                isLoading: false,
                hasError: true,
                errorMessage: 'فشل في تحميل الإشعارات. تأكد من اتصالك بالإنترنت.'
            });
        }
    },

    /**
     * @description تحديث الإشعارات
     * @async
     */
    async refreshNotifications() {
        if (this.state.isLoading) return;

        // إضافة تأثير للزر
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.classList.add('refreshing');
            setTimeout(() => {
                this.elements.refreshBtn.classList.remove('refreshing');
            }, 1000);
        }

        await this.loadNotifications();
    },

    /**
     * @description بدء التحديث التلقائي
     */
    startAutoRefresh() {
        this.stopAutoRefresh(); // إيقاف أي مؤقت سابق

        if (this.refreshSettings.autoRefresh) {
            this.refreshSettings.refreshTimer = setInterval(() => {
                this.refreshNotifications();
            }, this.refreshSettings.refreshInterval);

            console.log('[Notifications] تم تفعيل التحديث التلقائي');
        }
    },

    /**
     * @description إيقاف التحديث التلقائي
     */
    stopAutoRefresh() {
        if (this.refreshSettings.refreshTimer) {
            clearInterval(this.refreshSettings.refreshTimer);
            this.refreshSettings.refreshTimer = null;
            console.log('[Notifications] تم إيقاف التحديث التلقائي');
        }
    },

    /**
     * @description تحديث إحصائيات الصفحة
     * @param {Array} notifications
     */
    updateStats(notifications) {
        const stats = {
            total: notifications.length,
            unread: notifications.filter(n => n.status === 'unread').length,
            sent: notifications.filter(n => n.type === 'sent').length,
            received: notifications.filter(n => n.type === 'received').length
        };

        this.state.stats = stats;

        // تحديث واجهة المستخدم
        if (this.elements.totalCountEl) {
            this.elements.totalCountEl.textContent = stats.total;
        }
        if (this.elements.unreadCountEl) {
            this.elements.unreadCountEl.textContent = stats.unread;
        }
        if (this.elements.sentCountEl) {
            this.elements.sentCountEl.textContent = stats.sent;
        }
        if (this.elements.receivedCountEl) {
            this.elements.receivedCountEl.textContent = stats.received;
        }

        // تحديث العداد العالمي
        if (window.GLOBAL_NOTIFICATIONS) {
            window.GLOBAL_NOTIFICATIONS.unreadCount = stats.unread;
            window.GLOBAL_NOTIFICATIONS.updateBrowserTitle();
            // تحديث شارة التنبيهات أيضاً
            if (typeof window.GLOBAL_NOTIFICATIONS.notifyCountUpdate === 'function') {
                window.GLOBAL_NOTIFICATIONS.notifyCountUpdate();
            }
        }
    },

    /**
     * @description تطبيق الفلاتر
     */
    applyFilters() {
        let filtered = [...this.state.notifications];

        // فلترة حسب النوع
        if (this.filters.type !== 'all') {
            filtered = filtered.filter(n => n.type === this.filters.type);
        }

        // فلترة حسب الحالة
        if (this.filters.status !== 'all') {
            filtered = filtered.filter(n => n.status === this.filters.status);
        }

        // فلترة حسب البحث
        if (this.filters.search) {
            const searchTerm = this.filters.search.toLowerCase();
            filtered = filtered.filter(n =>
                (n.title && n.title.toLowerCase().includes(searchTerm)) ||
                (n.body && n.body.toLowerCase().includes(searchTerm)) ||
                (n.relatedUser && n.relatedUser.name && n.relatedUser.name.toLowerCase().includes(searchTerm))
            );
        }

        // ترتيب النتائج
        filtered.sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            return this.filters.sortBy === 'newest' ? dateB - dateA : dateA - dateB;
        });

        this.state.filteredNotifications = filtered;
        this.renderNotifications();
    },

    /**
     * @description مسح جميع الفلاتر
     */
    clearFilters() {
        this.filters = {
            type: 'all',
            status: 'all',
            search: '',
            sortBy: 'newest'
        };

        this.applyFilterValues();
        this.applyFilters();
        this.saveSettings();
    },

    /**
     * @description عرض الإشعارات في واجهة المستخدم (تخطيط واتساب)
     */
    renderNotifications() {
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
            // ملاحظة: مع "الأحدث أولاً"، التواريخ ستكون تنازلية. الفواصل ستظهر عند تغير اليوم.
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

        // التمرير لأسفل القائمة (اختياري، لكن في واتساب يتم التمرير للأحدث)
        // في حالتنا "الأحدث في الأعلى"، لذا لا داعي للتمرير.
    },

    /**
     * @description إنشاء عنصر إشعار (تصميم فقاعة المحادثة)
     * @param {object} notification
     * @returns {HTMLElement}
     */
    createNotificationElement(notification) {
        const element = document.createElement('div');
        // تحديد الكلاس بناءً على النوع (مرسل/مستلم)
        const typeClass = notification.type === 'sent' ? 'sent' : 'received';
        element.className = `notification-item ${typeClass}`;
        element.dataset.id = notification.id;

        // تنسيق الوقت (ساعة:دقيقة ص/م)
        const date = new Date(notification.timestamp);
        const timeString = date.toLocaleTimeString('ar-EG', {
            hour: '2-digit', minute: '2-digit', hour12: true
        });

        // اسم المرسل/المستخدم
        const senderName = notification.type === 'sent' ? 'أنت' :
            (notification.relatedUser && notification.relatedUser.name ? notification.relatedUser.name : 'مستخدم');

        // حالة القراءة (للمرسل فقط أو للكل حسب الرغبة، في واتساب تظهر للمرسل)
        // سنظهرها للكل هنا لتوفير وظيفة "التبديل"
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
            </div>
        `;

        // إضافة مستمع حدث للنقر لتبديل الحالة (للمحاكاة)
        const statusEl = element.querySelector('.read-status');


        return element;
    },

    /**
     * @description تحديث حالة الإشعار (مقروء/غير مقروء)
     * @param {number} id
     * @param {string} newStatus ('read' | 'unread')
     * @param {HTMLElement} element
     * @async
     */
    async updateNotificationStatus(id, newStatus, element) {
        try {
            console.log(`[Notifications] تحديث حالة الإشعار ${id} إلى ${newStatus}`);

            // تحديث في قاعدة البيانات 
            if (typeof updateNotificationStatusInDB === 'function') {
                await updateNotificationStatusInDB(id, newStatus);
            }

            // تحديث الواجهة (إذا لم يتم تحديثها بالفعل من قبل المستدعي)
            const statusSpan = element.querySelector('.read-status');
            const icon = element.querySelector('.read-status i');

            if (statusSpan && icon) {
                if (newStatus === 'read') {
                    statusSpan.classList.remove('unread');
                    statusSpan.classList.add('read');
                    icon.className = 'fas fa-check-double';
                    statusSpan.title = 'مقروء';
                } else {
                    statusSpan.classList.remove('read');
                    statusSpan.classList.add('unread');
                    icon.className = 'fas fa-check';
                    statusSpan.title = 'غير مقروء';
                }
            }

            // تحديث البيانات المحلية في المصفوفة
            const notifIndex = this.state.notifications.findIndex(n => n.id === id);
            if (notifIndex > -1) {
                this.state.notifications[notifIndex].status = newStatus;
                this.updateStats(this.state.notifications);

                // تحديث الشارة فوراً لضمان التزامن
                if (window.GLOBAL_NOTIFICATIONS) {
                    window.GLOBAL_NOTIFICATIONS.notifyCountUpdate();
                }
            }

        } catch (error) {
            console.error('[Notifications] خطأ في تحديث حالة الإشعار:', error);
            // لا نظهر خطأ للمستخدم هنا لأن التغيير البصري قد حدث بالفعل
        }
    },





    /**
     * @description تحديد جميع الإشعارات كمقروءة
     * @async
     */
    /**
     * @description تحديد جميع الإشعارات كمقروءة
     * @param {boolean} silent - إذا كانت true لا يطلب تأكيد ولا يظهر toast
     * @async
     */
    async markAllAsRead(silent = false) {
        if (!silent && !confirm('هل تريد تحديد جميع الإشعارات كمقروءة؟')) return;

        try {
            // تحديث في قاعدة البيانات (دفعة واحدة)
            if (typeof markAllNotificationsAsReadInDB === 'function') {
                await markAllNotificationsAsReadInDB();
            }

            // تحديث الحالة الداخلية
            this.state.notifications.forEach(n => n.status = 'read');

            // تحديث الواجهة (DOM) مباشرة لتعكس التغيير
            if (this.elements.list) {
                const unreadItems = this.elements.list.querySelectorAll('.notification-item.unread, .read-status.unread');
                unreadItems.forEach(el => {
                    el.classList.remove('unread');
                    el.classList.add('read');
                    if (el.classList.contains('read-status')) {
                        const icon = el.querySelector('i');
                        if (icon) icon.className = 'fas fa-check-double';
                    }
                });

                // تحديث الـ item نفسه إذا كان لديه كلاس unread
                this.elements.list.querySelectorAll('.notification-item.unread').forEach(el => {
                    el.classList.remove('unread');
                });
            }

            // تحديث الإحصائيات (تصفير غير المقروء)
            this.state.stats.unread = 0;
            if (this.elements.unreadCountEl) {
                this.elements.unreadCountEl.textContent = '0';
            }

            // تحديث الإحصائيات العامة
            this.updateStats(this.state.notifications);

            // إظهار رسالة نجاح إذا لم يكن صامتاً
            if (!silent) this.showToast('تم تحديد جميع الإشعارات كمقروءة', 'success');

        } catch (error) {
            console.error('[Notifications] خطأ في تحديد الكل كمقروء:', error);
            if (!silent) this.showToast('حدث خطأ أثناء العملية', 'error');
        }
    },

    /**
     * @description تحديث حالة الصفحة
     * @param {object} newState
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
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
        if (this.elements.loadingState) {
            this.elements.loadingState.style.display = 'none';
        }
        if (this.elements.errorState) {
            this.elements.errorState.style.display = 'none';
        }
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'none';
        }
        if (this.elements.list) {
            this.elements.list.style.display = 'block';
        }
    },

    /**
     * @description إظهار رسالة toast
     * @param {string} message
     * @param {string} type
     */
    showToast(message, type = 'info') {
        // تشغيل صوت التنبيه
        this.playNotificationSound(type);

        // إنشاء عنصر toast
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

        // إضافة إلى الصفحة
        document.body.appendChild(toast);

        // إضافة مستمعي الأحداث
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.remove();
        });

        // إزالة تلقائية بعد 3 ثوان
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
    },

    /**
     * @description تشغيل صوت تنبيه باستخدام Web Audio API
     * @param {string} type - نوع الإشعار (info, success, error)
     */
    playNotificationSound(type = 'info') {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // تحديد التردد بناءً على نوع الإشعار
            if (type === 'error') {
                oscillator.frequency.value = 400; // صوت منخفض للأخطاء
            } else if (type === 'success') {
                oscillator.frequency.value = 800; // صوت عالي للنجاح
            } else {
                oscillator.frequency.value = 600; // صوت متوسط للمعلومات
            }

            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.warn('[Notifications] لا يمكن تشغيل الصوت:', error);
        }
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

        if (diffDay > 0) {
            return `قبل ${diffDay} يوم`;
        } else if (diffHour > 0) {
            return `قبل ${diffHour} ساعة`;
        } else if (diffMin > 0) {
            return `قبل ${diffMin} دقيقة`;
        } else {
            return 'الآن';
        }
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
};

// تهيئة الصفحة عند تحميل DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        NotificationPage.init();
    });
} else {
    NotificationPage.init();
}