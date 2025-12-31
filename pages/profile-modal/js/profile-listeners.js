/**
 * @file pages/profile-modal/js/profile-listeners.js
 * @description Event listener setup and communication handling for the profile modal.
 */

/**
 * Initializes all event listeners for form fields, buttons, and cross-document messaging.
 */
function profileSetupListeners() {
    try {
        const els = profileGetElements();

        // Password visibility toggles
        profileTogglePasswordVisibility("profile-new-password", "profile-toggle-new-password");
        profileTogglePasswordVisibility("profile-confirm-password", "profile-toggle-confirm-password-icon");

        // Interaction listeners
        if (els.changePasswordCheckbox) {
            els.changePasswordCheckbox.addEventListener("click", profileHandleChangePasswordCheck);
        }

        if (els.sellerOptionsBtn) {
            els.sellerOptionsBtn.addEventListener("click", profileHandleSellerOptions);
        }

        if (els.saveButton) {
            els.saveButton.addEventListener("click", profileHandleSaveChanges);
        }

        if (els.deleteButton) {
            els.deleteButton.addEventListener("click", (e) => {
                e.preventDefault();
                profileHandleAccountDeletion();
            });
        }

        /**
         * Cross-document message listener for embedded map communication.
         * Handles coordinate selection and reset events.
         */
        const handleProfileMessage = (event) => {
            const mapStatus = document.getElementById("profile-map-status");
            const coordsInput = document.getElementById("profile-coords");
            const mapError = document.getElementById("profile-map-error");

            if (event.data && event.data.type === 'LOCATION_SELECTED') {
                const coords = event.data.coordinates;
                console.log("[Profile] Received coordinates from map:", coords);
                if (coordsInput) coordsInput.value = coords;

                if (mapStatus) {
                    mapStatus.style.color = "#10b981";
                    mapStatus.innerHTML = '<i class="fas fa-check-circle"></i> تم ربط الموقع بنجاح! شكراً لك.';
                }

                // Clear validation error if present
                if (mapError) mapError.style.display = "none";

            } else if (event.data && event.data.type === 'LOCATION_RESET') {
                if (coordsInput) coordsInput.value = "";
                if (mapStatus) {
                    mapStatus.innerHTML = "";
                }
            }
        };

        window.addEventListener('message', handleProfileMessage);

    } catch (error) {
        console.error("Error setting up profile listeners:", error);
    }
}
