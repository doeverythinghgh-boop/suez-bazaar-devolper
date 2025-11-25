/**
 * @description يحدد عنوان URL الأساسي لنقاط نهاية API بناءً على بيئة التشغيل (محلي، Cloudflare Pages، أو تطبيق Android).
 * @type {string}
 */
const VERCEL_URL = "https://bazaar-neon-three.vercel.app";

/**
 * @description قائمة بأسماء النطاقات المسموح لها باستخدام Vercel URL.
 * @type {string[]}
 */
const allowedHosts = [
  "127.0.0.1",
  "localhost",
  "bazaar-bk1.pages.dev",
  "appassets.androidplatform.net",
];

// ✅ تحسين: تبسيط منطق تحديد baseURL باستخدام مصفوفة.
const baseURL = allowedHosts.includes(location.hostname) ? VERCEL_URL : "";

/**
 * @description قائمة بأرقام هواتف المسؤولين المسموح لهم بالوصول الإداري.
 * @type {string[]}
 * @const
 */
const adminPhoneNumbers = ["01024182175", "01026546550"];

/**
 * @description كائن يمثل خريطة لحالات الطلبات المختلفة، مع توفير معرف (id) وحالة (state) ووصف (description) لكل حالة.
 *   يستخدم لتجنب "الأرقام السحرية" وتوفير وصول مباشر لحالات الطلب.
 * @type {Object<string, {id: number, state: string, description: string}>}
 * @const
 */
const ORDER_STATUS_MAP = {
  REVIEW: {
    id: 0,
    state: "قيد المراجعة",
    description: "الطلب تم إرساله وينتظر تأكيد البائع ",
  },
  CONFIRMED: {
    id: 1,
    state: "تم التأكيد",
    description: "البائع وافق على الطلب وسيبدأ في التجهيز والشحن ",
  },
  SHIPPED: {
    id: 2,
    state: "تم الشحن",
    description: "المنتج تم تسليمه لشركة الشحن ",
  },
  DELIVERED: {
    id: 3,
    state: "تم التسليم",
    description: "المشتري استلم المنتج ",
  },
  CANCELLED: {
    id: 31,
    state: "تم الإلغاء",
    description: "الطلب أُلغي من قبل المشتري ",
  },
  REJECTED: {
    id: 32,
    state: "مرفوض",
    description:
      "البائع او الاداره رفضت تنفيذ الطلب _ مثلاً نفاد الكمية أو مشكلة في المنتج _ ",
  },
  RETURNED: {
    id: 33,
    state: "مرتجع",
    description: "المشتري أعاد المنتج بعد استلامه وتم قبول الإرجاع ",
  },
};

/**
 * @description مصفوفة تحتوي على قيم حالات الطلبات المشتقة مباشرة من `ORDER_STATUS_MAP`.
 *   تعتبر مصدر الحقيقة الوحيد لحالات الطلبات.
 * @type {Array<{id: number, state: string, description: string}>}
 * @const
 * @see ORDER_STATUS_MAP
 */
const ORDER_STATUSES = Object.values(ORDER_STATUS_MAP);

/**
 * @description كائن يمثل خريطة لأدوار المستخدمين، يربط الاسم النصي بالمعرف الرقمي المستخدم في قاعدة البيانات.
 *   يعتبر مصدر الحقيقة الوحيد لأدوار المستخدمين.
 * @type {Object<string, number>}
 * @const
 */
const USER_ROLES_MAP = {
  GUEST: -1, // زائر
  CUSTOMER: 0, // عميل
  SELLER: 1, // بائع
  DELIVERY: 2, // خدمة توصيل
  ADMIN: 3, // مسؤول
};

/**
 * @description يحول الاسم النصي للدور (مثل 'SELLER') إلى المعرف الرقمي المقابل له.
 * @function roleToNumber
 * @param {string} roleString - الاسم النصي للدور.
 * @returns {number} - المعرف الرقمي للدور. يعود بقيمة العميل (0) كقيمة افتراضية.
 */
function roleToNumber(roleString) {
  return USER_ROLES_MAP[roleString.toUpperCase()] ?? USER_ROLES_MAP.CUSTOMER;
}

// التحقق من وجود المتغيرات قبل تعريفها لمنع أخطاء إعادة التعريف
if (!("currentUserIsGuest" in window) ||
    typeof window.currentUserIsGuest !== "boolean") {

  Object.assign(window, {
    currentUserIsGuest: false,
    currentUserIsCUSTOMER: false,
    currentUserIsSELLER: false,
    currentUserIsDELIVERY: false,
    currentUserIsADMIN: false,
    currentUserKey: ""
  });
}

/**
 * @description خريطة معكوسة لتسريع عملية تحويل المعرف الرقمي للدور إلى الاسم النصي.
 *   تُستخدم داخل دالة `numberToRole` للوصول المباشر (O(1)).
 * @type {Map<number, string>}
 * @const
 */
const ROLE_NUMBER_TO_STRING_MAP = new Map(
  Object.entries(USER_ROLES_MAP).map(([key, value]) => [value, key])
);

/**
 * @description يحول المعرف الرقمي للدور إلى الاسم النصي المقابل له (مثل 'SELLER') بكفاءة.
 * @function numberToRole
 * @param {number} roleNumber - المعرف الرقمي للدور.
 * @returns {string} - الاسم النصي للدور. يعود بـ 'CUSTOMER' كقيمة افتراضية.
 */
function numberToRole(roleNumber) {
  // ✅ تحسين: استخدام Map للوصول المباشر O(1) بدلاً من البحث الخطي O(n).
  return ROLE_NUMBER_TO_STRING_MAP.get(roleNumber) || "GUEST";
}
function setUserType(typeUser, key) {
  window.currentUserKey = key;

  // Reset all roles first
  Object.assign(window, {
    currentUserIsGuest: false,
    currentUserIsCUSTOMER: false,
    currentUserIsSELLER: false,
    currentUserIsDELIVERY: false,
    currentUserIsADMIN: false
  });

  // Activate one role
  switch (typeUser) {
    case -1:
      window.currentUserIsGuest = true;
      console.log("user type is GUEST", key);
      break;

    case 0:
      window.currentUserIsCUSTOMER = true;
      console.log("user type is CUSTOMER", key);
      break;

    case 1:
      window.currentUserIsSELLER = true;
      console.log("user type is SELLER", key);
      break;

    case 2:
      window.currentUserIsDELIVERY = true;
      console.log("user type is DELIVERY", key);
      break;

    case 3:
      window.currentUserIsADMIN = true;
      console.log("user type is ADMIN", key);
      break;

    default:
      console.warn("Unknown user type:", typeUser, key);
  }
}

