/**
 * @file js/cardPackage.js
 * @description Shopping Cart management module.
 *
 * This module provides functions to handle the shopping cart stored in LocalStorage.
 * Includes operations: Add, Remove, Update Quantity, Fetch Cart, and Calculate Totals.
 */

/**
 * @description Generates a unique storage key for the cart based on the logged-in user.
 * @function getCartStorageKey
 * @returns {string|null} - Cart key (e.g., 'cart_abcd1234') if user is logged in, otherwise `null`.
 * @see localStorage
 */
function getCartStorageKey() {
  if (window.userSession && window.userSession.user_key) {

    return `cart_${window.userSession.user_key}`; // Associates cart with user_key
  }
  return null; // No user, no cart
}

/**
 * @description Retrieves the current cart from LocalStorage.
 * @function getCart
 * @returns {Array<Object>} - Array of product objects in the cart, or empty array if empty or error.
 * @throws {Error} - If there's an error parsing JSON from LocalStorage.
 * @see getCartStorageKey
 */
function getCart() {
  const CART_STORAGE_KEY = getCartStorageKey();
  if (!CART_STORAGE_KEY) return [];

  try {
    const cartJson = localStorage.getItem(CART_STORAGE_KEY);
    const cart = cartJson ? JSON.parse(cartJson) : [];

    // Add default note if not present
    return cart.map((item) => ({
      ...item,
      note: item.note || "",
    }));
  } catch (error) {
    console.error("خطأ في قراءة السلة من LocalStorage:", error);
    return [];
  }
}

/**
 * @description Saves the updated cart to LocalStorage and dispatches a custom event (`cartUpdated`).
 * @function saveCart
 * @param {Array<Object>} cart - Array of product objects representing the current cart.
 * @returns {void}
 * @throws {Error} - If there's an error saving to LocalStorage.
 * @see getCartStorageKey
 */
function saveCart(cart) {
  const CART_STORAGE_KEY = getCartStorageKey();
  if (!CART_STORAGE_KEY) return;

  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    // Dispatch custom event to notify other app parts of cart update
    window.dispatchEvent(new CustomEvent("cartUpdated"));
  } catch (error) {
    console.error("خطأ في حفظ السلة في LocalStorage:", error);
  }
}

/**
 * @description Adds a product to the cart, or updates its quantity if already exists.
 * @function addToCart
 * @param {Object} product - Product object to add.
 * @param {number} quantity - Quantity to add.
 * @param {string} note - Product note (optional).
 * @returns {boolean} - true if added successfully, false if seller matches user.
 * @throws {Error} - If `window.Swal.fire` or `containerGoBack` encounters an error.
 * @see getCart
 * @see saveCart
 * @see containerGoBack
 */
function addToCart(product, quantity, note = "") {
  // Prevent user from buying their own products
  if (
    window.userSession &&
    window.userSession.user_key === product.seller_key
  ) {
    window.Swal.fire({
      icon: "error",
      title: "عذراً",
      text: "لا يمكنك شراء منتجاتك الخاصة",
      confirmButtonText: "موافق",
    });
    containerGoBack();
    return false;
  }

  const cart = getCart();
  const existingProductIndex = cart.findIndex(
    (item) => item.product_key === product.product_key
  );

  if (existingProductIndex > -1) {
    // Product exists, update quantity
    cart[existingProductIndex].quantity += quantity;
    if (note) cart[existingProductIndex].note = note;
  } else {
    // Product does not exist, add as new item
    const newCartItem = {
      ...product,
      quantity,
      note,
      addedDate: new Date().toISOString(), // Add added date
    };
    if (!newCartItem.product_key && product.product_key) {
      newCartItem.product_key = product.product_key;
    }
    cart.push(newCartItem);
  }

  saveCart(cart);

  window.Swal.fire({
    icon: "success",
    title: `تمت إضافة "${product.productName}" إلى السلة`,
    text: "يمكنك متابعة التسوق.",
    confirmButtonText: "موافق",
  }).then((result) => {
    if (result.isConfirmed) {
      containerGoBack();
    }
  });
  return true;
}

