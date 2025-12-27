/**
 * @file pages/profile-modal/js/profile-helpers.js
 * @description Utility and helper functions for the profile modal UI.
 */

/**
 * Displays an error message for a specific input field.
 * @param {HTMLElement} inputElement - The input element to show an error for.
 * @param {string} message - The error message to display.
 * @param {Object} [validationState] - Optional state object to update isValid status.
 */
function profileShowError(inputElement, message, validationState) {
    try {
        const errorDiv = document.getElementById(`${inputElement.id}-error`);
        if (errorDiv) {
            errorDiv.textContent = message;
        }
        if (validationState) {
            validationState.isValid = false;
        }
    } catch (error) {
        console.error("Error in profileShowError:", error);
    }
}

/**
 * Clears all error messages currently displayed in the profile modal.
 */
function profileClearErrors() {
    try {
        document.querySelectorAll(".profile-error-message")
            .forEach((el) => {
                el.textContent = "";
            });
    } catch (error) {
        console.error("Error in profileClearErrors:", error);
    }
}

/**
 * Sets up a password visibility toggle for a specific input field and icon.
 * @param {string} inputId - ID of the password input element.
 * @param {string} toggleId - ID of the eye icon element.
 */
function profileTogglePasswordVisibility(inputId, toggleId) {
    try {
        const input = document.getElementById(inputId);
        const toggleIcon = document.getElementById(toggleId);
        if (!input || !toggleIcon) return;

        toggleIcon.addEventListener("click", () => {
            const isPassword = input.type === "password";
            input.type = isPassword ? "text" : "password";
            toggleIcon.classList.toggle("fa-eye");
            toggleIcon.classList.toggle("fa-eye-slash");
        });
    } catch (error) {
        console.error(`Error toggling password visibility for ${inputId}:`, error);
    }
}
