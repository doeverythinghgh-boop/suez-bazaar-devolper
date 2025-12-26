/**
 * @file pages/productAdd/js/add1_utils.js
 * @description Utility functions for logs, error handling, and formatting.
 */

console.log('%c[ProductForm] بدء تهيئة نموذج إضافة المنتج (Add1)...', 'color: blue;');

/**
 * @function add1_showError
 * @description Displays an error message below the specified element.
 * @param {HTMLElement} element - The element where the error occurred.
 * @param {string} message - The error message to display.
 */
function add1_showError(element, message) {
    try {
        add1_clearError(element); // Clear any old error first
        const errorDiv = document.createElement('div');
        errorDiv.id = element.id ? `${element.id}_error` : `add1_error_${Date.now()}`;
        errorDiv.className = 'add1_product_modal__error_message';
        errorDiv.textContent = message;
        // Insert error message immediately after the element or its container
        if (element && element.parentElement) {
            element.parentElement.appendChild(errorDiv);
        }
    } catch (error) {
        console.error('[Add1] Error in add1_showError:', error);
    }
}

/**
 * @function add1_clearError
 * @description Removes the error message from below the specified element.
 * @param {HTMLElement} element - The element to clear errors for.
 */
function add1_clearError(element) {
    try {
        if (!element || !element.parentElement) return;
        const errorDiv = element.parentElement.querySelector('.add1_product_modal__error_message');
        if (errorDiv) errorDiv.remove();
    } catch (error) {
        console.error('[Add1] Error in add1_clearError:', error);
    }
}

/**
 * @function add1_formatBytes
 * @description Converts bytes to a human-readable string (KB, MB, etc.).
 * @param {number} bytes - Size in bytes.
 * @param {number} decimals - Number of decimal places.
 * @returns {string} Formatted string.
 */
function add1_formatBytes(bytes, decimals = 2) {
    try {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    } catch (error) {
        console.error('[Add1] Error in add1_formatBytes:', error);
        return 'N/A';
    }
}

/**
 * @function add1_genId
 * @description Generates a lightweight unique identity for image items.
 * @returns {string} Unique ID.
 */
function add1_genId() {
    return 'add1_img_' + (Date.now() + add1_idCounter++);
}