/**
 * @description Removes a specific product from the cart based on its unique key.
 * @function removeFromCart
 * @param {string} productKey - Unique key of the product to remove.
 * @returns {void}
 * @see getCart
 * @see saveCart
 */
function removeFromCart(productKey) {
  let cart = getCart();
  cart = cart.filter((item) => item.product_key !== productKey);
  saveCart(cart);
}

/**
 * @description Updates the quantity of a specific product in the cart.
 * @function updateCartQuantity
 * @param {string} productKey - Unique product key.
 * @param {number} newQuantity - New quantity.
 * @returns {void}
 * @see getCart
 * @see saveCart
 */
function updateCartQuantity(productKey, newQuantity) {
  const cart = getCart();
  const productIndex = cart.findIndex(
    (item) => item.product_key === productKey
  );

  if (productIndex > -1) {
    if (newQuantity > 0) {
      cart[productIndex].quantity = newQuantity;
    } else {
      cart.splice(productIndex, 1);
    }
    saveCart(cart);
  }
}

/**
 * @description Updates the note of a product in the cart.
 * @function updateCartItemNote
 * @param {string} productKey - Unique product key.
 * @param {string} note - New note.
 * @returns {void}
 * @see getCart
 * @see saveCart
 */
function updateCartItemNote(productKey, note) {
  const cart = getCart();
  const productIndex = cart.findIndex(
    (item) => item.product_key === productKey
  );

  if (productIndex > -1) {
    cart[productIndex].note = note;
    saveCart(cart);
  }
}

/**
 * @description Clears the entire cart.
 * @function clearCart
 * @returns {void}
 * @see saveCart
 */
function clearCart() {
  saveCart([]);
}

/**
 * @description Calculates the total number of units for all items in the cart.
 * @function getCartItemCount
 * @returns {number} - Total unit count.
 * @see getCart
 */
function getCartItemCount() {
  const cart = getCart();
  return cart.reduce((total, item) => total + item.quantity, 0);
}

/**
 * @description Calculates the total price of products in the cart.
 * @function getCartTotalPrice
 * @returns {number} - Total price.
 * @see getCart
 */
function getCartTotalPrice() {
  const cart = getCart();
  return cart.reduce((total, item) => total + item.price * item.quantity, 0);
}

/**
 * @description يحسب إجمالي التوفير من الخصومات.
 * @function getCartTotalSavings
 * @returns {number} - إجمالي التوفير.
 */
function getCartTotalSavings() {
  const cart = getCart();
  return cart.reduce((total, item) => {
    if (item.original_price && item.original_price > item.price) {
      return total + (item.original_price - item.price) * item.quantity;
    }
    return total;
  }, 0);
}

/**
 * @description Finds a product in the cart.
 * @function findInCart
 * @param {string} productKey - Unique product key.
 * @returns {Object|null} - The product if found, otherwise null.
 * @see getCart
 */
function findInCart(productKey) {
  const cart = getCart();
  return cart.find((item) => item.product_key === productKey) || null;
}

/**
 * @description Updates the cart item count badge in the UI.
 * @function updateCartBadge
 * @returns {void}
 */
function updateCartBadge() {
  // Target main cart button
  const cartButton = document.getElementById("index-cart-btn");
  if (!cartButton) {
    console.warn("updateCartBadge: لم يتم العثور على زر السلة 'index-cart-btn'.");
    return;
  }

  const badgeId = 'cart-item-count-badge';
  let badge = document.getElementById(badgeId);
  const count = getCartItemCount();

  // If badge doesn't exist, create it and append to cart button
  if (!badge) {
    badge = document.createElement('span');
    badge.id = badgeId;
    badge.className = 'cart-badge'; // Apply modern styles
    cartButton.appendChild(badge);
  }

  // Update badge content and visibility based on count
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'flex'; // Show badge
  } else {
    badge.style.display = 'none'; // Hide badge if cart is empty
  }
}

// Listen for cart update event to update badge automatically
window.addEventListener("cartUpdated", updateCartBadge);

// Update badge on page load
//document.addEventListener("DOMContentLoaded", updateCartBadge);
updateCartBadge();