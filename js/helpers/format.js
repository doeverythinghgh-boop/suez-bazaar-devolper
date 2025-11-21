/**
 * ✅ جديد: يحول الأرقام الهندية (٠-٩) إلى أرقام إنجليزية (0-9) في سلسلة نصية.
 * هذه الدالة مفيدة لمعالجة مدخلات المستخدم التي قد تحتوي على أرقام بأي من الصيغتين.
 * @param {string} str - السلسلة النصية التي قد تحتوي على أرقام.
 * @returns {string} - السلسلة النصية بعد تحويل الأرقام إلى الصيغة الإنجليزية.
 */
function normalizeDigits(str) {
  if (!str) return '';
  const easternArabicNumerals = /[\u0660-\u0669]/g; // نطاق الأرقام العربية الشرقية (الهندية)
  return str.replace(easternArabicNumerals, d => d.charCodeAt(0) - 0x0660);
}

/**
 * ✅ جديد: يقوم بتنقيح وتوحيد النص العربي.
 * يزيل علامات التشكيل ويوحد أشكال الحروف (الهمزات والتاء المربوطة).
 * مفيد جدًا لعمليات البحث والمقارنة لضمان تطابق النصوص بغض النظر عن التشكيل.
 * @param {string} text - النص العربي المراد تنقيحه.
 * @returns {string} - النص بعد إزالة التشكيل وتوحيد الحروف.
 */
function normalizeArabicText(text) {
  if (!text) return "";

  // إزالة التشكيل
  text = text.replace(/[\u064B-\u0652]/g, "");

  // توحيد الهمزات (أ، إ، آ) إلى ا
  text = text.replace(/[آأإ]/g, "ا");

  // تحويل التاء المربوطة (ة) إلى ه
  text = text.replace(/ة/g, "ه");

  // توحيد حرف الياء (ي / ى) إلى ي
  text = text.replace(/[ى]/g, "ي");

  // إزالة المد (ـــ)
  text = text.replace(/ـ+/g, "");

  // إزالة المسافات المكررة
  text = text.replace(/\s+/g, " ").trim();

  return text;
}
