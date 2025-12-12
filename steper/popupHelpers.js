/**
 * @file popupHelpers.js
 * @description دوال مساعدة للنوافذ المنبثقة (Popup Helpers).
 * يحتوي هذا الملف على منطق مشترك يستخدم في النوافذ المنبثقة المختلفة،
 * وأهمها منطق تفعيل المراحل والتحقق من التسلسل الصحيح للخطوات.
 */

import {
    saveStepState,
    loadStepState,
} from "./stateManagement.js";
import {
    updateCurrentStepFromState,
} from "./uiUpdates.js";

/**
 * @function addStatusToggleListener
 * @description تضيف مستمع حدث (Event Listener) لمربع اختيار "تفعيل المرحلة" في النوافذ المنبثقة.
 * هذه الدالة تحتوي على المنطق الجوهري للتحكم في تدفق المراحل (Workflow Control).
 * 
 * تقوم بما يلي:
 * 1. الاستماع لتغيير حالة الـ checkbox.
 * 2. التحقق من أن الانتقال للمرحلة الجديدة مسموح به (يجب أن يكون بالتسلسل).
 * 3. عرض رسائل تحذير إذا حاول المستخدم تخطي مراحل.
 * 4. طلب تأكيد نهائي من المستخدم قبل التفعيل.
 * 5. حفظ الحالة الجديدة وتحديث الواجهة عند التأكيد.
 * 
 * @param {object} controlData - بيانات التحكم التي تحتوي على تعريف الخطوات.
 * @param {Array<object>} ordersData - بيانات الطلبات.
 * @returns {void}
 * @throws {Error} - If there is an error adding the event listener or processing the step activation logic.
 * @see saveStepState
 * @see loadStepState
 * @see updateCurrentStepFromState
 * @see sendStepActivationNotifications
 */
export function addStatusToggleListener(controlData, ordersData) {
    try {
        const checkbox = document.getElementById("modal-step-status-checkbox");
        if (!checkbox) return;

        checkbox.addEventListener("change", (e) => {
            if (e.target.checked) {
                const checkboxElement = e.target;
                const stepIdToActivate = checkboxElement.dataset.stepId;

                // الحصول على كائن المرحلة الحالية من البيانات
                const currentStep = controlData.steps.find(
                    (s) => s.id === stepIdToActivate
                );

                if (!currentStep) {
                    checkboxElement.checked = false;
                    return;
                }

                // تعريف المراحل الأساسية التي يجب أن تسير بترتيب صارم
                const basicSteps = ["step-review", "step-confirmed", "step-shipped", "step-delivered"];
                // المراحل النهائية/الفرعية (لا تخضع لنفس قواعد الترتيب الصارم بالضرورة، لكن هنا للذكر)
                const finalSteps = ["step-cancelled", "step-rejected", "step-returned"];

                // التحقق من منطق التسلسل للمراحل الأساسية
                if (basicSteps.includes(stepIdToActivate)) {
                    // الحصول على رقم المرحلة النشطة حالياً من التخزين
                    const savedCurrentStep = loadStepState("current_step");
                    let currentActiveStepNo = 0;

                    if (savedCurrentStep) {
                        currentActiveStepNo = parseInt(savedCurrentStep.stepNo) || 0;
                    }

                    const requestedStepNo = parseInt(currentStep.no);

                    // القاعدة: يجب أن تكون المرحلة المطلوبة هي (المرحلة الحالية + 1)
                    if (requestedStepNo !== currentActiveStepNo + 1) {
                        let errorMessage = "";

                        if (requestedStepNo <= currentActiveStepNo) {
                            errorMessage = "لا يمكن الرجوع إلى مرحلة سابقة. يجب التقدم بالترتيب فقط.";
                        } else {
                            errorMessage = `يجب تفعيل المراحل بالترتيب. المرحلة التالية المتاحة هي رقم ${currentActiveStepNo + 1}.`;
                        }

                        // عرض رسالة خطأ ومنع التفعيل
                        Swal.fire({
                            title: "تنبيه",
                            text: errorMessage,
                            icon: "warning",
                            confirmButtonText: "حسنًا",
                            customClass: { popup: "fullscreen-swal" },
                        });

                        checkboxElement.checked = false; // إلغاء التحديد
                        return;
                    }
                }

                // إذا اجتاز التحقق، اطلب تأكيد المستخدم النهائي
                Swal.fire({
                    title: "تأكيد تفعيل المرحلة",
                    text: "بمجرد تفعيل هذه المرحلة، لا يمكنك التراجع. هل أنت متأكد؟",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#3085d6",
                    cancelButtonColor: "#d33",
                    confirmButtonText: "نعم، قم بالتفعيل",
                    cancelButtonText: "إلغاء",
                    customClass: { popup: "fullscreen-swal" },
                }).then((result) => {
                    if (result.isConfirmed) {
                        // تنفيذ التفعيل
                        const stepToActivate = controlData.steps.find(
                            (s) => s.id === stepIdToActivate
                        );
                        if (stepToActivate) {
                            // حفظ الحالة الجديدة
                            saveStepState("current_step", {
                                stepId: stepToActivate.id,
                                stepNo: stepToActivate.no,
                                status: "active",
                            });

                            // إرسال الإشعارات للأطراف المعنية
                            sendStepActivationNotifications(stepToActivate, controlData, ordersData);

                            // تحديث الواجهة فوراً
                            updateCurrentStepFromState(controlData, ordersData);
                            Swal.close(); // إغلاق النافذة المنبثقة
                        }
                    } else {
                        // إذا ألغى المستخدم، تراجع عن تحديد الـ checkbox
                        checkboxElement.checked = false;
                    }
                });
            }
        });
    } catch (listenerError) {
        console.error("Error in addStatusToggleListener:", listenerError);
    }
}

