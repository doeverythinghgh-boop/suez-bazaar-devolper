/**
 * @file js/cameraUtils.js
 * @description موديول (Module) مشترك للتعامل مع الكاميرا، ضغط الصور، وحفظها مؤقتًا في LocalStorage.
 * التعديلات المدرجة:
 *  - تحسين أسلوب إدارة الـ Canvas وتنظيف الذاكرة بعد الاستخدام.
 *  - إضافة fallback لاستخدام الكاميرا الأمامية إذا لم يتم التقاط صورة من الكاميرا الخلفية.
 *  - عدم إزالة عنصر input فورًا (إزالته بعد اكتمال المعالجة) لتفادي مشاكل في بعض الأجهزة.
 *  - تنظيف المتغيرات الكبيرة (Base64, Blob, ImageBitmap, canvas, ctx) بعد كل عملية.
 */

window.CameraUtils = (function () {
    // --- إعدادات ضغط الصور الموحدة ---
    const IMAGE_MAX_WIDTH = 1600;
    const IMAGE_MAX_HEIGHT = 1600;
    const IMAGE_QUALITY = 0.75;

    // علم لحظر محاولات متزامنة لفتح الكاميرا/معالجة صورة واحدة في آنٍ واحد
    let isProcessing = false;

    /**
     * @function openCamera
     * @param {string} pageId
     */
    async function openCamera(pageId) {
        if (isProcessing) {
            console.warn('[CameraUtils] openCamera called while another operation is in progress.');
            return;
        }

        isProcessing = true;

        // نحاول أولًا فتح الكاميرا الخلفية (environment).
        // إذا لم يُنتج عن ذلك صورة (أو فشل) سنحاول مرة واحدة الكاميرا الأمامية (user).
        let triedEnv = false;
        let triedUser = false;

        // دالة داخلية لفتح input مع نوع capture معين
        const launchInput = (captureMode) => {
            // تنظيف أي عنصر سابق
            const prev = document.getElementById('temp-camera-input');
            if (prev) prev.remove();

            const input = document.createElement('input');
            input.id = 'temp-camera-input';
            input.type = 'file';
            input.accept = 'image/*';
            if (captureMode) {
                try {
                    input.setAttribute('capture', captureMode);
                } catch (e) {
                    // مرور بهدوء إذا لم يقبل المتصفح السمة
                }
            }
            input.style.display = 'none';
            document.body.appendChild(input);
            return input;
        };

        // نستخدم حلقة تحقق بسيطة: نحاول environment ثم user مرة واحدة كحد أقصى
        try {
            let continueLoop = true;
            while (continueLoop) {
                let captureMode = null;
                if (!triedEnv) {
                    captureMode = 'environment';
                    triedEnv = true;
                } else if (!triedUser) {
                    captureMode = 'user';
                    triedUser = true;
                } else {
                    // تم التجريب مرتين؛ نخرج
                    break;
                }

                const input = launchInput(captureMode);

                // الاستماع لحدث التغيير
                const filesPromise = new Promise((resolve) => {
                    const onChange = (e) => {
                        // لا نزيل العنصر فورًا — سنزيله بعد إتمام المعالجة لتفادي مشاكل الأجهزة.
                        input.removeEventListener('change', onChange);
                        resolve({ e, input });
                    };
                    input.addEventListener('change', onChange, { once: true });
                });

                // محاكاة النقر لفتح الكاميرا/المعرض
                try {
                    input.click();
                } catch (err) {
                    // بعض البيئات قد تمنع click() على عنصر مخفي، في هذه الحالة نعرض تحذير (لكن لا نكسر)
                    console.warn('[CameraUtils] input.click() failed:', err);
                }

                // ننتظر اختيار الملف أو إلغاء العملية
                const { e, input: usedInput } = await filesPromise;

                // إذا لم يختَر المستخدم ملفًا (ألغى)، نعيد المحاولة مع وضع fallback (user) مرة واحدة فقط
                if (!e.target.files || e.target.files.length === 0) {
                    console.log(`[CameraUtils] No file chosen with capture="${captureMode}".`);
                    // نزيل الـ input الحالي لأنه لم يعد مطلوبًا
                    if (usedInput && usedInput.parentNode) usedInput.remove();

                    // إذا جربنا environment ولم نجرّب user بعد، نفعل المحاولة التالية تلقائيًا
                    if (captureMode === 'environment' && !triedUser) {
                        // تابع الحلقة وحاول مرة أخرى مع user
                        continue;
                    } else {
                        // لا توجد ملفات ولم يتبق لدينا محاولة fallback -> نخرج
                        continueLoop = false;
                        break;
                    }
                }

                // حصلنا على ملف فعلي؛ الآن نقوم بالمعالجة
                const file = e.target.files[0];

                // عرض تنبيه للمستخدم بأن العملية جارية
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

                    // 4. منطق إعادة تحميل الصفحة لصفحة معينة
                    if (pageId === 'productAdd') {
                        console.log(`[CameraUtils] Reloading ${pageId} via mainLoader...`);
                        if (typeof mainLoader === 'function') {
                            try {
                                await mainLoader(
                                    "./pages/productAdd.html",
                                    "index-product-container",
                                    300,
                                    undefined,
                                    ["showHomeIcon", "checkSavedImagesCallback"],
                                    false
                                );
                            } catch (loaderErr) {
                                console.error('[CameraUtils] mainLoader error:', loaderErr);
                            }
                        } else {
                            console.error('[CameraUtils] mainLoader is not defined!');
                        }
                    }

                    // بعد الحفظ - نغلق الـ Swal وننظف المتغيرات الثقيلة
                    Swal.close();

                    // تنظيف متغيرات الذاكرة الكبيرة فوراً
                    // ملاحظة: المتغيرات المحلية مثل compressedBlob و base64 سيتم تحررها عند الخروج من النطاق،
                    // لكن نساعد الـ GC بإعادة تعيين ما يمكن هنا.
                    try {
                        // إذا كان لدينا كائن URL مؤقت (لم نستخدمه هنا لكن نتحقق فقط)
                        if (typeof compressedBlob === 'object' && typeof URL !== 'undefined' && compressedBlob._objectURL) {
                            try { URL.revokeObjectURL(compressedBlob._objectURL); } catch (e) { /* ignore */ }
                        }
                    } catch (e) { /* ignore */ }

                    // إزالة الـ input المستخدم الآن بعد اكتمال المعالجة
                    if (usedInput && usedInput.parentNode) usedInput.remove();

                    // عملية ناجحة - نوقف الحلقة (لا نعيد فتح الكاميرا تلقائيًا)
                    continueLoop = false;
                    break;
                } catch (processError) {
                    console.error('[CameraUtils] Error processing image:', processError);
                    let msg = 'حدث خطأ أثناء معالجة الصورة.';
                    if (processError && (processError.name === 'QuotaExceededError' || (processError.message && processError.message.includes('quota')))) {
                        msg = 'مساحة التخزين المؤقت ممتلئة. يرجى إتمام العملية الحالية أو تقليل عدد الصور.';
                    }
                    try { Swal.fire('خطأ', msg, 'error'); } catch (e) { /* ignore */ }

                    // تنظيف الـ input بعد الخطأ
                    if (usedInput && usedInput.parentNode) usedInput.remove();

                    // إذا فشل أثناء محاولة environment، نجرب user مرة واحدة
                    if (captureMode === 'environment' && !triedUser) {
                        continue;
                    } else {
                        continueLoop = false;
                        break;
                    }
                } finally {
                    // في أي حال، نضمن تحرير العلم والمعالجات عند الخروج من هذه الدورة
                }
            } // end while
        } finally {
            // تأكد من إعادة العلم للحالة العادية بعد انتهاء الحلقة
            isProcessing = false;
        }
    }

    /**
     * @function checkForSavedImages
     * @param {string} pageId
     * @param {Function} onImagesRestored
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
                        const file = new File([blob], `restored_image_${i}.jpg`, { type: 'image/jpeg' });
                        blobs.push(file);

                        // مسح المرجع الكبير بعد الاستخدام قدر الإمكان
                        try {
                            // لا توجد طريقة مباشرة لمسح Blob في JS، لكن بعد انتهاء الدورة ونقص المراجع، سيجمعه الـ GC.
                        } catch (e) { /* ignore */ }
                    }

                    if (typeof onImagesRestored === 'function') {
                        onImagesRestored(blobs);
                    }

                    // تنظيف LocalStorage بعد الاستعادة
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
        try {
            localStorage.setItem(key, JSON.stringify(currentImages));
        } catch (e) {
            // قد يحدث QuotaExceededError هنا
            console.error('[CameraUtils] Failed to save image to LocalStorage:', e);
            throw e;
        } finally {
            // محاولة لتخفيف الذاكرة: إعادة تعيين مرجع Base64 في المكان الذي استدعيت منه هذه الدالة
            // ملاحظة: لا يمكننا تعديل متغير المالك هنا، لكن ننصح المتصل بتحرير مرجع الـ base64 بعد النداء.
        }
    }

    /**
     * @function compressImage
     * @description تضغط الصورة باستخدام Canvas و createImageBitmap.
     * يقوم بتحرير جميع الموارد (ImageBitmap، canvas، ctx) فور الانتهاء.
     * @param {File} file
     * @returns {Promise<Blob>}
     */
    async function compressImage(file) {
        let imgBitmap = null;
        try {
            if (self.createImageBitmap) {
                imgBitmap = await createImageBitmap(file);
            } else {
                // إذا لم يدعم المتصفح createImageBitmap، نجرب استخدام Image() كحل بديل (بسيط)
                // لكن لتفادي تعقيد إضافي هنا، نُعيد الملف كما هو.
                return file;
            }

            const { width, height } = imgBitmap;
            const ratio = Math.min(1, IMAGE_MAX_WIDTH / width, IMAGE_MAX_HEIGHT / height);
            const newWidth = Math.round(width * ratio);
            const newHeight = Math.round(height * ratio);

            // إنشاء canvas محلي داخل هذا النطاق فقط
            let canvas = document.createElement('canvas');
            try {
                canvas.width = newWidth;
                canvas.height = newHeight;
                const ctx = canvas.getContext('2d');

                // خلفية بيضاء للتعامل مع الشفافية
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, newWidth, newHeight);

                // رسم الصورة
                ctx.drawImage(imgBitmap, 0, 0, newWidth, newHeight);

                // إغلاق ImageBitmap فورًا بعد الرسم لتحرير الذاكرة
                if (imgBitmap && typeof imgBitmap.close === 'function') {
                    try { imgBitmap.close(); } catch (e) { /* ignore */ }
                }
                imgBitmap = null;

                // تحويل الـ canvas إلى Blob بصيغة JPEG
                const blob = await new Promise((resolve) => {
                    // toBlob قد تأخذ بعض الوقت؛ لكن بعد الإنهاء سننظف الـ canvas
                    canvas.toBlob((b) => resolve(b), 'image/jpeg', IMAGE_QUALITY);
                });

                // تنظيف الـ canvas والمتغيرات الكبيرة لإعلام الـ GC
                try {
                    // إعادة تعيين الأبعاد قبل الحذف للتقليل من استهلاك الذاكرة
                    canvas.width = 0;
                    canvas.height = 0;
                } catch (e) { /* ignore */ }

                // إزالة العنصر من DOM إذا دخل DOM (هو في الذاكرة فقط هنا)
                canvas = null;

                return blob;
            } finally {
                // محاولة إضافية لتحرير أي مراجع داخل finally
                // (لا يوجد ctx مرجعي هنا بعد الخروج)
            }
        } catch (err) {
            // إذا حدثت أي مشكلة أثناء createImageBitmap أو الرسم، نحرص على إغلاق imgBitmap إن وُجد
            if (imgBitmap && typeof imgBitmap.close === 'function') {
                try { imgBitmap.close(); } catch (e) { /* ignore */ }
            }
            imgBitmap = null;
            throw err;
        }
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
            reader.onloadend = () => {
                resolve(reader.result);
                // بعد الإنهاء نزيل مرجع الـ reader للمساعدة في جمع القمامة
                try { reader.onloadend = null; } catch (e) { /* ignore */ }
            };
            reader.onerror = (err) => {
                reject(err);
                try { reader.onerror = null; } catch (e) { /* ignore */ }
            };
            reader.readAsDataURL(blob);
        });
    }

    /**
     * @function base64ToBlob
     * @description تحويل نص Base64 إلى Blob عن طريق fetch (بسيط وموثوق).
     * @param {string} base64
     * @returns {Promise<Blob>}
     */
    async function base64ToBlob(base64) {
        // استخدام fetch على data URL يعطي Blob مباشرة. بعد استخدام الـ blob سيتم تحريره بواسطة GC.
        const res = await fetch(base64);
        const blob = await res.blob();
        return blob;
    }

    // تصدير الدوال
    return {
        openCamera,
        checkForSavedImages
    };

})();
