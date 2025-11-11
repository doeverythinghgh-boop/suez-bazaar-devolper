/**
 * @file js/utils.js
 * @description يحتوي هذا الملف على دوال مساعدة عامة يمكن استخدامها في أي مكان في المشروع.
 */

/**
 * يتحقق من وجود اتصال فعلي بالإنترنت.
 * 
 * يقوم أولاً بفحص `navigator.onLine` السريع. إذا كان صحيحًا، فإنه يرسل
 * طلب HEAD صغير إلى الخادم للتحقق من الاتصال الفعلي بالإنترنت.
 * 
 * @returns {Promise<boolean>} - يُرجع `true` إذا كان هناك اتصال بالإنترنت، و`false` إذا لم يكن.
 * 
 * @example
 * async function someFunction() {
 *   const isOnline = await checkInternetConnection();
 *   if (isOnline) {
 *     // نفذ الكود الذي يتطلب اتصالاً بالإنترنت
 *   } else {
 *     Swal.fire('لا يوجد اتصال بالإنترنت', 'يرجى التحقق من اتصالك بالشبكة.', 'error');
 *   }
 * }
 */
async function checkInternetConnection() {
  // 1. الفحص السريع: هل المتصفح يعتقد أنه متصل؟
  if (!navigator.onLine) {
    console.warn('[NetworkCheck] navigator.onLine is false. No connection.');
    return false;
  }

  // 2. الفحص المتقدم: إرسال طلب صغير للتأكد من وجود اتصال فعلي.
  // نستخدم طلب HEAD لأنه لا يقوم بتنزيل المحتوى، فقط الرؤوس (Headers).
  // نضيف معلمة عشوائية لمنع المتصفح من استخدام الذاكرة المؤقتة (cache).
  try {
    await fetch(`${baseURL}?_=${new Date().getTime()}`, { method: 'HEAD', cache: 'no-store' });
    return true; // إذا نجح الطلب، يوجد اتصال.
  } catch (error) {
    console.error('[NetworkCheck] Verification request failed. No internet access.', error);
    return false; // إذا فشل الطلب، لا يوجد اتصال فعلي بالإنترنت.
  }
}