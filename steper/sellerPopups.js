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
import {
    saveConfirmationLock,
    getConfirmationLockStatus,
    saveShippingLock,
    getShippingLockStatus
} from "./dataFetchers.js";

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

import { extractNotificationMetadata } from "./steperNotificationLogic.js";


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
 * Shows a confirmation dialog before permanently saving changes.
 * @function handleConfirmationSave
 * @param {object} data
 * @param {Array<object>} ordersData
 */
function handleConfirmationSave(data, ordersData) {
    const checkboxes = document.querySelectorAll('input[name="sellerProductKeys"]');

    // Collect accepted and rejected products
    const acceptedProducts = [];
    const rejectedProducts = [];

    checkboxes.forEach(cb => {
        const productName = cb.getAttribute('data-product-name') || cb.value;
        if (cb.checked) {
            acceptedProducts.push(productName);
        } else {
            rejectedProducts.push(productName);
        }
    });

    // Build HTML for confirmation dialog
    let htmlContent = '<div style="text-align: right; direction: rtl;">';

    // Accepted products section
    if (acceptedProducts.length > 0) {
        htmlContent += '<div style="margin-bottom: 20px;">';
        htmlContent += '<h3 style="color: #28a745; margin-bottom: 10px;">✅ المنتجات المقبولة (' + acceptedProducts.length + '):</h3>';
        htmlContent += '<ul style="list-style: none; padding: 0;">';
        acceptedProducts.forEach(name => {
            htmlContent += '<li style="padding: 5px; background: #d4edda; margin: 3px 0; border-radius: 3px;">• ' + name + '</li>';
        });
        htmlContent += '</ul></div>';
    }

    // Rejected products section
    if (rejectedProducts.length > 0) {
        htmlContent += '<div style="margin-bottom: 20px;">';
        htmlContent += '<h3 style="color: #dc3545; margin-bottom: 10px;">❌ المنتجات المرفوضة (' + rejectedProducts.length + '):</h3>';
        htmlContent += '<ul style="list-style: none; padding: 0;">';
        rejectedProducts.forEach(name => {
            htmlContent += '<li style="padding: 5px; background: #f8d7da; margin: 3px 0; border-radius: 3px;">• ' + name + '</li>';
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
                if (!cb.disabled) {
                    const newStatus = cb.checked ? ITEM_STATUS.CONFIRMED : ITEM_STATUS.REJECTED;
                    const currentStatus = loadItemStatus(cb.value);
                    if (currentStatus !== newStatus && (currentStatus === ITEM_STATUS.PENDING || currentStatus === ITEM_STATUS.CONFIRMED || currentStatus === ITEM_STATUS.REJECTED)) {
                        updates.push({ key: cb.value, status: newStatus });
                    }
                }
            });

            if (updates.length > 0) {
                // Show loading
                Swal.fire({
                    title: 'جاري الحفظ...',
                    text: 'يتم حفظ التأكيد والقفل...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                try {
                    // Save items first
                    await Promise.all(updates.map(u => saveItemStatus(u.key, u.status)));

                    // Then Lock using Seller ID
                    if (ordersData && ordersData.length > 0) {
                        const orderKey = ordersData[0].order_key;
                        const sellerId = data.currentUser.idUser; // Identify current seller
                        await saveConfirmationLock(orderKey, true, ordersData, sellerId);
                        console.log('[SellerPopups] Confirmation permanently locked for order:', orderKey, 'Seller:', sellerId);
                    }

                    Swal.fire({
                        icon: 'success',
                        title: 'تم الحفظ بنجاح',
                        text: 'تم حفظ التأكيد بشكل نهائي.',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => {
                        updateCurrentStepFromState(data, ordersData);

                        // [Notifications] Dispatch Notifications
                        if (typeof window.notifyOnStepActivation === 'function') {
                            const metadata = extractNotificationMetadata(ordersData, data);

                            // 1. Notify Confirmed
                            window.notifyOnStepActivation({
                                stepId: 'step-confirmed',
                                stepName: 'تأكيد الطلب',
                                ...metadata
                            });

                            // 2. Notify Rejected (if any)
                            const hasRejected = updates.some(u => u.status === ITEM_STATUS.REJECTED);
                            if (hasRejected) {
                                window.notifyOnStepActivation({
                                    stepId: 'step-rejected',
                                    stepName: 'منتجات مرفوضة',
                                    ...metadata
                                });
                            }
                        }
                    });
                } catch (error) {
                    console.error("Save failed", error);
                    Swal.fire({
                        icon: 'error',
                        title: 'فشل الحفظ',
                        text: 'حدث خطأ أثناء الاتصال بالسيرفر.',
                        confirmButtonText: 'حسنًا'
                    });
                }
            } else {
                Swal.close();
            }
        }
    });
}

