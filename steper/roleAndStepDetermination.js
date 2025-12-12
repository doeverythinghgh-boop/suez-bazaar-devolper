/**
 * @file roleAndStepDetermination.js
 * @description وحدة تحديد الأدوار وحالة الخطوات (Role and Step Logic).
 * يحتوي هذا الملف على المنطق "الذكي" للتطبيق:
 * 1. تحديد من هو المستخدم الحالي (بائع، مشتري، ساعي، أو مسؤول) بناءً على بياناته وعلاقته بالطلبات.
 * 2. تحديد الخطوة الحالية النشطة في شريط التقدم بناءً على البيانات المحفوظة أو الحالة الافتراضية.
 * 3. التحقق من صلاحيات المستخدم للوصول إلى خطوة معينة.
 */

import { loadStepState } from "./stateManagement.js";
import { ADMIN_IDS } from "./config.js";

/**
 * @function determineUserType
 * @description تقوم هذه الدالة بتحديد نوع المستخدم (Role) بناءً على معرفه (ID) والبيانات المتاحة.
 * المنطق يتبع تسلسلاً هرمياً:
 * 1. هل هو Admin؟
 * 2. هل هو مرتبط بأي طلب كمشتري؟
 * 3. هل هو مرتبط بأي منتج كبائع؟
 * 4. هل هو معين لتوصيل أي منتج كساعي؟
 *
 * @param {string} userId - معرف المستخدم الحالي الذي نريد تحديد دوره.
 * @param {Array<Object>} ordersData - مصفوفة تحتوي على كل بيانات الطلبات للبحث فيها.
 * @param {Object} controlData - بيانات التحكم (قد تحتوي على معلومات إضافية، تم الاحتفاظ بها للتوافق المستقبلي).
 *
 * @returns {string|null} - يعيد نوع المستخدم كنص ('admin', 'buyer', 'seller', 'courier') أو null إذا لم يتم التعرف عليه.
 * @throws {Error} - If a fatal error occurs during user type determination (e.g., user is both buyer and seller).
 * @see ADMIN_IDS
 */
export function determineUserType(userId, ordersData, controlData) {
    try {
        // 1. التحقق مما إذا كان المستخدم هو admin (أولوية قصوى)
        // يتم التحقق من القائمة الثابتة في ملف config.js
        if (ADMIN_IDS.includes(userId)) {
            return "admin";
        }

        // متغيرات لتتبع الأدوار التي تم العثور عليها للمستخدم
        let isBuyer = false;
        let isSeller = false;
        let isCourier = false;

        // 2. البحث في جميع الطلبات لتحديد علاقة المستخدم بها
        for (const order of ordersData) {
            // هل المستخدم هو صاحب الطلب (المشتري)؟
            if (order.user_key === userId) isBuyer = true;
            
            // فحص عناصر الطلب (المنتجات)
            for (const item of order.order_items) {
                // هل المستخدم هو بائع هذا المنتج؟
                if (item.seller_key === userId) isSeller = true;
                
                // هل المستخدم هو المسؤول عن توصيل هذا المنتج؟
                // التحقق الآمن من وجود كائن supplier_delivery ثم delivery_key
                if (item.supplier_delivery && item.supplier_delivery.delivery_key) {
                    const deliveryKey = item.supplier_delivery.delivery_key;
                    // دعم delivery_key سواء كان قيمة واحدة (string) أو مصفوفة (array)
                    if (Array.isArray(deliveryKey)) {
                        if (deliveryKey.includes(userId)) {
                            isCourier = true;
                        }
                    } else {
                        if (deliveryKey === userId) {
                            isCourier = true;
                        }
                    }
                }
            }
        }

        // 3. معالجة تضارب الأدوار (Validation)
        // لا يُسمح للمستخدم أن يكون بائعاً ومشترياً في نفس الوقت في هذا النظام
        if (isBuyer && isSeller) {
            console.error(
                "Fatal Error: Query unacceptable. User cannot be both 'seller' and 'buyer'. Please review data."
            );
            return null;
        }

        // 4. إرجاع الدور بناءً على الأولوية المحددة
        // إذا كان بائعاً، نعيده كبائع
        if (isSeller) return "seller";
        // إذا كان مشترياً، نعيده كمشتري
        if (isBuyer) return "buyer";
        // إذا كان ساعياً، نعيده كساعي
        if (isCourier) return "courier";

        // 5. في حالة عدم تطابق أي دور بعد فحص كل البيانات
        console.error(
            `Fatal Error: No role found for user ID '${userId}'. Stopping execution.`
        );
        return null;
    } catch (roleError) {
        console.error("Error in determineUserType:", roleError);
        return null;
    }
}