/**
 * @function sendStepActivationNotifications
 * @description دالة مساعدة لإرسال الإشعارات عند تفعيل مرحلة جديدة.
 * تقوم باستخراج البيانات اللازمة من ordersData واستدعاء دالة الإشعارات الرئيسية.
 * 
 * @param {object} stepToActivate - كائن المرحلة المفعلة.
 * @param {object} controlData - بيانات التحكم.
 * @param {Array<object>} ordersData - بيانات الطلبات.
 */
function sendStepActivationNotifications(stepToActivate, controlData, ordersData) {
    try {
        // التحقق من توفر الدالة (قد لا تكون محملة في بعض الحالات)
        if (typeof notifyOnStepActivation !== 'function') {
            console.warn('[Notifications] دالة notifyOnStepActivation غير متاحة. تأكد من تحميل notificationTools.js');
            return;
        }

        // استخراج البيانات من ordersData
        let buyerKey = '';
        let deliveryKeys = [];
        let sellerKeys = []; // تعريف مصفوفة مفاتيح البائعين
        let orderId = '';
        let userName = '';

        if (ordersData && ordersData.length > 0) {
            // استخراج مفتاح المشتري من أول طلب
            const firstOrder = ordersData[0];
            buyerKey = firstOrder.user_key || '';
            orderId = firstOrder.id || firstOrder.order_id || '';

            // استخراج اسم المستخدم الحالي
            if (controlData.currentUser) {
                userName = controlData.currentUser.name || controlData.currentUser.idUser || '';
            }

            // استخراج مفاتيح خدمات التوصيل ومفاتيح البائعين
            const deliveryKeysSet = new Set();
            const sellerKeysSet = new Set(); // مجموعة لتخزين مفاتيح البائعين الفريدة

            ordersData.forEach(order => {
                if (order.order_items && Array.isArray(order.order_items)) {
                    order.order_items.forEach(item => {
                        // استخراج مفتاح خدمة التوصيل
                        if (item.supplier_delivery && item.supplier_delivery.delivery_key) {
                            const deliveryKey = item.supplier_delivery.delivery_key;
                            if (Array.isArray(deliveryKey)) {
                                deliveryKey.forEach(key => { if (key) deliveryKeysSet.add(key); });
                            } else if (deliveryKey) {
                                deliveryKeysSet.add(deliveryKey);
                            }
                        }

                        // استخراج مفتاح البائع
                        if (item.seller_key) {
                            sellerKeysSet.add(item.seller_key);
                        }
                    });
                }
            });

            deliveryKeys = Array.from(deliveryKeysSet);
            sellerKeys = Array.from(sellerKeysSet); // تحويل المجموعة إلى مصفوفة
        }

        // استدعاء دالة الإشعارات الرئيسية
        notifyOnStepActivation({
            stepId: stepToActivate.id,
            stepName: stepToActivate.name || stepToActivate.id,
            buyerKey: buyerKey,
            deliveryKeys: deliveryKeys,
            sellerKeys: sellerKeys, // تمرير مفاتيح البائعين
            orderId: orderId,
            userName: userName
        });

        console.log(`[Notifications] تم استدعاء دالة الإشعارات للمرحلة: ${stepToActivate.name || stepToActivate.id}`);

        // إرسال إشعارات المراحل الفرعية إذا وجدت
        sendSubStepNotifications(stepToActivate, controlData, ordersData);

    } catch (error) {
        console.error('[Notifications] خطأ في sendStepActivationNotifications:', error);
    }
}

