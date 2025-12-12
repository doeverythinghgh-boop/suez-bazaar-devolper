/**
 * @file stateManagement.js
 * @description وحدة إدارة الحالة (State Management) باستخدام LocalStorage.
 * تم تحديثها لتجميع جميع البيانات في مفتاح واحد 'stepper_app_data'.
 * يوفر هذا الملف دوال مساعدة لحفظ واسترجاع البيانات من تخزين المتصفح المحلي.
 */

import { updateGlobalStepperAppData, globalStepperAppData, ordersData } from "./config.js";

/**
 * @function getAppKey
 * @description إنشاء مفتاح تخزين فريد لكل طلب بناءً على order_key.
 * @returns {string} - مفتاح التخزين الديناميكي.
 * @throws {Error} - If `ordersData` is not available or empty, it returns a default key, logging a warning.
 */
function getAppKey() {
    if (ordersData && ordersData.length > 0 && ordersData[0].order_key) {
        return `stepper_app_data_${ordersData[0].order_key}`;
    }
    console.warn("[State] getAppKey: Using default key. Order data not yet available.");
    return "stepper_app_data_default";
}

/**
 * @function getAppState
 * @description استرجاع حالة التطبيق الكاملة من LocalStorage.
 * @returns {object} كائن الحالة الكامل (يحتوي على steps و dates).
 * @throws {Error} - If there is an error parsing the stored state from LocalStorage.
 * @see getAppKey
 */
function getAppState() {
    console.log("🔄 [State] getAppState: Attempting to retrieve state from LocalStorage.");
    try {
        const stateStr = localStorage.getItem(getAppKey());
        const state = stateStr ? JSON.parse(stateStr) : { steps: {}, dates: {} };
        console.log("  [State] getAppState: State retrieved successfully.", state);
        return state;
    } catch (e) {
        console.error("Failed to parse app state:", e);
        return { steps: {}, dates: {} };
    }
}

/**
 * @function saveAppState
 * @description حفظ حالة التطبيق الكاملة في LocalStorage وتحديث المتغير العام.
 * @param {object} state - كائن الحالة الكامل.
 * @returns {void}
 * @throws {Error} - If there is an error saving the state to LocalStorage.
 * @see getAppKey
 * @see updateGlobalStepperAppData
 */
function saveAppState(state) {
    console.log("💾 [State] saveAppState: Attempting to save state to LocalStorage.", state);
    try {
        localStorage.setItem(getAppKey(), JSON.stringify(state));
        console.log("  [State] saveAppState: State saved. Now updating global variable.");
        // تحديث المتغير العام في config.js
        updateGlobalStepperAppData(state);
    } catch (e) {
        console.error("Failed to save app state:", e);
    }
}

/**
 * @function initializeState
 * @description تهيئة الحالة الأولية إذا لم تكن موجودة.
 * يجب استدعاؤها عند بدء التطبيق.
 * @returns {void}
 * @throws {Error} - If there is an error during state initialization or cleanup.
 * @see getAppState
 * @see saveAppState
 * @see cleanupLegacyKeys
 * @see updateGlobalStepperAppData
 */
export function initializeState() {
    // 1. التحقق من المتغير العام أولاً
    // ملاحظة: globalStepperAppData يتم استيراده من config.js، ولكن بما أننا في نفس السياق (modules)،
    // فإننا نعتمد على القيمة التي قد تكون عُينت قبل استدعاء هذه الدالة.
    // ومع ذلك، في هيكلية ES modules، المتغيرات المستوردة تكون read-only bindings.
    // للوصول إلى القيمة الحالية، نحتاج للتأكد من أننا نستخدم المتغير المستورد.
    // في هذا الملف، نحن نستورد updateGlobalStepperAppData فقط، لذا سنحتاج لاستيراد globalStepperAppData أيضًا.

    console.log("🚀 [State] initializeState: Starting state initialization.");
    // لكن انتظر، globalStepperAppData معرف في config.js كـ var ويتم تصديره.
    // سنقوم بتعديل الاستيراد في الأعلى ليشمل globalStepperAppData.

    let state;

    if (globalStepperAppData && Object.keys(globalStepperAppData).length > 0) {
        console.log("Found initial globalStepperAppData, using it:", globalStepperAppData);
        state = { ...globalStepperAppData }; // Use a copy to avoid mutation issues
        // حفظ الحالة الموجودة في المتغير العام إلى LocalStorage لضمان التزامن
        saveAppState(state);
    } else {
        console.log("  [State] initializeState: No initial globalStepperAppData found, loading from LocalStorage.");
        state = getAppState();
        // تحديث المتغير العام بالقيمة الحالية عند البدء
        updateGlobalStepperAppData(state);
    }

    let updated = false;
    if (!state.steps) {
        state.steps = {};
        console.log("  [State] initializeState: 'steps' property missing, initializing.");
        updated = true;
    }
    if (!state.dates) {
        state.dates = {};
        console.log("  [State] initializeState: 'dates' property missing, initializing.");
        updated = true;
    }
    if (updated) {
        saveAppState(state);
    }

    // تنظيف المفاتيح القديمة
    cleanupLegacyKeys();
    console.log("✅ [State] initializeState: Initialization complete.");
}

