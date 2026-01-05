/**
 * @file steper/sellerPopups/statusViews.js
 * @description Controllers for Read-Only status views in the Seller workflow.
 */

import { getRejectedProducts } from "../sellerLogic.js";
import { generateRejectedListHtml } from "../sellerUi.js";
import { getDeliveryProducts, getReturnedProducts, getUserDetailsForDelivery } from "../buyerLogic.js";
import { generateDeliveryUserInfoHtml, generateDeliveryItemsHtml, generateReturnedListHtml } from "../buyerUi.js";
import { attachLogButtonListeners } from "./utils.js";

/**
 * Displays products rejected by the seller.
 * @function showSellerRejectedProductsAlert
 * @param {object} data
 * @param {Array<object>} ordersData
 */
export function showSellerRejectedProductsAlert(data, ordersData) {
    try {
        const rejectedProducts = getRejectedProducts(ordersData, data.currentUser.idUser, data.currentUser.type);
        const htmlContent = generateRejectedListHtml(rejectedProducts);

        Swal.fire({
            title: window.langu('stepper_rejected_products_title'),
            html: `<div id="seller-rejected-container">${htmlContent}</div>`,
            confirmButtonText: window.langu('alert_confirm_btn'),
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => attachLogButtonListeners()
        });
    } catch (error) {
        console.error("Error in showSellerRejectedProductsAlert:", error);
    }
}

/**
 * Displays product receipt confirmation (Delivered Step) for the Seller (Read-Only).
 * @function showSellerDeliveryConfirmationAlert
 * @param {object} data
 * @param {Array<object>} ordersData
 */
export function showSellerDeliveryConfirmationAlert(data, ordersData) {
    try {
        const userId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        // Reuse buyer logic which already filters by seller_key for "seller" type
        const productsToDeliver = getDeliveryProducts(ordersData, userId, userType);

        if (productsToDeliver.length === 0) {
            Swal.fire({
                title: window.langu('stepper_no_delivered_products'),
                text: window.langu('stepper_no_delivered_desc'),
                confirmButtonText: window.langu('alert_close_btn'),
                customClass: { popup: "fullscreen-swal" },
            });
            return;
        }

        let userInfoHtml = "";
        if (userType !== 'seller') {
            const userDetails = getUserDetailsForDelivery(productsToDeliver, ordersData);
            userInfoHtml = generateDeliveryUserInfoHtml(userDetails);
        }
        const checkboxesHtml = generateDeliveryItemsHtml(productsToDeliver);

        Swal.fire({
            title: window.langu('stepper_delivery_confirm_title'),
            html: `<div id="seller-delivery-container" style="display: flex; flex-direction: column; align-items: start; width: 100%;">
                    ${userInfoHtml}
                    ${checkboxesHtml}
                   </div>`,
            confirmButtonText: window.langu('alert_close_btn'),
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();
                // Disable all inputs to make it read-only
                const popup = Swal.getPopup();
                const inputs = popup.querySelectorAll('input, select, textarea');
                inputs.forEach(input => input.disabled = true);
            },
        });
    } catch (error) {
        console.error("Error in showSellerDeliveryConfirmationAlert:", error);
    }
}

/**
 * Displays returned products (Returned Step) for the Seller (Read-Only).
 * @function showSellerReturnedProductsAlert
 * @param {object} data
 * @param {Array<object>} ordersData
 */
export function showSellerReturnedProductsAlert(data, ordersData) {
    try {
        const userId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        const returnedKeys = getReturnedProducts(ordersData, userId, userType);
        const htmlContent = generateReturnedListHtml(returnedKeys, ordersData);

        Swal.fire({
            title: window.langu('stepper_returned_products_title'),
            html: `<div id="seller-returned-container">${htmlContent}</div>`,
            confirmButtonText: window.langu('alert_close_btn'),
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();
            }
        });
    } catch (error) {
        console.error("Error in showSellerReturnedProductsAlert:", error);
    }
}
