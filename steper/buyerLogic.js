/**
 * @file buyerLogic.js
 * @description Buyer Business Logic Module.
 * Contains pure functions for data processing related to buyer interactions.
 * Separated from UI generation and Event handling.
 */

import { loadItemStatus } from "./stateManagement.js";
import { ITEM_STATUS } from "./config.js";

/**
 * Extracts product keys relative to the user type for review.
 * @function getProductsForReview
 * @param {Array<object>} ordersData
 * @param {string} userId
 * @param {string} userType
 * @returns {Array<string>} List of product keys.
 */
export function getProductsForReview(ordersData, userId, userType) {
    if (!ordersData) return [];

    if (userType === "buyer") {
        const currentUserOrders = ordersData.filter((order) => order.user_key == userId); // Loose comparison for safety
        console.log(`[BuyerLogic] getProductsForReview | Total Orders: ${ordersData.length} | User Orders: ${currentUserOrders.length} | ID: ${userId}`);
        return currentUserOrders.flatMap((order) => order.order_items.map((item) => item.product_key));
    } else if (userType === "seller") {
        return ordersData.flatMap((order) =>
            order.order_items.filter((item) => item.seller_key == userId).map((item) => item.product_key)
        );
    } else if (userType === "admin") {
        return ordersData.flatMap((order) => order.order_items.map((item) => item.product_key));
    }
    return [];
}

export function getCancelledProducts(ordersData, userId, userType) {
    if (!ordersData) return [];

    return ordersData.flatMap(order =>
        order.order_items.filter(item => {
            const status = loadItemStatus(item.product_key);

            // Developer Log: Tracing Cancellation Logic
            console.log(`[BuyerLogic] getCancelledProducts | Checking ${item.product_key} | Status: ${status} | User: ${userId} vs OrderUser: ${order.user_key}`);

            // Visibility check
            if (userType === "buyer" && order.user_key != userId) return false;
            if (userType === "seller" && item.seller_key != userId) return false;

            return status === ITEM_STATUS.CANCELLED;
        }).map(i => i.product_key)
    );
}
// ...
export function getDeliveryProducts(ordersData, userId, userType) {
    if (!ordersData) return [];

    return ordersData.flatMap(order =>
        order.order_items.filter(item => {
            const status = loadItemStatus(item.product_key);
            if (status !== ITEM_STATUS.SHIPPED && status !== ITEM_STATUS.DELIVERED) return false;

            if (userType === "buyer") return order.user_key == userId;
            if (userType === "courier") {
                const dKey = item.supplier_delivery?.delivery_key;
                if (Array.isArray(dKey)) return dKey.includes(userId);
                return dKey === userId;
            }
            if (userType === "seller") return item.seller_key == userId;
            return true; // Admin
        })
    );
}

/**
 * Extracts returned products.
 * @function getReturnedProducts
 * @param {Array<object>} ordersData
 * @param {string} userId
 * @param {string} userType
 * @returns {Array<string>} List of returned product keys.
 */
export function getReturnedProducts(ordersData, userId, userType) {
    if (!ordersData) return [];

    return ordersData.flatMap(order =>
        order.order_items.filter(item => {
            const status = loadItemStatus(item.product_key);
            return status === ITEM_STATUS.RETURNED;
        }).map(i => i.product_key)
    );
}

/**
 * Extracts confirmed products.
 * @function getConfirmedProducts
 * @param {Array<object>} ordersData
 * @param {string} userId
 * @param {string} userType
 * @returns {Array<string>} List of confirmed product keys.
 */
export function getConfirmedProducts(ordersData, userId, userType) {
    if (!ordersData) return [];

    return ordersData.flatMap(order =>
        order.order_items.filter(item => {
            if (userType === "buyer" && order.user_key !== userId) return false;
            const status = loadItemStatus(item.product_key);
            return [ITEM_STATUS.CONFIRMED, ITEM_STATUS.SHIPPED, ITEM_STATUS.DELIVERED].includes(status);
        }).map(i => i.product_key)
    );
}

/**
 * Extracts unique user details for delivery popup.
 * @function getUserDetailsForDelivery
 * @param {Array<object>} products
 * @param {Array<object>} ordersData
 * @returns {Array<object>} List of user details used in the UI.
 */
export function getUserDetailsForDelivery(products, ordersData) {
    const userDetails = [];
    const seenUsers = new Set();
    products.forEach(item => {
        const parentOrder = ordersData.find(o => o.order_items.includes(item));
        if (parentOrder && !seenUsers.has(parentOrder.user_key)) {
            seenUsers.add(parentOrder.user_key);
            userDetails.push({
                name: parentOrder.user_name || "N/A",
                phone: parentOrder.user_phone || "N/A",
                address: parentOrder.user_address || "N/A"
            });
        }
    });
    return userDetails;
}
