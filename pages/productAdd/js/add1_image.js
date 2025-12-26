/**
 * @file pages/productAdd/js/add1_image.js
 * @description Logic for image compression, validation, and processing.
 */

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
 * @function add1_handleNewFiles
 * @description Processes newly selected files: validates, adds to preview, and triggers compression.
 * @param {FileList|Array<File>} fileList - The list of files to process.
 */
async function add1_handleNewFiles(fileList) {
    try {
        console.log(`[Add1] معالجة ${fileList.length} ملف (ملفات)`);

        if (window.isProcessingFilesAdd1) return;
        window.isProcessingFilesAdd1 = true;

        const add1_uploaderEl = document.getElementById('add1_image_uploader');
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
            // We need to call createPreviewItem from here, but it's in UI file.
            // Since all files are loaded sequentially in HTML, we can call it if it exists globally.
            if (typeof add1_createPreviewItem === 'function') {
                add1_createPreviewItem(state);
            }

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
