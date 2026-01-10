/**
 * @file pages/productEdit2/js/edit2_image.js
 * @description Logic for image compression, loading, and WebP support for Service Edit.
 */

/**
 * @function EDIT2_supportsWebP
 * @description Checks if the browser supports WebP format.
 * @returns {Promise<boolean>}
 */
async function EDIT2_supportsWebP() {
    if (!self.createImageBitmap) return false;
    const blob = await fetch('data:image/webp;base64,UklGRiIAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73v/+BiOh/AAA=')
        .then(r => r.blob()).catch(() => null);
    if (!blob) return false;
    try { await createImageBitmap(blob); return true; } catch (e) { return false; }
}
var EDIT2_WEBP_SUPPORTED_PROMISE = EDIT2_supportsWebP();

/**
 * @function EDIT2_compressImage
 * @description Compresses an image file.
 * @param {File|Blob} file - The image file to compress.
 * @returns {Promise<Blob>} Compressed image blob.
 */
async function EDIT2_compressImage(file) {
    let imgBitmap = null;
    try {
        imgBitmap = await createImageBitmap(file);
        let { width, height } = imgBitmap;

        const ratio = Math.min(1, EDIT2_IMAGE_MAX_WIDTH / width, EDIT2_IMAGE_MAX_HEIGHT / height);
        const newWidth = Math.round(width * ratio);
        const newHeight = Math.round(height * ratio);

        const canvas = Object.assign(document.createElement('canvas'), { width: newWidth, height: newHeight });
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, newWidth, newHeight);
        ctx.drawImage(imgBitmap, 0, 0, newWidth, newHeight);

        const webpSupported = await EDIT2_WEBP_SUPPORTED_PROMISE;
        const mime = webpSupported ? 'image/webp' : 'image/jpeg';

        const blob = await new Promise((res) => canvas.toBlob(res, mime, EDIT2_IMAGE_QUALITY));
        return blob;
    } finally {
        if (imgBitmap) {
            try { imgBitmap.close(); } catch (e) { }
        }
    }
}

/**
 * @function EDIT2_loadExistingImages
 * @description Loads existing service images from the cloud storage.
 */
/**
 * @function EDIT2_loadExistingImages
 * @description Loads existing service images from the cloud storage.
 */
async function EDIT2_loadExistingImages() {
    const imagesLoadingEl = document.getElementById('images-loading');
    const currentProduct = (typeof ProductStateManager !== 'undefined') ? ProductStateManager.getCurrentProduct() : null;

    // Helper to safely hide loader
    const hideLoader = () => {
        if (imagesLoadingEl) imagesLoadingEl.style.display = 'none';
    };

    if (!currentProduct || !currentProduct.ImageName) {
        hideLoader();
        return;
    }

    const imageNames = currentProduct.ImageName.split(',').filter(name => name.trim());
    EDIT2_originalImageNames = [...imageNames];

    console.log(`[ProductEdit2] تحميل ${imageNames.length} صور موجودة`);

    if (imageNames.length === 0) {
        hideLoader();
        return;
    }

    let loadedCount = 0;
    const checkCompletion = () => {
        loadedCount++;
        if (loadedCount === imageNames.length) {
            hideLoader();
        }
    };

    for (let i = 0; i < imageNames.length; i++) {
        const name = imageNames[i].trim();
        // Since we filtered, name exists.

        const id = EDIT2_genId();
        const imageUrl = EDIT2_CLOUDFLARE_BASE_URL + name;

        const state = {
            id: id,
            file: null,
            compressedBlob: null,
            status: 'uploaded',
            fileName: name,
            isExisting: true
        };

        EDIT2_images.push(state);

        // Load image for display
        const img = new Image();
        img.onload = () => {
            EDIT2_createPreviewItem(state, imageUrl);
            checkCompletion();
        };
        img.onerror = () => {
            console.error(`فشل تحميل الصورة: ${name}`);
            state.status = 'error';
            EDIT2_createPreviewItem(state, '');
            if (state._metaEl) state._metaEl.textContent = window.langu('gen_err_upload_failed');
            checkCompletion();
        };
        img.src = imageUrl;
    }
}

/**
 * @function EDIT2_handleNewFiles
 * @description Processes newly selected files for upload.
 * @param {FileList|Array<File>} fileList - List of files.
 */
async function EDIT2_handleNewFiles(fileList) {
    const uploaderEl = document.getElementById('image-uploader');
    const fileInput = document.getElementById('file-input');

    console.log(`[ImageUploader] معالجة ${fileList.length} ملفات جديدة.`);
    EDIT2_clearError(uploaderEl);

    const filesArr = Array.from(fileList).slice(0, EDIT2_MAX_FILES - EDIT2_images.length);
    for (const file of filesArr) {
        if (!file.type.startsWith('image/')) continue;
        const id = EDIT2_genId();
        const state = { id, file, compressedBlob: null, status: 'pending', isExisting: false };
        EDIT2_images.push(state);
        EDIT2_createPreviewItem(state);

        try {
            console.log(`[ImageUploader] ضغط الصورة: ${file.name}`);
            state.status = 'compressing';
            const compressed = await EDIT2_compressImage(file);
            state.compressedBlob = compressed;
            state.status = 'ready';
            console.log(`%c[ImageUploader] تم ضغط الصورة بنجاح: ${file.name} -> ${EDIT2_formatBytes(compressed.size)}`, 'color: green;');
            if (state._metaEl) {
                state._metaEl.textContent = EDIT2_formatBytes(compressed.size);
            }
        } catch (err) {
            console.error('%c[ImageUploader] خطأ في ضغط الصورة:', 'color: red;', err);
            state.status = 'error';
            if (state._metaEl) {
                state._metaEl.textContent = window.langu('gen_err_compression');
            }
        }
    }
    if (fileInput) fileInput.value = '';
}

// Map to global for compatibility
window.productModule.loadExistingImages = EDIT2_loadExistingImages;
