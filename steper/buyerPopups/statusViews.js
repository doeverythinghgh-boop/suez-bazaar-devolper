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
            title: "المنتجات المرفوضة",
            html: `<div id="buyer-rejected-container">${htmlContent}</div>`,
            confirmButtonText: "إغلاق",
            customClass: { popup: "fullscreen-swal" },
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
            title: "المنتجات الملغاة",
            html: `<div id="cancelled-products-container">${htmlContent}</div>`,
            confirmButtonText: "حسنًا",
            customClass: { popup: "fullscreen-swal" },
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
            title: "المنتجات المرتجعة",
            html: `<div id="buyer-returned-container">${htmlContent}</div>`,
            confirmButtonText: "حسنًا",
            customClass: { popup: "fullscreen-swal" },
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
            title: "المنتجات المؤكدة",
            html: `<div id="buyer-confirmed-container">${htmlContent}</div>`,
            confirmButtonText: "حسنًا",
            customClass: { popup: "fullscreen-swal" },
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
            title: "منتجات قيد الشحن",
            html: `<div id="buyer-shipping-container">${htmlContent}</div>`,
            confirmButtonText: "إغلاق",
            customClass: { popup: "fullscreen-swal" },
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
                title: "المنتجات المؤكدة",
                text: "لا توجد منتجات مؤكدة حالياً.",
                icon: "info",
                confirmButtonText: "حسنًا",
                customClass: { popup: "fullscreen-swal" },
            });
            return;
        }

        // 2. Fetch ALL users to resolve Seller Names (Name, Phone, Address)
        let allUsers = [];

        // Try using window.apiFetch which is available from network.js in stepper-only.html
        if (typeof window.apiFetch === 'function') {
            Swal.showLoading();
            if (typeof baseURL === 'undefined' && data.baseURL) {
                window.baseURL = data.baseURL;
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
            title: "المنتجات المطلوب توصيلها",
            html: `<div id="courier-confirmed-container">${htmlContent}</div>`,
            confirmButtonText: "إغلاق",
            customClass: { popup: "fullscreen-swal" },
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
                            title: `موقع البائع: ${sellerName}`,
                            html: `<iframe src="/location/LOCATION.html?lat=${lat}&lng=${lng}" style="width: 100%; height: 60vh; min-height: 400px; border: none; border-radius: 8px;"></iframe>`,
                            confirmButtonText: "إغلاق",
                            customClass: { popup: "fullscreen-swal" }
                        });
                    });
                });
            }
        });
    } catch (error) {
        console.error("Error in showCourierConfirmedProductsAlert:", error);
    }
}
