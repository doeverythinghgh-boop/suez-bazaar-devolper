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
 * Updates the seller confirmation lock status on the server.
 * @param {string} orderKey - The order key
 * @param {boolean} isLocked - Lock status (true = locked, false = unlocked)
 * @returns {Promise<object>} Response from server
 */
export async function updateServerConfirmationLock(orderKey, isLocked) {
    if (!window.globalStepperAppData || !window.globalStepperAppData.baseURL) {
        console.warn("[DataFetchers] BaseURL not found, cannot update confirmation lock.");
        return { success: false, error: "No baseURL" };
    }
    const baseURL = window.globalStepperAppData.baseURL;
    try {
        const response = await fetch(`${baseURL}/api/update-confirmation-lock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_key: orderKey, is_locked: isLocked })
        });
        const result = await response.json();
        console.log("[DataFetchers] Confirmation Lock Update Result:", result);
        return result;
    } catch (e) {
        console.error("[DataFetchers] Confirmation Lock Update Failed:", e);
        return { success: false, error: e.message };
    }
}

/**
 * Gets the seller confirmation lock status from the server.
 * @param {string} orderKey - The order key
 * @returns {Promise<boolean>} Lock status (true = locked, false = unlocked)
 */
export async function getServerConfirmationLockStatus(orderKey) {
    if (!window.globalStepperAppData || !window.globalStepperAppData.baseURL) {
        console.warn("[DataFetchers] BaseURL not found, cannot get confirmation lock status.");
        return false;
    }
    const baseURL = window.globalStepperAppData.baseURL;
    try {
        const response = await fetch(`${baseURL}/api/get-confirmation-lock?order_key=${orderKey}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        console.log("[DataFetchers] Confirmation Lock Status:", result);
        return result.is_locked || false;
    } catch (e) {
        console.error("[DataFetchers] Get Confirmation Lock Status Failed:", e);
        return false;
    }
}

