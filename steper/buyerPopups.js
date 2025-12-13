/**
 * @file buyerPopups.js
 * @description Buyer Popups Module.
 * This file contains all functions responsible for displaying buyer-specific modals.
 * These popups include:
 * - Reviewing and selecting products.
 * - Viewing cancelled products.
 * - Confirming product receipt (Delivery).
 * - Viewing returned products.
 */

import {
    saveStepState,
    loadStepState,
    saveItemStatus,
    loadItemStatus,
    ITEM_STATUS
} from "./stateManagement.js";
import { determineCurrentStepId } from "./roleAndStepDetermination.js";
import {
    updateCurrentStepFromState
    // createStepStatusFooter -- We will implement custom footers
} from "./uiUpdates.js";
// import { addStatusToggleListener } from "./popupHelpers.js"; -- Not used for granular control

/**
 * Helper to get product name from orders data.
 * @function getProductName
 * @param {string} productKey
 * @param {Array<object>} ordersData
 * @returns {string}
 */
function getProductName(productKey, ordersData) {
    for (const order of ordersData) {
        const item = order.order_items.find(i => i.product_key === productKey);
        if (item) return item.product_name;
    }
    return productKey; // Fallback
}

/**
 * Helper to attach log button listeners
 * @function attachLogButtonListeners
 * @returns {void}
 */
function attachLogButtonListeners() {
    document.querySelectorAll('.btn-show-key').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent toggling the checkbox/row
            console.log('Product Key (Button):', button.dataset.key);
            localStorage.setItem('productKeyFromStepReview', button.dataset.key);
        });
    });
}

/**
 * @function showProductKeysAlert
 * @description Displays a popup for the buyer to review products and select what they want to order.
 * This updates the status of items to 'cancelled' if deselected.
 *
 * @param {object} data - Control Data.
 * @param {Array<object>} ordersData - Orders Data.
 * @param {boolean} isModificationLocked - Is modification locked.
 * @returns {void}
 */
export function showProductKeysAlert(data, ordersData, isModificationLocked) {
    try {
        const userId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        // 1. Determine products to display based on user type
        let productKeys;
        if (userType === "buyer") {
            // Buyer sees their own products
            const currentUserOrders = ordersData.filter((order) => order.user_key === userId);
            productKeys = currentUserOrders.flatMap((order) => order.order_items.map((item) => item.product_key));
        } else if (userType === "seller") {
            // Seller sees products assigned to them
            productKeys = ordersData.flatMap((order) =>
                order.order_items.filter((item) => item.seller_key === userId).map((item) => item.product_key)
            );
        } else if (userType === "courier") {
            // Courier sees products assigned to them for delivery
            productKeys = ordersData.flatMap((order) =>
                order.order_items.filter((item) => {
                    const deliveryKey = item.supplier_delivery?.delivery_key;
                    if (!deliveryKey) return false;
                    if (Array.isArray(deliveryKey)) return deliveryKey.includes(userId);
                    return deliveryKey === userId;
                }).map((item) => item.product_key)
            );
        } else if (userType === "admin") {
            // Admin sees all products
            productKeys = ordersData.flatMap((order) => order.order_items.map((item) => item.product_key));
        } else {
            productKeys = [];
        }

        // Determine if UI is locked based on item status
        // If ANY item is beyond pending, we might want to lock interaction for safety, 
        // OR just disable specific items.
        // For simplicity, sticking to the passed lock flag + checking if item is confirmed/shipped.

        const isOverallLocked = isModificationLocked || (userType !== "buyer" && userType !== "admin");

        // Create HTML for checkboxes
        let checkboxes = productKeys.map((productKey) => {
            const productName = getProductName(productKey, ordersData);
            const status = loadItemStatus(productKey);

            // Check logic: Item is checked if it's NOT cancelled.
            const isChecked = status !== ITEM_STATUS.CANCELLED;

            // Disable if item has moved beyond pending
            const isItemLocked = isOverallLocked || (status !== ITEM_STATUS.PENDING && status !== ITEM_STATUS.CANCELLED);

            return `<div class="checkbox-item" id="review-item-${productKey}" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  <div style="display: flex; align-items: center;">
                    <input type="checkbox" id="review-checkbox-${productKey}" name="productKeys" value="${productKey}" 
                        ${isChecked ? "checked" : ""} 
                        ${isItemLocked ? "disabled" : ""}>
                    <label for="review-checkbox-${productKey}" style="margin-right: 8px;">${productName} <small>(${status})</small></label>
                  </div>
                  <button type="button" class="btn-show-key" data-key="${productKey}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px;">Product</button>
              </div>`;
        }).join("");

        // Display popup using SweetAlert2
        Swal.fire({
            title: isOverallLocked ? "View Products" : "Select Products:",
            html: `<div id="buyer-review-products-container" style="display: flex; flex-direction: column; align-items: start; width: 100%;">${checkboxes}</div>`,
            footer: isOverallLocked
                ? "View only - modifications restricted."
                : '<button id="btn-save-review" class="swal2-confirm swal2-styled" style="background-color: #28a745;">Save Selections</button>',
            cancelButtonText: "Close",
            focusConfirm: false,
            allowOutsideClick: !isOverallLocked,
            showConfirmButton: false,
            showCancelButton: true,
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();

                if (!isOverallLocked) {
                    const saveBtn = document.getElementById('btn-save-review');
                    if (saveBtn) {
                        saveBtn.addEventListener('click', () => {
                            const container = document.getElementById("buyer-review-products-container");
                            const checkboxes = container.querySelectorAll('input[name="productKeys"]');
                            let changed = false;

                            checkboxes.forEach(cb => {
                                if (!cb.disabled) {
                                    const newStatus = cb.checked ? ITEM_STATUS.PENDING : ITEM_STATUS.CANCELLED;
                                    const currentStatus = loadItemStatus(cb.value);
                                    if (currentStatus !== newStatus) {
                                        saveItemStatus(cb.value, newStatus);
                                        changed = true;
                                    }
                                }
                            });

                            if (changed) {
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Updated',
                                    text: 'Product selections updated.',
                                    timer: 1500,
                                    showConfirmButton: false
                                }).then(() => {
                                    updateCurrentStepFromState(data, ordersData);
                                });
                            } else {
                                Swal.close();
                            }
                        });
                    }
                }
            },
        });
    } catch (reviewAlertError) {
        console.error("Error in showProductKeysAlert:", reviewAlertError);
    }
}

