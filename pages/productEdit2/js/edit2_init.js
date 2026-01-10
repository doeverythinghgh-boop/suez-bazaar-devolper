/**
 * @file pages/productEdit2/js/edit2_init.js
 * @description Initializes the service edit form, populates data, and triggers image loading.
 */

/**
 * @function initializeEditProductForm
 * @description Initializes the service edit form by populating it with data from `ProductStateManager`.
 */
async function initializeEditProductForm() {
    console.log('%c[ProductForm] تهيئة نموذج تعديل الخدمة...', 'color: blue;');

    const currentProduct = (typeof ProductStateManager !== 'undefined') ? ProductStateManager.getCurrentProduct() : null;

    if (!currentProduct) {
        console.error('%c[ProductForm] لم يتم العثور على بيانات الخدمة في مدير الحالة!', 'color: red;');
        return;
    } else {
        console.log('%c[ProductForm] تم العثور على بيانات الخدمة!', 'color: green;');
    }

    const form = document.getElementById('edit-product-form');
    EDIT2_images.length = 0; // Clear image array
    EDIT2_originalImageNames.length = 0; // Reset original names

    // Set edit mode data
    if (form) {
        form.dataset.mode = 'edit';
        form.dataset.productKey = currentProduct.product_key;
    }

    console.log(`[ProductForm] تعديل الخدمة: ${currentProduct.product_key}`);

    // Populate text fields
    const fields = {
        'product-name': currentProduct.productName,
        'product-description': currentProduct.product_description,
        'seller-message': currentProduct.user_message,
        'product-notes': currentProduct.user_note
    };

    for (const [id, value] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) {
            el.value = value || '';
            // Trigger input event to update character counters and clear errors
            el.dispatchEvent(new Event('input'));
        }
    }

    // Load existing images
    await EDIT2_loadExistingImages();

    // Render category badges
    if (typeof EDIT2_renderCategories === 'function') {
        await EDIT2_renderCategories();
    }

    console.log('%c[ProductForm] تم تهيئة نموذج تعديل الخدمة بنجاح.', 'color: green;');
}

// Global exposure for external calls if needed
window.initializeEditProductForm = initializeEditProductForm;

/**
 * Auto-initialize mechanism for both direct script execution (SPA)
 * and full page loads.
 */
(function () {
    var runInit = function () {
        if (typeof ProductStateManager !== 'undefined' && ProductStateManager.getCurrentProduct()) {
            initializeEditProductForm();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runInit);
    } else {
        // DOM already ready, run immediately
        runInit();
    }
})();
