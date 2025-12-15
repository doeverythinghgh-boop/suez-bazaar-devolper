/**
 * @file buyerPopups.js
 * @description Buyer Popups Controller.
 * This file acts as the Orchestrator/Controller for buyer-related interactions.
 * It imports business logic from `buyerLogic.js` and UI generation from `buyerUi.js`.
 * It manages the SweetAlert2 lifecycle and event binding.
 * Adheres to SRP by delegating specific responsibilities.
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
    getProductsForReview,
    getCancelledProducts,
    getDeliveryProducts,
    getReturnedProducts,
    getConfirmedProducts,
    getUserDetailsForDelivery
} from "./buyerLogic.js";

import {
    generateReviewListHtml,
    generateCancelledListHtml,
    generateDeliveryUserInfoHtml,
    generateDeliveryItemsHtml,
    generateReturnedListHtml,
    generateConfirmedListHtml
} from "./buyerUi.js";

// Import reused Logic and UI from Seller modules
import { getShippableProducts, getRejectedProducts } from "./sellerLogic.js";
import { generateShippingTableHtml, generateRejectedListHtml } from "./sellerUi.js";

// ... existing code ...

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
            icon: "error", // Use error icon for rejected
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

// =============================================================================
// EVENT HANDLERS (Controller Layer)
// =============================================================================

/**
 * Attaches listeners to "Show Product" buttons.
 * @function attachLogButtonListeners
 */
function attachLogButtonListeners() {
    document.querySelectorAll('.btn-show-key').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Product Key (Button):', button.dataset.key);
            localStorage.setItem('productKeyFromStepReview', button.dataset.key);
        });
    });
}

/**
 * Handles saving review changes.
 * @function handleReviewSave
 * @param {object} data
 * @param {Array<object>} ordersData
 */
/**
 * Handles saving review changes.
 * @function handleReviewSave
 * @param {object} data
 * @param {Array<object>} ordersData
 */
