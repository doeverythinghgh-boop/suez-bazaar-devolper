/**
 * @file pages/productEdit2/js/edit2_init.js
 * @description Initializes the service edit form, populates data, and triggers image loading.
 */

/**
 * @function initializeEditProductForm
 * @description Initializes the service edit form by populating it with data from `productSession`.
 */
async function initializeEditProductForm() {
    console.log('%c[ProductForm] تهيئة نموذج تعديل الخدمة...', 'color: blue;');

    if (!productSession) {
        console.error('%c[ProductForm] لم يتم العثور على productSession!', 'color: red;');
        return;
    } else {
        console.log('%c[ProductForm] تم العثور على productSession!', 'color: green;');
    }

    const form = document.getElementById('edit-product-form');
    EDIT2_images.length = 0; // Clear image array
    EDIT2_originalImageNames.length = 0; // Reset original names

    // Set edit mode data
    if (form) {
        form.dataset.mode = 'edit';
        form.dataset.productKey = productSession.product_key;
    }

    console.log(`[ProductForm] تعديل الخدمة: ${productSession.product_key}`);

    // Populate text fields
    const fields = {
        'product-name': productSession.productName,
        'product-description': productSession.product_description,
        'seller-message': productSession.user_message,
        'product-notes': productSession.user_note
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

    console.log('%c[ProductForm] تم تهيئة نموذج تعديل الخدمة بنجاح.', 'color: green;');
}

// Global exposure for external calls if needed
window.initializeEditProductForm = initializeEditProductForm;

// Auto-initialize on load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof productSession !== 'undefined') {
        initializeEditProductForm();
    }
});
