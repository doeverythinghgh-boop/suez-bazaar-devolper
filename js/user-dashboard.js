
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
 * @see ADMIN_IDS
 * @see userSession
 */
function updateViewForLoggedInUser() {
  // [Step 1] Check for user session.
  const user = SessionManager.getUser();
  if (!user) return; // No user logged in

  // [Step 2] Update welcome message
  const welcomeMsg = document.getElementById("dash-welcome-message");
  if (welcomeMsg) welcomeMsg.textContent = `أهلاً بك، ${user.username}`;

  // [Step 3] Guest Check
  if (SessionManager.isGuest()) {
    // [Step 3.1] Hide buttons
    [
      "dash-edit-profile-btn",
      "dash-admin-panel-btn",
      "dash-view-sales-movement-btn",
      "dash-add-product-btn",
      "dash-view-my-products-btn",
    ].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.style.display = "none";
    });

    // [Step 3.2] Bind Buttons (Gifts & Contact still available for guests if allowed, but usually gifts need login)
    const giftsBtn = document.getElementById("index-gifts-btn");
    if (giftsBtn) {
      giftsBtn.addEventListener("click", () => {
        if (showLoginAlert()) {
          handleProtectedLinkClick("./pages/gifts.html");
        }
      });
    }

    const contactBtn = document.getElementById("index-contact-btn");
    if (contactBtn) {
      contactBtn.addEventListener("click", () => {
        mainLoader("pages/contact.html", "index-contact-container", 0, undefined, "showHomeIcon", true);
      });
    }

    // [Step 3.3] Bind Logout
    const logoutBtn = document.getElementById("dash-logout-btn-alt");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        // Use global logout() to show confirmation, or SessionManager.logout() directly?
        // Global logout() shows "Are you sure?". SessionManager.logout() just logs out.
        // We keep global logout() for UX consistent with header.
        if (typeof logout === "function") logout();
      });
    }

  } else {
    // [Step 4] Logged-in User (Non-Guest)

    // [Step 4.1] Setup new buttons
    const giftsBtn = document.getElementById("index-gifts-btn");
    if (giftsBtn) {
      giftsBtn.addEventListener("click", () => handleProtectedLinkClick("./pages/gifts.html"));
    }

    const addProductBtn = document.getElementById("dash-add-product-btn");
    if (addProductBtn) {
      addProductBtn.addEventListener("click", () => showAddProductModal());
    }

    const viewMyProductsBtn = document.getElementById("dash-view-my-products-btn");
    if (viewMyProductsBtn) {
      viewMyProductsBtn.addEventListener("click", async () => {
        mainLoader("pages/product2Me/product2Me.html", "index-myProducts-container", 0, undefined, "showHomeIcon", true);
      });
    }

    const contactBtn = document.getElementById("index-contact-btn");
    if (contactBtn) {
      contactBtn.addEventListener("click", () => {
        mainLoader("pages/contact.html", "index-contact-container", 0, undefined, "showHomeIcon", true);
      });
    }

    // [Step 4.2] Admin Panel Button
    const adminBtn = document.getElementById("dash-admin-panel-btn");
    const isAdmin = (typeof ADMIN_IDS !== "undefined" && ADMIN_IDS.includes(user.user_key));
    const isImpersonating = localStorage.getItem("originalAdminSession");

    if (isAdmin || isImpersonating) {
      if (adminBtn) adminBtn.addEventListener("click", handleAdminPanelClick);
    } else {
      if (adminBtn) adminBtn.style.display = "none";
    }

    // [Step 4.3] Reports (Seller/Delivery/Admin)
    // Visible by default.

    // [Step 5] General Buttons
    const logoutBtn = document.getElementById("dash-logout-btn-alt");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        if (typeof logout === "function") logout();
      });
    }

    const editProfileBtn = document.getElementById("dash-edit-profile-btn");
    if (editProfileBtn) {
      editProfileBtn.addEventListener("click", () =>
        mainLoader(
          "pages/profile-modal/profile-modal.html",
          "index-user-container",
          0,
          undefined,
          "showHomeIcon",
          true
        )
      );
    }
  }
}

// [Final Step] Initialize
updateViewForLoggedInUser();
