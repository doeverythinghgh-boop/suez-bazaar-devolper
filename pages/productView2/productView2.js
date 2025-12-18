
    /**
     * @fileoverview Product View Details Logic with 3D Slider (pv2_ module)
     * @description Handles product details display, 3D image slider, and custom photo order requests.
     */

    // ==============================================
    //  DOM Elements Access
    // ==============================================

    var pv2_domElements = {
        name: document.getElementById("pv2_name"),
        description: document.getElementById("pv2_description_text"),
        sellerMessage: document.getElementById("pv2_seller_message_text"),

        // Slider Elements
        sliderContainer: document.getElementById("pv2_slider"),
        sliderTrack: document.getElementById("pv2_slider_track"),
        sliderDots: document.getElementById("pv2_slider_dots"),
        prevBtn: document.getElementById("pv2_slider_prev"),
        nextBtn: document.getElementById("pv2_slider_next")
    };


    // ==============================================
    //  3D Slider Logic
    // ==============================================

    var pv2_sliderState = {
        currentIndex: 0,
        slides: [],
        dots: [],
        autoPlayInterval: null,
        images: []
    };

    /**
     * @function pv2_buildSlider
     * @description Builds and renders the 3D image slider for the product.
     * @param {string[]} images - Array of image URLs.
     */
    function pv2_buildSlider(images) {
        const { sliderTrack, sliderDots, prevBtn, nextBtn, sliderContainer } = pv2_domElements;

        // Reset state
        pv2_sliderState = {
            currentIndex: 0,
            slides: [],
            dots: [],
            autoPlayInterval: null,
            images: images
        };

        // Clear previous content
        sliderTrack.innerHTML = '';
        sliderDots.innerHTML = '';

        // Hide buttons temporarily
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';

        if (!images || images.length === 0) {
            sliderTrack.innerHTML = '<p style="text-align:center; color:#666; width:100%;">لا توجد صور للخدمة</p>';
            return;
        }

        // Create slides and dots
        images.forEach((imageUrl, index) => {
            // Slide
            const slide = document.createElement('div');
            slide.className = 'pv2_slide';
            slide.style.backgroundImage = `url('${imageUrl}')`;

            // Pause/Play events
            slide.addEventListener('mousedown', pv2_pauseAutoPlay);
            slide.addEventListener('mouseup', pv2_startAutoPlay);
            slide.addEventListener('touchstart', pv2_pauseAutoPlay, { passive: true });
            slide.addEventListener('touchend', pv2_startAutoPlay);

            // Click side slide to activate
            slide.onclick = () => pv2_goToSlide(index);

            sliderTrack.appendChild(slide);
            pv2_sliderState.slides.push(slide);

            // Dot
            const dot = document.createElement('div');
            dot.className = 'pv2_slider-dot';
            dot.onclick = (e) => {
                e.stopPropagation(); // Prevent click propagation
                pv2_goToSlide(index);
            };
            sliderDots.appendChild(dot);
            pv2_sliderState.dots.push(dot);
        });

        // Setup controls
        if (images.length > 1) {
            prevBtn.style.display = 'flex';
            nextBtn.style.display = 'flex';

            prevBtn.onclick = () => pv2_goToSlide(pv2_sliderState.currentIndex - 1);
            nextBtn.onclick = () => pv2_goToSlide(pv2_sliderState.currentIndex + 1);

            // Start auto play
            pv2_startAutoPlay();
        } else {
            // Hide dots if only one image
            sliderDots.style.display = 'none';
        }

        // Show first slide
        pv2_goToSlide(0);
    }

    /**
     * @function pv2_goToSlide
     * @description Navigates to a specific slide with 3D effect.
     * @param {number} index - Index of the target slide.
     */
    function pv2_goToSlide(index) {
        const { slides, dots } = pv2_sliderState;
        if (slides.length === 0) return;

        // Calculate circular index
        const total = slides.length;
        const newIndex = (index + total) % total;
        pv2_sliderState.currentIndex = newIndex;

        slides.forEach((slide, i) => {
            const directOffset = i - newIndex;
            // Calculate shortest distance in circular loop
            const wrapOffset = directOffset > 0 ? directOffset - total : directOffset + total;
            const offset = Math.abs(directOffset) < Math.abs(wrapOffset) ? directOffset : wrapOffset;

            const isActive = offset === 0;

            // Calculate transforms
            const translateX = offset * 40; // 40% offset
            const scale = isActive ? 1 : 0.7;
            const translateZ = -Math.abs(offset) * 50; // Depth

            slide.style.transform = `translateX(${translateX}%) translateZ(${translateZ}px) scale(${scale})`;

            // Update classes
            if (isActive) {
                slide.classList.add('active');
                slide.style.zIndex = 10;
            } else {
                slide.classList.remove('active');
                slide.style.zIndex = 1; // Lower values in back
            }
        });

        // Update dots
        dots.forEach((dot, i) => {
            if (i === newIndex) dot.classList.add('active');
            else dot.classList.remove('active');
        });

        // Reset timer
        if (slides.length > 1) {
            pv2_resetAutoPlay();
        }
    }

    /**
     * @function pv2_startAutoPlay
     * @description Starts the auto-play timer for the slider.
     */
    function pv2_startAutoPlay() {
        if (pv2_sliderState.images.length <= 1) return;
        if (pv2_sliderState.autoPlayInterval) clearInterval(pv2_sliderState.autoPlayInterval);
        pv2_sliderState.autoPlayInterval = setInterval(() => {
            pv2_goToSlide(pv2_sliderState.currentIndex + 1);
        }, 4000);
    }

    /**
     * @function pv2_pauseAutoPlay
     * @description Pauses the auto-play timer.
     */
    function pv2_pauseAutoPlay() {
        if (pv2_sliderState.autoPlayInterval) clearInterval(pv2_sliderState.autoPlayInterval);
    }

    /**
     * @function pv2_resetAutoPlay
     * @description Resets the auto-play timer (pause then start).
     */
    function pv2_resetAutoPlay() {
        pv2_pauseAutoPlay();
        pv2_startAutoPlay();
    }

    // ==============================================
    //  Image Compression Logic
    // ==============================================
    const IMAGE_MAX_WIDTH = 1920;
    const IMAGE_MAX_HEIGHT = 1920;
    const IMAGE_QUALITY = 0.8;

    const WEBP_SUPPORTED_PROMISE = (async () => {
        const canvas = document.createElement('canvas');
        if (!!(canvas.getContext && canvas.getContext('2d'))) {
            return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        }
        return false;
    })();

    /**
     * @function compressImage
     * @description Compresses an image file and converts it to WebP if supported.
     * @param {File} file - The image file to compress.
     * @returns {Promise<Blob>} The compressed image blob.
     */
    async function compressImage(file) {
        // Create an ImageBitmap from the file
        // Note: createImageBitmap does not support all formats in all browsers (e.g. TIF might fail here).
        // If it fails, we return the original file as fallback.
        let imgBitmap;
        try {
            imgBitmap = await createImageBitmap(file);
        } catch (e) {
            console.warn("فشل ضغط الصورة، العودة للنسخة الأصلية", e);
            return file; // Return original if cannot parse
        }

        const width = imgBitmap.width;
        const height = imgBitmap.height;

        // Calculate new dimensions
        const ratio = Math.min(1, IMAGE_MAX_WIDTH / width, IMAGE_MAX_HEIGHT / height);
        const newWidth = Math.round(width * ratio);
        const newHeight = Math.round(height * ratio);

        // Draw to canvas
        const canvas = Object.assign(document.createElement('canvas'), { width: newWidth, height: newHeight });
        const ctx = canvas.getContext('2d');

        // Fill white background (avoids black transparents if converting png->jpg)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, newWidth, newHeight);

        ctx.drawImage(imgBitmap, 0, 0, newWidth, newHeight);

        const webpSupported = await WEBP_SUPPORTED_PROMISE;
        const mime = webpSupported ? 'image/webp' : 'image/jpeg';

        // Convert to blob
        const blob = await new Promise((res) => canvas.toBlob(res, mime, IMAGE_QUALITY));

        // Cleanup
        try { imgBitmap.close(); } catch (e) { }

        // Attach useful metadata to blob
        blob.name = file.name; // Keep original name reference
        blob.lastModified = file.lastModified;

        // Mark as compressed/converted
        blob.isCompressed = true;
        blob.extension = webpSupported ? 'webp' : 'jpg';

        return blob;
    }


    // ==============================================
    //  Main Function
    // ==============================================

    /**
     * @function pv2_viewDetails
     * @description Displays product details and initializes the slider.
     * @param {object} productData - The product data object.
     */
    function pv2_viewDetails(productData, options = {}) {
        try {
            console.log("[pv2_] عرض تفاصيل الخدمة مع السلايدر...");
            const showAddToCart = options.showAddToCart !== false;
            if (!showAddToCart) {
                document.getElementById("pv2_order_box").style.display = "none";
            }
            const { name, description, sellerMessage } = pv2_domElements;

            name.textContent = productData.productName || "غير متوفر";
            description.textContent = productData.description || "لا يوجد وصف متاح.";
            sellerMessage.textContent = productData.sellerMessage || "لا توجد رسالة من مقدم الخدمة.";

            // Build slider
            const images = productData.imageSrc || [];
            pv2_buildSlider(images);

        } catch (error) {
            console.error("pv2_viewDetails - خطأ:", error);

        }
    }

    // ==============================================
    //  Order Photo Logic
    // ==============================================

    let pv2_orderImages = []; // Stores file objects
    const MAX_ORDER_IMAGES = 4;
    const MAX_IMAGE_SIZE_MB = 5;

    // Elements
    const pv2_orderEls = {
        note: document.getElementById('pv2_note'),
        uploader: document.getElementById('pv2_uploader_area'),
        fileInput: document.getElementById('pv2_fileInput'),
        pickBtn: document.getElementById('pv2_pickImgBtn'),
        camBtn: document.getElementById('pv2_camBtn'),
        previews: document.getElementById('pv2_previews'),
        sendBtn: document.getElementById('pv2_sendBtn')
    };

    /**
     * @function pv2_initOrderLogic
     * @description Initializes listeners and state for the photo order request form.
     */
    function pv2_initOrderLogic() {
        // Reset state
        pv2_orderImages = [];
        pv2_orderEls.note.value = '';
        pv2_orderEls.previews.innerHTML = '';
        pv2_orderEls.fileInput.value = '';

        // Event Listeners
        pv2_orderEls.pickBtn.onclick = () => pv2_orderEls.fileInput.click();

        pv2_orderEls.fileInput.onchange = (e) => {
            pv2_handleFiles(Array.from(e.target.files));
        };

        pv2_orderEls.camBtn.onclick = () => {
            // Simple camera triggering for mobile
            if (/Mobi|Android/i.test(navigator.userAgent)) {
                pv2_orderEls.fileInput.setAttribute('capture', 'environment');
                pv2_orderEls.fileInput.click();
            } else {
                Swal.fire('تنبيه', 'يرجى استخدام زر اختيار الملفات على الكمبيوتر', 'info');
            }
        };

        pv2_orderEls.sendBtn.onclick = pv2_sendOrder;

        // check Drag and drop (Optional, but good UX)
        pv2_orderEls.uploader.ondragover = (e) => { e.preventDefault(); pv2_orderEls.uploader.style.borderColor = 'var(--primary-color)'; };
        pv2_orderEls.uploader.ondragleave = (e) => { e.preventDefault(); pv2_orderEls.uploader.style.borderColor = '#dee2e6'; };
        pv2_orderEls.uploader.ondrop = (e) => {
            e.preventDefault();
            pv2_orderEls.uploader.style.borderColor = '#dee2e6';
            pv2_handleFiles(Array.from(e.dataTransfer.files));
        };
    }

    /**
     * @function pv2_handleFiles
     * @description Processes selected files (validation, compression, preview).
     * @param {File[]} files - Array of selected files.
     */
    async function pv2_handleFiles(files) {
        // Allowed extensions (Web-supported) - Relaxed because we try to compress
        // If it's an image that the browser can decode, it will be compressed/converted.

        if (pv2_orderImages.length + files.length > MAX_ORDER_IMAGES) {
            Swal.fire('تنبيه', `الحد الأقصى هو ${MAX_ORDER_IMAGES} صور`, 'warning');
            return;
        }

        // Processing
        Swal.fire({
            title: 'جاري معالجة الصور...',
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false
        });

        for (const file of files) {
            // Check basics
            if (file.type.indexOf('image') === -1 && !file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|tif|tiff)$/i)) {
                // Skip non-images
                continue;
            }

            try {
                const processedBlob = await compressImage(file);
                // Ensure name property exists
                if (!processedBlob.name) processedBlob.name = file.name;

                pv2_orderImages.push(processedBlob);
                pv2_createPreview(processedBlob);
            } catch (err) {
                console.error("خطأ في معالجة الملف", file.name, err);

            }
        }

        Swal.close();
        pv2_orderEls.fileInput.value = ''; // Reset
    }

    /**
     * @function pv2_createPreview
     * @description Creates a visual preview for an uploaded image.
     * @param {Blob} file - The image blob to preview.
     */
    function pv2_createPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'pv2_preview_item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button class="pv2_preview_remove" onclick="pv2_removeImage(this, '${file.name}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            // Store file reference if needed, but here simple index or removing from array is fine. 
            // Better: Re-render or map DOM to array. For simplicity, we just find index by file object (reference) but file object might be tricky.
            // Let's attach file object to the div
            div.fileRef = file;
            pv2_orderEls.previews.appendChild(div);
        };
        reader.readAsDataURL(file);
    }

    /**
     * @function pv2_removeImage
     * @description Removes an image from the order list and DOM (Global/Window).
     * @param {HTMLElement} btn - The remove button element.
     * @param {string} fileName - Name of the file (unused in logic but good for debug).
     */
    window.pv2_removeImage = (btn, fileName) => {
        const div = btn.parentElement;
        const file = div.fileRef;
        pv2_orderImages = pv2_orderImages.filter(f => f !== file);
        div.remove();
    };

    /**
     * @function pv2_sendOrder
     * @description Submits the new order request with notes and images.
     */
    async function pv2_sendOrder() {
        // Validation
        if (showLoginAlert()) {



            const note = pv2_orderEls.note.value.trim();
            if (pv2_orderImages.length === 0 && !note) {
                Swal.fire('تنبيه', 'يرجى إضافة ملاحظة أو صورة واحدة على الأقل', 'warning');
                return;
            }

            // 1. Setup Keys
            // User provided data shows 'user_key' is the seller's key in productSession[0]
            const productData = ProductStateManager.getCurrentProduct() || (productSession ? productSession[0] : null);
            if (!productData) {
              Swal.fire('خطأ', 'لم يتم العثور على بيانات المنتج', 'error');
              return;
            }
            
            const product_key = productData.product_key; // PRODUCTKEY (From Product Data)
            const seller_key = productData.user_key;     // sellerKey (From Product Data)

            const user_key = userSession.user_key;       // USERKEY (From User Session)

            // Show loading
            Swal.fire({
                title: 'جاري الإرسال...',
                html: 'يرجى الانتظار بينما نقوم برفع الصور وإنشاء الطلب',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                console.log("بدء إرسال الطلب...");

                // 2. Generate Order Key (Serial) - For Database PK only
                const order_key = generateSerial();

                // 3. Upload Images
                const uploadedFileNames = [];

                for (let i = 0; i < pv2_orderImages.length; i++) {
                    const file = pv2_orderImages[i];
                    const index = i + 1;
                    // Get extension from compressed blob (if available) or fallback to name
                    // This converts .tif -> .webp/.jpg automatically in the filename
                    const ext = (file.extension || file.name.split('.').pop() || 'jpg').toLowerCase();

                    // Naming: USERKEY_sellerKey_PRODUCTKEY_ORDERKEY_{index}
                    // Using explicit product_key as requested + order_key for uniqueness
                    const newName = `${user_key}_${seller_key}_${product_key}_${order_key}_${index}`;
                    const finalName = `${newName}.${ext}`;
                    console.log(`جارٍ رفع ${finalName}...`);

                    const uploadResult = await uploadFile2cf(file, finalName);
                    // Use the file name confirmed by server if available, otherwise use our generated name
                    // Note: uploadFile2cf returns { file: "filename", ... } on success usually
                    const actualName = uploadResult.file || finalName;
                    uploadedFileNames.push(actualName);
                    console.log(`تم الرفع بنجاح: ${actualName}`);
                }

                // 4. Create Order in Database
                const total_amount = 0;

                const orderData = {
                    order_key: order_key,
                    user_key: user_key,
                    total_amount: total_amount,
                    items: [
                        {
                            product_key: product_key,
                            quantity: 1,
                            seller_key: seller_key,
                            note: note
                        }
                    ]
                };

                console.log("إنشاء الطلب:", orderData);

                const res = await fetch(`${baseURL}/api/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });

                if (!res.ok) {
                    throw new Error('فشل إنشاء الطلب');
                }

                // Success
                localStorage.setItem('showOrderPhotoMessage', 'true');

                Swal.fire({
                    icon: 'success',
                    title: 'تم الإرسال بنجاح',

                    confirmButtonText: 'حسناً'
                }).then(() => {
                    mainLoader("./pages/home.html", "index-home-container", 0, undefined, "hiddenHomeIcon", false);

                });

            } catch (error) {
                console.error(error);

            }
        }
    }


    // ==============================================
    //  Entry Point
    // ==============================================

    try {
        console.log("تهيئة عرض الخدمة سلايدر ثلاثي الأبعاد...");
        // Check session and clear old intervals if any
        if (typeof pv2_sliderState !== 'undefined' && pv2_sliderState.autoPlayInterval) {
            clearInterval(pv2_sliderState.autoPlayInterval);
        }

        // Get product data from state manager (new approach)
        const productData = ProductStateManager.getCurrentProduct();
        const viewOptions = ProductStateManager.getViewOptions();

        if (productData) {
            pv2_viewDetails(productData, viewOptions);
        } else {
            // Fallback to old approach for backward compatibility
            console.warn("[pv2] لم يتم العثور على بيانات في State Manager، استخدام productSession");
            if (productSession) {
                pv2_viewDetails(productSession[0], productSession[1]);
            } else {
                console.error("[pv2] لا توجد بيانات منتج للعرض");
            }
        }

        // Initialize Order Logic
        pv2_initOrderLogic();

    } catch (error) {
        console.error("خطأ في تهيئة عرض الخدمة:", error);
    }
