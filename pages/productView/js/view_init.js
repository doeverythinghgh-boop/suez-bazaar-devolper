/**
 * @file pages/productView/js/view_init.js
 * @description Main entry point for displaying product details.
 */

/**
 * @function productView_viewDetails
 * @description Displays product details in the modal and initializes interactive functions.
 * @param {object} productData - Product data object to display.
 * @param {object} options - Additional display options (e.g., { showAddToCart: true }).
 */
function productView_viewDetails(productData, options = {}) {
    try {
        console.log("[productView_] عرض تفاصيل المنتج...", options.showAddToCart);

        // Get fresh DOM elements
        const dom = productView_getDomElements();

        const {
            name, quantityValue, price, description, sellerMessage,
            quantityContainer, priceContainer, cartActionsContainer,
            originalPriceContainer, originalPrice,
            mainImage, thumbnailsContainer,
            realPriceContainer, realPrice,
            adminSellerInfo, adminSellerName, adminSellerKey
        } = dom;

        const showAddToCart = options.showAddToCart !== false; // Default is true

        // Populate basic data
        if (name) name.textContent = productData.productName || "غير متوفر";
        if (description) description.textContent = productData.description || "لا يوجد وصف متاح.";
        if (sellerMessage) sellerMessage.textContent = productData.sellerMessage || "لا توجد رسالة من البائع.";

        // Configure display
        if (quantityContainer) quantityContainer.style.display = "flex";
        if (priceContainer) priceContainer.style.display = "flex";
        if (quantityValue) quantityValue.textContent = productData.availableQuantity || "0";
        if (price) price.textContent = `${productData.pricePerItem || 0} جنيه`;

        if (showAddToCart) {
            if (cartActionsContainer) cartActionsContainer.style.display = "block";
            productView_setupQuantityControls(productData, dom);
            productView_setupAddToCart(productData, dom);
        } else {
            if (cartActionsContainer) cartActionsContainer.style.display = "none";
        }

        // Populate image gallery
        productView_populateThumbnails(
            productData.imageSrc || [],
            mainImage,
            thumbnailsContainer
        );

        // Show original price if exists
        const originalPriceVal = productData.original_price ? parseFloat(productData.original_price) : 0;
        const currentPriceVal = productData.pricePerItem ? parseFloat(productData.pricePerItem) : 0;

        if (originalPriceVal > 0 && originalPriceVal > currentPriceVal) {
            if (originalPrice) originalPrice.textContent = `${originalPriceVal.toFixed(2)} جنيه`;
            if (originalPriceContainer) originalPriceContainer.style.display = "flex";
        } else {
            if (originalPrice) originalPrice.textContent = "";
            if (originalPriceContainer) originalPriceContainer.style.display = "none";
        }

        // --- Role Based Logic ---
        const user = window.userSession;
        if (user) {
            const isSeller = String(user.user_key) === String(productData.user_key);
            const isAdmin = (typeof ADMIN_IDS !== "undefined" && ADMIN_IDS.includes(user.user_key));
            const isImpersonating = localStorage.getItem("originalAdminSession");

            if (isAdmin || isImpersonating || isSeller) {
                if (adminSellerInfo) {
                    // Fill data
                    if (adminSellerName) adminSellerName.textContent = productData.sellerName || "غير متوفر";
                    if (adminSellerKey) adminSellerKey.textContent = productData.user_key || "غير متوفر";

                    if (realPrice) {
                        realPrice.textContent = `${productData.realPrice || 0} جنيه`;
                    }
                    if (realPriceContainer) {
                        realPriceContainer.style.display = "block";
                    }

                    if (dom.heavyLoadValue) {
                        dom.heavyLoadValue.textContent = productData.heavyLoad == 1 ? "نعم" : "لا";
                    }
                    if (dom.heavyLoadContainer) {
                        dom.heavyLoadContainer.style.display = "block";
                    }

                    // Show the whole info box
                    adminSellerInfo.style.display = "block";

                    // Optional: adjust title if it's just the seller
                    const infoTitle = adminSellerInfo.querySelector('p');
                    if (infoTitle) {
                        infoTitle.innerHTML = `<i class="fas fa-user-shield"></i> بيانات تظهر للإدارة والبائع فقط:`;
                    }
                }
            } else {
                if (adminSellerInfo) adminSellerInfo.style.display = "none";
            }
        } else {
            if (adminSellerInfo) adminSellerInfo.style.display = "none";
        }

    } catch (error) {
        console.error("productView_viewDetails - خطأ عام في عرض التفاصيل:", error);
    }
}

// Entry Point (Initialization)
(function () {
    try {
        const productData = (typeof ProductStateManager !== 'undefined') ? ProductStateManager.getCurrentProduct() : null;
        const viewOptions = (typeof ProductStateManager !== 'undefined') ? ProductStateManager.getViewOptions() : {};

        if (productData) {
            productView_viewDetails(productData, viewOptions);
        } else {
            console.warn("[ProductView] لا توجد بيانات منتج في مدير الحالة");
        }
    } catch (error) {
        console.error("خطأ في تهيئة نافذة عرض المنتج:", error);
    }
})();
