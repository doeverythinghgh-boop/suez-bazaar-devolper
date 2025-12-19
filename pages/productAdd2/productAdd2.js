/**
 * @file pages/productAdd2/productAdd2.js
 * @description Logic for the Product Addition 2 page. Handles image processing, 
 * compression, validation and form submission with add2_ prefixing for isolation.
 */

// ✅ Simple IIFE usage without assigning to window
console.log('%c[ProductForm] بدء تهيئة نموذج إضافة الخدمة (Add2)...', 'color: blue;');

// --- Default Compression Settings ---
var add2_IMAGE_MAX_WIDTH = 1600; // Max width after compression
var add2_IMAGE_MAX_HEIGHT = 1600; // Max height after compression
var add2_IMAGE_QUALITY = 0.75; // Compression quality 0..1
var add2_MAX_FILES = 6; // Reasonable limit of images

// DOM Elements
var add2_fileInput = document.getElementById('add2_file_input_00');
var add2_pickFilesBtn = document.getElementById('add2_pick_files_btn');
var add2_takePhotoBtn = document.getElementById('add2_take_photo_btn');
var add2_previewsEl = document.getElementById('add2_previews');
var add2_uploaderEl = document.getElementById('add2_image_uploader');
var add2_form = document.getElementById('add2_product_form');
var add2_descriptionTextarea = document.getElementById('add2_product_description');
var add2_productNameInput = document.getElementById('add2_product_name');
var add2_sellerMessageTextarea = document.getElementById('add2_seller_message');
var add2_notesInput = document.getElementById('add2_product_notes');

var add2_images = [];
var add2_idCounter = 1;

/**
 * @function add2_showError
 * @description Displays an error message below the specified element.
 * @param {HTMLElement} element - The element where the error occurred.
 * @param {string} message - The error message to display.
 */
function add2_showError(element, message) {
    try {
        add2_clearError(element); // Clear any old error first
        const errorDiv = document.createElement('div');
        errorDiv.id = element.id ? `${element.id}_error` : `add2_error_${Date.now()}`;
        errorDiv.className = 'add2_product_modal__error_message';
        errorDiv.textContent = message;
        // Insert error message immediately after the element or its container
        element.parentElement.appendChild(errorDiv);
    } catch (error) {
        console.error('[Add2] Error in add2_showError:', error);
    }
}

/**
 * @function add2_clearError
 * @description Removes the error message from below the specified element.
 * @param {HTMLElement} element - The element to clear errors for.
 */
function add2_clearError(element) {
    try {
        const errorDiv = element.parentElement.querySelector('.add2_product_modal__error_message');
        if (errorDiv) errorDiv.remove();
    } catch (error) {
        console.error('[Add2] Error in add2_clearError:', error);
    }
}

/**
 * @function add2_formatBytes
 * @description Converts bytes to a human-readable string (KB, MB, etc.).
 * @param {number} bytes - Size in bytes.
 * @param {number} decimals - Number of decimal places.
 * @returns {string} Formatted string.
 */
function add2_formatBytes(bytes, decimals = 2) {
    try {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    } catch (error) {
        console.error('[Add2] Error in add2_formatBytes:', error);
        return 'N/A';
    }
}

/**
 * @function add2_genId
 * @description Generates a lightweight unique identity for image items.
 * @returns {string} Unique ID.
 */
function add2_genId() {
    return 'add2_img_' + (Date.now() + add2_idCounter++);
}

/**
 * @function add2_supportsWebP
 * @description Checks if the browser supports WebP format.
 * @returns {Promise<boolean>}
 */
async function add2_supportsWebP() {
    try {
        if (!self.createImageBitmap) return false;
        const blob = await fetch('data:image/webp;base64,UklGRiIAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73v/+BiOh/AAA=')
            .then(r => r.blob()).catch(() => null);
        if (!blob) return false;
        try { await createImageBitmap(blob); return true; } catch (e) { return false; }
    } catch (error) {
        console.error('[Add2] Error in add2_supportsWebP:', error);
        return false;
    }
}
var add2_WEBP_SUPPORTED_PROMISE = add2_supportsWebP();

