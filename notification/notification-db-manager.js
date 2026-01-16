/**
 * @file notification/notification-db-manager.js
 * @description Manages the IndexedDB instance for local notification storage and history.
 * Implements a Singleton pattern for database connections and an event-driven update system.
 */

/**
 * The name of the IndexedDB database used by the application.
 * @type {string}
 * @const
 */
var DB_NAME = 'bazaarAppDB';
/**
 * Database version. Increment to trigger `onupgradeneeded`.
 * Version 3: Fixed object store schema and indexes.
 * @type {number}
 * @const
 */
var DB_VERSION = 3; // ✅ إصلاح نهائي: زيادة الإصدار لإجبار المتصفح على تشغيل onupgradeneeded
/**
 * The name of the object store used for notification logs.
 * @type {string}
 * @const
 */
var NOTIFICATIONS_STORE = 'notificationsLog';

var db;
/**
 * @type {IDBDatabase}
 * @description The IndexedDB database instance.
 */
var dbPromise; // ✅ جديد: متغير لتخزين الوعد الخاص بتهيئة قاعدة البيانات

/**
 * Opens or creates the IndexedDB instance and initializes necessary object stores.
 * Implements a Singleton pattern using a promise to avoid race conditions.
 * @function initDB
 * @returns {Promise<IDBDatabase>} Resolves with the IDB database instance.
 */
async function initDB() {
  // ✅ إصلاح: إذا كان هناك وعد قائم بالفعل، قم بإرجاعه مباشرة لمنع السباق الزمني.
  if (dbPromise) {
    return dbPromise;
  }

  // ✅ إصلاح: إنشاء وعد جديد وتخزينه
  dbPromise = new Promise((resolve, reject) => {
    // ✅ إصلاح: التحقق من وجود `db` هنا يضمن عدم إعادة فتح اتصال موجود.
    if (db) {
      return resolve(db);
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('[DB] خطأ في فتح قاعدة البيانات:', event.target.error);
        reject('فشل فتح قاعدة البيانات.');
      };

      request.onupgradeneeded = (event) => {
        const tempDb = event.target.result;
        console.log('[DB] جاري ترقية/إنشاء قاعدة البيانات...');

        // ✅ تبسيط: بما أننا في مرحلة التطوير، سنقوم بإنشاء البنية الكاملة مباشرة.
        // هذا الكود يعمل فقط عند إنشاء قاعدة البيانات لأول مرة أو عند زيادة رقم الإصدار.
        if (!tempDb.objectStoreNames.contains(NOTIFICATIONS_STORE)) {
          console.log(`[DB] جاري إنشاء مخزن الكائنات: ${NOTIFICATIONS_STORE}`);
          const store = tempDb.createObjectStore(NOTIFICATIONS_STORE, {
            keyPath: 'id',
            autoIncrement: true,
          });
          // إنشاء جميع الفهارس المطلوبة مرة واحدة
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('messageId', 'messageId', { unique: true });
        }
      };

      // ✅ إصلاح: تأكد من أن `resolve` لا يتم استدعاؤه إلا بعد اكتمال `onupgradeneeded` (إن وجد) و `onsuccess`.
      request.onsuccess = (event) => {
        db = event.target.result;
        console.log('[DB] تم فتح قاعدة البيانات بنجاح.');
        resolve(db);
      };
    } catch (e) {
      console.error('[DB] استثناء غير متوقع أثناء فتح قاعدة البيانات:', e);
      reject(e);
    }
  });

  return dbPromise;
}

/**
 * Adds a new notification record to IndexedDB.
 * Implements duplication checks based on `messageId` for received messages.
 * Dispatches a 'notificationLogAdded' CustomEvent upon success.
 * @function addNotificationLog
 * @param {object} notificationData - {messageId, type, title, body, timestamp, status, relatedUser, payload}.
 * @returns {Promise<number>} Resolves with the generated record ID.
 */
async function addNotificationLog(notificationData) {
  // ✅ إصلاح: انتظر دائمًا اكتمال تهيئة قاعدة البيانات قبل أي عملية.
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([NOTIFICATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(NOTIFICATIONS_STORE);

    // ✅ إصلاح: دمج منطق التحقق من التكرار داخل نفس المعاملة (Transaction)
    if (notificationData.messageId && notificationData.type === 'received') {
      const index = store.index('messageId');
      const requestCheck = index.get(notificationData.messageId);

      requestCheck.onsuccess = () => {
        if (requestCheck.result) {
          // الإشعار موجود بالفعل، لا تقم بإضافته مرة أخرى
          console.warn(`[DB] تم تجاهل حفظ الإشعار المكرر (messageId: ${notificationData.messageId})`);
          // ✅ إضافة: تحديث العداد العالمي في حالة التكرار لضمان المزامنة
          if (typeof window !== 'undefined' && window.GLOBAL_NOTIFICATIONS) {
            window.GLOBAL_NOTIFICATIONS.updateCounter();
          }
          resolve(requestCheck.result.id); // إرجاع مفتاح السجل الموجود
        } else {
          // الإشعار غير موجود، قم بإضافته
          addRecord(store, notificationData, resolve, reject);
        }
      };
      requestCheck.onerror = (event) => {
        console.error('[DB] خطأ أثناء التحقق من تكرار الإشعار:', event.target.error);
        // في حالة حدوث خطأ، استمر في محاولة الإضافة كحل بديل
        addRecord(store, notificationData, resolve, reject);
      };
    } else {
      // إذا لم يكن هناك messageId، أضف السجل مباشرة
      addRecord(store, notificationData, resolve, reject);
    }
  });
}

