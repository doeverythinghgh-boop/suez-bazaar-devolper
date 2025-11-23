/**
 * @file js/productFormInitializer.js
 * @description يحتوي هذا الملف على المنطق الكامل لتهيئة نموذج إضافة/تعديل المنتج.
 *   يشمل ذلك تهيئة الوحدات، تحميل الفئات، تعبئة النموذج في وضع التعديل، وإعداد مستمعي الأحداث.
 */

/**
 * @description تحديث الوضع الموسع للنموذج بناءً على الوضع الأساسي والفئة المحددة
 * @function productUpdateExtendedMode
 * @returns {string} - الوضع الموسع الحالي
 */
function productUpdateExtendedMode() {
  const form = document.getElementById('add-product-form');
  if (!form) return '';
  
  const baseMode = form.dataset.mode; // 'add' أو 'edit'
  const mainCategorySelect = document.getElementById('main-category');
  const mainCategory = mainCategorySelect ? mainCategorySelect.value : '';
  
  let extendedMode = baseMode;
  
  // تحديد إذا كانت فئة الخدمات
  if (mainCategory === SERVICE_CATEGORY_NoPrice_ID) {
    extendedMode = baseMode + 'InServiceCategory';
  }
  
  // تحديث الخاصية
  form.dataset.extendedMode = extendedMode;
  

  // تحديث لون خلفية النموذج
  productUpdateModalBackground(extendedMode);
  

  // تسجيل التغيير للمطور
  console.log(`%c[ProductForm] 🎯 Extended Mode: ${extendedMode}`, 
    'color: purple; font-weight: bold; font-size: 14px;');
  
  return extendedMode;
}

/**
 * @description تسجيل الحالة الحالية للنموذج للمطور
 * @function productLogCurrentState
 * @param {string} action - وصف الإجراء الحالي
 * @returns {void}
 */
function productLogCurrentState(action = 'State Update') {
  const form = document.getElementById('add-product-form');
  const mainCategory = document.getElementById('main-category');
  
  if (!form || !mainCategory) return;
  
  console.group(`%c📊 Product Form State - ${action}`, 'color: navy; font-weight: bold;');
  console.log(`📍 Base Mode: ${form.dataset.mode || 'undefined'}`);
  console.log(`🎯 Extended Mode: ${form.dataset.extendedMode || 'undefined'}`);
  console.log(`🏷️ Main Category: ${mainCategory.value || 'undefined'}`);
  console.log(`🔧 Service Category ID: ${SERVICE_CATEGORY_NoPrice_ID}`);
  console.log(`🖼️ Images Count: ${window.productModule?.images.length || 0}`);
  console.groupEnd();
}

/**
 * @description الدالة الرئيسية لتهيئة نموذج إضافة/تعديل المنتج. تقوم بتنظيف الحالات السابقة،
 *   وتهيئة الوحدات المطلوبة (مثل وحدة رفع الصور)، وتحميل الفئات، وإعداد مستمعي الأحداث،
 *   وتعبئة النموذج بالبيانات الموجودة مسبقًا في حالة التعديل.
 * @function productInitializeAddProductForm
 * @async
 * @param {object|null} [editProductData=null] - كائن يحتوي على بيانات المنتج للتعديل. إذا كان `null`، يتم تهيئة النموذج لإضافة منتج جديد.
 * @returns {Promise<boolean>} - وعد (Promise) يُرجع `true` إذا تمت التهيئة بنجاح، و`false` بخلاف ذلك.
 * @see productInitializeModules
 * @see productPopulateEditForm
 */