/**
 * @function determineCurrentStepId
 * @description تحدد هذه الدالة ما هي الخطوة التي يجب أن تكون نشطة حالياً عند تحميل الصفحة.
 * تعتمد على البيانات المحفوظة في LocalStorage لتذكر آخر حالة وصل إليها المستخدم.
 *
 * @param {Object} controlData - بيانات التحكم التي تحتوي على تعريف الخطوات وأرقامها.
 *
 * @returns {{stepId: string, stepNo: string, status: string}} - كائن يحتوي على معرف الخطوة، رقمها، وحالتها.
 * @throws {Error} - If an error occurs during step determination.
 * @see loadStepState
 */
export function determineCurrentStepId(controlData) {
    try {
        // 1. الأولوية الأولى: محاولة تحميل الخطوة الحالية المحفوظة صراحةً من localStorage
        // هذا يحدث عندما يقوم المستخدم بتفعيل خطوة يدوياً
        const savedCurrentStep = loadStepState("current_step");
        if (savedCurrentStep && savedCurrentStep.stepId) {
            return savedCurrentStep;
        }

        // دالة مساعدة صغيرة للحصول على رقم الخطوة من controlData باستخدام معرفها
        const getStepNo = (id, defaultNo) =>
            controlData.steps.find((s) => s.id === id)?.no || defaultNo;

        // 2. الأولوية الثانية: الاستنتاج المنطقي (Fallback Logic)
        // إذا لم يكن هناك "خطوة حالية" محفوظة، نفحص ما إذا كانت هناك بيانات محفوظة لخطوات متقدمة
        // ونفترض أن آخر خطوة تم العمل عليها هي الخطوة الحالية.
        
        const deliveredState = loadStepState("step-delivered");
        const confirmedState = loadStepState("step-confirmed");
        const reviewState = loadStepState("step-review");

        // الترتيب من الأحدث (النهاية) إلى الأقدم (البداية)
        
        // إذا كان هناك بيانات تسليم، فالمرحلة الحالية هي "تم التسليم"
        if (deliveredState) {
            return {
                stepId: "step-delivered",
                stepNo: getStepNo("step-delivered", "4"),
                status: "active",
            };
        }
        // إذا كان هناك بيانات تأكيد (شحن)، فالمرحلة الحالية هي "شُحن"
        // ملاحظة: المنطق هنا يفترض أن وجود بيانات تأكيد يعني الانتقال لمرحلة الشحن
        if (confirmedState) {
            return {
                stepId: "step-shipped",
                stepNo: getStepNo("step-shipped", "3"),
                status: "active",
            };
        }
        // إذا كان هناك بيانات مراجعة، فالمرحلة الحالية هي "مؤكد"
        if (reviewState) {
            return {
                stepId: "step-confirmed",
                stepNo: getStepNo("step-confirmed", "2"),
                status: "active",
            };
        }

        // 3. الحالة الافتراضية (Default): البداية من أول خطوة "مراجعة"
        return {
            stepId: "step-review",
            stepNo: getStepNo("step-review", "1"),
            status: "active",
        };
    } catch (stepError) {
        console.error("Error in determineCurrentStepId:", stepError);
        // إرجاع الافتراضي في حالة حدوث أي خطأ لضمان عدم توقف التطبيق
        return {
            stepId: "step-review",
            stepNo: controlData.steps.find((s) => s.id === "step-review")?.no || "1",
            status: "active",
        };
    }
}

/**
 * @function isStepAllowedForCurrentUser
 * @description تتحقق مما إذا كان المستخدم الحالي يمتلك الصلاحية للتفاعل مع خطوة معينة.
 * تعتمد على مصفوفة `allowedSteps` المعرفة لكل دور في ملف `control.json`.
 *
 * @param {string} stepId - معرف الخطوة المراد التحقق منها (مثل 'step-review').
 * @param {object} data - بيانات التحكم الكاملة التي تحتوي على تعريفات المستخدمين وصلاحياتهم.
 *
 * @returns {boolean} - true إذا كان مسموحاً له، و false إذا لم يكن.
 * @throws {Error} - If an error occurs during permission checking.
 */
export function isStepAllowedForCurrentUser(stepId, data) {
    try {
        const currentUserType = data.currentUser.type;
        
        // البحث عن إعدادات الصلاحيات الخاصة بنوع المستخدم الحالي
        const userPermissions = data.users.find(
            (user) => user.type === currentUserType
        );

        // إذا وجدت الصلاحيات وكانت تحتوي على قائمة خطوات مسموحة
        if (userPermissions && userPermissions.allowedSteps) {
            // تحقق مما إذا كانت الخطوة المطلوبة موجودة في القائمة
            return userPermissions.allowedSteps.includes(stepId);
        }
        
        // الافتراضي هو المنع
        return false;
    } catch (permissionError) {
        console.error("Error in isStepAllowedForCurrentUser:", permissionError);
        return false;
    }
}
