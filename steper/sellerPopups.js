/**
 * @file sellerPopups.js
 * @description Seller Popups Module.
 * This file contains all functions responsible for displaying seller-specific popups.
 * These popups include:
 * - Product Confirmation (Order Approval).
 * - Viewing Rejected Products.
 * - Viewing Shipping Information.
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
    document.querySelectorAll('.btn-show-key').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent toggling the checkbox/row
            console.log('[بائع] مفتاح المنتج:', btn.dataset.key);
            localStorage.setItem('productKeyFromStepReview', btn.dataset.key);
        });
    });
}

/**
 * @function showSellerConfirmationProductsAlert
 * @description Displays a popup for the seller to confirm product availability.
 * This is the second step (Confirmed Step).
 *
 * Logic includes:
 * 1. Displaying only products belonging to this seller that were selected by the buyer.
 * 2. Allowing the seller to deselect (reject) products if unavailable.
 * 3. Saving the confirmation state (selected and deselected).
 *
 * @param {object} data - Control Data.
 * @param {Array<object>} ordersData - Orders Data.
 * @returns {void}
 * @throws {Error} - If there is an error displaying the alert or processing product confirmations.
 * @see saveStepState
 * @see loadStepState
 * @see determineCurrentStepId
 * @see updateCurrentStepFromState
 * @see createStepStatusFooter
 * @see addStatusToggleListener
 */
export function showSellerConfirmationProductsAlert(data, ordersData) {
    try {
        const sellerId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        // Group seller products with delivery info
        // If user is Admin, show all products in the order
        // If seller, show only their products
        const sellerOwnedProducts = ordersData.flatMap((order) =>
            order.order_items
                .filter((item) => userType === "admin" || item.seller_key === sellerId)
                .map((item) => {
                    const deliveryData = item.supplier_delivery;
                    let parsedDeliveryData = [];

                    if (deliveryData) {
                        const names = deliveryData.delivery_name;
                        const phones = deliveryData.delivery_phone;

                        if (Array.isArray(names)) {
                            parsedDeliveryData = names.map((name, index) => {
                                const phone = Array.isArray(phones) ? phones[index] : phones;
                                return { name: name, phone: phone || 'N/A' };
                            });
                        } else if (names) {
                            const phone = Array.isArray(phones) ? phones[0] : phones;
                            parsedDeliveryData = [{ name: names, phone: phone || 'N/A' }];
                        } else if (deliveryData.delivery_key) {
                            // Fallback to key
                            const key = Array.isArray(deliveryData.delivery_key) ? deliveryData.delivery_key.join(", ") : deliveryData.delivery_key;
                            parsedDeliveryData = [{ name: key, phone: 'N/A' }];
                        }
                    }

                    return {
                        product_key: item.product_key,
                        delivery_info: parsedDeliveryData,
                        note: item.note || '' // Extract note
                    };
                })
        );

        // Remove duplicates
        const uniqueSellerProducts = Array.from(
            new Map(sellerOwnedProducts.map((p) => [p.product_key, p])).values()
        );

        // Get buyer selections
        const buyerReviewState = loadStepState("step-review");
        // If no review state (buyer hasn't saved), assume all products are accepted initially
        const buyerSelectedKeys = buyerReviewState
            ? buyerReviewState.selectedKeys
            : null;

        const sellerConfirmedState = loadStepState("step-confirmed");
        const previouslySellerSelectedKeys = sellerConfirmedState
            ? sellerConfirmedState.selectedKeys
            : null;

        // Check if confirmation stage is already activated (moved past it)
        const currentStepState = loadStepState("current_step");
        const isConfirmedActivated = currentStepState && parseInt(currentStepState.stepNo) >= 2;

        // Filter products to show only what buyer requested
        const displayableProducts = uniqueSellerProducts.filter((p) =>
            buyerSelectedKeys === null || buyerSelectedKeys.includes(p.product_key)
        );

        let contentHtml;

        if (displayableProducts.length === 0) {
            contentHtml = "<p>لا توجد منتجات مشتركة مع اختيارات المشتري لتأكيدها.</p>";
        } else {
            // Create unified table containing checkboxes and delivery info
            const tableRows = displayableProducts.map(product => {
                const isChecked =
                    previouslySellerSelectedKeys !== null
                        ? previouslySellerSelectedKeys.includes(product.product_key)
                        : true;
                const productName = getProductName(product.product_key, ordersData);
                const agentNames = product.delivery_info.map(d => d.name).join("<br>");
                const agentPhones = product.delivery_info.map(d => d.phone).join("<br>");

                // Create checkbox + label + key button
                const checkboxCell = `
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                        <div style="display: flex; align-items: center;">
                            <input type="checkbox" 
                                   id="seller-confirmation-checkbox-${product.product_key}" 
                                   name="sellerProductKeys" 
                                   value="${product.product_key}" 
                                   ${isChecked ? "checked" : ""} 
                                   ${isConfirmedActivated ? "disabled" : ""}
                                   style="margin-left: 8px;">
                            <label for="seller-confirmation-checkbox-${product.product_key}">${productName}</label>
                        </div>
                        <button type="button" class="btn-show-key" data-key="${product.product_key}" 
                                style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px;">
                            المنتج
                        </button>
                    </div>
                `;

                return `
                    <tr id="seller-confirmation-item-${product.product_key}">
                        <td style="padding: 8px; border: 1px solid #ddd;">${checkboxCell}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${product.note ? product.note : '-'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${agentNames || '-'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${agentPhones || '-'}</td>
                    </tr>
                `;
            }).join("");

            contentHtml = `
                <div style="min-width: 100%; width: max-content;">
                    <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 0.9em;">
                        <thead>
                            <tr style="background-color: #f2f2f2;">
                                <th style="padding: 8px; border: 1px solid #ddd;">المنتج</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">ملاحظات</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">مندوب التوصيل</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">رقم الهاتف</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            `;
        }

        const currentStep = determineCurrentStepId(data);

        Swal.fire({
            title: "تأكيد المنتجات",
            html: `<div id="seller-confirmation-container" style="display: flex; flex-direction: column; align-items: start; width: 100%; max-height: 300px; overflow: auto;">
                    ${contentHtml}
                   </div>`,
            footer: isConfirmedActivated
                ? "لا يمكن تعديل الاختيارات لأن المرحلة مفعلة بالفعل."
                : createStepStatusFooter("step-confirmed", currentStep),
            cancelButtonText: "إغلاق",
            showConfirmButton: false,
            showCancelButton: true,
            focusConfirm: false,
            allowOutsideClick: true,
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();
                if (
                    displayableProducts.length > 0 &&
                    !isConfirmedActivated
                ) {
                    addStatusToggleListener(data, ordersData);
                    const container = document.getElementById(
                        "seller-confirmation-container"
                    );
                    container.addEventListener("change", (e) => {
                        if (e.target.name === "sellerProductKeys") {
                            const sellerSelectedKeys = Array.from(
                                container.querySelectorAll(
                                    'input[name="sellerProductKeys"]:checked'
                                )
                            ).map((cb) => cb.value);

                            // Unselected products are considered rejected
                            const sellerDeselectedKeys = displayableProducts
                                .map((p) => p.product_key)
                                .filter((key) => !sellerSelectedKeys.includes(key));

                            saveStepState("step-confirmed", {
                                selectedKeys: sellerSelectedKeys,
                                deselectedKeys: sellerDeselectedKeys,
                            });
                            console.log("Auto-saving seller confirmation state:", {
                                selectedKeys: sellerSelectedKeys,
                                deselectedKeys: sellerDeselectedKeys,
                            });
                            updateCurrentStepFromState(data, ordersData);
                        }
                    });
                }
            },
        });
    } catch (sellerConfirmAlertError) {
        console.error(
            "Error in showSellerConfirmationProductsAlert:",
            sellerConfirmAlertError
        );
    }
}

