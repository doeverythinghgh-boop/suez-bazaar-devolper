/**
 * @file notification-global.js
 * @description متغير عالمي لتتبع الإشعارات غير المقروءة
 */

/**
 * @description كائن إدارة الإشعارات العالمي
 * @type {object}
 */
window.GLOBAL_NOTIFICATIONS = {
    /**
     * @description عدد الإشعارات غير المقروءة
     * @type {number}
     */
    unreadCount: 0,

    /**
     * @description آخر مرة فتح فيها المستخدم صفحة الإشعارات
     * @type {Date|null}
     */
    lastOpenedTime: null,

    /**
     * @description Callback يتم استدعاؤه عند تحديث العداد
     * @type {Function|null}
     */
    onCountUpdate: null,

    /**
     * @description تحديث العداد من IndexedDB
     * @async
     * @returns {Promise<void>}
     */
    updateCounter: async function () {
        try {
            if (typeof getNotificationLogs !== 'function') {
                console.warn('[Global] دالة getNotificationLogs غير متاحة');
                return;
            }

            // جلب الإشعارات غير المقروءة
            const allNotifications = await getNotificationLogs('all', 1000);

            // حساب الإشعارات غير المقروءة
            let count = 0;
            const lastOpened = this.getLastOpenedTime();

            for (const notification of allNotifications) {
                if (notification.status === 'unread') {
                    // إذا كان هناك وقت فتح، نتحقق إذا كان الإشعار بعد هذا الوقت
                    if (!lastOpened || new Date(notification.timestamp) > lastOpened) {
                        count++;
                    }
                }
            }

            this.unreadCount = count;
            this.notifyCountUpdate();
            this.updateBrowserTitle();

            console.log(`[Global] تم تحديث العداد: ${this.unreadCount} إشعار غير مقروء`);
        } catch (error) {
            console.error('[Global] خطأ في تحديث العداد:', error);
        }
    },
    /**
     * @throws {Error} - If there's an error fetching notifications from the database.
     * @see getNotificationLogs
     * @see getLastOpenedTime
     * @see notifyCountUpdate
     * @see updateBrowserTitle
     */

    /**
     * @description إعادة العداد إلى الصفر عند فتح صفحة الإشعارات
     */
    resetCounter: function () {
        this.setLastOpenedTime(new Date());
        this.unreadCount = 0;
        this.notifyCountUpdate();
        this.updateBrowserTitle();
    },
    /**
     * @returns {void}
     * @see setLastOpenedTime
     * @see notifyCountUpdate
     * @see updateBrowserTitle
     */

    /**
     * @description تحديث عنوان المتصفح ليعرض العدد
     */
    updateBrowserTitle: function () {
        try {
            const baseTitle = document.title.replace(/^\(\d+\)\s*/, '');
            if (this.unreadCount > 0) {
                document.title = `(${this.unreadCount}) ${baseTitle}`;
            } else {
                document.title = baseTitle;
            }
        } catch (error) {
            console.error('[Global] خطأ في تحديث عنوان المتصفح:', error);
        }
    },
    /**
     * @returns {void}
     * @throws {Error} - If there's an error manipulating the document title.
     */

    /**
     * @description الحصول على آخر وقت فتح من localStorage
     * @returns {Date|null}
     */
    getLastOpenedTime: function () {
        try {
            const stored = localStorage.getItem('notifications_last_opened');
            return stored ? new Date(stored) : null;
        } catch (error) {
            console.error('[Global] خطأ في قراءة lastOpened:', error);
            return null;
        }
    },
    /**
     * @throws {Error} - If there's an error accessing LocalStorage.
     */

    /**
     * @description حفظ وقت الفتح الحالي في localStorage
     * @param {Date} date
     */
    setLastOpenedTime: function (date) {
        try {
            this.lastOpenedTime = date;
            localStorage.setItem('notifications_last_opened', date.toISOString());
            console.log('[Global] تم حفظ وقت الفتح:', date.toISOString());
        } catch (error) {
            console.error('[Global] خطأ في حفظ lastOpened:', error);
        }
    },
    /**
     * @throws {Error} - If there's an error saving to LocalStorage.
     */

    /**
     * @description إعلام Callback بتحديث العداد وتحديث شارة الإشعارات في الواجهة
     */
    notifyCountUpdate: function () {
        // نتحقق مما إذا كانت صفحة الإشعارات معروضة حالياً
        const notificationsContainer = document.getElementById('index-notifications-container');

        // فحص أكثر دقة لمعرفة إذا كانت الصفحة مرئية
        let isPageVisible = false;
        if (notificationsContainer) {
            const hasContent = notificationsContainer.innerHTML.trim() !== '';
            const isDisplayed = notificationsContainer.offsetParent !== null ||
                window.getComputedStyle(notificationsContainer).display !== 'none';
            isPageVisible = hasContent && isDisplayed;
            //console.log(`[Global] فحص ظهور صفحة الإشعارات: hasContent=${hasContent}, isDisplayed=${isDisplayed}, isPageVisible=${isPageVisible}`);
        }

        if (isPageVisible) {
            // إذا كانت الصفحة مفتوحة، نُخفي الشارة بغض النظر عن العدد (لأن المستخدم يرى الإشعارات الآن)
            const badge = document.getElementById('notifications-badge');
            if (badge) badge.style.display = 'none';
        } else {
            // إذا كانت الصفحة مغلقة، نُحدث الشارة بناءً على العدد
            this.updateNotificationBadge();
        }

        // استدعاء الـ Callback إذا وجد
        if (typeof this.onCountUpdate === 'function') {
            try {
                this.onCountUpdate(this.unreadCount);
            } catch (error) {
                console.error('[Global] خطأ في callback:', error);
            }
        }
    },
    /**
     * @returns {void}
     * @throws {Error} - If an error occurs during the callback execution.
     * @see updateNotificationBadge
     */

    /**
     * @description تحديث شارة الإشعارات في الزر الرئيسي
     */
    updateNotificationBadge: function () {
        // استخدام الشارة الموجودة فعلياً في index.html
        const badge = document.getElementById('notifications-badge');

        if (!badge) {
            console.warn('[Global] لم يتم العثور على عنصر الشارة notifications-badge');
            return;
        }

        //console.log(`[Global] تحديث الشارة: العدد = ${this.unreadCount}`);

        // تحديث المحتوى والعرض
        if (this.unreadCount > 0) {
            badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            // إظهار الشارة (flex لأن التصميم يعتمد عليها للتوسيط)
            badge.style.display = 'flex';
            // تأكيد اللون (احترازي)
            badge.style.backgroundColor = '#dc3545';
            //console.log(`[Global] ✅ تم إظهار الشارة بالعدد: ${badge.textContent}`);
        } else {
            // إخفاء الشارة
            badge.style.display = 'none';
            //console.log('[Global] ⭕ تم إخفاء الشارة (العدد = 0)');
        }
    },
    /**
     * @returns {void}
     */

    /**
     * @description تهيئة النظام العالمي
     * @async
     */
    init: async function () {
        try {
            // تحميل آخر وقت فتح
            this.lastOpenedTime = this.getLastOpenedTime();

            // تحديث العداد
            await this.updateCounter();

            // الاستماع لأحداث الإشعارات الجديدة
            this.setupEventListeners();

            console.log('[Global] تم تهيئة نظام الإشعارات العالمي');
        } catch (error) {
            console.error('[Global] خطأ في التهيئة:', error);
        }
    },
    /**
     * @returns {Promise<void>}
     * @throws {Error} - If an error occurs during initialization.
     * @see getLastOpenedTime
     * @see updateCounter
     * @see setupEventListeners
     */

    /**
     * @description إعداد مستمعي الأحداث
     */
    setupEventListeners: function () {
        // الاستماع لحدث إضافة إشعار جديد
        // الاستماع لحدث إضافة إشعار جديد
        window.addEventListener('notificationLogAdded', async (event) => {
            console.log('[Global] حدث إشعار جديد:', event.detail);

            // تشغيل صوت التنبيه للإشعارات المستلمة فقط
            //يجب ايقافها عند وجود تطبيق اندرويد لانها تعمل بشكل مختلف هناك
            if (event.detail && event.detail.type === 'received' && !window.Android) {
                playNotificationSound();
            }

            // إعادة حساب العدد الكلي من قاعدة البيانات لضمان الدقة وتجنب الأخطاء التراكمية
            await this.updateCounter();

            // إظهار إشعار نظام إذا كان مسموحاً وكان الإشعار غير مقروء
            if (event.detail.status === 'unread') {
                this.showSystemNotification(event.detail);
            }
        });

        // الاستماع لحدث تحديث حالة الإشعار (مقروء/غير مقروء)
        window.addEventListener('notificationStatusUpdated', async (event) => {
            console.log('[Global] تم تحديث حالة إشعار:', event.detail);
            // إعادة حساب العدد الكلي
            await this.updateCounter();
        });
    },
    /**
     * @returns {void}
     * @see updateCounter
     * @see playNotificationSound
     * @see showSystemNotification
     */

    /**
     * @description إظهار إشعار نظام
     * @param {object} notification - بيانات الإشعار
     */
    showSystemNotification: function (notification) {
        try {
            // التحقق من دعم الإشعارات ووجود الإذن
            if (!("Notification" in window)) {
                console.log('[Global] المتصفح لا يدعم إشعارات النظام');
                return;
            }

            if (Notification.permission === "granted") {
                this.createNotification(notification);
            } else if (Notification.permission !== "denied") {
                // طلب الإذن إذا لم يتم رفضه مسبقاً
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        this.createNotification(notification);
                    }
                });
            }
        } catch (error) {
            console.error('[Global] خطأ في إشعار النظام:', error);
        }
    },
    /**
     * @returns {void}
     * @throws {Error} - If an error occurs during notification permission request or creation.
     * @see createNotification
     */

    /**
     * @description إنشاء إشعار نظام
     * @param {object} notification
     */
    createNotification: function (notification) {
        const title = notification.title || 'إشعار جديد';
        const body = notification.body || notification.message || 'لديك إشعار جديد';

        const notif = new Notification(title, {
            body: body,
            icon: '/favicon.ico',
            tag: `notification_${notification.id || Date.now()}`,
            requireInteraction: false
        });

        // عند النقر على الإشعار، افتح صفحة الإشعارات
        notif.onclick = function () {
            window.focus();
            this.close();
            // يمكن توجيه المستخدم لصفحة الإشعارات
            if (window.location.pathname.includes('notifications')) {
                window.location.reload();
            } else {
                window.location.href = '/notifications.html';
            }
        }.bind(notif);

        // إغلاق الإشعار تلقائياً بعد 5 ثوان
        setTimeout(() => notif.close(), 5000);
    },
    /**
     * @returns {void}
     */


};

// تهيئة النظام تلقائياً عند تحميل الصفحة
/**
 * @description Automatically initializes the `GLOBAL_NOTIFICATIONS` object when the DOM is fully loaded.
 * This ensures the global notification system is set up as soon as possible.
 * @throws {Error} - If `GLOBAL_NOTIFICATIONS.init()` fails during execution.
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        GLOBAL_NOTIFICATIONS.init();
    });
} else {
    GLOBAL_NOTIFICATIONS.init();
}