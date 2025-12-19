/**
 * @file pages/productAdd/productAdd.js
 * @description Logic for the Product Addition Page 1. Handles image processing, 
 * compression, validation and form submission with add1_ prefixing for isolation.
 */

// ✅ Simple IIFE usage without assigning to window
console.log('%c[ProductForm] بدء تهيئة نموذج إضافة المنتج (Add1)...', 'color: blue;');

// --- Default Compression Settings ---
var add1_IMAGE_MAX_WIDTH = 1600; // Max width after compression
var add1_IMAGE_MAX_HEIGHT = 1600; // Max height after compression
var add1_IMAGE_QUALITY = 0.75; // Compression quality 0..1
var add1_MAX_FILES = 6; // Reasonable limit of images

// DOM Elements
var add1_fileInput = document.getElementById('add1_file_input_00');
var add1_pickFilesBtn = document.getElementById('add1_pick_files_btn');
var add1_takePhotoBtn = document.getElementById('add1_take_photo_btn');
var add1_previewsEl = document.getElementById('add1_previews');
var add1_uploaderEl = document.getElementById('add1_image_uploader');
var add1_form = document.getElementById('add1_product_form');
var add1_descriptionTextarea = document.getElementById('add1_product_description');
var add1_productNameInput = document.getElementById('add1_product_name');
var add1_sellerMessageTextarea = document.getElementById('add1_seller_message');
var add1_notesInput = document.getElementById('add1_product_notes');
var add1_quantityInput = document.getElementById('add1_product_quantity');
var add1_priceInput = document.getElementById('add1_product_price');
var add1_originalPriceInput = document.getElementById('add1_original_price');
var add1_btnSubmit = document.getElementById('add1_btn_submit');

var add1_images = [];
var add1_idCounter = 1;

/**
 * @function add1_showError
 * @description Displays an error message below the specified element.
 * @param {HTMLElement} element - The element where the error occurred.
 * @param {string} message - The error message to display.
 */
function add1_showError(element, message) {
    try {
        add1_clearError(element); // Clear any old error first
        const errorDiv = document.createElement('div');
        errorDiv.id = element.id ? `${element.id}_error` : `add1_error_${Date.now()}`;
        errorDiv.className = 'add1_product_modal__error_message';
        errorDiv.textContent = message;
        // Insert error message immediately after the element or its container
        element.parentElement.appendChild(errorDiv);
    } catch (error) {
        console.error('[Add1] Error in add1_showError:', error);
    }
}

/**
 * @function add1_clearError
 * @description Removes the error message from below the specified element.
 * @param {HTMLElement} element - The element to clear errors for.
 */
function add1_clearError(element) {
    try {
        const errorDiv = element.parentElement.querySelector('.add1_product_modal__error_message');
        if (errorDiv) errorDiv.remove();
    } catch (error) {
        console.error('[Add1] Error in add1_clearError:', error);
    }
}

/**
 * @function add1_formatBytes
 * @description Converts bytes to a human-readable string (KB, MB, etc.).
 * @param {number} bytes - Size in bytes.
 * @param {number} decimals - Number of decimal places.
 * @returns {string} Formatted string.
 */
function add1_formatBytes(bytes, decimals = 2) {
    try {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    } catch (error) {
        console.error('[Add1] Error in add1_formatBytes:', error);
        return 'N/A';
    }
}

/**
 * @function add1_genId
 * @description Generates a lightweight unique identity for image items.
 * @returns {string} Unique ID.
 */
function add1_genId() {
    return 'add1_img_' + (Date.now() + add1_idCounter++);
}

/**
 * @function add1_supportsWebP
 * @description Checks if the browser supports WebP format.
 * @returns {Promise<boolean>}
 */
async function add1_supportsWebP() {
    try {
        if (!self.createImageBitmap) return false;
        const blob = await fetch('data:image/webp;base64,UklGRiIAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73v/+BiOh/AAA=')
            .then(r => r.blob()).catch(() => null);
        if (!blob) return false;
        try { await createImageBitmap(blob); return true; } catch (e) { return false; }
    } catch (error) {
        console.error('[Add1] Error in add1_supportsWebP:', error);
        return false;
    }
}
var add1_WEBP_SUPPORTED_PROMISE = add1_supportsWebP();

/**
 * @function add1_compressImage
 * @description Compresses an image file using Canvas and createImageBitmap.
 *   Optimized for mobile memory usage by downscaling if necessary.
 * @param {File|Blob} file - The image file to compress.
 * @returns {Promise<Blob>} - A Promise resolving to the compressed image Blob.
 * @throws {Error} If compression fails.
 */
