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
    getUserDetailsForDelivery,
    groupConfirmedProductsBySeller
} from "./buyerLogic.js";

import {
    generateReviewListHtml,
    generateCancelledListHtml,
    generateDeliveryUserInfoHtml,
    generateDeliveryItemsHtml,
    generateReturnedListHtml,
    generateConfirmedListHtml,
    generateSellerGroupedHtml
} from "./buyerUi.js";

import { getShippableProducts, getRejectedProducts } from "./sellerLogic.js";
import { generateShippingTableHtml, generateRejectedListHtml } from "./sellerUi.js";
import { extractNotificationMetadata } from "./steperNotificationLogic.js";
import {
    saveDeliveryLock,
    getDeliveryLockStatus
} from "./dataFetchers.js";

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

                // [Notifications] Dispatch Notifications
                if (typeof window.notifyOnStepActivation === 'function') {
                    const metadata = extractNotificationMetadata(ordersData, data);

                    // 1. Notify Review/Pending (Generic Update) - Optional, maybe just for Cancelled
                    // 2. Notify Cancelled
                    const hasCancelled = updates.some(u => u.status === ITEM_STATUS.CANCELLED);
                    if (hasCancelled) {
                        window.notifyOnStepActivation({
                            stepId: 'step-cancelled',
                            stepName: 'منتجات ملغاة',
                            ...metadata
                        });
                    }
                }
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
 * Shows confirmation dialog before permanently locking.
 * @function handleDeliverySave
 * @param {object} data
 * @param {Array<object>} ordersData
 */
