/**
 * @file firebase-messaging-sw.js
 * @description عامل الخدمة (Service Worker) الخاص بـ Firebase Cloud Messaging.
 *
 * هذا الملف مسؤول عن استقبال إشعارات Push عندما يكون التطبيق مغلقًا أو في الخلفية.
 * يجب أن يكون في جذر المشروع ليتمكن المتصفح من تسجيله بشكل صحيح.
 */

// ✅ إصلاح: استخدام Firebase v8 المتوافق مع `importScripts` بدلاً من v12.
// هذا يحل مشكلة "Failed to load script" داخل عامل الخدمة.
importScripts("assets/libs/firebase/firebase-app-8.10.1.js");
importScripts("assets/libs/firebase/firebase-messaging-8.10.1.js");

/**
 * @description تهيئة تطبيق Firebase باستخدام الصيغة القديمة (v8).
 * يحتوي على معلومات الاعتماد اللازمة للاتصال بمشروع Firebase الخاص بك.
 * @constant
 * @type {object}
 * @property {string} apiKey - مفتاح API لمشروع Firebase.
 * @property {string} authDomain - مجال المصادقة لمشروع Firebase.
 * @property {string} projectId - معرف المشروع لمشروع Firebase.
 * @property {string} storageBucket - سلة التخزين لمشروع Firebase.
 * @property {string} messagingSenderId - معرف مرسل الرسائل لمشروع Firebase.
 * @property {string} appId - معرف التطبيق لمشروع Firebase.
 * @property {string} measurementId - معرف القياس لمشروع Firebase (لـ Google Analytics).
 */
firebase.initializeApp({
  apiKey: "AIzaSyClapclT8_4UlPvM026gmZbYCiXaiBDUYk",
  authDomain: "suze-bazaar-notifications.firebaseapp.com",
  projectId: "suze-bazaar-notifications",
  storageBucket: "suze-bazaar-notifications.firebasestorage.app",
  messagingSenderId: "983537000435",
  appId: "1:983537000435:web:92c2729c9aaf872764bc86",
  measurementId: "G-P8FMC3KR7M"
});

/**
 * @description الحصول على نسخة من خدمة المراسلة (Firebase Messaging) من تطبيق Firebase المهيأ.
 * تُستخدم هذه النسخة للتعامل مع رسائل الدفع (push messages) في عامل الخدمة.
 * @constant
 * @type {firebase.messaging.Messaging}
 */
const messaging = firebase.messaging();

// استيراد مدير قاعدة البيانات لحفظ الإشعارات
// استيراد مدير قاعدة البيانات لحفظ الإشعارات
importScripts("notification/notification-db-manager.js");

/**
 * @description يتعامل مع رسائل FCM (Firebase Cloud Messaging) عندما يكون التطبيق في الخلفية أو مغلقًا.
 * هذه الوظيفة تستمع لرسائل الدفع وتقوم بعرض إشعار للمستخدم.
 * @function onBackgroundMessage
 * @param {object} payload - كائن الحمولة (payload) المستلم من Firebase Cloud Messaging.
 *   قد يحتوي على حقول `notification` و/أو `data`.
 * @param {string} [payload.notification.title] - عنوان الإشعار.
 * @param {string} [payload.notification.body] - نص الإشعار.
 * @param {object} [payload.data] - حقل البيانات المخصص الذي يمكن استخدامه كبديل لـ `notification`.
 * @returns {Promise<void>} - وعد (Promise) يتم حله بعد عرض الإشعار بنجاح.
 * @throws {Error} - If `addNotificationLog` fails to save the notification to IndexedDB.
 * @see addNotificationLog
 */
messaging.onBackgroundMessage((payload) => {
  console.log('%c[FCM SW] 📩 تم استقبال رسالة في الخلفية (Background):', 'color: #ff00ff; font-weight: bold; font-size: 14px;', payload);
  console.log('[FCM SW] تفاصيل الرسالة:', JSON.stringify(payload, null, 2));

  // ✅ تحديث: استخدام منطق موحد لجلب البيانات من `notification` أو `data`.
  const notificationData = payload.notification || payload.data || {};
  const { title, body } = notificationData;

  // تأكد أن هناك عنوانًا أو نصًا للإشعار
  if (!title && !body) {
    console.warn('[firebase-messaging-sw.js] لا يوجد عنوان أو محتوى للإشعار في الرسالة:', payload);
    return;
  }

  // حفظ الإشعار في IndexedDB
  if (typeof addNotificationLog === 'function') {
    addNotificationLog({
      messageId: payload.messageId || `bg_${Date.now()}`,
      type: 'received',
      title: title,
      body: body,
      timestamp: new Date(),
      status: 'unread',
      relatedUser: { key: 'system', name: 'النظام' }, // أو يمكن استخلاص معلومات المستخدم من data إذا وجدت
      payload: payload.data
    }).then(() => {
      console.log('[SW] تم حفظ إشعار الخلفية في قاعدة البيانات.');
    }).catch(err => {
      console.error('[SW] فشل حفظ إشعار الخلفية:', err);
    });
  }


  // عرض الإشعار
  // إذا كان الإشعار يحتوي على كائن 'notification'، فإن المتصفح يعرضه تلقائيًا في الخلفية.
  // نقوم بعرض الإشعار يدويًا فقط إذا كانت رسالة بيانات (Data Message) بحتة لا تحتوي على 'notification'.
  if (payload.notification) {
    console.log('[FCM SW] تم عرض الإشعار تلقائيًا بواسطة المتصفح (Notification Payload). تخطي العرض اليدوي لمنع التكرار.');
    return Promise.resolve();
  }

  // إذا كانت رسالة بيانات فقط، نعرضها يدويًا
  console.log('[FCM SW] عرض إشعار يدوي (Data Payload)...');
  return self.registration.showNotification(title, {
    body,
    icon: 'images/icons/icon-192x192.png',
  });
});

/**
 * @description Listens for the 'install' event of the Service Worker.
 * Ensures that the new Service Worker activates immediately, skipping the waiting phase.
 * @event install
 * @param {ExtendableEvent} event - The install event.
 * @returns {void}
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

/**
 * @description Listens for the 'activate' event of the Service Worker.
 * Claims all currently controlled clients immediately, allowing the new Service Worker
 * to take control of pages without requiring a refresh.
 * @event activate
 * @param {ExtendableEvent} event - The activate event.
 * @returns {void}
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});