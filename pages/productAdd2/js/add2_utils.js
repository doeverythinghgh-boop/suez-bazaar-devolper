/**
 * @file pages/productAdd2/js/add2_utils.js
 * @description Utility functions for logs, error handling, and formatting for Product Add 2.
 */

console.log('%c[ProductForm] بدء تهيئة نموذج إضافة الخدمة (Add2)...', 'color: blue;');

/**
 * @function add2_showError
 * @description Displays an error message below the specified element.
 * @param {HTMLElement} element - The element where the error occurred.
 * @param {string} message - The error message to display.
 */
function add2_showError(element, message) {
    try {
        add2_clearError(element); // Clear any old error first
        const errorDiv = document.createElement('div');
        errorDiv.id = element.id ? `${element.id}_error` : `add2_error_${Date.now()}`;
        errorDiv.className = 'add2_product_modal__error_message';
        errorDiv.textContent = message;
        // Insert error message immediately after the element or its container
        if (element && element.parentElement) {
            element.parentElement.appendChild(errorDiv);
        }
    } catch (error) {
        console.error('[Add2] Error in add2_showError:', error);
    }
}

/**
 * @function add2_clearError
 * @description Removes the error message from below the specified element.
 * @param {HTMLElement} element - The element to clear errors for.
 */
function add2_clearError(element) {
    try {
        if (!element || !element.parentElement) return;
        const errorDiv = element.parentElement.querySelector('.add2_product_modal__error_message');
        if (errorDiv) errorDiv.remove();
    } catch (error) {
        console.error('[Add2] Error in add2_clearError:', error);
    }
}

/**
 * @function add2_formatBytes
 * @description Converts bytes to a human-readable string (KB, MB, etc.).
 * @param {number} bytes - Size in bytes.
 * @param {number} decimals - Number of decimal places.
 * @returns {string} Formatted string.
 */
function add2_formatBytes(bytes, decimals = 2) {
    try {
        if (!+bytes) return '0 ' + window.langu('gen_unit_bytes');
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = [window.langu('gen_unit_bytes'), 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    } catch (error) {
        console.error('[Add2] Error in add2_formatBytes:', error);
        return 'N/A';
    }
}

/**
 * @function add2_genId
 * @description Generates a lightweight unique identity for image items.
 * @returns {string} Unique ID.
 */
function add2_genId() {
    return 'add2_img_' + (Date.now() + add2_idCounter++);
}
