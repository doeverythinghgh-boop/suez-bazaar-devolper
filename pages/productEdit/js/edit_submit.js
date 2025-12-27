/**
 * @file pages/productEdit/js/edit_submit.js
 * @description Handles form validation, image uploading, and product update process for Product Edit.
 */

var EDIT_form = document.getElementById('edit-product-form');

if (EDIT_form) {
    EDIT_form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('%c[ProductEdit] Submit event triggered for editing.', 'color: blue;');
        let isValid = true;

        const uploaderEl = document.getElementById('image-uploader');
        const productNameInput = document.getElementById('product-name');
        const descriptionTextarea = document.getElementById('product-description');
        const sellerMessageTextarea = document.getElementById('seller-message');
        const quantityInput = document.getElementById('product-quantity');
        const priceInput = document.getElementById('product-price');

        // --- Validation ---
        console.log('[ProductEdit] Starting validation...');

        // 1. Check for images
        EDIT_clearError(uploaderEl);
        if (EDIT_images.length === 0) {
            EDIT_showError(uploaderEl, 'مطلوب صورة واحدة للمنتج على الأقل.');
            isValid = false;
        }

        // 2. Check Name
        EDIT_clearError(productNameInput);
        if (!productNameInput.value.trim()) {
            EDIT_showError(productNameInput, 'اسم المنتج مطلوب.');
            isValid = false;
        }

        // 3. Check Description
        EDIT_clearError(descriptionTextarea);
        if (!descriptionTextarea.value.trim() || descriptionTextarea.value.trim().length < 10) {
            EDIT_showError(descriptionTextarea, 'وصف المنتج مطلوب (على الأقل 10 أحرف).');
            isValid = false;
        }

        // 4. Check Seller Message
        EDIT_clearError(sellerMessageTextarea);
        if (!sellerMessageTextarea.value.trim() || sellerMessageTextarea.value.trim().length < 10) {
            EDIT_showError(sellerMessageTextarea, 'رسالة البائع مطلوبة (على الأقل 10 أحرف).');
            isValid = false;
        }

        // 5. Check Quantity
        EDIT_clearError(quantityInput);
        if (!quantityInput.value || parseFloat(quantityInput.value) < 1) {
            EDIT_showError(quantityInput, 'يرجى إدخال كمية متاحة صالحة (على الأقل 1).');
            isValid = false;
        }

        // 6. Check Price
        EDIT_clearError(priceInput);
        if (priceInput.value === '' || parseFloat(priceInput.value) < 0) {
            EDIT_showError(priceInput, 'يرجى إدخال سعر منتج صالح.');
            isValid = false;
        }

        if (!isValid) {
            console.warn('[ProductEdit] Validation failed. Submission aborted.');
            return;
        }

        console.log('%c[ProductEdit] التحقق نجح. بدء عملية التحديث.', 'color: green;');
        Swal.fire({
            title: 'جاري تحديث المنتج...',
            text: 'يرجى الانتظار بينما يتم حفظ التغييرات.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        try {
            const productKey = EDIT_form.dataset.productKey;

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
                original_price: parseFloat(document.getElementById('original-price').value) || null,
                realPrice: parseFloat(document.getElementById('real-price').value) || null,
                heavyLoad: document.getElementById('heavy-load')?.checked ? 1 : 0,
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
                    title: 'تنبيه',
                    text: 'لم يتم إجراء أي تعديلات على بيانات المنتج.',
                    icon: 'info'
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
                title: 'تم بنجاح!',
                text: 'تم تحديث المنتج بنجاح.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('[ProductEdit] Update failed:', error);
            Swal.fire({
                title: 'خطأ!',
                text: `فشل تحديث المنتج: ${error.message}`,
                icon: 'error'
            });
        }
    });
}
