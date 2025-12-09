/**
 * @file js/admin-page.js
 * @description يحتوي هذا الملف على كل المنطق البرمجي الخاص بصفحة admin.html.
 *
 * يشمل ذلك:
 * - التحقق من صلاحيات المسؤول.
 * - عرض لوحة تحكم المسؤول (Admin) لإدارة المستخدمين.
 * - توفير وظيفة مسح بيانات المتصفح.
 */

/**
 * @description Handles the initial setup when the DOM is fully loaded.
 * It checks if a user is logged in and if that user has administrator privileges.
 * Based on the user's status, it either redirects to the login page, displays an
 * access denied message, or initializes the admin panel.
 * @listens DOMContentLoaded
 * @returns {void}
 * @see initializeAdminPanel
 * @see adminPhoneNumbers (from js/config.js)
 */
document.addEventListener("DOMContentLoaded", () => {
  const loggedInUser = localStorage.getItem("loggedInUser");
  // adminPhoneNumbers معرفة بشكل عام في js/config.js
  const loadingContainer = document.getElementById("loading-container");
  const adminPanelContainer = document.getElementById("admin-panel-container");

  if (!loggedInUser) {
    // إذا لم يكن المستخدم مسجلاً دخوله، أعد توجيهه إلى صفحة تسجيل الدخول
    window.location.href = "login.html";
    return;
  }

  const user = JSON.parse(loggedInUser);

  if (!adminPhoneNumbers.includes(user.phone)) {
    // إذا لم يكن المستخدم مسؤولاً، اعرض رسالة "وصول مرفوض"
    loadingContainer.innerHTML = `
      <div class="login-container" style="text-align: center; color: #e74c3c;">
        <h2><i class="fas fa-exclamation-triangle"></i> وصول مرفوض</h2>
        <p>هذه الصفحة مخصصة للمسؤولين فقط.</p>
        <a href="index.html" class="button" style="margin-top: 20px;">العودة إلى الرئيسية</a>
      </div>
    `;
    return;
  }

  // إذا كان المستخدم مسؤولاً، قم بإعداد لوحة التحكم
  loadingContainer.style.display = "none";
  adminPanelContainer.style.display = "flex";
  initializeAdminPanel(user);
});

/**
 * @description تهيئة لوحة تحكم المسؤول، بما في ذلك عرض رسالة الترحيب، والتحقق من حالة الإشعارات،
 *   وإنشاء الأزرار الخاصة بإدارة الإعلانات، عرض المستخدمين، ومسح بيانات المتصفح، ثم ربط الأحداث بها.
 *   يتضمن هذا الزر وظيفة مسح جميع البيانات المحلية (localStorage, sessionStorage, service workers, caches, cookies)
 *   مع تأكيد من المستخدم وإعادة تحميل الصفحة.
 * @function initializeAdminPanel
 * @param {object} user - كائن المستخدم الحالي (المسؤول) الذي تم تسجيل دخوله. يحتوي على خصائص مثل `username` و `phone`.
 * @returns {void}
 * @see checkAndDisplayNotificationStatus
 * @see showAdvertiesmentModal
 * @see showUsersAdminModal
 * @throws {Error} قد يرمي خطأ إذا فشلت عملية مسح Service Workers أو Caches.
 */
