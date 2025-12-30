/**
 * @file pages/productView/js/view_ui.js
 * @description DOM management and UI interactions for ProductView.
 */

/**
 * @function productView_getDomElements
 * @description Retriving fresh DOM elements.
 * @returns {Object}
 */
function productView_getDomElements() {
    return {
        quantityContainer: document.getElementById("productView_quantity_container"),
        priceContainer: document.getElementById("productView_price_container"),
        cartActionsContainer: document.getElementById("productView_cart_actions"),
        originalPriceContainer: document.getElementById("productView_original_price_container"),
        name: document.getElementById("productView_name"),
        quantityValue: document.getElementById("productView_quantity_value"),
        price: document.getElementById("productView_price"),
        originalPrice: document.getElementById("productView_original_price"),
        description: document.getElementById("productView_description_text"),
        sellerMessage: document.getElementById("productView_seller_message_text"),
        mainImage: document.getElementById("productView_image"),
        thumbnailsContainer: document.getElementById("productView_thumbnails_container"),
        decreaseBtn: document.getElementById("productView_decrease_quantity_btn"),
        increaseBtn: document.getElementById("productView_increase_quantity_btn"),
        selectedQuantityInput: document.getElementById("productView_selected_quantity_input"),
        totalPriceEl: document.getElementById("productView_total_price"),
        addToCartBtn: document.getElementById("productView_add_to_cart_btn"),
        realPriceContainer: document.getElementById("productView_real_price_container"),
        realPrice: document.getElementById("productView_real_price"),
        adminSellerInfo: document.getElementById("productView_admin_seller_info"),
        adminSellerName: document.getElementById("productView_admin_seller_name"),
        adminSellerKey: document.getElementById("productView_admin_seller_key"),
        adminMainCategory: document.getElementById("productView_admin_main_category"),
        adminSubCategory: document.getElementById("productView_admin_sub_category"),
        heavyLoadContainer: document.getElementById("productView_heavy_load_container"),
        heavyLoadValue: document.getElementById("productView_heavy_load_value"),
    };
}

/**
 * @function productView_populateThumbnails
 */
function productView_populateThumbnails(imageSrcArray, mainImageEl, thumbnailsContainerEl) {
    try {
        if (!thumbnailsContainerEl || !mainImageEl) return;
        thumbnailsContainerEl.innerHTML = "";
        mainImageEl.src = imageSrcArray[0] || "";

        imageSrcArray.forEach((src) => {
            const thumb = document.createElement("img");
            thumb.alt = "Product Thumbnail";
            thumb.src = src;

            thumb.onclick = () => {
                mainImageEl.src = src;
                document.querySelectorAll('.productView_thumbnails_container img').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            };

            thumb.onerror = () => {
                console.warn("[productView_] فشل تحميل الصورة المصغرة:", src);
                const placeholder = document.createElement("div");
                placeholder.className = "image-load-error-placeholder";
                placeholder.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>فشل التحميل</span>`;
                thumb.replaceWith(placeholder);
            };
            thumbnailsContainerEl.appendChild(thumb);
        });

        setTimeout(() => {
            if (thumbnailsContainerEl.firstChild) thumbnailsContainerEl.firstChild.classList.add('active');
        }, 0);
    } catch (error) {
        console.error("productView_populateThumbnails - خطأ في إنشاء الصور المصغرة:", error);
    }
}

/**
 * @function productView_setupQuantityControls
 */
function productView_setupQuantityControls(productData, dom) {
    try {
        const { decreaseBtn, increaseBtn, selectedQuantityInput } = dom;
        if (!decreaseBtn || !increaseBtn || !selectedQuantityInput) return;

        selectedQuantityInput.max = productData.availableQuantity;
        selectedQuantityInput.value = 1;
        const pricePerItem = productData.pricePerItem;

        const quantityChangeHandler = () => {
            let quantity = parseInt(selectedQuantityInput.value, 10);
            const max = parseInt(selectedQuantityInput.max, 10);
            if (quantity < 1 || isNaN(quantity)) selectedQuantityInput.value = 1;
            else if (quantity > max) selectedQuantityInput.value = max;
            productView_updateTotalPrice(pricePerItem, dom);
        };

        decreaseBtn.onclick = () => {
            if (parseInt(selectedQuantityInput.value, 10) > 1) {
                selectedQuantityInput.value = parseInt(selectedQuantityInput.value, 10) - 1;
                productView_updateTotalPrice(pricePerItem, dom);
            }
        };

        increaseBtn.onclick = () => {
            const currentVal = parseInt(selectedQuantityInput.value, 10) || 1;
            let maxAttr = parseInt(selectedQuantityInput.max, 10);
            if (isNaN(maxAttr) || maxAttr <= 0) maxAttr = 999;

            if (currentVal < maxAttr) {
                selectedQuantityInput.value = currentVal + 1;
                productView_updateTotalPrice(pricePerItem, dom);
            } else {
                Swal.fire({ icon: 'warning', text: 'تم الوصول للحد الأقصى للكمية المتاحة.', confirmButtonText: 'موافق' });
            }
        };

        selectedQuantityInput.onchange = quantityChangeHandler;
        selectedQuantityInput.onblur = quantityChangeHandler;
        productView_updateTotalPrice(pricePerItem, dom);
    } catch (error) {
        console.error("productView_setupQuantityControls - خطأ في تهيئة أدوات التحكم بالكمية:", error);
    }
}

/**
 * @function productView_setupAddToCart
 */
function productView_setupAddToCart(productData, dom) {
    try {
        if (!dom.addToCartBtn) return;
        dom.addToCartBtn.onclick = async () => {
            if (showLoginAlert()) {
                const quantity = parseInt(dom.selectedQuantityInput.value, 10);
                console.log("[productView_] بيانات المنتج قبل الإضافة للسلة:", productData);
                const productInfoForCart = {
                    product_key: productData.product_key,
                    productName: productData.productName,
                    price: productData.pricePerItem,
                    original_price: productData.original_price,
                    image: productData.imageSrc[0],
                    seller_key: productData.user_key,
                    sellerName: productData.seller_name || productData.sellerName || productData.seller_username || "",
                    heavyLoad: productData.heavyLoad || 0,  // ⬅️ إضافة معلومات الحمولة الثقيلة
                };

                // 🌍 Extract Seller Location Coordinates
                if (productData.seller_location && String(productData.seller_location).includes(',')) {
                    const [lat, lng] = String(productData.seller_location).split(',');
                    productInfoForCart.seller_lat = parseFloat(lat);
                    productInfoForCart.seller_lng = parseFloat(lng);
                    console.log(`%c✅ [Location] تم استخراج إحداثيات البائع: (${lat}, ${lng})`, "color: #27ae60; font-weight: bold;");
                } else {
                    console.warn("%c⚠️ [Location] تنبيه: المنتج لا يحتوي على إحداثيات بائع صالحة!", "color: #e67e22;");
                }

                addToCart(productInfoForCart, quantity);
            }
        };
    } catch (error) {
        console.error("productView_setupAddToCart - خطأ في تهيئة زر الإضافة إلى السلة:", error);
    }
}
