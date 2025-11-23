/**
 * @file js/productFormUtils.js
 * @description يحتوي هذا الملف على مجموعة من الدوال المساعدة المستخدمة في نماذج المنتجات،
 *   مثل تنسيق البيانات، توليد الأرقام التسلسلية، والتحقق من دعم المتصفح لميزات معينة.
 */

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
 * توليد سريال فريد للمنتج
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
 */
async function productSupportsWebP() {
  if (!self.createImageBitmap) return false;
  const blob = await fetch('data:image/webp;base64,UklGRiIAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73v/+BiOh/AAA=')
    .then(r => r.blob()).catch(()=>null);
  if (!blob) return false;
  try { await createImageBitmap(blob); return true; } catch(e) { return false; }
}