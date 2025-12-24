/**
 * @file sellerUi.js
 * @description Seller UI Module.
 * Contains functions responsible for generating HTML strings for seller-related popups.
 */

import { loadItemStatus } from "./stateManagement.js";
import { ITEM_STATUS } from "./config.js";
import { getProductName } from "./commonUtils.js";

/**
 * Helper to generate a cell with a checkbox and product button.
 * @function generateCheckboxCell
 * @param {string} productKey
 * @param {string} productName
 * @param {boolean} isChecked
 * @param {boolean} isDisabled
 * @param {string} inputName
 * @returns {string}
 */
export function generateCheckboxCell(productKey, productName, isChecked, isDisabled, inputName) {
    return `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <div style="display: flex; align-items: center;">
                <input type="checkbox" 
                       id="seller-confirmation-checkbox-${productKey}" 
                       name="${inputName}" 
                       value="${productKey}"
                       data-product-name="${productName}"
                       ${isChecked ? "checked" : ""} 
                       ${isDisabled ? "disabled" : ""}
                       style="margin-left: 8px;">
                <label for="seller-confirmation-checkbox-${productKey}">${productName}</label>
            </div>
            <button type="button" class="btn-show-key" data-key="${productKey}" 
                    style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px;">
                <i class="fas fa-eye"></i>
            </button>
        </div>
    `;
}

/**
 * Generates the HTML for the confirmation table.
 * @function generateConfirmationTableHtml
 * @param {Array<object>} products
 * @param {Array<object>} ordersData - Needed for fallback name lookup
 * @returns {string} HTML string.
 */
export function generateConfirmationTableHtml(products, ordersData) {
    if (products.length === 0) {
        return "<p>لا توجد منتجات لعرضها.</p>";
    }

    const tableRows = products.map(product => {
        const currentStatus = loadItemStatus(product.product_key);
        const isChecked = currentStatus === ITEM_STATUS.CONFIRMED ||
            currentStatus === ITEM_STATUS.SHIPPED ||
            currentStatus === ITEM_STATUS.DELIVERED;
        const isDisabled = currentStatus === ITEM_STATUS.SHIPPED || currentStatus === ITEM_STATUS.DELIVERED;

        // Use pre-extracted name or fallback
        const productName = product.product_name || getProductName(product.product_key, ordersData);
        // Safely map delivery info even if empty
        const agentNames = product.delivery_info ? product.delivery_info.map(d => `<strong style="color: #03478f;">${d.name}</strong>`).join("<br>") : '-';
        const agentPhones = product.delivery_info ? product.delivery_info.map(d => `<a href="tel:${d.phone}" style="color: #007bff; text-decoration: none; font-weight: bold;">${d.phone} <i class="fas fa-phone-alt" style="font-size: 0.8em;"></i></a>`).join("<br>") : '-';

        return `
            <tr id="seller-confirmation-item-${product.product_key}">
                <td style="padding: 8px; border: 1px solid #ddd;">
                     ${generateCheckboxCell(product.product_key, productName, isChecked, isDisabled, 'sellerProductKeys')}
                </td>
                <td style="padding: 8px; border: 1px solid #ddd;">${product.note || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${agentNames || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${agentPhones || '-'}</td>
            </tr>
        `;
    }).join("");

    return `
        <div style="width: 100%; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 0.9em;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="padding: 8px; border: 1px solid #ddd; color: #03478f;">المنتج (حدد للتأكيد)</th>
                        <th style="padding: 8px; border: 1px solid #ddd; color: #03478f;">ملاحظات</th>
                        <th style="padding: 8px; border: 1px solid #ddd; color: #03478f;">مندوب التوصيل</th>
                        <th style="padding: 8px; border: 1px solid #ddd; color: #03478f;">رقم الهاتف</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>
    `;
}

/**
 * Generates the HTML for the rejected products list.
 * @function generateRejectedListHtml
 * @param {Array<object>} products
 * @returns {string} HTML string.
 */
export function generateRejectedListHtml(products) {
    if (products.length === 0) {
        return '<p>لا توجد منتجات مرفوضة.</p>';
    }

    const itemsHtml = products.map(item => `
        <li style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <span>${item.product_name}</span>
            <button type="button" class="btn-show-key" data-key="${item.product_key}" 
                    style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px;">
                <i class="fas fa-eye"></i>
            </button>
        </li>
    `).join("");

    return `<p>المنتجات المرفوضة:</p><ul style="text-align: right; margin-top: 1rem; padding-right: 2rem; width: 100%;">${itemsHtml}</ul>`;
}

/**
 * Generates the HTML for the shipping table.
 * @function generateShippingTableHtml
 * @param {Array<object>} products
 * @returns {string} HTML string.
 */
export function generateShippingTableHtml(products) {
    const tableRows = products.map(item => {
        const status = loadItemStatus(item.product_key);
        const isShipped = status === ITEM_STATUS.SHIPPED || status === ITEM_STATUS.DELIVERED;
        const isDisabled = status === ITEM_STATUS.DELIVERED;

        // Extract delivery info for display
        const names = item.delivery_info ? item.delivery_info.map(d => `<strong style="color: #03478f;">${d.name}</strong>`).join(", ") : '-';
        const phones = item.delivery_info ? item.delivery_info.map(d => `<a href="tel:${d.phone}" style="color: #007bff; text-decoration: none; font-weight: bold;">${d.phone}</a>`).join(", ") : '-';

        return `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">
                    <label>
                        <input type="checkbox"
                               name="shippingProductKeys"
                               value="${item.product_key}" 
                               ${isShipped ? "checked" : ""} 
                               ${isDisabled ? "disabled" : ""}
                               style="margin-left: 5px;">
                        ${item.product_name}
                    </label> 
                    <button type="button" class="btn-show-key" data-key="${item.product_key}" 
                            style="float:left; padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px; margin-right: 5px;">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
                <td style="padding: 8px; border: 1px solid #ddd;">${names || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${phones || '-'}</td>
            </tr>
        `;
    }).join("");

    return `
        <div style="width: 100%; overflow-x: auto;">
            <p>حدد المنتجات لتغيير حالتها إلى "مشحون":</p>
            <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 0.9em; margin-top: 10px;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="padding: 8px; border: 1px solid #ddd; color: #03478f;">المنتج</th>
                        <th style="padding: 8px; border: 1px solid #ddd; color: #03478f;">موصل</th>
                        <th style="padding: 8px; border: 1px solid #ddd; color: #03478f;">هاتف</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>
    `;
}
