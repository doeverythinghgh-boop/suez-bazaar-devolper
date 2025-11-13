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

// ✅ تحسين: كائن للوصول المباشر للحالات لتجنب الأرقام السحرية
const ORDER_STATUS_MAP = {
  REVIEW: {
    id: 0,
    state: "قيد المراجعة",
    description: "الطلب تم إرساله وينتظر تأكيد البائع و الادارة.",
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
    description: "المشتري استلم المنتج بنجاح.",
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

// ✅ مصدر الحقيقة الواحد: اشتقاق المصفوفة من الكائن مباشرة
const ORDER_STATUSES = Object.values(ORDER_STATUS_MAP);
