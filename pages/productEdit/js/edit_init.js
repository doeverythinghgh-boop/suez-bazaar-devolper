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

    const currentProduct = (typeof ProductStateManager !== 'undefined') ? ProductStateManager.getCurrentProduct() : null;

    if (!currentProduct) {
        console.error('%c[ProductEdit] لم يتم العثور على بيانات المنتج في مدير الحالة!', 'color: red;');
        return;
    }

    const form = document.getElementById('edit-product-form');
    EDIT_images = []; // Clear current session images
    EDIT_originalImageNames = []; // Reset original names

    // Set edit mode data
    if (form) {
        form.dataset.mode = 'edit';
        form.dataset.productKey = currentProduct.product_key;
    }

    console.log(`[ProductEdit] تعديل المنتج: ${currentProduct.product_key}`);

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
            el.value = value || '';
            // Trigger input event to update character counters and clear errors
            el.dispatchEvent(new Event('input'));
        }
    }

    // Initialize Heavy Load Checkbox
    if (EDIT_heavyLoadCheckbox) {
        EDIT_heavyLoadCheckbox.checked = (currentProduct.heavyLoad == 1);
    }

    // Load existing images
    await EDIT_loadExistingImages();

    console.log('%c[ProductEdit] تم تهيئة نموذج التعديل بنجاح.', 'color: green;');
}

// Global exposure for external calls if needed
window.initializeEditProductForm = initializeEditProductForm;

// Auto-initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Check if we have state to initialize
    if (typeof ProductStateManager !== 'undefined' && ProductStateManager.getCurrentProduct()) {
        initializeEditProductForm();
    }
});
