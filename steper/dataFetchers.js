/**
 * @file dataFetchers.js
 * @description Data Fetching Module.
 * Wraps synchronous configuration data in Promises to maintain
 * asynchronous interface compatibility with the rest of the application.
 */

import { appDataControl, ordersData } from "./config.js";

/**
 * Retrieves the application control data.
 * @returns {Promise<Object>} Resolves with the control data object.
 */
export function fetchControlData() {
    return Promise.resolve(appDataControl);
}

/**
 * Retrieves the orders data.
 * @returns {Promise<Array<Object>>} Resolves with the orders data array.
 */
export async function fetchOrdersData() {
    return Promise.resolve(ordersData);
}

/**
 * Updates the item status on the server.
 * @param {string} orderKey 
 * @param {string} productKey 
 * @param {string} status 
 */
export async function updateServerItemStatus(orderKey, productKey, status) {
    if (!window.globalStepperAppData || !window.globalStepperAppData.baseURL) {
        console.warn("BaseURL not found, cannot sync to server.");
        return;
    }
    const baseURL = window.globalStepperAppData.baseURL;
    try {
        const response = await fetch(`${baseURL}/api/update-item-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_key: orderKey, product_key: productKey, status: status })
        });
        const result = await response.json();
        console.log("[DataFetchers] Server Sync Result:", result);
    } catch (e) {
        console.error("[DataFetchers] Server Sync Failed:", e);
    }
}

/**
 * Saves confirmation lock status to server using existing API.
 * Uses a special key "__confirmation_locked__" in the order_status JSON.
 * @param {string} orderKey - The order key
 * @param {boolean} isLocked - Lock status (true = locked, false = unlocked)
 * @returns {Promise<void>}
 */
export async function saveConfirmationLock(orderKey, isLocked) {
    // Use the special key "__confirmation_locked__" as product_key
    const lockValue = isLocked ? "locked" : "unlocked";
    await updateServerItemStatus(orderKey, "__confirmation_locked__", lockValue);
    console.log(`[DataFetchers] Confirmation lock ${lockValue} for order: ${orderKey}`);
}

/**
 * Gets confirmation lock status from local ordersData.
 * Reads from order_status JSON without making server calls.
 * @param {Array<object>} ordersData - Orders data array
 * @param {string} orderKey - The order key
 * @returns {boolean} Lock status (true = locked, false = unlocked)
 */
export function getConfirmationLockStatus(ordersData, orderKey) {
    if (!ordersData || ordersData.length === 0) return false;

    const order = ordersData.find(o => o.order_key === orderKey);
    if (!order || !order.order_status) return false;

    // Parse order_status: StepID#Timestamp#JSON
    const parts = order.order_status.split('#');
    if (parts.length < 3) return false;

    const jsonStr = parts.slice(2).join('#');
    try {
        const statuses = JSON.parse(jsonStr);
        const isLocked = statuses["__confirmation_locked__"] === "locked";
        console.log(`[DataFetchers] Lock status for order ${orderKey}: ${isLocked}`);
        return isLocked;
    } catch (e) {
        console.warn("[DataFetchers] Failed to parse order_status JSON:", e);
        return false;
    }
}

