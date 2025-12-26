/**
 * @file pages/productEdit/js/edit_utils.js
 * @description Utility functions for error handling, formatting, and ID generation for Product Edit.
 */

/**
 * @function EDIT_showError
 * @description Displays an error message below the specified element.
 * @param {HTMLElement} element - The element where the error occurred.
 * @param {string} message - The error message to display.
 */
function EDIT_showError(element, message) {
    EDIT_clearError(element);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'edit-product-modal__error-message';
    errorDiv.textContent = message;
    if (element && element.parentElement) {
        element.parentElement.appendChild(errorDiv);
    }
}

/**
 * @function EDIT_clearError
 * @description Removes the error message from below the specified element.
 * @param {HTMLElement} element - The element to clear errors for.
 */
function EDIT_clearError(element) {
    if (!element || !element.parentElement) return;
    const errorDiv = element.parentElement.querySelector('.edit-product-modal__error-message');
    if (errorDiv) errorDiv.remove();
}

/**
 * @function EDIT_formatBytes
 * @description Converts bytes to a human-readable string (KB, MB, etc.).
 * @param {number} bytes - Size in bytes.
 * @param {number} decimals - Number of decimal places.
 * @returns {string} Formatted string.
 */
function EDIT_formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * @function EDIT_genId
 * @description Generates a lightweight unique identity for image items.
 * @returns {string} Unique ID.
 */
function EDIT_genId() {
    return 'img_' + (Date.now() + EDIT_idCounter++);
}

// Map to global for compatibility
window.productModule.genId = EDIT_genId;
