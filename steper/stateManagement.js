/**
 * @file stateManagement.js
 * @description State Management Module.
 * synchronization of application state with LocalStorage.
 */

import { updateGlobalStepperAppData, globalStepperAppData, ordersData } from "./config.js";
import { updateServerItemStatus } from "./dataFetchers.js";

// Keys for LocalStorage
const STORAGE_KEYS = {
    ITEMS: "stepper_items",
    STEPS: "stepper_steps",
    DATES: "stepper_dates"
};

/**
 * Generates a unique storage key based on the current order context.
 * @returns {string} The storage key.
 */
function getAppKey() {
    if (ordersData && ordersData.length > 0 && ordersData[0].order_key) {
        return `stepper_app_data_${ordersData[0].order_key}`;
    }
    console.warn("[State] Using default storage key.");
    return "stepper_app_data_default";
}

/**
 * Retrieves the state from LocalStorage.
 * @returns {object} The parsed state object or default empty structure.
 */
function getAppState() {
    try {
        const stateStr = localStorage.getItem(getAppKey());
        return stateStr ? JSON.parse(stateStr) : { steps: {}, dates: {}, items: {} };
    } catch (e) {
        console.error("Failed to parse app state:", e);
        return { steps: {}, dates: {}, items: {} };
    }
}

/**
 * Saves the state to LocalStorage and updates global memory.
 * @param {object} state - The full state object.
 */
function saveAppState(state) {
    try {
        localStorage.setItem(getAppKey(), JSON.stringify(state));
        updateGlobalStepperAppData(state);
    } catch (e) {
        console.error("Failed to save app state:", e);
    }
}

/**
 * Initializes the application state on startup.
 * Synchronizes between global variable and LocalStorage.
 */
export function initializeState() {
    console.log("🚀 [State] Initializing...");
    let state;
    const storedState = getAppState();

    if (globalStepperAppData && Object.keys(globalStepperAppData).length > 0) {
        // MERGE: Keep stored items/steps/dates, update control/orders from global
        state = {
            ...storedState,
            ...globalStepperAppData,
            // Explicitly preserve state objects if they exist in storage, otherwise init
            items: storedState.items || {},
            steps: storedState.steps || {},
            dates: storedState.dates || {}
        };
        console.log("🔄 [State] Merged Global Data causing sync update.");
        saveAppState(state); // Sync valid global state to storage
    } else {
        state = storedState;
        updateGlobalStepperAppData(state); // Sync storage to global variable
    }

    // Ensure structure integirty
    if (!state.steps) state.steps = {};
    if (!state.dates) state.dates = {};
    if (!state.items) state.items = {};

    saveAppState(state);
    cleanupLegacyKeys();
}

/**
 * Removes legacy storage keys to keep the browser clean.
 */
function cleanupLegacyKeys() {
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
        // Add legacy dates
        const stepIds = ["step-review", "step-confirmed", "step-shipped", "step-delivered",
            "step-cancelled", "step-rejected", "step-returned"];
        stepIds.forEach(id => keysToRemove.push(`date_${id}`));

        keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
        console.warn("Legacy cleanup failed:", e);
    }
}

/**
 * Saves the state for a specific step.
 * @param {string} stepId 
 * @param {object} stepState 
 */
export function saveStepState(stepId, stepState) {
    const appState = getAppState();
    appState.steps[stepId] = stepState;
    saveAppState(appState);
}

/**
 * Loads the state for a specific step.
 * @param {string} stepId 
 * @returns {object|null}
 */
export function loadStepState(stepId) {
    const appState = getAppState();
    return appState.steps?.[stepId] || null;
}

/**
 * Saves the activation date for a step.
 * @param {string} stepId 
 * @param {string} dateStr 
 */
export function saveStepDate(stepId, dateStr) {
    const appState = getAppState();
    appState.dates[stepId] = dateStr;
    saveAppState(appState);
}

/**
 * Loads the activation date for a step.
 * @param {string} stepId 
 * @returns {string|null}
 */
export function loadStepDate(stepId) {
    const appState = getAppState();
    return appState.dates?.[stepId] || null;
}

/**
 * Updates the status of a specific item.
 * @param {string} productKey
 * @param {string} status
 */
export function saveItemStatus(productKey, status) {
    const currentState = globalStepperAppData;

    // Update Local State
    if (!currentState.items) currentState.items = {};
    currentState.items[productKey] = {
        status: status,
        timestamp: new Date().toISOString()
    };
    updateGlobalStepperAppData(currentState);

    // Persist to LocalStorage
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(currentState.items));

    // Sync to Server
    // Find order key for this product
    if (ordersData) {
        const order = ordersData.find(o => o.order_items.some(i => i.product_key === productKey));
        if (order) {
            updateServerItemStatus(order.order_key, productKey, status);
        } else {
            console.warn(`[State] Could not find order for product ${productKey} to sync server.`);
        }
    }
}

/**
 * Loads the status of a specific item.
 * @param {string} productKey 
 * @returns {string} Status string or 'pending'.
 */
export function loadItemStatus(productKey) {
    const appState = getAppState();
    return appState.items?.[productKey]?.status || "pending";
}

/**
 * Returns the map of all item statuses.
 * @returns {object} Map of productKey -> item data.
 */
export function getAllItemsStatus() {
    const appState = getAppState();
    return appState.items || {};
}
