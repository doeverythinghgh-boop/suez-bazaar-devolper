
/**
 * @function initializeEditProductForm
 * @description Initializes the product edit form by populating it with data from `productSession`.
 *   Loads existing images and sets up the form mode.
 */
async function initializeEditProductForm() {
    console.log('%c[ProductForm] تهيئة نموذج التعديل...', 'color: blue;');

    if (!productSession) {
        console.error('%c[ProductForm] لم يتم العثور على productSession!', 'color: red;');

        return;
    } else {
        console.log('%c[ProductForm] تم العثور على productSession!', 'color: green;');
    }

    const form = document.getElementById('edit-product-form');
    const images = window.productModule.images;
    images.length = 0; // Clear image array

    // Set edit mode
    form.dataset.mode = 'edit';
    form.dataset.productKey = productSession.product_key;
    console.log(`[ProductForm] تعديل المنتج: ${productSession.product_key}`);

    window.productModule.originalImageNames = []; // Reset

    // Populate text fields
    document.getElementById('product-name').value = productSession.productName || '';
    document.getElementById('product-description').value = productSession.product_description || '';
    document.getElementById('seller-message').value = productSession.user_message || '';
    document.getElementById('product-notes').value = productSession.user_note || '';
    document.getElementById('product-quantity').value = productSession.product_quantity || '';
    document.getElementById('product-price').value = productSession.product_price || '';
    document.getElementById('original-price').value = productSession.original_price || '';
    document.getElementById('real-price').value = productSession.realPrice || '';

    // Update character counters
    document.getElementById('product-name').dispatchEvent(new Event('input'));
    document.getElementById('product-description').dispatchEvent(new Event('input'));
    document.getElementById('seller-message').dispatchEvent(new Event('input'));
    document.getElementById('product-notes').dispatchEvent(new Event('input'));

    // Load existing images
    await window.productModule.loadExistingImages();

    console.log('%c[ProductForm] تم تهيئة نموذج التعديل بنجاح.', 'color: green;');
}

