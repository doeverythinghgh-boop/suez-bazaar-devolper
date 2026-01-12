/**
 * @file config.js
 * @description Central configuration and state management for the Stepper application.
 */

/**
 * @constant {string[]} ADMIN_IDS
 * @description List of user IDs with administrative privileges.
 */
export const ADMIN_IDS = ["dl14v1k7", "682dri6b", "pngukw"];

/**
 * @constant {Object<string, string>} ITEM_STATUS
 * @description Enumeration of possible order item statuses.
 */
export const ITEM_STATUS = {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    SHIPPED: "shipped",
    DELIVERED: "delivered",
    RETURNED: "returned",
    CANCELLED: "cancelled",
    REJECTED: "rejected"
};

/**
 * @constant {Object<string, string>} ITEM_STATUS_ARABIC
 * @description Mapping of status keys to their Arabic display names.
 */
export const ITEM_STATUS_ARABIC = {
    [ITEM_STATUS.PENDING]: "معلق",
    [ITEM_STATUS.CONFIRMED]: "مؤكد",
    [ITEM_STATUS.SHIPPED]: "مشحون",
    [ITEM_STATUS.DELIVERED]: "تم التسليم",
    [ITEM_STATUS.RETURNED]: "مرتجع",
    [ITEM_STATUS.CANCELLED]: "ملغي",
    [ITEM_STATUS.REJECTED]: "مرفوض"
};

/**
 * @type {object}
 * @description Runtime application control configuration.
 */
export let appDataControl = {};

/**
 * @type {Array<object>}
 * @description Array of orders currently loaded in the application.
 */
export let ordersData = [];

/**
 * @type {object}
 * @description Persistent application state synchronized with local storage.
 */
export let globalStepperAppData = {};

/**
 * Updates the global application state.
 * @param {object} newState - The new state object.
 */
export function updateGlobalStepperAppData(newState) {
    globalStepperAppData = newState;
}

/**
 * Updates the application control data.
 * @param {object} data - The control data object.
 */
export function setAppDataControl(data) {
    appDataControl = data;
}

/**
 * Updates the orders data.
 * @param {Array<object>} data - The orders data array.
 */
export function setOrdersData(data) {
    ordersData = data;
}

/**
 * @constant {Promise<void>} initializationPromise
 * @description Resolves when initial data is available, either from global injection or external assignment.
 */
export const initializationPromise = new Promise((resolve) => {
    if (window.stepperData) {
        setAppDataControl(window.stepperData.control);
        setOrdersData(window.stepperData.orders);
        resolve();
    } else {
        window.initializeStepperData = (control, orders) => {
            setAppDataControl(control);
            setOrdersData(orders);
            resolve();
        };
        // Removed premature resolve() to force waiting for data injection.
    }
});