async function productInitializeAddProductForm(editProductData = null) {
  console.log('%c[ProductForm] Initializing form...', 'color: blue;');
  
  // تنظيف الوحدة السابقة أولاً
  if (window.productModule && window.productModule.cleanup) {
    window.productModule.cleanup();
  }
  
  // ⭐⭐ الإصلاح: إعادة تعيين النص والعنوان أولاً ⭐⭐
  const titleElement = document.getElementById('addProductTitle');
  const submitButton = document.querySelector('.add-product-modal__submit-container .btn');
  
  const isEditMode = editProductData !== null;
  
  // ⭐⭐ تحديد النص بناءً على الوضع الحقيقي ⭐⭐
  if (titleElement) {
    titleElement.innerHTML = isEditMode 
      ? '<i class="fas fa-edit"></i> تعديل المنتج'
      : '<i class="fas fa-cart-plus"></i> إضافة منتج جديد';
  }
  
  if (submitButton) {
    submitButton.textContent = isEditMode ? 'حفظ التعديلات' : 'اضف المنتج الآن';
  }
  
  // تهيئة وحدات JavaScript أولاً
  if (!productInitializeModules()) {
    console.error('Failed to initialize product modules');
    return false;
  }
  
  const mainCategorySelect = document.getElementById("main-category");
  const subCategorySelect = document.getElementById("sub-category");
  const form = document.getElementById('add-product-form');
  
  if (!mainCategorySelect || !subCategorySelect || !form) {
    console.error('Required form elements not found');
    return false;
  }

  const images = window.productModule.images;
  images.length = 0;
  window.productModule.originalImageNames = [];

  // ⭐⭐ التحديث: استخدام isEditMode بدلاً من إعادة التعيين ⭐⭐
  form.dataset.mode = isEditMode ? 'edit' : 'add';
  console.log(`[ProductForm] Mode: ${form.dataset.mode}`);
  
  if (isEditMode) {
    form.dataset.productKey = editProductData.product_key;
    console.log(`[ProductForm] Editing product with key: ${editProductData.product_key}`);
  }

  // ... بقية الكود بدون تغيير ...
  try {
    console.log('[ProductForm] Loading categories from ../shared/list.json');
    const response = await fetch("../shared/list.json");
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    const categories = data.categories;

    // تعبئة الفئات الرئيسية
    mainCategorySelect.innerHTML = '<option value="" selected disabled>-- اختر الفئة الرئيسية --</option>';
    categories.forEach((category) => {
      const option = new Option(category.title, category.id);
      mainCategorySelect.add(option);
    });
    console.log('%c[ProductForm] Main categories loaded successfully.', 'color: green;');

    // إعداد مستمع تغيير الفئة الرئيسية
    const mainCategoryHandler = productHandleMainCategoryChange(categories);
    mainCategorySelect.removeEventListener('change', mainCategoryHandler);
    mainCategorySelect.addEventListener("change", mainCategoryHandler);
    
  } catch (error) {
    console.error("%c[ProductForm] Failed to load categories:", 'color: red;', error);
    productShowError(mainCategorySelect, 'فشل في تحميل الفئات. يرجى المحاولة مرة أخرى.');
    return false;
  }

  // إذا كان في وضع التعديل، تعبئة البيانات
  if (isEditMode) {
    productPopulateEditForm(editProductData);
  } else {
    // ⭐⭐ الإصلاح: تنظيف الحقول في وضع الإضافة ⭐⭐
    productResetFormFields();
  }

  // تحديث الحالة الموسعة بعد التهيئة
  setTimeout(() => {
    productUpdateExtendedMode();
    productLogCurrentState('Form Initialized');
  }, 100);

  productSetupCharacterCounters();
  productSetupFormSubmit();
  productSetupCloseButtonListener();
  
  console.log('%c[ProductForm] Form initialized successfully', 'color: green;');
  return true;
}

// ⭐⭐ دالة جديدة لتنظيف الحقول في وضع الإضافة ⭐⭐
function productResetFormFields() {
  console.log('[ProductForm] Resetting form fields for add mode');
  
  const fieldsToReset = [
    'product-name',
    'product-description', 
    'seller-message',
    'product-notes',
    'product-quantity',
    'product-price',
    'original-price'
  ];
  
  fieldsToReset.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.value = '';
      productClearError(field);
    }
  });
  
  // إعادة تعيين الفئات
  const mainCategorySelect = document.getElementById('main-category');
  const subCategorySelect = document.getElementById('sub-category');
  const subCategoryGroup = document.getElementById('sub-category-group');
  
  if (mainCategorySelect) {
    mainCategorySelect.value = '';
    productClearError(mainCategorySelect);
  }
  
  if (subCategorySelect) {
    subCategorySelect.value = '';
    subCategorySelect.disabled = true;
    productClearError(subCategorySelect);
  }
  
  if (subCategoryGroup) {
    subCategoryGroup.style.display = 'none';
  }
  
  // إعادة تعيين نوع الخدمة
  const serviceTypeOptions = document.getElementById('service-type-options');
  const serviceTypeRadios = document.querySelectorAll('input[name="serviceType"]');
  
  if (serviceTypeOptions) {
    serviceTypeOptions.style.display = 'none';
  }
  
  serviceTypeRadios.forEach(radio => {
    radio.checked = false;
    radio.required = false;
  });
  
  // إعادة تعيين الصور
  if (window.productModule && window.productModule.images) {
    window.productModule.images.length = 0;
    window.productModule.originalImageNames = [];
  }
  
  const previewsEl = document.getElementById('previews');
  if (previewsEl) {
    previewsEl.innerHTML = '';
  }
}

