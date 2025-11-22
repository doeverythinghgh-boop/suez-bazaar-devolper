/**
 * @file js/ui/admin.js
 * @description يحتوي على المنطق الخاص بلوحة تحكم المسؤول (عرض وإدارة المستخدمين).
 */

/**
 * @description تهيئة لوحة تحكم المسؤول لعرض وإدارة المستخدمين.
 *   تتحقق من صلاحيات المسؤول، وتنشئ الأزرار الخاصة بإدارة المستخدمين،
 *   وتقوم بإعداد مستمعي الأحداث لتحميل وعرض جدول المستخدمين وتحديث حالاتهم.
 * @function initializeAdminPanel
 * @param {object} user - كائن المستخدم الحالي الذي تم تسجيل دخوله. يجب أن يحتوي على خاصية `phone` للتحقق من صلاحيات المسؤول.
 * @returns {void}
 * @see fetchUsers
 * @see updateUsers
 */
function initializeAdminPanel(user) {
  /**
   * @constant {Array<string>} adminPhoneNumbers - قائمة بأرقام هواتف المسؤولين المصرح لهم بالوصول إلى لوحة التحكم.
   */
  const adminPhoneNumbers = ["01024182175", "01026546550"];
  if (!adminPhoneNumbers.includes(user.phone)) {
    return; // ليس مسؤولاً، لا تفعل شيئًا
  }

  // إنشاء زر "عرض المستخدمين" إذا لم يكن موجودًا بالفعل
  if (document.getElementById("view-users-btn")) {
    return;
  }

  const viewUsersButton = document.createElement("a");
  viewUsersButton.id = "view-users-btn"; // إضافة ID لمنع التكرار
  viewUsersButton.href = "#"; // منع الانتقال لصفحة أخرى
  viewUsersButton.className = "button logout-btn-small";
  viewUsersButton.style.textDecoration = "none";
  viewUsersButton.innerHTML = '<i class="fas fa-users"></i> عرض المستخدمين';
  
  const loggedInContainer = document.getElementById("logged-in-container");
  const actionButtonsContainer = loggedInContainer.querySelector(".action-buttons");
  actionButtonsContainer.appendChild(viewUsersButton);

  const tableActions = document.getElementById("table-actions");
  const updateBtn = document.getElementById("update-users-btn");
  const cancelBtn = document.getElementById("cancel-update-btn");

  /**
   * @description تقوم بتحميل قائمة المستخدمين من الخادم وعرضها في لوحة تحكم المسؤول باستخدام تصميم البطاقات.
   *   تظهر مؤشر تحميل أثناء جلب البيانات وتُخفي أزرار الإجراءات بعد التحميل.
   * @function loadUsersTable
   * @returns {Promise<void>} - وعد (Promise) يُحل عند اكتمال تحميل وعرض المستخدمين. لا تُرجع الدالة قيمة مباشرة، ولكنها تقوم بتعديل DOM.
   * @see fetchUsers - لجلب بيانات المستخدمين من الواجهة الخلفية.
   * @throws {Error} - قد تحدث أخطاء إذا فشل جلب المستخدمين من الخادم.
   */
  async function loadUsersTable() {
    const tableContentWrapper = document.getElementById("table-content-wrapper");
    tableContentWrapper.innerHTML = '<div class="loader"></div>'; // إظهار مؤشر تحميل
    
    const users = await fetchUsers(); // جلب المستخدمين

    if (users && users.length > 0) {
      // جديد: استخدام تصميم البطاقات بدلاً من الجدول
      let usersHTML = '<div class="user-cards-container">';
      users.forEach(u => {
        usersHTML += `
          <div class="user-card" data-phone="${u.phone}">
            <div class="user-card-header">
              <span class="user-name">${u.username || 'غير متوفر'}</span>
              <span class="user-phone">${u.phone}</span>
            </div>
            <div class="user-card-body">
              <div class="user-card-field">
                <label>بائع؟</label>
                <input type="checkbox" class="seller-checkbox" data-phone="${u.phone}" data-original-state="${u.is_seller}" ${u.is_seller === 1 ? 'checked' : ''}>
              </div>
            </div>
          </div>`;
      });
      usersHTML += `</div>`;
      tableContentWrapper.innerHTML = usersHTML;
    } else {
      tableContentWrapper.innerHTML = "<p>لم يتم العثور على مستخدمين.</p>";
    }
    tableActions.style.display = 'none'; // إخفاء الأزرار عند إعادة التحميل
  }

  /**
   * @description معالج حدث النقر لزر "عرض المستخدمين".
   *   يقوم بتبديل عرض جدول المستخدمين وإخفاء حاوية المنتجات إذا كانت مرئية، ثم يقوم بتحميل جدول المستخدمين.
   * @param {Event} e - كائن الحدث.
   * @returns {void}
   */
  viewUsersButton.addEventListener("click", (e) => {
    e.preventDefault();
    const mainContainer = document.getElementById("users-table-container");
    const productsContainer = document.getElementById("my-products-container"); // الحصول على حاوية المنتجات

    if (mainContainer.style.display === "block") {
      mainContainer.style.display = "none";
    } else {
      // إخفاء جدول المنتجات إذا كان ظاهراً
      if (productsContainer.style.display === "block") {
        productsContainer.style.display = "none";
      }
      mainContainer.style.display = "block";
      loadUsersTable(); // تحميل الجدول عند إظهاره
    }
  });

  /**
   * @description معالج حدث التغيير على حاوية جدول المستخدمين.
   *   إذا كان العنصر الذي تم تغييره هو مربع اختيار البائع، فإنه يظهر حاوية أزرار الإجراءات.
   * @param {Event} event - كائن الحدث.
   * @returns {void}
   */
  document.getElementById("users-table-container").addEventListener('change', (event) => {
    if (event.target.classList.contains('seller-checkbox')) {
      tableActions.style.display = 'flex'; // إظهار حاوية الأزرار
    }
  });

  /**
   * @description معالج حدث النقر لزر "إلغاء التغييرات".
   *   يمنع السلوك الافتراضي ويعيد تحميل جدول المستخدمين لإلغاء أي تغييرات معلقة.
   * @param {Event} e - كائن الحدث.
   * @returns {void}
   */
  cancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loadUsersTable(); // إعادة تحميل الجدول لإلغاء التغييرات
  });

  /**
   * @description معالج حدث النقر لزر "حفظ التغييرات".
   *   يجمع التغييرات من مربعات اختيار البائع، ويعرض مربع حوار للتأكيد باستخدام SweetAlert2،
   *   ثم يقوم بتحديث حالات المستخدمين عبر الواجهة الخلفية بناءً على التأكيد.
   * @async
   * @returns {Promise<void>} - وعد (Promise) يُحل بعد محاولة تحديث المستخدمين وعرض رسالة للمستخدم.
   * @see updateUsers - لتحديث بيانات المستخدمين في الواجهة الخلفية.
   * @throws {Error} - قد تحدث أخطاء إذا فشل تحديث البيانات أو واجهة برمجة التطبيقات.
   */
  updateBtn.addEventListener('click', async () => {
    const checkboxes = document.querySelectorAll('.seller-checkbox');
    const updates = []; // لتخزين جميع التحديثات
    const changedUsersNames = []; // لتخزين أسماء المستخدمين الذين تغيرت حالتهم

    checkboxes.forEach(cb => {
      const isSellerNow = cb.checked ? 1 : 0;
      const originalState = parseInt(cb.dataset.originalState, 10);

      // إضافة المستخدم إلى قائمة التحديثات
      updates.push({
        phone: cb.dataset.phone,
        is_seller: isSellerNow
      });

      // التحقق مما إذا كانت الحالة قد تغيرت
      if (isSellerNow !== originalState) {
        const userName = cb.closest('.user-card').querySelector('.user-name').textContent;
        changedUsersNames.push(userName);
      }
    });

    const confirmationText = changedUsersNames.length > 0 
      ? `سيتم تحديث حالة المستخدمين: ${changedUsersNames.join('، ')}.`
      : "لم يتم إجراء أي تغييرات.";

    Swal.fire({
      title: 'هل أنت متأكد؟',
      text: confirmationText,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'نعم، قم بالتحديث!',
      cancelButtonText: 'إلغاء'
    }).then(async (result) => {
      if (result.isConfirmed && changedUsersNames.length > 0) {
        const updateResult = await updateUsers(updates);
        if (updateResult && !updateResult.error) {
          Swal.fire('تم التحديث!', 'تم حفظ التغييرات بنجاح.', 'success');
          tableActions.style.display = 'none'; // إخفاء الأزرار بعد الحفظ
        } else {
          Swal.fire('خطأ!', 'فشل تحديث البيانات.', 'error');
        }
      }
    });
  });
}