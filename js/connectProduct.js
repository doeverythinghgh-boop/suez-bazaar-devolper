/**
 * @file js/connectProduct.js
 * @description API connection layer for Products, and product details display logic.
 *
 * This file contains a set of async functions to facilitate handling products,
 * including adding, updating, deleting, and fetching from the database.
 * It also contains logic for displaying and populating the product details modal.
 * Depends on the global `baseURL` variable which must be defined in `js/config.js`.
 */

/**
 * @description Adds a new product to the database via API call.
 * @function addProduct
 * @param {object} productData - Object containing all data of the product to add.
 * @returns {Promise<Object>} - Promise containing the created product object, or an error object on failure.
 * @async
 * @throws {Error} - If `apiFetch` encounters a network error or the API returns an error.
 * @see apiFetch
 */
async function addProduct(productData) {
  return await apiFetch('/api/products', {
    method: 'POST',
    body: productData,
  });
}

/**
 * @description Updates an existing product in the database via API.
 * @function updateProduct
 * @param {object} productData - Object containing updated product data. Must include `product_key` to identify the product.
 * @returns {Promise<Object>} - Promise containing the updated object, or an error object on failure.
 * @async
 * @throws {Error} - If `apiFetch` encounters a network error or the API returns an error.
 * @see apiFetch
 */
async function updateProduct(productData) {
  return await apiFetch('/api/products', {
    method: 'PUT',
    body: productData,
  });
}

/**
 * @description Deletes an existing product from the database via API.
 * @function deleteProduct
 * @param {string} productKey - Unique key of the product to delete.
 * @returns {Promise<Object>} - Promise containing the server response object.
 * @async
 * @throws {Error} - If `apiFetch` encounters a network error or the API returns an error.
 * @see apiFetch
 */
async function deleteProduct_(productKey) {
  return await apiFetch(`/api/products?product_key=${productKey}`, {
    method: 'DELETE',
  });
}

/**
 * @description Fetches the list of products based on the selected Main and Sub category from the API.
 * @function getProductsByCategory
 * @param {string} mainCatId - ID of the main category.
 * @param {string} subCatId - ID of the sub category.
 * @returns {Promise<Array<Object>|null>} - Promise containing an array of product objects, or `null` on failure.
 * @throws {Error} - If `baseURL` is undefined, or API fetch fails.
 * @see apiFetch
 * @see baseURL
 */
async function getProductsByCategory(mainCatId, subCatId) {
  try {
    // Check for baseURL to ensure settings are loaded correctly.
    if (typeof baseURL === "undefined" || !baseURL) {
      console.error(
        "%c[API-Debug] متغير baseURL غير معرف أو فارغ!",
        "color: red; font-weight: bold;"
      );
      throw new Error("baseURL is not defined"); // Stop execution if variable is missing.
    }
    // Use URLSearchParams to create the query string safely and correctly.
    // This ensures 'null' or 'undefined' values are not sent as part of the URL.
    const params = new URLSearchParams();
    if (mainCatId) {
      params.append("MainCategory", mainCatId);
    }
    if (subCatId) {
      params.append("SubCategory", subCatId);
    }
    const data = await apiFetch(`/api/products?${params.toString()}`);
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error) {
    // Log any error and return `null`.
    console.error(
      "%c[getProductsByCategory] failed:",
      "color: red;",
      error
    );
    return null;
  }
}

/**
 * @description Fetches all products added by a specific user (seller) from the API.
 * @function getProductsByUser
 * @param {string} userKey - Unique key of the user (`user_key`) whose products we want to fetch.
 * @returns {Promise<Array<Object>|null>} - Promise containing an array of product objects, or `null` on failure.
 * @async
 * @throws {Error} - If `apiFetch` encounters a network error or the API returns an error.
 * @see apiFetch
 */
async function getProductsByUser(userKey) {
  try {
    const data = await apiFetch(`/api/products?user_key=${userKey}`);
    return data.error ? null : data;
  } catch (error) {
    console.error("%c[getProductsByUser] failed:", "color: red;", error);
    return null;
  }
}

/**
 * @description Fetches data of a single product based on its unique key from the API.
 * @function getProductByKey
 * @param {string} productKey - Unique key of the product to fetch.
 * @returns {Promise<Object|null>} - Promise containing the product object, or `null` if not found or error.
 * @async
 * @throws {Error} - If `apiFetch` encounters a network error or the API returns an error.
 * @see apiFetch
 */
async function getProductByKey(productKey) {
  try {
    const data = await apiFetch(`/api/products?product_key=${productKey}&single=true`, {
      specialHandlers: {
        404: () => {
          console.warn("[API] getProductByKey: Product not found (404).");
          return null;
        }
      }
    });
    return data;
  } catch (error) {
    console.error("%c[getProductByKey] failed:", "color: red;", error);
    return null;
  }
}

