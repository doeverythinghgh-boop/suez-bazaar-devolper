/**
 * @file js/cameraUtils.js
 * @description موديول (Module) مشترك للتعامل مع الكاميرا، ضغط الصور، وحفظها مؤقتًا في LocalStorage.
 * يهدف هذا الموديول بشكل رئيسي إلى حل مشكلة إعادة تحميل الصفحة التي تحدث عند فتح الكاميرا
 * في متصفحات الأجهزة المحمولة (خاصة Android) بسبب قيود الذاكرة.
 */

window.CameraUtils = (function () {
    // --- إعدادات ضغط الصور الموحدة ---
    // هذه الإعدادات تضمن توازنًا بين جودة الصورة وحجم الملف لتناسب التخزين في LocalStorage
    const IMAGE_MAX_WIDTH = 1600;  // أقصى عرض للصورة
    const IMAGE_MAX_HEIGHT = 1600; // أقصى ارتفاع للصورة
    const IMAGE_QUALITY = 0.75;    // جودة الضغط (0.0 - 1.0)

    /**
     * @function openCamera
     * @description الوظيفة الرئيسية لفتح الكاميرا والتقاط الصورة.
     * تقوم بالخطوات التالية:
     * 1. إنشاء عنصر input type="file" ديناميكيًا.
     * 2. تفعيل خاصية capture="environment" لفتح الكاميرا الخلفية مباشرة.
     * 3. عند التقاط الصورة:
     *    أ. يتم ضغط الصورة لتقليل حجمها.
     *    ب. يتم تحويلها إلى نص (Base64).
     *    ج. يتم حفظها في LocalStorage.
     *    د. يتم استدعاء دالة إعادة التحميل (mainLoader) لضمان عودة الصفحة لحالتها الصحيحة.
     *
     * @param {string} pageId - معرف فريد للصفحة (مثل 'productAdd') يُستخدم كمفتاح في LocalStorage.
     * @param {Function} [reloadCallback] - دالة اختيارية لإعادة التحميل في حال لم يتم التعرف على الصفحة.
     */
    async function openCamera(pageId, reloadCallback) {
        // إنشاء عنصر input مخفي لمحاكاة النقر
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        // 'environment' تجبر المتصفح على استخدام الكاميرا الخلفية
        input.setAttribute('capture', 'environment');
        input.style.display = 'none';
        document.body.appendChild(input);

        // الاستماع لحدث اختيار الملف (التقاط الصورة)
        input.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];

                // عرض تنبيه للمستخدم بأن العملية جارية (لأن الضغط قد يستغرق وقتًا)
                Swal.fire({
                    title: 'جاري معالجة الصورة...',
                    text: 'يرجى الانتظار بينما يتم ضغط وحفظ الصورة.',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                try {
                    // 1. ضغط الصورة باستخدام Canvas
                    const compressedBlob = await compressImage(file);

                    // 2. تحويل الصورة المضغوطة إلى نص Base64 للتخزين
                    const base64 = await blobToBase64(compressedBlob);

                    // 3. حفظ النص في LocalStorage
                    saveimageToStorage(pageId, base64);

                    // 4. منطق إعادة تحميل الصفحة
                    // يتم التعامل مع كل صفحة بشكل خاص لضمان استدعاء الـ Loader الصحيح
                    if (pageId === 'productAdd') {
                        console.log(`[CameraUtils] Reloading ${pageId} via mainLoader...`);

                        // التحقق من وجود دالة mainLoader
                        if (typeof mainLoader === 'function') {
                            // تم استخدام undefined للدالة الراجعة هنا بناءً على طلب المستخدم
                            // لأننا سنقوم باستدعاء الدالة الراجعة يدويًا في السطر التالي
                        await    mainLoader(
                                "./pages/productAdd.html", // رابط الصفحة
                                "index-product-container",   // الحاوية
                                0,                           // وقت الانتظار
                                undefined,                   // الدالة الراجعة (تم تعطيلها هنا)
                                "showHomeIcon",              // دالة أيقونة الصفحة الرئيسية
                                false                        // هل هو إعادة تحميل؟
                            );

                            // استدعاء دالة الفحص والاستعادة الخاصة بصفحة إضافة المنتج يدويًا
                            // وتأكد من أن الكائن productModule00 متاح عالميًا
                            if (typeof productModule00 !== 'undefined' && typeof productModule00.checkSavedImagesCallback === 'function') {
                                productModule00.checkSavedImagesCallback();
                            }

                            Swal.close(); // إغلاق التنبيه
                        } else {
                            console.error('[CameraUtils] mainLoader is not defined!');
                            // استخدام الـ callback الاحتياطي إذا وجد
                            if (reloadCallback) reloadCallback();
                        }
                    } else if (typeof reloadCallback === 'function') {
                        // لأي صفحات أخرى، نستخدم الـ callback الممرر
                        Swal.close();
                        console.log(`[CameraUtils] Image saved for ${pageId}. Triggering generic reload callback.`);
                        reloadCallback();
                    }

                } catch (error) {
                    console.error('[CameraUtils] Error processing image:', error);
                    let msg = 'حدث خطأ أثناء معالجة الصورة.';
                    // التحقق من خطأ امتلاء مساحة التخزين (QuotaExceededError)
                    if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
                        msg = 'مساحة التخزين المؤقت ممتلئة. يرجى إتمام العملية الحالية أو تقليل عدد الصور.';
                    }
                    Swal.fire('خطأ', msg, 'error');
                }
            }
            // إزالة عنصر الـ input من الـ DOM بعد الانتهاء
            document.body.removeChild(input);
        });

        // محاكاة النقر لفتح الكاميرا
        input.click();
    }

    /**
     * @function checkForSavedImages
     * @description دالة تُستدعى عند تحميل الصفحة للتحقق مما إذا كانت هناك صور محفوظة مسبقًا.
     * إذا وجدت صورًا، تقوم بتحويلها من Base64 إلى كائنات File وتعيدها للصفحة.
     *
     * @param {string} pageId - معرف الصفحة للبحث عن الصور الخاصة بها.
     * @param {Function} onImagesRestored - دالة راجعة (Callback) تستقبل مصفوفة الصور المستعادة.
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
                    // تحويل كل صورة محفوظة من نص إلى ملف
                    for (let i = 0; i < imagesBase64.length; i++) {
                        const blob = await base64ToBlob(imagesBase64[i]);
                        // إنشاء كائن File جديد من الـ Blob
                        const file = new File([blob], `restored_image_${i}.jpg`, { type: 'image/jpeg' });
                        blobs.push(file);
                    }

                    // تمرير الصور المستعادة إلى دالة الصفحة
                    if (typeof onImagesRestored === 'function') {
                        onImagesRestored(blobs);
                    }

                    // تنظيف LocalStorage: مسح الصور بعد استعادتها لتوفير المساحة وتجنب التكرار
                    localStorage.removeItem(key);
                }
            } catch (e) {
                console.error('[CameraUtils] Error restoring images:', e);
            }
        }
    }

    // --- دوال مساعدة داخلية (Private Helper Functions) ---

    /**
     * @function saveimageToStorage
     * @description تحفظ نص الصورة (Base64) في LocalStorage ضمن مصفوفة.
     * @param {string} pageId 
     * @param {string} base64 
     */
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

    /**
     * @function compressImage
     * @description تضغط الصورة باستخدام Canvas و createImageBitmap.
     * @param {File} file 
     * @returns {Promise<Blob>}
     */
    async function compressImage(file) {
        // التحقق من دعم المتصفح لـ createImageBitmap
        let imgBitmap;
        if (self.createImageBitmap) {
            imgBitmap = await createImageBitmap(file);
        } else {
            return file; // إعادة الملف الأصلي في حال عدم الدعم (نادر في المتصفحات الحديثة)
        }

        const { width, height } = imgBitmap;
        // حساب نسبة التصغير للحفاظ على الأبعاد ضمن الحد المسموح
        const ratio = Math.min(1, IMAGE_MAX_WIDTH / width, IMAGE_MAX_HEIGHT / height);
        const newWidth = Math.round(width * ratio);
        const newHeight = Math.round(height * ratio);

        // الرسم على Canvas
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');

        // خلفية بيضاء (للصور الشفافة مثل PNG عند تحويلها لـ JPEG)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, newWidth, newHeight);
        ctx.drawImage(imgBitmap, 0, 0, newWidth, newHeight);

        // التحويل إلى Blob بصيغة JPEG
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', IMAGE_QUALITY));

        imgBitmap.close(); // تحرير الذاكرة
        return blob;
    }

    /**
     * @function blobToBase64
     * @description تحويل Blob إلى نص Base64.
     * @param {Blob} blob 
     * @returns {Promise<string>}
     */
    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * @function base64ToBlob
     * @description تحويل نص Base64 إلى Blob.
     * @param {string} base64 
     * @returns {Promise<Blob>}
     */
    async function base64ToBlob(base64) {
        const res = await fetch(base64);
        return await res.blob();
    }

    // تصدير الدوال التي يمكن استخدامها من الخارج
    return {
        openCamera,
        checkForSavedImages
    };

})();
