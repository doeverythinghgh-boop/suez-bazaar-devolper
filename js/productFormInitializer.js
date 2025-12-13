/**
 * @file js/productFormInitializer.js
 * @description Contains the logic for initializing the product add/edit form.
 *   This includes initializing modules, loading categories, populating the form in edit mode, and setting up event listeners.
 */

/**
 * @description Update the extended mode of the form based on the base mode and selected category.
 * @function productUpdateExtendedMode
 * @returns {string} - Current extended mode.
 */
function productUpdateExtendedMode() {
  const form = document.getElementById('add-product-form');
  if (!form) return '';

  const baseMode = form.dataset.mode; // 'add' or 'edit'
  const mainCategorySelect = document.getElementById('main-category');
  const mainCategory = mainCategorySelect ? mainCategorySelect.value : '';

  let extendedMode = baseMode;

  // Determine if it is a service category
  if (mainCategorySelect.value === SERVICE_CATEGORY_NoPrice_ID) {
    extendedMode = baseMode + 'InServiceCategory';
  }

  // Update the property
  form.dataset.extendedMode = extendedMode;


  // Update form background color
  productUpdateModalBackground(extendedMode);


  // Log change for developer
  console.log(`%c[ProductForm] 🎯 Extended Mode: ${extendedMode}`,
    'color: purple; font-weight: bold; font-size: 14px;');

  return extendedMode;
}

/**
 * @description Log the current state of the form for the developer.
 * @function productLogCurrentState
 * @param {string} action - Description of the current action.
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
 * @description Main function to initialize the product add/edit form. Cleans up previous states,
 *   initializes required modules (like image upload module), loads categories, sets up event listeners,
 *   and populates the form with existing data in edit mode.
 * @function productInitializeAddProductForm
 * @async
 * @param {object|null} [editProductData=null] - Object containing product data for editing. If `null`, initializes form for adding a new product.
 * @returns {Promise<boolean>} - Promise returning `true` if initialization is successful, `false` otherwise.
 * @see productInitializeModules
 * @see productPopulateEditForm
 */
async function productInitializeAddProductForm(editProductData = null) {
  console.log('%c[ProductForm] Initializing form...', 'color: blue;');

  // Clean up previous module first
  if (window.productModule && window.productModule.cleanup) {
    window.productModule.cleanup();
  }

  // ⭐⭐ Fix: Reset text and title first ⭐⭐
  const titleElement = document.getElementById('addProductTitle');
  const submitButton = document.querySelector('.add-product-modal__submit-container .btn');

  const isEditMode = editProductData !== null;

  // ⭐⭐ Determine text based on real mode ⭐⭐
  if (titleElement) {
    titleElement.innerHTML = isEditMode
      ? '<i class="fas fa-edit"></i> تعديل المنتج'
      : '<i class="fas fa-cart-plus"></i> إضافة منتج جديد';
  }

  if (submitButton) {
    submitButton.textContent = isEditMode ? 'حفظ التعديلات' : 'اضف المنتج الآن';
  }

  // Initialize JavaScript modules first
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

  // ⭐⭐ Update: Use isEditMode instead of resetting ⭐⭐
  form.dataset.mode = isEditMode ? 'edit' : 'add';
  console.log(`[ProductForm] Mode: ${form.dataset.mode}`);

  if (isEditMode) {
    form.dataset.productKey = editProductData.product_key;
    console.log(`[ProductForm] Editing product with key: ${editProductData.product_key}`);
  }

  // ... rest of the code unchanged ...
  try {
    console.log('[ProductForm] Loading categories from ../shared/list.json');
    const response = await fetch("../shared/list.json");
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    const categories = data.categories;

    // Populate main categories
    mainCategorySelect.innerHTML = '<option value="" selected disabled>-- اختر الفئة الرئيسية --</option>';
    categories.forEach((category) => {
      const option = new Option(category.title, category.id);
      mainCategorySelect.add(option);
    });
    console.log('%c[ProductForm] Main categories loaded successfully.', 'color: green;');

    // Setup main category change listener
    const mainCategoryHandler = productHandleMainCategoryChange(categories);
    mainCategorySelect.removeEventListener('change', mainCategoryHandler);
    mainCategorySelect.addEventListener("change", mainCategoryHandler);

  } catch (error) {
    console.error("%c[ProductForm] Failed to load categories:", 'color: red;', error);
    productShowError(mainCategorySelect, 'فشل في تحميل الفئات. يرجى المحاولة مرة أخرى.');
    return false;
  }

  // If in edit mode, populate data
  if (isEditMode) {
    productPopulateEditForm(editProductData);
  } else {
    // ⭐⭐ Fix: Clean fields in add mode ⭐⭐
    productResetFormFields();
  }

  // Update extended mode after initialization
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

/**
 * @description Resets the product form fields to their default state.
 *   Used when opening the form in "Add New Product" mode to ensure no residual data from previous operations.
 * @function productResetFormFields
 * @returns {void}
 */
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

  // Reset categories
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

  // Reset service type
  const serviceTypeOptions = document.getElementById('service-type-options');
  const serviceTypeRadios = document.querySelectorAll('input[name="serviceType"]');

  if (serviceTypeOptions) {
    serviceTypeOptions.style.display = 'none';
  }

  serviceTypeRadios.forEach(radio => {
    radio.checked = false;
    radio.required = false;
  });

  // Reset images
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
 * @description Initializes all required JavaScript modules for the product form,
 *   primarily the image upload module (`productModule`).
 * @function productInitializeModules
 * @returns {boolean} - `true` if all modules are initialized successfully, `false` otherwise.
 * @see window.productModule.init
 */
function productInitializeModules() {
  console.log('[ProductForm] Initializing all modules...');

  // Initialize product module
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
 * @description Factory Function returning a handler for the main category change event.
 *   The handler updates the sub-category list and shows/hides price, quantity, and service type fields
 *   based on the selected main category.
 * @function productHandleMainCategoryChange
 * @param {Array<object>} categories - Array of category objects fetched from `list.json`.
 * @returns {function(Event): void} - Event handler function `onchange` to be attached to the main category list.
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

    // Reset sub-categories
    subCategorySelect.innerHTML = '<option value="">-- اختر الفئة الفرعية --</option>';
    subCategorySelect.disabled = true;

    // Show/hide price and quantity fields
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
      // Update extended mode
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

    // Update extended mode after handling change
    productUpdateExtendedMode();
    productLogCurrentState('Category Changed');
  };
}