/**
 * @description Displays a modal containing product details.
 *   Checks for primary category data before display and loads the product view template.
 * @function showProductDetails
 * @param {object} productData - Object containing all full product data to display.
 * @param {function(): void} [onCloseCallback] - Optional callback called when modal closes.
 * @param {object} [options={}] - Additional options to control modal display, like `showAddToCart`.
 * @returns {Promise<void>} - Promise that resolves when complete.
 * @async
 * @throws {Error} - If `productData` is missing category information, or `loadAndShowModal` fails.
 * @see loadAndShowModal
 * @see populateProductDetails
 */
async function showProductDetails(productData, onCloseCallback, options = {}) {
  // Check for main and sub category data, which is necessary to display details correctly.
  if (!productData.MainCategory || !productData.SubCategory) {
    console.error(
      "[Modal] Missing category data. Cannot open product details.",
      productData
    );
    Swal.fire(
      "خطأ في البيانات",
      "لا يمكن عرض تفاصيل المنتج لعدم توفر معلومات الفئة.",
      "error"
    );
    // Call callback function (if exists) to notify caller that operation failed.
    if (typeof onCloseCallback === "function") onCloseCallback();
    return; // Stop execution
  }

  console.log(
    "%c[Modal] Opening product details modal for:",
    "color: darkcyan",
    productData.productName
  );
  const modal = document.getElementById("product-details-modal");
  await loadAndShowModal(
    "product-details-modal",
    "pages/showProduct.html",
    () => {
      populateProductDetails(productData, onCloseCallback, options);
      document.getElementById("product-modal-name").textContent = productData.productName || "تفاصيل المنتج";
    },
    onCloseCallback
  );
}

/**
 * @description Populates product details in the modal and binds events for quantity control and add to cart.
 *   Handles image display, prices, seller messages, and shows/hides specific fields based on product type and options.
 * @function populateProductDetails
 * @param {object} productData - Object containing all full product data to populate the modal.
 * @param {function(): void} [onCloseCallback] - Optional callback called when modal closes.
 * @param {object} [options={}] - Additional options to control modal display, like `showAddToCart`.
 * @returns {void}
 * @see SERVICE_CATEGORY_NoPrice_ID
 * @see getCurrentUser
 * @see addToCart
 */
