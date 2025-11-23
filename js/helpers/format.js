/**
 * @file js/helpers/format.js
 * @description يوفر دوال مساعدة لتنسيق النصوص والأرقام، مثل تحويل الأرقام الهندية إلى إنجليزية وتوحيد النص العربي.
 */

/**
 * @description يحول الأرقام الهندية (٠-٩) إلى أرقام إنجليزية (0-9) في سلسلة نصية.
 *   هذه الدالة مفيدة لمعالجة مدخلات المستخدم التي قد تحتوي على أرقام بأي من الصيغتين.
 * @function normalizeDigits
 * @param {string} str - السلسلة النصية التي قد تحتوي على أرقام.
 * @returns {string} - السلسلة النصية بعد تحويل الأرقام إلى الصيغة الإنجليزية.
 */
function normalizeDigits(str) {
  if (!str) return '';
  const easternArabicNumerals = /[\u0660-\u0669]/g; // نطاق الأرقام العربية الشرقية (الهندية)
  return str.replace(easternArabicNumerals, d => d.charCodeAt(0) - 0x0660);
}

/**
 * @description يقوم بتنقيح وتوحيد النص العربي عن طريق إزالة علامات التشكيل وتوحيد أشكال الحروف (الهمزات والتاء المربوطة).
 *   مفيد جدًا لعمليات البحث والمقارنة لضمان تطابق النصوص بغض النظر عن التشكيل.
 * @function normalizeArabicText
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

/**
 * @description يدمج معرف الحالة (status ID) مع التاريخ والوقت الحاليين في سلسلة نصية واحدة.
 *   التنسيق الناتج: "ID#TIMESTAMP" (مثال: "1#2023-10-27T10:00:00.000Z").
 *   هذه الدالة تُستخدم قبل إرسال تحديثات الحالة إلى الخادم.
 * @function composeOrderStatus
 * @param {number} statusId - المعرف الرقمي للحالة الجديدة.
 * @returns {string} - السلسلة النصية المدمجة.
 */
function composeOrderStatus(statusId) {
  const timestamp = new Date().toISOString();
  return `${statusId}#${timestamp}`;
}

/**
 * @description يفكك السلسلة النصية لحالة الطلب (القادمة من قاعدة البيانات) إلى كائن منظم.
 *   يتعامل مع الحالات التي تكون فيها القيمة غير صالحة أو قديمة (لا تحتوي على #).
 * @function parseOrderStatus
 * @param {string | null | undefined} statusValue - القيمة المخزنة في عمود `order_status`.
 * @returns {{statusId: number, timestamp: string | null}} - كائن يحتوي على معرف الحالة والتاريخ.
 */
function parseOrderStatus(statusValue) {
  if (!statusValue || typeof statusValue !== 'string') {
    return { statusId: -1, timestamp: null }; // حالة غير معروفة أو قيمة فارغة
  }

  if (statusValue.includes('#')) {
    const [idStr, timestamp] = statusValue.split('#');
    return { statusId: parseInt(idStr, 10), timestamp: timestamp };
  }

  // للتعامل مع البيانات القديمة التي قد تكون مجرد رقم أو نص
  return { statusId: -1, timestamp: null }; // افترض أنها حالة غير معروفة إذا لم تكن بالتنسيق الجديد
}
