/**
 * @description إعداد منطق النافذة المنبثقة (Modal) بشكل معياري.
 * @file js/user-dashboard.js - هذا الجزء من الكود خاص بصفحة لوحة تحكم المستخدم.
 *   تنشئ وتدير دورة حياة نافذة منبثقة، وتتولى إظهار وإخفاء النافذة،
 *   وإضافة وإزالة فئة `modal-open` من الجسم، وربط أحداث الإغلاق
 *   (زر الإغلاق والنقر على الخلفية).
 * @function setupModalLogic
 * @param {string} modalId - معرف (ID) حاوية النافذة المنبثقة.
 * @param {string} closeBtnId - معرف (ID) زر الإغلاق داخل النافذة.
 * @param {object} [options={}] - خيارات إضافية.
 * @param {function(): void} [options.onClose] - دالة رد اتصال اختيارية يتم استدعاؤها عند إغلاق النافذة.
 * @returns {{open: function(): void, close: function(): void, modalElement: HTMLElement}|null} - كائن يحتوي على دوال الفتح والإغلاق وعنصر النافذة، أو `null` إذا لم يتم العثور على عنصر النافذة.
 */
function setupModalLogic(modalId, closeBtnId, options = {}) {
  // [خطوة 1] البحث عن عنصر النافذة المنبثقة في DOM باستخدام المعرف المقدم.
  const modalElement = document.getElementById(modalId);
  if (!modalElement) {
    // إذا لم يتم العثور على العنصر، يتم تسجيل خطأ وإرجاع null.
    console.error(
      `[Modal Logic] لم يتم العثور على عنصر النافذة بالمعرف: ${modalId}`
    );
    return null;
  }

  // [خطوة 2] تعريف دالة `close` لإغلاق النافذة.
  const close = () => {
    // [أ] إخفاء النافذة.
    modalElement.style.display = "none";
    // [ب] إزالة الفئة من body لمنع تجميد التمرير في الصفحة.
    document.body.classList.remove("modal-open");
    // [ج] استدعاء دالة رد الاتصال `onClose` إذا كانت موجودة.
    if (typeof options.onClose === "function") {
      options.onClose();
    }
  };

  // [خطوة 3] تعريف دالة `open` لفتح النافذة.
  const open = () => {
    // [أ] إظهار النافذة.
    modalElement.style.display = "block";
    // [ب] إضافة فئة إلى body لتجميد التمرير في الخلفية.
    document.body.classList.add("modal-open");

    // [ج] البحث عن زر الإغلاق وربط دالة `close` بحدث النقر عليه.
    const closeBtn = document.getElementById(closeBtnId);
    if (closeBtn) closeBtn.onclick = close;

    // [د] ربط حدث النقر على النافذة نفسها (الخلفية).
    // يتم الإغلاق فقط إذا كان الهدف من النقر هو عنصر الخلفية نفسه (modalElement) وليس أحد أبنائه.
    modalElement.onclick = (event) => {
      if (event.target === modalElement) close();
    };
  };

  // [خطوة 4] إرجاع كائن يحتوي على دوال التحكم (open, close) وعنصر النافذة نفسه.
  return { open, close, modalElement };
}

/**
 * @description يعالج حدث النقر على زر لوحة تحكم المسؤول.
 *   يقوم بتحميل صفحة لوحة التحكم في الحاوية الرئيسية.
 * @function handleAdminPanelClick
 * @returns {void}
 */
