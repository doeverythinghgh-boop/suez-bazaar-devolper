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
    console.log("🚀 [State] Initializing (In-Memory Only - Server Synced)...");

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

    // Populate items and dates from ordersData (Single Source of Truth)
    const currentItems = {};
    const currentDates = {};

    if (ordersData) {
        ordersData.forEach(order => {
            // 1. Extract Dates from order_status JSON
            if (order.order_status) {
                const parts = order.order_status.split('#');
                if (parts.length >= 3) {
                    try {
                        const jsonStr = parts.slice(2).join('#');
                        if (jsonStr) {
                            const parsed = JSON.parse(jsonStr);
                            Object.keys(parsed).forEach(key => {
                                if (key.startsWith("__date_")) {
                                    // It's a date!
                                    const stepId = key.replace(/__date_|__/g, '');
                                    if (stepId) currentDates[stepId] = parsed[key];
                                }
                            });
                        }
                    } catch (e) {
                        console.warn("[State] Failed to parse JSON for dates in initializeState", e);
                    }
                }
            }

            // 2. Extract Items
            if (order.order_items) {
                order.order_items.forEach(item => {
                    if (item.item_status) {
                        currentItems[item.product_key] = {
                            status: item.item_status,
                            seller_key: item.seller_key,
                            timestamp: new Date().toISOString()
                        };
                    }
                });
            }
        });
    }

    // Update global state with derived items
    if (!globalStepperAppData.items) globalStepperAppData.items = {};
    Object.assign(globalStepperAppData.items, currentItems);

    if (!globalStepperAppData.dates) globalStepperAppData.dates = {};
    Object.assign(globalStepperAppData.dates, currentDates);
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
 * Syncs to Server via order_status JSON.
 * @param {string} stepId 
 * @param {string} dateStr 
 */
export async function saveStepDate(stepId, dateStr) {
    // 1. Update Memory
    if (!globalStepperAppData.dates) globalStepperAppData.dates = {};
    globalStepperAppData.dates[stepId] = dateStr;

    // 2. Sync to Server
    if (ordersData && ordersData.length > 0) {
        const orderKey = ordersData[0].order_key;
        // Construct special key: __date_step-review__
        const specialKey = `__date_${stepId}__`;

        try {
            console.log(`[State] Syncing Date: ${specialKey} = ${dateStr}`);
            await updateServerItemStatus(orderKey, specialKey, dateStr);
        } catch (e) {
            console.error(`[State] Failed to sync date for ${stepId}`, e);
        }
    }
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

        // Find the item in ordersData to get the seller_key
        const itemInfo = order.order_items.find(i => i.product_key === productKey);

        globalStepperAppData.items[productKey] = {
            status: status,
            seller_key: itemInfo ? itemInfo.seller_key : null,
            timestamp: new Date().toISOString()
        };

        // Also update the ordersData array in memory to keep it fresh
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
