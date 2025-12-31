/**
 * @file js/PRODUCT_SERVICE/productMapper.js
 * @description Centralized mapper to transform raw product data from various API endpoints into a unified frontend format.
 * This ensures consistency across different views (Categories, Search, Sales Movement, etc.) and makes maintenance easier.
 * @author Hisham
 */

/**
 * @description Maps raw product data to a unified format used by the Product View and Cart.
 * @function mapProductData
 * @param {Object} rawProduct - The raw product object from the API.
 * @returns {Object} The formatted product object for the frontend.
 * @global
 */
var mapProductData = function (rawProduct) {
    if (!rawProduct) {
        console.warn("[ProductMapper] Attempted to map null or undefined product.");
        return {};
    }

    // 1. Process Images
    // Split comma-separated image names and convert to full URLs
    var imageNames = rawProduct.ImageName ? rawProduct.ImageName.split(",") : [];
    var imageSrcArray = imageNames.map(function (name) {
        var trimmedName = name.trim();
        // Use global helper if available, otherwise return raw name
        return (typeof getPublicR2FileUrl === "function") ? getPublicR2FileUrl(trimmedName) : trimmedName;
    });

    // 2. Normalize Field Names
    // Different API endpoints or database views might use slightly different naming conventions.
    // We map them to a single standard used by loadProductView and cart logic.

    // Price and Quantity
    var price = (rawProduct.product_price !== undefined) ? rawProduct.product_price : rawProduct.pricePerItem;
    var quantity = (rawProduct.product_quantity !== undefined) ? rawProduct.product_quantity : rawProduct.availableQuantity;

    // App Price (Internal value used for delivery/admin verification)
    var realPrice = (rawProduct.realPrice !== undefined) ? rawProduct.realPrice : (rawProduct.real_price !== undefined ? rawProduct.real_price : price);

    // Shipping Weight / Load Factor
    var heavyLoad = (rawProduct.heavyLoad !== undefined) ? rawProduct.heavyLoad : (rawProduct.heavy_load !== undefined ? rawProduct.heavy_load : 0);

    // Seller Information (Handling all possible field names from database joins)
    var sellerName = rawProduct.seller_name || rawProduct.sellerName || rawProduct.seller_username || "بائع غير معروف";
    var sellerPhone = rawProduct.seller_phone || rawProduct.sellerPhone || "";

    // 3. Construct Unified Object
    return {
        product_key: rawProduct.product_key,
        productName: rawProduct.productName || rawProduct.product_name || "منتج غير مسمى",
        user_key: rawProduct.user_key,
        pricePerItem: price,
        original_price: rawProduct.original_price,
        image: imageSrcArray.length > 0 ? imageSrcArray[0] : null, // Primary image
        imageSrc: imageSrcArray, // All images array
        availableQuantity: quantity,
        sellerMessage: rawProduct.user_message || rawProduct.sellerMessage || "",
        description: rawProduct.product_description || rawProduct.description || "",
        sellerName: sellerName,
        sellerPhone: sellerPhone,
        seller_location: rawProduct.seller_location || "",
        MainCategory: rawProduct.MainCategory,
        SubCategory: rawProduct.SubCategory,
        realPrice: realPrice,
        heavyLoad: heavyLoad,
        limitPackage: rawProduct.limitPackage !== undefined ? rawProduct.limitPackage : 0,
        isDelevred: rawProduct.isDelevred !== undefined ? rawProduct.isDelevred : 0,
        type: rawProduct.serviceType !== undefined ? rawProduct.serviceType : rawProduct.type,
    };
};

// Ensure global accessibility
window.mapProductData = mapProductData;
