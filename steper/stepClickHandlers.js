/**
 * @file stepClickHandlers.js
 * @description وحدة معالجة نقرات الخطوات (Step Click Handlers).
 * هذا الملف مسؤول عن ربط أحداث النقر (Click Events) بعناصر الخطوات في الواجهة.
 * يحدد ماذا يحدث عند النقر على كل خطوة بناءً على نوع المستخدم وصلاحياته.
 */

import { isStepAllowedForCurrentUser } from "./roleAndStepDetermination.js";
import { showUnauthorizedAlert } from "./uiUpdates.js";
import {
    showProductKeysAlert,
    showUnselectedProductsAlert,
    showDeliveryConfirmationAlert,
    showReturnedProductsAlert,
} from "./buyerPopups.js";
import {
    showSellerConfirmationProductsAlert,
    showSellerRejectedProductsAlert,
    showShippingInfoAlert,
} from "./sellerPopups.js";

/**
 * @function addStepClickListeners
 * @description تقوم هذه الدالة بإضافة مستمعي أحداث النقر (Event Listeners) لجميع عناصر الخطوات في الصفحة.
 * عند النقر، تقوم بالتحقق من الصلاحيات ثم فتح النافذة المنبثقة المناسبة.
 *
 * @param {object} data - بيانات التحكم الكاملة (Control Data).
 * @param {Array<object>} ordersData - بيانات الطلبات.
 * @param {boolean} isBuyerReviewModificationLocked - حالة خاصة تحدد ما إذا كان تعديل المراجعة مقفلاً (مثلاً لأن الطلب قد شُحن).
 * @returns {void}
 * @throws {Error} If there is an error adding click listeners or handling step clicks.
 * @see isStepAllowedForCurrentUser
 * @see showUnauthorizedAlert
 * @see showProductKeysAlert
 * @see showUnselectedProductsAlert
 * @see showDeliveryConfirmationAlert
 * @see showReturnedProductsAlert
 * @see showSellerConfirmationProductsAlert
 * @see showSellerRejectedProductsAlert
 * @see showShippingInfoAlert
 */
export function addStepClickListeners(
    data,
    ordersData,
    isBuyerReviewModificationLocked
) {
    try {
        // تحديد جميع العناصر التي تحمل الكلاس .step-item
        const stepItems = document.querySelectorAll(".step-item");

        stepItems.forEach((stepItem) => {
            stepItem.addEventListener("click", () => {
                const stepId = stepItem.id;
                const userType = data.currentUser.type;

                // 1. التحقق الأمني: هل المستخدم مسموح له بفتح هذه الخطوة؟
                if (!isStepAllowedForCurrentUser(stepId, data)) {
                    showUnauthorizedAlert(); // عرض رسالة خطأ
                    return; // إيقاف التنفيذ فوراً
                }

                // 2. التوجيه: فتح النافذة المناسبة بناءً على معرف الخطوة ونوع المستخدم
                switch (stepId) {
                    case "step-review":
                        // خطوة المراجعة: تعرض المنتجات للمراجعة
                        showProductKeysAlert(
                            data,
                            ordersData,
                            isBuyerReviewModificationLocked
                        );
                        break;

                    case "step-confirmed":
                        // خطوة التأكيد: خاصة بالبائع لتأكيد توفر المنتجات
                        if (userType === "seller")
                            showSellerConfirmationProductsAlert(data, ordersData);
                        break;

                    case "step-shipped":
                        // خطوة الشحن: للبائع أو الساعي لعرض ما تم شحنه
                        if (userType === "seller" || userType === "courier")
                            showShippingInfoAlert(data, ordersData);
                        break;

                    case "step-cancelled":
                        // خطوة الإلغاء: تعرض المنتجات التي ألغاها المشتري
                        showUnselectedProductsAlert(data, ordersData);
                        break;

                    case "step-rejected":
                        // خطوة الرفض: تعرض المنتجات التي رفضها البائع
                        showSellerRejectedProductsAlert(data, ordersData);
                        break;

                    case "step-delivered":
                        // خطوة التسليم: للمشتري لتأكيد الاستلام أو الساعي للمتابعة
                        if (userType === "buyer" || userType === "courier")
                            showDeliveryConfirmationAlert(data, ordersData);
                        break;

                    case "step-returned":
                        // خطوة الإرجاع: تعرض المنتجات التي تم إرجاعها
                        showReturnedProductsAlert(data, ordersData);
                        break;
                }
            });
        });
    } catch (listenerError) {
        console.error("Error in addStepClickListeners:", listenerError);
    }
}
