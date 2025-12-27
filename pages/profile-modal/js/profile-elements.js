/**
 * @file pages/profile-modal/js/profile-elements.js
 * @description Centralized element retrieval for the profile modal.
 */

/**
 * Safely retrieves all necessary DOM elements for the profile module.
 * @returns {Object} An object containing references to the profile form elements.
 */
function profileGetElements() {
    return {
        // Input Fields
        usernameInput: document.getElementById("profile-username"),
        phoneInput: document.getElementById("profile-phone"),
        addressInput: document.getElementById("profile-address"),
        newPasswordInput: document.getElementById("profile-new-password"),
        confirmPasswordInput: document.getElementById("profile-confirm-password"),
        coordsInput: document.getElementById("profile-coords"),
        locationIframe: document.getElementById("profile-location-iframe"),

        // Controls
        changePasswordCheckbox: document.getElementById("profile-change-password-checkbox"),
        passwordFieldsContainer: document.getElementById("profile-password-fields-container"),
        saveButton: document.getElementById("profile-save-button"),
        deleteButton: document.getElementById("profile-delete-account-button"),

        // Feedback
        passwordErrorDiv: document.getElementById("profile-password-error"),
        addressError: document.getElementById("profile-address-error")
    };
}
