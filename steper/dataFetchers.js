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
        return Promise.reject(new Error("BaseURL not found"));
    }
    const baseURL = window.globalStepperAppData.baseURL;
    try {
        const response = await fetch(`${baseURL}/api/update-item-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_key: orderKey, product_key: productKey, status: status })
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const result = await response.json();
        console.log("[DataFetchers] Server Sync Result:", result);
        return result;
    } catch (e) {
        console.error("[DataFetchers] Server Sync Failed:", e);
        throw e; // Re-throw to allow caller to handle the failure
    }
}

/**
 * Saves confirmation lock status to server using existing API.
 * Uses a special key "__confirmation_locked_{sellerId}__" in the order_status JSON.
 * @param {string} orderKey - The order key
 * @param {boolean} isLocked - Lock status (true = locked, false = unlocked)
 * @param {Array<object>} ordersData - Orders data to update locally
 * @param {string} sellerId - The ID of the seller to lock
 * @returns {Promise<void>}
 */
export async function saveConfirmationLock(orderKey, isLocked, ordersData, sellerId) {
    if (!sellerId) {
        console.error("[DataFetchers] saveConfirmationLock: sellerId is required");
        return;
    }
    // Use the special key "__confirmation_locked_{sellerId}__" as product_key
    const lockKey = `__confirmation_locked_${sellerId}__`;
    const lockValue = isLocked ? "locked" : "unlocked";

    await updateServerItemStatus(orderKey, lockKey, lockValue);

    // Update local ordersData immediately to reflect the lock
    updateLocalOrderStatus(orderKey, lockKey, lockValue, ordersData);
}

/**
 * Updates the local ordersData order_status to include a new item status.
 * This ensures the UI reflects changes immediately without server fetch.
 * @param {string} orderKey - The order key
 * @param {string} productKey - The product key (or special key like "__confirmation_locked__")
 * @param {string} status - The new status value
 * @param {Array<object>} ordersData - Orders data array to update
 */
function updateLocalOrderStatus(orderKey, productKey, status, ordersData) {
    if (!ordersData || ordersData.length === 0) return;

    const order = ordersData.find(o => o.order_key === orderKey);
    if (!order) return;

    // Parse existing order_status
    let currentStatusStr = order.order_status || "0#";
    let parts = currentStatusStr.split('#');

    if (parts.length < 2) {
        parts = [currentStatusStr, new Date().toISOString()];
    }

    let stepId = parts[0];
    let timestamp = parts[1];
    let jsonStr = parts.slice(2).join('#');

    let itemStatuses = {};
    if (jsonStr) {
        try {
            itemStatuses = JSON.parse(jsonStr);
        } catch (e) {
            console.warn("[DataFetchers] Failed to parse order_status JSON:", e);
            itemStatuses = {};
        }
    }

    // Update the item status
    itemStatuses[productKey] = status;

    // Reconstruct order_status
    const newJsonStr = JSON.stringify(itemStatuses);
    const newStatusStr = `${stepId}#${timestamp}#${newJsonStr}`;

    // Update the order object in place
    order.order_status = newStatusStr;
}

/**
 * Gets confirmation lock status from local ordersData.
 * Reads from order_status JSON without making server calls.
 * @param {Array<object>} ordersData - Orders data array
 * @param {string} orderKey - The order key
 * @param {string} sellerId - The seller ID to check lock for
 * @returns {boolean} Lock status (true = locked, false = unlocked)
 */
export function getConfirmationLockStatus(ordersData, orderKey, sellerId) {
    if (!ordersData || ordersData.length === 0) return false;
    if (!sellerId) return false;

    const order = ordersData.find(o => o.order_key === orderKey);
    if (!order || !order.order_status) return false;

    // Parse order_status: StepID#Timestamp#JSON
    const parts = order.order_status.split('#');
    if (parts.length < 3) return false;

    const jsonStr = parts.slice(2).join('#');
    try {
        const statuses = JSON.parse(jsonStr);
        // Check specific seller lock
        const lockKey = `__confirmation_locked_${sellerId}__`;
        const isLocked = statuses[lockKey] === "locked";
        return isLocked;
    } catch (e) {
        console.warn("[DataFetchers] Failed to parse order_status JSON:", e);
        return false;
    }
}

/**
 * Saves shipping lock status to server using existing API.
 * Uses a special key "__shipping_locked_{sellerId}__" in the order_status JSON.
 * @param {string} orderKey - The order key
 * @param {boolean} isLocked - Lock status (true = locked, false = unlocked)
 * @param {Array<object>} ordersData - Orders data to update locally
 * @param {string} sellerId - The ID of the seller/courier to lock
 * @returns {Promise<void>}
 */
export async function saveShippingLock(orderKey, isLocked, ordersData, sellerId) {
    if (!sellerId) {
        console.error("[DataFetchers] saveShippingLock: sellerId is required");
        return;
    }
    const lockKey = `__shipping_locked_${sellerId}__`;
    const lockValue = isLocked ? "locked" : "unlocked";

    await updateServerItemStatus(orderKey, lockKey, lockValue);
    updateLocalOrderStatus(orderKey, lockKey, lockValue, ordersData);
}

/**
 * Gets shipping lock status from local ordersData.
 * Reads from order_status JSON without making server calls.
 * @param {Array<object>} ordersData - Orders data array
 * @param {string} orderKey - The order key
 * @param {string} sellerId - The seller/courier ID to check lock for
 * @returns {boolean} Lock status (true = locked, false = unlocked)
 */
export function getShippingLockStatus(ordersData, orderKey, sellerId) {
    if (!ordersData || ordersData.length === 0) return false;
    if (!sellerId) return false;

    const order = ordersData.find(o => o.order_key === orderKey);
    if (!order || !order.order_status) return false;

    const parts = order.order_status.split('#');
    if (parts.length < 3) return false;

    const jsonStr = parts.slice(2).join('#');
    try {
        const statuses = JSON.parse(jsonStr);
        const lockKey = `__shipping_locked_${sellerId}__`;
        const isLocked = statuses[lockKey] === "locked";
        return isLocked;
    } catch (e) {
        console.warn("[DataFetchers] Failed to parse order_status JSON:", e);
        return false;
    }
}

/**
 * Saves delivery lock status to server using existing API.
 * Uses a special key "__delivery_locked_{buyerId}__" in the order_status JSON.
 * @param {string} orderKey - The order key
 * @param {boolean} isLocked - Lock status (true = locked, false = unlocked)
 * @param {Array<object>} ordersData - Orders data to update locally
 * @param {string} buyerId - The ID of the buyer/courier to lock
 * @returns {Promise<void>}
 */
export async function saveDeliveryLock(orderKey, isLocked, ordersData, buyerId) {
    if (!buyerId) {
        console.error("[DataFetchers] saveDeliveryLock: buyerId is required");
        return;
    }
    const lockKey = `__delivery_locked_${buyerId}__`;
    const lockValue = isLocked ? "locked" : "unlocked";

    await updateServerItemStatus(orderKey, lockKey, lockValue);
    updateLocalOrderStatus(orderKey, lockKey, lockValue, ordersData);
}

/**
 * Gets delivery lock status from local ordersData.
 * Reads from order_status JSON without making server calls.
 * @param {Array<object>} ordersData - Orders data array
 * @param {string} orderKey - The order key
 * @param {string} buyerId - The buyer/courier ID to check lock for
 * @returns {boolean} Lock status (true = locked, false = unlocked)
 */
export function getDeliveryLockStatus(ordersData, orderKey, buyerId) {
    if (!ordersData || ordersData.length === 0) return false;
    if (!buyerId) return false;

    const order = ordersData.find(o => o.order_key === orderKey);
    if (!order || !order.order_status) return false;

    const parts = order.order_status.split('#');
    if (parts.length < 3) return false;

    const jsonStr = parts.slice(2).join('#');
    try {
        const statuses = JSON.parse(jsonStr);
        const lockKey = `__delivery_locked_${buyerId}__`;
        const isLocked = statuses[lockKey] === "locked";
        return isLocked;
    } catch (e) {
        console.warn("[DataFetchers] Failed to parse order_status JSON:", e);
        return false;
    }
}
/**
 * Updates the total amount of an order on the server.
 * @param {string} orderKey 
 * @param {number} totalAmount 
 */
export async function updateOrderTotalAmount(orderKey, totalAmount) {
    if (!window.globalStepperAppData || !window.globalStepperAppData.baseURL) {
        console.warn("BaseURL not found, cannot sync to server.");
        return Promise.reject(new Error("BaseURL not found"));
    }
    const baseURL = window.globalStepperAppData.baseURL;
    try {
        const response = await fetch(`${baseURL}/api/update-order-amount`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_key: orderKey, total_amount: totalAmount })
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const result = await response.json();
        console.log("[DataFetchers] Order Amount Sync Result:", result);
        return result;
    } catch (e) {
        console.error("[DataFetchers] Order Amount Sync Failed:", e);
        throw e;
    }
}
