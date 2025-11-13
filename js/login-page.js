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

  // ✅ إصلاح شامل: إعادة هيكلة المنطق بالكامل
  if (user.is_guest) {
    // --- منطق المستخدم الضيف ---
    // إخفاء كل المجموعات أولاً
    document.getElementById("admin-actions").style.display = "none";
    document.getElementById("seller-actions").style.display = "none";
    document.getElementById("reports-actions").style.display = "none"; // ✅ جديد: إخفاء مجموعة التقارير
    document.getElementById("customer-actions").style.display = "none";

    // إظهار مجموعة الإعدادات التي تحتوي على زر تسجيل الخروج فقط
    const userActions = document.getElementById("user-actions");
    userActions.style.display = "block";

    // إخفاء الأزرار غير المرغوب فيها داخل هذه المجموعة
    const editProfileBtn = document.getElementById("edit-profile-btn");
    if (editProfileBtn) editProfileBtn.style.display = "none";

    // ربط حدث تسجيل الخروج
    document.getElementById("logout-btn-alt").addEventListener("click", logout);

  } else {
    // --- منطق المستخدم المسجل (غير الضيف) ---
    // إضافة وظيفة لزر تسجيل الخروج
    document.getElementById("logout-btn-alt").addEventListener("click", logout);

    // إظهار حاوية إجراءات العميل (السلة والمشتريات)
    const customerActions = document.getElementById("customer-actions");
    customerActions.style.display = "block";
    document.getElementById("view-cart-btn").addEventListener("click", showCartModal);
    document.getElementById("view-purchases-btn").addEventListener("click", () => showPurchasesModal(user.user_key));

    // إظهار حاوية الإجراءات العامة (تعديل البيانات وتسجيل الخروج)
    const userActions = document.getElementById("user-actions");
    userActions.style.display = "block";
    document.getElementById("edit-profile-btn").addEventListener("click", () => showEditProfileModal(user));

    // التحقق مما إذا كان المستخدم بائعًا
    if (user.is_seller === 1) {
      const sellerActions = document.getElementById("seller-actions");
      sellerActions.style.display = "block";
      document.getElementById("add-product-btn").addEventListener("click", showAddProductModal);
      document.getElementById("view-my-products-btn").addEventListener("click", () => showMyProducts(user.user_key));
    }

    // ✅ جديد: التحقق مما إذا كان المستخدم "خدمة توصيل"
    if (user.is_seller === 2) {
      const deliveryActions = document.getElementById("delivery-actions");
      deliveryActions.style.display = "block";
      // يمكنك ربط الأحداث هنا لأزرار خدمة التوصيل في المستقبل
      // document.getElementById("view-delivery-requests-btn").addEventListener("click", showDeliveryRequests);
    }

    // التحقق مما إذا كان المستخدم هو أحد المسؤولين المحددين
    const adminPhoneNumbers = ["01024182175", "01026546550"];
    if (adminPhoneNumbers.includes(user.phone)) {
      const adminActions = document.getElementById("admin-actions");
      adminActions.style.display = "block";
      const adminPanelButton = document.createElement("a");
      adminPanelButton.id = "admin-panel-btn";
      adminPanelButton.href = "admin.html";
      adminPanelButton.className = "button logout-btn-small";
      adminPanelButton.innerHTML = '<i class="fas fa-user-shield"></i> لوحة تحكم المسؤول';
      const adminButtonRow = adminActions.querySelector(".button-row");
      // التأكد من عدم إضافة الزر أكثر من مرة
      if (!document.getElementById("admin-panel-btn")) {
        adminButtonRow.appendChild(adminPanelButton);
      }
    }

    // ✅ جديد: إظهار زر "حركة المشتريات" للمسؤول أو البائع أو خدمة التوصيل
    const isAdvancedUser = (user.is_seller === 1 || user.is_seller === 2 || adminPhoneNumbers.includes(user.phone));
    if (isAdvancedUser) {
      const reportsActions = document.getElementById("reports-actions");
      reportsActions.style.display = "block";
      // ✅ تفعيل: ربط حدث النقر بالزر 
      document.getElementById("view-sales-movement-btn").addEventListener("click", showSalesMovementModal);
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
    // ✅ إصلاح: نقل زر الحذف إلى تذييل النافذة ليظهر أسفل الأزرار الأخرى
    footer: `<a href="#" id="swal-delete-account-btn" class="swal-delete-link">حذف الحساب</a>`,
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

      // ✅ جديد: ربط حدث النقر بزر حذف الحساب
      const deleteBtn = document.getElementById('swal-delete-account-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault(); // ✅ إصلاح: منع السلوك الافتراضي للرابط
        handleAccountDeletion(currentUser); // استدعاء دالة الحذف
      });
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
 * ✅ جديد: يعالج عملية حذف الحساب بالكامل.
 * @param {object} currentUser - بيانات المستخدم الحالي.
 */
async function handleAccountDeletion(currentUser) {
  // إغلاق نافذة تعديل البيانات أولاً
  Swal.close();

  // الخطوة 1: نافذة التأكيد الأولى
  const confirmationResult = await Swal.fire({
    title: 'هل أنت متأكد تمامًا؟',
    html: `
      <div style="text-align: right; color: #e74c3c; font-weight: bold;">
        سيتم حذف حسابك وجميع بياناتك نهائيًا. <br> هذا الإجراء لا يمكن التراجع عنه.
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'نعم، أفهم وأريد المتابعة',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#d33',
  });

  if (!confirmationResult.isConfirmed) {
    return; // إيقاف العملية إذا ألغى المستخدم
  }

  // الخطوة 2: طلب كلمة المرور (إذا كان الحساب يمتلك واحدة)
  let canDelete = !currentUser.Password; // إذا لم يكن هناك كلمة مرور، يمكن الحذف مباشرة

  if (currentUser.Password) {
    const { value: password } = await Swal.fire({
      title: 'التحقق النهائي',
      text: 'لحماية حسابك، يرجى إدخال كلمة المرور الخاصة بك لتأكيد الحذف.',
      input: 'password',
      inputPlaceholder: 'أدخل كلمة المرور',
      showCancelButton: true,
      confirmButtonText: 'تأكيد الحذف',
      cancelButtonText: 'إلغاء',
      showLoaderOnConfirm: true,
      preConfirm: async (enteredPassword) => {
        const verificationResult = await verifyUserPassword(currentUser.phone, enteredPassword);
        if (verificationResult.error) {
          Swal.showValidationMessage('كلمة المرور غير صحيحة.');
          return false;
        }
        return true;
      },
      allowOutsideClick: () => !Swal.isLoading()
    });

    if (password) {
      canDelete = true;
    }
  }

  // الخطوة 3: تنفيذ الحذف
  if (canDelete) {
    Swal.fire({ title: 'جاري حذف الحساب...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const deleteResult = await deleteUser(currentUser.user_key);

    if (deleteResult && !deleteResult.error) {
      // مسح البيانات المحلية وإعادة التوجيه
      localStorage.clear();
      sessionStorage.clear();
      await Swal.fire('تم الحذف', 'تم حذف حسابك بنجاح.', 'success');
      window.location.href = 'index.html';
    } else {
      Swal.fire('خطأ', `فشل حذف الحساب: ${deleteResult.error}`, 'error');
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
 * @param {function} [onCloseCallback] - دالة اختيارية يتم استدعاؤها عند إغلاق النافذة.
 */
async function showEditProductModal(productData, onCloseCallback) {
  const addProductModal = document.getElementById("add-product-modal");
  
  // تحميل محتوى نموذج إضافة المنتج
  const response = await fetch("pages/addProduct.html");
  const modalContent = await response.text();
  addProductModal.innerHTML = modalContent; // This also loads the script inside addProduct.html

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
      // ننتظر قليلاً لضمان تحميل كل شيء قبل التعبئة. نمرر دالة رد الاتصال إلى التهيئة.
      setTimeout(() => initializeAddProductForm(productData), 100);
    }
    
    document.body.removeChild(newScript); // تنظيف
  }

  // جديد: إضافة وظيفة إغلاق النافذة (كانت مفقودة في وضع التعديل)
  const closeEditModal = () => {
    addProductModal.style.display = "none";
    addProductModal.innerHTML = ""; // تنظيف المحتوى
    document.body.classList.remove("modal-open");
    // استدعاء دالة رد الاتصال إذا كانت موجودة
    if (typeof onCloseCallback === 'function') {
      onCloseCallback();
    }
  };

  // إضافة حدث النقر لزر الإغلاق
  const closeBtn = document.getElementById("add-product-modal-close-btn");
  if (closeBtn) closeBtn.onclick = closeEditModal;

  // إغلاق النافذة عند النقر خارجها.
  window.addEventListener('click', (event) => {
    if (event.target == addProductModal) closeEditModal();
    // استخدام { once: true } يضمن أن المستمع يعمل مرة واحدة ثم يزيل نفسه تلقائيًا
  }, { once: true });
}

/**
 * ✅ جديد: ينشئ شريط تقدم زمني (Timeline) لحالة الطلب.
 * @param {object} statusDetails - كائن تفاصيل الحالة (id, state, description).
 * @returns {string} - كود HTML لشريط التقدم.
 */
function createStatusTimelineHTML(statusDetails) {
  const currentStatusId = statusDetails.id;

  // تعريف الحالات التي تمثل مسار التقدم الطبيعي للطلب
  const progressStates = [
    ORDER_STATUS_MAP.REVIEW,
    ORDER_STATUS_MAP.CONFIRMED,
    ORDER_STATUS_MAP.SHIPPED,
    ORDER_STATUS_MAP.DELIVERED
  ];

  // إذا كانت الحالة الحالية هي حالة استثنائية (ملغي, مرفوض, مرتجع)
  if (!progressStates.some(p => p.id === currentStatusId)) {
    const statusClass = `status-${currentStatusId}`;
    let icon = 'fa-info-circle';
    if (currentStatusId === ORDER_STATUS_MAP.CANCELLED.id || currentStatusId === ORDER_STATUS_MAP.REJECTED.id) {
      icon = 'fa-times-circle';
    } else if (currentStatusId === ORDER_STATUS_MAP.RETURNED.id) {
      icon = 'fa-undo-alt';
    }

    return `
      <div class="status-timeline-exception-wrapper">
        <div class="status-timeline-exception ${statusClass}">
          <i class="fas ${icon}"></i>
          <span>${statusDetails.state}</span>
        </div>
        <p class="timeline-description">${statusDetails.description}</p>
      </div>
    `;
  }

  // بناء شريط التقدم للحالات الطبيعية
  let timelineHTML = '<div class="status-timeline">';
  progressStates.forEach((state, index) => {
    const isActive = currentStatusId >= state.id;
    const isCurrent = currentStatusId === state.id;
    const stepClass = isActive ? 'active' : '';
    const currentClass = isCurrent ? 'current' : '';

    timelineHTML += `
      <div class="timeline-step ${stepClass} ${currentClass}" title="${state.description}">
        <div class="timeline-dot"></div>
        <div class="timeline-label">${state.state}</div>
      </div>
    `;
    if (index < progressStates.length - 1) {
      timelineHTML += `<div class="timeline-line ${stepClass}"></div>`;
    }
  });
  timelineHTML += '</div>';

  // ✅ إضافة: إلحاق الوصف أسفل شريط التقدم
  const descriptionHTML = `<p class="timeline-description">${statusDetails.description}</p>`;

  return timelineHTML + descriptionHTML;
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
      
      // ✅ إصلاح نهائي: تحويل التاريخ إلى صيغة ISO 8601 القياسية (YYYY-MM-DDTHH:MM:SSZ)
      // هذا يضمن أن جميع المتصفحات ستفسره كتوقيت UTC بشكل صحيح قبل تحويله إلى توقيت القاهرة.
      const isoDateTime = item.created_at.replace(' ', 'T') + 'Z';
      const purchaseDate = new Date(isoDateTime).toLocaleString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
        timeZone: 'Africa/Cairo'
      });

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
            <div class="purchase-status-container">
              ${createStatusTimelineHTML(item.status_details)}
            </div>
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
 * ✅ جديد: يعرض نافذة منبثقة بحركة المشتريات لجميع الطلبات.
 */
async function showSalesMovementModal() {
  const modalContainer = document.getElementById("sales-movement-modal-container");

  // 1. عرض النافذة مع مؤشر تحميل
  modalContainer.innerHTML = `
    <div class="modal-content large">
      <span class="close-button" id="sales-movement-modal-close-btn">&times;</span>
      <h2><i class="fas fa-dolly-flatbed"></i> حركة المشتريات</h2>
      <div class="loader" style="margin: 2rem auto;"></div>
    </div>`;
  
  document.body.classList.add("modal-open");
  modalContainer.style.display = "block";

  // 2. وظيفة الإغلاق
  const closeModal = () => {
    modalContainer.style.display = "none";
    document.body.classList.remove("modal-open");
  };

  document.getElementById("sales-movement-modal-close-btn").onclick = closeModal;
  window.addEventListener('click', (event) => {
    if (event.target == modalContainer) closeModal();
  }, { once: true });

  // 3. جلب البيانات من الواجهة الخلفية الجديدة
  const orders = await getSalesMovement();
  const modalContentEl = modalContainer.querySelector('.modal-content');

  // 4. بناء المحتوى بعد جلب البيانات
  let contentHTML = `
    <span class="close-button" id="sales-movement-modal-close-btn">&times;</span>
    <h2><i class="fas fa-dolly-flatbed"></i> حركة المشتريات</h2>`;

  if (orders && orders.length > 0) {
    contentHTML += '<div id="sales-movement-list">';
    orders.forEach(order => {
      // تنسيق التاريخ
      const isoDateTime = order.created_at.replace(' ', 'T') + 'Z';
      const orderDate = new Date(isoDateTime).toLocaleString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo'
      });

      // بناء جدول المنتجات داخل كل طلب
      let itemsTable = `
        <table class="order-items-table">
          <thead>
            <tr>
              <th>المنتج</th>
              <th>الكمية</th>
              <th>سعر القطعة</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>`;
      order.items.forEach(item => {
        const itemTotal = (item.product_price * item.quantity).toFixed(2);
        itemsTable += `
          <tr>
            <td>${item.productName}</td>
            <td>${item.quantity}</td>
            <td>${item.product_price.toFixed(2)} ج.م</td>
            <td>${itemTotal} ج.م</td>
          </tr>`;
      });
      itemsTable += '</tbody></table>';

      // بناء بطاقة الطلب
      contentHTML += `
        <div class="purchase-item">
          <div class="purchase-item-details">
            <p><strong>رقم الطلب:</strong> ${order.order_key}</p>
            <p><strong>العميل:</strong> ${order.customer_name} (${order.customer_phone})</p>
            <p><strong>العنوان:</strong> ${order.customer_address || 'غير محدد'}</p>
            <p><strong>تاريخ الطلب:</strong> ${orderDate}</p>
            <p><strong>إجمالي الطلب:</strong> ${order.total_amount.toFixed(2)} جنيه</p>
            <div class="purchase-status-container">
              ${createStatusTimelineHTML(ORDER_STATUS_MAP[order.order_status] || ORDER_STATUS_MAP[0])}
            </div>
            <h4>المنتجات:</h4>
            ${itemsTable}
          </div>
        </div>`;
    });
    contentHTML += '</div>';
  } else {
    contentHTML += '<p style="text-align: center; padding: 2rem 0;">لا توجد طلبات لعرضها.</p>';
  }

  modalContentEl.innerHTML = contentHTML;
  modalContentEl.querySelector('#sales-movement-modal-close-btn').onclick = closeModal;
}

/**
 * جديد: يعرض جدولاً بمنتجات المستخدم الحالي.
 * @param {string} userKey - المفتاح الفريد للمستخدم.
 */
async function showMyProducts(userKey) {
  const modalContainer = document.getElementById("my-products-modal-container");

  // 1. تحميل هيكل النافذة المنبثقة وعرضها مع مؤشر تحميل
  const response = await fetch("pages/myProductsModal.html");
  modalContainer.innerHTML = await response.text();
  const contentWrapper = modalContainer.querySelector("#my-products-content-wrapper");
  contentWrapper.innerHTML = '<div class="loader" style="margin: 2rem auto;"></div>';

  document.body.classList.add("modal-open");
  modalContainer.style.display = "block";

  // 2. إعداد وظيفة الإغلاق
  const closeModal = () => {
    modalContainer.style.display = "none";
    modalContainer.innerHTML = ""; // تنظيف المحتوى عند الإغلاق
    document.body.classList.remove("modal-open");
  };

  modalContainer.querySelector("#my-products-modal-close-btn").onclick = closeModal;
  window.addEventListener('click', (event) => {
    if (event.target == modalContainer) closeModal();
  }, { once: true });

  // 3. جلب بيانات المنتجات
  const products = await getProductsByUser(userKey);

  // جديد: جلب بيانات الفئات لترجمة الأرقام إلى أسماء
  let categoryNames = {};
  let allCategories = []; // جديد: لتخزين القائمة الكاملة للفئات
  try {
    const catResponse = await fetch('../shared/list.json');
    const catData = await catResponse.json();
    allCategories = catData.categories; // حفظ القائمة الكاملة
    allCategories.forEach(mainCat => {
      categoryNames[mainCat.id] = mainCat.title;
      if (mainCat.subcategories) {
        mainCat.subcategories.forEach(subCat => categoryNames[subCat.id] = subCat.title);
      }
    });
  } catch (error) {
    console.error("Failed to load category names:", error);
  }
  // 4. بناء وعرض الجدول داخل النافذة المنبثقة
  if (products && products.length > 0) {
    let cardsHTML = `<div class="product-cards-container">`;

    products.forEach(product => {
      // بناء قسم الصور
      let imagesHtml = '';
      if (product.ImageName) {
        const imageNames = product.ImageName.split(',');
        imageNames.forEach(imageName => {
          if (imageName) {
            const imageUrl = `https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/${imageName}`;
            imagesHtml += `<img src="${imageUrl}" alt="صورة منتج" onerror="this.style.display='none'">`;
          }
        });
      } else {
        imagesHtml = '<span>لا توجد صور</span>';
      }

      const productJson = JSON.stringify(product);

      // بناء قسم السعر
      let priceHtml = `<p><strong>السعر:</strong> ${product.product_price} جنيه</p>`;
      if (product.original_price && parseFloat(product.original_price) > 0) {
        priceHtml += `<p><strong>السعر قبل الخصم:</strong> <span style="text-decoration: line-through; color: #7f8c8d;">${product.original_price} جنيه</span></p>`;
      }

      // جديد: إضافة data-attributes للفئات لتسهيل التصفية
      const mainCatData = `data-main-category="${product.MainCategory || ''}"`;
      const subCatData = `data-sub-category="${product.SubCategory || ''}"`;

      // بناء بطاقة المنتج
      cardsHTML += `
        <div class="product-card" ${mainCatData} ${subCatData}>
          <div class="product-card-images">${imagesHtml}</div>
          <div class="product-card-details">
            <h4>${product.productName || 'منتج بلا اسم'}</h4>
            <p><strong>الوصف:</strong> ${product.product_description || 'لا يوجد'}</p>
            <p><strong>رسالة البائع:</strong> ${product.user_message || 'لا يوجد'}</p>
            ${priceHtml}
            <p><strong>الكمية:</strong> ${product.product_quantity}</p>
            <p><strong>ملاحظات خاصة:</strong> ${product.user_note || 'لا يوجد'}</p>
          </div>
          <div class="product-card-actions">
            <button class="button logout-btn-small edit-product-btn" data-product='${productJson}'>
              <i class="fas fa-edit"></i> تعديل
            </button>
            <button class="button delete-btn-small delete-product-btn" data-product='${productJson}'>
              <i class="fas fa-trash-alt"></i> إزالة
            </button>
          </div>
        </div>`;
    });

    cardsHTML += `</div>`;
    contentWrapper.innerHTML = cardsHTML;

    // 5. ربط الأحداث بأزرار التعديل داخل النافذة المنبثقة
    const editButtons = contentWrapper.querySelectorAll('.edit-product-btn');
    editButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        const productData = JSON.parse(event.currentTarget.dataset.product);
        
        // إخفاء نافذة "منتجاتي" مؤقتًا بدلاً من إغلاقها بالكامل
        modalContainer.style.display = "none";

        // فتح نافذة التعديل، وتمرير دالة لإعادة إظهار نافذة "منتجاتي" عند الإغلاق
        showEditProductModal(productData, () => {
          modalContainer.style.display = "block"; // إعادة إظهار نافذة "منتجاتي"
        });
      });
    });

    // 6. جديد: ربط الأحداث بأزرار الحذف
    const deleteButtons = contentWrapper.querySelectorAll('.delete-product-btn');
    deleteButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        const productData = JSON.parse(event.currentTarget.dataset.product);
        // استدعاء دالة الحذف الجديدة
        deleteProductAndImages(productData, userKey);
      });
    });

    // 7. جديد: إعداد الفلاتر وربط الأحداث
    const mainCategoryFilter = document.getElementById('my-products-main-category');
    const subCategoryFilter = document.getElementById('my-products-sub-category');
    const subCategoryGroup = document.getElementById('my-products-sub-category-group');
    const searchInput = document.getElementById('my-products-search-input');
    const productCards = contentWrapper.querySelectorAll('.product-card');
    const noResultsContainer = document.createElement('div');
    noResultsContainer.innerHTML = `<p class="no-results-message" style="text-align: center; padding: 2rem 0; display: none;"></p>`;
    contentWrapper.appendChild(noResultsContainer);
    const noResultsMsg = noResultsContainer.querySelector('.no-results-message');

    // تعبئة فلتر الفئة الرئيسية
    // تعديل: استخدام القائمة الكاملة للفئات بدلاً من الفئات المستخدمة فقط
    allCategories.forEach(category => {
      const option = new Option(category.title, category.id);
      mainCategoryFilter.add(option);
    });

    // دالة التصفية الموحدة
    const filterMyProducts = () => {
      const searchTerm = searchInput.value.toLowerCase().trim();
      const selectedMainCat = mainCategoryFilter.value;
      const selectedSubCat = subCategoryFilter.value;
      let visibleCount = 0;

      productCards.forEach(card => {
        const productName = card.querySelector('h4').textContent.toLowerCase();
        const mainCat = card.dataset.mainCategory;
        const subCat = card.dataset.subCategory;

        const matchesSearch = productName.includes(searchTerm);
        const matchesMainCat = !selectedMainCat || mainCat === selectedMainCat;
        const matchesSubCat = !selectedSubCat || subCat === selectedSubCat;

        if (matchesSearch && matchesMainCat && matchesSubCat) {
          card.style.display = 'flex';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });
      
      if (visibleCount === 0) {
        noResultsMsg.textContent = `لا توجد منتجات تطابق معايير البحث.`;
        noResultsMsg.style.display = 'block';
      } else {
        noResultsMsg.style.display = 'none';
      }
    };

    // ربط الأحداث
    searchInput.addEventListener('input', filterMyProducts);
    mainCategoryFilter.addEventListener('change', () => {
      const selectedMainCat = mainCategoryFilter.value;
      // إفراغ وتعبئة فلتر الفئة الفرعية
      subCategoryFilter.innerHTML = '<option value="">الكل</option>';

      if (selectedMainCat) {
        // تعديل: جلب الفئات الفرعية من القائمة الكاملة
        const selectedCategoryData = allCategories.find(cat => cat.id == selectedMainCat);
        const subCategories = selectedCategoryData ? selectedCategoryData.subcategories : [];

        if (subCategories && subCategories.length > 0) {
          subCategories.forEach(subCat => {
            // استخدام البيانات مباشرة من الكائن
            const option = new Option(subCat.title, subCat.id);
            subCategoryFilter.add(option);
          });
          subCategoryGroup.style.display = 'flex';
        } else {
          subCategoryGroup.style.display = 'none';
        }
      } else {
        subCategoryGroup.style.display = 'none';
      }
      filterMyProducts();
    });
    subCategoryFilter.addEventListener('change', filterMyProducts);

  } else if (products) {
    contentWrapper.innerHTML = "<p style='text-align: center; padding: 2rem 0;'>لم تقم بإضافة أي منتجات بعد.</p>";
  } else {
    contentWrapper.innerHTML = "<p style='text-align: center; padding: 2rem 0; color: red;'>حدث خطأ أثناء تحميل منتجاتك. يرجى المحاولة مرة أخرى.</p>";
  }
}

/**
 * جديد: يتعامل مع عملية حذف منتج وصوره المرتبطة به.
 * @param {object} product - كائن المنتج المراد حذفه.
 * @param {string} userKey - مفتاح المستخدم الحالي لتحديث العرض بعد الحذف.
 */
async function deleteProductAndImages(product, userKey) {
  Swal.fire({
    title: 'هل أنت متأكد؟',
    text: `سيتم حذف المنتج "${product.productName}" بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'نعم، احذفه!',
    cancelButtonText: 'إلغاء',
    showLoaderOnConfirm: true,
    preConfirm: async () => {
      try {
        console.log(`[Delete] Starting deletion for product: ${product.product_key}`);

        // الخطوة 1: حذف الصور من Cloudflare R2
        if (product.ImageName) {
          const imageNames = product.ImageName.split(',').filter(name => name);
          if (imageNames.length > 0) {
            console.log(`[Delete] Deleting ${imageNames.length} images from Cloudflare...`);
            // تنفيذ الحذف بالتوازي
            await Promise.all(imageNames.map(name =>
              deleteFile2cf(name).catch(err => {
                // تسجيل الخطأ ولكن عدم إيقاف العملية بأكملها
                console.error(`[Delete] Failed to delete image ${name}:`, err);
              })
            ));
            console.log('[Delete] Image deletion process completed.');
          }
        }

        // الخطوة 2: حذف المنتج من قاعدة البيانات
        console.log(`[Delete] Deleting product record from database...`);
        const dbResult = await deleteProduct(product.product_key);
        if (dbResult && dbResult.error) {
          throw new Error(dbResult.error);
        }
        console.log('[Delete] Product record deleted successfully.');
        return true; // إشارة إلى نجاح العملية
      } catch (error) {
        Swal.showValidationMessage(`فشل الحذف: ${error.message}`);
        return false;
      }
    },
    allowOutsideClick: () => !Swal.isLoading()
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire('تم الحذف!', 'تم حذف المنتج بنجاح ✅.', 'success');
      showMyProducts(userKey); // تحديث عرض المنتجات لإزالة المنتج المحذوف
    }
  });
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
    console.log('%c[Login Page] تم الضغط على زر تسجيل الدخول.', 'color: blue; font-weight: bold;');
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
      console.log('[Login Page] النموذج صالح، جاري التحقق من المستخدم...');
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
        console.log('[Login Page] الحساب يتطلب كلمة مرور.');
        // إذا كان الحساب يتطلب كلمة مرور
        Swal.close(); // إغلاق رسالة التحميل
        const { value: passwordResult } = await Swal.fire({
          title: 'التحقق من الهوية',
          html: `
            <div class="swal-password-prompt">
              <i class="fas fa-shield-alt swal-password-prompt-icon"></i>
              <p class="swal-password-prompt-text">هذا الحساب محمي بكلمة مرور</p>
              <div class="swal2-password-container">
                <input type="password" id="swal-password-input" class="swal2-input" placeholder="ادخل كلمة المرور">
                <i class="fas fa-eye swal2-password-toggle-icon" id="swal-toggle-password"></i>
              </div>
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
          console.log('[Login Page] التحقق من كلمة المرور نجح. جاري استدعاء handleLoginSuccess...');
          handleLoginSuccess(passwordResult);
        }

      } else if (initialCheck) {
        console.log('[Login Page] تسجيل دخول ناجح (بدون كلمة مرور). جاري استدعاء handleLoginSuccess...');
        // تسجيل دخول ناجح بدون كلمة مرور
        handleLoginSuccess(initialCheck);
      } else {
        console.error('[Login Page] المستخدم غير موجود.');
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
  console.log('%c[Login Page] دخلنا دالة handleLoginSuccess. بيانات المستخدم:', 'color: green;', user);
  localStorage.setItem("loggedInUser", JSON.stringify(user));

  // ✅ إصلاح جذري: استدعاء setupFCM() مباشرة بعد نجاح تسجيل الدخول.
  // هذا يضمن الحصول على التوكن وإرساله فورًا دون الحاجة لتحديث الصفحة.
  console.log('[Login Page] جاري استدعاء setupFCM() الآن...');
  if (typeof setupFCM === 'function') { setupFCM(); } else { console.error('[Login Page] خطأ فادح: دالة setupFCM غير معرّفة!'); }
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

/**
 * جديد: يعالج عملية الدخول كضيف.
 * @param {Event} event - كائن الحدث لمنع السلوك الافتراضي للرابط.
 */
function handleGuestLogin(event) {
  event.preventDefault(); // منع الرابط من تحديث الصفحة
  console.log('[Auth] Logging in as a guest.');
  
  // إنشاء كائن مستخدم ضيف
  const guestUser = {
    username: 'ضيف',
    is_guest: true,
    user_key: 'guest_user' // مفتاح خاص للضيف
  };

  // حفظ بيانات الضيف في localStorage
  localStorage.setItem('loggedInUser', JSON.stringify(guestUser));

  // عرض رسالة ترحيب وتوجيه المستخدم
  Swal.fire({
    title: 'أهلاً بك كضيف!',
    text: 'يمكنك الآن تصفح المنتجات. ستحتاج إلى تسجيل الدخول لحفظ سلتك وإتمام الشراء.',
    icon: 'success',
    showConfirmButton: true,
    confirmButtonText: 'موافق'
  }).then((result) => {
    // توجيه المستخدم فقط بعد الضغط على زر "موافق"
    if (result.isConfirmed) {
      window.location.href = 'index.html';
    }
  });
}

// ربط الأحداث عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  // ... (الكود الموجود مسبقًا في هذا الملف) ...

  // ربط الحدث برابط "الدخول كضيف"
  const guestLoginBtn = document.getElementById('guest-login-btn');
  if (guestLoginBtn) {
    guestLoginBtn.addEventListener('click', handleGuestLogin);
  }
});
