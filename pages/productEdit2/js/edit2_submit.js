/**
 * @file pages/productEdit2/js/edit2_submit.js
 * @description Handles form validation, image uploading, and service update process for Service Edit.
 */

var EDIT2_form = document.getElementById('edit-product-form');

if (EDIT2_form) {
    EDIT2_form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('%c[ProductEdit2] Submit event triggered for editing service.', 'color: blue;');
        let isValid = true;

        const uploaderEl = document.getElementById('image-uploader');
        const productNameInput = document.getElementById('product-name');
        const descriptionTextarea = document.getElementById('product-description');
        const sellerMessageTextarea = document.getElementById('seller-message');

        // --- Validation ---
        console.log('[ProductEdit2] Starting validation...');

        // 1. Check for images
        EDIT2_clearError(uploaderEl);
        if (EDIT2_images.length === 0) {
            EDIT2_showError(uploaderEl, window.langu('edit2_err_img_required'));
            isValid = false;
        }

        // 2. Check Service Name
        EDIT2_clearError(productNameInput);
        if (!productNameInput.value.trim()) {
            EDIT2_showError(productNameInput, window.langu('edit2_err_name_required'));
            isValid = false;
        }

        // 3. Check Description
        EDIT2_clearError(descriptionTextarea);
        if (!descriptionTextarea.value.trim() || descriptionTextarea.value.trim().length < 10) {
            EDIT2_showError(descriptionTextarea, window.langu('edit2_err_desc_required'));
            isValid = false;
        }

        // 4. Check Seller Message
        EDIT2_clearError(sellerMessageTextarea);
        if (!sellerMessageTextarea.value.trim() || sellerMessageTextarea.value.trim().length < 10) {
            EDIT2_showError(sellerMessageTextarea, window.langu('edit2_err_msg_required'));
            isValid = false;
        }

        if (!isValid) {
            console.warn('[ProductEdit2] Validation failed. Submission aborted.');
            return;
        }

        console.log('%c[ProductEdit2] التحقق نجح. بدء عملية التحديث.', 'color: green;');
        Swal.fire({
            title: window.langu('edit2_swal_updating_title'),
            text: window.langu('edit2_swal_updating_text'),
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text'
            }
        });

        try {
            const productKey = EDIT2_form.dataset.productKey;
            const originalImageNames = window.productModule.originalImageNames || [];

            // 1. Identify Existing vs New Images
            const existingImages = EDIT2_images.filter(state => state.isExisting === true);
            const newImages = EDIT2_images.filter(state => state.status === 'ready' && state.isExisting === false);
            const remainingExistingImageNames = existingImages.map(state => state.fileName).filter(Boolean);
            const imagesToDelete = originalImageNames.filter(name => !remainingExistingImageNames.includes(name));

            // 2. Upload New Images
            const uploadedImageUrls = [];
            console.log(`[ProductEdit2] Uploading ${newImages.length} new images...`);

            for (let i = 0; i < newImages.length; i++) {
                const state = newImages[i];
                if (state.status !== 'ready' || !state.compressedBlob) continue;

                const fileName = `${Date.now()}_${i + 1}_${productKey}.webp`;
                try {
                    const result = await uploadFile2cf(state.compressedBlob, fileName, (msg) => console.log('[CloudflareUpload]', msg));
                    uploadedImageUrls.push(result.file);
                } catch (uploadError) {
                    throw new Error(`Failed to upload new image: ${uploadError.message}`);
                }
            }

            // 3. Assemble Final Content
            const allImageNames = [...remainingExistingImageNames, ...uploadedImageUrls];

            // 4. Assemble Product Data (Service Type 2 for Edit2)
            const serviceTypeForUpdate = 2;
            if (typeof productTypeToAdd !== 'undefined') productTypeToAdd = 2; // Sync global if exists

            const currentProduct = (typeof ProductStateManager !== 'undefined') ? ProductStateManager.getCurrentProduct() : null;
            if (!currentProduct) throw new Error("بيانات الخدمة غير متوفرة في مدير الحالة");

            const productData = {
                productName: normalizeArabicText(productNameInput.value.trim()),
                user_key: currentProduct.user_key,
                product_key: productKey,
                product_description: normalizeArabicText(descriptionTextarea.value.trim()),
                product_price: 0,
                product_quantity: 0,
                original_price: null,
                user_message: normalizeArabicText(sellerMessageTextarea.value.trim()),
                user_note: normalizeArabicText(document.getElementById('product-notes').value.trim()),
                ImageName: allImageNames.join(','),
                MainCategory: currentProduct.MainCategory || 2,
                SubCategory: currentProduct.SubCategory || 3,
                ImageIndex: allImageNames.length,
                serviceType: serviceTypeForUpdate,
                is_approved: 0 // Reset approval status to pending on edit
            };

            // 5. Check if any data has actually changed
            const hasDataChanged =
                productData.productName !== (currentProduct.productName || '') ||
                productData.product_description !== (currentProduct.product_description || '') ||
                productData.user_message !== (currentProduct.user_message || '') ||
                productData.user_note !== (currentProduct.user_note || '') ||
                productData.ImageName !== (currentProduct.ImageName || '');

            if (!hasDataChanged) {
                Swal.fire({
                    title: window.langu('edit2_swal_no_changes_title'),
                    text: window.langu('edit2_swal_no_changes_text'),
                    showConfirmButton: true,
                    confirmButtonText: 'موافق',
                    didOpen: () => {
                        Swal.hideLoading();
                    },
                    buttonsStyling: false,
                    customClass: {
                        popup: 'swal-modern-mini-popup',
                        title: 'swal-modern-mini-title',
                        htmlContainer: 'swal-modern-mini-text',
                        confirmButton: 'swal-modern-mini-confirm'
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
                    deleteFile2cf(name).catch(() => null)
                );
                await Promise.all(deletePromises);
            }

            Swal.fire({
                title: window.langu('gen_swal_success_title'),
                text: window.langu('edit2_swal_success_text'),
                timer: 2000,
                showConfirmButton: false,
                buttonsStyling: false,
                customClass: {
                    popup: 'swal-modern-mini-popup',
                    title: 'swal-modern-mini-title',
                    htmlContainer: 'swal-modern-mini-text'
                }
            }).then(() => {
                // Redirect to My Products page
                mainLoader("pages/product2Me/product2Me.html", "index-myProducts-container", 0, undefined, "showHomeIcon", true);
            });

        } catch (error) {
            console.error('[ProductEdit2] Update failed:', error);
            Swal.fire({
                title: window.langu('gen_swal_error_title'),
                text: `${window.langu('edit2_swal_update_failed_text')} ${error.message}`,
                confirmButtonText: window.langu('alert_confirm_btn'),
                buttonsStyling: false,
                customClass: {
                    popup: 'swal-modern-mini-popup',
                    title: 'swal-modern-mini-title',
                    htmlContainer: 'swal-modern-mini-text',
                    confirmButton: 'swal-modern-mini-confirm'
                }
            });
        }
    });
}
