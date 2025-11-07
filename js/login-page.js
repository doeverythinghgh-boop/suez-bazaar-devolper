/**
 * @file js/login-page.js
 * @description يحتوي هذا الملف على كل المنطق البرمجي الخاص بصفحة login.html.
 *
 * يشمل ذلك:
 * - التعامل مع نموذج تسجيل الدخول.
 * - تحديث الواجهة للمستخدم المسجل دخوله.
 * - عرض لوحة تحكم المسؤول (Admin) لإدارة المستخدمين.
 * - عرض لوحة تحكم البائع (Seller) لإدارة المنتجات.
 * - عرض وإدارة سلة المشتريات والمشتريات السابقة.
 * - عرض النوافذ المنبثقة (Modals) لإضافة/تعديل المنتجات والبيانات الشخصية.
 */

/**
 * تحديث واجهة المستخدم لتعكس حالة تسجيل الدخول.
 * @param {object} user - كائن المستخدم المسجل دخوله.
 */
function updateViewForLoggedInUser(user) {
  // إخفاء حاوية نموذج تسجيل الدخول
  const loginFormWrapper = document.getElementById("login-form-wrapper");
  if (loginFormWrapper) {
    loginFormWrapper.style.display = "none";
  }

  // إظهار حاوية المستخدم المسجل
  const loggedInContainer = document.getElementById("logged-in-container");
  loggedInContainer.style.display = "flex";
  document.getElementById(
    "welcome-message"
  ).textContent = `أهلاً بك، ${user.username}`;

  // إضافة وظيفة لزر تسجيل الخروج
  document.getElementById("logout-btn-alt").addEventListener("click", logout); // هذا الزر الآن هو زر تسجيل الخروج الصحيح

  // ✅ تصحيح: إظهار زر "عرض السلة" لجميع المستخدمين المسجلين
  const viewCartBtn = document.getElementById("view-cart-btn");
  viewCartBtn.style.display = "inline-flex";
  viewCartBtn.addEventListener("click", showCartModal);

  // جديد: إظهار زر "المشتريات" لجميع المستخدمين المسجلين
  const viewPurchasesBtn = document.getElementById("view-purchases-btn");
  viewPurchasesBtn.style.display = "inline-flex";
  viewPurchasesBtn.addEventListener("click", () => showPurchasesModal(user.user_key));


  // جديد: إظهار زر "تعديل البيانات" وإضافة حدث النقر
  const editProfileBtn = document.getElementById("edit-profile-btn");
  editProfileBtn.style.display = "inline-flex";
  editProfileBtn.addEventListener("click", () => showEditProfileModal(user));

  // التحقق مما إذا كان المستخدم بائعًا
  if (user.is_seller === 1) {
    const addProductBtn = document.getElementById("add-product-btn");
    addProductBtn.style.display = "inline-flex"; // إظهار الزر
    addProductBtn.addEventListener("click", showAddProductModal); // إضافة حدث النقر

    // جديد: إظهار زر "عرض منتجاتي" وإضافة حدث النقر
    const viewMyProductsBtn = document.getElementById("view-my-products-btn");
    viewMyProductsBtn.style.display = "inline-flex";
    viewMyProductsBtn.addEventListener("click", () => showMyProducts(user.user_key));

  }

  // التحقق مما إذا كان المستخدم هو أحد المسؤولين المحددين
  const adminPhoneNumbers = ["01024182175", "01026546550"];
  if (adminPhoneNumbers.includes(user.phone)) {
    // إنشاء زر "عرض المستخدمين" إذا لم يكن موجودًا بالفعل
    if (!document.getElementById("view-users-btn")) {
      const viewUsersButton = document.createElement("a");
      viewUsersButton.id = "view-users-btn"; // إضافة ID لمنع التكرار
      viewUsersButton.href = "#"; // منع الانتقال لصفحة أخرى
      viewUsersButton.className = "button logout-btn-small";
      viewUsersButton.style.textDecoration = "none";
      viewUsersButton.innerHTML =
        '<i class="fas fa-users"></i> عرض المستخدمين';
      
      const tableActions = document.getElementById("table-actions");
      const updateBtn = document.getElementById("update-users-btn");
      const cancelBtn = document.getElementById("cancel-update-btn");

      // دالة لتحميل وتعبئة جدول المستخدمين
      async function loadUsersTable() {
        const tableContentWrapper = document.getElementById("table-content-wrapper");
        tableContentWrapper.innerHTML = '<div class="loader"></div>'; // إظهار مؤشر تحميل
        
        const users = await fetchUsers(); // جلب المستخدمين

        if (users && users.length > 0) {
          let tableHTML = `
            <table class="users-table">
              <thead><tr><th>الاسم</th><th>رقم الهاتف</th><th>بائع؟</th></tr></thead>
              <tbody>`;
          users.forEach(u => {
            tableHTML += `
              <tr>
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
        tableActions.style.display = 'none'; // إخفاء الأزرار عند إعادة التحميل
      }

      // حدث النقر على زر "عرض المستخدمين"
      viewUsersButton.addEventListener("click", (e) => {
        e.preventDefault();
        const mainContainer = document.getElementById("users-table-container");
        const productsContainer = document.getElementById("my-products-container"); // جديد: الحصول على حاوية المنتجات

        if (mainContainer.style.display === "block") {
          mainContainer.style.display = "none";
        } else {
          // جديد: إخفاء جدول المنتجات إذا كان ظاهراً
          if (productsContainer.style.display === "block") {
            productsContainer.style.display = "none";
          }
          mainContainer.style.display = "block";
          loadUsersTable(); // تحميل الجدول عند إظهاره
        }
      });

      // إضافة مستمع للتغييرات على مربعات الاختيار لإظهار الأزرار
      document.getElementById("users-table-container").addEventListener('change', (event) => {
        if (event.target.classList.contains('seller-checkbox')) {
          tableActions.style.display = 'flex'; // إظهار حاوية الأزرار
        }
      });

      // حدث النقر على زر "إلغاء التغييرات"
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loadUsersTable(); // إعادة تحميل الجدول لإلغاء التغييرات
      });

      // حدث النقر على زر "حفظ التغييرات"
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
            const userName = cb.closest('tr').querySelector('td:first-child').textContent;
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

      const actionButtonsContainer =
        loggedInContainer.querySelector(".action-buttons");
      actionButtonsContainer.appendChild(viewUsersButton);
    }
  }
}

/**
 * جديد: يعرض نافذة منبثقة لتعديل بيانات المستخدم.
 * @param {object} currentUser - بيانات المستخدم الحالية.
 */
async function showEditProfileModal(currentUser) {
  const { value: formValues } = await Swal.fire({
    title: 'تعديل بياناتك الشخصية',
    html: `
      <div style="text-align: right; display: flex; flex-direction: column; gap: 1rem;">
        <input id="swal-username" class="swal2-input" placeholder="الاسم" value="${currentUser.username || ''}">
        <input id="swal-phone" class="swal2-input" placeholder="رقم الهاتف" value="${currentUser.phone || ''}">
        <input id="swal-address" class="swal2-input" placeholder="العنوان (اختياري)" value="${currentUser.Address || ''}">
        <hr style="border-top: 1px solid #eee; margin: 0.5rem 0;">
        <p style="font-size: 0.9rem; color: #555;">لتغيير كلمة المرور، أدخل كلمة المرور الجديدة أدناه.</p>
        <div class="swal2-password-container">
          <input type="password" id="swal-password" class="swal2-input" placeholder="كلمة المرور الجديدة (اختياري)">
          <i class="fas fa-eye swal2-password-toggle-icon" id="swal-toggle-password"></i>
        </div>
        <div class="swal2-password-container">
          <input type="password" id="swal-confirm-password" class="swal2-input" placeholder="تأكيد كلمة المرور الجديدة">
          <i class="fas fa-eye swal2-password-toggle-icon" id="swal-toggle-confirm-password"></i>
        </div>
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'حفظ التغييرات',
    cancelButtonText: 'إلغاء',
    showLoaderOnConfirm: true,
    didOpen: () => {
      // وظيفة تبديل عرض كلمة المرور
      const togglePasswordVisibility = (inputId, toggleId) => {
        const passwordInput = document.getElementById(inputId);
        const toggleIcon = document.getElementById(toggleId);
        toggleIcon.addEventListener('click', () => {
          const isPassword = passwordInput.type === 'password';
          passwordInput.type = isPassword ? 'text' : 'password';
          toggleIcon.classList.toggle('fa-eye');
          toggleIcon.classList.toggle('fa-eye-slash');
        });
      };
      togglePasswordVisibility('swal-password', 'swal-toggle-password');
      togglePasswordVisibility('swal-confirm-password', 'swal-toggle-confirm-password');
    },
    preConfirm: async () => { // تحويل الدالة إلى async
      const username = document.getElementById('swal-username').value;
      const phone = document.getElementById('swal-phone').value;
      const address = document.getElementById('swal-address').value;
      const password = document.getElementById('swal-password').value;
      const confirmPassword = document.getElementById('swal-confirm-password').value;

      // التحقق من صحة المدخلات
      if (!username.trim() || username.length < 8) {
        Swal.showValidationMessage('الاسم مطلوب ويجب أن يكون 8 أحرف على الأقل.');
        return false;
      }
      if (!phone.trim() || phone.length < 11) {
        Swal.showValidationMessage('رقم الهاتف مطلوب ويجب أن يكون 11 رقمًا على الأقل.');
        return false;
      }
      if (password && password !== confirmPassword) {
        Swal.showValidationMessage('كلمتا المرور غير متطابقتين.');
        return false;
      }

      // ✅ تعديل: إذا تم إدخال كلمة مرور جديدة، تحقق من القديمة فقط إذا كانت موجودة بالفعل
      if (password && currentUser.Password) {
        const { value: oldPassword } = await Swal.fire({
          title: 'التحقق من الهوية',
          text: 'لتغيير كلمة المرور، الرجاء إدخال كلمة المرور القديمة.',
          input: 'password',
          inputPlaceholder: 'أدخل كلمة المرور القديمة',
          inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
          showCancelButton: true,
          confirmButtonText: 'تحقق',
          cancelButtonText: 'إلغاء',
          showLoaderOnConfirm: true,
          preConfirm: async (enteredOldPassword) => {
            if (!enteredOldPassword) {
              Swal.showValidationMessage('يجب إدخال كلمة المرور القديمة.');
              return false;
            }
            // استدعاء الواجهة البرمجية للتحقق من كلمة المرور القديمة
            const verificationResult = await verifyUserPassword(currentUser.phone, enteredOldPassword);
            if (verificationResult.error) {
              Swal.showValidationMessage(`كلمة المرور القديمة غير صحيحة.`);
              return false;
            }
            return true; // كلمة المرور صحيحة
          },
          allowOutsideClick: () => !Swal.isLoading()
        });

        // إذا لم يقم المستخدم بالتحقق أو ألغى العملية، أوقف التحديث
        if (!oldPassword) {
          Swal.showValidationMessage('تم إلغاء تغيير كلمة المرور.');
          return false;
        }
      }

      // تجميع البيانات التي تغيرت فقط
      const updatedData = { user_key: currentUser.user_key };
      if (username !== currentUser.username) updatedData.username = username;
      if (phone !== currentUser.phone) updatedData.phone = phone;
      if (address !== (currentUser.Address || '')) updatedData.address = address;
      if (password) updatedData.password = password;

      // إذا لم يتغير شيء، لا ترسل الطلب
      if (Object.keys(updatedData).length === 1) {
         Swal.fire('لم يتغير شيء', 'لم تقم بإجراء أي تغييرات على بياناتك.', 'info');
         return false; // يمنع إغلاق النافذة
      }

      return updatedData;
    }
  });

  if (formValues) {
    // إرسال البيانات إلى الخادم
    const result = await updateUser(formValues);

    if (result && !result.error) {
      // تحديث البيانات في localStorage
      const updatedUser = { ...currentUser };
      if (formValues.username) updatedUser.username = formValues.username;
      if (formValues.phone) updatedUser.phone = formValues.phone;
      if (formValues.address !== undefined) updatedUser.Address = formValues.address;
      // لا نحفظ كلمة المرور في localStorage

      localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));

      // تحديث الواجهة فورًا
      document.getElementById("welcome-message").textContent = `أهلاً بك، ${updatedUser.username}`;

      Swal.fire({
        icon: 'success',
        title: 'تم التحديث بنجاح!',
        text: result.message,
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'حدث خطأ',
        text: result.error || 'فشل تحديث البيانات. يرجى المحاولة مرة أخرى.',
      });
    }
  }
}


/**
 * يعرض نافذة منبثقة لإضافة منتج جديد.
 */
async function showAddProductModal() {
  const addProductModal = document.getElementById("add-product-modal");
  
  // تحميل محتوى نموذج إضافة المنتج
  const response = await fetch("pages/addProduct.html");
  const modalContent = await response.text();
  addProductModal.innerHTML = modalContent;

  // إظهار النافذة المنبثقة
  document.body.classList.add("modal-open");
  addProductModal.style.display = "block";

  // استخراج وتنفيذ السكريبت من المحتوى المحمل
  const scriptElement = addProductModal.querySelector("script");
  if (scriptElement) {
    // الطريقة الأكثر أمانًا وموثوقية: إضافة السكريبت إلى الصفحة
    const newScript = document.createElement("script");
    newScript.innerHTML = scriptElement.innerHTML;
    document.body.appendChild(newScript);
    // استدعاء دالة التهيئة مباشرة بعد إضافة السكريبت
    if (typeof initializeAddProductForm === "function") initializeAddProductForm();
    document.body.removeChild(newScript); // تنظيف
  }

  // وظيفة لإغلاق النافذة
  const closeAddProductModal = () => {
    addProductModal.style.display = "none";
    addProductModal.innerHTML = ""; // تنظيف المحتوى
    document.body.classList.remove("modal-open");
  };

  // إضافة حدث النقر لزر الإغلاق
  const closeBtn = document.getElementById("add-product-modal-close-btn");
  if (closeBtn) closeBtn.onclick = closeAddProductModal;

  // إغلاق النافذة عند النقر خارجها
  window.addEventListener('click', (event) => {
    if (event.target == addProductModal) closeAddProductModal();
  }, { once: true });
}

/**
 * جديد: يعرض نافذة منبثقة لتعديل منتج موجود.
 * @param {object} productData - بيانات المنتج المراد تعديله.
 */
async function showEditProductModal(productData) {
  const addProductModal = document.getElementById("add-product-modal");
  
  // تحميل محتوى نموذج إضافة المنتج
  const response = await fetch("pages/addProduct.html");
  const modalContent = await response.text();
  addProductModal.innerHTML = modalContent;

  // إظهار النافذة المنبثقة
  document.body.classList.add("modal-open");
  addProductModal.style.display = "block";

  // استخراج وتنفيذ السكريبت من المحتوى المحمل
  const scriptElement = addProductModal.querySelector("script");
  if (scriptElement) {
    const newScript = document.createElement("script");
    newScript.innerHTML = scriptElement.innerHTML;
    document.body.appendChild(newScript);
    
    // استدعاء دالة التهيئة وتمرير بيانات المنتج لوضع التعديل
    if (typeof initializeAddProductForm === "function") {
      // ننتظر قليلاً لضمان تحميل كل شيء قبل التعبئة
      setTimeout(() => initializeAddProductForm(productData), 100);
    }
    
    document.body.removeChild(newScript); // تنظيف
  }

  // جديد: إضافة وظيفة إغلاق النافذة (كانت مفقودة في وضع التعديل)
  const closeEditModal = () => {
    addProductModal.style.display = "none";
    addProductModal.innerHTML = ""; // تنظيف المحتوى
    document.body.classList.remove("modal-open");
  };

  // إضافة حدث النقر لزر الإغلاق
  const closeBtn = document.getElementById("add-product-modal-close-btn");
  if (closeBtn) closeBtn.onclick = closeEditModal;

  // إغلاق النافذة عند النقر خارجها
  // استخدام { once: true } يضمن أن المستمع يعمل مرة واحدة ثم يزيل نفسه تلقائيًا
  window.addEventListener('click', (event) => {
    if (event.target == addProductModal) closeEditModal();
  }, { once: true });
}

/**
 * جديد: يعرض نافذة منبثقة بسجل مشتريات المستخدم.
 * @param {string} userKey - المفتاح الفريد للمستخدم.
 */
async function showPurchasesModal(userKey) {
  const purchasesModal = document.getElementById("purchases-modal-container");
  
  // عرض النافذة مع مؤشر تحميل
  purchasesModal.innerHTML = `
    <div class="modal-content">
      <span class="close-button" id="purchases-modal-close-btn">&times;</span>
      <h2><i class="fas fa-history"></i> سجل المشتريات</h2>
      <div class="loader" style="margin: 2rem auto;"></div>
    </div>`;
  
  document.body.classList.add("modal-open");
  purchasesModal.style.display = "block";

  // وظيفة الإغلاق
  const closePurchasesModal = () => {
    purchasesModal.style.display = "none";
    document.body.classList.remove("modal-open");
  };

  document.getElementById("purchases-modal-close-btn").onclick = closePurchasesModal;
  window.addEventListener('click', (event) => {
    if (event.target == purchasesModal) closePurchasesModal();
  }, { once: true });

  // جلب البيانات
  const purchases = await getUserPurchases(userKey);
  const modalContentEl = purchasesModal.querySelector('.modal-content');

  // بناء المحتوى بعد جلب البيانات
  let contentHTML = `
    <span class="close-button" id="purchases-modal-close-btn">&times;</span>
    <h2><i class="fas fa-history"></i> سجل المشتريات</h2>`;

  if (purchases && purchases.length > 0) {
    contentHTML += '<div id="purchases-list">';
    purchases.forEach(item => {
      const firstImage = item.ImageName ? item.ImageName.split(',')[0] : '';
      const imageUrl = firstImage 
        ? `https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/${firstImage}`
        : 'data:image/svg+xml,...'; // صورة افتراضية
      
      // ✅ تعديل: إظهار التاريخ والوقت معًا
      const purchaseDate = new Date(item.created_at).toLocaleString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
      });

      // تحديد تنسيق حالة الطلب
      let statusText = 'قيد المعالجة';
      let statusClass = 'status-pending';
      if (item.order_status === 'shipped') {
        statusText = 'جارٍ الشحن';
        statusClass = 'status-shipped';
      } else if (item.order_status === 'delivered') {
        statusText = 'تم التسليم';
        statusClass = 'status-delivered';
      }

      // ✅ إضافة: حساب الإجمالي لكل منتج
      const itemPrice = parseFloat(item.product_price) || 0;
      const itemQuantity = parseInt(item.quantity, 10) || 0;
      const itemTotal = (itemPrice * itemQuantity).toFixed(2);

      contentHTML += `
        <div class="purchase-item">
          <img src="${imageUrl}" alt="${item.productName}">
          <div class="purchase-item-details">
            <strong>${item.productName}</strong>
            <p><strong>سعر القطعة:</strong> ${itemPrice.toFixed(2)} جنيه</p>
            <p><strong>الكمية:</strong> ${item.quantity}</p>
            <p><strong>الإجمالي:</strong> ${itemTotal} جنيه</p>
            <p><strong>تاريخ الطلب:</strong> ${purchaseDate}</p>
            <p><strong>حالة الطلب:</strong> <span class="purchase-status ${statusClass}">${statusText}</span></p>
          </div>
        </div>`;
    });
    contentHTML += '</div>';
  } else if (purchases) {
    contentHTML += '<p style="text-align: center; padding: 2rem 0;">لا توجد مشتريات سابقة.</p>';
  } else {
    contentHTML += '<p style="text-align: center; padding: 2rem 0; color: red;">حدث خطأ أثناء تحميل سجل المشتريات.</p>';
  }

  modalContentEl.innerHTML = contentHTML;
  // إعادة ربط حدث الإغلاق بعد تحديث المحتوى
  modalContentEl.querySelector('#purchases-modal-close-btn').onclick = closePurchasesModal;
}

