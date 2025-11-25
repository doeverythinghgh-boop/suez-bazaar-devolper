/**
 * @file js/cart-modal.js
 * @description يحتوي على المنطق الخاص بعرض سلة المشتريات وإتمام عملية الشراء.
 */

/**
 * @description يعرض نافذة منبثقة (Modal) بمحتويات سلة المشتريات.
 *   يقوم بتحميل قالب السلة، ويعرض المنتجات الموجودة فيها، ويُهيئ أزرار الإفراغ وإتمام الشراء، ويربط الأحداث اللازمة.
 * @function showCartModal
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
 * @see loadAndShowModal
 * @see getCart
 * @see generateCartItemHTML
 * @see removeFromCart
 * @see clearCart
 * @see sendOrder2Excution
 */
async function showCartModal() {
  await loadAndShowModal("cart-modal-container", "pages/cartModal.html", (modal) => {
    const cart = getCart();
    const modalContent = modal.querySelector(".modal-content");
    const itemsListContainer = modalContent.querySelector("#cart-items-list");
    const cartFooter = modalContent.querySelector("#cart-footer");

    if (cart.length > 0) {
      let total = 0;
      itemsListContainer.innerHTML = cart
        .map((item) => {
          total += item.price * item.quantity;
          return generateCartItemHTML(item);
        })
        .join("");

      cartFooter.innerHTML = `
        <div class="cart-total">الإجمالي: ${total.toFixed(2)} جنيه</div>
        <div class="action-buttons" style="margin-top: 20px; display: flex; justify-content: space-between; gap: 10px;">
          <button id="clear-cart-btn" class="button logout-btn-small" style="background-color: #e74c3c;">إفراغ السلة</button>
          <button id="checkout-btn" class="button logout-btn-small" style="background-color: #2ecc71;">إتمام الشراء</button>
        </div>`;

      // ربط الأحداث
      itemsListContainer.querySelectorAll(".remove-from-cart-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const cartItem = e.target.closest(".cart-item");
          const productKey = cartItem.dataset.key;
          const productName = cartItem.querySelector(".cart-item-details strong").textContent;

          Swal.fire({
            title: "هل أنت متأكد؟",
            text: `هل تريد بالتأكيد إزالة "${productName}" من السلة؟`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "نعم، قم بالإزالة!",
            cancelButtonText: "إلغاء",
          }).then((result) => {
            if (result.isConfirmed) {
              removeFromCart(productKey);
              showCartModal(); // إعادة رسم المودال
            }
          });
        });
      });

      cartFooter.querySelector("#clear-cart-btn").addEventListener("click", () => {
        Swal.fire({
          title: "هل أنت متأكد؟",
          text: "سيتم إفراغ السلة بالكامل!",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "نعم، أفرغها!",
          cancelButtonText: "إلغاء",
        }).then((result) => {
          if (result.isConfirmed) {
            clearCart();
            showCartModal(); // إعادة رسم المودال
          }
        });
      });

      cartFooter.querySelector("#checkout-btn").addEventListener("click", sendOrder2Excution);
    } else {
      itemsListContainer.innerHTML = '<p style="text-align: center; padding: 2rem 0;">سلة المشتريات فارغة.</p>';
      cartFooter.innerHTML = "";
    }
  });
}

/**
 * @description دالة لتوليد مفتاح فريد للطلب يتكون من 3 أحرف و 3 أرقام مختلطة.
 * @function generateOrderKey
 * @returns {string} - مفتاح الطلب الفريد الذي تم إنشاؤه.
 */
