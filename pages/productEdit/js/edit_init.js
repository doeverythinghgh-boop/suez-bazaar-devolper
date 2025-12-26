/**
 * @file pages/productEdit/js/edit_init.js
 * @description Initializes the product edit form, populates data, and triggers image loading.
 */

/**
 * @function initializeEditProductForm
 * @description Initializes the product edit form by populating it with data from `productSession`.
 */
async function initializeEditProductForm() {
    console.log('%c[ProductEdit] تهيئة نموذج التعديل...', 'color: blue;');

    if (!productSession) {
        console.error('%c[ProductEdit] لم يتم العثور على productSession!', 'color: red;');
        return;
    }

    const form = document.getElementById('edit-product-form');
    EDIT_images = []; // Clear current session images
    EDIT_originalImageNames = []; // Reset original names

    // Set edit mode data
    if (form) {
        form.dataset.mode = 'edit';
        form.dataset.productKey = productSession.product_key;
    }

    console.log(`[ProductEdit] تعديل المنتج: ${productSession.product_key}`);

    // Populate text fields
    const fields = {
        'product-name': productSession.productName,
        'product-description': productSession.product_description,
        'seller-message': productSession.user_message,
        'product-notes': productSession.user_note,
        'product-quantity': productSession.product_quantity,
        'product-price': productSession.product_price,
        'original-price': productSession.original_price,
        'real-price': productSession.realPrice
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
    await EDIT_loadExistingImages();

    console.log('%c[ProductEdit] تم تهيئة نموذج التعديل بنجاح.', 'color: green;');
}

// Global exposure for external calls if needed
window.initializeEditProductForm = initializeEditProductForm;

// Auto-initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure all scripts are loaded if called directly, 
    // but usually this is called by the parent window/router.
    if (typeof productSession !== 'undefined') {
        initializeEditProductForm();
    }
});
