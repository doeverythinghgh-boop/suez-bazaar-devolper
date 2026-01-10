/**
 * @file pages/productEdit/js/edit_submit.js
 * @description Handles form validation, image uploading, and product update process for Product Edit.
 */

/**
 * @function EDIT_initSubmitLogic
 * @description Initializes the submit event listener for the product edit form.
 */
function EDIT_initSubmitLogic() {
    const dom = EDIT_getDomElements();
    const form = dom.form;

    if (!form) {
        console.error('[ProductEdit] نموذج التعديل غير موجود عند محاولة ربط حدث الإرسال!');
        return;
    }

    // Remove existing listener if any (to prevent multiple submissions)
    form.onsubmit = async (e) => {
        e.preventDefault();
        console.log('%c[ProductEdit] Submit event triggered for editing.', 'color: blue;');
        let isValid = true;

        const uploaderEl = document.getElementById('image-uploader');
        const productNameInput = document.getElementById('product-name');
        const descriptionTextarea = document.getElementById('product-description');
        const sellerMessageTextarea = document.getElementById('seller-message');
        const quantityInput = document.getElementById('product-quantity');
        const priceInput = document.getElementById('product-price');
        const notesInput = document.getElementById('product-notes');
        const originalPriceInput = document.getElementById('original-price');
        const realPriceInput = document.getElementById('real-price');
        const heavyLoadCheckbox = document.getElementById('heavy-load');

        // --- Validation ---
        console.log('[ProductEdit] Starting validation...');

        // 1. Check for images
        EDIT_clearError(uploaderEl);
        if (EDIT_images.length === 0) {
            EDIT_showError(uploaderEl, window.langu('edit_err_img_required'));
            isValid = false;
        }

        // 2. Check Name
        EDIT_clearError(productNameInput);
        if (!productNameInput.value.trim()) {
            EDIT_showError(productNameInput, window.langu('edit_err_name_required'));
            isValid = false;
        }

        // 3. Check Description
        EDIT_clearError(descriptionTextarea);
        if (!descriptionTextarea.value.trim() || descriptionTextarea.value.trim().length < 10) {
            EDIT_showError(descriptionTextarea, window.langu('edit_err_desc_required'));
            isValid = false;
        }

        // 4. Check Seller Message
        EDIT_clearError(sellerMessageTextarea);
        if (!sellerMessageTextarea.value.trim() || sellerMessageTextarea.value.trim().length < 10) {
            EDIT_showError(sellerMessageTextarea, window.langu('edit_err_msg_required'));
            isValid = false;
        }

        // 5. Check Quantity
        EDIT_clearError(quantityInput);
        if (!quantityInput.value || parseFloat(quantityInput.value) < 1) {
            EDIT_showError(quantityInput, window.langu('edit_err_qty_required'));
            isValid = false;
        }

        // 6. Check Price
        EDIT_clearError(priceInput);
        if (priceInput.value === '' || parseFloat(priceInput.value) < 0) {
            EDIT_showError(priceInput, window.langu('edit_err_price_required'));
            isValid = false;
        }

        if (!isValid) {
            console.warn('[ProductEdit] Validation failed. Submission aborted.');
            return;
        }

        console.log('%c[ProductEdit] التحقق نجح. بدء عملية التحديث.', 'color: green;');
        Swal.fire({
            title: window.langu('edit_swal_updating_title'),
            text: window.langu('edit_swal_updating_text'),
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        try {
            const productKey = form.dataset.productKey;

            // 1. Identify Existing vs New Images
            const existingImages = EDIT_images.filter(state => state.isExisting === true);
            const newImages = EDIT_images.filter(state => state.status === 'ready' && state.isExisting === false);

            const remainingExistingImageNames = existingImages
                .map(state => state.fileName)
                .filter(Boolean);

            const imagesToDelete = EDIT_originalImageNames.filter(name => !remainingExistingImageNames.includes(name));

            // 2. Upload New Images
            const uploadedImageUrls = [];
            console.log(`[ProductEdit] Uploading ${newImages.length} new images...`);

            for (let i = 0; i < newImages.length; i++) {
                const state = newImages[i];
                if (state.status !== 'ready' || !state.compressedBlob) continue;

                const fileName = `${Date.now()}_${i + 1}_${productKey}.webp`;
                try {
                    const result = await uploadFile2cf(state.compressedBlob, fileName, (msg) => console.log('[CloudflareUpload]', msg));
                    uploadedImageUrls.push(result.file);
                } catch (uploadError) {
                    console.error('[ProductEdit] Failed to upload new image:', uploadError);
                    throw new Error(`Failed to upload new image: ${uploadError.message}`);
                }
            }

            // 3. Assemble Final Content
            const allImageNames = [...remainingExistingImageNames, ...uploadedImageUrls];

            const currentProduct = (typeof ProductStateManager !== 'undefined') ? ProductStateManager.getCurrentProduct() : null;
            if (!currentProduct) throw new Error("بيانات المنتج غير متوفرة في مدير الحالة");

            // 4. Assemble Product Data
            const productData = {
                productName: normalizeArabicText(productNameInput.value.trim()),
                user_key: currentProduct.user_key,
                product_key: productKey,
                product_description: normalizeArabicText(descriptionTextarea.value.trim()),
                product_price: parseFloat(priceInput.value) || 0,
                product_quantity: parseInt(quantityInput.value, 10) || 0,
                original_price: parseFloat(originalPriceInput?.value) || null,
                realPrice: parseFloat(realPriceInput?.value) || null,
                heavyLoad: heavyLoadCheckbox?.checked ? 1 : 0,
                user_message: normalizeArabicText(sellerMessageTextarea.value.trim()),
                user_note: normalizeArabicText(notesInput.value.trim()),
                ImageName: allImageNames.join(','),
                MainCategory: currentProduct.MainCategory || 2,
                SubCategory: currentProduct.SubCategory || 3,
                ImageIndex: allImageNames.length,
                serviceType: (currentProduct.MainCategory == 6) ? 2 : 0,
                is_approved: 0 // Reset approval status to pending on edit
            };

            // 5. Check if any data has actually changed
            const hasDataChanged =
                productData.productName !== (currentProduct.productName || '') ||
                productData.product_description !== (currentProduct.product_description || '') ||
                productData.product_price !== (currentProduct.product_price || 0) ||
                productData.product_quantity !== (currentProduct.product_quantity || 0) ||
                productData.original_price !== (currentProduct.original_price || null) ||
                productData.realPrice !== (currentProduct.realPrice || null) ||
                productData.heavyLoad !== (currentProduct.heavyLoad || 0) ||
                productData.user_message !== (currentProduct.user_message || '') ||
                productData.user_note !== (currentProduct.user_note || '') ||
                productData.ImageName !== (currentProduct.ImageName || '');

            if (!hasDataChanged) {
                Swal.fire({
                    title: window.langu('edit_swal_no_changes_title'),
                    text: window.langu('edit_swal_no_changes_text'),
                    icon: 'info',
                    showConfirmButton: true,
                    confirmButtonText: 'موافق',
                    didOpen: () => {
                        Swal.hideLoading();
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        mainLoader("pages/product2Me/product2Me.html", "index-myProducts-container", 0, undefined, "showHomeIcon", true);
                    }
                });
                return;
            }

            // 6. Send Update Request
            const dbResult = await updateProduct(productData);
            if (dbResult && dbResult.error) throw new Error(dbResult.error);

            // 7. Notify Admin
            if (typeof notifyAdminOnItemUpdate === 'function') {
                await notifyAdminOnItemUpdate(productData);
            }

            // 8. Delete Removed Images
            if (imagesToDelete.length > 0) {
                const deletePromises = imagesToDelete.map(name =>
                    deleteFile2cf(name, (msg) => console.log('[CloudflareDelete]', msg)).catch(() => null)
                );
                await Promise.all(deletePromises);
            }

            Swal.fire({
                title: window.langu('gen_swal_success_title'), // Need to add this key or reuse
                text: window.langu('edit_swal_success_text'),
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                // Redirect to My Products page
                mainLoader("pages/product2Me/product2Me.html", "index-myProducts-container", 0, undefined, "showHomeIcon", true);
            });

        } catch (error) {
            console.error('[ProductEdit] Update failed:', error);
            Swal.fire({
                title: window.langu('gen_swal_error_title'),
                text: `${window.langu('edit_swal_update_failed_text')} ${error.message}`,
                icon: 'error'
            });
        }
    };
}