/**
 * @function showSellerRejectedProductsAlert
 * @description Displays a popup with products rejected (deselected) by the seller during the confirmation step.
 * Appears when clicking on the "Rejected" step.
 *
 * @param {object} data - Control Data.
 * @param {Array<object>} ordersData - Orders Data.
 * @returns {void}
 * @throws {Error} - If there is an error displaying the alert for rejected products.
 * @see loadStepState
 * @see getProductName
 */
export function showSellerRejectedProductsAlert(data, ordersData) {
    try {
        const sellerConfirmedState = loadStepState("step-confirmed");
        const sellerDeselectedKeys = sellerConfirmedState
            ? sellerConfirmedState.deselectedKeys
            : [];

        let contentHtml;
        if (sellerDeselectedKeys && sellerDeselectedKeys.length > 0) {
            const itemsHtml = sellerDeselectedKeys
                .map((key) => {
                    const productName = getProductName(key, ordersData);
                    return `<li id="rejected-item-${key}" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span>${productName}</span>
                         <button type="button" class="btn-show-key" data-key="${key}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px;">المنتج</button>
                    </li>`;
                })
                .join("");
            contentHtml = `<p>المنتجات التي تم رفضها من قبل البائع:</p><ul id="rejected-products-list" style="text-align: right; margin-top: 1rem; padding-right: 2rem; width: 100%;">${itemsHtml}</ul>`;
        } else {
            contentHtml =
                '<p id="no-rejected-items-message">لم يقم البائع بإلغاء  أي منتجات</p>';
        }

        Swal.fire({
            title: "المنتجات المرفوضة من البائع",
            html: contentHtml,
            icon:
                sellerDeselectedKeys && sellerDeselectedKeys.length > 0
                    ? "info"
                    : "success",
            confirmButtonText: "حسنًا",
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();
            }
        });
    } catch (rejectedAlertError) {
        console.error(
            "Error in showSellerRejectedProductsAlert:",
            rejectedAlertError
        );
    }
}

