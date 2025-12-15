/**
 * @file buyerUi.js
 * @description Buyer UI Module.
 * Contains functions responsible for generating HTML strings for buyer-related popups.
 * Completely separated from business logic.
 */

import { loadItemStatus } from "./stateManagement.js";
import { ITEM_STATUS } from "./config.js";
import { getProductName } from "./commonUtils.js";

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
        return '<div style="text-align: center; padding: 20px; color: #666;">لا توجد منتجات للمراجعة حالياً (No products found).</div>';
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
                    <label for="review-checkbox-${productKey}" style="margin-right: 8px;">${productName} <small>(${status})</small></label>
                </div>
                <button type="button" class="btn-show-key" data-key="${productKey}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px;">Product</button>
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
        return '<p id="no-cancelled-items-message">لا توجد منتجات تم إلغاؤها حالياً</p>';
    }
    const itemsHtml = cancelledKeys.map((key) => {
        const productName = getProductName(key, ordersData);
        return `
            <li id="cancelled-item-${key}" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <span>${productName}</span>
                <button type="button" class="btn-show-key" data-key="${key}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px;">Product</button>
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
         <div class="user-details-container" style="margin-bottom: 15px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; width: 100%; text-align: right;">
            <p><strong>Name:</strong> ${user.name}</p>
            <p><strong>Phone:</strong> ${user.phone}</p>
            <p><strong>Address:</strong> ${user.address}</p>
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
                  <button type="button" class="btn-show-key" data-key="${item.product_key}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px;">Product</button>
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
        return '<p id="no-returned-items-message">لا توجد منتجات تم إرجاعها حالياً</p>';
    }
    const itemsHtml = returnedKeys.map((key) => {
        const productName = getProductName(key, ordersData);
        return `
            <li id="returned-item-${key}" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <span>${productName}</span>
                <button type="button" class="btn-show-key" data-key="${key}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px;">Product</button>
            </li>
        `;
    }).join("");
    return `<div id="returned-products-container"><p>Returned products:</p><ul id="returned-products-list" style="text-align: right; margin-top: 1rem; padding-right: 2rem; width: 100%;">${itemsHtml}</ul></div>`;
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
        return '<p id="no-confirmed-items-message">لا توجد منتجات مؤكدة بعد.</p>';
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
                    deliveryInfo = `<br><small style="color: #666;">المندوب: ${name} ${phone ? `(${phone})` : ''}</small>`;
                }
            }
        }

        return `
            <li id="confirmed-item-${key}" style="border-bottom: 1px solid #eee; padding: 8px 0;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex-grow: 1;">
                        <span style="font-weight: bold;">${productName}</span>
                        ${deliveryInfo}
                        <br><small style="color:green">الحالة: ${status}</small>
                    </div>
                    <button type="button" class="btn-show-key" data-key="${key}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px; margin-right: 5px;">Product</button>
                </div>
            </li>
        `;
    }).join("");
    return `<div id="confirmed-products-container"><p>المنتجات التي تم تأكيدها بواسطة البائع:</p><ul id="confirmed-products-list" style="list-style: none; padding: 0; margin-top: 10px;">${itemsHtml}</ul></div>`;
}
