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
} from "./stateManagement.js";
import { determineCurrentStepId } from "./roleAndStepDetermination.js";
import {
    updateCurrentStepFromState,
    createStepStatusFooter,
} from "./uiUpdates.js";
import { addStatusToggleListener } from "./popupHelpers.js";

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
 * This is the first step in the process (Review Step).
 *
 * Logic includes:
 * 1. Filtering products based on user type (Buyer sees their products, Seller sees theirs, etc.).
 * 2. Checking lock status (if order is shipped, review modification is not allowed).
 * 3. Creating checkboxes for each product.
 * 4. Handling selection changes (deselecting a product requires confirmation).
 *
 * @param {object} data - Control Data.
 * @param {Array<object>} ordersData - Orders Data.
 * @param {boolean} isModificationLocked - Is modification locked (e.g., because stage moved past review).
 * @returns {void}
 * @throws {Error} - If an error occurs during alert display or product key processing.
 * @see loadStepState
 * @see getProductName
 * @see determineCurrentStepId
 * @see createStepStatusFooter
 * @see addStatusToggleListener
 * @see saveStepState
 * @see updateCurrentStepFromState
 */
export function showProductKeysAlert(data, ordersData, isModificationLocked) {
    try {
        const userId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        // 1. Determine products to display based on user type
        let productKeys;

        if (userType === "buyer") {
            // Buyer sees all their products in all orders
            const currentUserOrders = ordersData.filter(
                (order) => order.user_key === userId
            );
            productKeys = currentUserOrders.flatMap((order) =>
                order.order_items.map((item) => item.product_key)
            );
        } else if (userType === "seller") {
            // Seller sees only products they act for
            productKeys = ordersData.flatMap((order) =>
                order.order_items
                    .filter((item) => item.seller_key === userId)
                    .map((item) => item.product_key)
            );
        } else if (userType === "courier") {
            // Courier sees only products assigned to them for delivery
            productKeys = ordersData.flatMap((order) =>
                order.order_items
                    .filter((item) => {
                        const deliveryKey = item.supplier_delivery?.delivery_key;
                        if (!deliveryKey) return false;

                        // Support delivery_key as string or array
                        if (Array.isArray(deliveryKey)) {
                            return deliveryKey.includes(userId);
                        } else {
                            return deliveryKey === userId;
                        }
                    })
                    .map((item) => item.product_key)
            );
        } else if (userType === "admin") {
            // Admin sees everything
            productKeys = ordersData.flatMap((order) =>
                order.order_items.map((item) => item.product_key)
            );
        } else {
            productKeys = [];
        }

        // Retrieve previous state (if selected before)
        const previousState = loadStepState("step-review");
        const previouslySelectedKeys = previousState
            ? previousState.selectedKeys
            : null;

        // Check if shipping stage is already activated (modification lock)
        const currentStepState = loadStepState("current_step");
        const isShippedActivated = currentStepState && parseInt(currentStepState.stepNo) >= 3;

        // Determine if UI is locked (view only)
        // Locked if: Explicit lock passed, shipped, or user is not buyer (because only buyer reviews and decides)
        // EXCEPTION: Admin is never locked out by userType, only by stage progression or explicit lock
        const isLocked = isModificationLocked || isShippedActivated || (userType !== "buyer" && userType !== "admin");

        // Create HTML for checkboxes
        let checkboxes = productKeys
            .map(
                (productKey) => {
                    const productName = getProductName(productKey, ordersData);
                    return `<div class="checkbox-item" id="review-item-${productKey}" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  <div style="display: flex; align-items: center;">
                    <input type="checkbox" id="review-checkbox-${productKey}" name="productKeys" value="${productKey}" ${previouslySelectedKeys === null ||
                            previouslySelectedKeys.includes(productKey)
                            ? "checked" // Default all checked if no previous state
                            : ""
                        } ${isLocked ? "disabled" : ""}>
                    <label for="review-checkbox-${productKey}" style="margin-right: 8px;">${productName}</label>
                  </div>
                  <button type="button" class="btn-show-key" data-key="${productKey}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px;">Product</button>
              </div>`;
                }
            )
            .join("");

        const currentStep = determineCurrentStepId(data);

        // Display popup using SweetAlert2
        Swal.fire({
            title: isLocked ? "View Products" : "Select Products:",
            html: `<div id="buyer-review-products-container" style="display: flex; flex-direction: column; align-items: start; width: 100%;">${checkboxes}</div>`,
            // Footer varies based on lock status
            footer: isLocked
                ? (userType !== "buyer"
                    ? "View only - modifications can only be made by the buyer."
                    : "Selections cannot be modified because the order is in an advanced stage.")
                : createStepStatusFooter("step-review", currentStep),
            cancelButtonText: "Close",
            focusConfirm: false,
            allowOutsideClick: !isLocked,
            showConfirmButton: false,
            showCancelButton: true,
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners(); // Attach listeners

                // Add listeners only if window is editable
                if (!isLocked) {
                    addStatusToggleListener(data, ordersData); // To activate stage

                    // Listen for product selection changes
                    const container = document.getElementById(
                        "buyer-review-products-container"
                    );
                    container.addEventListener("change", (e) => {
                        if (e.target.name === "productKeys") {
                            const checkbox = e.target;
                            const wasChecked = previouslySelectedKeys === null || previouslySelectedKeys.includes(checkbox.value);

                            // If product deselected (checked to unchecked)
                            if (wasChecked && !checkbox.checked) {
                                // Show additional confirmation message to prevent accidental deselection
                                Swal.fire({
                                    title: "Confirm Cancellation",
                                    text: "Are you sure you want to cancel this product?",
                                    icon: "warning",
                                    showCancelButton: true,
                                    confirmButtonColor: "#d33",
                                    cancelButtonColor: "#3085d6",
                                    confirmButtonText: "Yes, Cancel",
                                    cancelButtonText: "Undo",
                                    customClass: { popup: "fullscreen-swal" },
                                }).then((result) => {
                                    if (result.isConfirmed) {
                                        // User confirmed cancellation, save new state
                                        const selectedKeys = Array.from(
                                            container.querySelectorAll(
                                                'input[name="productKeys"]:checked'
                                            )
                                        ).map((cb) => cb.value);
                                        const unselectedKeys = productKeys.filter(
                                            (key) => !selectedKeys.includes(key)
                                        );
                                        saveStepState("step-review", {
                                            selectedKeys: selectedKeys,
                                            unselectedKeys: unselectedKeys,
                                        });
                                        console.log("Auto-saving review state:", {
                                            selectedKeys,
                                            unselectedKeys,
                                        });
                                        updateCurrentStepFromState(data, ordersData);
                                    } else {
                                        // User cancelled, revert checkbox to checked
                                        checkbox.checked = true;
                                    }
                                });
                            } else {
                                // Product selected (unchecked to checked), save directly
                                const selectedKeys = Array.from(
                                    container.querySelectorAll(
                                        'input[name="productKeys"]:checked'
                                    )
                                ).map((cb) => cb.value);
                                const unselectedKeys = productKeys.filter(
                                    (key) => !selectedKeys.includes(key)
                                );
                                saveStepState("step-review", {
                                    selectedKeys: selectedKeys,
                                    unselectedKeys: unselectedKeys,
                                });
                                console.log("Auto-saving review state:", {
                                    selectedKeys,
                                    unselectedKeys,
                                });
                                updateCurrentStepFromState(data, ordersData);
                            }
                        }
                    });
                }
            },
        });
    } catch (reviewAlertError) {
        console.error("Error in showProductKeysAlert:", reviewAlertError);
    }
}

