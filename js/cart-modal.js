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



async function sendOrder2Excution() {
  // 1. جلب البيانات
  const cart = getCart();

  // 2. التحقق من الجلسة (إصلاح الشرط المعكوس)
  if (!userSession || userSession.user_key == "guest_user") {
    Swal.fire({
      title: "مطلوب التسجيل",
      text: "لإتمام عملية الشراء، يجب عليك تسجيل الدخول أو إنشاء حساب جديد.",
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "تسجيل الدخول",
      cancelButtonText: "إلغاء",
    }).then((result) => {
      if (result.isConfirmed) {
        mainLoader(
          "./pages/login.html",
          "index-user-container",
          0,
          undefined,
          "hiddenLoginIcon",
          true
        );
      }
    });
    return;
  }

  // 3. التحقق من السلة
  if (cart.length === 0) {
    Swal.fire("السلة فارغة", "لا توجد منتجات في السلة لإتمام الشراء.", "info");
    return;
  }

  // 4. حساب المبلغ الإجمالي وإنشاء مفتاح الطلب
  const totalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const orderKey = generateOrderKey();

  // 5. بناء بيانات الطلب (إزالة التكرار)
  const orderData = {
    order_key: orderKey,
    user_key: userSession.user_key,
    total_amount: totalAmount,
    items: cart.map((item) => ({
      product_key: item.product_key,
      quantity: item.quantity,
      seller_key: item.seller_key,
      note: item.note || "",
    })),
  };
  console.log("[Checkout] جاري إرسال بيانات الطلب:", orderData);

  // 6. إظهار رسالة تأكيد
  const result = await Swal.fire({
    title: "تأكيد الطلب",
    text: `المبلغ الإجمالي هو ${totalAmount.toFixed(2)} جنيه. هل تريد المتابعة؟`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "نعم، أرسل الطلب!",
    cancelButtonText: "إلغاء",
    showLoaderOnConfirm: true,
    preConfirm: async () => {
      try {
        const response = await createOrder(orderData);
        console.log("[Checkout] الاستجابة من الخادم:", response);
        return response;
      } catch (error) {
        Swal.showValidationMessage(`فشل الطلب: ${error.message || error}`);
        return null;
      }
    },
    allowOutsideClick: () => !Swal.isLoading(),
  });

  // 7. معالجة النتيجة
  if (result.isConfirmed && result.value && !result.value.error) {
    const createdOrderKey = result.value.order_key;
    console.log(`[Checkout] تم إنشاء الطلب بنجاح: ${createdOrderKey}`);

    // 8. إرسال الإشعارات باستخدام الدالة الجديدة
    if (typeof handlePurchaseNotifications === 'function') {
      const finalOrderForNotify = { ...orderData, id: createdOrderKey };
      handlePurchaseNotifications(finalOrderForNotify)
        .catch(err => console.error('[Checkout] خطأ في إرسال الإشعارات:', err));
    } else {
      console.warn('[Checkout] دالة handlePurchaseNotifications غير متوفرة');
    }

    // 9. تنظيف السلة وإظهار رسالة النجاح
    clearCart();
    await Swal.fire({
      title: "تم إتمام طلبك بنجاح! 🎉",
      text: `رقم الطلب: #${createdOrderKey}`,
      icon: "success",
      confirmButtonText: "حسناً"
    });

  } else if (result.value && result.value.error) {
    console.error("[Checkout] فشل إنشاء الطلب:", result.value.error);
    Swal.fire("حدث خطأ", `فشل إرسال الطلب: ${result.value.error}`, "error");
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

