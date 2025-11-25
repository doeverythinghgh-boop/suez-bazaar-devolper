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
const CONNECTION_CHECK_INTERVAL = 10000; // 10 ثوانٍ

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

  console.log(`%c[API Fetch] ${method} ${endpoint}`, 'color: #b81717ff;', body ? { payload: body } : '');

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

/**
 * @description يجلب توكنات الإشعارات (FCM tokens) لجميع المسؤولين.
 *   يستخدم قائمة ثابتة من مفاتيح المسؤولين لإجراء طلب للـ API.
 * @async
 * @function getAdminTokens
 * @returns {Promise<string[]>} - وعد (Promise) يحتوي على مصفوفة من توكنات المسؤولين.
 * @see apiFetch
 */
async function getAdminTokens() {
  try {
    // المفاتيح الخاصة بالمسؤولين. في المستقبل، يمكن جلبها ديناميكيًا.
    const ADMIN_KEYS = ["dl14v1k7", "682dri6b"];
    const adminKeysQuery = ADMIN_KEYS.join(",");
    const response = await apiFetch(
      `/api/tokens?userKeys=${encodeURIComponent(adminKeysQuery)}`
    );
    return response?.tokens || [];
  } catch (error) {
    console.error("[Notifications] فشل في جلب توكنات المسؤولين:", error);
    return []; // إرجاع مصفوفة فارغة في حالة حدوث خطأ
  }
}

/**
 * @description يجلب توكنات الإشعارات (FCM tokens) لجميع خدمات التوصيل النشطة المرتبطة ببائع معين.
 * @async
 * @function getTokensForActiveDelivery2Seller
 * @param {string} sellerKey - المفتاح الفريد للبائع (`user_key`).
 * @returns {Promise<string[]|undefined>} - وعد (Promise) يحتوي على مصفوفة من توكنات الإشعارات، أو `undefined` في حالة عدم وجود علاقات.
 * @see getActiveDeliveryRelations - الدالة التي تجلب علاقات التوصيل النشطة.
 */
 async function getTokensForActiveDelivery2Seller(sellerKey) {
    const deliveryUsers = await getActiveDeliveryRelations(sellerKey);
    const deliveryTokens = deliveryUsers
      ?.map((user) => user.fcmToken)
      .filter(Boolean); // استخراج التوكنات الصالحة فقط
    return deliveryTokens;
  }

  /**
 * @description تتلقى الدالة مصفوفة نهائية من توكنات الإشعارات الصالحة (FCM Tokens)
 * وتقوم بإرسال الإشعار المحدد إلى جميعها بالتوازي.
 * @function sendNotificationsToTokens
 * @param {Array<string>} allTokens - مصفوفة نهائية من توكنات الإشعارات الصالحة والفريدة.
 * @param {string} title - عنوان الإشعار.
 * @param {string} body - نص الإشعار.
 * @returns {Promise<void>}
 * @dependency {function} sendNotification - دالة لإرسال إشعار FCM.
 */
async function sendNotificationsToTokens(allTokens, title, body) {
    console.log(`[Notifications] بدء عملية إرسال الإشعارات. التوكنات المستلمة: ${allTokens?.length || 0}`);

    // 1. التحقق من وجود توكنات للإرسال
    if (!Array.isArray(allTokens) || allTokens.length === 0) {
        console.warn("[Notifications] لا توجد توكنات صالحة في المصفوفة. سيتم إنهاء العملية.");
        return;
    }

    // 2. تهيئة مصفوفة لتخزين وعود الإرسال
    const notificationPromises = [];
    console.log(`[Notifications] جاري تجهيز وعود الإرسال لـ ${allTokens.length} توكن فريد.`);

    // استخدام حلقة for...of لإنشاء الوعود
    for (const token of allTokens) {
        // التأكد من أن التوكن ليس قيمة باطلة (null/undefined/empty string) قبل الإنشاء
        if (token) {
            notificationPromises.push(sendNotification(token, title, body));
            // console.log(`[Notifications Debug] تم إنشاء وعد الإرسال للتوكن: ${token.substring(0, 10)}...`);
        } else {
            console.warn("[Notifications Debug] تم تجاهل توكن بقيمة باطلة (null/empty).");
        }
    }
    
    console.log(`[Notifications] إجمالي عدد وعود الإرسال الجاهزة: ${notificationPromises.length}`);
    console.log("[Notifications] استخدام Promise.all لإرسال جميع الإشعارات بالتوازي.");

    // 3. إرسال جميع الإشعارات بالتوازي
    try {
        await Promise.all(notificationPromises);
        console.log(`[Notifications SUCCESS] تم إرسال ${notificationPromises.length} إشعار بنجاح. انتهت عملية الإشعار.`);
    } catch (error) {
        // تسجيل الأخطاء المتعلقة بفشل الإرسال (دون إيقاف العملية الرئيسية)
        console.error("[Notifications ERROR] فشل في إرسال بعض الإشعارات. تحقق من سجلات sendNotification الفردية.", error);
    }
}

/**
 * @description تجلب توكنات إشعارات Firebase (FCM Tokens) للمستخدمين.
 * تعتمد على نقطة النهاية `/api/tokens` التي تقبل قائمة المفاتيح عبر `userKeys` كـ Query Parameter.
 * @function getUsersTokens
 * @param {Array<string>} usersKeys - قائمة بمفاتيح المستخدمين (`user_key`) .
 * @returns {Promise<Array<string>>} - مصفوفة تحتوي على جميع توكنات الإشعارات الصالحة التي تم جلبها.
 * @see apiFetch
 */
async function getUsersTokens(usersKeys) {
    // إذا لم يكن هناك بائعون، لا تقم بأي طلب
    if (!usersKeys || usersKeys.length === 0) {
        return [];
    }

    // بناء استعلام URL آمن (مسار API فقط) لجلب توكنات البائعين
    const userKeysQuery = usersKeys.join(',');
    const apiUrlPath = `/api/tokens?userKeys=${encodeURIComponent(userKeysQuery)}`;

    try {
        // استخدام apiFetch (التي يفترض أنها تعالج baseURL وترويسات CORS و Status 4xx/5xx)
        const result = await apiFetch(apiUrlPath);

        // 4. التحقق من هيكل الاستجابة المتوقع (الاستجابة الناجحة تحتوي على مصفوفة tokens)
        if (result?.tokens) {
            return result.tokens;
        }
        
        // التعامل مع حالة الاستجابة الفارغة أو الخطأ الذي يرجعه الخادم/apiFetch
        if (result && result.error) {
             console.error('[FCM] API returned an error:', result.error);
        }
        return [];

    } catch (error) {
        // معالجة أخطاء الشبكة أو الأخطاء التي لم يتم التعامل معها في apiFetch
        console.error('[FCM] Critical error during token fetch:', error);
        return []; 
    }
}