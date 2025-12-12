/**
 * @file dataFetchers.js
 * @description وحدة جلب البيانات (Data Fetching Module).
 * يحتوي هذا الملف على الدوال المسؤولة عن جلب البيانات الأساسية للتطبيق من ملفات JSON المحلية.
 * يتم استخدام `fetch` API لجلب البيانات بشكل غير متزامن.
 */

import { appDataControl, ordersData } from "./config.js";

/**
 * @function fetchControlData
 * @description تقوم هذه الدالة بإرجاع بيانات التحكم من ملف الإعدادات مباشرة.
 * تم استبدال جلب ملف `control.json` باستخدام المتغير `appDataControl` من `config.js`.
 *
 * @returns {Promise<Object>} وعد (Promise) يتم حله (resolves) بكائن بيانات التحكم.
 * @throws {Error} - If there is an error resolving the promise with `appDataControl`.
 * @see appDataControl
 */
export function fetchControlData() {
    try {
        // إرجاع البيانات مباشرة كـ Promise للحفاظ على توافق الواجهة مع الكود الحالي
        return Promise.resolve(appDataControl);
    } catch (error) {
        console.error("Error in fetchControlData:", error);
        return Promise.reject(error);
    }
}

/**
 * @function fetchOrdersData
 * @description تقوم هذه الدالة بإرجاع بيانات الطلبات من ملف الإعدادات مباشرة.
 * تم استبدال جلب ملف `orders_.json` باستخدام المتغير `ordersData` من `config.js`.
 *
 * @returns {Promise<Object>} وعد (Promise) يتم حله بكائن بيانات الطلبات (مصفوفة).
 * @throws {Error} - If there is an error resolving the promise with `ordersData`.
 * @see ordersData
 */
export function fetchOrdersData() {
    try {
        // إرجاع البيانات مباشرة كـ Promise
        return Promise.resolve(ordersData);
    } catch (error) {
        console.error("Error in fetchOrdersData:", error);
        return Promise.reject(error);
    }
}
