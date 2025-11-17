/**
 * @file js/db-manager.js
 * @description وحدة لإدارة قاعدة بيانات IndexedDB الخاصة بالتطبيق.
 */

const DB_NAME = 'bazaarAppDB';
const DB_VERSION = 3; // ✅ إصلاح نهائي: زيادة الإصدار لإجبار المتصفح على تشغيل onupgradeneeded
const NOTIFICATIONS_STORE = 'notificationsLog';

let db;
let dbPromise; // ✅ جديد: متغير لتخزين الوعد الخاص بتهيئة قاعدة البيانات

/**
 * يفتح أو ينشئ قاعدة البيانات ويهيئ مخازن الكائنات.
 * @returns {Promise<IDBDatabase>} كائن قاعدة البيانات.
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
 * يضيف سجلاً جديدًا إلى مخزن الإشعارات.
 * @param {object} notificationData - بيانات الإشعار المراد إضافتها.
 * @returns {Promise<number>} مفتاح السجل الجديد.
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
 * دالة مساعدة لإضافة سجل وإرسال حدث.
 * @private
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
 * يجلب سجلات الإشعارات من قاعدة البيانات.
 * @param {'sent' | 'received' | 'all'} type - نوع الإشعارات المراد جلبها.
 * @param {number} limit - أقصى عدد من السجلات المراد جلبها.
 * @returns {Promise<Array<object>>} مصفوفة من سجلات الإشعارات.
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
 * ✅ جديد: يمسح جميع السجلات من مخزن الإشعارات.
 * @returns {Promise<void>}
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