/**
 * @function add2_compressImage
 * @description Compresses an image file using Canvas and createImageBitmap.
 *   Optimized for mobile memory usage by downscaling if necessary.
 * @param {File|Blob} file - The image file to compress.
 * @returns {Promise<Blob>} - A Promise resolving to the compressed image Blob.
 * @throws {Error} If compression fails.
 */
async function add2_compressImage(file) {
    let imgBitmap = null;
    let canvas = null;
    let ctx = null;

    try {
        // Detect mobile devices to reduce resolution further for memory saving
        const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
        // Reduce resolution for mobile to avoid memory consumption
        const targetMaxWidth = isMobile ? 1280 : add2_IMAGE_MAX_WIDTH;
        const targetMaxHeight = isMobile ? 1280 : add2_IMAGE_MAX_HEIGHT;

        // Use integrated resize options to save memory
        try {
            imgBitmap = await createImageBitmap(file, {
                resizeWidth: targetMaxWidth,
                resizeHeight: targetMaxHeight,
                resizeQuality: 'high'
            });
        } catch (e) {
            console.warn('[Add2] فشل createImageBitmap مع الخيارات، العودة إلى الافتراضي:', e);
            imgBitmap = await createImageBitmap(file);
        }

        let { width, height } = imgBitmap;

        // Manual calculation if resize options failed or weren't supported
        const ratio = Math.min(1, targetMaxWidth / width, targetMaxHeight / height);
        const newWidth = Math.round(width * ratio);
        const newHeight = Math.round(height * ratio);

        // Draw to canvas
        canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx = canvas.getContext('2d');

        // Fill white background to avoid alpha channel issues
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, newWidth, newHeight);

        ctx.drawImage(imgBitmap, 0, 0, newWidth, newHeight);

        const webpSupported = await add2_WEBP_SUPPORTED_PROMISE;
        const mime = webpSupported ? 'image/webp' : 'image/jpeg';

        // Convert to blob
        const blob = await new Promise((res) => canvas.toBlob(res, mime, add2_IMAGE_QUALITY));

        return blob;

    } catch (err) {
        console.error('[Add2] فشل الضغط المحسن للذاكرة:', err);
        throw err;
    } finally {
        // Explicit and aggressive memory cleanup
        if (imgBitmap) {
            try { imgBitmap.close(); } catch (e) { }
            imgBitmap = null;
        }
        if (ctx) ctx = null;
        if (canvas) {
            canvas.width = 1; // Clear canvas buffer
            canvas.height = 1;
            canvas = null;
        }
    }
}

/**
 * @function add2_createPreviewItem
 * @description Creates a visual preview element for an image and appends it to the DOM.
 * @param {Object} state - The image state object (id, file, status, etc.).
 * @param {string} [existingImageUrl=null] - URL for existing image.
 */
function add2_createPreviewItem(state, existingImageUrl = null) {
    try {
        const wrapper = document.createElement('div');
        wrapper.id = `add2_preview_${state.id}`;
        wrapper.className = 'add2_product_modal__preview';
        wrapper.setAttribute('data-id', state.id);

        // On click, select image and show remove button
        wrapper.addEventListener('click', (e) => {
            try {
                // Do nothing if clicking remove button
                if (e.target.closest('.add2_product_modal__preview_remove')) return;

                // Deselect others
                document.querySelectorAll('.add2_product_modal__preview__selected').forEach(p => p.classList.remove('add2_product_modal__preview__selected'));
                // Select current
                wrapper.classList.add('add2_product_modal__preview__selected');
            } catch (error) {
                console.error('[Add2] Error selecting preview:', error);
            }
        });

        const removeBtn = document.createElement('button');
        removeBtn.type = "button";
        removeBtn.id = `add2_preview_remove_${state.id}`;
        removeBtn.className = 'add2_product_modal__preview_remove';
        removeBtn.setAttribute('title', 'Remove Image');
        removeBtn.innerHTML = `<i class="fas fa-trash-alt" id="add2_icon_trash_${state.id}"></i>`;
        removeBtn.addEventListener('click', () => add2_removeImage(state.id));

        const img = document.createElement('img');
        img.id = `add2_preview_img_${state.id}`;

        const meta = document.createElement('div');
        meta.id = `add2_preview_meta_${state.id}`;
        meta.className = 'add2_product_modal__preview_meta';
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

        add2_previewsEl.appendChild(wrapper);
        state._el = wrapper;
        state._metaEl = meta;
    } catch (error) {
        console.error('[Add2] Error in add2_createPreviewItem:', error);
    }
}

