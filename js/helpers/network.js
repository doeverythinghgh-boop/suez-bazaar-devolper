/**
 * @file js/helpers/network.js
 * @description يدير حالة الاتصال بالشبكة في التطبيق ويقدم دالة مركزية لإجراء طلبات API.
 *   يشمل آليات للتحقق الدوري من الاتصال، وعرض إشعارات عدم الاتصال، وتخزين حالة الاتصال مؤقتًا.
 */

/* ----------------------------------------
    🟦 تخزين حالة الاتصال مؤقتاً (Cache)
---------------------------------------- */
/**
 * @description Timestamp لآخر مرة تم فيها التحقق من الاتصال بالإنترنت.
 * @type {number}
 */
let lastConnectionCheck = 0;
/**
 * @description حالة الاتصال بالإنترنت المخزنة مؤقتًا.
 * @type {boolean}
 */
let isConnectedCache = false;
/**
 * @description مرجع لكائن "Swal" (SweetAlert) الخاص بإشعار عدم الاتصال، لتمكين إغلاقه.
 * @type {object|null}
 */
let offlineToast = null; 
/**
 * @description الفاصل الزمني (بالمللي ثانية) بين عمليات التحقق الدورية من الاتصال بالإنترنت.
 * @type {number}
 * @const
 */
const CONNECTION_CHECK_INTERVAL = 3000; // 3 ثوانٍ

/* ----------------------------------------
    🟦 دالة مستخدمة من أي مكان
---------------------------------------- */
/**
 * @description تعيد حالة الاتصال بالإنترنت المخزنة مؤقتًا.
 * @function checkInternetConnection
 * @returns {boolean} - `true` إذا كان هناك اتصال بالإنترنت، وإلا `false`.
 * @see isConnectedCache
 */
async function checkInternetConnection() {
  return isConnectedCache;
}

/* ----------------------------------------
    🟦 Snackbar ثابت عند فقد الاتصال
---------------------------------------- */
/**
 * @description يجري فحصًا فعليًا لحالة الاتصال بالإنترنت عن طريق محاولة جلب مورد من `gstatic.com`.
 *   يقوم بتحديث حالة الاتصال المخزنة مؤقتًا (`isConnectedCache`) ويعرض أو يخفي إشعار عدم الاتصال (`offlineToast`) حسب الحاجة.
 * @function performActualConnectionCheck
 * @returns {Promise<boolean>} - وعد (Promise) يُرجع `true` إذا كان الاتصال متاحًا، وإلا `false`.
 * @see isConnectedCache
 * @see offlineToast
 * @see lastConnectionCheck
 */
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
        // ✅ تعديل: استخدام html لتنسيق الرسالة في سطر واحد
        html: '<i class="fas fa-wifi-slash" style="color: #fff; margin-left: 8px;"></i> لا يوجد اتصال بالإنترنت',
        showConfirmButton: false,
        timer: undefined,          // ← بدون مؤقت
        timerProgressBar: false,   // ← إخفاء عدّاد الوقت
        background: '#d32f2f',
        color: '#fff',
        customClass: {
          // ✅ تعديل: إزالة الحشو الزائد لجعل الرسالة أصغر
          popup: 'animate__animated animate__slideInUp no-padding-toast',
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
/**
 * @description يبدأ الفحص الدوري لحالة الاتصال بالإنترنت ويُعدل معالجات الأحداث لتغييرات حالة الاتصال عبر المتصفح.
 * @function startPeriodicConnectionCheck
 * @returns {void}
 * @see performActualConnectionCheck
 * @see CONNECTION_CHECK_INTERVAL
 * @see isConnectedCache
 * @see offlineToast
 */
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
 * @description دالة مركزية لإجراء طلبات API.
 *   تغلف منطق `fetch`، معالجة الأخطاء، وتحويل JSON.
 * @function apiFetch
 * @param {string} endpoint - نقطة النهاية (المسار) في API (e.g., '/users').
 * @param {object} [options={}] - خيارات طلب `fetch`، بما في ذلك `method`, `body`, `headers`, و `specialHandlers`.
 * @param {string} [options.method='GET'] - طريقة طلب HTTP (GET, POST, PUT, DELETE).
 * @param {object|null} [options.body=null] - البيانات التي سيتم إرسالها مع الطلب، يتم تحويلها إلى JSON.
 * @param {object} [options.headers={}] - رأس الطلب HTTP.
 * @param {object} [options.specialHandlers={}] - كائن يحتوي على دوال لمعالجة حالات استجابة HTTP محددة (مثل 401, 404).
 * @returns {Promise<Object>} - وعد (Promise) يحتوي على بيانات الاستجابة من الخادم ككائن JSON، أو كائن خطأ في حالة الفشل.
 * @see baseURL
 */
async function apiFetch(endpoint, options = {}) {
  const { method = 'GET', body = null, specialHandlers = {}, ...restOptions } = options;
  const url = `${baseURL}${endpoint}`;

  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...restOptions.headers,
    },
    ...restOptions,
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  console.log(`%c[API Fetch] ${method} ${endpoint}`, 'color: #17a2b8;', body ? { payload: body } : '');

  try {
    const response = await fetch(url, fetchOptions);

    if (specialHandlers[response.status]) {
      return specialHandlersresponse.status;
    }

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `HTTP error! status: ${response.status}` };
    }
    return data;
  } catch (error) {
    return { error: `فشل الاتصال بالخادم: ${error.message}` };
  }
}
