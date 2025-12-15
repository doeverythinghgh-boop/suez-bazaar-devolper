/**
 * @file sellerPopups.js
 * @description Seller Popups Controller.
 * This file acts as the Orchestrator/Controller for seller-related interactions.
 * It imports business logic from `sellerLogic.js` and UI generation from `sellerUi.js`.
 * It manages the SweetAlert2 lifecycle and event binding.
 */

import {
    saveItemStatus,
    loadItemStatus
} from "./stateManagement.js";
import { ITEM_STATUS } from "./config.js";
import {
    updateCurrentStepFromState
} from "./uiUpdates.js";

// Import Logic and UI modules
import {
    getConfirmationProducts,
    getRejectedProducts,
    getShippableProducts
} from "./sellerLogic.js";

import {
    generateConfirmationTableHtml,
    generateRejectedListHtml,
    generateShippingTableHtml
} from "./sellerUi.js";


// =============================================================================
// EVENT HANDLERS (Logic Layer)
// =============================================================================

/**
 * Attaches listeners to "Show Product" buttons.
 * @function attachLogButtonListeners
 */
function attachLogButtonListeners() {
    document.querySelectorAll('.btn-show-key').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[Seller] Product Key:', btn.dataset.key);
            localStorage.setItem('productKeyFromStepReview', btn.dataset.key);
        });
    });
}

/**
 * Handles the save action for confirmation.
 * @function handleConfirmationSave
 * @param {object} data
 * @param {Array<object>} ordersData
 */
function handleConfirmationSave(data, ordersData) {
    const checkboxes = document.querySelectorAll('input[name="sellerProductKeys"]');
    let changed = false;

    checkboxes.forEach(cb => {
        if (!cb.disabled) {
            const newStatus = cb.checked ? ITEM_STATUS.CONFIRMED : ITEM_STATUS.PENDING;
            const currentStatus = loadItemStatus(cb.value);
            if (currentStatus !== newStatus && (currentStatus === ITEM_STATUS.PENDING || currentStatus === ITEM_STATUS.CONFIRMED)) {
                saveItemStatus(cb.value, newStatus);
                changed = true;
            }
        }
    });

    if (changed) {
        Swal.fire({
            icon: 'success',
            title: 'تم الحفظ',
            text: 'تم تحديث حالة المنتجات بنجاح.',
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            updateCurrentStepFromState(data, ordersData);
        });
    } else {
        Swal.close();
    }
}

/**
 * Handles the save action for shipping updates.
 * @function handleShippingSave
 * @param {object} data
 * @param {Array<object>} ordersData
 */
function handleShippingSave(data, ordersData) {
    const checkboxes = document.querySelectorAll('input[name="shippingProductKeys"]');
    let changed = false;

    checkboxes.forEach(cb => {
        if (!cb.disabled) {
            const currentStatus = loadItemStatus(cb.value);
            const shouldBeShipped = cb.checked;

            if (shouldBeShipped && currentStatus === ITEM_STATUS.CONFIRMED) {
                saveItemStatus(cb.value, ITEM_STATUS.SHIPPED);
                changed = true;
            } else if (!shouldBeShipped && currentStatus === ITEM_STATUS.SHIPPED) {
                saveItemStatus(cb.value, ITEM_STATUS.CONFIRMED);
                changed = true;
            }
        }
    });

    if (changed) {
        Swal.fire({
            icon: 'success',
            title: 'تم التحديث',
            text: 'تم تحديث حالة الشحن بنجاح.',
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            updateCurrentStepFromState(data, ordersData);
        });
    } else {
        Swal.close();
    }
}

// =============================================================================
// MAIN ORCHESTRATORS (Controllers)
// =============================================================================

/**
 * Displays a popup for the seller to confirm product availability.
 * @function showSellerConfirmationProductsAlert
 * @param {object} data - Control Data.
 * @param {Array<object>} ordersData - Orders Data.
 */
