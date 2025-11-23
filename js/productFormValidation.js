/**
 * @file js/productFormValidation.js
 * @description يحتوي هذا الملف على دوال التحقق من صحة نموذج إضافة المنتج وعرض رسائل الخطأ المتعلقة به.
 */

/**
 * @description يظهر رسالة خطأ أسفل العنصر المحدد في نموذج إضافة المنتج.
 *   يقوم بإنشاء عنصر `div` جديد يحتوي على رسالة الخطأ ويدرجه في DOM بعد العنصر المستهدف.
 * @function productShowError
 * @param {HTMLElement} element - عنصر DOM الذي ستظهر رسالة الخطأ أسفله.
 * @param {string} message - رسالة الخطأ المراد عرضها.
 * @returns {void}
 * @see productClearError
 */
function productShowError(element, message) {
  if (!element) {
    console.error('Cannot show error: element is null');
    return;
  }
  
  productClearError(element);
  const errorDiv = document.createElement('div');
  errorDiv.className = 'add-product-modal__error-message';
  errorDiv.textContent = message;
  errorDiv.style.color = '#e74c3c';
  errorDiv.style.fontSize = '14px';
  errorDiv.style.marginTop = '5px';
  errorDiv.style.textAlign = 'right';
  
  // إدراج رسالة الخطأ بعد العنصر مباشرة
  element.parentNode.insertBefore(errorDiv, element.nextSibling);
}

/**
 * @description يمسح أي رسالة خطأ موجودة أسفل العنصر المحدد.
 *   يبحث عن عنصر رسالة الخطأ المرتبط بالعنصر المستهدف ويزيله من DOM.
 * @function productClearError
 * @param {HTMLElement} element - عنصر DOM الذي سيتم مسح رسالة الخطأ من أسفله.
 * @returns {void}
 */
function productClearError(element) {
  if (!element) return;
  
  const parent = element.parentNode;
  if (!parent) return;
  
  const errorDiv = parent.querySelector('.add-product-modal__error-message');
  if (errorDiv && errorDiv.parentNode === parent) {
    parent.removeChild(errorDiv);
  }
}

/**
 * @description يقوم بالتحقق الشامل من صحة جميع حقول نموذج إضافة/تعديل المنتج قبل إرساله.
 *   يتحقق من الحقول المطلوبة مثل الصور، الفئات، اسم المنتج، الوصف، السعر، والكمية.
 *   يعرض رسائل خطأ للمستخدم في حالة عدم الصحة ويقوم بالتمرير إلى أول خطأ.
 * @function productValidateForm
 * @returns {boolean} - `true` إذا كان النموذج صالحًا وجاهزًا للإرسال، وإلا `false`.
 * @see productShowError
 * @see productClearError
 */