function initializeAdminPanel(user) {
  document.getElementById("welcome-message").textContent = `لوحة تحكم المسؤول | ${user.username}`;
  // جديد: التحقق من حالة الإشعارات وعرضها
  checkAndDisplayNotificationStatus();

  // --- إنشاء الأزرار ووضعها في مجموعاتها المخصصة ---

  // 1. زر "إدارة الإعلانات"
  const manageAdButton = document.createElement("button");
  manageAdButton.id = "manage-ad-btn";
  manageAdButton.className = "button logout-btn-small";
  manageAdButton.innerHTML = '<i class="fas fa-ad"></i> إدارة الإعلانات';
  manageAdButton.addEventListener('click', showAdvertiesmentModal);
  document.getElementById("content-management-row").appendChild(manageAdButton);

  // 2. زر "عرض المستخدمين"
  const viewUsersButton = document.createElement("a");
  viewUsersButton.id = "view-users-btn";
  viewUsersButton.href = "#";
  viewUsersButton.className = "button logout-btn-small";
  viewUsersButton.innerHTML = '<i class="fas fa-users"></i> عرض المستخدمين';
  viewUsersButton.addEventListener("click", (e) => {
    e.preventDefault();
    showUsersAdminModal(); // استدعاء دالة الموديول الجديد
  });
  document.getElementById("users-management-row").appendChild(viewUsersButton);

  // 3. زر "مسح بيانات المتصفح"
  const clearBrowserDataButton = document.createElement("a");
  clearBrowserDataButton.id = "clear-data-btn";
  clearBrowserDataButton.href = "#";
  clearBrowserDataButton.className = "button logout-btn-small";
  clearBrowserDataButton.style.backgroundColor = "#c0392b";
  clearBrowserDataButton.innerHTML = '<i class="fas fa-broom"></i> مسح بيانات المتصفح';
  document.getElementById("settings-row").appendChild(clearBrowserDataButton);

  // --- ربط الأحداث بالأزرار ---

  // منطق زر "مسح بيانات المتصفح"
  clearBrowserDataButton.addEventListener("click", (e) => {
    e.preventDefault();
    Swal.fire({
      title: 'هل أنت متأكد تمامًا؟',
      text: "سيتم مسح جميع بيانات الموقع من هذا المتصفح (localStorage, sessionStorage) وتسجيل خروجك. هذا الإجراء لا يمكن التراجع عنه!",
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'نعم، امسح كل شيء!',
      cancelButtonText: 'إلغاء',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          localStorage.clear();
          sessionStorage.clear();
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
              await registration.unregister();
            }
          }
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
          }
          const cookies = document.cookie.split(";");
          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = name.trim() + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          }
        } catch (error) {
          Swal.showValidationMessage(`فشل إعادة التعيين: ${error}`);
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'اكتمل المسح الشامل!',
          icon: 'success',
          html: `
            <div style="text-align: right; line-height: 1.6;">
              تم مسح جميع بيانات الموقع بنجاح.
              <br><br>
              <strong>لإزالة الأذونات (مثل الإشعارات) بشكل كامل:</strong>
              <ol style="padding-right: 20px; margin-top: 10px; text-align: right;">
                <li>انقر على أيقونة القفل <i class="fas fa-lock" style="color: #555;"></i> بجوار عنوان الموقع.</li>
                <li>اختر "إعدادات الموقع" ثم "إعادة ضبط الأذونات".</li>
              </ol>
              <br>
              سيتم إعادة تحميل الصفحة.
            </div>`,
          confirmButtonText: 'موافق'
        }).then(() => {
          window.location.reload(true);
        });
      }
    });
  });
}

/**
 * @description يعرض نافذة منبثقة (Modal) لإدارة الإعلانات، ويقوم بتحميل محتواها من `pages/Advertiesment.html`.
 *   بعد تحميل المحتوى، يستدعي دالة `initializeAdvertiesmentForm` لتهيئة النموذج.
 * @function showAdvertiesmentModal
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال. ينجح إذا تم تحميل وعرض المودال بنجاح.
 * @see loadAndShowModal (assumed to be global or imported)
 * @see initializeAdvertiesmentForm (assumed to be global or imported from js/Advertiesment.js)
 * @throws {Error} إذا فشل تحميل أو عرض المودال.
 */
async function showAdvertiesmentModal() {
  await loadAndShowModal(
    "adver-modal",
    "pages/Advertiesment.html",
    (modal) => {
      if (typeof initializeAdvertiesmentForm === "function") {
        initializeAdvertiesmentForm(modal);
      }
    }
  );
}

