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
  // جلب بيانات المستخدم المسجل دخوله
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  // ✅ خطوة حاسمة: التحقق إذا كان الكود يعمل داخل تطبيق الأندرويد

     // الخطوة الحاسمة: إعلام كود الأندرويد الأصلي (فقط إذا كان مطلوبًا)
      if (
        window.Android &&
        typeof window.Android.onUserLoggedIn === "function"
      ) {
        // احصل على التوكن المحلي من الأندرويد إذا كان موجودًا
        const existingAndroidToken = localStorage.getItem("android_fcm_key");

        // تحقق مما إذا كان التوكن فارغًا أو غير موجود
        if (!existingAndroidToken) {
          console.log(
            "[Auth] بيئة أندرويد مكتشفة والتوكن المحلي فارغ. جاري طلب توكن جديد..."
          );
          // استدعِ دالة الأندرويد فقط إذا لم يكن هناك توكن بالفعل
// الحل المقترح (يرسل كائن JSON)
window.Android.onUserLoggedIn(JSON.stringify({ user_key: loggedInUser.user_key }));
        } else {
          console.log(
            "[Auth] بيئة أندرويد مكتشفة، والتوكن المحلي موجود بالفعل. لا حاجة لطلب جديد."
          );
          // يمكنك هنا إضافة أي منطق آخر إذا أردت، مثل التحقق من صحة التوكن
        }
        return;
      }

  console.log(
    "%c[FCM Setup] بدأت عملية إعداد الإشعارات...",
    "color: purple; font-weight: bold;"
  );
  // التأكد من أن المتصفح يدعم Service Workers
  if (!("serviceWorker" in navigator)) {
    console.warn("[FCM] هذا المتصفح لا يدعم ميزة الإشعارات (Service Workers).");
    return;
  }

  console.log("[FCM Setup] جاري التحقق من وجود مستخدم مسجل...");
  
  if (!loggedInUser || !loggedInUser.user_key) {
    console.warn(
      "[FCM Setup] لا يوجد مستخدم مسجل أو لا يحتوي على user_key. تتوقف العملية."
    );
    return;
  }
  console.log("[FCM Setup] تم العثور على مستخدم مسجل:", loggedInUser.username);
  //
  try {
    console.log("[FCM Setup] جاري تسجيل عامل الخدمة (Service Worker)...");
    await navigator.serviceWorker.register("firebase-messaging-sw.js");
    console.log(
      "%c[FCM] تم تسجيل عامل الخدمة (Service Worker) بنجاح.",
      "color: #28a745"
    );

    // استيراد دوال Firebase بشكل ديناميكي
    const { initializeApp } = await import(
      "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js"
    );
    const { getMessaging, getToken, onMessage } = await import(
      "https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging.js"
    );

    console.log("[FCM Setup] جاري تهيئة تطبيق Firebase...");
    const firebaseConfig = {
      apiKey: "AIzaSyClapclT8_4UlPvM026gmZbYCiXaiBDUYk",
      authDomain: "suze-bazaar-notifications.firebaseapp.com",
      projectId: "suze-bazaar-notifications",
      storageBucket: "suze-bazaar-notifications.firebasestorage.app",
      messagingSenderId: "983537000435",
      appId: "1:983537000435:web:92c2729c9aaf872764bc86",
      measurementId: "G-P8FMC3KR7M",
    };

    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    console.log("[FCM Setup] تم تهيئة Firebase بنجاح.");

    onMessage(messaging, (payload) => {
      console.log(
        "%c[FCM] تم استقبال إشعار أثناء فتح الموقع (Foreground):",
        "color: #17a2b8",
        payload
      );
      const { title, body } = payload.data;
      Swal.fire({
        title: title, // عنوان الرسالة
        text: body, // نص الرسالة
        icon: "info", // أيقونة معلومات
        confirmButtonText: "موافق", // زر واحد للإغلاق
      });
    });

    console.log("[FCM Setup] جاري طلب إذن عرض الإشعارات من المستخدم...");
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log(
        "%c[FCM] تم الحصول على إذن إرسال الإشعارات.",
        "color: #28a745"
      );

      let fcmToken = localStorage.getItem("fcm_token");
      if (fcmToken) {
        console.log(
          "[FCM Setup] تم العثور على توكن مخزن في localStorage:",
          fcmToken
        );
      }

      if (!fcmToken) {
        console.log(
          "[FCM Setup] لا يوجد توكن مخزن، جاري طلب توكن جديد من Firebase..."
        );
        try {
          const newFcmToken = await getToken(messaging, {
            vapidKey:
              "BK1_lxS32198GdKm0Gf89yk1eEGcKvKLu9bn1sg9DhO8_eUUhRCAW5tjynKGRq4igNhvdSaR0-eL74V3ACl3AIY",
          });
          if (newFcmToken) {
            console.log(
              "%c[FCM Setup] تم الحصول على توكن جديد:",
              "color: #007bff",
              newFcmToken
            );
            console.log(
              "%c[FCM Setup] جاري حفظ التوكن الجديد في localStorage...",
              "color: orange;"
            );
            localStorage.setItem("fcm_token", newFcmToken);
            fcmToken = newFcmToken;
          } else {
            console.error("[FCM] فشل في الحصول على توكن جديد من Firebase.");
          }
        } catch (err) {
          console.error("[FCM] خطأ عند طلب التوكن من Firebase:", err);
          return;
        }
      }

      if (fcmToken) {
        console.log(
          `%c[FCM Setup] جاري إرسال التوكن إلى الخادم...`,
          "color: #fd7e14"
        );
        console.log(`[FCM] User Key: ${loggedInUser.user_key}`);
        console.log(`[FCM] FCM Token: ${fcmToken}`);

        try {
          const response = await fetch(`${baseURL}/api/tokens`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_key: loggedInUser.user_key,
              token: fcmToken,
            }),
          });

          const responseData = await response.json();
          if (response.ok) {
            console.log(
              "%c[FCM Setup] نجح الخادم في حفظ/تحديث التوكن.",
              "color: #28a745",
              responseData
            );
          } else {
            console.error(
              "[FCM] فشل الخادم في حفظ التوكن. الحالة:",
              response.status,
              "الاستجابة:",
              responseData
            );
          }
        } catch (networkError) {
          console.error(
            "%c[FCM] حدث خطأ في الشبكة أثناء إرسال التوكن:",
            "color: #dc3545",
            networkError
          );
        }
      } else {
        console.error("[FCM] لم يتمكن من الحصول على توكن لإرساله إلى الخادم.");
      }
    } else {
      console.warn("[FCM Setup] تم رفض إذن إرسال الإشعارات من قبل المستخدم.");
    }
  } catch (error) {
    console.error(
      "%c[FCM] حدث خطأ فادح أثناء إعداد الإشعارات:",
      "color: #dc3545",
      error
    );
  }
}