function productValidateForm() {
  console.log('[ProductForm] Starting validation...');
  
  let isValid = true;
  const images = window.productModule ? window.productModule.images : [];
  const uploaderEl = document.getElementById('image-uploader');
  
  console.log('[ProductForm] Images count:', images.length);
  console.log('[ProductForm] Uploader element:', uploaderEl);

  // 1. التحقق من وجود صورة واحدة على الأقل
  if (uploaderEl) {
    productClearError(uploaderEl);
  }
  
  if (images.length === 0) {
    console.log('[ProductForm] No images found - showing error');
    if (uploaderEl) {
      productShowError(uploaderEl, 'يجب إضافة صورة واحدة على الأقل للمنتج.');
    } else {
      console.error('Uploader element not found for showing image error');
    }
    isValid = false;
  } else {
    console.log('[ProductForm] Images validation passed');
  }

  // 2. التحقق من اختيار فئة رئيسية
  const mainCategorySelect = document.getElementById('main-category');
  if (mainCategorySelect) {
    productClearError(mainCategorySelect);
    if (!mainCategorySelect.value) {
      productShowError(mainCategorySelect, 'يجب اختيار فئة رئيسية.');
      isValid = false;
    }
  }

  // 3. التحقق من اختيار فئة فرعية (إذا كانت ظاهرة ومطلوبة)
  const subCategoryGroup = document.getElementById('sub-category-group');
  const subCategorySelect = document.getElementById('sub-category');
  if (subCategorySelect) {
    productClearError(subCategorySelect);
    if (subCategoryGroup && subCategoryGroup.style.display === 'flex' && !subCategorySelect.value) {
      productShowError(subCategorySelect, 'يجب اختيار فئة فرعية.');
      isValid = false;
    }
  }

  // 4. التحقق من وجود اسم للمنتج
  const productNameInput = document.getElementById('product-name');
  if (productNameInput) {
    productClearError(productNameInput);
    if (!productNameInput.value.trim()) {
      productShowError(productNameInput, 'اسم المنتج مطلوب.');
      isValid = false;
    } else if (productNameInput.value.trim().length < 2) {
      productShowError(productNameInput, 'اسم المنتج يجب أن يكون على الأقل حرفين.');
      isValid = false;
    }
  }

  // 5. التحقق من وجود وصف للمنتج
  const descriptionTextarea = document.getElementById('product-description');
  if (descriptionTextarea) {
    productClearError(descriptionTextarea);
    if (!descriptionTextarea.value.trim()) {
      productShowError(descriptionTextarea, 'وصف المنتج مطلوب.');
      isValid = false;
    } else if (descriptionTextarea.value.trim().length < 10) {
      productShowError(descriptionTextarea, 'وصف المنتج يجب أن يكون على الأقل 10 أحرف.');
      isValid = false;
    }
  }

  // 6. التحقق من وجود رسالة من البائع
  const sellerMessageTextarea = document.getElementById('seller-message');
  if (sellerMessageTextarea) {
    productClearError(sellerMessageTextarea);
    if (!sellerMessageTextarea.value.trim()) {
      productShowError(sellerMessageTextarea, 'رسالة البائع مطلوبة.');
      isValid = false;
    } else if (sellerMessageTextarea.value.trim().length < 10) {
      productShowError(sellerMessageTextarea, 'رسالة البائع يجب أن تكون على الأقل 10 أحرف.');
      isValid = false;
    }
  }

  const mainCategoryId = mainCategorySelect ? mainCategorySelect.value : null;

  // 7. التحقق من الكمية (للفئات غير الخدمات)
  const quantityInput = document.getElementById('product-quantity');
  if (quantityInput) {
    productClearError(quantityInput);
    if (mainCategoryId !== SERVICE_CATEGORY_NoPrice_ID && (!quantityInput.value || parseFloat(quantityInput.value) < 1)) {
      productShowError(quantityInput, 'يجب إدخال كمية متاحة صالحة (1 على الأقل).');
      isValid = false;
    }
  }

  // 8. التحقق من السعر (للفئات غير الخدمات)
  const priceInput = document.getElementById('product-price');
  if (priceInput) {
    productClearError(priceInput);
    if (mainCategoryId !== SERVICE_CATEGORY_NoPrice_ID && (priceInput.value === '' || parseFloat(priceInput.value) <= 0)) {
      productShowError(priceInput, 'يجب إدخال سعر صالح للمنتج (أكبر من 0).');
      isValid = false;
    }
  }

  // 9. التحقق من نوع الخدمة (للفئة 6 فقط)
  if (mainCategoryId === SERVICE_CATEGORY_NoPrice_ID) {
    const selectedServiceType = document.querySelector('input[name="serviceType"]:checked');
    const serviceTypeOptions = document.getElementById('service-type-options');
    if (serviceTypeOptions) {
      productClearError(serviceTypeOptions);
      if (!selectedServiceType) {
        productShowError(serviceTypeOptions, 'يجب اختيار نوع الخدمة.');
        isValid = false;
      }
    }
  }

  // 10. التحقق من أن السعر الأصلي أكبر من السعر الحالي (إذا تم إدخاله)
  const originalPriceInput = document.getElementById('original-price');
  if (originalPriceInput && originalPriceInput.value && priceInput && priceInput.value) {
    const originalPrice = parseFloat(originalPriceInput.value);
    const currentPrice = parseFloat(priceInput.value);
    if (originalPrice <= currentPrice) {
      productShowError(originalPriceInput, 'السعر قبل الخصم يجب أن يكون أكبر من السعر الحالي.');
      isValid = false;
    }
  }

  if (!isValid) {
    console.warn('[ProductForm] Validation failed with errors');
    
    // التمرير إلى أول حقل به خطأ
    setTimeout(() => {
      const firstErrorElement = document.querySelector('.add-product-modal__error-message');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }, 100);
  } else {
    console.log('%c[ProductForm] Validation passed successfully.', 'color: green;');
  }

  return isValid;
}