/**
 * جديد: يعرض جدولاً بمنتجات المستخدم الحالي.
 * @param {string} userKey - المفتاح الفريد للمستخدم.
 */
async function showMyProducts(userKey) {
  const container = document.getElementById("my-products-container");
  const usersContainer = document.getElementById("users-table-container"); // جديد: الحصول على حاوية المستخدمين
  
  // تبديل العرض: إذا كان الجدول ظاهراً، قم بإخفائه. وإلا، قم بتحميله وإظهاره.
  if (container.style.display === "block") {
    container.style.display = "none";
    return;
  }

  // جديد: إخفاء جدول المستخدمين إذا كان ظاهراً
  if (usersContainer.style.display === "block") {
    usersContainer.style.display = "none";
  }

  container.innerHTML = '<div class="loader"></div>'; // إظهار مؤشر التحميل
  container.style.display = "block";

  const products = await getProductsByUser(userKey);

  if (products && products.length > 0) {
    // بناء الجدول
    let tableHTML = `
      <table class="products-table">
        <thead>
          <tr>
            <th>صورة المنتج</th>
            <th>تفاصيل المنتج</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>`;

    products.forEach(p => {
      // جديد: بناء HTML لعرض جميع صور المنتج
      let imagesHtml = '';
      if (p.ImageName) {
        const imageNames = p.ImageName.split(',');
        imagesHtml = '<div class="product-images-container">';
        imageNames.forEach(imageName => {
          if (imageName) { // التأكد من أن اسم الصورة ليس فارغًا
            const imageUrl = `https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/${imageName}`;
            imagesHtml += `<img src="${imageUrl}" alt="صورة منتج" onerror="this.style.display='none'">`;
          }
        });
        imagesHtml += '</div>';
      } else {
        imagesHtml = `<img src="data:image/svg+xml;charset=UTF-8,%3csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='xMidYMid meet'%3e%3crect width='100' height='100' fill='%23e0e0e0'/%3e%3ctext x='50' y='50' font-family='Arial' font-size='12' dy='.3em' fill='%23999' text-anchor='middle'%3eNo Image%3c/text%3e%3c/svg%3e'" alt="لا توجد صورة">`;
      }

      // تحويل كائن المنتج إلى نص JSON لاستخدامه في زر التعديل
      const productJson = JSON.stringify(p);

      // جديد: بناء جزء السعر مع السعر قبل الخصم إذا كان موجودًا
      let priceHtml = `<p><strong>السعر:</strong> ${p.product_price} جنيه</p>`;
      if (p.original_price && parseFloat(p.original_price) > 0) {
        priceHtml += `<p><strong>السعر قبل الخصم:</strong> <span style="text-decoration: line-through; color: #7f8c8d;">${p.original_price} جنيه</span></p>`;
      }


      tableHTML += `
        <tr>
          <td>${imagesHtml}</td>
          <td class="product-details">
            <p><strong>الاسم:</strong> ${p.productName || 'لا يوجد'}</p>
            <p><strong>الوصف:</strong> ${p.product_description || 'لا يوجد'}</p>
            <p><strong>رسالة البائع:</strong> ${p.user_message || 'لا يوجد'}</p>
            ${priceHtml}
            <p><strong>الكمية:</strong> ${p.product_quantity}</p>
            <p><strong>ملاحظات خاصة:</strong> ${p.user_note || 'لا يوجد'}</p>
          </td>
          <td class="actions-cell">
            <button class="button logout-btn-small edit-product-btn" data-product='${productJson}'>
              <i class="fas fa-edit"></i> تعديل
            </button>
          </td>
        </tr>`;
    });

    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;

    // إضافة مستمعي الأحداث لأزرار التعديل بعد بناء الجدول
    const editButtons = container.querySelectorAll('.edit-product-btn');
    editButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        const productData = JSON.parse(event.currentTarget.dataset.product);
        showEditProductModal(productData);
      });
    });

  } else if (products) {
    container.innerHTML = "<p>لم تقم بإضافة أي منتجات بعد.</p>";
  } else {
    container.innerHTML = "<p>حدث خطأ أثناء تحميل منتجاتك. يرجى المحاولة مرة أخرى.</p>";
  }
}


