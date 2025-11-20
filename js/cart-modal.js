/**
 * @file js/ui/cart-modal.js
 * @description يحتوي على المنطق الخاص بعرض سلة المشتريات وإتمام عملية الشراء.
 */

/**
 * يعرض نافذة منبثقة بمحتويات سلة المشتريات.
 */
function showCartModal() {
  const cartModal = document.getElementById("cart-modal-container");
  const cart = getCart();
  let total = 0;

  let modalContent = `
    <div class="modal-content">
      <span class="close-button" id="cart-modal-close-btn">&times;</span>
      <h2><i class="fas fa-shopping-cart"></i> سلة المشتريات</h2>`;

  if (cart.length > 0) {
    modalContent += '<div id="cart-items-list">';
    cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      modalContent += `
        <div class="cart-item" data-key="${item.product_key}">
          <img src="${item.image}" alt="${item.productName}">
          <div class="cart-item-details">
            <strong>${item.productName}</strong>
            <p>${item.price} جنيه × ${item.quantity}</p>
          </div>
          <div><strong>${itemTotal.toFixed(2)} جنيه</strong></div>
          <button class="btn-ghost remove-from-cart-btn" title="إزالة من السلة">&times;</button>
        </div>`;
    });
    modalContent += '</div>';
    modalContent += `<div class="cart-total">الإجمالي: ${total.toFixed(2)} جنيه</div>`;
    modalContent += `
      <div class="action-buttons" style="margin-top: 20px; display: flex; justify-content: space-between; gap: 10px;">
        <button id="clear-cart-btn" class="button logout-btn-small" style="background-color: #e74c3c;">إفراغ السلة</button>
        <button id="checkout-btn" class="button logout-btn-small" style="background-color: #2ecc71;">إتمام الشراء</button>
      </div>`;
  } else {
    modalContent += '<p style="text-align: center; padding: 2rem 0;">سلة المشتريات فارغة.</p>';
  }

  modalContent += '</div>';
  cartModal.innerHTML = modalContent;

  // إظهار النافذة
  document.body.classList.add("modal-open");
  cartModal.style.display = "block";

  // وظيفة الإغلاق
  const closeCartModal = () => {
    cartModal.style.display = "none";
    document.body.classList.remove("modal-open");
  };

  // إضافة أحداث الأزرار
  document.getElementById("cart-modal-close-btn").onclick = closeCartModal;
  window.addEventListener('click', (event) => {
    if (event.target == cartModal) closeCartModal();
  }, { once: true });

  // أحداث أزرار التحكم بالسلة
  document.querySelectorAll('.remove-from-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cartItem = e.target.closest('.cart-item');
      const productKey = cartItem.dataset.key;
      const productName = cartItem.querySelector('.cart-item-details strong').textContent;

      Swal.fire({
        title: 'هل أنت متأكد؟',
        text: `هل تريد بالتأكيد إزالة "${productName}" من السلة؟`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'نعم، قم بالإزالة!',
        cancelButtonText: 'إلغاء'
      }).then((result) => {
        if (result.isConfirmed) {
          removeFromCart(productKey);
          showCartModal(); // إعادة رسم المودال
        }
      });
    });
  });

  const clearCartBtn = document.getElementById('clear-cart-btn');
  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', () => {
      Swal.fire({
        title: 'هل أنت متأكد؟', text: "سيتم إفراغ السلة بالكامل!", icon: 'warning',
        showCancelButton: true, confirmButtonText: 'نعم، أفرغها!', cancelButtonText: 'إلغاء'
      }).then((result) => {
        if (result.isConfirmed) {
          clearCart();
          showCartModal(); // إعادة رسم المودال
        }
      });
    });
  }

  // حدث النقر على زر "إتمام الشراء"
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', handleCheckout);
  }
}

/**
 * دالة لتوليد مفتاح فريد للطلب (3 أرقام و 3 أحرف).
 * @returns {string} مفتاح الطلب.
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
 * يعالج عملية إتمام الشراء.
 */
