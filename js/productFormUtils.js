/**
 * @file js/productFormUtils.js
 * @description يحتوي هذا الملف على مجموعة من الدوال المساعدة المستخدمة في نماذج المنتجات،
 *   مثل تنسيق البيانات، توليد الأرقام التسلسلية، والتحقق من دعم المتصفح لميزات معينة.
 */
/**
 * @constant {string} SERVICE_CATEGORY_BACKGROUND - خلفية النموذج في وضع فئة الخدمات
 */
const SERVICE_CATEGORY_BACKGROUND = 'radial-gradient(circle, #f6f9fc, #0e4a9aff, #182b48ff, #000101ff)';
/**
 * @description يحول عدد البايتات إلى صيغة قابلة للقراءة من قبل الإنسان (مثل KB, MB, GB).
 * @function productFormatBytes
 * @param {number} bytes - عدد البايتات المراد تحويله.
 * @param {number} [decimals=2] - عدد الخانات العشرية في الناتج.
 * @returns {string} - سلسلة نصية تمثل الحجم المنسق (مثال: "1.50 MB").
 */
function productFormatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * @description تقوم بتحويل الأرقام العربية الشرقية (الهندية) والفارسية في سلسلة نصية إلى أرقام عربية غربية (إنجليزية).
 *   تُستخدم لتوحيد الأرقام المدخلة من قبل المستخدم قبل معالجتها.
 * @function productNormalizeDigits
 * @param {string} str - السلسلة النصية التي قد تحتوي على أرقام هندية أو فارسية.
 * @returns {string} - السلسلة النصية بعد تحويل جميع الأرقام إلى الصيغة الإنجليزية.
 */
function productNormalizeDigits(str) {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  let output = '';
  for (let char of str) {
    if (arabicDigits.includes(char)) {
      output += arabicDigits.indexOf(char);
    } else if (persianDigits.includes(char)) {
      output += persianDigits.indexOf(char);
    } else {
      output += char;
    }
  }
  return output;
}

/**
 * @description تقوم بتنقيح النص العربي عن طريق إزالة المسافات الزائدة من البداية والنهاية،
 *   واستبدال أي تكرار للمسافات بمسافة واحدة فقط.
 * @function productNormalizeArabicText
 * @param {string} text - النص المراد تنقيحه.
 * @returns {string} - النص المنقح.
 */
function productNormalizeArabicText(text) {
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * @description Generates a unique 6-character alphanumeric serial for a product.
 * @function productGenerateProductSerial
 * @returns {string} - The generated unique serial.
 */
function productGenerateProductSerial() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let serial = "";
  for (let i = 0; i < 6; i++) {
    serial += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return serial;
}

/**
 * @description تتحقق بشكل غير متزامن مما إذا كان المتصفح الحالي يدعم تنسيق الصور WebP.
 *   تقوم بذلك عن طريق محاولة فك تشفير صورة WebP صغيرة جدًا.
 * @function productSupportsWebP
 * @async
 * @returns {Promise<boolean>} - وعد (Promise) يُرجع `true` إذا كان المتصفح يدعم WebP، و`false` بخلاف ذلك.
 * @throws {Error} - If `fetch` or `createImageBitmap` encounters an error.
 */
async function productSupportsWebP() {
  if (!self.createImageBitmap) return false;
  const blob = await fetch('data:image/webp;base64,UklGRiIAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73v/+BiOh/AAA=')
    .then(r => r.blob()).catch(()=>null);
  if (!blob) return false;
  try { await createImageBitmap(blob); return true; } catch(e) { return false; }
}


/**
 * @description إعادة تعيين قوية للخلفية مع فحص مسبق
 * @function productForceResetBackground
 * @returns {void}
 * @see productDebugBackground
 */
function productForceResetBackground() {
  console.log('%c[ProductForm] 🎨 FORCED Background Reset Started', 'color: red; font-weight: bold;');
  
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
      console.log(`%c[ProductForm] 🎨 Resetting element ${index}`, 'color: orange;');
      
      // إزالة كافة التخصيصات
      element.style.removeProperty('background-color');
      element.style.removeProperty('background');
      element.style.backgroundColor = '';
      element.style.background = '';
      element.classList.remove('service-category-mode');
      
      // إزالة dataset
      delete element.dataset.originalBackground;
    }
  });
  
  console.log('%c[ProductForm] 🎨 FORCED Background Reset Completed', 'color: green; font-weight: bold;');
}

/**
 * @description تغيير خلفية الخدمات ديناميكياً مع دعم التدرج
 * @function productSetServiceCategoryBackground
 * @param {string} newBackground - الخلفية الجديدة (لون أو تدرج)
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
  
  console.log(`%c[ProductForm] 🎨 Service category background changed to: ${newBackground}`, 'color: green; font-weight: bold;');
  
  // تحديث النموذج إذا كان مفتوحاً
  if (typeof productUpdateExtendedMode === 'function') {
    productUpdateExtendedMode();
  }
}
/**
 * @description فحص حالة الخلفية الحالية
 * @function productCheckBackgroundStatus
 * @returns {void}
 */
function productCheckBackgroundStatus() {
  const modal = document.querySelector('.add-product-modal');
  console.group('%c[ProductForm] 🎨 Background Status Check', 'color: blue; font-weight: bold;');
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
 * @description تطبيق الخلفية يدوياً للتجربة
 * @function productTestGradient
 * @returns {void}
 */
function productTestGradient() {
  const modal = document.querySelector('.add-product-modal');
  if (modal) {
    modal.style.background = window.SERVICE_CATEGORY_BACKGROUND;
    console.log('%c[ProductForm] 🎨 Manual gradient test applied', 'color: green; font-weight: bold;');
  }
}

// جعل الدوال متاحة عالمياً
window.productCheckBackgroundStatus = productCheckBackgroundStatus;
window.productTestGradient = productTestGradient;
// جعل الدالة متاحة عالمياً
window.productSetServiceCategoryBackground = productSetServiceCategoryBackground;
// جعل الدالة متاحة عالميًا
window.productForceResetBackground = productForceResetBackground;