/**
 * @function showShippingInfoAlert
 * @description Displays a popup with products that have been shipped.
 * Appears in the "Shipped" step.
 * Shows only products confirmed by the seller.
 *
 * @param {object} data - Control Data.
 * @param {Array<object>} ordersData - Orders Data.
 * @returns {void}
 * @throws {Error} - If there is an error displaying the shipping information alert.
 * @see loadStepState
 * @see getProductName
 * @see determineCurrentStepId
 * @see createStepStatusFooter
 * @see addStatusToggleListener
 */
export function showShippingInfoAlert(data, ordersData) {
    try {
        const sellerConfirmedState = loadStepState("step-confirmed");
        let confirmedKeys;

        if (sellerConfirmedState) {
            confirmedKeys = sellerConfirmedState.selectedKeys;
        } else {
            // If no state saved, assume all available products are confirmed
            const userId = data.currentUser.idUser;
            const userType = data.currentUser.type;

            let userOwnedProducts;

            if (userType === "seller") {
                userOwnedProducts = ordersData.flatMap((order) =>
                    order.order_items
                        .filter((item) => item.seller_key === userId)
                        .map((item) => item.product_key)
                );
            } else if (userType === "courier") {
                userOwnedProducts = ordersData.flatMap((order) =>
                    order.order_items
                        .filter((item) => {
                            const deliveryKey = item.supplier_delivery?.delivery_key;
                            if (!deliveryKey) return false;
                            if (Array.isArray(deliveryKey)) {
                                return deliveryKey.includes(userId);
                            } else {
                                return deliveryKey === userId;
                            }
                        })
                        .map((item) => item.product_key)
                );
            } else if (userType === "admin") {
                // Admin sees all products
                userOwnedProducts = ordersData.flatMap((order) =>
                    order.order_items.map((item) => item.product_key)
                );
            } else {
                userOwnedProducts = [];
            }

            // Remove duplicates
            const uniqueUserProducts = [...new Set(userOwnedProducts)];

            const buyerReviewState = loadStepState("step-review");
            const buyerSelectedKeys = buyerReviewState
                ? buyerReviewState.selectedKeys
                : null;

            confirmedKeys = uniqueUserProducts.filter((key) =>
                buyerSelectedKeys === null || buyerSelectedKeys.includes(key)
            );
        }

        if (confirmedKeys.length === 0) {
            Swal.fire({
                title: "لا توجد منتجات للشحن",
                text: "يجب تأكيد المنتجات أولاً قبل الانتقال إلى مرحلة الشحن.",
                icon: "warning",
                confirmButtonText: "حسنًا",
                customClass: { popup: "fullscreen-swal" },
            });
            return;
        }

        // Prepare table data
        const tableRows = confirmedKeys.map(productKey => {
            const productName = getProductName(productKey, ordersData);
            let deliveryInfo = { names: '-', phones: '-' };

            // Find delivery details for product
            for (const order of ordersData) {
                const item = order.order_items.find(i => i.product_key === productKey);
                if (item && item.supplier_delivery) {
                    const deliveryData = item.supplier_delivery;
                    const names = deliveryData.delivery_name;
                    const phones = deliveryData.delivery_phone;

                    if (Array.isArray(names)) {
                        deliveryInfo.names = names.join("<br>");
                        deliveryInfo.phones = Array.isArray(phones) ? phones.join("<br>") : phones;
                    } else if (names) {
                        deliveryInfo.names = names;
                        deliveryInfo.phones = phones || '-';
                    } else if (deliveryData.delivery_key) {
                        const key = Array.isArray(deliveryData.delivery_key) ? deliveryData.delivery_key.join(", ") : deliveryData.delivery_key;
                        deliveryInfo.names = key;
                    }
                    break; // Found product, take first match (or improve if product is duplicated somehow)
                }
            }

            // Add Key button next to product name
            const keyButton = `<button type="button" class="btn-show-key" data-key="${productKey}" style="float:left; padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px; margin-right: 5px;">المنتج</button>`;

            return `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${productName} ${keyButton}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${deliveryInfo.names}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${deliveryInfo.phones}</td>
                </tr>
            `;
        }).join("");

        const tableHtml = `
            <div style="width: 100%; overflow-x: auto;">
                <p>المنتجات التالية جاهزة للشحن:</p>
                <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 0.9em; margin-top: 10px;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="padding: 8px; border: 1px solid #ddd;">المنتج</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">مندوب التوصيل</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">رقم الهاتف</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;

        const currentStep = determineCurrentStepId(data);

        Swal.fire({
            title: "المنتجات المشحونة",
            html: tableHtml,
            footer: createStepStatusFooter("step-shipped", currentStep),
            // icon: "info", // Remove icon to give more space for table
            confirmButtonText: "إغلاق",
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                addStatusToggleListener(data, ordersData);
                attachLogButtonListeners();
            },
        });
    } catch (shippingAlertError) {
        console.error("Error in showShippingInfoAlert:", shippingAlertError);
    }
}