/**
 * @description تقوم بتهيئة جميع وحدات JavaScript المطلوبة لنموذج المنتج،
 *   وبشكل أساسي وحدة رفع الصور (`productModule`).
 * @function productInitializeModules
 * @returns {boolean} - `true` إذا تمت تهيئة جميع الوحدات بنجاح، و`false` بخلاف ذلك.
 * @see window.productModule.init
 */
function productInitializeModules() {
  console.log('[ProductForm] Initializing all modules...');
  
  // تهيئة وحدة المنتج
  if (window.productModule && window.productModule.init) {
    if (!window.productModule.init()) {
      console.error('Failed to initialize product module');
      return false;
    }
  } else {
    console.error('Product module not available');
    return false;
  }
  
  return true;
}

/**
 * @description دالة مصنعية (Factory Function) تُرجع معالج حدث لتغيير الفئة الرئيسية.
 *   يقوم المعالج بتحديث قائمة الفئات الفرعية وإظهار/إخفاء حقول السعر والكمية ونوع الخدمة
 *   بناءً على الفئة الرئيسية المحددة.
 * @function productHandleMainCategoryChange
 * @param {Array<object>} categories - مصفوفة من كائنات الفئات التي تم جلبها من `list.json`.
 * @returns {function(Event): void} - دالة معالج الحدث `onchange` التي سيتم ربطها بقائمة الفئات الرئيسية.
 * @see SERVICE_CATEGORY_NoPrice_ID
 */
function productHandleMainCategoryChange(categories) {
  return (event) => {
    const selectedCategoryId = event.target.value;
    const subCategorySelect = document.getElementById("sub-category");
    const subCategoryGroup = document.getElementById("sub-category-group");
    const priceQuantityRow = document.getElementById('price-quantity-row');
    const quantityInput = document.getElementById('product-quantity');
    const priceInput = document.getElementById('product-price');
    const serviceTypeOptions = document.getElementById('service-type-options');
    const serviceTypeRadioInputs = document.querySelectorAll('input[name="serviceType"]');

    if (!subCategorySelect || !subCategoryGroup) return;

    // إعادة تعيين الفئات الفرعية
    subCategorySelect.innerHTML = '<option value="">-- اختر الفئة الفرعية --</option>';
    subCategorySelect.disabled = true;

    // إظهار/إخفاء حقول السعر والكمية
    if (priceQuantityRow && quantityInput && priceInput && serviceTypeOptions) {
      if (selectedCategoryId === SERVICE_CATEGORY_NoPrice_ID) {
        priceQuantityRow.style.display = 'none';
        quantityInput.required = false;
        priceInput.required = false;
        serviceTypeOptions.style.display = 'block';
        serviceTypeRadioInputs.forEach(radio => {
          radio.required = true;
        });
      } else {
        priceQuantityRow.style.display = 'flex';
        quantityInput.required = true;
        priceInput.required = true;
        serviceTypeOptions.style.display = 'none';
        serviceTypeRadioInputs.forEach(radio => {
          radio.checked = false;
          radio.required = false;
        });
      }
    }

    if (!selectedCategoryId) {
      subCategoryGroup.style.display = "none";
      // تحديث الحالة الموسعة
      productUpdateExtendedMode();
      return;
    }

    const selectedCategory = categories.find((cat) => cat.id == selectedCategoryId);

    if (selectedCategory && selectedCategory.subcategories && selectedCategory.subcategories.length > 0) {
      subCategoryGroup.style.display = "flex";
      subCategorySelect.disabled = false;
      selectedCategory.subcategories.forEach((sub) => {
        const option = new Option(sub.title, sub.id);
        subCategorySelect.add(option);
      });
    } else {
      subCategoryGroup.style.display = "none";
    }

    // تحديث الحالة الموسعة بعد معالجة التغيير
    productUpdateExtendedMode();
    productLogCurrentState('Category Changed');
  };
}