function handleAdminPanelClick() {
  try {
    // [خطوة 1] تسجيل رسالة في الكونسول لتتبع الحدث.
    console.log(
      "[Dashboard] تم النقر على زر لوحة تحكم المسؤول. جاري تحميل الصفحة..."
    );
    // [خطوة 2] استخدام `mainLoader` لتحميل صفحة لوحة تحكم المسؤول في الحاوية المخصصة.

    Swal.fire({
      title: "اختر وجهتك",
      html: `
                <div class="swal-custom-actions" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 20px;">
                    <button id="swal-users-btn" class="swal2-confirm swal2-styled" style="font-size: 0.85em; padding: 0.5em 1.2em;">مستخدمين</button>
                    <button id="swal-advert-btn" class="swal2-deny swal2-styled" style="font-size: 0.85em; padding: 0.5em 1.2em;">الاعلان</button>
                    <button id="swal-notifications-btn" class="swal2-styled" style="background-color: #808080; font-size: 0.85em; padding: 0.5em 1.2em;">اشعارات</button>
                </div>
            `,
      showConfirmButton: false,
      showDenyButton: false,
      showCancelButton: true,
      cancelButtonText: "إلغاء",
      icon: "question",
    }).then((result) => {
      if (result.isConfirmed) {
        mainLoader(
          "pages/ADMIN/adminPanel.html",
          "index-user-container",
          0,
          undefined,
          "showHomeIcon",
          true
        );
      } else if (result.isDenied) {
        mainLoader(
          "pages/ADMIN/mainAdvertises.html",
          "index-user-container",
          0,
          undefined,
          "showHomeIcon",
          true
        );
      }
    });

    // ربط الأحداث للأزرار المخصصة
    document.getElementById("swal-users-btn").addEventListener("click", () => {
      mainLoader(
        "pages/ADMIN/adminPanel.html",
        "index-user-container",
        0,
        undefined,
        "showHomeIcon",
        true
      );
      Swal.close();
    });

    document.getElementById("swal-advert-btn").addEventListener("click", () => {
      mainLoader(
        "pages/ADMIN/mainAdvertises.html",
        "index-user-container",
        0,
        undefined,
        "showHomeIcon",
        true
      );
      Swal.close();
    });

    document
      .getElementById("swal-notifications-btn")
      .addEventListener("click",async () => {
    await    mainLoader(
          "notification/page/settings.html",
          "index-user-container",
          0,
          undefined,
          "showHomeIcon",
          true
        );

        Swal.close();
      });
  } catch (error) {
    console.error("حدث خطأ أثناء محاولة تحميل لوحة تحكم المسؤول:", error);
  }
}
/**
 * @file js/user-dashboard.js
 * @description يحتوي هذا الملف على المنطق البرمجي الخاص بصفحة لوحة تحكم المستخدم (`user-dashboard.html`).
 * يتولى عرض الأزرار والإجراءات المناسبة بناءً على دور المستخدم.
 */

/**
 * @description تحديث واجهة المستخدم لتعكس حالة تسجيل الدخول،
 *   وتخصيص الأزرار والإجراءات المتاحة بناءً على دور المستخدم (ضيف، عميل، بائع، مسؤول).
 *   مع تخصيص الأزرار والإجراءات بناءً على دور المستخدم (ضيف، عميل، بائع، مسؤول).
 * @function updateViewForLoggedInUser
 * @param {object|null} user - كائن المستخدم المسجل دخوله. يمكن أن يكون `null` إذا لم يتم العثور على مستخدم.
 * @param {string} userSession.username - اسم المستخدم.
 * @param {boolean} [userSession.is_guest] - علامة تشير إلى ما إذا كان المستخدم ضيفًا.
 * @param {number} [userSession.is_seller] - دور المستخدم (1: بائع، 2: توصيل).
 * @param {string} [userSession.phone] - رقم هاتف المستخدم.
 * @requires module:js/config - للوصول إلى `adminPhoneNumbers`.
 * @requires module:js/auth - لاستخدام دالة `logout`.
 * @requires module:js/messaging-system - لاستخدام `requestNavigation`.
 */
