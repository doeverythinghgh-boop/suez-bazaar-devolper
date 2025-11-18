/**
 * @file js/utils.js
 * @description يحتوي هذا الملف على دوال مساعدة عامة يمكن استخدامها في أي مكان في المشروع.
 */

/* ----------------------------------------
    🟦 تخزين حالة الاتصال مؤقتاً (Cache)
---------------------------------------- */
let lastConnectionCheck = 0;
let isConnectedCache = false;
let offlineToast = null; // لتخزين مرجع الـ Toast الحالي
const CONNECTION_CHECK_INTERVAL = 3000; // 3 ثوانٍ

/* ----------------------------------------
    🟦 دالة فحص الاتصال الأساسية (تستدعى من أي مكان)
---------------------------------------- */
async function checkInternetConnection(showAlert = true) {
  if (window.Android && typeof window.Android.checkInternetWithToast === "function") {
    const hasInternet = window.Android.checkInternetWithToast();
    if (hasInternet) {
      console.log("✔ اتصال موجود (Android):", hasInternet);
    } else {
      console.warn("✖ لا يوجد اتصال (Android):", hasInternet);
    }
    return hasInternet;
  }
  return isConnectedCache;
}

/* ----------------------------------------
    🟦 دالة الفحص الفعلي للمتصفح مع Toast ذكي
---------------------------------------- */
async function performActualConnectionCheck() {
  if (window.Android && typeof window.Android.checkInternetWithToast === "function") return;

  lastConnectionCheck = Date.now();

  try {
    if (!navigator.onLine) throw new Error("navigator.onLine is false");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    await fetch("https://www.gstatic.com/generate_204", {
      method: "GET",
      mode: "no-cors",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!isConnectedCache) {
      console.log("%c[الشبكة] عاد الاتصال بالإنترنت.", "color: green;");
      isConnectedCache = true;
      // اغلاق أي Toast سابق عند عودة الاتصال
      if (offlineToast) {
        Swal.close();
        offlineToast = null;
      }
    }

    return true;

  } catch (error) {
    if (isConnectedCache) {
      console.warn("%c[الشبكة] تم فقد الاتصال بالإنترنت.", "color: red;", error.message);
    }

    isConnectedCache = false;

    // عرض Toast واحد فقط أثناء الانقطاع
    if (!offlineToast) {
      offlineToast = Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'لا يوجد اتصال بالإنترنت',
        showConfirmButton: false,
        timer: CONNECTION_CHECK_INTERVAL - 500,
        timerProgressBar: true,
        didClose: () => {
          offlineToast = null; // إعادة تعيين المرجع عند انتهاء Toast
        }
      });
    }

    return false;
  }
}

/* ----------------------------------------
    🟦 الفحص الدوري للاتصال (يبدأ تلقائياً)
---------------------------------------- */
function startPeriodicConnectionCheck() {
  console.log("[الشبكة] بدء الفحص الدوري للاتصال ...");

  // 🔹 داخل Android WebView
  if (window.Android && typeof window.Android.checkInternetWithToast === "function") {
    try { window.Android.checkInternetWithToast(); } catch (e) { console.error(e); }
    setInterval(() => {
      try { window.Android.checkInternetWithToast(); } catch (e) { console.error(e); }
    }, CONNECTION_CHECK_INTERVAL);
    return;
  }

  // 🔹 داخل المتصفح
  performActualConnectionCheck();
  setInterval(performActualConnectionCheck, CONNECTION_CHECK_INTERVAL);

  // أحداث online/offline
  window.addEventListener("online", () => {
    console.log("%c[الشبكة] المتصفح أعلن عن اتصال.", "color: green;");
    isConnectedCache = true;
    if (offlineToast) Swal.close();
    performActualConnectionCheck();
  });

  window.addEventListener("offline", () => {
    console.warn("%c[الشبكة] المتصفح أعلن عن انقطاع الاتصال.", "color: red;");
    isConnectedCache = false;
    performActualConnectionCheck();
  });
}

/* ----------------------------------------
    🟦 تشغيل الفحص الدوري بمجرد تحميل الملف
---------------------------------------- */
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
