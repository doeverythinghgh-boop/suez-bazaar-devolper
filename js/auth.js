/**
 * @file js/auth.js
 * @description إدارة حالة المصادقة وتسجيل دخول المستخدم.
 * 
 * هذا الملف يوفر الدوال اللازمة للتعامل مع حالة تسجيل دخول المستخدم عبر التخزين المحلي (localStorage).
 * - `checkLoginStatus`: تتحقق مما إذا كان المستخدم مسجلاً دخوله عند تحميل الصفحة وتقوم بتحديث واجهة المستخدم.
 * - `logout`: تقوم بتسجيل خروج المستخدم عبر حذف بياناته من التخزين المحلي وتحديث الصفحة.
 */
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
      // إزالة بيانات المستخدم من التخزين المحلي
      localStorage.removeItem("loggedInUser");
      // إعادة توجيه المستخدم إلى الصفحة الرئيسية لتحديث حالته
      window.location.href = "index.html";
    }
  });
}