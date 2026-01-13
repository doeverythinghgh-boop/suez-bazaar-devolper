/**
 * @file steper/buyerPopups/statusViews.js
 * @description Controllers for Read-Only status views in the Buyer workflow.
 */

import { getCancelledProducts, getReturnedProducts, getConfirmedProducts, groupConfirmedProductsBySeller } from "../buyerLogic.js";
import { generateCancelledListHtml, generateReturnedListHtml, generateConfirmedListHtml, generateSellerGroupedHtml } from "../buyerUi.js";
import { getShippableProducts, getRejectedProducts } from "../sellerLogic.js";
import { generateShippingTableHtml, generateRejectedListHtml } from "../sellerUi.js";
import { attachLogButtonListeners } from "./utils.js";

/**
 * Displays products rejected by the seller to the buyer (Read-Only).
 * @function showBuyerRejectedProductsAlert
 * @param {object} data
 * @param {Array<object>} ordersData
 */
export function showBuyerRejectedProductsAlert(data, ordersData) {
    try {
        const userId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        const rejectedProducts = getRejectedProducts(ordersData, userId, userType);

        // Use seller UI generator as it fits the need
        const htmlContent = generateRejectedListHtml(rejectedProducts);

        Swal.fire({
            title: window.langu('stepper_rejected_products_title'),
            html: `<div id="buyer-rejected-container">${htmlContent}</div>`,
            confirmButtonText: window.langu('alert_close_btn'),
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text',
                confirmButton: 'swal-modern-mini-confirm'
            },
            didOpen: () => {
                attachLogButtonListeners();
            }
        });
    } catch (error) {
        console.error("Error in showBuyerRejectedProductsAlert:", error);
    }
}

/**
 * Displays products cancelled (status = CANCELLED).
 * @function showUnselectedProductsAlert
 * @param {object} data
 * @param {Array<object>} ordersData
 */
export function showUnselectedProductsAlert(data, ordersData) {
    try {
        const userId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        const cancelledKeys = getCancelledProducts(ordersData, userId, userType);
        const htmlContent = generateCancelledListHtml(cancelledKeys, ordersData);

        Swal.fire({
            title: window.langu('buyer_cancelled_products'),
            html: `<div id="cancelled-products-container">${htmlContent}</div>`,
            confirmButtonText: window.langu('alert_confirm_btn'),
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text',
                confirmButton: 'swal-modern-mini-confirm'
            },
            didOpen: () => {
                attachLogButtonListeners();
            }
        });
    } catch (error) {
        console.error("Error in showUnselectedProductsAlert:", error);
    }
}

/**
 * Displays products returned (status = RETURNED).
 * @function showReturnedProductsAlert
 * @param {object} data
 * @param {Array<object>} ordersData
 */
export function showReturnedProductsAlert(data, ordersData) {
    try {
        const userId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        const returnedKeys = getReturnedProducts(ordersData, userId, userType);
        const htmlContent = generateReturnedListHtml(returnedKeys, ordersData);

        Swal.fire({
            title: window.langu('buyer_returned_products'),
            html: `<div id="buyer-returned-container">${htmlContent}</div>`,
            confirmButtonText: window.langu('alert_confirm_btn'),
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text',
                confirmButton: 'swal-modern-mini-confirm'
            },
            didOpen: () => {
                attachLogButtonListeners();
            }
        });
    } catch (error) {
        console.error("Error in showReturnedProductsAlert:", error);
    }
}

/**
 * Displays products that have been confirmed by the seller.
 * @function showBuyerConfirmedProductsAlert
 * @param {object} data - Control Data.
 * @param {Array<object>} ordersData - Orders Data.
 */
export function showBuyerConfirmedProductsAlert(data, ordersData) {
    try {
        const userId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        const confirmedKeys = getConfirmedProducts(ordersData, userId, userType);
        const htmlContent = generateConfirmedListHtml(confirmedKeys, ordersData);

        Swal.fire({
            title: window.langu('buyer_confirmed_products'),
            html: `<div id="buyer-confirmed-container">${htmlContent}</div>`,
            confirmButtonText: window.langu('alert_confirm_btn'),
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text',
                confirmButton: 'swal-modern-mini-confirm'
            },
            didOpen: () => {
                attachLogButtonListeners();
            }
        });
    } catch (error) {
        console.error("Error in showBuyerConfirmedProductsAlert:", error);
    }
}

/**
 * Displays products appearing in the shipping stage (Confirmed/Shipped) for the buyer (Read-Only).
 * @function showBuyerShippingInfoAlert
 * @param {object} data
 * @param {Array<object>} ordersData
 */
