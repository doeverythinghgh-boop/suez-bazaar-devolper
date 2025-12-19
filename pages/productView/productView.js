
/**
 * @fileoverview Product View Details Logic (productView_ module)
 * @description Handles displaying product details, image gallery, managing quantity selection, and adding to cart.
 */

// ==============================================
//  DOM Access (Separation of Concerns - SRP)
// ==============================================

/**
 * @function productView_getDomElements
 * @description Retrives current DOM elements to avoid stale references.
 * @returns {Object} object containing fresh DOM elements.
 */
function productView_getDomElements() {
    return {
        // Main Containers
        quantityContainer: document.getElementById("productView_quantity_container"),
        priceContainer: document.getElementById("productView_price_container"),
        cartActionsContainer: document.getElementById("productView_cart_actions"),
        originalPriceContainer: document.getElementById("productView_original_price_container"),

        // Product Data Elements
        name: document.getElementById("productView_name"),
        quantityValue: document.getElementById("productView_quantity_value"),
        price: document.getElementById("productView_price"),
        originalPrice: document.getElementById("productView_original_price"),
        description: document.getElementById("productView_description_text"),
        sellerMessage: document.getElementById("productView_seller_message_text"),

        // Images
        mainImage: document.getElementById("productView_image"),
        thumbnailsContainer: document.getElementById("productView_thumbnails_container"),

        // Controls
        decreaseBtn: document.getElementById("productView_decrease_quantity_btn"),
        increaseBtn: document.getElementById("productView_increase_quantity_btn"),
        selectedQuantityInput: document.getElementById("productView_selected_quantity_input"),
        totalPriceEl: document.getElementById("productView_total_price"),
        addToCartBtn: document.getElementById("productView_add_to_cart_btn"),
    };
}


// ==============================================
//  Helper Functions (Modularity)
// ==============================================

/**
 * @function productView_updateTotalPrice
 * @description Updates the total price display based on selected quantity and price per item.
 * @param {number} pricePerItem - The price of a single item.
 * @param {Object} dom - The DOM elements object.
 */
function productView_updateTotalPrice(pricePerItem, dom) {
    try {
        const price = parseFloat(pricePerItem);
        // Get value from input field
        const quantity = parseInt(dom.selectedQuantityInput.value, 10) || 1;
        const total = price * quantity;
        dom.totalPriceEl.textContent = `${total.toFixed(2)} جنيه`;
    } catch (error) {
        console.error("productView_updateTotalPrice - خطأ في تحديث السعر الإجمالي:", error);
    }
}

/**
 * @function productView_populateThumbnails
 * @description Creates and handles product image thumbnails.
 * @param {string[]} imageSrcArray - Array of image source URLs.
 * @param {HTMLElement} mainImageEl - The main image element (<img>).
 * @param {HTMLElement} thumbnailsContainerEl - The container for thumbnails.
 */
