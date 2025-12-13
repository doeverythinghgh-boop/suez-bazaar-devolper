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
    saveItemStatus,
    loadItemStatus,
    ITEM_STATUS
} from "./stateManagement.js";
import { determineCurrentStepId } from "./roleAndStepDetermination.js";
import {
    updateCurrentStepFromState
    // createStepStatusFooter -- We will implement custom footers for item-level actions
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
    document.querySelectorAll('.btn-show-key').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent toggling the checkbox/row
            console.log('[Seller] Product Key:', btn.dataset.key);
            localStorage.setItem('productKeyFromStepReview', btn.dataset.key);
        });
    });
}

/**
 * @function showSellerConfirmationProductsAlert
 * @description Displays a popup for the seller to confirm product availability.
 * Updates item status individually to 'confirmed'.
 *
 * @param {object} data - Control Data.
 * @param {Array<object>} ordersData - Orders Data.
 * @returns {void}
 */
export function showSellerConfirmationProductsAlert(data, ordersData) {
    try {
        const sellerId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        // Group seller products
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
                            const key = Array.isArray(deliveryData.delivery_key) ? deliveryData.delivery_key.join(", ") : deliveryData.delivery_key;
                            parsedDeliveryData = [{ name: key, phone: 'N/A' }];
                        }
                    }
                    return {
                        product_key: item.product_key,
                        delivery_info: parsedDeliveryData,
                        note: item.note || ''
                    };
                })
        );

        // Remove duplicates
        const uniqueSellerProducts = Array.from(
            new Map(sellerOwnedProducts.map((p) => [p.product_key, p])).values()
        );

        const displayableProducts = uniqueSellerProducts; // Show all products for the seller

        let contentHtml;

        if (displayableProducts.length === 0) {
            contentHtml = "<p>لا توجد منتجات لعرضها.</p>";
        } else {
            const tableRows = displayableProducts.map(product => {
                const currentStatus = loadItemStatus(product.product_key);
                // Checked if confirmed or higher
                const isChecked = currentStatus === ITEM_STATUS.CONFIRMED ||
                    currentStatus === ITEM_STATUS.SHIPPED ||
                    currentStatus === ITEM_STATUS.DELIVERED;

                const isDisabled = currentStatus === ITEM_STATUS.SHIPPED || currentStatus === ITEM_STATUS.DELIVERED; // Cannot unconfirm if already shipped

                const productName = getProductName(product.product_key, ordersData);
                const agentNames = product.delivery_info.map(d => d.name).join("<br>");
                const agentPhones = product.delivery_info.map(d => d.phone).join("<br>");

                const checkboxCell = `
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                        <div style="display: flex; align-items: center;">
                            <input type="checkbox" 
                                   id="seller-confirmation-checkbox-${product.product_key}" 
                                   name="sellerProductKeys" 
                                   value="${product.product_key}" 
                                   ${isChecked ? "checked" : ""} 
                                   ${isDisabled ? "disabled" : ""}
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
                    <th style="padding: 8px; border: 1px solid #ddd;">المنتج (حدد للتأكيد)</th>
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

        Swal.fire({
            title: "تأكيد المنتجات",
            html: `<div id="seller-confirmation-container" style="display: flex; flex-direction: column; align-items: start; width: 100%; max-height: 300px; overflow: auto;">
    ${contentHtml}
                   </div>`,
            footer: '<button id="btn-save-confirmation" class="swal2-confirm swal2-styled" style="background-color: #28a745;">حفظ التغييرات</button>',
            cancelButtonText: "إغلاق",
            showConfirmButton: false,
            showCancelButton: true,
            focusConfirm: false,
            allowOutsideClick: true,
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();

                const saveBtn = document.getElementById('btn-save-confirmation');
                if (saveBtn) {
                    saveBtn.addEventListener('click', () => {
                        const checkboxes = document.querySelectorAll('input[name="sellerProductKeys"]');
                        let changed = false;
                        checkboxes.forEach(cb => {
                            if (!cb.disabled) {
                                const newStatus = cb.checked ? ITEM_STATUS.CONFIRMED : ITEM_STATUS.PENDING;
                                const currentStatus = loadItemStatus(cb.value);
                                if (currentStatus !== newStatus && (currentStatus === ITEM_STATUS.PENDING || currentStatus === ITEM_STATUS.CONFIRMED)) {
                                    saveItemStatus(cb.value, newStatus);
                                    changed = true;
                                }
                            }
                        });
                        if (changed) {
                            Swal.fire({
                                icon: 'success',
                                title: 'تم الحفظ',
                                text: 'تم تحديث حالة المنتجات بنجاح.',
                                timer: 1500,
                                showConfirmButton: false
                            }).then(() => {
                                // Trigger update to stepper UI
                                updateCurrentStepFromState(data, ordersData);
                            });
                        } else {
                            Swal.close();
                        }
                    });
                }
            },
        });
    } catch (sellerConfirmAlertError) {
        console.error("Error in showSellerConfirmationProductsAlert:", sellerConfirmAlertError);
    }
}

/**
 * @function showSellerRejectedProductsAlert
 * @description Displays products rejected by the seller (status = REJECTED).
 */
export function showSellerRejectedProductsAlert(data, ordersData) {
    try {
        // Logic: Find all items for this seller (or all if admin) that match status REJECTED
        // For backwards compatibility or simplicity, we can also check 'deselectedKeys' legacy logic if needed, 
        // but let's stick to ITEM_STATUS.REJECTED for the new system.

        // However, the previous logic relied on "Deselected in Confirm Step" = Rejected.
        // In the new logic, "Unchecked" in Confirm Step -> PENDING.
        // We need an explicit "Reject" action? 
        // Implementation Plan didn't specify a separate Reject UI, but "Reject Step" usually displays them.

        // Let's assume for now rejection is done elsewhere or we show "Returned/Rejected" items here.
        // For the sake of this task, let's show items that have status REJECTED.

        const sellerId = data.currentUser.idUser;
        const userType = data.currentUser.type;
        const itemsMap = loadStepState("items") || {}; // Access raw map if possible or use helpers

        // We will iterate order items to find rejected ones
        const rejectedItems = ordersData.flatMap(order =>
            order.order_items.filter(item => {
                const isOwner = userType === "admin" || item.seller_key === sellerId;
                const status = loadItemStatus(item.product_key);
                return isOwner && status === ITEM_STATUS.REJECTED;
            })
        );

        let contentHtml;
        if (rejectedItems.length > 0) {
            const itemsHtml = rejectedItems.map(item => {
                return `<li style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span>${item.product_name}</span>
                         <button type="button" class="btn-show-key" data-key="${item.product_key}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px;">المنتج</button>
                    </li>`;
            }).join("");
            contentHtml = `<p>المنتجات المرفوضة:</p><ul style="text-align: right; margin-top: 1rem; padding-right: 2rem; width: 100%;">${itemsHtml}</ul>`;
        } else {
            contentHtml = '<p>لا توجد منتجات مرفوضة.</p>';
        }

        Swal.fire({
            title: "المنتجات المرفوضة",
            html: contentHtml,
            icon: rejectedItems.length > 0 ? "info" : "success",
            confirmButtonText: "حسنًا",
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => attachLogButtonListeners()
        });

    } catch (rejectedAlertError) {
        console.error("Error in showSellerRejectedProductsAlert:", rejectedAlertError);
    }
}

/**
 * @function showShippingInfoAlert
 * @description Displays a popup with products that have been shipped.
 * Allows moving products from CONFIRMED to SHIPPED.
 */
export function showShippingInfoAlert(data, ordersData) {
    try {
        const sellerId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        // Filter products: Must be at least CONFIRMED and belong to seller
        const readyToShipProducts = ordersData.flatMap((order) =>
            order.order_items
                .filter((item) => userType === "admin" || (userType === "seller" && item.seller_key === sellerId) || (userType === "courier")) // logic for courier?
                .filter((item) => {
                    const status = loadItemStatus(item.product_key);
                    return status === ITEM_STATUS.CONFIRMED || status === ITEM_STATUS.SHIPPED || status === ITEM_STATUS.DELIVERED;
                })
        );

        if (readyToShipProducts.length === 0) {
            Swal.fire({
                title: "لا توجد منتجات للشحن",
                text: "يجب تأكيد المنتجات أولاً.",
                icon: "warning",
                confirmButtonText: "حسنًا",
                customClass: { popup: "fullscreen-swal" },
            });
            return;
        }

        // Prepare table
        const tableRows = readyToShipProducts.map(item => {
            const status = loadItemStatus(item.product_key);
            const isShipped = status === ITEM_STATUS.SHIPPED || status === ITEM_STATUS.DELIVERED;

            // Only allow toggling if not delivered?
            const isDisabled = status === ITEM_STATUS.DELIVERED;

            // Delivery Info
            let deliveryInfo = { names: '-', phones: '-' };
            if (item.supplier_delivery) {
                // ... extract info (simplified for brevity, reuse logic if needed)
                const d = item.supplier_delivery;
                deliveryInfo.names = Array.isArray(d.delivery_name) ? d.delivery_name.join(", ") : d.delivery_name;
                deliveryInfo.phones = Array.isArray(d.delivery_phone) ? d.delivery_phone.join(", ") : d.delivery_phone;
            }

            const checkbox = `
                <input type="checkbox"
                       name="shippingProductKeys"
                       value="${item.product_key}" 
                       ${isShipped ? "checked" : ""} 
                       ${isDisabled ? "disabled" : ""}
                       style="margin-left: 5px;">
    `;

            const keyButton = `<button type="button" class="btn-show-key" data-key="${item.product_key}" style="float:left; padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px; margin-right: 5px;">المنتج</button>`;

            return `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">
                        <label>${checkbox} ${item.product_name}</label> ${keyButton}
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${deliveryInfo.names}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${deliveryInfo.phones}</td>
                </tr>
    `;
        }).join("");

        const tableHtml = `
            <div style="width: 100%; overflow-x: auto;">
                <p>حدد المنتجات لتغيير حالتها إلى "مشحون":</p>
                <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 0.9em; margin-top: 10px;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="padding: 8px; border: 1px solid #ddd;">المنتج</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">موصل</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">هاتف</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
    `;

        Swal.fire({
            title: "شحن المنتجات",
            html: tableHtml,
            footer: '<button id="btn-save-shipping" class="swal2-confirm swal2-styled" style="background-color: #007bff;">تحديث حالة الشحن</button>',
            confirmButtonText: "إغلاق",
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: "إغلاق",
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();
                document.getElementById('btn-save-shipping')?.addEventListener('click', () => {
                    const checkboxes = document.querySelectorAll('input[name="shippingProductKeys"]');
                    let changed = false;
                    checkboxes.forEach(cb => {
                        if (!cb.disabled) {
                            const currentStatus = loadItemStatus(cb.value);
                            const shouldBeShipped = cb.checked;

                            if (shouldBeShipped && currentStatus === ITEM_STATUS.CONFIRMED) {
                                saveItemStatus(cb.value, ITEM_STATUS.SHIPPED);
                                changed = true;
                            } else if (!shouldBeShipped && currentStatus === ITEM_STATUS.SHIPPED) {
                                saveItemStatus(cb.value, ITEM_STATUS.CONFIRMED); // Revert to confirmed
                                changed = true;
                            }
                        }
                    });
                    if (changed) {
                        Swal.fire({
                            icon: 'success',
                            title: 'تم التحديث',
                            text: 'تم تحديث حالة الشحن بنجاح.',
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
    } catch (shippingAlertError) {
        console.error("Error in showShippingInfoAlert:", shippingAlertError);
    }
}