export function showSellerConfirmationProductsAlert(data, ordersData) {
    try {
        const products = getConfirmationProducts(ordersData, data.currentUser.idUser, data.currentUser.type);
        const htmlContent = generateConfirmationTableHtml(products, ordersData);

        Swal.fire({
            title: "تأكيد المنتجات",
            html: `<div id="seller-confirmation-container" style="display: flex; flex-direction: column; align-items: start; width: 100%; max-height: 300px; overflow: auto;">
                    ${htmlContent}
                   </div>`,
            footer: '<button id="btn-save-confirmation" class="swal2-confirm swal2-styled" style="background-color: #28a745;">حفظ التغييرات</button>',
            cancelButtonText: "إغلاق",
            showConfirmButton: false,
            showCancelButton: true,
            focusConfirm: false,
            allowOutsideClick: true,
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();
                document.getElementById('btn-save-confirmation')?.addEventListener('click', () => {
                    handleConfirmationSave(data, ordersData);
                });
            },
        });
    } catch (error) {
        console.error("Error in showSellerConfirmationProductsAlert:", error);
    }
}

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
            title: "المنتجات المرفوضة",
            html: htmlContent,
            icon: rejectedProducts.length > 0 ? "info" : "success",
            confirmButtonText: "حسنًا",
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => attachLogButtonListeners()
        });
    } catch (error) {
        console.error("Error in showSellerRejectedProductsAlert:", error);
    }
}

/**
 * Displays a popup with products to be shipped.
 * @function showShippingInfoAlert
 * @param {object} data
 * @param {Array<object>} ordersData
 */
export function showShippingInfoAlert(data, ordersData) {
    try {
        const shippableProducts = getShippableProducts(ordersData, data.currentUser.idUser, data.currentUser.type);

        if (shippableProducts.length === 0) {
            Swal.fire({
                title: "لا توجد منتجات للشحن",
                text: "يجب تأكيد المنتجات أولاً.",
                icon: "warning",
                confirmButtonText: "حسنًا",
                customClass: { popup: "fullscreen-swal" },
            });
            return;
        }

        const htmlContent = generateShippingTableHtml(shippableProducts);

        Swal.fire({
            title: "شحن المنتجات",
            html: htmlContent,
            footer: '<button id="btn-save-shipping" class="swal2-confirm swal2-styled" style="background-color: #007bff;">تحديث حالة الشحن</button>',
            confirmButtonText: "إغلاق",
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: "إغلاق",
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();
                document.getElementById('btn-save-shipping')?.addEventListener('click', () => {
                    handleShippingSave(data, ordersData);
                });
            },
        });
    } catch (error) {
        console.error("Error in showShippingInfoAlert:", error);
    }
}
// Import Logic and UI from Buyer modules for the "Delivered" view
// Import Logic and UI from Buyer modules for the "Delivered" and "Returned" view
import {
    getDeliveryProducts,
    getReturnedProducts,
    getUserDetailsForDelivery
} from "./buyerLogic.js";
import {
    generateDeliveryUserInfoHtml,
    generateDeliveryItemsHtml,
    generateReturnedListHtml
} from "./buyerUi.js";

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
                title: "لا توجد منتجات تم توصيلها/شحنها",
                text: "لا توجد منتجات في مرحلة التوصيل.",
                icon: "info",
                confirmButtonText: "إغلاق",
                customClass: { popup: "fullscreen-swal" },
            });
            return;
        }

        const userDetails = getUserDetailsForDelivery(productsToDeliver, ordersData);
        const userInfoHtml = generateDeliveryUserInfoHtml(userDetails);
        const checkboxesHtml = generateDeliveryItemsHtml(productsToDeliver);

        Swal.fire({
            title: "تأكيد استلام المنتجات (قراءة فقط)",
            html: `<div id="seller-delivery-container" style="display: flex; flex-direction: column; align-items: start; width: 100%;">
                    ${userInfoHtml}
                    ${checkboxesHtml}
                   </div>`,
            icon: "info",
            confirmButtonText: "إغلاق",
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
        const htmlContent = generateReturnedListHtml(returnedKeys, ordersData); // Reusing Buyer UI for list gen

        Swal.fire({
            title: "المنتجات المرتجعة (قراءة فقط)",
            html: `<div id="seller-returned-container">${htmlContent}</div>`,
            icon: returnedKeys.length > 0 ? "warning" : "success",
            confirmButtonText: "إغلاق",
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();
            }
        });
    } catch (error) {
        console.error("Error in showSellerReturnedProductsAlert:", error);
    }
}
