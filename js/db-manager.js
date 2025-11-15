/**
 * @file js/db-manager.js
 * @description وحدة لإدارة قاعدة بيانات IndexedDB الخاصة بالتطبيق.
 */

const DB_NAME = 'bazaarAppDB';
const DB_VERSION = 1;
const NOTIFICATIONS_STORE = 'notificationsLog';

let db;

/**
 * يفتح أو ينشئ قاعدة البيانات ويهيئ مخازن الكائنات.
 * @returns {Promise<IDBDatabase>} كائن قاعدة البيانات.
 */
function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('[DB] خطأ في فتح قاعدة البيانات:', event.target.error);
      reject('فشل فتح قاعدة البيانات.');
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('[DB] تم فتح قاعدة البيانات بنجاح.');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const tempDb = event.target.result;
      console.log('[DB] جاري ترقية قاعدة البيانات...');

      if (!tempDb.objectStoreNames.contains(NOTIFICATIONS_STORE)) {
        console.log(`[DB] جاري إنشاء مخزن الكائنات: ${NOTIFICATIONS_STORE}`);
        const store = tempDb.createObjectStore(NOTIFICATIONS_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        // إنشاء الفهارس
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };
  });
}

/**
 * يضيف سجلاً جديدًا إلى مخزن الإشعارات.
 * @param {object} notificationData - بيانات الإشعار المراد إضافتها.
 * @returns {Promise<number>} مفتاح السجل الجديد.
 */
async function addNotificationLog(notificationData) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([NOTIFICATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(NOTIFICATIONS_STORE);
    const request = store.add(notificationData);

    request.onsuccess = () => {
      console.log('[DB] تم إضافة سجل إشعار بنجاح:', notificationData.type);
      resolve(request.result);
    };

    request.onerror = (event) => {
      console.error('[DB] فشل إضافة سجل إشعار:', event.target.error);
      reject('فشل إضافة السجل.');
    };
  });
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

// قم بتهيئة قاعدة البيانات عند تحميل السكريبت
initDB();