/**
 * @description Populates form fields with existing product data when opening the form in edit mode.
 *   Includes updating form title, filling text fields, prices, categories, and current images.
 * @function productPopulateEditForm
 * @param {object} editProductData - Object containing product data to edit.
 * @returns {void}
 * @see window.productModule.createPreviewItem
 */
function productPopulateEditForm(editProductData) {
  console.log('[ProductForm] Populating form with existing product data.');

  // Update title and submit button
  const titleElement = document.getElementById('addProductTitle');
  const submitButton = document.querySelector('.add-product-modal__submit-container .btn');

  if (titleElement) {
    titleElement.innerHTML = '<i class="fas fa-edit"></i> تعديل المنتج';
  }
  if (submitButton) {
    submitButton.textContent = 'حفظ التعديلات';
  }

  // Populate text fields
  document.getElementById('product-name').value = editProductData.productName || '';
  document.getElementById('product-description').value = editProductData.product_description || '';
  document.getElementById('seller-message').value = editProductData.user_message || '';
  document.getElementById('product-notes').value = editProductData.user_note || '';

  // Populate price and quantity
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

  // Populate service type
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

  // Populate images
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

  // Populate categories
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

  // Update extended mode after populating data
  setTimeout(() => {
    productUpdateExtendedMode();
    productLogCurrentState('Edit Form Populated');
  }, 200);
}

/**
 * @description Sets up character counters for text fields (like product name and description)
 *   and binds event listeners (`input`, `blur`) to provide real-time validation
 *   as the user inputs data.
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

        // Real-time validation
        if (currentLength > 0) {
          productQuickValidateField(element);
        } else {
          productClearError(element);
        }
      });

      // Validate on blur
      element.addEventListener('blur', () => {
        productQuickValidateField(element);
      });

      // Trigger event once to update initial value
      element.dispatchEvent(new Event('input'));
    }
  });

  // Setup event listeners for number fields with validation
  productSetupNumberFields();
}

/**
 * @description Sets up event listeners for number fields (Quantity and Price) to ensure only digits are accepted,
 *   normalize Hindi digits, and provide real-time validation.
 *   Also checks that the original price (before discount) is greater than the current price.
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

      // Validate that original price is greater than current price
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

  // Validate categories on change
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
 * @description Update the modal background color based on the extended mode.
 *   A specific background is applied when the product is in the service category.
 * @function productUpdateModalBackground
 * @param {string} extendedMode - Current extended mode (e.g., 'addInServiceCategory').
 * @returns {void}
 */
