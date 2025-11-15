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

    // التحقق مما إذا كان المستخدم هو أحد المسؤولين (adminPhoneNumbers معرفة في config.js)
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

// عند تحميل محتوى الصفحة بالكامل، يتم تنفيذ هذا الكود
document.addEventListener("DOMContentLoaded", () => {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (loggedInUser) {
    const user = JSON.parse(loggedInUser);
    updateViewForLoggedInUser(user);
  }

  // ربط الأحداث الخاصة بنموذج تسجيل الدخول
  const form = document.getElementById("login-form");
  if (!form) return; // الخروج إذا لم يكن نموذج تسجيل الدخول موجودًا في الصفحة

  const phoneInput = document.getElementById("phone");

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
  phoneInput.addEventListener("input", function (e) {
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
    clearError(phoneInput);
    const phoneValue = phoneInput.value.trim();
    if (phoneValue === "") {
      showError(phoneInput, "رقم الهاتف مطلوب.");
      isValid = false;
    } else if (phoneValue.length < 11) {
      showError(phoneInput, "رقم الهاتف يجب ألا يقل عن 11 رقمًا.");
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
        showError(phoneInput, "هذا الرقم غير مسجل. هل تريد إنشاء حساب جديد؟");
      }
    }
  });

  // ربط الحدث برابط "الدخول كضيف"
  const guestLoginBtn = document.getElementById('guest-login-btn');
  if (guestLoginBtn) {
    guestLoginBtn.addEventListener('click', handleGuestLogin);
  }
});

/**
 * يتعامل مع الإجراءات بعد تسجيل دخول ناجح.
 * @param {object} user - كائن المستخدم المسجل دخوله.
 */
async function handleLoginSuccess(user) {
  console.log('%c[Login Page] دخلنا دالة handleLoginSuccess. بيانات المستخدم:', 'color: green;', user);
  localStorage.setItem("loggedInUser", JSON.stringify(user));

  // ✅ تعديل: استدعاء setupFCM() فقط إذا كان المستخدم مؤهلاً (مسؤول، بائع، خدمة توصيل).
  // isUserEligibleForNotifications معرفة في auth.js
  if (typeof isUserEligibleForNotifications === 'function' && isUserEligibleForNotifications(user)) {
    console.log('[Login Page] المستخدم مؤهل، جاري استدعاء setupFCM() الآن...');
    if (typeof setupFCM === 'function') {
      setupFCM();
      await askForNotificationPermission();
    }
  } else {
    console.log('[Login Page] المستخدم غير مؤهل للإشعارات، تم تخطي استدعاء setupFCM().');
  }
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

async function askForNotificationPermission() {
  // التحقق من وجود الكائن 'Android' للتأكد من أن الكود يعمل داخل تطبيق أندرويد
  if (window.Android && typeof window.Android.requestNotificationPermission === 'function') {
    console.log("Calling native function to request notification permission...");
    window.Android.requestNotificationPermission();
  } else {
    console.log("Android interface not available.");
  }
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
