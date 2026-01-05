/**
 * @file buyerUi.js
 * @description Buyer UI Module.
 * Contains functions responsible for generating HTML strings for buyer-related popups.
 * Completely separated from business logic.
 */

import { loadItemStatus } from "./stateManagement.js";
import { ITEM_STATUS } from "./config.js";
import { getProductName, translateStatus } from "./commonUtils.js";

/**
 * Generates HTML for the product review list.
 * @function generateReviewListHtml
 * @param {Array<string>} productKeys
 * @param {Array<object>} ordersData
 * @param {boolean} isOverallLocked
 * @returns {string} HTML string.
 */
export function generateReviewListHtml(productKeys, ordersData, isOverallLocked) {
    if (!productKeys || productKeys.length === 0) {
        return `<div style="text-align: center; padding: 20px; color: var(--text-secondary);">${window.langu('ui_no_review_products')}</div>`;
    }

    return productKeys.map((productKey) => {
        const productName = getProductName(productKey, ordersData);
        const status = loadItemStatus(productKey);
        // Developer Log: Tracing Rendering
        console.log(`[BuyerPopups] 🖌️ Rendering ${productKey} with status: ${status}`);

        const isChecked = status !== ITEM_STATUS.CANCELLED;
        // Logic: item is locked if the WHOLE step is locked OR if the item itself is explicitly processed
        // (Not Pending and Not Cancelled -> meaning Confirmed/Shipped etc.)
        const isItemLocked = isOverallLocked || (status !== ITEM_STATUS.PENDING && status !== ITEM_STATUS.CANCELLED);

        return `
            <div class="checkbox-item" id="review-item-${productKey}" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <div style="display: flex; align-items: center;">
                    <input type="checkbox" id="review-checkbox-${productKey}" name="productKeys" value="${productKey}" 
                        ${isChecked ? "checked" : ""} 
                        ${isItemLocked ? "disabled" : ""}>
                    <label for="review-checkbox-${productKey}" style="margin-right: 8px;">${productName} <small>(${translateStatus(status)})</small></label>
                </div>
                <button type="button" class="btn-show-key" data-key="${productKey}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid var(--border-light); background: var(--bg-neutral); border-radius: 4px; color: var(--text-primary);"><i class="fas fa-eye"></i></button>
            </div>
        `;
    }).join("");
}

/**
 * Generates HTML for the cancelled products list.
 * @function generateCancelledListHtml
 * @param {Array<string>} cancelledKeys
 * @param {Array<object>} ordersData
 * @returns {string} HTML string.
 */
export function generateCancelledListHtml(cancelledKeys, ordersData) {
    if (cancelledKeys.length === 0) {
        return `<p id="no-cancelled-items-message">${window.langu('ui_no_cancelled_products')}</p>`;
    }
    const itemsHtml = cancelledKeys.map((key) => {
        const productName = getProductName(key, ordersData);
        return `
            <li id="cancelled-item-${key}" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <span>${productName}</span>
                <button type="button" class="btn-show-key" data-key="${key}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid var(--border-light); background: var(--bg-neutral); border-radius: 4px; color: var(--text-primary);"><i class="fas fa-eye"></i></button>
            </li>
        `;
    }).join("");
    return `<ul id="cancelled-products-list" style="text-align: right; margin-top: 1rem; padding-right: 2rem; width: 100%;">${itemsHtml}</ul>`;
}

/**
 * Generates HTML for delivery confirmation info (User Details).
 * @function generateDeliveryUserInfoHtml
 * @param {Array<object>} userDetails
 * @returns {string} HTML string.
 */
export function generateDeliveryUserInfoHtml(userDetails) {
    return userDetails.map(user => `
         <div class="user-details-container" style="margin-bottom: 15px; padding: 10px; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 5px; width: 100%; text-align: right; direction: rtl;">
            <p style="margin: 5px 0;"><strong style="color: var(--color-primary);">${window.langu('ui_label_name')}</strong> <span style="color: var(--text-secondary);">${user.name}</span></p>
            <p style="margin: 5px 0;"><strong style="color: var(--color-primary);">${window.langu('ui_label_phone')}</strong> <a href="tel:${user.phone}" style="color: var(--color-shipped); text-decoration: none; font-weight: bold;">${user.phone} <i class="fas fa-phone-alt" style="font-size: 0.8em;"></i></a></p>
            <p style="margin: 5px 0;">
                <strong style="color: var(--color-primary);">${window.langu('ui_label_address')}</strong> 
                <span style="color: var(--text-secondary);">${user.address}</span>
                ${(user.location && user.location.trim() !== "") ? `
                    <button class="btn-view-buyer-map" 
                            data-lat="${user.location.split(',')[0].trim()}" 
                            data-lng="${user.location.split(',')[1].trim()}"
                            data-name="${user.name}"
                            title="${window.langu('ui_view_on_map')}"
                            style="margin-right: 5px; cursor: pointer; border: none; background: none; color: #007bff; font-size: 1.1em; padding: 0;">
                        <i class="fas fa-map-marked-alt"></i>
                    </button>
                ` : ""}
            </p>
        </div>
    `).join("");
}

