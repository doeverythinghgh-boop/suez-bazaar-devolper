/**
 * @file steper/sellerPopups/confirmation.js
 * @description Controller for the Confirmation Step in the Seller workflow.
 */

import { ITEM_STATUS } from "../config.js";
import { loadItemStatus, saveItemStatus } from "../stateManagement.js";
import { updateCurrentStepFromState } from "../uiUpdates.js";
import { saveConfirmationLock, getConfirmationLockStatus } from "../dataFetchers.js";
import { getConfirmationProducts } from "../sellerLogic.js";
import { generateConfirmationTableHtml } from "../sellerUi.js";
import { extractNotificationMetadata, extractRelevantSellerKeys, extractRelevantDeliveryKeys } from "../steperNotificationLogic.js";
import { attachLogButtonListeners } from "./utils.js";

/**
 * Handles the save action for confirmation.
 * Shows a confirmation dialog before permanently saving changes.
 * @function handleConfirmationSave
 * @param {object} data
 * @param {Array<object>} ordersData
 */
export function handleConfirmationSave(data, ordersData) {
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
        htmlContent += '<h3 style="color: var(--color-confirmed); margin-bottom: 10px; font-size: 1.1em;">' + window.langu('conf_accepted_products').replace('{count}', acceptedProducts.length) + '</h3>';
        htmlContent += '<ul style="list-style: none; padding: 0;">';
        acceptedProducts.forEach(name => {
            htmlContent += '<li style="padding: 5px; background: var(--bg-success); margin: 3px 0; border-radius: 3px; color: var(--text-success);">• ' + name + '</li>';
        });
        htmlContent += '</ul></div>';
    }

    // Rejected products section
    if (rejectedProducts.length > 0) {
        htmlContent += '<div style="margin-bottom: 20px;">';
        htmlContent += '<h3 style="color: var(--color-rejected); margin-bottom: 10px; font-size: 1.1em;">' + window.langu('conf_rejected_products').replace('{count}', rejectedProducts.length) + '</h3>';
        htmlContent += '<ul style="list-style: none; padding: 0;">';
        rejectedProducts.forEach(name => {
            htmlContent += '<li style="padding: 5px; background: var(--bg-danger); margin: 3px 0; border-radius: 3px; color: var(--text-danger);">• ' + name + '</li>';
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
                    title: window.langu('shipping_saving_title'),
                    text: window.langu('conf_saving_text'),
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

                    // Then Lock using Seller ID
                    if (ordersData && ordersData.length > 0) {
                        const orderKey = ordersData[0].order_key;
                        const sellerId = data.currentUser.idUser; // Identify current seller
                        await saveConfirmationLock(orderKey, true, ordersData, sellerId);
                    }

                    Swal.fire({
                        title: window.langu('shipping_save_success_title'),
                        text: window.langu('conf_save_success_text'),
                        timer: 1500,
                        showConfirmButton: false,
                        buttonsStyling: false,
                        customClass: {
                            popup: 'swal-modern-mini-popup',
                            title: 'swal-modern-mini-title',
                            htmlContainer: 'swal-modern-mini-text'
                        }
                    }).then(async () => {
                        console.log('[Dev] 🟢 Executing Post-Save Success Block (Confirmation)');
                        console.log('[Dev] Checks: notifyOnStepActivation is', typeof window.notifyOnStepActivation);

                        try {
                            updateCurrentStepFromState(data, ordersData);
                        } catch (e) {
                            console.error('[Dev] 🔴 Error in updateCurrentStepFromState:', e);
                        }

                        // [Notifications] Dispatch Notifications
                        const metadata = extractNotificationMetadata(ordersData, data);
                        const relevantSellers = extractRelevantSellerKeys(updates, ordersData);
                        const relevantDelivery = extractRelevantDeliveryKeys(updates, ordersData);

                        // Filter out current user from notification targets
                        const actingUserId = String(data.currentUser.idUser);
                        const actingUserRole = data.currentUser.type;
                        const sellersToNotify = relevantSellers.filter(s => String(s) !== actingUserId);
                        const deliveryToNotify = relevantDelivery.filter(d => String(d) !== actingUserId);

                        console.log(`%c[SteperNotification] 🚀 بدء خطوة إشعارات "التأكيد" (Confirmation)`, 'color: #adff2f; font-weight: bold; font-size: 1.1em;');
                        console.log(`[SteperNotification] 👤 القائم بالحدث (Acting User): ${actingUserId} (Role: ${actingUserRole})`);
                        console.log(`[SteperNotification] 📋 تفاصيل الأطراف المعنية (بدون تصفية):`, { relevantSellers, relevantDelivery });

                        const notificationPromises = [];

                        // 1. Notify Buyer
                        if (typeof window.notifyBuyerOnStepChange === 'function' && typeof window.shouldNotify === 'function') {
                            console.log(`[SteperNotification] 🔍 [1/3] فحص إمكانية إشعار المشتري (Buyer)...`);
                            const shouldSendBuyer = await window.shouldNotify('step-confirmed', 'buyer');

                            if (shouldSendBuyer) {
                                console.log(`[SteperNotification] ✅ الإشعار للمشتري "مفعل" في الإعدادات. جارٍ الإرسال إلى: ${metadata.buyerKey}`);
                                notificationPromises.push(window.notifyBuyerOnStepChange(
                                    metadata.buyerKey,
                                    'step-confirmed',
                                    window.langu('confirmation_notify_buyer'),
                                    metadata.orderId
                                ));
                            } else {
                                console.log(`[SteperNotification] ⚠️ الإشعار للمشتري "معطل" في الإعدادات.`);
                            }
                        }

                        // 2. Notify Delivery & Other Sellers (Peers)
                        if (typeof window.notifyOnStepActivation === 'function') {
                            console.log(`[SteperNotification] � [2/3] فحص إمكانية إشعار البائعين وخدمات التوصيل (Sellers/Delivery)...`);

                            console.log(`[SteperNotification] 📨 توجيه طلب الإرسال الجماعي (General Dispatch)...`);
                            console.log(`[SteperNotification] 🎯 المستهدفون النهائيون (البائعين): [${sellersToNotify.join(', ')}]`);
                            console.log(`[SteperNotification] 🎯 المستهدفون النهائيون (التوصيل): [${deliveryToNotify.join(', ')}]`);

                            notificationPromises.push(window.notifyOnStepActivation({
                                stepId: 'step-confirmed',
                                stepName: window.langu('conf_notify_confirmed'),
                                ...metadata,
                                sellerKeys: sellersToNotify,
                                deliveryKeys: deliveryToNotify,
                                actingUserId: actingUserId
                            }));

                            // 3. Rejected Items Check
                            const hasRejected = updates.some(u => u.status === ITEM_STATUS.REJECTED);
                            if (hasRejected) {
                                console.log(`[SteperNotification] � [3/3] تم اكتشاف منتجات مرفوضة. بدء إشعارات الرفض (step-rejected)...`);
                                notificationPromises.push(window.notifyOnStepActivation({
                                    stepId: 'step-rejected',
                                    stepName: window.langu('conf_notify_rejected'),
                                    ...metadata,
                                    sellerKeys: sellersToNotify,
                                    deliveryKeys: deliveryToNotify,
                                    actingUserId: actingUserId
                                }));
                            } else {
                                console.log(`[SteperNotification] ℹ️ لا توجد منتجات مرفوضة في هذا التحديث.`);
                            }
                        }

                        await Promise.all(notificationPromises);
                        console.log(`%c[SteperNotification] 🏁 انتهت عملية إشعارات التأكيد بنجاح.`, 'color: #adff2f; font-weight: bold;');
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
            isLocked = getConfirmationLockStatus(ordersData, orderKey, data.currentUser.idUser);
        }

        // Determine if editing is allowed
        const userType = data.currentUser.type;
        const canEdit = userType === 'admin' || !isLocked;

        Swal.fire({
            title: canEdit ? window.langu('conf_modal_title') : window.langu('conf_modal_readonly_title'),
            html: `<div id="seller-confirmation-container" style="display: flex; flex-direction: column; align-items: start; width: 100%; max-height: 300px; overflow: auto;">
                    ${htmlContent}
                   </div>`,
            footer: canEdit
                ? `<button id="btn-save-confirmation" class="swal2-confirm swal2-styled" style="background-color: #28a745;">${window.langu('conf_save_btn')}</button>`
                : `<p style="color: #dc3545; font-weight: bold; margin: 10px 0;">${window.langu('conf_locked_info')}</p>`,
            cancelButtonText: window.langu('alert_close_btn'),
            showConfirmButton: false,
            showCancelButton: true,
            focusConfirm: false,
            allowOutsideClick: true,
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
                    document.getElementById('btn-save-confirmation')?.addEventListener('click', () => {
                        handleConfirmationSave(data, ordersData);
                    });
                } else {
                    // Disable all inputs for locked view
                    const container = document.getElementById('seller-confirmation-container');
                    if (container) {
                        const inputs = container.querySelectorAll('input, textarea, select, button.btn-show-key');
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
