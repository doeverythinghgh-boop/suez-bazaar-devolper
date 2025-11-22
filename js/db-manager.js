/**
 * @file js/db-manager.js
 * @description وحدة لإدارة قاعدة بيانات IndexedDB الخاصة بالتطبيق.
 */

/**
 * @description اسم قاعدة البيانات IndexedDB الخاصة بالتطبيق.
 * @type {string}
 * @const
 */
const DB_NAME = 'bazaarAppDB';
/**
 * @description إصدار قاعدة البيانات IndexedDB. يتم زيادته عند الحاجة لتشغيل `onupgradeneeded`.
 * @type {number}
 * @const
 */
const DB_VERSION = 3; // ✅ إصلاح نهائي: زيادة الإصدار لإجبار المتصفح على تشغيل onupgradeneeded
/**
 * @description اسم مخزن الكائنات (Object Store) الخاص بسجلات الإشعارات داخل قاعدة البيانات.
 * @type {string}
 * @const
 */
const NOTIFICATIONS_STORE = 'notificationsLog';

let db;
/**
 * @description متغير لتخزين الوعد (Promise) الخاص بتهيئة قاعدة البيانات، لضمان عدم تكرار عملية الفتح.
 * @type {Promise<IDBDatabase>|null}
 */
let dbPromise; // ✅ جديد: متغير لتخزين الوعد الخاص بتهيئة قاعدة البيانات

/**
 * @description يفتح أو ينشئ قاعدة بيانات IndexedDB ويهيئ مخازن الكائنات (Object Stores) اللازمة.
 *   تستخدم هذه الدالة نمط Singleton لضمان تهيئة قاعدة البيانات مرة واحدة فقط.
 * @function initDB
 * @returns {Promise<IDBDatabase>} - وعد (Promise) يحتوي على كائن قاعدة بيانات IndexedDB عند النجاح.
 * @throws {string} - رسالة خطأ في حالة فشل فتح قاعدة البيانات.
 * @see DB_NAME
 * @see DB_VERSION
 * @see NOTIFICATIONS_STORE
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

  });

  return dbPromise;
}

/**
 * @description يضيف سجلاً جديدًا إلى مخزن الإشعارات في IndexedDB، مع التحقق من عدم وجود تكرار للإشعارات المستلمة.
 *   يقوم بإرسال حدث مخصص (`notificationLogAdded`) بعد إضافة السجل بنجاح.
 * @function addNotificationLog
 * @param {object} notificationData - كائن يحتوي على بيانات الإشعار المراد إضافته (مثل `messageId`, `type`, `title`, `body`, `timestamp`, `status`, `relatedUser`, `payload`).
 * @returns {Promise<number>} - وعد (Promise) يحتوي على مفتاح السجل الجديد (`id`) الذي تم إنشاؤه في قاعدة البيانات.
 * @throws {string} - رسالة خطأ في حالة فشل إضافة السجل.
 * @see initDB
 * @see NOTIFICATIONS_STORE
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
    const request = store.add(notificationData);

    request.onsuccess = () => {
      console.log('[DB] تم إضافة سجل إشعار بنجاح:', notificationData.type);
      // ✅ جديد: إرسال حدث مخصص لإعلام التطبيق بوجود سجل جديد.
      // هذا يسمح بتحديث الواجهات المفتوحة (مثل نافذة سجل الإشعارات) بشكل فوري.
      const newLogEvent = new CustomEvent('notificationLogAdded', {
        // نمرر بيانات الإشعار مع المعرف الجديد الذي تم إنشاؤه بواسطة IndexedDB.
        detail: { ...notificationData, id: request.result }
      });
      window.dispatchEvent(newLogEvent);
      resolve(request.result); // إرجاع المفتاح الجديد كما كان
    };

    request.onerror = (event) => {
      console.error('[DB] فشل إضافة سجل إشعار:', event.target.error);
      reject('فشل إضافة السجل.');
    };
}

/**
 * @description يجلب سجلات الإشعارات من قاعدة بيانات IndexedDB، مع إمكانية التصفية حسب النوع والحد الأقصى للعدد.
 *   يتم جلب السجلات بترتيب زمني عكسي (الأحدث أولاً).
 * @function getNotificationLogs
 * @param {'sent' | 'received' | 'all'} [type='all'] - نوع الإشعارات المراد جلبها ('sent', 'received', أو 'all' لجلب جميع الأنواع).
 * @param {number} [limit=50] - أقصى عدد من السجلات المراد جلبها.
 * @returns {Promise<Array<object>>} - وعد (Promise) يحتوي على مصفوفة من كائنات سجلات الإشعارات.
 * @throws {string} - رسالة خطأ في حالة فشل جلب السجلات.
 * @see initDB
 * @see NOTIFICATIONS_STORE
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
 * @description يمسح جميع السجلات من مخزن الإشعارات في IndexedDB.
 * @function clearNotificationLogs
 * @returns {Promise<void>} - وعد (Promise) يتم حله عند مسح جميع السجلات بنجاح.
 * @throws {string} - رسالة خطأ في حالة فشل عملية المسح.
 * @see initDB
 * @see NOTIFICATIONS_STORE
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