/**
 * @description تقوم بتعبئة حقول النموذج ببيانات المنتج الموجودة عند فتح النموذج في وضع التعديل.
 *   يشمل ذلك تحديث عنوان النموذج، تعبئة الحقول النصية، الأسعار، الفئات، والصور الحالية.
 * @function productPopulateEditForm
 * @param {object} editProductData - كائن يحتوي على بيانات المنتج المراد تعديله.
 * @returns {void}
 * @see window.productModule.createPreviewItem
 */
function productPopulateEditForm(editProductData) {
  console.log('[ProductForm] Populating form with existing product data.');
  
  // تحديث العنوان وزر الإرسال
  const titleElement = document.getElementById('addProductTitle');
  const submitButton = document.querySelector('.add-product-modal__submit-container .btn');
  
  if (titleElement) {
    titleElement.innerHTML = '<i class="fas fa-edit"></i> تعديل المنتج';
  }
  if (submitButton) {
    submitButton.textContent = 'حفظ التعديلات';
  }

  // تعبئة الحقول النصية
  document.getElementById('product-name').value = editProductData.productName || '';
  document.getElementById('product-description').value = editProductData.product_description || '';
  document.getElementById('seller-message').value = editProductData.user_message || '';
  document.getElementById('product-notes').value = editProductData.user_note || '';

  // تعبئة السعر والكمية
  const isServiceCategory = editProductData.MainCategory == SERVICE_CATEGORY_NoPrice_ID;
  const quantityInput = document.getElementById('product-quantity');
  const priceInput = document.getElementById('product-price');
  if (quantityInput && priceInput) {
    quantityInput.value = isServiceCategory ? 0 : (editProductData.product_quantity || '');
    priceInput.value = isServiceCategory ? 0 : (editProductData.product_price || '');
  }
  
  const originalPriceInput = document.getElementById('original-price');
  if (originalPriceInput) {
    originalPriceInput.value = editProductData.original_price || '';
  }

  // تعبئة نوع الخدمة
  const serviceTypeOptions = document.getElementById('service-type-options');
  const serviceTypeRadioInputs = document.querySelectorAll('input[name="serviceType"]');
  if (isServiceCategory && editProductData.serviceType > 0 && serviceTypeOptions) {
    serviceTypeOptions.style.display = 'block';
    serviceTypeRadioInputs.forEach(radio => {
      if (radio.value == editProductData.serviceType) {
        radio.checked = true;
      }
      radio.required = true;
    });
  }

  // تعبئة الصور
  if (editProductData.ImageName) {
    console.log('[ProductForm] Loading existing images:', editProductData.ImageName);
    const imageNames = editProductData.ImageName.split(',');
    window.productModule.originalImageNames = [...imageNames];
    
    imageNames.forEach(name => {
      if (!name) return;
      const id = window.productModule.genId();
      const state = {
        id: id,
        file: null,
        compressedBlob: null,
        status: 'uploaded',
        fileName: name
      };
      window.productModule.images.push(state);
      window.productModule.createPreviewItem(state, `https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/${name}`);
    });
  }

  // تعبئة الفئات
  const mainCatId = editProductData.MainCategory;
  const subCatId = editProductData.SubCategory;
  const mainCategorySelect = document.getElementById('main-category');
  const subCategorySelect = document.getElementById('sub-category');

  if (mainCatId && mainCategorySelect) {
    mainCategorySelect.value = mainCatId;
    mainCategorySelect.dispatchEvent(new Event('change'));
  }
  
  if (subCatId && subCategorySelect) {
    setTimeout(() => { 
      subCategorySelect.value = subCatId; 
    }, 100);
  }

  // تحديث الحالة الموسعة بعد تعبئة البيانات
  setTimeout(() => {
    productUpdateExtendedMode();
    productLogCurrentState('Edit Form Populated');
  }, 200);
}

