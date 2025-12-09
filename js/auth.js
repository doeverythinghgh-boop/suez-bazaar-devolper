/**
 * @file js/auth.js
 * @description إدارة حالة المصادقة وتسجيل دخول المستخدم.
 *
 * هذا الملف يوفر الدوال اللازمة للتعامل مع حالة تسجيل دخول المستخدم عبر التخزين المحلي (localStorage).
 * - `checkLoginStatus`: تتحقق مما إذا كان المستخدم مسجلاً دخوله عند تحميل الصفحة وتقوم بتحديث واجهة المستخدم.
 * - `logout`: تقوم بتسجيل خروج المستخدم عبر حذف بياناته من التخزين المحلي وتحديث الصفحة.
 */





/**
 * @description يقوم بتسجيل خروج المستخدم عن طريق إزالة بياناته من التخزين المحلي وإعادة التوجيه إلى صفحة `index.html`.
 *   يتضمن ذلك حذف توكنات FCM من الخادم و`localStorage`.
 * @function logout
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال، يعالج عمليات تسجيل الخروج غير المتزامنة.
 * @see clearAndNavigateToLogin
 */
async function logout() {
  // [خطوة 1] إظهار نافذة تأكيد منبثقة للمستخدم قبل تسجيل الخروج باستخدام SweetAlert.
  Swal.fire({
    title: "هل أنت متأكد؟",
    text: "سيتم تسجيل خروجك.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "نعم، تسجيل الخروج",
    cancelButtonText: "إلغاء",
    showLoaderOnConfirm: true, // إظهار أيقونة تحميل عند الضغط على "نعم".
    // [خطوة 2] استخدام `preConfirm` لتنفيذ عملية تسجيل الخروج غير المتزامنة.
    // سيضمن هذا أن النافذة المنبثقة ستظل مفتوحة وتعرض مؤشر التحميل حتى تكتمل العملية.
    preConfirm: async () => {
      await clearAndNavigateToLogin();
    },
    // [خطوة 3] منع إغلاق النافذة عند النقر خارجها أثناء عملية التحميل.
    allowOutsideClick: () => !Swal.isLoading(),
  });

}

/**
 * @description تقوم بمسح محتوى جميع الحاويات الرئيسية في الصفحة.
 *   تُستخدم هذه الدالة لإعادة تهيئة الواجهة عند تسجيل الخروج أو الانتقال بين الأقسام الرئيسية.
 * @function clearMainContainers
 * @returns {void}
 */
function clearMainContainers() {
  // [خطوة 1] تعريف مصفوفة تحتوي على معرفات جميع الحاويات التي يجب مسحها.
  const containerIds = [
    "index-home-container",
    "index-search-container",
    "index-user-container",
    "index-product-container",
    "index-cardPackage-container",
    "index-myProducts-container",
  ];

  console.log("[UI] جاري مسح الحاويات الرئيسية...");

  // [خطوة 2] المرور على كل معرف في المصفوفة.
  containerIds.forEach(id => {
    const container = document.getElementById(id);
    if (container) {
      // [خطوة 3] إذا تم العثور على الحاوية، يتم تفريغ محتواها بالكامل.
      container.innerHTML = "";
    }
  });

  console.log("[UI] تم مسح الحاويات الرئيسية بنجاح.");
}

/**
 * @description دالة مساعدة جديدة تعالج عملية تسجيل الخروج الكاملة:
 * 1. إعلام واجهة Android (إذا كانت موجودة).
 * 2. محاولة حذف توكن FCM من الخادم.
 * 3. مسح جميع بيانات المتصفح (localStorage, etc.).
 * 4. إعادة توجيه المستخدم إلى صفحة تسجيل الدخول.
 * @async
 * @function clearAndNavigateToLogin
 * @returns {Promise<void>}
 */
async function clearAndNavigateToLogin() {
  //const fcmToken = localStorage.getItem("fcm_token") || localStorage.getItem("android_fcm_key");

  // 1. إعلام واجهة Android (إن وجدت)
  /*if (window.Android && typeof window.Android.onUserLoggedOut === "function") {
    console.log("[Auth] إعلام الواجهة الأصلية بتسجيل خروج المستخدم...");
    window.Android.onUserLoggedOut(JSON.stringify({ user_key: userSession?.user_key }));
  }*/

  // 2. محاولة حذف التوكن من الخادم (إذا كان المستخدم والتوكن موجودين)
  /*if (fcmToken && userSession?.user_key) {
    try {
      await fetch(`${baseURL}/api/tokens`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_key: userSession.user_key,
          token: fcmToken,
        }),
      });
      console.log("[FCM] تم إرسال طلب حذف التوكن من الخادم بنجاح.");
    } catch (error) {
      console.error(
        "[FCM] فشل إرسال طلب حذف التوكن من الخادم. الخطأ:",
        error
      );
      // ملاحظة: حتى لو فشل الحذف من الخادم، ستستمر عملية تسجيل الخروج من جانب العميل.
    }
  }*/
  // 3. مسح جميع بيانات المتصفح
  console.log("[Auth] جاري مسح جميع بيانات المتصفح...");
  await clearAllBrowserData();
  clearMainContainers();
  console.log("[Auth] تم مسح بيانات المتصفح بنجاح.");
userSession=null;
//
  setUserNameInIndexBar(); 
checkImpersonationMode();
  // [خطوة 1] استدعاء `mainLoader` لتحميل محتوى صفحة تسجيل الدخول في حاوية المستخدم الرئيسية.
  console.log("[Auth] دخلنا دالة clearAndNavigateToLogin 00000000000. جاري تحميل صفحة تسجيل الدخول...");
await mainLoader(
    "pages/login.html",
    "index-user-container",
    0,
    undefined,
    "showHomeIcon", true
  );
}