/**
 * @description يقوم بالتحقق السريع من صحة حقل واحد في النموذج، ويُستخدم عادةً في الوقت الفعلي (أثناء الإدخال أو عند فقدان التركيز).
 *   يوفر تغذية راجعة فورية للمستخدم حول صحة البيانات التي يدخلها.
 * @function productQuickValidateField
 * @param {HTMLInputElement|HTMLTextAreaElement} field - عنصر حقل النموذج المراد التحقق منه.
 * @returns {boolean} - `true` إذا كان الحقل صالحًا، وإلا `false`.
 * @see productShowError
 * @see productClearError
 */
function productQuickValidateField(field) {
  if (!field) return true;
  
  const fieldId = field.id;
  let isValid = true;
  let errorMessage = '';

  switch (fieldId) {
    case 'product-name':
      if (!field.value.trim()) {
        errorMessage = 'اسم المنتج مطلوب.';
        isValid = false;
      } else if (field.value.trim().length < 2) {
        errorMessage = 'اسم المنتج يجب أن يكون على الأقل حرفين.';
        isValid = false;
      }
      break;

    case 'product-description':
      if (!field.value.trim()) {
        errorMessage = 'وصف المنتج مطلوب.';
        isValid = false;
      } else if (field.value.trim().length < 10) {
        errorMessage = 'وصف المنتج يجب أن يكون على الأقل 10 أحرف.';
        isValid = false;
      }
      break;

    case 'seller-message':
      if (!field.value.trim()) {
        errorMessage = 'رسالة البائع مطلوبة.';
        isValid = false;
      } else if (field.value.trim().length < 10) {
        errorMessage = 'رسالة البائع يجب أن تكون على الأقل 10 أحرف.';
        isValid = false;
      }
      break;

    case 'product-quantity':
      const mainCategorySelect = document.getElementById('main-category');
      const mainCategoryId = mainCategorySelect ? mainCategorySelect.value : null;
      if (mainCategoryId !== SERVICE_CATEGORY_NoPrice_ID && (!field.value || parseFloat(field.value) < 1)) {
        errorMessage = 'يجب إدخال كمية متاحة صالحة (1 على الأقل).';
        isValid = false;
      }
      break;

    case 'product-price':
      const mainCategorySelect2 = document.getElementById('main-category');
      const mainCategoryId2 = mainCategorySelect2 ? mainCategorySelect2.value : null;
      if (mainCategoryId2 !== SERVICE_CATEGORY_NoPrice_ID && (field.value === '' || parseFloat(field.value) <= 0)) {
        errorMessage = 'يجب إدخال سعر صالح للمنتج (أكبر من 0).';
        isValid = false;
      }
      break;
  }

  if (!isValid) {
    productShowError(field, errorMessage);
  } else {
    productClearError(field);
  }

  return isValid;
}

// جعل الدوال متاحة عالميًا
window.productValidateForm = productValidateForm;
window.productQuickValidateField = productQuickValidateField;