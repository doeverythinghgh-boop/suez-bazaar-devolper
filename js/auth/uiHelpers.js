/**
 * @file js/auth/uiHelpers.js
 * @description Centralized UI helpers for authentication interactions (Alerts, Loaders, Confirmations).
 * Using SweetAlert2.
 */

const AuthUI = {
    /**
     * @function showLoading
     * @description Shows a loading popup with a spinner.
     * @param {string} title - Title of the loading popup.
     * @param {string} text - Optional text description.
     */
    showLoading: (title, text = window.langu("auth_wait_moment")) => {
        Swal.fire({
            title: title,
            text: text,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
            customClass: { popup: 'fullscreen-swal' },
        });
    },

    /**
     * @function close
     * @description Closes any open SweetAlert popup.
     */
    close: () => {
        Swal.close();
    },

    /**
     * @function showSuccess
     * @description Shows a success message.
     * @param {string} title - Title of the message.
     * @param {string} text - Body text of the message.
     * @returns {Promise} - Resolves when the user closes the alert.
     */
    showSuccess: (title, text = "") => {
        return Swal.fire({
            icon: "success",
            title: title,
            html: text, // using html to allow rich text if needed
            confirmButtonText: window.langu("alert_confirm_btn"),
            customClass: { popup: 'fullscreen-swal' },
        });
    },

    /**
     * @function showError
     * @description Shows an error message.
     * @param {string} title - Title of the error.
     * @param {string} text - Body text of the error.
     */
    showError: (title, text) => {
        Swal.fire({
            icon: "error",
            title: title,
            text: text,
            confirmButtonText: window.langu("alert_confirm_btn"),
            customClass: { popup: 'fullscreen-swal' },
        });
    },

    /**
     * @function showFieldValidationMsg
     * @description Shows a validation error message below a specific input field.
     * @param {HTMLElement} inputElement - The input element.
     * @param {string} message - The error message.
     */
    showFieldValidationMsg: (inputElement, message) => {
        if (!inputElement) return;
        const errorDiv = document.getElementById(`${inputElement.id}-error`);
        if (errorDiv) {
            errorDiv.innerHTML = message;
            errorDiv.style.display = 'block';
        }
    },

    /**
     * @function clearFieldValidationMsg
     * @description Clears validation error message for a specific input field.
     * @param {HTMLElement} inputElement - The input element.
     */
    clearFieldValidationMsg: (inputElement) => {
        if (!inputElement) return;
        const errorDiv = document.getElementById(`${inputElement.id}-error`);
        if (errorDiv) {
            errorDiv.textContent = "";
            errorDiv.style.display = 'none';
        }
    },

    /**
     * @function confirmPassword
     * @description Shows a popup to prompt the user to enter their password for confirmation.
     * @returns {Promise<string|null>} - Resolves with the password if confirmed, or null if cancelled.
     */
    confirmPassword: async (title = window.langu("auth_confirm_identity"), text = window.langu("auth_enter_password_to_continue")) => {
        const { value: password, isConfirmed } = await Swal.fire({
            title: title,
            text: text,
            input: "password",
            inputPlaceholder: window.langu("auth_enter_password_placeholder"),
            inputAttributes: { autocapitalize: "off", autocorrect: "off" },
            customClass: { popup: 'fullscreen-swal' },
            showCancelButton: true,
            confirmButtonText: window.langu("auth_confirm_btn"),
            cancelButtonText: window.langu("alert_cancel_btn"),
            allowOutsideClick: () => !Swal.isLoading(),
        });

        if (isConfirmed && password) {
            return password;
        }
        return null;
    }
};
