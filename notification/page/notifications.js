/**
 * @file notifications.js
 * @description Core file for notifications page logic.
 *   Acts as a coordinator for UI, Logic, and Action modules.
 */

/**
 * @namespace NotificationPage
 * @description Main object responsible for managing the notifications page.
 */
var NotificationPage = {
    /**
     * @description Current state of the page.
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
     * @description Filter settings.
     */
    filters: {
        type: 'all',        // all, sent, received
        status: 'all',      // all, read, unread
        search: '',         // Search text
        sortBy: 'newest'    // newest, oldest
    },

    /**
     * @description Refresh settings.
     */
    refreshSettings: {
        autoRefresh: true,
        refreshInterval: 30000,
        refreshTimer: null
    },

    /**
     * @description DOM elements.
     */
    elements: {},

    /**
     * @description Page initialization.
     */
    async init() {
        console.log('[Notifications Core] Starting notification page initialization...');
        try {
            this.initElements();
            this.loadSettings();
            this.setupEventListeners();
            this.setupGlobalCounter();

            if (window.GLOBAL_NOTIFICATIONS) {
                window.GLOBAL_NOTIFICATIONS.resetCounter();
            }

            await this.loadNotifications();

            // Mark all notifications as read after loading and displaying to the user
            // A small delay ensures the user sees notifications before they are updated
            setTimeout(async () => {
                await this.markAllAsRead(true);
            }, 500);

            this.startAutoRefresh();
            this.initMasterToggle();

            console.log('[Notifications Core] Page initialized successfully.');
        } catch (error) {
            console.error('[Notifications Core] Initialization error:', error);
            if (typeof this.showError === 'function') {
                this.showError('Error initializing notifications page');
            }
        }
    },

    /**
     * @description Initialize DOM elements.
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
                receivedCountEl: document.getElementById('received-count')
            };
        } catch (error) {
            console.error('[Notifications Core] Error initializing elements:', error);
        }
    }
};

// Note: Initialization logic (NotificationPage.init) has been moved to the end of notifications-actions.js
// to ensure all sub-modules (UI, Logic, Actions) are loaded before starting.