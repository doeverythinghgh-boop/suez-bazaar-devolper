/**
 * @file roleAndStepDetermination.js
 * @description Module for determining roles and step status (Role and Step Logic).
 * This file contains the "smart" logic of the application:
 * 1. Determining the current user (seller, buyer, courier, or admin) based on their data and relationship to orders.
 * 2. Determining the current active step in the progress bar based on saved data or default status.
 * 3. Verifying user permissions to access a specific step.
 */

import { loadStepState } from "./stateManagement.js";
import { ADMIN_IDS } from "./config.js";

/**
 * @function determineUserType
 * @description Determines the user type (Role) based on their ID and available data.
 * The logic follows a hierarchy:
 * 1. Is Admin?
 * 2. Is associated with any order as a buyer?
 * 3. Is associated with any product as a seller?
 * 4. Is assigned to deliver any product as a courier?
 *
 * @param {string} userId - The current user's ID to determine their role.
 * @param {Array<Object>} ordersData - Array containing all orders data to search within.
 * @param {Object} controlData - Control data (may contain additional info, kept for future compatibility).
 *
 * @returns {string|null} - Returns the user type as a string ('admin', 'buyer', 'seller', 'courier') or null if not recognized.
 * @throws {Error} - If a fatal error occurs during user type determination (e.g., user is both buyer and seller).
 * @see ADMIN_IDS
 */
export function determineUserType(userId, ordersData, controlData) {
    try {
        // 1. Check if the user is an admin (highest priority)
        // Checked against the static list in config.js
        if (ADMIN_IDS.includes(userId)) {
            return "admin";
        }

        // Variables to track roles found for the user
        let isBuyer = false;
        let isSeller = false;
        let isCourier = false;

        // 2. Search all orders to determine user's relationship to them
        for (const order of ordersData) {
            // Is the user the owner of the order (Buyer)?
            if (order.user_key === userId) isBuyer = true;

            // Check order items (products)
            for (const item of order.order_items) {
                // Is the user the seller of this product?
                if (item.seller_key === userId) isSeller = true;

                // Is the user responsible for delivering this product?
                // Safe check for supplier_delivery object then delivery_key
                if (item.supplier_delivery && item.supplier_delivery.delivery_key) {
                    const deliveryKey = item.supplier_delivery.delivery_key;
                    // Support delivery_key whether it's a single value (string) or an array
                    if (Array.isArray(deliveryKey)) {
                        if (deliveryKey.includes(userId)) {
                            isCourier = true;
                        }
                    } else {
                        if (deliveryKey === userId) {
                            isCourier = true;
                        }
                    }
                }
            }
        }

        // 3. Handle role conflicts (Validation)
        // A user cannot be both a seller and a buyer in this system
        if (isBuyer && isSeller) {
            console.error(
                "Fatal Error: Query unacceptable. User cannot be both 'seller' and 'buyer'. Please review data."
            );
            return null;
        }

        // 4. Return role based on defined priority
        // If seller, return as seller
        if (isSeller) return "seller";
        // If buyer, return as buyer
        if (isBuyer) return "buyer";
        // If courier, return as courier
        if (isCourier) return "courier";

        // 5. If no role matched after checking all data
        console.error(
            `Fatal Error: No role found for user ID '${userId}'. Stopping execution.`
        );
        return null;
    } catch (roleError) {
        console.error("Error in determineUserType:", roleError);
        return null;
    }
}

import { getAllItemsStatus } from "./stateManagement.js";
import { ITEM_STATUS } from "./config.js";

/**
 * @function determineCurrentStepId
 * @description Determines the active step based on the aggregate status of all items.
 * Uses a "minimum progress" logic: The order is in the earliest stage that any active item is in.
 *
 * @param {Object} controlData - Control data containing step definitions.
 *
 * @returns {{stepId: string, stepNo: string, status: string}} - Active step object.
 * @throws {Error} - If an error occurs during step determination.
 */
