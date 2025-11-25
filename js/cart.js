/**
 * @file js/cart.js
 * @description وحدة لإدارة سلة المشتريات.
 * 
 * توفر هذه الوحدة مجموعة من الدوال للتعامل مع سلة المشتريات المحفوظة في LocalStorage.
 * تشمل العمليات: الإضافة، الحذف، تحديث الكمية، جلب محتويات السلة، وحساب الإجمالي.
 */

/**
 * @description ينشئ مفتاح تخزين فريد للسلة بناءً على المستخدم المسجل دخوله.
 * @function getCartStorageKey
 * @returns {string|null} - مفتاح السلة (مثل 'cart_abcd1234') إذا كان هناك مستخدم مسجل دخوله، وإلا `null`.
 * @see localStorage
 */
function getCartStorageKey() {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (loggedInUser) {
    const user = JSON.parse(loggedInUser);
    if (user && user.user_key) {
      return `cart_${user.user_key}`; // ربط السلة بالـ user_key
    }
  }
  return null; // لا يوجد مستخدم، لا توجد سلة
}

/**
 * @description يجلب السلة الحالية من LocalStorage.
 * @function getCart
 * @returns {Array<Object>} - مصفوفة من كائنات المنتجات الموجودة في السلة، أو مصفوفة فارغة إذا كانت السلة فارغة أو حدث خطأ.
 * @see getCartStorageKey
 */
function getCart() {
  const CART_STORAGE_KEY = getCartStorageKey();
  if (!CART_STORAGE_KEY) return []; // لا ترجع أي سلة إذا لم يكن المستخدم مسجلاً

  try {
    const cartJson = localStorage.getItem(CART_STORAGE_KEY);
    return cartJson ? JSON.parse(cartJson) : [];
  } catch (error) {
    console.error("خطأ في قراءة السلة من LocalStorage:", error);
    return [];
  }
}

/**
 * @description يحفظ السلة المحدثة في LocalStorage ويرسل حدثًا مخصصًا (`cartUpdated`) لإعلام المكونات الأخرى بالتغيير.
 * @function saveCart
 * @param {Array<Object>} cart - مصفوفة كائنات المنتجات التي تمثل السلة الحالية.
 * @returns {void}
 * @see getCartStorageKey
 */
function saveCart(cart) {
  const CART_STORAGE_KEY = getCartStorageKey();
  if (!CART_STORAGE_KEY) return; // لا تحفظ أي سلة إذا لم يكن المستخدم مسجلاً

  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    // إرسال حدث مخصص لإعلام أجزاء أخرى من التطبيق بتحديث السلة
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  } catch (error) {
    console.error("خطأ في حفظ السلة في LocalStorage:", error);
  }
}

/**
 * @description يضيف منتجًا إلى السلة، أو يقوم بتحديث كميته إذا كان المنتج موجودًا بالفعل.
 *   يعرض رسالة تأكيد للمستخدم بعد الإضافة أو التحديث.
 * @function addToCart
 * @param {Object} product - كائن المنتج المراد إضافته، يحتوي على تفاصيل المنتج مثل `product_key` و `productName`.
 * @param {number} quantity - الكمية المراد إضافتها للمنتج.
 * @returns {void}
 * @see getCart
 * @see saveCart
 */
function addToCart(product, quantity) {
  const cart = getCart();
  const existingProductIndex = cart.findIndex(item => item.product_key === product.product_key);

  if (existingProductIndex > -1) {
    // المنتج موجود، قم بتحديث الكمية
    cart[existingProductIndex].quantity += quantity;
  } else {
    // المنتج غير موجود، أضفه كعنصر جديد
    // ✅ إصلاح: التأكد من أن product_key موجود دائمًا في الكائن المحفوظ
    const newCartItem = { ...product, quantity };
    if (!newCartItem.product_key && product.product_key) {
      newCartItem.product_key = product.product_key;
    }
    cart.push(newCartItem);
  }

  saveCart(cart);

  // ✅ تعديل: إظهار رسالة منبثقة قياسية بدلاً من رسالة "toast"
  Swal.fire({
    icon: 'success',
    title: `تمت إضافة "${product.productName}" إلى السلة`,
    text: 'يمكنك متابعة التسوق.',
    confirmButtonText: 'موافق',
  }).then((result) => {
    if (result.isConfirmed) {
      // إغلاق نافذة تفاصيل المنتج بعد الإضافة
      const productModal = document.getElementById('product-details-modal');
      if (productModal && productModal.style.display !== 'none') {
        // ✅ إصلاح: البحث عن الزر باستخدام ID بدلاً من class
        const closeButton = document.getElementById('product-modal-close-btn');
        if (closeButton) {
          closeButton.click();
        }
      }
    }
  });
}

/**
 * @description يزيل منتجًا محددًا من السلة بناءً على مفتاحه الفريد.
 * @function removeFromCart
 * @param {string} productKey - المفتاح الفريد للمنتج المراد إزالته من السلة.
 * @returns {void}
 * @see getCart
 * @see saveCart
 */
function removeFromCart(productKey) {
  let cart = getCart();
  cart = cart.filter(item => item.product_key !== productKey);
  saveCart(cart);
}

/**
 * @description يحدث كمية منتج معين في السلة. إذا كانت الكمية الجديدة صفرًا أو أقل، يتم إزالة المنتج من السلة.
 * @function updateCartQuantity
 * @param {string} productKey - المفتاح الفريد للمنتج المراد تحديث كميته.
 * @param {number} newQuantity - الكمية الجديدة للمنتج.
 * @returns {void}
 * @see getCart
 * @see saveCart
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
 * @description يفرغ السلة بالكامل عن طريق حفظ مصفوفة فارغة بدلاً من السلة الحالية.
 * @function clearCart
 * @returns {void}
 * @see saveCart
 */
function clearCart() {
  saveCart([]);
}

/**
 * @description يحسب العدد الإجمالي للوحدات من جميع المنتجات في السلة.
 * @function getCartItemCount
 * @returns {number} - إجمالي عدد الوحدات (الكميات المجمعة) لجميع المنتجات في السلة.
 * @see getCart
 */
function getCartItemCount() {
  const cart = getCart();
  return cart.reduce((total, item) => total + item.quantity, 0);
}

/**
 * @description يحدث شارة عدد عناصر السلة في الواجهة الرسومية (UI) لتعكس العدد الحالي للمنتجات في السلة.
 * @function updateCartBadge
 * @returns {void}
 * @see getCartItemCount
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