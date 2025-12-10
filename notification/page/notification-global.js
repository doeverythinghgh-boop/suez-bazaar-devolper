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
     * @description إعادة العداد إلى الصفر عند فتح صفحة الإشعارات
     */
    resetCounter: function () {
        this.setLastOpenedTime(new Date());
        this.unreadCount = 0;
        this.notifyCountUpdate();
        this.updateBrowserTitle();
    },

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
     * @description إعلام Callback بتحديث العداد وتحديث شارة الإشعارات في الواجهة
     */
    notifyCountUpdate: function () {
        // نتحقق مما إذا كانت صفحة الإشعارات معروضة حالياً
        const notificationsContainer = document.getElementById('index-notifications-container');
        const isPageVisible = notificationsContainer && notificationsContainer.style.display !== 'none' && notificationsContainer.innerHTML.trim() !== '';

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
     * @description تحديث شارة الإشعارات في الزر الرئيسي
     */
    updateNotificationBadge: function () {
        // استخدام الشارة الموجودة فعلياً في index.html
        const badge = document.getElementById('notifications-badge');

        if (!badge) {
            console.warn('[Global] لم يتم العثور على عنصر الشارة notifications-badge');
            return;
        }

        // تحديث المحتوى والعرض
        if (this.unreadCount > 0) {
            badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            // إظهار الشارة (flex لأن التصميم يعتمد عليها للتوسيط)
            badge.style.display = 'flex';
            // تأكيد اللون (احترازي)
            badge.style.backgroundColor = '#dc3545';
        } else {
            // إخفاء الشارة
            badge.style.display = 'none';
        }
    },

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
     * @description إعداد مستمعي الأحداث
     */
    setupEventListeners: function () {
        // الاستماع لحدث إضافة إشعار جديد
        // الاستماع لحدث إضافة إشعار جديد
        window.addEventListener('notificationLogAdded', async (event) => {
            console.log('[Global] حدث إشعار جديد:', event.detail);

            // تشغيل صوت التنبيه للإشعارات المستلمة فقط
            if (event.detail && event.detail.type === 'received') {
                this.playNotificationSound();
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
     * @description تشغيل صوت تنبيه باستخدام Web Audio API
     */
    playNotificationSound: function () {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // صوت متوسط للإشعارات الجديدة
            oscillator.frequency.value = 600;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.warn('[Global] لا يمكن تشغيل الصوت:', error);
        }
    }
};

// تهيئة النظام تلقائياً عند تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        GLOBAL_NOTIFICATIONS.init();
    });
} else {
    GLOBAL_NOTIFICATIONS.init();
}