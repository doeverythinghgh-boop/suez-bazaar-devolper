/**
 * @file js/utils.js
 * @description يحتوي هذا الملف على دوال مساعدة عامة يمكن استخدامها في أي مكان في المشروع.
 * @param {boolean} [showAlert=false] - إذا كانت `true`، ستعرض الدالة تنبيهًا عند انقطاع الاتصال.
 */
// 🟦 تخزين مؤقت لحالة الاتصال
let lastConnectionCheck = 0;
let isConnectedCache = false;
const CONNECTION_CHECK_INTERVAL = 3000; // 3 ثوانٍ

async function checkInternetConnection(showAlert = true) {
  
  const now = Date.now();

  // 🟦 استخدام النتيجة المخزنة إذا كان آخر فحص حديثًا
  if (now - lastConnectionCheck < CONNECTION_CHECK_INTERVAL) {
    console.log(`[فحص الشبكة] استخدام النتيجة المخبأة: ${isConnectedCache}`);
    return isConnectedCache;
  }

  // سيتم تحديث وقت الفحص في النهاية مهما حصل
  lastConnectionCheck = now;

  try {
    // 1️⃣ فحص navigator.onLine
    if (!navigator.onLine) {
      if (showAlert) {
        Swal.fire('لا يوجد اتصال بالإنترنت', 'يرجى التحقق من اتصالك بالشبكة.', 'error');
      }
      isConnectedCache = false;
      return false;
    }

    // 2️⃣ اختبار اتصال فعلي عبر FETCH
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3 ثوانٍ

    // ✅ إصلاح: استخدام وضع 'no-cors' لزيادة الموثوقية وتجنب مشاكل CORS.
    // هذا الوضع لا يعيد status code حقيقي، لكن نجاح الطلب نفسه يكفي لتأكيد الاتصال.
    const response = await fetch("https://www.gstatic.com/generate_204", {
      method: "GET",
      mode: "no-cors", // السماح بالطلب دون الحاجة لاستجابة CORS كاملة
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // 3️⃣ إذا لم يحدث خطأ في الطلب (لم يدخل في catch)، فهذا يعني أن الاتصال موجود.
    console.log("[فحص الشبكة] تم تأكيد الاتصال بنجاح.");
    isConnectedCache = true;
    return true;

  } catch (error) {
    // إذا فشل الطلب (بسبب انقطاع الشبكة أو انتهاء المهلة)، فهذا يعني عدم وجود اتصال.
    console.warn("[فحص الشبكة] فشل اختبار الاتصال:", error.name === 'AbortError' ? 'انتهت المهلة' : error.message);
    // ✅ تحسين: عرض التنبيه فقط إذا كان مطلوبًا ولم يتم عرضه بالفعل
    // (الدالة ستعرضه مرة واحدة عند فشل navigator.onLine)
    if (showAlert) {
        Swal.fire('لا يوجد اتصال بالإنترنت', 'يرجى التحقق من اتصالك بالشبكة.', 'error');
    }
    isConnectedCache = false;
    return false;
  }
}
