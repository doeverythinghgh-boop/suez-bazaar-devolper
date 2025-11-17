/**
 * @file js/utils.js
 * @description يحتوي هذا الملف على دوال مساعدة عامة يمكن استخدامها في أي مكان في المشروع.
 */
// 🟦 تخزين مؤقت لحالة الاتصال
let lastConnectionCheck = 0;
let isConnectedCache = false;
const CONNECTION_CHECK_INTERVAL = 3000; // 3 ثوانٍ

/**
 * يتحقق من وجود اتصال بالإنترنت.
 * @param {boolean} [showAlert=true] - إذا كانت `true`، ستعرض الدالة تنبيهًا عند انقطاع الاتصال.
 * @returns {Promise<boolean>} `true` إذا كان هناك اتصال، وإلا `false`.
 */
async function checkInternetConnection(showAlert = true) {
  // من الأفضل دائمًا التحقق من وجود الكائن 'Android' قبل استخدامه
// هذا يضمن أن الكود لن يسبب خطأ إذا تم فتحه في متصفح عادي خارج التطبيق
if (window.Android && typeof window.Android.checkInternetWithToast === 'function') {
    console.log("سيتم الآن فحص الاتصال بالإنترنت عبر كود Kotlin...");

    // استدعاء الدالة مباشرة
    const hasInternet = window.Android.checkInternetWithToast();

    if (hasInternet) {
        console.log("الاتصال بالإنترنت موجود. القيمة المستلمة:", hasInternet);
    } else {
        console.log("لا يوجد اتصال بالإنترنت. القيمة المستلمة:", hasInternet);
        // الدالة في Kotlin ستقوم تلقائيًا بإظهار رسالة Toast للمستخدم
    }
    // ✅ إصلاح: يجب أن تعود الدالة بالقيمة المستلمة من الأندرويد مباشرة وتتوقف هنا.
    return hasInternet;
} 
/////////////
  // ✅ تعديل: استخدام النتيجة المخبأة مباشرة دون انتظار
  // سيتم تحديثها في الخلفية بواسطة `startPeriodicConnectionCheck`
  return isConnectedCache;
}

/**
 * ✅ جديد: دالة داخلية تقوم بإجراء الفحص الفعلي وتحديث المتغير المخبأ.
 * @returns {Promise<boolean>} الحالة الجديدة للاتصال.
 */
async function performActualConnectionCheck() {
  if (window.Android && typeof window.Android.checkInternetWithToast === 'function') {return;}


  const now = Date.now();
  lastConnectionCheck = now;

  try {
    // 1️⃣ فحص navigator.onLine
    if (!navigator.onLine) {
      throw new Error("navigator.onLine is false");
    }

    // 2️⃣ اختبار اتصال فعلي عبر FETCH
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3 ثوانٍ

    await fetch("https://www.gstatic.com/generate_204", {
      method: "GET",
      mode: "no-cors",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // إذا لم يحدث خطأ، فالاتصال موجود
    if (!isConnectedCache) {
      console.log("%c[فحص الشبكة] تم استعادة الاتصال بالإنترنت.", "color: green;");
      isConnectedCache = true;
    }
    return isConnectedCache;

  } catch (error) {
    // إذا فشل الطلب، فالاتصال غير موجود
    if (isConnectedCache) {
      console.warn("%c[فحص الشبكة] تم فقدان الاتصال بالإنترنت.", "color: red;", error.message);
      isConnectedCache = false;
      // عرض رسالة للمستخدم عند فقدان الاتصال لأول مرة
      Swal.fire('لا يوجد اتصال بالإنترنت', 'يرجى التحقق من اتصالك بالشبكة.', 'error');
    }
    return isConnectedCache;
  }
}

/**
 * ✅ جديد: تبدأ عملية فحص الاتصال الدورية في الخلفية.
 */
function startPeriodicConnectionCheck() {
    if (window.Android && typeof window.Android.checkInternetWithToast === 'function') {return;}

  console.log('[فحص الشبكة] بدء الفحص الدوري للاتصال بالإنترنت...');

  // 1. قم بإجراء فحص فوري عند بدء التشغيل لتحديد الحالة الأولية
  performActualConnectionCheck();

  // 2. قم بإعداد الفحص الدوري كل فترة زمنية محددة
  setInterval(performActualConnectionCheck, CONNECTION_CHECK_INTERVAL);

  // 3. استمع لأحداث 'online' و 'offline' من المتصفح للاستجابة الفورية
  window.addEventListener('online', () => {
    console.log('%c[فحص الشبكة] المتصفح أبلغ عن وجود اتصال (online).', 'color: green;');
    isConnectedCache = true;
    // قم بإجراء فحص فعلي للتأكيد
    performActualConnectionCheck();
  });

  window.addEventListener('offline', () => {
    console.warn('%c[فحص الشبكة] المتصفح أبلغ عن انقطاع الاتصال (offline).', 'color: red;');
    isConnectedCache = false;
    Swal.fire('لا يوجد اتصال بالإنترنت', 'يرجى التحقق من اتصالك بالشبكة.', 'error');
  });
}

// ✅ جديد: استدعاء الدالة لبدء الفحص الدوري بمجرد تحميل الملف
startPeriodicConnectionCheck();

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

/**
 * ✅ تعديل: تفتح نافذة سجل الإشعارات مباشرة في الصفحة الحالية.
 * لم تعد تقوم بإعادة التوجيه إلى صفحة تسجيل الدخول.
 */
async function showNotificationsModal() {
  const loggedInUserJSON = localStorage.getItem("loggedInUser");

  if (loggedInUserJSON) {
    const user = JSON.parse(loggedInUserJSON);

    // التأكد من أن المستخدم مسجل دخوله ومؤهل لرؤية الإشعارات
    if (typeof isUserEligibleForNotifications === 'function' && isUserEligibleForNotifications(user)) {
      // التأكد من وجود دالة عرض النافذة قبل استدعائها
      if (typeof showNotificationsLogModal === 'function') {
        await showNotificationsLogModal();
      } else {
        console.error('[Utils] الدالة showNotificationsLogModal() غير موجودة. تأكد من تحميل السكريبت الخاص بها.');
      }
    }
  }
}
