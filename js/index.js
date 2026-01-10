/**
 * @file index.html
 * @description Main entry point for the Bazaar application. Handles navigation, initial data loading (user session, notification config), and UI setup for the single-page application structure.
 */

/**
 * @function hiddenHomeIcon
 * @description Hides the "Home" icon in the navigation bar by adding a CSS class.
 * @returns {void}
 */

function hiddenHomeIcon() {
  const homeButton = document.getElementById("index-home-btn");
  if (homeButton) {
    homeButton.classList.add("index-hidden");
  }
}

/**
 * @function showHomeIcon
 * @description Shows the "Home" icon in the navigation bar by removing the CSS class.
 * @returns {void}
 */
function showHomeIcon() {
  const homeButton = document.getElementById("index-home-btn");
  if (homeButton) {
    homeButton.classList.remove("index-hidden");
  }
}

// [Global translation variables and functions]

/**
 * @description Applies translations to all elements with data-lkey attribute and sets page direction.
 * @function applyAppTranslations
 */
window.applyAppTranslations = function () {
  const lang = window.app_language || 'ar';

  // Set HTML dir and lang attributes
  const htmlRoot = document.getElementById('index-html-root');
  if (htmlRoot) {
    htmlRoot.setAttribute('lang', lang);
    htmlRoot.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  }

  // Translate DOM elements
  document.querySelectorAll('[data-lkey]').forEach(el => {
    const key = el.getAttribute('data-lkey');
    el.textContent = window.langu(key);
  });

  // Translate DOM Titles
  document.querySelectorAll('[data-lkey-title]').forEach(el => {
    const key = el.getAttribute('data-lkey-title');
    el.setAttribute('title', window.langu(key));
  });

  // Translate Placeholders
  document.querySelectorAll('[data-lkey-placeholder]').forEach(el => {
    const key = el.getAttribute('data-lkey-placeholder');
    el.setAttribute('placeholder', window.langu(key));
  });

  // Translate Page Title
  document.title = window.langu('page_title');

  // Final step: Ensure session-specific texts are correct
  if (typeof setUserNameInIndexBar === 'function') {
    setUserNameInIndexBar();
  }
};

async function loadIndexTranslations() {
  try {
    // 1. Load General Translations
    const timestamp = Date.now();
    const generalRes = await fetch(`lang/general.json?t=${timestamp}`);
    const generalData = generalRes.ok ? await generalRes.json() : {};

    // 2. Load Page-specific Translations (Index & Login)
    const indexRes = await fetch(`lang/index.json?t=${timestamp}`);
    const indexData = indexRes.ok ? await indexRes.json() : {};

    const loginRes = await fetch(`lang/login.json?t=${timestamp}`);
    const loginData = loginRes.ok ? await loginRes.json() : {};

    const dashboardRes = await fetch(`lang/user-dashboard.json?t=${timestamp}`);
    const dashboardData = dashboardRes.ok ? await dashboardRes.json() : {};

    const profileRes = await fetch(`lang/profile-modal.json?t=${timestamp}`);
    const profileData = profileRes.ok ? await profileRes.json() : {};

    const notificationsRes = await fetch(`lang/notifications.json?t=${timestamp}`);
    const notificationsData = notificationsRes.ok ? await notificationsRes.json() : {};

    const cartRes = await fetch(`lang/cart.json?t=${timestamp}`);
    const cartData = cartRes.ok ? await cartRes.json() : {};

    const salesMovementRes = await fetch(`lang/sales-movement.json?t=${timestamp}`);
    const salesMovementData = salesMovementRes.ok ? await salesMovementRes.json() : {};

    const productViewRes = await fetch(`lang/product-view.json?t=${timestamp}`);
    const productViewData = productViewRes.ok ? await productViewRes.json() : {};

    const searchRes = await fetch(`lang/search.json?t=${timestamp}`);
    const searchData = searchRes.ok ? await searchRes.json() : {};

    const productAddRes = await fetch(`lang/productAdd.json?t=${timestamp}`);
    const productAddData = productAddRes.ok ? await productAddRes.json() : {};

    const productEditRes = await fetch(`lang/productEdit.json?t=${timestamp}`);
    const productEditData = productEditRes.ok ? await productEditRes.json() : {};

    const productAdd2Res = await fetch(`lang/productAdd2.json?t=${timestamp}`);
    const productAdd2Data = productAdd2Res.ok ? await productAdd2Res.json() : {};

    const productEdit2Res = await fetch(`lang/productEdit2.json?t=${timestamp}`);
    const productEdit2Data = productEdit2Res.ok ? await productEdit2Res.json() : {};

    const productView2Res = await fetch(`lang/productView2.json?t=${timestamp}`);
    const productView2Data = productView2Res.ok ? await productView2Res.json() : {};

    const registerRes = await fetch(`lang/register.json?t=${timestamp}`);
    const registerData = registerRes.ok ? await registerRes.json() : {};

    const locationRes = await fetch(`lang/location.json?t=${timestamp}`);
    const locationData = locationRes.ok ? await locationRes.json() : {};

    // 3. Merge them
    window.appTranslations = {
      ...generalData,
      ...indexData,
      ...loginData,
      ...dashboardData,
      ...profileData,
      ...notificationsData,
      ...cartData,
      ...salesMovementData,
      ...productViewData,
      ...searchData,
      ...productAddData,
      ...productEditData,
      ...productAdd2Data,
      ...productEdit2Data,
      ...productView2Data,
      ...registerData,
      ...locationData
    };

    console.log('✅ تم تحميل ودمج الترجمات العامة والخاصة بصفحات البداية، الدخول، السلة، ولوحة التحكم.');
    if (window.applyAppTranslations) window.applyAppTranslations();

  } catch (e) {
    console.error('❌ خطأ في تحميل ملفات الترجمة:', e);
  }
}

