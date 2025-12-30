/**
 * @file notifications.js
 * @description الملف الأساسي (Core) لمنطق صفحة الإشعارات
 *   يعمل هذا الملف كمنسق للوحدات البرمجية الأخرى (UI, Logic, Actions)
 */

/**
 * @namespace NotificationPage
 * @description الكائن الرئيسي المسؤول عن إدارة صفحة الإشعارات
 */
const NotificationPage = {
    /**
     * @description البيانات الحالية للصفحة
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
     */
    filters: {
        type: 'all',        // all, sent, received
        status: 'all',      // all, read, unread
        search: '',         // نص البحث
        sortBy: 'newest'    // newest, oldest
    },

    /**
     * @description إعدادات التحديث
     */
    refreshSettings: {
        autoRefresh: true,
        refreshInterval: 30000,
        refreshTimer: null
    },

    /**
     * @description عناصر DOM
     */
    elements: {},

    /**
     * @description تهيئة الصفحة
     */
    async init() {
        console.log('[Notifications Core] بدء تهيئة صفحة الإشعارات...');
        try {
            this.initElements();
            this.loadSettings();
            this.setupEventListeners();
            this.setupGlobalCounter();

            if (window.GLOBAL_NOTIFICATIONS) {
                window.GLOBAL_NOTIFICATIONS.resetCounter();
            }

            await this.loadNotifications();
            
            // جعل جميع الإشعارات مقروءة تلقائياً عند فتح الصفحة
            await this.markAllAsRead(true);

            this.startAutoRefresh();
            this.initMasterToggle();

            console.log('[Notifications Core] تم تهيئة الصفحة بنجاح');
        } catch (error) {
            console.error('[Notifications Core] خطأ في التهيئة:', error);
            if (typeof this.showError === 'function') {
                this.showError('خطأ في تهيئة صفحة الإشعارات');
            }
        }
    },

    /**
     * @description تهيئة عناصر DOM
     */
    initElements() {
        try {
            this.elements = {
                container: document.getElementById('notifications-container'),
                list: document.getElementById('notifications-list'),
                stats: document.getElementById('notifications-stats'),
                emptyState: document.getElementById('empty-state'),
                loadingState: document.getElementById('loading-state'),
                errorState: document.getElementById('error-state'),

                filterType: document.getElementById('filter-type'),
                filterStatus: document.getElementById('filter-status'),
                searchInput: document.getElementById('search-input'),
                sortSelect: document.getElementById('sort-select'),
                refreshBtn: document.getElementById('refresh-btn'),
                autoRefreshToggle: document.getElementById('auto-refresh-toggle'),
                markAllReadBtn: document.getElementById('mark-all-read-btn'),
                clearFiltersBtn: document.getElementById('clear-filters-btn'),

                totalCountEl: document.getElementById('total-count'),
                unreadCountEl: document.getElementById('unread-count'),
                sentCountEl: document.getElementById('sent-count'),
                receivedCountEl: document.getElementById('received-count'),
                
                masterToggle: document.getElementById('notification-master-toggle'),
                toggleTitle: document.getElementById('toggle-title'),
                toggleDesc: document.getElementById('toggle-desc')
            };
        } catch (error) {
            console.error('[Notifications Core] خطأ في تهيئة العناصر:', error);
        }
    }
};

// ملاحظة: تم نقل منطق التهيئة (NotificationPage.init) إلى نهاية ملف notifications-actions.js 
// لضمان تحميل كافة الوحدات الفرعية (UI, Logic, Actions) قبل البدء.