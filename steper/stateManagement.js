/**
 * @file stateManagement.js
 * @description State Management Module.
 * Manages application state in memory and coordinates server synchronization.
 * LocalStorage has been removed to ensure strict consistency with the server.
 */

import { updateGlobalStepperAppData, globalStepperAppData, ordersData } from "./config.js";
import { updateServerItemStatus } from "./dataFetchers.js";

/**
 * Initializes the application state on startup.
 * Sets up the global state structure.
 */
export function initializeState() {
    console.log("🚀 [State] Initializing (In-Memory Only)...");

    // Initialize default structure if needed
    const state = {
        items: {},
        steps: {},
        dates: {}
    };

    // If global already has data, preserve it, otherwise set default
    if (globalStepperAppData && Object.keys(globalStepperAppData).length > 0) {
        // already initialized
    } else {
        updateGlobalStepperAppData(state);
    }

    // Populate items status from ordersData (Single Source of Truth)
    const currentItems = {};
    if (ordersData) {
        ordersData.forEach(order => {
            if (order.order_items) {
                order.order_items.forEach(item => {
                    if (item.item_status) {
                        currentItems[item.product_key] = {
                            status: item.item_status,
                            timestamp: new Date().toISOString() // We could parse this from order_status if needed
                        };
                    }
                });
            }
        });
    }

    // Update global state with derived items
    if (!globalStepperAppData.items) globalStepperAppData.items = {};
    Object.assign(globalStepperAppData.items, currentItems);
}

/**
 * Saves the state for a specific step.
 * In-memory only (cache for current session).
 * @param {string} stepId 
 * @param {object} stepState 
 */
export function saveStepState(stepId, stepState) {
    if (!globalStepperAppData.steps) globalStepperAppData.steps = {};
    globalStepperAppData.steps[stepId] = stepState;
}

/**
 * Loads the state for a specific step.
 * @param {string} stepId 
 * @returns {object|null}
 */
export function loadStepState(stepId) {
    return globalStepperAppData.steps?.[stepId] || null;
}

/**
 * Saves the activation date for a step.
 * In-memory only.
 * @param {string} stepId 
 * @param {string} dateStr 
 */
export function saveStepDate(stepId, dateStr) {
    if (!globalStepperAppData.dates) globalStepperAppData.dates = {};
    globalStepperAppData.dates[stepId] = dateStr;
}

/**
 * Loads the activation date for a step.
 * @param {string} stepId 
 * @returns {string|null}
 */
export function loadStepDate(stepId) {
    return globalStepperAppData.dates?.[stepId] || null;
}

/**
 * Updates the status of a specific item.
 * Blocking Operation: Waits for Server, then updates Memory.
 * @param {string} productKey
 * @param {string} status
 * @returns {Promise<void>}
 */
export async function saveItemStatus(productKey, status) {
    // 1. Identify context
    if (!ordersData) {
        throw new Error("Orders Data not loaded.");
    }
    const order = ordersData.find(o => o.order_items.some(i => i.product_key === productKey));
    if (!order) {
        throw new Error(`Order not found for product ${productKey}`);
    }

    // 2. Sync to Server (Blocking)
    try {
        await updateServerItemStatus(order.order_key, productKey, status);

        // 3. Update Local Memory (Only after success)
        if (!globalStepperAppData.items) globalStepperAppData.items = {};
        globalStepperAppData.items[productKey] = {
            status: status,
            timestamp: new Date().toISOString()
        };

        // Also update the ordersData array in memory to keep it fresh
        // (This logic was partially in updateLocalOrderStatus, we reinforce it here implicitly 
        // because updateServerItemStatus helper might calls updateLocalOrderStatus. 
        // We trust the helper to do the "local" part too, or we do it here. 
        // check dataFetchers.js: yes it calls updateLocalOrderStatus)

        console.log(`[State] ✅ Status saved and synced: ${productKey} = ${status}`);

    } catch (e) {
        console.error(`[State] ❌ Failed to save status for ${productKey}:`, e);
        throw e; // Propagate error so UI can show alert
    }
}

/**
 * Loads the status of a specific item.
 * @param {string} productKey 
 * @returns {string} Status string or 'pending'.
 */
export function loadItemStatus(productKey) {
    return globalStepperAppData.items?.[productKey]?.status || "pending";
}

/**
 * Returns the map of all item statuses.
 * @returns {object} Map of productKey -> item data.
 */
export function getAllItemsStatus() {
    return globalStepperAppData.items || {};
}
