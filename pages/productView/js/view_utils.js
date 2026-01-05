/**
 * @file pages/productView/js/view_utils.js
 * @description Calculation and utility functions for ProductView.
 */

/**
 * @function productView_updateTotalPrice
 * @description Updates the total price display based on selected quantity and price per item.
 * @param {number} pricePerItem - The price of a single item.
 * @param {Object} dom - The DOM elements object.
 */
function productView_updateTotalPrice(pricePerItem, dom) {
    try {
        const price = parseFloat(pricePerItem);
        const quantity = parseInt(dom.selectedQuantityInput.value, 10) || 1;
        const total = price * quantity;
        if (dom.totalPriceEl) {
            dom.totalPriceEl.textContent = `${total.toFixed(2)} ${window.langu("pv_currency_egp")}`;
        }
    } catch (error) {
        console.error("productView_updateTotalPrice - Error:", error);
    }
}
