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
      await SessionManager.logout();
    },
    // [Step 3] Prevent closing the popup by clicking outside during loading.
    allowOutsideClick: () => !Swal.isLoading(),
  });
}

/**
 * @deprecated signOutAndClear logic has been moved to SessionManager.logout
 */
// Function removed: signOutAndClear