/**
 * @description تقوم بإعداد عدادات الأحرف للحقول النصية (مثل اسم المنتج والوصف)
 *   وتربط مستمعي الأحداث (`input`, `blur`) لتوفير تحقق فوري من صحة البيانات (real-time validation)
 *   أثناء إدخال المستخدم للبيانات.
 * @function productSetupCharacterCounters
 * @returns {void}
 * @see productQuickValidateField
 */
function productSetupCharacterCounters() {
  const fields = [
    { id: 'product-name', counterId: 'product-name-char-counter' },
    { id: 'product-description', counterId: 'description-char-counter' },
    { id: 'seller-message', counterId: 'seller-message-char-counter' },
    { id: 'product-notes', counterId: 'notes-char-counter' }
  ];

  fields.forEach(field => {
    const element = document.getElementById(field.id);
    const counter = document.getElementById(field.counterId);
    
    if (element && counter) {
      element.addEventListener('input', () => {
        const currentLength = element.value.length;
        const maxLength = element.maxLength;
        counter.textContent = `${currentLength} / ${maxLength}`;
        
        // التحقق في الوقت الفعلي
        if (currentLength > 0) {
          productQuickValidateField(element);
        } else {
          productClearError(element);
        }
      });

      // التحقق عند فقدان التركيز
      element.addEventListener('blur', () => {
        productQuickValidateField(element);
      });

      // تشغيل الحدث مرة واحدة لتحديث القيمة الأولية
      element.dispatchEvent(new Event('input'));
    }
  });

  // إعداد مستمعي الأحداث لحقول الأرقام مع التحقق
  productSetupNumberFields();
}

/**
 * @description تقوم بإعداد مستمعي الأحداث لحقول الأرقام (الكمية والسعر) لضمان قبول الأرقام فقط،
 *   وتطبيع الأرقام الهندية، وتوفير تحقق فوري من صحة البيانات.
 *   كما أنها تتحقق من أن السعر الأصلي (قبل الخصم) أكبر من السعر الحالي.
 * @function productSetupNumberFields
 * @returns {void}
 * @see productNormalizeDigits
 * @see productQuickValidateField
 */
function productSetupNumberFields() {
  const quantityInput = document.getElementById('product-quantity');
  const priceInput = document.getElementById('product-price');
  const originalPriceInput = document.getElementById('original-price');

  if (quantityInput) {
    quantityInput.addEventListener('input', () => {
      let value = productNormalizeDigits(quantityInput.value);
      quantityInput.value = value.replace(/[^0-9]/g, '');
      if (quantityInput.value) {
        productQuickValidateField(quantityInput);
      } else {
        productClearError(quantityInput);
      }
    });

    quantityInput.addEventListener('blur', () => {
      productQuickValidateField(quantityInput);
    });
  }

  if (priceInput) {
    priceInput.addEventListener('input', () => {
      let value = productNormalizeDigits(priceInput.value);
      value = value.replace(/[^0-9.]/g, '');
      const parts = value.split('.');
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
      }
      priceInput.value = value;
      if (priceInput.value) {
        productQuickValidateField(priceInput);
      } else {
        productClearError(priceInput);
      }
    });

    priceInput.addEventListener('blur', () => {
      productQuickValidateField(priceInput);
    });
  }

  if (originalPriceInput) {
    originalPriceInput.addEventListener('input', () => {
      let value = productNormalizeDigits(originalPriceInput.value);
      value = value.replace(/[^0-9.]/g, '');
      const parts = value.split('.');
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
      }
      originalPriceInput.value = value;
      
      // التحقق من أن السعر الأصلي أكبر من السعر الحالي
      const priceInput = document.getElementById('product-price');
      if (originalPriceInput.value && priceInput && priceInput.value) {
        const originalPrice = parseFloat(originalPriceInput.value);
        const currentPrice = parseFloat(priceInput.value);
        if (originalPrice <= currentPrice) {
          productShowError(originalPriceInput, 'السعر قبل الخصم يجب أن يكون أكبر من السعر الحالي.');
        } else {
          productClearError(originalPriceInput);
        }
      } else {
        productClearError(originalPriceInput);
      }
    });
  }

  // التحقق من الفئات عند التغيير
  const mainCategorySelect = document.getElementById('main-category');
  const subCategorySelect = document.getElementById('sub-category');
  
  if (mainCategorySelect) {
    mainCategorySelect.addEventListener('change', () => {
      productClearError(mainCategorySelect);
    });
  }
  
  if (subCategorySelect) {
    subCategorySelect.addEventListener('change', () => {
      productClearError(subCategorySelect);
    });
  }
}


