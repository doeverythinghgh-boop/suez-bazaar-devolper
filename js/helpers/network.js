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
 * ✅ جديد: دالة مركزية لإجراء طلبات API.
 * تغلف منطق fetch، معالجة الأخطاء، وتحويل JSON.
 * @param {string} endpoint - نقطة النهاية (e.g., '/api/users').
 * @param {object} [options={}] - خيارات fetch، بما في ذلك method, body, headers.
 * @returns {Promise<Object>} - بيانات الاستجابة أو كائن خطأ.
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