/**
 * @function add2_removeImage
 * @description Removes an image from the list and DOM after user confirmation.
 * @param {string} id - The ID of the image to remove.
 */
function add2_removeImage(id) {
    try {
        console.log(`[Add2] محاولة حذف الصورة بالمعرف: ${id}`);
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
                const idx = add2_images.findIndex(i => i.id === id);
                if (idx > -1) {
                    const state = add2_images[idx];
                    if (state._el) state._el.remove();
                    console.log(`[Add2] تمت إزالة الصورة ${id} من العرض.`);
                    add2_images.splice(idx, 1);
                }
            }
        });
    } catch (error) {
        console.error('[Add2] Error in add2_removeImage:', error);
    }
}

/**
 * @function add2_handleNewFiles
 * @description Processes newly selected files: validates, adds to preview, and triggers compression.
 * @param {FileList|Array<File>} fileList - The list of files to process.
 */
async function add2_handleNewFiles(fileList) {
    try {
        console.log(`[Add2] معالجة ${fileList.length} ملف (ملفات)`);

        // Prevent recursion/duplication
        if (window.isProcessingFilesAdd2) return;
        window.isProcessingFilesAdd2 = true;

        // Hide old error message
        add2_clearError(add2_uploaderEl);

        // Convert FileList to Array
        const filesArr = Array.from(fileList);

        // Check max limit
        const availableSlots = add2_MAX_FILES - add2_images.length;
        if (availableSlots <= 0) {
            Swal.fire('تحذير', `لا يمكن إضافة أكثر من ${add2_MAX_FILES} صور`, 'warning');
            window.isProcessingFilesAdd2 = false;
            return;
        }

        const filesToProcess = filesArr.slice(0, availableSlots);

        for (const file of filesToProcess) {
            if (!file.type.startsWith('image/')) {
                console.warn(`[Add2] تخطي ملف غير صورة: ${file.name}`);
                continue;
            }

            const id = add2_genId();
            const state = {
                id,
                file,
                fileName: file.name,
                compressedBlob: null,
                status: 'pending'
            };

            add2_images.push(state);
            add2_createPreviewItem(state);

            // Compress Image
            try {
                state.status = 'compressing';
                const compressed = await add2_compressImage(file);
                state.compressedBlob = compressed;
                state.status = 'ready';

                if (state._metaEl) {
                    state._metaEl.textContent = add2_formatBytes(compressed.size);
                }
            } catch (err) {
                console.error('[Add2] خطأ في الضغط:', err);
                state.status = 'error';
                if (state._metaEl) {
                    state._metaEl.textContent = 'خطأ في الضغط';
                }
            }
        }
    } catch (error) {
        console.error('[Add2] خطأ حرج في handleNewFiles:', error);
    } finally {
        window.isProcessingFilesAdd2 = false;
    }
}

// UI Events
add2_pickFilesBtn.addEventListener('click', () => {
    try {
        add2_fileInput.removeAttribute('capture');
        add2_fileInput.click();
    } catch (error) {
        console.error('[Add2] Error picking files:', error);
    }
});