async function handleReviewSave(data, ordersData) {
    const container = document.getElementById("buyer-review-products-container");
    if (!container) return; // Guard clause
    const checkboxes = container.querySelectorAll('input[name="productKeys"]');

    const updates = [];

    checkboxes.forEach(cb => {
        if (!cb.disabled) {
            const newStatus = cb.checked ? ITEM_STATUS.PENDING : ITEM_STATUS.CANCELLED;
            const currentStatus = loadItemStatus(cb.value);
            if (currentStatus !== newStatus) {
                updates.push({ key: cb.value, status: newStatus });
            }
        }
    });

    if (updates.length > 0) {
        // Show loading state
        Swal.fire({
            title: 'جاري الحفظ...',
            text: 'برجاء الانتظار بينما يتم حفظ التغييرات.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            // Execute all updates (Blocking)
            await Promise.all(updates.map(u => saveItemStatus(u.key, u.status)));

            Swal.fire({
                icon: 'success',
                title: 'تم التحديث',
                text: 'تم تحديث اختيار المنتجات بنجاح.',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                updateCurrentStepFromState(data, ordersData);
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'فشل الحفظ',
                text: 'حدث خطأ أثناء حفظ البيانات. برجاء المحاولة مرة أخرى.',
                confirmButtonText: 'حسنًا'
            });
        }
    } else {
        Swal.close();
    }
}

/**
 * Handles saving delivery confirmation.
 * @function handleDeliverySave
 * @param {object} data
 * @param {Array<object>} ordersData
 */
async function handleDeliverySave(data, ordersData) {
    const checkboxes = document.querySelectorAll('input[name="deliveryProductKeys"]');
    const updates = [];

    checkboxes.forEach(cb => {
        const currentStatus = loadItemStatus(cb.value);
        const isChecked = cb.checked;

        if (isChecked && currentStatus === ITEM_STATUS.SHIPPED) {
            updates.push({ key: cb.value, status: ITEM_STATUS.DELIVERED });
        } else if (!isChecked && currentStatus === ITEM_STATUS.DELIVERED) {
            updates.push({ key: cb.value, status: ITEM_STATUS.SHIPPED }); // Undo
        }
    });

    if (updates.length > 0) {
        // Show loading state
        Swal.fire({
            title: 'جاري الحفظ...',
            text: 'برجاء الانتظار...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            await Promise.all(updates.map(u => saveItemStatus(u.key, u.status)));

            Swal.fire({
                icon: 'success',
                title: 'تم التحديث',
                text: 'تم تحديث حالة التوصيل.',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                updateCurrentStepFromState(data, ordersData);
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'فشل الحفظ',
                text: 'حدث خطأ أثناء حفظ البيانات.',
                confirmButtonText: 'حسنًا'
            });
        }
    } else {
        Swal.close();
    }
}

// =============================================================================
// MAIN ORCHESTRATORS (Controllers)
// =============================================================================

/**
 * Displays a popup for the buyer to review products and select what they want to order.
 * @function showProductKeysAlert
 * @param {object} data - Control Data.
 * @param {Array<object>} ordersData - Orders Data.
 * @param {boolean} isModificationLocked - Is modification locked.
 */
export function showProductKeysAlert(data, ordersData, isModificationLocked) {
    try {
        const userId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        // Use Logic module to get data
        const productKeys = getProductsForReview(ordersData, userId, userType);

        const isOverallLocked = isModificationLocked || (userType !== "buyer" && userType !== "admin");

        console.log(`[BuyerPopup] showProductKeysAlert | User: ${userId} (${userType}) | Products: ${productKeys.length} | Locked: ${isOverallLocked}`);

        // Use UI module to generate HTML
        const htmlContent = generateReviewListHtml(productKeys, ordersData, isOverallLocked);

        Swal.fire({
            title: isOverallLocked ? "عرض المنتجات" : "اختر المنتجات:",
            html: `<div id="buyer-review-products-container" style="display: flex; flex-direction: column; align-items: start; width: 100%;">${htmlContent}</div>`,
            footer: isOverallLocked
                ? "للمشاهدة فقط - التعديلات مقيدة."
                : '<button id="btn-save-review" class="swal2-confirm swal2-styled" style="background-color: #28a745;">حفظ الاختيارات</button>',
            cancelButtonText: "إغلاق",
            focusConfirm: false,
            allowOutsideClick: !isOverallLocked,
            showConfirmButton: false,
            showCancelButton: true,
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();
                if (!isOverallLocked) {
                    document.getElementById('btn-save-review')?.addEventListener('click', () => {
                        handleReviewSave(data, ordersData);
                    });
                }
            },
        });
    } catch (error) {
        console.error("Error in showProductKeysAlert:", error);
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
            icon: cancelledKeys.length > 0 ? "info" : "success",
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
 * Displays a popup for the buyer to confirm receipt of products.
 * @function showDeliveryConfirmationAlert
 * @param {object} data
 * @param {Array<object>} ordersData
 */
export function showDeliveryConfirmationAlert(data, ordersData) {
    try {
        const userId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        const productsToDeliver = getDeliveryProducts(ordersData, userId, userType);

        if (productsToDeliver.length === 0) {
            Swal.fire({
                title: "لا توجد منتجات لتأكيد استلامها",
                text: "بانتظار شحن المنتجات.",
                icon: "info",
                confirmButtonText: "حسنًا",
                customClass: { popup: "fullscreen-swal" },
            });
            return;
        }

        const userDetails = getUserDetailsForDelivery(productsToDeliver, ordersData);
        const userInfoHtml = generateDeliveryUserInfoHtml(userDetails);
        const checkboxesHtml = generateDeliveryItemsHtml(productsToDeliver);

        Swal.fire({
            title: "تأكيد استلام المنتجات",
            html: `<div id="delivery-confirmation-container" style="display: flex; flex-direction: column; align-items: start; width: 100%;">
                    ${userInfoHtml}
                    ${checkboxesHtml}
                   </div>`,
            footer: '<button id="btn-save-delivery" class="swal2-confirm swal2-styled" style="background-color: #28a745;">تأكيد الاستلام</button>',
            cancelButtonText: "إلغاء",
            showConfirmButton: false,
            showCancelButton: true,
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();
                document.getElementById('btn-save-delivery')?.addEventListener('click', () => {
                    handleDeliverySave(data, ordersData);
                });
            },
        });
    } catch (error) {
        console.error("Error in showDeliveryConfirmationAlert:", error);
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
            icon: returnedKeys.length > 0 ? "warning" : "success",
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
            icon: confirmedKeys.length > 0 ? "success" : "info",
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
            icon: "info",
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
