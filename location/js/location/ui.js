/**
 * @file ui.js
 * @description UI components and feedback mechanisms for the location application.
 * Contains loading overlays and alert dialogs.
 * 
 * @author Antigravity
 * @version 1.0.0
 */

/**
 * Show or hide the loading overlay
 * @memberof location_app
 * @param {boolean} show - Whether to show (true) or hide (false) the overlay
 * @returns {void}
 */
location_app.location_showLoading = function (show) {
    const location_loadingOverlay = document.getElementById('location_loadingOverlay');

    if (location_loadingOverlay) {
        if (show) {
            location_loadingOverlay.style.display = 'flex';
            setTimeout(() => {
                location_loadingOverlay.style.opacity = '1';
            }, 10);
        } else {
            location_loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                location_loadingOverlay.style.display = 'none';
            }, 300);
        }
    }
};

/**
 * Show a stylized alert dialog using SweetAlert2
 * @memberof location_app
 * @param {string} title - The title of the alert (in Arabic)
 * @param {string} text - The message content of the alert (in Arabic)
 * @param {string} icon - The icon type ('success', 'error', 'warning', 'info', 'question')
 * @returns {Promise} SweetAlert2 promise
 */
location_app.location_showAlert = function (title, text, icon) {
    return Swal.fire({
        title: title,
        text: text,
        icon: icon,
        confirmButtonText: window.langu('location_confirm_ok'),
        customClass: { popup: 'fullscreen-swal' }
    });
};