function productUpdateModalBackground(extendedMode) {
  console.group('%c[ProductForm] 🎨 Background Update - Targeting Correct Element', 'color: orange; font-weight: bold;');

  // The correct element is .add-product-modal only
  const targetElement = document.querySelector('.add-product-modal');

  if (!targetElement) {
    console.error('%c[ProductForm] 🎨 Target element .add-product-modal not found!', 'color: red;');
    console.groupEnd();
    return;
  }

  console.log('%c[ProductForm] 🎨 Found correct target element:', 'color: green;', targetElement);

  // Save original background if not saved
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
    // Apply service background to the correct element only
    console.log('%c[ProductForm] 🎨 APPLYING SERVICE BACKGROUND TO .add-product-modal', 'color: green; font-weight: bold;');

    // Direct and strong method
    targetElement.style.backgroundColor = serviceBackground;
    targetElement.style.background = serviceBackground;
    targetElement.classList.add('service-category-active');

    console.log('%c[ProductForm] 🎨 Service background applied to correct element', 'color: green;');

  } else {
    // Restore original background
    console.log('%c[ProductForm] 🎨 RESTORING ORIGINAL BACKGROUND', 'color: blue; font-weight: bold;');

    const originalBackground = targetElement.dataset.originalBackground;
    targetElement.style.backgroundColor = originalBackground;
    targetElement.style.background = originalBackground;
    targetElement.classList.remove('service-category-active');

    console.log('%c[ProductForm] 🎨 Original background restored to correct element', 'color: blue;');
  }

  // Final check
  const finalStyle = window.getComputedStyle(targetElement);
  console.log('%c[ProductForm] 🎨 Final background of .add-product-modal:', 'color: teal;', finalStyle.backgroundColor);
  console.groupEnd();
}



/**
 * @description Reset the modal background color to its original state.
 *   Called when closing the modal to ensure the next open is not affected.
 * @function productResetModalBackground
 * @returns {void}
 */
function productResetModalBackground() {
  console.log('%c[ProductForm] 🎨 RESET Background - Targeting .add-product-modal only', 'color: red; font-weight: bold;');

  // Target only .add-product-modal
  const targetElement = document.querySelector('.add-product-modal');

  if (!targetElement) {
    console.error('%c[ProductForm] 🎨 Target element .add-product-modal not found for reset!', 'color: red;');
    return;
  }

  console.log('%c[ProductForm] 🎨 Resetting only .add-product-modal element', 'color: orange;');

  // Restore original background
  if (targetElement.dataset.originalBackground) {
    targetElement.style.backgroundColor = targetElement.dataset.originalBackground;
    targetElement.style.background = targetElement.dataset.originalBackground;
    console.log('%c[ProductForm] 🎨 Restored original background:', 'color: green;', targetElement.dataset.originalBackground);
  } else {
    // If original background not saved, reset
    targetElement.style.removeProperty('background-color');
    targetElement.style.removeProperty('background');
    console.log('%c[ProductForm] 🎨 Removed background properties', 'color: green;');
  }

  // Remove classes
  targetElement.classList.remove('service-category-active');
  targetElement.classList.remove('service-category-mode');

  console.log('%c[ProductForm] 🎨 Background reset completed for .add-product-modal', 'color: green; font-weight: bold;');
}






/**
 * @description Check and correct the current background.
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
 * @description Setup event listener for the form close button.
 * @function productSetupCloseButtonListener
 * @returns {void}
 */
function productSetupCloseButtonListener() {
  const closeButton = document.getElementById('add-product-modal-close-btn');
  const modalContainer = document.querySelector('.add-product-modal');

  if (closeButton) {
    // Remove any previous listeners to prevent duplicates
    closeButton.removeEventListener('click', productHandleCloseButton);
    closeButton.addEventListener('click', productHandleCloseButton);
    console.log('%c[ProductForm] 🔒 Close button listener setup', 'color: gray;');
  }

  if (modalContainer) {
    // Also listen for any external close event
    modalContainer.removeEventListener('close', productHandleCloseButton);
    modalContainer.addEventListener('close', productHandleCloseButton);
  }
}



/**
 * @description Event handler for clicking the form close button.
 *   Ensures resetting the form background to its original state.
 * @function productHandleCloseButton
 */
function productHandleCloseButton() {
  console.log('%c[ProductForm] 🔒 Close button - RESETTING .add-product-modal ONLY', 'color: red; font-weight: bold;');

  // Immediate reset for the correct element only
  setTimeout(() => {
    if (typeof productResetModalBackground === 'function') {
      productResetModalBackground();
    }

    // Guaranteed additional cleanup
    const modalElement = document.querySelector('.add-product-modal');
    if (modalElement) {
      modalElement.style.cssText = '';
      modalElement.className = modalElement.className.replace(/service-category-\w+/g, '');
    }

    console.log('%c[ProductForm] 🔒 .add-product-modal background fully reset after close', 'color: green;');
  }, 50);
}




// Make the function globally available
window.productInitializeAddProductForm = productInitializeAddProductForm;
window.productUpdateExtendedMode = productUpdateExtendedMode;
window.productLogCurrentState = productLogCurrentState;