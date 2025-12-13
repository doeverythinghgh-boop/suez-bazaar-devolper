/**
 * @file stepClickHandlers.js
 * @description Step Click Handlers Module.
 * This file is responsible for binding click events to step elements in the UI.
 * It determines what happens when each step is clicked based on user type and permissions.
 */

import { isStepAllowedForCurrentUser } from "./roleAndStepDetermination.js";
import { showUnauthorizedAlert } from "./uiUpdates.js";
import {
    showProductKeysAlert,
    showUnselectedProductsAlert,
    showDeliveryConfirmationAlert,
    showReturnedProductsAlert,
} from "./buyerPopups.js";
import {
    showSellerConfirmationProductsAlert,
    showSellerRejectedProductsAlert,
    showShippingInfoAlert,
} from "./sellerPopups.js";

/**
 * @function addStepClickListeners
 * @description Adds click event listeners to all step elements in the page.
 * Upon clicking, it checks permissions and then opens the appropriate popup.
 *
 * @param {object} data - Full Control Data.
 * @param {Array<object>} ordersData - Orders data.
 * @param {boolean} isBuyerReviewModificationLocked - Special flag indicating if review modification is locked (e.g., because order is shipped).
 * @returns {void}
 * @throws {Error} If there is an error adding click listeners or handling step clicks.
 * @see isStepAllowedForCurrentUser
 * @see showUnauthorizedAlert
 * @see showProductKeysAlert
 * @see showUnselectedProductsAlert
 * @see showDeliveryConfirmationAlert
 * @see showReturnedProductsAlert
 * @see showSellerConfirmationProductsAlert
 * @see showSellerRejectedProductsAlert
 * @see showShippingInfoAlert
 */
export function addStepClickListeners(
    data,
    ordersData,
    isBuyerReviewModificationLocked
) {
    try {
        // Select all elements with class .step-item
        const stepItems = document.querySelectorAll(".step-item");

        stepItems.forEach((stepItem) => {
            stepItem.addEventListener("click", () => {
                const stepId = stepItem.id;
                const userType = data.currentUser.type;

                // 1. Security Check: Is the user allowed to open this step?
                if (!isStepAllowedForCurrentUser(stepId, data)) {
                    showUnauthorizedAlert(); // Show error message
                    return; // Stop execution immediately
                }

                // 2. Routing: Open the appropriate window based on step ID and user type
                switch (stepId) {
                    case "step-review":
                        // Review Step: Shows products for review
                        showProductKeysAlert(
                            data,
                            ordersData,
                            isBuyerReviewModificationLocked
                        );
                        break;

                    case "step-confirmed":
                        // Confirmation Step: For seller to confirm product availability
                        if (userType === "seller" || userType === "admin")
                            showSellerConfirmationProductsAlert(data, ordersData);
                        break;

                    case "step-shipped":
                        // Shipping Step: For seller or courier to view shipped items
                        if (userType === "seller" || userType === "courier" || userType === "admin")
                            showShippingInfoAlert(data, ordersData);
                        break;

                    case "step-cancelled":
                        // Cancellation Step: Shows products cancelled by the buyer
                        showUnselectedProductsAlert(data, ordersData);
                        break;

                    case "step-rejected":
                        // Rejection Step: Shows products rejected by the seller
                        showSellerRejectedProductsAlert(data, ordersData);
                        break;

                    case "step-delivered":
                        // Delivery Step: For buyer to confirm receipt or courier to follow up
                        if (userType === "buyer" || userType === "courier" || userType === "admin")
                            showDeliveryConfirmationAlert(data, ordersData);
                        break;

                    case "step-returned":
                        // Return Step: Shows returned products
                        showReturnedProductsAlert(data, ordersData);
                        break;
                }
            });
        });
    } catch (listenerError) {
        console.error("Error in addStepClickListeners:", listenerError);
    }
}
