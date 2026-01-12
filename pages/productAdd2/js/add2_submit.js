/**
 * @file pages/productAdd2/js/add2_submit.js
 * @description Handles form validation and submission process for Product Add 2.
 */

// Form Submission
add2_form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('%c[Add2] Submit event triggered.', 'color: blue;');

    try {
        let isValid = true;

        // 1. Check for at least one image
        add2_clearError(add2_uploaderEl);
        if (add2_images.length === 0) {
            add2_showError(add2_uploaderEl, window.langu('add2_err_img_required'));
            isValid = false;
        }

        // 2. Check Product Name
        add2_clearError(add2_productNameInput);
        if (!add2_productNameInput.value.trim()) {
            add2_showError(add2_productNameInput, window.langu('add2_err_name_required'));
            isValid = false;
        }

        // 3. Check Description
        add2_clearError(add2_descriptionTextarea);
        if (!add2_descriptionTextarea.value.trim() || add2_descriptionTextarea.value.trim().length < 10) {
            add2_showError(add2_descriptionTextarea, window.langu('add2_err_desc_required'));
            isValid = false;
        }

        // 4. Check Seller Message
        add2_clearError(add2_sellerMessageTextarea);
        if (!add2_sellerMessageTextarea.value.trim() || add2_sellerMessageTextarea.value.trim().length < 10) {
            add2_showError(add2_sellerMessageTextarea, window.langu('add2_err_msg_required'));
            isValid = false;
        }

        if (!isValid) {
            console.warn('[Add2] Validation failed. Submission aborted.');
            return;
        }

        console.log('%c[Add2] التحقق نجح. بدء عملية الإرسال.', 'color: green;');
        Swal.fire({
            title: window.langu('add2_swal_adding_title'),
            text: window.langu('add2_swal_uploading_text'),
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

        // Generate unique product serial
        const productSerial = generateSerial();

        const uploadedImageUrls = [];
        for (let i = 0; i < add2_images.length; i++) {
            const state = add2_images[i];
            if (state.status !== 'ready' || !state.compressedBlob) continue;

            const fileName = `${i + 1}_${productSerial}.webp`;
            const result = await uploadFile2cf(state.compressedBlob, fileName, (msg) => console.log('[Add2_Cloudflare]', msg));
            uploadedImageUrls.push(result.file);
        }

        const categories = (typeof ProductStateManager !== 'undefined') ? ProductStateManager.getSelectedCategories() : { mainId: null, subId: null };
        const serviceType = (typeof getServiceType === 'function') ? getServiceType(categories.mainId, categories.subId) : 2;

        const productData = {
            productName: normalizeArabicText(add2_productNameInput.value.trim()),
            user_key: userSession.user_key,
            product_key: productSerial,
            product_description: normalizeArabicText(add2_descriptionTextarea.value.trim()),
            product_price: 0,
            product_quantity: 0,
            original_price: null,
            user_message: normalizeArabicText(add2_sellerMessageTextarea.value.trim()),
            user_note: normalizeArabicText(add2_notesInput.value.trim()),
            ImageName: uploadedImageUrls.join(','),
            MainCategory: categories.mainId,
            SubCategory: categories.subId,
            ImageIndex: uploadedImageUrls.length,
            serviceType: serviceType
        };

        const dbResult = await addProduct(productData);

        if (dbResult && dbResult.error) {
            throw new Error(`Failed to save product data: ${dbResult.error}`);
        }

        // إشعار الإدارة بالإضافة الجديدة
        if (typeof notifyAdminOnNewItem === 'function') {
            console.log('[Dev-Add2] استدعاء دالة إخطار الإدارة...');
            await notifyAdminOnNewItem(productData);
        } else {
            console.error('[Dev-Add2] ❌ دالة notifyAdminOnNewItem غير معرفة في هذا السياق!');
        }

        console.log('%c[Add2] تم حفظ الخدمة بنجاح.', 'color: green; font-weight: bold;');
        Swal.fire({
            title: window.langu('gen_swal_success_title'),
            text: window.langu('add2_swal_success_text'),
            confirmButtonText: window.langu('alert_confirm_btn'),
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text',
                confirmButton: 'swal-modern-mini-confirm'
            }
        }).then(() => {
            add2_form.reset();
            add2_previewsEl.innerHTML = '';
            add2_images.length = 0;

            const counters = ['add2_product_name_char_counter', 'add2_description_char_counter', 'add2_seller_message_char_counter', 'add2_notes_char_counter'];
            counters.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = (id.includes('description') ? '0 / 400' : '0 / 100');
            });

            // العودة للصفحة السابقة
            if (typeof containerGoBack === 'function') {
                containerGoBack();
            }
        });

    } catch (error) {
        console.error('%c[Add2] Submission failed with critical error:', 'color: red; font-weight: bold;', error);
        Swal.fire({
            title: window.langu('gen_swal_error_title'),
            text: window.langu('add2_swal_error_text'),
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
