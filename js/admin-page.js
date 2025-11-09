/**
 * @file js/admin-page.js
 * @description يحتوي هذا الملف على كل المنطق البرمجي الخاص بصفحة admin.html.
 *
 * يشمل ذلك:
 * - التحقق من صلاحيات المسؤول.
 * - عرض لوحة تحكم المسؤول (Admin) لإدارة المستخدمين.
 * - توفير وظيفة مسح بيانات المتصفح.
 */

document.addEventListener("DOMContentLoaded", () => {
  const loggedInUser = localStorage.getItem("loggedInUser");
  const adminPhoneNumbers = ["01024182175", "01026546550"];
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
 * تهيئة لوحة تحكم المسؤول.
 * @param {object} user - كائن المستخدم (المسؤول).
 */
function initializeAdminPanel(user) {
  document.getElementById("welcome-message").textContent = `لوحة تحكم المسؤول | ${user.username}`;
  // جديد: التحقق من حالة الإشعارات وعرضها
  checkAndDisplayNotificationStatus();

  const actionButtonsContainer = document.getElementById("admin-action-buttons");

  // 1. إنشاء زر "عرض المستخدمين"
  const viewUsersButton = document.createElement("a");
  viewUsersButton.id = "view-users-btn";
  viewUsersButton.href = "#";
  viewUsersButton.className = "button logout-btn-small";
  viewUsersButton.innerHTML = '<i class="fas fa-users"></i> عرض المستخدمين';
  actionButtonsContainer.appendChild(viewUsersButton);

  // 2. إنشاء زر "مسح بيانات المتصفح"
  const clearBrowserDataButton = document.createElement("a");
  clearBrowserDataButton.id = "clear-data-btn";
  clearBrowserDataButton.href = "#";
  clearBrowserDataButton.className = "button logout-btn-small";
  clearBrowserDataButton.style.backgroundColor = "#c0392b";
  clearBrowserDataButton.innerHTML = '<i class="fas fa-broom"></i> مسح بيانات المتصفح';
  actionButtonsContainer.appendChild(clearBrowserDataButton);

  // --- إضافة منطق الأزرار ---

  // منطق زر "عرض المستخدمين"
  const tableActions = document.getElementById("table-actions");
  const updateBtn = document.getElementById("update-users-btn");
  const cancelBtn = document.getElementById("cancel-update-btn");

  async function loadUsersTable() {
    const tableContentWrapper = document.getElementById("table-content-wrapper");
    tableContentWrapper.innerHTML = '<div class="loader"></div>';
    const users = await fetchUsers();
    if (users && users.length > 0) {
      // جديد: استخدام تصميم البطاقات بدلاً من الجدول
      let usersHTML = '<div class="user-cards-container">';
      users.forEach(u => {
        // إضافة حقل إدخال وزر إرسال لكل مستخدم يمتلك توكن
        const notificationUI = u.fcm_token
          ? `<div class="notification-sender">
               <input type="text" placeholder="اكتب رسالتك هنا..." class="notification-input" id="notif-input-${u.user_key}">
               <button class="send-notif-btn" data-token="${u.fcm_token}" data-user-key="${u.user_key}" title="إرسال"><i class="fas fa-paper-plane"></i></button>
             </div>`
          : '<span class="no-token">لا يستقبل إشعارات</span>';

        usersHTML += `
          <div class="user-card" data-phone="${u.phone}">
            <div class="user-card-header">
              <i class="fas fa-user-circle user-avatar"></i>
              <div class="user-info">
                <span class="user-name">${u.username || 'غير متوفر'}</span>
                <span class="user-phone">${u.phone}</span>
              </div>
            </div>
            <div class="user-card-body">
              <div class="user-card-field seller-field">
                <label for="seller-cb-${u.user_key}">بائع؟</label>
                <label class="switch">
                  <input type="checkbox" id="seller-cb-${u.user_key}" class="seller-checkbox" data-phone="${u.phone}" data-original-state="${u.is_seller}" ${u.is_seller === 1 ? 'checked' : ''}>
                  <span class="slider round"></span>
                </label>
              </div>
              <div class="user-card-field">
                <label>إرسال إشعار</label>
                ${notificationUI}
              </div>
            </div>
          </div>`;
      });
      usersHTML += `</div>`;
      tableContentWrapper.innerHTML = usersHTML;
    } else {
      tableContentWrapper.innerHTML = "<p>لم يتم العثور على مستخدمين.</p>";
    }
    tableActions.style.display = 'none';
  }

  viewUsersButton.addEventListener("click", (e) => {
    e.preventDefault();
    const mainContainer = document.getElementById("users-table-container");
    if (mainContainer.style.display === "block") {
      mainContainer.style.display = "none";
    } else {
      mainContainer.style.display = "block";
      loadUsersTable();
    }
  });

  document.getElementById("users-table-container").addEventListener('change', (event) => {
    if (event.target.classList.contains('seller-checkbox')) {
      tableActions.style.display = 'flex';
    }
  });

  // جديد: إضافة مستمع لزر إرسال الإشعار
  document.getElementById("users-table-container").addEventListener('click', async (event) => {
    const sendBtn = event.target.closest('.send-notif-btn');
    if (!sendBtn) return;

    const userKey = sendBtn.dataset.userKey;
    const token = sendBtn.dataset.token;
    const messageInput = document.getElementById(`notif-input-${userKey}`);
    const message = messageInput.value.trim();

    if (!message) {
      Swal.fire('خطأ', 'الرجاء كتابة رسالة قبل الإرسال.', 'error');
      return;
    }

    sendBtn.disabled = true; // تعطيل الزر لمنع النقرات المتكررة
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const result = await sendNotification(token, 'رسالة من الإدارة', message);

    sendBtn.disabled = false; // إعادة تفعيل الزر
    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';

    if (result && result.success) {
      Swal.fire('تم الإرسال', 'تم إرسال الإشعار بنجاح.', 'success');
      messageInput.value = ''; // مسح حقل الإدخال بعد الإرسال
    } else {
      Swal.fire('فشل الإرسال', `حدث خطأ: ${result.error}`, 'error');
    }
  });

  cancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loadUsersTable();
  });

  updateBtn.addEventListener('click', async () => {
    const checkboxes = document.querySelectorAll('.seller-checkbox');
    const updates = [];
    const changedUsersNames = [];
    checkboxes.forEach(cb => {
      const isSellerNow = cb.checked ? 1 : 0;
      const originalState = parseInt(cb.dataset.originalState, 10);
      updates.push({ phone: cb.dataset.phone, is_seller: isSellerNow });
      if (isSellerNow !== originalState) {
        const userName = cb.closest('.user-card').querySelector('.user-name').textContent;
        changedUsersNames.push(userName);
      }
    });
    const confirmationText = changedUsersNames.length > 0 ? `سيتم تحديث حالة المستخدمين: ${changedUsersNames.join('، ')}.` : "لم يتم إجراء أي تغييرات.";
    Swal.fire({
      title: 'هل أنت متأكد؟', text: confirmationText, icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#3085d6', cancelButtonColor: '#d33', confirmButtonText: 'نعم، قم بالتحديث!', cancelButtonText: 'إلغاء'
    }).then(async (result) => {
      if (result.isConfirmed && changedUsersNames.length > 0) {
        const updateResult = await updateUsers(updates);
        if (updateResult && !updateResult.error) {
          Swal.fire('تم التحديث!', 'تم حفظ التغييرات بنجاح.', 'success');
          tableActions.style.display = 'none';
        } else {
          Swal.fire('خطأ!', 'فشل تحديث البيانات.', 'error');
        }
      }
    });
  });

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
 * يتحقق من حالة إذن الإشعارات ووجود توكن FCM ويعرض رسالة وزر تفعيل عند الحاجة.
 */
async function checkAndDisplayNotificationStatus() {
  const statusContainer = document.getElementById('notification-status-container');
  if (!statusContainer) return;

  // ✅ جديد: التحقق أولاً مما إذا كان المتصفح يدعم الإشعارات من الأساس
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    statusContainer.innerHTML = `<i class="fas fa-exclamation-circle" style="color: #ffc107;"></i> <span>حالة الإشعارات: <strong>غير مدعومة</strong> (هذا المتصفح لا يدعم استقبال الإشعارات)</span>`;
    return;
  }

  let statusHTML = '';
  const permission = Notification.permission;
  const fcmToken = localStorage.getItem('fcm_token');

  if (permission === 'granted') {
    if (fcmToken) {
      statusHTML = `<i class="fas fa-check-circle" style="color: #28a745;"></i> <span>حالة الإشعارات: <strong>مفعّلة</strong> (أنت تستقبل الإشعارات حاليًا)</span>`;
    } else {
      statusHTML = `<i class="fas fa-exclamation-triangle" style="color: #ffc107;"></i> <span>حالة الإشعارات: <strong>قيد التفعيل.</strong> (حاول إعادة تحميل الصفحة لتسجيل الجهاز)</span> <button id="request-notif-btn" class="button-small-action">إعادة المحاولة</button>`;
    }
  } else if (permission === 'denied') {
    statusHTML = `<i class="fas fa-times-circle" style="color: #dc3545;"></i> <span>حالة الإشعارات: <strong>معطّلة</strong> (لقد قمت برفض الإذن)</span> <button id="request-notif-btn" class="button-small-action">إعادة التفعيل</button>`;
  } else {
    statusHTML = `<i class="fas fa-question-circle" style="color: #6c757d;"></i> <span>حالة الإشعارات: <strong>غير محددة</strong></span> <button id="request-notif-btn" class="button-small-action">تفعيل الإشعارات</button>`;
  }

  statusContainer.innerHTML = statusHTML;

  // إضافة وظيفة للزر الجديد
  const requestBtn = document.getElementById('request-notif-btn');
  if (requestBtn) {
    requestBtn.addEventListener('click', async () => {
      // إذا كان الإذن مرفوضًا، يجب على المستخدم تغييره يدويًا
      if (Notification.permission === 'denied') {
        Swal.fire({
          title: 'الإشعارات محظورة',
          icon: 'info',
          html: `
            <div style="text-align: right; line-height: 1.7;">
              لقد قمت بحظر الإشعارات لهذا الموقع سابقًا. لإعادة تفعيلها، اتبع الخطوات الخاصة بمتصفحك:
              <ul style="padding-right: 20px; margin-top: 15px; text-align: right; list-style-type: none;">
                <li style="margin-bottom: 10px;"><strong><i class="fas fa-desktop" style="color: #555;"></i> على الكمبيوتر أو أندرويد:</strong><br>
                  انقر على أيقونة القفل <i class="fas fa-lock" style="color: #555;"></i> بجوار عنوان الموقع، ثم اختر "الأذونات" أو "إعدادات الموقع" وقم بتغيير "الإشعارات" إلى "سماح".
                </li>
                <li><strong><i class="fas fa-mobile-alt" style="color: #555;"></i> على أجهزة أخرى:</strong><br>
                  اذهب إلى إعدادات المتصفح، ثم "إعدادات المواقع"، وابحث عن موقعنا لتعديل أذونات الإشعارات.</li>
              </ul>
              <p style="margin-top: 15px;">قد تحتاج إلى إعادة تحميل الصفحة بعد تغيير الإعداد.</p>
            </div>`,
          confirmButtonText: 'حسنًا، فهمت'
        });
        return;
      }

      // إذا لم يكن الإذن ممنوحًا، اطلب الإذن
      if (typeof setupFCM === 'function') {
        requestBtn.disabled = true;
        requestBtn.textContent = 'جاري...';
        try {
          await setupFCM(); // استدعاء دالة طلب الإذن من auth.js
          // إعادة التحقق من الحالة بعد محاولة التفعيل
          await checkAndDisplayNotificationStatus();
        } catch (error) {
          console.error("فشل في إعداد FCM:", error);
          Swal.fire('خطأ', 'حدث خطأ أثناء محاولة تفعيل الإشعارات.', 'error');
          requestBtn.disabled = false;
          requestBtn.textContent = 'إعادة المحاولة';
        }
      } else {
        console.error('الدالة setupFCM غير موجودة.');
        Swal.fire('خطأ فني', 'لا يمكن طلب إذن الإشعارات حاليًا.', 'error');
      }
    });
  }
}