function updateViewForLoggedInUser() {
  // [خطوة 1] التحقق من وجود جلسة مستخدم. إذا لم يكن هناك مستخدم مسجل، تتوقف الدالة.
  if (!userSession) {
    // لا يتم اتخاذ أي إجراء، حيث من المفترض أن يتم التعامل مع هذا السيناريو في مكان آخر (مثل إعادة التوجيه).
    return;
  }

  // [خطوة 2] تحديث رسالة الترحيب لعرض اسم المستخدم المسجل دخوله.
  document.getElementById(
    "dash-welcome-message"
  ).textContent = `أهلاً بك، ${userSession.username}`;

  // [خطوة 3] التحقق مما إذا كان المستخدم هو "ضيف".
  if (userSession.is_guest) {
    // [خطوة 3.1] إذا كان ضيفًا، يتم إخفاء الأزرار التي لا يملك صلاحية الوصول إليها.
    [
      "dash-edit-profile-btn",
      "dash-admin-panel-btn",

      "dash-view-sales-movement-btn",
    ].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.style.display = "none"; // إخفاء الزر إذا كان موجودًا
    });
    // [خطوة 3.2] ربط حدث النقر على زر "تسجيل الخروج" بدالة `logout`.
    document
      .getElementById("dash-logout-btn-alt")
      .addEventListener("click", () => {
        console.log("تم النقر على زر تسجيل الخروج.1");
        if (typeof logout === "function") logout();
      });
  } else {
    // [خطوة 4] منطق العرض للمستخدم المسجل (غير الضيف).

    // [خطوة 4.1] التحقق من صلاحيات البائع:
    // إذا كان المستخدم بائعًا (is_seller === 1) أو مسؤولاً، فإنه يرى أزرار إدارة المنتجات (التي تكون ظاهرة افتراضيًا).
    if (
      userSession.is_seller === 1 ||
      (typeof adminPhoneNumbers !== "undefined" &&
        adminPhoneNumbers.includes(userSession.phone))
    ) {
      // لا يوجد إجراء مطلوب هنا لأن الأزرار تكون ظاهرة بشكل افتراضي في HTML.
    }

    // [خطوة 4.2] التحقق من صلاحيات المسؤول:
    // يتم إظهار زر لوحة تحكم المسؤول إذا كان رقم هاتف المستخدم مدرجًا في قائمة المسؤولين،
    // أو إذا كان هناك جلسة مسؤول أصلية مخزنة (وضع انتحال الشخصية).
    if (
      (typeof adminPhoneNumbers !== "undefined" &&
        adminPhoneNumbers.includes(userSession.phone)) ||
      localStorage.getItem("originalAdminSession")
    ) {
      // ربط حدث النقر على زر لوحة التحكم بالدالة الخاصة به.
      const adminBtn = document.getElementById("dash-admin-panel-btn");
      if (adminBtn) adminBtn.addEventListener("click", handleAdminPanelClick);
    } else {
      // إذا لم يكن المستخدم مسؤولاً، يتم إخفاء زر لوحة التحكم.
      const adminBtn = document.getElementById("dash-admin-panel-btn");
      if (adminBtn) adminBtn.style.display = "none";
    }

    // [خطوة 4.3] التحقق من صلاحيات عرض التقارير:
    // إذا كان المستخدم بائعًا (1)، أو موظف توصيل (2)، أو مسؤولاً، فإنه يرى زر التقارير.
    if (
      userSession.is_seller === 1 ||
      userSession.is_seller === 2 ||
      (typeof adminPhoneNumbers !== "undefined" &&
        adminPhoneNumbers.includes(userSession.phone))
    ) {
      // لا يوجد إجراء مطلوب هنا لأن الزر ظاهر بشكل افتراضي.
    } else {
      // إذا لم يكن مؤهلاً، يتم إخفاء الزر (الكود معطل حاليًا).
      ///    document.getElementById("dash-view-sales-movement-btn").style.display =
      ///    "none";
    }
    // [خطوة 5] ربط الأحداث العامة للأزرار لجميع المستخدمين المسجلين.
    // [5.1] ربط زر تسجيل الخروج.
    document
      .getElementById("dash-logout-btn-alt")
      .addEventListener("click", () => {
        console.log("تم النقر على زر تسجيل الخروج.2");

        logout();
      });

    // [5.2] ربط زر "تعديل الملف الشخصي" لتحميل صفحة التعديل.
    document
      .getElementById("dash-edit-profile-btn")

      .addEventListener("click", () =>
        mainLoader(
          "pages/profile-modal.html",
          "index-user-container",
          0,
          undefined,
          "showHomeIcon",
          true
        )
      );
  }
}

// [خطوة أخيرة] استدعاء الدالة فور تحميل الملف لتحديث الواجهة بناءً على حالة المستخدم الحالية.
updateViewForLoggedInUser();
