/**
 * @file admin.js
 * @description هذا الملف يحتوي على المنطق الخاص بلوحة تحكم المسؤول لعرض وإدارة المستخدمين.
 *              يشمل التحقق من صلاحيات المسؤول، إعداد واجهة المستخدم لإدارة المستخدمين،
 *              وجلب وعرض بيانات المستخدمين، بالإضافة إلى آليات تحديث حالات المستخدمين.
 *              يهدف إلى توفير واجهة كاملة للمسؤولين لإدارة المستخدمين المسجلين.
 * @module admin
 */

/**
 * @function initializeAdminPanel
 * @description تهيئة لوحة تحكم المسؤول لعرض وإدارة المستخدمين.
 *   تتحقق هذه الدالة من صلاحيات المستخدم الحالي (إذا كان مسؤولاً)،
 *   ثم تقوم بإنشاء زر "عرض المستخدمين" إذا لم يكن موجودًا،
 *   وتُعد مستمعي الأحداث لتحميل وعرض جدول المستخدمين وتحديث حالاتهم.
 *   هي نقطة الدخول الرئيسية لمنطق لوحة تحكم المسؤول.
 * @param {object} user - كائن المستخدم الحالي الذي تم تسجيل دخوله.
 *   يجب أن يحتوي على خاصية `phone` للتحقق من صلاحيات المسؤول.
 * @param {string} user.phone - رقم هاتف المستخدم، يستخدم للتحقق من كونه مسؤولاً.
 * @returns {void} لا تُرجع هذه الدالة أي قيمة.
 * @see {@link fetchUsers} لجلب بيانات المستخدمين من الواجهة الخلفية.
 * @see {@link updateUsers} لتحديث بيانات المستخدمين في الواجهة الخلفية.
 */
function initializeAdminPanel(user) {
  /**
   * @constant {Array<string>} adminPhoneNumbers - قائمة بأرقام هواتف المسؤولين المصرح لهم بالوصول إلى لوحة التحكم.
   *   يتم استخدام هذه القائمة للتحقق من صلاحيات المستخدم.
   * @private
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
   * @function loadUsersTable
   * @description تقوم بتحميل قائمة المستخدمين من الخادم وعرضها في لوحة تحكم المسؤول باستخدام تصميم البطاقات.
   *   تُظهر مؤشر تحميل أثناء جلب البيانات وتُخفي أزرار الإجراءات بعد التحميل.
   *   تتفاعل مع DOM لتحديث عرض المستخدمين.
   * @async
   * @returns {Promise<void>} وعد (Promise) يُحل عند اكتمال تحميل وعرض المستخدمين.
   *   لا تُرجع الدالة قيمة مباشرة، ولكنها تقوم بتعديل DOM.
   * @throws {Error} قد تحدث أخطاء إذا فشل جلب المستخدمين من الخادم
   *   (مثل مشكلات الشبكة أو استجابة غير متوقعة من الواجهة الخلفية).
   * @see {@link fetchUsers} لجلب بيانات المستخدمين الفعلية من الواجهة الخلفية.
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
   * @function viewUsersButton~event:click
   * @description معالج حدث النقر لزر "عرض المستخدمين".
   *   يقوم هذا المعالج بتبديل عرض حاوية جدول المستخدمين. إذا كانت مرئية، فسيتم إخفاؤها.
   *   إذا كانت مخفية، فسيتم إظهارها وإخفاء حاوية المنتجات إذا كانت مرئية، ثم يقوم بتحميل جدول المستخدمين
   *   عبر استدعاء {@link loadUsersTable}.
   * @param {Event} e - كائن الحدث (Event object) الذي يمثل النقر.
   * @returns {void} لا تُرجع هذه الدالة أي قيمة بشكل مباشر، ولكنها تحدث تغييرات في DOM.
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
   * @function usersTableContainer~event:change
   * @description معالج حدث التغيير على حاوية جدول المستخدمين.
   *   إذا كان العنصر الذي تم تغييره هو مربع اختيار البائع (`.seller-checkbox`),
   *   فإنه يُظهر حاوية أزرار الإجراءات (`tableActions`) لتوفير خيارات الحفظ أو الإلغاء.
   * @param {Event} event - كائن الحدث (Event object) الذي يمثل التغيير.
   * @returns {void} لا تُرجع هذه الدالة أي قيمة بشكل مباشر، ولكنها تحدث تغييرات في DOM.
   */
  document.getElementById("users-table-container").addEventListener('change', (event) => {
    if (event.target.classList.contains('seller-checkbox')) {
      tableActions.style.display = 'flex'; // إظهار حاوية الأزرار
    }
  });

  /**
   * @function cancelBtn~event:click
   * @description معالج حدث النقر لزر "إلغاء التغييرات".
   *   يمنع السلوك الافتراضي للنقر ويعيد تحميل جدول المستخدمين لإلغاء
   *   أي تغييرات معلقة لم يتم حفظها بعد. يُعيد واجهة المستخدم إلى حالتها الأصلية.
   * @param {Event} e - كائن الحدث (Event object) الذي يمثل النقر.
   * @returns {void} لا تُرجع هذه الدالة أي قيمة بشكل مباشر، ولكنها تقوم بتحديث DOM.
   * @see {@link loadUsersTable} لإعادة تحميل جدول المستخدمين.
   */
  cancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loadUsersTable(); // إعادة تحميل الجدول لإلغاء التغييرات
  });

  /**
   * @function updateBtn~event:click
   * @description معالج حدث النقر لزر "حفظ التغييرات".
   *   يقوم هذا المعالج بجمع التغييرات من مربعات اختيار البائع في واجهة المستخدم،
   *   ويعرض مربع حوار للتأكيد للمستخدم باستخدام SweetAlert2.
   *   بناءً على تأكيد المستخدم، يقوم بإرسال التحديثات إلى الواجهة الخلفية عبر {@link updateUsers}
   *   ويعرض رسالة نجاح أو فشل للمستخدم.
   * @async
   * @returns {Promise<void>} وعد (Promise) يُحل بعد محاولة تحديث المستخدمين وعرض رسالة للمستخدم.
   *   لا تُرجع هذه الدالة قيمة بشكل مباشر، ولكنها تتفاعل مع DOM وتجري عمليات غير متزامنة.
   * @see {@link updateUsers} لتحديث بيانات المستخدمين في الواجهة الخلفية.
   * @throws {Error} قد تحدث أخطاء إذا فشل تحديث البيانات (مثل مشكلات الشبكة، خطأ في الواجهة الخلفية، أو استجابة غير متوقعة).
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