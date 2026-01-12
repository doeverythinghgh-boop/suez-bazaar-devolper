
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
      `[Dashboard] ${window.langu("dash_choose_destination")}. جاري تحميل الصفحة...`
    );
    // [Step 2] Use `mainLoader` to load admin panel page into designated container.

    Swal.fire({
      title: window.langu("dash_choose_destination"),
      html: `
                <div class="swal-custom-actions" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 20px;">
                    <button id="swal-users-btn" class="swal2-confirm swal2-styled" style="font-size: 0.85em; padding: 0.5em 1.2em;">${window.langu("dash_btn_users")}</button>
                    <button id="swal-advert-btn" class="swal2-deny swal2-styled" style="font-size: 0.85em; padding: 0.5em 1.2em;">${window.langu("dash_btn_advert")}</button>
                    <button id="swal-notifications-btn" class="swal2-styled" style="background-color: #808080; font-size: 0.85em; padding: 0.5em 1.2em;">${window.langu("dash_btn_notifications")}</button>
                    <button id="swal-pending-products-btn" class="swal2-styled" style="background-color: #fd7e14; font-size: 0.85em; padding: 0.5em 1.2em; color: white;">${window.langu("dash_btn_pending_products")}</button>
                </div>
            `,
      showConfirmButton: false,
      showDenyButton: false,
      showCancelButton: true,
      cancelButtonText: window.langu("alert_cancel_btn"),
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
  if (welcomeMsg) {
    welcomeMsg.textContent = window.langu("dash_welcome").replace("{name}", user.username);
  }

  // [Step 3] Guest Check
  if (SessionManager.isGuest()) {
    // [Step 3.1] Hide buttons
    [
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
  }

  // [Step 6] Bind Settings Button (Available for all)
  const settingsBtn = document.getElementById("index-settings-btn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {

      const isDark = document.body.classList.contains('dark-theme');
      const themeIcon = isDark ? 'fa-sun' : 'fa-moon';
      const themeText = isDark ? window.langu("dash_theme_day") : window.langu("dash_theme_night");
      const themeColor = isDark ? '#f39c12' : '#555'; // Sun orange or Moon grey

      Swal.fire({
        title: `<span style="color: var(--dark-blue, #03478f); font-weight: bold;">${window.langu("dash_settings_title")}</span>`,
        html: `
          <div class="settings-modal-content" style="text-align: inherit; direction: inherit;">
            
            <!-- Quick Actions Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
              
               <!-- Notification Settings -->
              <div onclick="mainLoader('notification/page/notifications.html', 'index-notifications-container', 0, undefined, 'showHomeIcon', true); Swal.close();" 
                   class="settings-action-item">
                <i class="fas fa-bell" style="color: #ffc107;"></i>
                <span>${window.langu("dash_notifications_tab")}</span>
              </div>

              <!-- Profile Settings -->
              <div onclick="mainLoader('pages/profile-modal/profile-modal.html', 'index-user-container', 0, undefined, 'showHomeIcon', true); Swal.close();" 
                   class="settings-action-item">
                <i class="fas fa-user-cog" style="color: var(--primary-color);"></i>
                <span>${window.langu("dash_profile_tab")}</span>
              </div>

            </div>

             <!-- Additional Options List -->
            <div style="display: flex; flex-direction: column; gap: 8px;">
               <!-- Theme Toggle -->
               <div onclick="window.toggleAppTheme();"
                    class="settings-list-item">
                  <span>
                     <i class="fas ${themeIcon}" style="color: ${themeColor}; width: 20px;"></i> ${themeText}
                  </span>
                <div style="width: 36px; height: 20px; background: ${isDark ? '#4cd964' : '#e5e5ea'}; border-radius: 20px; position: relative;">
                    <div style="width: 16px; height: 16px; background: var(--bg-color-white); border-radius: 50%; position: absolute; top: 2px; ${isDark ? 'left' : 'right'}: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
                  </div>
               </div>

                <!-- Language Toggle -->
               <div onclick="window.toggleAppLanguage();"
                    class="settings-list-item">
                  <span>
                     <i class="fas fa-language" style="color: var(--primary-color); width: 20px;"></i> ${localStorage.getItem('app_language') === 'en' ? 'English' : 'اللغة العربية'}
                  </span>
                  <div style="width: 36px; height: 20px; background: ${localStorage.getItem('app_language') === 'en' ? '#e5e5ea' : '#4cd964'}; border-radius: 20px; position: relative;">
                    <div style="width: 16px; height: 16px; background: var(--bg-color-white); border-radius: 50%; position: absolute; top: 2px; ${localStorage.getItem('app_language') === 'en' ? 'inset-inline-end' : 'inset-inline-start'}: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
                  </div>
               </div>
               
               <div onclick="mainLoader('pages/contact.html', 'index-contact-container', 0, undefined, 'showHomeIcon', true); Swal.close();"
                    class="settings-list-item">
                  <span>
                     <i class="fas fa-headset"></i> ${window.langu("dash_support")}
                  </span>
                  <i class="fas fa-chevron-left chevron"></i>
               </div>
               

            </div>

          </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        customClass: {
          popup: 'animated fadeInDown faster',
          container: 'settings-swal-container'
        },
        background: isDark ? 'var(--modal-bg)' : '#fff', // Use var for background too if possible, or just keep dynamic hex that matches var
        // Actually, since we are in JS, we can just use the variable string if Swal supports it or rely on isDark logic to match the var value.
        // Let's stick to isDark logic but make sure it matches the var values: #1e1e1e for dark.
        // Better: Use `background: 'var(--modal-bg)'` - Swal applies this to style attribute, so var works!
        background: 'var(--modal-bg)',
        color: 'var(--text-color-dark)',
        width: '350px',
        padding: '20px'
      });
    });
  }
}

// [Final Step] Initialize
updateViewForLoggedInUser();
