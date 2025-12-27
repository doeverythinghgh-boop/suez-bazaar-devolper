/**
 * @file pages/productEdit/js/edit_init.js
 * @description Initializes the product edit form, populates data, and triggers image loading.
 */

/**
 * @function initializeEditProductForm
 * @description Initializes the product edit form by populating it with data from `ProductStateManager`.
 */
async function initializeEditProductForm() {
    console.log('%c[ProductEdit] تهيئة نموذج التعديل...', 'color: blue;');

    const dom = EDIT_getDomElements();
    const currentProduct = (typeof ProductStateManager !== 'undefined') ? ProductStateManager.getCurrentProduct() : null;

    if (!currentProduct) {
        console.error('%c[ProductEdit] لم يتم العثور على بيانات المنتج في مدير الحالة!', 'color: red;');
        return;
    }

    // Reset state
    EDIT_images = [];
    EDIT_originalImageNames = [];

    // Set edit mode data
    if (dom.form) {
        dom.form.dataset.mode = 'edit';
        dom.form.dataset.productKey = currentProduct.product_key;
    }

    console.log(`[ProductEdit] تعديل المنتج: ${currentProduct.product_key}`);

    // Attach Listeners first
    EDIT_attachEventListeners();
    EDIT_initSubmitLogic();

    // Populate text fields
    const fields = {
        'product-name': currentProduct.productName,
        'product-description': currentProduct.product_description,
        'seller-message': currentProduct.user_message,
        'product-notes': currentProduct.user_note,
        'product-quantity': currentProduct.product_quantity,
        'product-price': currentProduct.product_price,
        'original-price': currentProduct.original_price,
        'real-price': currentProduct.realPrice
    };

    for (const [id, value] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) {
            el.value = (value !== undefined && value !== null) ? value : '';
            // Trigger input event to update character counters and clear errors
            el.dispatchEvent(new Event('input'));
        }
    }

    // Initialize Heavy Load Checkbox
    if (dom.heavyLoadCheckbox) {
        dom.heavyLoadCheckbox.checked = (currentProduct.heavyLoad == 1);
    }

    // Load existing images
    await EDIT_loadExistingImages();

    console.log('%c[ProductEdit] تم تهيئة نموذج التعديل بنجاح.', 'color: green;');
}

// Global exposure
window.initializeEditProductForm = initializeEditProductForm;

/**
 * Auto-initialize mechanism for both direct script execution (SPA)
 * and full page loads.
 */
(function () {
    const runInit = () => {
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
