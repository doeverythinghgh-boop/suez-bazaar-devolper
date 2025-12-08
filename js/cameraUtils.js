/**
 * @file js/cameraUtils.js
 * @description يودل (Module) مشترك للتعامل مع الكاميرا، ضغط الصور، وحفظها مؤقتًا في LocalStorage
 * لمعالجة مشكلة إعادة تحميل الصفحة على الأجهزة المحمولة.
 */

window.CameraUtils = (function () {
    // --- إعدادات ضغط موحدة (نفس الإعدادات السابقة) ---
    const IMAGE_MAX_WIDTH = 1600;
    const IMAGE_MAX_HEIGHT = 1600;
    const IMAGE_QUALITY = 0.75;

    /**
     * يفتح الكاميرا (أو معرض الصور) ويلتقط صورة، ثم يضغطها ويحفظها، وبعدها يستدعي دالة إعادة التحميل.
     * @param {string} pageId - معرف الصفحة (مثل 'productAdd') لاستخدامه كمفتاح للحفظ.
     * @param {Function} reloadCallback - دالة إعادة التحميل (mainLoader) التي سيتم استدعاؤها بعد الحفظ.
     */
    async function openCamera(pageId, reloadCallback) {
        // إنشاء عنصر input type=file ومخفي
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        // استخدام capture="environment" لفتح الكاميرا الخلفية مباشرة
        input.setAttribute('capture', 'environment');
        input.style.display = 'none';
        document.body.appendChild(input);

        input.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];

                // عرض مؤشر تحميل بسيط
                Swal.fire({
                    title: 'جاري معالجة الصورة...',
                    text: 'يرجى الانتظار بينما يتم ضغط وحفظ الصورة.',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                try {
                    // 1. ضغط الصورة
                    const compressedBlob = await compressImage(file);

                    // 2. تحويل Blob إلى Base64 للحفظ في LocalStorage
                    const base64 = await blobToBase64(compressedBlob);

                    // 3. حفظ الصورة في LocalStorage
                    // نستخدم مفتاحًا فريدًا يعتمد على pageId
                    // يمكننا تخزين مصفوفة من الصور أو صورة واحدة. هنا سنفترض التراكم (مصفوفة).
                    saveimageToStorage(pageId, base64);

                    // 4. استدعاء دالة إعادة التحميل
                    if (typeof reloadCallback === 'function') {
                        Swal.close();
                        console.log(`[CameraUtils] Image saved for ${pageId}. Triggering reload callback.`);
                        reloadCallback();
                    }

                } catch (error) {
                    console.error('[CameraUtils] Error processing image:', error);
                    let msg = 'حدث خطأ أثناء معالجة الصورة.';
                    if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
                        msg = 'مساحة التخزين المؤقت ممتلئة. يرجى إتمام العملية الحالية أو تقليل عدد الصور.';
                    }
                    Swal.fire('خطأ', msg, 'error');
                }
            }
            // تنظيف
            document.body.removeChild(input);
        });

        // فتح الكاميرا
        input.click();
    }

    /**
     * يتحقق من وجود صور محفوظة لصفحة معينة ويعيدها كقائمة من Blobs.
     * @param {string} pageId - معرف الصفحة.
     * @param {Function} onImagesRestored - دالة تستقبل مصفوفة من Blobs (أو File objects) لإضافتها للواجهة.
     */
    async function checkForSavedImages(pageId, onImagesRestored) {
        const key = `camera_temp_${pageId}`;
        const savedData = localStorage.getItem(key);

        if (savedData) {
            try {
                const imagesBase64 = JSON.parse(savedData);
                if (Array.isArray(imagesBase64) && imagesBase64.length > 0) {
                    console.log(`[CameraUtils] Found ${imagesBase64.length} saved images for ${pageId}. Restoring...`);

                    const blobs = [];
                    for (let i = 0; i < imagesBase64.length; i++) {
                        const blob = await base64ToBlob(imagesBase64[i]);
                        // إضافة خصائص تجعلها تشبه الملف الأصلي
                        const file = new File([blob], `restored_image_${i}.jpg`, { type: 'image/jpeg' });
                        blobs.push(file);
                    }

                    // استدعاء الدالة الخاصة بالصفحة لإظهار الصور
                    if (typeof onImagesRestored === 'function') {
                        onImagesRestored(blobs);
                    }

                    // ✅ هام: مسح الصور من التخزين بعد استعادتها لتجنب التكرار وتوفير المساحة
                    // localStorage.removeItem(key); 
                    // ملاحظة: المستخدم لم يطلب مسحها صراحة، لكن المنطق يقتضي مسحها بعد الاستهلاك
                    // لكي لا تظهر في كل مرة يفتح فيها الصفحة.
                    // سنقوم بمسحها الآن.
                    localStorage.removeItem(key);
                }
            } catch (e) {
                console.error('[CameraUtils] Error restoring images:', e);
            }
        }
    }

    // --- دوال مساعدة داخلية ---

    function saveimageToStorage(pageId, base64) {
        const key = `camera_temp_${pageId}`;
        let currentImages = [];
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                currentImages = JSON.parse(stored);
                if (!Array.isArray(currentImages)) currentImages = [];
            } catch (e) { currentImages = []; }
        }
        currentImages.push(base64);
        localStorage.setItem(key, JSON.stringify(currentImages));
    }

    async function compressImage(file) {
        // فحص دعم ImageBitmap
        let imgBitmap;
        if (self.createImageBitmap) {
            imgBitmap = await createImageBitmap(file);
        } else {
            // Fallback for older browsers (unlikely needed but safe)
            return file;
        }

        const { width, height } = imgBitmap;
        const ratio = Math.min(1, IMAGE_MAX_WIDTH / width, IMAGE_MAX_HEIGHT / height);
        const newWidth = Math.round(width * ratio);
        const newHeight = Math.round(height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, newWidth, newHeight);
        ctx.drawImage(imgBitmap, 0, 0, newWidth, newHeight);

        // تحويل إلى Blob (JPEG لضمان التوافق والحجم الصغير)
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', IMAGE_QUALITY));

        imgBitmap.close();
        return blob;
    }

    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async function base64ToBlob(base64) {
        const res = await fetch(base64);
        return await res.blob();
    }

    // تصدير الوظائف العامة
    return {
        openCamera,
        checkForSavedImages
    };

})();
