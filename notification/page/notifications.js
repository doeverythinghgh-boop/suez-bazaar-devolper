/**
 * @file notifications.js
 * @description منطق صفحة عرض الإشعارات
 */

// كائن إدارة صفحة الإشعارات
/**
 * @namespace NotificationPage
 */
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

            // تهيئة مفتاح التحكم الرئيسي
            this.initMasterToggle();

            console.log('[Notifications] تم تهيئة الصفحة بنجاح');
        } catch (error) {
            console.error('[Notifications] خطأ في التهيئة:', error);
            this.showError('خطأ في تهيئة صفحة الإشعارات');
        }
    },
    /**
     * @returns {Promise<void>}
     * @throws {Error} - If any error occurs during the initialization process.
     * @see initElements
     * @see loadSettings
     * @see setupEventListeners
     * @see setupGlobalCounter
     * @see loadNotifications
     * @see markAllAsRead
     * @see startAutoRefresh
     */

    /**
     * @description تهيئة عناصر DOM
     */
    initElements() {
        try {
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
                receivedCountEl: document.getElementById('received-count'),
                
                // مفتاح التحكم الجديد
                masterToggle: document.getElementById('notification-master-toggle'),
                toggleTitle: document.getElementById('toggle-title'),
                toggleDesc: document.getElementById('toggle-desc')
            };
        } catch (error) {
            console.error('[Notifications] خطأ في تهيئة العناصر:', error);
        }
    },
    /**
     * @returns {void}
     */

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
     * @returns {void}
     * @throws {Error} - If there's an error parsing the saved settings from LocalStorage.
     * @see applyFilterValues
     * @see updateAutoRefreshToggle
     */

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
     * @returns {void}
     * @throws {Error} - If there's an error saving settings to LocalStorage.
     */

    /**
     * @description تطبيق قيم الفلاتر على عناصر DOM
     */
    applyFilterValues() {
        try {
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
        } catch (error) {
            console.error('[Notifications] خطأ في تطبيق قيم الفلاتر:', error);
        }
    },
    /**
     * @returns {void}
     */

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
            console.error('[Notifications] خطأ في تحديث زر التحديث التلقائي:', error);
        }
    },
    /**
     * @returns {void}
     */

    /**
     * @description إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        try {
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

            // حدث مفتاح التحكم الرئيسي
            if (this.elements.masterToggle) {
                this.elements.masterToggle.addEventListener('change', async (e) => {
                    await this.toggleNotificationsStatus(e.target.checked);
                });
            }

            // حدث إضافة إشعار جديد
            window.addEventListener('notificationLogAdded', async (event) => {
                try {
                    console.log('[Notifications] حدث إشعار جديد:', event.detail);

                    // التحقق من أن الصفحة مهيأة ومفتوحة
                    if (!this.state || !this.elements || !this.elements.list) {
                        console.log('[Notifications] الصفحة غير مهيأة - تجاهل الحدث');
                        return;
                    }

                    // إعادة تحميل البيانات من قاعدة البيانات بدلاً من الإضافة المباشرة
                    // لتجنب التكرار (لأن notification-global.js يستمع لنفس الحدث)
                    await this.refreshNotifications();

                    // إظهار toast فقط للإشعارات المستلمة (received) وليس المرسلة (sent)
                    // وفقط إذا كانت الصفحة مفتوحة ومرئية
                    if (!document.hidden && event.detail && event.detail.type === 'received') {
                        this.showToast('تم استقبال إشعار جديد', 'info');
                    }
                } catch (innerError) {
                    console.error('[Notifications] خطأ عند استقبال إشعار جديد:', innerError);
                }
            });

            // تحديث عند عودة الصفحة للتركيز
            document.addEventListener('visibilitychange', () => {
                try {
                    if (!document.hidden) {
                        this.refreshNotifications();
                    }
                } catch (innerError) {
                    console.error('[Notifications] خطأ عند تغيير حالة الظهور:', innerError);
                }
            });

            // حدث حذف إشعار
            window.addEventListener('notificationDeleted', (event) => {
                console.log('[Notifications] تم حذف إشعار:', event.detail.id);
                this.refreshNotifications();
            });
        } catch (error) {
            console.error('[Notifications] خطأ في إعداد مستمعي الأحداث:', error);
        }
    },
    /**
     * @returns {void}
     * @throws {Error} - If an error occurs during event listener setup or callback execution.
     * @see applyFilters
     * @see saveSettings
     * @see refreshNotifications
     * @see startAutoRefresh
     * @see stopAutoRefresh
     * @see updateAutoRefreshToggle
     * @see markAllAsRead
     * @see clearFilters
     * @see showToast
     */

    /**
     * @description إعداد العداد العالمي
     */
    setupGlobalCounter() {
        try {
            if (window.GLOBAL_NOTIFICATIONS) {
                window.GLOBAL_NOTIFICATIONS.onCountUpdate = (count) => {
                    if (this.elements.unreadCountEl) {
                        this.elements.unreadCountEl.textContent = count;
                    }
                };
            }
        } catch (error) {
            console.error('[Notifications] خطأ في إعداد العداد العالمي:', error);
        }
    },
    /**
     * @returns {void}
     * @see window.GLOBAL_NOTIFICATIONS.onCountUpdate
     */

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
     * @returns {Promise<void>}
     * @throws {Error} - If there's an error initializing the DB or fetching notification logs.
     * @see initDB
     * @see getNotificationLogs
     * @see setState
     * @see updateStats
     * @see applyFilters
     */

    /**
     * @description تحديث الإشعارات
     * @async
     */
    async refreshNotifications() {
        try {
            if (this.state.isLoading) return;

            // إضافة تأثير للزر
            if (this.elements.refreshBtn) {
                this.elements.refreshBtn.classList.add('refreshing');
                setTimeout(() => {
                    this.elements.refreshBtn.classList.remove('refreshing');
                }, 1000);
            }

            await this.loadNotifications();
        } catch (error) {
            console.error('[Notifications] خطأ في تحديث الإشعارات:', error);
        }
    },
    /**
     * @returns {Promise<void>}
     * @throws {Error} - If `loadNotifications` fails.
     * @see loadNotifications
     */

    /**
     * @description بدء التحديث التلقائي
     */
    startAutoRefresh() {
        try {
            this.stopAutoRefresh(); // إيقاف أي مؤقت سابق

            if (this.refreshSettings.autoRefresh) {
                this.refreshSettings.refreshTimer = setInterval(() => {
                    this.refreshNotifications();
                }, this.refreshSettings.refreshInterval);

                console.log('[Notifications] تم تفعيل التحديث التلقائي');
            }
        } catch (error) {
            console.error('[Notifications] خطأ في تشغيل التحديث التلقائي:', error);
        }
    },
    /**
     * @returns {void}
     * @see stopAutoRefresh
     * @see refreshNotifications
     */

    /**
     * @description إيقاف التحديث التلقائي
     */
    stopAutoRefresh() {
        try {
            if (this.refreshSettings.refreshTimer) {
                clearInterval(this.refreshSettings.refreshTimer);
                this.refreshSettings.refreshTimer = null;
                console.log('[Notifications] تم إيقاف التحديث التلقائي');
            }
        } catch (error) {
            console.error('[Notifications] خطأ في إيقاف التحديث التلقائي:', error);
        }
    },
    /**
     * @returns {void}
     */

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
        } catch (error) {
            console.error('[Notifications] خطأ في تحديث الإحصائيات:', error);
        }
    },
    /**
     * @returns {void}
     * @see window.GLOBAL_NOTIFICATIONS.unreadCount
     * @see window.GLOBAL_NOTIFICATIONS.updateBrowserTitle
     * @see window.GLOBAL_NOTIFICATIONS.notifyCountUpdate
     */

    /**
     * @description تطبيق الفلاتر
     */
    applyFilters() {
        try {
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
        } catch (error) {
            console.error('[Notifications] خطأ في تطبيق الفلاتر:', error);
        }
    },
    /**
     * @returns {void}
     * @see renderNotifications
     */

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
            console.error('[Notifications] خطأ في مسح الفلاتر:', error);
        }
    },
    /**
     * @returns {void}
     * @see applyFilterValues
     * @see applyFilters
     * @see saveSettings
     */

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
        } catch (error) {
            console.error('[Notifications] خطأ في رسم الإشعارات:', error);
            this.showError('حدث خطأ أثناء عرض الإشعارات');
        }
    },
    /**
     * @returns {void}
     * @see showLoading
     * @see showError
     * @see showEmptyState
     * @see hideAllStates
     * @see createNotificationElement
     * @see escapeHtml
     */

    /**
     * @description إنشاء عنصر إشعار (تصميم فقاعة المحادثة)
     * @param {object} notification
     * @returns {HTMLElement}
     */
    createNotificationElement(notification) {
        try {
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
                    <button class="delete-notification-btn" title="حذف الرسالة">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;

            // إضافة مستمع حدث للنقر لتبديل الحالة (للمحاكاة)
            const statusEl = element.querySelector('.read-status');
            
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
            console.error('[Notifications] خطأ في إنشاء عنصر الإشعار:', error);
            const errDiv = document.createElement('div');
            errDiv.textContent = 'خطأ في عرض الإشعار';
            return errDiv;
        }
    },
    /**
     * @see escapeHtml
     */

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
     * @description حذف إشعار محدد
     * @param {number} id
     * @param {HTMLElement} element
     * @async
     */
    async deleteNotification(id, element) {
        try {
            const result = await Swal.fire({
                title: 'هل أنت متأكد؟',
                text: "سيتم حذف هذه الرسالة نهائياً من جهازك.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'نعم، احذفها',
                cancelButtonText: 'إلغاء',
                customClass: { popup: 'fullscreen-swal' }
            });

            if (result.isConfirmed) {
                // حذف من قاعدة البيانات
                if (typeof deleteNotificationFromDB === 'function') {
                    await deleteNotificationFromDB(id);
                }

                // حذف من الواجهة مع تأثير حركي
                element.style.transform = 'translateX(100px)';
                element.style.opacity = '0';
                
                setTimeout(() => {
                    element.remove();
                    // تحديث الحالة والإحصائيات
                    this.state.notifications = this.state.notifications.filter(n => n.id !== id);
                    this.state.filteredNotifications = this.state.filteredNotifications.filter(n => n.id !== id);
                    this.updateStats(this.state.notifications);
                    
                    // إظهار حالة فارغة إذا كانت آخر رسالة
                    if (this.state.filteredNotifications.length === 0) {
                        this.showEmptyState();
                    }
                }, 300);

                this.showToast('تم حذف الرسالة بنجاح', 'success');
            }
        } catch (error) {
            console.error('[Notifications] خطأ في حذف الإشعار:', error);
            this.showToast('فشل حذف الرسالة', 'error');
        }
    },
    /**
     * @returns {Promise<void>}
     * @throws {Error} - If there's an error updating the status in the database.
     * @see updateNotificationStatusInDB
     * @see updateStats
     * @see window.GLOBAL_NOTIFICATIONS.notifyCountUpdate
     */





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
     * @returns {Promise<void>}
     * @throws {Error} - If there's an error marking notifications as read in the database.
     * @see markAllNotificationsAsReadInDB
     * @see updateStats
     * @see showToast
     */

    /**
     * @description تحديث حالة الصفحة
     * @param {object} newState
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
    },
    /**
     * @returns {void}
     */

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
     * @returns {void}
     * @see hideAllStates
     */

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
     * @returns {void}
     * @see hideAllStates
     */

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
     * @returns {void}
     * @see hideAllStates
     */

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
     * @returns {void}
     */

    /**
     * @description إظهار رسالة toast
     * @param {string} message
     * @param {string} type
     */
    showToast(message, type = 'info') {
        // تشغيل صوت التنبيه
        //playNotificationSound();

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
     * @returns {void}
     */


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
     * @returns {string}
     */

    /**
     * @description تهيئة حالة مفتاح التحكم الرئيسي بناءً على localStorage وأذونات المتصفح
     */
    initMasterToggle() {
        console.log('[Dev] 🔍 الخطوة 1: بدء تهيئة مفتاح التحكم الرئيسي للإشعارات...');
        try {
            if (this.elements.masterToggle) {
                const storedEnabled = localStorage.getItem('notifications_enabled');
                console.log(`[Dev] 🔍 الخطوة 2: القيمة المخزنة في localStorage هي: ${storedEnabled}`);
                
                let isEnabled = false;

                // 1. التحقق من الإذن الفعلي للمتصفح أولاً
                const hasPermission = 'Notification' in window && Notification.permission === 'granted';
                console.log(`[Dev] 🔍 الخطوة 3: هل إذن المتصفح/النظام (OS Permission) ممنوح حالياً؟ ${hasPermission}`);

                if (storedEnabled === 'true' && hasPermission) {
                    console.log('[Dev] ✅ الحالة: مفعل (مطابق للتخزين وإذن النظام)');
                    isEnabled = true;
                } else if (storedEnabled === 'true' && !hasPermission) {
                    console.warn('[Notifications] الإذن مفقود بالرغم من ضبط التفعيل في التخزين.');
                    console.log('[Dev] ⚠️ الحالة: معطل (تجاهل التخزين بسبب نقص إذن النظام/المتصفح)');
                    isEnabled = false;
                } else if (storedEnabled === 'false') {
                    console.log('[Dev] 🚫 الحالة: معطل يدوياً من التخزين');
                    isEnabled = false;
                } else {
                    console.log('[Dev] ℹ️ الحالة: أول مرة، الاعتماد على الإذن الحالي');
                    isEnabled = hasPermission;
                }

                console.log(`[Dev] 🔍 الخطوة 4: تحديث واجهة المفتاح لتصبح: ${isEnabled ? 'ON' : 'OFF'}`);
                this.elements.masterToggle.checked = isEnabled;
                this.updateToggleUI(isEnabled);
            }
        } catch (error) {
            console.error('[Notifications] خطأ في تهيئة مفتاح التحكم:', error);
        }
    },

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
     * @description تبديل حالة الإشعارات (تفعيل/تعطيل)
     * @param {boolean} isEnabled 
     * @async
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
            console.error('[Notifications] خطأ في تبديل حالة الإشعارات:', error);
            // إعادة المفتاح لحالته السابقة عند الفشل
            if (this.elements.masterToggle) {
                console.log('[Dev] ❌ فشل التغيير، إعادة حالة المفتاح...');
                this.elements.masterToggle.checked = !isEnabled;
            }
        }
    },

    /**
     * @description تفعيل الإشعارات: طلب إذن ومزامنة التوكن
     * @async
     */
    async enableNotifications() {
        console.log('[Dev] ⚙️ بدء عملية التفعيل (Enable Notifications)...');
        try {
            // 1. فحص حالة الإذن الحالية
            if ('Notification' in window) {
                const currentPermission = Notification.permission;
                console.log(`[Dev] ⚙️ الخطوة 1: فحص إذن المتصفح/النظام (System Permission). الحالة الحالية: ${currentPermission}`);

                if (currentPermission === 'denied') {
                    console.warn('[Dev] 🚫 إذن النظام مرفوض مسبقاً (Blocked at System Level)');
                    // إذا كان مرفوضاً، نتحقق إذا كان أندرويد لإعادة الطلب برمجياً
                    if (window.Android && typeof window.Android.requestNotificationPermission === 'function') {
                        console.log('[Dev] ⚙️ الخطوة 1-A: بيئة أندرويد - جاري استدعاء طلب إذن النظام (OS Permission Request)...');
                        window.Android.requestNotificationPermission();
                        // ننتظر قليلاً ثم ننهي الدالة لأن الطلب سيحدث في النظام
                        Swal.fire({
                            icon: 'info',
                            title: 'إذن النظام مطلوب',
                            text: 'يرجى السماح بالإشعارات من نافذة النظام التي ستظهر الآن.',
                            confirmButtonText: 'حسناً'
                        });
                        if (this.elements.masterToggle) this.elements.masterToggle.checked = false;
                        return;
                    } else {
                        console.log('[Dev] ⚙️ الخطوة 1-B: بيئة ويب - لا يمكن طلب الإذن برمجياً بعد الرفض.');
                        // في الويب، لا يمكن إعادة طلب الإذن إذا تم رفضه (Blocked)
                        Swal.fire({
                            icon: 'warning',
                            title: 'الإشعارات محظورة',
                            html: 'لقد قمت بحظر الإشعارات مسبقاً. يرجى فك الحظر من <b>إعدادات المتصفح</b> (أيقونة القفل بجانب الرابط) لتتمكن من استقبال التنبيهات.',
                            confirmButtonText: 'فهمت'
                        });
                        if (this.elements.masterToggle) this.elements.masterToggle.checked = false;
                        return;
                    }
                }
            }

            console.log('[Dev] ⚙️ الخطوة 2: إظهار رسالة جاري التفعيل للمستخدم...');
            Swal.fire({
                title: 'جاري تفعيل الإشعارات...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // 2. طلب الإذن (في حال لم يتم منحه ولم يكن محظوراً)
            if ('Notification' in window) {
                console.log('[Dev] ⚙️ الخطوة 3: استدعاء Notification.requestPermission()...');
                const permission = await Notification.requestPermission();
                console.log(`[Dev] ⚙️ الخطوة 4: نتيجة طلب الإذن: ${permission}`);
                if (permission !== 'granted') {
                    throw new Error('تم رفض إذن الإشعارات من المتصفح');
                }
            }

            // 3. تفعيل FCM (سيقوم بجلب التوكن وإرساله للسيرفر)
            console.log('[Dev] ⚙️ الخطوة 5: استدعاء setupFCM() لبدء تهيئة التوكن...');
            if (typeof setupFCM === 'function') {
                await setupFCM();
                console.log('[Dev] ⚙️ الخطوة 6: تم اكتمال setupFCM بنجاح.');
                localStorage.setItem('notifications_enabled', 'true');
                this.updateToggleUI(true);
                
                Swal.fire({
                    icon: 'success',
                    title: 'تم التفعيل',
                    text: 'ستصلك الإشعارات فور صدورها',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                throw new Error('نظام الإشعارات غير متوفر حالياً');
            }
        } catch (error) {
            console.error('[Notifications] فشل التفعيل:', error);
            console.log('[Dev] ❌ فشل التفعيل في مكان ما، مراجعة الخطوات السابقة.');
            Swal.fire({
                icon: 'error',
                title: 'فشل التفعيل',
                text: error.message || 'حدث خطأ أثناء محاولة تفعيل الإشعارات'
            });
            if (this.elements.masterToggle) this.elements.masterToggle.checked = false;
        }
    },

    /**
     * @description تعطيل الإشعارات: مسح التوكن محلياً وعالمياً
     * @async
     */
    async disableNotifications() {
        console.log('[Dev] 🛑 بدء عملية التعطيل (Disable Notifications)...');
        try {
            console.log('[Dev] 🛑 الخطوة 1: طلب تأكيد التعطيل من المستخدم...');
            const result = await Swal.fire({
                title: 'هل تريد تعطيل الإشعارات؟',
                text: 'لن تصلك تنبيهات بخصوص الرسائل الجديدة',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'نعم، قم بالتعطيل',
                cancelButtonText: 'إلغاء'
            });

            if (result.isConfirmed) {
                console.log('[Dev] 🛑 الخطوة 2: تم التأكيد. جاري تحديث التخزين والواجهة...');
                localStorage.setItem('notifications_enabled', 'false');
                this.updateToggleUI(false);
                
                // مسح التوكن محلياً لضمان عدم استخدامه
                console.log('[Dev] 🛑 الخطوة 3: مسح توكنات FCM المحفوظة محلياً (fcm_token, android_fcm_key)...');
                localStorage.removeItem('fcm_token');
                localStorage.removeItem('android_fcm_key');

                Swal.fire({
                    icon: 'success',
                    title: 'تم التعطيل',
                    text: 'تم إيقاف استقبال الإشعارات على هذا الجهاز',
                    timer: 2000,
                    showConfirmButton: false
                });
                console.log('[Dev] 🛑 تم الانتهاء من التعطيل بنجاح.');
            } else {
                console.log('[Dev] 🛑 تم إلغاء التعطيل من قبل المستخدم، استعادة حالة المفتاح.');
                // إعادة المفتاح لوضع التفعيل إذا ألغى المستخدم
                if (this.elements.masterToggle) this.elements.masterToggle.checked = true;
            }
        } catch (error) {
            console.error('[Notifications] خطأ في تعطيل الإشعارات:', error);
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
/**
 * @returns {string}
 */

// تهيئة الصفحة عند تحميل DOM
/**
 * @description Automatically initializes the `NotificationPage` controller when the DOM is fully loaded.
 * This ensures the notification page is set up as soon as possible.
 * @throws {Error} - If `NotificationPage.init()` fails during execution.
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        NotificationPage.init();
    });
} else {
    NotificationPage.init();
}