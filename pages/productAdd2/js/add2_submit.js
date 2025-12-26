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
            add2_showError(add2_uploaderEl, 'مطلوب صورة واحدة للخدمة على الأقل.');
            isValid = false;
        }

        // 2. Check Product Name
        add2_clearError(add2_productNameInput);
        if (!add2_productNameInput.value.trim()) {
            add2_showError(add2_productNameInput, 'اسم الخدمة مطلوب.');
            isValid = false;
        }

        // 3. Check Description
        add2_clearError(add2_descriptionTextarea);
        if (!add2_descriptionTextarea.value.trim() || add2_descriptionTextarea.value.trim().length < 10) {
            add2_showError(add2_descriptionTextarea, 'وصف الخدمة مطلوب (على الأقل 10 أحرف).');
            isValid = false;
        }

        // 4. Check Seller Message
        add2_clearError(add2_sellerMessageTextarea);
        if (!add2_sellerMessageTextarea.value.trim() || add2_sellerMessageTextarea.value.trim().length < 10) {
            add2_showError(add2_sellerMessageTextarea, 'رسالة مقدم الخدمة مطلوبة (على الأقل 10 أحرف).');
            isValid = false;
        }

        if (!isValid) {
            console.warn('[Add2] Validation failed. Submission aborted.');
            return;
        }

        console.log('%c[Add2] التحقق نجح. بدء عملية الإرسال.', 'color: green;');
        Swal.fire({
            title: 'جاري إضافة الخدمة...',
            text: 'يرجى الانتظار بينما يتم رفع الصور.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
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
            MainCategory: mainCategorySelectToAdd,
            SubCategory: subCategorySelectToAdd,
            ImageIndex: uploadedImageUrls.length,
            serviceType: productTypeToAdd
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
        Swal.fire('تم بنجاح!', 'تم إضافة الخدمة بنجاح.', 'success').then(() => {
            add2_form.reset();
            add2_previewsEl.innerHTML = '';
            add2_images.length = 0;

            const counters = ['add2_product_name_char_counter', 'add2_description_char_counter', 'add2_seller_message_char_counter', 'add2_notes_char_counter'];
            counters.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = (id.includes('description') ? '0 / 400' : '0 / 100');
            });
        });

    } catch (error) {
        console.error('%c[Add2] Submission failed with critical error:', 'color: red; font-weight: bold;', error);
        Swal.fire('خطأ!', 'حدث خطأ أثناء إضافة الخدمة. يرجى المحاولة مرة أخرى.', 'error');
    }
});