function generateOrderKey() {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const nums = "0123456789";
  let key = "";
  for (let i = 0; i < 3; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  for (let i = 0; i < 3; i++) {
    key += nums.charAt(Math.floor(Math.random() * nums.length));
  }
  // خلط الحروف والأرقام
  return key.split('').sort(() => 0.5 - Math.random()).join('');
}

/**
 * @description تعالج عملية إتمام الشراء، بما في ذلك التحقق من صلاحية المستخدم،
 *   حساب إجمالي المبلغ، إنشاء الطلب، إرسال إشعارات للبائعين والمسؤولين،
 *   ثم مسح سلة المشتريات وتحديث واجهة المستخدم.
 * @function sendOrder2Excution
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال، يعالج عمليات الشراء غير المتزامنة.
 * @see getCurrentUser
 * @see getCart
 * @see generateOrderKey
 * @see createOrder
 * @see getUniqueSellerKeys
 * @see getNotificationTokensForOrder
 * @see sendNotification
 * @see clearCart
 * @see showCartModal
 */
async function sendOrder2Excution() {
  // 1. جلب البيانات
  const loggedInUser = getCurrentUser();
  const cart = getCart();

  // التحقق من الشروط
  if (!loggedInUser || loggedInUser.is_guest) {
    Swal.fire({
      title: 'مطلوب التسجيل',
      text: 'لإتمام عملية الشراء، يجب عليك تسجيل الدخول أو إنشاء حساب جديد.',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'تسجيل الدخول',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) window.location.href = 'login.html';
    });
    return;
  }
  if (cart.length === 0) {
    Swal.fire('السلة فارغة', 'لا توجد منتجات في السلة لإتمام الشراء.', 'info');
    return;
  }

  // 2. حساب المبلغ الإجمالي وإنشاء مفتاح الطلب
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const orderKey = generateOrderKey();

  const orderData = {
    order_key: orderKey,
    user_key: loggedInUser.user_key,
    total_amount: totalAmount,
    items: cart.map(item => ({
      product_key: item.product_key,
      quantity: item.quantity,
      seller_key: item.seller_key // ✅ إضافة: إرسال مفتاح البائع مع كل عنصر
    }))
  };
  console.log('[Checkout] جاري إرسال بيانات الطلب:', orderData);

  // إظهار رسالة تأكيد
  const result = await Swal.fire({
    title: 'تأكيد الطلب',
    text: `المبلغ الإجمالي هو ${totalAmount.toFixed(2)} جنيه. هل تريد المتابعة؟`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'نعم، أرسل الطلب!',
    cancelButtonText: 'إلغاء',
    showLoaderOnConfirm: true,
    preConfirm: async () => {
      const response = await createOrder(orderData);
      console.log('[Checkout] الاستجابة من الخادم:', response);
      return response;
    },
    allowOutsideClick: () => !Swal.isLoading()
  });

  if (result.isConfirmed && result.value && !result.value.error) {

    // ✅ إصلاح: استخلاص مفتاح الطلب من نتيجة SweetAlert
    const createdOrderKey = result.value.order_key;
    console.log(`[Checkout] Order created with key: ${createdOrderKey}. Now sending notifications.`);

    // جلب التوكنات وإرسال الإشعار
    const sellerKeys = getUniqueSellerKeys(orderData);
    const tokens = await getNotificationTokensForOrder(sellerKeys);

    if (tokens.length > 0) {
        const title = 'طلب شراء جديد';
        const body = `تم استلام طلب شراء جديد رقم #${createdOrderKey}. يرجى المراجعة.`;
        tokens.forEach(token => {
            sendNotification(token, title, body); // إرسال إشعار لكل توكن على حدة
        });
    }

    console.log('[Checkout] نجاح! تم تأكيد الطلب من قبل المستخدم وإنشاءه بنجاح.');
    clearCart(); // هذه الدالة تحذف السلة وتطلق حدث 'cartUpdated'

    // ✅ إصلاح: عرض رسالة النجاح، وبعد إغلاقها، يتم إعادة رسم نافذة السلة لتظهر فارغة.
    Swal.fire('تم إتمام طلبك بنجاح 🎉').then(() => {
      showCartModal(); // إعادة رسم المودال ليظهر فارغًا
    });
  } else if (result.value && result.value.error) {
    console.error('[Checkout] فشل! الخادم أعاد خطأ:', result.value.error);
    Swal.fire('حدث خطأ', `فشل إرسال الطلب: ${result.value.error}`, 'error');
  }
}