/**
 * @description دالة مساعدة داخلية لإضافة سجل إشعار فعلي إلى مخزن الكائنات `NOTIFICATIONS_STORE` في IndexedDB.
 *   بعد الإضافة الناجحة، ترسل حدثًا مخصصًا `notificationLogAdded`.
 * @function addRecord
 * @param {IDBObjectStore} store - كائن مخزن IndexedDB الذي ستتم الإضافة إليه.
 * @param {object} notificationData - بيانات الإشعار المراد إضافتها.
 * @param {function(number): void} resolve - دالة لحل الوعد (Promise) الخاص بـ `addNotificationLog` عند النجاح.
 * @param {function(string): void} reject - دالة لرفض الوعد (Promise) الخاص بـ `addNotificationLog` عند الفشل.
 * @returns {void}
 * @see addNotificationLog
 */
function addRecord(store, notificationData, resolve, reject) {
  try {
    const request = store.add(notificationData);

    request.onsuccess = () => {
      console.log('[DB] تم إضافة سجل إشعار بنجاح:', notificationData.type);
      // ✅ جديد: إرسال حدث مخصص لإعلام التطبيق بوجود سجل جديد.
      // هذا يسمح بتحديث الواجهات المفتوحة (مثل نافذة سجل الإشعارات) بشكل فوري.
      // التحقق من وجود window قبل إرسال الحدث (للتوافق مع Service Worker)
      if (typeof window !== 'undefined') {
        const newLogEvent = new CustomEvent('notificationLogAdded', {
          // نمرر بيانات الإشعار مع المعرف الجديد الذي تم إنشاؤه بواسطة IndexedDB.
          detail: { ...notificationData, id: request.result }
        });
        window.dispatchEvent(newLogEvent);
      } else {
        // يمكن هنا إضافة منطق للمراسلة مع Client في Service Worker إذا لزم الأمر
        // ولكن الحفظ في DB كافٍ حالياً لأن الصفحة ستقرأ منه عند التحديث
        console.log('[DB] بيئة Service Worker: تم الحفظ دون إرسال حدث نافذة.');
      }
      resolve(request.result); // إرجاع المفتاح الجديد كما كان
    };

    request.onerror = (event) => {
      console.error('[DB] فشل إضافة سجل إشعار:', event.target.error);
      reject('فشل إضافة السجل.');
    };
  } catch (error) {
    console.error('[DB] استثناء أثناء إضافة السجل:', error);
    reject(error);
  }
}

/**
 * Retrieves notification logs with optional filtering and limit.
 * Sorts by timestamp in descending order (newest first).
 * @function getNotificationLogs
 * @param {'sent' | 'received' | 'all'} [type='all'] - Filter by notification type.
 * @param {number} [limit=50] - Maximum number of records to return.
 * @returns {Promise<Array<object>>} Resolves with an array of notification objects.
 */
async function getNotificationLogs(type = 'all', limit = 50) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([NOTIFICATIONS_STORE], 'readonly');
    const store = transaction.objectStore(NOTIFICATIONS_STORE);
    const index = store.index('timestamp'); // استخدام فهرس التاريخ للترتيب
    const results = [];

    // فتح مؤشر للتحرك عبر السجلات بترتيب عكسي (الأحدث أولاً)
    const cursorRequest = index.openCursor(null, 'prev');
    let count = 0;

    cursorRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && count < limit) {
        const record = cursor.value;
        if (type === 'all' || record.type === type) {
          results.push(record);
          count++;
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    cursorRequest.onerror = (event) => {
      console.error('[DB] فشل جلب سجلات الإشعارات:', event.target.error);
      reject('فشل جلب السجلات.');
    };
  });
}

/**
 * @description يحسب عدد الإشعارات غير المقروءة في قاعدة البيانات باستخدام الفهرس.
 *   هذه الدالة أسرع بكثير من جلب جميع السجلات وفلترتها.
 * @function countUnreadNotifications
 * @returns {Promise<number>} - وعد بـ عدد الإشعارات غير المقروءة.
 */