/**
 * @function cleanupLegacyKeys
 * @description إزالة المفاتيح القديمة التي كانت تستخدم قبل التجميع.
 * @returns {void}
 * @throws {Error} - If there is an error accessing LocalStorage during cleanup.
 */
function cleanupLegacyKeys() {
    console.log("🧹 [State] cleanupLegacyKeys: Checking for and removing legacy keys...");
    try {
        const keysToRemove = [
            "current_step_state",
            "step-review_state",
            "step-confirmed_state",
            "step-shipped_state",
            "step-delivered_state",
            "step-cancelled_state",
            "step-rejected_state",
            "step-returned_state"
        ];

        // إزالة مفاتيح التواريخ القديمة
        const stepIds = [
            "step-review", "step-confirmed", "step-shipped", "step-delivered",
            "step-cancelled", "step-rejected", "step-returned"
        ];
        stepIds.forEach(id => keysToRemove.push(`date_${id}`));

        keysToRemove.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                console.log(`  [State] cleanupLegacyKeys: Removed legacy key '${key}'.`);
            }
        });
    } catch (e) {
        // This error is not critical, so we just log it.
        console.error("Failed to cleanup legacy keys:", e);
    }
}

/**
 * @function saveStepState
 * @description حفظ حالة خطوة معينة داخل الكائن المجمع.
 *
 * @param {string} stepId - المعرف الفريد للخطوة.
 * @param {object} state - كائن البيانات الذي يحتوي على حالة الخطوة.
 * @returns {void}
 * @throws {Error} - If there is an error saving the step state.
 * @see getAppState
 * @see saveAppState
 */
export function saveStepState(stepId, state) {
    console.log(`💾 [State] saveStepState: Saving state for step '${stepId}'.`, state);
    const appState = getAppState();
    if (!appState.steps) appState.steps = {};
    appState.steps[stepId] = state;
    saveAppState(appState);
    console.log(`  [State] saveStepState: State for '${stepId}' saved successfully.`);
}

/**
 * @function loadStepState
 * @description استرجاع حالة خطوة معينة من الكائن المجمع.
 *
 * @param {string} stepId - المعرف الفريد للخطوة.
 * @returns {object|null} - تعيد كائن الحالة إذا وجد، أو null.
 * @throws {Error} - If there is an error loading the step state.
 * @see getAppState
 */
export function loadStepState(stepId) {
    console.log(`🔄 [State] loadStepState: Loading state for step '${stepId}'.`);
    const appState = getAppState();
    console.log(`  [State] loadStepState: Found state for '${stepId}':`, (appState.steps && appState.steps[stepId]) || null);
    return (appState.steps && appState.steps[stepId]) || null;
}

/**
 * @function saveStepDate
 * @description حفظ تاريخ تفعيل خطوة معينة.
 *
 * @param {string} stepId - المعرف الفريد للخطوة.
 * @param {string} dateStr - نص التاريخ المنسق.
 * @returns {void}
 * @throws {Error} - If there is an error saving the step date.
 * @see getAppState
 * @see saveAppState
 */
export function saveStepDate(stepId, dateStr) {
    console.log(`💾 [State] saveStepDate: Saving date for step '${stepId}': ${dateStr}`);
    const appState = getAppState();
    if (!appState.dates) appState.dates = {};
    appState.dates[stepId] = dateStr;
    saveAppState(appState);
    console.log(`  [State] saveStepDate: Date for '${stepId}' saved successfully.`);
}

/**
 * @function loadStepDate
 * @description استرجاع تاريخ تفعيل خطوة معينة.
 *
 * @param {string} stepId - المعرف الفريد للخطوة.
 * @returns {string|null} - نص التاريخ أو null.
 * @throws {Error} - If there is an error loading the step date.
 * @see getAppState
 */
export function loadStepDate(stepId) {
    console.log(`🔄 [State] loadStepDate: Loading date for step '${stepId}'.`);
    const appState = getAppState();
    console.log(`  [State] loadStepDate: Found date for '${stepId}':`, (appState.dates && appState.dates[stepId]) || null);
    return (appState.dates && appState.dates[stepId]) || null;
}
