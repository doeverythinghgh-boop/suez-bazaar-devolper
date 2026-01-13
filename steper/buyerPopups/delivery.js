/**
 * @file steper/buyerPopups/delivery.js
 * @description Controller for the Delivery Step in the Buyer workflow.
 */

import { ITEM_STATUS } from "../config.js";
import { loadItemStatus, saveItemStatus } from "../stateManagement.js";
import { updateCurrentStepFromState } from "../uiUpdates.js";
import { saveDeliveryLock, getDeliveryLockStatus } from "../dataFetchers.js";
import { getDeliveryProducts, getUserDetailsForDelivery } from "../buyerLogic.js";
import { generateDeliveryUserInfoHtml, generateDeliveryItemsHtml } from "../buyerUi.js";
import { extractNotificationMetadata, extractRelevantSellerKeys, extractRelevantDeliveryKeys } from "../steperNotificationLogic.js";
import { attachLogButtonListeners } from "./utils.js";

/**
 * Handles saving delivery confirmation.
 * Shows confirmation dialog before permanently locking.
 * @function handleDeliverySave
 * @param {object} data
 * @param {Array<object>} ordersData
 */
export async function handleDeliverySave(data, ordersData) {
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
        htmlContent += '<h3 style="color: var(--color-delivered); margin-bottom: 10px; font-size: 1.1em;">' + window.langu('deliv_received_products').replace('{count}', deliveredProducts.length) + '</h3>';
        htmlContent += '<ul style="list-style: none; padding: 0;">';
        deliveredProducts.forEach(name => {
            htmlContent += '<li style="padding: 5px; background: var(--bg-success); margin: 3px 0; border-radius: 3px; color: var(--text-success);">• ' + name + '</li>';
        });
        htmlContent += '</ul></div>';
    }

    // Not delivered products section
    if (notDeliveredProducts.length > 0) {
        htmlContent += '<div style="margin-bottom: 20px;">';
        htmlContent += '<h3 style="color: var(--text-secondary); margin-bottom: 10px; font-size: 1.1em;">' + window.langu('deliv_not_received_products').replace('{count}', notDeliveredProducts.length) + '</h3>';
        htmlContent += '<ul style="list-style: none; padding: 0;">';
        notDeliveredProducts.forEach(name => {
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
                    title: window.langu('shipping_saving_title'),
                    text: window.langu('deliv_saving_text'),
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

                    // Then Lock using Buyer/Courier ID
                    if (ordersData && ordersData.length > 0) {
                        const orderKey = ordersData[0].order_key;
                        const userId = data.currentUser.idUser;
                        await saveShippingLock(orderKey, true, ordersData, userId);
                    }

                    Swal.fire({
                        title: window.langu('shipping_save_success_title'),
                        text: window.langu('deliv_save_success_text'),
                        timer: 1500,
                        showConfirmButton: false,
                        buttonsStyling: false,
                        customClass: {
                            popup: 'swal-modern-mini-popup',
                            title: 'swal-modern-mini-title',
                            htmlContainer: 'swal-modern-mini-text'
                        }
                    }).then(() => {
                        updateCurrentStepFromState(data, ordersData);

                        // [Notifications] Dispatch Notifications
                        if (typeof window.notifyOnStepActivation === 'function') {
                            const relevantSellers = extractRelevantSellerKeys(updates, ordersData);
                            const relevantDelivery = extractRelevantDeliveryKeys(updates, ordersData);

                            // [Reliability] Filter out current user from notifications
                            const actingUserId = String(data.currentUser.idUser);
                            const sellersToNotify = relevantSellers.filter(s => String(s) !== actingUserId);
                            const deliveryToNotify = relevantDelivery.filter(d => String(d) !== actingUserId);

                            window.notifyOnStepActivation({
                                stepId: 'step-delivered',
                                stepName: window.langu('deliv_notify_received'),
                                ...metadata,
                                sellerKeys: sellersToNotify,
                                deliveryKeys: deliveryToNotify
                            });
                        }
                    });
                } catch (error) {
                    console.error("Save failed", error);
                    Swal.fire({
                        title: window.langu('stepper_save_fail_title'),
                        text: window.langu('review_save_fail_text'),
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
                title: window.langu('deliv_no_products_title'),
                text: window.langu('deliv_no_products_desc'),
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

        // Check lock status from local ordersData using User ID
        let isLocked = false;
        if (ordersData && ordersData.length > 0) {
            const orderKey = ordersData[0].order_key;
            isLocked = getDeliveryLockStatus(ordersData, orderKey, userId);
        }

        // Determine if editing is allowed
        const canEdit = userType === 'admin' || !isLocked;

        const userDetails = getUserDetailsForDelivery(productsToDeliver, ordersData);
        const userInfoHtml = generateDeliveryUserInfoHtml(userDetails);
        const checkboxesHtml = generateDeliveryItemsHtml(productsToDeliver);

        Swal.fire({
            title: canEdit ? window.langu('deliv_modal_title') : window.langu('deliv_modal_readonly_title'),
            html: `<div id="delivery-confirmation-container" style="display: flex; flex-direction: column; align-items: start; width: 100%;">
                    ${userInfoHtml}
                    ${checkboxesHtml}
                   </div>`,
            footer: canEdit
                ? `<button id="btn-save-delivery" class="swal2-confirm swal2-styled" style="background-color: #28a745;">${window.langu('deliv_save_btn')}</button>`
                : `<p style="color: #dc3545; font-weight: bold; margin: 10px 0;">${window.langu('deliv_locked_info')}</p>`,
            cancelButtonText: window.langu('alert_close_btn'),
            showConfirmButton: false,
            showCancelButton: true,
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

                // إضافة مستمع لحدث النقر على زر خريطة المشتري
                const popup = Swal.getPopup();
                popup.querySelectorAll('.btn-view-buyer-map').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const lat = btn.dataset.lat;
                        const lng = btn.dataset.lng;

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
            },
        });
    } catch (error) {
        console.error("Error in showDeliveryConfirmationAlert:", error);
    }
}
