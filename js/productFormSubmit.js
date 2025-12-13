/**
 * @file js/productFormSubmit.js
 * @description Contains logic for handling product form submission, including validation, image upload, and data saving.
 */

/**
 * @description Binds the submit event handler to the add product form.
 *   Removes any previous handlers to prevent duplication.
 * @function productSetupFormSubmit
 * @returns {void}
 * @throws {Error} - If the form element (`add-product-form`) is not found in the DOM.
 * @see productHandleFormSubmit
 */
function productSetupFormSubmit() {
  const form = document.getElementById('add-product-form');

  if (!form) {
    console.error('Form element not found for submit handler');
    return;
  }

  // Remove any previous listeners to prevent duplication
  form.removeEventListener('submit', productHandleFormSubmit);

  form.addEventListener('submit', productHandleFormSubmit);
}

/**
 * @description Main handler for form submission event. Prevents default behavior,
 *   validates fields via `productValidateForm`, then starts the actual submission process.
 * @function productHandleFormSubmit
 * @async
 * @param {Event} e - كائن حدث إرسال النموذج.
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
 * @throws {Error} - If `productValidateForm` fails or `productProcessFormSubmission` encounters an error.
 * @see productValidateForm
 */
async function productHandleFormSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('add-product-form');
  const extendedMode = form ? form.dataset.extendedMode : 'unknown';

  console.log(`%c[إرسال] 🚀 تقديم النموذج في الوضع: ${extendedMode}`,
    'color: blue; font-weight: bold;');

  // Validation
  if (!productValidateForm()) {
    console.warn('[ProductForm] فشل التحقق من الصحة. تم إلغاء الإرسال.');
    return;
  }

  // Process submission
  await productProcessFormSubmission();
}

/**
 * @description Coordinates the full form submission process after validation passes.
 *   Includes showing loading message, deleting old images (in edit mode), uploading new images,
 *   preparing product data, saving to database, and finally showing success message.
 * @function productProcessFormSubmission
 * @async
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
 * @throws {Error} - إذا فشلت أي خطوة حرجة في العملية (مثل رفع الصور أو الحفظ في قاعدة البيانات).
 * @see productHandleImageDeletion
 * @see productUploadImages
 * @see productPrepareProductData
 * @see productSaveToDatabase
 * @see productShowSuccessMessage
 */
async function productProcessFormSubmission() {
  const form = document.getElementById('add-product-form');
  const extendedMode = form ? form.dataset.extendedMode : 'unknown';

  console.log(`%c[ProductForm] اجتياز التحقق من الصحة. البدء في عملية الإرسال في الوضع: ${extendedMode}.`, 'color: green;');

  // Use SweetAlert2 if available, otherwise use standard log/alert
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: form.dataset.mode === 'edit' ? 'جاري تحديث المنتج...' : 'جاري إضافة المنتج...',
      text: 'الرجاء الانتظار قليلاً بينما يتم رفع الصور.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
  } else {
    console.log('جاري حفظ المنتج...');
  }

  try {
    const productSerial = form.dataset.mode === 'edit' ?
      form.dataset.productKey : productGenerateProductSerial();

    // Delete old images in edit mode
    if (form.dataset.mode === 'edit') {
      await productHandleImageDeletion();
    }

    // Upload new images and get file names
    const uploadedImageFiles = await productUploadImages(productSerial);

    // Aggregate product data with updated images
    const productData = productPrepareProductData(productSerial, uploadedImageFiles);

    // Save to database
    await productSaveToDatabase(productData, form.dataset.mode);

    // Show success message
    await productShowSuccessMessage(form.dataset.mode);

  } catch (error) {
    console.error('%c[ProductForm] فشل الإرسال بسبب خطأ جسيم:', 'color: red; font-weight: bold;', error);

    if (typeof Swal !== 'undefined') {
      console.error('خطأ!', `فشل في حفظ المنتج: ${error.message}`, 'error');
    } else {
      console.error(`فشل في حفظ المنتج: ${error.message}`);
    }
  }
}

/**
 * @description In product edit mode, this function identifies images removed by the user
 *   and deletes them from cloud storage (Cloudflare R2) before uploading new images.
 * @function productHandleImageDeletion
 * @async
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
 * @throws {Error} - If `deleteFile2cf` fails to delete an image.
 * @see deleteFile2cf
 */