export function showBuyerShippingInfoAlert(data, ordersData) {
    try {
        const userId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        const shippableProducts = getShippableProducts(ordersData, userId, userType);
        const htmlContent = generateShippingTableHtml(shippableProducts);

        Swal.fire({
            title: window.langu('buyer_shipping_products'),
            html: `<div id="buyer-shipping-container">${htmlContent}</div>`,
            confirmButtonText: window.langu('alert_close_btn'),
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text',
                confirmButton: 'swal-modern-mini-confirm'
            },
            didOpen: () => {
                attachLogButtonListeners();
                // Disable all inputs to make it read-only
                const popup = Swal.getPopup();
                const inputs = popup.querySelectorAll('input, select, textarea');
                inputs.forEach(input => input.disabled = true);
            }
        });
    } catch (error) {
        console.error("Error in showBuyerShippingInfoAlert:", error);
    }
}

/**
 * Displays confirmed products for Courier (Delivery Service) showing Seller Details.
 * @function showCourierConfirmedProductsAlert
 * @param {object} data - Control Data.
 * @param {Array<object>} ordersData - Orders Data.
 */
export async function showCourierConfirmedProductsAlert(data, ordersData) {
    try {
        const userId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        // 1. Get products confirmed for this courier
        const confirmedKeys = getConfirmedProducts(ordersData, userId, userType);

        if (confirmedKeys.length === 0) {
            Swal.fire({
                title: window.langu('buyer_confirmed_products'),
                text: window.langu('courier_no_confirmed_products'),
                confirmButtonText: window.langu('alert_confirm_btn'),
                buttonsStyling: false,
                customClass: {
                    popup: 'swal-modern-mini-popup',
                    title: 'swal-modern-mini-title',
                    htmlContainer: 'swal-modern-mini-text',
                    confirmButton: 'swal-modern-mini-confirm'
                },
            });
            return;
        }

        // 2. Fetch ALL users to resolve Seller Names (Name, Phone, Address)
        let allUsers = [];

        // Try using window.apiFetch which is available from network.js in stepper-only.html
        if (typeof window.apiFetch === 'function') {
            Swal.showLoading();

            // [Dependency Safety] Ensure baseURL is defined for apiFetch
            if (typeof window.baseURL === 'undefined') {
                if (data && data.baseURL) {
                    window.baseURL = data.baseURL;
                } else {
                    console.error("[BuyerPopups] baseURL is missing. apiFetch might fail.");
                }
            }

            const result = await window.apiFetch('/api/users');
            if (result && !result.error && Array.isArray(result)) {
                allUsers = result;
            } else if (result && !result.error && result.users) {
                allUsers = result.users;
            } else {
                console.warn("[BuyerPopups] apiFetch for users failed:", result);
            }
            if (Swal.isVisible()) Swal.close();
        } else {
            console.warn("[BuyerPopups] window.apiFetch is not available.");
        }

        // Fallback
        if (allUsers.length === 0) {
            allUsers = data.users || [];
        }

        // 3. Group by Seller
        const groupedData = groupConfirmedProductsBySeller(confirmedKeys, ordersData, allUsers);

        // 4. Generate UI
        const htmlContent = generateSellerGroupedHtml(groupedData);

        Swal.fire({
            title: window.langu('courier_products_to_deliver'),
            html: `<div id="courier-confirmed-container">${htmlContent}</div>`,
            confirmButtonText: window.langu('alert_close_btn'),
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text',
                confirmButton: 'swal-modern-mini-confirm'
            },
            didOpen: () => {
                attachLogButtonListeners();

                // إضافة مستمع لحدث النقر على زر الخريطة لموقع البائع
                const popup = Swal.getPopup();
                popup.querySelectorAll('.btn-view-seller-map').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const lat = btn.dataset.lat;
                        const lng = btn.dataset.lng;
                        const sellerName = btn.dataset.name;

                        Swal.fire({
                            html: `<iframe src="/location/LOCATION.html?lat=${lat}&lng=${lng}&viewOnly=true" style="width: 100%; height: 75vh; border: none; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);"></iframe>`,
                            showConfirmButton: false,
                            showCloseButton: false,
                            padding: '0',
                            background: 'transparent',
                            buttonsStyling: false,
                            customClass: {
                                popup: 'swal-modern-mini-popup',
                                title: 'swal-modern-mini-title'
                            },
                            didOpen: () => {
                                // استماع لرسالة الإغلاق القادمة من نافذة الخريطة
                                const handleMapMsg = (event) => {
                                    if (event.data && event.data.type === 'CLOSE_LOCATION_MODAL') {
                                        Swal.close();
                                        window.removeEventListener('message', handleMapMsg);
                                    }
                                };
                                window.addEventListener('message', handleMapMsg);
                            }
                        });
                    });
                });
            }
        });
    } catch (error) {
        console.error("Error in showCourierConfirmedProductsAlert:", error);
    }
}
