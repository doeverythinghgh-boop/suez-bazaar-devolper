/**
 * @file pages/productEdit/js/edit_image.js
 * @description Logic for image compression, loading, and WebP support for Product Edit.
 */

async function EDIT_supportsWebP() {
    if (!self.createImageBitmap) return false;
    const blob = await fetch('data:image/webp;base64,UklGRiIAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73v/+BiOh/AAA=')
        .then(r => r.blob()).catch(() => null);
    if (!blob) return false;
    try { await createImageBitmap(blob); return true; } catch (e) { return false; }
}
var EDIT_WEBP_SUPPORTED_PROMISE = EDIT_supportsWebP();

/**
 * @function EDIT_compressImage
 * @description Compresses an image file.
 * @param {File} file - The image file to compress.
 * @returns {Promise<Blob>} Compressed image blob.
 */
async function EDIT_compressImage(file) {
    let imgBitmap = null;
    try {
        imgBitmap = await createImageBitmap(file);
        let { width, height } = imgBitmap;

        const ratio = Math.min(1, EDIT_IMAGE_MAX_WIDTH / width, EDIT_IMAGE_MAX_HEIGHT / height);
        const newWidth = Math.round(width * ratio);
        const newHeight = Math.round(height * ratio);

        const canvas = Object.assign(document.createElement('canvas'), { width: newWidth, height: newHeight });
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, newWidth, newHeight);
        ctx.drawImage(imgBitmap, 0, 0, newWidth, newHeight);

        const webpSupported = await EDIT_WEBP_SUPPORTED_PROMISE;
        const mime = webpSupported ? 'image/webp' : 'image/jpeg';

        const blob = await new Promise((res) => canvas.toBlob(res, mime, EDIT_IMAGE_QUALITY));
        return blob;
    } finally {
        if (imgBitmap) {
            try { imgBitmap.close(); } catch (e) { }
        }
    }
}

/**
 * @function EDIT_loadExistingImages
 * @description Loads existing product images from the server / cloud storage.
 */
async function EDIT_loadExistingImages() {
    const dom = EDIT_getDomElements();
    const imagesLoadingEl = dom.imagesLoading;
    const currentProduct = (typeof ProductStateManager !== 'undefined') ? ProductStateManager.getCurrentProduct() : null;

    if (!currentProduct || !currentProduct.ImageName) {
        if (imagesLoadingEl) imagesLoadingEl.style.display = 'none';
        return;
    }

    const imageNames = currentProduct.ImageName.split(',').filter(name => name.trim());
    EDIT_originalImageNames = [...imageNames];

    console.log(`[ProductEdit] تحميل ${imageNames.length} صور موجودة`);

    for (let i = 0; i < imageNames.length; i++) {
        const name = imageNames[i].trim();
        if (!name) continue;

        const id = EDIT_genId();
        const imageUrl = EDIT_CLOUDFLARE_BASE_URL + name;

        const state = {
            id: id,
            file: null,
            compressedBlob: null,
            status: 'uploaded',
            fileName: name,
            isExisting: true
        };

        EDIT_images.push(state);

        // Load image for display
        const img = new Image();
        img.onload = () => {
            EDIT_createPreviewItem(state, imageUrl);
            if (i === imageNames.length - 1 && imagesLoadingEl) {
                imagesLoadingEl.style.display = 'none';
            }
        };
        img.onerror = () => {
            console.error(`فشل تحميل الصورة: ${name}`);
            state.status = 'error';
            EDIT_createPreviewItem(state, '');
            if (state._metaEl) state._metaEl.textContent = 'فشل التحميل';
            if (i === imageNames.length - 1 && imagesLoadingEl) {
                imagesLoadingEl.style.display = 'none';
            }
        };
        img.src = imageUrl;
    }

    if (imageNames.length === 0 && imagesLoadingEl) {
        imagesLoadingEl.style.display = 'none';
    }
}

/**
 * @function EDIT_handleNewFiles
 * @description Processes newly selected files for upload.
 * @param {FileList|Array<File>} fileList - List of files.
 */
async function EDIT_handleNewFiles(fileList) {
    const uploaderEl = document.getElementById('image-uploader');
    const fileInput = document.getElementById('file-input');

    console.log(`[ImageUploader] معالجة ${fileList.length} ملفات جديدة.`);
    EDIT_clearError(uploaderEl);

    const filesArr = Array.from(fileList).slice(0, EDIT_MAX_FILES - EDIT_images.length);
    for (const file of filesArr) {
        if (!file.type.startsWith('image/')) continue;
        const id = EDIT_genId();
        const state = { id, file, compressedBlob: null, status: 'pending', isExisting: false };
        EDIT_images.push(state);
        EDIT_createPreviewItem(state);

        try {
            console.log(`[ImageUploader] ضغط الصورة: ${file.name}`);
            state.status = 'compressing';
            const compressed = await EDIT_compressImage(file);
            state.compressedBlob = compressed;
            state.status = 'ready';
            console.log(`%c[ImageUploader] تم ضغط الصورة بنجاح: ${file.name} -> ${EDIT_formatBytes(compressed.size)}`, 'color: green;');
            if (state._metaEl) {
                state._metaEl.textContent = EDIT_formatBytes(compressed.size);
            }
        } catch (err) {
            console.error('%c[ImageUploader] خطأ في ضغط الصورة:', 'color: red;', err);
            state.status = 'error';
            if (state._metaEl) {
                state._metaEl.textContent = 'خطأ';
            }
        }
    }
    if (fileInput) fileInput.value = '';
}

// Map to global for compatibility
window.productModule.loadExistingImages = EDIT_loadExistingImages;