/**
 * @function sendSubStepNotifications
 * @description إرسال إشعارات للمراحل الفرعية (ملغي، مرفوض، مرتجع) بعد تأكيد المرحلة الرئيسية.
 * 
 * @param {object} stepToActivate - كائن المرحلة المفعلة.
 * @param {object} controlData - بيانات التحكم.
 * @param {Array<object>} ordersData - بيانات الطلبات.
 */
function sendSubStepNotifications(stepToActivate, controlData, ordersData) {
    try {
        // التحقق من توفر الدالة
        if (typeof notifyOnSubStepActivation !== 'function') {
            return; // الدالة غير متوفرة، تجاهل
        }

        const stepId = stepToActivate.id;
        let buyerKey = '';
        let sellerKeys = [];
        let orderId = '';
        let userName = '';

        // استخراج البيانات الأساسية
        if (ordersData && ordersData.length > 0) {
            const firstOrder = ordersData[0];
            buyerKey = firstOrder.user_key || '';
            orderId = firstOrder.id || firstOrder.order_id || '';

            if (controlData.currentUser) {
                userName = controlData.currentUser.name || controlData.currentUser.idUser || '';
            }

            // استخراج مفاتيح البائعين من جميع المنتجات
            const sellerKeysSet = new Set();
            ordersData.forEach(order => {
                if (order.order_items && Array.isArray(order.order_items)) {
                    order.order_items.forEach(item => {
                        if (item.seller_key) {
                            sellerKeysSet.add(item.seller_key);
                        }
                    });
                }
            });
            sellerKeys = Array.from(sellerKeysSet);
        }

        // حسب المرحلة الرئيسية المفعلة، تحقق من وجود مراحل فرعية
        if (stepId === 'step-review') {
            // بعد تفعيل "مراجعة"، تحقق من وجود منتجات ملغاة
            const reviewState = loadStepState('step-review');
            if (reviewState && reviewState.unselectedKeys && reviewState.unselectedKeys.length > 0) {
                console.log('[Notifications] تم اكتشاف منتجات ملغاة، إرسال إشعارات...');
                notifyOnSubStepActivation({
                    stepId: 'step-cancelled',
                    stepName: 'ملغي',
                    sellerKeys: sellerKeys,
                    orderId: orderId,
                    userName: userName
                });
            }
        } else if (stepId === 'step-confirmed') {
            // بعد تفعيل "تأكيد"، تحقق من وجود منتجات مرفوضة
            const confirmedState = loadStepState('step-confirmed');
            if (confirmedState && confirmedState.deselectedKeys && confirmedState.deselectedKeys.length > 0) {
                console.log('[Notifications] تم اكتشاف منتجات مرفوضة، إرسال إشعارات...');
                notifyOnSubStepActivation({
                    stepId: 'step-rejected',
                    stepName: 'مرفوض',
                    buyerKey: buyerKey,
                    orderId: orderId,
                    userName: userName
                });
            }
        } else if (stepId === 'step-delivered') {
            // بعد تفعيل "تسليم"، تحقق من وجود منتجات مرتجعة
            const deliveredState = loadStepState('step-delivered');
            if (deliveredState && deliveredState.returnedKeys && deliveredState.returnedKeys.length > 0) {
                console.log('[Notifications] تم اكتشاف منتجات مرتجعة، إرسال إشعارات...');
                notifyOnSubStepActivation({
                    stepId: 'step-returned',
                    stepName: 'مرتجع',
                    sellerKeys: sellerKeys,
                    orderId: orderId,
                    userName: userName
                });
            }
        }

    } catch (error) {
        console.error('[Notifications] خطأ في sendSubStepNotifications:', error);
    }
}