// Character counter and error hiding for Product Name
add2_productNameInput.addEventListener('input', () => {
    try {
        const currentLength = add2_productNameInput.value.length;
        const maxLength = add2_productNameInput.maxLength;
        const counter = document.getElementById('add2_product_name_char_counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;

        if (currentLength > 0) add2_clearError(add2_productNameInput);
    } catch (error) {
        console.error('[Add2] Error on product name input:', error);
    }
});

// Character counter and error hiding for Description
add2_descriptionTextarea.addEventListener('input', () => {
    try {
        const currentLength = add2_descriptionTextarea.value.length;
        const maxLength = add2_descriptionTextarea.maxLength;
        const counter = document.getElementById('add2_description_char_counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;

        if (currentLength > 0) add2_clearError(add2_descriptionTextarea);
    } catch (error) {
        console.error('[Add2] Error on description input:', error);
    }
});

// Character counter and error hiding for Seller Message
add2_sellerMessageTextarea.addEventListener('input', () => {
    try {
        const currentLength = add2_sellerMessageTextarea.value.length;
        const maxLength = add2_sellerMessageTextarea.maxLength;
        const counter = document.getElementById('add2_seller_message_char_counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;

        if (currentLength > 0) add2_clearError(add2_sellerMessageTextarea);
    } catch (error) {
        console.error('[Add2] Error on seller message input:', error);
    }
});

// Character counter for Notes field
add2_notesInput.addEventListener('input', () => {
    try {
        const currentLength = add2_notesInput.value.length;
        const maxLength = add2_notesInput.maxLength;
        const counter = document.getElementById('add2_notes_char_counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;

        if (currentLength > 0) add2_clearError(add2_notesInput);
    } catch (error) {
        console.error('[Add2] Error on notes input:', error);
    }
});

// Capture photo via camera
add2_takePhotoBtn.addEventListener('click', () => {
    try {
        console.log('[Add2] Take photo button clicked');
        const tempInput = document.createElement('input');
        tempInput.type = 'file';
        tempInput.accept = 'image/*';
        tempInput.style.display = 'none';
        tempInput.setAttribute('capture', 'environment');
        document.body.appendChild(tempInput);

        tempInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files.length > 0) {
                await add2_handleNewFiles(e.target.files);
            }
            if (tempInput.parentNode) {
                tempInput.parentNode.removeChild(tempInput);
            }
        });

        tempInput.addEventListener('error', (e) => {
            console.error('[Add2] Error with camera input:', e);
            if (tempInput.parentNode) {
                tempInput.parentNode.removeChild(tempInput);
            }
            Swal.fire({
                icon: 'warning',
                title: 'مشكلة في الكاميرا',
                text: 'حاول فتح الكاميرا بطريقة أخرى',
                showCancelButton: true,
                confirmButtonText: 'اختر من المعرض',
                cancelButtonText: 'إلغاء'
            }).then((result) => {
                if (result.isConfirmed) {
                    add2_pickFilesBtn.click();
                }
            });
        });

        setTimeout(() => { tempInput.click(); }, 100);
    } catch (error) {
        console.error('[Add2] Error in camera trigger:', error);
    }
});

/**
 * @function add2_openDesktopCamera
 * @description Opens the webcam modal for desktop devices.
 */
async function add2_openDesktopCamera() {
    const cameraModalContainer = document.getElementById('add2_camera_modal_container');
    if (!cameraModalContainer) {
        console.error('[Add2] Camera modal container not found!');
        return;
    }

    try {
        cameraModalContainer.innerHTML = `
                <div class="modal-content add2_camera_modal_content" id="add2_camera_modal_content_div">
                    <button class="add2_close_button" id="add2_camera_modal_close_btn" aria-label="Close"><i class="fas fa-times" id="add2_icon_camera_close"></i></button>
                    <video id="add2_camera_preview" autoplay playsinline></video>
                    <canvas id="add2_camera_canvas" style="display:none;"></canvas>
                    <div class="add2_camera_controls" id="add2_camera_controls_div">
                        <button id="add2_capture_photo_btn" class="add2_btn add2_btn_primary"><i class="fas fa-camera" id="add2_icon_camera_capture"></i> Capture Photo</button>
                    </div>
                </div>
            `;
        cameraModalContainer.style.display = 'flex';

        const video = document.getElementById('add2_camera_preview');
        const captureBtn = document.getElementById('add2_capture_photo_btn');
        const closeBtn = document.getElementById('add2_camera_modal_close_btn');

        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;

        const closeStream = () => {
            stream.getTracks().forEach(track => track.stop());
            cameraModalContainer.style.display = 'none';
            cameraModalContainer.innerHTML = '';
        };

        closeBtn.onclick = closeStream;

        captureBtn.onclick = () => {
            const canvas = document.getElementById('add2_camera_canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            canvas.toBlob(blob => {
                const file = new File([blob], `add2_camera_${Date.now()}.jpg`, { type: "image/jpeg" });
                add2_handleNewFiles([file]);
                closeStream();
            }, 'image/jpeg', 0.9);
        };
    } catch (err) {
        console.error("[Add2] Error accessing camera: ", err);
        cameraModalContainer.style.display = 'none';
    }
}

add2_fileInput.addEventListener('change', async (e) => await add2_handleNewFiles(e.target.files));

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
