/**
 * @file js/productModule.js
 * @description وحدة لإدارة صور المنتج، بما في ذلك الرفع، الضغط، المعاينة، والحذف.
 *   يتم تعريف هذه الوحدة كـ IIFE (Immediately Invoked Function Expression) لإنشاء نطاق خاص بها
 *   وتصدير واجهة برمجة تطبيقات (API) عامة عبر `window.productModule`.
 */

/**
 * @module productModule
 * @description الوحدة الرئيسية لإدارة صور المنتج والنموذج.
 * @property {Array<object>} images - مصفوفة لتخزين حالة جميع الصور (المرفوعة، قيد المعالجة، إلخ).
 * @property {Array<string>} originalImageNames - مصفوفة لتخزين أسماء الصور الأصلية في وضع التعديل.
 * @property {function(): boolean} init - دالة لتهيئة الوحدة وربط مستمعي الأحداث.
 * @property {function(): void} cleanup - دالة لتنظيف الوحدة وإزالة مستمعي الأحداث.
 * @property {function(object, string|null): void} createPreviewItem - دالة لإنشاء معاينة للصورة في الواجهة.
 */
window.productModule = (function() {
  /** @description أقصى عرض للصورة بعد الضغط. @type {number} @const */
  const IMAGE_MAX_WIDTH = 1600;
  /** @description أقصى ارتفاع للصورة بعد الضغط. @type {number} @const */
  const IMAGE_MAX_HEIGHT = 1600;
  /** @description جودة الصورة عند الضغط (0.0 إلى 1.0). @type {number} @const */
  const IMAGE_QUALITY = 0.75;
  /** @description أقصى عدد من الملفات المسموح برفعها. @type {number} @const */
  const MAX_FILES = 6;
  
  /** @private @type {HTMLInputElement|null} */
  let fileInput, pickFilesBtn, takePhotoBtn, clearAllBtn, previewsEl, uploaderEl;
  /** @private @description مصفوفة لتخزين حالة جميع الصور. @type {Array<object>} */
  const images = [];
  /** @private @description عداد لتوليد معرفات فريدة. @type {number} */
  let idCounter = 1;
  /** @private @description وعد (Promise) يخزن نتيجة التحقق من دعم WebP. @type {Promise<boolean>} */
  let WEBP_SUPPORTED_PROMISE;
  /** @private @description مصفوفة لتتبع مستمعي الأحداث لسهولة إزالتهم. @type {Array<object>} */
  let eventListeners = [];

  /**
   * @private
   * @function productGenId
   * @description يولد معرفًا فريدًا لكل صورة.
   * @returns {string} - معرف فريد.
   */
  function productGenId() { 
    return 'img_' + (Date.now() + idCounter++); 
  }

  /**
   * @private
   * @function productRemoveEventListeners
   * @description يزيل جميع مستمعي الأحداث الذين تم تتبعهم لمنع تسرب الذاكرة.
   * @returns {void}
   */
  function productRemoveEventListeners() {
    eventListeners.forEach(({ element, event, handler }) => {
      if (element && handler) {
        element.removeEventListener(event, handler);
      }
    });
    eventListeners = [];
  }

  /**
   * @private
   * @function productAddEventListener
   * @description يضيف مستمع حدث إلى عنصر ويتتبعه لإزالته لاحقًا.
   * @param {HTMLElement} element - العنصر المراد ربط المستمع به.
   * @param {string} event - اسم الحدث (مثل 'click').
   * @param {Function} handler - الدالة التي سيتم استدعاؤها عند وقوع الحدث.
   */
  function productAddEventListener(element, event, handler) {
    if (element && handler) {
      element.addEventListener(event, handler);
      eventListeners.push({ element, event, handler });
    }
  }

  /**
   * @private
   * @async
   * @function productCompressImage
   * @description يضغط صورة عن طريق تغيير حجمها وتحويلها إلى WebP (إذا كان مدعومًا).
   * @param {File} file - ملف الصورة الأصلي.
   * @returns {Promise<Blob>} - وعد (Promise) يحتوي على كائن Blob للصورة المضغوطة.
   */
  async function productCompressImage(file) {
    const imgBitmap = await createImageBitmap(file);
    let { width, height } = imgBitmap;

    const ratio = Math.min(1, IMAGE_MAX_WIDTH / width, IMAGE_MAX_HEIGHT / height);
    const newWidth = Math.round(width * ratio);
    const newHeight = Math.round(height * ratio);

    const canvas = Object.assign(document.createElement('canvas'), { 
      width: newWidth, 
      height: newHeight 
    });
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,newWidth,newHeight);
    ctx.drawImage(imgBitmap, 0, 0, newWidth, newHeight);

    const webpSupported = await WEBP_SUPPORTED_PROMISE;
    const mime = webpSupported ? 'image/webp' : 'image/jpeg';

    const blob = await new Promise((res) => canvas.toBlob(res, mime, IMAGE_QUALITY));

    try { imgBitmap.close(); } catch(e){}

    return blob;
  }

  /**
   * @public
   * @function productCreatePreviewItem
   * @description ينشئ عنصر معاينة للصورة في واجهة المستخدم.
   * @param {object} state - كائن حالة الصورة.
   * @param {string|null} [existingImageUrl=null] - عنوان URL لصورة موجودة مسبقًا (في وضع التعديل).
   */
  function productCreatePreviewItem(state, existingImageUrl = null) {
    if (!previewsEl) {
      console.error('previewsEl not initialized');
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'add-product-modal__preview';
    wrapper.setAttribute('data-id', state.id);

    productAddEventListener(wrapper, 'click', (e) => {
      if (e.target.closest('.add-product-modal__preview-remove')) return;
      document.querySelectorAll('.add-product-modal__preview--selected').forEach(p => {
        p.classList.remove('add-product-modal__preview--selected');
      });
      wrapper.classList.add('add-product-modal__preview--selected');
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = "button";
    removeBtn.className = 'add-product-modal__preview-remove';
    removeBtn.setAttribute('title', 'إزالة الصورة');
    removeBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
    productAddEventListener(removeBtn, 'click', () => productRemoveImage(state.id));

    const img = document.createElement('img');
    const meta = document.createElement('div');
    meta.className = 'add-product-modal__preview-meta';
    meta.textContent = 'جاري الحساب...';

    wrapper.appendChild(removeBtn);
    wrapper.appendChild(img);
    wrapper.appendChild(meta);

    if (existingImageUrl) {
      img.src = existingImageUrl;
      meta.textContent = 'صورة حالية';
    } else {
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.readAsDataURL(state.file);
    }

    previewsEl.appendChild(wrapper);
    state._el = wrapper;
    state._metaEl = meta;
  }

  /**
   * @private
   * @function productRemoveImage
   * @description يعرض نافذة تأكيد ثم يزيل الصورة المحددة.
   * @param {string} id - معرف الصورة المراد إزالتها.
   * @returns {void}
   */
  function productRemoveImage(id) {
    console.log(`[ImageUploader] Attempting to remove image with id: ${id}`);
    if (typeof Swal === 'undefined') {
      if (confirm('هل تريد بالتأكيد حذف هذه الصورة؟')) {
        removeImageById(id);
      }
      return;
    }

    Swal.fire({
      title: 'هل أنت متأكد؟',
      text: "هل تريد بالتأكيد حذف هذه الصورة؟",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'نعم، احذفها!',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        removeImageById(id);
      }
    });
  }

  /**
   * @private
   * @function removeImageById
   * @description يزيل الصورة من مصفوفة الحالة ومن واجهة المستخدم.
   * @param {string} id - معرف الصورة المراد إزالتها.
   * @returns {void}
   */
  function removeImageById(id) {
    const idx = images.findIndex(i => i.id === id);
    if (idx > -1) {
      const state = images[idx];
      if (state._el) state._el.remove();
      console.log(`[ImageUploader] Image ${id} removed from view.`);
      images.splice(idx, 1);
    }
  }

  /**
   * @private
   * @function productClearAll
   * @description يعرض نافذة تأكيد ثم يمسح جميع الصور المضافة.
   * @returns {void}
   */
  function productClearAll() {
    console.log('[ImageUploader] Attempting to clear all images.');
    if (images.length === 0) return;

    if (typeof Swal === 'undefined') {
      if (confirm('سيتم حذف جميع الصور المضافة!')) {
        clearAllImages();
      }
      return;
    }

    Swal.fire({
      title: 'هل أنت متأكد؟',
      text: "سيتم حذف جميع الصور المضافة!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#3498db',
      confirmButtonText: 'نعم، احذف الكل!',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        clearAllImages();
      }
    });
  }

  /**
   * @private
   * @function clearAllImages
   * @description يمسح جميع الصور من مصفوفة الحالة ومن واجهة المستخدم.
   * @returns {void}
   */
  function clearAllImages() {
    if (previewsEl) {
      previewsEl.innerHTML = '';
    }
    console.log('[ImageUploader] All images cleared.');
    images.length = 0;
  }

  /**
   * @private
   * @async
   * @function productHandleNewFiles
   * @description يعالج الملفات الجديدة التي تم اختيارها أو سحبها، وينشئ معايناتها، ويبدأ عملية الضغط.
   * @param {FileList} fileList - قائمة الملفات المراد معالجتها.
   */
  async function productHandleNewFiles(fileList){
    console.log(`[ImageUploader] Handling ${fileList.length} new files.`);
    if (uploaderEl) {
      productClearError(uploaderEl);
    }

    const filesArr = Array.from(fileList).slice(0, MAX_FILES - images.length);
    for(const file of filesArr){
      if(!file.type.startsWith('image/')) continue;
      const id = productGenId();
      const state = { id, file, compressedBlob: null, status:'pending' };
      images.push(state);
      productCreatePreviewItem(state);
      
      try{
        console.log(`[ImageUploader] Compressing image: ${file.name}`);
        state.status = 'compressing';
        const compressed = await productCompressImage(file);
        state.compressedBlob = compressed;
        state.status = 'ready';
        console.log(`%c[ImageUploader] Image compressed successfully: ${file.name} -> ${productFormatBytes(compressed.size)}`, 'color: green;');
        if (state._metaEl) {
          state._metaEl.textContent = productFormatBytes(compressed.size);
        }
      }catch(err){
        console.error('%c[ImageUploader] Error compressing image:', 'color: red;', err);
        state.status = 'error';
        if (state._metaEl) {
          state._metaEl.textContent = 'خطأ';
        }
      }
    }
    if (fileInput) {
      fileInput.value = '';
    }
  }

  /**
   * @private
   * @async
   * @function productOpenDesktopCamera
   * @description يفتح نافذة منبثقة مع بث مباشر من كاميرا الجهاز (لأجهزة سطح المكتب).
   * @returns {Promise<void>}
   */
  async function productOpenDesktopCamera() {
    const cameraModalContainer = document.getElementById('camera-modal-container');
    if (!cameraModalContainer) {
      console.error('Camera modal container not found!');
      return;
    }

    cameraModalContainer.innerHTML = `
      <div class="modal-content camera-modal-content">
        <button class="close-button" id="camera-modal-close-btn" aria-label="إغلاق"><i class="fas fa-times"></i></button>
        <video id="camera-preview" autoplay playsinline></video>
        <canvas id="camera-canvas" style="display:none;"></canvas>
        <div class="camera-controls">
          <button id="capture-photo-btn" class="btn btn-primary"><i class="fas fa-camera"></i> التقاط الصورة</button>
        </div>
      </div>
    `;
    cameraModalContainer.style.display = 'flex';

    const video = document.getElementById('camera-preview');
    const captureBtn = document.getElementById('capture-photo-btn');
    const closeBtn = document.getElementById('camera-modal-close-btn');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      video.srcObject = stream;

      const closeStream = () => {
        stream.getTracks().forEach(track => track.stop());
        cameraModalContainer.style.display = 'none';
        cameraModalContainer.innerHTML = '';
      };

      productAddEventListener(closeBtn, 'click', closeStream);

      productAddEventListener(captureBtn, 'click', () => {
        const canvas = document.getElementById('camera-canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        canvas.toBlob(blob => {
          productHandleNewFiles([blob]);
          closeStream();
        }, 'image/jpeg', 0.9);
      });
    } catch (err) {
      console.error("Error accessing camera: ", err);
      if (typeof Swal !== 'undefined') {
        Swal.fire('خطأ!', 'لم نتمكن من الوصول إلى الكاميرا. يرجى التأكد من منح الإذن اللازم.', 'error');
      } else {
        alert('خطأ في الوصول إلى الكاميرا!');
      }
      cameraModalContainer.style.display = 'none';
    }
  }

  /**
   * @private
   * @function productSetupEventListeners
   * @description يربط جميع مستمعي الأحداث اللازمين للوحدة (الأزرار، السحب والإفلات، إلخ).
   * @returns {boolean} - `true` إذا تم ربط المستمعين بنجاح.
   */
  function productSetupEventListeners() {
    if (!pickFilesBtn || !clearAllBtn || !takePhotoBtn || !fileInput || !uploaderEl) {
      console.error('One or more DOM elements not found for event listeners');
      return false;
    }

    // إزالة المستمعين السابقين أولاً
    productRemoveEventListeners();

    // إضافة مستمعي الأحداث الجدد
    productAddEventListener(pickFilesBtn, 'click', () => {
      fileInput.removeAttribute('capture');
      fileInput.click();
    });

    productAddEventListener(clearAllBtn, 'click', () => productClearAll());

    productAddEventListener(takePhotoBtn, 'click', () => {
      const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
      if (isMobile) {
        console.log('[Camera] Mobile device detected. Using capture attribute.');
        fileInput.setAttribute('capture', 'environment');
        fileInput.click();
      } else {
        console.log('[Camera] Desktop device detected. Using getUserMedia API.');
        productOpenDesktopCamera();
      }
    });

    productAddEventListener(fileInput, 'change', (e) => productHandleNewFiles(e.target.files));

    // سحب وإفلات
    productAddEventListener(uploaderEl, 'dragover', (e) => { 
      e.preventDefault(); 
      uploaderEl.style.borderColor = '#007bff'; 
    });
    
    productAddEventListener(uploaderEl, 'dragleave', (e) => { 
      uploaderEl.style.borderColor = ''; 
    });
    
    productAddEventListener(uploaderEl, 'drop', (e) => { 
      e.preventDefault(); 
      uploaderEl.style.borderColor = ''; 
      productHandleNewFiles(e.dataTransfer.files); 
    });

    return true;
  }

  /**
   * @public
   * @function productInitModule
   * @description الدالة الرئيسية لتهيئة الوحدة. تحصل على عناصر DOM وتربط مستمعي الأحداث.
   * @returns {boolean} - `true` إذا تمت التهيئة بنجاح.
   */
  function productInitModule() {
    console.log('[ProductModule] Initializing module...');

    // الحصول على عناصر DOM
    fileInput = document.getElementById('file-input');
    pickFilesBtn = document.getElementById('pick-files-btn');
    takePhotoBtn = document.getElementById('take-photo-btn');
    clearAllBtn = document.getElementById('clear-all-btn');
    previewsEl = document.getElementById('previews');
    uploaderEl = document.getElementById('image-uploader');

    // التحقق من وجود جميع العناصر
    const elements = { fileInput, pickFilesBtn, takePhotoBtn, clearAllBtn, previewsEl, uploaderEl };
    let missingElements = [];
    
    Object.keys(elements).forEach(key => {
      if (!elements[key]) {
        missingElements.push(key);
      }
    });

    if (missingElements.length > 0) {
      console.error('Required DOM elements for product module not found:', missingElements);
      return false;
    }

    // تهيئة دعم WebP
    WEBP_SUPPORTED_PROMISE = productSupportsWebP();

    // إعداد مستمعي الأحداث
    if (!productSetupEventListeners()) {
      return false;
    }

    console.log('%c[ProductModule] Initialized successfully', 'color: green;');
    return true;
  }

  /**
   * @public
   * @function productResetModule
   * @description يعيد تعيين حالة الوحدة إلى حالتها الأولية، ويمسح الصور ومستمعي الأحداث.
   * @returns {void}
   */
  function productResetModule() {
    console.log('[ProductModule] Resetting module...');
    
    images.length = 0;
    idCounter = 1;
    
    if (previewsEl) {
      previewsEl.innerHTML = '';
    }
    
    // إزالة جميع مستمعي الأحداث
    productRemoveEventListeners();
    
    // إعادة تعيين مراجع DOM
    fileInput = null;
    pickFilesBtn = null;
    takePhotoBtn = null;
    clearAllBtn = null;
    previewsEl = null;
    uploaderEl = null;

    console.log('[ProductModule] Reset completed');
  }

  /**
   * @public
   * @function productCleanupModule
   * @description دالة لتنظيف الوحدة عند إغلاق النموذج، وهي اسم بديل لـ `productResetModule`.
   * @returns {void}
   */
  function productCleanupModule() {
    console.log('[ProductModule] Cleaning up module...');
     // إعادة تعيين لون الخلفية إلى الأصلي
  if (typeof productResetModalBackground === 'function') {
    productResetModalBackground();
  }
    productResetModule();
  }

 /**
  * @description الواجهة العامة للوحدة التي يتم تصديرها إلى `window.productModule`.
  */
