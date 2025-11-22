/**
 * @file firebase-messaging-sw.js
 * @description عامل الخدمة (Service Worker) الخاص بـ Firebase Cloud Messaging.
 *
 * هذا الملف مسؤول عن استقبال إشعارات Push عندما يكون التطبيق مغلقًا أو في الخلفية.
 * يجب أن يكون في جذر المشروع ليتمكن المتصفح من تسجيله بشكل صحيح.
 */

// ✅ إصلاح: استخدام Firebase v8 المتوافق مع `importScripts` بدلاً من v12.
// هذا يحل مشكلة "Failed to load script" داخل عامل الخدمة.
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js");

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
  storageBucket: "suze-bazaar-notifications.appspot.com",
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
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] تم استقبال رسالة في الخلفية: ', payload);
  
  // ✅ تحديث: استخدام منطق موحد لجلب البيانات من `notification` أو `data`.
  const notificationData = payload.notification || payload.data || {};
  const { title, body } = notificationData;
  
  // تأكد أن هناك عنوانًا أو نصًا للإشعار
  if (!title && !body) {
    console.warn('[firebase-messaging-sw.js] لا يوجد عنوان أو محتوى للإشعار في الرسالة:', payload);
    return;
  }
  
  // عرض الإشعار
  // ملاحظة: تم تعديل مسار الأيقونة ليتوافق مع مسار المشروع الحالي.
  return self.registration.showNotification(title, {
    body,
    icon: '/images/icons/icon-192x192.png',
  });
});