/**
 * Generates HTML for delivery items checkboxes.
 * @function generateDeliveryItemsHtml
 * @param {Array<object>} products
 * @returns {string} HTML string.
 */
export function generateDeliveryItemsHtml(products) {
    return products.map((item) => {
        const status = loadItemStatus(item.product_key);
        const isDelivered = status === ITEM_STATUS.DELIVERED;
        return `
            <div class="checkbox-item" id="delivery-item-${item.product_key}" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  <div style="display: flex; align-items: center;">
                      <input type="checkbox" id="delivery-checkbox-${item.product_key}" name="deliveryProductKeys" value="${item.product_key}" 
                        ${isDelivered ? "checked" : ""} 
                        style="margin-right: 8px;">
                      <label for="delivery-checkbox-${item.product_key}">${item.product_name}</label>
                  </div>
                  <button type="button" class="btn-show-key" data-key="${item.product_key}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid var(--border-light); background: var(--bg-neutral); border-radius: 4px; color: var(--text-primary);"><i class="fas fa-eye"></i></button>
            </div>
        `;
    }).join("");
}

/**
 * Generates HTML for returned products list.
 * @function generateReturnedListHtml
 * @param {Array<string>} returnedKeys
 * @param {Array<object>} ordersData
 * @returns {string} HTML string.
 */
export function generateReturnedListHtml(returnedKeys, ordersData) {
    if (returnedKeys.length === 0) {
        return `<p id="no-returned-items-message">${window.langu('ui_no_returned_products')}</p>`;
    }
    const itemsHtml = returnedKeys.map((key) => {
        const productName = getProductName(key, ordersData);
        return `
            <li id="returned-item-${key}" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <span>${productName}</span>
                <button type="button" class="btn-show-key" data-key="${key}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid var(--border-light); background: var(--bg-neutral); border-radius: 4px; color: var(--text-primary);"><i class="fas fa-eye"></i></button>
            </li>
        `;
    }).join("");
    return `<div id="returned-products-container"><p>${window.langu('ui_returned_products_title')}</p><ul id="returned-products-list" style="text-align: right; margin-top: 1rem; padding-right: 2rem; width: 100%;">${itemsHtml}</ul></div>`;
}

/**
 * Generates HTML for confirmed products list.
 * @function generateConfirmedListHtml
 * @param {Array<string>} confirmedKeys
 * @param {Array<object>} ordersData
 * @returns {string} HTML string.
 */
export function generateConfirmedListHtml(confirmedKeys, ordersData) {
    if (confirmedKeys.length === 0) {
        return `<p id="no-confirmed-items-message">${window.langu('ui_no_confirmed_products')}</p>`;
    }
    const itemsHtml = confirmedKeys.map((key) => {
        const productName = getProductName(key, ordersData);
        const status = loadItemStatus(key);

        // Find Item Delivery Info
        let deliveryInfo = "";
        const order = ordersData.find(o => o.order_items.some(i => i.product_key === key));
        if (order) {
            const item = order.order_items.find(i => i.product_key === key);
            if (item && item.supplier_delivery) {
                // Reuse logic similar to sellerLogic.js or simple inline fallback
                const dData = item.supplier_delivery;
                let name = "";
                let phone = "";

                if (Array.isArray(dData) && dData.length > 0 && dData[0].delivery_name) {
                    name = dData[0].delivery_name;
                    phone = dData[0].delivery_phone;
                } else if (dData.delivery_name) {
                    name = Array.isArray(dData.delivery_name) ? dData.delivery_name[0] : dData.delivery_name;
                    phone = Array.isArray(dData.delivery_phone) ? dData.delivery_phone[0] : dData.delivery_phone;
                }

                if (name) {
                    deliveryInfo = `<br><small style="color: var(--text-secondary);">${window.langu('ui_label_delivery_agent')} <strong style="color: var(--color-primary);">${name}</strong> ${phone ? `<a href="tel:${phone}" style="color: var(--color-shipped); text-decoration: none; margin-right: 5px;">(${phone}) <i class="fas fa-phone-alt" style="font-size: 0.8em;"></i></a>` : ''}</small>`;
                }
            }
        }

        return `
            <li id="confirmed-item-${key}" style="border-bottom: 1px solid var(--border-light); padding: 8px 0;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex-grow: 1;">
                        <span style="font-weight: bold;">${productName}</span>
                        ${deliveryInfo}
                        
                    </div>
                    <button type="button" class="btn-show-key" data-key="${key}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid var(--border-light); background: var(--bg-neutral); border-radius: 4px; margin-right: 5px; color: var(--text-primary);"><i class="fas fa-eye"></i></button>
                </div>
            </li>
        `;
    }).join("");
    return `<div id="confirmed-products-container"><p>${window.langu('ui_confirmed_by_seller_title')}</p><ul id="confirmed-products-list" style="list-style: none; padding: 0; margin-top: 10px;">${itemsHtml}</ul></div>`;
}