/**
 * @function showUnselectedProductsAlert
 * @description Displays a popup with products cancelled (unselected) by the buyer in the review step.
 * This popup appears when clicking on the "Cancelled" step.
 *
 * @param {object} data - Control Data.
 * @param {Array<object>} ordersData - Orders Data.
 * @returns {void}
 * @throws {Error} - If an error occurs displaying the alert for unselected products.
 * @see loadStepState
 * @see getProductName
 */
export function showUnselectedProductsAlert(data, ordersData) {
    try {
        const reviewState = loadStepState("step-review");
        const unselectedKeys = reviewState ? reviewState.unselectedKeys : [];

        let contentHtml;
        if (unselectedKeys.length > 0) {
            const itemsHtml = unselectedKeys
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
            contentHtml =
                '<p id="no-cancelled-items-message">The buyer has not cancelled any products.</p>';
        }

        Swal.fire({
            title: "Cancelled Products",
            html: contentHtml,
            icon: unselectedKeys.length > 0 ? "info" : "success",
            confirmButtonText: "Okay",
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();
            }
        });
    } catch (unselectedAlertError) {
        console.error(
            "Error in showUnselectedProductsAlert:",
            unselectedAlertError
        );
    }
}

/**
 * @function showDeliveryConfirmationAlert
 * @description Displays a popup for the buyer to confirm receipt of products.
 * Shows only products confirmed by the seller.
 *
 * @param {object} data - Control Data.
 * @param {Array<object>} ordersData - Orders Data.
 * @returns {void}
 * @throws {Error} - If an error occurs displaying the alert for delivery confirmation.
 * @see loadStepState
 * @see getProductName
 * @see determineCurrentStepId
 * @see createStepStatusFooter
 * @see addStatusToggleListener
 * @see updateCurrentStepFromState
 */