return {
  init: productInitModule,
  reset: productResetModule,
  cleanup: productCleanupModule,
  images,
  originalImageNames: [],
  genId: productGenId,
  createPreviewItem: productCreatePreviewItem,
  
  /**
   * @public
   * @function updateImageStatus
   * @description يحدث حالة صورة معينة في مصفوفة `images`.
   * @param {string} imageId - معرف الصورة المراد تحديثها.
   * @param {'pending'|'compressing'|'ready'|'uploading'|'uploaded'|'error'} newStatus - الحالة الجديدة للصورة.
   * @param {string|null} [newFileName=null] - اسم الملف الجديد بعد الرفع.
   */
  updateImageStatus: function(imageId, newStatus, newFileName = null) {
    const image = this.images.find(img => img.id === imageId);
    if (image) {
      image.status = newStatus;
      if (newFileName) {
        image.fileName = newFileName;
      }
      console.log(`[ProductModule] Updated image ${imageId} status to ${newStatus}`);
    }
  },
  
  /**
   * @public
   * @function getImageStatus
   * @description يحصل على الحالة الحالية لصورة معينة.
   * @param {string} imageId - معرف الصورة.
   * @returns {string|null} - حالة الصورة أو `null` إذا لم يتم العثور عليها.
   */
  getImageStatus: function(imageId) {
    const image = this.images.find(img => img.id === imageId);
    return image ? image.status : null;
  }
};
})();