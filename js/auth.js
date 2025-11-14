/**
 * @file js/auth.js
 * @description إدارة حالة المصادقة، تسجيل الدخول، والإشعارات.
 */

// ==================================================================================
// SECTION: دوال مساعدة (Helper Functions)
// ==================================================================================

/**
 * [Helper] يرسل التوكن (POST) إلى الخادم لحفظه.
 */
async function sendTokenToServer(user_key, token) {
  if (!user_key || !token) {
    console.error('[FCM] User key or token is missing. Cannot send to server.');
    return;
  }
  try {
    const response = await fetch(`${baseURL}/api/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_key, token })
    });
    const responseData = await response.json();
    if (response.ok) {
      console.log('%c[FCM] نجح الخادم في حفظ/تحديث التوكن.', 'color: #28a745', responseData);
    } else {
      console.error('[FCM] فشل الخادم في حفظ التوكن. الحالة:', response.status, 'الاستجابة:', responseData);
    }
  } catch (networkError) {
    console.error('%c[FCM] حدث خطأ في الشبكة أثناء إرسال التوكن:', 'color: #dc3545', networkError);
  }
}

/**
 * [Helper] يرسل طلب حذف التوكن (DELETE) إلى الخادم.
 */
async function deleteTokenFromServer(user_key, token) {
  if (!user_key || !token) return;

  try {
    await fetch(`${baseURL}/api/tokens`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_key, token }),
    });
    console.log('[FCM] تم إرسال طلب حذف التوكن بنجاح.');
  } catch (error) {
    console.error('[FCM] فشل إرسال طلب حذف التوكن:', error);
    // اقتراح: في بيئة الإنتاج، يُنصح بإرسال هذا الخطأ إلى خدمة مراقبة (Logging Service).
  }
}

// ==================================================================================
// SECTION: إعداد وإدارة إشعارات الويب (FCM)
// ==================================================================================

/**
 * إعداد Firebase Cloud Messaging (FCM) للمستخدم الحالي.
 */
async function setupFCM() {
  if (window.Android) {
    console.log('%c[FCM Setup] تم اكتشاف بيئة الأندرويد. سيتم الاعتماد على الإشعارات الأصلية (Native).', 'color: green; font-weight: bold;');
    return;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn("[FCM] هذا المتصفح لا يدعم ميزة الإشعارات (Service Workers).");
    return;
  }
  
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
  if (!loggedInUser || !loggedInUser.user_key) {
    console.warn('[FCM Setup] لا يوجد مستخدم مسجل. تتوقف العملية.');
    return;
  }

  try {
    await navigator.serviceWorker.register('firebase-messaging-sw.js');
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js");
    const { getMessaging, getToken, onMessage, onTokenRefresh } = await import("https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging.js");

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

    // ✅ تحسين: معالجة تجديد التوكن تلقائياً
    onTokenRefresh(messaging, async () => {
      console.log('%c[FCM] تم تجديد توكن الإشعارات. جاري إرسال التوكن الجديد...', 'color: orange;');
      try {
        const refreshedToken = await getToken(messaging, { vapidKey: "BK1_lxS32198GdKm0Gf89yk1eEGcKvKLu9bn1sg9DhO8_eUUhRCAW5tjynKGRq4igNhvdSaR0-eL74V3ACl3AIY" });
        if (refreshedToken) {
          localStorage.setItem('fcm_token', refreshedToken);
          const user = JSON.parse(localStorage.getItem('loggedInUser'));
          if (user && user.user_key) {
            await sendTokenToServer(user.user_key, refreshedToken);
          }
        }
      } catch (err) {
        console.error('[FCM] فشل في الحصول على التوكن المجدّد:', err);
      }
    });

    onMessage(messaging, (payload) => {
      Swal.fire({ title: payload.data.title, text: payload.data.body, icon: 'info', confirmButtonText: 'موافق' });
    });

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      let fcmToken = localStorage.getItem('fcm_token');
      if (!fcmToken) {
        fcmToken = await getToken(messaging, { vapidKey: "BK1_lxS32198GdKm0Gf89yk1eEGcKvKLu9bn1sg9DhO8_eUUhRCAW5tjynKGRq4igNhvdSaR0-eL74V3ACl3AIY" });
        if (fcmToken) localStorage.setItem('fcm_token', fcmToken);
      }

      if (fcmToken) {
        await sendTokenToServer(loggedInUser.user_key, fcmToken);
      }
    }
  } catch (error) {
    console.error("%c[FCM] حدث خطأ فادح أثناء إعداد الإشعارات:", 'color: #dc3545', error);
  }
}

/**
 * يعالج سيناريو قيام المستخدم بإلغاء أذونات الإشعارات من إعدادات المتصفح.
 */
async function handleRevokedPermissions() {
  if (window.Android || !('Notification' in window)) return;

  const currentPermission = Notification.permission;
  const fcmToken = localStorage.getItem('fcm_token');

  if ((currentPermission === 'denied' || currentPermission === 'default') && fcmToken) {
    console.warn('[FCM] تم اكتشاف أن إذن الإشعارات لم يعد ممنوحًا. سيتم حذف التوكن...');
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));

    // ✅ تحسين: استخدام الدالة المساعدة لحذف التوكن
    await deleteTokenFromServer(loggedInUser?.user_key, fcmToken);
    
    // سواء نجح الحذف من الخادم أم لا، يجب إزالة التوكن المحلي.
    localStorage.removeItem('fcm_token');
  }
}

// ==================================================================================
// SECTION: إدارة حالة المستخدم (الدخول والخروج)
// ==================================================================================

/**
 * يتحقق من حالة تسجيل دخول المستخدم ويقوم بتحديث واجهة المستخدم بناءً عليها.
 */
function checkLoginStatus() {
  const loggedInUser = localStorage.getItem("loggedInUser");
  const userProfileButton = document.getElementById("user-profile-button");

  if (!userProfileButton) return;

  if (loggedInUser) {
    const user = JSON.parse(loggedInUser);
    
    const userIcon = document.getElementById("user-icon");
    const userText = userProfileButton.querySelector(".user-profile-link .user-text");
    if(userIcon) userIcon.textContent = "مرحباً";
    if(userText) userText.textContent = user.username;

    handleRevokedPermissions();

    if (user && !user.is_guest) {
      if (window.Android && typeof window.Android.onUserLoggedIn === 'function') {
        window.Android.onUserLoggedIn(JSON.stringify(user));
      }
      setupFCM();
    }
  }
}

/**
 * يقوم بتسجيل خروج المستخدم.
 */
function logout() {
  const fcmToken = localStorage.getItem("fcm_token");
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

  Swal.fire({
    title: "هل أنت متأكد؟",
    text: "سيتم تسجيل خروجك.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "نعم، تسجيل الخروج",
    cancelButtonText: "إلغاء",
    showLoaderOnConfirm: true,
    preConfirm: async () => {
      if (window.Android && typeof window.Android.onUserLoggedOut === 'function') {
        window.Android.onUserLoggedOut(loggedInUser?.user_key);
      }
      // ✅ تحسين: استخدام الدالة المساعدة لحذف التوكن
      await deleteTokenFromServer(loggedInUser?.user_key, fcmToken);
    },
    allowOutsideClick: () => !Swal.isLoading(),
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem("fcm_token");
      localStorage.removeItem("loggedInUser");
      window.location.href = "index.html";
    }
  });
}
