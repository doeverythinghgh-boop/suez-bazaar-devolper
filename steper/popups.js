/**
 * @file popups.js
 * @description Barrel File for Popups.
 * The purpose of this file is to simplify importing functions in other files.
 * Instead of importing each function from its own file, they can all be imported from here.
 * This also maintains compatibility with legacy code if it relied on a single file.
 */

// Re-export helper functions
export { addStatusToggleListener } from "./popupHelpers.js";

// Re-export buyer popups
export {
    showProductKeysAlert,
    showUnselectedProductsAlert,
    showDeliveryConfirmationAlert,
    showReturnedProductsAlert,
} from "./buyerPopups.js";

// Re-export seller popups
export {
    showSellerConfirmationProductsAlert,
    showSellerRejectedProductsAlert,
    showShippingInfoAlert,
} from "./sellerPopups.js";