/**
 * @description تجلب توكنات إشعارات Firebase (FCM Tokens) لكل من المسؤولين والبائعين المعنيين بالطلب.
 * تعتمد على نقطة النهاية `/api/tokens` التي تقبل قائمة المفاتيح عبر `userKeys` كـ Query Parameter.
 * @function getNotificationTokensForOrder
 * @param {Array<string>} sellerKeys - قائمة بمفاتيح البائعين (`user_key`) الذين يملكون المنتجات في الطلب.
 * @returns {Promise<Array<string>>} - مصفوفة تحتوي على جميع توكنات الإشعارات الصالحة التي تم جلبها.
 * @throws {Error} - إذا فشل جلب التوكنات من الخادم.
 * @see apiFetch
 */
async function getNotificationTokensForOrder(sellerKeys) {
    // 1. تحديد مفاتيح المسؤولين (Admin Keys)
    const ADMIN_KEYS = ['dl14v1k7', '682dri6b'];
    
    // 2. دمج مفاتيح البائعين مع مفاتيح المسؤولين وإزالة أي تكرارات
    const uniqueUsersKeys = [...new Set([...sellerKeys, ...ADMIN_KEYS])];

    if (uniqueUsersKeys.length === 0) {
        return [];
    }

    // 3. بناء استعلام URL آمن (مسار API فقط)
    const userKeysQuery = uniqueUsersKeys.join(',');
    const apiUrlPath = `/api/tokens?userKeys=${encodeURIComponent(userKeysQuery)}`;

    try {
        // استخدام apiFetch (التي يفترض أنها تعالج baseURL وترويسات CORS و Status 4xx/5xx)
        const result = await apiFetch(apiUrlPath);

        // 4. التحقق من هيكل الاستجابة المتوقع (الاستجابة الناجحة تحتوي على مصفوفة tokens)
        if (result && Array.isArray(result.tokens)) {
            // console.log(`[FCM] Successfully fetched ${result.tokens.length} notification tokens.`);
            return result.tokens;
        } 
        
        // التعامل مع حالة الاستجابة الفارغة أو الخطأ الذي يرجعه الخادم/apiFetch
        if (result && result.error) {
             console.error('[FCM] API returned an error:', result.error);
        } else {
             // console.warn('[FCM] API returned an invalid or empty token list:', result);
        }
        return [];

    } catch (error) {
        // معالجة أخطاء الشبكة أو الأخطاء التي لم يتم التعامل معها في apiFetch
        console.error('[FCM] Critical error during token fetch:', error);
        return []; 
    }
}





/**
 * @description تستخلص المفاتيح الفريدة للبائعين (`seller_key`) من بنية بيانات الطلب (`orderData`).
 * @function getUniqueSellerKeys
 * @param {object} orderData - هيكل بيانات الطلب الذي يتم إعداده للإرسال إلى API، ويحتوي على مصفوفة `items`.
 * @param {Array<object>} orderData.items - مصفوفة من عناصر المنتج في الطلب، حيث يجب أن يحتوي كل عنصر على `seller_key`.
 * @returns {Array<string>} - قائمة بمفاتيح البائعين الفريدة المستخرجة من عناصر الطلب.
 */
function getUniqueSellerKeys(orderData) {
    if (!orderData || !Array.isArray(orderData.items)) {
        console.error("Invalid order data structure provided.");
        return [];
    }
    
    // استخدام كائن Set لضمان أن كل مفتاح بائع يظهر مرة واحدة فقط (فريد)
    const sellerKeys = new Set(); 
    
    // المرور على كل عنصر في الطلب
    orderData.items.forEach(item => {
        // يتم افتراض أن كل عنصر (item) يحتوي على حقل باسم 'seller_key'
        if (item.seller_key) {
            sellerKeys.add(item.seller_key);
        }
    });
    
    // تحويل الـ Set إلى مصفوفة وإعادتها
    return Array.from(sellerKeys);
}