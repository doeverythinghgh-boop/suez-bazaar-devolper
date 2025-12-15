/**
 * @file js/config.js
 * @description This file contains general settings and constants used throughout the application,
 *   such as API URLs, allowed user lists, and order status maps.
 *   It aims to provide a central point for configuration management.
 */

/**
 * @description Defines the base API URL based on the runtime environment (Local, Cloudflare Pages, or Android App).
 * @type {string}
 * @const
 */
const VERCEL_URL = "https://bazaar-neon-three.vercel.app";

/**
 * @description List of domain names allowed to use the Vercel URL.
 * @type {string[]}
 * @const
 */
const allowedHosts = [
  "127.0.0.1",
  "localhost",
  "bazaar-bk1.pages.dev",
  "appassets.androidplatform.net",
  "doeverythinghgh-boop.github.io",
];

// ✅ Improvement: Simplify baseURL determination logic using an array.
/**
 * @description Base API URL. Dynamically determined based on the runtime environment.
 * @type {string}
 * @const
 */
const baseURL = allowedHosts.includes(location.hostname) ? VERCEL_URL : "";

/**
 * @description List of admin phone numbers allowed administrative access.
 * @type {string[]}
 * @const
 */
const adminPhoneNumbers = ["01024182175", "01026546550"];

/**
 * @description Object mapping different order statuses, providing an ID, state, and description for each.
 *   Used to avoid "magic numbers" and provide direct access to order states.
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
 * @description Array containing order status values derived directly from `ORDER_STATUS_MAP`.
 *   Considered the single source of truth for order statuses.
 * @type {Array<{id: number, state: string, description: string}>}
 * @const
 * @see ORDER_STATUS_MAP
 */
const ORDER_STATUSES = Object.values(ORDER_STATUS_MAP);
// Current user state variable as JSON


