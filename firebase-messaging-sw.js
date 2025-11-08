/**
 * @file firebase-messaging-sw.js
 * @description عامل الخدمة (Service Worker) الخاص بـ Firebase Cloud Messaging.
 *
 * هذا الملف مسؤول عن استقبال إشعارات Push عندما يكون التطبيق مغلقًا أو في الخلفية.
 * يجب أن يكون في جذر المشروع ليتمكن المتصفح من تسجيله بشكل صحيح.
 */

// ✅ إصلاح: استخدام النمط الحديث (Modular) لمكتبة Firebase بدلاً من النمط القديم.
// هذا يحل مشكلة "Failed to execute 'importScripts'" ويضمن التوافق.
importScripts("https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging.js");

// استخراج الدوال المطلوبة من الكائن العام `firebase`
const { initializeApp } = firebase.app;
const { getMessaging, onBackgroundMessage } = firebase.messaging;

// تهيئة تطبيق Firebase
const firebaseApp = initializeApp({
  apiKey: "AIzaSyClapclT8_4UlPvM026gmZbYCiXaiBDUYk",
  authDomain: "suze-bazaar-notifications.firebaseapp.com",
  projectId: "suze-bazaar-notifications",
  storageBucket: "suze-bazaar-notifications.appspot.com", // ✅ تصحيح: اسم الحاوية الصحيح
  messagingSenderId: "983537000435",
  appId: "1:983537000435:web:92c2729c9aaf872764bc86",
  measurementId: "G-P8FMC3KR7M"
});

// الحصول على نسخة من خدمة المراسلة
const messaging = getMessaging(firebaseApp);

// التعامل مع الإشعارات الواردة في الخلفية
onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] تم استقبال رسالة في الخلفية: ', payload);

  // بناء الإشعار لعرضه
  const { title, body } = payload.notification;
  const notificationOptions = { body, icon: '/images/icons/icon-192x192.png' };

  self.registration.showNotification(title, notificationOptions);
});