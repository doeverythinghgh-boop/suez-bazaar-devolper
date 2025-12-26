/**
 * @file pages/productView2/js/view2_utils.js
 * @description Utility functions, especially for image compression.
 */

const PV2_WEBP_SUPPORTED_PROMISE = (async () => {
    const canvas = document.createElement('canvas');
    if (!!(canvas.getContext && canvas.getContext('2d'))) {
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
})();

/**
 * @function pv2_compressImage
 * @description Compresses an image file and converts it to WebP if supported.
 */
async function pv2_compressImage(file) {
    let imgBitmap;
    try {
        imgBitmap = await createImageBitmap(file);
    } catch (e) {
        console.warn("فشل ضغط الصورة، العودة للنسخة الأصلية", e);
        return file;
    }

    const width = imgBitmap.width;
    const height = imgBitmap.height;

    const ratio = Math.min(1, PV2_IMAGE_MAX_WIDTH / width, PV2_IMAGE_MAX_HEIGHT / height);
    const newWidth = Math.round(width * ratio);
    const newHeight = Math.round(height * ratio);

    const canvas = Object.assign(document.createElement('canvas'), { width: newWidth, height: newHeight });
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, newWidth, newHeight);
    ctx.drawImage(imgBitmap, 0, 0, newWidth, newHeight);

    const webpSupported = await PV2_WEBP_SUPPORTED_PROMISE;
    const mime = webpSupported ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise((res) => canvas.toBlob(res, mime, PV2_IMAGE_QUALITY));

    try { imgBitmap.close(); } catch (e) { }

    blob.name = file.name;
    blob.lastModified = file.lastModified;
    blob.isCompressed = true;
    blob.extension = webpSupported ? 'webp' : 'jpg';

    return blob;
}