export function determineCurrentStepId(controlData) {
    try {
        const itemsMap = getAllItemsStatus();
        const items = Object.values(itemsMap);

        // Helper to get stepNo
        const getStepNo = (id, defaultNo) =>
            controlData.steps.find((s) => s.id === id)?.no || defaultNo;

        // If no items have status, default to Review
        if (items.length === 0) {
            return {
                stepId: "step-review",
                stepNo: getStepNo("step-review", "1"),
                status: "active",
            };
        }

        // Check statuses
        // We look for the "lowest" status among active items (ignoring cancelled/rejected/returned for progress usually, or treating them as done)
        // For simplicity: If ANY item is pending -> Review.
        // If ALL items are at least Confirmed -> Confirmed.
        // If ALL items are at least Shipped -> Shipped.
        // If ALL items are at least Delivered -> Delivered.

        const hasPending = items.some(i => i.status === ITEM_STATUS.PENDING);
        const hasConfirmed = items.some(i => i.status === ITEM_STATUS.CONFIRMED);
        const hasShipped = items.some(i => i.status === ITEM_STATUS.SHIPPED);

        // Filter out "terminal" states that shouldn't hold back progress if others are moving?
        // Actually, if an item is "Rejected", it's effectively "Done" regarding the main flow.
        const activeItems = items.filter(i =>
            i.status !== ITEM_STATUS.CANCELLED &&
            i.status !== ITEM_STATUS.REJECTED &&
            i.status !== ITEM_STATUS.RETURNED
        );

        if (activeItems.length === 0) {
            // All items are cancelled/rejected -> maybe show Cancelled?
            // For now, default to Review or last known.
            return {
                stepId: "step-review",
                stepNo: getStepNo("step-review", "1"),
                status: "active",
            };
        }

        const allDelivered = activeItems.every(i => i.status === ITEM_STATUS.DELIVERED);
        const allShippedOrMore = activeItems.every(i => i.status === ITEM_STATUS.SHIPPED || i.status === ITEM_STATUS.DELIVERED);
        const allConfirmedOrMore = activeItems.every(i =>
            i.status === ITEM_STATUS.CONFIRMED ||
            i.status === ITEM_STATUS.SHIPPED ||
            i.status === ITEM_STATUS.DELIVERED
        );

        if (allDelivered) {
            return { stepId: "step-delivered", stepNo: getStepNo("step-delivered", "4"), status: "active" };
        }
        if (allShippedOrMore) {
            return { stepId: "step-shipped", stepNo: getStepNo("step-shipped", "3"), status: "active" };
        }
        if (allConfirmedOrMore) {
            return { stepId: "step-confirmed", stepNo: getStepNo("step-confirmed", "2"), status: "active" };
        }

        // Default: Review
        return {
            stepId: "step-review",
            stepNo: getStepNo("step-review", "1"),
            status: "active",
        };

    } catch (stepError) {
        console.error("Error in determineCurrentStepId:", stepError);
        return {
            stepId: "step-review",
            stepNo: controlData.steps.find((s) => s.id === "step-review")?.no || "1",
            status: "active",
        };
    }
}

/**
 * @function isStepAllowedForCurrentUser
 * @description Checks if the current user has permission to interact with a specific step.
 * Relies on the `allowedSteps` array defined for each role in `control.json`.
 *
 * @param {string} stepId - The ID of the step to check (e.g., 'step-review').
 * @param {object} data - Full control data containing user definitions and permissions.
 *
 * @returns {boolean} - true if allowed, false if not.
 * @throws {Error} - If an error occurs during permission checking.
 */
export function isStepAllowedForCurrentUser(stepId, data) {
    try {
        const currentUserType = data.currentUser.type;

        // Find permission settings for the current user type
        const userPermissions = data.users.find(
            (user) => user.type === currentUserType
        );

        // If permissions found and contain allowed steps list
        if (userPermissions && userPermissions.allowedSteps) {
            // Check if the requested step is in the list
            return userPermissions.allowedSteps.includes(stepId);
        }

        // Default is denied
        return false;
    } catch (permissionError) {
        console.error("Error in isStepAllowedForCurrentUser:", permissionError);
        return false;
    }
}