// Make functions and variables globally available
window.productModule = (function () {
    // --- Default Compression Settings ---
    /**
     * @constant {number} IMAGE_MAX_WIDTH - Max width for compressed images.
     */
    const IMAGE_MAX_WIDTH = 1600;
    /**
     * @constant {number} IMAGE_MAX_HEIGHT - Max height for compressed images.
     */
    const IMAGE_MAX_HEIGHT = 1600;
    const IMAGE_QUALITY = 0.75;
    const MAX_FILES = 6;
    const CLOUDFLARE_BASE_URL = 'https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/';

    // DOM Elements
    const fileInput = document.getElementById('file-input');
    const pickFilesBtn = document.getElementById('pick-files-btn');
    const takePhotoBtn = document.getElementById('take-photo-btn');
    const previewsEl = document.getElementById('previews');
    const uploaderEl = document.getElementById('image-uploader');
    const form = document.getElementById('edit-product-form');
    const descriptionTextarea = document.getElementById('product-description');
    const productNameInput = document.getElementById('product-name');
    const sellerMessageTextarea = document.getElementById('seller-message');
    const notesInput = document.getElementById('product-notes');
    const quantityInput = document.getElementById('product-quantity');
    const priceInput = document.getElementById('product-price');
    const originalPriceInput = document.getElementById('original-price');
    const realPriceInput = document.getElementById('real-price');
    const imagesLoadingEl = document.getElementById('images-loading');

    // --- Helper Functions ---
    /**
     * @function showError
     * @description Displays an error message below the specified element.
     * @param {HTMLElement} element - The element where the error occurred.
     * @param {string} message - The error message to display.
     */
    function showError(element, message) {
        clearError(element);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'edit-product-modal__error-message';
        errorDiv.textContent = message;
        element.parentElement.appendChild(errorDiv);
    }

    /**
     * @function clearError
     * @description Removes the error message from below the specified element.
     * @param {HTMLElement} element - The element to clear errors for.
     */
    function clearError(element) {
        const errorDiv = element.parentElement.querySelector('.edit-product-modal__error-message');
        if (errorDiv) errorDiv.remove();
    }

    /**
    * @function formatBytes
    * @description Converts bytes to a human-readable string (KB, MB, etc.).
    * @param {number} bytes - Size in bytes.
    * @param {number} decimals - Number of decimal places.
    * @returns {string} Formatted string.
    */
    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    const images = [];
    let idCounter = 1;

    function genId() { return 'img_' + (Date.now() + idCounter++); }

    async function supportsWebP() {
        if (!self.createImageBitmap) return false;
        const blob = await fetch('data:image/webp;base64,UklGRiIAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73v/+BiOh/AAA=')
            .then(r => r.blob()).catch(() => null);
        if (!blob) return false;
        try { await createImageBitmap(blob); return true; } catch (e) { return false; }
    }
    const WEBP_SUPPORTED_PROMISE = supportsWebP();

    // --- Image Compression Function ---
    /**
     * @function compressImage
     * @description Compresses an image file.
     * @param {File} file - The image file to compress.
     * @returns {Promise<Blob>} Compressed image blob.
     */
    async function compressImage(file) {
        const imgBitmap = await createImageBitmap(file);
        let { width, height } = imgBitmap;

        const ratio = Math.min(1, IMAGE_MAX_WIDTH / width, IMAGE_MAX_HEIGHT / height);
        const newWidth = Math.round(width * ratio);
        const newHeight = Math.round(height * ratio);

        const canvas = Object.assign(document.createElement('canvas'), { width: newWidth, height: newHeight });
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, newWidth, newHeight);
        ctx.drawImage(imgBitmap, 0, 0, newWidth, newHeight);

        const webpSupported = await WEBP_SUPPORTED_PROMISE;
        const mime = webpSupported ? 'image/webp' : 'image/jpeg';

        const blob = await new Promise((res) => canvas.toBlob(res, mime, IMAGE_QUALITY));

        try { imgBitmap.close(); } catch (e) { }

        return blob;
    }

    // --- Function to create thumbnail preview and show in UI ---
    /**
     * @function createPreviewItem
     * @description Creates a visual preview element for an image and appends it to the DOM.
     * @param {Object} state - The image state object.
     * @param {string} [existingImageUrl=null] - URL for existing image (if applicable).
     */
    function createPreviewItem(state, existingImageUrl = null) {
        const wrapper = document.createElement('div');
        wrapper.className = 'edit-product-modal__preview';
        wrapper.setAttribute('data-id', state.id);

        wrapper.addEventListener('click', (e) => {
            if (e.target.closest('.edit-product-modal__preview-remove')) return;
            document.querySelectorAll('.edit-product-modal__preview--selected').forEach(p => p.classList.remove('edit-product-modal__preview--selected'));
            wrapper.classList.add('edit-product-modal__preview--selected');
        });

        const removeBtn = document.createElement('button');
        removeBtn.type = "button";
        removeBtn.className = 'edit-product-modal__preview-remove';
        removeBtn.setAttribute('title', 'Remove Image');
        removeBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        removeBtn.addEventListener('click', () => removeImage(state.id));

        const img = document.createElement('img');
        const meta = document.createElement('div');
        meta.className = 'edit-product-modal__preview-meta';
        meta.textContent = state.status === 'uploaded' ? 'الصورة الحالية' : 'جاري المعالجة...';

        wrapper.appendChild(removeBtn);
        wrapper.appendChild(img);
        wrapper.appendChild(meta);

        if (existingImageUrl) {
            img.src = existingImageUrl;
        } else {
            const reader = new FileReader();
            reader.onload = (e) => { img.src = e.target.result; };
            reader.readAsDataURL(state.file);
        }

        previewsEl.appendChild(wrapper);
        state._el = wrapper;
        state._metaEl = meta;
    }

    // --- Function to load existing images ---
    /**
     * @function loadExistingImages
     * @description Loads existing product images from the server / cloud storage.
     */
    async function loadExistingImages() {
        if (!productSession || !productSession.ImageName) {
            imagesLoadingEl.style.display = 'none';
            return;
        }

        const imageNames = productSession.ImageName.split(',').filter(name => name.trim());
        window.productModule.originalImageNames = [...imageNames];

        console.log(`[ProductForm] تحميل ${imageNames.length} صور موجودة`);

        for (let i = 0; i < imageNames.length; i++) {
            const name = imageNames[i].trim();
            if (!name) continue;

            const id = genId();
            const imageUrl = CLOUDFLARE_BASE_URL + name;

            const state = {
                id: id,
                file: null,
                compressedBlob: null,
                status: 'uploaded',
                fileName: name,
                isExisting: true
            };

            images.push(state);

            // Load image for display
            const img = new Image();
            img.onload = () => {
                createPreviewItem(state, imageUrl);
                if (i === imageNames.length - 1) {
                    imagesLoadingEl.style.display = 'none';
                }
            };
            img.onerror = () => {
                console.error(`فشل تحميل الصورة: ${name}`);
                state.status = 'error';
                createPreviewItem(state, '');
                state._metaEl.textContent = 'فشل التحميل';
                if (i === imageNames.length - 1) {
                    imagesLoadingEl.style.display = 'none';
                }
            };
            img.src = imageUrl;
        }

        if (imageNames.length === 0) {
            imagesLoadingEl.style.display = 'none';
        }
    }

    // --- Remove Image Function ---
    /**
     * @function removeImage
     * @description Removes an image from the list and DOM.
     * @param {string} id - The ID of the image to remove.
     */
    function removeImage(id) {
        console.log(`[ImageUploader] محاولة حذف الصورة بالمعرف: ${id}`);
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
                const idx = images.findIndex(i => i.id === id);
                if (idx > -1) {
                    const state = images[idx];
                    if (state._el) state._el.remove();
                    console.log(`[ImageUploader] تمت إزالة الصورة ${id} من العرض.`);
                    images.splice(idx, 1);
                }
            }
        });
    }


    // --- Handle New Files ---
    /**
     * @function handleNewFiles
     * @description Processes newly selected files for upload.
     * @param {FileList|Array<File>} fileList - List of files.
     */
    async function handleNewFiles(fileList) {
        console.log(`[ImageUploader] معالجة ${fileList.length} ملفات جديدة.`);
        clearError(uploaderEl);

        const filesArr = Array.from(fileList).slice(0, MAX_FILES - images.length);
        for (const file of filesArr) {
            if (!file.type.startsWith('image/')) continue;
            const id = genId();
            const state = { id, file, compressedBlob: null, status: 'pending', isExisting: false };
            images.push(state);
            createPreviewItem(state);

            try {
                console.log(`[ImageUploader] ضغط الصورة: ${file.name}`);
                state.status = 'compressing';
                const compressed = await compressImage(file);
                state.compressedBlob = compressed;
                state.status = 'ready';
                console.log(`%c[ImageUploader] تم ضغط الصورة بنجاح: ${file.name} -> ${formatBytes(compressed.size)}`, 'color: green;');
                if (state._metaEl) {
                    state._metaEl.textContent = formatBytes(compressed.size);
                }
            } catch (err) {
                console.error('%c[ImageUploader] خطأ في ضغط الصورة:', 'color: red;', err);
                state.status = 'error';
                if (state._metaEl) {
                    state._metaEl.textContent = 'خطأ';
                }
            }
        }
        fileInput.value = '';
    }

    // --- UI Events ---
    pickFilesBtn.addEventListener('click', () => {
        fileInput.removeAttribute('capture');
        fileInput.click();
    });


    // Character Counters
    productNameInput.addEventListener('input', () => {
        const currentLength = productNameInput.value.length;
        const maxLength = productNameInput.maxLength;
        document.getElementById('product-name-char-counter').textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) clearError(productNameInput);
    });

    descriptionTextarea.addEventListener('input', () => {
        const currentLength = descriptionTextarea.value.length;
        const maxLength = descriptionTextarea.maxLength;
        document.getElementById('description-char-counter').textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) clearError(descriptionTextarea);
    });

    sellerMessageTextarea.addEventListener('input', () => {
        const currentLength = sellerMessageTextarea.value.length;
        const maxLength = sellerMessageTextarea.maxLength;
        document.getElementById('seller-message-char-counter').textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) clearError(sellerMessageTextarea);
    });

    notesInput.addEventListener('input', () => {
        const currentLength = notesInput.value.length;
        const maxLength = notesInput.maxLength;
        document.getElementById('notes-char-counter').textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) clearError(notesInput);
    });

    // Numeric field validation
    quantityInput.addEventListener('input', () => {
        let value = normalizeDigits(quantityInput.value);
        quantityInput.value = value.replace(/[^0-9]/g, '');
        if (quantityInput.value) clearError(quantityInput);
    });

    priceInput.addEventListener('input', () => {
        let value = normalizeDigits(priceInput.value);
        value = value.replace(/[^0-9.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        priceInput.value = value;
        if (priceInput.value) clearError(priceInput);
    });

    originalPriceInput.addEventListener('input', () => {
        let value = normalizeDigits(originalPriceInput.value);
        value = value.replace(/[^0-9.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        originalPriceInput.value = value;
    });

    realPriceInput.addEventListener('input', () => {
        let value = normalizeDigits(realPriceInput.value);
        value = value.replace(/[^0-9.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        realPriceInput.value = value;
    });

    // Camera
    takePhotoBtn.addEventListener('click', () => {
        const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
        if (isMobile) {
            console.log('[Camera] Mobile device detected. Using capture attribute.');
            fileInput.setAttribute('capture', 'environment');
            fileInput.click();
        } else {
            console.log('[Camera] Desktop device detected. Using getUserMedia API.');
            openDesktopCamera();
        }
    });

    // --- Desktop Camera Function ---
    /**
     * @function openDesktopCamera
     * @description Opens a modal to capture a photo using the desktop webcam.
     */
    async function openDesktopCamera() {
        const cameraModalContainer = document.getElementById('camera-modal-container');
        if (!cameraModalContainer) {
            console.error('Camera modal container not found!');
            return;
        }

        cameraModalContainer.innerHTML = `
                    <div class="modal-content camera-modal-content">
                        <button class="close-button" id="camera-modal-close-btn" aria-label="Close"><i class="fas fa-times"></i></button>
                        <video id="camera-preview" autoplay playsinline></video>
                        <canvas id="camera-canvas" style="display:none;"></canvas>
                        <div class="camera-controls">
                            <button id="capture-photo-btn" class="btn btn-warning"><i class="fas fa-camera"></i> Capture Photo</button>
                        </div>
                    </div>
                `;
        cameraModalContainer.style.display = 'flex';

        const video = document.getElementById('camera-preview');
        const captureBtn = document.getElementById('capture-photo-btn');
        const closeBtn = document.getElementById('camera-modal-close-btn');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = stream;

            const closeStream = () => {
                stream.getTracks().forEach(track => track.stop());
                cameraModalContainer.style.display = 'none';
                cameraModalContainer.innerHTML = '';
            };

            closeBtn.onclick = closeStream;

            captureBtn.onclick = () => {
                const canvas = document.getElementById('camera-canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);
                canvas.toBlob(blob => {
                    handleNewFiles([blob]);
                    closeStream();
                }, 'image/jpeg', 0.9);
            };
        } catch (err) {
            console.error("Error accessing camera: ", err);

            cameraModalContainer.style.display = 'none';
        }
    }

    fileInput.addEventListener('change', (e) => handleNewFiles(e.target.files));

    // Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('%c[ProductForm] Submit event triggered for editing.', 'color: blue;');
        let isValid = true;

        // --- Validation ---
        console.log('[ProductForm] Starting validation...');

        // 1. Check for at least one image
        clearError(uploaderEl);
        if (images.length === 0) {
            showError(uploaderEl, 'مطلوب صورة واحدة للمنتج على الأقل.');
            isValid = false;
        }

        // 2. Check Product Name
        clearError(productNameInput);
        if (!productNameInput.value.trim()) {
            showError(productNameInput, 'اسم المنتج مطلوب.');
            isValid = false;
        }

        // 3. Check Description
        clearError(descriptionTextarea);
        if (!descriptionTextarea.value.trim() || descriptionTextarea.value.trim().length < 10) {
            showError(descriptionTextarea, 'وصف المنتج مطلوب (على الأقل 10 أحرف).');
            isValid = false;
        }

        // 4. Check Seller Message
        clearError(sellerMessageTextarea);
        if (!sellerMessageTextarea.value.trim() || sellerMessageTextarea.value.trim().length < 10) {
            showError(sellerMessageTextarea, 'رسالة البائع مطلوبة (على الأقل 10 أحرف).');
            isValid = false;
        }

        // 5. Check Quantity
        clearError(quantityInput);
        if (!quantityInput.value || parseFloat(quantityInput.value) < 1) {
            showError(quantityInput, 'يرجى إدخال كمية متاحة صالحة (على الأقل 1).');
            isValid = false;
        }

        // 6. Check Price
        clearError(priceInput);
        if (priceInput.value === '' || parseFloat(priceInput.value) < 0) {
            showError(priceInput, 'يرجى إدخال سعر منتج صالح.');
            isValid = false;
        }

        if (!isValid) {
            console.warn('[ProductForm] Validation failed. Submission aborted.');
            return;
        }

        console.log('%c[ProductForm] التحقق نجح. بدء عملية التحديث.', 'color: green;');
        Swal.fire({
            title: 'جاري تحديث المنتج...',
            text: 'يرجى الانتظار بينما يتم حفظ التغييرات.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        try {
            const productKey = form.dataset.productKey;
            const originalImageNames = window.productModule.originalImageNames || [];

            // 1. Identify Existing vs New Images
            // Existing images have isExisting: true
            const existingImages = images.filter(state => state.isExisting === true);

            // New images have status: 'ready' (and isExisting: false)
            const newImages = images.filter(state => state.status === 'ready' && state.isExisting === false);

            // Names of remaining existing images
            const remainingExistingImageNames = existingImages
                .map(state => state.fileName)
                .filter(Boolean);

            // Identify deleted images (present in original but not in remaining)
            const imagesToDelete = originalImageNames.filter(name => !remainingExistingImageNames.includes(name));

            // 2. Upload New Images
            const uploadedImageUrls = [];
            console.log(`[ProductForm] Uploading ${newImages.length} new images...`);

            for (let i = 0; i < newImages.length; i++) {
                const state = newImages[i];
                if (state.status !== 'ready' || !state.compressedBlob) continue;

                const fileName = `${Date.now()}_${i + 1}_${productKey}.webp`;
                console.log(`[ProductForm] Uploading new image as: ${fileName}`);

                try {
                    const result = await uploadFile2cf(state.compressedBlob, fileName, (msg) => console.log('[CloudflareUpload]', msg));
                    console.log(`[ProductForm] New image uploaded successfully: ${result.file}`);
                    uploadedImageUrls.push(result.file);
                } catch (uploadError) {
                    console.error('[ProductForm] Failed to upload new image:', uploadError);
                    throw new Error(`Failed to upload new image: ${uploadError.message}`);
                }
            }

            // 3. Assemble Final Content
            const allImageNames = [...remainingExistingImageNames, ...uploadedImageUrls];

            console.log('[ProductForm] Assembling final product data for update.');
            console.log('[ProductForm] Remaining existing images:', remainingExistingImageNames);
            console.log('[ProductForm] New images:', uploadedImageUrls);
            console.log('[ProductForm] Images to delete:', imagesToDelete);
            console.log('[ProductForm] All image names:', allImageNames);

            mainCategorySelectToAdd = productSession.MainCategory;
            subCategorySelectToAdd = productSession.SubCategory;
            // Set productTypeToAdd silently to avoid reloading the page before data capture
            productTypeToAdd = (mainCategorySelectToAdd == 6) ? 2 : 0;

            // 4. Assemble Product Data
            const productData = {
                productName: normalizeArabicText(document.getElementById('product-name').value.trim()),
                user_key: productSession.user_key,
                product_key: productKey,
                product_description: normalizeArabicText(document.getElementById('product-description').value.trim()),
                product_price: parseFloat(document.getElementById('product-price').value) || 0,
                product_quantity: parseInt(document.getElementById('product-quantity').value, 10) || 0,
                original_price: parseFloat(document.getElementById('original-price').value) || null,
                realPrice: parseFloat(document.getElementById('real-price').value) || null,
                user_message: normalizeArabicText(document.getElementById('seller-message').value.trim()),
                user_note: normalizeArabicText(document.getElementById('product-notes').value.trim()),
                ImageName: allImageNames.join(','),
                MainCategory: productSession.MainCategory || 2,
                SubCategory: productSession.SubCategory || 3,
                ImageIndex: allImageNames.length,
                serviceType: productTypeToAdd,
                is_approved: 0 // Reset approval status to pending on edit
            };

            // 5. Check if any data has actually changed
            console.log('[ProductForm] Comparing current data with original session data...');
            const hasDataChanged =
                productData.productName !== (productSession.productName || '') ||
                productData.product_description !== (productSession.product_description || '') ||
                productData.product_price !== (productSession.product_price || 0) ||
                productData.product_quantity !== (productSession.product_quantity || 0) ||
                productData.original_price !== (productSession.original_price || null) ||
                productData.realPrice !== (productSession.realPrice || null) ||
                productData.user_message !== (productSession.user_message || '') ||
                productData.user_note !== (productSession.user_note || '') ||
                productData.ImageName !== (productSession.ImageName || '');

            if (!hasDataChanged) {
                console.warn('[ProductForm] No changes detected.');
                Swal.fire({
                    title: 'تنبيه',
                    text: 'لم يتم إجراء أي تعديلات على بيانات المنتج.',
                    icon: 'info'
                });
                return;
            }

            console.log('[ProductForm] Changes detected. Sending UPDATE request to backend.');

            // 6. Send Update Request
            const dbResult = await updateProduct(productData);

            if (dbResult && dbResult.error) {
                throw new Error(`Failed to update product data: ${dbResult.error}`);
            }

            // 7. Notify Admin
            console.log('[ProductForm] Notifying admin on item update...');
            if (typeof notifyAdminOnItemUpdate === 'function') {
                await notifyAdminOnItemUpdate(productData);
            }

            // 8. Delete Removed Images (After successful update)
            if (imagesToDelete.length > 0) {
                console.log("[ProductForm] Deleting removed images from cloud storage:", imagesToDelete);

                // Delete images in parallel with error handling
                const deletePromises = imagesToDelete.map(name =>
                    deleteFile2cf(name, (msg) => console.log('[CloudflareDelete]', msg))
                        .catch(err => {
                            console.error(`Failed to delete file ${name}:`, err);
                            // Don't stop process if one deletion fails
                            return null;
                        })
                );

                await Promise.all(deletePromises);
                console.log('[ProductForm] Deletion process completed.');
            }

            console.log('%c[ProductForm] Product updated successfully.', 'color: green; font-weight: bold;');

            // 7. Show Success Message
            Swal.fire({
                title: 'تم بنجاح!',
                text: 'تم تحديث المنتج بنجاح.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('%c[ProductForm] Update failed with critical error:', 'color: red; font-weight: bold;', error);
            Swal.fire({
                title: 'خطأ!',
                text: `فشل تحديث المنتج: ${error.message}`,
                icon: 'error'
            });
        }
    });

    // إرجاع الدوال والمتغيرات
    return {
        images,
        originalImageNames: [],
        genId,
        createPreviewItem,
        loadExistingImages
    };

})();

// تهيئة النموذج عند تحميل الصفحة
initializeEditProductForm();