function productView_populateThumbnails(imageSrcArray, mainImageEl, thumbnailsContainerEl) {
    try {
        if (!thumbnailsContainerEl || !mainImageEl) return;

        thumbnailsContainerEl.innerHTML = ""; // Clear old thumbnails
        mainImageEl.src = imageSrcArray[0] || ""; // Show first image

        imageSrcArray.forEach((src) => {
            const thumb = document.createElement("img");
            thumb.alt = "Product Thumbnail";
            thumb.src = src;

            thumb.onclick = () => { // On click, update main image
                mainImageEl.src = src;
                // Remove 'active' class from all and add to selected
                document.querySelectorAll('.productView_thumbnails_container img').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            };

            thumb.onerror = () => {
                console.warn("[productView_] فشل تحميل الصورة المصغرة:", src);
                // Replace failed image with placeholder (CSS can improve this)
                const placeholder = document.createElement("div");
                placeholder.className = "image-load-error-placeholder";
                placeholder.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>فشل التحميل</span>`;
                thumb.replaceWith(placeholder);
            };
            thumbnailsContainerEl.appendChild(thumb);
        });

        // Activate first thumbnail by default (small delay to ensure append)
        setTimeout(() => {
            if (thumbnailsContainerEl.firstChild) thumbnailsContainerEl.firstChild.classList.add('active');
        }, 0);

    } catch (error) {
        console.error("productView_populateThumbnails - خطأ في إنشاء الصور المصغرة:", error);
    }
}

/**
 * @function productView_setupQuantityControls
 * @description Sets up logic for increasing/decreasing quantity and updating total price.
 * @param {object} productData - The product data object.
 * @param {Object} dom - The DOM elements object.
 */
function productView_setupQuantityControls(productData, dom) {
    try {
        const { decreaseBtn, increaseBtn, selectedQuantityInput } = dom;

        if (!decreaseBtn || !increaseBtn || !selectedQuantityInput) {
            console.error("productView_setupQuantityControls - Missing DOM elements");
            return;
        }

        // Set max quantity available
        selectedQuantityInput.max = productData.availableQuantity;
        selectedQuantityInput.value = 1; // Reset to 1

        // Use productData.pricePerItem to ensure price is updated correctly
        const pricePerItem = productData.pricePerItem;

        // Shared handler to avoid code duplication
        const quantityChangeHandler = () => {
            // Ensure value does not exceed max or fall below min (1)
            let quantity = parseInt(selectedQuantityInput.value, 10);
            const max = parseInt(selectedQuantityInput.max, 10);

            if (quantity < 1 || isNaN(quantity)) {
                selectedQuantityInput.value = 1;
            } else if (quantity > max) {
                selectedQuantityInput.value = max;
            }
            productView_updateTotalPrice(pricePerItem, dom);
        };

        // Remove old event listeners by replacing the element logic (or simply overwriting onclick which is what we do here)

        // Add events for increase/decrease buttons
        decreaseBtn.onclick = () => {
            if (parseInt(selectedQuantityInput.value, 10) > 1) {
                selectedQuantityInput.value = parseInt(selectedQuantityInput.value, 10) - 1;
                productView_updateTotalPrice(pricePerItem, dom);
            }
        };

        increaseBtn.onclick = () => {
            console.log("[productView_] النقر على زر الزيادة...");
            const currentVal = parseInt(selectedQuantityInput.value, 10) || 1;
            let maxAttr = parseInt(selectedQuantityInput.max, 10);

            // Defensive Check: If max is not a valid number or 0, we allow incrementing up to a safe limit (e.g. 999)
            // or we trust the productData. If it's 0, we treat it as 1 to allow selection.
            if (isNaN(maxAttr) || maxAttr <= 0) {
                console.warn("[productView_] تنبيه: الكمية القصوى غير صالحة، استخدام قيمة افتراضية.");
                maxAttr = 999;
            }

            if (currentVal < maxAttr) {
                selectedQuantityInput.value = currentVal + 1;
                productView_updateTotalPrice(pricePerItem, dom);
            } else {
                console.log("[productView_] تم الوصول للحد الأقصى للكمية المتاحة.");
            }
        };

        // Handle manual input change
        selectedQuantityInput.onchange = quantityChangeHandler;
        selectedQuantityInput.onblur = quantityChangeHandler;

        productView_updateTotalPrice(pricePerItem, dom); // Initial price calculation

    } catch (error) {
        console.error("productView_setupQuantityControls - خطأ في تهيئة أدوات التحكم بالكمية:", error);
    }
}

/**
 * @function productView_setupAddToCart
 * @description Initializes logic for adding the product to the shopping cart.
 * @param {object} productData - The product data object.
 * @param {Object} dom - The DOM elements object.
 */
function productView_setupAddToCart(productData, dom) {
    try {
        if (!dom.addToCartBtn) return;

        dom.addToCartBtn.onclick = async () => {

            if (showLoginAlert()) {
                console.log("[productView_] المستخدم مسجل دخول، جاري الإضافة للسلة...");
                const quantity = parseInt(dom.selectedQuantityInput.value, 10);

                const productInfoForCart = {
                    product_key: productData.product_key,
                    productName: productData.productName,
                    price: productData.pricePerItem,
                    original_price: productData.original_price,
                    image: productData.imageSrc[0],
                    seller_key: productData.user_key,
                };
                addToCart(productInfoForCart, quantity); // Defined externally
            }
        };
    } catch (error) {
        console.error("productView_setupAddToCart - خطأ في تهيئة زر الإضافة إلى السلة:", error);
    }
}


// ==============================================
//  Main Function (SRP)
// ==============================================

/**
 * @function productView_viewDetails
 * @description Displays product details in the modal and initializes interactive functions.
 *   This is the main entry point for displaying product data.
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
        } = dom;

        const showAddToCart = options.showAddToCart !== false; // Default is true

        // Populate basic data
        if (name) name.textContent = productData.productName || "غير متوفر";
        if (description) description.textContent = productData.description || "لا يوجد وصف متاح.";
        if (sellerMessage) sellerMessage.textContent = productData.sellerMessage || "لا توجد رسالة من البائع.";

        // Configure display based on showAddToCart option
        if (showAddToCart) {
            if (quantityContainer) quantityContainer.style.display = "flex";
            if (priceContainer) priceContainer.style.display = "flex";
            if (cartActionsContainer) cartActionsContainer.style.display = "block";
            if (quantityValue) quantityValue.textContent = productData.availableQuantity;
            if (price) price.textContent = `${productData.pricePerItem} جنيه`;
            productView_setupQuantityControls(productData, dom);
            productView_setupAddToCart(productData, dom);
        } else {
            if (quantityContainer) quantityContainer.style.display = "none";
            if (priceContainer) priceContainer.style.display = "none";
            if (cartActionsContainer) cartActionsContainer.style.display = "none";
        }

        // Populate image gallery
        productView_populateThumbnails(
            productData.imageSrc || [],
            mainImage,
            thumbnailsContainer
        );

        // Show original price if exists and greater than current price
        const originalPriceVal = productData.original_price ? parseFloat(productData.original_price) : 0;
        const currentPriceVal = productData.pricePerItem ? parseFloat(productData.pricePerItem) : 0;

        if (originalPriceVal > 0 && originalPriceVal > currentPriceVal) {
            console.log("[productView_] إظهار السعر الأصلي.");
            if (originalPrice) originalPrice.textContent = `${originalPriceVal.toFixed(2)} جنيه`;
            if (originalPriceContainer) originalPriceContainer.style.display = "flex";
        } else {
            console.log("[productView_] إخفاء السعر الأصلي.");
            if (originalPriceContainer) originalPriceContainer.style.display = "none";
            if (originalPrice) originalPrice.textContent = "";
        }

    } catch (error) {
        console.error("productView_viewDetails - خطأ عام في عرض التفاصيل:", error);

    }
}

// ==============================================
//  Entry Point (Initialization)
// ==============================================

try {
    // Get product data from state manager (new approach)
    const productData = ProductStateManager.getCurrentProduct();
    const viewOptions = ProductStateManager.getViewOptions();

    console.log("تهيئة وحدة عرض المنتج من State Manager:", productData, viewOptions);

    if (productData) {
        productView_viewDetails(productData, viewOptions);
    } else {
        // Fallback to old approach for backward compatibility
        console.warn("[productView] لم يتم العثور على بيانات في State Manager، استخدام productSession");
        if (typeof productSession !== 'undefined' && productSession) {
            productView_viewDetails(productSession[0], productSession[1]);
        } else {
            console.error("[productView] لا توجد بيانات منتج للعرض");
        }
    }
} catch (error) {
    console.error("خطأ في تهيئة نافذة عرض المنتج:", error);
}
