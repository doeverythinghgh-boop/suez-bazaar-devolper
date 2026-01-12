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
 * @throws {Error} - If `signOutAndClear` fails.
 * @see signOutAndClear
 */
async function logout() {
  // [Step 1] Show a confirmation popup to the user before logging out using SweetAlert.
  Swal.fire({
    title: window.langu("logout_confirm_title"),
    text: window.langu("logout_confirm_text"),
    showCancelButton: true,
    confirmButtonText: window.langu("logout_confirm_btn"),
    cancelButtonText: window.langu("alert_cancel_btn"),
    showLoaderOnConfirm: true,
    customClass: {
      popup: 'swal-modern-mini-popup',
      title: 'swal-modern-mini-title',
      htmlContainer: 'swal-modern-mini-text',
      confirmButton: 'swal-modern-mini-confirm',
      cancelButton: 'swal-modern-mini-cancel'
    },
    buttonsStyling: false, // تعطيل الستايل الافتراضي لاستخدام الكلاسات الخاصة بنا بالكامل
    preConfirm: async () => {
      await SessionManager.logout();
    },
    allowOutsideClick: () => !Swal.isLoading(),
  });
}

/**
 * @deprecated signOutAndClear logic has been moved to SessionManager.logout
 */
// Function removed: signOutAndClear