// التحقق من حالة تسجيل الدخول عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (loggedInUser) {
    const user = JSON.parse(loggedInUser);
    updateViewForLoggedInUser(user);
  }

  const form = document.getElementById("login-form");
  if (!form) return; // الخروج إذا لم يكن نموذج تسجيل الدخول موجودًا في الصفحة

  const phone = document.getElementById("phone");

  // دالة لإظهار رسالة الخطأ
  const showError = (input, message) => {
    const errorDiv = document.getElementById(`${input.id}-error`);
    input.classList.add("input-error");
    errorDiv.textContent = message;
  };

  // دالة لمسح رسالة الخطأ
  const clearError = (input) => {
    const errorDiv = document.getElementById(`${input.id}-error`);
    input.classList.remove("input-error");
    errorDiv.textContent = "";
  };

  // إضافة مستمع لحدث الإدخال لتنقية رقم الهاتف في الوقت الفعلي
  phone.addEventListener("input", function (e) {
    let value = e.target.value;
    // تعريف قاموس لتحويل الأرقام الهندية إلى الإنجليزية
    const hindiToArabic = {
      "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
      "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
    };

    // استبدال الأرقام الهندية بالإنجليزية
    value = value.replace(/[٠-٩]/g, (d) => hindiToArabic[d]);

    // إزالة أي حرف ليس رقمًا (0-9)
    value = value.replace(/[^0-9]/g, "");

    // تحديث قيمة الحقل
    e.target.value = value;
  });

  // إضافة مستمع لحدث الإرسال للنموذج
  form.addEventListener("submit", async function (e) {
    e.preventDefault(); // منع الإرسال الافتراضي للنموذج
    let isValid = true;

    // التحقق من صحة رقم الهاتف
    clearError(phone);
    const phoneValue = phone.value.trim();
    if (phoneValue === "") {
      showError(phone, "رقم الهاتف مطلوب.");
      isValid = false;
    } else if (phoneValue.length < 11) {
      showError(phone, "رقم الهاتف يجب ألا يقل عن 11 رقمًا.");
      isValid = false;
    }

    if (isValid) {
      // إظهار رسالة تحميل باستخدام SweetAlert2
      Swal.fire({
        title: "جاري تسجيل الدخول...",
        text: "الرجاء الانتظار قليلاً.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const initialCheck = await getUserByPhone(phoneValue);

      if (initialCheck && initialCheck.passwordRequired) {
        // إذا كان الحساب يتطلب كلمة مرور
        Swal.close(); // إغلاق رسالة التحميل
        const { value: passwordResult } = await Swal.fire({
          title: 'كلمة المرور مطلوبة',
          html: `
            <p>هذا الحساب محمي. الرجاء إدخال كلمة المرور</p>
            <div class="swal2-password-container">
              <input type="password" id="swal-password-input" class="swal2-input" placeholder="ادخل كلمة المرور">
              <i class="fas fa-eye swal2-password-toggle-icon" id="swal-toggle-password"></i>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: 'تسجيل الدخول',
          cancelButtonText: 'إلغاء',
          showLoaderOnConfirm: true,
          didOpen: () => {
            const passwordInput = document.getElementById('swal-password-input');
            const toggleIcon = document.getElementById('swal-toggle-password');
            passwordInput.focus();
            toggleIcon.addEventListener('click', () => {
              const isPassword = passwordInput.type === 'password';
              passwordInput.type = isPassword ? 'text' : 'password';
              toggleIcon.classList.toggle('fa-eye');
              toggleIcon.classList.toggle('fa-eye-slash');
            });
          },
          preConfirm: async (password) => {
            const passwordInput = document.getElementById('swal-password-input');
            const passwordValue = passwordInput.value;

            if (!passwordValue) {
              Swal.showValidationMessage(`كلمة المرور لا يمكن أن تكون فارغة`);
              return;
            }
            const verificationResult = await verifyUserPassword(phoneValue, passwordValue);
            if (verificationResult.error) {
              Swal.showValidationMessage(`خطأ: ${verificationResult.error}`);
              return;
            }
            return verificationResult;
          },
          allowOutsideClick: () => !Swal.isLoading()
        });
        
        if (passwordResult) { // passwordResult هنا هو كائن المستخدم الكامل بعد التحقق الناجح
          handleLoginSuccess(passwordResult);
        }

      } else if (initialCheck) {
        // تسجيل دخول ناجح بدون كلمة مرور
        handleLoginSuccess(initialCheck);
      } else {
        // المستخدم غير موجود
        Swal.close();
        showError(phone, "هذا الرقم غير مسجل. هل تريد إنشاء حساب جديد؟");
      }
    }
  });
});

/**
 * يتعامل مع الإجراءات بعد تسجيل دخول ناجح.
 * @param {object} user - كائن المستخدم المسجل دخوله.
 */
function handleLoginSuccess(user) {
  localStorage.setItem("loggedInUser", JSON.stringify(user));
  updateViewForLoggedInUser(user);
  if (window.updateCartBadge) window.updateCartBadge();

  Swal.fire({
    icon: "success",
    title: `أهلاً بك، ${user.username}`,
    text: "هل تود الانتقال إلى الصفحة الرئيسية؟",
    showCancelButton: true,
    confirmButtonText: "موافق",
    cancelButtonText: "لا",
  }).then((result) => {
    if (result.isConfirmed) {
      window.location.href = "index.html";
    }
  });
}