// [EntryPoint] Executed when DOM is fully loaded.
/**
 * @event DOMContentLoaded
 * @description Initializes the application on page load. Fetches notification config, sets up user session, loads the home page, and binds all navigation event listeners.
 * @async
 */
document.addEventListener("DOMContentLoaded", async () => {
  // [Environment Check]
  if (window.Android) {
    console.log("📱 [Bridge] Native Android Interface Detected.");
    const bridgeMethods = [
      typeof window.Android.onUserLoggedIn === 'function' ? '✅ Logic' : '❌ Logic',
      typeof window.Android.onLanguageChanged === 'function' ? '✅ Lang' : '❌ Lang',
      typeof window.Android.checkForUpdates === 'function' ? '✅ Update' : '❌ Update'
    ];
    console.log(`📱 [Bridge] Methods: [${bridgeMethods.join(" | ")}]`);
  } else {
    console.log("🌐 [Bridge] Standard Web / PWA Environment.");
  }
  // [Step -1.2] Fetch global categories list
  await fetchAppCategories();

  // [Step -1.1] Initialize Theme
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme');
  }

  // [Step -1.1.1] Initialize Language
  if (!localStorage.getItem('app_language')) {
    localStorage.setItem('app_language', 'ar'); // Default to Arabic
  }

  // [Step -1.1.2] Load Translations for Index Page
  await loadIndexTranslations();
  window.applyAppTranslations(); // Initial translation application

  // Define Global Toggle Functions
  window.toggleAppTheme = function () {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    // Update Swal if open
    if (Swal.isVisible()) {
      Swal.close();
    }
  };

  window.toggleAppLanguage = function () {
    const currentLang = localStorage.getItem('app_language') || 'ar';
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('app_language', newLang);
    window.app_language = newLang; // Sync global variable

    console.log(`[اللغة] تم تغيير اللغة إلى: ${newLang === 'ar' ? 'العربية' : 'الإنجليزية'}`);

    // [Android Bridge] Sync language change with native app
    if (window.Android && typeof window.Android.onLanguageChanged === 'function') {
      window.Android.onLanguageChanged(newLang);
    }

    const alertTitle = window.langu('alert_lang_change_title');
    const alertText = window.langu('alert_lang_change_text');
    const confirmButtonText = window.langu('alert_confirm_btn');

    // Show SweetAlert2 with manual confirmation button
    Swal.fire({
      title: alertTitle,
      text: alertText,
      icon: 'info',
      showConfirmButton: true,
      confirmButtonText: confirmButtonText,
      allowOutsideClick: false,
      allowEscapeKey: false
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.reload(); // Reload to apply language changes safely
      }
    });
  };

  // [Step -1] Check for new version and clear data if needed
  await checkAppVersionAndClearData();

  // [Step -1.5] Periodic Version Check (Every minute checks if 1 hour passed)
  setInterval(async () => {
    const lastCheck = localStorage.getItem('last_version_check_time');
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;

    if (!lastCheck || (now - parseInt(lastCheck)) > ONE_HOUR) {
      console.log("[VersionCheck] Hourly check triggered.");
      await checkAppVersionAndClearData();
    }
  }, 60 * 1000); // Check every minute

  // [Step 0] Load notification configurations from server (Single Source of Truth)
  try {
    const r2Url = getPublicR2FileUrl('notification_config.json');
    const timestamp = new Date().getTime();
    const response = await fetch(`${r2Url}?t=${timestamp}`);

    if (response.ok) {
      window.globalNotificationConfig = await response.json();
      console.log('✅ تم تحميل إعدادات الإشعارات من R2 بنجاح:', window.globalNotificationConfig);
    } else {
      // Fallback to local file if R2 fails
      console.warn('⚠️ فشل تحميل إعدادات الإشعارات من R2 (', response.status, ')، محاولة التحميل من الملف المحلي...');
      try {
        const localResponse = await fetch(`/notification/notification_config.json?t=${timestamp}`);
        if (localResponse.ok) {
          window.globalNotificationConfig = await localResponse.json();
          console.log('✅ تم تحميل إعدادات الإشعارات من الملف المحلي بنجاح:', window.globalNotificationConfig);
        } else {
          console.error('❌ فشل تحميل إعدادات الإشعارات من الملف المحلي أيضاً:', localResponse.status);
        }
      } catch (localError) {
        console.error('❌ خطأ في تحميل إعدادات الإشعارات من الملف المحلي:', localError);
      }
    }
  } catch (error) {
    // Fallback to local file if R2 connection fails
    console.warn('⚠️ خطأ في الاتصال بـ R2:', error.message, '- محاولة التحميل من الملف المحلي...');
    try {
      const timestamp = new Date().getTime();
      const localResponse = await fetch(`/notification/notification_config.json?t=${timestamp}`);
      if (localResponse.ok) {
        window.globalNotificationConfig = await localResponse.json();
        console.log('✅ تم تحميل إعدادات الإشعارات من الملف المحلي بنجاح:', window.globalNotificationConfig);
      } else {
        console.error('❌ فشل تحميل إعدادات الإشعارات من الملف المحلي:', localResponse.status);
      }
    } catch (localError) {
      console.error('❌ خطأ في تحميل إعدادات الإشعارات من الملف المحلي:', localError);
    }
  }

  // [Step 1] Read logged-in user data from storage using SessionManager.
  SessionManager.init();
  // [Step 2] Update username in top navigation bar (handled by init, but can keep comment or remove redundant call if init does it coverage).
  // SessionManager.init() calls setUserNameInIndexBar internally.
  // [Step 3] Update cart item count badge.
  updateCartBadge();
  // [Step 4] Load home page by default when app opens.
  mainLoader(
    "./pages/home.html",
    "index-home-container",
    0,
    undefined,
    // Call function to hide "Home" button since we are already on home.
    "hiddenHomeIcon"
  );

  //#region main navigation handlers
  document
    .getElementById("index-login-btn")
    .addEventListener("click", handleLoginButtonClick);

  // [خطوة 5.2] ربط زر "الرئيسية" بالدالة الخاصة به.
  document
    .getElementById("index-home-btn")
    .addEventListener("click", handleHomeButtonClick);

  // [Step 5.3] Bind "Search" button.
  document
    .getElementById("index-search-btn")
    .addEventListener("click", handleSearchButtonClick);

  // [Step 5.4] Bind "Sales Movement" button.
  /**
   * @event click
   * @description Handles the "Sales Movement" button click. Checks login status: if logged in, loads the sales movement page; otherwise, prompts for login.
   * @async
   */
  document
    .getElementById("index-sales-movement-btn")
    .addEventListener("click", async () => {
      // Check if user is logged in.
      if (showLoginAlert()) {
        const container = document.getElementById("index-salesMovement-container");
        if (container.innerHTML == "") {
          await mainLoader(
            "./pages/sales-movement/sales-movement.html",
            "index-salesMovement-container",
            300,
            undefined,
            "showHomeIcon",
            true
          );
        } else {
          await mainLoader(
            "./pages/sales-movement/sales-movement.html",
            "index-salesMovement-container",
            300,
            undefined,
            "showHomeIcon",
            false
          );
        }
      }
    });

  // [Step 5.9] Bind "Notifications" button.
  /**
   * @event click
   * @description Handles the "Notifications" button click. Loads the notifications page.
   */
  document
    .getElementById("index-notifications-btn")
    .addEventListener("click", () => {
      if (showLoginAlert()) {
        mainLoader("./notification/page/notifications.html", "index-notifications-container", 0, undefined, "showHomeIcon", true);
      }
    });




  // [Step 5.5] Bind "Cart" button.
  /**
   * @event click
   * @description Handles the "Cart" button click. Loads the card package page (cart).
   */
  document
    .getElementById("index-cart-btn")
    .addEventListener("click", () => {
      if (showLoginAlert()) {
        const container = document.getElementById(
          "index-cardPackage-container"
        );
        if (container.innerHTML == "") {
          mainLoader(
            "./pages/cardPackage/cardPackage.html",
            "index-cardPackage-container",
            0,
            undefined,
            "showHomeIcon",
            true
          );
        } else {
          mainLoader(
            "./pages/cardPackage/cardPackage.html",
            "index-cardPackage-container",
            0,
            undefined,
            "showHomeIcon",
            false
          );
        }
      }
    });

  // Gifts logic moved to dashboard



  /**
   * @function handleHomeButtonClick
   * @description Handles the "Home" button click. Checks for Android updates and reloads the home page if necessary.
   * @returns {void}
   */
  function handleHomeButtonClick() {
    // Check for Android interface and update function.
    if (window.Android && typeof window.Android.checkForUpdates === "function") {
      window.Android.checkForUpdates();
    }
    const container = document.getElementById("index-home-container");
    if (container.innerHTML == "") {
      mainLoader(
        "pages/home.html",
        "index-home-container",
        0,
        undefined,
        "hiddenHomeIcon",
        true
      );
    } else {
      mainLoader(
        "pages/home.html",
        "index-home-container",
        0,
        undefined,
        "hiddenHomeIcon",
        false
      );
    }
  }

  /**
   * @function handleLoginButtonClick
   * @description Handles the "Login" button click. Redirects to User Dashboard if logged in, otherwise to Login page.
   * @returns {void}
   */
  function handleLoginButtonClick() {
    try {
      const currentUser = SessionManager.getUser();
      if (currentUser) {
        // [A] If user is logged in, redirect to dashboard.
        const userContainer = document.getElementById("index-user-container");
        const isCurrentlyInUserContainer = (LOADER_REGISTRY[LOADER_REGISTRY.length - 1] === "index-user-container");
        const isDashboardVisible = document.getElementById("dash-welcome-message");

        if (!isCurrentlyInUserContainer || !isDashboardVisible) {
          // [1] If we are not in user container OR dashboard is not visible, load it.
          console.log("[Navigation] Loading user dashboard.");
          mainLoader(
            "pages/user-dashboard.html",
            "index-user-container",
            0,
            undefined,
            "showHomeIcon",
            true // Force reload to clear any old content (like register form)
          );
        } else {
          // [2] If already on dashboard, we can either stay or go back. 
          // Keeping containerGoBack here only if we are SURE we are on dashboard.
          console.log("[Navigation] Already on dashboard, going back.");
          containerGoBack();
        }
      } else {
        // [B] If user is not logged in, redirect to login page.
        mainLoader(
          "pages/login/login.html",
          "index-user-container",
          300,
          undefined,
          "showHomeIcon",
          true
        );
      }
    } catch (error) {
      console.error("خطأ في معالجة زر تسجيل الدخول:", error);
    }
  }

  /**
   * @function handleSearchButtonClick
   * @description Handles the "Search" button click. Loads the search page.
   * @returns {void}
   */
  function handleSearchButtonClick() {
    const container = document.getElementById("index-search-container");
    if (container.innerHTML == "") {
      mainLoader(
        "pages/search/search.html",
        "index-search-container",
        0,
        undefined,
        "showHomeIcon",
        true
      );
    } else {
      mainLoader(
        "pages/search/search.html",
        "index-search-container",
        0,
        undefined,
        "showHomeIcon",
        false
      );
    }
  }

  // handleContactButtonClick moved to dashboard logic

  // Add/My Products logic moved to dashboard
  //#endregion

  // [Step 6] Validation logic for active button in navigation bar.
  /**
   * @constant {NodeListOf<HTMLElement>} headerButtons
   * @description List of all header navigation buttons.
   */
  const headerButtons = document.querySelectorAll(".index-header-login-btn");

  /**
   * @function setActiveButton
   * @description Sets the active class on the clicked button and removes it from others.
   * @param {HTMLElement} clickedBtn - The button that was clicked.
   * @returns {void}
   */
  function setActiveButton(clickedBtn) {
    // [A] Remove 'active' class from all buttons.
    headerButtons.forEach((btn) => btn.classList.remove("active"));
    if (clickedBtn) {
      clickedBtn.classList.add("active");
    }
  }

  headerButtons.forEach((btn) => {
    // [B] Add listener to each button to apply active state on click.
    btn.addEventListener("click", function () {
      setActiveButton(this);
    });
  });

  // [Step 7] Set "Home" button as active by default on page load.
  /**
   * @constant {HTMLElement} homeBtn
   * @description The Home button element.
   */
  const homeBtn = document.getElementById("index-home-btn");
  if (homeBtn) {
    setActiveButton(homeBtn);
  }

  // [Step 8] Check for Impersonation Mode (Admin viewing as user) and show watermark if active.
  checkImpersonationMode();

  // [Step 9] Auto-initialize FCM if user is already logged in and notifications are enabled.
  const currentUser = SessionManager.getUser();
  if (currentUser && currentUser.user_key) {
    const notificationsEnabled = localStorage.getItem('notifications_enabled') !== 'false';
    if (notificationsEnabled) {
      setupFCM();
    } else {
      console.log("[FCM] الإشعارات معطلة من قبل المستخدم – تخطي التهيئة التلقائية.");
    }
  }

  // [Step 10] Run Header Scroll Tutorial
  runHeaderScrollTutorial();
});