/**
 * @function showUnselectedProductsAlert
 * @description Displays products cancelled (status = CANCELLED).
 */
export function showUnselectedProductsAlert(data, ordersData) {
    try {
        const userId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        // Find cancelled items
        // Filter based on visibility permissions
        const cancelledKeys = ordersData.flatMap(order =>
            order.order_items.filter(item => {
                // Check visibility
                const isOwner = userType === "admin" || (userType === "buyer" && order.user_key === userId) || (userType === "seller" && item.seller_key === sellerId);
                // Note: Courier usually doesn't care about cancelled items unless they were assigned? 
                // Simplified visibility check:
                if (userType === "buyer" && order.user_key !== userId) return false;
                if (userType === "seller" && item.seller_key !== userId) return false;

                const status = loadItemStatus(item.product_key);
                return status === ITEM_STATUS.CANCELLED;
            }).map(i => i.product_key)
        );

        let contentHtml;
        if (cancelledKeys.length > 0) {
            const itemsHtml = cancelledKeys
                .map((key) => {
                    const productName = getProductName(key, ordersData);
                    return `<li id="cancelled-item-${key}" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span>${productName}</span>
                         <button type="button" class="btn-show-key" data-key="${key}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px;">Product</button>
                    </li>`;
                })
                .join("");
            contentHtml = `<ul id="cancelled-products-list" style="text-align: right; margin-top: 1rem; padding-right: 2rem; width: 100%;">${itemsHtml}</ul>`;
        } else {
            contentHtml = '<p id="no-cancelled-items-message">No cancelled products.</p>';
        }

        Swal.fire({
            title: "Cancelled Products",
            html: contentHtml,
            icon: cancelledKeys.length > 0 ? "info" : "success",
            confirmButtonText: "Okay",
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();
            }
        });
    } catch (unselectedAlertError) {
        console.error("Error in showUnselectedProductsAlert:", unselectedAlertError);
    }
}