/**
 * Handles the save action for shipping updates.
 * Shows confirmation dialog before permanently locking.
 * @function handleShippingSave
 * @param {object} data
 * @param {Array<object>} ordersData
 */
async function handleShippingSave(data, ordersData) {
    const checkboxes = document.querySelectorAll('input[name="shippingProductKeys"]');

    // Collect shipped and not-shipped products
    const shippedProducts = [];
    const notShippedProducts = [];

    checkboxes.forEach(cb => {
        const productName = cb.getAttribute('data-product-name') || cb.value;
        if (cb.checked) {
            shippedProducts.push(productName);
        } else {
            notShippedProducts.push(productName);
        }
    });

    // Build HTML for confirmation dialog
    let htmlContent = '<div style="text-align: right; direction: rtl;">';

    // Shipped products section
    if (shippedProducts.length > 0) {
        htmlContent += '<div style="margin-bottom: 20px;">';
        htmlContent += '<h3 style="color: #00d4ff; margin-bottom: 10px;">📦 المنتجات المشحونة (' + shippedProducts.length + '):</h3>';
        htmlContent += '<ul style="list-style: none; padding: 0;">';
        shippedProducts.forEach(name => {
            htmlContent += '<li style="padding: 5px; background: #d1f2ff; margin: 3px 0; border-radius: 3px;">• ' + name + '</li>';
        });
        htmlContent += '</ul></div>';
    }

    // Not shipped products section
    if (notShippedProducts.length > 0) {
        htmlContent += '<div style="margin-bottom: 20px;">';
        htmlContent += '<h3 style="color: #666; margin-bottom: 10px;">⏸️ المنتجات غير المشحونة (' + notShippedProducts.length + '):</h3>';
        htmlContent += '<ul style="list-style: none; padding: 0;">';
        notShippedProducts.forEach(name => {
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
        confirmButtonColor: '#00d4ff',
        cancelButtonColor: '#6c757d',
        customClass: { popup: 'fullscreen-swal' },
        allowOutsideClick: false
    }).then(async (result) => {
        if (result.isConfirmed) {
            // User confirmed, proceed with saving
            const updates = [];

            checkboxes.forEach(cb => {
                if (!cb.disabled) {
                    const currentStatus = loadItemStatus(cb.value);
                    const shouldBeShipped = cb.checked;

                    if (shouldBeShipped && currentStatus === ITEM_STATUS.CONFIRMED) {
                        updates.push({ key: cb.value, status: ITEM_STATUS.SHIPPED });
                    } else if (!shouldBeShipped && currentStatus === ITEM_STATUS.SHIPPED) {
                        updates.push({ key: cb.value, status: ITEM_STATUS.CONFIRMED });
                    }
                }
            });

            if (updates.length > 0) {
                // Show loading
                Swal.fire({
                    title: 'جاري الحفظ...',
                    text: 'يتم حفظ الشحن والقفل...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                try {
                    // Save items first
                    await Promise.all(updates.map(u => saveItemStatus(u.key, u.status)));

                    // Then Lock using Seller/Courier ID
                    if (ordersData && ordersData.length > 0) {
                        const orderKey = ordersData[0].order_key;
                        const userId = data.currentUser.idUser;
                        await saveShippingLock(orderKey, true, ordersData, userId);
                        console.log('[SellerPopups] Shipping permanently locked for order:', orderKey, 'User:', userId);
                    }

                    Swal.fire({
                        icon: 'success',
                        title: 'تم الحفظ بنجاح',
                        text: 'تم حفظ الشحن بشكل نهائي.',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(async () => {
                        updateCurrentStepFromState(data, ordersData);

                        // [Notifications] Dispatch Notifications (Buyer Only)
                        if (typeof window.notifyBuyerOnStepChange === 'function' && typeof window.shouldNotify === 'function') {
                            const metadata = extractNotificationMetadata(ordersData, data);
                            const shouldSend = await window.shouldNotify('step-shipped', 'buyer');

                            if (shouldSend) {
                                window.notifyBuyerOnStepChange(
                                    metadata.buyerKey,
                                    'step-shipped',
                                    'شحن الطلب',
                                    metadata.orderId
                                );
                            }
                        }
                    });
                } catch (error) {
                    console.error("Save failed", error);
                    Swal.fire({
                        icon: 'error',
                        title: 'فشل الحفظ',
                        text: 'حدث خطأ أثناء الاتصال بالسيرفر.',
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
 * Displays a popup for the seller to confirm product availability.
 * Checks lock status first - sellers cannot edit if locked, admins can override.
 * @function showSellerConfirmationProductsAlert
 * @param {object} data - Control Data.
 * @param {Array<object>} ordersData - Orders Data.
 */
export function showSellerConfirmationProductsAlert(data, ordersData) {
    try {
        const products = getConfirmationProducts(ordersData, data.currentUser.idUser, data.currentUser.type);
        const htmlContent = generateConfirmationTableHtml(products, ordersData);

        // Check lock status from local ordersData using Seller ID
        let isLocked = false;
        if (ordersData && ordersData.length > 0) {
            const orderKey = ordersData[0].order_key;
            // Admin checks "Lock" is ambiguous? Admin overrides anyway.
            // Seller checks THEIR OWN lock.
            // If user is admin, lock is irrelevant effectively, but let's check for display purposes?
            // Actually, if we pass admin ID, it won't find a lock for "admin_id" probably.
            // But logic below says `canEdit = userType === 'admin' || !isLocked`.
            // So if Admin, isLocked is ignored.
            // If Seller, checks their specific lock.
            isLocked = getConfirmationLockStatus(ordersData, orderKey, data.currentUser.idUser);
        }

        // Determine if editing is allowed
        const userType = data.currentUser.type;
        const canEdit = userType === 'admin' || !isLocked;

        console.log(`[SellerPopups] Opening confirmation | User: ${userType} | Locked: ${isLocked} | CanEdit: ${canEdit}`);

        Swal.fire({
            title: canEdit ? "تأكيد المنتجات" : "تأكيد المنتجات (قراءة فقط)",
            html: `<div id="seller-confirmation-container" style="display: flex; flex-direction: column; align-items: start; width: 100%; max-height: 300px; overflow: auto;">
                    ${htmlContent}
                   </div>`,
            footer: canEdit
                ? '<button id="btn-save-confirmation" class="swal2-confirm swal2-styled" style="background-color: #28a745;">حفظ التغييرات</button>'
                : '<p style="color: #dc3545; font-weight: bold; margin: 10px 0;">🔒 تم قفل التأكيد بشكل دائم - لا يمكن التعديل</p>',
            cancelButtonText: "إغلاق",
            showConfirmButton: false,
            showCancelButton: true,
            focusConfirm: false,
            allowOutsideClick: true,
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();

                if (canEdit) {
                    document.getElementById('btn-save-confirmation')?.addEventListener('click', () => {
                        handleConfirmationSave(data, ordersData);
                    });
                } else {
                    // Disable all inputs for locked view
                    const container = document.getElementById('seller-confirmation-container');
                    if (container) {
                        const inputs = container.querySelectorAll('input, textarea, select, button.btn-show-key');
                        // Keep show-product buttons enabled but disable checkboxes
                        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                            checkbox.disabled = true;
                        });
                    }
                }
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
            html: `<div id="seller-rejected-container">${htmlContent}</div>`,
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
 * Checks lock status first - sellers cannot edit if locked, admins can override.
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

        // Check lock status from local ordersData using User ID
        let isLocked = false;
        if (ordersData && ordersData.length > 0) {
            const orderKey = ordersData[0].order_key;
            const userId = data.currentUser.idUser;
            isLocked = getShippingLockStatus(ordersData, orderKey, userId);
        }

        // Determine if editing is allowed
        const userType = data.currentUser.type;
        const canEdit = userType === 'admin' || !isLocked;

        console.log(`[SellerPopups] Opening shipping | User: ${userType} | Locked: ${isLocked} | CanEdit: ${canEdit}`);

        const htmlContent = generateShippingTableHtml(shippableProducts);

        Swal.fire({
            title: canEdit ? "شحن المنتجات" : "شحن المنتجات (قراءة فقط)",
            html: `<div id="seller-shipping-container">${htmlContent}</div>`,
            footer: canEdit
                ? '<button id="btn-save-shipping" class="swal2-confirm swal2-styled" style="background-color: #007bff;">تحديث حالة الشحن</button>'
                : '<p style="color: #dc3545; font-weight: bold; margin: 10px 0;">🔒 تم قفل الشحن بشكل دائم - لا يمكن التعديل</p>',
            confirmButtonText: "إغلاق",
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: "إغلاق",
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();

                if (canEdit) {
                    document.getElementById('btn-save-shipping')?.addEventListener('click', () => {
                        handleShippingSave(data, ordersData);
                    });
                } else {
                    // Disable all inputs for locked view
                    const container = document.getElementById('seller-shipping-container');
                    if (container) {
                        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                            checkbox.disabled = true;
                        });
                    }
                }
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

        let userInfoHtml = "";
        if (userType !== 'seller') {
            const userDetails = getUserDetailsForDelivery(productsToDeliver, ordersData);
            userInfoHtml = generateDeliveryUserInfoHtml(userDetails);
        }
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
