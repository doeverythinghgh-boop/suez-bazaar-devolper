/**
 * @file pages/productAdd/js/add1_submit.js
 * @description Handles form validation and submission process.
 */

/**
 * @function add1_setSubmitLoading
 * @description Updates the submit button state with premium icons and text.
 * @param {boolean} isLoading - Whether the form is currently submitting.
 */
function add1_setSubmitLoading(isLoading) {
    if (!add1_btnSubmit) return;
    const submitBtnText = add1_btnSubmit.querySelector('span');
    const submitBtnIcon = add1_btnSubmit.querySelector('i');

    if (isLoading) {
        add1_btnSubmit.disabled = true;
        if (submitBtnText) submitBtnText.textContent = "جاري الحفظ والرفع...";
        if (submitBtnIcon) submitBtnIcon.className = "fas fa-spinner fa-spin";
        add1_btnSubmit.style.opacity = "0.7";
    } else {
        add1_btnSubmit.disabled = false;
        if (submitBtnText) submitBtnText.textContent = "حفظ ونشر المنتج الآن";
        if (submitBtnIcon) submitBtnIcon.className = "fas fa-arrow-left";
        add1_btnSubmit.style.opacity = "1";
    }
}

// Form Submission
add1_form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('%c[Add1] Submit event triggered.', 'color: blue;');

    try {
        let isValid = true;

        add1_clearError(add1_uploaderEl);
        if (add1_images.length === 0) {
            add1_showError(add1_uploaderEl, 'مطلوب صورة واحدة للمنتج على الأقل.');
            isValid = false;
        }

        add1_clearError(add1_productNameInput);
        if (!add1_productNameInput.value.trim()) {
            add1_showError(add1_productNameInput, 'اسم المنتج مطلوب.');
            isValid = false;
        }

        add1_clearError(add1_descriptionTextarea);
        if (!add1_descriptionTextarea.value.trim() || add1_descriptionTextarea.value.trim().length < 10) {
            add1_showError(add1_descriptionTextarea, 'وصف المنتج مطلوب (على الأقل 10 أحرف).');
            isValid = false;
        }

        add1_clearError(add1_sellerMessageTextarea);
        if (!add1_sellerMessageTextarea.value.trim() || add1_sellerMessageTextarea.value.trim().length < 10) {
            add1_showError(add1_sellerMessageTextarea, 'رسالة البائع مطلوبة (على الأقل 10 أحرف).');
            isValid = false;
        }

        add1_clearError(add1_quantityInput);
        if (!add1_quantityInput.value || parseFloat(add1_quantityInput.value) < 1) {
            add1_showError(add1_quantityInput, 'يرجى إدخال كمية متاحة صالحة (على الأقل 1).');
            isValid = false;
        }

        add1_clearError(add1_priceInput);
        if (add1_priceInput.value === '' || parseFloat(add1_priceInput.value) < 0) {
            add1_showError(add1_priceInput, 'يرجى إدخال سعر منتج صالح.');
            isValid = false;
        }

        if (!isValid) return;

        add1_setSubmitLoading(true);

        Swal.fire({
            title: 'جاري إضافة المنتج...',
            text: 'يرجى الانتظار بينما يتم رفع الصور.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); },
        });

        const productSerial = generateSerial();
        const uploadedImageUrls = [];
        for (let i = 0; i < add1_images.length; i++) {
            const state = add1_images[i];
            if (state.status !== 'ready' || !state.compressedBlob) continue;
            const fileName = `${i + 1}_${productSerial}.webp`;
            const result = await uploadFile2cf(state.compressedBlob, fileName, (msg) => console.log('[Add1_Cloudflare]', msg));
            uploadedImageUrls.push(result.file);
        }

        const productData = {
            productName: normalizeArabicText(add1_productNameInput.value.trim()),
            user_key: userSession.user_key,
            product_key: productSerial,
            product_description: normalizeArabicText(add1_descriptionTextarea.value.trim()),
            product_price: parseFloat(add1_priceInput.value) || 0,
            product_quantity: parseInt(add1_quantityInput.value, 10) || 0,
            original_price: parseFloat(add1_originalPriceInput.value) || null,
            realPrice: parseFloat(add1_realPriceInput.value) || null,
            user_message: normalizeArabicText(add1_sellerMessageTextarea.value.trim()),
            user_note: normalizeArabicText(add1_notesInput.value.trim()),
            ImageName: uploadedImageUrls.join(','),
            MainCategory: mainCategorySelectToAdd,
            SubCategory: subCategorySelectToAdd,
            ImageIndex: uploadedImageUrls.length,
            serviceType: productTypeToAdd
        };

        const dbResult = await addProduct(productData);
        if (dbResult && dbResult.error) throw new Error(dbResult.error);

        // إشعار الإدارة بالإضافة الجديدة
        if (typeof notifyAdminOnNewItem === 'function') {
            console.log('[Dev-Add1] استدعاء دالة إخطار الإدارة...');
            await notifyAdminOnNewItem(productData);
        } else {
            console.error('[Dev-Add1] ❌ دالة notifyAdminOnNewItem غير معرفة في هذا السياق!');
        }

        console.log('%c[Add1] تم حفظ المنتج بنجاح.', 'color: green; font-weight: bold;');
        Swal.fire('تم بنجاح!', 'تم إضافة المنتج بنجاح.', 'success').then(() => {
            add1_setSubmitLoading(false);
            add1_form.reset();
            add1_previewsEl.innerHTML = '';
            add1_images.length = 0;
            const counters = ['add1_product_name_char_counter', 'add1_description_char_counter', 'add1_seller_message_char_counter', 'add1_notes_char_counter'];
            counters.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = (id.includes('description') ? '0 / 400' : '0 / 100');
            });
        });

    } catch (error) {
        add1_setSubmitLoading(false);
        console.error('[Add1] Submission failed:', error);
        Swal.fire('خطأ!', 'حدث خطأ أثناء إضافة المنتج. يرجى المحاولة مرة أخرى.', 'error');
    }
});
