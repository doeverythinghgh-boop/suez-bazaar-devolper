/**
 * @file js/cart.js
 * @description وحدة لإدارة سلة المشتريات.
 * 
 * توفر هذه الوحدة مجموعة من الدوال للتعامل مع سلة المشتريات المحفوظة في LocalStorage.
 * تشمل العمليات: الإضافة، الحذف، تحديث الكمية، جلب محتويات السلة، وحساب الإجمالي.
 */

const CART_STORAGE_KEY = 'userShoppingCart';

/**
 * يجلب السلة الحالية من LocalStorage.
 * @returns {Array<Object>} مصفوفة من منتجات السلة.
 */
function getCart() {
  try {
    const cartJson = localStorage.getItem(CART_STORAGE_KEY);
    return cartJson ? JSON.parse(cartJson) : [];
  } catch (error) {
    console.error("خطأ في قراءة السلة من LocalStorage:", error);
    return [];
  }
}

/**
 * يحفظ السلة المحدثة في LocalStorage.
 * @param {Array<Object>} cart - مصفوفة منتجات السلة.
 */
function saveCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    // إرسال حدث مخصص لإعلام أجزاء أخرى من التطبيق بتحديث السلة
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  } catch (error) {
    console.error("خطأ في حفظ السلة في LocalStorage:", error);
  }
}

/**
 * يضيف منتجًا إلى السلة أو يحدث كميته إذا كان موجودًا بالفعل.
 * @param {Object} product - كائن المنتج المراد إضافته.
 * @param {number} quantity - الكمية المراد إضافتها.
 */
function addToCart(product, quantity) {
  const cart = getCart();
  const existingProductIndex = cart.findIndex(item => item.product_key === product.product_key);

  if (existingProductIndex > -1) {
    // المنتج موجود، قم بتحديث الكمية
    cart[existingProductIndex].quantity += quantity;
  } else {
    // المنتج غير موجود، أضفه كعنصر جديد
    cart.push({ ...product, quantity });
  }

  saveCart(cart);

  // إظهار رسالة تأكيد للمستخدم
  Swal.fire({
    toast: true,
    position: 'top-start',
    icon: 'success',
    title: `تمت إضافة "${product.productName}" إلى السلة`,
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true
  });
}

/**
 * يزيل منتجًا من السلة.
 * @param {string} productKey - المفتاح الفريد للمنتج المراد إزالته.
 */
function removeFromCart(productKey) {
  let cart = getCart();
  cart = cart.filter(item => item.product_key !== productKey);
  saveCart(cart);
}

/**
 * يحدث كمية منتج معين في السلة.
 * @param {string} productKey - المفتاح الفريد للمنتج.
 * @param {number} newQuantity - الكمية الجديدة.
 */
function updateCartQuantity(productKey, newQuantity) {
  const cart = getCart();
  const productIndex = cart.findIndex(item => item.product_key === productKey);

  if (productIndex > -1) {
    if (newQuantity > 0) {
      cart[productIndex].quantity = newQuantity;
    } else {
      // إذا كانت الكمية صفرًا أو أقل، قم بإزالة المنتج
      cart.splice(productIndex, 1);
    }
    saveCart(cart);
  }
}

/**
 * يفرغ السلة بالكامل.
 */
function clearCart() {
  saveCart([]);
}

/**
 * يحسب عدد العناصر الإجمالي في السلة.
 * @returns {number} إجمالي عدد الوحدات في السلة.
 */
function getCartItemCount() {
  const cart = getCart();
  return cart.reduce((total, item) => total + item.quantity, 0);
}

/**
 * يحدث شارة عدد عناصر السلة في الواجهة.
 */
function updateCartBadge() {
    const cartBadge = document.getElementById('cart-badge');
    if (!cartBadge) return;

    const count = getCartItemCount();
    if (count > 0) {
        cartBadge.textContent = count;
        cartBadge.style.display = 'flex';
    } else {
        cartBadge.style.display = 'none';
    }
}