export function showDeliveryConfirmationAlert(data, ordersData) {
    try {
        const sellerConfirmedState = loadStepState("step-confirmed");
        let productsToDeliver;

        if (sellerConfirmedState) {
            // Take only products approved by seller
            productsToDeliver = sellerConfirmedState.selectedKeys;
        } else {
            // Fallback logic: If no confirmation state, assume everything buyer requested is ready
            const userId = data.currentUser.idUser;
            const userType = data.currentUser.type;

            let allProductKeys;

            if (userType === "buyer") {
                allProductKeys = ordersData.flatMap(order => order.order_items.map(item => item.product_key));
            } else if (userType === "courier") {
                allProductKeys = ordersData.flatMap(order =>
                    order.order_items
                        .filter(item => {
                            const deliveryKey = item.supplier_delivery?.delivery_key;
                            if (!deliveryKey) return false;
                            if (Array.isArray(deliveryKey)) {
                                return deliveryKey.includes(userId);
                            } else {
                                return deliveryKey === userId;
                            }
                        })
                        .map(item => item.product_key)
                );
            } else if (userType === "admin") {
                // Admin sees all products
                allProductKeys = ordersData.flatMap(order => order.order_items.map(item => item.product_key));
            } else {
                allProductKeys = [];
            }

            const uniqueAllProducts = [...new Set(allProductKeys)];

            // Filter by buyer selection (if exists)
            const buyerReviewState = loadStepState("step-review");
            const buyerSelectedKeys = buyerReviewState
                ? buyerReviewState.selectedKeys
                : null;

            productsToDeliver = uniqueAllProducts.filter(key =>
                buyerSelectedKeys === null || buyerSelectedKeys.includes(key)
            );
        }

        const deliveryState = loadStepState("step-delivered");
        const previouslyDeliveredKeys = deliveryState
            ? deliveryState.deliveredKeys
            : null;

        // Check if delivery stage is already activated (moved past it)
        // Assume delivery step is step 4 (Review=1, Confirmed=2, Shipped=3, Delivered=4)
        const currentStepState = loadStepState("current_step");
        const isDeliveredActivated = currentStepState && parseInt(currentStepState.stepNo) >= 4;

        if (productsToDeliver.length === 0) {
            Swal.fire({
                title: "No products to confirm receipt for",
                text: "The seller must confirm the products first.",
                icon: "info",
                confirmButtonText: "Okay",
                customClass: { popup: "fullscreen-swal" },
            });
            return;
        }

        const checkboxesHtml = productsToDeliver
            .map((productKey) => {
                const isChecked =
                    previouslyDeliveredKeys !== null
                        ? previouslyDeliveredKeys.includes(productKey)
                        : true;
                const productName = getProductName(productKey, ordersData);

                return `<div class="checkbox-item" id="delivery-item-${productKey}" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                          <div style="display: flex; align-items: center;">
                              <input type="checkbox" id="delivery-checkbox-${productKey}" name="deliveryProductKeys" value="${productKey}" ${isChecked ? "checked" : ""
                    } ${isDeliveredActivated ? "disabled" : ""}>
                              <label for="delivery-checkbox-${productKey}" style="margin-right: 8px;">${productName}</label>
                          </div>
                          <button type="button" class="btn-show-key" data-key="${productKey}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px;">Product</button>
                      </div>`;
            })
            .join("");

        const currentStep = determineCurrentStepId(data);

        // Extract User Info
        let userInfoHtml = "";
        const processedUserKeys = new Set();
        const userDetails = [];

        productsToDeliver.forEach(productKey => {
            for (const order of ordersData) {
                const item = order.order_items.find(i => i.product_key === productKey);
                if (item) {
                    // Check if we already processed this user for this view to avoid duplicates
                    // Assuming user_key identifies the user unique info set
                    if (!processedUserKeys.has(order.user_key)) {
                        processedUserKeys.add(order.user_key);
                        userDetails.push({
                            name: order.user_name || "N/A",
                            phone: order.user_phone || "N/A",
                            address: order.user_address || "N/A"
                        });
                    }
                    break;
                }
            }
        });

        if (userDetails.length > 0) {
            userInfoHtml = userDetails.map(user => `
                <div class="user-details-container" style="margin-bottom: 15px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; width: 100%; text-align: right;">
                    <h4 style="margin: 0 0 8px 0; font-size: 1em; color: #333; border-bottom: 1px solid #eee; padding-bottom: 4px;">Customer Information</h4>
                    <p style="margin: 3px 0; font-size: 0.9em;"><strong>Name:</strong> ${user.name}</p>
                    <p style="margin: 3px 0; font-size: 0.9em;"><strong>Phone:</strong> <a href="tel:${user.phone}" style="color: #007bff; text-decoration: none;">${user.phone}</a></p>
                    <p style="margin: 3px 0; font-size: 0.9em;"><strong>Address:</strong> ${user.address}</p>
                </div>
            `).join("");
        }

        Swal.fire({
            title: "Confirm Product Receipt",
            html: `<div id="delivery-confirmation-container" style="display: flex; flex-direction: column; align-items: start; width: 100%;">
                    ${userInfoHtml}
                    ${checkboxesHtml}
                   </div>`,
            footer: isDeliveredActivated
                ? "Selections cannot be modified because the stage is already active."
                : createStepStatusFooter("step-delivered", currentStep),
            cancelButtonText: "Cancel",
            showConfirmButton: false,
            showCancelButton: true,
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();
                if (productsToDeliver.length > 0 && !isDeliveredActivated) {
                    addStatusToggleListener(data, ordersData);
                    const container = document.getElementById(
                        "delivery-confirmation-container"
                    );
                    container.addEventListener("change", (e) => {
                        if (e.target.name === "deliveryProductKeys") {
                            const deliveredKeys = Array.from(
                                container.querySelectorAll(
                                    'input[name="deliveryProductKeys"]:checked'
                                )
                            ).map((cb) => cb.value);

                            // Products not checked are considered returned
                            const returnedKeys = productsToDeliver.filter(
                                (key) => !deliveredKeys.includes(key)
                            );

                            saveStepState("step-delivered", {
                                deliveredKeys: deliveredKeys,
                                returnedKeys: returnedKeys,
                            });
                            console.log("Auto-saving delivery state:", {
                                deliveredKeys,
                                returnedKeys,
                            });
                            updateCurrentStepFromState(data, ordersData);
                        }
                    });
                }
            },
        });
    } catch (deliveryAlertError) {
        console.error(
            "Error in showDeliveryConfirmationAlert:",
            deliveryAlertError
        );
    }
}

