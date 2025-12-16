
/**
 * @description Handles the click event on the Admin Panel button.
 *   Loads the admin panel page into the main container.
 * @function handleAdminPanelClick
 * @returns {void}
 * @throws {Error} - If an error occurs during `mainLoader` execution or DOM manipulation.
 * @see mainLoader
 * @see Swal.fire
 */
function handleAdminPanelClick() {
  try {
    // [Step 1] Log message to console to track event.
    console.log(
      "[Dashboard] تم النقر على زر لوحة تحكم المسؤول. جاري تحميل الصفحة..."
    );
    // [Step 2] Use `mainLoader` to load admin panel page into designated container.

    Swal.fire({
      title: "اختر وجهتك",
      html: `
                <div class="swal-custom-actions" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 20px;">
                    <button id="swal-users-btn" class="swal2-confirm swal2-styled" style="font-size: 0.85em; padding: 0.5em 1.2em;">مستخدمين</button>
                    <button id="swal-advert-btn" class="swal2-deny swal2-styled" style="font-size: 0.85em; padding: 0.5em 1.2em;">الاعلان</button>
                    <button id="swal-notifications-btn" class="swal2-styled" style="background-color: #808080; font-size: 0.85em; padding: 0.5em 1.2em;">اشعارات</button>
                    <button id="swal-pending-products-btn" class="swal2-styled" style="background-color: #fd7e14; font-size: 0.85em; padding: 0.5em 1.2em; color: white;">المنتجات المعلقة</button>
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

    // Bind events for custom buttons
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
      .addEventListener("click", async () => {
        await mainLoader(
          "notification/page/admainNotificationsetting.html",
          "index-user-container",
          0,
          undefined,
          "showHomeIcon",
          true
        );

        Swal.close();
      });

    // ✅ ربط زر المنتجات المعلقة
    document.getElementById("swal-pending-products-btn").addEventListener("click", () => {
      mainLoader(
        "pages/ADMIN/pendingProducts.html",
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
 * @description Updates the user interface to reflect login status,
 *   and customizes available buttons and actions based on user role (guest, customer, seller, admin).
 * @function updateViewForLoggedInUser
 * @param {object|null} user - كائن المستخدم المسجل دخوله. يمكن أن يكون `null` إذا لم يتم العثور على مستخدم.
 * @param {string} userSession.username - اسم المستخدم.
 * @param {boolean} [userSession.is_guest] - علامة تشير إلى ما إذا كان المستخدم ضيفًا.
 * @param {number} [userSession.is_seller] - دور المستخدم (1: بائع، 2: توصيل).
 * @param {string} [userSession.phone] - رقم هاتف المستخدم.
 * @returns {void}
 * @throws {Error} - If critical DOM elements are missing or functions like `logout` or `mainLoader` fail.
 * @see logout
 * @see mainLoader
 * @see adminPhoneNumbers
 * @see userSession
 */
function updateViewForLoggedInUser() {
  // [Step 1] Check for user session. If no user logged in, function stops.
  if (!userSession) {
    // No action taken, as this scenario should be handled elsewhere (e.g., redirection).
    return;
  }

  // [Step 2] Update welcome message to display logged-in username.
  document.getElementById(
    "dash-welcome-message"
  ).textContent = `أهلاً بك، ${userSession.username}`;

  // [Step 3] Check if user is a "guest".
  if (userSession.is_guest) {
    // [Step 3.1] If guest, hide buttons they don't have access to.
    [
      "dash-edit-profile-btn",
      "dash-admin-panel-btn",

      "dash-view-sales-movement-btn",
    ].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.style.display = "none"; // Hide button if exists
    });
    // [Step 3.2] Bind "Logout" button click event to `logout` function.
    document
      .getElementById("dash-logout-btn-alt")
      .addEventListener("click", () => {
        console.log("تم النقر على زر تسجيل الخروج.1");
        if (typeof logout === "function") logout();
      });
  } else {
    // [Step 4] Display logic for logged-in user (non-guest).

    // [Step 4.1] Check seller permissions:
    // If user is seller (is_seller === 1) or admin, they see product management buttons (visible by default).
    if (
      userSession.is_seller === 1 ||
      (typeof adminPhoneNumbers !== "undefined" &&
        adminPhoneNumbers.includes(userSession.phone))
    ) {
      // No action required here as buttons are visible by default in HTML.
    }

    // [Step 4.2] Check admin permissions:
    // Admin Panel button is shown if user phone is in admin list,
    // or if an original admin session exists (impersonation mode).
    if (
      (typeof adminPhoneNumbers !== "undefined" &&
        adminPhoneNumbers.includes(userSession.phone)) ||
      localStorage.getItem("originalAdminSession")
    ) {
      // Bind click event to admin panel button.
      const adminBtn = document.getElementById("dash-admin-panel-btn");
      if (adminBtn) adminBtn.addEventListener("click", handleAdminPanelClick);
    } else {
      // If user is not admin, hide admin panel button.
      const adminBtn = document.getElementById("dash-admin-panel-btn");
      if (adminBtn) adminBtn.style.display = "none";
    }

    // [Step 4.3] Check reports viewing permissions:
    // If user is seller (1), delivery (2), or admin, they see reports button.
    if (
      userSession.is_seller === 1 ||
      userSession.is_seller === 2 ||
      (typeof adminPhoneNumbers !== "undefined" &&
        adminPhoneNumbers.includes(userSession.phone))
    ) {
      // No action required here as button is visible by default.
    } else {
      // If not eligible, hide button (code currently disabled).
      ///    document.getElementById("dash-view-sales-movement-btn").style.display =
      ///    "none";
    }
    // [Step 5] Bind general button events for all registered users.
    // [5.1] Bind logout button.
    document
      .getElementById("dash-logout-btn-alt")
      .addEventListener("click", () => {
        console.log("تم النقر على زر تسجيل الخروج.2");

        logout();
      });

    // [5.2] Bind "Edit Profile" button to load edit page.
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

// [Final Step] Call function immediately upon file load to update view based on current user state.
/**
 * @description Automatically initializes the user dashboard view when the script loads.
 * @function initializeDashboardView
 * @returns {void}
 * @see updateViewForLoggedInUser
 */
updateViewForLoggedInUser();
