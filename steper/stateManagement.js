/**
 * @file stateManagement.js
 * @description State Management Module using LocalStorage.
 * Updated to consolidate all data into a single key 'stepper_app_data'.
 * This file provides helper functions to save and retrieve data from browser local storage.
 */

import { updateGlobalStepperAppData, globalStepperAppData, ordersData } from "./config.js";

/**
 * @function getAppKey
 * @description Generates a unique storage key for each order based on order_key.
 * @returns {string} - The dynamic storage key.
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
 * @description Retrieves the full application state from LocalStorage.
 * @returns {object} The full state object (containing steps and dates).
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
 * @description Saves the full application state to LocalStorage and updates the global variable.
 * @param {object} state - The full state object.
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
        // Update global variable in config.js
        updateGlobalStepperAppData(state);
    } catch (e) {
        console.error("Failed to save app state:", e);
    }
}

/**
 * @function initializeState
 * @description Initializes the initial state if it doesn't exist.
 * Should be called when the application starts.
 * @returns {void}
 * @throws {Error} - If there is an error during state initialization or cleanup.
 * @see getAppState
 * @see saveAppState
 * @see cleanupLegacyKeys
 * @see updateGlobalStepperAppData
 */
export function initializeState() {
    // 1. Check global variable first
    // Note: globalStepperAppData is imported from config.js, but since we are in the same context (modules),
    // we rely on the value that might have been set before calling this function.
    // However, in ES modules structure, imported variables are read-only bindings.
    // To access the current value, we need to ensure we are using the imported variable.
    // In this file, we import updateGlobalStepperAppData only, so we would need to import globalStepperAppData too.

    console.log("🚀 [State] initializeState: Starting state initialization.");
    // Wait, globalStepperAppData is defined in config.js as var and exported.
    // We will modify the import above to include globalStepperAppData.

    let state;

    if (globalStepperAppData && Object.keys(globalStepperAppData).length > 0) {
        console.log("Found initial globalStepperAppData, using it:", globalStepperAppData);
        state = { ...globalStepperAppData }; // Use a copy to avoid mutation issues
        // Save existing state in global variable to LocalStorage to ensure synchronization
        saveAppState(state);
    } else {
        console.log("  [State] initializeState: No initial globalStepperAppData found, loading from LocalStorage.");
        state = getAppState();
        // Update global variable with current value at startup
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

    // Cleanup legacy keys
    cleanupLegacyKeys();
    console.log("✅ [State] initializeState: Initialization complete.");
}

/**
 * @function cleanupLegacyKeys
 * @description Removes legacy keys that were used before consolidation.
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

        // Remove legacy date keys
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
 * @description Saves the state of a specific step within the aggregated object.
 *
 * @param {string} stepId - The unique ID of the step.
 * @param {object} state - The data object containing the step state.
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
 * @description Retrieves the state of a specific step from the aggregated object.
 *
 * @param {string} stepId - The unique ID of the step.
 * @returns {object|null} - Returns the state object if found, or null.
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
 * @description Saves the activation date of a specific step.
 *
 * @param {string} stepId - The unique ID of the step.
 * @param {string} dateStr - The formatted date string.
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
 * @description Load the date of a specific step activation.
 *
 * @param {string} stepId - The unique ID of the step.
 * @returns {string|null} - The date string or null.
 * @throws {Error} - If there is an error loading the step date.
 * @see getAppState
 */
export function loadStepDate(stepId) {
    console.log(`🔄 [State] loadStepDate: Loading date for step '${stepId}'.`);
    const appState = getAppState();
    console.log(`  [State] loadStepDate: Found date for '${stepId}':`, (appState.dates && appState.dates[stepId]) || null);
    return (appState.dates && appState.dates[stepId]) || null;
}

// Added constants for item status to avoid magic strings
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
 * @function saveItemStatus
 * @description Save the status of a specific item (product) within the order.
 *
 * @param {string} productKey - The unique key of the product.
 * @param {string} status - The new status (e.g., 'confirmed', 'shipped').
 * @returns {void}
 */
export function saveItemStatus(productKey, status) {
    console.log(`💾 [State] saveItemStatus: Saving status for item '${productKey}': ${status}`);
    const appState = getAppState();

    if (!appState.items) appState.items = {};

    // Update status
    if (!appState.items[productKey]) {
        appState.items[productKey] = { status: status, history: [] };
    } else {
        appState.items[productKey].status = status;
    }

    saveAppState(appState);
}

/**
 * @function loadItemStatus
 * @description Load the status of a specific item.
 *
 * @param {string} productKey - The unique key of the product.
 * @returns {string|null} - The current status or 'pending' if not found (default).
 */
export function loadItemStatus(productKey) {
    const appState = getAppState();
    if (appState.items && appState.items[productKey]) {
        return appState.items[productKey].status;
    }
    return "pending"; // Default status
}

/**
 * @function getAllItemsStatus
 * @description Get all items status map.
 * @returns {object} - Map of productKey -> item data.
 */
export function getAllItemsStatus() {
    const appState = getAppState();
    return appState.items || {};
}
