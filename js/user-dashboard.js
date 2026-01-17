
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
      buttonsStyling: false,
      customClass: {
        popup: 'swal-modern-mini-popup',
        title: 'swal-modern-mini-title',
        htmlContainer: 'swal-modern-mini-text',
        cancelButton: 'swal-modern-mini-cancel'
      }
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
      "index-gifts-btn",        // Hide Gifts for Guest
      "dash-seller-section"     // Hide Seller Section (using new ID) for Guest
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

      // 1. Inject CSS if not exists
      if (!document.getElementById('custom-settings-style')) {
        const style = document.createElement('style');
        style.id = 'custom-settings-style';
        style.textContent = `
          .custom-settings-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.4); z-index: 1050;
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.3s;
          }
          .custom-settings-overlay.active { opacity: 1; }
          .custom-settings-modal {
            background: var(--modal-bg, #fff); color: var(--text-color-dark, #333);
            width: 350px; padding: 20px; border-radius: 5px;
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
            transform: scale(0.9); transition: transform 0.3s;
            position: relative;
            max-width: 90%;
            display: flex; flex-direction: column;
          }
          .custom-settings-overlay.active .custom-settings-modal { transform: scale(1); }
          .custom-settings-close {
            position: absolute; top: 10px; right: 10px; cursor: pointer;
            font-size: 1.2em; color: var(--text-color-medium, #777);
          }
           /* RTL Support for close button */
           html[dir="rtl"] .custom-settings-close { right: auto; left: 10px; }
        `;
        document.head.appendChild(style);
      }

      // 2. Define Close Function Global
      window.closeSettingsModal = function () {
        const overlay = document.getElementById('custom-settings-modal-overlay');
        if (overlay) {
          overlay.classList.remove('active');
          setTimeout(() => overlay.remove(), 300);
        }
      };

      const isDark = document.body.classList.contains('dark-theme');
      const themeIcon = isDark ? 'fa-sun' : 'fa-moon';
      const themeText = isDark ? window.langu("dash_theme_day") : window.langu("dash_theme_night");
      const themeColor = isDark ? '#f39c12' : '#555';

      // 3. Build HTML
      const modalHTML = `
        <div class="custom-settings-modal">
           <i class="fas fa-times custom-settings-close" onclick="closeSettingsModal()"></i>
           <div style="text-align: center; margin-bottom: 15px;">
              <span style="color: var(--dark-blue, #03478f); font-weight: bold; font-size: 1.1em;">${window.langu("dash_settings_title")}</span>
           </div>

           <div id="settings_modal_content" class="settings-modal-content" style="text-align: inherit; direction: inherit;">
             
             <!-- Options List -->
            <div id="settings_list_options" style="display: flex; flex-direction: column; gap: 8px;">

               <!-- Profile Settings (Moved to list) -->
               <div id="settings_action_profile" onclick="mainLoader('pages/profile-modal/profile-modal.html', 'index-user-container', 0, undefined, 'showHomeIcon', true); closeSettingsModal();" 
                    class="settings-list-item">
                  <span>
                     <i class="fas fa-user-cog" style="color: var(--primary-color);"></i> ${window.langu("dash_profile_tab")}
                  </span>
                  <i class="fas fa-chevron-left chevron"></i>
               </div>


               <!-- Theme Toggle -->
               <div id="settings_list_theme" onclick="window.toggleAppTheme();"
                    class="settings-list-item">
                  <span>
                     <i class="fas ${themeIcon}" style="color: ${themeColor}; width: 20px;"></i> ${themeText}
                  </span>
                <div style="width: 36px; height: 20px; background: ${isDark ? '#4cd964' : '#e5e5ea'}; border-radius: 20px; position: relative;">
                    <div style="width: 16px; height: 16px; background: var(--bg-color-white); border-radius: 50%; position: absolute; top: 2px; ${isDark ? 'left' : 'right'}: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
                  </div>
               </div>

                <!-- Language Toggle -->
               <div id="settings_list_language" onclick="window.toggleAppLanguage();"
                    class="settings-list-item">
                  <span>
                     <i class="fas fa-language" style="color: var(--primary-color); width: 20px;"></i> ${localStorage.getItem('app_language') === 'en' ? 'English' : 'اللغة العربية'}
                  </span>
                  <div style="width: 36px; height: 20px; background: ${localStorage.getItem('app_language') === 'en' ? '#e5e5ea' : '#4cd964'}; border-radius: 20px; position: relative;">
                    <div style="width: 16px; height: 16px; background: var(--bg-color-white); border-radius: 50%; position: absolute; top: 2px; ${localStorage.getItem('app_language') === 'en' ? 'inset-inline-end' : 'inset-inline-start'}: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
                  </div>
               </div>

               <!-- Fetch Orders Section (Dynamic) -->
               ${(() => {
          const user = SessionManager.getUser();
          const isAdmin = (user && typeof ADMIN_IDS !== 'undefined' && ADMIN_IDS.includes(user.user_key));
          const isImpersonating = localStorage.getItem("originalAdminSession");

          // Use saved type or default to 'buyer'
          const savedType = localStorage.getItem('sales_movement_user_type') || 'buyer';

          // Helper to check radio state
          const isChecked = (val) => (savedType === val ? 'checked' : '');

          if (isAdmin || isImpersonating) {
            // Admin View: Locked to Admin
            return `
                     <div class="settings-list-item" style="cursor: default; opacity: 0.8;">
                        <span style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                           <span><i class="fas fa-boxes" style="color: var(--primary-color); width: 20px;"></i> ${window.langu("dash_fetch_orders_title")}</span>
                           <span style="font-size: 0.9em; font-weight: bold; color: var(--danger-color);">${window.langu('dash_opt_admin')} <i class="fas fa-lock" style="font-size: 0.8em;"></i></span>
                        </span>
                     </div>
                   `;
          } else {
            // Normal User View: Selector
            return `
                     <div class="settings-list-item" style="flex-direction: row; align-items: center; justify-content: space-between; gap: 10px;">
                        <span style="display: flex; align-items: center; gap: 8px;">
                           <i class="fas fa-boxes" style="color: var(--primary-color); width: 20px;"></i> 
                           ${window.langu("dash_fetch_orders_title")}
                        </span>
                        
                        <div>
                            <select id="settings_fetch_type_select" onchange="handleFetchSettingsChange(this.value)"
                                    style="padding: 6px; border: 1px solid #ccc; border-radius: 6px; background: var(--bg-color-white); color: var(--text-color-dark); font-size: 0.9em;">
                                ${['buyer', 'seller', 'delivery'].map(type => `
                                    <option value="${type}" ${savedType === type ? 'selected' : ''}>
                                        ${window.langu('dash_opt_' + type)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                     </div>
                    `;
          }
        })()}


               <!-- Notification Toggle -->
               <div id="settings_list_notifications" onclick="handleNotificationToggleFromSettings();"
                    class="settings-list-item">
                  ${(() => {
          const storedEnabled = localStorage.getItem('notifications_enabled');
          const isAndroid = !!(window.Android);
          const hasPermission = ('Notification' in window && Notification.permission === 'granted') || isAndroid;
          const isNotifEnabled = (storedEnabled === 'true' && hasPermission);

          return `
                      <span>
                         <i class="fas fa-bell" style="color: ${isNotifEnabled ? '#28a745' : '#6c757d'}; width: 20px;"></i> ${window.langu("dash_notifications_tab")}
                      </span>
                      <div style="width: 36px; height: 20px; background: ${isNotifEnabled ? '#4cd964' : '#e5e5ea'}; border-radius: 20px; position: relative;">
                        <div style="width: 16px; height: 16px; background: var(--bg-color-white); border-radius: 50%; position: absolute; top: 2px; ${isNotifEnabled ? 'inset-inline-start' : 'inset-inline-end'}: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
                      </div>
                      `;
        })()}
               </div>
               
               <div id="settings_list_support" onclick="mainLoader('pages/contact.html', 'index-contact-container', 0, undefined, 'showHomeIcon', true); closeSettingsModal();"
                    class="settings-list-item">
                  <span>
                     <i class="fas fa-headset"></i> ${window.langu("dash_support")}
                  </span>
                  <i class="fas fa-chevron-left chevron"></i>
               </div>
            </div>
           </div>
        </div>
      `;

      // 4. Create and Append Overlay
      const overlay = document.createElement('div');
      overlay.id = 'custom-settings-modal-overlay';
      overlay.className = 'custom-settings-overlay';
      overlay.innerHTML = modalHTML;

      // Close on background click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) window.closeSettingsModal();
      });

      document.body.appendChild(overlay);

      // Trigger animation
      requestAnimationFrame(() => {
        overlay.classList.add('active');
      });

    });
  }
}

// [Final Step] Initialize
updateViewForLoggedInUser();

/**
 * @description Handles the notification toggle click from the settings modal.
 *   Triggers the global notification toggle logic and updates the UI in-place.
 * @function handleNotificationToggleFromSettings
 */
window.handleNotificationToggleFromSettings = async function () {
  // Do NOT close settings modal. The confirmation Swal will appear on top (z-index 1060 vs 1050).

  // [Fix for iOS] Removed setTimeout to preserve User Gesture (User Interaction) context.
  // This is critical for Notification.requestPermission() to work on Safari/iOS.

  // Ensure NotificationPage is available
  if (typeof NotificationPage !== 'undefined' && NotificationPage.toggleNotificationsStatus) {
    const isEnabled = localStorage.getItem('notifications_enabled') === 'true';
    // This will convert boolean !isEnabled to either enable() or disable()
    await NotificationPage.toggleNotificationsStatus(!isEnabled);

    // Update UI after operation wraps up
    // We need to re-read the state because the user might have cancelled the operation in the Swal.
    const el = document.getElementById('settings_list_notifications');
    if (el) {
      const storedEnabled = localStorage.getItem('notifications_enabled');
      const isAndroid = !!(window.Android);
      const hasPermission = ('Notification' in window && Notification.permission === 'granted') || isAndroid;
      const isNotifEnabled = (storedEnabled === 'true' && hasPermission);

      el.innerHTML = `
              <span>
                 <i class="fas fa-bell" style="color: ${isNotifEnabled ? '#28a745' : '#6c757d'}; width: 20px;"></i> ${window.langu("dash_notifications_tab")}
              </span>
              <div style="width: 36px; height: 20px; background: ${isNotifEnabled ? '#4cd964' : '#e5e5ea'}; border-radius: 20px; position: relative;">
                <div style="width: 16px; height: 16px; background: var(--bg-color-white); border-radius: 50%; position: absolute; top: 2px; ${isNotifEnabled ? 'inset-inline-start' : 'inset-inline-end'}: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
              </div>
          `;
    }

  } else {
    console.error("NotificationPage logic is not loaded.");
    Swal.fire({
      icon: 'error',
      title: window.langu('error'),
      text: 'نظام الإشعارات غير جاهز بعد. الرجاء الانتظار قليلاً.'
    });
  }
};

/**
 * @description Handles changes to the "Fetch Orders" setting in the modal.
 * @param {string} newValue - 'buyer', 'seller', or 'delivery'
 */
window.handleFetchSettingsChange = function (newValue) {
  // 1. UI update is handled by Select Element natively.

  // 2. Prepare Alert Data based on translation structure
  // Note: We access the key directly from window.appTranslations or similar if available, 
  // but window.langu usually returns a string. We need the object structure for title/text if window.langu doesn't support nested keys well.
  // However, our window.langu usually flattens or we access raw data. 
  // Let's assume we can fetch the object directly or hardcode fallback logic if structure differs.
  // Actually, let's use a helper that knows the structure.

  let alertKey = '';
  if (newValue === 'seller') alertKey = 'dash_alert_seller_switch';
  else if (newValue === 'delivery') alertKey = 'dash_alert_delivery_switch';
  else alertKey = 'dash_alert_buyer_switch';

  // Helper to get nested translation safely
  const getTrans = (key, sub) => {
    try {
      // Try to find the raw object in window.appTranslations first
      if (window.appTranslations && window.appTranslations[key]) {
        const lang = localStorage.getItem('app_language') || 'ar';
        return window.appTranslations[key][sub][lang];
      }
      return "";
    } catch (e) { return ""; }
  };

  const title = getTrans(alertKey, 'title') || (newValue === 'seller' ? 'وضع البائع' : 'تغيير الوضع');
  const text = getTrans(alertKey, 'text') || 'تم تغيير وضع جلب الطلبات.';

  // 3. Show Alert (Small Toast or Mini Modal)
  // The user asked for "Window explaining the choice".
  Swal.fire({
    title: title,
    text: text,
    icon: 'info',
    confirmButtonText: window.langu('alert_confirm_btn') || 'حسناً',
    customClass: {
      popup: 'swal-modern-mini-popup',
      title: 'swal-modern-mini-title',
      htmlContainer: 'swal-modern-mini-text',
      confirmButton: 'swal-modern-mini-confirm'
    }
  }).then(() => {
    // 4. Save to Storage
    localStorage.setItem('sales_movement_user_type', newValue);
    console.log(`[Settings] Sales Movement User Type set to: ${newValue}`);
  });
};