async function productHandleImageDeletion() {
  const originalImageNames = window.productModule.originalImageNames || [];
  const currentImages = window.productModule.images || [];

  // Get current image names (old and new)
  const currentImageNames = currentImages.map(state => {
    // If image is already uploaded, use fileName, otherwise it's new and will be uploaded
    return state.status === 'uploaded' ? state.fileName : null;
  }).filter(Boolean);

  console.log('[ProductForm] الصور الأصلية:', originalImageNames);
  console.log('[ProductForm] الصور الحالية:', currentImageNames);

  // Identify deleted images: present in original but not in current
  const imagesToDelete = originalImageNames.filter(name => !currentImageNames.includes(name));

  if (imagesToDelete.length > 0) {
    console.log("[ProductForm] حذف الصور القديمة:", imagesToDelete);
    await Promise.all(imagesToDelete.map(name =>
      deleteFile2cf(name, (msg) => console.log('[حذف من Cloudflare]', msg))
        .catch(err => console.error(`فشل حذف الملف ${name}:`, err))
    ));
  } else {
    console.log("[ProductForm] لا توجد صور قديمة للحذف");
  }
}

/**
 * @description Uploads new images (status 'ready') to cloud storage.
 *   Generates unique file names for each image based on product serial and uses `uploadFile2cf` for actual upload.
 * @function productUploadImages
 * @async
 * @param {string} productSerial - Unique product serial used for naming files.
 * @returns {Promise<string[]>} - Promise containing array of uploaded file names.
 * @throws {Error} - إذا كانت دالة `uploadFile2cf` غير متاحة.
 * @see uploadFile2cf
 */
async function productUploadImages(productSerial) {
  const uploadedImageFiles = [];
  const imagesToUpload = window.productModule.images.filter(s => s.status === 'ready');

  console.log(`[ProductForm] جاري رفع ${imagesToUpload.length} صور جديدة...`);

  for (let i = 0; i < window.productModule.images.length; i++) {
    const state = window.productModule.images[i];

    // Upload only new images (status === 'ready')
    if (state.status !== 'ready' || !state.compressedBlob) continue;

    // Generate unique file name
    const timestamp = Date.now();
    const fileName = `${i + 1}_${productSerial}_${timestamp}.webp`;

    // Check if upload function exists
    if (typeof uploadFile2cf !== 'function') {
      throw new Error('دالة رفع الملفات غير متاحة (uploadFile2cf)');
    }

    console.log(`[ProductForm] جاري رفع صورة جديدة: ${fileName}`);
    const result = await uploadFile2cf(state.compressedBlob, fileName,
      (msg) => console.log('[رفع إلى Cloudflare]', msg));

    console.log(`[ProductForm] تم رفع صورة جديدة: ${result.file}`);

    // Update image status to reflect it's now uploaded
    state.status = 'uploaded';
    state.fileName = result.file;

    uploadedImageFiles.push(result.file);
  }

  return uploadedImageFiles;
}

/**
 * @description Collects all data from form fields, including uploaded image names,
 *   and prepares it in a structured object for API submission.
 *   Handles special cases like Services category (where price and quantity are set to 0).
 * @function productPrepareProductData
 * @param {string} productSerial - Unique product serial.
 * @param {string[]} uploadedImageFiles - Array of newly uploaded image names.
 * @returns {object} - Object containing all product data ready to save.
 * @throws {Error} - If `user_key` not found in `localStorage`.
 * @see productNormalizeArabicText
 */