/**
 * @description تحديث لون خلفية النموذج بناءً على الوضع الموسع.
 *   يتم تطبيق خلفية خاصة عندما يكون المنتج في فئة الخدمات.
 * @function productUpdateModalBackground
 * @param {string} extendedMode - الوضع الموسع الحالي (مثل 'addInServiceCategory').
 * @returns {void}
 */
function productUpdateModalBackground(extendedMode) {
  console.group('%c[ProductForm] 🎨 Background Update - Targeting Correct Element', 'color: orange; font-weight: bold;');
  
  // العنصر الصحيح هو .add-product-modal فقط
  const targetElement = document.querySelector('.add-product-modal');
  
  if (!targetElement) {
    console.error('%c[ProductForm] 🎨 Target element .add-product-modal not found!', 'color: red;');
    console.groupEnd();
    return;
  }

  console.log('%c[ProductForm] 🎨 Found correct target element:', 'color: green;', targetElement);

  // حفظ الخلفية الأصلية إذا لم يتم حفظها
  if (!targetElement.dataset.originalBackground) {
    const computedStyle = window.getComputedStyle(targetElement);
    const originalBackground = computedStyle.backgroundColor || computedStyle.background;
    targetElement.dataset.originalBackground = originalBackground;
    console.log('%c[ProductForm] 🎨 Original background saved:', 'color: blue;', originalBackground);
  }

  const serviceBackground = window.SERVICE_CATEGORY_BACKGROUND || '#f5f5f5';
  console.log('%c[ProductForm] 🎨 Service background to apply:', 'color: purple;', serviceBackground);

  const isServiceMode = extendedMode === 'addInServiceCategory' || extendedMode === 'editInServiceCategory';
  
  if (isServiceMode) {
    // تطبيق خلفية الخدمات على العنصر الصحيح فقط
    console.log('%c[ProductForm] 🎨 APPLYING SERVICE BACKGROUND TO .add-product-modal', 'color: green; font-weight: bold;');
    
    // طريقة مباشرة وقوية
    targetElement.style.backgroundColor = serviceBackground;
    targetElement.style.background = serviceBackground;
    targetElement.classList.add('service-category-active');
    
    console.log('%c[ProductForm] 🎨 Service background applied to correct element', 'color: green;');
    
  } else {
    // إعادة الخلفية الأصلية
    console.log('%c[ProductForm] 🎨 RESTORING ORIGINAL BACKGROUND', 'color: blue; font-weight: bold;');
    
    const originalBackground = targetElement.dataset.originalBackground;
    targetElement.style.backgroundColor = originalBackground;
    targetElement.style.background = originalBackground;
    targetElement.classList.remove('service-category-active');
    
    console.log('%c[ProductForm] 🎨 Original background restored to correct element', 'color: blue;');
  }

  // فحص نهائي
  const finalStyle = window.getComputedStyle(targetElement);
  console.log('%c[ProductForm] 🎨 Final background of .add-product-modal:', 'color: teal;', finalStyle.backgroundColor);
  console.groupEnd();
}



/**
 * @description إعادة تعيين لون خلفية النموذج إلى حالته الأصلية.
 *   يتم استدعاؤها عند إغلاق النموذج لضمان عدم تأثر الفتح التالي.
 * @function productResetModalBackground
 * @returns {void}
 */