/**
 * يعالج سيناريو قيام المستخدم بإلغاء أذونات الإشعارات من إعدادات المتصفح.
 * إذا تم العثور على توكن مخزن محليًا بينما الإذن مرفوض، فإنه يحاول حذفه من الخادم.
 */
async function handleRevokedPermissions() {
  // هذا المنطق خاص بالويب فقط، لا ينطبق داخل تطبيق الأندرويد.
  if (window.Android || !("Notification" in window)) {
    return;
  }

  const currentPermission = Notification.permission;
  const fcmToken = localStorage.getItem("fcm_token");

  // إذا كان الإذن 'denied' أو 'default' وما زال لدينا توكن،
  // فهذا يعني أن المستخدم قد ألغى الإذن بعد منحه سابقًا.
  if (
    (currentPermission === "denied" || currentPermission === "default") &&
    fcmToken
  ) {
    console.warn(
      "[FCM] تم اكتشاف أن إذن الإشعارات لم يعد ممنوحًا. سيتم حذف التوكن..."
    );
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

    if (loggedInUser?.user_key) {
      try {
        await fetch(`${baseURL}/api/tokens`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_key: loggedInUser.user_key,
            token: fcmToken,
          }),
        });
        console.log(
          "[FCM] تم إرسال طلب حذف التوكن من الخادم بسبب تغيير حالة الإذن."
        );
      } catch (error) {
        console.error(
          "[FCM] فشل إرسال طلب حذف التوكن بعد تغيير حالة الإذن:",
          error
        );
        // ملاحظة: من الجيد هنا تسجيل هذا الخطأ في خدمة مراقبة خارجية.
      } finally {
        // سواء نجح الحذف من الخادم أم لا، يجب إزالة التوكن المحلي.
        localStorage.removeItem("fcm_token");
        console.log("[FCM] تم حذف التوكن من التخزين المحلي.");
      }
    } else {
      // إذا لم نجد مستخدمًا مسجلاً، فقط احذف التوكن المحلي.
      localStorage.removeItem("fcm_token");
    }
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
      userIcon.className = "welcome-text";
      userIcon.textContent = "مرحباً";
    }

    // تحديث النص لعرض اسم المستخدم
    userText.textContent = user.username;

    // ✅ تحسين: التعامل مع حالة إلغاء المستخدم لأذونات الإشعارات
    handleRevokedPermissions();

    // بعد التأكد من تسجيل الدخول، قم بإعداد إشعارات FCM.
    if (user && !user.is_guest) {
      console.log("[Auth] مستخدم مسجل، جاري إعداد FCM...");

  

      setupFCM();
    }
  }
}

