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
     * @description مؤقت لعملية تقليل مرات التحديث (Debounce)
     * @type {number|null}
     */
    updateTimeout: null,

    /**
     * @description Callback يتم استدعاؤه عند تحديث العداد
     * @type {Function|null}
     */
    onCountUpdate: null,

    /**
     * @description تحديث العداد من IndexedDB (مع Debounce لضمان دقة العمليات الكبيرة)
     * @async
     * @returns {Promise<void>}
     */
    updateCounter: async function (forceImmediate = false) {
        // إذا كان هناك تحديث منتظر، نقوم بمسحه لجدولة تحديث جديد
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }

        const runUpdate = async () => {
            try {
                // حساب الإشعارات غير المقروءة بدقة باستخدام الفهرس (أسرع وأدق)
                let count = 0;
                if (typeof countUnreadNotifications === 'function') {
                    count = await countUnreadNotifications();
                } else {
                    // Fallback في حالة عدم توفر الدالة الجديدة
                    const allNotifications = await getNotificationLogs('all', 1000);
                    count = allNotifications.filter(n => n.status === 'unread').length;
                }

                // تحديث القيم فقط إذا تغيرت أو إذا كان التحديث فورياً
                const hasChanged = this.unreadCount !== count;
                this.unreadCount = count;

                // سجل تفصيلي لتتبع المشكلة
                console.log(`%c[Global] 🔔 تحديث العداد: ${this.unreadCount} إشعار غير مقروء`, 'color: #ff6b6b; font-weight: bold;');

                this.notifyCountUpdate();
                this.updateBrowserTitle();

                if (hasChanged || forceImmediate) {
                    console.log(`[Global] ✅ تم مزامنة العداد: ${this.unreadCount} إشعار (Signal-based)`);
                }
            } catch (error) {
                console.error('[Global] خطأ في تحديث العداد:', error);
            } finally {
                this.updateTimeout = null;
            }
        };

        if (forceImmediate) {
            await runUpdate();
        } else {
            // Debounce خفيف جداً لتجميع العمليات المتتابعة (بدون انتظار أعمى)
            this.updateTimeout = setTimeout(runUpdate, 50);
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
        try {
            this.setLastOpenedTime(new Date());
            // ملاحظة: تم إزالة تصفير unreadCount يدوياً لضمان عدم الاختفاء إلا بعد تحميل الرسائل فعلياً وتعديلها في DB
            this.updateCounter(true);
        } catch (error) {
            console.error('[Global] خطأ في تحديث وقت الفتح:', error);
        }
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
        // تحديث الشارة بناءً على العدد الحقيقي دائماً (تختفي فقط عندما يصبح unreadCount = 0)
        this.updateNotificationBadge();

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
     * @returns {void}
     */
    updateNotificationBadge: function () {
        try {
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
                console.log(`%c[Global] ✅ إظهار الشارة: ${badge.textContent}`, 'color: #28a745; font-weight: bold;');
            } else {
                // إخفاء الشارة
                badge.style.display = 'none';
                console.log('%c[Global] ⭕ إخفاء الشارة (العدد = 0)', 'color: #6c757d;');
            }
        } catch (error) {
            console.error('[Global] خطأ في تحديث الشارة:', error);
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

            // تحديث العداد الأولي فوراً (بناءً على البيانات المحلية الحالية)
            await this.updateCounter(true);

            console.log('[Global] نظام الإشعارات جاهز - إرسال إشارة الاستقرار للأندرويد');

            // ✅ جديد: إخطار الأندرويد أن الواجهة جاهزة تماماً.
            // الأندرويد الآن مسؤول عن دفع الإشعارات المعلقة فور استلام هذه الإشارة.
            if (window.Android && typeof window.Android.onWebAppReady === 'function') {
                window.Android.onWebAppReady();
            }
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
     * @description هل تم إعداد المستمعين؟
     */
    isListenersSetup: false,

    /**
     * @description إعداد مستمعي الأحداث
     */
    setupEventListeners: function () {
        if (this.isListenersSetup) return;
        try {
            // الاستماع لحدث إضافة إشعار جديد
            // الاستماع لحدث إضافة إشعار جديد
            window.addEventListener('notificationLogAdded', async (event) => {
                try {
                    console.log('[Global] حدث إشعار جديد:', event.detail);

                    // تشغيل صوت التنبيه للإشعارات المستلمة فقط
                    //يجب ايقافها عند وجود تطبيق اندرويد لانها تعمل بشكل مختلف هناك
                    if (event.detail && event.detail.type === 'received' && !window.Android) {
                        if (typeof playNotificationSound === 'function') {
                            playNotificationSound();
                        }
                    }

                    // إعادة حساب العدد الكلي من قاعدة البيانات لضمان الدقة وتجنب الأخطاء التراكمية
                    await this.updateCounter();

                    // إظهار إشعار نظام إذا كان مسموحاً وكان الإشعار غير مقروء
                    if (event.detail.status === 'unread') {
                        this.showSystemNotification(event.detail);
                    }
                } catch (innerError) {
                    console.error('[Global] خطأ داخل مستمع notificationLogAdded:', innerError);
                }
            });

            // الاستماع لحدث تحديث حالة الإشعار (مقروء/غير مقروء)
            window.addEventListener('notificationStatusUpdated', async (event) => {
                try {
                    console.log('[Global] تم تحديث حالة إشعار:', event.detail);
                    // إعادة حساب العدد الكلي
                    await this.updateCounter();
                } catch (innerError) {
                    console.error('[Global] خطأ داخل مستمع notificationStatusUpdated:', innerError);
                }
            });
            this.isListenersSetup = true;
            console.log('[Global] ✅ تم إعداد مستمعي أحداث الإشعارات');
        } catch (error) {
            console.error('[Global] خطأ في إعداد المستمعين:', error);
        }
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
        try {
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
        } catch (error) {
            console.error('[Global] خطأ في إنشاء إشعار النظام:', error);
        }
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
// إعداد المستمعين فوراً (قبل DOMContentLoaded) لضمان التقاط أحداث الأندرويد المبكرة
GLOBAL_NOTIFICATIONS.setupEventListeners();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        GLOBAL_NOTIFICATIONS.init();
    });
} else {
    GLOBAL_NOTIFICATIONS.init();
}