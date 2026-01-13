/**
 * @file steperNotificationLogic.js
 * @description Notification Logic Module for Steper.
 * Contains functions to prepare notification data and check conditions for sending them.
 */

import { ITEM_STATUS } from "./config.js";
import { getAllItemsStatus } from "./stateManagement.js";

/**
 * Extracts unique keys (delivery, seller) and metadata from orders data.
 * @function extractNotificationMetadata
 * @param {Array<object>} ordersData
 * @param {object} controlData
 * @returns {object} Metadata object { buyerKey, deliveryKeys, sellerKeys, orderId, userName }.
 */
export function extractNotificationMetadata(ordersData, controlData) {
    let buyerKey = '';
    let deliveryKeys = [];
    let sellerKeys = [];
    let orderId = '';
    let userName = '';

    if (ordersData && ordersData.length > 0) {
        const firstOrder = ordersData[0];
        buyerKey = firstOrder.user_key || '';
        orderId = firstOrder.id || firstOrder.order_id || '';

        const deliveryKeysSet = new Set();
        const sellerKeysSet = new Set();

        ordersData.forEach(order => {
            if (order.order_items && Array.isArray(order.order_items)) {
                order.order_items.forEach(item => {
                    if (item.supplier_delivery && item.supplier_delivery.delivery_key) {
                        const dKey = item.supplier_delivery.delivery_key;
                        if (Array.isArray(dKey)) {
                            dKey.forEach(k => { if (k) deliveryKeysSet.add(k); });
                        } else if (dKey) {
                            deliveryKeysSet.add(dKey);
                        }
                    }
                    if (item.seller_key) sellerKeysSet.add(item.seller_key);
                });
            }
        });
        deliveryKeys = Array.from(deliveryKeysSet);
        sellerKeys = Array.from(sellerKeysSet);
    }

    let actingUserId = '';

    if (controlData.currentUser) {
        userName = controlData.currentUser.name || controlData.currentUser.idUser || '';
        actingUserId = controlData.currentUser.idUser || '';
    }

    return { buyerKey, deliveryKeys, sellerKeys, orderId, userName, actingUserId };
}

/**
 * Checks for sub-step conditions (Cancelled, Rejected, Returned products) and prepares notification data.
 * @function checkSubStepConditions
 * @param {string} activatedStepId - The ID of the main step just activated.
 * @param {object} metadata - Metadata extracted via extractNotificationMetadata.
 * @returns {object|null} Notification payload for notifyOnSubStepActivation or null.
 */
export function checkSubStepConditions(activatedStepId, metadata) {
    const itemsMap = getAllItemsStatus(); // { itemKey: { status, ... } }
    const allItems = Object.entries(itemsMap);

    if (activatedStepId === 'step-review') {
        // Find sellers whose items were CANCELLED
        const cancelledSellerKeys = new Set();
        allItems.forEach(([key, info]) => {
            if (info.status === ITEM_STATUS.CANCELLED) {
                // We need to find the seller_key for this item. 
                // Since itemsMap might not have seller_key, we can find it in metadata or pass ordersData.
                // However, metadata.sellerKeys is the full list.
                // Let's improve this by finding the seller from the status data if available, 
                // or just accept that we need to look it up.
                if (info.seller_key) cancelledSellerKeys.add(info.seller_key);
            }
        });

        if (cancelledSellerKeys.size > 0) {
            return {
                stepId: 'step-cancelled',
                stepName: 'ملغي',
                sellerKeys: Array.from(cancelledSellerKeys),
                orderId: metadata.orderId,
                userName: metadata.userName
            };
        }
    } else if (activatedStepId === 'step-confirmed') {
        const rejectedSellerKeys = new Set();
        allItems.forEach(([key, info]) => {
            if (info.status === ITEM_STATUS.REJECTED) {
                if (info.seller_key) rejectedSellerKeys.add(info.seller_key);
            }
        });

        if (rejectedSellerKeys.size > 0) {
            return {
                stepId: 'step-rejected',
                stepName: 'مرفوض',
                buyerKey: metadata.buyerKey,
                sellerKeys: Array.from(rejectedSellerKeys), // Added for seller notification if needed
                orderId: metadata.orderId,
                userName: metadata.userName
            };
        }
    } else if (activatedStepId === 'step-delivered') {
        const returnedSellerKeys = new Set();
        allItems.forEach(([key, info]) => {
            if (info.status === ITEM_STATUS.RETURNED) {
                if (info.seller_key) returnedSellerKeys.add(info.seller_key);
            }
        });

        if (returnedSellerKeys.size > 0) {
            return {
                stepId: 'step-returned',
                stepName: 'مرتجع',
                sellerKeys: Array.from(returnedSellerKeys),
                orderId: metadata.orderId,
                userName: metadata.userName
            };
        }
    }

    return null;
}

/**
 * Extracts seller keys for only the items being updated.
 * @function extractRelevantSellerKeys
 * @param {Array<object>} updates - Array of { key: item_key, status: new_status }.
 * @param {Array<object>} ordersData - Original orders data to find item details.
 * @returns {Array<string>} Unique list of relevant seller keys.
 */
export function extractRelevantSellerKeys(updates, ordersData) {
    if (!updates || updates.length === 0 || !ordersData) return [];

    const sellerKeysSet = new Set();
    const updateKeys = updates.map(u => u.key);

    ordersData.forEach(order => {
        if (order.order_items && Array.isArray(order.order_items)) {
            order.order_items.forEach(item => {
                // If this item is in our updates list, collect its seller_key
                if (updateKeys.includes(item.product_key)) {
                    if (item.seller_key) {
                        sellerKeysSet.add(item.seller_key);
                    }
                }
            });
        }
    });

    return Array.from(sellerKeysSet);
}

/**
 * Extracts delivery keys for only the items being updated.
 * @function extractRelevantDeliveryKeys
 * @param {Array<object>} updates - Array of { key: item_key, status: new_status }.
 * @param {Array<object>} ordersData - Original orders data to find item details.
 * @returns {Array<string>} Unique list of relevant delivery keys.
 */
export function extractRelevantDeliveryKeys(updates, ordersData) {
    if (!updates || updates.length === 0 || !ordersData) return [];

    const deliveryKeysSet = new Set();
    const updateKeys = updates.map(u => u.key);

    ordersData.forEach(order => {
        if (order.order_items && Array.isArray(order.order_items)) {
            order.order_items.forEach(item => {
                if (updateKeys.includes(item.product_key)) {
                    if (item.supplier_delivery && item.supplier_delivery.delivery_key) {
                        const dKey = item.supplier_delivery.delivery_key;
                        if (Array.isArray(dKey)) {
                            dKey.forEach(k => { if (k) deliveryKeysSet.add(k); });
                        } else if (dKey) {
                            deliveryKeysSet.add(dKey);
                        }
                    }
                }
            });
        }
    });

    return Array.from(deliveryKeysSet);
}
