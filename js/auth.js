/**
 * @file js/auth.js
 * @description إدارة حالة المصادقة وتسجيل دخول المستخدم.
 * 
 * هذا الملف يوفر الدوال اللازمة للتعامل مع حالة تسجيل دخول المستخدم عبر التخزين المحلي (localStorage).
 * - `checkLoginStatus`: تتحقق مما إذا كان المستخدم مسجلاً دخوله عند تحميل الصفحة وتقوم بتحديث واجهة المستخدم.
 * - `logout`: تقوم بتسجيل خروج المستخدم عبر حذف بياناته من التخزين المحلي وتحديث الصفحة.
 */

/**
 * إعداد Firebase Cloud Messaging (FCM) للمستخدم الحالي.
 * هذه الدالة تقوم بتسجيل الـ Service Worker، طلب إذن الإشعارات،
 * الحصول على توكن FCM، وإرساله إلى السيرفر.
 */
async function setupFCM() {
  // التأكد من أن المتصفح يدعم Service Workers
  if (!('serviceWorker' in navigator)) {
    console.warn("[FCM] هذا المتصفح لا يدعم ميزة الإشعارات (Service Workers).");
    return;
  }

  // جلب بيانات المستخدم المسجل دخوله
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
  if (!loggedInUser || !loggedInUser.user_key) {
    // لا نطبع رسالة هنا لأن هذا السلوك متوقع للمستخدمين غير المسجلين
    return;
  }

  try {
    // تسجيل الـ Service Worker الخاص بـ Firebase
    await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('%c[FCM] تم تسجيل عامل الخدمة (Service Worker) بنجاح.', 'color: #28a745');

    // استيراد دوال Firebase بشكل ديناميكي
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js");
    const { getMessaging, getToken, onMessage } = await import("https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging.js");

    // إعداد Firebase
    const firebaseConfig = {
      apiKey: "AIzaSyClapclT8_4UlPvM026gmZbYCiXaiBDUYk",
      authDomain: "suze-bazaar-notifications.firebaseapp.com",
      projectId: "suze-bazaar-notifications",
      storageBucket: "suze-bazaar-notifications.firebasestorage.app",
      messagingSenderId: "983537000435",
      appId: "1:983537000435:web:92c2729c9aaf872764bc86",
      measurementId: "G-P8FMC3KR7M"
    };

    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    // استقبال الإشعارات أثناء فتح الموقع (Foreground)
    onMessage(messaging, (payload) => {
      console.log('%c[FCM] تم استقبال إشعار أثناء فتح الموقع (Foreground):', 'color: #17a2b8', payload);
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: '/images/icons/icon-192x192.png'
      });
    });

    // طلب إذن المستخدم لإرسال الإشعارات
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log('%c[FCM] تم الحصول على إذن إرسال الإشعارات.', 'color: #28a745');

      // 1. التحقق من وجود توكن مخزن محليًا
      let storedToken = localStorage.getItem('fcm_token');
      if (!storedToken) {
        // 2. إذا لم يوجد توكن، اطلب واحدًا جديدًا
        console.log('[FCM] لا يوجد توكن مخزن، جاري طلب توكن جديد من Firebase...');
        const fcmToken = await getToken(messaging, { vapidKey: "BK1_lxS32198GdKm0Gf89yk1eEGcKvKLu9bn1sg9DhO8_eUUhRCAW5tjynKGRq4igNhvdSaR0-eL74V3ACl3AIY" });
        if (fcmToken) {
          console.log('%c[FCM] تم الحصول على توكن جديد:', 'color: #007bff', fcmToken);
          // 3. خزّن التوكن الجديد محليًا
          localStorage.setItem('fcm_token', fcmToken);
          storedToken = fcmToken; // استخدم التوكن الجديد في الخطوة التالية
        }
      }

      // 4. ✅ إصلاح: إرسال التوكن (سواء كان جديدًا أو مخزنًا) إلى الخادم دائمًا
      if (storedToken) {
        console.log(`%c[FCM] جاري إرسال التوكن (المصدر: ${localStorage.getItem('fcm_token') === storedToken ? 'LocalStorage' : 'جديد'}) إلى الخادم...`, 'color: #fd7e14');
        const response = await fetch("/api/save-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_key: loggedInUser.user_key, token: storedToken })
        });
        if (response.ok) {
          console.log('%c[FCM] نجح الخادم في حفظ/تحديث التوكن.', 'color: #28a745');
        } else {
          console.error('[FCM] فشل الخادم في حفظ التوكن. الاستجابة:', await response.json());
        }
      } else {
        console.error('[FCM] لم يتمكن من الحصول على توكن لإرساله إلى الخادم.');
      }
    } else {
      console.warn('[FCM] تم رفض إذن إرسال الإشعارات من قبل المستخدم.');
    }
  } catch (error) {
    console.error("%c[FCM] حدث خطأ فادح أثناء إعداد الإشعارات:", 'color: #dc3545', error);
  }
}

/**
 * يتحقق من حالة تسجيل دخول المستخدم ويقوم بتحديث واجهة المستخدم بناءً عليها.
 */
function checkLoginStatus() {
  const loggedInUser = localStorage.getItem("loggedInUser");
  const userProfileButton = document.getElementById("user-profile-button");

  if (!userProfileButton) return; // الخروج إذا لم يتم العثور على العنصر

  const userProfileLink = userProfileButton.querySelector(".user-profile-link");
  const userIcon = document.getElementById("user-icon");
  const userText = userProfileLink.querySelector(".user-text");

  if (loggedInUser) {
    const user = JSON.parse(loggedInUser);

    // تغيير الأيقونة إلى كلمة "مرحباً"
    if (userIcon) {
      userIcon.className = ""; // إزالة أيقونة Font Awesome
      userIcon.textContent = "مرحباً";
      userIcon.style.marginRight = "5px"; // إضافة هامش صغير
    }

    // تحديث النص لعرض اسم المستخدم
    userText.textContent = user.username;

    // بعد التأكد من تسجيل الدخول، قم بإعداد إشعارات FCM
    setupFCM();
  }
  // إذا لم يكن المستخدم مسجلاً دخوله، سيبقى كل شيء على حاله الافتراضي
}

/**
 * يقوم بتسجيل خروج المستخدم عن طريق إزالة بياناته من التخزين المحلي وإعادة التوجيه.
 */
function logout() {
  Swal.fire({
    title: "هل أنت متأكد؟",
    text: "سيتم تسجيل خروجك.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "نعم، تسجيل الخروج",
    cancelButtonText: "إلغاء",
  }).then((result) => {
    if (result.isConfirmed) {
      // ✅ جديد: حذف توكن FCM من التخزين المحلي عند تسجيل الخروج
      // هذا يضمن أن المستخدم التالي الذي يسجل دخوله على نفس الجهاز سيحصل على توكن جديد خاص به.
      localStorage.removeItem("fcm_token");
      console.log('[Auth] تم حذف توكن FCM من التخزين المحلي.');

      // إزالة بيانات المستخدم من التخزين المحلي
      localStorage.removeItem("loggedInUser");

      // ✅ تعديل: لم نعد نحذف السلة عند تسجيل الخروج،
      // لأنها الآن مرتبطة بالمستخدم وستبقى محفوظة لزيارته القادمة.
      
      // إعادة توجيه المستخدم إلى الصفحة الرئيسية لتحديث حالته
      window.location.href = "index.html";
    }
  });
}