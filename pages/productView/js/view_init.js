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
        console.log(`[productView_] عرض تفاصيل المنتج: ${productData.productName} (MainID: ${productData.MainCategory})`);

        // Get fresh DOM elements
        const dom = productView_getDomElements();

        const {
            name, quantityValue, price, description, sellerMessage,
            quantityContainer, priceContainer, cartActionsContainer,
            originalPriceContainer, originalPrice,
            mainImage, thumbnailsContainer,
            realPriceContainer, realPrice,
            adminSellerInfo, adminSellerName, adminSellerKey,
            adminMainCategory, adminSubCategory
        } = dom;

        const showAddToCart = options.showAddToCart !== false; // Default is true

        // Configure Back Button
        if (dom.backBtn) {
            dom.backBtn.onclick = () => {
                if (typeof containerGoBack === 'function') {
                    containerGoBack();
                } else {
                    console.warn("[productView_] دالة containerGoBack غير معرفة.");
                }
            };
        }

        // Populate basic data
        if (name) name.textContent = productData.productName || window.langu("pv_not_available");
        if (description) description.textContent = productData.description || window.langu("pv_no_description");
        if (sellerMessage) sellerMessage.textContent = productData.sellerMessage || window.langu("pv_no_seller_message");

        // Configure display
        if (quantityContainer) quantityContainer.style.display = "flex";
        if (priceContainer) priceContainer.style.display = "flex";
        if (quantityValue) quantityValue.textContent = productData.availableQuantity || "0";
        if (price) price.textContent = `${productData.pricePerItem || 0} ${window.langu("pv_currency_egp")}`;

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

        // Enable pinch-to-zoom on the main image
        if (typeof productView_setupPinchZoom === 'function') {
            productView_setupPinchZoom(mainImage);
        }

        // Show original price if exists
        const originalPriceVal = productData.original_price ? parseFloat(productData.original_price) : 0;
        const currentPriceVal = productData.pricePerItem ? parseFloat(productData.pricePerItem) : 0;

        if (originalPriceVal > 0 && originalPriceVal > currentPriceVal) {
            if (originalPrice) originalPrice.textContent = `${originalPriceVal.toFixed(2)} ${window.langu("pv_currency_egp")}`;
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
                if (adminSellerName) adminSellerName.textContent = productData.sellerName || window.langu("pv_not_available");
                if (adminSellerKey) adminSellerKey.textContent = productData.user_key || window.langu("pv_not_available");

                    if (realPrice) {
                        realPrice.textContent = `${productData.realPrice || 0} ${window.langu("pv_currency_egp")}`;
                    }
                    if (realPriceContainer) {
                        realPriceContainer.style.display = "block";
                    }

                    if (dom.heavyLoadValue) {
                        dom.heavyLoadValue.textContent = productData.heavyLoad == 1 ? window.langu("alert_confirm_yes") : window.langu("alert_confirm_no");
                    }
                    if (dom.heavyLoadContainer) {
                        dom.heavyLoadContainer.style.display = "block";
                    }

                    // Populate category names asynchronously
                    if (adminMainCategory || adminSubCategory) {
                        productView_getCategoryNames(productData.MainCategory, productData.SubCategory)
                            .then(names => {
                                if (adminMainCategory) adminMainCategory.textContent = names.main;
                                if (adminSubCategory) adminSubCategory.textContent = names.sub;
                            });
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

/**
 * @function productView_getCategoryNames
 * @description Fetches category and subcategory names from list.json.
 * @param {number|string} mainId
 * @param {number|string} subId
 * @returns {Promise<{main: string, sub: string}>}
 */
async function productView_getCategoryNames(mainId, subId) {
    try {
        const data = window.appCategoriesList || await fetchAppCategories();
        if (!data) throw new Error(window.langu("pv_error_fetching_categories"));
        const mainCat = data.categories.find(c => String(c.id) === String(mainId));
        if (!mainCat) return { main: window.langu("unknown_status"), sub: "-" };

        let subName = "-";
        if (subId && mainCat.subcategories) {
            const subCat = mainCat.subcategories.find(s => String(s.id) === String(subId));
            if (subCat) {
                const subTitleObj = subCat.title;
                subName = typeof subTitleObj === 'object' ? 
                    (subTitleObj[window.app_language] || subTitleObj['ar']) : subTitleObj;
            }
        }

        const mainTitleObj = mainCat.title;
        const mainName = typeof mainTitleObj === 'object' ? 
            (mainTitleObj[window.app_language] || mainTitleObj['ar']) : mainTitleObj;

        return { main: mainName, sub: subName };
    } catch (e) {
        console.error("Error fetching category names:", e);
        return { main: window.langu("pv_load_failed"), sub: window.langu("pv_load_failed") };
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
            console.warn("[ProductView] " + window.langu("pv_no_product_data"));
        }
    } catch (error) {
        console.error(window.langu("pv_error_init"), error);
    }
})();
