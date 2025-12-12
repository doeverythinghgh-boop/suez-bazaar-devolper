/**
 * @file js/config.js
 * @description هذا الملف يحتوي على إعدادات وثوابت عامة تستخدم في جميع أنحاء التطبيق،
 *   مثل عناوين URL للـ API، قوائم المستخدمين المسموح لهم، وخريطة حالات الطلبات.
 *   يهدف إلى توفير نقطة مركزية لإدارة التكوينات.
 */

/**
 * @description يحدد عنوان URL الأساسي لنقاط نهاية API بناءً على بيئة التشغيل (محلي، Cloudflare Pages، أو تطبيق Android).
 * @type {string}
 * @const
 */
const VERCEL_URL = "https://bazaar-neon-three.vercel.app";

/**
 * @description قائمة بأسماء النطاقات المسموح لها باستخدام Vercel URL.
 * @type {string[]}
 * @const
 */
const allowedHosts = [
  "127.0.0.1",
  "localhost",
  "bazaar-bk1.pages.dev",
  "appassets.androidplatform.net",
];

// ✅ تحسين: تبسيط منطق تحديد baseURL باستخدام مصفوفة.
/**
 * @description عنوان URL الأساسي لواجهة برمجة التطبيقات (API). يتم تحديده ديناميكيًا بناءً على بيئة التشغيل.
 * @type {string}
 * @const
 */
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
//متغير حاله المستخدم الحالي علي شكل جسون


