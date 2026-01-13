/**
 * @file roleAndStepDetermination.js
 * @description Logic for determining User Roles and Application Step state.
 */

import { loadStepState, getAllItemsStatus } from "./stateManagement.js";
import { ADMIN_IDS, ITEM_STATUS } from "./config.js";

/**
 * Determines the user type based on ID and relationship to orders.
 * Order of precedence: Admin > Seller > Buyer > Courier.
 *
 * @param {string} userId - The user's ID.
 * @param {Array<Object>} ordersData - The orders data.
 * @param {Object} controlData - Control data (unused but kept for signature compatibility).
 * @returns {string|null} The user type ("admin", "seller", "buyer", "courier") or null.
 */
export function determineUserType(userId, ordersData, controlData) {
    try {
        const effectiveUserId = (userId && typeof userId === 'object') ? userId.idUser : userId;
        const userIdStr = String(effectiveUserId || '');

        if (ADMIN_IDS.includes(userIdStr)) return "admin";

        let isBuyer = false;
        let isSeller = false;
        let isCourier = false;

        if (!ordersData || !Array.isArray(ordersData)) {
            console.error("[RoleDetermination] ordersData is not a valid array:", ordersData);
            return null;
        }

        for (const order of ordersData) {
            if (String(order.user_key) === userIdStr) {
                isBuyer = true;
            }

            if (!order.order_items || !Array.isArray(order.order_items)) {
                continue;
            }

            for (const item of order.order_items) {
                if (String(item.seller_key) === userIdStr) {
                    isSeller = true;
                }

                // --- Courier Check Supporting Multiple Formats ---
                const deliveryField = item.supplier_delivery;
                if (deliveryField) {
                    const deliveries = Array.isArray(deliveryField) ? deliveryField : [deliveryField];

                    if (deliveries.some(d => {
                        const dKey = (d && typeof d === 'object') ? d.delivery_key : d;
                        return String(dKey || '') === userIdStr;
                    })) {
                        isCourier = true;
                    }
                }
            }
        }

        if (isBuyer && isSeller) {
            console.error("Fatal Error: User cannot be both 'seller' and 'buyer'.");
            return null;
        }

        if (isSeller) return "seller";
        if (isBuyer) return "buyer";
        if (isCourier) return "courier";

        return null;
    } catch (error) {
        console.error("Error in determineUserType:", error);
        return null;
    }
}

/**
 * Determines the current active step based on item statuses.
 * Logic: The step is tied to the "lowest" common progress of active items.
 *
 * @param {Object} controlData - Control data containing step definitions.
 * @returns {{stepId: string, stepNo: string, status: string}} Active step state.
 */
export function determineCurrentStepId(controlData) {
    const defaultState = {
        stepId: "step-review",
        stepNo: getStepNo(controlData, "step-review", "1"),
        status: "active",
    };

    try {
        const itemsMap = getAllItemsStatus();
        const items = Object.values(itemsMap);

        if (items.length === 0) return defaultState;

        // Filter active items (ignoring Cancelled, Rejected, Returned)
        const activeItems = items.filter(i =>
            ![ITEM_STATUS.CANCELLED, ITEM_STATUS.REJECTED, ITEM_STATUS.RETURNED].includes(i.status)
        );

        if (activeItems.length === 0) return defaultState;

        // Check if all active items have reached specific milestones
        const allDelivered = activeItems.every(i => i.status === ITEM_STATUS.DELIVERED);
        const allShipped = activeItems.every(i => [ITEM_STATUS.SHIPPED, ITEM_STATUS.DELIVERED].includes(i.status));
        const allConfirmed = activeItems.every(i => [ITEM_STATUS.CONFIRMED, ITEM_STATUS.SHIPPED, ITEM_STATUS.DELIVERED].includes(i.status));

        if (allDelivered) return createStepState(controlData, "step-delivered", "4");
        if (allShipped) return createStepState(controlData, "step-shipped", "3");
        if (allConfirmed) return createStepState(controlData, "step-confirmed", "2");

        return defaultState;
    } catch (error) {
        console.error("Error in determineCurrentStepId:", error);
        return defaultState;
    }
}

/**
 * Checks if the current user has permission to access a step.
 *
 * @param {string} stepId - The step ID to check.
 * @param {object} data - Control data with user permissions.
 * @returns {boolean} True if allowed.
 */
export function isStepAllowedForCurrentUser(stepId, data) {
    try {
        const currentUserType = data.currentUser.type;
        const userPermissions = data.users.find(u => u.type === currentUserType);
        return userPermissions?.allowedSteps?.includes(stepId) || false;
    } catch (error) {
        console.error("Error in isStepAllowedForCurrentUser:", error);
        return false;
    }
}

// Helpers

function getStepNo(controlData, stepId, fallback) {
    return controlData.steps.find((s) => s.id === stepId)?.no || fallback;
}

function createStepState(controlData, stepId, defaultNo) {
    return {
        stepId: stepId,
        stepNo: getStepNo(controlData, stepId, defaultNo),
        status: "active"
    };
}
