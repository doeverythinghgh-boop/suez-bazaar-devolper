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
      let tableHTML = `<table class="users-table"><thead><tr><th>الاسم</th><th>رقم الهاتف</th><th>بائع؟</th></tr></thead><tbody>`;
      users.forEach(u => {
        tableHTML += `<tr>
            <td>${u.username || 'غير متوفر'}</td>
            <td>${u.phone}</td>
            <td><input type="checkbox" class="seller-checkbox" data-phone="${u.phone}" data-original-state="${u.is_seller}" ${u.is_seller === 1 ? 'checked' : ''}></td>
          </tr>`;
      });
      tableHTML += `</tbody></table>`;
      tableContentWrapper.innerHTML = tableHTML;
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
        const userName = cb.closest('tr').querySelector('td:first-child').textContent;
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