/**
 * @function showDeliveryConfirmationAlert
 * @description Displays a popup for the buyer to confirm receipt of products.
 * Shows products that are SHIPPED (ready for delivery) or DELIVERED.
 */
export function showDeliveryConfirmationAlert(data, ordersData) {
    try {
        const userId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        // Filter products: Must be SHIPPED or DELIVERED
        // If Buyer: All their shipped items
        // If Courier: Items they are delivering
        // If Admin: All

        const productsToDeliver = ordersData.flatMap(order =>
            order.order_items.filter(item => {
                const status = loadItemStatus(item.product_key);
                if (status !== ITEM_STATUS.SHIPPED && status !== ITEM_STATUS.DELIVERED) return false;

                if (userType === "buyer") return order.user_key === userId;
                if (userType === "courier") {
                    const dKey = item.supplier_delivery?.delivery_key;
                    if (Array.isArray(dKey)) return dKey.includes(userId);
                    return dKey === userId;
                }
                if (userType === "seller") return item.seller_key === userId; // Sellers can view too?
                return true; // Admin
            })
        );

        if (productsToDeliver.length === 0) {
            Swal.fire({
                title: "No products to confirm receipt for",
                text: "Waiting for products to be shipped.",
                icon: "info",
                confirmButtonText: "Okay",
                customClass: { popup: "fullscreen-swal" },
            });
            return;
        }

        const checkboxesHtml = productsToDeliver.map((item) => {
            const status = loadItemStatus(item.product_key);
            const isDelivered = status === ITEM_STATUS.DELIVERED;
            const productName = item.product_name;

            return `<div class="checkbox-item" id="delivery-item-${item.product_key}" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                          <div style="display: flex; align-items: center;">
                              <input type="checkbox" id="delivery-checkbox-${item.product_key}" name="deliveryProductKeys" value="${item.product_key}" 
                                ${isDelivered ? "checked" : ""} 
                                style="margin-right: 8px;">
                              <label for="delivery-checkbox-${item.product_key}">${productName}</label>
                          </div>
                          <button type="button" class="btn-show-key" data-key="${item.product_key}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px;">Product</button>
                      </div>`;
        }).join("");

        const currentStep = determineCurrentStepId(data);

        // Extract User Info (Unique buyers in this list)
        // ... (User info display logic similar to before, simplified)
        const userDetails = [];
        const seenUsers = new Set();
        productsToDeliver.forEach(item => {
            // We need to find the order for this item to get user info. 
            // Ideally we shouldn't iterate all orders again, but it's safe for small data.
            const parentOrder = ordersData.find(o => o.order_items.includes(item));
            if (parentOrder && !seenUsers.has(parentOrder.user_key)) {
                seenUsers.add(parentOrder.user_key);
                userDetails.push({
                    name: parentOrder.user_name || "N/A",
                    phone: parentOrder.user_phone || "N/A",
                    address: parentOrder.user_address || "N/A"
                });
            }
        });

        const userInfoHtml = userDetails.map(user => `
             <div class="user-details-container" style="margin-bottom: 15px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; width: 100%; text-align: right;">
                <p><strong>Name:</strong> ${user.name}</p>
                <p><strong>Phone:</strong> ${user.phone}</p>
                <p><strong>Address:</strong> ${user.address}</p>
            </div>
        `).join("");

        Swal.fire({
            title: "Confirm Product Receipt",
            html: `<div id="delivery-confirmation-container" style="display: flex; flex-direction: column; align-items: start; width: 100%;">
                    ${userInfoHtml}
                    ${checkboxesHtml}
                   </div>`,
            footer: '<button id="btn-save-delivery" class="swal2-confirm swal2-styled" style="background-color: #28a745;">Confirm Receipt</button>',
            cancelButtonText: "Cancel",
            showConfirmButton: false,
            showCancelButton: true,
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();
                document.getElementById('btn-save-delivery')?.addEventListener('click', () => {
                    const checkboxes = document.querySelectorAll('input[name="deliveryProductKeys"]');
                    let changed = false;
                    checkboxes.forEach(cb => {
                        const currentStatus = loadItemStatus(cb.value);
                        const isChecked = cb.checked;

                        if (isChecked && currentStatus === ITEM_STATUS.SHIPPED) {
                            saveItemStatus(cb.value, ITEM_STATUS.DELIVERED);
                            changed = true;
                        } else if (!isChecked && currentStatus === ITEM_STATUS.DELIVERED) {
                            saveItemStatus(cb.value, ITEM_STATUS.SHIPPED); // Undo delivery
                            changed = true;
                        }
                    });

                    if (changed) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Updated',
                            text: 'Delivery status updated.',
                            timer: 1500,
                            showConfirmButton: false
                        }).then(() => {
                            updateCurrentStepFromState(data, ordersData);
                        });
                    } else {
                        Swal.close();
                    }
                });
            },
        });
    } catch (deliveryAlertError) {
        console.error("Error in showDeliveryConfirmationAlert:", deliveryAlertError);
    }
}

