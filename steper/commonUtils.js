/**
 * @file commonUtils.js
 * @description Common Utility Functions.
 * This file contains helper functions used across multiple files in the steper module.
 * Adheres to DRY (Don't Repeat Yourself) principle.
 */
import { ITEM_STATUS_ARABIC } from "./config.js";

/**
 * Translates a status key to its Arabic equivalent.
 * @function translateStatus
 * @param {string} status - The status key (e.g., "pending").
 * @returns {string} The Arabic translation or the original string if not found.
 */
export function translateStatus(status) {
    if (typeof window.langu === 'function') {
        return window.langu(`status_${status}`) || status;
    }
    return ITEM_STATUS_ARABIC[status] || status;
}

/**
 * Helper to get product name from orders data.
 * @function getProductName
 * @param {string} productKey - The unique key of the product.
 * @param {Array<object>} ordersData - The array of orders.
 * @returns {string} - The name of the product or the key if not found.
 */
export function getProductName(productKey, ordersData) {
    if (!ordersData || !Array.isArray(ordersData)) return productKey;

    for (const order of ordersData) {
        if (order.order_items && Array.isArray(order.order_items)) {
            const item = order.order_items.find(i => i.product_key === productKey);
            if (item) return item.product_name;
        }
    }
    return productKey;
}
