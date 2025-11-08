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
  console.log('%c[FCM Setup] بدأت عملية إعداد الإشعارات...', 'color: purple; font-weight: bold;');
  // التأكد من أن المتصفح يدعم Service Workers
  if (!('serviceWorker' in navigator)) {
    console.warn("[FCM] هذا المتصفح لا يدعم ميزة الإشعارات (Service Workers).");
    return;
  }

  console.log('[FCM Setup] جاري التحقق من وجود مستخدم مسجل...');
  // جلب بيانات المستخدم المسجل دخوله
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
  if (!loggedInUser || !loggedInUser.user_key) {
    console.warn('[FCM Setup] لا يوجد مستخدم مسجل أو لا يحتوي على user_key. تتوقف العملية.');
    return;
  }
  console.log('[FCM Setup] تم العثور على مستخدم مسجل:', loggedInUser.username);

  try {
    console.log('[FCM Setup] جاري تسجيل عامل الخدمة (Service Worker)...');
    // تسجيل الـ Service Worker الخاص بـ Firebase
    await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('%c[FCM] تم تسجيل عامل الخدمة (Service Worker) بنجاح.', 'color: #28a745');

    // استيراد دوال Firebase بشكل ديناميكي
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js");
    const { getMessaging, getToken, onMessage } = await import("https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging.js");

    console.log('[FCM Setup] جاري تهيئة تطبيق Firebase...');
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
    console.log('[FCM Setup] تم تهيئة Firebase بنجاح.');

    // استقبال الإشعارات أثناء فتح الموقع (Foreground)
    onMessage(messaging, (payload) => {
      console.log('%c[FCM] تم استقبال إشعار أثناء فتح الموقع (Foreground):', 'color: #17a2b8', payload);
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: '/images/icons/icon-192x192.png'
      });
    });

    console.log('[FCM Setup] جاري طلب إذن عرض الإشعارات من المستخدم...');
    // طلب إذن المستخدم لإرسال الإشعارات
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log('%c[FCM] تم الحصول على إذن إرسال الإشعارات.', 'color: #28a745');

      // 1. التحقق من وجود توكن مخزن محليًا.
      let fcmToken = localStorage.getItem('fcm_token');
      if (fcmToken) {
        console.log('[FCM Setup] تم العثور على توكن مخزن في localStorage:', fcmToken);
      }

      // 2. إذا لم يوجد توكن، اطلب واحدًا جديدًا.
      if (!fcmToken) {
        console.log('[FCM Setup] لا يوجد توكن مخزن، جاري طلب توكن جديد من Firebase...');
        try {
          const newFcmToken = await getToken(messaging, { vapidKey: "BK1_lxS32198GdKm0Gf89yk1eEGcKvKLu9bn1sg9DhO8_eUUhRCAW5tjynKGRq4igNhvdSaR0-eL74V3ACl3AIY" });
          if (newFcmToken) {
            console.log('%c[FCM Setup] تم الحصول على توكن جديد:', 'color: #007bff', newFcmToken);
            // 3. خزّن التوكن الجديد محليًا.
            console.log('%c[FCM Setup] جاري حفظ التوكن الجديد في localStorage...', 'color: orange;');
            localStorage.setItem('fcm_token', newFcmToken); // <--- نقطة الحفظ المحلي
            fcmToken = newFcmToken; // استخدم التوكن الجديد في الخطوة التالية.
          } else {
            console.error('[FCM] فشل في الحصول على توكن جديد من Firebase.');
          }
        } catch (err) {
          console.error('[FCM] خطأ عند طلب التوكن من Firebase:', err);
          return; // إيقاف التنفيذ إذا فشل الحصول على التوكن
        }
      }

      // 4. ✅ إصلاح: إرسال التوكن (سواء كان جديدًا أو مخزنًا) إلى الخادم دائمًا عند كل تحميل للصفحة.
      // هذا يضمن أن الخادم لديه دائمًا أحدث توكن للمستخدم.
      if (fcmToken) {
        console.log(`%c[FCM Setup] جاري إرسال التوكن إلى الخادم...`, 'color: #fd7e14');
        console.log(`[FCM] User Key: ${loggedInUser.user_key}`);
        console.log(`[FCM] FCM Token: ${fcmToken}`);
        
        try {
          const response = await fetch(`${baseURL}/api/tokens`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_key: loggedInUser.user_key, token: fcmToken })
        });

          const responseData = await response.json();
          if (response.ok) {
            console.log('%c[FCM Setup] نجح الخادم في حفظ/تحديث التوكن.', 'color: #28a745', responseData);
          } else {
            console.error('[FCM] فشل الخادم في حفظ التوكن. الحالة:', response.status, 'الاستجابة:', responseData);
          }
        } catch (networkError) {
          console.error('%c[FCM] حدث خطأ في الشبكة أثناء إرسال التوكن:', 'color: #dc3545', networkError);
        }
      } else {
        console.error('[FCM] لم يتمكن من الحصول على توكن لإرساله إلى الخادم.');
      }
    } else {
      console.warn('[FCM Setup] تم رفض إذن إرسال الإشعارات من قبل المستخدم.');
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
      // ✅ إصلاح: حذف توكن FCM من التخزين المحلي عند تسجيل الخروج
      // هذا يضمن أن المستخدم التالي الذي يسجل دخوله على نفس الجهاز سيحصل على توكن جديد خاص به.
      localStorage.removeItem("fcm_token");
      console.log('[FCM] تم حذف توكن FCM من التخزين المحلي عند تسجيل الخروج.');

      // إزالة بيانات المستخدم من التخزين المحلي
      localStorage.removeItem("loggedInUser");

      // ✅ تعديل: لم نعد نحذف السلة عند تسجيل الخروج،
      // لأنها الآن مرتبطة بالمستخدم وستبقى محفوظة لزيارته القادمة.
      
      // إعادة توجيه المستخدم إلى الصفحة الرئيسية لتحديث حالته
      window.location.href = "index.html";
    }
  });
}