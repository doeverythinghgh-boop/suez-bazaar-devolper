/**
 * @file pages/profile-modal/js/profile-init.js
 * @description Initialization logic for the profile modal data and state.
 */

/**
 * Initializes the profile form fields with data from the current user session.
 */
function profileInitializeData() {
    try {
        const els = profileGetElements();
        const user = window.userSession;

        if (!user) return;

        if (els.usernameInput) els.usernameInput.value = user.username || "";
        if (els.phoneInput) els.phoneInput.value = user.phone || "";
        if (els.addressInput) els.addressInput.value = user.Address || user.address || "";

        // Reset password fields
        if (els.changePasswordCheckbox) els.changePasswordCheckbox.checked = false;
        if (els.passwordFieldsContainer) els.passwordFieldsContainer.style.display = "none";
        if (els.newPasswordInput) els.newPasswordInput.value = "";
        if (els.confirmPasswordInput) els.confirmPasswordInput.value = "";
        if (els.passwordErrorDiv) els.passwordErrorDiv.textContent = "";

        // Restore saved location
        let initialCoords = user.location || user.Location || user.Coordinates || user.coordinates || user.user_location || "";
        if (!initialCoords) {
            initialCoords = localStorage.getItem("saved_location") || "";
        }

        if (initialCoords && initialCoords.includes(",")) {
            if (els.coordsInput) {
                els.coordsInput.value = initialCoords;
            }

            // Update Iframe Source with coordinates and cache busting
            if (els.locationIframe) {
                const [lat, lng] = initialCoords.split(",").map(c => c.trim());
                const timestamp = new Date().getTime();
                els.locationIframe.src = `location/LOCATION.html?lat=${lat}&lng=${lng}&embedded=true&hideSave=true&v=${timestamp}`;
            }
        }
    } catch (error) {
        console.error("Error initializing profile data:", error);
    }
}