/**
 * Auto-scroll tutorial to show that the header is scrollable.
 * Runs only on first and second page load.
 */
function runHeaderScrollTutorial() {
  const TUTORIAL_KEY = 'headerScrollTutorial_v4'; // Final production key
  const MAX_RUNS = 7; // Run 7 times per user
  const SCROLL_DURATION = 1000; // Accelerated speed (1 second)

  try {
    let count = parseInt(localStorage.getItem(TUTORIAL_KEY) || '0', 10);

    if (count >= MAX_RUNS) {
      return;
    }

    // Increment count
    localStorage.setItem(TUTORIAL_KEY, (count + 1).toString());

    const wrapper = document.getElementById('index-app-header');
    if (!wrapper) return;

    // Wait for rendering
    setTimeout(() => {
      const scrollW = wrapper.scrollWidth;
      const clientW = wrapper.clientWidth;
      const maxScroll = scrollW - clientW;

      if (maxScroll <= 1) {
        return;
      }

      // Determine Start/End based strictly on logical direction (0 to Max)
      // Browser behavior check for RTL is implicitly handled by testing valid scroll values

      const originalPos = wrapper.scrollLeft;

      // Simple robust detection: Try scrolling positive. If it moves, use positive logic.
      wrapper.scrollLeft = 50;
      const valPositive = wrapper.scrollLeft;
      wrapper.scrollLeft = originalPos; // Reset

      let targetValue = 0;

      if (valPositive > 1) {
        // Browser accepts positive values (LTR or specific RTL implementations like Firefox/Safari)
        targetValue = maxScroll;
      } else {
        // Browser likely expects negative values for RTL (Chrome)
        targetValue = -maxScroll;
      }

      // Log for verification without spamming
      console.log(`[HeaderTutorial] Auto-scrolling to ${targetValue} over ${SCROLL_DURATION}ms`);

      // Start Animation
      const startTime = performance.now();

      function animate(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / SCROLL_DURATION, 1);

        // Ease In Out Quad
        const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const currentPos = targetValue * ease;
        wrapper.scrollLeft = currentPos;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Start return animation after a brief pause
          setTimeout(() => {
            const returnStart = performance.now();
            function animateBack(t) {
              const e = t - returnStart;
              const p = Math.min(e / SCROLL_DURATION, 1);
              const easeBack = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

              wrapper.scrollLeft = targetValue * (1 - easeBack);

              if (p < 1) requestAnimationFrame(animateBack);
            }
            requestAnimationFrame(animateBack);
          }, 250); // Shorter pause (0.25s)
        }
      }

      requestAnimationFrame(animate);

    }, 1500);

  } catch (e) {
    console.warn("[HeaderTutorial] Silent fail:", e);
  }
}

