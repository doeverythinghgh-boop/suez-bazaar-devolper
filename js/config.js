/**
 * @description يحدد عنوان URL الأساسي لنقاط نهاية API بناءً على بيئة التشغيل (محلي، Cloudflare Pages، أو تطبيق Android).
 * @type {string}
 */
let baseURL = "";

// لو محلي → استخدم Vercel
if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
  baseURL = "https://bazaar-neon-three.vercel.app";
}
// لو Cloudflare Pages → استخدم Vercel
else if (location.hostname.endsWith("pages.dev") || location.hostname.endsWith("bazaar-bk1.pages.dev")) {
  baseURL = "https://bazaar-neon-three.vercel.app";
}
// ✅ جديد: لو داخل تطبيق أندرويد → استخدم Vercel
else if (location.hostname === "appassets.androidplatform.net") {
  baseURL = "https://bazaar-neon-three.vercel.app";
}

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
    description: "الطلب تم إرساله وينتظر تأكيد البائع.",
  },
  CONFIRMED: {
    id: 1,
    state: "تم التأكيد",
    description: "البائع وافق على الطلب وسيبدأ في التجهيز.",
  },
  SHIPPED: {
    id: 2,
    state: "تم الشحن",
    description: "المنتج تم تسليمه لشركة الشحن.",
  },
  DELIVERED: {
    id: 3,
    state: "تم التسليم",
    description: "المشتري استلم المنتج.",
  },
  CANCELLED: {
    id: 31,
    state: "تم الإلغاء",
    description: "الطلب أُلغي من قبل المشتري.",
  },
  REJECTED: {
    id: 32,
    state: "مرفوض",
    description:
      "البائع رفض تنفيذ الطلب (مثلاً نفاد الكمية أو مشكلة في المنتج).",
  },
  RETURNED: {
    id: 33,
    state: "مرتجع",
    description: "المشتري أعاد المنتج بعد استلامه وتم قبول الإرجاع.",
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