async function add1_compressImage(file) {
    let imgBitmap = null;
    let canvas = null;
    let ctx = null;

    try {
        const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
        const targetMaxWidth = isMobile ? 1280 : add1_IMAGE_MAX_WIDTH;
        const targetMaxHeight = isMobile ? 1280 : add1_IMAGE_MAX_HEIGHT;

        try {
            imgBitmap = await createImageBitmap(file, {
                resizeWidth: targetMaxWidth,
                resizeHeight: targetMaxHeight,
                resizeQuality: 'high'
            });
        } catch (e) {
            console.warn('[Add1] فشل createImageBitmap مع الخيارات، العودة إلى الافتراضي:', e);
            imgBitmap = await createImageBitmap(file);
        }

        let { width, height } = imgBitmap;
        const ratio = Math.min(1, targetMaxWidth / width, targetMaxHeight / height);
        const newWidth = Math.round(width * ratio);
        const newHeight = Math.round(height * ratio);

        canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, newWidth, newHeight);

        ctx.drawImage(imgBitmap, 0, 0, newWidth, newHeight);

        const webpSupported = await add1_WEBP_SUPPORTED_PROMISE;
        const mime = webpSupported ? 'image/webp' : 'image/jpeg';

        const blob = await new Promise((res) => canvas.toBlob(res, mime, add1_IMAGE_QUALITY));
        return blob;

    } catch (err) {
        console.error('[Add1] فشل الضغط المحسن للذاكرة:', err);
        throw err;
    } finally {
        if (imgBitmap) {
            try { imgBitmap.close(); } catch (e) { }
            imgBitmap = null;
        }
        if (ctx) ctx = null;
        if (canvas) {
            canvas.width = 1;
            canvas.height = 1;
            canvas = null;
        }
    }
}

/**
 * @function add1_createPreviewItem
 * @description Creates a visual preview element for an image and appends it to the DOM.
 * @param {Object} state - The image state object (id, file, status, etc.).
 * @param {string} [existingImageUrl=null] - URL for existing image.
 */
function add1_createPreviewItem(state, existingImageUrl = null) {
    try {
        const wrapper = document.createElement('div');
        wrapper.id = `add1_preview_${state.id}`;
        wrapper.className = 'add1_product_modal__preview';
        wrapper.setAttribute('data-id', state.id);

        wrapper.addEventListener('click', (e) => {
            try {
                if (e.target.closest('.add1_product_modal__preview_remove')) return;
                document.querySelectorAll('.add1_product_modal__preview__selected').forEach(p => p.classList.remove('add1_product_modal__preview__selected'));
                wrapper.classList.add('add1_product_modal__preview__selected');
            } catch (error) {
                console.error('[Add1] Error selecting preview:', error);
            }
        });

        const removeBtn = document.createElement('button');
        removeBtn.type = "button";
        removeBtn.id = `add1_preview_remove_${state.id}`;
        removeBtn.className = 'add1_product_modal__preview_remove';
        removeBtn.setAttribute('title', 'Remove Image');
        removeBtn.innerHTML = `<i class="fas fa-trash-alt" id="add1_icon_trash_${state.id}"></i>`;
        removeBtn.addEventListener('click', () => add1_removeImage(state.id));

        const img = document.createElement('img');
        img.id = `add1_preview_img_${state.id}`;

        const meta = document.createElement('div');
        meta.id = `add1_preview_meta_${state.id}`;
        meta.className = 'add1_product_modal__preview_meta';
        meta.textContent = 'جاري المعالجة...';

        wrapper.appendChild(removeBtn);
        wrapper.appendChild(img);
        wrapper.appendChild(meta);

        if (existingImageUrl) {
            img.src = existingImageUrl;
            meta.textContent = 'Current Image';
        } else {
            const reader = new FileReader();
            reader.onload = (e) => { img.src = e.target.result; };
            reader.readAsDataURL(state.file);
        }

        add1_previewsEl.appendChild(wrapper);
        state._el = wrapper;
        state._metaEl = meta;
    } catch (error) {
        console.error('[Add1] Error in add1_createPreviewItem:', error);
    }
}

/**
 * @function add1_removeImage
 * @description Removes an image from the list and DOM after user confirmation.
 * @param {string} id - The ID of the image to remove.
 */
function add1_removeImage(id) {
    try {
        console.log(`[Add1] محاولة حذف الصورة بالمعرف: ${id}`);
        Swal.fire({
            title: 'هل أنت متأكد؟',
            text: "هل تريد حقاً حذف هذه الصورة؟",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'نعم، احذفها!',
            cancelButtonText: 'إلغاء'
        }).then((result) => {
            if (result.isConfirmed) {
                const idx = add1_images.findIndex(i => i.id === id);
                if (idx > -1) {
                    const state = add1_images[idx];
                    if (state._el) state._el.remove();
                    console.log(`[Add1] تمت إزالة الصورة ${id} من العرض.`);
                    add1_images.splice(idx, 1);
                }
            }
        });
    } catch (error) {
        console.error('[Add1] Error in add1_removeImage:', error);
    }
}

/**
 * @function add1_handleNewFiles
 * @description Processes newly selected files: validates, adds to preview, and triggers compression.
 * @param {FileList|Array<File>} fileList - The list of files to process.
 */
