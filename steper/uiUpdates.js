/**
 * @file uiUpdates.js
 * @description وحدة تحديث واجهة المستخدم (UI Updates Module).
 * يحتوي هذا الملف على جميع الدوال التي تتعامل مباشرة مع DOM (عناصر الصفحة).
 * يشمل ذلك:
 * - إظهار رسائل التنبيه والخطأ.
 * - تحديث حالة الخطوات (تلوين الخطوة النشطة).
 * - إضافة تأثيرات الحركة (Animations).
 * - إنشاء عناصر HTML ديناميكية (مثل تذييل النوافذ المنبثقة).
 */

import { determineCurrentStepId } from "./roleAndStepDetermination.js";
import { saveStepState, loadStepState, saveStepDate, loadStepDate } from "./stateManagement.js";

// متغير لتخزين مؤقت الرسالة (لإدارة التكرار ومنع تراكم المؤقتات)
let messageTimeout;

/**
 * @description تنسيق التاريخ والوقت للعرض.
 * التنسيق: YYYY-MM-DD hh:mm:ss A (نظام 12 ساعة)
 * @function formatDate
 * @param {string|Date} dateInput - التاريخ المراد تنسيقه.
 * @returns {string} - التاريخ المنسق.
 */
function formatDate(dateInput) {
    if (!dateInput) return "";
    const date = new Date(dateInput);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // الساعة 0 تصبح 12

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${ampm}`;
}

/**
 * @description تعرض رسالة تنبيه للمستخدم عندما يحاول النقر على خطوة ليس لديه صلاحية الوصول إليها.
 * تظهر الرسالة لفترة قصيرة ثم تختفي تلقائياً.
 * @function showUnauthorizedAlert
 * @returns {void}
 */
export function showUnauthorizedAlert() {
    try {
        const messageElement = document.getElementById("permission-denied-message");
        if (!messageElement) return;

        // مسح المؤقت السابق إذا نقر المستخدم مرة أخرى بسرعة قبل اختفاء الرسالة السابقة
        // هذا يمنع اختفاء الرسالة الجديدة مبكراً جداً
        if (messageTimeout) {
            clearTimeout(messageTimeout);
        }

        messageElement.textContent = "ليس لديك الصلاحية لهذه المرحلة";
        messageElement.classList.add("show"); // إضافة كلاس CSS لإظهار الرسالة

        // إخفاء الرسالة بعد 3 ثواني
        messageTimeout = setTimeout(() => {
            messageElement.classList.remove("show");
        }, 3000);
    } catch (alertError) {
        console.error("Error in showUnauthorizedAlert:", alertError);
    }
}

/**
 * @description تضيف تأثير حركة (Animation) على دائرة الخطوة لجذب الانتباه.
 * @function animateStep
 * @param {HTMLElement} circle - عنصر الدائرة (DOM Element) المراد تحريكه.
 * @returns {void}
 */
export function animateStep(circle) {
    try {
        // يفترض وجود تعريف للأنيميشن 'pulse' في ملف CSS
        circle.style.animation = "pulse 2.5s infinite";
    } catch (animationError) {
        console.error("Error in animateStep:", animationError);
    }
}

/**
 * @description تقوم بتحديث المظهر المرئي لشريط التقدم.
 * تزيل التمييز عن جميع الخطوات ثم تضيفه فقط للخطوة المحددة كـ "حالية".
 * @function highlightCurrentStep
 * @param {string} stepId - معرف الخطوة المراد إبرازها وتمييزها.
 * @returns {void}
 */
export function highlightCurrentStep(stepId) {
    try {
        // 1. تنظيف الحالة السابقة: إزالة التظليل من جميع الخطوات
        document.querySelectorAll(".step-item.current").forEach((item) => {
            item.classList.remove("current");
            const circle = item.querySelector(".step-circle");
            if (circle) circle.style.animation = ""; // إيقاف الحركة
        });

        // 2. تفعيل الحالة الجديدة: إضافة التظليل والحركة للخطوة المحددة
        const stepItem = document.getElementById(stepId);
        if (stepItem) {
            stepItem.classList.add("current");
            animateStep(stepItem.querySelector(".step-circle"));
        }
    } catch (highlightError) {
        console.error("Error in highlightCurrentStep:", highlightError);
    }
}

/**
 * @description دالة مركزية لتحديث حالة التطبيق بالكامل بناءً على البيانات.
 * تقوم بما يلي:
 * 1. تحديد الخطوة الحالية.
 * 2. تحديث الواجهة لإبراز الخطوة الحالية.
 * 3. حفظ الحالة الجديدة.
 * 4. التحقق من الحالات الخاصة (مثل وجود منتجات ملغاة أو مرفوضة) وتحديث أيقونات الخطوات المقابلة.
 * 5. عرض وصف الخطوة مع التاريخ.
 * @function updateCurrentStepFromState
 * @param {object} controlData - بيانات التحكم.
 * @param {Array<object>} ordersData - بيانات الطلبات (اختياري).
 * @returns {void}
 */
export function updateCurrentStepFromState(controlData, ordersData) {
    try {
        // تحديد الخطوة الحالية
        const currentStep = determineCurrentStepId(controlData);

        // تحديث الواجهة
        highlightCurrentStep(currentStep.stepId);

        // تحديث وصف الخطوة (عرض نصوص متعددة بناءً على الحالة)
        const descriptionContainer = document.getElementById("step-description-container");
        const secondaryDescriptionContainer = document.getElementById("secondary-step-description-container");

        if (descriptionContainer) descriptionContainer.innerHTML = "";
        if (secondaryDescriptionContainer) secondaryDescriptionContainer.innerHTML = "";

        // دالة مساعدة لإضافة الوصف والتاريخ
        const appendDescription = (container, text, stepId) => {
            const p = document.createElement("p");
            p.style.margin = "0.5rem 0";

            // تحديد التاريخ
            let dateStr = "";
            if (stepId === "step-review") {
                // للخطوة الأولى، نأخذ تاريخ الإنشاء من الطلب الأول
                if (ordersData && ordersData.length > 0 && ordersData[0].created_at) {
                    dateStr = formatDate(ordersData[0].created_at);
                }
            } else {
                // للخطوات الأخرى، نتحقق من localStorage
                const storedDate = loadStepDate(stepId);

                if (storedDate) {
                    dateStr = storedDate;
                } else if (stepId === currentStep.stepId) {
                    // إذا كانت هذه هي الخطوة الحالية ولا يوجد تاريخ محفوظ، نحفظ التاريخ الحالي
                    // ملاحظة: هذا يفترض أن الدالة تستدعى عند تفعيل الخطوة
                    dateStr = formatDate(new Date());
                    saveStepDate(stepId, dateStr);
                }
            }

            if (dateStr) {
                p.innerHTML = `${text}<br><span style="font-size: 0.8rem; color: #666; display: block; margin-top: 0.2rem;" dir="ltr">${dateStr}</span>`;
            } else {
                p.textContent = text;
            }

            container.appendChild(p);
        };

        // 1. وصف الخطوة الحالية النشطة
        const currentStepInfo = controlData.steps.find(s => s.id === currentStep.stepId);
        if (currentStepInfo && currentStepInfo.description) {
            // إذا كانت الخطوة من الخطوات الأساسية (1-4)
            if (["step-review", "step-confirmed", "step-shipped", "step-delivered"].includes(currentStep.stepId)) {
                if (descriptionContainer) {
                    appendDescription(descriptionContainer, currentStepInfo.description, currentStep.stepId);
                }
            } else {
                // إذا كانت الخطوة من الخطوات النهائية (5-7)
                if (secondaryDescriptionContainer) {
                    appendDescription(secondaryDescriptionContainer, currentStepInfo.description, currentStep.stepId);
                }
            }
        }

        // 2. التحقق من وجود منتجات ملغاة (step-cancelled)
        const reviewState = loadStepState("step-review");
        if (reviewState && reviewState.unselectedKeys && reviewState.unselectedKeys.length > 0 && currentStep.stepId !== "step-cancelled") {
            const cancelledStepInfo = controlData.steps.find(s => s.id === "step-cancelled");
            if (cancelledStepInfo && cancelledStepInfo.description && secondaryDescriptionContainer) {
                appendDescription(secondaryDescriptionContainer, cancelledStepInfo.description, "step-cancelled");
            }
        }

        // 3. التحقق من وجود منتجات مرفوضة (step-rejected)
        const confirmedState = loadStepState("step-confirmed");
        if (confirmedState && confirmedState.deselectedKeys && confirmedState.deselectedKeys.length > 0 && currentStep.stepId !== "step-rejected") {
            const rejectedStepInfo = controlData.steps.find(s => s.id === "step-rejected");
            if (rejectedStepInfo && rejectedStepInfo.description && secondaryDescriptionContainer) {
                appendDescription(secondaryDescriptionContainer, rejectedStepInfo.description, "step-rejected");
            }
        }

        // 4. التحقق من وجود منتجات مرتجعة (step-returned)
        const deliveredState = loadStepState("step-delivered");
        if (deliveredState && deliveredState.returnedKeys && deliveredState.returnedKeys.length > 0 && currentStep.stepId !== "step-returned") {
            const returnedStepInfo = controlData.steps.find(s => s.id === "step-returned");
            if (returnedStepInfo && returnedStepInfo.description && secondaryDescriptionContainer) {
                appendDescription(secondaryDescriptionContainer, returnedStepInfo.description, "step-returned");
            }
        }

        // حفظ الخطوة الحالية المحددة في localStorage لضمان استمراريتها عند التحديث
        saveStepState("current_step", currentStep);

        // --- معالجة المؤشرات الخاصة (Badges/Indicators) ---

        // 1. التحقق من وجود منتجات ملغاة (في خطوة 'ملغي')
        const cancelledStep = document.getElementById("step-cancelled");

        if (cancelledStep) {
            // إذا كان هناك مفاتيح في unselectedKeys، فهذا يعني أن المشتري ألغى بعض المنتجات
            if (reviewState && reviewState.unselectedKeys && reviewState.unselectedKeys.length > 0) {
                // أضف كلاس لتفعيل تأثير بصري (مثل اهتزاز أو لون مختلف)
                cancelledStep.classList.add("has-cancelled-products");
            } else {
                cancelledStep.classList.remove("has-cancelled-products");
            }
        }

        // 2. التحقق من وجود منتجات مرفوضة من البائع (في خطوة 'مرفوض')
        const rejectedStep = document.getElementById("step-rejected");

        if (rejectedStep) {
            // إذا كان هناك مفاتيح في deselectedKeys، فهذا يعني أن البائع رفض بعض المنتجات
            if (confirmedState && confirmedState.deselectedKeys && confirmedState.deselectedKeys.length > 0) {
                rejectedStep.classList.add("has-rejected-products");
            } else {
                rejectedStep.classList.remove("has-rejected-products");
            }
        }

        // 3. التحقق من وجود منتجات مرتجعة (في خطوة 'مرتجع')
        const returnedStep = document.getElementById("step-returned");

        if (returnedStep) {
            // إذا كان هناك مفاتيح في returnedKeys، فهذا يعني أن هناك منتجات مرتجعة
            if (deliveredState && deliveredState.returnedKeys && deliveredState.returnedKeys.length > 0) {
                returnedStep.classList.add("has-returned-products");
            } else {
                returnedStep.classList.remove("has-returned-products");
            }
        }

    } catch (updateError) {
        console.error("Error in updateCurrentStepFromState:", updateError);
    }
}

/**
 * @description تنشئ كود HTML لتذييل النافذة المنبثقة (Modal Footer).
 * يحتوي التذييل عادةً على مربع اختيار (Checkbox) للسماح للمستخدم بتفعيل المرحلة والانتقال إليها.
 * @function createStepStatusFooter
 * @param {string} stepId - معرف الخطوة التي تظهر النافذة لها.
 * @param {object} currentStep - كائن يمثل الخطوة النشطة حالياً في النظام.
 * @returns {string} - كود HTML جاهز للإدراج في النافذة.
 */
export function createStepStatusFooter(stepId, currentStep) {
    try {
        // هل هذه الخطوة هي الخطوة النشطة حالياً؟
        const isActive = stepId === currentStep.stepId;

        // الحصول على رقم الخطوة الحالية (من الحالة)
        const currentStepNo = parseInt(currentStep.stepNo) || 0;

        // تحديد ترتيب الخطوات يدوياً للمقارنة
        // هذا يساعد في معرفة ما إذا كانت الخطوة قد اكتملت سابقاً
        const stepOrder = {
            "step-review": 1,
            "step-confirmed": 2,
            "step-shipped": 3,
            "step-delivered": 4,
            "step-cancelled": 5,
            "step-rejected": 6,
            "step-returned": 7
        };

        const requestedStepNo = stepOrder[stepId] || 0;

        // تحديد ما إذا كانت الخطوة مكتملة (أي أننا تجاوزناها لمرحلة لاحقة)
        // إذا كان رقم الخطوة المطلوبة أقل من رقم الخطوة الحالية، فهي مكتملة
        const isCompleted = requestedStepNo < currentStepNo;

        // تحديد حالة الـ checkbox (محدد أو معطل)
        // يكون محدداً إذا كانت الخطوة نشطة أو مكتملة
        const checked = isActive || isCompleted ? "checked" : "";
        // يكون معطلاً (لا يمكن تغييره) إذا كانت الخطوة نشطة أو مكتملة
        const disabled = isActive || isCompleted ? "disabled" : "";

        return `
              <div id="modal-step-status-container" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                  <input type="checkbox" id="modal-step-status-checkbox" ${checked} ${disabled} data-step-id="${stepId}">
                  <label for="modal-step-status-checkbox" style="font-weight: bold; cursor: pointer;">تفعيل المرحله</label>
              </div>
          `;
    } catch (footerError) {
        console.error("Error in createStepStatusFooter:", footerError);
        return "";
    }
}