/**
 * @function showReturnedProductsAlert
 * @description Displays products returned (status = RETURNED).
 */
export function showReturnedProductsAlert(data, ordersData) {
    try {
        const userId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        const returnedKeys = ordersData.flatMap(order =>
            order.order_items.filter(item => {
                // Visibility checks...
                const status = loadItemStatus(item.product_key);
                return status === ITEM_STATUS.RETURNED;
            }).map(i => i.product_key)
        );

        let contentHtml;
        if (returnedKeys.length > 0) {
            const itemsHtml = returnedKeys.map((key) => {
                const productName = getProductName(key, ordersData);
                return `<li id="returned-item-${key}" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span>${productName}</span>
                         <button type="button" class="btn-show-key" data-key="${key}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px;">Product</button>
                    </li>`;
            }).join("");
            contentHtml = `<div id="returned-products-container"><p>Returned products:</p><ul id="returned-products-list" style="text-align: right; margin-top: 1rem; padding-right: 2rem; width: 100%;">${itemsHtml}</ul></div>`;
        } else {
            contentHtml = '<p id="no-returned-items-message">No returned products.</p>';
        }

        Swal.fire({
            title: "Returned Products",
            html: contentHtml,
            icon: returnedKeys.length > 0 ? "warning" : "success",
            confirmButtonText: "Okay",
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();
            }
        });
    } catch (returnedAlertError) {
        console.error("Error in showReturnedProductsAlert:", returnedAlertError);
    }
}

/**
 * @function showBuyerConfirmedProductsAlert
 * @description Displays products that have been confirmed by the seller.
 * @param {object} data - Control Data.
 * @param {Array<object>} ordersData - Orders Data.
 */
export function showBuyerConfirmedProductsAlert(data, ordersData) {
    try {
        const userId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        // Find confirmed items (Status >= CONFIRMED)
        const confirmedKeys = ordersData.flatMap(order =>
            order.order_items.filter(item => {
                // Visibility check
                if (userType === "buyer" && order.user_key !== userId) return false;

                // Check status
                const status = loadItemStatus(item.product_key);
                // We consider "Confirmed" and any subsequent state (Shipped, Delivered) as "Confirmed" in the past tense.
                return [ITEM_STATUS.CONFIRMED, ITEM_STATUS.SHIPPED, ITEM_STATUS.DELIVERED].includes(status);
            }).map(i => i.product_key)
        );

        let contentHtml;
        if (confirmedKeys.length > 0) {
            const itemsHtml = confirmedKeys.map((key) => {
                const productName = getProductName(key, ordersData);
                const status = loadItemStatus(key);
                return `<li id="confirmed-item-${key}" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span>${productName} <small style="color:green">(${status})</small></span>
                         <button type="button" class="btn-show-key" data-key="${key}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px;">Product</button>
                    </li>`;
            }).join("");
            contentHtml = `<div id="confirmed-products-container"><p>Products confirmed by seller:</p><ul id="confirmed-products-list" style="text-align: right; margin-top: 1rem; padding-right: 2rem; width: 100%;">${itemsHtml}</ul></div>`;
        } else {
            contentHtml = '<p id="no-confirmed-items-message">No confirmed products yet.</p>';
        }

        Swal.fire({
            title: "Confirmed Products",
            html: contentHtml,
            icon: confirmedKeys.length > 0 ? "success" : "info",
            confirmButtonText: "Okay",
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();
            }
        });

    } catch (error) {
        console.error("Error in showBuyerConfirmedProductsAlert:", error);
    }
}