async function add1_handleNewFiles(fileList) {
    try {
        console.log(`[Add1] معالجة ${fileList.length} ملف (ملفات)`);

        if (window.isProcessingFilesAdd1) return;
        window.isProcessingFilesAdd1 = true;

        add1_clearError(add1_uploaderEl);
        const filesArr = Array.from(fileList);

        const availableSlots = add1_MAX_FILES - add1_images.length;
        if (availableSlots <= 0) {
            Swal.fire('تحذير', `لا يمكن إضافة أكثر من ${add1_MAX_FILES} صور`, 'warning');
            window.isProcessingFilesAdd1 = false;
            return;
        }

        const filesToProcess = filesArr.slice(0, availableSlots);

        for (const file of filesToProcess) {
            if (!file.type.startsWith('image/')) {
                console.warn(`[Add1] تخطي ملف غير صورة: ${file.name}`);
                continue;
            }

            const id = add1_genId();
            const state = {
                id,
                file,
                fileName: file.name,
                compressedBlob: null,
                status: 'pending'
            };

            add1_images.push(state);
            add1_createPreviewItem(state);

            try {
                state.status = 'compressing';
                const compressed = await add1_compressImage(file);
                state.compressedBlob = compressed;
                state.status = 'ready';

                if (state._metaEl) {
                    state._metaEl.textContent = add1_formatBytes(compressed.size);
                }
            } catch (err) {
                console.error('[Add1] خطأ في الضغط:', err);
                state.status = 'error';
                if (state._metaEl) {
                    state._metaEl.textContent = 'خطأ في الضغط';
                }
            }
        }
    } catch (error) {
        console.error('[Add1] خطأ حرج في handleNewFiles:', error);
    } finally {
        window.isProcessingFilesAdd1 = false;
    }
}

// UI Events
add1_pickFilesBtn.addEventListener('click', () => {
    try {
        add1_fileInput.removeAttribute('capture');
        add1_fileInput.click();
    } catch (error) {
        console.error('[Add1] Error picking files:', error);
    }
});

// Character counter and error hiding
add1_productNameInput.addEventListener('input', () => {
    try {
        const currentLength = add1_productNameInput.value.length;
        const maxLength = add1_productNameInput.maxLength;
        const counter = document.getElementById('add1_product_name_char_counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) add1_clearError(add1_productNameInput);
    } catch (error) {
        console.error('[Add1] Error on product name input:', error);
    }
});

add1_descriptionTextarea.addEventListener('input', () => {
    try {
        const currentLength = add1_descriptionTextarea.value.length;
        const maxLength = add1_descriptionTextarea.maxLength;
        const counter = document.getElementById('add1_description_char_counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) add1_clearError(add1_descriptionTextarea);
    } catch (error) {
        console.error('[Add1] Error on description input:', error);
    }
});

add1_sellerMessageTextarea.addEventListener('input', () => {
    try {
        const currentLength = add1_sellerMessageTextarea.value.length;
        const maxLength = add1_sellerMessageTextarea.maxLength;
        const counter = document.getElementById('add1_seller_message_char_counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) add1_clearError(add1_sellerMessageTextarea);
    } catch (error) {
        console.error('[Add1] Error on seller message input:', error);
    }
});

add1_notesInput.addEventListener('input', () => {
    try {
        const currentLength = add1_notesInput.value.length;
        const maxLength = add1_notesInput.maxLength;
        const counter = document.getElementById('add1_notes_char_counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) add1_clearError(add1_notesInput);
    } catch (error) {
        console.error('[Add1] Error on notes input:', error);
    }
});

add1_quantityInput.addEventListener('input', () => {
    try {
        let value = normalizeDigits(add1_quantityInput.value);
        add1_quantityInput.value = value.replace(/[^0-9]/g, '');
        if (add1_quantityInput.value) add1_clearError(add1_quantityInput);
    } catch (error) {
        console.error('[Add1] Error on quantity input:', error);
    }
});

add1_priceInput.addEventListener('input', () => {
    try {
        let value = normalizeDigits(add1_priceInput.value);
        value = value.replace(/[^0-9.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
        add1_priceInput.value = value;
        if (add1_priceInput.value) add1_clearError(add1_priceInput);
    } catch (error) {
        console.error('[Add1] Error on price input:', error);
    }
});

add1_originalPriceInput.addEventListener('input', () => {
    try {
        let value = normalizeDigits(add1_originalPriceInput.value);
        value = value.replace(/[^0-9.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
        add1_originalPriceInput.value = value;
    } catch (error) {
        console.error('[Add1] Error on original price input:', error);
    }
});

// Capture photo via camera
add1_takePhotoBtn.addEventListener('click', () => {
    try {
        const tempInput = document.createElement('input');
        tempInput.type = 'file';
        tempInput.accept = 'image/*';
        tempInput.style.display = 'none';
        tempInput.setAttribute('capture', 'environment');
        document.body.appendChild(tempInput);

        tempInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files.length > 0) {
                await add1_handleNewFiles(e.target.files);
            }
            if (tempInput.parentNode) tempInput.parentNode.removeChild(tempInput);
        });

        setTimeout(() => { tempInput.click(); }, 100);
    } catch (error) {
        console.error('[Add1] Error in camera trigger:', error);
    }
});

add1_fileInput.addEventListener('change', async (e) => await add1_handleNewFiles(e.target.files));

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
