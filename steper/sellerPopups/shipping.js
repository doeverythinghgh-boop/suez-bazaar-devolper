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
        htmlContent += '<h3 style="color: var(--color-shipped); margin-bottom: 10px; font-size: 1.1em;">' + window.langu('shipping_shipped_products').replace('{count}', shippedProducts.length) + '</h3>';
        htmlContent += '<ul style="list-style: none; padding: 0;">';
        shippedProducts.forEach(name => {
            htmlContent += '<li style="padding: 5px; background: var(--bg-info); margin: 3px 0; border-radius: 3px; color: var(--text-info);">• ' + name + '</li>';
        });
        htmlContent += '</ul></div>';
    }

    // Not shipped products section
    if (notShippedProducts.length > 0) {
        htmlContent += '<div style="margin-bottom: 20px;">';
        htmlContent += '<h3 style="color: var(--text-secondary); margin-bottom: 10px; font-size: 1.1em;">' + window.langu('shipping_not_shipped_products').replace('{count}', notShippedProducts.length) + '</h3>';
        htmlContent += '<ul style="list-style: none; padding: 0;">';
        notShippedProducts.forEach(name => {
            htmlContent += '<li style="padding: 5px; background: var(--bg-neutral); margin: 3px 0; border-radius: 3px; color: var(--text-neutral);">• ' + name + '</li>';
        });
        htmlContent += '</ul></div>';
    }

    // Warning message
    htmlContent += '<div style="background: var(--bg-warning); border: 2px solid var(--border-warning); padding: 15px; border-radius: 5px; margin-top: 15px;">';
    htmlContent += '<p style="margin: 0; font-weight: bold; color: var(--text-warning);">' + window.langu('shipping_warning_title') + '</p>';
    htmlContent += '<p style="margin: 5px 0 0 0; color: var(--text-warning);">' + window.langu('shipping_warning_text') + '</p>';
    htmlContent += '</div>';

    htmlContent += '</div>';

    // Show confirmation dialog
    Swal.fire({
        title: window.langu('shipping_confirm_save_title'),
        html: htmlContent,
        showCancelButton: true,
        confirmButtonText: window.langu('shipping_confirm_save_btn'),
        cancelButtonText: window.langu('alert_cancel_btn'),
        buttonsStyling: false,
        customClass: {
            popup: 'swal-modern-mini-popup',
            title: 'swal-modern-mini-title',
            htmlContainer: 'swal-modern-mini-text',
            confirmButton: 'swal-modern-mini-confirm',
            cancelButton: 'swal-modern-mini-cancel'
        },
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
                    title: window.langu('shipping_saving_title'),
                    text: window.langu('shipping_saving_text'),
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading(),
                    buttonsStyling: false,
                    customClass: {
                        popup: 'swal-modern-mini-popup',
                        title: 'swal-modern-mini-title',
                        htmlContainer: 'swal-modern-mini-text'
                    }
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
                        title: window.langu('shipping_save_success_title'),
                        text: window.langu('shipping_save_success_text'),
                        timer: 1500,
                        showConfirmButton: false,
                        buttonsStyling: false,
                        customClass: {
                            popup: 'swal-modern-mini-popup',
                            title: 'swal-modern-mini-title',
                            htmlContainer: 'swal-modern-mini-text'
                        }
                    }).then(async () => {
                        updateCurrentStepFromState(data, ordersData);

                        const metadata = extractNotificationMetadata(ordersData, data);
                        const relevantDelivery = extractRelevantDeliveryKeys(updates, ordersData);

                        // Filter out current user
                        const actingUserId = String(data.currentUser.idUser);
                        const deliveryToNotify = relevantDelivery.filter(d => String(d) !== actingUserId);

                        // [Notifications] Dispatch Notifications (Buyer + Relevant Delivery)
                        console.log(`%c[SteperNotification] 🚀 بدء خطوة إشعارات "الشحن" (Shipping)`, 'color: #00bfff; font-weight: bold; font-size: 1.1em;');

                        const metadata = extractNotificationMetadata(ordersData, data);
                        const relevantDelivery = extractRelevantDeliveryKeys(updates, ordersData);

                        // Filter out current user from delivery
                        const actingUserId = String(data.currentUser.idUser);
                        const actingUserRole = data.currentUser.type;
                        const deliveryToNotify = relevantDelivery.filter(d => String(d) !== actingUserId);

                        console.log(`[SteperNotification] 👤 القائم بالحدث (Acting User): ${actingUserId} (Role: ${actingUserRole})`);

                        const notificationPromises = [];

                        // 1. Notify Buyer
                        if (typeof window.notifyBuyerOnStepChange === 'function' && typeof window.shouldNotify === 'function') {
                            console.log(`[SteperNotification] 🔍 [1/2] فحص إمكانية إشعار المشتري (Buyer)...`);
                            const shouldSendBuyer = await window.shouldNotify('step-shipped', 'buyer');

                            if (shouldSendBuyer) {
                                console.log(`[SteperNotification] ✅ الإشعار للمشتري "مفعل". جارٍ الإرسال إلى: ${metadata.buyerKey}`);
                                notificationPromises.push(window.notifyBuyerOnStepChange(
                                    metadata.buyerKey,
                                    'step-shipped',
                                    window.langu('shipping_notify_buyer'),
                                    metadata.orderId
                                ));
                            } else {
                                console.log(`[SteperNotification] ⚠️ الإشعار للمشتري "معطل" في الإعدادات.`);
                            }
                        }

                        // 2. Notify Delivery (Targeted)
                        if (deliveryToNotify.length > 0 && typeof window.notifyOnStepActivation === 'function') {
                            console.log(`[SteperNotification] 🔍 [2/2] فحص إمكانية إشعار خدمات التوصيل (Delivery)...`);
                            console.log(`[SteperNotification] 📨 توجيه طلب الإشعار لتطبيقات التوصيل...`);
                            console.log(`[SteperNotification] 🎯 المستهدفون النهائيون (التوصيل): [${deliveryToNotify.join(', ')}]`);

                            notificationPromises.push(window.notifyOnStepActivation({
                                stepId: 'step-shipped',
                                stepName: window.langu('shipping_notify_buyer'),
                                ...metadata,
                                sellerKeys: [], // No need to notify other sellers of shipping normally
                                deliveryKeys: deliveryToNotify,
                                actingUserId: actingUserId
                            }));
                        } else {
                            console.log(`[SteperNotification] ℹ️ لا توجد جهات توصيل مستهدفة لهذا الطلب (أو أن القائم بالحدث هو المندوب الوحيد).`);
                        }

                        await Promise.all(notificationPromises);
                        console.log(`%c[SteperNotification] 🏁 انتهت عملية إشعارات الشحن بنجاح.`, 'color: #00bfff; font-weight: bold;');
                    });
                } catch (error) {
                    console.error("Save failed", error);
                    Swal.fire({
                        title: window.langu('stepper_save_fail_title'),
                        text: window.langu('shipping_save_fail_text'),
                        confirmButtonText: window.langu('alert_confirm_btn'),
                        buttonsStyling: false,
                        customClass: {
                            popup: 'swal-modern-mini-popup',
                            title: 'swal-modern-mini-title',
                            htmlContainer: 'swal-modern-mini-text',
                            confirmButton: 'swal-modern-mini-confirm'
                        }
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
                title: window.langu('shipping_no_products_title'),
                text: window.langu('shipping_no_products_desc'),
                confirmButtonText: window.langu('alert_confirm_btn'),
                buttonsStyling: false,
                customClass: {
                    popup: 'swal-modern-mini-popup',
                    title: 'swal-modern-mini-title',
                    htmlContainer: 'swal-modern-mini-text',
                    confirmButton: 'swal-modern-mini-confirm'
                }
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
            title: canEdit ? window.langu('shipping_modal_title') : window.langu('shipping_modal_readonly_title'),
            html: `<div id="seller-shipping-container">${htmlContent}</div>`,
            footer: canEdit
                ? `<button id="btn-save-shipping" class="swal2-confirm swal2-styled" style="background-color: #007bff;">${window.langu('shipping_update_btn')}</button>`
                : `<p style="color: #dc3545; font-weight: bold; margin: 10px 0;">${window.langu('shipping_locked_info')}</p>`,
            confirmButtonText: window.langu('alert_close_btn'),
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: window.langu('alert_close_btn'),
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text',
                confirmButton: 'swal-modern-mini-confirm',
                cancelButton: 'swal-modern-mini-cancel'
            },
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
