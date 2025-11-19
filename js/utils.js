/**
 * @file js/utils.js
 * @description يحتوي هذا الملف على دوال مساعدة عامة يمكن استخدامها في أي مكان في المشروع.
 */



/* ----------------------------------------
    🟦 تخزين حالة الاتصال مؤقتاً (Cache)
---------------------------------------- */
let lastConnectionCheck = 0;
let isConnectedCache = false;
let offlineToast = null; 
const CONNECTION_CHECK_INTERVAL = 3000; // 3 ثوانٍ

/* ----------------------------------------
    🟦 دالة مستخدمة من أي مكان
---------------------------------------- */
async function checkInternetConnection() {
  return isConnectedCache;
}

/* ----------------------------------------
    🟦 Snackbar ثابت عند فقد الاتصال
---------------------------------------- */
async function performActualConnectionCheck() {
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

    // 🔹 عاد الاتصال
    if (!isConnectedCache) {
      console.log("%c[الشبكة] عاد الاتصال بالإنترنت.", "color: green;");
    }

    isConnectedCache = true;

    // 🔹 اغلاق Snackbar إذا كان ظاهر
    if (offlineToast) {
      Swal.close();
      offlineToast = null;
    }

    return true;

  } catch (error) {
    // 🔻 تم فقد الاتصال
    if (isConnectedCache) {
      console.warn("%c[الشبكة] تم فقد الاتصال بالإنترنت.", "color: red;");
    }

    isConnectedCache = false;

    // 🔹 إظهار Snackbar ثابت *مرة واحدة فقط*
    if (!offlineToast) {
      offlineToast = Swal.fire({
        toast: true,
        position: 'bottom',
        icon: 'error',
        title: '📡 لا يوجد اتصال بالإنترنت',
        showConfirmButton: false,
        timer: undefined,          // ← بدون مؤقت
        timerProgressBar: false,   // ← إخفاء عدّاد الوقت
        background: '#d32f2f',
        color: '#fff',
        customClass: {
          popup: 'animate__animated animate__slideInUp'
        }
      });
    }

    return false;
  }
}

/* ----------------------------------------
    🟦 الفحص الدوري
---------------------------------------- */
function startPeriodicConnectionCheck() {
  performActualConnectionCheck();
  setInterval(performActualConnectionCheck, CONNECTION_CHECK_INTERVAL);

  window.addEventListener("online", () => {
    isConnectedCache = true;
    if (offlineToast) Swal.close();
    offlineToast = null;
    performActualConnectionCheck();
  });

  window.addEventListener("offline", () => {
    isConnectedCache = false;
    performActualConnectionCheck();
  });
}

/* ----------------------------------------
    🟦 البدء
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
