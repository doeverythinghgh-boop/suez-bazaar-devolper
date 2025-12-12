/**
 * @file js/auth.js
 * @description Manages authentication state and user login.
 *
 * This file provides functions to handle user login state via LocalStorage.
 * - `checkLoginStatus`: Checks if the user is logged in on page load and updates the UI.
 * - `logout`: Logs the user out by removing their data from LocalStorage and refreshing the page.
 */





/**
 * @description Logs out the user by removing their data from local storage and redirecting to `index.html`.
 *   This includes removing FCM tokens from the server and `localStorage`.
 * @function logout
 * @returns {Promise<void>} - A Promise that resolves when the async logout process is complete.
 * @async
 * @throws {Error} - If `clearAndNavigateToLogin` fails.
 * @see clearAndNavigateToLogin
 */
async function logout() {
  // [Step 1] Show a confirmation popup to the user before logging out using SweetAlert.
  Swal.fire({
    title: "هل أنت متأكد؟",
    text: "سيتم تسجيل خروجك.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "نعم، تسجيل الخروج",
    cancelButtonText: "إلغاء",
    showLoaderOnConfirm: true, // Show loading icon when "Yes" is clicked.
    // [Step 2] Use `preConfirm` to execute the async logout process.
    // This ensures the popup stays open showing the loader until the process completes.
    preConfirm: async () => {
      await clearAndNavigateToLogin();
    },
    // [Step 3] Prevent closing the popup by clicking outside during loading.
    allowOutsideClick: () => !Swal.isLoading(),
  });

}

/**
 * @description Clears the content of all main containers on the page.
 *   Used to reset the interface upon logout or navigation between main sections.
 * @function clearMainContainers
 * @returns {void}
 * @throws {Error} - If there's an error manipulating DOM elements.
 */
function clearMainContainers() {
  // [Step 1] Define an array of container IDs to clear.
  const containerIds = [
    "index-home-container",
    "index-search-container",
    "index-user-container",
    "index-product-container",
    "index-cardPackage-container",
    "index-myProducts-container",
  ];

  console.log("[UI] جاري مسح الحاويات الرئيسية...");

  // [Step 2] Iterate through each ID in the array.
  containerIds.forEach(id => {
    const container = document.getElementById(id);
    if (container) {
      // [Step 3] If found, clear its content completely.
      container.innerHTML = "";
    }
  });

  console.log("[UI] تم مسح الحاويات الرئيسية بنجاح.");
}

/**
 * @description Helper function handling the full logout process:
 * 1. Notify Android interface (if exists).
 * 2. Attempt to delete FCM token from server.
 * 3. Clear all browser data (localStorage, etc.).
 * 4. Redirect user to login page.
 * @async
 * @function clearAndNavigateToLogin
 * @returns {Promise<void>}
 * @throws {Error} - If `onUserLoggedOutAndroid`, `clearAllBrowserData`, `clearMainContainers`, `setUserNameInIndexBar`, `checkImpersonationMode`, or `mainLoader` fails.
 * @see onUserLoggedOutAndroid
 * @see clearAllBrowserData
 * @see clearMainContainers
 * @see setUserNameInIndexBar
 * @see checkImpersonationMode
 * @see mainLoader
 */
async function clearAndNavigateToLogin() {
  const fcmToken = localStorage.getItem("fcm_token") || localStorage.getItem("android_fcm_key");

  // 1. Notify Android interface (if exists)
  if (typeof onUserLoggedOutAndroid === "function") {
    onUserLoggedOutAndroid();
  } else if (window.Android && typeof window.Android.onUserLoggedOut === "function") {
    window.Android.onUserLoggedOut(userSession?.user_key);
  }

  // 2. Attempt to delete token from server (if user and token exist)
  /*if (fcmToken && userSession?.user_key) {
    try {
      // Send delete request (optional, depends on API support)
      await fetch(`${baseURL}/api/tokens`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_key: userSession.user_key,
          token: fcmToken,
        }),
      });
      console.log("[FCM] تم إرسال طلب حذف التوكن من الخادم بنجاح.");
    } catch (error) {
      console.error(
        "[FCM] فشل إرسال طلب حذف التوكن من الخادم. الخطأ:",
        error
      );
    }
  }*/

  // 3. Clear all browser data
  console.log("[Auth] جاري مسح جميع بيانات المتصفح...");
  await clearAllBrowserData();
  clearMainContainers();
  console.log("[Auth] تم مسح بيانات المتصفح بنجاح.");
  userSession = null;
  //
  setUserNameInIndexBar();
  checkImpersonationMode();
  // [Step 1] Call `mainLoader` to load login page content into the main user container.
  console.log("[Auth] دخلنا دالة clearAndNavigateToLogin 00000000000. جاري تحميل صفحة تسجيل الدخول...");
  await mainLoader(
    "pages/login.html",
    "index-user-container",
    0,
    undefined,
    "showHomeIcon", true
  );
}