/**
 * Generates HTML for the "Delivery Service" view of confirmed products.
 * Shows products grouped by Seller with Seller details.
 * @param {Array<{seller: object, products: Array<object>}>} groupedData
 * @returns {string} HTML string.
 */
export function generateSellerGroupedHtml(groupedData) {
    if (!groupedData || groupedData.length === 0) return `<p class='text-center'>${window.langu('ui_no_products')}</p>`;

    const groupsHtml = groupedData.map(group => `
        <div class="seller-group-container" style="margin-bottom: 20px; border: 1px solid var(--border-light); border-radius: 8px; overflow: hidden;">
            <div class="seller-header" style="background-color: var(--bg-secondary); padding: 10px; border-bottom: 1px solid var(--border-light); text-align: right; direction: rtl;">
                <h5 style="margin: 0; color: var(--color-primary); font-size: 1.1em; font-weight: bold;">${window.langu('ui_label_seller')} ${group.seller.name}</h5>
                <div style="font-size: 0.9em; color: var(--text-secondary); margin-top: 5px;">
                    <span><i class="fas fa-phone"></i> <a href="tel:${group.seller.phone}" style="color: #007bff; text-decoration: none; font-weight: bold;">${group.seller.phone}</a></span> | 
                    <span>
                        <i class="fas fa-map-marker-alt"></i> ${group.seller.address}
                        ${(group.seller.location && group.seller.location.trim() !== "") ? `
                            <button class="btn-view-seller-map" 
                                    data-lat="${group.seller.location.split(',')[0].trim()}" 
                                    data-lng="${group.seller.location.split(',')[1].trim()}"
                                    data-name="${group.seller.name}"
                                    title="${window.langu('ui_view_on_map')}"
                                    style="margin-right: 5px; cursor: pointer; border: none; background: none; color: #007bff; font-size: 1.1em; padding: 0;">
                                <i class="fas fa-map-marked-alt"></i>
                            </button>
                        ` : `<!-- No Location Found for ${group.seller.name} -->`}
                    </span>
                </div>
            </div>
            <div class="seller-products" style="padding: 10px; overflow-x: auto;">
                <table style="width: 100%; min-width: 600px; text-align: right; direction: rtl; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-light);">
                            <th style="padding: 5px;">${window.langu('ui_col_product')}</th>
                            <th style="padding: 5px;">${window.langu('ui_col_unit_price')}</th>
                            <th style="padding: 5px;">${window.langu('ui_col_app_price')}</th>
                            <th style="padding: 5px;">${window.langu('ui_col_quantity')}</th>
                            <th style="padding: 5px;">${window.langu('ui_col_total')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${group.products.map(p => `
                            <tr style="border-bottom: 1px solid var(--border-light);">
                                <td style="padding: 8px; white-space: nowrap;">${p.name}</td>
                                <td style="padding: 8px; white-space: nowrap;">${p.price.toFixed(2)}</td>
                                <td style="padding: 8px; color: #d97706; font-weight: bold; white-space: nowrap;">${p.realPrice.toFixed(2)}</td>
                                <td style="padding: 8px; white-space: nowrap;">${p.quantity}</td>
                                <td style="padding: 8px; white-space: nowrap;">${(p.price * p.quantity).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot style="background: var(--bg-secondary); font-weight: bold;">
                        <tr>
                            <td colspan="4" style="padding: 8px; text-align: right;">${window.langu('ui_total_seller_account')}</td>
                            <td style="padding: 8px;">${group.products.reduce((sum, p) => sum + (p.price * p.quantity), 0).toFixed(2)} ${window.langu('ui_currency_egp')}</td>
                        </tr>
                        <tr>
                            <td colspan="4" style="padding: 8px; text-align: right; color: #d97706;">${window.langu('ui_total_app_price')}</td>
                            <td style="padding: 8px; color: #d97706;">${group.products.reduce((sum, p) => sum + (p.realPrice * p.quantity), 0).toFixed(2)} ${window.langu('ui_currency_egp')}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `).join("");

    const grandTotal = groupedData.reduce((total, group) => {
        return total + group.products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    }, 0);

    const grandTotalReal = groupedData.reduce((total, group) => {
        return total + group.products.reduce((sum, p) => sum + (p.realPrice * p.quantity), 0);
    }, 0);

    return groupsHtml + `
        <div class="grand-total-container" style="margin-top: 20px; padding: 15px; background-color: #e9ecef; border-radius: 8px; text-align: center; border: 2px solid #dee2e6;">
            <h4 style="margin: 0; font-weight: bold; color: var(--text-primary);">${window.langu('ui_total_sales_price')} ${grandTotal.toFixed(2)} ${window.langu('ui_currency_egp')}</h4>
            <h4 style="margin: 10px 0 0 0; color: #d97706; font-weight: bold;">${window.langu('ui_total_app_price_summary')} ${grandTotalReal.toFixed(2)} ${window.langu('ui_currency_egp')}</h4>
        </div>
    `;
}