/**
 * @function showReturnedProductsAlert
 * @description Displays a popup with products returned (not accepted in delivery step).
 *
 * @param {object} data - Control Data.
 * @param {Array<object>} ordersData - Orders Data.
 * @returns {void}
 * @throws {Error} - If an error occurs displaying the alert for returned products.
 * @see loadStepState
 * @see getProductName
 */
export function showReturnedProductsAlert(data, ordersData) {
    try {
        const deliveryState = loadStepState("step-delivered");
        const returnedKeys = deliveryState ? deliveryState.returnedKeys : [];

        let contentHtml;

        if (returnedKeys && returnedKeys.length > 0) {
            const itemsHtml = returnedKeys
                .map((key) => {
                    const productName = getProductName(key, ordersData || []); // Handle potential missing ordersData gracefully or fix caller
                    return `<li id="returned-item-${key}" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span>${productName}</span>
                         <button type="button" class="btn-show-key" data-key="${key}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px;">Product</button>
                    </li>`;
                })
                .join("");
            contentHtml = `<div id="returned-products-container"><p>The following products have been marked for return:</p><ul id="returned-products-list" style="text-align: right; margin-top: 1rem; padding-right: 2rem; width: 100%;">${itemsHtml}</ul></div>`;
        } else {
            contentHtml =
                '<p id="no-returned-items-message">No products have been marked for return.</p>';
        }

        Swal.fire({
            title: "Returned Products",
            html: contentHtml,
            icon: returnedKeys && returnedKeys.length > 0 ? "warning" : "success",
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
