/**
 * @file js/productFormUtils.js
 * @description This file contains a set of helper functions used in product forms,
 *   such as data formatting, serial number generation, and checking browser support for specific features.
 */
/**
 * @constant {string} SERVICE_CATEGORY_BACKGROUND - Form background in service category mode
 */
const SERVICE_CATEGORY_BACKGROUND = 'radial-gradient(circle, #f6f9fc, #0e4a9aff, #182b48ff, #000101ff)';



/**
 * @description Sanitizes Arabic text by removing excess whitespace from the beginning and end,
 *   and replacing multiple spaces with a single space.
 * @function productNormalizeArabicText
 * @param {string} text - Text to be sanitized.
 * @returns {string} - Sanitized text.
 */
function productNormalizeArabicText(text) {
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}



/**
 * @description Asynchronously checks if the current browser supports the WebP image format.
 *   Attempts to decode a very small WebP image.
 * @function productSupportsWebP
 * @async
 * @returns {Promise<boolean>} - Promise returning `true` if browser supports WebP, `false` otherwise.
 * @deprecated - This function is currently unused in the codebase.
 * @throws {Error} - If `fetch` or `createImageBitmap` encounters an error.
 */
async function productSupportsWebP() {
  if (!self.createImageBitmap) return false;
  const blob = await fetch('data:image/webp;base64,UklGRiIAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73v/+BiOh/AAA=')
    .then(r => r.blob()).catch(() => null);
  if (!blob) return false;
  try { await createImageBitmap(blob); return true; } catch (e) { return false; }
}


/**
 * @description Strong background reset with pre-check
 * @function productForceResetBackground
 * @returns {void}
 * @deprecated - This function is currently unused in the codebase.
 * @see productDebugBackground
 */
function productForceResetBackground() {
  console.log('%c[ProductForm] 🎨 بدء إعادة تعيين الخلفية القسري', 'color: red; font-weight: bold;');

  // فحص الحالة الحالية أولاً
  if (typeof productDebugBackground === 'function') {
    productDebugBackground();
  }

  const elements = [
    document.querySelector('.add-product-modal'),
    document.getElementById('modal-main-content'),
    document.querySelector('.add-product-modal__form'),
    document.querySelector('.add-product-modal__form-group')
  ];

  elements.forEach((element, index) => {
    if (element) {
      console.log(`%c[ProductForm] 🎨 إعادة تعيين العنصر ${index}`, 'color: orange;');

      // Remove all customizations
      element.style.removeProperty('background-color');
      element.style.removeProperty('background');
      element.style.backgroundColor = '';
      element.style.background = '';
      element.classList.remove('service-category-mode');

      // Remove dataset
      delete element.dataset.originalBackground;
    }
  });

  console.log('%c[ProductForm] 🎨 اكتملت إعادة تعيين الخلفية القسري', 'color: green; font-weight: bold;');
}

/**
 * @description Dynamically change service background with gradient support
 * @function productSetServiceCategoryBackground
 * @param {string} newBackground - New background (color or gradient)
 * @returns {void}
 * @see productUpdateExtendedMode
 */
function productSetServiceCategoryBackground(newBackground) {
  window.SERVICE_CATEGORY_BACKGROUND = newBackground;
  const isGradient = newBackground.includes('gradient');

  if (isGradient) {
    document.documentElement.style.setProperty('--service-category-bg-image', newBackground);
  } else {
    document.documentElement.style.setProperty('--service-category-bg-color', newBackground);
  }

  console.log(`%c[ProductForm] 🎨 تم تغيير خلفية فئة الخدمة إلى: ${newBackground}`, 'color: green; font-weight: bold;');

  // Update form if open
  if (typeof productUpdateExtendedMode === 'function') {
    productUpdateExtendedMode();
  }
}
/**
 * @description Check current background status
 * @function productCheckBackgroundStatus
 * @returns {void}
 */
function productCheckBackgroundStatus() {
  const modal = document.querySelector('.add-product-modal');
  console.group('%c[ProductForm] 🎨 فحص حالة الخلفية', 'color: blue; font-weight: bold;');
  console.log('SERVICE_CATEGORY_BACKGROUND:', window.SERVICE_CATEGORY_BACKGROUND);
  console.log('Modal element:', modal);

  if (modal) {
    const computed = getComputedStyle(modal);
    console.log('Computed background:', computed.background);
    console.log('Computed background-image:', computed.backgroundImage);
    console.log('Computed background-color:', computed.backgroundColor);
    console.log('Dataset original:', modal.dataset.originalBackground);
    console.log('Inline background:', modal.style.background);
    console.log('Has service class:', modal.classList.contains('service-category-mode'));
  }
  console.groupEnd();
}

/**
 * @description Manually apply background for testing
 * @function productTestGradient
 * @returns {void}
 */
function productTestGradient() {
  const modal = document.querySelector('.add-product-modal');
  if (modal) {
    modal.style.background = window.SERVICE_CATEGORY_BACKGROUND;
    console.log('%c[ProductForm] 🎨 تم تطبيق اختبار التدرج اليدوي', 'color: green; font-weight: bold;');
  }
}

// Make functions globally available
window.productCheckBackgroundStatus = productCheckBackgroundStatus;
window.productTestGradient = productTestGradient;
// Make function globally available
window.productSetServiceCategoryBackground = productSetServiceCategoryBackground;
// Make function globally available
window.productForceResetBackground = productForceResetBackground;