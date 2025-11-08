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

// تهيئة تطبيق Firebase باستخدام الصيغة القديمة (v8)
firebase.initializeApp({
  apiKey: "AIzaSyClapclT8_4UlPvM026gmZbYCiXaiBDUYk",
  authDomain: "suze-bazaar-notifications.firebaseapp.com",
  projectId: "suze-bazaar-notifications",
  storageBucket: "suze-bazaar-notifications.appspot.com",
  messagingSenderId: "983537000435",
  appId: "1:983537000435:web:92c2729c9aaf872764bc86",
  measurementId: "G-P8FMC3KR7M"
});

// الحصول على نسخة من خدمة المراسلة (v8)
const messaging = firebase.messaging();

// التعامل مع الإشعارات الواردة في الخلفية (v8)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] تم استقبال رسالة في الخلفية: ', payload);

  // ✅ إصلاح: جعل المعالج مرنًا للتعامل مع حمولة `notification` أو `data`.
  // هذا يمنع خطأ "Cannot destructure" ويضمن عرض الإشعار دائمًا.
  const notificationTitle = payload.notification?.title || payload.data?.title;
  const notificationBody = payload.notification?.body || payload.data?.body;

  // التحقق من وجود عنوان ونص للإشعار
  if (!notificationTitle || !notificationBody) {
    console.error('[SW] لم يتم العثور على عنوان أو نص للإشعار في payload.notification أو payload.data.');
    return;
  }

  console.log(`[SW] العنوان: ${notificationTitle}, النص: ${notificationBody}`);

  const notificationOptions = {
    body: notificationBody,
    icon: '/images/icons/icon-192x192.png'
  };

  console.log('[SW] جاري عرض الإشعار المنبثق...');
  return self.registration.showNotification(notificationTitle, notificationOptions);
});