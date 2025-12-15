/**
 * @file stepClickHandlers.js
 * @description Handles user interactions with step elements in the UI.
 * Connects UI events to the appropriate Controller logic based on permissions.
 */

import { isStepAllowedForCurrentUser } from "./roleAndStepDetermination.js";
import { showUnauthorizedAlert } from "./uiUpdates.js";
import {
    showProductKeysAlert,
    showUnselectedProductsAlert,
    showDeliveryConfirmationAlert,
    showReturnedProductsAlert,
    showBuyerConfirmedProductsAlert,
} from "./buyerPopups.js";
import {
    showSellerConfirmationProductsAlert,
    showSellerRejectedProductsAlert,
    showShippingInfoAlert,
} from "./sellerPopups.js";
import { showBuyerShippingInfoAlert } from "./buyerPopups.js";

/**
 * Attaches click event listeners to all step indicators.
 *
 * @param {object} controlData - Application control data.
 * @param {Array<object>} ordersData - Orders data.
 * @param {boolean} isBuyerReviewModificationLocked - Flag for buyer restrictions.
 */
export function addStepClickListeners(controlData, ordersData, isBuyerReviewModificationLocked) {
    try {
        const stepItems = document.querySelectorAll(".step-item");

        stepItems.forEach((stepItem) => {
            stepItem.addEventListener("click", () => {
                handleStepClick(stepItem.id, controlData, ordersData, isBuyerReviewModificationLocked);
            });
        });
    } catch (error) {
        console.error("Error in addStepClickListeners:", error);
    }
}

/**
 * Routes the click event to the correct popup controller.
 *
 * @param {string} stepId - The ID of the clicked step.
 * @param {object} controlData - Control data.
 * @param {Array<object>} ordersData - Orders data.
 * @param {boolean} isBuyerLocked - Buyer lock flag.
 */
function handleStepClick(stepId, controlData, ordersData, isBuyerLocked) {
    const userType = controlData.currentUser.type;
    const isAllowed = isStepAllowedForCurrentUser(stepId, controlData);

    console.log(`[StepClick] Clicked: ${stepId}, User: ${userType}, Allowed: ${isAllowed}`);

    if (!isAllowed) {
        showUnauthorizedAlert();
        return;
    }

    switch (stepId) {
        case "step-review":
            showProductKeysAlert(controlData, ordersData, isBuyerLocked);
            break;

        case "step-confirmed":
            if (userType === "buyer") {
                showBuyerConfirmedProductsAlert(controlData, ordersData);
            } else if (["seller", "admin"].includes(userType)) {
                showSellerConfirmationProductsAlert(controlData, ordersData);
            }
            break;

        case "step-shipped":
            if (userType === "buyer") {
                showBuyerShippingInfoAlert(controlData, ordersData);
            } else if (["seller", "courier", "admin"].includes(userType)) {
                showShippingInfoAlert(controlData, ordersData);
            }
            break;

        case "step-cancelled":
            showUnselectedProductsAlert(controlData, ordersData);
            break;

        case "step-rejected":
            showSellerRejectedProductsAlert(controlData, ordersData);
            break;

        case "step-delivered":
            if (["buyer", "courier", "admin"].includes(userType)) {
                showDeliveryConfirmationAlert(controlData, ordersData);
            }
            break;

        case "step-returned":
            showReturnedProductsAlert(controlData, ordersData);
            break;
    }
}
