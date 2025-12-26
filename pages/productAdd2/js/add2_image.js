/**
 * @file pages/productAdd2/js/add2_image.js
 * @description Logic for image compression, validation, and processing for Product Add 2.
 */

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

        const add2_uploaderEl = document.getElementById('add2_image_uploader');
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

            // Call createPreviewItem if available globally
            if (typeof add2_createPreviewItem === 'function') {
                add2_createPreviewItem(state);
            }

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