function productPrepareProductData(productSerial, uploadedImageFiles) {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || !user.user_key) {
    throw new Error("لم يتم العثور على مفتاح المستخدم (user_key). الرجاء تسجيل الدخول مرة أخرى.");
  }

  const mainCatForSubmit = document.getElementById('main-category').value;
  let finalServiceType = 0;

  // Handle Services category
  if (mainCatForSubmit === SERVICE_CATEGORY_NoPrice_ID) {
    console.log('[ProductForm] تم اكتشاف فئة خدمات. فرض السعر والكمية إلى 0 قبل الإرسال.');
    document.getElementById('product-price').value = 0;
    document.getElementById('product-quantity').value = 0;

    const selectedServiceTypeRadio = document.querySelector('input[name="serviceType"]:checked');
    if (selectedServiceTypeRadio) {
      finalServiceType = parseInt(selectedServiceTypeRadio.value, 10);
    }
  }

  // Aggregate all final image names
  const finalImageNames = [];

  // Add current images (old and new)
  window.productModule.images.forEach(state => {
    if (state.fileName) {
      finalImageNames.push(state.fileName);
    }
  });

  // Add newly uploaded images (if fileName missing in state)
  uploadedImageFiles.forEach(fileName => {
    if (!finalImageNames.includes(fileName)) {
      finalImageNames.push(fileName);
    }
  });

  console.log('[ProductForm] أسماء الصور النهائية:', finalImageNames);

  return {
    productName: productNormalizeArabicText(document.getElementById('product-name').value.trim()),
    user_key: user.user_key,
    product_key: productSerial,
    product_description: productNormalizeArabicText(document.getElementById('product-description').value.trim()),
    product_price: parseFloat(document.getElementById('product-price').value) || 0,
    product_quantity: parseInt(document.getElementById('product-quantity').value, 10) || 0,
    original_price: parseFloat(document.getElementById('original-price').value) || null,
    user_message: productNormalizeArabicText(document.getElementById('seller-message').value.trim()),
    user_note: productNormalizeArabicText(document.getElementById('product-notes').value.trim()),
    ImageName: finalImageNames.join(','),
    MainCategory: document.getElementById('main-category').value,
    SubCategory: document.getElementById('sub-category').value,
    ImageIndex: finalImageNames.length,
    serviceType: finalServiceType
  };
}

/**
 * @description Saves product data to database by calling `addProduct` (for add)
 *   or `updateProduct` (for edit) based on current form mode.
 * @function productSaveToDatabase
 * @async
 * @param {object} productData - Product data object to save.
 * @param {'add' | 'edit'} mode - Current form mode ('add' or 'edit').
 * @returns {Promise<void>} - Promise that resolves when complete.
 * @throws {Error} - If save operation fails or `addProduct`/`updateProduct` functions are unavailable.
 * @see addProduct
 * @see updateProduct
 */
async function productSaveToDatabase(productData, mode) {
  let dbResult;

  if (mode === 'edit') {
    console.log('[ProductForm] إرسال طلب تحديث إلى الواجهة الخلفية...');
    if (typeof updateProduct !== 'function') {
      throw new Error('دالة تحديث المنتج غير متاحة (updateProduct)');
    }
    dbResult = await updateProduct(productData);
  } else {
    console.log('[ProductForm] إرسال طلب إضافة إلى الواجهة الخلفية...');
    if (typeof addProduct !== 'function') {
      throw new Error('دالة إضافة المنتج غير متاحة (addProduct)');
    }
    dbResult = await addProduct(productData);
  }

  if (dbResult && dbResult.error) {
    throw new Error(`فشل حفظ بيانات المنتج: ${dbResult.error}`);
  }

  console.log('%c[ProductForm] تم حفظ المنتج في قاعدة البيانات بنجاح.', 'color: green; font-weight: bold;');
}

/**
 * @description Shows success message to user using SweetAlert2 after successful add or update.
 *   After message, closes the modal and updates "My Products" list.
 * @function productShowSuccessMessage
 * @async
 * @param {'add' | 'edit'} mode - Mode to determine partial success message.
 * @returns {Promise<void>} - Promise that resolves when complete.
 * @see Swal.fire
 */
async function productShowSuccessMessage(mode) {
  const successMessage = mode === 'edit' ?
    'تم تحديث المنتج بنجاح.' : 'تم إضافة المنتج بنجاح.';

  if (typeof Swal !== 'undefined') {
    await Swal.fire('تم بنجاح!', successMessage, 'success');
  } else {
    alert(successMessage);
  }

  // Close the modal
  const closeBtn = document.getElementById("add-product-modal-close-btn");
  if (closeBtn) closeBtn.click();

  // Update "My Products" view
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  if (loggedInUser && typeof showMyProducts === 'function') {
    showMyProducts(loggedInUser.user_key);
  }
}

// Make functions globally available
window.productSetupFormSubmit = productSetupFormSubmit;
window.productHandleFormSubmit = productHandleFormSubmit;