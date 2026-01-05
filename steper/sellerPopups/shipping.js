/**
 * @file steper/sellerPopups/shipping.js
 * @description Controller for the Shipping Step in the Seller workflow.
 */

import { ITEM_STATUS } from "../config.js";
import { loadItemStatus, saveItemStatus } from "../stateManagement.js";
import { updateCurrentStepFromState } from "../uiUpdates.js";
import { saveShippingLock, getShippingLockStatus } from "../dataFetchers.js";
import { getShippableProducts } from "../sellerLogic.js";
import { generateShippingTableHtml } from "../sellerUi.js";
import { extractNotificationMetadata, extractRelevantDeliveryKeys } from "../steperNotificationLogic.js";
import { attachLogButtonListeners } from "./utils.js";

/**
 * Handles the save action for shipping updates.
 * Shows confirmation dialog before permanently locking.
 * @function handleShippingSave
 * @param {object} data
 * @param {Array<object>} ordersData
 */
export async function handleShippingSave(data, ordersData) {
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
        htmlContent += '<h3 style="color: var(--color-shipped); margin-bottom: 10px; font-size: 1.1em;">📦 المنتجات المشحونة (' + shippedProducts.length + '):</h3>';
        htmlContent += '<ul style="list-style: none; padding: 0;">';
        shippedProducts.forEach(name => {
            htmlContent += '<li class="stepper-list-item-info">• ' + name + '</li>';
        });
        htmlContent += '</ul></div>';
    }

    // Not shipped products section
    if (notShippedProducts.length > 0) {
        htmlContent += '<div style="margin-bottom: 20px;">';
        htmlContent += '<h3 style="color: var(--text-secondary); margin-bottom: 10px; font-size: 1.1em;">⏸️ المنتجات غير المشحونة (' + notShippedProducts.length + '):</h3>';
        htmlContent += '<ul style="list-style: none; padding: 0;">';
        notShippedProducts.forEach(name => {
            htmlContent += '<li class="stepper-list-item-neutral">• ' + name + '</li>';
        });
        htmlContent += '</ul></div>';
    }

    // Warning message
    htmlContent += '<div class="stepper-alert-warning">';
    htmlContent += '<p style="margin: 0; font-weight: bold;">⚠️ تحذير هام:</p>';
    htmlContent += '<p style="margin: 5px 0 0 0;">بعد الضغط على "تأكيد الحفظ"، لن تتمكن من التعديل مرة أخرى. هذا الإجراء نهائي ولا يمكن التراجع عنه.</p>';
    htmlContent += '</div>';

    htmlContent += '</div>';

    // Show confirmation dialog
    Swal.fire({
        title: 'تأكيد الحفظ النهائي',
        html: htmlContent,
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
                        title: 'تم الحفظ بنجاح',
                        text: 'تم حفظ الشحن بشكل نهائي.',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(async () => {
                        updateCurrentStepFromState(data, ordersData);

                        const metadata = extractNotificationMetadata(ordersData, data);
                        const relevantDelivery = extractRelevantDeliveryKeys(updates, ordersData);

                        // Filter out current user
                        const actingUserId = data.currentUser.idUser;
                        const deliveryToNotify = relevantDelivery.filter(d => d !== actingUserId);

                        // [Notifications] Dispatch Notifications (Buyer + Relevant Delivery)
                        const notificationPromises = [];

                        // 1. Notify Buyer
                        if (typeof window.notifyBuyerOnStepChange === 'function' && typeof window.shouldNotify === 'function') {
                            const shouldSendBuyer = await window.shouldNotify('step-shipped', 'buyer');
                            if (shouldSendBuyer) {
                                notificationPromises.push(window.notifyBuyerOnStepChange(
                                    metadata.buyerKey,
                                    'step-shipped',
                                    'شحن الطلب',
                                    metadata.orderId
                                ));
                            }
                        }

                        // 2. Notify Delivery (Targeted)
                        if (deliveryToNotify.length > 0 && typeof window.notifyOnStepActivation === 'function') {
                            notificationPromises.push(window.notifyOnStepActivation({
                                stepId: 'step-shipped',
                                stepName: 'شحن الطلب',
                                ...metadata,
                                sellerKeys: [], // No need to notify other sellers of shipping normally
                                deliveryKeys: deliveryToNotify
                            }));
                        }

                        await Promise.all(notificationPromises);
                    });
                } catch (error) {
                    console.error("Save failed", error);
                    Swal.fire({
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