async function handleDeliverySave(data, ordersData) {
    const checkboxes = document.querySelectorAll('input[name="deliveryProductKeys"]');

    // Collect delivered and not-delivered products
    const deliveredProducts = [];
    const notDeliveredProducts = [];

    checkboxes.forEach(cb => {
        const productName = cb.getAttribute('data-product-name') || cb.value;
        if (cb.checked) {
            deliveredProducts.push(productName);
        } else {
            notDeliveredProducts.push(productName);
        }
    });

    // Build HTML for confirmation dialog
    let htmlContent = '<div style="text-align: right; direction: rtl;">';

    // Delivered products section
    if (deliveredProducts.length > 0) {
        htmlContent += '<div style="margin-bottom: 20px;">';
        htmlContent += '<h3 style="color: #1abc9c; margin-bottom: 10px;">✅ المنتجات المستلمة (' + deliveredProducts.length + '):</h3>';
        htmlContent += '<ul style="list-style: none; padding: 0;">';
        deliveredProducts.forEach(name => {
            htmlContent += '<li style="padding: 5px; background: #d5f4e6; margin: 3px 0; border-radius: 3px;">• ' + name + '</li>';
        });
        htmlContent += '</ul></div>';
    }

    // Not delivered products section
    if (notDeliveredProducts.length > 0) {
        htmlContent += '<div style="margin-bottom: 20px;">';
        htmlContent += '<h3 style="color: #666; margin-bottom: 10px;">⏳ المنتجات غير المستلمة (' + notDeliveredProducts.length + '):</h3>';
        htmlContent += '<ul style="list-style: none; padding: 0;">';
        notDeliveredProducts.forEach(name => {
            htmlContent += '<li style="padding: 5px; background: #f0f0f0; margin: 3px 0; border-radius: 3px;">• ' + name + '</li>';
        });
        htmlContent += '</ul></div>';
    }

    // Warning message
    htmlContent += '<div style="background: #fff3cd; border: 2px solid #ffc107; padding: 15px; border-radius: 5px; margin-top: 15px;">';
    htmlContent += '<p style="margin: 0; font-weight: bold; color: #856404;">⚠️ تحذير هام:</p>';
    htmlContent += '<p style="margin: 5px 0 0 0; color: #856404;">بعد الضغط على "تأكيد الحفظ"، لن تتمكن من التعديل مرة أخرى. هذا الإجراء نهائي ولا يمكن التراجع عنه.</p>';
    htmlContent += '</div>';

    htmlContent += '</div>';

    // Show confirmation dialog
    Swal.fire({
        title: 'تأكيد الحفظ النهائي',
        html: htmlContent,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'تأكيد الحفظ',
        cancelButtonText: 'إلغاء',
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#6c757d',
        customClass: { popup: 'fullscreen-swal' },
        allowOutsideClick: false
    }).then(async (result) => {
        if (result.isConfirmed) {
            // User confirmed, proceed with saving
            const updates = [];

            checkboxes.forEach(cb => {
                const currentStatus = loadItemStatus(cb.value);
                const isChecked = cb.checked;

                if (isChecked && currentStatus === ITEM_STATUS.SHIPPED) {
                    updates.push({ key: cb.value, status: ITEM_STATUS.DELIVERED });
                } else if (!isChecked && currentStatus === ITEM_STATUS.DELIVERED) {
                    updates.push({ key: cb.value, status: ITEM_STATUS.SHIPPED });
                }
            });

            if (updates.length > 0) {
                // Show loading
                Swal.fire({
                    title: 'جاري الحفظ...',
                    text: 'يتم حفظ التسليم والقفل...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                try {
                    // Save items first
                    await Promise.all(updates.map(u => saveItemStatus(u.key, u.status)));

                    // Then Lock using Buyer/Courier ID
                    if (ordersData && ordersData.length > 0) {
                        const orderKey = ordersData[0].order_key;
                        const userId = data.currentUser.idUser;
                        await saveDeliveryLock(orderKey, true, ordersData, userId);
                        console.log('[BuyerPopups] Delivery permanently locked for order:', orderKey, 'User:', userId);
                    }

                    Swal.fire({
                        icon: 'success',
                        title: 'تم الحفظ بنجاح',
                        text: 'تم حفظ التسليم بشكل نهائي.',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => {
                        updateCurrentStepFromState(data, ordersData);

                        // [Notifications] Dispatch Notifications
                        if (typeof window.notifyOnStepActivation === 'function') {
                            const metadata = extractNotificationMetadata(ordersData, data);

                            window.notifyOnStepActivation({
                                stepId: 'step-delivered',
                                stepName: 'استلام الطلب',
                                ...metadata
                            });
                        }
                    });
                } catch (error) {
                    console.error("Save failed", error);
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
    });
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
 * Checks lock status first - buyers cannot edit if locked, admins can override.
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

        // Check lock status from local ordersData using User ID
        let isLocked = false;
        if (ordersData && ordersData.length > 0) {
            const orderKey = ordersData[0].order_key;
            isLocked = getDeliveryLockStatus(ordersData, orderKey, userId);
        }

        // Determine if editing is allowed
        const canEdit = userType === 'admin' || !isLocked;

        console.log(`[BuyerPopups] Opening delivery | User: ${userType} | Locked: ${isLocked} | CanEdit: ${canEdit}`);

        const userDetails = getUserDetailsForDelivery(productsToDeliver, ordersData);
        const userInfoHtml = generateDeliveryUserInfoHtml(userDetails);
        const checkboxesHtml = generateDeliveryItemsHtml(productsToDeliver);

        Swal.fire({
            title: canEdit ? "تأكيد استلام المنتجات" : "تأكيد استلام المنتجات (قراءة فقط)",
            html: `<div id="delivery-confirmation-container" style="display: flex; flex-direction: column; align-items: start; width: 100%;">
                    ${userInfoHtml}
                    ${checkboxesHtml}
                   </div>`,
            footer: canEdit
                ? '<button id="btn-save-delivery" class="swal2-confirm swal2-styled" style="background-color: #28a745;">تأكيد الاستلام</button>'
                : '<p style="color: #dc3545; font-weight: bold; margin: 10px 0;">🔒 تم قفل التسليم بشكل دائم - لا يمكن التعديل</p>',
            cancelButtonText: "إلغاء",
            showConfirmButton: false,
            showCancelButton: true,
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();

                if (canEdit) {
                    document.getElementById('btn-save-delivery')?.addEventListener('click', () => {
                        handleDeliverySave(data, ordersData);
                    });
                } else {
                    // Disable all inputs for locked view
                    const container = document.getElementById('delivery-confirmation-container');
                    if (container) {
                        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                            checkbox.disabled = true;
                        });
                    }
                }
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
            // Note: apiFetch relies on 'baseURL' variable. 
            // In stepper-only.html, we bridged parentData.baseURL to window.globalStepperAppData.baseURL
            // But 'network.js' might expect a global 'baseURL' variable.
            // Let's ensure it is set if missing, using the one from control data.
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
            icon: "info",
            confirmButtonText: "إغلاق",
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();
            }
        });

    } catch (error) {
        console.error("Error in showCourierConfirmedProductsAlert:", error);
    }
}