async function countUnreadNotifications() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([NOTIFICATIONS_STORE], 'readonly');
    const store = transaction.objectStore(NOTIFICATIONS_STORE);
    const index = store.index('status');
    const request = index.count(IDBKeyRange.only('unread'));

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      console.error('[DB] فشل حساب الإشعارات غير المقروءة:', event.target.error);
      reject(0);
    };
  });
}

/**
 * Clears all records from the notification logs object store.
 * @function clearNotificationLogs
 * @returns {Promise<void>} Resolves when the store is cleared.
 */
async function clearNotificationLogs() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([NOTIFICATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(NOTIFICATIONS_STORE);
    const request = store.clear(); // استخدام دالة clear() لمسح كل شيء

    request.onsuccess = () => {
      console.log('[DB] تم مسح جميع سجلات الإشعارات بنجاح.');
      resolve();
    };

    request.onerror = (event) => {
      console.error('[DB] فشل مسح سجلات الإشعارات:', event.target.error);
      reject('فشل مسح السجلات.');
    };
  });
}
// ✅ إصلاح: إزالة الاستدعاء الفوري من هنا.
// سيتم استدعاء initDB عند الحاجة إليها فقط، والآلية الجديدة ستمنع التكرار.

/**
 * @description تحديث حالة الإشعار في قاعدة البيانات
 * @function updateNotificationStatusInDB
 * @param {number} id - معرف الإشعار
 * @param {string} status - الحالة الجديدة ('read' | 'unread')
 * @returns {Promise<void>}
 * @async
 * @throws {string} - An error message if the update operation fails.
 * @see initDB
 * @see NOTIFICATIONS_STORE
 */
async function updateNotificationStatusInDB(id, status) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([NOTIFICATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(NOTIFICATIONS_STORE);
    const request = store.get(id);

    request.onsuccess = (event) => {
      const data = event.target.result;
      if (data) {
        data.status = status;
        const updateRequest = store.put(data);

        updateRequest.onsuccess = () => {
          console.log(`[DB] تم تحديث حالة الإشعار ${id} إلى ${status}`);
          // إرسال حدث لتحديث العدادات في الوقت الفعلي
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('notificationStatusUpdated', {
              detail: { id, status }
            }));
          }
          resolve();
        };

        updateRequest.onerror = (e) => {
          console.error('[DB] فشل تحديث حالة الإشعار:', e.target.error);
          reject(e.target.error);
        };
      } else {
        console.warn(`[DB] الإشعار ${id} غير موجود`);
        resolve();
      }
    };

    request.onerror = (event) => {
      console.error('[DB] فشل جلب الإشعار للتحديث:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Marks all notifications as read in a single batch operation.
 * Dispatches a single 'notificationStatusUpdated' event when finished.
 * @function markAllNotificationsAsReadInDB
 * @returns {Promise<void>}
 */
async function markAllNotificationsAsReadInDB() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([NOTIFICATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(NOTIFICATIONS_STORE);
    // نستخدم الفهرس للبحث عن الرسائل غير المقروءة فقط لتسريع العملية
    const index = store.index('status');
    const request = index.openCursor(IDBKeyRange.only('unread'));

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const updateData = cursor.value;
        updateData.status = 'read';
        cursor.update(updateData);
        cursor.continue();
      } else {
        // انتهت العملية - إطلاق حدث واحد لتحديث الواجهة
        console.log('[DB] تم تحديد جميع الإشعارات كمقروءة');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('notificationStatusUpdated', {
            detail: { id: 'all', status: 'read' }
          }));
        }
        resolve();
      }
    };

    request.onerror = (e) => {
      console.error('[DB] فشل تحديث الكل:', e.target.error);
      reject(e.target.error);
    };
  });
}

/**
 * @description يحذف إشعاراً محدداً من قاعدة البيانات بواسطة معرفه.
 * @function deleteNotificationFromDB
 * @param {number} id - معرف الإشعار المراد حذفه
 * @returns {Promise<void>}
 * @async
 * @throws {string} - رسالة خطأ في حالة فشل الحذف.
 * @see initDB
 * @see NOTIFICATIONS_STORE
 */
async function deleteNotificationFromDB(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([NOTIFICATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(NOTIFICATIONS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => {
      console.log(`[DB] تم حذف الإشعار ${id} بنجاح.`);
      // إرسال حدث لتنبيه الواجهات
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notificationDeleted', {
          detail: { id }
        }));
      }
      resolve();
    };

    request.onerror = (event) => {
      console.error('[DB] فشل حذف الإشعار:', event.target.error);
      reject('فشل حذف الإشعار.');
    };
  });
}