async function handleCheckout() {
  // 1. جلب البيانات
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
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
 * تجلب توكنات إشعارات Firebase (FCM Tokens) لكل من المسؤولين (2) والبائعين المعنيين بالطلب.
 * * ✅ ملاحظة: هذه الدالة تعتمد على نقطة النهاية (API Endpoint) /api/tokens التي قمنا بتعديلها
 * لتقبل قائمة المفاتيح عبر متغير الاستعلام (Query Parameter) userKeys.
 * * @param {Array<string>} sellerKeys - قائمة بمفاتيح البائعين (user_key) الذين يملكون المنتجات في الطلب.
 * @returns {Promise<Array<string>>} - مصفوفة تحتوي على جميع توكنات الإشعارات الصالحة.
 */
async function getNotificationTokensForOrder(sellerKeys) {
    console.log("[FCM] Preparing to fetch notification tokens.");
    
    // 1. تحديد مفاتيح المسؤولين (Admin Keys)
    const ADMIN_KEYS = [
        'dl14v1k7', // المفتاح الأول
        '682dri6b'  // المفتاح الثاني
    ]; 
    
    // 2. دمج مفاتيح البائعين مع مفاتيح المسؤولين وإزالة أي تكرارات
    // يتم استخدام معامل النشر (...) داخل كائن Set لضمان تفرد كل مفتاح
    const uniqueUsersKeys = [...new Set([...sellerKeys, ...ADMIN_KEYS])];

    if (uniqueUsersKeys.length === 0) {
        console.warn("[FCM] No users keys found to fetch tokens for.");
        return [];
    }

    // 3. بناء استعلام URL آمن
    // يتم تحويل المصفوفة إلى سلسلة نصية مفصولة بفواصل
    const userKeysQuery = uniqueUsersKeys.join(',');
    
    // نقطة النهاية المعدلة تستقبل userKeys كـ Query Parameter
    const apiUrl = `${baseURL}/api/tokens?userKeys=${encodeURIComponent(userKeysQuery)}`;

    try {
        const response = await fetch(apiUrl, { // ✅ إصلاح: استخدام baseURL
            method: 'GET', // ✅ الآن تدعم GET لجلب التوكنات
            headers: {
                'Content-Type': 'application/json',
                // إذا كانت نقطة النهاية محمية، يجب إضافة توكن المصادقة هنا
                // 'Authorization': `Bearer ${getUserAuthToken()}`, 
            },
        });

        if (!response.ok) {
            console.error(`[FCM] API Error: Status ${response.status} for ${apiUrl}`);
            // محاولة قراءة رسالة الخطأ من الاستجابة
            const errorBody = await response.json();
            throw new Error(errorBody.error || 'Failed to fetch notification tokens from the server.'); 
        }

        const result = await response.json();

        // 4. التحقق من هيكل الاستجابة المتوقع وإعادة التوكنات
        // الاستجابة المتوقعة: { success: true, tokens: ['fcm_token_1', 'fcm_token_2', ...] }
        if (result && Array.isArray(result.tokens)) {
            console.log(`[FCM] Successfully fetched ${result.tokens.length} notification tokens.`);
            return result.tokens;
        } else {
            console.warn('[FCM] API returned an invalid or empty token list:', result);
            return [];
        }

    } catch (error) {
        console.error('[FCM] Critical error during token fetch:', error);
        // في حالة الفشل، نُعيد مصفوفة فارغة لمنع تعطل إرسال الإشعار
        return []; 
    }
}
/**
 * تستخلص المفاتيح الفريدة للبائعين (seller_key) من بنية بيانات الطلب (orderData).
 * @param {object} orderData - هيكل بيانات الطلب الذي يتم إعداده للإرسال إلى API.
 * @returns {Array<string>} - قائمة بمفاتيح البائعين الفريدة.
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