/**
 * يقوم بتسجيل خروج المستخدم عن طريق إزالة بياناته من التخزين المحلي وإعادة التوجيه.
 */
function logout() {
  const fcmToken = localStorage.getItem("fcm_token");
  const android_fcm_key = localStorage.getItem("android_fcm_key");

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
      if (fcmToken || android_fcm_key  && loggedInUser?.user_key) {
        // إعلام كود الأندرويد الأصلي بتسجيل الخروج
        if (
          window.Android &&
          typeof window.Android.onUserLoggedOut === "function"
        ) {
          console.log("[Auth] إعلام الواجهة الأصلية بتسجيل خروج المستخدم...");
          window.Android.onUserLoggedOut(JSON.stringify({ user_key: loggedInUser.user_key }));
          // ✅ إضافة: حذف توكن الأندرويد من localStorage
          localStorage.removeItem("android_fcm_key");
          console.log(
            "[Auth] تم حذف توكن الأندرويد (android_fcm_key) من localStorage."
          );
        }

        try {
          await fetch(`${baseURL}/api/tokens`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_key: loggedInUser.user_key,
              token: fcmToken,
            }),
          });
          console.log("[FCM] تم إرسال طلب حذف التوكن من الخادم بنجاح.");
        } catch (error) {
          // ✅ تحسين: التعامل مع فشل الحذف
          console.error(
            "[FCM] فشل إرسال طلب حذف التوكن من الخادم. هذا قد يؤدي إلى بقاء توكن غير مستخدم في قاعدة البيانات. الخطأ:",
            error
          );
          // اقتراح: في بيئة الإنتاج، يُنصح بإرسال هذا الخطأ إلى خدمة مراقبة (Logging Service)
          // لمتابعة الحالات التي تفشل فيها عملية الحذف ومعالجتها لاحقًا.
        }
      }
    },
    allowOutsideClick: () => !Swal.isLoading(),
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem("fcm_token");
      console.log("[FCM] تم حذف توكن FCM من التخزين المحلي عند تسجيل الخروج.");

      localStorage.removeItem("loggedInUser");

      window.location.href = "index.html";
    }
  });
}