function productResetModalBackground() {
  console.log('%c[ProductForm] 🎨 RESET Background - Targeting .add-product-modal only', 'color: red; font-weight: bold;');
  
  // استهدف فقط .add-product-modal
  const targetElement = document.querySelector('.add-product-modal');
  
  if (!targetElement) {
    console.error('%c[ProductForm] 🎨 Target element .add-product-modal not found for reset!', 'color: red;');
    return;
  }

  console.log('%c[ProductForm] 🎨 Resetting only .add-product-modal element', 'color: orange;');

  // إعادة الخلفية الأصلية
  if (targetElement.dataset.originalBackground) {
    targetElement.style.backgroundColor = targetElement.dataset.originalBackground;
    targetElement.style.background = targetElement.dataset.originalBackground;
    console.log('%c[ProductForm] 🎨 Restored original background:', 'color: green;', targetElement.dataset.originalBackground);
  } else {
    // إذا لم تكن الخلفية الأصلية محفوظة، إعادة تعيين
    targetElement.style.removeProperty('background-color');
    targetElement.style.removeProperty('background');
    console.log('%c[ProductForm] 🎨 Removed background properties', 'color: green;');
  }
  
  // إزالة الكلاسات
  targetElement.classList.remove('service-category-active');
  targetElement.classList.remove('service-category-mode');
  
  console.log('%c[ProductForm] 🎨 Background reset completed for .add-product-modal', 'color: green; font-weight: bold;');
}






/**
 * @description فحص وتصحيح الخلفية الحالية
 * @function productDebugBackground
 * @returns {void}
 */
function productDebugBackground() {
  const modal = document.querySelector('.add-product-modal');
  const modalMainContent = document.getElementById('modal-main-content');
  
  console.group('%c[ProductForm] 🎨 Background Debug', 'color: orange; font-weight: bold;');
  console.log('Modal element:', modal);
  console.log('Modal main content:', modalMainContent);
  
  if (modal) {
    const computedStyle = window.getComputedStyle(modal);
    console.log('Modal computed background:', computedStyle.backgroundColor);
    console.log('Modal inline background:', modal.style.backgroundColor);
    console.log('Modal dataset original:', modal.dataset.originalBackground);
  }
  
  if (modalMainContent) {
    const computedStyle = window.getComputedStyle(modalMainContent);
    console.log('Main content computed background:', computedStyle.backgroundColor);
    console.log('Main content inline background:', modalMainContent.style.backgroundColor);
    console.log('Main content dataset original:', modalMainContent.dataset.originalBackground);
  }
  console.groupEnd();
}

/**
 * @description إعداد مستمع حدث لزر إغلاق النموذج
 * @function productSetupCloseButtonListener
 * @returns {void}
 */
function productSetupCloseButtonListener() {
  const closeButton = document.getElementById('add-product-modal-close-btn');
  const modalContainer = document.querySelector('.add-product-modal');
  
  if (closeButton) {
    // إزالة أي مستمعين سابقين لمنع التكرار
    closeButton.removeEventListener('click', productHandleCloseButton);
    closeButton.addEventListener('click', productHandleCloseButton);
    console.log('%c[ProductForm] 🔒 Close button listener setup', 'color: gray;');
  }
  
  if (modalContainer) {
    // أيضًا نستمع لأي حدث إغلاق خارجي
    modalContainer.removeEventListener('close', productHandleCloseButton);
    modalContainer.addEventListener('close', productHandleCloseButton);
  }
}



/**
 * @description معالج حدث النقر على زر إغلاق النموذج.
 *   يضمن إعادة تعيين خلفية النموذج إلى حالتها الأصلية.
 * @function productHandleCloseButton
 */
function productHandleCloseButton() {
  console.log('%c[ProductForm] 🔒 Close button - RESETTING .add-product-modal ONLY', 'color: red; font-weight: bold;');
  
  // إعادة تعيين فورية للعنصر الصحيح فقط
  setTimeout(() => {
    if (typeof productResetModalBackground === 'function') {
      productResetModalBackground();
    }
    
    // تنظيف إضافي مضمون
    const modalElement = document.querySelector('.add-product-modal');
    if (modalElement) {
      modalElement.style.cssText = '';
      modalElement.className = modalElement.className.replace(/service-category-\w+/g, '');
    }
    
    console.log('%c[ProductForm] 🔒 .add-product-modal background fully reset after close', 'color: green;');
  }, 50);
}




// جعل الدالة متاحة عالميًا
window.productInitializeAddProductForm = productInitializeAddProductForm;
window.productUpdateExtendedMode = productUpdateExtendedMode;
window.productLogCurrentState = productLogCurrentState;