function populateProductDetails(productData, onCloseCallback, options = {}) {
  // Populate description and seller message.
  document.getElementById("product-modal-description").textContent =
    productData.description || "لا يوجد وصف متاح.";
  document.getElementById("product-modal-seller-message").textContent =
    productData.sellerMessage || "لا توجد رسالة من البائع.";

  // ✅ NEW: Hide price and quantity fields if category is "General Services" (id=6)
  const isServiceCategory =
    productData.MainCategory == SERVICE_CATEGORY_NoPrice_ID; // `SERVICE_CATEGORY_NoPrice_ID` defined in utils.js
  // Access DOM elements that might be hidden.
  const quantityContainer = document.getElementById(
    "product-modal-quantity-container"
  );
  const priceContainer = document.getElementById(
    "product-modal-price-container"
  );
  const cartActionsContainer = document.getElementById(
    "product-modal-cart-actions"
  );

  // Check if "Add to Cart" button should be shown. Visible by default.
  const showAddToCart = options.showAddToCart !== false; // default true

  // Logic to show or hide sections based on product type and options.
  if (isServiceCategory) {
    // If product is service, hide everything related to price, quantity, and cart.
    quantityContainer.style.display = "none";
    priceContainer.style.display = "none";
    cartActionsContainer.style.display = "none";
  } else if (!showAddToCart) {
    // If `showAddToCart` is `false`, hide only the cart section.
    cartActionsContainer.style.display = "none";
  } else {
    quantityContainer.style.display = "block";
    priceContainer.style.display = "block";
    // Ensure cart container is shown if not signaled to hide.
    cartActionsContainer.style.display = "block";
    document.getElementById("product-modal-quantity").textContent =
      productData.availableQuantity;
    document.getElementById(
      "product-modal-price"
    ).textContent = `${productData.pricePerItem} جنيه`;
  }

  // Populate image gallery (main image and thumbnails).
  const mainImage = document.getElementById("product-modal-image");
  const thumbnailsContainer = document.getElementById(
    "product-modal-thumbnails"
  );
  console.log("[Modal] Populating product data and images.");
  mainImage.src = productData.imageSrc[0]; // Display first image as main.
  thumbnailsContainer.innerHTML = ""; // Clear old thumbnails
  productData.imageSrc.forEach((src) => {
    const thumb = document.createElement("img");
    thumb.src = src;
    thumb.onclick = () => { // On click thumbnail, update main image.
      mainImage.src = src;
    };
    // ✅ FIX: Handle image load failures due to network issues
    thumb.onerror = () => {
      console.warn("[Modal] Thumbnail image failed to load:", src);
      // Replace failed image with placeholder and retry button
      const placeholder = document.createElement("div");
      placeholder.className = "image-load-error-placeholder";
      placeholder.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>فشل تحميل الصورة</span>
      `;
      thumb.replaceWith(placeholder);
    };
    thumbnailsContainer.appendChild(thumb);
  });

  // Display original price if exists and greater than current price.
  const originalPriceContainer = document.getElementById(
    "product-modal-original-price-container"
  );
  const originalPriceEl = document.getElementById(
    "product-modal-original-price"
  );
  // Check existence of values before comparison to avoid errors.
  const originalPrice = productData.original_price
    ? parseFloat(productData.original_price)
    : 0;
  // Show original price only if not service.
  if (!isServiceCategory) {
    const currentPrice = productData.pricePerItem
      ? parseFloat(productData.pricePerItem)
      : 0;
    if (originalPrice > 0 && originalPrice !== currentPrice) {
      console.log("[Modal] Displaying original price.");
      originalPriceEl.textContent = `${originalPrice.toFixed(2)} جنيه`;
      originalPriceContainer.style.display = "block"; // Show container
    } else {
      console.log("[Modal] Hiding original price.");
      originalPriceContainer.style.display = "none"; // Hide container
      originalPriceEl.textContent = "";
    }
  }

  const modal = document.getElementById("product-details-modal");
  // Function to close modal.
  const closeModal = () => {
    console.log("[Modal] Closing product details modal.");
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
    // Call callback function on close (if passed).
    if (typeof onCloseCallback === "function") {
      onCloseCallback();
    }
  };
  document.getElementById("product-modal-close-btn").onclick = closeModal;
  window.onclick = (event) => {
    if (event.target == modal) closeModal();
  };

  // --- Quantity and Total Price Control Logic ---
  const decreaseBtn = document.getElementById(
    "product-modal-decrease-quantity"
  );
  const increaseBtn = document.getElementById(
    "product-modal-increase-quantity"
  );
  const selectedQuantityInput = document.getElementById(
    "product-modal-selected-quantity"
  );
  const totalPriceEl = document.getElementById("product-modal-total-price");

  // Do not initialize quantity controls if service category or add to cart hidden.
  if (isServiceCategory || !showAddToCart) {
    // Do nothing, container already hidden
    return;
  }

  console.log("[Modal] Initializing quantity controls.");
  // Set max quantity
  selectedQuantityInput.max = productData.availableQuantity;

  // Function to update total price based on selected quantity.
  function updateTotalPrice() {
    const price = parseFloat(productData.pricePerItem);
    const quantity = parseInt(selectedQuantityInput.value, 10);
    const total = price * quantity;
    totalPriceEl.textContent = `${total.toFixed(2)} جنيه`;
  }

  // Add events for increase and decrease buttons.
  decreaseBtn.addEventListener("click", () => {
    if (selectedQuantityInput.value > 1) {
      selectedQuantityInput.value--;
      updateTotalPrice();
    }
  });

  increaseBtn.addEventListener("click", () => {
    const max = parseInt(selectedQuantityInput.max, 10);
    if (parseInt(selectedQuantityInput.value, 10) < max) {
      selectedQuantityInput.value++;
      updateTotalPrice();
    }
  });

  selectedQuantityInput.addEventListener("change", updateTotalPrice);
  updateTotalPrice(); // Calculate initial price when modal opens.

  // --- Add to Cart Logic ---
  const addToCartBtn = document.getElementById("product-modal-add-to-cart");
  addToCartBtn.addEventListener("click", () => {
    // Check if user is logged in (not guest).
    const loggedInUser = getCurrentUser();

    if (loggedInUser && !loggedInUser.is_guest) {
      console.log("[Modal] Add to cart button clicked by a registered user.");
      // If user is registered, proceed with adding to cart.
      const quantity = parseInt(
        document.getElementById("product-modal-selected-quantity").value,
        10
      );
      const productInfoForCart = {
        product_key: productData.product_key,
        productName: productData.productName, // Product Name
        price: productData.pricePerItem, // Use correct price (pricePerItem)
        original_price: productData.original_price, // Pass original price
        image: productData.imageSrc[0], // Use first image for cart
        seller_key: productData.user_key, // Include seller key for notifications
      };
      addToCart(productInfoForCart, quantity);
    } else {
      // This condition checks if user is guest or not logged in at all.
      console.warn(
        "[Modal] Add to cart button clicked by guest or non-logged-in user. Prompting for login/registration."
      );
      // If user is not registered, show alert to log in.
      Swal.fire({
        icon: "info",
        title: "يجب تسجيل الدخول",
        text: "لإضافة منتجات إلى السلة، يرجى تسجيل الدخول أولاً.",
        showCancelButton: true,
        confirmButtonText: "تسجيل الدخول",
        cancelButtonText: "إلغاء",
      }).then((result) => {
        if (result.isConfirmed) {
          console.log("[Modal] User chose to log in. Redirecting...");
          mainLoader("./pages/login.html", "index-user-container", 0, undefined, "hiddenLoginIcon", true);

        }
      });
    }
  });
}
